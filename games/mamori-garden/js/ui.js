'use strict';
// ===== UI（画面・HUD・入力） =====
const APP = {
  screen: 'title', portrait: false, L: makeLayout(false), cv: null, c: null, scale: 1, css: 1,
  save: null, stage: 0, endless: false, mapEndless: false, focus: 'sword', btns: [], hover: null, down: null,
  ptr: { x: 0, y: 0, down: false, touch: false, moved: 0 }, b: null, toast: null, t: 0, fadeT: 0,
  debugAll: /[?&]all=1/.test(location.search),
};
const COL = { panel: 'rgba(24,18,64,.84)', gold: '#ffe9a8', pink: '#ff8ac8', teal: '#6ee7d8', text: '#fff8e8', dim: '#b9b0e0' };

// ---------- セーブ ----------
function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem('mamori-garden-v1')); } catch (e) { }
  s = normalizeSave(s);
  return s;
}
function saveSave() { try { localStorage.setItem('mamori-garden-v1', JSON.stringify(APP.save)); } catch (e) { } }
function isUnlocked(key) {
  return isOwned(APP.save, key, APP.debugAll);
}
function unlockHint(key) { return 'ガチャで入手'; }
function stageOpen(i) { return APP.debugAll || i === 0 || APP.save.stars[i - 1] > 0; }

// ---------- 描画ヘルパー ----------
function txt(c, s, x, y, size, col, align, o) {
  o = o || {}; c.font = `${o.weight || 'bold'} ${size}px ${FONT}`; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic';
  let sq = 1;   // maxW を超えるときは、まず小さく（最小7px）、それでも入らなければ横にちぢめる
  if (o.maxW) { let w = c.measureText(s).width; if (w > o.maxW) { const ns = Math.max(7, size * o.maxW / w); size = ns; c.font = `${o.weight || 'bold'} ${size}px ${FONT}`; w = c.measureText(s).width; if (w > o.maxW) sq = o.maxW / w; } }
  if (sq !== 1) { c.save(); c.translate(x, y); c.scale(sq, 1); x = 0; y = 0; }
  if (o.outline !== false) { c.lineJoin = 'round'; c.lineWidth = o.lw || Math.max(2.5, size / 5); c.strokeStyle = o.oc || 'rgba(40,20,70,.85)'; c.strokeText(s, x, y); }
  c.fillStyle = col || COL.text; c.fillText(s, x, y);
  if (sq !== 1) c.restore();
}
function wrapText(c, s, x, y, w, lh, size, col, maxLines) {
  c.font = `bold ${size}px ${FONT}`; let line = '', n = 0;
  for (const ch of s) {
    if (c.measureText(line + ch).width > w) { txt(c, line, x, y + n * lh, size, col, 'left', { outline: false }); n++; line = ch; if (maxLines && n >= maxLines) return n; } else line += ch;
  }
  if (line) { txt(c, line, x, y + n * lh, size, col, 'left', { outline: false }); n++; } return n;
}
function panelBox(c, x, y, w, h, o) {
  o = o || {}; rr(c, x, y, w, h, o.r || 12);
  c.fillStyle = o.fill || COL.panel; c.fill();
  c.strokeStyle = o.stroke || 'rgba(255,233,168,.75)'; c.lineWidth = o.lw || 2; c.stroke();
  if (o.shine !== false) { rr(c, x + 2, y + 2, w - 4, Math.min(h * .45, 30), (o.r || 12) - 2); const g = c.createLinearGradient(0, y, 0, y + h * .45); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fill(); }
}
const BTN_STYLE = {
  primary: ['#ffb86b', '#ff7a8a'], good: ['#7ae8c8', '#3aa8d8'], ghost: ['#4a4290', '#2f2866'], danger: ['#ff8a8a', '#d84a6a'], gold: ['#ffe27a', '#ffb23a'], off: ['#555070', '#403c58'],
};
function inRect(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function button(id, x, y, w, h, label, o, onClick, onDown) {
  o = o || {}; const hov = APP.hover === id, prs = APP.down && APP.down.id === id, dis = o.disabled;
  const st = BTN_STYLE[dis ? 'off' : (o.style || 'ghost')], c = APP.c, dy = prs && !dis ? 2 : 0;
  if (o.transparent) {   // 見えない当たり判定（カード全体など）
    if ((hov || prs) && !dis) { rr(c, x, y, w, h, o.r || 10); c.fillStyle = prs ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.08)'; c.fill(); }
    APP.btns.push({ id, x, y, w, h, onClick: dis ? null : onClick, onDown: dis ? null : onDown, dis }); return;
  }
  c.save(); c.translate(0, dy);
  c.fillStyle = 'rgba(0,0,0,.28)'; rr(c, x, y + 3, w, h, o.r || 10); c.fill();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, st[0]); g.addColorStop(1, st[1]); rr(c, x, y, w, h, o.r || 10); c.fillStyle = g; c.fill();
  c.strokeStyle = dis ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.7)'; c.lineWidth = 1.6; c.stroke();
  if (hov && !dis) { rr(c, x, y, w, h, o.r || 10); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill(); }
  const fs = o.size || Math.min(18, h * .42);
  if (label) {
    const lines = String(label).split('\n');
    lines.forEach((ln, i) => txt(c, ln, x + w / 2, y + h / 2 + fs * .35 + (i - (lines.length - 1) / 2) * (fs + 2), fs, dis ? '#a09cb8' : (o.col || '#fff'), 'center', { oc: dis ? 'rgba(20,10,40,.6)' : 'rgba(70,20,60,.75)', maxW: w - 12 }));
  }
  if (o.draw) o.draw(c, x, y, w, h);
  if (o.glow && !dis) glowRing(c, x, y, w, h, o.r || 10, o.glow === true ? '#fff2a0' : o.glow);
  c.restore();
  APP.btns.push({ id, x, y, w, h, onClick: dis ? null : onClick, onDown: dis ? null : onDown, dis });
}
// 「いま押せる」ことを知らせる、ゆっくり脈打つ光のふち
function glowRing(c, x, y, w, h, r, col) {
  const p = .5 + .5 * Math.sin(APP.t * 4.2); c.save();
  if (!PERF.lite) { c.shadowColor = col; c.shadowBlur = 6 + p * 12; }
  rr(c, x - 1, y - 1, w + 2, h + 2, r + 1); c.strokeStyle = rgba(col, .45 + p * .5); c.lineWidth = 2 + p * 1.6; c.stroke(); c.restore();
}
function hitBtn(x, y) { for (let i = APP.btns.length - 1; i >= 0; i--) if (inRect(APP.btns[i], x, y)) return APP.btns[i]; return null; }
function toast(s) { APP.toast = { s, t: 0 }; }
function enemyIcon(c, type, x, y, size, t) { drawEnemyIcon(c, type, x, y + size * .5, size, t); }
function coinIcon(c, x, y, r) { E(c, x, y, r, r, '#ffd23a'); E(c, x, y, r * .62, r * .62, '#ffec8a', false); }
function heartIcon(c, x, y, r) { c.fillStyle = '#ff5a8a'; c.strokeStyle = 'rgba(80,10,40,.8)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y + r * .9); c.bezierCurveTo(x - r * 1.5, y - r * .1, x - r * .6, y - r * 1.2, x, y - r * .4); c.bezierCurveTo(x + r * .6, y - r * 1.2, x + r * 1.5, y - r * .1, x, y + r * .9); c.fill(); c.stroke(); E(c, x - r * .4, y - r * .35, r * .22, r * .16, 'rgba(255,255,255,.7)', false); }

// ---------- レイアウト・キャンバス ----------
function pickPortrait() { return window.innerHeight > window.innerWidth * 1.05; }
function setLayout(portrait) {
  APP.portrait = portrait; APP.L = makeLayout(portrait); fitCanvas();
}
function fitCanvas() {
  const L = APP.L, cv = APP.cv, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const css = Math.min(window.innerWidth / L.W, window.innerHeight / L.H);
  APP.css = css; ART.sc = Math.max(1, Math.min(PERF.lite ? 1.25 : 2, dpr * css));
  const w = Math.round(L.W * ART.sc), h = Math.round(L.H * ART.sc);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; ART.bgKey = ''; }
  cv.style.width = Math.floor(L.W * css) + 'px'; cv.style.height = Math.floor(L.H * css) + 'px';
  APP.c = cv.getContext('2d'); APP.c.setTransform(ART.sc, 0, 0, ART.sc, 0, 0);
}
function ensureMenuBg(stageIdx) {
  const L = APP.L, key = stageIdx + (L.portrait ? 'p' : 'l');
  if (ART.bgKey !== key) makeBackground(stageIdx, L, buildPath(STAGES[stageIdx], L), []);
}
function drawMenuBg(c, dt, stageIdx, dark) {
  const L = APP.L; ensureMenuBg(stageIdx);
  c.drawImage(ART.bg, 0, 0, L.W, L.H); drawSceneryAnim(c, L, dt);
  c.fillStyle = `rgba(10,6,40,${dark == null ? .38 : dark})`; c.fillRect(0, 0, L.W, L.H);
}
function go(screen) {
  const was = APP.screen;
  APP.screen = screen; APP.fadeT = 0;
  if (screen !== 'battle' && pickPortrait() !== APP.portrait) setLayout(pickPortrait());
  if (screen === 'battle') { bgmStart(STAGES[APP.stage].theme); } else if (screen === 'title' || screen === 'map' || screen === 'formation') { bgmStart('meadow'); bgmIntensity(0); }
}

