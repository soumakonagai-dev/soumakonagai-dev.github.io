// スカウト（バディ集め）のルール。描画なし。
// 流れ: スカウト開始 → 2 回の戦闘に勝つ → スカウト場に候補が現れる → 1 匹だけスカウト
BB.scout = (function () {
  const D = BB.data, S = D.scout, L = BB.logic;
  const ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];

  const SKILL_NAME = {
    recolor: 'いろがえ', paintRow: 'ぬりぬり', bomb: 'ばくはつ', laser: 'ラインカット', recolorAll: 'にじいろ',
    strike: 'いちげき', heal: 'いやし', rebirth: 'ふっかつ', shield: 'まもり', stun: 'あしどめ',
    poison: 'どくばり', charge: 'ちからため', purify: 'おきよめ', reroll: 'てふだチェンジ',
    paintCol: 'たてぬり', laserV: 'たてカット', combo: 'コンボアップ', burst: 'もえるまい', fortify: 'ガードりょく', bloom: 'めぐみ',
    blessing: 'てんしのいのり', overdrive: 'ばいがえし', summon: 'ブロックそうぞう'
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
      case 'blessing': return 'HP・シールド全回復＋状態異常をすべて消す＋敵の行動まで +' + i.stun + '手＋' + i.dmg + ' ダメージ';
      case 'overdrive': return 'このターンの攻撃・魔法のダメージが ×' + i.mult;
      case 'summon': return '好きな色の ' + sz + ' ブロックを作る（そろえば消える）';
      case 'strike': return '敵に ' + i.dmg + ' ダメージ（ガード貫通）';
      case 'heal': return '最大HPの ' + i.healPct + '% を回復';
      case 'rebirth': return 'HP ' + i.healPct + '% 回復 + 敵に ' + i.dmg + ' ダメージ';
      case 'shield': return 'シールド +' + i.shield;
      case 'stun': return '敵の行動まで +' + i.stun + '手';
      case 'poison': return '敵に毒 ' + i.poison + ' を与える';
      case 'charge': return '必殺ゲージ +' + i.charge + '%';
      case 'purify': return '石・氷・封印をすべて消す';
      case 'reroll': return '手札を引き直す';
      case 'paintCol': return '縦' + (i.rows === 2 ? '2列' : '1列') + 'を好きな色に変える';
      case 'laserV': return (i.cross ? '縦と横の十字' : '縦1列') + 'を消して能力を発動';
      case 'combo': return 'コンボを +' + i.combo + ' する';
      case 'burst': return '攻撃マス 1 つにつき ' + i.per + ' ダメージ';
      case 'fortify': return 'ガードマス 1 つにつきシールド +' + i.per;
      case 'bloom': return '回復マス 1 つにつき HP +' + i.per;
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

  // 進行度（クリア済みステージ数）に応じたレア度の確率。表示にも使う
  const tierRates = tier => S.ratesByTier[Math.min(tier, S.ratesByTier.length - 1)];
  const ratesFor = save => tierRates(clearedCount(save));
  function clearedCount(save) { return D.stages.filter(s => (save.stages[s.id] || {}).cleared).length; }

  function pickRarity(rng, tier) {
    const r = tierRates(tier), total = ORDER.reduce((a, k) => a + (r[k] || 0), 0);
    let x = rng() * total;
    for (const k of ORDER) { x -= r[k] || 0; if (x < 0) return k; }
    return 'N';
  }

  // スカウト場に並ぶ候補（重複なし）。進行度ごとに「最低 1 匹はこのレア度以上」を保証する
  function rollCandidates(save, rng) {
    rng = rng || Math.random;
    const tier = clearedCount(save), picked = [];
    for (let guard = 0; picked.length < S.candidates && guard < 200; guard++) {
      const rarity = pickRarity(rng, tier);   // レア度は 1 回だけ決める
      const pool = D.buddies.filter(b => b.rarity === rarity && !picked.includes(b.id));
      if (pool.length) picked.push(pool[Math.floor(rng() * pool.length)].id);
    }
    const need = ORDER.indexOf(S.minRarity[Math.min(tier, S.minRarity.length - 1)]);
    if (!picked.some(id => ORDER.indexOf(D.buddyMap[id].rarity) >= need)) {
      // 最低保証ぶんは、条件を満たすレア度の中でふだんの比率どおりに選ぶ
      const r = tierRates(tier), allowed = ORDER.filter((k, i) => i >= need && r[k] > 0), total = allowed.reduce((t, k) => t + r[k], 0);
      let x = rng() * total, rar = allowed[allowed.length - 1];
      for (const k of allowed) { x -= r[k]; if (x < 0) { rar = k; break; } }
      const good = D.buddies.filter(b => b.rarity === rar && !picked.includes(b.id));
      if (good.length) picked[Math.floor(rng() * picked.length)] = good[Math.floor(rng() * good.length)].id;
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

  return { ratesFor, skillName, desc, tierOf, spec, rollCandidates, finish, recruit, partyList, toggleParty };
})();
