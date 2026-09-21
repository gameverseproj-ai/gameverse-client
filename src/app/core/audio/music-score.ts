import { MusicGenre } from '../models/music.model';
export type Instrument = 'kick' | 'snare' | 'hat' | 'bass' | 'guitar' | 'keys' | 'lead';
export interface MusicNote { instrument: Instrument; midi: number; duration: number; velocity: number; delay?: number }
export const MUSIC_TRACKS: Record<MusicGenre, readonly { title: string; bpm: number }[]> = {
  rock: [{title: 'Neon Run', bpm: 116}, {title: 'Velvet Voltage', bpm: 124}, {title: 'Afterglow Drive', bpm: 108}],
  pop: [{title: 'Candy Skyline', bpm: 112}, {title: 'Satellite Hearts', bpm: 120}, {title: 'Daydream Arcade', bpm: 102}],
  funk: [{title: 'Jelly Strut', bpm: 104}, {title: 'Pocket Rocket', bpm: 112}, {title: 'Midnight Bounce', bpm: 98}],
};

/** Original eight-bar instrumental arrangements, repeated by the global player. */
export function musicStep(genre: MusicGenre, step: number, track = 0): MusicNote[] {
  const variant = ((track % 3) + 3) % 3;
  const beat = step % 16, bar = Math.floor(step / 16) % 8;
  const notes: MusicNote[] = [];
  const add = (instrument: Instrument, midi: number, duration: number, velocity: number, delay = 0) => notes.push({instrument, midi, duration, velocity, delay});
  if (genre === 'rock') {
    const root = [
      [40, 40, 43, 45, 40, 43, 38, 38],
      [45, 48, 43, 45, 53, 48, 43, 40],
      [38, 41, 45, 43, 38, 45, 41, 36],
    ][variant][bar];
    const accents = [[0, 2, 6, 8, 10, 14], [0, 3, 4, 7, 10, 12, 15], [0, 4, 6, 9, 12, 14]][variant];
    if ([0, 6, 8, 10].includes(beat)) add('kick', 36, .19, .65);
    if (beat === 4 || beat === 12) add('snare', 38, .16, .42);
    if (beat % 2 === 0) add('hat', 0, .045, beat % 4 === 0 ? .2 : .12);
    if (accents.includes(beat)) {
      add('bass', root - 12, .19, .38);
      [0, 7, 12].forEach((interval, i) => add('guitar', root + interval, beat === 14 ? .23 : .15, .085, i * .007));
    }
    const hook = [[24, 27, 31, 34], [31, 29, 27, 24], [24, 31, 36, 34]][variant];
    if ((bar >= 4 || variant !== 0) && beat % 4 === (variant === 1 ? 1 : 2)) {
      add('lead', root + hook[(Math.floor(beat / 4) + bar % 2) % 4], variant === 2 ? .32 : .2, .09);
    }
  } else if (genre === 'pop') {
    const chord = Math.floor(bar / 2);
    const root = [[48, 55, 57, 53], [50, 57, 59, 55], [57, 53, 48, 55]][variant][chord];
    const third = root === 57 && variant !== 1 || root === 59 ? 3 : 4;
    if (beat % 4 === 0) { add('kick', 36, .2, .55); add('bass', root - 12, .3, .3); }
    if (beat === 4 || beat === 12) add('snare', 38, .12, .3);
    if (beat % 2 === 0) add('hat', 0, .035, .10);
    if (beat === 0 || beat === 8) [0, third, 7, 12].forEach((interval, i) => add('keys', root + interval, .85, .085, i * .012));
    const melody = [
      [12, null, 12 + third, null, 19, 12 + third, null, 14, 12, null, 7, null, 9, null, 7, null],
      [19, 19, null, 16, null, 14, 12, null, 14, null, 19, 21, null, 19, 16, null],
      [12, null, null, 7, 12 + third, null, 14, null, 19, null, null, 14, 12, 7, null, null],
    ][variant];
    const note = melody[(beat + (bar % 2) * 8) % 16];
    if (note !== null) add('lead', root + note, .19, .1);
  } else {
    const root = [[40, 40, 40, 45, 40, 45, 43, 45], [43, 48, 43, 46, 48, 43, 41, 43], [38, 38, 43, 45, 38, 41, 43, 45]][variant][bar];
    const swing = beat % 2 ? .025 : 0;
    if ([0, 3, 8, 11].includes(beat)) add('kick', 36, .16, .55, swing);
    if (beat === 4 || beat === 12) add('snare', 38, .12, .36);
    if (beat === 7 || beat === 15) add('snare', 38, .065, .08, swing);
    add('hat', 0, beat === 14 ? .1 : .028, beat % 2 ? .07 : .14, swing);
    const riffs: Record<number, number>[] = [
      {0:0, 3:12, 6:7, 7:10, 10:0, 11:12, 14:7},
      {0:0, 2:7, 5:12, 7:14, 8:12, 11:10, 13:7, 15:3},
      {0:0, 3:3, 4:7, 6:10, 9:12, 10:7, 13:5, 15:7},
    ];
    const riff = riffs[variant];
    if (riff[beat] !== undefined) add('bass', root - 12 + riff[beat], .12, .45, swing);
    if ([[2, 5, 10, 13], [1, 6, 9, 14], [2, 7, 11, 14]][variant].includes(beat)) [12, 15, 19, 22].forEach(interval => add('keys', root + interval, .075, .1, swing));
  }
  // An occasional turnaround makes the last bar lead back into the theme.
  if (bar === 7 && beat >= 14) add('snare', 38, .065, .13 + (beat - 14) * .03);
  return notes;
}
