import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-monstrocity-avatar', standalone: true, imports: [TranslatePipe],
  template: `<div class="turntable" role="button" tabindex="0" [attr.aria-disabled]="disabled()" [attr.aria-label]="(female() ? 'Female explorer' : 'Male explorer') | t"
    (pointerdown)="down($event)" (pointerup)="up($event)" (pointercancel)="cancel()" (lostpointercapture)="cancel()" (keydown)="key($event)">
    @for (hero of [asset()]; track hero) {
      <div class="portrait" aria-hidden="true">
        <img [src]="hero + '.jpg'" alt="" draggable="false">
        @if (!reduced()) {
          <video #video [src]="hero + '.mp4'" [poster]="hero + '.jpg'" autoplay loop muted playsinline
            [muted]="true" preload="metadata" disablePictureInPicture disableRemotePlayback
            (loadedmetadata)="syncPlayback()" (error)="failed($event)"></video>
        }
      </div>
    }
  </div>`,
  styles: [`
    :host{display:block}
    .turntable{position:relative;width:100%;height:clamp(240px,40dvh,360px);cursor:pointer;touch-action:none;outline:none;user-select:none;-webkit-user-select:none}
    .turntable:focus-visible{outline:2px solid #e9c681;border-radius:20px;outline-offset:5px}
    .turntable[aria-disabled=true]{opacity:.55;cursor:wait}
    .turntable::before{content:'';position:absolute;inset:-12% -10% -8%;background:radial-gradient(ellipse at 50% 52%,#1d201df2 0%,#1d201dcc 25%,#14221c66 48%,transparent 72%);pointer-events:none}
    .portrait{position:relative;height:100%;aspect-ratio:390/648;margin:auto;max-width:100%;overflow:hidden;pointer-events:none;
      -webkit-mask-image:linear-gradient(90deg,transparent,#000 26%,#000 74%,transparent),linear-gradient(transparent,#000 7%,#000 94%,transparent);
      mask-image:linear-gradient(90deg,transparent,#000 26%,#000 74%,transparent),linear-gradient(transparent,#000 7%,#000 94%,transparent);
      -webkit-mask-composite:source-in;mask-composite:intersect}
    img,video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
    @media(max-height:500px){.turntable{height:220px}}
  `]
})
export class MonstrocityAvatarComponent {
  readonly female = input(true); readonly disabled = input(false); readonly locked = input(false);
  readonly changeAvatar = output<void>(); readonly enter = output<void>();
  readonly asset = computed(() => '/assets/monstrocity/heroes/' + (this.female() ? 'female' : 'male'));
  readonly reduced = signal(true);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly destroyRef = inject(DestroyRef);
  private pointer?: {id:number;x:number;y:number;time:number}; private tap?: {x:number;y:number;time:number};

  constructor() {
    afterNextRender(() => {
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      const motionChanged = () => this.reduced.set(media.matches);
      const visibilityChanged = () => this.syncPlayback();
      motionChanged();
      media.addEventListener('change', motionChanged);
      document.addEventListener('visibilitychange', visibilityChanged);
      this.destroyRef.onDestroy(() => {
        media.removeEventListener('change', motionChanged);
        document.removeEventListener('visibilitychange', visibilityChanged);
        this.video()?.nativeElement.pause();
      });
    });
  }

  syncPlayback() {
    const video = this.video()?.nativeElement;
    if (!video) return;
    video.muted = true;
    video.playbackRate = .5;
    if (document.hidden || this.reduced()) video.pause();
    else void video.play().catch(() => { /* The poster remains visible if autoplay is unavailable. */ });
  }

  failed(event: Event) {
    // Keep the matching portrait usable when a download or codec fails.
    (event.target as HTMLVideoElement).style.display = 'none';
  }
  down(e:PointerEvent) { if(this.disabled() || !e.isPrimary || e.button!==0)return; e.preventDefault();this.syncPlayback();this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
  up(e:PointerEvent) {
    const p=this.pointer;if(!p||p.id!==e.pointerId)return;this.pointer=undefined;
    if(this.disabled()){this.tap=undefined;return;}
    const dx=e.clientX-p.x,dy=e.clientY-p.y,now=performance.now();
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){this.tap=undefined;if(!this.locked())this.changeAvatar.emit();return;}
    if(Math.hypot(dx,dy)>16||now-p.time>400){this.tap=undefined;return;}
    if(this.tap&&now-this.tap.time<360&&Math.hypot(e.clientX-this.tap.x,e.clientY-this.tap.y)<28){this.tap=undefined;this.enter.emit();}
    else this.tap={x:e.clientX,y:e.clientY,time:now};
  }
  cancel(){if(this.pointer)this.tap=undefined;this.pointer=undefined;}
  key(e:KeyboardEvent){if(this.disabled()||e.repeat)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(!this.locked())this.changeAvatar.emit();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();this.enter.emit();}}
}
