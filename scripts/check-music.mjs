import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result = await build({stdin:{contents:`import '@angular/compiler';
export {MockPlayerApi} from './src/app/core/api/mock/mock-player.api';
export {createEnvironmentInjector,runInInjectionContext,PLATFORM_ID} from '@angular/core';
export {firstValueFrom} from 'rxjs';
export * from './src/app/core/audio/music-score';
export * from './src/app/core/models/music.model';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {MockPlayerApi,createEnvironmentInjector,runInInjectionContext,PLATFORM_ID,firstValueFrom,musicStep,DEFAULT_MUSIC} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const originalStorage = globalThis.localStorage, storage = new Map();
globalThis.localStorage = {getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const injector = createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'browser'}]);
try {
 const api = runInInjectionContext(injector,()=>new MockPlayerApi());
 assert.deepEqual(await firstValueFrom(api.getMusicPreferences()),DEFAULT_MUSIC);
 for (const genre of ['rock','pop','funk']) {
  const selected = {enabled:true,genre,volume:.4};
  const result = await firstValueFrom(api.saveMusicPreferences(selected));
  selected.volume = .99; result.volume = .8;
  const reopened = runInInjectionContext(injector,()=>new MockPlayerApi());
  assert.deepEqual(await firstValueFrom(reopened.getMusicPreferences()),{enabled:true,genre,volume:.4});
 }
 await firstValueFrom(api.saveMusicPreferences({enabled:false,genre:'funk',volume:0}));
 assert.deepEqual(await firstValueFrom(api.getMusicPreferences()),{enabled:false,genre:'funk',volume:0});
 const before = new Map(storage);
 for (const invalid of [{enabled:true,genre:'jazz',volume:.4},{enabled:'yes',genre:'pop',volume:.4},{enabled:true,genre:'rock',volume:NaN},{enabled:true,genre:'rock',volume:-1},{enabled:true,genre:'rock',volume:2}]) {
  await assert.rejects(firstValueFrom(api.saveMusicPreferences(invalid)));
  assert.deepEqual(storage,before);
 }
 globalThis.localStorage.setItem = ()=>{throw new Error('Storage unavailable');};
 await assert.rejects(firstValueFrom(api.saveMusicPreferences(DEFAULT_MUSIC)));
 assert.deepEqual(storage,before);
 console.log('PASS: silent default, all three genres, persisted reload, off/volume retention, defensive copies, invalid preferences and storage failures.');
} finally { globalThis.localStorage = originalStorage; injector.destroy(); }
const arrangements = [];
for (const genre of ['rock','pop','funk']) {
 const score = Array.from({length:128},(_,step)=>musicStep(genre,step));
 const notes = score.flat();
 assert.ok(notes.some(n=>n.instrument==='bass'));
 assert.ok(notes.some(n=>n.instrument==='kick'));
 assert.ok(notes.some(n=>n.instrument==='snare'));
 assert.ok(notes.some(n=>['keys','guitar'].includes(n.instrument)));
 for (const note of notes) {
  assert.ok(Number.isFinite(note.midi) && note.midi>=0 && note.midi<=127);
  assert.ok(note.duration>0 && note.duration<=1);
  assert.ok(note.velocity>0 && note.velocity<=1);
 }
 assert.deepEqual(musicStep(genre,128),musicStep(genre,0),'Clean eight-bar loop');
 arrangements.push(JSON.stringify(score));
}
assert.equal(new Set(arrangements).size,3);
console.log('PASS: three distinct eight-bar arrangements, melodic/rhythm instrumentation, bounded note values and loop continuity.');

// Exercise audio lifecycle without requiring a speaker or a browser autoplay grant.
const audioBuild = await build({entryPoints:['src/app/core/audio/music-player.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {MusicPlayer} = await import(`data:text/javascript;base64,${Buffer.from(audioBuild.outputFiles[0].text).toString('base64')}`);
const original = {AudioContext:globalThis.AudioContext, AudioBufferSourceNode:globalThis.AudioBufferSourceNode, setInterval:globalThis.setInterval, clearInterval:globalThis.clearInterval};
const timers = new Set(), sources = [];
let contexts = 0;
class Param {value=0;setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node {gain=new Param();frequency=new Param();connect(){}disconnect(){}}
class Source extends Node {stops=[];start(at){this.started=at;}stop(at){this.stops.push(at);}}
class BufferSource extends Source {}
class Context {
 constructor(){contexts++;}state='suspended';currentTime=0;sampleRate=100;destination={};
 async resume(){this.state='running';}async close(){this.state='closed';}
 createGain(){return new Node();}createBiquadFilter(){return new Node();}
 createOscillator(){const source=new Source();sources.push(source);return source;}
 createBufferSource(){const source=new BufferSource();sources.push(source);return source;}
 createBuffer(_,length){return {getChannelData:()=>new Float32Array(length)};}
}
globalThis.AudioContext=Context;globalThis.AudioBufferSourceNode=BufferSource;
globalThis.setInterval=callback=>{timers.add(callback);return callback;};globalThis.clearInterval=callback=>timers.delete(callback);
try {
 const player = new MusicPlayer();
 player.play('rock',.35); assert.equal(timers.size,0,'No audio before user activation');
 assert.equal(await player.unlock(),true);
 player.play('rock',.35); assert.equal(timers.size,1);
 const count = sources.length;
 player.play('rock',.6); assert.equal(sources.length,count,'Volume/route updates do not restart the track');
 await player.unlock(); assert.equal(contexts,1,'Only one context per player');
 const oldSources=[...sources];
 player.play('funk',.35); assert.equal(timers.size,1,'Genre switches replace the scheduler');
 assert.ok(oldSources.every(source=>source.stops.length===2),'Old notes are stopped during the fade');
 player.stop(); assert.equal(timers.size,0,'Off removes scheduling');
 player.play('pop',.35); assert.equal(timers.size,1);
 player.destroy(); assert.equal(timers.size,0,'Destroy leaves no audio scheduler');
 console.log('PASS: gesture gating, single context/scheduler, uninterrupted volume updates, genre teardown, stop and destroy.');
} finally {Object.assign(globalThis,original);}
