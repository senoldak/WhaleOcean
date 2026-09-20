import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MultiHorizonMatrix } from '../src/components/sonar/MultiHorizonMatrix';
import { MultiHorizonWalletResult } from '../src/analytics/backtest/multi-horizon-engine';

describe('MultiHorizonMatrix Component', () => {
  const mockResults: MultiHorizonWalletResult[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      whaleClass: 'ORCA',
      dominantAsset: 'BTC',
      metrics1M: { horizon: '1M', days: 30, totalReturnPct: 15.5, totalReturnUsd: 15500, sharpeRatio: 2.2, sortinoRatio: 3.1, maxDrawdownPct: 5.2, winRatePct: 65, totalTrades: 12 },
      metrics3M: { horizon: '3M', days: 90, totalReturnPct: 45.2, totalReturnUsd: 45200, sharpeRatio: 2.0, sortinoRatio: 2.8, maxDrawdownPct: 8.4, winRatePct: 61, totalTrades: 35 },
      metrics6M: { horizon: '6M', days: 180, totalReturnPct: 88.0, totalReturnUsd: 88000, sharpeRatio: 1.9, sortinoRatio: 2.6, maxDrawdownPct: 10.1, winRatePct: 59, totalTrades: 72 },
      consistencyScore: 92,
      regimeResilience: 'ROBUST',
      lastEvaluatedAt: Date.now(),
    },
    {
      address: '0x9999999999999999999999999999999999999999',
      whaleClass: 'LEVIATHAN',
      dominantAsset: 'ETH',
      metrics1M: { horizon: '1M', days: 30, totalReturnPct: -5.0, totalReturnUsd: -5000, sharpeRatio: -0.4, sortinoRatio: -0.5, maxDrawdownPct: 22.0, winRatePct: 40, totalTrades: 15 },
      metrics3M: { horizon: '3M', days: 90, totalReturnPct: 10.0, totalReturnUsd: 10000, sharpeRatio: 0.5, sortinoRatio: 0.6, maxDrawdownPct: 35.0, winRatePct: 45, totalTrades: 42 },
      metrics6M: { horizon: '6M', days: 180, totalReturnPct: -15.0, totalReturnUsd: -15000, sharpeRatio: -0.2, sortinoRatio: -0.3, maxDrawdownPct: 42.0, winRatePct: 42, totalTrades: 90 },
      consistencyScore: 35,
      regimeResilience: 'FRAGILE',
      lastEvaluatedAt: Date.now(),
    },
  ];

  it('renders table headers, consistency badges, and wallet rows correctly', () => {
    const html = renderToStaticMarkup(
      <MultiHorizonMatrix initialResults={mockResults} />
    );

    expect(html).toContain('0x1234...7890');
    expect(html).toContain('92');
    expect(html).toContain('+15.50%');
    expect(html).toContain('+45.20%');
    expect(html).toContain('GÜÇLÜ');
    expect(html).toContain('0x9999...9999');
    expect(html).toContain('35');
  });
});
