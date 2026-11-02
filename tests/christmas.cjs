const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright'),
  C = require('../server/catalog.cjs'),
  { pool, tx } = require('../server/db.cjs'),
  { patch } = require('../scripts/christmas-layout.cjs');
if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL)
  throw Error('Run only on the isolated QC/test database. See qa/README.md.');
const base = 'http://127.0.0.1:5001',
  key = 'giao-xu-an-hoa-2d-v3',
  checks = [],
  errors = [],
  images = [];
const ok = (condition, name) => {
  assert(condition, name);
  checks.push(name);
};
const local = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
async function seed(p, decode = true) {
  await p.goto(base);
  await p.evaluate((k) => {
    const s = PARISH_RULES.defaults();
    Object.assign(s, {
      username: 'An Hòa',
      scene: 'christmas',
      x: 50,
      y: 88,
      claimed: ['q_welcome'],
      accepted: ['q_noel'],
      tracked: 'q_noel',
    });
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await p.reload();
  await p.waitForSelector('#stage[data-art="christmas-night-1"]');
  if (decode)
    await p.locator('.scene-prop img').evaluateAll((es) => Promise.all(es.map((e) => e.decode())));
}
(async () => {
  fs.mkdirSync('artifacts/christmas', { recursive: true });
  const current = await C.current(),
    sc = current.scenes.christmas;
  ok(sc.artVersion === 'christmas-night-1', 'online catalog receives new scene');
  for (const point of [...Object.values(sc.anchors), ...Object.values(sc.npcPoints), sc.entry])
    ok(
      C.N.walkable(sc, ...point) && C.N.route(sc, sc.entry, point).length > 0,
      'target reachable ' + point,
    );
  for (const prop of sc.art.props) {
    const [l, t, r, b] = prop.solid;
    ok(!C.N.walkable(sc, (l + r) / 2, (t + b) / 2), 'solid footprint ' + prop.id);
  }
  const around = C.N.route(sc, [36, 76], [12, 76]);
  ok(
    around.length > 2 && around.slice(1).every((p, i) => C.N.segment(sc, around[i], p)),
    'path routes around tree instead of clipping',
  );
  ok(!C.N.walkable(sc, 50, 45), 'church facade remains off walkable floor');
  const custom = structuredClone(current);
  custom.scenes.christmas.spots.find((s) => s[0] === 'tree')[2] = 'Nhãn tùy chỉnh';
  custom.scenes.christmas.customNote = 'preserve';
  const restored = patch(custom, 'previous'),
    reapplied = patch(restored, 'night');
  ok(
    restored.scenes.christmas.art === undefined &&
      reapplied.scenes.christmas.artVersion === 'christmas-night-1',
    'rollback and republish scene layout',
  );
  ok(
    reapplied.scenes.christmas.spots.find((s) => s[0] === 'tree')[2] === 'Nhãn tùy chỉnh' &&
      reapplied.scenes.christmas.customNote === 'preserve',
    'layout publication preserves CMS labels/custom fields',
  );
  ok(
    JSON.stringify(reapplied.items) === JSON.stringify(current.items) &&
      JSON.stringify(reapplied.quests) === JSON.stringify(current.quests),
    'rollback leaves items and quests intact',
  );
  // Exercise the actual SQL inside a transaction that always rolls back.
  await tx(async (db) => {
    await db.query('SAVEPOINT scene_check');
    const fingerprint = async () =>
      (
        await db.query(
          "SELECT md5(COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY user_id)::text FROM player_states s),'')) states,md5(COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY user_id)::text FROM game_wallets w),'')) wallets, (SELECT count(*) FROM coin_ledger) ledger",
        )
      ).rows[0];
    const before = await fingerprint();
    await db.query('UPDATE catalog_current SET payload=$1', [{ ...custom, version: undefined }]);
    await db.query(fs.readFileSync('db/migrations/010_christmas_night.sql', 'utf8'));
    const after = await C.current(db);
    ok(
      after.scenes.christmas.spots.find((s) => s[0] === 'tree')[2] === 'Nhãn tùy chỉnh',
      'actual migration preserves edited labels',
    );
    assert.deepEqual(await fingerprint(), before);
    checks.push('actual migration leaves player state/wallet/ledger unchanged');
    await db.query('ROLLBACK TO SAVEPOINT scene_check');
  });
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
      [390, 844],
      [375, 667],
      [844, 390],
    ]) {
      const p = await b.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
      p.setDefaultTimeout(20000);
      p.on('pageerror', (e) => errors.push(e.message));
      await seed(p);
      ok((await p.locator('.scene-prop').count()) === 7, 'seven independent props ' + width);
      ok(
        (await p.locator('.scene-wall').count()) === 1 &&
          (await p.locator('.scene-floor').count()) === 1,
        'architecture and ground split ' + width,
      );
      ok(
        await p.evaluate(() => document.documentElement.scrollWidth === innerWidth),
        'HUD no horizontal page overflow ' + width,
      );
      const image = `artifacts/christmas/after-${width}.jpg`;
      await p.screenshot({ path: image, quality: 88 });
      images.push(image);
      if (width === 1366) {
        const trail = [];
        await p.exposeFunction('recordFoot', (x, y) => trail.push([x, y]));
        await p.evaluate(() => {
          window.christmasFootTimer = setInterval(
            () => recordFoot(parseFloat(worldPlayer.style.left), parseFloat(worldPlayer.style.top)),
            50,
          );
        });
        await p.locator('.scene-prop[data-prop=tree]').click({ position: { x: 250, y: 300 } });
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).decorated.includes('tree'),
          key,
        );
        await p.locator('[data-spot=star]').click();
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).decorated.includes('star'),
          key,
        );
        await p.locator('.scene-prop[data-prop=gifts]').click();
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).decorated.length === 3,
          key,
        );
        await p.evaluate(() => clearInterval(christmasFootTimer));
        ok(
          trail.length > 10 && trail.every((pt) => C.N.walkable(sc, ...pt)),
          'actual pointer movement remains collision-safe',
        );
        ok(
          (await p.locator('.scene-prop.is-decorated').count()) === 3,
          'three actual decorative props update from save',
        );
        ok(
          (await local(p)).progress.q_noel.decorate.count === 3,
          'quest still counts three unique decorations',
        );
        await p.reload();
        await p.waitForSelector('.scene-prop.is-decorated');
        ok((await local(p)).decorated.length === 3, 'decorations survive reload');
        await p.locator('[data-npc=child]').click();
        await p.waitForSelector('.window');
        ok(
          await p.locator('.window').isVisible(),
          'quest NPC approachable through redesigned plaza',
        );
        await p.locator('.window .close').click();
        await p.locator('.scene-prop[data-prop=market_left]').click({ position: { x: 20, y: 80 } });
        await p.waitForSelector('.window');
        ok(
          (await p.locator('[data-activity-button=noel]').count()) > 0,
          'market stall opens existing Noel action',
        );
        await p.locator('.window .close').click();
        await p.locator('[data-spot=back]').click();
        await p.waitForSelector('#stage[data-scene=courtyard]');
        ok(
          (await p.locator('.game').getAttribute('data-world-theme')) ===
            C.seed.scenes.courtyard.art.theme &&
            (await p.locator('.christmas-lights').count()) === 0,
          'leaving plaza clears night HUD and light layers',
        );
      }
      if (width === 390) {
        const before = await p.evaluate(() => document.getElementById('viewport').scrollLeft);
        await p.locator('[data-spot=star]').click();
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).decorated.includes('star'),
          key,
        );
        ok(
          (await p.evaluate(() => document.getElementById('viewport').scrollLeft)) !== before,
          'mobile camera follows route towards nativity',
        );
        await p.waitForFunction(() => !document.querySelector('.toast'));
        await p.screenshot({ path: 'artifacts/christmas/mobile-nativity.jpg', quality: 88 });
        await p.emulateMedia({ reducedMotion: 'reduce' });
        ok(
          (await p
            .locator('.christmas-bulb')
            .first()
            .evaluate((el) => getComputedStyle(el).animationName)) === 'none',
          'reduced motion disables decorative glimmer',
        );
      }
      await p.close();
    }
    // A real online account uses server geometry and persists decorations.
    const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
    p.setDefaultTimeout(25000);
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base + '/account');
    await p.locator('#tabRegister').click();
    await p.locator('#login').fill('noel_' + crypto.randomBytes(6).toString('hex'));
    await p.locator('#displayName').fill('Bạn Noel QC');
    await p.locator('#password').fill(crypto.randomBytes(24).toString('hex'));
    await p.locator('#submitAuth').click();
    await p.waitForURL(base + '/');
    await p.waitForFunction(() => PARISH_ONLINE.active);
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=christmas]').click();
    await p.waitForSelector('#stage[data-art="christmas-night-1"]');
    for (const id of ['tree', 'star', 'gifts']) {
      await p.locator(`[data-spot=${id}]`).click();
      await p.waitForFunction((id) => PARISH_ONLINE.state.decorated.includes(id), id);
    }
    await p.reload();
    await p.waitForFunction(
      () => PARISH_ONLINE.active && PARISH_ONLINE.state.decorated.length === 3,
    );
    ok(
      (await p.locator('.scene-prop.is-decorated').count()) === 3,
      'online decoration state persists after reload',
    );
    ok(
      await p.evaluate(() =>
        PARISH_NAV.walkable(
          PARISH_DATA.scenes.christmas,
          PARISH_ONLINE.state.x,
          PARISH_ONLINE.state.y,
        ),
      ),
      'online server agrees with rendered floor',
    );
    await p.screenshot({ path: 'artifacts/christmas/online-decorated.jpg', quality: 88 });
    await p.close();
    const fallback = await b.newPage();
    await fallback.route('**/assets/christmas/tree.webp', (r) => r.abort());
    await seed(fallback, false);
    await fallback.waitForSelector('[data-prop=tree].asset-unavailable');
    ok(
      await fallback.locator('[data-spot=tree]').isVisible(),
      'missing prop keeps accessible interaction and collider',
    );
    await fallback.close();
    ok(errors.length === 0, 'no uncaught browser errors');
    fs.writeFileSync(
      'artifacts/christmas/results.json',
      JSON.stringify({ checks, images, errors, physicalDevice: false }, null, 2) + '\n',
    );
    console.log(
      `PASS ${checks.length} Christmas scene checks; five viewports, actual pointer interaction, offline/online persistence, migration and rollback.`,
    );
  } finally {
    await b.close();
  }
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
