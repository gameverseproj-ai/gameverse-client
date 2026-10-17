import { TENNIS_CATALOG } from './tennis.catalog';
import { translate } from './translate';
import { SPORT_RULES } from '../../features/games/tennis/racquet-sports';
import { RACKETS } from '../../features/games/tennis/tennis.api';

describe('Tennis localization', () => {
  for (const language of ['ru', 'he', 'ar'] as const) {
    it(`translates all tennis messages and catalog items into ${language}`, () => {
      for (const source of Object.keys(TENNIS_CATALOG)) {
        expect(translate(source, language)).withContext(source).not.toBe(source);
        expect(translate(source, language).length).toBeGreaterThan(0);
      }
      for (const sport of Object.values(SPORT_RULES)) {
        expect(translate(sport.name, language)).not.toBe(sport.name);
        expect(translate(sport.hint, language)).not.toBe(sport.hint);
      }
      for (const racket of RACKETS) expect(translate(racket.name, language)).not.toBe(racket.name);
      expect(translate('Point to Alice', language)).toContain('Alice');
      expect(translate('Point to Alice', language)).not.toContain('Point to');
      expect(translate('Round 3', language)).not.toContain('Round');
    });
  }
});
