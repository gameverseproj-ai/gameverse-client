import { Injectable,PLATFORM_ID,inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { defer,delay,of } from 'rxjs';
import { TetrisApi } from '../tetris.api';
import { TetrisResult } from '../../models/tetris.model';
import { TetrisMockServer } from './tetris-mock-server';
@Injectable({providedIn:'root'})
export class MockTetrisApi implements TetrisApi {
 private readonly browser=isPlatformBrowser(inject(PLATFORM_ID));
 private readonly server=new TetrisMockServer(this.browser?{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}:undefined);
 private respond<T>(operation:()=>T){return defer(()=>of(operation())).pipe(delay(this.browser?250:0));}
 getBootstrap(){return this.respond(()=>this.server.getBootstrap());}
 startRun(id:string){return this.respond(()=>this.server.startRun(id));}
 finishRun(result:TetrisResult){return this.respond(()=>this.server.finishRun(result));}
 saveSound(enabled:boolean){return this.respond(()=>this.server.saveSound(enabled));}
}
