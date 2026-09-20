import React from 'react';
import { getWhalesData } from '@/services/app-service';
import { WhaleTable } from '@/components/whales/WhaleTable';

export const dynamic = 'force-dynamic';

export default async function WhalesPage() {
  const data = await getWhalesData();
  const wallets = data.wallets;

  return (
    <div className="space-y-6">
      <WhaleTable initialWallets={wallets} />
    </div>
  );
}
