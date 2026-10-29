# Operations

Open Actions → Kitwise scheduled uploads to see aggregate run results:

| Status | Meaning |
|---|---|
| `ready_for_transfer` | Validation passed; dry-run did not upload |
| `uploaded_awaiting_portal_submission` | File transferred; portal steps remain |
| `duplicate_skipped` | Identical original bytes already uploaded to this account |
| `transfer_uncertain_needs_review` | Connection failed after transfer began |
| `uncertain_needs_review` | Previous run interrupted; check before retrying |
| `target_not_configured` | Destination is absent from private connection config |
| `matching_image_missing` | Exact basename/extension was not found |

Other errors use fixed descriptive codes. Private item details remain encrypted.
GitHub sends its ordinary failure notifications according to your account settings.

## Private reports and metadata CSVs

After a configured run finishes:

```bash
python tools/private_report.py \
  --key-file ~/.kitwise-recovery/jeangamal-kitwise-digital-products-os.key
```

The private output folder is ignored by git. Adobe/Shutterstock CSVs are imported
through the contributor portal after the files arrive. Dreamstime's handoff CSV is
a readable checklist, not an asserted import format. Do not send it via FTP/SFTP.

## Uncertain transfer recovery

1. Pause with `KITWISE_ENABLED=false`.
2. Check the contributor portal and upload history for the remote filename. A file
   disappearing from FTP can mean successful ingestion, not failure.
3. Decrypt the reports and `receipts.json`; locate the receipt identifier.
4. On a trusted local machine, supply `KITWISE_STATE_KEY`, `GITHUB_REPOSITORY` and
   `GITHUB_TOKEN` through your private environment and run
   `python -m kitwise resolve --receipt IDENTIFIER --resolution uploaded` if it
   arrived. Use `--resolution retry` only after confirming no completed upload.
5. Re-enable scheduling.

Confirmed uploads cannot be removed by the retry command. An unreadable ledger or
failed state write stops the workflow. Restore the right key/state before resuming.
Corrections to metadata for an uploaded image belong in the portal, not a duplicate.

## Backups and resource limits

Encrypted state is versioned in git. Keep an independent key backup. Last five
detailed reports are in current state; older ciphertext remains in git history.
Source images stay in Drive. This does not back up the stock platforms themselves.

Jobs last at most 15 minutes. The engine stops starting new items after ten minutes.
Images are capped at 45 MB. Only JPEG/PNG are supported. Inbox scans are capped at
5,000 direct children and rotate through sidecars between runs. There is no automatic
review-status scraping, browser-session bypass or paid AI generation.
