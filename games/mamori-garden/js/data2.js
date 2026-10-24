'use strict';
// ===== 拡張データ：攻撃力アップ・難易度・新ステージ5つ・新キャラ48体 =====
const DMG_SCALE = 25;   // 攻撃力も敵HPも25倍にして、ダメージの数字をインフレさせる（強さの釣り合いは変わらない）
const ATK_MUL = 1.0;   // 全キャラの攻撃力にかかる倍率（一度1.5にしたが、元に戻した）

// 難易度：hp=敵HP倍率 spd=敵の速さ cnt=敵の数 gem=ジェム倍率
const DIFFS = [
  { name: 'やさしい', hp: 0.67, spd: 0.95, cnt: 1.0, gem: 0.8, col: '#7aff9a' },
  { name: 'ふつう', hp: 1.0, spd: 1.0, cnt: 1.0, gem: 1.0, col: '#ffe27a' },
  { name: 'むずかしい', hp: 1.5, spd: 1.05, cnt: 1.1, gem: 1.5, col: '#ffb05a' },
  { name: 'げきむず', hp: 2.3, spd: 1.1, cnt: 1.2, gem: 2.2, col: '#ff7a5a' },
  { name: 'じごく', hp: 3.7, spd: 1.15, cnt: 1.35, gem: 3.2, col: '#ff4a6a' },
  { name: '悪夢', hp: 6.0, spd: 1.2, cnt: 1.5, gem: 4.5, col: '#c070ff' },
];
const DEFAULT_DIFF = 1;
const PREP_TIME = 25;        // ウェーブが終わるたびにもらえる、仲間を置く時間（秒）。最初の準備時間も同じ
const MIMIC_MAX_STAR = 3;    // ミミックで合成できるのは★3どうしまで
// 後ろのステージほど、もらえるゴールドが増える（敵のHPが増えるぶん）
function stageGold(i) { return 1 + 0.4 * Math.min(i, 9) + 0.2 * Math.max(0, Math.min(i, 14) - 9) + 0.15 * Math.max(0, Math.min(i, 29) - 14); }

// ---------- 新ステージ（6〜10） ----------
STAGE_HP_MUL.push(3.6, 4.7, 6.2, 8.0, 10.5);
STAGES.push(
  { name: '砂漠の遺跡', sub: 'ゆらめく陽炎と古い王墓', theme: 'desert', boss: 'pharaoh',
    path: [[-.06, .5], [.15, .5], [.15, .15], [.4, .15], [.4, .85], [.65, .85], [.65, .15], [.88, .15], [.88, .5], [1.06, .5]], zones: ['high', 'stump', 'altar', 'flower'] },
  { name: '火山の火口', sub: '赤く燃えるマグマの道', theme: 'volcano', boss: 'magmadragon',
    path: [[-.06, .2], [.5, .2], [.5, .5], [.1, .5], [.1, .82], [.9, .82], [.9, .5], [.7, .5], [.7, .3], [1.06, .3]], zones: ['spring', 'high', 'stump', 'altar'] },
  { name: '天空の城', sub: '雲の上に浮かぶ白い城', theme: 'sky', boss: 'guardian',
    path: [[-.06, .5], [.3, .5], [.3, .2], [.55, .2], [.55, .8], [.8, .8], [.8, .35], [1.06, .35]], zones: ['flower', 'high', 'altar', 'spring'] },
  { name: '深海の宮殿', sub: 'ゆらめく光と泡の世界', theme: 'abyss', boss: 'kraken',
    path: [[-.06, .12], [.9, .12], [.9, .37], [.1, .37], [.1, .62], [.9, .62], [.9, .88], [1.06, .88]], zones: ['spring', 'stump', 'flower', 'high'] },
  { name: '月夜の魔王城', sub: 'さいごの戦い', theme: 'moon', boss: 'demonking',
    path: [[-.06, .12], [.9, .12], [.9, .88], [.1, .88], [.1, .3], [.7, .3], [.7, .7], [.3, .7]], zones: ['altar', 'high', 'spring', 'stump'] },
);
Object.assign(BOSSES, {
  pharaoh: { name: '砂のファラオ', skill: '砂嵐で近くのモンスターの攻撃速度を長く下げる' },
  magmadragon: { name: '溶岩竜', skill: '火の玉でモンスター2体をやけど気絶させる' },
  guardian: { name: '天空の守護像', skill: '少しのあいだ無敵になり、周りの敵にバリアを張る' },
  kraken: { name: '深海のクラーケン', skill: 'モンスターを触手でつかんで別の場所へ投げる' },
  demonking: { name: '魔王', skill: '倒されても一度よみがえる。モンスターを眠らせる' },
});

