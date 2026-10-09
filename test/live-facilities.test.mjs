import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reviewedFacilityDirectory,nearbyFacilities} from '../dist/lib/facilities.mjs';
import {demoJourney,addresses} from '../dist/lib/demo.mjs';
import {compareJourney} from '../dist/lib/analysis.mjs';
import {createServer} from '../server.mjs';
const directory=JSON.parse(await readFile(new URL('../assets/sf-facilities-reviewed.json',import.meta.url),'utf8'));
const now=Date.parse('2026-10-08T19:00:00Z');
const copy=()=>structuredClone(directory);
const lineThrough=r=>({coordinates:[r.coordinates,[r.coordinates[0]+.001,r.coordinates[1]]]});
test('reviewed live directory maps public listings with provenance and independent proximity',()=>{
  const d=reviewedFacilityDirectory(directory,now);assert.equal(d.records.length,61);assert.equal(d.coverage,'partial');assert.equal(d.fictional,false);
  for(const r of d.records){
    const result=nearbyFacilities({mode:'live',facilities:d},lineThrough(r),{radius:50,now});
    assert.ok(result.available);assert.equal(result.fictional,false);assert.ok(result.records.some(p=>p.id===r.id&&p.meters===0));
    assert.ok(r.sources.length>=2);assert.ok(r.address.includes('San Francisco'));assert.ok(r.locationNote.includes('Approximate'));
    assert.equal(nearbyFacilities({mode:'live',facilities:d},lineThrough(r),{types:[],now}).records.length,0);
    const otherType=r.type==='public_housing'?'halfway_house':'public_housing';
    assert.ok(!nearbyFacilities({mode:'live',facilities:d},lineThrough(r),{types:[otherType],now}).records.some(p=>p.id===r.id));
  }
});
test('invalid, unreviewed, future, ambiguous and unsafe-source directories fail closed',()=>{
  for(const mutate of [d=>d.fictional=true,d=>d.coverage='complete',d=>d.records.push(d.records[0]),d=>d.records[0].coordinates=[0,0],d=>d.records[0].type='unknown',d=>d.records[0].status='unverified',d=>d.records[0].verifiedOn='2026-10-09',d=>d.records[0].reviewBy='2026-02-30',d=>d.records[0].reviewBy='2028-01-01',d=>d.records[0].sources=[],d=>d.records[0].sources[0].url='javascript:alert(1)',d=>d.records[0].sources[0].url='https://secret@example.com',d=>d.records[0].address='']){
    const d=copy();mutate(d);assert.equal(reviewedFacilityDirectory(d,now),null);
  }
  const d=copy();d.records[0].privateResidentData='never serialized';assert.ok(!JSON.stringify(reviewedFacilityDirectory(d,now)).includes('never serialized'));
});
test('expiry is inclusive, withheld listings remain unknown, and stale pins do not survive an open page',()=>{
  const d=copy();d.records[0].reviewBy='2026-10-08';
  assert.equal(reviewedFacilityDirectory(d,now).records.length,61);
  const nextDay=Date.parse('2026-10-09T12:00:00Z'),filtered=reviewedFacilityDirectory(d,nextDay);
  assert.equal(filtered.records.length,60);assert.equal(filtered.withheldCount,1);
  assert.equal(reviewedFacilityDirectory(filtered,nextDay).withheldCount,1);
  const expired=nearbyFacilities({mode:'live',facilities:d},lineThrough(d.records[0]),{now:Date.parse('2027-01-07')});
  assert.equal(expired.available,false);assert.deepEqual(expired.records,[]);
});
test('real listings never leak into the fictional sample or affect evidence comparisons',()=>{
  const demo=demoJourney(...addresses),before=compareJourney(demo);demo.facilities=directory;
  assert.equal(nearbyFacilities(demo,demo.routes[0],{now}).available,false);
  assert.deepEqual(compareJourney(demo),before);
  assert.equal(nearbyFacilities({mode:'live',facilities:demoJourney(...addresses).facilities},demo.routes[0],{now}).available,false);
  assert.equal(nearbyFacilities({mode:'live'},demo.routes[0],{now}).available,false);
});
test('live API attaches reviewed facilities separately without changing provider routes or evidence',async t=>{
  const route={duration:900,distance:1000,geometry:{coordinates:[[-122.411,37.783],[-122.429,37.782]]}};
  const request=async facilities=>{
    const s=createServer({token:'pk.fixture',facilities,now:()=>now,fetcher:async()=>Response.json({routes:[route]})});
    await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));
    const response=await fetch('http://127.0.0.1:'+s.address().port+'/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:route.geometry.coordinates[0],destination:route.geometry.coordinates[1]})});
    assert.equal(response.status,200);return response.json();
  };
  const withDirectory=await request(directory),withoutDirectory=await request(null);
  assert.equal(withDirectory.facilities.records.length,61);assert.equal(withoutDirectory.facilities,null);
  delete withDirectory.facilities;delete withoutDirectory.facilities;assert.deepEqual(withDirectory,withoutDirectory);
});


