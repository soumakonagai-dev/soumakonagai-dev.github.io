'use strict';
// canvas の save/restore の深さを数える（描画の途中でエラーが起きても、あとで元にもどせるように）
(function () { if (typeof CanvasRenderingContext2D === 'undefined') return; const P = CanvasRenderingContext2D.prototype, sv = P.save, rs = P.restore; P.save = function () { this.__d = (this.__d || 0) + 1; return sv.call(this); }; P.restore = function () { if (this.__d > 0) this.__d--; return rs.call(this); }; })();
// ===== 起動・メインループ =====
let lastT = 0;
function updateBattle(dt) {
  const B = APP.b;
  if (!B.paused && !G.over) {
    B.acc += dt * B.speed; let n = 0;
    while (B.acc >= 1 / 60 && n < 14) { try { step(1 / 60); } catch (e) { simError(e); B.acc = 0; break; } B.acc -= 1 / 60; n++; }
    if (n >= 14) B.acc = 0;
    try { fxUpdate(dt * Math.min(B.speed, 2)); } catch (e) { simError(e); try { fxClear(); } catch (x) { } }
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
  const c = APP.c; { let g = 0; while (c.__d > 0 && g++ < 200) c.restore(); }   // 前のコマで閉じ忘れた状態を元にもどす
  c.setTransform(ART.sc, 0, 0, ART.sc, 0, 0); c.clearRect(0, 0, APP.L.W, APP.L.H);
  APP.btns.length = 0;
  try {
    if (AUD.ctx && !AUD.timer && !AUD.muted) bgmStart(APP.screen === 'battle' ? STAGES[APP.stage].theme : 'meadow');
    switch (APP.screen) {
      case 'title': drawTitle(c, dt); break;
      case 'map': drawMap(c, dt); break;
      case 'formation': drawFormation(c, dt); break;
      case 'gacha': drawGacha(c, dt); break;
      case 'collection': drawCollection(c, dt); break;
      case 'event': drawEvent(c, dt); break;
      case 'battle': try { updateBattle(dt); } catch (e) { simError(e); } drawBattle(c, dt); break;
    }
    if (APP.screen !== 'battle' && APP.toast) { const tt = APP.toast; tt.t += dt; if (tt.t > 1.8) APP.toast = null; else { const L = APP.L, w = 360; panelBox(c, (L.W - w) / 2, L.H - 90, w, 38, { r: 19, fill: 'rgba(60,20,70,.92)', shine: false }); txt(c, tt.s, L.W / 2, L.H - 65, 14, '#fff', 'center', { outline: false }); } }
    if (typeof drawDebug === 'function') drawDebug(c, dt);
    APP.fadeT += dt; if (APP.fadeT < 0.35) { c.fillStyle = `rgba(10,6,40,${1 - APP.fadeT / 0.35})`; c.fillRect(0, 0, APP.L.W, APP.L.H); }
  } catch (err) { frameError(err); }
  requestAnimationFrame(frame);
}
window.addEventListener('load', () => {
  try { APP.autoSkip = localStorage.getItem('mamori-auto') === '1'; APP.sortMode = localStorage.getItem('mamori-sort') || 'no'; } catch (e) { }
  APP.cv = document.getElementById('c'); APP.save = loadSave();
  if (APP.save.form.length !== 5 || APP.save.form.some(k => !UNITS[k] || !isUnlocked(k))) APP.save.form = ['sword', 'archer', 'mage', 'ice', 'siren'];
  APP.diff = APP.save.lastDiff != null ? clamp(APP.save.lastDiff, 0, DIFFS.length - 1) : DEFAULT_DIFF; APP.mapPage = 0; APP.fpage = 0; APP.cpage = 0;
  setLayout(pickPortrait()); setupInput(); go('title');
  const q = new URLSearchParams(location.search);
  if (q.get('month') != null) EVENT_MONTH_DEBUG = clamp(+q.get('month') || 0, 0, 12); if (q.get('half') != null) EVENT_HALF_DEBUG = clamp(+q.get('half') || 0, 0, 2);
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
  FRAMES = lite ? 6 : 16; ART.bgKey = ''; sprClearAll(); try { fitCanvas(); } catch (e) { }
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
  try { const c = APP.c; let g = 0; while (c && c.__d > 0 && g++ < 200) c.restore(); if (c) c.setTransform(ART.sc, 0, 0, ART.sc, 0, 0); } catch (e) { }   // 描画の途中で止まっても、はみ出し制限（クリップ）が残らないようにする
  try { localStorage.setItem('mamori-lasterr', txt.slice(0, 600)); } catch (e) { }
  const d = document.getElementById('err');
  if (d && typeof DEBUG !== 'undefined' && DEBUG.on) { d.style.display = 'block'; d.textContent = txt; }
  const now = performance.now(); if (now - ERRS.t0 > 2000) { ERRS.t0 = now; ERRS.n = 0; } ERRS.n++;
  if (ERRS.n === 1) { try { toast('ちょっと調子がわるいみたい…'); } catch (e) { } }
  if (ERRS.n === 3) { try { sprClearAll(); ART.bgKey = ''; } catch (e) { } }   // 絵のメモリがあふれていたときの自己修復
  if (ERRS.n > 20) {   // ずっと失敗するときは、軽い設定にする（タイトルにはもどさない）
    ERRS.n = 0;
    try { if (!PERF.lite) perfSet(true, true); } catch (e) { }
  }
}
window.addEventListener('error', e => { try { localStorage.setItem('mamori-lasterr', String(e.message || e).slice(0, 600)); } catch (x) { } });
window.addEventListener('unhandledrejection', e => { try { localStorage.setItem('mamori-lasterr', String(e.reason && e.reason.stack || e.reason).slice(0, 600)); } catch (x) { } });

// ===== 新しい版が公開されたら、自動で入れかえる（古い版が残って直したはずの不具合が出るのを防ぐ） =====
const CUR_VER = (document.querySelector('meta[name=app-version]') || {}).content || 'dev';
let needReload = false;
async function checkVersion() {
  if (CUR_VER === 'dev') return;
  try {
    const r = await fetch(location.pathname + '?_=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const m = (await r.text()).match(/name="app-version" content="([0-9a-f]+)"/);
    if (m && m[1] !== CUR_VER) { needReload = true; if (APP.screen !== 'battle') location.reload(); else toast('新しい版があります（バトルが終わると自動で更新）'); }
  } catch (e) { }
}
setTimeout(checkVersion, 4000); setInterval(checkVersion, 120000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(() => { if (needReload && APP.screen !== 'battle') location.reload(); }, 3000);

// ===== ゲームの計算でエラーが出ても止めない：おかしなデータ（座標がNaNなど）をそうじして、続ける =====
let simErrN = 0;
function simError(e) {
  simErrN++; const msg = String(e && e.message || e); ERRS.last = 'sim: ' + String(e && e.stack || e);
  try { localStorage.setItem('mamori-lasterr', 'sim: ' + msg + ' | ' + String(e && e.stack || '').split('\n').slice(1, 3).join(' ').slice(0, 300)); } catch (x) { }
  if (simErrN === 1) { console.error(e); try { toast('ちょっと調子がわるいみたい（計算）'); } catch (x) { } }
  try {
    const ok = o => o && Number.isFinite(o.x) && Number.isFinite(o.y);
    G.enemies = G.enemies.filter(o => ok(o) && Number.isFinite(o.hp) && Number.isFinite(o.d));
    G.units = G.units.filter(o => ok(o)); G.projs = G.projs.filter(o => ok(o) && (!o.tgt || ok(o.tgt)));
    if (G.grounds) G.grounds = G.grounds.filter(o => ok(o)); if (G.timers) G.timers = G.timers.filter(o => o && typeof o.fn === 'function');
    if (APP.b) { APP.b.sel = G.units.includes(APP.b.sel) ? APP.b.sel : null; APP.b.dragU = null; }
  } catch (x) { }
}
