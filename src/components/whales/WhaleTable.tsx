'use client';

import React, { useState, useMemo } from 'react';
import { WhaleClass, WHALE_TIER_THRESHOLDS } from '@/types/contracts';
import { WhaleProfileModal } from './WhaleProfileModal';
import { Search, Filter, ExternalLink, Waves, ShieldCheck, Star } from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';
import { useWatchlist } from '@/services/useWatchlist';

interface WhaleTableProps {
  initialWallets: any[];
}

export function WhaleTable({ initialWallets }: WhaleTableProps) {
  const { t, language } = useTranslation();
  const { isTracked, addWallet, removeWallet } = useWatchlist();
  const [wallets, setWallets] = useState<any[]>(initialWallets);
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProfileAddress, setActiveProfileAddress] = useState<string | null>(null);

  const tiers = ['ALL', ...Object.keys(WHALE_TIER_THRESHOLDS)];

  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      const matchesTier = selectedTier === 'ALL' || w.whaleClass === selectedTier;
      const matchesSearch =
        !searchQuery ||
        w.address.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesTier && matchesSearch;
    });
  }, [wallets, selectedTier, searchQuery]);

  const totalExposure = wallets.reduce((acc, w) => acc + (w.totalObservedExposure || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text uppercase">
              {t.whales.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.whales.subtitle}
          </p>
        </div>

        <div className="text-right text-xs font-mono text-ocean-muted">
          <span>{t.whales.observedAggregateExposure} </span>
          <span className="text-ocean-cyan font-bold">${(totalExposure / 1_000_000).toFixed(2)}M</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-xl bg-ocean-surface border border-ocean-border flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-muted" />
          <input
            type="text"
            placeholder={t.whales.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Tier Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-ocean-muted mr-1 shrink-0" />
          {tiers.map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors shrink-0 ${
                selectedTier === tier
                  ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                  : 'bg-ocean-deep border border-ocean-border text-ocean-muted hover:text-ocean-text'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ocean-deep border-b border-ocean-border text-ocean-muted text-[11px]">
              <tr>
                <th className="p-3">{t.whales.colAddress}</th>
                <th className="p-3">{t.whales.colTier}</th>
                <th className="p-3">{t.whales.colExposure}</th>
                <th className="p-3">{t.whales.colPositions}</th>
                <th className="p-3">{t.whales.colLargestPos}</th>
                <th className="p-3">{t.whales.colLastSeen}</th>
                <th className="p-3 text-right">{t.whales.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40 bg-ocean-surface/60">
              {filteredWallets.length > 0 ? (
                filteredWallets.map((wallet) => {
                  const largestPos = (wallet.positions || []).reduce(
                    (max: any, p: any) => {
                      const notional = p.size * p.entryPrice;
                      return notional > (max?.notional || 0) ? { ...p, notional } : max;
                    },
                    null
                  );

                  const inWatchlist = isTracked(wallet.address);

                  return (
                    <tr
                      key={wallet.address}
                      onClick={() => setActiveProfileAddress(wallet.address)}
                      className="hover:bg-ocean-hover cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-semibold text-ocean-cyan flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (inWatchlist) {
                              removeWallet(wallet.address);
                            } else {
                              addWallet(wallet.address, wallet.whaleClass);
                            }
                          }}
                          className="p-1 rounded hover:bg-ocean-deep transition-colors text-ocean-muted hover:text-amber-400"
                          title={inWatchlist ? t.watchlist.removeSuccess : t.watchlist.addSuccess}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              inWatchlist ? 'fill-amber-400 text-amber-400' : 'text-ocean-muted/60'
                            }`}
                          />
                        </button>
                        <Waves className="w-3.5 h-3.5 text-ocean-muted shrink-0" />
                        <span>{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-ocean-border bg-ocean-deep text-ocean-text">
                          {wallet.whaleClass}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-ocean-text">
                        ${formatNotional(wallet.totalObservedExposure || 0)}
                      </td>

                      <td className="p-3 text-ocean-muted">
                        {wallet.positions?.length || 0} {t.whales.marketsCount}
                      </td>

                      <td className="p-3 text-ocean-muted">
                        {largestPos ? (
                          <span>
                            <strong className="text-ocean-text">{largestPos.asset}</strong> (${formatNotional(largestPos.notional)})
                          </span>
                        ) : (
                          t.graveyard.none
                        )}
                      </td>

                      <td className="p-3 text-[11px] text-ocean-muted">
                        {new Date(wallet.lastObservedAt).toLocaleTimeString()}
                      </td>

                      <td className="p-3 text-right">
                        <span className="text-[11px] text-ocean-cyan hover:underline inline-flex items-center gap-1">
                          {t.whales.inspect} <ExternalLink className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-ocean-muted">
                    {language === 'tr' ? 'Seçilen filtrelere uyan gözlemlenen cüzdan bulunamadı.' : 'No observed wallets match the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-ocean-border/60 bg-ocean-deep/40 flex items-center justify-between text-[11px] font-mono text-ocean-muted">
          <span>{language === 'tr' ? `${filteredWallets.length} / ${wallets.length} cüzdan gösteriliyor` : `Showing ${filteredWallets.length} of ${wallets.length} observed wallets`}</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-ocean-green" />
            {language === 'tr' ? 'Doğrulanmış Hyperliquid takas odası verisi' : 'Verified Hyperliquid clearinghouse state'}
          </span>
        </div>
      </div>

      <WhaleProfileModal
        address={activeProfileAddress}
        onClose={() => setActiveProfileAddress(null)}
      />
    </div>
  );
}
