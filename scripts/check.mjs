import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith('.')||entry.name==='node_modules')continue;const p=dir+'/'+entry.name;if(entry.isDirectory())result.push(...await walk(p));else if(p.endsWith('.mjs'))result.push(p);}return result;}
for(const file of await walk('.')){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const html=await readFile('dist/index.html','utf8');
if(!html.includes('Fictional demo'))throw new Error('Demo provenance banner missing');
console.log('JavaScript syntax and demo provenance checks passed.');
