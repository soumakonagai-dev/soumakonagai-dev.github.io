'use strict';
// ===== 新キャラ用のデザイン生成器（髪型・帽子・服・背中・武器のパーツを組み合わせる） =====
const HB = [[-14, -33], [-13, -45], [0, -49], [13, -45], [14, -33], [10, -27], [-10, -27]];
const BANGS = [[-14, -35], [-9, -44], [0, -41], [9, -44], [14, -35], [8, -38], [0, -37], [-8, -38]];
const mirror = pts => pts.map(p => [-p[0], p[1]]);

const HAIR = [
  { back: (c, p, col) => SB(c, HB, col), front: (c, p, col) => { SB(c, BANGS, lt(col, .1)); hairShine(c, 0, -41, 9, 5); } },                         // 0 ショート
  { back: (c, p, col) => { const s = S_(p, 1); SB(c, [[-15, -33], [-14, -46], [0, -50], [14, -46], [15, -33], [17, -18 + s * 2], [13, -4 + s * 3], [7, -12], [-7, -12], [-13, -4 - s * 3], [-17, -18 - s * 2]], col); }, front: (c, p, col) => { SB(c, BANGS, lt(col, .1)); hairShine(c, 0, -41, 9, 5); } },   // 1 ロング
  { back: (c, p, col) => { const s = S_(p, 1) * 2, t = [[-12, -38], [-22, -36], [-27 + s, -22], [-24, -11 + s], [-19, -22], [-13, -30]]; SB(c, HB, col); SB(c, t, col); SB(c, mirror(t), col); }, front: (c, p, col) => { SB(c, BANGS, lt(col, .1)); hairShine(c, 0, -41, 9, 5); } },   // 2 ツインテール
  { back: (c, p, col) => SB(c, [[-16, -33], [-16, -44], [0, -50], [16, -44], [16, -26], [10, -23], [-10, -23], [-16, -26]], col), front: (c, p, col) => { SB(c, [[-14, -37], [-9, -45], [0, -42], [9, -45], [14, -37], [10, -34], [0, -35], [-10, -34]], lt(col, .1)); hairShine(c, 0, -42, 9, 5); } },  // 3 ボブ
  { back: (c, p, col) => { const s = S_(p, 1) * 3; SB(c, HB, col); SB(c, [[12, -42], [22, -38], [26 + s, -24], [21, -16 + s], [17, -28], [12, -34]], col); }, front: (c, p, col) => { SB(c, BANGS, lt(col, .1)); hairShine(c, 0, -41, 9, 5); } },   // 4 ポニーテール
  { back: (c, p, col) => SB(c, HB, col), front: (c, p, col) => { SB(c, [[-13, -36], [-10, -46], [-5, -40], [0, -48], [5, -40], [10, -46], [13, -36], [8, -38], [0, -41], [-8, -38]], lt(col, .1)); hairShine(c, 0, -42, 8, 4); } },   // 5 ツンツン
  { back: (c, p, col) => { SB(c, HB, col); GE(c, 0, -52, 5.8, 5.4, col); }, front: (c, p, col) => { SB(c, BANGS, lt(col, .1)); hairShine(c, 0, -41, 9, 5); } },   // 6 おだんご
  { back: (c, p, col) => { const s = S_(p, 1) * 2; SB(c, [[-15, -33], [-14, -46], [0, -50], [14, -46], [15, -33], [19, -24], [15, -16 + s], [19, -8], [12, -3 + s], [7, -12], [-7, -12], [-12, -3 - s], [-19, -8], [-15, -16 - s], [-19, -24]], col); }, front: (c, p, col) => { SB(c, BANGS, lt(col, .1)); hairShine(c, 0, -41, 9, 5); } },  // 7 ウェーブ
];

const HEAD = {
  witch(c, p, s) { SB(c, [[-20, -39], [0, -47], [20, -39], [12, -36], [0, -38], [-12, -36]], s.hg); SB(c, [[-10, -42], [-6, -56], [2 + S_(p, 1) * 2, -66], [9, -42]], lt(s.hg, .1)); c.fillStyle = s.o2; c.fillRect(-10, -42, 20, 3); GE(c, 0, -40.5, 2.4, 2.4, '#ffe27a'); },
  helm(c, p, s) { SB(c, [[-14, -35], [-14, -47], [0, -53], [14, -47], [14, -35], [10, -37], [0, -41], [-10, -37]], s.hg); GP(c, [[-3, -36], [3, -36], [3, -42], [-3, -42]], dk(s.hg, .3), { line: false }); hl(c, -6, -47, 4, 1.6, -.4, .6); SB(c, [[-3, -52], [0, -64 + S_(p, 1)], [3, -52]], s.o2); },
  crown(c, p, s) { PL(c, [[-10, -42], [-11, -52], [-5, -46], [0, -54], [5, -46], [11, -52], [10, -42]], '#ffd24a'); for (const x of [-5, 0, 5]) E(c, x, -45, 1.4, 1.4, s.o2, false); },
  band(c, p, s) { c.fillStyle = s.hg; c.fillRect(-14, -39, 28, 4); GE(c, 0, -37, 3, 2.2, s.o2); PL(c, [[14, -37.5], [22, -34 + S_(p, 2) * 2], [15, -33]], s.hg); },
  flower(c, p, s) { for (const [x, y, col] of [[-10, -43, '#ff9ed2'], [-4, -47, '#fff27a'], [4, -47, s.hg], [10, -43, '#b9a0ff']]) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; E(c, x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 1.7, 1.7, col, false); } E(c, x, y, 1.3, 1.3, '#ffd24a', false); } },
  cat(c, p, s) { for (const sg of [-1, 1]) { GP(c, [[sg * 14, -36], [sg * 12, -50], [sg * 4, -42]], s.hg); PL(c, [[sg * 12, -39], [sg * 11, -46], [sg * 7, -41]], '#ffb0c8', false); } },
  fox(c, p, s) { for (const sg of [-1, 1]) { GP(c, [[sg * 14, -38], [sg * 11, -56], [sg * 3, -43]], s.hg); PL(c, [[sg * 12, -41], [sg * 10.6, -51], [sg * 6, -44]], '#fff0d8', false); } },
  horn(c, p, s) { for (const sg of [-1, 1]) { c.save(); c.scale(sg, 1); c.strokeStyle = OUT; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, -43); c.quadraticCurveTo(16, -46, 17, -56); c.stroke(); c.strokeStyle = s.hg; c.lineWidth = 3; c.stroke(); c.restore(); } },
  halo(c, p, s) { c.strokeStyle = '#ffe27a'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, -52 + S_(p, 1), 10, 3.2, 0, 0, TAU); c.stroke(); },
  goggle(c, p, s) { c.fillStyle = '#6a4a2a'; c.fillRect(-15, -44, 30, 3.4); for (const x of [-6.5, 6.5]) { GE(c, x, -43, 5.4, 5.4, '#c9a54a'); E(c, x, -43, 3.4, 3.4, 'rgba(154,255,200,.85)', false); hl(c, x - 1, -44.4, 1.2, 1, 0, .9); } },
  beret(c, p, s) { SB(c, [[-17, -40], [-12, -48], [0, -52], [14, -48], [20, -40], [10, -40], [0, -42], [-10, -40]], s.hg); GE(c, 0, -52, 2, 2, s.hg); },
  hood(c, p, s) { SB(c, [[-16, -31], [-15, -47], [0, -55], [15, -47], [16, -31], [10, -38], [0, -43], [-10, -38]], s.hg); },
  tiara(c, p, s) { PL(c, [[-8, -42], [-6, -49], [0, -45], [6, -49], [8, -42]], '#ffd24a'); GE(c, 0, -46, 2.2, 2.2, s.o2); },
  turban(c, p, s) { SB(c, [[-15, -38], [-14, -48], [0, -54], [14, -48], [15, -38], [8, -40], [0, -42], [-8, -40]], s.hg); c.strokeStyle = dk(s.hg, .3); c.lineWidth = 1; c.beginPath(); c.moveTo(-12, -42); c.quadraticCurveTo(0, -48, 12, -44); c.stroke(); GE(c, 0, -45, 2.6, 2.6, s.o2); },
  ninja(c, p, s) { c.fillStyle = s.hg; c.fillRect(-14, -39, 28, 5); GP(c, [[-6, -39.5], [6, -39.5], [6, -34.5], [-6, -34.5]], '#c8d0e0'); SB(c, [[-12, -27], [12, -27], [10, -22], [0, -19], [-10, -22]], s.hg); PL(c, [[14, -37], [24, -35 + S_(p, 2) * 3], [16, -33]], s.o2); },
  mask(c, p, s) { SB(c, [[-12, -37], [12, -37], [11, -30], [0, -28], [-11, -30]], s.hg, { a: .2 }); },
  straw(c, p, s) { GE(c, 0, -41, 21, 5.5, s.hg); SB(c, [[-11, -42], [-9, -52], [0, -55], [9, -52], [11, -42]], lt(s.hg, .1)); c.fillStyle = s.o2; c.fillRect(-11, -45, 22, 2.6); },
  top(c, p, s) { GE(c, 0, -41, 17, 4, s.hg); GP(c, [[-10, -41], [-10, -58], [10, -58], [10, -41]], s.hg); c.fillStyle = s.o2; c.fillRect(-10, -47, 20, 3.4); },
  cap(c, p, s) { SB(c, [[-16, -38], [-14, -48], [0, -52], [14, -48], [16, -38], [8, -40], [0, -41], [-8, -40]], s.hg); GP(c, [[-8, -40], [16, -39], [14, -36], [-8, -37]], dk(s.hg, .2)); GE(c, 0, -46, 2.8, 2.4, s.o2); },
  beak(c, p, s) { SB(c, [[-16, -38], [-14, -48], [0, -52], [14, -48], [16, -38], [10, -40], [-10, -40]], s.hg); GE(c, 0, -43, 20, 3.6, s.hg); PL(c, [[-5, -34], [5, -34], [0, -22]], '#d8d0c0'); },
};

