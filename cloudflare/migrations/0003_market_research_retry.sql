-- Allow one guarded recovery attempt after an unsuccessful UTC-day market run.
-- Preserve historical results and prevent unlimited manual re-triggering.
ALTER TABLE market_research_runs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 1);
