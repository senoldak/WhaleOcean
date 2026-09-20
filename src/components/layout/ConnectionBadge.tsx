'use client';

import React, { useState, useEffect } from 'react';
import { ConnectionHealth } from '@/types/contracts';
import { Activity, AlertTriangle, Radio, WifiOff } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ConnectionBadgeProps {
  health?: ConnectionHealth;
}

export function ConnectionBadge({ health }: ConnectionBadgeProps) {
  const { t, language } = useTranslation();
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  const status = health?.status || 'CONNECTING';
  const lastTime = health?.lastMessageTimestamp;
  const latency = health?.latencyMs;

  useEffect(() => {
    if (!lastTime) {
      setSecondsElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setSecondsElapsed(Math.max(0, Math.floor((Date.now() - lastTime) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastTime]);

  if (status === 'LIVE') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ocean-surface border border-ocean-border text-xs font-mono text-ocean-text shadow-sm"
        title="Verified real-time connection to Hyperliquid infrastructure"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ocean-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-ocean-green"></span>
        </span>
        <span className="font-semibold text-ocean-green">{t.common.live}</span>
        {latency !== null && latency !== undefined && (
          <span className="text-ocean-muted text-[11px] border-l border-ocean-border pl-2">
            {latency}ms
          </span>
        )}
      </div>
    );
  }

  if (status === 'STALE') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-300 shadow-sm"
        title="Data is stale. Last verified update received over 10s ago."
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-amber-400">{t.common.stale}</span>
        <span className="text-amber-200/80 text-[11px] border-l border-amber-500/30 pl-2">
          {secondsElapsed}{language === 'tr' ? 'sn önce' : 's ago'}
        </span>
      </div>
    );
  }

  if (status === 'CONNECTING') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ocean-surface border border-ocean-border text-xs font-mono text-ocean-muted"
        title="Connecting to official Hyperliquid WebSocket..."
      >
        <Radio className="w-3.5 h-3.5 text-ocean-cyan animate-pulse" />
        <span>{t.common.connecting}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/40 border border-ocean-red/40 text-xs font-mono text-ocean-red shadow-sm"
      title="Hyperliquid stream currently unavailable. No simulated data is being displayed."
    >
      <WifiOff className="w-3.5 h-3.5 text-ocean-red" />
      <span className="font-semibold">{t.common.dataUnavailable}</span>
    </div>
  );
}
