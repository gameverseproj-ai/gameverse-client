import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { TennisGearComponent } from './tennis-gear.component';
import { TennisChampionshipComponent } from './tennis-championship.component';

describe('Tennis panels', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LanguageService,
          useValue: { t: (value: unknown) => String(value) },
        },
      ],
    }),
  );

  it('keeps purchase affordability and sends the selected racket to its owner', () => {
    const f = TestBed.createComponent(TennisGearComponent);
    f.componentRef.setInput('profile', {
      coins: 100,
      racket: 'starter',
      owned: ['starter'],
    });
    f.detectChanges();
    const buttons: HTMLButtonElement[] = Array.from(
      f.nativeElement.querySelectorAll('.rackets button'),
    );
    expect(buttons[1].disabled).toBeFalse();
    expect(buttons[2].disabled).toBeTrue();
    const chosen = jasmine.createSpy('chosen');
    f.componentInstance.equip.subscribe(chosen);
    buttons[1].click();
    expect(chosen).toHaveBeenCalledWith('spin');
    f.componentRef.setInput('busy', true);
    f.detectChanges();
    expect(buttons.every((button) => button.disabled)).toBeTrue();
  });

  it('renders registration from server state and emits the registration action', () => {
    const f = TestBed.createComponent(TennisChampionshipComponent);
    f.componentRef.setInput('championship', {
      id: 'season',
      season: 'S1',
      status: 'registration',
      registrationOpen: true,
      registered: false,
      participants: 0,
      registrationClosesAt: '2026-10-20T12:00:00Z',
      rules: { maxPlayers: 32, pointsToWin: 5 },
      prize: { title: 'Island Cup', coins: 500, gems: 10, xp: 300 },
    });
    const register = jasmine.createSpy('register');
    f.componentInstance.register.subscribe(register);
    f.detectChanges();
    const button: HTMLButtonElement = f.nativeElement.querySelector('.primary');
    expect(button.textContent).toContain('Register');
    button.click();
    expect(register).toHaveBeenCalledTimes(1);
    f.componentRef.setInput('busy', true);
    f.detectChanges();
    expect(button.disabled).toBeTrue();
  });
});
