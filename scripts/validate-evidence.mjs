// Independently reconcile normalized entity totals against publisher-side aggregates.
import path from 'node:path';
import{mkdir,writeFile}from'node:fs/promises';
import{loadSnapshot}from'../lib/live-evidence.mjs';
import{sourceJson}from'../lib/socrata.mjs';
const auditDir=process.env.AUDIT_DIR||'docs';await mkdir(auditDir,{recursive:true});
const s=await loadSnapshot(path.join(process.env.DATA_DIR||'data','evidence.json')),checks=[];
for(const[kind,key,lng,lat,extra]of [['reports','incident_id','longitude','latitude',''],['crashes','case_id_pkey','tb_longitude','tb_latitude'," AND dph_col_grp_description in ('Vehicle-Pedestrian','Bicycle-Pedestrian','Vehicle-Bicycle-Pedestrian','Pedestrian Only or Pedestrian-Parked Car')"]]){
 const source=s.sources[kind],meta=await sourceJson(`https://data.sfgov.org/api/views/${source.datasetId}.json`);
 if(new Date(meta.rowsUpdatedAt*1000).toISOString()!==source.sourceUpdatedAt)throw new Error('Publisher revision changed; refresh before reconciliation.');
 const u=new URL(`https://data.sfgov.org/resource/${source.datasetId}.json`);
 const where=source.query+extra+` AND ${lng} between -122.52 and -122.35 AND ${lat} between 37.70 and 37.83`;
 u.search=new URLSearchParams({'$select':`count(distinct ${key}) as entities`,'$where':where});const data=await sourceJson(u);
 const publisherEntities=Number(data[0]?.entities),normalizedEntities=source.records.length;
 checks.push({kind,datasetId:source.datasetId,sourceUpdatedAt:source.sourceUpdatedAt,publisherEntities,normalizedEntities,match:publisherEntities===normalizedEntities,query:where});
}
const out={checkedAt:new Date().toISOString(),asOf:s.asOf,status:checks.every(c=>c.match)?'matched':'mismatch',method:'Distinct publisher entity counts restricted to mapped selected records; crashes use group-category membership as a separate check of all-party inclusion.',limitations:'Matching counts do not validate all source semantics, true positions, completeness or current conditions.',checks};
await writeFile(path.join(auditDir,'publisher-reconciliation.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.checks.map(({kind,publisherEntities,normalizedEntities,match})=>({kind,publisherEntities,normalizedEntities,match}))));if(out.status!=='matched')process.exitCode=1;
