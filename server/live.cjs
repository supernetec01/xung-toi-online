const crypto = require('node:crypto'),
  { pool, tx } = require('./db.cjs'),
  S = require('./security.cjs'),
  A = require('./auth.cjs'),
  { classify } = require('./chat.cjs');
function config(p, catalog) {
  S.exact(p, ['sceneId', 'keyword', 'action', 'maxVisibleGuests', 'queueMax', 'reason']);
  if (
    !['courtyard', 'garden', 'christmas'].includes(p.sceneId) ||
    !catalog.scenes[p.sceneId] ||
    !['wave', 'water', 'decorate', 'carry'].includes(p.action) ||
    !Number.isInteger(p.maxVisibleGuests) ||
    p.maxVisibleGuests < 1 ||
    p.maxVisibleGuests > 20 ||
    !Number.isInteger(p.queueMax) ||
    p.queueMax < 1 ||
    p.queueMax > 100
  )
    S.fail(422, 'INVALID_LIVE_SETTINGS');
  return {
    sceneId: p.sceneId,
    keyword: S.text(p.keyword, 1, 20).normalize('NFKC').toLocaleUpperCase('vi'),
    action: p.action,
    maxVisibleGuests: p.maxVisibleGuests,
    queueMax: p.queueMax,
  };
}
async function start(world, user, p) {
  if (process.env.NODE_ENV === 'production') S.fail(404, 'MOCK_DISABLED_IN_PRODUCTION');
  const settings = config(p, world.catalog),
    id = crypto.randomUUID();
  await stop(world, user, 'Thay phiên simulator');
  await tx(async (db) => {
    await db.query(
      'INSERT INTO live_sessions(id,settings,running,created_by) VALUES($1,$2,true,$3)',
      [id, settings, user.id],
    );
    await A.audit(db, user, 'live.mock.start', id, p.reason, { settings });
  });
  world.live = { id, settings, running: true, provider: 'MOCK' };
  return { sessionId: id, provider: 'MOCK' };
}
async function stop(world, user, reason) {
  if (world.live) {
    await tx(async (db) => {
      await db.query('UPDATE live_sessions SET running=false WHERE id=$1', [world.live.id]);
      await db.query(
        "UPDATE live_events SET status='expired' WHERE session_id=$1 AND status='queued'",
        [world.live.id],
      );
      await A.audit(db, user, 'live.stop', world.live.id, reason);
    });
  }
  world.live = null;
  world.queue = [];
  world.guests = [];
  return { ok: true };
}
async function simulate(world, user, p) {
  if (process.env.NODE_ENV === 'production') S.fail(404, 'MOCK_DISABLED_IN_PRODUCTION');
  S.exact(p, ['eventId', 'viewerKey', 'displayName', 'text']);
  if (!world.live?.running) S.fail(409, 'LIVE_STOPPED');
  const live = world.live,
    eventId = S.text(p.eventId, 8, 100),
    viewer = S.hash(S.text(p.viewerKey, 1, 100)),
    name = S.text(p.displayName, 1, 60),
    input = S.text(p.text, 1, 160);
  const safeName =
    classify(name).status === 'published' && !/[<>]/.test(name)
      ? [...name].slice(0, 18).join('')
      : 'Khách LIVE';
  if (input.normalize('NFKC').toLocaleUpperCase('vi') !== live.settings.keyword)
    S.fail(422, 'KEYWORD_NOT_MATCHED');
  return tx(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['live:' + live.id]);
    const activeSession = (
      await db.query('SELECT running FROM live_sessions WHERE id=$1 FOR UPDATE', [live.id])
    ).rows[0];
    if (!activeSession?.running || world.live?.id !== live.id) S.fail(409, 'LIVE_STOPPED');
    const old = (
      await db.query('SELECT status FROM live_events WHERE session_id=$1 AND event_id=$2', [
        live.id,
        eventId,
      ])
    ).rows[0];
    if (old) return { accepted: false, duplicate: true };
    if (
      (
        await db.query(
          "SELECT 1 FROM live_events WHERE session_id=$1 AND viewer_hash=$2 AND created_at>now()-interval'60 seconds'",
          [live.id, viewer],
        )
      ).rowCount
    )
      S.fail(429, 'VIEWER_COOLDOWN');
    if (world.queue.length >= live.settings.queueMax) S.fail(429, 'LIVE_QUEUE_FULL');
    await db.query(
      "INSERT INTO live_events(session_id,event_id,viewer_hash,status) VALUES($1,$2,$3,'queued')",
      [live.id, eventId, viewer],
    );
    await db.query('UPDATE live_sessions SET progress=progress+1 WHERE id=$1', [live.id]);
    world.queue.push({ id: eventId, name: safeName });
    return { accepted: true };
  });
}
module.exports = { start, stop, simulate };
