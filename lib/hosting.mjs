import {createHash,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';

// Forwarded headers are ignored locally. Trust only a configured number of
// rightmost proxy hops; never accept a caller's leftmost IP unconditionally.
export function clientAddress(req,trustedProxyHops=0){
  const peer=req.socket.remoteAddress||'unknown';
  if(!trustedProxyHops)return peer;
  const raw=req.headers['x-forwarded-for'];
  if(typeof raw!=='string'||raw.length>2048)return peer;
  const chain=raw.split(',').map(x=>x.trim());
  const candidate=chain[chain.length-trustedProxyHops];
  return candidate&&isIP(candidate)?candidate:peer;
}
const digest=value=>createHash('sha256').update(value).digest();
export function previewAuthorized(header,{required=false,username='sidewalk',password=''}={}){
  if(!required)return true;
  if(password.length<24||typeof header!=='string'||header.length>2048||!/^Basic /i.test(header))return false;
  const encoded=header.slice(6);
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return false;
  return timingSafeEqual(digest(Buffer.from(encoded,'base64').toString('utf8')),digest(username+':'+password));
}
export function createBudget({limit,windowMs,now=Date.now}){
  let start=now(),used=0;
  return cost=>{
    const time=now();if(time-start>=windowMs){start=time;used=0;}
    if(used+cost>limit)return false;used+=cost;return true;
  };
}
export function hostingOptions(env=process.env){
  const integer=(name,fallback,min,max)=>{const value=Number(env[name]??fallback);if(!Number.isInteger(value)||value<min||value>max)throw Error(`Invalid ${name}`);return value;};
  const auth={required:env.PREVIEW_AUTH_REQUIRED==='1',username:env.PREVIEW_USERNAME||'sidewalk',password:env.PREVIEW_PASSWORD||''};
  if(env.RENDER==='true'&&!auth.required)throw Error('Render preview requires PREVIEW_AUTH_REQUIRED=1');
  if(auth.required&&(auth.password.length<24||auth.username.includes(':')))throw Error('Set a preview password of at least 24 characters and a valid username');
  return {auth,trustedProxyHops:integer('TRUST_PROXY_HOPS',0,0,10),dailyBudget:integer('DAILY_PROVIDER_REQUEST_BUDGET',1000,13,100000),minuteBudget:integer('MINUTE_PROVIDER_REQUEST_BUDGET',120,13,10000)};
}
