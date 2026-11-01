"""Local durable Company OS ledger. Never check real SQLite files into a public repo.

SQLite is a development adapter, NOT a shared cloud database.
"""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

class Store:
    def __init__(self, path):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE NOT NULL,
            assigned_role TEXT NOT NULL, action TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('pending','running','completed','failed','blocked')),
            payload TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY, topic TEXT NOT NULL, source TEXT NOT NULL,
            url TEXT NOT NULL, title TEXT NOT NULL, published_at TEXT,
            observed_at TEXT NOT NULL, metadata TEXT NOT NULL,
            UNIQUE(topic, url)
        );
        CREATE TABLE IF NOT EXISTS opportunities (
            id TEXT PRIMARY KEY, topic TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('research','needs_validation','approved','rejected')),
            score REAL, evidence_count INTEGER NOT NULL DEFAULT 0,
            missing_dimensions TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
            outcome TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
        );
        """)
        self.db.commit()

    def ensure_mode(self, mode):
        with self.db:
            row = self.db.execute("SELECT value FROM settings WHERE key='data_provenance'").fetchone()
            if row is not None and row["value"] != mode:
                raise ValueError("cannot_mix_synthetic_and_live_evidence")
            if row is None:
                self.db.execute("INSERT INTO settings VALUES (?,?)", ("data_provenance", mode))

    def close(self):
        self.db.close()

    def audit(self, actor, action, outcome, detail=""):
        with self.db:
            self.db.execute("INSERT INTO audit_events VALUES (?,?,?,?,?,?)",
                            (uuid4().hex, actor, action, outcome, detail[:1000], now()))

    def task(self, assigned_role, action, payload, key):
        with self.db:
            self.db.execute("""INSERT OR IGNORE INTO tasks
            (id,idempotency_key,assigned_role,action,status,payload,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?)""",
            (uuid4().hex, key, assigned_role, action, "pending",
             json.dumps(payload), now(), now()))
            row = self.db.execute("SELECT * FROM tasks WHERE idempotency_key=?", (key,)).fetchone()
            if row["assigned_role"] != assigned_role or row["action"] != action or json.loads(row["payload"]) != payload:
                raise ValueError("idempotency_key_conflict")
            return dict(row)

    def transition(self, task_id, expected, new_status, result=None):
        with self.db:
            cursor = self.db.execute("""UPDATE tasks SET status=?,result=?,updated_at=?
            WHERE id=? AND status=?""",
            (new_status, json.dumps(result) if result is not None else None, now(), task_id, expected))
            if cursor.rowcount != 1:
                raise ValueError("invalid_task_transition")

    def save_evidence(self, topic, item):
        with self.db:
            self.db.execute("""INSERT OR IGNORE INTO evidence
            (id,topic,source,url,title,published_at,observed_at,metadata)
            VALUES (?,?,?,?,?,?,?,?)""",
            (uuid4().hex, topic, item["source"], item["url"], item["title"],
             item.get("published_at"), now(), json.dumps(item.get("metadata", {}))))

    def evidence(self, topic):
        return [dict(row) for row in self.db.execute("SELECT * FROM evidence WHERE topic=? ORDER BY observed_at DESC,url", (topic,))]

    def upsert_opportunity(self, topic, count, missing):
        with self.db:
            self.db.execute("""INSERT INTO opportunities
            (id,topic,status,score,evidence_count,missing_dimensions,updated_at)
            VALUES (?,?,'needs_validation',NULL,?,?,?)
            ON CONFLICT(topic) DO UPDATE SET status='needs_validation',score=NULL,
              evidence_count=excluded.evidence_count,
              missing_dimensions=excluded.missing_dimensions,updated_at=excluded.updated_at""",
            (uuid4().hex, topic, count, json.dumps(missing), now()))

    def count(self, table):
        if table not in {"tasks", "evidence", "opportunities", "audit_events"}:
            raise ValueError("unknown_table")
        return self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
