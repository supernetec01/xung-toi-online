const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      p = await c.newPage(),
      errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const credentials = await require('./fixture.cjs')();
    await c.addCookies([
      {
        name: 'anhoa_session',
        value: credentials.token,
        url: 'http://127.0.0.1:5001',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    await p.goto('http://127.0.0.1:5001');
    await p.waitForFunction(() => PARISH_ONLINE.active);
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=nave]').click();
    await p.waitForFunction(() => !document.querySelector('.toast'));
    await p.route('**/api/player/location', async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });
    await p.bringToFront();
    await p.evaluate(() =>
      stage.addEventListener(
        'click',
        (e) => {
          const r = stage.getBoundingClientRect();
          window.qaGoal = [
            ((e.clientX - r.left) / r.width) * 100,
            ((e.clientY - r.top) / r.height) * 100,
          ];
        },
        true,
      ),
    );
    const box = await p.locator('#stage').boundingBox();
    await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.58);
    const goal = await p.evaluate(() => qaGoal);
    assert(Math.abs(goal[1] - 92) > 16);
    const samples = [];
    const requests = [];
    p.on('response', async (r) => {
      if (r.url().endsWith('/api/player/location'))
        requests.push({
          point: r.request().postDataJSON(),
          status: r.status(),
          body: (await r.json()).code,
        });
    });
    for (let i = 0; i < 20; i++) {
      await p.waitForTimeout(150);
      const st = (await (await p.request.get('http://127.0.0.1:5001/api/me')).json()).state;
      samples.push([st.x, st.y]);
    }
    await p.waitForFunction(() => !worldPlayer.classList.contains('walking'));
    await p.waitForFunction(
      (goal) => Math.hypot(PARISH_ONLINE.state.x - goal[0], PARISH_ONLINE.state.y - goal[1]) < 0.3,
      goal,
    );
    const end = (await (await p.request.get('http://127.0.0.1:5001/api/me')).json()).state;
    fs.writeFileSync(
      'qa/evidence/online-movement-diagnostic.json',
      JSON.stringify(
        {
          samples,
          requests,
          end: [end.x, end.y],
          toast: await p.locator('#toastMount').innerText(),
        },
        null,
        2,
      ),
    );
    assert(
      Math.hypot(end.x - goal[0], end.y - goal[1]) < 0.3,
      'long walk arrives at actual pointer target with 300ms network latency',
    );
    assert(
      samples.some((p) => p[1] > 60 && p[1] < 90),
      'server sees intermediate positions',
    );
    await p.unrouteAll({ behavior: 'wait' });
    for (const key of ['s', 'w', 's', 'w']) {
      await p.keyboard.down(key);
      await p.waitForTimeout(800);
      await p.keyboard.up(key);
    }
    await p.waitForFunction(() => !worldPlayer.classList.contains('walking'));
    assert.equal(
      (await (await p.request.get('http://127.0.0.1:5001/api/me')).json()).state.coins,
      150,
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'qa/evidence/online-movement.json',
      JSON.stringify(
        {
          passed: true,
          latencyMs: 300,
          serverSamples: samples,
          target: goal,
          final: [end.x, end.y],
          heldKeyboardAccepted: true,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
    console.log('PASS streamed authoritative movement, 300ms latency and held keyboard.');
    await c.close();
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
