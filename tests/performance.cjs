const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright');
const { pool, tx } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs');
const base = 'http://127.0.0.1:5001';
(async () => {
  const token = S.random(),
    csrf = S.random();
  await tx(async (db) => {
    const id = await A.newUser(
      db,
      'perf_' + crypto.randomBytes(5).toString('hex'),
      'An Hòa QA',
      await S.password(S.random()),
    );
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval'1 hour')",
      [S.hash(token), id, csrf],
    );
  });
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const results = [],
    errors = [];
  let checks = 0;
  try {
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
      [390, 844],
      [360, 800],
      [768, 1024],
      [844, 390],
    ]) {
      const c = await b.newContext({ viewport: { width, height }, hasTouch: width < 900 });
      await c.addCookies([
        { name: 'anhoa_session', value: token, url: base, httpOnly: true, sameSite: 'Strict' },
      ]);
      const p = await c.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(base);
      await p.waitForFunction(() => PARISH_ONLINE.active && document.getElementById('openChat'));
      await p.waitForTimeout(1500);
      const metrics = await p.evaluate(async () => {
        const samples = [],
          start = performance.now();
        let last = start;
        await new Promise((resolve) => {
          const frame = (now) => {
            samples.push(now - last);
            last = now;
            if (now - start < 3000) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
        samples.sort((a, b) => a - b);
        return {
          viewport: [innerWidth, innerHeight],
          frames: samples.length,
          frameP95Ms: samples[Math.floor(samples.length * 0.95)],
          durationMs: performance.now() - start,
          domNodes: document.getElementsByTagName('*').length,
          visibleActors: document.querySelectorAll('.online-actor').length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert(!metrics.overflow, 'world viewport overflow');
      checks++;
      await p.screenshot({ path: `artifacts/online/world-${width}x${height}.png` });
      await p.locator('[data-open=shop]').click();
      await p.waitForSelector('#shopPreview');
      await p.screenshot({ path: `artifacts/online/shop-${width}x${height}.png` });
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      checks++;
      await p.locator('.window .close').click();
      await p.locator('#openChat').click();
      await p.waitForSelector('#chatInput');
      const inputBox = await p.locator('#chatInput').boundingBox();
      assert(inputBox && inputBox.x >= 0 && inputBox.x + inputBox.width <= width + 1);
      checks++;
      await p.screenshot({ path: `artifacts/online/chat-${width}x${height}.png` });
      results.push(metrics);
      await c.close();
    }
    const c = await b.newContext({
        viewport: { width: 1440, height: 1100 },
        reducedMotion: 'reduce',
      }),
      p = await c.newPage();
    await p.goto(base + '/');
    await p.waitForFunction(() => window.PARISH_ART?.avatar);
    const matrix = await p.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'rigMatrix';
      host.style.cssText =
        'position:absolute;inset:0;z-index:99999;background:#f5f1e7;display:grid;grid-template-columns:repeat(17,1fr);padding:20px;gap:4px;overflow:auto;color:#23433e';
      document.body.replaceChildren(host);
      let count = 0,
        maxNodes = 0;
      for (const gender of ['male', 'female'])
        for (const direction of PARISH_ART.directions)
          for (const pose of PARISH_ART.poses) {
            const cell = document.createElement('div');
            cell.className = 'rigCell';
            cell.innerHTML = PARISH_ART.avatar({
              gender,
              direction,
              pose,
              top: '#bc7984',
              bottom: '#465b75',
              acc: 'acc_bag',
            });
            cell.firstElementChild.style.width = '65px';
            cell.append(document.createTextNode(gender + ' ' + direction + ' ' + pose));
            cell.style.cssText = 'font:9px system-ui;text-align:center';
            host.append(cell);
            maxNodes = Math.max(maxNodes, cell.querySelectorAll('*').length);
            count++;
          }
      return { count, maxNodes, version: PARISH_ART.spriteVersion };
    });
    assert.equal(matrix.count, 136);
    assert(matrix.maxNodes < 100);
    checks += 2;
    await p.screenshot({ path: 'artifacts/online/avatar-pose-matrix.png', fullPage: true });
    const baseRigs = await p.locator('.rigCell').count();
    assert.equal(baseRigs, 136);
    const injection = await p.evaluate(() => {
      const node = document.createElement('div');
      node.innerHTML = PARISH_ART.avatar({
        top: 'red" onload="alert(1)',
        skin: '<img>',
        acc: '<script>',
      });
      return node.querySelector('script,img,[onload]') === null;
    });
    assert(injection);
    checks++;
    const motion = await p.evaluate(
      () =>
        getComputedStyle(document.querySelector('svg[data-pose=walk] [data-part=left-arm]'))
          .animationName,
    );
    assert.equal(motion, 'none');
    checks++;
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'artifacts/online/performance.json',
      JSON.stringify(
        {
          at: new Date().toISOString(),
          environment: 'Chromium on managed cloud; simulated viewports, not physical device FPS',
          viewports: results,
          rig: matrix,
          checks,
        },
        null,
        2,
      ),
    );
    console.log(
      `PASS ${checks} viewport/rig/performance checks; 6 viewports, 136 procedural rig combinations; see performance.json for measurements`,
    );
    await c.close();
  } finally {
    await b.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
