'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { useTranslation } from '@/i18n';

interface WaterPressureCardProps {
  averageFundingRate: number;
  highestFundingAsset?: string;
  highestFundingRate?: number;
}

export function WaterPressureCard({
  averageFundingRate,
  highestFundingAsset,
  highestFundingRate,
}: WaterPressureCardProps) {
  const { t } = useTranslation();
  const avgPct8h = averageFundingRate * 100;
  const avgAnnual = avgPct8h * 3 * 365;

  return (
    <div className="p-5 rounded-xl bg-ocean-surface border border-ocean-border flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-ocean-muted mb-2">
          <span className="flex items-center gap-1.5 text-ocean-cyan">
            <Gauge className="w-4 h-4" />
            {t.ocean.waterPressure}
          </span>
          <Tooltip content={t.ocean.waterPressureTooltip} />
        </div>

        <div className="text-2xl font-bold font-mono text-ocean-text">
          {averageFundingRate !== 0 ? (
            <span className={averageFundingRate > 0 ? 'text-ocean-green' : 'text-ocean-red'}>
              {avgPct8h > 0 ? '+' : ''}{avgPct8h.toFixed(4)}% / 8h
            </span>
          ) : (
            '0.0000% / 8h'
          )}
        </div>

        <div className="mt-3 text-xs font-mono text-ocean-muted">
          {t.ocean.waterPressureAnnual} <span className="text-ocean-text font-bold">{avgAnnual.toFixed(1)}% APR</span>
          {highestFundingAsset && highestFundingRate !== undefined && (
            <span className="ml-3 border-l border-ocean-border pl-3">
              {t.ocean.waterPressureExtreme} <strong className="text-ocean-cyan">{highestFundingAsset}</strong> ({(highestFundingRate * 100).toFixed(3)}%)
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-ocean-border/60 text-[10px] text-ocean-muted/80">
        {t.ocean.waterPressureSubtext}
      </div>
    </div>
  );
}
