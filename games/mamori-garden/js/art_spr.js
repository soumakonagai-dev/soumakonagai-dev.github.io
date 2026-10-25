'use strict';
// ===== 敵・ボスのデザイン、スプライトのキャッシュ描画、ユニット／敵の描画 =====
const ESPR = {
  slime(c, p) {
    const w = S_(p, 2) * .07; c.scale(1 + w, 1 - w);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -11, 20, '#8affd0', .3); c.restore();
    SB(c, [[-16, -2], [-17, -11], [-9, -21], [0, -24], [9, -21], [17, -11], [16, -2], [0, 1]], '#6ee0a8'); SB(c, [[-12, -4], [0, -7], [12, -4], [0, 0]], 'rgba(30,140,100,.35)', { line: false });
    hl(c, -7, -17, 5, 2.4, -.5, .65); hl(c, 10, -8, 1.6, 1, 0, .5);
    eye2(c, -5, -10, 3.6, '#1f6a4a', { flip: true }); eye2(c, 5, -10, 3.6, '#1f6a4a'); E(c, -9, -5.5, 2.2, 1.3, 'rgba(255,120,160,.45)', false); E(c, 9, -5.5, 2.2, 1.3, 'rgba(255,120,160,.45)', false);
    c.strokeStyle = '#2a6a4a'; c.lineWidth = 1; c.beginPath(); c.arc(0, -6, 1.6, .2, Math.PI - .2); c.stroke(); SB(c, [[-1, -23], [-5, -30], [1, -29 + S_(p, 1)], [4, -26]], '#4ab86a');
  },
  rabbit(c, p) {
    const h = Math.abs(S_(p, 2)) * 5; c.translate(0, -h);
    GE(c, 13, -6, 4, 4, '#fff'); SB(c, [[-7, -24], [-9, -36], [-4, -43], [-1, -30]], '#fff6f6'); SB(c, [[7, -24], [9, -36 + S_(p, 2) * 2], [4, -43], [1, -30]], '#fff6f6'); SB(c, [[-6.5, -27], [-7, -35], [-4.4, -38], [-2.4, -29]], '#ffb0c0', { line: false }); SB(c, [[6.5, -27], [7, -35], [4.4, -38], [2.4, -29]], '#ffb0c0', { line: false });
    GE(c, 0, -8, 11.5, 9.5, '#fff6f6'); GE(c, 0, -17, 11, 10, '#fff6f6'); eye2(c, -4.2, -17, 3.4, '#e03a5a', { flip: true }); eye2(c, 4.2, -17, 3.4, '#e03a5a');
    E(c, 0, -12.6, 1.5, 1.1, '#ff8a9a', false); E(c, -8, -12.5, 2.2, 1.3, 'rgba(255,120,160,.5)', false); E(c, 8, -12.5, 2.2, 1.3, 'rgba(255,120,160,.5)', false);
    GE(c, -6, -1, 4, 2.6, '#fff6f6'); GE(c, 6, -1, 4, 2.6, '#fff6f6'); hl(c, -3, -21, 3, 1.2, -.4, .6);
  },
  frog(c, p) {
    const b = S_(p, 2) * .5;
    GE(c, 0, -10, 16, 11, '#58b858'); E(c, 0, -6, 10, 6.5, '#b8e8a0', false);
    GE(c, -8, -20 + b, 5.6, 5.6, '#58b858'); GE(c, 8, -20 + b, 5.6, 5.6, '#58b858'); eye2(c, -8, -20 + b, 3.8, '#2a2a2a', { noLash: true }); eye2(c, 8, -20 + b, 3.8, '#2a2a2a', { noLash: true });
    SB(c, [[-13, -19], [-9, -27], [0, -29], [9, -27], [13, -19], [10, -16], [-10, -16]], '#a8b4c4'); c.fillStyle = '#e8f0fa'; c.fillRect(-1, -29, 2, 12); hl(c, -7, -24, 3, 1.2, -.5, .6);
    GP(c, [[-18, -13], [-11, -15], [-11, -2], [-18, -4]], '#8a98a8'); GP(c, [[18, -13], [11, -15], [11, -2], [18, -4]], '#8a98a8'); c.fillStyle = '#c8d4e4'; E(c, -14.5, -9, 1.1, 1.1, '#e8f0fa', false); E(c, 14.5, -9, 1.1, 1.1, '#e8f0fa', false);
    c.strokeStyle = '#2a6a3a'; c.lineWidth = 1.1; c.beginPath(); c.arc(0, -9, 3.4, .2, Math.PI - .2); c.stroke();
  },
  mushroom(c, p) {
    c.rotate(S_(p, 1) * .05);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -24, 26, '#c070ff', .35); c.restore();
    GE(c, 0, -9, 9.5, 10.5, '#f0e0d0'); eye2(c, -3.6, -9, 3, '#6a2aa0', { flip: true }); eye2(c, 3.6, -9, 3, '#6a2aa0');
    GE(c, 0, -23, 18, 11.5, '#7a3aa8'); E(c, 0, -18, 18, 4, '#5a2a88', false);
    for (const [x, y, r] of [[-8, -26, 3.2], [3, -29, 3.4], [10, -22, 2.8]]) orb(c, x, y, r * .9, '#e6c8ff', '#fff'); hl(c, -9, -30, 5, 1.8, -.5, .35);
    for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; E(c, -9 + i * 9, -33 - q * 10, 1.4 * (1 - q) + .4, 1.4 * (1 - q) + .4, 'rgba(210,160,255,' + (.8 - q * .7) + ')', false); }
  },
  jelly(c, p) {
    const w = S_(p, 2) * .09; c.scale(1 + w, 1 - w);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -13, 22, '#80e8ff', .3); c.restore(); c.globalAlpha = .92;
    SB(c, [[-17, -2], [-18, -13], [-9, -24], [0, -27], [9, -24], [18, -13], [17, -2], [0, 1]], '#7ae6ff'); c.globalAlpha = 1;
    GE(c, 0, -11, 6.5, 6.5, 'rgba(60,150,230,.7)', { line: false }); E(c, 0, -11, 3, 3, 'rgba(255,255,255,.55)', false); hl(c, -8, -19, 5, 2.4, -.5, .7);
    eye2(c, -5.5, -13, 3.2, '#1f6aa8', { flip: true }); eye2(c, 5.5, -13, 3.2, '#1f6aa8'); for (const [x, y] of [[-12, -8], [11, -6], [8, -20]]) E(c, x, y, 1.4, 1.4, 'rgba(255,255,255,.7)', false);
  },
  bat(c, p) {
    const f = S_(p, 3); c.translate(0, -16 + S_(p, 1) * 2);
    for (const s of [-1, 1]) { c.save(); c.scale(s, 1); SB(c, [[4, -2], [14, -14 - f * 8], [28, -14 - f * 10], [24, -4 - f * 4], [18, 2], [12, -1], [8, 3]], '#5a3a8a'); c.strokeStyle = 'rgba(30,10,60,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(5, -1); c.lineTo(26, -12 - f * 9); c.moveTo(6, 0); c.lineTo(20, -3 - f * 4); c.stroke(); c.restore(); }
    GE(c, 0, 0, 10, 10, '#4a2a78'); E(c, 0, 3, 6, 5, '#7a5aa8', false); SB(c, [[-8, -6], [-7, -17], [-2, -8]], '#4a2a78'); SB(c, [[8, -6], [7, -17], [2, -8]], '#4a2a78'); SB(c, [[-6.5, -8], [-6.4, -14], [-3.4, -9]], '#ff9ac8', { line: false }); SB(c, [[6.5, -8], [6.4, -14], [3.4, -9]], '#ff9ac8', { line: false });
    eye2(c, -4, -1, 3.2, '#ff4a6a', { flip: true }); eye2(c, 4, -1, 3.2, '#ff4a6a'); PL(c, [[-2.4, 4.4], [-1.2, 8], [0, 4.4]], '#fff', false); PL(c, [[2.4, 4.4], [1.2, 8], [0, 4.4]], '#fff', false);
  },
  fairy(c, p, e) {
    const b = S_(p, 1) * 2, f = S_(p, 4); c.translate(0, -14 + b);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -6, 24, '#9affc8', .35); c.restore();
    SB(c, [[-5, -8], [-18, -18 - f * 3], [-20, -6], [-9, -3]], 'rgba(210,255,240,.85)', { a: .5 }); SB(c, [[5, -8], [18, -18 - f * 3], [20, -6], [9, -3]], 'rgba(210,255,240,.85)', { a: .5 });
    SB(c, [[-5, 1], [5, 1], [6, 12], [0, 14], [-6, 12]], '#ff9ac8'); GE(c, 0, -7, 10.5, 9.5, SKIN, { line: true }); face2(c, -7, '#3ab88a', { r: 8.5 });
    SB(c, [[-10, -8], [-9, -17], [0, -20], [9, -17], [10, -8], [6, -10], [0, -13], [-6, -10]], '#ff6aa8'); hairShine(c, 0, -14, 6, 3);
    c.save(); c.translate(9, -2); c.rotate(.5); c.fillStyle = '#c9a54a'; c.fillRect(-.8, -10, 1.6, 12); star5(c, 0, -12, 3, '#fff27a', OUT); c.restore();
    sparkle(c, -14, -20 + S_(p, 2) * 2, 2.4, '#fff');
  },
  thief(c, p) {
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -26, 20, '#7aff9a', .15); c.restore();
    SB(c, [[-12, -2 + S_(p, 2)], [-6, 1], [0, -2], [6, 1], [12, -2 + S_(p, 2)], [10, -22], [-10, -22]], '#4a3a6a');
    GE(c, 0, -28, 11.5, 11, '#3a2c58'); E(c, 0, -27, 8, 6.5, '#1c1430', false); eye2(c, -3.2, -27, 2.8, '#7aff9a', { noLash: true }); eye2(c, 3.2, -27, 2.8, '#7aff9a', { noLash: true });
    SB(c, [[-12, -34], [0, -44], [12, -34], [7, -29], [-7, -29]], '#3a2c58'); SB(c, [[-8, -17], [8, -17], [9, -10], [-9, -10]], '#e8505a', { line: true }); PL(c, [[7, -15], [16, -12 + S_(p, 1) * 2], [9, -9]], '#e8505a');
    c.save(); c.translate(11, -12); c.rotate(.4); GP(c, [[-1.4, 0], [1.4, 0], [1.2, -10], [0, -13], [-1.2, -10]], '#dfe6f4'); c.fillStyle = '#7a4a2a'; c.fillRect(-2.4, 0, 4.8, 1.8); c.restore();
  },
  knight(c, p) {
    const b = S_(p, 1) * .5; c.translate(0, -b);
    GE(c, -5, -3, 4.4, 3.4, '#8a98b0'); GE(c, 5, -3, 4.4, 3.4, '#8a98b0');
    GP(c, [[-10, -4], [10, -4], [9, -25], [-9, -25]], '#aab8d0'); c.fillStyle = '#4a7ae0'; c.fillRect(-1.6, -25, 3.2, 21); c.fillStyle = '#ffd24a'; c.fillRect(-9.6, -13, 19.2, 2.4);
    GE(c, -10, -25, 5.6, 4.6, '#c8d4e8'); GE(c, 10, -25, 5.6, 4.6, '#c8d4e8');
    GE(c, 0, -32, 11.5, 10.5, '#c8d4e8'); c.fillStyle = '#2a3048'; rr(c, -8, -35, 16, 5, 2); c.fill(); eye2(c, -3.2, -32.5, 2, '#7acfff', { noLash: true }); eye2(c, 3.2, -32.5, 2, '#7acfff', { noLash: true }); hl(c, -5, -38, 3, 1.2, -.4, .7);
    SB(c, [[-3, -41], [0, -54 + S_(p, 1)], [4, -41]], '#e04a5a');
    SB(c, [[-19, -23], [-6, -23], [-6, -7], [-12.5, -2], [-19, -7]], '#4a7ae0'); c.fillStyle = '#ffe27a'; c.fillRect(-13.6, -21, 2.2, 14); c.fillRect(-17, -16, 8.4, 2.2);
  },
};
const BSPR = {
  treant(c, p) {
    c.rotate(S_(p, 1) * .025); E(c, 0, -1, 24, 5, 'rgba(0,0,0,.2)', false);
    GP(c, [[-15, 0], [15, 0], [10, -36], [-10, -36]], '#7a5232'); c.strokeStyle = '#5a3a20'; c.lineWidth = 1.4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 5, -4); c.lineTo(i * 4, -32); c.stroke(); }
    SB(c, [[-32, -48], [-28, -64], [-8, -74], [14, -74], [30, -62], [32, -46], [14, -36], [-14, -36]], '#3f9a4a'); SB(c, [[-18, -60], [-4, -70], [10, -68], [14, -56], [0, -52], [-14, -52]], '#6fd06a', { line: false }); SB(c, [[-6, -70], [8, -72], [10, -64], [-2, -62]], '#a6f08a', { line: false });
    eye2(c, -6, -30, 4, '#ffd84a', { noLash: true }); eye2(c, 6, -30, 4, '#ffd84a', { noLash: true }); c.strokeStyle = '#3a2210'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-5, -21); c.quadraticCurveTo(0, -17, 5, -21); c.stroke();
    SB(c, [[-14, -26], [-32, -40], [-28, -20]], '#6a4528'); SB(c, [[14, -26], [32, -40], [28, -20]], '#6a4528');
    for (const [x, y] of [[-18, -62], [8, -66], [20, -52], [-8, -54]]) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; E(c, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.8, 1.8, '#ff9ed2', false); } E(c, x, y, 1.4, 1.4, '#ffe27a', false); }
  },
  serpent(c, p, e) {
    const w = S_(p, 1); c.globalAlpha = e && e.invuln > 0 ? .35 : 1; E(c, 0, -1, 26, 5, 'rgba(0,0,0,.2)', false);
    c.strokeStyle = OUT; c.lineWidth = 17; c.lineCap = 'round'; c.beginPath(); c.moveTo(-26, -6); c.quadraticCurveTo(-14, -28 + w * 5, 0, -12); c.quadraticCurveTo(14, 2, 24, -14); c.stroke();
    c.strokeStyle = '#2a8ac8'; c.lineWidth = 14.5; c.stroke(); c.strokeStyle = '#7ad8ff'; c.lineWidth = 6; c.beginPath(); c.moveTo(-26, -8); c.quadraticCurveTo(-14, -30 + w * 5, 0, -14); c.quadraticCurveTo(14, 0, 24, -16); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-20 + i * 8, -12 - Math.sin(i) * 4, 3, 0, Math.PI); c.stroke(); }
    GE(c, 23, -30, 13.5, 11.5, '#2a8ac8'); GE(c, 25, -27, 8.4, 6, '#7ad8ff', { line: false }); eye2(c, 18, -34, 3.8, '#ffd84a', { noLash: true }); eye2(c, 27, -34, 3.4, '#ffd84a', { noLash: true });
    for (const [x, y] of [[13, -39], [19, -42], [27, -42]]) PL(c, [[x - 2, y], [x + 2, y - 12], [x + 4, y]], '#ffd84a'); c.globalAlpha = 1;
  },
  tengu(c, p) {
    c.translate(0, -S_(p, 1) * 1.6); E(c, 0, 2, 20, 4, 'rgba(0,0,0,.2)', false);
    SB(c, [[-8, -38], [-26, -32 + S_(p, 2) * 2], [-32, -14], [-18, -22], [-8, -14]], '#2a2a3a'); SB(c, [[8, -38], [26, -32 + S_(p, 2) * 2], [32, -14], [18, -22], [8, -14]], '#2a2a3a');
    GP(c, [[-13, -2], [13, -2], [10, -29], [-10, -29]], '#d85a2a'); c.fillStyle = '#fff'; c.fillRect(-2.4, -29, 4.8, 26); for (const y of [-24, -18, -12]) GE(c, 0, y, 2.6, 2.6, '#ffd24a', { lw: .8 });
    GE(c, 0, -39, 14.5, 13.5, '#e84a3a'); GP(c, [[-2, -38], [26, -34], [-2, -30]], '#e84a3a');
    eye2(c, -5.5, -41, 3.8, '#ffe27a', { noLash: true, flip: true }); eye2(c, 5.5, -41, 3.8, '#ffe27a', { noLash: true }); c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-10, -47); c.lineTo(-2, -44); c.moveTo(10, -47); c.lineTo(2, -44); c.stroke();
    SB(c, [[-12, -50], [0, -60], [12, -50], [8, -46], [-8, -46]], '#2a2a3a'); star5(c, 0, -54, 3.6, '#ffd84a', OUT);
    c.save(); c.translate(-16, -18); c.rotate(S_(p, 2) * .35); GP(c, [[0, 0], [-8, -16], [8, -16]], '#7ae0a8'); c.strokeStyle = '#fff'; c.lineWidth = 1; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(x * 1.4, -15); c.stroke(); } c.restore();
  },
  giant(c, p) {
    E(c, 0, -1, 28, 5, 'rgba(0,0,0,.2)', false); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -34, 46, '#bff4ff', .3 + S_(p, 1) * .06); c.restore();
    GE(c, -11, -4, 8.6, 6.4, '#8ac8e8'); GE(c, 11, -4, 8.6, 6.4, '#8ac8e8');
    SB(c, [[-19, -8], [-21, -26], [-14, -40], [0, -43], [14, -40], [21, -26], [19, -8], [0, -3]], '#a8dcf4'); GP(c, [[-14, -40], [14, -40], [8, -46], [-8, -46]], '#d8f4ff');
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -38); c.lineTo(-4, -22); c.lineTo(-9, -12); c.moveTo(9, -34); c.lineTo(5, -20); c.stroke();
    GE(c, 0, -50, 15.5, 13.5, '#c8ecfa'); eye2(c, -5.5, -50, 3.8, '#2a6aa8', { noLash: true, flip: true }); eye2(c, 5.5, -50, 3.8, '#2a6aa8', { noLash: true }); hl(c, -6, -57, 5, 2, -.4, .6);
    for (const [x, h] of [[-12, 14], [-4, 22], [4, 22], [12, 14]]) PL(c, [[x - 3.6, -58], [x, -58 - h], [x + 3.6, -58]], '#e6faff');
    GE(c, -25, -22 + S_(p, 1) * 3, 8.6, 9.6, '#a8dcf4'); GE(c, 25, -22 - S_(p, 1) * 3, 8.6, 9.6, '#a8dcf4'); E(c, -5, -28, 6, 3, 'rgba(255,255,255,.5)', false);
  },
  queen(c, p) {
    c.translate(0, -S_(p, 1) * 2); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -34, 42, '#b060ff', .35); c.restore();
    SB(c, [[-32, -2], [-14, -32], [14, -32], [32, -2], [14, 3 + S_(p, 2) * 2], [0, -2], [-14, 3 - S_(p, 2) * 2]], '#3a1a6a');
    SB(c, [[-12, -4], [12, -4], [8, -34], [-8, -34]], '#5a2a9a'); star5(c, 0, -20, 5.4, '#ffe27a', OUT); for (const [x, y] of [[-6, -10], [6, -26], [-5, -28]]) star5(c, x, y, 1.8, '#ffe9a0');
    SB(c, [[-17, -44], [-20, -22], [-11, -36]], '#2a1048'); SB(c, [[17, -44], [20, -22], [11, -36]], '#2a1048');
    GE(c, 0, -43, 13.5, 12.5, '#f2e6ff'); eye2(c, -5, -43, 3.8, '#ff4a9a', { flip: true }); eye2(c, 5, -43, 3.8, '#ff4a9a'); E(c, -8.6, -37.5, 2.4, 1.5, 'rgba(255,110,160,.5)', false); E(c, 8.6, -37.5, 2.4, 1.5, 'rgba(255,110,160,.5)', false);
    SB(c, [[-14, -50], [-11, -64], [-5, -55], [0, -68], [5, -55], [11, -64], [14, -50]], '#ffd84a'); GE(c, 0, -58, 2.6, 2.6, '#ff4a9a', { lw: .8 });
    for (let i = 0; i < 4; i++) sparkle(c, -30 + i * 20, -42 + S_(p + i * .25, 1) * 6, 3, 'rgba(220,190,255,.9)');
  },
};

