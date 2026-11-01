const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  WebSocket = require('ws');
const { pool, tx } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs'),
  { desiredAmbient } = require('../server/world.cjs'),
  { guard } = require('../server/role-guard.cjs'),
  { classify } = require('../server/chat.cjs'),
  Live = require('../server/live.cjs');
const base = 'http://127.0.0.1:5001';
let checks = 0;
const ok = (v, label) => {
  assert(v, label);
  checks++;
};
const sockets = [];
async function fixture(role = 'PLAYER') {
  const token = S.random(),
    csrf = S.random(),
    secret = S.authenticator.generateSecret(),
    password = await S.password(S.random()),
    login = 'rt_' + crypto.randomBytes(6).toString('hex');
  const id = await tx(async (db) => {
    const id = await A.newUser(
      db,
      login,
      'Realtime QA',
      password,
      [role],
      role === 'PLAYER' ? null : S.encrypt(secret),
    );
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at,mfa_at) VALUES($1,$2,$3,now()+interval'1 hour',now())",
      [S.hash(token), id, csrf],
    );
    return id;
  });
  return { id, token, csrf, cookie: 'anhoa_session=' + token, clientId: crypto.randomUUID() };
}
async function api(c, path, data, method = 'POST', headers = {}) {
  const r = await fetch(base + path, {
    method: data === undefined ? 'GET' : method,
    headers: {
      Cookie: c.cookie,
      'X-CSRF-Token': c.csrf,
      'Content-Type': 'application/json',
      'X-Client-Id': c.clientId,
      'Idempotency-Key': crypto.randomUUID(),
      ...headers,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(20000),
  });
  let body;
  try {
    body = await r.json();
  } catch {
    body = {};
  }
  return { status: r.status, ...body };
}
async function connect(c) {
  const ws = new WebSocket(base.replace('http', 'ws') + '/ws', {
    headers: { Cookie: c.cookie, Origin: base },
  });
  sockets.push(ws);
  const messages = [];
  ws.on('message', (b) => messages.push(JSON.parse(b)));
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(JSON.stringify({ type: 'auth', csrfToken: c.csrf, clientId: c.clientId }));
  await wait(() => messages.some((m) => m.type === 'ready'));
  const timer = setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'heartbeat' }));
  }, 10000);
  timer.unref();
  ws.on('close', () => clearInterval(timer));
  return { ws, messages };
}
async function wait(fn, ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('Realtime wait timed out');
}
(async () => {
  ok(
    desiredAmbient({ target: 20, fixed: 2, real: 0, guest: 0, max: 18, cap: 32 }) === 18,
    '0 real NPC density',
  );
  for (const [real, n] of [
    [5, 13],
    [12, 6],
    [20, 0],
  ])
    ok(
      desiredAmbient({ target: 20, fixed: 2, real, guest: 0, max: 18, cap: 32 }) === n,
      'density respects real',
    );
  ok(
    desiredAmbient({ target: 20, fixed: 2, real: 0, guest: 20, max: 18, cap: 16 }) === 0,
    'guest capacity',
  );
  assert.throws(
    () =>
      guard({
        actorId: 'x',
        targetId: 'y',
        currentRoles: ['SUPER_ADMIN'],
        nextRoles: ['PLAYER'],
        superAdminCount: 1,
      }),
    (e) => e.code === 'LAST_SUPER_ADMIN',
  );
  checks++;
  assert.throws(
    () =>
      guard({
        actorId: 'x',
        targetId: 'x',
        currentRoles: ['SUPER_ADMIN'],
        nextRoles: ['PLAYER'],
        superAdminCount: 2,
      }),
    (e) => e.code === 'NO_SELF_ROLE_CHANGE',
  );
  checks++;
  ok(classify('địt mẹ').status === 'held', 'Vietnamese filter');
  ok(classify('d i t m e').status === 'held', 'obfuscation filter');
  ok(classify('xin chào').status === 'published', 'ordinary Vietnamese');
  ok(classify('SĐT 0901234567').status === 'rejected', 'PII filter');
  const admin = await fixture('SUPER_ADMIN'),
    mod = await fixture('MODERATOR'),
    p = await fixture(),
    second = { ...p, clientId: crypto.randomUUID() };
  const s1 = await connect(p),
    s2 = await connect(second),
    sm = await connect(mod);
  ok(s1.messages.find((m) => m.type === 'ready').primary === true, 'first primary');
  ok(s2.messages.find((m) => m.type === 'ready').primary === false, 'secondary readonly');
  ok(
    (await api(second, '/api/player/location', { x: 52, y: 80 })).status === 409,
    'secondary cannot move',
  );
  sm.ws.send(JSON.stringify({ type: 'admin.subscribe' }));
  await wait(() => sm.messages.some((m) => m.code === 'FORBIDDEN'));
  ok(
    !sm.messages.some((m) => m.type === 'admin.presence_snapshot'),
    'moderator receives no admin stream',
  );
  const snap = await api(p, '/api/world');
  ok(snap.actors.filter((a) => a.self).length === 1, 'one avatar for two tabs');
  for (const f of require('../config/v4-boundaries.json').publicForbiddenFields)
    ok(!JSON.stringify(snap).includes(f), 'no public ' + f);
  const text = 'Xin chào qua WS';
  s1.ws.send(
    JSON.stringify({
      type: 'chat.send',
      requestId: crypto.randomUUID(),
      roomId: 'global',
      body: text,
    }),
  );
  await wait(() => s1.messages.some((m) => m.type === 'chat.ack'));
  ok(
    s1.messages.filter((m) => m.type === 'chat.message' && m.message.body === text).length === 1,
    'WS message delivered once',
  );
  const mute = await api(mod, '/api/admin/users/' + p.id + '/sanctions', {
    scope: 'CHAT',
    durationSeconds: 60,
    reason: 'Realtime test mute',
  });
  ok(mute.status === 200, 'WS mute created');
  s1.ws.send(
    JSON.stringify({
      type: 'chat.send',
      requestId: crypto.randomUUID(),
      roomId: 'global',
      body: 'blocked',
    }),
  );
  await wait(() => s1.messages.some((m) => m.code === 'CHAT_MUTED'));
  ok(
    (await api(p, '/api/player/appearance', { gender: 'male' }, 'PUT')).status === 200,
    'mute still plays',
  );
  await pool.query("UPDATE sanctions SET ends_at=now()-interval'1 second' WHERE id=$1", [mute.id]);
  await new Promise((r) => setTimeout(r, 3100));
  s1.ws.send(
    JSON.stringify({
      type: 'chat.send',
      requestId: crypto.randomUUID(),
      roomId: 'global',
      body: 'Mở lại sau hết hạn',
    }),
  );
  await wait(() =>
    s1.messages.some((m) => m.type === 'chat.message' && m.message.body.includes('hết hạn')),
  );
  checks++;
  const seatPlayer = await fixture(),
    catalog = await api(p, '/api/catalog');
  const sc = catalog.scenes.nave,
    seat = sc.spots.find((s) => s[5] === 'seat');
  const anchor = require('../server/catalog.cjs').N.nearest(
    sc,
    sc.anchors[seat[0]] || [seat[3], seat[4]],
  );
  for (const x of [p, seatPlayer]) {
    ok(
      (await api(x, '/api/player/travel', { sceneId: 'nave' })).status === 200,
      'travel to shared seats',
    );
    ok(
      (await api(x, '/api/player/location', { x: anchor[0], y: anchor[1] })).status === 200,
      'approach shared seat',
    );
  }
  const seats = await Promise.all(
    [p, seatPlayer].map((x) => api(x, '/api/player/interact', { spotId: seat[0], choice: 0 })),
  );
  ok(
    seats.filter((r) => r.status === 200).length === 1 &&
      seats.filter((r) => r.status === 409).length === 1,
    'one user per seat under contention',
  );
  for (const x of [p, seatPlayer]) await api(x, '/api/player/travel', { sceneId: 'courtyard' });
  ok(
    (
      await pool.query('SELECT 1 FROM seat_leases WHERE user_id=ANY($1::uuid[])', [
        [p.id, seatPlayer.id],
      ])
    ).rowCount === 0,
    'leaving scene releases seat lease',
  );
  const cfg = await api(admin, '/api/admin/ambient-configs');
  ok(
    (
      await api(
        admin,
        '/api/admin/ambient-configs',
        {
          sceneId: 'courtyard',
          targetVisualActors: 10,
          ambientMax: 10,
          renderCap: 32,
          waypoints: [
            [40, 76],
            [60, 76],
          ],
          schedules: [{ fromHour: 0, toHour: 24, pose: 'wave' }],
          reason: 'Realtime density test',
        },
        'PUT',
        { 'If-Match': String(cfg.version) },
      )
    ).status === 200,
    'versioned per-scene NPC config',
  );
  ok(
    (
      await api(
        admin,
        '/api/admin/ambient-configs',
        { targetVisualActors: 16, ambientMax: 18, renderCap: 32, reason: 'stale' },
        'PUT',
        { 'If-Match': String(cfg.version) },
      )
    ).status === 409,
    'NPC config stale conflict',
  );
  const others = [];
  for (let i = 0; i < 20; i++) {
    const x = await fixture();
    others.push(x);
    await connect(x);
  }
  await wait(async () => {
    const st = await api(admin, '/api/admin/dashboard');
    return st.countsByScene.courtyard.ambientNpcActive === 0;
  }, 20000);
  const full = await api(admin, '/api/admin/dashboard');
  ok(full.countsByScene.courtyard.realOnlineUnique >= 21, 'real users unique');
  const fixed = await api(p, '/api/world');
  ok(
    fixed.actors.some((a) => a.entityId === 'fixed:courtyard:lucia') &&
      fixed.actors.some((a) => a.entityId === 'fixed:courtyard:guard'),
    'fixed NPCs persist under load',
  );
  ok(fixed.actors.length <= 32, 'public actor cap');
  const settings = await api(admin, '/api/admin/ambient-configs');
  ok(
    (
      await api(
        admin,
        '/api/admin/ambient-configs/rollback',
        { version: cfg.version, reason: 'Restore NPC config' },
        'POST',
        { 'If-Match': String(settings.version) },
      )
    ).status === 200,
    'NPC config rollback',
  );
  // Shared virtual contribution stages and album are independent of LIVE and user counts.
  for (const x of [p, ...others])
    ok(
      (await api(x, '/api/virtual-projects/noel/contribute', { coins: 50 })).status === 200,
      'shared contribution',
    );
  const event = await api(p, '/api/events');
  ok(event.project.percent === 100, 'shared Noel reaches all stages');
  const album = await api(p, '/api/events/claim', {});
  ok(album.state.album.length === 4, 'four milestone postcards');
  const live = await api(admin, '/api/admin/live/start', {
    sceneId: 'courtyard',
    keyword: 'NOEL',
    action: 'wave',
    maxVisibleGuests: 20,
    queueMax: 100,
    reason: 'Realtime guest test',
  });
  ok(live.status === 200, 'live mock starts');
  const accountsBefore = Number((await pool.query('SELECT count(*) n FROM game_users')).rows[0].n),
    balance = (await api(p, '/api/me')).state.coins;
  const eventId = crypto.randomUUID();
  ok(
    (
      await api(admin, '/api/admin/live/simulate-comment', {
        eventId,
        viewerKey: 'viewer_xss',
        displayName: '<script>alert(1)</script>',
        text: 'NOEL',
      })
    ).accepted,
    'mock XSS name accepted safely',
  );
  await wait(() =>
    s1.messages.some(
      (m) =>
        m.type === 'room.snapshot' &&
        m.actors.some((a) => a.publicKind === 'live_guest' && a.displayName === 'Khách LIVE'),
    ),
  );
  checks++;
  ok(
    (
      await api(admin, '/api/admin/live/simulate-comment', {
        eventId,
        viewerKey: 'viewer_xss',
        displayName: 'name',
        text: 'NOEL',
      })
    ).duplicate === true,
    'duplicate event once',
  );
  ok(
    (
      await api(admin, '/api/admin/live/simulate-comment', {
        eventId: crypto.randomUUID(),
        viewerKey: 'viewer_xss',
        displayName: 'name',
        text: 'NOEL',
      })
    ).status === 429,
    'viewer cooldown',
  );
  let accepted = 0,
    limited = 0;
  const started = Date.now();
  for (let batch = 0; batch < 10; batch++) {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        api(admin, '/api/admin/live/simulate-comment', {
          eventId: crypto.randomUUID(),
          viewerKey: 'load_' + batch + '_' + i,
          displayName: 'Khách kiểm thử',
          text: 'NOEL',
        }),
      ),
    );
    for (const r of results) {
      if (r.status === 202) accepted++;
      else if (r.status === 429) limited++;
      else throw Error('Unexpected load status ' + r.status);
    }
  }
  ok(accepted <= 110 && limited > 0, '500 comments bounded');
  ok(
    (await api(admin, '/api/admin/live/stop', { reason: 'Emergency stop after load' })).status ===
      200,
    'kill switch remains available after flood',
  );
  ok((await api(p, '/api/me')).state.coins === balance, 'LIVE no wallet impact');
  ok(
    Number((await pool.query('SELECT count(*) n FROM game_users')).rows[0].n) === accountsBefore,
    'LIVE no accounts created',
  );
  const bad = await fetch(base + '/%ZZ');
  ok(bad.status === 400, 'malformed URL handled');
  ok((await fetch(base + '/healthz')).status === 200, 'core healthy after malformed URL and load');
  const revoker = await fixture('SUPER_ADMIN');
  ok(
    (
      await api(revoker, '/api/admin/users/' + p.id + '/sessions/revoke', {
        reason: 'Realtime revoke',
      })
    ).status === 200,
    'revoke succeeds with fresh operator rate budget',
  );
  await wait(() => s1.ws.readyState === WebSocket.CLOSED && s2.ws.readyState === WebSocket.CLOSED);
  ok((await api(p, '/api/me')).status === 401, 'old session cannot read');
  for (const x of [mod, ...others]) await api(x, '/api/auth/logout', {});
  const prod = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  await assert.rejects(
    () => Live.simulate({}, {}, {}),
    (e) => e.code === 'MOCK_DISABLED_IN_PRODUCTION',
  );
  process.env.NODE_ENV = prod;
  checks++;
  fs.writeFileSync(
    'artifacts/online/realtime-metrics.json',
    JSON.stringify(
      {
        at: new Date().toISOString(),
        commentBurst: 500,
        accepted,
        rateLimited: limited,
        loadDurationMs: Date.now() - started,
        fixedNpcsPreserved: true,
        publicMetricsAbsent: true,
        oneUserTwoTabsOneAvatar: true,
        coreHealthy: true,
      },
      null,
      2,
    ),
  );
  console.log(`PASS ${checks} realtime/presence/chat/LIVE/privacy checks`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const ws of sockets) ws.terminate();
    await pool.end();
  });
