'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MultiHorizonWalletResult } from '@/analytics/backtest/multi-horizon-engine';
import { useTranslation } from '@/i18n';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Award,
  Zap,
  Flame,
  Plus,
  Star,
  Filter,
} from 'lucide-react';

interface MultiHorizonMatrixProps {
  initialResults?: MultiHorizonWalletResult[];
  onInspectWallet?: (address: string) => void;
}

type SortField = 'consistencyScore' | 'pnl1M' | 'pnl3M' | 'pnl6M' | 'sharpe3M' | 'maxDrawdown';

export function MultiHorizonMatrix({ initialResults, onInspectWallet }: MultiHorizonMatrixProps) {
  const { t } = useTranslation();
  const [results, setResults] = useState<MultiHorizonWalletResult[]>(initialResults || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialResults);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('consistencyScore');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const [limit, setLimit] = useState<number>(50);
  const [trackedOnly, setTrackedOnly] = useState<boolean>(false);
  const [customAddressInput, setCustomAddressInput] = useState<string>('');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  const fetchData = async (force = false, overrideOpts?: { limit?: number; customAddress?: string; trackedOnly?: boolean }) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const activeLimit = overrideOpts?.limit ?? limit;
      const activeTracked = overrideOpts?.trackedOnly ?? trackedOnly;
      const activeCustom = overrideOpts?.customAddress ?? (customAddressInput.trim() || undefined);

      const params = new URLSearchParams();
      params.set('limit', String(activeLimit));
      if (activeTracked) params.set('trackedOnly', 'true');
      if (activeCustom) params.set('customAddress', activeCustom);

      const endpoint = force
        ? '/api/backtest/multi-horizon/refresh'
        : `/api/backtest/multi-horizon?${params.toString()}`;

      const method = force ? 'POST' : 'GET';
      const body = force
        ? JSON.stringify({ limit: activeLimit, trackedOnly: activeTracked, customAddress: activeCustom })
        : undefined;

      const res = await fetch(endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });

      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else if (force) {
        const getRes = await fetch(`/api/backtest/multi-horizon?${params.toString()}`);
        const getData = await getRes.json();
        if (getData.results) setResults(getData.results);
      }
    } catch {
      // Fallback to initial
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsAddingCustom(false);
    }
  };

  useEffect(() => {
    if (!initialResults) {
      fetchData();
    }
  }, []);

  const handleCopy = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Filter and Sort
  const filteredAndSorted = useMemo(() => {
    let list = [...results];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r => r.address.toLowerCase().includes(q) || r.dominantAsset.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortField) {
        case 'consistencyScore':
          return b.consistencyScore - a.consistencyScore;
        case 'pnl1M':
          return b.metrics1M.totalReturnPct - a.metrics1M.totalReturnPct;
        case 'pnl3M':
          return b.metrics3M.totalReturnPct - a.metrics3M.totalReturnPct;
        case 'pnl6M':
          return b.metrics6M.totalReturnPct - a.metrics6M.totalReturnPct;
        case 'sharpe3M':
          return b.metrics3M.sharpeRatio - a.metrics3M.sharpeRatio;
        case 'maxDrawdown':
          return a.metrics3M.maxDrawdownPct - b.metrics3M.maxDrawdownPct; // lower DD is better
        default:
          return 0;
      }
    });

    return list;
  }, [results, searchQuery, sortField]);

  // Ribbon stats
  const topWhale = results.length > 0 ? results[0] : null;
  const avgSharpe =
    results.length > 0
      ? (results.reduce((acc, r) => acc + r.metrics3M.sharpeRatio, 0) / results.length).toFixed(2)
      : '0.00';
  const minMdd =
    results.length > 0
      ? Math.min(...results.map(r => r.metrics3M.maxDrawdownPct)).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ocean-border/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-text flex items-center gap-2">
            <Zap className="w-5 h-5 text-ocean-cyan" />
            {t.sonar.multiHorizonTitle}
          </h2>
          <p className="text-xs text-ocean-muted mt-0.5">
            {t.sonar.multiHorizonSubtitle}
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface hover:bg-ocean-surface/80 text-ocean-cyan text-xs font-mono transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t.sonar.refreshData}</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-ocean-border bg-ocean-surface/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-ocean-muted block">{t.sonar.bestConsistentWhale}</span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {topWhale ? `${topWhale.address.slice(0, 6)}...${topWhale.address.slice(-4)}` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-ocean-border bg-ocean-surface/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ocean-cyan/10 border border-ocean-cyan/20 flex items-center justify-center text-ocean-cyan">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-ocean-muted block">{t.sonar.avgSharpe3M}</span>
            <span className="text-sm font-mono font-bold text-ocean-text">{avgSharpe}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-ocean-border bg-ocean-surface/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-ocean-muted block">{t.sonar.minMaxDrawdown}</span>
            <span className="text-sm font-mono font-bold text-blue-400">%{minMdd}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-ocean-border bg-ocean-surface/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-ocean-muted block">{t.sonar.trackedWhalesCount}</span>
            <span className="text-sm font-mono font-bold text-ocean-text">{results.length}</span>
          </div>
        </div>
      </div>

      {/* Controls: Limits, Custom Wallet Add, Tracked Filter, Search, Sort */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-ocean-border bg-ocean-surface/30">
          {/* Group 1: Scope Limit Selector */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-ocean-muted">Kapsam:</span>
            <div className="flex rounded-lg border border-ocean-border overflow-hidden bg-ocean-surface">
              {[25, 50, 100, 250].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setLimit(val);
                    fetchData(false, { limit: val });
                  }}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    limit === val
                      ? 'bg-ocean-cyan text-ocean-abyss font-bold'
                      : 'text-ocean-muted hover:text-ocean-text'
                  }`}
                >
                  Top {val}
                </button>
              ))}
            </div>
          </div>

          {/* Group 2: Compass Tracked Only Toggle */}
          <button
            onClick={() => {
              const next = !trackedOnly;
              setTrackedOnly(next);
              fetchData(false, { trackedOnly: next });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              trackedOnly
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold'
                : 'bg-ocean-surface border-ocean-border text-ocean-muted hover:text-ocean-text'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${trackedOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Sadece Takip Edilenler (Pusula)</span>
          </button>

          {/* Group 3: Custom Wallet Add Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customAddressInput.trim()) {
                fetchData(false, { customAddress: customAddressInput.trim() });
              }
            }}
            className="flex items-center gap-1.5 flex-1 max-w-sm"
          >
            <input
              type="text"
              placeholder="Özel Cüzdan Ekle (0x...)"
              value={customAddressInput}
              onChange={(e) => setCustomAddressInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/60 text-ocean-text text-xs placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan font-mono"
            />
            <button
              type="submit"
              disabled={!customAddressInput.trim() || isAddingCustom}
              className="px-2.5 py-1.5 rounded-lg bg-ocean-cyan/20 border border-ocean-cyan/40 text-ocean-cyan hover:bg-ocean-cyan/30 text-xs font-mono font-bold flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
          </form>
        </div>

        {/* Secondary Bar: Search & Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-ocean-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cüzdan veya Varlık Ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/60 text-ocean-text text-xs placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan font-mono"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono text-ocean-muted">
            <span>Sırala:</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface text-ocean-text text-xs font-mono focus:outline-none focus:border-ocean-cyan"
            >
              <option value="consistencyScore">Tutarlılık Skoru</option>
              <option value="pnl1M">1 Ay PnL</option>
              <option value="pnl3M">3 Ay PnL</option>
              <option value="pnl6M">6 Ay PnL</option>
              <option value="sharpe3M">3 Ay Sharpe</option>
              <option value="maxDrawdown">En Düşük MaxDD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-ocean-border bg-ocean-surface/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-ocean-border bg-ocean-surface/80 text-[11px] text-ocean-muted uppercase tracking-wider">
                <th className="p-3 font-medium">Cüzdan</th>
                <th className="p-3 font-medium text-center">{t.sonar.consistencyScore}</th>
                <th className="p-3 font-medium text-right">{t.sonar.horizon1M}</th>
                <th className="p-3 font-medium text-right">{t.sonar.horizon3M}</th>
                <th className="p-3 font-medium text-right">{t.sonar.horizon6M}</th>
                <th className="p-3 font-medium text-right">MaxDD</th>
                <th className="p-3 font-medium text-center">Kazanma %</th>
                <th className="p-3 font-medium text-center">{t.sonar.regimeResilience}</th>
                <th className="p-3 font-medium text-center">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-border/40 text-ocean-text">
              {filteredAndSorted.map(wallet => {
                const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
                const isCopied = copiedAddress === wallet.address;

                // Consistency color badge
                let scoreBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                if (wallet.consistencyScore >= 75) {
                  scoreBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                } else if (wallet.consistencyScore >= 50) {
                  scoreBadgeClass = 'bg-ocean-cyan/10 text-ocean-cyan border-ocean-cyan/30';
                }

                // Resilience badge
                let resilienceLabel = t.sonar.fragile;
                let resilienceClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                if (wallet.regimeResilience === 'ROBUST') {
                  resilienceLabel = t.sonar.robust;
                  resilienceClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                } else if (wallet.regimeResilience === 'MODERATE') {
                  resilienceLabel = t.sonar.moderate;
                  resilienceClass = 'bg-ocean-cyan/10 text-ocean-cyan border-ocean-cyan/30';
                }

                return (
                  <tr
                    key={wallet.address}
                    className="hover:bg-ocean-surface transition-colors cursor-pointer"
                    onClick={() => onInspectWallet && onInspectWallet(wallet.address)}
                  >
                    {/* Wallet & Dominant Asset */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ocean-text hover:text-ocean-cyan transition-colors">
                          {shortAddr}
                        </span>
                        <button
                          onClick={e => handleCopy(wallet.address, e)}
                          className="text-ocean-muted hover:text-ocean-text p-1 transition-colors"
                          title="Adresi Kopyala"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span className="px-1.5 py-0.5 rounded bg-ocean-surface border border-ocean-border text-[10px] text-ocean-cyan">
                          {wallet.dominantAsset}
                        </span>
                      </div>
                    </td>

                    {/* Consistency Score */}
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-bold ${scoreBadgeClass}`}>
                        {wallet.consistencyScore}
                      </span>
                    </td>

                    {/* 1 Month */}
                    <td className="p-3 text-right">
                      <div className={`font-bold ${wallet.metrics1M.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {wallet.metrics1M.totalReturnPct >= 0 ? '+' : ''}
                        {wallet.metrics1M.totalReturnPct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-ocean-muted">
                        Sh: {wallet.metrics1M.sharpeRatio.toFixed(1)}
                      </div>
                    </td>

                    {/* 3 Month */}
                    <td className="p-3 text-right">
                      <div className={`font-bold ${wallet.metrics3M.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {wallet.metrics3M.totalReturnPct >= 0 ? '+' : ''}
                        {wallet.metrics3M.totalReturnPct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-ocean-muted">
                        Sh: {wallet.metrics3M.sharpeRatio.toFixed(1)}
                      </div>
                    </td>

                    {/* 6 Month */}
                    <td className="p-3 text-right">
                      <div className={`font-bold ${wallet.metrics6M.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {wallet.metrics6M.totalReturnPct >= 0 ? '+' : ''}
                        {wallet.metrics6M.totalReturnPct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-ocean-muted">
                        Sh: {wallet.metrics6M.sharpeRatio.toFixed(1)}
                      </div>
                    </td>

                    {/* Max Drawdown */}
                    <td className="p-3 text-right text-rose-400 font-bold">
                      -%{wallet.metrics3M.maxDrawdownPct.toFixed(1)}
                    </td>

                    {/* Win Rate */}
                    <td className="p-3 text-center text-ocean-text">
                      %{wallet.metrics3M.winRatePct.toFixed(0)}
                    </td>

                    {/* Regime Resilience */}
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border font-bold ${resilienceClass}`}>
                        {resilienceLabel}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onInspectWallet && onInspectWallet(wallet.address)}
                        className="px-2 py-1 rounded bg-ocean-surface border border-ocean-border hover:border-ocean-cyan text-ocean-cyan text-[11px] font-mono transition-colors"
                        title={t.sonar.inspectInSim}
                      >
                        {t.sonar.inspectInSim}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-ocean-muted">
                    {isLoading ? 'Veriler yükleniyor...' : 'Eşleşen cüzdan bulunamadı.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
