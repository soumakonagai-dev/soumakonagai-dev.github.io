'use strict';
// ===== 新ステージ 5 つの背景（砂漠・火山・天空・深海・月） =====
Object.assign(THEMES, {
  desert: {
    sky: ['#ff9a5a', '#ffc98a', '#fff0c8'], mount: ['#e8a868', '#d49656', '#bc7e42'],
    ground: ['#f2d08a', '#e6bd70', '#d4a85a'], blob: ['#f8dc9a', '#d8a85a', '#eec878'],
    pathMain: '#c9a272', pathEdge: '#8a6a3a', pathDark: '#5a4020', accent: '#ff8a3a', glow: '#fff0b0',
    tod: [[0, 255, 200, 120, .12], [.45, 255, 240, 200, 0], [.8, 255, 140, 70, .2], [1, 90, 40, 90, .36]],
  },
  volcano: {
    sky: ['#240808', '#7a2010', '#ff6a2a'], mount: ['#4a2020', '#3a1818', '#2a1010'],
    ground: ['#3c2c2c', '#302222', '#241818'], blob: ['#5a3a30', '#2a1a1a', '#7a4030'],
    pathMain: '#8a5a48', pathEdge: '#4a2a20', pathDark: '#1a0a0a', accent: '#ff6a2a', glow: '#ffb070',
    tod: [[0, 255, 100, 40, .1], [.5, 255, 80, 30, .05], [1, 120, 20, 20, .25]],
  },
  sky: {
    sky: ['#3a98ff', '#8ad0ff', '#e8f6ff'], mount: ['#e0f0ff', '#cce4fa', '#b4d6f2'],
    ground: ['#f4faff', '#e2f0ff', '#cfe6fa'], blob: ['#ffffff', '#bcd8f4', '#eaf6ff'],
    pathMain: '#ecdcaa', pathEdge: '#b8a060', pathDark: '#7a6a38', accent: '#ffd24a', glow: '#fff8c0',
    tod: [[0, 255, 230, 200, .12], [.4, 255, 255, 255, 0], [.8, 255, 190, 140, .16], [1, 70, 60, 140, .3]],
  },
  abyss: {
    sky: ['#001838', '#003a68', '#0a6a98'], mount: ['#0a3a68', '#08305a', '#062848'],
    ground: ['#0c5c8a', '#08487a', '#063a60'], blob: ['#1a7aaa', '#08385a', '#2a9aca'],
    pathMain: '#a0d4cc', pathEdge: '#4a8a88', pathDark: '#12403e', accent: '#7affd8', glow: '#bfffee',
    tod: [[0, 90, 200, 255, .06], [.5, 0, 40, 90, .08], [1, 0, 10, 60, .26]],
  },
  moon: {
    sky: ['#05020f', '#1a0a3a', '#3a1a5a'], mount: ['#2a1a4a', '#201238', '#160a28'],
    ground: ['#52526a', '#42425a', '#323248'], blob: ['#6a6a88', '#2a2a40', '#5a5a7a'],
    pathMain: '#c0b8e0', pathEdge: '#6a6090', pathDark: '#1a1630', accent: '#ff6ad0', glow: '#ffd0ff',
    tod: [[0, 200, 120, 255, .06], [.5, 0, 0, 0, 0], [1, 80, 10, 90, .24]],
  },
});

