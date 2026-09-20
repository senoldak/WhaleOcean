'use client';

import React from 'react';
import { PositionEvent } from '@/db/repository';
import { History, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';

interface WhaleTrailsTimelineProps {
  events: PositionEvent[];
}

export function WhaleTrailsTimeline({ events }: WhaleTrailsTimelineProps) {
  const { t } = useTranslation();

  if (!events || events.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-ocean-deep/60 border border-ocean-border/60 text-center text-xs text-ocean-muted">
        {t.whales.timelineEmpty}
      </div>
    );
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'OPEN':
      case 'INCREASE':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-ocean-green" />,
          color: 'text-ocean-green border-ocean-green/40 bg-emerald-950/40',
        };
      case 'DECREASE':
      case 'CLOSE':
        return {
          icon: <ArrowDownRight className="w-3.5 h-3.5 text-ocean-red" />,
          color: 'text-ocean-red border-ocean-red/40 bg-red-950/40',
        };
      case 'FLIP':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
          color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        };
      default:
        return {
          icon: <History className="w-3.5 h-3.5 text-ocean-cyan" />,
          color: 'text-ocean-cyan border-ocean-border bg-ocean-surface',
        };
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono text-ocean-muted mb-2">
        <span className="flex items-center gap-1.5 text-ocean-cyan">
          <History className="w-4 h-4" />
          {t.whales.timelineTitle}
        </span>
        <span>{events.length} {t.whales.timelineRecorded}</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {events.map((event, idx) => {
          const badge = getEventBadge(event.eventType);
          return (
            <div
              key={`${event.timestamp}-${idx}`}
              className="p-2.5 rounded-lg bg-ocean-surface border border-ocean-border/60 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1 rounded border ${badge.color}`}>
                  {badge.icon}
                </div>
                <div>
                  <span className="font-bold text-ocean-text">{event.asset}</span>
                  <span className="text-ocean-muted ml-2">{event.eventType}</span>
                  <span className="text-ocean-cyan ml-2 font-bold">
                    ${formatNotional(event.deltaNotional)}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-ocean-muted">
                {new Date(event.timestamp).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
