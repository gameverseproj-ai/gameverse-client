import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsernameEditorComponent } from './username-editor.component';
import { AuthService } from '../../../core/services/auth.service';
import { AUTH_API } from '../../../core/api/auth.api';
import { HttpAuthApi } from '../../../core/api/http/http-auth.api';
import { API_BASE_URL } from '../../../core/api/http/api-config';
import { SessionStore } from '../../../core/api/http/session.store';
import { PlayerFacade } from '../../../core/facades/player.facade';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthResponse } from '../../../core/models/auth.model';

const session: AuthResponse = {token:'test-token', userId:'user', playerId:'player', anonymous:true, language:'en', identities:[],
  profile:{username:'Guest', firstName:null, lastName:null, email:null, avatarUrl:null, language:'en'}};

describe('Username editor', () => {
  const profile = signal({id:'player', username:'Guest'});
  beforeEach(() => {
    profile.set({id:'player', username:'Guest'});
    TestBed.configureTestingModule({providers:[
      provideHttpClient(), provideHttpClientTesting(),
      {provide:API_BASE_URL, useValue:''}, {provide:AUTH_API, useExisting:HttpAuthApi},
      {provide:PlayerFacade, useValue:{profile}},
      {provide:LanguageService, useValue:{language:()=>'en', t:(value:unknown)=>String(value)}},
    ]});
    TestBed.inject(AuthService).session.set(session);
    TestBed.inject(SessionStore).save(session);
  });
  afterEach(() => {TestBed.inject(HttpTestingController).verify(); TestBed.inject(SessionStore).clear();});
  function setup() {
    const fixture = TestBed.createComponent(UsernameEditorComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('shows the current username and saves the returned session and profile', () => {
    const fixture = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('Guest');
    input.value = '  New Player  '; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', {cancelable:true}));
    fixture.detectChanges();
    expect(input.disabled).toBeTrue();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/me/username');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({username:'New Player'});
    const updated = {...session, token:'new-token', profile:{...session.profile, username:'New Player'}};
    request.flush(updated); fixture.detectChanges();
    expect(TestBed.inject(AuthService).session()).toEqual(updated);
    expect(TestBed.inject(SessionStore).read()).toEqual(updated);
    expect(profile().username).toBe('New Player');
    expect(input.value).toBe('New Player');
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Username updated.');
    fixture.destroy();
  });
  it('preserves the saved name after a server error and allows retry', () => {
    const fixture = setup();
    fixture.componentInstance.draft.set('New Player');
    fixture.componentInstance.save(new Event('submit'));
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me/username').flush({}, {status:500,statusText:'Error'});
    fixture.detectChanges();
    expect(TestBed.inject(AuthService).session()!.profile.username).toBe('Guest');
    expect(profile().username).toBe('Guest');
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    expect(fixture.componentInstance.draft()).toBe('New Player');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeFalse();
    fixture.destroy();
  });
  it('offers the server\'s free variant when the name is taken and saves it on a tap', () => {
    const fixture = setup();
    fixture.componentInstance.draft.set('Neon Ace');
    fixture.componentInstance.save(new Event('submit'));
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me/username').flush(
      {status:409, error:'Conflict', message:'taken', code:'USERNAME_TAKEN', suggestion:'Neon Ace 2'},
      {status:409, statusText:'Conflict'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('already taken');
    const offer: HTMLButtonElement = fixture.nativeElement.querySelector('.suggestion button');
    expect(offer.textContent?.trim()).toBe('Neon Ace 2');
    offer.click(); fixture.detectChanges();
    const retry = TestBed.inject(HttpTestingController).expectOne('/api/auth/me/username');
    expect(retry.request.body).toEqual({username:'Neon Ace 2'});
    retry.flush({...session, profile:{...session.profile, username:'Neon Ace 2'}}); fixture.detectChanges();
    expect(fixture.componentInstance.draft()).toBe('Neon Ace 2');
    expect(fixture.nativeElement.querySelector('.suggestion')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Username updated.');
    fixture.destroy();
  });
  it('does not submit blank, overlong, or unchanged names', () => {
    const fixture = setup();
    for (const value of ['Guest', '   ', 'a'.repeat(101)]) {
      fixture.componentInstance.draft.set(value);
      fixture.componentInstance.save(new Event('submit'));
    }
    TestBed.inject(HttpTestingController).expectNone('/api/auth/me/username');
    fixture.destroy();
  });
});
