const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { chromium } = require('playwright');
const C = require('../server/catalog.cjs'),
  { pool } = require('../server/db.cjs'),
  { World } = require('../server/world.cjs');
(async () => {
  const catalog = await C.current(),
    sc = catalog.scenes.nave;
  assert(!C.N.walkable(sc, 50, 40));
  assert(!C.N.walkable(sc, 22, 69));
  assert(C.N.walkable(sc, 50, 56));
  const route = C.N.route(sc, [50, 94], [12, 56]);
  assert(route.length);
  for (let i = 1; i < route.length; i++) assert(C.N.segment(sc, route[i - 1], route[i]));
  const w = new World();
  w.catalog = catalog;
  w.lastReconcile = Date.now();
  w.targets.set('nave', 6);
  w.ambient.set(
    'nave',
    Array.from({ length: 6 }, (_, i) => ({
      id: 'qa-seat-' + i,
      position: [50, 94],
      pose: 'idle',
      until: 0,
      visual: { gender: i % 2 ? 'male' : 'female' },
    })),
  );
  await w.tick();
  const npcs = w.snapshot('nave', 'qa').filter((a) => a.entityId.startsWith('qa-seat-'));
  assert.equal(npcs.length, 6);
  assert(npcs.every((a) => a.pose === 'sit'));
  assert.equal(new Set(w.ambient.get('nave').map((a) => a.seatId)).size, 6);
  const occupied = w.ambient.get('nave')[0];
  w.update('qa-player', { scene: 'nave', seatId: occupied.seatId });
  assert(!w.ambient.get('nave').some((a) => a.id === occupied.id));
  w.targets.set('nave', 0);
  await w.tick();
  assert(
    w
      .snapshot('nave', 'qa')
      .filter((a) => a.entityId.startsWith('qa-seat-'))
      .every((a) => a.pose === 'sit'),
  );
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      p = await c.newPage(),
      errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('http://127.0.0.1:5001');
    await p.evaluate(() => {
      const st = PARISH_RULES.defaults();
      st.username = 'An Hòa';
      st.scene = 'nave';
      st.x = 50;
      st.y = 94;
      localStorage.setItem('giao-xu-an-hoa-2d-v3', JSON.stringify(st));
    });
    await p.reload();
    await p.waitForSelector('#stage[data-scene=nave]');
    await p.screenshot({ path: 'artifacts/world-upgrade/church-entrance.png' });
    const start = await p.evaluate(() => document.getElementById('viewport').scrollTop);
    const box = await p.locator('#stage').boundingBox();
    // Walk using the real stage click; target stays inside the visible central aisle.
    await p.mouse.click(box.x + box.width * 0.5, Math.min(590, box.y + box.height * 0.8));
    await p.waitForTimeout(300);
    const samples = await p.evaluate(() => ({
      top: document.getElementById('worldPlayer').style.top,
      walking: document.getElementById('worldPlayer').classList.contains('walking'),
    }));
    assert(samples.walking);
    await p.waitForTimeout(1900);
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=nave]').click();
    await p.locator('[data-open=quests]').click();
    await p.locator('[data-guide=q_welcome]').count();
    await p.locator('.window .close').click();
    // Arrow navigation and camera continue to work after travel.
    for (let i = 0; i < 8; i++) {
      await p.keyboard.press('ArrowUp');
      await p.waitForTimeout(230);
    }
    await p.waitForTimeout(1000);
    assert((await p.evaluate(() => document.getElementById('viewport').scrollTop)) < start);
    await p.screenshot({ path: 'artifacts/world-upgrade/church-walk.png' });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: 'artifacts/world-upgrade/church-mobile.png' });
    await p.evaluate(() => {
      document.body.innerHTML =
        '<div id="rig" style="display:flex;gap:40px;background:#f0e4ce;padding:35px"></div>';
      for (const gender of ['male', 'female']) {
        const d = document.createElement('div');
        d.style.width = '150px';
        d.innerHTML = PARISH_ART.avatar({
          gender,
          top: '#739e8b',
          acc: gender === 'female' ? 'acc_bow' : 'acc_none',
        });
        document.getElementById('rig').append(d);
      }
    });
    await p.screenshot({ path: 'artifacts/world-upgrade/chibi-characters.png' });
    assert.deepEqual(errors, []);
    await c.close();
    const crypto = require('node:crypto');
    const registered = await fetch('http://127.0.0.1:5001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: 'world_' + crypto.randomBytes(5).toString('hex'),
        password: crypto.randomBytes(24).toString('hex'),
        displayName: 'An Hòa',
      }),
    });
    const session = await registered.json(),
      cookie = registered.headers.get('set-cookie').split(';')[0];
    assert(session.csrfToken);
    await fetch('http://127.0.0.1:5001/api/player/travel', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.csrfToken,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({ sceneId: 'nave' }),
    });
    const online = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await online.addCookies([
      {
        name: 'anhoa_session',
        value: cookie.split('=')[1],
        url: 'http://127.0.0.1:5001',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    const op = await online.newPage();
    await op.goto('http://127.0.0.1:5001');
    await op.waitForSelector('.online-actor[data-pose="sit"]');
    assert.equal(
      await op.locator('.online-actor[title^="Cư dân"]:not([data-pose="sit"])').count(),
      0,
    );
    await op.screenshot({ path: 'artifacts/world-upgrade/church-residents.png' });
    await online.close();
  } finally {
    await b.close();
  }
  console.log(
    'PASS world upgrade: walkable floor/altar/pews, collision-safe paths, seated unique NPCs, player seat priority, continuous movement and camera on both axes; desktop/mobile screenshots.',
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
