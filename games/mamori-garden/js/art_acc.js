'use strict';
// ===== キャラデザインの見直し：飾り（アクセサリー）と、東洋の竜。色ちがいだけだったキャラを、形から変える =====
const HEAD_Y = { h: -70, b: -54, a: -48, r: -58, s: -38, d: -52, e: -52, p: -42 };
const ACC = {
  // ---- うしろに描く ----
  sunhalo: (c, p, s) => { const y = HEAD_Y[s.t] - 4; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, y, 34, '#ffd24a', .6); c.restore(); c.fillStyle = '#ffd24a'; for (let i = 0; i < 12; i++) { c.save(); c.translate(0, y); c.rotate(i / 12 * TAU + p * .4); c.beginPath(); c.moveTo(-2.4, -13); c.lineTo(0, -24); c.lineTo(2.4, -13); c.fill(); c.restore(); } E(c, 0, y, 12, 12, '#fff2a0', true); },
  ninetails: (c, p, s) => { for (let i = -4; i <= 4; i++) { const a = i * .3 + S_(p + i * .1, 1) * .05; c.save(); c.translate(0, -16); c.rotate(a); SB(c, [[-4, -4], [-8, -26], [0, -46], [8, -26], [4, -4]], i % 2 ? '#fff6e8' : '#ffe9c0'); SB(c, [[-2, -34], [0, -46], [2, -34]], '#ffd24a', { line: false }); c.restore(); } },
  foxflames: (c, p, s) => { for (let i = -1; i <= 1; i++) { c.save(); c.translate(i * 6, -12); c.rotate(i * .5 + S_(p + i * .2, 1) * .08); SB(c, [[-5, 0], [-9, -18], [0, -34 - S_(p + i, 2) * 2], [9, -18], [5, 0]], '#ff7a2a'); SB(c, [[-3, -6], [0, -26], [3, -6]], '#ffd24a', { line: false }); c.restore(); } },
  wheels: (c, p, s) => { for (const x of [-17, 17]) { E(c, x, -9, 9, 9, '#a07a4a', true); c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.4; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; c.beginPath(); c.moveTo(x + Math.cos(a) * 9, -9 + Math.sin(a) * 9); c.lineTo(x - Math.cos(a) * 9, -9 - Math.sin(a) * 9); c.stroke(); } } c.strokeStyle = OUT; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-12, -14); c.lineTo(16, -48); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 3.6; c.stroke(); E(c, 18, -50, 6, 4, '#6a4a2a', true); },
  crystals: (c, p, s) => { for (const [x, y, h, sg] of [[-14, -24, 20, -1], [14, -24, 20, 1], [-8, -38, 16, -1], [9, -40, 14, 1]]) { SB(c, [[x - 4, y], [x + sg * 2, y - h], [x + 4, y]], '#c070ff'); PL(c, [[x - 1, y - 2], [x + sg * 2, y - h + 3], [x + 1, y - 2]], 'rgba(255,255,255,.55)', false); } },
  longtail: (c, p, s) => { for (let i = -2; i <= 2; i++) { SB(c, [[i * 4 - 3, -10], [i * 9 + S_(p + i * .13, 2) * 3, 12], [i * 4 + 3, -10]], i % 2 ? '#ffb040' : '#ff5a2a', { line: false }); } c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 4, 20, '#ff8a2a', .5); c.restore(); },
  lightning: (c, p, s) => { c.save(); c.strokeStyle = 'rgba(255,248,170,.95)'; c.lineWidth = 1.8; c.lineCap = 'round'; const k = Math.floor(p * 8); for (let i = 0; i < 3; i++) { const a = i * 2.1 + (k % 2) * .4 + 1; c.beginPath(); let x = Math.cos(a) * 12, y = -32 + Math.sin(a) * 12; c.moveTo(x, y); for (let j = 0; j < 3; j++) { x += Math.cos(a) * 6 + (j % 2 ? 4 : -4); y += Math.sin(a) * 6; c.lineTo(x, y); } c.stroke(); } c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -32, 24, '#fff27a', .3); c.restore(); },
  clockhalo: (c, p, s) => { const y = HEAD_Y[s.t] + 16; c.save(); c.translate(0, y); c.rotate(p * TAU * .25); c.strokeStyle = '#ffd24a'; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.stroke(); c.lineWidth = 1; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, -26); c.lineTo(0, -21); c.stroke(); c.rotate(TAU / 12); } c.restore(); c.strokeStyle = '#fff2a0'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.lineTo(Math.cos(p * TAU * 4) * 14, y + Math.sin(p * TAU * 4) * 14); c.stroke(); },
  whirl: (c, p, s) => { c.strokeStyle = 'rgba(220,255,240,.8)'; c.lineWidth = 2; c.lineCap = 'round'; for (let j = 0; j < 3; j++) { c.beginPath(); for (let i = 0; i <= 14; i++) { const f = i / 14, a = f * 5 + p * TAU + j * 2.1, r = 8 + f * 18; const x = Math.cos(a) * r, y = -26 - f * 14 + Math.sin(a) * r * .35; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); } },
  rift: (c, p, s) => { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -24, 34, '#7a2aff', .5); c.restore(); c.strokeStyle = '#2a0a4a'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -24, 22, 28, 0, 0, TAU); c.stroke(); c.strokeStyle = '#c070ff'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, -24, 22, 28, 0, p * 3, p * 3 + 4); c.stroke(); },
  // ---- 前に描く ----
  crown: (c, p, s) => { const y = HEAD_Y[s.t]; PL(c, [[-9, y + 7], [-10, y - 4], [-5, y], [0, y - 8], [5, y], [10, y - 4], [9, y + 7]], '#ffd24a', true); E(c, 0, y, 1.8, 1.8, '#ff6a8a', false); },
  horns: (c, p, s) => { const y = HEAD_Y[s.t] + 4; for (const sg of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(sg * 6, y); c.quadraticCurveTo(sg * 16, y - 4, sg * 14, y - 18); c.stroke(); c.strokeStyle = '#f2e8d0'; c.lineWidth = 3.4; c.stroke(); } },
  shoulder: (c, p, s) => { const w = s.t === 'r' ? 15 : 13, y = s.t === 'r' ? -30 : -34; for (const sg of [-1, 1]) { E(c, sg * w, y, 6, 5, '#8a8aa0', true); for (let i = -1; i <= 1; i++) PL(c, [[sg * (w + i * 3) - 1.5, y - 3], [sg * (w + i * 3.4), y - 10 - (i === 0 ? 3 : 0)], [sg * (w + i * 3) + 1.5, y - 3]], '#c8c8d8', true); } },
  twinbarrel: (c, p, s) => { c.save(); c.translate(0, -22); GP(c, [[3, 4], [26, 3.4], [26, 9], [3, 9]], '#3a3a50'); GE(c, 26, 6, 1.8, 3.2, '#2a2a40'); c.restore(); },
  sunwheel: () => { },
  antenna: (c, p, s) => { for (const sg of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(sg * 6, HEAD_Y[s.t] + 12); c.quadraticCurveTo(sg * 12, HEAD_Y[s.t] - 2, sg * 10, HEAD_Y[s.t] - 10); c.stroke(); orb(c, sg * 10, HEAD_Y[s.t] - 10, 2.4, '#7affff', '#fff'); } },
  spikes: (c, p, s) => { for (let i = -2; i <= 2; i++) PL(c, [[i * 5 - 2, -42 + Math.abs(i) * 3], [i * 5, -54 + Math.abs(i) * 3 - 4], [i * 5 + 2, -42 + Math.abs(i) * 3]], '#e8a0ff', true); },
  clockface: (c, p, s) => { E(c, 0, -22, 8, 8, '#fff6dc', true); c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -22); c.lineTo(Math.cos(p * TAU * 4) * 6, -22 + Math.sin(p * TAU * 4) * 6); c.moveTo(0, -22); c.lineTo(Math.cos(p * TAU) * 4, -22 + Math.sin(p * TAU) * 4); c.stroke(); },
  icicles: (c, p, s) => { for (const [x, y] of [[-14, -34], [-8, -40], [8, -40], [14, -34], [0, -46]]) PL(c, [[x - 2.4, y], [x, y - 12], [x + 2.4, y]], '#bff4ff', true); },
  boulders: (c, p, s) => { for (const sg of [-1, 1]) { E(c, sg * 16, -36, 7, 6, '#8a8a7a', true); E(c, sg * 15, -39, 3, 2, '#4a9a4a', false); } E(c, 0, -52, 6, 4, '#7a7a6a', true); },
  ribs: (c, p, s) => { c.strokeStyle = '#fffbe8'; c.lineWidth = 1.6; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, -16 - i * 3.4, 6 - i * .2, .2, Math.PI - .2); c.stroke(); } c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -28); c.stroke(); },
  smoke: (c, p, s) => { for (let i = 0; i < 4; i++) { const q = (p + i / 4) % 1; c.fillStyle = 'rgba(150,230,100,' + (.55 - q * .5) + ')'; c.beginPath(); c.arc(-14 + i * 9 + S_(q, 1) * 3, -4 - q * 18, 4 + q * 5, 0, TAU); c.fill(); } },
  ghost: (c, p, s) => { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -20, 28, '#bff0ff', .35); c.restore(); c.fillStyle = 'rgba(220,245,255,.55)'; c.beginPath(); c.moveTo(-12, -6); for (let i = 0; i <= 4; i++) c.lineTo(-12 + i * 6, 2 + (i % 2) * 5 + S_(p + i * .1, 1) * 2); c.lineTo(12, -6); c.closePath(); c.fill(); },
  starhat: (c, p, s) => { const y = HEAD_Y[s.t]; star5(c, 0, y - 2 + S_(p, 1), 6, '#fff27a', 'rgba(120,80,0,.8)'); },
  bag: (c, p, s) => { E(c, 9, -12, 6, 5, '#a07a4a', true); c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -30); c.lineTo(9, -16); c.stroke(); E(c, 9, -14, 2.4, 1.6, '#fff6dc', false); },
};
const ACC_BACK = new Set(['sunhalo', 'ninetails', 'foxflames', 'wheels', 'crystals', 'longtail', 'lightning', 'clockhalo', 'whirl', 'rift']);

