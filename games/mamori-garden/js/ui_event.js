'use strict';
// ===== イベント画面：今月のイベントステージ・ポイント交換所・イベントクエスト =====
function evPtsChip(c, x, y, w) {
  panelBox(c, x, y, w, 30, { r: 15, fill: 'rgba(24,18,64,.82)', shine: false, lw: 1.4 });
  star5(c, x + 16, y + 15, 8, '#ffe27a', 'rgba(70,40,10,.8)'); txt(c, eventPoints(APP.save) + ' pt', x + w - 12, y + 21, 16, '#ffe9a8', 'right');
}
function drawEvent(c, dt) {
  const L = APP.L, sv = APP.save, P = L.portrait, m = eventMonth(), idx = eventStageIdx(m), st = STAGES[idx], season = SEASON_OF(m);
  APP.evTab = APP.evTab || 0;
  drawMenuBg(c, dt, idx, .5);
  txt(c, m + '月' + (eventHalf() ? '後半' : '前半') + 'のイベント', L.W / 2, 44, P ? 28 : 32, '#fff8e8', 'center'); txt(c, `${SEASON_NAME[season]}の季節イベント　あと${eventDaysLeft()}日　（ポイントは今月だけ使えます）`, L.W / 2, 68, P ? 12 : 14, COL.dim, 'center', { outline: false, maxW: L.W - 20 });
  evPtsChip(c, L.W - 150, 10, 138);
  // タブ
  const tw = P ? (L.W - 36 - 16) / 3 : 190, tx = P ? 18 : 24, ty = 82;
  const claimable = EVENT_QUESTS.filter(q => evqDone(sv, q) && !evqClaimed(sv, q)).length;
  button('ev_t0', tx, ty, tw, 36, 'ステージ・こうかん', { style: APP.evTab === 0 ? 'gold' : 'ghost', size: 15, col: APP.evTab === 0 ? '#5a3000' : '#ffe9a8' }, () => { APP.evTab = 0; });
  button('ev_t2', tx + (tw + 8) * 2, ty, tw, 36, 'ほかのキャラ', { style: APP.evTab === 2 ? 'gold' : 'ghost', size: 15, col: APP.evTab === 2 ? '#5a3000' : '#ffe9a8' }, () => { APP.evTab = 2; });
  button('ev_t1', tx + tw + 8, ty, tw, 36, 'クエスト' + (claimable ? '（' + claimable + '）' : ''), { glow: claimable > 0, style: APP.evTab === 1 ? 'gold' : 'ghost', size: 15, col: APP.evTab === 1 ? '#5a3000' : '#ffe9a8' }, () => { APP.evTab = 1; });
  const top = 126;
  if (APP.evTab === 1) { drawEventQuests(c, L, sv, P, top); }
  else if (APP.evTab === 2) { drawEventOthers(c, L, sv, P, top); }
  else {
    // ステージ
    const sx = P ? 18 : 24, sy = top, sw = P ? L.W - 36 : 300, sh = P ? 240 : 380;
    panelBox(c, sx, sy, sw, sh, { fill: 'rgba(24,18,64,.88)', stroke: 'rgba(255,233,168,.9)' });
    drawStageThumb(c, idx, sx + 8, sy + 8, sw - 16, P ? 140 : 190, false, APP.t);
    txt(c, st.name, sx + sw / 2, sy + (P ? 176 : 226), 20, '#fff8e8', 'center', { maxW: sw - 16 });
    txt(c, st.sub + '　ボス：' + BOSSES[st.boss].name, sx + sw / 2, sy + (P ? 198 : 250), 12, '#ffd0a8', 'center', { outline: false, maxW: sw - 16 });
    button('ev_go', sx + 20, sy + sh - (P ? 40 : 62), sw - 40, P ? 32 : 46, 'チャレンジ！（クリアで +' + eventPointsFor(3, APP.diff) + 'pt まで）', { glow: true, style: 'primary', size: P ? 13 : 15 }, () => { APP.stage = idx; APP.endless = false; APP.fpage = 0; go('formation'); });
    // 交換所
    const rx = P ? 18 : 344, ry = P ? sy + sh + 12 : top, rw = P ? L.W - 36 : L.W - 344 - 24, rh = P ? L.H - ry - 78 : 380;
    panelBox(c, rx, ry, rw, rh, { fill: 'rgba(24,18,64,.88)' });
    txt(c, `${SEASON_NAME[season]}の限定キャラと こうかん`, rx + 14, ry + 26, 16, '#ffe9a8', 'left', { maxW: rw - 28 });
    const rows = seasonChars(season), rowH = Math.min(100, (rh - 50) / Math.max(1, rows.length));
    rows.forEach((d, i) => {
      const y = ry + 38 + i * rowH, t = tierOf(d.key), it = eventItem(d.key), own = isOwned(sv, d.key, APP.debugAll), p = piecesOf(sv, d.key), need = unlockNeed(d.key), got = eventBought(sv, d.key);
      rr(c, rx + 8, y, rw - 16, rowH - 6, 10); c.fillStyle = 'rgba(50,40,120,.55)'; c.fill(); c.strokeStyle = TIER_COL[t]; c.lineWidth = 1.6; c.stroke();
      drawSpriteAt(c, d.key, rx + 48, y + rowH - 14, Math.min(70, rowH - 16), APP.t + i, 0, { hatch: 0 }, 1);
      txt(c, d.name, rx + 92, y + 22, 15, '#fff', 'left', { maxW: rw - 260 }); tierTag(c, t, rx + rw - 150, y + 16);
      txt(c, own ? 'なかま（Lv' + lvOf(sv, d.key) + '）' : `かけら ${p} / ${need}`, rx + 92, y + 42, 12, own ? '#ffe27a' : COL.dim, 'left', { outline: false });
      txt(c, `1コ ${it.pts}pt ・ 今月 ${got}/${it.limit}`, rx + 92, y + 60, 12, '#bff6ff', 'left', { outline: false, maxW: rw - 260 });
      const can = eventPoints(sv) >= it.pts && got < it.limit;
      button('ev_buy' + i, rx + rw - 112, y + 20, 98, 34, 'こうかん', { glow: can, style: can ? 'gold' : 'off', disabled: !can, size: 14, col: '#5a3000' }, () => { const r = eventBuy(sv, d.key); if (r) { saveSave(); SFX.play(r.unlocked ? 'merge2' : 'summon'); toast(r.unlocked ? d.name + ' がなかまに！' : d.name + ' のかけら +1'); } });
    });
    txt(c, 'ポイントは、その月のイベントでだけ使えます。来月・来年には持ちこせません。', rx + 14, ry + rh - 8, 11, COL.dim, 'left', { outline: false, maxW: rw - 28 });
  }
  button('ev_back', P ? 18 : 24, P ? L.H - 64 : 566, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('title'));
}
function drawEventQuests(c, L, sv, P, top) {
  const x = P ? 18 : 24, w = L.W - x * 2, h = (P ? L.H - 80 : 566 - 8) - top;
  panelBox(c, x, top, w, h, { fill: 'rgba(24,18,64,.88)' });
  txt(c, 'イベントクエスト（今月のあいだ・達成するとポイントがもらえる）', x + 14, top + 24, 15, '#ffe9a8', 'left', { maxW: w - 28 });
  const rows = EVENT_QUESTS, rowH = Math.min(38, (h - 40) / rows.length);
  rows.forEach((q, i) => {
    const y = top + 34 + i * rowH, v = Math.min(q.need, evqGet(sv, q.stat)), done = evqDone(sv, q), got = evqClaimed(sv, q);
    rr(c, x + 8, y, w - 16, rowH - 4, 8); c.fillStyle = got ? 'rgba(40,40,70,.5)' : done ? 'rgba(90,70,20,.6)' : 'rgba(50,40,120,.5)'; c.fill(); c.strokeStyle = done && !got ? '#ffe27a' : 'rgba(180,170,230,.4)'; c.lineWidth = done && !got ? 2 : 1; c.stroke();
    txt(c, q.name, x + 18, y + rowH * .5 - 2, P ? 12 : 14, got ? COL.dim : '#fff', 'left', { outline: false, maxW: w - 270 });
    const bw = P ? 90 : 160, bx = x + 18, by = y + rowH - 12; rr(c, bx, by, bw, 5, 2.5); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); const f = clamp(v / q.need, 0, 1); if (f > 0) { rr(c, bx, by, Math.max(5, bw * f), 5, 2.5); c.fillStyle = done ? '#ffe27a' : '#6ad0ff'; c.fill(); }
    txt(c, v + ' / ' + q.need, bx + bw + 8, by + 6, 11, COL.dim, 'left', { outline: false });
    txt(c, '+' + q.pts + 'pt', x + w - 116, y + rowH * .5 + 3, 14, '#ffe9a8', 'right');
    button('evq_' + q.id, x + w - 104, y + 3, 90, rowH - 10, got ? 'うけとり済' : 'うけとる', { glow: done && !got, style: done && !got ? 'gold' : 'off', disabled: !done || got, size: 12, col: '#5a3000' }, () => { if (evqClaim(sv, q)) { saveSave(); SFX.play('merge2'); toast('+' + q.pts + 'pt ゲット！'); } });
  });
}

