'use strict';
// ===== さらに30体：「条件つき」の特殊キャラと、範囲がでかめのキャラ =====
Object.assign(FXTXT, {
  vsBurn: v => '燃えている敵に+' + Math.round(v * 100) + '%ダメージ',
  vsPoison: v => '毒の敵に+' + Math.round(v * 100) + '%ダメージ',
  vsSlow: v => '鈍足の敵に+' + Math.round(v * 100) + '%ダメージ',
  vsStun: v => '動けない敵に+' + Math.round(v * 100) + '%ダメージ',
  vsMark: v => '印のついた敵に+' + Math.round(v * 100) + '%ダメージ',
  vsShield: v => 'バリアを持つ敵に+' + Math.round(v * 100) + '%ダメージ',
  vsFly: v => '飛んでいる敵に+' + Math.round(v * 100) + '%ダメージ',
  vsBoss: v => 'ボスに+' + Math.round(v * 100) + '%ダメージ',
  vsFull: v => 'HP90%以上の敵に+' + Math.round(v * 100) + '%ダメージ',
  vsLow: v => 'HP30%以下の敵に+' + Math.round(v * 100) + '%ダメージ',
  critVsStun: v => '動けない敵への会心率+' + Math.round(v * 100) + '%',
  critVsBurn: v => '燃えている敵への会心率+' + Math.round(v * 100) + '%',
  critVsSlow: v => '鈍足の敵への会心率+' + Math.round(v * 100) + '%',
  critVsPoison: v => '毒の敵への会心率+' + Math.round(v * 100) + '%',
  detBurn: v => '燃焼を消費して大ダメージ（燃焼3秒分×' + v + '）',
  detPoison: v => '毒3重以上を起爆して大ダメージ（×' + v + '）',
  spreadBurn: v => '燃焼が半径' + v + 'マスに燃え広がる',
  breakShield: v => 'バリアを一撃で砕く',
  ramp: v => '同じ敵を撃ち続けると攻撃速度+' + Math.round(v * 100) + '%/回（最大10回）',
  killHeal: v => v + '体倒すごとにライフ+1',
  onKill: v => '倒した敵が爆発（攻撃×' + v + '）',
});

