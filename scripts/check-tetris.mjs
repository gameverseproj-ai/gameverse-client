import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`
export {TetrisEngine,SHAPES,PIECES} from './src/app/features/games/tetris/tetris-engine';
export {TetrisMockServer,TETRIS_STORAGE_KEY} from './src/app/core/api/mock/tetris-mock-server';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {TetrisEngine,SHAPES,PIECES,TetrisMockServer,TETRIS_STORAGE_KEY}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
let server=new TetrisMockServer(storage);const bootstrap=server.getBootstrap(),rules=bootstrap.settings.rules;
assert.equal(rules.gravityMs,1000);assert.equal(bootstrap.progress.state.tetrisPoints,0);
assert.ok(memory.has(TETRIS_STORAGE_KEY),'Per-user difficulty configuration is persisted');
const make=()=>{const e=new TetrisEngine(rules,42);e.start();return e;};
const e=make(),same=make();assert.deepEqual(e.queue,same.queue,'Seeded bag is reproducible');
const firstBag=[e.current.type,...e.queue.slice(0,6)];assert.equal(new Set(firstBag).size,7,'Every seven-bag has all classic shapes');
function advance(e,ms){while(ms>0){const dt=Math.min(10,ms);e.update(dt);ms-=dt;}}
const startY=e.current.y;advance(e,990);assert.equal(e.current.y,startY);advance(e,10);assert.equal(e.current.y,startY+1,'Beginner gravity is one row per second');
e.pause();const paused=JSON.stringify(e);advance(e,5000);assert.equal(JSON.stringify(e),paused);e.start();
const initial=e.current.type;e.hold();assert.equal(e.held,initial);const afterHold=e.current.type;e.hold();assert.equal(e.current.type,afterHold,'Only one hold until a piece locks');
e.hardDrop();assert.equal(e.locks,1);assert.equal(e.canHold,true);assert.equal(e.board.flat().filter(Boolean).length,4);
const blocker=make();while(blocker.move(-1)){}assert.equal(blocker.move(-1),false);assert.ok(blocker.fits(blocker.current));
for(const type of PIECES){
 const spin=make();spin.current={type,matrix:SHAPES[type].map(r=>[...r]),x:3,y:3};const before=JSON.stringify(spin.current.matrix);
 for(let i=0;i<4;i++)spin.rotate();assert.equal(JSON.stringify(spin.current.matrix),before,'Four rotations restore the shape');
 spin.rotate();spin.rotate(true);assert.equal(JSON.stringify(spin.current.matrix),before);
 const ghost=spin.ghostY();assert.ok(spin.fits({...spin.current,y:ghost}));assert.equal(spin.fits({...spin.current,y:ghost+1}),false,'Ghost touches the stack/floor');
}
// Four-line clear, compaction, level-up and matching server score.
const clear=make();clear.lines=6;clear.clears=[3,3];clear.score=1000;
for(let y=16;y<20;y++)clear.board[y]=Array.from({length:10},(_,x)=>x===4?null:'J');
clear.current={type:'I',matrix:[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],x:3,y:16};
clear.hardDrop();assert.equal(clear.lines,10);assert.equal(clear.level,2);assert.equal(clear.score,1800);assert.equal(clear.board.flat().filter(Boolean).length,0);assert.ok(clear.interval<rules.gravityMs);assert.equal(clear.lastClear.length,4);
const lock=make();lock.current.y=lock.ghostY();advance(lock,480);assert.equal(lock.locks,0);advance(lock,20);assert.equal(lock.locks,1,'Grounded piece locks after configured delay');
const loss=make();loss.board=loss.board.map(row=>row.map(()=> 'O'));loss.hold();assert.equal(loss.gameOver,true);loss.start();assert.equal(loss.paused,true,'Top-out cannot be resumed');
for(const fps of [30,60,120]){const timed=make();for(let i=0;i<fps*2;i++)timed.update(1000/fps);assert.ok(Math.abs(timed.elapsedMs-2000)<1e-6);assert.ok(timed.current.y>=1&&timed.current.y<=2);}
const run=server.startRun('start-test-01');assert.deepEqual(server.startRun('start-test-01'),run);
const result={runId:run.id,clears:[3,3,4],softDropCells:0,hardDropCells:0,elapsedMs:10000};
const receipt=server.finishRun(result);assert.equal(receipt.score,1800);assert.equal(receipt.earned,150);assert.equal(receipt.level,2);assert.equal(receipt.lines,10);
assert.deepEqual(server.finishRun(result),receipt,'Retry cannot duplicate points');
server=new TetrisMockServer(storage);assert.equal(server.getBootstrap().progress.state.tetrisPoints,150);assert.equal(server.getBootstrap().progress.state.currentLevel,2);
const next=server.startRun('start-test-02');assert.equal(next.rules.startingLevel,2);assert.ok(new TetrisEngine(next.rules,1).interval<rules.gravityMs);
assert.throws(()=>server.finishRun({...result,runId:next.id,clears:[5]}));
server.saveSound(false);assert.equal(new TetrisMockServer(storage).getBootstrap().settings.soundEnabled,false);
server.startRun('start-test-03');assert.throws(()=>server.finishRun({...result,runId:next.id}),'Abandoned run cannot be submitted');
const saved=JSON.parse(memory.get(TETRIS_STORAGE_KEY));
saved.rules.gravityMs=1400;saved.rules.linesPerLevel=4;saved.rules.pointsPerLine=25;
storage.setItem(TETRIS_STORAGE_KEY,JSON.stringify(saved));
const custom=server.startRun('custom-rules-run');
assert.equal(custom.rules.gravityMs,1400);assert.equal(custom.rules.linesPerLevel,4);
const customResult=server.finishRun({runId:custom.id,clears:[4],softDropCells:0,hardDropCells:0,elapsedMs:1000});
assert.equal(customResult.earned,150,'Reward and progression use the run configuration');
assert.equal(customResult.level,3);
const failed=new TetrisMockServer({getItem:()=>null,setItem:()=>{throw new Error('quota');}});assert.throws(()=>failed.startRun('start-failure'));
console.log('PASS: 7-bag, rotations, walls, ghost, hold, gravity, lock delay, four-line clear, compaction, acceleration, top-out, pause, persisted API rules/progress, authoritative score calculation, idempotent settlement and storage errors.');
