'use strict';
// ===== 新ボス 5 体 =====
Object.assign(BSPR, {
  pharaoh(c, p) {
    const b = S_(p, 1) * 1.6; c.translate(0, -b); E(c, 0, 2, 22, 4, 'rgba(0,0,0,.2)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -34, 40, '#7ad8ff', .25); c.restore();
    SB(c, [[-14, -4], [-16, -26], [-10, -36], [0, -38], [10, -36], [16, -26], [14, -4], [0, 0]], '#e8dcc0');
    c.strokeStyle = 'rgba(120,100,70,.5)'; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-14, -8 - i * 4.4); c.lineTo(14, -12 - i * 4.4); c.stroke(); }
    SB(c, [[-12, -34], [12, -34], [15, -26], [0, -22], [-15, -26]], '#ffd24a'); for (const x of [-8, -3, 3, 8]) E(c, x, -29, 1.8, 1.8, i2(x), false);
    function i2(x) { return x % 2 ? '#4a9aff' : '#ff4a6a'; }
    SB(c, [[-15, -46], [-17, -62], [-8, -70], [0, -72], [8, -70], [17, -62], [15, -46], [11, -38], [-11, -38]], '#4a7ae0');
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#ffd24a' : '#4a7ae0'; c.fillRect(-17 + i * 0, -64 + i * 5, 34, 2.6); }
    SB(c, [[-15, -46], [-17, -62], [-8, -70], [0, -72], [8, -70], [17, -62], [15, -46]], 'rgba(0,0,0,0)', { line: true });
    GE(c, 0, -46, 11, 10, '#d8a870'); eye2(c, -4.4, -46, 3.4, '#7ad8ff', { noLash: true, flip: true }); eye2(c, 4.4, -46, 3.4, '#7ad8ff', { noLash: true });
    for (const sg of [-1, 1]) { PL(c, [[sg * 14, -58], [sg * 26, -50 + S_(p, 2) * 2], [sg * 17, -44]], '#4a7ae0'); }
    GE(c, 0, -56, 3, 4.4, '#ff4a4a'); PL(c, [[-2, -60], [0, -68], [2, -60]], '#ffd24a');
    c.save(); c.translate(20, -20); c.fillStyle = '#c9a54a'; c.fillRect(-1.4, -40, 2.8, 50); c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.ellipse(0, -46, 5, 6, 0, 0, TAU); c.stroke(); c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.stroke(); c.fillRect(-6, -37, 12, 3); c.restore();
    limb(c, 13, -26, 20, -20, 4.4, '#e8dcc0');
  },
  magmadragon(c, p) { const a = 0;
    const b = S_(p, 1) * 1.4; c.translate(0, -b); E(c, 0, 2, 30, 5, 'rgba(0,0,0,.25)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -34, 54, '#ff6a2a', .4 + S_(p, 2) * .08); c.restore();
    const fl = S_(p, 2) * 7;
    SB(c, [[-6, -34], [-26, -56 + fl], [-40, -46 + fl], [-34, -34], [-26, -24]], '#5a2a2a'); SB(c, [[6, -34], [26, -56 + fl], [40, -46 + fl], [34, -34], [26, -24]], '#5a2a2a');
    c.strokeStyle = '#ff8a2a'; c.lineWidth = 1.4; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * 8, -34); c.lineTo(sg * 36, -46 + fl); c.moveTo(sg * 8, -32); c.lineTo(sg * 30, -26); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, -8); c.quadraticCurveTo(34, -2 + S_(p, 1) * 4, 36, -22); c.stroke(); c.strokeStyle = '#7a2a1a'; c.lineWidth = 9; c.stroke();
    GE(c, -9, -4, 7, 5, '#7a2a1a'); GE(c, 9, -4, 7, 5, '#7a2a1a');
    SB(c, [[-17, -14], [-19, -30], [-10, -42], [0, -44], [10, -42], [19, -30], [17, -14], [0, -6]], '#8a2a1a'); SB(c, [[-9, -16], [0, -20], [9, -16], [6, -8], [-6, -8]], '#ffb040', { line: false });
    c.strokeStyle = '#ffa030'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-12, -38); c.lineTo(-7, -30); c.lineTo(-12, -22); c.moveTo(12, -38); c.lineTo(7, -28); c.lineTo(11, -20); c.stroke();
    for (let i = -2; i <= 2; i++) SB(c, [[i * 6 - 3, -42], [i * 6, -52 - (2 - Math.abs(i)) * 2 + S_(p + i * .13, 2) * 2], [i * 6 + 3, -42]], '#ff8a2a', { line: false });
    GE(c, 0, -56, 15, 12.5, '#a8321e'); GE(c, 0, -51, 9, 6, '#d8503a', { line: false }); PL(c, [[-12, -64], [-18, -80], [-6, -66]], '#ffe0a0'); PL(c, [[12, -64], [18, -80], [6, -66]], '#ffe0a0');
    eye2(c, -6, -58, 4.2, '#ffec6a', { noLash: true, flip: true }); eye2(c, 6, -58, 4.2, '#ffec6a', { noLash: true }); E(c, -2.6, -50, 1, 1.3, '#2a0a0a', false); E(c, 2.6, -50, 1, 1.3, '#2a0a0a', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -48, 14, '#ffb040', .6 + a * .4); c.restore();
  },
  guardian(c, p) { const a = 0;
    const b = S_(p, 1) * 2; c.translate(0, -b); E(c, 0, 4, 24, 4, 'rgba(0,0,0,.18)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -40, 50, '#fff3a0', .35); c.restore();
    const fl = S_(p, 2) * .1; for (const sg of [-1, 1]) { c.save(); c.scale(sg, 1); c.rotate(fl); SB(c, [[6, -40], [28, -66], [42, -54], [38, -36], [28, -24], [12, -28]], '#f6f2e8'); c.strokeStyle = 'rgba(160,150,120,.6)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(9, -38 + i * 3); c.lineTo(36 - i * 3, -52 + i * 6); c.stroke(); } c.restore(); }
    GP(c, [[-15, -6], [15, -6], [13, -40], [-13, -40]], '#e8e4d8'); GP(c, [[-8, -36], [8, -36], [7, -16], [-7, -16]], '#f8f4e8', { line: false }); c.fillStyle = '#ffd24a'; c.fillRect(-1.4, -38, 2.8, 30); c.fillRect(-13, -20, 26, 3);
    GE(c, -15, -38, 7, 6, '#ffd24a'); GE(c, 15, -38, 7, 6, '#ffd24a');
    c.save(); c.translate(24, -30); c.rotate(.15 - a * .6); GP(c, [[-2.4, 0], [2.4, 0], [2.4, -40], [0, -48], [-2.4, -40]], '#e8f2ff'); GE(c, 0, 0, 7, 2.4, '#ffd24a'); c.fillStyle = '#7a4a2a'; c.fillRect(-1.6, 1, 3.2, 8); c.restore(); limb(c, 14, -36, 22, -30, 5, '#e8e4d8');
    GE(c, 0, -52, 13, 12, '#f2eee0'); c.fillStyle = '#2a3a5a'; rr(c, -9, -55, 18, 6, 2); c.fill(); eye2(c, -3.8, -52, 2.4, '#7ad8ff', { noLash: true }); eye2(c, 3.8, -52, 2.4, '#7ad8ff', { noLash: true }); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -52, 14, '#7ad8ff', .5); c.restore();
    SB(c, [[-3, -62], [0, -76], [3, -62]], '#ffd24a'); c.strokeStyle = '#ffe27a'; c.lineWidth = 2.6; c.beginPath(); c.ellipse(0, -72 + S_(p, 1), 12, 3.4, 0, 0, TAU); c.stroke();
  },
  kraken(c, p) { const a = 0;
    E(c, 0, 2, 30, 5, 'rgba(0,0,0,.22)', false); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -34, 52, '#7affd8', .28); c.restore();
    for (let i = 0; i < 7; i++) { const x = -26 + i * 8.7, w = S_(p + i * .12, 1) * 6, hh = 34 + (i % 2) * 8; c.strokeStyle = OUT; c.lineWidth = 8.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x * .6, -26); c.bezierCurveTo(x * 1.1, -10, x * 1.4 + w, 4, x * 1.2 + w * 1.4, 2 - (i % 2) * 4 - a * 6); c.stroke(); c.strokeStyle = '#8a4aa8'; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#ffb0e0'; c.lineWidth = 1.6; c.setLineDash([2, 4]); c.stroke(); c.setLineDash([]); }
    SB(c, [[-22, -30], [-24, -50], [-14, -68], [0, -74], [14, -68], [24, -50], [22, -30], [10, -22], [-10, -22]], '#a85ac8'); SB(c, [[-12, -62], [0, -70], [12, -62], [8, -54], [-8, -54]], '#d090e8', { line: false });
    for (const [x, y] of [[-14, -46], [10, -58], [16, -40], [-6, -62]]) E(c, x, y, 2.6, 2.6, '#e8b8f8', false);
    for (const sg of [-1, 1]) { E(c, sg * 9, -38, 7.4, 8.4, '#fff', true); E(c, sg * 9, -38, 4.2, 6, '#ffd24a', false); E(c, sg * 9, -38, 1.8, 4.6, '#241238', false); hl(c, sg * 9 - 1.4, -41, 1.4, 1.4, 0, 1); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(sg * 2, -46); c.lineTo(sg * 16, -49); c.stroke(); }
    for (let i = 0; i < 4; i++) { const q = (p * 2 + i / 4) % 1; E(c, -20 + i * 13 + S_(q, 1) * 3, -30 - q * 40, 2.2 * (1 - q) + .6, 2.2 * (1 - q) + .6, 'rgba(190,255,235,' + (.8 - q * .7) + ')', false); }
  },
  demonking(c, p) { const a = 0;
    c.translate(0, -S_(p, 1) * 1.6); E(c, 0, 2, 26, 4, 'rgba(0,0,0,.25)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -36, 54, '#a040ff', .4 + S_(p, 2) * .08); glowDot(c, 0, -52, 22, '#ff3a6a', .3); c.restore();
    SB(c, [[-34, -2], [-16, -40], [16, -40], [34, -2], [14, 3 + S_(p, 2) * 2], [0, -3], [-14, 3 - S_(p, 2) * 2]], '#2a1048');
    for (let i = 0; i < 6; i++) { const x = -26 + i * 10.4; SB(c, [[x - 3, -4], [x, -14 - S_(p + i * .16, 2) * 4], [x + 3, -4]], '#a040ff', { line: false }); }
    SB(c, [[-14, -6], [14, -6], [10, -38], [-10, -38]], '#3a1a6a'); c.fillStyle = '#ffd24a'; c.fillRect(-1.4, -38, 2.8, 32); for (const [x, y] of [[-6, -14], [6, -22], [-5, -30]]) star5(c, x, y, 2, '#ffe9a0');
    GE(c, -18, -38, 8, 6.6, '#2a1a4a'); GE(c, 18, -38, 8, 6.6, '#2a1a4a'); for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) PL(c, [[sg * (13 + i * 5), -42], [sg * (15 + i * 5), -50], [sg * (17 + i * 5), -42]], '#a040ff');
    GE(c, 0, -52, 14, 12.5, '#e8dcff'); c.fillStyle = '#2a1a4a'; c.beginPath(); c.arc(0, -52, 15, Math.PI * 1.04, Math.PI * 1.96); c.fill();
    eye2(c, -5, -52, 3.6, '#ff3a6a', { noLash: true, flip: true }); eye2(c, 5, -52, 3.6, '#ff3a6a', { noLash: true }); c.save(); c.globalCompositeOperation = 'lighter'; for (const x of [-5, 5]) glowDot(c, x, -52, 10, '#ff3a6a', .7); c.restore();
    for (const sg of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(sg * 11, -60); c.quadraticCurveTo(sg * 24, -62, sg * 22, -80); c.stroke(); c.strokeStyle = '#e8dcc0'; c.lineWidth = 4.4; c.stroke(); }
    PL(c, [[-10, -64], [-8, -74], [-3, -68], [0, -78], [3, -68], [8, -74], [10, -64]], '#ffd24a'); GE(c, 0, -68, 2.4, 2.4, '#ff3a6a', { lw: .8 });
    c.save(); c.translate(-26, -22); c.rotate(-a * .6); c.fillStyle = '#5a4a7a'; c.fillRect(-1.6, -34, 3.2, 52); SB(c, [[0, -36], [-6, -50], [0, -64], [6, -50]], '#c8a0ff'); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -50, 18, '#c070ff', .7); c.restore(); c.restore(); limb(c, -14, -34, -24, -26, 5, '#3a1a6a');
  },
});
