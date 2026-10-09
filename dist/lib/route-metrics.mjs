import {lineNearBlocksMeters} from './block-geometry.mjs';
import {nearestSegment} from './geo.mjs';
// Descriptive objectives stay separate. These are not estimates of personal risk.
export function routeEvidenceMetrics(route,{cells=[],reportUsable=false,crashes=[],crashUsable=false,buffer=50}={}){
 const dark=cells.filter(c=>c.band===3);
 return {
  darkMeters:reportUsable?lineNearBlocksMeters(dark,route.coordinates,15):null,
  darkMarginMeters:reportUsable?lineNearBlocksMeters(dark,route.coordinates,50):null,
  crashes:crashUsable?new Set(crashes.filter(r=>nearestSegment(r.coordinates,route.coordinates).meters<=buffer).map(r=>r.id)).size:null
 };
}
export function evidenceDifferences(metrics,baseline){
 return {reports:metrics.darkMeters!==null&&baseline.darkMeters!==null&&baseline.darkMeters-metrics.darkMeters>=100&&baseline.darkMarginMeters-metrics.darkMarginMeters>=100,crashes:metrics.crashes!==null&&baseline.crashes!==null&&metrics.crashes<baseline.crashes};
}
