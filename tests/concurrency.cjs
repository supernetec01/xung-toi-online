const { chromium } = require('playwright'),
  assert = require('node:assert/strict');
const KEY = 'giao-xu-an-hoa-2d-v3';
(async () => {
  const b = await chromium.launch({
    args: ['--no-sandbox'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  try {
    const c = await b.newContext();
    c.setDefaultTimeout(10000);
    const p = await c.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('http://127.0.0.1:5001');
    await p.locator('#inputName').fill('Hai tab');
    await p.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).click();
    await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
    await p.locator('[data-npc=lucia]').click();
    await p.waitForSelector('[data-npc-claim=q_welcome]');
    await p.locator('.close').click();
    const p2 = await c.newPage();
    p2.on('pageerror', (e) => errors.push(e.message));
    await p2.goto('http://127.0.0.1:5001');
    for (const tab of [p, p2]) await tab.locator('[data-open=quests]').click();
    await Promise.all([p, p2].map((tab) => tab.locator('[data-quest-action=q_welcome]').click()));
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).claimed.includes('q_welcome'),
      KEY,
    );
    assert.equal(await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).coins, KEY), 220);
    console.log('PASS simultaneous quest claim: one reward');

    // A write failure must not show a successful purchase or lose wallet/inventory.
    await p.locator('.close').click();
    await p.locator('[data-open=shop]').click();
    await p.locator('[data-item=shirt_blue]').click();
    await p.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new DOMException('Test storage full', 'QuotaExceededError');
      };
    });
    await p.getByRole('button', { name: 'Mua và mặc', exact: true }).click();
    await p.waitForFunction(() =>
      document.querySelector('.toast')?.textContent.includes('Không lưu được'),
    );
    const raw = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    assert.equal(raw.coins, 220);
    assert(!raw.inventory.includes('shirt_blue'));
    await p.evaluate(() => (Storage.prototype.setItem = window.originalSetItem));
    console.log('PASS failed save rolls back purchase');
    // Moving is cancelled when the user opens a different menu: no late NPC popup.
    await p.locator('.close').click();
    await p.locator('[data-npc=guard]').click();
    await p.locator('[data-open=shop]').click();
    await p.waitForTimeout(1000);
    assert.equal(await p.locator('.window-head h2').innerText(), 'Shop trang phục');
    console.log('PASS modal cancels pending NPC navigation');
    assert.deepEqual(errors, []);
    await c.close();
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
