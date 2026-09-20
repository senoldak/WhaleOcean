# Whale Ocean — System Design Specification
**Date:** 2026-09-19  
**Version:** 1.0.0-milestone1  
**Status:** Approved by User  
**Taglines:**  
- Primary: *"Don't watch the price. Watch the ocean."*  
- Secondary: *"See the ocean behind the chart."*  

---

## 1. Executive Summary & Core Philosophy

WHALE OCEAN is a real-time market intelligence terminal for Hyperliquid that observes large trader behavior, wallet activity, correlated wallet groups, exposure changes, liquidations, and market structure.

### Absolute Zero-Tolerance Data Integrity Rule
WHALE OCEAN never fabricates data:
- ZERO mock market data
- ZERO fake wallet addresses
- ZERO fake positions or whale activity
- ZERO fake liquidations, funding rates, or open interest
- ZERO simulated live events or invented timestamps
- ZERO fallback to fabricated data when Hyperliquid is unavailable

When verified live data is unavailable or insufficient, the application explicitly reports:
- `"DATA UNAVAILABLE"`
- `"WAITING FOR VERIFIED LIVE DATA"`
- `"INSUFFICIENT VERIFIED DATA"`
- `"Observed history begins: [timestamp]"`

---

## 2. Ocean Metaphor Mapping

| Concept | Market Counterpart | Meaning / Measurement |
| :--- | :--- | :--- |
| **Ocean** | Hyperliquid Market | The collective perpetual and spot trading ecosystem. |
| **Whales** | Large Traders | Wallets with observed notional exposure $\ge \$50\text{k}$. |
| **Pods** | Correlated Wallet Groups | Statistically clustered wallets exhibiting similar timing, asset overlap, and direction. *Does not prove coordination.* |
| **Currents** | Directional Flow | Net whale exposure delta, funding pressure, and OI velocity. |
| **Ocean Density** | Open Interest | Total outstanding open contracts across markets. |
| **Water Pressure** | Funding Conditions | Extreme positive/negative funding rates exerting carry stress. |
| **Reefs** | Liquidation Clusters | Verified liquidation concentrations. |
| **Graveyard** | Large Liquidation Log | Historical record of verified high-notional liquidations. |
| **Migration** | Exposure Rotation | Observed shifting of whale exposure between markets (e.g. BTC $\rightarrow$ SOL). *Not labeled as capital flow unless verified.* |
| **Whale Hunt** | Anomaly Detection | Statistical deviations from a wallet's historical baseline. |
| **Storm** | Market Volatility | High volatility, rapid OI swings, and liquidation acceleration. |
| **Whale DNA** | Behavioral Profile | Measurable historical statistics (position duration, flip frequency, concentration). |
| **Whale Trails** | Exposure History | Chronological audit log of observed position changes. |
| **Ocean Conditions** | Market-wide State | Environmental index: `CALM`, `ACTIVE`, `RESTLESS`, `STORM`. |

---

## 3. Architecture & Data Flow

WHALE OCEAN is structured as an integrated TypeScript monorepo with strict separation between raw network input and verified UI-facing data contracts:

```
Hyperliquid WebSocket (wss://api.hyperliquid.xyz/ws)
Hyperliquid Info API (https://api.hyperliquid.xyz/info)
                  │
                  ▼
   ┌───────────────────────────────┐
   │    Live Collector Service     │
   │  (Heartbeat, Reconnect, WS)   │
   └──────────────┬────────────────┘
                  │ Raw Ingestion
                  ▼
   ┌───────────────────────────────┐
   │ Runtime Verification Boundary │
   │  (Strict Zod Schema Validate) │
   └──────────────┬────────────────┘
                  │ Verified Event Only
                  ▼
   ┌───────────────────────────────┐
   │ Dual-Mode Persistence Layer   │
   │  (SQLite WAL / PostgreSQL)    │
   └──────────────┬────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌──────────────────────┐
│  Analytics    │   │  Real-Time Engine    │
│  (Whale DNA,  │   │  (SSE / WebSocket)   │
│   Pods, Hunt, │   └──────────┬───────────┘
│   Conditions) │              │
└───────┬───────┘              │
        └─────────┬────────────┘
                  ▼
   ┌───────────────────────────────┐
   │     Next.js Web Terminal      │
   │  (React 15, Tailwind, Charts) │
   └───────────────────────────────┘
```

