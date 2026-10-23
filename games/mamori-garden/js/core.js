'use strict';
// ===== 共通ヘルパー（DOMなし：シミュレーターからも読み込む） =====
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rng = mulberry32(1);
function seedRng(s) { rng = mulberry32(s); }
const rnd = (a, b) => a + rng() * (b - a);
const vrnd = (a, b) => a + Math.random() * (b - a);   // 見た目用
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const easeOut = t => 1 - (1 - t) * (1 - t);
const TAU = Math.PI * 2;
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(c1, c2, t) { const a = hexToRgb(c1), b = hexToRgb(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; }
function rgba(h, al) { const a = hexToRgb(h); return `rgba(${a[0]},${a[1]},${a[2]},${al})`; }
