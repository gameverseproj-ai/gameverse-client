import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpTennisApi } from './http-tennis.api';
import { API_BASE_URL } from './api-config';
import { SessionStore } from './session.store';

describe('HttpTennisApi server catalog and invitations', () => {
  let api: HttpTennisApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: SessionStore, useValue: { read: () => null } },
      ],
    });
    api = TestBed.inject(HttpTennisApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses the server bootstrap without replacing prices or disabled sports', async () => {
    const result = api.bootstrap();
    const catalog = {
      enabledSports: [],
      sports: [],
      rackets: [{ id: 'spin', price: 777 }],
      exercises: [],
      activeChampionship: null,
    };
    http.expectOne('/api/tennis/bootstrap').flush(catalog);
    expect(await result).toEqual(jasmine.objectContaining(catalog));
  });
  it('loads incoming invitations from the authenticated endpoint', async () => {
    const result = api.invitations();
    http
      .expectOne('/api/tennis/invitations')
      .flush([{ id: 'invite', fromUsername: 'friend' }]);
    expect((await result)[0].fromUsername).toBe('friend');
  });
  it('follows the cursor so public courts after the first page can be joined', async () => {
    const room = (id: string) => ({
      id,
      sport: 'tennis',
      status: 'waiting',
      players: [],
    });
    const result = api.listRooms('tennis');
    http
      .expectOne('/api/tennis/rooms?sport=tennis')
      .flush({ items: [room('a')], nextCursor: 'next' });
    await Promise.resolve();
    http
      .expectOne('/api/tennis/rooms?sport=tennis&cursor=next')
      .flush({ items: [room('b')], nextCursor: null });
    expect((await result).map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('starts the selected exercise and keeps server timing constraints', async () => {
    const result = api.startTraining('footwork');
    const request = http.expectOne('/api/tennis/training/sessions');
    expect(request.request.body.exerciseId).toBe('footwork');
    request.flush({
      id: 'session',
      challenge: { reps: 30, minIntervalMs: 350, maxDurationMs: 120000 },
    });
    expect(await result).toEqual({
      id: 'session',
      reps: 30,
      minIntervalMs: 350,
      maxDurationMs: 120000,
    });
  });
});
