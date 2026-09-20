import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { WhaleOceanRepository } from '../src/db/repository';
import { WalletAlphaScore, PaperPortfolio, PaperPosition, PaperTrade, PaperSubscription } from '../src/types/contracts';

describe('Paper Trading & Backtest Database Repository', () => {
  let db: DatabaseSync;
  let repo: WhaleOceanRepository;
  const testDbPath = path.resolve(__dirname, 'test_paper.db');

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

  it('should initialize and retrieve default paper portfolio', () => {
    const portfolio = repo.getOrCreatePaperPortfolio('default');
    expect(portfolio.initialBalance).toBe(100000);
    expect(portfolio.cashBalance).toBe(100000);
    expect(portfolio.marginUsed).toBe(0);
    expect(portfolio.realizedPnl).toBe(0);

    // Updating portfolio
    repo.updatePaperPortfolio({
      ...portfolio,
      cashBalance: 95000,
      marginUsed: 5000,
    });
    const updated = repo.getOrCreatePaperPortfolio('default');
    expect(updated.cashBalance).toBe(95000);
    expect(updated.marginUsed).toBe(5000);
  });

  it('should save, retrieve and delete paper positions', () => {
    repo.getOrCreatePaperPortfolio('default');
    const pos: PaperPosition = {
      id: 'pos_btc_1',
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG',
      size: 0.5,
      entryPrice: 90000,
      currentPrice: 91000,
      leverage: 5,
      marginUsed: 9000,
      unrealizedPnl: 500,
      liquidationPrice: 72000,
      takeProfit: 95000,
      stopLoss: 88000,
      source: 'MANUAL',
      sourceWallet: null,
      openedAt: 1000,
      updatedAt: 1000,
    };

    repo.savePaperPosition(pos);
    const positions = repo.getPaperPositions('default');
    expect(positions).toHaveLength(1);
    expect(positions[0].asset).toBe('BTC');
    expect(positions[0].unrealizedPnl).toBe(500);

    repo.deletePaperPosition('pos_btc_1');
    expect(repo.getPaperPositions('default')).toHaveLength(0);
  });

  it('should save and query paper trades', () => {
    repo.getOrCreatePaperPortfolio('default');
    const trade: PaperTrade = {
      id: 'trade_1',
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG',
      size: 0.5,
      entryPrice: 90000,
      exitPrice: 91000,
      leverage: 5,
      realizedPnl: 500,
      feePaid: 31.5,
      fundingPaid: 2.5,
      source: 'MANUAL',
      sourceWallet: null,
      closeReason: 'TP',
      openedAt: 1000,
      closedAt: 2000,
    };

    repo.savePaperTrade(trade);
    const trades = repo.getPaperTrades('default');
    expect(trades).toHaveLength(1);
    expect(trades[0].realizedPnl).toBe(500);
    expect(trades[0].closeReason).toBe('TP');
  });

  it('should save, query, and delete paper subscriptions', () => {
    repo.getOrCreatePaperPortfolio('default');
    const sub: PaperSubscription = {
      id: 'sub_1',
      portfolioId: 'default',
      walletAddress: '0x1234567890123456789012345678901234567890',
      allocatedUsd: 20000,
      multiplier: 1.0,
      maxDrawdownLimit: 0.15,
      isActive: true,
      createdAt: 1000,
      updatedAt: 1000,
    };

    repo.savePaperSubscription(sub);
    const subs = repo.getPaperSubscriptions('default');
    expect(subs).toHaveLength(1);
    expect(subs[0].allocatedUsd).toBe(20000);

    repo.deletePaperSubscription('sub_1');
    expect(repo.getPaperSubscriptions('default')).toHaveLength(0);
  });

  it('should save and retrieve wallet alpha scores with sorting and filters', () => {
    const score1: WalletAlphaScore = {
      address: '0x1111111111111111111111111111111111111111',
      oceanAlphaScore: 92.5,
      persona: 'TRITON',
      riskTier: 'CONSERVATIVE',
      sharpeRatio: 2.5,
      sortinoRatio: 3.2,
      maxDrawdown: 8.5,
      profitFactor: 2.8,
      winRate: 68.0,
      totalTrades: 35,
      avgHoldingHours: 42.0,
      totalPnlUsd: 250000,
      liquidationDistanceScore: 95,
      lastEvaluatedAt: 1000,
    };

    const score2: WalletAlphaScore = {
      address: '0x2222222222222222222222222222222222222222',
      oceanAlphaScore: 78.0,
      persona: 'ORCA',
      riskTier: 'BALANCED',
      sharpeRatio: 1.8,
      sortinoRatio: 2.1,
      maxDrawdown: 18.0,
      profitFactor: 1.9,
      winRate: 58.0,
      totalTrades: 22,
      avgHoldingHours: 12.5,
      totalPnlUsd: 120000,
      liquidationDistanceScore: 75,
      lastEvaluatedAt: 1000,
    };

    repo.saveWalletAlphaScores([score1, score2]);

    const top = repo.getTopWalletAlphaScores({ limit: 10 });
    expect(top).toHaveLength(2);
    expect(top[0].address).toBe(score1.address);
    expect(top[0].oceanAlphaScore).toBe(92.5);

    const tritonOnly = repo.getTopWalletAlphaScores({ persona: 'TRITON' });
    expect(tritonOnly).toHaveLength(1);
    expect(tritonOnly[0].persona).toBe('TRITON');

    const balancedOnly = repo.getTopWalletAlphaScores({ riskTier: 'BALANCED' });
    expect(balancedOnly).toHaveLength(1);
    expect(balancedOnly[0].riskTier).toBe('BALANCED');

    const single = repo.getWalletAlphaScore(score1.address);
    expect(single?.oceanAlphaScore).toBe(92.5);
  });
});
