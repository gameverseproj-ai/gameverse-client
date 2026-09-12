import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({stdin: {contents: `
import '@angular/compiler';
export { TETRIS_API } from './src/app/core/api/tetris.api';
export { MockTetrisApi } from './src/app/core/api/mock/mock-tetris.api';
export { TEMPLE_API } from './src/app/core/api/temple.api';
export { MockTempleApi } from './src/app/core/api/mock/mock-temple.api';
export { createEnvironmentInjector, runInInjectionContext, PLATFORM_ID, signal } from '@angular/core';
export { Subject, firstValueFrom, EMPTY } from 'rxjs';
export { SNAKE_API } from './src/app/core/api/snake.api';
export { MockSnakeApi } from './src/app/core/api/mock/mock-snake.api';
export { GAME_API } from './src/app/core/api/game.api';
export { MockGameApi } from './src/app/core/api/mock/mock-game.api';
export { GameFacade } from './src/app/core/facades/game.facade';
export { SnakeComponent } from './src/app/features/games/snake/snake.component';
export { GellyWorldComponent } from './src/app/features/world/gelly-world.component';
`, resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const { createEnvironmentInjector, runInInjectionContext, PLATFORM_ID, signal, Subject, firstValueFrom, EMPTY,
 TETRIS_API, MockTetrisApi, TEMPLE_API, MockTempleApi, SNAKE_API, MockSnakeApi, GAME_API, MockGameApi, GameFacade, GellyWorldComponent, SnakeComponent } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const injector = createEnvironmentInjector([{provide: PLATFORM_ID, useValue:'server'}, {provide:SNAKE_API,useClass:MockSnakeApi}, {provide:TEMPLE_API,useClass:MockTempleApi}, {provide:TETRIS_API,useClass:MockTetrisApi}]);
const mock = runInInjectionContext(injector, () => new MockGameApi());
const fixtures = {};
for (const id of ['snake', 'tetris', '2048', 'power']) {
 const data = await firstValueFrom(mock.getBootstrap(id));
 assert.equal(data.gameId, id); assert.equal(data.playerId,'player-001');
 assert.ok(data.progress.state && data.settings.rules);
 fixtures[id] = data;
}
assert.notDeepEqual(fixtures.snake.settings.rules, fixtures.tetris.settings.rules);
fixtures.snake.progress.bestScore = -1;
assert.equal((await firstValueFrom(mock.getBootstrap('snake'))).progress.bestScore, 0);
await assert.rejects(firstValueFrom(mock.getBootstrap('missing')));
let requests = [];
const api = {getBootstrap(id) { const stream = new Subject(); requests.push({id,stream}); return stream; }};
const context = createEnvironmentInjector([{provide:GAME_API,useValue:api}]);
const games = runInInjectionContext(context, () => new GameFacade());
function world() {
 const navigations = [];
 const component = Object.create(GellyWorldComponent.prototype);
 Object.assign(component, {games, disposed:false, navigating:false, animationFinished:false, dataReady:false,
   enteringPortal:signal({id:'tetris',route:'/games/tetris'}), entryError:signal(false),
   router:{navigate:route => {navigations.push(route); return Promise.resolve(true);}},
 });
 return {component,navigations};
}
// A fast response cannot skip the animation.
let {component,navigations} = world();
component.loadEntryData();
assert.equal(requests.length, 1);
requests.at(-1).stream.next(fixtures.tetris);
assert.equal(navigations.length, 0);
assert.equal(games.bootstrap().gameId, 'tetris');
component.animationFinished = true; component.finishEntry(); component.finishEntry();
assert.deepEqual(navigations, [['/games/tetris']]);
// A slow response keeps the player waiting after the animation.
({component,navigations} = world());
component.loadEntryData(); component.animationFinished = true; component.finishEntry();
assert.equal(navigations.length, 0);
requests.at(-1).stream.next(fixtures.tetris);
assert.equal(navigations.length, 1);
// Failure is retryable, and previous requests cannot win a retry race.
({component,navigations} = world());
component.loadEntryData(); component.animationFinished = true;
requests.at(-1).stream.error(new Error('offline'));
assert.equal(component.entryError(), true); assert.equal(navigations.length, 0);
component.loadEntryData();
assert.equal(component.entryError(), false);
requests.at(-1).stream.next(fixtures.tetris);
assert.equal(navigations.length, 1);
({component,navigations} = world());
component.loadEntryData(); const stale = requests.at(-1).stream;
component.loadEntryData(); component.animationFinished = true;
stale.next(fixtures.tetris); assert.equal(navigations.length,0); assert.equal(games.bootstrap(),null);
requests.at(-1).stream.next({...fixtures.tetris,gameId:'snake'});
assert.equal(component.entryError(),true); assert.equal(navigations.length,0);
// Leaving the world cancels the pending request and prevents navigation/data writes.
({component,navigations} = world());
component.loadEntryData(); const abandoned = requests.at(-1).stream;
Object.assign(component,{joystick:{reset(){}},scene:null,resizeObserver:null});
component.ngOnDestroy(); abandoned.next(fixtures.tetris);
assert.equal(navigations.length,0); assert.equal(games.bootstrap(),null);
api.getBootstrap = () => EMPTY;
await assert.rejects(firstValueFrom(games.loadBootstrap('tetris')), /Empty game response/);
// A lethal collision reaches monetization once and never grants another life.
const snake=Object.create(SnakeComponent.prototype), hooks=[];
let saves=0;
Object.assign(snake,{ended:false,run:{id:'unit-run',segment:'jelly-pioneers',level:{id:1}},
 engine:{state:{dead:true,won:false,collected:['tree'],elapsedMs:1000}},
 monetization:{reach:context=>hooks.push(context)},saveResult:()=>saves++});
snake.endRun();snake.endRun();
assert.equal(saves,1);assert.equal(hooks.length,1);assert.equal(hooks[0].point,'snake.run_lost');
assert.equal(hooks[0].segment,'jelly-pioneers');assert.equal(snake.pendingResult.outcome,'lost');
// Server-side component cleanup must not access browser-only RAF APIs.
const ssr=Object.create(SnakeComponent.prototype);
Object.assign(ssr,{raf:0,engine:{state:undefined},renderer:{destroy(){}}});
ssr.ngOnDestroy();
context.destroy(); injector.destroy();
console.log('PASS: four distinct mock responses, fresh JSON, unknown game errors, early/late responses, animation gate, retry, stale response cancellation, identity checks and destroy cleanup.');
