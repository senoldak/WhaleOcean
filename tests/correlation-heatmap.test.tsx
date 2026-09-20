import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CorrelationHeatmap } from '../src/components/sonar/CorrelationHeatmap';
import { CorrelationMatrixResult } from '../src/analytics/correlation/wallet-correlation-engine';
import { SmartBasketRecommendation } from '../src/analytics/recommendations/smart-basket';

describe('CorrelationHeatmap Component', () => {
  const mockData: CorrelationMatrixResult & { smartBasket?: SmartBasketRecommendation } = {
    wallets: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
    ],
    matrix: [
      [1.0, 0.85, 0.10],
      [0.85, 1.0, 0.05],
      [0.10, 0.05, 1.0],
    ],
    pairs: [
      {
        walletA: '0x1111111111111111111111111111111111111111',
        walletB: '0x2222222222222222222222222222222222222222',
        correlation: 0.85,
        positionSimilarity: 0.85,
        returnCorrelation: 0.85,
        sharedAssets: ['BTC', 'ETH'],
        isSyndicateWarning: true,
        leadLag: {
          leader: '0x1111111111111111111111111111111111111111',
          follower: '0x2222222222222222222222222222222222222222',
          medianLagMinutes: 14.5,
        },
      },
    ],
    syndicateClusters: [
      {
        id: 'syn_1',
        wallets: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
        ],
        meanCorrelation: 0.85,
        dominantDirection: 'LONG',
        warningMessage: 'Sendika / Kopya Bot Kümesi Uyarısı',
      },
    ],
    smartBasket: {
      basketId: 'basket_1',
      title: 'Optimal Korelasyonsuz Alfa Sepeti',
      description: 'Düşük korelasyonlu sepet',
      targetCapital: 100000,
      expectedSharpe: 2.15,
      maxPairwiseCorrelation: 0.10,
      items: [
        {
          address: '0x1111111111111111111111111111111111111111',
          whaleClass: 'LEVIATHAN',
          dominantAsset: 'BTC',
          consistencyScore: 90,
          sharpe3M: 2.2,
          maxDrawdown: 8.5,
          weightPct: 55,
          allocatedUsd: 55000,
          role: 'CORE_ALPHA',
        },
        {
          address: '0x3333333333333333333333333333333333333333',
          whaleClass: 'TRITON',
          dominantAsset: 'SOL',
          consistencyScore: 86,
          sharpe3M: 2.1,
          maxDrawdown: 10.0,
          weightPct: 45,
          allocatedUsd: 45000,
          role: 'HEDGE',
        },
      ],
      generatedAt: Date.now(),
    },
  };

  it('renders heatmap grid, syndicate warnings, and smart basket card', () => {
    const html = renderToStaticMarkup(<CorrelationHeatmap initialData={mockData} />);

    expect(html).toContain('0x1111...1111');
    expect(html).toContain('0.85');
    expect(html).toContain('Sendika / Kopya Bot Kümesi');
    expect(html).toContain('Optimal Korelasyonsuz Alfa Sepeti');
    expect(html).toContain('%55');
    expect(html).toContain('%45');
    expect(html).toContain('HELM');
  });
});
