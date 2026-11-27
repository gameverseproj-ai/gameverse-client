import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SortComponent } from './sort.component';

describe('Sort sprint and records', () => {
  let game: SortComponent;
  let now: number;
  beforeEach(() => {
    now = 1000;
    spyOn(performance, 'now').and.callFake(() => now);
    spyOn(localStorage, 'setItem');
    game = TestBed.runInInjectionContext(() => new SortComponent());
    game.sound.set(false);
  });
  afterEach(() => game.ngOnDestroy());
  it('preserves the classic board and moves across a sprint', fakeAsync(() => {
    const board = game.board().map(t => [...t]); game.moves.set(7);
    game.switchMode('timed'); game.startSprint(); game.switchMode('classic');
    expect(game.board()).toEqual(board); expect(game.moves()).toBe(7);
    expect(game.running()).toBeFalse();
  }));
  it('expires against elapsed time, cancelling a pour that has not landed', fakeAsync(() => {
    game.switchMode('timed'); game.startSprint();
    game.board.set([[0,0,0],[0],[]]); game.choose(1); game.choose(0);
    now += 120001; tick(100); tick(1300);
    expect(game.finished()).toBeTrue(); expect(game.remaining()).toBe(0);
    expect(game.solved()).toBe(0); expect(game.board()[0].length).toBe(3);
    expect(game.pouring()).toBe(-1);
  }));
  it('counts a solved level once and keeps the deadline on next level', fakeAsync(() => {
    game.switchMode('timed'); game.startSprint();
    game.board.set([[0,0,0],[0],[]]); game.choose(1); game.choose(0); tick(1200);
    expect(game.solved()).toBe(1); expect(game.bestSprint()).toBe(1);
    game.undo(); expect(game.complete).toBeTrue();
    now += 60000; tick(100); game.next();
    expect(game.remaining()).toBe(60); expect(game.solved()).toBe(1);
    now += 60001; tick(100); expect(game.running()).toBeFalse();
  }));
  it('merges overlapping-in-time disjoint pours without overwriting either pair', fakeAsync(() => {
    game.board.set([[0,0,0],[0],[1,1,1],[1],[]]);
    game.choose(1);game.choose(0);
    game.choose(3);game.choose(2);
    expect(game.flows().length).toBe(2);
    game.choose(0);expect(game.selected()).toBe(-1);
    tick(520);
    expect(game.board()).toEqual([[0,0,0,0],[],[1,1,1,1],[],[]]);
    expect(game.moves()).toBe(2);
    tick(680);expect(game.flows().length).toBe(0);
    tick(650);expect(game.level()).toBe(2);expect(game.moves()).toBe(0);
  }));
  it('continues a restored completed classic level without a next button', () => {
    game.board.set([[0,0,0,0],[]]);game.openGame('classic');
    expect(game.page()).toBe('play');expect(game.level()).toBe(2);expect(game.complete).toBeFalse();
  });
  it('records the fewest moves, not the latest slower finish', fakeAsync(() => {
    for(const moves of [4,8]) {
      game.restart(); game.moves.set(moves); game.board.set([[0,0,0],[0],[]]);
      game.choose(1); game.choose(0); tick(1200);
    }
    expect(game.records()['1']).toBe(5);
  }));
});
