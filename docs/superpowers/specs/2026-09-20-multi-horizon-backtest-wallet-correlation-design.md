# Whale Ocean: Multi-Horizon Backtesting, Wallet Correlation Heatmap & Smart Basket Specification

**Document Date:** 2026-09-20  
**Status:** Approved by User  
**Target Systems:** Backtest Lab (`SONAR`), Wallet Clustering & Correlation (`SONAR Radar`), Paper Trading Desk (`HELM`)  
**Guiding Philosophy:** *"Don't watch the price. Watch the ocean."* & Zero-Fake-Data Anti-Survivorship Quantitative Alpha.

---

## 1. Executive Summary

While the existing `SONAR` simulator allows single-wallet or single-rule simulations on demand, it lacks systematic multi-period validation and portfolio-level intelligence. Traders need two critical capabilities to convert whale data into durable, low-risk profits:

1. **Multi-Horizon Durability (1M / 3M / 6M Backtesting):** Distinguish between "lucky one-hit wonders" (a trader up +500% in 1 month due to high leverage on a single meme pump, but negative Sharpe and high drawdowns over 3 and 6 months) and "true alpha generators" (consistent positive returns, Sharpe > 1.5, and tight drawdowns across multiple market regimes).
2. **Inter-Wallet Correlation & Syndicate Detection (Heatmap & Radar):** Avoid false diversification. Copying 4 whales who are all 80% Long ETH on high leverage does not diversify risk—it quadruples exposure to an ETH liquidation cascade. An interactive $N \times N$ correlation heatmap identifies high-risk clusters, flags identical copycat bots/syndicates, reveals lead-lag timing (who trades first), and builds an optimal, uncorrelated multi-whale basket for automated paper trading.

To provide a unified, institutional-grade analytics terminal, these capabilities are integrated into **`SONAR` (`/sonar`)** across three tabs:
- **Tab 1: `🔬 SİMÜLATÖR (LAB)`:** Single-wallet/rule simulation, equity curves, tick-level frictions, and trade logs.
- **Tab 2: `📊 ÇOKLU VADE LİDERLERİ (1A - 3A - 6A)`:** Multi-horizon leaderboard matrix with Consistency Scores, return metrics, Sharpe, and Drawdowns.
- **Tab 3: `🌐 KORELASYON RADARI (HEATMAP)`:** $N \times N$ interactive correlation grid, syndicate cluster warnings, lead-lag indicators, and the 1-click **Smart Basket** deployer to `HELM`.

---

## 2. Mathematical Models & Formulations

### 2.1 Multi-Horizon Performance & Consistency Score

For each observed wallet $W_i$, historical trades and simulated performance are evaluated across three distinct rolling windows:
- $T_{1M} = 30 \text{ days}$
- $T_{3M} = 90 \text{ days}$
- $T_{6M} = 180 \text{ days}$

For each horizon $h \in \{1M, 3M, 6M\}$, we calculate:
- $\text{PnL } (\%)$, $\text{Total Net Return } (\$)$
- $\text{Sharpe Ratio } S_h$ (annualized, 4% risk-free rate)
- $\text{Sortino Ratio } So_h$
- $\text{Max Drawdown } MDD_h (\%)$
- $\text{Win Rate } WR_h (\%)$
- $\text{Total Trades } N_h$

#### Consistency Score Formula ($0 - 100$)
A composite robustness index designed to reward continuous profitability and penalize erratic blowup risk:

$$\text{Score}_{consistency} = \text{clamp}\Big( 100 \times \big[ 0.35 \cdot \bar{S}_{norm} + 0.25 \cdot (1 - \frac{\overline{MDD}}{50}) + 0.20 \cdot \frac{\overline{WR}}{100} + 0.20 \cdot \text{RegimeBonus} \big], 0, 100 \Big)$$

Where:
- $\bar{S}_{norm} = \min(1, \max(0, \frac{\text{mean}(S_{1M}, S_{3M}, S_{6M})}{2.5}))$
- $\overline{MDD} = \text{mean}(MDD_{1M}, MDD_{3M}, MDD_{6M})$
- $\overline{WR} = \text{mean}(WR_{1M}, WR_{3M}, WR_{6M})$
- $\text{RegimeBonus} = \frac{\mathbf{1}_{\{\text{PnL}_{1M} > 0\}} + \mathbf{1}_{\{\text{PnL}_{3M} > 0\}} + \mathbf{1}_{\{\text{PnL}_{6M} > 0\}}}{3}$ (rewards positive returns across all 3 windows).

---

