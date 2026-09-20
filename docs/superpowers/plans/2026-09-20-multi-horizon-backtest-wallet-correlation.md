# Multi-Horizon Backtesting, Wallet Correlation Heatmap & Smart Basket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an institutional-grade multi-horizon backtesting matrix (1M / 3M / 6M) with Consistency Scoring, an interactive N×N Inter-Wallet Correlation Heatmap with Syndicate/Duplicate detection and Lead-Lag indicators, and a 1-click "Smart Basket" optimizer directly connecting to HELM Paper Trading.

**Architecture:** Modüler backend motorları (`multi-horizon-engine`, `wallet-correlation-engine`, `smart-basket`) önbellekli API rotalarıyla beslenir (`/api/backtest/multi-horizon`, `/api/wallets/correlation`, `/api/paper/basket-subscribe`). `/sonar` sayfası 3 sekmeli bir kurumsal terminale dönüşür (`Simülatör`, `Çoklu Vade`, `Korelasyon Radarı`).

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS, Lucide Icons, SQLite (node:sqlite DatabaseSync), Vitest.

## Global Constraints

- Zero-Fake-Data Anti-Survivorship policy: Real exchange market data and frictions (taker fees 0.035%, dynamic slippage, 8h funding carry).
- All mathematical metrics must be strictly bounded: Consistency Score $\in [0, 100]$, Correlation $C \in [-1.0, 1.0]$, Basket weights $\sum w_i = 1.0$.
- Sub-100ms response time for GET endpoints via precomputed memory caching.
- Strict localization support in both Turkish (`tr.ts`) and English (`en.ts`).

---

### Task 1: Multi-Horizon Backtesting Engine (`multi-horizon-engine.ts`)

**Files:**
- Create: `src/analytics/backtest/multi-horizon-engine.ts`
- Test: `tests/multi-horizon-engine.test.ts`

**Interfaces:**
- Consumes: `CandleData`, `runBacktest`, `calculateSharpeRatio`, `calculateMaxDrawdown` from `src/analytics/backtest/backtest-engine.ts`, `PositionEvent` from `src/db/repository.ts`.
- Produces:
  ```typescript
  export interface HorizonMetrics {
    horizon: '1M' | '3M' | '6M';
    days: number;
    totalReturnPct: number;
    totalReturnUsd: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdownPct: number;
    winRatePct: number;
    totalTrades: number;
  }

  export interface MultiHorizonWalletResult {
    address: string;
    whaleClass: string;
    dominantAsset: string;
    metrics1M: HorizonMetrics;
    metrics3M: HorizonMetrics;
    metrics6M: HorizonMetrics;
    consistencyScore: number; // 0 - 100
    regimeResilience: 'ROBUST' | 'MODERATE' | 'FRAGILE';
    lastEvaluatedAt: number;
  }

  export function calculateConsistencyScore(m1: HorizonMetrics, m3: HorizonMetrics, m6: HorizonMetrics): number;
  export function runMultiHorizonForWallet(address: string, whaleClass: string, events: PositionEvent[], candles: CandleData[]): MultiHorizonWalletResult;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/multi-horizon-engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateConsistencyScore,
  runMultiHorizonForWallet,
  HorizonMetrics,
} from '../src/analytics/backtest/multi-horizon-engine';
import { PositionEvent } from '../src/db/repository';
import { CandleData } from '../src/analytics/backtest/backtest-engine';

describe('Multi-Horizon Backtest Engine', () => {
  it('calculates bounded Consistency Score (0-100) favoring steady profits and low drawdowns', () => {
    const steady1M: HorizonMetrics = {
      horizon: '1M', days: 30, totalReturnPct: 15, totalReturnUsd: 15000,
      sharpeRatio: 2.2, sortinoRatio: 3.0, maxDrawdownPct: 5, winRatePct: 65, totalTrades: 12
    };
    const steady3M: HorizonMetrics = {
      horizon: '3M', days: 90, totalReturnPct: 45, totalReturnUsd: 45000,
      sharpeRatio: 2.0, sortinoRatio: 2.8, maxDrawdownPct: 8, winRatePct: 60, totalTrades: 35
    };
    const steady6M: HorizonMetrics = {
      horizon: '6M', days: 180, totalReturnPct: 85, totalReturnUsd: 85000,
      sharpeRatio: 1.9, sortinoRatio: 2.6, maxDrawdownPct: 10, winRatePct: 58, totalTrades: 70
    };

    const score = calculateConsistencyScore(steady1M, steady3M, steady6M);
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);

    const volatile1M: HorizonMetrics = { ...steady1M, totalReturnPct: 200, maxDrawdownPct: 48, sharpeRatio: 0.8 };
    const volatile3M: HorizonMetrics = { ...steady3M, totalReturnPct: -20, maxDrawdownPct: 55, sharpeRatio: -0.2 };
    const volatile6M: HorizonMetrics = { ...steady6M, totalReturnPct: -40, maxDrawdownPct: 60, sharpeRatio: -0.5 };

    const volatileScore = calculateConsistencyScore(volatile1M, volatile3M, volatile6M);
    expect(volatileScore).toBeLessThan(45);
  });

  it('runs multi-horizon evaluation for wallet position events', () => {
    const events: PositionEvent[] = [
      { walletAddress: '0x1234567890123456789012345678901234567890', asset: 'BTC', eventType: 'OPEN', prevSize: 0, newSize: 1, deltaNotional: 90000, timestamp: Date.now() - 25 * 86400000 },
      { walletAddress: '0x1234567890123456789012345678901234567890', asset: 'BTC', eventType: 'CLOSE', prevSize: 1, newSize: 0, deltaNotional: -95000, timestamp: Date.now() - 20 * 86400000 },
    ];
    const candles: CandleData[] = [
      { time: Math.floor((Date.now() - 30 * 86400000) / 1000), open: 90000, high: 96000, low: 89000, close: 95000, volume: 100 },
    ];

    const res = runMultiHorizonForWallet('0x1234567890123456789012345678901234567890', 'ORCA', events, candles);
    expect(res.address).toBe('0x1234567890123456789012345678901234567890');
    expect(res.metrics1M).toBeDefined();
    expect(res.metrics3M).toBeDefined();
    expect(res.metrics6M).toBeDefined();
    expect(res.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(res.consistencyScore).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/multi-horizon-engine.test.ts`  
