'use strict';
// ===== グラフィック（画像ファイルなし。すべてコードで描くベクター絵） =====
function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(c, t, k) { const a = hex(c); return `rgb(${a.map((v, i) => Math.round(v + (t[i] - v) * k)).join(',')})`; }
const lighten = (c, k) => mix(c, [255, 255, 255], k), darken = (c, k) => mix(c, [0, 0, 0], k);
const rgba = (c, a) => { const x = hex(c); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; };

const haloCache = {};
function halo(col, r) {   // 色つきのやわらかい光
  const k = col + r; if (haloCache[k]) return haloCache[k];
  const c = document.createElement('canvas'); c.width = c.height = r * 2;
  const g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, rgba(col, 0.55)); gr.addColorStop(0.5, rgba(col, 0.18)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  return haloCache[k] = c;
}

// ===== 敵弾スプライト =====
function sprite(type, col) {
  const key = type + col; if (spriteCache[key]) return spriteCache[key];
  const r = BT[type].r, w = type === 'rice' ? Math.ceil(r * 3.4 + 10) : Math.ceil((r + 5) * 2), h = type === 'rice' ? Math.ceil(r * 2 + 10) : w;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), cx = w / 2, cy = h / 2;
  const hr = Math.max(w, h) / 2, hg = g.createRadialGradient(cx, cy, 0, cx, cy, hr);
  hg.addColorStop(0, rgba(col, 0.5)); hg.addColorStop(0.6, rgba(col, 0.2)); hg.addColorStop(1, rgba(col, 0));
  g.fillStyle = hg; g.fillRect(0, 0, w, h);
  if (type === 'rice') {
    const L = r * 1.7;
    const gr = g.createLinearGradient(0, cy - r * 0.8, 0, cy + r * 0.8);
    gr.addColorStop(0, col); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, col);
    g.fillStyle = gr; g.beginPath(); g.roundRect(cx - L, cy - r * 0.8, L * 2, r * 1.6, r * 0.8); g.fill();
    g.strokeStyle = rgba('#000', 0.35); g.lineWidth = 0.8; g.stroke();
  } else if (type === 'big') {
    g.fillStyle = rgba(col, 0.35); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.strokeStyle = col; g.lineWidth = 2.6; g.stroke();
    const gr = g.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx, cy, r * 0.7);
    gr.addColorStop(0, '#fff'); gr.addColorStop(1, rgba(col, 0.2));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.62, 0, 7); g.fill();
  } else if (type === 'small') {
    g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy - r - 1); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r + 1); g.lineTo(cx - r, cy); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 7); g.fill();
  } else {
    g.fillStyle = darken(col, 0.35); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    const gr = g.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 0, cx, cy, r);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, lighten(col, 0.45)); gr.addColorStop(1, col);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.92, 0, 7); g.fill();
    g.strokeStyle = rgba('#fff', 0.7); g.lineWidth = 0.9; g.stroke();
  }
  return spriteCache[key] = c;
}

