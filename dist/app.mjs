import {demoJourney,addresses,mapBounds} from './lib/demo.mjs';
import {compareJourney} from './lib/analysis.mjs';
import {validTheme,nextTheme,resolveTheme} from './lib/theme.mjs';
import {facilityTypes,nearbyFacilities} from './lib/facilities.mjs';
import {makeSavedWalk,readSavedWalks,writeSavedWalks,mapsLinks} from './lib/walk-plans.mjs';
import {facilityPinWidth} from './lib/facility-pins.mjs';
import {attachLiveContext} from './lib/live-comparison.mjs';
import {optionsOutsideAreas,crimeReportLabel} from './lib/report-areas.mjs';
import {prepareBlock,blockUnproject} from './lib/block-geometry.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#245852','#287dab','#66764a'];
const routeColor=i=>(document.documentElement.dataset.theme==='dark'?['#99cfb7','#7fc8f0','#c4d89d']:colors)[i%3];
let walkChosen=false,activeView='map',saveMessage='';
const viewScroll={map:0,data:0};
let selectedAreas=new Set(),selectionTotal={key:null,status:'idle'},selectionTimer,mapFittedJourney=null,reportPopup=null;
let mode='live',journey,comparison,selected,config={},liveMap,candidates,requestVersion=0,mapScriptPromise;
let facilityState={available:false,records:[]},facilityMarkers=[],facilityReviewDay;
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
let themePreference='system';
try{themePreference=validTheme(localStorage.getItem('sidewalk-theme'));}catch{}
function applyTheme(){
  document.documentElement.dataset.theme=resolveTheme(themePreference,systemTheme.matches);
  const label=themePreference[0].toUpperCase()+themePreference.slice(1);
  $('#theme-toggle').textContent=(themePreference==='dark'?'☾ ':themePreference==='light'?'☀ ':'◐ ')+label;
  $('#theme-toggle').setAttribute('aria-label',`Color theme: ${themePreference}. Activate to use ${nextTheme(themePreference)} mode.`);
  $('meta[name="theme-color"]').content=document.documentElement.dataset.theme==='dark'?'#17231f':'#f5f4ee';
  if(liveMap){liveMap.remove();liveMap=null;mapFittedJourney=null;}
  if(journey)render();
}
$('#theme-toggle').addEventListener('click',()=>{themePreference=nextTheme(themePreference);try{localStorage.setItem('sidewalk-theme',themePreference);}catch{}applyTheme();});
systemTheme.addEventListener('change',()=>{if(themePreference==='system')applyTheme();});
applyTheme();
const fmtDate=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const fmtTimestamp=s=>new Date(s).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles',timeZoneName:'short'});
const options=()=>({maxDetour:Number($('#detour').value),buffer:Number($('#buffer').value),incidentMonths:Number($('#incident-window').value)});
const metricDistance=m=>m===null?'unavailable':m<1?'0 m':m<50?'less than 50 m':m>=1000?(Math.round(m/50)*.05).toFixed(2)+' km':Math.round(m/50)*50+' m';
const searchChanged=()=>{const c=journey?.routeSearch?.criteria,o=options();return !!c&&(c.incidentMonths!==o.incidentMonths||c.buffer!==o.buffer||c.maxDetour!==o.maxDetour);};
const formatWindow=w=>w?`${fmtDate(w.from)} – ${fmtDate(w.through)}`:'Not connected';
function error(message=''){ $('#form-error').textContent=message;$('#form-error').hidden=!message;if(message){$('#planner-drawer').open=true;setView('map');} }
function busy(value){$('#update-alternatives').disabled=value;$('#compare').disabled=value;$('#compare').textContent=value?'Finding walking routes…':'Compare walks ↗';}
function point(p){return [(p[0]-mapBounds.west)/(mapBounds.east-mapBounds.west)*720,(mapBounds.north-p[1])/(mapBounds.north-mapBounds.south)*440];}
const path=coordinates=>coordinates.map((p,i)=>(i?'L':'M')+point(p).map(n=>n.toFixed(1)).join(',')).join(' ');
const facilityControls=['#show-public-housing','#show-former-public-housing','#show-halfway-houses','#show-reentry-housing','#facility-radius','#facility-scope'];
const facilityOptions=()=>({radius:Number($('#facility-radius').value),scope:$('#facility-scope').value,types:[...document.querySelectorAll('[data-facility-type]:checked')].map(el=>el.dataset.facilityType)});
const facilityDistance=meters=>meters<10?'Less than 10 m':('About '+Math.round(meters/10)*10+' m');
function openFacility(id){
  const record=facilityState.records.find(r=>r.id===id);if(!record)return;
  const fictional=facilityState.fictional;
  $('#facility-dialog-title').textContent=record.name;
  $('#facility-dialog-label').textContent=fictional?'FICTIONAL FACILITY · INFORMATION ONLY':'PUBLIC LISTING · INFORMATION ONLY';
  const sources=fictional?`<p>Source: ${esc(facilityState.source)}. Illustrative directory date: ${fmtDate(facilityState.updated)}.</p>`:`<p>${esc(record.address)}</p><p>${esc(record.statusNote)}</p><p><strong>Sources checked ${fmtDate(record.verifiedOn)}</strong> · review due ${fmtDate(record.reviewBy)}. This is a source review, not an on-site inspection.</p><p>${esc(record.locationNote)}</p><ul class="facility-sources">${record.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)} ↗</a></li>`).join('')}</ul>`;
  $('#facility-dialog-details').innerHTML=`<p><strong>${esc(facilityTypes[record.type].label)}</strong>${fictional?' · fictional example':''}</p><p>${facilityDistance(record.meters)} from the selected route line to the listed address position, measured as a straight-line distance. This is not walking distance.</p>${sources}<p>This marker describes a facility type. It does not report an incident, assess residents, or change route recommendations.</p>`;
  $('#locate-facility').hidden=fictional||!liveMap;
  $('#locate-facility').onclick=()=>{$('#facility-dialog').close();liveMap?.flyTo({center:record.coordinates,zoom:16,duration:0});$('#map').scrollIntoView({block:'center'});facilityMarkers.find(m=>m.getElement().dataset.facility===id)?.getElement().focus({preventScroll:true});};
  $('#facility-dialog').showModal();
}
const facilityPinShape=symbol=>`<path class="facility-pin-body" d="M12 31C9 26 1 18 1 12a11 11 0 0 1 22 0c0 6-8 14-11 19Z"/><text class="facility-pin-label" x="12" y="15" text-anchor="middle">${esc(symbol)}</text><circle class="facility-pin-dot" cx="12" cy="12" r="3"/>`;
function sizeFacilityPins(){
  if(!liveMap)return;
  const width=facilityPinWidth(liveMap.getZoom());
  // Scale the inner graphic, leaving Mapbox's position transform and tip intact.
  $('#map').style.setProperty('--facility-pin-width',width+'px');
  $('#map').style.setProperty('--facility-pin-label',width>=16?'1':'0');
  $('#map').style.setProperty('--facility-pin-dot',width>=16?'0':'1');
}
function syncFacilityMarkers(){
  facilityMarkers.forEach(m=>m.remove());facilityMarkers=[];
  if(!liveMap||mode!=='live'||!facilityState.available||facilityState.fictional)return;
  for(const record of facilityState.records){
    const type=facilityTypes[record.type],button=document.createElement('button');
    button.type='button';button.className=`live-facility-marker ${type.className}`;button.dataset.facility=record.id;
    button.innerHTML=`<svg class="facility-pin" viewBox="0 0 24 32" aria-hidden="true">${facilityPinShape(type.symbol)}</svg>`;
    button.title=`${record.name} · ${type.label}`;button.setAttribute('aria-label',`View ${record.name}, ${type.label}, ${facilityDistance(record.meters)} from selected route`);
    button.addEventListener('click',e=>{e.stopPropagation();openFacility(record.id);});
    facilityMarkers.push(new window.mapboxgl.Marker({element:button,anchor:'bottom'}).setLngLat(record.coordinates).addTo(liveMap));
    button.setAttribute('role','button'); // Mapbox otherwise assigns its default image role.
  }
  sizeFacilityPins();
}
function renderFacilities(route){
  facilityReviewDay=new Date().toISOString().slice(0,10);
  facilityState=nearbyFacilities(journey,route,facilityOptions());
  const fictional=facilityState.fictional;
  $('#facility-scope').options[1].textContent=fictional?'All sample locations':'Across San Francisco';
  $('#facility-provenance').textContent=facilityState.available?(fictional?'FICTIONAL LOCATIONS':'PARTIAL DIRECTORY'):'UNAVAILABLE';
  for(const id of facilityControls)$(id).disabled=!facilityState.available;
  $('#facility-radius').disabled=!facilityState.available||facilityState.scope==='city';
  $('#fit-facilities').hidden=!facilityState.available||fictional||!facilityState.records.length;
  $('#facility-summary').textContent=!facilityState.available?facilityState.reason:!facilityOptions().types.length?'Facility layers are hidden. Turn on a category to show its markers.':facilityState.records.length?`${facilityState.records.length} ${fictional?'fictional ':'reviewed '}${facilityState.records.length===1?'location':'locations'} ${facilityState.scope==='city'?(fictional?'in the sample directory':'across San Francisco'):'within '+facilityState.radius+' m of the selected route'}`:(fictional?'No fictional examples match these filters.':'No reviewed listings match this route and distance. This does not mean no facilities are nearby.');
  $('#facility-directory-note').textContent=!facilityState.available?'':fictional?'All locations in this sample are invented.':`${facilityState.directoryCount} reviewed listings in this SF directory; coverage is partial. Sources checked ${fmtDate(facilityState.updated)}.${facilityState.withheldCount?' '+facilityState.withheldCount+' expired listings withheld.':''} Positions are approximate points, not property boundaries.`;
  $('#facility-category-counts').textContent=!facilityState.available?'':Object.entries(facilityState.categoryCounts).map(([type,count])=>`${facilityTypes[type].symbol} ${count}`).join(' · ')+(fictional?' · sample directory':' · entire reviewed directory');
  $('#facility-coverage').hidden=!facilityState.available||fictional;
  $('#facility-list').innerHTML=facilityState.records.map(r=>`<button type="button" class="facility-card" data-facility="${esc(r.id)}"><span class="facility-icon ${facilityTypes[r.type].className}" aria-hidden="true">${facilityTypes[r.type].symbol}</span><span><strong>${esc(r.name)}</strong><small>${esc(facilityTypes[r.type].label)} · ${facilityDistance(r.meters)} from route${fictional?' · fictional':''}</small>${fictional?'':'<small>Sources checked '+fmtDate(r.verifiedOn)+'</small>'}</span><span aria-hidden="true">↗</span></button>`).join('');
  $('#facility-disclaimer').textContent='Facility types only; these markers do not indicate danger or change the route comparison.';
  $('#facility-jump').hidden=!facilityState.available;
  $('#facility-jump').textContent=`PH Public housing · FH Former public housing · HH Halfway houses · RH Reentry housing · ${facilityState.records.length} shown ↓`;
  $('#facility-list').querySelectorAll('[data-facility]').forEach(b=>b.addEventListener('click',()=>openFacility(b.dataset.facility)));
}
function schematic(){
  const selectedRoute=comparison.routes.find(r=>r.id===selected);
  const blocks=[];
  for(let y=-140;y<670;y+=57) for(let x=-190;x<850;x+=82) blocks.push(`<rect x="${x}" y="${y}" width="62" height="38" rx="3" fill="${(x+y)%3?'#e4e7dc':'#e0e6d6'}" stroke="#dce1d5" stroke-width=".6"/>`);
  const order=[...(walkChosen?comparison.routes.filter(r=>r.id===selected):comparison.routes)].sort((a,b)=>(a.id===selected?1:0)-(b.id===selected?1:0));
  const routeLines=order.map(r=>{const index=comparison.routes.findIndex(x=>x.id===r.id),active=r.id===selected;return `<g role="button" tabindex="0" aria-label="Select ${esc(r.name)}" data-route="${esc(r.id)}"><path d="${path(r.coordinates)}" fill="none" stroke="#fffefc" stroke-width="${active?11:8}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path(r.coordinates)}" fill="none" stroke="${routeColor(index)}" stroke-width="${active?6:4}" stroke-dasharray="${r.eligible?'':'7 5'}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path(r.coordinates)}" fill="none" stroke="transparent" stroke-width="20"/></g>`}).join('');
  const pins=selectedRoute.matches.filter(x=>x.kind==='collision').map((record,i)=>{const [x,y]=point(record.coordinates);return `<g aria-hidden="true"><circle cx="${x}" cy="${y}" r="12" fill="#fff9ed" stroke="#bd7c42" stroke-width="2"/><text x="${x}" y="${y+3.5}" fill="#985726" text-anchor="middle" font-size="10" font-weight="700">${i+1}</text></g>`;}).join('');
  const reportSegments=[...new Set(selectedRoute.matches.filter(r=>r.kind==='incident').map(r=>r.segment))];
  const reportBands=reportSegments.map(i=>`<path class="report-band" d="${path(selectedRoute.coordinates.slice(i,i+2))}" fill="none" stroke="var(--report-color)" stroke-width="24" stroke-opacity=".24" stroke-linecap="round" stroke-dasharray="5 5" pointer-events="none"/>`).join('');
  const facilityPins=facilityState.records.map(record=>{
    const [x,y]=point(record.coordinates),type=facilityTypes[record.type];
    return `<g class="facility-map-marker ${type.className}" role="button" tabindex="0" aria-label="${esc(record.name)} — fictional location" data-facility="${esc(record.id)}" transform="translate(${x-9},${y-24}) scale(.75)"><title>${esc(record.name)} · fictional · ${facilityDistance(record.meters)} from route</title><rect class="facility-pin-target" x="-4" y="-4" width="32" height="36"/>${facilityPinShape(type.symbol)}</g>`;
  }).join('');
  const ends=[selectedRoute.coordinates[0],selectedRoute.coordinates.at(-1)].map((p,i)=>{const [x,y]=point(p);return `<g><circle cx="${x}" cy="${y}" r="16" fill="${i?'#245852':'#fffefa'}" stroke="#245852" stroke-width="2.5"/><text x="${x}" y="${y+4}" fill="${i?'#fffefa':'#245852'}" text-anchor="middle" font-size="12" font-weight="700">${i?'B':'A'}</text></g>`}).join('');
  $('#map').innerHTML=`<svg viewBox="70 0 570 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Fictional route schematic with ${selectedRoute.matches.filter(x=>x.kind==='collision').length} sample traffic collision markers and ${reportSegments.length} approximate reported-incident context sections. ${facilityState.records.length} fictional facilities are marked PH or HH. All evidence is fictional. Use the route cards and facility list for full details."><defs><pattern id="water" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M1 12h8" stroke="#c2d8d5" stroke-width="1"/></pattern></defs><rect width="720" height="440" fill="#f3f2e9"/><g transform="rotate(-38 360 220)">${blocks.join('')}</g><path d="M500 -20L570 100L625 186L730 270L740 -20Z" fill="#d2e2de"/><path d="M500 -20L570 100L625 186L730 270L740 -20Z" fill="url(#water)"/><path d="M488 -10L555 105L610 193L729 285" stroke="#fdfcf4" stroke-width="13" fill="none"/><path d="M485 -10L552 105L607 193L726 285" stroke="#c8cdbf" stroke-width="1" fill="none"/><path d="M60 363L228 235L403 107L487 31" stroke="#fffff8" stroke-width="15" fill="none"/><path d="M60 363L228 235L403 107L487 31" stroke="#d7d9cc" stroke-width="1" fill="none"/><rect x="155" y="251" width="85" height="34" rx="9" fill="#cddcbd" transform="rotate(-38 195 268)"/><g fill="#8b9785" font-size="9" letter-spacing="1.1" font-family="sans-serif"><text x="91" y="169" transform="rotate(-38 91 169)">MARKET ST</text><text x="284" y="245" transform="rotate(-38 284 245)">MISSION ST</text><text x="375" y="332" transform="rotate(-38 375 332)">HOWARD ST</text><text x="131" y="95" font-size="12" letter-spacing="3" fill="#a3ac9b">FINANCIAL DISTRICT</text><text x="477" y="344" font-size="10" letter-spacing="3">SOUTH BEACH</text><text x="616" y="88" transform="rotate(55 616 88)" fill="#8ea9a2">SAN FRANCISCO BAY</text></g>${reportBands}${routeLines}${pins}${ends}${facilityPins}<text x="100" y="390" fill="#7c8a77" font-size="9" letter-spacing="1.6">SCHEMATIC · FICTIONAL DATA</text><g transform="translate(665 310)" fill="#687d6c"><text x="0" y="0" font-size="10" text-anchor="middle">N</text><path d="M0 6L-5 22L0 18L5 22Z"/></g></svg>`;
  if(document.documentElement.dataset.theme==='dark'){
    const palette={'#f3f2e9':'#26342d','#e4e7dc':'#344438','#e0e6d6':'#304434','#dce1d5':'#3c4b3e','#d2e2de':'#213f3f','#c2d8d5':'#2e5050','#fdfcf4':'#435347','#c8cdbf':'#556452','#fffff8':'#465348','#d7d9cc':'#5b6657','#cddcbd':'#405b3d','#8b9785':'#a9b5a5','#a3ac9b':'#8e9e8b','#8ea9a2':'#8caaa4','#fffefc':'#1d3029','#245852':'#95ccb6','#fffefa':'#172c23','#fff9ed':'#362e20','#bd7c42':'#e4ab70','#985726':'#f0c28e','#7c8a77':'#a9b9a3','#687d6c':'#b5c5b4'};
    $('#map').innerHTML=$('#map').innerHTML.replace(/#[0-9a-f]{6}/g,color=>palette[color]||color);
  }
  $('#map').querySelectorAll('[data-facility]').forEach(el=>{el.addEventListener('click',()=>openFacility(el.dataset.facility));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openFacility(el.dataset.facility);}});});
  $('#map').querySelectorAll('[data-route]').forEach(el=>{const choose=()=>selectRoute(el.dataset.route);el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});});
}
// Seamless, transparent hatch tile. Opposing ink/edge colors stay legible
// over both light and dark report fills; this denotes selection only.
function selectedAreaPattern(){
  const size=16,data=new Uint8Array(size*size*4),dark=document.documentElement.dataset.theme==='dark';
  const ink=dark?[246,239,255,255]:[55,29,82,255],edge=dark?[36,22,51,220]:[255,255,255,235];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const phase=(x+y)%size,color=phase<4?ink:phase<6?edge:[0,0,0,0];
    data.set(color,(y*size+x)*4);
  }
  return {width:size,height:size,data};
}
function syncReportSelection(){
  for(const id of ['report-selected-stripes','report-selected'])if(liveMap?.getLayer(id))liveMap.setFilter(id,['in',['get','id'],['literal',[...selectedAreas]]]);
}
async function mapbox(){
  if(!window.mapboxgl){
    if(!$('#mapbox-css')) {const link=document.createElement('link');link.id='mapbox-css';link.rel='stylesheet';link.href='https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css';document.head.append(link);}
    await (mapScriptPromise ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js';script.onload=resolve;script.onerror=()=>reject(new Error('Map tiles could not load. Route details remain available.'));document.head.append(script);}));
  }
  if(mode!=='live'||!journey) return;
  if(!liveMap){
    $('#map').innerHTML='';window.mapboxgl.accessToken=config.mapboxToken;
    liveMap=new window.mapboxgl.Map({container:'map',style:document.documentElement.dataset.theme==='dark'?'mapbox://styles/mapbox/dark-v11':'mapbox://styles/mapbox/streets-v12',center:journey.routes[0].coordinates[0],zoom:14,attributionControl:true});
    liveMap.addControl(new window.mapboxgl.NavigationControl({showCompass:false}),'bottom-right');
    liveMap.on('zoom',sizeFacilityPins);
    const loadingMap=liveMap;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Map load timed out. Route details are still available.')),15000);
      const finish=()=>{clearTimeout(timer);resolve();};
      loadingMap.once('load',finish);
      // Switching theme/mode can remove a loading map; cancel its obsolete timeout.
      loadingMap.once('remove',finish);
    });
    if(liveMap!==loadingMap||mode!=='live'||!journey)return;
    liveMap.addSource('report-areas',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    liveMap.addSource('routes',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    liveMap.addSource('collisions',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    liveMap.addLayer({id:'report-fill',type:'fill',source:'report-areas',paint:{'fill-color':['match',['get','band'],0,'#eadff9',1,'#bd9bdf',2,'#9064ba','#603785'],'fill-opacity':document.documentElement.dataset.theme==='dark'?.48:.42}});
    liveMap.addLayer({id:'report-outline',type:'line',source:'report-areas',paint:{'line-color':document.documentElement.dataset.theme==='dark'?'#dec5fc':'#70549f','line-opacity':.5,'line-width':.7}});
    liveMap.addImage('selected-area-hatch',selectedAreaPattern(),{pixelRatio:2});
    liveMap.addLayer({id:'report-selected-stripes',type:'fill',source:'report-areas',filter:['==',['get','id'],''],paint:{'fill-pattern':'selected-area-hatch','fill-opacity':.95}});
    liveMap.addLayer({id:'report-selected',type:'line',source:'report-areas',filter:['==',['get','id'],''],paint:{'line-color':document.documentElement.dataset.theme==='dark'?'#eddaff':'#4c256f','line-width':3}});
    liveMap.addLayer({id:'route-casing',type:'line',source:'routes',paint:{'line-color':document.documentElement.dataset.theme==='dark'?'#17231f':'#fffefa','line-width':['+',['get','width'],3]},layout:{'line-cap':'round','line-join':'round'}});
    liveMap.addLayer({id:'route-lines',type:'line',source:'routes',paint:{'line-color':['get','color'],'line-width':['get','width']},layout:{'line-cap':'round','line-join':'round'}});
    liveMap.addLayer({id:'collision-points',type:'circle',source:'collisions',paint:{'circle-radius':5,'circle-color':'#e4ab70','circle-stroke-color':'#633708','circle-stroke-width':1.5}});
    liveMap.on('click',event=>{const features=liveMap.queryRenderedFeatures(event.point,{layers:['route-lines','report-fill']});const line=features.find(f=>f.layer.id==='route-lines');if(line)selectRoute(line.properties.id);else if(features.length)selectReportArea(features[0].properties.id,false,event.lngLat);});
    liveMap.on('mousemove',event=>{if(liveMap.getLayer('report-fill'))liveMap.getCanvas().style.cursor=liveMap.queryRenderedFeatures(event.point,{layers:['route-lines','report-fill']}).length?'pointer':'';});
  }
  if(liveMap.getSource('collisions'))liveMap.getSource('collisions').setData({type:'FeatureCollection',features:(comparison.routes.find(r=>r.id===selected)?.matches||[]).filter(r=>r.kind==='collision').map(r=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:r.coordinates}}))});
  if(liveMap.getSource('report-areas')){
    liveMap.getSource('report-areas').setData({type:'FeatureCollection',features:reportCells().map(c=>({type:'Feature',properties:{id:c.id,count:c.count,band:c.band},geometry:c.geometry}))});
    for(const layer of ['report-fill','report-outline','report-selected-stripes','report-selected'])liveMap.setLayoutProperty(layer,'visibility',$('#show-report-areas').checked?'visible':'none');
    syncReportSelection();
  }
  if(liveMap.getSource('routes')){
    const routes=comparison.routes.map((r,i)=>({type:'Feature',properties:{id:r.id,color:routeColor(i),width:r.id===selected?6:3.5,selected:r.id===selected},geometry:{type:'LineString',coordinates:r.coordinates}})).filter(f=>!walkChosen||f.properties.selected).sort((a,b)=>Number(a.properties.selected)-Number(b.properties.selected));
    liveMap.getSource('routes').setData({type:'FeatureCollection',features:routes});
    if(mapFittedJourney!==journey){fitMap();mapFittedJourney=journey;}
  }
  syncFacilityMarkers();
}
const reportCells=()=>comparison?.areaReports?.usable?comparison.areaReports.cells||[]:[];
function resetReportSelection(){selectedAreas.clear();clearTimeout(selectionTimer);selectionTotal={key:null,status:'idle'};}
function selectionKey(cells){return JSON.stringify([journey?.evidence?.asOf,journey?.evidence?.sources?.reports?.retrieved,comparison?.areaReports?.months,cells.map(c=>c.id).sort()]);}
function refreshSelectionTotal(cells){
  const key=selectionKey(cells);if(selectionTotal.key===key)return;
  clearTimeout(selectionTimer);
  if(!cells.length){selectionTotal={key,status:'idle'};return;}
  if(cells.length===1){selectionTotal={key,status:'ready',data:{count:cells[0].count,categories:cells[0].categories}};return;}
  selectionTotal={key,status:'loading'};
  const body={ids:cells.map(c=>c.id),incidentMonths:comparison.areaReports.months,asOf:journey.evidence.asOf,retrievedAt:journey.evidence.sources.reports.retrieved};
  selectionTimer=setTimeout(async()=>{
    try{const data=await post('/api/report-selection',body);if(selectionTotal.key!==key)return;selectionTotal=data.usable?{key,status:'ready',data}:{key,status:'error',message:'Combined count unavailable: the report snapshot is incomplete or stale.'};}
    catch(e){if(selectionTotal.key!==key)return;selectionTotal={key,status:'error',message:e.message};}
    renderReportAreaDetail();
  },180);
}
function renderReportAreas(){
  reportPopup?.remove();reportPopup=null;
  const area=comparison.areaReports,cells=reportCells();
  selectedAreas=new Set([...selectedAreas].filter(id=>cells.some(c=>c.id===id)));
  $('#report-map-panel').hidden=false;
  $('#report-map-period').textContent=area?.usable?`${formatWindow(area)} · ${area.months} months of selected crime reports`:'Report shading unavailable: this source window needs a complete, current snapshot.';
  const source=journey?.evidence?.sources?.reports;
  $('#report-scope').textContent='Included in this snapshot: '+(source?.categories?.join(', ')||'Category coverage unavailable')+'.';
  $('.report-scale').hidden=!area?.usable;
  $('#show-report-areas').disabled=!area?.usable;
  $('#report-area-choice').disabled=!cells.length;
  $('#report-area-choice').innerHTML='<option value="">Add or remove an area…</option>'+cells.map(c=>`<option value="${esc(c.id)}">${selectedAreas.has(c.id)?'✓ ':''}${crimeReportLabel(c.count)} · ${formatWindow(area)}</option>`).join('');
  $('#report-area-choice').value='';
  syncReportSelection();
  refreshSelectionTotal(cells.filter(c=>selectedAreas.has(c.id)));
  renderReportAreaDetail();
}
function renderReportAreaDetail(){
  const cells=reportCells(),chosen=cells.filter(c=>selectedAreas.has(c.id)),area=comparison.areaReports;
  if(!chosen.length){$('#report-area-detail').innerHTML=`<p class="report-layer-note">${!area?.usable?'Missing or stale data cannot establish an absence of concerns.':!cells.length?'No mapped selected reports in this display area and time window. This does not mean no incidents occurred.':'Tap shaded areas to select several. Diagonal stripes mark your selection. Tap again to remove one. The combined count removes shared reports automatically.'}</p>`;return;}
  const outside=optionsOutsideAreas(chosen.map(c=>c.id),comparison.routes,cells),index=r=>comparison.routes.findIndex(a=>a.id===r.id)+1;
  const total=selectionTotal.status==='ready'?selectionTotal.data:null;
  $('#report-area-detail').innerHTML=`<article class="area-detail"><div class="selection-heading"><span>${chosen.length} ${chosen.length===1?'area':'areas'} selected</span><button type="button" id="clear-report-selection" class="text-button">Clear selection</button></div><h4 class="selection-count">${total?crimeReportLabel(total.count):selectionTotal.status==='loading'?'Counting unique reports…':'Combined count unavailable'}</h4><p class="selection-period">${formatWindow(area)}</p>${selectionTotal.status==='error'?'<p>'+esc(selectionTotal.message)+'</p><button type="button" class="text-button" id="retry-report-selection">Retry count</button>':''}<p>Shared reports counted once. Selected public categories only; this is not a complete crime count.</p>${total?'<div class="incident-categories">'+total.categories.map(g=>`<span>${esc(g.category)} <b>${g.count}</b></span>`).join('')+'</div><p class="report-layer-note">Category totals may overlap. A zero means no matching published reports, not that no crime occurred.</p>':''}<div class="selected-areas" aria-label="Selected areas">${chosen.map(c=>`<button type="button" class="selected-area" data-remove-area="${esc(c.id)}" aria-label="Remove area with ${crimeReportLabel(c.count)} from selection"><span>${crimeReportLabel(c.count)}<small>${formatWindow(area)}</small></span><span aria-hidden="true">×</span></button>`).join('')}</div><h4>Routes outside ${chosen.length===1?'this area':'all selected areas'}</h4>${outside.length?outside.map(r=>`<button type="button" class="${r.eligible?'primary':'secondary'} area-bypass" data-area-route="${esc(r.id)}">${r.id===selected?'Selected: ':''}Route ${index(r)} · ${esc(r.name)}<br>${Math.round(r.duration/60)} min total · ${r.extraMinutes?extraTime(r.extraMinutes)+' min longer':'shortest option'}${r.eligible?'':' · over your detour limit'}</button>`).join(''):'<p>No full bypass among the returned options. Every option comes within 50 m of at least one selected area.</p>'}<p>A full bypass must clear a 50 m margin around every selected shape. That is a geographic comparison, not evidence of lower risk.</p></article>`;
  $('#clear-report-selection').addEventListener('click',()=>{resetReportSelection();renderReportAreas();$('#report-area-choice').focus({preventScroll:true});});
  $('#retry-report-selection')?.addEventListener('click',()=>{selectionTotal={key:null,status:'idle'};renderReportAreas();});
  $('#report-area-detail').querySelectorAll('[data-remove-area]').forEach(b=>b.addEventListener('click',()=>{selectedAreas.delete(b.dataset.removeArea);renderReportAreas();}));
  $('#report-area-detail').querySelectorAll('[data-area-route]').forEach(b=>b.addEventListener('click',()=>selectRoute(b.dataset.areaRoute)));
}
function selectReportArea(id,focus=false,at=null){
  const cell=reportCells().find(c=>c.id===id);if(!cell)return;
  if(selectedAreas.has(id))selectedAreas.delete(id);else if(selectedAreas.size<100)selectedAreas.add(id);else{error('Select up to 100 areas at once. Remove an area or clear the selection to add more.');return;}
  renderReportAreas();
  if(liveMap){const b=prepareBlock(cell.geometry).bounds,center=blockUnproject([(b.left+b.right)/2,(b.bottom+b.top)/2]);reportPopup=new window.mapboxgl.Popup({closeButton:true,maxWidth:'280px',focusAfterOpen:false}).setLngLat(at||center).setHTML(`<div class="report-popup"><strong>${crimeReportLabel(cell.count)}</strong><p>${esc(formatWindow(comparison.areaReports))}</p><p>${cell.categories.filter(g=>g.count).map(g=>esc(g.category)+': '+g.count).join(' · ')}</p><p>${selectedAreas.has(id)?'Added to selection. Tap another shaded area to add it.':'Removed from selection.'}</p><button type="button" class="text-button">View selected totals ↓</button></div>`).addTo(liveMap);reportPopup.getElement().querySelector('button.text-button').addEventListener('click',()=>{setView('map');$('#map-layers').open=true;$('#report-area-detail').scrollIntoView({block:'center'});$('#clear-report-selection')?.focus({preventScroll:true});});}
  if(focus&&liveMap){const b=prepareBlock(cell.geometry).bounds;liveMap.fitBounds([blockUnproject([b.left,b.bottom]),blockUnproject([b.right,b.top])],{padding:65,maxZoom:16,duration:0});}
}
$('#report-area-choice').addEventListener('change',e=>selectReportArea(e.target.value,true));
$('#show-report-areas').addEventListener('change',()=>{reportPopup?.remove();reportPopup=null;if(mode==='live')mapbox().catch(e=>error(e.message));});

