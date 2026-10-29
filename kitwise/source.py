from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .domain import Metadata, Problem
from .net import download


@dataclass
class Entry:
    metadata: Metadata | None
    image_id: str
    name: str = ""
    error: str = ""


def batch(items, limit, after):
    items = sorted(items, key=lambda item: item[0])
    return ([item for item in items if item[0] > after] +
            [item for item in items if item[0] <= after])[:limit]


class LocalInbox:
    def __init__(self, folder):
        self.folder = Path(folder).resolve()

    def entries(self, limit, after=""):
        for name, sidecar in batch([(p.name, p) for p in self.folder.glob("*.json")], limit, after):
            try:
                if sidecar.stat().st_size > 65536:
                    raise Problem("metadata_too_large")
                metadata = Metadata.parse(json.loads(sidecar.read_text()))
                original = self.folder / metadata.filename
                image = original.resolve()
                if image.parent != self.folder or original.is_symlink() or not image.is_file():
                    raise Problem("matching_image_missing")
                yield Entry(metadata, str(image), name)
            except Exception as error:
                yield Entry(None, "", name, str(error) if isinstance(error, Problem) else "invalid_metadata")

    def fetch(self, entry, destination, limit):
        source = Path(entry.image_id)
        if source.stat().st_size > limit:
            raise Problem("download_limit_exceeded")
        destination.write_bytes(source.read_bytes())


class DriveInbox:
    """Private Drive folder. Reads direct children; no silently truncated scans."""
    def __init__(self, folder_id, credentials_json):
        import google.auth
        from google.auth.transport.requests import AuthorizedSession
        try:
            info = json.loads(credentials_json)
            if info.get("type") not in {"service_account", "authorized_user"}:
                raise Problem("unsupported_google_credential_type")
            credentials, _ = google.auth.load_credentials_from_dict(
                info, scopes=["https://www.googleapis.com/auth/drive.readonly"])
            self.client = AuthorizedSession(credentials)
            self.folder_id = folder_id
            if not folder_id or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in folder_id):
                raise Problem("invalid_drive_folder_id")
        except Problem:
            raise
        except Exception:
            raise Problem("invalid_google_credentials") from None

    def entries(self, limit, after=""):
        files, token = [], None
        while True:
            try:
                response = self.client.get("https://www.googleapis.com/drive/v3/files", params={
                    "q": f"'{self.folder_id}' in parents and trashed=false",
                    "fields": "nextPageToken,files(id,name,mimeType,size)",
                    "pageSize": 1000, "pageToken": token or "", "supportsAllDrives": "true",
                    "includeItemsFromAllDrives": "true"}, timeout=(10, 45))
                response.raise_for_status()
                page = response.json()
            except Exception:
                raise Problem("drive_folder_listing_failed") from None
            files.extend(page.get("files", []))
            token = page.get("nextPageToken")
            if len(files) > 5000:
                raise Problem("split_inbox_into_smaller_batches")
            if not token:
                break
        by_name = {}
        for item in files:
            by_name.setdefault(item["name"], []).append(item)
        sidecars = sorted((f for f in files if f["name"].lower().endswith(".json")), key=lambda f: f["name"])
        if not sidecars and any(f["name"].lower().endswith((".jpg", ".jpeg", ".png", ".csv")) for f in files):
            raise Problem("metadata_json_sidecars_required_use_converter")
        for name, item in batch([(f["name"], f) for f in sidecars], limit, after):
            try:
                if len(by_name[name]) != 1:
                    raise Problem("duplicate_drive_filename")
                with self.client.get(f"https://www.googleapis.com/drive/v3/files/{item['id']}",
                                     params={"alt": "media"}, timeout=(10, 30), stream=True) as response:
                    response.raise_for_status()
                    payload = b""
                    for chunk in response.iter_content(8192):
                        payload += chunk
                        if len(payload) > 65536:
                            raise Problem("metadata_too_large")
                metadata = Metadata.parse(json.loads(payload))
                candidates = by_name.get(metadata.filename, [])
                if len(candidates) != 1:
                    raise Problem("matching_image_missing_or_ambiguous")
                yield Entry(metadata, candidates[0]["id"], name)
            except Exception as error:
                yield Entry(None, "", name, str(error) if isinstance(error, Problem) else "metadata_download_or_parse_failed")

    def fetch(self, entry, destination, limit):
        download(self.client, f"https://www.googleapis.com/drive/v3/files/{entry.image_id}",
                 destination, limit, {"alt": "media", "supportsAllDrives": "true"})
