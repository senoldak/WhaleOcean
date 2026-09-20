import { VerifiedMarketSnapshot } from '../types/contracts';

export interface ReefBarrier {
  asset: string;
  depthTier: 'DEEP_REEF' | 'MID_REEF' | 'SHALLOW_REEF';
  markPrice: number;
  openInterest: number;
  volume24h: number;
  fundingRate: number;
  observedWhaleExposure: number;
  whaleConcentrationRatio: number; // Whale exposure / Open Interest %
  liquidityScore: number; // 0 - 100
  barrierHealth: 'ROBUST' | 'STABLE' | 'FRAGILE';
}

export interface RawPositionSimple {
  asset: string;
  size: number;
  entryPrice: number;
}

export function calculateReefBarriers(
  snapshots: VerifiedMarketSnapshot[],
  positions: RawPositionSimple[]
): ReefBarrier[] {
  // Aggregate whale exposure per asset
  const whaleExposureMap = new Map<string, number>();
  for (const pos of positions) {
    const notional = pos.size * pos.entryPrice;
    whaleExposureMap.set(pos.asset, (whaleExposureMap.get(pos.asset) || 0) + notional);
  }

  const barriers: ReefBarrier[] = [];

  for (const snap of snapshots) {
    if (!snap.openInterest || snap.openInterest <= 0) continue;

    const whaleExposure = Math.max(0, whaleExposureMap.get(snap.asset) || 0);
    const concentrationRatio = Number(
      Math.min(100, Math.max(0, (whaleExposure / snap.openInterest) * 100)).toFixed(2)
    );

    // Score liquidity based on OI and 24h volume
    let depthTier: ReefBarrier['depthTier'] = 'SHALLOW_REEF';
    if (snap.openInterest >= 1_000_000_000) {
      depthTier = 'DEEP_REEF';
    } else if (snap.openInterest >= 50_000_000) {
      depthTier = 'MID_REEF';
    }

    // Liquidity score (0-100) combining OI and Volume
    const oiScore = Math.min(50, Math.max(0, (Math.log10(Math.max(1, snap.openInterest)) / 10) * 50));
    const vlmScore = Math.min(50, Math.max(0, (Math.log10(Math.max(1, snap.volume24h)) / 10) * 50));
    const liquidityScore = Math.round(oiScore + vlmScore);

    // Barrier health based on liquidity vs whale concentration
    let barrierHealth: ReefBarrier['barrierHealth'] = 'STABLE';
    if (depthTier === 'DEEP_REEF' && concentrationRatio < 30) {
      barrierHealth = 'ROBUST';
    } else if (concentrationRatio > 60 || depthTier === 'SHALLOW_REEF') {
      barrierHealth = 'FRAGILE';
    }

    barriers.push({
      asset: snap.asset,
      depthTier,
      markPrice: snap.markPrice,
      openInterest: snap.openInterest,
      volume24h: snap.volume24h,
      fundingRate: snap.fundingRate,
      observedWhaleExposure: whaleExposure,
      whaleConcentrationRatio: concentrationRatio,
      liquidityScore,
      barrierHealth,
    });
  }

  // Sort by open interest descending
  return barriers.sort((a, b) => b.openInterest - a.openInterest);
}
