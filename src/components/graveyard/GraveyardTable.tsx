'use client';

import React, { useState, useMemo } from 'react';
import { GraveyardCasualty } from '@/analytics/graveyard-engine';
import { WhaleProfileModal } from '@/components/whales/WhaleProfileModal';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  Skull,
  AlertOctagon,
  AlertTriangle,
  Search,
  ExternalLink,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';

interface GraveyardTableProps {
  initialCasualties: GraveyardCasualty[];
}

export function GraveyardTable({ initialCasualties }: GraveyardTableProps) {
  const { t } = useTranslation();
  const [casualties, setCasualties] = useState<GraveyardCasualty[]>(initialCasualties);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [activeProfileAddress, setActiveProfileAddress] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'unrealizedPnl' | 'notionalExposure' | 'pnlPercentage'>('unrealizedPnl');
  const [sortAsc, setSortAsc] = useState<boolean>(true); // lowest PnL first

  const totalUnderwaterPnl = casualties.reduce((acc, c) => acc + c.unrealizedPnl, 0);
  const criticalCasualties = casualties.filter((c) => c.mortalityRisk === 'CRITICAL_RISK').length;
  const highDistressCasualties = casualties.filter((c) => c.mortalityRisk === 'HIGH_DISTRESS').length;

  const filteredCasualties = useMemo(() => {
    return casualties
      .filter((c) => {
        const matchesRisk = riskFilter === 'ALL' || c.mortalityRisk === riskFilter;
        const matchesSearch =
          !searchQuery ||
          c.asset.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          c.walletAddress.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchesRisk && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [casualties, riskFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getRiskBadge = (risk: GraveyardCasualty['mortalityRisk']) => {
    switch (risk) {
      case 'CRITICAL_RISK':
        return {
          label: t.graveyard.criticalBadge,
          className: 'text-red-400 bg-red-950/60 border-red-500/50',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-red-400" />,
        };
      case 'HIGH_DISTRESS':
        return {
          label: t.graveyard.highDistressBadge,
          className: 'text-amber-400 bg-amber-950/60 border-amber-500/50',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      default:
        return {
          label: t.graveyard.moderatePainBadge,
          className: 'text-yellow-300 bg-yellow-950/40 border-yellow-500/40',
          icon: <Skull className="w-3.5 h-3.5 text-yellow-300" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-ocean-red" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.graveyard.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.graveyard.subtitle}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div className="text-right">
            <span>{t.graveyard.cumulativeLoss} </span>
            <span className="text-ocean-red font-bold">
              -${formatNotional(Math.abs(totalUnderwaterPnl))}
            </span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.graveyard.criticalCasualties} </span>
            <span className="text-red-400 font-bold">{criticalCasualties}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.graveyard.highDistress} </span>
            <span className="text-amber-400 font-bold">{highDistressCasualties}</span>
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
            placeholder={t.graveyard.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'CRITICAL_RISK', 'HIGH_DISTRESS', 'MODERATE_PAIN'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setRiskFilter(risk)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
                riskFilter === risk
                  ? 'bg-ocean-red text-white font-bold shadow-sm'
                  : 'bg-ocean-deep border border-ocean-border text-ocean-muted hover:text-ocean-text'
              }`}
            >
              {risk === 'ALL'
                ? t.graveyard.allCasualties
                : risk === 'CRITICAL_RISK'
                ? t.graveyard.criticalRisk
                : risk === 'HIGH_DISTRESS'
                ? t.graveyard.highDistressFilter
                : t.graveyard.moderatePain}
            </button>
          ))}
        </div>
      </div>

      {/* Casualties Table */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ocean-deep border-b border-ocean-border text-ocean-muted uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{t.graveyard.colAddress}</th>
                <th className="py-3 px-4">{t.graveyard.colClass}</th>
                <th className="py-3 px-4">{t.graveyard.colAsset}</th>
                <th className="py-3 px-4">{t.graveyard.colSide}</th>
                <th
                  onClick={() => handleSort('unrealizedPnl')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-red transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.graveyard.unrealizedLoss}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('notionalExposure')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-ocean-cyan transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {t.graveyard.notionalExposure}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-right">{t.graveyard.liquidationPrice}</th>
                <th className="py-3 px-4 text-center">{t.graveyard.mortalityRisk}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40">
              {filteredCasualties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ocean-muted">
                    {t.graveyard.noCasualtiesFound}
                  </td>
                </tr>
              ) : (
                filteredCasualties.map((cas) => {
                  const risk = getRiskBadge(cas.mortalityRisk);
                  const shortAddr = `${cas.walletAddress.slice(0, 8)}...${cas.walletAddress.slice(-4)}`;

                  return (
                    <tr
                      key={`graveyard-${cas.walletAddress}-${cas.asset}`}
                      className="hover:bg-ocean-deep/60 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setActiveProfileAddress(cas.walletAddress)}
                          className="flex items-center gap-1.5 text-ocean-cyan hover:underline font-mono"
                          title={t.graveyard.auditProfile}
                        >
                          {shortAddr}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-ocean-text font-bold text-[11px]">
                        {cas.whaleClass}
                      </td>

                      <td className="py-3 px-4 font-bold text-ocean-cyan whitespace-nowrap">
                        {cas.asset}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            cas.side === 'LONG' ? 'text-ocean-green' : 'text-ocean-red'
                          }`}
                        >
                          {cas.side}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-red font-bold text-sm whitespace-nowrap">
                        -${formatNotional(Math.abs(cas.unrealizedPnl))}
                        <span className="text-[10px] text-ocean-red/70 block">
                          ({cas.pnlPercentage}%)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-text font-medium whitespace-nowrap">
                        ${formatNotional(cas.notionalExposure)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap text-ocean-muted">
                        {cas.liquidationPrice ? `$${cas.liquidationPrice.toLocaleString()}` : t.graveyard.none}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${risk.className}`}
                        >
                          {risk.icon}
                          {risk.label}
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

      {/* Whale Profile Modal */}
      <WhaleProfileModal
        address={activeProfileAddress}
        onClose={() => setActiveProfileAddress(null)}
      />
    </div>
  );
}
