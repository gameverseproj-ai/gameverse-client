import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CollectionsComponent } from './collections.component';
import { CollectionsFacade } from '../../core/facades/collections.facade';
import { LanguageService } from '../../core/i18n/language.service';

describe('Album language changes', () => {
  it('loads on mount and reloads when the saved language changes', () => {
    const language = signal('en');
    const loadCollections = jasmine.createSpy('loadCollections');
    TestBed.configureTestingModule({ providers: [
      { provide: CollectionsFacade, useValue: { loadCollections } },
      { provide: LanguageService, useValue: { language } },
    ] });
    TestBed.overrideComponent(CollectionsComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(CollectionsComponent);
    fixture.detectChanges(); TestBed.flushEffects(); fixture.detectChanges();
    expect(loadCollections).toHaveBeenCalledTimes(1);
    language.set('he'); fixture.detectChanges(); TestBed.flushEffects(); fixture.detectChanges();
    expect(loadCollections).toHaveBeenCalledTimes(2);
    language.set('ar'); fixture.detectChanges(); TestBed.flushEffects(); fixture.detectChanges();
    expect(loadCollections).toHaveBeenCalledTimes(3);
    fixture.destroy();
  });
});
