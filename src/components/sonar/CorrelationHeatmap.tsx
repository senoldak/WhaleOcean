'use client';

import React, { useState, useEffect } from 'react';
import { CorrelationMatrixResult, WalletCorrelationPair } from '@/analytics/correlation/wallet-correlation-engine';
import { SmartBasketRecommendation } from '@/analytics/recommendations/smart-basket';
import { useTranslation } from '@/i18n';
import {
  Activity,
  AlertTriangle,
  Check,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Layers,
  Clock,
  Plus,
  Star,
} from 'lucide-react';

interface CorrelationHeatmapProps {
  initialData?: CorrelationMatrixResult & { smartBasket?: SmartBasketRecommendation };
  onInspectWallet?: (address: string) => void;
}

export function CorrelationHeatmap({ initialData, onInspectWallet }: CorrelationHeatmapProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<CorrelationMatrixResult & { smartBasket?: SmartBasketRecommendation } | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedPair, setSelectedPair] = useState<WalletCorrelationPair | null>(
    initialData?.pairs?.[0] || null
  );
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState<boolean>(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const [limit, setLimit] = useState<number>(20);
  const [trackedOnly, setTrackedOnly] = useState<boolean>(false);
  const [customAddressInput, setCustomAddressInput] = useState<string>('');

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

      const res = await fetch(`/api/wallets/correlation?${params.toString()}`);
      const json = await res.json();
      if (json.wallets) {
        setData(json);
        if (json.pairs && json.pairs.length > 0) {
          setSelectedPair(json.pairs[0]);
        }
      }
    } catch {
      // Keep existing data
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, []);

  const handleCellClick = (walletA: string, walletB: string) => {
    if (!data || walletA === walletB) return;
    const pair = data.pairs.find(
      p =>
        (p.walletA === walletA && p.walletB === walletB) ||
        (p.walletA === walletB && p.walletB === walletA)
    );
    if (pair) {
      setSelectedPair(pair);
    }
  };

  const handleSubscribeBasket = async () => {
    if (!data?.smartBasket || data.smartBasket.items.length === 0) return;

    setIsSubscribing(true);
    setSubscribeError(null);

    try {
      const res = await fetch('/api/paper/basket-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: 'default',
          items: data.smartBasket.items.map(i => ({
            address: i.address,
            allocatedUsd: i.allocatedUsd,
          })),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Abonelik başarısız');
      }

      setSubscribeSuccess(true);
      setTimeout(() => setSubscribeSuccess(false), 5000);
    } catch (err: any) {
      setSubscribeError(err.message || 'Sepet kopyalama hatası');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-ocean-muted font-mono text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-ocean-cyan" />
        <span>Korelasyon matrisi ve ısı haritası yükleniyor...</span>
      </div>
    );
  }

  const { wallets, matrix, syndicateClusters, smartBasket } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ocean-border/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-text flex items-center gap-2">
            <Activity className="w-5 h-5 text-ocean-cyan" />
            {t.sonar.correlationTitle}
          </h2>
          <p className="text-xs text-ocean-muted mt-0.5">
            {t.sonar.correlationSubtitle}
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface hover:bg-ocean-surface/80 text-ocean-cyan text-xs font-mono transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t.sonar.refreshData}</span>
        </button>
      </div>

      {/* Syndicate Alerts */}
      {syndicateClusters && syndicateClusters.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.sonar.syndicateAlert}</span>
          </div>
          <div className="space-y-1 pl-6">
            {syndicateClusters.map(cluster => (
              <p key={cluster.id} className="text-xs font-mono text-rose-300/90">
                {cluster.warningMessage}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Controls Bar: Limit Selector, Tracked Only, Custom Wallet Add */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-ocean-border bg-ocean-surface/30">
        {/* Scope Selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-ocean-muted">Kapsam:</span>
          <div className="flex rounded-lg border border-ocean-border overflow-hidden bg-ocean-surface">
            {[10, 20, 30, 50].map((val) => (
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

        {/* Tracked Only */}
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

        {/* Custom Wallet Add Form */}
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
            placeholder="Matrise Cüzdan Ekle (0x...)"
            value={customAddressInput}
            onChange={(e) => setCustomAddressInput(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/60 text-ocean-text text-xs placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan font-mono"
          />
          <button
            type="submit"
            disabled={!customAddressInput.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-ocean-cyan/20 border border-ocean-cyan/40 text-ocean-cyan hover:bg-ocean-cyan/30 text-xs font-mono font-bold flex items-center gap-1 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ekle</span>
          </button>
        </form>
      </div>

      {/* Main Stack: Heatmap on Top, Details & Smart Basket Below */}
      <div className="flex flex-col space-y-6">
        {/* Top: NxN Interactive Heatmap Full Width */}
        <div className="w-full space-y-4">
          <div className="rounded-xl border border-ocean-border bg-ocean-surface/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-ocean-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-ocean-cyan" />
                Interaktif $N \times N$ Benzerlik Matrisi
              </span>
              <span className="text-xs font-mono text-ocean-muted">
                {wallets.length} × {wallets.length} Boyut
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto pb-2">
              <table className="border-collapse text-[10px] font-mono">
                <thead>
                  <tr>
                    <th className="p-1.5 text-ocean-muted"></th>
                    {wallets.map((w) => (
                      <th key={w} className="p-1.5 text-ocean-muted text-center font-normal">
                        {`${w.slice(0, 4)}..${w.slice(-2)}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((rowWallet, i) => (
                    <tr key={rowWallet}>
                      <td className="p-1.5 font-normal text-ocean-muted whitespace-nowrap">
                        {`${rowWallet.slice(0, 6)}...${rowWallet.slice(-4)}`}
                      </td>
                      {wallets.map((colWallet, j) => {
                        const val = matrix[i]?.[j] ?? 0;
                        const isDiagonal = i === j;
                        const isSelected =
                          selectedPair &&
                          ((selectedPair.walletA === rowWallet && selectedPair.walletB === colWallet) ||
                            (selectedPair.walletA === colWallet && selectedPair.walletB === rowWallet));

                        // Heatmap Cell Color
                        let cellBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        if (isDiagonal) {
                          cellBg = 'bg-ocean-surface/90 text-ocean-muted/50 border-ocean-border/40';
                        } else if (val >= 0.75) {
                          cellBg = 'bg-rose-500/80 text-white font-bold border-rose-400 shadow-sm';
                        } else if (val >= 0.40) {
                          cellBg = 'bg-amber-500/60 text-amber-100 border-amber-400/50';
                        } else if (val >= 0.10) {
                          cellBg = 'bg-ocean-cyan/30 text-ocean-cyan border-ocean-cyan/40';
                        }

                        return (
                          <td
                            key={colWallet}
                            onClick={() => handleCellClick(rowWallet, colWallet)}
                            className={`p-1.5 text-center border cursor-pointer transition-all hover:scale-110 ${cellBg} ${
                              isSelected ? 'ring-2 ring-ocean-cyan z-10' : ''
                            }`}
                            title={`${rowWallet} x ${colWallet}: ${val.toFixed(2)}`}
                          >
                            {isDiagonal ? '1.0' : val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-ocean-border/40 flex flex-wrap items-center gap-4 text-[10px] font-mono text-ocean-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40 inline-block"></span>
                <span>{t.sonar.legendDiversified} (&lt; 0.10)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/60 border border-amber-400/50 inline-block"></span>
                <span>{t.sonar.legendModerate} (0.10 - 0.74)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500/80 border border-rose-400 inline-block"></span>
                <span>{t.sonar.legendSyndicate} (&ge; 0.75)</span>
              </div>
            </div>
          </div>

          {/* Selected Pair Detail Card */}
          {selectedPair && (
            <div className="p-4 rounded-xl border border-ocean-border bg-ocean-surface/60 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-ocean-border/60 pb-2">
                <span className="font-bold text-ocean-text">Seçili İkili Analizi</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    selectedPair.correlation >= 0.75
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  Korelasyon: {selectedPair.correlation.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-ocean-muted">
                <div>
                  <span className="text-[10px] block">Cüzdan A:</span>
                  <span className="font-bold text-ocean-text">
                    {`${selectedPair.walletA.slice(0, 8)}...${selectedPair.walletA.slice(-4)}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block">Cüzdan B:</span>
                  <span className="font-bold text-ocean-text">
                    {`${selectedPair.walletB.slice(0, 8)}...${selectedPair.walletB.slice(-4)}`}
                  </span>
                </div>
              </div>

              {selectedPair.sharedAssets && selectedPair.sharedAssets.length > 0 && (
                <div className="pt-2 border-t border-ocean-border/40">
                  <span className="text-[10px] text-ocean-muted block mb-1">Ortak İşlem Yapılan Varlıklar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPair.sharedAssets.map(asset => (
                      <span
                        key={asset}
                        className="px-2 py-0.5 rounded bg-ocean-surface border border-ocean-border text-ocean-cyan text-[11px]"
                      >
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPair.leadLag && (
                <div className="p-2.5 rounded-lg bg-ocean-surface border border-ocean-border/80 flex items-center gap-2 text-ocean-cyan">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-[11px]">
                    <strong>{t.sonar.leadWhale}:</strong> {`${selectedPair.leadLag.leader.slice(0, 6)}...${selectedPair.leadLag.leader.slice(-4)}`} ({selectedPair.leadLag.medianLagMinutes} dk önce giriyor)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section: Smart Basket Card Full Width */}
        <div className="w-full space-y-4">
          {smartBasket && (
            <div className="p-5 rounded-xl border border-ocean-cyan/30 bg-ocean-surface/70 space-y-4 shadow-lg shadow-ocean-cyan/5">
              <div className="flex items-center justify-between border-b border-ocean-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ocean-cyan" />
                  <h3 className="font-bold text-ocean-text text-sm font-mono">
                    {smartBasket.title}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
                  Beklenen Sharpe: {smartBasket.expectedSharpe}
                </span>
              </div>

              <p className="text-xs text-ocean-muted font-mono leading-relaxed">
                {smartBasket.description}
              </p>

              {/* Basket Metrics Bar */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-ocean-abyss/60 border border-ocean-border font-mono text-xs">
                <div>
                  <span className="text-[10px] text-ocean-muted block">Hedef Sermaye:</span>
                  <span className="font-bold text-ocean-text">
                    ${smartBasket.targetCapital.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ocean-muted block">Maks. İkili Korelasyon:</span>
                  <span className="font-bold text-emerald-400">
                    {smartBasket.maxPairwiseCorrelation.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Basket Items List */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-ocean-muted block uppercase tracking-wider">
                  Risk-Parite Ağırlıkları ({smartBasket.items.length} Cüzdan)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {smartBasket.items.map((item, idx) => {
                    const short = `${item.address.slice(0, 6)}...${item.address.slice(-4)}`;
                    let roleBadge = 'bg-ocean-cyan/10 text-ocean-cyan border-ocean-cyan/30';
                    let roleLabel = 'ALFA';
                    if (item.role === 'STABLE_COMPOUNDER') {
                      roleBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      roleLabel = 'DENGELİ';
                    } else if (item.role === 'HEDGE') {
                      roleBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                      roleLabel = 'HEDGE';
                    }

                    return (
                      <div
                        key={item.address}
                        className="p-3 rounded-lg border border-ocean-border/60 bg-ocean-surface/80 flex items-center justify-between font-mono text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ocean-text">{short}</span>
                            <span className={`px-1.5 py-0.2 text-[9px] rounded border font-bold ${roleBadge}`}>
                              {roleLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-ocean-muted">
                            3A Sh: {item.sharpe3M.toFixed(1)} &bull; MaxDD: -%{item.maxDrawdown.toFixed(1)}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-emerald-400 text-sm">
                            %{item.weightPct}
                          </span>
                          <span className="block text-[10px] text-ocean-muted">
                            ${item.allocatedUsd.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subscribe CTA */}
              <div className="pt-2">
                {subscribeSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{t.sonar.basketCopiedSuccess}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSubscribeBasket}
                    disabled={isSubscribing}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-ocean-cyan to-ocean-blue text-ocean-abyss font-mono font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-ocean-cyan/20 transition-all disabled:opacity-50"
                  >
                    {isSubscribing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t.sonar.copyBasketToHelm}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}

                {subscribeError && (
                  <p className="text-[11px] text-rose-400 font-mono mt-2 text-center">
                    {subscribeError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