---

## 4. Hyperliquid Integration & Verification Contracts

### Official Endpoints
1. **WebSocket (`wss://api.hyperliquid.xyz/ws`):**
   - Subscriptions:
     - `allMids`: Mid prices for all active assets.
     - `activeAssetCtx`: Real-time funding rates, open interest, and mark prices.
     - `trades`: Executed trade stream used to detect transactions $> \$100\text{k}$ to identify active whale addresses.
   - Heartbeat: Send `{"method": "ping"}` every 30s.
   - Reconnect: Exponential backoff (1s, 2s, 4s, 8s, up to 30s).
2. **Info API (`https://api.hyperliquid.xyz/info` - HTTP POST):**
   - `{"type": "metaAndAssetCtxs"}`: Complete asset universe metadata, mark prices, funding, 24h volume.
   - `{"type": "leaderboard"}`: Seeds top observed wallets.
   - `{"type": "clearinghouseState", "user": "<address>"}`: Detailed positions, leverage, liquidation prices, margin.
   - `{"type": "userFills", "user": "<address>"}`: Execution history for tracked wallets.

### Verified Data Contracts (Zod Schemas)
- **`VerifiedMarketSnapshot`**:
  ```ts
  {
    asset: string;
    markPrice: number;
    oraclePrice: number;
    openInterest: number;
    fundingRate: number;
    volume24h: number;
    observedTimestamp: number; // UTC ms
    source: "hyperliquid:metaAndAssetCtxs";
  }
  ```
- **`VerifiedWalletObservation`**:
  ```ts
  {
    walletAddress: string; // 0x hex
    whaleClass: "FISH" | "DOLPHIN" | "SHARK" | "HUMPBACK" | "ORCA" | "BLUE_WHALE" | "SPERM_WHALE";
    totalNotionalExposure: number;
    positions: Array<{
      asset: string;
      side: "LONG" | "SHORT";
      size: number;
      entryPrice: number;
      liquidationPrice: number | null;
      leverage: number;
      unrealizedPnl: number;
    }>;
    observedTimestamp: number;
    source: "hyperliquid:clearinghouseState";
  }
  ```
- **`OceanConditionMeasurement`**:
  ```ts
  {
    timestamp: number;
    classification: "CALM" | "ACTIVE" | "RESTLESS" | "STORM";
    volatilityScore: number;
    oiChangePercent: number;
    fundingStressScore: number;
    whaleExposureDelta: number;
    underlyingMetrics: {
      realizedVol1h: number;
      oiDelta24h: number;
      avgAbsFunding: number;
      netWhaleDelta1h: number;
    };
  }
  ```

---

## 5. Dual-Mode Database Persistence

