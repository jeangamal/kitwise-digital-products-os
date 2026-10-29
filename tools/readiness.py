"""Standard-library-only readiness check; safe to run without account secrets."""
import os

REQUIRED = ["KITWISE_STATE_KEY", "KITWISE_GOOGLE_CREDENTIALS", "KITWISE_DRIVE_FOLDER_ID", "KITWISE_TARGETS_JSON"]
missing = [name for name in REQUIRED if not os.getenv(name)]
enabled = os.getenv("KITWISE_ENABLED", "").lower() == "true"
ready = not missing and (enabled or os.getenv("REQUESTED_MODE") in {"dry-run", "check-connections"})
lines = ["## Kitwise connection status", "", "Cloud runner: available",
         "Scheduled uploads: " + ("enabled" if enabled else "paused until accounts are connected"), ""]
if missing:
    lines += ["Missing repository secrets:"] + ["- " + name for name in missing]
else:
    lines += ["All required secret names are present. A dry-run still needs to verify their values."]
text = "\n".join(lines) + "\n"
print(text)
if os.getenv("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write(text)
if os.getenv("GITHUB_OUTPUT"):
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write("ready=" + str(ready).lower() + "\n")
