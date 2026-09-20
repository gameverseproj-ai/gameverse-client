import { Component, Input, inject } from '@angular/core';
import { MusicService } from '../../../core/audio/music.service';
import { MusicGenre } from '../../../core/models/music.model';
@Component({
  selector: 'app-music-controls', standalone: true,
  templateUrl: './music-controls.component.html', styleUrl: './music-controls.component.scss',
})
export class MusicControlsComponent {
  @Input() compact = false;
  readonly music = inject(MusicService);
  readonly genres: {id: MusicGenre; name: string; detail: string; icon: string}[] = [
    {id: 'rock', name: 'Rock', detail: 'Driving riffs · 116 BPM', icon: 'ϟ'},
    {id: 'pop', name: 'Pop', detail: 'Bright melodies · 112 BPM', icon: '✦'},
    {id: 'funk', name: 'Funk', detail: 'Syncopated grooves · 104 BPM', icon: '≋'},
  ];
  changeVolume(event: Event): void { this.music.volume(Number((event.target as HTMLInputElement).value) / 100); }
}
