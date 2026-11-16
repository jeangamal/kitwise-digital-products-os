# Chairman Dashboard v0.2 — Private, Cloud-hosted

This dashboard is part of the existing Cloudflare Worker at:

https://kitwise-company-os.jean-gamal.workers.dev/dashboard

## What you can actually see

- Recent daily Research Agent runs and their verified statuses.
- Evidence links to retained official Adobe/Shutterstock editorial pages (qualitative guidance, not sales).
- The latest AI interpretation, **explicitly unverified as buyer demand**.
- Departments that are implemented, partially implemented or merely planned.
- A protected "Run research now" control sharing the daily claim/retry budget with cron.
- AI analysis outcome and sanitized diagnostics on the repair branch. These become available in the live dashboard only after approved deployment; older reports show diagnostics as unknown.
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
- Manual and scheduled research share **one initial attempt and one retry after failure per UTC day**. Running/completed claims and an exhausted retry block another run. A queued request does not guarantee a new claim.
- Manual triggers do not buy anything, list assets, or publish products.
- Microstock search signals are not evidence of sales. Unverified AI summaries are presented as hypotheses. Historical Hacker News pilot data remains archived separately.
- Failed/retry-limited runs must be inspected manually in v0.2. The dashboard does not erase or silently retry uncertain tasks.
- Access-key login is an initial security mechanism. A future version should adopt Cloudflare Access with individual identity and MFA.

## Troubleshooting

- "Chairman access is not yet configured": the `KITWISE_CHAIRMAN_KEY` GitHub secret wasn't deployed, or the secret is invalid.
- "Incorrect access key": the key entered doesn't match the deployed one.
- "No run recorded": cron may not have fired yet. With the dashboard unlocked, click **Run research now** and refresh afterward.
- "This cycle needs attention": inspect **Analysis diagnostics** under the AI research brief after the repair is deployed. Output-limit failures, empty answers, access/rate-limit/service failures and skipped analysis have distinct messages. Raw provider errors, prompts and reasoning are never displayed. Private D1 retains the same safe diagnostic fields.
- "No AI diagnostics recorded": a historical report may predate the repair. Its original error code remains unchanged; this message does not establish why it failed.
- The public /health endpoint only confirms that the Worker responds, not that AI research succeeded.

## Next company milestone

Verify the approved research release using [the release checklist](RESEARCH_RELEASE_CHECKLIST.md), then pair research with actual inventory, buyer/competitor validation and complete time/cost inputs. Draft commercial-engine work is not a live sales integration. See [business context](BUSINESS_CONTEXT.md) and [current status](PROJECT_STATUS.md).
