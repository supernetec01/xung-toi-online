const assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright'),
  sharp = require('sharp');
const { pool, tx } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs'),
  W = require('../game_v3/src/wardrobe.js');
const base = 'http://127.0.0.1:5001';
let checks = 0;
function ok(x, label) {
  assert(x, label);
  checks++;
}
async function fixture(role = 'PLAYER') {
  const token = S.random(),
    csrf = S.random();
  const id = await tx(async (db) => {
    const id = await A.newUser(
      db,
      'ward_' + crypto.randomBytes(5).toString('hex'),
      'Tủ đồ QA',
      await S.password(S.random()),
      [role],
      role === 'PLAYER' ? null : S.encrypt(S.authenticator.generateSecret()),
    );
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at,mfa_at) VALUES($1,$2,$3,now()+interval'1 hour',now())",
      [S.hash(token), id, csrf],
    );
    return id;
  });
  return { id, token, csrf };
}
async function api(c, path, data) {
  const r = await fetch(base + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      Cookie: 'anhoa_session=' + c.token,
      'X-CSRF-Token': c.csrf,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
      'If-Match': '1',
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return { status: r.status, ...(await r.json()) };
}
async function publish(c, item) {
  const d = await api(c, '/api/admin/catalog/drafts', {
    kind: 'item',
    stableId: item.id,
    payload: item,
    reason: 'Atlas QA draft',
  });
  assert.equal(d.status, 201);
  const r = await api(c, '/api/admin/catalog/drafts/' + d.id + '/publish', {
    reason: 'Atlas QA publish',
  });
  assert.equal(r.status, 200);
}
(async () => {
  const admin = await fixture('SUPER_ADMIN'),
    player = await fixture(),
    original = await api(admin, '/api/catalog');
  const png = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="185"><path d="M44 68Q59 62 78 68L81 111Q60 117 39 111Z" fill="#af6177"/><path d="M164 68Q179 62 198 68L201 111Q180 117 159 111Z" fill="#bf7187"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const upload = await api(admin, '/api/admin/assets', {
    data: png.toString('base64'),
    reason: 'QA transparent garment atlas',
  });
  ok(
    upload.status === 201 && upload.width === 240 && upload.height === 185,
    'atlas upload validated',
  );
  const atlas = {
    url: upload.url,
    width: 240,
    height: 185,
    frameWidth: 120,
    frameHeight: 185,
    poses: Object.fromEntries(
      W.poses.map((p) => [
        p,
        Object.fromEntries(
          W.directions.map((d) => [d, ['walk', 'wave'].includes(p) ? [0, 1] : [0]]),
        ),
      ]),
    ),
  };
  const item = {
    id: 'top_atlas_' + crypto.randomBytes(3).toString('hex'),
    name: 'Áo atlas QA',
    slot: 'top',
    icon: '👕',
    price: 10,
    color: '#af6177',
    rigCompatibility: ['male'],
    spriteVersion: 1,
    assets: { male: atlas },
  };
  const bad = structuredClone(item);
  delete bad.assets.male.poses.wave.left;
  ok(
    (
      await api(admin, '/api/admin/catalog/drafts', {
        kind: 'item',
        stableId: item.id,
        payload: bad,
        reason: 'Missing pose test',
      })
    ).status === 422,
    'missing pose prevents publication',
  );
  const mismatch = structuredClone(item);
  mismatch.assets.male.width = 360;
  ok(
    (
      await api(admin, '/api/admin/catalog/drafts', {
        kind: 'item',
        stableId: item.id,
        payload: mismatch,
        reason: 'Atlas dimensions test',
      })
    ).status === 422,
    'metadata mismatch rejected',
  );
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } });
    await c.addCookies([
      { name: 'anhoa_session', value: player.token, url: base, httpOnly: true, sameSite: 'Strict' },
    ]);
    const pages = [await c.newPage(), await c.newPage()],
      errors = [];
    for (const p of pages) {
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(base);
      await p.waitForFunction(() => PARISH_ONLINE.active && document.getElementById('openChat'));
      await p.locator('[data-open=shop]').click();
    }
    await publish(admin, item);
    for (const p of pages) await p.waitForSelector(`[data-item=${item.id}]`);
    checks++;
    ok(
      (await api(player, '/api/shop/purchase', { itemId: item.id })).status === 422,
      'female cannot buy male-only rig',
    );
    await pages[0].evaluate(async () => {
      await PARISH_ONLINE.command({
        url: '/api/player/appearance',
        method: 'PUT',
        data: { gender: 'male' },
      });
    });
    for (const p of pages) {
      await p.locator(`[data-item=${item.id}]`).click();
      await p.getByRole('button', { name: 'Mua và mặc', exact: true }).waitFor();
    }
    await Promise.all(
      pages.map((p) => p.getByRole('button', { name: 'Mua và mặc', exact: true }).click()),
    );
    await pages[0].waitForFunction(() => document.querySelector('#worldPlayer image'));
    const bought = await api(player, '/api/me');
    ok(bought.state.coins === 140, 'two actual browser tabs debit once');
    ok(bought.state.inventory.filter((x) => x === item.id).length === 1, 'single ownership');
    await pages[0].screenshot({ path: 'artifacts/online/atlas-shop.png' });
    checks++;
    await publish(admin, { ...item, archived: true });
    ok(
      (await api(player, '/api/me')).state.inventory.includes(item.id),
      'atlas ownership survives archive',
    );
    await pages[0].evaluate(async () => {
      await PARISH_ONLINE.command({
        url: '/api/player/appearance',
        method: 'PUT',
        data: { gender: 'female' },
      });
    });
    const changed = await api(player, '/api/me');
    ok(
      changed.state.equipped.top === 'shirt_cream' && changed.state.inventory.includes(item.id),
      'incompatible gender safely unequips while preserving inventory',
    );
    await pages[0].evaluate(async (itemId) => {
      await PARISH_ONLINE.command({
        url: '/api/player/appearance',
        method: 'PUT',
        data: { gender: 'male' },
      });
      await PARISH_ONLINE.command({
        url: '/api/player/equipment',
        method: 'PUT',
        data: { itemId },
      });
    }, item.id);
    for (const p of pages)
      if (await p.locator('.window .close').count()) await p.locator('.window .close').click();
    await pages[0].waitForFunction(() => document.querySelector('#worldPlayer image'));
    await pages[0].screenshot({ path: 'artifacts/online/atlas-equipped.png' });
    await pages[0].route('**/uploads/*.webp', (r) => r.abort());
    await pages[0].reload();
    await pages[0].waitForFunction(
      () => PARISH_ONLINE.active && document.querySelector('#worldPlayer [data-part=torso]'),
    );
    ok(
      await pages[0].evaluate(
        () =>
          document.querySelector('#worldPlayer [data-part=torso] path').getAttribute('fill') ===
          '#af6177',
      ),
      'failed atlas keeps visible palette fallback',
    );
    assert.deepEqual(errors, []);
    checks++;
    await c.close();
    const ac = await b.newContext({ viewport: { width: 1366, height: 768 } });
    await ac.addCookies([
      { name: 'anhoa_session', value: admin.token, url: base, httpOnly: true, sameSite: 'Strict' },
    ]);
    const ap = await ac.newPage();
    await ap.goto(base + '/admin');
    await ap.locator('[data-tab=catalog]').click();
    await ap.getByRole('button', { name: 'Thêm trang phục', exact: true }).click();
    await ap.screenshot({ path: 'artifacts/online/admin-wardrobe-form.png' });
    ok((await ap.locator('textarea').count()) > 0, 'Admin atlas and pose preview form');
    await ac.close();
  } finally {
    await b.close();
    await api(admin, '/api/admin/catalog/publications/' + original.version + '/rollback', {
      reason: 'Restore pre-atlas QA catalog',
    });
  }
  console.log(`PASS ${checks} atlas/rig/live catalog/two-tab browser checks`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
