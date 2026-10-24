'use strict';
// ===== ステージ16〜30：背景は元のテーマの色を変えて使い、ボス絵は色を重ねて強そうに =====
function hexToHsl(h) {
  const [r, g, b] = hexToRgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
  return [hh, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
function shiftHex(h, dh, ks, kl) { if (typeof h !== 'string' || h[0] !== '#' || h.length !== 7) return h; const [a, s, l] = hexToHsl(h); return hslToHex(a + dh, clamp(s * ks, 0, 1), clamp(l * kl, 0, .97)); }
for (const ex of STAGE_EX) {
  const b = THEMES[ex.base], f = h => shiftHex(h, ex.hue, ex.sat, ex.lit), o = { tod: [[0, ex.ov[0], ex.ov[1], ex.ov[2], .14], [.5, ex.ov[0], ex.ov[1], ex.ov[2], .06], [1, ex.ov[0], ex.ov[1], ex.ov[2], .26]] };
  for (const k in b) if (k !== 'tod') o[k] = Array.isArray(b[k]) ? b[k].map(f) : f(b[k]);
  THEMES[ex.theme] = o; EXTBG[ex.theme] = EXTBG[ex.base];
  const base = ex.bossBase, tint = ex.tint, bf = BSPR[base];
  BSPR[ex.boss] = function (c, p, a) {
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -34, 70, tint, .4 + S_(p, 2) * .1); c.restore();
    bf(c, p, a);
    c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .4; c.fillStyle = tint; c.fillRect(-160, -200, 320, 260); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const q = (p + i / 4) % 1; glowDot(c, -26 + i * 17 + S_(q, 2) * 4, -20 - q * 60, 4, tint, .9 * (1 - q)); } c.restore();
  };
}
