import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/api/http/api-config';
import { HttpMonstrocityApi } from './monstrocity-http.api';
import { MonstrocityError } from './monstrocity.api';
import { serverApiInterceptor } from '../../../core/api/http/server-api.interceptor';
import { SessionStore } from '../../../core/api/http/session.store';
import { SessionGate } from '../../../core/api/http/session.gate';
import { freshState, LocalMonstrocityApi } from './monstrocity-local.api';
describe('Monstrocity HTTP boundary', () => {
    let api: HttpMonstrocityApi, http: HttpTestingController;
    beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([serverApiInterceptor])), provideHttpClientTesting(), {provide: SessionStore, useValue: {token: () => 'test-token', clear: () => {}}}, {provide: SessionGate, useValue: {}}, { provide: API_BASE_URL, useValue: '' }] }); api = TestBed.inject(HttpMonstrocityApi); http = TestBed.inject(HttpTestingController); });
    afterEach(() => http.verify());
    it('reads bootstrap without beginning a session', async () => { const result = api.bootstrap(); const r = http.expectOne('/api/monstrocity/bootstrap'); expect(r.request.method).toBe('GET'); r.flush({ config: { version: 'v1' }, snapshot: freshState() }); expect((await result).snapshot.run).toBeNull(); });
    it('preserves the supplied idempotency key and revision on a sword command', async () => { const body = { sessionId: 'session', expectedRevision: 17, encounterId: 'fight' }; const result = api.command('run', 'sword', body, 'same-key'); const r = http.expectOne('/api/monstrocity/runs/run/sword'); expect(r.request.headers.get('Idempotency-Key')).toBe('same-key'); expect(r.request.body).toEqual(body); r.flush(freshState()); await result; });
    it('sends only directional input frames and the session in sync', async () => { const body = { sessionId: 'session', frames: [{ sequence: 2, moveX: .2, moveZ: 0 }] }; const result = api.sync('run', body); const r = http.expectOne('/api/monstrocity/runs/run/sync'); expect(r.request.body).toEqual(body); expect(r.request.headers.has('Idempotency-Key')).toBeFalse(); r.flush(freshState()); await result; });
    it('preserves server conflict snapshots for the reconnect UI', async () => {
        const snapshot = freshState();
        const result = api.resume('run', false, 'resume-key');
        const rejected = expectAsync(result).toBeRejectedWith(new MonstrocityError('SESSION_CONFLICT', snapshot));
        http.expectOne('/api/monstrocity/runs/run/resume').flush({ code: 'SESSION_CONFLICT', snapshot }, { status: 409, statusText: 'Conflict' });
        await rejected;
    });
    it('retries a lost command response with the same idempotency key and body', fakeAsync(() => {
        const body = {sessionId:'session', expectedRevision:3, itemId:'food'};
        let result: unknown;
        api.command('run','consume',body,'stable-key').then(value => result=value);
        const first=http.expectOne('/api/monstrocity/runs/run/consume');
        expect(first.request.headers.get('Authorization')).toBe('Bearer test-token');
        first.error(new ProgressEvent('error'));tick(200);
        const retry=http.expectOne('/api/monstrocity/runs/run/consume');
        expect(retry.request.headers.get('Idempotency-Key')).toBe('stable-key');
        expect(retry.request.body).toEqual(body);
        retry.flush(freshState());flushMicrotasks();expect((result as {run: unknown}).run).toBeNull();
    }));
    it('sends an authenticated keepalive leave on page unload', () => {
        const send=spyOn(window,'fetch').and.resolveTo(new Response('{}'));
        api.leave('run',{sessionId:'session',expectedRevision:7},'leave-key');
        expect(send).toHaveBeenCalledWith('/api/monstrocity/runs/run/disconnect',jasmine.objectContaining({keepalive:true,method:'POST',headers:jasmine.objectContaining({Authorization:'Bearer test-token','Idempotency-Key':'leave-key'})}));
    });
    it('rebases a rejected revision once without changing session ownership', async () => {
        const local=new LocalMonstrocityApi({getItem:()=>null,setItem:()=>{}});
        const snapshot=await local.create({character:'female',configVersion:local.config.version},'fixture');
        snapshot.run!.id='run';snapshot.run!.revision=7;snapshot.session!.id='session';
        const body={sessionId:'session',expectedRevision:3,reason:'map'};
        const result=api.command('run','pause',body,'original-key');
        http.expectOne('/api/monstrocity/runs/run/pause').flush({code:'REVISION_CONFLICT',snapshot},{status:409,statusText:'Conflict'});
        await new Promise(resolve=>setTimeout(resolve,0));
        const second=http.expectOne('/api/monstrocity/runs/run/pause');
        expect(second.request.body).toEqual({...body,expectedRevision:7});
        expect(second.request.headers.get('Idempotency-Key')).not.toBe('original-key');
        second.flush(snapshot);expect((await result).run!.revision).toBe(7);
    });
});
