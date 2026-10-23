'use strict';
// ===== 作画ツール（グラデーション・アニメ目・髪の艶など） =====
// スプライトは 1 ループ（p = 0〜1）の位相で動かす。sin/cos の周波数は整数にして、ループの継ぎ目をなくす。
const OUT = 'rgba(52,26,64,.9)', SKIN = '#ffe6d4';
const S_ = (p, k) => Math.sin(p * TAU * k), C_ = (p, k) => Math.cos(p * TAU * k);
const lt = (col, t) => mix(col, '#ffffff', t == null ? .4 : t);
const dk = (col, t) => mix(col, '#2a1040', t == null ? .35 : t);

function E(c, x, y, rx, ry, fill, line) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (line !== false) { c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke(); } }
function PL(c, pts, fill, line) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (line !== false) { c.strokeStyle = OUT; c.lineWidth = 1.3; c.lineJoin = 'round'; c.stroke(); } }
function vgr(c, y0, y1, col, a, b) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, lt(col, a == null ? .38 : a)); g.addColorStop(.55, col); g.addColorStop(1, dk(col, b == null ? .32 : b)); return g; }
// グラデーション付きの楕円
function GE(c, x, y, rx, ry, col, o) {
  o = o || {}; c.beginPath(); c.ellipse(x, y, rx, ry, o.rot || 0, 0, TAU); c.fillStyle = vgr(c, y - ry, y + ry, col, o.a, o.b); c.fill();
  if (o.line !== false) { c.strokeStyle = o.oc || OUT; c.lineWidth = o.lw || 1.3; c.stroke(); }
}
function bboxY(pts) { let a = 1e9, b = -1e9; for (const p of pts) { if (p[1] < a) a = p[1]; if (p[1] > b) b = p[1]; } return [a, b]; }
// グラデーション付きの多角形
function GP(c, pts, col, o) {
  o = o || {}; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
  const [a, b] = bboxY(pts); c.fillStyle = vgr(c, a, b, col, o.a, o.b); c.fill();
  if (o.line !== false) { c.strokeStyle = o.oc || OUT; c.lineWidth = o.lw || 1.3; c.lineJoin = 'round'; c.stroke(); }
}
// なめらかな塊（髪・マント・葉っぱなど）。点を通る曲線で閉じる
function smooth(c, pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]); c.beginPath(); c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  c.closePath();
}
function SB(c, pts, col, o) {
  o = o || {}; smooth(c, pts); const [a, b] = bboxY(pts); c.fillStyle = vgr(c, a, b, col, o.a, o.b); c.fill();
  if (o.line !== false) { c.strokeStyle = o.oc || OUT; c.lineWidth = o.lw || 1.3; c.lineJoin = 'round'; c.stroke(); }
}
function hl(c, x, y, rx, ry, rot, a) { c.save(); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = 'rgba(255,255,255,' + (a == null ? .5 : a) + ')'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill(); c.restore(); }
// 太い線で作る手足・ひも（輪郭つき）
function limb(c, x1, y1, x2, y2, w, col) {
  c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = Math.max(.8, w * .28); c.beginPath(); c.moveTo(x1 - w * .18, y1); c.lineTo(x2 - w * .18, y2); c.stroke();
}
function hand(c, x, y, r) { GE(c, x, y, r || 2.4, r || 2.4, SKIN); }
function sparkle(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); }
function star5(c, x, y, r, col, line) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath();
  c.fillStyle = col; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 1; c.stroke(); }
}
function glowRing(c, x, y, r, col, a) { c.save(); c.strokeStyle = rgba(col, Math.min(1, a)); c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.restore(); }
// 光の玉（高密度のグロー）
function orb(c, x, y, r, col, core) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, r * 2.6, col, .75); c.restore(); E(c, x, y, r, r, col, false); E(c, x - r * .2, y - r * .2, r * .55, r * .55, core || '#ffffff', false); }

