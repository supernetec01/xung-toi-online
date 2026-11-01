const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });
  const rows = [];
  try {
    for (const fps of [20, 30, 60]) {
      const c = await b.newContext({ viewport: { width: 1366, height: 768 } });
      await c.addInitScript((fps) => {
        const native = requestAnimationFrame;
        window.requestAnimationFrame = (fn) => {
          const start = performance.now();
          return native(function frame(now) {
            if (now - start >= 1000 / fps - 2) fn(now);
            else native(frame);
          });
        };
      }, fps);
      const p = await c.newPage();
      await p.goto('http://127.0.0.1:5001');
      await p.evaluate(() => {
        const s = PARISH_RULES.defaults();
        Object.assign(s, { username: 'Bạn QC', scene: 'foyer', x: 50, y: 91 });
        localStorage.setItem('giao-xu-an-hoa-2d-v3', JSON.stringify(s));
      });
      await p.reload();
      await p.waitForSelector('#stage[data-scene=foyer]');
      await p.bringToFront();
      await p.evaluate(() =>
        stage.addEventListener(
          'click',
          (e) => {
            const r = stage.getBoundingClientRect();
            window.qcGoal = [
              ((e.clientX - r.left) / r.width) * 100,
              ((e.clientY - r.top) / r.height) * 100,
            ];
            window.qcStart = performance.now();
          },
          true,
        ),
      );
      const r = await p.locator('#stage').boundingBox();
      await p.mouse.click(r.x + r.width * 0.5, r.y + r.height * 0.62);
      await p.waitForFunction(() => {
        const s = JSON.parse(localStorage.getItem('giao-xu-an-hoa-2d-v3'));
        return (
          window.qcGoal &&
          Math.hypot(s.x - qcGoal[0], s.y - qcGoal[1]) < 0.1 &&
          !worldPlayer.classList.contains('walking')
        );
      });
      rows.push({ fps, elapsedMs: await p.evaluate(() => performance.now() - qcStart) });
      await c.close();
    }
    const min = Math.min(...rows.map((r) => r.elapsedMs)),
      max = Math.max(...rows.map((r) => r.elapsedMs));
    assert(max / min < 1.4, '20/30/60 FPS walking remains comparable');
    fs.writeFileSync(
      'qa/evidence/frame-rate.json',
      JSON.stringify({ passed: true, rows, ratio: max / min }, null, 2) + '\n',
    );
    console.log('PASS movement at controlled 20/30/60 rAF rates.');
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
