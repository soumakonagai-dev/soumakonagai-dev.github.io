'use strict';
// ===== エフェクト & 戦場描画 =====
const FONT = '"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo","Hiragino Sans",sans-serif';
const FXS = { dnums: [], rays: [], parts: [], rings: [], texts: [], coins: [], bolts: [], beams: [], pillars: [], meteors: [], slashes: [], tornados: [], waters: [], goos: [], banner: null, flash: 0, shake: 0, leakT: 0 };

Object.assign(FX, {
  burst(x, y, col, n, spd) {
    if (FXS.parts.length > PMAX()) return; n = Math.round((n || 8) * (PERF.lite ? .8 : 1.7)); spd = (spd || 80) * 1.15;
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
    if (FXS.parts.length > PMAX() - 60) return;
    FXS.rings.push({ x, y, r: 16, col: col && col.length === 7 ? col : '#ffffff', t: 0, max: 0.2 });
    for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 90; FXS.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .28, max: .28, col: col && col.length === 7 ? col : '#ffffff', r: 1.6 + Math.random() * 1.6, shape: i % 2 ? 'star' : 'dot', rot: 0, vr: 8, g: 0 }); }
  },
  // ダメージ数字：与えた割合が大きいほど、色が熱く・大きく・長く。会心は金色でバーンと出る
  num(x, y, a, crit, maxhp) {
    if (FXS.dnums.length > (PERF.lite ? 10 : 80)) return; const v = Math.round(a); if (v < 1) return;
    const r = maxhp ? a / maxhp : 0, tier = crit ? 5 : r < 0.0015 ? 0 : r < 0.01 ? 1 : r < 0.04 ? 2 : r < 0.15 ? 3 : 4;
    const cols = [['#ffffff', '#a8bce0'], ['#fff6b0', '#ffc94a'], ['#ffdc8a', '#ff8a2a'], ['#ffc0a0', '#ff4a3a'], ['#ffb0f0', '#b04aff'], ['#fffbc0', '#ffaa1a']][tier];
    const size = clamp(12 + Math.log10(Math.max(1, a)) * 2.4 + tier * 2.4 + (crit ? 5 : 0), 12, 44);
    FXS.dnums.push({ x: x + (Math.random() - .5) * 28, y, vx: (Math.random() - .5) * 46, vy: -85 - Math.random() * 35 - tier * 9, s: fmtNum(v) + (crit ? '!' : ''), size, c1: cols[0], c2: cols[1], tier, crit: !!crit, t: 0, max: 0.8 + tier * 0.07 });
  },
  confetti(x, y, n) {
    const cols = ['#ff6a8a', '#ffd24a', '#6ad0ff', '#7affb0', '#c88aff', '#ffffff'];
    for (let i = 0; i < (PERF.lite ? Math.ceil(n / 3) : n) && FXS.parts.length < PMAX(); i++) { const life = 1 + Math.random() * .8; FXS.parts.push({ x: x + (Math.random() - .5) * 20, y, vx: (Math.random() - .5) * 320, vy: -140 - Math.random() * 260, life, max: life, col: cols[i % cols.length], r: 2.6 + Math.random() * 2.4, shape: i % 3 ? 'rect' : 'star', rot: Math.random() * TAU, vr: (Math.random() - .5) * 14, g: 420 }); }
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
  tornado(x, y, R) { if (FXS.tornados.length < 10) FXS.tornados.push({ x, y, R, t: 0, max: 0.95 }); },
  splash(x, y, R, col) {
    if (FXS.waters.length < 12) FXS.waters.push({ x, y, R, col: col || '#7ad0ff', t: 0, max: 0.6 });
    if (FXS.parts.length < PMAX() - 60) for (let i = 0; i < (PERF.lite ? 5 : 12); i++) { const a = Math.random() * TAU, v = 50 + Math.random() * 90; FXS.parts.push({ x, y, vx: Math.cos(a) * v * .7, vy: -90 - Math.random() * 110, life: .6, max: .6, col: i % 3 ? '#7ad0ff' : '#e8fbff', r: 2 + Math.random() * 2, shape: 'dot', rot: 0, vr: 0, g: 520 }); }
  },
  goo(x, y, R, col) { if (FXS.goos.length < 14) FXS.goos.push({ x, y, R, col: col || '#9a8aff', t: 0, max: 1.4 }); },
  hitVfx(p) {
    const d = UNITS[p.u.key]; if (!d || !G) return; const S = G.L.S, fx = d.fx || {};
    const sp = fx.splash ? fxv(p.u, 'splash') * S : 0;
    if (d.elem === 'wind') FX.tornado(p.tx, p.ty, Math.max(sp, S * .8));
    else if (d.elem === 'water' && p.key !== 'ice') FX.splash(p.tx, p.ty, Math.max(sp, S * .9));
    if (fx.poison || p.key === 'poison') FX.goo(p.tx, p.ty, Math.max(sp, S * .8), '#8ae85a');
    else if (fx.slow || fx.mark) FX.goo(p.tx, p.ty, Math.max(sp, S * .8), fx.mark ? '#ff7ac0' : '#9a8aff');
  },
  banner(text) { FXS.banner = { text, t: 0, max: 2.4 }; },
  shake(a) { FXS.shake = Math.max(FXS.shake, a); },
  flash(a) { FXS.flash = Math.max(FXS.flash, a); },
  leak(e) { FXS.leakT = 0.45; },
});

