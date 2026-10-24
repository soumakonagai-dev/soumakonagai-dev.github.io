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
  if (PERF.lite && lastT && now - lastT < 28) { requestAnimationFrame(frame); return; }   // かんたん表示は30fpsまで（熱とカクつきをおさえる）
  const dt = clamp((now - lastT) / 1000 || 0.016, 0, 0.05); lastT = now;
  APP.t += dt; ART.t = APP.t; if (typeof perfWatch === 'function') perfWatch(dt);
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
  } catch (err) { frameError(err); }
  requestAnimationFrame(frame);
}
window.addEventListener('load', () => {
  try { APP.autoSkip = localStorage.getItem('mamori-auto') === '1'; } catch (e) { }
  APP.cv = document.getElementById('c'); APP.save = loadSave();
  if (APP.save.form.length !== 5 || APP.save.form.some(k => !UNITS[k] || !isUnlocked(k))) APP.save.form = ['sword', 'archer', 'mage', 'ice', 'siren'];
  APP.diff = APP.save.lastDiff != null ? clamp(APP.save.lastDiff, 0, DIFFS.length - 1) : DEFAULT_DIFF; APP.mapPage = 0; APP.fpage = 0; APP.cpage = 0;
  setLayout(pickPortrait()); setupInput(); go('title');
  const q = new URLSearchParams(location.search);
  if (q.get('diff') != null) APP.diff = clamp(+q.get('diff') || 0, 0, DIFFS.length - 1);
  if (q.get('stage') != null) { APP.stage = +q.get('stage') || 0; if (q.get('form')) APP.save.form = q.get('form').split(','); startBattle(); }
  requestAnimationFrame(frame);
});

// ===== 画面をつけたままにする（放置しても暗くならない・消えない） =====
let wakeLock = null;
async function wakeOn() {
  try { if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return; wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (e) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wakeOn(); });
for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, wakeOn, { passive: true });
wakeOn();

// ===== かんたん表示の切りかえと、重いときの自動切りかえ =====
function perfSet(lite, auto) {
  PERF.lite = lite; if (!auto) { PERF.auto = false; try { localStorage.setItem('mamori-q', lite ? 'lite' : 'full'); } catch (e) { } }
  if (lite) fxSetOn(false);
  FRAMES = lite ? 6 : 16; ART.bgKey = ''; for (const k in SPR_CACHE) delete SPR_CACHE[k]; try { fitCanvas(); } catch (e) { }
  toast(lite ? 'かんたん表示（かるい）' : 'きれい表示');
}
let perfEma = 16;
function perfWatch(dt) {
  perfEma = perfEma * 0.95 + dt * 1000 * 0.05;
  if (!PERF.auto || PERF.lite || APP.screen !== 'battle') { PERF.slow = 0; return; }
  if (perfEma > 26) PERF.slow += dt; else PERF.slow = Math.max(0, PERF.slow - dt);
  if (PERF.slow > 4) { PERF.slow = 0; perfSet(true, true); toast('おもいので、かんたん表示にしました'); }
}

// ===== エラーが起きても、コードを画面に出さない（?debug=1 のときだけ表示）。続けて起きたら自動で立て直す =====
const ERRS = { n: 0, t0: 0, last: '' };
function frameError(err) {
  const txt = String(err && err.stack || err); ERRS.last = txt; console.error(err);
  try { localStorage.setItem('mamori-lasterr', txt.slice(0, 600)); } catch (e) { }
  const d = document.getElementById('err');
  if (d && typeof DEBUG !== 'undefined' && DEBUG.on) { d.style.display = 'block'; d.textContent = txt; }
  const now = performance.now(); if (now - ERRS.t0 > 2000) { ERRS.t0 = now; ERRS.n = 0; } ERRS.n++;
  if (ERRS.n === 1) { try { toast('ちょっと調子がわるいみたい…'); } catch (e) { } }
  if (ERRS.n > 20) {   // ずっと失敗するときは、軽い設定にしてタイトルへもどす
    ERRS.n = 0;
    try { if (!PERF.lite) perfSet(true, true); bgmIntensity(0); go('title'); } catch (e) { }
  }
}
window.addEventListener('error', e => { try { localStorage.setItem('mamori-lasterr', String(e.message || e).slice(0, 600)); } catch (x) { } });
window.addEventListener('unhandledrejection', e => { try { localStorage.setItem('mamori-lasterr', String(e.reason && e.reason.stack || e.reason).slice(0, 600)); } catch (x) { } });
