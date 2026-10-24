'use strict';
// ===== 起動・メインループ =====
let lastT = 0;
function updateBattle(dt) {
  const B = APP.b;
  if (!B.paused && !G.over) {
    B.acc += dt * B.speed; let n = 0;
    while (B.acc >= 1 / 60 && n < 14) { step(1 / 60); B.acc -= 1 / 60; n++; }
    if (n >= 14) B.acc = 0;
    fxUpdate(dt * Math.min(B.speed, 2));
    bgmIntensity(G.phase === 'run' ? 1 : 0);
  } else if (!B.paused) fxUpdate(dt);
  if (G.over && !B.overFx) {
    B.overFx = true; bgmIntensity(0);
    FX.banner(G.over === 'win' ? 'VICTORY！！' : 'DEFEAT…'); if (G.over === 'lose') SFX.play('lose');
  }
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
  APP.t += dt; ART.t = APP.t;
  const c = APP.c; c.setTransform(ART.sc, 0, 0, ART.sc, 0, 0); c.clearRect(0, 0, APP.L.W, APP.L.H);
  APP.btns.length = 0;
  try {
    if (AUD.ctx && !AUD.timer && !AUD.muted) bgmStart(APP.screen === 'battle' ? STAGES[APP.stage].theme : 'meadow');
    switch (APP.screen) {
      case 'title': drawTitle(c, dt); break;
      case 'map': drawMap(c, dt); break;
      case 'formation': drawFormation(c, dt); break;
      case 'gacha': drawGacha(c, dt); break;
      case 'collection': drawCollection(c, dt); break;
      case 'battle': updateBattle(dt); drawBattle(c, dt); break;
    }
    if (APP.screen !== 'battle' && APP.toast) { const tt = APP.toast; tt.t += dt; if (tt.t > 1.8) APP.toast = null; else { const L = APP.L, w = 360; panelBox(c, (L.W - w) / 2, L.H - 90, w, 38, { r: 19, fill: 'rgba(60,20,70,.92)', shine: false }); txt(c, tt.s, L.W / 2, L.H - 65, 14, '#fff', 'center', { outline: false }); } }
    if (typeof drawDebug === 'function') drawDebug(c, dt);
    APP.fadeT += dt; if (APP.fadeT < 0.35) { c.fillStyle = `rgba(10,6,40,${1 - APP.fadeT / 0.35})`; c.fillRect(0, 0, APP.L.W, APP.L.H); }
  } catch (err) { console.error(err); const d = document.getElementById('err'); if (d) { d.style.display = 'block'; d.textContent = String(err && err.stack || err); } }
  requestAnimationFrame(frame);
}
window.addEventListener('load', () => {
  APP.cv = document.getElementById('c'); APP.save = loadSave();
  if (APP.save.form.length !== 5 || APP.save.form.some(k => !UNITS[k] || !isUnlocked(k))) APP.save.form = ['sword', 'archer', 'mage', 'ice', 'siren'];
  APP.diff = APP.save.lastDiff != null ? clamp(APP.save.lastDiff, 0, DIFFS.length - 1) : DEFAULT_DIFF; APP.mapPage = 0; APP.fpage = 0; APP.cpage = 0;
  setLayout(pickPortrait()); setupInput(); go('title');
  const q = new URLSearchParams(location.search);
  if (q.get('diff') != null) APP.diff = clamp(+q.get('diff') || 0, 0, DIFFS.length - 1);
  if (q.get('stage') != null) { APP.stage = +q.get('stage') || 0; if (q.get('form')) APP.save.form = q.get('form').split(','); startBattle(); }
  requestAnimationFrame(frame);
});
