import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createEvidenceRuntime,atomicJson,promoteEvidence} from '../lib/evidence-runtime.mjs';
import {createServer} from '../server.mjs';
const now=Date.parse('2026-10-08T20:00:00Z');
const fixture=(asOf='2026-10-08')=>{
 const source=datasetId=>({datasetId,sourceUpdatedAt:'2026-10-08T18:00:00Z',retrievedAt:'2026-10-08T19:00:00Z',window:{from:'2025-10-08',through:asOf},records:[],reconciled:true,usable:true,quality:{inputRows:0,mappableEntities:0},categories:['Assault']});
 return {schemaVersion:1,fictional:false,reviewStage:'local-data-preview',asOf,retrievedAt:'2026-10-08T19:00:00Z',sources:{reports:source('wg3w-h783'),crashes:source('ubvf-ztfx')}};
};
const bundle=snapshot=>({snapshot,sha256:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')});
async function workspace(t){const dir=await mkdtemp(path.join(tmpdir(),'sidewalk-runtime-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
test('promotion preserves a rollback snapshot and rejects stale, corrupt or failed source candidates',async t=>{
 const dir=await workspace(t),active=path.join(dir,'evidence.json'),candidate=path.join(dir,'candidate.json');
 const prior=bundle(fixture('2026-10-07'));await atomicJson(active,prior);
 for(const fail of ['quality','stale','integrity']){
  const next=fixture();if(fail==='quality')next.sources.reports.usable=false;if(fail==='stale')next.sources.reports.retrievedAt='2026-09-01T00:00:00Z';
  const value=bundle(next);if(fail==='integrity')value.sha256='wrong';await atomicJson(candidate,value);
  await assert.rejects(promoteEvidence(candidate,active,{now}));assert.deepEqual(JSON.parse(await readFile(active)),prior);
 }
 await atomicJson(candidate,bundle(fixture()));assert.equal((await promoteEvidence(candidate,active,{now})).asOf,'2026-10-08');assert.deepEqual(JSON.parse(await readFile(active+'.previous')),prior);
});
test('failed download or publisher reconciliation retains the live snapshot and records redacted status',async t=>{
 for(const failure of ['download','reconciliation']){
  const dataDir=await workspace(t);await atomicJson(path.join(dataDir,'evidence.json'),bundle(fixture('2026-10-07')));
  const runtime=await createEvidenceRuntime({dataDir,now:()=>now,log:()=>{},run:async(script,args)=>{
   if(failure==='download')throw Error('private provider URL or token must not be retained');
   if(script.startsWith('ingest'))await atomicJson(path.join(args.dataDir,'evidence.json'),bundle(fixture()));
   else await atomicJson(path.join(args.auditDir,'publisher-reconciliation.json'),{status:'mismatch',checks:[]});
  }});
  assert.equal((await runtime.refresh()).state,'failed');assert.equal(runtime.current().asOf,'2026-10-07');
  const receipt=await readFile(path.join(dataDir,'refresh-status.json'),'utf8');assert.ok(!receipt.includes('private provider'));await runtime.stop();
 }
});
test('successful refresh runs both checks, swaps the in-memory snapshot and survives restart',async t=>{
 const dataDir=await workspace(t),steps=[];
 const runtime=await createEvidenceRuntime({dataDir,now:()=>now,log:()=>{},run:async(script,args)=>{
  steps.push(script);if(script.startsWith('ingest'))await atomicJson(path.join(args.dataDir,'evidence.json'),bundle(fixture()));
  else await atomicJson(path.join(args.auditDir,'publisher-reconciliation.json'),{status:'matched',checks:[{kind:'reports',match:true},{kind:'crashes',match:true}]});
 }});
 assert.equal(runtime.current(),null);assert.equal((await runtime.refresh()).state,'current');assert.equal(steps.length,2);assert.equal(runtime.current().asOf,'2026-10-08');await runtime.stop();
 const reopened=await createEvidenceRuntime({dataDir,now:()=>now,log:()=>{}});assert.equal(reopened.current().asOf,'2026-10-08');await reopened.stop();
});
test('overlapping refresh requests share one run and shutdown aborts without publishing',async t=>{
 const dataDir=await workspace(t);let calls=0;
 const runtime=await createEvidenceRuntime({dataDir,now:()=>now,log:()=>{},run:async(script,{signal})=>{calls++;await new Promise((resolve,reject)=>{if(signal.aborted)reject(Error('aborted'));else signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});}});
 const first=runtime.refresh(),second=runtime.refresh();assert.equal(first,second);
 await new Promise(r=>setTimeout(r,20));await runtime.stop();assert.ok(calls<=1);assert.equal(runtime.current(),null);assert.equal((await first).state,'failed');
});
test('API reads the current snapshot per request without requiring a process restart',async t=>{
 let current=null;const server=createServer({snapshotProvider:()=>current});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await(await fetch(base+'/api/config')).json()).evidenceConnected,false);current=fixture();
 assert.equal((await(await fetch(base+'/api/config')).json()).evidenceConnected,true);assert.equal((await(await fetch(base+'/api/status')).json()).evidenceAsOf,'2026-10-08');
});
