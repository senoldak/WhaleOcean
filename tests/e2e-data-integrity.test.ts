import { describe, it, expect } from 'vitest';
import {
  VerifiedMarketSnapshotSchema,
  VerifiedWalletObservationSchema,
  validateMarketSnapshot,
  validateWalletObservation,
} from '../src/types/contracts';
import { calculateWhaleDna } from '../src/analytics/whale-classifier';
import { generateWhatChangedFeed } from '../src/analytics/what-changed';
import { PositionEvent } from '../src/db/repository';

describe('End-to-End Data Integrity & Anti-Fake Audit', () => {
  it('AUDIT: strictly rejects mock market data injection attempts', () => {
    const mockPayloads = [
      {
        asset: 'BTC',
        markPrice: 100000,
        oraclePrice: 100000,
        openInterest: 50000000,
        fundingRate: 0.0001,
        volume24h: 1000000,
        observedTimestamp: Date.now(),
        source: 'mock:test', // Fake source
      },
      {
        asset: 'ETH',
        markPrice: 3500,
        oraclePrice: 3500,
        openInterest: 10000000,
        fundingRate: 0.0001,
        volume24h: 200000,
        observedTimestamp: Date.now(),
        source: 'binance:public', // External source not permitted for Hyperliquid metrics
      },
      {
        asset: 'SOL',
        markPrice: -150, // Impossible negative price
        oraclePrice: 150,
        openInterest: 5000000,
        fundingRate: 0.0001,
        volume24h: 100000,
        observedTimestamp: Date.now(),
        source: 'hyperliquid:metaAndAssetCtxs',
      },
    ];

    for (const mock of mockPayloads) {
      expect(VerifiedMarketSnapshotSchema.safeParse(mock).success).toBe(false);
      expect(() => validateMarketSnapshot(mock)).toThrow();
    }
  });

  it('AUDIT: strictly rejects fake wallet names and invalid addresses', () => {
    const fakeWallets = [
      {
        walletAddress: 'whale_insider_123', // Not 0x hex
        whaleClass: 'BLUE_WHALE',
        totalNotionalExposure: 50000000,
        positions: [],
        observedTimestamp: Date.now(),
        source: 'hyperliquid:clearinghouseState',
      },
      {
        walletAddress: '0x1234', // Too short
        whaleClass: 'ORCA',
        totalNotionalExposure: 10000000,
        positions: [],
        observedTimestamp: Date.now(),
        source: 'hyperliquid:clearinghouseState',
      },
      {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        whaleClass: 'ORCA',
        totalNotionalExposure: 10000000,
        positions: [],
        observedTimestamp: Date.now(),
        source: 'mock:generator', // Fake source
      },
    ];

    for (const wallet of fakeWallets) {
      expect(VerifiedWalletObservationSchema.safeParse(wallet).success).toBe(false);
      expect(() => validateWalletObservation(wallet)).toThrow();
    }
  });

  it('AUDIT: never fabricates Whale DNA when history is insufficient', () => {
    const dnaEmpty = calculateWhaleDna([], [], 1000000);
    expect(dnaEmpty.hasSufficientHistory).toBe(false);
    expect(dnaEmpty.directionalBiasPercentLong).toBeNull();
    expect(dnaEmpty.marketConcentrationHhi).toBeNull();
    expect(dnaEmpty.flipFrequency30d).toBeNull();
  });

  it('AUDIT: ensures What Changed feed contains ZERO speculative or hype terminology', () => {
    const events: PositionEvent[] = [
      {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        asset: 'BTC',
        eventType: 'INCREASE',
        prevSize: 10,
        newSize: 40,
        deltaNotional: 2820000,
        timestamp: Date.now() - 60000,
      },
    ];

    const feed = generateWhatChangedFeed([], [], events);
    const BANNED_WORDS = [
      'pump',
      'dump',
      'moon',
      'smart money',
      'guaranteed',
      'secret',
      '100x',
      'insider',
      'alpha',
      'buy now',
      'sell now',
    ];

    for (const item of feed) {
      const lower = item.statement.toLowerCase();
      for (const banned of BANNED_WORDS) {
        expect(lower).not.toContain(banned);
      }
    }
  });
});
