const { pool, tx } = require('./db.cjs'),
  S = require('./security.cjs'),
  C = require('./catalog.cjs'),
  A = require('./auth.cjs');
async function state(userId, db = pool) {
  const r = (
    await db.query(
      'SELECT s.state,s.version,w.coins,u.display_name FROM player_states s JOIN game_wallets w ON w.user_id=s.user_id JOIN game_users u ON u.id=s.user_id WHERE s.user_id=$1',
      [userId],
    )
  ).rows[0];
  if (!r) S.fail(404, 'USER_NOT_FOUND');
  return {
    ...r.state,
    coins: Number(r.coins),
    username: r.display_name,
    stateVersion: Number(r.version),
  };
}
async function play(user, key, kind, payload, fn) {
  key = S.text(key, 8, 120);
  const fingerprint = S.hash(JSON.stringify(payload));
  return tx(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [user.id]);
    if (
      user.token_hash &&
      (!(
        await db.query('SELECT 1 FROM user_sessions WHERE token_hash=$1 AND expires_at>now()', [
          user.token_hash,
        ])
      ).rowCount ||
        (await A.sanction(user.id, 'ACCOUNT', db)))
    )
      S.fail(401, 'SESSION_REVOKED');
    const old = (
      await db.query('SELECT * FROM operation_receipts WHERE user_id=$1 AND key=$2', [user.id, key])
    ).rows[0];
    if (old) {
      if (old.kind !== kind || old.payload_hash !== fingerprint)
        S.fail(409, 'IDEMPOTENCY_CONFLICT');
      return old.response;
    }
    const st = await state(user.id, db),
      c = await C.current(db),
      before = st.coins;
    const result = await fn(st, c, db);
    const delta = st.coins - before;
    if (!Number.isSafeInteger(st.coins) || st.coins < 0) S.fail(422, 'INVALID_BALANCE');
    if (delta) {
      await db.query('UPDATE game_wallets SET coins=$2 WHERE user_id=$1', [user.id, st.coins]);
      await db.query(
        'INSERT INTO coin_ledger(user_id,delta,balance,source_type,source_ref,metadata) VALUES($1,$2,$3,$4,$5,$6)',
        [
          user.id,
          delta,
          st.coins,
          kind,
          result?.sourceRef || key,
          { actionId: result?.actionId || null },
        ],
      );
    }
    const next = { ...st };
    delete next.coins;
    delete next.stateVersion;
    const version = st.stateVersion + 1;
    await db.query('UPDATE player_states SET state=$2,version=$3 WHERE user_id=$1', [
      user.id,
      next,
      version,
    ]);
    const response = {
      state: { ...st, stateVersion: version },
      result: result || null,
      serverNow: Date.now(),
      catalogVersion: c.version,
    };
    await db.query(
      'INSERT INTO operation_receipts(user_id,key,kind,payload_hash,response) VALUES($1,$2,$3,$4,$5)',
      [user.id, key, kind, fingerprint, response],
    );
    return response;
  });
}
function progressCatalog(st, c) {
  return { ...c, quests: c.quests.map((q) => st.questSnapshots?.[q.id] || q) };
}
function near(st, c, point) {
  const target = C.N.nearest(c.scenes[st.scene], point);
  if (!target || Math.hypot(st.x - target[0], st.y - target[1]) > 13)
    S.fail(422, 'APPROACH_REQUIRED');
}
async function interact(user, key, p) {
  S.exact(p, ['npcId', 'spotId', 'choice', 'answer', 'sequence']);
  return play(user, key, 'interact', p, async (st, c, db) => {
    if (st.activeAction) S.fail(409, 'ACTION_BUSY');
    const scene = c.scenes[st.scene];
    if (p.npcId) {
      if (!scene.npc.includes(p.npcId)) S.fail(422, 'NPC_NOT_HERE');
      const npc = c.npcs[p.npcId];
      near(st, c, scene.npcPoints[p.npcId]);
      C.R.record(st, progressCatalog(st, c), npc.event, 'npc:' + p.npcId);
      if (p.npcId === 'anna' && p.choice === 'return_book' && st.book) {
        st.book = false;
        st.bookReturned = true;
        C.R.record(st, progressCatalog(st, c), 'pickup_book', 'book');
        C.R.record(st, progressCatalog(st, c), 'return_book', 'anna');
      }
      return;
    }
    const spot = scene.spots.find((s) => s[0] === p.spotId);
    if (!spot) S.fail(404, 'HOTSPOT_NOT_FOUND');
    const [id, , , , , kind, arg] = spot;
    const anchor =
      kind === 'quiz' && arg === 'baptism' && Math.hypot(st.x - 50, st.y - 89) < 13
        ? [50, 89]
        : scene.anchors[spot[0]] || [spot[3], spot[4]];
    near(st, c, anchor);
    if (kind === 'learn')
      C.R.record(
        st,
        progressCatalog(st, c),
        arg === 'baptism' ? 'learn_baptism' : 'learn_confession',
        arg,
      );
    else if (kind === 'quiz') {
      const quiz = c.quizzes[arg];
      if (p.answer !== quiz.correct) S.fail(422, 'WRONG_ANSWER');
      C.R.record(st, progressCatalog(st, c), quiz.event, arg);
    } else if (kind === 'book') {
      if (!st.bookReturned) {
        st.book = true;
        C.R.record(st, progressCatalog(st, c), 'pickup_book', 'book');
      }
    } else if (kind === 'water' || kind === 'decorate') {
      const list = kind === 'water' ? 'watered' : 'decorated';
      if (!st[list].includes(id)) st[list].push(id);
      C.R.record(st, progressCatalog(st, c), kind === 'water' ? 'water_flower' : 'decorate', id);
    } else if (kind === 'pack') {
      if (!Number.isInteger(p.choice) || p.choice < 0 || p.choice >= 3) S.fail(400, 'INVALID_GIFT');
      if (!st.giftItems.includes(p.choice)) st.giftItems.push(p.choice);
      if (st.giftItems.length === 3) {
        st.giftDone = true;
        C.R.record(st, progressCatalog(st, c), 'complete_gift', 'gift');
      }
    } else if (kind === 'rhythm') {
      if (JSON.stringify(p.sequence) !== '[0,1,2]') S.fail(422, 'WRONG_RHYTHM');
      C.R.record(st, progressCatalog(st, c), 'complete_rhythm', 'rhythm');
    } else if (kind === 'seat') {
      if (!Number.isInteger(p.choice) || p.choice < 0 || p.choice > 2) S.fail(400, 'INVALID_SEAT');
      const seat = st.scene + ':' + id + ':' + p.choice;
      await db.query('DELETE FROM seat_leases WHERE expires_at<now()');
      await db.query('DELETE FROM seat_leases WHERE user_id=$1', [user.id]);
      try {
        await db.query(
          "INSERT INTO seat_leases(seat_id,user_id,expires_at) VALUES($1,$2,now()+interval'60 seconds')",
          [seat, user.id],
        );
      } catch (e) {
        if (e.code === '23505') S.fail(409, 'SEAT_OCCUPIED');
        throw e;
      }
      st.seated = true;
      st.seatId = seat;
      st.x = spot[3] + (p.choice - 1) * 3;
      st.y = spot[4];
      C.R.record(st, progressCatalog(st, c), 'sit_pew', seat);
    } else S.fail(422, 'NO_QUEST_EVENT');
  });
}
async function location(user, key, p, travel = false) {
  S.exact(p, travel ? ['sceneId'] : ['x', 'y']);
  return play(user, key, travel ? 'travel' : 'move', p, async (st, c, db) => {
    if (st.activeAction) S.fail(409, 'ACTION_BUSY');
    const scene = travel ? p.sceneId : st.scene;
    if (!c.scenes[scene]) S.fail(400, 'INVALID_SCENE');
    let point;
    if (travel) point = C.N.nearest(c.scenes[scene], c.scenes[scene].entry);
    else {
      if (
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        !C.N.walkable(c.scenes[scene], p.x, p.y)
      )
        S.fail(422, 'BLOCKED_LOCATION');
      point = [p.x, p.y];
      if (!C.N.route(c.scenes[scene], [st.x, st.y], point).length) S.fail(422, 'NO_PATH');
    }
    st.scene = scene;
    [st.x, st.y] = point;
    st.seated = false;
    st.seatId = null;
    await db.query('DELETE FROM seat_leases WHERE user_id=$1', [user.id]);
    if (scene === 'nave') C.R.record(st, progressCatalog(st, c), 'enter_nave', 'nave');
  });
}
async function quest(user, key, id, op) {
  return play(user, key, 'quest.' + op, { id }, (st, c) => {
    if (!c.quests.some((q) => q.id === id)) S.fail(404, 'QUEST_NOT_FOUND');
    if (op === 'accept') {
      const q = c.quests.find((q) => q.id === id);
      if (q.archived && !st.accepted.includes(id)) S.fail(422, 'QUEST_ARCHIVED');
      if (C.R.accept(st, progressCatalog(st, c), id)) {
        st.questRewards ??= {};
        st.questRewards[id] = q.rewardCoins;
        st.questSnapshots ??= {};
        st.questSnapshots[id] = structuredClone(q);
      }
    } else {
      const q = st.questSnapshots?.[id] || c.quests.find((q) => q.id === id),
        frozen = st.questRewards?.[id] ?? q.rewardCoins;
      if (C.R.claim(st, progressCatalog(st, c), id)) st.coins += frozen - q.rewardCoins;
      else if (C.R.status(st, q) !== 'claimed') S.fail(422, 'QUEST_NOT_READY');
    }
    return { sourceRef: id };
  });
}
async function purchase(user, key, p) {
  S.exact(p, ['itemId']);
  return play(user, key, 'shop.purchase', p, (st, c) => {
    const item = c.items.find((i) => i.id === p.itemId);
    if (!item || (item.archived && !st.inventory.includes(item.id)))
      S.fail(422, 'ITEM_NOT_AVAILABLE');
    if (item.rigCompatibility && !item.rigCompatibility.includes(st.gender))
      S.fail(422, 'INCOMPATIBLE_RIG');
    const r = C.R.purchase(st, c, p.itemId);
    if (r !== 'ok') S.fail(422, 'INSUFFICIENT_COINS');
    return { sourceRef: p.itemId };
  });
}
async function equipment(user, key, p) {
  S.exact(p, ['itemId']);
  return play(user, key, 'equip', p, (st, c) => {
    const item = c.items.find((i) => i.id === p.itemId);
    if (!item || !st.inventory.includes(item.id)) S.fail(403, 'ITEM_NOT_OWNED');
    if (item.rigCompatibility && !item.rigCompatibility.includes(st.gender))
      S.fail(422, 'INCOMPATIBLE_RIG');
    st.equipped[item.slot] = item.id;
  });
}
async function appearance(user, key, p) {
  S.exact(p, ['gender', 'skin', 'lowMotion', 'tracked']);
  return play(user, key, 'appearance', p, (st, c) => {
    if (p.gender !== undefined) {
      if (!['male', 'female'].includes(p.gender)) S.fail(400, 'INVALID_GENDER');
      st.gender = p.gender;
      for (const [slot, id] of Object.entries(st.equipped)) {
        const owned = c.items.find((i) => i.id === id);
        if (owned?.rigCompatibility && !owned.rigCompatibility.includes(st.gender))
          st.equipped[slot] = C.R.defaults().equipped[slot];
      }
    }
    if (p.skin !== undefined) {
      if (!['#f7cfac', '#d9a77f', '#ae7658'].includes(p.skin)) S.fail(400, 'INVALID_SKIN');
      st.skin = p.skin;
    }
    if (typeof p.lowMotion === 'boolean') st.lowMotion = p.lowMotion;
    if (p.tracked !== undefined) {
      if (!c.quests.some((q) => q.id === p.tracked)) S.fail(400, 'INVALID_QUEST');
      st.tracked = p.tracked;
    }
  });
}
async function startAction(user, key, id) {
  return play(user, key, 'action.start', { id }, async (st, c, db) => {
    const a = c.actions.find((a) => a.id === id);
    if (!a || a.archived) S.fail(404, 'ACTION_NOT_FOUND');
    near(st, c, a.anchor);
    const daily = Number(
      (
        await db.query(
          "SELECT coalesce(sum(delta),0) n FROM coin_ledger WHERE user_id=$1 AND source_type='action.complete' AND created_at >= (date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')",
          [user.id],
        )
      ).rows[0].n,
    );
    if (daily + a.coins > 300) S.fail(429, 'DAILY_ACTION_LIMIT');
    if (!C.R.start(st, c.actions, id, Date.now(), require('node:crypto').randomUUID()))
      S.fail(409, 'COOLDOWN_OR_BUSY');
    st.activeAction.rewardCoins = a.coins;
    st.activeAction.cooldown = a.cooldown;
    st.activeAction.catalogVersion = c.version;
    return st.activeAction;
  });
}
async function completeAction(user, key, id) {
  return play(user, key, 'action.complete', { id }, async (st, c, db) => {
    if (!st.activeAction) {
      const prior = (
        await db.query(
          "SELECT metadata FROM coin_ledger WHERE user_id=$1 AND source_type='action.complete' AND source_ref=$2",
          [user.id, id],
        )
      ).rows[0];
      if (!prior) S.fail(404, 'EXECUTION_NOT_FOUND');
      return { sourceRef: id, actionId: prior.metadata.actionId };
    }
    const e = st.activeAction;
    if (e.id !== id) S.fail(404, 'EXECUTION_NOT_FOUND');
    if (Date.now() < e.completeAt) S.fail(409, 'TOO_EARLY');
    const actions = c.actions.map((a) =>
      a.id === e.actionId ? { ...a, coins: e.rewardCoins, cooldown: e.cooldown } : a,
    );
    if (!C.R.complete(st, actions, id, Date.now())) S.fail(409, 'ACTION_NOT_READY');
    return { sourceRef: id, actionId: e.actionId };
  });
}
function eventInfo(c, now = Date.now()) {
  const event = c.event;
  return {
    title: event?.title || 'Noel · chung tay trang trí',
    enabled:
      !event ||
      (event.enabled &&
        (!event.startsAt || now >= Date.parse(event.startsAt)) &&
        (!event.endsAt || now < Date.parse(event.endsAt))),
    startsAt: event?.startsAt || null,
    endsAt: event?.endsAt || null,
  };
}
async function contribute(user, key, p) {
  S.exact(p, ['coins']);
  return play(user, key, 'contribute', p, async (st, c, db) => {
    if (!eventInfo(c).enabled) S.fail(422, 'EVENT_CLOSED');
    if (!C.R.contribute(st, p.coins, key)) S.fail(422, 'INSUFFICIENT_COINS');
    await db.query("UPDATE virtual_projects SET total=total+$1 WHERE id='noel'", [p.coins]);
    return { sourceRef: key };
  });
}
async function importDemo(user, key, raw) {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_IMPORT_ENABLED === 'false')
    S.fail(404, 'DISABLED');
  const { inspectSave } = require('../scripts/inspect-legacy-save.cjs');
  if (inspectSave(raw).status !== 'REVIEW_ONLY') S.fail(422, 'DEMO_SAVE_NEEDS_REVIEW');
  if (raw.coins > 100000) S.fail(422, 'DEMO_LIMIT');
  return play(
    user,
    key,
    'demo.import',
    { fingerprint: S.hash(JSON.stringify(raw)) },
    async (st, c, db) => {
      if ((await db.query('SELECT 1 FROM demo_imports WHERE user_id=$1', [user.id])).rowCount)
        S.fail(409, 'ALREADY_IMPORTED');
      const legacy = C.R.migrate(structuredClone(raw), c);
      for (const field of [
        'gender',
        'skin',
        'scene',
        'x',
        'y',
        'coins',
        'accepted',
        'claimed',
        'tracked',
        'progress',
        'achievements',
        'inventory',
        'equipped',
        'book',
        'bookReturned',
        'watered',
        'decorated',
        'giftDone',
        'giftItems',
        'lowMotion',
      ])
        st[field] = legacy[field];
      st.questSnapshots = Object.fromEntries(
        st.accepted.map((id) => [id, c.quests.find((q) => q.id === id)]),
      );
      st.questRewards = Object.fromEntries(
        st.accepted.map((id) => [id, c.quests.find((q) => q.id === id)?.rewardCoins || 0]),
      );
      st.x = C.N.nearest(c.scenes[st.scene], [st.x, st.y])[0];
      st.y = C.N.nearest(c.scenes[st.scene], [st.x, st.y])[1];
      for (const [id, ready] of Object.entries(raw.cooldowns || {}))
        st.cooldowns[id] = Math.max(Date.now(), Math.min(Date.now() + 600000, ready));
      await db.query('INSERT INTO demo_imports(user_id,fingerprint) VALUES($1,$2)', [
        user.id,
        S.hash(JSON.stringify(raw)),
      ]);
      return { sourceRef: 'once' };
    },
  );
}
module.exports = {
  state,
  play,
  interact,
  location,
  quest,
  purchase,
  equipment,
  appearance,
  startAction,
  completeAction,
  contribute,
  importDemo,
  eventInfo,
  progressCatalog,
};
