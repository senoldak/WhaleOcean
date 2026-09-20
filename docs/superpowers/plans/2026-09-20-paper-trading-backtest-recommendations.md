# Paper Trading, Backtest Engine & Wallet Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, statistically rigorous Backtest Engine (`SONAR`), Wallet Recommendations Radar (`COMPASS`), and Paper Trading Deck (`HELM`) for Whale Ocean, fully adhering to the Zero-Fake-Data policy and Hyperliquid market realities.

**Architecture:** A three-tier modular system backed by SQLite (`node:sqlite` in WAL mode). The Backtest Engine models realistic market frictions (Hyperliquid taker/maker fees, volume-weighted slippage, 8-hour funding rates, and latency delay). The Alpha Scorer ranks observed wallets using an empirical 0–100 Ocean Alpha Score and assigns Personas (`TRITON`, `ORCA`, `LEVIATHAN`). The Paper Trading Service manages a virtual capital pool ($100k virtual USDC) supporting manual orders, 1-click whale mirroring with stop-loss guards, and mark-to-market tracking.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS, Lucide Icons, SQLite (Node.js 22+ `node:sqlite` `DatabaseSync`), Vitest.

## Global Constraints

- ZERO mock candles or synthetic wallet addresses; all inputs derive from Hyperliquid official APIs or verified database records.
- Taker fee ($0.035\%$), maker fee ($0.01\%$), and 8-hour funding rate carry must be deducted in all backtest simulations.
- Wallets with $<5$ position events are ineligible for Ocean Alpha scoring.
- Maximum drawdown $>45\%$ automatically disqualifies a wallet from recommendation.
- Follow existing dark ocean design tokens (`ocean-abyss`, `ocean-surface`, `ocean-cyan`, `ocean-blue`, `ocean-border`, `ocean-text`, `ocean-muted`).

---

### Task 1: Database Schema Migration & Repository Methods

**Files:**
- Modify: `src/db/schema.sql`
- Modify: `src/types/contracts.ts`
- Modify: `src/db/repository.ts`
- Test: `tests/db-paper-backtest.test.ts`

**Interfaces:**
- Produces:
  - `WalletAlphaScore` type & `repo.saveWalletAlphaScores()`, `repo.getTopWalletAlphaScores()`
  - `PaperPortfolio` type & `repo.getOrCreatePaperPortfolio()`, `repo.updatePaperPortfolio()`
  - `PaperPosition` type & `repo.getPaperPositions()`, `repo.savePaperPosition()`, `repo.deletePaperPosition()`
  - `PaperTrade` type & `repo.savePaperTrade()`, `repo.getPaperTrades()`
  - `PaperSubscription` type & `repo.getPaperSubscriptions()`, `repo.savePaperSubscription()`, `repo.deletePaperSubscription()`

- [ ] **Step 1: Write the failing test for schema and repository methods**

Create `tests/db-paper-backtest.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { WhaleOceanRepository } from '../src/db/repository';

describe('Paper Trading & Backtest Database Repository', () => {
  let db: DatabaseSync;
  let repo: WhaleOceanRepository;
  const testDbPath = path.resolve(process.cwd(), 'tests', 'test_paper.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    db = new DatabaseSync(testDbPath);
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'src', 'db', 'schema.sql'), 'utf8');
    db.exec(schemaSql);
    repo = new WhaleOceanRepository(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('should initialize and retrieve default paper portfolio', () => {
    const portfolio = repo.getOrCreatePaperPortfolio('default');
    expect(portfolio.initialBalance).toBe(100000);
    expect(portfolio.cashBalance).toBe(100000);
    expect(portfolio.marginUsed).toBe(0);
  });

  it('should save and query paper positions and trades', () => {
    repo.getOrCreatePaperPortfolio('default');
    const pos = {
      id: 'pos_1',
      portfolioId: 'default',
      asset: 'BTC',
      side: 'LONG' as const,
      size: 0.5,
      entryPrice: 90000,
      currentPrice: 91000,
      leverage: 5,
      marginUsed: 9000,
      unrealizedPnl: 500,
      liquidationPrice: 72000,
      takeProfit: 95000,
      stopLoss: 88000,
      source: 'MANUAL' as const,
      sourceWallet: null,
      openedAt: Date.now(),
      updatedAt: Date.now(),
    };
    repo.savePaperPosition(pos);
    const positions = repo.getPaperPositions('default');
    expect(positions.length).toBe(1);
    expect(positions[0].asset).toBe('BTC');

    repo.savePaperTrade({
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
      fundingPaid: 0,
      source: 'MANUAL',
      sourceWallet: null,
      closeReason: 'TP',
      openedAt: Date.now() - 3600000,
      closedAt: Date.now(),
    });
    const trades = repo.getPaperTrades('default');
    expect(trades.length).toBe(1);
    expect(trades[0].realizedPnl).toBe(500);
  });

  it('should save and query wallet alpha scores', () => {
    repo.saveWalletAlphaScore({
      address: '0x1234567890123456789012345678901234567890',
      oceanAlphaScore: 88.5,
      persona: 'ORCA',
      riskTier: 'BALANCED',
      sharpeRatio: 2.1,
      sortinoRatio: 2.8,
      maxDrawdown: 12.4,
      profitFactor: 2.3,
      winRate: 64.5,
      totalTrades: 28,
      avgHoldingHours: 14.2,
      totalPnlUsd: 145000,
      liquidationDistanceScore: 85,
      lastEvaluatedAt: Date.now(),
    });

    const top = repo.getTopWalletAlphaScores(10);
    expect(top.length).toBe(1);
    expect(top[0].oceanAlphaScore).toBe(88.5);
    expect(top[0].persona).toBe('ORCA');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/db-paper-backtest.test.ts`  