// ---------- タイトル ----------
function drawTitle(c, dt) {
  const L = APP.L, t = APP.t; drawMenuBg(c, dt, 0, 0.12);
  const cx = L.W / 2, ty = L.portrait ? 250 : 190;
  c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, ty, L.portrait ? 280 : 340, '#ffe9a8', .35); c.restore();
  const fs = L.portrait ? 78 : 96;
  c.save(); c.font = `bold ${fs}px ${FONT}`; c.textAlign = 'center';
  const g = c.createLinearGradient(0, ty - fs, 0, ty + 10); g.addColorStop(0, '#fffbe0'); g.addColorStop(.55, '#ffd1ec'); g.addColorStop(1, '#ff9ad0');
  c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = 'rgba(90,30,110,.9)'; c.strokeText('まもりの庭', cx, ty); c.lineWidth = 6; c.strokeStyle = '#fff'; c.strokeText('まもりの庭', cx, ty); c.fillStyle = g; c.fillText('まもりの庭', cx, ty);
  c.restore();
  txt(c, '〜 小さな仲間と、うつくしい世界を守ろう 〜', cx, ty + 44, L.portrait ? 17 : 22, '#fff8e8', 'center');
  // 仲間のパレード
  const keys = ['sword', 'archer', 'mage', 'ice', 'siren', 'priest', 'thunder'], n = L.portrait ? 5 : 7, gap = L.W / (n + 1), by = L.portrait ? 520 : 420;
  for (let i = 0; i < n; i++) { const k = keys[i], x = gap * (i + 1), y = by + Math.sin(t * 2 + i) * 4; c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y + 4, 24, 7, 0, 0, TAU); c.fill(); drawSpriteAt(c, k, x, y, 96, t + i, 0, { hatch: 0 }, 1); }
  const bw = L.portrait ? 320 : 300, bx = cx - bw / 2, by2 = L.portrait ? 620 : 500;
  button('t_start', bx, by2, bw, 66, 'はじめる', { style: 'primary', size: 28 }, () => { go('map'); });
  button('t_gacha', bx, by2 + 78, bw / 2 - 6, 54, 'ガチャ', { style: 'gold', size: 20, col: '#5a3000' }, () => { APP.gacha = null; go('gacha'); });
  button('t_coll', bx + bw / 2 + 6, by2 + 78, bw / 2 - 6, 54, 'なかま強化', { style: 'good', size: 17 }, () => { APP.cfocus = APP.save.form[0]; go('collection'); });
  button('t_snd', L.W - 130, 12, 116, 34, AUD.muted ? 'おと：OFF' : 'おと：ON', { style: 'ghost', size: 14 }, () => { audioMute(!AUD.muted); });
  button('t_q', L.W - 130, 92, 116, 34, PERF.lite ? 'がぞう：かんたん' : 'がぞう：きれい', { style: 'ghost', size: 12 }, () => perfSet(!PERF.lite));
  button('t_fx', L.W - 130, 52, 116, 34, FXCFG.on ? 'エフェクト：ON' : 'エフェクト：OFF', { style: 'ghost', size: 12 }, () => { fxSetOn(!FXCFG.on); });
  gemChip(c, 12, 12, 130);
  txt(c, 'ドラッグで好きな場所に置いて、重ねて合成！', cx, ty + (L.portrait ? 72 : 76), 15, '#fff8e8', 'center', { outline: false });
}

