"""One-time private setup. Sends secrets through gh stdin, never as CLI arguments."""
import argparse
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from kitwise.transfer import targets_from_json

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--repo", default="jeangamal/kitwise-digital-products-os")
parser.add_argument("--google-credentials", required=True, help="Private service-account or authorized-user JSON file")
parser.add_argument("--folder-id", required=True)
parser.add_argument("--targets", required=True, help="Private JSON file containing target connection details")
parser.add_argument("--recovery-dir", default=str(Path.home() / ".kitwise-recovery"))
args = parser.parse_args()


def gh(arguments, data=None):
    result = subprocess.run(["gh", *arguments], input=data, text=True, capture_output=True)
    if result.returncode:
        # gh can echo private input or account details on errors; don't forward it.
        raise SystemExit("GitHub setup failed. Check gh authentication and repository permissions.")
    return result.stdout


if not shutil.which("gh"):
    raise SystemExit("Install GitHub CLI from https://cli.github.com/ and run gh auth login first.")
credentials = Path(args.google_credentials).read_text()
credential_info = json.loads(credentials)
if credential_info.get("type") not in {"service_account", "authorized_user"}:
    raise SystemExit("Use service-account or authorized-user credentials, not an API key.")
targets = Path(args.targets).read_text()
targets_from_json(targets)

# Pause FIRST, including when reconnecting an existing pipeline.
gh(["variable", "set", "KITWISE_ENABLED", "--repo", args.repo, "--body", "false"])
existing = {item["name"] for item in json.loads(gh(["secret", "list", "--repo", args.repo, "--json", "name"]))}
if "KITWISE_STATE_KEY" not in existing:
    recovery = Path(args.recovery_dir).expanduser()
    recovery.mkdir(mode=0o700, parents=True, exist_ok=True)
    recovery.chmod(0o700)
    key_file = recovery / (args.repo.replace("/", "-") + ".key")
    if key_file.exists():
        state_key = key_file.read_text().strip()
    else:
        state_key = base64.b64encode(os.urandom(32)).decode()
        descriptor = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            stream.write(state_key)
    gh(["secret", "set", "KITWISE_STATE_KEY", "--repo", args.repo], state_key)
    print("Encryption recovery key saved privately. Back it up; it is never printed.")
else:
    print("Existing encryption key preserved. Keep its original recovery copy.")
for name, value in {"KITWISE_GOOGLE_CREDENTIALS": credentials,
                    "KITWISE_DRIVE_FOLDER_ID": args.folder_id,
                    "KITWISE_TARGETS_JSON": targets}.items():
    gh(["secret", "set", name, "--repo", args.repo], value)
print("Connections saved. Uploads remain PAUSED.")
print("Next: Actions > Kitwise scheduled uploads > Run workflow > check-connections, then dry-run.")
print("After both pass, set repository variable KITWISE_ENABLED to true to enable scheduled transfers.")
