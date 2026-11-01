const assert = require('node:assert/strict'),
  fs = require('node:fs');
const { chromium } = require('playwright');
const KEY = 'giao-xu-an-hoa-2d-v3';
const state = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const options = {
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
};
async function dismiss(p) {
  const x = p.locator('.window .close');
  if (await x.count()) await x.click();
  await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
}
async function quests(p, filter) {
  await dismiss(p);
  await p.locator('[data-open=quests]').click();
  if (filter !== 'active') await p.locator(`[data-quest-tab=${filter}]`).click();
}
async function travel(p, scene) {
  await dismiss(p);
  await p.locator('[data-open=map]').click();
  await p.locator(`[data-travel=${scene}]`).click();
  await p.waitForFunction(
    ([k, id]) => JSON.parse(localStorage.getItem(k)).scene === id,
    [KEY, scene],
  );
  await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
}
(async () => {
  const b = await chromium.launch(options),
    errors = [];
  let checks = 0;
  try {
    const c = await b.newContext({ viewport: { width: 1366, height: 768 } });
    c.setDefaultTimeout(10000);
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('http://127.0.0.1:5001');
    await p.locator('#inputName').fill('Người khám phá');
    await p.locator('[data-choose=male]').click();
    assert.equal(await p.locator('.window .close').isVisible(), false);
    await p.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).click();
    await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
    const catalog = await p.evaluate(() => ({
      quests: PARISH_DATA.quests,
      actions: PARISH_ACTIVITIES,
      npcs: PARISH_DATA.npcs,
      scenes: PARISH_DATA.scenes,
    }));
    // Exercise irreversible book handoff before accepting the book quest.
    await travel(p, 'classroom');
    await p.locator('[data-spot=book]').click();
    await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).book, KEY);
    await travel(p, 'garden');
    await p.locator('[data-npc=anna]').click();
    await p.getByRole('button', { name: 'Trả cuốn sách', exact: true }).click();
    await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).bookReturned, KEY);
    await dismiss(p);
    checks++;
    // Every quest is solved through the user-facing guide, interactions and mini-games.
    for (const q of catalog.quests) {
      if (q.id !== 'q_welcome') {
        await quests(p, 'all');
        await p.locator(`[data-quest-action=${q.id}]`).click();
        await p.waitForFunction(
          ([k, id]) => JSON.parse(localStorage.getItem(k)).accepted.includes(id),
          [KEY, q.id],
        );
      }
      for (const [event, n] of q.steps) {
        if (((await state(p)).progress[q.id]?.[event]?.count || 0) >= n) continue;
        for (let i = (await state(p)).progress[q.id]?.[event]?.count || 0; i < n; i++) {
          await quests(p, 'active');
          await p.locator(`[data-guide=${q.id}]`).click();
          if (event === 'sit_pew') {
            await p.locator('[data-seat="1"]').click();
          }
          if (event === 'return_book') {
            await p.getByRole('button', { name: 'Trả cuốn sách', exact: true }).click();
          }
          if (event.startsWith('quiz_')) {
            await p.locator('[data-answer="0"]').click();
            assert.equal((await state(p)).progress[q.id]?.[event]?.count || 0, 0);
            await p.locator('[data-answer="1"]').click();
          }
          if (event === 'complete_gift') {
            await p.locator('[data-gift="0"]').click();
            await p.waitForFunction(
              (k) => JSON.parse(localStorage.getItem(k)).giftItems.includes(0),
              KEY,
            );
            await p.reload();
            await quests(p, 'active');
            await p.locator(`[data-guide=${q.id}]`).click();
            assert(await p.locator('[data-gift="0"]').isDisabled());
            await p.locator('[data-gift="1"]').click();
            await p.waitForFunction(
              (k) => JSON.parse(localStorage.getItem(k)).giftItems.length === 2,
              KEY,
            );
            await p.locator('[data-gift="2"]').click();
          }
          if (event === 'complete_rhythm') {
            await p.locator('[data-rhythm="1"]').click();
            for (const i of [0, 1, 2]) await p.locator(`[data-rhythm="${i}"]`).click();
          }
          await p.waitForFunction(
            ([k, id, event, n]) =>
              (JSON.parse(localStorage.getItem(k)).progress[id]?.[event]?.count || 0) >= n,
            [KEY, q.id, event, i + 1],
          );
        }
      }
      const coins = (await state(p)).coins;
      await quests(p, 'active');
      await p.locator(`[data-quest-action=${q.id}]`).click();
      await p.waitForFunction(
        ([k, id]) => JSON.parse(localStorage.getItem(k)).claimed.includes(id),
        [KEY, q.id],
      );
      assert.equal((await state(p)).coins, coins + q.rewardCoins);
      console.log('PASS quest', q.id);
      checks++;
      if (q.id === 'q_pew') {
        await travel(p, 'nave');
        await p.locator('[data-npc=sister]').click();
        await p.waitForSelector('.npc-quest');
        assert.equal(await p.locator('[data-npc-accept]').count(), 2);
      }
    }
    assert.equal((await state(p)).coins, 745);
    assert.equal((await state(p)).claimed.length, 11);
    await p.screenshot({ path: 'artifacts/current/all-quests-completed.png' });
    // All NPCs remain interactable after quests, including NPCs with multiple quests.
    for (const id of Object.keys(catalog.npcs)) {
      const scene = Object.keys(catalog.scenes).find((s) => catalog.scenes[s].npc.includes(id));
      await travel(p, scene);
      await p.locator(`[data-npc=${id}]`).click();
      await p.waitForSelector('.dialogue-text');
      assert.equal(await p.locator('.window-head h2').innerText(), catalog.npcs[id].name);
      checks++;
    }
    console.log('PASS all 11 NPC dialogues');
    await dismiss(p);
    await p.clock.install();
    let expected = (await state(p)).coins;
    for (const a of catalog.actions) {
      await travel(p, a.scene);
      await p.locator('[data-open=actions]').click();
      await p.locator(`[data-activity-button=${a.id}]`).click();
      await p.waitForFunction(
        ([k, id]) => JSON.parse(localStorage.getItem(k)).activeAction?.actionId === id,
        [KEY, a.id],
      );
      assert.equal((await state(p)).coins, expected);
      assert.equal(await p.locator('#actionTool').innerText(), a.icon);
      await p.clock.fastForward(a.seconds * 1000 + 150);
      await p.waitForFunction(
        ([k, id]) => JSON.parse(localStorage.getItem(k)).activityCount[id] === 1,
        [KEY, a.id],
      );
      expected += a.coins;
      assert.equal((await state(p)).coins, expected);
      await p.waitForSelector(`[data-activity-button=${a.id}]`);
      assert(await p.locator(`[data-activity-button=${a.id}]`).isDisabled());
      assert.match(await p.locator(`[data-activity-button=${a.id}]`).innerText(), /⏳ \d\d:\d\d/);
      console.log('PASS activity', a.id);
      checks++;
    }
    console.log('PASS all activity balances');
    await dismiss(p);
    await p.reload();
    assert.equal((await state(p)).coins, expected);
    assert.equal(Object.keys((await state(p)).activityCount).length, 14);
    checks++;
    await p.locator('[data-open=menu]').click();
    await p.locator('#goDonation').click();
    await p.locator('[data-virtual-give="50"]').click();
    await p.getByRole('button', { name: 'Xác nhận', exact: true }).dblclick();
    await p.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).virtualFund === 50, KEY);
    assert.equal((await state(p)).coins, expected - 50);
    checks++;
    await dismiss(p);
    await travel(p, 'garden');
    await p.screenshot({ path: 'artifacts/current/garden-completed.png' });
    await travel(p, 'christmas');
    await p.screenshot({ path: 'artifacts/current/christmas-completed.png' });
    // Mobile quest guidance must reach an off-screen NPC and return the book.
    const m = await b.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    m.setDefaultTimeout(10000);
    const mp = await m.newPage();
    mp.on('pageerror', (e) => errors.push(e.message));
    await mp.goto('http://127.0.0.1:5001');
    await mp.locator('#inputName').fill('Bạn nhỏ');
    await mp.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).click();
    await mp.waitForFunction(() => !document.querySelector('[role=dialog]'));
    await quests(mp, 'active');
    await mp.locator('[data-guide=q_welcome]').click();
    await mp.waitForSelector('.dialogue-text');
    await mp.screenshot({ path: 'artifacts/current/mobile-npc-quests.png' });
    assert.equal(await mp.locator('[data-npc-claim=q_welcome]').count(), 1);
    await mp.locator('[data-npc-claim=q_welcome]').click();
    await mp.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).claimed.includes('q_welcome'),
      KEY,
    );
    checks++;
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${checks} complete-game browser checks (11 quests / 14 activities / 11 NPCs)`,
    );
    await m.close();
    await c.close();
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
