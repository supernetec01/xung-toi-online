/* Shared atlas contract. Pure validation is used by both CMS and the renderer. */
(function (root) {
  const directions = ['up', 'down', 'left', 'right'];
  const poses = [
    'idle',
    'walk',
    'sit',
    'stand',
    'kneel',
    'genuflect',
    'bow',
    'sign_cross',
    'pray',
    'wave',
    'sweep',
    'water',
    'wipe',
    'sing',
    'read',
    'decorate',
    'carry',
  ];
  function validate(item) {
    const errors = [],
      rigs = item.rigCompatibility || ['male', 'female'];
    if (!Array.isArray(rigs) || !rigs.length || rigs.some((g) => !['male', 'female'].includes(g)))
      return ['Invalid rig compatibility'];
    if (!item.assets) return errors;
    if (!Number.isInteger(item.spriteVersion) || item.spriteVersion < 1)
      errors.push('spriteVersion required');
    for (const gender of rigs) {
      const atlas = item.assets[gender];
      if (
        !atlas ||
        !/^\/uploads\/[a-f0-9]{64}\.webp$/.test(atlas.url || '') ||
        atlas.frameWidth !== 120 ||
        atlas.frameHeight !== 185 ||
        !Number.isInteger(atlas.width) ||
        !Number.isInteger(atlas.height) ||
        atlas.width < 120 ||
        atlas.height < 185 ||
        atlas.width > 2048 ||
        atlas.height > 2048 ||
        atlas.width % 120 ||
        atlas.height % 185
      ) {
        errors.push('Invalid atlas dimensions or URL');
        continue;
      }
      const count = (atlas.width / 120) * (atlas.height / 185);
      for (const pose of poses)
        for (const direction of directions) {
          const frames = atlas.poses?.[pose]?.[direction];
          if (
            !Array.isArray(frames) ||
            frames.length < 1 ||
            frames.length > 2 ||
            frames.some((n) => !Number.isInteger(n) || n < 0 || n >= count)
          )
            errors.push('Missing/invalid atlas pose or direction');
        }
    }
    return [...new Set(errors)];
  }
  function frames(layers, pose, direction) {
    return (Array.isArray(layers) ? layers : [])
      .filter(
        (a) =>
          a &&
          /^\/uploads\/[a-f0-9]{64}\.webp$/.test(a.url || '') &&
          Number.isInteger(a.width) &&
          Number.isInteger(a.height),
      )
      .map((a) => ({
        url: a.url,
        width: a.width,
        height: a.height,
        frames: a.poses?.[pose]?.[direction] || [],
      }))
      .filter((a) => a.frames.length && a.frames.length <= 2 && a.frames.every(Number.isInteger));
  }
  const api = { directions, poses, validate, frames };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PARISH_WARDROBE = api;
})(typeof window !== 'undefined' ? window : globalThis);
