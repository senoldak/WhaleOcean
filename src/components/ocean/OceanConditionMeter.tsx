'use client';

import React from 'react';
import { OceanConditionMeasurement } from '@/types/contracts';
import { Compass, Wind, AlertCircle } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { useTranslation } from '@/i18n';

interface OceanConditionMeterProps {
  condition?: OceanConditionMeasurement | null;
}

export function OceanConditionMeter({ condition }: OceanConditionMeterProps) {
  const { t, language } = useTranslation();

  if (!condition) {
    return (
      <div className="p-6 rounded-xl bg-ocean-surface border border-ocean-border text-center">
        <Compass className="w-8 h-8 text-ocean-muted mx-auto mb-2 animate-spin-slow" />
        <div className="text-sm font-semibold text-ocean-text">
          {language === 'tr' ? 'DOĞRULANMIŞ CANLI VERİ BEKLENİYOR' : 'WAITING FOR VERIFIED LIVE DATA'}
        </div>
        <p className="text-xs text-ocean-muted mt-1">
          {language === 'tr'
            ? 'Okyanus Koşulları yalnızca doğrulanmış Hyperliquid piyasa verilerinden hesaplanır.'
            : 'Ocean Conditions are calculated exclusively from verified Hyperliquid market data.'}
        </p>
      </div>
    );
  }

  const { classification, volatilityScore, oiChangePercent, fundingStressScore, underlyingMetrics } = condition;

  const getBadgeStyle = () => {
    switch (classification) {
      case 'STORM':
        return 'bg-red-950/50 border-ocean-red text-ocean-red shadow-lg shadow-red-900/20';
      case 'RESTLESS':
        return 'bg-amber-950/50 border-amber-500 text-amber-300';
      case 'ACTIVE':
        return 'bg-blue-950/50 border-ocean-blue text-ocean-cyan';
      default:
        return 'bg-emerald-950/50 border-ocean-green text-ocean-green';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-ocean-surface border border-ocean-border relative overflow-hidden">
      {/* Background glow based on condition */}
      <div
        className={`absolute -right-16 -bottom-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          classification === 'STORM'
            ? 'bg-ocean-red'
            : classification === 'RESTLESS'
            ? 'bg-amber-500'
            : 'bg-ocean-cyan'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ocean-muted uppercase tracking-wider">
              {t.ocean.conditions}
            </span>
            <Tooltip content={language === 'tr' ? 'Gerçekleşen volatilite, açık pozisyon hızı, fonlama oranı stresi ve balina pozisyon değişimlerine dayalı piyasa geneli çevresel sınıflandırma. Asla bir al-sat sinyali değildir.' : 'Market-wide environmental classification based on realized volatility, open interest velocity, funding rate stress, and whale exposure changes. Never a trading signal.'} />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`px-3 py-1 rounded-md border text-sm font-mono font-bold tracking-wider ${getBadgeStyle()}`}>
              {language === 'tr'
                ? classification === 'STORM'
                  ? t.ocean.storm
                  : classification === 'RESTLESS'
                  ? t.ocean.restless
                  : classification === 'ACTIVE'
                  ? t.ocean.active
                  : t.ocean.calm
                : classification}
            </span>
            <span className="text-xs text-ocean-muted font-mono">
              {language === 'tr' ? 'Endeks' : 'Index'}: {volatilityScore.toFixed(1)} / 100
            </span>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono text-ocean-muted">
          {language === 'tr' ? 'Son ölçüm' : 'Last measured'}: {new Date(condition.timestamp).toLocaleTimeString()} UTC
        </div>
      </div>

      {/* Underlying Measurements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-ocean-border/60">
        <div className="p-3 rounded-lg bg-ocean-deep/60 border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono flex items-center justify-between">
            <span>{t.ocean.volatility}</span>
            <Tooltip content={language === 'tr' ? 'İzlenen varlıklar genelinde 1 saatlik hareketli fiyat getirisi standart sapması.' : '1-hour rolling price return standard deviation across tracked assets.'} />
          </div>
          <div className="text-base font-bold font-mono text-ocean-text mt-1">
            {underlyingMetrics.realizedVol1h.toFixed(2)}%
          </div>
        </div>

        <div className="p-3 rounded-lg bg-ocean-deep/60 border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono flex items-center justify-between">
            <span>{t.ocean.density}</span>
            <Tooltip content={t.ocean.densityDesc} />
          </div>
          <div className="text-base font-bold font-mono text-ocean-text mt-1">
            {oiChangePercent >= 0 ? `+${oiChangePercent.toFixed(1)}%` : `${oiChangePercent.toFixed(1)}%`}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-ocean-deep/60 border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono flex items-center justify-between">
            <span>{t.ocean.waterPressure}</span>
            <Tooltip content={t.ocean.waterPressureDesc} />
          </div>
          <div className="text-base font-bold font-mono text-ocean-text mt-1">
            {(underlyingMetrics.avgAbsFunding * 100).toFixed(4)}%
          </div>
        </div>

        <div className="p-3 rounded-lg bg-ocean-deep/60 border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono flex items-center justify-between">
            <span>{t.ocean.whaleDelta} (1s)</span>
            <Tooltip content={t.ocean.whaleDeltaDesc} />
          </div>
          <div className="text-base font-bold font-mono text-ocean-text mt-1">
            {underlyingMetrics.netWhaleDelta1h >= 0 ? '+' : ''}$
            {(Math.abs(underlyingMetrics.netWhaleDelta1h) / 1_000_000).toFixed(2)}M
          </div>
        </div>
      </div>
    </div>
  );
}
