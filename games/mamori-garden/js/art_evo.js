'use strict';
// ===== ★3・★5・★7 の進化の見た目：キャラの系統ごとに、ちがう姿になる =====
const EVO_OPTS = { fire: ['flame', 'blade'], water: ['bubble', 'frost'], wind: ['storm', 'wings'], earth: ['rock', 'cape'], light: ['holy', 'wings'], dark: ['shadow', 'dragonwing'] };
const EVO_KEY = { sword: 'blade', archer: 'leaf', mage: 'flame', siren: 'bubble', mouse: 'tails', ninja: 'shadow', samurai: 'blade', ravenblade: 'shadow', monk: 'holy', viking: 'rock', lancer: 'storm', gladiator: 'flame', paladin: 'holy', shieldmaiden: 'cape', dryad: 'leaf', thornpriest: 'leaf', rosequeen: 'leaf', sunflower: 'leaf', terrawitch: 'leaf', gunner: 'gear', pirate: 'storm', robo: 'gear', miko: 'holy', priest: 'holy', nun: 'holy', oracle: 'orbit', astrologer: 'orbit', crystalmage: 'orbit', voidmage: 'orbit', chrono: 'gear', alchemist: 'bubble', plaguedoctor: 'shadow', bard: 'orbit', cheer: 'storm', smith: 'gear', merchant: 'cape', druid: 'leaf' };
function evoHash(key) { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return Math.abs(h); }
function evoStyle(key) {
  if (EVO_KEY[key]) return EVO_KEY[key];
  if (typeof K_ICE !== 'undefined' && K_ICE.has(key)) return 'frost';
  if (typeof K_ELEC !== 'undefined' && K_ELEC.has(key)) return 'storm';
  const d = UNITS[key], s = (typeof SPEC !== 'undefined' && SPEC[key]) || { t: 'h' }, t = s.t, el = d.elem;
  if (t === 'b') return 'tails'; if (t === 'r') return 'gear'; if (t === 'p') return 'leaf';
  if (t === 'd' || t === 'e') return el === 'fire' ? 'flame' : el === 'water' ? 'bubble' : 'orbit';
  if (t === 'a') return el === 'fire' ? 'flame' : el === 'wind' ? 'storm' : 'orbit';
  if (t === 's') return ({ fire: 'flame', water: 'bubble', wind: 'storm', earth: 'rock', light: 'holy', dark: 'shadow' })[el] || 'orbit';
  const o = EVO_OPTS[el] || ['holy', 'wings'];
  return o[(evoHash(key) + (d.style === 'melee' ? 1 : 0)) % 2];
}
const GOLD = '#ffd24a', GOLD2 = '#fff2a0';
function evoGlow(g, col, tier) { g.save(); g.globalCompositeOperation = 'lighter'; glowDot(g, 0, -38, 48 + tier * 9, col, .2 + tier * .1); g.restore(); }
function evoBack(g, ec, tier, ph, key) {
  const st = evoStyle(key), gold = tier >= 3, col = gold ? GOLD : ec, L = lightHex(ec, .55);
  evoGlow(g, col, tier);
  if (gold) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,236,150,.18)'; for (let i = 0; i < 9; i++) { g.save(); g.translate(0, -40); g.rotate(i / 9 * TAU + .2); g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, -62); g.lineTo(3, 0); g.fill(); g.restore(); } g.restore(); }
  const fl = S_(ph, 1);
  switch (st) {
    case 'wings': if (tier >= 2) { const k = gold ? 1.25 : 1, wc = gold ? '#ffe9a0' : L; for (const sg of [-1, 1]) { g.save(); g.scale(sg, 1); g.translate(6, -38); g.rotate(-.1 + fl * (gold ? .1 : .07)); SB(g, [[0, 0], [14 * k, -24 * k], [34 * k, -34 * k], [38 * k, -12 * k], [26 * k, 2 * k], [10 * k, 6 * k]], wc); if (gold) SB(g, [[2, 4], [16, -4], [30 * k, 6 * k], [24 * k, 20 * k], [8, 14]], GOLD, { line: false }); g.restore(); } } break;
    case 'dragonwing': if (tier >= 2) { const k = gold ? 1.2 : .95; for (const sg of [-1, 1]) { g.save(); g.scale(sg, 1); g.translate(6, -36); g.rotate(-.15 + fl * .08); SB(g, [[0, 0], [10 * k, -26 * k], [26 * k, -36 * k], [24 * k, -22 * k], [38 * k, -22 * k], [30 * k, -8 * k], [34 * k, 4 * k], [16 * k, 2 * k], [8, 8]], gold ? '#3a1a3a' : dk(ec, .5)); g.strokeStyle = gold ? GOLD : L; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, -2); g.lineTo(26 * k, -34 * k); g.moveTo(4, 0); g.lineTo(32 * k, -8 * k); g.stroke(); g.restore(); } } break;
    case 'flame': { const n = 2 + tier; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * .38, h = 22 + tier * 7 + S_(ph + i * .13, 2) * 3; g.save(); g.translate(0, -26); g.rotate(a); SB(g, [[-5, 0], [-8, -h * .55], [0, -h], [8, -h * .55], [5, 0]], i % 2 ? '#ffb040' : '#ff5a2a', { line: false }); g.restore(); } } break;
    case 'frost': if (tier >= 1) { for (let i = 0; i < 2 + tier; i++) { const a = -Math.PI / 2 + (i - (1 + tier) / 2) * .6, x = Math.cos(a) * 24, y = -40 + Math.sin(a) * 26; g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); PL(g, [[-3.4, 0], [0, -(10 + tier * 3)], [3.4, 0], [0, 4]], i % 2 ? '#e8fbff' : '#9ae8ff', true); g.restore(); } } break;
    case 'leaf': { const n = 2 + tier; g.strokeStyle = '#2a8a3a'; g.lineWidth = 2.4; g.lineCap = 'round'; for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(sg * 6, -4); g.bezierCurveTo(sg * 24, -14, sg * 8, -30, sg * 20, -48); g.stroke(); } for (let i = 0; i < n; i++) { const sg = i % 2 ? 1 : -1, y = -10 - i * 8; g.save(); g.translate(sg * (14 + (i % 3) * 3), y); g.rotate(sg * (.8 + S_(ph + i * .1, 1) * .1)); SB(g, [[0, 0], [sg * 8, -5], [sg * 14, 0], [sg * 8, 5]], i % 2 ? '#58d86a' : '#8aef7a'); g.restore(); } } break;
    case 'orbit': { const n = 1 + tier; g.save(); g.strokeStyle = rgba(col, .6); g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, -38, 26 + tier * 2, 8 + tier, 0, 0, TAU); g.stroke(); g.restore(); for (let i = 0; i < n; i++) { const a = ph * TAU + i / n * TAU, x = Math.cos(a) * (26 + tier * 2), y = -38 + Math.sin(a) * (8 + tier); if (Math.sin(a) < 0) orb(g, x, y, 2.6 + tier * .6, col, '#fff'); } if (tier >= 3) { g.save(); g.translate(0, -2); g.scale(1, .32); g.strokeStyle = GOLD; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.stroke(); g.restore(); } } break;
    case 'blade': { const n = gold ? 5 : tier >= 2 ? 3 : 1; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * (gold ? .5 : .62); g.save(); g.translate(0, -40); g.rotate(a); g.translate(0, -26 - tier * 2 + S_(ph + i * .2, 1) * 1.5); PL(g, [[-2.6, 14], [0, -14], [2.6, 14]], gold ? GOLD2 : '#e8f0ff', true); g.fillStyle = col; g.fillRect(-4.4, 14, 8.8, 2.4); g.restore(); } } break;
    case 'gear': { const n = tier + 1; for (let i = 0; i < n; i++) { const sg = i % 2 ? 1 : -1, x = sg * (20 + (i >> 1) * 8), y = -30 - (i >> 1) * 10 + 8; g.save(); g.translate(x, y); g.rotate(ph * TAU * sg * (i % 2 + 1)); g.fillStyle = gold ? GOLD : '#9a9ab0'; g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); for (let j = 0; j < 16; j++) { const a = j / 16 * TAU, r = j % 2 ? 7 : 9.6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); E(g, 0, 0, 2.6, 2.6, '#3a3a50', false); g.restore(); } } break;
    case 'bubble': { const n = 3 + tier * 2; for (let i = 0; i < n; i++) { const q = (ph + i / n) % 1, a = i * 2.4, x = Math.cos(a) * (18 + tier * 3), y = -6 - q * 60, r = 2.4 + (i % 3) + tier * .5; g.save(); g.globalAlpha = .85 * (1 - q * .6); g.strokeStyle = '#e8fbff'; g.fillStyle = 'rgba(120,200,255,.35)'; g.lineWidth = 1.1; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); E(g, x - r * .3, y - r * .3, r * .3, r * .22, 'rgba(255,255,255,.9)', false); g.restore(); } } break;
    case 'storm': { g.strokeStyle = rgba(gold ? GOLD : '#d8fff0', .8); g.lineWidth = 2; g.lineCap = 'round'; for (let j = 0; j < 1 + tier; j++) { g.beginPath(); for (let i = 0; i <= 14; i++) { const f = i / 14, a = f * 5 + ph * TAU * (j % 2 ? -1 : 1) + j * 2.1, r = 10 + f * 16; const x = Math.cos(a) * r, y = -6 - f * 60 + Math.sin(a) * r * .3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } } break;
    case 'rock': { const n = 2 + tier; for (let i = 0; i < n; i++) { const a = ph * TAU * .5 + i / n * TAU, x = Math.cos(a) * 24, y = -34 + Math.sin(a) * 8 - (i % 2) * 8; if (Math.sin(a) < .2) { g.save(); g.translate(x, y); g.rotate(a); PL(g, [[-4, -2], [-1, -5], [4, -3], [5, 2], [0, 5], [-4, 3]], gold ? '#d8c070' : '#a08a5a', true); g.restore(); } } } break;
    case 'shadow': { g.save(); g.fillStyle = 'rgba(40,10,70,.55)'; for (let i = 0; i < 2 + tier; i++) { const a = (i - (1 + tier) / 2) * .5 + S_(ph + i * .1, 1) * .08; g.save(); g.translate(0, -24); g.rotate(a); g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(-10, -22, 0, -40 - tier * 4); g.quadraticCurveTo(10, -22, 6, 0); g.fill(); g.restore(); } g.globalCompositeOperation = 'lighter'; glowDot(g, 0, -34, 32, '#8a2aff', .3); g.restore(); } break;
    case 'holy': { if (tier >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(gold ? GOLD : '#ffffff', .22); for (let i = 0; i < 7; i++) { g.save(); g.translate(0, -42); g.rotate((i - 3) * .32); g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, -54); g.lineTo(3, 0); g.fill(); g.restore(); } g.restore(); } } break;
    case 'cape': { if (tier >= 1) { const k = .8 + tier * .15; SB(g, [[-10, -50], [-24 * k, -22], [-30 * k, 2 + S_(ph, 1) * 1.5], [0, -6], [30 * k, 2 + S_(ph, 1) * 1.5], [24 * k, -22], [10, -50]], gold ? '#c8321e' : dk(ec, .1)); if (tier >= 2) { g.strokeStyle = GOLD; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-30 * k, 2); g.lineTo(0, -6); g.lineTo(30 * k, 2); g.stroke(); } } } break;
    case 'tails': { const n = tier >= 3 ? 7 : tier >= 2 ? 5 : tier >= 1 ? 3 : 1; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * (n > 3 ? .3 : .42) + S_(ph + i * .08, 1) * .04; g.save(); g.translate(0, -12); g.rotate(a); SB(g, [[-4, -2], [-9, -22], [0, -38], [9, -22], [4, -2]], gold ? '#fff2c0' : lightHex(ec, .35)); g.restore(); } } break;
  }
}
function evoFront(g, ec, tier, ph, im, key) {
  const st = evoStyle(key), gold = tier >= 3, s = (typeof SPEC !== 'undefined' && SPEC[key]) || { t: 'h' }, hy = (HEAD_Y[s.t] || -70) - 8;
  g.save(); g.globalCompositeOperation = 'source-atop'; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = rgba(gold ? GOLD : ec, [0, .1, .15, .2][tier]); g.fillRect(0, 0, im.width, im.height); g.restore();
  const sc = gold ? GOLD2 : '#ffffff', sp = [[-26, -56], [24, -34], [-20, -18], [22, -70], [0, -86]];
  for (let i = 0; i < (gold ? 5 : tier >= 2 ? 4 : 3); i++) { const q = .5 + .5 * S_(ph + i * .21, 1); sparkle(g, sp[i][0], sp[i][1], 2.2 + q * 2.6 + tier * .4, sc); }
  if (tier < 2) return;
  const bob = S_(ph, 1) * 1.2, col = gold ? GOLD : lightHex(ec, .4);
  switch (st) {   // 頭の飾り（★7は系統ごとの「冠」）
    case 'flame': for (let i = -1; i <= 1; i++) SB(g, [[i * 4 - 3, hy + 8], [i * 4, hy - 8 - (i ? 0 : 5) - S_(ph + i * .2, 2) * 2], [i * 4 + 3, hy + 8]], i ? '#ffb040' : '#ff5a2a', { line: false }); break;
    case 'frost': for (let i = -2; i <= 2; i++) PL(g, [[i * 4 - 2, hy + 8], [i * 4, hy - 4 - (2 - Math.abs(i)) * 3], [i * 4 + 2, hy + 8]], i % 2 ? '#e8fbff' : '#9ae8ff', true); break;
    case 'leaf': for (let i = -2; i <= 2; i++) E(g, i * 4.4, hy + 6 - Math.abs(i) * .8, 2.6, 2.6, ['#ff9ac8', '#fff27a', '#ffffff', '#ff9ac8', '#fff27a'][i + 2], true); break;
    case 'orbit': g.save(); g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, hy + 4 + bob, 13, 4, 0, 0, TAU); g.stroke(); for (let i = 0; i < 4; i++) { const a = ph * TAU + i * 1.57; E(g, Math.cos(a) * 13, hy + 4 + bob + Math.sin(a) * 4, 1.8, 1.8, col, false); } g.restore(); break;
    case 'blade': PL(g, [[-2.4, hy + 8], [0, hy - 12], [2.4, hy + 8]], gold ? GOLD2 : '#e8f0ff', true); PL(g, [[-8, hy + 6], [-12, hy - 4], [-4, hy + 4]], col, true); PL(g, [[8, hy + 6], [12, hy - 4], [4, hy + 4]], col, true); break;
    case 'gear': g.save(); g.translate(0, hy + 2 + bob); g.rotate(ph * TAU); g.strokeStyle = gold ? GOLD : '#9ad8ff'; g.lineWidth = 2.2; g.beginPath(); for (let j = 0; j < 12; j++) { const a = j / 12 * TAU, r = j % 2 ? 9 : 12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r * .34); } g.closePath(); g.stroke(); g.restore(); break;
    case 'bubble': for (let i = -2; i <= 2; i++) { E(g, i * 4.6, hy + 7 - Math.abs(i) * 1.5 + bob, 2.4, 2.4, '#e8fbff', true); } break;
    case 'storm': PL(g, [[-3, hy + 8], [2, hy - 10], [0, hy - 2], [5, hy - 3], [-1, hy + 8]], '#fff27a', true); break;
    case 'rock': for (let i = -1; i <= 1; i++) PL(g, [[i * 6 - 3, hy + 8], [i * 6, hy - 6 - (i ? 0 : 4)], [i * 6 + 3, hy + 8]], gold ? '#ffe9a0' : '#c8b88a', true); break;
    case 'shadow': for (const sg of [-1, 1]) { g.strokeStyle = OUT; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(sg * 5, hy + 8); g.quadraticCurveTo(sg * 14, hy + 4, sg * 12, hy - 8); g.stroke(); g.strokeStyle = gold ? '#ff4a6a' : '#6a2a9a'; g.lineWidth = 2.8; g.stroke(); } break;
    case 'dragonwing': for (const sg of [-1, 1]) PL(g, [[sg * 4, hy + 8], [sg * 12, hy - 8], [sg * 8, hy + 8]], gold ? GOLD : '#e8e0c8', true); break;
    case 'tails': for (const sg of [-1, 1]) PL(g, [[sg * 4, hy + 8], [sg * 10, hy - 6], [sg * 9, hy + 8]], gold ? GOLD2 : lightHex(ec, .5), true); break;
    default: g.save(); g.strokeStyle = gold ? GOLD : lightHex(ec, .4); g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, hy + 2 + bob, 12, 3.6, 0, 0, TAU); g.stroke(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .9; g.stroke(); g.restore();
  }
  if (gold && st !== 'flame') { const y = hy - 10 + bob; PL(g, [[-7, y + 6], [-8, y - 2], [-4, y + 1], [0, y - 6], [4, y + 1], [8, y - 2], [7, y + 6]], GOLD, true); }
}
