# Connect your accounts once

The code is deployed, but GitHub needs its own runtime access. ChatGPT's Google
Drive connection cannot automatically authenticate GitHub jobs.

## 1. Private Drive inbox

Use a **new folder for new assets** to avoid duplicating earlier manual uploads.
Store direct children, not nested folders:

```
asset.jpg
asset.jpg.json
```

Finish copying the image before adding its sidecar. See `examples/asset.jpg.json`.

Use either a Google service account in a project with Drive API enabled, sharing
only the inbox with its email as **Viewer**, or authorized-user OAuth JSON with
a refresh token. The code requests `drive.readonly`. A service account avoids the
seven-day refresh-token expiry that can affect external OAuth apps in Testing.
Keep its credential JSON private. No paid server or billing-enabled service needs
to be created for this access. Never paste credential files or tokens into chat.

## 2. Private target connection file

Use the actual contributor upload-panel host/user/password, which may differ from
the website login. Example shape, with placeholders replaced locally:

```json
[
  {
    "name": "adobe",
    "protocol": "sftp",
    "host": "HOST_FROM_YOUR_ADOBE_UPLOAD_PANEL",
    "port": 22,
    "username": "YOUR_SFTP_USERNAME",
    "password": "YOUR_SFTP_PASSWORD",
    "remote_dir": ".",
    "known_hosts": "VERIFIED_OPENSSH_KNOWN_HOSTS_LINE"
  }
]
```

Adobe hosts must belong to `adobestock.com` or `adobe.com`. Verify the SSH fingerprint
against the provider or an independently trusted connection. An unverified
`ssh-keyscan` result alone does not establish trust. Unknown host keys are rejected.

Shutterstock uses `ftps.shutterstock.com:21`, protocol `ftps`, for eligible non-AI
images. Dreamstime publishes `upload.dreamstime.com`; verify actual encrypted
support before enabling it. Only verified SFTP/FTPS is supported, never plain FTP.
If that server does not accept FTPS, its destination remains blocked pending a
supported secure upload route.

## 3. Save connections securely

Install [GitHub CLI](https://cli.github.com/) and sign in with `gh auth login` using
repository permissions sufficient to manage Actions secrets. From this repository:

```bash
python -m pip install -r requirements.txt
python tools/setup.py \
  --google-credentials /PRIVATE/PATH/google.json \
  --folder-id YOUR_NEW_INBOX_FOLDER_ID \
  --targets /PRIVATE/PATH/connections.json
```

The helper passes secret values through standard input, not command arguments.
It generates a random encryption key and saves a restricted-permission recovery
copy under `~/.kitwise-recovery/`. Back it up. Existing keys are never replaced.

| Repository secret | Purpose |
|---|---|
| `KITWISE_GOOGLE_CREDENTIALS` | Read-only Drive access |
| `KITWISE_DRIVE_FOLDER_ID` | Private inbox identifier |
| `KITWISE_TARGETS_JSON` | Contributor transfer connections |
| `KITWISE_STATE_KEY` | Encrypt receipts and private reports |

Alternatively fill those exact names under Settings → Secrets and variables →
Actions. The state key must be base64-encoded 32 random bytes with a recovery copy.
Never put secret values in workflow inputs, repository files, issues or chat.

The helper leaves `KITWISE_ENABLED=false`. Credentials can be checked and files
dry-run while transfers are paused.

## 4. Verify, then enable

1. Actions → **Kitwise scheduled uploads** → Run workflow → **check-connections**.
   This verifies authenticated Drive listing and target connections without uploads.
2. Run **dry-run**, then decrypt the private report to inspect metadata and CSVs.
3. Set Actions variable `KITWISE_ENABLED=true`.
4. Run **upload** once and confirm receipt in the contributor portal. Only then is
   that account verified end to end. Complete AI labels and submission in the portal.

The schedule checks every six hours. `KITWISE_BATCH_SIZE` defaults to 10 sidecars
and is capped at 25. Overlapping runs queue instead of interrupting transfers.
Global pause: set `KITWISE_ENABLED=false`.
