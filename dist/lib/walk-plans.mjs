import {validRoute,inSfEnvelope} from './geo.mjs';
export const savedWalksKey='sidewalk-saved-walks-v1';
const textField=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
const dateField=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
const cleanOptions=o=>({maxDetour:o.maxDetour,buffer:o.buffer,incidentMonths:o.incidentMonths});
function cleanHandoffStops(stops=[]){
  if(!Array.isArray(stops)||stops.length>3||stops.some(s=>!textField(s)||s.length>120||s.includes('|')))throw Error('Use up to three stops, each under 121 characters, without a | character.');
  return stops.map(s=>s.trim());
}
function cleanRoute(r){
  if(!r||!textField(r.id)||!textField(r.name)||!validRoute(r)||r.coordinates.length>20000||!r.coordinates.every(inSfEnvelope))throw Error('Invalid sample route.');
  return {id:r.id,name:r.name,duration:r.duration,distance:r.distance,coordinates:r.coordinates.map(p=>[p[0],p[1]])};
}
export function validateSavedWalk(x){
  if(!x||x.version!==1||!['live-trip','sample-walk'].includes(x.kind)||typeof x.id!=='string'||! /^[a-zA-Z0-9-]{1,80}$/.test(x.id)||typeof x.createdAt!=='string'||x.createdAt.length>40||!Number.isFinite(Date.parse(x.createdAt)))throw Error('Invalid saved walk.');
  const i=x.inputs,o=x.options;
  if(!i||!textField(i.origin)||!textField(i.destination)||typeof i.departure!=='string'||!/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/.test(i.departure)||!o||![0,3,5,10,15].includes(o.maxDetour)||![25,50,100].includes(o.buffer)||![3,6,12].includes(o.incidentMonths))throw Error('Invalid saved preferences.');
  const review={};for(const k of ['asOf','reportFrom','reportThrough','crashFrom','crashThrough'])if(dateField(x.review?.[k]))review[k]=x.review[k];
  const stops=cleanHandoffStops(i.stops);
  const out={version:1,id:x.id,kind:x.kind,createdAt:x.createdAt,inputs:{origin:i.origin,destination:i.destination,departure:i.departure,...(stops.length?{stops}:{})},options:cleanOptions(o),review};
  // Live persistence is a strict allowlist. No provider labels, geocodes, path or steps.
  if(x.kind==='sample-walk'){
    if(!x.sample||!['complete','missing','stale','partial-incidents'].includes(x.sample.scenario)||!Array.isArray(x.sample.routes)||!x.sample.routes.length||x.sample.routes.length>3)throw Error('Invalid sample snapshot.');
    const routes=x.sample.routes.map(cleanRoute);
    if(new Set(routes.map(r=>r.id)).size!==routes.length||!routes.some(r=>r.id===x.sample.selectedRouteId))throw Error('Invalid sample selection.');
    out.sample={scenario:x.sample.scenario,selectedRouteId:x.sample.selectedRouteId,routes};
  }
  return out;
}
export function makeSavedWalk({id,now=new Date().toISOString(),journey,comparison,selected,inputs,options,scenario='complete'}){
  if(!journey||!comparison||!journey.routes.some(r=>r.id===selected))throw Error('Choose a route first.');
  const isSample=journey.mode==='demo'&&journey.evidence?.fictional===true;
  if(!isSample&&journey.mode!=='live')throw Error('Unrecognized route source.');
  return validateSavedWalk({version:1,id,kind:isSample?'sample-walk':'live-trip',createdAt:now,inputs,options,
    review:{asOf:isSample?journey.asOf:journey.evidence?.asOf,reportFrom:comparison.incidentWindow?.from,reportThrough:comparison.incidentWindow?.through,crashFrom:comparison.collisionWindow?.from,crashThrough:comparison.collisionWindow?.through},
    ...(isSample?{sample:{scenario,selectedRouteId:selected,routes:journey.routes}}:{})});
}
export function readSavedWalks(storage){
  try{const raw=storage.getItem(savedWalksKey);if(!raw)return {walks:[],warning:''};if(raw.length>2000000)throw Error();const value=JSON.parse(raw);if(!Array.isArray(value)||value.length>20)throw Error();
    const walks=[];let skipped=0;for(const item of value){try{const clean=validateSavedWalk(item);if(walks.some(w=>w.id===clean.id))throw Error();walks.push(clean);}catch{skipped++;}}
    return {walks,warning:skipped?'Some saved items could not be read. Valid walks are still available.':''};
  }catch{return {walks:[],warning:'Saved walks are unavailable in this browser. Check browser storage settings.'};}
}
export function writeSavedWalks(storage,walks){
  if(walks.length>20)throw Error('You have 20 saved walks. Remove one before saving another.');
  const clean=walks.map(validateSavedWalk);try{storage.setItem(savedWalksKey,JSON.stringify(clean));}catch{throw Error('This browser could not save the walk. Storage may be full or disabled.');}return clean;
}
export function mapsLinks(inputs,{fictional=false}={}){
  if(fictional||!inputs||!textField(inputs.origin)||!textField(inputs.destination))return null;
  // User-entered strings only. Never export temporary geocodes or Directions results.
  const sfAddress=value=>/\b(?:San Francisco|SF)\b/i.test(value)?value:value+', San Francisco, CA';
  const origin=sfAddress(inputs.origin),destination=sfAddress(inputs.destination);
  const google=new URL('https://www.google.com/maps/dir/');google.search=new URLSearchParams({api:'1',origin,destination,travelmode:'walking'});
  const apple=new URL('https://maps.apple.com/directions');apple.search=new URLSearchParams({source:origin,destination,mode:'walking'});
  const stops=cleanHandoffStops(inputs.stops).map(sfAddress);
  if(stops.length)google.searchParams.set('waypoints',stops.join('|'));
  for(const stop of stops)apple.searchParams.append('waypoint',stop);
  if(google.href.length>2048)throw Error('This Maps link is too long. Shorten the entered addresses or stops.');
  return {google:google.href,apple:apple.href};
}
