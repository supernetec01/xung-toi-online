const http = require('node:http'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { WebSocketServer } = require('ws');
const DB = require('./db.cjs'),
  S = require('./security.cjs'),
  A = require('./auth.cjs'),
  G = require('./game.cjs'),
  C = require('./catalog.cjs'),
  Admin = require('./admin.cjs'),
  Chat = require('./chat.cjs'),
  Live = require('./live.cjs'),
  { World } = require('./world.cjs');
const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.DATABASE_URL || !process.env.PUBLIC_ORIGIN?.startsWith('https://')))
  throw new Error('Production requires DATABASE_URL, HTTPS PUBLIC_ORIGIN and encryption key');
const origins = new Set(
  production
    ? [process.env.PUBLIC_ORIGIN]
    : [
        'http://127.0.0.1:5001',
        'http://localhost:5001',
        ...(process.env.PUBLIC_ORIGIN ? [process.env.PUBLIC_ORIGIN] : []),
      ],
);
const F = require('./features.cjs');
const world = new World();
world.chat = Chat;
function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}
async function body(req) {
  if (Number(req.headers['content-length']) > 3 * 1024 * 1024) S.fail(413, 'PAYLOAD_TOO_LARGE');
  let size = 0,
    chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 3 * 1024 * 1024) S.fail(413, 'PAYLOAD_TOO_LARGE');
    chunks.push(c);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  } catch {
    S.fail(400, 'INVALID_JSON');
  }
}
async function staticFile(res, file, type, status = 200) {
  const buffer = await fs.readFile(file);
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
  res.end(buffer);
}
function expected(req) {
  const version = Number(req.headers['if-match']);
  if (!Number.isInteger(version) || version < 1) S.fail(428, 'IF_MATCH_REQUIRED');
  return version;
}
async function route(req, res) {
  const method = req.method;
  let url, p;
  try {
    url = new URL(req.url, 'http://localhost');
    p = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { code: 'INVALID_URL' });
  }
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  try {
    if (method === 'GET' && p === '/healthz') {
      await DB.pool.query('SELECT 1');
      return json(res, 200, {
        status: 'ok',
        mode: 'online-demo',
        ...(process.env.NODE_ENV === 'test' && process.env.QC_INSTANCE_ID
          ? { testInstance: process.env.QC_INSTANCE_ID }
          : {}),
      });
    }
    let user = await A.session(req);
    const isMutation = !['GET', 'HEAD'].includes(method);
    if (isMutation) {
      if (user && p !== '/api/admin/live/stop') S.rate('api:' + user.id, 300, 60000);
      if (user && p === '/api/admin/live/stop') S.rate('kill:' + user.id, 10, 60000);
      if (req.headers.origin && !origins.has(req.headers.origin)) S.fail(403, 'ORIGIN_FORBIDDEN');
      if (p.startsWith('/api/') && !['/api/auth/login', '/api/auth/register'].includes(p)) {
        if (!user) S.fail(401, 'LOGIN_REQUIRED');
        if (req.headers['x-csrf-token'] !== user.csrf) S.fail(403, 'CSRF_REQUIRED');
      }
    }
    if (p === '/api/auth/register' && method === 'POST')
      return json(res, 201, await A.register(req, res, await body(req)));
    if (p === '/api/auth/login' && method === 'POST')
      return json(res, 200, await A.login(req, res, await body(req)));
    if (p === '/api/auth/me' && method === 'GET')
      return json(
        res,
        user ? 200 : 401,
        user
          ? {
              user: {
                id: user.id,
                login: user.login,
                displayName: user.display_name,
                roles: user.roles,
              },
              csrfToken: user.csrf,
              demoImportEnabled:
                process.env.NODE_ENV !== 'production' &&
                process.env.DEMO_IMPORT_ENABLED !== 'false',
              serverNow: Date.now(),
            }
          : { code: 'LOGIN_REQUIRED' },
      );
    if (p === '/api/auth/logout' && method === 'POST') {
      await DB.pool.query('DELETE FROM user_sessions WHERE token_hash=$1', [user.token_hash]);
      await world.revoke(user.id, user.token_hash);
      A.setCookie(res, '', true);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/auth/mfa/setup' && method === 'POST') {
      const b = await body(req);
      S.exact(b, ['password', 'code']);
      const u = (
        await DB.pool.query('SELECT password_hash,mfa_secret FROM game_users WHERE id=$1', [
          user.id,
        ])
      ).rows[0];
      if (!(await S.verify(b.password, u.password_hash))) S.fail(403, 'PASSWORD_REQUIRED');
      if (u.mfa_secret && !S.checkTotp(S.decrypt(u.mfa_secret), b.code))
        S.fail(403, 'MFA_REQUIRED');
      const secret = S.authenticator.generateSecret();
      await DB.pool.query('UPDATE game_users SET mfa_pending=$2 WHERE id=$1', [
        user.id,
        S.encrypt(secret),
      ]);
      return json(res, 200, {
        secret,
        uri: S.authenticator.keyuri(user.login, 'Giáo Xứ An Hòa', secret),
      });
    }
    if (p === '/api/auth/mfa/confirm' && method === 'POST') {
      const b = await body(req);
      S.exact(b, ['code']);
      await DB.tx(async (db) => {
        const row = (
          await db.query('SELECT mfa_pending FROM game_users WHERE id=$1 FOR UPDATE', [user.id])
        ).rows[0];
        const counter = row.mfa_pending ? S.totpCounter(S.decrypt(row.mfa_pending), b.code) : null;
        if (counter === null) S.fail(403, 'MFA_INVALID');
        await db.query(
          'UPDATE game_users SET mfa_secret=mfa_pending,mfa_pending=NULL,mfa_counter=$2 WHERE id=$1',
          [user.id, counter],
        );
        await db.query('DELETE FROM user_sessions WHERE user_id=$1 AND token_hash<>$2', [
          user.id,
          user.token_hash,
        ]);
        await db.query('UPDATE user_sessions SET mfa_at=now() WHERE token_hash=$1', [
          user.token_hash,
        ]);
        await A.audit(db, user, 'mfa.confirm', user.id, 'User MFA setup or rotation');
      });
      await world.revoke(user.id);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/auth/mfa/verify' && method === 'POST') {
      const b = await body(req);
      S.exact(b, ['code']);
      await DB.tx(async (db) => {
        const u = (
            await db.query('SELECT mfa_secret FROM game_users WHERE id=$1 FOR UPDATE', [user.id])
          ).rows[0],
          counter = u.mfa_secret ? S.totpCounter(S.decrypt(u.mfa_secret), b.code) : null;
        if (counter === null) S.fail(403, 'MFA_INVALID');
        const updated = await db.query(
          'UPDATE game_users SET mfa_counter=$2 WHERE id=$1 AND mfa_counter<$2 RETURNING id',
          [user.id, counter],
        );
        if (!updated.rowCount) S.fail(409, 'MFA_CODE_USED');
        await db.query('UPDATE user_sessions SET mfa_at=now() WHERE token_hash=$1', [
          user.token_hash,
        ]);
      });
      return json(res, 200, { ok: true });
    }
    if (p === '/api/auth/password' && method === 'POST') {
      const b = await body(req);
      S.exact(b, ['currentPassword', 'password', 'code']);
      if (typeof b.password !== 'string' || b.password.length < 12 || b.password.length > 128)
        S.fail(400, 'INVALID_PASSWORD');
      const u = (
        await DB.pool.query('SELECT password_hash,mfa_secret FROM game_users WHERE id=$1', [
          user.id,
        ])
      ).rows[0];
      if (
        !(await S.verify(b.currentPassword, u.password_hash)) ||
        (u.mfa_secret && !S.checkTotp(S.decrypt(u.mfa_secret), b.code))
      )
        S.fail(403, 'PASSWORD_OR_MFA_REQUIRED');
      await DB.tx(async (db) => {
        await db.query('UPDATE game_users SET password_hash=$2 WHERE id=$1', [
          user.id,
          await S.password(b.password),
        ]);
        await db.query('DELETE FROM user_sessions WHERE user_id=$1', [user.id]);
        await A.audit(db, user, 'password.change', user.id, 'User password rotation');
      });
      await world.revoke(user.id);
      A.setCookie(res, '', true);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/catalog' && method === 'GET') return json(res, 200, await C.current());
    if (p.startsWith('/api/admin')) {
      if (!F.admin) S.fail(404, 'DISABLED');
      S.authorize(
        user,
        p.includes('/catalog') || p.includes('/assets')
          ? 'content.draft'
          : p.includes('/chat') || p.includes('/sanctions') || p.endsWith('/sanctions')
            ? 'chat.moderate'
            : p.includes('/live')
              ? 'live.studio'
              : 'users.manage',
      );
      const b = isMutation ? await body(req) : {};
      let match;
      if (
        (p === '/api/admin/dashboard' || p === '/api/admin/presence/summary') &&
        method === 'GET'
      ) {
        S.authorize(user, 'presence.metrics');
        return json(res, 200, world.stats());
      }
      if (p === '/api/admin/users' && method === 'GET') {
        S.authorize(user, 'users.manage');
        return json(
          res,
          200,
          await Admin.users(url.searchParams.get('search'), url.searchParams.get('cursor')),
        );
      }
      if ((match = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/)) && method === 'GET') {
        S.authorize(user, 'users.manage');
        return json(res, 200, await Admin.detail(match[1]));
      }
      if ((match = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/roles$/)) && method === 'POST') {
        const r = await Admin.roles(user, match[1], b);
        await world.revoke(match[1]);
        return json(res, 200, r);
      }
      if (
        (match = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/sanctions$/)) &&
        method === 'POST'
      ) {
        const r = await Admin.sanction(user, match[1], b);
        if (b.scope === 'ACCOUNT') await world.revoke(match[1]);
        else world.notify(match[1], { type: 'chat.sanction_updated' });
        return json(res, 200, r);
      }
      if ((match = p.match(/^\/api\/admin\/sanctions\/([0-9a-f-]{36})$/)) && method === 'DELETE') {
        const r = await Admin.revokeSanction(user, match[1], b.reason);
        if (r.scope === 'CHAT') world.notify(r.userId, { type: 'chat.sanction_updated' });
        return json(res, 200, r);
      }
      if (
        (match = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/sessions\/revoke$/)) &&
        method === 'POST'
      ) {
        S.authorize(user, 'users.manage');
        await DB.tx(async (db) => {
          await db.query('DELETE FROM user_sessions WHERE user_id=$1', [match[1]]);
          await A.audit(db, user, 'session.revoke', match[1], b.reason);
        });
        await world.revoke(match[1]);
        return json(res, 200, { ok: true });
      }
      if (p === '/api/admin/coin-adjustments' && method === 'POST') {
        S.authorize(user, 'wallet.compensate');
        S.mfa(user);
        S.exact(b, ['userId', 'delta', 'reason']);
        if (!Number.isInteger(b.delta) || !b.delta || Math.abs(b.delta) > 1000)
          S.fail(422, 'ADJUSTMENT_LIMIT');
        const target = { id: b.userId };
        const r = await G.play(
          target,
          req.headers['idempotency-key'],
          'admin.adjust',
          b,
          async (st, c, db) => {
            st.coins += b.delta;
            await A.audit(db, user, 'wallet.compensate', b.userId, b.reason, { delta: b.delta });
          },
        );
        return json(res, 200, r);
      }
      if (p === '/api/admin/catalog' && method === 'GET')
        return json(res, 200, {
          catalog: await C.current(),
          drafts: (
            await DB.pool.query('SELECT * FROM catalog_drafts ORDER BY created_at DESC LIMIT 100')
          ).rows,
          publications: (
            await DB.pool.query(
              'SELECT version,reason,created_at FROM catalog_publications ORDER BY version DESC LIMIT 30',
            )
          ).rows,
        });
      if (p === '/api/admin/catalog/drafts' && method === 'POST')
        return json(res, 201, await Admin.draft(user, b));
      if (
        (match = p.match(/^\/api\/admin\/catalog\/drafts\/([0-9a-f-]{36})$/)) &&
        method === 'PATCH'
      )
        return json(res, 200, await Admin.editDraft(user, match[1], b, expected(req)));
      if (
        (match = p.match(/^\/api\/admin\/catalog\/drafts\/([0-9a-f-]{36})\/publish$/)) &&
        method === 'POST'
      ) {
        S.authorize(user, 'content.publish');
        const r = await Admin.publish(user, match[1], expected(req), b.reason);
        world.catalog = await C.current();
        world.broadcast({ type: 'catalog.updated', version: world.catalog.version });
        return json(res, 200, r);
      }
      if (
        (match = p.match(/^\/api\/admin\/catalog\/publications\/(\d+)\/rollback$/)) &&
        method === 'POST'
      ) {
        S.authorize(user, 'content.publish');
        const r = await Admin.rollback(user, Number(match[1]), b.reason);
        world.catalog = await C.current();
        world.broadcast({ type: 'catalog.updated', version: world.catalog.version });
        return json(res, 200, r);
      }
      if (p === '/api/admin/assets' && method === 'POST')
        return json(res, 201, await Admin.asset(user, b));
      if (p === '/api/admin/ambient-configs' && method === 'GET') {
        S.authorize(user, 'presence.metrics');
        const r = (await DB.pool.query("SELECT value,version FROM settings WHERE key='ambient'"))
          .rows[0];
        return json(res, 200, {
          ...r.value,
          version: r.version,
          history: (
            await DB.pool.query(
              "SELECT version,reason,created_at FROM settings_history WHERE key='ambient' ORDER BY version DESC LIMIT 20",
            )
          ).rows,
        });
      }
      if (
        (p === '/api/admin/ambient-configs' || p === '/api/admin/ambient-configs/rollback') &&
        ['PUT', 'POST'].includes(method)
      ) {
        S.authorize(user, 'presence.metrics');
        const ver = expected(req);
        const updated = await DB.tx(async (db) => {
          const row = (
            await db.query("SELECT value,version FROM settings WHERE key='ambient' FOR UPDATE")
          ).rows[0];
          if (row.version !== ver) S.fail(409, 'SETTINGS_VERSION_CONFLICT');
          let next;
          if (p.endsWith('/rollback')) {
            const old = (
              await db.query(
                "SELECT value FROM settings_history WHERE key='ambient' AND version=$1",
                [b.version],
              )
            ).rows[0];
            if (!old) S.fail(404, 'SETTINGS_NOT_FOUND');
            next = old.value;
          } else {
            S.exact(b, [
              'targetVisualActors',
              'ambientMax',
              'renderCap',
              'sceneId',
              'waypoints',
              'schedules',
              'reason',
            ]);
            if (
              !['targetVisualActors', 'ambientMax', 'renderCap'].every(
                (k) => Number.isInteger(b[k]) && b[k] >= 0 && b[k] <= 32,
              ) ||
              b.renderCap < 4 ||
              b.ambientMax > b.renderCap
            )
              S.fail(422, 'INVALID_POPULATION');
            const cfg = {
              targetVisualActors: b.targetVisualActors,
              ambientMax: b.ambientMax,
              renderCap: b.renderCap,
            };
            if (b.sceneId) {
              const sc = world.catalog.scenes[b.sceneId];
              if (!sc) S.fail(422, 'INVALID_SCENE');
              if (
                b.waypoints !== undefined &&
                (!Array.isArray(b.waypoints) ||
                  b.waypoints.length > 30 ||
                  b.waypoints.some(
                    (p) =>
                      !Array.isArray(p) ||
                      p.length !== 2 ||
                      !p.every(Number.isFinite) ||
                      !C.N.walkable(sc, ...p),
                  ))
              )
                S.fail(422, 'INVALID_WAYPOINTS');
              if (
                b.schedules !== undefined &&
                (!Array.isArray(b.schedules) ||
                  b.schedules.length > 24 ||
                  b.schedules.some(
                    (s) =>
                      !Number.isInteger(s.fromHour) ||
                      !Number.isInteger(s.toHour) ||
                      s.fromHour < 0 ||
                      s.toHour > 24 ||
                      s.toHour <= s.fromHour ||
                      !['pray', 'wave', 'water', 'sweep', 'sing'].includes(s.pose),
                  ))
              )
                S.fail(422, 'INVALID_SCHEDULE');
              cfg.waypoints = b.waypoints || [];
              cfg.schedules = b.schedules || [];
              next = { ...row.value, scenes: { ...row.value.scenes, [b.sceneId]: cfg } };
            } else next = { ...row.value, ...cfg };
          }
          await db.query("UPDATE settings SET version=version+1,value=$1 WHERE key='ambient'", [
            next,
          ]);
          await db.query(
            "INSERT INTO settings_history(key,version,value,actor_id,reason) VALUES('ambient',$1,$2,$3,$4)",
            [ver + 1, next, user.id, S.text(b.reason, 3, 300)],
          );
          await A.audit(db, user, 'ambient.config', 'world', b.reason, {
            beforeVersion: ver,
            afterVersion: ver + 1,
          });
          return next;
        });
        world.settings = updated;
        return json(res, 200, { ok: true, version: ver + 1 });
      }
      if (p === '/api/admin/chat/notices' && method === 'POST') {
        S.authorize(user, 'users.manage');
        S.exact(b, ['body', 'reason']);
        await DB.tx(async (db) => {
          await db.query('INSERT INTO system_notices(body,created_by) VALUES($1,$2)', [
            S.text(b.body, 3, 500),
            user.id,
          ]);
          await A.audit(db, user, 'system.notice', 'community', b.reason);
        });
        return json(res, 201, { ok: true });
      }
      if (p === '/api/admin/chat/settings' && method === 'GET') {
        S.authorize(user, 'users.manage');
        return json(
          res,
          200,
          (await DB.pool.query("SELECT value FROM settings WHERE key='chat'")).rows[0].value,
        );
      }
      if (p === '/api/admin/chat/settings' && method === 'PUT') {
        S.authorize(user, 'users.manage');
        S.exact(b, ['enabled', 'reason']);
        if (typeof b.enabled !== 'boolean') S.fail(400, 'INVALID_SETTINGS');
        await DB.tx(async (db) => {
          await db.query(
            "UPDATE settings SET value=jsonb_set(value,'{enabled}',$1) WHERE key='chat'",
            [JSON.stringify(b.enabled)],
          );
          await A.audit(db, user, 'chat.settings', 'chat', b.reason, { enabled: b.enabled });
        });
        return json(res, 200, { ok: true });
      }
      if (
        (match = p.match(/^\/api\/admin\/chat\/messages\/(\d+)\/approve$/)) &&
        method === 'POST'
      ) {
        const row = await DB.tx(async (db) => {
          const r = (
            await db.query(
              "UPDATE chat_messages SET status='published' WHERE id=$1 AND status IN ('held','hidden') RETURNING *",
              [match[1]],
            )
          ).rows[0];
          if (!r) S.fail(404, 'MESSAGE_NOT_FOUND');
          await A.audit(db, user, 'chat.approve', match[1], b.reason);
          return r;
        });
        world.chatBroadcast(await Chat.message(row));
        return json(res, 200, { ok: true });
      }
      if (p === '/api/admin/chat/reports' && method === 'GET')
        return json(res, 200, {
          messages: (
            await DB.pool.query(
              'SELECT m.id,m.room,m.body,m.status,m.created_at,u.id user_id,u.display_name FROM chat_messages m JOIN game_users u ON u.id=m.user_id ORDER BY m.id DESC LIMIT 100',
            )
          ).rows,
          reports: (
            await DB.pool.query(
              'SELECT id,message_id,reason,status FROM chat_reports ORDER BY id DESC LIMIT 100',
            )
          ).rows,
          appeals: (
            await DB.pool.query(
              'SELECT id,user_id,sanction_id,body,status FROM chat_appeals ORDER BY id DESC LIMIT 100',
            )
          ).rows,
        });
      if ((match = p.match(/^\/api\/admin\/chat\/messages\/(\d+)\/hide$/)) && method === 'POST') {
        await DB.tx(async (db) => {
          await db.query("UPDATE chat_messages SET status='hidden' WHERE id=$1", [match[1]]);
          await A.audit(db, user, 'chat.hide', match[1], b.reason);
        });
        await world.hidden(match[1]);
        return json(res, 200, { ok: true });
      }
      if ((match = p.match(/^\/api\/admin\/chat\/reports\/(\d+)\/resolve$/)) && method === 'POST') {
        if (!['dismissed', 'resolved'].includes(b.status)) S.fail(400, 'INVALID_STATUS');
        await DB.tx(async (db) => {
          await db.query('UPDATE chat_reports SET status=$2 WHERE id=$1', [match[1], b.status]);
          await A.audit(db, user, 'report.resolve', match[1], b.reason);
        });
        return json(res, 200, { ok: true });
      }
      if ((match = p.match(/^\/api\/admin\/chat\/appeals\/(\d+)\/resolve$/)) && method === 'POST') {
        if (!['accepted', 'rejected'].includes(b.status)) S.fail(400, 'INVALID_STATUS');
        const appeal = (await DB.pool.query('SELECT * FROM chat_appeals WHERE id=$1', [match[1]]))
          .rows[0];
        if (!appeal) S.fail(404, 'APPEAL_NOT_FOUND');
        if (b.status === 'accepted') {
          const revoked = await Admin.revokeSanction(user, appeal.sanction_id, b.reason);
          world.notify(revoked.userId, { type: 'chat.sanction_updated' });
        }
        await DB.tx(async (db) => {
          await db.query('UPDATE chat_appeals SET status=$2 WHERE id=$1', [match[1], b.status]);
          await A.audit(db, user, 'appeal.resolve', match[1], b.reason);
        });
        return json(res, 200, { ok: true });
      }
      if (p === '/api/admin/live/preview' && method === 'GET') {
        const sceneId =
          url.searchParams.get('scene') || world.live?.settings.sceneId || 'courtyard';
        if (!['courtyard', 'garden', 'christmas'].includes(sceneId)) S.fail(400, 'INVALID_SCENE');
        return json(res, 200, { sceneId, actors: world.snapshot(sceneId, user.id) });
      }
      if (p === '/api/admin/live/health' && method === 'GET')
        return json(res, 200, {
          provider: 'MOCK',
          running: !!world.live?.running,
          sessionId: world.live?.id || null,
          settings: world.live?.settings || null,
          queue: world.queue.length,
          visible: world.guests.length,
          realProviderEnabled: false,
        });
      if (p === '/api/admin/live/start' && method === 'POST')
        return json(res, 200, await Live.start(world, user, b));
      if (p === '/api/admin/live/stop' && method === 'POST')
        return json(res, 200, await Live.stop(world, user, b.reason));
      if (p === '/api/admin/live/simulate-comment' && method === 'POST')
        return json(res, 202, await Live.simulate(world, user, b));
      if (p === '/api/admin/audit' && method === 'GET')
        return json(res, 200, {
          events: (
            await DB.pool.query('SELECT * FROM admin_audit_events ORDER BY id DESC LIMIT 100')
          ).rows,
        });
      S.fail(404, 'NOT_FOUND');
    }
    if (p.startsWith('/api/')) {
      if (!user) S.fail(401, 'LOGIN_REQUIRED');
      const key = req.headers['idempotency-key'];
      let r, match;
      const b = isMutation ? await body(req) : {};
      if (
        isMutation &&
        /\/api\/(actions\/.*\/(start|complete)|quests\/.*\/(accept|claim)|events\/claim|daily\/claim)$/.test(
          p,
        )
      )
        S.exact(b, []);
      if (p === '/api/me' && method === 'GET')
        return json(res, 200, {
          state: await G.state(user.id),
          serverNow: Date.now(),
          catalogVersion: (await C.current()).version,
        });
      if (p === '/api/quests' && method === 'GET') {
        const st = await G.state(user.id),
          c = await C.current();
        return json(res, 200, {
          quests: G.progressCatalog(st, c).quests.map((q) => ({
            id: q.id,
            status: C.R.status(st, q),
            progress: C.R.progress(st, q),
          })),
        });
      }
      if (p === '/api/player/location' && method === 'POST') {
        world.canControl(user, req.headers['x-client-id']);
        r = await G.location(user, key, b);
      } else if (p === '/api/player/travel' && method === 'POST') {
        world.canControl(user, req.headers['x-client-id']);
        r = await G.location(user, key, b, true);
      } else if (p === '/api/player/interact' && method === 'POST')
        r = await G.interact(user, key, b);
      else if (p === '/api/player/appearance' && method === 'PUT')
        r = await G.appearance(user, key, b);
      else if (p === '/api/player/equipment' && method === 'PUT')
        r = await G.equipment(user, key, b);
      else if (p === '/api/shop/purchase' && method === 'POST') r = await G.purchase(user, key, b);
      else if (
        (match = p.match(/^\/api\/quests\/([a-z0-9_]+)\/(accept|claim)$/)) &&
        method === 'POST'
      )
        r = await G.quest(user, key, match[1], match[2]);
      else if ((match = p.match(/^\/api\/actions\/([a-z0-9_]+)\/start$/)) && method === 'POST')
        r = await G.startAction(user, key, match[1]);
      else if (
        (match = p.match(/^\/api\/actions\/executions\/([0-9a-f-]{36})\/complete$/)) &&
        method === 'POST'
      )
        r = await G.completeAction(user, key, match[1]);
      else if (p === '/api/virtual-projects/noel/contribute' && method === 'POST')
        r = await G.contribute(user, key, b);
      else if (p === '/api/demo/preview' && method === 'POST')
        return json(res, 200, await G.previewDemo(user, b));
      else if (p === '/api/demo/import' && method === 'POST')
        r = await G.importDemo(user, key, b, req.headers['if-match']);
      else if (p === '/api/world' && method === 'GET') {
        const st = await G.state(user.id);
        return json(res, 200, {
          roomId: st.scene,
          roomSeq: ++world.seq,
          actors: world.snapshot(st.scene, user.id),
        });
      } else if (p === '/api/chat/messages' && method === 'GET')
        return json(res, 200, {
          messages: await Chat.history(
            user,
            url.searchParams.get('room') || 'global',
            url.searchParams.get('before'),
            url.searchParams.get('after'),
          ),
        });
      else if (p === '/api/chat/send' && method === 'POST') {
        const message = await Chat.send(user, b);
        if (message.status === 'published' && !message.replayed) world.chatBroadcast(message);
        return json(res, 200, { message });
      } else if (p === '/api/chat/notices' && method === 'GET')
        return json(res, 200, {
          notices: (
            await DB.pool.query(
              'SELECT id,body,created_at FROM system_notices ORDER BY id DESC LIMIT 50',
            )
          ).rows,
        });
      else if (p === '/api/me/chat-sanctions' && method === 'GET')
        return json(res, 200, { sanction: await A.sanction(user.id, 'CHAT') });
      else if ((match = p.match(/^\/api\/chat\/messages\/(\d+)\/report$/)) && method === 'POST') {
        const m = (
          await DB.pool.query(
            "SELECT user_id,room FROM chat_messages WHERE id=$1 AND status='published'",
            [match[1]],
          )
        ).rows[0];
        if (!m) S.fail(404, 'MESSAGE_NOT_FOUND');
        if (m.user_id === user.id) S.fail(422, 'SELF_REPORT');
        const st = await G.state(user.id);
        if (m.room !== 'global' && m.room !== st.scene) S.fail(403, 'ROOM_FORBIDDEN');
        S.rate('report:' + user.id, 10, 60000);
        await DB.pool.query(
          'INSERT INTO chat_reports(message_id,reporter,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [match[1], user.id, S.text(b.reason, 3, 300)],
        );
        return json(res, 200, { ok: true });
      } else if (p === '/api/me/chat-appeals' && method === 'POST') {
        S.rate('appeal:' + user.id, 3, 60000);
        const sanction = await A.sanction(user.id, 'CHAT');
        if (!sanction || sanction.id !== b.sanctionId) S.fail(422, 'NO_ACTIVE_SANCTION');
        await DB.pool.query('INSERT INTO chat_appeals(user_id,sanction_id,body) VALUES($1,$2,$3)', [
          user.id,
          sanction.id,
          S.text(b.body, 3, 500),
        ]);
        return json(res, 201, { ok: true });
      } else if (p === '/api/events' && method === 'GET') {
        const project = (
            await DB.pool.query("SELECT id,total,goal FROM virtual_projects WHERE id='noel'")
          ).rows[0],
          st = await G.state(user.id);
        return json(res, 200, {
          project: {
            id: project.id,
            total: Number(project.total),
            goal: Number(project.goal),
            percent: Math.min(
              100,
              Math.floor((Number(project.total) * 100) / Number(project.goal)),
            ),
          },
          album: st.album || [],
          dailyClaims: st.dailyClaims || [],
          event: G.eventInfo(await C.current()),
        });
      } else if (p === '/api/events/claim' && method === 'POST')
        r = await G.play(user, key, 'event.claim', {}, async (st, c, db) => {
          if (!G.eventInfo(c).enabled) S.fail(422, 'EVENT_CLOSED');
          const project = (
            await db.query("SELECT total,goal FROM virtual_projects WHERE id='noel'")
          ).rows[0];
          st.album ??= [];
          for (const stage of [25, 50, 75, 100])
            if (
              (Number(project.total) * 100) / Number(project.goal) >= stage &&
              !st.album.includes('noel:' + stage)
            )
              st.album.push('noel:' + stage);
        });
      else if (p === '/api/daily/claim' && method === 'POST')
        r = await G.play(user, key, 'daily.claim', {}, async (st, c, db) => {
          const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
            new Date(),
          );
          st.dailyClaims ??= [];
          if (st.dailyClaims.includes(day)) return { sourceRef: day };
          const row = (
            await db.query(
              "SELECT count(*) n FROM coin_ledger WHERE user_id=$1 AND source_type='action.complete' AND created_at>=(date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') AND metadata->>'actionId' IN ('sweep','water','books','gifts','welcome','pew_clean')",
              [user.id],
            )
          ).rows[0];
          if (Number(row.n) < 3) S.fail(422, 'DAILY_NOT_READY');
          st.coins += 10;
          st.dailyClaims.push(day);
          return { sourceRef: day };
        });
      else S.fail(404, 'NOT_FOUND');
      if (r?.state) world.update(user.id, r.state);
      return json(res, 200, r);
    }
    if (!['GET', 'HEAD'].includes(method)) S.fail(405, 'METHOD_NOT_ALLOWED');
    if (p === '/admin' || p.startsWith('/admin/')) {
      if (!F.admin) S.fail(404, 'DISABLED');
      if (!user)
        return staticFile(
          res,
          path.join(DB.root, 'public/shared/account.html'),
          'text/html; charset=utf-8',
          401,
        );
      if (!user.roles.some((r) => r !== 'PLAYER')) S.fail(403, 'FORBIDDEN');
      if (p === '/admin' || p === '/admin/')
        return staticFile(
          res,
          path.join(DB.root, 'public/admin/index.html'),
          'text/html; charset=utf-8',
        );
      const name = p.slice('/admin/'.length);
      if (!['app.js', 'style.css'].includes(name)) S.fail(404, 'NOT_FOUND');
      return staticFile(
        res,
        path.join(DB.root, 'public/admin', name),
        name.endsWith('.js') ? 'text/javascript' : 'text/css',
      );
    }
    if (p === '/account')
      return staticFile(
        res,
        path.join(DB.root, 'public/shared/account.html'),
        'text/html; charset=utf-8',
      );
    if (p === '/privacy')
      return staticFile(
        res,
        path.join(DB.root, 'public/shared/privacy.html'),
        'text/html; charset=utf-8',
      );
    if (p.startsWith('/shared/')) {
      const name = p.slice(8);
      if (!['auth.js', 'style.css'].includes(name)) S.fail(404, 'NOT_FOUND');
      return staticFile(
        res,
        path.join(DB.root, 'public/shared', name),
        name.endsWith('.js') ? 'text/javascript' : 'text/css',
      );
    }
    if (/^\/uploads\/[a-f0-9]{64}\.webp$/.test(p))
      return staticFile(res, path.join(DB.root, '.local', p.slice(1)), 'image/webp');
    if (p === '/' || p === '/index.html' || /^\/(src|assets)\/[a-zA-Z0-9_./-]+$/.test(p)) {
      const root = path.join(DB.root, 'game_v3'),
        file = path.resolve(root, '.' + (p === '/' ? '/index.html' : p));
      if (!file.startsWith(root + path.sep)) S.fail(403, 'FORBIDDEN');
      const actual = await fs.realpath(file);
      const isEntry = p === '/' || p === '/index.html';
      const allowedRoot = path.join(root, p.startsWith('/src/') ? 'src' : 'assets');
      if (
        (!isEntry && !actual.startsWith(allowedRoot + path.sep)) ||
        (isEntry && actual !== path.join(root, 'index.html'))
      )
        S.fail(403, 'FORBIDDEN');
      const ext = path.extname(file);
      if (!isEntry && !['.js', '.css', '.png', '.webp', '.avif', '.json'].includes(ext))
        S.fail(403, 'FORBIDDEN');
      return staticFile(
        res,
        file,
        {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.png': 'image/png',
          '.json': 'application/json',
        }[ext] || 'application/octet-stream',
      );
    }
    S.fail(404, 'NOT_FOUND');
  } catch (e) {
    const status =
      e.status ||
      (e.code === 'ENOENT'
        ? 404
        : e.code === '23505'
          ? 409
          : ['22P02', '22003'].includes(e.code)
            ? 400
            : 500);
    if (status === 500) console.error('request_error', requestId, e.code || 'INTERNAL');
    return json(res, status, {
      code: e.status
        ? e.code
        : status === 404
          ? 'NOT_FOUND'
          : status === 409
            ? 'CONFLICT'
            : 'INTERNAL',
      message: e.status ? e.message : 'Yêu cầu không thể xử lý.',
      requestId,
      serverNow: Date.now(),
    });
  }
}
async function start() {
  await DB.migrate();
  await C.initCatalog();
  await world.init();
  const server = http.createServer((req, res) => {
    route(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { code: 'INTERNAL' });
      else res.end();
    });
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 20000;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  server.on('upgrade', async (req, socket, head) => {
    try {
      if (
        new URL(req.url, 'http://localhost').pathname !== '/ws' ||
        !origins.has(req.headers.origin)
      )
        throw Error('Forbidden');
      const user = await A.session(req);
      if (!user) throw Error('Login');
      wss.handleUpgrade(req, socket, head, (ws) => world.connect(ws, req, user));
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
    }
  });
  server.listen(5001, '0.0.0.0', () => console.log('Giáo Xứ An Hòa V4 — PostgreSQL, port 5001'));
  const cleanup = setInterval(
    () =>
      DB.pool
        .query(
          "DELETE FROM user_sessions WHERE expires_at<now(); DELETE FROM seat_leases WHERE expires_at<now(); DELETE FROM chat_messages m WHERE created_at<now()-interval'30 days' AND NOT EXISTS(SELECT 1 FROM chat_reports r WHERE r.message_id=m.id)",
        )
        .catch(() => {}),
    60000,
  );
  cleanup.unref();
  async function stop() {
    clearInterval(cleanup);
    await world.close();
    wss.close();
    server.close(async () => {
      await DB.pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  }
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return { server, world };
}
if (require.main === module)
  start().catch((e) => {
    console.error('startup_failed', e.code || e.message);
    process.exitCode = 1;
  });
module.exports = { start, route, world };
