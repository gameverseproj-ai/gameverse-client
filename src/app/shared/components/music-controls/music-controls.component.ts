import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Component, Input, inject } from '@angular/core';
import { MusicService } from '../../../core/audio/music.service';
import { MusicGenre } from '../../../core/models/music.model';
@Component({
  selector: 'app-music-controls', standalone: true, imports: [TranslatePipe],
  templateUrl: './music-controls.component.html', styleUrl: './music-controls.component.scss',
})
export class MusicControlsComponent {
  @Input() compact = false;
  readonly music = inject(MusicService);
  readonly genres: {id: MusicGenre; name: string; detail: string; icon: string}[] = [
    {id: 'rock', name: 'Rock', detail: '3 tracks · Driving riffs', icon: 'ϟ'},
    {id: 'pop', name: 'Pop', detail: '3 tracks · Bright melodies', icon: '✦'},
    {id: 'funk', name: 'Funk', detail: '3 tracks · Syncopated grooves', icon: '≋'},
  ];
  changeVolume(event: Event): void { this.music.volume(Number((event.target as HTMLInputElement).value) / 100); }
}
