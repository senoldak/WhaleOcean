import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WhaleCard } from '../src/components/compass/WhaleCard';
import { CompassRadar } from '../src/components/compass/CompassRadar';
import { WalletAlphaScore } from '../src/types/contracts';

describe('COMPASS Page & Whale Alpha Radar Components', () => {
  const mockScore: WalletAlphaScore = {
    address: '0x1234567890123456789012345678901234567890',
    oceanAlphaScore: 91.5,
    persona: 'ORCA',
    riskTier: 'BALANCED',
    sharpeRatio: 2.3,
    sortinoRatio: 3.1,
    maxDrawdown: 11.2,
    profitFactor: 2.4,
    winRate: 64.0,
    totalTrades: 32,
    avgHoldingHours: 14.5,
    totalPnlUsd: 185000,
    liquidationDistanceScore: 88,
    lastEvaluatedAt: Date.now(),
  };

  it('should render WhaleCard with alpha score, persona, and key metrics in Turkish default', () => {
    const html = renderToStaticMarkup(
      <WhaleCard
        score={mockScore}
        onCopyClick={() => {}}
      />
    );

    expect(html).toContain('91.5');
    expect(html).toContain('ORCA');
    expect(html).toContain('DENGELİ');
    expect(html).toContain('2.30'); // Sharpe
    expect(html).toContain('11.2%'); // Drawdown
    expect(html).toContain('64.0%'); // Win Rate
    expect(html).toContain('Sanal Kopyala');
    expect(html).toContain('href="/sonar?wallet=0x1234567890123456789012345678901234567890"');
  });

  it('should render CompassRadar with filter buttons and cards list in Turkish default', () => {
    const html = renderToStaticMarkup(
      <CompassRadar initialRecommendations={[mockScore]} />
    );

    expect(html).toContain('Balina Alpha Radarı');
    expect(html).toContain('TRITON');
    expect(html).toContain('ORCA');
    expect(html).toContain('LEVIATHAN');
    expect(html).toContain('0x1234...7890');
  });
});
