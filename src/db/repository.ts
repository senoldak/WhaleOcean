import { DatabaseSync } from 'node:sqlite';
import {
  VerifiedMarketSnapshot,
  VerifiedWalletObservation,
  OceanConditionMeasurement,
  WhatChangedEvent,
  WhaleClass,
  WalletAlphaScore,
  PaperPortfolio,
  PaperPosition,
  PaperTrade,
  PaperSubscription,
} from '../types/contracts';

export interface PositionEvent {
  walletAddress: string;
  asset: string;
  eventType: 'OPEN' | 'INCREASE' | 'DECREASE' | 'CLOSE' | 'FLIP';
  prevSize: number;
  newSize: number;
  deltaNotional: number;
  timestamp: number;
}

const toPlain = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
};

export class WhaleOceanRepository {
  constructor(private db: DatabaseSync) {}

  // ==========================================
  // Market Snapshots & Metadata
  // ==========================================
  saveMarket(asset: string, szDecimals = 4, maxLeverage = 50, isActive = 1): void {
    const stmt = this.db.prepare(`
      INSERT INTO markets (asset, sz_decimals, max_leverage, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(asset) DO UPDATE SET
        sz_decimals = excluded.sz_decimals,
        max_leverage = excluded.max_leverage,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `);
    stmt.run(asset, szDecimals, maxLeverage, isActive, Date.now());
  }

  private cachedLatestSnapshots: VerifiedMarketSnapshot[] | null = null;

