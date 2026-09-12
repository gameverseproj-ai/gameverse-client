import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled=await build({stdin:{contents:`
export {slide,canMove,spawnTile} from './src/app/features/games/temple/temple-engine';
export {TempleMockServer,TEMPLE_STORAGE_KEY} from './src/app/core/api/mock/temple-mock-server';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {slide,canMove,spawnTile,TempleMockServer,TEMPLE_STORAGE_KEY}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const row=a=>[...a,...Array(12).fill(0)];
assert.deepEqual(slide(row([2,2,2,2]),4,'left').board.slice(0,4),[4,4,0,0]);
assert.equal(slide(row([2,2,2,2]),4,'left').score,8);
assert.deepEqual(slide(row([2,2,4,0]),4,'left').board.slice(0,4),[4,4,0,0],'A merged tile cannot merge twice');
assert.deepEqual(slide(row([2,0,2,4]),4,'right').board.slice(0,4),[0,0,4,4]);
const mergeMotion=slide(row([2,2,2,2]),4,'left');
assert.deepEqual(mergeMotion.motions,[{from:0,to:0},{from:1,to:0},{from:2,to:1},{from:3,to:1}],'Both merging source tiles travel to their shared destination');
assert.deepEqual(mergeMotion.merges,[0,1]);
for(const direction of ['left','right','up','down']){
 const board=[2,0,2,4,4,4,0,0,0,8,8,0,2,2,4,4],result=slide(board,4,direction);
 assert.equal(new Set(result.motions.map(m=>m.from)).size,board.filter(Boolean).length,'Every tile has one animation origin');
 for(const destination of new Set(result.motions.map(m=>m.to))){
  assert.equal(result.motions.filter(m=>m.to===destination).reduce((sum,m)=>sum+board[m.from],0),result.board[destination],'Animation destinations match authoritative board');
 }
}
const vertical=[2,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0];
assert.deepEqual(slide(vertical,4,'up').board.filter((_,i)=>i%4===0),[4,8,0,0]);
assert.deepEqual(slide(vertical,4,'down').board.filter((_,i)=>i%4===0),[0,0,4,8]);
const blocked=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];assert.equal(canMove(blocked,4),false);assert.equal(canMove(row([2,4,0,0]),4),true);
const empty=Array(16).fill(0);spawnTile(empty,1,()=>.5);assert.equal(empty.filter(Boolean)[0],4);spawnTile(empty,0,()=>.5);assert.equal(empty.filter(Boolean).length,2);
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
let server=new TempleMockServer(storage,()=>.5);
const initial=server.getBootstrap();assert.equal(initial.progress.state.templePoints,0);assert.equal(initial.settings.rules.levels[0].targetTile,128);
assert.ok(memory.has(TEMPLE_STORAGE_KEY),'User configuration is stored by the server');
let started=server.startRun('test-start-0001');assert.deepEqual(server.startRun('test-start-0001'),started);assert.equal(started.progress.state.run.board.filter(Boolean).length,2);
const move={requestId:'move-00001',runId:'test-start-0001',revision:0,direction:'left'};
const moved=server.move(move);assert.deepEqual(server.move(move),moved,'Move retries never spawn twice');
assert.throws(()=>server.move({...move,direction:'right'}));
server=new TempleMockServer(storage);assert.deepEqual(server.getBootstrap(),moved,'Reload resumes exact saved board');
assert.throws(()=>server.move({...move,requestId:'stale-0001'}),'Old revision cannot overwrite current board');
// Set an authoritative database fixture one merge before a victory.
let save=JSON.parse(memory.get(TEMPLE_STORAGE_KEY));save.run.board=row([64,64,0,0]);save.lastMove=null;storage.setItem(TEMPLE_STORAGE_KEY,JSON.stringify(save));
const winRequest={requestId:'win-000001',runId:save.run.id,revision:save.run.revision,direction:'left'};
const won=server.move(winRequest);assert.equal(won.progress.state.run.status,'won');assert.equal(won.progress.state.templePoints,100);assert.equal(won.progress.state.currentLevel,2);assert.equal(won.progress.state.wins,1);
assert.deepEqual(server.move(winRequest),won,'Victory retries do not duplicate points');
server=new TempleMockServer(storage);assert.equal(server.getBootstrap().progress.state.templePoints,100);
started=server.startRun('test-start-0002');assert.equal(started.progress.state.run.level.targetTile,256);
assert.ok(started.progress.state.run.level.fourChance>initial.settings.rules.levels[0].fourChance);
save=JSON.parse(memory.get(TEMPLE_STORAGE_KEY));save.run.board=blocked;save.lastMove=null;storage.setItem(TEMPLE_STORAGE_KEY,JSON.stringify(save));
const lost=server.move({requestId:'loss-00001',runId:save.run.id,revision:save.run.revision,direction:'left'});
assert.equal(lost.progress.state.run.status,'lost');assert.equal(lost.progress.state.templePoints,100,'Loss awards no points');assert.equal(lost.progress.state.currentLevel,2);
// Server-owned custom configuration changes the next run and reward.
save=JSON.parse(memory.get(TEMPLE_STORAGE_KEY));Object.assign(save.levels[1],{gridSize:3,initialTiles:3,targetTile:32,fourChance:0,winPoints:777});storage.setItem(TEMPLE_STORAGE_KEY,JSON.stringify(save));
started=server.startRun('custom-start-01');assert.equal(started.progress.state.run.board.length,9);assert.equal(started.progress.state.run.board.filter(Boolean).length,3);assert.equal(started.progress.state.run.level.winPoints,777);
save=JSON.parse(memory.get(TEMPLE_STORAGE_KEY));save.run.board=[16,16,0,0,0,0,0,0,0];storage.setItem(TEMPLE_STORAGE_KEY,JSON.stringify(save));
const customWin=server.move({requestId:'custom-win-01',runId:save.run.id,revision:0,direction:'left'});assert.equal(customWin.progress.state.templePoints,877);
const broken=new TempleMockServer({getItem:()=>null,setItem:()=>{throw new Error('Quota');}});assert.throws(()=>broken.startRun('storage-fail'));
console.log('PASS: four directions, one merge per tile, scores, spawns, dead boards, server configuration, saved moves, stale writes, idempotent wins, points, progression, custom rules and storage failures.');
