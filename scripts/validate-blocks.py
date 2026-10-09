"""Boundary refresh only: validate topology with GEOS and record any repairs."""
import json,sys
try:
 from shapely.geometry import shape,mapping,MultiPolygon
 from shapely import make_valid
 from shapely.validation import explain_validity
except ImportError:
 sys.exit('Boundary refresh needs Python with Shapely >= 2. Set BOUNDARY_PYTHON to that interpreter. The bundled boundaries and app remain usable.')
payload=json.load(sys.stdin)
repairs=[]
for block in payload['blocks']:
 geometry=shape(block['geometry'])
 if not geometry.is_valid:
  reason=explain_validity(geometry)
  fixed=make_valid(geometry)
  def polygon_parts(g):
   if g.geom_type=='Polygon':return [g]
   if hasattr(g,'geoms'):return [p for part in g.geoms for p in polygon_parts(part)]
   return []
  fixed=MultiPolygon(polygon_parts(fixed))
  if not fixed.is_valid or fixed.is_empty:sys.exit('Boundary repair failed for '+block['id'])
  repairs.append({'id':block['id'],'issue':reason,'method':'GEOS make_valid; polygon components retained','relativeAreaChange':abs(fixed.area-geometry.area)/max(geometry.area,1e-20)})
  geometry=fixed;block['geometry']=mapping(fixed);block['bbox']=list(fixed.bounds)
 if geometry.is_empty:sys.exit('Empty block geometry')
payload['manifest']['topology']={'validatedBlocks':len(payload['blocks']),'engine':'Shapely / GEOS','repairs':repairs}
json.dump(payload,sys.stdout,separators=(',',':'))
