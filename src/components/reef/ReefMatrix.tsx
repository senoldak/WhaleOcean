'use client';

import React, { useState, useMemo } from 'react';
import { ReefBarrier } from '@/analytics/reef-engine';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';

interface ReefMatrixProps {
  initialBarriers: ReefBarrier[];
}

export function ReefMatrix({ initialBarriers }: ReefMatrixProps) {
  const { t } = useTranslation();
  const [barriers, setBarriers] = useState<ReefBarrier[]>(initialBarriers);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'openInterest' | 'volume24h' | 'whaleConcentrationRatio' | 'liquidityScore'>('openInterest');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const totalOi = barriers.reduce((acc, b) => acc + b.openInterest, 0);
  const deepReefs = barriers.filter((b) => b.depthTier === 'DEEP_REEF').length;
  const fragileReefs = barriers.filter((b) => b.barrierHealth === 'FRAGILE').length;

  const filteredBarriers = useMemo(() => {
    return barriers
      .filter((b) => {
        const matchesTier = tierFilter === 'ALL' || b.depthTier === tierFilter;
        const matchesSearch =
          !searchQuery || b.asset.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchesTier && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [barriers, tierFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getTierBadge = (tier: ReefBarrier['depthTier']) => {
    switch (tier) {
      case 'DEEP_REEF':
        return {
          label: t.reef.deepReef,
          className: 'text-ocean-cyan bg-cyan-950/40 border-cyan-500/40',
        };
      case 'MID_REEF':
        return {
          label: t.reef.midReef,
          className: 'text-blue-300 bg-blue-950/40 border-blue-500/40',
        };
      default:
        return {
          label: t.reef.shallowReef,
          className: 'text-amber-300 bg-amber-950/40 border-amber-500/40',
        };
    }
  };

  const getHealthBadge = (health: ReefBarrier['barrierHealth']) => {
    switch (health) {
      case 'ROBUST':
        return {
          label: t.reef.robust,
          className: 'text-ocean-green border-ocean-green/40 bg-emerald-950/40',
        };
      case 'STABLE':
        return {
          label: t.reef.stable,
          className: 'text-ocean-cyan border-ocean-border bg-ocean-surface',
        };
      default:
        return {
          label: t.reef.fragile,
          className: 'text-ocean-red border-ocean-red/40 bg-red-950/40',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.reef.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.reef.subtitle}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div className="text-right">
            <span>{t.reef.totalDensity} </span>
            <span className="text-ocean-cyan font-bold">${formatNotional(totalOi)}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.reef.deepReefs} </span>
            <span className="text-ocean-cyan font-bold">{deepReefs}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.reef.fragileBarriers} </span>
            <span className="text-ocean-red font-bold">{fragileReefs}</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-xl bg-ocean-surface border border-ocean-border flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-muted" />
          <input
            type="text"
            placeholder={t.reef.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Depth Tier Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'DEEP_REEF', 'MID_REEF', 'SHALLOW_REEF'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
                tierFilter === tier
                  ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                  : 'bg-ocean-deep border border-ocean-border text-ocean-muted hover:text-ocean-text'
              }`}
            >
              {tier === 'ALL'
                ? t.reef.allReefs
                : tier === 'DEEP_REEF'
                ? t.reef.deepReef
                : tier === 'MID_REEF'
                ? t.reef.midReef
                : t.reef.shallowReef}
            </button>
          ))}
        </div>
      </div>

      {/* Reef Matrix Table */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ocean-deep border-b border-ocean-border text-ocean-muted uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{t.reef.colAsset}</th>
                <th className="py-3 px-4">{t.reef.colTier}</th>
                <th className="py-3 px-4 text-right">{t.reef.colMarkPrice}</th>
                <th
                  onClick={() => handleSort('openInterest')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.reef.colOi}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('volume24h')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.reef.colVolume}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-right">{t.reef.colWhaleExposure}</th>
                <th
                  onClick={() => handleSort('whaleConcentrationRatio')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.reef.colWhaleConcentration}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-center">{t.reef.colHealth}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40">
              {filteredBarriers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ocean-muted">
                    {t.reef.noBarriersFound}
                  </td>
                </tr>
              ) : (
                filteredBarriers.map((reef) => {
                  const tier = getTierBadge(reef.depthTier);
                  const health = getHealthBadge(reef.barrierHealth);

                  return (
                    <tr
                      key={`reef-${reef.asset}`}
                      className="hover:bg-ocean-deep/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-ocean-text whitespace-nowrap">
                        <span className="text-ocean-cyan">{reef.asset}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${tier.className}`}
                        >
                          {tier.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-text whitespace-nowrap font-medium">
                        ${reef.markPrice.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-cyan font-bold whitespace-nowrap">
                        ${formatNotional(reef.openInterest)}
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-text whitespace-nowrap">
                        ${formatNotional(reef.volume24h)}
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-text whitespace-nowrap">
                        ${formatNotional(reef.observedWhaleExposure)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            reef.whaleConcentrationRatio > 50
                              ? 'text-ocean-red'
                              : reef.whaleConcentrationRatio > 20
                              ? 'text-amber-400'
                              : 'text-ocean-green'
                          }`}
                        >
                          {reef.whaleConcentrationRatio}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${health.className}`}
                        >
                          {health.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
