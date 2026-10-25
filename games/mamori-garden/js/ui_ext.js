'use strict';
// ===== マップ（10ステージ）・編成（ページ送り・難易度）・戦闘開始／終了 =====
const PER_PAGE = 24;
function dcOf(sv, stage) { return sv.diffClear && sv.diffClear[stage] != null ? sv.diffClear[stage] : -1; }
function diffOpen(stage, d) { return APP.debugAll || d <= 1 || dcOf(APP.save, stage) >= d - 1; }
function pager(c, id, x, y, page, pages, set, label) {
  if (pages <= 1) return;
  button(id + '_p', x, y, 34, 28, '◀', { style: 'ghost', size: 13, r: 8 }, () => set((page + pages - 1) % pages));
  txt(c, (label || '') + (page + 1) + '/' + pages, x + 34 + 36, y + 20, 14, '#fff8e8', 'center');
  button(id + '_n', x + 108, y, 34, 28, '▶', { style: 'ghost', size: 13, r: 8 }, () => set((page + 1) % pages));
}

function drawMap(c, dt) {
  const L = APP.L, P = L.portrait; drawMenuBg(c, dt, APP.stage, 0.45);
  txt(c, APP.mapEndless ? 'エンドレス：ステージをえらぶ' : 'ステージをえらぶ', L.W / 2, 56, P ? 28 : 34, '#fff8e8', 'center');
  const sv = APP.save, endlessOk = sv.stars[0] > 0 || APP.debugAll, pages = Math.ceil(NORMAL_STAGES / 5), base = (APP.mapPage || 0) * 5;
  const cards = [];
  if (!P) { const w = 172, gap = 12, x0 = (L.W - (5 * w + 4 * gap)) / 2; for (let i = 0; i < 5; i++) cards.push({ x: x0 + i * (w + gap), y: 100, w, h: 380 }); }
  else for (let i = 0; i < 5; i++) cards.push({ x: 25, y: 90 + i * 128, w: 490, h: 118 });
  for (let k = 0; k < 5; k++) {
    const i = base + k, r = cards[k]; if (i >= NORMAL_STAGES) break;
    const open = stageOpen(i) && (!APP.mapEndless || sv.stars[i] > 0 || APP.debugAll), st = STAGES[i], dc = dcOf(sv, i);
    panelBox(c, r.x, r.y, r.w, r.h, { fill: 'rgba(24,18,64,.88)', stroke: open ? 'rgba(255,233,168,.9)' : 'rgba(150,140,190,.5)' });
    const pad = 8, clr = sv.stars[i] > 0 ? 'クリア：' + DIFFS[Math.max(0, dc)].name : 'NEW!';
    if (!P) {
      drawStageThumb(c, i, r.x + pad, r.y + pad, r.w - pad * 2, 190, !open, APP.t + i);
      txt(c, (i + 1) + '. ' + st.name, r.x + r.w / 2, r.y + 226, 20, open ? '#fff8e8' : '#9d97bd', 'center', { maxW: r.w - 14 });
      txt(c, st.sub, r.x + r.w / 2, r.y + 250, 12, COL.dim, 'center', { outline: false, maxW: r.w - 14 });
      txt(c, open ? 'ボス：' + BOSSES[st.boss].name : '？？？', r.x + r.w / 2, r.y + 278, 12, '#ffd0a8', 'center', { outline: false, maxW: r.w - 14 });
      for (let q = 0; q < 3; q++) star5(c, r.x + r.w / 2 + (q - 1) * 30, r.y + 312, 11, sv.stars[i] > q ? '#ffe27a' : 'rgba(255,255,255,.18)', 'rgba(60,30,80,.7)');
      if (!open) txt(c, APP.mapEndless ? 'クリアで解放' : '前のステージを\nクリア', r.x + r.w / 2, r.y + 352, 12, '#cfc8ee', 'center', { outline: false });
      else txt(c, clr, r.x + r.w / 2, r.y + 352, 13, sv.stars[i] > 0 ? COL.teal : COL.pink, 'center', { maxW: r.w - 14 });
    } else {
      drawStageThumb(c, i, r.x + pad, r.y + pad, 150, r.h - pad * 2, !open, APP.t + i);
      txt(c, (i + 1) + '. ' + st.name, r.x + 174, r.y + 38, 24, open ? '#fff8e8' : '#9d97bd', 'left', { maxW: r.w - 186 });
      txt(c, st.sub, r.x + 174, r.y + 60, 13, COL.dim, 'left', { outline: false, maxW: r.w - 186 });
      txt(c, open ? 'ボス：' + BOSSES[st.boss].name : '？？？', r.x + 174, r.y + 82, 13, '#ffd0a8', 'left', { outline: false, maxW: r.w - 186 });
      for (let q = 0; q < 3; q++) star5(c, r.x + 184 + q * 28, r.y + 102, 10, sv.stars[i] > q ? '#ffe27a' : 'rgba(255,255,255,.18)', 'rgba(60,30,80,.7)');
      if (!open) txt(c, APP.mapEndless ? 'クリアで解放' : '前のステージをクリア', r.x + r.w - 12, r.y + 104, 12, '#cfc8ee', 'right', { outline: false });
      else txt(c, clr, r.x + r.w - 12, r.y + 104, 12, sv.stars[i] > 0 ? COL.teal : COL.pink, 'right', { outline: false });
    }
    if (open) button('stage' + i, r.x, r.y, r.w, r.h, '', { style: 'ghost', transparent: true, r: 12 }, () => { APP.stage = i; APP.endless = APP.mapEndless; APP.fpage = 0; go('formation'); });
  }
  const by = P ? 850 : 520, bw = P ? 150 : 170;
  button('m_back', 24, by, bw, 52, 'もどる', { style: 'ghost', size: 18 }, () => go('title'));
  button('m_mode', L.W / 2 - 110, by, 220, 52, APP.mapEndless ? 'モード：エンドレス' : 'モード：ふつう', { style: endlessOk ? 'good' : 'off', size: 17, disabled: !endlessOk }, () => { APP.mapEndless = !APP.mapEndless; });
  if (endlessOk) txt(c, `エンドレス最高：WAVE ${sv.endlessBest}`, L.W / 2, by + 74, 13, COL.dim, 'center', { outline: false });
  button('m_snd', L.W - 24 - bw, by, bw, 52, AUD.muted ? 'おと：OFF' : 'おと：ON', { style: 'ghost', size: 17 }, () => audioMute(!AUD.muted));
  const by3 = by + (P ? 62 : 60);
  button('m_gacha', L.W / 2 - 170, by3, 164, 46, 'ガチャ', { style: 'gold', size: 17, col: '#5a3000' }, () => { APP.gacha = null; go('gacha'); });
  button('m_coll', L.W / 2 + 6, by3, 164, 46, 'なかま強化', { style: 'good', size: 16 }, () => { APP.cfocus = APP.save.form[0]; APP.cpage = 0; go('collection'); });
  gemChip(c, 12, 10, 130);
  pager(c, 'mp', L.W - 150, 14, APP.mapPage || 0, pages, v => { APP.mapPage = v; }, '');
}

