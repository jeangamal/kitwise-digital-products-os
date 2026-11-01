-- Kitwise Company OS pilot: stored only in the Cloudflare account's D1 database.
-- Public company code; no customer PII or credentials in these tables.
CREATE TABLE IF NOT EXISTS research_runs (
  day TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running','completed','needs_attention')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  report_json TEXT,
  error_code TEXT
);
CREATE TABLE IF NOT EXISTS research_evidence (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT,
  run_day TEXT NOT NULL REFERENCES research_runs(day)
);
CREATE INDEX IF NOT EXISTS idx_evidence_day ON research_evidence(run_day);
