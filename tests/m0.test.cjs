const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  readJson,
  verifyFrozenRuntime,
  validateTaskGraph,
} = require('../scripts/lib/m0-project.cjs');
const { inspectSave } = require('../scripts/inspect-legacy-save.cjs');
const fixture = () => readJson('tests/fixtures/m0/legacy-save.json');
test('M0 freezes the ten existing runtime files; a changed byte is detected', () => {
  assert.deepEqual(verifyFrozenRuntime(), { unchanged: true, changed: [], checkedFiles: 10 });
  const changed = verifyFrozenRuntime(ROOT, (file) =>
    file.endsWith('game.js') ? Buffer.from('unexpected rewrite') : fs.readFileSync(file),
  );
  assert.equal(changed.unchanged, false);
  assert.deepEqual(changed.changed, ['game_v3/src/game.js']);
});
test('V4 tasks form a complete acyclic plan and completed tasks have evidence', () => {
  const board = readJson('tasks.json');
  assert.equal(board.tasks.length, 20);
  assert(validateTaskGraph(board));
  for (const task of board.tasks) {
    if (board.status === 'M0_COMPLETE_M1_PENDING' && task.milestone !== 'M0')
      assert.equal(task.status, 'TODO');
    if (task.status === 'DONE') {
      assert(task.evidence?.length);
      for (const file of task.evidence) assert(fs.existsSync(path.join(ROOT, file)), file);
      for (const id of task.dependsOn)
        assert.equal(board.tasks.find((t) => t.id === id).status, 'DONE');
    }
  }
  const cycle = structuredClone(board);
  cycle.tasks[0].dependsOn.push(cycle.tasks.at(-1).id);
  assert.throws(() => validateTaskGraph(cycle), /cycle/);
  const missing = structuredClone(board);
  missing.tasks[0].dependsOn.push('unknown');
  assert.throws(() => validateTaskGraph(missing), /Missing/);
});
test('RBAC decision contract excludes PLAYER/MODERATOR/EDITOR from internal stats', () => {
  const c = readJson('config/v4-boundaries.json');
  assert.equal(c.status, 'DESIGN_ONLY_NOT_RUNTIME_AUTHORIZATION');
  assert.equal(c.defaultPolicy, 'DENY');
  assert.deepEqual(c.canonicalRoles, [
    'PLAYER',
    'MODERATOR',
    'CONTENT_EDITOR',
    'ADMIN',
    'SUPER_ADMIN',
  ]);
  assert.deepEqual(c.permissions['presence.metrics'], ['ADMIN', 'SUPER_ADMIN']);
  assert.deepEqual(c.permissions['roles.grant'], ['SUPER_ADMIN']);
  assert(!c.permissions['content.publish'].includes('CONTENT_EDITOR'));
  assert(c.sensitiveRequirements['roles.grant'].includes('recent-mfa'));
  assert(Object.values(c.futureFeatureDefaults).every((v) => v === false));
});
test('actor design contract reserves wallet/chat for players and protects fixed NPCs', () => {
  const a = readJson('config/v4-boundaries.json').actorTypes;
  assert.equal(a.FIXED_NPC.densityMayRemove, false);
  assert.equal(a.FIXED_NPC.questGiver, true);
  assert.equal(a.AMBIENT_NPC.densityMayRemove, true);
  assert.equal(a.LIVE_GUEST.maxActions, 1);
  for (const type of ['FIXED_NPC', 'AMBIENT_NPC', 'LIVE_GUEST'])
    for (const permission of ['requiresAccount', 'wallet', 'playerChat'])
      assert.equal(a[type][permission], false);
});
test('legacy dry run preserves existing wallet, ownership, claimed rewards and deadlines without mutating input', () => {
  const raw = fixture(),
    before = JSON.stringify(raw),
    report = inspectSave(raw);
  assert.equal(report.status, 'REVIEW_ONLY');
  for (const f of [
    'walletPreserved',
    'ownershipPreserved',
    'claimedPreserved',
    'cooldownsPreserved',
  ])
    assert.equal(report[f], true);
  for (const f of ['applied', 'identityImported', 'rolesImported', 'serverImportAvailable'])
    assert.equal(report[f], false);
  assert.equal(JSON.stringify(raw), before);
  assert(!JSON.stringify(report).includes(raw.username));
  const v2 = fixture();
  v2.version = 2;
  v2.xp = 123;
  assert.equal(inspectSave(v2).status, 'REVIEW_ONLY');
});
test('dry run blocks unknown/archived items instead of silently deleting ownership', () => {
  const raw = fixture();
  raw.inventory.push('archived_item_from_future');
  const before = JSON.stringify(raw);
  const report = inspectSave(raw);
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.applied, false);
  assert.match(report.issues.join(' '), /do not discard ownership/);
  assert.equal(JSON.stringify(raw), before);
});
test('dry run blocks corrupt/hostile shapes and never copies role claims', () => {
  for (const raw of [
    null,
    [],
    {},
    { ...fixture(), coins: -1 },
    { ...fixture(), version: 4 },
    { ...fixture(), inventory: 'bad' },
    { ...fixture(), progress: { q_welcome: { talk_lucia: { count: 1000000000 } } } },
    { ...fixture(), progress: { q_welcome: null } },
    JSON.parse('{"__proto__":{"role":"ADMIN"}}'),
  ])
    assert.equal(inspectSave(raw).status, 'BLOCKED');
  const raw = { ...fixture(), role: 'SUPER_ADMIN', isAdmin: true };
  const report = inspectSave(raw);
  assert.equal(report.rolesImported, false);
  assert(!JSON.stringify(report).includes('SUPER_ADMIN'));
});
