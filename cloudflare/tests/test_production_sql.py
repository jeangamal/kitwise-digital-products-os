"""Real SQLite tests of the production claim SQL shipped in the Worker."""
import concurrent.futures
import pathlib
import re
import sqlite3
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
QUERIES = re.findall(r'prepare\("([^"\n]+)"\)', (ROOT / 'src/production.mjs').read_text())
UPDATE = next(q for q in QUERIES if q.startswith('UPDATE production_days SET reserved_neurons'))
INSERT = next(q for q in QUERIES if q.startswith('INSERT INTO production_jobs'))


class ProductionLedgerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = pathlib.Path(self.tmp.name) / 'claims.sqlite3'
        with self.connect() as db:
            for migration in sorted((ROOT / 'migrations').glob('*.sql')):
                db.executescript(migration.read_text())
            db.execute("INSERT INTO production_days(day) VALUES ('2026-11-16')")

    def tearDown(self):
        self.tmp.cleanup()

    def connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def claim(self, identifier, day='2026-11-16'):
        with self.connect() as db:
            db.execute(UPDATE, (512, day, 512, 8000, day + 'T08:00:00.000Z'))
            db.execute(INSERT, (identifier, day, day, day + 'T08:00:00.000Z', '["S1","S2"]'))
            return db.execute('SELECT changes()').fetchone()[0]

    def test_concurrent_claims_charge_once(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda i: self.claim('job-' + str(i)), range(16)))
        self.assertEqual(sum(results), 1)
        with self.connect() as db:
            self.assertEqual(db.execute('SELECT reserved_neurons,attempted_jobs FROM production_days').fetchone(), (512, 1))
            self.assertEqual(db.execute('SELECT COUNT(*) FROM production_jobs').fetchone()[0], 1)

    def test_daily_budget_and_next_day_are_separate(self):
        for i in range(15):
            self.assertEqual(self.claim('job-' + str(i)), 1)
            with self.connect() as db:
                db.execute("UPDATE production_jobs SET status='needs_review' WHERE status='running'")
        self.assertEqual(self.claim('over-budget'), 0)
        with self.connect() as db:
            self.assertEqual(db.execute('SELECT reserved_neurons FROM production_days').fetchone()[0], 7680)
            db.execute("INSERT INTO production_days(day) VALUES ('2026-11-17')")
        self.assertEqual(self.claim('new-day', '2026-11-17'), 1)

    def test_uncertain_jobs_block_claims_across_days(self):
        self.assertEqual(self.claim('uncertain'), 1)
        with self.connect() as db:
            db.execute("UPDATE production_jobs SET status='uncertain'")
            db.execute("INSERT INTO production_days(day) VALUES ('2026-11-17')")
        self.assertEqual(self.claim('do-not-duplicate', '2026-11-17'), 0)
        with self.connect() as db:
            self.assertEqual(db.execute("SELECT reserved_neurons FROM production_days WHERE day='2026-11-17'").fetchone()[0], 0)

    def test_unique_index_protects_against_unexpected_second_running_insert(self):
        self.assertEqual(self.claim('first'), 1)
        with self.assertRaises(sqlite3.IntegrityError):
            with self.connect() as db:
                db.execute("UPDATE production_days SET reserved_neurons=reserved_neurons+512")
                db.execute("INSERT INTO production_jobs(id,day,research_day,status,started_at,source_ids_json) VALUES ('illegal','2026-11-16','2026-11-16','running','now','[]')")
        with self.connect() as db:
            self.assertEqual(db.execute('SELECT reserved_neurons FROM production_days').fetchone()[0], 512)


if __name__ == '__main__':
    unittest.main()
