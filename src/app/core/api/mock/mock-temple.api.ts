import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { defer, delay, of } from 'rxjs';
import { TempleApi } from '../temple.api';
import { TempleMove } from '../../models/temple.model';
import { TempleMockServer } from './temple-mock-server';
@Injectable({providedIn:'root'})
export class MockTempleApi implements TempleApi {
  private readonly browser=isPlatformBrowser(inject(PLATFORM_ID));
  private readonly server=new TempleMockServer(this.browser?{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}:undefined);
  private respond<T>(operation:()=>T){return defer(()=>of(operation())).pipe(delay(this.browser?100:0));}
  getBootstrap(){return this.respond(()=>this.server.getBootstrap());}
  startRun(id:string){return this.respond(()=>this.server.startRun(id));}
  move(request:TempleMove){return this.respond(()=>this.server.move(request));}
}