Expected: FAIL (missing tables or repository methods).

- [ ] **Step 3: Update `src/db/schema.sql`, `src/types/contracts.ts`, and `src/db/repository.ts`**

Add table definitions in `schema.sql` and methods in `repository.ts`. Also ensure types in `contracts.ts` include `WalletAlphaScore`, `PaperPortfolio`, `PaperPosition`, `PaperTrade`, `PaperSubscription`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db-paper-backtest.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/db/schema.sql src/types/contracts.ts src/db/repository.ts tests/db-paper-backtest.test.ts
git commit -m "feat(db): add tables and repository methods for paper trading and alpha scores"
```

---

### Task 2: Quantitative Backtest Simulation Engine (`SONAR`)

**Files:**
- Create: `src/analytics/backtest/backtest-engine.ts`
- Modify: `src/types/contracts.ts`
- Test: `tests/backtest-engine.test.ts`

**Interfaces:**
- Consumes: Historical candles from `HyperliquidInfoClient.getCandles()` or `VerifiedMarketSnapshot[]`, `PositionEvent[]`
- Produces:
  - `runBacktest(params: BacktestParams): BacktestResult`
  - Benchmark metrics: `sharpeRatio`, `sortinoRatio`, `maxDrawdown`, `profitFactor`, `winRate`, `expectancy`, `equityCurve`, `tradeLedger`

- [ ] **Step 1: Write the failing test for backtest engine**

Create `tests/backtest-engine.test.ts` with tests for:
1. Friction deductions: Taker fee ($0.035\%$) on entry and exit.
2. Dynamic slippage adjustment.
3. Funding payment accrual/deduction on 8-hour intervals.
4. Correct Sharpe, Sortino, and Max Drawdown calculation with known synthetic series.
5. Whale replication mode simulating recorded events with latency delay.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/backtest-engine.test.ts`  
Expected: FAIL with `Cannot find module '../src/analytics/backtest/backtest-engine'`.

- [ ] **Step 3: Implement `src/analytics/backtest/backtest-engine.ts`**

Implement realistic backtesting engine with:
- Annualized Sharpe calculation ($S = \frac{\mu - R_f}{\sigma} \times \sqrt{365}$).
- Sortino calculation focusing on downside deviation.
- Max Drawdown calculation based on high-water equity peak.
- Bar-by-bar evaluation with High/Low checking for liquidation and TP/SL.
- Funding rate carry application.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/backtest-engine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/analytics/backtest/backtest-engine.ts src/types/contracts.ts tests/backtest-engine.test.ts
git commit -m "feat(analytics): implement quantitative backtest engine with realistic market friction"
```

---

### Task 3: Wallet Recommendation & Ocean Alpha Scoring Engine (`COMPASS`)

**Files:**
- Create: `src/analytics/recommendations/alpha-scorer.ts`
- Modify: `src/services/app-service.ts`
- Test: `tests/alpha-scorer.test.ts`

**Interfaces:**
- Consumes: `repo.getObservedWallets()`, `repo.getPositionEvents()`
- Produces:
  - `evaluateAndScoreWallets(wallets: VerifiedWalletObservation[], repo: WhaleOceanRepository): Promise<WalletAlphaScore[]>`
  - Persona categorization (`TRITON`, `ORCA`, `LEVIATHAN`)
  - Anti-toxic filtering (martingale rejection, drawdown $>45\%$ disqualification)
  - `getCompassRecommendations(filter?: CompassFilter): Promise<WalletAlphaScore[]>`

- [ ] **Step 1: Write the failing test for alpha scorer**

Create `tests/alpha-scorer.test.ts`:
- Test that wallets with $<5$ events are skipped or flagged.
- Test that high-drawdown / martingale wallets are penalized or excluded.
- Test correct persona assignment: low leverage + carry = `TRITON`, high momentum = `ORCA`, volatility scalper = `LEVIATHAN`.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/alpha-scorer.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/analytics/recommendations/alpha-scorer.ts` and wire to `src/services/app-service.ts`**

