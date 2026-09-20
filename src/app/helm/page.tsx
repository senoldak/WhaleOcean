import React from 'react';
import { getPaperPortfolioState, getMarketsData } from '@/services/app-service';
import { HelmDeck } from '@/components/helm/HelmDeck';

export const dynamic = 'force-dynamic';

export default async function HelmPage() {
  const [portfolioState, marketsData] = await Promise.all([
    getPaperPortfolioState('default'),
    getMarketsData(),
  ]);

  return (
    <div className="space-y-6">
      <HelmDeck
        initialPortfolio={portfolioState.portfolio}
        initialPositions={portfolioState.positions}
        initialTrades={portfolioState.trades}
        initialSubscriptions={portfolioState.subscriptions}
        initialEquity={portfolioState.equity}
        initialUnrealizedPnl={portfolioState.unrealizedPnl}
        snapshots={marketsData.snapshots}
      />
    </div>
  );
}
