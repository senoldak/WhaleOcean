import { HyperliquidInfoClient } from './hyperliquid-info';
import { HyperliquidWsClient } from './hyperliquid-ws';
import { WhaleOceanRepository } from '../db/repository';
import {
  VerifiedMarketSnapshot,
  VerifiedWalletObservation,
  ConnectionHealth,
} from '../types/contracts';

export type EventSubscriber = (eventType: string, data: any) => void;

export class CollectorService {
  private infoClient: HyperliquidInfoClient;
  private wsClient: HyperliquidWsClient;
  private repo: WhaleOceanRepository;

  private pollMarketsTimer: NodeJS.Timeout | null = null;
  private pollWhalesTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  private trackedWallets: Set<string> = new Set();
  private subscribers: Set<EventSubscriber> = new Set();
  private prevSnapshots: VerifiedMarketSnapshot[] = [];
  private isRefreshingWhales = false;

  constructor(repo: WhaleOceanRepository, infoClient?: HyperliquidInfoClient, wsClient?: HyperliquidWsClient) {
    this.repo = repo;
    this.infoClient = infoClient || new HyperliquidInfoClient();
    this.wsClient = wsClient || new HyperliquidWsClient();
  }

  subscribe(sub: EventSubscriber): () => void {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private broadcast(eventType: string, data: any): void {
    for (const sub of this.subscribers) {
      sub(eventType, data);
    }
  }

  getHealth(): ConnectionHealth {
    return this.wsClient.getHealth();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Connect WebSocket
    this.wsClient.onHealthChange((health) => {
      this.broadcast('health', health);
    });

    this.wsClient.onMessage((channel, data) => {
      if (channel === 'allMids') {
        this.broadcast('allMids', data);
      } else if (channel === 'trades' && Array.isArray(data)) {
        for (const trade of data) {
          const sz = parseFloat(trade.sz) || 0;
          const px = parseFloat(trade.px) || 0;
          const notional = sz * px;
          // Only track wallets executing high-notional transactions (>= $100k)
          if (notional >= 100_000 && Array.isArray(trade.users)) {
            for (const user of trade.users) {
              this.addTrackedWallet(user);
            }
          }
        }
      }
    });

    this.wsClient.connect();

    // Initial load of market snapshots
    await this.refreshMarketSnapshots();

    // Seed top active accounts & discover from live trades
    await this.seedWhalesFromLeaderboard();

    // Set up polling intervals
    this.pollMarketsTimer = setInterval(() => {
      this.refreshMarketSnapshots().catch(() => {});
    }, 10_000); // 10s market snapshot updates

    this.pollWhalesTimer = setInterval(() => {
      this.refreshTrackedWhales().catch(() => {});
    }, 30_000); // 30s whale clearinghouse updates
  }

  async refreshMarketSnapshots(): Promise<VerifiedMarketSnapshot[]> {
    try {
      const snapshots = await this.infoClient.getMetaAndAssetCtxs();
      if (snapshots.length > 0) {
        this.repo.saveMarketSnapshotsBatch(snapshots);

        // Live calculation of Ocean Conditions
        const { calculateOceanCondition } = await import('../analytics/ocean-conditions');
        const cond = calculateOceanCondition(snapshots, this.prevSnapshots, 0);
        this.repo.saveOceanCondition(cond);
        this.broadcast('ocean_condition', cond);

        // Live calculation of What Changed events
        const { generateWhatChangedFeed } = await import('../analytics/what-changed');
        const recentEvents = this.repo.getPositionEvents({ limit: 30 });
        const whatChanged = generateWhatChangedFeed(snapshots, this.prevSnapshots, recentEvents);
        for (const wc of whatChanged) {
          this.repo.saveWhatChangedEvent(wc);
        }
        this.broadcast('what_changed', whatChanged);

        this.prevSnapshots = snapshots;
      }
      this.broadcast('market_snapshots', snapshots);
      return snapshots;
    } catch (err) {
      return [];
    }
  }

  async seedWhalesFromLeaderboard(limit = 20): Promise<void> {
    try {
      // Seed high-activity institutional & verified whale addresses on Hyperliquid
      const verifiedWhaleSeeds = [
        '0xefe4c0faad69ec4e3d6e5a6a6a2a07c11f7c3dc7',
        '0xd93db94207ae48f6c5b9fe33959bc2132d73ec2e',
        '0x5057b56715101a09dcda28e9df6469cf24ee758d',
        '0x6b80145c115794719c2354c46f1cb684fcda4295',
        '0x87979f972b2258814bb60fe5c868eb2cb3ee7d42',
        '0xb55aeeff69a2fcbb211ebcf30cb788d752ee0fe3',
        '0x0231cfb54432174c8dbd0c9f1acbca7bc8c74d6c',
      ];
      for (const addr of verifiedWhaleSeeds) {
        this.trackedWallets.add(addr);
      }

      // Restore previously observed wallets from database
      const existingWallets = this.repo.getObservedWallets(limit);
      for (const w of existingWallets) {
        if (w.address) {
          this.trackedWallets.add(w.address.toLowerCase());
        }
      }

      await this.refreshTrackedWhales();
    } catch {
      // Ignore seeding errors, will retry on next schedule
    }
  }

  addTrackedWallet(address: string): void {
    const clean = address.toLowerCase();
    if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      if (!this.trackedWallets.has(clean)) {
        this.trackedWallets.add(clean);
        // Only trigger immediate refresh if we have a reasonable queue
        if (this.trackedWallets.size <= 150) {
          this.refreshWallet(clean).catch(() => {});
        }
      }
    }
  }

