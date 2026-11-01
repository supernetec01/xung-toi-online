// Reproduce old views in a browser context only; repository/server source stays unchanged.
const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  { execFileSync } = require('node:child_process'),
  { chromium } = require('playwright'),
  { pool } = require('../../server/db.cjs');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext({ viewport: { width: 800, height: 836 } }),
      p = await c.newPage(),
      f = await require('./fixture.cjs')();
    await c.addCookies([
      {
        name: 'anhoa_session',
        value: f.token,
        url: 'http://127.0.0.1:5001',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    for (const [url, file, type] of [
      ['**/account', 'public/shared/account.html', 'text/html'],
      ['**/shared/auth.js', 'public/shared/auth.js', 'text/javascript'],
      ['**/shared/style.css', 'public/shared/style.css', 'text/css'],
    ])
      await p.route(url, (r) =>
        r.fulfill({
          status: 200,
          contentType: type,
          body: execFileSync('git', ['show', 'be6f694:' + file]),
        }),
      );
    const runs = [];
    for (let i = 0; i < 2; i++) {
      await p.goto('http://127.0.0.1:5001/account');
      await p.waitForSelector('#accountActions:not([hidden])');
      await p.getByRole('button', { name: 'Thiết lập / thay MFA', exact: true }).click();
      await p.getByLabel('Mật khẩu hiện tại', { exact: true }).fill('wrong_password_123');
      await p.getByRole('button', { name: 'Tạo khóa MFA', exact: true }).click();
      await p.waitForFunction(() => authError.textContent.length > 0);
      runs.push({
        errorPresent: await p.locator('#authError').textContent(),
        errorVisible: await p.locator('#authError').isVisible(),
      });
    }
    assert(runs.every((x) => x.errorPresent && !x.errorVisible));
    await p.screenshot({ path: 'qa/evidence/settings-error-before.png' });
    fs.writeFileSync(
      'qa/evidence/settings-error-before.json',
      JSON.stringify({ source: 'be6f694', runs }, null, 2) + '\n',
    );
    console.log('REPRODUCED hidden account error twice using original view.');
    await c.close();
  } finally {
    await b.close();
  }
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
