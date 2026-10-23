'use strict';
// ===== ガチャ画面・なかま強化画面 =====
const TIER_COL = { C: '#cfd8ff', R: '#7ad0ff', E: '#d08aff', L: '#ffd24a' };
const easeBack = k => { const t = k - 1; return 1 + 2.70158 * t * t * t + 1.70158 * t * t; };

function gemIcon(c, x, y, r) {
  c.save(); c.translate(x, y); const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#d8fbff'); g.addColorStop(1, '#3a9aff');
  c.fillStyle = g; c.strokeStyle = 'rgba(20,40,100,.85)'; c.lineWidth = 1.4; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-r * .6, -r * .6); c.lineTo(r * .6, -r * .6); c.lineTo(r, -r * .1); c.lineTo(0, r); c.lineTo(-r, -r * .1); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(-r * .5, -r * .5); c.lineTo(-r * .1, -r * .5); c.lineTo(-r * .5, -r * .1); c.fill(); c.restore();
}
function gemChip(c, x, y, w) {
  panelBox(c, x, y, w, 30, { r: 15, fill: 'rgba(24,18,64,.82)', shine: false, lw: 1.4 });
  gemIcon(c, x + 16, y + 14, 8); txt(c, '' + APP.save.gems, x + w - 12, y + 21, 16, '#bff6ff', 'right');
}
function magicCircle(c, cx, cy, R, t, spin, pow) {
  c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, cy, R * 1.6, '#b07aff', .45 + pow * .4); glowDot(c, cx, cy, R * .8, '#ffe9a0', .25 + pow * .5); c.restore();
  c.save(); c.translate(cx, cy); c.rotate(t * spin); c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,233,168,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(200,170,255,.9)'; c.lineWidth = 2; c.setLineDash([8, 7]); c.beginPath(); c.arc(0, 0, R * .88, 0, TAU); c.stroke(); c.setLineDash([]);
  c.lineWidth = 1.6; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r0 = R * (i % 3 ? .94 : .9); c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * R * 1.0, Math.sin(a) * R * 1.0); c.stroke(); }
  c.strokeStyle = 'rgba(255,200,240,.9)'; c.lineWidth = 2.4; for (const off of [0, Math.PI]) { c.beginPath(); for (let i = 0; i < 3; i++) { const a = off + i * TAU / 3 - Math.PI / 2; const px = Math.cos(a) * R * .7, py = Math.sin(a) * R * .7; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke(); }
  c.rotate(-t * spin * 2.2); c.strokeStyle = 'rgba(160,230,255,.85)'; c.lineWidth = 1.8; c.beginPath(); c.arc(0, 0, R * .42, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; star5(c, Math.cos(a) * R * .42, Math.sin(a) * R * .42, 4, '#fff3a0'); }
  c.restore();
  const p = 1 + Math.sin(t * 4) * .12 + pow * .5; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, cy, R * .26 * p, '#ffffff', .55); c.restore(); E(c, cx, cy, R * .09 * p, R * .09 * p, '#fff', false);
}
function tierTag(c, tier, x, y) { const col = TIER_COL[tier], w = 74; rr(c, x - w / 2, y - 10, w, 18, 9); c.fillStyle = 'rgba(20,10,50,.8)'; c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); txt(c, TIER_NAME[tier], x, y + 4, 11, col, 'center', { outline: false }); }
function resultLine(r) {
  if (r.kind === 'new') return ['NEW！なかまになった！', '#ffe27a'];
  if (r.kind === 'dup') return ['かけら ×10 ゲット！', '#ffe27a'];
  return ['かけら ×' + r.n + (r.unlocked ? '  → なかまに！' : ''), r.unlocked ? '#ffe27a' : '#bff6ff'];
}
function progressLine(key) {
  const sv = APP.save, p = piecesOf(sv, key);
  if (!isOwned(sv, key)) return 'かけら ' + p + ' / ' + PIECES_UNLOCK;
  const need = lvNeed(sv, key); return need == null ? 'Lv' + MAX_LV + '（最大）' : 'Lv' + lvOf(sv, key) + '   かけら ' + p + ' / ' + need;
}
function resultCard(c, r, x, y, w, h, compact, k) {
  const s = easeBack(clamp(k, 0, 1)), cx = x + w / 2, cy = y + h / 2, col = TIER_COL[r.tier], big = r.kind !== 'piece' || r.tier === 'L';
  c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
  if (big) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, cy, Math.max(w, h) * .8, r.kind === 'piece' ? col : '#ffd24a', .55 + Math.sin(APP.t * 6) * .12); c.restore(); }
  panelBox(c, x, y, w, h, { r: 14, fill: 'rgba(30,22,88,.95)', stroke: col, lw: big ? 3.4 : 2 });
  const [ln, lc] = resultLine(r), d = UNITS[r.key];
  if (!compact) {
    drawSpriteAt(c, r.key, cx, y + h * .62, Math.min(w * .7, h * .5), APP.t, 0, { hatch: 0 }, 1);
    tierTag(c, r.tier, cx, y + 20);
    txt(c, d.name, cx, y + h - 50, Math.min(18, w / 9), '#fff', 'center');
    txt(c, ln, cx, y + h - 30, Math.min(14, w / 11), lc, 'center');
    txt(c, progressLine(r.key), cx, y + h - 12, Math.min(12, w / 13), COL.dim, 'center', { outline: false });
  } else {
    drawSpriteAt(c, r.key, x + 46, y + h - 14, 80, APP.t, 0, { hatch: 0 }, 1);
    tierTag(c, r.tier, x + 46, y + 14);
    txt(c, d.name, x + 96, y + 32, 15, '#fff', 'left'); txt(c, ln, x + 96, y + 54, 13, lc, 'left'); txt(c, progressLine(r.key), x + 96, y + 76, 11, COL.dim, 'left', { outline: false });
  }
  c.restore();
}
function startGacha(n) {
  const sv = APP.save, res = rollGacha(sv, n, Math.random);
  if (!res) { toast('ジェムが足りません（戦ってためよう）'); return; }
  saveSave(); APP.gacha = { results: res, n, t: 0, seen: 0 }; SFX.play('summon');
}

