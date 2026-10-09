import {walkingSteps} from './walking-steps.mjs';
import {evidenceWaypoints} from './route-guidance.mjs';
import {routeEvidenceMetrics,evidenceDifferences} from '../dist/lib/route-metrics.mjs';
import {distance,inSfEnvelope,nearestSegment,validRoute,lineLength} from '../dist/lib/geo.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function pointAt(line,fraction){let remaining=lineLength(line)*fraction;for(let i=1;i<line.length;i++){const n=distance(line[i-1],line[i]);if(remaining<=n&&n)return line[i-1].map((v,k)=>v+(line[i][k]-v)*remaining/n);remaining-=n;}return line.at(-1);}
export function searchWaypoints(route){
 const line=route.coordinates,a=line[0],b=line.at(-1),lat=(a[1]+b[1])/2,scale=111195,cos=Math.cos(lat*Math.PI/180);
 const dx=(b[0]-a[0])*scale*cos,dy=(b[1]-a[1])*scale,n=Math.hypot(dx,dy);if(n<20)return [];
 const offset=clamp(lineLength(line)*.12,150,450),points=[];
 for(const [fraction,factor]of [[.5,1],[.33,.7],[.67,.7]])for(const side of [-1,1]){const c=pointAt(line,fraction),m=offset*factor*side;const p=[c[0]-dy/n*m/scale/cos,c[1]+dx/n*m/scale];if(inSfEnvelope(p))points.push(p);}
 return points;
}
export function novelDistance(a,b,tolerance=35){
 let novel=0,total=0;
 for(let i=1;i<a.length;i++){const start=a[i-1],end=a[i],meters=distance(start,end),steps=Math.max(1,Math.ceil(meters/30));for(let j=0;j<steps;j++){const f=(j+.5)/steps,p=start.map((v,k)=>v+(end[k]-v)*f);total+=meters/steps;if(nearestSegment(p,b).meters>tolerance)novel+=meters/steps;}}
 return {meters:novel,share:total?novel/total:0};
}
export function distinctPath(a,b){const x=novelDistance(a.coordinates,b.coordinates),y=novelDistance(b.coordinates,a.coordinates);const minimum=Math.min(200,Math.max(70,Math.min(a.distance,b.distance)*.12));return Math.max(x.meters,y.meters)>=minimum&&Math.max(x.share,y.share)>=.12;}
export function hasDetourLoop(route){
 const edges=new Set(),visits=new Map();let repeated=0,traveled=0;
 const key=p=>p.map(n=>n.toFixed(5)).join(',');
 for(let i=0;i<route.coordinates.length;i++){
  const pointKey=key(route.coordinates[i]);if(i){const previous=key(route.coordinates[i-1]),meters=distance(route.coordinates[i-1],route.coordinates[i]);traveled+=meters;const edge=[previous,pointKey].sort().join('|');if(edges.has(edge))repeated+=meters;edges.add(edge);}
  if(visits.has(pointKey)&&traveled-visits.get(pointKey)>150)return true;
  if(!visits.has(pointKey))visits.set(pointKey,traveled);
 }
 return repeated>Math.min(70,route.distance*.06);
}
function routeName(raw,via){
 if(via?.name?.trim())return 'Via '+via.name.trim();
 const totals=new Map();for(const leg of raw.legs||[])for(const step of leg.steps||[])if(step.name?.trim())totals.set(step.name,(totals.get(step.name)||0)+(step.distance||0));
 const names=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,2).map(([name])=>name);
 if(!names.length)for(const leg of raw.legs||[])for(const name of (leg.summary||'').split(',').map(s=>s.trim()).filter(Boolean))if(!names.includes(name)&&names.length<2)names.push(name);
 return names.length?'Via '+names.join(' & '):'Walking option';
}
function normalize(data,origin,destination,via=null){
 return (data.routes||[]).slice(0,3).flatMap((r,i)=>{
  const route={id:'candidate-'+i,name:routeName(r,via),duration:r.duration,distance:r.distance,coordinates:r.geometry?.coordinates,steps:walkingSteps(r),method:via?'via-street':'provider',via:via?{name:via.name||'Nearby streets',coordinates:via.location}:null};
  if(!validRoute(route)||route.coordinates.length>20000||!route.coordinates.every(inSfEnvelope)||distance(origin,route.coordinates[0])>100||distance(destination,route.coordinates.at(-1))>100||hasDetourLoop(route))return [];
  return [route];
 });
}
export function selectEvidenceOptions(candidates,{evidence,maxDetour=5}={}){
 const ordered=[...candidates].sort((a,b)=>a.duration-b.duration),baseline=ordered[0];
 if(!baseline)return [];
 if(!evidence?.reportUsable&&!evidence?.crashUsable){const out=[];for(const r of ordered)if(out.every(a=>distinctPath(a,r)))out.push(r);return out.slice(0,3);}
 const measured=ordered.map(r=>({...r,guidance:routeEvidenceMetrics(r,evidence),selectedFor:[]})),base=measured[0],chosen=[base];
 const eligible=r=>r.duration<=base.duration+maxDetour*60+.001;
 const sortFor=goal=>(a,b)=>Number(eligible(b))-Number(eligible(a)) || (goal==='reports'?a.guidance.darkMarginMeters-b.guidance.darkMarginMeters||a.guidance.darkMeters-b.guidance.darkMeters:a.guidance.crashes-b.guidance.crashes)||a.duration-b.duration;
 for(const goal of ['reports','crashes']){
  const useful=measured.slice(1).filter(r=>evidenceDifferences(r.guidance,base.guidance)[goal]&&distinctPath(r,base)).sort(sortFor(goal));
  const pick=useful.find(r=>chosen.includes(r)||chosen.every(c=>distinctPath(r,c)));
  if(pick){pick.selectedFor.push(goal);if(!chosen.includes(pick))chosen.push(pick);}
 }
 // A guided comparison never fills a card with a path that reduces neither historical measure.
 const remaining=measured.slice(1).filter(r=>Object.values(evidenceDifferences(r.guidance,base.guidance)).some(Boolean)).sort((a,b)=>Number(eligible(b))-Number(eligible(a))||Number(Object.values(evidenceDifferences(b.guidance,base.guidance)).some(Boolean))-Number(Object.values(evidenceDifferences(a.guidance,base.guidance)).some(Boolean))||a.duration-b.duration);
 for(const r of remaining){if(chosen.length===3)break;if(chosen.every(c=>distinctPath(r,c)))chosen.push(r);}
 return chosen.sort((a,b)=>a.duration-b.duration);
}
export async function walkingOptions({origin,destination,token,request,maxDetour=5,evidence=null}){
 const call=async(points,via=false)=>{const url=new URL(`https://api.mapbox.com/directions/v5/mapbox/walking/${points.map(p=>p.join(',')).join(';')}`);url.search=new URLSearchParams({access_token:token,alternatives:via?'false':'true',geometries:'geojson',overview:'full',steps:'true',continue_straight:'true',radiuses:points.map((_,i)=>via&&i>0&&i<points.length-1?'65':'100').join(';')});return request(url);};
 const initial=await call([origin,destination]);let candidates=normalize(initial,origin,destination);
 if(!candidates.length)return {routes:[],search:{attempted:0,failed:0,distinct:0}};
 const initialFastest=[...candidates].sort((a,b)=>a.duration-b.duration)[0];
 const keepDistinct=items=>{const chosen=[];for(const r of [...items].sort((a,b)=>a.duration-b.duration))if(chosen.every(k=>distinctPath(r,k)))chosen.push(r);return chosen;};
 const guided=!!(evidence?.reportUsable||evidence?.crashUsable);let attempted=0,failed=0,targeted=0;
 if(guided||keepDistinct(candidates).length<3){
  const targetPlans=guided?evidenceWaypoints(initialFastest,evidence):[];
  const generic=searchWaypoints(initialFastest).map(point=>({points:[point],purpose:'streets'}));
  const plans=[...targetPlans,...generic].slice(0,guided?12:6);
  for(let offset=0;offset<plans.length;offset+=4){
   const results=await Promise.allSettled(plans.slice(offset,offset+4).map(async plan=>{
    attempted++;if(plan.purpose!=='streets')targeted++;
    const data=await call([origin,...plan.points,destination],true),vias=data.waypoints?.slice(1,-1);
    if(vias?.length!==plan.points.length||vias.some((via,i)=>!via?.location||distance(plan.points[i],via.location)>65||!inSfEnvelope(via.location)))return [];
    const via={name:[...new Set(vias.map(v=>v.name).filter(Boolean))].join(' & '),location:vias[0].location};
    return normalize(data,origin,destination,via);
   }));
   for(const result of results){if(result.status==='fulfilled')candidates.push(...result.value);else failed++;}
  }
 }
 candidates=candidates.filter(r=>r.duration<=initialFastest.duration+Math.max(10,maxDetour+5)*60&&r.distance<=initialFastest.distance*1.8+250);
 const distinct=keepDistinct(candidates);
 // Selection measures every valid candidate before geometric deduplication can discard a useful improvement.
 const routes=selectEvidenceOptions(candidates,{evidence,maxDetour}).map((r,i)=>({...r,id:'live-'+i,name:r.name==='Walking option'?'Walking option '+(i+1):r.name}));
 return {routes,search:{attempted,targeted,failed,distinct:distinct.length,maximumOptions:3,method:guided?'evidence-guided':attempted?'provider-and-nearby-streets':'provider',criteria:{maxDetour,incidentMonths:evidence?.incidentMonths??6,buffer:evidence?.buffer??50,reports:evidence?.reportUsable===true,crashes:evidence?.crashUsable===true},notice:failed?'Some street checks failed. These are the routes that could be verified.':routes.length<2?(guided&&distinct.length>1?'Other paths were checked, but none reduced the selected historical measures enough to display as an avoidance option. Try a larger detour.':'No distinct alternative was found in the bounded street search. Try a larger detour.'):null}};
}
