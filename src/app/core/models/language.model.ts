export type Language = 'en' | 'ru' | 'he' | 'ar';
export interface LanguagePreference { language: Language }
export const LANGUAGES: {code: Language; name: string; dir: 'ltr' | 'rtl'}[] = [
  {code:'en',name:'English',dir:'ltr'}, {code:'ru',name:'Русский',dir:'ltr'},
  {code:'he',name:'עברית',dir:'rtl'}, {code:'ar',name:'العربية',dir:'rtl'},
];
export function validLanguage(value: unknown): value is Language {
  return LANGUAGES.some(item => item.code === value);
}
