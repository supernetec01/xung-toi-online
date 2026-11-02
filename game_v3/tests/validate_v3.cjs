const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['data.js','lessons.js','activities.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),ctx);
const a=ctx.window.PARISH_ACTIVITIES,sc=ctx.window.PARISH_DATA.scenes;
assert.strictEqual(a.length,14,'14 repeatable activities');
assert.strictEqual(new Set(a.map(x=>x.id)).size,a.length,'unique action ids');
for(const x of a){assert(sc[x.scene],`missing scene ${x.scene}`);assert(x.cooldown>=60&&x.cooldown<=600,`cooldown bounds for ${x.id}`);assert(x.coins>0,`reward for ${x.id}`)}
const hubs=Object.values(sc).filter(s=>s.spots.some(x=>x[5]==='activity_hub'));
assert.strictEqual(hubs.length,8,'8 scenes with one action hub');
for(const s of hubs)assert.strictEqual(s.spots.filter(x=>x[5]==='activity_hub').length,1,'only one hub per scene');
const app=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
assert(!app.includes('levelling('),'removed level progression');
assert(app.includes('data-activity-button'),'timer inside action button');
// Cooldown persistence is exercised through reload and scene travel in tests/e2e.cjs.
assert(app.includes('donorConsent'),'donor opt-in');
assert(app.includes('QR NGÂN HÀNG'),'QR pending configuration UI');
console.log('✓ 14 activities, 1-10 minute cooldown, unique IDs, valid scenes');
console.log('✓ 8 activity hubs, no level progression, timer, donor consent, QR placeholder');