function drawFormation(c, dt) {
  const L = APP.L, P = L.portrait, sv = APP.save, form = sv.form; drawMenuBg(c, dt, APP.stage, 0.5);
  const dn = DIFFS[APP.diff];
  txt(c, '5体をえらんで出撃！', L.W / 2, 44, P ? 26 : 30, '#fff8e8', 'center');
  txt(c, `${STAGES[APP.stage].name}${APP.endless ? '（エンドレス）' : ''}　難易度：${dn.name}（敵HP×${dn.hp} ・ジェム×${dn.gem}）`, L.W / 2, 68, P ? 12 : 14, dn.col, 'center', { outline: false });
  const pages = Math.ceil(UNIT_LIST.length / PER_PAGE), pg = Math.min(APP.fpage || 0, pages - 1);
  pager(c, 'fp', P ? 10 : 20, 12, pg, pages, v => { APP.fpage = v; });
  let cw, ch, gx, gy, cols, gap;
  if (!P) { cw = 96; ch = 100; gap = 6; cols = 6; gx = 24; gy = 82; } else { cw = 82; ch = 92; gap = 4; cols = 6; gx = (L.W - (6 * 82 + 20)) / 2; gy = 80; }
  UNIT_LIST.slice(pg * PER_PAGE, (pg + 1) * PER_PAGE).forEach((d, i) => {
    const x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap), un = isUnlocked(d.key), idx = form.indexOf(d.key);
    unitCard(c, d.key, x, y, cw, ch, { locked: !un, sel: idx >= 0, focus: APP.focus === d.key, order: idx >= 0 ? idx + 1 : 0, hint: unlockHint(d.key), lv: un ? lvOf(sv, d.key) : 0 });
    button('f_' + d.key, x, y, cw, ch, '', { style: 'ghost', transparent: true }, () => {
      APP.focus = d.key; if (!un) return;
      if (idx >= 0) form.splice(idx, 1); else if (form.length < 5) form.push(d.key); else toast('5体までです。外したいキャラをタップ');
      saveSave();
    });
  });
  const dx = P ? 18 : 650, dy = P ? gy + 4 * (ch + gap) + 2 : 84, dw = P ? L.W - 36 : 288, dh = P ? 290 : 330;
  unitDetail(c, APP.focus, dx, dy, dw, dh, isUnlocked(APP.focus) ? lvOf(sv, APP.focus) : 0);
  // 選択中スロット
  const sy = P ? dy + dh + 8 : gy + 4 * (ch + gap) + 6, sw = P ? 82 : 96, sh = P ? 76 : 84, sx0 = P ? gx : 24;
  for (let i = 0; i < 5; i++) {
    const x = sx0 + i * (sw + 6);
    if (form[i]) unitCard(c, form[i], x, sy, sw, sh, { sel: true, small: true, noCost: false });
    else { panelBox(c, x, sy, sw, sh, { r: 10, fill: 'rgba(20,14,50,.7)', stroke: 'rgba(180,170,230,.4)', shine: false }); txt(c, '' + (i + 1), x + sw / 2, sy + sh / 2 + 8, 26, 'rgba(255,255,255,.25)', 'center', { outline: false }); }
  }
  // 難易度
  const chipsX = P ? 18 : 650, chipsY = P ? sy + sh + 8 : dy + dh + 22, perRow = P ? 6 : 3, chW = P ? (dw - 5 * 4) / 6 : 90, chH = 32;
  if (!P) txt(c, 'なんいど', chipsX, chipsY - 6, 13, COL.dim, 'left', { outline: false });
  DIFFS.forEach((d, i) => {
    const open = diffOpen(APP.stage, i), x = chipsX + (i % perRow) * (chW + (P ? 4 : 6)), y = chipsY + Math.floor(i / perRow) * (chH + 6), sel = APP.diff === i;
    button('d_' + i, x, y, chW, chH, open ? d.name : d.name, { style: sel ? 'gold' : open ? 'ghost' : 'off', disabled: !open, size: P ? 11 : 13, col: sel ? '#5a3000' : open ? d.col : '#a09cb8', r: 8 }, () => { APP.diff = i; sv.lastDiff = i; saveSave(); });
  });
  if (!P) txt(c, '前のなんいどをクリアすると次が解放', chipsX, chipsY + 2 * (chH + 6) + 12, 11, COL.dim, 'left', { outline: false });
  const ready = form.length === 5, by = P ? L.H - 62 : L.H - 70;
  button('f_back', P ? 18 : 650, by, 120, 52, 'もどる', { style: 'ghost', size: 17 }, () => go('map'));
  button('f_go', P ? L.W - 18 - 200 : 780, by, P ? 200 : 158, 52, ready ? '出撃！' : `あと${5 - form.length}体`, { style: ready ? 'primary' : 'off', size: 22, disabled: !ready }, () => startBattle());
}

