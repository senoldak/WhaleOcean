# Whale Ocean: Paper Trading, Backtest Engine & Wallet Recommendations Specification

**Document Date:** 2026-09-20  
**Status:** Approved by User  
**Target Systems:** Backtest Engine (`SONAR`), Wallet Recommendations (`COMPASS`), Paper Trading Desk (`HELM`)  
**Guiding Philosophy:** *"Don't watch the price. Watch the ocean."* & Zero-Tolerance Anti-Fake Data Policy.

---

## 1. Executive Summary

Whale Ocean is an autonomous real-time market intelligence terminal for the Hyperliquid perpetuals and spot ecosystem. This specification defines the architecture, quantitative models, database schemas, and frontend interfaces for three deeply interconnected modules:

1. **`SONAR` (`/sonar`):** A quantitative, realistic backtesting laboratory that simulates both Whale Mirroring (copying historical observed whale movements) and Ocean Signal Strategies (entering/exiting based on Ocean Conditions, funding carry stress, and open interest velocity) under strict real-world market friction (taker/maker fees, 8-hour funding rates, liquidity-based slippage, and execution latency).
2. **`COMPASS` (`/compass`):** A dedicated wallet intelligence and recommendation radar that ranks the 2,000+ observed Hyperliquid wallets using an empirical **Ocean Alpha Score (0–100)**. It filters out reckless gamblers and toxic martingale behavior, categorizes disciplined traders into Ocean Personas (`TRITON`, `ORCA`, `LEVIATHAN`), and provides direct 1-click paper-copy actions.
3. **`HELM` (`/helm`):** A unified paper trading operations deck where users manage virtual capital ($100,000 default virtual USDC), execute manual orders against real-time Hyperliquid mark prices, automate Ocean-triggered positions, and mirror recommended whales with automated stop-loss guards.

---

## 2. Core Principles & Quantitative Standards

Adhering to the `trading-backtest-validator` standards and Whale Ocean's Anti-Fake Data Policy:

### 2.1 Elimination of Biases
- **Look-Ahead Bias Elimination:** Every indicator and signal computed at time $t$ uses strictly data available at or before $t$. Signals triggered by candle closes never execute retroactively on candle opens.
- **Survivorship & Gambler Bias Elimination:** Wallets that achieved high raw PnL by averaging down into near-liquidation (Martingale behavior) or that experienced Max Drawdown $>45\%$ are automatically disqualified from recommendations.
- **Minimum Statistical Sample:** Cüzdan scoring requires $\ge 5$ verified position events recorded in `whale_ocean.db`. Strategies require $\ge 30$ historical trades to declare statistical validity.

### 2.2 Market Friction Modeling
- **Exchange Fees:** Hyperliquid perpetual taker fees ($0.035\%$) and maker fees ($0.010\%$) are deducted on every entry and exit.
- **Dynamic Slippage:** Base slippage of $0.05\%$ ($5\text{ bps}$) for high-liquidity assets (BTC, ETH, SOL) and $0.15\%$ ($15\text{ bps}$) for mid/low-cap pairs, adjusted upward for large simulated order sizes relative to 24h volume.
- **8-Hour Funding Carry:** Open positions accrue or pay funding based on Hyperliquid's actual historical 8-hour funding rate for that timestamp.
- **Execution Latency:** A simulated $200\text{ms} - 500\text{ms}$ delay is applied between whale signal detection and fill price calculation.

---

## 3. Database Schema Extensions (`whale_ocean.db`)

The existing SQLite database (managed via Node.js built-in `node:sqlite` `DatabaseSync` in WAL mode) is extended with four dedicated tables:

### 3.1 `wallet_alpha_scores`
Stores calculated performance metrics and classifications for observed wallets:
```sql
CREATE TABLE IF NOT EXISTS wallet_alpha_scores (
  address TEXT PRIMARY KEY,
  ocean_alpha_score REAL NOT NULL,
  persona TEXT NOT NULL, -- 'TRITON' | 'ORCA' | 'LEVIATHAN'
  risk_tier TEXT NOT NULL, -- 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  sharpe_ratio REAL NOT NULL,
  sortino_ratio REAL NOT NULL,
  max_drawdown REAL NOT NULL,
  profit_factor REAL NOT NULL,
  win_rate REAL NOT NULL,
  total_trades INTEGER NOT NULL,
  avg_holding_hours REAL NOT NULL,
  total_pnl_usd REAL NOT NULL,
  liquidation_distance_score REAL NOT NULL,
  last_evaluated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_alpha_score ON wallet_alpha_scores(ocean_alpha_score DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_alpha_persona ON wallet_alpha_scores(persona);
CREATE INDEX IF NOT EXISTS idx_wallet_alpha_tier ON wallet_alpha_scores(risk_tier);
```

