'use strict';
// ===== エフェクト & 戦場描画 =====
const FONT = '"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo","Hiragino Sans",sans-serif';
const FXS = { rays: [], parts: [], rings: [], texts: [], coins: [], bolts: [], beams: [], pillars: [], meteors: [], slashes: [], banner: null, flash: 0, shake: 0, leakT: 0 };

Object.assign(FX, {
  burst(x, y, col, n, spd) {
    if (FXS.parts.length > 800) return; n = Math.round((n || 8) * 1.7); spd = (spd || 80) * 1.15;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.8), life = 0.5 + Math.random() * 0.6; FXS.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life, max: life, col, r: 1.8 + Math.random() * 2.8, shape: Math.random() < .3 ? 'star' : 'dot', rot: Math.random() * TAU, vr: (Math.random() - .5) * 10, g: 120 }); }
  },
  ring(x, y, r, col) { FXS.rings.push({ x, y, r, col, t: 0, max: 0.45 }); },
  text(x, y, s, col, size) { FXS.texts.push({ x, y, s, col, size: size || 14, t: 0, max: 1.1 }); },
  coin(x, y, amt) {
    const n = Math.min(6, 1 + Math.floor(amt / 6));
    for (let i = 0; i < n; i++) FXS.coins.push({ x: x + (Math.random() - .5) * 14, y, vx: (Math.random() - .5) * 90, vy: -110 - Math.random() * 70, t: 0, state: 0, fy: y, amt: i === 0 ? amt : 0, wait: 0.35 + Math.random() * .15 });
    if (amt >= 6) FXS.texts.push({ x, y: y - 14, s: '+' + amt, col: '#ffe27a', size: amt >= 80 ? 26 : amt >= 30 ? 19 : 14, t: 0, max: 1.0 });
    if (amt >= 12) { FXS.rings.push({ x, y, r: 26, col: '#ffe27a', t: 0, max: 0.35 }); for (let i = 0; i < 5; i++) FXS.parts.push({ x, y, vx: (Math.random() - .5) * 120, vy: -60 - Math.random() * 90, life: .6, max: .6, col: '#ffe27a', r: 2.4, shape: 'star', rot: 0, vr: 6, g: 260 }); }
  },
  hit(x, y, col) {
    if (FXS.parts.length > 700) return;
    FXS.rings.push({ x, y, r: 16, col: col && col.length === 7 ? col : '#ffffff', t: 0, max: 0.2 });
    for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 90; FXS.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .28, max: .28, col: col && col.length === 7 ? col : '#ffffff', r: 1.6 + Math.random() * 1.6, shape: i % 2 ? 'star' : 'dot', rot: 0, vr: 8, g: 0 }); }
  },
  num(x, y, a) {
    if (FXS.texts.length > 36) return; const v = Math.round(a); if (v < 1) return;
    FXS.texts.push({ x: x + (Math.random() - .5) * 16, y, s: '' + v, col: a >= 150 ? '#ffd7a0' : '#ffffff', size: clamp(10 + Math.log10(Math.max(1, a)) * 2.6, 10, 18), t: 0, max: 0.6 });
  },
  confetti(x, y, n) {
    const cols = ['#ff6a8a', '#ffd24a', '#6ad0ff', '#7affb0', '#c88aff', '#ffffff'];
    for (let i = 0; i < n && FXS.parts.length < 800; i++) { const life = 1 + Math.random() * .8; FXS.parts.push({ x: x + (Math.random() - .5) * 20, y, vx: (Math.random() - .5) * 320, vy: -140 - Math.random() * 260, life, max: life, col: cols[i % cols.length], r: 2.6 + Math.random() * 2.4, shape: i % 3 ? 'rect' : 'star', rot: Math.random() * TAU, vr: (Math.random() - .5) * 14, g: 420 }); }
  },
  rays(x, y, col, n) { FXS.rays.push({ x, y, col: col && col.length === 7 ? col : '#ffe27a', n: n || 3, t: 0, max: .8 }); },
  kill(e) {
    const ECOL = { slime: '#6ee0a8', rabbit: '#ffe0e8', frog: '#58b858', mushroom: '#b070ff', jelly: '#7ae6ff', bat: '#9a6ad0', fairy: '#ff9ac8', thief: '#8a70c0', knight: '#aab8d0' };
    const boss = !!e.boss, col = boss ? '#fff2a0' : (ECOL[e.def.key] || '#ffffff'), big = e.def.key === 'knight';
    FX.burst(e.x, e.y, col, boss ? 50 : big ? 18 : 9, boss ? 260 : 120);
    FXS.rings.push({ x: e.x, y: e.y, r: e.r * (boss ? 5 : 2.4), col, t: 0, max: boss ? .6 : .3 });
    if (!e.mini) FX.burst(e.x, e.y, '#ffe27a', boss ? 12 : 3, 90);
    if (boss) { FX.confetti(e.x, e.y, 70); FX.rays(e.x, e.y, '#ffe27a', 7); FXS.rings.push({ x: e.x, y: e.y, r: 200, col: '#ffffff', t: 0, max: .9 }); }
  },
  bolt(pts, col) { FXS.bolts.push({ pts, col, t: 0, max: 0.28, seed: Math.random() * 100 }); },
  beam(x1, y1, x2, y2, col, w, global) { FXS.beams.push({ x1, y1, x2, y2, col, w: w || 3, t: 0, max: global ? 0.8 : 0.35, global: !!global }); },
  pillar(x, y, col, star) { FXS.pillars.push({ x, y, col, star: star || 2, t: 0, max: 0.7 + star * 0.06 }); },
  meteor(x, y) { FXS.meteors.push({ x, y, t: 0, max: 0.55 }); },
  slash(x, y, col, u) { FXS.slashes.push({ x, y, col, t: 0, max: 0.25, a: Math.random() * TAU }); },
  banner(text) { FXS.banner = { text, t: 0, max: 2.4 }; },
  shake(a) { FXS.shake = Math.max(FXS.shake, a); },
  flash(a) { FXS.flash = Math.max(FXS.flash, a); },
  leak(e) { FXS.leakT = 0.45; },
});

