'use strict';
const W = 480, H = 720, RAD = Math.PI / 180;
const Q = new URLSearchParams(location.search);
const STAGE_SEC = Number(Q.get('sec')) || 240;   // 1 ステージ(道中)の秒数。?sec=40 で短縮

// ===== シード付き乱数（ゲーム進行用）/ 見た目用は Math.random =====
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rng = mulberry32(1);
const rnd = (a, b) => a + rng() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(rng() * arr.length)];
const vrnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function wpick(items) { // [[value, weight], ...]
  let sum = 0; for (const it of items) sum += it[1];
  let r = rng() * sum;
  for (const it of items) { r -= it[1]; if (r <= 0) return it[0]; }
  return items[items.length - 1][0];
}

// ===== 入力 =====
const keys = {}, pressed = {};
const mouse = { x: 0, y: 0, click: false, down: false, dx: 0, dy: 0, touch: false, follow: false };
addEventListener('keydown', e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
function bindPointer(cv) {
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  cv.addEventListener('pointerdown', e => {
    const [x, y] = pos(e); mouse.x = x; mouse.y = y; mouse.click = true; mouse.down = true;
    mouse.touch = e.pointerType === 'touch';
    if (e.button === 2) pressed.KeyX = true;   // 右クリック = ボム
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cv.addEventListener('pointermove', e => {
    const [x, y] = pos(e);
    if (e.pointerType === 'touch') { if (mouse.down) { mouse.dx += x - mouse.x; mouse.dy += y - mouse.y; } }
    mouse.x = x; mouse.y = y;
  });
  const up = () => { mouse.down = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// ===== セーブ =====
const SAVE_KEY = 'danmaku_rogue_v1';
function defaultSave() { return { core: 0, meta: { atk: 0, bomb: 0, pickup: 0, reroll: 0 }, weapons: ['shot', 'homing', 'laser'], diffUnlocked: 3, best: {}, gold: 0, ships: ['alpha'], ship: 'alpha', abilities: {}, pity: 0, cleared: {}, stages: {}, unlockAll: false, debug: false }; }
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) { const d = defaultSave(); return Object.assign(d, s, { meta: Object.assign(d.meta, s.meta || {}), abilities: s.abilities || {}, cleared: s.cleared || {}, stages: s.stages || {}, ships: s.ships && s.ships.length ? s.ships : ['alpha'] }); }
  } catch (_) {}
  return defaultSave();
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

// ===== 簡易効果音（ガチャ演出用。WebAudio で合成。クリック等の操作後に鳴る）=====
let AC = null, NBUF = null;
function ac() {
  try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); const n = AC.createBuffer(1, AC.sampleRate, AC.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NBUF = n; } if (AC.state === 'suspended') AC.resume(); } catch (_) {}
  return AC;
}
function tone(f0, f1, dur, type, vol, delay) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noiseBurst(dur, vol) {
  const a = ac(); if (!a) return;
  const t = a.currentTime, s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  s.buffer = NBUF; f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
}
const SFX = {
  charge(r) { tone(90, 700 + r * 250, 2.0, 'sawtooth', 0.05); tone(45, 240, 2.0, 'sine', 0.12); },
  burst(r) { tone(170, 30, 0.6, 'sine', 0.45); noiseBurst(0.5, 0.25); if (r >= 2) tone(660, 1320, 0.8, 'triangle', 0.12); },
  chime(r) { [[784], [784, 988], [784, 988, 1175], [784, 988, 1175, 1568, 2093]][r].forEach((f, i) => tone(f, 0, 0.45 + r * 0.15, 'triangle', 0.14, i * 0.07)); },
};