const BACK = {
  cape(c, p, s) { const sw = S_(p, 1) * 2; SB(c, [[-8, -26], [8, -26], [16 + sw, -8], [11, 0 + S_(p, 2)], [-11, 0 - S_(p, 2)], [-16 - sw, -8]], s.bc || s.o2); },
  wings(c, p, s) { const f = S_(p, 2) * .12; for (const sg of [-1, 1]) { c.save(); c.scale(sg, 1); c.rotate(f); SB(c, [[4, -24], [18, -40], [28, -34], [26, -22], [18, -12], [8, -16]], s.bc || '#ffffff'); c.strokeStyle = 'rgba(120,120,160,.5)'; c.lineWidth = .9; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(6, -22 + i * 2); c.lineTo(24 - i * 2, -32 + i * 5); c.stroke(); } c.restore(); } },
  bat(c, p, s) { const f = S_(p, 2) * .1; for (const sg of [-1, 1]) { c.save(); c.scale(sg, 1); c.rotate(f); SB(c, [[4, -24], [16, -40], [30, -36], [24, -26], [26, -16], [16, -20], [10, -10]], s.bc || '#3a2a5a'); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, -22); c.lineTo(28, -34); c.moveTo(7, -20); c.lineTo(24, -18); c.stroke(); c.restore(); } },
  tail(c, p, s) { const sw = S_(p, 1) * 3; SB(c, [[4, -12], [14, -16 + sw], [22 + sw, -28], [18, -38], [12, -26], [8, -20]], s.bc || '#ffa24a'); SB(c, [[16, -33], [18, -38], [22 + sw, -28], [20, -30]], '#fff4d8', { line: false }); },
  quiver(c, p, s) { GP(c, [[7, -24], [12, -23], [14, -9], [9, -8]], '#8a5a30'); for (const f of [[11, -24, '#fff'], [13, -25, '#ff9a8a'], [9, -25, '#bfe8ff']]) PL(c, [[f[0], f[1]], [f[0] + 2, f[1] - 9], [f[0] + 4, f[1]]], f[2], false); },
  pack(c, p, s) { GP(c, [[-16, -24], [-8, -24], [-8, -8], [-16, -8]], s.bc || '#8a5a30'); c.fillStyle = dk(s.bc || '#8a5a30', .3); c.fillRect(-16, -18, 8, 2); },
  aura(c, p, s) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -26, 32, s.bc || '#b070ff', .4 + S_(p, 1) * .08); c.restore(); },
  scarf(c, p, s) { SB(c, [[-3, -24], [-12, -22 + S_(p, 2) * 2], [-24, -15 + S_(p, 1) * 3], [-30, -10 + S_(p, 2) * 2], [-24, -8], [-12, -14], [-5, -19]], s.bc || '#e8505a'); },
};

