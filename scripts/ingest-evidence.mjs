// Reconciled source download; invoked manually or by the protected preview scheduler.
import {mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {downloadSource} from '../lib/socrata.mjs';
import {normalizeReports,normalizeCrashes,dateOnly,reportCategories} from '../lib/normalize-evidence.mjs';
import {incidentWindow} from '../dist/lib/analysis.mjs';
const dataDir=process.env.DATA_DIR||'data',auditDir=process.env.AUDIT_DIR||'docs';
await mkdir(dataDir,{recursive:true});await mkdir(auditDir,{recursive:true});
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const asOf=args['as-of']||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if(!dateOnly(asOf))throw new Error('Use --as-of=YYYY-MM-DD');
const reportWindow=incidentWindow(asOf,12);
const collisionWindow={from:args['collision-from']||process.env.COLLISION_FROM||'2024-07-01',through:args['collision-through']||process.env.COLLISION_THROUGH||'2026-06-30'};
if(!dateOnly(collisionWindow.from)||!dateOnly(collisionWindow.through)||collisionWindow.from>collisionWindow.through||collisionWindow.through>asOf)throw new Error('Invalid collision window');
const nextDay=date=>new Date(Date.parse(date)+86400000).toISOString().slice(0,10);
const where=(field,w)=>`${field} >= '${w.from}T00:00:00' AND ${field} < '${nextDay(w.through)}T00:00:00'`;
const specs={
 reports:{id:'wg3w-h783',key:'row_id',where:where('incident_date',reportWindow)+` AND incident_category in (${reportCategories.map(c=>"'"+c+"'").join(',')}) AND report_type_description in ('Initial','Coplogic Initial','Vehicle Initial')`,fields:['row_id','incident_id','incident_date','report_type_description','incident_category','incident_code','latitude','longitude']},
 crashes:{id:'ubvf-ztfx',key:'unique_id',where:where('collision_date',collisionWindow),fields:['unique_id','case_id_pkey','collision_date','tb_latitude','tb_longitude','dph_col_grp_description','primary_rd','secondary_rd']},
 parties:{id:'8gtc-pjc6',key:'unique_id',where:where('collision_date',collisionWindow)+" AND party_type = 'Pedestrian'",fields:['unique_id','case_id_pkey','collision_date','party_type','party_number_ckey']},
 crosswalk:{id:'ci9u-8awy',key:'inc_code',where:'1=1',fields:['inc_code','category']}
};
const downloaded={};
for(const [name,spec]of Object.entries(specs)){
 try{downloaded[name]=await downloadSource(spec);console.log(`${name}: ${downloaded[name].records.length} rows reconciled`);}
 catch(error){
  const attempt={status:'failed',attemptedAt:new Date().toISOString(),asOf,failedSource:name,datasetId:spec.id,error:error.message,priorSnapshotReplaced:false,completedSources:Object.fromEntries(Object.entries(downloaded).map(([k,v])=>[k,v.manifest]))};
  await writeFile(path.join(auditDir,'evidence-validation-attempt.json'),JSON.stringify(attempt,null,2)+'\n');
  console.error(`Evidence refresh failed at ${name}: ${error.message}. No snapshot replaced. See docs/evidence-validation-attempt.json.`);process.exit(1);
 }
}
const reports=normalizeReports(downloaded.reports.records,reportWindow,downloaded.crosswalk.records);
const crashes=normalizeCrashes(downloaded.crashes.records,downloaded.parties.records,collisionWindow);
const snapshot={schemaVersion:1,fictional:false,asOf,retrievedAt:new Date().toISOString(),reviewStage:'local-data-preview',sources:{
 reports:{...downloaded.reports.manifest,window:reportWindow,quality:reports.quality,records:reports.records,categories:reportCategories,usable:reports.quality.taxonomyMismatches===0&&reports.quality.rejectedRows===0&&reports.quality.conflictingEntities===0},
 crashes:{...downloaded.crashes.manifest,window:collisionWindow,quality:crashes.quality,records:crashes.records,usable:crashes.quality.rejectedRows===0&&crashes.quality.conflictingEntities===0&&crashes.quality.missingCrashCases===0&&crashes.quality.groupOnlyCases===0&&crashes.quality.rejectedPartyRows===0&&crashes.quality.partyDateMismatches===0},
 parties:downloaded.parties.manifest,crosswalk:downloaded.crosswalk.manifest},
 limitations:['Retrieval reconciled; publication and reporting completeness are unknown.','Police context covers selected categories at masked intersections, not route-specific danger.','Crash points use simplified centerlines; current street design and exposure are unknown.','Human domain review and user comprehension research are outstanding.']};
const text=JSON.stringify(snapshot),digest=createHash('sha256').update(text).digest('hex');
if(snapshot.sources.reports.usable&&snapshot.sources.crashes.usable){
 await writeFile(path.join(dataDir,'evidence.tmp'),JSON.stringify({sha256:digest,snapshot}),{mode:0o600});await rename(path.join(dataDir,'evidence.tmp'),path.join(dataDir,'evidence.json'));
}
const report={...snapshot,sha256:digest,sources:Object.fromEntries(Object.entries(snapshot.sources).map(([k,v])=>[k,{...v,records:undefined}]))};
await writeFile(path.join(auditDir,'evidence-validation.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(auditDir,'evidence-validation-attempt.json'),JSON.stringify({status:snapshot.sources.reports.usable&&snapshot.sources.crashes.usable?'passed-mechanical-checks':'quality-checks-failed',attemptedAt:snapshot.retrievedAt,asOf,completeSnapshot:true,sha256:digest,reviewStage:snapshot.reviewStage},null,2)+'\n');
console.log(JSON.stringify({stage:snapshot.reviewStage,reports:{usable:snapshot.sources.reports.usable,...reports.quality},crashes:{usable:snapshot.sources.crashes.usable,...crashes.quality}}));
if(!snapshot.sources.reports.usable||!snapshot.sources.crashes.usable)process.exitCode=1;
