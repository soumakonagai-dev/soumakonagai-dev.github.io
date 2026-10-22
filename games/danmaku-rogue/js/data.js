'use strict';
// ===== 設計書 §7 難易度 5 段階 =====
// dens = 弾幕密度（1秒あたりに出る弾の量。NORMAL=1.0）。難易度が上がるほど段階的に濃くなる。
//   量(ways)・発射間隔(interval)・連射(burst)は dens を満たすように buildEmitter が配分するので、
//   どの弾幕でも「濃さ」だけが素直に上がる。burst は「同じ濃さを、まとめ撃ちで出すか」の違い。
const DIFFICULTY = [
  // EASY〜HARD は「弾幕に慣れていない人でも抜けられる」難しさ。LUNATIC・ABYSS は一気に跳ね上がる。
  { id: 1, name: 'EASY',    col: '#6f8', who: 'STG 初心者',   dens: 0.5, burst: -1, speed: 0.82, gap: 100, aimJitter: 16, layers: 0, bossLayers: 0, revenge: null,        enemyCount: 0.8,  enemyHp: 0.8,  hp: 5, iframes: 120, exp: 0.8, core: 0.5 },
  { id: 2, name: 'NORMAL',  col: '#6cf', who: '一般',         dens: 0.85,  burst:  0, speed: 0.97,  gap: 80,  aimJitter: 10, layers: 0, bossLayers: 0, revenge: null,        enemyCount: 0.95, enemyHp: 0.95, hp: 4, iframes: 100, exp: 1.0, core: 1.0 },
  { id: 3, name: 'HARD',    col: '#fd5', who: '弾幕に慣れた人', dens: 1.2, burst: 0, speed: 1.0,  gap: 76,  aimJitter: 9,  layers: 0, bossLayers: 0, revenge: null,        enemyCount: 1.0,  enemyHp: 1.0,  hp: 4, iframes: 95,  exp: 1.2, core: 1.5 },
  { id: 4, name: 'LUNATIC', col: '#f86', who: '上級者向け・激ムズ', dens: 2.6, burst: 2, speed: 1.2, gap: 52, aimJitter: 2, layers: 1, bossLayers: 2, revenge: 'aim3', enemyCount: 1.2, enemyHp: 1.5, hp: 3, iframes: 72, exp: 1.7, core: 2.5 },
  { id: 5, name: 'ABYSS',   col: '#f4f', who: '極限・クリアできたら達人', dens: 3.3, burst: 2, speed: 1.25, gap: 46, aimJitter: 0, layers: 1, bossLayers: 2, revenge: 'aim5accel', enemyCount: 1.3, enemyHp: 1.6, hp: 2, iframes: 62, exp: 2.1, core: 4.0 },
];
// 表示・トレーラー用（量と間隔の目安）
DIFFICULTY.forEach(x => { x.ways = +(Math.pow(x.dens, 0.6)).toFixed(2); x.interval = +(1 / Math.pow(x.dens, 0.4)).toFixed(2); });
const REVENGE = { aim1: { ways: 1, spread: 0 }, aim3: { ways: 3, spread: 36 }, aim5accel: { ways: 5, spread: 56, acc: 0.05, max: 4.2 } };

// ===== 弾の見た目 / 当たり半径 =====
const BT = { rice: { r: 3.2, hr: 2.6 }, orb: { r: 5.5, hr: 4.2 }, big: { r: 9, hr: 7 }, small: { r: 3, hr: 2.4 } };

// ===== 弾幕パターン（基準値 = NORMAL での値） §6 =====
const PATTERNS = {
  aim1:     { type: 'aim',    ways: 1,  spread: 0,  interval: 80,  speed: 2.6, bt: 'rice', col: '#fa6' },
  aim3:     { type: 'aim',    ways: 3,  spread: 36, interval: 70,  speed: 2.4, bt: 'orb',  col: '#6cf' },
  aim5:     { type: 'aim',    ways: 5,  spread: 60, interval: 55,  speed: 2.6, bt: 'orb',  col: '#f7a' },
  xAim:     { type: 'aim',    ways: 3,  spread: 50, interval: 110, speed: 2.0, bt: 'rice', col: '#fd6' },
  ring12:   { type: 'ring',   ways: 12, interval: 70, speed: 2.0, bt: 'orb',  col: '#6df' },
  ring20:   { type: 'ring',   ways: 20, interval: 90, speed: 1.8, rotate: 5, bt: 'rice', col: '#9f8' },
  spiral3:  { type: 'ring',   ways: 3,  interval: 7,  speed: 2.2, rotate: 9,  bt: 'rice', col: '#f8f' },
  spiral5:  { type: 'ring',   ways: 5,  interval: 6,  speed: 2.0, rotate: -7, bt: 'rice', col: '#8ff' },
  spray:    { type: 'spray',  ways: 2,  spread: 70, interval: 14, speed: 2.0, bt: 'rice', col: '#ff8' },
  wall:     { type: 'wall',   ways: 1,  interval: 130, speed: 1.8, bt: 'orb',  col: '#8af' },
  cross:    { type: 'cross',  ways: 2,  interval: 16, speed: 2.2, bt: 'rice', col: '#faf' },
  aimAccel: { type: 'aim',    ways: 3,  spread: 20, interval: 60, speed: 0.8, acc: 0.04, max: 4.5, bt: 'rice', col: '#f66' },
  split:    { type: 'split',  ways: 3,  spread: 50, interval: 100, speed: 2.0, splitT: 45, splitWays: 8, bt: 'big', col: '#fa4' },
  laser:    { type: 'laser',  ways: 1,  interval: 200, warn: 45, dur: 25, col: '#f44' },
  homing:   { type: 'homing', ways: 3,  spread: 40, interval: 120, speed: 1.6, homeT: 70, bt: 'orb', col: '#4f8' },
};

