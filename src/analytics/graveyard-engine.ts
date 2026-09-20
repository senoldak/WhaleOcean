import { WhaleClass } from '../types/contracts';

export interface GraveyardCasualty {
  walletAddress: string;
  whaleClass: WhaleClass;
  asset: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  liquidationPrice: number | null;
  unrealizedPnl: number;
  pnlPercentage: number;
  notionalExposure: number;
  mortalityRisk: 'CRITICAL_RISK' | 'HIGH_DISTRESS' | 'MODERATE_PAIN';
}

export interface RawGraveyardPosition {
  walletAddress: string;
  whaleClass: WhaleClass;
  asset: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  liquidationPrice: number | null;
  unrealizedPnl: number;
  leverage?: number;
}

export function calculateGraveyardCasualties(
  positions: RawGraveyardPosition[]
): GraveyardCasualty[] {
  const casualties: GraveyardCasualty[] = [];

  for (const pos of positions) {
    // Only consider significantly underwater positions (PnL < -$25,000)
    if (pos.unrealizedPnl >= -25_000) continue;

    const notional = pos.size * pos.entryPrice;
    if (notional <= 0) continue;

    const leverage = pos.leverage && pos.leverage > 0 ? pos.leverage : 1;
    const margin = notional / leverage;
    const pnlPct = Number(((pos.unrealizedPnl / margin) * 100).toFixed(2));

    let mortalityRisk: GraveyardCasualty['mortalityRisk'] = 'MODERATE_PAIN';
    if (pos.unrealizedPnl <= -1_000_000 || pnlPct <= -50) {
      mortalityRisk = 'CRITICAL_RISK';
    } else if (pos.unrealizedPnl <= -250_000 || pnlPct <= -25) {
      mortalityRisk = 'HIGH_DISTRESS';
    }

    casualties.push({
      walletAddress: pos.walletAddress,
      whaleClass: pos.whaleClass,
      asset: pos.asset,
      side: pos.side,
      size: pos.size,
      entryPrice: pos.entryPrice,
      liquidationPrice: pos.liquidationPrice,
      unrealizedPnl: pos.unrealizedPnl,
      pnlPercentage: pnlPct,
      notionalExposure: notional,
      mortalityRisk,
    });
  }

  // Sort by unrealized PnL ascending (deepest underwater first)
  return casualties.sort((a, b) => a.unrealizedPnl - b.unrealizedPnl);
}
