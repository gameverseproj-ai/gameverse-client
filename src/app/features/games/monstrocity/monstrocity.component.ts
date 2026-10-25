import { assistedAim } from './monstrocity-aim';
import { searchLoot, LootReward } from './monstrocity-loot';
import { MonstrocityAvatarComponent } from './monstrocity-avatar.component';
import { UserPrefsService } from '../../../core/services/user-prefs.service';
import { Component, ElementRef, NgZone, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { MONSTROCITY_API, MONSTROCITY_PREVIEW, Command, MonstrocityError } from './monstrocity.api';
import { HttpMonstrocityApi } from './monstrocity-http.api';
import { LocalMonstrocityApi } from './monstrocity-local.api';
import { Config, Input, Snapshot } from './monstrocity.types';
import { MonstrocityScene } from './monstrocity.scene';
import { worldInput } from './monstrocity.input';
import { MonstrocityMonsterComponent } from './monstrocity-monster.component';
import { MusicService } from '../../../core/audio/music.service';
import { MonstrocityMusic } from './monstrocity-music';
import { mapFor } from './monstrocity.map';
const memory = { getItem: (_: string) => null, setItem: (_: string, __: string) => { } };
@Component({ selector: 'app-monstrocity', standalone: true, imports: [RouterLink, TranslatePipe, MonstrocityMonsterComponent, MonstrocityAvatarComponent], providers: [{ provide: MONSTROCITY_API, useFactory: () => inject(MONSTROCITY_PREVIEW) ? new LocalMonstrocityApi(typeof localStorage === 'undefined' ? memory : localStorage) : inject(HttpMonstrocityApi) }], templateUrl: './monstrocity.component.html', styleUrls: ['./monstrocity-map.scss', './monstrocity-camera.scss', './monstrocity.component.scss', './monstrocity-combat.scss', './monstrocity-loot.scss'] })
export class MonstrocityComponent {
    readonly api = inject(MONSTROCITY_API);
    private zone = inject(NgZone);
    readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
    readonly state = signal<Snapshot | null>(null);
    readonly config = signal<Config | null>(null);
    readonly started = signal(false);
    readonly foundLoot = signal<LootReward[]>([]);
    private lootTimer = 0;
    readonly busy = signal(false);
    readonly error = signal('');
    readonly loading = signal(true);
    readonly modal = signal<'map' | 'inventory' | 'dialogue' | null>(null);
    private readonly prefs = inject(UserPrefsService);
    readonly cameraMode = signal<'overhead' | 'follow'>('overhead');
    readonly hero = signal<'male' | 'female'>('female');
    readonly hit = signal(false);
    private hitTimer = 0;
    readonly toast = signal('');
    readonly aiming = signal<{
        x: number;
        y: number;
    } | null>(null);
    readonly launchOrigin = signal({x:.72,y:.8});
    readonly projectile = signal<{
        x: number;
        y: number;
        originX:number;
        originY:number;
    } | null>(null);
    readonly throwQueued = signal(false);
    readonly retrievingStone = signal(false);
    private retrievalTimer = 0;
    readonly flight = signal<{x:number;y:number;scale:number}|null>(null);
    private aimLocked = false;
    private pendingThrow: {x:number;y:number;encounterId:string;assisted:boolean}|null = null;
    private flightStarted = 0;
    readonly joystick = signal({ x: 0, y: 0 });
    get cityMap() { return mapFor(this.run?.mapVersion ?? this.config()?.mapVersion); }
    readonly mapZoom=signal(1);
    zoomMap(delta:number){this.mapZoom.update(z=>Math.max(1,Math.min(4,z+delta)));}
    get mapViewBox(){const e=this.cityMap.extent+5,size=e*2/this.mapZoom();const clamp=(v:number)=>Math.max(-e+size/2,Math.min(e-size/2,v));return `${clamp(this.run?.position.x??0)-size/2} ${clamp(this.run?.position.z??0)-size/2} ${size} ${size}`;}
    get buildings() { return this.cityMap.buildings; }
    readonly musicMuted = signal(false);
    private music = new MonstrocityMusic();
    private sharedMusic = inject(MusicService);
    private releaseMusic?: () => void;
    private scene?: MonstrocityScene;
    private observer?: ResizeObserver;
    private frame = 0;
    private last = 0;
    private tick = 0;
    private lastSync = 0;
    private sequence = 0;
    private frames: Input[] = [];
    private tail: Promise<unknown> = Promise.resolve();
    private syncing = false;
    private disposed = false;
    private keys = new Set<string>();
    private toastTimer = 0;
    private shotTimer = 0;
    private swordTap = 0;
    private lastOpener?: HTMLElement;
    private stickPointer: number | null = null;
    private stickOrigin = { x: 0, y: 0 };
    private cameraPointer: {
        id: number;
        x: number;
        y: number;
    } | null = null;
    private aimPointer: number | null = null;
    get run() { return this.state()?.run; }
    get paused() { return !!this.modal() || !!this.error() || !this.started() || this.run?.status === 'dead'; }
    get action() { return this.run?.nearby.find(p => p.state === 'available'); }
    get dayLabel() { return this.run ? this.run.survivedDays + 1 : 1; }
    get phaseLabel() { return ({ day: 'Daylight', evening: 'Evening', night: 'Night', morning: 'Morning' })[this.run?.phase ?? 'day']; }
    get phaseClock() { const t = Math.ceil((this.run?.phaseRemainingMs ?? 0) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
    get energy() { return Math.ceil(this.run?.energy ?? 100); }
    get recovery() { return Math.ceil((this.run?.recoveryRemainingActiveMs ?? 0) / 1000); }
    get combat() { return this.run?.combat; }
    get approach() { const m = this.config()?.monsters.find(m => m.id === this.combat?.monsterId); return Math.min(1, (this.combat?.elapsedActiveMs ?? 0) / ((m?.approachSeconds ?? 24) * 1000)); }
    get targetLocked() { return this.aimLocked && !!this.aiming(); }
    get monsterArt() { return this.config()?.monsters.find(m => m.id === this.combat?.monsterId)?.artId ?? 'mossback'; }
    get monsterName() { return this.monsterArt === 'twigwalker' ? 'Twigwalker' : 'Mossback'; }
    get monsterSize() { if (!this.combat)
        return 100; const m = this.config()?.monsters.find(m => m.id === this.combat!.monsterId); return 180 + Math.min(1, this.combat.elapsedActiveMs / ((m?.approachSeconds ?? 24) * 1000)) * 160; }
    get swordCount() { const i = this.state()?.profile.inventory.find(i => i.itemId === 'sword'); return (i?.collected ?? 0) + (i?.purchased ?? 0); }
    get reloadRemaining() { return Math.max(0,(this.combat?.nextThrowActiveMs ?? 0)-(this.combat?.elapsedActiveMs ?? 0)); }
    get reloading() { return !!this.combat && ['approaching','sword-window'].includes(this.combat.phase) && (this.reloadRemaining > 0 || this.retrievingStone()) && !this.projectile() && !this.throwQueued(); }
    get canAim() { return this.shotReady && !this.reloading && !this.projectile() && !this.throwQueued() && !this.paused; }
    get reloadProgress() { return Math.max(0,Math.min(1,1-this.reloadRemaining/((this.config()?.stoneCooldownSeconds ?? .9)*1000))); }
    get shotReady() { return !!this.combat && this.combat.elapsedActiveMs >= this.combat.nextThrowActiveMs && !this.busy(); }
    constructor() { afterNextRender(() => void this.init()); }
    private async init() {
        this.releaseMusic = this.sharedMusic.reserveSoundtrack();
        try {
            try { this.musicMuted.set(localStorage.getItem('monstrocity.music-muted') === 'true'); } catch {}
            const b = await this.api.bootstrap();
            if (this.disposed)
                return;
            this.state.set(b.snapshot);
            this.config.set(b.config);
            this.hero.set(this.prefs.avatar(this.api.local) ?? b.snapshot.profile.character);
            this.scene = new MonstrocityScene(this.canvas().nativeElement,this.cityMap.version);
            this.cameraMode.set(this.prefs.camera(this.api.local));
            this.scene.setCameraMode(this.cameraMode());
            this.scene.setCharacter(this.hero() === 'female');
            this.observer = new ResizeObserver(entries => { const r = entries[0].contentRect; this.scene?.resize(r.width, r.height); });
            this.observer.observe(this.canvas().nativeElement);
            document.addEventListener('keydown', this.keydown);
            document.addEventListener('keyup', this.keyup);
            document.addEventListener('visibilitychange', this.visibility);
            window.addEventListener('pagehide', this.pagehide);
            this.zone.runOutsideAngular(() => this.frame = requestAnimationFrame(this.loop));
        }
        catch {
            this.error.set('Monstrocity could not load. Reload to try again.');
        }
        finally {
            this.loading.set(false);
        }
    }
    toggleCamera() { const mode=this.cameraMode()==='overhead'?'follow':'overhead';this.cameraMode.set(mode);this.prefs.setCamera(mode,this.api.local);this.scene?.setCameraMode(mode); }
    choose(value: 'male' | 'female') { if (this.busy() || this.loading()) return; this.hero.set(value); this.prefs.setAvatar(value, this.api.local); this.scene?.setCharacter(value === 'female'); }
    private apply(s: Snapshot) {
        if (this.disposed)
            return;
        const previous = this.state();
        if (previous?.run && s.run && previous.run.id === s.run.id && previous.run.revision > s.run.revision)
            return;
        if (previous?.run?.combat && s.run?.combat && previous.run.combat.hitsRemaining > s.run.combat.hitsRemaining) {
            this.hit.set(true);
            clearTimeout(this.hitTimer);
            this.hitTimer = window.setTimeout(() => this.hit.set(false), 180);
        }
        const rewards=searchLoot(previous,s);
        if(rewards.length){this.foundLoot.set(rewards);clearTimeout(this.lootTimer);this.lootTimer=window.setTimeout(()=>this.foundLoot.set([]),3200);}
        if(previous?.run?.id!==s.run?.id || s.run?.status==='dead'){this.foundLoot.set([]);clearTimeout(this.lootTimer);}
        this.state.set(s);
        if(this.scene && this.scene.mapVersion!==this.cityMap.version){
            this.scene.destroy();const canvas=this.canvas().nativeElement;
            this.scene=new MonstrocityScene(canvas,this.cityMap.version);this.scene.setCharacter(this.hero()==='female');this.scene.setCameraMode(this.cameraMode());this.scene.resize(canvas.clientWidth,canvas.clientHeight);
        }
        if (s.run?.status === 'dead') { this.clearInput(); this.modal.set(null); }
        if (s.run?.dialogue)
            this.modal.set('dialogue');
    }
    private queue<T>(fn: () => Promise<T>): Promise<T> { const result = this.tail.then(fn); this.tail = result.catch(() => { }); return result; }
    private handle(e: unknown) { if (this.disposed)
        return; if (e instanceof MonstrocityError) {
        if (e.snapshot)
            this.apply(e.snapshot);
        if (e.code === 'COOLDOWN') return;
        if (['NO_ITEM','OUT_OF_RANGE','TARGET_UNAVAILABLE','INVALID_STATE'].includes(e.code)) {
            this.notify(e.code === 'NO_ITEM' ? 'No supplies left.' : 'This action is no longer available.'); return;
        }
        this.error.set(e.code === 'SESSION_CONFLICT' ? 'This journey is open in another tab.' : e.code === 'NO_ITEM' ? 'No supplies left.' : e.code === 'RUN_DEAD' ? '' : e.code === 'SESSION_EXPIRED' ? 'Your journey is waiting. Reconnect to continue.' : 'The action could not finish. Please try again.');
    }
    else
        this.error.set('The action could not finish. Please try again.'); this.clearInput(); }
    private startMusic() { this.zone.runOutsideAngular(() => { void this.music.start(this.musicMuted()).catch(() => {}); }); }
    toggleMusic() { this.musicMuted.update(v => !v); this.music.mute(this.musicMuted()); this.startMusic(); try { localStorage.setItem('monstrocity.music-muted', String(this.musicMuted())); } catch {} }
    async begin() { this.startMusic(); if (this.busy() || this.loading() || !!this.error())
        return; this.prefs.setAvatar(this.hero(), this.api.local); this.busy.set(true); this.error.set(''); try {
        await this.queue(async () => { if (this.run?.status !== 'active') { const bootstrap = await this.api.bootstrap(); this.config.set(bootstrap.config); this.apply(bootstrap.snapshot); } const s = this.run?.status === 'active' ? await this.api.resume(this.run.id, false, crypto.randomUUID()) : await this.api.create({ character: this.hero(), configVersion: this.config()!.version }, crypto.randomUUID()); this.apply(s); this.sequence = s.session?.lastAcceptedInputSequence ?? 0; this.frames = []; this.started.set(true); this.modal.set(null); this.scene?.setCharacter(this.hero() === 'female'); });
    }
    catch (e) {
        this.handle(e);
    }
    finally {
        this.busy.set(false);
    } }
    async reconnect(takeover = false) { this.error.set(''); if (!this.run)
        return; this.busy.set(true); try {
        await this.queue(async () => { const s = await this.api.resume(this.run!.id, takeover, crypto.randomUUID()); this.apply(s); this.sequence = s.session?.lastAcceptedInputSequence ?? 0; this.frames = []; this.modal.set(null); this.started.set(true); });
    }
    catch (e) {
        this.handle(e);
    }
    finally {
        this.busy.set(false);
    } }
    private async command(name: Command, body: Record<string, unknown> = {}) { if (!this.run || this.busy())
        return; this.busy.set(true); try {
        await this.queue(async () => { await this.flush(); const s = this.state()!; if (s.run?.status !== 'active')
            return; this.apply(await this.api.command(s.run.id, name, { sessionId: s.session!.id, expectedRevision: s.run.revision, ...body }, crypto.randomUUID())); });
    }
    catch (e) {
        this.handle(e);
    }
    finally {
        this.busy.set(false);
    } }
    async openModal(value: 'map' | 'inventory', event: Event) { if (this.busy() || this.modal())
        return; this.lastOpener = event.currentTarget as HTMLElement; this.clearInput(); this.modal.set(value); await this.command('pause', { reason: value }); requestAnimationFrame(() => document.querySelector<HTMLElement>('.monstro-modal button')?.focus()); }
    async closeModal() { if (this.busy())
        return; await this.command('unpause'); if (!this.error()) {
        this.modal.set(null);
        this.lastOpener?.focus();
    } }
    backdrop(e: MouseEvent) { if (e.target === e.currentTarget)
        void this.closeModal(); }
    async interact() { const target = this.action; if (!target || this.busy())
        return; await this.command(target.kind === 'resident' ? 'talk' : 'search', { targetId: target.id }); }
    async consume(itemId: string) { await this.command('consume', { itemId }); }
    async sword() { const now = performance.now(); if (now - this.swordTap < 450 && this.swordTap > 0) {
        this.swordTap = 0;
        await this.command('sword', { encounterId: this.combat?.encounterId });
    }
    else {
        this.swordTap = now;
        this.notify('Tap the sword again to win.');
    } }
    private notify(message: string) { this.toast.set(message); clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => this.toast.set(''), 2500); }
    private async flush() { if (!this.started() || !this.run || this.run.status === 'dead' || document.hidden)
        return; const frames = this.frames.splice(0, this.config()!.transport.maxBatchFrames); const s = this.state()!; const next = await this.api.sync(s.run!.id, { sessionId: s.session!.id, frames }); const before = s.profile.inventory.reduce((sum, i) => sum + i.collected, 0); if (next.profile.inventory.reduce((sum, i) => sum + i.collected, 0) > before)
        this.notify('Supplies added to your bag.'); this.apply(next); }
    private loop = (time: number) => {
        if (this.disposed)
            return;
        const dt = Math.min(.2, (time - this.last) / 1000 || .016);
        this.last = time;
        if (!document.hidden) {
            const shot=this.projectile();
            if(shot){const t=Math.min(1,(time-this.flightStarted)/((this.config()?.stoneFlightSeconds??.45)*1000)),u=1-t;this.flight.set({x:u*u*shot.originX+2*u*t*((shot.originX+shot.x)/2)+t*t*shot.x,y:u*u*shot.originY+2*u*t*Math.max(0,shot.y-.22)+t*t*shot.y,scale:1.4-t*.95});}
            if(this.pendingThrow){if(this.paused||this.combat?.encounterId!==this.pendingThrow.encounterId){this.pendingThrow=null;this.throwQueued.set(false);}else void this.sendThrow();}
            this.music.setState(!!this.combat, this.run?.phase === 'night', this.paused);
            if (this.started()) this.scene?.render(this.state(), dt, this.paused);
            if (this.started() && !this.error() && this.run?.status === 'active') {
                this.tick += dt;
                const interval = (this.config()?.transport.inputTickMs ?? 50) / 1000;
                while (this.tick >= interval) {
                    this.tick -= interval;
                    const stick = this.joystick();
                    let x = stick.x + (this.keys.has('ArrowRight') || this.keys.has('d') ? 1 : 0) - (this.keys.has('ArrowLeft') || this.keys.has('a') ? 1 : 0);
                    let y = stick.y + (this.keys.has('ArrowDown') || this.keys.has('s') ? 1 : 0) - (this.keys.has('ArrowUp') || this.keys.has('w') ? 1 : 0);
                    const length = Math.max(1, Math.hypot(x, y));
                    x /= length;
                    y /= length;
                    if (this.paused || this.combat) {
                        x = 0;
                        y = 0;
                    }
                    if (this.frames.length < 10)
                        this.frames.push({ sequence: ++this.sequence, ...(this.scene?.movementInput(x,y) ?? worldInput(x, y)) });
                }
                if (time - this.lastSync >= 250 && !this.syncing && !this.busy()) {
                    this.lastSync = time;
                    this.syncing = true;
                    this.zone.run(() => { void this.queue(() => this.flush()).catch(e => this.handle(e)).finally(() => this.syncing = false); });
                }
            }
        }
        this.frame = requestAnimationFrame(this.loop);
    };
    stickDown(e: PointerEvent) { if (this.paused || this.combat || this.stickPointer !== null)
        return; e.preventDefault(); this.stickPointer = e.pointerId; this.stickOrigin = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); this.stickMove(e); }
    stickMove(e: PointerEvent) { if (e.pointerId !== this.stickPointer)
        return; const x = (e.clientX - this.stickOrigin.x) / 42, y = (e.clientY - this.stickOrigin.y) / 42, len = Math.max(1, Math.hypot(x, y)); this.joystick.set({ x: x / len, y: y / len }); }
    stickUp(e: PointerEvent) { if (this.stickPointer === e.pointerId) {
        this.stickPointer = null;
        this.joystick.set({ x: 0, y: 0 });
    } }
    cameraDown(e: PointerEvent) { if (this.paused || this.combat)
        return; this.cameraPointer = { id: e.pointerId, x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    cameraMove(e: PointerEvent) { const p = this.cameraPointer; if (p?.id !== e.pointerId)
        return; this.scene?.panBy(e.clientX - p.x, e.clientY - p.y); p.x = e.clientX; p.y = e.clientY; }
    cameraUp(e: PointerEvent) { if (this.cameraPointer?.id === e.pointerId) {
        this.cameraPointer = null;
        this.scene?.releasePan();
    } }
    aimDown(e: PointerEvent) {
        if (!this.canAim || !e.isPrimary || e.button !== 0 || !this.combat || !['approaching','sword-window'].includes(this.combat.phase) || this.aimPointer !== null) return;
        e.preventDefault(); this.aimLocked=false; this.aimPointer=e.pointerId;
        const arena=e.currentTarget as HTMLElement,hand=arena.querySelector<HTMLElement>('.throwing-hand');
        if(hand){const r=arena.getBoundingClientRect(),h=hand.getBoundingClientRect();this.launchOrigin.set({x:(h.left+h.width*.28-r.left)/r.width,y:(h.top+h.height*.25-r.top)/r.height});}
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); this.aimMove(e);
    }
    aimMove(e: PointerEvent) {
        if (e.pointerId !== this.aimPointer) return;
        const arena=e.currentTarget as HTMLElement,r=arena.getBoundingClientRect();
        const monster=arena.querySelector('.monster')?.getBoundingClientRect();
        // Keep a target acquired by a beginner through the release/flick gesture.
        if(monster && (this.run?.survivedDays ?? 0)<30 && e.clientX>=monster.left-20 && e.clientX<=monster.right+20 && e.clientY>=monster.top-20 && e.clientY<=monster.bottom+20)this.aimLocked=true;
        if(this.aimLocked && this.run?.combat && this.config()){this.aiming.set(assistedAim(this.run,this.config()!));return;}
        this.aiming.set({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))});
    }
    aimUp(e: PointerEvent) {
        if (this.aimPointer !== e.pointerId) return;
        if(e.type==='pointerup')this.aimMove(e);
        const aim=this.aiming();this.aimPointer=null;this.aiming.set(null);
        if(e.type!=='pointerup'||!aim||this.paused||!this.combat)return;
        // Keep exactly one release until accepted or the encounter ends; network latency must not discard it.
        this.pendingThrow={...aim,encounterId:this.combat.encounterId,assisted:this.aimLocked};
        this.throwQueued.set(true);void this.sendThrow();
    }
    private async sendThrow() {
        const pending=this.pendingThrow;
        if(!pending || this.busy() || !this.shotReady || this.paused)return;
        this.busy.set(true);
        try {
            await this.queue(async()=>{
                const syncStarted=performance.now();
                await this.flush();
                const latency=(performance.now()-syncStarted)/2000;
                const s=this.state()!,combat=s.run?.combat;
                if(!combat||combat.encounterId!==pending.encounterId||!['approaching','sword-window'].includes(combat.phase)) {this.pendingThrow=null;this.throwQueued.set(false);return;}
                if(combat.elapsedActiveMs<combat.nextThrowActiveMs)return;
                this.pendingThrow=null;
                const aim=pending.assisted ? assistedAim(s.run!,this.config()!,latency) : pending;
                const result=await this.api.command(s.run!.id,'throw',{sessionId:s.session!.id,expectedRevision:s.run!.revision,encounterId:pending.encounterId,aimX:aim.x,aimY:aim.y},crypto.randomUUID());
                this.apply(result);
                this.throwQueued.set(false);
                if(this.disposed)return;
                const origin=this.launchOrigin();this.projectile.set({x:aim.x,y:aim.y,originX:origin.x,originY:origin.y});this.flightStarted=performance.now();
                this.flight.set({...origin,scale:1.4});
                clearTimeout(this.shotTimer);this.shotTimer=window.setTimeout(()=>{this.projectile.set(null);this.flight.set(null);this.beginRetrieval()},(this.config()?.stoneFlightSeconds??.45)*1000);
            });
        } catch(e) {
            if(e instanceof MonstrocityError && e.code==='COOLDOWN' && this.combat?.encounterId===pending.encounterId) {this.pendingThrow=pending;this.throwQueued.set(true);}
            else {this.pendingThrow=null;this.throwQueued.set(false);}
            this.handle(e);
        } finally {this.busy.set(false);}
    }
    private beginRetrieval() {
        if(this.disposed || !this.combat || !['approaching','sword-window'].includes(this.combat.phase))return;
        this.retrievingStone.set(true);clearTimeout(this.retrievalTimer);
        this.retrievalTimer=window.setTimeout(()=>this.retrievingStone.set(false),720);
    }
    private clearInput() { clearTimeout(this.retrievalTimer);this.retrievingStone.set(false); this.pendingThrow=null;this.throwQueued.set(false); this.keys.clear(); this.joystick.set({ x: 0, y: 0 }); this.stickPointer = null; this.cameraPointer = null; this.aimPointer = null; this.aiming.set(null); this.scene?.releasePan(); }
    private keydown = (e: KeyboardEvent) => { if (this.modal() && e.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('.monstro-modal button:not(:disabled),.monstro-modal a'));
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
        return;
    } if (e.key === 'Escape') {
        e.preventDefault();
        if (this.modal())
            void this.closeModal();
        return;
    } if ((e.target as HTMLElement).matches('input,textarea'))
        return; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
        this.keys.add(e.key);
    } };
    private keyup = (e: KeyboardEvent) => this.keys.delete(e.key);
    private visibility = () => { this.clearInput(); if (document.hidden) {
        this.music.setState(false, false, true); this.disconnect(); }
    else if (this.started() && this.run?.status === 'active')
        void this.reconnect(); };
    private pagehide = () => {
        const s = this.state();
        if (this.api.leave && this.started() && s?.run?.status === 'active' && s.session && ['active','paused'].includes(s.session.status))
            this.api.leave(s.run.id, {sessionId:s.session.id, expectedRevision:s.run.revision}, crypto.randomUUID());
        else this.disconnect();
    };
    private disconnect() { if (!this.started() || this.run?.status !== 'active')
        return; void this.queue(async () => { const s = this.state(); if (!s?.run || !s.session)
        return; try {
        const next = await this.api.command(s.run.id, 'disconnect', { sessionId: s.session.id, expectedRevision: s.run.revision }, crypto.randomUUID());
        this.apply(next);
    }
    catch { /* resume reconciles missing disconnect */ } }); }
    ngOnDestroy() { if (typeof document === 'undefined')
        return; this.disconnect(); this.music.destroy(); this.releaseMusic?.(); this.disposed = true; cancelAnimationFrame(this.frame); clearTimeout(this.lootTimer); clearTimeout(this.toastTimer); clearTimeout(this.shotTimer); clearTimeout(this.retrievalTimer); clearTimeout(this.hitTimer); this.observer?.disconnect(); this.scene?.destroy(); if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', this.keydown);
        document.removeEventListener('keyup', this.keyup);
        document.removeEventListener('visibilitychange', this.visibility);
        window.removeEventListener('pagehide', this.pagehide);
    } }
}