// アニメ調の目（グラデーションの虹彩・二重のハイライト・まつげ）
function eye2(c, x, y, r, iris, o) {
  o = o || {};
  const sy = o.sleepy ? .45 : 1;
  c.save(); c.translate(x, y); c.scale(1, sy);
  E(c, 0, 0, r * .88, r, '#fff', false);
  const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, dk(iris, .45)); g.addColorStop(.5, iris); g.addColorStop(1, lt(iris, .55));
  c.beginPath(); c.ellipse(0, r * .08, r * .68, r * .9, 0, 0, TAU); c.fillStyle = g; c.fill();
  E(c, 0, r * .16, r * .32, r * .5, '#241238', false);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * .3, -r * .32, r * .3, 0, TAU); c.fill(); c.beginPath(); c.arc(r * .3, r * .42, r * .13, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = OUT; c.lineWidth = o.sleepy ? 1.6 : 1.7; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y + (o.sleepy ? r * .1 : 0), r * .94, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
  if (!o.sleepy && !o.noLash) { c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + (o.flip ? -r * .9 : r * .9), y - r * .35); c.lineTo(x + (o.flip ? -r * 1.35 : r * 1.35), y - r * .7); c.stroke(); }
}
function face2(c, y, iris, o) {
  o = o || {}; const r = o.r || 12;
  GE(c, 0, y, r + 1, r, o.skin || SKIN, { a: .25, b: .18 });
  E(c, -r * .72, y + r * .5, 2.7, 1.7, 'rgba(255,100,130,.42)', false); E(c, r * .72, y + r * .5, 2.7, 1.7, 'rgba(255,100,130,.42)', false);
  eye2(c, -r * .42, y + 1, r * .31, iris, { sleepy: o.sleepy, flip: true }); eye2(c, r * .42, y + 1, r * .31, iris, { sleepy: o.sleepy });
  c.strokeStyle = o.brow || '#7a4a30'; c.lineWidth = 1; c.lineCap = 'round';
  c.beginPath(); c.arc(-r * .42, y - r * .22, r * .26, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.beginPath(); c.arc(r * .42, y - r * .22, r * .26, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  const my = y + r * .58;
  if (o.mouth === 'open') { E(c, 0, my, 1.9, 1.5, '#b03a4a', false); E(c, 0, my + .6, 1, .6, '#ff8a9a', false); }
  else if (o.mouth === 'cat') { c.strokeStyle = '#8a4a4a'; c.lineWidth = 1; c.beginPath(); c.arc(-1.4, my, 1.5, .1, Math.PI - .1); c.arc(1.4, my, 1.5, .1, Math.PI - .1); c.stroke(); }
  else if (o.mouth === 'flat') { c.strokeStyle = '#8a4a4a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1.6, my + .4); c.lineTo(1.6, my + .4); c.stroke(); }
  else { c.strokeStyle = '#a0504a'; c.lineWidth = 1.1; c.beginPath(); c.arc(0, my - .6, 1.9, .2, Math.PI - .2); c.stroke(); }
}
// 髪の艶（天使の輪）
function hairShine(c, cx, cy, rx, ry, a) {
  c.save(); c.strokeStyle = 'rgba(255,255,255,' + (a == null ? .45 : a) + ')'; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.12, Math.PI * 1.62); c.stroke(); c.restore();
}
function strands(c, pts, col) { c.save(); c.strokeStyle = dk(col, .3); c.lineWidth = .9; c.lineCap = 'round'; for (const s of pts) { c.beginPath(); c.moveTo(s[0], s[1]); c.quadraticCurveTo(s[2], s[3], s[4], s[5]); c.stroke(); } c.restore(); }
function boots(c, col, y) { GE(c, -4, y == null ? -2 : y, 4.6, 3.2, col); GE(c, 4, y == null ? -2 : y, 4.6, 3.2, col); hl(c, -5, (y == null ? -2 : y) - 1.2, 1.6, .8, 0, .5); hl(c, 3, (y == null ? -2 : y) - 1.2, 1.6, .8, 0, .5); }
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
