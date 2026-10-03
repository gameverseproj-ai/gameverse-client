import { MusicGenre } from '../models/music.model';
export type Instrument = 'kick' | 'snare' | 'hat' | 'openhat' | 'crash' | 'riser' | 'bass' | 'guitar' | 'keys' | 'pad' | 'lead';
/** {@code brightness} (0..1) opens or closes the voice's filter; default is the instrument's own. */
export interface MusicNote { instrument: Instrument; midi: number; duration: number; velocity: number; delay?: number; brightness?: number }
export const MUSIC_TRACKS: Record<MusicGenre, readonly { title: string; bpm: number }[]> = {
  rock: [{title: 'Neon Run', bpm: 116}, {title: 'Velvet Voltage', bpm: 124}, {title: 'Afterglow Drive', bpm: 108}],
  pop: [{title: 'Candy Skyline', bpm: 112}, {title: 'Satellite Hearts', bpm: 120}, {title: 'Daydream Arcade', bpm: 102}],
  funk: [{title: 'Jelly Strut', bpm: 104}, {title: 'Pocket Rocket', bpm: 112}, {title: 'Midnight Bounce', bpm: 98}],
  trance: [{title: 'Ion Horizon', bpm: 140}, {title: 'Aurora Pulse', bpm: 138}, {title: 'Zenith Rush', bpm: 142}],
  metal: [{title: 'Iron Stampede', bpm: 168}, {title: 'Grave Thunder', bpm: 176}, {title: 'Molten Chariot', bpm: 160}],
};

/**
 * A tune is 32 bars: four 8-bar sections — intro, groove, breakdown, full —
 * so it develops instead of looping one texture forever.
 */
export const LOOP_STEPS = 512;

/**
 * What each section silences or softens (velocity multipliers; 0 = tacet,
 * absent = 1). The 8-bar core pattern stays the same; the arrangement breathes.
 */
const SECTION_MIX: Record<MusicGenre, readonly Partial<Record<Instrument, number>>[]> = {
  rock:   [{lead: 0, pad: 0}, {}, {guitar: .45, lead: .8}, {}],
  pop:    [{lead: 0, pad: .8}, {}, {kick: 0, bass: .75}, {}],
  funk:   [{keys: 0}, {}, {kick: .75, hat: .85}, {}],
  trance: [{pad: 0, lead: 0, snare: 0, openhat: 0}, {lead: 0}, {kick: 0, bass: 0, hat: 0, openhat: 0, guitar: .8}, {}],
  metal:  [{lead: 0, openhat: 0}, {}, {}, {}],
};

/** Original 32-bar instrumental arrangements, repeated by the global player. */
export function musicStep(genre: MusicGenre, step: number, track = 0): MusicNote[] {
  const section = Math.floor(step / 128) % 4;
  const local = step % 128;
  const bar = Math.floor(local / 16), beat = local % 16;
  const mix = SECTION_MIX[genre][section];
  const notes: MusicNote[] = [];
  for (const note of corePattern(genre, local, ((track % 3) + 3) % 3, section)) {
    const level = mix[note.instrument] ?? 1;
    if (level > 0) notes.push(level === 1 ? note : {...note, velocity: Math.min(1, note.velocity * level)});
  }
  // Section seams: a crash opens each section, a rising snare fill closes it,
  // and trance pulls a noise riser across the last two bars into the next one.
  if (local === 0) notes.push({instrument: 'crash', midi: 0, duration: 1.7, velocity: section === 3 ? .2 : .13});
  if (bar === 7 && [10, 12, 13, 14, 15].includes(beat)) {
    notes.push({instrument: 'snare', midi: 38, duration: .09, velocity: .08 + (beat - 10) * .045});
  }
  if (genre === 'trance' && local === 96) notes.push({instrument: 'riser', midi: 0, duration: 3.3, velocity: .14});
  return notes;
}

/**
 * Trance leads: a composed 4-bar phrase (16th grid, null = rest) played twice
 * per section, with a cadence replacing the final bar the second time through.
 * Offsets are semitones above the track's key root.
 */
