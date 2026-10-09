import {nearestSegment,validPoint,inSfEnvelope} from './geo.mjs';

export const facilityTypes={
  public_housing:{label:'Public housing',symbol:'PH',className:'public-housing'},
  former_public_housing:{label:'Former public housing',symbol:'FH',className:'former-public-housing'},
  halfway_house:{label:'Halfway house',symbol:'HH',className:'halfway-house'},
  reentry_housing:{label:'Reentry housing',symbol:'RH',className:'reentry-housing'}
};

// These are entirely invented locations, not claims about any real property.
export const demoFacilityDirectory={
  fictional:true,updated:'2026-10-01',complete:true,
  source:'Invented demo directory — no real facility locations',
  records:[
    {id:'PH-A',type:'public_housing',name:'Public housing example A',coordinates:[-122.3976,37.7934],fictional:true},
    {id:'HH-A',type:'halfway_house',name:'Halfway house example A',coordinates:[-122.3974,37.7897],fictional:true},
    {id:'PH-B',type:'public_housing',name:'Public housing example B',coordinates:[-122.3918,37.7919],fictional:true},
    {id:'HH-B',type:'halfway_house',name:'Halfway house example B',coordinates:[-122.3943,37.7924],fictional:true}
  ]
};

const facilityDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const publicSource=s=>{try{const u=new URL(s.url);return typeof s.label==='string'&&s.label.length>0&&u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
// Only reviewed public-place fields cross this boundary. A publication check
// is not an inspection, an entrance survey, or comprehensive city coverage.
export function reviewedFacilityDirectory(input,now=Date.now()) {
  if(input?.schemaVersion!==1||input.fictional!==false||input.coverage!=='partial'||!facilityDay(input.updated)||!Array.isArray(input.records)||input.records.length>500||!Number.isFinite(now))return null;
  const today=new Date(now).toISOString().slice(0,10),seen=new Set(),records=[];
  if(input.updated>today)return null;
  let withheldCount=Number.isInteger(input.withheldCount)&&input.withheldCount>=0?input.withheldCount:0;
  for(const r of input.records){
    if(!r||typeof r.id!=='string'||!r.id||seen.has(r.id)||r.fictional!==false||!Object.hasOwn(facilityTypes,r.type)||!inSfEnvelope(r.coordinates)||r.status!=='source-listed'||!['name','address','statusNote','locationNote'].every(k=>typeof r[k]==='string'&&r[k].trim())||!facilityDay(r.verifiedOn)||!facilityDay(r.reviewBy)||r.verifiedOn>today||r.reviewBy<r.verifiedOn||Date.parse(r.reviewBy)-Date.parse(r.verifiedOn)>90*86400000||!Array.isArray(r.sources)||r.sources.length<2||!r.sources.every(publicSource))return null;
    seen.add(r.id);
    if(r.reviewBy<today){withheldCount++;continue;}
    records.push({id:r.id,type:r.type,name:r.name,address:r.address,coordinates:[...r.coordinates],fictional:false,status:r.status,statusNote:r.statusNote,locationNote:r.locationNote,verifiedOn:r.verifiedOn,reviewBy:r.reviewBy,sources:r.sources.map(s=>({label:s.label,url:s.url}))});
  }
  return {schemaVersion:1,fictional:false,coverage:'partial',updated:input.updated,source:'Reviewed public facility listings',records,withheldCount};
}

// Informational proximity only. This result is never passed to route scoring,
// evidence counts, detour eligibility or the route-difference callout.
export function nearbyFacilities(journey,route,{radius=150,types=Object.keys(facilityTypes),scope='route',now=Date.now()}={}) {
  if(![50,150,300].includes(radius))throw new Error('Choose a facility radius of 50, 150, or 300 metres.');
  if(!['route','city'].includes(scope))throw new Error('Choose the selected route or city directory.');
  const demo=journey.mode==='demo',directory=demo?journey.facilities:journey.mode==='live'?reviewedFacilityDirectory(journey.facilities,now):null;
  if(!directory||(demo&&(directory.fictional!==true||directory.complete!==true))||!Array.isArray(directory.records)) {
    return {available:false,records:[],radius,reason:'Facility directory not connected. Housing and reentry locations have not been checked.'};
  }
  if(!demo&&!directory.records.length)return {available:false,records:[],radius,reason:'Facility listings need a new review. Locations are withheld until the directory is updated.'};
  const seen=new Set();
  const records=directory.records.flatMap(record=>{
    if(!record.id||seen.has(record.id)||!Object.hasOwn(facilityTypes,record.type)||!types.includes(record.type)||record.fictional!==demo||!validPoint(record.coordinates))return [];
    const meters=nearestSegment(record.coordinates,route.coordinates).meters;
    if(scope==='route'&&meters>radius)return [];
    seen.add(record.id);return [{...record,meters}];
  }).sort((a,b)=>a.meters-b.meters);
  const categoryCounts=Object.fromEntries(Object.keys(facilityTypes).map(type=>[type,directory.records.filter(r=>r.type===type).length]));
  return {available:true,records,radius,scope,fictional:demo,coverage:demo?'fictional':'partial',directoryCount:directory.records.length,categoryCounts,withheldCount:directory.withheldCount||0,updated:directory.updated,source:directory.source};
}
