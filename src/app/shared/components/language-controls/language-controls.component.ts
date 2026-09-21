import { Component, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { LANGUAGES } from '../../../core/models/language.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
@Component({selector:'app-language-controls',standalone:true,imports:[TranslatePipe],template:`
<label><span aria-hidden="true">◎</span><select [attr.aria-label]="'Language' | t" [value]="locale.language()" [disabled]="locale.busy()" (change)="change($event)">
@for (language of languages; track language.code) { <option [value]="language.code" [selected]="language.code === locale.language()" [attr.lang]="language.code" [attr.dir]="language.dir">{{ language.name }}</option> }
</select></label>
@if (locale.error()) { <div class="error" role="alert">{{ locale.error() | t }} <button (click)="locale.load()">{{ 'Try again' | t }}</button></div> }
`,styles:[`:host{display:block;position:relative;z-index:120;color:#fff}label{display:flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid #b79dd34d;border-radius:20px;background:#211c35ed}select{max-width:100px;background:transparent;border:0;color:inherit;font:inherit;font-size:12px;cursor:pointer}option{color:#fff;background:#211c35}select:focus-visible{outline:2px solid #f1c5ff}select:disabled{opacity:.5}.error{position:absolute;inset-inline-end:0;top:100%;width:230px;background:#392342;padding:12px;border-radius:12px;font-size:12px}button{font:inherit;cursor:pointer}:host(.floating){position:fixed;top:88px;left:50%;transform:translateX(-50%)}@media(max-width:650px){:host(.floating){top:78px;left:auto;right:145px;transform:none}select{max-width:82px}}`],})
export class LanguageControlsComponent {
 readonly locale = inject(LanguageService);
 readonly languages = LANGUAGES;
 change(event: Event): void { const select = event.target as HTMLSelectElement; this.locale.select(select.value); select.value = this.locale.language(); }
}
