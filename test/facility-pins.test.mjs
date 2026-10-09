import test from 'node:test';
import assert from 'node:assert/strict';
import {facilityPinWidth} from '../dist/lib/facility-pins.mjs';

test('facility pins shrink continuously at wider map views and stay bounded',()=>{
  const zooms=Array.from({length:97},(_,i)=>i/4);
  const widths=zooms.map(facilityPinWidth);
  assert.ok(widths.every(w=>w>=10&&w<=22));
  assert.ok(widths.every((w,i)=>!i||(w>=widths[i-1]&&w-widths[i-1]<=.375)));
  assert.ok(facilityPinWidth(11)<facilityPinWidth(14));
  assert.ok(facilityPinWidth(14)<facilityPinWidth(17));
  for(const invalid of [undefined,null,NaN,Infinity,-Infinity,'14']){
    assert.equal(facilityPinWidth(invalid),facilityPinWidth(14));
  }
});