// ---------- マップ ----------
function drawStageThumb(c, i, x, y, w, h, locked, t) {
  const th = THEMES[STAGES[i].theme];
  c.save(); rr(c, x, y, w, h, 12); c.clip();
  c.fillStyle = vgrad(c, y, y + h * .45, th.sky); c.fillRect(x, y, w, h * .5);
  c.fillStyle = th.mount[0]; c.beginPath(); c.moveTo(x, y + h * .45); for (let k = 0; k <= 8; k++) c.lineTo(x + w * k / 8, y + h * (.3 + .1 * Math.sin(k * 1.7 + i))); c.lineTo(x + w, y + h * .5); c.lineTo(x, y + h * .5); c.fill();
  c.fillStyle = vgrad(c, y + h * .45, y + h, th.ground); c.fillRect(x, y + h * .45, w, h * .55);
  const P = STAGES[i].path; c.strokeStyle = th.pathMain; c.lineWidth = Math.max(5, h * .06); c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath();
  P.forEach(([u, v], k) => { const px = x + clamp(u, 0, 1) * w, py = y + h * .5 + (v * .46 + .02) * h; k ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
  if (!locked) { const bx = x + w * .5, by = y + h * .48; drawSprFrame(c, 'b', STAGES[i].boss, bx, by + Math.min(w, h) * .12, Math.min(w, h) * .5, 1, t, 0); }
  else { c.fillStyle = 'rgba(10,6,30,.62)'; c.fillRect(x, y, w, h); }
  c.restore();
}

// ---------- 編成 ----------
function unitCard(c, key, x, y, w, h, o) {
  o = o || {}; const d = UNITS[key], ec = ELEM[d.elem].c, locked = o.locked;
  panelBox(c, x, y, w, h, { r: 10, fill: locked ? 'rgba(30,26,60,.9)' : 'rgba(40,32,100,.9)', stroke: o.sel ? '#ffe27a' : o.focus ? '#ff9ad0' : 'rgba(180,170,230,.55)', lw: o.sel ? 3 : 1.6, shine: !locked });
  const g = c.createRadialGradient(x + w / 2, y + h * .5, 0, x + w / 2, y + h * .5, w * .6); g.addColorStop(0, rgba(ec, locked ? .08 : .3)); g.addColorStop(1, rgba(ec, 0)); c.fillStyle = g; rr(c, x, y, w, h, 10); c.fill();
  c.save(); if (locked) c.globalAlpha = .35;
  drawSpriteAt(c, key, x + w / 2, y + h * (o.small ? .7 : .7), Math.min(w * .74, h * .55), APP.t + d.no, 0, { hatch: 0, key }, 1); c.restore();
  if (locked) { txt(c, '🔒', x + w / 2, y + h * .42, 22, '#fff', 'center', { outline: false }); txt(c, o.hint || '', x + w / 2, y + h - 8, 10, '#bdb6e0', 'center', { outline: false }); }
  else {
    txt(c, d.name, x + w / 2, y + 15, Math.min(12, w / 8.2), '#fff', 'center', { lw: 3, maxW: w - 8 });
    if (!o.small) tierBadge(c, key, x + 11, y + 28);
    if (!o.noCost) { coinIcon(c, x + 14, y + h - 12, 6.5); txt(c, '' + (o.cost != null ? o.cost : d.cost), x + 24, y + h - 7, 13, '#ffe27a', 'left'); }
    E(c, x + w - 13, y + h - 12, 6, 6, ec); txt(c, ELEM[d.elem].n, x + w - 13, y + h - 8, 9, '#3a2050', 'center', { outline: false });
  }
  if (o.lv > 0) { rr(c, x + 5, y + h * .4, 28, 14, 7); c.fillStyle = 'rgba(20,50,110,.85)'; c.fill(); txt(c, 'Lv' + o.lv, x + 19, y + h * .4 + 11, 10, '#bff6ff', 'center', { outline: false }); }
  if (o.bar) {
    const bx = x + 6, by = y + h - 17, bw = w - 12; rr(c, bx, by, bw, 12, 6); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill();
    const f = clamp(o.bar.v / (o.bar.max || 1), 0, 1); if (f > 0) { rr(c, bx, by, Math.max(10, bw * f), 12, 6); c.fillStyle = o.bar.full ? '#ffe27a' : '#6ad0ff'; c.fill(); }
    txt(c, o.bar.text, x + w / 2, by + 10, 10, '#fff', 'center', { lw: 2.5 });
  }
  if (o.order) { E(c, x + w - 13, y + h * .46, 9, 9, '#ffe27a'); txt(c, '' + o.order, x + w - 13, y + h * .46 + 4.5, 12, '#6a3a10', 'center', { outline: false }); }
}
// レア度の小さな札（C/R/E/L/M）
const TIER_SHORT = { C: 'C', R: 'R', E: 'E', L: 'L', U: 'M' };
function tierBadge(c, key, x, y) {
  const t = tierOf(key), col = TIER_COL[t]; c.save(); c.fillStyle = 'rgba(20,10,50,.85)'; rr(c, x - 8, y - 8, 16, 16, 5); c.fill(); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
  txt(c, TIER_SHORT[t], x, y + 4.4, 11, col, 'center', { outline: false }); c.restore();
}
function unitDetail(c, key, x, y, w, h, lv) {
  const d = UNITS[key], ec = ELEM[d.elem].c, L = APP.L;
  panelBox(c, x, y, w, h, { r: 14 });
  if (lv) { const b = levelBonus(key, lv), parts = []; if (b.atk > 1.001) parts.push('攻撃+' + Math.round((b.atk - 1) * 100) + '%'); if (b.aspd > 1.001) parts.push('速度+' + Math.round((b.aspd - 1) * 100) + '%'); if (b.range > 1.001) parts.push('射程+' + Math.round((b.range - 1) * 100) + '%'); if (b.ab > 1.001) parts.push('能力+' + Math.round((b.ab - 1) * 100) + '%');
    txt(c, 'Lv' + lv + (parts.length ? '：' + parts.join(' ') : ''), x + 16, y + 154, 12, '#bff6ff', 'left', { outline: false }); txt(c, GROW_LABEL[GROW[key]], x + w - 14, y + 154, 11, '#ffd0a8', 'right', { outline: false }); }
  const g = c.createRadialGradient(x + 70, y + 80, 0, x + 70, y + 80, 90); g.addColorStop(0, rgba(ec, .4)); g.addColorStop(1, rgba(ec, 0)); c.fillStyle = g; c.fillRect(x, y, 160, 170);
  drawSpriteAt(c, key, x + 70, y + 118, 112, APP.t, 0, { hatch: 0, key }, 1);
  txt(c, d.name, x + 140, y + 34, 22, '#fff8e8');
  { const t = tierOf(key), col = TIER_COL[t], tw = 12 + TIER_NAME[t].length * 11; rr(c, x + w - 14 - tw, y + 12, tw, 18, 9); c.fillStyle = 'rgba(20,10,50,.85)'; c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); txt(c, TIER_NAME[t], x + w - 14 - tw / 2, y + 25, 11, col, 'center', { outline: false }); }
  E(c, x + 150, y + 54, 9, 9, ec); txt(c, ELEM[d.elem].n, x + 150, y + 58, 11, '#3a2050', 'center', { outline: false });
  txt(c, `${d.role}型`, x + 168, y + 59, 13, COL.dim, 'left', { outline: false });
  const stat = (lab, val, px, py) => { txt(c, lab, px, py, 11, COL.dim, 'left', { outline: false }); txt(c, val, px, py + 17, 15, '#fff', 'left', { lw: 3 }); };
  stat('コスト', d.cost + 'G', x + 140, y + 82); stat('攻撃力', d.atk ? fmtNum(d.atk * DMG_SCALE) : '―', x + 205, y + 82);
  stat('攻撃速度', d.aspd ? d.aspd.toFixed(2) : '―', x + 140, y + 122); stat('射程', d.range ? d.range + 'マス' : '―', x + 205, y + 122);
  txt(c, d.dmg === 'phys' ? '物理' : d.dmg === 'magic' ? '魔法' : d.dmg === 'true' ? '無属性' : '', x + w - 14, y + 59, 14, d.dmg === 'phys' ? '#ffb07a' : d.dmg === 'true' ? '#e0c8ff' : '#9ad0ff', 'right');
  const ay = y + 168, lh = L.portrait ? 30 : 34, labs = ['★1', '★3', '★5', '★7'], cols = ['#e8efff', '#ffc24a', '#ffe27a', '#ff9ad0'];
  d.ab.forEach((a, i) => {
    const yy = ay + i * lh; txt(c, labs[i], x + 16, yy + 14, 14, cols[i], 'left');
    wrapText(c, a, x + 58, yy + 14, w - 74, 15, 12, '#f1ecff', 2);
  });
}

// ---------- 戦闘開始 ----------

// ---------- 戦闘UI ----------
function panelRects(L) {
  const P = L.panelY, r = {};
  if (!L.portrait) {
    r.cards = []; for (let i = 0; i < 5; i++) r.cards.push({ x: 10 + i * 116, y: P + 6, w: 110, h: 86 });
    r.upg = r.cards.map(k => ({ x: k.x, y: k.y + k.h + 3, w: k.w, h: 28 }));
    r.info = { x: 598, y: P + 6, w: 352, h: 74 };
    const by = P + 84, bh = 36; r.rand = { x: 598, y: by, w: 112, h: bh }; r.merge = { x: 716, y: by, w: 72, h: bh }; r.sell = { x: 794, y: by, w: 72, h: bh }; r.go = { x: 872, y: by, w: 78, h: bh };
  } else {
    const x0 = (L.W - (5 * 96 + 24)) / 2; r.cards = []; for (let i = 0; i < 5; i++) r.cards.push({ x: x0 + i * 102, y: P + 8, w: 96, h: 92 });
    r.upg = r.cards.map(k => ({ x: k.x, y: k.y + k.h + 3, w: k.w, h: 28 }));
    r.info = { x: x0, y: P + 136, w: L.W - x0 * 2, h: 60 };
    const by = P + 202, bh = 44; r.rand = { x: x0, y: by, w: 150, h: bh }; r.merge = { x: x0 + 156, y: by, w: 100, h: bh }; r.sell = { x: x0 + 262, y: by, w: 100, h: bh }; r.go = { x: x0 + 368, y: by, w: L.W - x0 * 2 - 368, h: bh };
  }
  return r;
}
function fieldPoint() {   // ドラッグ/配置中の座標（タッチは指の上に表示）
  const p = APP.ptr, S = APP.L.S; return { x: p.x, y: p.y - (p.touch ? S * 1.5 : 0) };
}
function inField(x, y) { const L = APP.L; return x >= L.fx && x <= L.fx + L.fw && y >= L.fy - 10 && y <= L.fy + L.fh; }
function unitAt(x, y) {
  let best = null, bd = G.L.S * 0.8;
  for (const u of G.units) { const d = Math.hypot(u.x - x, (u.y - G.L.S * 0.3) - y); if (d < bd) { bd = d; best = u; } }
  return best;
}
function battleDown(x, y) {
  const B = APP.b; if (B.paused || G.over) return;
  if (!inField(x, y)) return;
  if (B.placing) { B.ptrField = true; return; }
  const u = unitAt(x, y);
  if (u) { B.dragU = { u, sx: x, sy: y, moved: false, ox: u.x, oy: u.y }; B.sel = u; }
  else B.sel = null;
}
function battleMove(x, y) {
  const B = APP.b; if (!B || B.paused) return;
  if (B.dragU && !B.dragU.moved && Math.hypot(x - B.dragU.sx, y - B.dragU.sy) > 8) B.dragU.moved = true;
}
function battleUp(x, y, downBtn) {
  const B = APP.b; if (!B || G.over) return;
  const S = G.L.S;
  if (B.dragU) {
    const dr = B.dragU; B.dragU = null;
    if (dr.moved) {
      const p = fieldPoint();
      let target = null, bd = S * 0.85;
      for (const o of G.units) if (o !== dr.u) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; target = o; } }
      if (target && canMerge(dr.u, target)) { mergeUnits(dr.u, target); B.sel = target; }
      else if (target) { toast('同じモンスター・同じ★でないと合成できません'); }
      else if (inField(p.x, p.y) && moveUnit(dr.u, p.x, p.y)) { FX.ring(p.x, p.y, S, '#ffffff'); SFX.play('click'); }
    }
    return;
  }
  const pl = B.placing;
  if (pl) {
    const rects = panelRects(G.L);
    if (pl.fromCard != null && !pl.sticky) {
      // カードから離した
      if (downBtn && inRect(rects.cards[pl.fromCard], x, y) && APP.ptr.moved < 14) { pl.sticky = true; pl.fromCard = null; return; }   // タップ → 置き場所を選ぶモード
      const p = fieldPoint();
      if (inField(p.x, p.y)) tryPlace(pl.key, p); B.placing = null; return;
    }
    if (B.ptrField) { B.ptrField = false; const p = fieldPoint(); if (inField(p.x, p.y)) { tryPlace(pl.key, p); if (!B.placing) return; if (G.gold < summonCost(pl.key, B.sumStar)) B.placing = null; } }
  }
}
function tryPlace(key, p) {
  const d = UNITS[key];
  if (G.gold < summonCost(key, APP.b.sumStar)) { toast('ゴールドが足りません'); return false; }
  if (G.units.length >= unitCap()) { toast('仲間がいっぱい！ 合成か売却で場所をあけよう'); return false; }
  if (!canPlace(p.x, p.y)) { toast('そこには置けません（道・他のキャラと重なる）'); return false; }
  const u = summonAt(key, p.x, p.y, APP.b.sumStar); if (u) { APP.b.sel = u; return true; } return false;
}
function selectCard(i, sticky) {
  const B = APP.b, key = G.form[i]; if (!key) return;
  if (B.placing && B.placing.key === key && sticky) { B.placing = null; return; }
  B.placing = { key, sticky: !!sticky, fromCard: sticky ? null : i }; B.sel = null;
}
function doRandom() {
  const B = APP.b; if (G.over) return;
  if (G.gold < randCost()) { toast('ゴールドが足りません'); return; }
  if (G.units.length >= unitCap()) { toast('仲間がいっぱい！ 合成か売却で場所をあけよう'); return; }
  const u = randomSummon(); if (!u) toast('置く場所がありません'); else B.sel = u;
}
function doMerge() { const B = APP.b; if (!B.sel) return; const p = findMergePartner(B.sel); if (p) { mergeUnits(B.sel, p); B.sel = p; } else toast('合成できる仲間がいません'); }
function doSell() { const B = APP.b; if (!B.sel) return; sellUnit(B.sel); B.sel = null; }

