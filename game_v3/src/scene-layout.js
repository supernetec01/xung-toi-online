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
    sc.artVersion = 'v8-layered-1';
    sc.art = { tile: layout.tile, horizon: layout.horizon, props: layout.props };
    sc.bounds = [4, 56, 96, 97];
    sc.walkPolygons = [
      [
        [14, 56],
        [86, 56],
        [96, 97],
        [4, 97],
      ],
    ];
    sc.blockers = layout.props.filter((p) => p.solid).map((p) => p.solid);
    sc.anchors = { ...sc.anchors, ...layout.anchors };
    sc.npcPoints = { ...sc.npcPoints, ...layout.npcPoints };
    sc.entry = layout.entry || [50, 91];
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
  };
  for (const a of root.PARISH_ACTIVITIES)
    if (actionPoints[a.scene]) a.anchor = [...actionPoints[a.scene]];
  root.PARISH_LAYOUT = { rooms, seat: (sc, id, choice) => sc.seats?.[id]?.[choice] };
})(typeof window === 'undefined' ? globalThis : window);
