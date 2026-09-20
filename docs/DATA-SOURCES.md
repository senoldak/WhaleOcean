# WHALE OCEAN — Data Sources & Lineage

## 1. Primary Source of Truth: Official Hyperliquid Infrastructure
Whale Ocean exclusively ingests market and trader data from official Hyperliquid endpoints. No third-party exchange or aggregator data (e.g. Binance, Bybit, CoinGecko, CoinMarketCap, TradingView) is ever substituted for Hyperliquid-native metrics.

### Endpoints & Message Specifications

| Endpoint / Stream | Protocol | Frequency / Trigger | Ingested Data | Database Destination |
| :--- | :--- | :--- | :--- | :--- |
| `https://api.hyperliquid.xyz/info` (`metaAndAssetCtxs`) | HTTP POST | Every 10s | Universe metadata, mark prices, oracle prices, open interest, 8h funding rates, 24h notional volume | `markets`, `market_snapshots` |
| `https://api.hyperliquid.xyz/info` (`leaderboard`) | HTTP POST | Startup + 1h | Historical top trader addresses for initial whale discovery seeding | `wallets` (seeding) |
| `https://api.hyperliquid.xyz/info` (`clearinghouseState`) | HTTP POST | Every 30s per tracked wallet | Open positions, position size, entry price, liquidation price, leverage, unrealized PnL | `positions`, `position_events` |
| `wss://api.hyperliquid.xyz/ws` (`allMids`) | WebSocket | Real-time push | Tick-level mid prices for all active assets | SSE broadcast, real-time chart |
| `wss://api.hyperliquid.xyz/ws` (`trades`) | WebSocket | Real-time push | Executed fills; transactions $> \$100\text{k}$ trigger dynamic wallet discovery | `wallets` (discovery) |

---

## 2. Hard Anti-Fake Architectural Boundary
All incoming network responses must pass through strict runtime validation (`Zod` schemas in `src/types/contracts.ts`) before reaching storage or the user interface.

### Zero-Tolerance Rules
- **ZERO Mock Data:** If an API endpoint fails, returns empty, or disconnects, the UI displays `DATA UNAVAILABLE` or `WAITING FOR VERIFIED DATA`.
- **ZERO Silent Coercion:** Malformed or missing fields trigger rejection and error logs; they are never defaulted to fake numbers.
- **ZERO Fictional Wallets:** Wallets must be valid `0x` hex addresses observed on Hyperliquid.
- **ZERO Fabricated Historical Charts:** If the system has been running for 2 hours, it only displays 2 hours of verified data.
