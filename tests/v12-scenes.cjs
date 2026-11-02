const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright'),
  C = require('../server/catalog.cjs'),
  { pool } = require('../server/db.cjs'),
  layout = require('../scripts/v12-layout.cjs'),
  lessons = require('../game_v3/src/lessons.js');
if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL)
  throw Error('Use an isolated test database.');
const base = 'http://127.0.0.1:5001',
  key = 'giao-xu-an-hoa-2d-v3';
const result = { checks: [], screenshots: [], errors: [], physicalDevice: false };
function ok(value, label) {
  assert(value, label);
  result.checks.push(label);
}
async function travel(p, id) {
  await close(p);
  await p.locator('[data-open=map]').click();
  await p.locator('[data-travel=' + id + ']').click();
  await p.waitForSelector('#stage[data-scene=' + id + '][data-assets-ready=true]');
  await p.waitForFunction(() => !document.querySelector('.window'));
}
async function close(p) {
  if (await p.locator('.window .close').count()) await p.locator('.window .close').click();
}
async function snapshot(p) {
  return p.evaluate(
    (key) => (PARISH_ONLINE.active ? PARISH_ONLINE.state : JSON.parse(localStorage.getItem(key))),
    key,
  );
}
(async () => {
  fs.mkdirSync('artifacts/v12/after', { recursive: true });
  const catalog = await C.current();
  assert.deepEqual(C.validate(catalog), []);
  for (const id of layout.ids) {
    const sc = catalog.scenes[id];
    assert.equal(sc.artVersion, 'v12-layered-1');
    assert(C.N.walkable(sc, ...sc.entry));
    for (const point of Object.values({ ...sc.anchors, ...sc.npcPoints })) {
      assert(C.N.walkable(sc, ...point), id + ' target has valid feet');
      const route = C.N.route(sc, sc.entry, point);
      assert(route.length, id + ' target reachable');
      assert(route.slice(1).every((p, i) => C.N.segment(sc, route[i], p)));
    }
    for (const prop of sc.art.props.filter((p) => p.solid)) {
      const [l, t, r, b] = prop.solid;
      assert(!C.N.walkable(sc, (l + r) / 2, (t + b) / 2), id + '/' + prop.id);
    }
    result.checks.push(id + ': feet-safe spawn, reachable anchors/NPCs, solid furniture');
  }
  const custom = structuredClone(catalog);
  custom.scenes.courtyard.label = 'Nội dung đã sửa';
  custom.scenes.classroom.spots.find((s) => s[0] === 'book')[2] = 'Sách do Admin đặt tên';
  custom.items[0].name = 'Vật phẩm đã sửa';
  const before = JSON.stringify(custom);
  for (const mode of ['p0', 'previous']) {
    const next = layout.build(custom, mode);
    assert.equal(next.scenes.courtyard.label, custom.scenes.courtyard.label);
    assert.equal(
      next.scenes.classroom.spots.find((s) => s[0] === 'book')[2],
      'Sách do Admin đặt tên',
    );
    assert.deepEqual(next.items, custom.items);
    assert.deepEqual(next.quests, custom.quests);
    for (const id of Object.keys(catalog.scenes).filter((id) => !layout.ids.includes(id)))
      assert.deepEqual(next.scenes[id], custom.scenes[id]);
  }
  assert.equal(JSON.stringify(custom), before);
  result.checks.push(
    'P0 publication/rollback preserve labels, items, quests, all six other maps and input',
  );
  const lesson = lessons.definitions.class_basics,
    local = { coins: 150 };
  assert.equal(lessons.answer(local, lesson, 'class_basics', 0, 0).code, 'WRONG_ANSWER');
  lessons.answer(local, lesson, 'class_basics', 0, 1);
  const revised = structuredClone(lesson);
  revised.questions[1].correct = 1;
  assert(lessons.answer(local, revised, 'class_basics', 1, 0).ok);
  lessons.answer(local, revised, 'class_basics', 2, 2);
  assert.equal(local.coins, 150);
  assert.equal(local.album.length, 1);
  assert(lessons.validProgress(local.lessonProgress));
  result.checks.push(
    'lesson snapshot survives content edits; no extra wallet or repeated album entry',
  );
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
      [390, 844],
      [360, 800],
    ]) {
      const p = await b.newPage({ viewport: { width, height }, hasTouch: width < 700 });
      p.setDefaultTimeout(20000);
      p.on('pageerror', (e) => result.errors.push(e.message));
      await p.goto(base);
      await p.evaluate((key) => {
        const st = PARISH_RULES.defaults();
        st.username = 'An Hòa';
        localStorage.setItem(key, JSON.stringify(st));
      }, key);
      await p.reload();
      for (const id of layout.ids) {
        await travel(p, id);
        const st = await snapshot(p),
          sc = catalog.scenes[id];
        assert(C.N.walkable(sc, st.x, st.y));
        assert.equal(st.coins, 150);
        assert.equal(await p.locator('.scene-wall').count(), 1);
        assert.equal(await p.locator('.scene-floor').count(), 1);
        assert((await p.locator('.scene-prop').count()) >= sc.art.props.length);
        assert.equal(
          await p.locator('#worldPlayer > svg[data-sprite-version="v10-v4-1"]').count(),
          1,
        );
        assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const player = await p.locator('#worldPlayer').boundingBox(),
          dock = await p.locator('.dock').boundingBox();
        assert(player.y + player.height <= dock.y, id + ' player clears dock ' + width);
        await p.waitForFunction(() => !document.querySelector('.toast'));
        const file = 'artifacts/v12/after/' + id + '-' + width + '.jpg';
        await p.screenshot({ path: file, quality: 86 });
        result.screenshots.push(file);
      }
      result.checks.push('five layered maps / V10 / preserved money / safe HUD at ' + width);
      if (width === 1366) {
        await travel(p, 'classroom');
        await p.locator('[data-spot=lesson_class]').click();
        await p.locator('[data-lesson-answer="0"]').click();
        await p.locator('[data-lesson-answer="1"]:enabled').waitFor();
        assert(!(await snapshot(p)).lessonProgress.class_basics);
        await p.locator('[data-lesson-answer="1"]').click();
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).lessonProgress.class_basics?.index === 1,
          key,
        );
        await p.reload();
        await p.locator('[data-spot=lesson_class]').click();
        await p.locator('[data-lesson-answer="0"]').click();
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).lessonProgress.class_basics?.index === 2,
          key,
        );
        await p.locator('[data-lesson-answer="2"]:enabled').waitFor();
        await p.locator('[data-lesson-answer="2"]').click();
        await p.waitForFunction(
          (k) => JSON.parse(localStorage.getItem(k)).lessonProgress.class_basics?.index === 3,
          key,
        );
        assert.equal((await snapshot(p)).coins, 150);
        await p.screenshot({ path: 'artifacts/v12/after/classroom-lesson.jpg', quality: 86 });
        result.checks.push(
          'three-question lesson: wrong answer, reload/resume, completion and album through real UI',
        );
        await travel(p, 'confession');
        await p.locator('[data-spot=reflection]').click();
        assert.equal(await p.locator('.window input,.window textarea').count(), 0);
        assert((await p.locator('.window').innerText()).includes('không cần nhập'));
        await p.screenshot({ path: 'artifacts/v12/after/confession-info.jpg', quality: 86 });
        result.checks.push('reflection is read-only and never collects personal confessions');
        await travel(p, 'nave');
        for (const [id, seats] of Object.entries(catalog.scenes.nave.seats)) {
          await close(p);
          await p.locator('[data-spot=' + id + ']').click();
          await p.locator('[data-seat="1"]').click();
          await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).seated, key);
          const st = await snapshot(p);
          assert.equal(await p.locator('#worldPlayer > svg').getAttribute('data-direction'), 'up');
          assert(Math.hypot(st.x - seats[1].position[0], st.y - seats[1].position[1]) < 0.01);
          const z = await p.locator('#worldPlayer').evaluate((el) => Number(el.style.zIndex));
          const bench = catalog.scenes.nave.art.props.find((prop) => prop.id === id);
          assert(z > Math.round(bench.depth * 10) - 1 && z < Math.round(bench.depth * 10) + 1);
        }
        await p.screenshot({ path: 'artifacts/v12/after/nave-seated.jpg', quality: 88 });
        result.checks.push(
          'all eight pew rows: exact seat, facing north, avatar between back/front layers',
        );
        await travel(p, 'courtyard');
        await p.locator('[data-spot=church]').click();
        const destination = catalog.scenes.courtyard.spots.find((s) => s[0] === 'church')[6];
        await p.waitForSelector('#stage[data-scene=' + destination + ']');
        result.checks.push(
          'physical courtyard portal walks to approach then enters existing foyer',
        );
      }
      await p.close();
    }
    const p = await b.newPage();
    p.on('pageerror', (e) => result.errors.push(e.message));
    await p.goto(base + '/account');
    await p.locator('#tabRegister').click();
    await p.locator('#login').fill('v12_map_' + crypto.randomBytes(5).toString('hex'));
    await p.locator('#displayName').fill('Bạn học V12');
    await p.locator('#password').fill(crypto.randomBytes(24).toString('hex'));
    await p.locator('#submitAuth').click();
    await p.waitForURL(base + '/');
    await p.waitForFunction(() => PARISH_ONLINE.active);
    const csrf = await p.evaluate(() => PARISH_ONLINE.csrf);
    async function send(url, data, receipt = crypto.randomUUID()) {
      const r = await p.request.post(base + url, {
        data,
        headers: {
          'X-CSRF-Token': csrf,
          'Idempotency-Key': receipt,
          'X-Client-Id': await p.evaluate(() => PARISH_ONLINE.clientId),
        },
      });
      return { status: r.status(), ...(await r.json()) };
    }
    async function get(url) {
      const r = await p.request.get(base + url);
      return r.json();
    }
    const npc = catalog.scenes.courtyard.npcPoints.lucia;
    await require('./lib/move.cjs')(
      { x: npc[0] + 5, y: npc[1] + 3 },
      (data) => send('/api/player/location', data),
      get,
    );
    assert.equal((await send('/api/player/interact', { npcId: 'lucia' })).status, 200);
    result.checks.push(
      'NPC approach validates exact position instead of grid rounding at range boundary',
    );
    assert.equal((await send('/api/player/travel', { sceneId: 'classroom' })).status, 200);
    await require('./lib/move.cjs')(
      { x: 50, y: 80 },
      (data) => send('/api/player/location', data),
      get,
    );
    const me = await get('/api/me'),
      coins = me.state.coins,
      uid = await p.evaluate(() => PARISH_ONLINE.user.id);
    const ledgerBefore = (
      await pool.query('SELECT count(*)::int AS n FROM coin_ledger WHERE user_id=$1', [uid])
    ).rows[0].n;
    const answer = (choice, value, receipt) =>
      send('/api/player/interact', { spotId: 'lesson_class', choice, answer: value }, receipt);
    assert.equal((await answer(0, 0)).status, 422);
    assert.equal((await answer(1, 0)).status, 409);
    const receipt = crypto.randomUUID();
    const pair = await Promise.all([answer(0, 1, receipt), answer(0, 1, receipt)]);
    assert(pair.every((r) => r.status === 200 && r.state.lessonProgress.class_basics.index === 1));
    assert.equal((await answer(0, 1)).status, 409);
    assert.equal((await answer(1, 0)).status, 200);
    assert.equal((await answer(2, 2)).status, 200);
    assert.equal((await answer(2, 2)).status, 409);
    const final = (await get('/api/me')).state;
    assert.equal(final.coins, coins);
    assert.equal(final.album.filter((id) => id === 'knowledge:class_basics').length, 1);
    assert.equal(
      (await pool.query('SELECT count(*)::int AS n FROM coin_ledger WHERE user_id=$1', [uid]))
        .rows[0].n,
      ledgerBefore,
    );
    await p.reload();
    await p.waitForFunction(() => PARISH_ONLINE.active);
    assert.equal((await snapshot(p)).lessonProgress.class_basics.index, 3);
    result.checks.push(
      'PostgreSQL lesson: wrong/stale/duplicate commands, idempotency, reload, single album, unchanged wallet/ledger',
    );
    assert.equal((await send('/api/player/travel', { sceneId: 'nave' })).status, 200);
    const seatId = 'seat_a',
      point = catalog.scenes.nave.anchors[seatId];
    await require('./lib/move.cjs')(
      { x: point[0], y: point[1] },
      (data) => send('/api/player/location', data),
      get,
    );
    assert.equal((await send('/api/player/interact', { spotId: seatId, choice: 1 })).status, 200);
    await p.reload();
    await p.waitForFunction(() => PARISH_ONLINE.active);
    assert((await snapshot(p)).seated);
    assert.equal(await p.locator('#worldPlayer > svg').getAttribute('data-direction'), 'up');
    await pool.query(
      "UPDATE seat_leases SET expires_at=now()-interval'1 second' WHERE user_id=$1",
      [uid],
    );
    await p.reload();
    await p.waitForFunction(() => PARISH_ONLINE.active);
    const released = await snapshot(p);
    assert(!released.seated && C.N.walkable(catalog.scenes.nave, released.x, released.y));
    result.checks.push(
      'seated reload retains valid lease; expired lease restores safe aisle position',
    );
    for (let i = 0; i < 30; i++) await travel(p, layout.ids[i % layout.ids.length]);
    assert.equal(await p.locator('#worldPlayer').count(), 1);
    assert.equal(await p.locator('.scene-wall').count(), 1);
    assert.equal(await p.locator('.scene-floor').count(), 1);
    assert.equal(
      await p.locator('.scene-prop').count(),
      catalog.scenes.confession.art.props.length,
    );
    result.checks.push('30 online scene changes: one player, no accumulated props/wall/floor');
    for (const id of layout.ids) {
      await travel(p, id);
      for (const npcId of C.seed.scenes[id].npc) {
        await close(p);
        await p.locator('[data-npc=' + npcId + ']').click();
        await p.waitForSelector('.dialogue-text');
        assert(
          (await snapshot(p)).achievements[catalog.npcs[npcId].event]?.includes('npc:' + npcId),
          id + '/' + npcId + ' confirmed by server',
        );
      }
    }
    result.checks.push(
      'all eight functional NPC placements across five P0 maps: real approach and server-confirmed dialogue',
    );
    await p.close();
    ok(result.errors.length === 0, 'no browser page errors');
    fs.writeFileSync('artifacts/v12/p0-scenes.json', JSON.stringify(result, null, 2) + '\n');
    console.log(
      'PASS ' +
        result.checks.length +
        ' P0 groups; ' +
        result.screenshots.length +
        ' actual viewport screenshots.',
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
