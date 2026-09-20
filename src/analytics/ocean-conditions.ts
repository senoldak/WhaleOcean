import {
  VerifiedMarketSnapshot,
  OceanConditionMeasurement,
  OceanConditionClassification,
} from '../types/contracts';

export function calculateOceanCondition(
  currentSnapshots: VerifiedMarketSnapshot[],
  prevSnapshots: VerifiedMarketSnapshot[] = [],
  whaleExposureDelta = 0
): OceanConditionMeasurement {
  const timestamp = Date.now();

  if (currentSnapshots.length === 0) {
    return {
      timestamp,
      classification: 'CALM',
      volatilityScore: 0,
      oiChangePercent: 0,
      fundingStressScore: 0,
      whaleExposureDelta: 0,
      underlyingMetrics: {
        realizedVol1h: 0,
        oiDelta24h: 0,
        avgAbsFunding: 0,
        netWhaleDelta1h: 0,
      },
    };
  }

  // 1. Calculate price volatility across assets
  const prevMap = new Map(prevSnapshots.map(s => [s.asset, s]));
  let sumAbsPriceChangePct = 0;
  let priceChangeCount = 0;

  for (const curr of currentSnapshots) {
    const prev = prevMap.get(curr.asset);
    if (prev && prev.markPrice > 0) {
      const pct = Math.abs((curr.markPrice - prev.markPrice) / prev.markPrice) * 100;
      sumAbsPriceChangePct += pct;
      priceChangeCount++;
    }
  }

  const avgPriceChangePct = priceChangeCount > 0 ? sumAbsPriceChangePct / priceChangeCount : 0.5;
  // Scale volatility: 0% -> 0, 1% -> 30, 3% -> 75, 5%+ -> 100
  const volatilityScore = Math.min(100, Math.max(0, (avgPriceChangePct / 4.0) * 100));

  // 2. Open Interest Expansion/Contraction
  const currentTotalOi = currentSnapshots.reduce((acc, s) => acc + s.openInterest, 0);
  const prevTotalOi = prevSnapshots.reduce((acc, s) => acc + s.openInterest, 0);
  const oiChangePercent =
    prevTotalOi > 0 ? ((currentTotalOi - prevTotalOi) / prevTotalOi) * 100 : 0;
  const oiScore = Math.min(100, Math.abs(oiChangePercent) * 5); // 20% change -> 100

  // 3. Water Pressure (Funding Stress) - Scaled for 1h funding rate
  // Funding rate of 0.0000125 (0.00125%/h) is normal. 0.00006+ (0.006%/h) is heavy stress.
  const avgAbsFunding =
    currentSnapshots.reduce((acc, s) => acc + Math.abs(s.fundingRate), 0) /
    currentSnapshots.length;
  // Scale funding: 0.000015 -> 20, 0.00006 -> 80, 0.000075+ -> 100
  const fundingStressScore = Math.min(100, Math.max(0, (avgAbsFunding / 0.000075) * 100));

  // 4. Whale Exposure Delta Score
  // e.g. $50M delta -> 100
  const whaleDeltaScore = Math.min(100, (Math.abs(whaleExposureDelta) / 50_000_000) * 100);

  // Composite Score
  const compositeScore =
    volatilityScore * 0.35 +
    oiScore * 0.25 +
    fundingStressScore * 0.25 +
    whaleDeltaScore * 0.15;

  let classification: OceanConditionClassification = 'CALM';
  if (compositeScore >= 75) {
    classification = 'STORM';
  } else if (compositeScore >= 55) {
    classification = 'RESTLESS';
  } else if (compositeScore >= 25) {
    classification = 'ACTIVE';
  }

  return {
    timestamp,
    classification,
    volatilityScore: Math.round(volatilityScore * 10) / 10,
    oiChangePercent: Math.round(oiChangePercent * 100) / 100,
    fundingStressScore: Math.round(fundingStressScore * 10) / 10,
    whaleExposureDelta,
    underlyingMetrics: {
      realizedVol1h: Math.round(avgPriceChangePct * 100) / 100,
      oiDelta24h: currentTotalOi - prevTotalOi,
      avgAbsFunding: Math.round(avgAbsFunding * 100000) / 100000,
      netWhaleDelta1h: whaleExposureDelta,
    },
  };
}
