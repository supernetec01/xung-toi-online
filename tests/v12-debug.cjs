const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  { chromium } = require('playwright');
const { pool, tx } = require('../server/db.cjs'),
  A = require('../server/auth.cjs'),
  S = require('../server/security.cjs');
if (!process.env.DATABASE_URL?.includes('/anhoa_qc_') && process.env.NODE_ENV !== 'test')
  throw Error('QC/test database only');
const base = 'http://127.0.0.1:5001';
(async () => {
  const roles = {},
    fixtures = {};
  for (const role of ['PLAYER', 'MODERATOR', 'CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN']) {
    const token = S.random(),
      csrf = S.random();
    await tx(async (db) => {
      const id = await A.newUser(
        db,
        'debug_' + crypto.randomBytes(6).toString('hex'),
        'QC Developer',
        await S.password(S.random()),
        [role],
        role === 'PLAYER' ? null : S.encrypt(S.authenticator.generateSecret()),
      );
      await db.query(
        "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at,mfa_at) VALUES($1,$2,$3,now()+interval'1 hour',now())",
        [S.hash(token), id, csrf],
      );
    });
    const response = await fetch(base + '/admin/scene-debug.js', {
      headers: { Cookie: 'anhoa_session=' + token },
    });
    roles[role] = response.status;
    fixtures[role] = { token, csrf };
    assert.equal(response.status, ['ADMIN', 'SUPER_ADMIN'].includes(role) ? 200 : 403);
  }
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    const guest = await b.newPage();
    await guest.goto(base + '/?debugScene=1');
    await guest.waitForSelector('#stage[data-scene]');
    assert.equal(await guest.locator('#sceneDebugPanel').count(), 0);
    await guest.close();
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } });
    await c.addCookies([
      {
        name: 'anhoa_session',
        value: fixtures.ADMIN.token,
        url: base,
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    const p = await c.newPage();
    await p.goto(base + '/?debugScene=1');
    await p.waitForSelector('#sceneDebugOverlay');
    assert.equal(await p.locator('[data-debug-flag]').count(), 6);
    await p.screenshot({ path: 'artifacts/v12/t01-debug-admin.jpg', quality: 82 });
    await p.locator('[data-debug-flag=showColliders]').uncheck();
    assert.equal(await p.locator('#sceneDebugOverlay rect').count(), 0);
    await p.getByRole('button', { name: 'Đóng debug', exact: true }).click();
    assert.equal(await p.locator('#sceneDebugOverlay').count(), 0);
    await c.close();
    const asset = await b.newPage();
    await asset.goto(base);
    await asset.waitForFunction(() => PARISH_SCENE_ART?.preload);
    const loaded = await asset.evaluate(async () => {
      const scene = PARISH_DATA.scenes.christmas;
      await PARISH_SCENE_ART.preload(scene);
      return PARISH_SCENE_ART.preload(scene);
    });
    assert(loaded.ready);
    await asset.close();
  } finally {
    await b.close();
  }
  fs.writeFileSync(
    'artifacts/v12/t01-debug.json',
    JSON.stringify(
      { roles, guestHasNoDebug: true, sixOverlaysWork: true, assetPreloadReady: true },
      null,
      2,
    ) + '\n',
  );
  console.log('PASS private developer overlays, five-role RBAC and reusable asset loader.');
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
