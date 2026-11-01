# Company OS v0.1 — Architecture and operations

## Existing system versus new control plane

The existing `kitwise/` package and six-hour `.github/workflows/kitwise.yml` automate certain asset transfers, but do not perform marketplace final submission or verify earnings. Keep these unchanged. The new `company_os/` package is an independent company coordination foundation. Do not share upload receipt ledgers with research task state.

## Agent execution contract

Every logical employee has: role -> action permission -> bounded task payload -> source evidence -> persisted output -> audit trail -> CEO decision or exception. Workers receive exactly the task scope they need. Source text is untrusted data, never instructions to expand an agent's permissions. Retries must have idempotency keys and explicit recovery after uncertain state.

## Current flow

`CEO` (delegate_research) -> `researcher` (read_public_sources) -> `Store` (evidence, task, audit) -> `CEO` (needs_validation assessment) -> JSON board report.

Public evidence provider: Hacker News Algolia recent story index. Signals identify discussion only, not market demand or verified spending. The optional fixture mode uses only clearly identified synthetic records for end-to-end tests. A database used for synthetic fixtures cannot later be used for live data. Repeated same-day tasks are idempotent, while the next day can refresh signals. First cycle does **not** call an LLM or perform strategic selection. These are role-based deterministic workers, not yet autonomous reasoning agents. This constraint is intentional: no AI API key, authorized spend, or independent validation source is configured.

## Data model

- `tasks`: role, action, payload, idempotency key and strict status transitions.
- `evidence`: title, source URL, timestamp, metadata and topic-based deduplication.
- `opportunities`: state, null score where evidence insufficient, missing dimensions.
- `audit_events`: append-only observed actions and outcomes.

`SQLite` is the local/dev durable adapter. GitHub runner file systems are ephemeral. **Do not schedule this against SQLite on GitHub without migrating to authenticated persistent storage.** Do not commit research databases or private board reports to the public repository. Recommended future production store: Cloudflare D1 / managed PostgreSQL, subject to signup and permission checks.

## Safety invariants

1. Unknown role or action is denied. Spending and publishing require scoped human approval.
2. No credentials or personal customer data in the public repository, Actions logs or unencrypted output.
3. Source citations are recorded. If evidence does not establish buyer demand, the product stays `needs_validation` with no speculative numerical score.
4. Scheduled jobs must use locks, quotas, retry budgets and usage measurements before activation.
5. Product pipeline must distinguish prepared, transferred, portal-submitted, reviewed, approved, rejected and sold. Never equate upload with publication.
6. Company state and control-plane changes require privileged access and documented recovery.

## Run an isolated pilot

```bash
python -m unittest discover -s tests -p 'test_company_os.py' -v
python -m company_os --mode fixture --db /tmp/kitwise-demo.sqlite3
python -m company_os --mode live --db /tmp/kitwise-live.sqlite3
```

`fixture` never accesses a network and must never be used as a market validation report. `live` performs limited read-only public research; it will fail safely on source errors. Both modes operate entirely without marketplace credentials. Reports may be written with `--report` only to a private path.

## Phase gates

- v0.1: local deterministic CEO-to-Research loop, tests, evidence persistence and authority controls.
- v0.2: authenticated production database, bounded GitHub/Cloudflare cloud trigger, operation recovery and private board-report delivery; verify live run.
- v0.3: independent research sources, model-backed reasoning with rate limits, evidence-grounded opportunity scoring and approval workflow.
- v0.4: add production and QA workers, then controlled distribution adapters and verified sales analytics.
- v1.0: safe, measured scaling rules and chairman command center.
