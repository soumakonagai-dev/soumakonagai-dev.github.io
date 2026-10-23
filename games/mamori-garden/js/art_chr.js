'use strict';
// ===== 仲間 24 体のデザイン（足元が原点・高さ約58。p=0〜1 のループ位相、a=攻撃モーション 0〜1） =====
const SPRITES = {
  // ---- 見習い剣士：赤いマフラーと大きな剣 ----
  sword(c, p, a) {
    const bob = S_(p, 1) * .8; c.translate(a * 2.5, -bob);
    SB(c, [[-3, -24], [-11, -22 + S_(p, 2) * 2], [-21, -15 + S_(p, 1) * 3], [-24, -9 + S_(p, 1) * 2], [-14, -14], [-6, -18]], '#e8505a');
    limb(c, -3.5, -10, -3.5, -4, 4.4, '#9a6a44'); limb(c, 3.5, -10, 3.5, -4, 4.4, '#9a6a44'); boots(c, '#5a3a24');
    GP(c, [[-8.5, -9], [8.5, -9], [7, -25], [-7, -25]], '#52b36e');
    PL(c, [[-8.5, -9], [-5.5, -5.5], [-2.5, -9], [.5, -5.5], [3.5, -9], [6.5, -5.5], [8.5, -9]], dk('#52b36e', .2));
    c.fillStyle = '#7a4a24'; c.fillRect(-7.8, -16, 15.6, 3); GE(c, 0, -14.5, 2.6, 2.1, '#ffd24a');
    PL(c, [[-6, -25], [0, -20.5], [6, -25], [4, -27], [-4, -27]], '#fff6e8');
    limb(c, -7, -23, -11.5, -15 + S_(p, 1), 3.8, '#52b36e'); hand(c, -11.5, -14 + S_(p, 1));
    SB(c, [[-15, -33], [-14, -45], [0, -50], [14, -45], [15, -33], [11, -27], [-11, -27]], '#8a4a2a');
    face2(c, -33, '#4a8cff', { brow: '#6a3a20' });
    SB(c, [[-13, -36], [-10, -46], [-5, -40], [0, -48], [5, -40], [10, -46], [13, -36], [8, -38], [0, -41], [-8, -38]], '#b0602e');
    hairShine(c, 0, -40, 9, 5);
    c.fillStyle = '#e04a4a'; c.fillRect(-13.5, -38, 27, 4); PL(c, [[13, -37.5], [21, -34 + S_(p, 2) * 2], [14, -33]], '#e04a4a'); GE(c, 0, -36, 3, 2, '#ffd24a');
    c.save(); c.translate(9, -20); c.rotate(-.85 + a * 2.3);
    limb(c, 0, 0, 0, -5, 3.8, '#52b36e'); hand(c, 0, -5.5);
    GP(c, [[-2.6, -8], [2.6, -8], [2.6, -34], [0, -39.5], [-2.6, -34]], '#e8f2ff'); c.fillStyle = 'rgba(120,170,230,.55)'; c.fillRect(-.4, -34, .8, 26);
    hl(c, -1.4, -26, .7, 8, 0, .8); GE(c, 0, -8, 6.5, 2.2, '#ffd24a'); c.fillStyle = '#6a3a1a'; c.fillRect(-1.5, -6, 3, 6); GE(c, 0, 1, 2, 2, '#ffd24a');
    c.restore();
    sparkle(c, 10 + a * 4, -44 - a * 3, 3 + a * 3, 'rgba(255,255,255,.95)');
  },
  // ---- 森の弓使い：フードとおさげ ----
  archer(c, p, a) {
    const bob = S_(p, 1) * .8; c.translate(-a * 2, -bob);
    SB(c, [[-4, -25], [-13, -22], [-15, -9], [-9, -5], [0, -7], [9, -5], [15, -9], [13, -22], [4, -25]], '#3f8a4a');
    limb(c, -3.5, -10, -3.5, -4, 4.2, '#6a4a30'); limb(c, 3.5, -10, 3.5, -4, 4.2, '#6a4a30'); boots(c, '#7a5230');
    PL(c, [[-8, -5], [-1, -5], [-2, -8], [-7, -8]], '#6fd06a'); PL(c, [[8, -5], [1, -5], [2, -8], [7, -8]], '#6fd06a');
    GP(c, [[-8, -9], [8, -9], [7, -25], [-7, -25]], '#58b858'); c.fillStyle = '#7a4a24'; c.fillRect(-7.5, -15.5, 15, 2.6); GE(c, 0, -14.2, 2, 2, '#ffe27a');
    GP(c, [[7, -24], [12, -23], [14, -9], [9, -8]], '#8a5a30'); for (const f of [[11, -24, '#fff'], [13, -25, '#ff9a8a'], [9, -25, '#bfe8ff']]) PL(c, [[f[0], f[1]], [f[0] + 2, f[1] - 9], [f[0] + 4, f[1]]], f[2], false);
    SB(c, [[-15, -33], [-14, -45], [0, -50], [14, -45], [15, -33], [20 + S_(p, 1) * 2, -20], [16, -8 + S_(p, 1) * 3], [11, -20], [11, -28], [-11, -28]], '#f2d26a');
    face2(c, -33, '#3fae6a', { brow: '#a88a30' });
    SB(c, [[-14, -34], [-12, -44], [-3, -40], [3, -43], [11, -42], [13, -34], [8, -37], [0, -40], [-8, -37]], '#f6dc82'); hairShine(c, 0, -41, 9, 5);
    SB(c, [[-16, -31], [-15, -47], [0, -55], [15, -47], [16, -31], [10, -38], [0, -43], [-10, -38]], '#3f8a4a');
    PL(c, [[7, -50], [18, -58], [13, -47]], '#fff7e8'); PL(c, [[10, -50], [20, -56], [15, -46]], '#ffb0a0'); GE(c, 0, -43, 2.6, 2.2, '#ffe27a');
    limb(c, -7, -23, -12, -19, 3.6, '#58b858'); hand(c, -13, -19);
    c.save(); c.translate(-12, -20); c.strokeStyle = OUT; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 15, -1.25, 1.25); c.stroke();
    c.strokeStyle = '#a0623a'; c.lineWidth = 2.6; c.beginPath(); c.arc(0, 0, 15, -1.25, 1.25); c.stroke();
    const sx = Math.cos(1.25) * 15, sy = Math.sin(1.25) * 15; c.strokeStyle = '#fff'; c.lineWidth = .9; c.beginPath(); c.moveTo(sx, -sy); c.lineTo(-a * 7 + 1, 0); c.lineTo(sx, sy); c.stroke();
    PL(c, [[-a * 7 + 1, -1], [13, 0], [-a * 7 + 1, 1]], '#c8ffd0', false); c.restore();
    limb(c, 7, -23, 2, -19, 3.6, '#58b858'); hand(c, -a * 7 - 10, -19, 2.2);
  },
  // ---- 炎の魔導士：とんがり帽子とふたつ結び ----
  mage(c, p, a) {
    const bob = S_(p, 1) * .8; c.translate(0, -bob);
    SB(c, [[-4, -24], [-13, -20 + S_(p, 2)], [-17, -8], [-10, -4], [0, -6], [10, -4], [17, -8], [13, -20 + S_(p, 2)], [4, -24]], '#a8324a');
    limb(c, -3, -9, -3, -3, 3.8, '#6a2a3a'); limb(c, 3, -9, 3, -3, 3.8, '#6a2a3a'); boots(c, '#4a1a2a');
    GP(c, [[-5, -23], [5, -23], [11, -5], [-11, -5]], '#e0496a'); c.fillStyle = '#ffd24a'; c.fillRect(-1, -23, 2, 18);
    for (const [x, y] of [[-6, -10], [6, -12], [-3, -17], [4, -7]]) star5(c, x, y, 1.8, '#ffe9a0');
    PL(c, [[-11, -5], [11, -5], [12, -2.5], [-12, -2.5]], '#ffd24a'); GP(c, [[-5, -23], [5, -23], [4, -19], [-4, -19]], '#ffd24a');
    SB(c, [[-17, -32], [-24, -22 + S_(p, 1) * 2], [-22, -12], [-16, -20], [-13, -30]], '#ff8a9a'); SB(c, [[17, -32], [24, -22 - S_(p, 1) * 2], [22, -12], [16, -20], [13, -30]], '#ff8a9a');
    SB(c, [[-14, -33], [-13, -45], [0, -49], [13, -45], [14, -33], [10, -27], [-10, -27]], '#ff8a9a');
    face2(c, -33, '#b04aff', { brow: '#c0506a' });
    SB(c, [[-14, -35], [-9, -44], [0, -41], [9, -44], [14, -35], [8, -38], [0, -37], [-8, -38]], '#ff9aa8'); hairShine(c, 0, -41, 9, 5);
    SB(c, [[-20, -39], [0, -47], [20, -39], [12, -36], [0, -38], [-12, -36]], '#7a2a6a');
    SB(c, [[-10, -42], [-6, -56], [2 + S_(p, 1) * 2, -66], [9, -42]], '#8a3278'); PL(c, [[-10, -41], [10, -41], [10, -38], [-10, -38]], '#ffd24a', false); GE(c, 0, -39.5, 2.4, 2.4, '#ff6a3a');
    sparkle(c, 3 + S_(p, 1) * 2, -56, 3, '#ffe27a');
    c.save(); c.translate(12, -12); c.rotate(-.12 - a * .6); c.fillStyle = '#7a4a22'; c.fillRect(-1.3, -30, 2.6, 42); GE(c, 0, -31, 4, 2.4, '#c9a54a');
    const f = 5 + a * 2 + S_(p, 2) * .8; orb(c, 0, -35 - f * .3, f, '#ff8a3a', '#fff1a0'); for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; E(c, S_(q, 1) * 3, -40 - q * 12, 1.4 * (1 - q), 1.4 * (1 - q), 'rgba(255,190,90,.9)', false); }
    c.restore(); limb(c, 6, -21, 10, -14, 3.6, '#e0496a'); hand(c, 11, -13);
  },
  // ---- 氷の精：雪の結晶の冠 ----
  ice(c, p, a) {
    const b = S_(p, 1) * 2.2; c.translate(0, -9 + b);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -17, 26, '#8fe0ff', .45); c.restore();
    for (let i = 0; i < 3; i++) { const q = p + i / 3, x = C_(q, 1) * 19, y = -17 + S_(q, 1) * 5, z = S_(q, 1); if (z > -.2) { PL(c, [[x, y - 5], [x + 2, y], [x, y + 5], [x - 2, y]], 'rgba(220,248,255,.95)'); } }
    GE(c, -14, -13 - a * 4, 3.6, 5.2, '#8fdcff'); GE(c, 14, -13 - a * 4, 3.6, 5.2, '#8fdcff');
    SB(c, [[-13, -17], [-12, -28], [0, -33], [12, -28], [13, -17], [10, -4], [0, -1], [-10, -4]], '#8fdcff');
    E(c, -4, -26, 6, 4.5, 'rgba(255,255,255,.5)', false); hl(c, 7, -10, 3, 1.6, .5, .35);
    PL(c, [[-12, -9], [-6, -4], [0, -9], [6, -4], [12, -9], [8, -13], [-8, -13]], 'rgba(240,252,255,.9)');
    eye2(c, -5, -18, 4.3, '#2a6af0', { flip: true }); eye2(c, 5, -18, 4.3, '#2a6af0');
    E(c, -9.5, -12.5, 2.4, 1.5, 'rgba(255,120,160,.5)', false); E(c, 9.5, -12.5, 2.4, 1.5, 'rgba(255,120,160,.5)', false);
    c.strokeStyle = '#3a5aa0'; c.lineWidth = 1; c.beginPath(); c.arc(0, -13, 1.6, .2, Math.PI - .2); c.stroke();
    PL(c, [[-10, -29], [-8, -41], [-4, -31], [0, -45], [4, -31], [8, -41], [10, -29]], '#f2fcff');
    for (const x of [-8, 0, 8]) sparkle(c, x, -34 - (x === 0 ? 8 : 4), 2.2, '#bff');
    sparkle(c, -18, -28 + S_(p, 2) * 2, 3, '#fff'); sparkle(c, 17, -36 + C_(p, 2) * 2, 2.4, '#bff');
  },
  // ---- 雷鳥：稲妻のとさか ----
  thunder(c, p, a) {
    const b = Math.abs(S_(p, 2)) * 1.6; c.translate(0, -b);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -24, 30, '#fff27a', .35); c.restore();
    SB(c, [[-9, -24], [-22, -33 - a * 6 + S_(p, 2) * 2], [-31, -22], [-25, -12], [-14, -12]], '#ffd23a'); SB(c, [[9, -24], [22, -33 - a * 6 + S_(p, 2) * 2], [31, -22], [25, -12], [14, -12]], '#ffd23a');
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) PL(c, [[s * (14 + i * 4), -17 - i], [s * (23 + i * 3), -19 - i * 2], [s * (19 + i * 3), -12 - i]], '#ff9a1e', false);
    SB(c, [[-14, -22], [-14, -33], [0, -40], [14, -33], [14, -22], [10, -8], [0, -5], [-10, -8]], '#ffe75e');
    SB(c, [[-8, -17], [0, -20], [8, -17], [6, -8], [0, -6], [-6, -8]], '#fff6c0', { line: false });
    PL(c, [[-4, -41], [-1, -55], [2, -43], [6, -52], [5, -40]], '#ffb81e'); PL(c, [[-3, -42], [0, -52], [2, -42]], '#fff27a', false);
    eye2(c, -5.5, -28, 4.4, '#ff7a1e', { flip: true }); eye2(c, 5.5, -28, 4.4, '#ff7a1e');
    PL(c, [[-3, -23], [3, -23], [0, -17]], '#ff9a1e'); hl(c, 0, -22, 1.2, .6, 0, .7);
    GE(c, -4, -3, 2.6, 3.4, '#ff9a1e'); GE(c, 4, -3, 2.6, 3.4, '#ff9a1e');
    c.strokeStyle = '#fff7a0'; c.lineWidth = 1.8; c.lineCap = 'round'; const k = Math.floor(p * 8) % 2;
    c.beginPath(); c.moveTo(-23, -38); c.lineTo(-18 + k, -33); c.lineTo(-22, -30); c.lineTo(-17, -24); c.stroke(); c.beginPath(); c.moveTo(23, -40); c.lineTo(19 - k, -35); c.lineTo(23, -32); c.lineTo(18, -26); c.stroke();
  },
  // ---- 毒キノコ：ひかる水玉のカサ ----
  poison(c, p, a) {
    c.rotate(S_(p, 1) * .04);
    for (let i = 0; i < 4; i++) { const q = (p * 2 + i / 4) % 1; E(c, -16 + i * 10 + S_(q, 1) * 3, -46 - q * 14, 1.6 + q, 1.6 + q, 'rgba(170,240,110,' + (.9 - q * .8) + ')', false); }
    GE(c, -5, -3, 3.8, 3, '#efe0ff'); GE(c, 5, -3, 3.8, 3, '#efe0ff');
    SB(c, [[-9, -22], [-10, -10], [-7, -4], [7, -4], [10, -10], [9, -22]], '#f8eedc'); hl(c, -4, -14, 1.6, 5, 0, .5);
    eye2(c, -3.8, -13, 3.2, '#7a3aff', { flip: true }); eye2(c, 3.8, -13, 3.2, '#7a3aff'); E(c, -7, -9.5, 2, 1.2, 'rgba(255,120,160,.5)', false); E(c, 7, -9.5, 2, 1.2, 'rgba(255,120,160,.5)', false);
    c.strokeStyle = '#a0504a'; c.lineWidth = 1; c.beginPath(); c.arc(0, -9.5, 1.5, .2, Math.PI - .2); c.stroke();
    limb(c, -9, -12, -15, -8 - a * 6, 3.2, '#f8eedc'); limb(c, 9, -12, 15, -8 - a * 6, 3.2, '#f8eedc');
    GE(c, 0, -30 - a * 2, 21, 13, '#9a4ad0'); E(c, 0, -25, 21, 5, '#6a2aa0', false); c.save(); c.beginPath(); c.ellipse(0, -30 - a * 2, 21, 13, 0, 0, TAU); c.clip();
    for (const [x, y, r] of [[-11, -34, 4], [3, -39, 4.6], [12, -31, 3.4], [-3, -29, 2.4]]) { orb(c, x, y - a * 2, r * .9, '#f6e6ff', '#fff'); } c.restore();
    hl(c, -9, -38 - a * 2, 6, 2, -.5, .35); c.strokeStyle = OUT; c.lineWidth = 1.3; c.beginPath(); c.ellipse(0, -30 - a * 2, 21, 13, 0, 0, TAU); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -30, 30, '#c070ff', .22); c.restore();
  },
  // ---- 鎧砕きゴーレム：苔むした岩のからだ ----
  golem(c, p, a) {
    const b = S_(p, 1) * .6; c.translate(0, -b);
    GE(c, -8, -4, 7, 5, '#8c7a66'); GE(c, 8, -4, 7, 5, '#8c7a66');
    SB(c, [[-15, -9], [-17, -22], [-12, -33], [0, -35], [12, -33], [17, -22], [15, -9], [0, -6]], '#a89478');
    SB(c, [[-13, -28], [-6, -34], [2, -30], [-4, -26]], '#6fa04a', { line: false }); SB(c, [[8, -34], [14, -28], [11, -25], [5, -30]], '#58904a', { line: false });
    c.strokeStyle = 'rgba(70,50,40,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, -30); c.lineTo(-6, -22); c.lineTo(-10, -15); c.moveTo(10, -24); c.lineTo(7, -17); c.stroke();
    const gl = .55 + S_(p, 1) * .2; E(c, 0, -19, 5, 7, 'rgba(255,138,42,' + gl + ')', false); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -19, 15, '#ff8a2a', gl); c.restore(); PL(c, [[-2.4, -21], [0, -25], [2.4, -21], [0, -14]], '#fff0b0', false);
    PL(c, [[-12, -30], [-9, -42], [-5, -32]], '#79e0ff'); PL(c, [[-9, -31], [-8, -37], [-6.5, -31]], '#d8f8ff', false);
    GE(c, 0, -41, 13, 11, '#b8a488'); eye2(c, -5, -42, 3.6, '#ff8a2a', { noLash: true, flip: true }); eye2(c, 5, -42, 3.6, '#ff8a2a', { noLash: true });
    c.fillStyle = '#6a5a48'; c.fillRect(-4, -34, 8, 1.6); PL(c, [[-5, -47], [0, -53], [5, -47]], '#8a7a62');
    const up = a * 14; limb(c, -14, -26, -21, -16 - up, 6, '#98846a'); limb(c, 14, -26, 21, -16 - up, 6, '#98846a');
    GE(c, -21, -14 - up, 6.8, 7, '#98846a'); GE(c, 21, -14 - up, 6.8, 7, '#98846a'); c.fillStyle = '#6a6a78'; c.fillRect(-26, -15 - up, 10, 2.6); c.fillRect(16, -15 - up, 10, 2.6);
  },
  // ---- 星の狙撃手：星のコートと長い銃 ----
  sniper(c, p, a) {
    c.translate(-a * 2.5, -S_(p, 1) * .7);
    SB(c, [[-5, -25], [-13, -20 + S_(p, 2)], [-19 + S_(p, 1) * 2, -8], [-12, -3], [-6, -8]], '#2c2c5e');
    limb(c, -3, -10, -3, -4, 4, '#2a2a4a'); limb(c, 3, -10, 3, -4, 4, '#2a2a4a'); boots(c, '#1a1a38');
    GP(c, [[-9, -8], [9, -8], [8, -25], [-8, -25]], '#3a3a78'); c.fillStyle = '#ffe27a'; c.fillRect(-1, -25, 2, 17); for (const [x, y] of [[-5, -13], [5, -16], [-4, -20]]) star5(c, x, y, 1.9, '#ffe9a0');
    PL(c, [[-9, -8], [9, -8], [10, -5], [-10, -5]], '#ffe27a'); PL(c, [[-7, -25], [0, -19], [7, -25], [5, -27], [-5, -27]], '#2c2c5e');
    SB(c, [[-15, -33], [-14, -45], [0, -49], [14, -45], [15, -33], [11, -27], [-11, -27]], '#fff7e0'); face2(c, -33, '#ffcf3a', { brow: '#b8a060' });
    SB(c, [[-14, -35], [-10, -44], [0, -41], [10, -44], [14, -35], [8, -38], [0, -37], [-8, -38]], '#fffaf0'); hairShine(c, 0, -41, 9, 5);
    c.fillStyle = 'rgba(154,216,255,.85)'; rr(c, -11, -37, 9, 6, 2); c.fill(); rr(c, 2, -37, 9, 6, 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; rr(c, -11, -37, 9, 6, 2); c.stroke(); rr(c, 2, -37, 9, 6, 2); c.stroke(); hl(c, -8, -35, 2, .8, -.4, .8); hl(c, 5, -35, 2, .8, -.4, .8);
    SB(c, [[-19, -41], [0, -50], [19, -41], [12, -37], [0, -40], [-12, -37]], '#2c2c5e'); SB(c, [[-9, -44], [0, -58], [9, -44]], '#34346e'); star5(c, 0, -49, 4.4, '#ffe27a', OUT);
    c.save(); c.translate(7, -18); c.rotate(-.05 - a * .1); limb(c, -5, 1, 4, 0, 3.4, '#3a3a78'); GP(c, [[-4, -2.5], [34, -2.5], [34, 2.5], [-4, 2.5]], '#4a4a6a'); c.fillStyle = '#ffe27a'; c.fillRect(24, -3.6, 9, 7.2); GP(c, [[6, -6], [18, -6], [18, -2.5], [6, -2.5]], '#2a2a48'); E(c, 12, -6.5, 3.4, 1.6, '#9ad8ff', false);
    if (a > .3) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 36, 0, 14, '#fff2a0', a); c.restore(); } hand(c, 2, 1); c.restore();
  },
  // ---- 風の精：葉っぱの羽 ----
  wind(c, p, a) {
    const b = S_(p, 1) * 2.4; c.translate(0, -9 + b);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -17, 26, '#9affc8', .4); c.restore();
    const fl = S_(p, 2) * .16;
    for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.rotate(fl); SB(c, [[5, -18], [26, -34], [31, -22], [22, -10]], 'rgba(150,245,190,.85)', { a: .5 }); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .9; c.beginPath(); c.moveTo(6, -17); c.lineTo(27, -26); c.moveTo(8, -16); c.lineTo(24, -16); c.stroke(); c.restore(); }
    SB(c, [[-12, -18], [-11, -29], [0, -32], [11, -29], [12, -18], [9, -6], [0, -3], [-9, -6]], '#8ff0b6'); E(c, -3, -25, 6, 4.5, 'rgba(255,255,255,.5)', false);
    eye2(c, -4.6, -18, 4, '#1f9a60', { flip: true }); eye2(c, 4.6, -18, 4, '#1f9a60'); E(c, -9, -12.5, 2.3, 1.4, 'rgba(255,120,160,.5)', false); E(c, 9, -12.5, 2.3, 1.4, 'rgba(255,120,160,.5)', false);
    for (const x of [-7, 0, 7]) SB(c, [[x - 3, -29], [x, -38 - (x === 0 ? 5 : 0)], [x + 3, -29]], '#4fd88a');
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.7; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const y = 2 + i * 3.4, sh = S_(p, 1) * 3 * (i % 2 ? -1 : 1); c.beginPath(); c.moveTo(-12 + sh, y); c.quadraticCurveTo(-4 + sh, y - 3, 2 + sh, y); c.quadraticCurveTo(7 + sh, y + 2.4, 12 + sh, y - 1); c.stroke(); }
    for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; PL(c, [[-18 + q * 36, -8 - S_(q, 2) * 6], [-16 + q * 36, -10 - S_(q, 2) * 6], [-14 + q * 36, -8 - S_(q, 2) * 6]], '#d8ffe4', false); }
  },
  // ---- 歌姫セイレーン：ひれの尾と貝の冠 ----
  siren(c, p, a) {
    const sw = S_(p, 1) * 3, fl = S_(p, 2) * 2.5;
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -20, 28, '#7af0ff', .3); c.restore();
    SB(c, [[-6, -8], [6, -8], [11 + sw, 2], [20 + sw, 1 + fl], [13 + sw, 5], [18 + sw, 9 - fl], [0, 4], [-18 + sw, 9 + fl], [-13 + sw, 5], [-20 + sw, 1 - fl], [-11 + sw, 2]], '#37c8c0');
    GP(c, [[-7, -8], [7, -8], [5.5, -24], [-5.5, -24]], '#37c8c0'); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) { c.beginPath(); c.arc(j * 3.2, -10 - i * 4.5, 2.2, 0, Math.PI); c.stroke(); }
    SB(c, [[-6.5, -22], [6.5, -22], [8, -27], [0, -30], [-8, -27]], '#ff9ec8'); GE(c, -3, -26, 2.4, 2.4, '#ffd0e4'); GE(c, 3, -26, 2.4, 2.4, '#ffd0e4');
    SB(c, [[-16, -34], [-17, -8 + sw], [-12, -3 + sw * .6], [-8, -16], [-10, -28]], '#26b8c8'); SB(c, [[16, -34], [17, -8 + sw], [12, -3 + sw * .6], [8, -16], [10, -28]], '#26b8c8');
    SB(c, [[-15, -34], [-14, -46], [0, -50], [14, -46], [15, -34], [11, -27], [-11, -27]], '#2cc0d0'); face2(c, -33, '#ff6aa0', { brow: '#1a8aa0' });
    SB(c, [[-14, -35], [-9, -45], [0, -42], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#46d4e0'); hairShine(c, 0, -42, 9, 5);
    GE(c, -7, -45, 6, 4.2, '#46d4e0'); GE(c, 7, -45, 6, 4.2, '#46d4e0');
    SB(c, [[-6, -45], [-3, -52], [0, -47], [3, -52], [6, -45]], '#ffe0f0'); GE(c, 0, -47, 2.4, 2.4, '#fff'); for (const x of [-4, 4]) E(c, x, -29.5, 1.1, 1.1, '#fff', false);
    c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffe27a'; for (const [x, k] of [[17, 0], [-18, .5]]) { const q = (p + k) % 1; c.globalAlpha = Math.sin(q * Math.PI); c.fillText(k ? '♫' : '♪', x, -36 - q * 14); } c.globalAlpha = 1;
    for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; E(c, -12 + i * 12 + S_(q, 1) * 2, -10 - q * 18, 1.5, 1.5, 'rgba(255,255,255,' + (.7 - q * .6) + ')', false); }
  },
  // ---- 光の司祭：金の縁どりの白いローブ ----
  priest(c, p, a) {
    c.translate(0, -S_(p, 1) * .7);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -38, 24, '#fff3a0', .35); c.restore();
    SB(c, [[-5, -25], [-12, -20], [-16 + S_(p, 1) * 2, -6], [0, -2], [16 - S_(p, 1) * 2, -6], [12, -20], [5, -25]], '#f3ecd8');
    limb(c, -3, -10, -3, -4, 4, '#c9b88a'); limb(c, 3, -10, 3, -4, 4, '#c9b88a');
    SB(c, [[-8, -23], [8, -23], [13, -5], [0, -2], [-13, -5]], '#fffaf0'); c.fillStyle = '#f2c94a'; c.fillRect(-1.2, -23, 2.4, 20); PL(c, [[-13, -5], [13, -5], [14, -2.5], [-14, -2.5]], '#f2c94a');
    GP(c, [[-8, -23], [8, -23], [5, -19], [-5, -19]], '#f2c94a'); star5(c, 0, -15, 2.4, '#f2c94a', OUT);
    SB(c, [[-16, -34], [-17, -12 + S_(p, 1) * 2], [-12, -9], [-9, -26], [-11, -30]], '#e8ecf8'); SB(c, [[16, -34], [17, -12 + S_(p, 1) * 2], [12, -9], [9, -26], [11, -30]], '#e8ecf8');
    SB(c, [[-15, -34], [-14, -46], [0, -50], [14, -46], [15, -34], [11, -27], [-11, -27]], '#eef0fa'); face2(c, -33, '#6ab8ff', { brow: '#a0a8c0' });
    SB(c, [[-14, -35], [-9, -45], [0, -42], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#f8faff'); hairShine(c, 0, -42, 9, 5, .6);
    c.strokeStyle = '#ffe27a'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, -52 + S_(p, 1), 10, 3.2, 0, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,250,200,.8)'; c.lineWidth = 1; c.stroke();
    c.save(); c.translate(-14, -22 - a * 2); GE(c, 0, 0, 5.5, 7, '#7a4aa0'); c.fillStyle = '#f2c94a'; c.fillRect(-1, -7, 2, 14); c.fillRect(-4, -1, 8, 2); c.restore();
    c.save(); c.translate(14, -12); c.fillStyle = '#c9a54a'; c.fillRect(-1.2, -30, 2.4, 42); GE(c, 0, -33, 3.4, 3.4, '#f2c94a'); orb(c, 0, -39, 4.6 + a * 3, '#fff7b0', '#fff'); sparkle(c, 0, -39, 8 + a * 5, 'rgba(255,255,255,.9)'); c.restore();
    limb(c, 8, -22, 13, -13, 3.6, '#fffaf0'); hand(c, 14, -12);
  },
  // ---- 金ねずみ：商人のチョッキと金貨 ----
  mouse(c, p, a) {
    c.rotate(S_(p, 1) * .04);
    c.strokeStyle = OUT; c.lineWidth = 4.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, -5); c.quadraticCurveTo(24, -3 + S_(p, 2) * 4, 19, -20); c.stroke(); c.strokeStyle = '#e8a63a'; c.lineWidth = 2.4; c.stroke(); E(c, 19, -21, 3.4, 3.4, '#ffe14a');
    GE(c, -4, -3, 3.6, 3, '#e8b84a'); GE(c, 4, -3, 3.6, 3, '#e8b84a');
    GE(c, 0, -14, 11.5, 12, '#ffd96a'); E(c, 0, -11, 7.5, 8, '#fff2c0', false);
    GP(c, [[-9, -17], [9, -17], [8, -6], [-8, -6]], '#c8501e', { line: true }); c.fillStyle = '#ffd24a'; for (const y of [-15, -11, -7]) E(c, 0, y, 1.1, 1.1, '#ffd24a', false);
    GE(c, -10, -31, 7.4, 7.4, '#ffd96a'); GE(c, 10, -31, 7.4, 7.4, '#ffd96a'); E(c, -10, -31, 4.4, 4.4, '#ffb0c0', false); E(c, 10, -31, 4.4, 4.4, '#ffb0c0', false);
    GE(c, 0, -26, 13.5, 11.5, '#ffd96a'); eye2(c, -5, -27, 3.8, '#7a3a1a', { flip: true }); eye2(c, 5, -27, 3.8, '#7a3a1a');
    E(c, 0, -21.5, 1.7, 1.3, '#ff7a8a', false); E(c, -9, -22.5, 2.4, 1.5, 'rgba(255,110,140,.55)', false); E(c, 9, -22.5, 2.4, 1.5, 'rgba(255,110,140,.55)', false);
    c.strokeStyle = 'rgba(120,70,30,.7)'; c.lineWidth = .8; for (const s of [-1, 1]) for (const dy of [-1, 1]) { c.beginPath(); c.moveTo(s * 5, -21); c.lineTo(s * 14, -21 + dy * 2.6); c.stroke(); }
    SB(c, [[-8, -37], [-7, -46], [0, -48], [7, -46], [8, -37]], '#3a2a5a'); PL(c, [[-12, -37], [12, -37], [11, -35], [-11, -35]], '#3a2a5a'); c.fillStyle = '#ffd24a'; c.fillRect(-8, -40, 16, 2.4);
    GE(c, 13, -8 - a * 6, 6, 6, '#ffe14a'); c.fillStyle = '#b8860b'; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('G', 13, -5 - a * 6); sparkle(c, 17, -14 - a * 6, 2.4, '#fff');
  },
  // ---- 死神：ぼろぼろのマントと光る鎌 ----
  reaper(c, p, a) {
    c.translate(0, -S_(p, 1) * 2);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -26, 30, '#a060ff', .3); c.restore();
    SB(c, [[-12, -24], [-17, -8], [-14 + S_(p, 2) * 2, 2], [-8, -3], [-4, 3 - S_(p, 2) * 2], [0, -3], [4, 3 + S_(p, 2) * 2], [8, -3], [14 - S_(p, 2) * 2, 2], [17, -8], [12, -24]], '#3a2a5a');
    SB(c, [[-6, -22], [6, -22], [9, -6], [0, -3], [-9, -6]], '#2a1c48', { line: false }); GE(c, 0, -18, 2.4, 2.4, '#e0d0ff'); E(c, 0, -17.5, 1, 1.4, '#2a1c48', false);
    SB(c, [[-15, -33], [-14, -46], [0, -52], [14, -46], [15, -33], [11, -25], [-11, -25]], '#3e2c68');
    GE(c, 0, -33, 10.5, 10, '#ece2ff', { a: .2 }); E(c, -3.8, -34, 3.2, 3.8, '#241238', false); E(c, 3.8, -34, 3.2, 3.8, '#241238', false); for (const x of [-3.8, 3.8]) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, -34, 7, '#ff4a9a', .9); c.restore(); E(c, x, -34, 1.5, 2.2, '#ff7ab8', false); }
    c.strokeStyle = '#3a2a58'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2.4, -27); c.lineTo(2.4, -27); c.moveTo(-1, -29); c.lineTo(-1, -26); c.moveTo(1, -29); c.lineTo(1, -26); c.stroke();
    SB(c, [[-17, -32], [-12, -48], [0, -54], [12, -48], [17, -32], [10, -42], [0, -45], [-10, -42]], '#4a3478'); sparkle(c, 0, -47, 2.6, '#ff9ad0');
    c.save(); c.translate(15, -22); c.rotate(.15 - a * .95); c.fillStyle = '#5a4a7a'; c.fillRect(-1.3, -30, 2.6, 46); c.strokeStyle = OUT; c.lineWidth = .8; c.strokeRect(-1.3, -30, 2.6, 46);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, -10, -28, 16, '#c8a0ff', .6); c.restore();
    SB(c, [[0, -31], [-12, -37], [-24, -26], [-22, -16], [-13, -26], [0, -24]], '#e0d0ff'); hl(c, -14, -30, 7, 1.4, -.5, .8); c.restore();
    limb(c, 10, -22, 15, -20, 3.4, '#3e2c68'); GE(c, 15, -21, 2.6, 2.6, '#ece2ff');
    for (let i = 0; i < 4; i++) { const q = (p + i / 4) % 1; E(c, -13 + i * 8.6 + S_(q, 1) * 2, -2 - q * 20, 2.2 * (1 - q) + .4, 3.4 * (1 - q) + .4, 'rgba(190,130,255,' + (.7 - q * .6) + ')', false); }
  },
};
