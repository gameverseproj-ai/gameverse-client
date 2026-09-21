import { Language } from '../models/language.model';
import { CATALOG } from './catalog';
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.keys(CATALOG).filter(key => /\{\d+\}/.test(key)).sort((a,b) => b.length-a.length).map(key => ({
  key, pattern: new RegExp('^'+key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? '(.*?)' : escape(part)).join('')+'$', 'i'),
}));
const insensitive = new Map(Object.keys(CATALOG).map(key => [key.toLowerCase(), key]));
/** Source-key messages support API text and parameterized feedback without HTML insertion. */
export function translate(value: unknown, language: Language, params?: readonly unknown[], depth = 0): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return new Intl.NumberFormat(language).format(value);
  const source = normalize(String(value));
  if (language === 'en') return params ? source.replace(/\{(\d+)\}/g, (_, index) => translate(params[Number(index)], language)) : source;
  const key = CATALOG[source] ? source : insensitive.get(source.toLowerCase());
  if (key) {
    const message = CATALOG[key][language];
    return params ? message.replace(/\{(\d+)\}/g, (_, index) => translate(params[Number(index)],language,undefined,depth+1)) : message;
  }
  if (params) return source.replace(/\{(\d+)\}/g, (_,index) => translate(params[Number(index)],language,undefined,depth+1));
  if (depth < 4) for (const entry of patterns) {
    const match = entry.pattern.exec(source);
    if (match) return translate(entry.key, language, match.slice(1), depth+1);
  }
  return source;
}