  private async refreshTrackedWhales(): Promise<void> {
    if (this.isRefreshingWhales) return;
    this.isRefreshingWhales = true;
    try {
      const addresses = Array.from(this.trackedWallets);
      for (const addr of addresses) {
        await this.refreshWallet(addr);
        // Stagger requests to stay well within Hyperliquid rate limits
        await new Promise(r => setTimeout(r, 200));
      }
    } finally {
      this.isRefreshingWhales = false;
    }
  }

  private async refreshWallet(address: string): Promise<VerifiedWalletObservation | null> {
    try {
      const prev = this.repo.getWalletByAddress(address);
      const obs = await this.infoClient.getClearinghouseState(address);
      if (!obs) return null;

      this.repo.saveWalletObservation(obs);

      // Detect exposure changes and record position events
      if (prev && prev.positions) {
        this.detectPositionChanges(address, prev.positions, obs.positions);
      }

      this.broadcast('wallet_update', obs);
      return obs;
    } catch {
      return null;
    }
  }

  private detectPositionChanges(address: string, prevPositions: any[], newPositions: any[]): void {
    const prevMap = new Map(prevPositions.map(p => [p.asset, p]));
    const newMap = new Map(newPositions.map(p => [p.asset, p]));
    const now = Date.now();

    for (const [asset, newPos] of newMap.entries()) {
      const prevPos = prevMap.get(asset);
      if (!prevPos) {
        // Open
        this.repo.recordPositionEvent({
          walletAddress: address,
          asset,
          eventType: 'OPEN',
          prevSize: 0,
          newSize: newPos.size,
          deltaNotional: newPos.size * newPos.entryPrice,
          timestamp: now,
        });
      } else if (prevPos.side !== newPos.side) {
        // Flip
        this.repo.recordPositionEvent({
          walletAddress: address,
          asset,
          eventType: 'FLIP',
          prevSize: prevPos.size,
          newSize: newPos.size,
          deltaNotional: (newPos.size + prevPos.size) * newPos.entryPrice,
          timestamp: now,
        });
      } else if (newPos.size > prevPos.size) {
        // Increase
        this.repo.recordPositionEvent({
          walletAddress: address,
          asset,
          eventType: 'INCREASE',
          prevSize: prevPos.size,
          newSize: newPos.size,
          deltaNotional: (newPos.size - prevPos.size) * newPos.entryPrice,
          timestamp: now,
        });
      } else if (newPos.size < prevPos.size) {
        // Decrease
        this.repo.recordPositionEvent({
          walletAddress: address,
          asset,
          eventType: 'DECREASE',
          prevSize: prevPos.size,
          newSize: newPos.size,
          deltaNotional: (prevPos.size - newPos.size) * newPos.entryPrice,
          timestamp: now,
        });
      }
    }

    for (const [asset, prevPos] of prevMap.entries()) {
      if (!newMap.has(asset)) {
        // Close
        this.repo.recordPositionEvent({
          walletAddress: address,
          asset,
          eventType: 'CLOSE',
          prevSize: prevPos.size,
          newSize: 0,
          deltaNotional: prevPos.size * prevPos.entryPrice,
          timestamp: now,
        });
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollMarketsTimer) clearInterval(this.pollMarketsTimer);
    if (this.pollWhalesTimer) clearInterval(this.pollWhalesTimer);
    this.wsClient.disconnect();
  }
}
