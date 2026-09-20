# Hyperliquid Protocol Integration Architecture

## 1. Overview
Whale Ocean connects directly to Hyperliquid's official public API layer without intermediaries:
- **REST / Info API:** `https://api.hyperliquid.xyz/info`
- **WebSocket Streaming:** `wss://api.hyperliquid.xyz/ws`

No API keys or private keys are required or accepted. Whale Ocean monitors public on-chain and order-book states.

---

## 2. WebSocket Protocol & Lifecycle (`HyperliquidWsClient`)
- **Connection Management:**
  - Automatic 30-second ping frame (`{"method": "ping"}`) to keep the connection alive.
  - Latency measurement on ping response.
  - Exponential backoff reconnects on drop: $1\text{s}, 2\text{s}, 4\text{s}, 8\text{s}, \dots, 30\text{s}$.
  - Reconnect attempt counter and truthful health reporting (`CONNECTING` $\rightarrow$ `LIVE` $\rightarrow$ `STALE` $\rightarrow$ `DATA_UNAVAILABLE`).
- **Subscriptions:**
  - `allMids`: Receives real-time mid prices for all active perpetual assets on Hyperliquid.
  - `trades`: Receives execution fills to detect large transactions ($> \$100\text{k}$) for dynamic whale discovery.

---

## 3. Info API Polling & Rate Limits (`HyperliquidInfoClient`)
- **Market Snapshots (`metaAndAssetCtxs`):**
  - Polled every 10 seconds.
  - Returns `universe` array (asset name, precision, max leverage) and `assetCtxs` (funding, open interest, 24h volume, mark price, oracle price).
- **Leaderboard Seeding (`leaderboard`):**
  - Polled on service startup to seed the initial universe of top trader accounts.
- **Clearinghouse States (`clearinghouseState`):**
  - Polled every 30 seconds per tracked wallet.
  - To respect Hyperliquid rate limits, requests are staggered by 200ms between wallets.
  - Returns active positions, entry prices, liquidation prices, leverage, and unrealized PnL.

---

## 4. Anti-Fake Data Guarantee
- The collector passes all data through strict Zod validators before storage.
- Disconnections are never masked with mock data.
- If the collector loses connection, the UI immediately marks the feed as `STALE` with an elapsed seconds timer.
