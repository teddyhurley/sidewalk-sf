// Local metric geometry. No population or demographic attributes enter this layer.
const blockOrigin=[-122.52,37.70],blockY=111195,blockX=111195*Math.cos(37.77*Math.PI/180);
export const blockProject=p=>[(p[0]-blockOrigin[0])*blockX,(p[1]-blockOrigin[1])*blockY];
export const blockUnproject=p=>[p[0]/blockX+blockOrigin[0],p[1]/blockY+blockOrigin[1]];
const geometryCache=new WeakMap();
export function prepareBlock(geometry){
 if(geometryCache.has(geometry))return geometryCache.get(geometry);
 const polygons=(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).map(p=>p.map(r=>r.map(blockProject))),points=polygons.flat(2);
 const prepared={polygons,bounds:{left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),bottom:Math.min(...points.map(p=>p[1])),top:Math.max(...points.map(p=>p[1]))}};
 geometryCache.set(geometry,prepared);return prepared;
}
const inRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
export function blockDistanceXY(p,prepared){
 let minimum=Infinity;
 for(const poly of prepared.polygons){if(inRing(p,poly[0])&&!poly.slice(1).some(r=>inRing(p,r)))return 0;for(const ring of poly)for(let i=1;i<ring.length;i++)minimum=Math.min(minimum,segmentDistance(p,ring[i-1],ring[i]));}
 return minimum;
}
export function pointNearBlock(point,geometry,meters=35){const p=blockProject(point),b=prepareBlock(geometry),box=b.bounds;if(p[0]<box.left-meters||p[0]>box.right+meters||p[1]<box.bottom-meters||p[1]>box.top+meters)return false;return blockDistanceXY(p,b)<=meters+1e-7;}
export function lineNearBlocksMeters(blocks,line,margin=15){
 if(!blocks.length)return 0;
 const xy=line.map(blockProject),bounds={left:Math.min(...xy.map(p=>p[0]))-margin,right:Math.max(...xy.map(p=>p[0]))+margin,bottom:Math.min(...xy.map(p=>p[1]))-margin,top:Math.max(...xy.map(p=>p[1]))+margin};
 const prepared=blocks.map(c=>prepareBlock(c.geometry)).filter(c=>c.bounds.right>=bounds.left&&c.bounds.left<=bounds.right&&c.bounds.top>=bounds.bottom&&c.bounds.bottom<=bounds.top);
 if(!prepared.length)return 0;
 let meters=0;
 for(let i=1;i<xy.length;i++){const a=xy[i-1],z=xy[i],length=Math.hypot(z[0]-a[0],z[1]-a[1]),steps=Math.max(1,Math.ceil(length/10));for(let j=0;j<steps;j++){const f=(j+.5)/steps,p=[a[0]+(z[0]-a[0])*f,a[1]+(z[1]-a[1])*f];if(prepared.some(c=>p[0]>=c.bounds.left-margin&&p[0]<=c.bounds.right+margin&&p[1]>=c.bounds.bottom-margin&&p[1]<=c.bounds.top+margin&&blockDistanceXY(p,c)<=margin))meters+=length/steps;}}
 return meters;
}
function segmentsIntersect(a,b,c,d){
 const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
 if(Math.abs(x)<1e-8&&segmentDistance(c,a,b)<1e-7)return true;if(Math.abs(y)<1e-8&&segmentDistance(d,a,b)<1e-7)return true;
 if(Math.abs(z)<1e-8&&segmentDistance(a,c,d)<1e-7)return true;if(Math.abs(w)<1e-8&&segmentDistance(b,c,d)<1e-7)return true;
 return (x>0)!==(y>0)&&(z>0)!==(w>0);
}
export function routeNearBlock(line,geometry,margin=50){
 const prepared=prepareBlock(geometry),xy=line.map(blockProject),box=prepared.bounds;
 for(let i=1;i<xy.length;i++){const a=xy[i-1],b=xy[i];if(Math.max(a[0],b[0])<box.left-margin||Math.min(a[0],b[0])>box.right+margin||Math.max(a[1],b[1])<box.bottom-margin||Math.min(a[1],b[1])>box.top+margin)continue;
  if(blockDistanceXY(a,prepared)<=margin||blockDistanceXY(b,prepared)<=margin)return true;
  for(const poly of prepared.polygons)for(const ring of poly)for(let j=1;j<ring.length;j++){const c=ring[j-1],d=ring[j];if(segmentsIntersect(a,b,c,d)||Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b))<=margin)return true;}
 }
 return false;
}
