# Whale Ocean (Milestone 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify Milestone 1 of WHALE OCEAN — a production-grade Hyperliquid market-intelligence terminal with zero fake data, real-time WebSocket & Info API ingestion, dual-mode persistence (SQLite WAL / PostgreSQL-ready), analytics engine (Whale Classification, Ocean Conditions, What Changed), and an institutional dark ocean terminal interface.

**Architecture:** Monorepo with Next.js 15 App Router and dedicated collector/engine modules. Ingests official Hyperliquid data (`wss://api.hyperliquid.xyz/ws` and `https://api.hyperliquid.xyz/info`), validates through strict Zod verification boundaries, stores in SQLite WAL, runs analytics, and streams verified deltas via SSE to the React frontend.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zod, better-sqlite3, lightweight-charts, lucide-react, Vitest.

## Global Constraints
- Absolute zero-tolerance for fake, mock, placeholder, or simulated data.
- If data is missing or connection drops, display truthful states (`DATA UNAVAILABLE`, `STALE`, `WAITING FOR VERIFIED DATA`). Never fill gaps with invented numbers.
- Default database is SQLite with WAL mode (`better-sqlite3`), architected for zero-code migration to PostgreSQL/TimescaleDB when `DATABASE_URL` is set.
- All numbers must trace back to official Hyperliquid endpoints (`metaAndAssetCtxs`, `trades`, `clearinghouseState`, `leaderboard`).
- No LLM hallucinations: "What Changed?" must use deterministic templates fed exclusively by verified delta records.

---

### Task 1: Project Scaffolding, Strict Type Contracts & Anti-Fake Boundary

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/types/contracts.ts`
- Create: `src/types/validation.ts`
- Test: `tests/contracts.test.ts`

**Interfaces:**
- Produces: `VerifiedMarketSnapshotSchema`, `VerifiedWalletObservationSchema`, `OceanConditionSchema`, `WhatChangedEventSchema` and their TypeScript types.
- Produces: `validateMarketSnapshot()`, `validateWalletObservation()` which throw or return errors on unverified/mock data.

- [ ] **Step 1: Initialize package.json and project configuration**
  Install Next.js 15, React, TypeScript, Tailwind, Zod, better-sqlite3, vitest, and dependencies.
- [ ] **Step 2: Write failing validation test**
  Test that invalid, simulated, or missing fields in market snapshots or wallet observations are rejected by Zod schemas and cannot be coerced.
- [ ] **Step 3: Run test to verify it fails**
  Run `npx vitest run tests/contracts.test.ts` to see failure.
- [ ] **Step 4: Implement contracts.ts and validation.ts**
  Define strict schemas with source tags, timestamp validators, and numeric constraints.
- [ ] **Step 5: Run test to verify it passes**
  Run `npx vitest run tests/contracts.test.ts` to see PASS.
- [ ] **Step 6: Commit**
  `git add . && git commit -m "feat: setup project scaffolding and verified data contracts"`

---

### Task 2: Dual-Mode Persistence Layer (SQLite WAL / PostgreSQL Ready)

**Files:**
- Create: `src/db/schema.sql`
- Create: `src/db/client.ts`
- Create: `src/db/repository.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Consumes: Verified contracts from `src/types/contracts.ts`.
- Produces: `db.saveMarketSnapshot()`, `db.getLatestMarketSnapshots()`, `db.saveWallet()`, `db.savePositions()`, `db.savePositionEvent()`, `db.getObservedWallets()`, `db.saveOceanCondition()`, `db.getLatestOceanCondition()`.

- [ ] **Step 1: Write failing database test**
  Test table creation, inserting a verified market snapshot, recording a position event, and retrieving latest states with WAL mode enabled.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/db.test.ts`.
- [ ] **Step 3: Implement schema.sql, client.ts, and repository.ts**
  Use `better-sqlite3` with `PRAGMA journal_mode = WAL;` and foreign keys enabled.
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/db.test.ts` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/db tests/db.test.ts && git commit -m "feat: implement dual-mode persistence layer with WAL mode"`

---

### Task 3: Hyperliquid Info API & WebSocket Live Collector

**Files:**
- Create: `src/collector/hyperliquid-info.ts`
- Create: `src/collector/hyperliquid-ws.ts`
- Create: `src/collector/collector-service.ts`
- Test: `tests/collector.test.ts`

**Interfaces:**
- Consumes: Official endpoints `https://api.hyperliquid.xyz/info` and `wss://api.hyperliquid.xyz/ws`.
- Produces: `HyperliquidInfoClient` (`getMetaAndAssetCtxs()`, `getLeaderboard()`, `getClearinghouseState()`), `HyperliquidWsClient` (subscriptions to `allMids`, `activeAssetCtx`, `trades`, heartbeat ping, reconnect logic), and `CollectorService` lifecycle.

