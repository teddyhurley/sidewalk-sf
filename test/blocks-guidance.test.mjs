import test from 'node:test';
import assert from 'node:assert/strict';
import {blockUnproject,pointNearBlock,lineNearBlocksMeters,routeNearBlock} from '../dist/lib/block-geometry.mjs';
import {aggregateBlockReports} from '../lib/block-evidence.mjs';
import {routingEvidence,evidenceWaypoints} from '../lib/route-guidance.mjs';
import {selectEvidenceOptions,walkingOptions} from '../lib/route-options.mjs';
import {routeEvidenceMetrics,evidenceDifferences} from '../dist/lib/route-metrics.mjs';
const p=([x,y])=>blockUnproject([10000+x,10000+y]);
const polygon=ring=>({type:'Polygon',coordinates:[ring.map(p)]});
const box=(x1,y1,x2,y2)=>polygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]);
const route=(id,line,duration=600)=>({id,name:id,duration,distance:line.reduce((n,b,i)=>i?n+Math.hypot(b[0]-line[i-1][0],b[1]-line[i-1][1]):0,0),coordinates:line.map(p)});
const base=route('baseline',[[-500,0],[500,0]]);
const north=route('north',[[-500,0],[-350,250],[350,250],[500,0]],780);
const south=route('south',[[-500,0],[-350,-250],[350,-250],[500,0]],840);
const sourceBlock=(id,g)=>{const all=g.coordinates.flat(),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);return {id,geometry:g,bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};};
test('rotated street polygons and holes determine membership, not bounding boxes',()=>{
 const diamond=polygon([[0,-100],[100,0],[0,100],[-100,0],[0,-100]]);
 assert.equal(pointNearBlock(p([80,80]),diamond,0),false);assert.equal(pointNearBlock(p([50,0]),diamond,0),true);
 const hole={type:'Polygon',coordinates:[box(-200,-200,200,200).coordinates[0],box(-50,-50,50,50).coordinates[0]]};assert.equal(pointNearBlock(p([0,0]),hole,10),false);assert.equal(pointNearBlock(p([45,0]),hole,10),true);
});
test('shared boundary reports can inform both blocks without double counting the aggregate',()=>{
 const source={blocks:[sourceBlock('a',box(-100,-100,0,100)),sourceBlock('b',box(0,-100,100,100))]};
 const row={id:'private-report',date:'2026-05-01',coordinates:p([0,0]),categories:['Assault','Robbery']};
 const result=aggregateBlockReports([row,row,{...row,id:'old',date:'2025-01-01'}],{from:'2026-04-01',through:'2026-10-01'},{west:-123,east:-122,south:37,north:38},source);
 assert.deepEqual(result.cells.map(c=>c.count),[1,1]);assert.equal(result.count,1);assert.equal(result.categories[0].count,1);assert.ok(!JSON.stringify(result).includes('private-report'));
 assert.deepEqual(result.cells[0].geometry,source.blocks[0].geometry);
});
test('overlap is a union, including shared edges, and an exact bypass rejects tiny crossings',()=>{
 const blocks=[{geometry:box(-100,-100,0,100)},{geometry:box(0,-100,100,100)}];
 assert.ok(Math.abs(lineNearBlocksMeters(blocks,base.coordinates,0)-200)<11);
 assert.ok(Math.abs(lineNearBlocksMeters([blocks[0],blocks[0]],base.coordinates,0)-100)<11);
 assert.equal(routeNearBlock([p([-500,101]),p([500,101])],box(-100,-100,100,100),2),true);
 assert.equal(routeNearBlock([p([-500,160]),p([500,160])],box(-100,-100,100,100),50),false);
 assert.equal(routeNearBlock([p([-500,0]),p([500,0])],box(.1,-1,.2,1),0),true);
});
test('report and crash goals are distinct and a trade-off is retained without a blended score',()=>{
 const evidence={reportUsable:true,crashUsable:true,buffer:50,cells:[{id:'block',band:3,count:40,geometry:box(-200,-100,200,100)}],crashes:[{id:'c1',coordinates:p([0,0])},{id:'c2',coordinates:p([-200,0])},{id:'c3',coordinates:p([0,250])}]};
 const chosen=selectEvidenceOptions([base,north,south],{evidence,maxDetour:5});assert.equal(chosen[0].id,'baseline');assert.equal(chosen.length,3);
 const m=routeEvidenceMetrics(south,evidence),baseline=routeEvidenceMetrics(base,evidence);assert.ok(evidenceDifferences(m,baseline).reports);assert.ok(evidenceDifferences(m,baseline).crashes);assert.equal(m.crashes,0);assert.equal(m.darkMeters,0);assert.equal(m.score,undefined);
 assert.ok(chosen.some(r=>r.selectedFor.includes('reports')));assert.ok(chosen.some(r=>r.selectedFor.includes('crashes')));
});
test('within-budget evidence reductions take precedence over a bigger reduction beyond the budget',()=>{
 const e={reportUsable:false,crashUsable:true,cells:[],buffer:50,crashes:[{id:'c1',coordinates:p([0,0])},{id:'c2',coordinates:p([-100,0])},{id:'c3',coordinates:p([0,250])}]};
 const chosen=selectEvidenceOptions([base,north,{...south,duration:1800}],{evidence:e,maxDetour:5});assert.ok(chosen.find(r=>r.id==='north').selectedFor.includes('crashes'));assert.ok(!chosen.find(r=>r.id==='south').selectedFor.includes('crashes'));
});
test('missing boundaries and stale sources cannot become zero-valued routing preferences',()=>{
 assert.deepEqual(routingEvidence(null).cells,[]);const m=routeEvidenceMetrics(base);assert.equal(m.darkMeters,null);assert.equal(m.crashes,null);assert.deepEqual(evidenceDifferences(m,m),{reports:false,crashes:false});
 const s={fictional:false,reviewStage:'local-data-preview',asOf:'2026-10-07',sources:{reports:{records:[],window:{from:'2025-10-07',through:'2026-10-07'}},crashes:{records:[]}}};
 assert.equal(routingEvidence(s).reportUsable,false);assert.equal(routingEvidence(s).crashUsable,false);
});
test('evidence steering uses real walking waypoints, stays bounded, and still searches with three native routes',async()=>{
 const e={reportUsable:true,crashUsable:true,buffer:50,incidentMonths:6,cells:[{id:'block',band:3,count:40,geometry:box(-100,-100,100,100)}],crashes:[{id:'c1',coordinates:p([0,0])},{id:'c2',coordinates:p([0,10])}]};
 const plans=evidenceWaypoints(base,e);assert.ok(plans.some(p=>p.purpose==='reports'));assert.ok(plans.some(p=>p.purpose==='crashes'));assert.ok(plans.every(p=>p.points.length===2));
 let calls=0;const request=async u=>{calls++;assert.ok(u.pathname.includes('/walking/'));if(u.searchParams.get('alternatives')==='true')return {routes:[base,north,south].map(r=>({...r,geometry:{coordinates:r.coordinates}}))};throw Error('unavailable');};
 const result=await walkingOptions({origin:base.coordinates[0],destination:base.coordinates.at(-1),token:'pk.fixture',request,evidence:e});assert.ok(calls>1&&calls<=13);assert.equal(result.search.method,'evidence-guided');assert.ok(result.search.failed>0);assert.equal(result.routes.length,3);
});
test('guided results do not pad the comparison with alternatives reducing neither measure',()=>{
 const e={reportUsable:true,crashUsable:true,cells:[],crashes:[],buffer:50};
 const chosen=selectEvidenceOptions([base,north,south],{evidence:e,maxDetour:5});assert.equal(chosen.length,1);assert.equal(chosen[0].id,'baseline');
});
