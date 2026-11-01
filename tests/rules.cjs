const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const ctx = { window: {} };
vm.createContext(ctx);
for (const file of ['data', 'activities', 'rules', 'gameplay', 'navigation'])
  vm.runInContext(fs.readFileSync(`game_v3/src/${file}.js`, 'utf8'), ctx);
const { PARISH_DATA: D, PARISH_ACTIVITIES: ACT, PARISH_RULES: R, PARISH_NAV: N } = ctx.window;
let tests = 0;
const check = (name, fn) => {
  fn();
  tests++;
  console.log('PASS', name);
};
check('all NPCs and interactive targets reachable without crossing blockers', () => {
  for (const [id, sc] of Object.entries(D.scenes)) {
    const targets = [
      ...Object.values(sc.npcPoints).map(([x, y]) => [x + 5, y + 3]),
      ...sc.spots.map((s) => sc.anchors[s[0]] || [s[3], s[4]]),
      ...ACT.filter((a) => a.scene === id).map((a) => a.anchor),
    ];
    for (const t of targets) {
      const route = N.route(sc, sc.entry, t);
      assert(route.length, `${id}: ${t}`);
      for (let i = 1; i < route.length; i++)
        assert(N.segment(sc, route[i - 1], route[i]), `${id}: crossed obstacle`);
    }
  }
  assert(!N.walkable(D.scenes.nave, 50, 45), 'sanctuary protected');
  assert(!N.walkable(D.scenes.office, 50, 80), 'table protected');
});
check('all 11 quests, dependencies, distinct targets, one reward', () => {
  const s = R.migrate(null, D);
  let reward = 150;
  for (const q of D.quests) {
    if (q.id !== 'q_welcome') assert(R.accept(s, D, q.id), q.id);
    assert(!R.claim(s, D, q.id), 'cannot claim early');
    for (const [event, n] of q.steps) {
      for (let i = 0; i < n; i++) {
        R.record(s, D, event, 'target:' + i);
        R.record(s, D, event, 'target:' + i);
      }
    }
    assert.equal(R.status(s, q), 'ready', q.id);
    assert(R.claim(s, D, q.id));
    assert(!R.claim(s, D, q.id));
    reward += q.rewardCoins;
    assert.equal(s.coins, reward);
  }
  assert.equal(s.claimed.length, 11);
  assert.equal(s.coins, 745);
});
check('all 14 activities: scene, simultaneous start, early complete, cooldown and replay', () => {
  const s = R.migrate(null, D);
  let coins = 150;
  for (const a of ACT) {
    s.scene = a.scene;
    const now = 1000000;
    assert(R.start(s, ACT, a.id, now, a.id));
    assert(!R.start(s, ACT, a.id, now, 'duplicate'));
    assert.equal(R.complete(s, ACT, a.id, now), null);
    assert(R.complete(s, ACT, a.id, now + a.seconds * 1000));
    assert.equal(R.complete(s, ACT, a.id, now + a.seconds * 1000), null);
    coins += a.coins;
    assert.equal(s.coins, coins);
    assert.equal(s.cooldowns[a.id], now + (a.seconds + a.cooldown) * 1000);
    assert(!R.start(s, ACT, a.id, now + 5000, 'early'));
  }
});
check('irreversible events before acceptance remain creditable, including returned book', () => {
  const s = R.migrate(null, D);
  for (const [event, target] of [
    ['pickup_book', 'book'],
    ['return_book', 'anna'],
    ['water_flower', 'flower1'],
    ['water_flower', 'flower2'],
    ['water_flower', 'flower3'],
    ['complete_gift', 'gift'],
    ['talk_father', 'npc:father'],
    ['enter_nave', 'nave'],
    ['sit_pew', 'seat_a'],
  ])
    R.record(s, D, event, target);
  R.record(s, D, 'talk_lucia', 'npc:lucia');
  R.claim(s, D, 'q_welcome');
  for (const id of ['q_book', 'q_garden', 'q_father', 'q_pew']) {
    assert(R.accept(s, D, id));
    assert.equal(
      R.status(
        s,
        D.quests.find((q) => q.id === id),
      ),
      'ready',
      id,
    );
    R.claim(s, D, id);
  }
  R.accept(s, D, 'q_gift');
  assert.equal(
    R.status(
      s,
      D.quests.find((q) => q.id === 'q_gift'),
    ),
    'ready',
  );
  const restored = R.migrate(JSON.parse(JSON.stringify(s)), D);
  assert.equal(restored.coins, s.coins);
  assert.equal(restored.bookReturned, true);
});
check('shop, contribution receipts and migration preserve ownership', () => {
  const wealthy = R.migrate({ coins: 50000 }, D);
  for (const i of D.items) {
    assert.equal(R.purchase(wealthy, D, i.id), 'ok');
    const after = wealthy.coins;
    assert.equal(R.purchase(wealthy, D, i.id), 'ok');
    assert.equal(wealthy.coins, after);
    assert.equal(wealthy.inventory.filter((id) => id === i.id).length, 1);
  }
  const s = R.migrate(
    {
      version: 2,
      coins: 543,
      inventory: ['shirt_blue'],
      equipped: { top: 'shirt_blue' },
      claimed: ['q_welcome'],
      xp: 900,
    },
    D,
  );
  assert.equal(s.coins, 543);
  assert(!('xp' in s));
  assert.equal(R.purchase(s, D, 'shirt_blue'), 'ok');
  assert.equal(s.coins, 543);
  assert(R.contribute(s, 50, 'a'));
  assert(!R.contribute(s, 50, 'a'));
  assert.equal(s.coins, 493);
  assert(!R.contribute(s, -50, 'b'));
  s.coins = 0;
  assert.equal(R.purchase(s, D, 'shirt_noel'), 'insufficient');
  assert(!s.inventory.includes('shirt_noel'));
});
console.log(`PASS ${tests} domain regression groups`);
