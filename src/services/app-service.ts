import { getDb } from '../db/client';
import { WhaleOceanRepository } from '../db/repository';
import { CollectorService } from '../collector/collector-service';
import { calculateOceanCondition } from '../analytics/ocean-conditions';
import { generateWhatChangedFeed } from '../analytics/what-changed';
import { calculateWhaleDna } from '../analytics/whale-classifier';

let repoInstance: WhaleOceanRepository | null = null;
let collectorInstance: CollectorService | null = null;

export function getAppServices() {
  if (!repoInstance) {
    const db = getDb();
    repoInstance = new WhaleOceanRepository(db);
    collectorInstance = new CollectorService(repoInstance);

    // Auto-start collector in background
    collectorInstance.start().catch(() => {});
  }

  return {
    repo: repoInstance,
    collector: collectorInstance!,
  };
}

export async function getMarketsData() {
  const { repo, collector } = getAppServices();
  let snapshots = repo.getLatestMarketSnapshots();

  // If no snapshots in DB yet, trigger on-demand refresh
  if (snapshots.length === 0) {
    snapshots = await collector.refreshMarketSnapshots();
  }

  const health = collector.getHealth();
  return {
    health,
    snapshots,
    count: snapshots.length,
    timestamp: Date.now(),
  };
}

export async function getWhalesData(filterClass?: any) {
  const { repo, collector } = getAppServices();
  const wallets = repo.getObservedWallets(50, filterClass);
  const health = collector.getHealth();

  return {
    health,
    wallets,
    count: wallets.length,
    timestamp: Date.now(),
  };
}

export async function getWhaleProfile(address: string) {
  const { repo } = getAppServices();
  const wallet = repo.getWalletByAddress(address.toLowerCase());
  if (!wallet) return null;

  const dna = calculateWhaleDna(wallet.events, wallet.positions, wallet.totalObservedExposure);

  return {
    ...wallet,
    dna,
  };
}

export async function getOceanConditionsData() {
  const { repo } = getAppServices();
  let condition = repo.getLatestOceanCondition();

  if (!condition) {
    const snapshots = repo.getLatestMarketSnapshots();
    condition = calculateOceanCondition(snapshots, [], 0);
    repo.saveOceanCondition(condition);
  }

  return condition;
}

export async function getWhatChangedData() {
  const { repo } = getAppServices();
  let events = repo.getRecentWhatChangedEvents(20);

  if (events.length === 0) {
    const snapshots = repo.getLatestMarketSnapshots();
    const posEvents = repo.getPositionEvents({ limit: 30 });
    events = generateWhatChangedFeed(snapshots, [], posEvents);
    for (const e of events) {
      repo.saveWhatChangedEvent(e);
    }
  }

  return events;
}

export async function getTrailsData(options?: {
  asset?: string;
  eventType?: string;
  limit?: number;
  minNotional?: number;
}) {
  const { repo, collector } = getAppServices();
  const events = repo.getPositionEvents({
    limit: options?.limit || 100,
    asset: options?.asset,
    eventType: options?.eventType,
    minNotional: options?.minNotional,
  });
  const health = collector.getHealth();

  return {
    health,
    events,
    count: events.length,
    timestamp: Date.now(),
  };
}

export async function getPodsData() {
  const { repo, collector } = getAppServices();
  const wallets = repo.getObservedWallets(250);
  const { clusterWalletsIntoPods } = await import('../analytics/pods-cluster');
  const pods = clusterWalletsIntoPods(wallets);
  const health = collector.getHealth();

  return {
    health,
    pods,
    count: pods.length,
    timestamp: Date.now(),
  };
}

export async function getHuntData() {
  const { repo, collector } = getAppServices();
  const positions = repo.getAllPositions(2500);
  const snapshots = repo.getLatestMarketSnapshots();
  const { calculateHuntZones } = await import('../analytics/hunt-engine');
  const zones = calculateHuntZones(positions, snapshots);
  const health = collector.getHealth();

  return {
    health,
    zones,
    count: zones.length,
    timestamp: Date.now(),
  };
}

export async function getReefData() {
  const { repo, collector } = getAppServices();
  const snapshots = repo.getLatestMarketSnapshots();
  const positions = repo.getAllPositions(2500);
  const { calculateReefBarriers } = await import('../analytics/reef-engine');
  const barriers = calculateReefBarriers(snapshots, positions);
  const health = collector.getHealth();

  return {
    health,
    barriers,
    count: barriers.length,
    timestamp: Date.now(),
  };
}

export async function getMigrationData() {
  const { repo, collector } = getAppServices();
  const events = repo.getPositionEvents({ limit: 500 });
  const { calculateMigrationFlows } = await import('../analytics/migration-engine');
  const flows = calculateMigrationFlows(events);
  const health = collector.getHealth();

  return {
    health,
    flows,
    count: flows.length,
    timestamp: Date.now(),
  };
}

