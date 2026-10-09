// Read-only source audit. This does not activate live evidence or download reports.
// Run: node --env-file-if-exists=.env scripts/audit-sources.mjs
import {writeFile,mkdir} from 'node:fs/promises';
const inventory=[
  {id:'ubvf-ztfx',kind:'crashes',date:'collision_date',required:['unique_id','case_id_pkey','tb_latitude','tb_longitude','dph_col_grp_description','collision_date'],categories:'dph_col_grp_description'},
  {id:'wg3w-h783',kind:'reports',date:'incident_date',required:['row_id','incident_id','incident_category','incident_date','latitude','longitude']},
  {id:'enwt-3u8m',kind:'hin',required:['cnn_sgmt_pkey','geom','full_street_name']}
];
async function json(url){const headers={Accept:'application/json'};if(process.env.SOCRATA_APP_TOKEN)headers['X-App-Token']=process.env.SOCRATA_APP_TOKEN;const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Source responded with HTTP ${response.status}`);return response.json();}
const sources=await Promise.all(inventory.map(async source=>{
  const metadataUrl=`https://data.sfgov.org/api/views/${source.id}.json`,result={...source,metadataUrl,verifiedAt:new Date().toISOString()};
  try {
    const metadata=await json(metadataUrl),fields=metadata.columns.filter(c=>!c.fieldName.startsWith(':')).map(c=>({name:c.fieldName,type:c.dataTypeName}));
    result.title=metadata.name;result.catalogUpdatedAt=new Date(metadata.rowsUpdatedAt*1000).toISOString();result.fields=fields;result.missingFields=source.required.filter(f=>!fields.some(c=>c.name===f));
    const stats=new URL(`https://data.sfgov.org/resource/${source.id}.json`);
    stats.searchParams.set('$select',source.date?`count(*) as rows,min(${source.date}) as earliest,max(${source.date}) as latest`:'count(*) as rows');
    try{result.aggregateProbe=await json(stats);}catch(e){result.aggregateProbeError=e.message;}
    if(source.categories){const u=new URL(`https://data.sfgov.org/resource/${source.id}.json`);u.searchParams.set('$select',source.categories+',count(*) as rows');u.searchParams.set('$group',source.categories);u.searchParams.set('$limit','100');try{result.categoryProbe=await json(u);}catch(e){result.categoryProbeError=e.message;}}
    result.schemaVerified=result.missingFields.length===0;
  } catch(e){result.schemaVerified=false;result.error=e.message;}
  return result;
}));
const report={purpose:'Metadata and aggregate availability audit; not a complete evidence snapshot or route assessment',retrievedAt:new Date().toISOString(),sources,limitations:['Latest event date does not establish complete coverage.','Category semantics and reporting bias need review.','No route evidence was enabled.']};
await mkdir('data',{recursive:true});await writeFile('data/source-audit.json',JSON.stringify(report,null,2)+'\n');
for(const s of sources)console.log(`${s.id}: ${s.schemaVerified?'schema verified':'schema unavailable'}; aggregates ${s.aggregateProbe?'returned':'unavailable'}`);
console.log('Saved data/source-audit.json. No live evidence has been enabled.');
if(sources.some(s=>!s.schemaVerified))process.exitCode=1;
