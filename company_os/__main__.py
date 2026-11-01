"""Run the first Kitwise Company OS board cycle. No uploads, spending or deployment."""
import argparse
import json
from pathlib import Path
from .ceo import DEFAULT_TOPICS, run_board_cycle
from .research import FixtureSource, HNSignalSource
from .store import Store

def main():
    parser = argparse.ArgumentParser(description="Kitwise Company OS CEO -> Research test cycle")
    parser.add_argument("--mode", choices=["fixture", "live"], default="fixture")
    parser.add_argument("--db", default=".kitwise-local/company-os.sqlite3")
    parser.add_argument("--topics", nargs="+", default=list(DEFAULT_TOPICS))
    parser.add_argument("--report", default=None)
    args = parser.parse_args()
    source = FixtureSource() if args.mode == "fixture" else HNSignalSource()
    store = Store(args.db)
    try:
        output = run_board_cycle(store, source, tuple(args.topics))
        rendered = json.dumps(output, indent=2, ensure_ascii=False)
        if args.report:
            target = Path(args.report)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(rendered + "\n", encoding="utf-8")
        print(rendered)
        return 0 if not output["errors"] else 1
    finally:
        store.close()

if __name__ == "__main__":
    raise SystemExit(main())
