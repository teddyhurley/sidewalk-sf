import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress,previewAuthorized,hostingOptions,createBudget} from '../lib/hosting.mjs';
import {createServer} from '../server.mjs';
const password='fixture-only-password-at-least-24-characters';
const auth={required:true,username:'sidewalk',password};
const authorization='Basic '+Buffer.from('sidewalk:'+password).toString('base64');
const use=async(t,options={})=>{const server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return 'http://127.0.0.1:'+server.address().port;};
test('preview authentication fails closed and hosting rejects absent or weak passwords',()=>{
 assert.equal(previewAuthorized(undefined,auth),false);assert.equal(previewAuthorized(authorization,auth),true);
 assert.equal(previewAuthorized(authorization,{...auth,password:'different-long-test-password'}),false);
 assert.equal(previewAuthorized('Basic !invalid',auth),false);assert.equal(previewAuthorized(authorization,{...auth,password:''}),false);
 assert.throws(()=>hostingOptions({RENDER:'true'}));assert.throws(()=>hostingOptions({PREVIEW_AUTH_REQUIRED:'1',PREVIEW_PASSWORD:'short'}));
 assert.throws(()=>hostingOptions({TRUST_PROXY_HOPS:'-1'}));assert.throws(()=>hostingOptions({DAILY_PROVIDER_REQUEST_BUDGET:'NaN'}));
 assert.equal(hostingOptions({RENDER:'true',PREVIEW_AUTH_REQUIRED:'1',PREVIEW_PASSWORD:password}).auth.required,true);
 assert.throws(()=>hostingOptions({RENDER:'true',PREVIEW_AUTH_REQUIRED:'1',PREVIEW_PASSWORD:password,TRUST_PROXY_HOPS:'1'}));
 assert.equal(hostingOptions({RENDER:'true',PREVIEW_AUTH_REQUIRED:'1',PREVIEW_PASSWORD:password,TRUST_PROXY_HOPS:'0'}).trustedProxyHops,0);
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
test('health is public but UI, source assets, configuration and status require authentication',async t=>{
 const base=await use(t,{token:'pk.fixture',hosting:{auth}});
 const health=await fetch(base+'/healthz');assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok'});
 for(const path of ['/','/app.mjs','/api/config','/api/status']){const res=await fetch(base+path);assert.equal(res.status,401);assert.ok(res.headers.get('www-authenticate'));assert.ok(!(await res.text()).includes('pk.fixture'));}
 const config=await fetch(base+'/api/config',{headers:{authorization}});assert.equal(config.status,200);
 const status=await(await fetch(base+'/api/status',{headers:{authorization}})).json();assert.equal(status.routingConfigured,true);assert.equal(status.sources.reports.usable,false);assert.ok(!JSON.stringify(status).includes('pk.fixture'));
 const ui=await fetch(base,{headers:{authorization}});assert.ok(ui.headers.get('content-security-policy').includes("frame-ancestors 'none'"));assert.equal(ui.headers.get('x-robots-tag'),'noindex, nofollow');
});
test('failed sign-ins are throttled without sending requests to the routing provider',async t=>{
 let calls=0;const base=await use(t,{hosting:{auth},fetcher:()=>{calls++;throw Error('must not call');}});
 for(let i=0;i<20;i++)assert.equal((await fetch(base+'/api/config')).status,401);
 assert.equal((await fetch(base+'/api/config')).status,429);assert.equal(calls,0);
 assert.equal((await fetch(base+'/api/config',{headers:{authorization}})).status,200);
});
test('global provider budget covers changing forwarded IPs and leaves status accessible',async t=>{
 let calls=0;const base=await use(t,{token:'pk.fixture',hosting:{trustedProxyHops:1,dailyBudget:13,minuteBudget:120},fetcher:async()=>{calls++;return Response.json({features:[]});}});
 for(let i=0;i<13;i++)await fetch(base+'/api/geocode',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':`198.51.100.${i+1}`},body:JSON.stringify({query:'425 Mission Street'})});
 const limited=await fetch(base+'/api/geocode',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':'198.51.100.250'},body:JSON.stringify({query:'425 Mission Street'})});
 assert.equal(limited.status,429);assert.equal(calls,13);assert.equal((await fetch(base+'/api/status')).status,200);
});
