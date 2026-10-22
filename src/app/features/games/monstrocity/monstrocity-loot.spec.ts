import { searchLoot } from './monstrocity-loot';
import { Snapshot } from './monstrocity.types';
describe('search rewards',()=>{
 const snapshot=(searched:boolean,count:number,purchased=0)=>({run:{id:'run',status:'active',search:searched?null:{targetId:'crate',remainingActiveMs:500},nearby:[{id:'crate',state:searched?'searched':'available'}]},profile:{inventory:[{itemId:'water',collected:count,purchased}]}} as unknown as Snapshot);
 it('shows only the confirmed collected amount',()=>expect(searchLoot(snapshot(false,2),snapshot(true,4))).toEqual([{itemId:'water',count:2}]));
 it('does not replay on a duplicate snapshot or initial load',()=>{const s=snapshot(true,4);expect(searchLoot(s,s)).toEqual([]);expect(searchLoot(null,s)).toEqual([]);});
 it('does not announce purchases, cancelled searches, or another run',()=>{
  expect(searchLoot(snapshot(false,2),snapshot(true,2,3))).toEqual([]);
  const cancelled=snapshot(false,4);cancelled.run!.search=null;expect(searchLoot(snapshot(false,2),cancelled)).toEqual([]);
  const other=snapshot(true,4);other.run!.id='other';expect(searchLoot(snapshot(false,2),other)).toEqual([]);
 });
});
