const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const { pool, tx } = require('../../server/db.cjs'),
  A = require('../../server/auth.cjs'),
  S = require('../../server/security.cjs'),
  C = require('../../server/catalog.cjs');
if (!process.env.DATABASE_URL?.includes('/anhoa_qc_')) throw Error('QC database required');
async function fixture(role = 'PLAYER') {
  const token = S.random(),
    csrf = S.random();
  const id = await tx(async (db) => {
    const id = await A.newUser(
      db,
      'extra_' + crypto.randomBytes(5).toString('hex'),
      'Bạn QC',
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
  return { token, csrf, id };
}
async function api(c, url, data, extra = {}) {
  const r = await fetch('http://127.0.0.1:5001' + url, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      Cookie: 'anhoa_session=' + c.token,
      'X-CSRF-Token': c.csrf,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
      ...extra,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return { status: r.status, body: await r.json() };
}
(async () => {
  const roles = {};
  for (const role of ['PLAYER', 'MODERATOR', 'CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN']) {
    const c = await fixture(role),
      r = await api(c, '/api/admin/dashboard');
    roles[role] = r.status;
    assert.equal(r.status, ['ADMIN', 'SUPER_ADMIN'].includes(role) ? 200 : 403);
  }
  const raw = { ...C.R.defaults(), username: 'Demo QC', coins: 200 };
  for (const sameKey of [true, false]) {
    const c = await fixture(),
      key = crypto.randomUUID();
    const preview = await api(c, '/api/demo/preview', raw);
    assert.equal(preview.body.allowed, true);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        api(c, '/api/demo/import', raw, { 'Idempotency-Key': sameKey ? key : crypto.randomUUID() }),
      ),
    );
    assert.equal(results.filter((r) => r.status === 200).length, sameKey ? 10 : 1);
    const st = (await api(c, '/api/me')).body.state;
    assert.equal(st.coins, 200);
    assert.equal(
      Number(
        (await pool.query('SELECT sum(delta) n FROM coin_ledger WHERE user_id=$1', [c.id])).rows[0]
          .n,
      ),
      200,
    );
  }
  const c = await fixture(),
    preview = await api(c, '/api/demo/preview', raw);
  const rr = await fetch('http://127.0.0.1:5001/api/player/appearance', {
    method: 'PUT',
    headers: {
      Cookie: 'anhoa_session=' + c.token,
      'X-CSRF-Token': c.csrf,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ gender: 'male' }),
  });
  assert.equal(rr.status, 200);
  const stale = await api(c, '/api/demo/import', raw, {
    'If-Match': String(preview.body.accountVersion),
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'IMPORT_PREVIEW_STALE');
  const teleport = [];
  for (let i = 0; i < 2; i++) {
    await api(c, '/api/player/travel', { sceneId: 'nave' });
    const start = performance.now(),
      r = await api(c, '/api/player/location', { x: 50, y: 58 });
    teleport.push({
      status: r.status,
      elapsedMs: performance.now() - start,
      from: [50, 92],
      to: [r.body.state?.x, r.body.state?.y],
    });
  }
  assert(
    teleport.every((r) => r.status === 422),
    'forged long-distance move must be rejected',
  );
  const expired = await fixture();
  await pool.query(
    "UPDATE user_sessions SET expires_at=now()-interval'1 minute' WHERE user_id=$1",
    [expired.id],
  );
  assert.equal((await api(expired, '/api/me')).status, 401);
  assert.equal((await api(expired, '/api/shop/purchase', { itemId: 'shirt_blue' })).status, 401);
  const robots = {},
    robotActor = await fixture('ADMIN');
  for (const url of ['/account', '/admin']) {
    const r = await fetch('http://127.0.0.1:5001' + url, {
      headers: { Cookie: 'anhoa_session=' + robotActor.token },
    });
    robots[url] = r.headers.get('x-robots-tag');
    assert.match(robots[url] || '', /noindex/);
  }
  const disabled = {};
  for (const url of ['/api/payments/webhook', '/api/tickets/checkout', '/api/payments/checkout']) {
    disabled[url] = (await api(c, url, {})).status;
    assert.equal(disabled[url], 404);
  }
  fs.writeFileSync(
    'qa/evidence/security-extra.json',
    JSON.stringify(
      {
        roles,
        robots,
        concurrentImportSameKey: 10,
        concurrentImportDifferentKeys: 10,
        stalePreviewRejected: true,
        expiredSessionRejected: true,
        teleport,
        velocityGapRejected: teleport.every((r) => r.status === 422),
        disabled,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Security checks completed: roles/import/payment-disabled; forged server teleport rejected twice.',
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
