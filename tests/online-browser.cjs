const assert = require('node:assert/strict'),
  { chromium } = require('playwright'),
  crypto = require('node:crypto'),
  fs = require('node:fs'),
  { authenticator } = require('otplib');
const base = 'http://127.0.0.1:5001';
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  let checks = 0;
  const errors = [];
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } });
    c.setDefaultTimeout(15000);
    const p = await c.newPage();
    const apiErrors = [];
    p.on('response', async (r) => {
      if (r.status() >= 400 && r.url().includes('/api/player/')) {
        const body = await r.json().catch(() => ({}));
        apiErrors.push({ path: new URL(r.url()).pathname, status: r.status(), code: body.code });
      }
    });
    p.on('pageerror', (e) => errors.push(e.message));
    const login = 'ui_' + crypto.randomBytes(6).toString('hex'),
      password = crypto.randomBytes(24).toString('hex');
    await p.goto(base + '/account');
    await p.locator('#tabRegister').click();
    await p.locator('#login').fill(login);
    await p.locator('#displayName').fill('Bạn An Hòa');
    await p.locator('#password').fill(password);
    await p.locator('#submitAuth').click();
    await p.waitForURL(base + '/');
    await p.waitForFunction(
      () =>
        window.PARISH_ONLINE?.active &&
        document.getElementById('hudName')?.textContent === 'Bạn An Hòa',
    );
    checks++;
    await p.goto(base + '/account');
    await p.waitForSelector('#continueGame');
    assert.equal(await p.locator('#tabLogin').isVisible(), false);
    assert.equal(await p.locator('#tabRegister').isVisible(), false);
    assert.match(await p.locator('#accountTitle').innerText(), /Bạn An Hòa/);
    checks++;
    await p.goto(base);
    await p.waitForFunction(() => PARISH_ONLINE.active);
    const state = () =>
      p.evaluate(async () => {
        const r = await fetch('/api/me');
        return (await r.json()).state;
      });
    const wait = async (fn) => {
      const start = Date.now();
      while (Date.now() - start < 15000) {
        const st = await state();
        if (fn(st)) return st;
        await new Promise((r) => setTimeout(r, 100));
      }
      await p.screenshot({ path: 'artifacts/v12/online-timeout.jpg', quality: 85 });
      throw Error(
        'Timed out waiting for server state: ' +
          JSON.stringify({
            apiErrors,
            ui: await p.evaluate(() => ({
              toast: document.querySelector('.toast')?.textContent,
              dialog: document.querySelector('.window h2')?.textContent,
            })),
          }),
      );
    };
    async function dismiss() {
      if (await p.locator('.window .close').count()) await p.locator('.window .close').click();
    }
    async function quests(filter = 'active') {
      await dismiss();
      await p.locator('[data-open=quests]').click();
      if (filter !== 'active') await p.locator(`[data-quest-tab=${filter}]`).click();
    }
    const catalog = await p.evaluate(() => ({
      quests: PARISH_DATA.quests.filter((q) => !q.archived),
      actions: PARISH_ACTIVITIES,
    }));
    for (const q of catalog.quests) {
      if (q.id !== 'q_welcome') {
        await quests('all');
        await p.locator(`[data-quest-action=${q.id}]`).click();
        await wait((s) => s.accepted.includes(q.id));
      }
      for (const [event, n] of q.steps) {
        let count = (await state()).progress[q.id]?.[event]?.count || 0;
        while (count < n) {
          await quests();
          await p.locator(`[data-guide=${q.id}]`).click();
          if (event === 'sit_pew') await p.locator('[data-seat="0"]').click();
          if (event.startsWith('quiz_')) await p.locator('[data-answer="1"]').click();
          if (event === 'return_book')
            await p.getByRole('button', { name: 'Trả cuốn sách', exact: true }).click();
          if (event === 'complete_gift') {
            for (const i of [0, 1, 2]) {
              await p.locator(`[data-gift="${i}"]`).click();
              await wait((s) => s.giftItems.includes(i));
            }
          }
          if (event === 'complete_rhythm') {
            for (const i of [0, 1, 2]) await p.locator(`[data-rhythm="${i}"]`).click();
          }
          count++;
          await wait((s) => (s.progress[q.id]?.[event]?.count || 0) >= count);
        }
      }
      await quests();
      await p.locator(`[data-quest-action=${q.id}]`).click();
      await wait((s) => s.claimed.includes(q.id));
      console.log('PASS online quest UI', q.id);
      checks++;
    }
    assert.equal((await state()).coins, 745);
    await p.screenshot({ path: 'artifacts/online/player-quests.png' });
    await dismiss();
    await p.locator('[data-open=shop]').click();
    const before = await state();
    await p.locator('[data-preview=shirt_blue]').click();
    assert.deepEqual((await state()).equipped, before.equipped);
    await p.locator('[data-item=shirt_blue]').click();
    await p.getByRole('button', { name: 'Mua và mặc', exact: true }).click();
    await wait((s) => s.equipped.top === 'shirt_blue');
    await dismiss();
    await p.reload();
    await p.waitForFunction(
      () =>
        window.PARISH_ONLINE?.active &&
        document.querySelector('#hudName')?.textContent === 'Bạn An Hòa',
    );
    assert.equal((await state()).coins, 635);
    checks++;
    // Sweep uses the same UI but time/reward are authoritative on the server.
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=courtyard]').click();
    await wait((s) => s.scene === 'courtyard');
    await p.locator('[data-open=actions]').click();
    await p.locator('[data-activity-button=sweep]').click();
    await wait((s) => s.activeAction?.actionId === 'sweep');
    await p.reload();
    await p.waitForFunction(() => window.PARISH_ONLINE?.active);
    await wait((s) => s.activityCount.sweep === 1);
    assert.equal((await state()).coins, 642);
    await p.waitForSelector('[data-activity-button=sweep]');
    assert(await p.locator('[data-activity-button=sweep]').isDisabled());
    checks++;
    await dismiss();
    await p.locator('#openChat').click();
    await p.locator('#chatInput').fill('<img src=x onerror=alert(1)>');
    await p.getByRole('button', { name: 'Gửi', exact: true }).click();
    await p.waitForFunction(() =>
      document.querySelector('#chatMessages')?.textContent.includes('<img'),
    );
    assert.equal(await p.locator('#chatMessages img').count(), 0);
    await p.screenshot({ path: 'artifacts/online/player-chat.png' });
    checks++;
    await dismiss();
    await p.screenshot({ path: 'artifacts/online/player-world.png' });
    const mobile = await b.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    mobile.setDefaultTimeout(15000);
    await mobile.addCookies(await c.cookies());
    const mp = await mobile.newPage();
    mp.on('pageerror', (e) => errors.push(e.message));
    await mp.goto(base + '/');
    await mp.waitForFunction(
      () => window.PARISH_ONLINE?.active && document.getElementById('openChat'),
    );
    await mp.locator('#openChat').click();
    await mp.waitForSelector('#chatInput');
    await mp.screenshot({ path: 'artifacts/online/mobile-chat.png' });
    assert(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    checks++;
    const accounts = JSON.parse(fs.readFileSync('.local/test-accounts.json'));
    const admin = await b.newContext({ viewport: { width: 1366, height: 768 } });
    admin.setDefaultTimeout(15000);
    const ap = await admin.newPage();
    ap.on('pageerror', (e) => errors.push(e.message));
    await ap.goto(base + '/admin');
    await ap.locator('#login').fill(accounts.admin.login);
    await ap.locator('#password').fill(accounts.admin.password);
    await ap.locator('#code').fill(authenticator.generate(accounts.admin.secret));
    await ap.locator('#submitAuth').click();
    await ap.waitForSelector('.metric');
    await ap.screenshot({ path: 'artifacts/online/admin-dashboard.png' });
    checks++;
    for (const [id, selector] of [
      ['users', '#userSearch'],
      ['catalog', 'table'],
      ['chat', 'table'],
      ['world', 'input'],
      ['live', '.camera'],
      ['audit', 'table'],
    ]) {
      await ap.locator(`[data-tab=${id}]`).click();
      await ap.waitForSelector('#content ' + selector);
      assert.equal(await ap.locator('#error').innerText(), '');
      await ap.screenshot({ path: `artifacts/online/admin-${id}.png` });
      checks++;
    }
    const am = await admin.newPage();
    await am.setViewportSize({ width: 390, height: 844 });
    await am.goto(base + '/admin');
    await am.waitForSelector('.metric');
    await am.screenshot({ path: 'artifacts/online/admin-mobile.png' });
    assert(
      await am.evaluate(
        () => innerWidth === 390 && document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks++;
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${checks} online browser checks; 11 online quest flows, account persistence, shop, action resume, text-only chat, Admin desktop/mobile`,
    );
    await mobile.close();
    await admin.close();
    await c.close();
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