const WEAP_LEFT = { bow: 1, shield: 1, book: 1, harp: 1, drum: 1 };
const WEAP = {
  sword(c, p, a, s) { c.save(); c.translate(9, -19); c.rotate(-.85 + a * 2.3); limb(c, 0, 0, 0, -5, 3.8, s.oc); hand(c, 0, -5.5); GP(c, [[-2.6, -8], [2.6, -8], [2.6, -34], [0, -39.5], [-2.6, -34]], s.wc || '#e8f2ff'); hl(c, -1.4, -26, .7, 8, 0, .8); GE(c, 0, -8, 6.5, 2.2, '#ffd24a'); c.fillStyle = '#6a3a1a'; c.fillRect(-1.5, -6, 3, 6); c.restore(); },
  katana(c, p, a, s) { c.save(); c.translate(9, -19); c.rotate(-1.1 + a * 2.6); limb(c, 0, 0, 0, -5, 3.8, s.oc); hand(c, 0, -5.5); SB(c, [[-1.6, -8], [1.6, -8], [2.6, -30], [0, -40], [-1.4, -30]], s.wc || '#dfe6f4'); hl(c, -.6, -24, .5, 9, 0, .9); GE(c, 0, -8, 4.4, 1.8, '#c9a54a'); c.fillStyle = '#2a2a3a'; c.fillRect(-1.6, -6, 3.2, 8); c.restore(); },
  staff(c, p, a, s) { c.save(); c.translate(11, -12); c.rotate(-.1 - a * .5); c.fillStyle = '#7a4a22'; c.fillRect(-1.3, -30, 2.6, 42); GE(c, 0, -31, 3.8, 2.2, '#c9a54a'); orb(c, 0, -36, 4.6 + a * 2.5 + S_(p, 1) * .5, s.wc || '#ff8a3a', '#fff'); c.restore(); limb(c, 6, -21, 10, -14, 3.6, s.oc); hand(c, 11, -13); },
  wand(c, p, a, s) { c.save(); c.translate(11, -18); c.rotate(-.5 - a * .7); c.fillStyle = '#c9a54a'; c.fillRect(-1, -16, 2, 18); star5(c, 0, -19, 4.4, s.wc || '#fff27a', OUT); c.restore(); limb(c, 6, -21, 10, -17, 3.6, s.oc); hand(c, 11, -16); sparkle(c, 15, -36 + S_(p, 1) * 2, 2.6, '#fff'); },
  bow(c, p, a, s) { limb(c, -7, -23, -12, -19, 3.6, s.oc); hand(c, -13, -19); c.save(); c.translate(-12, -20); c.strokeStyle = OUT; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 15, -1.25, 1.25); c.stroke(); c.strokeStyle = s.wc || '#a0623a'; c.lineWidth = 2.6; c.beginPath(); c.arc(0, 0, 15, -1.25, 1.25); c.stroke(); const sx = Math.cos(1.25) * 15, sy = Math.sin(1.25) * 15; c.strokeStyle = '#fff'; c.lineWidth = .9; c.beginPath(); c.moveTo(sx, -sy); c.lineTo(-a * 7 + 1, 0); c.lineTo(sx, sy); c.stroke(); PL(c, [[-a * 7 + 1, -1], [13, 0], [-a * 7 + 1, 1]], '#c8ffd0', false); c.restore(); limb(c, 7, -23, 2, -19, 3.6, s.oc); hand(c, -a * 7 - 10, -19, 2.2); },
  spear(c, p, a, s) { c.save(); c.translate(10, -14); c.rotate(.12 - a * .5); c.fillStyle = '#7a4a22'; c.fillRect(-1.2, -44, 2.4, 52); GP(c, [[-3.4, -44], [3.4, -44], [0, -58]], s.wc || '#e8f0fa'); hl(c, -.6, -50, .6, 4, 0, .8); c.restore(); limb(c, 6, -21, 10, -14, 3.6, s.oc); hand(c, 10.5, -13.5); },
  hammer(c, p, a, s) { c.save(); c.translate(10, -14); c.rotate(.1 - a * 1.1); c.fillStyle = '#7a4a22'; c.fillRect(-1.5, -30, 3, 40); GP(c, [[-9, -40], [9, -40], [9, -28], [-9, -28]], s.wc || '#8a98b0'); hl(c, -4, -37, 3, 1.2, 0, .7); c.restore(); limb(c, 6, -21, 10, -14, 3.8, s.oc); hand(c, 10.5, -13.5); },
  gun(c, p, a, s) { c.save(); c.translate(7, -18); c.rotate(-.05 - a * .1); limb(c, -5, 1, 4, 0, 3.4, s.oc); GP(c, [[-3, -2.5], [20, -3], [20, 2], [-3, 2.5]], s.wc || '#4a4a6a'); GP(c, [[-4, 0], [2, 0], [0, 8], [-5, 7]], '#7a4a22'); if (a > .3) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 23, 0, 12, '#fff2a0', a); c.restore(); } hand(c, 2, 1); c.restore(); },
  cannon(c, p, a, s) { c.save(); c.translate(6, -22); c.rotate(-.15 - a * .1); c.translate(-a * 3, 0); GP(c, [[-6, -5], [18, -6], [18, 4], [-6, 5]], s.wc || '#4a4a60'); GE(c, 20, -1, 2.6, 5.4, '#2a2a40'); if (a > .3) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 24, -1, 14, '#ffd24a', a); c.restore(); } c.restore(); limb(c, 6, -22, 8, -18, 3.6, s.oc); },
  book(c, p, a, s) { limb(c, -7, -22, -12, -18, 3.6, s.oc); hand(c, -13, -17); c.save(); c.translate(-16, -26 + S_(p, 1) * 2); c.rotate(-.2); GP(c, [[-8, -6], [0, -4], [0, 7], [-8, 5]], s.wc || '#7a4aa0'); GP(c, [[0, -4], [8, -6], [8, 5], [0, 7]], lt(s.wc || '#7a4aa0', .4)); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -2, 16, '#ffe9a0', .5); c.restore(); star5(c, 4, -.5, 2, '#ffd24a'); c.restore(); limb(c, 7, -22, 12, -16, 3.6, s.oc); hand(c, 12.5, -15.5); },
  shield(c, p, a, s) { limb(c, -8, -23, -12, -18, 3.8, s.oc); c.save(); c.translate(-14, -17); SB(c, [[-7, -12], [7, -12], [8, 0], [0, 12], [-8, 0]], s.wc || '#4a7ae0'); c.fillStyle = '#ffd24a'; c.fillRect(-1.2, -9, 2.4, 16); c.fillRect(-5, -3, 10, 2.4); c.restore(); limb(c, 7, -23, 11, -17, 3.6, s.oc); hand(c, 11.5, -16.5); },
  fan(c, p, a, s) { c.save(); c.translate(11, -17); c.rotate(-.4 - a * .8); for (let i = -3; i <= 3; i++) { c.save(); c.rotate(i * .24); GP(c, [[-1.4, 0], [1.4, 0], [2, -16], [-2, -16]], i % 2 ? s.wc || '#ff9ac8' : lt(s.wc || '#ff9ac8', .4)); c.restore(); } c.restore(); limb(c, 6, -21, 10, -16, 3.6, s.oc); hand(c, 11, -16); },
  flask(c, p, a, s) { c.save(); c.translate(13, -17 - a * 4); c.rotate(a * .3); limb(c, -3, 4, 0, 0, 3.6, s.oc); hand(c, 1, -1); GE(c, 1, -9, 6.4, 6.8, 'rgba(210,235,255,.5)'); c.save(); c.beginPath(); c.arc(1, -9, 5.8, 0, TAU); c.clip(); c.fillStyle = s.wc || '#7aff9a'; c.fillRect(-6, -10 + S_(p, 1) * .8, 14, 12); c.restore(); c.fillStyle = '#c8d0e0'; c.fillRect(-1, -20, 4.4, 5); c.fillStyle = '#7a5a3a'; c.fillRect(-1.6, -21.4, 5.6, 2.2); for (let i = 0; i < 3; i++) { const q = (p * 2 + i / 3) % 1; E(c, 1 + S_(q, 1) * 3, -22 - q * 12, 1.5 * (1 - q) + .5, 1.5 * (1 - q) + .5, 'rgba(160,255,190,' + (.85 - q * .8) + ')', false); } c.restore(); },
  lantern(c, p, a, s) { c.save(); c.translate(15, -16 + S_(p, 1) * 2 - a * 3); limb(c, -6, 4, -2, 0, 3.6, s.oc); c.strokeStyle = '#6a6a88'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, -10); c.stroke(); GP(c, [[-5, -8], [5, -8], [6, 4], [-6, 4]], 'rgba(255,230,150,.4)'); c.fillStyle = '#6a6a88'; c.fillRect(-6, -8.4, 12, 2); c.fillRect(-6, 3, 12, 2); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -2, 18, s.wc || '#ffd070', .8); c.restore(); SB(c, [[-2.6, 2], [-3, -2], [0, -7 - S_(p, 2)], [3, -2], [2.6, 2]], s.wc || '#ffd070', { line: false }); c.restore(); },
  drum(c, p, a, s) { limb(c, -7, -22, -10, -14, 3.6, s.oc); c.save(); c.translate(-8, -12); GP(c, [[-7, -5], [7, -5], [7, 5], [-7, 5]], s.wc || '#c8402a'); GE(c, 0, -5, 7, 2.6, '#f0d8b0'); c.strokeStyle = '#ffe9a0'; c.lineWidth = 1; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, -5); c.lineTo(i * 3, 5); c.stroke(); } c.restore(); limb(c, 7, -22, 4, -17 - a * 3, 3.6, s.oc); hand(c, 3.5, -17 - a * 3); },
  harp(c, p, a, s) { limb(c, -7, -22, -11, -17, 3.6, s.oc); c.save(); c.translate(-14, -22); c.strokeStyle = OUT; c.lineWidth = 4.4; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(-10, -2, 0, -12); c.lineTo(0, 8); c.stroke(); c.strokeStyle = s.wc || '#ffd24a'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = .7; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-1.8 * (i + 1), 6 - i * 4); c.lineTo(0, 6 - i * 4 - 2); c.stroke(); } c.restore(); limb(c, 7, -22, 2, -17, 3.4, s.oc); hand(c, 1, -17); sparkle(c, -22 + S_(p, 1) * 2, -36, 2.6, '#fff4a0'); },
  whip(c, p, a, s) { c.save(); c.translate(10, -18); limb(c, -3, 3, 0, 0, 3.6, s.oc); hand(c, 0, 0); c.strokeStyle = s.wc || '#8a4a2a'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(12, -8 - a * 10, 20, 8, 26 + S_(p, 1) * 3, -2 - a * 8); c.stroke(); c.restore(); },
  claw(c, p, a, s) { for (const sg of [-1, 1]) { c.save(); c.translate(sg * 11, -16 - a * 5 * (sg > 0 ? 1 : 0)); limb(c, -sg * 4, -5, 0, 0, 3.8, s.oc); GE(c, 0, 0, 3.4, 3.2, s.wc || '#c8402a'); c.strokeStyle = '#e8f0fa'; c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sg * 2, i * 1.8); c.lineTo(sg * 7, i * 2.4); c.stroke(); } c.restore(); } },
  orb(c, p, a, s) { limb(c, 6, -21, 10, -15, 3.6, s.oc); hand(c, 11, -14); orb(c, 12, -23 + S_(p, 1) * 2 - a * 3, 5 + a * 2, s.wc || '#b070ff', '#fff'); },
  flag(c, p, a, s) { c.save(); c.translate(11, -12); c.rotate(-.1 - a * .3); c.fillStyle = '#c9a54a'; c.fillRect(-1.2, -38, 2.4, 50); const w = S_(p, 1) * 2; SB(c, [[1, -38], [14, -36 + w], [22, -33], [14, -29 - w], [1, -27]], s.wc || '#ff4a4a'); star5(c, 10, -33, 3, '#fff3a0'); c.restore(); limb(c, 6, -21, 10, -14, 3.6, s.oc); hand(c, 11, -13); },
  bell(c, p, a, s) { c.save(); c.translate(11, -16); c.rotate(S_(p, 2) * .2 + a * .6); limb(c, -3, 3, 0, 0, 3.6, s.oc); hand(c, 0, 0); SB(c, [[-5, 8], [-3, 0], [0, -3], [3, 0], [5, 8]], '#ffd24a'); GE(c, 0, 9, 1.8, 1.8, '#c9a54a'); c.restore(); sparkle(c, 17, -22 + S_(p, 2) * 2, 2.4, '#fff'); },
  trident(c, p, a, s) { c.save(); c.translate(10, -14); c.rotate(.12 - a * .5); c.fillStyle = '#c9a54a'; c.fillRect(-1.2, -40, 2.4, 50); for (const x of [-4, 0, 4]) GP(c, [[x - 1.2, -40], [x + 1.2, -40], [x, -50]], s.wc || '#9af0ff'); c.fillRect(-4, -41, 8, 2); c.restore(); limb(c, 6, -21, 10, -14, 3.6, s.oc); hand(c, 10.5, -13.5); },
};

