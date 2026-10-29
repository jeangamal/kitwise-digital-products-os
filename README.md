# Kitwise cloud uploads

Check a private cloud inbox, validate images and metadata, and transfer new assets
to configured stock contributor inboxes. Runs on GitHub while your laptop is off.
No n8n server, hosting subscription, paid AI API, or purchased domain.

**Status:** implementation and cloud verification installed. Live transfers remain
paused until Drive access and stock transfer connections are configured. Passing
tests is not the same as completing a real stock-account upload.

## Start here

1. Follow [Connect your accounts](docs/SETUP.md) once.
2. Place an image and its `.json` metadata sidecar in the private Drive inbox.
3. Actions → **Kitwise scheduled uploads** → Run workflow → **check-connections**.
4. Run **dry-run** to validate files and preview metadata without transferring.
5. After both pass, set Actions variable `KITWISE_ENABLED=true` and run **upload**.

The schedule checks every six hours at minute 23 UTC. Manual runs are available.
GitHub schedules can be delayed; this is batch processing, not an always-on server.

## Included

- Private Drive access with read-only credentials; exact filename matching.
- Validation of actual JPEG/PNG bytes, RGB mode, dimensions, titles, keyword count,
  categories and explicitly declared AI provenance.
- Title, description and keyword embedding in copies, without changing pixels.
- Certificate-verified FTPS and host-key-verified SFTP.
- Encrypted persistent upload receipts, saved **before** transfer and after success.
- Duplicate prevention by original content and account, even if files are renamed.
- Interrupted uploads held for review instead of blindly retried.
- Public aggregate status summaries and encrypted private metadata/CSV reports.
- AI-generated contributor images blocked from Shutterstock.

Upload the image first and the metadata sidecar last. Source files are never
deleted, moved, resized or upscaled. See [the metadata example](examples/asset.jpg.json).

## Transfer versus submission

**A successful transfer is not a submission for review.** Adobe's AI checkbox,
Dreamstime's AI category, releases and final submission remain contributor-portal
steps. Reports say `uploaded_awaiting_portal_submission`, never submitted/approved.

Adobe/Shutterstock CSVs use documented headers and are imported in the portal,
not sent via FTP. Dreamstime gets embedded metadata and an operator handoff CSV;
no unverified Dreamstime CSV-import API is claimed. Dreamstime's published FTP
instructions do not establish encrypted support: that account must accept verified
FTPS before this adapter can be enabled. There is no plaintext-password fallback.

## Cost and privacy

This repository is public. Under GitHub's current policy, standard hosted runners
for public repositories are free. Private repositories have plan allowances.
The pipeline uses standard Ubuntu runners, no paid runners, no artifact uploads,
bounded 15-minute jobs, free software, and existing Drive storage. No paid AI
generation or keyword service is included. Provider policies can change.

Images, credentials and private metadata stay outside this public repository.
`.kitwise/state.enc` contains encrypted receipts and the last five private reports.
Its key is held in Actions Secrets and a private recovery copy. Public run summaries
show fixed error codes/counts, not filenames, previews, passwords or private URLs.
Pull-request tests receive no account secrets or write token.

Back up the recovery key. Lost keys or unreadable state stop the pipeline instead
of resetting upload history. Ciphertext versions are retained in git history.
Source images stay in Drive. Public scheduled workflows may be paused after 60
days without repository activity; monitor Actions and re-enable if necessary.

## Existing metadata and collections

`tools/convert_csv.py` supports the older `Item_Index.csv` format after a `Title`
column and target categories are supplied. It never guesses AI provenance or
silently changes `.png` references to `.jpg`.

Use a new inbox for genuinely new assets. Existing manually submitted files are
not discoverable from local receipts and must not be re-uploaded blindly.

## Verification

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python tools/demo.py
```

ExifTool is also required; the cloud verification workflow installs it. The demo
uses a synthetic local test image/sink and verifies metadata embedding, transfer,
encrypted-state recovery and duplicate protection without contacting stock sites.

See [Operations](docs/OPERATIONS.md) for reports, retries and limits, and
[References](docs/REFERENCES.md) for official platform policies.
