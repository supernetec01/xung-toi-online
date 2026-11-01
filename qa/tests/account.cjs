const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright');
if (!process.env.DATABASE_URL?.includes('/anhoa_qc_')) throw Error('Use the isolated QC runner');
const base = 'http://127.0.0.1:5001',
  baseline = process.argv.includes('--baseline');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  const c = await b.newContext({ viewport: { width: 800, height: 836 } }),
    p = await c.newPage(),
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  try {
    const credentials = await require('./fixture.cjs')();
    await c.addCookies([
      {
        name: 'anhoa_session',
        value: credentials.token,
        url: base,
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    const session = { csrfToken: credentials.csrf };
    const api = async (url, data, extra = {}) => {
      const r = await p.request.post(base + url, {
        headers: {
          'X-CSRF-Token': session.csrfToken,
          'Idempotency-Key': crypto.randomUUID(),
          ...extra,
        },
        data,
      });
      return { status: r.status(), body: await r.json() };
    };
    await p.goto(base + '/account');
    await p.waitForSelector('#accountActions:not([hidden])');
    const observations = [];
    for (let i = 0; i < 2; i++) {
      await p.reload();
      await p.waitForSelector('#accountActions:not([hidden])');
      observations.push(await p.locator('#tabLogin').isVisible());
    }
    for (const [width, height] of [
      [800, 836],
      [390, 844],
    ]) {
      await p.setViewportSize({ width, height });
      await p.screenshot({
        path: `qa/evidence/account-${baseline ? 'before' : 'after'}-${width}.png`,
      });
    }
    const buy = await api('/api/shop/purchase', { itemId: 'shirt_blue' });
    assert.equal(buy.status, 200);
    await p.goto(base);
    const raw = await p.evaluate(() => ({
      ...PARISH_RULES.defaults(),
      username: 'Demo QC',
      coins: 200,
    }));
    const prior = (await (await p.request.get(base + '/api/me')).json()).state;
    const imported = await api('/api/demo/import', raw);
    const after = (await (await p.request.get(base + '/api/me')).json()).state;
    const evidence = {
      baseline,
      loginTabsVisibleTwice: observations,
      importStatus: imported.status,
      before: { coins: prior.coins, ownsBlue: prior.inventory.includes('shirt_blue') },
      after: { coins: after.coins, ownsBlue: after.inventory.includes('shirt_blue') },
      errors,
    };
    fs.writeFileSync(
      `qa/evidence/account-${baseline ? 'before' : 'after'}.json`,
      JSON.stringify(evidence, null, 2) + '\n',
    );
    if (!baseline) {
      assert(
        observations.every((x) => !x),
        'signed-in login tabs hidden',
      );
      assert.equal(imported.status, 409, 'existing progress cannot be overwritten');
      assert.equal(after.coins, prior.coins);
      assert.deepEqual(after.inventory, prior.inventory);
      assert.deepEqual(errors, []);
    }
    console.log(
      baseline
        ? 'REPRODUCED account CSS/auth state and destructive demo import; evidence saved.'
        : 'PASS account state and import data-loss regression.',
    );
  } finally {
    await c.close();
    await b.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