// ---- 服 ----
const OUTFIT = [
  (c, p, s) => { SB(c, [[-5, -24], [-14, -20 + S_(p, 2)], [-17, -8], [-10, -4], [0, -6], [10, -4], [17, -8], [14, -20 + S_(p, 2)], [5, -24]], dk(s.oc, .25)); GP(c, [[-6, -24], [6, -24], [12, -4], [-12, -4]], s.oc); c.fillStyle = s.o2; c.fillRect(-1, -24, 2, 19); PL(c, [[-12, -4], [12, -4], [13, -2], [-13, -2]], s.o2); },                       // 0 ローブ
  (c, p, s) => { GP(c, [[-9, -8], [9, -8], [8, -26], [-8, -26]], s.oc); GP(c, [[-5, -24], [5, -24], [4, -14], [-4, -14]], lt(s.oc, .3), { line: false }); c.fillStyle = s.o2; c.fillRect(-9, -11, 18, 2.4); c.fillRect(-1, -25, 2, 14); GE(c, -10, -25, 5.4, 4.4, s.o2); GE(c, 10, -25, 5.4, 4.4, s.o2); for (const x of [-6, -2, 2, 6]) PL(c, [[x - 2, -8], [x + 2, -8], [x + 1.6, -4], [x - 1.6, -4]], dk(s.oc, .2)); },         // 1 よろい
  (c, p, s) => { GP(c, [[-8.5, -9], [8.5, -9], [7, -25], [-7, -25]], s.oc); PL(c, [[-8.5, -9], [-5.5, -5.5], [-2.5, -9], [.5, -5.5], [3.5, -9], [6.5, -5.5], [8.5, -9]], dk(s.oc, .2)); c.fillStyle = '#7a4a24'; c.fillRect(-7.8, -16, 15.6, 3); GE(c, 0, -14.5, 2.6, 2.1, '#ffd24a'); PL(c, [[-6, -25], [0, -20.5], [6, -25], [4, -27], [-4, -27]], s.o2); },        // 2 チュニック
  (c, p, s) => { const sw = S_(p, 1) * 1.5; SB(c, [[-5, -17], [5, -17], [9, -9], [15, -3 + sw], [0, 0], [-15, -3 - sw], [-9, -9]], s.oc); GP(c, [[-6, -25], [6, -25], [5, -15], [-5, -15]], lt(s.oc, .25)); c.fillStyle = s.o2; c.fillRect(-6, -17, 12, 2.6); PL(c, [[-1, -16], [-6, -12], [-3, -10]], s.o2, false); PL(c, [[1, -16], [6, -12], [3, -10]], s.o2, false); PL(c, [[-5, -25], [0, -21], [5, -25], [3, -27], [-3, -27]], s.o2); },     // 3 ドレス
  (c, p, s) => { SB(c, [[-9, -25], [9, -25], [11, -4 + S_(p, 2)], [0, -2], [-11, -4 - S_(p, 2)]], s.oc); GP(c, [[-3, -25], [3, -25], [4, -4], [-4, -4]], s.o2, { line: false }); for (const y of [-21, -15, -9]) E(c, 0, y, 1, 1, '#ffd24a', false); PL(c, [[-9, -25], [-3, -25], [-1, -19], [-6, -21]], dk(s.oc, .2)); PL(c, [[9, -25], [3, -25], [1, -19], [6, -21]], dk(s.oc, .2)); },       // 4 コート
  (c, p, s) => { SB(c, [[-8, -24], [8, -24], [12, -4], [0, -2], [-12, -4]], s.oc); GP(c, [[-8, -24], [8, -24], [8, -22], [-8, -22]], s.o2, { line: false }); PL(c, [[-8, -17], [8, -17], [8, -10], [-8, -10]], s.o2); SB(c, [[-3, -14], [-9, -18], [-10, -9], [-4, -11]], s.o2); SB(c, [[3, -14], [9, -18], [10, -9], [4, -11]], s.o2); for (const [x, y] of [[-6, -6], [4, -7], [8, -5], [-9, -7]]) E(c, x, y, 1.2, 1.2, s.o2, false); },        // 5 着物
];

function mkHuman(s) {
  s.hg = s.hg || s.o2; const hair = HAIR[s.hs || 0], legc = s.lg || '#6a4a3a', ot = s.ot == null ? 2 : s.ot;
  return function (c, p, a) {
    const sw = S_(p, 1); c.translate((s.lean == null ? 1 : s.lean) * a * 2.5, -sw * .8);
    if (BACK[s.bk]) BACK[s.bk](c, p, s);
    if (ot === 1 || ot === 2 || ot === 4) { limb(c, -3.5, -10, -3.5, -4, 4.2, legc); limb(c, 3.5, -10, 3.5, -4, 4.2, legc); }
    boots(c, s.bt || dk(s.oc, .35));
    OUTFIT[ot](c, p, s);
    if (!WEAP_LEFT[s.wp]) { limb(c, -7, -22, -11.5, -15 + sw, 3.8, s.oc); hand(c, -11.5, -14 + sw); }
    hair.back(c, p, s.hc); face2(c, -33, s.ec, { brow: dk(s.hc, .3), mouth: s.mouth, skin: s.sk }); hair.front(c, p, s.hc);
    if (HEAD[s.hd]) HEAD[s.hd](c, p, s);
    if (WEAP[s.wp]) WEAP[s.wp](c, p, a, s);
  };
}

