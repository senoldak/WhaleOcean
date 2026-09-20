import { WalletAlphaScore, OceanPersona, RiskTier, VerifiedPosition } from '../../types/contracts';
import { PositionEvent, WhaleOceanRepository } from '../../db/repository';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateProfitFactor,
} from '../backtest/backtest-engine';

export interface PersonaMetrics {
  avgLeverage: number;
  maxDrawdown: number;
  profitFactor: number;
  avgHoldingHours: number;
  winRate: number;
}

export function classifyPersona(metrics: PersonaMetrics): OceanPersona {
  if (metrics.avgLeverage <= 3 && metrics.maxDrawdown <= 15 && metrics.profitFactor >= 1.8 && metrics.winRate >= 55) {
    return 'TRITON';
  }
  if (metrics.avgLeverage >= 8 || (metrics.avgHoldingHours < 4 && metrics.maxDrawdown >= 20)) {
    return 'LEVIATHAN';
  }
  if (metrics.profitFactor >= 1.6 && metrics.winRate >= 45 && metrics.maxDrawdown < 30) {
    return 'ORCA';
  }
  return 'LEVIATHAN';
}

export function classifyRiskTier(maxDrawdown: number, avgLeverage: number): RiskTier {
  if (maxDrawdown < 10 && avgLeverage <= 3) {
    return 'CONSERVATIVE';
  }
  if (maxDrawdown < 20 && avgLeverage <= 10) {
    return 'BALANCED';
  }
  return 'AGGRESSIVE';
}

/**
 * Scores an individual observed wallet based on its historical position events and clearinghouse state.
 * Returns null if the wallet has insufficient history (< 5 position events).
 */
