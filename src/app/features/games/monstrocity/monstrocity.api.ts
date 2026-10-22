import { InjectionToken, isDevMode } from '@angular/core';
import { Bootstrap, CreateRun, Snapshot, Sync } from './monstrocity.types';
export type Command = 'pause' | 'unpause' | 'consume' | 'search' | 'talk' | 'throw' | 'sword' | 'disconnect';
export interface MonstrocityApi {
    readonly local: boolean;
    leave?(runId: string, body: Record<string, unknown>, key: string): void;
    bootstrap(): Promise<Bootstrap>;
    create(body: CreateRun, key: string): Promise<Snapshot>;
    resume(runId: string, takeover: boolean, key: string): Promise<Snapshot>;
    sync(runId: string, body: Sync): Promise<Snapshot>;
    command(runId: string, name: Command, body: Record<string, unknown>, key: string): Promise<Snapshot>;
}
export const MONSTROCITY_PREVIEW = new InjectionToken<boolean>('MONSTROCITY_PREVIEW', { providedIn: 'root', factory: () => isDevMode() && typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === '1' });
export const MONSTROCITY_API = new InjectionToken<MonstrocityApi>('MONSTROCITY_API');
export class MonstrocityError extends Error {
    constructor(readonly code: string, readonly snapshot?: Snapshot) { super(code); }
}
