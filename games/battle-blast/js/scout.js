// スカウト（バディ集め）のルール。描画なし。
// 流れ: スカウト開始 → 2 回の戦闘に勝つ → スカウト場に候補が現れる → 1 匹だけスカウト
BB.scout = (function () {
  const D = BB.data, S = D.scout, L = BB.logic;
  const ORDER = ['N', 'R', 'SR', 'SSR'];

  const SKILL_NAME = {
    recolor: 'いろがえ', paintRow: 'ぬりぬり', bomb: 'ばくはつ', laser: 'ラインカット', recolorAll: 'にじいろ',
    strike: 'いちげき', heal: 'いやし', rebirth: 'ふっかつ', shield: 'まもり', stun: 'あしどめ',
    poison: 'どくばり', charge: 'ちからため', purify: 'おきよめ', reroll: 'てふだチェンジ'
  };
  const skillName = id => SKILL_NAME[D.buddyMap[id].skill.type];

  // Lv に応じた説明文
  function desc(id, lv) {
    const i = L.buddyInfo(id, lv || 1), sz = i.radius === 2 ? '5×5' : '3×3';
    switch (i.type) {
      case 'recolor': return sz + 'のマスを好きな色に変える';
      case 'paintRow': return (i.rows === 2 ? '2列' : '1列') + 'を好きな色に変える';
      case 'bomb': return sz + 'のマスを消して能力を発動';
      case 'laser': return (i.cross ? '縦と横の十字' : '横1列') + 'を消して能力を発動';
      case 'recolorAll': return 'すべてのマスを好きな色に変える';
      case 'strike': return '敵に ' + i.dmg + ' ダメージ（ガード貫通）';
      case 'heal': return '最大HPの ' + i.healPct + '% を回復';
      case 'rebirth': return 'HP ' + i.healPct + '% 回復 + 敵に ' + i.dmg + ' ダメージ';
      case 'shield': return 'シールド +' + i.shield;
      case 'stun': return '敵の行動まで +' + i.stun + '手';
      case 'poison': return '敵に毒 ' + i.poison + ' を与える';
      case 'charge': return '必殺ゲージ +' + i.charge + '%';
      case 'purify': return '石・氷・封印をすべて消す';
      case 'reroll': return '手札を引き直す';
    }
  }

  // 進行度（クリア済みステージ数）に合わせて遠征の相手を決める
  const tierOf = save => Math.min(D.stages.filter(s => (save.stages[s.id] || {}).cleared).length, D.stages.length - 1);

  // スカウト遠征用のステージ。そのときの最前線ステージの通常敵 2 体と戦う
  function spec(save) {
    const tier = tierOf(save), st = D.stages[tier];
    return {
      id: 'scout', name: 'スカウト遠征', scout: true, tier,
      enemies: st.enemies.slice(0, 2),
      reward: { enemy: st.reward.enemy.slice(0, 2).map(v => Math.round(v / 2)), clear: 0, first: 0, star: 0 }
    };
  }

  function pickRarity(rng, tier) {
    const r = Object.assign({}, S.rates);
    r.N = Math.max(10, r.N - tier * 8); r.SR += tier * 3; r.SSR += tier * 2;
    const total = ORDER.reduce((a, k) => a + r[k], 0);
    let x = rng() * total;
    for (const k of ORDER) { x -= r[k]; if (x < 0) return k; }
    return 'N';
  }

  // スカウト場に並ぶ候補（重複なし）
  function rollCandidates(save, rng) {
    rng = rng || Math.random;
    const tier = tierOf(save), picked = [];
    for (let guard = 0; picked.length < S.candidates && guard < 100; guard++) {
      const pool = D.buddies.filter(b => b.rarity === pickRarity(rng, tier) && !picked.includes(b.id));
      if (pool.length) picked.push(pool[Math.floor(rng() * pool.length)].id);
    }
    return picked;
  }

  // 遠征が終わったとき。2 戦とも勝てば候補がスカウト場に並ぶ。コインは倒した敵ぶん
  function finish(save, game, cleared, defeated) {
    let total = 0;
    for (let i = 0; i < defeated; i++) total += game.stage.reward.enemy[i];
    save.coins += total;
    if (cleared) save.scout = { candidates: rollCandidates(save) };
    BB.save.commit();
    return { total, bonus: 0, first: false, scout: true, cleared };
  }

  // 1 匹スカウト。初めてなら仲間に、すでにいれば Lv アップ（最大のあとはコイン）
  function recruit(save, id) {
    if (!save.scout || !save.scout.candidates.includes(id)) return null;
    const lv = save.buddies[id] || 0, res = { id, isNew: lv === 0, lv: lv + 1, coins: 0 };
    if (lv === 0) save.buddies[id] = 1;
    else if (lv < S.maxLevel) save.buddies[id] = lv + 1;
    else { res.lv = lv; res.coins = S.dupCoins; save.coins += res.coins; }
    if (!save.party.includes(id) && save.party.length < 2 && lv === 0) save.party.push(id);   // 空きがあれば自動で編成
    save.scout = null;
    BB.save.commit();
    return res;
  }

  // 戦闘に連れていくバディ（最大 2 匹）
  function partyList(save) {
    return save.party.filter(id => save.buddies[id]).slice(0, 2).map(id => ({ id, lv: save.buddies[id] }));
  }
  // 編成の入れ替え。2 匹いっぱいなら false
  function toggleParty(save, id) {
    if (!save.buddies[id]) return false;
    const i = save.party.indexOf(id);
    if (i >= 0) save.party.splice(i, 1);
    else if (save.party.length < 2) save.party.push(id);
    else return false;
    BB.save.commit();
    return true;
  }

  return { skillName, desc, tierOf, spec, rollCandidates, finish, recruit, partyList, toggleParty };
})();