function drawHud(c, B, dt) {
  const L = G.L, p = L.portrait;
  // 上部バー
  const hh = p ? 54 : 46;
  const g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, 'rgba(20,12,56,.92)'); g.addColorStop(1, 'rgba(20,12,56,.55)'); c.fillStyle = g; c.fillRect(0, 0, L.W, hh);
  c.fillStyle = 'rgba(255,233,168,.5)'; c.fillRect(0, hh - 1, L.W, 1);
  const lifeX = 14, goldX = p ? 100 : 118;
  heartIcon(c, lifeX + 10, hh / 2 - 1, 10); txt(c, '' + Math.ceil(G.life), lifeX + 28, hh / 2 + 7, 22, G.life <= 5 ? '#ff7a7a' : '#fff', 'left');
  // ゴールド（表示は滑らかに追従）
  B.gShow = B.gShow == null ? G.gold : B.gShow + (G.gold - B.gShow) * Math.min(1, dt * 10);
  const gx = goldX + 12; coinIcon(c, gx, hh / 2, 11); ART.coinTarget.x = gx; ART.coinTarget.y = hh / 2;
  txt(c, '' + Math.round(B.gShow), gx + 18, hh / 2 + 8, 24, '#ffe27a', 'left');
  // ウェーブ
  const wx = p ? L.W / 2 + 6 : L.W / 2 - 40;
  const wl = G.endless ? `WAVE ${G.wave || 1}` : `WAVE ${G.wave || 1}/${MAX_WAVE}`;
  txt(c, wl, p ? 268 : L.W / 2, hh / 2 + 3, p ? 17 : 20, '#fff8e8', 'center');
  const pg = clamp(G.endless ? ((G.wave || 0) % 10) / 10 : (G.wave - (G.phase === 'prep' ? 0 : 0.5)) / MAX_WAVE, 0, 1), bx = p ? 200 : L.W / 2 - 90, bw = p ? 136 : 180, by = hh / 2 + 10;
  rr(c, bx, by, bw, 6, 3); c.fillStyle = 'rgba(0,0,0,.4)'; c.fill(); rr(c, bx, by, Math.max(6, bw * pg), 6, 3); c.fillStyle = '#ff9ad0'; c.fill();
  if (!G.endless) for (const m of [10, 20]) { c.fillStyle = '#ffe27a'; c.fillRect(bx + bw * m / MAX_WAVE - 1, by - 2, 2, 10); }
  // ボタン
  const bs = p ? 38 : 34, rx = L.W - 10;
  button('h_pause', rx - bs, (hh - bs) / 2, bs, bs, '', { style: 'ghost', draw: (c2, x, y, w, h) => { c2.fillStyle = '#fff'; c2.fillRect(x + w * .3, y + h * .26, w * .13, h * .48); c2.fillRect(x + w * .57, y + h * .26, w * .13, h * .48); } }, () => { B.paused = true; });
  button('h_speed', rx - bs * 2 - 6, (hh - bs) / 2, bs + 6, bs, 'x' + B.speed, { style: B.speed > 1 ? 'good' : 'ghost', size: 15 }, () => { B.speed = B.speed % 3 + 1; });
  button('h_snd', rx - bs * 3 - 18, (hh - bs) / 2, bs, bs, '', { style: 'ghost', draw: (c2, x, y, w, h) => { c2.fillStyle = AUD.muted ? '#8a84a8' : '#fff'; c2.beginPath(); c2.moveTo(x + w * .26, y + h * .4); c2.lineTo(x + w * .4, y + h * .4); c2.lineTo(x + w * .56, y + h * .26); c2.lineTo(x + w * .56, y + h * .74); c2.lineTo(x + w * .4, y + h * .6); c2.lineTo(x + w * .26, y + h * .6); c2.fill(); if (!AUD.muted) { c2.strokeStyle = '#fff'; c2.lineWidth = 2; c2.beginPath(); c2.arc(x + w * .58, y + h * .5, w * .16, -1, 1); c2.stroke(); } else { c2.strokeStyle = '#ff8a8a'; c2.lineWidth = 2.4; c2.beginPath(); c2.moveTo(x + w * .66, y + h * .36); c2.lineTo(x + w * .86, y + h * .64); c2.moveTo(x + w * .86, y + h * .36); c2.lineTo(x + w * .66, y + h * .64); c2.stroke(); } } }, () => audioMute(!AUD.muted));
  button('h_fx', rx - bs * 4 - 30, (hh - bs) / 2, bs, bs, 'FX', { style: FXCFG.on ? 'good' : 'ghost', size: 13 }, () => { fxSetOn(!FXCFG.on); });
  { const dn = DIFFS[G.diff], w = 96; panelBox(c, L.W / 2 - w / 2, L.fy + 6, w, 22, { r: 11, fill: 'rgba(24,18,64,.7)', stroke: dn.col, lw: 1.2, shine: false }); txt(c, dn.name, L.W / 2, L.fy + 22, 12, dn.col, 'center', { outline: false }); }
  // 仲間の数
  { const full = G.units.length >= unitCap(), w = 96, x = L.W - w - 10, y = L.fy + 8; panelBox(c, x, y, w, 28, { r: 10, fill: full ? 'rgba(120,30,60,.85)' : 'rgba(24,18,64,.7)', stroke: full ? '#ff9a9a' : 'rgba(255,233,168,.4)', lw: 1.2, shine: false }); txt(c, `仲間 ${G.units.length}/${MAX_UNITS}`, x + w / 2, y + 19, 13, full ? '#ffd0d0' : '#fff', 'center', { outline: false }); }
  // 次ウェーブ予告 / 進行
  const py = L.fy + 8;
  if (G.phase === 'prep' && !G.over) {
    const nw = G.wave + 1, cnt = previewWave(nw), keys = Object.keys(cnt);
    const w = 92 + keys.length * 50, h = 56, x = 10;
    panelBox(c, x, py, w, h, { r: 12, fill: 'rgba(24,18,64,.78)', stroke: 'rgba(255,233,168,.5)', lw: 1.4 });
    txt(c, `次：WAVE ${nw}`, x + 10, py + 17, 12, nw % 10 === 0 ? '#ff9a9a' : '#ffe9a8', 'left', { outline: false });
    txt(c, Math.ceil(G.prepT) + '秒', x + 10, py + 40, 18, '#fff', 'left');
    keys.forEach((k, i) => { const ex = x + 106 + i * 50; enemyIcon(c, k, ex, py + 6, 30, APP.t); txt(c, '×' + cnt[k], ex, py + 50, 12, '#fff', 'center', { lw: 3 }); });
  } else if (G.phase === 'run') {
    const left = G.enemies.length + (G.spawnQ.length - G.spawnI);
    panelBox(c, 10, py, 112, 28, { r: 10, fill: 'rgba(24,18,64,.7)', stroke: 'rgba(255,233,168,.4)', lw: 1.2, shine: false });
    txt(c, `のこり ${left}体`, 66, py + 19, 13, '#fff', 'center', { outline: false });
  }
}

