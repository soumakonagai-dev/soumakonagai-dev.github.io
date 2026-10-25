'use strict';
// ===== ガチャ画面・なかま強化画面 =====
const TIER_COL = { C: '#cfd8ff', R: '#7ad0ff', E: '#d08aff', L: '#ffd24a', U: '#ff7ae8' };
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
  if (r.kind === 'dup') return ['かけら ×' + r.n + ' ゲット！', '#ffe27a'];
  return ['かけら ×' + r.n + (r.unlocked ? '  → なかまに！' : ''), r.unlocked ? '#ffe27a' : '#bff6ff'];
}
function progressLine(key) {
  const sv = APP.save, p = piecesOf(sv, key);
  if (!isOwned(sv, key)) return 'かけら ' + p + ' / ' + unlockNeed(key);
  const need = lvNeed(sv, key); return need == null ? 'Lv' + MAX_LV + '（最大）' : 'Lv' + lvOf(sv, key) + '   かけら ' + p + ' / ' + need;
}
// かけら：割れたガラスのようなギザギザの破片に、キャラの一部が映っている
function shardPoly(c, cx, cy, s, seed) {
  c.beginPath(); const n = 7;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + seed, rr = s * (i % 2 ? .62 : 1) * (.82 + .3 * Math.abs(Math.sin(seed * 5 + i * 2.3))); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 1.1; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath();
}
function shardArt(c, key, cx, cy, size, n, col, t) {
  const m = Math.min(5, Math.max(1, n)), s0 = m === 1 ? size * .36 : size * .24, sprH = size * 1.25;
  for (let i = 0; i < m; i++) {
    const a = m === 1 ? 0 : -Math.PI / 2 + i / m * TAU, rad = m === 1 ? 0 : size * .3;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad * .8 + Math.sin(t * 2.4 + i * 1.7) * 3, seed = i * 1.3 + .4, s = s0 * (1 + (i % 2) * .12);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, px, py, s * 2.2, col, .55); c.restore();
    c.save(); shardPoly(c, px, py, s, seed); c.fillStyle = 'rgba(20,14,60,.9)'; c.fill(); c.clip();
    const ox = (i % 3 - 1) * s * .6, oy = ((i + 1) % 3 - 1) * s * .5;
    drawSpriteAt(c, key, px - ox, py + sprH * .38 - oy, sprH, t, 0, { hatch: 0 }, 1);
    const g = c.createLinearGradient(px - s, py - s, px + s, py + s); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, rgba(col, .35)); c.fillStyle = g; c.fillRect(px - s * 1.3, py - s * 1.3, s * 2.6, s * 2.6);
    c.restore();
    shardPoly(c, px, py, s, seed); c.strokeStyle = col; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = .9; c.stroke();
    const sp = (t * 1.6 + i * .37) % 1; if (sp < .5) star5(c, px - s * .5, py - s * .6, 3.4 * Math.sin(sp * Math.PI * 2), '#ffffff');
  }
}
function resultCard(c, r, x, y, w, h, compact, k) {
  const s = easeBack(clamp(k, 0, 1)), cx = x + w / 2, cy = y + h / 2, col = TIER_COL[r.tier], big = r.kind !== 'piece' || r.tier === 'L' || r.tier === 'U';
  c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
  if (big) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, cy, Math.max(w, h) * .8, r.kind === 'piece' ? col : '#ffd24a', .55 + Math.sin(APP.t * 6) * .12); c.restore(); }
  panelBox(c, x, y, w, h, { r: 14, fill: 'rgba(30,22,88,.95)', stroke: col, lw: big ? 3.4 : 2 });
  const [ln, lc] = resultLine(r), d = UNITS[r.key];
  if (!compact) {
    if (r.kind === 'piece') shardArt(c, r.key, cx, y + h * .42, Math.min(w * .7, h * .5), r.n, col, APP.t); else drawSpriteAt(c, r.key, cx, y + h * .62, Math.min(w * .7, h * .5), APP.t, 0, { hatch: 0 }, 1);
    tierTag(c, r.tier, cx, y + 20);
    txt(c, d.name, cx, y + h - 50, Math.min(18, w / 9), '#fff', 'center', { maxW: w - 12 });
    txt(c, ln, cx, y + h - 30, Math.min(14, w / 11), lc, 'center', { maxW: w - 12 });
    txt(c, progressLine(r.key), cx, y + h - 12, Math.min(12, w / 13), COL.dim, 'center', { outline: false, maxW: w - 12 });
  } else {
    if (r.kind === 'piece') shardArt(c, r.key, x + 46, y + h * .5, 70, r.n, col, APP.t); else drawSpriteAt(c, r.key, x + 46, y + h - 14, 80, APP.t, 0, { hatch: 0 }, 1);
    tierTag(c, r.tier, x + 46, y + 14);
    txt(c, d.name, x + 96, y + 32, 15, '#fff', 'left', { maxW: w - 104 }); txt(c, ln, x + 96, y + 54, 13, lc, 'left', { maxW: w - 104 }); txt(c, progressLine(r.key), x + 96, y + 76, 11, COL.dim, 'left', { outline: false, maxW: w - 104 });
  }
  c.restore();
}
function startGacha(n, type, ticket) {
  type = type || APP.gtype || 'normal'; const sv = APP.save, res = rollGacha(sv, n, Math.random, type, ticket);
  if (!res) { toast(ticket ? 'チケットがありません' : 'ジェムが足りません（戦ってためよう）'); return; }
  saveSave();
  // いちばん良い結果で演出の長さと色が決まる（0:ふつう 1:エピック 2:レジェンド／キャラそのもの 3:ミシック）
  let lvl = 0; for (const r of res) lvl = Math.max(lvl, r.tier === 'U' ? 3 : r.tier === 'L' ? 2 : r.kind !== 'piece' ? 2 : r.tier === 'E' ? 1 : 0);
  const direct = res.some(r => r.kind !== 'piece');
  APP.gacha = { results: res, n, type, ticket: !!ticket, t: 0, seen: 0, lvl, direct, T0: [1.3, 2.1, 2.9, 3.5][lvl], fx: 0 }; SFX.play('summon');
}
function ticketIcon(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.rotate(-.2); c.fillStyle = col; c.strokeStyle = 'rgba(40,20,70,.85)'; c.lineWidth = 1.4; rr(c, -s, -s * .6, s * 2, s * 1.2, 3); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-s * .15, -s * .5, s * .3, s); star5(c, -s * .55, 0, s * .22, '#fff'); c.restore();
}

