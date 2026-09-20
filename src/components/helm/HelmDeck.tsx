'use client';

import React, { useState, useEffect } from 'react';
import { PaperPortfolio, PaperPosition, PaperTrade, PaperSubscription, VerifiedMarketSnapshot } from '@/types/contracts';
import { PortfolioSummary } from './PortfolioSummary';
import { CopiedWhalesBar } from './CopiedWhalesBar';
import { ManualOrderTicket } from './ManualOrderTicket';
import { LivePositionsTable } from './LivePositionsTable';
import { TradeHistoryTable } from './TradeHistoryTable';
import { Compass, Ship, ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface HelmDeckProps {
  initialPortfolio: PaperPortfolio;
  initialPositions: PaperPosition[];
  initialTrades: PaperTrade[];
  initialSubscriptions: PaperSubscription[];
  initialEquity: number;
  initialUnrealizedPnl: number;
  snapshots: VerifiedMarketSnapshot[];
}

export function HelmDeck({
  initialPortfolio,
  initialPositions,
  initialTrades,
  initialSubscriptions,
  initialEquity,
  initialUnrealizedPnl,
  snapshots,
}: HelmDeckProps) {
  const { t } = useTranslation();
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [positions, setPositions] = useState(initialPositions);
  const [trades, setTrades] = useState(initialTrades);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [equity, setEquity] = useState(initialEquity);
  const [unrealizedPnl, setUnrealizedPnl] = useState(initialUnrealizedPnl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingId, setIsClosingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to refresh state from API
  const refreshPortfolio = async () => {
    try {
      const res = await fetch('/api/paper/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data.portfolio);
        setPositions(data.positions);
        setTrades(data.trades);
        setSubscriptions(data.subscriptions);
        setEquity(data.equity);
        setUnrealizedPnl(data.unrealizedPnl);
      }
    } catch {}
  };

  // Auto-refresh interval every 4 seconds
  useEffect(() => {
    const interval = setInterval(refreshPortfolio, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderSubmit = async (orderData: any) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/paper/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          ...orderData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      await refreshPortfolio();
    } catch (err: any) {
      setError(err.message || 'Error submitting order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePosition = async (positionId: string) => {
    setIsClosingId(positionId);
    setError(null);
    try {
      const res = await fetch('/api/paper/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          positionId,
          reason: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close position');
      await refreshPortfolio();
    } catch (err: any) {
      setError(err.message || 'Error closing position');
    } finally {
      setIsClosingId(null);
    }
  };

  const handleUnfollow = async (subscriptionId: string) => {
    try {
      const res = await fetch('/api/paper/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UNSUBSCRIBE',
          subscriptionId,
        }),
      });
      if (res.ok) {
        await refreshPortfolio();
      }
    } catch {}
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/paper/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialBalance: 100000 }),
      });
      if (res.ok) {
        await refreshPortfolio();
      }
    } catch {}
  };

  const btcPrice = snapshots.find((s) => s.asset === 'BTC')?.markPrice || 90000;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Ship className="w-6 h-6 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.helm.deckTitle}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.helm.deckSubtitle}
          </p>
        </div>

        <div className="text-xs font-mono text-ocean-muted">
          <span>{t.helm.activePositions} </span>
          <strong className="text-ocean-cyan font-bold">{positions.length}</strong>
          <span className="mx-2">&bull;</span>
          <span>{t.helm.copiedWhalesCount} </span>
          <strong className="text-emerald-400 font-bold">{subscriptions.length}</strong>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Portfolio Summary Ribbon */}
      <PortfolioSummary
        totalEquity={equity}
        cashBalance={portfolio.cashBalance}
        marginUsed={portfolio.marginUsed}
        realizedPnl={portfolio.realizedPnl}
        unrealizedPnl={unrealizedPnl}
        onReset={handleReset}
      />

      {/* Copied Whales Bar */}
      <CopiedWhalesBar
        subscriptions={subscriptions}
        onUnfollow={handleUnfollow}
      />

      {/* Two Column Workspace: Order Ticket on Left, Positions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4">
          <ManualOrderTicket
            currentPrice={btcPrice}
            selectedAsset="BTC"
            onOrderSubmit={handleOrderSubmit}
            isSubmitting={isSubmitting}
          />
        </div>

        <div className="lg:col-span-8 space-y-6">
          <LivePositionsTable
            positions={positions}
            onClosePosition={handleClosePosition}
            isClosingId={isClosingId}
          />

          <TradeHistoryTable trades={trades} />
        </div>
      </div>
    </div>
  );
}
