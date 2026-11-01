const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright'),
  { pool } = require('../../server/db.cjs');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      p = await c.newPage(),
      f = await require('./fixture.cjs')(),
      errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await c.addCookies([
      {
        name: 'anhoa_session',
        value: f.token,
        url: 'http://127.0.0.1:5001',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    await p.goto('http://127.0.0.1:5001');
    await p.waitForFunction(() => PARISH_ONLINE.active);
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=nave]').click();
    const ids = await p.evaluate(() =>
      PARISH_DATA.scenes.nave.spots.filter((s) => s[5] === 'seat').map((s) => s[0]),
    );
    for (const id of ids) {
      await p.locator(`[data-spot=${id}]`).click();
      await p.locator('[data-seat="1"]').click();
      await p.waitForFunction(
        (id) => PARISH_ONLINE.state.seated && PARISH_ONLINE.state.seatId === 'nave:' + id + ':1',
        id,
      );
      assert.equal(await p.locator('#worldPlayer svg').getAttribute('data-direction'), 'up');
      assert.equal(
        await p.locator('#worldPlayer svg').getAttribute('data-seating-pose'),
        'sit_back',
      );
    }
    await p.keyboard.press('w');
    await p.waitForFunction(() => !PARISH_ONLINE.state.seated);
    await c.clearCookies();
    await p.goto('http://127.0.0.1:5001');
    await p.evaluate(() => {
      const s = PARISH_RULES.defaults();
      Object.assign(s, { username: 'Bạn QC', scene: 'nave', x: 22, y: 69 });
      localStorage.setItem('giao-xu-an-hoa-2d-v3', JSON.stringify(s));
    });
    await p.reload();
    await p.waitForSelector('#stage[data-scene=nave]');
    assert(
      await p.evaluate(() =>
        PARISH_NAV.walkable(
          PARISH_DATA.scenes.nave,
          parseFloat(worldPlayer.style.left),
          parseFloat(worldPlayer.style.top),
        ),
      ),
    );
    await p.evaluate(() => {
      const s = PARISH_RULES.defaults();
      Object.assign(s, { username: 'Bạn QC', scene: 'foyer' });
      localStorage.setItem('giao-xu-an-hoa-2d-v3', JSON.stringify(s));
    });
    await p.route('**/assets/v8/foyer.webp', (r) => r.abort());
    await p.reload();
    await p.waitForSelector('.asset-unavailable');
    assert(await p.locator('#hint').isVisible());
    await p.screenshot({ path: 'qa/evidence/asset-fallback.png' });
    await p.locator('[data-open=map]').click();
    assert(await p.locator('[data-travel=nave]').isVisible());
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'qa/evidence/scenes.json',
      JSON.stringify(
        {
          passed: true,
          allEightRowsSitBack: ids.length === 8,
          expiredLeaseRecovery: 'see seat-recovery-after.json',
          invalidSpawnRecovered: true,
          missingArchitectureFallback: true,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
    console.log('PASS eight seat rows, spawn recovery and missing-asset fallback.');
    await c.close();
  } finally {
    await b.close();
  }
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
