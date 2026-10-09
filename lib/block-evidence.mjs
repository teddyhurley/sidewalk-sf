import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {reportCategories} from '../dist/lib/report-scope.mjs';
import {reportBand} from '../dist/lib/report-areas.mjs';
import {blockProject,prepareBlock,blockDistanceXY} from '../dist/lib/block-geometry.mjs';
const membershipCache=new WeakMap();
export async function loadBlocks(file){
 const bundle=JSON.parse(await readFile(file,'utf8')),s=bundle.snapshot;
 if(!s?.manifest?.reconciled||s.manifest.datasetId!=='e2st-aufe'||!Array.isArray(s.blocks)||s.blocks.length!==s.manifest.usedBlocks||createHash('sha256').update(JSON.stringify(s)).digest('hex')!==bundle.sha256)throw Error('Invalid boundary snapshot');
 const seen=new Set();
 for(const b of s.blocks){if(seen.has(b.id)||!/^06075\d{10}$/.test(b.id)||b.geometry?.type!=='MultiPolygon')throw Error('Invalid block identity');seen.add(b.id);const p=prepareBlock(b.geometry);if(!Object.values(p.bounds).every(Number.isFinite)||p.polygons.some(poly=>!poly.length||poly.some(r=>r.length<4||r.some(x=>!x.every(Number.isFinite)))))throw Error('Invalid block polygon');}
 return s;
}
function membership(records,source){
 const cached=membershipCache.get(records);if(cached?.source===source)return cached;
 const bins=new Map(),prepared=source.blocks.map(b=>({...b,prepared:prepareBlock(b.geometry)}));
 for(const b of prepared){const box=b.prepared.bounds;for(let x=Math.floor((box.left-35)/250);x<=Math.floor((box.right+35)/250);x++)for(let y=Math.floor((box.bottom-35)/250);y<=Math.floor((box.top+35)/250);y++){const key=x+':'+y,list=bins.get(key)||[];list.push(b);bins.set(key,list);}}
 const byBlock=new Map(),unmatched=new Set();
 for(const r of records){const xy=blockProject(r.coordinates),near=bins.get(Math.floor(xy[0]/250)+':'+Math.floor(xy[1]/250))||[];let found=false;for(const b of near){const box=b.prepared.bounds;if(xy[0]<box.left-35||xy[0]>box.right+35||xy[1]<box.bottom-35||xy[1]>box.top+35||blockDistanceXY(xy,b.prepared)>35)continue;found=true;const list=byBlock.get(b.id)||[];list.push(r);byBlock.set(b.id,list);}if(!found)unmatched.add(r.id);}
 const result={source,byBlock,unmatched};membershipCache.set(records,result);return result;
}
export function aggregateBlockReports(records,window,bounds,source,categoryNames=reportCategories){
 if(!source)return {cells:[],count:null,categories:[],unmatched:null};
 const {byBlock,unmatched}=membership(records,source),all=new Map(),cells=[];
 for(const block of source.blocks){const b=block.bbox;if(b[2]<bounds.west||b[0]>bounds.east||b[3]<bounds.south||b[1]>bounds.north)continue;
  const unique=new Map((byBlock.get(block.id)||[]).filter(r=>r.date>=window.from&&r.date<=window.through).map(r=>[r.id,r]));if(!unique.size)continue;
  const categories=categoryNames.map(category=>({category,count:[...unique.values()].filter(r=>r.categories.includes(category)).length}));
  for(const [id,r]of unique)all.set(id,r);
  cells.push({id:block.id,count:unique.size,band:reportBand(unique.size),categories,geometry:block.geometry});
 }
 return {cells:cells.sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),count:all.size,categories:categoryNames.map(category=>({category,count:[...all.values()].filter(r=>r.categories.includes(category)).length})),unmatched:[...new Map(records.filter(r=>r.date>=window.from&&r.date<=window.through&&unmatched.has(r.id)).map(r=>[r.id,r])).values()].length};
}

export function selectedBlockReports(records,window,ids,source,categoryNames=reportCategories){
 if(!source)return {count:null,categories:[]};
 const {byBlock}=membership(records,source),unique=new Map();
 for(const id of new Set(ids))for(const r of byBlock.get(id)||[]){
  if(r.date>=window.from&&r.date<=window.through)unique.set(r.id,r);
 }
 return {count:unique.size,categories:categoryNames.map(category=>({category,count:[...unique.values()].filter(r=>r.categories.includes(category)).length}))};
}
