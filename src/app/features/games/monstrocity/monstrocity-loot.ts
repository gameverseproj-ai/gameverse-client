import { ItemId, Snapshot } from './monstrocity.types';
export type LootReward = {itemId:ItemId;count:number};
/** Only confirmed collected deltas from a completed search; never purchases or reconnect inventory. */
export function searchLoot(previous:Snapshot|null,next:Snapshot):LootReward[]{
 if(!previous?.run || !next.run || previous.run.id!==next.run.id || next.run.status!=='active' || next.run.search)return [];
 const completed=next.run.nearby.some(p=>p.state==='searched' &&
  (p.id===previous.run!.search?.targetId || previous.run!.nearby.some(old=>old.id===p.id&&old.state==='available')));
 if(!completed)return [];
 return next.profile.inventory.flatMap(item=>{
  const before=previous.profile.inventory.find(old=>old.itemId===item.itemId)?.collected??0;
  return item.collected>before?[{itemId:item.itemId,count:item.collected-before}]:[];
 });
}
