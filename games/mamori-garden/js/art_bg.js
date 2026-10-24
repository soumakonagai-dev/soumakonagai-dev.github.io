'use strict';
// ===== 背景（アニメ調の景色・道・飾り・時間帯） =====
var EXTBG = {};   // 新ステージの背景処理（art_bg2.js）
const ART = { sc: 1, bg: null, bgKey: '', t: 0, coinTarget: { x: 60, y: 24 } };

const THEMES = {
  meadow: {
    sky: ['#7cc8ff', '#bfe6ff', '#fff1cf'], mount: ['#b8d4f0', '#9cc6b8', '#7fb98a'],
    ground: ['#9bdc72', '#7ccb62', '#62b455'], blob: ['#b4ec80', '#6bbd58', '#8fd96b'],
    pathMain: '#ecd8a6', pathEdge: '#b88f58', pathDark: '#7a5a34', accent: '#ff9ed2', glow: '#fff4b0',
    tod: [[0, 255, 220, 160, .20], [.3, 255, 255, 255, 0], [.65, 255, 180, 110, .12], [.85, 255, 120, 90, .24], [1, 60, 60, 130, .38]],
  },
  lake: {
    sky: ['#0b1440', '#1d3b82', '#5b7fc4'], mount: ['#2a3f78', '#22386b', '#1b2f5a'],
    ground: ['#1f5a86', '#18496f', '#133c5c'], blob: ['#2e7aa6', '#154568', '#3a8bb5'],
    pathMain: '#b78c5a', pathEdge: '#5a3e22', pathDark: '#2c1d10', accent: '#9fe8ff', glow: '#cfe9ff',
    tod: [[0, 120, 160, 255, .06], [.5, 0, 0, 0, 0], [1, 20, 10, 80, .22]],
  },
  autumn: {
    sky: ['#ff9a5a', '#ffc27a', '#ffe9b8'], mount: ['#d98a6a', '#c0704f', '#9a5a3c'],
    ground: ['#d9a35a', '#c48848', '#a9733c'], blob: ['#e8b86a', '#b97b3a', '#d6924a'],
    pathMain: '#f0d7a0', pathEdge: '#9a6a3a', pathDark: '#5a3a1e', accent: '#ff5a3a', glow: '#ffe2a0',
    tod: [[0, 255, 200, 130, .10], [.5, 255, 150, 90, .14], [1, 110, 40, 90, .34]],
  },
  snow: {
    sky: ['#071a3a', '#1c5a7a', '#7fd6c8'], mount: ['#4a7fa8', '#6d9bbd', '#9cc2d9'],
    ground: ['#eaf6ff', '#d3ebf8', '#bfe0f2'], blob: ['#ffffff', '#b8dcee', '#e6f6ff'],
    pathMain: '#9fc4dc', pathEdge: '#5e8aa8', pathDark: '#35566e', accent: '#a8f0ff', glow: '#d6fbff',
    tod: [[0, 140, 190, 255, .10], [.5, 180, 220, 255, 0], [1, 30, 40, 110, .26]],
  },
  temple: {
    sky: ['#0a0524', '#2a0f5a', '#5a2a8a'], mount: ['#3a1f6a', '#2d1858', '#241448'],
    ground: ['#2a2358', '#221c4a', '#1a1540'], blob: ['#3b3280', '#1b1645', '#4a3f95'],
    pathMain: '#8c7fd6', pathEdge: '#4a3a9a', pathDark: '#1a1240', accent: '#ffe27a', glow: '#d9c8ff',
    tod: [[0, 120, 80, 220, .05], [.5, 0, 0, 0, 0], [1, 60, 20, 120, .18]],
  },
};