const TRANCE_PHRASES: readonly {key: number; phrase: readonly (number | null)[]; cadence: readonly (number | null)[]}[] = [
  {key: 57, phrase: [
    12, null, null, 10, 8, null, 7, null, 8, null, 10, null, 7, null, 5, null,
    7, null, null, 5, 3, null, 2, null, 3, null, 5, null, 2, null, 0, null,
    0, null, 3, null, 7, null, 12, null, 10, null, 8, null, 10, null, 7, null,
    8, null, null, 7, 5, null, 7, null, 8, null, 10, null, 12, null, null, null,
  ], cadence: [15, null, 12, null, 10, null, 8, null, 7, null, 5, null, 7, null, null, null]},
  {key: 55, phrase: [
    0, null, 0, null, 7, null, 5, null, 3, null, 5, null, 7, null, null, null,
    10, null, 8, null, 7, null, 5, null, 3, null, 2, null, 0, null, null, null,
    0, null, 3, null, 5, null, 7, null, 8, null, 7, null, 5, null, 3, null,
    2, null, null, 3, 5, null, 3, null, 2, null, 0, null, -2, null, null, null,
  ], cadence: [7, null, null, 5, 7, null, 8, null, 10, null, 12, null, 7, null, null, null]},
  {key: 53, phrase: [
    7, null, null, null, 8, null, 7, null, 5, null, null, null, 3, null, null, null,
    5, null, null, null, 7, null, 5, null, 3, null, null, null, 2, null, null, null,
    3, null, 5, null, 7, null, 8, null, 10, null, 8, null, 7, null, 5, null,
    7, null, null, null, null, null, 5, null, 3, null, 2, null, 0, null, null, null,
  ], cadence: [12, null, 10, null, 8, null, 7, null, 5, null, 3, null, 2, null, null, null]},
];

/**
 * Metal riffs: two 16-step patterns per variant, alternating every two bars.
 * Values are fret offsets above the bar's root; 0 is a palm-muted chug and
 * anything higher lands as an accented stab.
 */
const METAL_RIFFS: readonly [Record<number, number>, Record<number, number>][] = [
  [{0:0, 1:0, 2:0, 4:0, 5:0, 6:3, 8:0, 9:0, 10:0, 12:5, 13:3, 14:0},
   {0:0, 1:0, 3:6, 4:0, 5:0, 7:5, 8:0, 9:0, 11:3, 12:0, 14:6, 15:5}],
  [{0:0, 2:0, 3:0, 5:1, 6:0, 8:0, 10:0, 11:0, 13:6, 14:5},
   {0:1, 1:0, 2:0, 4:1, 5:0, 6:0, 8:3, 9:0, 10:0, 12:6, 13:0, 14:0}],
  [{0:0, 1:0, 2:3, 4:0, 5:0, 6:5, 8:0, 9:0, 10:6, 12:5, 13:0, 14:3},
   {0:0, 2:7, 3:0, 5:8, 6:0, 8:7, 9:0, 11:5, 12:0, 14:3}],
];

