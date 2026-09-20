import {
  VerifiedMarketSnapshot,
  VerifiedWalletObservation,
  WhaleClass,
  WHALE_TIER_THRESHOLDS,
  validateMarketSnapshot,
  validateWalletObservation,
} from '../types/contracts';

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

export interface HyperliquidUniverseItem {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

export interface HyperliquidAssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
  oraclePx: string;
}

export interface HyperliquidLeaderboardRow {
  ethAddress: string;
  accountValue: string;
  windowPerformances: Array<[string, { pnl: string; roi: string; vlm: string }]>;
}

export class HyperliquidInfoClient {
  private baseUrl: string;

  constructor(baseUrl = HYPERLIQUID_INFO_URL) {
    this.baseUrl = baseUrl;
  }

  private async post(body: unknown, retries = 3): Promise<any> {
    let delay = 500;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Hyperliquid Info API HTTP ${res.status}: ${res.statusText}`);
        }

        return await res.json();
      } catch (err) {
        if (attempt === retries - 1) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }

  /**
   * Fetches official market metadata and asset contexts.
   * Returns normalized, strictly verified market snapshots.
   */
  async getMetaAndAssetCtxs(): Promise<VerifiedMarketSnapshot[]> {
    const data = await this.post({ type: 'metaAndAssetCtxs' });
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Malformed metaAndAssetCtxs response from Hyperliquid');
    }

    const universe: HyperliquidUniverseItem[] = data[0].universe || [];
    const contexts: HyperliquidAssetCtx[] = data[1] || [];
    const timestamp = Date.now();

    const snapshots: VerifiedMarketSnapshot[] = [];

    for (let i = 0; i < universe.length; i++) {
      const assetInfo = universe[i];
      const ctx = contexts[i];
      if (!ctx || !assetInfo) continue;

      const markPrice = parseFloat(ctx.markPx);
      const oraclePrice = parseFloat(ctx.oraclePx);
      const rawOpenInterest = parseFloat(ctx.openInterest);
      const fundingRate = parseFloat(ctx.funding);
      const volume24h = parseFloat(ctx.dayNtlVlm);

      if (isNaN(markPrice) || markPrice <= 0) continue;

      // Ingest Open Interest in USD Notional (base tokens * mark price)
      const openInterest = isNaN(rawOpenInterest) ? 0 : rawOpenInterest * markPrice;

      const rawSnapshot = {
        asset: assetInfo.name,
        markPrice,
        oraclePrice: isNaN(oraclePrice) || oraclePrice <= 0 ? markPrice : oraclePrice,
        openInterest,
        fundingRate: isNaN(fundingRate) ? 0 : fundingRate,
        volume24h: isNaN(volume24h) ? 0 : volume24h,
        observedTimestamp: timestamp,
        source: 'hyperliquid:metaAndAssetCtxs' as const,
      };

      try {
        const verified = validateMarketSnapshot(rawSnapshot);
        snapshots.push(verified);
      } catch {
        // Skip unverified/invalid entries
      }
    }

    return snapshots;
  }

  /**
   * Fetches the official leaderboard to seed observed large accounts.
   */
  async getLeaderboard(limit = 100): Promise<string[]> {
    try {
      const data = await this.post({ type: 'leaderboard' });
      if (!data || !Array.isArray(data.rows)) {
        return [];
      }
      return data.rows
        .slice(0, limit)
        .map((r: any) => r.ethAddress?.toLowerCase())
        .filter((addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr));
    } catch {
      return [];
    }
  }

  /**
   * Fetches official clearinghouse state for a given wallet.
   */
  async getClearinghouseState(walletAddress: string): Promise<VerifiedWalletObservation | null> {
    const cleanAddress = walletAddress.toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      throw new Error(`Invalid wallet address format: ${walletAddress}`);
    }

    const data = await this.post({ type: 'clearinghouseState', user: cleanAddress });
    if (!data || !data.assetPositions) {
      return null;
    }

    const positions: any[] = [];
    let totalNotional = 0;

    for (const posWrap of data.assetPositions) {
      const p = posWrap.position;
      if (!p) continue;

      const szi = parseFloat(p.szi);
      if (isNaN(szi) || szi === 0) continue;

      const entryPrice = parseFloat(p.entryPx) || 0;
      if (isNaN(entryPrice) || entryPrice <= 0) continue;

      const side = szi > 0 ? 'LONG' : 'SHORT';
      const size = Math.abs(szi);
      const liquidationPrice = p.liquidationPx ? parseFloat(p.liquidationPx) : null;
      const leverage = p.leverage?.value || 1;
      const unrealizedPnl = parseFloat(p.unrealizedPnl) || 0;

      // Notional = size * entryPrice
      const notional = size * entryPrice;
      totalNotional += notional;

      positions.push({
        asset: p.coin,
        side,
        size,
        entryPrice,
        liquidationPrice: liquidationPrice && liquidationPrice > 0 ? liquidationPrice : null,
        leverage: leverage > 0 ? leverage : 1,
        unrealizedPnl,
      });
    }

    // Determine whale class
    let whaleClass: WhaleClass = 'FISH';
    for (const [tier, bounds] of Object.entries(WHALE_TIER_THRESHOLDS)) {
      if (totalNotional >= bounds.min && totalNotional < bounds.max) {
        whaleClass = tier as WhaleClass;
        break;
      }
    }

    const rawObservation = {
      walletAddress: cleanAddress,
      whaleClass,
      totalNotionalExposure: totalNotional,
      positions,
      observedTimestamp: Date.now(),
      source: 'hyperliquid:clearinghouseState' as const,
    };

    return validateWalletObservation(rawObservation);
  }

  /**
   * Fetches official historical candles from Hyperliquid.
   */
  async getCandles(
    coin: string,
    interval = '1h',
    startTime?: number
  ): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
    try {
      const start = startTime || Date.now() - 24 * 60 * 60 * 1000;
      const rawCandles = await this.post({
        type: 'candleSnapshot',
        req: {
          coin,
          interval,
          startTime: start,
        },
      });

      if (!Array.isArray(rawCandles)) return [];

      return rawCandles
        .map((c: any) => ({
          time: Math.floor(c.t / 1000),
          open: parseFloat(c.o) || 0,
          high: parseFloat(c.h) || 0,
          low: parseFloat(c.l) || 0,
          close: parseFloat(c.c) || 0,
          volume: parseFloat(c.v) || 0,
        }))
        .filter((c: any) => c.time > 0 && c.close > 0)
        .sort((a: any, b: any) => a.time - b.time);
    } catch {
      return [];
    }
  }
}