function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w * ART.sc); c.height = Math.ceil(h * ART.sc); const x = c.getContext('2d'); x.scale(ART.sc, ART.sc); return [c, x]; }
function vgrad(c, y0, y1, cols) { const g = c.createLinearGradient(0, y0, 0, y1); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function blob(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill(); }
const GLOW_CACHE = {};
function glowImg(col) {   // 光の玉はテクスチャを使い回す（グラデーション生成を避ける）
  let im = GLOW_CACHE[col]; if (im) return im;
  if (typeof col !== 'string' || col[0] !== '#' || col.length !== 7) { col = '#ffffff'; if (GLOW_CACHE[col]) return GLOW_CACHE[col]; }
  im = document.createElement('canvas'); im.width = im.height = 64; const g = im.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return GLOW_CACHE[col] = im;
}
function glowDot(c, x, y, r, col, a) { const pa = c.globalAlpha; c.globalAlpha = pa * clamp(a, 0, 1); c.drawImage(glowImg(col), x - r, y - r, r * 2, r * 2); c.globalAlpha = pa; }

function drawTree(c, x, y, s, r, th) {
  if (EXTBG[th] && EXTBG[th].tree) { EXTBG[th].tree(c, x, y, s, r); return; }
  const trunk = th === 'snow' ? '#7a8fa6' : '#7a5232';
  const cols = { meadow: ['#4aa04a', '#6fd06a', '#a6f08a'], lake: ['#1c5a62', '#2e8a86', '#58bfa8'], autumn: ['#c8501e', '#f08a2a', '#ffc24a'], snow: ['#4d7f8a', '#9cc8cf', '#f0fbff'], temple: ['#3a2f80', '#6a58c8', '#a998ff'] }[th];
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + 2, s * 0.9, s * 0.28, 0, 0, TAU); c.fill();
  c.fillStyle = trunk; c.fillRect(x - s * 0.1, y - s * 0.7, s * 0.2, s * 0.75);
  blob(c, x, y - s * 1.2, s * 0.95, s * 0.85, cols[0]);
  blob(c, x - s * 0.1, y - s * 1.35, s * 0.8, s * 0.7, cols[1]);
  blob(c, x - s * 0.28, y - s * 1.5, s * 0.42, s * 0.34, cols[2]);
  if (th === 'meadow' && r() < 0.4) { for (let i = 0; i < 4; i++) blob(c, x + (r() - 0.5) * s * 1.2, y - s * (0.9 + r() * 0.8), 2.2, 2.2, '#ff9ed2'); }
}

