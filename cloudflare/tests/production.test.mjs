import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {productionReadiness,productionOverview,runProductionTick,nextReset,validateBrief,validateCaption,
  decodeGeneratedImage,jpegDimensions,classifyProductionError,upscaleImage,DAILY_RESERVATION,JOB_RESERVATION} from '../src/production.mjs';
const NOW=()=>new Date('2026-11-16T08:00:00Z');
// Synthetic JPEG header used only for control-flow and dimension checks, not a quality test.
function header(w=1024,h=1024){return Uint8Array.from([255,216,255,192,0,11,8,h>>8,h&255,w>>8,w&255,1,1,17,0,255,217])}
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const caption={title:'Peach picture frame on a studio background',description:'A peach-colored empty frame on a plain warm background.',
  keywords:['frame','picture frame','peach','mockup','background','empty','studio','display'],visual_pass:true,issues:[]};
const brief={prompt:'One realistic peach picture frame on a clean studio background with natural soft lighting.',buyer:'Graphic designers preparing layouts',source_ids:['S1']};
const research={source_documents:[{id:'S1',title:'Adobe components'},{id:'S2',title:'Adobe trends'}],ai_interpretation_unverified:'Synthetic test hypothesis, not demand.'};
class Store {
  constructor(){this.days=new Map();this.jobs=new Map();this.months=new Map();this.research=research;this.pending=0;}
  prepare(sql){
    return {bind:(...args)=>this.statement(sql,args),...this.statement(sql,[])};
  }
  statement(sql,args){
    return {first:async()=>{
      if(sql.includes('FROM curated_research_runs'))return this.research?{day:args[0],report_json:JSON.stringify(this.research)}:null;
      if(sql.includes("WHERE status IN ('needs_resolution','needs_review')"))return {count:this.pending};
      if(sql.includes("WHERE status IN ('running','uncertain')"))return {count:[...this.jobs.values()].filter(j=>['running','uncertain'].includes(j.status)).length};
      if(sql.includes('SUM(bytes'))return {count:0,total:0};
      if(sql.includes('FROM production_days'))return this.days.get(args[0])||null;
      throw Error('Unexpected first SQL '+sql);
    },all:async()=>({results:[]}),run:async()=>this.run(sql,args)};
  }
  run(sql,a){
    let changes=0;
    if(sql.startsWith('INSERT OR IGNORE INTO production_days')){
      if(!this.days.has(a[0])){this.days.set(a[0],{day:a[0],reserved_neurons:0,attempted_jobs:0});changes=1}
    }else if(sql.startsWith('UPDATE production_days SET reserved_neurons')){
      const d=this.days.get(a[1]);
      if(d.reserved_neurons+a[2]<=a[3]&&(!d.paused_until||d.paused_until<=a[4])&&![...this.jobs.values()].some(j=>['running','uncertain'].includes(j.status))){d.reserved_neurons+=a[0];d.attempted_jobs++;changes=1}
    }else if(sql.startsWith('INSERT INTO production_jobs')){
      if(this.lastChanges===1){this.jobs.set(a[0],{id:a[0],day:a[1],status:'running'});changes=1}
    }else if(sql.startsWith('UPDATE production_days SET paused_until')){
      Object.assign(this.days.get(a[2]),{paused_until:a[0],pause_reason:a[1]});changes=1;
    }else if(sql.startsWith('UPDATE production_jobs SET object_key')){
      Object.assign(this.jobs.get(a.at(-1)),{object_key:a[0],width:a[2],height:a[3],bytes:a[4]});changes=1;
    }else if(sql.startsWith("UPDATE production_jobs SET status='failed'")){
      Object.assign(this.jobs.get(a[2]),{status:'failed',error_code:a[1]});changes=1;
    }else if(sql.startsWith('UPDATE production_jobs SET status=?')){
      Object.assign(this.jobs.get(a[4]),{status:a[0],metadata:JSON.parse(a[2]),qa:JSON.parse(a[3])});this.pending++;changes=1;
    }else if(sql.startsWith('INSERT OR IGNORE INTO production_months')){this.months.set(a[0],this.months.get(a[0])||0);changes=1}
    else if(sql.startsWith('UPDATE production_months')){const n=this.months.get(a[0]);if(n<100){this.months.set(a[0],n+1);changes=1}}
    else if(sql.startsWith('UPDATE production_jobs SET upscaled_object_key')){Object.assign(this.jobs.get(a[4]),{upscaled_object_key:a[0],final_width:a[1],final_height:a[2]});changes=1}
    else throw Error('Unexpected run SQL '+sql);
    this.lastChanges=changes;return {meta:{changes}};
  }
  async batch(statements){
    const previous=this.batchTail||Promise.resolve();let unlock;
    this.batchTail=new Promise(resolve=>{unlock=resolve});
    await previous;
    try{const result=[];for(const s of statements)result.push(await s.run());return result}
    finally{unlock()}
  }
}
function context(){
  const stored=new Map(),calls=[];
  return {DB:new Store(),WORKERS_PLAN:'free',PRODUCTION_ENABLED:'true',ASSET_STORAGE_FREE_CONFIRMED:'true',VISION_MODEL_VERIFIED:'true',
    calls,stored,ASSETS:{put:async(k,v)=>stored.set(k,v),head:async k=>stored.has(k)?{size:stored.get(k).length}:null},
    AI:{run:async(model,input)=>{calls.push({model,input});return model.includes('glm')?{response:JSON.stringify(brief)}:model.includes('flux')?{image:b64(header())}:{response:JSON.stringify(caption)}}}};
}

