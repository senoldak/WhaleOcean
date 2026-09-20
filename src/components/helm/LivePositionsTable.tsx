'use client';

import React from 'react';
import { PaperPosition } from '@/types/contracts';
import { ArrowUpRight, ArrowDownRight, XCircle, Activity } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface LivePositionsTableProps {
  positions: PaperPosition[];
  onClosePosition: (positionId: string) => void;
  isClosingId?: string | null;
}

export function LivePositionsTable({
  positions,
  onClosePosition,
  isClosingId,
}: LivePositionsTableProps) {
  const { t } = useTranslation();

  if (!positions || positions.length === 0) {
    return (
      <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-8 text-center space-y-2 shadow-sm">
        <Activity className="w-8 h-8 text-ocean-muted mx-auto" />
        <p className="font-mono text-xs font-semibold text-ocean-text">{t.helm.noOpenPositions}</p>
        <p className="font-mono text-[11px] text-ocean-muted">
          {t.helm.noOpenPositionsDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 overflow-hidden shadow-sm space-y-3 p-4">
      <div className="flex items-center justify-between border-b border-ocean-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-ocean-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
            {t.helm.positionsTitle} ({positions.length})
          </h4>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-ocean-border/50 text-[11px] text-ocean-muted uppercase">
              <th className="py-2.5 px-3">{t.helm.colAsset}</th>
              <th className="py-2.5 px-3">{t.helm.colSide}</th>
              <th className="py-2.5 px-3">{t.helm.colSize}</th>
              <th className="py-2.5 px-3">{t.helm.colEntry}</th>
              <th className="py-2.5 px-3">{t.helm.colMark}</th>
              <th className="py-2.5 px-3">{t.helm.colMargin}</th>
              <th className="py-2.5 px-3">{t.helm.colPnl}</th>
              <th className="py-2.5 px-3">{t.helm.colSource}</th>
              <th className="py-2.5 px-3 text-right">{t.helm.colAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-border/30">
            {positions.map((p) => {
              const isWin = p.unrealizedPnl >= 0;
              const pnlPct = p.marginUsed > 0 ? (p.unrealizedPnl / p.marginUsed) * 100 : 0;
              const isClosing = isClosingId === p.id;

              return (
                <tr key={p.id} className="hover:bg-ocean-abyss/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-ocean-text">{p.asset}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.side === 'LONG'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {p.side === 'LONG' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {p.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ocean-text">
                    {p.size.toFixed(4)} <span className="text-ocean-cyan">({p.leverage}x)</span>
                  </td>
                  <td className="py-2.5 px-3 text-ocean-muted">${p.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3 text-ocean-text">${p.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3 text-ocean-muted">${Math.round(p.marginUsed).toLocaleString('en-US')}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${p.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pnlPct.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ocean-muted text-[11px]">
                    {p.source === 'COPY_WHALE' ? (
                      <span className="text-ocean-cyan" title={p.sourceWallet || undefined}>
                        Copy: {p.sourceWallet ? `${p.sourceWallet.slice(0, 6)}...` : 'Whale'}
                      </span>
                    ) : (
                      p.source
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onClosePosition(p.id)}
                      disabled={isClosing}
                      className="px-2.5 py-1 rounded bg-ocean-surface hover:bg-rose-500/20 border border-ocean-border hover:border-rose-500/40 text-ocean-muted hover:text-rose-400 transition-colors text-[11px] disabled:opacity-50"
                    >
                      {isClosing ? t.helm.closingPosition : t.helm.closePosition}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
