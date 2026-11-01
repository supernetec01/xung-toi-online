(async () => {
  await window.PARISH_ONLINE.init();
  const script = document.createElement('script');
  script.src = 'src/game.js';
  document.body.append(script);
})().catch(() => {
  document.getElementById('hint').textContent = 'Không tải được game. Vui lòng tải lại.';
});
