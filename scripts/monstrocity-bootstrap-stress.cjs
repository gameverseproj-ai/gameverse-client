// Local-server concurrency regression. Creates fresh anonymous test accounts; no transport retries.
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const base='http://127.0.0.1:8080';
(async()=>{
  const batches=[];
  for(let batch=0;batch<24;batch++){
    const auth=await fetch(base+'/api/auth/anonymous',{method:'POST',headers:{'x-device-id':randomUUID()}});
    if(!auth.ok)throw Error('Anonymous authentication failed: '+auth.status);
    const {token,playerId}=await auth.json();
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const requests=Array.from({length:7},()=>({path:'/bootstrap',options:{headers}}));
    requests.push({path:'/runs',options:{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({character:'female',configVersion:'monstrocity-v2'})}});
    const responses=await Promise.all(requests.map(async({path,options})=>{
      const response=await fetch(base+'/api/monstrocity'+path,{...options,signal:AbortSignal.timeout(15000)});
      const body=await response.json();
      return {path,status:response.status,...(!response.ok?{error:body}:{})};
    }));
    batches.push({batch,playerId,at:new Date().toISOString(),responses});
    if(responses.some(r=>r.status!==200))console.log('FAILED batch',batch,JSON.stringify(responses));
  }
  const responses=batches.flatMap(b=>b.responses);
  const result={at:new Date().toISOString(),accounts:batches.length,requests:responses.length,failures:responses.filter(r=>r.status!==200).length,batches};
  fs.writeFileSync('/tmp/monstro-bootstrap-stress.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({accounts:result.accounts,requests:result.requests,failures:result.failures}));
  process.exitCode=result.failures?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