### 2.2 Hybrid Inter-Wallet Correlation Model ($N \times N$)

To determine true similarity between two wallets $A$ and $B$, WhaleOcean utilizes a hybrid model combining **Position Exposure Vectors** and **Daily Return Time Series**:

#### 1. Position Exposure Cosine Similarity ($S_{pos}$)
Construct an asset-exposure vector $\mathbf{v}_A \in \mathbb{R}^K$ for all traded assets (BTC, ETH, SOL, etc.), where:
$$v_{A, k} = \text{Notional}_{A, k} \times \text{sign}(\text{direction}_{A, k})$$
$$\text{Long } = +1, \quad \text{Short } = -1$$

$$S_{pos}(A, B) = \frac{\mathbf{v}_A \cdot \mathbf{v}_B}{\|\mathbf{v}_A\|_2 \|\mathbf{v}_B\|_2} \in [-1.0, 1.0]$$

#### 2. Daily Return Pearson Correlation ($r_{pnl}$)
Given daily return series $R_{A, t}$ and $R_{B, t}$ over the last 30-90 days:
$$r_{pnl}(A, B) = \frac{\sum_{t=1}^T (R_{A, t} - \bar{R}_A)(R_{B, t} - \bar{R}_B)}{\sqrt{\sum (R_{A, t} - \bar{R}_A)^2} \sqrt{\sum (R_{B, t} - \bar{R}_B)^2}} \in [-1.0, 1.0]$$

#### 3. Composite Correlation Coefficient ($C_{A, B}$)
$$C(A, B) = 0.50 \cdot S_{pos}(A, B) + 0.50 \cdot r_{pnl}(A, B)$$

#### Categorization Tiers:
- $C(A, B) \ge 0.75$: **SYNDICATE / HIGH DANGER CLUSTER** (Duplicate strategies/bots; copying both provides 0 diversification and doubles liquidation risk).
- $0.35 \le C(A, B) < 0.75$: **MODERATE OVERLAP** (Partial common holdings).
- $-0.20 \le C(A, B) < 0.35$: **LOW CORRELATION (IDEAL DIVERSIFICATION BASKET)**.
- $C(A, B) < -0.20$: **NEGATIVE CORRELATION (NATURAL HEDGE)**.

---

### 2.3 Lead-Lag & Front-Running Latency Analysis

When two wallets have high correlation ($C(A, B) \ge 0.65$), the engine analyzes position event timestamps to detect who leads:
For all overlapping trades $k \in K_{shared}$:
$$\Delta t_k = t_{\text{entry}, B, k} - t_{\text{entry}, A, k}$$

- If median $\Delta t > 0$ with statistical significance ($p < 0.05$), $W_A$ is labeled **LEAD (Öncü)** and $W_B$ is labeled **FOLLOWER (Takipçi)**.
- Follower wallets show a badge: `"Takipçi (Gecikme: ~X dk) - Lideri kopyalayın"`.

---

### 2.4 Smart Basket Optimization Algorithm

The goal is to automatically construct an uncorrelated portfolio of 3 to 5 whales with maximum composite alpha:
1. **Candidate Screening:** Filter all wallets with $\text{ConsistencyScore} \ge 60$ and $\text{MaxDD}_{3M} \le 30\%$.
2. **Pairwise Independence:** Select subset $\{W_1, \dots, W_m\}$ such that $\forall i \neq j, \; C(W_i, W_j) \le 0.30$.
3. **Risk-Parity Weighting:** Allocate virtual capital weights inversely proportional to drawdown:
   $$w_i = \frac{\frac{1}{\text{MaxDD}_i}}{\sum_{j=1}^m \frac{1}{\text{MaxDD}_j}}$$
   Subject to: $0.15 \le w_i \le 0.40$.

---

## 3. Architecture & Engine Components

### 3.1 New & Enhanced Backend Modules

```
src/
├── analytics/
│   ├── backtest/
│   │   ├── backtest-engine.ts           (Existing single-run engine)
│   │   └── multi-horizon-engine.ts      [NEW] Multi-window (1M/3M/6M) simulation & consistency scoring
│   ├── correlation/
│   │   └── wallet-correlation-engine.ts [NEW] Hybrid position & return correlation, cluster detection, lead-lag
│   └── recommendations/
│       ├── alpha-scorer.ts              (Existing wallet scorer)
│       └── smart-basket.ts              [NEW] Uncorrelated portfolio optimization & risk-parity allocator
├── app/
│   └── api/
│       ├── backtest/
│       │   ├── route.ts                 (Existing backtest API)
│       │   └── multi-horizon/
│       │       ├── route.ts             [NEW] GET cached multi-horizon table, POST query
│       │       └── refresh/route.ts     [NEW] POST trigger fresh recomputation
│       ├── wallets/
│       │   └── correlation/route.ts     [NEW] GET NxN matrix, clusters, lead-lag, smart basket
│       └── paper/
│           └── basket-subscribe/route.ts [NEW] POST batch-subscribe basket to paper trading
```

