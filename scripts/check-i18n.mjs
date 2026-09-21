import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`import '@angular/compiler';
export {translate} from './src/app/core/i18n/translate';
export {CATALOG} from './src/app/core/i18n/catalog';
export {LanguageService} from './src/app/core/i18n/language.service';
export {MockPlayerApi} from './src/app/core/api/mock/mock-player.api';
export {PLAYER_API} from './src/app/core/api/player.api';
export {createEnvironmentInjector,runInInjectionContext,PLATFORM_ID} from '@angular/core';
export {DOCUMENT} from '@angular/common';
export {firstValueFrom} from 'rxjs';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {translate,CATALOG,LanguageService,MockPlayerApi,PLAYER_API,DOCUMENT,createEnvironmentInjector,runInInjectionContext,PLATFORM_ID,firstValueFrom}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const placeholders=s=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
for(const [key,locales] of Object.entries(CATALOG))for(const lang of ['ru','he','ar']){
 assert.ok(locales[lang]?.trim(),`${lang}: ${key}`);
 assert.deepEqual(placeholders(locales[lang]),placeholders(key),`${lang}: ${key}`);
 assert.ok(!/<[a-z]/i.test(locales[lang]),'Plain-text messages only');
}
assert.equal(translate('LEVEL 6','ru'),'Уровень 6');
assert.equal(translate('Preparing Snake Hall…','ru'),'Готовим Зал змейки…');
assert.equal(translate('LEVEL 6','en'),'LEVEL 6');
assert.equal(translate('Unrecognized server message','ar'),'Unrecognized server message');
assert.equal(translate(42,'ar'),new Intl.NumberFormat('ar').format(42));
const original=globalThis.localStorage, storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const document={documentElement:{lang:'en',dir:'ltr'}};
const injector=createEnvironmentInjector([{provide:PLATFORM_ID,useValue:'browser'},{provide:PLAYER_API,useClass:MockPlayerApi},{provide:DOCUMENT,useValue:document}]);
try {
 const api=injector.get(PLAYER_API);const locale=runInInjectionContext(injector,()=>new LanguageService());locale.init();
 assert.equal(locale.language(),'en');
 for(const language of ['ru','he','ar','en']){
  locale.select(language);assert.equal(locale.language(),language);assert.equal(document.documentElement.lang,language);
  assert.equal(document.documentElement.dir,['he','ar'].includes(language)?'rtl':'ltr');
  const reopened=runInInjectionContext(injector,()=>new MockPlayerApi());assert.deepEqual(await firstValueFrom(reopened.getLanguagePreference()),{language});
  assert.equal((await firstValueFrom(reopened.getProfile())).language,language);
 }
 const before=new Map(storage);locale.select('fr');assert.equal(locale.language(),'en');assert.deepEqual(storage,before);
 await assert.rejects(firstValueFrom(api.saveLanguagePreference({language:'fr'})));
 globalThis.localStorage.setItem=()=>{throw new Error('Storage unavailable');};
 locale.select('ar');assert.equal(locale.language(),'en');assert.equal(document.documentElement.dir,'ltr');assert.ok(locale.error());assert.equal(locale.busy(),false);
 assert.deepEqual(storage,before);
}finally{injector.destroy();globalThis.localStorage=original;}
console.log(`PASS: ${Object.keys(CATALOG).length} messages in 3 translated languages, parameters, dynamic feedback, four account languages, persisted reload, profile API, RTL and failed saves.`);
