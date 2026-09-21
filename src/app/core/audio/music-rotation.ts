import { MusicGenre } from '../models/music.model';
import { MUSIC_TRACKS } from './music-score';

/** A shuffle bag per genre: hear every tune before reshuffling, without repeats. */
export class MusicRotation {
  private readonly bags = new Map<MusicGenre, number[]>();
  private readonly previous = new Map<MusicGenre, number>();
  private location: string | null | undefined;
  constructor(private readonly random = Math.random) {}

  next(genre: MusicGenre): number {
    let bag = this.bags.get(genre);
    if (!bag?.length) {
      bag = MUSIC_TRACKS[genre].map((_, index) => index);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[0] === this.previous.get(genre)) [bag[0], bag[1]] = [bag[1], bag[0]];
      this.bags.set(genre, bag);
    }
    const index = bag.shift()!;
    this.previous.set(genre, index);
    return index;
  }

  /** Only completed transitions into, out of, or between games change the tune. */
  visit(url: string): boolean {
    const path = url.split(/[?#]/)[0];
    const game = /^\/games\/([^/;]+)/.exec(path)?.[1] ?? null;
    const changed = this.location !== undefined && game !== this.location
      && (game !== null || this.location !== null);
    this.location = game;
    return changed;
  }
}
