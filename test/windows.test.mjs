import test from 'node:test';
import assert from 'node:assert/strict';
import {demoJourney,addresses} from '../dist/lib/demo.mjs';
import {compareJourney,incidentWindow} from '../dist/lib/analysis.mjs';
const sample=()=>demoJourney(...addresses);

test('calendar-month cutoffs clamp month ends and leap days',()=>{
  assert.deepEqual(incidentWindow('2026-10-07'),{from:'2026-04-07',through:'2026-10-07',months:6});
  assert.equal(incidentWindow('2026-08-31',6).from,'2026-02-28');
  assert.equal(incidentWindow('2024-08-31',6).from,'2024-02-29');
  assert.equal(incidentWindow('2024-02-29',12).from,'2023-02-28');
  assert.throws(()=>incidentWindow('2026-02-30'));
  assert.throws(()=>incidentWindow('2026-10-07',9));
});
test('3, 6, and 12 month choices change reports without changing collision history or route ordering',()=>{
  const results=[3,6,12].map(incidentMonths=>compareJourney(sample(),{incidentMonths}));
  assert.deepEqual(results.map(r=>r.routes[0].counts.incident),[1,2,3]);
  for(const r of results){
    assert.equal(r.routes[0].counts.collision,4);
    assert.deepEqual(r.routes.map(x=>x.id),['market','mission','howard']);
    assert.deepEqual(r.collisionWindow,{from:'2024-01-01',through:'2025-12-31'});
    assert.equal(r.takeaway.routeId,'mission');
  }
});
test('event-date boundaries are inclusive; filing dates do not substitute for event dates',()=>{
  const j=sample(),base=j.evidence.records.find(r=>r.id==='I-01');
  j.evidence.records=[
    {...base,id:'start',date:'2026-04-07'}, {...base,id:'end',date:'2026-10-07'},
    {...base,id:'before',date:'2026-04-06',reportDate:'2026-10-01'},
    {...base,id:'future',date:'2026-10-08'}, {...base,id:'invalid',date:'2026-06-31'}
  ];
  const r=compareJourney(j).routes[0];
  assert.equal(r.counts.incident,2);assert.deepEqual(r.matches.map(x=>x.id),['start','end']);
});
test('incomplete incident coverage withholds only reports, including sensitivity and map matches',()=>{
  const j=demoJourney(...addresses,'partial-incidents'),r=compareJourney(j);
  assert.equal(r.status.usable,true);assert.equal(r.incidentStatus.usable,false);
  assert.equal(r.routes[0].counts.incident,null);assert.equal(r.routes[0].counts.collision,4);
  assert.ok(r.routes.every(x=>x.matches.every(m=>m.kind!=='incident') && x.sensitivity.every(s=>s.incident===null)));
  assert.equal(compareJourney(j,{incidentMonths:3}).routes[0].counts.incident,1);
});
test('missing or lagging incident coverage cannot masquerade as zero reports',()=>{
  for(const coverage of [null,{from:'2025-01-01',through:'2026-10-06',complete:true},{from:'2025-01-01',through:'2026-10-07',complete:false}]){
    const j=sample();j.evidence.incidentCoverage=coverage;j.evidence.records=[];
    assert.equal(compareJourney(j).routes[0].counts.incident,null);
  }
  const j=sample();j.evidence.records=[];
  assert.equal(compareJourney(j).routes[0].counts.incident,0);
});
test('live mode and stale snapshots withhold reports for every time choice',()=>{
  for(const incidentMonths of [3,6,12]){
    const j=sample();j.mode='live';
    for(const journey of [j,demoJourney(...addresses,'stale')]){
      const result=compareJourney(journey,{incidentMonths});
      assert.equal(result.routes[0].counts,null);assert.equal(result.incidentStatus.usable,false);
    }
  }
});
test('invalid collision window cannot produce zero counts or a recommendation',()=>{
  const j=sample();j.evidence.collisionWindow.through='2023-01-01';
  const r=compareJourney(j);assert.equal(r.routes[0].counts,null);assert.equal(r.takeaway.routeId,undefined);
});
