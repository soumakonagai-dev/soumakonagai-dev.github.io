// 装備・ガチャ・報酬のルール（描画なし）
BB.equip = (function () {
  const D = BB.data, G = D.gacha;
  const byId = {};
  D.equipment.forEach(e => { byId[e.id] = e; });

  const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
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
    m.count = Math.min(3, m.count);
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

  const kindOf = kind => G.kinds[kind || 'normal'];
  const ratesOf = kind => kindOf(kind).rates;
  // minRarity を渡すと、そのレア度以上だけから（ふだんの比率どおりに）選ぶ
  function pickRarity(rng, kind, minRarity) {
    const rates = ratesOf(kind), from = minRarity ? RARITY_ORDER.indexOf(minRarity) : 0;
    const ks = RARITY_ORDER.filter((k, i) => i >= from && (rates[k] || 0) > 0), total = ks.reduce((a, k) => a + rates[k], 0);
    let r = rng() * total;
    for (const k of ks) { r -= rates[k]; if (r < 0) return k; }
    return ks[ks.length - 1];
  }

  // ---------- ピックアップ（1 時間ごとに入れ替わる） ----------
  const HOUR = 3600 * 1000, PICK_FROM = RARITY_ORDER.indexOf('SR');
  const hourIndex = now => Math.floor((now === undefined ? Date.now() : now) / (HOUR * G.pickHours));
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const poolOf = rarity => D.equipment.filter(e => e.rarity === rarity);
  // その時間の、(ガチャの種類, レア度) のピックアップ。
  // 装備の並びをシャッフルして順番に回す（1 周するまで同じ装備は出ない）。周の切れ目でも、前の時間と同じにならない。
  const rawOrder = (kind, rarity, epoch, n) => {
    const idx = Array.from({ length: n }, (_, i) => i);
    let seed = hash(kind + ':' + rarity + ':' + epoch);
    const rnd = () => { seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0; seed = (seed + 0x6D2B79F5) >>> 0; return seed / 4294967296; };
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  };
  function pickupItem(kind, rarity, now) {
    const pool = poolOf(rarity), n = pool.length, hi = hourIndex(now);
    if (n < 3) return pool[hi % Math.max(1, n)] || null;
    const epoch = Math.floor(hi / n), pos = hi - epoch * n, order = rawOrder(kind, rarity, epoch, n);
    if (order[0] === rawOrder(kind, rarity, epoch - 1, n)[n - 1]) [order[0], order[1]] = [order[1], order[0]];   // 前の周の最後と同じなら入れ替える
    return pool[order[pos]];
  }
  // そのガチャで出る SR 以上のレア度ごとのピックアップ [{ rarity, item }]
  function pickups(kind, now) {
    const rates = ratesOf(kind);
    return RARITY_ORDER.filter((k, i) => i >= PICK_FROM && (rates[k] || 0) > 0).map(r => ({ rarity: r, item: pickupItem(kind, r, now) }));
  }
  const nextPickupAt = now => (hourIndex(now) + 1) * HOUR * G.pickHours;
  // 装備 1 つぶんの重み（ピックアップは pickBoost 倍）
  function weightsOf(kind, rarity, now) {
    const pick = PICK_FROM <= RARITY_ORDER.indexOf(rarity) ? pickupItem(kind, rarity, now) : null;
    return poolOf(rarity).map(e => ({ item: e, w: pick && e.id === pick.id ? G.pickBoost : 1, pick: !!pick && e.id === pick.id }));
  }
  // 確率表: そのガチャで出る装備すべての出現率（%）。レア度が高い順
  function itemRates(kind, now) {
    const rates = ratesOf(kind), out = [];
    RARITY_ORDER.slice().reverse().forEach(r => {
      if (!(rates[r] > 0)) return;
      const ws = weightsOf(kind, r, now), total = ws.reduce((a, x) => a + x.w, 0);
      ws.sort((a, b) => b.w - a.w).forEach(x => out.push({ item: x.item, rarity: r, pick: x.pick, rate: rates[r] * x.w / total }));
    });
    return out;
  }

  // ガチャを n 回。コインが足りなければ null。結果の配列を返し、セーブも更新する
  // kind: 'normal' | 'rare' | 'ultra'。n は 1 か 10（10 回は割引と、最低レア度の保証つき）
  const costOf = (kind, n) => { const K = kindOf(kind); return n === 10 ? K.cost10 : K.cost * n; };
  function pull(save, n, rng, kind, now) {
    rng = rng || Math.random;
    const cost = costOf(kind, n);
    if (save.coins < cost) return null;
    save.coins -= cost;
    const results = [];
    for (let i = 0; i < n; i++) {
      // 10 連は、最後の 1 回で保証のレア度以上が 1 つもなければ、そのレア度以上にする
      const need = kindOf(kind).min10, forced = !!need && n === 10 && i === 9 && !results.some(r => RARITY_ORDER.indexOf(r.item.rarity) >= RARITY_ORDER.indexOf(need));
      const rarity = pickRarity(rng, kind, forced ? need : null);
      // 同じレア度の中から、ピックアップは pickBoost 倍の重みで選ぶ
      const ws = weightsOf(kind, rarity, now), tw = ws.reduce((a, x) => a + x.w, 0);
      let r = rng() * tw, chosen = ws[ws.length - 1];
      for (const x of ws) { r -= x.w; if (r < 0) { chosen = x; break; } }
      const item = chosen.item;
      // 初めての装備は入手。ダブりは「素材」になり、合体で +値に変えられる
      const has = item.id in save.owned;
      if (!has) save.owned[item.id] = 0; else save.spare[item.id] = (save.spare[item.id] || 0) + 1;
      results.push({ item, isNew: !has, level: save.owned[item.id] + 1, pickup: chosen.pick });
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
  // level を渡すとチャレンジ。初クリアボーナスはなく、難易度に応じたコイン倍率がかかる
  function stageReward(save, stageIdx, defeated, cleared, stars, mods, level) {
    const st = D.stages[stageIdx], r = st.reward;
    if (level) {
      const ci = BB.logic.challengeInfo(level);
      let raw = 0;
      for (let i = 0; i < defeated; i++) raw += r.enemy[i];
      if (cleared) raw += r.clear + r.star * stars;
      const coins = Math.round(raw * ci.coin), bonus = Math.round(coins * (mods ? mods.coin : 0));
      return { base: coins, raw, mult: ci.coin, level, bonus, total: coins + bonus, first: false };
    }
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

  function applyResult(save, stageIdx, defeated, cleared, stars, mods, level) {
    const rw = stageReward(save, stageIdx, defeated, cleared, stars, mods, level);
    save.coins += rw.total;
    if (level) {   // チャレンジ: クリアした最高の難易度を記録（ステージのクリア記録は変えない）
      if (cleared) { const id = D.stages[stageIdx].id; save.challenge[id] = Math.max(save.challenge[id] || 0, level); }
    } else if (cleared) {
      const id = D.stages[stageIdx].id, rec = save.stages[id] || { cleared: false, stars: 0 };
      save.stages[id] = { cleared: true, stars: Math.max(rec.stars, stars) };
    }
    BB.save.commit();
    return rw;
  }

  // 前のステージをクリア済みか、このステージの記録があれば解放（ステージを後から追加しても、進行が消えない）
  const isUnlocked = (save, stageIdx) => stageIdx === 0 || !!(save.stages[D.stages[stageIdx - 1].id] || {}).cleared || !!save.stages[D.stages[stageIdx].id];

  return { byId, RARITY_ORDER, ratesOf, costOf, pickups, nextPickupAt, itemRates, spareList, fuse, fuseAll, computeMods, describe, scaledEffects, pull, equip, stageReward, applyResult, isUnlocked };
})();
