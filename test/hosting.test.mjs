import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress,hostingOptions,createBudget} from '../lib/hosting.mjs';
import {createServer} from '../server.mjs';
const legacyEnv={RENDER:'true',PREVIEW_AUTH_REQUIRED:'1',PREVIEW_USERNAME:'sidewalk',PREVIEW_PASSWORD:'obsolete-fixture-password'};
const use=async(t,options={})=>{const server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return 'http://127.0.0.1:'+server.address().port;};
test('Render starts without credentials while proxy and budget validation remain enforced',()=>{
 assert.deepEqual(hostingOptions({RENDER:'true'}),{trustedProxyHops:0,dailyBudget:1000,minuteBudget:120});
 assert.throws(()=>hostingOptions({TRUST_PROXY_HOPS:'-1'}));assert.throws(()=>hostingOptions({DAILY_PROVIDER_REQUEST_BUDGET:'NaN'}));
 assert.throws(()=>hostingOptions({RENDER:'true',TRUST_PROXY_HOPS:'1'}));
});
test('untrusted forwarded IPs are ignored; configured hops use the right-hand chain',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-for':'1.2.3.4, 198.51.100.8, 10.0.0.1'}};
 assert.equal(clientAddress(req),'127.0.0.1');assert.equal(clientAddress(req,1),'10.0.0.1');assert.equal(clientAddress(req,2),'198.51.100.8');
 req.headers['x-forwarded-for']='attacker';assert.equal(clientAddress(req,1),'127.0.0.1');
});
test('a weighted global budget cannot be bypassed by changing client identity',()=>{
 let now=0;const use=createBudget({limit:15,windowMs:1000,now:()=>now});
 assert.equal(use(13),true);assert.equal(use(1),true);assert.equal(use(13),false);assert.equal(use(1),true);assert.equal(use(1),false);
 now=1000;assert.equal(use(13),true);
});
test('portfolio UI, assets and APIs open anonymously after upgrading a previously gated service',async t=>{
 const base=await use(t,{token:'pk.browser-fixture',serverToken:'pk.server-fixture',hosting:hostingOptions(legacyEnv)});
 const health=await fetch(base+'/healthz');assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok'});
 for(const path of ['/','/app.mjs','/styles.css','/api/config','/api/status']){const res=await fetch(base+path);assert.equal(res.status,200,path);assert.equal(res.headers.get('www-authenticate'),null);const body=await res.text();assert.ok(!body.includes('pk.server-fixture'));assert.ok(!body.includes(legacyEnv.PREVIEW_PASSWORD));}
 const status=await(await fetch(base+'/api/status')).json();assert.equal(status.routingConfigured,true);assert.equal(status.sources.reports.usable,false);assert.ok(!JSON.stringify(status).includes('pk.browser-fixture'));
 const ui=await fetch(base);assert.ok(ui.headers.get('content-security-policy').includes("frame-ancestors 'none'"));assert.equal(ui.headers.get('x-robots-tag'),'noindex, nofollow');
});
test('anonymous walking requests work with legacy Render settings and stay within provider budgets',async t=>{
 let calls=0;const route={duration:900,distance:1000,geometry:{coordinates:[[-122.4,37.79],[-122.39,37.795]]}};
 const base=await use(t,{token:'pk.fixture',hosting:hostingOptions({...legacyEnv,DAILY_PROVIDER_REQUEST_BUDGET:'13'}),fetcher:async()=>{calls++;return Response.json({routes:[route]});}});
 const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:[-122.4,37.79],destination:[-122.39,37.795]})};
 const first=await fetch(base+'/api/routes',options);assert.equal(first.status,200);assert.equal(first.headers.get('www-authenticate'),null);assert.equal((await first.json()).mode,'live');
 const firstCalls=calls;assert.ok(firstCalls>0&&firstCalls<=13);
 const limited=await fetch(base+'/api/routes',options);assert.equal(limited.status,429);assert.equal(calls,firstCalls);
 // A browser may retain old Basic credentials; they must not trigger a new challenge.
 const ui=await fetch(base,{headers:{authorization:'Basic obsolete-credentials'}});assert.equal(ui.status,200);assert.equal(ui.headers.get('www-authenticate'),null);
});
test('global provider budget covers changing forwarded IPs and leaves status accessible',async t=>{
 let calls=0;const base=await use(t,{token:'pk.fixture',hosting:{trustedProxyHops:1,dailyBudget:13,minuteBudget:120},fetcher:async()=>{calls++;return Response.json({features:[]});}});
 for(let i=0;i<13;i++)await fetch(base+'/api/geocode',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':`198.51.100.${i+1}`},body:JSON.stringify({query:'425 Mission Street'})});
 const limited=await fetch(base+'/api/geocode',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.250'},body:JSON.stringify({query:'425 Mission Street'})});
 assert.equal(limited.status,429);assert.equal(calls,13);assert.equal((await fetch(base+'/api/status')).status,200);
});
