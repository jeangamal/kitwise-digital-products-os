"""Encrypted durable receipts; a reservation is saved BEFORE each upload."""
import base64
import json
import os
import re
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .domain import Problem
from .net import session


def empty_state():
    return {"version": 1, "receipts": {}, "reports": [], "cursor": ""}


class Codec:
    def __init__(self, key):
        try:
            raw = base64.b64decode(key, validate=True)
            if len(raw) != 32:
                raise ValueError()
            self.cipher = AESGCM(raw)
        except Exception:
            raise Problem("state_key_must_be_base64_32_random_bytes") from None

    def encrypt(self, data):
        nonce = os.urandom(12)
        payload = json.dumps(data, separators=(",", ":")).encode()
        return base64.b64encode(nonce + self.cipher.encrypt(nonce, payload, b"kitwise-state-v1"))

    def decrypt(self, data):
        try:
            packed = base64.b64decode(data, validate=True)
            state = json.loads(self.cipher.decrypt(packed[:12], packed[12:], b"kitwise-state-v1"))
            if state.get("version") != 1 or not isinstance(state.get("receipts"), dict):
                raise ValueError()
            return state
        except Exception:
            # A lost key or corrupted state must NEVER become a fresh, empty ledger.
            raise Problem("cannot_decrypt_state_stop_to_prevent_duplicates") from None


class FileState:
    def __init__(self, path, key):
        self.path = Path(path)
        self.codec = Codec(key)
        self.data = self.codec.decrypt(self.path.read_bytes()) if self.path.exists() else empty_state()

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_bytes(self.codec.encrypt(self.data))
        temporary.chmod(0o600)
        os.replace(temporary, self.path)


class GitHubState:
    def __init__(self, repository, token, key):
        self.codec = Codec(key)
        self.client = session()
        self.client.headers.update({"Authorization": f"Bearer {token}",
                                    "Accept": "application/vnd.github+json",
                                    "X-GitHub-Api-Version": "2022-11-28"})
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise Problem("invalid_repository")
        self.url = f"https://api.github.com/repos/{repository}/contents/.kitwise/state.enc"
        self.sha = None
        try:
            result = self.client.get(self.url, params={"ref": "main"}, timeout=(10, 30))
            if result.status_code == 404:
                self.data = empty_state()
                return
            result.raise_for_status()
            body = result.json()
            self.sha = body["sha"]
            self.data = self.codec.decrypt(base64.b64decode(body["content"]))
        except Problem:
            raise
        except Exception:
            raise Problem("state_read_failed") from None

    def save(self):
        payload = {"message": "Update encrypted Kitwise transfer receipts [skip ci]",
                   "branch": "main", "content": base64.b64encode(self.codec.encrypt(self.data)).decode()}
        if self.sha:
            payload["sha"] = self.sha
        try:
            response = self.client.put(self.url, json=payload, timeout=(10, 30))
            response.raise_for_status()
            self.sha = response.json()["content"]["sha"]
        except Exception:
            # Do not retry PUT: a response can be lost after a successful commit.
            raise Problem("state_write_failed_stop_to_prevent_duplicates") from None