// ---- けもの（ねこ・いぬ・うさぎ・くま・きつね・おおかみ） ----
function mkBeast(s) {
  const ear = s.ear || 'cat';
  return function (c, p, a) {
    const sw = S_(p, 1); c.translate(0, -Math.abs(S_(p, 2)) * .8);
    const tl = S_(p, 1) * 3;
    SB(c, [[7, -8], [16, -10 + tl], [23 + tl, -22], [19, -32], [14, -20], [9, -14]], s.tc || s.bc); if (s.tip) SB(c, [[18, -29], [19, -32], [23 + tl, -22], [21, -25]], s.tip, { line: false });
    GE(c, -5, -3, 4.6, 3.4, s.bc); GE(c, 5, -3, 4.6, 3.4, s.bc);
    GE(c, 0, -14, 12.5, 12.5, s.bc); GE(c, 0, -11, 8, 8.5, s.bc2 || lt(s.bc, .5), { line: false });
    if (s.scarf) { SB(c, [[-11, -24], [11, -24], [10, -19], [0, -17], [-10, -19]], s.scarf); PL(c, [[8, -20], [14, -12 + S_(p, 2) * 2], [10, -11]], s.scarf); }
    limb(c, -10, -16, -14, -10 + sw, 3.6, s.bc); limb(c, 10, -16, 14, -10 - sw, 3.6, s.bc);
    // 耳
    const ears = { cat: [[-12, -35], [-10, -48], [-3, -39]], dog: [[-14, -33], [-18, -42], [-9, -38]], rabbit: [[-9, -37], [-11, -56], [-4, -40]], bear: [[-13, -36], [-14, -44], [-6, -40]], fox: [[-13, -37], [-12, -53], [-4, -41]], wolf: [[-13, -36], [-10, -52], [-3, -40]] }[ear];
    if (ear === 'bear') { for (const sg of [-1, 1]) GE(c, sg * 11, -41, 5, 5, s.ec2 || s.bc); } else for (const sg of [-1, 1]) { const q = ears.map(pt => [pt[0] * sg, pt[1]]); if (ear === 'dog') SB(c, q, s.ec2 || dk(s.bc, .3)); else GP(c, q, ear === 'rabbit' ? s.bc : s.ec2 || s.bc); if (ear !== 'dog') PL(c, q.map((pt, i) => [pt[0] * .8 + sg * (i === 2 ? 0 : 0), pt[1] * .93 - (i === 1 ? 0 : 0)]), s.inner || '#ffb0c8', false); }
    GE(c, 0, -29, 14, 12.5, s.bc);
    if (s.patch) { E(c, -6, -28, 4.6, 5.6, s.patch, false); E(c, 6, -28, 4.6, 5.6, s.patch, false); }
    GE(c, 0, -25, 7, 5, s.bc2 || lt(s.bc, .5), { line: false });
    eye2(c, -5.4, -29, 4, s.ec, { flip: true }); eye2(c, 5.4, -29, 4, s.ec);
    E(c, 0, -25.4, 2, 1.5, s.nose || '#ff8a9a', false); c.strokeStyle = '#7a4a4a'; c.lineWidth = 1; c.beginPath(); c.arc(-1.5, -24, 1.6, .1, Math.PI - .1); c.arc(1.5, -24, 1.6, .1, Math.PI - .1); c.stroke();
    E(c, -9.6, -25, 2.4, 1.5, 'rgba(255,110,140,.5)', false); E(c, 9.6, -25, 2.4, 1.5, 'rgba(255,110,140,.5)', false);
    if (s.whisk) { c.strokeStyle = 'rgba(80,60,90,.6)'; c.lineWidth = .8; for (const sg of [-1, 1]) for (const dy of [-1, 1]) { c.beginPath(); c.moveTo(sg * 7, -24); c.lineTo(sg * 16, -24 + dy * 2.4); c.stroke(); } }
    if (HEAD[s.hd]) { c.save(); c.translate(0, 4); HEAD[s.hd](c, p, { hg: s.hg || '#ff6a6a', o2: s.o2 || '#ffd24a' }); c.restore(); }
    if (WEAP[s.wp]) WEAP[s.wp](c, p, a, { oc: s.bc, wc: s.wc });
  };
}

// ---- ふよふよ精霊 ----
function mkSpirit(s) {
  return function (c, p, a) {
    const b = S_(p, 1) * 2.4; c.translate(0, -9 + b);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -17, 28, s.sc, .4); c.restore();
    const n = s.orbit || 0; for (let i = 0; i < n; i++) { const q = p + i / n, x = C_(q, 1) * 19, y = -17 + S_(q, 1) * 5; if (S_(q, 1) > -.2) { orb(c, x, y, 2.6, s.oc || lt(s.sc, .4), '#fff'); } }
    GE(c, -14, -13 - a * 4, 3.6, 5.2, s.sc); GE(c, 14, -13 - a * 4, 3.6, 5.2, s.sc);
    const f = s.feat;
    if (f === 'wings') for (const sg of [-1, 1]) { c.save(); c.scale(sg, 1); c.rotate(S_(p, 2) * .15); SB(c, [[5, -18], [24, -32], [30, -20], [20, -10]], 'rgba(255,255,255,.8)', { a: .5 }); c.restore(); }
    SB(c, [[-13, -17], [-12, -28], [0, -33], [12, -28], [13, -17], [10, -4], [0, -1], [-10, -4]], s.sc); E(c, -4, -26, 6, 4.5, 'rgba(255,255,255,.5)', false);
    if (f === 'cloud') { for (const [x, y, r] of [[-9, -6, 7], [0, -3, 8], [9, -6, 7]]) E(c, x, y, r, r * .8, 'rgba(255,255,255,.55)', false); }
    if (f === 'slime') { SB(c, [[-13, -4], [0, 1], [13, -4], [11, 2], [0, 4], [-11, 2]], dk(s.sc, .2)); }
    eye2(c, -5, -18, 4.3, s.ec, { flip: true }); eye2(c, 5, -18, 4.3, s.ec);
    E(c, -9.5, -12.5, 2.4, 1.5, 'rgba(255,120,160,.5)', false); E(c, 9.5, -12.5, 2.4, 1.5, 'rgba(255,120,160,.5)', false); c.strokeStyle = dk(s.sc, .5); c.lineWidth = 1; c.beginPath(); c.arc(0, -13, 1.6, .2, Math.PI - .2); c.stroke();
    if (f === 'crown') PL(c, [[-9, -29], [-8, -40], [-3, -33], [0, -43], [3, -33], [8, -40], [9, -29]], '#ffd24a');
    if (f === 'flame') for (let i = -1; i <= 1; i++) SB(c, [[i * 5 - 3, -30], [i * 5 - 2, -38 - S_(p + i * .2, 2) * 2], [i * 5, -46 + (i ? 4 : 0) - S_(p + i * .3, 2) * 2], [i * 5 + 3, -36], [i * 5 + 3, -30]], i ? '#ffb040' : '#ff6a2a', { line: false });
    if (f === 'moon') { c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(0, -39, 6, 0, TAU); c.fill(); c.fillStyle = s.sc; c.beginPath(); c.arc(3, -40, 5.4, 0, TAU); c.fill(); sparkle(c, -9, -42, 2.4, '#fff'); }
    if (f === 'horn') for (const sg of [-1, 1]) PL(c, [[sg * 7, -30], [sg * 10, -40], [sg * 3, -32]], '#fff0c8');
    if (f === 'leaf') for (const sg of [-1, 1]) SB(c, [[sg * 2, -31], [sg * 10, -42], [sg * 12, -34]], '#4ad07a');
    if (f === 'bolt') { PL(c, [[-2, -32], [3, -44], [0, -36], [5, -37], [-1, -30]], '#fff27a'); }
    sparkle(c, -18, -28 + S_(p, 2) * 2, 3, '#fff'); sparkle(c, 17, -36 + C_(p, 2) * 2, 2.4, lt(s.sc, .6));
  };
}

