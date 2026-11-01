import test from "node:test";
import assert from "node:assert/strict";
import worker, { getSignals, runResearchCycle } from "../src/worker.mjs";

class FakeDB {
  constructor() { this.runs = new Map(); this.evidence = new Map(); }
  prepare(sql) {
    return { bind: (...params) => ({ run: async () => {
      if (sql.startsWith("INSERT OR IGNORE INTO research_runs")) {
        const [day, started] = params;
        if (this.runs.has(day)) return { meta: { changes: 0 } };
        this.runs.set(day, { status: "running", started }); return { meta: { changes: 1 } };
      }
      if (sql.startsWith("INSERT OR IGNORE INTO research_evidence")) {
        this.evidence.set(params[0], params);
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith("UPDATE research_runs")) {
        const day = params.at(-1);
        const row = this.runs.get(day);
        row.status = params[0];
        return { meta: { changes: 1 } };
      }
      throw new Error("unexpected SQL");
    } }) };
  }
}
const today = () => new Date("2026-11-01T07:17:00.000Z");
const fakeFetch = async () => ({
  ok: true,
  json: async () => ({ hits: [
    { objectID: "123", title: "How to automate invoices?", created_at: "2026-10-31T14:00:00Z" },
    { objectID: "bad-id", title: "Not accepted" }
  ] })
});
function createEnv(ai = { run: async () => ({ response: "These headlines do not prove demand. Validate buyers first." }) }) {
  return { DB: new FakeDB(), AI: ai };
}
test("public health discloses no private report", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.component, "cloud-research-pilot");
  assert.equal(body.user_data_exposed, false);
  assert.equal((await worker.fetch(new Request("https://example.test/board"))).status, 404);
});
test("research only records sourced headlines with canonical links", async () => {
  const result = await getSignals("test", fakeFetch);
  assert.equal(result.length, 1);
  assert.equal(result[0].url, "https://news.ycombinator.com/item?id=123");
});
test("the first cycle runs research and one AI interpretation", async () => {
  let calls = 0;
  const env = createEnv({ run: async () => { calls++; return { response: "Hypothesis; buyer validation still required." }; } });
  const result = await runResearchCycle(env, { now: today, fetchImpl: fakeFetch });
  assert.deepEqual(result, { status: "completed", day: "2026-11-01", signals: 4, ai_interpretation_available: true });
  assert.equal(calls, 1);
  assert.equal(env.DB.evidence.size, 4);
  assert.equal(env.DB.runs.get("2026-11-01").status, "completed");
  const twice = await runResearchCycle(env, { now: today, fetchImpl: fakeFetch });
  assert.equal(twice.status, "already_claimed");
  assert.equal(calls, 1);
});
test("AI failure is recorded instead of fabricated as success", async () => {
  const env = createEnv({ run: async () => { throw new Error("quota"); } });
  const result = await runResearchCycle(env, { now: today, fetchImpl: fakeFetch });
  assert.equal(result.status, "needs_attention");
});
test("no sources means no AI call and an explicit attention state", async () => {
  const env = createEnv({ run: async () => { throw Error("should not be called"); } });
  const empty = async () => ({ ok: true, json: async () => ({ hits: [] }) });
  const result = await runResearchCycle(env, { now: today, fetchImpl: empty });
  assert.equal(result.status, "needs_attention");
  assert.equal(result.error, "no_public_signals");
});
test("a failed public source does not create unsupported evidence", async () => {
  const env = createEnv();
  const failure = async () => { throw new Error("offline"); };
  const result = await runResearchCycle(env, { now: today, fetchImpl: failure });
  assert.equal(result.status, "needs_attention");
  assert.equal(env.DB.evidence.size, 0);
});
