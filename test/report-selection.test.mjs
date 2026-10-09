import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {normalizeReports} from '../lib/normalize-evidence.mjs';
import {reportCategories} from '../dist/lib/report-scope.mjs';
import {aggregateBlockReports,selectedBlockReports} from '../lib/block-evidence.mjs';
import {optionsOutsideAreas} from '../dist/lib/report-areas.mjs';
import {createServer} from '../server.mjs';
const from='2026-04-07',through='2026-10-07',window={from,through};
const block=(id,west,east)=>({id,bbox:[west,37.789,east,37.791],geometry:{type:'MultiPolygon',coordinates:[[[[west,37.789],[east,37.789],[east,37.791],[west,37.791],[west,37.789]]]]}});
const a=block('060750101001000',-122.403,-122.4),b=block('060750101001001',-122.4,-122.397),blocks={blocks:[a,b],manifest:{datasetId:'e2st-aufe'}};
const row=(id,lon,categories,date=from)=>({id,kind:'incident',date,coordinates:[lon,37.79],categories});
const rows=[row('private-shared',-122.4,['Homicide','Assault']),row('private-left',-122.402,['Rape']),row('private-right',-122.398,['Robbery','Sex Offense'],through),row('private-old',-122.4,['Assault'],'2026-04-06')];
const source={datasetId:'wg3w-h783',records:rows,retrievedAt:'2026-10-08T02:00:00Z',sourceUpdatedAt:'2026-10-07T18:00:00Z',window:{from:'2025-10-07',through},reconciled:true,usable:true,quality:{inputRows:rows.length,mappableEntities:rows.length},categories:reportCategories};
const snapshot={fictional:false,asOf:through,sources:{reports:source}};
const bounds={west:-122.52,east:-122.35,south:37.7,north:37.83};
test('five reviewed categories use source-code validation and multi-category reports count once',()=>{
 const input=reportCategories.map((category,i)=>({row_id:'r'+i,incident_id:i<2?'shared':'i'+i,incident_date:from,report_type_description:'Initial',incident_category:category,incident_code:String(i+1),latitude:'37.79',longitude:'-122.4'}));
 const crosswalk=reportCategories.map((category,i)=>({inc_code:String(i+1),category:category.toLowerCase()}));
 const result=normalizeReports(input,window,crosswalk);assert.equal(result.quality.taxonomyMismatches,0);assert.equal(result.records.length,4);assert.ok(result.records.some(r=>r.categories.includes('Rape')));assert.ok(result.records.some(r=>r.categories.includes('Homicide')));
 assert.equal(normalizeReports(input,window,crosswalk.filter(r=>r.category!=='rape')).quality.taxonomyMismatches,1);
});
test('combined selection deduplicates shared intersections and categories with inclusive dates',()=>{
 const individual=aggregateBlockReports(rows,window,bounds,blocks,reportCategories);assert.deepEqual(individual.cells.map(c=>c.count),[2,2]);
 const combined=selectedBlockReports(rows,window,[a.id,b.id,a.id],blocks,reportCategories);assert.equal(combined.count,3);assert.equal(combined.categories.find(c=>c.category==='Homicide').count,1);assert.equal(combined.categories.find(c=>c.category==='Assault').count,1);assert.equal(combined.categories.reduce((n,c)=>n+c.count,0),5);
 assert.equal(selectedBlockReports(rows,{from:'2026-07-07',through},[a.id,b.id],blocks,reportCategories).count,1);
 assert.equal(selectedBlockReports(rows,window,[],blocks,reportCategories).count,0);
 assert.ok(!JSON.stringify(combined).includes('private-'));assert.ok(!JSON.stringify(combined).includes('coordinates'));
});
test('a combined bypass must clear every selected polygon and missing geometry fails closed',()=>{
 const routes=[{id:'left',coordinates:[[-122.402,37.788],[-122.402,37.792]]},{id:'right',coordinates:[[-122.398,37.788],[-122.398,37.792]]},{id:'outside',coordinates:[[-122.41,37.788],[-122.41,37.792]]}];
 assert.deepEqual(optionsOutsideAreas([a.id,b.id],routes,blocks.blocks).map(r=>r.id),['outside']);
 assert.deepEqual(optionsOutsideAreas([a.id,'missing'],routes,blocks.blocks),[]);assert.deepEqual(optionsOutsideAreas([],routes,blocks.blocks),[]);
});
test('selection API returns only reconciled aggregates and rejects malformed or changed-snapshot queries',async t=>{
 const server=createServer({token:'',snapshot,blocks,now:()=>Date.parse('2026-10-08T18:00:00Z')});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}/api/report-selection`,body={ids:[a.id,b.id],incidentMonths:6,asOf:through,retrievedAt:source.retrievedAt};
 const post=(data,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 const res=await post(body),value=await res.json();assert.equal(res.status,200);assert.equal(value.count,3);assert.equal(value.areaCount,2);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(value.usable,true);assert.ok(!JSON.stringify(value).includes('private-'));assert.equal(value.categories.length,5);
 for(const change of [{ids:[a.id,a.id]},{ids:['060759999999999']},{ids:['bad']},{incidentMonths:1},{ids:Array(101).fill(a.id)}])assert.equal((await post({...body,...change})).status,400);
 assert.equal((await post({...body,asOf:'2026-10-06'})).status,409);assert.equal((await post({...body,retrievedAt:'2026-10-01'})).status,409);
 assert.equal((await post(body,{Origin:'https://other.example'})).status,403);
});
test('selection API never turns stale or partial report coverage into zero',async t=>{
 for(const kind of ['stale','partial']){
 const s={...snapshot,sources:{reports:{...source,window:{...source.window,...(kind==='partial'?{from:'2026-07-07'}:{})}}}};
 const server=createServer({snapshot:s,blocks,now:()=>Date.parse(kind==='stale'?'2026-10-20T18:00:00Z':'2026-10-08T18:00:00Z')});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const res=await fetch(`http://127.0.0.1:${server.address().port}/api/report-selection`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[a.id,b.id],incidentMonths:6,asOf:through,retrievedAt:source.retrievedAt})});const value=await res.json();assert.equal(res.status,200);assert.equal(value.usable,false);assert.equal(value.count,null);assert.deepEqual(value.categories,[]);
 }
});