// ---- とり（ペンギン・ふくろう・不死鳥・ことり） ----
function mkBird(s) {
  return function (c, p, a) {
    const b = Math.abs(S_(p, 2)) * 1.6; c.translate(0, -b);
    if (s.kind === 'phoenix') { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -24, 34, '#ff8a2a', .45); c.restore(); for (let i = -2; i <= 2; i++) SB(c, [[i * 4 - 3, -6], [i * 6, 6 + S_(p + i * .13, 2) * 3 - Math.abs(i) * 2], [i * 4 + 3, -6]], i % 2 ? '#ffb040' : '#ff5a2a', { line: false }); }
    const wy = -22 - a * 6 + S_(p, 2) * 2;
    if (s.kind !== 'penguin') { SB(c, [[-9, -24], [-22, wy - 10], [-31, -22], [-25, -12], [-14, -12]], s.wc); SB(c, [[9, -24], [22, wy - 10], [31, -22], [25, -12], [14, -12]], s.wc); }
    else { GE(c, -14, -17, 4, 8, s.bc); GE(c, 14, -17, 4, 8, s.bc); }
    SB(c, [[-14, -22], [-14, -33], [0, -40], [14, -33], [14, -22], [10, -8], [0, -5], [-10, -8]], s.bc);
    SB(c, [[-8, -17], [0, -20], [8, -17], [6, -8], [0, -6], [-6, -8]], s.belly || '#fff6e8', { line: false });
    if (s.kind === 'owl') { for (const sg of [-1, 1]) { GP(c, [[sg * 13, -34], [sg * 11, -46], [sg * 5, -38]], s.bc); E(c, sg * 6, -28, 6.6, 6.6, '#fff6e8', false); } }
    if (s.crest === 'tuft') PL(c, [[-3, -39], [0, -50], [3, -39]], s.cc || s.wc, true);
    if (s.crest === 'flame') for (let i = -1; i <= 1; i++) SB(c, [[i * 4 - 2, -38], [i * 4, -50 - (i ? 0 : 4) + S_(p + i * .2, 2) * 2], [i * 4 + 2, -38]], i ? '#ffb040' : '#ff6a2a', { line: false });
    eye2(c, -5.5, -28, s.kind === 'owl' ? 5 : 4.2, s.ec, { flip: true }); eye2(c, 5.5, -28, s.kind === 'owl' ? 5 : 4.2, s.ec);
    if (s.glasses) { c.strokeStyle = '#c9a54a'; c.lineWidth = 1.4; for (const sg of [-1, 1]) { c.beginPath(); c.arc(sg * 5.5, -28, 6, 0, TAU); c.stroke(); } c.beginPath(); c.moveTo(-0.5, -28); c.lineTo(0.5, -28); c.stroke(); }
    PL(c, [[-3, -23], [3, -23], [0, -17]], s.beak || '#ff9a1e'); hl(c, 0, -22, 1.2, .6, 0, .7);
    GE(c, -4, -3, 2.8, 3.4, s.beak || '#ff9a1e'); GE(c, 4, -3, 2.8, 3.4, s.beak || '#ff9a1e');
    if (HEAD[s.hd]) { c.save(); c.translate(0, -2); HEAD[s.hd](c, p, { hg: s.hg || '#7a7aff', o2: s.o2 || '#ffd24a' }); c.restore(); }
    if (s.kind === 'penguin') { SB(c, [[-12, -22], [12, -22], [10, -17], [-10, -17]], s.scarf || '#e8505a'); PL(c, [[8, -19], [14, -11 + S_(p, 2) * 2], [10, -10]], s.scarf || '#e8505a'); }
  };
}

// ---- ロボ・タレット・テスラ塔・溶岩ゴーレム ----
function mkRobot(s) {
  return function (c, p, a) {
    const b = S_(p, 1) * .6; c.translate(0, -b);
    if (s.kind === 'turret') {
      for (const x of [-9, 0, 9]) limb(c, x * .4, -10, x, -2, 3, '#4a4a60'); GE(c, 0, -14, 11, 7, s.rc); GE(c, 0, -22, 8, 6.4, lt(s.rc, .2));
      c.save(); c.translate(0, -22); c.rotate(-.1); c.translate(-a * 3, 0); GP(c, [[3, -3], [24, -3.4], [24, 3.4], [3, 3]], '#3a3a50'); GE(c, 24, 0, 1.8, 4, '#2a2a40'); if (a > .3) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 28, 0, 14, '#ffd24a', a); c.restore(); } c.restore();
      eye2(c, 0, -22, 3.4, s.ec, { noLash: true }); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -22, 8, s.ec, .5); c.restore();
      for (let i = 0; i < 3; i++) { const q = (p * 2 + i / 3) % 1; E(c, 8 + q * 6, -30 - q * 8, 1.6 * (1 - q) + .4, 1.6 * (1 - q) + .4, 'rgba(230,230,230,' + (.6 - q * .5) + ')', false); }
      return;
    }
    if (s.kind === 'coil') {
      GE(c, 0, -3, 12, 4, '#4a4a60'); GP(c, [[-5, -4], [5, -4], [3, -36], [-3, -36]], s.rc);
      for (const y of [-12, -20, -28]) { GE(c, 0, y, 9 - (y + 12) * -.1, 2.4, '#c9a54a'); }
      c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -42, 24, '#9ad8ff', .6 + S_(p, 2) * .15); c.restore(); orb(c, 0, -42, 6, '#fff27a', '#fff');
      c.strokeStyle = 'rgba(255,255,200,.95)'; c.lineWidth = 1.6; const k = Math.floor(p * 8);
      for (let i = 0; i < 3; i++) { const aa = (i - 1) * .9 + (k % 2) * .2; c.beginPath(); c.moveTo(0, -42); c.lineTo(Math.sin(aa) * 12, -42 - Math.cos(aa) * 8); c.lineTo(Math.sin(aa) * 20 + (k % 3) * 2, -40 - Math.cos(aa) * 4); c.stroke(); }
      eye2(c, 0, -22, 3.6, s.ec, { noLash: true }); return;
    }
    // 人型ロボ／溶岩ゴーレム
    if (s.lava) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -22, 30, '#ff7a2a', .35 + S_(p, 1) * .08); c.restore(); }
    GE(c, -8, -4, 6.6, 4.6, dk(s.rc, .2)); GE(c, 8, -4, 6.6, 4.6, dk(s.rc, .2));
    GP(c, [[-13, -8], [13, -8], [14, -28], [-14, -28]], s.rc); GP(c, [[-9, -24], [9, -24], [8, -12], [-8, -12]], lt(s.rc, .2), { line: false });
    if (s.lava) { c.strokeStyle = '#ffb040'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-8, -26); c.lineTo(-4, -20); c.lineTo(-9, -14); c.moveTo(8, -24); c.lineTo(4, -17); c.lineTo(9, -11); c.stroke(); orb(c, 0, -18, 4, '#ffb040', '#fff'); }
    else { E(c, 0, -18, 4, 4, s.ec, false); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -18, 10, s.ec, .6); c.restore(); }
    const up = a * 10; limb(c, -14, -24, -20, -16 - up, 5.4, dk(s.rc, .1)); limb(c, 14, -24, 20, -16 - up, 5.4, dk(s.rc, .1)); GE(c, -20, -14 - up, 5.4, 5.6, s.lava ? '#4a2a2a' : '#6a6a78'); GE(c, 20, -14 - up, 5.4, 5.6, s.lava ? '#4a2a2a' : '#6a6a78');
    GE(c, 0, -37, 12.5, 10.5, lt(s.rc, .1)); GP(c, [[-8, -39], [8, -39], [8, -34], [-8, -34]], '#1c1c2a', { line: false });
    eye2(c, -3.6, -36.5, 2.6, s.ec, { noLash: true }); eye2(c, 3.6, -36.5, 2.6, s.ec, { noLash: true });
    c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -47); c.lineTo(0, -53); c.stroke(); orb(c, 0, -54, 2.4, s.ec, '#fff');
  };
}

// ---- 植物 ----
function mkPlant(s) {
  return function (c, p, a) {
    const sw = S_(p, 1); c.rotate(sw * .03);
    for (const x of [-6, 0, 6]) { c.strokeStyle = '#6a4a2a'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x * .5, -4); c.quadraticCurveTo(x, 0, x * 1.5, 1); c.stroke(); }
    limb(c, 0, -4, 0, -20, 4.6, '#3f9a4a');
    for (const sg of [-1, 1]) { c.save(); c.translate(sg * 3, -12); c.rotate(sg * (.7 + sw * .15 + a * .5)); SB(c, [[0, 0], [sg * 8, -5], [sg * 16, -2], [sg * 8, 4]], '#58b858'); c.restore(); }
    const hy = -32;
    if (s.kind === 'sunflower') {
      for (let i = 0; i < 14; i++) { const aa = i / 14 * TAU + p * TAU * .1; c.save(); c.translate(0, hy); c.rotate(aa); SB(c, [[0, -8], [4, -14], [0, -22], [-4, -14]], i % 2 ? '#ffd24a' : '#ffbe1a'); c.restore(); }
      GE(c, 0, hy, 11, 11, '#8a5a2a'); eye2(c, -4.2, hy - 1, 3.4, '#fff', { flip: true }); eye2(c, 4.2, hy - 1, 3.4, '#fff'); E(c, -7.5, hy + 4, 2.2, 1.3, 'rgba(255,120,140,.5)', false); E(c, 7.5, hy + 4, 2.2, 1.3, 'rgba(255,120,140,.5)', false); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(0, hy + 4, 2, .2, Math.PI - .2); c.stroke();
    } else {
      for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU; c.save(); c.translate(0, hy); c.rotate(aa); GE(c, 0, -10, 7, 8, i % 2 ? '#c8203a' : '#a8182e'); c.restore(); }
      GE(c, 0, hy, 11, 11, '#e84a6a'); E(c, 0, hy + 1, 7, 7, '#ffd0d8', false); eye2(c, -4, hy, 3.4, '#6a2a8a', { flip: true }); eye2(c, 4, hy, 3.4, '#6a2a8a'); E(c, -7, hy + 5, 2, 1.2, 'rgba(255,100,140,.5)', false); E(c, 7, hy + 5, 2, 1.2, 'rgba(255,100,140,.5)', false);
      for (const sg of [-1, 1]) for (let i = 0; i < 2; i++) PL(c, [[sg * 3, -8 - i * 7], [sg * 8, -10 - i * 7], [sg * 3, -12 - i * 7]], '#6a3a4a', false);
      c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, hy, 24, '#c070ff', .22); c.restore();
    }
    for (let i = 0; i < 3; i++) { const q = (p * 2 + i / 3) % 1; E(c, -10 + i * 10 + S_(q, 1) * 2, -46 - q * 10, 1.3 * (1 - q) + .5, 1.3 * (1 - q) + .5, s.kind === 'sunflower' ? 'rgba(255,240,150,' + (.8 - q * .7) + ')' : 'rgba(220,150,255,' + (.8 - q * .7) + ')', false); }
  };
}

