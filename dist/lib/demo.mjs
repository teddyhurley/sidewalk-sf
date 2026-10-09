import {lineLength} from './geo.mjs';
import {demoFacilityDirectory} from './facilities.mjs';
export const DEMO_AS_OF = '2026-10-07';
export const addresses = ['1 Ferry Building, San Francisco', '425 Mission Street, San Francisco'];
const start=[-122.3936,37.7955], end=[-122.3967,37.7895];
const baseRoutes = [
  {id:'market',name:'Via Market & Fremont',duration:14*60,coordinates:[start,[-122.3952,37.7943],[-122.3986,37.7916],[-122.3975,37.7907],end],note:'The shortest sample walk.'},
  {id:'mission',name:'Via Mission & Beale',duration:17*60,coordinates:[start,[-122.3926,37.7938],[-122.3920,37.7932],[-122.3951,37.7918],[-122.3945,37.7913],[-122.3967,37.7895]],note:'A different corridor for part of the walk.'},
  {id:'howard',name:'Via Howard & Main',duration:21*60,coordinates:[start,[-122.3926,37.7938],[-122.3914,37.7928],[-122.3908,37.7918],[-122.3949,37.7886],end],note:'The longest sample walk.'}
].map(r=>({...r,distance:Math.round(lineLength(r.coordinates))}));
const mk=(id,kind,coordinates,label,category,date='2025-06-15')=>({id,kind,coordinates,label,category,date,fictional:true});
// Every record is invented. IDs, dates and locations illustrate system behavior.
const records=[
  mk('C-01','collision',[-122.3952,37.7943],'Sample crossing A','Pedestrian injury collision'),
  mk('C-02','collision',[-122.3969,37.79295],'Sample crossing B','Pedestrian injury collision'),
  mk('C-03','collision',[-122.3986,37.7916],'Sample crossing C','Pedestrian injury collision'),
  mk('C-04','collision',[-122.3975,37.7907],'Sample crossing D','Pedestrian injury collision'),
  mk('C-05','collision',[-122.3926,37.7938],'Sample crossing E','Pedestrian injury collision'),
  mk('C-06','collision',[-122.3914,37.7928],'Sample crossing F','Pedestrian injury collision'),
  mk('I-01','incident',[-122.3968,37.7930],'Approximate sample intersection','Robbery','2026-09-15'),
  mk('I-02','incident',[-122.3986,37.7916],'Approximate sample intersection','Assault','2026-05-18'),
  mk('I-03','incident',[-122.3951,37.7918],'Approximate sample intersection','Robbery','2026-08-22'),
  mk('I-04','incident',[-122.3945,37.7913],'Approximate sample intersection','Assault','2026-06-10'),
  mk('I-05','incident',[-122.3914,37.7928],'Approximate sample intersection','Robbery','2026-09-12'),
  mk('I-06','incident',[-122.3986,37.7916],'Approximate sample intersection','Robbery','2025-12-15')
];
export function demoJourney(origin,destination,scenario='complete') {
  const norm=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
  const forward=norm(origin)===norm(addresses[0]) && norm(destination)===norm(addresses[1]);
  const reverse=norm(origin)===norm(addresses[1]) && norm(destination)===norm(addresses[0]);
  if(!forward && !reverse) throw new Error('This fictional demo supports the Ferry Building ↔ 425 Mission Street sample pair. Choose “Use sample addresses” or switch to live routing.');
  const routes=structuredClone(baseRoutes).map(r=>({...r,coordinates:reverse?r.coordinates.reverse():r.coordinates}));
  return {
    mode:'demo',fictional:true,asOf:DEMO_AS_OF,origin,destination,routes,
    facilities:structuredClone(demoFacilityDirectory),
    evidence:{fictional:true,from:'2024-01-01',through:scenario==='stale'?'2025-12-31':DEMO_AS_OF,retrieved:scenario==='stale'?'2026-01-16':DEMO_AS_OF,
      updated:scenario==='stale'?'2026-01-15':DEMO_AS_OF,complete:scenario!=='missing',
      collisionWindow:{from:'2024-01-01',through:'2025-12-31'},
      incidentCoverage:{from:scenario==='partial-incidents'?'2026-07-07':'2025-01-01',through:scenario==='stale'?'2025-12-31':DEMO_AS_OF,complete:true},
      records:scenario==='missing'?[]:structuredClone(records),
      sources:['Fictional pedestrian collision fixture','Fictional reported-incident fixture']}
  };
}
export const mapBounds={west:-122.401,east:-122.388,south:37.787,north:37.797};