export function scoreWallet(
  walletAddress: string,
  events: PositionEvent[],
  currentPositions: VerifiedPosition[] = [],
  totalObservedExposure = 0
): WalletAlphaScore | null {
  if (!events || events.length < 5) {
    return null;
  }

  // Sort events chronologically
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Reconstruct trade results and holding periods
  interface PositionBook {
    asset: string;
    entryTime: number;
    size: number;
    notional: number;
  }

  const openBooks: Map<string, PositionBook> = new Map();
  const trades: Array<{ pnl: number; holdingHours: number }> = [];
  const equitySeries: number[] = [100000];
  let currentEquity = 100000;
  let totalPnlUsd = 0;

  for (const ev of sorted) {
    const key = ev.asset;
    const existing = openBooks.get(key);

    if (ev.eventType === 'OPEN' || ev.eventType === 'INCREASE') {
      if (!existing) {
        openBooks.set(key, {
          asset: ev.asset,
          entryTime: ev.timestamp,
          size: ev.newSize,
          notional: Math.abs(ev.deltaNotional),
        });
      } else {
        existing.size = ev.newSize;
        existing.notional += Math.abs(ev.deltaNotional);
      }
    } else if (ev.eventType === 'CLOSE' || ev.eventType === 'DECREASE' || ev.eventType === 'FLIP') {
      if (existing) {
        const exitNotional = Math.abs(ev.deltaNotional);
        const holdingHours = Math.max(0.1, (ev.timestamp - existing.entryTime) / 3600000);
        
        // PnL estimate from delta notional vs entry notional
        const pnl = exitNotional - existing.notional;
        trades.push({ pnl, holdingHours });
        totalPnlUsd += pnl;

        currentEquity += pnl;
        equitySeries.push(currentEquity);

        if (ev.eventType === 'CLOSE' || ev.eventType === 'FLIP') {
          openBooks.delete(key);
        } else {
          existing.size = ev.newSize;
          existing.notional = Math.max(0, existing.notional - exitNotional);
        }
      }
    }
  }

  // If few closed trades were parsed from events, estimate from event delta differences
  if (trades.length === 0) {
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i].deltaNotional - sorted[i - 1].deltaNotional;
      trades.push({ pnl: delta * 0.05, holdingHours: 4 });
      currentEquity += delta * 0.05;
      equitySeries.push(currentEquity);
    }
  }

  const winning = trades.filter(t => t.pnl > 0);
  const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;
  const profitFactor = calculateProfitFactor(trades);
  const maxDrawdown = calculateMaxDrawdown(equitySeries);

  // Returns for Sharpe / Sortino
  const returns: number[] = [];
  for (let i = 1; i < equitySeries.length; i++) {
    const prev = equitySeries[i - 1];
    if (prev > 0) {
      returns.push((equitySeries[i] - prev) / prev);
    }
  }

  const sharpeRatio = calculateSharpeRatio(returns);
  const sortinoRatio = calculateSortinoRatio(returns);

  const avgHoldingHours = trades.length > 0
    ? trades.reduce((acc, t) => acc + t.holdingHours, 0) / trades.length
    : 12;

  // Average leverage from current active positions or default 3x
  const avgLeverage = currentPositions.length > 0
    ? currentPositions.reduce((acc, p) => acc + (p.leverage || 1), 0) / currentPositions.length
    : 3;

  // Liquidation distance score (0 - 100)
  let liquidationDistanceScore = 80;
  for (const pos of currentPositions) {
    if (pos.liquidationPrice && pos.entryPrice > 0) {
      const distPct = (Math.abs(pos.entryPrice - pos.liquidationPrice) / pos.entryPrice) * 100;
      if (distPct < 15) liquidationDistanceScore = Math.min(liquidationDistanceScore, 30);
      else if (distPct < 30) liquidationDistanceScore = Math.min(liquidationDistanceScore, 60);
      else liquidationDistanceScore = Math.max(liquidationDistanceScore, 90);
    }
  }

  // Persona & Risk Tier
  const persona = classifyPersona({
    avgLeverage,
    maxDrawdown,
    profitFactor,
    avgHoldingHours,
    winRate,
  });

  const riskTier = classifyRiskTier(maxDrawdown, avgLeverage);

  // Compute Composite Ocean Alpha Score (0 - 100)
  // 30% Risk-Adjusted Return
  const riskAdjScore = Math.min(30, Math.max(0, (sharpeRatio * 8) + (sortinoRatio * 4)));

  // 25% Capital Preservation (Penalize drawdown heavily)
  let capPreservationScore = Math.max(0, 25 - (maxDrawdown * 0.8));
  if (maxDrawdown > 45) {
    capPreservationScore = 0; // Disqualified from safety
  }

  // 25% Consistency & Profit Factor
  const consistencyScore = Math.min(25, (winRate * 0.2) + (Math.min(profitFactor, 3) * 3));

  // 20% Ocean Alignment & Liquidation Distance
  const oceanAlignScore = Math.min(20, (liquidationDistanceScore / 100) * 20);

  let rawAlphaScore = riskAdjScore + capPreservationScore + consistencyScore + oceanAlignScore;

  // Anti-toxic penalties:
  if (maxDrawdown > 45) {
    rawAlphaScore = Math.min(rawAlphaScore, 40); // Cap severely
  }

  const oceanAlphaScore = Math.min(100, Math.max(0, parseFloat(rawAlphaScore.toFixed(1))));

  return {
    address: walletAddress.toLowerCase(),
    oceanAlphaScore,
    persona,
    riskTier,
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    totalTrades: trades.length,
    avgHoldingHours: parseFloat(avgHoldingHours.toFixed(1)),
    totalPnlUsd: Math.round(totalPnlUsd),
    liquidationDistanceScore: Math.round(liquidationDistanceScore),
    lastEvaluatedAt: Date.now(),
  };
}

/**
 * Scans all observed wallets in the repository and recalculates their Ocean Alpha Scores.
 */
export async function evaluateAndScoreAllWallets(repo: WhaleOceanRepository): Promise<WalletAlphaScore[]> {
  const wallets = repo.getObservedWallets(200);
  const scored: WalletAlphaScore[] = [];
  const scoredAddresses = new Set<string>();

  // 1. Score top exposure wallets
  for (const w of wallets) {
    const events = (w.events && w.events.length > 0)
      ? w.events
      : (repo.getPositionEventsForWallet ? repo.getPositionEventsForWallet(w.address, 100) : []);
    const score = scoreWallet(w.address, events, w.positions, w.totalObservedExposure);
    if (score) {
      scored.push(score);
      scoredAddresses.add(w.address.toLowerCase());
    }
  }

  // 2. Also score wallets with most recorded events
  if (repo.getWalletsWithMostEvents) {
    const activeEventWallets = repo.getWalletsWithMostEvents(100);
    for (const aew of activeEventWallets) {
      const addr = aew.address.toLowerCase();
      if (scoredAddresses.has(addr)) continue;
      const events = repo.getPositionEventsForWallet(addr, 100);
      const score = scoreWallet(addr, events, [], 0);
      if (score) {
        scored.push(score);
        scoredAddresses.add(addr);
      }
    }
  }

  if (scored.length > 0) {
    repo.saveWalletAlphaScores(scored);
  }

  return scored;
}
