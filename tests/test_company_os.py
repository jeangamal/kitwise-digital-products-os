import tempfile
import unittest
from pathlib import Path

from company_os.governance import Outcome, authorize
from company_os.store import Store
from company_os.ceo import run_board_cycle
from company_os.research import FixtureSource, SourceError

class GovernanceTests(unittest.TestCase):
    def test_researcher_can_read_but_cannot_publish(self):
        self.assertEqual(authorize("researcher", "read_public_sources").outcome, Outcome.ALLOW)
        self.assertEqual(authorize("researcher", "publish_marketplace").outcome, Outcome.APPROVAL)
    def test_purchases_require_approval(self):
        self.assertEqual(authorize("ceo", "spend_money").outcome, Outcome.APPROVAL)
    def test_forbidden_and_unknown_denied(self):
        self.assertEqual(authorize("ceo", "expose_secret").outcome, Outcome.DENY)
        self.assertEqual(authorize("unrecognized", "delegate_research").outcome, Outcome.DENY)
        self.assertEqual(authorize("growth", "delegate_research").outcome, Outcome.DENY)

class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "test.sqlite3"
        self.db = Store(self.path)
    def tearDown(self):
        self.db.close()
        self.temp.cleanup()
    def test_idempotent_task_and_status_transition(self):
        task = self.db.task("researcher", "read_public_sources", {"topic": "sample"}, "unique")
        again = self.db.task("researcher", "read_public_sources", {"topic": "sample"}, "unique")
        self.assertEqual(task["id"], again["id"])
        self.assertEqual(self.db.count("tasks"), 1)
        self.db.transition(task["id"], "pending", "running")
        self.db.transition(task["id"], "running", "completed")
        with self.assertRaises(ValueError):
            self.db.transition(task["id"], "pending", "completed")
    def test_idempotency_key_conflict_blocked(self):
        self.db.task("researcher", "read_public_sources", {"topic": "A"}, "key")
        with self.assertRaises(ValueError):
            self.db.task("researcher", "read_public_sources", {"topic": "B"}, "key")
    def test_cycle_saves_ledger_and_never_invents_score(self):
        report = run_board_cycle(self.db, FixtureSource(), ("invoice workflow", "automated spreadsheet"))
        self.assertEqual(report["mode"], "synthetic_test")
        self.assertEqual(self.db.count("opportunities"), 2)
        self.assertEqual(self.db.count("evidence"), 4)
        self.assertEqual(self.db.count("tasks"), 2)
        self.assertTrue(all(r["score"] is None for r in report["opportunities"]))
        self.assertTrue(all(r["status"] == "needs_validation" for r in report["opportunities"]))
        new = run_board_cycle(self.db, FixtureSource(), ("invoice workflow", "automated spreadsheet"))
        self.assertEqual(self.db.count("tasks"), 2)
        self.assertEqual(self.db.count("evidence"), 4)
        self.assertEqual(new["opportunities"][0]["signal_count"], 2)
    def test_failed_fetch_marks_task_and_requires_recovery(self):
        class BrokenSource:
            def search(self, topic):
                raise SourceError("offline")
        report = run_board_cycle(self.db, BrokenSource(), ("billing",))
        self.assertEqual(report["errors"][0]["code"], "public_source_unavailable")
        second = run_board_cycle(self.db, BrokenSource(), ("billing",))
        self.assertEqual(second["errors"][0]["code"], "task_needs_operator_recovery")
    def test_synthetic_and_live_evidence_cannot_mix(self):
        run_board_cycle(self.db, FixtureSource(), ("invoice",))
        class LiveStub:
            def search(self, topic):
                return []
        with self.assertRaisesRegex(ValueError, "cannot_mix_synthetic_and_live_evidence"):
            run_board_cycle(self.db, LiveStub(), ("invoice",))
    def test_rejects_unbounded_topic_requests(self):
        with self.assertRaises(ValueError):
            run_board_cycle(self.db, FixtureSource(), ("x",)*11)

if __name__ == "__main__":
    unittest.main()
