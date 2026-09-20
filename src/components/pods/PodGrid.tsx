'use client';

import React, { useState, useMemo } from 'react';
import { PodCluster, PodMember } from '@/analytics/pods-cluster';
import { WhaleProfileModal } from '@/components/whales/WhaleProfileModal';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';

interface PodGridProps {
  initialPods: PodCluster[];
}

export function PodGrid({ initialPods }: PodGridProps) {
  const { t } = useTranslation();
  const [pods, setPods] = useState<PodCluster[]>(initialPods);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [activeProfileAddress, setActiveProfileAddress] = useState<string | null>(null);
  const [expandedPodId, setExpandedPodId] = useState<string | null>(null);

  const totalPodExposure = pods.reduce((acc, p) => acc + p.totalPodExposure, 0);
  const topPod = pods[0];

  const filteredPods = useMemo(() => {
    return pods.filter((pod) => {
      const matchesSide = sideFilter === 'ALL' || pod.dominantSide === sideFilter;
      const matchesSearch =
        !searchQuery ||
        pod.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        pod.asset.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesSide && matchesSearch;
    });
  }, [pods, sideFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.pods.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.pods.subtitle}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div className="text-right">
            <span>{t.pods.totalExposure} </span>
            <span className="text-ocean-cyan font-bold">${formatNotional(totalPodExposure)}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.pods.detectedPods} </span>
            <span className="text-ocean-text font-bold">{pods.length}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.pods.largestPod} </span>
            <span className="text-ocean-cyan font-bold">{topPod ? topPod.name : 'N/A'}</span>
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
            placeholder={t.pods.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Direction Filter */}
        <div className="flex items-center gap-1.5">
          {(['ALL', 'LONG', 'SHORT'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setSideFilter(side)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                sideFilter === side
                  ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                  : 'bg-ocean-deep border border-ocean-border text-ocean-muted hover:text-ocean-text'
              }`}
            >
              {side === 'ALL' ? t.pods.allDirections : side === 'LONG' ? t.pods.bullPods : t.pods.bearPods}
            </button>
          ))}
        </div>
      </div>

      {/* Pods Grid */}
      {filteredPods.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-ocean-border bg-ocean-surface text-ocean-muted text-xs font-mono">
          {t.pods.noPodsFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPods.map((pod) => {
            const isLong = pod.dominantSide === 'LONG';
            const isExpanded = expandedPodId === pod.id;

            return (
              <div
                key={pod.id}
                className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden flex flex-col justify-between hover:border-ocean-cyan/40 transition-all shadow-md shadow-ocean-abyss/40"
              >
                {/* Header */}
                <div className="p-5 border-b border-ocean-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-ocean-deep border border-ocean-border text-ocean-cyan">
                          {pod.asset}
                        </span>
                        <h3 className="font-bold text-sm text-ocean-text tracking-tight">
                          {pod.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-ocean-muted mt-1 font-mono">
                        {pod.memberCount} {t.pods.observedWhales} &bull; {t.pods.avgLeverage} {pod.avgLeverage}x
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isLong
                          ? 'text-ocean-green border-ocean-green/40 bg-emerald-950/40'
                          : 'text-ocean-red border-ocean-red/40 bg-red-950/40'
                      }`}
                    >
                      {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pod.dominantSide}
                    </span>
                  </div>

                  {/* Concordance / Consensus Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className="text-ocean-muted">{t.pods.concordance}</span>
                      <span className={isLong ? 'text-ocean-green font-bold' : 'text-ocean-red font-bold'}>
                        {pod.concordanceScore}% {pod.dominantSide}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-ocean-deep rounded-full overflow-hidden flex">
                      <div
                        className={isLong ? 'bg-ocean-green h-full' : 'bg-ocean-red h-full'}
                        style={{ width: `${pod.concordanceScore}%` }}
                      />
                      <div
                        className={isLong ? 'bg-ocean-red/40 h-full' : 'bg-ocean-green/40 h-full'}
                        style={{ width: `${100 - pod.concordanceScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="p-5 space-y-3 flex-1 bg-ocean-deep/30">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ocean-muted">{t.pods.collectiveExposure}</span>
                    <span className="text-ocean-cyan font-bold text-sm">
                      ${formatNotional(pod.totalPodExposure)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ocean-muted">{t.pods.breakdown}</span>
                    <span className="text-ocean-text">
                      <span className="text-ocean-green font-bold">
                        ${formatNotional(pod.longNotional)}
                      </span>{' '}
                      /{' '}
                      <span className="text-ocean-red font-bold">
                        ${formatNotional(pod.shortNotional)}
                      </span>
                    </span>
                  </div>

                  {/* Top Members Preview */}
                  <div className="pt-2 border-t border-ocean-border/40">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-ocean-muted block mb-1.5">
                      {t.pods.dominantWhales}
                    </span>
                    <div className="space-y-1.5">
                      {pod.members.slice(0, 3).map((member) => (
                        <div
                          key={member.address}
                          className="flex items-center justify-between text-xs font-mono"
                        >
                          <button
                            onClick={() => setActiveProfileAddress(member.address)}
                            className="text-ocean-cyan hover:underline text-[11px] flex items-center gap-1"
                          >
                            {member.address.slice(0, 6)}...{member.address.slice(-4)}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                          <span className="text-ocean-muted text-[11px]">
                            ${formatNotional(member.exposureInPodAsset)} ({member.side})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Expand Button */}
                <div className="p-3 border-t border-ocean-border/60 bg-ocean-surface">
                  <button
                    onClick={() => setExpandedPodId(isExpanded ? null : pod.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-ocean-deep border border-ocean-border hover:border-ocean-cyan text-xs font-mono text-ocean-muted hover:text-ocean-text flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isExpanded ? t.pods.hideMembers : `${t.pods.inspectMembers} (${pod.memberCount})`}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Expanded Members Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-ocean-border/60 space-y-2 max-h-48 overflow-y-auto">
                      {pod.members.map((member) => (
                        <div
                          key={`expanded-${member.address}`}
                          className="p-2 rounded bg-ocean-deep/60 border border-ocean-border/40 flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <button
                              onClick={() => setActiveProfileAddress(member.address)}
                              className="text-ocean-cyan hover:underline font-bold text-[11px] flex items-center gap-1"
                            >
                              {member.address.slice(0, 8)}...{member.address.slice(-4)}
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </button>
                            <span className="text-[10px] text-ocean-muted">
                              {member.whaleClass} &bull; {member.leverage}x
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-ocean-text font-bold block text-[11px]">
                              ${formatNotional(member.exposureInPodAsset)}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                member.side === 'LONG' ? 'text-ocean-green' : 'text-ocean-red'
                              }`}
                            >
                              {member.side}
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
