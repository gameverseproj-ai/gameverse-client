import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`import '@angular/compiler';export {MockPowerApi} from './src/app/core/api/mock/mock-power.api';export {createEnvironmentInjector,runInInjectionContext,PLATFORM_ID} from '@angular/core';export {firstValueFrom} from 'rxjs';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {MockPowerApi,createEnvironmentInjector,runInInjectionContext,PLATFORM_ID,firstValueFrom}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const injector=createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'server'}]);
const api=runInInjectionContext(injector,()=>new MockPowerApi());
const clock=Date.now;let now=new Date(2026,8,13,12).getTime();Date.now=()=>now;
try{
 const player=await firstValueFrom(api.getBootstrap()),preview=await firstValueFrom(api.getBootstrap(true));
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
