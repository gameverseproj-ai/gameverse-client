import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AUTH_API } from './core/api/auth.api';
import { PLAYER_API } from './core/api/player.api';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
      providers: [
        { provide: AUTH_API, useValue: { me: () => of(null), anonymous: () => of(null), attach: () => of(null) } },
        { provide: PLAYER_API, useValue: {
          getLanguagePreference: () => of({ language: 'en' }),
          getMusicPreferences: () => of({ enabled: false, genre: 'pop', volume: 0.35 }),
        } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render nav and router-outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-nav')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
