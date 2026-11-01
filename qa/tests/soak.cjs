const fs = require('node:fs'),
  crypto = require('node:crypto'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
const { pool, tx } = require('../../server/db.cjs'),
  A = require('../../server/auth.cjs'),
  S = require('../../server/security.cjs');
if (!process.env.DATABASE_URL?.includes('/anhoa_qc_')) throw Error('QC database required');
(async () => {
  const token = S.random(),
    csrf = S.random();
  const cfg = (await pool.query("SELECT value FROM settings WHERE key='ambient'")).rows[0].value;
  const adminToken = S.random(),
    adminCsrf = S.random();
  await tx(async (db) => {
    const uid = await A.newUser(
      db,
      'soak_admin_' + crypto.randomBytes(5).toString('hex'),
      'QC Admin',
      await S.password(S.random()),
      ['ADMIN'],
      S.encrypt(S.authenticator.generateSecret()),
    );
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at,mfa_at) VALUES($1,$2,$3,now()+interval'1 hour',now())",
      [S.hash(adminToken), uid, adminCsrf],
    );
  });
  const configure = async (value) => {
    const headers = {
      Cookie: 'anhoa_session=' + adminToken,
      'X-CSRF-Token': adminCsrf,
      'Content-Type': 'application/json',
    };
    const current = await (
      await fetch('http://127.0.0.1:5001/api/admin/ambient-configs', { headers })
    ).json();
    const r = await fetch('http://127.0.0.1:5001/api/admin/ambient-configs', {
      method: 'PUT',
      headers: { ...headers, 'If-Match': String(current.version) },
      body: JSON.stringify({ sceneId: 'choir', ...value, reason: 'QC isolated load benchmark' }),
    });
    if (!r.ok) throw Error('QC population configuration failed ' + r.status);
  };
  await configure({ targetVisualActors: 30, ambientMax: 28, renderCap: 32 });
  const id = await tx(async (db) => {
    const id = await A.newUser(
      db,
      'soak_' + crypto.randomBytes(5).toString('hex'),
      'Bạn QC',
      await S.password(S.random()),
    );
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval'1 hour')",
      [S.hash(token), id, csrf],
    );
    return id;
  });
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } });
    await c.addCookies([
      {
        name: 'anhoa_session',
        value: token,
        url: 'http://127.0.0.1:5001',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    const p = await c.newPage(),
      errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('http://127.0.0.1:5001');
    await p.waitForFunction(() => PARISH_ONLINE.active);
    const cd = await c.newCDPSession(p);
    await cd.send('Performance.enable');
    const measure = async () => {
      await cd.send('HeapProfiler.collectGarbage');
      const m = await cd.send('Runtime.getHeapUsage');
      return {
        ...(await p.evaluate(() => ({
          nodes: document.querySelectorAll('*').length,
          actors:
            document.querySelectorAll('.online-actor').length +
            document.querySelectorAll('.actor').length +
            1,
        }))),
        heap: m.usedSize,
      };
    };
    const initial = await measure();
    for (let i = 0; i < 100; i++) {
      await p.locator('[data-open=map]').click();
      await p.locator('[data-travel=' + (i % 2 ? 'office' : 'choir') + ']').click();
      await p.waitForFunction(() => !document.querySelector('.window'));
    }
    const afterTransitions = await measure();
    await p.locator('[data-open=map]').click();
    await p.locator('[data-travel=choir]').click();
    await p.waitForFunction(
      () =>
        document.querySelectorAll('.online-actor').length +
          document.querySelectorAll('.actor').length +
          1 >=
        30,
      {},
      { timeout: 90000 },
    );
    const samples = [],
      start = Date.now();
    for (let i = 0; i <= 10; i++) {
      const metric = await measure();
      const frames = await p.evaluate(async () => {
        const ts = [],
          start = performance.now();
        let last = start;
        await new Promise((resolve) => {
          const f = (now) => {
            ts.push(now - last);
            last = now;
            if (now - start < 1500) requestAnimationFrame(f);
            else resolve();
          };
          requestAnimationFrame(f);
        });
        ts.sort((a, b) => a - b);
        return { fps: ts.length / ((last - start) / 1000), p95: ts[Math.floor(ts.length * 0.95)] };
      });
      samples.push({ seconds: (Date.now() - start) / 1000, ...metric, ...frames });
      fs.writeFileSync(
        'qa/evidence/soak-progress.json',
        JSON.stringify({ initial, afterTransitions, samples, errors }, null, 2) + '\n',
      );
      if (i === 0 || i === 10)
        await p.screenshot({ path: 'qa/evidence/soak-' + i + '.jpg', type: 'jpeg', quality: 80 });
      if (i < 10) await p.waitForTimeout(Math.max(0, 60000 - (Date.now() - start - i * 60000)));
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      'qa/evidence/soak-results.json',
      JSON.stringify(
        {
          completed: true,
          isolatedDatabase: true,
          transitions: 100,
          initial,
          afterTransitions,
          samples,
          errors,
          physicalDevice: false,
        },
        null,
        2,
      ) + '\n',
    );
    console.log('PASS 10-minute Chromium soak + 100 scene transitions; measurements saved.');
    await c.close();
  } finally {
    await b.close();
    await configure(
      cfg.scenes?.choir || {
        targetVisualActors: cfg.targetVisualActors,
        ambientMax: cfg.ambientMax,
        renderCap: cfg.renderCap,
      },
    );
  }
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