// 東洋の竜（ながい体）：龍神・水竜・海の大蛇に使う
function mkEastern(s) {
  return function (c, p, a) {
    const sea = s.sea, N = 11, pts = [];
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -26, 38, s.col, .35); c.restore();
    for (let i = 0; i < N; i++) { const f = i / (N - 1); pts.push([Math.sin(f * 5.2 + p * TAU) * (13 * (1 - f * .35)), -3 - f * 40 + (f < .2 ? 0 : 0)]); }
    if (!sea) for (const sg of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(pts[3][0], pts[3][1]); c.lineTo(pts[3][0] + sg * 11, pts[3][1] + 3 + S_(p, 1) * 2); c.stroke(); c.strokeStyle = s.col; c.lineWidth = 1.8; c.stroke(); GE(c, pts[3][0] + sg * 12, pts[3][1] + 4, 2.4, 2, s.horn); }
    for (let i = 0; i < N - 1; i++) { const w = 7.4 + (i / N) * 4.4; limb(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, i % 2 ? s.col : lt(s.col, .1)); }
    for (let i = 1; i < N - 2; i++) { limb(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.6, s.belly); if (sea) PL(c, [[pts[i][0] + 5, pts[i][1] + 1], [pts[i][0] + 15, pts[i][1] - 3 + S_(p + i * .1, 1) * 2], [pts[i][0] + 6, pts[i][1] - 5]], s.mane || s.horn, true); if (sea) PL(c, [[pts[i][0] - 5, pts[i][1] + 1], [pts[i][0] - 15, pts[i][1] - 3 + S_(p + i * .1, 1) * 2], [pts[i][0] - 6, pts[i][1] - 5]], s.mane || s.horn, true); }
    const hx = pts[N - 1][0], hy = pts[N - 1][1] - 6;
    if (!sea) for (let i = -2; i <= 2; i++) SB(c, [[hx + i * 5 - 3, hy], [hx + i * 6, hy - 14 - (2 - Math.abs(i)) * 2 + S_(p + i * .1, 2) * 2], [hx + i * 5 + 3, hy]], s.mane || '#ffb040', { line: false });
    GE(c, hx, hy, 13, 10.5, s.col); GE(c, hx, hy + 4, 8, 5, lt(s.col, .25), { line: false });
    for (const sg of [-1, 1]) { PL(c, [[hx + sg * 7, hy - 7], [hx + sg * 11, hy - 20], [hx + sg * 3, hy - 9]], s.horn); c.strokeStyle = s.horn; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx + sg * 7, hy + 3); c.quadraticCurveTo(hx + sg * 20, hy + 6 + S_(p, 1) * 3, hx + sg * 22, hy + 14); c.stroke(); }
    eye2(c, hx - 5, hy - 1, 3.6, s.ec, { noLash: true, flip: true }); eye2(c, hx + 5, hy - 1, 3.6, s.ec, { noLash: true });
    E(c, hx - 2, hy + 6, 1, 1, '#a02a1a', false); E(c, hx + 2, hy + 6, 1, 1, '#a02a1a', false);
    if (a > .2) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, hx, hy + 6, 10 + a * 14, '#9affd0', a); c.restore(); }
  };
}

