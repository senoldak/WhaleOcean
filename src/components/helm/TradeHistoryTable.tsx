'use client';

import React from 'react';
import { PaperTrade } from '@/types/contracts';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface TradeHistoryTableProps {
  trades: PaperTrade[];
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  const { t, language } = useTranslation();

  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-6 text-center text-xs font-mono text-ocean-muted shadow-sm">
        {t.helm.noTradeHistory}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 overflow-hidden shadow-sm space-y-3 p-4">
      <div className="flex items-center justify-between border-b border-ocean-border/40 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-ocean-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
            {t.helm.historyTitle} ({trades.length})
          </h4>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-ocean-border/50 text-[11px] text-ocean-muted uppercase">
              <th className="py-2.5 px-3">{t.helm.colAsset}</th>
              <th className="py-2.5 px-3">{t.helm.colSide}</th>
              <th className="py-2.5 px-3">{t.helm.colEntry}</th>
              <th className="py-2.5 px-3">{t.sonar.colExit}</th>
              <th className="py-2.5 px-3">{t.sonar.colFee}</th>
              <th className="py-2.5 px-3">{t.helm.realizedPnl}</th>
              <th className="py-2.5 px-3">{t.sonar.colReason}</th>
              <th className="py-2.5 px-3">{language === 'tr' ? 'Kapanış Zamanı' : 'Closed At'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-border/30">
            {trades.map((t) => {
              const isWin = t.realizedPnl >= 0;
              return (
                <tr key={t.id} className="hover:bg-ocean-abyss/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-ocean-text">{t.asset}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.side === 'LONG'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {t.side === 'LONG' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {t.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ocean-muted">${t.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3 text-ocean-text">${t.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3 text-ocean-muted">${t.feePaid.toFixed(2)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${t.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ocean-muted text-[11px]">{t.closeReason}</td>
                  <td className="py-2.5 px-3 text-ocean-muted text-[11px]">
                    {new Date(t.closedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
