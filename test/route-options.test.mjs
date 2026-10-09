import test from 'node:test';
import assert from 'node:assert/strict';
import {walkingOptions,distinctPath,hasDetourLoop,searchWaypoints} from '../lib/route-options.mjs';
const origin=[-122.41,37.79],destination=[-122.39,37.79];
const make=(line,seconds=1200)=>({duration:seconds,distance:2000,geometry:{coordinates:line},legs:[{steps:[{name:'Main Street',distance:1000}]}]});
const baseline=make([origin,destination]);
const normalized=line=>({coordinates:line,duration:1200,distance:2000});
test('near-identical lines do not become alternatives; a separated parallel street does',()=>{
 const a=normalized([origin,destination]);
 assert.equal(distinctPath(a,normalized([origin,[-122.40,37.7901],destination])),false);
 assert.equal(distinctPath(a,normalized([origin,[-122.408,37.793],[-122.392,37.793],destination])),true);
});
test('out-and-back detours and loops are rejected',()=>{
 assert.equal(hasDetourLoop(normalized([origin,[-122.405,37.79],[-122.405,37.794],[-122.405,37.79],destination])),true);
 assert.equal(hasDetourLoop(normalized([origin,[-122.405,37.79],[-122.405,37.792],[-122.403,37.792],[-122.405,37.79],destination])),true);
 assert.equal(hasDetourLoop(normalized([origin,[-122.407,37.792],destination])),false);
});
test('bounded fallback returns provider geometry and independently timed distinct options',async()=>{
 const urls=[];
 const request=async url=>{urls.push(url);if(url.searchParams.get('alternatives')==='true')return {routes:[baseline,baseline]};
 const p=url.pathname.split('/').at(-1).split(';')[1].split(',').map(Number);
 return {waypoints:[{location:origin},{name:p[1]>origin[1]?'North Street':'South Street',location:p},{location:destination}],routes:[make([origin,p,destination],p[1]>origin[1]?1300:1400)]};};
 const {routes,search}=await walkingOptions({origin,destination,token:'pk.test',request});
 assert.equal(urls.length,7);assert.equal(search.attempted,6);assert.equal(routes.length,3);assert.deepEqual(routes.map(r=>r.duration),[1200,1300,1300]);assert.equal(routes[1].method,'via-street');assert.ok(routes[1].via.name);assert.equal(routes[0].name,'Via Main Street');
 assert.ok(urls.every(u=>u.pathname.includes('/walking/')));assert.equal(urls[1].searchParams.get('radiuses'),'100;65;100');
 for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++)assert.ok(distinctPath(routes[i],routes[j]));
});
test('native alternatives need no extra probes and failed probes preserve a single honest option',async()=>{
 const alternatives=[baseline,make([origin,[-122.4,37.793],destination],1300),make([origin,[-122.4,37.787],destination],1400)];let calls=0;
 const native=await walkingOptions({origin,destination,token:'pk.test',request:async()=>{calls++;return {routes:alternatives};}});assert.equal(calls,1);assert.equal(native.routes.length,3);
 const failure=await walkingOptions({origin,destination,token:'pk.test',request:async u=>{if(u.searchParams.get('alternatives')==='true')return {routes:[baseline]};throw Error('unavailable');}});assert.equal(failure.routes.length,1);assert.equal(failure.search.failed,6);assert.ok(failure.search.notice.includes('failed'));
});
test('bad waypoint snaps, loops, long detours and invalid endpoints cannot be displayed',async()=>{
 for(const scenario of ['snap','loop','time','endpoint','outside']){
 const result=await walkingOptions({origin,destination,token:'pk.test',request:async u=>{
  if(u.searchParams.get('alternatives')==='true')return {routes:[baseline]};
  const p=u.pathname.split('/').at(-1).split(';')[1].split(',').map(Number);
  const line=scenario==='loop'?[origin,p,origin,destination]:scenario==='endpoint'?[[-122.43,37.80],p,destination]:scenario==='outside'?[origin,[-123,38],destination]:[origin,p,destination];
  return {waypoints:[{location:origin},{location:scenario==='snap'?destination:p},{location:destination}],routes:[make(line,scenario==='time'?3000:1300)]};
 }});assert.equal(result.routes.length,1,scenario);
 }
});
test('longer detour budgets permit an option otherwise outside the bounded search',async()=>{
 const request=async u=>{if(u.searchParams.get('alternatives')==='true')return {routes:[baseline]};const p=u.pathname.split('/').at(-1).split(';')[1].split(',').map(Number);return {waypoints:[{}, {name:'Side Street',location:p},{}],routes:[make([origin,p,destination],2100)]};};
 assert.equal((await walkingOptions({origin,destination,token:'pk.test',request,maxDetour:5})).routes.length,1);
 assert.ok((await walkingOptions({origin,destination,token:'pk.test',request,maxDetour:15})).routes.length>1);
 assert.equal(searchWaypoints(normalized([origin,origin])).length,0);
});
