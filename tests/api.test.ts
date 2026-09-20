import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { WhaleOceanRepository } from '../src/db/repository';
import { closeDb } from '../src/db/client';
import {
  getMarketsData,
  getWhalesData,
  getWhaleProfile,
  getOceanConditionsData,
  getWhatChangedData,
  getAppServices,
} from '../src/services/app-service';

describe('App Services & API Data Layer', () => {
  const testDbPath = path.resolve(__dirname, 'test_api_ocean.db');

  beforeAll(() => {
    process.env.SQLITE_DB_PATH = testDbPath;
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }

    const { repo } = getAppServices();

    // Seed test snapshot
    repo.saveMarketSnapshot({
      asset: 'BTC',
      markPrice: 94500,
      oraclePrice: 94490,
      openInterest: 150000000,
      fundingRate: 0.0001,
      volume24h: 900000000,
      observedTimestamp: Date.now(),
      source: 'hyperliquid:metaAndAssetCtxs',
    });

    // Seed test wallet
    repo.saveWalletObservation({
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      whaleClass: 'ORCA',
      totalNotionalExposure: 15000000,
      positions: [
        {
          asset: 'BTC',
          side: 'LONG',
          size: 150,
          entryPrice: 92000,
          liquidationPrice: 75000,
          leverage: 10,
          unrealizedPnl: 375000,
        },
      ],
      observedTimestamp: Date.now(),
      source: 'hyperliquid:clearinghouseState',
    });
  });

  afterAll(() => {
    const { collector } = getAppServices();
    collector.stop();
    closeDb();
    delete process.env.SQLITE_DB_PATH;
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    const walFile = `${testDbPath}-wal`;
    const shmFile = `${testDbPath}-shm`;
    if (fs.existsSync(walFile)) try { fs.unlinkSync(walFile); } catch {}
    if (fs.existsSync(shmFile)) try { fs.unlinkSync(shmFile); } catch {}
  });

  it('should retrieve markets data with snapshots and health', async () => {
    const data = await getMarketsData();
    expect(data.snapshots).toHaveLength(1);
    expect(data.snapshots[0].asset).toBe('BTC');
    expect(data.health).toBeDefined();
  });

  it('should retrieve whales data with active positions', async () => {
    const data = await getWhalesData();
    expect(data.wallets).toHaveLength(1);
    expect(data.wallets[0].whaleClass).toBe('ORCA');
    expect(data.wallets[0].positions).toHaveLength(1);
  });

  it('should retrieve whale profile with calculated DNA', async () => {
    const profile = await getWhaleProfile('0x1234567890abcdef1234567890abcdef12345678');
    expect(profile).not.toBeNull();
    expect(profile?.whaleClass).toBe('ORCA');
    expect(profile?.dna).toBeDefined();
  });

  it('should retrieve ocean conditions data with measurements', async () => {
    const condition = await getOceanConditionsData();
    expect(condition).toBeDefined();
    expect(condition?.classification).toBeDefined();
    expect(condition?.underlyingMetrics).toBeDefined();
  });

  it('should retrieve What Changed factual events', async () => {
    const events = await getWhatChangedData();
    expect(Array.isArray(events)).toBe(true);
  });
});
