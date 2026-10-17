import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountControlsComponent } from './account-controls.component';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleSignInService } from '../../../core/services/google-signin.service';
import { TelegramSignInService } from '../../../core/services/telegram-signin.service';
import { LanguageService } from '../../../core/i18n/language.service';

describe('Account popup dismissal', () => {
  beforeEach(() => {
    const dismissed = signal(false);
    TestBed.configureTestingModule({providers:[
      {provide:AuthService, useValue:{session:signal({anonymous:true}), dismissed, dismiss:()=>dismissed.set(true)}},
      {provide:GoogleSignInService, useValue:{}},
      {provide:TelegramSignInService, useValue:{}},
      {provide:LanguageService, useValue:{language:()=> 'en'}},
    ]});
    TestBed.overrideComponent(AccountControlsComponent, {set:{imports:[], template:`
      <button #accountToggle (click)="open() ? close() : expanded.set(true)">Account</button>
      @if (open()) { <section><input aria-label="Username"><button (click)="close()">Close</button></section> }
    `}});
  });
  it('closes on an outside touch without taking focus or reopening the guest prompt', () => {
    const fixture = TestBed.createComponent(AccountControlsComponent);
    fixture.detectChanges();
    const outside = document.createElement('button'); document.body.append(outside); outside.focus();
    outside.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, pointerType:'touch'}));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBeFalse();
    expect(document.activeElement).toBe(outside);
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    outside.remove(); fixture.destroy();
  });
  it('keeps internal interactions open and lets the toggle close then reopen it', () => {
    const fixture = TestBed.createComponent(AccountControlsComponent); fixture.detectChanges();
    fixture.nativeElement.querySelector('input').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
    expect(fixture.componentInstance.open()).toBeTrue();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    toggle.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); toggle.click(); fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBeFalse();
    toggle.click(); fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBeTrue();
    fixture.destroy();
  });
  it('still closes with Escape and restores focus to the toggle', () => {
    const fixture = TestBed.createComponent(AccountControlsComponent); fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBeFalse();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
    fixture.destroy();
  });
});
