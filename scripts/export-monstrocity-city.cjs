// Export client-authored geometry for Claude's backend implementation.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'monstro-city-'));
const esbuild=require('esbuild');
for(const [name,file] of [['map','monstrocity.map'],['residents','monstrocity-residents']])esbuild.buildSync({entryPoints:[path.join(root,'src/app/features/games/monstrocity',file+'.ts')],platform:'node',bundle:true,format:'cjs',outfile:path.join(out,name+'.cjs')});
const {mapFor,indoorContainerIds}=require(path.join(out,'map.cjs')),{residentRoute}=require(path.join(out,'residents.cjs'));
const map=mapFor('city-v2'),old=JSON.parse(fs.readFileSync(path.join(root,'docs/monstrocity/courtyard.manifest.json'),'utf8'));
const manifest={...old,version:map.version,playBounds:{minX:-map.extent,maxX:map.extent,minZ:-map.extent,maxZ:map.extent},buildings:map.buildings,shelterCandidates:map.shelters.map((p,i)=>({id:'shelter-'+i,position:p})),containers:map.containers,residents:map.residents,notes:[...old.notes.filter(n=>!n.includes('Residents sway')),'Residential routes and guaranteed indoor loot are specified in city-v2.rules.json. Decorative gardens and street furniture do not introduce additional collision.']};
const rules={version:map.version,districts:map.districts,enterableBuildingIds:map.buildings.filter(b=>b.interior).map(b=>b.id),guaranteedContainerIds:indoorContainerIds(map),indoorLoot:{minimumItems:1,searchOncePerRun:true,resetCollectedOnDeath:true},residentRoutes:map.residents.map(p=>residentRoute(p,map)),residentClock:'run.activeElapsedMs; paused during menus; render hidden in combat',residentInteraction:'nearby.position and distance validation must use the same route position; dialogue freezes the resident with the world'};
for(const [name,data] of [['city-v2.manifest.json',manifest],['city-v2.rules.json',rules]])fs.writeFileSync(path.join(root,'docs/monstrocity',name),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({bounds:manifest.playBounds,buildings:map.buildings.length,enterableHouses:rules.enterableBuildingIds.length,containers:map.containers.length,residents:map.residents.length,shelterCandidates:map.shelters.length}));
fs.rmSync(out,{recursive:true,force:true});
