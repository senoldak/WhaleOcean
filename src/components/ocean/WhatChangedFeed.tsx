'use client';

import React from 'react';
import { WhatChangedEvent } from '@/types/contracts';
import { History, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface WhatChangedFeedProps {
  events: WhatChangedEvent[];
}

export function WhatChangedFeed({ events }: WhatChangedFeedProps) {
  const { t, language } = useTranslation();

  if (!events || events.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-ocean-surface border border-ocean-border">
        <div className="flex items-center gap-2 mb-4 text-xs font-mono text-ocean-cyan">
          <History className="w-4 h-4" />
          <span>{t.ocean.whatChanged.toUpperCase()}</span>
        </div>
        <div className="p-4 rounded-lg bg-ocean-deep/60 border border-ocean-border/40 text-center text-xs text-ocean-muted">
          {t.ocean.feedEmptyDesc}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-ocean-surface border border-ocean-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-ocean-cyan" />
          <h3 className="text-xs font-mono font-bold tracking-wider text-ocean-cyan uppercase">
            {t.ocean.whatChanged}
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-ocean-muted">
          <ShieldCheck className="w-3 h-3 text-ocean-green" />
          <span>{t.ocean.feedFactual}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {events.slice(0, 8).map((event) => (
          <div
            key={event.id}
            className="p-3 rounded-lg bg-ocean-deep/60 border border-ocean-border/40 flex items-start justify-between gap-3 text-xs hover:border-ocean-border transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-ocean-surface border border-ocean-border text-ocean-cyan">
                {event.category}
              </span>
              <div>
                <p className="text-ocean-text leading-relaxed font-mono">
                  {event.statement}
                </p>
                <span className="text-[10px] text-ocean-muted font-mono mt-1 inline-block">
                  {t.ocean.feedSource}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-ocean-muted whitespace-nowrap">
              {event.timeWindowMinutes} {t.ocean.feedTimeAgo}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