function fxClear() { for (const k in FXS) if (Array.isArray(FXS[k])) FXS[k].length = 0; FXS.banner = null; FXS.flash = 0; FXS.shake = 0; FXS.leakT = 0; }
function fxUpdate(dt) {
  for (const p of FXS.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; if (p.vr) p.rot += p.vr * dt; if (p.g > 300) p.vx *= 1 - dt * 1.2; }
  FXS.parts = FXS.parts.filter(p => p.life > 0);
  for (const d of FXS.dnums) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 230 * dt; }
  for (const k of ['dnums', 'rays', 'rings', 'texts', 'bolts', 'beams', 'pillars', 'meteors', 'slashes', 'tornados', 'waters', 'goos', 'misc']) { for (const o of FXS[k]) o.t += dt; FXS[k] = FXS[k].filter(o => o.t < o.max); }
  for (const t of FXS.texts) t.y -= 22 * dt;
  const tg = ART.coinTarget;
  for (const c of FXS.coins) {
    c.t += dt;
    if (c.state === 1 && Math.random() < (PERF.lite ? .2 : .6) && FXS.parts.length < PMAX()) FXS.parts.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: .25, max: .25, col: '#ffe27a', r: 2.2, shape: 'dot', g: 0 });
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
  if (FXCFG.on && drawProjFx(c, p, S, t, ang)) { }
  else if (p.key === 'archer') { c.rotate(ang); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(5, 0); c.stroke(); PL(c, [[5, 0], [1, -2.5], [1, 2.5]], '#c8ffd0', false); }
  else if (p.key === 'sniper') { c.rotate(ang); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,240,160,.95)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, 0); c.lineTo(6, 0); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke(); }
  else if (p.key === 'ice') { c.rotate(ang); PL(c, [[7, 0], [0, -3.2], [-6, 0], [0, 3.2]], '#d8f6ff', false); }
  else if (p.key === 'poison') { c.fillStyle = '#9ae86a'; E(c, 0, 0, 4.2, 4.2, '#9ae86a', false); E(c, -1, -1, 1.6, 1.6, '#e8ffc8', false); }
  else if (p.key === 'reaper') { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 12, '#b588ff', .9); E(c, 0, 0, 3.4, 3.4, '#f0e0ff', false); }

  else if (p.key === 'mouse') { E(c, 0, 0, 3.6, 3.6, '#ffe14a', false); }
  else { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 22, col, .95); E(c, 0, 0, 4.4, 4.4, '#fff6d8', false); }
  c.restore();
}

