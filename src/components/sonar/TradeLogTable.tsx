'use client';

import React from 'react';
import { BacktestTrade } from '@/types/contracts';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface TradeLogTableProps {
  trades: BacktestTrade[];
}

export function TradeLogTable({ trades }: TradeLogTableProps) {
  const { t, language } = useTranslation();

  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-xl border border-ocean-border/60 bg-ocean-surface/40 p-8 text-center text-xs font-mono text-ocean-muted">
        {t.sonar.noTradesRecorded}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 overflow-hidden shadow-sm space-y-3 p-4">
      <div className="flex items-center justify-between border-b border-ocean-border/40 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-ocean-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
            {t.sonar.tradeLogTitle} ({trades.length} {language === 'tr' ? 'İŞLEM' : 'EXECUTIONS'})
          </h4>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-ocean-border/50 text-[11px] text-ocean-muted uppercase">
              <th className="py-2.5 px-3">{t.sonar.colAsset}</th>
              <th className="py-2.5 px-3">{t.sonar.colSide}</th>
              <th className="py-2.5 px-3">{t.sonar.colEntry}</th>
              <th className="py-2.5 px-3">{t.sonar.colExit}</th>
              <th className="py-2.5 px-3">{t.sonar.colSize}</th>
              <th className="py-2.5 px-3">{t.sonar.colFee}</th>
              <th className="py-2.5 px-3">{t.sonar.colPnl}</th>
              <th className="py-2.5 px-3">{t.sonar.colReason}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-border/30">
            {trades.map((t) => {
              const isWin = t.pnl >= 0;
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
                  <td className="py-2.5 px-3 text-ocean-muted">${Math.round(t.notional).toLocaleString('en-US')}</td>
                  <td className="py-2.5 px-3 text-ocean-muted">${t.feePaid.toFixed(2)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${t.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({t.pnlPercent.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ocean-muted text-[11px]">{t.exitReason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
