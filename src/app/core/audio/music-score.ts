import { MusicGenre } from '../models/music.model';
export type Instrument = 'kick' | 'snare' | 'hat' | 'bass' | 'guitar' | 'keys' | 'lead';
export interface MusicNote { instrument: Instrument; midi: number; duration: number; velocity: number; delay?: number }
export const MUSIC_TEMPO: Record<MusicGenre, number> = { rock: 116, pop: 112, funk: 104 };

/** Original eight-bar instrumental arrangements, repeated by the global player. */
export function musicStep(genre: MusicGenre, step: number): MusicNote[] {
  const beat = step % 16, bar = Math.floor(step / 16) % 8;
  const notes: MusicNote[] = [];
  const add = (instrument: Instrument, midi: number, duration: number, velocity: number, delay = 0) => notes.push({instrument, midi, duration, velocity, delay});
  if (genre === 'rock') {
    const root = [40, 40, 43, 45, 40, 43, 38, 38][bar];
    if ([0, 6, 8, 10].includes(beat)) add('kick', 36, .19, .65);
    if (beat === 4 || beat === 12) add('snare', 38, .16, .42);
    if (beat % 2 === 0) add('hat', 0, .045, beat % 4 === 0 ? .2 : .12);
    if ([0, 2, 6, 8, 10, 14].includes(beat)) {
      add('bass', root - 12, .19, .38);
      [0, 7, 12].forEach((interval, i) => add('guitar', root + interval, beat === 14 ? .23 : .15, .085, i * .007));
    }
    if (bar >= 4 && beat % 4 === 2) add('lead', root + [24, 27, 31, 34][Math.floor(beat / 4)], .2, .09);
  } else if (genre === 'pop') {
    const root = [48, 55, 57, 53][Math.floor(bar / 2)];
    const third = root === 57 ? 3 : 4;
    if (beat % 4 === 0) { add('kick', 36, .2, .55); add('bass', root - 12, .3, .3); }
    if (beat === 4 || beat === 12) add('snare', 38, .12, .3);
    if (beat % 2 === 0) add('hat', 0, .035, .10);
    if (beat === 0 || beat === 8) [0, third, 7, 12].forEach((interval, i) => add('keys', root + interval, .85, .085, i * .012));
    const melody = [12, null, 16, null, 19, 16, null, 14, 12, null, 7, null, 9, null, 7, null];
    const note = melody[(beat + (bar % 2) * 8) % 16];
    if (note !== null) add('lead', root + note, .19, .1);
  } else {
    const root = bar < 4 ? 40 : 45;
    const swing = beat % 2 ? .025 : 0;
    if ([0, 3, 8, 11].includes(beat)) add('kick', 36, .16, .55, swing);
    if (beat === 4 || beat === 12) add('snare', 38, .12, .36);
    if (beat === 7 || beat === 15) add('snare', 38, .065, .08, swing);
    add('hat', 0, beat === 14 ? .1 : .028, beat % 2 ? .07 : .14, swing);
    const riff: Record<number, number> = {0:0, 3:12, 6:7, 7:10, 10:0, 11:12, 14:7};
    if (riff[beat] !== undefined) add('bass', root - 12 + riff[beat], .12, .45, swing);
    if ([2, 5, 10, 13].includes(beat)) [12, 15, 19, 22].forEach(interval => add('keys', root + interval, .075, .1, swing));
  }
  return notes;
}
