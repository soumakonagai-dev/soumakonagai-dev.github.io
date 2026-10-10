// カゲヌケ アート（キャラ・小物・背景・パーティクルをすべてコードで描く）
(function (root) {
'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- テーマ（章ごとの色） ----------
const THEMES = {
  1: { name: 'こども部屋', paper: [206, 188, 150], deep: [16, 10, 26], vig: 'rgba(8,2,14,.72)', wood: ['#8d5a2b', '#b57c3f', '#5e3a1a'] },
  2: { name: '屋根裏', paper: [168, 160, 138], deep: [10, 10, 22], vig: 'rgba(2,2,12,.8)', wood: ['#6f5238', '#98724c', '#46301d'] }
};
THEMES[3] = { name: '地下室', paper: [152, 160, 154], deep: [8, 12, 16], vig: 'rgba(2,8,10,.78)', wood: ['#4e5a48', '#6d7a62', '#2c3628'] };
THEMES[4] = { name: '倉庫', paper: [198, 162, 120], deep: [18, 10, 10], vig: 'rgba(14,4,2,.7)', wood: ['#7a4e28', '#a9733b', '#4a2c14'] };
THEMES[5] = { name: '時計塔', paper: [152, 152, 180], deep: [10, 10, 32], vig: 'rgba(2,2,18,.8)', wood: ['#6a5a3a', '#a08848', '#3a3020'] };
THEMES[6] = { name: '温室', paper: [150, 172, 142], deep: [8, 18, 12], vig: 'rgba(2,12,6,.72)', wood: ['#5a6a3a', '#7f9250', '#33401f'] };
THEMES[7] = { name: '図書館', paper: [176, 146, 108], deep: [20, 12, 8], vig: 'rgba(14,6,2,.74)', wood: ['#6a4426', '#8f6038', '#3e2412'] };
THEMES[8] = { name: '劇場', paper: [184, 128, 128], deep: [22, 6, 12], vig: 'rgba(18,2,8,.76)', wood: ['#6a2a22', '#94483a', '#401410'] };
THEMES[9] = { name: '水族館', paper: [120, 164, 176], deep: [4, 16, 26], vig: 'rgba(0,10,18,.74)', wood: ['#3e5a5e', '#5f8a8c', '#223638'] };
THEMES[10] = { name: '月の屋上', paper: [140, 150, 196], deep: [6, 6, 26], vig: 'rgba(0,0,16,.82)', wood: ['#4a4a62', '#6c6c8c', '#26263a'] };
const themeOf = (def) => THEMES[+String(def.id).split('-')[0]] || THEMES[1];

// ---------- 乱数（見た目用の固定乱数） ----------
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// ---------- 壁紙 ----------
const wallCache = {};
function wallPattern(ch, W, H) {
  if (wallCache[ch]) return wallCache[ch];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = rng(ch * 77 + 5);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  if (ch === 3) {
    // 地下室: 石れんが
    const bh = 48, bw = 120;
    for (let y = 0, row = 0; y < H; y += bh, row++) {
      for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
        const sh = 0.82 + r() * 0.16;
        g.fillStyle = `rgb(${255 * sh | 0},${255 * sh | 0},${255 * sh | 0})`; g.fillRect(x + 2, y + 2, bw - 3, bh - 3);
        g.strokeStyle = 'rgba(30,40,30,.35)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
        if (r() < 0.18) { g.fillStyle = 'rgba(70,110,60,.22)'; g.fillRect(x + 4, y + bh - 14, bw - 8, 10); }
      }
    }
  } else if (ch === 4) {
    // 倉庫: よこ板＋ステンシル
    for (let y = 0; y < H; y += 70) {
      g.fillStyle = `rgba(60,35,15,${0.10 + r() * 0.1})`; g.fillRect(0, y, W, 3);
      g.fillStyle = 'rgba(255,230,190,.25)'; g.fillRect(0, y + 3, W, 2);
      for (let k = 0; k < 10; k++) { const gx = r() * W, gy = y + 10 + r() * 50; g.strokeStyle = `rgba(80,50,25,${0.06 + r() * 0.08})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 40 + r() * 90, gy + (r() - 0.5) * 3); g.stroke(); }
    }
    g.fillStyle = 'rgba(40,25,10,.22)'; g.font = 'bold 54px sans-serif';
    for (let k = 0; k < 6; k++) { g.save(); g.translate(100 + r() * (W - 300), 160 + r() * (H - 300)); g.rotate((r() - 0.5) * 0.2); g.fillText(['FRAGILE', 'NO.' + (10 + (r() * 80 | 0)), 'THIS SIDE UP', '△▽'][k % 4], 0, 0); g.restore(); }
  } else if (ch === 5) {
    // 時計塔: ぎあと文字ばん
    for (let k = 0; k < 9; k++) {
      const cx = r() * W, cy = r() * H, R = 60 + r() * 120, teeth = 12 + (r() * 10 | 0);
      g.strokeStyle = 'rgba(40,40,70,.32)'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i < teeth * 2; i++) { const rr_ = i % 2 ? R * 0.88 : R; const an = i * Math.PI / teeth; g.lineTo(cx + Math.cos(an) * rr_, cy + Math.sin(an) * rr_); }
      g.closePath(); g.stroke();
      g.beginPath(); g.arc(cx, cy, R * 0.35, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(40,40,70,.1)'; g.beginPath(); g.arc(cx, cy, R * 0.8, 0, TAU); g.fill();
    }
    for (let x = 0; x < W; x += 160) { g.fillStyle = 'rgba(30,30,60,.18)'; g.fillRect(x, 0, 4, H); }
  } else if (ch === 6) {
    // 温室: ガラスのわく・つる草
    for (let x = 0; x <= W; x += 160) { g.fillStyle = 'rgba(30,70,40,.38)'; g.fillRect(x - 3, 0, 6, H); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x + 3, 0, 2, H); }
    for (const y of [140, 330, 560, 760]) { g.fillStyle = 'rgba(30,70,40,.34)'; g.fillRect(0, y - 3, W, 6); }
    for (let k = 0; k < 70; k++) { const x = r() * W, y = r() * H; g.fillStyle = 'rgba(160,210,170,.16)'; g.beginPath(); g.arc(x, y, 3 + r() * 9, 0, TAU); g.fill(); }
    for (let k = 0; k < 9; k++) {
      let x = r() * W, y = H; g.strokeStyle = 'rgba(40,110,50,.5)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y);
      const hgt = 160 + r() * 360; const sw = (r() - 0.5) * 80;
      g.bezierCurveTo(x + sw, y - hgt * 0.3, x - sw, y - hgt * 0.7, x + sw * 0.4, y - hgt); g.stroke();
      for (let i = 0; i < 9; i++) {
        const t = i / 9, lx = x + sw * 0.4 * t + Math.sin(t * 6) * sw * 0.3, ly = y - hgt * t;
        g.fillStyle = 'rgba(70,150,70,.48)'; g.save(); g.translate(lx, ly); g.rotate((i % 2 ? 1 : -1) * 0.9); g.beginPath(); g.ellipse(12, 0, 14, 6, 0, 0, TAU); g.fill(); g.restore();
      }
    }
  } else if (ch === 7) {
    // 図書館: 本だな
    for (let y = 0; y < H; y += 190) {
      let x = 0;
      while (x < W) {
        const bw = 14 + r() * 14, bh = 100 + r() * 60, hue = (r() * 40 + 10) | 0;
        g.fillStyle = `hsla(${hue},38%,${58 + r() * 18}%,.55)`; g.fillRect(x, y + 170 - bh, bw - 2, bh);
        g.fillStyle = 'rgba(255,230,160,.35)'; g.fillRect(x + 2, y + 170 - bh + 10, bw - 6, 3);
        x += bw;
      }
      g.fillStyle = 'rgba(70,40,15,.55)'; g.fillRect(0, y + 170, W, 14);
      g.fillStyle = 'rgba(255,225,170,.4)'; g.fillRect(0, y + 170, W, 3);
    }
  } else if (ch === 8) {
    // 劇場: 幕のひだ・金のふち
    for (let x = 0; x < W; x += 60) {
      const gr = g.createLinearGradient(x, 0, x + 60, 0);
      gr.addColorStop(0, 'rgba(120,20,30,.34)'); gr.addColorStop(0.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(120,20,30,.34)');
      g.fillStyle = gr; g.fillRect(x, 0, 60, H);
    }
    g.fillStyle = 'rgba(190,140,40,.5)'; g.fillRect(0, 0, W, 26); g.fillRect(0, H - 40, W, 40);
    for (let x = 20; x < W; x += 80) { g.fillStyle = 'rgba(190,140,40,.55)'; g.beginPath(); g.arc(x, 40, 11, 0, TAU); g.fill(); }
  } else if (ch === 9) {
    // 水族館: ゆらぐ光のすじ・あわ
    for (let k = 0; k < 14; k++) {
      let x = r() * W; g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 6 + r() * 12;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y < H; y += 60) { x += (r() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
    for (let k = 0; k < 120; k++) { const x = r() * W, y = r() * H, rad = 3 + r() * 12; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.25, 0, TAU); g.fill(); }
    for (let x = 0; x < W; x += 36) { g.fillStyle = 'rgba(20,70,90,.18)'; g.fillRect(x, 0, 2, H); }
  } else if (ch === 10) {
    // 月の屋上: かわらのうろこ模様
    const tw = 70, th2 = 50;
    for (let y = 0, row = 0; y < H + th2; y += th2 * 0.62, row++) {
      for (let x = -(row % 2) * tw / 2; x < W + tw; x += tw) {
        g.strokeStyle = 'rgba(30,30,70,.4)'; g.lineWidth = 2; g.fillStyle = `rgba(${165 + r() * 25 | 0},${170 + r() * 25 | 0},${225 + r() * 30 | 0},1)`;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + tw, y); g.quadraticCurveTo(x + tw, y + th2, x + tw / 2, y + th2); g.quadraticCurveTo(x, y + th2, x, y); g.closePath(); g.fill(); g.stroke();
      }
    }
  } else if (ch === 2) {
    // 屋根裏: 縦板の壁
    for (let x = 0; x < W; x += 110) {
      g.fillStyle = `rgba(60,40,20,${0.10 + r() * 0.1})`; g.fillRect(x, 0, 3, H);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 3, 0, 2, H);
      for (let k = 0; k < 14; k++) {
        const gx = x + 8 + r() * 94, gy = r() * H;
        g.strokeStyle = `rgba(80,55,30,${0.05 + r() * 0.07})`; g.lineWidth = 1 + r() * 1.5;
        g.beginPath(); g.moveTo(gx, gy); g.bezierCurveTo(gx + 4, gy + 40, gx - 4, gy + 80, gx + 2, gy + 130 + r() * 80); g.stroke();
      }
      for (const ny of [90, H - 90]) { g.fillStyle = 'rgba(40,25,10,.28)'; g.beginPath(); g.arc(x + 55, ny, 2.6, 0, TAU); g.fill(); }
    }
  } else {
    // こども部屋: ストライプ＋ほし柄
    for (let x = 0; x < W; x += 80) { g.fillStyle = 'rgba(190,150,110,.10)'; g.fillRect(x, 0, 40, H); }
    for (let k = 0; k < 90; k++) {
      const x = r() * W, y = r() * H, s = 5 + r() * 5;
      g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = 'rgba(210,140,90,.16)';
      g.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? s * 0.45 : s; g.lineTo(Math.cos(i * TAU / 10) * rr, Math.sin(i * TAU / 10) * rr); }
      g.closePath(); g.fill(); g.restore();
    }
  }
  // 水のしみ（上から垂れる）
  for (let k = 0; k < 9; k++) {
    const x = r() * W, y0 = r() * 200, len = 160 + r() * 420, wd = 18 + r() * 40;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, 'rgba(70,45,25,.30)'); gr.addColorStop(1, 'rgba(70,45,25,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - wd, y0); g.lineTo(x + wd, y0); g.lineTo(x + wd * 0.3, y0 + len); g.lineTo(x - wd * 0.3, y0 + len); g.closePath(); g.fill();
  }
  // ひび
  for (let k = 0; k < 7; k++) {
    let x = r() * W, y = r() * H * 0.7; g.strokeStyle = 'rgba(30,15,10,.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 9; i++) { x += (r() - 0.5) * 36; y += 14 + r() * 30; g.lineTo(x, y); if (r() < 0.25) { g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + 20 + r() * 30); g.moveTo(x, y); } }
    g.stroke();
  }
  // かべ紙のはがれ
  for (let k = 0; k < 6; k++) {
    const x = r() * W, y = r() * H * 0.8, s = 30 + r() * 60;
    g.fillStyle = 'rgba(60,40,25,.32)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.2); g.lineTo(x + s * 0.5, y + s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 0.7, y + s * 0.1); g.lineTo(x + s * 0.3, y + s * 0.5); g.closePath(); g.fill();
  }
  // しみ
  for (let k = 0; k < 14; k++) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 140;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(90,60,35,.16)'); gr.addColorStop(1, 'rgba(90,60,35,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  wallCache[ch] = c;
  return c;
}

// ---------- パーティクル ----------
const parts = [];
function emit(p) { parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, max: 1, size: 3, color: '#fff', type: 'dot', rot: 0, vr: 0, drag: 0 }, p, { max: p.life || 1 })); }
function burst(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = (o.speed || 120) * (0.4 + Math.random() * 0.8);
    emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.up || 0), g: o.g || 0, life: (o.life || 0.8) * (0.6 + Math.random() * 0.6),
      size: (o.size || 3) * (0.6 + Math.random() * 0.8), color: Array.isArray(o.colors) ? o.colors[(Math.random() * o.colors.length) | 0] : (o.color || '#fff'),
      type: o.type || 'dot', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, drag: o.drag || 0 });
  }
}
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
}
function drawParticles(ctx) {
  for (const p of parts) {
    const k = clamp(p.life / p.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = p.type === 'confetti' ? clamp(k * 3, 0, 1) : k;
    ctx.fillStyle = p.color;
    if (p.type === 'confetti') {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.rot * 1.3)) * 0.9 + 0.1);
      ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
    } else if (p.type === 'spark') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const s = p.size * (0.5 + k);
      ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.lineTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 2, 0); ctx.lineTo(s * 0.4, s * 0.4);
      ctx.lineTo(0, s * 2); ctx.lineTo(-s * 0.4, s * 0.4); ctx.lineTo(-s * 2, 0); ctx.lineTo(-s * 0.4, -s * 0.4); ctx.closePath(); ctx.fill();
    } else {
      if (p.type === 'wisp') ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.type === 'dust' ? 1.4 - k * 0.6 : 0.4 + k * 0.6), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- ほこり（空中をただよう光のつぶ） ----------
let motes = null;
function drawMotes(ctx, W, H, t) {
  if (!motes) { const r = rng(9); motes = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, s: 0.8 + r() * 2, ph: r() * TAU, sp: 6 + r() * 14 })); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    const x = (m.x + Math.sin(t * 0.3 + m.ph) * 30 + t * m.sp) % W, y = (m.y - t * m.sp * 0.7 + H * 4) % H;
    ctx.globalAlpha = 0.12 + 0.12 * Math.sin(t * 1.5 + m.ph);
    ctx.fillStyle = '#ffeab0'; ctx.beginPath(); ctx.arc(x, y, m.s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// あかりのちらつき（ときどき大きく暗くなる）
function flicker(t) {
  let k = 1 + Math.sin(t * 41) * 0.02 + Math.sin(t * 17.3) * 0.02;
  const c = (t % 7.3) / 7.3, d = (t % 3.1) / 3.1;
  if (c < 0.018) k = 0.35 + Math.abs(Math.sin(t * 90)) * 0.4;
  else if (c > 0.04 && c < 0.05) k = 0.6;
  if (d > 0.6 && d < 0.615) k *= 0.8;
  return clamp(k, 0.25, 1.06);
}

// フィルムのざらつき
let grain = null;
function drawGrain(ctx, W, H) {
  if (!grain) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), im = g.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); grain = ctx.createPattern(c, 'repeat');
  }
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22;
  ctx.translate(Math.random() * 256, Math.random() * 256); ctx.fillStyle = grain; ctx.fillRect(-256, -256, W + 512, H + 512);
  ctx.restore();
}

// ---------- キャラクターのアニメ状態 ----------
const states = new WeakMap();
function stateOf(a) {
  let s = states.get(a);
  if (!s) { s = { ph: 0, blink: 2 + Math.random() * 2, blinkT: 0, squash: 0, wasGround: a.ground, airVy: 0, step: 0, appear: 0, t: Math.random() * 10, trail: 0 }; states.set(a, s); }
  return s;
}
function updateActor(a, dt) {
  const s = stateOf(a);
  s.t += dt;
  const sp = Math.abs(a.vx);
  if (a.ground) s.ph += sp * dt * 0.075;
  s.blink -= dt; if (s.blink <= 0) { s.blinkT = 0.14; s.blink = 2 + Math.random() * 3; }
  if (s.blinkT > 0) s.blinkT -= dt;
  s.appear = Math.min(1, s.appear + dt * 3.2);
  s.squash = Math.max(0, s.squash - dt * 5);
  if (!a.ground) s.airVy = a.vy;
  if (a.ground && !s.wasGround) {
    s.squash = clamp(Math.abs(s.airVy) / 700, 0.25, 1);
    if (Math.abs(s.airVy) > 260) burst(a.x, a.y, 5, { speed: 60, up: -30, g: 160, life: 0.45, size: 2, color: a.kind === 'kage' ? '#b9a6ff' : '#e8d8b8', type: a.kind === 'kage' ? 'wisp' : 'dust' });
  }
  if (!a.ground && s.wasGround && a.vy < -200) s.squash = -0.5;
  s.wasGround = a.ground;
  if (a.ground && sp > 120) {
    s.step -= dt;
    if (s.step <= 0) { s.step = 0.14; emit({ x: a.x - a.face * 4, y: a.y - 1, vx: -a.face * 14, vy: -14, g: 0, life: 0.35, size: 1.6, color: a.kind === 'kage' ? '#b9a6ff' : '#e8d8b8', type: a.kind === 'kage' ? 'wisp' : 'dust' }); }
  }
  if (a.kind === 'kage') {
    s.trail -= dt;
    if (s.trail <= 0) { s.trail = 0.09; emit({ x: a.x + (Math.random() - 0.5) * 8, y: a.y - 6 - Math.random() * 18, vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 16, life: 0.9, size: 1.8, color: '#cdbfff', type: 'wisp' }); }
  }
}

// ---------- キャラの描画 ----------
const PAL = {
  body: { skin: '#ffe2c4', hair: '#3b2a2e', coat: '#ec7a4c', coatD: '#c95a34', scarf: '#ffd65a', scarfD: '#e0a92e', boot: '#5b3a2a', eye: '#2a1a20', cheek: 'rgba(255,130,120,.55)' },
  kage: { skin: '#5a49b8', hair: '#43348f', coat: '#5a49b8', coatD: '#46379a', scarf: '#d8ceff', scarfD: '#b8a8ff', boot: '#3a2d80', eye: '#ffffff', cheek: 'rgba(0,0,0,0)' }
};

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ================= 新しいキャラクター描画 =================
const OUT = '#2b1a1c';

function lg(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

// 輪郭つきのカプセル（うで・あし）
function limb(ctx, x1, y1, x2, y2, w, col, out) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = out; ctx.lineWidth = w + 1.0; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function limb2(ctx, p, w, col, out) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [lw, c] of [[w + 1.0, out], [w, col]]) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.stroke();
  }
}

// マフラーのしっぽ（ひらひら）
function scarfTail(ctx, k, c1, c2, glowy) {
  const { t, mv, air, bob } = k;
  const n = 5, seg = 2.1;
  const pts = [[-3.2, -18.4 - bob]];
  let ang = Math.PI - 0.75 + mv * 0.55 - (air < -0.1 ? 0.4 : 0) + (air > 0.2 ? 0.8 : 0);
  for (let i = 0; i < n; i++) {
    ang += Math.sin(t * 7.5 - i * 0.95) * (0.1 + 0.2 * mv) * (0.5 + i * 0.25) - 0.1 + mv * 0.1;
    const p = pts[pts.length - 1];
    pts.push([p[0] + Math.cos(ang) * seg, p[1] + Math.sin(ang) * seg]);
  }
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, w = 1.7 - i * 0.12;
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  ctx.save();
  if (glowy) { ctx.shadowColor = '#cfc4ff'; ctx.shadowBlur = 6; }
  ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = 0.5; ctx.strokeStyle = glowy ? 'rgba(240,235,255,.9)' : OUT; ctx.stroke();
  ctx.shadowBlur = 0;
  // しま模様
  ctx.strokeStyle = c2; ctx.lineWidth = 0.9;
  for (let i = 2; i < left.length - 1; i += 2) { ctx.beginPath(); ctx.moveTo(left[i][0], left[i][1]); ctx.lineTo(right[i][0], right[i][1]); ctx.stroke(); }
  // ふさ
  const e = pts.length - 1;
  ctx.strokeStyle = c1; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
  for (let f = -1; f <= 1; f++) {
    const ex = (left[e][0] + right[e][0]) / 2 + (left[e][0] - right[e][0]) * 0.3 * f, ey = (left[e][1] + right[e][1]) / 2 + (left[e][1] - right[e][1]) * 0.3 * f;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ang) * 1.6, ey + Math.sin(ang) * 1.6 + f * 0.2); ctx.stroke();
  }
  ctx.restore();
}

// ---------- ヒカリ（実体の子） ----------
function kidBody(ctx, o, k) {
  const { t, mv, air, ph, bob } = k;
  const swing = Math.sin(ph) * mv;
  const look = o.look || 0, bl = o.blink ? 1 : 0;
  const skin = '#f6d9c0', skinD = '#e0b79a';
  const coat1 = '#f08a52', coat2 = '#c4582f', coatD = '#9a421f';
  const tights = '#46506a', boot = '#7e4b2a;'.slice(0, 7);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // --- うしろのうで ---
  const arm = (side, front) => {
    const a = (side > 0 ? swing : -swing) * 0.95 + (air < -0.1 ? -1.2 : air > 0.2 ? -0.5 : 0) * 0.8;
    const sx = side * 4.8, sy = -18.0 - bob;
    let hx = sx + Math.sin(a) * 6.6, hy = sy + Math.cos(a * 0.6) * 5.6;
    if (o.wave && side === -1) { hx = sx - 3.0 + Math.sin(t * 6) * 1.2; hy = sy - 7.2; }
    const ex = (sx + hx) / 2 + side * 0.9, ey = (sy + hy) / 2;
    limb2(ctx, [[sx, sy], [ex, ey], [hx, hy]], 3.3, front ? coat1 : coat2, OUT);
    // そでぐち
    ctx.fillStyle = '#e7d4a0'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.ellipse(hx - (hx - ex) * 0.12, hy - (hy - ey) * 0.12, 1.9, 1.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // て
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx + (hx - ex) * 0.18, hy + (hy - ey) * 0.18 + 0.3, 1.65, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + (hx - ex) * 0.18 + 1.1, hy + (hy - ey) * 0.18 - 0.3, 0.7, 0, TAU); ctx.fill(); ctx.stroke();
  };
  arm(-1, false);

  // --- あし ---
  for (const side of [-1, 1]) {
    const p = ph + (side > 0 ? 0 : Math.PI);
    let fx = side * 2.2 + Math.sin(p) * 4.2 * mv, lift = Math.max(0, Math.cos(p)) * 3.0 * mv;
    if (air < -0.1) { fx = side * 3.6; lift = 2.6; } else if (air > 0.2) { fx = side * 2.9; lift = 1.6; }
    const hip = [side * 2.2, -10.4 - bob], knee = [(hip[0] + fx) / 2 + 0.9 + Math.max(0, Math.sin(p)) * 0.8 * mv, (hip[1] - 3.4 - lift) / 2 - 0.5], ank = [fx, -4.3 - lift];
    limb2(ctx, [hip, knee, ank], 3.7, side > 0 ? tights : '#363f56', OUT);
    // ブーツ
    const bx = fx, by = -lift;
    ctx.beginPath(); ctx.moveTo(bx - 2.4, by - 4.6); ctx.lineTo(bx + 2.1, by - 4.6); ctx.lineTo(bx + 2.2, by - 2.2);
    ctx.quadraticCurveTo(bx + 5.9, by - 2.0, bx + 5.7, by - 0.2); ctx.lineTo(bx - 2.7, by - 0.2); ctx.closePath();
    ctx.fillStyle = lg(ctx, bx, by - 4.6, bx, by, [[0, '#9a6234'], [1, '#6a3d20']]); ctx.fill();
    ctx.lineWidth = 0.55; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#2b1a1c'; ctx.fillRect(bx - 2.7, by - 0.95, 8.4, 1.0);
    ctx.fillStyle = '#ecd9a6'; ctx.fillRect(bx - 2.45, by - 5.0, 4.6, 1.35); ctx.strokeRect(bx - 2.45, by - 5.0, 4.6, 1.35);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 2.8, by - 1.9, 1.6, 0.6);
  }

  // --- フード（背中側のふくらみ） ---
  ctx.beginPath();
  ctx.moveTo(-1.4, -19.8 - bob); ctx.quadraticCurveTo(-6.6, -20.6 - bob, -6.2, -16.6 - bob); ctx.quadraticCurveTo(-3.6, -15.8 - bob, -1.8, -17.2 - bob); ctx.closePath();
  ctx.fillStyle = coat2; ctx.fill(); ctx.lineWidth = 0.55; ctx.strokeStyle = OUT; ctx.stroke();

  // --- どう（レインコート） ---
  ctx.beginPath();
  ctx.moveTo(-4.5, -19.4 - bob);
  ctx.quadraticCurveTo(-6.0, -15 - bob, -7.0, -9.2 - bob);
  ctx.quadraticCurveTo(0, -8.3 - bob, 7.0, -9.2 - bob);
  ctx.quadraticCurveTo(6.0, -15 - bob, 4.5, -19.4 - bob);
  ctx.closePath();
  ctx.fillStyle = lg(ctx, -7, 0, 7, 0, [[0, coat1], [0.55, '#e0743f'], [1, coat2]]); ctx.fill();
  ctx.lineWidth = 0.6; ctx.strokeStyle = OUT; ctx.stroke();
  // すそのライン・ベルト・ボタン・ポケット
  ctx.fillStyle = coatD; ctx.fillRect(-6.8, -10.2 - bob, 13.6, 0.9);
  ctx.fillStyle = '#4a2c1c'; ctx.fillRect(-5.4, -14.0 - bob, 10.8, 1.25);
  ctx.fillStyle = '#e8c35a'; ctx.fillRect(-0.9, -14.2 - bob, 1.8, 1.65); ctx.lineWidth = 0.3; ctx.strokeStyle = OUT; ctx.strokeRect(-0.9, -14.2 - bob, 1.8, 1.65);
  ctx.fillStyle = '#f5d77a';
  for (const by of [-17.6, -16.0, -11.7]) { ctx.beginPath(); ctx.arc(0.3, by - bob, 0.55, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(80,30,10,.55)'; ctx.lineWidth = 0.45;
  rr(ctx, -5.2, -12.6 - bob, 3.0, 2.3, 0.6); ctx.stroke(); rr(ctx, 2.4, -12.6 - bob, 3.0, 2.3, 0.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,190,.45)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-3.4, -18.4 - bob); ctx.quadraticCurveTo(-4.6, -14 - bob, -5.4, -10.6 - bob); ctx.stroke();

  // --- ランタン（こしにぶら下げた小さなあかり） ---
  {
    const sw = Math.sin(t * 2.3) * 0.12 - mv * 0.5 + (air < 0 ? 0.3 : 0);
    const ax = 4.4, ay = -13.2 - bob, lx = ax + Math.sin(sw) * 3.0, ly = ay + Math.cos(sw) * 3.0;
    ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
    const fl = 0.8 + Math.sin(t * 12) * 0.1 + Math.sin(t * 7.3) * 0.08;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(lx, ly + 1.6, 0.3, lx, ly + 1.6, 7); g.addColorStop(0, `rgba(255,214,120,${0.55 * fl})`); g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 8, ly - 6, 16, 16); ctx.restore();
    rr(ctx, lx - 1.35, ly + 0.2, 2.7, 3.2, 0.6); ctx.fillStyle = '#ffe9a8'; ctx.fill(); ctx.lineWidth = 0.45; ctx.strokeStyle = '#6a4a1c'; ctx.stroke();
    ctx.fillStyle = '#6a4a1c'; ctx.fillRect(lx - 1.6, ly - 0.2, 3.2, 0.7); ctx.fillRect(lx - 1.6, ly + 3.2, 3.2, 0.6);
  }

  arm(1, true);

  // --- マフラー（しっぽ→わ） ---
  scarfTail(ctx, k, '#e3ae3c', '#a8342c', false);

  // --- あたま ---
  const hy = -25.0 - bob;
  // うしろ髪（短く、えりあしだけ）
  ctx.beginPath();
  ctx.moveTo(-6.6, hy + 0.2); ctx.quadraticCurveTo(-7.2, hy + 4.6, -4.6, hy + 5.2); ctx.lineTo(4.6, hy + 5.2); ctx.quadraticCurveTo(7.2, hy + 4.6, 6.6, hy + 0.2); ctx.quadraticCurveTo(0, hy - 4.6, -6.6, hy + 0.2); ctx.closePath();
  ctx.fillStyle = '#2f1f22'; ctx.fill(); ctx.lineWidth = 0.55; ctx.strokeStyle = OUT; ctx.stroke();
  // 顔
  ctx.beginPath(); ctx.ellipse(0, hy + 0.7, 6.2, 5.7, 0, 0, TAU);
  const fg = ctx.createRadialGradient(-1.4, hy - 1, 0.5, 0, hy + 0.6, 7); fg.addColorStop(0, '#fbe6d0'); fg.addColorStop(1, skin);
  ctx.fillStyle = fg; ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = OUT; ctx.stroke();
  // ほお
  for (const sx of [-1, 1]) {
    const g = ctx.createRadialGradient(sx * 3.9, hy + 3.4, 0.2, sx * 3.9, hy + 3.4, 2.1); g.addColorStop(0, 'rgba(255,130,120,.28)'); g.addColorStop(1, 'rgba(255,130,120,0)');
    ctx.fillStyle = g; ctx.fillRect(sx * 3.9 - 2.2, hy + 1.2, 4.4, 4.4);
  }
  // 目
  const ey = hy + 1.9;
  for (const ex0 of [-2.6, 2.7]) {
    const ex = ex0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 1.85, 2.2 * (1 - bl * 0.92), 0, 0, TAU); ctx.fill();
    if (!bl) {
      const ix = ex + look * 0.5;
      const ig = ctx.createLinearGradient(0, ey - 2, 0, ey + 2); ig.addColorStop(0, '#6b3a1e'); ig.addColorStop(1, '#c4893f');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, ey + 0.1, 1.4, 1.85, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0e10'; ctx.beginPath(); ctx.ellipse(ix, ey + 0.1, 0.72, 1.15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ix - 0.5, ey - 0.8, 0.6, 0, TAU); ctx.arc(ix + 0.55, ey + 0.65, 0.3, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.65; ctx.beginPath();
    ctx.arc(ex, ey + 0.1, 1.95, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }
  // まゆ・鼻・口
  ctx.strokeStyle = '#2a1a1c'; ctx.lineWidth = 0.95; ctx.lineCap = 'round';
  const br = o.emote === 'scared' ? -0.6 : 0;
  ctx.beginPath(); ctx.moveTo(-4.4, ey - 3.5 + br); ctx.quadraticCurveTo(-2.8, ey - 3.5, -1.0, ey - 2.8); ctx.moveTo(1.0, ey - 2.8); ctx.quadraticCurveTo(2.8, ey - 3.5, 4.4, ey - 3.5 + br); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,90,70,.8)'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(0.1 + look * 0.2, ey + 2.2); ctx.lineTo(0.5 + look * 0.2, ey + 2.5); ctx.stroke();
  const my = hy + 5.3;
  if (o.emote === 'happy') {
    ctx.beginPath(); ctx.moveTo(-1.5 + look * 0.3, my - 0.2); ctx.quadraticCurveTo(look * 0.3, my + 2.0, 1.5 + look * 0.3, my - 0.2); ctx.closePath();
    ctx.fillStyle = '#8a2a34'; ctx.fill(); ctx.lineWidth = 0.4; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#f08a90'; ctx.beginPath(); ctx.ellipse(look * 0.3, my + 0.9, 0.7, 0.4, 0, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = '#8a4a40'; ctx.lineWidth = 0.55; ctx.beginPath();
    if (o.emote === 'scared') ctx.moveTo(-1.2 + look * 0.3, my + 0.2 + Math.sin(t * 22) * 0.25), ctx.lineTo(1.2 + look * 0.3, my + 0.2 - Math.sin(t * 22) * 0.25);
    else ctx.arc(look * 0.3, my - 0.9, 1.5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  // 前髪（短くて、ツンツン）
  ctx.beginPath();
  ctx.moveTo(-6.9, hy + 1.8); ctx.bezierCurveTo(-8.6, hy - 8.4, 8.6, hy - 8.4, 6.9, hy + 1.8);
  ctx.lineTo(5.8, hy - 1.2); ctx.lineTo(4.6, hy + 0.2); ctx.lineTo(3.4, hy - 2.4); ctx.lineTo(1.8, hy - 0.4);
  ctx.lineTo(0.2, hy - 3.0); ctx.lineTo(-1.4, hy - 0.4); ctx.lineTo(-3.0, hy - 2.6); ctx.lineTo(-4.4, hy - 0.2); ctx.lineTo(-5.8, hy - 1.6);
  ctx.closePath();
  ctx.fillStyle = lg(ctx, -6, hy - 6, 6, hy, [[0, '#5a3d38'], [1, '#2f1f22']]); ctx.fill();
  ctx.lineWidth = 0.55; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.strokeStyle = 'rgba(190,150,135,.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(-1.2, hy - 1.4, 4.4, Math.PI * 1.12, Math.PI * 1.55); ctx.stroke();
  // アホ毛
  const sw = Math.sin(t * 3.1) * 0.9 + mv * 0.8;
  ctx.strokeStyle = '#2f1f22'; ctx.lineWidth = 1.0; ctx.beginPath(); ctx.moveTo(0.6, hy - 5.2); ctx.quadraticCurveTo(1.2 + sw, hy - 8.6, 3.2 + sw * 1.4, hy - 8.4); ctx.stroke();
  ctx.lineWidth = 0.35; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(3.3 + sw * 1.4, hy - 8.0, 0.55, 0, TAU); ctx.stroke();
}

// ---------- カゲ（影の子） ----------
const STARS = [[-2.5, -14, 0], [2.4, -12, 1.3], [-0.5, -17.5, 2.1], [3.2, -16.4, 3.0], [-3.8, -11, 4.1], [0.8, -10.5, 5.2], [-1.6, -24.6, 0.6], [2.8, -22.8, 2.6]];
function kageBody(ctx, o, k) {
  const { t, mv, air, ph, bob } = k;
  const swing = Math.sin(ph) * mv;
  const look = o.look || 0, bl = o.blink ? 1 : 0;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const rim = 'rgba(224,214,255,.95)';
  ctx.shadowColor = 'rgba(176,156,255,.95)'; ctx.shadowBlur = 8;

  // うしろのうで
  const arm = (side, front) => {
    const a = (side > 0 ? swing : -swing) * 0.95 + (air < -0.1 ? -1.2 : air > 0.2 ? -0.5 : 0) * 0.8;
    const sx = side * 4.6, sy = -17.6 - bob;
    let hx = sx + Math.sin(a) * 7.2, hy = sy + Math.cos(a * 0.6) * 6;
    if (o.wave && side === -1) { hx = sx - 3.0 + Math.sin(t * 6) * 1.2; hy = sy - 7.6; }
    ctx.beginPath(); ctx.moveTo(sx - 1.4, sy - 0.4); ctx.quadraticCurveTo((sx + hx) / 2 + side * 1.4, (sy + hy) / 2 - 0.8, hx, hy); ctx.quadraticCurveTo((sx + hx) / 2 - side * 0.2, (sy + hy) / 2 + 1.6, sx + 1.4, sy + 1.4); ctx.closePath();
    ctx.fillStyle = front ? '#6552d0' : '#4a3aa8'; ctx.fill(); ctx.lineWidth = 0.5; ctx.strokeStyle = rim; ctx.stroke();
    const g = ctx.createRadialGradient(hx, hy, 0.2, hx, hy, 2.6); g.addColorStop(0, '#fff'); g.addColorStop(0.45, 'rgba(210,200,255,.9)'); g.addColorStop(1, 'rgba(210,200,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fill();
  };
  arm(-1, false);

  // すその ゆらめき（足のかわり）
  for (const side of [-1, 1]) {
    const p = ph + (side > 0 ? 0 : Math.PI);
    const fx = side * 2.4 + Math.sin(p) * 3.6 * mv + (air ? side * 1.2 : 0), lift = Math.max(0, Math.cos(p)) * 2.4 * mv + (air < -0.1 ? 2.4 : 0);
    ctx.beginPath(); ctx.moveTo(side * 0.6 - 2.1, -9 - bob); ctx.quadraticCurveTo(fx - 1, -4, fx, -0.4 - lift); ctx.quadraticCurveTo(fx + 1.4, -4, side * 0.6 + 2.1, -9 - bob); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -9, 0, 0, [[0, '#4a3aa8'], [1, 'rgba(60,45,150,0)']]); ctx.fill();
  }

  // マント状のからだ
  ctx.beginPath();
  ctx.moveTo(-4.4, -19.4 - bob);
  ctx.quadraticCurveTo(-6.0, -14 - bob, -7.4, -8.8 - bob);
  const hem = [];
  for (let i = 0; i <= 10; i++) { const x = -7.4 + i * 1.48; hem.push([x, -8.6 - bob + Math.abs(Math.sin(i * 1.9 + t * 4.2)) * 2.6 * (0.6 + 0.4 * Math.sin(i + t * 2))]); }
  for (const [x, y] of hem) ctx.lineTo(x, y);
  ctx.quadraticCurveTo(6.0, -14 - bob, 4.4, -19.4 - bob);
  ctx.closePath();
  ctx.fillStyle = lg(ctx, 0, -20, 0, -7, [[0, '#7b66e6'], [0.6, '#4d3cb4'], [1, '#2b2070']]); ctx.fill();
  ctx.lineWidth = 0.55; ctx.strokeStyle = rim; ctx.stroke();
  ctx.shadowBlur = 0;
  // 星のもよう
  for (const [sx, sy, sp] of STARS) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * Math.abs(Math.sin(t * 2 + sp))})`;
    ctx.beginPath(); ctx.arc(sx, sy - bob, 0.3 + 0.18 * Math.abs(Math.sin(t * 2 + sp)), 0, TAU); ctx.fill();
  }
  // えりまわり・ベルトのかざり
  ctx.strokeStyle = 'rgba(210,200,255,.55)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-5.2, -13.2 - bob); ctx.quadraticCurveTo(0, -12.4 - bob, 5.2, -13.2 - bob); ctx.stroke();

  arm(1, true);

  // マフラー（光るリボン）
  scarfTail(ctx, k, '#d9d0ff', '#9c8cf0', true);

  // あたま
  const hy = -24.2 - bob;
  ctx.shadowColor = 'rgba(176,156,255,.95)'; ctx.shadowBlur = 8;
  // 炎のような かみ
  for (let i = 0; i < 4; i++) {
    const bx = -4.2 + i * 2.8, tipx = bx + Math.sin(t * 4 + i * 1.7) * 1.4 + (i - 1.5) * 0.6, tipy = hy - 8.2 - (i % 2 ? 1.6 : 0) - Math.abs(Math.sin(t * 3 + i)) * 1.6 - mv * 0.6;
    ctx.beginPath(); ctx.moveTo(bx - 1.6, hy - 3.4); ctx.quadraticCurveTo(bx - 0.6, (hy + tipy) / 2 - 2, tipx, tipy); ctx.quadraticCurveTo(bx + 1.0, (hy + tipy) / 2 - 1, bx + 1.6, hy - 3.4); ctx.closePath();
    ctx.fillStyle = '#8f7df0'; ctx.fill(); ctx.lineWidth = 0.4; ctx.strokeStyle = rim; ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, hy + 0.6, 6.1, 5.9, 0, 0, TAU);
  ctx.fillStyle = lg(ctx, 0, hy - 6, 0, hy + 6, [[0, '#8c7af0'], [1, '#4d3cb4']]); ctx.fill();
  ctx.lineWidth = 0.6; ctx.strokeStyle = rim; ctx.stroke();
  ctx.shadowBlur = 0;
  // ほっぺのひかり
  for (const sx of [-1, 1]) { const g = ctx.createRadialGradient(sx * 4, hy + 3.4, 0.2, sx * 4, hy + 3.4, 2); g.addColorStop(0, 'rgba(255,170,230,.45)'); g.addColorStop(1, 'rgba(255,170,230,0)'); ctx.fillStyle = g; ctx.fillRect(sx * 4 - 2, hy + 1.4, 4, 4); }
  // 目（ひかる）
  const ey = hy + 1.5;
  for (const ex of [-2.5, 2.6]) {
    ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 1.7, 2.45 * (1 - bl * 0.92), ex < 0 ? -0.16 : 0.16, 0, TAU); ctx.fill(); ctx.restore();
    if (!bl) { ctx.fillStyle = '#32257a'; ctx.beginPath(); ctx.ellipse(ex + look * 0.5, ey + 0.2, 0.6, 1.3, 0, 0, TAU); ctx.fill(); }
  }
  // 小さな ほほえみ
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.arc(look * 0.3, hy + 3.4, 1.7, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();

  // そばを まわる小さな光
  const ox = Math.cos(t * 2.4) * 10.5, oy = -17 + Math.sin(t * 2.4) * 4.5 - 2, depth = Math.sin(t * 2.4);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const og = ctx.createRadialGradient(ox, oy, 0.2, ox, oy, 4); og.addColorStop(0, 'rgba(255,255,255,1)'); og.addColorStop(0.35, 'rgba(210,200,255,.75)'); og.addColorStop(1, 'rgba(180,160,255,0)');
  ctx.fillStyle = og; ctx.globalAlpha = depth > 0 ? 1 : 0.6; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, TAU); ctx.fill(); ctx.restore();
}

// o: { face, ph, move(0..1), air(-1..1), squash, blink(0..1 とじ), t, look(視線x), emote, wave }
function drawChar(ctx, kind, x, y, s, o) {
  const isK = kind === 'kage';
  const face = o.face || 1, t = o.t || 0, mv = clamp(o.move || 0, 0, 1), air = o.air || 0, sq = o.squash || 0, ph = o.ph || 0;
  const bob = (air ? 0 : Math.abs(Math.sin(ph)) * 1.2 * mv) + Math.sin(t * 2.2) * 0.3 * (1 - mv);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * face * (1 + sq * 0.18), s * (1 - sq * 0.2 + Math.max(0, -air) * 0.08));
  const k = { t, mv, air, ph, bob };
  if (isK) kageBody(ctx, o, k); else kidBody(ctx, o, k);
  ctx.restore();
}

// ゲーム内のキャラ描画
function drawActor(ctx, a, selected, t, ctl) {
  const s = stateOf(a);
  const k = a.kind;
  const ease = 1 - Math.pow(1 - s.appear, 3);
  ctx.save();
  if (k === 'kage' && s.appear < 1) ctx.globalAlpha = ease;
  // 影キャラの足もと光だまり
  if (k === 'kage') {
    const g = ctx.createRadialGradient(a.x, a.y - 20, 2, a.x, a.y - 20, 60);
    g.addColorStop(0, 'rgba(185,166,255,.45)'); g.addColorStop(1, 'rgba(185,166,255,0)');
    ctx.fillStyle = g; ctx.fillRect(a.x - 64, a.y - 84, 128, 128);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(a.x, a.y + 0.5, 10.5, 2.4, 0, 0, TAU); ctx.fill();
  }
  const VS = 1.7;
  const scale = VS * (k === 'kage' ? (0.6 + 0.4 * ease) : 1);
  drawChar(ctx, k, a.x, a.y, scale, {
    face: a.face, ph: s.ph, move: a.ground ? clamp(Math.abs(a.vx) / 230, 0, 1) : 0.3, air: a.ground ? 0 : clamp(a.vy / 700, -1, 1),
    squash: s.squash, blink: s.blinkT > 0 ? 1 : 0, t: s.t, look: a.face * 0.6
  });
  if (selected && !ctl) {
    const b = Math.sin(t * 5) * 2;
    ctx.fillStyle = k === 'kage' ? '#d8ceff' : '#ffb089';
    ctx.beginPath(); ctx.moveTo(a.x - 6, a.y - 62 + b); ctx.lineTo(a.x + 6, a.y - 62 + b); ctx.lineTo(a.x, a.y - 53 + b); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------- 小物 ----------
function woodGrain(ctx, x, y, w, h, th, seed) {
  const r = rng(seed);
  ctx.fillStyle = th.wood[0]; ctx.fillRect(x, y, w, h);
  const rows = Math.max(1, Math.round(h / 22));
  for (let i = 0; i < rows; i++) {
    const yy = y + (h / rows) * i;
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)'; ctx.fillRect(x, yy, w, h / rows);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x, yy, w, 1.5);
  }
  for (let k = 0; k < w / 18; k++) {
    const gx = x + r() * w, gy = y + r() * h;
    ctx.strokeStyle = `rgba(40,20,5,${0.1 + r() * 0.12})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 10 + r() * 28, gy + (r() - 0.5) * 2); ctx.stroke();
  }
  for (let px = x + 90; px < x + w - 20; px += 180 + (r() * 80 | 0)) {
    ctx.fillStyle = th.wood[2]; ctx.beginPath(); ctx.arc(px, y + h * 0.5, 1.8, 0, TAU); ctx.fill();
  }
}

function drawSolid(ctx, o, p, th) {
  const x = o.x + (p.ox || 0) - p.w / 2, y = o.y + (p.oy || 0) - p.h / 2;
  const seed = Math.round(x * 7 + y * 13 + p.w);
  if (p.w > 500 && p.h <= 60) {
    // 棚のような床
    for (let bx = x + 120; bx < x + p.w - 60; bx += 260) {
      ctx.fillStyle = th.wood[2]; ctx.beginPath(); ctx.moveTo(bx, y + p.h); ctx.lineTo(bx + 46, y + p.h); ctx.lineTo(bx, y + p.h + 56); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx, y + p.h, 46, 2);
    }
    woodGrain(ctx, x, y, p.w, p.h, th, seed);
    ctx.fillStyle = 'rgba(255,230,180,.45)'; ctx.fillRect(x, y, p.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + p.h - 4, p.w, 4);
    const g = ctx.createLinearGradient(0, y + p.h, 0, y + p.h + 26);
    g.addColorStop(0, 'rgba(30,10,30,.28)'); g.addColorStop(1, 'rgba(30,10,30,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y + p.h, p.w, 26);
  } else {
    woodGrain(ctx, x, y, p.w, p.h, th, seed);
    ctx.strokeStyle = 'rgba(40,20,5,.65)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, p.w - 2, p.h - 2);
    if (o.push) {
      ctx.strokeStyle = 'rgba(40,20,5,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + p.w - 6, y + p.h - 6); ctx.moveTo(x + p.w - 6, y + 6); ctx.lineTo(x + 6, y + p.h - 6); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,225,170,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, p.w - 8, p.h - 8);
    }
  }
}

function drawHanging(ctx, o, p, th, t) {
  const x = o.x + (p.ox || 0) - p.w / 2, y = o.y + (p.oy || 0) - p.h / 2;
  const sw = Math.sin(t * 1.3 + x) * 1.5;
  ctx.strokeStyle = 'rgba(70,48,24,.85)'; ctx.lineWidth = 3;
  for (const rx of [x + 34, x + p.w - 34]) {
    ctx.beginPath(); ctx.moveTo(rx, -10); ctx.lineTo(rx + sw * 0.3, y); ctx.stroke();
    ctx.fillStyle = '#4a3320'; ctx.beginPath(); ctx.arc(rx + sw * 0.3, y + 2, 4.5, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(x + p.w / 2, y + p.h / 2); ctx.rotate(sw * 0.0025);
  woodGrain(ctx, -p.w / 2, -p.h / 2, p.w, p.h, { wood: ['#c79a58', '#e0b878', '#8a6532'] }, Math.round(x));
  ctx.strokeStyle = 'rgba(70,45,20,.8)'; ctx.lineWidth = 2; ctx.strokeRect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, p.h - 2);
  ctx.restore();
}

function drawObjects(ctx, w, th, t) {
  for (const o of w.objects) for (const p of o.parts) {
    if (o.solid === false) { if (o.cast !== false) drawHanging(ctx, o, p, th, t); continue; }
    drawSolid(ctx, o, p, th);
  }
}

// とびら・橋
function drawDoor(ctx, d, th, t) {
  const solid = d.invert ? d.open : !d.open;
  if (!solid) {
    ctx.save(); ctx.strokeStyle = d.invert ? 'rgba(255,255,255,.4)' : 'rgba(123,227,160,.55)'; ctx.setLineDash([6, 7]); ctx.lineWidth = 2;
    ctx.lineDashOffset = -t * 20; ctx.strokeRect(d.x, d.y, d.w, d.h); ctx.restore();
    return;
  }
  if (d.invert) {
    // 橋の板
    for (let bx = d.x; bx < d.x + d.w; bx += 24) {
      woodGrain(ctx, bx, d.y, Math.min(24, d.x + d.w - bx) - 1.5, d.h + 8, { wood: ['#c89a56', '#e6c07c', '#8a6532'] }, bx);
    }
    ctx.fillStyle = 'rgba(255,230,160,.5)'; ctx.fillRect(d.x, d.y, d.w, 2);
    const g = ctx.createLinearGradient(0, d.y + d.h, 0, d.y + d.h + 22); g.addColorStop(0, 'rgba(40,20,40,.3)'); g.addColorStop(1, 'rgba(40,20,40,0)');
    ctx.fillStyle = g; ctx.fillRect(d.x, d.y + d.h + 8, d.w, 20);
  } else {
    woodGrain(ctx, d.x - 5, d.y, d.w + 10, d.h, { wood: ['#7a4a22', '#9a6a38', '#4a2a10'] }, d.x + d.y);
    ctx.strokeStyle = 'rgba(30,14,4,.75)'; ctx.lineWidth = 2; ctx.strokeRect(d.x - 4, d.y + 1, d.w + 8, d.h - 2);
    // かぎ穴ランプ
    const gl = 0.55 + 0.25 * Math.sin(t * 3);
    const cx = d.x + d.w / 2, cy = d.y + d.h * 0.5;
    const gr = ctx.createRadialGradient(cx, cy, 1, cx, cy, 20); gr.addColorStop(0, `rgba(185,166,255,${gl})`); gr.addColorStop(1, 'rgba(185,166,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(cx - 22, cy - 22, 44, 44);
    ctx.fillStyle = '#d8ceff'; ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, TAU); ctx.fill(); ctx.fillRect(cx - 1, cy, 2, 7);
  }
}

// スイッチ（石のプレート）
function drawSwitch(ctx, s, t) {
  const down = s.pressed;
  const x = s.x - s.w / 2, y = s.y;
  const glowCol = down ? '123,227,160' : '185,166,255';
  const gr = ctx.createRadialGradient(s.x, y - 4, 2, s.x, y - 4, 52);
  gr.addColorStop(0, `rgba(${glowCol},${down ? 0.5 : 0.28 + 0.12 * Math.sin(t * 3)})`); gr.addColorStop(1, `rgba(${glowCol},0)`);
  ctx.fillStyle = gr; ctx.fillRect(s.x - 56, y - 60, 112, 70);
  ctx.fillStyle = '#4a4468'; rr(ctx, x - 5, y - 1, s.w + 10, 6, 2); ctx.fill();
  ctx.fillStyle = down ? '#7be3a0' : '#c1b4ff'; rr(ctx, x, y - (down ? 3 : 9), s.w, down ? 3 : 8, 2.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x + 4, y - (down ? 3 : 9), s.w - 8, 1.5);
  if (s.latch) { ctx.fillStyle = down ? '#7be3a0' : 'rgba(193,180,255,.9)'; ctx.beginPath(); ctx.arc(s.x, y - 20 - Math.sin(t * 3) * 1.4, 3.6, 0, TAU); ctx.fill(); }
  else { ctx.strokeStyle = down ? '#7be3a0' : 'rgba(193,180,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, y - 20, 4.6, 0, TAU); ctx.stroke(); }
}

// 出口
function drawExit(ctx, e, t) {
  const cx = e.x + e.w / 2;
  const g = ctx.createRadialGradient(cx, e.y + e.h, 4, cx, e.y + e.h * 0.55, e.h * 1.5);
  g.addColorStop(0, 'rgba(255,238,170,.42)'); g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(e.x - 120, e.y - 100, e.w + 240, e.h + 180);
  // 光のすじ
  ctx.translate(cx, e.y + e.h * 0.55);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.28 + Math.sin(t * 0.7 + i) * 0.04;
    const gr = ctx.createLinearGradient(0, 0, Math.cos(a) * 160, Math.sin(a) * 160);
    gr.addColorStop(0, 'rgba(255,240,180,.10)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.05) * 160, Math.sin(a - 0.05) * 160); ctx.lineTo(Math.cos(a + 0.05) * 160, Math.sin(a + 0.05) * 160); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // 扉のわく
  ctx.fillStyle = '#7a4a22';
  ctx.beginPath(); ctx.moveTo(e.x - 4, e.y + e.h); ctx.lineTo(e.x - 4, e.y + 24); ctx.quadraticCurveTo(cx, e.y - 22, e.x + e.w + 4, e.y + 24); ctx.lineTo(e.x + e.w + 4, e.y + e.h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,248,214,${0.92 + Math.sin(t * 3) * 0.06})`;
  ctx.beginPath(); ctx.moveTo(e.x + 4, e.y + e.h); ctx.lineTo(e.x + 4, e.y + 26); ctx.quadraticCurveTo(cx, e.y - 12, e.x + e.w - 4, e.y + 26); ctx.lineTo(e.x + e.w - 4, e.y + e.h); ctx.closePath(); ctx.fill();
  if (Math.random() < 0.05) emit({ x: e.x + 6 + Math.random() * (e.w - 12), y: e.y + e.h - 4, vx: (Math.random() - 0.5) * 8, vy: -30 - Math.random() * 30, life: 1.2, size: 1.6, color: '#fff3b0', type: 'spark' });
}

// ランプ（天井からぶら下がる）
function drawLamp(ctx, q, on, selected, o) {
  const [x, y, z] = q;
  const fl = on ? flicker(performance.now() / 1000 + x * 0.01) : 1;
  const sc = clamp(1.25 - (z - 190) / 900, 0.7, 1.2);
  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.55;
  ctx.strokeStyle = 'rgba(40,28,20,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, y - 22 * sc); ctx.stroke();
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 120 * sc);
  glow.addColorStop(0, on ? `rgba(255,226,150,${0.36 * fl})` : 'rgba(255,236,160,.08)'); glow.addColorStop(1, 'rgba(255,236,160,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = glow; ctx.fillRect(x - 130 * sc, y - 130 * sc, 260 * sc, 260 * sc); ctx.restore();
  ctx.fillStyle = '#6a4a2a'; rr(ctx, x - 7 * sc, y - 24 * sc, 14 * sc, 8 * sc, 2); ctx.fill();
  ctx.fillStyle = '#b88a4a'; ctx.fillRect(x - 5 * sc, y - 17 * sc, 10 * sc, 3 * sc);
  const bg = ctx.createRadialGradient(x - 3 * sc, y - 3 * sc, 1, x, y, 14 * sc);
  bg.addColorStop(0, on ? '#fffbe0' : '#d8d0b0'); bg.addColorStop(1, on ? '#ffc94a' : '#8a8260');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, 12 * sc, 0, TAU); ctx.fill();
  ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,.35)'; ctx.lineWidth = selected ? 3 : 1.5;
  ctx.beginPath(); ctx.arc(x, y, 16 * sc, 0, TAU); ctx.stroke();
  if (o && o.blink) {
    const cyc = o.blink.on + o.blink.off, ph = (o.t + (o.blink.phase || 0)) % cyc;
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    if (ph < o.blink.on) { ctx.strokeStyle = '#7be3a0'; ctx.beginPath(); ctx.arc(x, y, 22 * sc, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - ph / o.blink.on)); ctx.stroke(); }
    else { ctx.strokeStyle = 'rgba(255,120,120,.8)'; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.arc(x, y, 22 * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }
  if (selected) {
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x + 28, y); ctx.moveTo(x, y - 28); ctx.lineTo(x, y + 28); ctx.stroke();
  }
  ctx.restore();
}

// 影のへや（墨のたまり）
function drawInk(ctx, r, t) {
  ctx.save();
  const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  g.addColorStop(0, 'rgba(120,100,220,.18)'); g.addColorStop(1, 'rgba(120,100,220,.04)');
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(176,156,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([2, 9]); ctx.lineCap = 'round'; ctx.lineDashOffset = -t * 6;
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.setLineDash([]);
  for (let i = 0; i < 6; i++) {
    const px = r.x + ((i * 53 + t * 8) % r.w), py = r.y + r.h - ((i * 37 + t * 12) % r.h);
    ctx.fillStyle = `rgba(190,170,255,${0.18 + 0.12 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// 小さな顔アイコン（ヒント欄など）
function drawFace(ctx, kind, cx, cy, size, t, emote) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, size, 0, TAU); ctx.clip();
  ctx.fillStyle = kind === 'kage' ? '#2d2360' : '#ffe9c4'; ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  drawChar(ctx, kind, cx, cy + size * 1.55, size / 7.6, { face: 1, t, move: 0, blink: (Math.sin(t * 1.3) > 0.97) ? 1 : 0, emote });
  ctx.restore();
  ctx.strokeStyle = kind === 'kage' ? '#b9a6ff' : '#ec7a4c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, size, 0, TAU); ctx.stroke();
}

const Art = {
  flicker, drawGrain,
  TAU, clamp, lerp, THEMES, themeOf, wallPattern, rr,
  emit, burst, updateParticles, drawParticles, drawMotes,
  updateActor, drawActor, drawChar, stateOf,
  drawObjects, drawDoor, drawSwitch, drawExit, drawLamp, drawInk, drawFace, woodGrain
};
root.Art = Art;
})(window);
