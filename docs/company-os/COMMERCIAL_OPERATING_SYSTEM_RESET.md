# Kitwise Commercial Operating System — reset specification (2026-11-02)

**Status:** design contract and independently tested decision gate; **NOT** a live, revenue-producing autonomous company. Do not deploy this as a new Research Agent or claim product validation from passing code tests.

## 1. What company are we building?

The master project instructions describe a **niche-flexible, globally sellable digital-products business**, separate from client and employment work. Its objective is leveraged second income, not the largest number of AI employees, stock listings, downloads or dashboard cards.

**Commercial North Star: Net profit per TOTAL hour invested.** Include production, marketplace preparation, quality control, customer support and monitoring hours.

The current first operating vertical is **microstock/3D design assets** because existing Kitwise production capability and portfolio work are in that category. This is a temporary testing focus, **not** a permanent prohibition on higher-value calculators, guides, databases, templates, automations or SaaS if they genuinely win the evidence-based opportunity comparison.

Business parameters from the project charter:
- Research first. Allocate roughly 5–7 founder hours/week while still early.
- Initial six-month spend ceiling $1,000–$1,500, **not** a required spend; no unapproved subscriptions or advertising.
- Portfolio planning target: 60% evergreen, 25% growth, 15% experimental, adjusted based on results rather than forced listing counts.
- Default international market unless strong local differentiation is demonstrated.
- Broad pipeline: IDEA → RESEARCH → VALIDATION → APPROVED → MVP → TESTING → LAUNCHED → OPTIMIZING → SCALING → MAINTENANCE → RETIRED.
- User is **Chairman**. The AI cannot approve spending, release assets, publish product listings, change prices at scale or grow production headcount without the Chairman's scoped authorization.

## 2. What each AI employee must deliver

| Agent/role | Inputs | Measurable output | Pass/fail contract |
|---|---|---|---|
| Market Scout | Upcoming seasons, public marketplace/editorial signals, creator/buyer discussions | 5–10 raw candidate hypotheses with source IDs | A headline or trend article is NOT demand |
| Market Validator | Candidate, actual comparable listings, buyer problems, price evidence, contributor earnings when authorized | Competitor comparison, missing-data list, provenance and evidence confidence | Cannot convert a catalog search result into sales |
| Commercial Analyst / CFO | Production hours, royalty/price, actual sales, refunds, fees, support time | Real net profit/hour; profit assumptions separately | Blank is unknown, not zero |
| Product Manager | Validated opportunity, designer use case, build budget, differentiator | One small production-ready brief with QA checklist | Cannot launch mass batches before evidence |
| Creative Production | Approved brief, licensed/original production assets | Quality-reviewed native creative work and final deliverables | No fake provenance, no copyrighted derivatives |
| Distribution & SEO | Approved content and platform policy, real titles/keywords, submission pathways | Ready-to-submit packages and status receipts | Transfer ≠ submission ≠ acceptance ≠ sale |
| Performance Analyst | Authorized platform reporting & owned sales analytics | Revenue, asset age, downloads, conversion proxies, returns, royalty/hour | Actual metrics only, with source and date |
| CEO / Chief of Staff | Each agent's signed deliverables, constraints and risks | One prioritized decision memo and task assignment | It can *recommend* but the Chairman approves spending, full production, publishing and scaling |

Agents are operational roles, not eight simultaneous expensive models. A deterministic workflow or simple software can own most stages; use LLMs only where judgment/synthesis is necessary.

## 3. Commercial research contract (NOT an article feed)

Every potential product must answer:

1. **Buyer** — who actually designs with it or pays for it?
2. **Paid problem** — what specific task, time or money does it save?
3. **Demand** — independent buyer/search evidence, and what it *doesn't* prove.
4. **Spend evidence** — real confirmed transactions or tested sales. Competitor asking prices and review counts are separate proxies.
5. **Competing supply** — specific comparable *formats*, quality, prices, shortcomings, and differentiation. No claim of exact market supply from generic query counts.
6. **Product** — smallest coherent customer-useful MVP; file format, contents, licensing and QA.
7. **Economics** — actual royalties or paid-test net revenue, costs, platform fees, production/support hours, and net profit per hour.
8. **Timing** — seasonal event and submission target, with a realistic production and review buffer, or an evergreen rationale.
9. **Rights/compliance** — original vs AI-generated provenance, permitted marketplace and applicable label/rights policy.
10. **Verdict** — KILL / WATCH / VALIDATE / BUILD CANDIDATE / SCALE, with documented reasons, missing evidence and Chairman approval step.

Each evidence record needs an identifier, observation date, source reference and evidence type. Raw articles without commercial relevance cannot move an opportunity to production. Opinions cannot masquerade as paid demand.

## 4. The required 100-point score

