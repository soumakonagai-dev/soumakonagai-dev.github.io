'use strict';
// ===== 新ステージ 11〜15 の背景 =====
Object.assign(THEMES, {
  sakura: {
    sky: ['#2a1448', '#7a3a78', '#ffb0c8'], mount: ['#5a3a78', '#6a4a88', '#8a5a98'],
    ground: ['#e8b8c8', '#d49ab4', '#c0849e'], blob: ['#f4c8d8', '#b86a8a', '#e8a0bc'],
    pathMain: '#f0e0d0', pathEdge: '#a8789a', pathDark: '#5a3a58', accent: '#ff9ac8', glow: '#ffe0f0',
    tod: [[0, 255, 160, 200, .06], [.5, 120, 60, 140, .10], [1, 30, 10, 70, .24]],
  },
  storm: {
    sky: ['#141c28', '#34445a', '#6a7a8c'], mount: ['#3a4858', '#2e3a48', '#222c38'],
    ground: ['#4a6a4a', '#3a5a3e', '#2e4a34'], blob: ['#5a7a58', '#2a4430', '#6a8a64'],
    pathMain: '#8e8e7c', pathEdge: '#4a4a3e', pathDark: '#22221a', accent: '#ffe27a', glow: '#e8f0ff',
    tod: [[0, 40, 60, 90, .16], [.5, 20, 30, 50, .20], [1, 10, 10, 40, .30]],
  },
  crystal: {
    sky: ['#06101e', '#0a2a3e', '#144a5e'], mount: ['#0e3a4e', '#0a2e40', '#082434'],
    ground: ['#12485e', '#0e3a4e', '#0a2e40'], blob: ['#1a6a82', '#0a2a3a', '#2a8aa2'],
    pathMain: '#9ad8e8', pathEdge: '#3a7a92', pathDark: '#0e2e3e', accent: '#9affff', glow: '#d0ffff',
    tod: [[0, 80, 220, 255, .05], [.5, 0, 0, 0, 0], [1, 40, 10, 100, .2]],
  },
  clock: {
    sky: ['#3a2a18', '#8a6a3a', '#e8c880'], mount: ['#7a5a2e', '#6a4a24', '#5a3a1c'],
    ground: ['#a88a58', '#8a6e44', '#6e5636'], blob: ['#c0a068', '#5a4426', '#b8985c'],
    pathMain: '#d8c098', pathEdge: '#8a6a3a', pathDark: '#4a3216', accent: '#ffd24a', glow: '#fff0c0',
    tod: [[0, 255, 200, 120, .1], [.5, 255, 220, 160, .04], [1, 90, 50, 30, .3]],
  },
  worldtree: {
    sky: ['#0a3a2a', '#2a8a5a', '#c8f8a8'], mount: ['#2a7a4a', '#1e6a3c', '#145a30'],
    ground: ['#7ad87a', '#5ac86a', '#3aa85a'], blob: ['#a8f89a', '#2a8a4a', '#8aec88'],
    pathMain: '#e8d890', pathEdge: '#a8883a', pathDark: '#5a4414', accent: '#fff27a', glow: '#f0ffd0',
    tod: [[0, 255, 255, 180, .08], [.5, 255, 255, 220, 0], [1, 255, 240, 160, .14]],
  },
});

