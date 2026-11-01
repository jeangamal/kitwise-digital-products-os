# Kitwise Microstock Market Intelligence — v0.3

## Why this replaces the generic research pilot

The original pilot searched Hacker News for topics such as invoices and job-search tools. Those discussion headlines do not answer Kitwise's operating research question. The new department researches what stock-image buyers are searching for, what the available library looks like, and how early Kitwise should prepare upcoming seasons.

**Primary business:** commercial microstock visuals, especially high-quality creator-owned 3D renders, clean isolated PNG/JPG images, illustrations, frames, editable-useful design packs and seasonal components.

**Platforms to evaluate:** Shutterstock, Adobe Stock and Dreamstime for stock; Creative Market/Etsy for optional separately validated bundles. This is a research priority, not a permanent rejection of nonvisual digital products.

## Live data and epistemic limits

- Automated **source currently wired:** the public, unauthenticated [Shutterstock Trends page](https://www.shutterstock.com/trends), once per UTC day.
- Capture exact observed `keyword`, `Results`, `Demand`, and `Growth` with the observation day. Results are a count of matching library records, not exact competing commercial 3D assets. Demand is the source's qualitative label; growth is relative search change, not orders.
- **Unwired:** approved Shutterstock API search results, Adobe Stock Enterprise/approved Stock API, Dreamstime sales/listing data, verified product-level marketplace orders, real stock contributor analytics. We never claim their numbers without a verified connection.
- The platform may block automated access or change HTML markup. In that case mark the run `needs_attention`, save no invented keyword metrics, and allow further adapter development. Do not circumvent access restrictions.
- The deterministic **triage index** is only a transparent preliminary ordering, not a market-demand score, expected revenue, or authorization to build. Do not infer product-market fit from search popularity alone.

## Seasonal production planning

- Calculate upcoming holidays for a rolling six-month horizon.
- Annual fixed dates and verified 2027 specific lunar dates are supported. Ramadan and Eid dates are **tentative** until local official confirmation.
- Suggest upload by 75 days before the occasion as a planning heuristic. Adobe Stock's general stock-video guidance suggests publishing 2–3 months before major holidays; rendered images may have different production lead times, but early submission still matters.
- Prefer working ahead on the next season over creating a large new collection just before an event.

## Required executive output

1. **Market facts**: observed keyword(s), qualitative demand, growth and matching-result count with exact source.
2. **Upcoming buying seasons**: occasion, event date, ideal asset upload date, whether the window is still open.
3. **Specific asset packs**: buyer scenario, functional asset components, intended output format, differentiation and source-backed rationale.
4. **Reject/defer**: overlate concepts, weak observations, IP conflicts, obvious generic commodities.
5. **Evidence gaps**: missing exact competitor quality, current buyer purchases/downloads, 3D-specific supply, production cost, licensing fit. Recommend the next concrete validation step.

A source with all `Low` demand values may yield **zero** justified build proposals. This is preferable to inventing profitable niches.

## Submission constraints

- Shutterstock currently does **not** accept AI-generated content submitted by contributors. Separate original manually modeled/rendered 3D assets from AI-generated deliverables by accurate documented provenance.
- Adobe Stock can accept eligible generative AI contributions when properly labeled and compliant with licensing and originality rules.
- Avoid copyrighted characters, third-party logos, editorial subjects and trivial duplicate variations.
- Never auto-publish from the research result. Production and marketplace authorization remain governed by the Chairman.

## Deployment and data separation

- Existing `research_runs` and `research_evidence` records remain unchanged as historical v0.2 pilot data.
- New migration `0002_market_intelligence.sql` creates `market_research_runs` and `market_research_signals` with independent daily idempotency. The dashboard reads the new data only.
- Existing private Chairman key and Cloudflare credentials remain unchanged.
- Apply migrations and deploy through the **existing GitHub manual Cloudflare workflow** after merge. The existing stock-transfer worker is untouched.
- Verify the first live run: nonzero observed microstock metrics; correctly labeled source; seasons; AI brief specific to stock assets; no generic SaaS recommendations. If trends fail to load, do not call the run successful.

## Official references

- Shutterstock Trends: https://www.shutterstock.com/trends
- Shutterstock contributor research explanation: https://submit.shutterstock.com/help/en/articles/10594691-what-type-of-content-are-shutterstock-customers-looking-for
- Shutterstock contributor content briefs: https://www.shutterstock.com/explore/contributor-content-briefs
- Shutterstock AI submissions policy: https://submit.shutterstock.com/help/en/articles/10594622-content-policy-updates-ai-generated-content
- Adobe seasonal production guidance: https://stock.adobe.com/pages/artisthub/learn/how-to/boost-the-value-of-your-video-portfolio-with-careful-content-planning
- Adobe AI submission guidelines: https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html
