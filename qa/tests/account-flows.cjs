const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright');
const { pool, tx } = require('../../server/db.cjs'),
  A = require('../../server/auth.cjs'),
  S = require('../../server/security.cjs');
if (!process.env.DATABASE_URL?.includes('/anhoa_qc_')) throw Error('QC database required');
const base = 'http://127.0.0.1:5001',
  checks = [];
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext(),
      p = await c.newPage(),
      errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const login = 'flows_' + crypto.randomBytes(5).toString('hex'),
      password = S.random(),
      hash = await S.password(password);
    await tx((db) => A.newUser(db, login, 'Bạn QC', hash));
    await p.goto(base + '/account');
    await p.waitForSelector('#authForm:not([hidden])');
    assert(await p.locator('#tabRegister').isVisible());
    assert(!(await p.locator('#accountActions').isVisible()));
    checks.push('AUTH-003');
    await p.locator('#login').fill(login);
    await p.locator('#password').fill('wrong_password_123');
    await p.locator('#submitAuth').click();
    await p.waitForFunction(() => authError.textContent.length > 0);
    checks.push('AUTH-002');
    await p.locator('#password').fill(password);
    await p.route('**/api/auth/login', (r) => r.abort());
    await p.locator('#submitAuth').click();
    await p.waitForFunction(() => authError.textContent.includes('kết nối'));
    await p.unrouteAll({ behavior: 'wait' });
    await p.locator('#submitAuth').click();
    await p.waitForURL(base + '/');
    await p.waitForFunction(() => PARISH_ONLINE.active);
    checks.push('AUTH-001');
    await p.evaluate(() =>
      localStorage.setItem(
        'giao-xu-an-hoa-2d-v3',
        JSON.stringify({ ...PARISH_RULES.defaults(), username: 'Demo QC', coins: 200 }),
      ),
    );
    await p.goto(base + '/account');
    await p.waitForSelector('#continueGame');
    assert(!(await p.locator('#tabLogin').isVisible()));
    assert.match(await p.locator('#accountTitle').innerText(), /Bạn QC/);
    checks.push('AUTH-004', 'AUTHUI-001', 'AUTHUI-003', 'AUTHUI-004');
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'continueGame');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    await p.waitForSelector('#settingsPanel:not([hidden])');
    await p.keyboard.press('Escape');
    assert(!(await p.locator('#settingsPanel').isVisible()));
    assert.equal(await p.evaluate(() => document.activeElement.id), 'securityMfa');
    checks.push('AUTHUI-008');

    for (const width of [320, 375, 390, 768, 1024, 1366, 1920]) {
      await p.setViewportSize({ width, height: 844 });
      assert(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
      const controls = await p.locator('#accountActions button:visible,#continueGame').all();
      const boxes = [];
      for (const control of controls) {
        const box = await control.boundingBox();
        assert(box.height >= 44);
        for (const prior of boxes)
          assert(
            box.x >= prior.x + prior.width - 1 ||
              prior.x >= box.x + box.width - 1 ||
              box.y >= prior.y + prior.height - 1 ||
              prior.y >= box.y + box.height - 1,
            'controls overlap',
          );
        boxes.push(box);
      }
      await p.screenshot({ path: `qa/evidence/account-responsive-${width}.png` });
    }
    checks.push('AUTHUI-002', 'NFR-001', 'NFR-002');
    await p.locator('#securityMfa').click();
    await p.locator('#settingsPanel input[type=password]').fill('wrong_password_123');
    await p.getByRole('button', { name: 'Tạo khóa MFA', exact: true }).click();
    await p.waitForSelector('.settings-error');
    assert(await p.locator('.settings-error').isVisible());
    assert(
      await p
        .locator('.settings-error')
        .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
    );
    await p.locator('#changePassword').click();
    assert.equal(await p.locator('#settingsPanel h3').count(), 1);
    checks.push('AUTHUI-009');
    await p.locator('#previewImport').click();
    await p.waitForSelector('#importSummary');
    assert.match(await p.locator('#importSummary').innerText(), /200 Xu/);
    assert.equal((await (await p.request.get(base + '/api/me')).json()).state.coins, 150);
    checks.push('AUTHUI-005');
    await p.locator('#confirmImport').check();
    await p.route('**/api/demo/import', async (route) => {
      await route.fetch();
      await route.abort();
    });
    await p.locator('#applyImport').click();
    await p.waitForFunction(() =>
      document.querySelector('.settings-error')?.textContent.includes('kết nối'),
    );
    await p.unroute('**/api/demo/import');
    await p.locator('#applyImport').click();
    await p.waitForFunction(() => settingsPanel.textContent.includes('Đã nhập demo'));
    const st = (await (await p.request.get(base + '/api/me')).json()).state;
    assert.equal(st.coins, 200);
    const ledger = (
      await pool.query(
        'SELECT sum(delta) n FROM coin_ledger WHERE user_id=(SELECT id FROM game_users WHERE login=$1)',
        [login],
      )
    ).rows[0];
    assert.equal(Number(ledger.n), 200);
    assert(await p.evaluate(() => localStorage.getItem('giao-xu-an-hoa-2d-v3') !== null));
    checks.push('AUTHUI-006', 'AUTHUI-007');
    await p.route('**/api/auth/me', (r) => r.abort());
    await p.reload();
    await p.waitForSelector('#retrySession:not([hidden])');
    assert(!(await p.locator('#authForm').isVisible()));
    await p.unroute('**/api/auth/me');
    await p.locator('#retrySession').click();
    await p.waitForSelector('#continueGame');
    checks.push('AUTH-012');
    await p.reload();
    await p.waitForSelector('#continueGame');
    checks.push('AUTH-006');
    const p2 = await c.newPage();
    await p2.goto(base + '/account');
    await p2.waitForSelector('#continueGame');
    await p.locator('#logout').click();
    await p.waitForSelector('#authForm:not([hidden])');
    await p2.waitForSelector('#authForm:not([hidden])');
    assert.equal((await p2.request.get(base + '/api/me')).status(), 401);
    checks.push('AUTH-005');
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'qa/evidence/account-flows.json',
      JSON.stringify(
        {
          passed: true,
          checks,
          viewports: [320, 375, 390, 768, 1024, 1366, 1920],
          lostImportResponseRetry: true,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      'PASS ' +
        checks.length +
        ' account flow checks, import lost-response replay, seven viewports and cross-tab logout.',
    );
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
