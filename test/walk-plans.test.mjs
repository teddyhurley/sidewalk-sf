import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSavedWalk,validateSavedWalk,readSavedWalks,writeSavedWalks,mapsLinks,savedWalksKey} from '../dist/lib/walk-plans.mjs';
import {walkingOptions} from '../lib/route-options.mjs';
import {walkingSteps} from '../lib/walking-steps.mjs';
import {demoJourney,addresses} from '../dist/lib/demo.mjs';
import {compareJourney} from '../dist/lib/analysis.mjs';
const options={maxDetour:5,buffer:50,incidentMonths:6};
const inputs={origin:'111 Taylor Street, San Francisco',destination:'1300 Buchanan Street, San Francisco',departure:'18:30'};
const demo=demoJourney(...addresses),comparison=compareJourney(demo,options);
const make=(journey=demo)=>makeSavedWalk({id:'test-1',now:'2026-10-08T20:00:00.000Z',journey,comparison,selected:journey.routes[1].id,inputs,options});
const memory=()=>{let raw=null;return {getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,savedWalksKey);raw=value;}};};
test('fictional save preserves the selected path and survives serialization independently',()=>{
 const plan=make();const store=memory();writeSavedWalks(store,[plan]);const saved=readSavedWalks(store).walks[0];
 assert.deepEqual(saved.sample.routes,demo.routes.map(({id,name,duration,distance,coordinates})=>({id,name,duration,distance,coordinates})));
 assert.equal(saved.sample.selectedRouteId,demo.routes[1].id);assert.equal(saved.kind,'sample-walk');
 plan.sample.routes[1].coordinates[0][0]=0;assert.notEqual(readSavedWalks(store).walks[0].sample.routes[1].coordinates[0][0],0);
});
test('live saves cannot persist provider paths, steps, labels or geocodes, including extra fields on load',()=>{
 const live={...demo,mode:'live',asOf:'2026-10-08',origin:'PROVIDER LABEL',endpoints:{origin:[-122.4,37.79]},evidence:{fictional:false,asOf:'2026-10-06'}};
 const plan=make(live);assert.equal(plan.review.asOf,'2026-10-06');assert.equal(plan.kind,'live-trip');assert.equal(plan.sample,undefined);
 const value=validateSavedWalk({...plan,sample:{routes:live.routes},coordinates:live.routes[0].coordinates,steps:['provider'],geocodes:'provider'});
 const json=JSON.stringify(value);for(const field of ['coordinates','steps','PROVIDER LABEL','geocodes','sample'])assert.ok(!json.includes(field));
 assert.deepEqual(value.inputs,inputs);
});
test('saved storage rejects corrupt, unsupported and oversized records and reports write failures',()=>{
 assert.ok(readSavedWalks({getItem:()=>'{'}).warning);
 assert.throws(()=>validateSavedWalk({...make(),inputs:{...inputs,departure:'29:80'}}),/preferences/);
 assert.throws(()=>validateSavedWalk({...make(),createdAt:0}),/Invalid saved/);
 assert.ok(readSavedWalks({getItem:()=>JSON.stringify([{...make(),version:2}])}).warning);
 assert.equal(readSavedWalks({getItem:()=>JSON.stringify([make(),make()])}).walks.length,1);
 assert.throws(()=>writeSavedWalks({setItem:()=>{throw Error();}},[make()]),/could not save/);
 assert.throws(()=>writeSavedWalks(memory(),Array(21).fill(make())),/20 saved/);
 const store=memory();writeSavedWalks(store,[make()]);writeSavedWalks(store,[]);assert.equal(readSavedWalks(store).walks.length,0);
});
test('Maps handoff encodes user inputs, uses walking mode and cannot export sample or provider geometry',()=>{
 const data={origin:'1 A & B #2, SF',destination:'12 Mission St, SF',coordinates:[-122.4,37.7]};
 const links=mapsLinks(data);const g=new URL(links.google),a=new URL(links.apple);
 assert.equal(g.origin,'https://www.google.com');assert.equal(g.searchParams.get('origin'),data.origin);assert.equal(g.searchParams.get('api'),'1');assert.equal(g.searchParams.get('travelmode'),'walking');
 assert.equal(a.origin,'https://maps.apple.com');assert.equal(a.searchParams.get('source'),data.origin);assert.equal(a.searchParams.get('mode'),'walking');
 assert.ok(!links.google.includes('waypoint'));assert.ok(!links.apple.includes('waypoint'));assert.ok(!links.google.includes('-122.4'));assert.equal(mapsLinks(data,{fictional:true}),null);
 assert.equal(mapsLinks({origin:'',destination:'test'}),null);
 assert.equal(new URL(mapsLinks({origin:'998 Chestnut St',destination:'425 Mission St'}).google).searchParams.get('origin'),'998 Chestnut St, San Francisco, CA');
});
test('provider instructions preserve leg order and fail closed if incomplete or malformed',()=>{
 const step=(instruction,distance=50,type='turn')=>({distance,maneuver:{instruction,type,location:[-122.41,37.79]}});
 const raw={legs:[{steps:[step('Head north'),step('Turn left')]},{steps:[step('Continue'),step('Arrive',0)]}]};
 assert.deepEqual(walkingSteps(raw).map(s=>s.instruction),['Head north','Turn left','Continue','Arrive']);
 assert.deepEqual(walkingSteps({legs:[{steps:[step('Valid'),step('',5)]}]}),[]);
 assert.deepEqual(walkingSteps({legs:[{steps:[step('Valid')]},{}]}),[]);
 assert.deepEqual(walkingSteps({legs:[{steps:[step('Bad',-1)]}]}),[]);
 const via=walkingSteps({legs:[{steps:[step('Your destination is on the left.',0,'arrive')]},{steps:[step('Walk west.'),step('Your destination is on the right.',0,'arrive')]}]});
 assert.deepEqual(via.map(s=>s.intermediate),[true,false,false]);
 assert.equal(via[2].instruction,'Your destination is on the right.');
});

