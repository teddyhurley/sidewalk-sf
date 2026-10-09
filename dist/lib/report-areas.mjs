import {lineNearBlocksMeters,routeNearBlock} from './block-geometry.mjs';
export function reportBand(count){return count>=30?3:count>=15?2:count>=5?1:0;}
export function routeReportAreas(route,cells){return cells.flatMap(cell=>{const meters=lineNearBlocksMeters([cell],route.coordinates,15);return meters>1?[{id:cell.id,count:cell.count,band:cell.band,meters}]:[];});}
export function optionsOutsideArea(id,routes,cells=[]){const block=cells.find(c=>c.id===id);return block?routes.filter(r=>!routeNearBlock(r.coordinates,block.geometry,50)):[];}

export function optionsOutsideAreas(ids,routes,cells=[]){
 const chosen=[...new Set(ids)];
 if(!chosen.length||chosen.some(id=>!cells.some(c=>c.id===id)))return [];
 return chosen.reduce((remaining,id)=>optionsOutsideArea(id,remaining,cells),routes);
}
export function crimeReportLabel(count){return `${count} crime report${count===1?'':'s'}`;}
