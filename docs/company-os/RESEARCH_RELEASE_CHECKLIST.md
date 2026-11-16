# Existing Worker research repair — review and release checklist

This prepares a protected release; it does not authorize merging or deployment. Resource: existing Worker `kitwise-company-os`, account `24461936bf6ef775e081e4897b6ab687`, D1 `kitwise-company-os` (`014cd248-5c1a-4949-8ce7-2ef688979bfd`). No additional service, paid plan, migration or secret rotation is required by this repair.

## Review before approval

1. Record the exact reviewed PR #8 head SHA and green CI. Review all changed files and confirm uploader code, receipts, database schema, model, token budget and authentication are unchanged.
2. Confirm the private overview allows only fixed diagnostic fields. Empty/truncated answers must fail; existing reports without diagnostics must remain readable. Tests run the actual dashboard client script against the authenticated API projection; this is not a live browser test.
3. Obtain approval naming the reviewed merge and deployment to the existing Worker. If the head changes materially, reconcile the change with that scope before deployment.

## Before deployment (read-only)

Record the active Worker deployment/version and its bindings, cron, settings and secret **names**, without retrieving values. Confirm the expected existing D1 ID. Inspect applied migration names and compare them with the repository. The manual deployment workflow can create a missing database, applies migrations, and writes secrets; do not blindly run it when live state is unexpected. This repair itself requires none of those changes.

Record aggregate ledger counts/statuses and today's claim state privately. Retain existing D1 recovery/backup arrangements. Do not export private report content into public CI logs, PRs or documentation. Preserve a way to restore the prior Worker version without changing DB/auth.

## Deploy only with the scoped approval

Use the approved reviewed revision and existing release path. Verify the new deployed version corresponds to that revision. Confirm the same D1 binding, AI binding, Tavily and Chairman secret names, and `17 7 * * *` cron. Retain secret values and histories. If using the generic workflow, account for its migration and secret-setting steps in the approved scope; do not rotate keys as a side effect.

## Live acceptance

1. Verify `/health` responds; this proves responsiveness only.
2. In the actual browser, verify the locked dashboard shell reveals no private reports and unauthorized API access is denied. The owner enters their existing key privately; never ask for it in chat.
3. Wait for the next scheduled cycle, or use an allowed authenticated manual attempt/retry. One initial claim and one retry after needs_attention are shared across cron/manual requests per UTC day. Never reset claims to manufacture capacity. A 202 is a queued request, not proof the ledger accepted a new run.
4. Inspect the persisted row and sources in private D1: at least two relevant sources before AI; nonempty, nontruncated final answer; `ai_diagnostics.outcome=ok`; status completed unless another source error requires attention. If sources fail, record that separately; do not fabricate a successful AI test.
5. Verify the dashboard shows the actual outcome and safe diagnostic metadata after refresh. Confirm earlier runs remain visible and that a repeat trigger cannot exceed the ledger's limit.
6. Record deployed SHA/version, UTC day, technical status, source counts/rejections and verification evidence privately. Public status documentation should contain only safe summaries. A technically successful brief still leaves buyer demand and profitability unvalidated.

## Rollback and failures

If the release breaks routes, authentication or research behavior, restore the recorded prior Worker version using an authorized rollback to the same Worker. Preserve current secrets and D1; do not revert migrations, delete evidence, clear claims or touch upload receipts. Rollback cannot make an old failed cycle succeed or replenish a consumed daily attempt. Confirm routes/auth, binding IDs and cron after rollback; document the failed version and sanitized reason. If rollback needs additional authority or access, stop the protected action and report the exact blocker.
