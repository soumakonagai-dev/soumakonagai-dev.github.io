'use strict';
// ===== イベント画面：今月のイベントステージ・ポイント交換所・イベントクエスト =====
function evPtsChip(c, x, y, w) {
  panelBox(c, x, y, w, 30, { r: 15, fill: 'rgba(24,18,64,.82)', shine: false, lw: 1.4 });
  star5(c, x + 16, y + 15, 8, '#ffe27a', 'rgba(70,40,10,.8)'); txt(c, eventPoints(APP.save) + ' pt', x + w - 12, y + 21, 16, '#ffe9a8', 'right');
}
// 交換の1行（スクロールの中に描く。高さは固定 EV_ROW）
const EV_ROW = 78;
function evShopRow(c, sv, d, x, y, w, it, idPrefix, i) {
  const t = tierOf(d.key), own = isOwned(sv, d.key, APP.debugAll), p = piecesOf(sv, d.key), need = unlockNeed(d.key), got = eventBought(sv, d.key), can = eventPoints(sv) >= it.pts && got < it.limit;
  rr(c, x, y, w, EV_ROW - 6, 10); c.fillStyle = 'rgba(50,40,120,.55)'; c.fill(); c.strokeStyle = TIER_COL[t]; c.lineWidth = 1.6; c.stroke();
  drawSpriteAt(c, d.key, x + 40, y + EV_ROW - 14, 56, Math.floor(APP.t / .25) * .25 + i, 0, { hatch: 0 }, 1);
  const bx = x + w - 108, tx = x + 82, tw = bx - tx - 10;
  txt(c, d.name, tx, y + 24, 15, '#fff', 'left', { maxW: tw - 84 }); tierTag(c, t, tx + tw - 40, y + 19);
  txt(c, own ? 'なかま（Lv' + lvOf(sv, d.key) + '）' : 'かけら ' + p + ' / ' + need, tx, y + 44, 12, own ? '#ffe27a' : COL.dim, 'left', { outline: false, maxW: tw });
  txt(c, '1コ ' + it.pts + 'pt ・ この期間 ' + got + '/' + it.limit, tx, y + 62, 12, '#bff6ff', 'left', { outline: false, maxW: tw });
  button(idPrefix + i, bx, y + (EV_ROW - 6) / 2 - 17, 98, 34, 'こうかん', { glow: can, style: can ? 'gold' : 'off', disabled: !can, size: 14, col: '#5a3000' }, () => { const r = eventBuy(sv, d.key); if (r) { saveSave(); SFX.play(r.unlocked ? 'merge2' : 'summon'); toast(r.unlocked ? d.name + ' がなかまに！' : d.name + ' のかけら +1'); } });
}
function drawEvent(c, dt) {
  const L = APP.L, sv = APP.save, P = L.portrait, m = eventMonth(), idx = eventStageIdx(m), st = STAGES[idx], season = SEASON_OF(m);
  APP.evTab = APP.evTab || 0;
  drawMenuBg(c, dt, idx, .5);
  txt(c, m + '月' + (eventHalf() ? '後半' : '前半') + 'のイベント', P ? L.W / 2 - 40 : L.W / 2, 44, P ? 24 : 32, '#fff8e8', 'center', { maxW: P ? 330 : 500 }); txt(c, `${SEASON_NAME[season]}の季節イベント　あと${eventDaysLeft()}日　（ポイントはこの期間だけ使えます）`, L.W / 2, 68, P ? 12 : 14, COL.dim, 'center', { outline: false, maxW: L.W - 20 });
  evPtsChip(c, P ? L.W - 120 : L.W - 150, 10, P ? 110 : 138);
  // タブ
  const tw = P ? (L.W - 36 - 16) / 3 : 190, tx = P ? 18 : 24, ty = 82;
  const claimable = EVENT_QUESTS.filter(q => evqDone(sv, q) && !evqClaimed(sv, q)).length;
  button('ev_t0', tx, ty, tw, 36, 'ステージ・こうかん', { style: APP.evTab === 0 ? 'gold' : 'ghost', size: 15, col: APP.evTab === 0 ? '#5a3000' : '#ffe9a8' }, () => { APP.evTab = 0; });
  button('ev_t2', tx + (tw + 8) * 2, ty, tw, 36, 'ほかのキャラ', { style: APP.evTab === 2 ? 'gold' : 'ghost', size: 15, col: APP.evTab === 2 ? '#5a3000' : '#ffe9a8' }, () => { APP.evTab = 2; });
  button('ev_t1', tx + tw + 8, ty, tw, 36, 'クエスト' + (claimable ? '（' + claimable + '）' : ''), { glow: claimable > 0, style: APP.evTab === 1 ? 'gold' : 'ghost', size: 15, col: APP.evTab === 1 ? '#5a3000' : '#ffe9a8' }, () => { APP.evTab = 1; });
  const top = 126;
  if (APP.evTab === 1) drawEventQuests(c, L, sv, P, top);
  else if (APP.evTab === 2) drawEventOthers(c, L, sv, P, top);
  else {
    // ステージ
    const sx = P ? 18 : 24, sy = top, sw = P ? L.W - 36 : 300, sh = P ? 268 : 380;
    panelBox(c, sx, sy, sw, sh, { fill: 'rgba(24,18,64,.88)', stroke: 'rgba(255,233,168,.9)' });
    drawStageThumb(c, idx, sx + 8, sy + 8, sw - 16, P ? 140 : 190, false, APP.t);
    txt(c, st.name, sx + sw / 2, sy + (P ? 174 : 226), 18, '#fff8e8', 'center', { maxW: sw - 16 });
    txt(c, st.sub + '　ボス：' + BOSSES[st.boss].name, sx + sw / 2, sy + (P ? 196 : 250), 12, '#ffd0a8', 'center', { outline: false, maxW: sw - 16 });
    button('ev_go', sx + 20, sy + sh - (P ? 46 : 62), sw - 40, P ? 34 : 46, 'チャレンジ！（クリアで +' + eventPointsFor(3, APP.diff) + 'pt まで）', { glow: true, style: 'primary', size: P ? 13 : 15 }, () => { APP.stage = idx; APP.endless = false; APP.fpage = 0; go('formation'); });
    // 交換所（スクロール）
    const rx = P ? 18 : 344, ry = P ? sy + sh + 12 : top, rw = P ? L.W - 36 : L.W - 344 - 24, rh = P ? L.H - ry - 78 : 380;
    panelBox(c, rx, ry, rw, rh, { fill: 'rgba(24,18,64,.88)' });
    txt(c, `${SEASON_NAME[season]}の限定キャラと こうかん`, rx + 14, ry + 26, 16, '#ffe9a8', 'left', { maxW: rw - 28 });
    const rows = seasonChars(season), vy = ry + 36, vh = rh - 36 - 26;
    scrollView(c, 'ev_shop', rx + 6, vy, rw - 12, vh, rows.length * EV_ROW, off => { rows.forEach((d, i) => { const y = vy + i * EV_ROW - off; if (y + EV_ROW > vy && y < vy + vh) evShopRow(c, sv, d, rx + 10, y, rw - 28, eventItem(d.key), 'ev_buy', i); }); });
    txt(c, 'ポイントは、この期間のイベントでだけ使えます。持ちこせません。', rx + 14, ry + rh - 9, 11, COL.dim, 'left', { outline: false, maxW: rw - 28 });
  }
  button('ev_back', P ? 18 : 24, P ? L.H - 64 : 566, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('title'));
}
function drawEventQuests(c, L, sv, P, top) {
  const x = P ? 18 : 24, w = L.W - x * 2, h = (P ? L.H - 80 : 566 - 8) - top;
  panelBox(c, x, top, w, h, { fill: 'rgba(24,18,64,.88)' });
  txt(c, 'イベントクエスト（この期間のあいだ・達成するとポイントがもらえる）', x + 14, top + 24, 15, '#ffe9a8', 'left', { maxW: w - 28 });
  const rows = EVENT_QUESTS, rowH = 44, vy = top + 34, vh = h - 40;
  scrollView(c, 'ev_quest', x + 6, vy, w - 12, vh, rows.length * rowH, off => rows.forEach((q, i) => {
    const y = vy + i * rowH - off; if (y + rowH < vy || y > vy + vh) return;
    const v = Math.min(q.need, evqGet(sv, q.stat)), done = evqDone(sv, q), got = evqClaimed(sv, q), bx0 = x + 10, ww = w - 30;
    rr(c, bx0, y, ww, rowH - 4, 8); c.fillStyle = got ? 'rgba(40,40,70,.5)' : done ? 'rgba(90,70,20,.6)' : 'rgba(50,40,120,.5)'; c.fill(); c.strokeStyle = done && !got ? '#ffe27a' : 'rgba(180,170,230,.4)'; c.lineWidth = done && !got ? 2 : 1; c.stroke();
    txt(c, q.name, bx0 + 10, y + 18, P ? 13 : 14, got ? COL.dim : '#fff', 'left', { outline: false, maxW: ww - 230 });
    const bw = Math.min(150, ww - 330), by = y + rowH - 14; rr(c, bx0 + 10, by, bw, 5, 2.5); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); const f = clamp(v / q.need, 0, 1); if (f > 0) { rr(c, bx0 + 10, by, Math.max(5, bw * f), 5, 2.5); c.fillStyle = done ? '#ffe27a' : '#6ad0ff'; c.fill(); }
    txt(c, v + ' / ' + q.need, bx0 + 10 + bw + 8, by + 6, 11, COL.dim, 'left', { outline: false });
    txt(c, '+' + q.pts + 'pt', bx0 + ww - 112, y + rowH * .5 + 3, 14, '#ffe9a8', 'right');
    button('evq_' + q.id, bx0 + ww - 100, y + 5, 92, rowH - 14, got ? 'うけとり済' : 'うけとる', { glow: done && !got, style: done && !got ? 'gold' : 'off', disabled: !done || got, size: 12, col: '#5a3000' }, () => { if (evqClaim(sv, q)) { saveSave(); SFX.play('merge2'); toast('+' + q.pts + 'pt ゲット！'); } });
  }));
}
// ふつうのキャラ（ガチャのキャラ）のかけらも、ポイントで交換できる（季節キャラより少し高い）
function drawEventOthers(c, L, sv, P, top) {
  const x = P ? 18 : 24, w = L.W - x * 2, h = (P ? L.H - 80 : 566 - 8) - top;
  if (!APP.evT2) APP.evT2 = 'E';
  panelBox(c, x, top, w, h, { fill: 'rgba(24,18,64,.88)' });
  txt(c, SEASON_NAME[SEASON_OF(eventMonth())] + (eventHalf() ? '後半' : '前半') + 'の品ぞろえ', x + 14, top + 24, 14, '#ffe9a8', 'left', { maxW: w - 330 });
  ['E', 'L', 'U'].forEach((t, i) => { button('ev_f' + t, x + w - 300 + i * 96, top + 8, 90, 28, TIER_NAME[t], { style: APP.evT2 === t ? 'gold' : 'ghost', size: 13, col: APP.evT2 === t ? '#5a3000' : TIER_COL[t] }, () => { APP.evT2 = t; if (APP.scr) APP.scr.ev_other = 0; }); });
  const list = eventAnyList(APP.evT2), it = EVENT_SHOP_ANY[APP.evT2], vy = top + 44, vh = h - 52;
  scrollView(c, 'ev_other', x + 6, vy, w - 12, vh, list.length * EV_ROW, off => list.forEach((d, i) => { const y = vy + i * EV_ROW - off; if (y + EV_ROW > vy && y < vy + vh) evShopRow(c, sv, d, x + 10, y, w - 28, it, 'ev_o', i); }));
}
