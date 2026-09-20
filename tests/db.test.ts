import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { WhaleOceanRepository } from '../src/db/repository';
import { VerifiedMarketSnapshot, VerifiedWalletObservation } from '../src/types/contracts';

describe('Dual-Mode Persistence Layer (SQLite WAL)', () => {
  let db: DatabaseSync;
  let repo: WhaleOceanRepository;
  const testDbPath = path.resolve(__dirname, 'test_ocean.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new DatabaseSync(testDbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/db/schema.sql'), 'utf8');
    db.exec(schemaSql);
    repo = new WhaleOceanRepository(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
    const walFile = `${testDbPath}-wal`;
    const shmFile = `${testDbPath}-shm`;
    if (fs.existsSync(walFile)) try { fs.unlinkSync(walFile); } catch {}
    if (fs.existsSync(shmFile)) try { fs.unlinkSync(shmFile); } catch {}
  });

  it('should store and query verified market snapshots with deduplication of latest', () => {
    const snap1: VerifiedMarketSnapshot = {
      asset: 'BTC',
      markPrice: 94000,
      oraclePrice: 93990,
      openInterest: 100000000,
      fundingRate: 0.0001,
      volume24h: 500000000,
      observedTimestamp: 1000,
      source: 'hyperliquid:metaAndAssetCtxs',
    };
    const snap2: VerifiedMarketSnapshot = {
      asset: 'BTC',
      markPrice: 94500,
      oraclePrice: 94490,
      openInterest: 105000000,
      fundingRate: 0.00015,
      volume24h: 520000000,
      observedTimestamp: 2000,
      source: 'hyperliquid:metaAndAssetCtxs',
    };

    repo.saveMarketSnapshot(snap1);
    repo.saveMarketSnapshot(snap2);

    const latest = repo.getLatestMarketSnapshots();
    expect(latest).toHaveLength(1);
    expect(latest[0].markPrice).toBe(94500);
    expect(latest[0].observedTimestamp).toBe(2000);

    const history = repo.getMarketHistory('BTC');
    expect(history).toHaveLength(2);
    expect(history[0].markPrice).toBe(94000);
    expect(history[1].markPrice).toBe(94500);
  });

  it('should store wallet observation, upsert positions and record position events', () => {
    const wallet: VerifiedWalletObservation = {
      walletAddress: '0x1111111111111111111111111111111111111111',
      whaleClass: 'HUMPBACK',
      totalNotionalExposure: 3500000,
      positions: [
        {
          asset: 'ETH',
          side: 'LONG',
          size: 1000,
          entryPrice: 3200,
          liquidationPrice: 2800,
          leverage: 8,
          unrealizedPnl: 50000,
        },
      ],
      observedTimestamp: 5000,
      source: 'hyperliquid:clearinghouseState',
    };

    repo.saveWalletObservation(wallet);

    const wallets = repo.getObservedWallets();
    expect(wallets).toHaveLength(1);
    expect(wallets[0].address).toBe(wallet.walletAddress);
    expect(wallets[0].whaleClass).toBe('HUMPBACK');
    expect(wallets[0].positions).toHaveLength(1);
    expect(wallets[0].positions[0].asset).toBe('ETH');

    repo.recordPositionEvent({
      walletAddress: wallet.walletAddress,
      asset: 'ETH',
      eventType: 'INCREASE',
      prevSize: 800,
      newSize: 1000,
      deltaNotional: 640000,
      timestamp: 5000,
    });

    const events = repo.getPositionEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('INCREASE');
    expect(events[0].deltaNotional).toBe(640000);
  });

  it('should store and retrieve ocean condition measurements', () => {
    const condition = {
      timestamp: 10000,
      classification: 'STORM' as const,
      volatilityScore: 82.5,
      oiChangePercent: 18.2,
      fundingStressScore: 75.0,
      whaleExposureDelta: -45000000,
      underlyingMetrics: {
        realizedVol1h: 0.052,
        oiDelta24h: 120000000,
        avgAbsFunding: 0.0008,
        netWhaleDelta1h: -45000000,
      },
    };

    repo.saveOceanCondition(condition);
    const latest = repo.getLatestOceanCondition();
    expect(latest).not.toBeNull();
    expect(latest?.classification).toBe('STORM');
    expect(latest?.volatilityScore).toBe(82.5);
    expect(latest?.underlyingMetrics.realizedVol1h).toBe(0.052);
  });

  it('should store and retrieve What Changed events', () => {
    const event = {
      id: 'wc-1',
      timestamp: 15000,
      category: 'EXPOSURE' as const,
      asset: 'SOL',
      statement: 'Observed whale net exposure in SOL decreased by -$8.5M over 15 minutes.',
      deltaValue: -8500000,
      timeWindowMinutes: 15,
      source: 'verified_delta:position_events' as const,
    };

    repo.saveWhatChangedEvent(event);
    const events = repo.getRecentWhatChangedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].statement).toContain('SOL decreased');
  });
});