Implement scoring algorithms, persona clustering, and service methods.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/alpha-scorer.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/analytics/recommendations/alpha-scorer.ts src/services/app-service.ts tests/alpha-scorer.test.ts
git commit -m "feat(analytics): implement Ocean Alpha scoring and wallet recommendation engine"
```

---

### Task 4: Paper Trading Operations Service (`HELM`)

**Files:**
- Create: `src/analytics/paper-trading/paper-service.ts`
- Modify: `src/services/app-service.ts`
- Test: `tests/paper-service.test.ts`

**Interfaces:**
- Consumes: `WhaleOceanRepository`, live market prices from snapshots/collector
- Produces:
  - `placePaperOrder(order: PaperOrderInput): Promise<PaperPosition>`
  - `closePaperPosition(positionId: string, reason: string): Promise<PaperTrade>`
  - `getPortfolioState(portfolioId?: string): Promise<PaperPortfolioState>`
  - `subscribeToWhaleCopy(sub: WhaleCopySubscriptionInput): Promise<PaperSubscription>`
  - `unsubscribeFromWhaleCopy(subscriptionId: string): Promise<void>`
  - `resetPaperPortfolio(portfolioId?: string): Promise<void>`

- [ ] **Step 1: Write the failing test for paper service**

Create `tests/paper-service.test.ts`:
- Test opening a manual position: validates margin, deducts fee, sets entry price with slippage.
- Test closing a position: calculates realized PnL, frees margin, records paper trade.
- Test copy subscription: mirrors simulated whale position changes and respects drawdown limits.
- Test portfolio reset: clears positions/trades and restores \$100,000 cash balance.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/paper-service.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/analytics/paper-trading/paper-service.ts` and wire into `app-service.ts`**

Implement order execution, position lifecycle, margin math, and whale copy logic.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/paper-service.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/analytics/paper-trading/paper-service.ts src/services/app-service.ts tests/paper-service.test.ts
git commit -m "feat(paper): implement paper trading operations and portfolio service"
```

---

### Task 5: Next.js API Routes for Backtest, Recommendations & Paper Trading

**Files:**
- Create: `src/app/api/backtest/route.ts`
- Create: `src/app/api/recommendations/route.ts`
- Create: `src/app/api/paper/portfolio/route.ts`
- Create: `src/app/api/paper/order/route.ts`
- Create: `src/app/api/paper/copy/route.ts`
- Test: `tests/api-paper-backtest.test.ts`

**Interfaces:**
- `POST /api/backtest`: Accepts `BacktestParams`, returns `BacktestResult`.
- `GET /api/recommendations`: Accepts query filters (`persona`, `riskTier`, `minScore`), returns `WalletAlphaScore[]`.
- `GET /api/paper/portfolio`: Returns `PaperPortfolioState` (balance, equity, positions, trades, subscriptions).
- `POST /api/paper/order`: Places or closes a paper position.
- `POST /api/paper/copy`: Manages whale mirroring subscriptions.

- [ ] **Step 1: Write integration tests for API routes**

Create `tests/api-paper-backtest.test.ts` testing the request/response contracts and error handling for all five routes.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/api-paper-backtest.test.ts`  
Expected: FAIL (routes missing).

- [ ] **Step 3: Implement the 5 API route handlers**

