import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { TetrisBootstrap,TetrisReceipt,TetrisResult,TetrisRun } from '../models/tetris.model';
export interface TetrisApi {
 getBootstrap():Observable<TetrisBootstrap>;
 startRun(requestId:string):Observable<TetrisRun>;
 finishRun(result:TetrisResult):Observable<TetrisReceipt>;
 saveSound(enabled:boolean):Observable<TetrisBootstrap>;
}
export const TETRIS_API=new InjectionToken<TetrisApi>('TETRIS_API');
