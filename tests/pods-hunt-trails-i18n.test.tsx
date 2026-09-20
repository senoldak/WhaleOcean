import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { PodGrid } from '../src/components/pods/PodGrid';
import { HuntZones } from '../src/components/hunt/HuntZones';
import { TrailsStream } from '../src/components/trails/TrailsStream';
import { PodCluster } from '../src/analytics/pods-cluster';
import { LiquidationHuntZone } from '../src/analytics/hunt-engine';
import { PositionEvent } from '../src/db/repository';

const mockPods: PodCluster[] = [
  {
    id: 'pod-btc-1',
    name: 'BTC Apex Bull Pod',
    asset: 'BTC',
    dominantSide: 'LONG',
    memberCount: 5,
    totalPodExposure: 15_000_000,
    avgLeverage: 8.5,
    concordanceScore: 92,
    longNotional: 14_000_000,
    shortNotional: 1_000_000,
    members: [
      {
        address: '0x1111111111111111111111111111111111111111',
        whaleClass: 'Humpback',
        exposureInPodAsset: 5_000_000,
        side: 'LONG',
        leverage: 10,
      },
    ],
  },
];

const mockZones: LiquidationHuntZone[] = [
  {
    asset: 'BTC',
    markPrice: 65000,
    totalAtRiskExposure: 8_500_000,
    nearestLongLiqPrice: 62000,
    nearestShortLiqPrice: null,
    distanceToNearestLiqPct: 4.6,
    riskTier: 'CRITICAL',
    vulnerableWhalesCount: 3,
    longLiquidationExposure: 8_500_000,
    shortLiquidationExposure: 0,
    vulnerablePositions: [],
  },
];

const mockEvents: PositionEvent[] = [
  {
    id: 'evt-1',
    walletAddress: '0x1111111111111111111111111111111111111111',
    asset: 'BTC',
    timestamp: 1726830000000,
    prevSize: 10,
    newSize: 25,
    deltaNotional: 975000,
    eventType: 'INCREASE',
  },
];

describe('Pods, Hunt, and Trails i18n', () => {
  it('renders PodGrid in Turkish by default and in English when requested', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <PodGrid initialPods={mockPods} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('BALİNA SÜRÜLERİ');
    expect(trHtml).toContain('Toplam Kümelenmiş Pozisyon:');
    expect(trHtml).toContain('Tespit Edilen Sürü:');
    expect(trHtml).toContain('Tüm Yönler');
    expect(trHtml).toContain('Boğa Sürüleri (Long)');
    expect(trHtml).toContain('Ayı Sürüleri (Short)');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <PodGrid initialPods={mockPods} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('WHALE PODS');
    expect(enHtml).toContain('Total Clustered Exposure:');
    expect(enHtml).toContain('All Directions');
    expect(enHtml).toContain('Bull Pods (Long)');
    expect(enHtml).toContain('Bear Pods (Short)');
  });

  it('renders HuntZones in Turkish by default and in English when requested', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <HuntZones initialZones={mockZones} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('TASFİYE AVI');
    expect(trHtml).toContain('Toplam Risk Altındaki Pozisyon:');
    expect(trHtml).toContain('Kritik Av Bölgeleri');
    expect(trHtml).toContain('TÜMÜ');
    expect(trHtml).toContain('KRİTİK');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <HuntZones initialZones={mockZones} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('LIQUIDATION HUNT');
    expect(enHtml).toContain('Total At-Risk Exposure:');
    expect(enHtml).toContain('ALL');
    expect(enHtml).toContain('CRITICAL');
  });

  it('renders TrailsStream in Turkish by default and in English when requested', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <TrailsStream initialEvents={mockEvents} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('BALİNA İZLERİ');
    expect(trHtml).toContain('Gözlemlenen Delta Hacmi:');
    expect(trHtml).toContain('Yön Dönüşleri');
    expect(trHtml).toContain('Zaman Damgası');
    expect(trHtml).toContain('Nominal Etki');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <TrailsStream initialEvents={mockEvents} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('WHALE TRAILS');
    expect(enHtml).toContain('Observed Delta Volume:');
    expect(enHtml).toContain('Timestamp');
    expect(enHtml).toContain('Notional Impact');
  });
});
