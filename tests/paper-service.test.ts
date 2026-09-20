import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { WhaleOceanRepository, PositionEvent } from '../src/db/repository';
import {
  placePaperOrder,
  closePaperPosition,
  updateMarkToMarket,
  processWhaleEventForCopyTrading,
} from '../src/analytics/paper-trading/paper-service';
import { VerifiedMarketSnapshot } from '../src/types/contracts';

describe('Paper Trading Service (HELM)', () => {
  let db: DatabaseSync;
  let repo: WhaleOceanRepository;
  const testDbPath = path.resolve(__dirname, 'test_paper_service.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    db = new DatabaseSync(testDbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/db/schema.sql'), 'utf8');
    db.exec(schemaSql);
    repo = new WhaleOceanRepository(db);
    repo.getOrCreatePaperPortfolio('default');
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    const wal = `${testDbPath}-wal`;
    const shm = `${testDbPath}-shm`;
    if (fs.existsSync(wal)) try { fs.unlinkSync(wal); } catch {}
    if (fs.existsSync(shm)) try { fs.unlinkSync(shm); } catch {}
  });

  it('should place a manual paper order with margin deduction, fee, and slippage', () => {
    const pos = placePaperOrder({
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG',
      notional: 10000,
      leverage: 5,
      currentMarketPrice: 90000,
      takeProfit: 95000,
      stopLoss: 87000,
    }, repo);

    expect(pos).not.toBeNull();
    expect(pos.asset).toBe('BTC');
    expect(pos.marginUsed).toBe(2000); // 10000 / 5
    expect(pos.entryPrice).toBeGreaterThan(90000); // 5 bps slippage applied on buy

    const portfolio = repo.getOrCreatePaperPortfolio('default');
    expect(portfolio.marginUsed).toBe(2000);
    expect(portfolio.cashBalance).toBeLessThan(98000); // 100000 - 2000 margin - fee
  });

  it('should reject order if required margin exceeds available cash balance', () => {
    expect(() => {
      placePaperOrder({
        portfolioId: 'default',
        asset: 'BTC',
        side: 'LONG',
        notional: 1000000, // Requires 200k margin on 5x, balance is only 100k
        leverage: 5,
        currentMarketPrice: 90000,
      }, repo);
    }).toThrow(/Insufficient/);
  });

  it('should close a paper position, return margin, record trade, and update realized PnL', () => {
    const pos = placePaperOrder({
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG',
      notional: 10000,
      leverage: 5,
      currentMarketPrice: 90000,
    }, repo);

    // Close at higher price 94500 (gain)
    const trade = closePaperPosition(pos.id, repo, 94500, 'MANUAL');
    expect(trade.realizedPnl).toBeGreaterThan(0);
    expect(trade.closeReason).toBe('MANUAL');

    // Check portfolio updated
    const portfolio = repo.getOrCreatePaperPortfolio('default');
    expect(portfolio.marginUsed).toBe(0);
    expect(portfolio.realizedPnl).toBe(trade.realizedPnl);
    expect(portfolio.cashBalance).toBeGreaterThan(100000); // Gain added
  });

  it('should update mark-to-market valuations and trigger TP/SL', () => {
    const pos = placePaperOrder({
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG',
      notional: 10000,
      leverage: 5,
      currentMarketPrice: 90000,
      takeProfit: 95000,
    }, repo);

    const snapshotTrigger: VerifiedMarketSnapshot = {
      asset: 'BTC',
      markPrice: 95500, // crossed TP!
      oraclePrice: 95500,
      openInterest: 100000000,
      fundingRate: 0.0001,
      volume24h: 500000000,
      observedTimestamp: Date.now(),
      source: 'hyperliquid:metaAndAssetCtxs',
    };

    const status = updateMarkToMarket(repo, [snapshotTrigger]);
    expect(status.liquidationsTriggered).toBe(1); // 1 position closed by trigger

    const remaining = repo.getPaperPositions('default');
    expect(remaining).toHaveLength(0);

    const trades = repo.getPaperTrades('default');
    expect(trades).toHaveLength(1);
    expect(trades[0].closeReason).toBe('TP');
  });

  it('should mirror followed whale position event in paper trading', () => {
    const whaleAddress = '0x1234567890123456789012345678901234567890';
    repo.savePaperSubscription({
      id: 'sub_whale_1',
      portfolioId: 'default',
      walletAddress: whaleAddress,
      allocatedUsd: 10000,
      multiplier: 1.0,
      maxDrawdownLimit: 0.15,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const mockSnapshots: VerifiedMarketSnapshot[] = [
      {
        asset: 'SOL',
        markPrice: 200,
        oraclePrice: 200,
        openInterest: 50000000,
        fundingRate: 0.0001,
        volume24h: 100000000,
        observedTimestamp: Date.now(),
        source: 'hyperliquid:metaAndAssetCtxs',
      },
    ];

    const openEvent: PositionEvent = {
      walletAddress: whaleAddress,
      asset: 'SOL',
      eventType: 'OPEN',
      prevSize: 0,
      newSize: 500,
      deltaNotional: 100000,
      timestamp: Date.now(),
    };

    processWhaleEventForCopyTrading(openEvent, repo, mockSnapshots);

    const positions = repo.getPaperPositions('default');
    expect(positions).toHaveLength(1);
    expect(positions[0].asset).toBe('SOL');
    expect(positions[0].source).toBe('COPY_WHALE');
    expect(positions[0].sourceWallet).toBe(whaleAddress);

    // Whale closes
    const closeEvent: PositionEvent = {
      walletAddress: whaleAddress,
      asset: 'SOL',
      eventType: 'CLOSE',
      prevSize: 500,
      newSize: 0,
      deltaNotional: -105000,
      timestamp: Date.now(),
    };

    processWhaleEventForCopyTrading(closeEvent, repo, mockSnapshots);
    expect(repo.getPaperPositions('default')).toHaveLength(0);
    expect(repo.getPaperTrades('default')).toHaveLength(1);
  });
});