function drawPanel(c, B) {
  const L = G.L, R = panelRects(L), p = L.portrait;
  // パネル背景
  const g = c.createLinearGradient(0, L.panelY - 6, 0, L.H); g.addColorStop(0, 'rgba(30,22,80,.97)'); g.addColorStop(1, 'rgba(14,10,44,.99)'); c.fillStyle = g; c.fillRect(0, L.panelY - 4, L.W, L.H - L.panelY + 4);
  c.fillStyle = 'rgba(255,233,168,.7)'; c.fillRect(0, L.panelY - 4, L.W, 2);
  // カード
  for (let i = 0; i < 5; i++) {
    const key = G.form[i], r = R.cards[i]; if (!key) continue;
    const d = UNITS[key], sc = summonCost(key, B.sumStar), afford = G.gold >= sc, active = B.placing && B.placing.key === key;
    c.save(); if (!afford) c.globalAlpha = .6;
    unitCard(c, key, r.x, r.y, r.w, r.h, { cost: sc, sel: active, small: true, lv: (G.mlv[key] || 1) > 1 ? G.mlv[key] : 0 });
    c.restore();
    if (!afford) { rr(c, r.x, r.y, r.w, r.h, 10); c.fillStyle = 'rgba(10,6,30,.35)'; c.fill(); }
    else if (!active && G.units.length < unitCap() && !G.over) glowRing(c, r.x, r.y, r.w, r.h, 10, ELEM[d.elem].c);
    txt(c, '' + (i + 1), r.x + r.w - 10, r.y + 16, 11, 'rgba(255,255,255,.5)', 'right', { outline: false });
    const cnt = G.units.filter(u => u.key === key).length; if (cnt) txt(c, '×' + cnt, r.x + r.w - 8, r.y + 31, 11, COL.dim, 'right', { outline: false });
    const lv = G.lv[key] || 0, uc = upgradeCost(key), ur = R.upg[i];
    button('up' + i, ur.x, ur.y, ur.w, ur.h, uc == null ? `強化 MAX` : `Lv${lv}→${lv + 1}  ${uc}G`, { glow: uc != null && G.gold >= uc, style: uc != null && G.gold >= uc ? 'gold' : 'ghost', size: 12, col: uc != null && G.gold >= uc ? '#5a3000' : '#d8d2f5', r: 8, disabled: uc == null }, () => { if (!upgrade(key)) toast('ゴールドが足りません'); });
    button('card' + i, r.x, r.y, r.w, r.h, '', { style: 'ghost', transparent: true }, null, () => { if (G.over || B.paused) return; if (B.placing && B.placing.sticky && B.placing.key === key) { B.placing = null; return; } if (G.gold < sc) { toast('ゴールドが足りません'); return; } if (G.units.length >= unitCap()) { toast('仲間がいっぱい！ 合成か売却で場所をあけよう'); return; } selectCard(i, false); });
  }
  // ライフと、★いくつで召喚するか（召喚欄の右上）
  { const bw = 44, bh = 24, x0 = L.W - 3 * bw - 16, y0 = L.panelY - 30; if (!B.sumStar) B.sumStar = 1;
    panelBox(c, x0 - 106, y0, 98, bh, { r: 10, fill: 'rgba(24,18,64,.82)', stroke: G.life <= 5 ? '#ff7a7a' : 'rgba(255,233,168,.5)', lw: 1.2, shine: false }); heartIcon(c, x0 - 92, y0 + 12, 8); txt(c, 'ライフ ' + Math.ceil(G.life), x0 - 78, y0 + 17, 12, G.life <= 5 ? '#ff9a9a' : '#fff', 'left', { outline: false });
    for (let k = 1; k <= 3; k++) button('ss' + k, x0 + (k - 1) * (bw + 4), y0, bw, bh, '★' + k, { style: B.sumStar === k ? 'gold' : 'ghost', size: 13, col: B.sumStar === k ? '#5a3000' : '#ffe9a8', r: 8 }, () => { B.sumStar = k; B.placing = null; if (k > 1) toast('★' + k + 'をいきなり召喚（お値段 ×' + SUM_MUL[k - 1] + '）'); }); }
  // 情報
  const I = R.info; panelBox(c, I.x, I.y, I.w, I.h, { r: 10, fill: 'rgba(40,32,100,.55)', stroke: 'rgba(180,170,230,.4)', lw: 1.4, shine: false });
  const sel = B.sel && G.units.includes(B.sel) ? B.sel : null;
  if (sel) {
    const d = UNITS[sel.key], st = sel.st || computeStats(sel), stars = sel.key === 'egg' ? '' : '★'.repeat(sel.star);
    drawSpriteAt(c, sel.key, I.x + 30, I.y + I.h - 8, 50, APP.t, 0, sel, 1);
    const nm = sel.key === 'egg' ? (eggPhase(sel) ? DRAGON[eggPhase(sel)].name : '竜の卵') : d.name;
    txt(c, `${nm}  ${stars}`, I.x + 62, I.y + 20, 15, '#fff8e8');
    if (d.style === 'none') txt(c, `支援  範囲 ${(st.range / G.L.S).toFixed(1)}マス`, I.x + 62, I.y + 38, 12, COL.dim, 'left', { outline: false });
    else if (sel.key === 'egg' && !eggPhase(sel)) txt(c, `孵化まで あと${3 - sel.hatch}ウェーブ`, I.x + 62, I.y + 38, 12, COL.dim, 'left', { outline: false });
    else txt(c, `攻撃 ${fmtNum(st.atk)}  速度 ${st.aspd.toFixed(2)}  射程 ${(st.range / G.L.S).toFixed(1)}${st.res ? '  共鳴+' + st.res * 10 + '%' : ''}`, I.x + 62, I.y + 38, 12, '#e8e2ff', 'left', { outline: false });
    const idx = sel.key === 'egg' ? Math.min(3, eggPhase(sel)) : sel.star >= 7 ? 3 : sel.star >= 5 ? 2 : sel.star >= 3 ? 1 : 0;
    wrapText(c, d.ab[idx], I.x + 62, I.y + 56, I.w - 72, 13, 11, '#bfe9ff', 2);
  } else {
    const wb = waveBonus();
    txt(c, 'カードをドラッグして好きな場所へ！', I.x + 10, I.y + 19, 13, '#fff8e8', 'left', { outline: false });
    txt(c, '同じ仲間を同じ★で重ねると合成', I.x + 10, I.y + 36, 12, COL.dim, 'left', { outline: false });
    txt(c, `ウェーブ終了ボーナス 約${wb.base + wb.eco + wb.interest}G（利子+${wb.interest}）`, I.x + 10, I.y + 53, 12, '#ffe27a', 'left', { outline: false });
  }
  const mp = sel ? findMergePartner(sel) : null;
  button('b_rand', R.rand.x, R.rand.y, R.rand.w, R.rand.h, `おまかせ ${randCost()}G`, { glow: G.gold >= randCost() && G.units.length < unitCap(), style: G.gold >= randCost() ? 'primary' : 'ghost', size: p ? 15 : 14 }, doRandom);
  button('b_merge', R.merge.x, R.merge.y, R.merge.w, R.merge.h, '合成', { glow: !!mp, style: mp ? 'good' : 'off', disabled: !mp, size: 15 }, doMerge);
  button('b_sell', R.sell.x, R.sell.y, R.sell.w, R.sell.h, sel ? `売却\n+${sellValue(sel)}G` : '売却', { style: sel ? 'danger' : 'off', disabled: !sel, size: sel ? 12 : 15 }, doSell);
  button('b_go', R.go.x, R.go.y, R.go.w, R.go.h, G.phase === 'prep' ? `開始\n+${Math.floor(G.prepT) * 2}G` : 'たたかい中', { glow: G.phase === 'prep', style: G.phase === 'prep' ? 'good' : 'off', disabled: G.phase !== 'prep', size: 13 }, () => skipPrep());
}

