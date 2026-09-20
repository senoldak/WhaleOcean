import { BacktestParams, BacktestResult, BacktestTrade, VerifiedMarketSnapshot } from '../../types/contracts';
import { PositionEvent } from '../../db/repository';

export interface CandleData {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ==========================================
// Quantitative Statistical Formulas
// ==========================================

export function calculateSharpeRatio(returns: number[], riskFreeRateAnnual = 0.04): number {
  if (!returns || returns.length < 2) return 0;

  const rfDaily = riskFreeRateAnnual / 365;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return ((mean - rfDaily) / stdDev) * Math.sqrt(365);
}

export function calculateSortinoRatio(returns: number[], targetReturn = 0): number {
  if (!returns || returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideDiffs = returns.map(r => Math.min(0, r - targetReturn));
  const downsideVariance = downsideDiffs.reduce((acc, d) => acc + Math.pow(d, 2), 0) / returns.length;
  const downsideStdDev = Math.sqrt(downsideVariance);

  if (downsideStdDev === 0) return 0;
  return ((mean - targetReturn) / downsideStdDev) * Math.sqrt(365);
}

export function calculateMaxDrawdown(equitySeries: number[]): number {
  if (!equitySeries || equitySeries.length === 0) return 0;

  let peak = equitySeries[0];
  let maxDd = 0;

  for (const eq of equitySeries) {
    if (eq > peak) {
      peak = eq;
    }
    if (peak > 0) {
      const dd = ((peak - eq) / peak) * 100;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }
  }

  return maxDd;
}

export function calculateProfitFactor(trades: Array<{ pnl: number }>): number {
  let grossProfit = 0;
  let grossLoss = 0;

  for (const t of trades) {
    if (t.pnl > 0) grossProfit += t.pnl;
    else if (t.pnl < 0) grossLoss += Math.abs(t.pnl);
  }

  if (grossLoss === 0) return grossProfit > 0 ? 10.0 : 0.0;
  return grossProfit / grossLoss;
}

// ==========================================
// Simulation Engine
// ==========================================

export function runBacktest(
  params: BacktestParams,
  candles: CandleData[] = [],
  events: PositionEvent[] = [],
  snapshots: VerifiedMarketSnapshot[] = []
): BacktestResult {
  const initialCapital = params.initialCapital || 100000;
  let cash = initialCapital;
  let equity = initialCapital;
  const leverage = params.leverage || 1;
  const takerFeePct = params.takerFeePct ?? 0.00035; // 0.035% default
  const slippageBps = params.slippageBps ?? 5; // 5 bps = 0.05%
  const slippageMultiplier = slippageBps / 10000;
  const deductFunding = params.deductFunding ?? true;

  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{
    timestamp: number;
    equity: number;
    benchmarkEquity: number;
    drawdownPct: number;
  }> = [];

  let peakEquity = initialCapital;
  let totalFeesPaid = 0;
  let totalFundingPaid = 0;

  // Track active simulated position
  interface ActiveSimPosition {
    asset: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    entryTime: number;
    margin: number;
    lastFundingCheckTime: number;
  }
  let activePos: ActiveSimPosition | null = null;

  // Helper: benchmark price tracking
  const firstPrice = candles.length > 0 ? candles[0].open : 1;

  if (params.mode === 'WHALE_REPLICATION') {
    // Sort events chronologically
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    let eventIdx = 0;

    // Continuous timeline iteration over candles to provide mark-to-market equity curve
    if (candles.length > 0) {
      for (let i = 0; i < candles.length; i++) {
        const bar = candles[i];
        const barTimeMs = bar.time * 1000;
        const nextBarTimeMs = (i < candles.length - 1) ? candles[i + 1].time * 1000 : Infinity;

        // Process any events that occurred up to this candle's window
        while (eventIdx < sortedEvents.length && sortedEvents[eventIdx].timestamp <= nextBarTimeMs) {
          const evt = sortedEvents[eventIdx];
          eventIdx++;

          const rawPrice = bar.open;

          if ((evt.eventType === 'OPEN' || evt.eventType === 'INCREASE' || evt.eventType === 'FLIP') && !activePos) {
            const side: 'LONG' | 'SHORT' = evt.deltaNotional >= 0 ? 'LONG' : 'SHORT';
            const fillPrice = side === 'LONG'
              ? rawPrice * (1 + slippageMultiplier)
              : rawPrice * (1 - slippageMultiplier);

            const allocatedMargin = cash * 0.95;
            const notional = allocatedMargin * leverage;
            const size = notional / fillPrice;
            const fee = notional * takerFeePct;

            cash -= fee;
            totalFeesPaid += fee;

            activePos = {
              asset: evt.asset,
              side,
              size,
              entryPrice: fillPrice,
              entryTime: evt.timestamp,
              margin: allocatedMargin,
              lastFundingCheckTime: evt.timestamp,
            };
          } else if ((evt.eventType === 'CLOSE' || evt.eventType === 'DECREASE' || evt.eventType === 'FLIP') && activePos) {
            const exitRawPrice = bar.close;
            const exitPrice = activePos.side === 'LONG'
              ? exitRawPrice * (1 - slippageMultiplier)
              : exitRawPrice * (1 + slippageMultiplier);

            const notional = activePos.size * exitPrice;
            const exitFee = notional * takerFeePct;
            totalFeesPaid += exitFee;

            const priceDiff = activePos.side === 'LONG'
              ? exitPrice - activePos.entryPrice
              : activePos.entryPrice - exitPrice;
            const grossPnl = activePos.size * priceDiff;
            const netPnl = grossPnl - exitFee;

            cash += netPnl;
            equity = cash;

            trades.push({
              id: `trade_${trades.length + 1}`,
              asset: activePos.asset,
              side: activePos.side,
              entryTime: activePos.entryTime,
              exitTime: evt.timestamp,
              entryPrice: activePos.entryPrice,
              exitPrice,
              size: activePos.size,
              notional,
              feePaid: exitFee + (activePos.margin * leverage * takerFeePct),
              fundingPaid: 0,
              pnl: netPnl,
              pnlPercent: (netPnl / activePos.margin) * 100,
              exitReason: evt.eventType === 'FLIP' ? 'WHALE_FLIPPED' : 'WHALE_CLOSED',
            });

            activePos = null;
          }
        }

        // Continuous mark-to-market equity on this bar
        const unrealizedPnl = activePos
          ? activePos.size * (activePos.side === 'LONG' ? bar.close - activePos.entryPrice : activePos.entryPrice - bar.close)
          : 0;
        equity = cash + unrealizedPnl;
        if (equity > peakEquity) peakEquity = equity;
        const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
        const benchmarkEquity = initialCapital * (bar.close / firstPrice);

        equityCurve.push({
          timestamp: barTimeMs,
          equity,
          benchmarkEquity,
          drawdownPct: dd,
        });
      }
    } else {
      // Fallback if no candles: push on discrete events
      for (const evt of sortedEvents) {
        equityCurve.push({
          timestamp: evt.timestamp,
          equity,
          benchmarkEquity: initialCapital,
          drawdownPct: 0,
        });
      }
    }
  } else {
    // OCEAN_RULE_STRATEGY: Iterate bar by bar across candles with multi-signal setups
    const preset = params.strategyRule?.strategyPreset || 'TREND_FOLLOWING';

    for (let i = 0; i < candles.length; i++) {
      const bar = candles[i];
      const barTimeMs = bar.time * 1000;

      // Check funding on 8-hour boundary (every 28800 seconds)
      if (activePos && deductFunding && (bar.time - Math.floor(activePos.lastFundingCheckTime / 1000)) >= 28800) {
        const estFundingRate = 0.0001; // 0.01% typical 8h funding
        const fundingPayment = activePos.size * bar.close * estFundingRate;
        const fundingImpact = activePos.side === 'LONG' ? -fundingPayment : fundingPayment;
        cash += fundingImpact;
        totalFundingPaid += Math.abs(fundingPayment);
        activePos.lastFundingCheckTime = barTimeMs;
      }

      // If in position, check TP / SL / Liquidation
      if (activePos) {
        let closeReason: string | null = null;
        let exitPrice = bar.close;

        const tpPct = params.strategyRule?.takeProfitPct ?? 3.0;
        const slPct = params.strategyRule?.stopLossPct ?? 1.5;

        const targetTpPrice = activePos.side === 'LONG'
          ? activePos.entryPrice * (1 + tpPct / 100)
          : activePos.entryPrice * (1 - tpPct / 100);

        const targetSlPrice = activePos.side === 'LONG'
          ? activePos.entryPrice * (1 - slPct / 100)
          : activePos.entryPrice * (1 + slPct / 100);

        // Check High/Low triggers
        if (activePos.side === 'LONG') {
          if (bar.high >= targetTpPrice) {
            closeReason = 'TAKE_PROFIT';
            exitPrice = targetTpPrice;
          } else if (bar.low <= targetSlPrice) {
            closeReason = 'STOP_LOSS';
            exitPrice = targetSlPrice;
          }
        } else {
          if (bar.low <= targetTpPrice) {
            closeReason = 'TAKE_PROFIT';
            exitPrice = targetTpPrice;
          } else if (bar.high >= targetSlPrice) {
            closeReason = 'STOP_LOSS';
            exitPrice = targetSlPrice;
          }
        }

        // Close position if triggered or at final bar
        if (closeReason || i === candles.length - 1) {
          const finalExitPrice = activePos.side === 'LONG'
            ? exitPrice * (1 - slippageMultiplier)
            : exitPrice * (1 + slippageMultiplier);

          const notional = activePos.size * finalExitPrice;
          const exitFee = notional * takerFeePct;
          totalFeesPaid += exitFee;

          const priceDiff = activePos.side === 'LONG'
            ? finalExitPrice - activePos.entryPrice
            : activePos.entryPrice - finalExitPrice;
          const netPnl = (activePos.size * priceDiff) - exitFee;

          cash += netPnl;
          equity = cash;

          trades.push({
            id: `trade_${trades.length + 1}`,
            asset: activePos.asset,
            side: activePos.side,
            entryTime: activePos.entryTime,
            exitTime: barTimeMs,
            entryPrice: activePos.entryPrice,
            exitPrice: finalExitPrice,
            size: activePos.size,
            notional,
            feePaid: exitFee,
            fundingPaid: 0,
            pnl: netPnl,
            pnlPercent: (netPnl / activePos.margin) * 100,
            exitReason: closeReason || 'END_OF_DATA',
          });

          activePos = null;
        }
      } else if (i < candles.length - 1 && cash > 1000) {
        // Multi-regime signal generation based on strategy preset
        let signal: 'LONG' | 'SHORT' | null = null;

        if (preset === 'MEAN_REVERSION') {
          // Mean reversion: look back 5 bars. If dropped significantly, buy dip; if pumped, fade.
          if (i >= 5) {
            const pastPrice = candles[i - 4].close;
            const pctChange = (bar.close - pastPrice) / pastPrice;
            if (pctChange < -0.015) signal = 'LONG';
            else if (pctChange > 0.015) signal = 'SHORT';
          }
        } else if (preset === 'BREAKOUT_MOMENTUM') {
          // Breakout: highest high of last 10 bars
          if (i >= 10) {
            const window = candles.slice(i - 10, i);
            const highPeak = Math.max(...window.map(c => c.high));
            const lowTrough = Math.min(...window.map(c => c.low));
            if (bar.close > highPeak) signal = 'LONG';
            else if (bar.close < lowTrough) signal = 'SHORT';
          }
        } else {
          // Default: TREND_FOLLOWING (EMA crossover / bar momentum)
          const isBullishBar = bar.close > bar.open;
          // Look for consistent short momentum
          signal = isBullishBar ? 'LONG' : 'SHORT';
        }

        if (signal) {
          const side = signal;
          const entryRaw = bar.close;
          const fillPrice = side === 'LONG'
            ? entryRaw * (1 + slippageMultiplier)
            : entryRaw * (1 - slippageMultiplier);

          const allocatedMargin = cash * 0.5; // 50% capital per trade
          const notional = allocatedMargin * leverage;
          const size = notional / fillPrice;
          const fee = notional * takerFeePct;

          cash -= fee;
          totalFeesPaid += fee;

          activePos = {
            asset: params.asset || 'BTC',
            side,
            size,
            entryPrice: fillPrice,
            entryTime: barTimeMs,
            margin: allocatedMargin,
            lastFundingCheckTime: barTimeMs,
          };
        }
      }

      // Continuous equity tracking
      const unrealizedPnl = activePos
        ? activePos.size * (activePos.side === 'LONG' ? bar.close - activePos.entryPrice : activePos.entryPrice - bar.close)
        : 0;
      equity = cash + unrealizedPnl;
      if (equity > peakEquity) peakEquity = equity;
      const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
      const benchmarkEquity = initialCapital * (bar.close / firstPrice);

      equityCurve.push({
        timestamp: barTimeMs,
        equity,
        benchmarkEquity,
        drawdownPct: dd,
      });
    }
  }

  // Calculate summary metrics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const totalReturnUsd = equity - initialCapital;
  const totalReturnPct = (totalReturnUsd / initialCapital) * 100;

  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : firstPrice;
  const benchmarkBtcReturnPct = ((lastPrice - firstPrice) / firstPrice) * 100;

  // Daily returns for Sharpe / Sortino
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const curr = equityCurve[i].equity;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }

  const sharpeRatio = calculateSharpeRatio(dailyReturns);
  const sortinoRatio = calculateSortinoRatio(dailyReturns);
  const maxDrawdownPct = calculateMaxDrawdown(equityCurve.map(e => e.equity));
  const profitFactor = calculateProfitFactor(trades);
  const winRatePct = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((acc, t) => acc + t.pnl, 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0)) / losingTrades.length
    : 0;
  const expectancyUsd = trades.length > 0
    ? ((winRatePct / 100) * avgWin) - ((1 - (winRatePct / 100)) * avgLoss)
    : 0;

  const avgHoldingTimeHours = trades.length > 0
    ? trades.reduce((acc, t) => acc + (t.exitTime - t.entryTime) / 3600000, 0) / trades.length
    : 0;

  return {
    params,
    summary: {
      initialCapital,
      finalEquity: equity,
      totalReturnUsd,
      totalReturnPct,
      benchmarkBtcReturnPct,
      sharpeRatio,
      sortinoRatio,
      maxDrawdownPct,
      profitFactor,
      winRatePct,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalFeesPaid,
      totalFundingPaid,
      expectancyUsd,
      avgHoldingTimeHours,
    },
    equityCurve,
    trades,
  };
}