test('route normalization carries complete ordered instructions through the option search',async()=>{
 const origin=[-122.41,37.79],destination=[-122.39,37.79];
 const raw={duration:1000,distance:1800,geometry:{coordinates:[origin,destination]},legs:[{steps:[{name:'Example Street',distance:1800,maneuver:{instruction:'Walk east.',type:'depart',location:origin}},{distance:0,maneuver:{instruction:'Arrive.',type:'arrive',location:destination}}]}]};
 const result=await walkingOptions({origin,destination,token:'pk.test',request:async()=>({routes:[raw]})});
 assert.equal(result.routes.length,1);
 assert.deepEqual(result.routes[0].steps.map(s=>s.instruction),['Walk east.','Arrive.']);
 assert.equal(result.routes[0].steps.at(-1).intermediate,false);
});
test('ordered typed stops are encoded as Google waypoints and repeated Apple waypoint parameters',()=>{
 const stops=['Polk Street & Turk Street','Gough Street & Eddy Street, San Francisco','Buchanan & Eddy, SF'];
 const links=mapsLinks({...inputs,stops,route:{coordinates:[[-122.4,37.79]]}});
 const expected=[stops[0]+', San Francisco, CA',stops[1],stops[2]];
 const g=new URL(links.google),a=new URL(links.apple);
 assert.deepEqual(g.searchParams.get('waypoints').split('|'),expected);
 assert.deepEqual(a.searchParams.getAll('waypoint'),expected);
 assert.equal(g.searchParams.get('travelmode'),'walking');assert.equal(a.searchParams.get('mode'),'walking');
 assert.ok(!links.google.includes('-122.4'));assert.ok(!links.apple.includes('-122.4'));
 assert.equal(mapsLinks({...inputs,stops},{fictional:true}),null);
});
test('live save round-trips independently entered stops while removing extra provider fields',()=>{
 const plan=make({...demo,mode:'live',evidence:{fictional:false}});
 const input={...plan,inputs:{...inputs,stops:['Polk & Turk','Gough & Eddy'],providerLabels:['derived']}};
 const store=memory();writeSavedWalks(store,[input]);const restored=readSavedWalks(store).walks[0];
 assert.deepEqual(restored.inputs.stops,['Polk & Turk','Gough & Eddy']);
 assert.equal(restored.inputs.providerLabels,undefined);assert.equal(restored.sample,undefined);
});
test('handoff rejects unsupported stop counts, delimiter injection and oversized URLs instead of dropping stops',()=>{
 assert.throws(()=>mapsLinks({...inputs,stops:['a','b','c','d']}),/three stops/);
 assert.throws(()=>mapsLinks({...inputs,stops:['a|b']}),/three stops/);
 assert.throws(()=>mapsLinks({...inputs,stops:[{}]}),/three stops/);
 assert.throws(()=>mapsLinks({...inputs,stops:Array(3).fill('路'.repeat(120))}),/too long/);
});
