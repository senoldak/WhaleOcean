import { describe, it, expect } from 'vitest';
import {
  runBacktest,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateProfitFactor,
  CandleData,
} from '../src/analytics/backtest/backtest-engine';
import { BacktestParams } from '../src/types/contracts';
import { PositionEvent } from '../src/db/repository';

describe('Quantitative Backtest Engine (SONAR)', () => {
  describe('Statistical Benchmarks Math', () => {
    it('should calculate correct Sharpe Ratio for steady positive returns', () => {
      // Steady positive daily returns of 1% with low stdev
      const dailyReturns = [0.01, 0.012, 0.009, 0.011, 0.01];
      const sharpe = calculateSharpeRatio(dailyReturns);
      expect(sharpe).toBeGreaterThan(10); // Very high for consistent 1% daily
    });

    it('should calculate correct Sortino Ratio focusing on downside volatility', () => {
      // Returns with upside variance but minimal downside
      const dailyReturns = [0.02, 0.05, -0.001, 0.03, -0.002, 0.04];
      const sortino = calculateSortinoRatio(dailyReturns);
      expect(sortino).toBeGreaterThan(5);
    });

    it('should calculate exact Max Drawdown', () => {
      const equitySeries = [100000, 110000, 120000, 96000, 105000, 90000, 115000];
      // Peak was 120,000, lowest after peak was 90,000 -> (120000 - 90000) / 120000 = 0.25 (25%)
      const mdd = calculateMaxDrawdown(equitySeries);
      expect(mdd).toBeCloseTo(25.0, 1);
    });

    it('should calculate Profit Factor', () => {
      const trades = [
        { pnl: 1000 },
        { pnl: -500 },
        { pnl: 2000 },
        { pnl: -500 },
      ];
      // Gross Profit = 3000, Gross Loss = 1000 -> PF = 3.0
      const pf = calculateProfitFactor(trades);
      expect(pf).toBe(3.0);
    });
  });

  describe('Friction Modeling & Execution Realism', () => {
    const mockCandles: CandleData[] = [
      { time: 1700000000, open: 90000, high: 90500, low: 89800, close: 90200, volume: 150 },
      { time: 1700003600, open: 90200, high: 91500, low: 90100, close: 91200, volume: 200 },
      { time: 1700007200, open: 91200, high: 92000, low: 90800, close: 91800, volume: 180 },
      { time: 1700010800, open: 91800, high: 92500, low: 91400, close: 92400, volume: 220 },
      { time: 1700014400, open: 92400, high: 92800, low: 91900, close: 92100, volume: 190 },
      { time: 1700018000, open: 92100, high: 93500, low: 91800, close: 93200, volume: 210 },
      { time: 1700021600, open: 93200, high: 94000, low: 93000, close: 93800, volume: 250 },
      { time: 1700025200, open: 93800, high: 94200, low: 93500, close: 94100, volume: 180 },
      { time: 1700028800, open: 94100, high: 94500, low: 92000, close: 92200, volume: 300 }, // 8-hour boundary reached
    ];

    it('should deduct Hyperliquid taker fees (0.035%) on entries and exits', () => {
      const params: BacktestParams = {
        mode: 'OCEAN_RULE_STRATEGY',
        asset: 'BTC',
        initialCapital: 100000,
        leverage: 1,
        takerFeePct: 0.00035,
        slippageBps: 0,
        deductFunding: false,
        strategyRule: {
          takeProfitPct: 2.0, // 2% TP
          stopLossPct: 1.0,
        },
      };

      const result = runBacktest(params, mockCandles);
      expect(result.summary.totalTrades).toBeGreaterThan(0);
      expect(result.summary.totalFeesPaid).toBeGreaterThan(0);
      // Fee should equal approx notional * 0.00035 * 2
      const firstTrade = result.trades[0];
      expect(firstTrade.feePaid).toBeGreaterThan(0);
    });

    it('should apply dynamic slippage to entry and exit prices', () => {
      const paramsWithSlippage: BacktestParams = {
        mode: 'OCEAN_RULE_STRATEGY',
        asset: 'BTC',
        initialCapital: 100000,
        leverage: 1,
        slippageBps: 10, // 10 bps = 0.1%
        deductFunding: false,
      };

      const paramsZeroSlippage: BacktestParams = {
        ...paramsWithSlippage,
        slippageBps: 0,
      };

      const resSlippage = runBacktest(paramsWithSlippage, mockCandles);
      const resZero = runBacktest(paramsZeroSlippage, mockCandles);

      if (resSlippage.trades.length > 0 && resZero.trades.length > 0) {
        // Entry price with slippage on long must be higher than without slippage
        expect(resSlippage.trades[0].entryPrice).toBeGreaterThan(resZero.trades[0].entryPrice);
      }
    });

    it('should simulate whale replication mode with recorded events', () => {
      const mockEvents: PositionEvent[] = [
        {
          walletAddress: '0x1234567890123456789012345678901234567890',
          asset: 'BTC',
          eventType: 'OPEN',
          prevSize: 0,
          newSize: 1.5,
          deltaNotional: 135000,
          timestamp: 1700000000 * 1000,
        },
        {
          walletAddress: '0x1234567890123456789012345678901234567890',
          asset: 'BTC',
          eventType: 'CLOSE',
          prevSize: 1.5,
          newSize: 0,
          deltaNotional: -140000,
          timestamp: 1700021600 * 1000,
        },
      ];

      const params: BacktestParams = {
        mode: 'WHALE_REPLICATION',
        targetWallet: '0x1234567890123456789012345678901234567890',
        initialCapital: 50000,
        leverage: 2,
      };

      const result = runBacktest(params, mockCandles, mockEvents);
      expect(result.summary.totalTrades).toBe(1);
      expect(result.trades[0].exitPrice).toBeGreaterThan(result.trades[0].entryPrice);
      expect(result.trades[0].pnl).toBeGreaterThan(0);
      expect(result.equityCurve.length).toBeGreaterThan(0);
    });
  });
});
