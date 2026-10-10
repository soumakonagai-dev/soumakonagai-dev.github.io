// メニュー系の画面（ホーム・ステージ選択・ガチャ・そうび）。バトル以外の描画と入力。
// main.js から BB.menu.draw / click が呼ばれる。ui は main.js の描画ヘルパー一式。
BB.menu = (function () {
  const D = BB.data, E = BB.equip, G = D.gacha, A = BB.art;
  const RC = { N: '#9aa3b8', R: '#4aa3ff', SR: '#b36bff', SSR: '#ffc53d', UR: '#ff5ac8' };
  const SLOT_ORDER = ['weapon', 'armor', 'acc'];
  const THEME_ART = { forest: 'slime', meadow: 'dragon', grave: 'golem', castle: 'demon', ice: 'ice', volcano: 'volcano', sky: 'sky', mush: 'mush', sea: 'sea', desert: 'desert', factory: 'factory', void: 'void', crystal: 'crystal', storm: 'storm', candy: 'candy', space: 'space', throne: 'throne', carnival: 'carnival', pirate: 'pirate', sakura: 'sakura', jurassic: 'jurassic', chaos: 'chaos' };
  const LIST_TOP = 58, LIST_BOTTOM = 572, CARD_PITCH = 112;   // ステージ一覧の表示範囲（これをはみ出す分はスクロール）
  let stageScroll = 0, equipTab = 'weapon', pdrag = null, buddyScroll = 0;

  let hits = [], sel = null, toast = null;
  let rateScroll = 0;
  let chStage = -1, chLevel = 1;   // チャレンジで選んでいるステージ・難易度
  let scoutSel = null, recruitRes = null, buddySel = null;   // スカウト場で選んだ候補 / スカウト結果 / 図鑑で選んだバディ
  const RCOL = RC;
  let gKind = 'normal';                 // 'normal' | 'rare' | 'ultra'
  let gacha = { phase: 'idle', results: [], t0: 0, n: 1, best: 'N', played: false };

  const reg = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
  const save = () => BB.save.data;

  function enter(name) {
    if (name === 'gacha') gacha = { phase: 'idle', results: [], t0: 0, n: 1, best: 'N', played: false };
    if (name === 'equip' && !(sel in save().owned)) sel = null;
    if (name === 'scout') { scoutSel = null; recruitRes = null; }
    if (name === 'challenge') {   // クリア済みのステージのうち一番先のもの、前回の最高 +1 の難易度から
      const list = D.stages.map((st, i) => i).filter(i => (save().stages[D.stages[i].id] || {}).cleared);
      if (list.length) {
        if (!list.includes(chStage)) chStage = list[list.length - 1];
        chLevel = Math.min(D.challenge.maxLevel, (save().challenge[D.stages[chStage].id] || 0) + 1);
      }
    }
    if (name === 'stages') {   // 次に挑戦するステージが見える位置までスクロール
      const next = D.stages.findIndex((st, i) => E.isUnlocked(save(), i) && !(save().stages[st.id] || {}).cleared);
      stageScroll = Math.max(0, (next < 0 ? D.stages.length - 1 : next) * CARD_PITCH - 90);
    }
  }
  function showToast(t, msg) { toast = { msg, t0: t }; }

  // ---------- 部品 ----------
  function coinChip(ui, x, y, w) {
    const c = ui.ctx;
    c.fillStyle = 'rgba(8,12,28,.72)'; ui.rr(x, y, w, 26, 13); c.fill();
    c.strokeStyle = 'rgba(255,210,74,.6)'; c.lineWidth = 1; ui.rr(x + .5, y + .5, w - 1, 25, 12.5); c.stroke();
    const g = c.createRadialGradient(x + 14, y + 11, 1, x + 15, y + 13, 10);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#e0a010');
    c.fillStyle = g; c.beginPath(); c.arc(x + 15, y + 13, 9, 0, 7); c.fill();
    c.strokeStyle = '#a56a00'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + 15, y + 13, 6, 0, 7); c.stroke();
    ui.text(String(save().coins), x + w - 10, y + 14, 14, '#ffe08a', 'right', true);
  }

  function header(ui, title, back) {
    const c = ui.ctx;
    c.fillStyle = 'rgba(8,12,28,.7)'; c.beginPath(); c.arc(28, 30, 16, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.stroke();
    ui.text('‹', 27, 29, 26, '#fff', 'center', true);
    reg(8, 12, 40, 40, () => { ui.SFX.play('ui'); ui.go(back); });
    ui.textO(title, 180, 30, 19, '#fff', 'center');
    coinChip(ui, 246, 17, 104);
  }

  // 装備カード。lv=0 は未所持
  function itemCard(ui, x, y, w, h, item, lv, o) {
    o = o || {};
    const c = ui.ctx, col = RC[item.rarity], owned = lv > 0;
    c.save();
    c.fillStyle = ui.lin(0, y, 0, y + h, [[0, owned ? A.rgba(col, .38) : 'rgba(30,38,76,.7)'], [1, owned ? A.rgba(col, .12) : 'rgba(16,22,50,.8)']]);
    ui.rr(x, y, w, h, 10); c.fill();
    c.strokeStyle = owned ? col : 'rgba(255,255,255,.18)'; c.lineWidth = o.selected ? 3 : 1.5;
    if (o.selected) { c.shadowColor = col; c.shadowBlur = 10; }
    ui.rr(x + .8, y + .8, w - 1.6, h - 1.6, 10); c.stroke();
    c.restore();
    if (owned && item.rarity === 'UR') {       // にじ色のきらめき
      const k = ((o.t || 0) / 1800 + x / 300) % 1;
      c.save(); ui.rr(x, y, w, h, 10); c.clip();
      const g = c.createLinearGradient(x + (k * 2 - 1) * w, y, x + (k * 2 - 1) * w + w * 1.2, y + h);
      ['#ff5a5a', '#ffd24a', '#5aff9a', '#5ad8ff', '#a05aff', '#ff5ac8'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), A.rgba(col, .34)));
      c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
    }
    if (owned && item.rarity === 'SSR') {      // 金色のきらめき
      const k = ((o.t || 0) / 1400 + x / 200) % 1;
      c.save(); ui.rr(x, y, w, h, 10); c.clip();
      const g = c.createLinearGradient(x + (k * 2 - .5) * w, y, x + (k * 2 - .5) * w + w * .5, y + h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,240,180,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
    }
    const small = w < 80;
    // レア度
    c.fillStyle = owned ? col : 'rgba(255,255,255,.2)'; ui.rr(x + 4, y + 4, small ? 24 : 30, small ? 11 : 14, 4); c.fill();
    ui.text(item.rarity, x + 4 + (small ? 12 : 15), y + (small ? 9.8 : 11.2), small ? 8 : 10, '#10142a', 'center', true);
    if (owned && lv > 1) ui.text('+' + (lv - 1), x + w - 5, y + (small ? 10 : 11.5), small ? 10 : 12, lv - 1 >= 10 ? '#ffd24a' : '#fff', 'right', true);
    if (o.count) ui.text('×' + o.count, x + 6, y + h - (small ? 24 : 30), small ? 10 : 12, '#7dffb0', 'left', true);
    // アイコン
    if (owned) ui.text(item.icon, x + w / 2, y + h * .46, h * (small ? .36 : .34), '#fff', 'center');
    else ui.text('?', x + w / 2, y + h * .46, h * .34, 'rgba(255,255,255,.25)', 'center', true);
    if (!o.noName) ui.text(owned ? item.name : '？？？', x + w / 2, y + h - (small ? 9 : 13), small ? 9 : 11, owned ? '#fff' : '#6b7391', 'center', true);
    if (o.equipped) { c.fillStyle = '#2fbf71'; c.beginPath(); c.arc(x + w - 11, y + h - 25, 8, 0, 7); c.fill(); ui.text('E', x + w - 11, y + h - 24.5, 10, '#fff', 'center', true); }
  }

  function slotLabel(slot) { return D.slots[slot]; }

  // ---------- ホーム ----------
  function drawHome(ui, t) {
    ui.bg();
    coinChip(ui, 14, 12, 110);
    ui.speaker(330, 24, ui.SFX.mode);
    if (BB.debugOn) {   // ?debug=1 で開いたときだけ出る
      ui.ctx.fillStyle = 'rgba(255,60,90,.85)'; ui.rr(14, 44, 64, 22, 11); ui.ctx.fill();
      ui.text('DEBUG', 46, 55.5, 11, '#fff', 'center', true);
      reg(14, 44, 64, 22, () => { ui.SFX.play('ui'); ui.go('debug'); });
    }
    ui.drawArt('slime', 180, 152, .5, 'idle', t / 1000);
    ui.ctx.save(); ui.ctx.translate(180, 62);
    ui.ctx.shadowColor = 'rgba(160,110,255,.8)'; ui.ctx.shadowBlur = 16;
    ui.textO('バトルブラスト', 0, 0, 32, '#ffd86a', 'center', '#2a1670', 8);
    ui.ctx.restore();
    ui.text('ブロックパズル × ターン制バトル', 180, 94, 12, '#b9c2f0', 'center', true);

    const badge = (x, y, show) => {
      if (!show) return;
      const k = 1 + .08 * Math.sin(t / 200);
      ui.ctx.save(); ui.ctx.translate(x, y); ui.ctx.scale(k, k);
      ui.ctx.fillStyle = '#ff4d6d'; ui.ctx.beginPath(); ui.ctx.arc(0, 0, 11, 0, 7); ui.ctx.fill();
      ui.text('!', 0, 1, 14, '#fff', 'center', true); ui.ctx.restore();
    };
    const B = (y, label, color, pulse, to) => { ui.button(60, y, 240, 42, label, color, pulse, 17); reg(60, y, 240, 42, () => { ui.SFX.play('ui'); ui.go(to); }); };
    B(200, '冒険に出る', '#2fbf71', true, 'stages');
    B(247, 'スカウト', '#e08a2a', false, 'scout');
    badge(292, 251, !!save().scout);
    B(294, 'チャレンジ', '#e0484a', false, 'challenge');
    B(341, 'エンドレス', '#0e9aa7', false, 'endless');
    B(388, 'ガチャ', '#8b5cf6', false, 'gacha');
    badge(292, 392, save().coins >= G.kinds.normal.cost);
    B(435, 'そうび', '#2f7bff', false, 'equip');

    // そうび中・バディ
    ui.text('そうび', 105, 500, 11, '#8e98c8', 'center', true);
    SLOT_ORDER.forEach((slot, i) => {
      const id = save().equipped[slot], item = id && E.byId[id], x = 30 + i * 52;
      ui.ctx.fillStyle = 'rgba(8,12,28,.6)'; ui.rr(x, 510, 46, 46, 11); ui.ctx.fill();
      ui.ctx.strokeStyle = item ? RC[item.rarity] : 'rgba(255,255,255,.18)'; ui.ctx.lineWidth = 1.5; ui.rr(x + .5, 510.5, 45, 45, 11); ui.ctx.stroke();
      if (item) ui.text(item.icon, x + 23, 534, 24, '#fff', 'center'); else ui.text(slotLabel(slot), x + 23, 534, 10, '#6b7391', 'center', true);
    });
    reg(24, 504, 164, 58, () => { ui.SFX.play('ui'); ui.go('equip'); });
    ui.text('バディ', 265, 500, 11, '#8e98c8', 'center', true);
    for (let i = 0; i < 2; i++) {
      const id = save().party[i], b = id && D.buddyMap[id], x = 214 + i * 56;
      ui.ctx.fillStyle = 'rgba(8,12,28,.6)'; ui.rr(x, 510, 46, 46, 11); ui.ctx.fill();
      ui.ctx.strokeStyle = b ? RC[b.rarity] : 'rgba(255,255,255,.18)'; ui.ctx.lineWidth = 1.5; ui.rr(x + .5, 510.5, 45, 45, 11); ui.ctx.stroke();
      if (b) ui.text(b.emoji, x + 23, 535, 25, '#fff', 'center'); else ui.text('なし', x + 23, 534, 10, '#6b7391', 'center', true);
    }
    reg(208, 504, 120, 58, () => { ui.SFX.play('ui'); ui.go('scout'); });
    const stars = Object.values(save().stages).reduce((a, st) => a + st.stars, 0);
    ui.text('★ ' + stars + ' / ' + D.stages.length * 3, 180, 590, 12, '#cfd6ee', 'center', true);
  }

  // ---------- ステージ選択 ----------
  function drawStages(ui, t) {
    ui.bg();
    header(ui, 'ステージ選択', 'home');
    const maxScroll = Math.max(0, D.stages.length * CARD_PITCH - (LIST_BOTTOM - LIST_TOP) + 8);
    stageScroll = Math.max(0, Math.min(maxScroll, stageScroll));
    ui.ctx.save();
    ui.ctx.beginPath(); ui.ctx.rect(0, LIST_TOP, 360, LIST_BOTTOM - LIST_TOP); ui.ctx.clip();
    D.stages.forEach((st, i) => {
      const y = 62 + i * CARD_PITCH - stageScroll, h = 104, unlocked = E.isUnlocked(save(), i), rec = save().stages[st.id];
      if (y + h < LIST_TOP || y > LIST_BOTTOM) return;
      const art = THEME_ART[st.theme], th = A.theme(art);
      const c = ui.ctx;
      ui.card(14, y, 332, h, th.sky[0], th.sky[1], 16);
      c.save(); ui.rr(14, y, 332, h, 16); c.clip();
      const g = c.createRadialGradient(290, y + 60, 4, 290, y + 60, 130);
      g.addColorStop(0, A.rgba(th.glow, .3)); g.addColorStop(1, A.rgba(th.glow, 0));
      c.fillStyle = g; c.fillRect(14, y, 332, h); c.restore();
      st.enemies.forEach((k, j) => ui.drawArt(D.enemies[k].art, 218 + j * 46, y + 58 + (j === 2 ? -4 : 6), (j === 2 ? .3 : .23) * (A.fit[D.enemies[k].art] || 1), 'idle', t / 1000 + j, !unlocked));
      ui.text('STAGE ' + (i + 1), 30, y + 18, 11, '#cfd6ee', 'left', true);
      ui.textO(st.name, 30, y + 38, 18, '#fff', 'left');
      ui.text(st.desc, 30, y + 60, 11, '#d6dcf2', 'left');
      for (let s = 0; s < 3; s++) ui.text('★', 36 + s * 20, y + 82, 18, rec && s < rec.stars ? '#ffd24a' : 'rgba(255,255,255,.25)', 'center');
      ui.text('🪙 +' + (st.reward.clear + (rec && rec.cleared ? 0 : st.reward.first)), 336, y + 88, 12, '#ffe08a', 'right', true);
      if (rec && rec.cleared) ui.text('CLEAR', 336, y + 18, 11, '#7dffb0', 'right', true);
      if (!unlocked) {
        c.fillStyle = 'rgba(6,9,22,.72)'; ui.rr(14, y, 332, h, 16); c.fill();
        ui.text('🔒', 180, y + 40, 28, '#fff', 'center');
        ui.text('ステージ ' + i + ' をクリアで解放', 180, y + 76, 13, '#cfd6ee', 'center', true);
      } else {
        const vy0 = Math.max(y, LIST_TOP), vy1 = Math.min(y + h, LIST_BOTTOM);
        reg(14, vy0, 332, vy1 - vy0, () => { ui.SFX.play('ui'); ui.startStage(i); });
      }
    });
    ui.ctx.restore();
    if (maxScroll > 0) {   // スクロールバー
      const th = (LIST_BOTTOM - LIST_TOP) * (LIST_BOTTOM - LIST_TOP) / (D.stages.length * CARD_PITCH), ty = LIST_TOP + (LIST_BOTTOM - LIST_TOP - th) * stageScroll / maxScroll;
      ui.ctx.fillStyle = 'rgba(255,255,255,.28)'; ui.rr(353, ty, 4, th, 2); ui.ctx.fill();
      if (stageScroll < maxScroll - 4) ui.text('▼', 180, LIST_BOTTOM - 2, 11, 'rgba(255,255,255,.55)', 'center', true);
    }
    // そうび・バディの確認
    ui.text('そうび', 14, 600, 11, '#8e98c8', 'left', true);
    SLOT_ORDER.forEach((slot, i) => {
      const id = save().equipped[slot], item = id && E.byId[id], x = 56 + i * 38;
      ui.ctx.fillStyle = 'rgba(8,12,28,.6)'; ui.rr(x, 583, 34, 34, 8); ui.ctx.fill();
      if (item) ui.text(item.icon, x + 17, 601, 18, '#fff', 'center');
    });
    ui.text('バディ', 176, 600, 11, '#8e98c8', 'left', true);
    for (let i = 0; i < 2; i++) {
      const id = save().party[i], b = id && D.buddyMap[id], x = 218 + i * 38;
      ui.ctx.fillStyle = 'rgba(8,12,28,.6)'; ui.rr(x, 583, 34, 34, 8); ui.ctx.fill();
      if (b) ui.text(b.emoji, x + 17, 601, 18, '#fff', 'center');
    }
    reg(210, 578, 84, 44, () => { ui.SFX.play('ui'); ui.go('scout'); });
    ui.button(298, 580, 52, 40, 'へんせい', '#2f7bff', false, 11);
    reg(298, 580, 52, 40, () => { ui.SFX.play('ui'); ui.go('equip'); });
  }

  // ---------- ガチャ ----------
  function drawMachine(ui, t, cx, cy, anim) {
    const c = ui.ctx;
    c.save();
    if (anim.shake) c.translate((Math.random() - .5) * anim.shake, (Math.random() - .5) * anim.shake * .6);
    // 台座
    const rare = anim.kind === 'rare', ultra = anim.kind === 'ultra';
    c.fillStyle = ui.lin(0, cy + 62, 0, cy + 150, ultra ? [[0, '#a24ad8'], [1, '#341060']] : rare ? [[0, '#f2c14a'], [1, '#9a6a10']] : [[0, '#e0455f'], [1, '#8c1a3a']]);
    ui.rr(cx - 86, cy + 62, 172, 88, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)'; ui.rr(cx - 80, cy + 66, 160, 18, 9); c.fill();
    c.fillStyle = '#2a0c20'; ui.rr(cx - 34, cy + 112, 68, 30, 8); c.fill();     // 取り出し口
    c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(cx, cy + 96, 15, 0, 7); c.fill();   // つまみ
    c.save(); c.translate(cx, cy + 96); c.rotate(anim.knob || 0); c.fillStyle = '#a56a00'; c.fillRect(-12, -3, 24, 6); c.restore();
    // ドーム
    c.fillStyle = 'rgba(190,225,255,.16)'; c.beginPath(); c.arc(cx, cy - 6, 84, Math.PI, 0); c.lineTo(cx + 84, cy + 64); c.lineTo(cx - 84, cy + 64); c.closePath(); c.fill();
    const cols = ultra ? ['#b36bff', '#ffc53d', '#ff5ac8', '#5ad8ff', '#b36bff', '#ffd24a'] : rare ? ['#4aa3ff', '#b36bff', '#ffc53d', '#4aa3ff', '#b36bff', '#ffc53d'] : ['#9aa3b8', '#4aa3ff', '#b36bff', '#ffc53d', '#ff6b8b', '#4ade80'];
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4, rr0 = 22 + (i * 17) % 52, bx = cx + Math.cos(a) * rr0 * 1.05, by = cy + 30 - Math.abs(Math.sin(a * .7)) * rr0 * .8 + Math.sin(t / 380 + i) * (anim.shake ? 6 : 1.5);
      const col = cols[i % cols.length], g = c.createRadialGradient(bx - 4, by - 4, 1, bx, by, 14);
      g.addColorStop(0, '#fff'); g.addColorStop(.3, col); g.addColorStop(1, A.shade(col, -.4));
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, 13, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy - 6, 84, Math.PI, 0); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy - 6, 70, Math.PI * 1.1, Math.PI * 1.35); c.stroke();
    c.restore();
  }

  function startPull(ui, t, n) {
    const res = E.pull(save(), n, null, gKind, E.now());
    if (!res) { showToast(t, 'コインが足りません'); ui.SFX.play('pick'); return; }
    const order = E.RARITY_ORDER;
    const best = res.reduce((b, r) => order.indexOf(r.item.rarity) > order.indexOf(b) ? r.item.rarity : b, 'N');
    gacha = { phase: 'anim', results: res, t0: t, n, best, played: false };
    ui.SFX.play('charge');
  }

  function drawGacha(ui, t) {
    ui.bg();
    header(ui, 'ガチャ', 'home');
    const c = ui.ctx, age = t - gacha.t0, ANIM = 1700;
    if (gacha.phase === 'anim' && age >= ANIM) { gacha.phase = 'result'; gacha.t0 = t; gacha.played = false; }
    if (gacha.phase === 'idle' || gacha.phase === 'anim') {
      const shake = gacha.phase === 'anim' ? Math.min(14, age / 90) : 0;
      drawMachine(ui, t, 180, 186, { shake, kind: gKind, knob: gacha.phase === 'anim' ? age / 120 : 0 });
      if (gacha.phase === 'anim' && age > 1100) {          // カプセルが落ちてくる
        const u = A.clamp((age - 1100) / 400, 0, 1), y = 300 + u * 70;
        c.fillStyle = RC[gacha.best]; c.beginPath(); c.arc(180, y, 16, Math.PI, 0); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(180, y, 16, 0, Math.PI); c.fill();
      }
      if (gacha.phase === 'anim' && age > 1450) {          // 光
        const u = A.clamp((age - 1450) / 250, 0, 1), g = c.createRadialGradient(180, 370, 4, 180, 370, 40 + u * 320);
        g.addColorStop(0, 'rgba(255,255,255,' + u + ')'); g.addColorStop(.4, A.rgba(RC[gacha.best], .6 * u)); g.addColorStop(1, A.rgba(RC[gacha.best], 0));
        c.fillStyle = g; c.fillRect(0, 0, 360, 640);
      }
      const K = G.kinds[gKind], rt = E.ratesOf(gKind), busy = gacha.phase === 'anim';
      const KC = { normal: '#2f7bff', rare: '#e0a020', ultra: '#d946a8' };
      const NOTE = { normal: 'SSR・URは出ません（レア・ウルトラで登場）', rare: 'R以上が必ず出る！ SSRが出るのはここから', ultra: 'SR以上が必ず出る！ 最高レア「UR」が登場' };
      ui.textO(K.name + 'ガチャ', 180, 372, 20, gKind === 'normal' ? '#fff' : gKind === 'rare' ? '#ffd86a' : '#ff9ae0', 'center');
      ui.text(E.RARITY_ORDER.filter(k => rt[k] > 0).map(k => k + ' ' + rt[k] + '%').join('   '), 180, 398, 11, '#b9c2f0', 'center', true);
      ui.text(NOTE[gKind], 180, 418, 10.5, gKind === 'normal' ? '#8e98c8' : '#ffd86a', 'center', gKind !== 'normal');
      ui.text('同じ装備は「ざいりょう」になり、合体で +1（最大 +' + G.maxPlus + '）', 180, 436, 10.5, '#8e98c8', 'center');
      [[24, 150, 1, K.cost, '1回'], [186, 150, 10, K.cost10, '10回']].forEach(([x, w, n, cost, label]) => {
        const ok = save().coins >= cost && !busy;
        if (ok) ui.button(x, 470, w, 58, label + '  🪙' + cost, KC[gKind], n === 10, label === '10回' && cost >= 4500 ? 15 : 16);
        else ui.disabledButton(x, 470, w, 58, label + '  🪙' + cost, 15);
        if (!busy) reg(x, 470, w, 58, () => startPull(ui, t, n));
      });
      ui.text(K.min10 ? '10回は' + K.min10 + '以上が1つ確定' : 'どの回もSR以上が確定', 261, 544, 11, '#ffd86a', 'center', true);
      // ガチャの切り替え
      [['normal', 'ノーマル', 14], ['rare', 'レア', 128], ['ultra', 'ウルトラ', 242]].forEach(([k, label, x]) => {
        const on = gKind === k, col = KC[k];
        c.fillStyle = on ? A.rgba(col, .88) : 'rgba(8,12,28,.7)'; ui.rr(x, 62, 104, 26, 13); c.fill();
        c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.25)'; c.lineWidth = 1; ui.rr(x + .5, 62.5, 103, 25, 12.5); c.stroke();
        ui.text(label, x + 52, 75.5, 13, on ? '#fff' : '#9aa3c4', 'center', true);
        if (!busy) reg(x, 62, 104, 26, () => { if (gKind !== k) { gKind = k; ui.SFX.play('pick'); } });
      });
      drawPickupStrip(ui, t);
      if (!busy) {
        c.fillStyle = 'rgba(8,12,28,.75)'; ui.rr(12, 100, 70, 26, 13); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; ui.rr(12.5, 100.5, 69, 25, 12.5); c.stroke();
        ui.text('確率表', 47, 113.5, 12, '#fff', 'center', true);
        reg(12, 100, 70, 26, () => { ui.SFX.play('ui'); rateScroll = 0; ui.go('rates'); });
      }
      return;
    }
    // 結果
    const age2 = t - gacha.t0, res = gacha.results, one = res.length === 1;
    if (!gacha.played) {
      gacha.played = true;
      ui.SFX.play(gacha.best === 'UR' || gacha.best === 'SSR' ? 'special' : gacha.best === 'SR' ? 'perfect' : 'heal');
    }
    const flash = A.clamp(1 - age2 / 600, 0, 1);
    c.fillStyle = 'rgba(6,9,22,.55)'; c.fillRect(0, 56, 360, 584);
    const g = c.createRadialGradient(180, 280, 10, 180, 280, 300); g.addColorStop(0, A.rgba(RC[gacha.best], .35)); g.addColorStop(1, A.rgba(RC[gacha.best], 0));
    c.fillStyle = g; c.fillRect(0, 56, 360, 584);
    res.forEach((r, i) => {
      const u = A.ease((age2 - i * (one ? 0 : 110)) / 380);
      if (u <= 0) return;
      c.save();
      let x, y, w, h;
      if (one) { w = 160; h = 210; x = 100; y = 120; } else { w = 62; h = 90; x = 13 + (i % 5) * 68; y = 96 + Math.floor(i / 5) * 128; }
      c.translate(x + w / 2, y + h / 2); c.scale(.5 + .5 * u, .5 + .5 * u); c.translate(-(x + w / 2), -(y + h / 2)); c.globalAlpha = u;
      itemCard(ui, x, y, w, h, r.item, r.level, { t, noName: one });
      if (one) ui.textO(r.item.name, 180, y + h - 22, 16, '#fff', 'center');
      if (r.pickup) ui.text('★ PICK UP', x + w / 2, y - 7, one ? 12 : 8.5, '#ffd24a', 'center', true);
      const tag = r.isNew ? ['NEW!', '#ff4d6d'] : ['素材 +1', '#4ade80'];
      c.fillStyle = tag[1]; ui.rr(x + w / 2 - (one ? 34 : 24), y + h + 6, one ? 68 : 48, one ? 20 : 15, 7); c.fill();
      ui.text(tag[0], x + w / 2, y + h + (one ? 16 : 13.8), one ? 12 : 9.5, '#fff', 'center', true);
      if (!one) ui.text(r.item.name, x + w / 2, y + h + 30, 9, '#e6ebff', 'center', true);
      c.restore();
    });
    if (one) {
      const r = res[0];
      E.describe(r.item, r.level).forEach((l, i) => ui.text(l, 180, 372 + i * 20, 13, '#e6ebff', 'center', true));
    }
    if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + flash * .7 + ')'; c.fillRect(0, 0, 360, 640); }
    const cost = E.costOf(gKind, gacha.n), can = save().coins >= cost;
    if (can) ui.button(24, 556, 150, 52, 'もう一度 🪙' + cost, '#8b5cf6', false, 14); else ui.disabledButton(24, 556, 150, 52, 'もう一度 🪙' + cost, 14);
    reg(24, 556, 150, 52, () => startPull(ui, t, gacha.n));
    ui.button(186, 556, 150, 52, 'OK', '#2fbf71', true, 18);
    reg(186, 556, 150, 52, () => { ui.SFX.play('ui'); gacha = { phase: 'idle', results: [], t0: 0, n: 1, best: 'N', played: false }; });
  }

  // ---------- ピックアップと確率表 ----------
  const fmtTime = ms => { const sec = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), ss = sec % 60; return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0'); };
  const fmtRate = r => (r >= 10 ? r.toFixed(1) : r >= 1 ? r.toFixed(2) : r.toFixed(3)) + '%';
  // ガチャ画面の下: いまのピックアップと、入れ替わるまでの時間
  function drawPickupStrip(ui, t) {
    const c = ui.ctx, now = E.now(), pk = E.pickups(gKind, now);
    ui.card(12, 556, 336, 66, 'rgba(60,50,110,.8)', 'rgba(24,20,60,.85)', 12);
    ui.text('PICK UP', 22, 572, 11.5, '#ffd24a', 'left', true);
    ui.text('あと ' + fmtTime(E.nextPickupAt(now) - now), 22, 592, 12, '#fff', 'left', true);
    ui.text('1時間ごとに入れかわり', 22, 609, 9, '#9aa3c4', 'left');
    pk.forEach((p, i) => {
      const x = 108 + i * 80, col = RC[p.rarity];
      c.fillStyle = A.rgba(col, .22); ui.rr(x, 562, 74, 54, 10); c.fill();
      c.strokeStyle = col; c.lineWidth = 1.5; ui.rr(x + .5, 562.5, 73, 53, 10); c.stroke();
      ui.text(p.rarity, x + 12, 572, 8.5, col, 'left', true);
      ui.text(p.item.icon, x + 37, 589, 20, '#fff', 'center');
      ui.text(p.item.name.length > 7 ? p.item.name.slice(0, 6) + '…' : p.item.name, x + 37, 609, 8.5, '#fff', 'center', true);
    });
    reg(12, 556, 336, 66, () => { ui.SFX.play('ui'); rateScroll = 0; ui.go('rates'); });
  }

  function drawRates(ui, t) {
    ui.bg();
    header(ui, 'ガチャ確率表', 'gacha');
    const c = ui.ctx, now = E.now(), K = G.kinds[gKind], rt = E.ratesOf(gKind);
    const KC = { normal: '#2f7bff', rare: '#e0a020', ultra: '#d946a8' };
    [['normal', 'ノーマル', 14], ['rare', 'レア', 128], ['ultra', 'ウルトラ', 242]].forEach(([k, label, x]) => {
      const on = gKind === k;
      c.fillStyle = on ? A.rgba(KC[k], .88) : 'rgba(8,12,28,.7)'; ui.rr(x, 60, 104, 26, 13); c.fill();
      c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.25)'; c.lineWidth = 1; ui.rr(x + .5, 60.5, 103, 25, 12.5); c.stroke();
      ui.text(label, x + 52, 73.5, 13, on ? '#fff' : '#9aa3c4', 'center', true);
      reg(x, 60, 104, 26, () => { if (gKind !== k) { gKind = k; rateScroll = 0; ui.SFX.play('pick'); } });
    });
    // レア度ごとの確率と、ピックアップの入れ替わり
    ui.card(12, 94, 336, 60, 'rgba(40,50,100,.9)', 'rgba(20,26,60,.95)', 12);
    const ks = E.RARITY_ORDER.filter(k => rt[k] > 0), cw = 336 / ks.length;
    ks.forEach((k, i) => { const cx = 12 + cw * i + cw / 2; ui.text(k, cx, 108, 11, RC[k], 'center', true); ui.text(fmtRate(rt[k]), cx, 126, 13, '#fff', 'center', true); });
    ui.text('★ PICK UP は同じレア度の中で約' + G.pickBoost + '倍出やすい　入れかわりまで ' + fmtTime(E.nextPickupAt(now) - now), 180, 144, 9.5, '#ffd24a', 'center', true);
    // 装備ごとの確率（スクロール）
    const rows = E.itemRates(gKind, now), RH = 28, LT = 160, LB = 626;
    const maxS = Math.max(0, rows.length * RH - (LB - LT) + 6);
    rateScroll = Math.max(0, Math.min(maxS, rateScroll));
    c.save(); c.beginPath(); c.rect(0, LT, 360, LB - LT); c.clip();
    rows.forEach((r, i) => {
      const y = LT + 2 + i * RH - rateScroll;
      if (y + RH < LT || y > LB) return;
      c.fillStyle = r.pick ? 'rgba(255,210,74,.2)' : i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)';
      ui.rr(12, y, 336, RH - 3, 7); c.fill();
      if (r.pick) { c.strokeStyle = 'rgba(255,210,74,.8)'; c.lineWidth = 1.2; ui.rr(12.5, y + .5, 335, RH - 4, 7); c.stroke(); }
      c.fillStyle = RC[r.rarity]; ui.rr(18, y + 6, 26, 13, 4); c.fill();
      ui.text(r.rarity, 31, y + 12.8, 8.5, '#10142a', 'center', true);
      ui.text(r.item.icon, 58, y + 12.5, 15, '#fff', 'center');
      ui.text(r.item.name, 74, y + 12.5, 11, '#fff', 'left', true);
      if (r.pick) ui.text('★PICK UP', 240, y + 12.5, 9, '#ffd24a', 'right', true);
      ui.text(fmtRate(r.rate), 340, y + 12.5, 12, r.pick ? '#ffe08a' : '#cfd6ee', 'right', true);
    });
    c.restore();
    if (maxS > 0) {
      const th = (LB - LT) * (LB - LT) / (rows.length * RH), ty = LT + (LB - LT - th) * rateScroll / maxS;
      c.fillStyle = 'rgba(255,255,255,.28)'; ui.rr(354, ty, 4, th, 2); c.fill();
    }
  }

  // ---------- そうび ----------
  function drawEquip(ui, t) {
    ui.bg();
    header(ui, 'そうび', 'home');
    const sv = save(), c = ui.ctx;
    // スロット
    SLOT_ORDER.forEach((slot, i) => {
      const x = 12 + i * 114, id = sv.equipped[slot], item = id && E.byId[id];
      c.fillStyle = 'rgba(8,12,28,.62)'; ui.rr(x, 62, 108, 78, 12); c.fill();
      c.strokeStyle = item ? RC[item.rarity] : 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; ui.rr(x + .75, 62.75, 106.5, 76.5, 12); c.stroke();
      ui.text(slotLabel(slot), x + 8, 76, 10, '#8e98c8', 'left', true);
      if (item) {
        ui.text(item.icon, x + 54, 102, 28, '#fff', 'center');
        ui.text(item.name, x + 54, 128, 10, '#fff', 'center', true);
        if (sv.owned[id] > 0) ui.text('+' + sv.owned[id], x + 100, 76, 11, sv.owned[id] >= 10 ? '#ffd24a' : '#fff', 'right', true);
        reg(x, 62, 108, 78, () => { sel = id; ui.SFX.play('pick'); });
      } else ui.text('なし', x + 54, 106, 13, '#6b7391', 'center', true);
    });
    // 詳細
    const it = sel && E.byId[sel], lv = it && sel in sv.owned ? sv.owned[sel] + 1 : 0;
    c.fillStyle = 'rgba(8,12,28,.62)'; ui.rr(12, 148, 336, 92, 12); c.fill();
    if (it && lv > 0) {
      ui.text(it.icon, 42, 176, 28, '#fff', 'center');
      ui.textO(it.name, 70, 166, 15, '#fff', 'left');
      ui.text(it.rarity + '  ・  ' + slotLabel(it.slot) + '  ・  +' + (lv - 1) + (lv - 1 >= G.maxPlus ? ' (MAX)' : ''), 70, 186, 11, RC[it.rarity], 'left', true);
      const lines = E.describe(it, lv);
      lines.slice(0, 6).forEach((l, i) => ui.text('・' + l, i % 2 ? 134 : 20, 202 + Math.floor(i / 2) * 14, 9.5, '#e6ebff', 'left'));   // 効果は 2 列 × 最大 3 段（ボタンに重ならない幅）
      const eq = sv.equipped[it.slot] === sel;
      if (eq) ui.button(262, 156, 78, 30, 'はずす', '#c0485a', false, 13); else ui.button(262, 156, 78, 30, 'そうび', '#2fbf71', true, 13);
      reg(262, 156, 78, 30, () => { E.equip(sv, sel); ui.SFX.play('ui'); });
      ui.button(262, 196, 78, 30, '合体', '#e0a020', (sv.spare[sel] || 0) > 0 || E.spareList(sv, it.rarity).length > 0, 13);
      reg(262, 196, 78, 30, () => { ui.SFX.play('ui'); ui.go('fuse'); });
    } else ui.text('そうびを選んでください', 180, 194, 13, '#8e98c8', 'center', true);
    // 一覧（武器・防具・アクセのタブで切り替え）
    SLOT_ORDER.forEach((slot, i) => {
      const x = 12 + i * 114, on = equipTab === slot;
      c.fillStyle = on ? 'rgba(47,123,255,.85)' : 'rgba(8,12,28,.7)'; ui.rr(x, 246, 108, 24, 12); c.fill();
      c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.22)'; c.lineWidth = 1; ui.rr(x + .5, 246.5, 107, 23, 11.5); c.stroke();
      const own = D.equipment.filter(e => e.slot === slot && e.id in sv.owned).length, all = D.equipment.filter(e => e.slot === slot).length;
      ui.text(slotLabel(slot) + ' ' + own + '/' + all, x + 54, 258.5, 11.5, on ? '#fff' : '#9aa3c4', 'center', true);
      reg(x, 246, 108, 24, () => { equipTab = slot; ui.SFX.play('pick'); });
    });
    const items = D.equipment.filter(e => e.slot === equipTab).sort((a, b) => E.RARITY_ORDER.indexOf(b.rarity) - E.RARITY_ORDER.indexOf(a.rarity));
    const cw = 80, ch = 62, gx = 8, gy = 4, x0 = 8, y0 = 276;
    items.forEach((item, i) => {
      const x = x0 + (i % 4) * (cw + gx), y = y0 + Math.floor(i / 4) * (ch + gy), l = item.id in sv.owned ? sv.owned[item.id] + 1 : 0;
      itemCard(ui, x, y, cw, ch, item, l, { selected: sel === item.id, equipped: sv.equipped[item.slot] === item.id, t, count: sv.spare[item.id] });
      reg(x, y, cw, ch, () => { sel = item.id; ui.SFX.play('pick'); });
    });
    const have = Object.keys(sv.owned).length;
    ui.text('所持 ' + have + ' / ' + D.equipment.length, 180, 628, 11, '#8e98c8', 'center', true);
  }

  // ---------- 合体（凸） ----------
  let fuseFx = 0;
  function drawFuse(ui, t) {
    ui.bg();
    header(ui, 'そうび合体', 'equip');
    const sv = save(), c = ui.ctx, it = E.byId[sel];
    if (!it || !(sel in sv.owned)) { ui.text('そうびを選んでください', 180, 300, 14, '#8e98c8', 'center', true); return; }
    const plus = sv.owned[sel], max = G.maxPlus, col = RC[it.rarity], maxed = plus >= max;
    // 合体する装備
    c.fillStyle = 'rgba(8,12,28,.62)'; ui.rr(12, 60, 336, 152, 14); c.fill();
    itemCard(ui, 22, 70, 84, 116, it, plus + 1, { t, noName: true });
    ui.textO(it.name, 118, 82, 16, '#fff', 'left');
    ui.text(it.rarity + '  ・  ' + slotLabel(it.slot), 118, 102, 11, col, 'left', true);
    ui.textO('+' + plus, 118, 126, 26, plus >= 10 ? '#ffd24a' : '#fff', 'left');
    ui.text('/ +' + max, 176, 128, 13, '#8e98c8', 'left', true);
    c.fillStyle = 'rgba(255,255,255,.12)'; ui.rr(118, 144, 222, 9, 4.5); c.fill();
    if (plus > 0) { c.fillStyle = ui.lin(118, 0, 340, 0, [[0, '#ffd24a'], [1, '#ff8a3d']]); ui.rr(118, 144, Math.max(9, 222 * plus / max), 9, 4.5); c.fill(); }
    const now = E.describe(it, plus + 1), nxt = E.describe(it, plus + 2);
    now.slice(0, 3).forEach((l, i) => {
      ui.text(l, 118, 168 + i * 14, 10, '#e6ebff', 'left');
      if (!maxed) ui.text('→ ' + nxt[i], 232, 168 + i * 14, 10, '#7dffb0', 'left', true);
    });
    if (maxed) ui.text('MAX', 300, 128, 18, '#ffd24a', 'right', true);
    if (fuseFx && t - fuseFx < 700) {
      const u = (t - fuseFx) / 700, g = c.createRadialGradient(64, 128, 4, 64, 128, 30 + u * 90);
      g.addColorStop(0, 'rgba(255,240,170,' + (.8 * (1 - u)) + ')'); g.addColorStop(1, 'rgba(255,200,80,0)');
      c.fillStyle = g; c.fillRect(0, 56, 360, 170);
      c.strokeStyle = 'rgba(255,230,140,' + (1 - u) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(64, 128, 20 + u * 80, 0, 7); c.stroke();
    }
    // 素材
    const spares = E.spareList(sv, it.rarity);
    ui.text('ざいりょう（同じレア度 ' + it.rarity + ' のダブり）', 20, 232, 12, '#cfd6ee', 'left', true);
    if (maxed) ui.text('これ以上は強くできません', 180, 340, 14, '#ffd24a', 'center', true);
    else if (!spares.length) {
      ui.text('ざいりょうがありません', 180, 320, 14, '#8e98c8', 'center', true);
      ui.text('ガチャで ' + it.rarity + ' の装備がダブると', 180, 346, 12, '#6b7391', 'center');
      ui.text('ここで合体の素材にできます', 180, 364, 12, '#6b7391', 'center');
    } else {
      spares.forEach((s, i) => {
        const x = 8 + (i % 4) * 88, y = 244 + Math.floor(i / 4) * 78;
        itemCard(ui, x, y, 80, 70, s.item, 1, { t, count: s.count });
        reg(x, y, 80, 70, () => {
          if (E.fuse(sv, sel, s.item.id)) { fuseFx = t; ui.SFX.play('perfect'); showToast(t, it.name + ' が +' + sv.owned[sel] + ' になった！'); }
        });
      });
      ui.text('タップで 1 つ合体（+1）', 180, 540, 11, '#8e98c8', 'center');
      ui.button(70, 556, 220, 48, 'まとめて合体', '#e0a020', true, 16);
      reg(70, 556, 220, 48, () => {
        const n = E.fuseAll(sv, sel);
        if (n) { fuseFx = t; ui.SFX.play('perfect'); showToast(t, n + ' 個合体！ +' + sv.owned[sel]); }
      });
    }
  }

  // ---------- スカウト ----------
  // バディのカード（図鑑・編成用）
  function buddyCard(ui, x, y, w, h, b, lv, o) {
    o = o || {};
    const c = ui.ctx, col = RC[b.rarity], owned = lv > 0;
    c.fillStyle = ui.lin(0, y, 0, y + h, [[0, owned ? A.rgba(col, .38) : 'rgba(30,38,76,.7)'], [1, owned ? A.rgba(col, .12) : 'rgba(16,22,50,.8)']]);
    ui.rr(x, y, w, h, 10); c.fill();
    c.save();
    c.strokeStyle = owned ? col : 'rgba(255,255,255,.18)'; c.lineWidth = o.selected ? 3 : 1.5;
    if (o.selected) { c.shadowColor = col; c.shadowBlur = 10; }
    ui.rr(x + .8, y + .8, w - 1.6, h - 1.6, 10); c.stroke();
    c.restore();
    c.fillStyle = owned ? col : 'rgba(255,255,255,.2)'; ui.rr(x + 4, y + 4, b.rarity.length > 2 ? 28 : 22, 12, 4); c.fill();
    ui.text(b.rarity, x + 4 + (b.rarity.length > 2 ? 14 : 11), y + 10.2, 8.5, '#10142a', 'center', true);
    if (owned) ui.text('Lv' + lv, x + w - 5, y + 10.5, 10, lv >= BB.data.scout.maxLevel ? '#ffd24a' : '#fff', 'right', true);
    if (owned) ui.text(b.emoji, x + w / 2, y + h * .46 + Math.sin((o.t || 0) / 500 + x) * 1.5, h * .36, '#fff', 'center');
    else ui.text('?', x + w / 2, y + h * .46, h * .34, 'rgba(255,255,255,.25)', 'center', true);
    ui.text(owned ? b.name : '？？？', x + w / 2, y + h - 10, 9, owned ? '#fff' : '#6b7391', 'center', true);
    if (o.party) { c.fillStyle = '#2fbf71'; c.beginPath(); c.arc(x + w - 11, y + h - 26, 8, 0, 7); c.fill(); ui.text('P', x + w - 11, y + h - 25.5, 10, '#fff', 'center', true); }
  }

  // 編成中の 2 匹（タップで図鑑へ）
  function partySlots(ui, y, goTo) {
    const sv = save(), c = ui.ctx;
    for (let i = 0; i < 2; i++) {
      const x = 12 + i * 174, id = sv.party[i], b = id && D.buddyMap[id];
      c.fillStyle = 'rgba(8,12,28,.62)'; ui.rr(x, y, 162, 62, 12); c.fill();
      c.strokeStyle = b ? RC[b.rarity] : 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; ui.rr(x + .75, y + .75, 160.5, 60.5, 12); c.stroke();
      if (b) {
        ui.text(b.emoji, x + 28, y + 32, 30, '#fff', 'center');
        ui.text(b.name, x + 54, y + 20, 12, '#fff', 'left', true);
        ui.text(BB.scout.skillName(id), x + 54, y + 38, 10.5, '#ffe08a', 'left', true);
        ui.text('Lv' + sv.buddies[id], x + 54, y + 53, 9.5, '#9aa3c4', 'left', true);
      } else ui.text('バディなし', x + 81, y + 31, 12, '#6b7391', 'center', true);
    }
    reg(12, y, 336, 62, () => { ui.SFX.play('pick'); ui.go(goTo); });
  }

  function drawScout(ui, t) {
    ui.bg();
    header(ui, 'スカウト', 'home');
    const sv = save(), c = ui.ctx, SC = BB.scout;
    partySlots(ui, 62, 'buddies');
    ui.text('せんとうに連れていけるバディ（2匹まで）', 14, 140, 10.5, '#8e98c8', 'left', true);

    if (recruitRes) {                       // スカウト結果
      const r = recruitRes, d = D.buddyMap[r.id], age = t - r.t0, u = A.ease(age / 400), col = RC[d.rarity];
      c.fillStyle = 'rgba(6,9,22,.82)'; c.fillRect(0, 56, 360, 584);
      const g = c.createRadialGradient(180, 280, 10, 180, 280, 260); g.addColorStop(0, A.rgba(col, .4)); g.addColorStop(1, A.rgba(col, 0));
      c.fillStyle = g; c.fillRect(0, 56, 360, 584);
      c.save(); c.translate(180, 300); c.scale(.6 + .4 * u, .6 + .4 * u); c.globalAlpha = u; c.translate(-180, -300);
      ui.card(50, 150, 260, 330, '#31407f', '#1a2250', 22);
      ui.textO('スカウト成功!', 180, 186, 22, '#ffd24a', 'center');
      ui.text(d.emoji, 180, 262 + Math.sin(t / 300) * 4, 80, '#fff', 'center');
      ui.textO(d.name, 180, 330, 20, '#fff', 'center');
      ui.text(d.rarity + '  ・  ' + SC.skillName(r.id), 180, 356, 12, col, 'center', true);
      ui.text(SC.desc(r.id, r.lv), 180, 380, 11, '#cfd6ee', 'center');
      const tag = r.isNew ? ['NEW! なかまになった', '#ff4d6d'] : r.coins ? ['Lv最大!  +' + r.coins + 'コイン', '#ffd24a'] : ['Lv UP!  Lv' + r.lv, '#4ade80'];
      c.fillStyle = tag[1]; ui.rr(180 - 86, 400, 172, 26, 13); c.fill();
      ui.text(tag[0], 180, 413.5, 12.5, '#fff', 'center', true);
      c.restore();
      ui.button(80, 500, 200, 50, 'OK', '#2fbf71', true, 18);
      reg(80, 500, 200, 50, () => { ui.SFX.play('ui'); recruitRes = null; });
      return;
    }

    if (sv.scout) {                         // スカウト場
      ui.textO('スカウト場', 180, 172, 20, '#ffd86a', 'center');
      ui.text('なかまにするバディを選ぼう（スカウトできるのは1匹だけ！）', 180, 196, 11, '#cfd6ee', 'center', true);
      sv.scout.candidates.forEach((id, i) => {
        const b = D.buddyMap[id], y = 214 + i * 96, owned = sv.buddies[id] || 0, on = scoutSel === id, col = RC[b.rarity];
        c.fillStyle = ui.lin(0, y, 0, y + 88, [[0, A.rgba(col, .34)], [1, A.rgba(col, .1)]]);
        ui.rr(12, y, 336, 88, 14); c.fill();
        c.save();
        c.strokeStyle = on ? '#fff' : col; c.lineWidth = on ? 3 : 1.5;
        if (on) { c.shadowColor = col; c.shadowBlur = 12; }
        ui.rr(12.8, y + .8, 334.4, 86.4, 14); c.stroke();
        c.restore();
        c.fillStyle = 'rgba(8,12,28,.5)'; ui.rr(20, y + 8, 72, 72, 12); c.fill();
        ui.text(b.emoji, 56, y + 46 + Math.sin(t / 400 + i) * 3, 44, '#fff', 'center');
        ui.textO(b.name, 102, y + 22, 15, '#fff', 'left');
        c.fillStyle = col; ui.rr(102 + 4 + (b.name.length * 15), y + 13, b.rarity.length > 2 ? 30 : 24, 14, 5); c.fill();
        ui.text(b.rarity, 102 + 4 + (b.name.length * 15) + (b.rarity.length > 2 ? 15 : 12), y + 20.5, 9.5, '#10142a', 'center', true);
        ui.text(SC.skillName(id), 102, y + 44, 12, '#ffe08a', 'left', true);
        ui.text(SC.desc(id, (owned || 0) + 1 > BB.data.scout.maxLevel ? owned : (owned || 0) + 1), 102, y + 64, 10.5, '#e6ebff', 'left');
        ui.text(owned ? 'もっている Lv' + owned + (owned < BB.data.scout.maxLevel ? ' → Lv' + (owned + 1) : ' (MAX)') : 'NEW', 340, y + 79, 9.5, owned ? '#7dffb0' : '#ff8aa0', 'right', true);
        reg(12, y, 336, 88, () => { scoutSel = id; ui.SFX.play('pick'); });
      });
      if (scoutSel) ui.button(60, 512, 240, 52, 'この子をスカウト!', '#e08a2a', true, 17);
      else ui.disabledButton(60, 512, 240, 52, 'バディを選んでください', 14);
      reg(60, 512, 240, 52, () => {
        if (!scoutSel) return;
        const res = SC.recruit(sv, scoutSel);
        if (res) { recruitRes = Object.assign({ t0: t }, res); ui.SFX.play(D.buddyMap[res.id].rarity === 'SSR' || D.buddyMap[res.id].rarity === 'UR' ? 'special' : D.buddyMap[res.id].rarity === 'SR' ? 'perfect' : 'heal'); scoutSel = null; }
      });
      ui.text('ほかのバディは、またスカウト開始で会える', 180, 590, 10.5, '#8e98c8', 'center');
      return;
    }

    // スカウト開始前
    const st = SC.spec(sv), names = st.enemies.map(k => D.enemies[k].name);
    ui.text('🏕️', 180, 218 + Math.sin(t / 500) * 4, 62, '#fff', 'center');
    ui.textO('スカウト遠征', 180, 274, 21, '#fff', 'center');
    ui.text('「スカウト開始」のあと、2回の戦闘に勝とう！', 180, 304, 12, '#cfd6ee', 'center', true);
    ui.text('勝ってスカウト場に戻ると、いろんなバディが現れる。', 180, 324, 12, '#cfd6ee', 'center');
    ui.text('ただし、仲間にできるのは1匹だけ。', 180, 344, 12, '#ffe08a', 'center', true);
    ui.text('今回の相手： ' + names.join(' → '), 180, 378, 12, '#9fd4ff', 'center', true);
    ui.button(60, 402, 240, 58, 'スカウト開始', '#2fbf71', true, 20);
    reg(60, 402, 240, 58, () => { ui.SFX.play('ui'); ui.startScout(); });
    ui.button(60, 478, 240, 44, 'バディ図鑑・へんせい', '#2f7bff', false, 14);
    reg(60, 478, 240, 44, () => { ui.SFX.play('ui'); ui.go('buddies'); });
    const rt = SC.ratesFor(sv);
    ui.text('いまの出現率   N ' + rt.N + '%   R ' + rt.R + '%   SR ' + rt.SR + '%   SSR ' + rt.SSR + '%' + (rt.UR ? '   UR ' + rt.UR + '%' : ''), 180, 544, rt.UR ? 10.5 : 11, '#ffe08a', 'center', true);
    ui.text('ステージを進めるほど、レアなバディが出やすくなる', 180, 562, 10.5, '#8e98c8', 'center');
    ui.text('同じバディをスカウトすると Lv アップ（最大 Lv' + BB.data.scout.maxLevel + '）', 180, 580, 10.5, '#8e98c8', 'center');
  }

  function drawBuddies(ui, t) {
    ui.bg();
    header(ui, 'バディ図鑑', 'scout');
    const sv = save(), c = ui.ctx, SC = BB.scout, M = BB.data.scout.maxLevel;
    partySlots(ui, 62, 'buddies');
    // 詳細
    const b = buddySel && D.buddyMap[buddySel], lv = b ? sv.buddies[buddySel] || 0 : 0;
    c.fillStyle = 'rgba(8,12,28,.62)'; ui.rr(12, 132, 336, 96, 12); c.fill();
    if (b && lv > 0) {
      ui.text(b.emoji, 40, 166, 34, '#fff', 'center');
      ui.textO(b.name, 70, 150, 15, '#fff', 'left');
      ui.text(b.rarity + '  ・  Lv' + lv + (lv >= M ? ' (MAX)' : ''), 70, 170, 11, RC[b.rarity], 'left', true);
      ui.text(SC.skillName(buddySel) + '： ' + SC.desc(buddySel, lv), 22, 196, 10.5, '#e6ebff', 'left');
      if (lv < M) ui.text('Lv' + (lv + 1) + 'では： ' + SC.desc(buddySel, lv + 1), 22, 214, 10, '#7dffb0', 'left');
      const inP = sv.party.includes(buddySel);
      if (inP) ui.button(254, 140, 86, 30, 'はずす', '#c0485a', false, 13); else ui.button(254, 140, 86, 30, 'へんせい', '#2fbf71', true, 13);
      reg(254, 140, 86, 30, () => {
        if (!SC.toggleParty(sv, buddySel)) showToast(t, '2匹まで。はずしてから選んでね');
        else ui.SFX.play('ui');
      });
    } else ui.text(b ? 'まだ仲間にしていない' : 'バディを選んでください', 180, 180, 13, '#8e98c8', 'center', true);
    // 一覧
    const order = ['UR', 'SSR', 'SR', 'R', 'N'];
    const list = D.buddies.slice().sort((x, y) => order.indexOf(x.rarity) - order.indexOf(y.rarity));
    // 一覧（数が多いのでスクロール）
    const GT = 236, GB = 610, PITCH = 82, rows = Math.ceil(list.length / 4);
    const maxS = Math.max(0, rows * PITCH - (GB - GT) + 6);
    buddyScroll = Math.max(0, Math.min(maxS, buddyScroll));
    c.save(); c.beginPath(); c.rect(0, GT, 360, GB - GT); c.clip();
    list.forEach((bd, i) => {
      const x = 8 + (i % 4) * 88, y = GT + 2 + Math.floor(i / 4) * PITCH - buddyScroll, l = sv.buddies[bd.id] || 0;
      if (y + 78 < GT || y > GB) return;
      buddyCard(ui, x, y, 80, 78, bd, l, { selected: buddySel === bd.id, party: sv.party.includes(bd.id), t });
      const vy0 = Math.max(y, GT), vy1 = Math.min(y + 78, GB);
      reg(x, vy0, 80, vy1 - vy0, () => { buddySel = bd.id; ui.SFX.play('pick'); });
    });
    c.restore();
    if (maxS > 0) {
      const th = (GB - GT) * (GB - GT) / (rows * PITCH), ty = GT + (GB - GT - th) * buddyScroll / maxS;
      c.fillStyle = 'rgba(255,255,255,.28)'; ui.rr(354, ty, 4, th, 2); c.fill();
      if (buddyScroll < maxS - 4) ui.text('▼', 180, GB - 4, 11, 'rgba(255,255,255,.6)', 'center', true);
    }
    ui.text('なかま ' + Object.keys(sv.buddies).length + ' / ' + D.buddies.length, 180, 626, 11, '#8e98c8', 'center', true);
  }

  // ---------- チャレンジ ----------
  const CH = D.challenge;
  const lvColor = l => 'hsl(' + Math.round(130 - (l - 1) * 6.4) + ',72%,46%)';   // 緑 → 赤
  function drawChallenge(ui, t) {
    ui.bg();
    header(ui, 'チャレンジ', 'home');
    const sv = save(), c = ui.ctx, L = BB.logic;
    const list = D.stages.map((st, i) => i).filter(i => (sv.stages[D.stages[i].id] || {}).cleared);
    if (!list.length) {
      ui.text('🔥', 180, 240, 56, '#fff', 'center');
      ui.textO('チャレンジモード', 180, 300, 20, '#fff', 'center');
      ui.text('ステージを 1 つクリアすると、', 180, 340, 13, '#cfd6ee', 'center');
      ui.text('好きな難易度で挑戦できるようになるよ。', 180, 362, 13, '#cfd6ee', 'center');
      ui.text('難易度が高いほど、コインがたくさんもらえる！', 180, 396, 12, '#ffe08a', 'center', true);
      return;
    }
    // ステージを選ぶ
    const st = D.stages[chStage], th = A.theme(THEME_ART[st.theme]), best = sv.challenge[st.id] || 0, pos = list.indexOf(chStage);
    ui.card(12, 62, 336, 86, th.sky[0], th.sky[1], 14);
    ui.textO(st.name, 180, 86, 17, '#fff', 'center');
    ui.text(st.desc, 180, 106, 10.5, '#d6dcf2', 'center');
    ui.text(best ? '最高クリア  Lv' + best : 'まだ未クリア', 180, 130, 11.5, best ? '#ffe08a' : '#9aa3c4', 'center', true);
    [[-1, 30, '◀'], [1, 330, '▶']].forEach(([d, x, ch]) => {
      const ok = list[pos + d] !== undefined;
      c.fillStyle = ok ? 'rgba(8,12,28,.65)' : 'rgba(8,12,28,.3)'; c.beginPath(); c.arc(x, 105, 15, 0, 7); c.fill();
      ui.text(ch, x, 105, 14, ok ? '#fff' : '#555c7a', 'center', true);
      if (ok) reg(x - 20, 82, 40, 46, () => { chStage = list[pos + d]; chLevel = Math.min(CH.maxLevel, (sv.challenge[D.stages[chStage].id] || 0) + 1); ui.SFX.play('pick'); });
    });
    // 難易度（1〜20）を選ぶ
    ui.text('難易度を選ぼう', 20, 168, 12, '#cfd6ee', 'left', true);
    const cw = 60, ch = 42, gap = 8, x0 = 14, y0 = 180;
    for (let l = 1; l <= CH.maxLevel; l++) {
      const col = (l - 1) % 5, row = Math.floor((l - 1) / 5), x = x0 + col * (cw + gap), y = y0 + row * (ch + gap), on = chLevel === l;
      c.save();
      if (on) { c.shadowColor = lvColor(l); c.shadowBlur = 14; }
      c.fillStyle = lvColor(l); ui.rr(x, y, cw, ch, 10); c.fill();
      c.restore();
      c.fillStyle = 'rgba(255,255,255,.22)'; ui.rr(x + 2, y + 2, cw - 4, ch * .42, 8); c.fill();
      c.strokeStyle = on ? '#fff' : 'rgba(0,0,0,.35)'; c.lineWidth = on ? 3 : 1; ui.rr(x + .5, y + .5, cw - 1, ch - 1, 10); c.stroke();
      ui.textO(String(l), x + cw / 2, y + ch / 2 + 1, 20, '#fff', 'center', 'rgba(0,0,0,.55)', 4);
      if (l <= best) ui.text('✓', x + cw - 10, y + 10, 12, '#fff', 'center', true);
      reg(x, y, cw, ch, () => { chLevel = l; ui.SFX.play('pick'); });
    }
    // この難易度の中身
    const ci = L.challengeInfo(chLevel), py = 400;
    ui.card(12, py, 336, 112, 'rgba(40,50,100,.9)', 'rgba(20,26,60,.95)', 14);
    c.fillStyle = lvColor(chLevel); ui.rr(24, py + 12, 74, 88, 12); c.fill();
    ui.text('Lv', 61, py + 32, 12, '#fff', 'center', true);
    ui.textO(String(chLevel), 61, py + 66, 38, '#fff', 'center', 'rgba(0,0,0,.5)', 5);
    ui.text('敵のHP', 112, py + 24, 12, '#cfd6ee', 'left', true); ui.text('×' + ci.hp.toFixed(2), 336, py + 24, 13, '#ffb0b0', 'right', true);
    ui.text('敵のこうげき', 112, py + 46, 12, '#cfd6ee', 'left', true); ui.text('×' + ci.atk.toFixed(2), 336, py + 46, 13, '#ffb0b0', 'right', true);
    ui.text('行動までの手数', 112, py + 68, 12, '#cfd6ee', 'left', true); ui.text(ci.countMinus ? '−' + ci.countMinus + '手' : 'ふつう', 336, py + 68, 13, ci.countMinus ? '#ffb0b0' : '#9aa3c4', 'right', true);
    ui.text('もらえるコイン', 112, py + 92, 13, '#ffe08a', 'left', true); ui.textO('×' + ci.coin.toFixed(2), 336, py + 92, 17, '#ffe08a', 'right', 'rgba(60,40,0,.8)', 3.5);
    const est = BB.equip.stageReward(sv, chStage, st.enemies.length, true, 3, null, chLevel).total;
    ui.text('クリアで 約 🪙' + est + '（★3のとき）', 180, 528, 12, '#ffe08a', 'center', true);
    ui.button(60, 548, 240, 54, 'チャレンジ開始!', '#e0484a', true, 19);
    reg(60, 548, 240, 54, () => { ui.SFX.play('ui'); ui.startStage(chStage, chLevel); });
    ui.text('負けても、倒した敵のぶんのコインは入るよ', 180, 618, 10.5, '#8e98c8', 'center');
  }

  // ---------- エンドレス ----------
  function drawEndless(ui, t) {
    ui.bg();
    header(ui, 'エンドレス', 'home');
    const c = ui.ctx, en = save().endless || { ranking: [] }, rk = en.ranking || [], En = D.endless;
    ui.card(12, 66, 336, 92, 'rgba(14,154,167,.55)', 'rgba(10,40,70,.9)', 14);
    ui.text('全ステージの敵が、弱い順につぎつぎ登場！', 180, 88, 12.5, '#fff', 'center', true);
    ui.text('そのあとも、敵はどんどん強くなっていく。', 180, 108, 12, '#cfe9f0', 'center');
    ui.text('倒した敵ぶんのコインがもらえて、記録はランキングへ', 180, 128, 11, '#9fd4dc', 'center');
    ui.text(rk.length ? 'ベスト  WAVE ' + rk[0].waves + ' クリア' : 'まだ記録がありません', 180, 147, 12, '#ffe08a', 'center', true);
    ui.button(60, 168, 240, 46, 'スタート', '#e0484a', true, 19);
    reg(60, 168, 240, 46, () => { ui.SFX.play('ui'); ui.startEndless(); });
    ui.textO('ランキング（この端末）', 180, 236, 15, '#ffe08a', 'center');
    const MEDAL = ['#ffd24a', '#cfd6e6', '#d8935a'];
    for (let i = 0; i < En.rankSize; i++) {
      const y = 252 + i * 31, r = rk[i];
      c.fillStyle = r ? (i < 3 ? 'rgba(255,210,74,.12)' : 'rgba(255,255,255,.07)') : 'rgba(255,255,255,.03)'; ui.rr(14, y, 332, 28, 9); c.fill();
      if (i < 3 && r) { c.strokeStyle = MEDAL[i]; c.lineWidth = 1.2; ui.rr(14.5, y + .5, 331, 27, 9); c.stroke(); }
      ui.text(String(i + 1), 34, y + 15, 14, r && i < 3 ? MEDAL[i] : '#8e98c8', 'center', true);
      if (!r) { ui.text('---', 180, y + 15, 12, '#4d5578', 'center'); continue; }
      ui.text('WAVE ' + r.waves + ' クリア', 62, y + 15, 14, '#fff', 'left', true);
      ui.text(r.dmg + ' ダメージ', 214, y + 15, 10.5, '#aab3d4', 'right');
      const d = new Date(r.at);
      ui.text((d.getMonth() + 1) + '/' + d.getDate(), 334, y + 15, 10.5, '#8e98c8', 'right');
    }
  }

  // ---------- デバッグ ----------
  let dbgConfirm = 0;   // セーブ削除の確認（2 回押し）
  function drawDebug(ui, t) {
    ui.bg();
    header(ui, 'DEBUG', 'home');
    const sv = save(), c = ui.ctx;
    const row = (y, label, btns) => {
      ui.text(label, 16, y, 11, '#ffb0c0', 'left', true);
      const w = (336 - (btns.length - 1) * 6) / btns.length;
      btns.forEach(([text, fn, color], i) => {
        const x = 12 + i * (w + 6);
        c.fillStyle = color || 'rgba(60,70,130,.9)'; ui.rr(x, y + 8, w, 30, 9); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; ui.rr(x + .5, y + 8.5, w - 1, 29, 8.5); c.stroke();
        ui.text(text, x + w / 2, y + 23.5, w < 90 ? 10.5 : 11.5, '#fff', 'center', true);
        reg(x, y + 8, w, 30, () => { ui.SFX.play('pick'); fn(); BB.save.commit(); });
      });
    };
    const say = msg => showToast(t, msg);
    const grantAll = () => D.equipment.forEach(e => { if (!(e.id in sv.owned)) sv.owned[e.id] = 0; });
    row(64, 'コイン', [['+1,000', () => { sv.coins += 1000; say('+1,000'); }], ['+10,000', () => { sv.coins += 10000; say('+10,000'); }], ['+100,000', () => { sv.coins += 100000; say('+100,000'); }], ['0にする', () => { sv.coins = 0; say('コイン 0'); }, 'rgba(120,40,60,.9)']]);
    row(112, 'ステージ', [['全開放', () => { D.stages.forEach(st => { if (!sv.stages[st.id]) sv.stages[st.id] = { cleared: false, stars: 0 }; }); say('全ステージを開放'); }], ['全クリア(★3)', () => { D.stages.forEach(st => { sv.stages[st.id] = { cleared: true, stars: 3 }; }); say('全ステージ クリア済み'); }], ['進行をリセット', () => { sv.stages = {}; sv.challenge = {}; say('進行をリセット'); }, 'rgba(120,40,60,.9)']]);
    row(160, 'チャレンジ', [['最高 Lv20 にする', () => { D.stages.forEach(st => { sv.challenge[st.id] = D.challenge.maxLevel; }); say('全ステージ Lv20 クリア扱い'); }], ['記録を消す', () => { sv.challenge = {}; say('チャレンジ記録を消した'); }, 'rgba(120,40,60,.9)']]);
    row(208, 'そうび', [['全部入手', () => { grantAll(); say('全装備を入手'); }], ['全部 +20', () => { grantAll(); Object.keys(sv.owned).forEach(id => { sv.owned[id] = G.maxPlus; }); say('全装備 +20'); }], ['素材 +5', () => { Object.keys(sv.owned).forEach(id => { sv.spare[id] = (sv.spare[id] || 0) + 5; }); say('素材を各 +5'); }]]);
    row(256, 'バディ', [['全員なかまに(Lv5)', () => { D.buddies.forEach(b => { sv.buddies[b.id] = D.scout.maxLevel; }); if (!sv.party.length) sv.party = D.buddies.slice(0, 2).map(b => b.id); say('全バディ Lv5'); }], ['スカウト候補を出す', () => { sv.scout = { candidates: BB.scout.rollCandidates(sv) }; say('スカウト場に候補を出した'); }]]);
    row(304, 'ピックアップの時刻', [['+1時間', () => { say('時刻 +' + E.shiftPickup(1) + ' 時間'); }], ['+12時間', () => { say('時刻 +' + E.shiftPickup(12) + ' 時間'); }], ['元に戻す', () => { E.shiftPickup(0); say('時刻を戻した'); }]]);
    row(352, 'ガチャを回すコインの目安', [['ノーマル10連', () => { sv.coins += D.gacha.kinds.normal.cost10; say('+' + D.gacha.kinds.normal.cost10); }], ['レア10連', () => { sv.coins += D.gacha.kinds.rare.cost10; say('+' + D.gacha.kinds.rare.cost10); }], ['ウルトラ10連', () => { sv.coins += D.gacha.kinds.ultra.cost10; say('+' + D.gacha.kinds.ultra.cost10); }]]);
    // セーブデータの削除（2 回押す）
    const armed = t - dbgConfirm < 4000;
    row(400, 'セーブデータ', [[armed ? 'もう一度おすと ぜんぶ消える!' : 'すべて初期化', () => { if (armed) { BB.save.reset(); dbgConfirm = 0; say('セーブデータを初期化した'); } else dbgConfirm = t; }, armed ? 'rgba(200,30,50,.95)' : 'rgba(120,40,60,.9)']]);
    // いまの状態
    ui.card(12, 456, 336, 118, 'rgba(30,40,90,.9)', 'rgba(16,22,56,.95)', 12);
    const own = Object.keys(sv.owned).length, cl = D.stages.filter(st => (sv.stages[st.id] || {}).cleared).length;
    [['コイン', sv.coins], ['装備', own + ' / ' + D.equipment.length], ['バディ', Object.keys(sv.buddies).length + ' / ' + D.buddies.length], ['クリア', cl + ' / ' + D.stages.length + ' ステージ'], ['ピックアップ時刻', E.shiftPickup(0) === 0 ? 'ふつう' : 'ずらし中']].forEach(([k, v], i) => {
      ui.text(k, 24, 474 + i * 20, 11, '#9aa3c4', 'left', true); ui.text(String(v), 336, 474 + i * 20, 12, '#fff', 'right', true);
    });
    ui.text('戦闘中は、敵カードの DBG ボタンで、敵をたおす・無敵などが使えます', 180, 596, 10, '#ffb0c0', 'center');
    ui.text('?debug=0 をつけて開くと、このメニューは消えます', 180, 614, 10, '#8e98c8', 'center');
  }

  // ---------- 入口 ----------
  function draw(ui, screen, t) {
    hits = [];
    ({ home: drawHome, stages: drawStages, gacha: drawGacha, equip: drawEquip, fuse: drawFuse, scout: drawScout, buddies: drawBuddies, challenge: drawChallenge, rates: drawRates, debug: drawDebug, endless: drawEndless })[screen](ui, t);
    if (toast) {
      const u = (t - toast.t0) / 1400;
      if (u >= 1) toast = null;
      else {
        ui.ctx.save(); ui.ctx.globalAlpha = 1 - Math.max(0, (u - .7) / .3);
        ui.ctx.fillStyle = 'rgba(8,12,28,.9)'; ui.rr(70, 500, 220, 34, 17); ui.ctx.fill();
        ui.text(toast.msg, 180, 517.5, 13, '#fff', 'center', true); ui.ctx.restore();
      }
    }
  }

  function click(ui, screen, x, y) {
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.fn(); return true; }
    }
    return false;
  }

  // メニュー画面の入力。ステージ選択はドラッグ・ホイールでスクロール、それ以外はタップ
  function down(x, y) { pdrag = { x, y, sy: stageScroll, by: buddyScroll, rs: rateScroll, moved: false }; }
  function move(screen, x, y) {
    if (!pdrag) return;
    if (Math.abs(y - pdrag.y) > 8) pdrag.moved = true;
    if (screen === 'stages' && pdrag.moved) stageScroll = pdrag.sy - (y - pdrag.y);
    if (screen === 'buddies' && pdrag.moved && pdrag.y > 230) buddyScroll = pdrag.by - (y - pdrag.y);
    if (screen === 'rates' && pdrag.moved && pdrag.y > 156) rateScroll = pdrag.rs - (y - pdrag.y);
  }
  function up(ui, screen, x, y) {
    const d = pdrag; pdrag = null;
    if (!d || (d.moved && (screen === 'stages' || (screen === 'buddies' && d.y > 230) || (screen === 'rates' && d.y > 156)))) return;
    click(ui, screen, x, y);
  }
  function wheel(screen, dy) { if (screen === 'stages') stageScroll += dy * .5; if (screen === 'buddies') buddyScroll += dy * .5; if (screen === 'rates') rateScroll += dy * .5; }
  function cancel() { pdrag = null; }

  return { draw, click, enter, down, move, up, wheel, cancel };
})();