function fxClear() { for (const k in FXS) if (Array.isArray(FXS[k])) FXS[k].length = 0; FXS.banner = null; FXS.flash = 0; FXS.shake = 0; FXS.leakT = 0; }
function fxUpdate(dt) {
  for (const p of FXS.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; if (p.vr) p.rot += p.vr * dt; if (p.g > 300) p.vx *= 1 - dt * 1.2; }
  FXS.parts = FXS.parts.filter(p => p.life > 0);
  for (const k of ['rays', 'rings', 'texts', 'bolts', 'beams', 'pillars', 'meteors', 'slashes']) { for (const o of FXS[k]) o.t += dt; FXS[k] = FXS[k].filter(o => o.t < o.max); }
  for (const t of FXS.texts) t.y -= 22 * dt;
  const tg = ART.coinTarget;
  for (const c of FXS.coins) {
    c.t += dt;
    if (c.state === 1 && Math.random() < .6 && FXS.parts.length < 800) FXS.parts.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: .25, max: .25, col: '#ffe27a', r: 2.2, shape: 'dot', g: 0 });
    if (c.state === 0) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 420 * dt; if (c.vy > 0 && c.y >= c.fy) { c.y = c.fy; c.vy = -c.vy * 0.4; c.vx *= .5; if (Math.abs(c.vy) < 30) c.state = 1; } if (c.t > c.wait + 0.3) c.state = 1; if (c.state === 1) c.t = 0; }
    else { const dx = tg.x - c.x, dy = tg.y - c.y, d = Math.hypot(dx, dy), sp = 520 + c.t * 900; if (d < sp * dt + 6) c.done = true; else { c.x += dx / d * sp * dt; c.y += dy / d * sp * dt; } }
  }
  FXS.coins = FXS.coins.filter(c => !c.done);
  if (FXS.banner) { FXS.banner.t += dt; if (FXS.banner.t > FXS.banner.max) FXS.banner = null; }
  FXS.flash = Math.max(0, FXS.flash - dt * 1.4); FXS.shake = Math.max(0, FXS.shake - dt * 22); FXS.leakT = Math.max(0, FXS.leakT - dt);
}