// ===== 敵 §5 =====
const ENEMIES = {
  grunt:  { name: 'ザコ(直進)', hp: 3,  r: 12, col: '#6cf', move: 'down',  pats: ['aim1'],             extra: ['xAim'],    gem: [['small', 1]],                   core: 0.2, gold: 1 },
  swirl:  { name: 'ザコ(旋回)', hp: 4,  r: 12, col: '#9f6', move: 'arc',   pats: ['spray'],            extra: ['xAim'],    gem: [['small', 1]],                   core: 0.2, gold: 1 },
  rusher: { name: '突撃型',     hp: 5,  r: 12, col: '#f66', move: 'dive',  pats: [],                   extra: ['xAim'],    gem: [['small', 1], ['small', 1]],     core: 0.3, gold: 2, revenge: true },
  turret: { name: '砲台',       heavy: true, hp: 22, r: 18, col: '#fc6', move: 'hold',  variants: [['ring12'], ['spiral3']], extra: ['aim3'], gem: [['mid', 5], ['small', 1], ['small', 1]], core: 1, gold: 5, revenge: true },
  elite:  { name: 'エリート',   heavy: true, hp: 70, r: 22, col: '#d6f', move: 'drift', pats: ['aim5', 'ring12'],   extra: ['wall', 'spiral5'], gem: [['big', 25], ['mid', 5], ['mid', 5], ['mid', 5]], core: 4, gold: 12, revenge: true },
};

// ===== ボス §5（HPバーをフェーズ数で等分） =====
const BOSSES = [
  { name: '紅蓮の砲台', col: '#f55', hp: 1500, phases: [
    { pats: ['aim5', 'ring12'], extra: ['aimAccel', 'xAim'] },
    { pats: ['spiral3', 'wall'], extra: ['ring20', 'xAim'] },
    { pats: ['spray', 'split'], extra: ['laser', 'aimAccel'] } ] },
  { name: '碧き観測者', col: '#5af', hp: 1900, phases: [
    { pats: ['homing', 'ring20'], extra: ['cross', 'aimAccel'] },
    { pats: ['wall', 'aim3', 'spray'], extra: ['ring12', 'laser'] },
    { pats: ['spiral5', 'split'], extra: ['aim5', 'cross'] } ] },
  { name: '翠の織り手', col: '#5e8', hp: 2400, phases: [
    { pats: ['cross', 'aim5'], extra: ['ring20', 'homing'] },
    { pats: ['spiral3', 'spiral5'], extra: ['wall', 'aimAccel'] },
    { pats: ['laser', 'split', 'ring12'], extra: ['spray', 'cross'] } ] },
  { name: '紫紺の王', col: '#c6f', hp: 3000, phases: [
    { pats: ['ring20', 'aim5'], extra: ['wall', 'aimAccel'] },
    { pats: ['homing', 'cross', 'wall'], extra: ['spiral3', 'laser'] },
    { pats: ['spiral5', 'split'], extra: ['ring12', 'aim5'] },
    { pats: ['laser', 'spray', 'ring20'], extra: ['aimAccel', 'cross'] } ] },
  { name: '深淵の主', col: '#fff', hp: 3600, phases: [
    { pats: ['aim5', 'ring20'], extra: ['wall', 'aimAccel'] },
    { pats: ['spiral5', 'wall'], extra: ['homing', 'ring12'] },
    { pats: ['spray', 'laser', 'split'], extra: ['cross', 'aimAccel'] },
    { pats: ['cross', 'homing', 'ring20'], extra: ['spiral3', 'laser'] },
    { pats: ['spiral5', 'spiral3', 'wall', 'laser'], extra: ['aim5', 'ring20'] } ] },
];
const MIDBOSSES = [
  { name: '斥候長',   col: '#fa5', hp: 500,  phases: [{ pats: ['aim3', 'ring12'], extra: ['xAim'] }, { pats: ['spiral3', 'spray'], extra: ['aimAccel'] }] },
  { name: '氷の番人', col: '#8df', hp: 650,  phases: [{ pats: ['ring12', 'cross'], extra: ['xAim'] }, { pats: ['wall', 'aim3'], extra: ['spiral3'] }] },
  { name: '蔦の守護', col: '#9e6', hp: 800,  phases: [{ pats: ['homing', 'aim3'], extra: ['ring12'] }, { pats: ['spray', 'split'], extra: ['aimAccel'] }] },
  { name: '影の騎士', col: '#b8f', hp: 1000, phases: [{ pats: ['aim5', 'wall'], extra: ['ring12'] }, { pats: ['spiral5', 'laser'], extra: ['cross'] }] },
  { name: '深淵の使者', col: '#fcf', hp: 1300, phases: [{ pats: ['ring20', 'aim5'], extra: ['wall'] }, { pats: ['spiral5', 'split', 'laser'], extra: ['homing'] }] },
];

