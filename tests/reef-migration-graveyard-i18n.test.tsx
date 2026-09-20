import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ReefMatrix } from '../src/components/reef/ReefMatrix';
import { MigrationFlow } from '../src/components/migration/MigrationFlow';
import { GraveyardTable } from '../src/components/graveyard/GraveyardTable';
import { ReefBarrier } from '../src/analytics/reef-engine';
import { AssetMigrationFlow } from '../src/analytics/migration-engine';
import { GraveyardCasualty } from '../src/analytics/graveyard-engine';

const mockBarriers: ReefBarrier[] = [
  {
    asset: 'BTC',
    markPrice: 65000,
    openInterest: 1_200_000_000,
    volume24h: 3_500_000_000,
    observedWhaleExposure: 450_000_000,
    whaleConcentrationRatio: 37.5,
    depthTier: 'DEEP_REEF',
    barrierHealth: 'ROBUST',
    liquidityScore: 95,
  },
];

const mockFlows: AssetMigrationFlow[] = [
  {
    asset: 'BTC',
    netFlowNotional: 25_000_000,
    inflowNotional: 40_000_000,
    outflowNotional: 15_000_000,
    activeWhalesCount: 12,
    eventCount: 45,
    dominantTrend: 'ACCUMULATING',
    inflowVelocityPct: 15.2,
  },
];

const mockCasualties: GraveyardCasualty[] = [
  {
    walletAddress: '0x1111111111111111111111111111111111111111',
    whaleClass: 'Humpback',
    asset: 'BTC',
    side: 'LONG',
    notionalExposure: 10_000_000,
    unrealizedPnl: -1_500_000,
    pnlPercentage: -15.0,
    liquidationPrice: 58000,
    mortalityRisk: 'CRITICAL_RISK',
    marginStressRatio: 88,
  },
];

describe('Reef, Migration, and Graveyard i18n', () => {
  it('renders ReefMatrix in Turkish by default and in English when requested', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <ReefMatrix initialBarriers={mockBarriers} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('LİKİDİTE RESİFLERİ');
    expect(trHtml).toContain('Toplam Okyanus Yoğunluğu (OI):');
    expect(trHtml).toContain('Derin Resifler (≥$1B):');
    expect(trHtml).toContain('Tüm Resifler');
    expect(trHtml).toContain('DERİN RESİF (≥$1B)');
    expect(trHtml).toContain('GÜÇLÜ');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <ReefMatrix initialBarriers={mockBarriers} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('LIQUIDITY REEF');
    expect(enHtml).toContain('Total Ocean Density (OI):');
    expect(enHtml).toContain('Deep Reefs (≥$1B):');
    expect(enHtml).toContain('All Reefs');
    expect(enHtml).toContain('DEEP REEF (≥$1B)');
    expect(enHtml).toContain('ROBUST');
  });

  it('renders MigrationFlow in Turkish by default and in English when requested', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <MigrationFlow initialFlows={mockFlows} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('SERMAYE GÖÇÜ');
    expect(trHtml).toContain('Brüt Giriş:');
    expect(trHtml).toContain('Brüt Çıkış:');
    expect(trHtml).toContain('Tüm Akışlar');
    expect(trHtml).toContain('BİRİKTİRME');
    expect(trHtml).toContain('NET SERMAYE GİRİŞİ');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <MigrationFlow initialFlows={mockFlows} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('CAPITAL MIGRATION');
    expect(enHtml).toContain('Gross Inflow:');
    expect(enHtml).toContain('Gross Outflow:');
    expect(enHtml).toContain('All Flows');
    expect(enHtml).toContain('ACCUMULATING');
    expect(enHtml).toContain('NET CAPITAL INFLOW');
  });

  it('renders GraveyardTable in Turkish by default and in English when requested', () => {
    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <GraveyardTable initialCasualties={mockCasualties} />
      </LanguageProvider>
    );

    expect(trHtml).toContain('TASFİYE MEZARLIĞI');
    expect(trHtml).toContain('Kümülatif Su Altı Zararı:');
    expect(trHtml).toContain('Kritik Kayıplar (≤-$1M):');
    expect(trHtml).toContain('Tüm Kayıplar');
    expect(trHtml).toContain('KRİTİK RİSK');
    expect(trHtml).toContain('Batık Balina Adresi');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <GraveyardTable initialCasualties={mockCasualties} />
      </LanguageProvider>
    );

    expect(enHtml).toContain('LIQUIDATION GRAVEYARD');
    expect(enHtml).toContain('Cumulative Underwater Loss:');
    expect(enHtml).toContain('Critical Casualties (≤-$1M):');
    expect(enHtml).toContain('All Casualties');
    expect(enHtml).toContain('CRITICAL RISK');
    expect(enHtml).toContain('Distressed Whale Address');
  });
});
