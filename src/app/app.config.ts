import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { AUTH_API } from './core/api/auth.api';
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
import { COLLECTION_API } from './core/api/collection.api';
import { TETRIS_API } from './core/api/tetris.api';
import { TEMPLE_API } from './core/api/temple.api';
import { SNAKE_API } from './core/api/snake.api';
import { MockPowerApi } from './core/api/mock/mock-power.api';
import { serverApiInterceptor } from './core/api/http/server-api.interceptor';
import { HttpAuthApi } from './core/api/http/http-auth.api';
import { HttpPlayerApi } from './core/api/http/http-player.api';
import { HttpWorldApi } from './core/api/http/http-world.api';
import { HttpGameApi } from './core/api/http/http-game.api';
import { HttpCurrencyApi } from './core/api/http/http-currency.api';
import { HttpCollectionApi } from './core/api/http/http-collection.api';
import { HttpTetrisApi } from './core/api/http/http-tetris.api';
import { HttpTempleApi } from './core/api/http/http-temple.api';
import { HttpSnakeApi } from './core/api/http/http-snake.api';
import { HttpPowerApi } from './core/api/http/http-power.api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(AuthService).init()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, serverApiInterceptor])),

    // ─── API layer — swap useExisting here to switch mock ↔ real implementation ───
    // The mock adapters are still in core/api/mock and can be restored by name.
    // The server origin comes from API_BASE_URL in core/api/http/api-config.ts.
    { provide: AUTH_API, useExisting: HttpAuthApi },
    { provide: PLAYER_API,   useExisting: HttpPlayerApi },
    { provide: WORLD_API,    useExisting: HttpWorldApi },
    { provide: GAME_API,     useExisting: HttpGameApi },
    { provide: TETRIS_API, useExisting: HttpTetrisApi },
    { provide: TEMPLE_API, useExisting: HttpTempleApi },
    { provide: SNAKE_API,    useExisting: HttpSnakeApi },
    { provide: CURRENCY_API, useExisting: HttpCurrencyApi },
    { provide: COLLECTION_API, useExisting: HttpCollectionApi },
    // The gym screen injects the class directly, so the class token is aliased
    // rather than the screen being changed.
    { provide: MockPowerApi, useExisting: HttpPowerApi },
  ],
};