// ---------- 新キャラ ----------
// fx：[★1, ★3, ★5, ★7] の効果量。説明文は自動で作られる。
const FXTXT = {
  splash: v => '半径' + v.toFixed(1) + 'マスの爆発',
  crit: v => '会心率' + Math.round(v * 100) + '%（2倍）',
  pen: v => '敵の防御を' + Math.round(v * 100) + '%無視',
  slow: v => Math.round(v * 100) + '%鈍足',
  stun: v => Math.round(v * 100) + '%で気絶',
  burn: v => '燃焼（毎秒 攻撃×' + v + '）',
  poison: v => '毒を重ねる（毎秒 攻撃×' + v + '）',
  mark: v => '当てた敵が受けるダメージ+' + Math.round(v * 100) + '%',
  chain: v => (v + 1) + '体に連鎖',
  pierce: v => '後ろの' + v + '体にも当たる',
  multi: v => '同時に' + (v + 1) + '発',
  exec: v => 'HP' + Math.round(v * 100) + '%以下を即死（ボス除く）',
  knock: v => v + 'マス押し戻す',
  gold: v => '倒すとゴールド+' + v,
  heal: v => 'ウェーブ終了でライフ+' + v,
  echo: v => Math.round(v * 100) + '%でもう一撃',
  shred: v => '防御ダウン' + v + '（重なる）',
  pulse: v => '6秒ごとに衝撃波（攻撃×' + v + '）',
  pulseStun: v => '衝撃波で' + v + '秒気絶',
  aAtk: v => '味方の攻撃力+' + Math.round(v * 100) + '%',
  aAspd: v => '味方の攻撃速度+' + Math.round(v * 100) + '%',
  aRange: v => '味方の射程+' + Math.round(v * 100) + '%',
  aChance: v => '味方の発動確率+' + Math.round(v * 100) + '%',
  eSlow: v => '範囲内の敵を' + Math.round(v * 100) + '%鈍足',
  eVuln: v => '範囲内の敵が受けるダメージ+' + Math.round(v * 100) + '%',
  eMr: v => '範囲内の敵の魔法耐性-' + v,
  gA: v => '範囲内で敵が倒れるとゴールド+' + v,
};
const fxAt = (a, i) => Array.isArray(a) ? a[i] : a;
function buildAb(d) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const parts = [];
    for (const k in d.fx) { const f = FXTXT[k]; if (!f) continue; const v = fxAt(d.fx[k], i), pv = i ? fxAt(d.fx[k], i - 1) : 0; if (v && v !== pv) parts.push(f(v) + (pv ? '↑' : '')); }
    out.push(parts.join('・') || '―');
  }
  return out;
}
function addUnit(key, name, elem, cost, atk, aspd, range, dmg, style, role, grow, fx) {
  const d = { key, name, elem, cost, atk, aspd, range, dmg, style, role, unlock: 0, fx, tpl: true };
  d.ab = buildAb(d); UNIT_LIST.push(d); d.no = UNIT_LIST.length; UNITS[key] = d; GROW[key] = grow; return d;
}
// 近接
addUnit('gladiator', '炎の剣闘士', 'fire', 90, 28, 0.9, 1.5, 'phys', 'melee', '燃焼', 'atk', { burn: [0.5, 0.8, 1.2, 2.0], splash: [0, 0, 1, 1.4] });
addUnit('ravenblade', '鴉の剣士', 'dark', 80, 22, 1.4, 1.6, 'phys', 'melee', '会心', 'aspd', { crit: [0.15, 0.25, 0.35, 0.5], echo: [0, 0.1, 0.2, 0.3] });
addUnit('monk', '武闘僧', 'light', 100, 30, 1.2, 1.5, 'phys', 'melee', '気絶', 'aspd', { stun: [0.1, 0.15, 0.22, 0.3], knock: [0, 0.3, 0.5, 0.8] });
addUnit('samurai', '居合いの侍', 'wind', 120, 70, 0.5, 1.8, 'phys', 'melee', '一閃', 'atk', { pen: [0.2, 0.3, 0.4, 0.6], crit: [0.2, 0.3, 0.4, 0.6] });
addUnit('viking', 'バイキング', 'earth', 110, 45, 0.7, 1.5, 'phys', 'melee', '範囲', 'atk', { splash: [0.9, 1, 1.3, 1.7], knock: [0.3, 0.3, 0.6, 1] });
addUnit('lancer', '竜騎士', 'wind', 130, 40, 0.8, 2.4, 'phys', 'melee', '貫通', 'range', { pierce: [1, 2, 3, 5] });
addUnit('boxer', 'ネコパンチ', 'earth', 60, 14, 2.2, 1.5, 'phys', 'melee', '連打', 'aspd', { echo: [0.1, 0.15, 0.25, 0.4] });
addUnit('shieldmaiden', '盾の乙女', 'light', 95, 22, 1.0, 1.5, 'phys', 'melee', '守護', 'ability', { stun: [0.1, 0.15, 0.2, 0.3], heal: [0, 0, 1, 2] });
addUnit('lavagolem', '溶岩ゴーレム', 'fire', 140, 55, 0.6, 1.6, 'phys', 'melee', '灼熱', 'atk', { burn: [0.8, 1, 1.4, 2.2], splash: [1, 1.2, 1.4, 1.8] });
addUnit('panda', 'ぱんだ師匠', 'earth', 90, 35, 0.8, 1.5, 'phys', 'melee', '押し戻し', 'atk', { knock: [0.5, 0.8, 1.2, 2], splash: [0, 0.9, 1.1, 1.4] });
addUnit('thunderwolf', '雷の子狼', 'wind', 85, 18, 1.6, 1.6, 'magic', 'melee', '連鎖', 'aspd', { chain: [1, 2, 3, 4] });
addUnit('darkcat', '影の黒猫', 'dark', 90, 20, 1.5, 2.2, 'phys', 'bolt', '急所', 'aspd', { echo: [0.1, 0.15, 0.25, 0.35], crit: [0.1, 0.2, 0.3, 0.4], pen: [0.1, 0.15, 0.2, 0.3] });
// 遠距離（物理）
addUnit('gunner', 'ガンスリンガー', 'earth', 100, 40, 1.0, 4.0, 'phys', 'bolt', '連射', 'range', { crit: [0.2, 0.3, 0.4, 0.6], multi: [0, 0, 1, 2] });
addUnit('crossbow', 'クロスボウ兵', 'wind', 90, 55, 0.6, 4.0, 'phys', 'bolt', '貫通', 'range', { pen: [0.15, 0.25, 0.35, 0.5], pierce: [0, 1, 1, 2] });
addUnit('pirate', '海賊', 'water', 110, 30, 1.0, 3.0, 'phys', 'bolt', '金策', 'range', { gold: [1, 1, 2, 3], splash: [0.8, 0.8, 1, 1.2] });
addUnit('bombrabbit', '爆弾うさぎ', 'fire', 80, 35, 0.6, 2.5, 'phys', 'bolt', '爆発', 'atk', { splash: [1.1, 1.3, 1.6, 2.1] });
addUnit('turret', '小型タレット', 'earth', 60, 16, 1.8, 2.8, 'phys', 'bolt', '連射', 'aspd', { echo: [0.1, 0.15, 0.2, 0.3], crit: [0.05, 0.1, 0.15, 0.2] });
addUnit('robo', '戦闘ロボ', 'earth', 120, 36, 1.0, 3.0, 'phys', 'bolt', '多弾', 'aspd', { multi: [0, 1, 1, 2], crit: [0.1, 0.15, 0.2, 0.3] });
// 魔法
addUnit('stormcaller', '嵐の呼び手', 'wind', 120, 22, 0.9, 3.0, 'magic', 'bolt', '連鎖', 'ability', { chain: [2, 3, 4, 6] });
addUnit('tidemage', '潮の魔女', 'water', 100, 20, 0.9, 3.0, 'magic', 'bolt', '鈍足', 'ability', { slow: [0.2, 0.3, 0.4, 0.5], splash: [0.8, 0.8, 1.1, 1.4] });
addUnit('voidmage', '虚空の魔導士', 'dark', 150, 50, 0.6, 3.0, 'magic', 'bolt', '処刑', 'ability', { exec: [0, 0.08, 0.12, 0.18], mark: [0.1, 0.15, 0.2, 0.3] });
addUnit('crystalmage', '水晶の導師', 'light', 110, 26, 0.8, 3.0, 'magic', 'bolt', '弱体', 'ability', { splash: [1, 1, 1.3, 1.6], mark: [0.1, 0.15, 0.2, 0.3] });
addUnit('sandwitch', '砂漠の魔女', 'earth', 90, 18, 1.0, 3.0, 'magic', 'bolt', '砂嵐', 'ability', { slow: [0.15, 0.25, 0.3, 0.4], pulse: [0, 1.2, 1.8, 3], pulseStun: [0, 0.6, 0.8, 1.2] });
addUnit('icelancer', '氷槍兵', 'water', 100, 32, 0.9, 2.2, 'phys', 'bolt', '氷突', 'range', { pierce: [1, 1, 2, 3], slow: [0.25, 0.3, 0.4, 0.5] });
addUnit('thornpriest', '棘の司祭', 'wind', 100, 10, 1.0, 2.8, 'magic', 'bolt', '毒', 'ability', { poison: [1.2, 1.6, 2.2, 3.2] });
addUnit('plaguedoctor', 'ペスト医師', 'dark', 110, 14, 1.0, 2.5, 'magic', 'bolt', '疫病', 'ability', { poison: [1.5, 2, 2.8, 4], mark: [0, 0.1, 0.15, 0.25] });
addUnit('astrologer', '星読み', 'light', 130, 16, 0.8, 3.5, 'magic', 'bolt', '星弾', 'range', { multi: [1, 2, 3, 5] });
addUnit('fireworker', '花火師', 'fire', 150, 40, 0.7, 3.0, 'magic', 'bolt', '花火', 'atk', { splash: [1, 1.2, 1.4, 1.8], pulse: [0, 1.5, 2.2, 3.5] });
addUnit('mochifox', 'こぎつね', 'fire', 70, 12, 1.2, 2.6, 'magic', 'bolt', '燃焼', 'ability', { burn: [0.6, 0.8, 1.1, 1.8] });
addUnit('owlsage', 'ふくろう博士', 'light', 120, 24, 0.9, 3.2, 'magic', 'bolt', '弱体', 'range', { mark: [0.1, 0.15, 0.2, 0.3], multi: [0, 1, 1, 2] });
addUnit('phoenix', '小さな不死鳥', 'fire', 160, 38, 0.9, 3.2, 'magic', 'bolt', '浄火', 'ability', { splash: [1, 1.2, 1.5, 1.9], burn: [0.8, 1, 1.4, 2.2], pulse: [0, 0, 1.6, 2.8] });
addUnit('penguin', 'ペンギン兵', 'water', 70, 18, 1.1, 2.5, 'magic', 'bolt', '鈍足', 'ability', { slow: [0.2, 0.3, 0.35, 0.45] });
addUnit('tesla', 'テスラ塔', 'wind', 140, 20, 0.9, 3.0, 'magic', 'bolt', '連鎖', 'ability', { chain: [3, 4, 5, 8], stun: [0, 0.1, 0.15, 0.25] });
addUnit('sunflower', 'ひまわり', 'earth', 60, 8, 1.0, 2.2, 'magic', 'bolt', '金策', 'ability', { gold: [1, 1, 2, 3] });
addUnit('rosequeen', '薔薇の女王', 'dark', 130, 26, 0.9, 2.8, 'magic', 'bolt', '毒', 'ability', { poison: [1, 1.4, 2, 3], slow: [0.15, 0.2, 0.3, 0.4] });
addUnit('wisp', '鬼火', 'fire', 70, 14, 1.4, 2.8, 'magic', 'bolt', '燃焼', 'aspd', { burn: [0.5, 0.7, 1, 1.6] });
addUnit('moonspirit', '月の精', 'light', 130, 22, 1.0, 3.2, 'magic', 'bolt', '星光', 'ability', { mark: [0.08, 0.12, 0.18, 0.28], chain: [1, 1, 2, 3] });
addUnit('stormcloud', '雷雲', 'wind', 105, 16, 1.1, 3.0, 'magic', 'bolt', '気絶', 'ability', { stun: [0.12, 0.18, 0.25, 0.35], chain: [0, 1, 1, 2] });
addUnit('magmaslime', 'マグマスライム', 'fire', 85, 30, 0.8, 2.0, 'magic', 'bolt', '爆発', 'atk', { splash: [0.9, 1.1, 1.4, 1.8], burn: [0.4, 0.6, 0.9, 1.4] });
addUnit('dragonling', '風の小竜', 'wind', 170, 60, 0.8, 3.5, 'magic', 'bolt', '竜', 'atk', { splash: [1, 1.2, 1.5, 2], pierce: [0, 1, 2, 3], burn: [0, 0.8, 1.2, 2] });
// 支援
addUnit('bard', '吟遊詩人', 'water', 90, 0, 0, 2.0, 'none', 'none', '支援', 'ability', { aAspd: [0.1, 0.15, 0.2, 0.3], aChance: [0, 0.1, 0.15, 0.25] });
addUnit('cheer', '応援団長', 'fire', 100, 0, 0, 2.0, 'none', 'none', '支援', 'ability', { aAtk: [0.12, 0.18, 0.25, 0.35] });
addUnit('oracle', '占い師', 'dark', 110, 0, 0, 2.2, 'none', 'none', '弱体', 'ability', { eVuln: [0.08, 0.12, 0.18, 0.25] });
addUnit('frostqueen', '雪の魔女', 'water', 120, 0, 0, 2.2, 'none', 'none', '足止め', 'ability', { eSlow: [0.2, 0.28, 0.36, 0.45], eVuln: [0, 0, 0.08, 0.15] });
addUnit('smith', '鍛冶師', 'earth', 100, 0, 0, 2.0, 'none', 'none', '支援', 'ability', { aAtk: [0.1, 0.14, 0.2, 0.3], aRange: [0, 0.1, 0.15, 0.2] });
addUnit('merchant', '行商人', 'light', 80, 0, 0, 2.2, 'none', 'none', '経済', 'ability', { gA: [1, 1, 2, 3] });
addUnit('nun', '鐘の修道女', 'light', 110, 0, 0, 2.0, 'none', 'none', '回復', 'ability', { heal: [0, 1, 2, 3], aAspd: [0.05, 0.08, 0.12, 0.16] });
addUnit('druid', '森の賢者', 'wind', 110, 0, 0, 2.2, 'none', 'none', '支援', 'ability', { aRange: [0.1, 0.15, 0.2, 0.3], aAspd: [0.05, 0.08, 0.12, 0.18] });

// ---------- 解放（ステージクリア） ----------
// 旧ステージ(1〜5)に2体ずつ、新ステージ(6〜10)に残りを値段の安い順に配る
(function () {
  const early = [['boxer', 'mochifox'], ['penguin', 'sunflower'], ['turret', 'wisp'], ['bombrabbit', 'merchant'], ['bard', 'thunderwolf']];
  early.forEach((l, i) => STAGE_UNLOCK[i].push(...l));
  const used = new Set(early.flat()), rest = UNIT_LIST.filter(u => u.tpl && !used.has(u.key)).sort((a, b) => a.cost - b.cost).map(u => u.key);
  const per = Math.ceil(rest.length / 5);
  for (let i = 0; i < 5; i++) STAGE_UNLOCK.push(rest.slice(i * per, (i + 1) * per));
})();
