'use client';

import React, { useState, useMemo } from 'react';
import { AssetMigrationFlow } from '@/analytics/migration-engine';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';

interface MigrationFlowProps {
  initialFlows: AssetMigrationFlow[];
}

export function MigrationFlow({ initialFlows }: MigrationFlowProps) {
  const { t } = useTranslation();
  const [flows, setFlows] = useState<AssetMigrationFlow[]>(initialFlows);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trendFilter, setTrendFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'netFlowNotional' | 'inflowNotional' | 'outflowNotional' | 'eventCount'>('netFlowNotional');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const totalInflows = flows.reduce((acc, f) => acc + f.inflowNotional, 0);
  const totalOutflows = flows.reduce((acc, f) => acc + f.outflowNotional, 0);
  const accumulatingCount = flows.filter((f) => f.dominantTrend === 'ACCUMULATING').length;

  const filteredFlows = useMemo(() => {
    return flows
      .filter((f) => {
        const matchesTrend = trendFilter === 'ALL' || f.dominantTrend === trendFilter;
        const matchesSearch =
          !searchQuery || f.asset.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchesTrend && matchesSearch;
      })
      .sort((a, b) => {
        const valA = Math.abs(a[sortField]);
        const valB = Math.abs(b[sortField]);
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [flows, trendFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getTrendBadge = (trend: AssetMigrationFlow['dominantTrend'], netFlow: number) => {
    switch (trend) {
      case 'ACCUMULATING':
        return {
          label: t.migration.inflowLabel,
          className: 'text-ocean-green bg-emerald-950/40 border-ocean-green/40',
          icon: <TrendingUp className="w-3.5 h-3.5 text-ocean-green" />,
        };
      case 'DISTRIBUTING':
        return {
          label: t.migration.outflowLabel,
          className: 'text-ocean-red bg-red-950/40 border-ocean-red/40',
          icon: <TrendingDown className="w-3.5 h-3.5 text-ocean-red" />,
        };
      default:
        return {
          label: t.migration.balancedLabel,
          className: 'text-ocean-muted bg-ocean-surface border-ocean-border',
          icon: <Minus className="w-3.5 h-3.5 text-ocean-muted" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.migration.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.migration.subtitle}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div className="text-right">
            <span>{t.migration.grossInflow} </span>
            <span className="text-ocean-green font-bold">+${formatNotional(totalInflows)}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.migration.grossOutflow} </span>
            <span className="text-ocean-red font-bold">-${formatNotional(totalOutflows)}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.migration.accumulatingAssets} </span>
            <span className="text-ocean-cyan font-bold">{accumulatingCount}</span>
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
            placeholder={t.migration.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Trend Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'ACCUMULATING', 'DISTRIBUTING', 'NEUTRAL'] as const).map((trend) => (
            <button
              key={trend}
              onClick={() => setTrendFilter(trend)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
                trendFilter === trend
                  ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                  : 'bg-ocean-deep border border-ocean-border text-ocean-muted hover:text-ocean-text'
              }`}
            >
              {trend === 'ALL'
                ? t.migration.allFlows
                : trend === 'ACCUMULATING'
                ? t.migration.accumulating
                : trend === 'DISTRIBUTING'
                ? t.migration.distributing
                : t.migration.neutral}
            </button>
          ))}
        </div>
      </div>

      {/* Migration Flows Table */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ocean-deep border-b border-ocean-border text-ocean-muted uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{t.migration.colAsset}</th>
                <th className="py-3 px-4">{t.migration.colTrend}</th>
                <th
                  onClick={() => handleSort('netFlowNotional')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.migration.colNetFlow}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('inflowNotional')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.migration.colGrossInflow}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('outflowNotional')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.migration.colGrossOutflow}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-right">{t.migration.colActiveWhales}</th>
                <th className="py-3 px-4 text-right">{t.migration.colEventCount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40">
              {filteredFlows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ocean-muted">
                    {t.migration.noFlowsFound}
                  </td>
                </tr>
              ) : (
                filteredFlows.map((flow) => {
                  const trend = getTrendBadge(flow.dominantTrend, flow.netFlowNotional);
                  const isPositive = flow.netFlowNotional > 0;

                  return (
                    <tr
                      key={`flow-${flow.asset}`}
                      className="hover:bg-ocean-deep/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-ocean-text whitespace-nowrap">
                        <span className="text-ocean-cyan">{flow.asset}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${trend.className}`}
                        >
                          {trend.icon}
                          {trend.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isPositive
                              ? 'text-ocean-green'
                              : flow.netFlowNotional < 0
                              ? 'text-ocean-red'
                              : 'text-ocean-muted'
                          }`}
                        >
                          {isPositive ? '+' : ''}${formatNotional(flow.netFlowNotional)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-green font-bold whitespace-nowrap">
                        +${formatNotional(flow.inflowNotional)}
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-red font-bold whitespace-nowrap">
                        -${formatNotional(flow.outflowNotional)}
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-text whitespace-nowrap font-medium">
                        {flow.activeWhalesCount}
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-muted whitespace-nowrap">
                        {flow.eventCount}
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
