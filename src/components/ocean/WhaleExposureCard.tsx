'use client';

import React from 'react';
import { Waves, Shield } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';

interface WhaleExposureCardProps {
  totalExposure: number;
  trackedCount: number;
  largestPositionNotional?: number;
  largestPositionAsset?: string;
}

export function WhaleExposureCard({
  totalExposure,
  trackedCount,
  largestPositionNotional,
  largestPositionAsset,
}: WhaleExposureCardProps) {
  const { t, language } = useTranslation();

  return (
    <div className="p-5 rounded-xl bg-ocean-surface border border-ocean-border flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-ocean-muted mb-2">
          <span className="flex items-center gap-1.5 text-ocean-cyan">
            <Waves className="w-4 h-4" />
            {t.ocean.totalExposure}
          </span>
          <Tooltip content={t.ocean.exposureTooltip} />
        </div>

        <div className="text-2xl font-bold font-mono text-ocean-text">
          {totalExposure > 0 ? `$${formatNotional(totalExposure)}` : t.ocean.waitingData}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs font-mono text-ocean-muted">
          <div>
            <span className="text-ocean-text font-bold">{trackedCount}</span> {t.ocean.trackedWhales}
          </div>
          {largestPositionNotional && largestPositionAsset && (
            <div className="border-l border-ocean-border pl-4">
              {t.ocean.exposureLargest} <span className="text-ocean-cyan font-bold">${formatNotional(largestPositionNotional)}</span> ({largestPositionAsset})
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-ocean-border/60 text-[10px] text-ocean-muted/80 flex items-center gap-1">
        <Shield className="w-3 h-3 text-ocean-cyan" />
        <span>{t.ocean.exposureDisclaimer}</span>
      </div>
    </div>
  );
}
