const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  const baseline = process.argv.includes('--baseline'),
    runs = [];
  try {
    const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
    await p.goto('http://127.0.0.1:5001');
    for (let i = 0; i < 2; i++) {
      await p.evaluate(() => {
        const s = PARISH_RULES.defaults();
        Object.assign(s, { username: 'Bạn QC', scene: 'foyer', x: 50, y: 91 });
        localStorage.setItem('giao-xu-an-hoa-2d-v3', JSON.stringify(s));
      });
      await p.reload();
      await p.waitForSelector('#stage[data-scene=foyer]');
      await p.bringToFront();
      await p.keyboard.down('w');
      await p.waitForTimeout(180);
      await p.keyboard.down('d');
      await p.waitForTimeout(180);
      await p.keyboard.up('d');
      await p.waitForTimeout(150);
      const before = await p.evaluate(() => parseFloat(worldPlayer.style.top));
      await p.waitForTimeout(300);
      const after = await p.evaluate(() => parseFloat(worldPlayer.style.top));
      await p.keyboard.up('w');
      runs.push({ before, after, resumed: after < before - 2 });
      if (!baseline) assert(after < before - 2, 'releasing D must keep held W moving');
    }
    fs.writeFileSync(
      'qa/evidence/input-' + (baseline ? 'before' : 'after') + '.json',
      JSON.stringify({ baseline, runs }, null, 2) + '\n',
    );
    console.log(
      baseline
        ? 'REPRODUCED held-key release freezes movement twice.'
        : 'PASS held-key rollover regression twice.',
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