// ===== 武器 / パッシブ §3 =====
const WEAPONS = {
  shot:   { name: 'フロントショット', evo: 'ビームレイン',     need: 'rate',   desc: '正面へ連射。Lvで本数が増える' },
  homing: { name: 'ホーミング',       evo: 'スウォーム',       need: 'count',  desc: '近い敵を追尾するミサイル' },
  laser:  { name: 'レーザー',         evo: 'プリズムレイ',     need: 'atk',    desc: '貫通する直線レーザー' },
  orbit:  { name: 'オービット',       evo: 'エクリプス',       need: 'hitbox', desc: '周囲を回る球。敵弾も消す' },
  spread: { name: 'スプレッド',       evo: 'フェニックス',     need: 'range',  desc: '近距離へ扇状に発射' },
  thunder:{ name: 'サンダー',         evo: 'ジャッジメント',   need: 'luck',   desc: 'ランダムな敵へ落雷' },
};
const PASSIVES = {
  atk:    { name: '攻撃力',         desc: '与ダメージ +12%/Lv' },
  rate:   { name: '連射速度',       desc: '発射間隔 短縮 +10%/Lv' },
  count:  { name: '弾数アップ',     desc: '弾数 +1 (Lv2,4で)' },
  range:  { name: '射程',           desc: '射程・範囲 +12%/Lv' },
  move:   { name: '移動速度',       desc: '移動速度 +6%/Lv' },
  pickup: { name: '回収範囲',       desc: 'ジェム回収範囲 +25%/Lv' },
  hitbox: { name: '当たり判定縮小', desc: '被弾判定 -8%/Lv' },
  graze:  { name: 'グレイズ範囲',   desc: 'グレイズ範囲 +15%/Lv' },
  maxhp:  { name: '最大HP',         desc: '最大HP +1 (Lv1,3,5で)' },
  bomb:   { name: 'ボム数',         desc: '取得/Lvアップでボム+1' },
  luck:   { name: '幸運',           desc: 'レア度が上がりやすい' },
};

// ===== メタ進行 §4 =====
const META = [
  { id: 'atk',    name: '初期攻撃力',   max: 5, desc: '+5%/Lv',       cost: l => 30 * (l + 1) },
  { id: 'bomb',   name: '初期ボム数',   max: 2, desc: '+1/Lv',        cost: l => 60 * (l + 1) },
  { id: 'pickup', name: '回収範囲',     max: 5, desc: '+10%/Lv',      cost: l => 25 * (l + 1) },
  { id: 'reroll', name: 'リロール回数', max: 3, desc: '+1/Lv',        cost: l => 80 * (l + 1) },
];
const UNLOCKS = [
  { id: 'orbit',   cost: 80 },
  { id: 'spread',  cost: 120 },
  { id: 'thunder', cost: 160 },
];

// ===== イベント =====
const EVENTS = [
  { title: '血の契約', text: '祭壇が囁く。「命を差し出せば、力をやろう」',
    a: { label: '最大HP-1 / 攻撃力+25%', fn: r => { r.hpMod--; r.atkBonus *= 1.25; } },
    b: { label: '断る', fn: () => {} } },
  { title: '呪いの祭壇', text: '呪いを受けるとパッシブを得られる。呪い1つで 弾速+5% 経験値+10% コア+15%',
    a: { label: '呪いを受け入れる(パッシブ1つ獲得)', fn: r => { r.curse++; const c = randomPassive(); if (c) applyCard(c); } },
    b: { label: '断る', fn: () => {} } },
  { title: '謎の泉', text: '澄んだ泉が湧いている。',
    a: { label: 'HPを2回復', fn: r => { r.hp = Math.min(r.maxhp, r.hp + 2); } },
    b: { label: 'ボム+1', fn: r => { r.bombs = Math.min(8, r.bombs + 1); } } },
];

