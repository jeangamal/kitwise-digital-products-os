-- Independent production ledger; research histories and uploader receipts unchanged.
CREATE TABLE IF NOT EXISTS production_days (
  day TEXT PRIMARY KEY,
  reserved_neurons INTEGER NOT NULL DEFAULT 0 CHECK(reserved_neurons >= 0),
  attempted_jobs INTEGER NOT NULL DEFAULT 0 CHECK(attempted_jobs >= 0),
  paused_until TEXT,
  pause_reason TEXT
);
CREATE TABLE IF NOT EXISTS production_jobs (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL REFERENCES production_days(day),
  research_day TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN
    ('running','needs_resolution','needs_review','failed','uncertain')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  source_ids_json TEXT NOT NULL,
  object_key TEXT,
  image_sha256 TEXT,
  width INTEGER,
  height INTEGER,
  bytes INTEGER,
  metadata_json TEXT,
  qa_json TEXT,
  error_code TEXT
);
CREATE INDEX IF NOT EXISTS production_jobs_started ON production_jobs(started_at);
-- A stalled running job blocks further generation until investigated, not blindly retried.
CREATE UNIQUE INDEX IF NOT EXISTS production_single_running
  ON production_jobs((1)) WHERE status IN ('running','uncertain');
CREATE TABLE IF NOT EXISTS production_months (
  month TEXT PRIMARY KEY,
  reserved_transformations INTEGER NOT NULL DEFAULT 0 CHECK(reserved_transformations >= 0)
);
ALTER TABLE production_jobs ADD COLUMN upscaled_object_key TEXT;
ALTER TABLE production_jobs ADD COLUMN final_width INTEGER;
ALTER TABLE production_jobs ADD COLUMN final_height INTEGER;
ALTER TABLE production_jobs ADD COLUMN final_bytes INTEGER;
ALTER TABLE production_jobs ADD COLUMN error_stage TEXT;
