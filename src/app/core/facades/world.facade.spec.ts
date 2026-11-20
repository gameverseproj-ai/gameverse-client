import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NEVER, Subject, of } from 'rxjs';
import { WORLD_API } from '../api/world.api';
import { World } from '../models/world.model';
import { WorldFacade } from './world.facade';

describe('World catalogue recovery', () => {
  it('ends stalled loading and accepts a successful retry', fakeAsync(() => {
    const api = { getWorlds: jasmine.createSpy().and.returnValue(NEVER), getStandaloneGames: () => NEVER };
    TestBed.configureTestingModule({ providers: [{ provide: WORLD_API, useValue: api }] });
    const facade = TestBed.inject(WorldFacade);
    facade.loadWorlds();
    tick(15000);
    expect(facade.loading()).toBeFalse();
    expect(facade.error()).toBeTruthy();
    expect(facade.standaloneError()).toBeTrue();
    api.getWorlds.and.returnValue(of([{ id: 'gelly' }] as World[]));
    facade.loadWorlds();
    expect(facade.error()).toBeNull();
    expect(facade.worlds()[0].id).toBe('gelly');
    tick(15000);
  }));

  it('does not let a stale catalogue response overwrite a retry', () => {
    const old = new Subject<World[]>();
    const api = { getWorlds: jasmine.createSpy().and.returnValues(old, of([{ id: 'gelly' }] as World[])) };
    TestBed.configureTestingModule({ providers: [{ provide: WORLD_API, useValue: api }] });
    const facade = TestBed.inject(WorldFacade);
    facade.loadWorlds();
    facade.loadWorlds();
    old.next([]);
    expect(facade.worlds()[0].id).toBe('gelly');
  });
});
