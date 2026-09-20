import { describe, it, expect } from 'vitest';
import { classifyWhale, calculateWhaleDna } from '../src/analytics/whale-classifier';
import { calculateOceanCondition } from '../src/analytics/ocean-conditions';
import { generateWhatChangedFeed } from '../src/analytics/what-changed';
import { VerifiedMarketSnapshot, VerifiedPosition } from '../src/types/contracts';
import { PositionEvent } from '../src/db/repository';

describe('Analytics Engine Tests', () => {
  it('should correctly classify whales based on transparent exposure thresholds', () => {
    expect(classifyWhale(25_000)).toBe('FISH');
    expect(classifyWhale(49_999)).toBe('FISH');
    expect(classifyWhale(50_000)).toBe('DOLPHIN');
    expect(classifyWhale(249_999)).toBe('DOLPHIN');
    expect(classifyWhale(250_000)).toBe('SHARK');
    expect(classifyWhale(999_999)).toBe('SHARK');
    expect(classifyWhale(1_000_000)).toBe('HUMPBACK');
    expect(classifyWhale(5_000_000)).toBe('ORCA');
    expect(classifyWhale(20_000_000)).toBe('BLUE_WHALE');
    expect(classifyWhale(50_000_000)).toBe('SPERM_WHALE');
    expect(classifyWhale(150_000_000)).toBe('SPERM_WHALE');
  });

  it('should report insufficient history when events < 3 for Whale DNA', () => {
    const events: PositionEvent[] = [
      {
        walletAddress: '0x123',
        asset: 'BTC',
        eventType: 'OPEN',
        prevSize: 0,
        newSize: 10,
        deltaNotional: 940000,
        timestamp: 1000,
      },
    ];

    const dna = calculateWhaleDna(events, [], 940000);
    expect(dna.hasSufficientHistory).toBe(false);
    expect(dna.insufficientHistoryReason).toContain('Insufficient observed history');
  });

  it('should compute Whale DNA statistics when sufficient events exist', () => {
    const events: PositionEvent[] = [
      {
        walletAddress: '0x123',
        asset: 'BTC',
        eventType: 'OPEN',
        prevSize: 0,
        newSize: 10,
        deltaNotional: 940000,
        timestamp: Date.now() - 30000,
      },
      {
        walletAddress: '0x123',
        asset: 'BTC',
        eventType: 'INCREASE',
        prevSize: 10,
        newSize: 20,
        deltaNotional: 940000,
        timestamp: Date.now() - 20000,
      },
      {
        walletAddress: '0x123',
        asset: 'BTC',
        eventType: 'FLIP',
        prevSize: 20,
        newSize: 15,
        deltaNotional: 3290000,
        timestamp: Date.now() - 10000,
      },
    ];

    const positions: VerifiedPosition[] = [
      {
        asset: 'BTC',
        side: 'SHORT',
        size: 15,
        entryPrice: 94000,
        liquidationPrice: 110000,
        leverage: 10,
        unrealizedPnl: 12000,
      },
    ];

    const dna = calculateWhaleDna(events, positions, 1410000);
    expect(dna.hasSufficientHistory).toBe(true);
    expect(dna.flipFrequency30d).toBe(1);
    expect(dna.directionalBiasPercentLong).toBe(0); // 100% short
    expect(dna.marketConcentrationHhi).toBe(10000); // 100% BTC
  });

  it('should calculate Ocean Condition classifications with full transparency', () => {
    const calmSnapshots: VerifiedMarketSnapshot[] = [
      {
        asset: 'BTC',
        markPrice: 94000,
        oraclePrice: 94000,
        openInterest: 100000000,
        fundingRate: 0.00005, // very low funding
        volume24h: 500000000,
        observedTimestamp: 1000,
        source: 'hyperliquid:metaAndAssetCtxs',
      },
    ];

    const calmResult = calculateOceanCondition(calmSnapshots, calmSnapshots, 0);
    expect(calmResult.classification).toBe('CALM');

    // Extreme volatile scenario
    const stormSnapshots: VerifiedMarketSnapshot[] = [
      {
        asset: 'BTC',
        markPrice: 110000, // Massive 17% jump
        oraclePrice: 110000,
        openInterest: 200000000, // Doubled OI
        fundingRate: 0.0015, // High stress funding
        volume24h: 5000000000,
        observedTimestamp: 2000,
        source: 'hyperliquid:metaAndAssetCtxs',
      },
    ];

    const stormResult = calculateOceanCondition(stormSnapshots, calmSnapshots, -75000000);
    expect(stormResult.classification).toBe('STORM');
    expect(stormResult.underlyingMetrics.realizedVol1h).toBeGreaterThan(10);
  });

  it('should generate deterministic, non-speculative What Changed events', () => {
    const events: PositionEvent[] = [
      {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        asset: 'BTC',
        eventType: 'INCREASE',
        prevSize: 10,
        newSize: 30,
        deltaNotional: 1880000,
        timestamp: Date.now() - 300000,
      },
    ];

    const whatChanged = generateWhatChangedFeed([], [], events);
    expect(whatChanged).toHaveLength(1);
    expect(whatChanged[0].statement).toContain('increased exposure by $1.88M in BTC');
    expect(whatChanged[0].statement).not.toContain('pump');
    expect(whatChanged[0].statement).not.toContain('smart money');
  });
});