function drawProj(c, p, S, t) {
  const col = p.color;
  for (let i = 0; i < p.trail.length; i++) { const q = p.trail[i], a = i / p.trail.length; c.fillStyle = rgba(col, a * .5); c.beginPath(); c.arc(q.x, q.y, 1.5 + a * 2, 0, TAU); c.fill(); }
  const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
  c.save(); c.translate(p.x, p.y);
  if (p.key === 'archer') { c.rotate(ang); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(5, 0); c.stroke(); PL(c, [[5, 0], [1, -2.5], [1, 2.5]], '#c8ffd0', false); }
  else if (p.key === 'sniper') { c.rotate(ang); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,240,160,.95)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, 0); c.lineTo(6, 0); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke(); }
  else if (p.key === 'ice') { c.rotate(ang); PL(c, [[7, 0], [0, -3.2], [-6, 0], [0, 3.2]], '#d8f6ff', false); }
  else if (p.key === 'wind') { c.rotate(t * 12); c.strokeStyle = 'rgba(220,255,235,.95)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 5, 0, 4.5); c.stroke(); }
  else if (p.key === 'poison') { c.fillStyle = '#9ae86a'; E(c, 0, 0, 4.2, 4.2, '#9ae86a', false); E(c, -1, -1, 1.6, 1.6, '#e8ffc8', false); }
  else if (p.key === 'reaper') { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 12, '#b588ff', .9); E(c, 0, 0, 3.4, 3.4, '#f0e0ff', false); }
  else if (p.key === 'mouse') { E(c, 0, 0, 3.6, 3.6, '#ffe14a', false); }
  else { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 22, col, .95); E(c, 0, 0, 4.4, 4.4, '#fff6d8', false); }
  c.restore();
}

