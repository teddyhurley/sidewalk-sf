// Local equirectangular projection: adequate for short SF walking corridors.
// Distances are screening approximations, never parcel/sidewalk attribution.
const R = 6371008.8;
const rad = Math.PI / 180;
export function validPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
}
export function inSfEnvelope(p) {
  return validPoint(p) && p[0] >= -122.52 && p[0] <= -122.35 && p[1] >= 37.70 && p[1] <= 37.83;
}
export function distance(a, b) {
  const lat = (a[1] + b[1]) / 2 * rad;
  return R * Math.hypot((a[0]-b[0])*rad*Math.cos(lat), (a[1]-b[1])*rad);
}
export function pointToSegment(p, a, b) {
  const cos = Math.cos(p[1] * rad);
  const x = (a[0]-p[0])*rad*R*cos, y = (a[1]-p[1])*rad*R;
  const dx = (b[0]-a[0])*rad*R*cos, dy = (b[1]-a[1])*rad*R;
  const t = dx*dx+dy*dy === 0 ? 0 : Math.max(0, Math.min(1, -(x*dx+y*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x+t*dx,y+t*dy);
}
export function nearestSegment(p, line) {
  let result = {meters:Infinity,index:-1};
  for(let i=0;i<line.length-1;i++) {
    const meters = pointToSegment(p,line[i],line[i+1]);
    if(meters < result.meters) result = {meters,index:i};
  }
  return result;
}
export function lineLength(line) {
  return line.slice(1).reduce((sum,p,i)=>sum+distance(line[i],p),0);
}
export function validRoute(r) {
  return typeof r.id === 'string' && r.id.length > 0 && Number.isFinite(r.duration) && r.duration > 0 && Number.isFinite(r.distance) && r.distance > 0 && Array.isArray(r.coordinates) && r.coordinates.length >= 2 && r.coordinates.every(validPoint);
}
