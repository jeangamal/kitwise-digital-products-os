# Kitwise project status — 2026-11-16

## Working and verified

- Repository main inspected at c5a8f83b81bc338683ff6ec1da5faf3f03179d2a. GitHub repository write access and connected Cloudflare account access verified independently.
- Existing Worker kitwise-company-os has AI, D1, TAVILY_API_KEY and CHAIRMAN_DASHBOARD_KEY bindings. Secret values were neither retrieved nor changed. Cron is `17 7 * * *` UTC.
- Read-only D1 inspection confirmed 14 curated runs November 2–15, all needs_attention with ai_unavailable, retaining 3–6 documents each. November 2 recorded attempt 2; the others attempt 1. No historical rows modified.
- Bounded direct GLM diagnostic calls succeeded. A research-sized request reconstructed from the November 15 report and stored source excerpts (2,667 input tokens) consumed the entire 1,250-token completion budget in reasoning, returned no final content and finish_reason=length. The same request with `chat_template_kwargs: {enable_thinking:false}` returned finish_reason=stop, 2,771 final characters, 651 completion tokens. These are diagnostic API tests, not a completed scheduled production cycle. A preliminary request without excerpts reproduced the same truncation; a tiny OK test succeeded. No Tavily queries were issued by these probes.
- Repair keeps the model and completion budget, disables thinking, rejects truncated/empty final output, and stores sanitized ai_diagnostics in the existing private report JSON. Provider errors are classified only from structured HTTP status when available; unclassified SDK failures remain ai_unavailable. No raw provider messages or reasoning are persisted.
- Cloudflare tests: 30 passed, covering successful final output, thinking configuration, truncated and empty results, provider failures/redaction, evidence retention, bounded retry, concurrent duplicate claims and protected dashboard routes.

## Incomplete and access gaps

- Research repair PR #8 was merged as e212da5783d8122391c20059b41309d72909f708 and deployed with owner approval as Worker version 57a2395b-8577-43aa-a773-cbd9c550e03a. The owner-triggered November 16 cycle has since completed successfully; see production continuation below. Earlier pre-release statements describe historical work.
- The master instructions were unavailable during the initial repair. **Resolved later in this session:** both complete master instructions and Kitwise_Codex_Handover.md were attached and read. BUSINESS_CONTEXT.md now records the reconciled operating context and source hashes; originals remain session attachments.
- Browser access to the deployed dashboard has not been verified; unit tests establish local authentication behavior only.
- Product production, publishing, finance and verified buyer demand remain incomplete. No new commercial validation is claimed. R2/Workflows were not required or enabled for this repair; their prior audit status was not reverified.
- Uploader and encrypted receipts are outside this repair and unchanged; live marketplace connections remain separately configured/verified.

## Next priority

Complete the owner-authorized free-plan production pilot deployment/test described below, then resolve real image quality/upscaling and marketplace transfer configuration. Do not clear successful daily research claims to test production. Generation, review, transfer, portal submission and sales are separate outcomes. Production cannot be called fully autonomous sales until those integrations and their actual results are verified.

Additional regression check: Python suite ran 38 tests, 37 passed and one ExifTool integration test skipped because ExifTool is absent locally. Dependencies were installed in an isolated workspace virtual environment after the initial run found requests missing. Uploader source and receipt files remain unchanged.

## Continuation after business handover

- Rechecked GitHub: main remains c5a8f83…, PR #8 is open, and draft PR #7 remains open at 72526d0…. Read its decision module, tests and operating specification without merging it. Historical handover claims remain dated evidence, not fresh production verification.
- Completed the private diagnostic path: chairmanOverview now returns only allowlisted AI diagnostic fields; the dashboard explains successful, skipped, truncated, empty and provider-failure outcomes. Older reports remain readable with diagnostics unknown. No new schema or authentication mechanism.
- Corrected queued-trigger guidance and documentation to describe the actual initial-plus-one-failed-retry daily budget. A queued 202 does not establish a new accepted ledger claim.
- Cloudflare suite now passes **35 tests**, including execution of the shipped dashboard script against authenticated API output, legacy/malformed reports, diagnostic redaction and unauthorized access. Earlier 30-test result describes the initial repair only. No new live inference, Tavily query, D1 mutation, browser login, merge or deployment was performed in this continuation.
- Added BUSINESS_CONTEXT.md and the release/rollback checklist. Original attachments and private historical details were not published into the public repository.
- PR #7 adoption blocker: its netProfitPerHour currently counts only build_hours + support_hours; the master requires research, validation, QA, listing, monitoring and maintenance too. Factor references also accept any valid evidence ID rather than checking relevance to the scored dimension. Review these before wiring its outputs into any decision workflow. No actual portfolio inventory, earnings extract or total-time log is available, so commercial validation/profit remain unknown.

After approved live research verification, the next implementation priority is to repair and exercise the offline commercial decision contract with complete total-hour accounting and an authorized private input/export, preserving unknown values and independent publishing/spending approval.

## Production continuation — November 16

