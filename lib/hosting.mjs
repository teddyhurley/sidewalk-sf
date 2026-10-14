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
export function createBudget({limit,windowMs,now=Date.now}){
  let start=now(),used=0;
  return cost=>{
    const time=now();if(time-start>=windowMs){start=time;used=0;}
    if(used+cost>limit)return false;used+=cost;return true;
  };
}
export function hostingOptions(env=process.env){
  const integer=(name,fallback,min,max)=>{const value=Number(env[name]??fallback);if(!Number.isInteger(value)||value<min||value>max)throw Error(`Invalid ${name}`);return value;};
  // Portfolio visitors do not need accounts. Legacy PREVIEW_* environment
  // variables are deliberately ignored so an existing Render service can upgrade.
  const trustedProxyHops=integer('TRUST_PROXY_HOPS',0,0,10);
  if(env.RENDER==='true'&&trustedProxyHops!==0)throw Error('Render preview requires TRUST_PROXY_HOPS=0 until proxy identity is independently verified');
  return {trustedProxyHops,dailyBudget:integer('DAILY_PROVIDER_REQUEST_BUDGET',1000,13,100000),minuteBudget:integer('MINUTE_PROVIDER_REQUEST_BUDGET',120,13,10000)};
}