// ===== 追加ステージ 6〜8（砂漠・機械要塞・星海）=====
Object.assign(PATTERNS, {
  petal:   { type: 'ring',  ways: 6,  interval: 8,  speed: 1.7, rotate: 13, bt: 'orb',  col: '#fa8' },
  rain:    { type: 'spray', ways: 3,  spread: 150, interval: 7, speed: 2.6, bt: 'rice', col: '#9cf' },
  accRing: { type: 'ring',  ways: 16, interval: 80, speed: 1.0, acc: 0.03, max: 3.2, bt: 'orb', col: '#f9c' },
  fan9:    { type: 'aim',   ways: 9,  spread: 120, interval: 50, speed: 2.4, bt: 'rice', col: '#fc8' },
});
BOSSES.push(
  { name: '砂塵の女王', col: '#eb5', hp: 4200, phases: [
    { pats: ['petal', 'aim5'], extra: ['wall', 'aimAccel'] },
    { pats: ['rain', 'accRing'], extra: ['homing', 'cross'] },
    { pats: ['fan9', 'spiral5'], extra: ['laser', 'ring20'] },
    { pats: ['split', 'petal', 'wall'], extra: ['aimAccel', 'cross'] } ] },
  { name: '鋼鉄の機神', col: '#6bd', hp: 4800, phases: [
    { pats: ['laser', 'fan9'], extra: ['wall', 'ring20'] },
    { pats: ['accRing', 'homing', 'cross'], extra: ['petal', 'aimAccel'] },
    { pats: ['spiral5', 'rain', 'wall'], extra: ['laser', 'split'] },
    { pats: ['petal', 'fan9', 'laser'], extra: ['accRing', 'cross'] },
    { pats: ['ring20', 'split', 'homing'], extra: ['spiral3', 'laser'] } ] },
  { name: '星海の覇者', col: '#f7c', hp: 5400, phases: [
    { pats: ['fan9', 'accRing'], extra: ['wall', 'homing'] },
    { pats: ['petal', 'spiral5'], extra: ['laser', 'cross'] },
    { pats: ['rain', 'split', 'wall'], extra: ['ring20', 'aimAccel'] },
    { pats: ['homing', 'accRing', 'laser'], extra: ['fan9', 'petal'] },
    { pats: ['spiral5', 'spiral3', 'rain'], extra: ['wall', 'laser'] },
    { pats: ['petal', 'fan9', 'accRing', 'laser'], extra: ['cross', 'split'] } ] },
);
MIDBOSSES.push(
  { name: '砂漠の騎兵', col: '#eb8', hp: 1600, phases: [{ pats: ['petal', 'aim3'], extra: ['xAim'] }, { pats: ['rain', 'fan9'], extra: ['aimAccel'] }] },
  { name: '守護機兵',   col: '#8cf', hp: 2000, phases: [{ pats: ['laser', 'aim5'], extra: ['wall'] }, { pats: ['accRing', 'cross'], extra: ['petal'] }] },
  { name: '星の巫女',   col: '#fbe', hp: 2500, phases: [{ pats: ['fan9', 'homing'], extra: ['ring12'] }, { pats: ['petal', 'spiral5', 'split'], extra: ['laser'] }] },
);

// ===== ステージ一覧（1ステージ = 5ウェーブ。ウェーブ3が中ボス、ウェーブ5がボス）=====
// id と BOSSES / MIDBOSSES / BG_THEMES の並びは同じ順番（id-1 の添字）
const STAGES = [
  { id: 1,  name: '星降る夜空' },
  { id: 2,  name: '氷晶の回廊' },
  { id: 3,  name: '翠の樹海' },
  { id: 4,  name: '紫紺の雷雲' },
  { id: 5,  name: '深淵' },
  { id: 6,  name: '黄金の砂漠' },
  { id: 7,  name: '機械の要塞' },
  { id: 8,  name: '星海の果て' },
  { id: 9,  name: '灼熱の火山' },
  { id: 10, name: '時の回廊' },
];

