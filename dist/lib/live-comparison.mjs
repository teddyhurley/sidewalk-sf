import {routeEvidenceMetrics,evidenceDifferences} from './route-metrics.mjs';
import {nearestSegment,validPoint} from './geo.mjs';
import {routeReportAreas} from './report-areas.mjs';
// Police counts describe coarse areas, never individual route incidents or risk rankings.
export function attachLiveContext(comparison,journey,{buffer,incidentMonths}){
  const e=journey.evidence;
  if(journey.mode!=='live'||e?.fictional!==false||e.reviewStage!=='local-data-preview'||e.version!==1)return comparison;
  const usable=e.sources?.crashes?.health?.usable===true;
  const valid=Array.isArray(e.records)&&e.records.every(r=>r.kind==='collision'&&validPoint(r.coordinates)&&typeof r.id==='string');
  if(!valid)return comparison;
  const match=(r,m)=>{const seen=new Set();return e.records.flatMap(record=>{const n=nearestSegment(record.coordinates,r.coordinates);if(n.meters>m||seen.has(record.id))return [];seen.add(record.id);return [{...record,segment:n.index,offset:n.meters}];});};
  comparison.routes=comparison.routes.map(r=>{const matches=usable?match(r,buffer):[];return {...r,matches,counts:usable?{collision:matches.length,incident:null}:null,sensitivity:usable?[25,50,100].map(m=>({meters:m,collision:match(r,m).length,incident:null})):[]};});
  for(const r of comparison.routes)r.shared=r.matches.filter(a=>comparison.routes[0].matches.some(b=>a.id===b.id)).length;
  comparison.status={usable,label:usable?'Real data · preview':e.sources.crashes.health.label,reason:'Mapped historical records only. Field conditions, reporting completeness and exposure are unknown.'};
  comparison.incidentStatus={usable:false,label:'Reports near street blocks',reason:'Masked police locations provide context near official block shapes. Counts do not locate incidents on a particular block or route.'};
  comparison.collisionWindow=e.collisionWindow;
  comparison.areaReports=e.areaReports.windows[incidentMonths];
  comparison.incidentWindow=comparison.areaReports||comparison.incidentWindow;
  for(const r of comparison.routes)r.reportAreas=comparison.areaReports?.usable?routeReportAreas(r,comparison.areaReports.cells||[]):null;
  for(const r of comparison.routes)r.guidance=routeEvidenceMetrics(r,{cells:comparison.areaReports?.cells||[],reportUsable:comparison.areaReports?.usable===true,crashes:e.records,crashUsable:usable,buffer});
  for(const r of comparison.routes)r.differences=evidenceDifferences(r.guidance,comparison.routes[0].guidance);
  const improved=comparison.routes.slice(1).filter(r=>r.eligible&&(r.differences.reports||r.differences.crashes));
  comparison.takeaway={title:improved.length?'Compare the detour with the evidence':'No clear reduction found within your limit',body:improved.length?'Alternatives are chosen to reduce walking alongside the darkest report blocks, nearby historical crash records, or both. Check both measures: a gain in one can come with a trade-off in the other. These are historical comparisons, not safety ratings.':'The bounded search did not find a distinct option within your time limit with at least 100 m less dark-block overlap (including a boundary-margin check) or fewer mapped crash records. A longer detour may help; the data cannot guarantee a lower-risk walk.'};
  if(!usable&&!comparison.areaReports?.usable)comparison.takeaway={title:'Evidence-guided search unavailable',body:'Usable historical sources and block boundaries are required to compare overlap. These routes can only be compared by walking time until the missing or stale data is restored.'};
  comparison.liveEvidence=e;
  return comparison;
}
