import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthResponse } from '../../models/auth.model';
import { API_BASE_URL } from './api-config';
import { DeviceIdStore } from './device-id.store';
import { HttpAuthApi } from './http-auth.api';
import { SessionGate } from './session.gate';
import { SessionStore } from './session.store';

const guest: AuthResponse = {
  token: 'guest-token', userId: 'u1', playerId: 'p1', anonymous: true,
  language: 'en', identities: [],
  profile: { username: 'Guest', firstName: null, lastName: null, email: null, avatarUrl: null, language: 'en' },
};

describe('Guest device identity', () => {
  let http: HttpTestingController;
  const wipe = () => {
    localStorage.removeItem('gameverse.auth.session.v1');
    localStorage.removeItem('gameverse.auth.device.v1');
  };
  beforeEach(() => {
    wipe();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '' },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); wipe(); });

  it('signs in with a device ID that survives losing the session', () => {
    const gate = TestBed.inject(SessionGate);
    gate.ensure('en').subscribe();
    const first = http.expectOne('/api/auth/anonymous');
    const deviceId = first.request.headers.get('x-device-id')!;
    expect(deviceId.length).toBeGreaterThanOrEqual(16);
    first.flush(guest);

    // The session is gone, the device ID is not: the guest comes back.
    TestBed.inject(SessionStore).clear();
    gate.ensure('en').subscribe();
    const second = http.expectOne('/api/auth/anonymous');
    expect(second.request.headers.get('x-device-id')).toBe(deviceId);
    second.flush(guest);
  });

  it('forgets the device ID when the account converts, so the next guest is fresh', () => {
    const device = TestBed.inject(DeviceIdStore);
    const beforeAttach = device.get();

    TestBed.inject(HttpAuthApi).attach({ kind: 'google', body: { idToken: 'id' } }).subscribe();
    http.expectOne('/api/auth/attach/google')
      .flush({ ...guest, anonymous: false, identities: ['GOOGLE'] });

    expect(localStorage.getItem('gameverse.auth.device.v1')).toBeNull();
    expect(device.get()).not.toBe(beforeAttach);
  });

  it('drops a lingering device ID when a restored session is already signed in', () => {
    const session = TestBed.inject(SessionStore);
    const device = TestBed.inject(DeviceIdStore);
    session.save({ ...guest, anonymous: false });
    const lingering = device.get();

    TestBed.inject(HttpAuthApi).me().subscribe();
    http.expectOne('/api/auth/me').flush({ ...guest, anonymous: false });

    expect(localStorage.getItem('gameverse.auth.device.v1')).toBeNull();
    expect(device.get()).not.toBe(lingering);
  });
});
