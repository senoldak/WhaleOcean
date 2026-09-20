import { describe, it, expect } from 'vitest';
import {
  VerifiedMarketSnapshotSchema,
  VerifiedWalletObservationSchema,
  OceanConditionSchema,
  WhatChangedEventSchema,
  validateMarketSnapshot,
  validateWalletObservation,
} from '../src/types/contracts';

describe('Contracts & Anti-Fake Data Integrity Boundary', () => {
  it('should accept valid verified market snapshot from official Hyperliquid source', () => {
    const validSnapshot = {
      asset: 'BTC',
      markPrice: 94250.5,
      oraclePrice: 94248.0,
      openInterest: 125043000,
      fundingRate: 0.00012,
      volume24h: 840250000,
      observedTimestamp: Date.now(),
      source: 'hyperliquid:metaAndAssetCtxs' as const,
    };

    const parsed = VerifiedMarketSnapshotSchema.safeParse(validSnapshot);
    expect(parsed.success).toBe(true);
    expect(validateMarketSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it('should REJECT market snapshot with missing or invalid source (anti-fake guard)', () => {
    const fakeSnapshot = {
      asset: 'BTC',
      markPrice: 94250.5,
      oraclePrice: 94248.0,
      openInterest: 125043000,
      fundingRate: 0.00012,
      volume24h: 840250000,
      observedTimestamp: Date.now(),
      source: 'mock:generator', // Forbidden source
    };

    const parsed = VerifiedMarketSnapshotSchema.safeParse(fakeSnapshot);
    expect(parsed.success).toBe(false);
    expect(() => validateMarketSnapshot(fakeSnapshot as any)).toThrow(
      /Invalid market snapshot or unverified source/
    );
  });

  it('should REJECT market snapshot with invalid/negative numbers or missing timestamps', () => {
    const invalidPrice = {
      asset: 'BTC',
      markPrice: -500, // Impossible price
      oraclePrice: 94248.0,
      openInterest: 125043000,
      fundingRate: 0.00012,
      volume24h: 840250000,
      observedTimestamp: Date.now(),
      source: 'hyperliquid:metaAndAssetCtxs',
    };

    expect(VerifiedMarketSnapshotSchema.safeParse(invalidPrice).success).toBe(false);

    const missingTime = {
      asset: 'BTC',
      markPrice: 94250,
      oraclePrice: 94248,
      openInterest: 125000,
      fundingRate: 0.0001,
      volume24h: 840000,
      source: 'hyperliquid:metaAndAssetCtxs',
    };

    expect(VerifiedMarketSnapshotSchema.safeParse(missingTime).success).toBe(false);
  });

  it('should validate observed wallet observation with real 0x address and positions', () => {
    const validWallet = {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      whaleClass: 'ORCA' as const,
      totalNotionalExposure: 12500000,
      positions: [
        {
          asset: 'BTC',
          side: 'LONG' as const,
          size: 100,
          entryPrice: 92000,
          liquidationPrice: 81000,
          leverage: 10,
          unrealizedPnl: 225050,
        },
      ],
      observedTimestamp: Date.now(),
      source: 'hyperliquid:clearinghouseState' as const,
    };

    const parsed = VerifiedWalletObservationSchema.safeParse(validWallet);
    expect(parsed.success).toBe(true);
    expect(validateWalletObservation(validWallet)).toEqual(validWallet);
  });

  it('should REJECT fake wallet with invalid address or unverified source', () => {
    const invalidWallet = {
      walletAddress: 'fake-whale-wallet', // Not a valid 0x hex address
      whaleClass: 'ORCA',
      totalNotionalExposure: 12500000,
      positions: [],
      observedTimestamp: Date.now(),
      source: 'mock:test',
    };

    expect(VerifiedWalletObservationSchema.safeParse(invalidWallet).success).toBe(false);
    expect(() => validateWalletObservation(invalidWallet as any)).toThrow();
  });

  it('should validate Ocean Condition measurement with underlying metrics breakdown', () => {
    const validOcean = {
      timestamp: Date.now(),
      classification: 'RESTLESS' as const,
      volatilityScore: 68.5,
      oiChangePercent: 12.4,
      fundingStressScore: 45.0,
      whaleExposureDelta: -15400000,
      underlyingMetrics: {
        realizedVol1h: 0.034,
        oiDelta24h: 52000000,
        avgAbsFunding: 0.00035,
        netWhaleDelta1h: -15400000,
      },
    };

    expect(OceanConditionSchema.safeParse(validOcean).success).toBe(true);
  });

  it('should validate deterministic What Changed event', () => {
    const validEvent = {
      id: 'wc-123456',
      timestamp: Date.now(),
      category: 'EXPOSURE' as const,
      asset: 'BTC',
      statement: 'Observed whale net exposure in BTC increased by +$12.4M over the last 30 minutes.',
      deltaValue: 12400000,
      timeWindowMinutes: 30,
      source: 'verified_delta:position_events' as const,
    };

    expect(WhatChangedEventSchema.safeParse(validEvent).success).toBe(true);
  });
});
