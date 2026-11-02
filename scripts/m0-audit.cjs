// Read-only M0 check. Never reads credentials or browser profiles and never applies SQL.
const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  loadCatalog,
  readJson,
  verifyFrozenRuntime,
  validateTaskGraph,
} = require('./lib/m0-project.cjs');
function validateCatalogBaseline(catalog, expected, additions = {}) {
  for (const [key, ids] of Object.entries(expected)) {
    const next = [...ids, ...(additions[key] || [])];
    if (new Set(next).size !== next.length || JSON.stringify(catalog[key]) !== JSON.stringify(next))
      throw new Error('Stable catalog ID baseline changed: ' + key);
  }
}
function audit() {
  const frozen = verifyFrozenRuntime();
  if (!frozen.unchanged) throw new Error(`M0 frozen runtime changed: ${frozen.changed.join(', ')}`);
  const board = readJson('tasks.json');
  validateTaskGraph(board);
  const { PARISH_DATA: D, PARISH_ACTIVITIES: activities } = loadCatalog();
  const catalog = {
    sceneIds: Object.keys(D.scenes),
    npcIds: Object.keys(D.npcs),
    questIds: D.quests.map((q) => q.id),
    itemIds: D.items.map((i) => i.id),
    actionIds: activities.map((a) => a.id),
  };
  const expected = readJson('artifacts/m0/catalog-baseline.json');
  const additions = readJson('config/v12-catalog-additions.json');
  validateCatalogBaseline(catalog, expected, additions);
  const flags = readJson('config/v4-boundaries.json');
  if (Object.values(flags.futureFeatureDefaults).some(Boolean))
    throw new Error('M0 must not enable V4 features');
  for (const file of [
    'IMPLEMENTATION_AUDIT.md',
    'MIGRATION_PLAN.md',
    'KNOWN_ISSUES.md',
    'docs/ADR/003-v4-boundaries.md',
    '.env.example',
  ]) {
    if (!fs.existsSync(path.join(ROOT, file))) throw new Error(`Missing M0 deliverable ${file}`);
  }
  const baseline = readJson('artifacts/m0-baseline.json');
  return {
    milestone: 'M0',
    mode: 'read-only-historical-baseline-audit',
    currentRuntime: 'online-demo; PostgreSQL; see docs/milestones/V4_DEMO_REPORT.md',
    runtimeHashScope: 'references/m0-runtime historical copies; active source may evolve',
    runtime: frozen,
    frozenGit: { branch: baseline.branch, commit: baseline.headCommit, state: baseline.headState },
    catalog,
    approvedAdditions: additions,
    taskCount: board.tasks.length,
    databaseAtM0: 'no-runtime-database',
    dataKeys: flags.legacySaveKeys,
    port: flags.localPort,
    environmentPresence: Object.fromEntries(
      ['DATABASE_URL', 'PGHOST', 'REDIS_URL'].map((name) => [name, Boolean(process.env[name])]),
    ),
    authorizationAtM0: 'design-contract-only; current runtime enforces config/rbac.json',
  };
}
if (require.main === module) {
  try {
    console.log(JSON.stringify(audit(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { audit, validateCatalogBaseline };
