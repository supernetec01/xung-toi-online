const assert = require('node:assert/strict');
(async () => {
  let checks = 0;
  const base = 'http://127.0.0.1:5001';
  for (const path of ['/', '/src/wardrobe.js', '/src/online.js', '/src/art.js', '/src/style.css']) {
    assert.equal((await fetch(base + path)).status, 200);
    checks++;
  }
  for (const path of [
    '/assets/v12/nave.webp',
    '/assets/v8/nave.webp',
    '/assets/christmas/architecture.webp',
  ]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/webp');
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    checks++;
  }
  for (const path of [
    '/src/..%2fpackage.json',
    '/src/..%2fdocs/schema_v3.sql',
    '/src/..%2f..%2f.local/operator.json',
    '/assets/..%2fpackage.json',
    '/.local/database.json',
    '/config/rbac.json',
    '/.git/config',
    '/references/BASELINE_V3_REFERENCE_ONLY.zip',
  ]) {
    assert([403, 404].includes((await fetch(base + path)).status), path);
    checks++;
  }
  console.log(
    `PASS ${checks} static path isolation checks; private and historical repository files are not served`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
