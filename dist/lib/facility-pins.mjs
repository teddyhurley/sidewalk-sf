// Display size only: facility locations never enter the routing objective.
// Keep an overview pin visible, grow continuously with zoom, cap at street level.
export function facilityPinWidth(zoom){
  const z=Number.isFinite(zoom)?zoom:14;
  return Math.max(10,Math.min(22,10+(z-10)*1.5));
}