function fitMap(){if(liveMap && journey){const points=(walkChosen?journey.routes.filter(r=>r.id===selected):journey.routes).flatMap(r=>r.coordinates);const bounds=points.reduce((b,p)=>b.extend(p),new window.mapboxgl.LngLatBounds(points[0],points[0]));liveMap.fitBounds(bounds,{padding:65,duration:0});}else if(journey&&mode==='demo')schematic();}
function render(){
  $('.results').hidden=false;$('.evidence-section').hidden=false;$('#takeaway').hidden=false;$('#export').disabled=mode!=='demo';
  $('#report-scope').textContent=mode==='demo'?'Sample mode uses invented Assault and Robbery reports. No live police assessment is attached.':'No current police category coverage is connected.';
  comparison=attachLiveContext(compareJourney(journey,options()),journey,options());
  if(!comparison.routes.some(r=>r.id===selected))selected=comparison.fastestId;
  const route=comparison.routes.find(r=>r.id===selected), usable=comparison.status.usable;
  const reportsUsable=usable && comparison.incidentStatus.usable;
  $('#incident-window').disabled=mode==='live'&&!comparison.liveEvidence;
  $('#window-note').textContent=mode==='demo'?`Fictional event dates · Reports: ${formatWindow(comparison.incidentWindow)}. Collisions: ${formatWindow(comparison.collisionWindow)}. ${reportsUsable?'Recent reports can arrive late; fewer records do not imply lower risk.':comparison.incidentStatus.reason}`:'Real incident and collision data are not connected.';
  renderFacilities(route);
  $('#report-map-panel').hidden=true;
  $('#route-search-note').hidden=mode!=='live'||(!searchChanged()&&!journey.routeSearch?.notice);
  $('#update-alternatives').hidden=mode!=='live'||!searchChanged();
  $('#route-search-note').textContent=mode==='live'?[journey.routeSearch?.method==='evidence-guided'?'Search targets less overlap with '+[journey.routeSearch.criteria?.reports?'darkest report blocks':'',journey.routeSearch.criteria?.crashes?'historical crash clusters':''].filter(Boolean).join(' and ')+'. The shortest found route stays as your reference.':'Different-street search only: usable evidence is not connected.',journey.routeSearch?.notice||'',searchChanged()?'Settings changed. Update alternatives to search with this time window, corridor and detour limit.':'Routes remain ordered by walking time; no safety score.'].filter(Boolean).join(' '):'';
  $('#results-meta').textContent=`${comparison.routes.length} ${mode==='demo'?'sample':'provider'} route${comparison.routes.length===1?'':'s'} · ${mode==='demo'?'Fictional snapshot: '+fmtDate(journey.asOf):'Mapbox walking estimates'}${$('#departure').value?' · Planned '+$('#departure').value+' SF time':''}`;
  $('#results-title').textContent=comparison.routes.length===1?'One walking route returned.':'A few ways to get there.';
  $('#within-count').textContent=`${comparison.routes.filter(r=>r.eligible).length} within your limit`;
  $('#route-cards').innerHTML=comparison.routes.map((r,i)=>`<button class="route-card ${r.eligible?'':'over-limit'}" aria-pressed="${r.id===selected}" data-id="${esc(r.id)}"><div class="route-card-top"><span class="route-tag"><i style="background:${routeColor(i)}"></i>${mode==='live'?'ROUTE '+(i+1)+' · ':''}${i===0?'SHORTEST WALK':r.eligible?'ALTERNATIVE '+i:'BEYOND YOUR LIMIT'}</span><span class="choice" aria-hidden="true"></span></div><div class="route-name">${esc(r.name)}</div>${mode==='live'?'<span class="route-method">'+(r.method==='via-street'?'Walking route via a nearby street':'Provider walking route')+'</span>':''}<div class="route-stats"><strong>${Math.round(r.duration/60)}</strong> min · ${(r.distance/1000).toFixed(2)} km <span class="extra">${r.extraMinutes?`+${extraTime(r.extraMinutes)} min`:'Baseline'}</span></div><div class="record-counts">${r.counts?`<span class="evidence-count traffic"><i class="evidence-symbol traffic" aria-hidden="true"></i><b>${r.counts.collision}</b> sample traffic collision${r.counts.collision===1?'':'s'}</span><span class="evidence-count reports"><i class="evidence-symbol reports" aria-hidden="true"></i><b>${r.counts.incident??'—'}</b> ${r.counts.incident===null?'reports unavailable':'sample reports · '+comparison.incidentWindow.months+' mo'}</span>`:'<span>Evidence unavailable · no assessment</span>'}</div><p class="route-note">${!r.eligible?'Exceeds your detour limit. Shown for comparison.':i===0?'Shortest time; explore evidence in About the data.':'Different streets; different trade-offs.'}</p></button>`).join('');
  $('#route-cards').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectRoute(b.dataset.id)));
  $('#takeaway').innerHTML=`<h3><span aria-hidden="true">↗</span>${esc(comparison.takeaway.title)}</h3><p>${esc(comparison.takeaway.body)}</p>${comparison.takeaway.routeId?'<button class="text-button" id="inspect-alt">Inspect this alternative →</button>':''}`;
  $('#inspect-alt')?.addEventListener('click',()=>{selectRoute(comparison.takeaway.routeId);setView('map');fitMap();});
  $('#selected-route-name').textContent=route.name+(route.eligible?'':' · beyond your detour limit');
  $('.evidence-list .badge').textContent=mode==='demo'?'FICTIONAL':'NOT CONNECTED';
  const collisions=route.matches.filter(r=>r.kind==='collision');
  const incidents=route.matches.filter(r=>r.kind==='incident');
  const incidentGroups=[...new Set(incidents.map(r=>r.category))].map(category=>({category,count:incidents.filter(r=>r.category===category).length}));
  $('#findings').innerHTML=!usable?`<p class="empty-evidence">${esc(comparison.status.reason)}</p>`:
    '<h4 class="evidence-type-title traffic"><i class="evidence-symbol traffic" aria-hidden="true"></i>Traffic collisions</h4>'+
    collisions.map((r,i)=>`<article class="finding"><span class="finding-index">${i+1}</span><div><h4>${esc(r.label)}</h4><p>One fictional pedestrian collision record falls within ${comparison.buffer} m of this route line. This does not verify a hazardous crossing or current conditions.</p><p class="date">INVENTED RECORD ${esc(r.id)} · ${fmtDate(r.date)}</p></div></article>`).join('')+
    (!collisions.length?'<p class="empty-evidence">No fictional collision records matched this corridor. This does not establish an absence of concerns.</p>':'')+
    `<section class="incident-note"><h4 class="evidence-type-title reports"><i class="evidence-symbol reports" aria-hidden="true"></i>Reported crime incidents</h4><p class="date">EVENT WINDOW · ${formatWindow(comparison.incidentWindow)}</p><strong>${reportsUsable?route.counts.incident+' fictional report'+(route.counts.incident===1?'':'s')+' near this route':'Report counts unavailable'}</strong>${reportsUsable?'':'<p>'+esc(comparison.incidentStatus.reason)+'</p>'}<div class="incident-categories">${incidentGroups.map(g=>`<span>${esc(g.category)} <b>${g.count}</b></span>`).join('')}</div><p>${incidents.length?'Sample event dates: '+[...new Set(incidents.map(r=>r.date))].map(fmtDate).join(', ')+'. ':''}Purple bands show route sections with nearby sample reports, not exact incident locations or danger zones. Real SFPD locations are shifted toward intersections.</p>${route.id!==comparison.fastestId?`<p>${route.shared} matching record(s), across both types, also appear near the shortest route.</p>`:''}</section>`;
  $('#coverage-label').textContent=usable&&!reportsUsable?'Incident coverage incomplete':comparison.status.label;
  const e=journey.evidence;
  $('#coverage-details').innerHTML=[['Records',mode==='demo'?'Invented for this demo':'Not connected'],['Collision window',formatWindow(comparison.collisionWindow)],['Incident window',mode==='demo'?formatWindow(comparison.incidentWindow):'Not connected'],['Report coverage',reportsUsable?'Selected sample window covered':'Unavailable for comparison'],['Snapshot refreshed',e?fmtDate(e.updated):'Not available'],['Retrieved',e?fmtDate(e.retrieved):'Not available'],['Screening corridor',comparison.buffer+' m each side'],['Exposure denominator','Not available'],['Location precision','Approximate; not sidewalk-specific']].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('#sensitivity').innerHTML=usable?route.sensitivity.map(x=>`${x.meters} m: ${x.collision} sample collisions / ${x.incident===null?'reports unavailable':x.incident+' sample incidents'}`).join('<br>'):'Insufficient evidence for a sensitivity check.';
  $('#map-label').textContent=mode==='demo'?'ILLUSTRATIVE ROUTE MAP':'MAPBOX WALKING ROUTES';
  $('.map-legend').hidden=mode==='live';
  $('#map-evidence-note').hidden=mode==='live';
  if(mode==='demo')$('#map-evidence-note').textContent='Fictional evidence · Amber circles: traffic collisions. Purple bands: approximate report context, not incident locations. Not for navigation.';
  if(mode==='live'&&comparison.liveEvidence)renderRealEvidence(route);
  updateWalkWorkspace();
  if(mode==='demo')schematic();else mapbox().catch(e=>error(e.message));
}
function renderRealEvidence(route){
  const e=comparison.liveEvidence,area=comparison.areaReports,crashes=e.sources.crashes,reports=e.sources.reports;
  $('#mode-label').textContent='Live routes · local data preview';
  $('#mode-note').textContent=' Historical SF records · current conditions unknown.';
  $('#window-note').textContent=`Report event dates: ${formatWindow(area)} · snapshot anchored to ${fmtDate(e.asOf)}. Collision event dates: ${formatWindow(e.collisionWindow)}. Different source windows; no time-of-day assessment.`;
  const baseline=comparison.routes[0].guidance;
  $('#route-cards').querySelectorAll('.record-counts').forEach((el,i)=>{
    const r=comparison.routes[i],g=r.guidance,darkDelta=baseline.darkMeters===null||g.darkMeters===null?null:baseline.darkMeters-g.darkMeters,crashDelta=baseline.crashes===null||g.crashes===null?null:baseline.crashes-g.crashes;
    el.innerHTML=`<span class="evidence-count traffic"><i class="evidence-symbol traffic" aria-hidden="true"></i><b>${g.crashes??'—'}</b> ${g.crashes===null?'collision data unavailable':`mapped crashes within ${comparison.buffer} m`}</span><span class="evidence-count reports"><i class="evidence-symbol reports" aria-hidden="true"></i>${g.darkMeters===null?'Report shading unavailable':`<b>${metricDistance(g.darkMeters)}</b> alongside darkest blocks`}</span>`;
    const label=i===0?'Shortest found · reference':r.differences.reports&&r.differences.crashes?'Less overlap in both layers':r.differences.reports?'Less dark-purple overlap':r.differences.crashes?'Fewer mapped crash records':'Different streets · no clear reduction';
    el.parentElement.querySelector('.route-method').textContent=label;
    const differences=i?[darkDelta===null?'Reports unavailable':Math.abs(darkDelta)<50?'Similar dark-block overlap':`About ${metricDistance(Math.abs(darkDelta))} ${darkDelta>0?'less':'more'} alongside darkest blocks`,crashDelta===null?'crashes unavailable':crashDelta===0?'same crash count':Math.abs(crashDelta)+' '+(crashDelta>0?'fewer':'more')+' crash record'+(Math.abs(crashDelta)===1?'':'s')].join(' · '):'Darkest = 30+ selected reports near a block. Counts and overlap are historical context, not risk estimates.';
    el.parentElement.querySelector('.route-note').textContent=(r.eligible?'':'Exceeds your detour limit. ')+differences;
  });
  $('.evidence-list .badge').textContent='REAL · LOCAL PREVIEW';
  const finding=(r,i)=>`<article class="finding"><span class="finding-index">${i+1}</span><div><h4>${esc(r.label)}</h4><p>Published pedestrian-involved injury crash location within ${comparison.buffer} m of the route line. Street-centerline placement does not identify sidewalk side or current conditions.</p><p class="date">${fmtDate(r.date)} · SOURCE CRASH ${esc(r.id)}</p></div></article>`;
  const traffic=crashes.health.usable?`<p>${route.counts.collision} mapped crash${route.counts.collision===1?'':'es'} · ${formatWindow(e.collisionWindow)}. Pedestrian involvement is verified against the source party table; this does not mean the pedestrian was the injured person.</p>${route.matches.slice(0,8).map(finding).join('')}${route.matches.length>8?'<details><summary>Show '+(route.matches.length-8)+' more published crash locations</summary>'+route.matches.slice(8).map((r,i)=>finding(r,i+8)).join('')+'</details>':''}${!route.matches.length?'<p>No mapped records matched this corridor. This does not establish an absence of concerns.</p>':''}`:`<p>Collision context unavailable: ${esc(crashes.health.label)}. Missing data is not zero.</p>`;
  $('#findings').innerHTML=`<h4 class="evidence-type-title traffic"><i class="evidence-symbol traffic" aria-hidden="true"></i>Pedestrian-involved injury crashes</h4>${traffic}<section class="incident-note"><h4 class="evidence-type-title reports"><i class="evidence-symbol reports" aria-hidden="true"></i>Explore the shaded report areas</h4><p>${area?.usable?`${route.reportAreas.length} shaded blocks lie alongside this route · ${formatWindow(area)}.`:'Report context unavailable. '+esc(reports.health.label)+'.'}</p><p>Select a shaded block on the map to see crime-report counts and dates. Select several areas to count shared reports once and compare routes outside the whole selection. These are area totals, not incidents on your path or predictions of harm.</p><button class="text-button" type="button" id="inspect-report-map">Inspect areas on the map ↑</button></section>`;
  $('#inspect-report-map').addEventListener('click',()=>{setView('map');$('#map-layers').open=true;$('#report-map-panel').scrollIntoView({block:'center'});$('#report-area-choice').focus({preventScroll:true});});
  renderReportAreas();
  $('#coverage-label').textContent='LOCAL VALIDATION';
  const fields=[['Collision event window',formatWindow(crashes.window)],['Collision source refreshed',fmtTimestamp(crashes.updated)],['Incident event window',formatWindow(area)],['Police source refreshed',fmtTimestamp(reports.updated)],['Retrieved',fmtTimestamp(reports.retrieved)],['Excluded crash locations',crashes.quality.missingLocationEntities+' missing, invalid or outside the SF envelope'],['Excluded report locations',reports.quality.missingLocationEntities+' missing, invalid or outside the SF envelope (12 months)'],['Block boundaries','2020 Census · SF shoreline clipped'],['Report-to-block proximity','Inside or within 35 m; reports may repeat across blocks'],['Reports without a block match',area?.unmatched??'Unavailable'],['Collision corridor',comparison.buffer+' m each side'],['Reporting completeness','Unknown; published snapshot reconciled'],['Current conditions / exposure','Not available']];
  $('#coverage-details').innerHTML=fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')+`<div><dt>Official sources</dt><dd><a href="${esc(crashes.url)}" target="_blank" rel="noreferrer">Injury crashes</a> · <a href="${esc(reports.url)}" target="_blank" rel="noreferrer">Police reports</a></dd></div>`;
  $('#sensitivity').innerHTML=crashes.health.usable?route.sensitivity.map(x=>`${x.meters} m: ${x.collision} mapped crashes`).join('<br>'):'Collision sensitivity unavailable.';
  $('#map-evidence-note').hidden=false;
  $('#map-evidence-note').textContent='Amber: crashes · Purple: report counts (darkest = 30+). Stripes: selected areas. Unshaded ≠ safe.';
}

