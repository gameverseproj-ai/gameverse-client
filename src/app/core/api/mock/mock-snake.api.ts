import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { defer, delay, of } from 'rxjs';
import { SnakeApi } from '../snake.api';
import { SnakeFinishRequest, SnakePreferences } from '../../models/snake.model';
import { SnakeMockServer } from './snake-mock-server';

@Injectable({providedIn:'root'})
export class MockSnakeApi implements SnakeApi {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly server = new SnakeMockServer(this.browser ? {
    getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
  } : undefined);
  private respond<T>(operation: () => T) {
    return defer(() => of(operation())).pipe(delay(this.browser ? 350 : 0));
  }
  getBootstrap() { return this.respond(() => this.server.getBootstrap()); }
  startRun(id: string) { return this.respond(() => this.server.startRun(id)); }
  finishRun(result: SnakeFinishRequest) { return this.respond(() => this.server.finishRun(result)); }
  savePreferences(settings: SnakePreferences) { return this.respond(() => this.server.savePreferences(settings)); }
}
