import { describe, it, expect } from 'vitest';
import { generateSmartBasket } from '../src/analytics/recommendations/smart-basket';
import { MultiHorizonWalletResult } from '../src/analytics/backtest/multi-horizon-engine';
import { CorrelationMatrixResult } from '../src/analytics/correlation/wallet-correlation-engine';

describe('Smart Basket Optimization Engine', () => {
  it('constructs an uncorrelated basket with risk-parity weights summing to 100%', () => {
    const candidates: MultiHorizonWalletResult[] = [
      {
        address: '0x1111111111111111111111111111111111111111',
        whaleClass: 'LEVIATHAN',
        dominantAsset: 'BTC',
        metrics1M: { horizon: '1M', days: 30, totalReturnPct: 15, totalReturnUsd: 15000, sharpeRatio: 2.2, sortinoRatio: 3, maxDrawdownPct: 8, winRatePct: 65, totalTrades: 10 },
        metrics3M: { horizon: '3M', days: 90, totalReturnPct: 40, totalReturnUsd: 40000, sharpeRatio: 2.1, sortinoRatio: 2.8, maxDrawdownPct: 10, winRatePct: 62, totalTrades: 30 },
        metrics6M: { horizon: '6M', days: 180, totalReturnPct: 75, totalReturnUsd: 75000, sharpeRatio: 2.0, sortinoRatio: 2.6, maxDrawdownPct: 12, winRatePct: 60, totalTrades: 60 },
        consistencyScore: 88,
        regimeResilience: 'ROBUST',
        lastEvaluatedAt: Date.now(),
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        whaleClass: 'ORCA',
        dominantAsset: 'ETH',
        metrics1M: { horizon: '1M', days: 30, totalReturnPct: 12, totalReturnUsd: 12000, sharpeRatio: 1.9, sortinoRatio: 2.5, maxDrawdownPct: 6, winRatePct: 60, totalTrades: 12 },
        metrics3M: { horizon: '3M', days: 90, totalReturnPct: 35, totalReturnUsd: 35000, sharpeRatio: 1.8, sortinoRatio: 2.4, maxDrawdownPct: 8, winRatePct: 58, totalTrades: 32 },
        metrics6M: { horizon: '6M', days: 180, totalReturnPct: 65, totalReturnUsd: 65000, sharpeRatio: 1.7, sortinoRatio: 2.2, maxDrawdownPct: 10, winRatePct: 55, totalTrades: 58 },
        consistencyScore: 82,
        regimeResilience: 'ROBUST',
        lastEvaluatedAt: Date.now(),
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        whaleClass: 'TRITON',
        dominantAsset: 'SOL',
        metrics1M: { horizon: '1M', days: 30, totalReturnPct: 20, totalReturnUsd: 20000, sharpeRatio: 2.5, sortinoRatio: 3.2, maxDrawdownPct: 14, winRatePct: 70, totalTrades: 15 },
        metrics3M: { horizon: '3M', days: 90, totalReturnPct: 50, totalReturnUsd: 50000, sharpeRatio: 2.3, sortinoRatio: 2.9, maxDrawdownPct: 15, winRatePct: 65, totalTrades: 40 },
        metrics6M: { horizon: '6M', days: 180, totalReturnPct: 90, totalReturnUsd: 90000, sharpeRatio: 2.1, sortinoRatio: 2.7, maxDrawdownPct: 18, winRatePct: 62, totalTrades: 80 },
        consistencyScore: 85,
        regimeResilience: 'ROBUST',
        lastEvaluatedAt: Date.now(),
      },
    ];

    const corrMatrix: CorrelationMatrixResult = {
      wallets: candidates.map(c => c.address),
      matrix: [
        [1.0, 0.15, 0.20],
        [0.15, 1.0, 0.10],
        [0.20, 0.10, 1.0],
      ],
      pairs: [],
      syndicateClusters: [],
    };

    const basket = generateSmartBasket(candidates, corrMatrix, 100000);
    expect(basket.items.length).toBeGreaterThanOrEqual(2);
    expect(basket.maxPairwiseCorrelation).toBeLessThanOrEqual(0.35);

    const totalWeight = basket.items.reduce((acc, i) => acc + i.weightPct, 0);
    expect(Math.round(totalWeight)).toBe(100);

    const totalAllocated = basket.items.reduce((acc, i) => acc + i.allocatedUsd, 0);
    expect(Math.round(totalAllocated)).toBe(100000);

    expect(basket.items[0].role).toBeDefined();
    expect(basket.items[0].allocatedUsd).toBeGreaterThan(0);
  });
});
