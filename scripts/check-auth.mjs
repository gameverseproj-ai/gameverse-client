import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.crypto ??= webcrypto;
Error.stackTraceLimit = 0;
import {build} from 'esbuild';
const result=await build({stdin:{contents:`import '@angular/compiler';export * from './src/app/core/api/mock/mock-auth.api';export * from './src/app/core/models/auth.model';export {createEnvironmentInjector,runInInjectionContext,PLATFORM_ID} from '@angular/core';export {firstValueFrom} from 'rxjs';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {MockAuthApi,clientMode,authEndpoint,createEnvironmentInjector,runInInjectionContext,PLATFORM_ID,firstValueFrom}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const previous=globalThis.localStorage;
const data=new Map(['snake','temple','tetris','power'].map(game=>[`gameverse.${game}.player-001.v1`,JSON.stringify({score:123,stage:4})]));
const saves=new Map(data);
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const injector=createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'browser'}]);
const api=()=>runInInjectionContext(injector,()=>new MockAuthApi());
try {
 const auth=api(); assert.equal(await firstValueFrom(auth.me()),null);
 const guest=await firstValueFrom(auth.anonymous('ru'));
 assert.equal(guest.anonymous,true); assert.equal(guest.playerId,'player-001');
 assert.equal(guest.language,'ru'); assert.deepEqual(guest.identities,[]);
 assert.deepEqual(await firstValueFrom(api().anonymous('en')),guest,'Reload does not create a new guest');
 const google={kind:'google',body:{idToken:'mock:success'}};
 assert.equal(authEndpoint(google,true),'/api/auth/attach/google');
 const member=await firstValueFrom(auth.attach(google));
 assert.equal(member.userId,guest.userId);assert.equal(member.playerId,guest.playerId);
 assert.equal(member.anonymous,false);assert.notEqual(member.token,guest.token);
 assert.deepEqual(member.identities,['GOOGLE']);assert.deepEqual(member.profile,guest.profile);
 assert.deepEqual(await firstValueFrom(api().me()),member,'Account restored across reload');
 const again=await firstValueFrom(auth.attach(google));assert.deepEqual(again.identities,['GOOGLE']);
 const beforeConflict=await firstValueFrom(auth.me());
 await assert.rejects(firstValueFrom(auth.attach({kind:'google',body:{idToken:'mock:linked'}})),e=>e.code==='IDENTITY_ALREADY_LINKED');
 assert.deepEqual(await firstValueFrom(auth.me()),beforeConflict,'Conflict cannot switch or overwrite account');
 await assert.rejects(firstValueFrom(auth.attach({kind:'google',body:{idToken:'real-token-not-accepted'}})),e=>e.code==='UNAUTHORIZED');
 for(const credential of [{kind:'telegram',body:{initData:'mock:success'}},{kind:'telegram/web',body:{id:1,hash:'mock:success'}}]) {
  assert.equal(authEndpoint(credential,true),`/api/auth/attach/${credential.kind}`);
  assert.equal(authEndpoint(credential,false),`/api/auth/${credential.kind}`);
  const linked=await firstValueFrom(auth.attach(credential));
  assert.equal(linked.playerId,guest.playerId);assert.deepEqual(linked.identities,['GOOGLE','TELEGRAM']);
 }
 for(const [key,value]of saves)assert.equal(data.get(key),value,'Game saves remain byte-for-byte intact');
 const stored=data.get('gameverse.auth.mock.v1');
 globalThis.localStorage.setItem=()=>{throw Error('quota');};
 await assert.rejects(firstValueFrom(auth.attach(google)));
 assert.equal(data.get('gameverse.auth.mock.v1'),stored,'Failed save does not publish a new session');
 data.set('gameverse.auth.mock.v1','broken');
 await assert.rejects(firstValueFrom(api().anonymous('en')));
 assert.equal(data.get('gameverse.auth.mock.v1'),'broken','Corrupt session is not silently replaced');
 assert.equal(clientMode(true,390,true),'telegram');assert.equal(clientMode(true,1440,false),'telegram');
 assert.equal(clientMode(false,390,true),'phone');assert.equal(clientMode(false,820,true),'tablet');assert.equal(clientMode(false,1080,false),'desktop');
 console.log('PASS: anonymous restore, same-player conversion, token rotation, provider routes, idempotency, conflicts, credential rejection, unchanged game saves, storage failures and four client modes.');
} finally {globalThis.localStorage=previous;injector.destroy();}
