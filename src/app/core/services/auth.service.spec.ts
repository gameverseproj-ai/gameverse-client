import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_API, AuthApi } from '../api/auth.api';
import { LanguageService } from '../i18n/language.service';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from './auth.service';

const guest: AuthResponse = {
  token: 'guest-token', userId: 'user', playerId: 'player', anonymous: true,
  language: 'en', identities: [],
  profile: { username: 'Guest', firstName: null, lastName: null, email: null, avatarUrl: null, language: 'en' },
};

describe('AuthService startup', () => {
  let api: jasmine.SpyObj<AuthApi>;
  let service: AuthService;
  beforeEach(() => {
    api = jasmine.createSpyObj<AuthApi>('AuthApi', ['me', 'anonymous', 'attach']);
    TestBed.configureTestingModule({ providers: [
      AuthService, { provide: AUTH_API, useValue: api },
      { provide: LanguageService, useValue: { language: () => 'en' } },
    ] });
    service = TestBed.inject(AuthService);
  });

  it('waits for session restoration and shares startup between callers', async () => {
    const response = new Subject<AuthResponse | null>();
    api.me.and.returnValue(response);
    let complete = false;
    const startup = service.init();
    void startup.then(() => complete = true);
    expect(service.init()).toBe(startup);
    await Promise.resolve();
    expect(complete).toBeFalse();
    const account = { ...guest, anonymous: false };
    response.next(account);
    await startup;
    expect(service.session()).toEqual(account);
    expect(api.me).toHaveBeenCalledTimes(1);
    expect(api.anonymous).not.toHaveBeenCalled();
    expect(service.busy()).toBeFalse();
  });

  it('allows startup without an account after creating a guest', async () => {
    const response = new Subject<AuthResponse>();
    api.me.and.returnValue(of(null));
    api.anonymous.and.returnValue(response);
    let complete = false;
    const startup = service.init();
    void startup.then(() => complete = true);
    await Promise.resolve();
    expect(complete).toBeFalse();
    response.next(guest);
    await startup;
    expect(service.session()?.anonymous).toBeTrue();
    expect(api.anonymous).toHaveBeenCalledOnceWith('en');
  });

  it('waits for Telegram authorization before finishing startup', async () => {
    spyOn<any>(service, 'telegramInitData').and.returnValue('signed-data');
    api.me.and.returnValue(of(guest));
    const response = new Subject<AuthResponse>();
    api.attach.and.returnValue(response);
    let complete = false;
    const startup = service.init();
    void startup.then(() => complete = true);
    await Promise.resolve();
    expect(complete).toBeFalse();
    expect(api.attach).toHaveBeenCalledOnceWith({ kind: 'telegram', body: { initData: 'signed-data' } });
    response.next({ ...guest, anonymous: false, identities: ['TELEGRAM'] });
    await startup;
    expect(service.session()?.anonymous).toBeFalse();
  });

  it('keeps the guest session if Telegram authorization fails', async () => {
    spyOn<any>(service, 'telegramInitData').and.returnValue('signed-data');
    api.me.and.returnValue(of(guest));
    api.attach.and.returnValue(throwError(() => new Error('unavailable')));
    await service.init();
    expect(service.session()).toEqual(guest);
    expect(service.busy()).toBeFalse();
  });

  it('does not block startup when authorization is unavailable', async () => {
    api.me.and.returnValue(throwError(() => new Error('offline')));
    await service.init();
    expect(service.session()).toBeNull();
    expect(service.error()).toContain('keep playing');
    expect(service.busy()).toBeFalse();
  });
});
