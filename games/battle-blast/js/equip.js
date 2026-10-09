// 装備・ガチャ・報酬のルール（描画なし）
BB.equip = (function () {
  const D = BB.data, G = D.gacha;
  const byId = {};
  D.equipment.forEach(e => { byId[e.id] = e; });

  const RARITY_ORDER = ['N', 'R', 'SR', 'SSR'];
  const pct = v => Math.round(v * 100);

  // +値に応じた効果倍率。lv は「+値 + 1」で渡す（+0 = 1.0）
  const scale = lv => 1 + G.plusBonus * (lv - 1);

  // 装備 1 つぶんの効果を、Lv を反映して返す
  function scaledEffects(item, lv) {
    const k = scale(lv), out = { mul: {} };
    Object.entries(item.effects).forEach(([key, v]) => {
      if (key === 'mul') Object.entries(v).forEach(([a, x]) => { out.mul[a] = x * k; });
      else if (key === 'count') out.count = v;                       // 手数は整数のまま
      else if (['comboCap', 'maxHp', 'shield', 'startShield', 'gauge', 'healBetween'].includes(key)) out[key] = Math.round(v * k);
      else out[key] = v * k;
    });
    return out;
  }

  // 装備中のものを合計して logic.newGame に渡す mods にする
  function computeMods(save) {
    const m = BB.logic.defaultMods();
    Object.values(save.equipped).forEach(id => {
      if (!id || !(id in save.owned)) return;
      const e = scaledEffects(byId[id], save.owned[id] + 1);
      Object.entries(e).forEach(([k, v]) => {
        if (k === 'mul') Object.entries(v).forEach(([a, x]) => { m.mul[a] = (m.mul[a] || 0) + x; });
        else m[k] += v;
      });
    });
    m.reduce = Math.min(.6, m.reduce);
    return m;
  }

  const ABILITY_NAME = { attack: '攻撃', magic: '魔法攻撃', heal: '回復', guard: 'ガード', poison: '毒', charge: 'チャージ', stun: 'スタン' };

  // 効果の説明文（複数行）
  function describe(item, lv) {
    const e = scaledEffects(item, lv || 1), lines = [];
    Object.entries(e.mul).forEach(([a, x]) => lines.push(ABILITY_NAME[a] + 'の効果 +' + pct(x) + '%'));
    if (e.combo) lines.push('コンボ倍率 +' + pct(e.combo) + '% /コンボ');
    if (e.comboCap) lines.push('コンボ上限 +' + e.comboCap);
    if (e.line) lines.push('同時消し倍率 +' + pct(e.line) + '%');
    if (e.whole) lines.push('丸ごと消し +' + pct(e.whole) + '%');
    if (e.maxHp) lines.push('最大HP +' + e.maxHp);
    if (e.shield) lines.push('シールド上限 +' + e.shield);
    if (e.startShield) lines.push('開始時シールド +' + e.startShield);
    if (e.gauge) lines.push('開始時 必殺ゲージ +' + e.gauge + '%');
    if (e.count) lines.push('敵の行動まで +' + e.count + '手');
    if (e.reduce) lines.push('受けるダメージ -' + pct(e.reduce) + '%');
    if (e.coin) lines.push('獲得コイン +' + pct(e.coin) + '%');
    if (e.healBetween) lines.push('戦闘後の回復 +' + e.healBetween);
    return lines;
  }

  const ratesOf = kind => kind === 'rare' ? G.rare.rates : G.rates;
  function pickRarity(rng, minRarity, kind) {
    const rates = ratesOf(kind), total = Object.values(rates).reduce((a, b) => a + b, 0);
    let r = rng() * total, pick = 'N';
    for (const k of RARITY_ORDER) { r -= rates[k]; if (r < 0) { pick = k; break; } }
    if (minRarity && RARITY_ORDER.indexOf(pick) < RARITY_ORDER.indexOf(minRarity)) pick = minRarity;
    return pick;
  }

  // ガチャを n 回。コインが足りなければ null。結果の配列を返し、セーブも更新する
  // kind: 'normal' または 'rare'（レアは 1 回 G.rare.cost コインで R 以上確定）
  const costOf = (kind, n) => kind === 'rare' ? G.rare.cost * n : n === 10 ? G.cost10 : G.cost * n;
  function pull(save, n, rng, kind) {
    rng = rng || Math.random;
    const cost = costOf(kind, n);
    if (save.coins < cost) return null;
    save.coins -= cost;
    const results = [];
    for (let i = 0; i < n; i++) {
      // 10 連は最後の 1 回を SR 以上に保証
      const rarity = pickRarity(rng, kind !== 'rare' && n === 10 && i === 9 && !results.some(r => RARITY_ORDER.indexOf(r.item.rarity) >= 2) ? 'SR' : null, kind);
      const pool = D.equipment.filter(e => e.rarity === rarity);
      const item = pool[Math.floor(rng() * pool.length)];
      // 初めての装備は入手。ダブりは「素材」になり、合体で +値に変えられる
      const has = item.id in save.owned;
      if (!has) save.owned[item.id] = 0; else save.spare[item.id] = (save.spare[item.id] || 0) + 1;
      results.push({ item, isNew: !has, level: save.owned[item.id] + 1 });
    }
    save.pulls += n;
    BB.save.commit();
    return results;
  }

  // 装備の付け外し
  function equip(save, id) {
    const item = byId[id];
    if (!item || !(id in save.owned)) return;
    save.equipped[item.slot] = save.equipped[item.slot] === id ? null : id;
    BB.save.commit();
  }

  // ---------- 合体（凸） ----------
  // 素材になる装備: 同じレア度で、ダブりを持っているもの
  function spareList(save, rarity) {
    return D.equipment.filter(e => e.rarity === rarity && (save.spare[e.id] || 0) > 0).map(e => ({ item: e, count: save.spare[e.id] }));
  }
  // target に素材 fodder を 1 つ合体して +1。できなければ false
  function fuse(save, targetId, fodderId) {
    const t = byId[targetId], f = byId[fodderId];
    if (!t || !f || t.rarity !== f.rarity || !(targetId in save.owned)) return false;
    if (save.owned[targetId] >= G.maxPlus || (save.spare[fodderId] || 0) < 1) return false;
    save.spare[fodderId]--;
    save.owned[targetId]++;
    BB.save.commit();
    return true;
  }
  // 素材を全部（上限まで）合体。使った数を返す
  function fuseAll(save, targetId) {
    const t = byId[targetId];
    let used = 0;
    if (!t) return 0;
    spareList(save, t.rarity).forEach(s => { while (fuse(save, targetId, s.item.id)) used++; });
    return used;
  }

  // バトル後のコイン。defeated: 倒した敵の数 / cleared: ステージクリアしたか
  function stageReward(save, stageIdx, defeated, cleared, stars, mods) {
    const st = D.stages[stageIdx], r = st.reward;
    if (r.fixed) return { base: cleared ? r.clear : 0, bonus: 0, total: cleared ? r.clear : 0, first: false };
    let coins = 0, first = false;
    for (let i = 0; i < defeated; i++) coins += r.enemy[i];
    if (cleared) {
      coins += r.clear + r.star * stars;
      const rec = save.stages[st.id];
      if (!rec || !rec.cleared) { coins += r.first; first = true; }
    }
    const bonus = Math.round(coins * (mods ? mods.coin : 0));
    return { base: coins, bonus, total: coins + bonus, first };
  }

  function applyResult(save, stageIdx, defeated, cleared, stars, mods) {
    const rw = stageReward(save, stageIdx, defeated, cleared, stars, mods);
    save.coins += rw.total;
    if (cleared) {
      const id = D.stages[stageIdx].id, rec = save.stages[id] || { cleared: false, stars: 0 };
      save.stages[id] = { cleared: true, stars: Math.max(rec.stars, stars) };
    }
    BB.save.commit();
    return rw;
  }

  // 前のステージをクリア済みか、このステージの記録があれば解放（ステージを後から追加しても、進行が消えない）
  const isUnlocked = (save, stageIdx) => stageIdx === 0 || !!(save.stages[D.stages[stageIdx - 1].id] || {}).cleared || !!save.stages[D.stages[stageIdx].id];

  return { byId, RARITY_ORDER, ratesOf, costOf, spareList, fuse, fuseAll, computeMods, describe, scaledEffects, pull, equip, stageReward, applyResult, isUnlocked };
})();
