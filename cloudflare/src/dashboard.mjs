/**
 * Static dashboard shell. All business data is fetched only after authentication.
 * No external scripts, telemetry, cookies, localStorage, or secret persistence.
 */
export const DASHBOARD_HTML = String.raw`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Kitwise — Chairman Office</title>
<style nonce="__NONCE__">
:root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e8ecf4;background:#080f1d;font-synthesis:none}
*{box-sizing:border-box}body{margin:0;min-width:320px}button,input{font:inherit}
button{cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}
button:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid #7d9eff;outline-offset:3px}
a{color:#9dbeff;text-decoration:none}a:hover{text-decoration:underline}
.shell{display:grid;grid-template-columns:235px minmax(0,1fr);min-height:100vh}
.sidebar{background:#0c1626;border-right:1px solid #26364a;padding:26px 18px;display:flex;flex-direction:column;gap:35px}
.brand{display:flex;align-items:center;gap:10px;padding:0 10px}.brand-mark{width:38px;height:38px;border-radius:12px;background:#537cf2;display:grid;place-items:center;color:white;font-weight:900;font-size:23px}
.brand h1{font-size:17px;letter-spacing:.12em;margin:0}.brand small{font-size:10px;color:#91a1bc;letter-spacing:.14em}
.side-label{font-size:10px;text-transform:uppercase;letter-spacing:.17em;color:#7587a3;padding:0 11px;margin:0 0 10px}
.nav{display:flex;flex-direction:column;gap:5px}.nav button{background:transparent;color:#96a9c4;border:0;border-radius:9px;text-align:left;padding:12px;font-size:13px}
.nav button.active{background:#1b2b43;color:#eaf2ff}.nav button:hover{background:#15253c}
.sidebar-bottom{margin-top:auto;padding:14px;border:1px solid #2b3c55;border-radius:12px;color:#9aabc5;font-size:12px}
.sidebar-bottom strong{display:block;color:#dce7fa;margin-bottom:8px}
.workspace{max-width:1400px;width:100%;padding:34px 38px 70px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:34px}
.eyebrow{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#94aacc;font-weight:700}
h2{font-size:32px;letter-spacing:-.04em;margin:8px 0 6px;line-height:1.15;font-weight:680}
p{margin:0;color:#9fadc2;line-height:1.65}.header-right{display:flex;align-items:center;gap:10px}
.status-pill{display:inline-flex;gap:7px;align-items:center;background:#17283d;color:#a8c9ea;border-radius:50px;padding:9px 13px;font-size:12px}
.dot{width:7px;height:7px;border-radius:50%;background:#76d7aa}
.secondary-btn,.primary-btn{border:1px solid #314965;border-radius:9px;padding:10px 15px;color:#e6eefb;background:#1b304d;font-size:13px}
.primary-btn{background:#5b80f5;border-color:#5b80f5;color:white;font-weight:650}
.secondary-btn:hover{background:#253d5c}.primary-btn:hover{background:#7092fa}
.card{background:#101d2f;border:1px solid #243750;border-radius:15px;padding:24px}
.gate{max-width:550px;margin:8vh auto 0;text-align:left}
.gate h3{font-size:23px;line-height:1.3;margin:0 0 10px}
.gate form{margin-top:22px;display:flex;gap:8px;align-items:stretch}
.gate input{min-width:0;flex:1;padding:12px 13px;border:1px solid #3a5274;background:#0b1525;color:#fff;border-radius:9px}
.gate .help{font-size:12px;margin-top:14px}
.notice{background:#172638;border-left:3px solid #789bfa;padding:14px 16px;border-radius:7px;font-size:13px;color:#b8c8e3;margin:22px 0}
.error{color:#ffadb0;font-size:13px;margin-top:12px;min-height:19px}
.hidden{display:none!important}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:24px 0}
.metric{background:#101d2f;border:1px solid #243750;border-radius:13px;padding:19px 20px}
.metric small{font-size:11px;color:#98a9c4;text-transform:uppercase;letter-spacing:.08em}.metric strong{font-size:31px;display:block;margin:12px 0 6px;letter-spacing:-.04em}
.metric span{font-size:11px;color:#8091ad}
.section-title{font-size:18px;margin:30px 0 15px;display:flex;justify-content:space-between;gap:12px;align-items:center}
.two-col{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:16px}
.panel-gap{margin-top:22px}.panel-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.panel-top h4{margin:0;font-size:15px}.dim{font-size:12px;color:#8597b1}
.big-status{font-size:23px;color:#edf4ff;margin:8px 0}
.badge{padding:5px 9px;background:#1f3854;border-radius:50px;font-size:11px;color:#bad7f8}
.badge[data-state="completed"]{background:#153d34;color:#8ae8bf}
.badge[data-state="needs_attention"]{background:#493126;color:#f9b583}
.prose{white-space:pre-wrap;word-break:break-word;line-height:1.7;color:#ccd9ea;font-size:13px}
.no-data{font-size:13px;color:#aab9d1;padding:14px 0}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;text-align:left;font-size:13px}
th{color:#8298b9;font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:650}
td,th{padding:13px 10px;border-bottom:1px solid #263750;vertical-align:top}
td{color:#c9d6e8}td small{color:#889bb5;display:block}
.footer{margin-top:26px;color:#6e829d;font-size:11px}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.list-line{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #253852;padding:12px 0;font-size:13px}
.list-line:last-child{border-bottom:0}
@media(max-width:1050px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.two-col{grid-template-columns:1fr}}
@media(max-width:700px){.shell{display:block}.sidebar{padding:13px 16px;gap:14px;border-bottom:1px solid #26364a}.nav{flex-direction:row;overflow-x:auto}.nav button{white-space:nowrap}.sidebar-bottom,.side-label{display:none}.workspace{padding:21px 17px 50px}.top{align-items:flex-start;flex-direction:column}h2{font-size:26px}.gate form{flex-direction:column}.grid{gap:9px}.metric{padding:14px}.metric strong{font-size:25px}.card{padding:17px}}
</style></head>
<body>
<div class="shell">
<aside class="sidebar" aria-label="Kitwise navigation">
  <div class="brand"><div class="brand-mark">K</div><div><h1>KITWISE</h1><small>COMPANY OS</small></div></div>
  <div><p class="side-label">Chairman Office</p><nav class="nav" aria-label="Dashboard sections">
    <button type="button" class="active" data-view="overview">Overview</button>
    <button type="button" data-view="research">Research intelligence</button>
    <button type="button" data-view="departments">Departments</button>
  </nav></div>
  <div class="sidebar-bottom"><strong>Governance mode</strong>Research only. No automated spending, publishing or company-scale decisions.</div>
</aside>
<main class="workspace">
  <header class="top">
    <div><div class="eyebrow">KITWISE / CHAIRMAN OFFICE</div><h2>Company Command Center</h2><p>Monitor the research pilot and its evidence. Business KPIs remain unverified.</p></div>
    <div class="header-right"><span class="status-pill"><span class="dot"></span>Cloud pilot</span><button id="lock" class="secondary-btn hidden" type="button">Lock</button></div>
  </header>
  <section id="login" class="gate card" aria-labelledby="login-title">
    <div class="eyebrow">PRIVATE ACCESS</div>
    <h3 id="login-title">Unlock your Chairman Office</h3>
    <p>Enter the 64-character access key you set in GitHub. The key stays in this browser tab's memory and is not saved to local storage.</p>
    <form id="login-form"><label class="sr-only" for="access-key">Chairman access key</label><input id="access-key" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="64-character access key" required minlength="64" maxlength="64"><button class="primary-btn" type="submit">Unlock</button></form>
    <div id="login-error" class="error" role="alert"></div>
    <p class="help">The public health check remains available at /health. Research reports are private.</p>
  </section>
  <section id="app" class="hidden" aria-live="polite">
    <div id="view-overview" class="view">
      <div class="grid">
        <div class="metric"><small>Research runs (recent)</small><strong id="runs-count">—</strong><span>Latest 10 recorded runs</span></div>
        <div class="metric"><small>Latest source signals</small><strong id="signal-count">—</strong><span>HN headlines, not sales evidence</span></div>
        <div class="metric"><small>Verified net profit</small><strong>—</strong><span>Finance integration pending</span></div>
        <div class="metric"><small>Products selling</small><strong>—</strong><span>Marketplace data not connected</span></div>
      </div>
      <div class="notice"><strong>Research limitations.</strong> Hacker News headlines are only weak discussion signals. Neither AI interpretations nor the number of sources establish market demand, sales or profitability.</div>
      <div class="two-col">
        <article class="card"><div class="panel-top"><h4>Latest research cycle</h4><span id="latest-state" class="badge">Awaiting data</span></div><div id="latest-day" class="big-status">No run recorded</div><p id="latest-explain">The first scheduled run may not have occurred yet.</p><div class="panel-top panel-gap"><span class="dim" id="last-updated">Not yet available</span></div><button id="trigger" class="primary-btn" type="button">Run research now</button><div id="trigger-message" class="error" role="status"></div></article>
        <article class="card"><div class="panel-top"><h4>AI executive interpretation</h4><span class="badge">Unverified hypothesis</span></div><div id="ai-summary" class="prose">No AI research interpretation is recorded yet.</div></article>
      </div>
    </div>
    <div id="view-research" class="view hidden">
      <h3 class="section-title">Research history</h3>
      <div class="card tbl-wrap"><table><thead><tr><th>UTC day</th><th>Outcome</th><th>Signals</th><th>Reason</th></tr></thead><tbody id="runs-table"><tr><td colspan="4">No research runs recorded.</td></tr></tbody></table></div>
      <h3 class="section-title">Latest evidence <span class="dim">Source: Hacker News discussions</span></h3>
      <div class="card tbl-wrap"><table><thead><tr><th>Topic</th><th>Source headline</th><th>Published</th></tr></thead><tbody id="sources-table"><tr><td colspan="3">No sourced evidence recorded.</td></tr></tbody></table></div>
    </div>
    <div id="view-departments" class="view hidden">
      <h3 class="section-title">AI company departments</h3>
      <div class="card" id="departments-list"></div>
      <div class="notice">These are the planned company roles. Only the basic research and reporting pilot is implemented; a department label does not mean an independent AI employee is active.</div>
    </div>
    <p class="footer">Kitwise Company OS • Pilot stage • No payments, marketplace publishing or unreviewed strategic decisions</p>
  </section>
</main>
</div>
<script nonce="__NONCE__">
(function(){
"use strict";
var key = "";
var data = null;
var loading = false;
var $ = function(id){return document.getElementById(id)};
function setText(id, value){$(id).textContent = String(value == null ? "—" : value)}
function badge(id, state){$(id).textContent = state.replace(/_/g," ");$(id).dataset.state = state}
function cell(row, value){var c=document.createElement("td");c.textContent=String(value==null?"—":value);row.appendChild(c);return c}
function render(){
  if(!data)return;
  var r=data.research||{}, latest=r.latest, runs=Array.isArray(r.runs)?r.runs:[], sources=Array.isArray(r.sources)?r.sources:[];
  setText("runs-count",runs.length);setText("signal-count",latest?latest.evidence_count:"—");
  badge("latest-state",latest?latest.status:"awaiting_first_run");
  setText("latest-day",latest?latest.day:"No run recorded");
  setText("latest-explain",latest?(latest.status==="completed"?"Research completed; opportunity validation is still required.":latest.status==="running"?"Research is processing. Refresh to check results.":"This cycle needs attention: "+(latest.error_code||"unknown reason")):"First run is not recorded. You can start one with the button below.");
  setText("last-updated",latest&&latest.completed_at?"Completed: "+new Date(latest.completed_at).toLocaleString():"No completed run");
  setText("ai-summary",latest&&latest.report&&latest.report.ai_interpretation_unverified?latest.report.ai_interpretation_unverified:"No successful AI interpretation recorded yet.");
  $("trigger").disabled=!r.manual_run_available;
  $("trigger").textContent=r.manual_run_available?"Run research now":"Today’s research already claimed";
  var history=$("runs-table");history.replaceChildren();
  if(!runs.length){var row=document.createElement("tr");cell(row,"No research runs recorded.");history.appendChild(row)}
  runs.forEach(function(item){var row=document.createElement("tr");cell(row,item.day);cell(row,item.status);cell(row,item.evidence_count);cell(row,item.error_code||"—");history.appendChild(row)});
  var list=$("sources-table");list.replaceChildren();
  if(!sources.length){var rr=document.createElement("tr");cell(rr,"No evidence recorded.");list.appendChild(rr)}
  sources.forEach(function(item){
    var row=document.createElement("tr");cell(row,item.topic);
    var c=document.createElement("td");if(typeof item.url==="string" && /^https:\/\/news\.ycombinator\.com\/item\?id=\d+$/.test(item.url)){
      var a=document.createElement("a");a.href=item.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=item.title;c.appendChild(a);
    }else{c.textContent=item.title}row.appendChild(c);cell(row,item.published_at||"—");list.appendChild(row);
  });
  var dept=$("departments-list");dept.replaceChildren();
  (data.departments||[]).forEach(function(item){var row=document.createElement("div");row.className="list-line";
    var title=document.createElement("strong");title.textContent=item.name;
    var state=document.createElement("span");state.className="badge";state.textContent=String(item.status).replace(/_/g," ");state.dataset.state=item.status;
    row.appendChild(title);row.appendChild(state);dept.appendChild(row)});
}
async function loadOverview(){
  var response=await fetch("/api/overview",{headers:{"Authorization":"Bearer "+key},cache:"no-store"});
  var body=await response.json();
  if(!response.ok){var err=new Error(body.error||"request_failed");err.status=response.status;throw err}
  data=body;render();
}
function lock(message){key="";data=null;$("app").classList.add("hidden");$("login").classList.remove("hidden");$("lock").classList.add("hidden");$("access-key").value="";setText("login-error",message||"");}
$("login-form").addEventListener("submit",async function(event){
  event.preventDefault();if(loading)return;loading=true;key=$("access-key").value.trim();setText("login-error","Connecting...");
  try{await loadOverview();$("login").classList.add("hidden");$("app").classList.remove("hidden");$("lock").classList.remove("hidden");$("access-key").value="";setText("login-error","")}
  catch(error){lock(error.status===503?"Chairman access is not yet configured on the cloud service.":error.status===401?"Incorrect access key.":"Couldn't load company data. Try again.")}
  finally{loading=false}
});
$("lock").addEventListener("click",function(){lock("Office locked. Access key cleared from this tab.")});
document.querySelectorAll("[data-view]").forEach(function(btn){btn.addEventListener("click",function(){
  document.querySelectorAll("[data-view]").forEach(function(other){other.classList.toggle("active",other===btn)});
  document.querySelectorAll(".view").forEach(function(section){section.classList.toggle("hidden",section.id!=="view-"+btn.dataset.view)});
})});
$("trigger").addEventListener("click",async function(){
  if(!key||loading||!data||!data.research.manual_run_available)return;
  loading=true;$("trigger").disabled=true;setText("trigger-message","Starting one bounded research cycle...");
  try{
    var response=await fetch("/api/research/run",{method:"POST",headers:{"Authorization":"Bearer "+key},cache:"no-store"});
    var body=await response.json();
    if(!response.ok)throw new Error(body.error||"trigger_failed");
    setText("trigger-message","Request accepted. The cycle will complete in the cloud; press Refresh below to see its result.");
    window.setTimeout(async function(){try{await loadOverview()}catch(_){}},10000);
  }catch(error){setText("trigger-message","Could not start research: "+error.message);$("trigger").disabled=false}
  finally{loading=false}
});
var refresh=document.createElement("button");refresh.type="button";refresh.className="secondary-btn";refresh.textContent="Refresh company data";refresh.addEventListener("click",async function(){
  if(!key)return;refresh.disabled=true;try{await loadOverview()}catch(_){setText("trigger-message","Could not refresh data.")}finally{refresh.disabled=false}
});$("app").insertBefore(refresh,$("app").firstChild);
})();
</script>
</body></html>`;
