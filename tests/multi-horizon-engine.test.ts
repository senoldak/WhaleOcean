import { describe, it, expect } from 'vitest';
import {
  calculateConsistencyScore,
  runMultiHorizonForWallet,
  HorizonMetrics,
} from '../src/analytics/backtest/multi-horizon-engine';
import { PositionEvent } from '../src/db/repository';
import { CandleData } from '../src/analytics/backtest/backtest-engine';

describe('Multi-Horizon Backtest Engine', () => {
  it('calculates bounded Consistency Score (0-100) favoring steady profits and low drawdowns', () => {
    const steady1M: HorizonMetrics = {
      horizon: '1M',
      days: 30,
      totalReturnPct: 15,
      totalReturnUsd: 15000,
      sharpeRatio: 2.2,
      sortinoRatio: 3.0,
      maxDrawdownPct: 5,
      winRatePct: 65,
      totalTrades: 12,
    };
    const steady3M: HorizonMetrics = {
      horizon: '3M',
      days: 90,
      totalReturnPct: 45,
      totalReturnUsd: 45000,
      sharpeRatio: 2.0,
      sortinoRatio: 2.8,
      maxDrawdownPct: 8,
      winRatePct: 60,
      totalTrades: 35,
    };
    const steady6M: HorizonMetrics = {
      horizon: '6M',
      days: 180,
      totalReturnPct: 85,
      totalReturnUsd: 85000,
      sharpeRatio: 1.9,
      sortinoRatio: 2.6,
      maxDrawdownPct: 10,
      winRatePct: 58,
      totalTrades: 70,
    };

    const score = calculateConsistencyScore(steady1M, steady3M, steady6M);
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);

    const volatile1M: HorizonMetrics = {
      ...steady1M,
      totalReturnPct: 200,
      maxDrawdownPct: 48,
      sharpeRatio: 0.8,
    };
    const volatile3M: HorizonMetrics = {
      ...steady3M,
      totalReturnPct: -20,
      maxDrawdownPct: 55,
      sharpeRatio: -0.2,
    };
    const volatile6M: HorizonMetrics = {
      ...steady6M,
      totalReturnPct: -40,
      maxDrawdownPct: 60,
      sharpeRatio: -0.5,
    };

    const volatileScore = calculateConsistencyScore(volatile1M, volatile3M, volatile6M);
    expect(volatileScore).toBeLessThan(45);
  });

  it('runs multi-horizon evaluation for wallet position events', () => {
    const now = Date.now();
    const events: PositionEvent[] = [
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        asset: 'BTC',
        eventType: 'OPEN',
        prevSize: 0,
        newSize: 1,
        deltaNotional: 90000,
        timestamp: now - 25 * 86400000,
      },
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        asset: 'BTC',
        eventType: 'CLOSE',
        prevSize: 1,
        newSize: 0,
        deltaNotional: -95000,
        timestamp: now - 20 * 86400000,
      },
    ];
    const candles: CandleData[] = [
      {
        time: Math.floor((now - 30 * 86400000) / 1000),
        open: 90000,
        high: 96000,
        low: 89000,
        close: 95000,
        volume: 100,
      },
    ];

    const res = runMultiHorizonForWallet('0x1234567890123456789012345678901234567890', 'ORCA', events, candles);
    expect(res.address).toBe('0x1234567890123456789012345678901234567890');
    expect(res.metrics1M).toBeDefined();
    expect(res.metrics3M).toBeDefined();
    expect(res.metrics6M).toBeDefined();
    expect(res.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(res.consistencyScore).toBeLessThanOrEqual(100);
    expect(['ROBUST', 'MODERATE', 'FRAGILE']).toContain(res.regimeResilience);
  });
});
