import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OceanConditionMeter } from '../src/components/ocean/OceanConditionMeter';
import { WhaleExposureCard } from '../src/components/ocean/WhaleExposureCard';
import { OceanDensityCard } from '../src/components/ocean/OceanDensityCard';
import { WaterPressureCard } from '../src/components/ocean/WaterPressureCard';
import { OceanDeckHeader } from '../src/components/ocean/OceanDeckHeader';
import { WhatChangedFeed } from '../src/components/ocean/WhatChangedFeed';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { OceanConditionMeasurement, WhatChangedEvent } from '../src/types/contracts';

describe('Ocean View Components', () => {
  it('should render waiting state in OceanConditionMeter when condition is null in Turkish default', () => {
    const html = renderToStaticMarkup(<OceanConditionMeter condition={null} />);
    expect(html).toContain('DOĞRULANMIŞ CANLI VERİ BEKLENİYOR');
  });

  it('should render active classification in OceanConditionMeter in Turkish default', () => {
    const condition: OceanConditionMeasurement = {
      timestamp: Date.now(),
      classification: 'ACTIVE',
      volatilityScore: 35.5,
      oiChangePercent: 4.2,
      fundingStressScore: 22.0,
      whaleExposureDelta: 1200000,
      underlyingMetrics: {
        realizedVol1h: 0.85,
        oiDelta24h: 15000000,
        avgAbsFunding: 0.0001,
        netWhaleDelta1h: 1200000,
      },
    };

    const html = renderToStaticMarkup(<OceanConditionMeter condition={condition} />);
    expect(html).toContain('AKTİF');
    expect(html).toContain('35.5');
  });

  it('should render WhaleExposureCard with formatted notional and disclaimers in Turkish default', () => {
    const html = renderToStaticMarkup(
      <WhaleExposureCard
        totalExposure={25_500_000}
        trackedCount={14}
        largestPositionNotional={8_200_000}
        largestPositionAsset="BTC"
      />
    );

    expect(html).toContain('25.50M');
    expect(html).toContain('14');
    expect(html).toContain('BTC');
    expect(html).toContain('Asla %100 piyasa kapsamı iddia etmez');
  });

  it('should render WhatChangedFeed with deterministic events in Turkish default', () => {
    const events: WhatChangedEvent[] = [
      {
        id: 'wc-1',
        timestamp: Date.now(),
        category: 'POSITION',
        asset: 'ETH',
        statement: 'Observed wallet 0x1234...5678 increased exposure by $2.5M in ETH.',
        deltaValue: 2500000,
        timeWindowMinutes: 10,
        source: 'verified_delta:position_events',
      },
    ];

    const html = renderToStaticMarkup(<WhatChangedFeed events={events} />);
    expect(html).toContain('increased exposure by $2.5M in ETH');
    expect(html).toContain('Tamamen nesnel');
  });

  it('should render OceanDeckHeader, Density, and Water Pressure cards in Turkish and English', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <OceanDeckHeader walletCount={50} marketCount={10} />
        <OceanDensityCard totalOpenInterest={100_000_000} topMarketAsset="BTC" topMarketOi={50_000_000} />
        <WaterPressureCard averageFundingRate={0.0001} highestFundingAsset="SOL" highestFundingRate={0.0005} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('Okyanus Komuta Güvertesi');
    expect(trHtml).toContain('Gözlem Evreni:');
    expect(trHtml).toContain('Okyanus Yoğunluğu');
    expect(trHtml).toContain('Su Basıncı (Fonlama Oranı)');
    expect(trHtml).toContain('Yıllıklandırılmış:');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <OceanDeckHeader walletCount={50} marketCount={10} />
        <OceanDensityCard totalOpenInterest={100_000_000} topMarketAsset="BTC" topMarketOi={50_000_000} />
        <WaterPressureCard averageFundingRate={0.0001} highestFundingAsset="SOL" highestFundingRate={0.0005} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('Ocean Command Deck');
    expect(enHtml).toContain('Observed Universe:');
    expect(enHtml).toContain('Ocean Density');
    expect(enHtml).toContain('Water Pressure (Funding Rate)');
    expect(enHtml).toContain('Annualized:');
  });
});