function drawMiniTornado(c, t, S) {
  const H = S * .55; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const f = i / 5, yy = H * .5 - f * H, rx = 2.5 + f * S * .24, a = t * 14 + f * 3; c.strokeStyle = 'rgba(' + (225 - f * 30) + ',255,' + (235 - f * 20) + ',' + (.95 - f * .35) + ')'; c.lineWidth = 2; c.beginPath(); c.ellipse(Math.sin(t * 9 + f * 4) * 1.5, yy, rx, rx * .32, 0, a, a + 4.2); c.stroke(); }
}
function wobblePath(c, x, y, R, t, amp, sq, seed) {
  c.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, r = R * (1 + amp * Math.sin(a * 3 + t * 4.2 + seed) + amp * .75 * Math.sin(a * 5 - t * 6.1 + seed * 2) + amp * .4 * Math.sin(a * 2 + t * 2.3)); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * sq; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath();
}
function gooBlob(c, x, y, R, t, col, a, seed, sq) {
  wobblePath(c, x, y, R, t, .09, sq, seed); c.fillStyle = rgba(col, .26 * a); c.fill(); c.strokeStyle = rgba(col, .75 * a); c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 3; i++) { const q = ((t * .45 + i / 3 + seed * .1) % 1); wobblePath(c, x, y, R * (.25 + q * .75), t + i, .1, sq, seed + i); c.strokeStyle = rgba(col, .5 * (1 - q) * a); c.lineWidth = 1.4; c.stroke(); }
  for (let i = 0; i < 5; i++) { const q = (t * .5 + i * .21 + seed) % 1, ang = i * 1.9 + seed + t * .6, rr = R * .7 * Math.sqrt((i + .5) / 5); const bx = x + Math.cos(ang) * rr, by = y + Math.sin(ang) * rr * sq - q * R * .3; c.strokeStyle = rgba(col, .8 * (1 - q) * a); c.lineWidth = 1.2; c.beginPath(); c.arc(bx, by, 1.6 + q * 2.4, 0, TAU); c.stroke(); }
}
// 足もとに敷く効果（ユニットや敵より下に描く）：弱体オーラのぐにょぐにょ、鈍足の敵の足もと
function drawGooLayer(c, S, t) {
  if (!FXCFG.on) return; drawBuffAura(c, S, t);
  const AC = { eSlow: '#8a7aff', eVuln: '#ff6aa8', eMr: '#ffa84a' };
  for (const u of G.units) {
    const d = UNITS[u.key], fx = d.fx; if (!fx || d.style !== 'none' || !(fx.eSlow || fx.eVuln || fx.eMr)) continue;
    const key = fx.eSlow ? 'eSlow' : fx.eVuln ? 'eVuln' : 'eMr', R = d.range * S * (1 + .05 * (u.star - 1)) * (zoneAt(u.x, u.y, 'altar') ? 1.2 : 1);
    c.save(); gooBlob(c, u.x, u.y, R, t, AC[key], 1, (u.id || 0) * .7, .78);
    if (fx.eSlow && fx.eVuln) gooBlob(c, u.x, u.y, R * .6, t * 1.3, '#ff6aa8', .8, u.id || 0, .78);
    c.restore();
  }
  for (const e of G.enemies) if (!e.dead && e.slowT > 0 && e.slowAmt > 0 && !e.fly) { c.save(); wobblePath(c, e.x, e.y + e.r * .5, e.r * 1.5, t + (e.id || 0), .12, .4); c.fillStyle = 'rgba(130,110,255,.3)'; c.fill(); c.strokeStyle = 'rgba(170,150,255,.6)'; c.lineWidth = 1.2; c.stroke(); c.restore(); }
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
  if (FXCFG.on) drawMisc(c, S, t);
  for (const g of FXS.goos) { const k = clamp(g.t / g.max, 0, 1), a = k < .12 ? k / .12 : 1 - (k - .12) / .88; c.save(); gooBlob(c, g.x, g.y, g.R * (.7 + .3 * Math.min(1, k * 5)), t, g.col, a, g.x * .01, .7); c.restore(); }
  for (const w of FXS.waters) { const k = clamp(w.t / w.max, 0, 1); for (let i = 0; i < 2; i++) { const kk = clamp(k * 1.3 - i * .25, 0, 1); if (kk <= 0 || kk >= 1) continue; c.strokeStyle = rgba(i ? '#e8fbff' : w.col, (1 - kk) * .9); c.lineWidth = 3 * (1 - kk) + 1; c.beginPath(); c.ellipse(w.x, w.y, w.R * (.2 + easeOut(kk) * .9), w.R * (.2 + easeOut(kk) * .9) * .5, 0, 0, TAU); c.stroke(); }
    c.fillStyle = rgba(w.col, (1 - k) * .3); c.beginPath(); c.ellipse(w.x, w.y, w.R * (.2 + easeOut(k) * .8), w.R * (.2 + easeOut(k) * .8) * .5, 0, 0, TAU); c.fill();
    const h = Math.sin(Math.min(1, k * 2.2) * Math.PI) * S * .8 * (1 - k * .5); c.strokeStyle = rgba('#bfeaff', (1 - k) * .85); c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(w.x + i * 4, w.y); c.quadraticCurveTo(w.x + i * 7, w.y - h, w.x + i * 10 * (1 + k), w.y - h * .3); c.stroke(); } }
  for (const w of FXS.tornados) {
    const k = clamp(w.t / w.max, 0, 1), a = k < .15 ? k / .15 : k > .75 ? (1 - k) / .25 : 1, H = S * 2.3 * (.45 + .55 * Math.min(1, k * 4)); c.save(); c.translate(w.x, w.y); c.lineCap = 'round';
    c.fillStyle = 'rgba(0,0,0,' + .15 * a + ')'; c.beginPath(); c.ellipse(0, 2, w.R * .5, w.R * .16, 0, 0, TAU); c.fill();
    for (let i = 0; i < 16; i++) { const f = i / 15, yy = -f * H, rx = w.R * (.16 + f * .5), ox = Math.sin(t * 8 + f * 5) * rx * .25, ang = t * 11 + f * 4; c.strokeStyle = 'rgba(' + Math.round(225 - f * 40) + ',255,' + Math.round(236 - f * 24) + ',' + a * (.9 - f * .55) + ')'; c.lineWidth = 2.4 - f * .8; c.beginPath(); c.ellipse(ox, yy, rx, rx * .3, 0, ang, ang + 4.4); c.stroke(); }
    for (let i = 0; i < 7; i++) { const f = ((i / 7 + t * .9) % 1), rx = w.R * (.2 + f * .55), ang = t * 9 + i * 2.1; c.fillStyle = i % 2 ? 'rgba(150,235,140,' + a + ')' : 'rgba(255,255,255,' + a + ')'; c.beginPath(); c.ellipse(Math.cos(ang) * rx, -f * H + Math.sin(ang) * rx * .3, 2.4, 1.3, ang, 0, TAU); c.fill(); }
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
  for (const d of FXS.dnums) {
    const k = d.t / d.max, pop = 1 + 0.6 * Math.max(0, 1 - d.t / 0.14) + (d.crit ? 0.12 * Math.sin(d.t * 36) * Math.max(0, 1 - d.t * 2) : 0), a = k > 0.7 ? (1 - k) / 0.3 : 1;
    c.save(); c.globalAlpha = Math.max(0, a); c.translate(d.x, d.y); c.scale(pop, pop);
    if (d.tier >= 3) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -d.size * .35, d.size * 1.8, d.c2, d.crit ? .8 : .5); c.restore(); }
    c.font = `900 ${d.size}px ${FONT}`; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = Math.max(4, d.size * .26); c.strokeStyle = d.crit ? 'rgba(90,30,0,.95)' : 'rgba(30,10,50,.92)'; c.strokeText(d.s, 0, 0);
    const g = c.createLinearGradient(0, -d.size, 0, 2); g.addColorStop(0, d.c1); g.addColorStop(1, d.c2); c.fillStyle = g; c.fillText(d.s, 0, 0);
    if (d.crit && d.t < 0.45) { for (let i = 0; i < 4; i++) { const aa = i / 4 * TAU + d.t * 9, rr = d.size * (0.9 + d.t * 1.6); star5(c, Math.cos(aa) * rr, -d.size * .35 + Math.sin(aa) * rr * .6, 4 + d.size * .08, 'rgba(255,240,150,' + (1 - d.t / .45) + ')'); } }
    c.restore();
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

