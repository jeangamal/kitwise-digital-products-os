# Chairman Dashboard v0.2 — Private, Cloud-hosted

This dashboard is part of the existing Cloudflare Worker at:

https://kitwise-company-os.jean-gamal.workers.dev/dashboard

## What you can actually see

- Recent daily Research Agent runs and their verified statuses.
- Evidence links to original Hacker News discussion headlines (weak market signals only).
- The latest AI interpretation, **explicitly unverified as buyer demand**.
- Departments that are implemented, partially implemented or merely planned.
- A protected "Run research now" control, once per UTC day.
- Finance and marketplace metrics as unknown, **not fabricated $0 values**.

This is not yet an AI-run business. Product creation, publishing, verified sales reporting and scaling remain future phases.

## One-time private access setup

The public Dashboard page shows a locked sign-in shell. D1 records are never available without a strong Chairman key.

1. On your Mac, open **Terminal** and run:
   ```bash
   openssl rand -hex 32
   ```
   This prints a random **64-character hexadecimal key**. Do not share it in chat, screenshots, GitHub code, or issues. Save the key in a secure password manager because you will enter it into the dashboard.
2. Open [Kitwise GitHub Actions secrets](https://github.com/jeangamal/kitwise-digital-products-os/settings/secrets/actions).
3. Click **New repository secret**. Set:
   - Name: `KITWISE_CHAIRMAN_KEY`
   - Secret: paste the **64-character key**, not your Cloudflare API token.
4. Existing GitHub secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` must remain configured.
5. Open [Kitwise manual cloud deployment](https://github.com/jeangamal/kitwise-digital-products-os/actions/workflows/company-os-cloud-deploy.yml) and select **Run workflow** on `main`.
6. The deployment checks the key format before touching Cloudflare, updates the Worker and stores the key in a private Cloudflare Worker Secret called `CHAIRMAN_DASHBOARD_KEY`.
7. Open the dashboard URL above, paste the same key, and press **Unlock**.

**Do not create a second Cloudflare application.** This updates the existing Kitwise Worker and preserves existing D1 research history.

## Security and limits

- The key is checked server-side. The page never receives D1 data without successful authentication.
- The key remains only in browser tab memory (not localStorage/cookies). Reloading/locking requires re-entering it.
- Keep the key and both Cloudflare credentials in your password manager; do not paste them in a support conversation.
- D1 records are private even though the UI shell and the /health route are publicly accessible.
- The manually triggered research cycle is limited to **one attempt per UTC day**, shared with the scheduled cron trigger.
- Manual triggers do not buy anything, list assets, or publish products.
- Hacker News discussion signals are not evidence of sales. Unverified AI summaries are presented as hypotheses.
- Failed/retry-limited runs must be inspected manually in v0.2. The dashboard does not erase or silently retry uncertain tasks.
- Access-key login is an initial security mechanism. A future version should adopt Cloudflare Access with individual identity and MFA.

## Troubleshooting

- "Chairman access is not yet configured": the `KITWISE_CHAIRMAN_KEY` GitHub secret wasn't deployed, or the secret is invalid.
- "Incorrect access key": the key entered doesn't match the deployed one.
- "No run recorded": cron may not have fired yet. With the dashboard unlocked, click **Run research now** and refresh afterward.
- "This cycle needs attention": open **Research intelligence** to inspect statuses; Cloudflare's D1 Console provides internal diagnostic records.
- The public /health endpoint only confirms that the Worker responds, not that AI research succeeded.

## Next company milestone

Add independent market-signal sources and real buyer/competitor validation, followed by a governed CEO decision engine, dedicated departments, and commercial sales connectors.
