import { WhatChangedEvent, VerifiedMarketSnapshot } from '../types/contracts';
import { PositionEvent } from '../db/repository';

export function formatNotional(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${(val / 1_000).toFixed(1)}k`;
  }
  return val.toFixed(0);
}

export function generateWhatChangedFeed(
  currentSnapshots: VerifiedMarketSnapshot[],
  prevSnapshots: VerifiedMarketSnapshot[] = [],
  recentEvents: PositionEvent[] = []
): WhatChangedEvent[] {
  const items: WhatChangedEvent[] = [];
  const now = Date.now();

  // 1. Synthesize from large Position Events
  for (const event of recentEvents) {
    if (Math.abs(event.deltaNotional) >= 250_000) {
      const shortAddr = `${event.walletAddress.slice(0, 6)}...${event.walletAddress.slice(-4)}`;
      let actionText = 'increased exposure by';
      if (event.eventType === 'DECREASE' || event.eventType === 'CLOSE') {
        actionText = 'reduced exposure by';
      } else if (event.eventType === 'FLIP') {
        actionText = 'flipped directional position with';
      }

      const deltaFormatted = formatNotional(event.deltaNotional);
      const statement = `Observed wallet ${shortAddr} ${actionText} $${deltaFormatted} in ${event.asset}.`;

      items.push({
        id: `wc-pos-${event.timestamp}-${event.walletAddress}-${event.asset}`,
        timestamp: event.timestamp,
        category: 'POSITION',
        asset: event.asset,
        statement,
        deltaValue: event.deltaNotional,
        timeWindowMinutes: Math.max(1, Math.round((now - event.timestamp) / 60_000)),
        source: 'verified_delta:position_events',
      });
    }
  }

  // 2. Synthesize from Market Snapshots (OI or Price changes)
  const prevMap = new Map(prevSnapshots.map(s => [s.asset, s]));
  for (const curr of currentSnapshots) {
    const prev = prevMap.get(curr.asset);
    if (prev && prev.openInterest > 0) {
      const oiDelta = curr.openInterest - prev.openInterest;
      const oiChangePct = (oiDelta / prev.openInterest) * 100;

      if (Math.abs(oiChangePct) >= 5.0 && Math.abs(oiDelta) >= 1_000_000) {
        const sign = oiDelta > 0 ? '+' : '';
        const oiFormatted = formatNotional(oiDelta);
        const statement = `Ocean Density (OI) in ${curr.asset} shifted by ${sign}${oiChangePct.toFixed(1)}% (${sign}$${oiFormatted}).`;

        items.push({
          id: `wc-oi-${curr.observedTimestamp}-${curr.asset}`,
          timestamp: curr.observedTimestamp,
          category: 'EXPOSURE',
          asset: curr.asset,
          statement,
          deltaValue: oiDelta,
          timeWindowMinutes: 60,
          source: 'verified_delta:position_events',
        });
      }
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
}
