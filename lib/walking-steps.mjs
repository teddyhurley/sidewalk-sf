import {inSfEnvelope} from '../dist/lib/geo.mjs';
// Retain only provider-authored walking instructions, in leg order. Never invent turns.
export function walkingSteps(raw){
  if(!Array.isArray(raw?.legs)||!raw.legs.length)return [];
  const steps=raw.legs.flatMap(leg=>Array.isArray(leg.steps)?leg.steps:[]);
  if(!steps.length||steps.length>500||raw.legs.some(leg=>!Array.isArray(leg.steps)||!leg.steps.length))return [];
  if(steps.some(s=>typeof s.maneuver?.instruction!=='string'||!s.maneuver.instruction.trim()||s.maneuver.instruction.length>500||!Number.isFinite(s.distance)||s.distance<0||!inSfEnvelope(s.maneuver.location)))return [];
  return raw.legs.flatMap((leg,index)=>leg.steps.map(s=>({instruction:s.maneuver.instruction,distance:s.distance,location:s.maneuver.location.slice(0,2),intermediate:s.maneuver.type==='arrive'&&index<raw.legs.length-1})));
}
