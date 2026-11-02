import test from "node:test";
import assert from "node:assert/strict";
import worker, { runResearchCycle } from "../src/worker.mjs";
import {
  parseShutterstockTrends, fetchShutterstockTrends, parseContributorBriefs, fetchContributorBriefs, publicSourceFailure, BRIEFS_URL, seasonCalendar,
  screenMicrostockCandidates, makeResearchPrompt, RESEARCH_MANDATE, TREND_URL
} from "../src/market-intelligence.mjs";

const sampleHtml = "<html><body><h1>Trending searches</h1>" +
 '<a href="/images/search/new-year-2027"><span>new year 2027</span><span>Results: 41,736</span><span>Demand: Low</span><span>Growth: 120%</span></a>' +
 '<a href="/images/search/special-promo">special promo Results: 488,117 Demand: Medium Growth: 424%</a>' +
 '<a href="/images/search/3d-vegetables">3d vegetables Results: 101,686 Demand: High Growth: 340%</a>' +
 '<a href="/images/search/spiderman-mask">spiderman mask Results: 73,161 Demand: High Growth: 629%</a></body></html>';
class FakeDB {
  constructor(){this.runs=new Map();this.signals=new Map();}
  prepare(sql){
    return {bind:(...params)=>({run:async()=>{
      if(sql.startsWith("INSERT OR IGNORE INTO market_research_runs")){
        const day=params[0];
        if(this.runs.has(day))return {meta:{changes:0}};
        this.runs.set(day,{status:"running",retry_count:0,started:params[1]});
        return {meta:{changes:1}};
      }
      if(sql.startsWith("INSERT INTO market_research_signals")){
        this.signals.set(params[0],params);return {meta:{changes:1}};
      }
      if(sql.startsWith("UPDATE market_research_runs SET status='running'")){
        const row=this.runs.get(params[1]);
        if(!row||row.status!=="needs_attention"||row.retry_count!==0)
          return {meta:{changes:0}};
        row.status="running";row.retry_count+=1;
        return {meta:{changes:1}};
      }
      if(sql.startsWith("UPDATE market_research_runs")){
        const day=params.at(-1);const row=this.runs.get(day);row.status=params[0];
        if(params.length===6){row.report=JSON.parse(params[3]);row.error=params[4]}
        return {meta:{changes:1}};
      }
      throw new Error("unexpected_sql:"+sql);
    }})};
  }
  batch(statements){return Promise.all(statements.map(s=>s.run()))}
}
const clock=()=>new Date("2026-11-02T08:00:00Z");
const briefHtml="<html><h2>Current Briefs</h2><a>sstkWinter</a><a>sstkLove</a><a>sstkLunarNewYear</a><a>sstkEidMubarak</a></html>";
const pageFetch=async(url)=>{
  assert.ok([TREND_URL,BRIEFS_URL].includes(url));
  return {ok:true,text:async()=>url===TREND_URL?sampleHtml:briefHtml};
};
const fakeAI={run:async(_name,data)=>{
  assert.ok(data.messages[0].content.includes("Head of Microstock Market Intelligence"));
  assert.ok(data.messages[1].content.includes("new year 2027"));
  assert.ok(data.messages[1].content.includes("2027-02-14"));
  return {response:"No verified sales data. Build a modular New Year display kit only after validation."};
}};
function env(ai=fakeAI){return {DB:new FakeDB(),AI:ai}}

