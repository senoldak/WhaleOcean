'use client';

import React, { useState, useMemo } from 'react';
import { VerifiedMarketSnapshot } from '@/types/contracts';
import { Search, ArrowUpDown, ShieldCheck, Layers } from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';

interface MarketTableProps {
  initialSnapshots: VerifiedMarketSnapshot[];
}

export function MarketTable({ initialSnapshots }: MarketTableProps) {
  const { t, language } = useTranslation();
  const [snapshots, setSnapshots] = useState<VerifiedMarketSnapshot[]>(initialSnapshots);
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<'openInterest' | 'volume24h' | 'fundingRate' | 'markPrice'>('openInterest');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredSnapshots = useMemo(() => {
    return snapshots
      .filter((s) => !search || s.asset.toLowerCase().includes(search.toLowerCase().trim()))
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [snapshots, search, sortField, sortAsc]);

  const totalOi = snapshots.reduce((acc, s) => acc + s.openInterest, 0);
  const totalVolume = snapshots.reduce((acc, s) => acc + s.volume24h, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text uppercase">
              {t.markets.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.markets.subtitle}
          </p>
        </div>

        <div className="text-right text-xs font-mono text-ocean-muted">
          <span>{t.markets.totalDensity} </span>
          <span className="text-ocean-cyan font-bold">${formatNotional(totalOi)}</span>
          <span className="mx-2">&bull;</span>
          <span>{t.markets.volume24h} </span>
          <span className="text-ocean-text font-bold">${formatNotional(totalVolume)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-xl bg-ocean-surface border border-ocean-border flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-muted" />
          <input
            type="text"
            placeholder={t.markets.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        <div className="text-xs font-mono text-ocean-muted hidden sm:block">
          {filteredSnapshots.length} {t.markets.supportedMarkets}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ocean-deep border-b border-ocean-border text-ocean-muted text-[11px]">
              <tr>
                <th className="p-3">{t.markets.colAsset}</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort('markPrice')}>
                  <div className="flex items-center gap-1 hover:text-ocean-text">
                    {t.markets.colMarkPrice} <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3">{t.markets.colOraclePrice}</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort('openInterest')}>
                  <div className="flex items-center gap-1 hover:text-ocean-text">
                    {t.markets.colOpenInterest} <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort('fundingRate')}>
                  <div className="flex items-center gap-1 hover:text-ocean-text">
                    {t.markets.colFundingRate} <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort('volume24h')}>
                  <div className="flex items-center gap-1 hover:text-ocean-text">
                    {t.markets.colVolume} <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-right">{t.markets.source}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40 bg-ocean-surface/60">
              {filteredSnapshots.length > 0 ? (
                filteredSnapshots.map((snap) => {
                  const fundingPct1h = snap.fundingRate * 100;
                  const fundingApr = snap.fundingRate * 24 * 365 * 100;

                  return (
                    <tr key={snap.asset} className="hover:bg-ocean-hover transition-colors">
                      <td className="p-3 font-bold text-ocean-cyan">
                        {snap.asset}
                      </td>

                      <td className="p-3 font-bold text-ocean-text">
                        ${snap.markPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 4 })}
                      </td>

                      <td className="p-3 text-ocean-muted">
                        ${snap.oraclePrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 4 })}
                      </td>

                      <td className="p-3 font-bold text-ocean-text">
                        ${formatNotional(snap.openInterest)}
                      </td>

                      <td className="p-3">
                        <span
                          className={`font-mono font-bold ${
                            snap.fundingRate >= 0 ? 'text-ocean-green' : 'text-ocean-red'
                          }`}
                        >
                          {snap.fundingRate >= 0 ? '+' : ''}
                          {fundingPct1h.toFixed(4)}% / 1h
                        </span>
                        <span className="text-[10px] text-ocean-muted ml-2">
                          ({fundingApr.toFixed(1)}% APR)
                        </span>
                      </td>

                      <td className="p-3 text-ocean-muted">
                        ${formatNotional(snap.volume24h)}
                      </td>

                      <td className="p-3 text-right text-[10px] text-ocean-muted/80">
                        metaAndAssetCtxs
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-ocean-muted">
                    {t.markets.noMarketsFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-ocean-border/60 bg-ocean-deep/40 flex items-center justify-between text-[11px] font-mono text-ocean-muted">
          <span>{t.markets.officialMetadata}</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-ocean-green" />
            {t.markets.zeroExternal}
          </span>
        </div>
      </div>
    </div>
  );
}
