import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WhaleTable } from '../src/components/whales/WhaleTable';
import { WhaleTrailsTimeline } from '../src/components/whales/WhaleTrailsTimeline';
import { MarketTable } from '../src/components/markets/MarketTable';
import { PositionEvent } from '../src/db/repository';
import { VerifiedMarketSnapshot } from '../src/types/contracts';
import { LanguageProvider } from '../src/i18n/LanguageContext';

describe('Whales and Markets View Components', () => {
  it('should render WhaleTable with initial observed wallets in Turkish default and English', () => {
    const wallets = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        whaleClass: 'ORCA',
        totalObservedExposure: 12500000,
        firstObservedAt: Date.now() - 86400000,
        lastObservedAt: Date.now(),
        positions: [
          {
            asset: 'BTC',
            side: 'LONG',
            size: 100,
            entryPrice: 94000,
            liquidationPrice: 75000,
            leverage: 10,
            unrealizedPnl: 150000,
          },
        ],
      },
    ];

    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <WhaleTable initialWallets={wallets} />
      </LanguageProvider>
    );
    expect(trHtml).toContain('0x123456');
    expect(trHtml).toContain('ORCA');
    expect(trHtml).toContain('12.50M');
    expect(trHtml).toContain('1 piyasa');
    expect(trHtml).toContain('Balina Evreni');
    expect(trHtml).toContain('Gözlemlenen Kümülatif Pozisyon:');
    expect(trHtml).toContain('İncele');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <WhaleTable initialWallets={wallets} />
      </LanguageProvider>
    );
    expect(enHtml).toContain('1 markets');
    expect(enHtml).toContain('Whale Universe');
    expect(enHtml).toContain('Observed Aggregate Exposure:');
    expect(enHtml).toContain('Inspect');
  });

  it('should render WhaleTrailsTimeline with position events in Turkish and English', () => {
    const events: PositionEvent[] = [
      {
        walletAddress: '0x123',
        asset: 'SOL',
        eventType: 'INCREASE',
        prevSize: 500,
        newSize: 1000,
        deltaNotional: 125000,
        timestamp: Date.now(),
      },
    ];

    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <WhaleTrailsTimeline events={events} />
      </LanguageProvider>
    );
    expect(trHtml).toContain('SOL');
    expect(trHtml).toContain('INCREASE');
    expect(trHtml).toContain('125.0k');
    expect(trHtml).toContain('BALİNA İZLERİ');
    expect(trHtml).toContain('kayıtlı olay');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <WhaleTrailsTimeline events={events} />
      </LanguageProvider>
    );
    expect(enHtml).toContain('WHALE TRAILS');
    expect(enHtml).toContain('recorded events');
  });

  it('should render MarketTable with supported Hyperliquid markets in Turkish and English', () => {
    const snapshots: VerifiedMarketSnapshot[] = [
      {
        asset: 'BTC',
        markPrice: 94500,
        oraclePrice: 94490,
        openInterest: 180000000,
        fundingRate: 0.0001,
        volume24h: 750000000,
        observedTimestamp: Date.now(),
        source: 'hyperliquid:metaAndAssetCtxs',
      },
    ];

    const trHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="tr">
        <MarketTable initialSnapshots={snapshots} />
      </LanguageProvider>
    );
    expect(trHtml).toContain('BTC');
    expect(trHtml).toContain('94,500');
    expect(trHtml).toContain('180.00M');
    expect(trHtml).toContain('0.0100% / 1h');
    expect(trHtml).toContain('87.6% APR');
    expect(trHtml).toContain('Piyasa Matrisi');
    expect(trHtml).toContain('Toplam Okyanus Yoğunluğu (OI):');
    expect(trHtml).toContain('desteklenen piyasa');

    const enHtml = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <MarketTable initialSnapshots={snapshots} />
      </LanguageProvider>
    );
    expect(enHtml).toContain('Market Matrix');
    expect(enHtml).toContain('Total Ocean Density (OI):');
    expect(enHtml).toContain('supported markets');
  });
});
