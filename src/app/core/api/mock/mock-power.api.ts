import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { defer, of } from 'rxjs';
import { GameBootstrap } from '../../models/game-bootstrap.model';
import { PowerAction, PowerState, applyPower, freshPower, health, normalizePower } from '../../../features/games/power/power-engine';
import { EXERCISES, PowerExercise } from '../../../features/games/power/power-exercises';
type PowerRules = { exercises: PowerExercise[]; repTimeoutMs: number; preview: boolean };
const KEY = 'gameverse.power.player-001.v1';
@Injectable({ providedIn: 'root' })
export class MockPowerApi {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private memory = freshPower();
  private previewMemory = freshPower();
  private read(preview = false): PowerState {
    const raw = this.browser ? localStorage.getItem(preview ? KEY + '.preview' : KEY) : null;
    const state: PowerState = raw ? JSON.parse(raw) : structuredClone(preview ? this.previewMemory : this.memory);
    if (![state.strength, state.stage, state.hp, state.best, state.hits, state.wins, state.lastAt].every(v => Number.isSafeInteger(v) && v >= 0) || state.strength < 20 || state.stage < 1 || state.hp < 1 || state.hp > health(state.stage) || !Array.isArray(state.reps) || ![3, 60].includes(state.reps.length) || !state.reps.every((v, i) => Number.isInteger(v) && v >= 0 && v <= EXERCISES[i].reps)) throw new Error('Saved progress could not be loaded.');
    if (state.repTimes && (state.repTimes.length !== 60 || !state.repTimes.every(v => Number.isSafeInteger(v) && v >= 0))) throw new Error('Invalid exercise timestamps');
    if (state.assigned && (!Array.isArray(state.assigned) || (state.assigned.length !== 0 && (state.assigned.length !== 3 || new Set(state.assigned).size !== 3 || !state.assigned.every(i => Number.isInteger(i) && i >= 0 && i < 60))))) throw new Error('Invalid daily assignment');
    return normalizePower(state, Date.now());
  }
  private response(state: PowerState, preview = false): GameBootstrap<PowerState, PowerRules> {
    return { schemaVersion: 1, gameId: 'power', playerId: 'player-001', progress: { gamesPlayed: state.hits, bestScore: state.best, state }, settings: { soundEnabled: true, musicEnabled: false, rules: { exercises: (preview ? EXERCISES : state.assigned.map(i => EXERCISES[i])).map(e => ({...e})), repTimeoutMs: 10000, preview } } };
  }
  getBootstrap(preview = false) { return defer(() => of(this.response(this.read(preview), preview))); }
  resetPreview() { return defer(() => { const state = normalizePower(freshPower(), Date.now()); if (this.browser) localStorage.setItem(KEY + '.preview', JSON.stringify(state)); this.previewMemory = state; return of(this.response(state, true)); }); }
  act(action: PowerAction, preview = false) {
    return defer(() => {
      const state = applyPower(this.read(preview), action, Date.now(), preview);
      if (this.browser) localStorage.setItem(preview ? KEY + '.preview' : KEY, JSON.stringify(state));
      if (preview) this.previewMemory = structuredClone(state); else this.memory = structuredClone(state);
      return of(this.response(state, preview));
    });
  }
}
