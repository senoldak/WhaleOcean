'use client';

import React from 'react';
import { useTranslation } from '@/i18n/LanguageContext';

interface OceanDeckHeaderProps {
  walletCount: number;
  marketCount: number;
}

export function OceanDeckHeader({ walletCount, marketCount }: OceanDeckHeaderProps) {
  const { t, language } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-ocean-border/60 pb-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
          {t.ocean.title}
        </h1>
        <p className="text-xs text-ocean-muted mt-1 font-mono">
          {t.ocean.subtitle}
        </p>
      </div>
      <div className="text-right text-[11px] font-mono text-ocean-muted">
        <span>{t.ocean.observedUniverse} </span>
        <span className="text-ocean-cyan font-bold">
          {walletCount} {language === 'tr' ? 'Cüzdan' : 'Wallets'}
        </span>
        <span className="mx-2">&bull;</span>
        <span>{t.ocean.activeMarkets} </span>
        <span className="text-ocean-cyan font-bold">
          {marketCount} {language === 'tr' ? 'Varlık' : 'Assets'}
        </span>
      </div>
    </div>
  );
}
