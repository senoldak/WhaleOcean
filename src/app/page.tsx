import React from 'react';
import {
  getMarketsData,
  getWhalesData,
  getOceanConditionsData,
  getWhatChangedData,
} from '@/services/app-service';
import { HyperliquidInfoClient } from '@/collector/hyperliquid-info';
import { OceanConditionMeter } from '@/components/ocean/OceanConditionMeter';
import { WhaleExposureCard } from '@/components/ocean/WhaleExposureCard';
import { OceanDensityCard } from '@/components/ocean/OceanDensityCard';
import { WaterPressureCard } from '@/components/ocean/WaterPressureCard';
import { WhatChangedFeed } from '@/components/ocean/WhatChangedFeed';
import { MarketChart } from '@/components/ocean/MarketChart';
import { OceanDeckHeader } from '@/components/ocean/OceanDeckHeader';
import { ShieldAlert, Compass } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OceanPage() {
  const [marketsData, whalesData, oceanCondition, whatChanged, btcCandles] = await Promise.all([
    getMarketsData(),
    getWhalesData(),
    getOceanConditionsData(),
    getWhatChangedData(),
    new HyperliquidInfoClient().getCandles('BTC', '1h').catch(() => []),
  ]);

  const snapshots = marketsData.snapshots;
  const wallets = whalesData.wallets;

  // Calculate aggregates from verified data
  const totalExposure = wallets.reduce((acc, w) => acc + (w.totalObservedExposure || 0), 0);
  const totalOpenInterest = snapshots.reduce((acc, s) => acc + (s.openInterest || 0), 0);
  const avgFunding =
    snapshots.length > 0
      ? snapshots.reduce((acc, s) => acc + s.fundingRate, 0) / snapshots.length
      : 0;

  // Find top asset by OI
  const topOiMarket = [...snapshots].sort((a, b) => b.openInterest - a.openInterest)[0];

  // Find highest funding asset
  const highestFundingMarket = [...snapshots].sort(
    (a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate)
  )[0];

  // Find largest observed position among tracked whales
  let largestPosNotional = 0;
  let largestPosAsset = '';
  for (const w of wallets) {
    for (const p of w.positions || []) {
      const notional = p.size * p.entryPrice;
      if (notional > largestPosNotional) {
        largestPosNotional = notional;
        largestPosAsset = p.asset;
      }
    }
  }

  // BTC snapshot for chart
  const btcSnapshot = snapshots.find((s) => s.asset === 'BTC');

  return (
    <div className="space-y-6">
      {/* Hero Statement */}
      <OceanDeckHeader walletCount={wallets.length} marketCount={snapshots.length} />

      {/* Ocean Conditions Environmental Meter */}
      <OceanConditionMeter condition={oceanCondition} />

      {/* Key Metric Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WhaleExposureCard
          totalExposure={totalExposure}
          trackedCount={wallets.length}
          largestPositionNotional={largestPosNotional > 0 ? largestPosNotional : undefined}
          largestPositionAsset={largestPosAsset || undefined}
        />
        <OceanDensityCard
          totalOpenInterest={totalOpenInterest}
          topMarketAsset={topOiMarket?.asset}
          topMarketOi={topOiMarket?.openInterest}
        />
        <WaterPressureCard
          averageFundingRate={avgFunding}
          highestFundingAsset={highestFundingMarket?.asset}
          highestFundingRate={highestFundingMarket?.fundingRate}
        />
      </div>

      {/* Primary Chart & What Changed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarketChart
            asset={btcSnapshot?.asset || 'BTC'}
            currentPrice={btcSnapshot?.markPrice}
            initialCandles={btcCandles}
          />
        </div>
        <div className="lg:col-span-1">
          <WhatChangedFeed events={whatChanged} />
        </div>
      </div>
    </div>
  );
}