/** The 8-bar core texture of a genre; sections shape it in {@link musicStep}. */
function corePattern(genre: MusicGenre, step: number, variant: number, section: number): MusicNote[] {
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
    if (beat === 0) [0, 7].forEach((interval, i) => add('pad', root + 12 + interval, 3.3, .04, i * .02));
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
    if (beat === 0) [0, third, 7].forEach((interval, i) => add('pad', root + interval, 3.4, .045, i * .015));
    const melody = [
      [12, null, 12 + third, null, 19, 12 + third, null, 14, 12, null, 7, null, 9, null, 7, null],
      [19, 19, null, 16, null, 14, 12, null, 14, null, 19, 21, null, 19, 16, null],
      [12, null, null, 7, 12 + third, null, 14, null, 19, null, null, 14, 12, 7, null, null],
    ][variant];
    const note = melody[(beat + (bar % 2) * 8) % 16];
    if (note !== null) add('lead', root + note, .19, .1);
  } else if (genre === 'trance') {
    // Four-on-the-floor, a rolling bassline with octave pops, a 16th arpeggio
    // whose filter opens section by section, wide pads and a composed lead
    // phrase; the mixer pumps pads and bass off every kick.
    const root = [
      [45, 45, 41, 41, 43, 43, 48, 48],
      [43, 43, 46, 46, 41, 41, 45, 45],
      [41, 41, 45, 45, 48, 48, 43, 43],
    ][variant][bar];
    const third = [[0, 0, 4, 4, 4, 4, 4, 4], [4, 4, 3, 3, 4, 4, 0, 0], [4, 4, 0, 0, 3, 3, 4, 4]][variant][bar] || 3;
    if (beat % 4 === 0) add('kick', 36, .18, .62);
    if (beat % 4 === 2) add('openhat', 0, .16, .14);
    else if (beat % 2 === 0) add('hat', 0, .03, .07);
    if (beat === 4 || beat === 12) add('snare', 38, .1, section === 3 ? .26 : .18);
    if (beat % 2 === 1) add('bass', root - 12, .1, beat % 4 === 1 ? .46 : .4);
    if (section === 3 && (beat === 6 || beat === 14)) add('bass', root, .08, .3); // octave pop
    const arp = [[0, 7, 12, 7, third, 7, 12, 15], [0, third, 7, 10, 12, 10, 7, third], [0, 12, 7, 12, third, 12, 7, 15]][variant];
    const openness = [.35, .55, .45, .9][section];
    add('guitar', root + 12 + arp[(beat + bar * 2) % 8], .09, .07, 0);
    notes[notes.length - 1].brightness = openness;
    if (beat === 0) [0, third, 7, 12].forEach((interval, i) => {
      add('pad', root + 12 + interval, 3.3, .055, i * .01);
      notes[notes.length - 1].brightness = [.4, .5, .7, .8][section];
    });
    const {key, phrase, cadence} = TRANCE_PHRASES[variant];
    const half = Math.floor(bar / 4), position = (bar % 4) * 16 + beat;
    const melody = half === 1 && bar % 4 === 3 ? cadence[beat] : phrase[position];
    if (melody !== null && melody !== undefined) {
      add('lead', key + melody, .26, .11);
      // The last section carries the hook an octave up as a harmony voice.
      if (section === 3) add('lead', key + melody + 12, .26, .05, .008);
    }
  } else if (genre === 'metal') {
    if (section === 2) {
      // Half-time breakdown: sparse kick, snare on the 3, slow ride pulse and
      // palm-muted eighth-note chugs — the drop before the final section.
      const root = [[40, 40, 40, 43, 40, 40, 46, 45], [38, 38, 41, 38, 44, 43, 38, 38], [40, 40, 43, 40, 45, 40, 46, 40]][variant][bar];
      if (beat === 0 || beat === 10) add('kick', 36, .11, .55);
      if (beat === 8) add('snare', 38, .16, .5);
      if (beat % 4 === 0) add('openhat', 0, .1, .09);
      if (beat % 2 === 0) {
        const stab = beat === 0;
        add('bass', root - 12, stab ? .2 : .07, .48);
        [0, 7].forEach((interval, i) => add('guitar', root + interval, stab ? .3 : .07, stab ? .12 : .09, i * .004));
      }
      return notes;
    }
    // Thrash: double-kick gallop, two alternating palm-muted riffs in
    // bass/guitar unison, double-kick runs and a harmonized pentatonic lead.
    const root = [
      [40, 40, 40, 43, 40, 40, 46, 45],
      [38, 38, 41, 38, 44, 43, 38, 38],
      [40, 40, 43, 40, 45, 40, 46, 40],
    ][variant][bar];
    const gallop = [
      [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15],
      [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15],
      [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14],
    ][variant];
    const doubleKickRun = section === 3 && (bar === 3 || bar === 7);
    if (doubleKickRun ? true : gallop.includes(beat)) add('kick', 36, .09, doubleKickRun ? .45 : .5);
    if (beat === 4 || beat === 12) add('snare', 38, .14, .45);
    if (beat % 4 === 2) add('openhat', 0, .12, .11);
    else if (beat % 2 === 0) add('hat', 0, .03, .1);
    if (bar === 4 && beat === 0) add('crash', 0, 1.2, .1); // riff-turn accent; section starts crash in the wrapper
    const fret = METAL_RIFFS[variant][Math.floor(bar / 2) % 2][beat];
    if (fret !== undefined) {
      const stab = fret > 0;
      add('bass', root - 12 + fret, stab ? .12 : .08, stab ? .52 : .45);
      [0, 7].forEach((interval, i) =>
        add('guitar', root + fret + interval, stab ? .14 : .08, stab ? .12 : .1, i * .005));
    }
    const shred = [[12, 15, 17, 19, 22, 19, 17, 15], [15, 12, 15, 17, 15, 12, 10, 12], [12, 17, 15, 20, 17, 22, 19, 24]][variant];
    if (bar >= 6 && beat % 2 === 1) {
      const tone = root + shred[((beat - 1) / 2 + (bar % 2) * 4) % 8];
      add('lead', tone, .11, .09);
      if (section === 3) add('lead', tone + 7, .11, .055, .006); // harmonized fifth
    }
  } else {
    const root = [[40, 40, 40, 45, 40, 45, 43, 45], [43, 48, 43, 46, 48, 43, 41, 43], [38, 38, 43, 45, 38, 41, 43, 45]][variant][bar];
    const swing = beat % 2 ? .025 : 0;
    if ([0, 3, 8, 11].includes(beat)) add('kick', 36, .16, .55, swing);
    if (beat === 4 || beat === 12) add('snare', 38, .12, .36);
    if (beat === 7 || beat === 15) add('snare', 38, .065, .08, swing);
    if (beat === 14) add('openhat', 0, .18, .12, swing);
    else add('hat', 0, .028, beat % 2 ? .07 : .14, swing);
    const riffs: Record<number, number>[] = [
      {0:0, 3:12, 6:7, 7:10, 10:0, 11:12, 14:7},
      {0:0, 2:7, 5:12, 7:14, 8:12, 11:10, 13:7, 15:3},
      {0:0, 3:3, 4:7, 6:10, 9:12, 10:7, 13:5, 15:7},
    ];
    const riff = riffs[variant];
    if (riff[beat] !== undefined) add('bass', root - 12 + riff[beat], .12, .45, swing);
    if ([[2, 5, 10, 13], [1, 6, 9, 14], [2, 7, 11, 14]][variant].includes(beat)) [12, 15, 19, 22].forEach(interval => add('keys', root + interval, .075, .1, swing));
  }
  return notes;
}
