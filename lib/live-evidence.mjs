import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inSfEnvelope,nearestSegment} from '../dist/lib/geo.mjs';
import {incidentWindow} from '../dist/lib/analysis.mjs';
import {dateOnly} from './normalize-evidence.mjs';
import {aggregateBlockReports,selectedBlockReports} from './block-evidence.mjs';
import {reportCategories,reportCoverageNote} from '../dist/lib/report-scope.mjs';
const ids={reports:'wg3w-h783',crashes:'ubvf-ztfx'};
export function verifyBundle(bundle){
  const s=bundle?.snapshot;
  if(!s||s.schemaVersion!==1||s.fictional!==false||s.reviewStage!=='local-data-preview'||!s.asOf||dateOnly(s.asOf)!==s.asOf||createHash('sha256').update(JSON.stringify(s)).digest('hex')!==bundle.sha256)throw new Error('Invalid evidence snapshot integrity or provenance');
  for(const kind of ['reports','crashes']){
    const source=s.sources?.[kind];
    if(!source||source.datasetId!==ids[kind]||!Array.isArray(source.records)||source.reconciled!==true||!dateOnly(source.window?.from)||!dateOnly(source.window?.through)||source.window.from>source.window.through||source.window.through>s.asOf||!source.quality||!Number.isInteger(source.quality.inputRows)||source.quality.mappableEntities!==source.records.length)throw new Error('Invalid source manifest');
    const seen=new Set();
    for(const r of source.records){if(typeof r.id!=='string'||!r.id||seen.has(r.id)||!inSfEnvelope(r.coordinates)||dateOnly(r.date)!==r.date||r.date<source.window.from||r.date>source.window.through||r.kind!==(kind==='crashes'?'collision':'incident')||!Array.isArray(r.categories)||r.categories.some(c=>typeof c!=='string'))throw new Error('Invalid normalized record');seen.add(r.id);}
    if(kind==='reports'&&(!Array.isArray(source.categories)||!source.categories.length||new Set(source.categories).size!==source.categories.length||source.categories.some(c=>!reportCategories.includes(c))||source.records.some(r=>r.categories.some(c=>!source.categories.includes(c)))))throw new Error('Invalid report categories');
  }
  return s;
}
export async function loadSnapshot(file){return verifyBundle(JSON.parse(await readFile(file,'utf8')));}
export function sourceHealth(source,kind,now){
  const updated=Date.parse(source?.sourceUpdatedAt),retrieved=Date.parse(source?.retrievedAt),age=now-retrieved;
  if(!source||source.usable!==true||source.reconciled!==true||!source.quality||!Array.isArray(source.records)||![updated,retrieved,now].every(Number.isFinite)||updated>retrieved+60000||retrieved>now+60000)return {usable:false,label:'Source checks failed'};
  const days=kind==='reports'?3:14;
  const publisherDays=kind==='reports'?3:120;
  if(age>days*86400000||now-updated>publisherDays*86400000)return {usable:false,label:'Snapshot stale'};
  if(source.quality.inputRows>0&&source.records.length===0)return {usable:false,label:'No mappable coverage'};
  return {usable:true,label:'Historical SF data preview'};
}
export function journeyBounds(routes,padding=500){
  const p=routes.flatMap(r=>r.coordinates),lat=p.reduce((s,r)=>s+r[1],0)/p.length;
  const dy=padding/111195,dx=dy/Math.cos(lat*Math.PI/180);
  return {west:Math.min(...p.map(r=>r[0]))-dx,east:Math.max(...p.map(r=>r[0]))+dx,south:Math.min(...p.map(r=>r[1]))-dy,north:Math.max(...p.map(r=>r[1]))+dy,paddingMeters:padding};
}
export function liveContext(snapshot,routes,now=Date.now(),blocks=null){
  if(!snapshot)return null;
  const {crashes,reports}=snapshot.sources,collisionHealth=sourceHealth(crashes,'crashes',now),reportHealth=sourceHealth(reports,'reports',now);
  const bounds=journeyBounds(routes);
  const records=collisionHealth.usable?crashes.records.filter(r=>routes.some(route=>nearestSegment(r.coordinates,route.coordinates).meters<=100)):[];
  const windows={};
  for(const months of [3,6,12]){
    const window=incidentWindow(snapshot.asOf,months),covered=!!blocks&&reportHealth.usable&&reports.window.from<=window.from&&reports.window.through>=window.through;
    const aggregated=covered?aggregateBlockReports(reports.records,window,bounds,blocks,reports.categories):{cells:[],count:null,categories:[],unmatched:null};
    windows[months]={...window,usable:covered,...aggregated};
  }
  const publicSource=(source,health)=>({datasetId:source.datasetId,url:source.url,title:source.title,window:source.window,updated:source.sourceUpdatedAt,retrieved:source.retrievedAt,quality:source.quality,health,...(source.categories?{categories:source.categories,coverageNote:reportCoverageNote}:{})});
  return {version:1,fictional:false,reviewStage:'local-data-preview',asOf:snapshot.asOf,collisionWindow:crashes.window,records,sources:{crashes:publicSource(crashes,collisionHealth),reports:publicSource(reports,reportHealth)},areaReports:{bounds,windows,geometryType:'street-blocks',boundarySource:blocks?.manifest||null,proximityMeters:35,method:'Official 2020 Census block shapes, clipped to the shoreline. Counts include selected reports whose published, masked intersection is inside or within 35 m of the block. Reports can appear beside multiple blocks; block counts must not be summed. Boundaries do not locate an incident or define danger.'},limitations:snapshot.limitations};
}

// Aggregates for an explicit map selection; raw police identities remain server-side.
export function liveReportSelection(snapshot,blocks,ids,months,now=Date.now()){
 const source=snapshot?.sources?.reports;
 const window=snapshot?incidentWindow(snapshot.asOf,months):null;
 const usable=!!blocks&&!!window&&sourceHealth(source,'reports',now).usable&&source.window.from<=window.from&&source.window.through>=window.through;
 return {usable,asOf:snapshot?.asOf||null,...window,areaCount:ids.length,
  ...(usable?selectedBlockReports(source.records,window,ids,blocks,source.categories):{count:null,categories:[]}),
  coverageNote:reportCoverageNote};
}
