import { MultiHorizonWalletResult } from '../backtest/multi-horizon-engine';
import { CorrelationMatrixResult } from '../correlation/wallet-correlation-engine';

export interface SmartBasketItem {
  address: string;
  whaleClass: string;
  dominantAsset: string;
  consistencyScore: number;
  sharpe3M: number;
  maxDrawdown: number;
  weightPct: number; // e.g. 35 for 35%
  allocatedUsd: number;
  role: 'CORE_ALPHA' | 'HEDGE' | 'STABLE_COMPOUNDER';
}

export interface SmartBasketRecommendation {
  basketId: string;
  title: string;
  description: string;
  targetCapital: number;
  expectedSharpe: number;
  maxPairwiseCorrelation: number;
  items: SmartBasketItem[];
  generatedAt: number;
}

/**
 * Optimizes an uncorrelated, risk-parity weighted basket of 3-5 whales.
 */
export function generateSmartBasket(
  multiHorizonResults: MultiHorizonWalletResult[],
  correlationMatrix: CorrelationMatrixResult,
  targetCapital = 100000
): SmartBasketRecommendation {
  const addressToIndex = new Map<string, number>();
  correlationMatrix.wallets.forEach((addr, idx) => {
    addressToIndex.set(addr.toLowerCase(), idx);
  });

  // Filter candidates that exist in the correlation matrix
  const eligible = multiHorizonResults.filter(r => addressToIndex.has(r.address.toLowerCase()));

  // Sort by consistency score descending
  const sorted = [...eligible].sort((a, b) => b.consistencyScore - a.consistencyScore);

  if (sorted.length === 0) {
    return {
      basketId: `basket_${Date.now()}`,
      title: 'Optimal Alfa Sepeti',
      description: 'Yetersiz cüzdan verisi.',
      targetCapital,
      expectedSharpe: 0,
      maxPairwiseCorrelation: 0,
      items: [],
      generatedAt: Date.now(),
    };
  }

  const selected: MultiHorizonWalletResult[] = [sorted[0]];

  // Greedily pick up to 4 wallets with pairwise correlation <= 0.35
  for (let i = 1; i < sorted.length && selected.length < 4; i++) {
    const candidate = sorted[i];
    const candIdx = addressToIndex.get(candidate.address.toLowerCase())!;

    let isUncorrelated = true;
    for (const sel of selected) {
      const selIdx = addressToIndex.get(sel.address.toLowerCase())!;
      const corr = correlationMatrix.matrix[candIdx][selIdx];
      if (corr > 0.35) {
        isUncorrelated = false;
        break;
      }
    }

    if (isUncorrelated) {
      selected.push(candidate);
    }
  }

  // If fewer than 2 picked and more are available, pick the candidate with minimum correlation
  if (selected.length < 2 && sorted.length >= 2) {
    const selIdx = addressToIndex.get(selected[0].address.toLowerCase())!;
    let bestCand: MultiHorizonWalletResult | null = null;
    let minCorr = 999;

    for (let i = 1; i < sorted.length; i++) {
      const cIdx = addressToIndex.get(sorted[i].address.toLowerCase())!;
      const corr = correlationMatrix.matrix[selIdx][cIdx];
      if (corr < minCorr) {
        minCorr = corr;
        bestCand = sorted[i];
      }
    }

    if (bestCand) {
      selected.push(bestCand);
    }
  }

  // Calculate Max Pairwise Correlation in selected basket
  let maxPairwise = -1;
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const idxA = addressToIndex.get(selected[i].address.toLowerCase())!;
      const idxB = addressToIndex.get(selected[j].address.toLowerCase())!;
      const c = correlationMatrix.matrix[idxA][idxB];
      if (c > maxPairwise) maxPairwise = c;
    }
  }

  // Inverse Drawdown Risk-Parity Weighting
  const rawWeights = selected.map(s => {
    const dd = Math.max(5, s.metrics3M.maxDrawdownPct || 10);
    return 1 / dd;
  });
  const sumRaw = rawWeights.reduce((a, b) => a + b, 0);

  // Normalize to 100%
  let roundedWeights = rawWeights.map(rw => Math.round((rw / sumRaw) * 100));
  const diff = 100 - roundedWeights.reduce((a, b) => a + b, 0);
  roundedWeights[0] += diff;

  // Determine roles
  let highestSharpeIdx = 0;
  let lowestDdIdx = 0;
  let maxSharpe = -999;
  let minDd = 999;

  selected.forEach((s, idx) => {
    if (s.metrics3M.sharpeRatio > maxSharpe) {
      maxSharpe = s.metrics3M.sharpeRatio;
      highestSharpeIdx = idx;
    }
    if (s.metrics3M.maxDrawdownPct < minDd) {
      minDd = s.metrics3M.maxDrawdownPct;
      lowestDdIdx = idx;
    }
  });

  const items: SmartBasketItem[] = selected.map((s, idx) => {
    let role: SmartBasketItem['role'] = 'HEDGE';
    if (idx === highestSharpeIdx) role = 'CORE_ALPHA';
    else if (idx === lowestDdIdx) role = 'STABLE_COMPOUNDER';

    const weightPct = roundedWeights[idx];
    const allocatedUsd = Math.round((weightPct / 100) * targetCapital);

    return {
      address: s.address,
      whaleClass: s.whaleClass,
      dominantAsset: s.dominantAsset,
      consistencyScore: s.consistencyScore,
      sharpe3M: s.metrics3M.sharpeRatio,
      maxDrawdown: s.metrics3M.maxDrawdownPct,
      weightPct,
      allocatedUsd,
      role,
    };
  });

  // Calculate weighted expected Sharpe
  const expectedSharpe = Number(
    items.reduce((acc, item) => acc + item.sharpe3M * (item.weightPct / 100), 0).toFixed(2)
  );

  return {
    basketId: `basket_${Date.now()}`,
    title: 'Optimal Korelasyonsuz Alfa Sepeti',
    description:
      'Tarihsel çoklu vadede en yüksek tutarlılığa ve birbirleri arasında en düşük korelasyona sahip kurumsal balina portföyü.',
    targetCapital,
    expectedSharpe,
    maxPairwiseCorrelation: Number(maxPairwise.toFixed(2)),
    items,
    generatedAt: Date.now(),
  };
}
