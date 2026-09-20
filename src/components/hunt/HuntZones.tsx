'use client';

import React, { useState, useMemo } from 'react';
import { LiquidationHuntZone } from '@/analytics/hunt-engine';
import { WhaleProfileModal } from '@/components/whales/WhaleProfileModal';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  Crosshair,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';

interface HuntZonesProps {
  initialZones: LiquidationHuntZone[];
}

export function HuntZones({ initialZones }: HuntZonesProps) {
  const { t } = useTranslation();
  const [zones, setZones] = useState<LiquidationHuntZone[]>(initialZones);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [activeProfileAddress, setActiveProfileAddress] = useState<string | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  const totalAtRisk = zones.reduce((acc, z) => acc + z.totalAtRiskExposure, 0);
  const criticalZones = zones.filter((z) => z.riskTier === 'CRITICAL').length;
  const elevatedZones = zones.filter((z) => z.riskTier === 'ELEVATED').length;

  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      const matchesTier = tierFilter === 'ALL' || z.riskTier === tierFilter;
      const matchesSearch =
        !searchQuery || z.asset.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesTier && matchesSearch;
    });
  }, [zones, tierFilter, searchQuery]);

  const getRiskBadge = (tier: LiquidationHuntZone['riskTier']) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          label: `${t.hunt.tierCritical} (≤5%)`,
          className: 'text-red-400 bg-red-950/60 border-red-500/50',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
        };
      case 'ELEVATED':
        return {
          label: `${t.hunt.tierElevated} (≤15%)`,
          className: 'text-amber-400 bg-amber-950/60 border-amber-500/50',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'MODERATE':
        return {
          label: `${t.hunt.tierModerate} (≤30%)`,
          className: 'text-yellow-300 bg-yellow-950/40 border-yellow-500/40',
          icon: <Crosshair className="w-3.5 h-3.5 text-yellow-300" />,
        };
      default:
        return {
          label: t.hunt.tierDistant,
          className: 'text-ocean-cyan bg-ocean-surface border-ocean-border',
          icon: <Crosshair className="w-3.5 h-3.5 text-ocean-cyan" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.hunt.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.hunt.subtitle}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div className="text-right">
            <span>{t.hunt.totalAtRisk} </span>
            <span className="text-ocean-cyan font-bold">${formatNotional(totalAtRisk)}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.hunt.criticalZones} </span>
            <span className="text-red-400 font-bold">{criticalZones}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.hunt.elevatedZones} </span>
            <span className="text-amber-400 font-bold">{elevatedZones}</span>
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
            placeholder={t.hunt.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'CRITICAL', 'ELEVATED', 'MODERATE'] as const).map((tier) => (
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
                ? t.hunt.tierAll
                : tier === 'CRITICAL'
                ? t.hunt.tierCritical
                : tier === 'ELEVATED'
                ? t.hunt.tierElevated
                : t.hunt.tierModerate}
            </button>
          ))}
        </div>
      </div>

      {/* Hunt Zones Grid */}
      {filteredZones.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-ocean-border bg-ocean-surface text-ocean-muted text-xs font-mono">
          {t.hunt.noZonesFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredZones.map((zone) => {
            const risk = getRiskBadge(zone.riskTier);
            const isExpanded = expandedAsset === zone.asset;

            return (
              <div
                key={`hunt-${zone.asset}`}
                className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden flex flex-col justify-between hover:border-ocean-cyan/40 transition-all shadow-md"
              >
                {/* Header */}
                <div className="p-5 border-b border-ocean-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-ocean-text">
                          {zone.asset}
                        </span>
                        <span className="text-xs font-mono text-ocean-muted">
                          ${zone.markPrice.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-ocean-muted mt-1 font-mono">
                        {zone.vulnerableWhalesCount} {t.hunt.vulnerableAccounts}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${risk.className}`}
                    >
                      {risk.icon}
                      {risk.label}
                    </span>
                  </div>

                  {/* Proximity Gauge */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-ocean-muted">{t.hunt.nearestGap}</span>
                      <span
                        className={
                          zone.riskTier === 'CRITICAL'
                            ? 'text-red-400 font-bold'
                            : zone.riskTier === 'ELEVATED'
                            ? 'text-amber-400 font-bold'
                            : 'text-ocean-cyan font-bold'
                        }
                      >
                        {zone.distanceToNearestLiqPct !== null
                          ? `${zone.distanceToNearestLiqPct}% ${t.hunt.away}`
                          : t.hunt.distant}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-ocean-deep rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          zone.riskTier === 'CRITICAL'
                            ? 'bg-red-500'
                            : zone.riskTier === 'ELEVATED'
                            ? 'bg-amber-400'
                            : 'bg-ocean-cyan'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(5, 100 - (zone.distanceToNearestLiqPct || 50)))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Exposure Breakdown */}
                <div className="p-5 space-y-3 bg-ocean-deep/30 flex-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ocean-muted">{t.hunt.totalAtRisk}</span>
                    <span className="text-ocean-cyan font-bold text-sm">
                      ${formatNotional(zone.totalAtRiskExposure)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ocean-muted">{t.hunt.longShortPools}</span>
                    <span className="text-ocean-text">
                      <span className="text-ocean-green font-bold">
                        ${formatNotional(zone.longLiquidationExposure)}
                      </span>{' '}
                      /{' '}
                      <span className="text-ocean-red font-bold">
                        ${formatNotional(zone.shortLiquidationExposure)}
                      </span>
                    </span>
                  </div>

                  {/* Liquidation Thresholds */}
                  <div className="pt-2 border-t border-ocean-border/40 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-ocean-deep/60 border border-ocean-border/40">
                      <span className="text-ocean-muted text-[10px] block">{t.hunt.longTrigger}</span>
                      <span className="text-ocean-green font-bold">
                        {zone.nearestLongLiqPrice
                          ? `$${zone.nearestLongLiqPrice.toLocaleString()}`
                          : (t.graveyard?.none || 'Yok')}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-ocean-deep/60 border border-ocean-border/40">
                      <span className="text-ocean-muted text-[10px] block">{t.hunt.shortTrigger}</span>
                      <span className="text-ocean-red font-bold">
                        {zone.nearestShortLiqPrice
                          ? `$${zone.nearestShortLiqPrice.toLocaleString()}`
                          : (t.graveyard?.none || 'Yok')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand / Inspect Vulnerable Whales */}
                <div className="p-3 border-t border-ocean-border/60 bg-ocean-surface">
                  <button
                    onClick={() => setExpandedAsset(isExpanded ? null : zone.asset)}
                    className="w-full py-1.5 px-3 rounded-lg bg-ocean-deep border border-ocean-border hover:border-ocean-cyan text-xs font-mono text-ocean-muted hover:text-ocean-text flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isExpanded
                      ? t.hunt.hidePositions
                      : `${t.hunt.inspectPositions} (${zone.vulnerablePositions.length})`}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Expanded Positions List */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-ocean-border/60 space-y-2 max-h-48 overflow-y-auto">
                      {zone.vulnerablePositions.map((pos) => (
                        <div
                          key={`hunt-pos-${pos.walletAddress}-${pos.liquidationPrice}`}
                          className="p-2 rounded bg-ocean-deep/60 border border-ocean-border/40 flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <button
                              onClick={() => setActiveProfileAddress(pos.walletAddress)}
                              className="text-ocean-cyan hover:underline font-bold text-[11px] flex items-center gap-1"
                            >
                              {pos.walletAddress.slice(0, 8)}...{pos.walletAddress.slice(-4)}
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </button>
                            <span className="text-[10px] text-ocean-muted">
                              Liq: ${pos.liquidationPrice.toLocaleString()} ({pos.distancePct}% away)
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-ocean-text font-bold block text-[11px]">
                              ${formatNotional(pos.notional)}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                pos.side === 'LONG' ? 'text-ocean-green' : 'text-ocean-red'
                              }`}
                            >
                              {pos.side} ({pos.leverage}x)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Whale Profile Modal */}
      <WhaleProfileModal
        address={activeProfileAddress}
        onClose={() => setActiveProfileAddress(null)}
      />
    </div>
  );
}
