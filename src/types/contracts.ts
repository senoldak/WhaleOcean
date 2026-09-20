import { z } from 'zod';

// ==========================================
// 1. Whale Classification Types & Schemas
// ==========================================
export const WhaleClassSchema = z.enum([
  'FISH',
  'DOLPHIN',
  'SHARK',
  'HUMPBACK',
  'ORCA',
  'BLUE_WHALE',
  'SPERM_WHALE',
]);
export type WhaleClass = z.infer<typeof WhaleClassSchema>;

export const WHALE_TIER_THRESHOLDS: Record<WhaleClass, { min: number; max: number }> = {
  FISH: { min: 0, max: 50_000 },
  DOLPHIN: { min: 50_000, max: 250_000 },
  SHARK: { min: 250_000, max: 1_000_000 },
  HUMPBACK: { min: 1_000_000, max: 5_000_000 },
  ORCA: { min: 5_000_000, max: 20_000_000 },
  BLUE_WHALE: { min: 20_000_000, max: 50_000_000 },
  SPERM_WHALE: { min: 50_000_000, max: Infinity },
};

// ==========================================
// 2. Verified Market Snapshot
// ==========================================
export const VerifiedMarketSnapshotSchema = z.object({
  asset: z.string().min(1),
  markPrice: z.number().positive(),
  oraclePrice: z.number().positive(),
  openInterest: z.number().nonnegative(),
  fundingRate: z.number(),
  volume24h: z.number().nonnegative(),
  observedTimestamp: z.number().int().positive(),
  source: z.literal('hyperliquid:metaAndAssetCtxs'),
});
export type VerifiedMarketSnapshot = z.infer<typeof VerifiedMarketSnapshotSchema>;

// ==========================================
// 3. Verified Positions & Wallets
// ==========================================
export const VerifiedPositionSchema = z.object({
  asset: z.string().min(1),
  side: z.enum(['LONG', 'SHORT']),
  size: z.number().positive(),
  entryPrice: z.number().positive(),
  liquidationPrice: z.number().positive().nullable(),
  leverage: z.number().positive(),
  unrealizedPnl: z.number(),
});
export type VerifiedPosition = z.infer<typeof VerifiedPositionSchema>;

export const EthAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const VerifiedWalletObservationSchema = z.object({
  walletAddress: z.string().regex(EthAddressRegex, 'Must be a valid 0x hex address'),
  whaleClass: WhaleClassSchema,
  totalNotionalExposure: z.number().nonnegative(),
  positions: z.array(VerifiedPositionSchema),
  observedTimestamp: z.number().int().positive(),
  source: z.literal('hyperliquid:clearinghouseState'),
});
export type VerifiedWalletObservation = z.infer<typeof VerifiedWalletObservationSchema>;

// ==========================================
// 4. Ocean Conditions Measurement
// ==========================================
export const OceanConditionClassificationSchema = z.enum([
  'CALM',
  'ACTIVE',
  'RESTLESS',
  'STORM',
]);
export type OceanConditionClassification = z.infer<typeof OceanConditionClassificationSchema>;

export const OceanConditionSchema = z.object({
  timestamp: z.number().int().positive(),
  classification: OceanConditionClassificationSchema,
  volatilityScore: z.number().min(0).max(100),
  oiChangePercent: z.number(),
  fundingStressScore: z.number().min(0).max(100),
  whaleExposureDelta: z.number(),
  underlyingMetrics: z.object({
    realizedVol1h: z.number(),
    oiDelta24h: z.number(),
    avgAbsFunding: z.number(),
    netWhaleDelta1h: z.number(),
  }),
});
export type OceanConditionMeasurement = z.infer<typeof OceanConditionSchema>;

// ==========================================
// 5. What Changed Event
// ==========================================
export const WhatChangedCategorySchema = z.enum([
  'EXPOSURE',
  'POSITION',
  'LIQUIDATION',
  'ANOMALY',
  'OCEAN_STATE',
]);
export type WhatChangedCategory = z.infer<typeof WhatChangedCategorySchema>;

export const WhatChangedEventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int().positive(),
  category: WhatChangedCategorySchema,
  asset: z.string().optional(),
  statement: z.string().min(5),
  deltaValue: z.number().optional(),
  timeWindowMinutes: z.number().positive(),
  source: z.literal('verified_delta:position_events'),
});
export type WhatChangedEvent = z.infer<typeof WhatChangedEventSchema>;

// ==========================================
// 6. Truthful Connection & Freshness Status
// ==========================================
export const ConnectionStatusSchema = z.enum([
  'LIVE',
  'CONNECTING',
  'STALE',
  'DATA_UNAVAILABLE',
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export interface ConnectionHealth {
  status: ConnectionStatus;
  lastMessageTimestamp: number | null;
  latencyMs: number | null;
  reconnectAttempts: number;
}

// ==========================================
// 7. Strict Runtime Validation Guards
// ==========================================
export function validateMarketSnapshot(data: unknown): VerifiedMarketSnapshot {
  const result = VerifiedMarketSnapshotSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid market snapshot or unverified source: ${result.error.message}`
    );
  }
  return result.data;
}

export function validateWalletObservation(data: unknown): VerifiedWalletObservation {
  const result = VerifiedWalletObservationSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid wallet observation or unverified source: ${result.error.message}`
    );
  }
  return result.data;
}

