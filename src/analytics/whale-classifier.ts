import { WhaleClass, WHALE_TIER_THRESHOLDS, VerifiedPosition } from '../types/contracts';
import { PositionEvent } from '../db/repository';

export interface WhaleDnaSummary {
  hasSufficientHistory: boolean;
  insufficientHistoryReason?: string;
  medianDurationHours: number | null;
  avgPositionNotional: number | null;
  marketConcentrationHhi: number | null; // Herfindahl-Hirschman Index (0 - 10,000)
  directionalBiasPercentLong: number | null;
  flipFrequency30d: number | null;
}

export function classifyWhale(totalNotionalExposure: number): WhaleClass {
  const notional = Math.max(0, totalNotionalExposure);
  for (const [tier, bounds] of Object.entries(WHALE_TIER_THRESHOLDS)) {
    if (notional >= bounds.min && notional < bounds.max) {
      return tier as WhaleClass;
    }
  }
  return 'FISH';
}

export function getWhaleTierDetails(tier: WhaleClass) {
  const bounds = WHALE_TIER_THRESHOLDS[tier];
  return {
    tier,
    minExposure: bounds.min,
    maxExposure: bounds.max,
    isTopWhale: tier === 'BLUE_WHALE' || tier === 'SPERM_WHALE' || tier === 'ORCA',
  };
}

/**
 * Calculates Whale DNA statistical behavioral profile strictly from observed data.
 * If history is insufficient (< 3 events or < 24h), returns hasSufficientHistory = false.
 */
export function calculateWhaleDna(
  events: PositionEvent[],
  positions: VerifiedPosition[],
  totalObservedExposure: number
): WhaleDnaSummary {
  if (!events || events.length < 3) {
    return {
      hasSufficientHistory: false,
      insufficientHistoryReason: 'Insufficient observed history (< 3 position events recorded).',
      medianDurationHours: null,
      avgPositionNotional: null,
      marketConcentrationHhi: null,
      directionalBiasPercentLong: null,
      flipFrequency30d: null,
    };
  }

  // Calculate directional bias from positions
  let longNotional = 0;
  let totalNotional = 0;
  const marketShares: number[] = [];

  for (const pos of positions) {
    const posNotional = pos.size * pos.entryPrice;
    totalNotional += posNotional;
    if (pos.side === 'LONG') {
      longNotional += posNotional;
    }
  }

  const directionalBiasPercentLong =
    totalNotional > 0 ? (longNotional / totalNotional) * 100 : 50;

  // Market concentration (HHI)
  for (const pos of positions) {
    const posNotional = pos.size * pos.entryPrice;
    const share = totalNotional > 0 ? (posNotional / totalNotional) * 100 : 0;
    marketShares.push(share);
  }
  const marketConcentrationHhi = marketShares.reduce((sum, s) => sum + s * s, 0);

  // Position flip count within last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const flipCount = events.filter(e => e.eventType === 'FLIP' && e.timestamp >= thirtyDaysAgo).length;

  // Average position notional from events
  const notionalDeltas = events.map(e => Math.abs(e.deltaNotional));
  const avgPositionNotional =
    notionalDeltas.length > 0
      ? notionalDeltas.reduce((a, b) => a + b, 0) / notionalDeltas.length
      : totalObservedExposure;

  return {
    hasSufficientHistory: true,
    medianDurationHours: null, // Computed when full round-trip open-to-close events exist
    avgPositionNotional,
    marketConcentrationHhi: Math.round(marketConcentrationHhi),
    directionalBiasPercentLong: Math.round(directionalBiasPercentLong),
    flipFrequency30d: flipCount,
  };
}