// ===== 機体（ゴールドで購入）=====
const SHIPS = [
  { id: 'alpha',    name: 'アルファ',   price: 0,    col: '#4ac', weapon: 'shot',    spd: 1,    atk: 1,    hp: 0,  bombs: 0, hit: 1,   pick: 1,   luck: 0, perk: 'バランス型。迷ったらこれ。' },
  { id: 'falcon',   name: 'ファルコン', price: 400,  col: '#3dc', weapon: 'homing',  spd: 1.25, atk: 0.95, hp: 0,  bombs: 0, hit: 1,   pick: 1,   luck: 0, perk: '高速機。ホーミング装備で、動きまわって避けやすい。' },
  { id: 'guardian', name: 'ガーディアン', price: 600, col: '#6c8', weapon: 'orbit',   spd: 0.85, atk: 1,    hp: 2,  bombs: 0, hit: 1,   pick: 1,   luck: 0, perk: '最大HP+2の重装甲。オービット装備で敵弾を消せる。' },
  { id: 'lancer',   name: 'ランサー',   price: 800,  col: '#e8a', weapon: 'laser',   spd: 1,    atk: 1.1,  hp: 0,  bombs: 0, hit: 1,   pick: 1,   luck: 0, perk: 'レーザー装備。攻撃力+10%。まっすぐ貫く。' },
  { id: 'tempest',  name: 'テンペスト', price: 1000, col: '#fd5', weapon: 'thunder', spd: 1,    atk: 1,    hp: 0,  bombs: 0, hit: 1,   pick: 1.3, luck: 1, perk: 'サンダー装備。幸運+1、回収範囲+30%。' },
  { id: 'phoenix',  name: 'フェニックス', price: 1200, col: '#f86', weapon: 'spread', spd: 1,    atk: 1,    hp: -1, bombs: 2, hit: 1,   pick: 1,   luck: 0, perk: 'スプレッド装備。ボム+2だが最大HP-1。' },
  { id: 'void',     name: 'ヴォイド',   price: 1600, col: '#c8f', weapon: 'shot',    spd: 1,    atk: 1.25, hp: -1, bombs: 0, hit: 0.7, pick: 1,   luck: 0, perk: '被弾判定が極小(-30%)。攻撃+25%、最大HP-1。上級者向け。' },
];

// ===== ガチャで手に入る能力（毎ランに効く。重複でLvアップ、最大Lv5）=====
const RARITY = [{ n: 'N', col: '#9ab' }, { n: 'R', col: '#5cf' }, { n: 'SR', col: '#c8f' }, { n: 'SSR', col: '#fc4' }];
const REFUND = [30, 80, 150, 300];
const ABILITIES = [
  { id: 'atk',    rar: 0, name: '攻撃訓練',     icon: 'atk',    desc: '与ダメージ +3%/Lv' },
  { id: 'move',   rar: 0, name: '俊足',         icon: 'move',   desc: '移動速度 +3%/Lv' },
  { id: 'pick',   rar: 0, name: '磁石',         icon: 'pickup', desc: '回収範囲 +8%/Lv' },
  { id: 'exp',    rar: 0, name: '学習',         icon: 'exp',    desc: '経験値 +3%/Lv' },
  { id: 'rate',   rar: 1, name: '連射調整',     icon: 'rate',   desc: '連射速度 +4%/Lv' },
  { id: 'graze',  rar: 1, name: '感覚拡張',     icon: 'graze',  desc: 'グレイズ範囲 +6%/Lv' },
  { id: 'gold',   rar: 1, name: '商才',         icon: 'coin',   desc: 'ステージ報酬ゴールド +6%/Lv' },
  { id: 'inv',    rar: 1, name: '守りの加護',   icon: 'hitbox', desc: '被弾後の無敵時間 +8%/Lv' },
  { id: 'hp',     rar: 2, name: '鋼の体',       icon: 'maxhp',  desc: '最大HP +1 (Lv2,4で)' },
  { id: 'bomb',   rar: 2, name: 'ボム貯蔵',     icon: 'bomb',   desc: '初期ボム +1 (Lv1,3,5で)' },
  { id: 'luck',   rar: 2, name: '強運',         icon: 'luck',   desc: '幸運 +1 (Lv2,4で)' },
  { id: 'crit',   rar: 2, name: '会心',         icon: 'crit',   desc: '4%/Lvで ダメージ2倍' },
  { id: 'revive', rar: 3, name: '不死鳥の羽',   icon: 'revive', desc: '1ランに1度、HP0で復活（Lvで回復量UP）' },
  { id: 'start',  rar: 3, name: '開幕の祝福',   icon: 'shot',   evo: true, desc: '初期武器のLv +1 (Lv1,3,5で)' },
];

