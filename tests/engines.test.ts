import { describe, it, expect } from 'vitest';
import { calculateHuntZones, RawPositionWithWallet } from '../src/analytics/hunt-engine';
import { calculateGraveyardCasualties, RawGraveyardPosition } from '../src/analytics/graveyard-engine';
import { calculateMigrationFlows } from '../src/analytics/migration-engine';
import { calculateReefBarriers } from '../src/analytics/reef-engine';
import { clusterWalletsIntoPods, RawWalletWithPositions } from '../src/analytics/pods-cluster';
import { VerifiedMarketSnapshot } from '../src/types/contracts';
import { PositionEvent } from '../src/db/repository';

describe('Comprehensive Analytics Engines Tests', () => {
  describe('Hunt Engine (Liquidation Hunt Zones)', () => {
    it('should exclude breached or inverted liquidation prices and sort by risk priority', () => {
      const snapshots: VerifiedMarketSnapshot[] = [
        {
          asset: 'BTC',
          markPrice: 90000,
          oraclePrice: 90000,
          openInterest: 500000000,
          fundingRate: 0.00001,
          volume24h: 1000000000,
          observedTimestamp: Date.now(),
          source: 'hyperliquid:metaAndAssetCtxs',
        },
      ];

      const positions: RawPositionWithWallet[] = [
        // Valid LONG: liqPrice (88,000) < markPrice (90,000)
        {
          walletAddress: '0x1111111111111111111111111111111111111111',
          asset: 'BTC',
          side: 'LONG',
          size: 2,
          entryPrice: 92000,
          liquidationPrice: 88000,
          leverage: 20,
          unrealizedPnl: -4000,
        },
        // Inverted/breached LONG: liqPrice (91,000) >= markPrice (90,000) -> MUST be excluded
        {
          walletAddress: '0x2222222222222222222222222222222222222222',
          asset: 'BTC',
          side: 'LONG',
          size: 1,
          entryPrice: 95000,
          liquidationPrice: 91000,
          leverage: 25,
          unrealizedPnl: -5000,
        },
        // Valid SHORT: liqPrice (93,000) > markPrice (90,000)
        {
          walletAddress: '0x3333333333333333333333333333333333333333',
          asset: 'BTC',
          side: 'SHORT',
          size: 1,
          entryPrice: 88000,
          liquidationPrice: 93000,
          leverage: 15,
          unrealizedPnl: -2000,
        },
        // Inverted/breached SHORT: liqPrice (89,000) <= markPrice (90,000) -> MUST be excluded
        {
          walletAddress: '0x4444444444444444444444444444444444444444',
          asset: 'BTC',
          side: 'SHORT',
          size: 1,
          entryPrice: 85000,
          liquidationPrice: 89000,
          leverage: 20,
          unrealizedPnl: -5000,
        },
      ];

      const zones = calculateHuntZones(positions, snapshots);
      expect(zones).toHaveLength(1);

      const btcZone = zones[0];
      expect(btcZone.asset).toBe('BTC');
      // Only the 2 valid positions should be included
      expect(btcZone.vulnerablePositions).toHaveLength(2);
      expect(btcZone.nearestLongLiqPrice).toBe(88000);
      expect(btcZone.nearestShortLiqPrice).toBe(93000);
      expect(btcZone.longLiquidationExposure).toBe(2 * 92000);
      expect(btcZone.shortLiquidationExposure).toBe(1 * 88000);
    });
  });

  describe('Graveyard Engine (Casualties & ROE)', () => {
    it('should filter underwater positions and calculate margin-based ROE percentage', () => {
      const positions: RawGraveyardPosition[] = [
        // Not enough underwater (PnL >= -$25k) -> should be excluded
        {
          walletAddress: '0x1111111111111111111111111111111111111111',
          whaleClass: 'SHARK',
          asset: 'ETH',
          side: 'LONG',
          size: 10,
          entryPrice: 3000,
          liquidationPrice: 2700,
          unrealizedPnl: -5000,
          leverage: 10,
        },
        // Deeply underwater position with 10x leverage
        // Notional = 100 * 3000 = $300,000. Margin = 300,000 / 10 = $30,000.
        // PnL = -$30,000 -> ROE = (-30000 / 30000) * 100 = -100%
        {
          walletAddress: '0x2222222222222222222222222222222222222222',
          whaleClass: 'HUMPBACK',
          asset: 'ETH',
          side: 'LONG',
          size: 100,
          entryPrice: 3000,
          liquidationPrice: 2700,
          unrealizedPnl: -30000,
          leverage: 10,
        },
      ];

      const casualties = calculateGraveyardCasualties(positions);
      expect(casualties).toHaveLength(1);

      const casualty = casualties[0];
      expect(casualty.walletAddress).toBe('0x2222222222222222222222222222222222222222');
      expect(casualty.unrealizedPnl).toBe(-30000);
      expect(casualty.pnlPercentage).toBe(-100);
      expect(casualty.notionalExposure).toBe(300000);
      expect(casualty.mortalityRisk).toBe('CRITICAL_RISK');
    });
  });

  describe('Migration Engine (Capital Flow Dynamics)', () => {
    it('should correctly partition FLIP events and compute net flows', () => {
      const now = Date.now();
      const events: PositionEvent[] = [
        // Open BTC $200k
        {
          walletAddress: '0x111',
          asset: 'BTC',
          eventType: 'OPEN',
          prevSize: 0,
          newSize: 2,
          deltaNotional: 200000,
          timestamp: now - 5000,
        },
        // Flip BTC: prevSize 2, newSize 3, deltaNotional 500k
        // Outflow = 500k * (2/5) = 200k, Inflow = 500k * (3/5) = 300k
        {
          walletAddress: '0x111',
          asset: 'BTC',
          eventType: 'FLIP',
          prevSize: 2,
          newSize: 3,
          deltaNotional: 500000,
          timestamp: now - 3000,
        },
        // Close SOL $150k
        {
          walletAddress: '0x222',
          asset: 'SOL',
          eventType: 'CLOSE',
          prevSize: 1000,
          newSize: 0,
          deltaNotional: 150000,
          timestamp: now - 2000,
        },
      ];

      const flows = calculateMigrationFlows(events);
      expect(flows).toHaveLength(2);

      const btcFlow = flows.find(f => f.asset === 'BTC')!;
      expect(btcFlow).toBeDefined();
      expect(btcFlow.inflowNotional).toBe(200000 + 300000); // 500k
      expect(btcFlow.outflowNotional).toBe(200000); // 200k
      expect(btcFlow.netFlowNotional).toBe(300000); // +300k
      expect(btcFlow.dominantTrend).toBe('ACCUMULATING');

      const solFlow = flows.find(f => f.asset === 'SOL')!;
      expect(solFlow).toBeDefined();
      expect(solFlow.inflowNotional).toBe(0);
      expect(solFlow.outflowNotional).toBe(150000);
      expect(solFlow.netFlowNotional).toBe(-150000);
      expect(solFlow.dominantTrend).toBe('DISTRIBUTING');
    });
  });

  describe('Reef Engine (Support & Resistance Barriers)', () => {
    it('should bound concentration ratio and score liquidity', () => {
      const snapshots: VerifiedMarketSnapshot[] = [
        {
          asset: 'BTC',
          markPrice: 90000,
          oraclePrice: 90000,
          openInterest: 1000000000, // $1B OI -> DEEP_REEF
          fundingRate: 0.00001,
          volume24h: 500000000,
          observedTimestamp: Date.now(),
          source: 'hyperliquid:metaAndAssetCtxs',
        },
        {
          asset: 'MEME',
          markPrice: 1,
          oraclePrice: 1,
          openInterest: 10000000, // $10M OI -> SHALLOW_REEF
          fundingRate: -0.0002,
          volume24h: 2000000,
          observedTimestamp: Date.now(),
          source: 'hyperliquid:metaAndAssetCtxs',
        },
      ];

      const positions = [
        { asset: 'BTC', size: 1000, entryPrice: 90000 }, // $90M -> 9% concentration
        { asset: 'MEME', size: 8000000, entryPrice: 1 }, // $8M -> 80% concentration
      ];

      const barriers = calculateReefBarriers(snapshots, positions);
      expect(barriers).toHaveLength(2);

      const btcBarrier = barriers.find(b => b.asset === 'BTC')!;
      expect(btcBarrier.depthTier).toBe('DEEP_REEF');
      expect(btcBarrier.whaleConcentrationRatio).toBe(9);
      expect(btcBarrier.barrierHealth).toBe('ROBUST');

      const memeBarrier = barriers.find(b => b.asset === 'MEME')!;
      expect(memeBarrier.depthTier).toBe('SHALLOW_REEF');
      expect(memeBarrier.whaleConcentrationRatio).toBe(80);
      expect(memeBarrier.barrierHealth).toBe('FRAGILE');
    });
  });

  describe('Pods Engine (Co-movement Clusters)', () => {
    it('should cluster wallets into pods when at least 2 members have >= $25k exposure', () => {
      const wallets: RawWalletWithPositions[] = [
        {
          address: '0x1111111111111111111111111111111111111111',
          whaleClass: 'SHARK',
          totalObservedExposure: 100000,
          positions: [
            {
              asset: 'BTC',
              side: 'LONG',
              size: 1,
              entryPrice: 90000,
              leverage: 10,
              unrealizedPnl: 1000,
            },
          ],
        },
        {
          address: '0x2222222222222222222222222222222222222222',
          whaleClass: 'ORCA',
          totalObservedExposure: 500000,
          positions: [
            {
              asset: 'BTC',
              side: 'LONG',
              size: 2,
              entryPrice: 90000,
              leverage: 10,
              unrealizedPnl: 2000,
            },
          ],
        },
      ];

      const pods = clusterWalletsIntoPods(wallets);
      expect(pods).toHaveLength(1);

      const btcPod = pods[0];
      expect(btcPod.asset).toBe('BTC');
      expect(btcPod.dominantSide).toBe('LONG');
      expect(btcPod.memberCount).toBe(2);
      expect(btcPod.concordanceScore).toBe(100);
      expect(btcPod.totalPodExposure).toBe(90000 + 180000);
    });
  });
});