test('missing storage, plan or license blocks all model calls before generation',async()=>{
  const e=context();delete e.ASSETS;delete e.VISION_MODEL_VERIFIED;e.WORKERS_PLAN='paid';
  const out=await runProductionTick(e,{now:NOW});
  assert.equal(out.status,'blocked');assert.equal(e.calls.length,0);assert.equal(e.DB.days.size,0);
  assert.ok(out.blockers.includes('durable_asset_storage_not_configured'));
  assert.ok(out.blockers.includes('workers_free_plan_not_confirmed'));
  assert.ok(out.blockers.includes('vision_model_not_verified'));
});
test('production requires today\'s completed research and at least two source IDs',async()=>{
  const e=context();e.DB.research=null;
  assert.equal((await runProductionTick(e,{now:NOW})).status,'awaiting_research');
  assert.equal(e.calls.length,0);
});
test('successful pilot persists original before image-grounded metadata and holds low resolution',async()=>{
  const e=context(),result=await runProductionTick(e,{now:NOW});
  assert.equal(result.status,'needs_resolution');assert.equal(result.width,1024);
  assert.equal(result.transferred,false);assert.equal(result.submitted,false);
  assert.equal(e.stored.size,1);assert.equal(e.calls.length,3);
  assert.deepEqual(Object.keys(e.calls[1].input).sort(),['prompt','steps']);
  assert.match(e.calls[2].input.messages[0].content[1].image_url.url,/^data:image\/jpeg;base64,/);
  const job=[...e.DB.jobs.values()][0];assert.equal(job.metadata.ai_generated,true);
  assert.deepEqual(job.metadata.targets,['adobe']);assert.equal(job.qa.resolution_ok,false);
  assert.equal(e.DB.days.get('2026-11-16').reserved_neurons,JOB_RESERVATION);
});
test('a three-preview unresolved backlog stops generation before spending',async()=>{
  const e=context();e.DB.pending=3;
  const out=await runProductionTick(e,{now:NOW});assert.deepEqual(out.blockers,['review_backlog_full']);
  assert.equal(e.calls.length,0);assert.equal(e.DB.days.size,0);
});
test('concurrent triggers claim only one active job',async()=>{
  const e=context();const r=await Promise.all(Array.from({length:4},()=>runProductionTick(e,{now:NOW})));
  assert.equal(r.filter(x=>x.status==='needs_resolution').length,1);
  assert.equal(e.calls.length,3);assert.equal(e.DB.days.get('2026-11-16').reserved_neurons,JOB_RESERVATION);
});
test('daily local reservations stop before overflow and reset on next UTC day',async()=>{
  const e=context();e.DB.days.set('2026-11-16',{reserved_neurons:DAILY_RESERVATION,attempted_jobs:15});
  assert.equal((await runProductionTick(e,{now:NOW})).status,'paused_or_already_running');
  assert.equal(e.calls.length,0);
  assert.equal((await runProductionTick(e,{now:()=>new Date('2026-11-17T00:01:00Z')})).status,'needs_resolution');
  assert.equal(e.DB.days.get('2026-11-16').reserved_neurons,DAILY_RESERVATION);
});
test('provider daily quota pauses until midnight and retains charged reservation without leaking errors',async()=>{
  const e=context();e.AI.run=async()=>{throw Object.assign(Error('PRIVATE CREDENTIALS'),{status:429,code:3036})};
  const out=await runProductionTick(e,{now:NOW});
  assert.equal(out.paused_until,'2026-11-17T00:00:00.000Z');
  assert.equal(out.error_code,'daily_ai_quota_exhausted');
  assert.equal(e.DB.days.get('2026-11-16').reserved_neurons,JOB_RESERVATION);
  assert.doesNotMatch(JSON.stringify(out)+JSON.stringify([...e.DB.jobs.values()]),/PRIVATE/);
  assert.equal((await runProductionTick(e,{now:NOW})).status,'paused_or_already_running');
});
test('capacity/rate limits get a bounded cooldown rather than an unbounded retry loop',()=>{
  assert.deepEqual(classifyProductionError({status:429,code:3040}),{code:'ai_rate_or_capacity_limit',pause:'hour'});
  assert.equal(nextReset(new Date('2026-12-31T23:59:59Z')),'2027-01-01T00:00:00.000Z');
});
test('uncertain or stalled running jobs never regenerate automatically',async()=>{
  const e=context();e.DB.jobs.set('stalled',{status:'uncertain'});
  assert.equal((await runProductionTick(e,{now:NOW})).status,'paused_or_already_running');
  assert.equal(e.calls.length,0);
});
test('vision failure preserves stored original and never creates a ready or transferred record',async()=>{
  const e=context(),normal=e.AI.run;e.AI.run=async(model,body)=>{if(model.includes('gemma'))throw {status:403};return normal(model,body)};
  const out=await runProductionTick(e,{now:NOW});assert.equal(out.status,'failed');
  assert.equal(e.stored.size,1);assert.equal(out.source_retained,true);
  assert.equal([...e.DB.jobs.values()][0].error_code,'ai_access_denied');
});
test('malformed image headers, oversized images and unsupported source references fail',()=>{
  assert.throws(()=>decodeGeneratedImage({image:b64(new Uint8Array([1,2,3]))}),/invalid_generated_jpeg/);
  assert.throws(()=>jpegDimensions(new Uint8Array([255,216,255,192,255,255])),/invalid_generated_jpeg/);
  assert.throws(()=>decodeGeneratedImage({image:'A'.repeat(3_000_000)}),/too_large/);
  assert.throws(()=>validateBrief({...brief,source_ids:['invented']},['S1']),/brief_invalid/);
  assert.deepEqual(jpegDimensions(header(2048,2048)),{width:2048,height:2048});
});
test('metadata preserves relevant keyword order and rejects false resolution or transparency claims',()=>{
  assert.deepEqual(validateCaption(caption).keywords,caption.keywords);
  for(const title of ['Transparent frame background','4K realistic picture frame'])assert.throws(()=>validateCaption({...caption,title}),/metadata_invalid/);
  assert.throws(()=>validateCaption({...caption,keywords:['one']}),/metadata_invalid/);
});
test('optional upscale uses explicit ESRGAN request and validates actual output dimensions',async()=>{
  const calls=[];const e={IMAGES_FREE_CONFIRMED:'true',IMAGES:{input:()=>({transform:options=>{calls.push(options);return {output:async()=>({response:()=>new Response(header(2048,2048))})}}})}};
  const result=await upscaleImage(e,header(),1024,1024);
  assert.equal(result.width,2048);assert.equal(calls[0].upscale,'generate');
  assert.equal(calls[0].fit,'contain');
  assert.equal(await upscaleImage({},header(),1024,1024),null);
});
test('optional upscale cannot silently accept original-size or oversized output',async()=>{
  const e={IMAGES_FREE_CONFIRMED:'true',IMAGES:{input:()=>({transform:()=>({output:async()=>({response:()=>new Response(header())})})})}};
  await assert.rejects(()=>upscaleImage(e,header(),1024,1024),/upscale_output_invalid/);
});
test('optional upscale preserves original plus final and queues independent QA',async()=>{
  const e=context();e.IMAGES_FREE_CONFIRMED='true';e.IMAGES={input:()=>({transform:()=>({output:async()=>({response:()=>new Response(header(2048,2048))})})})};
  const result=await runProductionTick(e,{now:NOW});
  assert.equal(result.status,'needs_review');assert.equal(e.stored.size,2);
  assert.equal(e.DB.months.get('2026-11'),1);
  assert.equal([...e.DB.jobs.values()][0].qa.upscaled,true);
  assert.equal([...e.DB.jobs.values()][0].qa.submission_status,'not_submitted');
});
test('monthly transform reservations stop independently of the daily neuron reset',async()=>{
  const e=context();e.IMAGES_FREE_CONFIRMED='true';e.IMAGES={input:()=>{throw Error('must_not_transform')}};e.DB.months.set('2026-11',100);
  assert.equal((await runProductionTick(e,{now:NOW})).status,'needs_resolution');
  assert.equal(e.DB.months.get('2026-11'),100);
});
test('production API requires existing auth and fails closed without prerequisites',async()=>{
  const key='a'.repeat(64),env={CHAIRMAN_DASHBOARD_KEY:key};
  const request=(path,method='GET',auth=false)=>new Request('https://kitwise.test'+path,{method,headers:auth?{authorization:'Bearer '+key}:{}});
  assert.equal((await worker.fetch(request('/api/production'),env)).status,401);
  const out=await worker.fetch(request('/api/production/run','POST',true),env);
  assert.equal(out.status,409);assert.equal((await out.json()).status,'blocked');
  const wrong=new Request('https://kitwise.test/api/production/run',{method:'POST',headers:{authorization:'Bearer '+key,origin:'https://wrong.test'}});
  assert.equal((await worker.fetch(wrong,env)).status,403);
  assert.equal((await worker.fetch(request('/api/production/assets/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/image'),env)).status,401);
});
test('a production cron pulse never starts public-source research',async()=>{
  const tasks=[];await worker.scheduled({cron:'*/15 * * * *'},{}, {waitUntil:p=>tasks.push(p)});
  assert.equal(tasks.length,1);assert.equal((await tasks[0]).status,'blocked');
});
test('overview remains readable when optional production schema is absent',async()=>{
  const out=await productionOverview({DB:{prepare(){throw Error('not installed')}}},NOW());
  assert.equal(out.can_generate,false);assert.ok(out.blockers.includes('production_schema_or_read_unavailable'));
});

