import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly headline = signal('Welcome to GameVerse');
  readonly tagline = signal('Explore worlds. Play games. Build legends.');
}
