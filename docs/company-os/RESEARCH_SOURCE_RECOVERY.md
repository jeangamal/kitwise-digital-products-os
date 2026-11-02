# Kitwise Microstock Research Source Recovery v0.4

## Failure observed on November 2, 2026

The deployed v0.3 Research Agent correctly recorded `needs_attention` and **zero observed search terms**. The error `shutterstock_trends_unavailable_or_changed` combined multiple unrelated causes: an HTTP restriction, network failure, changed markup, or invalid data. It was not evidence that the Cloudflare Worker or D1 storage were offline.

The [Shutterstock public Trends page](https://www.shutterstock.com/trends) displays real `Results`, `Demand`, and `Growth` fields. The earlier parser incorrectly expected these fields to appear inside the same HTML link element and failed to try its text-level fallback when any links existed.

## Improvements

- Parse individual link rows **and** the visible text of the page if fields are in adjacent markup elements. Never parse unsanitized scripts for hidden data.
- Retry the official Shutterstock public [Contributor Content Briefs](https://www.shutterstock.com/explore/contributor-content-briefs) page **independently** as a second source. It contains editorial directions like winter, love, Lunar New Year and Eid, not numerical proof of purchases.
- Preserve direct source URLs, and report named stages such as `trends_http_403`, `trends_rows_not_found`, `briefs_http_403`. No raw exceptions, credentials, or HTML are exposed.
- If the trends page is blocked but brief themes are readable, the AI may provide **cautious** seasonal asset-pack test concepts. The cycle stays `needs_attention` and reports zero numerical trends; it must never invent search volumes or claim validated market gaps.
- If both sources are inaccessible, no AI speculation runs and the report records `all_market_sources_unavailable`.
- Allow at most **one additional execution per UTC day**, only following a `needs_attention` result; guarded by D1 conditional update. Existing successful runs cannot be restarted.
- Keep company research, protected Dashboard access and asset publishing permissions unchanged.

## How to verify

After a successful manual deployment of this code, open the Chairman Dashboard. The Research card now includes source-specific diagnostics. If the latest cycle needs attention and has not already used its retry, the manual button is available to run once more.

The source cards identify data provenance: quantitative keyword metrics only when actual public Trends data was read; official Contributor Briefs separately labeled qualitative. The AI interpretation remains a hypothesis rather than an approval to create 100 assets.

A truly autonomous production-grade Market Intelligence Department still needs official or licensed, permitted multi-marketplace data access and independent customer/download validation. This patch improves **fault tolerance and honesty**, not guaranteed access to a third-party website.
