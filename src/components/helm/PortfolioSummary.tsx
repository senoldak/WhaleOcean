'use client';

import React, { useState } from 'react';
import { Wallet, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface PortfolioSummaryProps {
  totalEquity: number;
  cashBalance: number;
  marginUsed: number;
  realizedPnl: number;
  unrealizedPnl: number;
  onReset: () => void;
}

export function PortfolioSummary({
  totalEquity,
  cashBalance,
  marginUsed,
  realizedPnl,
  unrealizedPnl,
  onReset,
}: PortfolioSummaryProps) {
  const { t, language } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);

  const isNetWin = realizedPnl >= 0;
  const isUnrealizedWin = unrealizedPnl >= 0;

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-5 space-y-4 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ocean-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-ocean-cyan" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
            {t.helm.overviewHeader}
          </h3>
        </div>

        <div>
          {showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {t.helm.confirmReset}
              </span>
              <button
                onClick={() => {
                  onReset();
                  setShowConfirm(false);
                }}
                className="px-2.5 py-1 rounded bg-rose-500 text-white font-mono text-xs font-bold hover:bg-rose-600 transition-colors"
              >
                {t.helm.yesReset}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 rounded border border-ocean-border text-ocean-muted hover:text-ocean-text font-mono text-xs transition-colors"
              >
                {t.helm.cancel}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ocean-border/60 hover:border-ocean-cyan/40 bg-ocean-abyss/40 hover:bg-ocean-abyss text-xs font-mono text-ocean-muted hover:text-ocean-text transition-colors"
              title={t.helm.resetModalDesc}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.helm.resetPortfolio}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Tile Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Equity */}
        <div className="rounded-lg border border-ocean-border/50 bg-ocean-abyss/40 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.helm.equity}</span>
          <span className="text-xl font-mono font-bold text-ocean-text tracking-tight block">
            ${Math.round(totalEquity).toLocaleString('en-US')}
          </span>
          <span className={`text-[11px] font-mono ${isUnrealizedWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {language === 'tr' ? 'Gerçekleşmemiş' : 'Unrealized'}: {isUnrealizedWin ? '+' : ''}${Math.round(unrealizedPnl).toLocaleString('en-US')}
          </span>
        </div>

        {/* Cash Balance */}
        <div className="rounded-lg border border-ocean-border/50 bg-ocean-abyss/40 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.helm.balance}</span>
          <span className="text-xl font-mono font-bold text-ocean-cyan tracking-tight block">
            ${Math.round(cashBalance).toLocaleString('en-US')}
          </span>
          <span className="text-[11px] font-mono text-ocean-muted">
            {t.helm.freeCollateral}
          </span>
        </div>

        {/* Margin Used */}
        <div className="rounded-lg border border-ocean-border/50 bg-ocean-abyss/40 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.helm.marginUsed}</span>
          <span className="text-xl font-mono font-bold text-ocean-text tracking-tight block">
            ${Math.round(marginUsed).toLocaleString('en-US')}
          </span>
          <span className="text-[11px] font-mono text-ocean-muted">
            {totalEquity > 0 ? ((marginUsed / totalEquity) * 100).toFixed(1) : '0'}% {t.helm.utilization}
          </span>
        </div>

        {/* Realized PnL */}
        <div className="rounded-lg border border-ocean-border/50 bg-ocean-abyss/40 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.helm.realizedPnl}</span>
          <span className={`text-xl font-mono font-bold tracking-tight block ${isNetWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isNetWin ? '+' : ''}${realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] font-mono text-ocean-muted">
            {t.helm.netClosed}
          </span>
        </div>
      </div>
    </div>
  );
}