// ふつうのキャラ（ガチャのキャラ）のかけらも、ポイントで交換できる（季節キャラより少し高い）
function drawEventOthers(c, L, sv, P, top) {
  const x = P ? 18 : 24, w = L.W - x * 2, h = (P ? L.H - 80 : 566 - 8) - top;
  if (!APP.evT2) APP.evT2 = 'E'; if (APP.evPg == null) APP.evPg = 0;
  panelBox(c, x, top, w, h, { fill: 'rgba(24,18,64,.88)' });
  txt(c, SEASON_NAME[SEASON_OF(eventMonth())] + 'の品ぞろえ（季節ごとに入れかわります）', x + 14, top + 24, 14, '#ffe9a8', 'left', { maxW: w - 320 });
  ['E', 'L', 'U'].forEach((t, i) => { button('ev_f' + t, x + w - 300 + i * 96, top + 8, 90, 28, TIER_NAME[t], { style: APP.evT2 === t ? 'gold' : 'ghost', size: 13, col: APP.evT2 === t ? '#5a3000' : TIER_COL[t] }, () => { APP.evT2 = t; APP.evPg = 0; }); });
  const list = eventAnyList(APP.evT2), per = P ? 6 : 5, pages = Math.max(1, Math.ceil(list.length / per)); APP.evPg = clamp(APP.evPg, 0, pages - 1);
  const rows = list.slice(APP.evPg * per, (APP.evPg + 1) * per), rowH = Math.min(66, (h - 90) / per), it = EVENT_SHOP_ANY[APP.evT2];
  rows.forEach((d, i) => {
    const y = top + 46 + i * rowH, own = isOwned(sv, d.key, APP.debugAll), p = piecesOf(sv, d.key), need = unlockNeed(d.key), got = eventBought(sv, d.key), can = eventPoints(sv) >= it.pts && got < it.limit;
    rr(c, x + 8, y, w - 16, rowH - 5, 10); c.fillStyle = 'rgba(50,40,120,.55)'; c.fill(); c.strokeStyle = TIER_COL[APP.evT2]; c.lineWidth = 1.4; c.stroke();
    drawSpriteAt(c, d.key, x + 44, y + rowH - 10, Math.min(52, rowH - 10), Math.floor(APP.t / .25) * .25 + i, 0, { hatch: 0 }, 1);
    txt(c, d.name, x + 86, y + rowH * .42, 15, '#fff', 'left', { maxW: w - 360 });
    txt(c, (own ? 'なかま（Lv' + lvOf(sv, d.key) + '）' : 'かけら ' + p + ' / ' + need) + '　1コ ' + it.pts + 'pt ・ 今月 ' + got + '/' + it.limit, x + 86, y + rowH * .75, 12, own ? '#ffe27a' : '#bff6ff', 'left', { outline: false, maxW: w - 330 });
    button('ev_o' + i, x + w - 112, y + (rowH - 5) / 2 - 16, 98, 32, 'こうかん', { glow: can, style: can ? 'gold' : 'off', disabled: !can, size: 14, col: '#5a3000' }, () => { const r = eventBuy(sv, d.key); if (r) { saveSave(); SFX.play(r.unlocked ? 'merge2' : 'summon'); toast(r.unlocked ? d.name + ' がなかまに！' : d.name + ' のかけら +1'); } });
  });
  button('ev_pg0', x + w / 2 - 120, top + h - 38, 60, 30, '◀', { style: 'ghost', size: 15 }, () => { APP.evPg = (APP.evPg + pages - 1) % pages; });
  txt(c, (APP.evPg + 1) + ' / ' + pages, x + w / 2, top + h - 17, 14, '#fff', 'center');
  button('ev_pg1', x + w / 2 + 60, top + h - 38, 60, 30, '▶', { style: 'ghost', size: 15 }, () => { APP.evPg = (APP.evPg + 1) % pages; });
}
