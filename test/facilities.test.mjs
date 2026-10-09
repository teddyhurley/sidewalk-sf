import test from 'node:test';
import assert from 'node:assert/strict';
import {demoJourney,addresses} from '../dist/lib/demo.mjs';
import {nearbyFacilities} from '../dist/lib/facilities.mjs';
import {compareJourney} from '../dist/lib/analysis.mjs';
test('facility flags match the selected route, category and radius',()=>{
  const j=demoJourney(...addresses),r=j.routes[0];
  const facilities=nearbyFacilities(j,r);
  assert.ok(facilities.records.some(f=>f.type==='public_housing'));
  assert.ok(facilities.records.some(f=>f.type==='halfway_house'));
  assert.ok(facilities.records.every(f=>f.meters<=150));
  assert.ok(nearbyFacilities(j,r,{types:['public_housing']}).records.every(f=>f.type==='public_housing'));
  assert.equal(nearbyFacilities(j,r,{types:[]}).records.length,0);
  assert.ok(nearbyFacilities(j,r,{radius:50}).records.length<=facilities.records.length);
});
test('facility data cannot affect route counts, order, eligibility or difference callout',()=>{
  const j=demoJourney(...addresses),before=compareJourney(j);
  j.facilities.records.push(...j.facilities.records.map(f=>({...f,id:f.id+'-extra'})));
  assert.deepEqual(compareJourney(j),before);
  delete j.facilities;assert.deepEqual(compareJourney(j),before);
});
test('live and missing directories do not silently reuse fictional facilities',()=>{
  const j=demoJourney(...addresses);j.mode='live';assert.equal(nearbyFacilities(j,j.routes[0]).available,false);
  j.mode='demo';delete j.facilities;assert.equal(nearbyFacilities(j,j.routes[0]).available,false);
});
test('invalid coordinates, unknown categories, nonfictional and duplicate records are not marked',()=>{
  const j=demoJourney(...addresses),r=j.routes[0],before=nearbyFacilities(j,r).records;
  const fixture=j.facilities.records[0];
  j.facilities.records.push({...fixture},{...fixture,id:'bad-point',coordinates:[NaN,37]},{...fixture,id:'unknown',type:'unknown'},{...fixture,id:'real',fictional:false});
  assert.deepEqual(nearbyFacilities(j,r).records,before);
  assert.throws(()=>nearbyFacilities(j,r,{radius:100}));
});
