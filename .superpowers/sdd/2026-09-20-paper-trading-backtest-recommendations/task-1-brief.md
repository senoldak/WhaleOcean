# Task 1: Database Schema Migration & Repository Methods

**Files:**
- Modify: `src/db/schema.sql`
- Modify: `src/types/contracts.ts`
- Modify: `src/db/repository.ts`
- Test: `tests/db-paper-backtest.test.ts`

**Interfaces:**
- Produces:
  - `WalletAlphaScore` type & `repo.saveWalletAlphaScore()`, `repo.saveWalletAlphaScores()`, `repo.getTopWalletAlphaScores()`, `repo.getWalletAlphaScore()`
  - `PaperPortfolio` type & `repo.getOrCreatePaperPortfolio()`, `repo.updatePaperPortfolio()`, `repo.resetPaperPortfolio()`
  - `PaperPosition` type & `repo.getPaperPositions()`, `repo.savePaperPosition()`, `repo.deletePaperPosition()`
  - `PaperTrade` type & `repo.savePaperTrade()`, `repo.getPaperTrades()`
  - `PaperSubscription` type & `repo.getPaperSubscriptions()`, `repo.savePaperSubscription()`, `repo.deletePaperSubscription()`

## Acceptance Criteria & Steps:

1. **Write failing test first:** Create `tests/db-paper-backtest.test.ts`:
   - Verify `getOrCreatePaperPortfolio('default')` creates a portfolio with initialBalance=100000, cashBalance=100000, marginUsed=0, realizedPnl=0.
   - Verify `savePaperPosition` and `getPaperPositions` store and return active paper positions.
   - Verify `savePaperTrade` and `getPaperTrades` store closed trades with feePaid, fundingPaid, realizedPnl, closeReason.
   - Verify `saveWalletAlphaScore` and `getTopWalletAlphaScores` store and retrieve alpha scores ordered by oceanAlphaScore DESC, with support for filtering by persona or riskTier.
   - Verify `savePaperSubscription`, `getPaperSubscriptions`, `deletePaperSubscription`.
2. **Run test to verify it fails.** (`npx vitest run tests/db-paper-backtest.test.ts`)
3. **Implement schema additions in `src/db/schema.sql`:**
   - Table `wallet_alpha_scores`: address (PK), ocean_alpha_score, persona, risk_tier, sharpe_ratio, sortino_ratio, max_drawdown, profit_factor, win_rate, total_trades, avg_holding_hours, total_pnl_usd, liquidation_distance_score, last_evaluated_at.
   - Table `paper_portfolios`: id (PK), initial_balance, cash_balance, margin_used, realized_pnl, updated_at.
   - Table `paper_positions`: id (PK), portfolio_id, asset, side, size, entry_price, current_price, leverage, margin_used, unrealized_pnl, liquidation_price, take_profit, stop_loss, source, source_wallet, opened_at, updated_at.
   - Table `paper_trades`: id (PK), portfolio_id, asset, side, size, entry_price, exit_price, leverage, realized_pnl, fee_paid, funding_paid, source, source_wallet, close_reason, opened_at, closed_at.
   - Table `paper_subscriptions`: id (PK), portfolio_id, wallet_address, allocated_usd, multiplier, max_drawdown_limit, is_active, created_at, updated_at.
   - Matching indexes.
4. **Update `src/types/contracts.ts`:**
   - Add interfaces for `WalletAlphaScore`, `OceanPersona` ('TRITON' | 'ORCA' | 'LEVIATHAN'), `RiskTier` ('CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'), `PaperPortfolio`, `PaperPosition`, `PaperTrade`, `PaperSubscription`.
5. **Update `src/db/repository.ts`:**
   - Add database queries and mapped methods for all the above tables.
6. **Verify tests pass:** `npx vitest run tests/db-paper-backtest.test.ts`
7. **Run all tests:** `npm run test` (all 43+ existing tests + new test must pass).
8. **Commit:** `git add src/db/schema.sql src/types/contracts.ts src/db/repository.ts tests/db-paper-backtest.test.ts && git commit -m "feat(db): add tables and repository methods for paper trading and alpha scores"`