### 3.2 Performance & Caching Strategy
- **Pre-computed Cache:** The engine computes the multi-horizon metrics and correlation matrix for the top 20 active wallets during background startup / periodic maintenance and caches them in memory.
- **Sub-100ms API Response:** `GET /api/backtest/multi-horizon` and `GET /api/wallets/correlation` return immediately from cache.
- **On-Demand Recalculation:** A manual refresh button hits `POST /api/backtest/multi-horizon/refresh` to re-fetch live candle snapshots and recalculate.

---

## 4. Frontend & User Experience

### 4.1 Tabbed Navigation in `SonarWorkspace.tsx`
The main `/sonar` page is enhanced with high-visibility tab headers:
1. `🔬 SİMÜLATÖR (LAB)`: The existing interactive parameter builder, equity chart, and trade ledger.
2. `📊 ÇOKLU VADE MATRİSİ (1A - 3A - 6A)`: The new multi-horizon leaderboard table.
3. `🌐 KORELASYON RADARI (HEATMAP)`: The interactive $N \times N$ heatmap, syndicate warnings, and Smart Basket card.

### 4.2 `MultiHorizonMatrix.tsx` Features
- **Summary KPI Bar:** Best Consistent Whale, Mean 3M Sharpe, Lowest Drawdown, Monitored Whales Count.
- **Interactive Data Table:**
  - Address (truncated with quick copy and Compass link)
  - Persona Badge (`TRITON`, `ORCA`, `LEVIATHAN`)
  - 1 Month: PnL % & Sharpe
  - 3 Month: PnL % & Sharpe
  - 6 Month: PnL % & Sharpe
  - Max Drawdown with visual health bar
  - Win Rate %
  - Consistency Score badge ($0 - 100$)
  - Actions: `"Simülatörde İncele"` (switches to Lab tab with wallet prefilled) and `"Kopyala"` (opens copy modal).

### 4.3 `CorrelationHeatmap.tsx` Features
- **Interactive $N \times N$ Grid:**
  - Color map: Emerald Green ($\le 0.10$), Blue/Cyan ($0.10 - 0.40$), Amber ($0.40 - 0.70$), Vibrant Crimson ($\ge 0.75$).
  - Hover tooltip displaying common assets, exact correlation value, and Lead/Lag designation.
- **Syndicate / Bot Warning Banner:** Explicit warnings when two wallets share $>75\%$ correlation.
- **Smart Basket Card:**
  - Displays the 3-5 recommended uncorrelated whales with their risk-parity weights ($w_i$).
  - One-click `"HELM'de Sepeti Kopyala"` button to immediately subscribe them in Paper Trading.

---

## 5. Localization (i18n)

All new strings, table columns, tooltips, metrics, and alert messages will be added to `src/i18n/locales/tr.ts` and `src/i18n/locales/en.ts` using strict, professional financial terminology (Tutarlılık Skoru, Korelasyon Matrisi, Risk Parite, Çoklu Vade, vb.).

---

## 6. Verification & Test Plan

1. **Unit Tests (`vitest`):**
   - Test `calculateMultiHorizonMetrics`: Verify 1M, 3M, 6M windowing, Sharpe, and Consistency Score bounds ($0 - 100$).
   - Test `calculateWalletCorrelationMatrix`: Verify symmetry ($C_{ij} = C_{ji}$), diagonal values ($C_{ii} = 1.0$), and bounds ($[-1.0, 1.0]$).
   - Test `detectSyndicates`: Verify that pairs with $C \ge 0.75$ are flagged.
   - Test `generateSmartBasket`: Verify that selected basket has maximum pairwise correlation $< 0.30$ and weights sum to $1.0$.
2. **API Verification:**
   - Execute curl/HTTP tests against `/api/backtest/multi-horizon` and `/api/wallets/correlation`.
3. **E2E & UI Flow Verification:**
   - Verify tab switching in `/sonar`.
   - Verify clicking "Simülatörde İncele" switches to Lab tab and populates target wallet.
   - Verify Smart Basket "HELM'de Sepeti Kopyala" successfully creates paper subscriptions.
