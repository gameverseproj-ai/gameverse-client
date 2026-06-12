import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export function injectIsBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}
