(async () => {
  await window.PARISH_ONLINE.init();
  if (
    new URLSearchParams(location.search).get('debugScene') === '1' &&
    window.PARISH_ONLINE.user?.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))
  ) {
    const debug = document.createElement('script');
    debug.src = '/admin/scene-debug.js';
    document.body.append(debug);
  }
  const script = document.createElement('script');
  script.src = 'src/game.js';
  document.body.append(script);
})().catch(() => {
  document.getElementById('hint').textContent = 'Không tải được game. Vui lòng tải lại.';
});
