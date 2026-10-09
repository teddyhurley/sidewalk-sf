// Bounded, reconciled reads of publisher snapshots. No app credentials are logged.
export async function sourceJson(url,{fetcher=fetch,token=process.env.SOCRATA_APP_TOKEN}={}) {
  const headers={Accept:'application/json',Connection:'close'};if(token)headers['X-App-Token']=token;
  const response=await fetcher(url,{headers,signal:AbortSignal.timeout(45000)});
  if(!response.ok){let reason='';try{const body=await response.json();reason=typeof body.message==='string'?body.message.slice(0,500):'';}catch{}throw new Error(`DataSF returned HTTP ${response.status}${reason?': '+reason:''}`);}
  return response.json();
}
export async function downloadSource(spec,{fetcher=fetch,token,pageSize=10000,maxRows=100000,minIntervalMs=fetcher===fetch?1000:0}={}) {
  if(!/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(spec.id))throw new Error('Invalid source identifier');
  let lastRequest=0;
  const pacedFetch=async(...args)=>{const remaining=minIntervalMs-(Date.now()-lastRequest);if(remaining>0)await new Promise(r=>setTimeout(r,remaining));lastRequest=Date.now();return fetcher(...args);};
  const options={fetcher:pacedFetch,token},metaUrl=`https://data.sfgov.org/api/views/${spec.id}.json`;
  const before=await sourceJson(metaUrl,options);
  const fields=new Set((before.columns||[]).map(c=>c.fieldName));
  for(const field of spec.fields)if(!fields.has(field))throw new Error(`Source ${spec.id} missing ${field}`);
  const query=async params=>{const u=new URL(`https://data.sfgov.org/resource/${spec.id}.json`);u.search=new URLSearchParams(params);const result=await sourceJson(u,options);if(!Array.isArray(result))throw new Error('Source response is not a list');return result;};
  const summary=async()=>{const data=await query({'$select':`count(*) as rows,count(distinct ${spec.key}) as unique_keys`,'$where':spec.where});return {rows:Number(data[0]?.rows),uniqueKeys:Number(data[0]?.unique_keys)};};
  const expected=await summary();
  if(!Number.isInteger(expected.rows)||expected.rows<0||expected.rows>maxRows||expected.rows!==expected.uniqueKeys)throw new Error('Source total/key reconciliation failed');
  const records=[],seen=new Set();let pages=0;
  while(records.length<expected.rows){
    let page;
    try{page=await query({'$select':spec.fields.join(','),'$where':spec.where,'$order':spec.key+' ASC','$limit':String(pageSize),'$offset':String(records.length)});}
    catch(error){throw new Error(`${spec.id}, page ${pages+1}: ${error.message}`);}
    if(!page.length)throw new Error('Source ended before expected total');
    for(const row of page){const key=row[spec.key];if(typeof key!=='string'||!key||seen.has(key))throw new Error('Missing or duplicate pagination key');seen.add(key);records.push(row);}
    pages++;
    if(records.length>expected.rows||pages>Math.ceil(maxRows/pageSize)+1)throw new Error('Source exceeded reconciled total');
  }
  const after=await sourceJson(metaUrl,options);
  if(before.rowsUpdatedAt!==after.rowsUpdatedAt||before.viewLastModified!==after.viewLastModified||JSON.stringify(before.columns)!==JSON.stringify(after.columns))throw new Error('Source changed during retrieval; retry a fresh snapshot');
  return {records,manifest:{datasetId:spec.id,title:before.name,url:`https://data.sf.gov/d/${spec.id}`,sourceUpdatedAt:new Date(before.rowsUpdatedAt*1000).toISOString(),retrievedAt:new Date().toISOString(),query:spec.where,fields:spec.fields,rows:records.length,uniqueKeys:seen.size,pages,reconciled:true}};
}