function drawGacha(c, dt) {
  const L = APP.L, sv = APP.save, t = APP.t, Gc = APP.gacha, P = L.portrait;
  drawMenuBg(c, dt, 0, .55);
  txt(c, 'ガチャ', L.W / 2, 52, 34, '#fff8e8', 'center'); gemChip(c, L.W - 142, 12, 130);
  const cx = P ? L.W / 2 : 610, cy = P ? 250 : 270, R = P ? 118 : 150, summoning = Gc && Gc.t < 1.3;
  magicCircle(c, cx, cy, R, t, summoning ? 4 : .35, summoning ? 1 : 0);
  const orbit = ['mage', 'archer', 'siren', 'priest', 'ninja', 'miko'];
  c.save(); c.globalAlpha = summoning ? .2 : .6; orbit.forEach((k, i) => { const a = t * .35 + i / orbit.length * TAU; drawSpriteAt(c, k, cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * .5 + R * .5, P ? 44 : 52, t + i, 0, { hatch: 0 }, 1); }); c.restore();
  // 提供割合
  const px = P ? 18 : 24, py = P ? 392 : 84, pw = P ? L.W - 36 : 330, ph = P ? 262 : 380;
  panelBox(c, px, py, pw, ph, { r: 14 });
  txt(c, '提供割合', px + 16, py + 28, 18, '#ffe9a8', 'left');
  const lines = [
    ['キャラそのもの', (DIRECT_RATE * 100).toFixed(1) + '%', '#ffd24a'],
    ['かけら', ((1 - DIRECT_RATE) * 100).toFixed(1) + '%', '#bff6ff'],
  ];
  lines.forEach((r, i) => { txt(c, r[0], px + 18, py + 56 + i * 24, 15, '#fff', 'left', { outline: false }); txt(c, r[1], px + pw - 18, py + 56 + i * 24, 15, r[2], 'right'); });
  const tot = PIECE_TABLE.reduce((a, b) => a + b[1], 0);
  txt(c, 'かけらの数：' + PIECE_TABLE.map(p => p[0] + '個 ' + Math.round(p[1] / tot * 100) + '%').join(' / '), px + 18, py + 112, 12, COL.dim, 'left', { outline: false });
  const tw = Object.values(TIER_W).reduce((a, b) => a + b, 0);
  txt(c, '出やすさ：' + Object.keys(TIER_W).map(k => TIER_NAME[k] + Math.round(TIER_W[k] / tw * 100) + '%').join(' '), px + 18, py + 134, 12, COL.dim, 'left', { outline: false });
  let yy = py + 168;
  for (const s of ['・かけらを10個あつめると、そのキャラが仲間になる！', '・仲間のキャラは、かけらでレベルアップ（最大Lv' + MAX_LV + '）', '・持っているキャラをそのまま引いたら、かけら10個ぶん！', '・ジェムは、たたかうともらえる']) { const n = wrapText(c, s, px + 18, yy, pw - 36, 17, 13, '#f1ecff', 3); yy += n * 17 + 6; }
  // ボタン
  const by = P ? 668 : 502, bw = P ? 230 : 190, bh = 78, bx = P ? L.W / 2 - bw - 8 : 430;
  const can1 = sv.gems >= GACHA_COST, can10 = sv.gems >= GACHA10_COST;
  const gemBtn = (id, x, label, cost, style, can, fn) => button(id, x, by, bw, bh, '', { style: can ? style : 'off', draw: (c2, x2, y2, w2, h2) => { txt(c2, label, x2 + w2 / 2, y2 + 32, 24, can ? '#fff' : '#a09cb8', 'center'); gemIcon(c2, x2 + w2 / 2 - 26, y2 + 56, 9); txt(c2, '' + cost, x2 + w2 / 2 - 12, y2 + 63, 20, can ? '#fff' : '#a09cb8', 'left'); } }, fn);
  gemBtn('g_1', bx, '1回', GACHA_COST, 'primary', can1, () => startGacha(1));
  gemBtn('g_10', bx + bw + 14, '10回', GACHA10_COST, 'gold', can10, () => startGacha(10));
  button('g_back', P ? 18 : 24, P ? 770 : 560, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('title'));
  button('g_coll', P ? L.W - 18 - 160 : 160, P ? 770 : 560, 160, 52, 'なかま強化', { style: 'good', size: 16 }, () => { APP.cfocus = APP.save.form[0]; go('collection'); });
  // 結果
  if (Gc) {
    Gc.t += dt; const T0 = 1.3;
    if (Gc.t < T0) {
      const k = Gc.t / T0; c.fillStyle = `rgba(10,6,40,${.35 * k})`; c.fillRect(0, 0, L.W, L.H); if (k > .85) { c.fillStyle = `rgba(255,255,255,${(k - .85) / .15 * .9})`; c.fillRect(0, 0, L.W, L.H); }
      txt(c, '召喚中' + '.'.repeat(1 + Math.floor(t * 3) % 3), cx, cy + R + 44, 22, '#fff8e8', 'center');
      button('g_skip', 0, 0, L.W, L.H, '', { style: 'ghost', transparent: true }, () => { Gc.t = T0; });
    } else {
      const n = Gc.n, k0 = Gc.t - T0, step = n === 1 ? 0 : .16;
      c.fillStyle = 'rgba(8,4,28,.84)'; c.fillRect(0, 0, L.W, L.H);
      if (Gc.t < T0 + .25) { c.fillStyle = `rgba(255,255,255,${1 - (Gc.t - T0) / .25})`; c.fillRect(0, 0, L.W, L.H); }
      const doneAt = (n - 1) * step + .5;
      const seenNow = n === 1 ? 1 : Math.min(n, Math.floor(k0 / step) + 1);
      while (Gc.seen < seenNow) { const r = Gc.results[Gc.seen++]; SFX.play(r.kind !== 'piece' || r.tier === 'L' ? 'merge2' : r.tier === 'E' ? 'merge' : 'summon'); if (r.kind !== 'piece') FX.flash(0.4); }
      if (n === 1) { const w = P ? 280 : 260, h = 340; resultCard(c, Gc.results[0], L.W / 2 - w / 2, (L.H - h) / 2 - 30, w, h, false, k0 / .45); }
      else if (!P) { const cw = 164, ch = 188, gap = 10, x0 = (L.W - (5 * cw + 4 * gap)) / 2, y0 = 70; Gc.results.forEach((r, i) => { const kk = (k0 - i * step) / .4; if (kk > 0) resultCard(c, r, x0 + (i % 5) * (cw + gap), y0 + Math.floor(i / 5) * (ch + gap), cw, ch, false, kk); }); }
      else { const cw = 250, ch = 98, gap = 8, x0 = (L.W - (2 * cw + gap)) / 2, y0 = 60; Gc.results.forEach((r, i) => { const kk = (k0 - i * step) / .4; if (kk > 0) resultCard(c, r, x0 + (i % 2) * (cw + gap), y0 + Math.floor(i / 2) * (ch + gap), cw, ch, true, kk); }); }
      const ready = k0 > doneAt + .2, ry = P ? 640 : (n === 1 ? 540 : 520);
      if (!ready) button('g_skip2', 0, 0, L.W, L.H, '', { style: 'ghost', transparent: true }, () => { Gc.t = T0 + doneAt + .6; });
      else {
        const bw2 = 200, bx2 = L.W / 2 - bw2 - 8, can = sv.gems >= (n === 10 ? GACHA10_COST : GACHA_COST * n);
        button('g_again', bx2, ry, bw2, 56, '', { style: can ? 'primary' : 'off', disabled: !can, draw: (c2, x2, y2, w2, h2) => { txt(c2, 'もう一度 ' + n + '回', x2 + w2 / 2, y2 + 24, 18, can ? '#fff' : '#a09cb8', 'center'); gemIcon(c2, x2 + w2 / 2 - 22, y2 + 43, 8); txt(c2, '' + (n === 10 ? GACHA10_COST : GACHA_COST * n), x2 + w2 / 2 - 10, y2 + 49, 16, can ? '#fff' : '#a09cb8', 'left'); } }, () => startGacha(n));
        button('g_ok', L.W / 2 + 8, ry, bw2, 56, 'とじる', { style: 'ghost', size: 18 }, () => { APP.gacha = null; });
        gemChip(c, L.W / 2 - 65, ry + 66, 130);
      }
    }
  }
}