### 3.2 `paper_portfolios`
Maintains the virtual account balance and state:
```sql
CREATE TABLE IF NOT EXISTS paper_portfolios (
  id TEXT PRIMARY KEY DEFAULT 'default',
  initial_balance REAL NOT NULL DEFAULT 100000.0,
  cash_balance REAL NOT NULL DEFAULT 100000.0,
  margin_used REAL NOT NULL DEFAULT 0.0,
  realized_pnl REAL NOT NULL DEFAULT 0.0,
  updated_at INTEGER NOT NULL
);
```

### 3.3 `paper_positions`
Tracks live virtual open positions:
```sql
CREATE TABLE IF NOT EXISTS paper_positions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL DEFAULT 'default',
  asset TEXT NOT NULL,
  side TEXT NOT NULL, -- 'LONG' | 'SHORT'
  size REAL NOT NULL,
  entry_price REAL NOT NULL,
  current_price REAL NOT NULL,
  leverage REAL NOT NULL DEFAULT 1.0,
  margin_used REAL NOT NULL,
  unrealized_pnl REAL NOT NULL DEFAULT 0.0,
  liquidation_price REAL,
  take_profit REAL,
  stop_loss REAL,
  source TEXT NOT NULL, -- 'MANUAL' | 'COPY_WHALE' | 'STRATEGY_BOT'
  source_wallet TEXT,
  opened_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (portfolio_id) REFERENCES paper_portfolios(id)
);

CREATE INDEX IF NOT EXISTS idx_paper_pos_portfolio ON paper_positions(portfolio_id);
```

