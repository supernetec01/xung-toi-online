const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const C = require('../server/catalog.cjs');
const { pool } = require('../server/db.cjs');
const base = 'http://127.0.0.1:5001';
const key = 'giao-xu-an-hoa-2d-v3';
const rooms = ['nave'];
const sizes = [
  [1366, 768],
  [1920, 1080],
  [375, 667],
  [390, 844],
];
const results = { rooms: [], input: [], performance: [], errors: [] };
const state = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
async function travel(p, id) {
  await p.locator('[data-open=map]').click();
  await p.locator(`[data-travel=${id}]`).click();
  await p.waitForSelector(`#stage[data-scene=${id}][data-art=${C.seed.scenes[id].artVersion}]`);
  await p.waitForFunction(() => !document.querySelector('.window'));
  await p.waitForFunction(() => !document.querySelector('.toast'));
  await p.mouse.move(1, 1);
}
// Use real pointer input after camera conversion, not direct state mutation.
async function clickWorld(p, x, y) {
  const r = await p.locator('#stage').boundingBox();
  await p.mouse.click(r.x + (r.width * x) / 100, r.y + (r.height * y) / 100);
}
(async () => {
  fs.mkdirSync('artifacts/v9', { recursive: true });
  const c = await C.current();
  for (const id of rooms) {
    const sc = c.scenes[id];
    assert.deepEqual(
      sc.blockers,
      C.seed.scenes[id].blockers,
      `${id} published collision matches art`,
    );
    assert(C.N.walkable(sc, ...sc.entry));
    const benches = sc.art.props.filter((p) => p.bench);
    assert.equal(benches.length, 8);
    assert.equal(Object.values(sc.seats).flat().length, 24);
    for (const a of benches)
      for (const b of benches)
        if (a.bench.x < 836 === b.bench.x < 836 && a.bench.y < b.bench.y)
          assert(
            a.bench.y + a.bench.h * 0.7 + 19 < b.bench.y - 18,
            'visible pew rows do not overlap',
          );
    for (const p of sc.art.props.filter((p) => p.solid)) {
      const [l, t, r, b] = p.solid;
      assert(!C.N.walkable(sc, (l + r) / 2, (t + b) / 2), p.id);
    }
    for (const target of [...Object.values(sc.anchors), ...Object.values(sc.npcPoints)]) {
      const path = C.N.route(sc, sc.entry, target);
      assert(path.length, id + ' reachable target');
      for (let i = 1; i < path.length; i++) assert(C.N.segment(sc, path[i - 1], path[i]));
    }
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of sizes) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 900,
      });
      const p = await context.newPage();
      p.on('pageerror', (e) => results.errors.push(e.message));
      await p.goto(base);
      await p.evaluate((k) => {
        const st = PARISH_RULES.defaults();
        Object.assign(st, { username: 'An Hòa', scene: 'nave', x: 50, y: 84, coins: 321 });
        localStorage.setItem(k, JSON.stringify(st));
      }, key);
      await p.reload();
      await p.waitForSelector('#stage[data-scene=nave]');
      const owned = (await state(p)).inventory;
      for (const id of rooms) {
        await travel(p, id);
        const props = await p.locator('.scene-prop').count();
        assert.equal(await p.locator('[data-bench-part=back]').count(), 8);
        assert.equal(await p.locator('[data-bench-part=front]').count(), 8);
        assert(props >= 3, id + ' independent furniture');
        assert.equal(await p.locator('.scene-wall').count(), 1);
        assert.equal(await p.locator('.scene-floor').count(), 1);
        assert.equal(await p.locator('#worldPlayer > svg').count(), 1);
        const sc = await p.evaluate((id) => PARISH_DATA.scenes[id], id);
        assert(C.N.walkable(sc, (await state(p)).x, (await state(p)).y));
        assert.equal((await state(p)).coins, 321);
        assert.deepEqual((await state(p)).inventory, owned);
        assert(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
        const player = await p.locator('#worldPlayer').boundingBox(),
          dock = await p.locator('.dock').boundingBox();
        assert(player.y + player.height < dock.y, `${id} actor clear of dock ${width}`);
        await p.screenshot({
          path: `artifacts/v9/${id}-${width}x${height}.jpg`,
          type: 'jpeg',
          quality: 85,
        });
        results.rooms.push({ id, viewport: [width, height], props, coinsPreserved: true });
      }
      if (width === 1366) {
        await travel(p, 'nave');
        await p.evaluate(() =>
          stage.addEventListener('click', (e) => {
            const r = stage.getBoundingClientRect();
            window.lastPointerGoal = [
              ((e.clientX - r.left) / r.width) * 100,
              ((e.clientY - r.top) / r.height) * 100,
            ];
          }),
        );
        for (const [x, y] of [
          [49, 88],
          [51, 84],
          [48, 86],
          [52, 83],
          [50, 80],
          [47, 85],
          [52, 82],
          [48, 84],
          [54, 80],
          [50, 76],
        ]) {
          await clickWorld(p, x, y);
          await p.waitForTimeout(65);
        }
        await p.waitForFunction(() => !document.querySelector('#worldPlayer.walking'));
        const goal = await p.evaluate(() => lastPointerGoal);
        await p.waitForFunction(
          ([k, goal]) => {
            const s = JSON.parse(localStorage.getItem(k));
            return Math.hypot(s.x - goal[0], s.y - goal[1]) < 0.1;
          },
          [key, goal],
        );
        const end = await state(p);
        assert(
          Math.hypot(end.x - goal[0], end.y - goal[1]) < 0.1,
          'latest pointer command wins after camera conversion',
        );
        const before = [end.x, end.y];
        // A wall click uses the same coordinate conversion even above the viewport.
        await p.evaluate(() => {
          const s = document.getElementById('stage'),
            r = s.getBoundingClientRect();
          for (let i = 0; i < 20; i++)
            s.dispatchEvent(
              new MouseEvent('click', {
                bubbles: true,
                clientX: r.left + r.width * 0.5,
                clientY: r.top + r.height * 0.4,
              }),
            );
        });
        await p.waitForTimeout(200);
        assert.deepEqual([(await state(p)).x, (await state(p)).y], before);
        await p.locator('[data-spot=seat_a]').click();
        await p.locator('[data-seat="1"]').click();
        await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).seated, key);
        assert((await state(p)).seated);
        assert.equal(await p.locator('#worldPlayer > svg').getAttribute('data-direction'), 'up');
        await p.screenshot({ path: 'artifacts/v9/nave-seated.jpg', type: 'jpeg', quality: 88 });
        await clickWorld(p, 50, 77);
        await p.waitForTimeout(60);
        const moving = await p.evaluate(() => ({
          x: parseFloat(worldPlayer.style.left),
          y: parseFloat(worldPlayer.style.top),
        }));
        assert(C.N.walkable(c.scenes.nave, moving.x, moving.y), 'standing exits to aisle');
        await p.waitForFunction(() => !document.querySelector('#worldPlayer.walking'));
        await p.waitForFunction((k) => !JSON.parse(localStorage.getItem(k)).seated, key);
        assert(!(await state(p)).seated);
        const y = (await state(p)).y;
        await p.keyboard.down('w');
        await p.waitForTimeout(550);
        await p.keyboard.up('w');
        await p.waitForFunction(() => !document.querySelector('#worldPlayer.walking'));
        assert((await state(p)).y < y - 3, 'held WASD moves continuously');
        results.input.push(
          'ten rapid commands; 20 blocked wall clicks; seated facing; collision-safe stand; held WASD',
        );
      }
      const metric = await p.evaluate(async () => {
        const times = [];
        let prev = performance.now(),
          start = prev;
        await new Promise((resolve) => {
          const frame = (now) => {
            times.push(now - prev);
            prev = now;
            if (now - start < 1200) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
        times.sort((a, b) => a - b);
        return {
          fps: times.length / ((prev - start) / 1000),
          p95: times[Math.floor(times.length * 0.95)],
        };
      });
      results.performance.push({ viewport: [width, height], ...metric });
      await context.close();
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync('artifacts/v9/results.json', JSON.stringify(results, null, 2) + '\n');
    console.log(
      'PASS V9: church split pews × 4 viewports; real pointer/keyboard movement, collision, seat orientation/exit, preserved demo inventory/wallet.',
    );
  } finally {
    await browser.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