function drawFx(c, S, t) {
  c.save();
  // 地面の炎
  for (const g of (G ? G.grounds : [])) {
    c.save(); c.globalCompositeOperation = 'lighter'; const a = Math.min(1, g.t);
    glowDot(c, g.x, g.y, g.r * 1.3, '#ff7a2a', .5 * a);
    for (let i = 0; i < 6; i++) { const ph = t * 5 + i * 1.7, fx = g.x + Math.cos(i * 1.3) * g.r * .6, fy = g.y + Math.sin(i * 2.1) * g.r * .35; c.fillStyle = `rgba(255,${150 + i * 15},60,${.6 * a})`; c.beginPath(); c.ellipse(fx, fy - Math.abs(Math.sin(ph)) * 6, 3, 6 + Math.sin(ph) * 2, 0, 0, TAU); c.fill(); }
    c.restore();
  }
  for (const m of FXS.meteors) {
    const k = m.t / m.max, y = m.y - (1 - k) * 260, x = m.x - (1 - k) * 90;
    c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, 26, '#ff8a3a', .9); E(c, x, y, 8, 8, '#ffe0a0', false);
    c.strokeStyle = 'rgba(255,150,60,.7)'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 50, y - 100 * (1 - k) - 20); c.stroke(); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = `rgba(255,120,60,${.5})`; c.lineWidth = 2; c.beginPath(); c.ellipse(m.x, m.y, S * 1.9 * k, S * 0.9 * k, 0, 0, TAU); c.stroke();
  }
  for (const p of FXS.pillars) {
    const k = p.t / p.max, h = 160 + p.star * 20, w = (10 + p.star * 4) * (1 - k * .6);
    c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, p.y - h, 0, p.y); g.addColorStop(0, rgba(p.col, 0)); g.addColorStop(0.7, rgba(p.col, .55 * (1 - k))); g.addColorStop(1, 'rgba(255,255,255,' + (.8 * (1 - k)) + ')');
    c.fillStyle = g; c.fillRect(p.x - w, p.y - h, w * 2, h); c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) { const a = k * 6 + i * 1.6; star5(c, p.x + Math.cos(a) * 18 * (1 - k * .3), p.y - k * 80 - i * 10, 3, `rgba(255,250,200,${1 - k})`); }
  }
  for (const r of FXS.rings) { const k = r.t / r.max; c.strokeStyle = rgba(r.col, (1 - k) * .9); c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.ellipse(r.x, r.y, r.r * (0.3 + easeOut(k) * .85), r.r * (0.3 + easeOut(k) * .85) * .75, 0, 0, TAU); c.stroke(); }
  for (const s of FXS.slashes) { const k = s.t / s.max; c.strokeStyle = rgba('#ffffff', 1 - k); c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.arc(s.x, s.y, 13, s.a, s.a + 1.6 * easeOut(k)); c.stroke(); }
  for (const b of FXS.bolts) {
    const a = 1 - b.t / b.max; c.globalCompositeOperation = 'lighter';
    for (const [w, col] of [[7, rgba(b.col, .35 * a)], [2.2, `rgba(255,255,255,${a})`]]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      for (let i = 1; i < b.pts.length; i++) {
        const p0 = b.pts[i - 1], p1 = b.pts[i], n = 4;
        if (i === 1) c.moveTo(p0.x, p0.y);
        for (let k = 1; k <= n; k++) { const f = k / n, jx = k < n ? Math.sin(b.seed + i * 7 + k * 13) * 6 : 0, jy = k < n ? Math.cos(b.seed + i * 5 + k * 11) * 6 : 0; c.lineTo(p0.x + (p1.x - p0.x) * f + jx, p0.y + (p1.y - p0.y) * f + jy); }
      }
      c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }
  for (const b of FXS.beams) {
    if (b.global) continue;
    const a = 1 - b.t / b.max; c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(b.col, .55 * a); c.lineWidth = b.w * (1.4 - b.t / b.max * .6); c.lineCap = 'round'; c.beginPath(); c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${a * .8})`; c.lineWidth = b.w * .35; c.stroke(); c.globalCompositeOperation = 'source-over';
  }
  for (const r of FXS.rays) {
    const k = r.t / r.max, len = (50 + r.n * 14) * easeOut(k), cnt = 8 + r.n * 2; c.save(); c.globalCompositeOperation = 'lighter'; c.translate(r.x, r.y); c.rotate(k * 1.2);
    glowDot(c, 0, 0, len * .7, r.col, (1 - k) * .8); c.fillStyle = rgba(r.col, (1 - k) * .7);
    for (let i = 0; i < cnt; i++) { const a = i / cnt * TAU; c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, -2.4); c.lineTo(len * (i % 2 ? .7 : 1), 0); c.lineTo(0, 2.4); c.fill(); c.restore(); }
    c.restore();
  }
  c.save();
  for (const p of FXS.parts) {
    const a = Math.max(0, p.life / p.max), col = p.col.length === 7 ? p.col : '#ffffff', r = p.r * (0.45 + a * .55);
    if (p.shape === 'star') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0); star5(c, 0, 0, r * 1.6, rgba(col, Math.min(1, a * 1.6))); c.restore(); }
    else if (p.shape === 'rect') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0); c.fillStyle = rgba(col, Math.min(1, a * 1.8)); c.fillRect(-r, -r * .5, r * 2, r); c.restore(); }
    else { c.fillStyle = rgba(col, Math.min(1, a * 1.4)); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); }
  }
  c.restore();
  c.restore();
}
function drawFxTop(c, L, t) {
  // コイン
  for (const k of FXS.coins) {
    c.save(); c.translate(k.x, k.y); const w = Math.abs(Math.cos(t * 10 + k.x));
    c.fillStyle = 'rgba(0,0,0,.2)'; if (k.state === 0) { c.beginPath(); c.ellipse(0, k.fy - k.y + 4, 4, 1.6, 0, 0, TAU); c.fill(); }
    E(c, 0, 0, 5.2 * (.5 + w * .5), 5.2, '#ffd23a'); E(c, 0, 0, 3.2 * (.5 + w * .5), 3.2, '#ffec8a', false); c.restore();
  }
  for (const k of FXS.texts) { const a = 1 - Math.pow(k.t / k.max, 2); c.globalAlpha = a; c.font = `bold ${k.size}px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(40,20,60,.85)'; c.strokeText(k.s, k.x, k.y); c.fillStyle = k.col; c.fillText(k.s, k.x, k.y); c.globalAlpha = 1; }
}
function drawOverlayFx(c, L) {
  if (FXS.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(.7, FXS.flash)})`; c.fillRect(0, 0, L.W, L.H); }
  if (FXS.leakT > 0) { const g = c.createRadialGradient(L.W / 2, L.H / 2, L.H * .3, L.W / 2, L.H / 2, L.H * .75); g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${FXS.leakT})`); c.fillStyle = g; c.fillRect(0, 0, L.W, L.H); }
  const b = FXS.banner;
  if (b) {
    const k = b.t / b.max, a = k < .12 ? k / .12 : k > .75 ? (1 - k) / .25 : 1, y = L.fy + L.fh * .3 + (1 - Math.min(1, k / .12)) * 20;
    c.save(); c.globalAlpha = Math.max(0, a);
    const g = c.createLinearGradient(0, 0, L.W, 0); g.addColorStop(0, 'rgba(20,10,50,0)'); g.addColorStop(.2, 'rgba(20,10,50,.62)'); g.addColorStop(.8, 'rgba(20,10,50,.62)'); g.addColorStop(1, 'rgba(20,10,50,0)');
    c.fillStyle = g; c.fillRect(0, y - 34, L.W, 68);
    c.font = `bold ${L.portrait ? 24 : 30}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = 'rgba(60,20,90,.9)'; c.strokeText(b.text, L.W / 2, y); c.fillStyle = '#fff8d8'; c.fillText(b.text, L.W / 2, y);
    c.textBaseline = 'alphabetic'; c.restore();
  }
}

// ---------- 戦場の描画 ----------
function drawZones(c, G, t) {
  for (const z of G.zones) {
    const info = ZONE_INFO[z.type], col = info.c, p = .5 + .5 * Math.sin(t * 2 + z.x);
    c.save(); c.translate(z.x, z.y);
    c.save(); c.scale(1, .62);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, z.r * 1.2); g.addColorStop(0, rgba(col, .38 + p * .12)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, z.r * 1.2, 0, TAU); c.fill();
    c.strokeStyle = rgba(col, .75); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, z.r, 0, TAU); c.stroke();
    c.rotate(t * .3); c.setLineDash([5, 6]); c.beginPath(); c.arc(0, 0, z.r * .78, 0, TAU); c.stroke(); c.setLineDash([]);
    c.restore();
    c.translate(0, -2 - p * 2);
    c.save(); c.font = `bold 10px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = 'rgba(40,20,70,.8)'; c.globalAlpha = .85; c.strokeText(info.n, 0, z.r * .62 + 10); c.fillStyle = '#fff'; c.fillText(info.n, 0, z.r * .62 + 10); c.font = `bold 9px ${FONT}`; c.strokeText(info.d, 0, z.r * .62 + 21); c.fillStyle = rgba(col, 1); c.fillText(info.d, 0, z.r * .62 + 21); c.restore();
    c.fillStyle = rgba(col, .95); c.strokeStyle = 'rgba(60,30,80,.7)'; c.lineWidth = 1.2;
    if (z.type === 'high') PL(c, [[-9, 5], [-2, -8], [3, -1], [6, -5], [11, 5]], col);
    else if (z.type === 'spring') { c.beginPath(); c.moveTo(0, -9); c.quadraticCurveTo(8, 1, 0, 6); c.quadraticCurveTo(-8, 1, 0, -9); c.fill(); c.stroke(); }
    else if (z.type === 'altar') { PL(c, [[0, -10], [8, 0], [0, 8], [-8, 0]], col); }
    else if (z.type === 'flower') { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - 1.57; E(c, Math.cos(a) * 5, Math.sin(a) * 5, 3.2, 3.2, col); } E(c, 0, 0, 2.6, 2.6, '#ffe27a'); }
    else { E(c, 0, 2, 7, 4, '#a8742e'); E(c, 0, -1, 7, 4, '#d9a35a'); E(c, 0, -1, 4, 2, col, false); }
    c.restore();
  }
}
function drawGates(c, L, t) {
  const g = ART.gates; if (!g) return;
  const th = ART.th;
  // 入口：渦巻くポータル
  c.save(); c.translate(g.ent.x, g.ent.y); c.globalCompositeOperation = 'lighter';
  glowDot(c, 0, 0, L.S * 1.8, '#c070ff', .55 + Math.sin(t * 3) * .1);
  c.rotate(t * 1.2); c.strokeStyle = 'rgba(230,190,255,.9)'; c.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.arc(0, 0, L.S * .9, 0, 2.2); c.stroke(); }
  c.restore();
  // 出口：守るべきクリスタル
  const x = g.ext.x, y = g.ext.y, b = Math.sin(t * 2) * 3;
  c.save(); c.translate(x, y + b);
  glowDot(c, 0, 0, L.S * 2.2, '#8affd8', .45);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, L.S * .85 - b, L.S * .6, L.S * .2, 0, 0, TAU); c.fill();
  PL(c, [[0, -L.S * 1.1], [L.S * .55, -L.S * .1], [0, L.S * .8], [-L.S * .55, -L.S * .1]], '#9afff0');
  PL(c, [[0, -L.S * 1.1], [L.S * .55, -L.S * .1], [0, -L.S * .1]], '#e8fffa', false);
  PL(c, [[0, -L.S * .1], [-L.S * .55, -L.S * .1], [0, L.S * .8]], '#5adfc8', false);
  c.restore();
}