// 条件つき・特殊
addUnit('firehound', '炎殺しの猟犬', 'fire', 100, 26, 1.2, 2.5, 'phys', 'bolt', '焼き討ち', 'aspd', { vsBurn: [0.6, 0.9, 1.3, 2.0], burn: [0, 0.5, 0.7, 1.0] });
addUnit('embersage', '火種の賢者', 'fire', 120, 18, 1.0, 3.0, 'magic', 'bolt', '延焼', 'ability', { burn: [0.6, 0.8, 1.1, 1.6], spreadBurn: [0, 1.5, 2, 3] });
addUnit('blazeknight', '火葬騎士', 'fire', 140, 50, 0.7, 1.6, 'phys', 'melee', '起爆', 'atk', { burn: [0.5, 0.7, 1.0, 1.5], detBurn: [1.2, 1.6, 2.2, 3.2] });
addUnit('frostbreaker', '氷砕きの戦士', 'water', 110, 35, 0.8, 3.0, 'phys', 'bolt', '凍結砕き', 'atk', { stun: [0.1, 0.15, 0.2, 0.3], critVsStun: [0.6, 0.8, 1, 1], vsStun: [0.2, 0.3, 0.5, 0.8] });
addUnit('timesniper', '時止めの狙撃手', 'light', 150, 60, 0.35, 5.2, 'phys', 'bolt', '狙撃', 'range', { critVsStun: [0.5, 0.7, 0.9, 1], critVsSlow: [0.3, 0.5, 0.7, 0.9], pen: [0.1, 0.15, 0.2, 0.3] });
addUnit('venomhunter', '毒狩りの射手', 'wind', 100, 28, 1.0, 3.2, 'phys', 'bolt', '毒狩り', 'aspd', { poison: [0, 0.6, 0.9, 1.3], vsPoison: [0.5, 0.8, 1.2, 2.0] });
addUnit('plaguebomber', '疫病の爆弾魔', 'dark', 120, 14, 0.9, 2.8, 'magic', 'bolt', '毒爆発', 'ability', { poison: [1, 1.4, 2, 3], detPoison: [0, 1.5, 2.2, 3.5] });
addUnit('slowreaper', '足止め狩り', 'water', 90, 22, 1.1, 2.5, 'magic', 'bolt', '追撃', 'aspd', { slow: [0.2, 0.3, 0.4, 0.5], vsSlow: [0.5, 0.8, 1.2, 1.8] });
addUnit('markhunter', '印の狩人', 'dark', 110, 30, 0.9, 3.2, 'phys', 'bolt', '印撃ち', 'atk', { mark: [0.15, 0.2, 0.28, 0.4], vsMark: [0.5, 0.8, 1.2, 1.9] });
addUnit('shieldbreaker', 'バリア割り', 'earth', 90, 30, 0.9, 2.2, 'phys', 'bolt', '破砕', 'atk', { vsShield: [1, 1.5, 2.2, 3], breakShield: [0, 1, 1, 1], pen: [0.1, 0.15, 0.2, 0.3] });
addUnit('skyhunter', '空狩りの鷹', 'wind', 80, 20, 1.3, 4.0, 'phys', 'bolt', '対空', 'range', { vsFly: [1, 1.5, 2, 3] });
addUnit('bossbane', 'ボス殺し', 'earth', 130, 60, 0.6, 2.5, 'phys', 'bolt', '対ボス', 'atk', { vsBoss: [0.5, 0.8, 1.2, 2.0], pen: [0.1, 0.2, 0.3, 0.4] });
addUnit('opener', '先手の剣士', 'wind', 80, 14, 1.6, 2.4, 'phys', 'bolt', '先制', 'aspd', { vsFull: [0.8, 1.2, 1.8, 2.6] });
addUnit('finisher', 'とどめの処刑人', 'dark', 100, 28, 0.9, 2.2, 'phys', 'bolt', '追い込み', 'atk', { vsLow: [0.8, 1.2, 1.8, 2.8], exec: [0, 0.05, 0.08, 0.12] });
addUnit('rampgunner', '加熱の砲手', 'earth', 120, 22, 1.0, 3.0, 'phys', 'bolt', '加速', 'aspd', { ramp: [0.05, 0.07, 0.1, 0.14] });
addUnit('killnurse', '戦場の看護師', 'light', 110, 12, 1.0, 3.0, 'magic', 'bolt', '回復', 'ability', { killHeal: [12, 9, 7, 5], heal: [0, 0, 1, 1] });
addUnit('blastchain', '連鎖爆破師', 'fire', 120, 20, 0.9, 3.0, 'magic', 'bolt', '誘爆', 'atk', { onKill: [1.2, 1.6, 2.2, 3.2] });
// 範囲がでかめ
addUnit('artillery', '長距離砲兵', 'earth', 160, 42, 0.35, 5.8, 'phys', 'bolt', '超長射程', 'range', { splash: [1.4, 1.6, 1.9, 2.4] });
addUnit('meteorwitch', '流星の魔女', 'fire', 180, 30, 0.45, 5.0, 'magic', 'bolt', '流星', 'atk', { splash: [1.8, 2.0, 2.3, 2.8], burn: [0.3, 0.5, 0.7, 1.1] });
addUnit('blizzardmage', '吹雪の大魔導', 'water', 130, 16, 0.7, 3.8, 'magic', 'bolt', '吹雪', 'ability', { splash: [2.0, 2.2, 2.5, 2.9], slow: [0.3, 0.35, 0.4, 0.5] });
addUnit('tsunami', '大波の精', 'water', 120, 18, 0.8, 3.5, 'magic', 'bolt', '大波', 'ability', { splash: [1.8, 2.0, 2.2, 2.6], knock: [1, 1.4, 1.8, 2.5] });
addUnit('quakegolem', '地鳴りゴーレム', 'earth', 140, 25, 0.5, 3.5, 'phys', 'bolt', '地震', 'atk', { pulse: [1.5, 2.2, 3, 4.5], pulseStun: [0.6, 0.8, 1, 1.4] });
addUnit('stormtower', '雷雲の塔', 'wind', 150, 20, 0.7, 5.0, 'magic', 'bolt', '雷網', 'ability', { chain: [3, 4, 6, 9], stun: [0, 0.1, 0.15, 0.2] });
addUnit('solarcannon', '太陽砲', 'light', 180, 52, 0.3, 5.5, 'magic', 'bolt', '太陽', 'atk', { splash: [1.6, 1.8, 2.2, 2.7], burn: [0.6, 0.9, 1.3, 2.0], pen: [0, 0.1, 0.2, 0.3] });
addUnit('poisonfog', '毒霧の魔女', 'dark', 110, 10, 0.8, 4.0, 'magic', 'bolt', '毒霧', 'ability', { splash: [2.0, 2.2, 2.6, 3.0], poison: [0.8, 1.1, 1.6, 2.4] });
addUnit('lightningrod', '避雷針', 'wind', 130, 20, 0.9, 5.0, 'magic', 'bolt', '落雷', 'ability', { pulse: [2, 3, 4, 6], pulseStun: [0.5, 0.7, 0.9, 1.2] });
addUnit('sunpriest', '日輪の巫女', 'light', 130, 0, 0, 4.5, 'none', 'none', '広域支援', 'ability', { aAtk: [0.1, 0.15, 0.22, 0.3], aRange: [0, 0.08, 0.12, 0.18] });
addUnit('moonoracle', '月読みの巫女', 'dark', 140, 0, 0, 5.0, 'none', 'none', '広域弱体', 'ability', { eVuln: [0.06, 0.1, 0.15, 0.22], eSlow: [0.1, 0.15, 0.2, 0.3] });
addUnit('windcaller', '竜巻の呼び手', 'wind', 100, 16, 0.8, 4.5, 'magic', 'bolt', '竜巻', 'ability', { splash: [1.8, 2.0, 2.2, 2.6], knock: [0.6, 0.9, 1.3, 1.8] });
addUnit('gravitywell', '重力使い', 'dark', 150, 0, 0, 3.8, 'none', 'none', '重力場', 'ability', { eSlow: [0.25, 0.35, 0.45, 0.55], eVuln: [0, 0.08, 0.12, 0.2] });
