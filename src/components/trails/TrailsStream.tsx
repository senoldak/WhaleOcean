'use client';

import React, { useState, useMemo } from 'react';
import { PositionEvent } from '@/db/repository';
import { WhaleProfileModal } from '@/components/whales/WhaleProfileModal';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';

interface TrailsStreamProps {
  initialEvents: PositionEvent[];
}

export function TrailsStream({ initialEvents }: TrailsStreamProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<PositionEvent[]>(initialEvents);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [minNotionalFilter, setMinNotionalFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProfileAddress, setActiveProfileAddress] = useState<string | null>(null);

  const totalNotionalMoved = events.reduce((acc, e) => acc + Math.abs(e.deltaNotional), 0);
  const flipCount = events.filter((e) => e.eventType === 'FLIP').length;
  const largeEvents = events.filter((e) => Math.abs(e.deltaNotional) >= 100_000).length;

  const eventTypes = ['ALL', 'OPEN', 'INCREASE', 'DECREASE', 'CLOSE', 'FLIP'];
  const notionalTiers = [
    { label: t.trails.allSizes, min: 0 },
    { label: t.trails.tier10k, min: 10_000 },
    { label: t.trails.tier100k, min: 100_000 },
    { label: t.trails.tier500k, min: 500_000 },
    { label: t.trails.tier1m, min: 1_000_000 },
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesType = selectedType === 'ALL' || e.eventType === selectedType;
      const matchesNotional = Math.abs(e.deltaNotional) >= minNotionalFilter;
      const matchesSearch =
        !searchQuery ||
        e.asset.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        e.walletAddress.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesType && matchesNotional && matchesSearch;
    });
  }, [events, selectedType, minNotionalFilter, searchQuery]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'OPEN':
      case 'INCREASE':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-ocean-green" />,
          label: type,
          className: 'text-ocean-green border-ocean-green/40 bg-emerald-950/40',
        };
      case 'DECREASE':
      case 'CLOSE':
        return {
          icon: <ArrowDownRight className="w-3.5 h-3.5 text-ocean-red" />,
          label: type,
          className: 'text-ocean-red border-ocean-red/40 bg-red-950/40',
        };
      case 'FLIP':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
          label: 'FLIP',
          className: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        };
      default:
        return {
          icon: <History className="w-3.5 h-3.5 text-ocean-cyan" />,
          label: type,
          className: 'text-ocean-cyan border-ocean-border bg-ocean-surface',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.trails.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.trails.subtitle}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div className="text-right">
            <span>{t.trails.deltaVolume} </span>
            <span className="text-ocean-cyan font-bold">${formatNotional(totalNotionalMoved)}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.trails.flips} </span>
            <span className="text-amber-400 font-bold">{flipCount}</span>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div className="text-right">
            <span>{t.trails.largeEvents} </span>
            <span className="text-ocean-green font-bold">{largeEvents}</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-xl bg-ocean-surface border border-ocean-border flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-muted" />
          <input
            type="text"
            placeholder={t.trails.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ocean-deep border border-ocean-border rounded-lg text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Event Type Filter */}
          <div className="flex items-center gap-1 bg-ocean-deep p-1 rounded-lg border border-ocean-border overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-ocean-muted ml-1 shrink-0" />
            {eventTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                  selectedType === type
                    ? 'bg-ocean-cyan text-ocean-abyss font-bold'
                    : 'text-ocean-muted hover:text-ocean-text'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Min Size Filter */}
          <div className="flex items-center gap-1 bg-ocean-deep p-1 rounded-lg border border-ocean-border overflow-x-auto">
            <DollarSign className="w-3.5 h-3.5 text-ocean-muted ml-1 shrink-0" />
            {notionalTiers.map((tier) => (
              <button
                key={tier.label}
                onClick={() => setMinNotionalFilter(tier.min)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                  minNotionalFilter === tier.min
                    ? 'bg-ocean-blue text-white font-bold'
                    : 'text-ocean-muted hover:text-ocean-text'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ocean-deep border-b border-ocean-border text-ocean-muted uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{t.trails.colTimestamp}</th>
                <th className="py-3 px-4">{t.trails.colAction}</th>
                <th className="py-3 px-4">{t.trails.colAsset}</th>
                <th className="py-3 px-4">{t.trails.colWallet}</th>
                <th className="py-3 px-4 text-right">{t.trails.colSizeDelta}</th>
                <th className="py-3 px-4 text-right">{t.trails.colNotionalImpact}</th>
                <th className="py-3 px-4 text-center">{t.whales.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ocean-muted">
                    {t.trails.noEventsFound}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const badge = getEventBadge(event.eventType);
                  const time = new Date(event.timestamp).toLocaleTimeString();
                  const date = new Date(event.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  });
                  const shortAddr = `${event.walletAddress.slice(0, 6)}...${event.walletAddress.slice(-4)}`;

                  return (
                    <tr
                      key={`trail-${event.walletAddress}-${event.timestamp}-${event.asset}-${event.eventType}`}
                      className="hover:bg-ocean-deep/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-ocean-muted whitespace-nowrap">
                        <span className="text-ocean-text font-medium">{time}</span>{' '}
                        <span className="text-[10px] text-ocean-muted/60">{date}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${badge.className}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-ocean-text whitespace-nowrap">
                        {event.asset}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setActiveProfileAddress(event.walletAddress)}
                          className="flex items-center gap-1.5 text-ocean-cyan hover:underline font-mono"
                          title={t.trails.openProfile}
                        >
                          {shortAddr}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right text-ocean-text whitespace-nowrap">
                        <span className="text-ocean-muted text-[10px] mr-1">
                          {event.prevSize.toFixed(3)} &rarr;
                        </span>
                        <span className="font-bold">{event.newSize.toFixed(3)}</span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-ocean-cyan">
                        ${formatNotional(Math.abs(event.deltaNotional))}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setActiveProfileAddress(event.walletAddress)}
                          className="px-2 py-1 rounded bg-ocean-deep border border-ocean-border hover:border-ocean-cyan text-[10px] text-ocean-muted hover:text-ocean-text transition-colors"
                        >
                          {t.trails.auditWallet}
                        </button>
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
