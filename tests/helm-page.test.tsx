import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioSummary } from '../src/components/helm/PortfolioSummary';
import { ManualOrderTicket } from '../src/components/helm/ManualOrderTicket';
import { LivePositionsTable } from '../src/components/helm/LivePositionsTable';
import { CopiedWhalesBar } from '../src/components/helm/CopiedWhalesBar';
import { TradeHistoryTable } from '../src/components/helm/TradeHistoryTable';
import { PaperPosition, PaperTrade, PaperSubscription } from '../src/types/contracts';

describe('HELM Paper Trading Desk Components', () => {
  const mockPositions: PaperPosition[] = [
    {
      id: 'pos_1',
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG',
      size: 1.0,
      entryPrice: 90000,
      currentPrice: 92500,
      leverage: 5,
      marginUsed: 18000,
      unrealizedPnl: 2500,
      liquidationPrice: 73000,
      source: 'MANUAL',
      openedAt: Date.now() - 3600000,
      updatedAt: Date.now(),
    },
  ];

  const mockTrades: PaperTrade[] = [
    {
      id: 'tr_1',
      portfolioId: 'default',
      asset: 'ETH',
      side: 'LONG',
      size: 10,
      entryPrice: 3000,
      exitPrice: 3150,
      leverage: 3,
      realizedPnl: 1475,
      feePaid: 21,
      fundingPaid: 0,
      source: 'MANUAL',
      closeReason: 'TP',
      openedAt: Date.now() - 7200000,
      closedAt: Date.now() - 3600000,
    },
  ];

  const mockSubs: PaperSubscription[] = [
    {
      id: 'sub_1',
      portfolioId: 'default',
      walletAddress: '0x1234567890123456789012345678901234567890',
      allocatedUsd: 20000,
      multiplier: 1.0,
      maxDrawdownLimit: 0.15,
      isActive: true,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
    },
  ];

  it('should render PortfolioSummary with equity, cash, margin, and reset button in Turkish default', () => {
    const html = renderToStaticMarkup(
      <PortfolioSummary
        totalEquity={102500}
        cashBalance={82000}
        marginUsed={18000}
        realizedPnl={1475}
        unrealizedPnl={2500}
        onReset={() => {}}
      />
    );

    expect(html).toContain('Toplam Portföy Özkaynağı');
    expect(html).toContain('$102,500');
    expect(html).toContain('Sanal Nakit Bakiye');
    expect(html).toContain('$82,000');
    expect(html).toContain('Kullanılan Marjin');
    expect(html).toContain('$18,000');
    expect(html).toContain('Portföyü Sıfırla');
  });

  it('should render ManualOrderTicket with leverage slider, notional, and submit button in Turkish default', () => {
    const html = renderToStaticMarkup(
      <ManualOrderTicket
        currentPrice={91000}
        selectedAsset="BTC"
        onOrderSubmit={() => {}}
        isSubmitting={false}
      />
    );

    expect(html).toContain('Manuel Emir Bileti');
    expect(html).toContain('LONG');
    expect(html).toContain('SHORT');
    expect(html).toContain('Kaldıraç Oranı');
    expect(html).toContain('Sanal Emri İlet');
  });

  it('should render LivePositionsTable with active positions and close action in Turkish default', () => {
    const html = renderToStaticMarkup(
      <LivePositionsTable
        positions={mockPositions}
        onClosePosition={() => {}}
      />
    );

    expect(html).toContain('Açık Sanal Pozisyonlar (1)');
    expect(html).toContain('BTC');
    expect(html).toContain('LONG');
    expect(html).toContain('+$2,500.00');
    expect(html).toContain('Kapat');
  });

  it('should render CopiedWhalesBar with active subscriptions and unfollow action in Turkish default', () => {
    const html = renderToStaticMarkup(
      <CopiedWhalesBar
        subscriptions={mockSubs}
        onUnfollow={() => {}}
      />
    );

    expect(html).toContain('Aktif Kopyalanan Balinalar (1)');
    expect(html).toContain('0x1234...7890');
    expect(html).toContain('$20,000');
    expect(html).toContain('Kopyalamayı Durdur');
  });

  it('should render TradeHistoryTable with past trades in Turkish default', () => {
    const html = renderToStaticMarkup(
      <TradeHistoryTable trades={mockTrades} />
    );

    expect(html).toContain('Kapatılan İşlem Geçmişi (1)');
    expect(html).toContain('ETH');
    expect(html).toContain('+$1,475.00');
    expect(html).toContain('TP');
  });
});
