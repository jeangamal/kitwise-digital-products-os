/**
 * Kitwise commercial evidence gate, v1. Offline foundation; not wired to the
 * production Worker or Chairman dashboard. No autonomous spend or publishing.
 * Never store real contributor sales in this public repository.
 */
export const WEIGHTS=Object.freeze({
  demand:20,willingness_to_pay:20,competition_gap:15,problem_intensity:15,
  differentiation:10,build_speed:10,low_maintenance:5,expansion_potential:5
});
const TYPES=new Set([
  "editorial_guidance","marketplace_search_signal","competitor_listing",
  "customer_problem","verified_transaction","paid_validation",
  "production_estimate","platform_policy","customer_feedback"
]);
const BUYER_TYPES=new Set(["marketplace_search_signal","customer_problem",
  "verified_transaction","paid_validation","customer_feedback"]);
const PAID_TYPES=new Set(["verified_transaction","paid_validation"]);
const nonnegative=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
const dateOk=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&
  !Number.isNaN(Date.parse(x+"T00:00:00Z")) &&
  new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
function evidenceFor(o){
  return (Array.isArray(o?.evidence)?o.evidence:[]).filter(x=>
    x&&TYPES.has(x.type)&&typeof x.id==="string"&&x.id.length>0&&
    typeof x.source_ref==="string"&&x.source_ref.length>0&&dateOk(x.observed_on));
}
function paidRecords(es){
  return es.filter(x=>PAID_TYPES.has(x.type)&&Number.isInteger(x.metrics?.units_sold)&&
    x.metrics.units_sold>0&&nonnegative(x.metrics?.net_receipts)&&x.metrics.net_receipts>0);
}
function competitorRecords(es){
  return es.filter(x=>x.type==="competitor_listing"&&
    nonnegative(x.metrics?.listed_price)&&typeof x.metrics?.product_format==="string"&&
    x.metrics.product_format.length>0);
}
function producedEstimate(es){
  return es.some(x=>x.type==="production_estimate"&&
    nonnegative(x.metrics?.hours_estimated)&&x.metrics.hours_estimated>0);
}
/** Score only when every factor has a 0–5 rating and valid evidence references.
 * The two commercial dimensions also require verified paid performance and
 * concrete competitor pricing; blog articles cannot generate an 80/100. */
