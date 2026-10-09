import {sourceHealth} from './live-evidence.mjs';
import {incidentWindow} from '../dist/lib/analysis.mjs';
import {aggregateBlockReports} from './block-evidence.mjs';
import {prepareBlock,lineNearBlocksMeters,blockProject,blockUnproject} from '../dist/lib/block-geometry.mjs';
import {distance,inSfEnvelope,nearestSegment} from '../dist/lib/geo.mjs';

export function routingEvidence(snapshot,{incidentMonths=6,buffer=50,now=Date.now(),blocks=null}={}){
 const empty={reportUsable:false,crashUsable:false,cells:[],crashes:[],buffer,incidentMonths};
 if(!snapshot||snapshot.fictional!==false||snapshot.reviewStage!=='local-data-preview')return empty;
 const {reports,crashes}=snapshot.sources,window=incidentWindow(snapshot.asOf,incidentMonths);
 const reportUsable=!!blocks&&sourceHealth(reports,'reports',now).usable&&reports.window.from<=window.from&&reports.window.through>=window.through;
 const crashUsable=sourceHealth(crashes,'crashes',now).usable;
 return {...empty,reportUsable,crashUsable,window,cells:reportUsable?aggregateBlockReports(reports.records,window,{west:-122.52,east:-122.35,south:37.70,north:37.83},blocks,reports.categories).cells:[],crashes:crashUsable?crashes.records:[]};
}
// Waypoints steer provider requests around a rectangle. Returned paths must still be measured.
function aroundBounds(bounds,baseline,padding){
 const b={left:bounds.left-padding,right:bounds.right+padding,bottom:bounds.bottom-padding,top:bounds.top+padding};
 const a=blockProject(baseline.coordinates[0]),z=blockProject(baseline.coordinates.at(-1));
 const paths=Math.abs(z[0]-a[0])>Math.abs(z[1]-a[1])?
  [[[b.left,b.bottom],[b.right,b.bottom]],[[b.left,b.top],[b.right,b.top]]]:
  [[[b.left,b.bottom],[b.left,b.top]],[[b.right,b.bottom],[b.right,b.top]]];
 return paths.map(points=>{const along=p=>(p[0]-a[0])*(z[0]-a[0])+(p[1]-a[1])*(z[1]-a[1]);return points.sort((p,q)=>along(p)-along(q)).map(blockUnproject);}).filter(points=>points.every(inSfEnvelope)&&points.every(p=>distance(p,baseline.coordinates[0])>100&&distance(p,baseline.coordinates.at(-1))>100));
}
export function evidenceWaypoints(baseline,evidence){
 const reportPlans=[],crashPlans=[];
 if(evidence.reportUsable){
  const touched=evidence.cells.filter(c=>c.band===3&&lineNearBlocksMeters([c],baseline.coordinates,15)>1).sort((a,b)=>b.count-a.count);
  if(touched.length){
   const bounds=touched.map(c=>prepareBlock(c.geometry).bounds);
   // Try clearing the whole run of darkest cells, then the most-reported individual block.
   const combined={left:Math.min(...bounds.map(b=>b.left)),right:Math.max(...bounds.map(b=>b.right)),bottom:Math.min(...bounds.map(b=>b.bottom)),top:Math.max(...bounds.map(b=>b.top))};
   for(const b of [combined,bounds[0]])for(const points of aroundBounds(b,baseline,140))reportPlans.push({points,purpose:'reports'});
  }
 }
 if(evidence.crashUsable){
  const matched=evidence.crashes.filter(r=>nearestSegment(r.coordinates,baseline.coordinates).meters<=evidence.buffer);
  const clusters=matched.map(r=>{const nearby=matched.filter(p=>distance(p.coordinates,r.coordinates)<=150);return {center:r.coordinates,nearby};}).sort((a,b)=>b.nearby.length-a.nearby.length);
  const centers=[];
  for(const cluster of clusters){if(cluster.nearby.length<2||centers.some(p=>distance(p,cluster.center)<300))continue;centers.push(cluster.center);const [x,y]=blockProject(cluster.center);for(const points of aroundBounds({left:x-150,right:x+150,bottom:y-150,top:y+150},baseline,100))crashPlans.push({points,purpose:'crashes'});if(centers.length===2)break;}
 }
 return [...reportPlans,...crashPlans].filter((p,i,all)=>all.findIndex(q=>JSON.stringify(q.points)===JSON.stringify(p.points))===i);
}