function battleGuide(c) {   // フィールド下（範囲円・合成の目印）
  const B = APP.b, S = G.L.S, t = APP.t;
  const sel = B.sel && G.units.includes(B.sel) ? B.sel : null;
  const ring = (x, y, r, col, a, dash) => { c.save(); c.strokeStyle = rgba(col, a); c.lineWidth = 2; if (dash) c.setLineDash([6, 6]); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.fillStyle = rgba(col, a * .12); c.fill(); c.restore(); };
  if (sel && !(B.dragU && B.dragU.moved)) { const st = sel.st || computeStats(sel); if (st.range > 0 && st.range < 2000) ring(sel.x, sel.y, st.range, '#ffffff', .8); else if (st.range >= 2000) { /* 画面全体 */ } }
  const pl = B.placing, dr = B.dragU && B.dragU.moved ? B.dragU.u : null;
  if (pl || dr) {
    const p = fieldPoint(), key = pl ? pl.key : dr.key, d = UNITS[key], ok = inField(p.x, p.y) && canPlace(p.x, p.y, dr);
    if ((pl && B.ptrField) || dr || (pl && !APP.ptr.touch) || (pl && pl.fromCard != null)) {
      const base = pl ? (d.range) : (dr.st ? dr.st.range / S : d.range);
      if (inField(p.x, p.y) && base) ring(p.x, p.y, base * S * (pl ? 1 : 1), ok ? '#9affc0' : '#ff8a8a', .85, true);
    }
    // 合成できる相手を光らせる
    const me = dr || { key, star: 1, id: -1 };
    for (const o of G.units) if (o !== dr && o.star === me.star && o.star < MAX_STAR && o.key !== 'egg' && me.key !== 'egg' && (o.key === me.key || ((o.key === 'mimic' || me.key === 'mimic') && o.star <= MIMIC_MAX_STAR))) {
      const k = .5 + .5 * Math.sin(t * 6); c.save(); c.strokeStyle = `rgba(255,240,140,${.5 + k * .5})`; c.lineWidth = 3; c.beginPath(); c.arc(o.x, o.y - S * .3, S * (.8 + k * .12), 0, TAU); c.stroke(); c.restore();
      star5(c, o.x, o.y - S * 1.9 - k * 3, 5, '#fff48a', 'rgba(80,40,0,.7)');
    }
  }
}
function battleOver(c) {   // ユニットの上（ゴースト）
  const B = APP.b, S = G.L.S, t = APP.t, pl = B.placing, dr = B.dragU && B.dragU.moved ? B.dragU.u : null;
  if (!(pl || dr)) return;
  const p = fieldPoint(); if (!inField(p.x, p.y)) return;
  if (pl && !B.ptrField && APP.ptr.touch && pl.fromCard == null) return;
  const key = pl ? pl.key : dr.key, ok = canPlace(p.x, p.y, dr);
  c.save(); c.globalAlpha = ok ? .85 : .45;
  drawSpriteAt(c, key, p.x, p.y + S * .3, S * 1.6, t, 0, dr || { hatch: 0, key }, 1);
  c.restore();
  c.strokeStyle = ok ? '#9affc0' : '#ff8a8a'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y + S * .28, S * .55, S * .3, 0, 0, TAU); c.stroke();
}

