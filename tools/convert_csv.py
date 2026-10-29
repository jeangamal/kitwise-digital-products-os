"""Convert metadata without guessing file extensions, titles or AI provenance."""
import argparse
import csv
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from kitwise.domain import Metadata, Problem

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("csv_file")
parser.add_argument("--images", required=True, help="Local directory containing exact filenames")
parser.add_argument("--output", required=True)
parser.add_argument("--ai-generated", required=True, choices=["true", "false"])
parser.add_argument("--targets", default="adobe,dreamstime")
args = parser.parse_args()
destination = Path(args.output)
destination.mkdir(parents=True, exist_ok=True)
errors = 0
with open(args.csv_file, encoding="utf-8-sig", newline="") as stream:
    for index, row in enumerate(csv.DictReader(stream), 2):
        try:
            filename = row.get("filename", row.get("Filename", row.get("File", "")))
            # Legacy paths may be flattened only if the SAME basename/extension exists.
            filename = Path(filename).name
            if not (Path(args.images) / filename).is_file():
                raise Problem("exact_filename_not_found_no_extension_guessing")
            title = row.get("title", row.get("Title", ""))
            if not title:
                raise Problem("title_missing_add_Title_column")
            description = row.get("description", row.get("Description", title))
            keywords = row.get("keywords", row.get("Keywords", "")).split(",")
            data = {"filename": filename, "title": title, "description": description,
                    "keywords": keywords, "ai_generated": args.ai_generated == "true",
                    "targets": args.targets.split(","), "categories": {}}
            if row.get("AdobeCategory"):
                data["categories"]["adobe"] = int(row["AdobeCategory"])
            if row.get("ShutterstockCategories"):
                data["categories"]["shutterstock"] = row["ShutterstockCategories"]
            Metadata.parse(data)
            path = destination / (filename + ".json")
            if path.exists():
                raise Problem("sidecar_already_exists")
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except (Problem, ValueError) as error:
            errors += 1
            print(f"Row {index}: {error}", file=sys.stderr)
if errors:
    sys.exit(1)
