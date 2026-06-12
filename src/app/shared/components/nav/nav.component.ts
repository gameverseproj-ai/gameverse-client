import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  path: string;
  label: string;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  readonly links = signal<NavLink[]>([
    { path: '/home', label: 'Home' },
    { path: '/worlds', label: 'Worlds' },
    { path: '/games', label: 'Games' },
    { path: '/profile', label: 'Profile' },
  ]);

  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }
}