function makeBackground(stageIdx, L, P, zones) {
  const st = STAGES[stageIdx], th = THEMES[st.theme], r = mulberry32(stageIdx * 101 + (L.portrait ? 7 : 3)), S = L.S;
  const [cv, c] = newCanvas(L.W, L.H);
  const fy = L.fy, fb = L.fy + L.fh;
  // --- 空 ---
  c.fillStyle = vgrad(c, 0, fy + 12, th.sky); c.fillRect(0, 0, L.W, fy + 12);
  const theme = st.theme;
  if (theme === 'lake' || theme === 'temple' || theme === 'snow') {
    for (let i = 0; i < 90; i++) { const a = r() * 0.8 + 0.2; glowDot(c, r() * L.W, r() * fy * 0.9, 2.2 + r() * 2, '#ffffff', a * 0.9); c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(r() * L.W, r() * fy, 1, 1); }
  }
  if (theme === 'lake') { glowDot(c, L.W * 0.78, fy * 0.42, fy * 0.9, '#cfe0ff', 0.55); blob(c, L.W * 0.78, fy * 0.42, 17, 17, '#fffbe8'); blob(c, L.W * 0.78 + 5, fy * 0.42 - 3, 14, 14, '#eef2ff'); }
  if (theme === 'meadow') { glowDot(c, L.W * 0.2, fy * 0.5, fy * 1.3, '#fff6c0', 0.8); blob(c, L.W * 0.2, fy * 0.5, 16, 16, '#fffbe0'); }
  if (theme === 'autumn') { glowDot(c, L.W * 0.7, fy * 0.82, fy * 1.6, '#fff0a0', 0.85); blob(c, L.W * 0.7, fy * 0.82, 26, 26, '#fff4c8'); }
  if (EXTBG[theme]) EXTBG[theme].sky(c, L, r, fy);
  if (theme === 'temple') {
    glowDot(c, L.W * 0.3, fy * 0.5, fy * 1.5, '#ff7ad9', 0.28); glowDot(c, L.W * 0.7, fy * 0.4, fy * 1.6, '#5ad0ff', 0.25); glowDot(c, L.W * 0.5, fy * 0.7, fy * 1.2, '#b58cff', 0.3);
    for (let i = 0; i < 4; i++) { const x = (i + 0.5) * L.W / 4 + (r() - 0.5) * 40, y = fy * (0.25 + r() * 0.4); c.fillStyle = '#3a2a78'; c.beginPath(); c.moveTo(x - 16, y); c.lineTo(x + 16, y); c.lineTo(x + 8, y + 12); c.lineTo(x - 8, y + 12); c.fill(); c.fillStyle = '#6a56c0'; c.fillRect(x - 16, y - 2, 32, 3); }
  }
  // --- 遠景の山 ---
  for (let i = 0; i < 3; i++) {
    const base = fy + 4 - i * 4, amp = fy * (0.62 - i * 0.14), col = th.mount[i];
    c.beginPath(); c.moveTo(0, fy + 14);
    const ph = r() * 10, fr = 0.006 + i * 0.004;
    for (let x = 0; x <= L.W; x += 8) { const y = base - amp * (0.5 + 0.5 * Math.sin(x * fr + ph) * 0.7 + 0.3 * Math.sin(x * fr * 2.7 + ph * 2)) * (1 - i * 0.12); c.lineTo(x, y); }
    c.lineTo(L.W, fy + 14); c.closePath();
    const g = c.createLinearGradient(0, base - amp, 0, fy + 10); g.addColorStop(0, col); g.addColorStop(1, mix(col, th.sky[th.sky.length - 1], 0.55)); c.fillStyle = g; c.fill();
    if (theme === 'snow' && i < 2) { c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 20; x < L.W; x += 70 + r() * 60) { const yy = base - amp * 0.55; c.beginPath(); c.moveTo(x - 12, yy + 8); c.lineTo(x, yy - 6); c.lineTo(x + 12, yy + 8); c.fill(); } }
  }
  if (theme === 'meadow') {   // 風車の丘
    const wx = L.W * 0.82, wy = fy - 4;
    c.fillStyle = '#e9dcc4'; c.beginPath(); c.moveTo(wx - 9, wy); c.lineTo(wx - 6, wy - 30); c.lineTo(wx + 6, wy - 30); c.lineTo(wx + 9, wy); c.fill();
    c.fillStyle = '#d96a5a'; c.beginPath(); c.moveTo(wx - 8, wy - 30); c.lineTo(wx, wy - 40); c.lineTo(wx + 8, wy - 30); c.fill();
    ART.windmill = { x: wx, y: wy - 31 };
  } else ART.windmill = null;
  // 遠景の木立
  for (let x = -10; x < L.W + 20; x += 22 + r() * 16) drawTree(c, x, fy + 6 + r() * 6, 11 + r() * 8, r, theme);
  // --- 地面 ---
  c.fillStyle = vgrad(c, fy, L.H, th.ground); c.fillRect(0, fy, L.W, L.H - fy);
  c.save(); c.beginPath(); c.rect(0, fy, L.W, L.H - fy); c.clip();
  for (let i = 0; i < 70; i++) { const x = r() * L.W, y = fy + r() * (L.H - fy), rr = 30 + r() * 70; const g = c.createRadialGradient(x, y, 0, x, y, rr); const col = th.blob[Math.floor(r() * 3)]; g.addColorStop(0, rgba(mixHex(col), 0.5)); g.addColorStop(1, rgba(mixHex(col), 0)); c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // 地面の質感
  if (EXTBG[theme]) EXTBG[theme].ground(c, L, r, P, fy, S);
  else if (theme === 'lake') {
    for (let i = 0; i < 160; i++) { const x = r() * L.W, y = fy + r() * L.fh; c.strokeStyle = `rgba(190,235,255,${0.08 + r() * 0.12})`; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 8 + r() * 14, 2 + r() * 3, 0, 0, TAU); c.stroke(); }
  } else if (theme === 'temple') {
    c.strokeStyle = 'rgba(160,140,255,.10)'; c.lineWidth = 1; const g = 44; for (let x = 0; x < L.W; x += g) { c.beginPath(); c.moveTo(x, fy); c.lineTo(x, L.H); c.stroke(); } for (let y = fy; y < L.H; y += g) { c.beginPath(); c.moveTo(0, y); c.lineTo(L.W, y); c.stroke(); }
    for (let i = 0; i < 60; i++) glowDot(c, r() * L.W, fy + r() * L.fh, 5 + r() * 8, '#b9a8ff', 0.25);
  } else {
    const gc = { meadow: '#4a9a3f', autumn: '#8a5a2a', snow: '#9cc8e0' }[theme];
    c.strokeStyle = gc; c.lineWidth = 1.2; c.globalAlpha = .55;
    for (let i = 0; i < 700; i++) { const x = r() * L.W, y = fy + r() * L.fh; if (distToPath(P, x, y) < S * 1.0) continue; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 1, y - 4, x + (r() - .5) * 4, y - 5 - r() * 3); c.stroke(); }
    c.globalAlpha = 1;
  }
  // --- 道 ---
  drawPathArt(c, P, S, th, theme, r);
  // --- 飾り ---
  const decor = [];
  for (let i = 0; i < 150; i++) { const x = r() * L.W, y = fy + S * 0.5 + r() * (L.fh - S), dp = distToPath(P, x, y); if (dp < S * 1.15) continue; decor.push({ x, y, k: r(), s: 0.7 + r() * 0.7 }); }
  decor.sort((a, b) => a.y - b.y);
  for (const d of decor) {
    if (theme === 'meadow') { if (d.k < .55) flower(c, d.x, d.y, d.s, ['#ff9ed2', '#fff27a', '#ffffff', '#b9a0ff'][Math.floor(d.k * 40) % 4]); else if (d.k < .7) rock(c, d.x, d.y, d.s, '#b9c2c9'); else tuft(c, d.x, d.y, d.s, '#4a9a3f'); }
    else if (theme === 'lake') { if (d.k < .4) lily(c, d.x, d.y, d.s); else if (d.k < .55) reed(c, d.x, d.y, d.s); else glowDot(c, d.x, d.y, 8 * d.s, '#bff3ff', .22); }
    else if (theme === 'autumn') { if (d.k < .5) leaf(c, d.x, d.y, d.s, ['#e8452a', '#f6a22a', '#c8601a', '#ffcc4a'][Math.floor(d.k * 40) % 4]); else if (d.k < .65) rock(c, d.x, d.y, d.s, '#b09878'); else tuft(c, d.x, d.y, d.s, '#a8742e'); }
    else if (theme === 'snow') { if (d.k < .35) rock(c, d.x, d.y, d.s, '#c8dbe8'); else if (d.k < .55) crystal(c, d.x, d.y, d.s); else glowDot(c, d.x, d.y, 6 * d.s, '#ffffff', .5); }
    else if (EXTBG[theme]) EXTBG[theme].decor(c, d);
    else { if (d.k < .4) rune(c, d.x, d.y, d.s); else glowDot(c, d.x, d.y, 8 * d.s, '#c8b8ff', .3); }
  }
  c.restore();
  // 縁の木々（フィールド外周）
  const edge = [];
  for (let x = 0; x < L.W; x += 26 + r() * 22) edge.push({ x, y: fy + 4 + r() * 6, s: 12 + r() * 7 });
  for (const t of edge) if (distToPath(P, t.x, t.y) > S * 1.7) drawTree(c, t.x, t.y, t.s, r, theme);
  const sideN = Math.floor(L.fh / 70);
  for (let i = 1; i < sideN; i++) for (const sx of [3, L.W - 3]) { const y = fy + i * 70 + r() * 20; if (distToPath(P, sx, y) > S * 2) drawTree(c, sx, y, 12 + r() * 6, r, theme); }
  // 出入口
  const ent = edgePoint(P, L, true), ext = edgePoint(P, L, false);
  ART.gates = { ent, ext };
  ART.bg = cv; ART.bgKey = stageIdx + (L.portrait ? 'p' : 'l'); ART.theme = theme; ART.th = th; ART.L = L;
  ART.particles = null; ART.clouds = null;
  return cv;
}
function mixHex(col) { return col.startsWith('#') && col.length === 7 ? col : '#ffffff'; }
function edgePoint(P, L, start) {
  const inside = (p) => p.x > 4 && p.x < L.W - 4 && p.y > L.fy + 2 && p.y < L.fy + L.fh - 2;
  const o = {};
  if (start) { for (let d = 0; d < P.len; d += 2) { pathPos(P, d, o); if (inside(o)) return { x: o.x, y: o.y, ang: Math.atan2(o.dy, o.dx) }; } }
  else { for (let d = P.len; d > 0; d -= 2) { pathPos(P, d, o); if (inside(o)) return { x: o.x, y: o.y, ang: Math.atan2(o.dy, o.dx) }; } }
  return { x: 0, y: 0, ang: 0 };
}
function strokeP(c, P, w, style) { c.strokeStyle = style; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); P.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); }
function drawPathArt(c, P, S, th, theme, r) {
  const w = S * 1.55;
  c.save();
  c.translate(0, 3); strokeP(c, P, w + S * 0.5, 'rgba(0,0,0,.22)'); c.translate(0, -3);
  strokeP(c, P, w + S * 0.34, th.pathDark);
  strokeP(c, P, w + S * 0.16, th.pathEdge);
  strokeP(c, P, w, th.pathMain);
  strokeP(c, P, w * 0.62, 'rgba(255,255,255,.14)');
  c.restore();
  // 質感
  const o = {};
  for (let d = 0; d < P.len; d += S * 0.42) {
    pathPos(P, d, o); const nx = -o.dy, ny = o.dx, nl = Math.hypot(nx, ny) || 1, off = (r() - .5) * w * 0.8;
    const x = o.x + nx / nl * off, y = o.y + ny / nl * off;
    if (EXTBG[theme] && EXTBG[theme].path) EXTBG[theme].path(c, o, x, y, w, nx / nl, ny / nl, th, r);
    else if (theme === 'lake') { // 板張り
      c.strokeStyle = th.pathEdge; c.lineWidth = 1.6; c.beginPath(); c.moveTo(o.x + nx / nl * w * 0.5, o.y + ny / nl * w * 0.5); c.lineTo(o.x - nx / nl * w * 0.5, o.y - ny / nl * w * 0.5); c.stroke();
    } else if (theme === 'temple') {
      c.strokeStyle = 'rgba(255,240,170,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o.x + nx / nl * w * 0.4, o.y + ny / nl * w * 0.4); c.lineTo(o.x - nx / nl * w * 0.4, o.y - ny / nl * w * 0.4); c.stroke();
      if (r() < .25) glowDot(c, x, y, 6, '#ffe27a', .6);
    } else if (theme === 'snow') { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x, y, 2, 2); }
    else { c.fillStyle = r() < .5 ? 'rgba(120,90,50,.28)' : 'rgba(255,255,255,.28)'; blob(c, x, y, 1.6 + r() * 2.2, 1.2 + r() * 1.6, c.fillStyle); }
  }
}
function flower(c, x, y, s, col) { c.fillStyle = '#3f9a45'; c.fillRect(x - .5, y - 3 * s, 1, 4 * s); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; blob(c, x + Math.cos(a) * 2.2 * s, y - 4 * s + Math.sin(a) * 2.2 * s, 1.8 * s, 1.8 * s, col); } blob(c, x, y - 4 * s, 1.2 * s, 1.2 * s, '#ffd24a'); }
function rock(c, x, y, s, col) { blob(c, x, y + 1, 5 * s, 2 * s, 'rgba(0,0,0,.18)'); blob(c, x, y - 1, 4.5 * s, 3.2 * s, col); blob(c, x - 1, y - 2, 2.4 * s, 1.5 * s, 'rgba(255,255,255,.4)'); }
function tuft(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = 1.3; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 1.4 * s, y); c.quadraticCurveTo(x + i * 2.2 * s, y - 4 * s, x + i * 3 * s, y - 7 * s + Math.abs(i) * s); c.stroke(); } }
function lily(c, x, y, s) { blob(c, x, y, 7 * s, 3.2 * s, '#2f9a6a'); blob(c, x - 1, y - .6, 5 * s, 2.2 * s, '#4bc088'); if (s > 1) blob(c, x + 2, y - 1.5, 2 * s, 1.6 * s, '#ffb8e0'); }
function reed(c, x, y, s) { c.strokeStyle = '#6fbf8a'; c.lineWidth = 1.4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 3, y); c.lineTo(x + i * 3 + i * 2, y - 12 * s); c.stroke(); } blob(c, x, y - 11 * s, 1.6, 3.2, '#8a5a2a'); }
function leaf(c, x, y, s, col) { c.save(); c.translate(x, y); c.rotate(x * 0.37); blob(c, 0, 0, 4 * s, 2 * s, col); c.strokeStyle = 'rgba(80,30,10,.4)'; c.lineWidth = .8; c.beginPath(); c.moveTo(-4 * s, 0); c.lineTo(4 * s, 0); c.stroke(); c.restore(); }
function crystal(c, x, y, s) { c.fillStyle = 'rgba(180,235,255,.85)'; c.beginPath(); c.moveTo(x, y - 12 * s); c.lineTo(x + 3.5 * s, y); c.lineTo(x - 3.5 * s, y); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x, y - 12 * s); c.lineTo(x + 1.2 * s, y - 2 * s); c.lineTo(x - 1.5 * s, y - 2 * s); c.fill(); }
function rune(c, x, y, s) { c.strokeStyle = 'rgba(200,185,255,.5)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 5 * s, 0, TAU); c.moveTo(x - 5 * s, y); c.lineTo(x + 5 * s, y); c.moveTo(x, y - 5 * s); c.lineTo(x, y + 5 * s); c.stroke(); }

// ---------- 動く景色（雲・粒子・オーロラ・水面） ----------
function initScenery(L) {
  const th = ART.theme, n = ({ meadow: 36, lake: 40, autumn: 40, snow: 90, temple: 50 })[th] || (EXTBG[th] && EXTBG[th].n) || 40; const nPart = PERF.lite ? Math.ceil(n * .4) : n;
  ART.particles = []; for (let i = 0; i < nPart; i++) ART.particles.push(newParticle(L, th, true));
  ART.clouds = []; for (let i = 0; i < 5; i++) ART.clouds.push({ x: Math.random() * L.W, y: 6 + Math.random() * (L.fy * 0.55), s: 0.7 + Math.random() * 0.8, v: 3 + Math.random() * 5 });
}
function newParticle(L, th, init) {
  const p = { x: Math.random() * L.W, y: init ? L.fy * 0.3 + Math.random() * (L.H - L.fy * 0.3) : -10, ph: Math.random() * 10, s: 0.6 + Math.random() * 0.9, k: Math.random() };
  if (th === 'lake' || th === 'temple') { p.y = L.fy + Math.random() * L.fh; }
  return p;
}
function drawSceneryAnim(c, L, dt) {
  if (PERF.lite) return;   // かんたん表示：雲・粒・背景アニメは出さない
  const t = ART.t, th = ART.theme;
  if (!ART.particles) initScenery(L);
  // 雲
  if (th !== 'temple' && !(EXTBG[th] && EXTBG[th].noCloud)) {
    for (const cl of ART.clouds) {
      cl.x += cl.v * dt; if (cl.x > L.W + 80) cl.x = -80;
      const a = EXTBG[th] && EXTBG[th].cloudA != null ? EXTBG[th].cloudA : th === 'lake' ? 0.18 : th === 'snow' ? 0.15 : 0.8;
      const col = EXTBG[th] && EXTBG[th].cloudC ? EXTBG[th].cloudC : th === 'autumn' ? '255,226,190' : '255,255,255';
      c.fillStyle = `rgba(${col},${a})`;
      for (const [dx, dy, r] of [[0, 0, 14], [14, -5, 17], [30, 0, 13], [14, 4, 14]]) { c.beginPath(); c.arc(cl.x + dx * cl.s, cl.y + dy * cl.s, r * cl.s, 0, TAU); c.fill(); }
    }
  }
  if (th === 'snow') { // オーロラ
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const g = c.createLinearGradient(0, 0, 0, L.fy); g.addColorStop(0, rgba(['#55ffb0', '#6ab8ff', '#c47aff'][k], 0)); g.addColorStop(0.5, rgba(['#55ffb0', '#6ab8ff', '#c47aff'][k], 0.35)); g.addColorStop(1, rgba(['#55ffb0', '#6ab8ff', '#c47aff'][k], 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, L.fy);
      for (let x = 0; x <= L.W; x += 12) c.lineTo(x, L.fy * (0.3 + k * 0.12) + Math.sin(x * 0.012 + t * 0.6 + k * 2) * 16);
      c.lineTo(L.W, 0); c.lineTo(0, 0); c.closePath(); c.fill();
    }
    c.restore();
  }
  if (th === 'meadow' && ART.windmill) { // 風車の羽
    const w = ART.windmill; c.save(); c.translate(w.x, w.y); c.rotate(t * 0.6); c.fillStyle = '#fff'; c.strokeStyle = '#a07a4a'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.fillRect(0, -2.5, 20, 5); c.strokeRect(0, -2.5, 20, 5); } c.restore();
  }
  if (th === 'temple') { for (let i = 0; i < 8; i++) { const a = (Math.sin(t * 0.7 + i * 1.7) * 0.5 + 0.5); glowDot(c, (i * 131 + 40) % L.W, 10 + (i * 37) % (L.fy * 0.8), 3 + a * 3, '#ffffff', 0.5 + a * 0.5); } }
  if (EXTBG[th] && EXTBG[th].anim && !PERF.lite) EXTBG[th].anim(c, L, t);
  // 粒子（花びら／ホタル／落ち葉／雪／光の粒）
  for (const p of ART.particles) {
    if (EXTBG[th] && EXTBG[th].particle) EXTBG[th].particle(c, p, dt, t, L);
    else if (th === 'meadow') { p.x += (18 + p.s * 10) * dt; p.y += (14 + p.s * 8) * dt; p.ph += dt * 2; c.save(); c.translate(p.x + Math.sin(p.ph) * 8, p.y); c.rotate(p.ph); c.fillStyle = p.k < .5 ? 'rgba(255,190,220,.9)' : 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(0, 0, 3.2 * p.s, 1.8 * p.s, 0, 0, TAU); c.fill(); c.restore(); }
    else if (th === 'lake') { p.ph += dt; const x = p.x + Math.sin(p.ph * .7 + p.k * 6) * 24, y = p.y + Math.cos(p.ph * .5 + p.k * 4) * 14, a = .5 + .5 * Math.sin(p.ph * 2.4 + p.k * 9); glowDot(c, x, y, 7 * p.s, '#d8ff9a', a * .8); c.fillStyle = `rgba(255,255,220,${a})`; c.fillRect(x - 1, y - 1, 2, 2); }
    else if (th === 'autumn') { p.x += (-22 - p.s * 14) * dt; p.y += (26 + p.s * 14) * dt; p.ph += dt * 3; c.save(); c.translate(p.x + Math.sin(p.ph) * 10, p.y); c.rotate(p.ph * .8); c.fillStyle = ['#e8452a', '#f6a22a', '#c8601a', '#ffcc4a'][Math.floor(p.k * 4)]; c.beginPath(); c.ellipse(0, 0, 4.2 * p.s, 2.4 * p.s, 0, 0, TAU); c.fill(); c.restore(); }
    else if (th === 'snow') { p.y += (22 + p.s * 26) * dt; p.x += Math.sin(p.ph + t) * 8 * dt; c.fillStyle = `rgba(255,255,255,${.5 + p.k * .5})`; c.beginPath(); c.arc(p.x, p.y, 1.3 + p.s * 1.1, 0, TAU); c.fill(); }
    else { p.ph += dt; p.y -= (6 + p.s * 8) * dt; const a = .4 + .6 * Math.sin(p.ph * 2 + p.k * 7) ** 2; glowDot(c, p.x + Math.sin(p.ph) * 6, p.y, 6 * p.s, p.k < .5 ? '#ffe27a' : '#c8b8ff', a * .8); }
    if (p.y > L.H + 10 || p.x > L.W + 20 || p.x < -20 || p.y < L.fy * 0.2 - 30) { Object.assign(p, newParticle(L, th, false)); if (th === 'autumn') p.x = L.W * Math.random() + 60; if (th === 'temple' || th === 'lake') p.y = L.fy + L.fh * Math.random(); if (th === 'temple') p.y = L.fy + L.fh; }
  }
}
function todOverlay(c, L, frac) {
  if (PERF.lite) return;
  const k = ART.th.tod; let a = k[0], b = k[k.length - 1];
  for (let i = 0; i < k.length - 1; i++) if (frac >= k[i][0] && frac <= k[i + 1][0]) { a = k[i]; b = k[i + 1]; break; }
  const t = (frac - a[0]) / ((b[0] - a[0]) || 1), l = (i) => a[i] + (b[i] - a[i]) * t;
  const al = l(4); if (al <= 0.005) return;
  c.fillStyle = `rgba(${Math.round(l(1))},${Math.round(l(2))},${Math.round(l(3))},${al})`; c.fillRect(0, 0, L.W, L.H);
}
