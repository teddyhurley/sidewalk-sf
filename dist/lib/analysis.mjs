import {nearestSegment,validPoint,validRoute} from './geo.mjs';
const day=86400000;
const validDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
export function incidentWindow(asOf,months=6) {
  if(![3,6,12].includes(months)) throw new Error('Choose 3, 6, or 12 months of incident reports.');
  if(!validDate(asOf)) throw new Error('The assessment date is invalid.');
  const end=new Date(asOf+'T00:00:00Z'),start=new Date(end);
  start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()-months);
  const lastDay=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
  start.setUTCDate(Math.min(end.getUTCDate(),lastDay));
  return {from:start.toISOString().slice(0,10),through:asOf,months};
}
export function incidentCoverageStatus(e,window) {
  const c=e?.incidentCoverage;
  if(!c || c.complete!==true || !validDate(c.from) || !validDate(c.through) || c.from>window.from || c.through<window.through || c.from<e.from || c.through>e.through) return {usable:false,label:'Incident coverage incomplete',reason:'The full selected incident window is not covered. Report counts are unavailable, not zero.'};
  return {usable:true,label:'Sample incident coverage available'};
}
export function evidenceStatus(e,asOf) {
  if(!e || !Array.isArray(e.records) || e.complete!==true) return {usable:false,label:'Coverage incomplete',reason:'Insufficient information to compare. Missing records are not evidence of no concerns.'};
  if(![e.from,e.through,e.updated,e.retrieved,asOf].every(validDate)) return {usable:false,label:'Dates unverified',reason:'Evidence dates could not be validated. Comparison is withheld.'};
  const dates=[e.from,e.through,e.updated,e.retrieved,asOf].map(x=>Date.parse(x));
  if(dates.some(x=>!Number.isFinite(x)) || dates[0]>dates[1] || dates[1]>dates[2] || dates[2]>dates[3] || dates[3]>dates[4]) return {usable:false,label:'Dates unverified',reason:'Evidence dates could not be validated. Comparison is withheld.'};
  if((dates[4]-dates[2])/day>120) return {usable:false,label:'Stale snapshot',reason:'This snapshot has not been refreshed for more than 120 days. Route differences are withheld.'};
  return {usable:true,label:'Sample coverage available',reason:'Historical records only. No prediction of current conditions or individual risk.'};
}
export function matchRecords(route,evidence,buffer=50,{incident=incidentWindow(evidence.through),incidentUsable=true}={}) {
  const seen=new Set(),result=[];
  for(const record of evidence.records) {
    if(!record.id || !['collision','incident'].includes(record.kind) || !validPoint(record.coordinates)) continue;
    if(!validDate(record.date) || record.date<evidence.from || record.date>evidence.through) continue;
    const window=record.kind==='incident'?incident:evidence.collisionWindow;
    if(!window || !validDate(window.from) || !validDate(window.through) || record.date<window.from || record.date>window.through || (record.kind==='incident' && !incidentUsable)) continue;
    const key=record.kind+':'+record.id;
    const nearest=nearestSegment(record.coordinates,route.coordinates);
    if(nearest.meters<=buffer && !seen.has(key)) {seen.add(key);result.push({...record,segment:nearest.index,offset:nearest.meters});}
  }
  return result;
}
const counts=(matches,incidentUsable=true)=>({collision:matches.filter(x=>x.kind==='collision').length,incident:incidentUsable?matches.filter(x=>x.kind==='incident').length:null});
export function compareJourney(journey,{maxDetour=5,buffer=50,incidentMonths=6}={}) {
  if(!Number.isFinite(maxDetour) || maxDetour<0 || maxDetour>30) throw new Error('Choose a detour between 0 and 30 minutes.');
  if(![25,50,100].includes(buffer)) throw new Error('Unsupported corridor width.');
  if(!journey.routes?.length || journey.routes.some(r=>!validRoute(r)) || new Set(journey.routes.map(r=>r.id)).size!==journey.routes.length) throw new Error('No valid walking routes were returned.');
  // The live V1 deliberately does not attach synthetic evidence to real routes.
  const status=journey.mode==='demo' && journey.evidence?.fictional===true ? evidenceStatus(journey.evidence,journey.asOf):{usable:false,label:'Real evidence not connected',reason:'Live routes are available, but a reviewed SF evidence pipeline is not connected. No route assessment is made.'};
  const incident=incidentWindow(journey.asOf,incidentMonths);
  const collision=journey.evidence?.collisionWindow;
  if(status.usable && (!collision || !validDate(collision.from) || !validDate(collision.through) || collision.from>collision.through || collision.from<journey.evidence.from || collision.through>journey.evidence.through)) Object.assign(status,{usable:false,label:'Collision dates unverified',reason:'The collision observation window is unverified. Comparison is withheld.'});
  const incidentStatus=status.usable?incidentCoverageStatus(journey.evidence,incident):status;
  const filter={incident,incidentUsable:incidentStatus.usable};
  const sorted=[...journey.routes].sort((a,b)=>a.duration-b.duration);
  const fastest=sorted[0];
  const routes=sorted.map(r=>{
    const matches=status.usable?matchRecords(r,journey.evidence,buffer,filter):[];
    return {...r,extraMinutes:(r.duration-fastest.duration)/60,eligible:(r.duration-fastest.duration)<=maxDetour*60+0.001,matches,counts:status.usable?counts(matches,incidentStatus.usable):null};
  });
  const baseline=routes[0];
  for(const r of routes) {
    r.shared=baseline.matches.filter(a=>r.matches.some(b=>a.id===b.id&&a.kind===b.kind)).length;
    r.sensitivity=status.usable?[25,50,100].map(m=>({meters:m,...counts(matchRecords(r,journey.evidence,m,filter),incidentStatus.usable)})):[];
  }
  const alternative=routes.slice(1).find(r=>r.eligible && status.usable && r.counts.collision<baseline.counts.collision);
  let takeaway={title:'Insufficient information to compare',body:status.reason};
  if(status.usable) {
    if(alternative) takeaway={title:`A ${Math.round(alternative.extraMinutes)}-minute detour changes the picture`,body:`${alternative.name} has ${baseline.counts.collision-alternative.counts.collision} fewer fictional pedestrian collision records near its line. Reported incidents are shown separately; these counts do not establish lower risk.`,routeId:alternative.id};
    else takeaway={title:'No supported improvement within your limit',body:'No available alternative within your detour limit has fewer fictional pedestrian collision records. You can compare the trade-offs or allow more walking time.'};
  }
  return {routes,fastestId:fastest.id,status,incidentStatus,takeaway,buffer,maxDetour,incidentWindow:incident,collisionWindow:collision||null};
}