- [ ] **Step 1: Write failing collector test**
  Test API parsing, error handling for network drop, heartbeat ping framing, and rejection of malformed responses.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/collector.test.ts`.
- [ ] **Step 3: Implement Hyperliquid clients and collector service**
  Implement HTTP POST requests with exponential retry and WebSocket client with 30s heartbeat ping and reconnect logic.
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/collector.test.ts` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/collector tests/collector.test.ts && git commit -m "feat: implement official Hyperliquid collector with heartbeat and auto-reconnect"`

---

### Task 4: Analytics Engine (Classification, Ocean Conditions & What Changed)

**Files:**
- Create: `src/analytics/whale-classifier.ts`
- Create: `src/analytics/ocean-conditions.ts`
- Create: `src/analytics/what-changed.ts`
- Test: `tests/analytics.test.ts`

**Interfaces:**
- Consumes: Verified market snapshots and position events.
- Produces: `classifyWhale(notionalExposure: number): WhaleClass`, `calculateOceanCondition(snapshots, events): OceanConditionMeasurement`, `generateWhatChangedFeed(events, deltas): WhatChangedEvent[]`.

- [ ] **Step 1: Write failing analytics test**
  Test classification boundary thresholds ($49,999 is FISH, $50,000 is DOLPHIN, etc.), Ocean Condition composite scoring (0–100 mapped to CALM/ACTIVE/RESTLESS/STORM), and deterministic "What Changed?" output.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/analytics.test.ts`.
- [ ] **Step 3: Implement analytics engine modules**
  Write pure, deterministic calculation functions without speculative narratives or mock fallbacks.
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/analytics.test.ts` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/analytics tests/analytics.test.ts && git commit -m "feat: implement whale classification, ocean conditions index and what-changed synthesizer"`

---

### Task 5: Real-Time API & Server-Sent Events (SSE) Broadcasting

**Files:**
- Create: `src/app/api/markets/route.ts`
- Create: `src/app/api/whales/route.ts`
- Create: `src/app/api/whales/[address]/route.ts`
- Create: `src/app/api/ocean-conditions/route.ts`
- Create: `src/app/api/what-changed/route.ts`
- Create: `src/app/api/stream/route.ts`
- Test: `tests/api.test.ts`

**Interfaces:**
- Produces: REST endpoints returning verified data objects and an SSE streaming endpoint delivering live updates with latency/freshness metadata.

- [ ] **Step 1: Write failing API route test**
  Test that API routes return verified JSON responses with `source` and `observedTimestamp`, and that `/api/stream` broadcasts events.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/api.test.ts`.
- [ ] **Step 3: Implement API routes and SSE streamer**
  Connect routes to the repository and collector broadcast bus.
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/api.test.ts` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/app/api tests/api.test.ts && git commit -m "feat: implement REST and SSE real-time API endpoints"`

---

### Task 6: Terminal Shell, Navigation & Truthful Connection Status

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/ConnectionBadge.tsx`
- Create: `src/components/common/Tooltip.tsx`
- Create: `src/components/common/MethodologyModal.tsx`
- Test: `tests/ui-components.test.tsx`

**Interfaces:**
- Produces: Deep ocean dark aesthetic shell, top navbar, live connection badge (`LIVE`, `STALE`, `WAITING FOR DATA` with seconds counter), and methodology disclosure modal.

- [ ] **Step 1: Write component unit test**
  Test that ConnectionBadge displays exact seconds when stale and never shows "LIVE" if status is disconnected.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/ui-components.test.tsx`.
- [ ] **Step 3: Implement layout, styles, Navbar, and ConnectionBadge**
  Use Tailwind with dark ocean palette (`#05080E`, `#0B111E`, `#111A2E`, `#00E5FF`, `#0070F3`).
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/ui-components.test.tsx` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/app/layout.tsx src/app/globals.css src/components tests/ui-components.test.tsx && git commit -m "feat: build dark oceanic terminal shell and truthful connection monitor"`

