import test from "node:test";
import assert from "node:assert/strict";
import {WEIGHTS,commercialScore,netProfitPerHour,evaluateOpportunity} from "../src/commercial-decisions.mjs";
const day="2026-11-02";
const ev=(id,type,metrics={})=>({
  id,type,source_ref:"synthetic-test-fixture:"+id,observed_on:day,metrics
});
const buyer={segment:"Independent designers creating product advertisements",
  problem:"Need isolated, reusable 3D elements to assemble campaign layouts"};
const baseline=()=>({
  id:"TEST-ONLY-001",title:"Synthetic modular isolated 3D elements",
  stage:"RESEARCH",format:"3d_png",buyer,
  mvp:{deliverable:"Five original isolated transparent PNG pieces",channel:"Adobe Stock"},
  compliance:{rights_clear:true,platform_eligible:true},
  season:{upload_by:"2026-12-01"},
  evidence:[
    ev("publisher","editorial_guidance"),
    ev("search","marketplace_search_signal"),
    ev("competitor","competitor_listing",{listed_price:12,product_format:"PNG pack"}),
    ev("hours","production_estimate",{hours_estimated:2})
  ]
});
const paid=()=>ev("paid","paid_validation",{units_sold:12,net_receipts:75});
const financials=()=>({period:"2026-11",currency:"USD",
  gross_receipts:85,refunds:0,platform_fees:12,production_cost:5,
  marketing_cost:0,other_cost:3,build_hours:5,support_hours:1});
test("master opportunity scoring weights sum to 100",()=>{
  assert.equal(Object.values(WEIGHTS).reduce((a,b)=>a+b,0),100);
  assert.equal(WEIGHTS.willingness_to_pay,20);
});
test("publisher editorial alone cannot score or authorize creation",()=>{
  const op={title:"Article idea",evidence:[ev("guidance","editorial_guidance")],
    compliance:{rights_clear:true,platform_eligible:true}};
  const out=evaluateOpportunity(op,{today:day});
  assert.equal(out.verdict,"VALIDATE");
  assert.equal(out.score_100,null);
  assert.equal(out.evidence_counts.buyer_signals,0);
  assert.ok(out.missing_evidence.some(x=>x.includes("editorial articles alone")));
  assert.equal(out.system_action,"RESEARCH_AND_REPORT_ONLY");
});
test("buyer interest and competitor asking prices do not prove paid demand",()=>{
  const out=evaluateOpportunity(baseline(),{today:day});
  assert.equal(out.verdict,"VALIDATE");
  assert.equal(out.score_100,null);
  assert.match(out.reason,/Willingness to pay is unverified/);
  assert.match(out.next_action,/small, limited-cost/);
  assert.equal(out.evidence_counts.paid_records,0);
});
test("verified sales plus all documented score factors and realized profit can be a build CANDIDATE only",()=>{
  const op=baseline();
  op.evidence.push(paid());
  op.financials=financials();
  op.factor_assessments=Object.fromEntries(Object.keys(WEIGHTS).map(key=>
    [key,{rating:5,evidence_ids:["paid","competitor","search"]}]));
  const out=evaluateOpportunity(op,{today:day});
  assert.equal(out.score_100,100);
  assert.equal(out.verdict,"BUILD_CANDIDATE");
  assert.equal(out.net_profit_per_hour.net_profit,65);
  assert.equal(out.net_profit_per_hour.net_profit_per_hour,10.83);
  assert.ok(out.chairman_approval_required_for.includes("publishing"));
  assert.equal(out.system_action,"RESEARCH_AND_REPORT_ONLY");
});
test("scores with unknown dimensions remain null, not fabricated 80/100",()=>{
  const op=baseline();op.evidence.push(paid());op.financials=financials();
  op.factor_assessments={demand:{rating:5,evidence_ids:["paid"]}};
  assert.equal(commercialScore(op),null);
  assert.equal(evaluateOpportunity(op,{today:day}).verdict,"VALIDATE");
});
test("legal or stock submission policy conflict is an immediate no-go",()=>{
  const op=baseline();op.compliance.platform_eligible=false;
  const out=evaluateOpportunity(op,{today:day});
  assert.equal(out.verdict,"KILL");
  assert.match(out.reason,/eligibility/);
});
test("a past preferred upload deadline is clearly labeled",()=>{
  const op=baseline();op.season.upload_by="2026-10-01";
  assert.equal(evaluateOpportunity(op,{today:day}).season_status,"ideal_upload_window_passed");
});
test("profit per hour requires complete financial inputs and nonzero time",()=>{
  assert.equal(netProfitPerHour({period:"2026-11",gross_receipts:50}),null);
  const f=financials();delete f.support_hours;
  assert.equal(netProfitPerHour(f),null);
});
test("malformed evidence never becomes a commercial signal",()=>{
  const op=baseline();
  op.evidence=[{id:"unsupported",type:"verified_transaction",
    metrics:{units_sold:500,net_receipts:1500}},...op.evidence];
  const out=evaluateOpportunity(op,{today:day});
  assert.equal(out.evidence_counts.ignored,1);
  assert.equal(out.evidence_counts.paid_records,0);
  assert.equal(out.verdict,"VALIDATE");
});
