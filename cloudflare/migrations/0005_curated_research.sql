-- v0.6 research quality gate: separate daily ledger allows testing revised engine
-- without overwriting historical v0.5 searches and without extra Tavily cost on reruns.
CREATE TABLE IF NOT EXISTS curated_research_runs (
  day TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('running','completed','needs_attention')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  report_json TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count BETWEEN 0 AND 1)
);
CREATE TABLE IF NOT EXISTS curated_research_sources (
  id TEXT PRIMARY KEY,
  run_day TEXT NOT NULL REFERENCES curated_research_runs(day),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  source TEXT NOT NULL,
  query_id TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  UNIQUE(run_day,url)
);
CREATE INDEX IF NOT EXISTS curated_research_sources_run ON curated_research_sources(run_day);
