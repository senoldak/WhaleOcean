'use client';

import React from 'react';
import { PaperSubscription } from '@/types/contracts';
import { Zap, UserCheck, Shield, Trash2, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface CopiedWhalesBarProps {
  subscriptions: PaperSubscription[];
  onUnfollow: (subscriptionId: string) => void;
}

export function CopiedWhalesBar({ subscriptions, onUnfollow }: CopiedWhalesBarProps) {
  const { t } = useTranslation();

  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2 border-b border-ocean-border/40 pb-2.5">
        <Zap className="w-4 h-4 text-ocean-cyan" />
        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
          {t.helm.copiedWhalesTitle} ({subscriptions.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subscriptions.map((sub) => {
          const shortAddr = `${sub.walletAddress.slice(0, 6)}...${sub.walletAddress.slice(-4)}`;
          return (
            <div
              key={sub.id}
              className="rounded-lg border border-ocean-border/50 bg-ocean-abyss/40 p-3 flex items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-ocean-cyan" />
                  <span className="font-bold text-ocean-text">{shortAddr}</span>
                  <a
                    href={`https://app.hyperliquid.xyz/explorer/address/${sub.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-muted hover:text-ocean-cyan"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[11px] text-ocean-muted flex items-center gap-2">
                  <span>{t.helm.allocation}: <strong className="text-ocean-cyan">${sub.allocatedUsd.toLocaleString('en-US')}</strong></span>
                  <span>&bull;</span>
                  <span>{t.helm.stopLimit}: <strong>{(sub.maxDrawdownLimit * 100).toFixed(0)}%</strong></span>
                </div>
              </div>

              <button
                onClick={() => onUnfollow(sub.id)}
                className="px-2.5 py-1.5 rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500 transition-colors flex items-center gap-1 text-[11px]"
                title={t.helm.stopCopying}
              >
                <Trash2 className="w-3 h-3" />
                <span>{t.helm.stopCopying}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
