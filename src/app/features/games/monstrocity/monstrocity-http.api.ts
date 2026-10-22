import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable, retry, timer, throwError, timeout, TimeoutError } from 'rxjs';
import { SessionStore } from '../../../core/api/http/session.store';
import { ApiError } from '../../../core/api/http/api-error';
import { API_BASE_URL } from '../../../core/api/http/api-config';
import { MonstrocityApi, Command, MonstrocityError } from './monstrocity.api';
import { Bootstrap, CreateRun, Snapshot, Sync } from './monstrocity.types';
/** Real server adapter. Retries preserve the exact body, input sequence and idempotency key. */
@Injectable({ providedIn: 'root' })
export class HttpMonstrocityApi implements MonstrocityApi {
    readonly local = false;
    private http = inject(HttpClient);
    private session = inject(SessionStore);
    private url = inject(API_BASE_URL) + '/api/monstrocity';
    bootstrap() { return this.response(this.http.get<Bootstrap>(this.url + '/bootstrap')); }
    create(body: CreateRun, key: string) { return this.post('/runs', body, key); }
    resume(id: string, takeover: boolean, key: string) { return this.post(`/runs/${encodeURIComponent(id)}/resume`, { takeover }, key); }
    sync(id: string, body: Sync) { return this.post(`/runs/${encodeURIComponent(id)}/sync`, body); }
    async command(id: string, name: Command, body: Record<string, unknown>, key: string) {
        const path = `/runs/${encodeURIComponent(id)}/${name}`;
        try { return await this.post(path, body, key); }
        catch (error) {
            // A revision rejection has not applied the command. Retry the user's intent once,
            // only while the same session still owns the same living run.
            if (error instanceof MonstrocityError && error.code === 'REVISION_CONFLICT' &&
                error.snapshot?.run?.id === id && error.snapshot.run.status === 'active' &&
                error.snapshot.session?.id === body['sessionId'])
                return this.post(path, {...body, expectedRevision:error.snapshot.run.revision}, crypto.randomUUID());
            throw error;
        }
    }
    /** Page unload cannot await HttpClient; keep the authenticated leave alive through navigation. */
    leave(id: string, body: Record<string, unknown>, key: string) {
        const token = this.session.token();
        if (!token) return;
        void fetch(`${this.url}/runs/${encodeURIComponent(id)}/disconnect`, {
            method: 'POST', keepalive: true,
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': key},
            body: JSON.stringify(body),
        }).catch(() => {}); // Resume reconciles a missed leave; never forge a local result.
    }
    private post(path: string, body: unknown, key?: string) { return this.response(this.http.post<Snapshot>(this.url + path, body, { headers: key ? { 'Idempotency-Key': key } : {} })); }
    private async response<T>(request: Observable<T>): Promise<T> {
        try {
            return await firstValueFrom(request.pipe(timeout(3500), retry({count: 1, delay: error => {
                const status = error instanceof ApiError || error instanceof HttpErrorResponse ? error.status : -1;
                return error instanceof TimeoutError || [0, 500, 502, 503, 504].includes(status) ? timer(200) : throwError(() => error);
            }})));
        }
        catch (error) {
            const body = error instanceof HttpErrorResponse ? error.error : error instanceof ApiError ? error.body : null;
            if (body && typeof (body as {code?: unknown}).code === 'string') {
                const detail = body as {code: string; snapshot?: Snapshot | null};
                throw new MonstrocityError(detail.code, detail.snapshot ?? undefined);
            }
            throw error;
        }
    }
}