test('KV preview spool is private immutable storage; it never replaces the D1 claim ledger',async()=>{
  const {assetStore}=await import('../src/production.mjs');
  const data=new Map();const env={ASSET_KV:{
    put:async(k,v,options)=>{data.set(k,{value:v.buffer,metadata:options.metadata})},
    getWithMetadata:async k=>data.get(k)||{value:null,metadata:null}
  }};
  const store=assetStore(env),bytes=header();
  await store.put('production/test.jpg',bytes,{customMetadata:{ai_generated:'true'}});
  assert.equal((await store.head('production/test.jpg')).size,bytes.length);
  assert.equal(data.get('production/test.jpg').metadata.ai_generated,'true');
  const read=await assetStore(env).get('production/test.jpg');
  assert.deepEqual(new Uint8Array(await new Response(read.body).arrayBuffer()),bytes);
  assert.equal(await store.get('missing'),null);
});
test('SDK text error codes are classified without storing provider messages or accepting licenses',()=>{
  assert.equal(classifyProductionError(Error('AiError: 3036: PRIVATE')).code,'daily_ai_quota_exhausted');
  assert.equal(classifyProductionError({status:403,code:5016}).code,'model_license_required');
  assert.equal(classifyProductionError(Error('AiError: 5035: PRIVATE')).code,'paid_model_not_allowed');
});
