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
- Workers AI free use is quota-limited and can fail temporarily. The model selected for this proof-of-concept is `@cf/zai-org/glm-4.7-flash`. One AI invocation per UTC day maximum.
- The source is Hacker News Algolia *headlines*, used as **weak discussion signals only**, never sales, demand, or purchasing evidence. The report explicitly lists missing validation data.
- If no credible sources are available or AI fails, the run is marked `needs_attention` rather than pretending it completed.
- If more than one code contributor uses the same Cloudflare account, keep the account token restricted and rotate it if exposed.
- This pilot does not expose private chairman dashboard routes; access results through your authenticated Cloudflare D1 console.

## Follow-on implementation

After one verified live run: add independent marketplaces, carefully validated market indicators, human approval workflow, private Chairman dashboard and explicit operational scaling limits. Review free-usage statistics before increasing research cadence.