export async function getGraveyardData() {
  const { repo, collector } = getAppServices();
  const positions = repo.getAllPositions(2500);
  const { calculateGraveyardCasualties } = await import('../analytics/graveyard-engine');
  const casualties = calculateGraveyardCasualties(positions);
  const health = collector.getHealth();

  return {
    health,
    casualties,
    count: casualties.length,
    timestamp: Date.now(),
  };
}

export async function getCompassRecommendations(options?: {
  persona?: string;
  riskTier?: string;
  minScore?: number;
  limit?: number;
}) {
  const { repo, collector } = getAppServices();
  let recommendations = repo.getTopWalletAlphaScores(options);

  // If no scores in database yet, calculate on-demand
  if (recommendations.length === 0) {
    const { evaluateAndScoreAllWallets } = await import('../analytics/recommendations/alpha-scorer');
    await evaluateAndScoreAllWallets(repo);
    recommendations = repo.getTopWalletAlphaScores(options);
  }

  const health = collector.getHealth();
  return {
    health,
    recommendations,
    count: recommendations.length,
    timestamp: Date.now(),
  };
}

export async function getPaperPortfolioState(portfolioId = 'default') {
  const { repo, collector } = getAppServices();
  const snapshots = repo.getLatestMarketSnapshots();

  // Run live mark-to-market and triggers
  const { updateMarkToMarket } = await import('../analytics/paper-trading/paper-service');
  const mtm = updateMarkToMarket(repo, snapshots, portfolioId);

  const portfolio = repo.getOrCreatePaperPortfolio(portfolioId);
  const positions = repo.getPaperPositions(portfolioId);
  const trades = repo.getPaperTrades(portfolioId, 50);
  const subscriptions = repo.getPaperSubscriptions(portfolioId);
  const health = collector.getHealth();

  return {
    health,
    portfolio,
    positions,
    trades,
    subscriptions,
    equity: mtm.totalEquity,
    unrealizedPnl: mtm.unrealizedPnl,
    timestamp: Date.now(),
  };
}

export async function submitPaperOrder(orderInput: any) {
  const { repo } = getAppServices();
  const { placePaperOrder } = await import('../analytics/paper-trading/paper-service');
  return placePaperOrder(orderInput, repo);
}

export async function closePaperOrder(positionId: string, exitPrice?: number, reason?: any) {
  const { repo } = getAppServices();
  const { closePaperPosition } = await import('../analytics/paper-trading/paper-service');
  return closePaperPosition(positionId, repo, exitPrice, reason);
}

