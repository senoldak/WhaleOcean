'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';

interface OceanDensityCardProps {
  totalOpenInterest: number;
  topMarketAsset?: string;
  topMarketOi?: number;
}

export function OceanDensityCard({
  totalOpenInterest,
  topMarketAsset,
  topMarketOi,
}: OceanDensityCardProps) {
  const { t, language } = useTranslation();

  return (
    <div className="p-5 rounded-xl bg-ocean-surface border border-ocean-border flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-ocean-muted mb-2">
          <span className="flex items-center gap-1.5 text-ocean-cyan">
            <Layers className="w-4 h-4" />
            {t.ocean.density} ({t.markets.colOpenInterest})
          </span>
          <Tooltip content={t.ocean.densityTooltip} />
        </div>

        <div className="text-2xl font-bold font-mono text-ocean-text">
          {totalOpenInterest > 0 ? `$${formatNotional(totalOpenInterest)}` : t.ocean.waitingData}
        </div>

        {topMarketAsset && topMarketOi && (
          <div className="mt-3 text-xs font-mono text-ocean-muted">
            {language === 'tr' ? 'En yüksek yoğunlaşma:' : 'Highest concentration:'}{' '}
            <span className="text-ocean-text font-bold">{topMarketAsset}</span> (${formatNotional(topMarketOi)})
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-ocean-border/60 text-[10px] text-ocean-muted/80">
        {t.ocean.densitySource}
      </div>
    </div>
  );
}
