-- Independent v0.3 market-research ledger; preserves all v0.1/v0.2 generic research records.
-- A separate day key permits a new microstock test even if the generic agent ran earlier today.
CREATE TABLE IF NOT EXISTS market_research_runs (
  day TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('running','completed','needs_attention')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  report_json TEXT,
  error_code TEXT
);
CREATE TABLE IF NOT EXISTS market_research_signals (
  id TEXT PRIMARY KEY,
  run_day TEXT NOT NULL REFERENCES market_research_runs(day),
  keyword TEXT NOT NULL,
  matching_results INTEGER NOT NULL,
  demand_label TEXT NOT NULL,
  growth_percent REAL NOT NULL,
  source_url TEXT NOT NULL,
  UNIQUE(run_day,keyword)
);
CREATE INDEX IF NOT EXISTS market_research_signals_day ON market_research_signals(run_day);