// 作りなおし：SPEC をなおして、絵をつくりなおす（acc＝飾り、scale＝大きさ）
function buildSprite(s) {
  let f = s.t === 'h' ? mkHuman(s) : s.t === 'b' ? mkBeast(s) : s.t === 's' ? mkSpirit(s) : s.t === 'a' ? mkBird(s) : s.t === 'r' ? mkRobot(s) : s.t === 'p' ? mkPlant(s) : s.t === 'e' ? mkEastern(s) : mkDragon(s);
  if (!s.acc && !s.scale) return f;
  const base = f, accs = s.acc || [];
  return function (c, p, a, x) {
    c.save(); if (s.scale) c.scale(s.scale, s.scale);
    c.save(); for (const n of accs) if (ACC_BACK.has(n) && ACC[n]) { c.save(); ACC[n](c, p, s); c.restore(); } c.restore();
    c.save(); base(c, p, a, x); c.restore();
    c.save(); c.translate(0, s.t === 's' ? -9 + S_(p, 1) * 2.4 : 0); for (const n of accs) if (!ACC_BACK.has(n) && ACC[n]) { c.save(); ACC[n](c, p, s); c.restore(); } c.restore();
    c.restore();
  };
}
const REDESIGN = {
  blazeknight: { hd: 'horn', hg: '#e8e0c0', bk: 'aura', bc: '#ff6a2a', wp: 'spear', wc: '#ffb070', acc: ['shoulder'] },
  paladin: { hd: 'halo', hg: '#ffe27a', bk: 'wings', bc: '#ffffff', wp: 'hammer', wc: '#fff2c0' },
  lavaking: { acc: ['crown', 'shoulder'], scale: 1.15 },
  firehound: { ear: 'dog', hd: 'band', hg: '#ff6a2a', wp: 'none', acc: ['foxflames'] },
  solarcannon: { acc: ['sunhalo'] },
  infernocannon: { acc: ['twinbarrel', 'smoke'] },
  catapult: { kind: 'robot', rc: '#a07a4a', ec: '#ff9a3a', acc: ['wheels'] },
  titan: { scale: 1.3, acc: ['shoulder', 'horns'] },
  crystalgolem: { kind: 'golem', rc: '#c070ff', ec: '#7affff', acc: ['crystals'] },
  firefox: { hd: 'band', hg: '#ff6a2a', acc: ['foxflames'] },
  shiromen: { acc: ['ninetails', 'crown'] },
  thunderbird: { kind: 'hawk', crest: 'tuft', cc: '#ffd24a', bc: '#ffe27a', wc: '#fff6c0', acc: ['lightning'] },
  phoenixlord: { acc: ['longtail', 'crown'] },
  stormtower: { kind: 'robot', rc: '#c8a0ff', ec: '#fff27a', acc: ['lightning', 'shoulder'] },
  lightningrod: { kind: 'robot', rc: '#4a5a7a', ec: '#bff0ff', acc: ['antenna', 'spikes'] },
  sundial: { kind: 'golem', rc: '#e8d49a', ec: '#ff9a3a', acc: ['clockface'] },
  timelord: { kind: 'robot', rc: '#ffd24a', ec: '#7affff', acc: ['clockhalo', 'crown'] },
  starchild: { feat: 'wings', acc: ['starhat'] },
  terrawitch: { hs: 5, hd: 'flower', hg: '#7aff9a', bk: 'pack', bc: '#6a4a2a', wp: 'book', wc: '#4a8a3a' },
  poisonfog: { feat: 'horn', orbit: 4, acc: ['smoke'] },
  glacier: { acc: ['icicles', 'shoulder'] },
  rockgiant: { acc: ['boulders'] },
  voidwalker: { feat: 'bolt', orbit: 5, acc: ['rift'] },
  ghostcat: { ear: 'rabbit', hd: 'beret', hg: '#7a5aa8', acc: ['ghost'] },
  sparrow: { crest: 'flame', bc: '#c89a5a', acc: ['bag'] },
  cyclonebird: { acc: ['whirl'] },
  waterdragon: { t: 'e', col: '#3a8ae8', belly: '#d8f4ff', mane: '#8ad0ff', horn: '#fff0b0', ec: '#ffec6a' },
  ryuujin: { t: 'e', col: '#e8404a', belly: '#ffd890', mane: '#ffd24a', horn: '#fff0b0', ec: '#ffec6a' },
  leviathan: { t: 'e', sea: 1, col: '#1a4aa8', belly: '#9ad8ff', mane: '#4a8ae0', horn: '#ffe27a', ec: '#7affff' },
  bonedragon: { acc: ['ribs'] },
  dragonemp: { scale: 1.3, acc: ['crown', 'spikes'] },
};
for (const k in REDESIGN) { if (!SPEC[k]) continue; Object.assign(SPEC[k], REDESIGN[k]); SPRITES[k] = buildSprite(SPEC[k]); }
