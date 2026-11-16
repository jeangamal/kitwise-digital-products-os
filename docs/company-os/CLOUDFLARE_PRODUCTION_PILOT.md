# Cloudflare production pilot — bounded previews, not autonomous marketplace sales

## Live research result

The owner's November 16 research completed at 00:42:50 UTC with three sources, 1,914 final characters, no error and `ai_diagnostics.outcome=ok`. The successful daily claim blocks another research run; this is unrelated to account-wide AI credit exhaustion. Historical failed runs remain intact.

## Verified provider constraints (November 16, 2026)

- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/): 10,000 shared neurons/day, reset 00:00 UTC. Workers Free hard-stops further AI use; Paid can bill overages. Owner explicitly confirmed Workers Free; billing API access is unavailable to this OAuth connection. No paid fallback/upgrade is allowed.
- [FLUX.1 schnell schema](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/): prompt and steps; the retrieved live schema rejects extra properties. No invented width/height/seed fields. Live 4-step smoke test returned a valid 1024×1024 JPEG, 257,544 bytes. This is 1.05MP, below Adobe photo minimum, and the image did not meet all requested shape/angle properties. It is a test, not a sale-ready product.
- [Workers KV pricing](https://developers.cloudflare.com/kv/platform/pricing/): Free includes 1GB storage, 1,000 writes/day and hard quota stops. A dedicated private preview spool avoids R2/card signup; D1 retains transactional job claims. KV reads can lag writes; allow propagation before downloading. No images in public git, KV public namespace routes, or public Worker responses.
- R2 listing returned "enable R2 through the dashboard". No R2 subscription or bucket was created. Cloudflare Images storage is not required.
- [Images pricing](https://developers.cloudflare.com/images/pricing/) describes a separate Free plan with 5,000 unique transformations/month and no overage billing on Free. [Optimization features](https://developers.cloudflare.com/images/optimization/features/#upscale) document ESRGAN via `upscale=generate`, distinct from bicubic interpolation. Optional binding adapter requests 2× enlargement, validates returned dimensions and preserves the original. Owner explicitly confirmed Images Free. **Actual adapter support/algorithm remains unverified until a live test.** The code never falls back silently to interpolation or a paid third-party provider.
- A Meta vision model call returned model-agreement error 5016 requiring explicit license acceptance and an EU-domicile declaration. No agreement was submitted. It is **not** used by the pilot. Gemma 4 26B instead successfully captioned the actual sample image, returning JSON with title, description, ordered keywords and provisional QA; reported usage 8.78 neurons. The current model is `@cf/google/gemma-4-26b-a4b-it`, with thinking disabled and bounded completion tokens.
- [Adobe AI guidelines](https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html) require appropriate rights, quality and disclosure. [Adobe developer documentation](https://developer.adobe.com/stock/docs/getting-started/) says no Contributor API is provided. Secure asset transfer is not portal submission, acceptance, publication or sales.
- [Shutterstock policy](https://submit.shutterstock.com/help/en/articles/10594622-content-policy-updates-ai-generated-content) disallows contributor AI-generated content. Generated pilot files cannot be routed there, regardless of realism.

## Implemented flow

Successful same-day research → one source-referenced evergreen experiment brief → FLUX image → private immutable original → optional Images enlargement → Gemma inspects the actual final pixels for QA and metadata → persisted `needs_resolution` or `needs_review` record → private authenticated image download.

The original image and original research remain intact. No date from an LLM brief is accepted as a verified seasonal date. No automatic transparency claim: current JPEGs have opaque backgrounds. Keywords are image-grounded relevance suggestions, **not** verified highest-volume search terms. Model visual approval is not independent professional quality assurance. JPEG header dimensions are a limited technical check, not full codec validation.

Jobs intentionally never reach a fabricated uploaded/published/sold state. The existing Python transfer worker is unchanged; connecting this spool to its private inbox/receipt contract and verifying contributor credentials remains future integration work. Metadata is a draft with explicit AI provenance; category, rights, releases and final portal review remain outstanding. No private contributor connection was accessible: GitHub Secrets/Variables metadata reads returned HTTP 403.

## Quotas, scheduling and recovery

- Research retains its existing `17 7 * * *` cron and once-per-UTC-day initial claim plus one failed retry. A second cron (`*/15 * * * *`) wakes the independent production pilot. It never repeats Tavily searches. A valid successful report is required for that UTC day; production waits for fresh research after midnight rather than reusing stale claims.
- Each job reserves 512 local neurons before provider calls; maximum 8,000 local reservations/day. At most 15 jobs can fit. This is a conservative **local** estimate, not telemetry for global remaining credits. Unused/failed reservations are not refunded automatically. Other account usage is subject to the platform's Free hard stop.
- Daily quota error 3036 pauses until next UTC day. Capacity/rate error 3040 or HTTP 429 without an explicit daily code uses an hour cooldown. Codes may be extracted from SDK error text, but only fixed classifications are persisted; no provider message/credential is stored. No tight retry loop.
- Optional Images calls reserve at most 100 transformations/calendar month, independently of the daily AI budget. No transformation call without explicit Images Free confirmation. Original and enlarged assets are capped at 2MB each; spool at 128 recorded assets / 128MB. Storage limits do not reset daily and assets are never deleted automatically to make room.
- Three unresolved previews stop new generation. This prevents burning credits on a quality/resolution/transfer bottleneck. Using every credit is not a substitute for sellable output. Full automatic production remains blocked until the pilot has a verified route through those stages. Stored failures count toward this backlog; fixed error codes and failure stages locate the problem without exposing provider messages.
- D1 transactional claim + partial unique index permit only one running/uncertain production job across all triggers. A crashed/stalled job stays blocked for recovery; never reset it to regenerate blindly. Failed jobs preserve their reservation and any confirmed original. Unique immutable KV keys avoid per-key write contention.

## Configuration and authority

Pilot generation requires `PRODUCTION_ENABLED=true`, `WORKERS_PLAN=free`, `ASSET_STORAGE_FREE_CONFIRMED=true`, `VISION_MODEL_VERIFIED=true`, D1, AI and either a private `ASSET_KV` namespace or pre-existing `ASSETS` R2 binding. Free plan confirmation must be rechecked before changing the account plan. Do not enable on Paid by merely copying the flag.

Upscaling additionally requires an `IMAGES` binding and `IMAGES_FREE_CONFIRMED=true`. Leave disabled if plan/allowance is unknown. This flag does not prove the ESRGAN algorithm ran; a real account test is still required. Never create an Images Paid plan or accept model/legal terms to force the test.

The owner requested implementation, testing and daily free-tier automation. This authorizes the bounded free preview pilot and associated deployment, not paid upgrades, fabricated marketplace capabilities or removal of AI disclosures. Current no-automatic-publishing gates remain. Deploy migration 0006 once to the existing DB before the new code; preserve all earlier ledgers/receipts and both existing secret bindings. A code rollback must retain the new append-only pilot history rather than dropping tables.

## Tests

`node --test cloudflare/tests/*.test.mjs` includes provider success/failures, actual SQLite multi-connection claim contention and rollback, daily/monthly reset boundaries, unresolved-job blocking, image headers, metadata relevance constraints, KV spool reads/writes, explicit upscaling options/output validation, authenticated routes and rendered research-limit explanations. Synthetic JPEG headers prove control flow only. They are not image-quality, stock-acceptance, live upscaling or real transfer tests.

Account configuration: owner explicitly confirmed both Workers Free and Images Free. The dedicated KV namespace is `kitwise-production-assets`; its public identifier is included in the deployment template so future manual releases preserve the spool binding. Pilot flags in that template reflect these owner confirmations and the successful Gemma probe. No existing secret values were retrieved or changed.

Uploader readiness check: manual `check-connections` run 43785061464 completed, but setup/dependency/actual connection steps were skipped by the readiness gate. This does not establish valid contributor connections or any transfer. Do not describe a green wrapper job as a successful account connection.

## Controlled live test

The manual `company-os-production-check.yml` workflow runs only on main. It uses the already configured `KITWISE_CHAIRMAN_KEY` Actions secret, checks unauthenticated denial and the private overview, and invokes one synchronous bounded production test. It prints only fixed statuses, stages and counts; never keys, image bytes, metadata, prompts or provider bodies. No secrets are available to PR tests. If that existing secret is absent or the environment is blocked at Cloudflare's edge, the test reports the blocker instead of changing authentication. The actual business processing remains in the Cloudflare Worker; GitHub only drives the test.

## Deployed pilot revision

PR #10 (`4a0fe6ae4429a04918215813a5bdbe40469b6cbc`) was deployed to the existing Worker on November 16 at 01:24:50 UTC as version `c0ad34cf-0f76-4324-9cc5-3ae72e1cf5ff`; migration 0006 and private KV/Images bindings are installed. Both existing secrets and historical research remain intact. The production cron wakes every quarter hour, independently of daily research.

The manual HTTP acceptance test was blocked at the Cloudflare edge with 403 before invoking production. Do not describe it as end-to-end success. Direct model probes succeeded, while the scheduled native-binding path must be observed in D1 and the owner browser. No marketplace transfer has occurred. Current exact release evidence is in PROJECT_STATUS.md.
