import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { PLAYER_API }   from './core/api/player.api';
import { WORLD_API }    from './core/api/world.api';
import { GAME_API }     from './core/api/game.api';
import { CURRENCY_API } from './core/api/currency.api';
import { MockPlayerApi }   from './core/api/mock/mock-player.api';
import { MockWorldApi }    from './core/api/mock/mock-world.api';
import { MockGameApi }     from './core/api/mock/mock-game.api';
import { MockCurrencyApi } from './core/api/mock/mock-currency.api';
import { TETRIS_API } from './core/api/tetris.api';
import { MockTetrisApi } from './core/api/mock/mock-tetris.api';
import { TEMPLE_API } from './core/api/temple.api';
import { MockTempleApi } from './core/api/mock/mock-temple.api';
import { SNAKE_API } from './core/api/snake.api';
import { MockSnakeApi } from './core/api/mock/mock-snake.api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),

    // ─── API layer — swap useClass here to switch mock ↔ real implementation ───
    { provide: PLAYER_API,   useClass: MockPlayerApi },
    { provide: WORLD_API,    useClass: MockWorldApi },
    { provide: GAME_API,     useClass: MockGameApi },
    { provide: TETRIS_API, useExisting: MockTetrisApi },
    { provide: TEMPLE_API, useExisting: MockTempleApi },
    { provide: SNAKE_API,    useExisting: MockSnakeApi },
    { provide: CURRENCY_API, useClass: MockCurrencyApi },
  ],
};
