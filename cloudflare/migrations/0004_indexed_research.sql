-- v0.5 independent research history. Historical blocked v0.3/v0.4 runs retained.
-- New engine uses a separate idempotency namespace so it can run today.
CREATE TABLE IF NOT EXISTS indexed_research_runs (
  day TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('running','completed','needs_attention')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  report_json TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count BETWEEN 0 AND 1)
);
CREATE TABLE IF NOT EXISTS indexed_research_sources (
  id TEXT PRIMARY KEY,
  run_day TEXT NOT NULL REFERENCES indexed_research_runs(day),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  source TEXT NOT NULL,
  query_id TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  UNIQUE(run_day,url)
);
CREATE INDEX IF NOT EXISTS indexed_research_sources_run ON indexed_research_sources(run_day);
