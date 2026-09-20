import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({stdin:{contents:`export * from './src/app/core/api/mock/power-mock-server'; export * from './src/app/features/games/power/power-engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {freshPower,applyPower,damage,health,EXERCISES,strikeDamage,normalizePower,punchZone} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
let now = new Date(2026,8,13,12).getTime(), state = freshPower();
const act = action => state = applyPower(state,action,now += 500,true);
assert.equal(damage(20,75),50);
assert.ok(damage(20,75)>damage(20,0));
const initial = structuredClone(state);
act({type:'hit',mode:'battle',pull:1,aim:0});
assert.equal(state.hp,130); assert.equal(initial.hp,180);
for(let i=0;i<3;i++) act({type:'hit',mode:'battle',pull:1,aim:0});
assert.equal(state.stage,2); assert.equal(state.wins,1);assert.equal(state.hp,health(2));assert.ok(health(2)>health(1));
const battleHp=state.hp;
act({type:'hit',mode:'machine',pull:1,aim:0});assert.equal(state.best,500);assert.equal(state.hp,battleHp);
act({type:'hit',mode:'machine',pull:0,aim:0});assert.equal(state.best,500);
for(let i=0;i<3;i++)for(let j=0;j<EXERCISES[i].reps;j++)act({type:'rep',exercise:i});
assert.equal(state.strength,50);
assert.throws(()=>applyPower(state,{type:'rep',exercise:0},now+500));
assert.throws(()=>applyPower(state,{type:'hit',mode:'battle',pull:NaN,aim:0},now+500));
assert.throws(()=>applyPower(state,{type:'hit',mode:'battle',pull:1,aim:0},now+100));
now+=86400000;act({type:'rep',exercise:0});assert.equal(state.reps[0],1);assert.ok(state.reps.slice(1).every(v=>v===0));assert.equal(state.strength,50);assert.equal(state.stage,2);
assert.equal(damage(state.strength,75),125);
console.log('PASS: timing, damage, immutable state, knockout progression, machine isolation, records, daily rewards, duplicate rejection, cooldown, day rollover.');

assert.equal(strikeDamage(20,1,.8),0); assert.equal(strikeDamage(20,1,0),50); assert.ok(strikeDamage(20,.5,0)<50);

assert.equal(EXERCISES.length,60);assert.equal(new Set(EXERCISES.map(e=>e.id)).size,60);
let set = normalizePower(freshPower(),now);const assigned=set.assigned[0];
assert.equal(set.assigned.length,3);assert.equal(new Set(set.assigned).size,3);
assert.throws(()=>applyPower(set,{type:'rep',exercise:EXERCISES.find(e=>!set.assigned.includes(e.index)).index},now+500));
set=applyPower(set,{type:'rep',exercise:assigned},now+=500);
assert.equal(normalizePower(set,now+9999).reps[assigned],1);
assert.equal(normalizePower(set,now+10000).reps[assigned],0);
set=applyPower(set,{type:'rep',exercise:assigned},now+=10000);assert.equal(set.reps[assigned],1);
for(let i=1;i<EXERCISES[assigned].reps;i++)set=applyPower(set,{type:'rep',exercise:assigned},now+=900);
const strength=set.strength;set=normalizePower(set,now+20000);assert.equal(set.reps[assigned],EXERCISES[assigned].reps);assert.equal(set.strength,strength);
assert.throws(()=>applyPower(set,{type:'rep',exercise:assigned},now+20500));
const migrated=normalizePower({...freshPower(),reps:[4,10,0],repTimes:undefined,assigned:undefined,day:set.day,strength:30},now);
assert.equal(migrated.reps.length,60);assert.equal(migrated.reps[0],0);assert.equal(migrated.reps[1],10);assert.equal(migrated.strength,30);
console.log('PASS: 60 unique tasks, server assignment, unassigned rejection, 9999/10000ms boundary, restart at one, completed reward retention and migration.');

assert.equal(punchZone(0,-.6),'head');assert.equal(punchZone(0,.6),'body');assert.equal(punchZone(.9,-.6),null);assert.equal(punchZone(0,1),null);
assert.ok(strikeDamage(20,1,0,-.6)>0);assert.ok(strikeDamage(20,1,0,.6)>0);assert.equal(strikeDamage(20,1,.9,-.6),0);
assert.throws(()=>applyPower(state,{type:'hit',mode:'battle',pull:1,aim:0,aimY:NaN},now+500));
console.log('PASS: head/body hit zones, vertical misses, invalid vertical aim rejection.');

// Strong and untrained players face a similar number of well-aimed punches.
for (const strength of [20, 50, 500, 5000]) {
  for (const stage of [1, 2, 10, 20, 50, 100]) {
    const hits = Math.ceil(health(stage, strength) / strikeDamage(strength, 1, 0));
    assert.ok(hits >= 4 && hits <= 9, `Balanced fight at stage ${stage}, strength ${strength}`);
    assert.ok(health(stage + 1, strength) >= health(stage, strength));
  }
}
let evolving = freshPower();
for (let stage = 1; stage <= 30; stage++) {
  const previousMax = evolving.maxHp;
  evolving = {...evolving, strength: 20 + stage * 30, hp: 1};
  const next = applyPower(evolving, {type:'hit',mode:'battle',pull:1,aim:0}, now += 500);
  assert.equal(next.stage, stage + 1);
  assert.equal(next.hp, next.maxHp);
  assert.equal(next.maxHp, health(next.stage, evolving.strength));
  assert.ok(next.maxHp > previousMax);
  assert.deepEqual(normalizePower(next, now + 1), next, 'Reload never recalculates active challenger HP');
  evolving = next;
}
let trainee = {...normalizePower(freshPower(), now), hp: 90};
for (let rep = 0; rep < EXERCISES[0].reps; rep++) trainee = applyPower(trainee, {type:'rep',exercise:0}, now += 500, true);
assert.ok(trainee.strength > 20);
assert.equal(trainee.hp, 90, 'Training does not heal the current opponent');
assert.equal(trainee.maxHp, 180, 'Training does not move the current HP goal');
const legacy = {...freshPower(), stage: 2, strength: 500, hp: 229};
delete legacy.maxHp;
const upgraded = normalizePower(legacy, now);
assert.equal(upgraded.maxHp, health(2,500));
assert.ok(Math.abs(upgraded.hp / upgraded.maxHp - .5) < .002, 'Legacy half-damaged opponent stays half damaged');
assert.deepEqual(normalizePower(upgraded, now), upgraded, 'Migration is idempotent');
console.log('PASS: strength-scaled difficulty, 30 consecutive levels, fixed mid-fight HP, and damage-preserving legacy migration.');
