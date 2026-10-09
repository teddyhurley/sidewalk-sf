import {inSfEnvelope} from '../dist/lib/geo.mjs';
import {reportCategories} from '../dist/lib/report-scope.mjs';
export {reportCategories};
export const initialTypes=['Initial','Coplogic Initial','Vehicle Initial'];
export const pedestrianGroups=['Vehicle-Pedestrian','Bicycle-Pedestrian','Vehicle-Bicycle-Pedestrian','Pedestrian Only or Pedestrian-Parked Car'];
export const dateOnly=value=>{if(typeof value!=='string')return null;const d=value.slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d?d:null;};
const coordinates=(lng,lat)=>{if(lng===null||lng===undefined||lng===''||lat===null||lat===undefined||lat==='')return null;const p=[Number(lng),Number(lat)];return inSfEnvelope(p)?p:null;};
const inside=(date,w)=>date&&date>=w.from&&date<=w.through;
function collect(rows,key,convert){
  const groups=new Map();let rejectedRows=0;
  for(const row of rows){const r=convert(row);if(!r){rejectedRows++;continue;}const id=row[key];if(!id){rejectedRows++;continue;}const list=groups.get(String(id))||[];list.push(r);groups.set(String(id),list);}
  const records=[];let conflictingEntities=0,missingLocationEntities=0;
  for(const [id,list]of groups){
    const signatures=new Set(list.map(r=>JSON.stringify([r.date,r.coordinates])));
    if(signatures.size>1){conflictingEntities++;continue;}
    if(!list[0].coordinates){missingLocationEntities++;continue;}
    records.push({...list[0],id,categories:[...new Set(list.flatMap(r=>r.categories))].sort()});
  }
  return {records:records.sort((a,b)=>a.id.localeCompare(b.id)),quality:{inputRows:rows.length,rejectedRows,distinctEntities:groups.size,conflictingEntities,missingLocationEntities,mappableEntities:records.length}};
}
export function normalizeReports(rows,window,crosswalk=[]){
  const known=new Map(crosswalk.map(r=>[String(r.inc_code).padStart(6,'0'),String(r.category).toLowerCase()]));let taxonomyMismatches=0;
  const result=collect(rows,'incident_id',row=>{
    const date=dateOnly(row.incident_date);
    if(!inside(date,window)||!reportCategories.includes(row.incident_category)||!initialTypes.includes(row.report_type_description))return null;
    if(!known.size||known.get(String(row.incident_code).padStart(6,'0'))!==row.incident_category.toLowerCase())taxonomyMismatches++;
    return {kind:'incident',date,coordinates:coordinates(row.longitude,row.latitude),categories:[row.incident_category]};
  });result.quality.taxonomyMismatches=taxonomyMismatches;return result;
}
export function normalizeCrashes(rows,parties,window){
  const validParties=parties.filter(r=>r.party_type==='Pedestrian'&&typeof r.case_id_pkey==='string'&&r.case_id_pkey&&inside(dateOnly(r.collision_date),window));
  const pedestrianIds=new Set(validParties.map(r=>r.case_id_pkey));
  const groupIds=new Set(rows.filter(r=>pedestrianGroups.includes(r.dph_col_grp_description)).map(r=>r.case_id_pkey));
  const crashIds=new Set(rows.map(r=>r.case_id_pkey));
  const crashDates=new Map(rows.map(r=>[r.case_id_pkey,dateOnly(r.collision_date)]));
  const quality={rejectedPartyRows:parties.length-validParties.length,partyDateMismatches:validParties.filter(r=>crashDates.has(r.case_id_pkey)&&crashDates.get(r.case_id_pkey)!==dateOnly(r.collision_date)).length,pedestrianPartyCases:pedestrianIds.size,groupOnlyCases:[...groupIds].filter(id=>!pedestrianIds.has(id)).length,partyOnlyCases:[...pedestrianIds].filter(id=>crashIds.has(id)&&!groupIds.has(id)).length,missingCrashCases:[...pedestrianIds].filter(id=>!crashIds.has(id)).length};
  const selected=rows.filter(r=>pedestrianIds.has(r.case_id_pkey));
  const result=collect(selected,'case_id_pkey',row=>{
    const date=dateOnly(row.collision_date);if(!inside(date,window))return null;
    return {kind:'collision',date,coordinates:coordinates(row.tb_longitude,row.tb_latitude),categories:[row.dph_col_grp_description||'Unclassified'],label:[row.primary_rd,row.secondary_rd].filter(Boolean).join(' / ')||'Published crash location'};
  });Object.assign(result.quality,quality,{allCrashRows:rows.length});return result;
}
