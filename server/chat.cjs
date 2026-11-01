const { pool, tx } = require('./db.cjs'),
  S = require('./security.cjs'),
  A = require('./auth.cjs'),
  G = require('./game.cjs');
function classify(raw) {
  const clean = S.text(raw, 1, 160),
    norm = clean
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[013457]/g, (c) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' })[c]);
  if (/(?:https?:|www\.|javascript:|@|\b\+?\d[\d .-]{7,}\d\b)/i.test(clean))
    return { status: 'rejected', body: clean, reason: 'PRIVACY_OR_LINK' };
  const compact = norm.replace(/[^a-z]/g, '');
  if (
    ['ditme', 'dume', 'duma', 'fuck', 'shit', 'concho', 'chungmaychet'].some((w) =>
      compact.includes(w),
    )
  )
    return { status: 'held', body: clean, reason: 'LANGUAGE_REVIEW' };
  return { status: 'published', body: clean };
}
async function message(row, db = pool) {
  const u = (await db.query('SELECT display_name FROM game_users WHERE id=$1', [row.user_id]))
    .rows[0];
  return {
    id: String(row.id),
    seq: Number(row.id),
    room: row.room,
    body: row.body,
    status: row.status,
    author: { id: row.user_id, displayName: u.display_name },
    sentAt: row.created_at,
  };
}
async function send(user, p) {
  if (!require('./features.cjs').chat) S.fail(403, 'CHAT_DISABLED');
  S.exact(p, ['type', 'requestId', 'roomId', 'body']);
  if (typeof p.body !== 'string' || p.body.length > 1024) S.fail(400, 'INVALID_MESSAGE');
  const request = S.text(p.requestId, 8, 120),
    room = S.text(p.roomId, 1, 60);
  const settings = (await pool.query("SELECT value FROM settings WHERE key='chat'")).rows[0]?.value;
  if (settings?.enabled === false) S.fail(403, 'CHAT_DISABLED');
  return tx(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['chat:' + user.id]);
    if (await A.sanction(user.id, 'CHAT', db)) S.fail(403, 'CHAT_MUTED');
    const old = (
      await db.query('SELECT * FROM chat_messages WHERE user_id=$1 AND request_id=$2', [
        user.id,
        request,
      ])
    ).rows[0];
    if (old) {
      if ((old.payload_hash || S.hash(old.body)) !== S.hash(p.body) || old.room !== room)
        S.fail(409, 'IDEMPOTENCY_CONFLICT');
      return { ...(await message(old, db)), replayed: true };
    }
    const state = await G.state(user.id, db);
    if (room !== 'global' && room !== state.scene) S.fail(403, 'ROOM_FORBIDDEN');
    const recent = (
      await db.query(
        "SELECT count(*) n,max(created_at) last FROM chat_messages WHERE user_id=$1 AND created_at>now()-interval'30 seconds'",
        [user.id],
      )
    ).rows[0];
    if (
      Number(recent.n) >= 5 ||
      (recent.last && Date.now() - new Date(recent.last).getTime() < 3000)
    )
      S.fail(429, 'CHAT_RATE_LIMIT');
    const checked = classify(p.body);
    const r = (
      await db.query(
        'INSERT INTO chat_messages(room,user_id,request_id,body,status,payload_hash) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
        [
          room,
          user.id,
          request,
          checked.status === 'rejected'
            ? '[Đã chặn liên kết hoặc thông tin cá nhân]'
            : checked.body,
          checked.status,
          S.hash(p.body),
        ],
      )
    ).rows[0];
    return { ...(await message(r, db)), reason: checked.reason };
  });
}
async function history(user, room, before, after) {
  const st = await G.state(user.id);
  if (room !== 'global' && room !== st.scene) S.fail(403, 'ROOM_FORBIDDEN');
  const r = await pool.query(
    "SELECT m.*,u.display_name FROM chat_messages m JOIN game_users u ON u.id=m.user_id WHERE m.room=$1 AND m.status='published' AND ($2::bigint IS NULL OR m.id<$2) AND ($3::bigint IS NULL OR m.id>$3) ORDER BY m.id " +
      (after ? 'ASC' : 'DESC') +
      ' LIMIT 50',
    [room, before || null, after || null],
  );
  return (after ? r.rows : r.rows.reverse()).map((r) => ({
    id: String(r.id),
    seq: Number(r.id),
    room: r.room,
    body: r.body,
    status: r.status,
    author: { id: r.user_id, displayName: r.display_name },
    sentAt: r.created_at,
  }));
}
module.exports = { classify, send, history, message };
