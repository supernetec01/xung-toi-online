const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
function readJson(relative, root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}
function loadCatalog(root = ROOT) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const name of ['data', 'activities', 'rules', 'gameplay', 'scene-layout', 'navigation']) {
    vm.runInContext(fs.readFileSync(path.join(root, `game_v3/src/${name}.js`), 'utf8'), ctx);
  }
  return ctx.window;
}
function verifyFrozenRuntime(root = ROOT, readFile = fs.readFileSync) {
  const baseline = readJson('artifacts/m0-baseline.json', root);
  const changed = [];
  for (const [relative, checksum] of Object.entries(baseline.runtimeFiles)) {
    if (!/^(game_v3\/(src\/[^/]+|index.html)|scripts\/serve.cjs)$/.test(relative)) {
      throw new Error('Invalid baseline runtime path');
    }
    try {
      if (hash(readFile(path.join(root, 'references/m0-runtime', relative))) !== checksum)
        changed.push(relative);
    } catch {
      changed.push(relative);
    }
  }
  return {
    unchanged: changed.length === 0,
    changed,
    checkedFiles: Object.keys(baseline.runtimeFiles).length,
  };
}
function validateTaskGraph(board) {
  const tasks = new Map(board.tasks.map((task) => [task.id, task]));
  if (tasks.size !== board.tasks.length) throw new Error('Duplicate task IDs');
  const visiting = new Set(),
    visited = new Set();
  function visit(id) {
    if (!tasks.has(id)) throw new Error(`Missing task ${id}`);
    if (visiting.has(id)) throw new Error(`Task dependency cycle: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of tasks.get(id).dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of tasks.keys()) visit(id);
  return true;
}
module.exports = { ROOT, hash, readJson, loadCatalog, verifyFrozenRuntime, validateTaskGraph };