function selectRoute(id){selected=id;walkChosen=false;saveMessage='';render();}
function runDemo(){requestVersion++;busy(false);try{journey=demoJourney($('#origin').value,$('#destination').value,$('#scenario').value);journey.inputAddresses=enteredInputs();walkChosen=false;saveMessage='';selected=null;error();render();}catch(e){journey=null;$('.results').hidden=true;$('.evidence-section').hidden=true;error(e.message);}}
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});let data;try{data=await r.json();}catch{throw new Error('The live routing server is unavailable. Use the sample walk.');}if(!r.ok)throw new Error(data.error||'The provider could not complete this request.');return data;}
$('#route-form').addEventListener('submit',async e=>{e.preventDefault();error();if(mode==='demo'){runDemo();return;}const requestedInputs=enteredInputs(),version=++requestVersion;walkChosen=false;saveMessage='';journey=null;$('.results').hidden=true;$('.evidence-section').hidden=true;$('#takeaway').hidden=true;$('#report-scope').textContent='A new comparison is pending. Previous route context is no longer displayed.';$('#facility-coverage').hidden=true;busy(true);try{const [origin,destination]=await Promise.all([post('/api/geocode',{query:$('#origin').value}),post('/api/geocode',{query:$('#destination').value})]);if(version!==requestVersion)return;candidates={origin:origin.features,destination:destination.features,inputs:requestedInputs};for(const field of ['origin','destination'])$('#'+field+'-choice').innerHTML=candidates[field].map((p,i)=>`<option value="${i}">${esc(p.label)}</option>`).join('');$('#address-dialog').showModal();}catch(e){if(version===requestVersion)error(e.message);}finally{if(version===requestVersion)busy(false);}});
$('#confirm-form').addEventListener('submit',async e=>{e.preventDefault();$('#address-dialog').close();const version=++requestVersion;busy(true);error();try{const origin=candidates.origin[Number($('#origin-choice').value)],destination=candidates.destination[Number($('#destination-choice').value)];const result=await post('/api/routes',{origin:origin.coordinates,destination:destination.coordinates,...options()});if(version!==requestVersion)return;journey={...result,inputAddresses:candidates.inputs,origin:origin.label,destination:destination.label,endpoints:{origin:origin.coordinates,destination:destination.coordinates}};selected=null;resetReportSelection();$('#live-help').hidden=true;render();}catch(e){if(version===requestVersion)error(e.message);}finally{if(version===requestVersion)busy(false);}});
$('#update-alternatives').addEventListener('click',async()=>{if(mode!=='live'||!journey?.endpoints)return;const previous=journey,version=++requestVersion;busy(true);error();try{const result=await post('/api/routes',{...previous.endpoints,...options()});if(version!==requestVersion)return;journey={...result,inputAddresses:previous.inputAddresses,origin:previous.origin,destination:previous.destination,endpoints:previous.endpoints};walkChosen=false;selected=null;resetReportSelection();render();}catch(e){if(version===requestVersion)error(e.message);}finally{if(version===requestVersion)busy(false);}});
$('#cancel-confirm').addEventListener('click',()=>$('#address-dialog').close());
$('#swap').addEventListener('click',()=>{const old=$('#origin').value;$('#origin').value=$('#destination').value;$('#destination').value=old;clearStops();if(journey)renderHandoff();});
$('#reset-addresses').addEventListener('click',()=>{$('#origin').value=addresses[0];$('#destination').value=addresses[1];if(mode==='demo')runDemo();});
for(const selector of ['#detour','#buffer','#departure','#incident-window'])$(selector).addEventListener('change',()=>{if(journey){saveMessage='';if(selector!=='#departure'){walkChosen=false;$('#route-options-drawer').open=true;}render();}});
$('#scenario').addEventListener('change',()=>{if(mode==='demo')runDemo();});
$('#fit-map').addEventListener('click',fitMap);
// Re-check review deadlines across midnight or after a suspended tab resumes.
function refreshFacilityReview(){if(mode==='live'&&journey&&facilityReviewDay!==new Date().toISOString().slice(0,10)){if($('#facility-dialog').open)$('#facility-dialog').close();render();}}
setInterval(refreshFacilityReview,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFacilityReview();});
$('#facility-jump').addEventListener('click',()=>{$('#map-layers').open=true;$('#facility-panel').scrollIntoView({block:'center'});$('#show-public-housing').focus({preventScroll:true});});
for(const id of facilityControls)$(id).addEventListener('change',()=>{if(journey)render();});
$('#fit-facilities').addEventListener('click',()=>{if(!liveMap||!facilityState.records.length)return;const bounds=new window.mapboxgl.LngLatBounds();for(const r of facilityState.records)bounds.extend(r.coordinates);liveMap.fitBounds(bounds,{padding:55,maxZoom:16,duration:0});$('#map').scrollIntoView({block:'center'});});
for(const id of ['#close-facility','#done-facility'])$(id).addEventListener('click',()=>$('#facility-dialog').close());
$('#demo-info').addEventListener('click',()=>setView('data',true));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#about-dialog').close()));
function setMode(next){
  requestVersion++;busy(false);error();walkChosen=false;saveMessage='';mode=next;journey=null;selected=null;resetReportSelection();
  clearStops();$('#route-options-drawer').open=true;$('#takeaway').hidden=true;$('#report-scope').textContent='Compare a walk to see the included category coverage.';$('#facility-coverage').hidden=true;
  if(liveMap){liveMap.remove();liveMap=null;mapFittedJourney=null;}
  $('#map').replaceChildren();
  $('#map').setAttribute('aria-label',next==='demo'?'Illustrative route map':'Live walking route map');
  $('#incident-window').disabled=next==='live'&&!config.evidenceConnected;
  $('#window-note').textContent=next==='live'?(config.evidenceConnected?'Historical source windows will appear with your walking routes.':'Real incident and collision data are not connected.'):'';
  if(next==='live')$('#map').textContent='Loading walking map… Route details remain available if the map cannot load.';
  $('#demo-mode').classList.toggle('selected',next==='demo');$('#demo-mode').setAttribute('aria-pressed',next==='demo');$('#live-mode').classList.toggle('selected',next==='live');$('#live-mode').setAttribute('aria-pressed',next==='live');
  $('#scenario').disabled=next==='live';$('#reset-addresses').hidden=next==='live';
  $('.version').textContent=next==='demo'?'V1 / FICTIONAL DEMO':'V1 / LOCAL PREVIEW';
  $('#trip-summary').textContent=next==='demo'?'Sample walk':'Plan a walk';
  $('#mode-label').textContent=next==='demo'?'Fictional demo':(config.evidenceConnected?'Live routes · local data preview':'Live routing · evidence not connected');$('#mode-note').textContent=next==='demo'?' Routes, facility locations, records, and dates are illustrative. This is not an assessment of real SF streets or a navigation tool.':(config.evidenceConnected?' Addresses are sent to Mapbox. Historical public records are available for local testing; no safety assessment is made.':' Addresses are sent to Mapbox. Routes have no SF evidence assessment. Temporary results are kept only in this page’s memory.');
  $('#live-help').hidden=next==='demo';
  if(next==='demo'){ $('#origin').value=addresses[0];$('#destination').value=addresses[1];runDemo();}
  else { $('#live-help').textContent='Enter two SF street addresses, then confirm the intended matches. Use street addresses rather than business or landmark names.';$('.results').hidden=true;$('.evidence-section').hidden=true;$('#origin').value='1 Market Street, San Francisco';$('#destination').value='425 Mission Street, San Francisco';}
}
$('#demo-mode').addEventListener('click',()=>{setMode('demo');$('.results').hidden=false;$('.evidence-section').hidden=false;});
$('#live-mode').addEventListener('click',()=>{if(!config.liveRoutingConfigured){$('#live-help').hidden=false;$('#live-help').textContent='Live routing needs the included Node server and a Mapbox public token with Geocoding and Directions access. This sample demo works without credentials. Setup instructions are in the project README.';return;}setMode('live');});
$('#export').addEventListener('click',()=>{
  if(!journey||mode!=='demo'){error('Live provider results are temporary and are not exported.');return;}
  const payload={title:'Sidewalk · FICTIONAL DEMO · NOT A REAL ASSESSMENT',asOf:journey.asOf,departureNote:$('#departure').value||null,method:{bufferMeters:comparison.buffer,detourMinutes:comparison.maxDetour,incidentMonths:comparison.incidentWindow.months},coverage:comparison.status,evidenceWindows:{collision:comparison.collisionWindow,incident:comparison.incidentWindow},incidentCoverage:comparison.incidentStatus,routes:comparison.routes.map(r=>({name:r.name,minutes:r.duration/60,kilometers:r.distance/1000,extraMinutes:r.extraMinutes,withinLimit:r.eligible,fictionalCounts:r.counts,sensitivity:r.sensitivity})),facilities:{fictional:true,selectedRouteId:selected,radiusMeters:facilityState.radius,scope:facilityState.scope,types:facilityOptions().types,records:facilityState.records.map(r=>({name:r.name,type:facilityTypes[r.type].label,approximateDistanceMeters:Math.round(r.meters/10)*10})),meaning:'Facility type only; no risk inference or routing effect'},limitations:['All demo routes, facility locations and records are invented.','No safety score or probability of harm.','No exposure denominator.','Lighting, access and current conditions unknown.']};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='sidewalk-fictional-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
setupWalkWorkspace();
initializeMode();
async function initializeMode(){
  if(location.protocol==='file:'||document.documentElement.hasAttribute('data-offline-demo')){setMode('demo');return;}
  $('#compare').disabled=true;$('#compare').textContent='Connecting…';
  $('#demo-mode').disabled=true;$('#live-mode').disabled=true;$('#scenario').disabled=true;
  try{
    const response=await fetch('/api/config',{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Connection unavailable');
    const connected=await response.json();
    if(typeof connected.liveRoutingConfigured!=='boolean')throw Error('Connection unavailable');
    config=connected;setMode(config.liveRoutingConfigured?'live':'demo');
    if(!config.liveRoutingConfigured){$('#live-help').hidden=false;$('#live-help').textContent='Live routing is not configured on this server. The fictional demo is shown; add a Mapbox token to use real walking routes.';}
  }catch{
    setMode('live');$('#mode-label').textContent='Live connection unavailable';$('#mode-note').textContent=' No routes or evidence have been loaded.';
    $('#live-help').textContent='Could not connect to the local routing server. Refresh to try again, or choose Fictional demo to explore the sample.';$('#compare').disabled=true;
  }finally{$('#demo-mode').disabled=false;$('#live-mode').disabled=false;}
}

function enteredInputs(){const stops=enteredStops();return {origin:$('#origin').value.trim(),destination:$('#destination').value.trim(),departure:$('#departure').value,...(stops.length?{stops}:{})};}
function enteredStops(){return [1,2,3].map(i=>$('#handoff-stop-'+i).value.trim()).filter(Boolean);}
function fillStops(stops=[]){for(const i of [1,2,3])$('#handoff-stop-'+i).value=stops[i-1]||'';}
function clearStops(){fillStops();if(journey?.inputAddresses)delete journey.inputAddresses.stops;}
function extraTime(minutes){return minutes>0&&minutes<1?'less than 1':String(Math.round(minutes));}
function setView(view,focus=false){
  const changed=activeView!==view;if(changed)viewScroll[activeView]=window.scrollY;
  activeView=view;for(const name of ['map','data']){const current=name===view;$('#'+name+'-view').hidden=!current;$('#tab-'+name).setAttribute('aria-selected',String(current));$('#tab-'+name).tabIndex=current?0:-1;}
  if(changed)window.scrollTo({top:viewScroll[view],behavior:'instant'});
  if(view==='map')requestAnimationFrame(()=>liveMap?.resize());
  if(focus)$('#tab-'+view).focus();
}
function updateWalkWorkspace(){
  const route=comparison.routes.find(r=>r.id===selected),fictional=mode==='demo';
  $('#comparison-choices').hidden=walkChosen;$('#chosen-walk').hidden=!walkChosen;
  $('#fit-map').textContent=walkChosen?'⌖ Your route':'⌖ All routes';$('#fit-map').setAttribute('aria-label',walkChosen?'Show selected route':'Show all routes');
  $('#trip-summary').textContent=(journey.inputAddresses?.origin||journey.origin)+' → '+(journey.inputAddresses?.destination||journey.destination);
  const e=comparison.liveEvidence;
  const warning=fictional?(!comparison.status.usable?comparison.status.label:!comparison.incidentStatus.usable?comparison.incidentStatus.label:'Fictional sample · not for navigation'):[e?.sources.crashes.health.usable?'':('Crashes: '+(e?.sources.crashes.health.label||'unavailable')),comparison.areaReports?.usable?'':('Reports: '+(e?.sources.reports.health.usable?'selected window unavailable':e?.sources.reports.health.label||'unavailable'))].filter(Boolean).join(' · ');
  $('#map-context').innerHTML=`<span class="context-state ${warning?'attention':''}">${esc(warning||'Historical data · partial public coverage')}</span><span>Reports: ${esc(formatWindow(comparison.incidentWindow))}</span><span>Crashes: ${esc(formatWindow(comparison.collisionWindow))}</span><button class="text-button" type="button" id="context-details">Data details ↗</button>`;
  $('#context-details').onclick=()=>setView('data',true);
  $('#chosen-label').textContent=fictional?'FICTIONAL WALK · NOT FOR NAVIGATION':'YOUR SELECTED WALK';
  $('#chosen-title').textContent=route.name;$('#chosen-stats').textContent=`${Math.round(route.duration/60)} min · ${(route.distance/1000).toFixed(2)} km${route.extraMinutes?' · '+extraTime(route.extraMinutes)+' min longer':''}${route.eligible?'':' · beyond your detour limit'}`;
  $('#chosen-context').textContent=warning||'Planning directions · follow current signs and conditions.';
  $('#save-walk').textContent=fictional?'Save sample walk':'Save trip';
  $('#save-explanation').textContent=fictional?'Keeps this invented route on this device.':'Saves your entered addresses, optional stops and preferences on this device. Reopening compares fresh routes; this exact path is not stored.';
  $('#save-status').textContent=saveMessage;
  fillStops(journey.inputAddresses?.stops);renderHandoff();
  const steps=fictional?[]:route.steps||[];
  $('#directions-note').textContent=fictional?'The sample path is invented; no walking instructions are offered.':steps.length?'Mapbox directions for this selected path. No live tracking or automatic rerouting.': 'Walking instructions were not returned for this route. Use the map for planning; do not infer turns from the route name.';
  $('#directions-list').innerHTML=steps.map(step=>`<li><span>${step.intermediate?'Intermediate routing point — continue with the next instruction.':esc(step.instruction)}</span>${step.intermediate?'':`<small>${Math.round(step.distance)} m</small>`}</li>`).join('');
  $('#mode-label').textContent=fictional?'Fictional demo':e?'Live routes · historical SF data':'Live routing · evidence unavailable';
  $('#mode-note').textContent=fictional?' Invented routes and records · not for navigation.':e?' Historical SF records · current conditions unknown.':' Historical evidence unavailable.';
  $('#results-title').textContent=walkChosen?'Your selected walk.':comparison.routes.length===1?'One walking route returned.':'Compare your walks.';
}
function renderHandoff(){
  const fictional=mode==='demo',stops=journey?.inputAddresses?.stops||[];
  $('#handoff-stops').hidden=fictional;
  let links=null,message='';try{links=mapsLinks(journey?.inputAddresses,{fictional});}catch(e){message=e.message;}
  $('#handoff-error').hidden=!message;$('#handoff-error').textContent=message;
  for(const name of ['apple','google']){const a=$('#open-'+name);a.hidden=fictional;a.setAttribute('aria-disabled',String(!links));a.tabIndex=links?0:-1;if(links)a.href=links[name];else a.removeAttribute('href');a.textContent='Open in '+(name==='apple'?'Apple':'Google')+' Maps'+(stops.length?' · '+stops.length+' stop'+(stops.length===1?'':'s'):'')+' ↗';}
  $('#handoff-note').textContent=fictional?'Maps handoff is disabled for invented routes.':stops.length?'Includes your entered stops in order. Maps recalculates between them and some versions may ignore stops. Check the addresses, stop order and streets before starting; this is not an exact-route export.':'Uses your entered addresses in San Francisco. Apple or Google calculates a new route and may use streets you avoided here. Check the matched addresses and route before starting.';
}
function savedState(){try{return readSavedWalks(localStorage);}catch{return {walks:[],warning:'Saved walks are unavailable in this browser.'};}}
function updateSavedCount(){const state=savedState();$('#saved-count').textContent=state.walks.length;return state;}
function renderSavedWalks(){
  const state=updateSavedCount();$('#saved-message').textContent=state.warning;
  $('#saved-list').innerHTML=state.walks.length?state.walks.map(w=>`<article class="saved-card"><div><span class="eyebrow">${w.kind==='sample-walk'?'FICTIONAL SAVED WALK':'SAVED TRIP · NEW COMPARISON'}</span><h3>${esc(w.inputs.origin)} → ${esc(w.inputs.destination)}</h3>${w.inputs.stops?.length?'<p>Maps stops: '+w.inputs.stops.map(esc).join(' → ')+'</p>':''}<p>Saved ${esc(fmtDate(w.createdAt.slice(0,10)))}${w.review.asOf?' · reviewed snapshot '+esc(fmtDate(w.review.asOf)):''}</p><p>${w.kind==='live-trip'?'The previous path and directions are not stored.':'Invented route preserved; not for navigation.'}</p></div><div class="saved-actions"><button type="button" class="secondary" data-open-walk="${esc(w.id)}">${w.kind==='live-trip'?'Load trip':'Open sample'}</button><button type="button" class="text-button" data-delete-walk="${esc(w.id)}">Remove</button></div></article>`).join(''):'<p class="empty-saved">No saved walks yet. Choose a route on the Map tab, then save it here.</p>';
  $('#saved-list').querySelectorAll('[data-open-walk]').forEach(b=>b.onclick=()=>openSavedWalk(b.dataset.openWalk));
  $('#saved-list').querySelectorAll('[data-delete-walk]').forEach(b=>b.onclick=()=>{try{writeSavedWalks(localStorage,savedState().walks.filter(w=>w.id!==b.dataset.deleteWalk));renderSavedWalks();$('#saved-message').textContent='Removed from this device.';($('#saved-list [data-delete-walk]')||$('#done-saved')).focus();}catch(e){$('#saved-message').textContent=e.message;}});
}
function openSavedWalk(id){
  const w=savedState().walks.find(w=>w.id===id);if(!w)return;
  if(w.kind==='live-trip'&&!config.liveRoutingConfigured){$('#saved-message').textContent='Live routing is not connected here. Your trip is still saved on this device.';return;}
  $('#saved-dialog').close();setView('map');setMode(w.kind==='sample-walk'?'demo':'live');
  for(const field of ['origin','destination','departure'])$('#'+field).value=w.inputs[field];fillStops(w.inputs.stops);
  $('#detour').value=w.options.maxDetour;$('#buffer').value=w.options.buffer;$('#incident-window').value=w.options.incidentMonths;
  if(w.kind==='sample-walk'){
    $('#scenario').value=w.sample.scenario;runDemo();journey.routes=w.sample.routes;selected=w.sample.selectedRouteId;walkChosen=true;saveMessage='Opened the saved fictional route.';render();fitMap();$('#chosen-walk').scrollIntoView({block:'nearest'});
  }else{
    $('#planner-drawer').open=true;$('#live-help').hidden=false;$('#live-help').textContent='Saved trip loaded. Confirm the addresses and compare again to get fresh routes. The previously selected path is not retained.';$('#planner').scrollIntoView({block:'start'});$('#compare').focus({preventScroll:true});
  }
}
function setupWalkWorkspace(){
  for(const i of [1,2,3])$('#handoff-stop-'+i).addEventListener('input',()=>{if(mode!=='live'||!journey?.inputAddresses)return;journey.inputAddresses.stops=enteredStops();saveMessage='';$('#save-status').textContent='';renderHandoff();});
  for(const id of ['#origin','#destination'])$(id).addEventListener('input',()=>{clearStops();if(journey)renderHandoff();});
  $('.skip').onclick=()=>{setView('map');$('#planner-drawer').open=true;$('#origin').focus();};
  for(const name of ['map','data'])$('#tab-'+name).onclick=()=>setView(name);
  document.querySelector('[role=tablist]').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();setView(event.key==='Home'?'map':event.key==='End'?'data':activeView==='map'?'data':'map',true);});
  document.querySelectorAll('[data-map-return]').forEach(b=>b.onclick=()=>setView('map',true));
  try{$('#welcome-note').hidden=localStorage.getItem('sidewalk-intro-seen')==='1';}catch{}
  $('#dismiss-welcome').onclick=()=>{$('#welcome-note').hidden=true;try{localStorage.setItem('sidewalk-intro-seen','1');}catch{}};
  $('#choose-walk').onclick=()=>{walkChosen=true;saveMessage='';render();fitMap();$('#chosen-title').tabIndex=-1;$('#chosen-title').focus({preventScroll:true});};
  $('#back-to-options').onclick=()=>{walkChosen=false;render();fitMap();$('#choose-walk').focus({preventScroll:true});};
  $('#save-walk').onclick=()=>{try{
    const state=savedState();if(state.warning)throw Error(state.warning);
    const record=makeSavedWalk({id:crypto.randomUUID(),journey,comparison,selected,inputs:{...journey.inputAddresses,departure:$('#departure').value},options:options(),scenario:$('#scenario').value});
    writeSavedWalks(localStorage,[record,...state.walks]);saveMessage=record.kind==='sample-walk'?'Sample walk saved on this device.':'Trip saved on this device. Reopen it from Saved walks.';updateSavedCount();
  }catch(e){saveMessage=e.message;}$('#save-status').textContent=saveMessage;};
  $('#saved-walks').onclick=()=>{renderSavedWalks();$('#saved-dialog').showModal();};
  for(const id of ['#close-saved','#done-saved'])$(id).onclick=()=>$('#saved-dialog').close();
  window.addEventListener('storage',()=>{updateSavedCount();if($('#saved-dialog').open)renderSavedWalks();});
  updateSavedCount();
}
