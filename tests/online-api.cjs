const assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  fs = require('node:fs');
const { pool, tx } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs');
const base = 'http://127.0.0.1:5001';
let checks = 0;
const ok = (v, msg) => {
  assert(v, msg);
  checks++;
};
class Client {
  constructor() {
    this.cookie = '';
    this.csrf = '';
  }
  async call(path, data, method, extra = {}, walking = false) {
    if (path === '/api/player/location' && !walking)
      return require('./lib/move.cjs')(
        data,
        (point) => this.call(path, point, method, extra, true),
        (url) => this.call(url),
      );
    const r = await fetch(base + path, {
      method: method || (data ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.cookie,
        'X-CSRF-Token': this.csrf,
        'Idempotency-Key': crypto.randomUUID(),
        ...extra,
      },
      signal: AbortSignal.timeout(20000),
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
    if (r.headers.get('set-cookie')) this.cookie = r.headers.get('set-cookie').split(';')[0];
    let body;
    try {
      body = await r.json();
    } catch {
      body = {};
    }
    if (body.csrfToken) this.csrf = body.csrfToken;
    return { status: r.status, ...body };
  }
}
(async () => {
  const health = await fetch(base + '/healthz');
  assert.equal((await health.json()).mode, 'online-demo');
  const anon = new Client();
  ok((await anon.call('/api/admin/dashboard')).status === 401, 'anonymous admin denied');
  const staffAccounts = [];
  for (const role of ['SUPER_ADMIN', 'MODERATOR', 'CONTENT_EDITOR']) {
    const c = new Client(),
      login = 'qa_' + crypto.randomBytes(6).toString('hex'),
      password = S.random(),
      secret = S.authenticator.generateSecret(),
      pass = await S.password(password),
      id = await tx((db) => A.newUser(db, login, 'QA ' + role, pass, [role], S.encrypt(secret)));
    ok(
      (await c.call('/api/auth/login', { login, password, code: '000000' })).status === 401,
      'MFA required',
    );
    const r = await c.call('/api/auth/login', {
      login,
      password,
      code: S.authenticator.generate(secret),
    });
    ok(r.status === 200, 'staff login');
    staffAccounts.push({ c, id, login, password, secret });
  }
  const [admin, mod, editor] = staffAccounts,
    p = new Client(),
    login = 'qa_p_' + crypto.randomBytes(5).toString('hex'),
    password = S.random();
  const reg = await p.call('/api/auth/register', { login, password, displayName: 'QA Player' });
  ok(reg.status === 201, 'register');
  const playerId = reg.user.id;
  ok((await p.call('/api/admin/dashboard')).status === 403, 'player stats denied');
  ok((await mod.c.call('/api/admin/presence/summary')).status === 403, 'moderator stats denied');
  ok((await editor.c.call('/api/admin/dashboard')).status === 403, 'editor stats denied');
  ok((await admin.c.call('/api/admin/dashboard')).status === 200, 'admin stats ready');
  ok(
    (
      await p.call('/api/auth/register', {
        login: 'badrole',
        password,
        displayName: 'Bad',
        roles: ['ADMIN'],
      })
    ).status === 400,
    'cannot register privileged role',
  );
  ok(
    (await p.call('/api/player/appearance', { role: 'ADMIN' }, 'PUT')).status === 400,
    'cannot mutate own role',
  );
  ok(
    (await p.call('/api/player/appearance', { gender: 'male' }, 'PUT', { 'X-CSRF-Token': 'wrong' }))
      .status === 403,
    'CSRF denied',
  );
  ok(
    (
      await p.call('/api/player/appearance', { gender: 'male' }, 'PUT', {
        Origin: 'https://evil.example',
      })
    ).status === 403,
    'origin denied',
  );
  const catalog = await p.call('/api/catalog');
  ok(catalog.items.length >= 21, 'catalog seeded');
  const key = crypto.randomUUID(),
    before = (await p.call('/api/me')).state.coins;
  const buys = await Promise.all(
    Array.from({ length: 20 }, () =>
      p.call('/api/shop/purchase', { itemId: 'shirt_blue' }, 'POST', { 'Idempotency-Key': key }),
    ),
  );
  ok(
    buys.every((b) => b.status === 200),
    'parallel purchase receipts',
  );
  const st = (await p.call('/api/me')).state;
  ok(st.coins === before - 110, 'one debit');
  ok(st.inventory.filter((x) => x === 'shirt_blue').length === 1, 'one owned item');
  ok(
    (
      await p.call('/api/shop/purchase', { itemId: 'shirt_rose' }, 'POST', {
        'Idempotency-Key': key,
      })
    ).status === 409,
    'key payload conflict',
  );
  ok(
    (await p.call('/api/player/equipment', { itemId: 'shirt_noel' }, 'PUT')).status === 403,
    'unowned equip rejected',
  );
  const activeCatalog = await p.call('/api/catalog'),
    [luciaX, luciaY] = activeCatalog.scenes.courtyard.npcPoints.lucia;
  const move = await p.call('/api/player/location', { x: luciaX, y: luciaY });
  ok(move.status === 200, 'move');
  ok((await p.call('/api/player/interact', { npcId: 'lucia' })).status === 200, 'NPC interaction');
  const claims = await Promise.all(
    Array.from({ length: 20 }, () => p.call('/api/quests/q_welcome/claim', {})),
  );
  ok(
    claims.every((c) => c.status === 200),
    'claim retries',
  );
  ok((await p.call('/api/me')).state.coins === 110, 'one quest reward');
  ok((await p.call('/api/quests/q_garden/claim', {})).status === 422, 'cannot claim incomplete');
  const [sweepX, sweepY] = activeCatalog.actions.find((a) => a.id === 'sweep').anchor;
  ok(
    (await p.call('/api/player/location', { x: sweepX, y: sweepY })).status === 200,
    'move action anchor',
  );
  const starts = await Promise.all([
    p.call('/api/actions/sweep/start', {}),
    p.call('/api/actions/sweep/start', {}),
  ]);
  ok(starts.filter((r) => r.status === 200).length === 1, 'single active action');
  const execution = starts.find((r) => r.status === 200).state.activeAction;
  ok(
    (await p.call('/api/actions/executions/' + execution.id + '/complete', {})).status === 409,
    'too early blocked',
  );
  await new Promise((r) => setTimeout(r, 3100));
  const completes = await Promise.all(
    Array.from({ length: 20 }, () =>
      p.call('/api/actions/executions/' + execution.id + '/complete', {}),
    ),
  );
  ok(
    completes.every((c) => c.status === 200),
    'action replay safe',
  );
  ok((await p.call('/api/me')).state.coins === 117, 'one action reward');
  ok((await p.call('/api/actions/sweep/start', {})).status === 409, 'server cooldown');
  ok((await p.call('/api/daily/claim', {})).status === 422, 'replay cannot farm daily reward');
  // Editor draft allowed, publish denied. Admin publishes, archive retains ownership and rollback retains item ID.
  const item = {
    id: 'qa_top_' + crypto.randomBytes(3).toString('hex'),
    name: 'Áo QA',
    slot: 'top',
    price: 0,
    color: '#708f9f',
    icon: '👕',
  };
  const draft = await editor.c.call('/api/admin/catalog/drafts', {
    kind: 'item',
    stableId: item.id,
    payload: item,
    reason: 'QA catalog test',
  });
  ok(draft.status === 201, 'editor draft');
  ok(
    (
      await editor.c.call(
        '/api/admin/catalog/drafts/' + draft.id + '/publish',
        { reason: 'QA forbidden' },
        'POST',
        { 'If-Match': '1' },
      )
    ).status === 403,
    'editor cannot publish',
  );
  ok(
    (
      await admin.c.call(
        '/api/admin/catalog/drafts/' + draft.id + '/publish',
        { reason: 'QA publication' },
        'POST',
        { 'If-Match': '1' },
      )
    ).status === 200,
    'admin publish',
  );
  ok(
    (await p.call('/api/shop/purchase', { itemId: item.id })).status === 200,
    'buy published garment',
  );
  const archive = await admin.c.call('/api/admin/catalog/drafts', {
    kind: 'item',
    stableId: item.id,
    payload: { ...item, archived: true },
    reason: 'QA archive',
  });
  await admin.c.call(
    '/api/admin/catalog/drafts/' + archive.id + '/publish',
    { reason: 'QA archive' },
    'POST',
    { 'If-Match': '1' },
  );
  ok((await p.call('/api/me')).state.inventory.includes(item.id), 'archive retains owned item');
  ok(
    (await p.call('/api/player/equipment', { itemId: item.id }, 'PUT')).status === 200,
    'archive remains wearable',
  );
  const conflict = await editor.c.call('/api/admin/catalog/drafts', {
    kind: 'action',
    stableId: 'sweep',
    payload: catalog.actions.find((x) => x.id === 'sweep'),
    reason: 'QA optimistic lock',
  });
  ok(
    (
      await editor.c.call(
        '/api/admin/catalog/drafts/' + conflict.id,
        { payload: catalog.actions.find((x) => x.id === 'sweep'), reason: 'QA edit' },
        'PATCH',
        { 'If-Match': '1' },
      )
    ).status === 200,
    'draft update',
  );
  ok(
    (
      await editor.c.call(
        '/api/admin/catalog/drafts/' + conflict.id,
        { payload: catalog.actions.find((x) => x.id === 'sweep'), reason: 'QA stale' },
        'PATCH',
        { 'If-Match': '1' },
      )
    ).status === 409,
    'stale draft rejected',
  );
  const hostile = { ...item, id: 'qa_hostile', name: '<img src=x onerror=alert(1)>' };
  ok(
    (
      await editor.c.call('/api/admin/catalog/drafts', {
        kind: 'item',
        stableId: hostile.id,
        payload: hostile,
        reason: 'QA XSS',
      })
    ).status === 422,
    'catalog HTML rejected',
  );
  ok(
    (
      await mod.c.call('/api/admin/users/' + admin.id + '/sanctions', {
        scope: 'CHAT',
        durationSeconds: 3600,
        reason: 'QA forbidden',
      })
    ).status === 403,
    'moderator cannot sanction admin',
  );
  const sanction = await mod.c.call('/api/admin/users/' + playerId + '/sanctions', {
    scope: 'CHAT',
    durationSeconds: 60,
    reason: 'QA temporary mute',
  });
  ok(sanction.status === 200, 'chat mute');
  ok(
    (
      await p.call('/api/chat/send', {
        requestId: crypto.randomUUID(),
        roomId: 'global',
        body: 'Xin chào',
      })
    ).status === 403,
    'mute enforced REST',
  );
  ok(
    (await p.call('/api/player/appearance', { gender: 'male' }, 'PUT')).status === 200,
    'mute does not block gameplay',
  );
  ok(
    (await p.call('/api/me/chat-appeals', { sanctionId: sanction.id, body: 'QA xin kiểm tra lại' }))
      .status === 201,
    'appeal persisted',
  );
  ok(
    (await mod.c.call('/api/admin/sanctions/' + sanction.id, { reason: 'QA unmute' }, 'DELETE'))
      .status === 200,
    'unmute',
  );
  const msg = await p.call('/api/chat/send', {
    requestId: crypto.randomUUID(),
    roomId: 'global',
    body: '<img onerror=alert(1)> Xin chào',
  });
  ok(msg.status === 200 && msg.message.status === 'published', 'chat stays plain text');
  ok(
    (
      await p.call('/api/chat/send', {
        requestId: crypto.randomUUID(),
        roomId: 'global',
        body: 'spam',
      })
    ).status === 429,
    'rate limit',
  );
  const other = new Client(),
    otherLogin = 'qa_o_' + crypto.randomBytes(4).toString('hex');
  await other.call('/api/auth/register', {
    login: otherLogin,
    password: S.random(),
    displayName: 'QA Reporter',
  });
  ok(
    (await other.call('/api/chat/messages/' + msg.message.id + '/report', { reason: 'QA review' }))
      .status === 200,
    'report',
  );
  ok(
    (
      await mod.c.call('/api/admin/chat/messages/' + msg.message.id + '/hide', {
        reason: 'QA hide',
      })
    ).status === 200,
    'moderator hide',
  );
  ok(
    !(await other.call('/api/chat/messages?room=global')).messages.some(
      (m) => m.id === msg.message.id,
    ),
    'hidden message omitted',
  );
  ok(
    (
      await admin.c.call('/api/admin/users/' + admin.id + '/roles', {
        roles: ['PLAYER'],
        reason: 'QA self downgrade',
      })
    ).status === 403,
    'no self role change',
  );
  ok(
    (
      await admin.c.call('/api/admin/users/' + playerId + '/roles', {
        roles: ['ADMIN'],
        reason: 'QA needs MFA',
      })
    ).status === 422,
    'target MFA prerequisite',
  );
  const live = await admin.c.call('/api/admin/live/start', {
    sceneId: 'courtyard',
    keyword: 'NOEL',
    action: 'wave',
    maxVisibleGuests: 20,
    queueMax: 100,
    reason: 'QA 100 events',
  });
  ok(live.status === 200, 'mock start');
  const liveWallet = (await p.call('/api/me')).state.coins;
  const comments = await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      admin.c.call('/api/admin/live/simulate-comment', {
        eventId: 'qa_event_' + i + '_' + live.sessionId,
        viewerKey: 'qa_viewer_' + i,
        displayName: i === 0 ? '<script>alert(1)</script>' : 'Khách ' + i,
        text: 'NOEL',
      }),
    ),
  );
  ok(
    comments.every((c) => c.status === 202 && c.accepted),
    '100 comments accepted with bounded queue',
  );
  const dup = await admin.c.call('/api/admin/live/simulate-comment', {
    eventId: 'qa_event_0_' + live.sessionId,
    viewerKey: 'qa_viewer_0',
    displayName: 'Khách',
    text: 'NOEL',
  });
  ok([202, 429].includes(dup.status), 'duplicate/cap safe');
  ok((await p.call('/api/me')).state.coins === liveWallet, 'guest cannot mint player coins');
  ok((await p.call('/api/admin/live/health')).status === 403, 'private live stats');
  await admin.c.call('/api/admin/live/stop', { reason: 'QA cleanup' });
  const stopped = await admin.c.call('/api/admin/live/health');
  ok(stopped.queue === 0 && stopped.visible === 0 && !stopped.running, 'kill switch cleans queue');
  const world = await p.call('/api/world');
  for (const forbidden of require('../config/v4-boundaries.json').publicForbiddenFields)
    ok(!JSON.stringify(world).includes(forbidden), 'no public ' + forbidden);
  ok(
    (
      await admin.c.call('/api/admin/catalog/publications/' + catalog.version + '/rollback', {
        reason: 'QA restore baseline catalog',
      })
    ).status === 200,
    'catalog rollback',
  );
  const retained = await p.call('/api/catalog');
  assert.deepEqual(
    retained.scenes.nave,
    catalog.scenes.nave,
    'restore the starting layout, including V8 art and collision',
  );
  ok(
    retained.items.some((x) => x.id === item.id && x.archived),
    'rollback preserves archived owned ID',
  );
  const ledger = (
    await pool.query('SELECT sum(delta) total FROM coin_ledger WHERE user_id=$1', [playerId])
  ).rows[0];
  ok(Number(ledger.total) === (await p.call('/api/me')).state.coins, 'ledger invariant');
  let immutable = false;
  try {
    await pool.query('UPDATE coin_ledger SET delta=0 WHERE user_id=$1', [playerId]);
  } catch {
    immutable = true;
  }
  ok(immutable, 'append-only enforced by DB');
  const stored = await pool.query('SELECT password_hash FROM game_users WHERE id=$1', [playerId]);
  ok(
    stored.rows[0].password_hash.startsWith('scrypt:') &&
      !stored.rows[0].password_hash.includes(password),
    'password hash',
  );
  await admin.c.call('/api/admin/users/' + playerId + '/sessions/revoke', { reason: 'QA revoke' });
  ok((await p.call('/api/me')).status === 401, 'session revoke');
  fs.mkdirSync('.local', { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    '.local/test-accounts.json',
    JSON.stringify(
      {
        admin: { login: admin.login, password: admin.password, secret: admin.secret },
        moderator: { login: mod.login, password: mod.password, secret: mod.secret },
        editor: { login: editor.login, password: editor.password, secret: editor.secret },
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(`PASS ${checks} PostgreSQL/API/security checks`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