// ---- ちいさなドラゴン ----
function mkDragon(s) {
  return function (c, p, a) {
    const fl = S_(p, 2) * 6; c.scale(1.18, 1.18);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -22, 36, s.col, .35); c.restore();
    SB(c, [[-6, -20], [-20, -38 + fl], [-31, -30 + fl], [-26, -22], [-22, -14]], s.wing); SB(c, [[6, -20], [20, -38 + fl], [31, -30 + fl], [26, -22], [22, -14]], s.wing);
    c.strokeStyle = dk(s.wing, .4); c.lineWidth = 1; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * 7, -20); c.lineTo(sg * 26, -30 + fl); c.moveTo(sg * 7, -19); c.lineTo(sg * 22, -16); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, -8); c.quadraticCurveTo(22, -3 + S_(p, 1) * 3, 25, -16); c.stroke(); c.strokeStyle = s.col; c.lineWidth = 4.6; c.stroke(); PL(c, [[23, -19], [30, -22], [26, -14]], s.horn);
    GE(c, -5, -3, 4.4, 3.6, s.col); GE(c, 5, -3, 4.4, 3.6, s.col); GE(c, 0, -14, 12.5, 12.5, s.col); GE(c, 0, -11, 7.5, 9, s.belly, { line: false });
    c.strokeStyle = dk(s.belly, .25); c.lineWidth = .8; for (const y of [-16, -12, -8]) { c.beginPath(); c.moveTo(-5, y); c.lineTo(5, y); c.stroke(); }
    GE(c, 0, -29, 13.5, 11.5, s.col); GE(c, 0, -25, 8, 5, lt(s.col, .25), { line: false });
    PL(c, [[-9, -37], [-13, -50], [-4, -39]], s.horn); PL(c, [[9, -37], [13, -50], [4, -39]], s.horn);
    eye2(c, -5, -30, 4, s.ec, { flip: true }); eye2(c, 5, -30, 4, s.ec); E(c, -3, -24, .9, .9, '#a02a1a', false); E(c, 3, -24, .9, .9, '#a02a1a', false);
    if (a > .2) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -20, 12 + a * 14, '#9affd0', a); c.restore(); }
  };
}

