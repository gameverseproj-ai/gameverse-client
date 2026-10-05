import { MusicGenre as RecordedGenre } from '../models/music.model';
import { Instrument, LOOP_STEPS, MUSIC_TRACKS, musicStep } from './music-score';

type MusicGenre = Exclude<RecordedGenre, 'lounge'>;

const INSTRUMENTS: Instrument[] = ['kick', 'snare', 'hat', 'openhat', 'crash', 'riser', 'bass', 'guitar', 'keys', 'pad', 'lead'];

describe('music score', () => {
  const genres = Object.keys(MUSIC_TRACKS) as MusicGenre[];

  it('produces valid notes for every genre, track and step of the 32-bar form', () => {
    for (const genre of genres) {
      const played = new Set<Instrument>();
      for (let track = 0; track < MUSIC_TRACKS[genre].length; track++) {
        for (let step = 0; step < LOOP_STEPS; step++) {
          for (const note of musicStep(genre, step, track)) {
            expect(INSTRUMENTS).withContext(`${genre} step ${step}`).toContain(note.instrument);
            expect(note.duration).withContext(`${genre} ${note.instrument}`).toBeGreaterThan(0);
            expect(note.velocity).withContext(`${genre} ${note.instrument}`).toBeGreaterThan(0);
            expect(note.velocity).withContext(`${genre} ${note.instrument}`).toBeLessThanOrEqual(1);
            expect(Number.isFinite(note.midi)).toBeTrue();
            played.add(note.instrument);
          }
        }
      }
      // Every genre carries a full band: rhythm section plus a harmonic layer.
      for (const required of ['kick', 'snare', 'bass', 'crash'] as Instrument[]) {
        expect(played.has(required)).withContext(`${genre} plays ${required}`).toBeTrue();
      }
      expect(played.has('pad') || played.has('keys') || played.has('guitar')).withContext(`${genre} has harmony`).toBeTrue();
    }
  });

  it('arranges sections: the intro is thinner and the breakdown drops the trance kick', () => {
    const instrumentsIn = (genre: MusicGenre, from: number): Set<Instrument> => {
      const found = new Set<Instrument>();
      for (let step = from; step < from + 128; step++) musicStep(genre, step, 0).forEach(note => found.add(note.instrument));
      return found;
    };
    expect(instrumentsIn('trance', 0).has('pad')).toBeFalse();
    expect(instrumentsIn('trance', 128).has('pad')).toBeTrue();
    expect(instrumentsIn('trance', 256).has('kick')).toBeFalse();
    expect(instrumentsIn('trance', 384).has('lead')).toBeTrue();
    expect(instrumentsIn('metal', 0).has('lead')).toBeFalse();
    expect(instrumentsIn('metal', 128).has('lead')).toBeTrue();
  });

  it('marks section seams with a crash and closes them with a snare fill', () => {
    for (const genre of genres) {
      expect(musicStep(genre, 128, 0).some(note => note.instrument === 'crash')).withContext(genre).toBeTrue();
      const fill = musicStep(genre, 127, 0).filter(note => note.instrument === 'snare');
      expect(fill.length).withContext(genre).toBeGreaterThan(0);
    }
  });
});