// ---------- スプライトを画像にして使い回す（高密度な絵でも軽く動かすため） ----------
let FRAMES = PERF.lite ? 6 : 16; const LOOP = 1.5;   // かんたん表示は、ゆらゆらのコマ数を減らす
const SPR_CACHE = {}; let SPR_PX = 0;
// 絵の画像を取っておく量に上限をつける（スマホでメモリがあふれて、描画が失敗し続けるのを防ぐ）
function sprBudget() { return PERF.lite ? 9e6 : 20e6; }   // 画素数（×4バイト）
function sprEvict(force) {
  const ks = Object.keys(SPR_CACHE).sort((a, b) => SPR_CACHE[a].t - SPR_CACHE[b].t); let i = 0;
  const goal = force ? 0 : sprBudget() * 0.6;
  while (SPR_PX > goal && i < ks.length) { const o = SPR_CACHE[ks[i]]; if (!force && o.t > ART.t - 0.5) break; SPR_PX -= o.px; delete SPR_CACHE[ks[i]]; i++; }
  if (force) SPR_PX = 0;
}
function sprClearAll() { for (const k in SPR_CACHE) delete SPR_CACHE[k]; SPR_PX = 0; for (const k in GLOW_CACHE) delete GLOW_CACHE[k]; for (const k in RING_CACHE) delete RING_CACHE[k]; for (const k in STAR_CACHE) delete STAR_CACHE[k]; }
function sprVariant(t, anim) { if (PERF.lite && anim <= 0.02) return Math.floor(((t / LOOP) % 1 + 1) % 1 * FRAMES) % FRAMES; return anim > 0.02 ? 100 + Math.max(1, Math.min(4, Math.ceil(anim * 4))) : Math.floor((((t / LOOP) % 1) + 1) % 1 * FRAMES) % FRAMES; }
// ★3・★5・★7（能力が開花するたび）に、見た目が変わる：光→羽→金色の姿と冠
const EVO_SCALE = [1, 1.04, 1.09, 1.15];
function lightHex(h, t) { const [r, g, b] = hexToRgb(h).map(v => Math.round(v + (255 - v) * t)); return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
function evoTier(key, u) { return u && u.star && key !== 'egg' ? (u.star >= 7 ? 3 : u.star >= 5 ? 2 : u.star >= 3 ? 1 : 0) : 0; }
function getSprite(kind, key, size, variant, u) {
  const eg = kind === 'u' && key === 'egg' && u ? eggPhase(u) * 10 + (eggPhase(u) === 0 ? Math.min(2, u.hatch) : 0) : 0;
  const tier = kind === 'u' ? evoTier(key, u) : 0;
  const k = kind + '|' + key + '|' + Math.round(size) + '|' + variant + '|' + eg + (tier ? '|t' + tier : '');
  let o = SPR_CACHE[k]; if (o) { o.t = ART.t; return o; }
  const lw = Math.max(2, Math.ceil(size * (tier ? 2.7 : 2.3))), lh = Math.max(2, Math.ceil(size * (tier ? 2.0 : 1.65))), sc = Math.max(1, ART.sc), oy = Math.ceil(size * 0.22);
  if (SPR_PX > sprBudget()) sprEvict(false);
  let im = document.createElement('canvas'); im.width = Math.ceil(lw * sc); im.height = Math.ceil(lh * sc);
  let g = im.getContext('2d');
  if (!g) {   // メモリ不足でキャンバスが作れないとき：取っておいた絵を全部すてて、もう一度つくる
    sprEvict(true); im = document.createElement('canvas'); im.width = Math.ceil(lw * sc); im.height = Math.ceil(lh * sc); g = im.getContext('2d');
    if (!g) { im = document.createElement('canvas'); im.width = im.height = 2; return { im, lw, lh, oy, t: ART.t, px: 4 }; }
  }
  g.scale(sc, sc); g.translate(lw / 2, lh - oy); const s = size / 56; g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  const ph = variant >= 100 ? 0 : variant / FRAMES, a = variant >= 100 ? (variant - 100) / 4 : 0;
  const ec = tier ? ELEM[UNITS[key].elem].c : null;
  try {
    if (tier) evoBack(g, ec, tier, ph, key);
    if (tier) g.scale(EVO_SCALE[tier], EVO_SCALE[tier]);
    if (kind === 'u') SPRITES[key](g, ph, a, u ? { hatch: u.hatch, __ph: eggPhase(u) } : { hatch: 0, __ph: 0 });
    else if (kind === 'e') ESPR[key](g, ph, { invuln: 0, healFx: 0 });
    else BSPR[key](g, ph, { invuln: 0 });
  } catch (err) { console.error('sprite', kind, key, err); }
  if (tier) { try { g.setTransform(sc, 0, 0, sc, 0, 0); g.translate(lw / 2, lh - oy); g.scale(s, s); evoFront(g, ec, tier, ph, im, key); } catch (err) { console.error('evo', key, err); } }
  const px = im.width * im.height; SPR_PX += px;
  return SPR_CACHE[k] = { im, lw, lh, oy, t: ART.t, px };
}
function drawSprFrame(c, kind, key, x, y, size, flip, t, anim, u) {
  const o = getSprite(kind, key, size, sprVariant(t, anim), u);
  c.save(); c.translate(x, y); if (flip < 0) c.scale(-1, 1);
  c.drawImage(o.im, -o.lw / 2, -o.lh + o.oy, o.lw, o.lh); c.restore();
}
// UI などから使う簡易版（足元が (x, y)）
function drawSpriteAt(c, key, x, y, size, t, a, u, flip) { drawSprFrame(c, 'u', key, x, y, size, flip, t, a || 0, u); }
function drawEnemyIcon(c, type, x, y, size, t) { if (type === 'boss') drawSprFrame(c, 'b', STAGES[APP.stage].boss, x, y, size, 1, t, 0); else drawSprFrame(c, 'e', type, x, y, size, 1, t, 0); }

// ---------- ランクの星・足元の魔法陣 ----------
const STAR_CACHE = {};
function starImg(col, size) {
  const k = col + '|' + Math.round(size * 4); let im = STAR_CACHE[k]; if (im) return im;
  const px = Math.ceil(size * 2.6 * 2), sc = Math.max(1, ART.sc);
  im = document.createElement('canvas'); im.width = Math.ceil(px * sc); im.height = Math.ceil(px * sc); const g = im.getContext('2d'); g.scale(sc, sc);
  star5(g, px / 2, px / 2 + size * .08, size, col, 'rgba(70,40,10,.8)'); im.logical = px; return STAR_CACHE[k] = im;
}
function drawRankStars(c, x, y, star, size, t) {
  const gap = size * 1.7, x0 = x - (star - 1) * gap / 2;
  for (let i = 0; i < star; i++) {
    const col = star >= 7 ? `hsl(${Math.floor(((t * 120 + i * 50) % 360) / 30) * 30},95%,68%)` : star >= 5 ? '#ffe27a' : star >= 3 ? '#ffc24a' : '#e8efff';
    const im = starImg(col, size); c.drawImage(im, x0 + i * gap - im.logical / 2, y - im.logical / 2, im.logical, im.logical);
  }
}
const RING_CACHE = {};
function ringImg(ec, stars, rr0) {
  const k = ec + stars + '|' + Math.round(rr0); let im = RING_CACHE[k]; if (im) return im;
  const lr = Math.ceil(rr0) + 3, sc = Math.max(1, ART.sc);
  im = document.createElement('canvas'); im.width = im.height = Math.ceil(lr * 2 * sc); im.lr = lr;
  const c = im.getContext('2d'); c.scale(sc, sc); c.translate(lr, lr);
  c.strokeStyle = rgba(ec, .55 + stars * .05); c.lineWidth = 1.4 + stars * .2;
  c.beginPath(); c.arc(0, 0, rr0 * .82, 0, TAU); c.stroke(); c.setLineDash([3, 5]); c.beginPath(); c.arc(0, 0, rr0 * .6, 0, TAU); c.stroke(); c.setLineDash([]);
  if (stars >= 3) for (let i = 0; i < stars; i++) { const a = i / stars * TAU; c.fillStyle = rgba(ec, .9); c.beginPath(); c.arc(Math.cos(a) * rr0 * .82, Math.sin(a) * rr0 * .82, 1.6, 0, TAU); c.fill(); }
  return RING_CACHE[k] = im;
}
function drawUnit(c, u, S, t, sel) {
  const d = UNITS[u.key], ec = ELEM[d.elem].c;
  const stars = u.key === 'egg' ? 1 + eggPhase(u) : u.star;
  c.save(); c.translate(u.x, u.y + S * 0.28); c.scale(1, 0.5);
  const rr0 = S * (0.62 + (stars - 1) * 0.03), al = 0.28 + stars * 0.06;
  if (!PERF.lite) glowDot(c, 0, 0, rr0, ec, al + .15);
  if (!PERF.lite) c.rotate(t * (0.4 + stars * 0.1)); const ri = ringImg(ec, stars, rr0); c.drawImage(ri, -ri.lr, -ri.lr, ri.lr * 2, ri.lr * 2);
  c.restore();
  if (stars >= 5 && !PERF.lite) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, u.x, u.y - S * .5, S * (1 + (stars - 5) * .25), ec, .25 + (stars - 5) * .08); c.restore(); }
  if (stars >= 7 && !PERF.lite) {
    c.save(); c.translate(u.x, u.y - S * .55); c.globalAlpha = .55; const fl = Math.sin(t * 3) * .1;
    for (const sg of [-1, 1]) { c.save(); c.scale(sg, 1); c.rotate(fl); PL(c, [[4, 0], [S * .95, -S * .55], [S * .8, -S * .05], [S * .95, S * .3], [S * .45, S * .2]], 'rgba(255,245,170,.8)', false); c.restore(); }
    c.restore();
  }
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(u.x, u.y + S * .3, S * .36, S * .12, 0, 0, TAU); c.fill();
  const size = S * 1.6 * (u.key === 'egg' ? [0.8, 0.95, 1.1, 1.3][eggPhase(u)] : 1);
  if (u.sleep > 0) c.globalAlpha = .7;
  // 攻撃のとき：前にとびだす（近接は大きく）・ぴょんと跳ねる・ぐっと伸びる。ひと息のときは、ちょっとしずむ
  const fy = u.y + S * .3; let ox = 0, oy = 0, sx = 1, sy = 1;
  if (u.key !== 'egg') {
    if (u.anim > 0.02) { const k = u.anim, mel = UNITS[u.key].style === 'melee'; ox = u.face * (mel ? .55 : -.16) * S * k * k; oy = -S * (mel ? .18 : .12) * Math.sin(k * Math.PI); sx = 1 + .2 * k; sy = 1 - .1 * k; }
    else if (u.restT > 0) { const q = Math.sin(clamp(u.restT / .3, 0, 1) * Math.PI); sy = 1 - .05 * q; sx = 1 + .03 * q; }
  }
  c.save(); c.translate(u.x + ox, fy + oy); c.scale(sx, sy); c.translate(-u.x, -fy);
  drawSprFrame(c, 'u', u.key, u.x, fy, size, u.face, t + u.id * .37, u.anim, u);
  c.restore();
  c.globalAlpha = 1;
  const top = u.y - S * (u.key === 'egg' ? 1.1 + eggPhase(u) * .12 : 1.45);
  if (u.key !== 'egg' || eggPhase(u) > 0) drawRankStars(c, u.x, top, stars, S * (0.17 + (stars >= 5 ? .02 : 0)), t);
  if (u.sleep > 0) { c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('Zzz', u.x + 12, u.y - S * 1.1 - Math.sin(t * 4) * 3); }
  if (sel) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([4, 4]); c.lineDashOffset = -t * 20; c.beginPath(); c.ellipse(u.x, u.y + S * .28, S * .62, S * .34, 0, 0, TAU); c.stroke(); c.setLineDash([]); }
}
function drawEnemy(c, e, S, t) {
  const sz = e.r * 2.5, isBoss = !!e.boss, size = isBoss ? e.r * 3.3 : sz;
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * .5, e.r * .8, e.r * .26, 0, 0, TAU); c.fill();
  const dir = Math.abs(e.dx) > Math.abs(e.dy) ? (e.dx < 0 ? -1 : 1) : 1, kind = isBoss ? 'b' : 'e', key = isBoss ? e.boss : e.def.key;
  c.save();
  let al = 1; if (e.invis && e.reveal <= 0) al = .38; if (e.invuln > 0) al = .35; c.globalAlpha = al;
  drawSprFrame(c, kind, key, e.x, e.y + e.r * .55, size, dir, t + e.phase, 0);
  if (e.hit > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .6; drawSprFrame(c, kind, key, e.x, e.y + e.r * .55, size, dir, t + e.phase, 0); }
  c.restore();
  if (e.freeze > 0) { c.fillStyle = 'rgba(160,225,255,.45)'; c.strokeStyle = 'rgba(230,250,255,.9)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(e.x, e.y - e.r * .2, e.r * 1.05, e.r * 1.35, 0, 0, TAU); c.fill(); c.stroke(); }
  if (e.healFx > 0) glowRing(c, e.x, e.y - e.r * .3, e.r * 1.9, key === 'knight' ? '#bfe0ff' : '#9affc8', e.healFx * 1.4);
  if (e.shield > 0) { c.strokeStyle = 'rgba(190,230,255,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y - e.r * .3, e.r * 1.15, 0, TAU); c.stroke(); c.fillStyle = 'rgba(190,230,255,.15)'; c.fill(); }
  if (e.pois) { c.fillStyle = 'rgba(140,230,90,.9)'; for (let i = 0; i < Math.min(5, e.pois.n); i++) { c.beginPath(); c.arc(e.x - e.r * .7 + i * 4.5, e.y - e.r * 1.9 - ((t * 12 + i * 3) % 8), 1.8, 0, TAU); c.fill(); } }
  if (e.burn) { for (let i = 0; i < 3; i++) { const q = (t * 2 + i / 3) % 1; c.fillStyle = `rgba(255,${130 + i * 40},50,${.9 - q * .8})`; c.beginPath(); c.ellipse(e.x - e.r * .5 + i * e.r * .5, e.y - e.r * (.6 + q * 1.4), 2.4 * (1 - q) + .8, 3.6 * (1 - q) + 1, 0, 0, TAU); c.fill(); } }
  if (e.slowT > 0 && e.slowAmt > 0) { c.strokeStyle = 'rgba(150,225,255,.85)'; c.lineWidth = 1.6; c.beginPath(); c.arc(e.x, e.y + e.r * .5, e.r * .95, 0, TAU); c.stroke(); }
  if (e.stun > 0) { if (e.sleepMark > 0) { c.fillStyle = '#e0d0ff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('Zzz', e.x + e.r * .6, e.y - e.r * 1.6 - (t * 10 % 6)); } else for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; star5(c, e.x + Math.cos(a) * e.r * .8, e.y - e.r * 1.8 + Math.sin(a) * 3, 3, '#fff48a'); } }
  if (e.hp < e.maxhp || isBoss) {
    const w = Math.max(e.r * 2.2, 22), x = e.x - w / 2, y = e.y - e.r * (isBoss ? 3.1 : 2.1), h = isBoss ? 6 : 4, p = clamp(e.hp / e.maxhp, 0, 1);
    c.fillStyle = 'rgba(30,20,50,.75)'; rr(c, x - 1, y - 1, w + 2, h + 2, 3); c.fill();
    c.fillStyle = p > .5 ? '#6ee06e' : p > .25 ? '#ffd24a' : '#ff5a5a'; rr(c, x, y, w * p, h, 2); c.fill();
    if (e.shield > 0) { c.fillStyle = 'rgba(200,235,255,.9)'; rr(c, x, y - 2, w * clamp(e.shield / e.maxhp, 0, 1), 2, 1); c.fill(); }
  }
}
// 戦闘開始前に、使う絵を先に作っておく（ゲーム中のカクつき防止）
function warmSprites(form, S) {
  for (const k of form) for (let v = 0; v < FRAMES; v += 1) getSprite('u', k, S * 1.6, v, null);
  for (const k of form) for (let v = 101; v <= 104; v++) getSprite('u', k, S * 1.6, v, null);
}
