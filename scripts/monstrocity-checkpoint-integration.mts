/** Real HTTP integration against an isolated local backend with capability enabled.
 * Bundle with esbuild (platform=node, format=esm, packages=external), run from output/.
 * Creates an anonymous test account. Never target production.
 */
import '@angular/compiler';
import { ClientMonstrocityApi } from '../src/app/features/games/monstrocity/monstrocity-client.api';
import { mapFor, blocked, distance } from '../src/app/features/games/monstrocity/monstrocity.map';
import { MonstrocityError } from '../src/app/features/games/monstrocity/monstrocity.api';
const base = 'http://127.0.0.1:8080/api';
let token = '';
const calls: Record<string, number> = {};
let lastBatch: any;
let lastKey = '';
let loseAck = false;
let lostBatch: {key:string; body:string}|undefined;
let recoveredAck = false;
async function request(path: string, body?: unknown, key?: string) {
    calls[path.split('/').pop()!] = (calls[path.split('/').pop()!] ?? 0) + 1;
    const response = await fetch(base + path, {method:body === undefined ? 'GET':'POST',
        headers:{'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`} : {}), ...(key?{'Idempotency-Key':key}:{})},
        body:body === undefined ? undefined : JSON.stringify(body)});
    const raw = await response.text();
    if (!raw) throw new Error(`Empty HTTP ${response.status} from ${path}`);
    const result = JSON.parse(raw);
    if (!response.ok) {
        console.error('HTTP failure', response.status, result.code, result.message);
        throw new MonstrocityError(result.code, result.snapshot);
    }
    return result;
}
token = (await request('/auth/anonymous', {})).token;
const remote: any = {
    local:false,
    bootstrap:()=>request('/monstrocity/bootstrap'),
    create:(body:any,key:string)=>request('/monstrocity/runs',body,key),
    resume:(id:string,takeover:boolean,key:string)=>request(`/monstrocity/runs/${id}/resume`,{takeover},key),
    sync:(id:string,body:any)=>request(`/monstrocity/runs/${id}/sync`,body),
    command:(id:string,name:string,body:any,key:string)=>request(`/monstrocity/runs/${id}/${name}`,body,key),
    checkpoint:async(id:string,body:any,key:string)=>{
        lastBatch=body;lastKey=key;
        const ack=await request(`/monstrocity/runs/${id}/checkpoints`,body,key).catch(error=>{console.error("Checkpoint delivery:",error);throw error;});
        console.log('Checkpoint accepted', ack.sequence, body.events.length, 'events', JSON.stringify(body).length, 'bytes');
        if(loseAck) { loseAck=false; lostBatch={key,body:JSON.stringify(body)}; console.log('Injecting lost ACK after real commit'); throw new Error('Injected lost ACK'); }
        if(lostBatch && key===lostBatch.key) { if(JSON.stringify(body)!==lostBatch.body) throw new Error('Retry changed body'); recoveredAck=true; }
        return ack;
    },
    leaveCheckpoint:(id:string,body:any,key:string)=>{void request(`/monstrocity/runs/${id}/checkpoints`,body,key).catch(e=>console.error('Leave delivery',e));},
};
const api=new ClientMonstrocityApi(remote);
const boot=await api.bootstrap();
if(!api.clientDriven) throw new Error('Backend capability disabled');
let state=await api.create({character:'male',configVersion:boot.config.version},crypto.randomUUID());
const id=state.run!.id;
let seq=0;
async function command(name:any,extra:any={}) {
    state=await api.command(id,name,{sessionId:state.session!.id,expectedRevision:state.run!.revision,...extra},crypto.randomUUID());
}
if(process.argv.includes('--lifecycle')) {
    await new Promise(r=>setTimeout(r,100));
    state=await api.sync(id,{sessionId:state.session!.id,frames:[]});
    api.leave(id,{sessionId:state.session!.id,expectedRevision:state.run!.revision},crypto.randomUUID());
    await command('disconnect');
    await command('disconnect');
    state=await api.resume(id,false,crypto.randomUUID());
    await new Promise(r=>setTimeout(r,50));
    state=await api.sync(id,{sessionId:state.session!.id,frames:[]});
    console.log('Duplicate lifecycle close passed; suspending for 80 seconds beyond server lease');
    await new Promise(r=>setTimeout(r,80000));
    state=await api.resume(id,false,crypto.randomUUID());
    if(state.run!.status!=='active')throw new Error('Shelter resume should survive');
    await command('disconnect');
    console.log('LIFECYCLE PASS: pagehide+visibilitychange+destroy, one-click resume after expired lease');
    process.exit(0);
}
if(process.argv.includes('--thorough')) {
    const map=mapFor(state.run!.mapVersion);
    let throws=0,wins=new Set<string>(),maxGap=0,lastTick=performance.now();
    async function tick(x=0,z=0) {
        await new Promise(r=>setTimeout(r,50));
        const now=performance.now();maxGap=Math.max(maxGap,now-lastTick);lastTick=now;
        state=await api.sync(id,{sessionId:state.session!.id,frames:x||z?[{sequence:++seq,moveX:x,moveZ:z}]:[]});
        if(state.run!.status!=='active') throw new Error('Unexpected death: '+state.run!.deathReason);
        const b=state.run!.combat;
        if(b?.phase==='won') wins.add(b.encounterId);
        if(b?.phase==='approaching' && b.elapsedActiveMs>=b.nextThrowActiveMs) {
            const m=boot.config.monsters.find(m=>m.id===b.monsterId)!;
            const t=b.elapsedActiveMs/1000+boot.config.stoneFlightSeconds;
            await command('throw',{encounterId:b.encounterId,aimX:.5,aimY:.45+.2*Math.min(1,t/m.approachSeconds)});throws++;
        }
    }
    function route(target:{x:number;z:number}) {
        const queue=[{p:state.run!.position,parent:-1}],seen=new Set<string>();let end=-1;
        for(let i=0;i<queue.length&&i<100000;i++) {
            const node=queue[i]; if(distance(node.p,target)<1.2){end=i;break;}
            for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]) {
                const p={x:node.p.x+dx,z:node.p.z+dz},key=p.x.toFixed(2)+','+p.z.toFixed(2);
                if(seen.has(key)||blocked(p,map))continue;seen.add(key);queue.push({p,parent:i});
            }
        }
        if(end<0)throw new Error('No route to supplies');
        const path=[];while(end>0){path.push(queue[end].p);end=queue[end].parent;}return path.reverse();
    }
    const target=[...map.containers].sort((a,b)=>distance(a,state.run!.position)-distance(b,state.run!.position))[0];
    for(const p of route(target)) {
        let attempts=0;
        while(distance(p,state.run!.position)>.2) {
            if(++attempts>600)throw new Error('Blocked walking to supplies');
            const dx=p.x-state.run!.position.x,dz=p.z-state.run!.position.z,len=Math.max(.001,Math.hypot(dx,dz));
            await tick(dx/len,dz/len);
        }
    }
    await command('search',{targetId:target.id});
    while(state.run!.search)await tick();
    const food=state.profile.inventory.find(i=>i.itemId==='food')!.collected;
    if(food<1)throw new Error('No searched food');
    await command('pause',{reason:'inventory'});
    const pausedAt=state.run!.activeElapsedMs;
    for(let i=0;i<20;i++)await tick();
    if(state.run!.activeElapsedMs!==pausedAt)throw new Error('Pause did not freeze simulation');
    await command('consume',{itemId:'food'});
    if(state.profile.inventory.find(i=>i.itemId==='food')!.collected!==food-1)throw new Error('Consume wrong count');
    await command('unpause');
    for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        for(let i=0;i<80 && state.run!.shelterId;i++)await tick(x,z);
        if(!state.run!.shelterId)break;
    }
    if(state.run!.shelterId)throw new Error('Could not leave shelter');
    for(let i=0;i<1200&&!wins.size;i++)await tick();
    if(!wins.size)throw new Error('No combat victory');
    loseAck=true;
    const until=performance.now()+24000;
    while(performance.now()<until)await tick();
    if(!recoveredAck)throw new Error('Lost ACK not recovered');
    await command('disconnect');
    const before=state.run!.activeElapsedMs;
    state=await api.resume(id,false,crypto.randomUUID());seq=state.session!.lastAcceptedInputSequence;
    if(state.run!.activeElapsedMs<before-1)throw new Error('Lost confirmed progress');
    await command('disconnect');
    console.log('THOROUGH PASS',JSON.stringify({throws,wins:wins.size,searched:target.id,foodConsumed:1,recoveredAck,maxGapMs:maxGap,elapsed:before,syncRequests:calls['sync']??0}));
    process.exit(0);
}
const target=state.run!.nearby.find(t=>t.kind==='container');
if(target) await command('search',{targetId:target.id});
const start=performance.now();
let paused=false, unpaused=false;
while(performance.now()-start<61000) {
    await new Promise(r=>setTimeout(r,50));
    const elapsed=performance.now()-start;
    // Short movement after searching, still within the start shelter; exercises real float timing.
    const frames=elapsed>5000 && elapsed<5500 ? [{sequence:++seq,moveX:.25,moveZ:0}]:[];
    state=await api.sync(id,{sessionId:state.session!.id,frames});
    if(elapsed>8000&&!paused){await command('pause',{reason:'inventory'});paused=true;}
    if(elapsed>8500&&!unpaused){await command('unpause');unpaused=true;}
}
const background=calls['checkpoints'];
if(background!==4) throw new Error(`Expected four background saves, got ${background}`);
const duplicate=await request(`/monstrocity/runs/${id}/checkpoints`,lastBatch,lastKey);
if(duplicate.sequence!==lastBatch.sequence) throw new Error('Idempotency ACK mismatch');
await command('disconnect');
state=await api.resume(id,false,crypto.randomUUID());
if(state.run!.activeElapsedMs<50000) throw new Error('Progress lost after resume');
console.log(JSON.stringify({backgroundCheckpoints:background,syncRequests:calls['sync']??0,activeElapsedMs:state.run!.activeElapsedMs,
    collected:state.profile.inventory, resumed:!!state.session, status:state.run!.status},null,2));
await command('disconnect');
