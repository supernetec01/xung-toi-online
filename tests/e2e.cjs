const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const KEY = 'giao-xu-an-hoa-2d-v3';
const base = 'http://127.0.0.1:5001';
const options = { headless: true, args: ['--no-sandbox'] };
if (process.env.CHROMIUM_PATH) options.executablePath = process.env.CHROMIUM_PATH;
const state = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const close = (p) => p.getByRole('button', { name: 'Đóng', exact: true }).first().click();
(async () => {
  fs.mkdirSync('artifacts/current', { recursive: true });
  const browser = await chromium.launch(options);
  let checks = 0;
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await context.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base);
    await p.locator('#inputName').fill('An Nhiên');
    await p.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).click();
    await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
    assert.equal(await p.locator('[role=dialog]').count(), 0);
    checks++;
    await p.getByRole('button', { name: 'Trò chuyện với Lucia', exact: true }).click();
    await p.waitForSelector('.dialogue-text');
    await close(p);
    await p.locator('[data-open=quests]').click();
    await p.locator('[data-quest-action=q_welcome]').click();
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).claimed.includes('q_welcome'),
      KEY,
    );
    assert.equal((await state(p)).coins, 220);
    await close(p);
    checks++;
    await p.locator('[data-open=actions]').click();
    await p.locator('[data-activity-button=sweep]').click();
    await p.waitForFunction((k) => !!JSON.parse(localStorage.getItem(k)).activeAction, KEY);
    await p.reload();
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).activityCount.sweep === 1,
      KEY,
    );
    assert.equal((await state(p)).coins, 227);
    await p.waitForSelector('[data-activity-button=sweep]');
    assert.match(await p.locator('[data-activity-button=sweep]').innerText(), /⏳ 0[12]:/);
    assert.equal(await p.locator('[data-activity-button=sweep]').isDisabled(), true);
    await close(p);
    checks++;
    await p.locator('[data-open=shop]').click();
    const before = await state(p);
    await p.locator('[data-preview=shirt_blue]').click();
    assert.deepEqual((await state(p)).equipped, before.equipped);
    assert.equal((await state(p)).coins, 227);
    await close(p);
    checks++;
    await p.locator('[data-open=shop]').click();
    await p.locator('[data-item=shirt_blue]').click();
    await p.getByRole('button', { name: 'Mua và mặc', exact: true }).click();
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).equipped.top === 'shirt_blue',
      KEY,
    );
    assert.equal((await state(p)).coins, 117);
    await close(p);
    await p.reload();
    assert.equal((await state(p)).equipped.top, 'shirt_blue');
    assert.equal((await state(p)).inventory.filter((i) => i === 'shirt_blue').length, 1);
    checks++;
    // Insufficient balance must not change inventory or balance.
    await p.locator('[data-open=shop]').click();
    await p.locator('[data-item=shirt_noel]').click();
    await p.getByRole('button', { name: 'Mua và mặc', exact: true }).click();
    await p.waitForSelector('[data-item=shirt_noel]');
    assert.equal((await state(p)).coins, 117);
    assert(!(await state(p)).inventory.includes('shirt_noel'));
    await p.keyboard.press('Escape');
    assert.equal(await p.locator('[role=dialog]').count(), 0);
    assert.equal(
      await p.locator('[data-open=shop]').evaluate((el) => el === document.activeElement),
      true,
    );
    checks++;
    // Cooldown survives scene travel and refresh.
    await p.locator('[data-open=map]').click();
    assert.equal(await p.locator('[data-travel]').count(), 11);
    await p.locator('[data-travel=nave]').click();
    await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).scene === 'nave', KEY);
    await p.screenshot({ path: 'artifacts/current/desktop-nave.png' });
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=courtyard]').click();
    await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).scene === 'courtyard', KEY);
    assert((await state(p)).cooldowns.sweep > Date.now());
    checks++;
    await p.locator('[data-open=menu]').click();
    await p.locator('#goDonation').click();
    await p.locator('[data-donation-tab=real]').click();
    assert.equal(await p.locator('[data-demo-approve],#demoDonate').count(), 0);
    await p.locator('[data-donation-tab=board]').click();
    assert.match(await p.locator('.window-body').innerText(), /Chưa có tên/);
    await close(p);
    checks++;
    await p.screenshot({ path: 'artifacts/current/desktop-courtyard.png' });
    // Two tabs race to buy the same item: one debit and one inventory entry.
    const p2 = await context.newPage();
    p2.on('pageerror', (e) => errors.push(e.message));
    await p2.goto(base);
    for (const tab of [p, p2]) {
      await tab.locator('[data-open=shop]').click();
      await tab.locator('[data-slot=shoes]').click();
      await tab.locator('[data-item=shoe_black]').click();
    }
    await Promise.all(
      [p, p2].map((tab) => tab.getByRole('button', { name: 'Mua và mặc', exact: true }).click()),
    );
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).inventory.includes('shoe_black'),
      KEY,
    );
    await p.waitForTimeout(150);
    assert.equal((await state(p)).coins, 32);
    assert.equal((await state(p)).inventory.filter((i) => i === 'shoe_black').length, 1);
    checks++;
    // Wait out the original action cooldown with browser clock, then race two starts.
    for (const tab of [p, p2]) {
      await close(tab);
      await tab.clock.install();
      await tab.clock.fastForward(121000);
      await tab.locator('[data-open=actions]').click();
    }
    await Promise.all([p, p2].map((tab) => tab.locator('[data-activity-button=sweep]').click()));
    await p.waitForFunction((k) => !!JSON.parse(localStorage.getItem(k)).activeAction, KEY);
    await p.clock.fastForward(4000);
    await p2.clock.fastForward(4000);
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).activityCount.sweep === 2,
      KEY,
    );
    assert.equal((await state(p)).coins, 39);
    assert.equal((await state(p)).activityHistory.filter((x) => x.id === 'sweep').length, 2);
    checks++;
    await context.close();
    for (const [label, width, height] of [
      ['small-mobile', 360, 800],
      ['mobile', 390, 844],
      ['tablet', 768, 1024],
      ['large-desktop', 1920, 1080],
      ['landscape', 844, 390],
    ]) {
      const c = await browser.newContext({ viewport: { width, height } });
      const page = await c.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base);
      await page.locator('#inputName').fill('Minh An');
      await page.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
      await page.screenshot({ path: `artifacts/current/${label}-world.png` });
      await page.locator('[data-open=shop]').click();
      await page.locator('[data-preview=shirt_rose]').click();
      assert.equal(await page.locator('[role=dialog]').count(), 1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const box = await page.locator('.window').boundingBox();
      assert(box.x >= -1 && box.x + box.width <= width + 1);
      await page.screenshot({ path: `artifacts/current/${label}-shop.png` });
      await c.close();
      checks++;
    }
    // Save V2 migration preserves inventory, balance and already claimed rewards.
    const mc = await browser.newContext();
    const mp = await mc.newPage();
    await mp.goto(base);
    await mp.evaluate(() => {
      localStorage.setItem(
        'giao-xu-an-hoa-2d-v2',
        JSON.stringify({
          version: 2,
          username: 'Người cũ',
          coins: 543,
          xp: 999,
          kindness: 45,
          inventory: ['shirt_blue', 'shoe_black'],
          equipped: { top: 'shirt_blue', shoes: 'shoe_black' },
          claimed: ['q_welcome'],
        }),
      );
    });
    await mp.reload();
    await mp.locator('[data-open=shop]').click();
    assert.equal(await mp.locator('[data-item=shirt_blue]').isDisabled(), true);
    assert.equal((await mp.locator('#hudCoins').innerText()).replace(/\D/g, ''), '543');
    await mp.keyboard.press('Escape');
    await mp.locator('[data-open=avatar]').click();
    await mp.locator('[data-gender=male]').click();
    await mp.waitForFunction((k) => JSON.parse(localStorage.getItem(k))?.gender === 'male', KEY);
    const migrated = await state(mp);
    assert.equal(migrated.coins, 543);
    assert(migrated.inventory.includes('shirt_blue'));
    assert(migrated.claimed.includes('q_welcome'));
    assert(!('xp' in migrated));
    await mc.close();
    checks++;
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(`PASS ${checks} browser scenarios; screenshots: artifacts/current`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
