import { MusicPlayer } from './music-player';
describe('recording player lifecycle',()=>{
  let ctx:any; let audio:any; let player:MusicPlayer; let resolve:()=>void;
  beforeEach(()=>{
    audio={paused:true,src:'',pause:jasmine.createSpy().and.callFake(()=>audio.paused=true),play:jasmine.createSpy().and.callFake(()=>{audio.paused=false;return new Promise<void>(r=>resolve=r);}),removeAttribute:()=>{},load:()=>{}};
    const gain={gain:{setTargetAtTime:()=>{}},connect:()=>{},disconnect:()=>{}};
    ctx={state:'running',currentTime:0,createGain:()=>gain,createMediaElementSource:()=>({connect:()=>gain,disconnect:()=>{}}),close:()=>Promise.resolve()};
    player=new MusicPlayer(()=>audio,()=>ctx);
  });
  it('replaces the old source immediately and ignores stale play completion',async()=>{
    const ready=jasmine.createSpy(); player.onReady=ready;
    player.play('rock',.3,0); const old=resolve; const url=audio.src;
    player.play('funk',.3,0); expect(audio.src).not.toBe(url);
    old(); await Promise.resolve(); expect(ready).not.toHaveBeenCalledWith(true);
    resolve(); await Promise.resolve(); expect(ready).toHaveBeenCalledWith(true);
  });
  it('does not report playback while the audio context is suspended and retries on a gesture', async()=>{
    ctx.state='suspended';
    ctx.resume=jasmine.createSpy().and.returnValue(Promise.resolve());
    const ready=jasmine.createSpy(); player.onReady=ready;
    player.play('rock',.3); resolve(); await Promise.resolve();
    expect(ready).not.toHaveBeenCalledWith(true);
    ctx.resume.and.callFake(()=>{ctx.state='running';return Promise.resolve();});
    player.play('rock',.3); await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(ready).toHaveBeenCalledWith(true);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it('volume changes do not restart a recording',()=>{
    player.play('pop',.3); player.play('pop',.6); expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it('stop invalidates an outstanding play request',async()=>{
    const ready=jasmine.createSpy(); player.onReady=ready;
    player.play('metal',.3); player.stop(); resolve(); await Promise.resolve();
    expect(audio.paused).toBeTrue(); expect(ready).not.toHaveBeenCalledWith(true);
  });
});
