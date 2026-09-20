import { PositionEvent } from '../db/repository';

export interface AssetMigrationFlow {
  asset: string;
  inflowNotional: number;
  outflowNotional: number;
  netFlowNotional: number;
  eventCount: number;
  dominantTrend: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL';
  activeWhalesCount: number;
}

export function calculateMigrationFlows(events: PositionEvent[]): AssetMigrationFlow[] {
  const assetMap = new Map<
    string,
    {
      inflow: number;
      outflow: number;
      events: number;
      wallets: Set<string>;
    }
  >();

  for (const e of events) {
    if (!assetMap.has(e.asset)) {
      assetMap.set(e.asset, {
        inflow: 0,
        outflow: 0,
        events: 0,
        wallets: new Set(),
      });
    }

    const entry = assetMap.get(e.asset)!;
    entry.events++;
    entry.wallets.add(e.walletAddress);

    const delta = Math.abs(e.deltaNotional);
    if (e.eventType === 'OPEN' || e.eventType === 'INCREASE') {
      entry.inflow += delta;
    } else if (e.eventType === 'CLOSE' || e.eventType === 'DECREASE') {
      entry.outflow += delta;
    } else if (e.eventType === 'FLIP') {
      // Flip counts as outflow of previous position + inflow of new position
      const totalSize = e.prevSize + e.newSize;
      if (totalSize > 0) {
        entry.outflow += delta * (e.prevSize / totalSize);
        entry.inflow += delta * (e.newSize / totalSize);
      } else {
        entry.inflow += delta / 2;
        entry.outflow += delta / 2;
      }
    }
  }

  const flows: AssetMigrationFlow[] = [];

  for (const [asset, data] of assetMap.entries()) {
    const netFlow = data.inflow - data.outflow;
    let dominantTrend: AssetMigrationFlow['dominantTrend'] = 'NEUTRAL';

    if (netFlow > 100_000) {
      dominantTrend = 'ACCUMULATING';
    } else if (netFlow < -100_000) {
      dominantTrend = 'DISTRIBUTING';
    }

    flows.push({
      asset,
      inflowNotional: data.inflow,
      outflowNotional: data.outflow,
      netFlowNotional: netFlow,
      eventCount: data.events,
      dominantTrend,
      activeWhalesCount: data.wallets.size,
    });
  }

  // Sort by absolute net flow descending
  return flows.sort((a, b) => Math.abs(b.netFlowNotional) - Math.abs(a.netFlowNotional));
}