Copy the exact charter weights:

| Factor | Maximum |
|---|---:|
| Demand | 20 |
| Willingness to pay | 20 |
| Competition / market gap | 15 |
| Problem intensity | 15 |
| Differentiation | 10 |
| Build speed | 10 |
| Low maintenance / automation | 5 |
| Upsell / expansion | 5 |
| **Total** | **100** |

A complete score must identify evidence for **all eight** factor ratings. **No numeric score** is published before paid demand and concrete comparable competitor evidence exist, rather than faking an 80/100 based on publisher articles.

80+ is a **strong build candidate**, not an authorization to auto-produce. 70–79 means validate first, 60–69 watchlist, below 60 discard or rethink. Scarce paid evidence can support a tiny, separately approved test without claiming a fully verified opportunity.

## 5. Decision gates and governance

**Gate A — Discover**: The system can collect source-linked hypotheses and season calendars automatically. It cannot call editorial content revenue evidence.

**Gate B — Validate**: Compare specific products, verify asking prices, record the buyer use case and estimated build time. Any missing sales evidence remains an open question. Where appropriate, request Chairman approval for a small low-cost MVP experiment.

**Gate C — Approve production**: Require compliant provenance, buyer/competitor/paid evidence, sourced score and measured or tightly bounded economics. No 50/100-asset batch on a weak article.

**Gate D — Publish**: Verify actual marketplaces, AI-origin policies, release rights, title and keywords, image QA; explicitly distinguish uploaded, pending review, approved and live. Publishing is an authorized irreversible action.

**Gate E — Scale / retire**: Only real sales, royalty yield, contribution margin, maintenance hours, customer response and profit/hour can justify multiplying volume. Consider new bundle formats or other digital-product verticals if microstock stops winning.

## 6. Evidence sources and real integration strategy

**Available but weak:** Shutterstock public trends (search-demand label/growth/catalog matches; not sales), contributor shot lists, Adobe Stock Artist Hub, Google Trends (relative public interest). Do not scrape a service after it responds HTTP 403 to the Cloudflare Worker. Tavily's indexed publisher excerpts are qualitative editorial clues, not marketplace sales.

**Primary missing commercial inputs:**
- Adobe Stock Contributor portal **Insights** and earnings/performance reports, to be accessed only through user-approved export/connection;
- Shutterstock Contributor **Earnings summary → By product** to inspect royalties/downloads by asset, through an authorized reporting/export pathway;
- any existing Dreamstime or Etsy portfolio sales reports;
- exact competing product pages and visible prices, labeled as listing evidence (not confirmed competitor transactions);
- logged production time and costs per batch.

Adobe explicitly states that it does not offer a public **Stock Contributors API** for contributor sales or uploads. Do not promise an unavailable automatic sales connection. If account exports aren't available as a supported connector, use an owner-approved CSV/file ingestion flow; avoid storing credentials or source reports in public GitHub.

Sources:
- Adobe contributor portal and Insights: https://helpx.adobe.com/stock/contributor/get-started/manage-your-account/adobe-stock-contributor-overview.html
- Adobe Stock API FAQ (no Contributor sales API): https://developer.adobe.com/stock/docs/faq/
- Shutterstock contributor earnings by product: https://submit.shutterstock.com/help/en/articles/10594609-how-much-will-i-earn-per-download
- Shutterstock search signals: https://www.shutterstock.com/trends
- Adobe design-component content needs: https://stock.adobe.com/pages/artisthub/get-inspired/design-assets-content-needs

## 7. The first real business proof, before another deployment

Complete a **single real commercial decision** from an actual asset family already produced, preferably a modular original 3D element set. It must produce:
- one source-cited buyer problem and a comparison of *at least three concrete competing items* (when accessible);
- current marketplace price observations and qualitative gaps, without pretending to know competitor sales;
- small usable MVP contents and production time;
- a small controlled listing/sales-validation experiment if actual buyer payments are unverified;
- one explicit Chairman decision with no fabricated score, download totals or earnings;
- a plan for collecting real first-party sales and profit/hour.

**Acceptance test:** Would the report allow the Chairman to make a sensible **BUILD / VALIDATE / WATCH / KILL** decision in under five minutes? If the answer is no, the Research Agent is not done. A green GitHub check or five official articles do not count as progress toward that milestone.

## 8. Implementation boundary

This PR adds a pure, tested commercial-decision module at `cloudflare/src/commercial-decisions.mjs` but intentionally does **not** wire it into the production daily research agent or change the live dashboard. That would repeat the same mistake of shipping a technically working but commercially unproven change.

Next software milestone: use one source-backed opportunity input and an **owner-authorized** performance data extract to run this decision module; revise the contract based on those real findings; only then connect it to the Chairman Dashboard.