function cactus(c, x, y, s) { c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(x, y + 1, 7 * s, 2 * s, 0, 0, TAU); c.fill(); SB(c, [[x - 3 * s, y], [x - 3 * s, y - 14 * s], [x, y - 17 * s], [x + 3 * s, y - 14 * s], [x + 3 * s, y]], '#4ab86a'); SB(c, [[x - 3 * s, y - 8 * s], [x - 8 * s, y - 8 * s], [x - 8 * s, y - 14 * s], [x - 5.6 * s, y - 14 * s], [x - 5.6 * s, y - 10 * s], [x - 3 * s, y - 10 * s]], '#4ab86a'); SB(c, [[x + 3 * s, y - 5 * s], [x + 8 * s, y - 5 * s], [x + 8 * s, y - 11 * s], [x + 5.6 * s, y - 11 * s], [x + 5.6 * s, y - 7 * s], [x + 3 * s, y - 7 * s]], '#4ab86a'); E(c, x, y - 17 * s, 1.4 * s, 1.4 * s, '#ff9ed2', false); }
function palm(c, x, y, s, r) { c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(x, y + 2, s * .9, s * .26, 0, 0, TAU); c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - s * .8, x + 1, y - s * 1.5); c.stroke(); c.strokeStyle = '#a07a4a'; c.lineWidth = 2.6; c.stroke(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .55; SB(c, [[x + 1, y - s * 1.5], [x + 1 + Math.cos(a) * s * .5, y - s * 1.5 + Math.sin(a) * s * .5 - 3], [x + 1 + Math.cos(a) * s * 1.0, y - s * 1.5 + Math.sin(a) * s * .8 + 5]], '#4ab86a'); } E(c, x - 1, y - s * 1.45, 1.6, 1.6, '#8a5a2a', false); }
function coral(c, x, y, s, col) { c.strokeStyle = OUT; c.lineWidth = 4; c.lineCap = 'round'; const br = [[0, -14, -7, -22], [0, -10, 6, -20], [0, -18, 1, -28]]; for (const [,, ex, ey] of br) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + ex * s * .3, y + ey * s * .5, x + ex * s, y + ey * s); c.stroke(); } c.strokeStyle = col; c.lineWidth = 2.4; for (const [,, ex, ey] of br) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + ex * s * .3, y + ey * s * .5, x + ex * s, y + ey * s); c.stroke(); E(c, x + ex * s, y + ey * s, 2.4 * s, 2.4 * s, lt(col, .4), false); } }
function seaweed(c, x, y, s, t) { c.strokeStyle = '#2a9a6a'; c.lineWidth = 2.4; c.lineCap = 'round'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 3, y); c.bezierCurveTo(x + i * 3 + 4 * s, y - 8 * s, x + i * 3 - 4 * s, y - 14 * s, x + i * 3 + 2 * s, y - 20 * s); c.stroke(); } }
function crater(c, x, y, s) { c.strokeStyle = 'rgba(30,30,50,.35)'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, 9 * s, 4.4 * s, 0, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(x, y + 1.4, 9 * s, 4.4 * s, 0, .2, Math.PI - .2); c.stroke(); }
function puff(c, x, y, s) { for (const [dx, dy, r] of [[0, 0, 6], [6, 1, 5], [-6, 1, 5], [2, -3, 5]]) E(c, x + dx * s, y + dy * s, r * s, r * s * .8, 'rgba(255,255,255,.85)', false); }
function crystalPink(c, x, y, s) { c.fillStyle = 'rgba(255,150,230,.9)'; c.beginPath(); c.moveTo(x, y - 13 * s); c.lineTo(x + 3.6 * s, y); c.lineTo(x - 3.6 * s, y); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x, y - 13 * s); c.lineTo(x + 1.2 * s, y - 2 * s); c.lineTo(x - 1.5 * s, y - 2 * s); c.fill(); }
function lavaCrack(c, x, y, r) { c.strokeStyle = 'rgba(255,130,40,.65)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); let px = x, py = y; for (let i = 0; i < 5; i++) { px += (r() - .5) * 22; py += (r() - .3) * 12; c.lineTo(px, py); } c.stroke(); c.strokeStyle = 'rgba(255,220,120,.5)'; c.lineWidth = .7; c.stroke(); }

Object.assign(EXTBG, {
  desert: {
    sky(c, L, r, fy) { glowDot(c, L.W * .72, fy * .7, fy * 1.8, '#fff0b0', .9); blob(c, L.W * .72, fy * .7, 24, 24, '#fff6d0'); for (const [x, s] of [[.18, 1], [.3, .7], [.86, .8]]) { const px = L.W * x, h = fy * .5 * s; c.fillStyle = '#cf9a62'; c.beginPath(); c.moveTo(px - h * .9, fy + 2); c.lineTo(px, fy + 2 - h); c.lineTo(px + h * .9, fy + 2); c.fill(); c.fillStyle = '#b4804a'; c.beginPath(); c.moveTo(px, fy + 2 - h); c.lineTo(px + h * .9, fy + 2); c.lineTo(px + h * .2, fy + 2); c.fill(); } },
    ground(c, L, r, P, fy, S) { c.lineWidth = 1.2; for (let i = 0; i < 120; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; c.strokeStyle = r() < .5 ? 'rgba(170,120,60,.3)' : 'rgba(255,240,200,.35)'; c.beginPath(); c.moveTo(x - 14, y); c.quadraticCurveTo(x, y - 4 - r() * 3, x + 14, y); c.stroke(); } },
    path(c, o, x, y, w, nx, ny, th, r) { c.fillStyle = r() < .5 ? 'rgba(90,60,30,.3)' : 'rgba(255,235,190,.35)'; blob(c, x, y, 2 + r() * 2, 1.4 + r() * 1.4, c.fillStyle); if (r() < .22) { c.strokeStyle = 'rgba(90,60,30,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); } },
    decor(c, d) { if (d.k < .28) cactus(c, d.x, d.y, d.s * .8); else if (d.k < .5) rock(c, d.x, d.y, d.s, '#c8a070'); else if (d.k < .62) { c.strokeStyle = '#a08a5a'; c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(d.x + i * 2, d.y); c.lineTo(d.x + i * 3, d.y - 6 * d.s); c.stroke(); } } else glowDot(c, d.x, d.y, 6 * d.s, '#fff0c0', .22); },
    tree(c, x, y, s, r) { if (r() < .6) palm(c, x, y, s * 1.1, r); else cactus(c, x, y, s * .08 * 12 / 12 + .9); },
    particle(c, p, dt, t, L) { p.x += (50 + p.s * 40) * dt; p.y += Math.sin(p.ph + t * 2) * 8 * dt; p.ph += dt; c.fillStyle = `rgba(240,210,150,${.25 + p.k * .35})`; c.fillRect(p.x, p.y, 2 + p.s, 1.2); if (p.x > L.W + 10) { p.x = -10; p.y = L.fy + Math.random() * L.fh; } },
    n: 70, cloudA: .35,
  },
  volcano: {
    sky(c, L, r, fy) { glowDot(c, L.W * .66, fy * .5, fy * 2.2, '#ff7a2a', .55); const px = L.W * .66, h = fy * .85; c.fillStyle = '#2a1414'; c.beginPath(); c.moveTo(px - h * 1.5, fy + 2); c.lineTo(px - h * .22, fy + 2 - h); c.lineTo(px + h * .22, fy + 2 - h); c.lineTo(px + h * 1.5, fy + 2); c.fill(); glowDot(c, px, fy + 2 - h, h * .5, '#ffb040', .95); c.fillStyle = '#ff8a2a'; c.beginPath(); c.ellipse(px, fy + 2 - h, h * .24, 3, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,130,40,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(px - 2, fy + 2 - h); c.lineTo(px - 10, fy + 2 - h * .5); c.lineTo(px - 4, fy + 2); c.stroke(); },
    ground(c, L, r, P, fy, S) { for (let i = 0; i < 40; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S * 1.2) continue; lavaCrack(c, x, y, r); } for (let i = 0; i < 7; i++) { const x = r() * L.W, y = fy + 20 + r() * (L.fh - 40); if (distToPath(P, x, y) < S * 2) continue; glowDot(c, x, y, 20, '#ff7a2a', .5); c.fillStyle = '#ff9a3a'; c.beginPath(); c.ellipse(x, y, 11, 5, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd890'; c.beginPath(); c.ellipse(x - 2, y - 1, 5, 2, 0, 0, TAU); c.fill(); } },
    path(c, o, x, y, w, nx, ny, th, r) { if (r() < .3) glowDot(c, x, y, 6, '#ff8a3a', .5); if (r() < .18) { c.strokeStyle = 'rgba(30,10,10,.5)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); } },
    decor(c, d) { if (d.k < .35) rock(c, d.x, d.y, d.s, '#5a3a38'); else if (d.k < .5) crystalPink(c, d.x, d.y, d.s * .8); else if (d.k < .65) { glowDot(c, d.x, d.y, 8 * d.s, '#ff8a3a', .45); E(c, d.x, d.y, 3 * d.s, 1.6 * d.s, '#ffb050', false); } else glowDot(c, d.x, d.y, 7 * d.s, '#ff6a2a', .2); },
    tree(c, x, y, s, r) { c.strokeStyle = OUT; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - s, x - 2, y - s * 1.6); c.stroke(); c.strokeStyle = '#3a2420'; c.lineWidth = 2.4; c.stroke(); for (const [dx, dy] of [[-8, -s * 1.2], [8, -s * 1.4]]) { c.strokeStyle = '#3a2420'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y - s * .9); c.lineTo(x + dx, y + dy); c.stroke(); } glowDot(c, x - 2, y - s * 1.6, 8, '#ff8a3a', .3); },
    particle(c, p, dt, t, L) { p.y -= (14 + p.s * 24) * dt; p.x += Math.sin(p.ph + t) * 8 * dt; p.ph += dt; const a = .4 + .6 * Math.sin(p.ph * 3 + p.k * 9) ** 2; glowDot(c, p.x, p.y, 5 * p.s, p.k < .5 ? '#ff9a3a' : '#ffd070', a * .85); if (p.y < L.fy * .3) { p.y = L.H - 70 * Math.random() - 10; p.x = Math.random() * L.W; } },
    n: 54, cloudA: .5, cloudC: '70,45,45',
  },
  sky: {
    sky(c, L, r, fy) { glowDot(c, L.W * .2, fy * .5, fy * 2, '#fff8c0', .8); blob(c, L.W * .2, fy * .5, 22, 22, '#fffbe0'); for (const [x, s] of [[.5, 1], [.78, .7], [.92, .5]]) { const px = L.W * x, y = fy * (.5 - (s - .5) * .2); c.fillStyle = '#f2f6ff'; c.beginPath(); c.moveTo(px - 24 * s, y); c.lineTo(px + 24 * s, y); c.lineTo(px + 10 * s, y + 10 * s); c.lineTo(px - 10 * s, y + 10 * s); c.fill(); c.fillStyle = '#ffd24a'; for (const dx of [-14, -4, 6]) c.fillRect(px + dx * s, y - 12 * s, 8 * s, 12 * s); c.fillStyle = '#ff8a8a'; c.beginPath(); c.moveTo(px - 16 * s, y - 12 * s); c.lineTo(px - 10 * s, y - 20 * s); c.lineTo(px - 4 * s, y - 12 * s); c.fill(); c.beginPath(); c.moveTo(px + 4 * s, y - 12 * s); c.lineTo(px + 10 * s, y - 20 * s); c.lineTo(px + 16 * s, y - 12 * s); c.fill(); } },
    ground(c, L, r, P, fy, S) { for (let i = 0; i < 60; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; puff(c, x, y, 1.4 + r() * 1.4); } },
    path(c, o, x, y, w, nx, ny, th, r) { c.strokeStyle = 'rgba(160,130,60,.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); if (r() < .18) glowDot(c, x, y, 6, '#fff8c0', .6); },
    decor(c, d) { if (d.k < .4) puff(c, d.x, d.y, d.s * .8); else if (d.k < .6) { star5(c, d.x, d.y - 4, 3 * d.s, '#ffe27a'); } else if (d.k < .75) flower(c, d.x, d.y, d.s, '#ffffff'); else glowDot(c, d.x, d.y, 7 * d.s, '#ffffff', .4); },
    tree(c, x, y, s, r) { puff(c, x, y - s * .6, s * .16 + .6); puff(c, x + 6, y - s * .3, s * .12 + .5); },
    particle(c, p, dt, t, L) { p.y -= (6 + p.s * 8) * dt; p.x += Math.sin(p.ph + t * .6) * 10 * dt; p.ph += dt; c.save(); c.translate(p.x, p.y); c.rotate(Math.sin(p.ph) * .6); c.fillStyle = `rgba(255,255,255,${.6 + p.k * .3})`; c.beginPath(); c.ellipse(0, 0, 4 * p.s, 1.5 * p.s, 0, 0, TAU); c.fill(); c.restore(); if (p.k > .85) glowDot(c, p.x, p.y, 5, '#fff3a0', .5); if (p.y < L.fy * .2) { p.y = L.H - 20; p.x = Math.random() * L.W; } },
    n: 36, cloudA: .9,
  },
  abyss: {
    sky(c, L, r, fy) { for (let i = 0; i < 40; i++) glowDot(c, r() * L.W, r() * fy, 3 + r() * 3, '#9affe0', .2); },
    ground(c, L, r, P, fy, S) { c.lineWidth = 1.4; for (let i = 0; i < 140; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S * .8) continue; c.strokeStyle = `rgba(190,255,240,${.06 + r() * .1})`; c.beginPath(); c.moveTo(x - 16, y); c.quadraticCurveTo(x - 6, y - 5, x, y); c.quadraticCurveTo(x + 6, y + 5, x + 16, y); c.stroke(); } },
    path(c, o, x, y, w, nx, ny, th, r) { if (r() < .25) { E(c, x, y, 2.4, 2.4, 'rgba(255,255,255,.7)', false); glowDot(c, x, y, 6, '#bfffee', .35); } if (r() < .12) { c.strokeStyle = 'rgba(40,110,110,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); } },
    decor(c, d) { if (d.k < .3) coral(c, d.x, d.y, d.s * .8, ['#ff7a9a', '#ffa05a', '#c070ff'][Math.floor(d.k * 100) % 3]); else if (d.k < .5) seaweed(c, d.x, d.y, d.s * .8); else if (d.k < .65) { E(c, d.x, d.y, 4 * d.s, 3 * d.s, '#ffd0e0'); c.strokeStyle = 'rgba(160,80,120,.5)'; c.lineWidth = .8; c.beginPath(); c.moveTo(d.x, d.y - 3 * d.s); c.lineTo(d.x, d.y + 3 * d.s); c.stroke(); } else glowDot(c, d.x, d.y, 8 * d.s, '#bfffee', .22); },
    tree(c, x, y, s, r) { coral(c, x, y, s * .11 + .6, r() < .5 ? '#ff7a9a' : '#c070ff'); },
    anim(c, L, t) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const x = (i * 190 + t * 6) % (L.W + 200) - 100; c.fillStyle = `rgba(160,255,230,${.05 + .03 * Math.sin(t * .8 + i)})`; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x + 140, L.H); c.lineTo(x + 70, L.H); c.fill(); } c.restore(); for (let i = 0; i < 5; i++) { const x = ((t * (18 + i * 4) + i * 230) % (L.W + 80)) - 40, y = L.fy * .4 + (i * 83) % (L.fy * .5) + Math.sin(t + i) * 4; c.fillStyle = 'rgba(10,50,90,.7)'; c.beginPath(); c.ellipse(x, y, 7, 3, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 11, y - 3); c.lineTo(x - 11, y + 3); c.fill(); } },
    particle(c, p, dt, t, L) { p.y -= (12 + p.s * 22) * dt; p.x += Math.sin(p.ph + t) * 6 * dt; p.ph += dt; c.strokeStyle = `rgba(210,255,250,${.35 + p.k * .4})`; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, 1.6 + p.s * 2, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(p.x - 1, p.y - 1.4, 1.2, 1.2); if (p.y < L.fy * .3) { p.y = L.H + 5; p.x = Math.random() * L.W; } },
    n: 46, noCloud: true,
  },
  moon: {
    sky(c, L, r, fy) { for (let i = 0; i < 100; i++) { const a = r() * .8 + .2; glowDot(c, r() * L.W, r() * fy * .95, 2 + r() * 2, '#ffffff', a * .8); } const mx = L.W * .24, my = fy * .55, mr = Math.min(fy * .5, 46); glowDot(c, mx, my, mr * 2.4, '#ffd0ff', .35); const g = c.createRadialGradient(mx - mr * .3, my - mr * .3, 2, mx, my, mr); g.addColorStop(0, '#fff8ff'); g.addColorStop(1, '#c8b0e8'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill(); for (const [dx, dy, rr2] of [[-.3, -.2, .22], [.25, .1, .16], [-.05, .4, .12], [.35, -.35, .1]]) { c.fillStyle = 'rgba(140,110,180,.35)'; c.beginPath(); c.arc(mx + dx * mr, my + dy * mr, rr2 * mr, 0, TAU); c.fill(); } for (let i = 0; i < 3; i++) { const x = L.W * (.55 + i * .17), y = fy * (.3 + i * .12); c.fillStyle = '#3a2a5a'; c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x + 14, y); c.lineTo(x + 7, y + 12); c.lineTo(x - 7, y + 12); c.fill(); c.fillStyle = '#ff6ad0'; c.fillRect(x - 14, y - 2, 28, 2.4); } },
    ground(c, L, r, P, fy, S) { for (let i = 0; i < 60; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; crater(c, x, y, .6 + r() * 1.2); } for (let i = 0; i < 40; i++) glowDot(c, r() * L.W, fy + r() * L.fh, 5 + r() * 8, '#c8a8ff', .16); },
    path(c, o, x, y, w, nx, ny, th, r) { c.strokeStyle = 'rgba(255,200,255,.4)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o.x + nx * w * .4, o.y + ny * w * .4); c.lineTo(o.x - nx * w * .4, o.y - ny * w * .4); c.stroke(); if (r() < .22) glowDot(c, x, y, 6, '#ff9ae0', .6); },
    decor(c, d) { if (d.k < .3) crater(c, d.x, d.y, d.s * .9); else if (d.k < .5) crystalPink(c, d.x, d.y, d.s * .9); else if (d.k < .65) rock(c, d.x, d.y, d.s, '#8a8aa8'); else glowDot(c, d.x, d.y, 7 * d.s, '#e8c8ff', .3); },
    tree(c, x, y, s, r) { for (const [dx, h] of [[-5, .9], [0, 1.4], [5, .8]]) { c.fillStyle = 'rgba(255,150,230,.9)'; c.beginPath(); c.moveTo(x + dx, y - s * h); c.lineTo(x + dx + 3.4, y); c.lineTo(x + dx - 3.4, y); c.fill(); } glowDot(c, x, y - s * .7, 14, '#ff9ae0', .3); },
    anim(c, L, t) { const k = (t % 7) / 7; if (k < .12) { const q = k / .12, x = L.W * (.9 - q * .6), y = L.fy * (.1 + q * .6); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,255,255,${1 - q})`; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 50, y - 22); c.stroke(); glowDot(c, x, y, 8, '#ffffff', 1 - q); c.restore(); } },
    particle(c, p, dt, t, L) { p.y -= (4 + p.s * 6) * dt; p.ph += dt; const a = .4 + .6 * Math.sin(p.ph * 2 + p.k * 7) ** 2; glowDot(c, p.x + Math.sin(p.ph) * 6, p.y, 6 * p.s, p.k < .5 ? '#ff9ae0' : '#c8b8ff', a * .8); if (p.y < L.fy * .9) { p.y = L.H - 10; p.x = Math.random() * L.W; } },
    n: 50, noCloud: true,
  },
});
