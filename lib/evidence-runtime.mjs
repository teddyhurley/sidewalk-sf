import {mkdir,readFile,writeFile,rename,copyFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadSnapshot,sourceHealth} from './live-evidence.mjs';
const appRoot=fileURLToPath(new URL('../',import.meta.url));
const day=86400000;
export async function atomicJson(file,value){
  await mkdir(path.dirname(file),{recursive:true});
  const temporary=file+'.tmp';await writeFile(temporary,JSON.stringify(value)+'\n',{mode:0o600});await rename(temporary,file);
}
export async function promoteEvidence(candidate,active,{now=Date.now(),signal}={}){
  const snapshot=await loadSnapshot(candidate);
  for(const kind of ['reports','crashes'])if(!sourceHealth(snapshot.sources[kind],kind,now).usable)throw Error('Candidate source failed quality or freshness checks');
  signal?.throwIfAborted();
  await mkdir(path.dirname(active),{recursive:true});
  // Keep one previous good snapshot; candidate and active files share a disk.
  try{await copyFile(active,active+'.previous');}catch(error){if(error.code!=='ENOENT')throw error;}
  signal?.throwIfAborted();await rename(candidate,active);return snapshot;
}
function runStep(script,{dataDir,auditDir,signal}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--max-old-space-size=128',path.join(appRoot,'scripts',script)],{cwd:appRoot,env:{...process.env,DATA_DIR:dataDir,AUDIT_DIR:auditDir},stdio:'ignore',signal});
    child.once('error',reject);child.once('exit',(code)=>code===0?resolve():reject(Error('Refresh step failed: '+script)));
  });
}
export async function createEvidenceRuntime({dataDir,now=Date.now,run=runStep,log=console.log}={}){
  const active=path.join(dataDir,'evidence.json'),statusFile=path.join(dataDir,'refresh-status.json');
  await mkdir(dataDir,{recursive:true});
  let snapshot=null,state={state:'not-refreshed',lastAttempt:null,lastSuccess:null},pending=null,timer,controller;
  try{snapshot=await loadSnapshot(active);state.lastSuccess=snapshot.retrievedAt||snapshot.sources.reports.retrievedAt;state.state='loaded';}catch{}
  try{const previous=JSON.parse(await readFile(statusFile,'utf8'));if(typeof previous.lastAttempt==='string')state.lastAttempt=previous.lastAttempt;}catch{}
  async function perform(){
    let staging;
    controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20*60000);timeout.unref();
    state={...state,state:'refreshing',lastAttempt:new Date(now()).toISOString()};
    try{
      await atomicJson(statusFile,state);
      staging=await mkdtemp(path.join(dataDir,'refresh-'));
      const auditDir=path.join(staging,'audit');await mkdir(auditDir);
      const args={dataDir:staging,auditDir,signal:controller.signal};
      await run('ingest-evidence.mjs',args);await run('validate-evidence.mjs',args);
      const reconciliation=JSON.parse(await readFile(path.join(auditDir,'publisher-reconciliation.json'),'utf8'));
      if(reconciliation.status!=='matched'||reconciliation.checks?.length!==2||reconciliation.checks.some(c=>c.match!==true))throw Error('Publisher reconciliation failed');
      await atomicJson(path.join(dataDir,'publisher-reconciliation.json'),reconciliation);
      const next=await promoteEvidence(path.join(staging,'evidence.json'),active,{now:now(),signal:controller.signal});
      snapshot=next;state={state:'current',lastAttempt:state.lastAttempt,lastSuccess:next.retrievedAt};
      log('Evidence refresh passed; validated snapshot loaded.');
    }catch{
      state={...state,state:'failed',failure:'Refresh did not pass all checks; previous snapshot retained.'};
      log('Evidence refresh failed; prior snapshot retained. Check /api/status and retry after the source is available.');
    }finally{
      clearTimeout(timeout);controller=null;
      try{await atomicJson(statusFile,state);}catch{log('Evidence refresh status could not be written.');}
      if(staging)await rm(staging,{recursive:true,force:true});
    }
    return {...state};
  }
  function refresh(){if(!pending)pending=perform().finally(()=>{pending=null;});return pending;}
  function due(){return !snapshot||now()-Date.parse(snapshot.sources.reports.retrievedAt)>=day;}
  return {
    current:()=>snapshot,
    status:()=>({...state,asOf:snapshot?.asOf||null}),
    refresh,
    start(){if(timer)return;if(due())void refresh();timer=setInterval(()=>{if(due())void refresh();},3600000);timer.unref();},
    async stop(){clearInterval(timer);timer=null;controller?.abort();if(pending)await pending;}
  };
}
