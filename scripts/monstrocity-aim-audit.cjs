// Real HTTP regression with disposable fixtures in a verified isolated database.
const {spawnSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const bundle=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'monstro-aim-')),'aim.cjs');
require('esbuild').buildSync({entryPoints:[path.join(__dirname,'../src/app/features/games/monstrocity/monstrocity-aim.ts')],bundle:true,platform:'node',format:'cjs',outfile:bundle});
const {assistedAim}=require(bundle);
const db=process.env.MONSTROCITY_TEST_DB,base='http://127.0.0.1:8080';
if(!db || !/^monstro_codex_[a-z0-9_]+$/.test(db))throw Error('Use an isolated monstro_codex_* test database.');
function sql(q){const r=spawnSync('docker',['exec','gameverse-db','psql','-U','gameverse','-d',db,'-Atc',q],{encoding:'utf8'});if(r.status)throw Error(r.stderr);return r.stdout.trim()}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const a=await fetch(base+'/api/auth/anonymous',{method:'POST',headers:{'x-device-id':randomUUID()}}).then(r=>r.json());
 const headers={Authorization:'Bearer '+a.token,'Content-Type':'application/json'};
 async function req(path,body){const r=await fetch(base+'/api/monstrocity'+path,{headers:{...headers,'Idempotency-Key':randomUUID()},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j;}
 const b=await req('/bootstrap');let s=await req('/runs',{character:'female',configVersion:b.config.version});
 const id=s.run.id;if(!/^[0-9a-f-]{36}$/.test(id)||sql(`select count(*) from monstrocity_runs where id='${id}'`)!=='1')throw Error('Isolated database mismatch; no fixture changed');
 console.log('Verified disposable run in isolated DB',id,b.config.version);
 for(const m of b.config.monsters){
  const combat={encounterId:randomUUID(),monsterId:m.id,phase:'approaching',elapsedMs:0,hitsRemaining:m.hitsToDefeat,nextThrowMs:0,shots:[],resultHoldRemainingMs:0};
  sql(`update monstrocity_runs set state=jsonb_set(jsonb_set(state::jsonb,'{combat}','${JSON.stringify(combat)}'::jsonb),'{energy}','100')::text where id='${id}'`);
  s=await req('/runs/'+id);let throws=0;const started=Date.now();
  async function sync(){s=await req('/runs/'+id+'/sync',{sessionId:s.session.id,frames:[]})}
  while(s.run.combat && s.run.combat.phase!=='won' && Date.now()-started<15000){
   await sync();if(!s.run.combat||s.run.combat.phase==='won')break;
   if(s.run.combat.elapsedActiveMs>=s.run.combat.nextThrowActiveMs){
    const aim=assistedAim(s.run,b.config);s=await req('/runs/'+id+'/throw',{sessionId:s.session.id,expectedRevision:s.run.revision,encounterId:combat.encounterId,aimX:aim.x,aimY:aim.y});throws++;
   }
   await wait(250);
  }
  console.log(JSON.stringify({monster:m.id,throws,hitsRequired:m.hitsToDefeat,phase:s.run.combat?.phase,hitsRemaining:s.run.combat?.hitsRemaining,seconds:(Date.now()-started)/1000}));
  if(s.run.combat?.phase!=='won'||throws!==m.hitsToDefeat)throw Error('Not every assisted throw hit');
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
