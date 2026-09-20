import { describe, it, expect } from 'vitest';
import { calculateWalletCorrelationMatrix } from '../src/analytics/correlation/wallet-correlation-engine';
import { PositionEvent } from '../src/db/repository';

describe('Wallet Correlation & Syndicate Detection Engine', () => {
  it('computes symmetric NxN correlation matrix with 1.0 on diagonals', () => {
    const wallets = [
      {
        address: '0x1111111111111111111111111111111111111111',
        positions: [{ asset: 'BTC', side: 'LONG' as const, size: 10, entryPrice: 90000, leverage: 3 }],
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        positions: [{ asset: 'BTC', side: 'LONG' as const, size: 8, entryPrice: 90200, leverage: 3 }],
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        positions: [{ asset: 'BTC', side: 'SHORT' as const, size: 5, entryPrice: 91000, leverage: 2 }],
      },
    ];

    const res = calculateWalletCorrelationMatrix(wallets);
    expect(res.wallets.length).toBe(3);
    expect(res.matrix[0][0]).toBe(1.0);
    expect(res.matrix[1][1]).toBe(1.0);
    expect(res.matrix[2][2]).toBe(1.0);
    expect(res.matrix[0][1]).toBeCloseTo(res.matrix[1][0], 2);

    // Wallets 1 and 2 are both Long BTC -> High positive correlation
    expect(res.matrix[0][1]).toBeGreaterThan(0.70);
    // Wallets 1 and 3 are Long vs Short BTC -> Negative correlation
    expect(res.matrix[0][2]).toBeLessThan(0);

    // Syndicate detection should flag wallet 1 and 2
    const syndicate = res.syndicateClusters.find(c =>
      c.wallets.includes('0x1111111111111111111111111111111111111111') &&
      c.wallets.includes('0x2222222222222222222222222222222222222222')
    );
    expect(syndicate).toBeDefined();
    expect(syndicate?.warningMessage).toContain('Sendika');
  });

  it('determines Lead-Lag latency when historical position events exist', () => {
    const now = Date.now();
    const wallets = [
      {
        address: '0x1111111111111111111111111111111111111111',
        positions: [{ asset: 'ETH', side: 'LONG' as const, size: 100, entryPrice: 3000, leverage: 5 }],
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        positions: [{ asset: 'ETH', side: 'LONG' as const, size: 80, entryPrice: 3010, leverage: 5 }],
      },
    ];

    const eventHistories = new Map<string, PositionEvent[]>();
    // Wallet 1 trades 15 minutes before Wallet 2
    eventHistories.set('0x1111111111111111111111111111111111111111', [
      { walletAddress: '0x1111111111111111111111111111111111111111', asset: 'ETH', eventType: 'OPEN', prevSize: 0, newSize: 100, deltaNotional: 300000, timestamp: now - 3600000 },
    ]);
    eventHistories.set('0x2222222222222222222222222222222222222222', [
      { walletAddress: '0x2222222222222222222222222222222222222222', asset: 'ETH', eventType: 'OPEN', prevSize: 0, newSize: 80, deltaNotional: 240000, timestamp: now - 2700000 },
    ]);

    const res = calculateWalletCorrelationMatrix(wallets, eventHistories);
    const pair = res.pairs.find(
      p =>
        (p.walletA === wallets[0].address && p.walletB === wallets[1].address) ||
        (p.walletA === wallets[1].address && p.walletB === wallets[0].address)
    );

    expect(pair).toBeDefined();
    expect(pair?.leadLag).toBeDefined();
    expect(pair?.leadLag?.leader).toBe('0x1111111111111111111111111111111111111111');
    expect(pair?.leadLag?.follower).toBe('0x2222222222222222222222222222222222222222');
    expect(pair?.leadLag?.medianLagMinutes).toBeCloseTo(15, 0);
  });
});