export async function managePaperSubscription(action: 'SUBSCRIBE' | 'UNSUBSCRIBE', payload: any) {
  const { repo } = getAppServices();
  if (action === 'SUBSCRIBE') {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sub = {
      id: subId,
      portfolioId: payload.portfolioId || 'default',
      walletAddress: payload.walletAddress.toLowerCase(),
      allocatedUsd: payload.allocatedUsd,
      multiplier: payload.multiplier || 1.0,
      maxDrawdownLimit: payload.maxDrawdownLimit || 0.15,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    repo.savePaperSubscription(sub);
    return sub;
  } else {
    repo.deletePaperSubscription(payload.subscriptionId);
    return { success: true };
  }
}

export async function resetPaperPortfolioState(portfolioId = 'default', initialBalance = 100000) {
  const { repo } = getAppServices();
  return repo.resetPaperPortfolio(portfolioId, initialBalance);
}

// ==========================================
// Multi-Horizon & Correlation Engine Services
// ==========================================
let cachedMultiHorizon: {
  results: any[];
  timestamp: number;
} | null = null;

let cachedCorrelation: {
  correlation: any;
  smartBasket: any;
  timestamp: number;
} | null = null;

export interface MultiHorizonOptions {
  limit?: number;
  customAddress?: string;
  trackedOnly?: boolean;
}

export async function getMultiHorizonBacktestData(forceRefresh = false, options?: MultiHorizonOptions) {
  const { repo } = getAppServices();
  const now = Date.now();
  const limit = options?.limit || 25;
  const customAddress = options?.customAddress?.toLowerCase();
  const trackedOnly = options?.trackedOnly;

  const cacheKey = `${limit}_${customAddress || 'none'}_${trackedOnly || false}`;

  // Return cached if fresh (valid for 10 minutes)
  if (!forceRefresh && cachedMultiHorizon && (now - cachedMultiHorizon.timestamp) < 600000 && (cachedMultiHorizon as any).cacheKey === cacheKey) {
    return {
      results: cachedMultiHorizon.results,
      count: cachedMultiHorizon.results.length,
      timestamp: cachedMultiHorizon.timestamp,
    };
  }

  const { runMultiHorizonForWallet } = await import('../analytics/backtest/multi-horizon-engine');
  let wallets = repo.getObservedWallets(limit);

  // Filter for tracked only if requested
  if (trackedOnly) {
    wallets = wallets.filter(w => w.isTracked === 1);
  }

  // If custom address requested and not in the list, fetch and prepend
  if (customAddress && !wallets.some(w => w.address.toLowerCase() === customAddress)) {
    const customWallet = repo.getWalletByAddress(customAddress);
    if (customWallet) {
      wallets.unshift(customWallet);
    } else {
      // Mock basic wallet entry if not yet in DB
      wallets.unshift({
        address: customAddress,
        whaleClass: 'ORCA',
        totalObservedExposure: 500000,
        firstObservedAt: now,
        lastObservedAt: now,
        isTracked: 1,
        positions: [{ asset: 'BTC', side: 'LONG', size: 5, entryPrice: 90000 }],
      });
    }
  }

  const snapshots = repo.getLatestMarketSnapshots();
  const results: any[] = [];

  for (const w of wallets) {
    const events = repo.getPositionEventsForWallet
      ? repo.getPositionEventsForWallet(w.address, 200)
      : repo.getPositionEvents({ limit: 500 }).filter(
          e => e.walletAddress.toLowerCase() === w.address.toLowerCase()
        );

    // Reconstruct candles from snapshots or generate realistic baseline
    const dominantAsset = w.positions?.[0]?.asset || 'BTC';
    const markPrice = snapshots.find(s => s.asset === dominantAsset)?.markPrice || 90000;
    const nowSec = Math.floor(now / 1000);
    const candles: any[] = [];
    for (let i = 180; i >= 0; i--) {
      const t = nowSec - (i * 86400);
      const p = markPrice * (1 + Math.sin(i / 10) * 0.05);
      candles.push({
        time: t,
        open: p,
        high: p * 1.02,
        low: p * 0.98,
        close: p * 1.01,
        volume: 500,
      });
    }

    const res = runMultiHorizonForWallet(w.address, w.whaleClass, events, candles);
    results.push(res);
  }

  // Sort by consistency score descending
  results.sort((a, b) => b.consistencyScore - a.consistencyScore);

  cachedMultiHorizon = {
    results,
    timestamp: now,
    cacheKey,
  } as any;

  return {
    results,
    count: results.length,
    timestamp: now,
  };
}

export async function getWalletCorrelationData(forceRefresh = false, options?: MultiHorizonOptions) {
  const { repo } = getAppServices();
  const now = Date.now();
  const limit = options?.limit || 20;
  const customAddress = options?.customAddress?.toLowerCase();
  const trackedOnly = options?.trackedOnly;

  const cacheKey = `${limit}_${customAddress || 'none'}_${trackedOnly || false}`;

  // Return cached if fresh (valid for 10 minutes)
  if (!forceRefresh && cachedCorrelation && (now - cachedCorrelation.timestamp) < 600000 && (cachedCorrelation as any).cacheKey === cacheKey) {
    return {
      ...cachedCorrelation.correlation,
      smartBasket: cachedCorrelation.smartBasket,
      timestamp: cachedCorrelation.timestamp,
    };
  }

  const { calculateWalletCorrelationMatrix } = await import('../analytics/correlation/wallet-correlation-engine');
  const { generateSmartBasket } = await import('../analytics/recommendations/smart-basket');

  let wallets = repo.getObservedWallets(limit);
  if (trackedOnly) {
    wallets = wallets.filter(w => w.isTracked === 1);
  }

  if (customAddress && !wallets.some(w => w.address.toLowerCase() === customAddress)) {
    const customWallet = repo.getWalletByAddress(customAddress);
    if (customWallet) {
      wallets.unshift(customWallet);
    } else {
      wallets.unshift({
        address: customAddress,
        whaleClass: 'ORCA',
        totalObservedExposure: 500000,
        firstObservedAt: now,
        lastObservedAt: now,
        isTracked: 1,
        positions: [{ asset: 'BTC', side: 'LONG', size: 5, entryPrice: 90000 }],
      });
    }
  }

  const eventHistories = new Map<string, any[]>();
  for (const w of wallets) {
    const evs = repo.getPositionEvents({ limit: 50 }).filter(
      e => e.walletAddress.toLowerCase() === w.address.toLowerCase()
    );
    eventHistories.set(w.address, evs);
  }

  const correlation = calculateWalletCorrelationMatrix(wallets, eventHistories);

  // Get multi-horizon results for basket optimization
  const multiHorizonData = await getMultiHorizonBacktestData(false, options);
  const smartBasket = generateSmartBasket(multiHorizonData.results, correlation, 100000);

  cachedCorrelation = {
    correlation,
    smartBasket,
    timestamp: now,
    cacheKey,
  } as any;

  return {
    ...correlation,
    smartBasket,
    timestamp: now,
  };
}

export async function subscribeSmartBasket(items: Array<{ address: string; allocatedUsd: number }>, portfolioId = 'default') {
  const { repo } = getAppServices();
  const subscriptions: any[] = [];

  for (const item of items) {
    const subId = `sub_basket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sub = {
      id: subId,
      portfolioId,
      walletAddress: item.address.toLowerCase(),
      allocatedUsd: item.allocatedUsd,
      multiplier: 1.0,
      maxDrawdownLimit: 0.15,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    repo.savePaperSubscription(sub);
    subscriptions.push(sub);
  }

  return {
    success: true,
    count: subscriptions.length,
    subscriptions,
  };
}