// ---------- なかま強化 ----------
function levelPanel(c, key, x, y, w, h) {
  const sv = APP.save, own = isOwned(sv, key, APP.debugAll), p = piecesOf(sv, key);
  panelBox(c, x, y, w, h, { r: 12, fill: 'rgba(40,32,100,.75)' });
  if (!own) {
    txt(c, 'まだ仲間になっていない', x + 14, y + 26, 15, '#fff8e8', 'left'); txt(c, 'かけら ' + p + ' / ' + PIECES_UNLOCK + '  で仲間に', x + 14, y + 48, 13, COL.dim, 'left', { outline: false });
    const hint = unlockHint(key); if (hint) txt(c, '（' + hint + 'でも解放）', x + 14, y + 66, 11, COL.dim, 'left', { outline: false });
    button('c_gacha', x + w - 118, y + h / 2 - 20, 106, 40, 'ガチャへ', { style: 'gold', size: 15, col: '#5a3000' }, () => { APP.gacha = null; go('gacha'); });
    return;
  }
  const lv = lvOf(sv, key), need = lvNeed(sv, key);
  txt(c, 'Lv ' + lv + ' / ' + MAX_LV, x + 14, y + 28, 20, '#bff6ff', 'left');
  if (need == null) { txt(c, '最大レベルに到達！', x + 14, y + 52, 14, '#ffe27a', 'left'); return; }
  txt(c, 'かけら ' + p + ' / ' + need, x + 14, y + 50, 14, p >= need ? '#ffe27a' : '#fff', 'left');
  const bw = w - 150; rr(c, x + 14, y + h - 18, bw, 9, 4.5); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); const f = clamp(p / need, 0, 1); if (f > 0) { rr(c, x + 14, y + h - 18, Math.max(9, bw * f), 9, 4.5); c.fillStyle = f >= 1 ? '#ffe27a' : '#6ad0ff'; c.fill(); }
  const can = p >= need;
  button('c_up', x + w - 120, y + h / 2 - 22, 108, 44, 'レベルUP', { style: can ? 'primary' : 'off', disabled: !can, size: 16 }, () => { if (levelUp(sv, key)) { saveSave(); APP.lvFx = { key, t: 0 }; SFX.play('upgrade'); toast(UNITS[key].name + ' が Lv' + lvOf(sv, key) + ' に！'); } });
}
function drawCollection(c, dt) {
  const L = APP.L, sv = APP.save, P = L.portrait; drawMenuBg(c, dt, 0, .55);
  txt(c, 'なかま・強化', L.W / 2, 44, P ? 26 : 30, '#fff8e8', 'center'); txt(c, 'かけらでレベルアップ！（最大Lv' + MAX_LV + '）', L.W / 2, 66, 13, COL.dim, 'center', { outline: false }); gemChip(c, L.W - 142, 10, 130);
  let cw, ch, gap, cols, gx, gy;
  if (!P) { cw = 96; ch = 100; gap = 6; cols = 6; gx = 24; gy = 82; } else { cw = 82; ch = 92; gap = 4; cols = 6; gx = (L.W - (6 * 82 + 20)) / 2; gy = 80; }
  if (!APP.cfocus) APP.cfocus = 'sword';
  const pages = Math.ceil(UNIT_LIST.length / PER_PAGE), pg = Math.min(APP.cpage || 0, pages - 1);
  pager(c, 'cp', P ? 10 : 20, 12, pg, pages, v => { APP.cpage = v; });
  UNIT_LIST.slice(pg * PER_PAGE, (pg + 1) * PER_PAGE).forEach((d, i) => {
    const x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap), own = isUnlocked(d.key), p = piecesOf(sv, d.key), need = own ? lvNeed(sv, d.key) : PIECES_UNLOCK;
    const bar = need == null ? { v: 1, max: 1, text: 'MAX', full: true } : { v: p, max: need, text: p + '/' + need, full: p >= need };
    unitCard(c, d.key, x, y, cw, ch, { locked: !own, focus: APP.cfocus === d.key, hint: '', lv: own ? lvOf(sv, d.key) : 0, noCost: true, bar });
    button('cf_' + d.key, x, y, cw, ch, '', { style: 'ghost', transparent: true }, () => { APP.cfocus = d.key; });
  });
  const key = APP.cfocus, own = isUnlocked(key);
  const dx = P ? 18 : 650, dy = P ? gy + 4 * (ch + gap) + 2 : 84, dw = P ? L.W - 36 : 288, dh = P ? 300 : 400;
  unitDetail(c, key, dx, dy, dw, dh, own ? lvOf(sv, key) : 0);
  if (APP.lvFx) { const fx = APP.lvFx; fx.t += dt; if (fx.t > .8) APP.lvFx = null; else { const k = fx.t / .8; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, dx + 70, dy + 100, 60 + k * 50, '#ffe27a', (1 - k) * .8); c.restore(); c.strokeStyle = `rgba(255,240,160,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(dx + 70, dy + 100, 20 + k * 60, 0, TAU); c.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k * 2; star5(c, dx + 70 + Math.cos(a) * (24 + k * 50), dy + 100 + Math.sin(a) * (24 + k * 50), 4, `rgba(255,250,200,${1 - k})`); } } }
  levelPanel(c, key, dx, dy + dh + 8, dw, P ? 84 : 72);
  const by = P ? L.H - 62 : L.H - 70;
  button('c_back', P ? 18 : 650, by, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('title'));
  button('c_gacha2', P ? L.W - 18 - 150 : 780, by, P ? 150 : 158, 52, 'ガチャ', { style: 'gold', size: 18, col: '#5a3000' }, () => { APP.gacha = null; go('gacha'); });
}
