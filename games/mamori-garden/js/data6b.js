'use strict';
// ===== ステージ 31〜40（さらに先へ。色と道をかえた、きびしい10面） =====
(function () {
  const defs = [
    // name, sub, 道を借りるステージ, テーマ名, 元テーマ, 色相, 彩度, 明るさ, 全体の色, ボスkey, ボス名, ボスの元, 技, ボスの色
    ['氷結の天空', 'こおりついた雲の海', 16, 'sky_i', 'sky', 190, 0.9, 1.15, [160, 220, 255], 'frostwyrm', '氷晶竜', 'magmadragon', '氷の炎で味方を眠らせる', '#bfe8ff'],
    ['紫電の都', 'むらさきのいなずま', 17, 'sakura_p', 'sakura', 280, 1.3, 0.95, [170, 80, 255], 'raiden', '紫電の獣王', 'raijuu', '雷で味方をしびれさせる', '#c070ff'],
    ['黒曜の洞窟', 'くろく光る岩のおく', 18, 'crystal_o', 'crystal', 260, 0.9, 0.65, [40, 20, 80], 'obsidian', '黒曜の巨像', 'crystalking', '無敵になり、バリアを張る', '#6a4aa8'],
    ['琥珀の歯車塔', 'こはく色のぜんまい', 19, 'clock_a', 'clock', 30, 1.1, 1.05, [255, 190, 60], 'amberking', '琥珀の時計王', 'clockking', '時間を止めて動けなくする', '#ffb040'],
    ['翡翠の世界樹', 'みどりの宝石の森', 20, 'wt_j', 'worldtree', 160, 1.1, 1.0, [60, 230, 160], 'jadequeen', '翡翠の女王', 'treequeen', '根で縛り、まわりの敵を回復', '#4affb0'],
    ['砂塵の王宮', '風にかすむ金の宮殿', 21, 'desert_k', 'desert', 20, 0.7, 1.1, [255, 200, 110], 'goldpharaoh', '黄金のファラオ', 'pharaoh', '砂嵐で味方をにぶらせる', '#ffd24a'],
    ['溶岩の祭壇', '赤くたぎる神殿', 22, 'volcano_r', 'volcano', 340, 1.2, 1.0, [255, 60, 30], 'lavalord', '溶岩の守護者', 'guardian', '無敵になり、バリアを張る', '#ff5a2a'],
    ['深海の王国', '光がゆれる、ふかい青', 23, 'abyss_k', 'abyss', 200, 1.1, 1.3, [40, 160, 255], 'abysskraken', '深海の大王', 'kraken', '触手で味方をつかんで飛ばす', '#4ab0ff'],
    ['月の裏側', 'ぜったい見えない場所', 24, 'moon_u', 'moon', 300, 1.2, 0.85, [200, 60, 255], 'darkmoon', '裏月の魔王', 'demonking', 'よみがえる。眠らせる', '#d070ff'],
    ['星海の果て', 'さいごの、さいごの先', 25, 'sky_z', 'sky', 250, 0.6, 0.65, [20, 10, 80], 'starking', '星海の王', 'demonking', 'よみがえる。眠らせる', '#ffe27a'],
  ];
  const nHp = [59.5, 63, 67, 71, 75, 79.5, 84, 89, 94.5, 100];
  defs.forEach((d, i) => {
    const [name, sub, bs, th, base, hue, sat, lit, ov, bk, bn, bb, bsk, tint] = d, src = STAGES[bs];
    STAGE_HP_MUL.push(nHp[i]);
    STAGE_EX.push({ theme: th, base, hue, sat, lit, ov, boss: bk, bossBase: bb, tint });
    STAGES.push({ name, sub, theme: th, boss: bk, path: i % 2 ? src.path.map(p => p.slice()) : flipPath(src.path), zones: src.zones.slice().reverse() });
    BOSSES[bk] = { name: bn, skill: bsk }; BOSS_BASE[bk] = bb;
  });
})();
