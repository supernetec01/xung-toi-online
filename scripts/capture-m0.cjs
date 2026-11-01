const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { ROOT, readJson } = require('./lib/m0-project.cjs');
const destination = path.join(ROOT, 'artifacts/m0');
async function capture() {
  fs.mkdirSync(destination, { recursive: true });
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const errors = [],
    samples = [];
  const fixture = readJson('tests/fixtures/m0/legacy-save.json');
  try {
    for (const [name, width, height] of [
      ['desktop', 1366, 768],
      ['mobile', 390, 844],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        ...(name === 'mobile' ? { isMobile: true, hasTouch: true } : {}),
      });
      context.setDefaultTimeout(15000);
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      const requests = [];
      page.on('request', (r) => requests.push(new URL(r.url()).pathname));
      await page.goto('http://127.0.0.1:5001');
      const key = 'giao-xu-an-hoa-2d-v3',
        bytes = JSON.stringify(fixture);
      await page.evaluate(([key, bytes]) => localStorage.setItem(key, bytes), [key, bytes]);
      await page.reload();
      await page.screenshot({ path: path.join(destination, `${name}-courtyard.png`) });
      const frames = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const timestamps = [];
            function frame(t) {
              timestamps.push(t);
              if (timestamps.length < 121) requestAnimationFrame(frame);
              else resolve(timestamps.slice(1).map((n, i) => n - timestamps[i]));
            }
            requestAnimationFrame(frame);
          }),
      );
      samples.push({
        viewport: { width, height },
        profile: name,
        sampleKind: '121 requestAnimationFrame callbacks in one idle scene, headless emulator',
        estimatedFps: Math.round(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)),
        frameP95Ms: [...frames].sort((a, b) => a - b)[Math.ceil(frames.length * 0.95) - 1],
        realDeviceVerified: false,
      });
      await page.locator('[data-open=shop]').click();
      await page.locator('[data-preview=shirt_rose]').click();
      await page.screenshot({ path: path.join(destination, `${name}-shop.png`) });
      await page.locator('.window .close').click();
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), key),
        bytes,
        'Reload and preview must not overwrite the fixture',
      );
      await page.locator('[data-open=map]').click();
      await page.locator('[data-travel=nave]').click();
      await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).scene === 'nave', key);
      await page.screenshot({ path: path.join(destination, `${name}-nave.png`) });
      assert(!requests.some((p) => p.startsWith('/api/admin')), 'No admin prefetch from public UI');
      const forbidden = readJson('config/v4-boundaries.json').publicForbiddenFields;
      const dom = await page.content();
      for (const field of forbidden) assert(!dom.includes(field), field);
      await context.close();
    }
    const p = await browser.newPage();
    const timings = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now(),
        response = await p.request.get('http://127.0.0.1:5001/healthz');
      assert.equal(response.status(), 200);
      assert.deepEqual(await response.json(), { status: 'ok', mode: 'local-demo' });
      timings.push(performance.now() - start);
    }
    const unavailable = [
      '/admin',
      '/api/admin/dashboard',
      '/api/admin/presence/summary',
      '/api/admin/live/simulate-comment',
      '/api/me',
      '/api/catalog',
      '/ws',
      '/tasks.json',
      '/config/v4-boundaries.json',
      '/db/001_v4_additive_reference.sql',
      '/.env.example',
      '/references/BASELINE_V3_REFERENCE_ONLY.zip',
      '/Giao_Xu_An_Hoa_Choi_Thu_V3.html',
    ];
    const closedRoutes = [];
    for (const url of unavailable) {
      const response = await p.request.get('http://127.0.0.1:5001' + url, {
        headers: { 'X-Role': 'SUPER_ADMIN' },
      });
      assert.equal(response.status(), 404, url);
      closedRoutes.push({
        path: url,
        status: response.status(),
        meaning: 'absent in M0; not a test of authentication/RBAC',
      });
    }
    assert.deepEqual(errors, []);
    const report = {
      milestone: 'M0',
      createdAt: new Date().toISOString(),
      browser: browser.version(),
      port: 5001,
      uncaughtPageErrors: errors,
      legacySaveReloadAndPreview:
        'PASS in isolated synthetic contexts; no real player profile accessed',
      screenshots: ['desktop', 'mobile'].flatMap((n) =>
        ['courtyard', 'shop', 'nave'].map((s) => `${n}-${s}.png`),
      ),
      frames: samples,
      http: {
        sample: '20 sequential healthz requests over local loopback; not production API latency',
        requestCount: timings.length,
        p95Ms: [...timings].sort((a, b) => a - b)[Math.ceil(timings.length * 0.95) - 1],
      },
      closedRoutes,
      authorization: 'M1 is not implemented; 401/403/MFA/WS role tests are unrun',
    };
    fs.writeFileSync(
      path.join(destination, 'baseline-ui.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      'PASS M0: six screenshots, synthetic save preservation, public surface, headless frame and local HTTP measurements',
    );
  } finally {
    await browser.close();
  }
}
capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
