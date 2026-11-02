# Kitwise Indexed Microstock Intelligence v0.5

## Root cause (November 2, 2026)

The first Shutterstock microstock collector returned **HTTP 403** for both the public Trends webpage and Contributor Briefs webpage when called by the Cloudflare Worker. This is not a parsing issue: the origin explicitly denied the requests. We should **not** work around those access restrictions with proxies, disguised browser clients, cookies, or alternate datacenter IP addresses.

## Replacement architecture

- Keep **Cloudflare Workers + D1 + Workers AI + private Chairman Dashboard**.
- Use an **authorized web-search API**, Tavily, to retrieve snippets and original links to publicly indexed material published by Shutterstock and Adobe Stock.
- Tavily runs at most **four basic searches per scheduled day**. A single failed-run retry may double that to eight for a day. No paid tier is required to begin. Tavily offers a free 1,000-credit monthly plan without a credit card as of November 2026; usage and availability can change.
- No authenticated Shutterstock contributor pages, restricted content, private sales information, or inaccessible pages are fetched.
- Use search-engine snippets only as qualitative **public editorial evidence**. Do not interpret Tavily relevance as buyer demand, actual stock sales, or exact competing listings.
- The AI model remains `@cf/zai-org/glm-4.7-flash` on the Cloudflare Workers AI binding. It generates evidence-linked microstock production hypotheses from the indexed findings and the upcoming buying-season calendar.
- If no indexed public marketplace evidence is found, the model is **not** asked to invent product opportunities. The dashboard explains which connection is missing.
- Existing v0.3/v0.4 blocked-source run history and earlier pilot data remain preserved; v0.5 uses separate `indexed_research_runs` and `indexed_research_sources` tables to start a fresh cycle without today's old failed run blocking it.

## One-time setup (Chairman)

1. Sign up at <https://app.tavily.com/> using **Researcher / Free** (no credit card).
2. Copy your Tavily API key from the Tavily dashboard. Keep the API key **secret**. Do not send it in ChatGPT messages, screenshots, or GitHub source files.
3. Go to your [Kitwise GitHub Actions secrets](https://github.com/jeangamal/kitwise-digital-products-os/settings/secrets/actions) and click **New repository secret**.
   - **Name:** `KITWISE_TAVILY_API_KEY`
   - **Value:** paste your private Tavily API key
4. Keep existing `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `KITWISE_CHAIRMAN_KEY` unchanged.
5. Manually start the existing [Deploy Kitwise Company OS to Cloudflare workflow](https://github.com/jeangamal/kitwise-digital-products-os/actions/workflows/company-os-cloud-deploy.yml) on `main`.
6. The deployment will install the Tavily key as an encrypted Cloudflare Worker secret named `TAVILY_API_KEY`. It never appears in the public web app or your repository.
7. Open the [Chairman Dashboard](https://kitwise-company-os.jean-gamal.workers.dev/dashboard). Unlock it with the existing independent 64-character Chairman key; this key is **not** the Tavily API key.
8. Click **Run research / retry failed cycle**. In v0.5 this is a fresh, separately tracked research engine. Review source links, timestamps and the generated evidence-qualified production brief.

## Research report acceptance criteria

The first truly successful v0.5 run must show:
- A nonzero count of publicly indexed official marketplace source documents;
- Verified source links belonging to Shutterstock/Adobe domains;
- A clear statement that results are indexed editorial evidence **not stock sales figures**;
- AI output containing at most three differentiated 3D-stock-asset **test hypotheses**, each grounded in supplied source IDs and accurate seasonal timing;
- No general SaaS/finance-app opportunities, fabricated download metrics or false "market gap" assurances;
- Status and error diagnostics visible to the Chairman.

A successful worker deployment or a healthy /health endpoint alone does not establish that market intelligence succeeded.

## Further commercial data needed

The company will still need licensed/approved commercial market data, curated competitor snapshots, downstream contributor performance (where permitted) and measured A/B launch results to calculate real return on production cost and identify verified supply-demand gaps. Shutterstock's free API searches the **free media collection only**, which is not representative of full commercial supply. Adobe Stock API approval restrictions exclude Contributor API use cases.

## Reference links

- Tavily plans: https://www.tavily.com/pricing
- Tavily API: https://help.tavily.com/articles/4840311948-tavily-search-api
- Shutterstock API: https://api-reference.shutterstock.com/
- Adobe Stock APIs: https://developer.adobe.com/stock/docs/getting-started/