  saveMarketSnapshot(snapshot: VerifiedMarketSnapshot): void {
    this.saveMarket(snapshot.asset);

    const stmt = this.db.prepare(`
      INSERT INTO market_snapshots (
        asset, mark_price, oracle_price, open_interest, funding_rate, volume_24h, timestamp, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      snapshot.asset,
      snapshot.markPrice,
      snapshot.oraclePrice,
      snapshot.openInterest,
      snapshot.fundingRate,
      snapshot.volume24h,
      snapshot.observedTimestamp,
      snapshot.source
    );

    if (this.cachedLatestSnapshots) {
      const idx = this.cachedLatestSnapshots.findIndex(s => s.asset === snapshot.asset);
      if (idx >= 0) {
        this.cachedLatestSnapshots[idx] = snapshot;
      } else {
        this.cachedLatestSnapshots.push(snapshot);
      }
    }
  }

  saveMarketSnapshotsBatch(snapshots: VerifiedMarketSnapshot[]): void {
    if (snapshots.length === 0) return;
    const now = Date.now();

    const saveMarketStmt = this.db.prepare(`
      INSERT INTO markets (asset, sz_decimals, max_leverage, is_active, updated_at)
      VALUES (?, 4, 50, 1, ?)
      ON CONFLICT(asset) DO UPDATE SET updated_at = excluded.updated_at
    `);

    const saveSnapStmt = this.db.prepare(`
      INSERT INTO market_snapshots (
        asset, mark_price, oracle_price, open_interest, funding_rate, volume_24h, timestamp, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.exec('BEGIN;');
    try {
      for (const snap of snapshots) {
        saveMarketStmt.run(snap.asset, now);
        saveSnapStmt.run(
          snap.asset,
          snap.markPrice,
          snap.oraclePrice,
          snap.openInterest,
          snap.fundingRate,
          snap.volume24h,
          snap.observedTimestamp,
          snap.source
        );
      }
      this.db.exec('COMMIT;');
      this.cachedLatestSnapshots = [...snapshots].sort((a, b) => b.openInterest - a.openInterest);
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  getLatestMarketSnapshots(): VerifiedMarketSnapshot[] {
    if (this.cachedLatestSnapshots && this.cachedLatestSnapshots.length > 0) {
      return this.cachedLatestSnapshots;
    }

    const stmt = this.db.prepare(`
      SELECT ms.asset, ms.mark_price as markPrice, ms.oracle_price as oraclePrice,
             ms.open_interest as openInterest, ms.funding_rate as fundingRate,
             ms.volume_24h as volume24h, ms.timestamp as observedTimestamp, ms.source
      FROM market_snapshots ms
      INNER JOIN (
        SELECT asset, MAX(timestamp) as max_time
        FROM market_snapshots
        GROUP BY asset
      ) latest ON ms.asset = latest.asset AND ms.timestamp = latest.max_time
      ORDER BY ms.open_interest DESC
    `);
    const rows = stmt.all() as any[];
    const result = rows.map(r => toPlain(r)) as VerifiedMarketSnapshot[];
    if (result.length > 0) {
      this.cachedLatestSnapshots = result;
    }
    return result;
  }

  getMarketHistory(asset: string, limit = 100): VerifiedMarketSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT asset, mark_price as markPrice, oracle_price as oraclePrice,
             open_interest as openInterest, funding_rate as fundingRate,
             volume_24h as volume24h, timestamp as observedTimestamp, source
      FROM market_snapshots
      WHERE asset = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(asset, limit) as any[];
    return rows.map(r => toPlain(r)).reverse() as VerifiedMarketSnapshot[];
  }

  // ==========================================
  // Wallets & Positions
  // ==========================================
  saveWalletObservation(obs: VerifiedWalletObservation): void {
    const now = Date.now();
    const saveWalletStmt = this.db.prepare(`
      INSERT INTO wallets (address, whale_class, total_observed_exposure, first_observed_at, last_observed_at, is_tracked)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(address) DO UPDATE SET
        whale_class = excluded.whale_class,
        total_observed_exposure = excluded.total_observed_exposure,
        last_observed_at = excluded.last_observed_at
    `);
    saveWalletStmt.run(
      obs.walletAddress,
      obs.whaleClass,
      obs.totalNotionalExposure,
      obs.observedTimestamp,
      obs.observedTimestamp
    );

    // Save positions inside a transaction
    const upsertPosStmt = this.db.prepare(`
      INSERT INTO positions (id, wallet_address, asset, side, size, entry_price, liquidation_price, leverage, unrealized_pnl, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        side = excluded.side,
        size = excluded.size,
        entry_price = excluded.entry_price,
        liquidation_price = excluded.liquidation_price,
        leverage = excluded.leverage,
        unrealized_pnl = excluded.unrealized_pnl,
        updated_at = excluded.updated_at
    `);

    // Remove existing positions for this wallet not in the new observation
    const activeIds = obs.positions.map(p => `${obs.walletAddress}:${p.asset}`);

    this.db.exec('BEGIN;');
    try {
      for (const pos of obs.positions) {
        this.saveMarket(pos.asset);
        const id = `${obs.walletAddress}:${pos.asset}`;
        upsertPosStmt.run(
          id,
          obs.walletAddress,
          pos.asset,
          pos.side,
          pos.size,
          pos.entryPrice,
          pos.liquidationPrice,
          pos.leverage,
          pos.unrealizedPnl,
          now
        );
      }
      if (activeIds.length > 0) {
        const placeholders = activeIds.map(() => '?').join(',');
        const deleteOldStmt = this.db.prepare(`
          DELETE FROM positions
          WHERE wallet_address = ? AND id NOT IN (${placeholders})
        `);
        deleteOldStmt.run(obs.walletAddress, ...activeIds);
      } else {
        this.db.prepare('DELETE FROM positions WHERE wallet_address = ?').run(obs.walletAddress);
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  getObservedWallets(limit = 50, filterClass?: WhaleClass): any[] {
    let sql = `
      SELECT address, whale_class as whaleClass, total_observed_exposure as totalObservedExposure,
             first_observed_at as firstObservedAt, last_observed_at as lastObservedAt, is_tracked as isTracked
      FROM wallets
    `;
    const params: any[] = [];
    if (filterClass) {
      sql += ' WHERE whale_class = ?';
      params.push(filterClass);
    }
    sql += ' ORDER BY total_observed_exposure DESC LIMIT ?';
    params.push(limit);

    const wallets = this.db.prepare(sql).all(...params) as any[];
    if (wallets.length === 0) return [];

    // Batch-fetch positions for all returned wallets in a single query
    const addresses = wallets.map(w => w.address);
    const placeholders = addresses.map(() => '?').join(',');
    const posRows = this.db.prepare(`
      SELECT wallet_address as walletAddress, asset, side, size,
             entry_price as entryPrice, liquidation_price as liquidationPrice,
             leverage, unrealized_pnl as unrealizedPnl
      FROM positions
      WHERE wallet_address IN (${placeholders})
    `).all(...addresses) as any[];

    const positionsByWallet = new Map<string, any[]>();
    for (const r of posRows) {
      const plain = toPlain(r);
      const list = positionsByWallet.get(plain.walletAddress);
      if (list) {
        list.push(plain);
      } else {
        positionsByWallet.set(plain.walletAddress, [plain]);
      }
    }

    return wallets.map(w => toPlain({
      ...w,
      positions: positionsByWallet.get(w.address) || [],
    }));
  }

  getWalletByAddress(address: string): any | null {
    const wallet = this.db.prepare(`
      SELECT address, whale_class as whaleClass, total_observed_exposure as totalObservedExposure,
             first_observed_at as firstObservedAt, last_observed_at as lastObservedAt, is_tracked as isTracked
      FROM wallets
      WHERE address = ?
    `).get(address) as any;

    if (!wallet) return null;

    const positions = (this.db.prepare(`
      SELECT asset, side, size, entry_price as entryPrice, liquidation_price as liquidationPrice,
             leverage, unrealized_pnl as unrealizedPnl
      FROM positions
      WHERE wallet_address = ?
    `).all(address) as any[]).map(p => toPlain(p));

    const events = (this.db.prepare(`
      SELECT event_type as eventType, asset, prev_size as prevSize, new_size as newSize,
             delta_notional as deltaNotional, timestamp
      FROM position_events
      WHERE wallet_address = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(address) as any[]).map(e => toPlain(e));

    return toPlain({
      ...wallet,
      positions,
      events,
    });
  }

  recordPositionEvent(event: PositionEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO position_events (wallet_address, asset, event_type, prev_size, new_size, delta_notional, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.walletAddress,
      event.asset,
      event.eventType,
      event.prevSize,
      event.newSize,
      event.deltaNotional,
      event.timestamp
    );
  }

  getPositionEventsForWallet(address: string, limit = 100): PositionEvent[] {
    const stmt = this.db.prepare(`
      SELECT wallet_address as walletAddress, asset, event_type as eventType,
             prev_size as prevSize, new_size as newSize, delta_notional as deltaNotional, timestamp
      FROM position_events
      WHERE wallet_address = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(address.toLowerCase(), limit) as any[];
    return rows.map(r => toPlain(r)) as PositionEvent[];
  }

  getWalletsWithMostEvents(limit = 50): Array<{ address: string; eventCount: number }> {
    const rows = this.db.prepare(`
      SELECT wallet_address as address, count(*) as eventCount
      FROM position_events
      GROUP BY wallet_address
      HAVING count(*) >= 5
      ORDER BY count(*) DESC
      LIMIT ?
    `).all(limit) as any[];
    return rows.map(r => toPlain(r));
  }

  getPositionEvents(options?: {
    limit?: number;
    asset?: string;
    eventType?: string;
    minNotional?: number;
  }): PositionEvent[] {
    const limit = options?.limit || 100;
    let sql = `
      SELECT wallet_address as walletAddress, asset, event_type as eventType,
             prev_size as prevSize, new_size as newSize, delta_notional as deltaNotional, timestamp
      FROM position_events
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.asset) {
      sql += ' AND asset = ?';
      params.push(options.asset.toUpperCase());
    }
    if (options?.eventType) {
      sql += ' AND event_type = ?';
      params.push(options.eventType.toUpperCase());
    }
    if (options?.minNotional) {
      sql += ' AND delta_notional >= ?';
      params.push(options.minNotional);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(r => toPlain(r)) as PositionEvent[];
  }

  getAllPositions(limit = 2000): any[] {
    const stmt = this.db.prepare(`
      SELECT p.wallet_address as walletAddress, p.asset, p.side, p.size,
             p.entry_price as entryPrice, p.liquidation_price as liquidationPrice,
             p.leverage, p.unrealized_pnl as unrealizedPnl,
             w.whale_class as whaleClass, w.total_observed_exposure as totalObservedExposure
      FROM positions p
      JOIN wallets w ON p.wallet_address = w.address
      ORDER BY (p.size * p.entry_price) DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(r => toPlain(r));
  }

  // ==========================================
  // Ocean Conditions
  // ==========================================
  saveOceanCondition(cond: OceanConditionMeasurement): void {
    const stmt = this.db.prepare(`
      INSERT INTO ocean_conditions (
        timestamp, classification, volatility_score, oi_change_percent,
        funding_stress_score, whale_exposure_delta, raw_metrics_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      cond.timestamp,
      cond.classification,
      cond.volatilityScore,
      cond.oiChangePercent,
      cond.fundingStressScore,
      cond.whaleExposureDelta,
      JSON.stringify(cond.underlyingMetrics)
    );
  }

  getLatestOceanCondition(): OceanConditionMeasurement | null {
    const row = this.db.prepare(`
      SELECT timestamp, classification, volatility_score as volatilityScore,
             oi_change_percent as oiChangePercent, funding_stress_score as fundingStressScore,
             whale_exposure_delta as whaleExposureDelta, raw_metrics_json as rawMetricsJson
      FROM ocean_conditions
      ORDER BY timestamp DESC
      LIMIT 1
    `).get() as any;

    if (!row) return null;

    return toPlain({
      timestamp: row.timestamp,
      classification: row.classification,
      volatilityScore: row.volatilityScore,
      oiChangePercent: row.oiChangePercent,
      fundingStressScore: row.fundingStressScore,
      whaleExposureDelta: row.whaleExposureDelta,
      underlyingMetrics: JSON.parse(row.rawMetricsJson),
    });
  }

  // ==========================================
  // What Changed Events
  // ==========================================
  saveWhatChangedEvent(event: WhatChangedEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO what_changed_events (
        id, timestamp, category, asset, statement, delta_value, time_window_minutes, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.timestamp,
      event.category,
      event.asset || null,
      event.statement,
      event.deltaValue || null,
      event.timeWindowMinutes,
      event.source
    );
  }

  getRecentWhatChangedEvents(limit = 20): WhatChangedEvent[] {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, category, asset, statement, delta_value as deltaValue,
             time_window_minutes as timeWindowMinutes, source
      FROM what_changed_events
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(r => toPlain(r)) as WhatChangedEvent[];
  }

  // ==========================================
  // Paper Portfolios & Trading
  // ==========================================
  getOrCreatePaperPortfolio(portfolioId = 'default'): PaperPortfolio {
    const existing = this.db.prepare(`
      SELECT id, initial_balance as initialBalance, cash_balance as cashBalance,
             margin_used as marginUsed, realized_pnl as realizedPnl, updated_at as updatedAt
      FROM paper_portfolios
      WHERE id = ?
    `).get(portfolioId) as any;

    if (existing) {
      return toPlain({
        id: existing.id,
        initialBalance: existing.initialBalance,
        cashBalance: existing.cashBalance,
        marginUsed: existing.marginUsed,
        realizedPnl: existing.realizedPnl,
        updatedAt: existing.updatedAt,
      });
    }

    const initial = {
      id: portfolioId,
      initialBalance: 100000.0,
      cashBalance: 100000.0,
      marginUsed: 0.0,
      realizedPnl: 0.0,
      updatedAt: Date.now(),
    };

    this.db.prepare(`
      INSERT INTO paper_portfolios (id, initial_balance, cash_balance, margin_used, realized_pnl, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(initial.id, initial.initialBalance, initial.cashBalance, initial.marginUsed, initial.realizedPnl, initial.updatedAt);

    return initial;
  }

  updatePaperPortfolio(portfolio: PaperPortfolio): void {
    this.db.prepare(`
      INSERT INTO paper_portfolios (id, initial_balance, cash_balance, margin_used, realized_pnl, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        cash_balance = excluded.cash_balance,
        margin_used = excluded.margin_used,
        realized_pnl = excluded.realized_pnl,
        updated_at = excluded.updated_at
    `).run(
      portfolio.id,
      portfolio.initialBalance,
      portfolio.cashBalance,
      portfolio.marginUsed,
      portfolio.realizedPnl,
      Date.now()
    );
  }

  resetPaperPortfolio(portfolioId = 'default', initialBalance = 100000.0): PaperPortfolio {
    // Delete positions and trades for this portfolio
    this.db.prepare('DELETE FROM paper_positions WHERE portfolio_id = ?').run(portfolioId);
    this.db.prepare('DELETE FROM paper_trades WHERE portfolio_id = ?').run(portfolioId);
    this.db.prepare('DELETE FROM paper_subscriptions WHERE portfolio_id = ?').run(portfolioId);

    const resetState: PaperPortfolio = {
      id: portfolioId,
      initialBalance,
      cashBalance: initialBalance,
      marginUsed: 0.0,
      realizedPnl: 0.0,
      updatedAt: Date.now(),
    };

    this.db.prepare(`
      INSERT INTO paper_portfolios (id, initial_balance, cash_balance, margin_used, realized_pnl, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        initial_balance = excluded.initial_balance,
        cash_balance = excluded.cash_balance,
        margin_used = excluded.margin_used,
        realized_pnl = excluded.realized_pnl,
        updated_at = excluded.updated_at
    `).run(
      resetState.id,
      resetState.initialBalance,
      resetState.cashBalance,
      resetState.marginUsed,
      resetState.realizedPnl,
      resetState.updatedAt
    );

    return resetState;
  }

  // ==========================================
  // Paper Positions
  // ==========================================
  savePaperPosition(pos: PaperPosition): void {
    this.db.prepare(`
      INSERT INTO paper_positions (
        id, portfolio_id, asset, side, size, entry_price, current_price,
        leverage, margin_used, unrealized_pnl, liquidation_price, take_profit, stop_loss,
        source, source_wallet, opened_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        current_price = excluded.current_price,
        size = excluded.size,
        margin_used = excluded.margin_used,
        unrealized_pnl = excluded.unrealized_pnl,
        liquidation_price = excluded.liquidation_price,
        take_profit = excluded.take_profit,
        stop_loss = excluded.stop_loss,
        updated_at = excluded.updated_at
    `).run(
      pos.id,
      pos.portfolioId || 'default',
      pos.asset,
      pos.side,
      pos.size,
      pos.entryPrice,
      pos.currentPrice,
      pos.leverage,
      pos.marginUsed,
      pos.unrealizedPnl,
      pos.liquidationPrice ?? null,
      pos.takeProfit ?? null,
      pos.stopLoss ?? null,
      pos.source,
      pos.sourceWallet ?? null,
      pos.openedAt,
      pos.updatedAt || Date.now()
    );
  }

  getPaperPositions(portfolioId = 'default'): PaperPosition[] {
    const rows = this.db.prepare(`
      SELECT id, portfolio_id as portfolioId, asset, side, size,
             entry_price as entryPrice, current_price as currentPrice,
             leverage, margin_used as marginUsed, unrealized_pnl as unrealizedPnl,
             liquidation_price as liquidationPrice, take_profit as takeProfit, stop_loss as stopLoss,
             source, source_wallet as sourceWallet, opened_at as openedAt, updated_at as updatedAt
      FROM paper_positions
      WHERE portfolio_id = ?
      ORDER BY opened_at DESC
    `).all(portfolioId) as any[];

    return rows.map(r => toPlain(r)) as PaperPosition[];
  }

  deletePaperPosition(positionId: string): void {
    this.db.prepare('DELETE FROM paper_positions WHERE id = ?').run(positionId);
  }

  // ==========================================
  // Paper Trades (History)
  // ==========================================
  savePaperTrade(trade: PaperTrade): void {
    this.db.prepare(`
      INSERT INTO paper_trades (
        id, portfolio_id, asset, side, size, entry_price, exit_price,
        leverage, realized_pnl, fee_paid, funding_paid, source, source_wallet,
        close_reason, opened_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trade.id,
      trade.portfolioId || 'default',
      trade.asset,
      trade.side,
      trade.size,
      trade.entryPrice,
      trade.exitPrice,
      trade.leverage,
      trade.realizedPnl,
      trade.feePaid,
      trade.fundingPaid,
      trade.source,
      trade.sourceWallet ?? null,
      trade.closeReason,
      trade.openedAt,
      trade.closedAt
    );
  }

  getPaperTrades(portfolioId = 'default', limit = 50): PaperTrade[] {
    const rows = this.db.prepare(`
      SELECT id, portfolio_id as portfolioId, asset, side, size,
             entry_price as entryPrice, exit_price as exitPrice,
             leverage, realized_pnl as realizedPnl, fee_paid as feePaid,
             funding_paid as fundingPaid, source, source_wallet as sourceWallet,
             close_reason as closeReason, opened_at as openedAt, closed_at as closedAt
      FROM paper_trades
      WHERE portfolio_id = ?
      ORDER BY closed_at DESC
      LIMIT ?
    `).all(portfolioId, limit) as any[];

    return rows.map(r => toPlain(r)) as PaperTrade[];
  }

  // ==========================================
  // Paper Subscriptions (Whale Copy)
  // ==========================================
  savePaperSubscription(sub: PaperSubscription): void {
    this.db.prepare(`
      INSERT INTO paper_subscriptions (
        id, portfolio_id, wallet_address, allocated_usd, multiplier,
        max_drawdown_limit, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        allocated_usd = excluded.allocated_usd,
        multiplier = excluded.multiplier,
        max_drawdown_limit = excluded.max_drawdown_limit,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `).run(
      sub.id,
      sub.portfolioId || 'default',
      sub.walletAddress.toLowerCase(),
      sub.allocatedUsd,
      sub.multiplier,
      sub.maxDrawdownLimit,
      sub.isActive ? 1 : 0,
      sub.createdAt,
      sub.updatedAt || Date.now()
    );
  }

  getPaperSubscriptions(portfolioId = 'default'): PaperSubscription[] {
    const rows = this.db.prepare(`
      SELECT id, portfolio_id as portfolioId, wallet_address as walletAddress,
             allocated_usd as allocatedUsd, multiplier, max_drawdown_limit as maxDrawdownLimit,
             is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM paper_subscriptions
      WHERE portfolio_id = ?
      ORDER BY created_at DESC
    `).all(portfolioId) as any[];

    return rows.map(r => toPlain({
      ...r,
      isActive: Boolean(r.isActive),
    })) as PaperSubscription[];
  }

  deletePaperSubscription(subId: string): void {
    this.db.prepare('DELETE FROM paper_subscriptions WHERE id = ?').run(subId);
  }

  // ==========================================
  // Wallet Alpha Scores & Recommendations
  // ==========================================
  saveWalletAlphaScore(score: WalletAlphaScore): void {
    this.saveWalletAlphaScores([score]);
  }

  saveWalletAlphaScores(scores: WalletAlphaScore[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO wallet_alpha_scores (
        address, ocean_alpha_score, persona, risk_tier, sharpe_ratio,
        sortino_ratio, max_drawdown, profit_factor, win_rate, total_trades,
        avg_holding_hours, total_pnl_usd, liquidation_distance_score, last_evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        ocean_alpha_score = excluded.ocean_alpha_score,
        persona = excluded.persona,
        risk_tier = excluded.risk_tier,
        sharpe_ratio = excluded.sharpe_ratio,
        sortino_ratio = excluded.sortino_ratio,
        max_drawdown = excluded.max_drawdown,
        profit_factor = excluded.profit_factor,
        win_rate = excluded.win_rate,
        total_trades = excluded.total_trades,
        avg_holding_hours = excluded.avg_holding_hours,
        total_pnl_usd = excluded.total_pnl_usd,
        liquidation_distance_score = excluded.liquidation_distance_score,
        last_evaluated_at = excluded.last_evaluated_at
    `);

    for (const s of scores) {
      stmt.run(
        s.address.toLowerCase(),
        s.oceanAlphaScore,
        s.persona,
        s.riskTier,
        s.sharpeRatio,
        s.sortinoRatio,
        s.maxDrawdown,
        s.profitFactor,
        s.winRate,
        s.totalTrades,
        s.avgHoldingHours,
        s.totalPnlUsd,
        s.liquidationDistanceScore,
        s.lastEvaluatedAt || Date.now()
      );
    }
  }

  getTopWalletAlphaScores(options?: {
    limit?: number;
    persona?: string;
    riskTier?: string;
    minScore?: number;
  }): WalletAlphaScore[] {
    let query = `
      SELECT address, ocean_alpha_score as oceanAlphaScore, persona, risk_tier as riskTier,
             sharpe_ratio as sharpeRatio, sortino_ratio as sortinoRatio,
             max_drawdown as maxDrawdown, profit_factor as profitFactor,
             win_rate as winRate, total_trades as totalTrades,
             avg_holding_hours as avgHoldingHours, total_pnl_usd as totalPnlUsd,
             liquidation_distance_score as liquidationDistanceScore,
             last_evaluated_at as lastEvaluatedAt
      FROM wallet_alpha_scores
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.persona) {
      query += ' AND persona = ?';
      params.push(options.persona);
    }
    if (options?.riskTier) {
      query += ' AND risk_tier = ?';
      params.push(options.riskTier);
    }
    if (options?.minScore !== undefined) {
      query += ' AND ocean_alpha_score >= ?';
      params.push(options.minScore);
    }

    query += ' ORDER BY ocean_alpha_score DESC LIMIT ?';
    params.push(options?.limit || 50);

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(r => toPlain(r)) as WalletAlphaScore[];
  }

  getWalletAlphaScore(address: string): WalletAlphaScore | null {
    const row = this.db.prepare(`
      SELECT address, ocean_alpha_score as oceanAlphaScore, persona, risk_tier as riskTier,
             sharpe_ratio as sharpeRatio, sortino_ratio as sortinoRatio,
             max_drawdown as maxDrawdown, profit_factor as profitFactor,
             win_rate as winRate, total_trades as totalTrades,
             avg_holding_hours as avgHoldingHours, total_pnl_usd as totalPnlUsd,
             liquidation_distance_score as liquidationDistanceScore,
             last_evaluated_at as lastEvaluatedAt
      FROM wallet_alpha_scores
      WHERE address = ?
    `).get(address.toLowerCase()) as any;

    if (!row) return null;
    return toPlain(row) as WalletAlphaScore;
  }
}