test("public health stays available and never exposes reports",async()=>{
  const r=await worker.fetch(new Request("https://example.test/health"));
  assert.equal(r.status,200);
  assert.equal((await r.json()).user_data_exposed,false);
  assert.equal((await worker.fetch(new Request("https://example.test/board"))).status,404);
});
test("real Shutterstock HTML trend rows contain original qualitative demand and matching result count",()=>{
  const rows=parseShutterstockTrends(sampleHtml);
  assert.equal(rows.length,4);
  assert.deepEqual([rows[0].keyword,rows[0].matching_results,rows[0].demand_label,rows[0].growth_percent],
    ["new year 2027",41736,"Low",120]);
  assert.equal(rows[0].source_url,TREND_URL);
});
test("invalid or blocked trends never become synthetic market evidence",async()=>{
  assert.throws(()=>parseShutterstockTrends("<html>new trends not readable yet</html>"),/invalid_trends_page|trends_rows_not_found/);
  await assert.rejects(()=>fetchShutterstockTrends(async()=>({ok:false,status:403})),/trends_http_403/);
});
test("season planner considers 2027 events and the ideal earlier upload window",()=>{
  const calendar=seasonCalendar("2026-11-02",190);
  const black=calendar.find(e=>e.name==="Black Friday");
  assert.equal(black.date,"2026-11-27");
  assert.equal(black.production_status,"late_for_ideal_upload_window");
  const valentines=calendar.find(e=>e.name==="Valentine's Day");
  assert.equal(valentines.date,"2027-02-14");
  assert.ok(valentines.suggested_upload_by<valentines.date);
  const easter=calendar.find(e=>e.name==="Easter (Western)");
  assert.equal(easter.date,"2027-03-28");
});
test("trademark-sensitive keywords are not recommended as stock asset packs",()=>{
  const rows=parseShutterstockTrends(sampleHtml);
  const shortlist=screenMicrostockCandidates(rows,seasonCalendar("2026-11-02"));
  assert.ok(shortlist.some(s=>s.keyword==="new year 2027"));
  assert.ok(!shortlist.some(s=>s.keyword==="spiderman mask"));
  assert.equal(shortlist.find(s=>s.keyword==="new year 2027").demand_label,"Low");
  assert.ok(makeResearchPrompt(rows,seasonCalendar("2026-11-02"),"2026-11-02").includes("matching_results"));
  assert.match(RESEARCH_MANDATE,/NEVER recommend a general software business/);
});
test("research cycle records observed market metrics, AI brief and deduplicates UTC day",async()=>{
  const context=env();
  const result=await runResearchCycle(context,{now:clock,fetchImpl:pageFetch});
  assert.equal(result.status,"completed");
  assert.equal(result.signals,4);
  assert.equal(context.DB.signals.size,4);
  assert.equal(context.DB.runs.get("2026-11-02").report.evidence_quality,"single_platform_search_signals_not_sales");
  assert.equal(context.DB.runs.get("2026-11-02").report.contributor_briefs.length,4);
  assert.equal(context.DB.runs.get("2026-11-02").report.source_diagnostics.trends,"ok");
  assert.equal(context.DB.runs.get("2026-11-02").report.shortlist.some(s=>s.keyword==="spiderman mask"),false);
  const again=await runResearchCycle(context,{now:clock,fetchImpl:pageFetch});
  assert.equal(again.status,"already_claimed");
  assert.equal(context.DB.signals.size,4);
});
test("AI quota failure records attention; still preserves observed source evidence",async()=>{
  const context=env({run:async()=>{throw new Error("quota")}});
  const result=await runResearchCycle(context,{now:clock,fetchImpl:pageFetch});
  assert.equal(result.status,"needs_attention");
  assert.equal(result.error_code,"workers_ai_unavailable");
  assert.equal(context.DB.signals.size,4);
});
test("markup fallback recovers search rows when link and metrics are separate",()=>{
  const html="<html><h1>Trending searches</h1><div>Search term Results Demand Growth</div>"+
    "<div><a href='/images/search/3d-food'>3d food</a><span>Results: 5,120</span>"+
    "<span>Demand: High</span><span>Growth: 315%</span></div>"+
    "<div><a>snow globe</a><span>Results: 21,050</span><span>Demand: Low</span><span>Growth: 180%</span></div></html>";
  const rows=parseShutterstockTrends(html);
  assert.deepEqual(rows.map(x=>x.keyword),["3d food","snow globe"]);
  assert.equal(rows[0].matching_results,5120);
  assert.equal(rows[1].demand_label,"Low");
});
test("official contributor briefs produce qualitative evidence only",()=>{
  const b=parseContributorBriefs(briefHtml);
  assert.equal(b.length,4);
  assert.equal(b[0].evidence_type,"official_editorial_brief_not_numeric_demand");
  assert.equal(publicSourceFailure(new Error("trends_http_403"),"trends"),"trends_http_403");
  assert.equal(publicSourceFailure(new Error("sensitive-token"),"trends"),"trends_source_unavailable");
});
test("trend failure with briefs available still yields cautious AI report and diagnostic",async()=>{
  let calls=0;
  const context=env({run:async()=>{calls++;return {response:"Editorial themes are not numeric demand. Validate stock sales."}}});
  const degradedFetch=async(url)=>url===TREND_URL
    ? {ok:false,status:403}
    : {ok:true,text:async()=>briefHtml};
  const result=await runResearchCycle(context,{now:clock,fetchImpl:degradedFetch});
  assert.equal(result.status,"needs_attention");
  assert.equal(result.signals,0);
  assert.equal(result.briefs,4);
  assert.equal(calls,1);
  const stored=context.DB.runs.get("2026-11-02").report;
  assert.equal(stored.source_diagnostics.trends,"trends_http_403");
  assert.equal(stored.provenance,"observed_shutterstock_editorial_briefs_only");
  assert.deepEqual(stored.shortlist,[]);
  assert.ok(stored.ai_interpretation_unverified);
  assert.equal((await runResearchCycle(context,{now:clock,fetchImpl:pageFetch})).status,"completed");
  assert.equal(context.DB.runs.get("2026-11-02").retry_count,1);
  assert.equal((await runResearchCycle(context,{now:clock,fetchImpl:pageFetch})).status,"already_claimed");
});
test("unavailable trends yields zero evidence and no AI recommendations",async()=>{
  let calls=0;
  const context=env({run:async()=>{calls++;return {response:"should-not-run"}}});
  const blocked=async()=>({ok:false,status:403});
  const result=await runResearchCycle(context,{now:clock,fetchImpl:blocked});
  assert.equal(result.status,"needs_attention");
  assert.equal(result.signals,0);
  assert.equal(calls,0);
  assert.deepEqual(context.DB.runs.get("2026-11-02").report.shortlist,[]);
  assert.equal(context.DB.runs.get("2026-11-02").report.provenance,"no_live_market_evidence");
  assert.equal(result.error_code,"all_market_sources_unavailable");
});
