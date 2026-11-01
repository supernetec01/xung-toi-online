const { loadCatalog } = require('../scripts/lib/m0-project.cjs'),
  { pool, tx } = require('./db.cjs'),
  { fail, text } = require('./security.cjs');
const base = loadCatalog(),
  R = base.PARISH_RULES,
  N = base.PARISH_NAV;
const seed = JSON.parse(JSON.stringify({ ...base.PARISH_DATA, actions: base.PARISH_ACTIVITIES }));
async function initCatalog() {
  await tx(async (db) => {
    await db.query(
      'INSERT INTO catalog_current(singleton,version,payload) VALUES(true,1,$1) ON CONFLICT DO NOTHING',
      [seed],
    );
    await db.query(
      "INSERT INTO catalog_publications(version,payload,reason) VALUES(1,$1,'initial stable catalog') ON CONFLICT DO NOTHING",
      [seed],
    );
  });
}
async function current(db = pool) {
  const r = (await db.query('SELECT version,payload FROM catalog_current WHERE singleton=true'))
    .rows[0];
  return { version: r.version, ...r.payload };
}
function validate(c) {
  const errors = [];
  if (
    !c ||
    !Array.isArray(c.items) ||
    !Array.isArray(c.quests) ||
    !Array.isArray(c.actions) ||
    !c.npcs ||
    !c.scenes
  )
    return ['Invalid catalog shape'];
  function safe(v, depth = 0) {
    if (depth > 20) {
      errors.push('Content nesting limit');
      return;
    }
    if (typeof v === 'string' && (/[<>]/.test(v) || v.length > 4000))
      errors.push('Invalid text content');
    else if (v && typeof v === 'object')
      for (const [key, value] of Object.entries(v)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          errors.push('Unsafe content key');
        else safe(value, depth + 1);
      }
  }
  safe(c);
  errors.push(...require('../game_v3/src/scene-contract.js').validate(c, N));
  const validId = (id) => typeof id === 'string' && /^[a-z][a-z0-9_]{1,63}$/.test(id),
    color = (x) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);
  for (const key of ['items', 'quests', 'actions'])
    if (c[key].length > 1000 || new Set(c[key].map((x) => x?.id)).size !== c[key].length)
      errors.push('Invalid or duplicate ' + key);
  for (const id of Object.keys(seed.npcs))
    if (!c.npcs[id]) errors.push('Fixed NPC cannot be removed');
  for (const i of c.items)
    if (
      !i ||
      !validId(i.id) ||
      !['top', 'bottom', 'shoes', 'hair', 'acc'].includes(i.slot) ||
      !Number.isInteger(i.price) ||
      i.price < 0 ||
      i.price > 100000 ||
      !color(i.color) ||
      typeof i.name !== 'string' ||
      i.name.length > 80 ||
      typeof i.icon !== 'string' ||
      [...i.icon].length > 12 ||
      (i.thumbnail && !/^\/uploads\/[a-f0-9]{64}\.webp$/.test(i.thumbnail))
    )
      errors.push('Invalid item');
  for (const item of c.items)
    if (item) errors.push(...require('../game_v3/src/wardrobe.js').validate(item));
  for (const a of c.actions)
    if (
      !a ||
      !validId(a.id) ||
      !c.scenes[a.scene] ||
      !Number.isInteger(a.cooldown) ||
      a.cooldown < 60 ||
      a.cooldown > 600 ||
      !Number.isInteger(a.coins) ||
      a.coins < 1 ||
      a.coins > 100 ||
      !Number.isFinite(a.seconds) ||
      a.seconds < 2 ||
      a.seconds > 5 ||
      !Array.isArray(a.anchor) ||
      a.anchor.length !== 2 ||
      !a.anchor.every(Number.isFinite) ||
      !CWalk(c, a) ||
      ![
        'cross',
        'bow',
        'kneel',
        'pray',
        'clean',
        'sweep',
        'wave',
        'water',
        'sing',
        'decorate',
        'carry',
      ].includes(a.pose)
    )
      errors.push('Invalid action');
  function CWalk(c, a) {
    return c.scenes[a.scene] && N.walkable(c.scenes[a.scene], ...a.anchor);
  }
  const seen = new Set(),
    visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      errors.push('Quest cycle');
      return;
    }
    if (seen.has(id)) return;
    const q = c.quests.find((q) => q.id === id);
    if (!q || !Array.isArray(q.requires)) {
      errors.push('Missing/invalid quest');
      return;
    }
    visiting.add(id);
    for (const req of q.requires) visit(req);
    visiting.delete(id);
    seen.add(id);
  }
  const events = new Set([
    ...seed.quests.flatMap((q) => q.steps.map((s) => s[0])),
    ...Object.values(c.npcs).map((n) => n.event),
  ]);
  for (const q of c.quests) {
    if (!q) {
      errors.push('Invalid quest');
      continue;
    }
    visit(q.id);
    if (
      !validId(q.id) ||
      !Array.isArray(q.steps) ||
      !q.steps.length ||
      !Number.isInteger(q.rewardCoins) ||
      q.rewardCoins < 0 ||
      q.rewardCoins > 1000 ||
      !c.npcs[q.giverId] ||
      q.steps.some(
        (s) =>
          !Array.isArray(s) || !events.has(s[0]) || !Number.isInteger(s[1]) || s[1] < 1 || s[1] > 3,
      )
    )
      errors.push('Invalid quest');
  }
  for (const [id, n] of Object.entries(c.npcs))
    if (
      !validId(id) ||
      !n ||
      typeof n.name !== 'string' ||
      typeof n.line !== 'string' ||
      n.name.length > 80 ||
      n.line.length > 2000 ||
      !color(n.shirt) ||
      !color(n.hair) ||
      !['male', 'female'].includes(n.gender) ||
      typeof n.event !== 'string'
    )
      errors.push('Invalid NPC');
  if (
    c.event &&
    (!c.event.title ||
      typeof c.event.enabled !== 'boolean' ||
      [c.event.startsAt, c.event.endsAt].some(
        (t) => t !== null && t !== undefined && !Number.isFinite(Date.parse(t)),
      ) ||
      (c.event.startsAt &&
        c.event.endsAt &&
        Date.parse(c.event.endsAt) <= Date.parse(c.event.startsAt)))
  )
    errors.push('Invalid event schedule');
  return [...new Set(errors)];
}
function apply(c, kind, id, payload) {
  const next = structuredClone(c);
  delete next.version;
  if (['item', 'quest', 'action'].includes(kind)) {
    const key = { item: 'items', quest: 'quests', action: 'actions' }[kind],
      old = next[key].find((x) => x.id === id);
    if (payload.id !== id) fail(400, 'STABLE_ID_REQUIRED');
    if (kind === 'item' && old && payload.slot !== old.slot) fail(422, 'SLOT_IMMUTABLE');
    next[key] = [...next[key].filter((x) => x.id !== id), payload];
  } else if (kind === 'npc') {
    if (!next.npcs[id]) {
      const sc = next.scenes[payload.sceneId];
      if (
        !sc ||
        !Array.isArray(payload.spawn) ||
        !payload.spawn.every(Number.isFinite) ||
        !N.walkable(sc, ...payload.spawn)
      )
        fail(422, 'NPC_SPAWN_REQUIRED');
      sc.npc.push(id);
      sc.npcPoints[id] = payload.spawn;
      next.npcs[id] = {
        name: payload.name,
        role: payload.role || 'Cư dân',
        gender: payload.gender || 'female',
        shirt: payload.shirt || '#7c9cc1',
        hair: payload.hair || '#543932',
        line: payload.line || 'Chào bạn!',
        event: 'talk_' + id,
        x: payload.spawn[0],
        y: payload.spawn[1],
      };
    } else next.npcs[id] = { ...next.npcs[id], ...payload };
  } else if (kind === 'event') {
    next.event = { ...payload };
  } else fail(400, 'INVALID_CONTENT_KIND');
  for (const q of next.quests) {
    if (!Array.isArray(q?.steps)) fail(422, 'QUEST_STEPS_REQUIRED');
    q.giver = next.npcs[q.giverId]?.name;
    q.guidance = q.steps.map(([event]) => {
      const original = base.PARISH_GAMEPLAY.routes[event];
      if (original) return original;
      const npc = Object.keys(next.npcs).find((id) => next.npcs[id].event === event);
      return npc
        ? { npc, scene: Object.keys(next.scenes).find((s) => next.scenes[s].npc.includes(npc)) }
        : null;
    });
  }
  const errors = validate(next);
  if (errors.length) fail(422, 'CATALOG_INVALID', errors.join('; '));
  return next;
}
async function validateAssets(item) {
  if (!item.assets) return;
  const fs = require('node:fs/promises'),
    path = require('node:path'),
    sharp = require('sharp');
  for (const gender of item.rigCompatibility || ['male', 'female']) {
    const atlas = item.assets[gender];
    try {
      const file = path.join(require('./db.cjs').root, '.local', atlas.url.slice(1));
      const bytes = await fs.readFile(file),
        meta = await sharp(bytes).metadata();
      if (
        meta.width !== atlas.width ||
        meta.height !== atlas.height ||
        bytes.length > 2 * 1024 * 1024
      )
        throw Error();
    } catch {
      fail(422, 'ATLAS_ASSET_MISSING_OR_MISMATCHED');
    }
  }
}
module.exports = { base, R, N, seed, initCatalog, current, validate, apply, validateAssets };
