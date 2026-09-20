import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface AlphaScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function AlphaScoreBadge({ score, size = 'md', showLabel = true }: AlphaScoreBadgeProps) {
  const { language } = useTranslation();
  let colorClasses = 'border-ocean-border bg-ocean-surface text-ocean-muted';
  let glowClasses = '';

  if (score >= 85) {
    colorClasses = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
    glowClasses = 'shadow-sm shadow-emerald-500/20';
  } else if (score >= 70) {
    colorClasses = 'border-ocean-cyan/40 bg-ocean-cyan/10 text-ocean-cyan';
    glowClasses = 'shadow-sm shadow-ocean-cyan/20';
  } else if (score >= 50) {
    colorClasses = 'border-amber-500/40 bg-amber-500/10 text-amber-400';
  } else {
    colorClasses = 'border-rose-500/40 bg-rose-500/10 text-rose-400';
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-bold',
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-semibold ${colorClasses} ${glowClasses} ${sizeClasses}`}
      title={language === 'tr' ? `Okyanus Alpha Puanı: ${score}/100` : `Ocean Alpha Score: ${score}/100`}
    >
      <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {showLabel && <span className="text-[10px] text-ocean-muted uppercase tracking-wider hidden sm:inline">ALPHA</span>}
      <span>{score.toFixed(1)}</span>
    </div>
  );
}
