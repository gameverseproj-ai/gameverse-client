import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { API_BASE_URL } from '../../../core/api/http/api-config';
import { LanguageService } from '../../../core/i18n/language.service';
import { Leaderboard } from '../../../core/models/leaderboard.model';
import { LeaderboardComponent } from './leaderboard.component';

const board: Leaderboard = {
  gameId: 'snake', title: 'Snake', enabled: true, mode: 'WEEKLY', scoring: 'BEST_RUN',
  period: { key: '2026-W40', startsAt: '2026-09-28T00:00:00Z', endsAt: '2026-10-05T00:00:00Z', settled: false },
  prizes: [], standings: Array.from({length: 12}, (_, i) => ({ rank: i+1, playerId: `player-${i}`, username: `Player ${i}`, avatarUrl: null, score: 100-i, results: 1, you: false, prize: null })),
  you: { rank: 87, playerId: 'self', username: null, avatarUrl: null, score: 2, results: 1, you: true, prize: {rankFrom: 51, rankTo: 100, coins: 10, gems: 0, xp: 5, label: null} }, players: 100,
};

describe('Leaderboard screen', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: '' },
    { provide: LanguageService, useValue: { language: signal('en'), t: (value: string) => value } },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function create(gameId = 'snake') {
    const fixture = TestBed.createComponent(LeaderboardComponent);
    fixture.componentRef.setInput('gameId', gameId);
    fixture.detectChanges(); TestBed.flushEffects(); fixture.detectChanges();
    return fixture;
  }
  function request(gameId = 'snake') {
    const req = TestBed.inject(HttpTestingController).expectOne(`/api/games/${gameId}/leaderboard?limit=50`);
    expect(req.request.method).toBe('GET'); return req;
  }
  it('uses server ranks, paginates the top and shows your rank outside the top', () => {
    const fixture = create(); request().flush(board); fixture.detectChanges();
    fixture.componentInstance.pageSize.set(5);
    fixture.componentInstance.move(1); fixture.detectChanges();
    expect(fixture.componentInstance.rows()[0].rank).toBe(6);
    expect(fixture.nativeElement.querySelector('footer').textContent).toContain('#87');
    expect(fixture.nativeElement.querySelector('footer').textContent).toContain('10 Coins');
    expect(fixture.nativeElement.querySelectorAll('.row').length).toBe(5);
    fixture.destroy();
  });
  it('recovers from an error and reloads fresh data', () => {
    const fixture = create('power'); request('power').flush({}, {status: 503, statusText:'Unavailable'}); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    fixture.componentInstance.reload(); request('power').flush({...board, gameId:'power', standings:[], you:null, players:0}); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No scores yet this week.');
    expect(fixture.nativeElement.textContent).toContain('Finish a scored run');
    fixture.destroy();
  });
  it('handles disabled boards without presenting a misleading empty ranking', () => {
    const fixture = create('2048'); request('2048').flush({...board, enabled:false, standings:[], you:null}); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('currently unavailable');
    expect(fixture.nativeElement.querySelector('.pagination')).toBeNull();
    fixture.destroy();
  });
  it('cancels requests on game change and destruction', () => {
    const fixture = create(); const old = request();
    fixture.componentRef.setInput('gameId','tetris'); fixture.detectChanges(); TestBed.flushEffects();
    expect(old.cancelled).toBeTrue();
    const next = request('tetris'); fixture.destroy(); expect(next.cancelled).toBeTrue();
  });
});
