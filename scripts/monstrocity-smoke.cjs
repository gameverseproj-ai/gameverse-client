// Isolated local-preview smoke test. Requires the Angular development server, Node 20+ and Playwright with Chrome.
const { chromium } = require(process.env['PLAYWRIGHT_MODULE'] || 'playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    try {
        const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => {
localStorage.setItem('gameverse.auth.prompt-dismissed.v1', 'true');
window.__audio = [];
const Native = window.AudioContext;
window.AudioContext = class extends Native {
 constructor(...args) {super(...args);this.__gains=[];window.__audio.push(this);}
 createGain() {const gain=super.createGain();this.__gains.push(gain);return gain;}
};
});
        await page.route('**/api/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Isolated local preview test"}' }));
        await page.route('**/api/worlds/standalone-games',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([{id:'monstrocity',title:'Monstrocity',launchRoute:'/games/monstrocity',thumbnailUrl:'/assets/monstrocity/cover.png'}])}));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('gameverse.monstrocity.preview.v1')).state);
        async function moveTo(x, z) { const box = await page.locator('.stick').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2; await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 0; i < 80; i++) {
            const p = (await state()).run.position, dx = x - p.x, dz = z - p.z, len = Math.hypot(dx, dz);
            if (len < 1.15)
                break;
            await page.mouse.move(cx + (dx * .785 - dz * .62) / len * 42, cy + (dx * .62 + dz * .785) / len * 42);
            await page.waitForTimeout(150);
        } await page.mouse.up(); await page.waitForTimeout(350); const p = (await state()).run.position; if (Math.hypot(x - p.x, z - p.z) > 1.8)
            throw Error('Movement did not reach target: ' + JSON.stringify(p)); }
        await page.goto((process.env['MONSTROCITY_URL'] || 'http://127.0.0.1:4300') + '/worlds');
        await page.locator('a.monstro-card').waitFor();
        await page.goto((process.env['MONSTROCITY_URL'] || 'http://127.0.0.1:4300')+'/games/monstrocity?preview=1');
        await page.locator('.welcome .turntable[aria-disabled="false"]').waitFor({ timeout: 30000 });
        await page.locator('.welcome .turntable').dblclick({delay:80});
        await page.locator('.hud').waitFor();
        await page.waitForFunction(()=>window.__audio.some(c=>c.state==='running'));
await page.locator('.music-toggle').click();await page.waitForTimeout(600);
if(!await page.evaluate(()=>window.__audio[0].__gains[0].gain.value<.01))throw Error('Music mute failed');
await page.locator('.music-toggle').click();await page.waitForTimeout(600);
if(!await page.evaluate(()=>window.__audio[0].__gains[0].gain.value>.2))throw Error('Music resume failed');
await moveTo(-7, -5.8);
        await page.locator('button.interact').click();
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('gameverse.monstrocity.preview.v1')).state.profile.inventory[0].collected > 0, {}, { timeout: 8000 });
        await page.locator('.monstro nav button').first().click();
        await page.locator('.monstro-modal').waitFor();
        await page.waitForTimeout(400);
        if(!await page.evaluate(()=>window.__audio[0].state==='suspended'))throw Error('Music continued behind pause');
const frozen = (await state()).run.activeElapsedMs;
        await page.waitForTimeout(1200);
        if ((await state()).run.activeElapsedMs !== frozen)
            throw Error('Map did not pause');
        await page.keyboard.press('Escape');
        await page.locator('.monstro-modal').waitFor({ state: 'hidden' });
        await page.locator('.monstro nav button').nth(1).click();
        await page.locator('.items article button').first().click();
        await page.waitForTimeout(400);
        if ((await state()).profile.inventory[0].collected !== 0)
            throw Error('Food not consumed');
        await page.keyboard.press('Escape');
        await page.locator('.monstro-modal').waitFor({ state: 'hidden' });
        const id = (await state()).run.id;
        await page.reload();
        await page.locator('.welcome .turntable[aria-disabled="false"]').waitFor();
        await page.locator('.welcome .turntable').dblclick({delay:80});
        await page.locator('.hud').waitFor();
        if ((await state()).run.id !== id)
            throw Error('Reload discarded run');
        await page.screenshot({ path: '/tmp/monstro-play-refined.png' });
        await moveTo((await state()).run.position.x < -7 ? -8.7 : -5.3, -3.5);
        await moveTo(-3, -4);

        await page.locator('.arena').waitFor({ timeout: 90000 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/monstro-battle.png' });
        const pose=()=>page.evaluate(()=>{const actor=window.ng.getComponent(document.querySelector('app-monstrocity-monster'));return actor.legs.map(leg=>leg.rotation.x);});
        const firstPose=await pose();await page.waitForTimeout(400);const secondPose=await pose();
        if(Math.abs(firstPose[0]-secondPose[0])<.01 || Math.abs(secondPose[0]+secondPose[1])>.001)throw Error('Monster legs do not alternate');
for (let hit = 0; hit < 4; hit++) {
            await page.waitForTimeout(1250);
            const target = await page.locator('.monster app-monstrocity-monster').boundingBox();
            await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
            await page.mouse.down();
            await page.mouse.up();
            await page.waitForTimeout(600);
        }
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('gameverse.monstrocity.preview.v1')).state.run.combat === null, {}, { timeout: 6000 });
        if ((await state()).run.status !== 'active')
            throw Error('Battle did not return alive');
        await page.setViewportSize({ width: 844, height: 390 });
        await page.locator('.monstro nav button').nth(1).click();
        await page.screenshot({ path: '/tmp/monstro-mobile-bag.png' });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
            throw Error('Mobile overflow');
        if (errors.length)
            throw Error(errors.join('\n'));
        console.log('PASS articulated monster animation, soundtrack start/mute/resume/pause;  Worlds entry, joystick movement, search, pause, consume, reload/resume, aimed battle victory, mobile inventory, no JS errors');
    }
    finally {
        await browser.close();
    }
})().catch(e => { console.error(e); process.exit(1); });
