import { Component, Input } from '@angular/core';

/** Decorative hall souvenir. All labels and interactions remain in the game UI. */
@Component({
  selector: 'app-hall-art',
  standalone: true,
  templateUrl: './hall-art.component.html',
  styles: [`:host{display:block;pointer-events:none;width:100%;max-width:330px;margin:0 auto}.art-scene{position:relative;isolation:isolate;border-radius:22px;overflow:hidden;border:1px solid #ffffff55;box-shadow:inset 0 2px #ffffff55}.art-scene img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1}.art-scene svg{background:linear-gradient(0deg,#15324766,transparent 70%)}svg{display:block;width:100%;height:auto;overflow:visible}.spark{transform-origin:center;animation:twinkle 3s ease-in-out infinite alternate}.float{animation:float 5s ease-in-out infinite}@keyframes float{50%{transform:translateY(-7px)}}@keyframes twinkle{to{opacity:.35}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`],
})
export class HallArtComponent {
  get artSource() { return '/assets/arcade-art/' + ({snake:'snake-garden',temple:'temple',tetris:'factory',power:'gym'}[this.theme]) + '-v2.jpg'; }
  @Input({required:true}) theme: 'snake' | 'temple' | 'tetris' | 'power' = 'snake';
}
