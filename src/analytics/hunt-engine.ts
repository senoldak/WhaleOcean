import { VerifiedMarketSnapshot } from '../types/contracts';

export interface LiquidationHuntZone {
  asset: string;
  markPrice: number;
  totalAtRiskExposure: number;
  longLiquidationExposure: number;
  shortLiquidationExposure: number;
  nearestLongLiqPrice: number | null;
  nearestShortLiqPrice: number | null;
  distanceToNearestLiqPct: number | null;
  vulnerableWhalesCount: number;
  riskTier: 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'SAFE';
  vulnerablePositions: Array<{
    walletAddress: string;
    side: 'LONG' | 'SHORT';
    size: number;
    notional: number;
    entryPrice: number;
    liquidationPrice: number;
    distancePct: number;
    leverage: number;
  }>;
}

export interface RawPositionWithWallet {
  walletAddress: string;
  asset: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  liquidationPrice: number | null;
  leverage: number;
  unrealizedPnl: number;
}

export function calculateHuntZones(
  positions: RawPositionWithWallet[],
  snapshots: VerifiedMarketSnapshot[]
): LiquidationHuntZone[] {
  const markPriceMap = new Map(snapshots.map((s) => [s.asset, s.markPrice]));
  const assetGroups = new Map<string, RawPositionWithWallet[]>();

  for (const pos of positions) {
    if (!pos.liquidationPrice || pos.liquidationPrice <= 0) continue;
    if (!assetGroups.has(pos.asset)) {
      assetGroups.set(pos.asset, []);
    }
    assetGroups.get(pos.asset)!.push(pos);
  }

  const zones: LiquidationHuntZone[] = [];

  for (const [asset, posList] of assetGroups.entries()) {
    const markPrice = markPriceMap.get(asset);
    if (!markPrice || markPrice <= 0) continue;

    let totalAtRiskExposure = 0;
    let longLiqExposure = 0;
    let shortLiqExposure = 0;
    let nearestLongLiq: number | null = null;
    let nearestShortLiq: number | null = null;
    let minDistance = Infinity;

    const vulnerablePositions: LiquidationHuntZone['vulnerablePositions'] = [];

    for (const pos of posList) {
      const liqPrice = pos.liquidationPrice!;
      // Filter out invalid/breached liquidation levels
      if (pos.side === 'LONG' && liqPrice >= markPrice) continue;
      if (pos.side === 'SHORT' && liqPrice <= markPrice) continue;

      const notional = pos.size * pos.entryPrice;
      totalAtRiskExposure += notional;

      const distancePct = Math.abs((liqPrice - markPrice) / markPrice) * 100;
      if (distancePct < minDistance) {
        minDistance = distancePct;
      }

      if (pos.side === 'LONG') {
        longLiqExposure += notional;
        if (nearestLongLiq === null || liqPrice > nearestLongLiq) {
          nearestLongLiq = liqPrice;
        }
      } else {
        shortLiqExposure += notional;
        if (nearestShortLiq === null || liqPrice < nearestShortLiq) {
          nearestShortLiq = liqPrice;
        }
      }

      // Record significant positions
      if (notional >= 25_000) {
        vulnerablePositions.push({
          walletAddress: pos.walletAddress,
          side: pos.side,
          size: pos.size,
          notional,
          entryPrice: pos.entryPrice,
          liquidationPrice: liqPrice,
          distancePct: Number(distancePct.toFixed(2)),
          leverage: pos.leverage,
        });
      }
    }

    if (totalAtRiskExposure < 50_000) continue;

    // Determine risk tier
    let riskTier: LiquidationHuntZone['riskTier'] = 'SAFE';
    if (minDistance <= 5) riskTier = 'CRITICAL';
    else if (minDistance <= 15) riskTier = 'ELEVATED';
    else if (minDistance <= 30) riskTier = 'MODERATE';

    // Sort positions by distance ascending (closest to liquidation first)
    vulnerablePositions.sort((a, b) => a.distancePct - b.distancePct);

    zones.push({
      asset,
      markPrice,
      totalAtRiskExposure,
      longLiquidationExposure: longLiqExposure,
      shortLiquidationExposure: shortLiqExposure,
      nearestLongLiqPrice: nearestLongLiq,
      nearestShortLiqPrice: nearestShortLiq,
      distanceToNearestLiqPct: minDistance !== Infinity ? Number(minDistance.toFixed(2)) : null,
      vulnerableWhalesCount: posList.length,
      riskTier,
      vulnerablePositions: vulnerablePositions.slice(0, 20),
    });
  }

  // Sort zones by risk priority (closest distance, then total exposure)
  return zones.sort((a, b) => {
    const distA = a.distanceToNearestLiqPct ?? 999;
    const distB = b.distanceToNearestLiqPct ?? 999;
    if (distA !== distB) return distA - distB;
    return b.totalAtRiskExposure - a.totalAtRiskExposure;
  });
}