export function commercialScore(o){
  const es=evidenceFor(o),ids=new Set(es.map(x=>x.id));
  if(!paidRecords(es).length||!competitorRecords(es).length)return null;
  if(!o?.factor_assessments)return null;
  let sum=0;
  for(const [factor,weight] of Object.entries(WEIGHTS)){
    const value=o.factor_assessments[factor];
    if(!value||!Number.isInteger(value.rating)||value.rating<0||value.rating>5||
      !Array.isArray(value.evidence_ids)||!value.evidence_ids.length||
      value.evidence_ids.some(id=>!ids.has(id)))return null;
    sum+=weight*value.rating/5;
  }
  return Math.round(sum*10)/10;
}
export function netProfitPerHour(f){
  if(!f||!/^20\d\d-(0[1-9]|1[0-2])$/.test(f.period||""))return null;
  const fields=["gross_receipts","refunds","platform_fees","production_cost",
    "marketing_cost","other_cost","build_hours","support_hours"];
  if(fields.some(k=>!nonnegative(f[k])))return null;
  const hours=f.build_hours+f.support_hours;
  if(!hours)return null;
  const profit=f.gross_receipts-f.refunds-f.platform_fees-f.production_cost-
    f.marketing_cost-f.other_cost;
  return {period:f.period,currency:f.currency||null,
    net_profit:Math.round(profit*100)/100,total_hours:hours,
    net_profit_per_hour:Math.round(profit/hours*100)/100};
}
export function evaluateOpportunity(o,{today="2026-11-02"}={}){
  if(!o||typeof o!=="object")throw Error("opportunity_required");
  if(!dateOk(today))throw Error("invalid_date");
  const es=evidenceFor(o),paid=paidRecords(es),competitors=competitorRecords(es);
  const buyerSignals=es.filter(x=>BUYER_TYPES.has(x.type));
  const production=producedEstimate(es);
  const buyer=!!(o?.buyer?.segment?.trim()&&o?.buyer?.problem?.trim());
  const product=!!o?.mvp?.deliverable?.trim();
  const compliance=o?.compliance||{};
  const rightsOk=compliance.rights_clear===true&&compliance.platform_eligible===true;
  const rightsBlocked=compliance.rights_clear===false||compliance.platform_eligible===false;
  const score=commercialScore(o),financial=netProfitPerHour(o.financials);
  const missing=[];
  if(!buyer)missing.push("Name a specific buyer and costly problem.");
  if(!product)missing.push("Define smallest sellable product and intended channel.");
  if(!buyerSignals.length)missing.push("Collect buyer/search evidence; editorial articles alone are not demand.");
  if(!competitors.length)missing.push("Review real competitor formats and asking prices; a listing is not a sale.");
  if(!production)missing.push("Measure or estimate production time using an actual task.");
  if(!paid.length)missing.push("Obtain actual sales or paid-validation evidence before full production.");
  if(!rightsOk)missing.push("Verify IP, origin, and each target platform's acceptance policy.");
  if(!financial)missing.push("Record full revenue, costs, fees and hours before profit/hour can be calculated.");
  let season="evergreen_or_unspecified";
  if(dateOk(o.season?.upload_by))
    season=o.season.upload_by<today?"ideal_upload_window_passed":"planning_window_open";
  const base={
    id:o.id||null,title:o.title||"Untitled",stage:o.stage||"IDEA",
    score_100:score,net_profit_per_hour:financial,
    evidence_counts:{accepted:es.length,ignored:(o.evidence||[]).length-es.length,
      buyer_signals:buyerSignals.length,competing_listings:competitors.length,
      paid_records:paid.length,production_estimate:production},
    season_status:season,missing_evidence:missing,
    chairman_approval_required_for:["spend","full_batch_production","publishing","scaling"],
    system_action:"RESEARCH_AND_REPORT_ONLY"
  };
  const withVerdict=(verdict,reason,next_action)=>({...base,verdict,reason,next_action});
  if(rightsBlocked)return withVerdict("KILL","Rights or platform eligibility failed.",
    "Redesign the product or choose a compliant channel; do not publish.");
  if(!rightsOk)return withVerdict("VALIDATE","Compliance is not cleared.",
    "Check original work provenance and platform rules.");
  if(!buyer||!product||!buyerSignals.length||!competitors.length||!production)
    return withVerdict("VALIDATE","Not enough buyer, competitor or production evidence.",
      "Investigate the missing evidence instead of inventing a score.");
  if(!paid.length)return withVerdict("VALIDATE","Willingness to pay is unverified.",
    "Request Chairman approval for a small, limited-cost listing/MVP experiment.");
  if(score===null)return withVerdict("VALIDATE","Some of eight score factors lack evidence.",
    "Complete the documented 100-point score before requesting full production.");
  if(score<60)return withVerdict("KILL","Opportunity score below 60.","Retire or fundamentally reposition.");
  if(score<70)return withVerdict("WATCH","Opportunity score 60–69.","Monitor; invest in stronger candidates.");
  if(!financial)return withVerdict("VALIDATE","Actual profit and total hours are unknown.",
    "Measure the economics of a completed test period.");
  if(financial.net_profit_per_hour<=0)
    return withVerdict("WATCH","Net profit per total hour is not positive.",
      "Improve costs, price or conversion; do not scale.");
  return withVerdict(score>=80?"BUILD_CANDIDATE":"VALIDATE",
    "Commercial evidence supports review, not autonomous expansion.",
    "Submit source-backed proposal to Chairman; production and publishing remain approval-gated.");
}
