-- =======================================================
-- WHALE OCEAN — Persistence Schema (SQLite / PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS markets (
  asset TEXT PRIMARY KEY,
  sz_decimals INTEGER NOT NULL DEFAULT 4,
  max_leverage INTEGER NOT NULL DEFAULT 50,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT NOT NULL,
  mark_price REAL NOT NULL,
  oracle_price REAL NOT NULL,
  open_interest REAL NOT NULL,
  funding_rate REAL NOT NULL,
  volume_24h REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL,
  FOREIGN KEY (asset) REFERENCES markets(asset)
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_asset_time ON market_snapshots(asset, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_time ON market_snapshots(timestamp DESC);

CREATE TABLE IF NOT EXISTS wallets (
  address TEXT PRIMARY KEY,
  whale_class TEXT NOT NULL,
  total_observed_exposure REAL NOT NULL DEFAULT 0,
  first_observed_at INTEGER NOT NULL,
  last_observed_at INTEGER NOT NULL,
  is_tracked INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_wallets_exposure ON wallets(total_observed_exposure DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_class ON wallets(whale_class);

CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY, -- ${address}:${asset}
  wallet_address TEXT NOT NULL,
  asset TEXT NOT NULL,
  side TEXT NOT NULL, -- 'LONG' | 'SHORT'
  size REAL NOT NULL,
  entry_price REAL NOT NULL,
  liquidation_price REAL,
  leverage REAL NOT NULL,
  unrealized_pnl REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (wallet_address) REFERENCES wallets(address)
);

CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_positions_asset ON positions(asset);

CREATE TABLE IF NOT EXISTS position_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  asset TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'OPEN' | 'INCREASE' | 'DECREASE' | 'CLOSE' | 'FLIP'
  prev_size REAL NOT NULL,
  new_size REAL NOT NULL,
  delta_notional REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (wallet_address) REFERENCES wallets(address)
);

CREATE INDEX IF NOT EXISTS idx_pos_events_wallet_time ON position_events(wallet_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pos_events_time ON position_events(timestamp DESC);

CREATE TABLE IF NOT EXISTS ocean_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  classification TEXT NOT NULL, -- 'CALM' | 'ACTIVE' | 'RESTLESS' | 'STORM'
  volatility_score REAL NOT NULL,
  oi_change_percent REAL NOT NULL,
  funding_stress_score REAL NOT NULL,
  whale_exposure_delta REAL NOT NULL,
  raw_metrics_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ocean_conditions_time ON ocean_conditions(timestamp DESC);

CREATE TABLE IF NOT EXISTS anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  anomaly_type TEXT NOT NULL,
  wallet_address TEXT,
  asset TEXT,
  description TEXT NOT NULL,
  baseline_value REAL,
  observed_value REAL,
  raw_event_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_anomalies_time ON anomalies(timestamp DESC);

CREATE TABLE IF NOT EXISTS what_changed_events (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  category TEXT NOT NULL,
  asset TEXT,
  statement TEXT NOT NULL,
  delta_value REAL,
  time_window_minutes INTEGER NOT NULL,
  source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_what_changed_time ON what_changed_events(timestamp DESC);

-- =======================================================
-- WHALE OCEAN — Paper Trading & Alpha Recommendations
-- =======================================================

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

CREATE TABLE IF NOT EXISTS paper_portfolios (
  id TEXT PRIMARY KEY,
  initial_balance REAL NOT NULL DEFAULT 100000.0,
  cash_balance REAL NOT NULL DEFAULT 100000.0,
  margin_used REAL NOT NULL DEFAULT 0.0,
  realized_pnl REAL NOT NULL DEFAULT 0.0,
  updated_at INTEGER NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_paper_trades_portfolio ON paper_trades(portfolio_id, closed_at DESC);

CREATE TABLE IF NOT EXISTS paper_subscriptions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL DEFAULT 'default',
  wallet_address TEXT NOT NULL,
  allocated_usd REAL NOT NULL,
  multiplier REAL NOT NULL DEFAULT 1.0,
  max_drawdown_limit REAL DEFAULT 0.15,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paper_subs_portfolio ON paper_subscriptions(portfolio_id);

