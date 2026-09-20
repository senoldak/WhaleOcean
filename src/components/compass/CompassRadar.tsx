'use client';

import React, { useState, useMemo } from 'react';
import { WalletAlphaScore, OceanPersona, RiskTier } from '@/types/contracts';
import { WhaleCard } from './WhaleCard';
import { CopyModal } from './CopyModal';
import { Compass, Filter, Search, SlidersHorizontal, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface CompassRadarProps {
  initialRecommendations: WalletAlphaScore[];
}

export function CompassRadar({ initialRecommendations }: CompassRadarProps) {
  const { t, language } = useTranslation();
  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');
  const [selectedRiskTier, setSelectedRiskTier] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(60);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copyTargetScore, setCopyTargetScore] = useState<WalletAlphaScore | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const filteredScores = useMemo(() => {
    return initialRecommendations.filter((item) => {
      if (selectedPersona !== 'ALL' && item.persona !== selectedPersona) return false;
      if (selectedRiskTier !== 'ALL' && item.riskTier !== selectedRiskTier) return false;
      if (item.oceanAlphaScore < minScore) return false;
      if (searchQuery && !item.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [initialRecommendations, selectedPersona, selectedRiskTier, minScore, searchQuery]);

  // Aggregate stats
  const avgSharpe = filteredScores.length > 0
    ? filteredScores.reduce((acc, s) => acc + s.sharpeRatio, 0) / filteredScores.length
    : 0;

  const handleOpenCopy = (score: WalletAlphaScore) => {
    setCopyTargetScore(score);
    setIsCopyModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              {t.compass.title}
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.compass.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div>
            <span>{t.ocean.trackedWhales}: </span>
            <strong className="text-ocean-cyan">{filteredScores.length}</strong>
          </div>
          <span className="text-ocean-border">&bull;</span>
          <div>
            <span>{language === 'tr' ? 'Ort. Sharpe: ' : 'Avg Sharpe: '}</span>
            <strong className="text-emerald-400">{avgSharpe.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/40 p-4 space-y-4">
        {/* Top Row: Search & Persona Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Persona Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'TRITON', 'ORCA', 'LEVIATHAN'].map((p) => {
              const isActive = selectedPersona === p;
              const label = p === 'ALL' ? t.common.all : p;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPersona(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    isActive
                      ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                      : 'border border-ocean-border/50 text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search by Address */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ocean-muted" />
            <input
              type="text"
              placeholder={t.compass.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none focus:border-ocean-cyan"
            />
          </div>
        </div>

        {/* Bottom Row: Risk Tier & Min Alpha Score Slider */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-ocean-border/40 text-xs font-mono">
          {/* Risk Tier Select */}
          <div className="flex items-center gap-2">
            <span className="text-ocean-muted">{t.compass.riskTier}:</span>
            {['ALL', 'CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedRiskTier(tier)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                  selectedRiskTier === tier
                    ? 'bg-ocean-surface text-ocean-cyan border border-ocean-cyan/40 font-bold'
                    : 'text-ocean-muted hover:text-ocean-text'
                }`}
              >
                {tier === 'ALL'
                  ? t.common.all
                  : tier === 'CONSERVATIVE'
                  ? (language === 'tr' ? 'DİSİPLİNLİ' : 'CONSERVATIVE')
                  : tier === 'BALANCED'
                  ? (language === 'tr' ? 'DENGELİ' : 'BALANCED')
                  : (language === 'tr' ? 'AGRESİF' : 'AGGRESSIVE')}
              </button>
            ))}
          </div>

          {/* Min Score Slider */}
          <div className="flex items-center gap-3">
            <span className="text-ocean-muted">{t.compass.minScore}:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-32 accent-ocean-cyan cursor-pointer"
            />
            <span className="font-bold text-ocean-cyan min-w-[2.5rem]">{minScore}+</span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredScores.length === 0 ? (
        <div className="rounded-xl border border-ocean-border/60 bg-ocean-surface/30 p-12 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-ocean-muted mx-auto" />
          <p className="text-sm font-mono text-ocean-text font-semibold">{t.compass.noWalletsFound}</p>
          <p className="text-xs font-mono text-ocean-muted">
            {t.compass.noWalletsFoundDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScores.map((score) => (
            <WhaleCard
              key={score.address}
              score={score}
              onCopyClick={handleOpenCopy}
            />
          ))}
        </div>
      )}

      {/* Copy Modal */}
      <CopyModal
        score={copyTargetScore}
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
      />
    </div>
  );
}
