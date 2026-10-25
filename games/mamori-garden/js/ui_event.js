'use strict';
// ===== イベント画面：今月のイベントステージと、ポイント交換所 =====
function evPtsChip(c, x, y, w) {
  panelBox(c, x, y, w, 30, { r: 15, fill: 'rgba(24,18,64,.82)', shine: false, lw: 1.4 });
  star5(c, x + 16, y + 15, 8, '#ffe27a', 'rgba(70,40,10,.8)'); txt(c, eventPoints(APP.save) + ' pt', x + w - 12, y + 21, 16, '#ffe9a8', 'right');
}
function drawEvent(c, dt) {
  const L = APP.L, sv = APP.save, P = L.portrait, m = eventMonth(), idx = eventStageIdx(m), st = STAGES[idx], season = SEASON_OF(m);
  drawMenuBg(c, dt, idx, .5);
  txt(c, m + '月のイベント', L.W / 2, 44, P ? 28 : 32, '#fff8e8', 'center'); txt(c, `${SEASON_NAME[season]}の季節イベント　あと${eventDaysLeft()}日　（ポイントは今月だけ使えます）`, L.W / 2, 68, P ? 12 : 14, COL.dim, 'center', { outline: false, maxW: L.W - 20 });
  evPtsChip(c, L.W - 150, 10, 138);
  // ステージ
  const sx = P ? 18 : 24, sy = P ? 90 : 90, sw = P ? L.W - 36 : 300, sh = P ? 250 : 360;
  panelBox(c, sx, sy, sw, sh, { fill: 'rgba(24,18,64,.88)', stroke: 'rgba(255,233,168,.9)' });
  drawStageThumb(c, idx, sx + 8, sy + 8, sw - 16, P ? 150 : 190, false, APP.t);
  txt(c, st.name, sx + sw / 2, sy + (P ? 186 : 226), P ? 20 : 20, '#fff8e8', 'center', { maxW: sw - 16 });
  txt(c, st.sub + '　ボス：' + BOSSES[st.boss].name, sx + sw / 2, sy + (P ? 208 : 250), 12, '#ffd0a8', 'center', { outline: false, maxW: sw - 16 });
  const cleared = sv.stars[idx] > 0;
  button('ev_go', sx + 20, sy + sh - (P ? 42 : 62), sw - 40, P ? 34 : 46, 'チャレンジ！（クリアで +' + eventPointsFor(3, APP.diff) + 'pt まで）', { glow: true, style: 'primary', size: P ? 14 : 15 }, () => { APP.stage = idx; APP.endless = false; APP.fpage = 0; go('formation'); });
  // 交換所
  const rx = P ? 18 : 344, ry = P ? sy + sh + 14 : 90, rw = P ? L.W - 36 : L.W - 344 - 24, rh = P ? L.H - ry - 80 : 360;
  panelBox(c, rx, ry, rw, rh, { fill: 'rgba(24,18,64,.88)' });
  txt(c, `${SEASON_NAME[season]}の限定キャラと こうかん`, rx + 14, ry + 26, 16, '#ffe9a8', 'left', { maxW: rw - 28 });
  const rows = seasonChars(season), rowH = Math.min(100, (rh - 44) / Math.max(1, rows.length));
  rows.forEach((d, i) => {
    const y = ry + 38 + i * rowH, t = tierOf(d.key), it = EVENT_SHOP[t], own = isOwned(sv, d.key, APP.debugAll), p = piecesOf(sv, d.key), need = unlockNeed(d.key), got = eventBought(sv, d.key);
    rr(c, rx + 8, y, rw - 16, rowH - 6, 10); c.fillStyle = 'rgba(50,40,120,.55)'; c.fill(); c.strokeStyle = TIER_COL[t]; c.lineWidth = 1.6; c.stroke();
    drawSpriteAt(c, d.key, rx + 48, y + rowH - 14, Math.min(70, rowH - 16), APP.t + i, 0, { hatch: 0 }, 1);
    txt(c, d.name, rx + 92, y + 22, 15, '#fff', 'left', { maxW: rw - 260 }); tierTag(c, t, rx + rw - 150, y + 16);
    txt(c, own ? 'なかま（Lv' + lvOf(sv, d.key) + '）' : `かけら ${p} / ${need}`, rx + 92, y + 42, 12, own ? '#ffe27a' : COL.dim, 'left', { outline: false });
    txt(c, `1コ ${it.pts}pt ・ 今月 ${got}/${it.limit}`, rx + 92, y + 60, 12, '#bff6ff', 'left', { outline: false, maxW: rw - 260 });
    const can = eventPoints(sv) >= it.pts && got < it.limit;
    button('ev_buy' + i, rx + rw - 112, y + 20, 98, 34, 'こうかん', { glow: can, style: can ? 'gold' : 'off', disabled: !can, size: 14, col: '#5a3000' }, () => { const r = eventBuy(sv, d.key); if (r) { saveSave(); SFX.play(r.unlocked ? 'merge2' : 'summon'); toast(r.unlocked ? d.name + ' がなかまに！' : d.name + ' のかけら +1'); } });
  });
  txt(c, 'ポイントは、その月のイベントでだけ使えます。来月・来年には持ちこせません。', rx + 14, ry + rh - 8, 11, COL.dim, 'left', { outline: false, maxW: rw - 28 });
  button('ev_back', P ? 18 : 24, P ? L.H - 64 : 560, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('title'));
}
