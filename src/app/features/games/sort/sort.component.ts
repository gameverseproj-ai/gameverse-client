import { Component, afterNextRender, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LeaderboardComponent } from '../../../shared/components/leaderboard/leaderboard.component';
import { SortAudio } from './sort-audio';
import { Board, levelBoard, pour, won } from './sort-engine';
@Component({ selector: 'app-sort', standalone: true, imports: [RouterLink, TranslatePipe, LeaderboardComponent], templateUrl: './sort.component.html', styleUrls: ['./sort.component.scss', './sort-lobby.scss', './sort-rewards.scss'] })
export class SortComponent {
    readonly page = signal<'home'|'play'|'records'|'leaderboard'>('home');
    openGame(mode:'classic'|'timed') {
        this.switchMode(mode);
        this.page.set('play');
        if(mode==='classic'&&this.complete)this.next();
        if(mode==='timed'&&!this.running())this.startSprint();
    }
    home() { if(this.pouring()<0)this.page.set('home'); }
    readonly mode = signal<'classic'|'timed'>('classic');
    readonly running = signal(false);
    readonly finished = signal(false);
    readonly remaining = signal(120);
    readonly solved = signal(0);
    readonly bestSprint = signal(0);
    readonly records = signal<Record<string, number>>({});
    private deadline = 0;
    private clock?: ReturnType<typeof setInterval>;
    private classic?: {level:number; board:Board; moves:number};
    get classicLevel(){return this.mode()==='classic'?this.level():this.classic?.level??1;}
    get recordRows() { return Object.entries(this.records()).sort((a,b)=>Number(a[0])-Number(b[0])); }
    get timeLabel() { const s=this.remaining(); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
    switchMode(mode:'classic'|'timed') {
        if(this.pouring()>=0 || mode===this.mode()) return;
        this.clearReward(); this.page.set('play');
        if(mode==='classic'&&this.complete)this.next();
        if(mode==='timed') { this.classic={level:this.level(),board:this.board().map(t=>[...t]),moves:this.moves()}; this.mode.set(mode); this.finished.set(false); this.remaining.set(120); this.solved.set(0); this.level.set(1); this.restart(); }
        else { this.endSprint(); this.mode.set(mode); if(this.classic){this.level.set(this.classic.level);this.board.set(this.classic.board);this.moves.set(this.classic.moves);} this.history=[];this.selected.set(-1);this.finished.set(false); }
    }
    startSprint() {
        if(this.pouring()>=0) return;
        clearInterval(this.clock); this.level.set(1); this.restart(); this.solved.set(0);this.remaining.set(120);this.finished.set(false);this.running.set(true);
        this.deadline=performance.now()+120000;
        this.clock=setInterval(()=>this.updateClock(),100);
    }
    private updateClock() { if(!this.running())return; this.remaining.set(Math.max(0,Math.ceil((this.deadline-performance.now())/1000))); if(this.remaining()===0)this.endSprint(); }
    private endSprint() {
        clearInterval(this.clock);
        if(!this.running())return;
        this.stopPours();
        this.running.set(false);this.finished.set(true);this.pouring.set(-1);this.selected.set(-1);
        this.bestSprint.update(n=>Math.max(n,this.solved()));this.saveRecords();
    }
    private recordWin() {
        if(this.mode()==='timed'){this.solved.update(n=>n+1);this.bestSprint.update(n=>Math.max(n,this.solved()));}
        else {const key=String(this.level());this.records.update(r=>({...r,[key]:Math.min(r[key]??Infinity,this.moves())}));}
        this.saveRecords();
    }
    private saveRecords(){try{localStorage.setItem('gameverse.sort.records.v1',JSON.stringify({classic:this.records(),sprint:this.bestSprint()}));}catch{}}
    readonly palette = ['#ff008c', '#00edff', '#ffe600', '#993dff', '#36ff69', '#ff7200'];
    readonly level = signal(1);
    readonly board = signal<Board>(levelBoard(1));
    readonly selected = signal(-1);
    readonly pouring = signal(-1);
    readonly message = signal('');
    readonly moves = signal(0);
    readonly symbols = ['●', '◆', '▲', '✦', '■', '♥'];
    private history: Board[] = [];
    readonly rewarded = signal(-1);
    readonly victory = signal(false);
    readonly sound = signal(true);
    readonly sparks = Array.from({length: 10}, (_, i) => ({x: Math.cos(i * Math.PI / 5) * 80, y: Math.sin(i * Math.PI / 5) * 100}));
    readonly confetti = Array.from({length: 36}, (_, i) => ({x: (i * 47 % 100), drift: (i * 31 % 240) - 120, delay: (i % 6) * .08, color: i % 6}));
    private readonly audio = new SortAudio();
    private rewardTimer?: ReturnType<typeof setTimeout>;
    toggleSound() { this.sound.update(v => !v); if(this.sound()) this.audio.unlock(); else this.audio.mute(); try { localStorage.setItem('gameverse.sort.sound', String(this.sound())); } catch {} }
    private clearReward() { clearTimeout(this.rewardTimer); this.rewarded.set(-1); this.victory.set(false); }
    readonly slots = [0, 1, 2, 3];
    get complete() { return won(this.board()); }
    constructor() { afterNextRender(() => { try {
        this.sound.set(localStorage.getItem('gameverse.sort.sound') !== 'false');
        const records=JSON.parse(localStorage.getItem('gameverse.sort.records.v1')||'null');
        if(records){if(Number.isSafeInteger(records.sprint)&&records.sprint>=0)this.bestSprint.set(records.sprint);if(records.classic&&typeof records.classic==='object')this.records.set(Object.fromEntries(Object.entries(records.classic).filter(([k,v])=>/^\d+$/.test(k)&&Number(k)>0&&Number.isSafeInteger(v)&&Number(v)>=0)) as Record<string,number>);}
        const s = JSON.parse(localStorage.getItem('gameverse.sort.local.v1') || 'null');
        if (s && Number.isInteger(s.level) && s.level > 0 && s.level <= 1000) {
            const initial = levelBoard(s.level);
            this.level.set(s.level);
            this.board.set(initial);
            if (Array.isArray(s.board) && s.board.length === initial.length && s.board.every((t: unknown) => Array.isArray(t) && t.length <= 4 && t.every(c => Number.isInteger(c) && c >= 0 && c < initial.length - 2)) && initial.slice(0, -2).every((_, c) => s.board.flat().filter((v: number) => v === c).length === 4)) {
                this.level.set(s.level);
                this.board.set(s.board);
                this.moves.set(Number.isSafeInteger(s.moves) && s.moves >= 0 ? s.moves : 0);
            }
        }
    }
    catch { } }); }
    readonly flows = signal<Array<{id:number;from:number;to:number;path:string;color:string;dx:number;dy:number;tilt:number;startY:number}>>([]);
    private flowId=0;
    private flowTimers=new Set<ReturnType<typeof setTimeout>>();
    private advanceTimer?:ReturnType<typeof setTimeout>;
    busy(index:number){return this.flows().some(f=>f.from===index||f.to===index);}
    flowFor(index:number){return this.flows().find(f=>f.from===index);}
    private later(callback:()=>void, delay:number){const timer=setTimeout(()=>{this.flowTimers.delete(timer);callback();},delay);this.flowTimers.add(timer);}
    private stopPours(){for(const timer of this.flowTimers)clearTimeout(timer);this.flowTimers.clear();this.flows.set([]);this.pouring.set(-1);clearTimeout(this.advanceTimer);}
    choose(index: number, event?: MouseEvent) {
        this.updateClock();
        if(this.complete||this.busy(index)||(this.mode()==='timed'&&!this.running()))return;
        if(this.sound())this.audio.unlock();
        this.message.set('');
        const from=this.selected();
        if(from<0||this.busy(from)){if(this.board()[index].length)this.selected.set(index);return;}
        if(from===index){this.selected.set(-1);return;}
        const next=pour(this.board(),from,index);
        if(!next){if(this.board()[index].length)this.selected.set(index);return;}
        const target=event?.currentTarget as HTMLElement|undefined, rack=target?.parentElement;
        let dx=0,dy=-50,path='',tilt=70,startLift=0;
        if(target&&rack){
            const source=rack.querySelectorAll<HTMLElement>('.tube-button')[from];
            startLift=source.querySelector<HTMLElement>('.tube')!.getBoundingClientRect().top-source.getBoundingClientRect().top;
            const x=target.offsetLeft+target.offsetWidth/2,y=target.offsetTop;
            const direction=x<rack.clientWidth/2?-1:1;
            tilt=direction*70;
            const lip=source.offsetWidth/2,angle=70*Math.PI/180;
            dx=target.offsetLeft-source.offsetLeft+(target.offsetWidth-source.offsetWidth)/2-direction*10;
            dy=target.offsetTop-source.offsetTop-65;
            const startX=x-direction*10+direction*lip*Math.cos(angle), startY=y-65+lip*Math.sin(angle);
            const height=target.querySelector<HTMLElement>('.tube')!.offsetHeight;
            const surface=y+8+(height-16)*(1-next[index].length/4)+6;
            path=`M ${startX} ${startY} C ${startX+3} ${startY+18}, ${x} ${surface-20}, ${x} ${surface}`;
        }
        const flow={id:++this.flowId,from,to:index,path,dx,dy,tilt,startY:startLift,color:this.palette[this.board()[from].at(-1)!]};
        this.flows.update(flows=>[...flows,flow]);this.pouring.set(from);this.selected.set(-1);
        this.later(()=>{
            this.updateClock();if(this.mode()==='timed'&&!this.running())return;
            // Only merge this pair: unrelated pours may have landed since it started.
            this.history.push(this.board().map(t=>[...t]));
            this.board.update(board=>board.map((tube,i)=>i===from?next[from]:i===index?next[index]:tube));
            this.moves.update(n=>n+1);
            if(won(this.board()))this.recordWin();
            this.save();
        },600);
        this.later(()=>{
            this.flows.update(flows=>flows.filter(f=>f.id!==flow.id));this.pouring.set(this.flows()[0]?.from??-1);
            const completed=next[index].length===4&&next[index].every(c=>c===next[index][0]);
            if(completed){this.rewarded.set(index);if(this.sound())this.audio.celebrate(this.complete&&this.flows().length===0);}
            if(this.complete&&this.flows().length===0){
                this.victory.set(true);this.advanceTimer=setTimeout(()=>this.next(),650);
            }
            clearTimeout(this.rewardTimer);this.rewardTimer=setTimeout(()=>this.clearReward(),1800);
        },1500);
    }
    undo() { if (!this.canUndo)
        return; const old = this.history.pop(); if (old) {
        this.clearReward();
        this.board.set(old);
        this.moves.update(n => Math.max(0, n - 1));
        this.selected.set(-1);
        this.save();
    } }
    restart() { if (this.pouring() >= 0)
        return; clearTimeout(this.advanceTimer); this.clearReward(); this.board.set(levelBoard(this.level())); this.moves.set(0); this.history = []; this.selected.set(-1); this.message.set(''); this.save(); }
    next() { this.updateClock(); if(!this.complete||this.pouring()>=0||(this.mode()==='timed'&&!this.running()))return; this.level.update(n => n + 1); this.restart(); }
    get canUndo() { return this.history.length > 0 && this.pouring() < 0 && !this.complete && (this.mode()==='classic'||this.running()); }
    private save() { if(this.mode()!=='classic')return; try {
        localStorage.setItem('gameverse.sort.local.v1', JSON.stringify({ level: this.level(), board: this.board(), moves: this.moves() }));
    }
    catch { } }
    ngOnDestroy() { this.stopPours(); clearInterval(this.clock);   this.clearReward(); this.audio.destroy(); }
}