Implement JSON validation, service delegation, and standard error responses.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api-paper-backtest.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/api/backtest/ src/app/api/recommendations/ src/app/api/paper/ tests/api-paper-backtest.test.ts
git commit -m "feat(api): add REST endpoints for backtest, recommendations, and paper trading"
```

---

### Task 6: Global Navbar Updates & Shared Visual Components

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Create: `src/components/common/PersonaBadge.tsx`
- Create: `src/components/common/AlphaScoreBadge.tsx`
- Test: `tests/navbar-navigation.test.tsx`

**Interfaces:**
- `Navbar` includes `COMPASS` (`/compass`), `SONAR` (`/sonar`), and `HELM` (`/helm`).
- `PersonaBadge`: Renders color-coded persona badges with nautical styling (`TRITON` = teal, `ORCA` = blue/cyan, `LEVIATHAN` = purple/indigo).
- `AlphaScoreBadge`: Renders glowing 0–100 score meter with quality gradients.

- [ ] **Step 1: Write tests for Navbar items and badges**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Update `Navbar.tsx` and implement badge components**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

```bash
git add src/components/layout/Navbar.tsx src/components/common/ tests/navbar-navigation.test.tsx
git commit -m "feat(ui): add COMPASS, SONAR, and HELM navigation and score badges"
```

---

### Task 7: `COMPASS` Page (`/compass`) — Whale Alpha Radar

**Files:**
- Create: `src/app/compass/page.tsx`
- Create: `src/components/compass/CompassRadar.tsx`
- Create: `src/components/compass/WhaleCard.tsx`
- Create: `src/components/compass/CopyModal.tsx`
- Test: `tests/compass-page.test.tsx`

**Components:**
- `CompassRadar`: Filter bar (Persona tabs, Risk Tier select, Score slider, Drawdown slider), statistics summary ribbon, and grid of cards.
- `WhaleCard`: Displays wallet address, Alpha Score, Persona, Sharpe, Drawdown, Win Rate, Profit Factor, mini-sparkline, and action buttons (`Paper Copy`, `Test in Sonar`).
- `CopyModal`: Interactive modal to allocate virtual capital to mirror the whale.

- [ ] **Step 1: Write tests for Compass components and page rendering**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `CompassRadar`, `WhaleCard`, `CopyModal`, and `src/app/compass/page.tsx`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

```bash
git add src/app/compass/ src/components/compass/ tests/compass-page.test.tsx
git commit -m "feat(compass): build whale alpha radar and recommendations page"
```

---

### Task 8: `SONAR` Page (`/sonar`) — Quantitative Backtest Lab

**Files:**
- Create: `src/app/sonar/page.tsx`
- Create: `src/components/sonar/SonarWorkspace.tsx`
- Create: `src/components/sonar/SimulationConfig.tsx`
- Create: `src/components/sonar/EquityCurveChart.tsx`
- Create: `src/components/sonar/TradeLogTable.tsx`
- Test: `tests/sonar-page.test.tsx`

**Components:**
- `SonarWorkspace`: State coordinator for simulation inputs, running simulations, and rendering results.
- `SimulationConfig`: Form for mode toggle, wallet/asset input, date resolution, slippage, fee tiers, and funding toggles.
- `EquityCurveChart`: High-resolution SVG / Canvas equity curve comparing strategy equity vs benchmark.
- `TradeLogTable`: Paginated trade-by-trade ledger with entry/exit timestamps, fees, and PnL.

- [ ] **Step 1: Write tests for Sonar components and page rendering**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement Sonar components and page**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

```bash
git add src/app/sonar/ src/components/sonar/ tests/sonar-page.test.tsx
git commit -m "feat(sonar): build quantitative backtest laboratory page"
```

---

### Task 9: `HELM` Page (`/helm`) — Paper Trading Operations Desk

**Files:**
- Create: `src/app/helm/page.tsx`
- Create: `src/components/helm/HelmDeck.tsx`
- Create: `src/components/helm/PortfolioSummary.tsx`
- Create: `src/components/helm/ManualOrderTicket.tsx`
- Create: `src/components/helm/LivePositionsTable.tsx`
- Create: `src/components/helm/CopiedWhalesBar.tsx`
- Create: `src/components/helm/TradeHistoryTable.tsx`
- Test: `tests/helm-page.test.tsx`

**Components:**
- `PortfolioSummary`: Equity, Cash, Margin Used, Realized PnL, and Reset button.
- `CopiedWhalesBar`: Live status of mirrored wallets with allocated funds and unfollow buttons.
- `ManualOrderTicket`: Interactive order submission with real-time mark prices, leverage slider, and TP/SL.
- `LivePositionsTable`: Active positions with mark-to-market PnL and close buttons.
- `TradeHistoryTable`: Closed virtual trades with fee and funding breakdown.

- [ ] **Step 1: Write tests for Helm components and page rendering**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement Helm components and page**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

```bash
git add src/app/helm/ src/components/helm/ tests/helm-page.test.tsx
git commit -m "feat(helm): build paper trading operations desk page"
```

---

### Task 10: Full Integration Verification & Build Quality Gate

**Files:**
- Entire codebase

**Steps:**
- [ ] **Step 1: Run complete test suite**
  `npm run test` (verify all unit and integration tests pass).
- [ ] **Step 2: Run TypeScript and Next.js build validation**
  `npm run build` (confirm zero type errors, lint issues, or compilation failures).
- [ ] **Step 3: Verify end-to-end data flow**
  Launch dev server, seed initial alpha scores from `whale_ocean.db`, verify navigation across `/compass`, `/sonar`, and `/helm`.
- [ ] **Step 4: Final commit and documentation update**
  Update `README.md` and commit the integrated feature suite.