function drawGacha(c, dt) {
  const L = APP.L, sv = APP.save, t = APP.t, Gc = APP.gacha, P = L.portrait;
  if (!APP.gtype) APP.gtype = 'normal'; const gt = APP.gtype, GC = GACHAS[gt];
  drawMenuBg(c, dt, 0, .55);
  txt(c, 'ガチャ', L.W / 2, 52, 34, '#fff8e8', 'center'); gemChip(c, L.W - 142, 12, 130);
  const cx = P ? L.W / 2 : 610, cy = P ? 250 : 270, R = P ? 118 : 150, summoning = Gc && Gc.t < Gc.T0;
  magicCircle(c, cx, cy, R, t, summoning ? 4 : .35, summoning ? 1 : 0);
  const orbit = ['mage', 'archer', 'siren', 'priest', 'ninja', 'miko'];
  c.save(); c.globalAlpha = summoning ? .2 : .6; orbit.forEach((k, i) => { const a = t * .35 + i / orbit.length * TAU; drawSpriteAt(c, k, cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * .5 + R * .5, P ? 44 : 52, t + i, 0, { hatch: 0 }, 1); }); c.restore();
  // 提供割合
  // 種類タブ
  { const tw = P ? (L.W - 36 - 16) / 3 : 106, tx0 = P ? 18 : 24, ty = P ? 72 : 76;
    GACHA_TYPES.forEach((k, i) => { const sel = gt === k, g = GACHAS[k];
      button('gt_' + k, tx0 + i * (tw + 8), ty, tw, 40, g.name.replace('ガチャ', ''), { style: sel ? 'gold' : 'ghost', size: 16, col: sel ? '#5a3000' : g.col }, () => { if (!APP.gacha) APP.gtype = k; }); }); }
  const px = P ? 18 : 24, py = P ? 392 : 126, pw = P ? L.W - 36 : 330, ph = P ? 262 : 370;
  panelBox(c, px, py, pw, ph, { r: 14, stroke: GC.col, lw: 2.4 });
  txt(c, GC.name, px + 16, py + 28, 18, '#ffe9a8', 'left');
  const directPct = GC.direct >= 1 ? '100%' : (GC.direct * 100).toFixed(1) + '%', tr = tierRates(gt);
  const lines = [
    ['キャラそのもの', directPct, '#ffd24a'],
    ['かけら', GC.direct >= 1 ? 'なし' : ((1 - GC.direct) * 100).toFixed(1) + '%', '#bff6ff'],
  ];
  lines.forEach((r, i) => { txt(c, r[0], px + 18, py + 56 + i * 24, 15, '#fff', 'left', { outline: false }); txt(c, r[1], px + pw - 18, py + 56 + i * 24, 15, r[2], 'right'); });
  const tot = GC.pieces.reduce((a, b) => a + b[1], 0);
  if (GC.direct < 1) txt(c, 'かけらの数：' + GC.pieces.map(p => p[0] + '個 ' + Math.round(p[1] / tot * 100) + '%').join(' / '), px + 18, py + 112, 12, COL.dim, 'left', { outline: false });
  txt(c, 'ランク：' + ['C', 'R', 'E', 'L', 'U'].filter(k => tr[k] > 0).map(k => TIER_NAME[k] + ' ' + (tr[k] * 100).toFixed(0) + '%').join(' / '), px + 18, py + 134, 12, COL.dim, 'left', { outline: false });
  let yy = py + 162;
  for (const s of [GC.desc, GC.ticket ? '・ステージをクリアすると、たまにチケットが落ちる（1回ぶん無料）' : '・チケットでは引けません（ジェムのみ）', '・かけらをあつめると、そのキャラが仲間になる（エピックまでは少なめ）！', '・持っているキャラをそのまま引いたら、仲間になるぶんのかけらが入る！']) { const n = wrapText(c, s, px + 18, yy, pw - 36, 17, 13, '#f1ecff', 3); yy += n * 17 + 6; }
  { const tg = sv.target || {}, parts = ['E', 'L', 'U'].filter(t => tg[t] && UNITS[tg[t]] && !isOwned(sv, tg[t])).map(t => TIER_NAME[t] + '：' + UNITS[tg[t]].name); txt(c, 'ねらい　' + (parts.length ? parts.join(' / ') : 'なし（なかま強化の画面で決められます）'), px + 18, py + ph - 12, 12, '#ffe9a8', 'left', { outline: false, maxW: pw - 36 }); }
  // ボタン
  const by = P ? 668 : 502, bw = 160, bh = 78, bx = P ? 22 : 430;
  const can1 = sv.gems >= GC.cost, can10 = sv.gems >= GC.cost10, nt = sv.tickets[gt] || 0;
  const gemBtn = (id, x, label, cost, style, can, fn, glow) => button(id, x, by, bw, bh, '', { glow: !!glow, style: can ? style : 'off', draw: (c2, x2, y2, w2, h2) => { txt(c2, label, x2 + w2 / 2, y2 + 32, 24, can ? '#fff' : '#a09cb8', 'center'); gemIcon(c2, x2 + w2 / 2 - 26, y2 + 56, 9); txt(c2, '' + cost, x2 + w2 / 2 - 12, y2 + 63, 20, can ? '#fff' : '#a09cb8', 'left'); } }, fn);
  gemBtn('g_1', bx, '1回', GC.cost, 'primary', can1, () => startGacha(1, gt), can1);
  gemBtn('g_10', bx + bw + 8, '10回', GC.cost10, 'gold', can10, () => startGacha(10, gt));
  if (GC.ticket) { const cant = nt < 1; button('g_tk', bx + (bw + 8) * 2, by, bw, bh, '', { glow: !cant, style: cant ? 'off' : 'good', disabled: cant, draw: (c2, x2, y2, w2, h2) => { txt(c2, 'チケット', x2 + w2 / 2, y2 + 32, 22, cant ? '#a09cb8' : '#fff', 'center'); ticketIcon(c2, x2 + w2 / 2 - 28, y2 + 58, 11, GC.col); txt(c2, '×' + nt + '（無料）', x2 + w2 / 2 - 10, y2 + 64, 16, cant ? '#a09cb8' : '#fff', 'left'); } }, () => startGacha(1, gt, true)); }
  else txt(c, 'チケットは出ません', bx + (bw + 8) * 2 + bw / 2, by + 44, 13, COL.dim, 'center', { outline: false });
  // 持っているチケット
  { const tx = P ? L.W - 18 : L.W - 24; let xx = tx; for (const k of ['rare', 'normal']) { txt(c, '×' + (sv.tickets[k] || 0), xx, 64, 14, '#fff', 'right'); xx -= 42; ticketIcon(c, xx + 6, 59, 9, GACHAS[k].col); xx -= 26; } }
  button('g_back', P ? 18 : 24, P ? 770 : 560, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('title'));
  button('g_coll', P ? L.W - 18 - 160 : 160, P ? 770 : 560, 160, 52, 'なかま強化', { style: 'good', size: 16 }, () => { APP.cfocus = APP.save.form[0]; go('collection'); });
  // 結果
  if (Gc) {
    Gc.t += dt; const T0 = Gc.T0;
    if (Gc.t < T0) {
      const k = Gc.t / T0; c.fillStyle = `rgba(10,6,40,${.35 * k})`; c.fillRect(0, 0, L.W, L.H); if (k > .85) { c.fillStyle = `rgba(255,255,255,${(k - .85) / .15 * .9})`; c.fillRect(0, 0, L.W, L.H); }
      const lv = Gc.lvl, hue = lv === 3 ? hslToHex(Math.floor(t * 300 % 360 / 20) * 20, 1, .7) : null, col = hue || ['#ffffff', '#d08aff', '#ffd24a', '#ff7ae8'][lv];
      if (lv > 0 && k > .32) {
        const q = Math.min(1, (k - .32) / .2);
        if (!Gc.fx) { Gc.fx = 1; SFX.play(lv >= 2 ? 'merge2' : 'merge'); }
        c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, cy, R * (1.5 + q * .9), col, .55 + .2 * Math.sin(t * 12));
        c.translate(cx, cy); c.rotate(t * (1 + lv)); c.fillStyle = col; c.globalAlpha = .55 * q; const rays = 8 + lv * 4;
        for (let i = 0; i < rays; i++) { c.rotate(TAU / rays); c.beginPath(); c.moveTo(0, -3); c.lineTo(R * (1.3 + (i % 2) * .5) * q, 0); c.lineTo(0, 3); c.fill(); }
        c.restore();
        if (k < .5) { c.fillStyle = 'rgba(255,255,255,' + (.5 - k) * 1.4 + ')'; c.fillRect(0, 0, L.W, L.H); }
      }
      if (lv > 0 && k > .58) {
        const q = Math.min(1, (k - .58) / .14), lab = ['', 'エピック確定！', 'レジェンド確定！！', 'ミシック確定！！！'][lv], big = Gc.direct && lv === 2 && !Gc.results.some(r => r.tier === 'L') ? 'キャラ確定！！' : lab;
        c.save(); c.translate(L.W / 2, cy + R + 52); const sc = easeBack(q) * (1 + .04 * Math.sin(t * 14)); c.scale(sc, sc);
        rr(c, -170, -30, 340, 60, 30); c.fillStyle = 'rgba(20,10,50,.78)'; c.fill(); c.strokeStyle = col; c.lineWidth = 4; c.stroke();
        txt(c, big, 0, 12, 32, col, 'center'); c.restore();
      } else txt(c, '召喚中' + '.'.repeat(1 + Math.floor(t * 3) % 3), cx, cy + R + 44, 22, '#fff8e8', 'center');
      button('g_skip', 0, 0, L.W, L.H, '', { style: 'ghost', transparent: true }, () => { Gc.t = T0; });
    } else {
      const n = Gc.n, k0 = Gc.t - T0, step = n === 1 ? 0 : .16;
      c.fillStyle = 'rgba(8,4,28,.84)'; c.fillRect(0, 0, L.W, L.H);
      if (Gc.t < T0 + .25) { c.fillStyle = `rgba(255,255,255,${1 - (Gc.t - T0) / .25})`; c.fillRect(0, 0, L.W, L.H); }
      const doneAt = (n - 1) * step + .5;
      const seenNow = n === 1 ? 1 : Math.min(n, Math.floor(k0 / step) + 1);
      while (Gc.seen < seenNow) { const r = Gc.results[Gc.seen++]; SFX.play(r.kind !== 'piece' || r.tier === 'L' || r.tier === 'U' ? 'merge2' : r.tier === 'E' ? 'merge' : 'summon'); if (r.kind !== 'piece') FX.flash(0.4); }
      if (n === 1) { const w = P ? 280 : 260, h = 340; resultCard(c, Gc.results[0], L.W / 2 - w / 2, (L.H - h) / 2 - 30, w, h, false, k0 / .45); }
      else if (!P) { const cw = 164, ch = 188, gap = 10, x0 = (L.W - (5 * cw + 4 * gap)) / 2, y0 = 70; Gc.results.forEach((r, i) => { const kk = (k0 - i * step) / .4; if (kk > 0) resultCard(c, r, x0 + (i % 5) * (cw + gap), y0 + Math.floor(i / 5) * (ch + gap), cw, ch, false, kk); }); }
      else { const cw = 250, ch = 98, gap = 8, x0 = (L.W - (2 * cw + gap)) / 2, y0 = 60; Gc.results.forEach((r, i) => { const kk = (k0 - i * step) / .4; if (kk > 0) resultCard(c, r, x0 + (i % 2) * (cw + gap), y0 + Math.floor(i / 2) * (ch + gap), cw, ch, true, kk); }); }
      const ready = k0 > doneAt + .2, ry = P ? 640 : (n === 1 ? 540 : 520);
      if (!ready) button('g_skip2', 0, 0, L.W, L.H, '', { style: 'ghost', transparent: true }, () => { Gc.t = T0 + doneAt + .6; });
      else {
        const gT = Gc.type || 'normal', bw2 = 200, bx2 = L.W / 2 - bw2 - 8, can = Gc.ticket ? (sv.tickets[gT] || 0) >= 1 : sv.gems >= gachaCost(gT, n);
        button('g_again', bx2, ry, bw2, 56, '', { glow: can, style: can ? 'primary' : 'off', disabled: !can, draw: (c2, x2, y2, w2, h2) => { txt(c2, 'もう一度 ' + n + '回', x2 + w2 / 2, y2 + 24, 18, can ? '#fff' : '#a09cb8', 'center'); if (Gc.ticket) txt(c2, 'チケット ×' + (sv.tickets[gT] || 0), x2 + w2 / 2, y2 + 46, 14, can ? '#fff' : '#a09cb8', 'center'); else { gemIcon(c2, x2 + w2 / 2 - 22, y2 + 43, 8); txt(c2, '' + gachaCost(gT, n), x2 + w2 / 2 - 10, y2 + 49, 16, can ? '#fff' : '#a09cb8', 'left'); } } }, () => startGacha(n, gT, Gc.ticket));
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
    txt(c, 'まだ仲間になっていない', x + 14, y + 26, 15, '#fff8e8', 'left'); txt(c, 'かけら ' + p + ' / ' + unlockNeed(key) + '  で仲間に', x + 14, y + 48, 13, COL.dim, 'left', { outline: false });
    const sea = UNITS[key].seasonal, tr = tierOf(key), canT = !sea && (tr === 'E' || tr === 'L' || tr === 'U'), isT = sv.target && sv.target[tr] === key;
    button('c_gacha', x + w - 118, y + (canT ? 8 : h / 2 - 20), 106, canT ? 30 : 40, sea ? 'イベントへ' : 'ガチャへ', { style: 'gold', size: 14, col: '#5a3000' }, () => { APP.gacha = null; go(sea ? 'event' : 'gacha'); });
    if (canT) button('c_target', x + w - 118, y + h - 38, 106, 30, isT ? 'ねらい解除' : 'ねらう', { style: isT ? 'good' : 'ghost', size: 13 }, () => { sv.target = sv.target || {}; if (isT) delete sv.target[tr]; else sv.target[tr] = key; saveSave(); toast(isT ? 'ねらいを解除' : UNITS[key].name + ' をねらいに（' + TIER_NAME[tr] + 'が出たとき出やすい）'); });
    return;
  }
  const lv = lvOf(sv, key), need = lvNeed(sv, key);
  txt(c, 'Lv ' + lv + ' / ' + MAX_LV, x + 14, y + 28, 20, '#bff6ff', 'left');
  if (need == null) { txt(c, '最大レベルに到達！', x + 14, y + 52, 14, '#ffe27a', 'left'); return; }
  txt(c, 'かけら ' + p + ' / ' + need, x + 14, y + 50, 14, p >= need ? '#ffe27a' : '#fff', 'left');
  const bw = w - 150; rr(c, x + 14, y + h - 18, bw, 9, 4.5); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); const f = clamp(p / need, 0, 1); if (f > 0) { rr(c, x + 14, y + h - 18, Math.max(9, bw * f), 9, 4.5); c.fillStyle = f >= 1 ? '#ffe27a' : '#6ad0ff'; c.fill(); }
  const can = p >= need;
  button('c_up', x + w - 120, y + h / 2 - 22, 108, 44, 'レベルUP', { glow: can, style: can ? 'primary' : 'off', disabled: !can, size: 16 }, () => { if (levelUp(sv, key)) { saveSave(); APP.lvFx = { key, t: 0 }; SFX.play('upgrade'); toast(UNITS[key].name + ' が Lv' + lvOf(sv, key) + ' に！'); } });
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
    const x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap), own = isUnlocked(d.key), p = piecesOf(sv, d.key), need = own ? lvNeed(sv, d.key) : unlockNeed(d.key);
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
