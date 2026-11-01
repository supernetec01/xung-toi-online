/* Pure gameplay rules, shared by the browser and Node regression tests. */
(function (root) {
  'use strict';
  const defaults = () => ({
    version: 3,
    username: '',
    gender: 'female',
    skin: '#f7cfac',
    scene: 'courtyard',
    x: 51,
    y: 82,
    coins: 150,
    accepted: ['q_welcome'],
    claimed: [],
    tracked: 'q_welcome',
    progress: {},
    achievements: {},
    cooldowns: {},
    activityCount: {},
    activityHistory: [],
    inventory: ['shirt_cream', 'bottom_navy', 'shoe_brown', 'hair_dark', 'acc_none'],
    equipped: {
      top: 'shirt_cream',
      bottom: 'bottom_navy',
      shoes: 'shoe_brown',
      hair: 'hair_dark',
      acc: 'acc_none',
    },
    book: false,
    bookReturned: false,
    watered: [],
    decorated: [],
    giftDone: false,
    giftItems: [],
    seated: false,
    seatId: null,
    logs: [],
    lowMotion: false,
    activeAction: null,
    virtualFund: 0,
    contributions: [],
  });
  function migrate(raw, D) {
    const s = { ...defaults(), ...(raw || {}) };
    delete s.xp;
    delete s.level;
    delete s.kindness;
    delete s.donationDemo;
    delete s.donorBoard;
    s.version = 3;
    s.equipped = { ...defaults().equipped, ...s.equipped };
    if (!D.scenes[s.scene]) s.scene = 'courtyard';
    s.inventory = [...new Set([...defaults().inventory, ...s.inventory])].filter((id) =>
      D.items.some((i) => i.id === id),
    );
    for (const slot of Object.keys(s.equipped))
      if (
        !s.inventory.includes(s.equipped[slot]) ||
        !D.items.some((i) => i.id === s.equipped[slot] && i.slot === slot)
      )
        s.equipped[slot] = defaults().equipped[slot];
    // Recover irreversible achievements from legacy saves, without crediting any reward again.
    for (const entries of Object.values(s.progress))
      for (const [event, p] of Object.entries(entries)) {
        const ids = p.ids?.length
          ? p.ids
          : Array.from({ length: p.count || 0 }, (_, i) => 'legacy:' + i);
        s.achievements[event] = [...new Set([...(s.achievements[event] || []), ...ids])];
      }
    for (const id of s.watered) remember(s, 'water_flower', id);
    for (const id of s.decorated) remember(s, 'decorate', id);
    if (s.book) remember(s, 'pickup_book', 'book');
    if (s.bookReturned || s.achievements.return_book?.length) {
      s.bookReturned = true;
      s.book = false;
      remember(s, 'pickup_book', 'book');
    }
    if (s.giftDone) remember(s, 'complete_gift', 'gift');
    if (s.scene === 'nave') remember(s, 'enter_nave', 'nave');
    syncProgress(s, D);
    return s;
  }
  function remember(s, event, target) {
    const ids = (s.achievements[event] ??= []);
    if (!ids.includes(target)) ids.push(target);
  }
  function syncProgress(s, D) {
    for (const q of D.quests) {
      if (!s.accepted.includes(q.id) || s.claimed.includes(q.id)) continue;
      for (const [event, n] of q.steps) {
        const ids = s.achievements[event] || [];
        const old = s.progress[q.id]?.[event];
        s.progress[q.id] ??= {};
        s.progress[q.id][event] = {
          ids: ids.slice(0, n),
          count: Math.min(n, Math.max(ids.length, old?.count || 0)),
        };
      }
    }
  }
  function record(s, D, event, target) {
    remember(s, event, target);
    syncProgress(s, D);
  }
  function progress(s, q) {
    return q.steps.reduce(
      (p, [event, n]) => ({
        cur: p.cur + Math.min(n, s.progress[q.id]?.[event]?.count || 0),
        total: p.total + n,
      }),
      { cur: 0, total: 0 },
    );
  }
  function status(s, q) {
    if (s.claimed.includes(q.id)) return 'claimed';
    if (s.accepted.includes(q.id)) {
      const p = progress(s, q);
      return p.cur === p.total ? 'ready' : 'active';
    }
    return q.requires.every((id) => s.claimed.includes(id)) ? 'available' : 'locked';
  }
  function accept(s, D, id) {
    const q = D.quests.find((q) => q.id === id);
    if (!q || status(s, q) !== 'available') return false;
    s.accepted.push(id);
    s.tracked = id;
    syncProgress(s, D);
    return true;
  }
  function claim(s, D, id) {
    const q = D.quests.find((q) => q.id === id);
    if (!q || status(s, q) !== 'ready') return false;
    s.claimed.push(id);
    s.coins += q.rewardCoins;
    if (s.tracked === id)
      s.tracked = D.quests.find((q) => ['ready', 'active'].includes(status(s, q)))?.id || '';
    return true;
  }
  function purchase(s, D, id) {
    const i = D.items.find((i) => i.id === id);
    if (!i) return 'invalid';
    if (!s.inventory.includes(id)) {
      if (s.coins < i.price) return 'insufficient';
      s.coins -= i.price;
      s.inventory.push(id);
    }
    s.equipped[i.slot] = id;
    return 'ok';
  }
  function start(s, ACT, id, now, executionId) {
    const a = ACT.find((a) => a.id === id);
    if (!a || s.scene !== a.scene || s.activeAction || s.cooldowns[id] > now) return false;
    s.activeAction = { id: executionId, actionId: id, completeAt: now + a.seconds * 1000 };
    return true;
  }
  function complete(s, ACT, id, now) {
    const e = s.activeAction;
    if (!e || e.id !== id || now < e.completeAt) return null;
    const a = ACT.find((a) => a.id === e.actionId);
    if (!a) {
      s.activeAction = null;
      return null;
    }
    s.coins += a.coins;
    s.cooldowns[a.id] = now + a.cooldown * 1000;
    s.activityCount[a.id] = (s.activityCount[a.id] || 0) + 1;
    s.activityHistory.unshift({
      id: a.id,
      executionId: id,
      at: new Date(now).toISOString(),
      coins: a.coins,
    });
    s.activityHistory = s.activityHistory.slice(0, 70);
    s.activeAction = null;
    return a;
  }
  function contribute(s, amount, id) {
    if (
      ![50, 150, 300].includes(amount) ||
      s.contributions.some((c) => c.id === id) ||
      s.coins < amount
    )
      return false;
    s.coins -= amount;
    s.virtualFund += amount;
    s.contributions.push({ id, amount });
    return true;
  }
  root.PARISH_RULES = {
    defaults,
    migrate,
    record,
    progress,
    status,
    accept,
    claim,
    purchase,
    start,
    complete,
    contribute,
  };
})(typeof window === 'undefined' ? globalThis : window);
