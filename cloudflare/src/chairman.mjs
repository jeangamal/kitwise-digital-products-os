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
  if (typeof raw !== "string" || raw.length > 85000) return null;
  try {
    const parsed = JSON.parse(raw);
    const shortlist = Array.isArray(parsed.shortlist) ? parsed.shortlist.slice(0,12).map(row=>({
      keyword:String(row.keyword||"").slice(0,110),
      matching_results:Number(row.matching_results)||0,
      growth_percent:Number(row.growth_percent)||0,
      demand_label:String(row.demand_label||"unknown").slice(0,15),
      triage_index:Number(row.triage_index)||null,
      decision:String(row.decision||"needs_validation").slice(0,60),
      season:row.season && typeof row.season==="object"?{
        name:String(row.season.name||"").slice(0,80),
        date:String(row.season.date||"").slice(0,16),
        suggested_upload_by:String(row.season.suggested_upload_by||"").slice(0,16),
        production_status:String(row.season.production_status||"").slice(0,60)
      }:null
    })): [];
    const seasons = Array.isArray(parsed.season_calendar) ? parsed.season_calendar.slice(0,20).map(row=>({
      name:String(row.name||"").slice(0,80),
      date:String(row.date||"").slice(0,16),
      days_until:Number(row.days_until),
      suggested_upload_by:String(row.suggested_upload_by||"").slice(0,16),
      production_status:String(row.production_status||"").slice(0,60)
    })): [];
    return {
      generated_at:parsed.generated_at||null,version:parsed.version||"unknown",
      provenance:parsed.provenance||null,
      evidence_quality:parsed.evidence_quality||null,
      model:parsed.agent||null,
      search_terms_screened:Number(parsed.search_terms_screened)||0,
      source_diagnostics:parsed.source_diagnostics && typeof parsed.source_diagnostics==="object"
        ? { indexed_search:String(parsed.source_diagnostics.indexed_search||"unknown").slice(0,80),
            direct_shutterstock:String(parsed.source_diagnostics.direct_shutterstock||"disabled").slice(0,80)} : null,
      indexed_source_count:Number(parsed.indexed_source_count)||0,
      source_failures:Array.isArray(parsed.source_failures)?parsed.source_failures.slice(0,8).map(String):[],
      contributor_briefs:Array.isArray(parsed.contributor_briefs)
        ? parsed.contributor_briefs.slice(0,15).map(item=>({
            theme:String(item.theme||"").slice(0,100),
            tag:String(item.tag||"").slice(0,80),
            source_url:"https://www.shutterstock.com/explore/contributor-content-briefs",
            evidence_type:"official_editorial_brief_not_numeric_demand"
          })) : [],
      attempt:Number(parsed.attempt)||1,
      ai_interpretation_unverified:typeof parsed.ai_interpretation_unverified==="string"
        ? parsed.ai_interpretation_unverified.slice(0,9000):null,
      shortlist,season_calendar:seasons,
      source_url:"https://www.shutterstock.com/trends",
      missing:Array.isArray(parsed.missing)?parsed.missing.slice(0,20).map(String):[],
      error_code:parsed.error_code||null
    };
  } catch (_) {return null;}
}

export async function chairmanOverview(env) {
  if (!env?.DB) throw new Error("database_binding_missing");
  const { results = [] } = await env.DB.prepare(
    "SELECT day,status,started_at,completed_at,document_count AS evidence_count,error_code,report_json,retry_count FROM indexed_research_runs ORDER BY day DESC LIMIT 10"
  ).all();
  const runs = results.map(row => ({
    day: row.day, status: row.status, started_at: row.started_at,
    completed_at: row.completed_at, evidence_count: Number(row.evidence_count) || 0,
    error_code: row.error_code || null, retry_count: Number(row.retry_count)||0,
    report: validatedReport(row.report_json)
  }));
  const latest = runs[0] || null;
  const day = new Date().toISOString().slice(0, 10);
  let sources = [];
  if (latest) {
    const r = await env.DB.prepare(
      "SELECT title,url,source,query_id,retrieved_at,evidence_type FROM indexed_research_sources WHERE run_day=? ORDER BY query_id,title LIMIT 30"
    ).bind(latest.day).all();
    sources=(r.results||[]).map(item=>{
      let safeUrl=null;
      try {
        const u=new URL(String(item.url));
        if(u.protocol==="https:"&&/(^|\.)((adobe|shutterstock)\.com)$/i.test(u.hostname))
          safeUrl=u.href;
      }catch(_){}
      return {
        topic:String(item.query_id).slice(0,80),
        title:String(item.title).slice(0,220),
        source:String(item.source).slice(0,70),
        url:safeUrl,
        published_at:String(item.retrieved_at||"").slice(0,32),
        evidence_type:"search_indexed_official_page_not_sales"
      };
    });
  }
  return {
    product: "Kitwise Company OS", version: "0.5-indexed-microstock",
    observed_at: new Date().toISOString(),
    research: {
      latest, runs, sources, run_count: runs.length,
      manual_run_available: !runs.some(r => r.day === day &&
        !(r.status === 'needs_attention' && r.retry_count === 0))
    },
    business: {
      verified_revenue: null,
      verified_profit: null,
      products_live: null,
      marketplaces_connected: null,
      note: "Business/sales integrations are not yet connected. A blank metric is not zero."
    },
    departments: [
      { name: "Microstock Market Intelligence", status: latest ? latest.status : "awaiting_first_run", implemented: true },
      { name: "CEO Reporting", status: latest?.report?.ai_interpretation_unverified ? "pilot_output" : "awaiting_data", implemented: true },
      { name: "Product Operations", status: "planned", implemented: false },
      { name: "Growth & Publishing", status: "planned", implemented: false },
      { name: "Finance", status: "planned", implemented: false },
      { name: "Technology & QA", status: "foundation_only", implemented: false }
    ]
  };
}
