# Kitwise Microstock Research Quality Gate v0.6

## Why the November 2 v0.5 report is not commercially actionable

The Tavily connector worked, but the reported articles included an Adobe MAX conference page, 2022/2023 trend articles, generic image-listing pages, a discount landing page and unrelated Creative Cloud asset-sharing documentation. Being on an Adobe or Shutterstock domain **does not** imply buyer-demand evidence.

## New deterministic source-acceptance policy

Only accept index excerpts matching **both**:
1. A specifically relevant official editorial section, e.g. Shutterstock Contributor help/briefs, Adobe Stock Artist Hub, or dated Adobe Blog creative-trend articles.
2. Specific content around stock-asset needs, design components, seasonal contributor briefs, commercial insights or genuinely timely creative-trend analysis.

Reject stale trend articles (years before the previous calendar year), general stock search/catalog pages, conference promotions, discount pages, irrelevant product help pages and all third-party sites. The filter is deterministic, applied **before the LLM**, and stores rejection reasons/counts without exposing publisher-protected full content.

New targeted searches, limited to **four basic Tavily requests per UTC day**, prioritize:
- Shutterstock's customer-demand/contributor shot list explanations
- Adobe's "Call for Content: Creative Components" (useful design elements, borders, paper, stickers, isolated elements)
- Adobe's current-year creative trends with relevance to 3D and buyer workflows
- Planning content for upcoming seasonal stock submissions

**Important:** A good indexed editorial article is **qualitative** buyer-need guidance, not verified numeric demand or a direct measure of marketplace competition. The model must return low-confidence practical stock-asset experiments, or an explicit no-go if too little source evidence exists. It cannot approve 100 assets for automatic publication based on an attractive stock search page.

## Quality policy

- If no source passes the quality gate: status `needs_attention`, reason `all_indexed_results_failed_relevance_gate` (when irrelevant search hits exist). **Do not call AI.**
- If only one distinct relevant source passes: status `needs_attention`, reason `insufficient_relevant_market_sources`. **Do not call AI.**
- If at least two relevant sources pass: optionally generate an AI brief grounded in the source IDs, with a maximum of two trial asset packs and explicit unverified-demand caveats.
- Dates extracted from titles/URLs are not asserted to be independently confirmed publication dates.
- All rejects, source counts and quality gate status are visible in the Chairman Dashboard. No unknown financial field becomes zero.
- Research run is independent from the historical v0.5 ledger. The first v0.6 run can execute on the same UTC day without overwriting earlier findings. Daily one-run and one retry limits remain.
- Existing Cloudflare, Tavily and Chairman secrets do not change.

## Acceptance test for the next live run

Expect to see **Curated Official Publisher Evidence**, a nonzero number of rejected irrelevant pages and (if relevant official guidance exists) a brief about production-ready stock assets with evidence IDs. No conference, coupon, 2022 trends, stock catalog listing, SaaS suggestion, or unsupported claims of sales. The conclusion may be "No validated commercial niche found" until actual contributor performance or licensed marketplace metrics are connected.

## Next missing department: True Commercial Validation

A future Market Validation agent must join: (i) source-backed buyer interest, (ii) competing listing *quality and exact asset types*, (iii) real earnings/download history from authorized accounts, and (iv) per-pack production time and royalty yield. These observations—not an LLM's confidence—should determine production priorities and self-scaling.
