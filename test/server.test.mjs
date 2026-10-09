import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
const use=async(t,options={})=>{const s=createServer(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));return 'http://127.0.0.1:'+s.address().port;};
const post=(url,body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('demo serves without credentials; live API returns actionable unavailable state',async t=>{
  const base=await use(t,{token:''});assert.equal((await fetch(base)).status,200);
  const c=await(await fetch(base+'/api/config')).json();assert.equal(c.liveRoutingConfigured,false);
  assert.equal((await post(base+'/api/routes',{})).status,503);
});
test('geocoding is SF bounded, requires confirmation candidates, and is not cached',async t=>{
  let request;const base=await use(t,{token:'pk.fixture',fetcher:async url=>{request=new URL(url);return Response.json({features:[{properties:{full_address:'425 Mission St, SF'},geometry:{coordinates:[-122.397,37.789]}},{properties:{full_address:'Outside'},geometry:{coordinates:[-73,40]}}]});}});
  const r=await post(base+'/api/geocode',{query:'425 Mission Street'}),data=await r.json();assert.equal(data.features.length,1);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(request.searchParams.get('types'),'address');assert.equal(request.searchParams.get('autocomplete'),'false');
});
test('walking alternatives are requested, deduplicated, and real evidence stays null',async t=>{
  let request;const route={duration:900,distance:1000,geometry:{coordinates:[[-122.4,37.79],[-122.39,37.795]]}};
  const base=await use(t,{token:'pk.fixture',fetcher:async url=>{request ||=new URL(url);return Response.json({routes:[route,route]});}});
  const r=await post(base+'/api/routes',{origin:[-122.4,37.79],destination:[-122.39,37.795]}),data=await r.json();assert.equal(data.routes.length,1);assert.equal(data.mode,'live');assert.equal(data.evidence,null);assert.equal(request.searchParams.get('alternatives'),'true');assert.ok(request.pathname.includes('/walking/'));
});
test('bad coordinates, equivalent endpoints, cross-origin and malformed bodies are rejected',async t=>{
  const base=await use(t,{token:'pk.fixture',fetcher:()=>{throw new Error('must not fetch');}});
  assert.equal((await post(base+'/api/routes',{origin:[-73,40],destination:[-122.4,37.79]})).status,400);
  assert.equal((await post(base+'/api/routes',{origin:[-122.4,37.79],destination:[-122.4,37.79]})).status,400);
  assert.equal((await post(base+'/api/geocode',{query:'abc'},{Origin:'https://unrelated.example'})).status,403);
  assert.equal((await fetch(base+'/api/geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
});
test('provider auth, rate-limit, malformed JSON and network failures have bounded errors',async t=>{
  for(const [provider,status]of [[()=>new Response('',{status:403}),503],[()=>new Response('',{status:429}),429],[()=>new Response('not-json'),502],[()=>{throw new Error('secret provider url');},502]]){
    const base=await use(t,{token:'pk.fixture',fetcher:provider});const r=await post(base+'/api/geocode',{query:'425 Mission St'});assert.equal(r.status,status);assert.ok(!(await r.text()).includes('secret'));
  }
});
test('static server does not expose source, tokens, or parent paths',async t=>{
  const base=await use(t,{token:''});for(const p of ['/.env','/server.mjs','/package.json','/%2e%2e%2fserver.mjs'])assert.ok((await fetch(base+p)).status>=400);
});
test('server-only public token is not exposed in config and secret-scope tokens are rejected',async t=>{
  const base=await use(t,{token:'pk.browser',serverToken:'pk.server'});const config=await(await fetch(base+'/api/config')).json();assert.equal(config.mapboxToken,'pk.browser');assert.ok(!JSON.stringify(config).includes('pk.server'));
  const invalid=await use(t,{token:'sk.forbidden'});assert.equal((await(await fetch(invalid+'/api/config')).json()).liveRoutingConfigured,false);
});
test('local rate limit bounds provider calls',async t=>{
  let calls=0;const base=await use(t,{token:'pk.fixture',now:()=>1,fetcher:async()=>{calls++;return Response.json({features:[]});}});
  for(let i=0;i<30;i++)await post(base+'/api/geocode',{query:'425 Mission'});
  assert.equal((await post(base+'/api/geocode',{query:'425 Mission'})).status,429);assert.equal(calls,30);
});
