"""Isolated end-to-end smoke test, no external accounts, credentials or uploads."""
import base64
import json
import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image
from kitwise.engine import run
from kitwise.source import LocalInbox
from kitwise.state import FileState


class TestSink:
    def __init__(self, config):
        self.path = Path(config["test_sink"])

    def __enter__(self):
        return self

    def send(self, path, name):
        output = self.path / name
        assert not output.exists(), "Duplicate transfer attempted"
        output.write_bytes(path.read_bytes())

    def __exit__(self, *args):
        pass


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    inbox, sink = root / "inbox", root / "test-sink"
    inbox.mkdir()
    sink.mkdir()
    # Synthetic image solely for software verification. Never sent to a stock site.
    Image.new("RGB", (2048, 2048), (120, 180, 200)).save(inbox / "test.jpg")
    metadata = {"filename": "test.jpg", "title": "Synthetic software test image",
                "description": "A synthetic fixture for verifying software only.",
                "keywords": ["test", "fixture", "synthetic", "software", "sample", "square", "background"],
                "ai_generated": False, "targets": ["adobe"], "categories": {"adobe": 8}}
    (inbox / "test.jpg.json").write_text(json.dumps(metadata))
    key = base64.b64encode(os.urandom(32)).decode()
    state_path = root / "state.enc"
    targets = {"adobe": {"name": "adobe", "host": "test-only.invalid", "username": "test-fixture", "test_sink": str(sink)}}
    state = FileState(state_path, key)
    first = run(LocalInbox(inbox), state, targets, dry_run=False, factory=TestSink)
    assert first["counts"] == {"uploaded_awaiting_portal_submission": 1}, first["counts"]
    restored = FileState(state_path, key)
    second = run(LocalInbox(inbox), restored, targets, dry_run=False, factory=TestSink)
    assert second["counts"] == {"duplicate_skipped": 1}, second["counts"]
    assert len(list(sink.iterdir())) == 1
    assert b"test.jpg" not in state_path.read_bytes()
    print("PASS: metadata embedded, file transferred to local test sink, encrypted state restored, duplicate skipped.")
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write("## End-to-end demo passed\n\nMetadata embedding, local test transfer, encrypted persistence, and duplicate prevention verified.\n\nNo real stock account was contacted.\n")
