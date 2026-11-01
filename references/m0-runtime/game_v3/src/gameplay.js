/* Locations, guidance and navigation geometry use logical percentage coordinates. */
(function () {
  const D = window.PARISH_DATA;
  const routes = {
    talk_lucia: { scene: 'courtyard', npc: 'lucia' },
    enter_nave: { scene: 'nave' },
    sit_pew: { scene: 'nave', spot: 'seat_a' },
    talk_father: { scene: 'nave', npc: 'father' },
    learn_baptism: { scene: 'baptistry', spot: 'font' },
    quiz_baptism: { scene: 'baptistry', spot: 'quiz_baptism' },
    learn_confession: { scene: 'confession', spot: 'reconcile' },
    pickup_book: { scene: 'classroom', spot: 'book' },
    return_book: { scene: 'garden', npc: 'anna' },
    water_flower: { scene: 'garden', spots: ['flower1', 'flower2', 'flower3'] },
    complete_rhythm: { scene: 'choir', spot: 'rhythm' },
    complete_gift: { scene: 'office', spot: 'pack' },
    decorate: { scene: 'christmas', spots: ['star', 'tree', 'gifts'] },
    quiz_class: { scene: 'classroom', spot: 'quiz_class' },
  };
  for (const q of D.quests) {
    q.giverId = Object.keys(D.npcs).find((id) => D.npcs[id].name === q.giver);
    q.guidance = q.steps.map(([event]) => routes[event]);
  }
  const npcPoints = {
    nave: { father: [57, 69], sister: [35, 74] },
    classroom: { sister: [18, 86], child: [78, 88] },
    office: { father: [44, 94], volunteer: [23, 86] },
    garden: { gardener: [10, 79], anna: [88, 82] },
    christmas: { lucia: [70, 83], child: [61, 87] },
  };
  const bounds = {
    courtyard: [8, 62, 92, 94],
    nave: [8, 68, 92, 94],
    garden: [8, 76, 92, 97],
    christmas: [8, 67, 92, 96],
  };
  const blockers = {
    courtyard: [
      [8, 86, 30, 94],
      [73, 87, 92, 94],
      [45, 80, 55, 89],
    ],
    nave: [
      [8, 68, 23, 72],
      [8, 76, 25, 80],
      [8, 84, 27, 88],
      [8, 92, 29, 96],
      [85, 68, 92, 72],
      [84, 76, 92, 80],
      [83, 84, 92, 88],
      [82, 92, 92, 96],
    ],
    classroom: [
      [15, 72, 36, 85],
      [40, 78, 62, 91],
      [65, 72, 85, 85],
    ],
    office: [[25, 68, 76, 89]],
    baptistry: [[38, 69, 62, 86]],
    confession: [[44, 75, 56, 82]],
    shoproom: [[25, 68, 75, 90]],
    choir: [
      [18, 72, 25, 93],
      [38, 72, 45, 93],
      [58, 72, 65, 93],
      [78, 72, 85, 93],
    ],
    garden: [
      [14, 81, 37, 96],
      [39, 81, 62, 96],
      [64, 81, 87, 96],
    ],
  };
  // Deliberate approach positions keep actors off tables, the font and sanctuary.
  const anchors = {
    courtyard: {
      church: [50, 65],
      classroom: [24, 66],
      office: [80, 66],
      garden: [29, 78],
      christmas: [79, 78],
    },
    nave: {
      altar: [51, 68],
      seat_a: [27, 70],
      seat_b: [81, 78],
      baptistry: [15, 74],
      confession: [85, 74],
      choir: [30, 82],
    },
    baptistry: { font: [50, 89], quiz_baptism: [74, 86] },
    classroom: { book: [12, 86], quiz_class: [66, 92] },
    office: { pack: [78, 91] },
    confession: { reconcile: [59, 84] },
    christmas: { star: [30, 72], tree: [36, 81], gifts: [46, 87] },
    shoproom: { browse: [78, 91] },
    choir: { rhythm: [52, 91] },
  };
  for (const [id, sc] of Object.entries(D.scenes)) {
    sc.bounds = bounds[id] || [8, 68, 92, 96];
    sc.blockers = blockers[id] || [];
    sc.anchors = anchors[id] || {};
    sc.npcPoints = Object.fromEntries(
      sc.npc.map((n) => [
        n,
        npcPoints[id]?.[n] || [D.npcs[n].x, Math.max(sc.bounds[1] + 2, D.npcs[n].y)],
      ]),
    );
  }
  // Align Noel interactions with the tree and gift area in the SVG.
  for (const spot of D.scenes.christmas.spots) {
    const positions = { star: [29, 49], tree: [29, 72], gifts: [46, 85] };
    if (positions[spot[0]]) [spot[3], spot[4]] = positions[spot[0]];
  }
  // Eight visible rows, three local seat choices per row. Original IDs remain valid.
  D.scenes.nave.spots = D.scenes.nave.spots.filter((s) => s[5] !== 'seat');
  for (let row = 0; row < 4; row++)
    for (const side of ['left', 'right']) {
      const id =
        row === 0 && side === 'left'
          ? 'seat_a'
          : row === 1 && side === 'right'
            ? 'seat_b'
            : `seat_${side}_${row}`;
      const x = side === 'left' ? 18 : 89,
        y = 71 + row * 7.6;
      D.scenes.nave.spots.push([
        id,
        '🪑',
        `Hàng ghế ${side === 'left' ? 'trái' : 'phải'} ${row + 1}`,
        x,
        y,
        'seat',
      ]);
      D.scenes.nave.anchors[id] = [side === 'left' ? 31 : 78, Math.min(94, y + 2)];
    }
  for (const a of window.PARISH_ACTIVITIES) {
    const hub = D.scenes[a.scene].spots.find((s) => s[5] === 'activity_hub');
    a.anchor =
      a.scene === 'nave'
        ? [a.id === 'pew_clean' ? 31 : 73, 83]
        : a.scene === 'garden'
          ? [50, 78]
          : a.scene === 'classroom'
            ? [66, 92]
            : a.scene === 'office'
              ? [78, 91]
              : a.scene === 'choir'
                ? [52, 91]
                : [hub[3], hub[4]];
  }
  window.PARISH_GAMEPLAY = { routes };
})();
