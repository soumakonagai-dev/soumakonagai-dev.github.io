'use strict';
// ===== ステージ 16〜30（旅の後半：同じ土地を別の季節・別の姿で。ボスも強化版） =====
// BOSS_BASE：技や復活などのふるまいは、元になったボスと同じ
const BOSS_BASE = {};
const STAGE_EX = [];   // 見た目用：[テーマ名, 元テーマ, 色相ずらし, 色の濃さ, 明るさ, 全体にかける色, ボス絵の色]
const flipPath = p => p.map(([u, v]) => [u, +(1 - v).toFixed(3)]);
(function () {
  const defs = [
    // name, sub, baseStage(0-index・道を借りる), theme, base theme, hue, sat, lit, overlay, boss key, boss name, boss base, skill text, boss tint
    ['紅蓮の砂漠', '燃えるように赤い砂', 5, 'desert_r', 'desert', -25, 1.3, 0.95, [255, 60, 30], 'pharaoh_r', '紅蓮のファラオ', 'pharaoh', '砂嵐で味方の動きをにぶらせる', '#ff3a2a'],
    ['蒼炎の火山', '青く燃える山', 6, 'volcano_b', 'volcano', 170, 1.0, 1.0, [40, 120, 255], 'magma_b', '蒼炎竜', 'magmadragon', '蒼い炎でモンスターをこらしめる', '#3a8aff'],
    ['夕焼けの天空城', '茜色の雲の上', 7, 'sky_s', 'sky', 150, 1.1, 1.0, [255, 130, 60], 'guardian_g', '黄金の天空守護者', 'guardian', '少しのあいだ無敵になり、周りにバリアを張る', '#ffd24a'],
    ['底なしの深海', '光も届かない', 8, 'abyss_d', 'abyss', 20, 0.8, 0.7, [10, 0, 60], 'kraken_d', '深淵のクラーケン', 'kraken', '触手でモンスターをつかんで飛ばす', '#5a3aff'],
    ['血の月夜', '赤い月の魔王城', 9, 'moon_b', 'moon', 170, 1.2, 0.9, [200, 20, 40], 'demon_r', '紅の魔王', 'demonking', '倒されても一度よみがえる。モンスターを眠らせる', '#ff2a4a'],
    ['朝桜の庭', 'うす桃色の朝もや', 10, 'sakura_d', 'sakura', 0, 0.7, 1.35, [255, 255, 230], 'kyuubi_w', '白面の妖狐', 'kyuubi', '妖しい狐火でモンスターを眠らせる', '#ffffff'],
    ['暴風雨の海辺', '荒れる波と雷', 11, 'storm_d', 'storm', 100, 1.0, 0.9, [20, 60, 120], 'raijuu_g', '雷獣の王', 'raijuu', '雷でしびれさせ、自分は速く走る', '#6ad0ff'],
    ['紅水晶の洞窟', 'ばら色にかがやく', 12, 'crystal_r', 'crystal', 120, 1.2, 1.0, [255, 60, 160], 'crystalking_r', '紅水晶の巨像', 'crystalking', '無敵になり、周りにバリアを張る', '#ff6ac8'],
    ['銀の歯車塔', '月の光でまわる', 13, 'clock_s', 'clock', 180, 0.4, 1.15, [160, 190, 255], 'clockking_s', '銀の時計王', 'clockking', '時間を止めて、モンスターを動けなくする', '#c8d8ff'],
    ['秋の世界樹', '黄金の葉がふる', 14, 'wt_a', 'worldtree', -80, 1.1, 1.0, [255, 150, 30], 'treequeen_a', '紅葉の女王', 'treequeen', '木の根で縛り、周りの敵を回復する', '#ff9a3a'],
    ['月下の砂漠', '青い砂と星空', 5, 'desert_n', 'desert', 200, 0.9, 0.6, [30, 40, 140], 'pharaoh_n', '月夜のファラオ', 'pharaoh', '砂嵐で味方の動きをにぶらせる', '#5a6aff'],
    ['毒の沼の火山', 'みどり色の煙', 6, 'volcano_g', 'volcano', 250, 1.1, 1.0, [60, 200, 40], 'magma_g', '猛毒竜', 'magmadragon', '毒の炎でモンスターをこらしめる', '#6aff3a'],
    ['光る深海', 'ぼうっと光る世界', 8, 'abyss_g', 'abyss', 100, 1.3, 1.25, [40, 255, 180], 'kraken_g', '光のクラーケン', 'kraken', '触手でモンスターをつかんで飛ばす', '#3affc8'],
    ['星屑の月面', '星がこぼれる地面', 9, 'moon_g', 'moon', 60, 1.0, 1.25, [255, 220, 90], 'demon_g', '星屑の魔王', 'demonking', '倒されても一度よみがえる。モンスターを眠らせる', '#ffe27a'],
    ['神々の世界樹', 'さいごの、さいごの庭', 14, 'wt_g', 'worldtree', 40, 0.8, 1.35, [255, 245, 200], 'godking', '神王', 'demonking', '倒されても一度よみがえる。モンスターを眠らせる', '#fff2a0'],
  ];
  const nHp = [19.5, 21.5, 23.5, 25.5, 27.5, 30, 32.5, 35, 37.5, 40, 43, 46, 49, 52.5, 56];
  defs.forEach((d, i) => {
    const [name, sub, bs, th, base, hue, sat, lit, ov, bk, bn, bb, bsk, tint] = d, src = STAGES[bs];
    STAGE_HP_MUL.push(nHp[i]);
    STAGE_EX.push({ theme: th, base, hue, sat, lit, ov, boss: bk, bossBase: bb, tint });
    STAGES.push({ name, sub, theme: th, boss: bk, path: i % 2 ? flipPath(src.path) : src.path.map(p => p.slice()), zones: src.zones.slice().reverse() });
    BOSSES[bk] = { name: bn, skill: bsk }; BOSS_BASE[bk] = bb;
  });
})();
