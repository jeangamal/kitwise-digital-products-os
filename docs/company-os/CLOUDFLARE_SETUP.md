# Kitwise — Cloudflare deployment setup (free pilot)

**Goal:** One genuinely unattended scheduled research cycle, with durable results in Cloudflare D1, one Workers AI interpretation per day, no paid hosting and no extra AI API key. This is the **first pilot**, not the full AI company.

**Connection requirement:** Creating a Cloudflare account does not connect it to ChatGPT or GitHub automatically. The official Cloudflare API token stays in GitHub Actions secrets, never in chat or repository files.

## Chairman setup (one time)

1. Verify your new Cloudflare account email. In the Cloudflare dashboard find the **Account ID** for the account you're using.
2. In Cloudflare **API Tokens**, create a token with only the selected Kitwise account as resource. Grant permissions needed for **Workers Scripts: Edit** and **D1: Edit** (Cloudflare may show equivalent wording). Do not grant global all-account permissions. Do not disclose the token in chat.
3. Open **GitHub → jeangamal/kitwise-digital-products-os → Settings → Secrets and variables → Actions → New repository secret**. Save two repository secrets:
   - `CLOUDFLARE_ACCOUNT_ID` = your Cloudflare account ID
   - `CLOUDFLARE_API_TOKEN` = your restricted API token.
4. Once this change has been reviewed and merged into `main`, open GitHub **Actions → Deploy Kitwise Company OS to Cloudflare (manual) → Run workflow**. You do **not** need to create a separate D1 database yourself; the workflow checks for `kitwise-company-os` and creates it if absent.
5. In Cloudflare, open **Workers & Pages**. Find `kitwise-company-os` and its `workers.dev` link, then open `/health`. To see the private report, use **D1 → kitwise-company-os → Console** and execute:
   ```sql
   SELECT day, status, evidence_count, error_code, report_json
   FROM research_runs ORDER BY day DESC LIMIT 3;
   ```
   The daily Cron Trigger runs at **07:17 UTC**, approximately 09:17 in Cairo during winter. Cloudflare cron activation can be delayed; do not infer failure from minutes of propagation delay.

## Protection

- The deployment workflow runs only when you manually select it. It is not triggered by pull requests.
- It keeps Cloudflare credentials only in GitHub Actions secrets; research and commentary remain inside your own D1 account.
- The company doesn't publish, transfer stock, spend money, create paid resources, approve products, or expose private research over the public Worker URL.
- Workers AI free use is quota-limited and can fail temporarily. The model selected for this proof-of-concept is `@cf/zai-org/glm-4.7-flash`. One market-research AI invocation per UTC day maximum.
- The v0.3 market-research source is Shutterstock's public trend page. Observed keyword, qualitative demand, growth and matching-library results are **not** actual orders or a validated stock buyer-demand gap. Historical v0.2 Hacker News pilot rows are preserved separately.
- If no credible sources are available or AI fails, the run is marked `needs_attention` rather than pretending it completed.
- If more than one code contributor uses the same Cloudflare account, keep the account token restricted and rotate it if exposed.
- The new Chairman Dashboard at `/dashboard` offers protected read-only D1 reporting and a bounded manual research trigger. Without an independently generated 64-character secret installed as a Cloudflare Worker secret, its `/api/*` endpoints fail closed. See [Chairman Dashboard setup](CHAIRMAN_DASHBOARD.md).

## Follow-on implementation

After a verified live v0.3 run: add other marketplaces via authorized sources, compare exact market competitor formats and sales evidence, and enhance the existing private Chairman dashboard with approval gates and production operations. Review free-usage statistics before increasing research cadence.

## Research AI failure diagnosis (November 2026 repair)

GLM-4.7-Flash can exhaust the bounded completion budget on reasoning before
producing final content. The repair sets `chat_template_kwargs.enable_thinking`
to `false`, keeps `max_completion_tokens: 1250`, and never treats
`reasoning_content` as a report. It rejects `finish_reason: length` even when a
partial final answer exists. See [current verification and blockers](PROJECT_STATUS.md).

Current research uses `curated_research_runs` and `curated_research_sources`.
Older research/market/indexed ledgers are preserved historical modules. Inspect
private diagnostics using the D1 Console:

```sql
SELECT day, status, document_count, error_code,
       json_extract(report_json, '$.ai_diagnostics') AS ai_diagnostics
FROM curated_research_runs ORDER BY day DESC LIMIT 5;
```

Diagnostics contain only fixed outcome codes, an allowlisted finish reason,
final-text/reasoning presence flags and a validated HTTP status where available.
`ai_output_truncated` means the model hit its output limit; `ai_empty_response`
means no usable final text. Structured 401/403, 429 and 5xx errors are classified
as auth, quota/rate-limit and provider failures; other SDK exceptions remain
`ai_unavailable`. Raw errors and reasoning are never stored. Missing or
insufficient source evidence skips AI and records `not_attempted`.

The existing ledger permits one initial attempt plus **one retry after failure**
per UTC day, shared by manual and cron triggers. Running/completed claims and a
second failed attempt block further execution. Never clear a claim or erase
history to force a run. This supersedes older wording claiming only one attempt.
No migration, secret rotation, new service or quota increase is needed for the
repair. Production deployment requires Chairman approval under the Charter;
a direct API inference test is not verification of a deployed scheduled cycle.
