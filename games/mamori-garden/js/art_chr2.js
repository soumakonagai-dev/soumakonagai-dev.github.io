'use strict';
// ===== 仲間のデザイン（つづき）：ミミック・竜・新キャラ 9 体 =====
Object.assign(SPRITES, {
  // ---- ミミック：宝箱の舌と金貨 ----
  mimic(c, p, a) {
    const o = a * 9 + (S_(p, 1) + 1) * 2;
    GE(c, -8, -3, 3.8, 3.6, '#6b4a3a'); GE(c, 8, -3, 3.8, 3.6, '#6b4a3a');
    for (const [x, y] of [[-14, -2], [13, -1], [-4, 0], [6, -1]]) GE(c, x, y, 3.2, 1.4, '#ffd24a', { lw: .8 });
    GP(c, [[-15, -7], [15, -7], [15, -21], [-15, -21]], '#a8642e'); c.fillStyle = 'rgba(80,40,10,.35)'; for (const x of [-9, -3, 3, 9]) c.fillRect(x, -21, .8, 14);
    c.fillStyle = '#d9a63a'; c.fillRect(-15, -15, 30, 3.2); for (const x of [-15, 12]) GE(c, x + 1.5, -13.4, 1.8, 1.8, '#fff0a0', { lw: .6 });
    GP(c, [[-13, -21], [13, -21], [12, -25 - o * .1], [-12, -25 - o * .1]], '#7a1830'); E(c, 0, -22, 4.5, 3.2 + o * .1, '#ff6a8a'); E(c, 0, -23, 3, 1.4, '#ff9aaa', false);
    c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) PL(c, [[-12 + i * 5.2, -21], [-9.4 + i * 5.2, -17.5], [-6.8 + i * 5.2, -21]], '#fff', false);
    c.save(); c.translate(-15, -25 - o * .1); c.rotate(-o * .05); c.translate(15, 0);
    GP(c, [[-16, 0], [16, 0], [15, -15], [-15, -15]], '#b8743a'); c.fillStyle = '#d9a63a'; c.fillRect(-16, -8, 32, 3.2); GE(c, 0, -7, 2.8, 3, '#fff0a0');
    for (const x of [-9, 9]) { E(c, x, -11.5, 4, 3.6, '#fff', false); E(c, x, -11.2, 2.4, 2.8, '#ffd84a', false); E(c, x, -11, 1.1, 1.6, '#241238', false); hl(c, x - 1, -12.4, .8, .8, 0, 1); }
    c.restore();
  },
  // ---- 竜の卵 → 幼竜 → 若竜 → 古竜 ----
  egg(c, p, a, u) {
    const phase = u && u.__ph !== undefined ? u.__ph : 0;
    if (phase === 0) {
      const hatch = u ? Math.min(2, u.hatch) : 0;
      c.rotate(S_(p, 2) * .035 * (1 + hatch)); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -17, 24, '#ffb070', .25 + hatch * .1); c.restore();
      GE(c, 0, -18, 14.5, 19, '#fff1da'); E(c, -5, -24, 4.4, 8, 'rgba(255,255,255,.5)', false);
      c.save(); c.beginPath(); c.ellipse(0, -18, 14.5, 19, 0, 0, TAU); c.clip();
      for (const [x, y, r, col] of [[-7, -10, 4, '#ff9a5a'], [6, -18, 4.6, '#ff7a4a'], [-3, -27, 3.4, '#ffb87a'], [7, -7, 2.8, '#ffb87a'], [-9, -20, 2.4, '#ff8a5a']]) { E(c, x, y, r, r, col, false); hl(c, x - r * .3, y - r * .3, r * .35, r * .25, 0, .5); }
      c.restore(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.beginPath(); c.ellipse(0, -18, 14.5, 19, 0, 0, TAU); c.stroke();
      if (hatch >= 1) { c.strokeStyle = '#8a5a30'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -26); c.lineTo(-2, -21); c.lineTo(-6, -17); c.lineTo(0, -12); if (hatch >= 2) { c.lineTo(-3, -8); c.moveTo(-2, -21); c.lineTo(4, -23); } c.stroke(); }
      return;
    }
    const k = [0, 1, 1.12, 1.3][phase], col = ['', '#ff7a5a', '#ee4a4a', '#c8321e'][phase], belly = ['', '#ffd9a0', '#ffc28a', '#ffd070'][phase], wing = phase === 3 ? '#ffb83a' : phase === 2 ? '#ff8a6a' : '#ff9a6a';
    c.scale(k, k); const fl = S_(p, 2) * (phase >= 2 ? 6 : 3.5);
    if (phase === 3) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -22, 38, '#ff9a3a', .4); c.restore(); }
    SB(c, [[-6, -20], [-20, -36 + fl], [-30, -30 + fl], [-26, -22], [-22, -14]], wing); SB(c, [[6, -20], [20, -36 + fl], [30, -30 + fl], [26, -22], [22, -14]], wing);
    c.strokeStyle = dk(wing, .4); c.lineWidth = 1; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 7, -20); c.lineTo(s * 26, -29 + fl); c.moveTo(s * 7, -19); c.lineTo(s * 22, -16); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, -8); c.quadraticCurveTo(22, -3 + S_(p, 1) * 3, 25, -16); c.stroke(); c.strokeStyle = col; c.lineWidth = 4.6; c.stroke(); PL(c, [[23, -19], [30, -22], [26, -14]], phase === 3 ? '#fff0b0' : '#ffe0a0');
    GE(c, -5, -3, 4.4, 3.6, col); GE(c, 5, -3, 4.4, 3.6, col); GE(c, 0, -14, 12.5, 12.5, col); GE(c, 0, -11, 7.5, 9, belly, { line: false }); c.strokeStyle = dk(belly, .25); c.lineWidth = .8; for (const y of [-16, -12, -8]) { c.beginPath(); c.moveTo(-5, y); c.lineTo(5, y); c.stroke(); }
    GE(c, 0, -29, 13.5, 11.5, col); GE(c, 0, -25, 8, 5, lt(col, .25), { line: false });
    PL(c, [[-9, -37], [-13, -50], [-4, -39]], phase === 3 ? '#fff0b0' : '#ffe0a0'); PL(c, [[9, -37], [13, -50], [4, -39]], phase === 3 ? '#fff0b0' : '#ffe0a0');
    for (const x of [-6, 0, 6]) PL(c, [[x - 2, -40], [x, -45], [x + 2, -40]], dk(col, .2), false);
    eye2(c, -5, -30, 4, phase === 3 ? '#ffd84a' : '#ffec6a', { flip: true }); eye2(c, 5, -30, 4, phase === 3 ? '#ffd84a' : '#ffec6a');
    E(c, -3, -24, .9, .9, '#a02a1a', false); E(c, 3, -24, .9, .9, '#a02a1a', false);
    if (a > .2 || phase === 3) { c.globalAlpha = Math.max(a, phase === 3 ? .5 : 0); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -20, 12 + a * 14, '#ffaa3c', 1); c.restore(); E(c, 0, -21, 4 + a * 7, 2.6 + a * 3, 'rgba(255,200,80,.95)', false); c.globalAlpha = 1; }
  },
  // ---- 風まいの忍者：長いマフラーと手裏剣 ----
  ninja(c, p, a) {
    c.translate(a * 3, -S_(p, 1) * .7 + 1);
    SB(c, [[-4, -25], [-14, -23 + S_(p, 2) * 2], [-26, -16 + S_(p, 1) * 4], [-34, -12 + S_(p, 2) * 3], [-30, -8 + S_(p, 1) * 3], [-20, -12], [-8, -17]], '#e8505a');
    limb(c, -3.5, -10, -5, -4, 4.4, '#2a3050'); limb(c, 3.5, -10, 5, -4, 4.4, '#2a3050'); boots(c, '#1a1e38', -2); c.fillStyle = '#c8d0e0'; c.fillRect(-8, -5, 7, 1.4); c.fillRect(1, -5, 7, 1.4);
    GP(c, [[-8.5, -9], [8.5, -9], [7, -25], [-7, -25]], '#34406e'); c.fillStyle = '#e8505a'; c.fillRect(-7.8, -16, 15.6, 3); GE(c, 0, -14.5, 2.4, 2, '#c8d0e0');
    PL(c, [[-7, -25], [0, -20], [7, -25], [5, -27], [-5, -27]], '#e8505a'); for (const x of [-6, -2, 2, 6]) c.fillRect(x, -21, 1.2, 4);
    PL(c, [[7, -12], [11, -11], [10, -4], [7, -5]], '#6a6a88'); PL(c, [[8, -5], [12, -3], [9, 0]], '#c8d0e0', false);
    limb(c, -7, -23, -12, -16, 3.8, '#34406e'); hand(c, -12.5, -15.5);
    SB(c, [[-14, -33], [-13, -45], [0, -49], [13, -45], [14, -33], [10, -27], [-10, -27]], '#2a3050'); face2(c, -33, '#ff4a6a', { brow: '#2a2a40', mouth: 'flat' });
    SB(c, [[-12, -27], [12, -27], [10, -22], [0, -19], [-10, -22]], '#34406e', { line: true }); hl(c, -5, -24, 3, 1, 0, .35);
    SB(c, [[-14, -35], [-9, -44], [0, -41], [9, -44], [14, -35], [8, -37], [0, -39], [-8, -37]], '#3a4478'); hairShine(c, 0, -42, 9, 5, .5);
    c.fillStyle = '#34406e'; c.fillRect(-14, -39, 28, 5); GP(c, [[-6, -39.5], [6, -39.5], [6, -34.5], [-6, -34.5]], '#c8d0e0'); star5(c, 0, -37, 2.4, '#4a5a8a');
    PL(c, [[14, -37], [24, -35 + S_(p, 2) * 3], [16, -33]], '#e8505a'); PL(c, [[14, -36], [26, -40 + S_(p, 2) * 2], [17, -34]], '#c83a4a');
    c.save(); c.translate(11 + a * 3, -22 - a * 3); limb(c, -3, 3, 0, 0, 3.8, '#34406e'); hand(c, 1, -1); c.rotate(p * TAU * 2); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); PL(c, [[0, -1.5], [8, 0], [0, 1.5]], '#d8e0f0'); } E(c, 0, 0, 1.6, 1.6, '#4a5a8a', false); c.restore();
  },
  // ---- ねむりねこ：ナイトキャップとまくら ----
  cat(c, p, a) {
    const br = S_(p, 1) * .9; c.translate(0, -br * .4);
    c.strokeStyle = OUT; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(11, -6); c.quadraticCurveTo(25, -3 + S_(p, 1) * 3, 22, -20 + S_(p, 1) * 3); c.stroke(); c.strokeStyle = '#8a8aa8'; c.lineWidth = 3; c.stroke();
    GE(c, -5, -3, 4.4, 3.2, '#a8a8c4'); GE(c, 5, -3, 4.4, 3.2, '#a8a8c4');
    GE(c, 0, -14, 13.5, 12.5 + br * .4, '#a8a8c4'); E(c, 0, -11, 8, 8, '#e8e8f4', false);
    GP(c, [[-12, -34], [-9, -45], [-3, -37]], '#a8a8c4'); GP(c, [[12, -34], [9, -45], [3, -37]], '#a8a8c4'); PL(c, [[-10, -37], [-8.6, -42], [-5, -37.5]], '#ffb0c8', false); PL(c, [[10, -37], [8.6, -42], [5, -37.5]], '#ffb0c8', false);
    GE(c, 0, -28, 14.5, 12, '#a8a8c4'); c.strokeStyle = 'rgba(80,80,120,.45)'; c.lineWidth = 1.2; for (const x of [-6, 0, 6]) { c.beginPath(); c.moveTo(x, -38); c.lineTo(x * .8, -34); c.stroke(); }
    eye2(c, -5.2, -28, 4, '#6a8aff', { sleepy: true, flip: true }); eye2(c, 5.2, -28, 4, '#6a8aff', { sleepy: true });
    E(c, 0, -23.8, 1.5, 1.1, '#ff8aa0', false); c.strokeStyle = '#6a4a6a'; c.lineWidth = 1; c.beginPath(); c.arc(-1.5, -22.4, 1.6, .1, Math.PI - .1); c.arc(1.5, -22.4, 1.6, .1, Math.PI - .1); c.stroke();
    E(c, -9.5, -24, 2.4, 1.5, 'rgba(255,120,160,.5)', false); E(c, 9.5, -24, 2.4, 1.5, 'rgba(255,120,160,.5)', false);
    c.strokeStyle = 'rgba(80,60,90,.6)'; c.lineWidth = .8; for (const s of [-1, 1]) for (const dy of [-1, 1]) { c.beginPath(); c.moveTo(s * 7, -23); c.lineTo(s * 16, -23 + dy * 2.4); c.stroke(); }
    SB(c, [[-14, -38], [-11, -50], [0, -56 + S_(p, 1)], [14, -44 + S_(p, 1) * 2], [24, -34 + S_(p, 1) * 4], [14, -38], [10, -34], [-10, -34]], '#7a8aff'); for (const [x, y] of [[-8, -42], [0, -48], [8, -44]]) star5(c, x, y, 2.2, '#ffe9a0');
    PL(c, [[-14, -38], [14, -37], [14, -34], [-14, -34]], '#fff4d8'); GE(c, 24, -33 + S_(p, 1) * 4, 3.6, 3.6, '#fff4d8');
    GE(c, -14, -8 + a * 2, 9, 5.5, '#ffd8e8'); c.strokeStyle = '#ff9ac0'; c.lineWidth = .9; c.beginPath(); c.moveTo(-20, -8); c.lineTo(-8, -8); c.stroke(); star5(c, -14, -8, 2, '#fff0a0');
    GE(c, -7, -13, 3.6, 3, '#a8a8c4'); GE(c, 7, -13, 3.6, 3, '#a8a8c4');
    c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#d8c8ff'; for (let i = 0; i < 2; i++) { const q = (p + i / 2) % 1; c.globalAlpha = Math.sin(q * Math.PI); c.fillText(i ? 'z' : 'Z', 14 + q * 8 + i * 4, -40 - q * 16); } c.globalAlpha = 1;
  },
  // ---- 森のドライアド：花かんむりと葉のドレス ----
  dryad(c, p, a) {
    c.translate(0, -S_(p, 1) * .7);
    for (const x of [-9, -3, 4, 10]) { c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x * .4, -4); c.quadraticCurveTo(x * .9, 0, x * 1.4, 1); c.stroke(); }
    limb(c, -3, -10, -3, -4, 3.8, '#a8d890'); limb(c, 3, -10, 3, -4, 3.8, '#a8d890'); GE(c, -3, -2.5, 3.6, 2.6, '#7a5a30'); GE(c, 3, -2.5, 3.6, 2.6, '#7a5a30');
    SB(c, [[-5, -24], [-14, -18], [-17 + S_(p, 1), -7], [-9, -3], [0, -6], [9, -3], [17 - S_(p, 1), -7], [14, -18], [5, -24]], '#3f9a4a');
    for (const [x, y, r, col] of [[-10, -9, 6, '#58b858'], [10, -9, 6, '#58b858'], [0, -6, 6, '#6fd06a'], [-5, -15, 5, '#6fd06a'], [6, -15, 5, '#58b858']]) { c.save(); c.translate(x, y); c.rotate(x * .08); GE(c, 0, 0, r, r * .55, col, { lw: 1 }); c.strokeStyle = 'rgba(30,90,40,.5)'; c.lineWidth = .7; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); c.restore(); }
    GP(c, [[-6, -24], [6, -24], [5, -17], [-5, -17]], '#d8f0a8'); limb(c, -7, -22, -13, -15 + S_(p, 1), 3.4, '#a8d890'); hand(c, -13.5, -14 + S_(p, 1));
    SB(c, [[-15, -33], [-17, -22], [-14, -8 + S_(p, 1) * 2], [-9, -12], [-10, -26]], '#4ab86a'); SB(c, [[15, -33], [17, -22], [14, -8 - S_(p, 1) * 2], [9, -12], [10, -26]], '#4ab86a');
    SB(c, [[-15, -33], [-14, -45], [0, -50], [14, -45], [15, -33], [11, -27], [-11, -27]], '#5ad07a'); face2(c, -33, '#c8501e', { brow: '#2a8a4a', skin: '#ffe9d6' });
    SB(c, [[-14, -35], [-9, -45], [0, -42], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#7aeca0'); hairShine(c, 0, -42, 9, 5, .5);
    for (const [x, y, col] of [[-10, -44, '#ff9ed2'], [-4, -48, '#fff27a'], [4, -48, '#ff9ed2'], [10, -44, '#b9a0ff']]) { for (let i = 0; i < 5; i++) { const aa = i / 5 * TAU; E(c, x + Math.cos(aa) * 2.4, y + Math.sin(aa) * 2.4, 1.7, 1.7, col, false); } E(c, x, y, 1.3, 1.3, '#ffd24a', false); }
    PL(c, [[-18, -34], [-14, -39], [-14, -33]], '#58b858'); PL(c, [[18, -34], [14, -39], [14, -33]], '#58b858');
    c.save(); c.translate(13, -10); c.rotate(-a * .3); c.strokeStyle = OUT; c.lineWidth = 4.2; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(3, -10, -1, -32); c.stroke(); c.strokeStyle = '#8a6a3a'; c.lineWidth = 2.4; c.stroke();
    for (let i = 0; i < 5; i++) { const aa = i / 5 * TAU + p * TAU; E(c, -1 + Math.cos(aa) * 4.4, -35 + Math.sin(aa) * 4.4, 2.6, 2.6, '#ffb0d8', false); } E(c, -1, -35, 2.6, 2.6, '#ffe27a', false); sparkle(c, -1 + S_(p, 1) * 6, -42 - a * 6, 2.4, '#fff'); c.restore(); limb(c, 7, -22, 12, -12, 3.4, '#a8d890'); hand(c, 13, -11);
  },
  // ---- きつねの巫女：三本のしっぽと狐火 ----
  miko(c, p, a) {
    c.translate(0, -S_(p, 1) * .8);
    for (const [dx, dy, k] of [[-8, 0, 1], [0, -3, 0], [8, 0, -1]]) { c.save(); c.translate(dx, -10 + dy); c.rotate(k * .55 + S_(p, 1) * .12 * (k || 1)); SB(c, [[-4, 0], [-6, -14], [0, -26], [6, -14], [4, 0]], '#ffa24a'); SB(c, [[-1.5, -14], [0, -26], [1.8, -14]], '#fff4d8', { line: false }); c.restore(); }
    limb(c, -3, -9, -3, -3, 3.6, '#a8322a'); limb(c, 3, -9, 3, -3, 3.6, '#a8322a'); GE(c, -3, -2, 3.8, 2.4, '#f6efe0'); GE(c, 3, -2, 3.8, 2.4, '#f6efe0');
    GP(c, [[-8, -17], [8, -17], [13, -4], [-13, -4]], '#d83a3a'); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = .9; for (const x of [-6, -2, 2, 6]) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x * 1.5, -5); c.stroke(); }
    GP(c, [[-9, -25], [9, -25], [8, -15], [-8, -15]], '#fffaf0'); PL(c, [[-5, -25], [0, -19], [5, -25]], '#d83a3a', false); GP(c, [[-3, -18], [3, -18], [3, -14], [-3, -14]], '#ffd24a');
    SB(c, [[-9, -24], [-18, -22], [-20, -10 + S_(p, 1) * 2], [-12, -10], [-9, -17]], '#fffaf0'); SB(c, [[9, -24], [18, -22], [20, -10 - S_(p, 1) * 2], [12, -10], [9, -17]], '#fffaf0'); c.fillStyle = '#d83a3a'; c.fillRect(-20, -12, 8, 2); c.fillRect(12, -12, 8, 2);
    SB(c, [[-15, -33], [-14, -45], [0, -49], [14, -45], [15, -33], [11, -26], [-11, -26]], '#ffb86a'); GP(c, [[-14, -41], [-11, -55], [-3, -43]], '#ffb86a'); GP(c, [[14, -41], [11, -55], [3, -43]], '#ffb86a'); PL(c, [[-12, -43], [-10.6, -51], [-6, -44]], '#fff0d8', false); PL(c, [[12, -43], [10.6, -51], [6, -44]], '#fff0d8', false);
    face2(c, -33, '#ff7a3a', { brow: '#c8803a' }); SB(c, [[-14, -35], [-9, -45], [0, -41], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#ffc87e'); hairShine(c, 0, -41, 9, 5);
    GE(c, 0, -43, 4, 2.4, '#ffd24a'); E(c, 0, -43, 1.6, 1.6, '#d83a3a', false); PL(c, [[-14, -37], [-18, -28 + S_(p, 1) * 2], [-12, -33]], '#d83a3a', false);
    c.save(); c.translate(12, -17); c.rotate(-.2 - a * .5); c.fillStyle = '#a07a4a'; c.fillRect(-1, -22, 2, 30); PL(c, [[-1, -22], [-7, -26], [-4, -31], [-1, -27]], '#fff', false); PL(c, [[1, -22], [7, -26 + S_(p, 2) * 2], [4, -31], [1, -27]], '#fff', false); c.restore(); limb(c, 8, -22, 12, -16, 3.4, '#fffaf0'); hand(c, 12, -16);
    for (let i = 0; i < 2; i++) { const q = p + i * .5, x = -20 + i * 40 + C_(q, 1) * 3, y = -34 - 6 * i + S_(q, 1) * 4; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, 13, i ? '#6ac8ff' : '#ff8a3a', .75); c.restore(); SB(c, [[x - 3, y + 3], [x - 3.5, y - 2], [x, y - 8], [x + 3.5, y - 2], [x + 3, y + 3]], i ? '#6ac8ff' : '#ff9a4a', { line: false }); SB(c, [[x - 1.3, y + 2], [x, y - 3], [x + 1.3, y + 2]], '#fff8e0', { line: false }); }
  },
  // ---- 大砲ガール：ゴーグルのベレー帽 ----
  cannon(c, p, a) {
    c.translate(-a * 2, 0);
    c.save(); c.translate(10, -8 + S_(p, 1) * .4); c.rotate(-.18 - a * .08); c.translate(-a * 4, 0);
    GP(c, [[-8, -7], [18, -9], [19, 3], [-8, 5]], '#4a4a60'); GP(c, [[17, -11], [26, -10], [26, 5], [17, 5]], '#3a3a50'); GE(c, 26, -3, 3, 7.4, '#2a2a40'); E(c, 27, -3, 1.6, 4.4, '#0a0a14', false); c.fillStyle = '#c8a34a'; c.fillRect(2, -9, 2.4, 14); c.fillRect(11, -10, 2.4, 14); c.restore();
    GE(c, 6, 0, 7, 7, '#7a5a3a'); GE(c, 6, 0, 3, 3, '#c8a34a'); c.strokeStyle = OUT; c.lineWidth = .9; for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU; c.beginPath(); c.moveTo(6 + Math.cos(aa) * 3, Math.sin(aa) * 3); c.lineTo(6 + Math.cos(aa) * 6.5, Math.sin(aa) * 6.5); c.stroke(); }
    for (const [x, y] of [[-14, -2], [-9, -2], [-11.5, -6]]) GE(c, x, y, 3.2, 3.2, '#3a3a50', { lw: 1 });
    limb(c, -4, -10, -4, -4, 4, '#8a5a3a'); limb(c, 2, -10, 2, -4, 4, '#8a5a3a'); boots(c, '#4a2a1a'); c.translate(-2, 0);
    GP(c, [[-8, -9], [8, -9], [7, -25], [-7, -25]], '#c85a3a'); GP(c, [[-8, -9], [-4, -9], [-3, -22], [-8, -24]], '#7a4a2a'); GP(c, [[8, -9], [4, -9], [3, -22], [8, -24]], '#7a4a2a'); c.fillStyle = '#ffd24a'; for (const y of [-12, -16, -20]) { E(c, -5.4, y, 1, 1, '#ffd24a', false); E(c, 5.4, y, 1, 1, '#ffd24a', false); }
    PL(c, [[-7, -25], [0, -20], [7, -25], [5, -27], [-5, -27]], '#fff6e8');
    limb(c, -7, -23, -12, -16, 3.6, '#c85a3a'); hand(c, -12.5, -15.5); limb(c, 7, -23, 13, -15, 3.6, '#c85a3a'); hand(c, 13.5, -14.5);
    SB(c, [[-15, -33], [-16, -22], [-13, -12], [-10, -22], [-11, -28]], '#a8402a'); SB(c, [[15, -33], [16, -22 + S_(p, 1) * 2], [13, -12], [10, -22], [11, -28]], '#a8402a');
    SB(c, [[-15, -33], [-14, -45], [0, -49], [14, -45], [15, -33], [11, -27], [-11, -27]], '#c84a2a'); face2(c, -33, '#3aa8ff', { brow: '#8a3a1a', mouth: 'open' });
    SB(c, [[-14, -35], [-9, -45], [0, -41], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#e06a3a'); hairShine(c, 0, -41, 9, 5);
    SB(c, [[-17, -40], [-12, -48], [0, -52], [14, -48], [20, -40], [10, -40], [0, -42], [-10, -40]], '#a8322a'); GE(c, 0, -52, 2, 2, '#a8322a');
    GP(c, [[-13, -41], [-5, -41], [-5, -35], [-13, -35]], '#c8a34a'); E(c, -9, -38, 3.2, 3.2, '#9ad8ff'); hl(c, -10, -39, 1.2, 1, 0, .9); c.fillStyle = '#7a5a3a'; c.fillRect(-5, -39, 11, 1.8);
    if (a > .25) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 36, -10, 16 + a * 6, '#ffd24a', a); c.restore(); for (let i = 0; i < 3; i++) E(c, 34 + i * 5, -12 - i * 3, 3 + i, 3 + i, 'rgba(240,240,240,' + (a * .6) + ')', false); }
  },
  // ---- 時の魔女：時計の帽子と砂時計の杖 ----
  chrono(c, p, a) {
    c.translate(0, -S_(p, 1) * 1.2);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -28, 34, '#9ab0ff', .3); c.restore();
    c.save(); c.translate(0, -26); c.scale(1, .42); c.strokeStyle = 'rgba(190,210,255,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.stroke(); for (let i = 0; i < 12; i++) { const aa = i / 12 * TAU + p * TAU; E(c, Math.cos(aa) * 25, Math.sin(aa) * 25, i % 3 ? 1.2 : 2.2, i % 3 ? 1.2 : 2.2, i % 3 ? '#cfd8ff' : '#fff', false); } c.restore();
    SB(c, [[-5, -24], [-14, -20], [-18, -8], [-10, -3], [0, -6], [10, -3], [18, -8], [14, -20], [5, -24]], '#5a4aa8');
    GP(c, [[-5, -23], [5, -23], [11, -4], [-11, -4]], '#8a78e0'); for (const [x, y] of [[-5, -10], [5, -13], [0, -18], [3, -6]]) star5(c, x, y, 1.8, '#ffe9a0'); PL(c, [[-11, -4], [11, -4], [12, -2], [-12, -2]], '#ffd24a');
    GE(c, 0, -19, 4.4, 4.4, '#ffe9a0'); c.strokeStyle = '#5a4aa8'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -19); c.lineTo(0, -22); c.moveTo(0, -19); c.lineTo(2.4, -18); c.stroke();
    SB(c, [[-16, -33], [-18, -20], [-14, -4 + S_(p, 1) * 2], [-9, -12], [-10, -27]], '#c8b4ff'); SB(c, [[16, -33], [18, -20], [14, -4 - S_(p, 1) * 2], [9, -12], [10, -27]], '#c8b4ff');
    SB(c, [[-15, -33], [-14, -45], [0, -50], [14, -45], [15, -33], [11, -26], [-11, -26]], '#d2c0ff'); face2(c, -33, '#7a5aff', { brow: '#9a82d8' });
    SB(c, [[-14, -35], [-9, -45], [0, -41], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#e4d8ff'); hairShine(c, 0, -41, 9, 5, .6);
    SB(c, [[-19, -41], [0, -48], [19, -41], [12, -37], [0, -39], [-12, -37]], '#4a3a98'); SB(c, [[-9, -43], [-5, -58], [5, -58], [9, -43]], '#5a4aa8');
    GE(c, 0, -52, 6.5, 6.5, '#fff6e0'); c.strokeStyle = '#4a3a98'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -52); c.lineTo(0, -56.5); c.moveTo(0, -52); c.lineTo(3.4, -50.4); c.stroke(); for (let i = 0; i < 12; i++) { const aa = i / 12 * TAU; E(c, Math.cos(aa) * 5, -52 + Math.sin(aa) * 5, .5, .5, '#4a3a98', false); }
    c.save(); c.translate(13, -10); c.rotate(-a * .25); c.fillStyle = '#c9a54a'; c.fillRect(-1.2, -26, 2.4, 40);
    PL(c, [[-6, -44], [6, -44], [1, -35], [6, -26], [-6, -26], [-1, -35]], 'rgba(200,230,255,.55)'); c.fillStyle = '#ffd890'; PL(c, [[-4, -43], [4, -43], [0, -37]], '#ffd890', false); PL(c, [[-4.6, -27], [4.6, -27], [0, -31]], '#ffd890', false); c.fillRect(-.5, -37, 1, 6); c.fillStyle = '#c9a54a'; c.fillRect(-7.5, -46, 15, 2.4); c.fillRect(-7.5, -26, 15, 2.4); c.restore();
    limb(c, 7, -22, 12, -12, 3.4, '#8a78e0'); hand(c, 13, -11);
  },
  // ---- ゆうれいランタン：青い炎の提灯 ----
  ghost(c, p, a) {
    const b = S_(p, 1) * 2.5; c.translate(0, -7 + b);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -20, 32, '#8ac8ff', .4); c.restore(); c.globalAlpha = .93;
    const tw = S_(p, 1) * 3;
    SB(c, [[-14, -22], [-13, -34], [0, -41], [13, -34], [14, -22], [15 + tw, -9], [11, 2 + tw], [6, -4], [0, 5 - tw], [-6, -4], [-11, 2 - tw], [-15 - tw, -9]], '#f4f8ff');
    SB(c, [[-8, -12], [0, -16], [8, -12], [5, -3], [0, 0], [-5, -3]], 'rgba(200,220,255,.7)', { line: false }); hl(c, -6, -33, 4, 2, -.5, .55);
    limb(c, -12, -22, -19, -14 + S_(p, 1) * 2, 3.8, '#f4f8ff'); GE(c, -19.5, -13 + S_(p, 1) * 2, 3, 3, '#f4f8ff');
    eye2(c, -5.4, -27, 4.6, '#5a8aff', { sleepy: false, flip: true }); eye2(c, 5.4, -27, 4.6, '#5a8aff'); E(c, -9.4, -21.5, 2.6, 1.6, 'rgba(255,130,170,.55)', false); E(c, 9.4, -21.5, 2.6, 1.6, 'rgba(255,130,170,.55)', false);
    E(c, 0, -20.4, 2, 1.5, '#8a4a7a', false);
    SB(c, [[-12, -37], [-8, -48], [0, -46], [8, -48], [12, -37], [0, -41]], '#6a4aa8'); star5(c, 0, -43, 2.2, '#ffe9a0'); PL(c, [[-6, -45], [-3, -52], [0, -46]], '#6a4aa8', false);
    c.globalAlpha = 1;
    c.save(); c.translate(16, -16 + S_(p, 1) * 2 - a * 3); c.strokeStyle = '#6a6a88'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, -11); c.stroke(); GE(c, 0, -12, 3, 1.4, '#6a6a88'); GP(c, [[-6, -10], [6, -10], [7, 4], [-7, 4]], 'rgba(255,230,150,.35)'); c.fillStyle = '#6a6a88'; c.fillRect(-7, -10.4, 14, 2); c.fillRect(-7, 3, 14, 2);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -3, 22 + a * 8, '#7ac8ff', .9); c.restore(); SB(c, [[-3.5, 2], [-4, -3], [0, -9 - S_(p, 2) * 1.5], [4, -3], [3.5, 2]], '#6ac8ff', { line: false }); SB(c, [[-1.6, 1.5], [0, -4], [1.6, 1.5]], '#e8f8ff', { line: false }); c.restore();
    for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; E(c, -14 + i * 14 + S_(q, 1) * 3, 4 - q * 8, 1.6, 1.6, 'rgba(170,220,255,' + (.7 - q * .7) + ')', false); }
  },
  // ---- 聖騎士：銀の鎧と赤いマント ----
  paladin(c, p, a) {
    c.translate(a * 2, -S_(p, 1) * .6);
    SB(c, [[-5, -26], [-15, -22], [-21 + S_(p, 1) * 2, -8], [-15, 0 + S_(p, 2)], [-6, -4], [4, -8]], '#c8323a');
    limb(c, -3.5, -10, -3.5, -4, 4.6, '#aab4c8'); limb(c, 3.5, -10, 3.5, -4, 4.6, '#aab4c8'); GE(c, -4, -2.5, 4.8, 3.2, '#8a98b0'); GE(c, 4, -2.5, 4.8, 3.2, '#8a98b0');
    GP(c, [[-9, -9], [9, -9], [8, -26], [-8, -26]], '#c8d4e8'); GP(c, [[-5, -24], [5, -24], [4, -14], [-4, -14]], '#e8f0fa', { a: .2 }); c.fillStyle = '#ffd24a'; c.fillRect(-1, -25, 2, 15); c.fillRect(-4, -20, 8, 2); c.fillRect(-9, -11, 18, 2.4);
    GE(c, -10, -25, 5.4, 4.4, '#aab4c8'); GE(c, 10, -25, 5.4, 4.4, '#aab4c8'); hl(c, -11, -26.4, 2, 1, 0, .6); hl(c, 9, -26.4, 2, 1, 0, .6);
    limb(c, 8, -23, 14, -14, 3.8, '#aab4c8'); hand(c, 14.5, -13.5);
    c.save(); c.translate(15, -19); c.rotate(.15 - a * 1.5); GP(c, [[-1.8, -4], [1.8, -4], [1.8, -34], [0, -40], [-1.8, -34]], '#f4f8ff'); hl(c, -.8, -22, .6, 9, 0, .9); GE(c, 0, -4, 5.4, 1.8, '#ffd24a'); c.fillStyle = '#7a4a2a'; c.fillRect(-1.2, -3, 2.4, 6); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -22, 18, '#fff3a0', .4 + a * .4); c.restore(); c.restore();
    c.save(); c.translate(-14, -17); SB(c, [[-7, -12], [7, -12], [8, 0], [0, 12], [-8, 0]], '#4a7ae0'); c.fillStyle = '#ffd24a'; c.fillRect(-1.2, -9, 2.4, 16); c.fillRect(-5, -3, 10, 2.4); star5(c, 0, 3, 1.8, '#fff'); c.strokeStyle = '#ffd24a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6.4, -10.5); c.lineTo(6.4, -10.5); c.stroke(); c.restore();
    limb(c, -8, -23, -12, -18, 3.8, '#aab4c8');
    SB(c, [[-14, -34], [-14, -45], [0, -50], [14, -45], [14, -34], [10, -28], [-10, -28]], '#f6dc82'); face2(c, -33, '#3a8aff', { brow: '#a88a30' });
    SB(c, [[-14, -37], [-14, -48], [0, -54], [14, -48], [14, -37], [10, -39], [0, -43], [-10, -39]], '#c8d4e8'); GP(c, [[-3, -36], [3, -36], [3, -42], [-3, -42]], '#8a98b0', { line: false }); hl(c, -6, -46, 4, 1.6, -.4, .6);
    for (const s of [-1, 1]) { c.save(); c.scale(s, 1); SB(c, [[13, -44], [22, -52], [24, -44], [16, -40]], '#fff6e8'); c.restore(); }
    PL(c, [[-3, -53], [0, -64 + S_(p, 1)], [3, -53]], '#e04a5a'); GE(c, 0, -52, 3, 2, '#ffd24a');
  },
  // ---- 錬金術師：ゴーグルと泡立つ薬ビン ----
  alchemist(c, p, a) {
    c.translate(0, -S_(p, 1) * .7);
    SB(c, [[-5, -25], [-14, -21], [-17, -7], [-9, -4], [0, -6], [9, -4], [17, -7], [14, -21], [5, -25]], '#7a5a3a');
    limb(c, -3.5, -10, -3.5, -4, 4.2, '#5a4a40'); limb(c, 3.5, -10, 3.5, -4, 4.2, '#5a4a40'); boots(c, '#3a2a1a');
    GP(c, [[-9, -9], [9, -9], [8, -25], [-8, -25]], '#f0e6d0'); GP(c, [[-6, -24], [6, -24], [7, -9], [-7, -9]], '#c8a07a'); c.fillStyle = '#6a4a2a'; c.fillRect(-8, -17, 16, 2.4);
    for (const [x, col] of [[-5, '#ff6a8a'], [-1.6, '#7aff9a'], [1.8, '#6ac8ff'], [5.2, '#ffd24a']]) { PL(c, [[x - 1.2, -17], [x + 1.2, -17], [x + 1.6, -12], [x - 1.6, -12]], 'rgba(255,255,255,.55)'); c.fillStyle = col; c.fillRect(x - 1.4, -14, 2.8, 2); }
    GE(c, 0, -21, 2.4, 2.4, '#c9a54a'); c.strokeStyle = '#6a4a2a'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU + p * TAU; c.beginPath(); c.moveTo(Math.cos(aa) * 1.2, -21 + Math.sin(aa) * 1.2); c.lineTo(Math.cos(aa) * 2.8, -21 + Math.sin(aa) * 2.8); c.stroke(); }
    limb(c, -7, -23, -12, -16, 3.8, '#f0e6d0'); hand(c, -12.5, -15.5);
    SB(c, [[12, -36], [20, -33], [24 + S_(p, 1) * 2, -22], [18, -18], [12, -28]], '#e8742a'); GE(c, 16, -30, 3, 3, '#ffa24a', { line: false });
    SB(c, [[-15, -33], [-14, -45], [0, -49], [14, -45], [15, -33], [11, -27], [-11, -27]], '#e8742a'); face2(c, -33, '#2ab88a', { brow: '#a8481a', mouth: 'open' });
    SB(c, [[-14, -35], [-9, -45], [0, -41], [9, -45], [14, -35], [8, -38], [0, -37], [-8, -38]], '#f08a3a'); hairShine(c, 0, -41, 9, 5);
    c.fillStyle = '#6a4a2a'; c.fillRect(-15, -44, 30, 3.4); for (const x of [-6.5, 6.5]) { GE(c, x, -43, 5.4, 5.4, '#c9a54a'); E(c, x, -43, 3.4, 3.4, 'rgba(154,255,200,.85)', false); hl(c, x - 1, -44.4, 1.2, 1, 0, .9); }
    c.save(); c.translate(13, -17 - a * 4); c.rotate(a * .3); limb(c, -3, 4, 0, 0, 3.6, '#f0e6d0'); hand(c, 1, -1);
    GE(c, 1, -9, 7, 7.4, 'rgba(210,235,255,.5)'); c.save(); c.beginPath(); c.arc(1, -9, 6.4, 0, TAU); c.clip(); c.fillStyle = '#7aff9a'; c.fillRect(-6, -10 + S_(p, 1) * .8, 14, 12); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-6, -10 + S_(p, 1) * .8, 14, 1.6); c.restore();
    c.fillStyle = '#c8d0e0'; c.fillRect(-1.4, -21, 5.6, 6); c.fillStyle = '#7a5a3a'; c.fillRect(-2, -23, 7, 2.4); hl(c, -2, -11, 1.4, 2.6, 0, .6);
    for (let i = 0; i < 4; i++) { const q = (p * 2 + i / 4) % 1; E(c, 1 + S_(q, 1) * 3, -22 - q * 16, 1.8 * (1 - q) + .6, 1.8 * (1 - q) + .6, 'rgba(160,255,190,' + (.85 - q * .8) + ')', false); }
    c.restore();
  },
});
