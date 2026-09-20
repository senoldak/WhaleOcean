import { PositionEvent } from '../../db/repository';

export interface WalletCorrelationPair {
  walletA: string;
  walletB: string;
  correlation: number; // -1.0 to +1.0
  positionSimilarity: number;
  returnCorrelation: number;
  sharedAssets: string[];
  isSyndicateWarning: boolean; // correlation >= 0.75
  leadLag?: {
    leader: string;
    follower: string;
    medianLagMinutes: number;
  };
}

export interface SyndicateCluster {
  id: string;
  wallets: string[];
  meanCorrelation: number;
  dominantDirection: string;
  warningMessage: string;
}

export interface CorrelationMatrixResult {
  wallets: string[];
  matrix: number[][]; // N x N
  pairs: WalletCorrelationPair[];
  syndicateClusters: SyndicateCluster[];
}

export interface WalletPositionSummary {
  asset: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  leverage?: number;
}

export interface WalletInput {
  address: string;
  positions?: WalletPositionSummary[];
}

/**
 * Calculates Cosine similarity between two asset exposure vectors.
 */
function calculateCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [, val] of vecA.entries()) {
    normA += val * val;
  }
  for (const [, val] of vecB.entries()) {
    normB += val * val;
  }

  if (normA === 0 || normB === 0) return 0;

  for (const [asset, valA] of vecA.entries()) {
    const valB = vecB.get(asset) || 0;
    dotProduct += valA * valB;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(1.0, Math.max(-1.0, similarity));
}

/**
 * Calculates Lead-Lag timing between two wallets using timestamp differences of matching events.
 */
function analyzeLeadLag(
  walletA: string,
  eventsA: PositionEvent[] = [],
  walletB: string,
  eventsB: PositionEvent[] = []
): { leader: string; follower: string; medianLagMinutes: number } | undefined {
  if (eventsA.length === 0 || eventsB.length === 0) return undefined;

  const lags: number[] = [];

  for (const evA of eventsA) {
    if (evA.eventType !== 'OPEN' && evA.eventType !== 'INCREASE') continue;

    // Find closest event in B on same asset within 2 hours (7,200,000 ms)
    const matchingEvB = eventsB.find(
      evB =>
        evB.asset === evA.asset &&
        (evB.eventType === 'OPEN' || evB.eventType === 'INCREASE') &&
        Math.abs(evB.timestamp - evA.timestamp) <= 7200000
    );

    if (matchingEvB) {
      // lag = tB - tA (positive means A is earlier/leader)
      lags.push(matchingEvB.timestamp - evA.timestamp);
    }
  }

  if (lags.length === 0) return undefined;

  lags.sort((a, b) => a - b);
  const medianLagMs = lags[Math.floor(lags.length / 2)];

  if (Math.abs(medianLagMs) < 30000) return undefined; // Less than 30s is simultaneous/negligible

  const leader = medianLagMs > 0 ? walletA : walletB;
  const follower = medianLagMs > 0 ? walletB : walletA;
  const medianLagMinutes = Number((Math.abs(medianLagMs) / 60000).toFixed(1));

  return { leader, follower, medianLagMinutes };
}

/**
 * Computes an N x N hybrid inter-wallet correlation matrix, flags syndicate clusters,
 * and analyzes lead-lag timing.
 */
export function calculateWalletCorrelationMatrix(
  wallets: WalletInput[],
  eventHistories?: Map<string, PositionEvent[]>
): CorrelationMatrixResult {
  const n = wallets.length;
  const addresses = wallets.map(w => w.address);
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const pairs: WalletCorrelationPair[] = [];

  // 1. Build position exposure vector for each wallet
  const exposureVectors: Map<string, number>[] = wallets.map(w => {
    const vec = new Map<string, number>();
    if (w.positions && w.positions.length > 0) {
      for (const p of w.positions) {
        const notional = p.size * p.entryPrice;
        const signedNotional = p.side === 'LONG' ? notional : -notional;
        vec.set(p.asset, (vec.get(p.asset) || 0) + signedNotional);
      }
    }
    return vec;
  });

  // 2. Compute pairwise similarity
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;

    for (let j = i + 1; j < n; j++) {
      const vecA = exposureVectors[i];
      const vecB = exposureVectors[j];

      // Identify shared assets
      const sharedAssets: string[] = [];
      for (const asset of vecA.keys()) {
        if (vecB.has(asset)) {
          sharedAssets.push(asset);
        }
      }

      const positionSim = Number(calculateCosineSimilarity(vecA, vecB).toFixed(2));

      // For return correlation, default to positionSim unless distinct event data exists
      const returnCorr = positionSim;

      // Composite correlation
      const compositeCorr = Number((0.5 * positionSim + 0.5 * returnCorr).toFixed(2));

      matrix[i][j] = compositeCorr;
      matrix[j][i] = compositeCorr;

      const isSyndicateWarning = compositeCorr >= 0.75;

      // Lead-Lag analysis if events available and correlation is notable (>= 0.60)
      let leadLag: WalletCorrelationPair['leadLag'];
      if (compositeCorr >= 0.60 && eventHistories) {
        const eventsA = eventHistories.get(addresses[i]) || [];
        const eventsB = eventHistories.get(addresses[j]) || [];
        leadLag = analyzeLeadLag(addresses[i], eventsA, addresses[j], eventsB);
      }

      pairs.push({
        walletA: addresses[i],
        walletB: addresses[j],
        correlation: compositeCorr,
        positionSimilarity: positionSim,
        returnCorrelation: returnCorr,
        sharedAssets,
        isSyndicateWarning,
        leadLag,
      });
    }
  }

  // 3. Cluster detection for high correlation syndicates (C >= 0.75)
  const syndicateClusters: SyndicateCluster[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < n; i++) {
    const addrA = addresses[i];
    if (visited.has(addrA)) continue;

    const clusterMembers: string[] = [addrA];

    for (let j = i + 1; j < n; j++) {
      const addrB = addresses[j];
      if (matrix[i][j] >= 0.75) {
        clusterMembers.push(addrB);
        visited.add(addrB);
      }
    }

    if (clusterMembers.length >= 2) {
      visited.add(addrA);
      let corrSum = 0;
      let pairCount = 0;

      for (let m = 0; m < clusterMembers.length; m++) {
        for (let k = m + 1; k < clusterMembers.length; k++) {
          const idxM = addresses.indexOf(clusterMembers[m]);
          const idxK = addresses.indexOf(clusterMembers[k]);
          corrSum += matrix[idxM][idxK];
          pairCount++;
        }
      }

      const meanCorrelation = Number((corrSum / Math.max(1, pairCount)).toFixed(2));
      const shortA = `${addrA.slice(0, 6)}...${addrA.slice(-4)}`;
      const shortB = `${clusterMembers[1].slice(0, 6)}...${clusterMembers[1].slice(-4)}`;

      syndicateClusters.push({
        id: `syndicate_${syndicateClusters.length + 1}`,
        wallets: clusterMembers,
        meanCorrelation,
        dominantDirection: 'LONG',
        warningMessage: `⚠️ Sendika / Kopya Bot Kümesi: ${shortA} ve ${shortB} (%${Math.round(meanCorrelation * 100)} korelasyon). İkisini birden kopyalamayın; aynı pozisyonu 2 kat kaldıraçla taşırsınız.`,
      });
    }
  }

  return {
    wallets: addresses,
    matrix,
    pairs,
    syndicateClusters,
  };
}
