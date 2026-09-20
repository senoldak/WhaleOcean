'use client';

import React from 'react';
import Link from 'next/link';
import { WalletAlphaScore } from '@/types/contracts';
import { PersonaBadge } from '../common/PersonaBadge';
import { AlphaScoreBadge } from '../common/AlphaScoreBadge';
import { ExternalLink, Copy, Zap, LineChart, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface WhaleCardProps {
  score: WalletAlphaScore;
  onCopyClick: (score: WalletAlphaScore) => void;
}

export function WhaleCard({ score, onCopyClick }: WhaleCardProps) {
  const { t, language } = useTranslation();
  const shortAddress = `${score.address.slice(0, 6)}...${score.address.slice(-4)}`;

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(score.address);
    }
  };

  const riskTierColors = {
    CONSERVATIVE: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    BALANCED: 'text-ocean-cyan border-ocean-cyan/30 bg-ocean-cyan/10',
    AGGRESSIVE: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  }[score.riskTier];

  const riskLabel = score.riskTier === 'CONSERVATIVE'
    ? (language === 'tr' ? 'DİSİPLİNLİ' : 'CONSERVATIVE')
    : score.riskTier === 'BALANCED'
    ? (language === 'tr' ? 'DENGELİ' : 'BALANCED')
    : (language === 'tr' ? 'AGRESİF' : 'AGGRESSIVE');

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-5 hover:border-ocean-cyan/40 hover:bg-ocean-surface transition-all duration-200 flex flex-col justify-between space-y-4 shadow-sm group">
      {/* Card Header: Address & Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ocean-text font-bold tracking-tight">
              {shortAddress}
            </span>
            <button
              onClick={handleCopyAddress}
              className="text-ocean-muted hover:text-ocean-cyan transition-colors"
              title="Copy full wallet address"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a
              href={`https://app.hyperliquid.xyz/explorer/address/${score.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ocean-muted hover:text-ocean-cyan transition-colors"
              title="View on Hyperliquid Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <PersonaBadge persona={score.persona} size="sm" />
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${riskTierColors}`}>
              {riskLabel}
            </span>
          </div>
        </div>

        <AlphaScoreBadge score={score.oceanAlphaScore} size="md" />
      </div>

      {/* 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-2 border-y border-ocean-border/40">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-ocean-muted block uppercase">{t.sonar.statsSharpe}</span>
          <span className={`text-xs font-mono font-bold ${score.sharpeRatio >= 2 ? 'text-emerald-400' : 'text-ocean-text'}`}>
            {score.sharpeRatio.toFixed(2)}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-ocean-muted block uppercase">{t.compass.maxDrawdown}</span>
          <span className={`text-xs font-mono font-bold ${score.maxDrawdown < 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {score.maxDrawdown.toFixed(1)}%
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-ocean-muted block uppercase">{t.compass.winRate}</span>
          <span className="text-xs font-mono font-bold text-ocean-text">
            {score.winRate.toFixed(1)}%
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-ocean-muted block uppercase">{t.compass.profitFactor}</span>
          <span className="text-xs font-mono font-bold text-ocean-cyan">
            {score.profitFactor.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Holding & Trades Count */}
      <div className="flex items-center justify-between text-[11px] font-mono text-ocean-muted">
        <span>{t.compass.totalTrades}: <strong className="text-ocean-text">{score.totalTrades}</strong></span>
        <span>{t.compass.avgHolding}: <strong className="text-ocean-text">{score.avgHoldingHours}s</strong></span>
        <span>{t.compass.totalPnl}: <strong className={score.totalPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>${(score.totalPnlUsd / 1000).toFixed(1)}k</strong></span>
      </div>

      {/* Action CTAs */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onCopyClick(score)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-ocean-cyan/15 hover:bg-ocean-cyan border border-ocean-cyan/30 hover:border-ocean-cyan text-ocean-cyan hover:text-ocean-abyss font-mono text-xs font-bold transition-all duration-200"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{language === 'tr' ? 'Sanal Kopyala' : 'Paper Copy'}</span>
        </button>

        <Link
          href={`/sonar?wallet=${score.address}`}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-ocean-border hover:border-ocean-cyan/50 bg-ocean-abyss/40 hover:bg-ocean-abyss text-xs font-mono text-ocean-muted hover:text-ocean-text transition-colors"
          title={language === 'tr' ? "Bu balinayı Sonar'da test et" : 'Backtest this whale in Sonar Lab'}
        >
          <LineChart className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{language === 'tr' ? "Sonar'da Test Et" : 'Backtest in Sonar'}</span>
        </Link>
      </div>
    </div>
  );
}
