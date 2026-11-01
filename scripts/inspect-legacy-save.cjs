// Offline DRY RUN only: no database, localStorage access, converted save output or file writes.
const fs = require('node:fs');
const { loadCatalog, hash } = require('./lib/m0-project.cjs');
const { PARISH_DATA: D, PARISH_RULES: R, PARISH_ACTIVITIES: A } = loadCatalog();
const list = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
function inspectSave(raw) {
  const issues = [];
  if (!object(raw))
    return { status: 'BLOCKED', issues: ['Save must be an object'], applied: false };
  function scan(v, depth = 0) {
    if (depth > 20) {
      issues.push('Maximum nesting exceeded');
      return;
    }
    if (v && typeof v === 'object')
      for (const [key, value] of Object.entries(v)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key))
          issues.push('Unsafe object key');
        else scan(value, depth + 1);
      }
  }
  scan(raw);
  if (![2, 3].includes(raw.version)) issues.push('Unsupported legacy version');
  if (!Number.isSafeInteger(raw.coins) || raw.coins < 0) issues.push('Invalid wallet');
  for (const key of ['inventory', 'accepted', 'claimed'])
    if (key in raw && !list(raw[key])) issues.push(`Invalid ${key}`);
  for (const key of ['progress', 'equipped', 'cooldowns', 'achievements'])
    if (key in raw && !object(raw[key])) issues.push(`Invalid ${key}`);
  if (raw.gender !== undefined && !['male', 'female'].includes(raw.gender))
    issues.push('Invalid avatar gender');
  if (raw.skin !== undefined && !['#f7cfac', '#d9a77f', '#ae7658'].includes(raw.skin))
    issues.push('Invalid avatar palette');
  if (raw.scene !== undefined && !D.scenes[raw.scene]) issues.push('Unknown scene needs mapping');
  for (const key of ['x', 'y'])
    if (raw[key] !== undefined && (!Number.isFinite(raw[key]) || raw[key] < 0 || raw[key] > 100))
      issues.push('Invalid position');
  for (const key of ['book', 'bookReturned', 'giftDone', 'seated', 'lowMotion'])
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean')
      issues.push('Invalid gameplay flag');
  const knownItems = new Set(D.items.map((i) => i.id)),
    knownQuests = new Set(D.quests.map((q) => q.id)),
    knownActions = new Set(A.map((a) => a.id));
  for (const id of Array.isArray(raw.inventory) ? raw.inventory : [])
    if (!knownItems.has(id))
      issues.push('Unknown/archived item needs mapping; do not discard ownership');
  for (const key of ['accepted', 'claimed'])
    for (const id of Array.isArray(raw[key]) ? raw[key] : [])
      if (!knownQuests.has(id)) issues.push('Unknown quest needs mapping; do not discard progress');
  for (const [id, time] of Object.entries(object(raw.cooldowns) ? raw.cooldowns : {}))
    if (!knownActions.has(id) || !Number.isSafeInteger(time) || time < 0)
      issues.push('Invalid/unknown cooldown needs mapping');
  for (const key of ['inventory', 'accepted', 'claimed', 'watered', 'decorated']) {
    if (key in raw && (!list(raw[key]) || raw[key].length > 1000))
      issues.push(`Invalid or oversized ${key}`);
  }
  for (const [questId, steps] of Object.entries(object(raw.progress) ? raw.progress : {})) {
    if (!knownQuests.has(questId) || !object(steps)) {
      issues.push('Unknown/corrupt quest progress');
      continue;
    }
    const quest = D.quests.find((q) => q.id === questId);
    for (const [event, progress] of Object.entries(steps)) {
      if (
        !quest.steps.some((step) => step[0] === event) ||
        !object(progress) ||
        !Number.isSafeInteger(progress.count) ||
        progress.count < 0 ||
        progress.count > 1000 ||
        (progress.ids !== undefined && (!list(progress.ids) || progress.ids.length > 1000))
      ) {
        issues.push('Invalid or oversized quest progress');
      }
    }
  }
  for (const ids of Object.values(object(raw.achievements) ? raw.achievements : {})) {
    if (!list(ids) || ids.length > 1000) issues.push('Invalid or oversized achievements');
  }
  // The current client normalizer is not a safe server import policy. Refuse lossy cases.
  if (issues.length) return { status: 'BLOCKED', issues: [...new Set(issues)], applied: false };
  let projected;
  try {
    projected = R.migrate(structuredClone(raw), D);
  } catch {
    return {
      status: 'BLOCKED',
      issues: ['Legacy shape cannot be normalized safely'],
      applied: false,
    };
  }
  const walletPreserved = projected.coins === raw.coins;
  const ownershipPreserved = (raw.inventory || []).every((id) => projected.inventory.includes(id));
  const claimedPreserved = (raw.claimed || []).every((id) => projected.claimed.includes(id));
  const cooldownsPreserved = Object.entries(raw.cooldowns || {}).every(
    ([id, time]) => projected.cooldowns[id] === time,
  );
  return {
    status:
      walletPreserved && ownershipPreserved && claimedPreserved && cooldownsPreserved
        ? 'REVIEW_ONLY'
        : 'BLOCKED',
    applied: false,
    sourceVersion: raw.version,
    projectionVersion: projected.version,
    walletPreserved,
    ownershipPreserved,
    claimedPreserved,
    cooldownsPreserved,
    identityImported: false,
    rolesImported: false,
    serverImportAvailable: false,
    trust:
      'Browser balances/claims are untrusted. Server policy, authentication and an idempotent receipt are prerequisites.',
    issues: [],
  };
}
if (require.main === module) {
  try {
    if (process.argv.length !== 3)
      throw new Error(
        'Usage: node scripts/inspect-legacy-save.cjs <offline-test-save.json> (dry-run only)',
      );
    const file = process.argv[2];
    if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Save exceeds 2 MiB limit');
    const bytes = fs.readFileSync(file),
      report = inspectSave(JSON.parse(bytes));
    if (hash(fs.readFileSync(file)) !== hash(bytes))
      throw new Error('Input changed during inspection');
    console.log(JSON.stringify(report, null, 2));
    if (report.status === 'BLOCKED') process.exitCode = 2;
  } catch {
    console.error(
      'Unable to inspect save: expected one readable JSON file, <=2 MiB. No data was written.',
    );
    process.exitCode = 1;
  }
}
module.exports = { inspectSave };
