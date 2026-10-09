import test from 'node:test';
import assert from 'node:assert/strict';
import {demoJourney,addresses} from '../dist/lib/demo.mjs';
import {compareJourney,matchRecords,evidenceStatus} from '../dist/lib/analysis.mjs';
import {distance,nearestSegment,lineLength,inSfEnvelope} from '../dist/lib/geo.mjs';
const sample=()=>demoJourney(...addresses);
test('metric geometry measures a known distance and clamps to segment endpoints',()=>{
  assert.ok(Math.abs(distance([0,0],[0,.001])-111.195)<.1);
  assert.ok(nearestSegment([0,.0005],[[0,0],[0,.001]]).meters<.001);
  assert.ok(Math.abs(nearestSegment([0,.002],[[0,0],[0,.001]]).meters-111.195)<.1);
  assert.ok(nearestSegment([0,.001],[[0,0],[0,0]]).meters>111);
  assert.equal(lineLength([[0,0],[0,0]]),0);
});
test('demo supports reversal but never silently substitutes arbitrary addresses',()=>{
  const f=sample(),r=demoJourney(addresses[1],addresses[0]);
  assert.deepEqual(f.routes[0].coordinates[0],r.routes[0].coordinates.at(-1));
  assert.throws(()=>demoJourney('unknown','elsewhere'),/sample pair/);
});
test('detour is measured against fastest route regardless of provider order',()=>{
  const j=sample();j.routes.reverse();const result=compareJourney(j,{maxDetour:3});
  assert.equal(result.fastestId,'market');assert.equal(result.routes[1].eligible,true);assert.equal(result.routes[2].eligible,false);
  assert.equal(compareJourney(j,{maxDetour:0}).takeaway.routeId,undefined);
});
test('collisions and incidents are separate, and no score is produced',()=>{
  const result=compareJourney(sample());assert.equal(result.routes[0].counts.collision,4);
  assert.equal(result.routes[1].counts.collision,1);assert.equal(result.takeaway.routeId,'mission');
  assert.ok(result.routes.every(r=>!('score' in r)));assert.ok(!('score' in result));
});
test('matching deduplicates an event at a shared vertex, filters dates and invalid coordinates',()=>{
  const j=sample(),record=j.evidence.records[0];j.evidence.records.push({...record},{...record,id:'old',date:'2020-01-01'},{...record,id:'bad',coordinates:[NaN,1]},{...record,id:'null-date',date:'invalid'});
  assert.equal(matchRecords(j.routes[0],j.evidence).filter(r=>r.id===record.id).length,1);
  assert.equal(matchRecords(j.routes[0],j.evidence).length,6);
});
test('incomplete and stale snapshots withhold numbers, never convert unknown to zero',()=>{
  for(const scenario of ['missing','stale']){const r=compareJourney(demoJourney(...addresses,scenario));assert.equal(r.status.usable,false);assert.equal(r.routes[0].counts,null);assert.equal(r.takeaway.routeId,undefined);}
});
test('invalid or future coverage dates are withheld',()=>{
  const e=sample().evidence;assert.equal(evidenceStatus({...e,updated:'2099-01-01'},'2026-10-07').usable,false);assert.equal(evidenceStatus({...e,from:'invalid'},'2026-10-07').usable,false);
});
test('real routes can never acquire fictional evidence',()=>{
  const j=sample();j.mode='live';const result=compareJourney(j);assert.equal(result.status.usable,false);assert.equal(result.routes[0].counts,null);
});
test('larger screening corridors cannot remove a matched record',()=>{
  const j=sample();for(const r of j.routes){const a=matchRecords(r,j.evidence,25),b=matchRecords(r,j.evidence,50),c=matchRecords(r,j.evidence,100);assert.ok(a.length<=b.length&&b.length<=c.length);}
});
test('single route and zero records remain honest outcomes',()=>{
  const j=sample();j.routes=j.routes.slice(0,1);j.evidence.records=[];const r=compareJourney(j);assert.equal(r.routes[0].counts.collision,0);assert.equal(r.takeaway.routeId,undefined);
});
test('malformed routes and invalid constraints fail explicitly',()=>{
  const j=sample();assert.throws(()=>compareJourney(j,{maxDetour:-1}));assert.throws(()=>compareJourney(j,{buffer:80}));j.routes[0].coordinates=[];assert.throws(()=>compareJourney(j));
  assert.equal(inSfEnvelope([-73,40]),false);assert.equal(inSfEnvelope([-122.4,37.79]),true);
});
