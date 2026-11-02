/* V8 scene manifest: percentages are world coordinates, never viewport pixels.
 * A prop's solid footprint and depth anchor travel with its artwork. Shared by
 * browser, catalog seed and the additive publication migration. Stable V4 IDs stay intact. */
(function (root) {
  'use strict';
  const D = root.PARISH_DATA;
  const prop = (id, sprite, x, y, w, h, solid = null, depth = y) => ({
    id,
    sprite,
    x,
    y,
    w,
    h,
    solid,
    depth,
  });
  const rooms = {
    courtyard: {
      theme: 'v12',
      bounds: [4, 60, 96, 97],
      horizon: 0.58,
      props: [
        prop('flowerbed_left', 'flowerbed', 17, 93, 32, 27, [4, 83, 31, 95]),
        prop('flowerbed_right', 'flowerbed', 83, 93, 32, 27, [69, 83, 96, 95]),
        prop('noticeboard', 'noticeboard', 79, 74, 18, 31, [72, 65, 87, 75]),
        prop('bench', 'bench', 16, 74, 20, 18, [8, 69, 25, 75]),
        prop('flowers_left', 'planter', 34, 64, 9, 16, [31, 60, 37, 65]),
        prop('flowers_right', 'planter', 66, 64, 9, 16, [63, 60, 69, 65]),
      ],
      points: {
        church: [50, 48],
        classroom: [17, 53],
        office: [83, 52],
        garden: [18, 80],
        christmas: [82, 80],
        action_hub_courtyard: [50, 80],
        parish_notice: [79, 64],
      },
      anchors: {
        church: [50, 63],
        classroom: [27, 65],
        office: [71, 62],
        garden: [35, 80],
        christmas: [66, 80],
        action_hub_courtyard: [50, 80],
        parish_notice: [68, 74],
      },
      npcPoints: { lucia: [43, 69], guard: [59, 68] },
      entry: [50, 89],
      extraSpots: [['parish_notice', '📋', 'Bảng tin giáo xứ', 79, 64, 'info', 'parish_notice']],
    },
    classroom: {
      theme: 'v12',
      bounds: [4, 60, 96, 97],
      horizon: 0.58,
      props: [
        prop('desk_left_back', 'desk', 24, 80, 23, 23, [15, 73, 33, 81]),
        prop('desk_right_back', 'desk', 76, 80, 23, 23, [67, 73, 85, 81]),
        prop('desk_left_front', 'desk', 22, 95, 28, 27, [10, 87, 34, 96]),
        prop('desk_right_front', 'desk', 78, 95, 28, 27, [66, 87, 90, 96]),
        prop('teacher_desk', 'desk', 50, 66, 21, 20, [42, 60, 58, 67]),
        prop('bookcase', 'bookcase', 14, 67, 15, 33, [8, 60, 21, 68]),
        prop('noticeboard', 'noticeboard', 82, 67, 14, 27, [76, 60, 88, 68]),
      ],
      points: {
        book: [14, 57],
        quiz_class: [82, 56],
        back: [50, 95],
        action_hub_classroom: [58, 83],
        lesson_class: [50, 79],
      },
      anchors: {
        book: [26, 68],
        quiz_class: [71, 70],
        back: [50, 94],
        action_hub_classroom: [58, 83],
        lesson_class: [50, 80],
      },
      npcPoints: { sister: [50, 71], child: [62, 78] },
      entry: [50, 92],
      extraSpots: [['lesson_class', '📚', 'Ba câu hỏi nhỏ', 50, 79, 'lesson', 'class_basics']],
    },
    baptistry: {
      theme: 'v12',
      horizon: 0.58,
      props: [
        prop('font', 'font', 50, 80, 33, 35, [37, 68, 63, 81]),
        prop('noticeboard', 'noticeboard', 19, 79, 17, 30, [12, 70, 26, 80]),
        prop('learning_board', 'noticeboard', 81, 80, 17, 30, [74, 71, 88, 81]),
        prop('flowers_left', 'planter', 31, 67, 8, 17, [28, 61, 34, 68]),
        prop('flowers_right', 'planter', 69, 67, 8, 17, [66, 61, 72, 68]),
        prop('bench_left', 'bench', 15, 95, 23, 20, [5, 90, 25, 96]),
        prop('bench_right', 'bench', 85, 95, 23, 20, [75, 90, 95, 96]),
      ],
      points: { font: [50, 66], quiz_baptism: [81, 67], back: [50, 95], baptism_info: [19, 65] },
      anchors: { font: [50, 85], quiz_baptism: [70, 82], back: [50, 94], baptism_info: [30, 80] },
      npcPoints: { catechist: [69, 86] },
      entry: [50, 91],
      extraSpots: [['baptism_info', '📖', 'Ý nghĩa nước và ánh sáng', 19, 65, 'learn', 'baptism']],
    },
    confession: {
      theme: 'v12',
      horizon: 0.58,
      props: [
        prop('confessional', 'confessional', 52, 80, 43, 43, [33, 65, 71, 81]),
        prop('noticeboard', 'noticeboard', 19, 79, 15, 29, [13, 70, 25, 80]),
        prop('bench', 'bench', 84, 88, 22, 20, [75, 82, 94, 89]),
        prop('flowers', 'planter', 12, 65, 8, 18, [9, 60, 15, 66]),
        prop('quiet_corner', 'bench', 18, 95, 18, 16, [10, 90, 26, 96]),
      ],
      points: { reconcile: [52, 59], back: [50, 95], reflection: [19, 66], quiet_prayer: [19, 88] },
      anchors: {
        reconcile: [52, 85],
        back: [50, 94],
        reflection: [29, 80],
        quiet_prayer: [30, 91],
      },
      npcPoints: { sister: [70, 87] },
      npc: ['sister'],
      entry: [50, 91],
      extraSpots: [
        ['reflection', '📖', 'Hướng dẫn xét mình', 19, 66, 'info', 'reflection'],
        ['quiet_prayer', '🕯️', 'Góc thinh lặng', 19, 88, 'info', 'quiet_prayer'],
      ],
    },
    christmas: {
      tile: 6,
      theme: 'christmas-night',
      horizon: 0.58,
      props: [
        prop('market_left', 'stall', 15, 60, 20, 24, [7, 55, 24, 61]),
        prop('market_right', 'stall', 85, 60, 20, 24, [76, 55, 93, 61]),
        prop('tree', 'tree', 23, 77, 25, 48, [14, 70, 32, 78]),
        prop('nativity', 'nativity', 78, 77, 29, 37, [66, 68, 90, 78]),
        prop('gifts', 'gifts', 26, 88, 15, 17, [20, 83, 32, 89]),
        prop('lantern_left', 'lantern', 8, 88, 5, 31, [6, 85, 10, 89]),
        prop('lantern_right', 'lantern', 94, 88, 5, 31, [92, 85, 96, 89]),
      ],
      points: {
        star: [78, 42],
        tree: [23, 62],
        gifts: [29, 81],
        back: [50, 95],
        action_hub_christmas: [58, 82],
      },
      anchors: {
        star: [63, 76],
        tree: [36, 76],
        gifts: [36, 86],
        back: [50, 95],
        action_hub_christmas: [58, 82],
      },
      npcPoints: { lucia: [63, 83], child: [43, 69] },
      entry: [50, 88],
    },
    nave: {
      tile: 0,
      horizon: 0.76,
      props: [
        prop('lilies_left', 3, 36, 58, 9, 16, [32, 54, 40, 59]),
        prop('lilies_right', 3, 64, 58, 9, 16, [60, 54, 68, 59]),
        prop('column_left', 2, 3, 96, 9, 66, [0, 87, 7, 98]),
        prop('column_right', 2, 97, 96, 9, 66, [93, 87, 100, 98]),
      ],
      points: {
        altar: [50, 55],
        baptistry: [14, 63],
        confession: [86, 63],
        choir: [12, 81],
        exit: [50, 94],
        action_hub_nave: [58, 79],
      },
      anchors: {
        altar: [50, 58],
        baptistry: [14, 63],
        confession: [86, 63],
        choir: [12, 77],
        exit: [50, 94],
        action_hub_nave: [54, 79],
      },
      npcPoints: { father: [54, 58], sister: [45, 59] },
      entry: [50, 92],
    },
    foyer: {
      tile: 1,
      horizon: 0.8,
      props: [
        prop('font', 11, 19, 80, 16, 26, [13, 74, 25, 81]),
        prop('reception', 12, 80, 81, 28, 24, [67, 72, 93, 82]),
        prop('lilies', 3, 10, 64, 9, 15, [7, 60, 13, 65]),
      ],
      points: { schedule: [79, 67], inside: [50, 59], out: [50, 94] },
      anchors: { schedule: [63, 79], inside: [50, 63], out: [50, 94] },
      npcPoints: { guard: [59, 75] },
    },
    choir: {
      tile: 2,
      horizon: 0.73,
      props: [
        prop('piano', 4, 19, 74, 29, 34, [6, 66, 32, 75]),
        prop('books', 6, 82, 68, 19, 34, [74, 61, 91, 69]),
        ...[42, 52, 62].map((x, i) => prop('stand_' + i, 5, x, 71, 8, 20, [x - 3, 67, x + 3, 72])),
        prop('chair_left', 14, 17, 95, 16, 24, [11, 89, 23, 96]),
        prop('chair_right', 14, 83, 95, 16, 24, [77, 89, 89, 96]),
      ],
      points: { rhythm: [52, 61], back: [50, 94], action_hub_choir: [64, 81] },
      anchors: { rhythm: [52, 77], back: [50, 94], action_hub_choir: [64, 81] },
      npcPoints: { choirmaster: [35, 79] },
    },
    garden: {
      tile: 3,
      horizon: 0.72,
      props: [
        prop('bed_left', 10, 20, 92, 36, 27, [4, 77, 36, 94]),
        prop('bed_right', 10, 81, 92, 36, 27, [65, 77, 97, 94]),
        prop('bed_back', 10, 50, 62, 26, 19, [38, 54, 62, 64]),
        prop('lantern_left', 15, 9, 72, 9, 22, [6, 67, 12, 73]),
        prop('lantern_right', 15, 91, 72, 9, 22, [88, 67, 94, 73]),
      ],
      points: {
        flower1: [23, 75],
        flower2: [50, 55],
        flower3: [78, 75],
        back: [50, 95],
        action_hub_garden: [43, 88],
      },
      anchors: {
        flower1: [38, 83],
        flower2: [50, 68],
        flower3: [63, 83],
        back: [50, 95],
        action_hub_garden: [43, 88],
      },
      npcPoints: { gardener: [30, 71], anna: [70, 71] },
    },
    office: {
      tile: 4,
      horizon: 0.73,
      props: [
        prop('desk', 7, 49, 72, 32, 27, [35, 63, 63, 73]),
        prop('shelf_left', 6, 22, 64, 19, 34, [14, 57, 30, 65]),
        prop('shelf_right', 6, 79, 64, 19, 34, [71, 57, 87, 65]),
        prop('gifts', 13, 81, 84, 24, 22, [71, 77, 92, 85]),
        prop('chair', 14, 18, 95, 14, 23, [12, 90, 24, 96]),
      ],
      points: { pack: [81, 71], back: [50, 95], action_hub_office: [61, 85] },
      anchors: { pack: [66, 84], back: [50, 95], action_hub_office: [61, 85] },
      npcPoints: { father: [50, 78], volunteer: [66, 87] },
    },
    shoproom: {
      tile: 5,
      horizon: 0.72,
      props: [
        prop('rack_left', 8, 19, 75, 25, 35, [9, 67, 29, 76]),
        prop('rack_right', 8, 80, 73, 23, 33, [70, 66, 90, 74]),
        prop('mirror', 9, 78, 94, 16, 33, [73, 88, 83, 95]),
        prop('counter', 12, 49, 75, 26, 20, [37, 68, 61, 76]),
      ],
      points: { browse: [49, 65], back: [50, 95] },
      anchors: { browse: [49, 81], back: [50, 95] },
      npcPoints: { shopkeeper: [31, 82] },
    },
  };
  const nave = rooms.nave;
  nave.theme = 'v12';
  for (const p of nave.props)
    if (p.id.startsWith('lilies')) {
      p.sprite = 'planter';
      p.y = 57;
      p.depth = 57;
      p.solid[3] = 57;
    }
  const seats = {};
  for (let row = 0; row < 4; row++)
    for (const side of ['left', 'right']) {
      const id =
        row === 0 && side === 'left'
          ? 'seat_a'
          : row === 1 && side === 'right'
            ? 'seat_b'
            : `seat_${side}_${row}`;
      // Adapt V9's 1672×941 geometry to the existing V4 percentage floor.
      const rows = [
        { y: 476, left: [417, 712], right: [960, 1255], h: 44 },
        { y: 548, left: [334, 682], right: [990, 1338], h: 51 },
        { y: 634, left: [238, 648], right: [1024, 1434], h: 61 },
        { y: 750, left: [125, 600], right: [1072, 1547], h: 73 },
      ];
      const r = rows[row],
        [l, right] = r[side],
        width = right - l,
        X = (v) => (v / 1672) * 100,
        Y = (v) => 56 + ((v - 400) / 541) * 41;
      const p = prop(
        id,
        0,
        X((l + right) / 2),
        Y(r.y + r.h + 30),
        X(width + 30),
        ((r.h + 60) / 541) * 41,
        [X(l - 9), Y(r.y - 21), X(right + 9), Y(r.y + r.h + 27)],
        Y(r.y + 4),
      );
      p.bench = { x: l, y: r.y, w: width, h: r.h };
      nave.props.push(p);
      seats[id] = [0, 1, 2].map((i) => ({
        position: [X(l + ((i + 0.5) * width) / 3), Y(r.y + 4)],
        approach: [X(side === 'left' ? right + 34 : l - 34), Y(r.y + r.h * 0.4)],
        direction: 'up',
        pose: 'sit_back',
      }));
      nave.points[id] = [X((l + right) / 2), Y(r.y)];
      nave.anchors[id] = seats[id][0].approach;
    }
  for (const [id, layout] of Object.entries(rooms)) {
    const sc = D.scenes[id];
    sc.artVersion =
      layout.theme === 'v12'
        ? 'v12-layered-1'
        : id === 'christmas'
          ? 'christmas-night-1'
          : 'v8-layered-1';
    sc.art = { tile: layout.tile, horizon: layout.horizon, props: layout.props };
    if (layout.theme) sc.art.theme = layout.theme;
    if (layout.theme === 'v12') {
      sc.art.background = id;
      sc.contract = {
        version: 1,
        worldId: id === 'courtyard' ? 'parish-campus' : id,
        feet: [0.6, 0.35],
        camera: { mode: 'perspective2d', minScale: 0.64, maxScale: 1.12 },
      };
    }
    sc.bounds = layout.bounds || (id === 'christmas' ? [4, 58, 96, 97] : [4, 56, 96, 97]);
    sc.walkPolygons = [
      [
        [14, sc.bounds[1]],
        [86, sc.bounds[1]],
        [96, 97],
        [4, 97],
      ],
    ];
    sc.blockers = layout.props.filter((p) => p.solid).map((p) => p.solid);
    sc.anchors = { ...sc.anchors, ...layout.anchors };
    sc.npcPoints = { ...sc.npcPoints, ...layout.npcPoints };
    if (layout.npc) sc.npc = [...new Set([...sc.npc, ...layout.npc])];
    sc.entry = layout.entry || [50, 91];
    for (const spot of layout.extraSpots || [])
      if (!sc.spots.some((s) => s[0] === spot[0])) sc.spots.push(spot);
    for (const s of sc.spots) if (layout.points[s[0]]) [s[3], s[4]] = layout.points[s[0]];
    if (id === 'nave') sc.seats = seats;
  }
  // The map and original IDs continue to resolve to the same V4 services.
  D.scenes.courtyard.spots.find((s) => s[0] === 'church')[6] = 'foyer';
  D.scenes.nave.spots.find((s) => s[0] === 'exit')[6] = 'foyer';
  const actionPoints = {
    nave: [50, 63],
    garden: [50, 72],
    office: [64, 88],
    choir: [51, 79],
    shoproom: [49, 83],
    foyer: [50, 77],
    christmas: [58, 82],
    courtyard: [50, 80],
    classroom: [58, 83],
  };
  for (const a of root.PARISH_ACTIVITIES)
    if (actionPoints[a.scene]) a.anchor = [...actionPoints[a.scene]];
  root.PARISH_LAYOUT = { rooms, seat: (sc, id, choice) => sc.seats?.[id]?.[choice] };
})(typeof window === 'undefined' ? globalThis : window);