---

### Task 7: OCEAN Command Deck View & What Changed Feed

**Files:**
- Create: `src/app/page.tsx` (OCEAN View)
- Create: `src/components/ocean/OceanConditionMeter.tsx`
- Create: `src/components/ocean/WhaleExposureCard.tsx`
- Create: `src/components/ocean/OceanDensityCard.tsx`
- Create: `src/components/ocean/WaterPressureCard.tsx`
- Create: `src/components/ocean/WhatChangedFeed.tsx`
- Create: `src/components/ocean/MarketChart.tsx`
- Test: `tests/ocean-view.test.tsx`

**Interfaces:**
- Produces: The primary OCEAN landing page with Ocean Conditions meter, Whale Exposure metrics, Ocean Density (OI), Water Pressure (Funding), "What Changed?" live feed, and Lightweight Chart.

- [ ] **Step 1: Write failing ocean view test**
  Test that the ocean view displays verified data and properly renders empty states ("WAITING FOR VERIFIED LIVE DATA") when database is empty.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/ocean-view.test.tsx`.
- [ ] **Step 3: Implement OCEAN view components**
  Integrate real-time SSE stream hook, cards, condition meter, and What Changed feed.
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/ocean-view.test.tsx` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/app/page.tsx src/components/ocean tests/ocean-view.test.tsx && git commit -m "feat: implement OCEAN command deck view and what-changed feed"`

---

### Task 8: WHALES & MARKETS Views with Whale Profiles

**Files:**
- Create: `src/app/whales/page.tsx`
- Create: `src/app/markets/page.tsx`
- Create: `src/components/whales/WhaleTable.tsx`
- Create: `src/components/whales/WhaleProfileModal.tsx`
- Create: `src/components/whales/WhaleDnaCard.tsx`
- Create: `src/components/whales/WhaleTrailsTimeline.tsx`
- Create: `src/components/markets/MarketTable.tsx`
- Test: `tests/whales-view.test.tsx`

**Interfaces:**
- Produces: Sortable/filterable table of observed whales, whale profile modal with Whale DNA stats and Whale Trails audit log, and market matrix table.

- [ ] **Step 1: Write failing whales view test**
  Test filtering by whale class, clicking a wallet to open profile, and displaying "Insufficient observed history" when events < 3.
- [ ] **Step 2: Run test to verify it fails**
  Run `npx vitest run tests/whales-view.test.tsx`.
- [ ] **Step 3: Implement Whales, Markets, and Profile components**
  Build table, filters, drawer/modal, and DNA/Trails visualizations.
- [ ] **Step 4: Run test to verify it passes**
  Run `npx vitest run tests/whales-view.test.tsx` to see PASS.
- [ ] **Step 5: Commit**
  `git add src/app/whales src/app/markets src/components/whales src/components/markets tests/whales-view.test.tsx && git commit -m "feat: implement WHALES and MARKETS views with whale profile modals"`

---

### Task 9: End-to-End Verification, Anti-Fake Audit & Documentation

**Files:**
- Create: `README.md`
- Create: `docs/DATA-SOURCES.md`
- Create: `docs/METHODOLOGY.md`
- Create: `docs/HYPERLIQUID-INTEGRATION.md`
- Test: `tests/e2e-data-integrity.test.ts`

**Interfaces:**
- Produces: Complete system documentation and end-to-end data integrity test suite verifying zero fake data across the entire stack.

- [ ] **Step 1: Write end-to-end data integrity test**
  Verify that all displayed numbers trace to official Hyperliquid messages and that disconnected states never fabricate data.
- [ ] **Step 2: Run test to verify it passes**
  Run `npx vitest run tests/e2e-data-integrity.test.ts`.
- [ ] **Step 3: Write comprehensive documentation**
  Detail endpoints, data lineage, formulas, coverage limitations, and operator instructions in `docs/`.
- [ ] **Step 4: Commit**
  `git add README.md docs/ tests/e2e-data-integrity.test.ts && git commit -m "docs: complete system documentation and e2e data integrity verification"`