Expected: FAIL with module not found or functions undefined.

- [ ] **Step 3: Implement `multi-horizon-engine.ts`**

Implement calculation formulas, window partitioning, Sharpe/MaxDD extraction, Consistency Score, and regime classification (`ROBUST`, `MODERATE`, `FRAGILE`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/multi-horizon-engine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/backtest/multi-horizon-engine.ts tests/multi-horizon-engine.test.ts
git commit -m "feat(analytics): implement multi-horizon backtesting engine with consistency scoring"
```

---

### Task 2: Inter-Wallet Correlation & Syndicate Detection Engine (`wallet-correlation-engine.ts`)

**Files:**
- Create: `src/analytics/correlation/wallet-correlation-engine.ts`
- Test: `tests/wallet-correlation-engine.test.ts`

**Interfaces:**
- Consumes: `RawWalletWithPositions` from `src/analytics/pods-cluster.ts`, `PositionEvent` from `src/db/repository.ts`.
- Produces:
  ```typescript
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

  export interface CorrelationMatrixResult {
    wallets: string[];
    matrix: number[][]; // N x N
    pairs: WalletCorrelationPair[];
    syndicateClusters: Array<{
      id: string;
      wallets: string[];
      meanCorrelation: number;
      dominantDirection: string;
      warningMessage: string;
    }>;
  }

  export function calculateWalletCorrelationMatrix(wallets: any[], eventHistories?: Map<string, PositionEvent[]>): CorrelationMatrixResult;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/wallet-correlation-engine.test.ts
import { describe, it, expect } from 'vitest';
import { calculateWalletCorrelationMatrix } from '../src/analytics/correlation/wallet-correlation-engine';

describe('Wallet Correlation & Syndicate Detection Engine', () => {
  it('computes symmetric NxN correlation matrix with 1.0 on diagonals', () => {
    const wallets = [
      {
        address: '0x1111111111111111111111111111111111111111',
        positions: [{ asset: 'BTC', side: 'LONG', size: 10, entryPrice: 90000, leverage: 3 }],
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        positions: [{ asset: 'BTC', side: 'LONG', size: 8, entryPrice: 90200, leverage: 3 }],
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        positions: [{ asset: 'BTC', side: 'SHORT', size: 5, entryPrice: 91000, leverage: 2 }],
      },
    ];

    const res = calculateWalletCorrelationMatrix(wallets);
    expect(res.wallets.length).toBe(3);
    expect(res.matrix[0][0]).toBe(1.0);
    expect(res.matrix[1][1]).toBe(1.0);
    expect(res.matrix[2][2]).toBe(1.0);
    expect(res.matrix[0][1]).toBeCloseTo(res.matrix[1][0], 2);

    // Wallets 1 and 2 are both Long BTC -> High positive correlation
    expect(res.matrix[0][1]).toBeGreaterThan(0.70);
    // Wallets 1 and 3 are Long vs Short BTC -> Negative correlation
    expect(res.matrix[0][2]).toBeLessThan(0);

    // Syndicate detection should flag wallet 1 and 2
    const syndicate = res.syndicateClusters.find(c => c.wallets.includes('0x1111111111111111111111111111111111111111'));
    expect(syndicate).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wallet-correlation-engine.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `wallet-correlation-engine.ts`**

Implement vector cosine similarity, return correlation, composite $C(A, B)$, cluster grouping for $C \ge 0.75$, and lead-lag timing comparison.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wallet-correlation-engine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/correlation/wallet-correlation-engine.ts tests/wallet-correlation-engine.test.ts
git commit -m "feat(analytics): implement wallet correlation engine and syndicate cluster detection"
```

---

### Task 3: Smart Basket Optimization Engine (`smart-basket.ts`)

**Files:**
- Create: `src/analytics/recommendations/smart-basket.ts`
- Test: `tests/smart-basket.test.ts`

**Interfaces:**
- Consumes: `MultiHorizonWalletResult` from `src/analytics/backtest/multi-horizon-engine.ts`, `CorrelationMatrixResult` from `src/analytics/correlation/wallet-correlation-engine.ts`.
- Produces:
  ```typescript
  export interface SmartBasketItem {
    address: string;
    whaleClass: string;
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

  export function generateSmartBasket(
    multiHorizonResults: MultiHorizonWalletResult[],
    correlationMatrix: CorrelationMatrixResult,
    targetCapital?: number
  ): SmartBasketRecommendation;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/smart-basket.test.ts
import { describe, it, expect } from 'vitest';
import { generateSmartBasket } from '../src/analytics/recommendations/smart-basket';
import { MultiHorizonWalletResult } from '../src/analytics/backtest/multi-horizon-engine';
import { CorrelationMatrixResult } from '../src/analytics/correlation/wallet-correlation-engine';

describe('Smart Basket Optimization Engine', () => {
  it('constructs an uncorrelated basket with risk-parity weights summing to 100%', () => {
    const candidates: MultiHorizonWalletResult[] = [
      {
        address: '0x1111111111111111111111111111111111111111',
        whaleClass: 'LEVIATHAN',
        dominantAsset: 'BTC',
        metrics1M: { horizon: '1M', days: 30, totalReturnPct: 15, totalReturnUsd: 15000, sharpeRatio: 2.2, sortinoRatio: 3, maxDrawdownPct: 8, winRatePct: 65, totalTrades: 10 },
        metrics3M: { horizon: '3M', days: 90, totalReturnPct: 40, totalReturnUsd: 40000, sharpeRatio: 2.1, sortinoRatio: 2.8, maxDrawdownPct: 10, winRatePct: 62, totalTrades: 30 },
        metrics6M: { horizon: '6M', days: 180, totalReturnPct: 75, totalReturnUsd: 75000, sharpeRatio: 2.0, sortinoRatio: 2.6, maxDrawdownPct: 12, winRatePct: 60, totalTrades: 60 },
        consistencyScore: 88,
        regimeResilience: 'ROBUST',
        lastEvaluatedAt: Date.now(),
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        whaleClass: 'ORCA',
        dominantAsset: 'ETH',
        metrics1M: { horizon: '1M', days: 30, totalReturnPct: 12, totalReturnUsd: 12000, sharpeRatio: 1.9, sortinoRatio: 2.5, maxDrawdownPct: 6, winRatePct: 60, totalTrades: 12 },
        metrics3M: { horizon: '3M', days: 90, totalReturnPct: 35, totalReturnUsd: 35000, sharpeRatio: 1.8, sortinoRatio: 2.4, maxDrawdownPct: 8, winRatePct: 58, totalTrades: 32 },
        metrics6M: { horizon: '6M', days: 180, totalReturnPct: 65, totalReturnUsd: 65000, sharpeRatio: 1.7, sortinoRatio: 2.2, maxDrawdownPct: 10, winRatePct: 55, totalTrades: 58 },
        consistencyScore: 82,
        regimeResilience: 'ROBUST',
        lastEvaluatedAt: Date.now(),
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        whaleClass: 'TRITON',
        dominantAsset: 'SOL',
        metrics1M: { horizon: '1M', days: 30, totalReturnPct: 20, totalReturnUsd: 20000, sharpeRatio: 2.5, sortinoRatio: 3.2, maxDrawdownPct: 14, winRatePct: 70, totalTrades: 15 },
        metrics3M: { horizon: '3M', days: 90, totalReturnPct: 50, totalReturnUsd: 50000, sharpeRatio: 2.3, sortinoRatio: 2.9, maxDrawdownPct: 15, winRatePct: 65, totalTrades: 40 },
        metrics6M: { horizon: '6M', days: 180, totalReturnPct: 90, totalReturnUsd: 90000, sharpeRatio: 2.1, sortinoRatio: 2.7, maxDrawdownPct: 18, winRatePct: 62, totalTrades: 80 },
        consistencyScore: 85,
        regimeResilience: 'ROBUST',
        lastEvaluatedAt: Date.now(),
      },
    ];

    const corrMatrix: CorrelationMatrixResult = {
      wallets: candidates.map(c => c.address),
      matrix: [
        [1.0, 0.15, 0.20],
        [0.15, 1.0, 0.10],
        [0.20, 0.10, 1.0],
      ],
      pairs: [],
      syndicateClusters: [],
    };

    const basket = generateSmartBasket(candidates, corrMatrix, 100000);
    expect(basket.items.length).toBeGreaterThanOrEqual(2);
    expect(basket.maxPairwiseCorrelation).toBeLessThanOrEqual(0.35);

    const totalWeight = basket.items.reduce((acc, i) => acc + i.weightPct, 0);
    expect(Math.round(totalWeight)).toBe(100);

    const totalAllocated = basket.items.reduce((acc, i) => acc + i.allocatedUsd, 0);
    expect(Math.round(totalAllocated)).toBe(100000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/smart-basket.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `smart-basket.ts`**

Implement candidate filtering ($Score \ge 60$), greedy uncorrelated selection ($C \le 0.30$), inverse-drawdown risk parity allocation, and normalization to 100%.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/smart-basket.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/recommendations/smart-basket.ts tests/smart-basket.test.ts
git commit -m "feat(analytics): implement smart basket optimizer with risk-parity capital allocation"
```

---

### Task 4: Multi-Horizon & Correlation API Endpoints & Caching

**Files:**
- Create: `src/app/api/backtest/multi-horizon/route.ts`
- Create: `src/app/api/backtest/multi-horizon/refresh/route.ts`
- Create: `src/app/api/wallets/correlation/route.ts`
- Create: `src/app/api/paper/basket-subscribe/route.ts`
- Test: `tests/api-multi-horizon-correlation.test.ts`

**Interfaces:**
- Consumes: `getAppServices()` from `src/services/app-service.ts`, `multi-horizon-engine`, `wallet-correlation-engine`, `smart-basket`.
- Produces: REST endpoints returning JSON with sub-100ms cached speed.

- [ ] **Step 1: Write integration tests for APIs**
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement API routes and caching logic**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

```bash
git add src/app/api/backtest/multi-horizon/ src/app/api/wallets/correlation/ src/app/api/paper/basket-subscribe/ tests/api-multi-horizon-correlation.test.ts
git commit -m "feat(api): add multi-horizon, wallet correlation, and smart basket subscription endpoints"
```

---

### Task 5: Localization Updates & UI Test Correction

**Files:**
- Modify: `src/i18n/locales/tr.ts`
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/types.ts`
- Modify: `tests/ui-components.test.tsx` (update test assertions to match localized badge text)

- [ ] **Step 1: Add new translation keys for Sonar tabs, MultiHorizonMatrix, CorrelationHeatmap, and SmartBasket**
- [ ] **Step 2: Update `tests/ui-components.test.tsx` to align with localized text**
- [ ] **Step 3: Run `npx vitest run tests/ui-components.test.tsx tests/i18n.test.ts`**
- [ ] **Step 4: Commit**

```bash
git add src/i18n/ tests/ui-components.test.tsx
git commit -m "feat(i18n): add translations for multi-horizon backtest, correlation heatmap, and smart basket"
```

---

### Task 6: Frontend UI - MultiHorizonMatrix Component

**Files:**
- Create: `src/components/sonar/MultiHorizonMatrix.tsx`
- Test: `tests/multi-horizon-matrix.test.tsx`

**Features:**
- Quick summary metrics (Top Whale, Avg 3M Sharpe, Min Drawdown, Tracked Whales).
- Search input and sorting controls (PnL 1M, PnL 3M, PnL 6M, Sharpe, Consistency Score).
- Rich table with formatted percentages, color-coded PnLs, Consistency Score badges, and action buttons (`Simülatörde İncele` and `Kopyala`).

- [ ] **Step 1: Write component render test**
- [ ] **Step 2: Implement `MultiHorizonMatrix.tsx`**
- [ ] **Step 3: Run test to verify it passes**
- [ ] **Step 4: Commit**

```bash
git add src/components/sonar/MultiHorizonMatrix.tsx tests/multi-horizon-matrix.test.tsx
git commit -m "feat(ui): implement MultiHorizonMatrix component with consistency badges and sorting"
```

---

### Task 7: Frontend UI - CorrelationHeatmap & SmartBasketCard Component

**Files:**
- Create: `src/components/sonar/CorrelationHeatmap.tsx`
- Test: `tests/correlation-heatmap.test.tsx`

**Features:**
- Interactive $N \times N$ heat grid with emerald, cyan, amber, and crimson color coding.
- Detailed popover showing shared assets, exact correlation, and Lead/Lag designation.
- Syndicate & Copycat cluster warning box.
- Smart Basket recommendation card with weights and 1-click `"HELM'de Sepeti Kopyala"` button.

- [ ] **Step 1: Write component test**
- [ ] **Step 2: Implement `CorrelationHeatmap.tsx`**
- [ ] **Step 3: Run test to verify it passes**
- [ ] **Step 4: Commit**

```bash
git add src/components/sonar/CorrelationHeatmap.tsx tests/correlation-heatmap.test.tsx
git commit -m "feat(ui): implement CorrelationHeatmap, syndicate alerts, and SmartBasket card"
```

---

### Task 8: Tabbed Sonar Workspace Integration & Full Verification

**Files:**
- Modify: `src/components/sonar/SonarWorkspace.tsx`
- Test: `tests/sonar-page.test.tsx`

**Features:**
- Add top tab bar with 3 tabs:
  - `LAB` (`SimulationConfig` + `EquityCurveChart` + `TradeLogTable`)
  - `ÇOKLU VADE (1A - 3A - 6A)` (`MultiHorizonMatrix`)
  - `KORELASYON RADARI` (`CorrelationHeatmap`)
- Seamless handoff: Clicking "Simülatörde İncele" in either matrix switches tab to `LAB` and sets `initialWallet`.
- Run entire test suite (`npm test`) to verify 100% pass rate.

- [ ] **Step 1: Update `SonarWorkspace.tsx` with tab switching and cross-tab handoff**
- [ ] **Step 2: Update `tests/sonar-page.test.tsx`**
- [ ] **Step 3: Run `npm test` across all 22+ test files**
- [ ] **Step 4: Commit**

```bash
git add src/components/sonar/SonarWorkspace.tsx tests/sonar-page.test.tsx
git commit -m "feat(sonar): integrate 3-tab workspace uniting simulator, multi-horizon matrix, and correlation radar"
```