### Engine Selection
- **Default Engine:** SQLite using `better-sqlite3` with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`). Provides fast concurrent reads while collector writes at high frequency.
- **Production Mode:** Seamlessly switches to PostgreSQL / TimescaleDB if `DATABASE_URL` is set in `.env`.

### Schema Design
1. `markets` (asset PK, sz_decimals, max_leverage, is_active, updated_at)
2. `market_snapshots` (id PK, asset FK, mark_price, oracle_price, open_interest, funding_rate, volume_24h, timestamp INDEXED)
3. `wallets` (address PK, whale_class, total_observed_exposure, first_observed_at, last_observed_at, is_tracked)
4. `positions` (id PK `${address}:${asset}`, wallet_address FK, asset FK, side, size, entry_price, liquidation_price, leverage, unrealized_pnl, updated_at)
5. `position_events` (id PK, wallet_address, asset, event_type ['OPEN', 'INCREASE', 'DECREASE', 'CLOSE', 'FLIP'], prev_size, new_size, delta_notional, timestamp INDEXED)
6. `ocean_conditions` (id PK, timestamp INDEXED, classification, volatility_score, oi_change_percent, funding_stress_score, whale_exposure_delta, raw_metrics_json)
7. `anomalies` (id PK, timestamp INDEXED, anomaly_type, wallet_address, asset, description, baseline_value, observed_value)
8. `pods` & `pod_members` (id, pod_name, similarity_score, observation_window, members)

---

## 6. Analytical Engines

### 1. Whale Classification
Thresholds based strictly on total observed notional exposure:
- **FISH:** $< \$50\text{k}$
- **DOLPHIN:** $\$50\text{k} - \$250\text{k}$
- **SHARK:** $\$250\text{k} - \$1\text{M}$
- **HUMPBACK:** $\$1\text{M} - \$5\text{M}$
- **ORCA:** $\$5\text{M} - \$20\text{M}$
- **BLUE WHALE:** $\$20\text{M} - \$50\text{M}$
- **SPERM WHALE:** $> \$50\text{M}$
*Constraint:* Visual classification only. Never imply skill or inside knowledge.

### 2. Whale DNA & Trails
- **Whale DNA:** Statistical metrics computed strictly from observed data:
  - Median position duration (hours)
  - Average notional position size ($)
  - Market concentration (Herfindahl-Hirschman Index across active markets)
  - Directional bias (% long vs % short)
  - Flip frequency (number of long/short flips per 30 days)
  - *Insufficient History Rule:* If $< 3$ events or $< 24\text{h}$ of history: `"Insufficient observed history."`
- **Whale Trails:** Chronological audit trail of position changes with exact timestamps.

### 3. Pods (Correlated Wallet Clusters)
- **Algorithm:** Multi-dimensional similarity scoring:
  - Market Overlap ($30\%$): Jaccard index of traded assets.
  - Directional Alignment ($40\%$): Cosine similarity of active position directions.
  - Temporal Synchronization ($30\%$): Temporal correlation of position changes occurring within a $\Delta t \le 15\text{ min}$ window.
- *Mandatory Disclaimer:* *"Statistically similar observed behavior. Does not prove coordination or common entity ownership."*

### 4. Whale Hunt (Anomaly Detection)
- Anomaly criteria relative to historical baseline:
  - Exposure surge $> 3.0\times$ wallet's historical median change.
  - Directional flip (Long $\leftrightarrow$ Short with notional $> \$250\text{k}$).
  - Multi-market acceleration ($> 3$ position increases across different markets in $< 15\text{ min}$).
- *Factual Microcopy:* *"Position increase is 3.8x this wallet's median observed change over the available observation period."*

### 5. Ocean Conditions
- Composite index (0–100) computed from:
  - Realized volatility (rolling 1h return standard deviation)
  - Ocean density change ($\Delta \text{OI} / \text{OI}$)
  - Water pressure (mean absolute funding rate)
  - Whale net exposure delta
- States:
  - `CALM` (0–25)
  - `ACTIVE` (26–55)
  - `RESTLESS` (56–75)
  - `STORM` (76–100)
- *Constraint:* Never presented as a trading signal.

### 6. "What Changed?" Feed
- Deterministic template-driven generator evaluating verified deltas from the last 15m, 1h, and 24h. No speculative narrative or LLM hallucinations.

---

## 7. User Experience & Design

### Visual Direction
- Dark ocean maritime terminal: Abyss Black (`#05080E`), Subsea Navy (`#111A2E`), Perimeter Borders (`#1A2845`).
- Accents: Bioluminescent Cyan (`#00E5FF`), Marine Blue (`#0070F3`), Crimson Red (`#FF3B30`), Seafoam Green (`#00E676`).
- Typography: Inter and Outfit for high-contrast numeric legibility.
- Progressive disclosure: Level 1 (Immediate metric) $\rightarrow$ Level 2 (Interactive chart) $\rightarrow$ Level 3 (Methodology & Raw JSON audit).

### Navigation
- Top navigation: `OCEAN`, `WHALES`, `PODS`, `HUNT`, `TRAILS`, `REEF`, `MIGRATION`, `MARKETS`, `GRAVEYARD`.
- Persistent connection status badge: `LIVE` (with latency ms), `STALE` (with elapsed seconds), `CONNECTING`, `DATA UNAVAILABLE`.

---

## 8. Testing & Verification

1. **Negative Injection Test:** Pass synthetic/invalid payloads into data pipeline; verify strict rejection and zero mock data fallback.
2. **Classification & Math Tests:** Unit test whale tiers, Pod similarity matrices, anomaly z-scores, and Ocean Conditions formulas.
3. **Connection Lifecycle Tests:** Verify automatic reconnect with backoff and graceful `LIVE` $\rightarrow$ `STALE` transitions.
4. **End-to-End Integrity Audit:** Verify every displayed number traces back to a verified Hyperliquid API message.
