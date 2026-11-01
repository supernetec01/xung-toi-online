const assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  { authenticator } = require('otplib'),
  { chromium } = require('playwright');
const { pool, tx } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const base = 'http://127.0.0.1:5001';
  let checks = 0;
  const errors = [];
  try {
    const player = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      p = await player.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base + '/account');
    await p.locator('#tabRegister').click();
    await p.locator('#login').fill('liveui_' + crypto.randomBytes(5).toString('hex'));
    await p.locator('#displayName').fill('Bình an');
    await p.locator('#password').fill(crypto.randomBytes(24).toString('hex'));
    await p.locator('#submitAuth').click();
    await p.waitForURL(base + '/');
    await p.waitForFunction(() => PARISH_ONLINE.active && document.getElementById('openChat'));
    const admin = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      a = await admin.newPage(),
      account = {
        login: 'liveadmin_' + crypto.randomBytes(5).toString('hex'),
        password: S.random(),
        secret: authenticator.generateSecret(),
      };
    const passwordHash = await S.password(account.password);
    await tx((db) =>
      A.newUser(
        db,
        account.login,
        'LIVE Studio QA',
        passwordHash,
        ['ADMIN'],
        S.encrypt(account.secret),
      ),
    );
    a.on('pageerror', (e) => errors.push(e.message));
    a.on('dialog', (d) => d.accept('QA LIVE UI reason'));
    await a.goto(base + '/admin');
    await a.locator('#login').fill(account.login);
    await a.locator('#password').fill(account.password);
    await a.locator('#code').fill(authenticator.generate(account.secret));
    await a.locator('#submitAuth').click();
    await a.waitForSelector('.metric');
    const playerId = await p.evaluate(
      async () => (await (await fetch('/api/auth/me')).json()).user.id,
    );
    const adminAction = (path, data, method = 'POST') =>
      a.evaluate(
        async ({ path, data, method }) => {
          const auth = await (await fetch('/api/auth/me')).json();
          const response = await fetch(path, {
            method,
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': auth.csrfToken },
            body: JSON.stringify(data),
          });
          return { status: response.status, ...(await response.json()) };
        },
        { path, data, method },
      );
    await p.locator('#openChat').click();
    const sanction = await adminAction('/api/admin/users/' + playerId + '/sanctions', {
      scope: 'CHAT',
      durationSeconds: 60,
      reason: 'QA live mute/unmute UI',
    });
    assert.equal(sanction.status, 200);
    await p.waitForFunction(() => document.getElementById('chatInput')?.disabled);
    checks++;
    assert.equal(
      (
        await adminAction(
          '/api/admin/sanctions/' + sanction.id,
          { reason: 'QA early unmute' },
          'DELETE',
        )
      ).status,
      200,
    );
    await p.waitForFunction(() => document.getElementById('chatInput')?.disabled === false);
    checks++;
    await p.locator('.window .close').click();

    await a.setViewportSize({ width: 390, height: 844 });
    await a.screenshot({ path: 'artifacts/online/admin-mobile.png' });
    assert(
      await a.evaluate(
        () => innerWidth === 390 && document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks++;
    await a.setViewportSize({ width: 1366, height: 768 });
    await a.locator('[data-tab=live]').click();
    await a.waitForSelector('.camera');
    await a.getByRole('button', { name: 'Bắt đầu phiên giả lập', exact: true }).click();
    await a.getByRole('button', { name: 'Giả lập một bình luận', exact: true }).waitFor();
    await a.getByLabel('Tên hiển thị', { exact: true }).fill('Khách bình an');
    await a.getByRole('button', { name: 'Giả lập một bình luận', exact: true }).click();
    await p.waitForSelector('.online-actor[title^="Khách LIVE"]');
    checks++;
    await p.screenshot({ path: 'artifacts/online/live-guest-world.png' });
    await a.waitForFunction(() =>
      document.querySelector('.camera')?.textContent.includes('Khách bình an'),
    );
    await a.screenshot({ path: 'artifacts/online/admin-live-running.png' });
    checks++;
    const camera = await player.newPage();
    await camera.setViewportSize({ width: 390, height: 844 });
    await camera.goto(base + '/?camera=live');
    await camera.waitForFunction(() => document.body.classList.contains('live-camera'));
    await camera.screenshot({ path: 'artifacts/online/live-camera-mobile.png' });
    checks++;
    await a.getByRole('button', { name: 'Giả lập một bình luận', exact: true }).click();
    await p.waitForSelector('.online-actor[title^="Khách LIVE"]');
    await a.getByRole('button', { name: 'Dừng khẩn cấp & dọn khách', exact: true }).click();
    await p.waitForFunction(() => !document.querySelector('.online-actor[title^="Khách LIVE"]'));
    checks++;
    assert.equal(await a.locator('#error').innerText(), '');
    assert.deepEqual(errors, []);
    checks++;
    console.log(
      `PASS ${checks} LIVE Studio/guest/camera/kill-switch and actual Admin mobile + early unmute checks`,
    );
    await admin.close();
    await player.close();
  } finally {
    await b.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
