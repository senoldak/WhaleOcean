import { WhaleClass } from '../types/contracts';

export interface PodMember {
  address: string;
  whaleClass: WhaleClass;
  exposureInPodAsset: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
}

export interface PodCluster {
  id: string;
  name: string;
  asset: string;
  dominantSide: 'LONG' | 'SHORT';
  memberCount: number;
  totalPodExposure: number;
  longNotional: number;
  shortNotional: number;
  concordanceScore: number; // 0 - 100 percentage consensus
  avgLeverage: number;
  members: PodMember[];
}

export interface RawWalletWithPositions {
  address: string;
  whaleClass: WhaleClass;
  totalObservedExposure: number;
  positions?: Array<{
    asset: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    leverage: number;
    unrealizedPnl: number;
  }>;
}

/**
 * Computes Pods (co-movement & asset clustering) strictly from observed wallets and positions.
 */
export function clusterWalletsIntoPods(wallets: RawWalletWithPositions[]): PodCluster[] {
  const assetMap = new Map<string, PodMember[]>();

  for (const wallet of wallets) {
    if (!wallet.positions || wallet.positions.length === 0) continue;

    for (const pos of wallet.positions) {
      const notional = pos.size * pos.entryPrice;
      // Focus on significant exposures (>= $25k in a single asset)
      if (notional < 25_000) continue;

      if (!assetMap.has(pos.asset)) {
        assetMap.set(pos.asset, []);
      }

      assetMap.get(pos.asset)!.push({
        address: wallet.address,
        whaleClass: wallet.whaleClass,
        exposureInPodAsset: notional,
        side: pos.side,
        leverage: pos.leverage || 1,
      });
    }
  }

  const clusters: PodCluster[] = [];

  for (const [asset, members] of assetMap.entries()) {
    // Only form a pod if at least 2 distinct wallets have positions
    if (members.length < 2) continue;

    let longNotional = 0;
    let shortNotional = 0;
    let totalLeverage = 0;

    for (const m of members) {
      if (m.side === 'LONG') {
        longNotional += m.exposureInPodAsset;
      } else {
        shortNotional += m.exposureInPodAsset;
      }
      totalLeverage += m.leverage;
    }

    const totalPodExposure = longNotional + shortNotional;
    if (totalPodExposure < 100_000) continue; // Minimum $100k collective pod exposure

    const dominantSide = longNotional >= shortNotional ? 'LONG' : 'SHORT';
    const dominantNotional = dominantSide === 'LONG' ? longNotional : shortNotional;
    const concordanceScore = Math.round((dominantNotional / totalPodExposure) * 100);
    const avgLeverage = Number((totalLeverage / members.length).toFixed(1));

    // Sort members by exposure descending
    const sortedMembers = [...members].sort((a, b) => b.exposureInPodAsset - a.exposureInPodAsset);

    // Dynamic evocative pod naming
    let descriptor = 'Syndicate';
    if (totalPodExposure > 20_000_000) descriptor = 'Leviathan Pod';
    else if (totalPodExposure > 5_000_000) descriptor = 'Mega Syndicate';
    else if (concordanceScore >= 80) descriptor = dominantSide === 'LONG' ? 'Bull Legion' : 'Bear Consortium';
    else descriptor = 'Cross-Current Pod';

    const name = `${asset} ${descriptor}`;

    clusters.push({
      id: `pod-${asset.toLowerCase()}-${dominantSide.toLowerCase()}`,
      name,
      asset,
      dominantSide,
      memberCount: members.length,
      totalPodExposure,
      longNotional,
      shortNotional,
      concordanceScore,
      avgLeverage,
      members: sortedMembers,
    });
  }

  // Sort pods by total exposure descending
  return clusters.sort((a, b) => b.totalPodExposure - a.totalPodExposure);
}
