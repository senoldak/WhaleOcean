'use client';

import React from 'react';
import { WhaleDnaSummary } from '@/analytics/whale-classifier';
import { Dna, AlertCircle, PieChart, Repeat, Compass } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';

interface WhaleDnaCardProps {
  dna: WhaleDnaSummary;
}

export function WhaleDnaCard({ dna }: WhaleDnaCardProps) {
  const { t, language } = useTranslation();

  if (!dna.hasSufficientHistory) {
    return (
      <div className="p-4 rounded-xl bg-ocean-deep/60 border border-ocean-border/60">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono text-ocean-cyan">
          <Dna className="w-4 h-4" />
          <span>{t.whales.dnaTitle.toUpperCase()}</span>
        </div>
        <div className="p-3 rounded-lg bg-ocean-surface/60 border border-ocean-border/40 flex items-start gap-2.5 text-xs text-ocean-muted">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-ocean-text">{t.whales.dnaInsufficient}</div>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              {t.whales.dnaInsufficientDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-ocean-deep/60 border border-ocean-border/60">
      <div className="flex items-center justify-between mb-3 text-xs font-mono">
        <span className="flex items-center gap-2 text-ocean-cyan">
          <Dna className="w-4 h-4" />
          {t.whales.dnaTitle.toUpperCase()} ({t.whales.dnaObservedBehavior})
        </span>
        <Tooltip content={t.whales.dnaTooltip} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-lg bg-ocean-surface border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono">{t.whales.dnaDirectionalBias}</div>
          <div className="text-sm font-bold font-mono text-ocean-text mt-1">
            {dna.directionalBiasPercentLong !== null
              ? `${dna.directionalBiasPercentLong}% Long`
              : 'N/A'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-ocean-surface border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono">{t.whales.dnaMarketConcentration}</div>
          <div className="text-sm font-bold font-mono text-ocean-text mt-1">
            {dna.marketConcentrationHhi !== null
              ? `${(dna.marketConcentrationHhi / 100).toFixed(0)}% HHI`
              : 'N/A'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-ocean-surface border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono">{t.whales.dnaFlipFrequency}</div>
          <div className="text-sm font-bold font-mono text-ocean-text mt-1">
            {dna.flipFrequency30d !== null ? `${dna.flipFrequency30d} ${language === 'tr' ? 'dönüş' : 'flips'}` : '0'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-ocean-surface border border-ocean-border/40">
          <div className="text-[11px] text-ocean-muted font-mono">{t.whales.dnaAvgNotional}</div>
          <div className="text-sm font-bold font-mono text-ocean-text mt-1">
            {dna.avgPositionNotional !== null ? `$${formatNotional(dna.avgPositionNotional)}` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