// ==========================================
// 8. Ocean Alpha & Recommendation Contracts
// ==========================================
export const OceanPersonaSchema = z.enum(['TRITON', 'ORCA', 'LEVIATHAN']);
export type OceanPersona = z.infer<typeof OceanPersonaSchema>;

export const RiskTierSchema = z.enum(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE']);
export type RiskTier = z.infer<typeof RiskTierSchema>;

export const WalletAlphaScoreSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  oceanAlphaScore: z.number().min(0).max(100),
  persona: OceanPersonaSchema,
  riskTier: RiskTierSchema,
  sharpeRatio: z.number(),
  sortinoRatio: z.number(),
  maxDrawdown: z.number().nonnegative(),
  profitFactor: z.number().nonnegative(),
  winRate: z.number().min(0).max(100),
  totalTrades: z.number().int().nonnegative(),
  avgHoldingHours: z.number().nonnegative(),
  totalPnlUsd: z.number(),
  liquidationDistanceScore: z.number().min(0).max(100),
  lastEvaluatedAt: z.number().int().positive(),
});
export type WalletAlphaScore = z.infer<typeof WalletAlphaScoreSchema>;

// ==========================================
// 9. Paper Trading Contracts
// ==========================================
export const PaperPortfolioSchema = z.object({
  id: z.string(),
  initialBalance: z.number().positive(),
  cashBalance: z.number(),
  marginUsed: z.number().nonnegative(),
  realizedPnl: z.number(),
  updatedAt: z.number().int().positive(),
});
export type PaperPortfolio = z.infer<typeof PaperPortfolioSchema>;

export const PaperPositionSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  asset: z.string(),
  side: z.enum(['LONG', 'SHORT']),
  size: z.number().positive(),
  entryPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  leverage: z.number().min(1).max(100),
  marginUsed: z.number().positive(),
  unrealizedPnl: z.number(),
  liquidationPrice: z.number().nullable().optional(),
  takeProfit: z.number().nullable().optional(),
  stopLoss: z.number().nullable().optional(),
  source: z.enum(['MANUAL', 'COPY_WHALE', 'STRATEGY_BOT']),
  sourceWallet: z.string().nullable().optional(),
  openedAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});
export type PaperPosition = z.infer<typeof PaperPositionSchema>;

export const PaperTradeSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  asset: z.string(),
  side: z.enum(['LONG', 'SHORT']),
  size: z.number().positive(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive(),
  leverage: z.number().positive(),
  realizedPnl: z.number(),
  feePaid: z.number().nonnegative(),
  fundingPaid: z.number(),
  source: z.enum(['MANUAL', 'COPY_WHALE', 'STRATEGY_BOT']),
  sourceWallet: z.string().nullable().optional(),
  closeReason: z.enum(['MANUAL', 'TP', 'SL', 'WHALE_CLOSED', 'LIQUIDATED']),
  openedAt: z.number().int().positive(),
  closedAt: z.number().int().positive(),
});
export type PaperTrade = z.infer<typeof PaperTradeSchema>;

export const PaperSubscriptionSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  allocatedUsd: z.number().positive(),
  multiplier: z.number().positive(),
  maxDrawdownLimit: z.number().min(0.01).max(1.0),
  isActive: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});
export type PaperSubscription = z.infer<typeof PaperSubscriptionSchema>;

// ==========================================
// 10. Backtest Engine Contracts
// ==========================================
export interface BacktestParams {
  mode: 'WHALE_REPLICATION' | 'OCEAN_RULE_STRATEGY';
  targetWallet?: string;
  asset?: string;
  candleInterval?: string; // '15m' | '1h' | '4h' | '1d'
  startTime?: number;
  endTime?: number;
  initialCapital?: number;
  leverage?: number;
  takerFeePct?: number; // default 0.00035 (0.035%)
  makerFeePct?: number; // default 0.00010 (0.010%)
  slippageBps?: number; // basis points, e.g. 5 = 0.05%
  deductFunding?: boolean;
  strategyRule?: {
    oceanConditionMin?: string;
    requirePositiveWhaleDelta?: boolean;
    takeProfitPct?: number;
    stopLossPct?: number;
    strategyPreset?: 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'BREAKOUT_MOMENTUM';
  };
}

export interface BacktestTrade {
  id: string;
  asset: string;
  side: 'LONG' | 'SHORT';
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  size: number;
  notional: number;
  feePaid: number;
  fundingPaid: number;
  pnl: number;
  pnlPercent: number;
  exitReason: string;
}

export interface BacktestResult {
  params: BacktestParams;
  summary: {
    initialCapital: number;
    finalEquity: number;
    totalReturnUsd: number;
    totalReturnPct: number;
    benchmarkBtcReturnPct: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdownPct: number;
    profitFactor: number;
    winRatePct: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalFeesPaid: number;
    totalFundingPaid: number;
    expectancyUsd: number;
    avgHoldingTimeHours: number;
  };
  equityCurve: Array<{
    timestamp: number;
    equity: number;
    benchmarkEquity: number;
    drawdownPct: number;
  }>;
  trades: BacktestTrade[];
}