function drawBattle(c, dt) {
  const B = APP.b, L = G.L;
  G.holdPrep = !!(B.placing || (B.dragU && B.dragU.moved));
  const hooks = { sel: B.sel, dragUnit: B.dragU && B.dragU.moved ? B.dragU.u : null, guide: battleGuide, over: battleOver };
  drawWorld(c, G, dt, hooks);
  drawOverlayFx(c, L);
  drawHud(c, B, dt);
  drawPanel(c, B);
  // ヒント
  if (B.hint && G.wave < 3 && G.phase === 'prep' && !B.paused) {
    const w = L.portrait ? 500 : 560, x = (L.W - w) / 2, y = L.fy + L.fh * (L.portrait ? .46 : .4);
    panelBox(c, x, y, w, 92, { r: 14, fill: 'rgba(24,18,64,.88)' });
    txt(c, '遊びかた', x + w / 2, y + 24, 15, '#ffe27a', 'center');
    txt(c, '① 下のカードを好きな場所へドラッグして仲間を召喚', x + 16, y + 48, L.portrait ? 13 : 15, '#fff', 'left', { outline: false });
    txt(c, '② 同じ仲間・同じ★どうしを重ねると合成してランクUP！', x + 16, y + 70, L.portrait ? 13 : 15, '#fff', 'left', { outline: false });
  }
  if (APP.toast) { const tt = APP.toast; tt.t += dt; const a = tt.t < 0.15 ? tt.t / 0.15 : tt.t > 1.4 ? Math.max(0, 1 - (tt.t - 1.4) / 0.4) : 1; if (tt.t > 1.8) APP.toast = null; else { c.save(); c.globalAlpha = a; const w = Math.min(L.W - 40, 400); panelBox(c, (L.W - w) / 2, L.panelY - 54, w, 38, { r: 19, fill: 'rgba(60,20,70,.92)', shine: false }); txt(c, tt.s, L.W / 2, L.panelY - 29, 14, '#fff', 'center', { outline: false }); c.restore(); } }
  // ポーズ
  if (B.paused && !G.over) {
    modal(c, L, 'ポーズ中');
    const bw = 240, x = L.W / 2 - bw / 2, y = L.H / 2 - 70;
    button('p_resume', x, y, bw, 52, '再開', { style: 'primary', size: 20 }, () => { B.paused = false; });
    button('p_q', x, y + 222, bw, 40, PERF.lite ? 'がぞう：かんたん（かるい）' : 'がぞう：きれい', { style: 'ghost', size: 14 }, () => perfSet(!PERF.lite));
    button('p_fx', x, y + 176, bw, 40, FXCFG.on ? 'エフェクト：ON' : 'エフェクト：OFF（かるくなる）', { style: 'ghost', size: 14 }, () => { fxSetOn(!FXCFG.on); });
    button('p_retry', x, y + 64, bw, 46, 'はじめからやり直す', { style: 'ghost', size: 16 }, () => startBattle());
    button('p_quit', x, y + 120, bw, 46, 'マップへもどる', { style: 'ghost', size: 16 }, () => { bgmIntensity(0); go('map'); });
  }
  if (G.over) drawResult(c, B, dt);
}
function modal(c, L, title) {
  c.fillStyle = 'rgba(8,4,28,.7)'; c.fillRect(0, 0, L.W, L.H);
  button('modal_bg', 0, 0, L.W, L.H, '', { style: 'ghost', transparent: true }, null);
  panelBox(c, L.W / 2 - 150, L.H / 2 - 150, 300, 310, { r: 18 });
  txt(c, title, L.W / 2, L.H / 2 - 108, 26, '#fff8e8', 'center');
}
function drawResult(c, B, dt) {
  B.resultT += dt; if (B.resultT < 1.3) return;
  finishBattle(B);
  const L = G.L, win = G.over === 'win', k = Math.min(1, (B.resultT - 1.3) * 3);
  c.fillStyle = `rgba(8,4,28,${.72 * k})`; c.fillRect(0, 0, L.W, L.H);
  button('res_bg', 0, 0, L.W, L.H, '', { style: 'ghost', transparent: true }, null);
  const w = Math.min(L.W - 30, 440), h = 400, x = (L.W - w) / 2, y = (L.H - h) / 2 - 10;
  c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 30);
  panelBox(c, x, y, w, h, { r: 20, stroke: win ? '#ffe27a' : '#9a8ac8' });
  const title = win ? 'ステージクリア！' : G.endless ? `WAVE ${Math.max(0, G.wave - 1)} まで到達！` : 'やられてしまった…';
  { const dn = DIFFS[G.diff]; txt(c, '難易度：' + dn.name + (B.diffUnlocked > 0 ? '　「' + DIFFS[B.diffUnlocked].name + '」が遊べるように！' : ''), L.W / 2, y + 22, 13, dn.col, 'center', { outline: false }); }
  txt(c, title, L.W / 2, y + 56, win ? 34 : 28, win ? '#fff3a0' : '#d8d0f5', 'center');
  if (!G.endless) { for (let i = 0; i < 3; i++) { const sx = L.W / 2 + (i - 1) * 56; star5(c, sx, y + 108 - (i === 1 ? 6 : 0), i === 1 ? 26 : 22, (B.starsGot || 0) > i ? '#ffe27a' : 'rgba(255,255,255,.15)', 'rgba(70,40,10,.8)'); } }
  const rows = [['到達ウェーブ', `${G.endless ? Math.max(0, G.wave - 1) : G.wave}${G.endless ? '' : ' / ' + MAX_WAVE}`], ['倒した敵', G.kills + '体'], ['かせいだゴールド', G.goldEarned + 'G'], ['のこりライフ', Math.ceil(G.life) + ' / ' + START_LIFE], ['もらったジェム', '+' + (B.gemsGot || 0) + (B.ticketGot ? '  ＋' + GACHAS[B.ticketGot].name.replace('ガチャ', '') + 'チケット' : '')]];
  rows.forEach((r, i) => { txt(c, r[0], x + 40, y + 156 + i * 27, 16, COL.dim, 'left', { outline: false }); txt(c, r[1], x + w - 40, y + 156 + i * 27, 18, '#fff', 'right'); });
  if (win && B.newUnits && B.newUnits.length) {
    txt(c, '新しい仲間が使えるように！', L.W / 2, y + 304, 15, '#ffb0e0', 'center');
    { const nn = B.newUnits.length, sp = Math.min(90, (w - 30) / Math.max(1, nn)); B.newUnits.forEach((k2, i) => { const ux = L.W / 2 + (i - (nn - 1) / 2) * sp; drawSpriteAt(c, k2, ux, y + 366, Math.min(56, sp * .85), APP.t, 0, { hatch: 0 }, 1); if (nn <= 5) txt(c, UNITS[k2].name, ux, y + 388, 11, '#fff', 'center'); }); }
  } else if (win && !G.endless && B.starsGot < 3) txt(c, '★3は「ライフを1つも減らさずクリア」', L.W / 2, y + 310, 13, COL.dim, 'center', { outline: false });
  c.restore();
  const by = y + h + 12, bw = Math.min(140, (w - 12) / 3);
  const bx0 = L.W / 2 - (bw * 3 + 12) / 2;
  button('r_map', bx0, by, bw, 48, 'マップへ', { style: 'ghost', size: 16 }, () => { bgmIntensity(0); go('map'); });
  button('r_retry', bx0 + bw + 6, by, bw, 48, 'もう一度', { style: 'good', size: 16 }, () => startBattle());
  const canNext = win && !G.endless && APP.stage < STAGES.length - 1;
  button('r_next', bx0 + (bw + 6) * 2, by, bw, 48, canNext ? '次のステージ' : '―', { style: canNext ? 'primary' : 'off', size: 15, disabled: !canNext }, () => { APP.stage++; go('formation'); });
}

