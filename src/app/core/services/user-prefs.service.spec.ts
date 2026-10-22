import { TestBed } from '@angular/core/testing';
import { UserPrefsService } from './user-prefs.service';
import { SessionStore } from '../api/http/session.store';
describe('Monstrocity user preferences', () => {
  let playerId: string;
  let service: UserPrefsService;
  const keys=['gameverse.user-prefs.v1.avatar-test-a','gameverse.user-prefs.v1.avatar-test-b','gameverse.user-prefs.v1.monstrocity-preview'];
  beforeEach(()=>{keys.forEach(k=>localStorage.removeItem(k));playerId='avatar-test-a';TestBed.configureTestingModule({providers:[{provide:SessionStore,useValue:{read:()=>({playerId})}}]});service=TestBed.inject(UserPrefsService);});
  afterEach(()=>keys.forEach(k=>localStorage.removeItem(k)));
  it('restores a selection before a journey has been created',()=>{service.setAvatar('male');expect(TestBed.runInInjectionContext(()=>new UserPrefsService()).avatar()).toBe('male');});
  it('isolates users and preview',()=>{service.setAvatar('female');playerId='avatar-test-b';expect(service.avatar()).toBeNull();service.setAvatar('male',true);expect(service.avatar()).toBeNull();playerId='avatar-test-a';expect(service.avatar()).toBe('female');expect(service.avatar(true)).toBe('male');});
  it('preserves other preferences and rejects invalid values',()=>{localStorage.setItem(keys[0],JSON.stringify({volume:.3,monstrocityAvatar:'invalid'}));expect(service.avatar()).toBeNull();service.setAvatar('male');expect(JSON.parse(localStorage.getItem(keys[0])!).volume).toBe(.3);});
  it('recovers from corrupt storage',()=>{localStorage.setItem(keys[0],'{');expect(service.avatar()).toBeNull();service.setAvatar('female');expect(service.avatar()).toBe('female');});
});
