const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { chromium } = require('playwright');
const { loadCatalog } = require('../scripts/lib/m0-project.cjs'),
  { PARISH_RULES: R, PARISH_DATA: D } = loadCatalog();
(async () => {
  let checks = 0;
  const raw = R.defaults();
  raw.username = 'Recovery QA';
  raw.inventory.push('archived_unknown_item');
  const migrated = R.migrate(structuredClone(raw), D);
  assert(migrated.inventory.includes('archived_unknown_item'));
  checks++;
  for (const value of [
    [],
    true,
    'text',
    {},
    { version: 99 },
    { coins: 'bad' },
    { progress: { q: { e: null } } },
  ]) {
    assert(!R.validSave(value));
    checks++;
  }
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext(),
      p = await c.newPage();
    const key = 'giao-xu-an-hoa-2d-v3';
    await p.goto('http://127.0.0.1:5001/');
    for (const bytes of ['{broken', 'true', '[]', '{"coins":"bad"}', '']) {
      await p.evaluate(([key, bytes]) => localStorage.setItem(key, bytes), [key, bytes]);
      await p.reload();
      await p.locator('[data-open=menu]').click();
      await p.locator('#reduceMotion').click();
      assert.equal(await p.evaluate((key) => localStorage.getItem(key), key), bytes);
      checks++;
      const download = p.waitForEvent('download');
      await p.locator('#exportSave').click();
      const file = await download;
      assert.equal(fs.readFileSync(await file.path(), 'utf8'), bytes);
      checks++;
    }
    p.once('dialog', (d) => d.accept());
    await p.locator('#resetGame').click();
    await p.waitForFunction((key) => {
      try {
        return JSON.parse(localStorage.getItem(key)).version === 3;
      } catch {
        return false;
      }
    }, key);
    const backups = await p.evaluate(
      (key) =>
        Object.keys(localStorage)
          .filter((k) => k.startsWith(key + ':backup:'))
          .map((k) => localStorage.getItem(k)),
      key,
    );
    assert(backups.includes(''));
    checks++;
    await p.evaluate(([key, raw]) => localStorage.setItem(key, JSON.stringify(raw)), [key, raw]);
    await p.reload();
    await p.locator('[data-open=menu]').click();
    await p.locator('#reduceMotion').click();
    assert(
      (await p.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).inventory.includes(
        'archived_unknown_item',
      ),
    );
    checks++;
    // Another tab corrupts the save after this document was initialized: no next mutation may overwrite it.
    await p.evaluate((key) => localStorage.setItem(key, '{late-corrupt'), key);
    await p.locator('#reduceMotion').click();
    assert.equal(await p.evaluate((key) => localStorage.getItem(key), key), '{late-corrupt');
    checks++;
    await p.screenshot({ path: 'artifacts/online/recovery-protected.png' });
    await c.close();
    console.log(
      `PASS ${checks} save recovery/archive ownership checks; malformed bytes exported unchanged`,
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
