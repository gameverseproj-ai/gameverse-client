import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`import '@angular/compiler';export {MockPowerApi,POWER_STRIKE_RULES} from './src/app/core/api/mock/mock-power.api';export {createEnvironmentInjector,runInInjectionContext,PLATFORM_ID} from '@angular/core';export {firstValueFrom} from 'rxjs';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {MockPowerApi,POWER_STRIKE_RULES,createEnvironmentInjector,runInInjectionContext,PLATFORM_ID,firstValueFrom}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const injector=createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'server'}]);
const api=runInInjectionContext(injector,()=>new MockPowerApi());
const configuredInjector=createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'server'},{provide:POWER_STRIKE_RULES,useValue:{minimumPower:.6,maximumPower:.6,headMultiplier:1,bodyMultiplier:.4}}]);
try {
 const configured=runInInjectionContext(configuredInjector,()=>new MockPowerApi());
 const response=await firstValueFrom(configured.act({type:'hit',mode:'machine',pull:1,aim:0,aimY:-.6}));
 assert.equal(response.settings.rules.maximumPower,.6);
 assert.equal(response.progress.state.lastStrike.damage,30);
 assert.equal(response.progress.state.lastStrike.points,300);
 console.log('PASS: injected server configuration controls the actual strike and response.');
} finally { configuredInjector.destroy(); }
const clock=Date.now;let now=new Date(2026,8,13,12).getTime();Date.now=()=>now;
try{
 const player=await firstValueFrom(api.getBootstrap()),preview=await firstValueFrom(api.getBootstrap(true));
 assert.equal(player.settings.rules.minimumPower,.8);assert.equal(player.settings.rules.maximumPower,1);assert.equal(player.settings.rules.headMultiplier,1);assert.ok(player.settings.rules.bodyMultiplier<1);
 assert.equal(player.settings.rules.exercises.length,3);assert.equal(preview.settings.rules.exercises.length,60);
 const i=player.settings.rules.exercises[0].index;
 now+=1000;await firstValueFrom(api.act({type:'rep',exercise:i}));
 assert.equal((await firstValueFrom(api.getBootstrap(true))).progress.state.reps[i],0);
 now+=9999;assert.equal((await firstValueFrom(api.getBootstrap())).progress.state.reps[i],1);
 now++;assert.equal((await firstValueFrom(api.getBootstrap())).progress.state.reps[i],0);
 const notAssigned=preview.settings.rules.exercises.find(e=>!player.progress.state.assigned.includes(e.index)).index;
 await assert.rejects(firstValueFrom(api.act({type:'rep',exercise:notAssigned})));
 now+=1000;await firstValueFrom(api.act({type:'rep',exercise:notAssigned},true));
 assert.equal((await firstValueFrom(api.getBootstrap())).progress.state.reps[notAssigned],0);
 await firstValueFrom(api.resetPreview());assert.equal((await firstValueFrom(api.getBootstrap(true))).progress.state.reps[notAssigned],0);
 assert.deepEqual((await firstValueFrom(api.getBootstrap())).progress.state.assigned,player.progress.state.assigned);
 now+=86400000;assert.notDeepEqual((await firstValueFrom(api.getBootstrap())).progress.state.assigned,player.progress.state.assigned);
 console.log('PASS: API 3/60 catalogs, preview isolation/reset, exact 10s timeout, unauthorized exercise rejection, stable daily selection and next-day rotation.');
}finally{Date.now=clock;injector.destroy();}

// Browser persistence accepts adaptive HP above the old stage-only ceiling.
const previousStorage = globalThis.localStorage;
const storage = new Map();
globalThis.localStorage = {getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value)};
const browserInjector = createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'browser'}]);
try {
 const browserApi = runInInjectionContext(browserInjector,()=>new MockPowerApi());
 const initial = (await firstValueFrom(browserApi.getBootstrap())).progress.state;
 const old = {...initial,stage:2,strength:500,hp:229}; delete old.maxHp;
 const key = 'gameverse.power.player-001.v1';
 storage.set(key,JSON.stringify(old));
 const migrated = (await firstValueFrom(browserApi.getBootstrap())).progress.state;
 assert.equal(migrated.maxHp,5375); assert.equal(migrated.hp,Math.round(229 / Math.round(180 * 2 ** 1.35) * 5375));
 const saved = (await firstValueFrom(browserApi.act({type:'hit',mode:'machine',pull:1,aim:0}))).progress.state;
 assert.equal(saved.hp,migrated.hp); assert.equal(saved.maxHp,migrated.maxHp);
 assert.deepEqual((await firstValueFrom(browserApi.getBootstrap())).progress.state,saved);
 for (const patch of [{maxHp:null},{maxHp:-1},{maxHp:1.5},{maxHp:100,hp:101}]) {
  storage.set(key,JSON.stringify({...saved,...patch}));
  await assert.rejects(firstValueFrom(browserApi.getBootstrap()));
 }
 console.log('PASS: browser-save migration, adaptive HP persistence/reload, and corrupt health rejection.');
} finally { globalThis.localStorage = previousStorage; browserInjector.destroy(); }
