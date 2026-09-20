import React from 'react';
import { getMarketsData } from '@/services/app-service';
import { MarketTable } from '@/components/markets/MarketTable';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  const data = await getMarketsData();
  const snapshots = data.snapshots;

  return (
    <div className="space-y-6">
      <MarketTable initialSnapshots={snapshots} />
    </div>
  );
}
