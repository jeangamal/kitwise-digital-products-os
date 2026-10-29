from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import time

from .domain import Asset, Problem, check_target, csv_metadata, handoff
from .metadata import embed
from .transfer import receipt_key, transport


def now():
    return datetime.now(timezone.utc).isoformat()


def run(source, state, targets, *, dry_run=True, limit=10, max_bytes=45_000_000,
        seconds=600, factory=transport, prepare=embed):
    report = {"at": now(), "mode": "dry-run" if dry_run else "upload", "items": [], "counts": {}}
    counts = Counter()
    started = time.monotonic()
    original_cursor = state.data.get("cursor", "")
    for entry in source.entries(limit, state.data.get("cursor", "")):
        if time.monotonic() - started > seconds:
            counts["time_limit_reached"] += 1
            break
        if entry.error:
            counts[entry.error] += 1
            report["items"].append({"source": entry.name, "status": entry.error})
            state.data["cursor"] = entry.name
            if not dry_run:
                state.save()
            continue
        m = entry.metadata
        try:
            with tempfile.TemporaryDirectory(prefix="kitwise-") as folder:
                path = Path(folder) / m.filename
                source.fetch(entry, path, max_bytes)
                asset = Asset.inspect(m, path, max_bytes)
                for name in m.targets:
                    item = {"source": m.filename, "target": name, "remote": asset.remote_name}
                    report["items"].append(item)
                    try:
                        check_target(asset, name)
                        if name not in targets:
                            raise Problem("target_not_configured")
                        config = targets[name]
                        key = receipt_key(config, asset.digest)
                        existing = state.data["receipts"].get(key)
                        if existing:
                            item["status"] = "duplicate_skipped" if existing["status"] == "uploaded" else "uncertain_needs_review"
                            counts[item["status"]] += 1
                            continue
                        item.update({"csv": csv_metadata(asset, name), "next_steps": handoff(asset, name)})
                        if dry_run:
                            item["status"] = "ready_for_transfer"
                        else:
                            prepared = Path(folder) / (name + "-" + asset.remote_name)
                            prepare(asset, name, prepared)
                            with factory(config) as connection:
                                # Durable reservation prevents blind retries after interruption.
                                state.data["receipts"][key] = {"status": "inflight", "at": now(),
                                                                  "target": name, "remote": asset.remote_name}
                                state.save()
                                try:
                                    connection.send(prepared, asset.remote_name)
                                except Exception:
                                    state.data["receipts"][key]["status"] = "uncertain"
                                    state.save()
                                    raise Problem("transfer_uncertain_needs_review") from None
                            state.data["receipts"][key]["status"] = "uploaded"
                            state.save()
                            item["status"] = "uploaded_awaiting_portal_submission"
                        counts[item["status"]] += 1
                    except Problem as error:
                        if str(error).startswith("state_"):
                            raise
                        item["status"] = str(error)
                        counts[str(error)] += 1
        except Problem as error:
            if str(error).startswith("state_"):
                raise
            counts[str(error)] += 1
            report["items"].append({"source": m.filename, "status": str(error)})
        state.data["cursor"] = entry.name
        if not dry_run:
            state.save()
    report["counts"] = dict(counts)
    state.data["reports"] = (state.data.get("reports", []) + [report])[-5:]
    # Dry-runs save only the encrypted report; no transfer receipt or cursor changes.
    if dry_run:
        state.data["cursor"] = original_cursor
    state.save()
    return report
