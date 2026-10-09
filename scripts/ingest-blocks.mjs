import {mkdir,writeFile,rename} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {downloadSource} from '../lib/socrata.mjs';
const source=await downloadSource({id:'e2st-aufe',key:'geoid20',where:'1=1',fields:['geoid20','multipolygon']},{pageSize:1000,maxRows:10000});
const blocks=[];let outsideEnvelope=0;
for(const row of source.records){
 const g=row.multipolygon,id=row.geoid20.padStart(15,'0');
 if(!/^06075\d{10}$/.test(id)||g?.type!=='MultiPolygon'||!Array.isArray(g.coordinates)||!g.coordinates.length)throw Error('Invalid block geometry or county identifier');
 const coordinates=g.coordinates.flat(2);
 if(!coordinates.length||coordinates.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw Error('Invalid block coordinates');
 if(g.coordinates.some(p=>p.some(r=>r.length<4||JSON.stringify(r[0])!==JSON.stringify(r.at(-1)))))throw Error('Unclosed block ring');
 const bbox=[Math.min(...coordinates.map(p=>p[0])),Math.min(...coordinates.map(p=>p[1])),Math.max(...coordinates.map(p=>p[0])),Math.max(...coordinates.map(p=>p[1]))];
 if(bbox[2]<-122.52||bbox[0]>-122.35||bbox[3]<37.70||bbox[1]>37.83){outsideEnvelope++;continue;}
 blocks.push({id,geometry:g,bbox});
}
const manifest={...source.manifest,vintage:2020,identifierNormalization:'Publisher GEOIDs omit the leading state zero; restored to 15 digits.',usedBlocks:blocks.length,outsideEnvelope,license:'https://opendatacommons.org/licenses/pddl/1.0/',purpose:'Boundary geometry only; no population, housing or demographic attributes requested.'};
const validation=spawnSync(process.env.BOUNDARY_PYTHON||'python3',['scripts/validate-blocks.py'],{input:JSON.stringify({manifest,blocks}),encoding:'utf8',maxBuffer:20*1024*1024});
if(validation.status!==0)throw Error(validation.stderr||'Boundary topology validation failed');
const snapshot=JSON.parse(validation.stdout);const bundle={snapshot,sha256:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')};
await mkdir('assets',{recursive:true});await writeFile('assets/sf-blocks-2020.json.tmp',JSON.stringify(bundle));await rename('assets/sf-blocks-2020.json.tmp','assets/sf-blocks-2020.json');
await writeFile('docs/block-boundary-validation.json',JSON.stringify({...snapshot.manifest,sha256:bundle.sha256},null,2)+'\n');
console.log(JSON.stringify({sourceRows:source.records.length,usedBlocks:blocks.length,outsideEnvelope,bytes:JSON.stringify(bundle).length,reconciled:source.manifest.reconciled}));