// ===== ステージ 9・10 =====
BOSSES.push(
  { name: '灼熱の炎帝', col: '#f93', hp: 6000, phases: [
    { pats: ['petal', 'fan9'], extra: ['wall', 'aimAccel'] },
    { pats: ['rain', 'accRing', 'cross'], extra: ['homing', 'laser'] },
    { pats: ['spiral5', 'split', 'wall'], extra: ['petal', 'cross'] },
    { pats: ['laser', 'fan9', 'rain'], extra: ['accRing', 'ring20'] },
    { pats: ['petal', 'spiral5', 'accRing'], extra: ['laser', 'split'] } ] },
  { name: '時の番人', col: '#9ff', hp: 6800, phases: [
    { pats: ['accRing', 'fan9'], extra: ['wall', 'homing'] },
    { pats: ['homing', 'rain', 'cross'], extra: ['petal', 'laser'] },
    { pats: ['laser', 'spiral5', 'wall'], extra: ['accRing', 'split'] },
    { pats: ['petal', 'split', 'fan9'], extra: ['rain', 'aimAccel'] },
    { pats: ['spiral5', 'spiral3', 'accRing', 'laser'], extra: ['fan9', 'cross'] },
    { pats: ['rain', 'petal', 'homing', 'wall', 'laser'], extra: ['ring20', 'accRing'] } ] },
);
MIDBOSSES.push(
  { name: '溶岩の巨兵',     col: '#f95', hp: 2800, phases: [{ pats: ['petal', 'aim5'], extra: ['xAim'] }, { pats: ['rain', 'accRing', 'wall'], extra: ['laser'] }] },
  { name: '時計仕掛けの騎士', col: '#aff', hp: 3200, phases: [{ pats: ['fan9', 'accRing'], extra: ['wall'] }, { pats: ['laser', 'homing', 'petal'], extra: ['cross'] }] },
);