- Owner confirmed Workers Free and requested Cloudflare daily free-tier research → generation → upscaling → metadata/SEO → upload automation, plus a system test. This expands the authorized implementation/pilot scope, not spending or legal declarations.
- Read-only D1 verified the owner-triggered research succeeded: November 16, completed, 3 documents, final answer 1,914 characters, AI outcome ok/stop, no reasoning output. The daily research lock is expected protection, not exhausted AI neurons.
- Implemented a separate bounded production pilot, D1 quota/job migration 0006, private KV asset spool adapter, optional native Images ESRGAN adapter, image-based metadata/QA and authenticated artifact download. Automatic transfer/submission remain unconnected; records cannot falsely become published.
- Live separate model probes: FLUX produced a valid 1024×1024 JPEG; direct Gemma vision produced a structured title/description/20 keywords from that image (8.78 reported neurons). Meta vision returned agreement error; no terms or domicile declaration accepted, and the code uses Gemma instead. Full deployed-binding generation/upscale/transfer is not yet established by those separate probes.
- Production uses conservative local reservations and a three-preview backlog stop, daily reset/cooldowns, monthly transform reservations and capped durable asset capacity. Do not equate local reservation totals with measured global remaining Cloudflare credits.
- R2 is not enabled; a free-plan KV preview spool is the chosen small-pilot alternative. Images Free plan/support still needs separate confirmation/testing. GitHub Actions secret/variable metadata is inaccessible (403); do not infer actual contributor connection readiness.
- See CLOUDFLARE_PRODUCTION_PILOT.md for configuration, sources, limitations and tests. Commercial quality, exact high-volume search terms, production-grade upscaling and automated marketplace submission remain unverified.

Further verified facts: the owner separately confirmed Images Free. A private Workers KV namespace `kitwise-production-assets` was created under the existing account for a capped preview spool; no R2 or paid plan enabled. A manual existing-uploader readiness run (43785061464) reported all four uploader secrets missing: KITWISE_STATE_KEY, KITWISE_GOOGLE_CREDENTIALS, KITWISE_DRIVE_FOLDER_ID and KITWISE_TARGETS_JSON. Actual connection/transfer steps were skipped. This is an established configuration blocker, not a successful transfer or proof of invalid credentials. Configure these only through secure repository settings; never request their values in chat.

## Deployed free production pilot

- PR #10 merged at `4a0fe6ae4429a04918215813a5bdbe40469b6cbc` after all GitHub CI checks passed on reviewed head `3f542a6…`. 58 Cloudflare/Node tests pass; the SQL integration test runs four actual SQLite contention/rollback/quota cases.
- Deployed Worker version `c0ad34cf-0f76-4324-9cc5-3ae72e1cf5ff`, deployment `9c8f82c7-2aa0-4b4f-aa93-7ea63359e184`, 100% traffic, 2026-11-16 01:24:50 UTC. Previous version `57a2395b-8577-43aa-a773-cbd9c550e03a` remains the code rollback point; do not drop new pilot tables or change secrets on rollback.
- Applied additive migration `0006_production_pilot.sql` once to the existing D1 DB and recorded it in d1_migrations. The 15 research rows remain intact. No research claim resets, receipt changes or private exports.
- Bound private KV spool `kitwise-production-assets` and Images to the same Worker. Owner confirmed Workers Free and Images Free; pilot flags reflect those confirmations and the successful Gemma probe. R2 and paid upgrades remain disabled. Existing Chairman and Tavily secret bindings preserved without retrieving values.
- Original daily research cron remains `17 7 * * *`. Independent production cron `*/15 * * * *` was installed at 01:25:15 UTC. Cron propagation can delay first execution; empty job tables do not establish failure. Production requires successful current-day research and is bounded by quota/backlog/storage gates.
- Manual authenticated acceptance-check workflow 43786170241 could not pass the first edge request: unauthenticated /api/overview returned HTTP 403 instead of the expected Worker-level 401. No generation was invoked by that workflow. This is an edge-access blocker, not a failed model test or a reason to change auth. The browser owner can use the authenticated production-test button; otherwise inspect scheduled execution in D1.
- Separate live model tests verified generation and actual-image captioning. Native Worker production/upscale execution is still pending observation at this record. Marketplace transfer remains blocked by the four missing uploader secrets, and final portal submission remains distinct.

## First scheduled native pilot result and quality correction

- The quarter-hour cron executed without the laptop at 01:45:13–01:45:27 UTC on November 16. Job 9c47eeb2… completed its technical generation/storage/upscale/caption chain in approximately 14 seconds: original 1024×1024 JPEG (283,997 bytes), final 2048×2048 JPEG (443,411 bytes), both retained privately. One monthly image transformation reservation was recorded. The final file was retrieved through the authenticated account API and visually inspected. This establishes an integrated native-binding technical run, not a saleable image or proof of buyer demand.
- Quality inspection found an unrequested readable “Good Grain” sticker and uncertain botanical/food identification. The original automated reviewer had incorrectly returned visual_pass=true. The job remains needs_review, effective visual_pass=false with recorded inspection reasons. No transfer or publication occurred.
- Reworked the vision contract to require explicit text/brand/people/geometry/matching/uncertainty fields. Deterministic validation now overrides a model pass whenever forbidden visible content or uncertainty is recorded; missing flags fail closed. Generation receives fixed no-writing/no-overlay constraints, and the selected source IDs/actual generation brief are preserved privately for future diagnosis.
- A real Gemma recheck of the SAME enlarged image with the stricter contract returned visual_pass=false, detected the Good Grain writing/graphic, flagged concept mismatch and unknown seed/red-object identities; reported 12.41 neurons. Updated the draft to conservative wording and retained the prior caption/inspection record. This corrects a demonstrated false positive; it does not establish perfect automated QA.
- Local suite now passes 63 tests, including the actual false-positive scenario and strict missing-field behavior. Ongoing generation is still a bounded preview pilot, stops at three unresolved previews, and cannot upload held assets. Contributor configuration is still missing. No paid resources, model terms or permission expansion were introduced.
