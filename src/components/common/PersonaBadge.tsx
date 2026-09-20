import React from 'react';
import { OceanPersona } from '@/types/contracts';
import { Anchor, Compass, Zap } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface PersonaBadgeProps {
  persona: OceanPersona;
  size?: 'sm' | 'md';
}

export function PersonaBadge({ persona, size = 'md' }: PersonaBadgeProps) {
  const { language } = useTranslation();
  const isSm = size === 'sm';

  switch (persona) {
    case 'TRITON':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded-md border border-teal-500/30 bg-teal-500/10 text-teal-300 ${
            isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
          title={language === 'tr' ? 'Triton: Düşük kaldıraç, fonlama getirisi ve istikrarlı sermaye koruma' : 'Triton: Low leverage, funding carry & steady capital preservation'}
        >
          <Anchor className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          <span>TRITON</span>
          <span className="text-teal-400/60 font-sans text-[10px] hidden sm:inline">
            &bull; {language === 'tr' ? 'Taşıma' : 'Carry'}
          </span>
        </span>
      );
    case 'ORCA':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded-md border border-ocean-cyan/30 bg-ocean-cyan/10 text-ocean-cyan ${
            isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
          title={language === 'tr' ? 'Orca: Trend takipçisi, momentum ve yüksek kâr faktörü' : 'Orca: Trend follower, directional momentum & high profit factor'}
        >
          <Compass className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          <span>ORCA</span>
          <span className="text-ocean-cyan/60 font-sans text-[10px] hidden sm:inline">&bull; Trend</span>
        </span>
      );
    case 'LEVIATHAN':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 ${
            isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
          title={language === 'tr' ? "Leviathan: Çevik fırtına scalper'ı, yüksek volatilite işlemcisi" : 'Leviathan: Agile storm scalper, high volatility trader'}
        >
          <Zap className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          <span>LEVIATHAN</span>
          <span className="text-purple-400/60 font-sans text-[10px] hidden sm:inline">
            &bull; {language === 'tr' ? 'Fırtına' : 'Storm'}
          </span>
        </span>
      );
    default:
      return null;
  }
}
