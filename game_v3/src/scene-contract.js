/* One scene adapter/validator for the V4 catalog, V12 renderer and server CMS. */
(function (root) {
  'use strict';
  const aliases = {
    parish_yard: 'courtyard',
    church_main: 'nave',
    front_hall: 'foyer',
    catechism_class: 'classroom',
    choir_room: 'choir',
    community_garden: 'garden',
    rectory: 'office',
    wardrobe_room: 'shoproom',
    christmas_square: 'christmas',
    baptism_area: 'baptistry',
    reconciliation_corner: 'confession',
  };
  const outdoor = new Set(['courtyard', 'garden', 'christmas']);
  const backgrounds = ['courtyard', 'nave', 'classroom', 'baptistry', 'confession'];
  const sprites = [
    'desk',
    'font',
    'confessional',
    'noticeboard',
    'bookcase',
    'planter',
    'bench',
    'lectern',
  ];
  const point = (p) =>
    Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v) && v >= 0 && v <= 100);
  const rect = (p) =>
    Array.isArray(p) &&
    p.length === 4 &&
    point(p.slice(0, 2)) &&
    point(p.slice(2)) &&
    p[2] > p[0] &&
    p[3] > p[1];
  function describe(id, sc) {
    return {
      sceneId: id,
      schemaVersion: 1,
      worldId: sc.contract?.worldId || (outdoor.has(id) ? 'parish-campus' : id),
      zoneId: id,
      kind: outdoor.has(id) ? 'outdoor' : 'room',
      camera: sc.contract?.camera || { mode: 'perspective2d', minScale: 0.6, maxScale: 1.2 },
      feet: sc.contract?.feet || [0, 0],
      spawnPoints: [{ id: 'entry', position: sc.entry }],
      walkablePolygons: sc.walkPolygons || [
        [
          [sc.bounds[0], sc.bounds[1]],
          [sc.bounds[2], sc.bounds[1]],
          [sc.bounds[2], sc.bounds[3]],
          [sc.bounds[0], sc.bounds[3]],
        ],
      ],
      colliders: sc.blockers,
      entities: sc.art?.props || [],
      interactions: sc.spots.map((s) => ({
        id: s[0],
        type: s[5],
        position: [s[3], s[4]],
        accessPoint: sc.anchors?.[s[0]] || [s[3], s[4]],
      })),
      portals: sc.spots
        .filter((s) => s[5] === 'go')
        .map((s) => ({
          id: s[0],
          destinationSceneId: s[6],
          position: sc.anchors?.[s[0]] || [s[3], s[4]],
        })),
      seats: sc.seats || {},
      npcSpawns: sc.npcPoints || {},
    };
  }
  function validate(catalog, nav) {
    const errors = [];
    if (!catalog?.scenes || typeof catalog.scenes !== 'object') return ['Scene catalog missing'];
    for (const [id, sc] of Object.entries(catalog.scenes)) {
      const fail = (message) => errors.push(id + ': ' + message);
      if (
        !rect(sc.bounds) ||
        !point(sc.entry) ||
        !Array.isArray(sc.spots) ||
        !Array.isArray(sc.blockers)
      ) {
        fail('invalid floor/spawn/interaction shape');
        continue;
      }
      if (sc.contract?.version !== undefined && sc.contract.version !== 1)
        fail('unsupported scene contract');
      if (sc.contract?.feet && (!point(sc.contract.feet) || sc.contract.feet.some((v) => v > 1)))
        fail('invalid feet footprint');
      for (const b of sc.blockers) if (!rect(b)) fail('invalid collider');
      for (const poly of sc.walkPolygons || [])
        if (!Array.isArray(poly) || poly.length < 3 || poly.some((p) => !point(p)))
          fail('invalid walk polygon');
      const props = sc.art?.props || [],
        ids = new Set();
      for (const p of props) {
        if (
          !p ||
          !/^[a-z][a-z0-9_]{1,63}$/.test(p.id || '') ||
          ids.has(p.id) ||
          !point([p.x, p.y]) ||
          !point([p.w, p.h]) ||
          p.w <= 0 ||
          p.h <= 0 ||
          !Number.isFinite(p.depth) ||
          p.depth < 0 ||
          p.depth > 100 ||
          (p.solid && !rect(p.solid))
        )
          fail('invalid or duplicate prop');
        ids.add(p?.id);
        if (
          sc.art?.theme === 'v12' &&
          !p.bench &&
          typeof p.sprite !== 'number' &&
          !sprites.includes(p.sprite)
        )
          fail('unknown V12 sprite');
      }
      if (sc.art?.theme === 'v12' && !backgrounds.includes(sc.art.background))
        fail('unknown V12 background');
      const spotIds = new Set();
      for (const s of sc.spots) {
        if (
          !Array.isArray(s) ||
          !/^[a-z][a-z0-9_]{1,63}$/.test(s[0] || '') ||
          spotIds.has(s[0]) ||
          !point([s[3], s[4]])
        )
          fail('invalid or duplicate interaction');
        spotIds.add(s[0]);
        if (s[5] === 'go' && !catalog.scenes[s[6]]) fail('portal destination missing');
      }
      if (nav && sc.contract?.version === 1 && !errors.some((e) => e.startsWith(id + ':'))) {
        if (!nav.walkable(sc, ...sc.entry)) fail('spawn intersects collider');
        for (const [name, p] of Object.entries({ ...sc.anchors, ...sc.npcPoints }))
          if (!point(p) || !nav.walkable(sc, ...p) || !nav.route(sc, sc.entry, p).length)
            fail('unreachable anchor/spawn ' + name);
        for (const [name, seats] of Object.entries(sc.seats || {}))
          for (const seat of seats)
            if (
              !point(seat.position) ||
              !point(seat.approach) ||
              !nav.walkable(sc, ...seat.approach) ||
              seat.direction !== 'up' ||
              seat.pose !== 'sit_back'
            )
              fail('invalid seat ' + name);
      }
    }
    return [...new Set(errors)];
  }
  const api = { aliases, describe, validate, backgrounds, sprites };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PARISH_SCENE_CONTRACT = api;
})(typeof window !== 'undefined' ? window : globalThis);
