/**
 * Authenticated Chairman dashboard routes. No data is returned without a
 * 256-bit user-generated key held only in Worker Secrets.
 */
export const CHAIRMAN_KEY_NAME = "CHAIRMAN_DASHBOARD_KEY";
const HEX_256 = /^[a-f\d]{64}$/i;

export function securityHeaders(extra = {}) {
  return {
    "cache-control": "no-store, private",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    ...extra
  };
}
export function privateJson(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: securityHeaders({ "content-type": "application/json; charset=utf-8" })
  });
}

export async function authorizeChairman(request, env) {
  const expected = env?.CHAIRMAN_DASHBOARD_KEY;
  if (typeof expected !== "string" || !HEX_256.test(expected)) return "not_configured";
  const header = request.headers.get("authorization") || "";
  if (!/^Bearer [a-f\d]{64}$/i.test(header)) return "unauthorized";
  const supplied = header.substring(7);
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied))
  ]);
  let difference = 0;
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0 ? "authorized" : "unauthorized";
}

function validatedReport(raw) {
  if (typeof raw !== "string" || raw.length > 40000) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      generated_at: parsed.generated_at || null,
      provenance: parsed.provenance || null,
      evidence_quality: parsed.evidence_quality || null,
      model: parsed.agent || null,
      ai_interpretation_unverified: typeof parsed.ai_interpretation_unverified === "string"
        ? parsed.ai_interpretation_unverified.slice(0, 6000) : null,
      missing: Array.isArray(parsed.missing) ? parsed.missing.slice(0, 12).map(String) : [],
      source_failures: Array.isArray(parsed.source_failures) ? parsed.source_failures.slice(0, 10).map(String) : [],
      ai_failure: parsed.ai_failure === true
    };
  } catch (_) {
    return null;
  }
}

export async function chairmanOverview(env) {
  if (!env?.DB) throw new Error("database_binding_missing");
  const { results = [] } = await env.DB.prepare(
    "SELECT day,status,started_at,completed_at,evidence_count,error_code,report_json FROM research_runs ORDER BY day DESC LIMIT 10"
  ).all();
  const runs = results.map(row => ({
    day: row.day, status: row.status, started_at: row.started_at,
    completed_at: row.completed_at, evidence_count: Number(row.evidence_count) || 0,
    error_code: row.error_code || null, report: validatedReport(row.report_json)
  }));
  const latest = runs[0] || null;
  const day = new Date().toISOString().slice(0, 10);
  let sources = [];
  if (latest) {
    const r = await env.DB.prepare(
      "SELECT topic,title,source,url,published_at FROM research_evidence WHERE run_day=? ORDER BY topic,title LIMIT 30"
    ).bind(latest.day).all();
    sources = (r.results || []).map(item => ({
      topic: String(item.topic).slice(0, 100),
      title: String(item.title).slice(0, 240),
      source: String(item.source).slice(0, 70),
      url: /^https:\/\/news\.ycombinator\.com\/item\?id=\d+$/.test(String(item.url)) ? String(item.url) : null,
      published_at: item.published_at || null
    }));
  }
  return {
    product: "Kitwise Company OS", version: "0.2-pilot",
    observed_at: new Date().toISOString(),
    research: {
      latest, runs, sources, run_count: runs.length,
      manual_run_available: !runs.some(r => r.day === day)
    },
    business: {
      verified_revenue: null,
      verified_profit: null,
      products_live: null,
      marketplaces_connected: null,
      note: "Business/sales integrations are not yet connected. A blank metric is not zero."
    },
    departments: [
      { name: "Research", status: latest ? latest.status : "awaiting_first_run", implemented: true },
      { name: "CEO Reporting", status: latest?.report?.ai_interpretation_unverified ? "pilot_output" : "awaiting_data", implemented: true },
      { name: "Product Operations", status: "planned", implemented: false },
      { name: "Growth & Publishing", status: "planned", implemented: false },
      { name: "Finance", status: "planned", implemented: false },
      { name: "Technology & QA", status: "foundation_only", implemented: false }
    ]
  };
}
