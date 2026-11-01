const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH,
      args: ['--no-sandbox'],
    }),
    baseline = process.argv.includes('--baseline'),
    rows = [];
  try {
    for (const width of [320, 375, 390, 768, 1024, 1366, 1920]) {
      const c = await b.newContext({ viewport: { width, height: 844 }, hasTouch: width < 900 }),
        p = await c.newPage();
      await p.goto('http://127.0.0.1:5001');
      await p.evaluate(() => {
        const s = PARISH_RULES.defaults();
        s.username = 'Bạn QC';
        localStorage.setItem('giao-xu-an-hoa-2d-v3', JSON.stringify(s));
      });
      await p.reload();
      await p.waitForSelector('#stage[data-scene=courtyard]');
      const sizes = await p.evaluate(() =>
        Array.from(document.querySelectorAll('button,#onlineControls a'))
          .filter((el) => el.getClientRects().length)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40),
              w: r.width,
              h: r.height,
              x: r.x,
              y: r.y,
            };
          })
          .filter(
            (r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= innerWidth && r.y + r.h <= innerHeight,
          ),
      );
      const short = sizes.filter((r) => r.w < 43.9 || r.h < 43.9);
      rows.push({
        width,
        short,
        overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      });
      if (!baseline) {
        assert.equal(short.length, 0, 'small targets at ' + width + ': ' + JSON.stringify(short));
        assert(!rows.at(-1).overflow);
      }
      if (width === 320)
        await p.screenshot({
          path: 'qa/evidence/game-touch-' + (baseline ? 'before' : 'after') + '.png',
        });
      await c.close();
    }
    fs.writeFileSync(
      'qa/evidence/game-touch-' + (baseline ? 'before' : 'after') + '.json',
      JSON.stringify({ baseline, rows }, null, 2) + '\n',
    );
    console.log(
      baseline
        ? 'Measured game touch targets before fix.'
        : 'PASS game touch targets and overflow across seven widths.',
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
