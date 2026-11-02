import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import worker from "../src/worker.mjs";
import { authorizeChairman, chairmanOverview } from "../src/chairman.mjs";
import { DASHBOARD_HTML } from "../src/dashboard.mjs";

const GOOD = "a".repeat(64);
const BAD = "b".repeat(64);
function req(path, key = null, method = "GET", origin = null) {
  const headers = {};
  if (key) headers.authorization = "Bearer " + key;
  if (origin) headers.origin = origin;
  return new Request("https://kitwise.test" + path, { method, headers });
}
function envWithRows(rows = []) {
  return {
    CHAIRMAN_DASHBOARD_KEY: GOOD,
    DB: {
      prepare(sql) {
        if (sql.includes("FROM indexed_research_runs")) return {
          all: async () => ({ results: rows })
        };
        if (sql.includes("FROM indexed_research_sources")) return {
          bind: () => ({ all: async () => ({ results: [
            { title:"Untrusted page",url:"javascript:alert(1)",source:"shutterstock.com",
              query_id:"shutterstock-customer-brief",retrieved_at:"2026-11-02" },
            { title:"Stock contributor seasonal briefs",url:"https://submit.shutterstock.com/help/en/articles/10594691-what-type-of-content-are-shutterstock-customers-looking-for",
              source:"submit.shutterstock.com",query_id:"shutterstock-customer-brief",retrieved_at:"2026-11-02" }
          ] }) })
        };
        if (sql.startsWith("INSERT OR IGNORE") ||
            sql.startsWith("UPDATE indexed_research_runs SET status='running'")) return {
          bind: () => ({ run: async () => ({ meta: { changes: 0 } }) })
        };
        throw new Error("unexpected_query");
      }
    }, AI: {}
  };
}
const row = {
  day: "2026-11-02", status: "completed",
  started_at: "2026-11-02T07:17:00Z", completed_at: "2026-11-02T07:18:00Z",
  evidence_count: 8, error_code: null,
  report_json: JSON.stringify({
    ai_interpretation_unverified: "Possible opportunity; buyer validation required.",
    missing: ["verified_buyer_intent", "marketplace_sales"],
    provenance: "live_public_discussion_signals",
    agent: "@cf/zai-org/glm-4.7-flash",
    version: "microstock-indexed-v0.5",indexed_source_count:2,
    source_diagnostics:{indexed_search:"ok",direct_shutterstock:"disabled_after_http_403"},
    shortlist: [],
    season_calendar: [{name:"Valentine\u0027s Day",date:"2027-02-14",days_until:104,suggested_upload_by:"2026-12-01",production_status:"prepare_and_upload_now"}]
  })
};

test("dashboard loads a publicly viewable login shell without private data", async () => {
  const response = await worker.fetch(req("/dashboard"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /script-src 'nonce-/);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  const html = await response.text();
  assert.match(html, /Unlock your Chairman Office/);
  assert.doesNotMatch(html, /Possible opportunity; buyer validation required/);
  assert.doesNotMatch(html, /https:\/\/hn\.algolia\.com/);
});

test("embedded client script is valid JavaScript and does not persist keys", () => {
  const match = DASHBOARD_HTML.match(/<script nonce="__NONCE__">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.doesNotThrow(() => new Script(match[1]));
  assert.doesNotMatch(match[1], /localStorage|sessionStorage|document\.cookie/);
});

test("unauthorized and unconfigured API routes fail closed", async () => {
  const env = envWithRows([row]);
  const without = await worker.fetch(req("/api/overview"), env);
  assert.equal(without.status, 401);
  assert.doesNotMatch(await without.text(), /Possible opportunity/);
  const wrong = await worker.fetch(req("/api/overview", BAD), env);
  assert.equal(wrong.status, 401);
  const notConfigured = await worker.fetch(req("/api/overview", GOOD), { DB: env.DB });
  assert.equal(notConfigured.status, 503);
  assert.equal(await authorizeChairman(req("/api/overview", GOOD), env), "authorized");
  assert.equal(await authorizeChairman(req("/api/overview", BAD), env), "unauthorized");
});

test("valid chairman credential reads only private reports and sanitizes source links", async () => {
  const res = await worker.fetch(req("/api/overview", GOOD), envWithRows([row]));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.research.latest.evidence_count, 8);
  assert.equal(data.research.latest.report.indexed_source_count,2);
  assert.equal(data.research.latest.report.ai_interpretation_unverified, "Possible opportunity; buyer validation required.");
  assert.equal(data.research.sources[0].url, null);
  assert.match(data.research.sources[1].url, /^https:\/\/submit.shutterstock.com\/help\//);
  assert.equal(data.business.verified_profit, null);
  assert.equal(data.departments.find(d => d.name === "Product Operations").implemented, false);
  assert.equal(data.departments.find(d => d.name === "Microstock Market Intelligence").implemented, true);
});

test("dashboard shows waiting state when no runs exist", async () => {
  const data = await chairmanOverview(envWithRows());
  assert.equal(data.research.latest, null);
  assert.deepEqual(data.research.sources, []);
  assert.equal(data.research.run_count, 0);
});

test("protected run action requires key, POST method and same-origin", async () => {
  const env = envWithRows([row]);
  assert.equal((await worker.fetch(req("/api/research/run", null, "POST"), env)).status, 401);
  assert.equal((await worker.fetch(req("/api/research/run", GOOD), env)).status, 404);
  assert.equal((await worker.fetch(req("/api/research/run", GOOD, "POST", "https://evil.example"), env)).status, 403);
  const promises = [];
  const ctx = { waitUntil(p) { promises.push(p); } };
  const res = await worker.fetch(req("/api/research/run", GOOD, "POST", "https://kitwise.test"), env, ctx);
  assert.equal(res.status, 202);
  await Promise.all(promises);
});

test("health remains public but does not include researcher records", async () => {
  const res = await worker.fetch(req("/health"), envWithRows([row]));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).user_data_exposed, false);
});
