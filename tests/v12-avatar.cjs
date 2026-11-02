const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { execFileSync } = require('node:child_process'),
  { chromium } = require('playwright');
const V = require('../game_v3/src/avatar-v10.js');
if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL)
  throw Error('Use the isolated QC/test database.');
const base = 'http://127.0.0.1:5001',
  key = 'giao-xu-an-hoa-2d-v3',
  checks = [],
  errors = [];
const ok = (v, label) => {
  assert(v, label);
  checks.push(label);
};
async function state(p) {
  return p.evaluate(() =>
    PARISH_ONLINE.active
      ? PARISH_ONLINE.state
      : JSON.parse(localStorage.getItem('giao-xu-an-hoa-2d-v3')),
  );
}
async function studio(p) {
  await p.locator('[data-open=avatar]').click();
  await p.waitForSelector('#studioHero');
}
async function account(p, name) {
  await p.goto(base + '/account');
  await p.locator('#tabRegister').click();
  await p.locator('#login').fill('v12_' + crypto.randomBytes(6).toString('hex'));
  await p.locator('#displayName').fill(name);
  await p.locator('#password').fill(crypto.randomBytes(24).toString('hex'));
  await p.locator('#submitAuth').click();
  await p.waitForURL(base + '/');
  await p.waitForFunction(() => PARISH_ONLINE.active);
}
(async () => {
  fs.mkdirSync('artifacts/v12/after', { recursive: true });
  ok(!V.ITEMS && !V.buy && !V.equip, 'no second V10 shop/wallet exported');
  ok(
    Object.keys(V.SKINS).length === 5 && V.SKIN_HEX.includes('#f7cfac'),
    'five skin presets retain legacy palette',
  );
  for (const gender of ['male', 'female'])
    for (const direction of ['up', 'down', 'left', 'right'])
      for (const pose of ['idle', 'walk', 'sit_back', 'kneel', 'pray', 'wave', 'read']) {
        const svg = V.adapt({ gender, direction, pose });
        assert(svg.includes('data-direction="' + (pose === 'sit_back' ? 'up' : direction) + '"'));
        assert(!/<(?:script|img)|onload=|rotate\([^)]{4,}\)/.test(svg));
      }
  checks.push('both genders and all 4 directions × 7 poses render safely');
  ok(
    V.adapt({ gender: 'male', direction: 'up' }) !== V.adapt({ gender: 'female', direction: 'up' }),
    'male/female back silhouettes differ',
  );
  const injection = V.adapt({
    skin: '<img>',
    hairStyle: '" onload="alert(1)',
    top: 'red" onload="alert(1)',
  });
  ok(!/<(?:img|script)|onload=/.test(injection), 'appearance materials reject markup');
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of [
      [1366, 768],
      [390, 844],
      [360, 800],
    ]) {
      const p = await b.newPage({ viewport: { width, height }, hasTouch: width < 700 });
      p.setDefaultTimeout(18000);
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(base);
      await p.evaluate((k) => {
        const s = PARISH_RULES.defaults();
        s.username = 'An Hòa';
        localStorage.setItem(k, JSON.stringify(s));
      }, key);
      await p.reload();
      await p.waitForSelector('#worldPlayer .v10-render');
      await studio(p);
      const before = await state(p);
      await p.locator('[data-gender=male]').click();
      await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).gender === 'male', key);
      ok(
        (await p.locator('#studioHero svg').first().getAttribute('data-hair-style')) === 'short',
        'male preset has short hair ' + width,
      );
      for (const color of Object.values(V.SKINS)) {
        await p.locator('[data-color="' + color.main + '"]').click();
        await p.waitForFunction(({ key, c }) => JSON.parse(localStorage.getItem(key)).skin === c, {
          key,
          c: color.main,
        });
      }
      await p.locator('[data-studio-hair=pony]').click();
      await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).hairStyle === 'pony', key);
      for (const d of ['up', 'down', 'left', 'right']) {
        await p.locator('[data-studio-direction=' + d + ']').click();
        assert.equal(await p.locator('#studioHero svg').first().getAttribute('data-direction'), d);
      }
      await p.locator('[data-studio-pose=sit_back]').click();
      assert.equal(await p.locator('#studioHero svg').first().getAttribute('data-direction'), 'up');
      await p.locator('[data-studio-pose=walk]').click();
      await p.locator('[data-studio-direction=down]').click();
      ok(
        (await state(p)).coins === before.coins &&
          (await state(p)).inventory.length === before.inventory.length,
        'appearance preview preserves money/ownership ' + width,
      );
      ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Studio has no horizontal overflow ' + width,
      );
      await p.screenshot({ path: 'artifacts/v12/after/avatar-' + width + '.jpg', quality: 88 });
      if (width === 1366 && process.env.V12_RECORD_VIDEO === 'true') {
        const folder = fs.mkdtempSync('/tmp/anhoa-v12-motion-');
        let frame = 0;
        for (const [pose, dir] of [
          ['walk', 'down'],
          ['walk', 'up'],
          ['walk', 'left'],
          ['walk', 'right'],
          ['kneel', 'down'],
          ['pray', 'down'],
          ['wave', 'down'],
        ]) {
          await p.locator('[data-studio-pose=' + pose + ']').click();
          await p.locator('[data-studio-direction=' + dir + ']').click();
          for (let i = 0; i < 4; i++) {
            await p.screenshot({
              path: path.join(folder, String(frame++).padStart(3, '0') + '.jpg'),
              type: 'jpeg',
              quality: 75,
            });
            await p.waitForTimeout(150);
          }
        }
        execFileSync(
          'ffmpeg',
          [
            '-y',
            '-loglevel',
            'error',
            '-framerate',
            '5',
            '-i',
            path.join(folder, '%03d.jpg'),
            '-c:v',
            'libvpx-vp9',
            '-crf',
            '36',
            '-b:v',
            '0',
            'artifacts/v12/after/avatar-motion.webm',
          ],
          { stdio: 'ignore' },
        );
        checks.push('animation evidence captured from actual Studio');
      }
      await p.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
      await p.reload();
      await p.waitForSelector('#worldPlayer .v10-render');
      ok(
        (await state(p)).skin === V.SKINS.deep.main && (await state(p)).hairStyle === 'pony',
        'skin/hair survive offline reload ' + width,
      );
      await p.locator('[data-open=map]').click();
      await p.locator('[data-travel=nave]').click();
      await p.waitForSelector('#stage[data-scene=nave]');
      ok(
        (await p.locator('#worldPlayer > svg').getAttribute('data-hair-style')) === 'pony',
        'same V10 renderer across maps ' + width,
      );
      await p.close();
    }
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      p = await c.newPage();
    p.setDefaultTimeout(18000);
    p.on('pageerror', (e) => errors.push(e.message));
    await account(p, 'Bạn V12');
    const csrf = await p.evaluate(() => PARISH_ONLINE.csrf);
    const send = async (data, method = 'PUT', url = '/api/player/appearance') => {
      const r = await p.request.fetch(base + url, {
        method,
        headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': crypto.randomUUID() },
        data,
      });
      return { status: r.status(), body: await r.json() };
    };
    let current = await state(p);
    const staleVersion = current.appearanceVersion || 0;
    assert.equal((await send({ hairStyle: 'wave', appearanceVersion: staleVersion })).status, 200);
    assert.equal((await send({ gender: 'male', appearanceVersion: staleVersion })).status, 409);
    checks.push('stale appearance version rejected across tabs');
    assert.equal((await send({ hairStyle: '../bad' })).status, 400);
    assert.equal(
      (await send({ itemId: 'hair_silver' }, 'PUT', '/api/player/equipment')).status,
      403,
    );
    checks.push('invalid style and unowned hair refused by server');
    await p.reload();
    await p.waitForFunction(() => PARISH_ONLINE.active);
    await studio(p);
    current = await state(p);
    await p.locator('[data-studio-mode=shop]').click();
    await p.locator('[data-studio-item=shirt_blue]').click();
    ok((await state(p)).coins === current.coins, 'online try-on does not charge');
    await p.locator('[data-studio-confirm]').click();
    await p.getByRole('button', { name: 'Mua và mặc', exact: true }).click();
    await p.waitForFunction(() => PARISH_ONLINE.state.inventory.includes('shirt_blue'));
    ok(
      (await state(p)).coins === current.coins - 110,
      'Studio purchase uses existing wallet/price',
    );
    const [a1, a2] = await Promise.all([
      send({ itemId: 'shirt_blue' }, 'POST', '/api/shop/purchase'),
      send({ itemId: 'shirt_blue' }, 'POST', '/api/shop/purchase'),
    ]);
    assert.equal(a1.status, 200);
    assert.equal(a2.status, 200);
    ok(
      a2.body.state.coins === current.coins - 110 &&
        a2.body.state.inventory.filter((id) => id === 'shirt_blue').length === 1,
      'concurrent duplicate purchase deducts once',
    );
    await p.reload();
    await p.waitForFunction(() => PARISH_ONLINE.active);
    await studio(p);
    await p.locator('[data-gender=male]').click();
    await p.waitForFunction(() => PARISH_ONLINE.state.gender === 'male');
    await p.locator('[data-studio-hair=pony]').click();
    await p.waitForFunction(() => PARISH_ONLINE.state.hairStyle === 'pony');
    ok(
      (await state(p)).inventory.includes('shirt_blue'),
      'gender change preserves purchased inventory',
    );
    await p.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
    await p.reload();
    await p.waitForFunction(() => PARISH_ONLINE.active);
    ok(
      (await p.locator('#worldPlayer > svg').getAttribute('data-hair-style')) === 'pony' &&
        (await state(p)).equipped.top === 'shirt_blue',
      'online hair/equipment persist after reload',
    );
    const peer = await b.newContext({ viewport: { width: 1366, height: 768 } }),
      peerPage = await peer.newPage();
    await account(peerPage, 'Người xem V12');
    await peerPage.waitForFunction(() =>
      Array.from(document.querySelectorAll('.online-actor')).some(
        (n) =>
          n.querySelector('span')?.textContent === 'Bạn V12' &&
          n.querySelector('svg')?.dataset.hairStyle === 'pony',
      ),
    );
    checks.push('peer WebSocket renders the same V10 appearance');
    await peer.close();
    await c.close();
    ok(errors.length === 0, 'no browser page errors');
    fs.writeFileSync(
      'artifacts/v12/t03-avatar.json',
      JSON.stringify(
        {
          checks,
          errors,
          physicalDevice: false,
          video: fs.existsSync('artifacts/v12/after/avatar-motion.webm'),
        },
        null,
        2,
      ) + '\n',
    );
    console.log('PASS ' + checks.length + ' V10/V4 appearance, ownership, Studio and peer checks.');
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
