import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled=await build({stdin:{contents:`
export { SnakeEngine } from './src/app/features/games/engines/snake/snake-engine';
export { SnakeMockServer, SNAKE_STORAGE_KEY, FIRST_USER_SEGMENT } from './src/app/core/api/mock/snake-mock-server';
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {SnakeEngine,SnakeMockServer,SNAKE_STORAGE_KEY,FIRST_USER_SEGMENT}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
let server=new SnakeMockServer(storage);
const bootstrap=server.getBootstrap();
assert.equal(bootstrap.progress.state.currentLevel,1);assert.equal(bootstrap.progress.state.snakePoints,0);
assert.equal(bootstrap.progress.state.segment,FIRST_USER_SEGMENT);assert.equal(bootstrap.settings.rules.lives,1);
const run=server.startRun('test-first-run');
assert.deepEqual(server.startRun('test-first-run'),run,'Uncertain start retry returns the same run');
function engine(){const e=new SnakeEngine(()=>.75);e.init({level:run.level,items:run.items});e.start();return e;}
function advance(e,ms){while(ms>0){const delta=Math.min(50,ms);e.update(delta);ms-=delta;}}
let e=engine();
assert.equal(run.level.tickMs,600);assert.deepEqual(run.level,bootstrap.settings.rules.levels[0]);
advance(e,599);assert.equal(e.state.tick,0,"Beginner gets 600 ms before the first step");advance(e,1);assert.equal(e.state.tick,1);e=engine();
assert.ok(!e.state.snake.some(p=>p.x===e.state.food.x&&p.y===e.state.food.y));
e.setDirection('LEFT');advance(e,run.level.tickMs);assert.equal(e.state.direction,'RIGHT','Cannot reverse into the neck');
e.setDirection('UP');e.setDirection('LEFT');advance(e,run.level.tickMs);assert.equal(e.state.direction,'UP');advance(e,run.level.tickMs);assert.equal(e.state.direction,'LEFT','Rapid corner inputs are buffered across ticks');
e.pause();const paused=JSON.stringify(e.state);e.update(5000);assert.equal(JSON.stringify(e.state),paused);e.start();
e=engine();while(!e.state.dead)advance(e,run.level.tickMs);assert.equal(e.state.running,false);e.start();assert.equal(e.state.running,false,'One life, no resume after death');
e=engine();e.state.snake=[{x:3,y:3},{x:3,y:4},{x:2,y:4},{x:2,y:3}];e.state.direction='UP';e.setDirection('LEFT');advance(e,run.level.tickMs);assert.equal(e.state.dead,false,'Can enter the cell the tail vacates');
e=engine();e.state.snake=[{x:3,y:3},{x:3,y:4},{x:2,y:4},{x:2,y:3},{x:2,y:2}];e.state.direction='UP';e.setDirection('LEFT');advance(e,run.level.tickMs);assert.equal(e.state.dead,true,'Body collision ends the run');
e=engine();
assert.equal(run.level.winLength,64);assert.equal(run.level.target,61);
const path=[];
for(let y=0;y<16;y++)for(let x=0;x<16;x++)path.push({x:y%2?15-x:x,y});
e.state.snake=[path[2],path[1],path[0]];
for(let i=0;i<run.level.target;i++){
 const next=path[i+3],head=e.state.snake[0];
 e.setDirection(next.x>head.x?'RIGHT':next.x<head.x?'LEFT':next.y>head.y?'DOWN':'UP');
 e.state.food.x=next.x;e.state.food.y=next.y;
 const speed=e.state.tickMs;advance(e,speed);
 assert.equal(e.state.tickMs,Math.max(run.level.minTickMs,run.level.tickMs-Math.floor((i+1)/run.level.speedUpEvery)*run.level.speedUpMs));
 assert.equal(e.state.snake.length,i+4,'Length accumulates throughout the same run');
 if(i+1<61)assert.equal(e.state.won,false,'No early food-count victory');
 if(i===20){
  const long=engine();long.state=JSON.parse(JSON.stringify(e.state));long.setDirection('UP');advance(long,long.state.tickMs);
  assert.equal(long.state.dead,true,'A long snake can collide with an earlier part of its body');
 }
 if(!e.state.won)assert.ok(!e.state.snake.some(p=>p.x===e.state.food.x&&p.y===e.state.food.y));
}
assert.equal(e.state.snake.length,64);assert.equal(e.state.tickMs,160);
const configured=new SnakeEngine(()=>.75);
configured.init({level:{...run.level,initialLength:4,tickMs:800},items:run.items});configured.start();
assert.equal(configured.state.snake.length,4);advance(configured,799);assert.equal(configured.state.tick,0);advance(configured,1);assert.equal(configured.state.tick,1,'Engine consumes supplied configuration');
assert.equal(e.state.won,true);assert.equal(e.state.collected.length,61);assert.equal(new Set(e.state.collected).size,6);
const result={runId:run.id,outcome:'won',collected:e.state.collected,elapsedMs:5000};
const receipt=server.finishRun(result);assert.equal(receipt.earned,1045);assert.equal(receipt.bonus,30);assert.equal(receipt.nextLevel,2);
assert.deepEqual(server.finishRun(result),receipt,'Settlement retry must not double-credit');
server=new SnakeMockServer(storage);assert.equal(server.getBootstrap().progress.state.snakePoints,1045);assert.equal(server.getBootstrap().progress.gamesPlayed,1);
assert.throws(()=>server.startRun('test-first-run'));
const second=server.startRun('test-second-run');assert.ok(second.level.tickMs<run.level.tickMs);assert.ok(second.level.winLength===run.level.winLength);
const loss=server.finishRun({runId:second.id,outcome:'lost',collected:['crystal'],elapsedMs:1000});assert.equal(loss.earned,20);assert.equal(loss.nextLevel,2);assert.equal(loss.balance,1065);
server.savePreferences({soundEnabled:false,musicEnabled:false});server=new SnakeMockServer(storage);assert.equal(server.getBootstrap().settings.soundEnabled,false);
const abandoned=server.startRun('abandoned-run');server.startRun('replacement-run');assert.throws(()=>server.finishRun({runId:abandoned.id,outcome:'lost',collected:[],elapsedMs:0}));
const active=server.startRun('replacement-run');assert.throws(()=>server.finishRun({runId:active.id,outcome:'won',collected:[],elapsedMs:0}));
assert.throws(()=>server.finishRun({runId:active.id,outcome:'lost',collected:['fake'],elapsedMs:1}));
assert.equal(server.getBootstrap().progress.state.snakePoints,1065);
const failed=new SnakeMockServer({getItem:()=>null,setItem:()=>{throw new Error('quota');}});assert.throws(()=>failed.startRun('write-failure'));assert.equal(failed.getBootstrap().progress.gamesPlayed,0);
// A result from a run started before this release can still settle once.
const legacyMemory=new Map(),legacyStorage={getItem:k=>legacyMemory.get(k)??null,setItem:(k,v)=>legacyMemory.set(k,v)};
const legacyServer=new SnakeMockServer(legacyStorage),legacyRun=legacyServer.startRun('legacy-start-01');
const saved=JSON.parse(legacyMemory.get(SNAKE_STORAGE_KEY));
delete saved.runs[legacyRun.id].run.level.winLength;saved.runs[legacyRun.id].run.level.target=6;
legacyStorage.setItem(SNAKE_STORAGE_KEY,JSON.stringify(saved));
const legacyResult={runId:legacyRun.id,outcome:'won',collected:legacyRun.items.map(item=>item.id),elapsedMs:5000};
const legacyReceipt=legacyServer.finishRun(legacyResult);
assert.equal(legacyReceipt.earned,130);assert.deepEqual(legacyServer.finishRun(legacyResult),legacyReceipt);
assert.equal(legacyServer.startRun('new-contract-01').level.winLength,64,'New runs always use the length-based victory');
assert.ok(memory.has(SNAKE_STORAGE_KEY));
console.log('PASS: snake movement, queued turns, food variety/growth, wall/body/tail collisions, pause, one life, level progression, server-calculated points, idempotency, persistence, settings, segment and storage errors.');