function gearShape(c, x, y, r, teeth, rot, col) {
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const a = i / (teeth * 2) * TAU, rr = i % 2 ? r * .82 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.arc(0, 0, r * .35, 0, TAU); c.fill('evenodd'); c.restore();
}
function lantern(c, x, y, s) { c.strokeStyle = 'rgba(60,20,40,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 10 * s); c.lineTo(x, y - 4 * s); c.stroke(); GE(c, x, y, 5 * s, 6.4 * s, '#e8504a', { lw: 1 }); c.fillStyle = '#ffd24a'; c.fillRect(x - 3 * s, y - 7 * s, 6 * s, 1.4 * s); c.fillRect(x - 3 * s, y + 5.6 * s, 6 * s, 1.4 * s); glowDot(c, x, y, 12 * s, '#ffb070', .5); }
function sakuraTree(c, x, y, s) { c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(x, y + 2, s * .9, s * .26, 0, 0, TAU); c.fill(); c.strokeStyle = OUT; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - s * .7, x - 2, y - s * 1.2); c.stroke(); c.strokeStyle = '#6a4a4a'; c.lineWidth = 3; c.stroke(); for (const [dx, dy, r, col] of [[0, -1.45, 1.0, '#ff9ac0'], [-.55, -1.2, .7, '#ffb0cc'], [.6, -1.25, .75, '#ff8ab4'], [.1, -1.75, .6, '#ffd0e0']]) E(c, x + dx * s, y + dy * s, r * s * .8, r * s * .65, col, false); hl(c, x - s * .3, y - s * 1.7, s * .25, s * .12, -.4, .5); }
function crystalCluster(c, x, y, s, cols) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + 1, s * .8, s * .22, 0, 0, TAU); c.fill(); cols = cols || ['#7affff', '#c070ff', '#ff9ae0']; [[-.5, 1.0, 0], [0, 1.6, 1], [.55, .9, 2], [.2, .7, 0]].forEach(([dx, h, i]) => { const px = x + dx * s * .6, col = cols[i % cols.length]; c.fillStyle = col; c.globalAlpha = .9; c.beginPath(); c.moveTo(px, y - h * s); c.lineTo(px + s * .26, y); c.lineTo(px - s * .26, y); c.fill(); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.moveTo(px, y - h * s); c.lineTo(px + s * .08, y - s * .1); c.lineTo(px - s * .1, y - s * .1); c.fill(); }); glowDot(c, x, y - s * .6, s * 1.6, cols[0], .28); }
function glowFlower(c, x, y, s) { c.strokeStyle = '#3aa85a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 6 * s); c.stroke(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; E(c, x + Math.cos(a) * 2.6 * s, y - 7 * s + Math.sin(a) * 2.6 * s, 2 * s, 2 * s, '#fff6a0', false); } E(c, x, y - 7 * s, 1.4 * s, 1.4 * s, '#ffb040', false); glowDot(c, x, y - 7 * s, 8 * s, '#fff27a', .35); }

Object.assign(EXTBG, {
  sakura: {
    sky(c, L, r, fy) { for (let i = 0; i < 60; i++) glowDot(c, r() * L.W, r() * fy * .8, 2 + r() * 2, '#ffffff', .5); const mx = L.W * .8, my = fy * .45; glowDot(c, mx, my, fy * 1.3, '#ffe0f0', .6); blob(c, mx, my, 20, 20, '#fff6fa');
      for (const [x, s] of [[.2, 1], [.35, .75]]) { const px = L.W * x, h = fy * .6 * s; c.fillStyle = '#3a2058'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(px - (28 - k * 7) * s, fy - k * h * .28 + 2); c.lineTo(px, fy - (k + 1) * h * .28 - 6 * s); c.lineTo(px + (28 - k * 7) * s, fy - k * h * .28 + 2); c.fill(); } }
      for (let i = 0; i < 12; i++) lantern(c, 20 + i * (L.W - 40) / 11, fy * .18 + Math.sin(i) * 6, .8); },
    ground(c, L, r, P, fy, S) { for (let i = 0; i < 70; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; blob(c, x, y, 6 + r() * 8, 2 + r() * 3, `rgba(255,${200 + Math.floor(r() * 40)},${220 + Math.floor(r() * 30)},.5)`); } },
    path(c, o, x, y, w, nx, ny, th, r) { if (r() < .12) { c.strokeStyle = 'rgba(120,70,100,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); } if (r() < .18) blob(c, x, y, 3, 1.6, 'rgba(255,170,200,.8)'); },
    decor(c, d) { if (d.k < .35) { blob(c, d.x, d.y, 6 * d.s, 2.4 * d.s, 'rgba(255,190,215,.7)'); blob(c, d.x + 3, d.y - 1, 3 * d.s, 1.4 * d.s, 'rgba(255,235,245,.8)'); } else if (d.k < .5) lantern(c, d.x, d.y - 4, .9 * d.s); else if (d.k < .65) rock(c, d.x, d.y, d.s, '#b8a0b8'); else glowDot(c, d.x, d.y, 7 * d.s, '#ffd0e8', .3); },
    tree(c, x, y, s, r) { sakuraTree(c, x, y, s * .9); },
    particle(c, p, dt, t, L) { p.x += (-14 - p.s * 14) * dt; p.y += (22 + p.s * 14) * dt; p.ph += dt * 2.4; c.save(); c.translate(p.x + Math.sin(p.ph) * 12, p.y); c.rotate(p.ph); c.fillStyle = p.k < .5 ? 'rgba(255,170,205,.92)' : 'rgba(255,225,238,.9)'; c.beginPath(); c.ellipse(0, 0, 3.6 * p.s, 2 * p.s, 0, 0, TAU); c.fill(); c.restore(); },
    n: 56, cloudA: .25, cloudC: '255,200,225',
  },
  storm: {
    sky(c, L, r, fy) { for (let i = 0; i < 14; i++) { const x = r() * L.W, y = r() * fy * .7; for (const [dx, dy, rr] of [[0, 0, 22], [20, -6, 26], [42, 0, 20]]) { c.fillStyle = `rgba(${28 + i % 3 * 8},${36 + i % 3 * 8},${50 + i % 3 * 8},.8)`; c.beginPath(); c.arc(x + dx, y + dy, rr, 0, TAU); c.fill(); } } },
    ground(c, L, r, P, fy, S) { c.lineWidth = 1.2; for (let i = 0; i < 600; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; c.strokeStyle = 'rgba(20,50,30,.5)'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - 4, x + 5, y - 6); c.stroke(); } for (let i = 0; i < 12; i++) { const x = r() * L.W, y = fy + 20 + r() * (L.fh - 40); if (distToPath(P, x, y) < S * 1.6) continue; c.fillStyle = 'rgba(110,150,200,.45)'; c.beginPath(); c.ellipse(x, y, 16 + r() * 10, 5 + r() * 3, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(220,240,255,.35)'; c.beginPath(); c.ellipse(x - 3, y - 1, 8, 2, 0, 0, TAU); c.fill(); } },
    path(c, o, x, y, w, nx, ny, th, r) { c.fillStyle = r() < .5 ? 'rgba(30,30,20,.3)' : 'rgba(255,255,255,.2)'; blob(c, x, y, 2 + r() * 2, 1.4 + r() * 1.4, c.fillStyle); },
    decor(c, d) { if (d.k < .3) rock(c, d.x, d.y, d.s, '#7a8478'); else if (d.k < .5) tuft(c, d.x, d.y, d.s, '#2a4a30'); else if (d.k < .62) { c.fillStyle = 'rgba(120,160,210,.5)'; c.beginPath(); c.ellipse(d.x, d.y, 8 * d.s, 3 * d.s, 0, 0, TAU); c.fill(); } else glowDot(c, d.x, d.y, 6 * d.s, '#cfe0ff', .12); },
    tree(c, x, y, s, r) { c.strokeStyle = OUT; c.lineWidth = 4.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * .4, y - s * .8, x + s * .9, y - s * 1.3); c.stroke(); c.strokeStyle = '#2a2e28'; c.lineWidth = 2.6; c.stroke(); for (const [dx, dy] of [[.9, -1.3], [.5, -1.0]]) E(c, x + dx * s, y + dy * s, s * .5, s * .36, '#2a4a34', true); },
    anim(c, L, t) { const ph = (t % 6) / 6; if (ph < .08) { const q = ph / .08, x = L.W * (.25 + ((Math.floor(t / 6) * 37) % 50) / 100); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,250,200,${1 - q})`; c.lineWidth = 3; c.beginPath(); let px = x, py = 0; c.moveTo(px, py); for (let i = 0; i < 6; i++) { px += (Math.sin(i * 7 + t) * 18); py += L.fy / 6; c.lineTo(px, py); } c.stroke(); c.fillStyle = `rgba(220,235,255,${.16 * (1 - q)})`; c.fillRect(0, 0, L.W, L.H); c.restore(); } },
    particle(c, p, dt, t, L) { p.x -= 60 * dt; p.y += (420 + p.s * 120) * dt; c.strokeStyle = `rgba(200,225,255,${.3 + p.k * .3})`; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 5, p.y - 14); c.stroke(); if (p.y > L.H + 10) { p.y = -10; p.x = Math.random() * (L.W + 80); } },
    n: 90, cloudA: .85, cloudC: '40,52,66',
  },
  crystal: {
    sky(c, L, r, fy) { c.fillStyle = '#04101a'; for (let i = 0; i < 16; i++) { const x = (i + .5) * L.W / 16 + (r() - .5) * 20, h = 18 + r() * fy * .55; c.beginPath(); c.moveTo(x - 14, 0); c.lineTo(x + 14, 0); c.lineTo(x + (r() - .5) * 6, h); c.fill(); } for (let i = 0; i < 30; i++) glowDot(c, r() * L.W, 8 + r() * fy * .7, 3 + r() * 3, ['#7affff', '#c070ff', '#ff9ae0'][i % 3], .5); },
    ground(c, L, r, P, fy, S) { c.lineCap = 'round'; for (let i = 0; i < 40; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S * 1.1) continue; c.strokeStyle = `rgba(120,230,255,${.18 + r() * .2})`; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 40, y + (r() - .5) * 18); c.lineTo(x + (r() - .5) * 60, y + (r() - .5) * 26); c.stroke(); } for (let i = 0; i < 30; i++) glowDot(c, r() * L.W, fy + r() * L.fh, 8 + r() * 10, ['#4ad8ff', '#a070ff'][i % 2], .16); },
    path(c, o, x, y, w, nx, ny, th, r) { if (r() < .2) glowDot(c, x, y, 6, '#9affff', .5); if (r() < .12) { c.strokeStyle = 'rgba(20,70,90,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); } },
    decor(c, d) { if (d.k < .45) crystalCluster(c, d.x, d.y, 9 * d.s, [['#7affff', '#4ab8ff', '#a0e8ff'], ['#c070ff', '#a050e8', '#e0a0ff'], ['#ff9ae0', '#ff6ac8', '#ffc0f0']][Math.floor(d.k * 40) % 3]); else if (d.k < .6) rock(c, d.x, d.y, d.s, '#4a7a8a'); else glowDot(c, d.x, d.y, 8 * d.s, '#9affff', .3); },
    tree(c, x, y, s, r) { crystalCluster(c, x, y, s * .8, r() < .5 ? ['#7affff', '#4ab8ff', '#a0e8ff'] : ['#c070ff', '#a050e8', '#ff9ae0']); },
    particle(c, p, dt, t, L) { p.y -= (5 + p.s * 7) * dt; p.ph += dt; const a = .4 + .6 * Math.sin(p.ph * 2 + p.k * 7) ** 2; glowDot(c, p.x + Math.sin(p.ph) * 8, p.y, 6 * p.s, p.k < .5 ? '#7affff' : '#d0a0ff', a * .8); if (p.y < L.fy * .5) { p.y = L.H - 10; p.x = Math.random() * L.W; } },
    n: 56, noCloud: true,
  },
  clock: {
    sky(c, L, r, fy) { for (const [x, y, rr, tt] of [[.15, .4, 38, 12], [.3, .7, 24, 9], [.62, .35, 46, 14], [.85, .6, 30, 10]]) { gearShape(c, L.W * x, fy * y, rr, tt, x * 9, 'rgba(120,84,36,.7)'); gearShape(c, L.W * x, fy * y, rr * .62, tt, x * 5, 'rgba(176,134,66,.55)'); } glowDot(c, L.W * .5, fy * .5, fy * 1.6, '#ffe0a0', .5); },
    ground(c, L, r, P, fy, S) { c.strokeStyle = 'rgba(60,40,16,.35)'; c.lineWidth = 1.2; const g = 52; for (let x = 0; x < L.W; x += g) { c.beginPath(); c.moveTo(x, fy); c.lineTo(x, L.H); c.stroke(); } for (let y = fy; y < L.H; y += g) { c.beginPath(); c.moveTo(0, y); c.lineTo(L.W, y); c.stroke(); } for (let x = g / 2; x < L.W; x += g) for (let y = fy + g / 2; y < L.H; y += g) { if (distToPath(P, x, y) < S * .6) continue; blob(c, x, y, 1.6, 1.6, 'rgba(255,230,160,.45)'); } },
    path(c, o, x, y, w, nx, ny, th, r) { if (r() < .22) { c.strokeStyle = 'rgba(70,46,18,.5)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(o.x + nx * w * .5, o.y + ny * w * .5); c.lineTo(o.x - nx * w * .5, o.y - ny * w * .5); c.stroke(); blob(c, o.x + nx * w * .42, o.y + ny * w * .42, 1.5, 1.5, '#fff0b0'); blob(c, o.x - nx * w * .42, o.y - ny * w * .42, 1.5, 1.5, '#fff0b0'); } },
    decor(c, d) { if (d.k < .35) { gearShape(c, d.x, d.y, 7 * d.s, 8, d.k * 20, '#7a5a2a'); } else if (d.k < .5) { c.fillStyle = '#5a4020'; c.fillRect(d.x - 2, d.y - 8 * d.s, 4, 8 * d.s); blob(c, d.x, d.y - 8 * d.s, 4 * d.s, 3 * d.s, '#8a6a34'); } else if (d.k < .65) rock(c, d.x, d.y, d.s, '#8a7a5a'); else glowDot(c, d.x, d.y, 7 * d.s, '#ffe9a0', .25); },
    tree(c, x, y, s, r) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + 2, s * .7, s * .2, 0, 0, TAU); c.fill(); c.fillStyle = '#5a4020'; c.fillRect(x - 3, y - s * 1.4, 6, s * 1.4); GE(c, x, y - s * 1.45, 6, 4, '#8a6a34'); },
    anim(c, L, t) { for (const [x, y, rr, tt, sp] of [[.15, .4, 38, 12, .3], [.62, .35, 46, 14, -.25]]) { gearShape(c, L.W * x, L.fy * y, rr * .45, tt, t * sp * 2, 'rgba(255,220,140,.35)'); } },
    particle(c, p, dt, t, L) { p.y -= (14 + p.s * 18) * dt; p.x += Math.sin(p.ph + t * .8) * 6 * dt; p.ph += dt; const k = (L.H - p.y) / L.H; c.fillStyle = `rgba(255,248,235,${.18 + p.k * .25})`; c.beginPath(); c.arc(p.x, p.y, 3 + p.s * 4 + k * 3, 0, TAU); c.fill(); if (p.k > .9) glowDot(c, p.x, p.y, 4, '#ffd070', .6); if (p.y < L.fy * .5) { p.y = L.H - 10; p.x = Math.random() * L.W; } },
    n: 40, cloudA: .3, cloudC: '255,232,196',
  },
  worldtree: {
    sky(c, L, r, fy) { glowDot(c, L.W * .5, fy * .5, fy * 2.4, '#f0ffd0', .55); const tx = L.W * .5; c.fillStyle = '#1e6a3a'; c.beginPath(); c.moveTo(tx - 26, fy + 4); c.quadraticCurveTo(tx - 14, fy * .5, tx - 10, fy * .18); c.lineTo(tx + 10, fy * .18); c.quadraticCurveTo(tx + 14, fy * .5, tx + 26, fy + 4); c.fill(); for (const [dx, dy, rr] of [[-42, .22, 34], [0, .08, 44], [44, .22, 34], [-16, .0, 30], [20, .02, 32]]) { c.fillStyle = '#2a9a52'; c.beginPath(); c.ellipse(tx + dx, fy * dy + 10, rr, rr * .6, 0, 0, TAU); c.fill(); glowDot(c, tx + dx, fy * dy + 8, rr * 1.2, '#d8ffa0', .18); }
      c.save(); c.lineWidth = 6; ['#ff6a6a', '#ffb04a', '#ffe24a', '#6ae86a', '#4ab0ff', '#a070ff'].forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = .35; c.beginPath(); c.arc(L.W * .5, fy * 1.15, L.W * .34 - i * 6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); c.restore(); },
    ground(c, L, r, P, fy, S) { for (let i = 0; i < 90; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; glowDot(c, x, y, 8 + r() * 10, '#f0ffb0', .22); } c.strokeStyle = 'rgba(40,120,60,.5)'; c.lineWidth = 1.2; for (let i = 0; i < 500; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S) continue; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 1, y - 4, x + (r() - .5) * 4, y - 6 - r() * 3); c.stroke(); } },
    path(c, o, x, y, w, nx, ny, th, r) { if (r() < .2) glowDot(c, x, y, 6, '#fff8b0', .55); c.fillStyle = r() < .5 ? 'rgba(120,80,20,.28)' : 'rgba(255,255,255,.3)'; blob(c, x, y, 1.6 + r() * 2, 1.2 + r() * 1.5, c.fillStyle); },
    decor(c, d) { if (d.k < .4) glowFlower(c, d.x, d.y, d.s); else if (d.k < .55) { E(c, d.x, d.y - 3, 4 * d.s, 3 * d.s, '#ff9ac8', false); c.fillStyle = '#fff0e0'; c.fillRect(d.x - 1.2, d.y - 3, 2.4, 4 * d.s); glowDot(c, d.x, d.y - 4, 8, '#ffb0e0', .3); } else if (d.k < .7) tuft(c, d.x, d.y, d.s, '#2a9a4a'); else glowDot(c, d.x, d.y, 8 * d.s, '#f0ffb0', .3); },
    tree(c, x, y, s, r) { c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(x, y + 2, s * .9, s * .26, 0, 0, TAU); c.fill(); c.fillStyle = '#7a5a2a'; c.fillRect(x - 3, y - s * .8, 6, s * .8); for (const [dx, dy, rr, col] of [[0, -1.3, .9, '#4ac86a'], [-.5, -1.1, .6, '#6ae88a'], [.5, -1.15, .6, '#8af0a0']]) E(c, x + dx * s, y + dy * s, rr * s * .75, rr * s * .65, col, false); glowDot(c, x, y - s * 1.2, s * 1.4, '#d8ffa0', .3); },
    particle(c, p, dt, t, L) { if (p.k < .5) { p.y += (10 + p.s * 10) * dt; p.x += Math.sin(p.ph + t * .7) * 14 * dt; p.ph += dt; c.save(); c.translate(p.x, p.y); c.rotate(p.ph * .8); c.fillStyle = 'rgba(255,230,120,.9)'; c.beginPath(); c.ellipse(0, 0, 4 * p.s, 2 * p.s, 0, 0, TAU); c.fill(); c.restore(); if (p.y > L.H + 10) { p.y = -10; p.x = Math.random() * L.W; } } else { p.y -= (6 + p.s * 8) * dt; p.ph += dt; const a = .4 + .6 * Math.sin(p.ph * 2 + p.k * 7) ** 2; glowDot(c, p.x + Math.sin(p.ph) * 6, p.y, 6 * p.s, '#f0ffb0', a * .8); if (p.y < L.fy * .5) { p.y = L.H - 10; p.x = Math.random() * L.W; } } },
    n: 50, cloudA: .5,
  },
});