// ===== 第3弾：ステージ 11〜15 / 機体 6機 / 能力 9種 =====
Object.assign(PATTERNS, {
  bloom:  { type: 'ring', ways: 24, interval: 100, speed: 1.3, rotate: 7.5, bt: 'big', col: '#f9b' },
  needle: { type: 'aim',  ways: 1,  spread: 0, interval: 9, speed: 3.8, bt: 'rice', col: '#fff' },
  sweep:  { type: 'aim',  ways: 7,  spread: 150, interval: 42, speed: 2.1, bt: 'orb', col: '#9fe' },
});
STAGES.push(
  { id: 11, name: '桜花の庭' },
  { id: 12, name: '深海の神殿' },
  { id: 13, name: '天空の城' },
  { id: 14, name: '骸骨の墓所' },
  { id: 15, name: '終焉の玉座' },
);
BOSSES.push(
  { name: '桜花の舞姫', col: '#f9b', hp: 7400, phases: [
    { pats: ['bloom', 'aim5'], extra: ['wall', 'xAim'] },
    { pats: ['petal', 'sweep'], extra: ['accRing', 'cross'] },
    { pats: ['needle', 'bloom', 'rain'], extra: ['homing', 'laser'] },
    { pats: ['spiral5', 'sweep', 'wall'], extra: ['petal', 'split'] },
    { pats: ['bloom', 'needle', 'accRing', 'cross'], extra: ['laser', 'fan9'] } ] },
  { name: '深海の海神', col: '#4be', hp: 8000, phases: [
    { pats: ['rain', 'accRing'], extra: ['wall', 'homing'] },
    { pats: ['sweep', 'spiral3', 'wall'], extra: ['bloom', 'aimAccel'] },
    { pats: ['laser', 'needle', 'cross'], extra: ['accRing', 'petal'] },
    { pats: ['bloom', 'homing', 'rain'], extra: ['laser', 'split'] },
    { pats: ['fan9', 'spiral5', 'accRing', 'wall'], extra: ['needle', 'cross'] } ] },
  { name: '天空の守護龍', col: '#cef', hp: 8800, phases: [
    { pats: ['fan9', 'sweep'], extra: ['wall', 'aimAccel'] },
    { pats: ['needle', 'petal', 'cross'], extra: ['homing', 'accRing'] },
    { pats: ['laser', 'rain', 'wall'], extra: ['bloom', 'split'] },
    { pats: ['spiral5', 'needle', 'accRing'], extra: ['laser', 'fan9'] },
    { pats: ['bloom', 'sweep', 'homing', 'wall'], extra: ['cross', 'petal'] },
    { pats: ['needle', 'laser', 'rain', 'accRing', 'fan9'], extra: ['bloom', 'spiral5'] } ] },
  { name: '骸骨の王', col: '#9c9', hp: 9600, phases: [
    { pats: ['split', 'sweep', 'wall'], extra: ['aimAccel', 'cross'] },
    { pats: ['needle', 'accRing', 'homing'], extra: ['petal', 'laser'] },
    { pats: ['bloom', 'rain', 'cross'], extra: ['fan9', 'split'] },
    { pats: ['spiral5', 'laser', 'wall', 'sweep'], extra: ['accRing', 'needle'] },
    { pats: ['bloom', 'petal', 'fan9', 'homing'], extra: ['laser', 'rain'] } ] },
  { name: '終焉の玉座', col: '#fff', hp: 11000, phases: [
    { pats: ['sweep', 'bloom', 'wall'], extra: ['accRing', 'aimAccel'] },
    { pats: ['needle', 'fan9', 'cross', 'homing'], extra: ['petal', 'laser'] },
    { pats: ['rain', 'accRing', 'split', 'wall'], extra: ['bloom', 'needle'] },
    { pats: ['spiral5', 'spiral3', 'laser', 'sweep'], extra: ['fan9', 'cross'] },
    { pats: ['bloom', 'needle', 'homing', 'wall', 'laser'], extra: ['accRing', 'rain'] },
    { pats: ['bloom', 'needle', 'fan9', 'accRing', 'rain', 'laser'], extra: ['spiral5', 'sweep'] } ] },
);
MIDBOSSES.push(
  { name: '桜の剣士',   col: '#fab', hp: 3600, phases: [{ pats: ['bloom', 'aim5'], extra: ['xAim'] }, { pats: ['petal', 'sweep', 'wall'], extra: ['accRing'] }] },
  { name: '深海の巨獣', col: '#7cf', hp: 4000, phases: [{ pats: ['rain', 'accRing'], extra: ['wall'] }, { pats: ['laser', 'sweep', 'bloom'], extra: ['homing'] }] },
  { name: '雲上の騎士', col: '#def', hp: 4400, phases: [{ pats: ['fan9', 'needle'], extra: ['wall'] }, { pats: ['homing', 'accRing', 'cross'], extra: ['petal'] }] },
  { name: '墓守の亡霊', col: '#bdb', hp: 4800, phases: [{ pats: ['split', 'sweep'], extra: ['aimAccel'] }, { pats: ['bloom', 'needle', 'wall'], extra: ['laser'] }] },
  { name: '終焉の使徒', col: '#fee', hp: 5600, phases: [{ pats: ['needle', 'fan9', 'wall'], extra: ['bloom'] }, { pats: ['accRing', 'laser', 'sweep', 'rain'], extra: ['homing'] }] },
);
SHIPS.push(
  { id: 'comet',    name: 'コメット',     price: 1800, col: '#6df', weapon: 'homing',  spd: 1.15, atk: 0.9, hp: 0,  bombs: 0, hit: 1, pick: 1,   luck: 0, rate: 1.25, perk: '連射+25%・移動+15%。攻撃は-10%。手数で押す高速機。' },
  { id: 'sage',     name: 'セージ',       price: 2000, col: '#9e6', weapon: 'orbit',   spd: 1,    atk: 0.9, hp: 0,  bombs: 0, hit: 1, pick: 1.2, luck: 0, expMul: 1.25, perk: '経験値+25%、回収範囲+20%。攻撃は-10%。育つのが早い。' },
  { id: 'merchant', name: 'マーチャント', price: 2200, col: '#fb4', weapon: 'shot',    spd: 1,    atk: 1,   hp: 0,  bombs: 1, hit: 1, pick: 1,   luck: 0, goldMul: 1.3, perk: 'ステージ報酬ゴールド+30%、ボム+1。稼ぎ向け。' },
  { id: 'reaper',   name: 'リーパー',     price: 2600, col: '#f46', weapon: 'laser',   spd: 1,    atk: 1.1, hp: -1, bombs: 0, hit: 1, pick: 1,   luck: 0, crit: 0.15, perk: '会心率+15%、攻撃+10%、最大HP-1。一撃の大きい機体。' },
  { id: 'aegis',    name: 'イージス',     price: 3000, col: '#7af', weapon: 'spread',  spd: 0.9,  atk: 1,   hp: 1,  bombs: 1, hit: 1, pick: 1,   luck: 0, inv: 1.3, perk: '最大HP+1、ボム+1、被弾後の無敵+30%。移動は-10%。' },
  { id: 'seraph',   name: 'セラフ',       price: 3600, col: '#fe9', weapon: 'thunder', spd: 1,    atk: 1,   hp: 0,  bombs: 0, hit: 1, pick: 1,   luck: 1, startP: { atk: 1, rate: 1 }, perk: '攻撃力・連射Lv1で開始、幸運+1。万能の最上位機。' },
);
ABILITIES.push(
  { id: 'rng',     rar: 0, name: '射程拡張',   icon: 'range',     desc: '射程・範囲 +3%/Lv' },
  { id: 'regen',   rar: 1, name: '応急手当',   icon: 'maxhp',     desc: 'ウェーブクリアで 20%/Lv の確率でHP+1' },
  { id: 'coin',    rar: 1, name: '小銭拾い',   icon: 'node_shop', desc: 'ラン中のコイン獲得 +8%/Lv' },
  { id: 'rer',     rar: 1, name: '再挑戦',     icon: 'count',     desc: 'リロール回数 +1 (Lv2,4で)' },
  { id: 'bombx',   rar: 2, name: '爆風強化',   icon: 'bomb',      desc: 'ボムのダメージ +20%・範囲 +10%/Lv' },
  { id: 'grazex',  rar: 2, name: '擦り名人',   icon: 'graze',     desc: 'グレイズ経験値 +15%/Lv' },
  { id: 'shield',  rar: 2, name: '守護の盾',   icon: 'shield',    desc: '開始時にバリア1枚(Lv4で2枚)。被弾を1回無効' },
  { id: 'od',      rar: 3, name: '背水の陣',   icon: 'atk',       evo: true, desc: 'HPが1のとき 攻撃+12%・連射+6%/Lv' },
  { id: 'fortune', rar: 3, name: '黄金の流星', icon: 'exp',       evo: true, desc: '経験値ジェムが 5%/Lv で3倍になる' },
);