// 1つの描画がエラーになっても、画面全体を巻きこまない（その部分だけ飛ばして、続きを描く）
const SAFE = { err: {}, last: '' };
function safe(c, name, fn) {
  const d0 = c.__d || 0;
  try { fn(); } catch (e) {
    while ((c.__d || 0) > d0) c.restore();
    SAFE.last = name + ': ' + String(e && e.message || e); const n = SAFE.err[name] = (SAFE.err[name] || 0) + 1;
    try { localStorage.setItem('mamori-lasterr', SAFE.last + ' | ' + String(e && e.stack || '').split('\n').slice(1, 3).join(' ').slice(0, 300)); } catch (x) { }
    if (n === 1) console.error(name, e);
    if (n === 3) { try { if (/^(fx|proj|goo|misc)/.test(name) && typeof fxSetOn === 'function' && FXCFG.on) { fxSetOn(false); toast('エフェクトでふぐあいが出たので、オフにしました'); } else if (/^(unit|enemy)/.test(name)) { sprClearAll(); } } catch (x) { } }
    if (n === 1) { try { toast('ちょっと調子がわるいみたい（' + name + '）'); } catch (x) { } }
  }
}
function drawWorld(c, G, dt, ui) {
  const L = G.L, S = L.S, t = ART.t;
  const key = G.stage + (L.portrait ? 'p' : 'l');
  if (ART.bgKey !== key) makeBackground(G.stage, L, G.path, G.zones);
  c.save();
  if (FXS.shake > 0 && !PERF.lite) c.translate((Math.random() - .5) * FXS.shake, (Math.random() - .5) * FXS.shake);
  c.drawImage(ART.bg, 0, 0, L.W, L.H);
  safe(c, 'scenery', () => drawSceneryAnim(c, L, dt));
  c.save(); c.beginPath(); c.rect(0, L.fy - 20, L.W, L.fh + 40); c.clip();
  safe(c, 'gates', () => drawGates(c, L, t));
  safe(c, 'zones', () => drawZones(c, G, t));
  // 配置ガイド（ドラッグ中）
  if (ui && ui.guide) safe(c, 'guide', () => ui.guide(c));
  // ユニット＋敵（y順）
  const list = [];
  safe(c, 'goo', () => drawGooLayer(c, S, t));
  for (const u of G.units) if (!(ui && ui.dragUnit === u)) list.push([u.y, 0, u]);
  for (const e of G.enemies) list.push([e.y + (e.fly ? 30 : 0), 1, e]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of list) { if (k === 0) safe(c, 'unit', () => drawUnit(c, o, S, t, ui && ui.sel === o)); else safe(c, 'enemy', () => drawEnemy(c, o, S, t)); }
  for (const p of G.projs) safe(c, 'proj', () => drawProj(c, p, S, t));
  safe(c, 'fx', () => drawFx(c, S, t));
  if (ui && ui.over) safe(c, 'over', () => ui.over(c));
  c.restore();
  safe(c, 'fxtop', () => drawFxTop(c, L, t));
  // 時間帯
  const frac = clamp(((G.wave || 1) - 1 + (G.phase === 'prep' ? 1 : 0.5)) / MAX_WAVE, 0, 1);
  safe(c, 'tod', () => todOverlay(c, L, G.endless ? (G.wave % 20) / 20 : frac));
  c.restore();
}
