import { Component, Input } from '@angular/core';

/** Decorative hall souvenir. All labels and interactions remain in the game UI. */
@Component({
  selector: 'app-hall-art',
  standalone: true,
  templateUrl: './hall-art.component.html',
  styles: [`:host{display:block;pointer-events:none;width:100%;max-width:330px;margin:0 auto}svg{display:block;width:100%;height:auto;overflow:visible}.spark{transform-origin:center;animation:twinkle 3s ease-in-out infinite alternate}.float{animation:float 5s ease-in-out infinite}@keyframes float{50%{transform:translateY(-7px)}}@keyframes twinkle{to{opacity:.35}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`],
})
export class HallArtComponent {
  @Input({required:true}) theme: 'snake' | 'temple' | 'tetris' | 'power' = 'snake';
}
