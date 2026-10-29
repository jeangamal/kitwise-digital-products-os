import argparse
import json
import os
from pathlib import Path
import sys

from .domain import Problem
from .engine import run
from .source import DriveInbox, LocalInbox
from .state import FileState, GitHubState
from .transfer import targets_from_json, transport


def summarize(report):
    lines = ["## Kitwise upload report", "", "Mode: " + report["mode"], "",
             "| Result | Count |", "|---|---:|"]
    lines += [f"| {status} | {count} |" for status, count in sorted(report["counts"].items())]
    if not report["counts"]:
        lines.append("| No metadata sidecars found | 0 |")
    lines += ["", "Uploads are transfers to the contributor inbox, not final submissions.",
              "Private item details and metadata CSVs are saved only in the encrypted state.", ""]
    text = "\n".join(lines)
    print(text)
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write(text)


def main():
    parser = argparse.ArgumentParser(description="Kitwise cloud asset uploads")
    parser.add_argument("command", choices=["run", "report", "resolve", "connections"])
    parser.add_argument("--local-inbox")
    parser.add_argument("--state-file")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--output", default="private-report")
    parser.add_argument("--receipt")
    parser.add_argument("--resolution", choices=["uploaded", "retry"])
    args = parser.parse_args()
    try:
        key = os.environ["KITWISE_STATE_KEY"]
        if args.state_file:
            state = FileState(args.state_file, key)
        else:
            state = GitHubState(os.environ["GITHUB_REPOSITORY"], os.environ["GITHUB_TOKEN"], key)
        if args.command == "report":
            folder = Path(args.output)
            folder.mkdir(mode=0o700, parents=True, exist_ok=True)
            folder.chmod(0o700)
            receipts = folder / "receipts.json"
            receipts.write_text(json.dumps(state.data["receipts"], indent=2))
            receipts.chmod(0o600)
            for index, report in enumerate(state.data.get("reports", [])):
                path = folder / f"report-{index}.json"
                path.write_text(json.dumps(report, indent=2))
                path.chmod(0o600)
                for item_index, item in enumerate(report["items"]):
                    if "csv" in item:
                        csv_path = folder / f"report-{index}-item-{item_index}-{item['target']}.csv"
                        csv_path.write_text(item["csv"], encoding="utf-8", newline="")
                        csv_path.chmod(0o600)
            print("Private reports exported locally. Do not commit them.")
            return 0
        if args.command == "resolve":
            if not args.receipt or args.receipt not in state.data["receipts"] or not args.resolution:
                raise Problem("existing_receipt_and_resolution_required")
            current = state.data["receipts"][args.receipt]
            if current["status"] == "uploaded":
                raise Problem("confirmed_upload_cannot_be_retried")
            if args.resolution == "uploaded":
                current["status"] = "uploaded"
            else:
                del state.data["receipts"][args.receipt]
            state.save()
            print("Receipt resolved. Retry only after confirming no completed upload in the portal.")
            return 0
        source = LocalInbox(args.local_inbox) if args.local_inbox else DriveInbox(
            os.environ["KITWISE_DRIVE_FOLDER_ID"], os.environ["KITWISE_GOOGLE_CREDENTIALS"])
        targets = targets_from_json(os.environ["KITWISE_TARGETS_JSON"])
        if args.command == "connections":
            # Lists the authenticated source and connects to each target without transferring files.
            next(iter(source.entries(1)), None)
            for config in targets.values():
                with transport(config):
                    pass
            print("Drive access and secure target authentication succeeded. No files transferred.")
            return 0
        limit = max(1, min(25, int(os.getenv("KITWISE_BATCH_SIZE", "10"))))
        report = run(source, state, targets, dry_run=args.dry_run, limit=limit)
        summarize(report)
        failed = {code: count for code, count in report["counts"].items()
                  if code not in {"ready_for_transfer", "duplicate_skipped", "uploaded_awaiting_portal_submission"}}
        return 1 if failed else 0
    except Problem as error:
        print("Kitwise stopped: " + str(error), file=sys.stderr)
        return 1
    except KeyError:
        print("Kitwise stopped: required_configuration_missing", file=sys.stderr)
        return 1
    except Exception:
        # Underlying libraries sometimes put URLs/passwords/filenames in errors.
        print("Kitwise stopped: unexpected_error_check_private_configuration", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
