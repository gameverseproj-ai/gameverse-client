import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { PLAYER_API } from '../api/player.api';
import { MUSIC_PLAYER } from './music-player';
import { MusicService } from './music.service';
import { MusicPreferences } from '../models/music.model';
import { MusicRotation } from './music-rotation';
import { MUSIC_TRACKS } from './music-library';

describe('recorded music', () => {
  let service: MusicService;
  let requests: Subject<MusicPreferences>[];
  let player: any;
  let api: any;
  beforeEach(() => {
    requests = [];
    player = {play: jasmine.createSpy(), stop: jasmine.createSpy(), destroy: jasmine.createSpy()};
    api = {getMusicPreferences: () => of({enabled:false, genre:'pop', volume:.35}), saveMusicPreferences: jasmine.createSpy().and.callFake(() => { const r = new Subject<MusicPreferences>(); requests.push(r); return r; })};
    TestBed.configureTestingModule({providers:[{provide:PLAYER_API,useValue:api},{provide:MUSIC_PLAYER,useValue:player},{provide:Router,useValue:{url:'/world',events:new Subject()}}]});
    service = TestBed.inject(MusicService);
    service.load();
  });
  it('switches genre before the API responds and preserves the latest rapid selection', () => {
    service.choose('rock');
    expect(player.play.calls.mostRecent().args[0]).toBe('rock');
    service.choose('metal'); service.choose('funk');
    expect(requests.length).toBe(1);
    expect(player.play.calls.mostRecent().args[0]).toBe('funk');
    requests[0].next({enabled:true,genre:'rock',volume:.35});
    expect(service.preferences().genre).toBe('funk');
    expect(api.saveMusicPreferences.calls.mostRecent().args[0].genre).toBe('funk');
    expect(requests.length).toBe(2);
  });
  it('an explicit Play action restores audible volume', () => {
    service.volume(0); service.startPlayback();
    expect(service.preferences().enabled).toBeTrue();
    expect(service.preferences().volume).toBeGreaterThan(0);
    expect(player.play).toHaveBeenCalled();
  });
  it('stops immediately even while a save is pending', () => {
    service.choose('metal'); service.turnOff();
    expect(player.stop).toHaveBeenCalled();
    expect(service.preferences().enabled).toBeFalse();
  });
  it('keeps the local choice on save failure and retries it', () => {
    service.choose('trance'); requests[0].error(new Error('offline'));
    expect(service.preferences().genre).toBe('trance');
    expect(service.error()).not.toBe('');
    service.retrySave(); expect(requests.length).toBe(2);
  });
  it('advances on completion and repeated selection', () => {
    service.choose('rock'); const first=service.currentTrack();
    player.onEnded(); expect(service.currentTrack()).not.toBe(first);
    const second=service.currentTrack(); service.choose('rock'); expect(service.currentTrack()).not.toBe(second);
  });
  it('plays every recording before repeating within a genre', () => {
    const rotation=new MusicRotation(() => .4);
    for (const genre of Object.keys(MUSIC_TRACKS) as (keyof typeof MUSIC_TRACKS)[]) {
      expect(MUSIC_TRACKS[genre].length).toBeGreaterThanOrEqual(6);
      const cycle=Array.from({length:6},()=>rotation.next(genre));
      expect(new Set(cycle).size).toBe(6);
      expect(rotation.next(genre)).not.toBe(cycle[5]);
    }
  });
  it('does not change tracks for game subpages', () => {
    const r=new MusicRotation(); r.visit('/world');
    expect(r.visit('/games/snake')).toBeTrue();
    expect(r.visit('/games/snake?page=leaderboard')).toBeFalse();
    expect(r.visit('/world')).toBeTrue();
  });
});
