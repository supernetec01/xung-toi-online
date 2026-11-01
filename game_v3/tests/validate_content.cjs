const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['data.js','activities.js','rules.js','gameplay.js','navigation.js']) vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),ctx,{filename:file});
const d=ctx.window.PARISH_DATA, acts=ctx.window.PARISH_ACTIVITIES;
assert.equal(Object.keys(d.scenes).length,11,'11 scenes');
assert.equal(d.quests.length,11,'11 quests');
assert.ok(Object.keys(d.npcs).length>=10,'NPC pool');
const qids=new Set(d.quests.map(q=>q.id)); assert.equal(qids.size,d.quests.length,'unique quest ids');
for(const [id,sc] of Object.entries(d.scenes)){
 assert.ok(sc.entry.length===2 && sc.entry.every(x=>Number.isFinite(x)&&x>=0&&x<=100),`invalid scene entry ${id}`);
 for(const npc of sc.npc) assert.ok(d.npcs[npc],`missing npc ${npc}`);
 assert.equal(new Set(sc.spots.map(s=>s[0])).size,sc.spots.length,`duplicate hotspot ${id}`);
 for(const spot of sc.spots){
  assert.ok(spot.length>=6 && spot[3]>=0 && spot[3]<=100 && spot[4]>=0 && spot[4]<=100,`invalid spot ${id}`);
  if(spot[5]==='go') assert.ok(d.scenes[spot[6]],`missing scene ${spot[6]}`);
  if(spot[5]==='activity_hub') assert.equal(acts.filter(a=>a.scene===id).length>0,true,`empty action hub ${id}`);
 }
}
for(const q of d.quests){
 assert.ok(d.npcs[q.giverId],`quest giver ${q.id}`);assert.equal(q.guidance.length,q.steps.length);for(const t of q.guidance){assert.ok(d.scenes[t.scene]);if(t.npc)assert.ok(d.scenes[t.scene].npc.includes(t.npc));if(t.spot)assert.ok(d.scenes[t.scene].spots.some(s=>s[0]===t.spot));if(t.spots)for(const id of t.spots)assert.ok(d.scenes[t.scene].spots.some(s=>s[0]===id));}
 assert.ok(q.steps.length && q.steps.every(s=>s[1]>=1),`steps ${q.id}`);
 assert.ok(Number.isInteger(q.rewardCoins)&&q.rewardCoins>0);
 for(const dep of q.requires) assert.ok(qids.has(dep),`missing dependency ${dep}`);
}
let active=new Set(),done=new Set();function dfs(id){if(done.has(id))return; assert.ok(!active.has(id),`quest cycle ${id}`);active.add(id);for(const x of d.quests.find(q=>q.id===id).requires)dfs(x);active.delete(id);done.add(id);} for(const id of qids)dfs(id);
const items=new Set();for(const i of d.items){assert.ok(['top','bottom','shoes','hair','acc'].includes(i.slot));assert.ok(!items.has(i.id),`item duplicate ${i.id}`);items.add(i.id);assert.ok(Number.isInteger(i.price)&&i.price>=0);assert.ok(!('level' in i)&&!('kindnessPrice' in i));}
for(const q of Object.values(d.quizzes)){assert.ok(q.correct>=0&&q.correct<q.choices.length);assert.ok(d.quests.some(quest=>quest.steps.some(s=>s[0]===q.event)));}
assert.equal(acts.length,14);const aIds=new Set();for(const a of acts){assert.ok(!aIds.has(a.id));aIds.add(a.id);assert.ok(d.scenes[a.scene]);assert.ok(a.cooldown>=60&&a.cooldown<=600);assert.ok(a.coins>0&&a.coins<=100);assert.ok(a.seconds>0&&a.seconds<=30);}
console.log(`PASS catalog: ${Object.keys(d.scenes).length} scenes / ${Object.keys(d.npcs).length} NPC / ${d.quests.length} quests / ${d.items.length} items / ${acts.length} activities`);
