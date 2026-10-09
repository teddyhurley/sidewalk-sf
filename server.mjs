import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inSfEnvelope,distance} from './dist/lib/geo.mjs';
import {loadSnapshot,liveContext,liveReportSelection,sourceHealth} from './lib/live-evidence.mjs';
import {walkingOptions} from './lib/route-options.mjs';
import {routingEvidence} from './lib/route-guidance.mjs';
import {loadBlocks} from './lib/block-evidence.mjs';
import {reviewedFacilityDirectory} from './dist/lib/facilities.mjs';
import {clientAddress,previewAuthorized,createBudget,hostingOptions} from './lib/hosting.mjs';
import {createEvidenceRuntime} from './lib/evidence-runtime.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
async function readBody(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(415,'Use a JSON request.');
  const chunks=[];let size=0;
  for await (const chunk of req){size+=chunk.length;if(size>8192)throw new HttpError(413,'The request is too large.');chunks.push(chunk);}
  try{const data=JSON.parse(Buffer.concat(chunks).toString());if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data;}catch{throw new HttpError(400,'Invalid JSON request.');}
}
export async function providerJson(url,fetcher=fetch,timeout=10000){
  let response;
  try{response=await fetcher(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});}catch{throw new HttpError(502,'The routing provider is unavailable. Try again or use the fictional demo.');}
  if(response.status===429)throw new HttpError(429,'The routing provider is rate limited. Wait before trying again.');
  if(response.status===401||response.status===403)throw new HttpError(503,'Mapbox access is not configured correctly. Check the token, allowed origins, and account access.');
  if(!response.ok)throw new HttpError(502,'The routing provider could not complete the request.');
  try{return await response.json();}catch{throw new HttpError(502,'The routing provider returned an unreadable response.');}
}
export function createServer({token=process.env.MAPBOX_PUBLIC_TOKEN||'',serverToken=process.env.MAPBOX_SERVER_TOKEN||token,fetcher=fetch,now=()=>Date.now(),snapshot:initialSnapshot=null,snapshotProvider=null,refreshStatus=()=>null,hosting={},blocks=null,facilities=null}={}) {
  const configured=token.startsWith('pk.')&&serverToken.startsWith('pk.'),limits=new Map(),selectionLimits=new Map();
  const useMinute=createBudget({limit:hosting.minuteBudget??120,windowMs:60000,now}),useDay=createBudget({limit:hosting.dailyBudget??1000,windowMs:86400000,now});
  const authLimits=new Map();
  return http.createServer(async(req,res)=>{
    const snapshot=snapshotProvider?snapshotProvider():initialSnapshot;
    // No request/address logging; API responses may contain temporary provider data.
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://api.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' data: blob: https://*.mapbox.com; connect-src 'self' https://*.mapbox.com; worker-src blob:; font-src 'self' https://*.mapbox.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Permissions-Policy','geolocation=(), camera=(), microphone=()');
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/healthz'&&['GET','HEAD'].includes(req.method))return json(200,{status:'ok'});
      if(!previewAuthorized(req.headers.authorization,hosting.auth)){
        const authKey=clientAddress(req,hosting.trustedProxyHops),time=now(),entry=authLimits.get(authKey);
        if(!entry||time-entry.start>=60000)authLimits.set(authKey,{start:time,count:1});
        else if(++entry.count>20){res.setHeader('Retry-After','60');return json(429,{error:'Too many sign-in attempts. Try again in a minute.'});}
        if(authLimits.size>1000)for(const [key,value]of authLimits)if(time-value.start>=60000)authLimits.delete(key);
        res.setHeader('WWW-Authenticate','Basic realm="Sidewalk preview", charset="UTF-8"');return json(401,{error:'This preview requires a password.'});
      }
      if(url.pathname==='/api/status'&&req.method==='GET')return json(200,{routingConfigured:configured,evidenceAsOf:snapshot?.asOf||null,refresh:refreshStatus(),sources:Object.fromEntries(['reports','crashes'].map(kind=>[kind,sourceHealth(snapshot?.sources?.[kind],kind,now())]))});
      if(url.pathname==='/api/config'&&req.method==='GET')return json(200,{liveRoutingConfigured:configured,mapboxToken:configured?token:null,evidenceConnected:!!snapshot,evidenceStage:snapshot?'local-data-preview':'not-connected'});
      if(url.pathname.startsWith('/api/')){
        if(req.method!=='POST')throw new HttpError(405,'Use POST for this endpoint.');
        if(!['/api/geocode','/api/routes','/api/report-selection'].includes(url.pathname))throw new HttpError(404,'Unknown endpoint.');
        if(req.headers.origin){let host;try{host=new URL(req.headers.origin).host;}catch{throw new HttpError(403,'Invalid origin.');}if(host!==req.headers.host)throw new HttpError(403,'Cross-origin requests are not accepted.');}
        const isSelection=url.pathname==='/api/report-selection',activeLimits=isSelection?selectionLimits:limits;
        const key=clientAddress(req,hosting.trustedProxyHops),time=now(),entry=activeLimits.get(key),cost=url.pathname==='/api/routes'?13:1;
        if(!entry||time-entry.start>=60000)activeLimits.set(key,{start:time,count:cost});else if((entry.count+=cost)>(isSelection?120:30))throw new HttpError(429,'Too many requests. Please wait a minute.');
        if(activeLimits.size>1000)for(const [ip,v]of activeLimits)if(time-v.start>60000)activeLimits.delete(ip);
        const body=await readBody(req);
        if(!isSelection&&(!useMinute(cost)||!useDay(cost))){res.setHeader('Retry-After','60');throw new HttpError(429,'The preview usage limit has been reached. Please try later.');}
        if(isSelection){
          if(!Array.isArray(body.ids)||body.ids.length>100||body.ids.some(id=>typeof id!=='string'||!/^06075\d{10}$/.test(id))||new Set(body.ids).size!==body.ids.length||![3,6,12].includes(body.incidentMonths))throw new HttpError(400,'Select up to 100 areas and a supported time range.');
          if(!snapshot||!blocks)throw new HttpError(503,'Selected report counts are unavailable.');
          const known=new Set(blocks.blocks.map(b=>b.id));
          if(body.ids.some(id=>!known.has(id)))throw new HttpError(400,'An area is outside the supported map.');
          if(body.asOf!==snapshot.asOf||body.retrievedAt!==snapshot.sources.reports.retrievedAt)throw new HttpError(409,'The evidence snapshot changed. Compare walks again to refresh the map.');
          return json(200,liveReportSelection(snapshot,blocks,body.ids,body.incidentMonths,time));
        }
        if(!configured)throw new HttpError(503,'Live routing needs MAPBOX_PUBLIC_TOKEN. The fictional demo is available without credentials.');
        if(url.pathname==='/api/geocode'){
          if(typeof body.query!=='string'||body.query.trim().length<3||body.query.length>200)throw new HttpError(400,'Enter a street address between 3 and 200 characters.');
          const endpoint=new URL('https://api.mapbox.com/search/geocode/v6/forward');
          endpoint.search=new URLSearchParams({q:body.query.trim(),access_token:serverToken,country:'us',bbox:'-122.52,37.70,-122.35,37.83',types:'address',autocomplete:'false',limit:'5'}).toString();
          const data=await providerJson(endpoint,fetcher);
          const features=(data.features||[]).filter(f=>inSfEnvelope(f.geometry?.coordinates)).slice(0,5).map(f=>({label:f.properties?.full_address||[f.properties?.name,f.properties?.place_formatted].filter(Boolean).join(', '),coordinates:f.geometry.coordinates})).filter(f=>f.label);
          if(!features.length)throw new HttpError(404,'No street address found in the supported SF envelope. Try a full street address, not a place name.');
          return json(200,{features,temporary:true});
        }
        if(!inSfEnvelope(body.origin)||!inSfEnvelope(body.destination))throw new HttpError(400,'Both locations must be inside the supported SF envelope.');
        if(distance(body.origin,body.destination)<20)throw new HttpError(400,'Choose two locations at least 20 metres apart.');
        const maxDetour=body.maxDetour??5;
        if(!Number.isFinite(maxDetour)||maxDetour<0||maxDetour>30)throw new HttpError(400,'Choose a detour between 0 and 30 minutes.');
        const incidentMonths=body.incidentMonths??6,buffer=body.buffer??50;
        if(![3,6,12].includes(incidentMonths)||![25,50,100].includes(buffer))throw new HttpError(400,'Choose a supported report window and crash corridor.');
        const evidence=routingEvidence(snapshot,{incidentMonths,buffer,now:time,blocks});
        const {routes,search}=await walkingOptions({origin:body.origin,destination:body.destination,token:serverToken,maxDetour,evidence,request:url=>providerJson(url,fetcher,url.searchParams.get('alternatives')==='false'?6500:10000)});
        if(!routes.length)throw new HttpError(404,'No supported walking route returned. Provider routes may leave the SF envelope or be unavailable.');
        return json(200,{mode:'live',fictional:false,asOf:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time)),routes,evidence:liveContext(snapshot,routes,time,blocks),facilities:reviewedFacilityDirectory(facilities,time),provider:'Mapbox',alternativesGuaranteed:false,routeSearch:search});
      }
      if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'Method not supported.');
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{throw new HttpError(400,'Invalid path.');}
      const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep))throw new HttpError(403,'Path unavailable.');
      const type=mime[path.extname(file)];if(!type)throw new HttpError(404,'Not found.');
      let info;try{info=await stat(file);}catch{throw new HttpError(404,'Not found.');}if(!info.isFile())throw new HttpError(404,'Not found.');
      const content=await readFile(file);res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?undefined:content);
    }catch(error){if(!res.headersSent)json(error.status||500,{error:error.status?error.message:'An unexpected server error occurred. Use the fictional demo.'});else res.end();}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT)||4173,host=process.env.HOST||(process.env.RENDER==='true'?'0.0.0.0':'127.0.0.1'),hosting=hostingOptions();
  const dataDir=process.env.DATA_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'data');
  let snapshot=null,runtime=null;
  if(process.env.LIVE_EVIDENCE_PREVIEW==='1'){
    try{snapshot=await loadSnapshot(path.join(dataDir,'evidence.json'));console.log('Historical evidence snapshot loaded.');}
    catch{console.log('Evidence snapshot missing or invalid; live assessments remain unavailable.');}
  }
  let blocks=null;try{blocks=await loadBlocks(path.join(path.dirname(fileURLToPath(import.meta.url)),'assets/sf-blocks-2020.json'));}catch{console.log('Block boundaries unavailable; report shading and report-guided routing are withheld.');}
  let facilities=null;try{facilities=reviewedFacilityDirectory(JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'assets/sf-facilities-reviewed.json'),'utf8')));}catch{}
  if(!facilities)console.log('Facility directory unavailable; facility markers are withheld.');
  if(process.env.AUTO_REFRESH==='1'){
    if(process.env.LIVE_EVIDENCE_PREVIEW!=='1')throw Error('Automatic refresh requires LIVE_EVIDENCE_PREVIEW=1');
    runtime=await createEvidenceRuntime({dataDir});
  }
  const server=createServer({snapshot,snapshotProvider:runtime?runtime.current:null,refreshStatus:runtime?runtime.status:()=>null,hosting,blocks,facilities});
  server.listen(port,host,()=>{console.log(`Sidewalk is ready at http://${host}:${port}`);runtime?.start();});
  let stopping=false;
  async function stop(){if(stopping)return;stopping=true;const deadline=setTimeout(()=>process.exit(1),25000);deadline.unref();await runtime?.stop();server.close(()=>{clearTimeout(deadline);process.exit(0);});server.closeIdleConnections();}
  process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
