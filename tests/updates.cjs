const assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  fs = require('node:fs');
const { pool, tx } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs'),
  C = require('../server/catalog.cjs');
const base = 'http://127.0.0.1:5001';
let checks = 0;
function ok(value, label) {
  assert(value, label);
  checks++;
}
async function fixture(role = 'PLAYER') {
  const password = S.random(),
    secret = S.authenticator.generateSecret(),
    token = S.random(),
    csrf = S.random();
  const id = await tx(async (db) => {
    const id = await A.newUser(
      db,
      'upd_' + crypto.randomBytes(6).toString('hex'),
      'Update QA',
      await S.password(password),
      [role],
      role === 'PLAYER' ? null : S.encrypt(secret),
    );
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at,mfa_at) VALUES($1,$2,$3,now()+interval'1 hour',now())",
      [S.hash(token), id, csrf],
    );
    return id;
  });
  return { id, password, secret, token, csrf };
}
async function api(c, path, data, method = 'POST', headers = {}) {
  const r = await fetch(base + path, {
    method: data === undefined ? 'GET' : method,
    headers: {
      Cookie: 'anhoa_session=' + c.token,
      'X-CSRF-Token': c.csrf,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
      ...headers,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(20000),
  });
  let body = {};
  try {
    body = await r.json();
  } catch {}
  return { status: r.status, ...body };
}
async function publish(admin, kind, payload) {
  const d = await api(admin, '/api/admin/catalog/drafts', {
    kind,
    stableId: payload.id || 'season',
    payload,
    reason: 'Update QA draft',
  });
  assert.equal(d.status, 201, JSON.stringify(d));
  const r = await api(
    admin,
    '/api/admin/catalog/drafts/' + d.id + '/publish',
    { reason: 'Update QA publish' },
    'POST',
    { 'If-Match': '1' },
  );
  assert.equal(r.status, 200, JSON.stringify(r));
  return r;
}
(async () => {
  const admin = await fixture('SUPER_ADMIN'),
    p = await fixture(),
    other = await fixture(),
    mod = await fixture('MODERATOR');
  const original = await C.current();
  const mfa = await api(p, '/api/auth/mfa/setup', { password: p.password });
  ok(mfa.status === 200 && mfa.secret, 'MFA setup');
  const confirm = await api(p, '/api/auth/mfa/confirm', {
    code: S.authenticator.generate(mfa.secret),
  });
  ok(confirm.status === 200, 'MFA confirmed');
  ok(
    (await api(p, '/api/auth/mfa/verify', { code: S.authenticator.generate(mfa.secret) }))
      .status === 409,
    'confirmation code cannot replay',
  );
  ok(
    (
      await api(admin, '/api/admin/users/' + p.id + '/roles', {
        roles: ['ADMIN'],
        reason: 'Update QA grant after MFA',
      })
    ).status === 200,
    'MFA enabled player granted Admin',
  );
  ok((await api(p, '/api/me')).status === 401, 'role change revokes old sessions');
  const grantAudit = await pool.query(
    "SELECT 1 FROM admin_audit_events WHERE target=$1 AND action='roles.change'",
    [p.id],
  );
  ok(grantAudit.rowCount === 1, 'role audit persisted');
  const promoted = (await pool.query('SELECT roles FROM game_users WHERE id=$1', [p.id])).rows[0];
  ok(promoted.roles.includes('ADMIN'), 'new role persisted');
  await pool.query(
    "UPDATE user_sessions SET mfa_at=now()-interval'6 minutes' WHERE token_hash=$1",
    [S.hash(admin.token)],
  );
  ok(
    (
      await api(admin, '/api/admin/users/' + other.id + '/roles', {
        roles: ['MODERATOR'],
        reason: 'Old MFA test',
      })
    ).status === 403,
    'expired MFA denies grants',
  );
  ok(
    (await api(admin, '/api/auth/mfa/verify', { code: S.authenticator.generate(admin.secret) }))
      .status === 200,
    'operator reauth MFA',
  );
  ok(
    (await api(admin, '/api/auth/mfa/verify', { code: S.authenticator.generate(admin.secret) }))
      .status === 409,
    'MFA counter replay denied',
  );
  const image = await require('sharp')({
    create: { width: 64, height: 64, channels: 4, background: '#658d76' },
  })
    .png()
    .toBuffer();
  const asset = await api(admin, '/api/admin/assets', {
    data: image.toString('base64'),
    reason: 'QA image reencode',
  });
  ok(
    asset.status === 201 && /^\/uploads\/[a-f0-9]{64}\.webp$/.test(asset.url),
    'image validated and content-addressed',
  );
  const decoded = await require('sharp')(
    Buffer.from(await (await fetch(base + asset.url)).arrayBuffer()),
  ).metadata();
  ok(decoded.format === 'webp' && decoded.width === 64, 'uploaded WebP decodes');
  ok(
    (
      await api(admin, '/api/admin/assets', {
        data: Buffer.from('<svg onload="alert(1)"/>').toString('base64'),
        reason: 'Reject SVG',
      })
    ).status === 422,
    'SVG upload rejected',
  );
  ok(
    (await api(mod, '/api/admin/assets', { data: image.toString('base64'), reason: 'Bad role' }))
      .status === 403,
    'moderator cannot upload',
  );
  const q = {
    ...original.quests.find((q) => q.id === 'q_welcome'),
    rewardCoins: 200,
    steps: [['talk_guard', 1]],
  };
  const questPlayer = await fixture();
  await publish(admin, 'quest', q);
  await api(questPlayer, '/api/player/location', { x: 40, y: 76 });
  await api(questPlayer, '/api/player/interact', { npcId: 'lucia' });
  const claim = await api(questPlayer, '/api/quests/q_welcome/claim', {});
  ok(
    claim.status === 200 && claim.state.coins === 220,
    'accepted reward and quest steps survive CMS edit',
  );
  const cycle = { ...q, requires: ['q_welcome'] };
  ok(
    (
      await api(admin, '/api/admin/catalog/drafts', {
        kind: 'quest',
        stableId: q.id,
        payload: cycle,
        reason: 'Cycle rejection',
      })
    ).status === 422,
    'quest cycle rejected',
  );
  const badAction = { ...original.actions.find((a) => a.id === 'sweep'), cooldown: 1 };
  ok(
    (
      await api(admin, '/api/admin/catalog/drafts', {
        kind: 'action',
        stableId: 'sweep',
        payload: badAction,
        reason: 'Cooldown validation',
      })
    ).status === 422,
    'unsafe cooldown rejected',
  );
  const npcId = 'npc_qa_' + crypto.randomBytes(3).toString('hex');
  const npc = {
    ...original.npcs.lucia,
    id: npcId,
    name: 'Cư dân thử',
    line: 'Xin chào bạn',
    event: 'talk_' + npcId,
    sceneId: 'courtyard',
    spawn: [44, 76],
  };
  await publish(admin, 'npc', npc);
  const updated = await C.current();
  ok(updated.scenes.courtyard.npc.includes(npcId), 'new NPC has spawn point');
  const custom = {
    ...q,
    id: 'q_' + npcId,
    giverId: npcId,
    requires: [],
    steps: [[npc.event, 1]],
    rewardCoins: 5,
  };
  await publish(admin, 'quest', custom);
  const customCatalog = await C.current();
  ok(
    customCatalog.quests.find((x) => x.id === custom.id).guidance?.some((g) => g?.npc === npcId),
    'new quest has actionable guidance',
  );
  await api(other, '/api/quests/' + custom.id + '/accept', {});
  await api(other, '/api/player/location', { x: 44, y: 76 });
  await api(other, '/api/player/interact', { npcId });
  ok(
    (await api(other, '/api/quests/' + custom.id + '/claim', {})).state?.coins === 155,
    'dynamic NPC quest playable',
  );
  await publish(admin, 'event', { title: 'Noel QA', enabled: false, startsAt: null, endsAt: null });
  ok((await api(other, '/api/events')).event.enabled === false, 'season configuration applied');
  ok(
    (await api(other, '/api/virtual-projects/noel/contribute', { coins: 1 })).status === 422,
    'closed event rejects contributions',
  );
  ok(
    (await api(other, '/api/events/claim', {})).status === 422,
    'closed event keeps album without new claims',
  );
  const rollback = await api(
    admin,
    '/api/admin/catalog/publications/' + original.version + '/rollback',
    { reason: 'Restore pre-update catalog' },
  );
  ok(rollback.status === 200, 'catalog rolled back without deleting NPC quest');
  ok(
    (await api(other, '/api/me')).state.claimed.includes(custom.id),
    'claimed quest retained after rollback',
  );
  const activityPlayer = await fixture();
  let reward = 0;
  for (const id of ['sweep', 'water', 'books']) {
    const a = original.actions.find((x) => x.id === id);
    assert(a);
    await api(activityPlayer, '/api/player/travel', { sceneId: a.scene });
    await api(activityPlayer, '/api/player/location', { x: a.anchor[0], y: a.anchor[1] });
    const start = await api(activityPlayer, '/api/actions/' + id + '/start', {});
    assert.equal(start.status, 200, JSON.stringify(start));
    await new Promise((r) => setTimeout(r, a.seconds * 1000 + 100));
    ok(
      (
        await api(
          activityPlayer,
          '/api/actions/executions/' + start.state.activeAction.id + '/complete',
          {},
        )
      ).status === 200,
      'service complete ' + id,
    );
    reward += a.coins;
  }
  const dailies = await Promise.all(
    Array.from({ length: 20 }, () => api(activityPlayer, '/api/daily/claim', {})),
  );
  ok(
    dailies.every((r) => r.status === 200),
    'daily concurrent claims succeed',
  );
  ok((await api(activityPlayer, '/api/me')).state.coins === 150 + reward + 10, 'daily reward once');
  const imported = await fixture(),
    raw = JSON.parse(fs.readFileSync('tests/fixtures/m0/legacy-save.json'));
  raw.username = 'Không nhập danh tính';
  raw.roles = ['SUPER_ADMIN'];
  const im = await api(imported, '/api/demo/import', raw);
  ok(
    im.status === 200 && im.state.coins === 543 && im.state.inventory.includes('shirt_blue'),
    'one-time demo import preserves wallet/items',
  );
  ok(
    (await api(imported, '/api/auth/me')).user.roles.join() === 'PLAYER',
    'demo cannot import roles',
  );
  ok((await api(imported, '/api/demo/import', raw)).status === 409, 'second import denied');
  const corrupt = await fixture();
  ok(
    (await api(corrupt, '/api/demo/import', { ...raw, coins: -1 })).status === 422,
    'corrupt demo rejected',
  );
  ok((await api(corrupt, '/api/me')).state.coins === 150, 'bad import leaves account unchanged');
  const notice = 'Thông báo thử cập nhật ' + crypto.randomUUID();
  ok(
    (await api(admin, '/api/admin/chat/notices', { body: notice, reason: 'QA system tab' }))
      .status === 201,
    'notice persisted',
  );
  ok(
    (await api(other, '/api/chat/notices')).notices.some((x) => x.body === notice),
    'signed player reads notices',
  );
  ok(
    (await api(other, '/api/admin/chat/notices', { body: 'Không có quyền', reason: 'QA denied' }))
      .status === 403,
    'system tab cannot be player spoofed',
  );
  const muted = await api(mod, '/api/admin/users/' + other.id + '/sanctions', {
    scope: 'CHAT',
    durationSeconds: 60,
    reason: 'QA appeal test',
  });
  ok(muted.status === 200, 'mute for appeal');
  await api(other, '/api/me/chat-appeals', { sanctionId: muted.id, body: 'Xin kiểm tra lại' });
  const reports = await api(mod, '/api/admin/chat/reports');
  const appeal = reports.appeals.find((a) => a.sanction_id === muted.id);
  assert(appeal);
  ok(
    (
      await api(mod, '/api/admin/chat/appeals/' + appeal.id + '/resolve', {
        status: 'accepted',
        reason: 'QA overturn',
      })
    ).status === 200,
    'appeal accepted',
  );
  ok((await api(other, '/api/me/chat-sanctions')).sanction === null, 'appeal unmuted account');
  const reqId = crypto.randomUUID();
  const chat = await api(other, '/api/chat/send', {
    requestId: reqId,
    roomId: 'global',
    body: 'Xin chào sau khiếu nại',
  });
  ok(chat.status === 200, 'chat after appeal');
  ok(
    (
      await api(other, '/api/chat/send', {
        requestId: reqId,
        roomId: 'global',
        body: 'Xin chào sau khiếu nại',
      })
    ).message.replayed,
    'same chat request once',
  );
  const after = await api(other, '/api/chat/messages?room=global&after=' + chat.message.seq);
  ok(after.messages.length === 0, 'reconnect after cursor skips already delivered');
  await api(
    admin,
    '/api/admin/chat/settings',
    { enabled: false, reason: 'QA disable chat' },
    'PUT',
  );
  const chatUser = await fixture();
  ok(
    (
      await api(chatUser, '/api/chat/send', {
        requestId: crypto.randomUUID(),
        roomId: 'global',
        body: 'Chào',
      })
    ).status === 403,
    'chat feature switch enforced',
  );
  await api(admin, '/api/admin/chat/settings', { enabled: true, reason: 'QA restore chat' }, 'PUT');
  const suspended = await fixture();
  const ban = await api(admin, '/api/admin/users/' + suspended.id + '/sanctions', {
    scope: 'ACCOUNT',
    durationSeconds: 60,
    reason: 'QA account suspension',
  });
  ok(ban.status === 200, 'account sanction distinct');
  ok((await api(suspended, '/api/me')).status === 401, 'account ban revokes sessions');
  for (const payload of [
    { gender: '<svg>' },
    { skin: '#fff" onload="x' },
    { coins: 9999 },
    [],
    null,
  ])
    ok(
      [400, 422].includes((await api(other, '/api/player/appearance', payload, 'PUT')).status),
      'appearance fuzz rejected',
    );
  const userlist = await api(admin, '/api/admin/users?search=upd_');
  ok(userlist.users.length <= 25, 'user pagination bounded');
  const privateFields = ['password_hash', 'mfa_secret', 'csrf', 'token_hash', 'mfa_pending'];
  ok(
    privateFields.every((k) => !JSON.stringify(userlist).includes(k)),
    'user search no secrets',
  );
  const invariant = await pool.query(
    'SELECT w.user_id FROM game_wallets w JOIN (SELECT user_id,sum(delta) total FROM coin_ledger GROUP BY user_id) l ON l.user_id=w.user_id WHERE w.coins<>l.total',
  );
  ok(invariant.rowCount === 0, 'all account wallets reconcile ledger');
  console.log(`PASS ${checks} update/MFA/CMS/import/daily/moderation checks`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
