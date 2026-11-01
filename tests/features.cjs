const assert = require('node:assert/strict');
const F = require('../server/features.cjs');
const names = ['NODE_ENV', 'FEATURE_ADMIN', 'FEATURE_CHAT', 'FEATURE_AMBIENT_NPC'];
const before = Object.fromEntries(names.map((n) => [n, process.env[n]]));
try {
  process.env.NODE_ENV = 'production';
  for (const n of names.slice(1)) delete process.env[n];
  assert.deepEqual([F.admin, F.chat, F.ambient], [false, false, false]);
  for (const n of names.slice(1)) process.env[n] = 'true';
  assert.deepEqual([F.admin, F.chat, F.ambient], [true, true, true]);
  process.env.NODE_ENV = 'development';
  for (const n of names.slice(1)) process.env[n] = 'false';
  assert.deepEqual([F.admin, F.chat, F.ambient], [false, false, false]);
  console.log('PASS 3 production feature gate checks');
} finally {
  for (const n of names)
    if (before[n] === undefined) delete process.env[n];
    else process.env[n] = before[n];
}