// ---------- 新キャラ 48 体のデザイン指定 ----------
const SPEC = {
  gladiator: { t: 'h', hc: '#ff6a3a', hs: 5, ec: '#ff8a2a', oc: '#c8402a', o2: '#ffd24a', ot: 1, hd: 'helm', hg: '#aab4c8', bk: 'cape', bc: '#a8322a', wp: 'sword', wc: '#ffb070' },
  ravenblade: { t: 'h', hc: '#2a2a40', hs: 0, ec: '#ff4a6a', oc: '#3a3a5a', o2: '#8a8aa8', ot: 4, hd: 'mask', hg: '#2a2a40', bk: 'bat', bc: '#2a2a3a', wp: 'katana', wc: '#c0c8e0' },
  monk: { t: 'h', hc: '#e8c070', hs: 3, ec: '#6aa0ff', oc: '#f0a030', o2: '#fff6e0', ot: 5, hd: 'band', hg: '#c8402a', bk: 'none', wp: 'claw', wc: '#c8402a' },
  samurai: { t: 'h', hc: '#1a1a2a', hs: 4, ec: '#c0c8ff', oc: '#4a5a8a', o2: '#e8e8f0', ot: 5, bk: 'scarf', bc: '#c83a4a', wp: 'katana', wc: '#e8f0ff' },
  viking: { t: 'h', hc: '#e8a04a', hs: 1, ec: '#4a8aff', oc: '#8a6a3a', o2: '#c8d0e0', ot: 1, hd: 'horn', hg: '#e8e0c0', bk: 'cape', bc: '#6a4a2a', wp: 'hammer', wc: '#8a98b0' },
  lancer: { t: 'h', hc: '#9ad0ff', hs: 2, ec: '#ffd24a', oc: '#4a7ae0', o2: '#e8f0ff', ot: 1, hd: 'helm', hg: '#c8d4e8', bk: 'wings', bc: '#ffffff', wp: 'spear', wc: '#e8f0fa' },
  boxer: { t: 'b', bc: '#ffb86a', ear: 'cat', ec: '#6a4a2a', tip: '#fff0d8', whisk: 1, hd: 'band', hg: '#c8402a', wp: 'claw', wc: '#e83a3a' },
  shieldmaiden: { t: 'h', hc: '#f0e0a0', hs: 2, ec: '#6ad0ff', oc: '#e8f0ff', o2: '#4a7ae0', ot: 1, hd: 'tiara', bk: 'cape', bc: '#4a7ae0', wp: 'shield', wc: '#e8f0ff' },
  lavagolem: { t: 'r', kind: 'golem', lava: 1, rc: '#6a4a44', ec: '#ffb040' },
  panda: { t: 'b', bc: '#ffffff', bc2: '#ffffff', ear: 'bear', ec2: '#2a2a3a', patch: '#2a2a3a', ec: '#3a3a4a', nose: '#2a2a3a', hd: 'band', hg: '#c8402a', wp: 'claw', wc: '#2a2a3a', tc: '#ffffff' },
  thunderwolf: { t: 'b', bc: '#a8b8e8', bc2: '#e8f0ff', ear: 'wolf', ec: '#ffd24a', ec2: '#7a8ac8', tip: '#fff27a', scarf: '#ffd24a', wp: 'claw', wc: '#7a8ac8' },
  darkcat: { t: 'b', bc: '#3a3a52', bc2: '#5a5a78', ear: 'cat', ec: '#ffe27a', whisk: 1, inner: '#ff6aa0', scarf: '#c070ff', wp: 'none', tc: '#3a3a52', nose: '#c070ff' },
  gunner: { t: 'h', hc: '#8a4a2a', hs: 6, ec: '#5aa0ff', oc: '#a07a4a', o2: '#5a3a1a', ot: 4, hd: 'straw', hg: '#c8a060', bk: 'none', wp: 'gun', wc: '#6a6a88' },
  crossbow: { t: 'h', hc: '#6a8a4a', hs: 0, ec: '#2a8a4a', oc: '#5a7a3a', o2: '#c8b080', ot: 2, hd: 'hood', hg: '#4a6a2a', bk: 'quiver', wp: 'bow', wc: '#6a4a2a' },
  pirate: { t: 'h', hc: '#c8402a', hs: 4, ec: '#4ad0ff', oc: '#3a4a8a', o2: '#ffd24a', ot: 4, hd: 'top', hg: '#2a2a3a', bk: 'cape', bc: '#c8402a', wp: 'gun', wc: '#8a6a3a' },
  bombrabbit: { t: 'b', bc: '#fff0f0', ear: 'rabbit', ec: '#e03a5a', inner: '#ffb0c8', whisk: 0, hd: 'goggle', wp: 'flask', wc: '#ff6a3a', tc: '#ffffff' },
  turret: { t: 'r', kind: 'turret', rc: '#c8a060', ec: '#ff6a3a' },
  robo: { t: 'r', kind: 'robot', rc: '#8aa8c8', ec: '#6aff9a' },
  stormcaller: { t: 'h', hc: '#8affd0', hs: 7, ec: '#2affb0', oc: '#3aa88a', o2: '#fff27a', ot: 0, hd: 'tiara', bk: 'aura', bc: '#7affd0', wp: 'staff', wc: '#fff27a' },
  tidemage: { t: 'h', hc: '#4ac0e8', hs: 1, ec: '#2a6aff', oc: '#2a7ab8', o2: '#bff4ff', ot: 3, hd: 'witch', hg: '#2a6aa8', bk: 'none', wp: 'wand', wc: '#9affff' },
  voidmage: { t: 'h', hc: '#7a4aff', hs: 3, ec: '#ff4aff', oc: '#2a1a4a', o2: '#a070ff', ot: 0, hd: 'hood', hg: '#241438', bk: 'aura', bc: '#8a4aff', wp: 'orb', wc: '#a070ff' },
  crystalmage: { t: 'h', hc: '#d8f0ff', hs: 7, ec: '#6ad0ff', oc: '#c8e8ff', o2: '#6a8aff', ot: 0, hd: 'tiara', bk: 'wings', bc: '#e8f6ff', wp: 'staff', wc: '#9ad8ff' },
  sandwitch: { t: 'h', hc: '#ffd070', hs: 6, ec: '#ff8a2a', oc: '#d8a04a', o2: '#8a5a2a', ot: 3, hd: 'turban', hg: '#e8c070', bk: 'scarf', bc: '#c8402a', wp: 'wand', wc: '#ffe27a' },
  icelancer: { t: 'h', hc: '#e8faff', hs: 0, ec: '#4ab0ff', oc: '#8ac8e8', o2: '#f0fcff', ot: 1, hd: 'helm', hg: '#c8e8f8', bk: 'cape', bc: '#4a9ad8', wp: 'spear', wc: '#bff4ff' },
  thornpriest: { t: 'h', hc: '#5ad07a', hs: 3, ec: '#c8501e', oc: '#3a8a4a', o2: '#d8f0a8', ot: 0, hd: 'flower', hg: '#ff9ed2', bk: 'none', wp: 'staff', wc: '#7aff9a' },
  plaguedoctor: { t: 'h', hc: '#6a6a7a', hs: 0, ec: '#7aff9a', oc: '#2a2a3a', o2: '#8a8a9a', ot: 4, hd: 'beak', hg: '#2a2a3a', bk: 'cape', bc: '#1a1a28', wp: 'flask', wc: '#9ae86a' },
  astrologer: { t: 'h', hc: '#2a2a6a', hs: 7, ec: '#ffe27a', oc: '#2a2a7a', o2: '#ffe27a', ot: 0, hd: 'crown', bk: 'aura', bc: '#ffe27a', wp: 'orb', wc: '#ffe27a' },
  fireworker: { t: 'h', hc: '#ff7aa0', hs: 2, ec: '#ffd24a', oc: '#d84a6a', o2: '#ffd24a', ot: 5, hd: 'band', hg: '#ffd24a', bk: 'none', wp: 'cannon', wc: '#8a4a3a' },
  mochifox: { t: 'b', bc: '#ffa24a', bc2: '#fff4d8', ear: 'fox', ec: '#6a3a1a', ec2: '#ffa24a', inner: '#fff0d8', tip: '#fff4d8', whisk: 0, wp: 'wand', wc: '#ff6a3a', scarf: '#e83a3a' },
  owlsage: { t: 'a', kind: 'owl', bc: '#a07a4a', wc: '#7a5a3a', belly: '#f0e0c0', ec: '#ffd24a', glasses: 1, hd: 'top', hg: '#3a3a6a', o2: '#ffd24a' },
  phoenix: { t: 'a', kind: 'phoenix', bc: '#ff6a2a', wc: '#ffb040', belly: '#ffd890', ec: '#ffec6a', crest: 'flame', beak: '#ffb81e' },
  penguin: { t: 'a', kind: 'penguin', bc: '#3a4a6a', belly: '#ffffff', wc: '#3a4a6a', ec: '#2a6aff', beak: '#ff9a1e', scarf: '#e8505a', hd: 'cap', hg: '#4a7ae0', o2: '#fff' },
  tesla: { t: 'r', kind: 'coil', rc: '#8a8aa8', ec: '#9ad8ff' },
  sunflower: { t: 'p', kind: 'sunflower' },
  rosequeen: { t: 'p', kind: 'rose' },
  wisp: { t: 's', sc: '#ff7a3a', ec: '#fff27a', feat: 'flame', orbit: 2, oc: '#ffb040' },
  moonspirit: { t: 's', sc: '#c8b8ff', ec: '#6a4aff', feat: 'moon', orbit: 3, oc: '#fff6c0' },
  stormcloud: { t: 's', sc: '#8a9ac8', ec: '#fff27a', feat: 'cloud', orbit: 0 },
  magmaslime: { t: 's', sc: '#ff5a2a', ec: '#fff2a0', feat: 'slime', orbit: 0 },
  dragonling: { t: 'd', col: '#46c8a8', belly: '#d8fff0', wing: '#8affd0', horn: '#fff0b0', ec: '#ffec6a' },
  bard: { t: 'h', hc: '#ffb86a', hs: 4, ec: '#6ad0ff', oc: '#4a9ad8', o2: '#ffe27a', ot: 4, hd: 'beret', hg: '#c8402a', bk: 'cape', bc: '#c8402a', wp: 'harp', wc: '#ffd24a' },
  cheer: { t: 'h', hc: '#ff4a4a', hs: 5, ec: '#ffd24a', oc: '#c82a2a', o2: '#ffffff', ot: 2, hd: 'band', hg: '#ffffff', bk: 'none', wp: 'flag', wc: '#ff4a4a' },
  oracle: { t: 'h', hc: '#c88aff', hs: 1, ec: '#ff6ad0', oc: '#5a3a8a', o2: '#ffd24a', ot: 0, hd: 'turban', hg: '#7a4aa8', bk: 'aura', bc: '#c070ff', wp: 'orb', wc: '#ffffff' },
  frostqueen: { t: 'h', hc: '#f0fcff', hs: 1, ec: '#6ad0ff', oc: '#9ad8f0', o2: '#ffffff', ot: 3, hd: 'crown', bk: 'wings', bc: '#d8f6ff', wp: 'wand', wc: '#bff4ff' },
  smith: { t: 'h', hc: '#8a5a3a', hs: 0, ec: '#ffb040', oc: '#7a4a2a', o2: '#c8d0e0', ot: 2, hd: 'goggle', bk: 'pack', bc: '#6a4a2a', wp: 'hammer', wc: '#8a98b0' },
  merchant: { t: 'h', hc: '#e8c070', hs: 3, ec: '#5a8a2a', oc: '#e8a030', o2: '#fff6e0', ot: 4, hd: 'turban', hg: '#c8402a', bk: 'pack', bc: '#8a5a30', wp: 'flask', wc: '#ffd24a' },
  nun: { t: 'h', hc: '#ffe8c0', hs: 3, ec: '#6aa0ff', oc: '#3a3a5a', o2: '#ffffff', ot: 0, hd: 'hood', hg: '#3a3a5a', bk: 'none', wp: 'bell', wc: '#ffd24a' },
  druid: { t: 'h', hc: '#c8e8a0', hs: 7, ec: '#4ab86a', oc: '#5a9a4a', o2: '#d8f0a8', ot: 0, hd: 'horn', hg: '#a07a4a', bk: 'tail', bc: '#7ad07a', wp: 'staff', wc: '#7aff9a' },
};
for (const key in SPEC) {
  const s = SPEC[key];
  SPRITES[key] = s.t === 'h' ? mkHuman(s) : s.t === 'b' ? mkBeast(s) : s.t === 's' ? mkSpirit(s) : s.t === 'a' ? mkBird(s) : s.t === 'r' ? mkRobot(s) : s.t === 'p' ? mkPlant(s) : mkDragon(s);
}
