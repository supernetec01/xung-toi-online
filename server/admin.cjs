const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { pool, tx, root } = require('./db.cjs'),
  S = require('./security.cjs'),
  A = require('./auth.cjs'),
  C = require('./catalog.cjs'),
  G = require('./game.cjs');
async function users(query, cursor) {
  const term = S.text(query || ' ', 0, 80);
  let at = null,
    id = null;
  if (cursor) {
    try {
      [at, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      if (!Number.isFinite(Date.parse(at)) || !/^[a-f0-9-]{36}$/.test(id)) throw Error();
    } catch {
      S.fail(400, 'INVALID_CURSOR');
    }
  }
  const r = await pool.query(
    'SELECT u.id,u.login,u.display_name,u.roles,u.created_at,w.coins FROM game_users u JOIN game_wallets w ON w.user_id=u.id WHERE (u.login ILIKE $1 OR u.display_name ILIKE $1) AND ($2::timestamptz IS NULL OR (u.created_at,u.id)<($2::timestamptz,$3::uuid)) ORDER BY u.created_at DESC,u.id DESC LIMIT 26',
    ['%' + term + '%', at, id],
  );
  const more = r.rows.length > 25,
    rows = r.rows.slice(0, 25),
    last = rows.at(-1);
  return {
    users: rows.map((r) => ({ ...r, coins: Number(r.coins) })),
    nextCursor: more
      ? Buffer.from(JSON.stringify([last.created_at.toISOString(), last.id])).toString('base64url')
      : null,
  };
}
async function detail(id) {
  const user = (
    await pool.query('SELECT id,login,display_name,roles,created_at FROM game_users WHERE id=$1', [
      id,
    ])
  ).rows[0];
  if (!user) S.fail(404, 'USER_NOT_FOUND');
  return {
    ...user,
    state: await G.state(id),
    ledger: (
      await pool.query(
        'SELECT id,delta,balance,source_type,source_ref,created_at FROM coin_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 100',
        [id],
      )
    ).rows,
    sanctions: (
      await pool.query(
        'SELECT id,scope,reason,ends_at,revoked_at FROM sanctions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
        [id],
      )
    ).rows,
  };
}
async function sanction(actor, id, p) {
  S.exact(p, ['scope', 'reason', 'durationSeconds']);
  const reason = S.text(p.reason, 3, 300);
  if (
    !['CHAT', 'ACCOUNT'].includes(p.scope) ||
    !Number.isInteger(p.durationSeconds) ||
    p.durationSeconds < 60 ||
    p.durationSeconds > 604800
  )
    S.fail(400, 'INVALID_SANCTION');
  return tx(async (db) => {
    const target = (await db.query('SELECT id,roles FROM game_users WHERE id=$1', [id])).rows[0];
    if (!target) S.fail(404, 'USER_NOT_FOUND');
    const isAdmin = S.allowed(actor, 'users.manage');
    if (
      !isAdmin &&
      (p.scope !== 'CHAT' || p.durationSeconds > 86400 || target.roles.some((r) => r !== 'PLAYER'))
    )
      S.fail(403, 'MODERATOR_SCOPE');
    if (id === actor.id || target.roles.includes('SUPER_ADMIN')) S.fail(403, 'PROTECTED_ACCOUNT');
    const row = (
      await db.query(
        'INSERT INTO sanctions(id,user_id,scope,reason,ends_at,actor_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [
          crypto.randomUUID(),
          id,
          p.scope,
          reason,
          new Date(Date.now() + p.durationSeconds * 1000),
          actor.id,
        ],
      )
    ).rows[0];
    if (p.scope === 'ACCOUNT') await db.query('DELETE FROM user_sessions WHERE user_id=$1', [id]);
    await A.audit(db, actor, 'sanction.create', id, reason, {
      scope: p.scope,
      durationSeconds: p.durationSeconds,
    });
    return row;
  });
}
async function revokeSanction(actor, id, reason) {
  return tx(async (db) => {
    const row = (
      await db.query(
        'SELECT s.*,u.roles FROM sanctions s JOIN game_users u ON u.id=s.user_id WHERE s.id=$1 FOR UPDATE',
        [id],
      )
    ).rows[0];
    if (!row) S.fail(404, 'SANCTION_NOT_FOUND');
    if (
      !S.allowed(actor, 'users.manage') &&
      (row.scope !== 'CHAT' || row.roles.some((r) => r !== 'PLAYER'))
    )
      S.fail(403, 'MODERATOR_SCOPE');
    await db.query('UPDATE sanctions SET revoked_at=now() WHERE id=$1', [id]);
    await A.audit(db, actor, 'sanction.revoke', id, reason);
    return { ok: true, userId: row.user_id, scope: row.scope };
  });
}
async function roles(actor, id, p) {
  S.authorize(actor, 'roles.grant');
  S.mfa(actor);
  S.exact(p, ['roles', 'reason']);
  if (id === actor.id) S.fail(403, 'NO_SELF_ROLE_CHANGE');
  if (
    !Array.isArray(p.roles) ||
    !p.roles.length ||
    p.roles.some(
      (r) => !['PLAYER', 'MODERATOR', 'CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(r),
    )
  )
    S.fail(400, 'INVALID_ROLES');
  return tx(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(40002)');
    const liveActor = (await db.query('SELECT roles FROM game_users WHERE id=$1', [actor.id]))
      .rows[0];
    if (
      !liveActor?.roles.includes('SUPER_ADMIN') ||
      !(
        await db.query('SELECT 1 FROM user_sessions WHERE token_hash=$1 AND expires_at>now()', [
          actor.token_hash,
        ])
      ).rowCount
    )
      S.fail(403, 'ROLE_REVOKED');
    const old = (
      await db.query('SELECT id,roles,mfa_secret FROM game_users WHERE id=$1 FOR UPDATE', [id])
    ).rows[0];
    if (!old) S.fail(404, 'USER_NOT_FOUND');
    if (p.roles.some((r) => r !== 'PLAYER') && !old.mfa_secret) S.fail(422, 'TARGET_MFA_REQUIRED');
    require('./role-guard.cjs').guard({
      actorId: actor.id,
      targetId: id,
      currentRoles: old.roles,
      nextRoles: p.roles,
      superAdminCount: Number(
        (await db.query("SELECT count(*) n FROM game_users WHERE 'SUPER_ADMIN'=ANY(roles)")).rows[0]
          .n,
      ),
    });
    await db.query('UPDATE game_users SET roles=$2 WHERE id=$1', [id, [...new Set(p.roles)]]);
    await db.query('DELETE FROM user_sessions WHERE user_id=$1', [id]);
    await A.audit(db, actor, 'roles.change', id, p.reason, { before: old.roles, after: p.roles });
    return { ok: true };
  });
}
async function draft(actor, p) {
  S.exact(p, ['kind', 'stableId', 'payload', 'reason']);
  const c = await C.current();
  const id = S.text(p.stableId, 2, 64);
  C.apply(c, p.kind, id, p.payload);
  if (p.kind === 'item') await C.validateAssets(p.payload);
  const draftId = crypto.randomUUID();
  await tx(async (db) => {
    await db.query(
      'INSERT INTO catalog_drafts(id,kind,stable_id,payload,author) VALUES($1,$2,$3,$4,$5)',
      [draftId, p.kind, id, p.payload, actor.id],
    );
    await A.audit(db, actor, 'catalog.draft', draftId, p.reason);
  });
  return { id: draftId, version: 1 };
}
async function editDraft(actor, id, p, version) {
  S.exact(p, ['payload', 'reason']);
  return tx(async (db) => {
    const d = (await db.query('SELECT * FROM catalog_drafts WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!d) S.fail(404, 'DRAFT_NOT_FOUND');
    if (d.version !== version || d.status !== 'draft') S.fail(409, 'CONTENT_VERSION_CONFLICT');
    C.apply(await C.current(db), d.kind, d.stable_id, p.payload);
    if (d.kind === 'item') await C.validateAssets(p.payload);
    await db.query('UPDATE catalog_drafts SET payload=$2,version=version+1 WHERE id=$1', [
      id,
      p.payload,
    ]);
    await A.audit(db, actor, 'catalog.edit', id, p.reason);
    return { id, version: version + 1 };
  });
}
async function publish(actor, id, version, reason) {
  return tx(async (db) => {
    await db.query('SELECT * FROM catalog_current WHERE singleton=true FOR UPDATE');
    const d = (await db.query('SELECT * FROM catalog_drafts WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!d) S.fail(404, 'DRAFT_NOT_FOUND');
    if (d.version !== version || d.status !== 'draft') S.fail(409, 'CONTENT_VERSION_CONFLICT');
    const current = await C.current(db),
      next = C.apply(current, d.kind, d.stable_id, d.payload);
    if (d.kind === 'item') await C.validateAssets(d.payload);
    await db.query('UPDATE catalog_current SET version=version+1,payload=$1', [next]);
    await db.query(
      'INSERT INTO catalog_publications(version,payload,actor_id,reason) VALUES($1,$2,$3,$4)',
      [current.version + 1, next, actor.id, S.text(reason, 3, 300)],
    );
    await db.query("UPDATE catalog_drafts SET status='published' WHERE id=$1", [id]);
    await A.audit(db, actor, 'catalog.publish', id, reason, { version: current.version + 1 });
    return { version: current.version + 1 };
  });
}
async function rollback(actor, version, reason) {
  return tx(async (db) => {
    await db.query('SELECT * FROM catalog_current WHERE singleton=true FOR UPDATE');
    const previous = (
      await db.query('SELECT payload FROM catalog_publications WHERE version=$1', [version])
    ).rows[0];
    if (!previous) S.fail(404, 'PUBLICATION_NOT_FOUND');
    const current = await C.current(db),
      next = previous.payload;
    for (const item of current.items)
      if (!next.items.some((i) => i.id === item.id)) next.items.push({ ...item, archived: true });
    for (const key of ['quests', 'actions'])
      for (const entity of current[key])
        if (!next[key].some((x) => x.id === entity.id))
          next[key].push({ ...entity, archived: true });
    for (const key of ['npcs', 'scenes'])
      for (const [id, value] of Object.entries(current[key]))
        if (!next[key][id]) next[key][id] = value;
    for (const [scene, sc] of Object.entries(current.scenes)) {
      const target = next.scenes[scene];
      for (const id of sc.npc)
        if (next.npcs[id] && !target.npc.includes(id)) {
          target.npc.push(id);
          target.npcPoints[id] = sc.npcPoints[id];
        }
    }
    const errors = C.validate(next);
    if (errors.length) S.fail(422, 'ROLLBACK_INVALID');
    await db.query('UPDATE catalog_current SET version=version+1,payload=$1', [next]);
    await db.query(
      'INSERT INTO catalog_publications(version,payload,actor_id,reason) VALUES($1,$2,$3,$4)',
      [current.version + 1, next, actor.id, S.text(reason, 3, 300)],
    );
    await A.audit(db, actor, 'catalog.rollback', version, reason, {
      newVersion: current.version + 1,
    });
    return { version: current.version + 1 };
  });
}
async function asset(actor, p) {
  S.exact(p, ['data', 'reason']);
  if (typeof p.data !== 'string' || p.data.length > 2800000) S.fail(413, 'ASSET_TOO_LARGE');
  const input = Buffer.from(p.data, 'base64'),
    sharp = require('sharp');
  let output;
  try {
    const image = sharp(input, { limitInputPixels: 4194304 }),
      m = await image.metadata();
    if (!['png', 'webp'].includes(m.format) || m.width > 2048 || m.height > 2048 || m.pages > 1)
      S.fail(422, 'INVALID_IMAGE');
    output = await image.rotate().webp({ quality: 85 }).toBuffer();
  } catch {
    S.fail(422, 'INVALID_IMAGE');
  }
  if (input.length > 2 * 1024 * 1024 || output.length > 2 * 1024 * 1024)
    S.fail(413, 'ASSET_TOO_LARGE');
  const name = S.hash(output) + '.webp',
    folder = path.join(root, '.local/uploads');
  fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(folder, name), output, { mode: 0o600 });
  await A.audit(pool, actor, 'asset.upload', name, p.reason, { bytes: output.length });
  const meta = await sharp(output).metadata();
  return {
    url: '/uploads/' + name,
    sha256: S.hash(output),
    bytes: output.length,
    width: meta.width,
    height: meta.height,
  };
}
module.exports = {
  users,
  detail,
  sanction,
  revokeSanction,
  roles,
  draft,
  editDraft,
  publish,
  rollback,
  asset,
};