// ===== 爆発エフェクト =====
const FX = [];
function boom(x, y, r, col) {
  FX.push({ x, y, r: 4, vr: r / 14, l: 18, ml: 18, col, w: 4 });
  FX.push({ x, y, r: 2, vr: r / 24, l: 26, ml: 26, col: '#fff', w: 2 });
  spark(x, y, Math.min(40, Math.round(r / 2)), col, 3 + r / 20, 30);
}
function updateFX() { for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.r += f.vr; if (--f.l <= 0) FX.splice(i, 1); } }
function drawFX() {
  ctx.globalCompositeOperation = 'lighter';
  for (const f of FX) {
    const a = f.l / f.ml; ctx.strokeStyle = rgba(f.col, a); ctx.lineWidth = f.w * a + 0.5;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke();
    if (f.w === 4) { const h = halo(f.col, 64); const s = f.r / 40 + 0.4; ctx.globalAlpha = a * 0.8; ctx.drawImage(h, f.x - 64 * s, f.y - 64 * s, 128 * s, 128 * s); ctx.globalAlpha = 1; }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ===== 背景（ステージごとのテーマ） =====
const BG_THEMES = [
  { name: '星降る夜空', top: '#040818', bot: '#101a40', blobs: ['#2a3fbf', '#7a2fb0'], kind: 'stars' },
  { name: '氷晶の回廊', top: '#03121c', bot: '#0b3042', blobs: ['#2ab0c0', '#4a7fe0'], kind: 'snow' },
  { name: '翠の樹海',   top: '#02100a', bot: '#0a2a18', blobs: ['#2fbf5a', '#a0d030'], kind: 'fireflies' },
  { name: '紫紺の雷雲', top: '#0a0518', bot: '#241046', blobs: ['#7a3fd0', '#d03fa0'], kind: 'storm' },
  { name: '深淵',       top: '#100202', bot: '#2c0808', blobs: ['#c01818', '#601060'], kind: 'vortex' },
];
BG_THEMES.push(
  { name: '黄金の砂漠', top: '#140c02', bot: '#3a2208', blobs: ['#e0a030', '#c05020'], kind: 'sand' },
  { name: '機械の要塞', top: '#05080e', bot: '#13202c', blobs: ['#3a8fc0', '#2050a0'], kind: 'grid' },
  { name: '星海の果て', top: '#02000a', bot: '#10062a', blobs: ['#ff66cc', '#6688ff'], kind: 'galaxy' },
  { name: '灼熱の火山', top: '#1a0500', bot: '#3a0e04', blobs: ['#ff7a1a', '#ff3010'], kind: 'vortex' },
  { name: '時の回廊',   top: '#01060f', bot: '#06203a', blobs: ['#6ff0ff', '#6a8cff'], kind: 'galaxy', hue: 175 },
  { name: '桜花の庭',   top: '#1a0614', bot: '#3a1030', blobs: ['#ff8ab8', '#c050a0'], kind: 'petals' },
  { name: '深海の神殿', top: '#00060f', bot: '#032038', blobs: ['#1c8fc0', '#3060d0'], kind: 'bubbles' },
  { name: '天空の城',   top: '#10203a', bot: '#2a4a78', blobs: ['#bfe0ff', '#ffffff'], kind: 'sand' },
  { name: '骸骨の墓所', top: '#06080a', bot: '#14201a', blobs: ['#5a9a6a', '#7a5a9a'], kind: 'fireflies' },
  { name: '終焉の玉座', top: '#050508', bot: '#1a1018', blobs: ['#d8d8ff', '#a02030'], kind: 'vortex' },
);
const BGP = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), ph: Math.random() * 6.28 }));
let flashBG = 0;
function blob(x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function drawBG(idx) {
  const th = BG_THEMES[idx] || BG_THEMES[0], t = ui.tick;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  blob(120 + Math.sin(t * 0.004) * 60, 180 + Math.cos(t * 0.003) * 40, 260, th.blobs[0], 0.28);
  blob(380 + Math.cos(t * 0.005) * 50, 480 + Math.sin(t * 0.004) * 60, 280, th.blobs[1], 0.22);
  switch (th.kind) {
    case 'stars':
      for (const p of BGP) {
        p.y += 0.3 + p.s * 2.4; if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
        const a = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.03 + p.ph));
        ctx.fillStyle = `rgba(210,225,255,${a})`; ctx.fillRect(p.x, p.y, p.s > 0.7 ? 2 : 1.2, 1.5 + p.s * 5);
      }
      if (t % 500 < 18) { const k = (t % 500) / 18; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60 + k * 220, 40 + k * 130); ctx.lineTo(10 + k * 220, k * 130); ctx.stroke(); }
      break;
    case 'snow':
      for (const p of BGP) {
        p.y += 0.5 + p.s * 1.4; p.x += Math.sin(t * 0.02 + p.ph) * 0.4; if (p.y > H) { p.y = -6; p.x = Math.random() * W; }
        ctx.fillStyle = `rgba(220,245,255,${0.35 + p.s * 0.5})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1 + p.s * 2.2, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,220,240,0.07)';
      for (let i = 0; i < 5; i++) { const y = ((t * 0.6 + i * 170) % (H + 160)) - 80, x = 40 + i * 100; ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.lineTo(x + 24, y); ctx.lineTo(x, y + 60); ctx.lineTo(x - 24, y); ctx.closePath(); ctx.fill(); }
      break;
    case 'fireflies':
      for (let i = 0; i < 3; i++) { const x = 90 + i * 150 + Math.sin(t * 0.006 + i) * 30, sg = ctx.createLinearGradient(x - 30, 0, x + 30, 0); sg.addColorStop(0, 'rgba(160,255,140,0)'); sg.addColorStop(0.5, 'rgba(160,255,140,0.07)'); sg.addColorStop(1, 'rgba(160,255,140,0)'); ctx.fillStyle = sg; ctx.fillRect(x - 30, 0, 60, H); }
      for (const p of BGP.slice(0, 40)) {
        p.x += Math.sin(t * 0.01 + p.ph) * 0.5; p.y -= 0.2 + p.s * 0.5; if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.04 + p.ph)), h = halo('#cf6', 12);
        ctx.globalAlpha = a; ctx.drawImage(h, p.x - 12, p.y - 12); ctx.globalAlpha = 1;
      }
      break;
    case 'storm':
      for (let i = 0; i < 4; i++) { const y = ((t * 0.5 + i * 220) % (H + 300)) - 150; blob(100 + i * 110, y, 170, '#1a0a38', 0.55); }
      ctx.strokeStyle = 'rgba(190,170,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const p of BGP) { p.y += 9 + p.s * 6; p.x -= 2; if (p.y > H) { p.y = -20; p.x = Math.random() * (W + 80); } ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y - 14); }
      ctx.stroke();
      if (t % 300 === 0 && Math.random() < 0.6) flashBG = 1;
      if (flashBG > 0) { ctx.fillStyle = `rgba(210,190,255,${flashBG * 0.28})`; ctx.fillRect(0, 0, W, H); flashBG -= 0.06; }
      break;
    case 'sand':
      for (const p of BGP) { p.x += 3 + p.s * 5; p.y += 0.8 + p.s; if (p.x > W + 20) { p.x = -20; p.y = Math.random() * H; } if (p.y > H) p.y = -4; ctx.strokeStyle = `rgba(255,220,150,${0.15 + p.s * 0.3})`; ctx.lineWidth = 1 + p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 10 - p.s * 14, p.y - 2); ctx.stroke(); }
      blob(W / 2 + Math.sin(t * 0.003) * 100, 120, 200, '#ffd080', 0.10);
      break;
    case 'grid':
      ctx.strokeStyle = 'rgba(80,190,255,0.14)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60, H); }
      for (let i = 0; i < 14; i++) { const y = ((t * 1.2 + i * 60) % (H + 60)) - 30; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      for (const p of BGP.slice(0, 30)) { p.y += 1.5 + p.s * 3; if (p.y > H) { p.y = -4; p.x = Math.floor(Math.random() * 9) * 60; } ctx.fillStyle = `rgba(140,230,255,${0.4 + p.s * 0.5})`; ctx.fillRect(p.x - 1, p.y, 2, 10 + p.s * 14); }
      break;
    case 'galaxy':
      for (const p of BGP) { const a = p.ph + t * 0.003 * (1.3 - p.s) + p.s * 5, r = 30 + p.s * 270, x = W / 2 + Math.cos(a) * r, y = 260 + Math.sin(a) * r * 0.62; ctx.fillStyle = `hsla(${(th.hue || 280) + p.s * 70},90%,${65 + p.s * 20}%,${0.35 + 0.5 * Math.abs(Math.sin(t * 0.03 + p.ph))})`; ctx.fillRect(x, y, 2, 2); }
      blob(W / 2, 260, 130, '#ffb0ff', 0.22);
      if (t % 420 < 28) { const k = (t % 420) / 28; ctx.strokeStyle = `rgba(255,200,255,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W - k * 300, 60 + k * 200); ctx.lineTo(W - k * 300 + 40, 60 + k * 200 - 22); ctx.stroke(); }
      break;
    case 'petals':
      for (const p of BGP) {
        p.y += 0.8 + p.s * 1.6; p.x += Math.sin(t * 0.02 + p.ph) * 0.9 + 0.4; if (p.y > H + 8) { p.y = -8; p.x = Math.random() * W; } if (p.x > W + 8) p.x = -8;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * 0.03 + p.ph); ctx.fillStyle = `rgba(255,190,215,${0.45 + p.s * 0.4})`; ctx.beginPath(); ctx.ellipse(0, 0, 3 + p.s * 3, 1.6 + p.s * 1.6, 0, 0, 7); ctx.fill(); ctx.restore();
      }
      break;
    case 'bubbles':
      for (let i = 0; i < 3; i++) { const x = 70 + i * 170 + Math.sin(t * 0.005 + i) * 30, sg = ctx.createLinearGradient(x - 40, 0, x + 40, 0); sg.addColorStop(0, 'rgba(120,200,255,0)'); sg.addColorStop(0.5, 'rgba(120,200,255,0.06)'); sg.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = sg; ctx.fillRect(x - 40, 0, 80, H); }
      for (const p of BGP) {
        p.y -= 0.6 + p.s * 1.5; p.x += Math.sin(t * 0.03 + p.ph) * 0.4; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.strokeStyle = `rgba(180,240,255,${0.2 + p.s * 0.3})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 2 + p.s * 6, 0, 7); ctx.stroke();
      }
      break;
    case 'vortex':
      for (let i = 0; i < 6; i++) { const rr = (t * 0.7 + i * 70) % 420, a = 1 - rr / 420; ctx.strokeStyle = `rgba(255,60,50,${a * 0.28})`; ctx.lineWidth = 2 + a * 4; ctx.beginPath(); ctx.ellipse(W / 2, 300, rr * 0.9, rr * 0.7, t * 0.002, 0, 7); ctx.stroke(); }
      for (const p of BGP) { p.y -= 0.5 + p.s * 1.5; p.x += Math.sin(t * 0.02 + p.ph) * 0.3; if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; } ctx.fillStyle = `rgba(255,${120 + p.s * 100 | 0},60,${0.3 + p.s * 0.5})`; ctx.fillRect(p.x, p.y, 2, 2); }
      break;
  }
}

// ===== 機体 =====
function drawShipBody(id, t, slow) {
  const S = SHIPS.find(s => s.id === id) || SHIPS[0], c = S.col, fl = 9 + Math.sin(t * 0.7) * 3 - (slow ? 3 : 0);
  const flame = (x, w, len, col) => { const fg = ctx.createLinearGradient(0, 8, 0, 8 + len * 2); fg.addColorStop(0, '#fff'); fg.addColorStop(0.4, col); fg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(x - w, 8); ctx.lineTo(x + w, 8); ctx.lineTo(x, 8 + len * 2); ctx.closePath(); ctx.fill(); };
  const bodyG = () => { const g = ctx.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, darken(c, 0.4)); g.addColorStop(0.5, lighten(c, 0.8)); g.addColorStop(1, darken(c, 0.4)); return g; };
  const pg = (pts, fill) => { ln(pts, true); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const canopy = (y, rx, ry) => { ctx.fillStyle = '#18407a'; ctx.beginPath(); ctx.ellipse(0, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#8ff'; ctx.beginPath(); ctx.ellipse(0, y - 1, rx * 0.45, ry * 0.55, 0, 0, 7); ctx.fill(); };
  ctx.lineWidth = 1; ctx.strokeStyle = lighten(c, 0.6);
  switch (id) {
    case 'falcon':
      flame(-4, 2.5, fl, '#7fe'); flame(4, 2.5, fl, '#7fe');
      for (const s of [-1, 1]) pg([[s * 3, -8], [s * 22, 14], [s * 18, 18], [s * 3, 6]], darken(c, 0.45));
      pg([[0, -24], [3.5, -6], [3.5, 12], [0, 9], [-3.5, 12], [-3.5, -6]], bodyG()); canopy(-6, 1.8, 5); break;
    case 'guardian':
      flame(-7, 3, fl, '#8f9'); flame(7, 3, fl, '#8f9');
      for (const s of [-1, 1]) { pg([[s * 13, -10], [s * 19, -8], [s * 19, 12], [s * 13, 12]], darken(c, 0.4)); ctx.fillStyle = '#fd6'; ctx.fillRect(s * 16 - 1, -14, 2, 5); }
      pg([[-7, -14], [7, -14], [12, -2], [10, 12], [-10, 12], [-12, -2]], bodyG());
      ctx.strokeStyle = rgba('#000', 0.35); ln([[-9, 2], [9, 2]]); ctx.stroke(); ctx.strokeStyle = lighten(c, 0.6); canopy(-5, 3, 4.5); break;
    case 'lancer':
      flame(0, 3, fl, '#fae');
      for (const s of [-1, 1]) { pg([[s * 4, 0], [s * 13, 15], [s * 5, 13]], darken(c, 0.4)); pg([[s * 3, -10], [s * 9, -2], [s * 4, 0]], darken(c, 0.2)); }
      pg([[0, -28], [4, -6], [3, 12], [0, 8], [-3, 12], [-4, -6]], bodyG());
      { const h = halo('#fff', 12); ctx.drawImage(h, -12, -38); } canopy(-4, 1.6, 4.5); break;
    case 'tempest':
      flame(-3, 2.5, fl, '#ff8'); flame(3, 2.5, fl, '#ff8');
      for (const s of [-1, 1]) { pg([[s * 3, -12], [s * 20, -16], [s * 14, 2], [s * 4, 6]], darken(c, 0.4)); pg([[s * 4, 4], [s * 17, 18], [s * 5, 13]], darken(c, 0.25)); }
      pg([[0, -20], [5, -4], [4, 12], [0, 8], [-4, 12], [-5, -4]], bodyG());
      ctx.fillStyle = '#fff'; ln([[1, -2], [-3, 4], [0, 4], [-2, 10], [3, 2], [0, 2]], true); ctx.fill(); break;
    case 'phoenix':
      flame(0, 5, fl * 1.3, '#fa5');
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 3, -4); ctx.bezierCurveTo(s * 14, -20, s * 28, -8, s * 23, 15); ctx.bezierCurveTo(s * 19, 7, s * 11, 9, s * 4, 6); ctx.closePath();
        const g = ctx.createLinearGradient(0, -14, 0, 15); g.addColorStop(0, '#ffd070'); g.addColorStop(1, '#e33'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      }
      pg([[0, -20], [4.5, -2], [4, 11], [0, 8], [-4, 11], [-4.5, -2]], bodyG()); canopy(-5, 1.8, 4.5); break;
    case 'void': {
      const h = halo(c, 36); ctx.drawImage(h, -36, -36);
      for (const s of [-1, 1]) pg([[s * 5, -2], [s * 16, 10], [s * 5, 6]], '#2a1850');
      pg([[0, -22], [6, -2], [5, 10], [0, 6], [-5, 10], [-6, -2]], '#1a1030');
      ctx.save(); ctx.rotate(t * 0.05); ctx.strokeStyle = rgba(c, 0.7); ctx.beginPath(); ctx.ellipse(0, 0, 17, 6, 0, 0, 7); ctx.stroke(); ctx.restore();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -6, 2.2, 0, 7); ctx.fill(); flame(0, 3, fl, '#c8f'); break;
    }
    case 'comet': {
      flame(0, 3.5, fl * 1.6, '#9ef');
      for (const s of [-1, 1]) { pg([[s * 5, 2], [s * 14, 16], [s * 6, 12]], darken(c, 0.4)); ctx.strokeStyle = rgba('#fff', 0.5); ln([[s * 9, 8], [s * 9, 30 + Math.sin(t * 0.5) * 4]]); ctx.stroke(); ctx.strokeStyle = lighten(c, 0.6); }
      pg([[0, -23], [7, 0], [5, 12], [0, 16], [-5, 12], [-7, 0]], bodyG()); canopy(-6, 2, 5); break;
    }
    case 'sage': {
      flame(0, 3, fl, '#bf8');
      pg([[0, -19], [11, 0], [0, 17], [-11, 0]], bodyG());
      ctx.fillStyle = '#1b3a1a'; pg([[0, -9], [5, 0], [0, 9], [-5, 0]], '#1b3a1a'); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) { const a = t * 0.06 + i * 2.094, x = Math.cos(a) * 18, y = Math.sin(a) * 9; const h = halo('#bf8', 10); ctx.drawImage(h, x - 10, y - 10); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
      break;
    }
    case 'merchant': {
      flame(-6, 3, fl, '#fd8'); flame(6, 3, fl, '#fd8');
      for (const s of [-1, 1]) pg([[s * 10, -2], [s * 17, 10], [s * 11, 13]], darken(c, 0.45));
      pg([[-9, -13], [9, -13], [11, 10], [-11, 10]], bodyG());
      ctx.fillStyle = '#7a5208'; ctx.fillRect(-9, -3, 18, 2); ctx.fillStyle = '#ffe070'; ctx.strokeStyle = '#a87010'; ctx.beginPath(); ctx.arc(0, 2, 4.4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#18407a'; ctx.beginPath(); ctx.ellipse(0, -8, 4, 2.4, 0, 0, 7); ctx.fill(); break;
    }
    case 'reaper': {
      flame(0, 3, fl, '#f68');
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 3, -2); ctx.bezierCurveTo(s * 20, -14, s * 28, 2, s * 14, 20); ctx.bezierCurveTo(s * 17, 4, s * 9, 4, s * 4, 4); ctx.closePath();
        const g = ctx.createLinearGradient(0, -10, 0, 20); g.addColorStop(0, '#ff9aa8'); g.addColorStop(1, '#8a1030'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      }
      pg([[0, -20], [4.5, -3], [4, 11], [0, 8], [-4, 11], [-4.5, -3]], '#2a0a18'); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -6, 2, 0, 7); ctx.fill(); break;
    }
    case 'aegis': {
      flame(-6, 3, fl, '#9cf'); flame(6, 3, fl, '#9cf');
      const hh = halo('#7af', 34); { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.7; ctx.drawImage(hh, -34, -34); ctx.globalAlpha = ga; }
      for (const s of [-1, 1]) pg([[s * 11, -8], [s * 18, -2], [s * 17, 10], [s * 12, 10]], darken(c, 0.4));
      pg([[0, -19], [13, -11], [13, 6], [0, 18], [-13, 6], [-13, -11]], bodyG());
      ctx.strokeStyle = rgba('#fff', 0.7); ln([[0, -10], [0, 8]]); ctx.stroke(); ln([[-6, -1], [6, -1]]); ctx.stroke(); ctx.strokeStyle = lighten(c, 0.6); break;
    }
    case 'seraph': {
      flame(0, 4, fl, '#ffd');
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(s * 3, -6 + k * 5); ctx.bezierCurveTo(s * (14 + k * 4), -16 + k * 6, s * (26 - k * 2), -4 + k * 7, s * (20 - k * 2), 10 + k * 5); ctx.bezierCurveTo(s * 14, 4 + k * 4, s * 8, 2 + k * 4, s * 4, 2 + k * 4); ctx.closePath();
        ctx.fillStyle = k === 0 ? '#fff6c0' : k === 1 ? '#ffe9a0' : '#ffd070'; const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.9; ctx.fill(); ctx.globalAlpha = ga; ctx.stroke();
      }
      pg([[0, -19], [4.5, -2], [4, 12], [0, 9], [-4, 12], [-4.5, -2]], bodyG()); canopy(-5, 1.8, 4.5);
      ctx.strokeStyle = rgba('#ffe070', 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, -24 + Math.sin(t * 0.1) * 1.2, 7, 2.4, 0, 0, 7); ctx.stroke(); break;
    }
    default: // alpha
      flame(0, 4, fl, '#7df');
      for (const s of [-1, 1]) { pg([[s * 3, -4], [s * 17, 12], [s * 13, 15], [s * 5, 9]], '#1c5a9a'); ctx.fillStyle = '#f8c'; ctx.beginPath(); ctx.arc(s * 15, 13, 1.6, 0, 7); ctx.fill(); }
      pg([[0, -19], [5.5, -2], [4.5, 12], [0, 9], [-4.5, 12], [-5.5, -2]], bodyG()); canopy(-4, 2.2, 4.5);
  }
}
function drawShipAt(id, x, y, s, t) {
  const S = SHIPS.find(q => q.id === id) || SHIPS[0];
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const hg = halo(S.col, 40); ctx.drawImage(hg, -40, -40); drawShipBody(id, t, false); ctx.restore();
}
function drawPlayer() {
  const t = ui.tick, blink = P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0, S = run.ship || SHIPS[0];
  ctx.save(); ctx.translate(P.x, P.y);
  ctx.globalAlpha = blink ? 0.4 : 1;
  const hg = halo(S.col, 40); ctx.drawImage(hg, -40, -40);
  drawShipBody(S.id, t, P.slow);
  ctx.globalAlpha = 1;
  if (P.inv > 0) { ctx.strokeStyle = `rgba(130,230,255,${0.3 + 0.3 * Math.sin(t * 0.4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.stroke(); }
  if (P.slow) { ctx.save(); ctx.rotate(t * 0.03); ctx.strokeStyle = 'rgba(140,210,255,0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, st.graze, 0, 7); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#f33'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0, 0, st.hit + 0.6, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ===== 敵 =====
function drawEnemy(e) {
  const t = ui.tick + e.x * 0.5, c = e.col, r = e.r, aim = Math.atan2(P.y - e.y, P.x - e.x);
  ctx.save(); ctx.translate(e.x, e.y);
  const hs = halo(c, Math.round(r * 2.6)); ctx.drawImage(hs, -hs.width / 2, -hs.height / 2);
  const body = (cx, cy, rr) => { const g = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.4, 1, cx, cy, rr); g.addColorStop(0, lighten(c, 0.75)); g.addColorStop(0.5, c); g.addColorStop(1, darken(c, 0.5)); return g; };
  ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  switch (e.kind) {
    case 'grunt': {
      for (const s of [-1, 1]) { ctx.fillStyle = darken(c, 0.45); ctx.beginPath(); ctx.moveTo(s * r * 0.5, -r * 0.3); ctx.lineTo(s * r * 1.6, r * 0.6 + Math.sin(t * 0.2) * 3); ctx.lineTo(s * r * 0.6, r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = body(0, 0, r); ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#201030'; ctx.beginPath(); ctx.arc(Math.cos(aim) * r * 0.2, Math.sin(aim) * r * 0.15, r * 0.22, 0, 7); ctx.fill();
      break;
    }
    case 'swirl': {
      ctx.rotate(t * 0.16);
      for (let i = 0; i < 3; i++) {
        ctx.rotate(2.094); ctx.fillStyle = lighten(c, 0.15); ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 1.2, -r * 0.3, r * 1.35, r * 0.55); ctx.quadraticCurveTo(r * 0.5, r * 0.35, 0, 0); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#10201a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 7); ctx.fill();
      break;
    }
    case 'rusher': {
      ctx.rotate(Math.atan2(e.vy, e.vx));
      const tg = ctx.createLinearGradient(-r * 3.6, 0, 0, 0); tg.addColorStop(0, 'rgba(255,140,60,0)'); tg.addColorStop(1, 'rgba(255,200,90,0.85)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(-r * 3.6, 0); ctx.lineTo(-r * 0.6, -r * 0.55); ctx.lineTo(-r * 0.6, r * 0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body(0, 0, r * 1.4); ctx.beginPath(); ctx.moveTo(r * 1.5, 0); ctx.lineTo(-r * 0.2, -r * 0.9); ctx.lineTo(-r * 0.9, 0); ctx.lineTo(-r * 0.2, r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.22, 0, 7); ctx.fill();
      break;
    }
    case 'turret': {
      ctx.fillStyle = body(0, 0, r); poly(0, 0, r, 6, 0); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.rotate(t * 0.02); ctx.strokeStyle = rgba('#fff', 0.5); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.rotate(aim); ctx.fillStyle = '#2a2030'; ctx.fillRect(0, -3.5, r * 1.3, 7); ctx.fillStyle = c; ctx.fillRect(r * 1.0, -3.5, r * 0.3, 7); ctx.restore();
      const p = 0.6 + 0.4 * Math.sin(t * 0.15); ctx.fillStyle = '#fff'; ctx.globalAlpha = p; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      break;
    }
    case 'elite': {
      for (let i = 0; i < 4; i++) { const a = t * 0.04 + i * 1.571, ox = Math.cos(a) * r * 1.5, oy = Math.sin(a) * r * 1.5; ctx.fillStyle = lighten(c, 0.4); ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = body(0, 0, r); poly(0, 0, r, 8, 0.4); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.rotate(-t * 0.03); ctx.fillStyle = darken(c, 0.6); ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * 0.785, rr = i % 2 ? r * 0.35 : r * 0.78; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r * 0.26, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c02060'; ctx.beginPath(); ctx.arc(Math.cos(aim) * r * 0.12, Math.sin(aim) * r * 0.08, r * 0.15, 0, 7); ctx.fill();
      break;
    }
    default: { // boss / mid
      const big = e.kind === 'boss', flap = Math.sin(t * 0.05) * 0.14;
      for (let i = 0; i < (big ? 3 : 2); i++) {
        ctx.save(); ctx.rotate((i % 2 ? -1 : 1) * t * 0.012 * (i + 1)); ctx.strokeStyle = rgba(c, 0.85); ctx.lineWidth = 3; ctx.setLineDash([r * 0.5, r * 0.28]);
        ctx.beginPath(); ctx.arc(0, 0, r + 11 + i * 9, 0, 7); ctx.stroke(); ctx.restore();
      }
      ctx.setLineDash([]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      for (const s of [-1, 1]) {   // 翼
        ctx.save(); ctx.scale(s, 1); ctx.rotate(flap);
        ctx.fillStyle = rgba(c, 0.55); ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.2);
        ctx.bezierCurveTo(r * 1.6, -r * 1.3, r * 2.6, -r * 0.6, r * 2.3, r * 0.6); ctx.bezierCurveTo(r * 1.8, r * 0.2, r * 1.3, r * 0.5, r * 0.6, r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = body(0, 0, r); ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * 0.3927, rr = i % 2 ? r * 0.86 : r * 1.05; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0c0a18'; poly(0, 0, r * 0.62, big ? 6 : 4, t * 0.02); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.34, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(Math.cos(aim) * r * 0.14, Math.sin(aim) * r * 0.1, r * 0.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#100'; ctx.beginPath(); ctx.arc(Math.cos(aim) * r * 0.14, Math.sin(aim) * r * 0.1, r * 0.09, 0, 7); ctx.fill();
      if (e.enter > 0) { ctx.strokeStyle = 'rgba(140,200,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, 7); ctx.stroke(); }
    }
  }
  if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  if (!e.boss && e.maxhp > 20 && e.hp < e.maxhp) { ctx.fillStyle = '#000a'; ctx.fillRect(-r, r + 6, r * 2, 4); ctx.fillStyle = '#f66'; ctx.fillRect(-r, r + 6, r * 2 * e.hp / e.maxhp, 4); }
  ctx.restore();
}

// ===== カードの絵（武器・パッシブ・ルート） =====
const GOLD = '#fc4';
function ln(pts, close) { ctx.beginPath(); pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); if (close) ctx.closePath(); }
function cap(x, y, len, col, w) { // 縦向きの弾（カプセル）
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, col); g.addColorStop(0.5, '#fff'); g.addColorStop(1, col);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w, y, w * 2, len, w); ctx.fill();
}
function shipMini(x, y, s, col) {
  ctx.fillStyle = col || '#4ac'; ctx.strokeStyle = '#cff'; ctx.lineWidth = 1;
  ln([[x, y - 12 * s], [x + 9 * s, y + 9 * s], [x, y + 4 * s], [x - 9 * s, y + 9 * s]], true); ctx.fill(); ctx.stroke();
}
function heart(x, y, s, col) {
  const g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 1, x, y, s * 1.2); g.addColorStop(0, lighten(col, 0.6)); g.addColorStop(1, darken(col, 0.2));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.8, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.5, y - s * 0.1, x, y + s * 0.9); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
}
function sparkle(x, y, s, col) {
  ctx.fillStyle = col || '#fff'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
}

// id: 武器/パッシブ/ノード名。box = 幅120×高さ86 の領域の中心 (cx, cy)
function drawIcon(id, cx, cy, rar, evo) {
  const t = ui.tick, tint = RAR_COL[rar || 0];
  ctx.save(); ctx.translate(cx, cy);
  const bg = ctx.createRadialGradient(0, 0, 4, 0, 0, 64); bg.addColorStop(0, rgba(tint, 0.38)); bg.addColorStop(1, 'rgba(8,10,30,0.9)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-60, -43, 120, 86, 10); ctx.fill();
  ctx.strokeStyle = rgba(tint, 0.6); ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-60, -43, 120, 86, 10); ctx.clip();
  if (evo) { ctx.save(); ctx.rotate(t * 0.01); ctx.fillStyle = rgba(GOLD, 0.16); for (let i = 0; i < 12; i++) { ctx.rotate(0.5236); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(90, -10); ctx.lineTo(90, 10); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  const wob = Math.sin(t * 0.06);
  switch (id) {
    case 'shot': {
      const xs = evo ? [-24, -12, 0, 12, 24] : [-14, 0, 14];
      xs.forEach((x, i) => { const y = -30 + ((t * 1.5 + i * 11) % 34); cap(x, y, evo ? 22 : 16, evo ? '#8ff' : '#7cf', evo ? 3.6 : 2.4); cap(x, y + 34, 12, '#7cf', 2); });
      shipMini(0, 30, 1.2); break;
    }
    case 'homing': {
      for (const k of evo ? [-1, 1] : [1]) {
        ctx.strokeStyle = 'rgba(160,255,160,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30 * k, 34); ctx.quadraticCurveTo(-34 * k, -6, 20 * k, -16); ctx.stroke();
        ctx.fillStyle = '#e8ffe8'; ctx.beginPath(); ctx.moveTo(20 * k + 8 * k, -18); ctx.lineTo(20 * k - 4 * k, -24); ctx.lineTo(20 * k - 4 * k, -10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f66'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(32 * k, -16 + wob * 2, 9, 0, 7); ctx.moveTo(32 * k - 13, -16 + wob * 2); ctx.lineTo(32 * k + 13, -16 + wob * 2); ctx.moveTo(32 * k, -29 + wob * 2); ctx.lineTo(32 * k, -3 + wob * 2); ctx.stroke();
      }
      shipMini(0, 30, 1.1); break;
    }
    case 'laser': {
      const beams = evo ? [-26, 0, 26] : [0];
      for (const x of beams) { ctx.fillStyle = 'rgba(120,255,240,0.28)'; ctx.fillRect(x - 11, -44, 22, 70); ctx.fillStyle = 'rgba(180,255,250,0.7)'; ctx.fillRect(x - 5, -44, 10, 70); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, -44, 4, 70); }
      const h = halo('#7fe', 30); ctx.drawImage(h, -30, -50);
      shipMini(0, 30, 1.2); break;
    }
    case 'orbit': {
      ctx.strokeStyle = 'rgba(160,220,255,0.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 40, 30, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      shipMini(0, 2, 0.9);
      const n = evo ? 6 : 4;
      for (let i = 0; i < n; i++) { const a = t * 0.04 + i * 6.283 / n, x = Math.cos(a) * 40, y = Math.sin(a) * 30, g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, evo ? 9 : 7); g.addColorStop(0, '#fff'); g.addColorStop(1, evo ? '#fc6' : '#6cf'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, evo ? 8 : 6, 0, 7); ctx.fill(); }
      break;
    }
    case 'spread': {
      const n = evo ? 11 : 7;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 - (evo ? 0.95 : 0.65) + (evo ? 1.9 : 1.3) * i / (n - 1), d = 20 + ((t * 0.8 + i * 5) % 18);
        ctx.strokeStyle = 'rgba(255,200,120,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(Math.cos(a) * d, 28 + Math.sin(a) * d); ctx.stroke();
        ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.arc(Math.cos(a) * (d + 14), 28 + Math.sin(a) * (d + 14), 3.4, 0, 7); ctx.fill();
      }
      shipMini(0, 32, 1.0); break;
    }
    case 'thunder': {
      for (const x of evo ? [-18, 16] : [0]) {
        ctx.fillStyle = 'rgba(255,240,120,0.3)'; ln([[x + 4, -42], [x - 12, 0], [x - 2, 0], [x - 14, 36], [x + 16, -8], [x + 4, -8], [x + 14, -42]], true); ctx.fill();
        ctx.fillStyle = '#ffe860'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ln([[x + 2, -40], [x - 11, 0], [x - 2, 0], [x - 12, 34], [x + 13, -6], [x + 4, -6], [x + 12, -40]], true); ctx.fill(); ctx.stroke();
        const h = halo('#fe6', 26); ctx.drawImage(h, x - 26, 18);
      }
      ctx.fillStyle = 'rgba(70,70,110,0.9)'; for (const [x, y, r] of [[-26, -34, 14], [-8, -38, 16], [14, -34, 15], [32, -32, 12]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      break;
    }
    case 'atk': {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#fd5'); g.addColorStop(1, '#e33');
      ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * 0.3927 + wob * 0.05, rr = i % 2 ? 14 : 36; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke(); break;
    }
    case 'rate': {
      for (let i = 0; i < 3; i++) { const y = 22 - i * 20 - ((t * 0.5) % 20) * 0 + wob * 1.5; ctx.strokeStyle = `rgba(${140 + i * 50},${220 + i * 10},255,${0.5 + i * 0.25})`; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ln([[-22, y + 8], [0, y - 10], [22, y + 8]]); ctx.stroke(); }
      break;
    }
    case 'count': {
      cap(0, 14, 18, '#7cf', 3);
      [-26, 0, 26].forEach((x, i) => { cap(x, -30 + wob * 1.5, 18, '#bff', 3); ctx.strokeStyle = 'rgba(160,220,255,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(x, -8); ctx.stroke(); });
      sparkle(36, 14, 7, GOLD); break;
    }
    case 'range': {
      for (let i = 0; i < 3; i++) { const rr = 12 + i * 13 + ((t * 0.3) % 13); ctx.strokeStyle = `rgba(150,230,255,${0.8 - i * 0.2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, 8, rr, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ln([[-6, 8], [30, -26]]); ctx.stroke(); ln([[18, -26], [30, -26], [30, -14]]); ctx.stroke(); shipMini(-6, 8, 0.7); break;
    }
    case 'move': {
      for (let i = 3; i >= 0; i--) { ctx.globalAlpha = i === 0 ? 1 : 0.18 * (4 - i); shipMini(14 - i * 14, 4 + i * 3, 1.0 - i * 0.05); }
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(200,240,255,0.6)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ln([[-50, -26 + i * 14], [-26 - (i % 2) * 8, -26 + i * 14]]); ctx.stroke(); }
      break;
    }
    case 'pickup': {
      ctx.lineWidth = 11; ctx.lineCap = 'butt'; ctx.strokeStyle = '#d33'; ctx.beginPath(); ctx.arc(0, -6, 22, Math.PI, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = '#38d'; ctx.beginPath(); ctx.arc(0, -6, 22, Math.PI * 1.5, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-22, 8); ctx.moveTo(22, -6); ctx.lineTo(22, 8); ctx.lineWidth = 11; ctx.strokeStyle = '#ddd'; ctx.stroke();
      [[-34, 26], [0, 34], [34, 24]].forEach(([x, y], i) => { const k = ((t * 0.02 + i * 0.33) % 1); const gx = x * (1 - k * 0.7), gy = y - k * 40; ctx.fillStyle = ['#5cf', '#5f8', '#f66'][i]; poly(gx, gy, 5, 4, Math.PI / 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); });
      break;
    }
    case 'hitbox': {
      ctx.strokeStyle = 'rgba(160,220,255,0.6)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 32 - ((t * 0.2) % 8), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      shipMini(0, 0, 1.5); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#f33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 2, 3.2, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (const s of [-1, 1]) { ln([[s * 40, 0], [s * 30, 0]]); ctx.stroke(); }
      break;
    }
    case 'graze': {
      shipMini(0, 4, 1.3); ctx.strokeStyle = 'rgba(160,230,255,0.7)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 2, 30, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      for (const [x, y] of [[-34, -26], [34, -10], [-30, 30]]) { ctx.fillStyle = '#f8a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); sparkle(x + (x > 0 ? -12 : 12), y + 8, 5, '#fff'); }
      break;
    }
    case 'maxhp': { heart(0, 4, 22 + wob * 1.2, '#f45'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ln([[30, -30], [30, -18]]); ctx.stroke(); ln([[24, -24], [36, -24]]); ctx.stroke(); break; }
    case 'heal': { heart(0, 4, 22, '#f68'); ctx.strokeStyle = '#8f8'; ctx.lineWidth = 4; ln([[-4, 0], [-4, 12]]); ctx.stroke(); ln([[-10, 6], [2, 6]]); ctx.stroke(); break; }
    case 'bomb': {
      ctx.strokeStyle = 'rgba(255,200,120,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 8, 28 + ((t * 0.4) % 10), 0, 7); ctx.stroke();
      const g = ctx.createRadialGradient(-6, 0, 2, 0, 8, 22); g.addColorStop(0, '#6a6a8a'); g.addColorStop(1, '#101020'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 8, 20, 0, 7); ctx.fill(); ctx.strokeStyle = '#ccd'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(-7, 1, 4, 2.4, -0.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ca8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(6, -10); ctx.quadraticCurveTo(14, -24, 24, -22); ctx.stroke(); sparkle(25, -22, 8 + wob * 2, '#fd6'); break;
    }
    case 'luck': {
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * 1.5708 + 0.785); ctx.translate(0, -13); ctx.fillStyle = i % 2 ? '#3c6' : '#5e8'; ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-18, -2, -10, -20, 0, -8); ctx.bezierCurveTo(10, -20, 18, -2, 0, 10); ctx.fill(); ctx.strokeStyle = '#cfc'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      ctx.strokeStyle = '#3a6'; ctx.lineWidth = 3; ln([[0, 4], [8, 30]]); ctx.stroke(); sparkle(-34, -22, 7, GOLD); sparkle(34, 12, 6, '#fff'); sparkle(30, -26, 5, GOLD); break;
    }
    case 'exp': {
      for (const [x, y, r, col] of [[-22, 8, 11, '#5cf'], [22, 8, 11, '#5f8'], [0, -4, 17, '#f66']]) { const h = halo(col, 30); ctx.drawImage(h, x - 30, y - 30); const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#fff'); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.4)); ctx.fillStyle = g; poly(x, y, r * 1.25, 4, Math.PI / 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
      break;
    }
    case 'coin': {
      const h = halo('#fd5', 40); ctx.drawImage(h, -40, -40);
      const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 30); g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#d9a020'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#a87010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.stroke(); ctx.fillStyle = '#8a5a08'; ctx.font = 'bold 28px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('G', 0, 10); break;
    }
    case 'revive': {
      for (const s of [-1, 1]) { ctx.fillStyle = 'rgba(255,230,160,0.9)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s * 10, 0); ctx.bezierCurveTo(s * 30, -26, s * 50, -10, s * 44, 10); ctx.bezierCurveTo(s * 36, 2, s * 26, 6, s * 12, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      heart(0, 2, 20 + wob, '#f45'); sparkle(-40, -26, 6, '#fff'); sparkle(40, 22, 5, GOLD); break;
    }
    case 'crit': {
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,80,80,0.5)'; ctx.lineWidth = 14; ln([[-30, -26], [30, 26]]); ctx.stroke(); ln([[30, -26], [-30, 26]]); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ln([[-30, -26], [30, 26]]); ctx.stroke(); ln([[30, -26], [-30, 26]]); ctx.stroke(); sparkle(0, 0, 14 + wob * 2, GOLD); break;
    }
    case 'sword': {
      const h = halo('#f66', 40); ctx.drawImage(h, -40, -40);
      const g = ctx.createLinearGradient(-20, 20, 20, -30); g.addColorStop(0, '#9ab'); g.addColorStop(1, '#fff');
      ctx.save(); ctx.rotate(0.6); ctx.fillStyle = g; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ln([[0, -36], [7, -6], [5, 14], [-5, 14], [-7, -6]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a02030'; ctx.fillRect(-14, 14, 28, 5); ctx.fillStyle = '#d33'; ctx.fillRect(-3, 19, 6, 14); ctx.restore(); sparkle(24, -24, 8, '#fff'); break;
    }
    case 'hourglass': {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(160,220,255,0.25)'; ln([[-18, -30], [18, -30], [3, -2], [18, 30], [-18, 30], [-3, -2]], true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fd8'; ln([[-12, -24], [12, -24], [2, -4], [-2, -4]], true); ctx.fill(); ln([[-12, 26], [12, 26], [0, 12]], true); ctx.fill();
      ctx.strokeStyle = '#fd8'; ctx.lineWidth = 1.5; ln([[0, -4], [0, 12]]); ctx.stroke(); sparkle(24, -24, 6, '#fff'); break;
    }
    case 'star': {
      const h = halo('#fd5', 44); ctx.drawImage(h, -44, -44);
      const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 32); g.addColorStop(0, '#fff'); g.addColorStop(1, '#f9a020');
      ctx.fillStyle = g; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * 0.6283 + wob * 0.03, rr = i % 2 ? 13 : 32; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    }
    case 'pierce': {
      for (const x of [-18, 2, 22]) { ctx.strokeStyle = 'rgba(160,220,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, 0, 8, 22, 0, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ln([[-40, 4], [34, 4]]); ctx.stroke(); ctx.fillStyle = '#fff'; ln([[40, 4], [28, -4], [28, 12]], true); ctx.fill();
      const h = halo('#8df', 24); ctx.drawImage(h, -2 - 24 + 30 * Math.sin(ui.tick * 0.05), -20); break;
    }
    case 'shield': {
      const h = halo('#7af', 44); ctx.drawImage(h, -44, -44);
      const g = ctx.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#dff'); g.addColorStop(1, '#2a5fb0');
      ctx.fillStyle = g; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ln([[0, -32], [24, -22], [24, 8], [0, 32], [-24, 8], [-24, -22]], true); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ln([[0, -18], [0, 14]]); ctx.stroke(); ln([[-12, -4], [12, -4]]); ctx.stroke(); break;
    }
    case 'node_normal': { ctx.save(); drawEnemy({ kind: 'grunt', x: 0, y: 0, col: '#6cf', r: 20, flash: 0, hp: 1, maxhp: 1, enter: 0, vx: 0, vy: 0 }); ctx.restore(); break; }
    case 'node_elite': { ctx.save(); const e = { kind: 'elite', x: 0, y: 0, col: '#d6f', r: 26, flash: 0, hp: 1, maxhp: 1, enter: 0, vx: 0, vy: 0 }; drawEnemy(e); ctx.restore(); break; }
    case 'node_shop': {
      ctx.fillStyle = '#b8862e'; ctx.beginPath(); ctx.moveTo(-18, 24); ctx.quadraticCurveTo(-30, -2, -8, -12); ctx.lineTo(8, -12); ctx.quadraticCurveTo(30, -2, 18, 24); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fe9'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#7a5a1c'; ctx.fillRect(-9, -16, 18, 6); ctx.fillStyle = '#fd5'; ctx.font = `bold 22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('G', 0, 14);
      for (const [x, y] of [[-38, 22], [36, 16]]) { ctx.fillStyle = '#fd5'; ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#a80'; ctx.stroke(); }
      break;
    }
    case 'node_rest': {
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-26, 24, 52, 7); ctx.save(); ctx.rotate(0.35); ctx.fillRect(-24, 18, 48, 6); ctx.restore();
      for (const [s, col] of [[1, '#f93'], [0.7, '#fd5'], [0.4, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -34 * s + 14 - wob * 2); ctx.bezierCurveTo(24 * s, -6 * s, 22 * s, 22 * s, 0, 22); ctx.bezierCurveTo(-22 * s, 22 * s, -24 * s, -6 * s, 0, -34 * s + 14 - wob * 2); ctx.fill(); }
      break;
    }
    case 'node_event': {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#c8f'); g.addColorStop(1, 'rgba(120,60,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 36, 40, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a1050'; ctx.font = `bold 40px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('?', 0, 14); sparkle(-34, -24, 7, '#fff'); sparkle(34, 18, 6, '#fff'); break;
    }
  }
  ctx.restore();
}
