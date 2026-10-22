// Live backend E2E. No mock responses; the consume check deliberately loses one real response.
// Run against the local Angular dev server and an isolated be-core test database.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};new Function('exports','require',ts.transpile(fs.readFileSync('src/app/features/games/monstrocity/monstrocity.map.ts','utf8'),{module:ts.ModuleKind.CommonJS}))(mod.exports,require);
const {CONTAINERS,SHELTER_CANDIDATES,blocked}=mod.exports;
const origin=process.env.MONSTROCITY_URL || 'http://127.0.0.1:4300';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:960,height:600}});const page=await context.newPage();const errors=[],trace=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/monstrocity'))trace.push({path:new URL(r.url()).pathname,status:r.status()});});
await page.addInitScript(()=>localStorage.setItem('gameverse.auth.prompt-dismissed.v1','true'));
const state=()=>page.evaluate(()=>window.ng.getComponent(document.querySelector('app-monstrocity')).state());
const app=fn=>page.evaluate(fn);
async function walk(x,z){const current=await state();if(current.run.combat)return;
const box=await page.locator('.stick').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
await page.mouse.move(cx,cy);await page.mouse.down();
for(let i=0;i<65;i++){const s=await state();if(s.run.combat)break;const p=s.run.position,dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);if(len<.55)break;await page.mouse.move(cx+(dx*.785-dz*.62)/len*42,cy+(dx*.62+dz*.785)/len*42);await page.waitForTimeout(120);}
await page.mouse.up();await page.waitForTimeout(200);
const s=await state();if(!s.run.combat&&Math.hypot(x-s.run.position.x,z-s.run.position.z)>1.3)throw Error('walk blocked '+JSON.stringify({target:{x,z},position:s.run.position,error:await page.locator('.error-overlay').textContent({timeout:1000}).catch(()=>null)}));}
function route(start,target){const step=.5,key=p=>`${Math.round(p.x/step)},${Math.round(p.z/step)}`;const q=[{p:start,path:[]}],seen=new Set([key(start)]);while(q.length){const n=q.shift();if(typeof target==='function'?target(n.p):Math.hypot(n.p.x-target.x,n.p.z-target.z)<1.3)return n.path;for(const [x,z] of [[step,0],[-step,0],[0,step],[0,-step]]){const p={x:n.p.x+x,z:n.p.z+z},k=key(p);if(seen.has(k)||blocked(p))continue;seen.add(k);q.push({p,path:[...n.path,p]});}}throw Error('No route');}
try{
await page.goto(origin+'/worlds');await page.locator('a.monstro-card').click();await page.locator('.welcome .turntable[aria-disabled="false"]').dblclick({delay:80});await page.locator('.hud').waitFor();
let s=await state();if(!s.run || await app(()=>window.ng.getComponent(document.querySelector('app-monstrocity')).api.local))throw Error('Not using real server');const runId=s.run.id;
console.log('created',runId,s.run.configVersion,s.run.position);
const target=CONTAINERS.toSorted((a,b)=>Math.hypot(a.x-s.run.position.x,a.z-s.run.position.z)-Math.hypot(b.x-s.run.position.x,b.z-s.run.position.z))[0];
const path=route(s.run.position,target);for(let i=0;i<path.length;i+=2)await walk(path[i].x,path[i].z);if(path.length)await walk(path.at(-1).x,path.at(-1).z);
await page.locator('button.interact').click();await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-monstrocity')).state().profile.inventory.some(i=>i.itemId==='food'&&i.collected>0),{},{timeout:8000});
await page.locator('.monstro nav button').first().click();await page.waitForTimeout(500);const frozen=(await state()).run.activeElapsedMs;await page.waitForTimeout(1000);if((await state()).run.activeElapsedMs!==frozen)throw Error('pause failed');await page.keyboard.press('Escape');await page.locator('.monstro-modal').waitFor({state:'hidden'});
let keys=[];await page.route('**/api/monstrocity/runs/*/consume',async route=>{keys.push(route.request().headers()['idempotency-key']);if(keys.length===1){const response=await route.fetch();if(response.status()!==200)throw Error('consume failed before response loss');await route.abort('failed');}else await route.continue();});
await page.locator('.monstro nav button').nth(1).click();await page.locator('.items article button').first().click();await page.waitForFunction(()=>!window.ng.getComponent(document.querySelector('app-monstrocity')).busy());if(keys.length!==2||keys[0]!==keys[1])throw Error('unsafe retry');if((await state()).profile.inventory.find(i=>i.itemId==='food').collected!==0)throw Error('consume failed');await page.keyboard.press('Escape');await page.locator('.monstro-modal').waitFor({state:'hidden'});
await page.reload();await page.locator('.welcome .turntable[aria-disabled="false"]').dblclick({delay:80});await page.locator('.hud').waitFor();if((await state()).run.id!==runId)throw Error('resume changed run');console.log('PASS search/pause/consume exactly once after lost response/reload');
// Leave the start shelter and stand still; optional encounters may be escaped during navigation.
s=await state();const escapePath=route(s.run.position,p=>SHELTER_CANDIDATES.every(c=>Math.hypot(p.x-c.x,p.z-c.z)>3.3));
for(let i=0;i<escapePath.length;i+=2)await walk(escapePath[i].x,escapePath[i].z);if(escapePath.length)await walk(escapePath.at(-1).x,escapePath.at(-1).z);
await page.locator('.arena').waitFor({timeout:150000});
for(let i=0;i<12;i++){s=await state();if(!s.run.combat||s.run.combat.phase==='won')break;if(s.run.status==='dead')throw Error('battle lost');await page.waitForFunction(()=>{const c=window.ng.getComponent(document.querySelector('app-monstrocity'));return !c.combat||c.combat.phase==='won'||c.shotReady;},{},{timeout:4000});s=await state();if(!s.run.combat||s.run.combat.phase==='won')break;
const aim=await app(()=>{const c=window.ng.getComponent(document.querySelector('app-monstrocity')),b=c.combat,m=c.config().monsters.find(m=>m.id===b.monsterId),t=(b.elapsedActiveMs/1000)+c.config().stoneFlightSeconds+.18;return{x:.5+(m.motion==='zigzag'?m.motionAmplitude*Math.sin(2*Math.PI*t/m.motionPeriodSeconds):0),y:c.run.configVersion==='monstrocity-v1'?.2+.55*Math.min(1,t/m.approachSeconds):.45+.2*Math.min(1,t/m.approachSeconds)};});
const box=await page.locator('.arena').boundingBox();await page.mouse.move(box.x+box.width*aim.x,box.y+box.height*aim.y);await page.mouse.down();await page.waitForTimeout(50);await page.mouse.up();await page.waitForTimeout(600);}
await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-monstrocity')).state().run.combat===null,{},{timeout:5000});if((await state()).run.status!=='active')throw Error('not alive after victory');console.log('PASS real-server aimed combat');
const token=await page.evaluate(()=>JSON.parse(localStorage.getItem('gameverse.auth.session.v1')).token);
const headers={Authorization:'Bearer '+token,'Idempotency-Key':require('node:crypto').randomUUID()};
const other=await context.request.post(origin+`/api/monstrocity/runs/${runId}/resume`,{headers,data:{takeover:false}});if(other.status()!==409)throw Error('Second session not rejected');
const takeover=await context.request.post(origin+`/api/monstrocity/runs/${runId}/resume`,{headers:{...headers,'Idempotency-Key':require('node:crypto').randomUUID()},data:{takeover:true}});if(takeover.status()!==200)throw Error('Takeover failed');const taken=await takeover.json();
await page.locator('.error-overlay').waitFor({timeout:5000});if(!(await page.locator('.error-overlay').textContent()).includes('another tab'))throw Error('Conflict not explained');await page.locator('.error-overlay .primary').click();await page.locator('.error-overlay').waitFor({state:'hidden'});
const revoked=await context.request.post(origin+`/api/monstrocity/runs/${runId}/sync`,{headers,data:{sessionId:taken.session.id,frames:[]}});if(revoked.status()!==409)throw Error('Revoked session still works');console.log('PASS explicit session takeover');
await page.setViewportSize({width:844,height:390});await page.locator('.monstro nav button').nth(1).click();await page.screenshot({path:'/tmp/monstro-server-mobile.png'});if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync('/tmp/monstro-e2e-evidence.json',JSON.stringify({runId,trace,checks:['catalog','anonymous auth','create','movement','search','pause','consume retry same key','reload/resume','combat','takeover','mobile'],errors},null,2));console.log('PASS live backend E2E, no mocked API responses');
}catch(error){console.log('FAIL STATE',JSON.stringify(await state().catch(()=>null)));console.log('UI ERROR',await page.locator('.error-overlay').textContent({timeout:1000}).catch(()=>null));await page.screenshot({path:'/tmp/monstro-e2e-failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
