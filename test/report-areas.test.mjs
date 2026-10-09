import test from 'node:test';
import assert from 'node:assert/strict';
import {reportBand,routeReportAreas,optionsOutsideArea} from '../dist/lib/report-areas.mjs';
import {blockUnproject} from '../dist/lib/block-geometry.mjs';
const p=([x,y])=>blockUnproject([10000+x,10000+y]);
const block={id:'060750101001000',count:30,band:3,geometry:{type:'Polygon',coordinates:[[[-100,-100],[100,-100],[100,100],[-100,100],[-100,-100]].map(p)]}};
const line=(id,y)=>({id,coordinates:[p([-300,y]),p([300,y])]});
test('fixed report legend thresholds remain stable across routes and time windows',()=>{assert.deepEqual([1,4,5,14,15,29,30,900].map(reportBand),[0,0,1,1,2,2,3,3]);});
test('route lists include block-edge walks and only offer options clearing a 50 m margin',()=>{
 const edge=line('edge',105),near=line('near',130),outside=line('outside',170);
 assert.equal(routeReportAreas(edge,[block]).length,1);assert.equal(routeReportAreas(near,[block]).length,0);assert.deepEqual(optionsOutsideArea(block.id,[edge,near,outside],[block]),[outside]);
});
test('a missing block cannot imply that every route bypasses it',()=>{assert.deepEqual(optionsOutsideArea('missing',[line('walk',0)],[block]),[]);});
