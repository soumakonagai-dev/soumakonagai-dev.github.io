// メニュー系の画面（ホーム・ステージ選択・ガチャ・そうび）。バトル以外の描画と入力。
// main.js から BB.menu.draw / click が呼ばれる。ui は main.js の描画ヘルパー一式。
BB.menu = (function () {
  const D = BB.data, E = BB.equip, G = D.gacha, A = BB.art;
  const RC = { N: '#9aa3b8', R: '#4aa3ff', SR: '#b36bff', SSR: '#ffc53d' };
  const SLOT_ORDER = ['weapon', 'armor', 'acc'];
  const THEME_ART = { forest: 'slime', meadow: 'dragon', grave: 'golem', castle: 'demon' };

  let hits = [], sel = null, toast = null;
  let scoutSel = null, recruitRes = null, buddySel = null;   // スカウト場で選んだ候補 / スカウト結果 / 図鑑で選んだバディ
  const RCOL = RC;
  let gKind = 'normal';                 // 'normal' | 'rare'
  let gacha = { phase: 'idle', results: [], t0: 0, n: 1, best: 'N', played: false };

  const reg = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
  const save = () => BB.save.data;

  function enter(name) {
    if (name === 'gacha') gacha = { phase: 'idle', results: [], t0: 0, n: 1, best: 'N', played: false };
    if (name === 'equip' && !(sel in save().owned)) sel = null;
    if (name === 'scout') { scoutSel = null; recruitRes = null; }
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
    ui.speaker(330, 24, ui.SFX.muted);
    ui.drawArt('slime', 180, 172, .62, 'idle', t / 1000);
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
    ui.button(60, 232, 240, 52, '冒険に出る', '#2fbf71', true, 20);
    reg(60, 232, 240, 52, () => { ui.SFX.play('ui'); ui.go('stages'); });
    ui.button(60, 296, 240, 52, 'スカウト', '#e08a2a', false, 20);
    reg(60, 296, 240, 52, () => { ui.SFX.play('ui'); ui.go('scout'); });
    badge(292, 302, !!save().scout);
    ui.button(60, 360, 240, 52, 'ガチャ', '#8b5cf6', false, 20);
    reg(60, 360, 240, 52, () => { ui.SFX.play('ui'); ui.go('gacha'); });
    badge(292, 366, save().coins >= G.cost);
    ui.button(60, 424, 240, 52, 'そうび', '#2f7bff', false, 20);
    reg(60, 424, 240, 52, () => { ui.SFX.play('ui'); ui.go('equip'); });

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
    D.stages.forEach((st, i) => {
      const y = 62 + i * 112, h = 104, unlocked = E.isUnlocked(save(), i), rec = save().stages[st.id];
      const art = THEME_ART[st.theme], th = A.theme(art);
      const c = ui.ctx;
      ui.card(14, y, 332, h, th.sky[0], th.sky[1], 16);
      c.save(); ui.rr(14, y, 332, h, 16); c.clip();
      const g = c.createRadialGradient(290, y + 60, 4, 290, y + 60, 130);
      g.addColorStop(0, A.rgba(th.glow, .3)); g.addColorStop(1, A.rgba(th.glow, 0));
      c.fillStyle = g; c.fillRect(14, y, 332, h); c.restore();
      st.enemies.forEach((k, j) => ui.drawArt(D.enemies[k].art, 218 + j * 46, y + 58 + (j === 2 ? -4 : 6), (j === 2 ? .28 : .22) * (D.enemies[k].size || 1) * (D.enemies[k].art === 'dragon' ? .85 : 1), 'idle', t / 1000 + j, !unlocked));
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
      } else reg(14, y, 332, h, () => { ui.SFX.play('ui'); ui.startStage(i); });
    });
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
    const rare = anim.kind === 'rare';
    c.fillStyle = ui.lin(0, cy + 62, 0, cy + 150, rare ? [[0, '#f2c14a'], [1, '#9a6a10']] : [[0, '#e0455f'], [1, '#8c1a3a']]);
    ui.rr(cx - 86, cy + 62, 172, 88, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)'; ui.rr(cx - 80, cy + 66, 160, 18, 9); c.fill();
    c.fillStyle = '#2a0c20'; ui.rr(cx - 34, cy + 112, 68, 30, 8); c.fill();     // 取り出し口
    c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(cx, cy + 96, 15, 0, 7); c.fill();   // つまみ
    c.save(); c.translate(cx, cy + 96); c.rotate(anim.knob || 0); c.fillStyle = '#a56a00'; c.fillRect(-12, -3, 24, 6); c.restore();
    // ドーム
    c.fillStyle = 'rgba(190,225,255,.16)'; c.beginPath(); c.arc(cx, cy - 6, 84, Math.PI, 0); c.lineTo(cx + 84, cy + 64); c.lineTo(cx - 84, cy + 64); c.closePath(); c.fill();
    const cols = rare ? ['#4aa3ff', '#b36bff', '#ffc53d', '#4aa3ff', '#b36bff', '#ffc53d'] : ['#9aa3b8', '#4aa3ff', '#b36bff', '#ffc53d', '#ff6b8b', '#4ade80'];
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
    const res = E.pull(save(), n, null, gKind);
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
      const rareK = gKind === 'rare', rt = E.ratesOf(gKind);
      ui.textO(rareK ? 'レアガチャ' : 'そうびガチャ', 180, 372, 20, rareK ? '#ffd86a' : '#fff', 'center');
      ui.text((rareK ? '' : 'N ' + rt.N + '%   ') + 'R ' + rt.R + '%   SR ' + rt.SR + '%   SSR ' + rt.SSR + '%', 180, 398, 11, '#b9c2f0', 'center', true);
      ui.text(rareK ? 'R以上が必ず出る！' : '同じ装備は「ざいりょう」になる', 180, 418, 11, rareK ? '#ffd86a' : '#8e98c8', 'center', rareK);
      ui.text('そうびで合体すると +1（最大 +' + G.maxPlus + '）', 180, 436, 11, '#8e98c8', 'center');
      const busy = gacha.phase === 'anim';
      (rareK ? [[80, 200, 1, G.rare.cost, '1回']] : [[24, 150, 1, G.cost, '1回'], [186, 150, 10, G.cost10, '10回']]).forEach(([x, w, n, cost, label]) => {
        const ok = save().coins >= cost && !busy;
        if (ok) ui.button(x, 470, w, 58, label + '  🪙' + cost, rareK ? '#e0a020' : n === 10 ? '#8b5cf6' : '#2f7bff', rareK || n === 10, 16);
        else ui.disabledButton(x, 470, w, 58, label + '  🪙' + cost, 16);
        if (!busy) reg(x, 470, w, 58, () => startPull(ui, t, n));
      });
      if (!rareK) ui.text('10回はSR以上が1つ確定', 261, 544, 11, '#c9b8ff', 'center', true);
      else ui.text('SSRの確率がアップ！', 180, 544, 11, '#ffd86a', 'center', true);
      // ガチャの切り替え
      [['normal', 'ノーマル', 70], ['rare', 'レア', 186]].forEach(([k, label, x]) => {
        const on = gKind === k, col = k === 'rare' ? '#e0a020' : '#2f7bff';
        c.fillStyle = on ? A.rgba(col, .85) : 'rgba(8,12,28,.7)'; ui.rr(x, 62, 104, 26, 13); c.fill();
        c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.25)'; c.lineWidth = 1; ui.rr(x + .5, 62.5, 103, 25, 12.5); c.stroke();
        ui.text(label, x + 52, 75.5, 13, on ? '#fff' : '#9aa3c4', 'center', true);
        if (!busy) reg(x, 62, 104, 26, () => { if (gKind !== k) { gKind = k; ui.SFX.play('pick'); } });
      });
      ui.text('コインはステージをクリアして集めよう', 180, 592, 11, '#8e98c8', 'center');
      return;
    }
    // 結果
    const age2 = t - gacha.t0, res = gacha.results, one = res.length === 1;
    if (!gacha.played) {
      gacha.played = true;
      ui.SFX.play(gacha.best === 'SSR' ? 'special' : gacha.best === 'SR' ? 'perfect' : 'heal');
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
      lines.slice(0, 4).forEach((l, i) => ui.text('・' + l, i < 2 ? 22 : 190, i % 2 ? 224 : 207, 11, '#e6ebff', 'left'));
      const eq = sv.equipped[it.slot] === sel;
      if (eq) ui.button(262, 156, 78, 30, 'はずす', '#c0485a', false, 13); else ui.button(262, 156, 78, 30, 'そうび', '#2fbf71', true, 13);
      reg(262, 156, 78, 30, () => { E.equip(sv, sel); ui.SFX.play('ui'); });
      ui.button(262, 196, 78, 30, '合体', '#e0a020', (sv.spare[sel] || 0) > 0 || E.spareList(sv, it.rarity).length > 0, 13);
      reg(262, 196, 78, 30, () => { ui.SFX.play('ui'); ui.go('fuse'); });
    } else ui.text('そうびを選んでください', 180, 194, 13, '#8e98c8', 'center', true);
    // 一覧
    const items = D.equipment.slice().sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || E.RARITY_ORDER.indexOf(b.rarity) - E.RARITY_ORDER.indexOf(a.rarity));
    const cw = 80, ch = 66, gx = 8, gy = 6, x0 = 8, y0 = 248;
    items.forEach((item, i) => {
      const x = x0 + (i % 4) * (cw + gx), y = y0 + Math.floor(i / 4) * (ch + gy), l = item.id in sv.owned ? sv.owned[item.id] + 1 : 0;
      itemCard(ui, x, y, cw, ch, item, l, { selected: sel === item.id, equipped: sv.equipped[item.slot] === item.id, t, count: sv.spare[item.id] });
      reg(x, y, cw, ch, () => { sel = item.id; ui.SFX.play('pick'); });
    });
    const have = Object.keys(sv.owned).length;
    ui.text('所持 ' + have + ' / ' + D.equipment.length, 180, 626, 11, '#8e98c8', 'center', true);
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
        if (res) { recruitRes = Object.assign({ t0: t }, res); ui.SFX.play(D.buddyMap[res.id].rarity === 'SSR' ? 'special' : D.buddyMap[res.id].rarity === 'SR' ? 'perfect' : 'heal'); scoutSel = null; }
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
    ui.text('バディは1回のせんとうで、それぞれ1回だけスキルが使える', 180, 548, 10.5, '#8e98c8', 'center');
    ui.text('同じバディをスカウトすると Lv アップ（最大 Lv' + BB.data.scout.maxLevel + '）', 180, 566, 10.5, '#8e98c8', 'center');
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
    const order = ['SSR', 'SR', 'R', 'N'];
    const list = D.buddies.slice().sort((x, y) => order.indexOf(x.rarity) - order.indexOf(y.rarity));
    list.forEach((bd, i) => {
      const x = 8 + (i % 4) * 88, y = 238 + Math.floor(i / 4) * 86, l = sv.buddies[bd.id] || 0;
      buddyCard(ui, x, y, 80, 78, bd, l, { selected: buddySel === bd.id, party: sv.party.includes(bd.id), t });
      reg(x, y, 80, 78, () => { buddySel = bd.id; ui.SFX.play('pick'); });
    });
    ui.text('なかま ' + Object.keys(sv.buddies).length + ' / ' + D.buddies.length, 180, 626, 11, '#8e98c8', 'center', true);
  }

  // ---------- 入口 ----------
  function draw(ui, screen, t) {
    hits = [];
    ({ home: drawHome, stages: drawStages, gacha: drawGacha, equip: drawEquip, fuse: drawFuse, scout: drawScout, buddies: drawBuddies })[screen](ui, t);
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

  return { draw, click, enter };
})();