function startBattle() {
  const sv = APP.save; sv.plays++; sv.lastDiff = APP.diff; saveSave();
  fxClear(); newBattle(APP.stage, sv.form, APP.portrait, APP.endless, sv.lvl, APP.diff); ART.bgKey = ''; warmSprites(sv.form, G.L.S);
  APP.b = { sel: null, placing: null, dragU: null, speed: 1, paused: false, resultT: 0, saved: false, acc: 0, hint: sv.plays <= 1, ptrField: false };
  go('battle'); bgmIntensity(0);
  FX.banner(`${STAGES[APP.stage].name}  出撃！`);
}

function finishBattle(B) {
  if (B.saved) return; B.saved = true;
  const sv = APP.save;
  if (G.over === 'win') {
    const stars = G.life >= 20 ? 3 : G.life >= 15 ? 2 : 1; B.starsGot = stars; B.newUnits = [];
    if (!G.endless) {
      const before = sv.stars[APP.stage];
      if (stars > before) sv.stars[APP.stage] = stars;
      if (!sv.diffClear) sv.diffClear = [];
      if (G.diff > dcOf(sv, APP.stage)) { sv.diffClear[APP.stage] = G.diff; if (G.diff < DIFFS.length - 1 && G.diff >= 1) B.diffUnlocked = G.diff + 1; }
    }
  } else if (G.endless) { if (G.wave - 1 > sv.endlessBest) sv.endlessBest = G.wave - 1; }
  if (G.over === 'lose' && !G.endless) B.starsGot = 0;
  B.gemsGot = gemsForBattle(G.over === 'win' ? G.wave + 1 : G.wave, G.over === 'win', B.starsGot || 0, G.endless, G.diff); sv.gems += B.gemsGot;
  B.ticketGot = ticketDrop(sv, G.over === 'win', G.endless, G.diff);
  if (G.over === 'win' && !G.endless && APP.stage >= NORMAL_STAGES) { B.evPts = eventPointsFor(B.starsGot || 1, G.diff); sv.evp[eventYM()] = (sv.evp[eventYM()] || 0) + B.evPts; }
  saveSave();
}