function drawWorld(c, G, dt, ui) {
  const L = G.L, S = L.S, t = ART.t;
  const key = G.stage + (L.portrait ? 'p' : 'l');
  if (ART.bgKey !== key) makeBackground(G.stage, L, G.path, G.zones);
  c.save();
  if (FXS.shake > 0) c.translate((Math.random() - .5) * FXS.shake, (Math.random() - .5) * FXS.shake);
  c.drawImage(ART.bg, 0, 0, L.W, L.H);
  drawSceneryAnim(c, L, dt);
  c.save(); c.beginPath(); c.rect(0, L.fy - 20, L.W, L.fh + 40); c.clip();
  drawGates(c, L, t);
  drawZones(c, G, t);
  // 配置ガイド（ドラッグ中）
  if (ui && ui.guide) ui.guide(c);
  // ユニット＋敵（y順）
  const list = [];
  for (const u of G.units) if (!(ui && ui.dragUnit === u)) list.push([u.y, 0, u]);
  for (const e of G.enemies) list.push([e.y + (e.fly ? 30 : 0), 1, e]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of list) { if (k === 0) drawUnit(c, o, S, t, ui && ui.sel === o); else drawEnemy(c, o, S, t); }
  for (const p of G.projs) drawProj(c, p, S, t);
  drawFx(c, S, t);
  if (ui && ui.over) ui.over(c);
  c.restore();
  drawFxTop(c, L, t);
  // 時間帯
  const frac = clamp(((G.wave || 1) - 1 + (G.phase === 'prep' ? 1 : 0.5)) / MAX_WAVE, 0, 1);
  todOverlay(c, L, G.endless ? (G.wave % 20) / 20 : frac);
  c.restore();
}