// ===== 第4弾：レベルアップで選ぶ「能力（パッシブ）」を増やし、すべてに進化先を用意 =====
// 能力は Lv5 になり、必要な武器を Lv3 以上で持っていると、宝箱に「進化」カードが出る。進化すると Lv+3 相当になる。
Object.assign(WEAPONS.shot,    { short: 'ショット' });
Object.assign(WEAPONS.homing,  { short: 'ホーミング' });
Object.assign(WEAPONS.laser,   { short: 'レーザー' });
Object.assign(WEAPONS.orbit,   { short: 'オービット' });
Object.assign(WEAPONS.spread,  { short: 'スプレッド' });
Object.assign(WEAPONS.thunder, { short: 'サンダー' });
Object.assign(PASSIVES, {
  crit:    { name: '会心の眼',     desc: '会心率+5%/Lv(2倍)',     icon: 'crit' },
  expg:    { name: '経験値増加',   desc: '経験値 +8%/Lv',          icon: 'exp' },
  barrier: { name: '守りの結界',   desc: 'ウェーブ開始時にバリア', icon: 'shield' },
  bossdmg: { name: 'ボス特攻',     desc: 'ボスへのダメージ+10%/Lv', icon: 'sword' },
  slow:    { name: '時の砂',       desc: '敵弾の速度 -3%/Lv',      icon: 'hourglass' },
  goldp:   { name: 'コイン増加',   desc: 'コイン獲得 +10%/Lv',     icon: 'coin' },
  invp:    { name: '無敵延長',     desc: '被弾後の無敵 +10%/Lv',   icon: 'star' },
  pierce:  { name: '貫通弾',       desc: '弾が貫通(Lv2,4で+1)',    icon: 'pierce' },
  supply:  { name: 'ボム補給',     desc: 'ウェーブ開始でボム補給', icon: 'bomb' },
});
const PEVO = {
  atk:     { name: '破壊の極意',   need: 'laser',   desc: '攻撃力が大きく伸びる' },
  rate:    { name: '神速の指',     need: 'shot',    desc: '連射速度が大きく伸びる' },
  count:   { name: '千手',         need: 'spread',  desc: '弾数がさらに増える' },
  range:   { name: '遠雷の眼',     need: 'thunder', desc: '射程・範囲が大幅に拡大' },
  move:    { name: '疾風',         need: 'homing',  desc: '移動がとても速くなる' },
  pickup:  { name: '星の引力',     need: 'orbit',   desc: 'ジェムを遠くから吸う' },
  hitbox:  { name: '幻影',         need: 'shot',    desc: '被弾判定が極小になる' },
  graze:   { name: '擦り神',       need: 'orbit',   desc: 'グレイズ範囲が拡大' },
  maxhp:   { name: '不屈の心',     need: 'spread',  desc: '最大HPが大幅アップ' },
  bomb:    { name: '爆炎の王',     need: 'thunder', desc: 'ボム+3、威力も向上' },
  luck:    { name: '女神の加護',   need: 'thunder', desc: 'レアが出やすくなる' },
  crit:    { name: '必殺の眼',     need: 'laser',   desc: '会心率が大幅に上昇' },
  expg:    { name: '賢者の叡智',   need: 'orbit',   desc: '経験値が大幅に増える' },
  barrier: { name: '絶対障壁',     need: 'spread',  desc: 'バリアが何枚も張れる' },
  bossdmg: { name: '竜殺し',       need: 'laser',   desc: 'ボスに大ダメージ' },
  slow:    { name: '時の支配者',   need: 'homing',  desc: '敵弾が大きく減速する' },
  goldp:   { name: '黄金の手',     need: 'shot',    desc: 'コインが大幅に増える' },
  invp:    { name: '不滅の鎧',     need: 'orbit',   desc: '無敵時間が大幅に延びる' },
  pierce:  { name: '次元貫通',     need: 'shot',    desc: '弾が何体も貫く' },
  supply:  { name: '無限補給',     need: 'homing',  desc: 'ボムがよく補給される' },
};