### 3.4 `paper_trades` & `paper_subscriptions`
Stores closed trade history and active copy subscriptions:
```sql
CREATE TABLE IF NOT EXISTS paper_trades (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL DEFAULT 'default',
  asset TEXT NOT NULL,
  side TEXT NOT NULL,
  size REAL NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL NOT NULL,
  leverage REAL NOT NULL,
  realized_pnl REAL NOT NULL,
  fee_paid REAL NOT NULL,
  funding_paid REAL NOT NULL,
  source TEXT NOT NULL,
  source_wallet TEXT,
  close_reason TEXT NOT NULL, -- 'MANUAL' | 'TP' | 'SL' | 'WHALE_CLOSED' | 'LIQUIDATED'
  opened_at INTEGER NOT NULL,
  closed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_subscriptions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL DEFAULT 'default',
  wallet_address TEXT NOT NULL,
  allocated_usd REAL NOT NULL,
  multiplier REAL NOT NULL DEFAULT 1.0,
  max_drawdown_limit REAL DEFAULT 0.15, -- 15% stop-loss guard
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## 4. Analytical Engines & Algorithms

### 4.1 Backtest Simulation Engine (`src/analytics/backtest/backtest-engine.ts`)
The backtest engine accepts:
- **Mode:** `WHALE_REPLICATION` | `OCEAN_RULE_STRATEGY`
- **Universe / Target:** Wallet address or Asset symbol
- **Date Range / Candles:** Start timestamp, End timestamp, Resolution (15m, 1h, 4h, 1d)
- **Friction Parameters:** Taker fee ($0.035\%$), Maker fee ($0.010\%$), Slippage basis points, Funding deduction active.

**Simulation Steps:**
1. Loads chronological candles from Hyperliquid (`HyperliquidInfoClient.getCandles`) and/or wallet events from `position_events`.
2. Steps sequentially through time bars:
   - Evaluates entry signals. For whale mirroring, matches observed `OPEN` / `INCREASE` events to the nearest post-event candle open with simulated latency.
   - Calculates position size based on allocated capital and leverage.
   - Computes dynamic slippage: $\text{FillPrice} = P \times (1 \pm \text{Slippage})$.
   - Checks every subsequent bar's High/Low for Take Profit, Stop Loss, or Liquidation:
     $$\text{Liquidation Price} = \text{Entry} \times \left(1 - \frac{\text{SideSign}}{\text{Leverage}}\right)$$
   - Deducts funding every 8 hours: $\text{FundingPayment} = \text{Notional} \times R_{\text{funding}}$.
   - Closes position when exit condition, whale closure, or stop occurs.
3. Generates statistical benchmarks:
   - **Annualized Sharpe Ratio:** $S = \frac{\mu_{\text{daily}} - R_f}{\sigma_{\text{daily}}} \times \sqrt{365}$
   - **Annualized Sortino Ratio:** Evaluates downside deviation only: $\sigma_{\text{downside}} = \sqrt{\frac{1}{N}\sum \min(0, r_t)^2}$
   - **Max Drawdown (MDD):** $\max_{t} \left( \frac{\text{Peak}_t - \text{Equity}_t}{\text{Peak}_t} \right)$
   - **Profit Factor:** $\frac{\sum \text{Gains}}{\sum |\text{Losses}|}$
   - **Win Rate:** $\frac{\text{Winning Trades}}{\text{Total Trades}} \times 100\%$
   - **Expectancy per trade ($):** $(\text{Win Rate} \times \text{Avg Win}) - (\text{Loss Rate} \times \text{Avg Loss})$

### 4.2 Wallet Recommendation Engine (`src/analytics/recommendations/alpha-scorer.ts`)
Evaluates all tracked wallets and computes the composite **Ocean Alpha Score (0–100)**:

$$\text{OceanAlphaScore} = 0.30 \cdot S_{\text{RiskAdjusted}} + 0.25 \cdot S_{\text{CapitalPreservation}} + 0.25 \cdot S_{\text{Consistency}} + 0.20 \cdot S_{\text{OceanAlignment}}$$

Where:
- $S_{\text{RiskAdjusted}} = \min(100, \max(0, (\text{Sharpe} - 0.5) \times 40))$
- $S_{\text{CapitalPreservation}} = \max(0, 100 - (\text{MaxDrawdown} \times 250))$
- $S_{\text{Consistency}} = (\text{WinRate} \times 0.5) + (\min(3, \text{ProfitFactor}) \times 16.6)$
- $S_{\text{OceanAlignment}} =$ Correlation of trade direction with prevailing Ocean Condition & Funding bias.

**Persona Segmentation:**
- **`TRITON` (Carry & Diver):** Leverage $\le 3\text{x}$, Max DD $<10\%$, positive funding revenue, holds $>24\text{h}$.
- **`ORCA` (Hunter & Trend):** Profit Factor $\ge 1.8$, Win Rate $\ge 50\%$, captures large directional swings.
- **`LEVIATHAN` (Storm Warrior):** Active during STORM conditions (Ocean Condition $\ge 70$), high trade velocity, Sharpe $\ge 2.0$.

### 4.3 Paper Trading Engine (`src/analytics/paper-trading/paper-service.ts`)
1. **Order Execution:**
   - Validates available margin: $\text{RequiredMargin} = \frac{\text{Size} \times \text{MarkPrice}}{\text{Leverage}}$.
   - Executes with real-time mark price + dynamic slippage.
   - Updates `paper_portfolios` and records `paper_positions`.
2. **Real-Time Mark-to-Market:**
   - On each market snapshot update, recalculates unrealized PnL and total portfolio equity.
   - Evaluates active TP/SL orders and triggers automatic execution.
3. **Whale Copy Mirroring Loop:**
   - Subscribed to `collector-service` position events.
   - When a followed wallet performs a position change, proportionally sizes a paper order and executes it.
   - Enforces a wallet-level Max Drawdown circuit breaker ($15\%$ default limit).

---

## 5. User Interface & Page Specifications

### 5.1 Global Navigation (`Navbar.tsx`)
Adds three concept-aligned navigation tabs:
- `COMPASS` (`/compass`) with an active beacon badge.
- `SONAR` (`/sonar`) with a wave radar icon.
- `HELM` (`/helm`) with a ship's steering wheel icon.

### 5.2 Page 1: `COMPASS` (`/compass`) — Whale Alpha Radar
- **Header & Metric Strip:** Total Wallets Scanned, Recommended Wallets Qualified, Average Portfolio Sharpe.
- **Filter Controls:**
  - Persona Tabs: `All`, `Triton (Carry)`, `Orca (Trend)`, `Leviathan (Storm)`.
  - Risk Tier Select: `All`, `Conservative`, `Balanced`, `Aggressive`.
  - Minimum Alpha Score Slider ($0 - 100$, default $\ge 70$).
  - Max Drawdown Limit Slider ($5\% - 35\%$).
- **Recommendation Grid:**
  - Card components showing wallet address, Ocean Alpha Score badge, persona badge, key stats (Sharpe, Drawdown, Win Rate, Profit Factor), mini equity sparkline, and traded asset badges.
  - CTAs: **[⚡ Paper Copy]** (triggers copy modal) and **[🔍 Backtest in Sonar]** (deep links to `/sonar?wallet=...`).
- **Paper Copy Modal:**
  - Input: Allocated USD budget (e.g. $\$10,000$).
  - Input: Max leverage ceiling (e.g. $5\text{x}$).
  - Toggle: Max Drawdown Circuit Breaker ($10\%, 15\%, 20\%$).
  - Confirmation button: Directly connects to `HELM`.

### 5.3 Page 2: `SONAR` (`/sonar`) — Backtest Laboratory
- **Control Deck (Left):**
  - Simulation Mode switch: Whale Replication vs Ocean Signal Strategy.
  - Target selection (Wallet address or Asset).
  - Time Horizon & Candle interval ($15\text{m}$, $1\text{h}$, $4\text{h}$).
  - Friction parameters: Slippage bps, Taker fee, Funding carry toggle, Starting balance.
  - Action: **[Launch Sonar Simulation]**.
- **Results Console (Right):**
  - Performance Summary: Net Profit, Sharpe Ratio, Sortino Ratio, Max Drawdown %, Profit Factor, Win Rate %, Total Fees & Funding Paid.
  - Interactive Equity Curve: Visualizes simulated portfolio value over time vs BTC benchmark.
  - Trade Ledger: Tabulated log of every simulated entry/exit, price, fee, and PnL.

### 5.4 Page 3: `HELM` (`/helm`) — Paper Trading Desk
- **Portfolio Summary Ribbon:** Total Equity, Cash Balance, Margin Used, Realized PnL, Unrealized PnL, 24h Return %.
- **Active Subscriptions Bar:** Lists copied whales, allocated capital, live copied PnL, and Unfollow button.
- **Trading Deck:**
  - **Manual Order Ticket:** Asset picker, Side (Long/Short), Leverage slider ($1\text{x} - 50\text{x}$), Order size, TP/SL, [Submit Virtual Order].
  - **Live Positions Table:** Active positions with real-time PnL, margin, liquidation price, source badge, and [Close Position] button.
- **Trade History & Reset:** Comprehensive ledger of past virtual trades and a [Reset Portfolio] action with confirmation modal.

---

## 6. Error Handling & Edge Cases

1. **Hyperliquid API Rate Limits or Latency:**  
   - Handled with exponential backoff in `HyperliquidInfoClient` (3 retries).
   - If candle data is temporarily unreachable, fallback to observed local `market_snapshots` in `whale_ocean.db`.
2. **Insufficient Historical Data:**  
   - Wallets with $<5$ position events show an explicit badge: `Insufficient History for Alpha Scoring`.
3. **Liquidation Event during Paper Trading:**  
   - If mark price crosses liquidation price, position is closed immediately with a `LIQUIDATED` reason in `paper_trades`, and remaining margin is zeroed.
4. **Copy-Trade Circuit Breaker:**  
   - If a copied whale incurs a loss exceeding the user's configured drawdown limit (e.g. $15\%$), the subscription is paused and the user is alerted.

---

## 7. Verification Plan

1. **Database Schema Verification:** Verify table creation and index validity in `whale_ocean.db`.
2. **Backtest Engine Unit Tests:**
   - Verify fee deduction ($0.035\%$).
   - Verify funding carry application on 8-hour boundaries.
   - Verify slippage adjustments.
   - Verify Sharpe, Sortino, Drawdown, and Profit Factor calculations with known synthetic test arrays.
3. **Alpha Scoring Unit Tests:**
   - Verify that reckless high-drawdown wallets receive low scores.
   - Verify persona classification criteria (`TRITON`, `ORCA`, `LEVIATHAN`).
4. **Paper Trading Integration Tests:**
   - Test placing manual virtual orders, verifying margin deduction and cash balance.
   - Test closing positions, calculating realized PnL and returning margin.
   - Test copy-trade subscription allocation and mirroring.
5. **Build & Typecheck:** Run `npm run build` or `npx tsc --noEmit` and `npm run test` (Vitest) to ensure clean TypeScript compilation and zero test regressions.
