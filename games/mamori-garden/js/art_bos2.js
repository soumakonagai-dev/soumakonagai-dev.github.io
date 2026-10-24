'use strict';
// ===== 新ボス 5 体（ステージ11〜15） =====
Object.assign(BSPR, {
  kyuubi(c, p) {
    c.translate(0, -S_(p, 1) * 1.6); E(c, 0, 2, 26, 4, 'rgba(0,0,0,.22)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -36, 56, '#ff9ac8', .3); c.restore();
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .3 + S_(p + i * .1, 1) * .08; SB(c, [[Math.cos(a) * 8, -22 + Math.sin(a) * 4], [Math.cos(a - .18) * 40, -22 + Math.sin(a - .18) * 40], [Math.cos(a) * 48, -22 + Math.sin(a) * 48], [Math.cos(a + .18) * 40, -22 + Math.sin(a + .18) * 40]], i % 2 ? '#fff0e0' : '#ffd8b0'); E(c, Math.cos(a) * 46, -22 + Math.sin(a) * 46, 3, 3, '#ff6a9a', false); }
    SB(c, [[-14, -2], [-12, -34], [12, -34], [14, -2]], '#fff6ee'); SB(c, [[-12, -20], [12, -20], [13, -14], [-13, -14]], '#e8404a', { line: false });
    GE(c, 0, -44, 15, 13, '#fff6ee'); SB(c, [[-13, -52], [-9, -70], [-3, -54]], '#fff6ee'); SB(c, [[13, -52], [9, -70], [3, -54]], '#fff6ee'); SB(c, [[-10, -55], [-8, -64], [-5, -55]], '#ff9ac8', { line: false }); SB(c, [[10, -55], [8, -64], [5, -55]], '#ff9ac8', { line: false });
    eye2(c, -5, -44, 3.4, '#ff3a6a', { noLash: true, flip: true }); eye2(c, 5, -44, 3.4, '#ff3a6a', { noLash: true });
    for (const sg of [-1, 1]) { c.strokeStyle = '#e8404a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sg * 9, -41); c.lineTo(sg * 13, -37); c.stroke(); }
    for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, -26 + i * 26 + S_(q, 2) * 3, -56 - q * 12, 10, '#7ad8ff', .8 * (1 - q)); c.restore(); }
  },
  raijuu(c, p) {
    c.translate(0, -S_(p, 2) * 1.4); E(c, 0, 2, 26, 4, 'rgba(0,0,0,.22)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -30, 54, '#ffe27a', .32 + S_(p, 3) * .1); c.restore();
    SB(c, [[-26, -4], [-24, -26], [-8, -36], [16, -34], [28, -22], [26, -4], [10, 0], [-10, 0]], '#e8f0ff');
    for (let i = 0; i < 4; i++) { const x = -20 + i * 13; c.strokeStyle = '#ffd24a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, -34); c.lineTo(x + 5, -26); c.lineTo(x - 2, -20); c.lineTo(x + 4, -10); c.stroke(); }
    GE(c, -18, -2, 6, 8, '#cfe0ff'); GE(c, 16, -2, 6, 8, '#cfe0ff');
    SB(c, [[16, -30], [24, -50], [40, -54], [38, -40], [30, -28]], '#e8f0ff'); GE(c, 30, -44, 12, 10, '#f4f8ff');
    SB(c, [[24, -50], [26, -66], [32, -54]], '#ffd24a'); SB(c, [[36, -52], [42, -66], [42, -50]], '#ffd24a');
    eye2(c, 33, -45, 3, '#ffe27a', { noLash: true }); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 33, -45, 9, '#ffe27a', .7); c.restore();
    SB(c, [[-26, -22], [-44, -30 + S_(p, 2) * 4], [-52, -18], [-40, -12], [-28, -12]], '#ffd24a');
    for (let i = 0; i < 3; i++) { const q = (p * 2 + i / 3) % 1; c.strokeStyle = 'rgba(255,250,200,' + (1 - q) + ')'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-30 + i * 24, -60 + q * 10); c.lineTo(-24 + i * 24, -46); c.lineTo(-32 + i * 24, -40); c.stroke(); }
  },
  crystalking(c, p) {
    c.translate(0, -S_(p, 1) * 1.2); E(c, 0, 2, 28, 5, 'rgba(0,0,0,.25)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -38, 60, '#7affff', .35 + S_(p, 2) * .08); c.restore();
    SB(c, [[-24, -2], [-30, -30], [-14, -50], [14, -50], [30, -30], [24, -2]], '#4ab8e8'); SB(c, [[-12, -8], [-16, -34], [0, -46], [16, -34], [12, -8]], '#8ae8ff', { line: false });
    for (const [x, y, h] of [[-34, -34, 26], [34, -34, 26], [-22, -50, 22], [22, -50, 22], [0, -60, 28]]) SB(c, [[x - 6, y], [x, y - h], [x + 6, y]], '#c070ff');
    GE(c, -30, -22, 8, 10, '#4ab8e8'); GE(c, 30, -22, 8, 10, '#4ab8e8');
    GE(c, 0, -36, 11, 10, '#d8ffff'); for (const sg of [-1, 1]) { eye2(c, sg * 4.4, -36, 2.8, '#ff6ae0', { noLash: true }); }
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -22, 14, '#ffffff', .5 + S_(p, 3) * .2); c.restore();
    hl(c, -10, -44, 3, 7, -.5, .6);
  },
  clockking(c, p) {
    c.translate(0, -S_(p, 1) * 1.2); E(c, 0, 2, 28, 5, 'rgba(0,0,0,.25)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -36, 56, '#ffd070', .32); c.restore();
    SB(c, [[-26, -2], [-22, -40], [22, -40], [26, -2]], '#9a7a3a'); SB(c, [[-18, -8], [-16, -34], [16, -34], [18, -8]], '#c8a050', { line: false });
    c.save(); c.translate(0, -22); c.rotate(p * TAU); c.fillStyle = '#6a4a1a'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? 10 : 13; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke(); c.restore();
    for (const sg of [-1, 1]) { GE(c, sg * 28, -34, 7, 7, '#7a5a2a'); limb(c, sg * 24, -32, sg * 32, -14, 5, '#9a7a3a'); GE(c, sg * 32, -12, 5, 5, '#ffd24a'); }
    GE(c, 0, -52, 14, 14, '#f4ecd8'); c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -52, 11, 0, TAU); c.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillStyle = '#5a3a1a'; c.fillRect(Math.cos(a) * 9 - .6, -52 + Math.sin(a) * 9 - .6, 1.2, 1.2); }
    c.strokeStyle = '#2a1a0a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, -52); c.lineTo(Math.cos(p * TAU * 4) * 8, -52 + Math.sin(p * TAU * 4) * 8); c.stroke(); c.beginPath(); c.moveTo(0, -52); c.lineTo(Math.cos(p * TAU) * 5, -52 + Math.sin(p * TAU) * 5); c.stroke();
    SB(c, [[-10, -64], [-8, -76], [-3, -68], [0, -80], [3, -68], [8, -76], [10, -64]], '#ffd24a');
  },
  treequeen(c, p) {
    c.translate(0, -S_(p, 1) * 1.4); E(c, 0, 2, 28, 5, 'rgba(0,0,0,.22)', false);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -40, 64, '#d8ffa0', .38 + S_(p, 2) * .08); c.restore();
    for (let i = 0; i < 6; i++) { const x = -22 + i * 8.8, w = S_(p + i * .15, 1) * 4; c.strokeStyle = OUT; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x * .5, -16); c.quadraticCurveTo(x * 1.1, -2, x * 1.3 + w, 2); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 4.4; c.stroke(); }
    SB(c, [[-14, -4], [-10, -42], [10, -42], [14, -4]], '#6a4a22'); SB(c, [[-8, -8], [-6, -38], [6, -38], [8, -8]], '#e8f8c8', { line: false });
    for (const sg of [-1, 1]) { limb(c, sg * 10, -38, sg * 26, -30 + S_(p, 1) * 3, 5, '#8a5a2a'); GE(c, sg * 28, -30, 7, 5, '#4ac86a'); }
    GE(c, 0, -52, 13, 12, '#f2ffe0'); SB(c, [[-14, -52], [-18, -70], [-8, -62], [-4, -78], [0, -64], [4, -78], [8, -62], [18, -70], [14, -52]], '#4ac86a');
    for (const [x, y] of [[-12, -66], [12, -66], [0, -74]]) { E(c, x, y, 3.4, 3.4, '#ff9ac8', true); }
    eye2(c, -4.4, -52, 2.8, '#2a9a52', { noLash: false }); eye2(c, 4.4, -52, 2.8, '#2a9a52', { noLash: false });
    for (let i = 0; i < 5; i++) { const q = (p + i / 5) % 1; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, -28 + i * 14 + S_(q, 2) * 4, -30 - q * 46, 5, '#f0ffb0', .8 * (1 - q)); c.restore(); }
  },
});
