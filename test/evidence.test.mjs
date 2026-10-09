import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {normalizeReports,normalizeCrashes} from '../lib/normalize-evidence.mjs';
import {downloadSource} from '../lib/socrata.mjs';
import {sourceHealth,liveContext,verifyBundle} from '../lib/live-evidence.mjs';
import {attachLiveContext} from '../dist/lib/live-comparison.mjs';
import {compareJourney} from '../dist/lib/analysis.mjs';
import {demoJourney,addresses} from '../dist/lib/demo.mjs';
const w={from:'2025-10-07',through:'2026-10-07'};
const row={row_id:'r1',incident_id:'i1',incident_number:'n1',incident_date:'2026-05-01T00:00:00',report_type_description:'Initial',incident_category:'Assault',incident_code:'04134',longitude:'-122.4',latitude:'37.79'};
const crosswalk=[{inc_code:'004134',category:'Assault'},{inc_code:'003000',category:'Robbery'}];
const source=(id,records)=>({datasetId:id,title:id,url:'https://data.sf.gov/d/'+id,sourceUpdatedAt:'2026-10-07T18:00:00Z',retrievedAt:'2026-10-08T02:00:00Z',window:{...w},records,reconciled:true,usable:true,quality:{inputRows:records.length,mappableEntities:records.length},categories:['Assault','Robbery']});
const snapshot=()=>({schemaVersion:1,fictional:false,reviewStage:'local-data-preview',asOf:'2026-10-07',sources:{reports:source('wg3w-h783',[{id:'i1',kind:'incident',date:'2026-05-01',coordinates:[-122.4,37.79],categories:['Assault','Robbery']}]),crashes:source('ubvf-ztfx',[{id:'c1',kind:'collision',date:'2026-05-01',coordinates:[-122.4,37.79],categories:['Vehicle-Pedestrian'],label:'A / B'}])}});
const blocks={manifest:{datasetId:'e2st-aufe',vintage:2020},blocks:[{id:'060750101001000',bbox:[-122.401,37.789,-122.399,37.791],geometry:{type:'MultiPolygon',coordinates:[[[[-122.401,37.789],[-122.399,37.789],[-122.399,37.791],[-122.401,37.791],[-122.401,37.789]]]]}}]};
const now=Date.parse('2026-10-08T03:00:00Z');
test('report rows collapse to one report while preserving multiple categories; supplements are excluded',()=>{
 const out=normalizeReports([row,{...row,row_id:'r2',incident_category:'Robbery',incident_code:'03000'},{...row,row_id:'r3',incident_id:'i2',report_type_description:'Initial Supplement'}],w,crosswalk);
 assert.equal(out.records.length,1);assert.deepEqual(out.records[0].categories,['Assault','Robbery']);assert.equal(out.quality.rejectedRows,1);assert.equal(out.quality.taxonomyMismatches,0);
});
test('missing coordinates, conflicting report locations and invalid dates never become mapped zero coordinates',()=>{
 const out=normalizeReports([{...row,longitude:''},{...row,incident_id:'conflict'},{...row,incident_id:'conflict',latitude:'37.80'},{...row,incident_date:'2026-02-30'}],w,crosswalk);
 assert.equal(out.records.length,0);assert.equal(out.quality.missingLocationEntities,1);assert.equal(out.quality.conflictingEntities,1);assert.equal(out.quality.rejectedRows,1);
});
test('pedestrian inclusion uses all parties, counts crashes once and audits group disagreement',()=>{
 const crash={unique_id:'c1',case_id_pkey:'case1',collision_date:'2026-05-01',tb_longitude:'-122.4',tb_latitude:'37.79',dph_col_grp_description:'Vehicle-Pedestrian'};
 const party={case_id_pkey:'case1',collision_date:'2026-05-01',party_type:'Pedestrian'};
 const out=normalizeCrashes([crash],[party,{...party,party_number_ckey:'3'}],w);
 assert.equal(out.records.length,1);assert.equal(out.quality.pedestrianPartyCases,1);assert.equal(out.quality.groupOnlyCases,0);
 assert.equal(normalizeCrashes([crash],[],w).quality.groupOnlyCases,1);
});
test('unknown category codes are counted as taxonomy mismatches for withholding',()=>{
 assert.equal(normalizeReports([{...row,incident_code:'99999'}],w,crosswalk).quality.taxonomyMismatches,1);
});
test('publisher reads reconcile ordered pages and a stable source version',async()=>{
 const meta={name:'Example',rowsUpdatedAt:1791396000,viewLastModified:1,columns:[{fieldName:'id'},{fieldName:'date'}]};let pages=0;
 const fetcher=async raw=>{const u=new URL(raw);if(u.pathname.includes('/api/views/'))return Response.json(meta);const q=u.searchParams;if(q.get('$select').startsWith('count'))return Response.json([{rows:'3',unique_keys:'3'}]);pages++;return Response.json(q.get('$offset')==='2'?[{id:'c',date:'x'}]:[{id:'a',date:'x'},{id:'b',date:'x'}]);};
 const out=await downloadSource({id:'abcd-1234',key:'id',where:'1=1',fields:['id','date']},{fetcher,pageSize:2});assert.equal(out.records.length,3);assert.equal(pages,2);assert.equal(out.manifest.reconciled,true);
});
test('duplicate keys, source revisions, and provider errors fail retrieval explicitly',async()=>{
 for(const mode of ['duplicate','revision','error']){
 let metaReads=0;const fetcher=async raw=>{const u=new URL(raw);if(mode==='error')return new Response('',{status:429});if(u.pathname.includes('/api/views/'))return Response.json({name:'x',rowsUpdatedAt:100+(mode==='revision'?metaReads++:0),columns:[{fieldName:'id'}]});if(u.searchParams.get('$select').startsWith('count'))return Response.json([{rows:'2',unique_keys:'2'}]);return Response.json(mode==='duplicate'?[{id:'a'},{id:'a'}]:[{id:'a'},{id:'b'}]);};
 await assert.rejects(downloadSource({id:'abcd-1234',key:'id',where:'1=1',fields:['id']},{fetcher}));
 }
});
test('snapshot integrity and fictional provenance are enforced',()=>{
 const s=snapshot(),bundle={snapshot:s,sha256:createHash('sha256').update(JSON.stringify(s)).digest('hex')};assert.equal(verifyBundle(bundle),s);s.fictional=true;assert.throws(()=>verifyBundle(bundle));
});
test('sources stale independently and future refreshes fail',()=>{
 const s=snapshot();assert.equal(sourceHealth(s.sources.reports,'reports',now).usable,true);
 assert.equal(sourceHealth(s.sources.reports,'reports',now+4*86400000).usable,false);
 assert.equal(sourceHealth(s.sources.crashes,'crashes',now+4*86400000).usable,true);
 assert.equal(sourceHealth({...s.sources.reports,retrievedAt:'2099-01-01'},'reports',now).usable,false);
});
test('live police areas never enter route incident counts; months and stale states behave consistently',()=>{
 const j=demoJourney(...addresses);j.mode='live';j.routes=[{id:'r1',name:'Walk A',distance:700,duration:600,coordinates:[[-122.401,37.79],[-122.399,37.79]]},{id:'r2',name:'Walk B',distance:900,duration:720,coordinates:[[-122.401,37.7895],[-122.399,37.7895]]}];
 j.evidence=liveContext(snapshot(),j.routes,now,blocks);assert.equal(j.evidence.areaReports.windows[6].count,1);assert.equal(j.evidence.areaReports.windows[3].count,0);
 const r=attachLiveContext(compareJourney(j),j,{buffer:50,incidentMonths:6});assert.equal(r.routes[0].counts.collision,1);assert.ok(r.routes.every(x=>x.counts.incident===null&&x.matches.every(m=>m.kind==='collision')));assert.equal(r.takeaway.routeId,undefined);
 j.evidence=liveContext(snapshot(),j.routes,now+20*86400000,blocks);const stale=attachLiveContext(compareJourney(j),j,{buffer:50,incidentMonths:6});assert.equal(stale.routes[0].counts,null);assert.equal(stale.areaReports.count,null);assert.deepEqual(stale.areaReports.cells,[]);assert.equal(stale.routes[0].reportAreas,null);
});
test('a recomputed checksum does not bypass date, entity and category validation',()=>{
 for(const mutate of [s=>s.sources.reports.window.through='2026-10-09',s=>s.sources.reports.records.push(s.sources.reports.records[0]),s=>s.sources.reports.records[0].coordinates=[-73,40],s=>s.sources.reports.records[0].categories=['Unreviewed category']]){
  const s=snapshot();mutate(s);const b={snapshot:s,sha256:createHash('sha256').update(JSON.stringify(s)).digest('hex')};assert.throws(()=>verifyBundle(b));
 }
});
test('incomplete police periods stay unavailable while collision context remains usable',()=>{
 const s=snapshot();s.sources.reports.window.from='2026-07-07';
 const route={id:'one',duration:60,distance:200,coordinates:[[-122.401,37.79],[-122.399,37.79]]};
 const e=liveContext(s,[route],now,blocks);assert.equal(e.areaReports.windows[6].count,null);assert.deepEqual(e.areaReports.windows[6].cells,[]);assert.equal(e.areaReports.windows[12].usable,false);assert.equal(e.areaReports.windows[3].usable,true);assert.equal(e.sources.crashes.health.usable,true);
});
test('quarterly crash updates and daily report updates have distinct freshness policies',()=>{
 const s=snapshot();const old='2026-08-01T18:00:00Z';
 assert.equal(sourceHealth({...s.sources.crashes,sourceUpdatedAt:old},'crashes',now).usable,true);
 assert.equal(sourceHealth({...s.sources.reports,sourceUpdatedAt:old},'reports',now).usable,false);
 assert.equal(sourceHealth({...s.sources.crashes,sourceUpdatedAt:'2026-01-01T18:00:00Z'},'crashes',now).usable,false);
});
test('live API emits coarse cells without police point coordinates, report identifiers or fictional records',async t=>{
 const {createServer}=await import('../server.mjs');
 const route={duration:600,distance:200,geometry:{coordinates:[[-122.401,37.79],[-122.399,37.79]]}};
 const server=createServer({token:'pk.fixture',snapshot:snapshot(),blocks,now:()=>now,fetcher:async()=>Response.json({routes:[route]})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const config=await(await fetch(base+'/api/config')).json();assert.equal(config.evidenceConnected,true);
 const response=await fetch(base+'/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:route.geometry.coordinates[0],destination:route.geometry.coordinates[1]})});
 const result=await response.json();assert.equal(response.status,200);assert.equal(result.evidence.fictional,false);assert.equal(result.evidence.areaReports.windows[6].count,1);assert.ok(result.evidence.records.every(r=>r.kind==='collision'));assert.ok(!JSON.stringify(result).includes('"i1"'));assert.equal(response.headers.get('cache-control'),'no-store');
});
test('publisher category casing is normalized but missing crosswalks and unknown codes fail',()=>{
 assert.equal(normalizeReports([row],w,[{inc_code:'04134',category:'assault'}]).quality.taxonomyMismatches,0);
 assert.equal(normalizeReports([row],w,[]).quality.taxonomyMismatches,1);
});
test('invalid pedestrian join keys and mismatched crash dates are counted for withholding',()=>{
 const crash={unique_id:'c1',case_id_pkey:'case1',collision_date:'2026-05-01',tb_longitude:'-122.4',tb_latitude:'37.79',dph_col_grp_description:'Vehicle-Pedestrian'};
 const out=normalizeCrashes([crash],[{case_id_pkey:'',collision_date:'2026-05-01',party_type:'Pedestrian'},{case_id_pkey:'case1',collision_date:'2026-05-02',party_type:'Pedestrian'}],w);
 assert.equal(out.quality.rejectedPartyRows,1);assert.equal(out.quality.partyDateMismatches,1);
});
