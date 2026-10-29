"""Download and decrypt reports locally without printing keys or private metadata."""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from kitwise.state import Codec

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--repo", default="jeangamal/kitwise-digital-products-os")
parser.add_argument("--key-file", required=True)
parser.add_argument("--output", default="private-report")
args = parser.parse_args()
response = subprocess.run(["gh", "api", f"repos/{args.repo}/contents/.kitwise/state.enc"], capture_output=True, text=True)
if response.returncode:
    raise SystemExit("Could not download encrypted state. Check gh authentication and that a configured run has finished.")
data = Codec(Path(args.key_file).expanduser().read_text().strip()).decrypt(
    base64.b64decode(json.loads(response.stdout)["content"]))
folder = Path(args.output)
folder.mkdir(mode=0o700, parents=True, exist_ok=True)
folder.chmod(0o700)


def save(name, text):
    path = folder / name
    path.write_text(text, encoding="utf-8")
    path.chmod(0o600)


save("receipts.json", json.dumps(data["receipts"], indent=2))
for index, report in enumerate(data.get("reports", [])):
    save(f"report-{index}.json", json.dumps(report, indent=2))
    for n, item in enumerate(report["items"]):
        if "csv" in item:
            save(f"report-{index}-item-{n}-{item['target']}.csv", item["csv"])
print("Private reports and CSVs exported. Do not commit the output folder.")