// ---------- 入力 ----------
function logicalPos(e) { const r = APP.cv.getBoundingClientRect(); return [(e.clientX - r.left) * APP.L.W / r.width, (e.clientY - r.top) * APP.L.H / r.height]; }
function setupInput() {
  const cv = APP.cv;
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); audioInit();
    const [x, y] = logicalPos(e); APP.ptr = { x, y, down: true, touch: e.pointerType === 'touch', moved: 0, sx: x, sy: y };
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    if (e.button === 2) { if (APP.b) { APP.b.placing = null; APP.b.sel = null; } return; }
    APP.btns.length; const b = hitBtn(x, y);
    if (b) { APP.down = b; if (b.onDown) b.onDown(x, y); return; }
    APP.down = null; if (APP.screen === 'battle') battleDown(x, y);
  });
  cv.addEventListener('pointermove', e => {
    const [x, y] = logicalPos(e); APP.ptr.x = x; APP.ptr.y = y; if (APP.ptr.down) APP.ptr.moved = Math.hypot(x - APP.ptr.sx, y - APP.ptr.sy);
    const b = hitBtn(x, y); APP.hover = b && !b.dis && (b.onClick || b.onDown) ? b.id : null;
    if (APP.screen === 'battle') battleMove(x, y);
  });
  const up = e => {
    const [x, y] = logicalPos(e); APP.ptr.x = x; APP.ptr.y = y; const d = APP.down; APP.down = null; APP.ptr.down = false;
    const hit = d && inRect(d, x, y);
    if (hit && d.onClick) { SFX.play('click'); d.onClick(); }
    if (APP.screen === 'battle') battleUp(x, y, hit ? d : null);
  };
  cv.addEventListener('pointerup', e => { e.preventDefault(); up(e); });
  cv.addEventListener('pointercancel', () => { APP.down = null; APP.ptr.down = false; if (APP.b) { APP.b.dragU = null; if (APP.b.placing && !APP.b.placing.sticky) APP.b.placing = null; } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    audioInit(); const B = APP.b; if (APP.screen !== 'battle' || !B) return;
    if (G.over) return;
    if (e.key >= '1' && e.key <= '5') { const i = +e.key - 1, key = G.form[i]; if (key) { if (G.gold < summonCost(key, B.sumStar)) toast('ゴールドが足りません'); else selectCard(i, true); } }
    else if (e.key === 'r' || e.key === 'R') doRandom();
    else if (e.key === ' ' || e.key === 'n' || e.key === 'N') { e.preventDefault(); skipPrep(); }
    else if (e.key === 'p' || e.key === 'P') B.paused = !B.paused;
    else if (e.key === 'Escape') { if (B.placing) B.placing = null; else if (B.sel) B.sel = null; else B.paused = !B.paused; }
    else if (e.key === 'Delete' || e.key === 's' || e.key === 'S') doSell();
    else if (e.key === 'm' || e.key === 'M') doMerge();
    else if (e.key === 'f' || e.key === 'F') B.speed = B.speed % 3 + 1;
  });
  addEventListener('resize', () => { if (APP.screen !== 'battle') { if (pickPortrait() !== APP.portrait) setLayout(pickPortrait()); else fitCanvas(); } else fitCanvas(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && APP.b && APP.screen === 'battle') APP.b.paused = true; });
}