test('expanded directory reconciles audited City rows without conflating housing programs or duplicate sites',async()=>{
  const audit=JSON.parse(await readFile(new URL('../docs/facility-validation.json',import.meta.url),'utf8'));
  const city=audit.housingSource;
  assert.equal(city.publisherCount,850);assert.equal(city.retrievedRows,city.publisherCount);
  assert.equal(city.beforeRowsUpdatedAt,city.afterRowsUpdatedAt);
  assert.equal(city.mapping.length,51);
  const seen=new Set();
  for(const entry of city.mapping){
    const listing=directory.records.find(r=>r.id===entry.id);assert.ok(listing);assert.equal(listing.type,'former_public_housing');
    for(const id of entry.sourceIds){assert.ok(!seen.has(id));seen.add(id);const row=city.records.find(r=>r.mohcd_development_id===id);assert.ok(row);assert.equal(row.project_status,'Construction Complete');}
    const source=city.records.find(r=>r.mohcd_development_id===entry.sourceIds[0]);
    assert.deepEqual(listing.coordinates,[Number(source.longitude),Number(source.latitude)]);
    assert.ok(listing.address.startsWith(source.marketing_address));
  }
  assert.equal(seen.size,52);
  assert.equal(directory.records.filter(r=>r.address.startsWith('2500 Arelious Walker')).length,1);
  assert.ok(!directory.records.some(r=>r.name.includes('Leroy Looper')||r.address.includes('1153 Oak')||r.address.includes('3012 16th')||r.address.includes('Confidential')));
  assert.deepEqual(Object.fromEntries(['public_housing','former_public_housing','halfway_house','reentry_housing'].map(type=>[type,directory.records.filter(r=>r.type===type).length])),{public_housing:2,former_public_housing:51,halfway_house:1,reentry_housing:7});
});
test('citywide viewing retains provenance, independent type toggles and expiry without changing route proximity',()=>{
  const route=lineThrough(directory.records[0]),journey={mode:'live',facilities:directory};
  const nearby=nearbyFacilities(journey,route,{radius:50,now});
  const city=nearbyFacilities(journey,route,{scope:'city',radius:50,now});
  assert.equal(city.records.length,61);assert.ok(nearby.records.length<city.records.length);
  assert.equal(city.categoryCounts.former_public_housing,51);
  assert.equal(city.records.find(r=>r.id===directory.records[0].id).meters,0);
  for(const type of ['public_housing','former_public_housing','halfway_house','reentry_housing']){
    const filtered=nearbyFacilities(journey,route,{scope:'city',types:[type],now});
    assert.ok(filtered.records.length>0);assert.ok(filtered.records.every(r=>r.type===type));
    assert.equal(filtered.directoryCount,61);
  }
  const d=copy();d.records.find(r=>r.type==='former_public_housing').reviewBy='2026-10-08';
  const tomorrow=nearbyFacilities({mode:'live',facilities:d},route,{scope:'city',now:Date.parse('2026-10-09')});
  assert.equal(tomorrow.records.length,60);assert.equal(tomorrow.categoryCounts.former_public_housing,50);
  assert.throws(()=>nearbyFacilities(journey,route,{scope:'unknown',now}));
});
