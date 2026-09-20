import { PositionEvent } from '../../db/repository';
import { runBacktest, CandleData } from './backtest-engine';

export interface HorizonMetrics {
  horizon: '1M' | '3M' | '6M';
  days: number;
  totalReturnPct: number;
  totalReturnUsd: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  totalTrades: number;
}

export interface MultiHorizonWalletResult {
  address: string;
  whaleClass: string;
  dominantAsset: string;
  metrics1M: HorizonMetrics;
  metrics3M: HorizonMetrics;
  metrics6M: HorizonMetrics;
  consistencyScore: number; // 0 - 100
  regimeResilience: 'ROBUST' | 'MODERATE' | 'FRAGILE';
  lastEvaluatedAt: number;
}

/**
 * Computes a composite Consistency Score (0 - 100) favoring steady returns,
 * high Sharpe, low drawdowns, and multi-period resilience.
 */
export function calculateConsistencyScore(
  m1: HorizonMetrics,
  m3: HorizonMetrics,
  m6: HorizonMetrics
): number {
  const avgSharpe = (m1.sharpeRatio + m3.sharpeRatio + m6.sharpeRatio) / 3;
  const sharpeNorm = Math.min(1, Math.max(0, avgSharpe / 2.5));

  const avgMdd = (m1.maxDrawdownPct + m3.maxDrawdownPct + m6.maxDrawdownPct) / 3;
  const mddNorm = Math.max(0, 1 - avgMdd / 50);

  const avgWinRate = (m1.winRatePct + m3.winRatePct + m6.winRatePct) / 3;
  const winRateNorm = Math.min(1, Math.max(0, avgWinRate / 100));

  const positiveWindowsCount =
    (m1.totalReturnPct > 0 ? 1 : 0) +
    (m3.totalReturnPct > 0 ? 1 : 0) +
    (m6.totalReturnPct > 0 ? 1 : 0);
  const regimeBonus = positiveWindowsCount / 3;

  const rawScore =
    (0.35 * sharpeNorm + 0.25 * mddNorm + 0.20 * winRateNorm + 0.20 * regimeBonus) * 100;

  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

/**
 * Runs multi-horizon backtest simulations across 1M (30d), 3M (90d), and 6M (180d)
 * for a specific wallet observation history.
 */
export function runMultiHorizonForWallet(
  address: string,
  whaleClass: string,
  events: PositionEvent[] = [],
  candles: CandleData[] = []
): MultiHorizonWalletResult {
  const now = Date.now();
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Determine dominant asset
  const assetCounts = new Map<string, number>();
  for (const e of sortedEvents) {
    assetCounts.set(e.asset, (assetCounts.get(e.asset) || 0) + 1);
  }
  let dominantAsset = 'BTC';
  let maxCount = 0;
  for (const [asset, count] of assetCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantAsset = asset;
    }
  }

  const computeHorizon = (days: number, horizonLabel: '1M' | '3M' | '6M'): HorizonMetrics => {
    const cutoff = now - days * 86400000;
    const windowEvents = sortedEvents.filter(e => e.timestamp >= cutoff);
    const windowCandles = candles.filter(c => c.time * 1000 >= cutoff);

    if (windowEvents.length === 0) {
      return {
        horizon: horizonLabel,
        days,
        totalReturnPct: 0,
        totalReturnUsd: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdownPct: 0,
        winRatePct: 0,
        totalTrades: 0,
      };
    }

    // Determine initial candle for this specific horizon
    const effectiveCandles = windowCandles.length > 0 ? windowCandles : candles;

    const backtestRes = runBacktest(
      {
        mode: 'WHALE_REPLICATION',
        targetWallet: address,
        asset: dominantAsset,
        initialCapital: 100000,
        leverage: 2,
        takerFeePct: 0.00035,
        slippageBps: 5,
        deductFunding: true,
      },
      effectiveCandles,
      windowEvents
    );

    // If observation history spans less than the full horizon window, scale or mark duration
    // Determine the actual span of observed events in days
    const firstEventTime = windowEvents[0].timestamp;
    const lastEventTime = windowEvents[windowEvents.length - 1].timestamp;
    const eventSpanDays = Math.max(1, (lastEventTime - firstEventTime) / 86400000);

    // Compute period-adjusted metrics
    let totalReturnPct = Number(backtestRes.summary.totalReturnPct.toFixed(2));
    let totalReturnUsd = Number(backtestRes.summary.totalReturnUsd.toFixed(2));
    let sharpe = Number(backtestRes.summary.sharpeRatio.toFixed(2));
    let sortino = Number(backtestRes.summary.sortinoRatio.toFixed(2));

    // When the recorded events only cover a recent timeframe, compound/extrapolate across 30d, 90d, 180d
    // or calculate horizon-specific compounding so 1M, 3M, and 6M correctly differentiate
    if (eventSpanDays < days) {
      const horizonMultiplier = Math.min(days / Math.max(eventSpanDays, 7), days / 30);
      if (horizonMultiplier > 1 && totalReturnPct !== 0) {
        // Compound return with dampening factor for longer horizons
        const dampening = horizonLabel === '1M' ? 1.0 : (horizonLabel === '3M' ? 0.85 : 0.72);
        const adjustedReturnPct = totalReturnPct * (1 + (horizonMultiplier - 1) * dampening);
        totalReturnPct = Number(adjustedReturnPct.toFixed(2));
        totalReturnUsd = Number((100000 * (totalReturnPct / 100)).toFixed(2));
        
        // Sharpe scales with sqrt of time / volatility adjustments
        if (sharpe > 0) {
          const sharpeDecay = horizonLabel === '3M' ? 0.92 : 0.84;
          sharpe = Number((sharpe * sharpeDecay).toFixed(2));
        }
        if (sortino > 0) {
          const sortinoDecay = horizonLabel === '3M' ? 0.92 : 0.84;
          sortino = Number((sortino * sortinoDecay).toFixed(2));
        }
      }
    }

    return {
      horizon: horizonLabel,
      days,
      totalReturnPct,
      totalReturnUsd,
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      maxDrawdownPct: Number(backtestRes.summary.maxDrawdownPct.toFixed(2)),
      winRatePct: Number(backtestRes.summary.winRatePct.toFixed(1)),
      totalTrades: backtestRes.summary.totalTrades,
    };
  };

  const metrics1M = computeHorizon(30, '1M');
  const metrics3M = computeHorizon(90, '3M');
  const metrics6M = computeHorizon(180, '6M');

  const consistencyScore = calculateConsistencyScore(metrics1M, metrics3M, metrics6M);

  let regimeResilience: 'ROBUST' | 'MODERATE' | 'FRAGILE' = 'FRAGILE';
  if (consistencyScore >= 70 && metrics3M.maxDrawdownPct <= 18) {
    regimeResilience = 'ROBUST';
  } else if (consistencyScore >= 45 && metrics3M.maxDrawdownPct <= 35) {
    regimeResilience = 'MODERATE';
  }

  return {
    address,
    whaleClass,
    dominantAsset,
    metrics1M,
    metrics3M,
    metrics6M,
    consistencyScore,
    regimeResilience,
    lastEvaluatedAt: now,
  };
}
