// ソダテバトル: ゲームデータ（能力・キャラ・技・トレーナー・道具）
'use strict';

const MAX_DAY = 100;          // 期限。100日目はチャンピオン戦
const STAT_CAP = 999;
const STATS = ['HP', 'ATK', 'DEF', 'MAG', 'RES', 'SPD'];
const STAT_NAME = { HP: '体力', ATK: '攻撃力', DEF: '防御力', MAG: '魔力', RES: '精神', SPD: 'すばやさ' };
const STAT_COLOR = { HP: '#5fd16b', ATK: '#ff7a59', DEF: '#6fa8ff', MAG: '#b57bff', RES: '#4fd6d0', SPD: '#ffd75e' };

const ELEM = {
  none: { n: '無', c: 0xb8b8c8, css: '#b8b8c8' },
  fire: { n: '火', c: 0xff5a2a, css: '#ff6b3d' },
  water: { n: '水', c: 0x3aa0ff, css: '#4aa8ff' },
  earth: { n: '土', c: 0xb08a4a, css: '#c29a56' },
  wind: { n: '風', c: 0x5fe08a, css: '#62e08c' },
  light: { n: '光', c: 0xffe27a, css: '#ffe27a' },
  dark: { n: '闇', c: 0x8a5ad6, css: '#9a6ae6' },
};
// 火→風→土→水→火、光⇔闇（矢印の先に強い）
const ELEM_STRONG = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };
function elemMult(a, d) {
  if (ELEM_STRONG[a] === d) return 1.5;
  if (ELEM_STRONG[d] === a) return 0.67;
  return 1;
}

// 通常攻撃のタイプ
const ATK_TYPES = {
  sword:  { name: 'ツメ型', icon: '🐲', kind: 'melee', dmg: 'physical', power: 22, cd: 0.45, range: 2.7, arc: 110, wind: 0.12, speed: 1, combo: true, desc: '爪で3連撃' },
  fist:   { name: 'ゴリパン型', icon: '🦍', kind: 'melee', dmg: 'physical', power: 12, cd: 0.24, range: 2.1, arc: 100, wind: 0.07, speed: 1.15, desc: '超近距離の高速パンチ' },
  mage:   { name: 'まほう型', icon: '🔮', kind: 'proj', dmg: 'magic', power: 24, cd: 0.7, pspeed: 17, wind: 0.15, speed: 0.92, desc: '魔法の弾を飛ばす遠距離型' },
  archer: { name: 'はばたき型', icon: '🐦', kind: 'proj', dmg: 'physical', power: 17, cd: 0.55, pspeed: 26, wind: 0.08, speed: 1.05, charge: true, shape: 'feather', desc: '羽根を飛ばす。長押しで溜め撃ち' },
  heavy:  { name: 'どっしり型', icon: '🗿', kind: 'melee', dmg: 'physical', power: 56, cd: 1.0, range: 3.1, arc: 130, wind: 0.32, speed: 0.85, armor: true, desc: '大ぶりの一撃。怯まない' },
  dual:   { name: 'ダブル型', icon: '🦊', kind: 'dual', dmg: 'physical', power: 26, cd: 0.5, range: 2.6, arc: 110, pspeed: 18, wind: 0.12, speed: 1, desc: '爪と魔法を交互に放つ' },
};

// 育成キャラ（apt = 能力ごとの伸びやすさ）
const CHARS = {
  leo: {
    name: 'ホムラ', type: 'sword', elem: 'fire', color: 0xd9533a, starter: true,
    desc: '炎をまとった小さなドラゴン。攻撃と体力が伸びやすいバランス型。',
    start: { HP: 40, ATK: 50, DEF: 30, MAG: 15, RES: 25, SPD: 35 },
    apt: { HP: 1.2, ATK: 1.3, DEF: 1.0, MAG: 0.7, RES: 0.9, SPD: 1.0 },
  },
  miruru: {
    name: 'ミルル', type: 'mage', elem: 'water', color: 0x3f7fd9, starter: true,
    desc: 'ふわふわ浮かぶ水のクラゲ。魔力と精神が伸びやすく、遠くから魔法を撃つ。',
    start: { HP: 30, ATK: 15, DEF: 20, MAG: 55, RES: 40, SPD: 35 },
    apt: { HP: 0.9, ATK: 0.7, DEF: 0.8, MAG: 1.4, RES: 1.3, SPD: 1.0 },
  },
  gantetsu: {
    name: 'ガンテツ', type: 'heavy', elem: 'earth', color: 0x9a7a45, starter: true,
    desc: '岩でできたゴーレム。防御と体力が高いが足は遅い。',
    start: { HP: 55, ATK: 40, DEF: 50, MAG: 10, RES: 25, SPD: 20 },
    apt: { HP: 1.3, ATK: 1.1, DEF: 1.4, MAG: 0.6, RES: 1.0, SPD: 0.7 },
  },
  shizuku: {
    name: 'シズク', type: 'archer', elem: 'wind', color: 0x45b86a,
    desc: '風をまとう小鳥。すばやさが高く、羽根の溜め撃ちが強力。（クリア後に解放）',
    start: { HP: 28, ATK: 42, DEF: 20, MAG: 25, RES: 28, SPD: 55 },
    apt: { HP: 0.8, ATK: 1.2, DEF: 0.8, MAG: 1.0, RES: 1.0, SPD: 1.4 },
  },
  ruina: {
    name: 'ルイナ', type: 'dual', elem: 'light', color: 0xe8c64a,
    desc: '光と闇、二本の尾を持つ子ギツネ。爪も魔法も使える上級者向け。（クリア後に解放）',
    start: { HP: 35, ATK: 38, DEF: 22, MAG: 38, RES: 28, SPD: 36 },
    apt: { HP: 1.0, ATK: 1.15, DEF: 0.8, MAG: 1.15, RES: 1.0, SPD: 1.0 },
  },
};

// 技。learn=習得に必要な能力値、users=覚えられるキャラ
const SKILLS = [
  // 剣士・共通系
  { id: 'spin_slash', name: '回転ひっかき', type: 'physical', elem: 'none', power: 50, ct: 3, range: 'circle', r: 3.4, delay: 0.15, learn: { ATK: 30 }, users: ['leo', 'ruina', 'gantetsu'], desc: 'くるっと回って周囲をひっかく' },
  { id: 'dash_slash', name: 'とっしんクロー', type: 'move', elem: 'none', power: 55, ct: 4, range: 'dash', dist: 6.5, learn: { ATK: 70 }, users: ['leo', 'ruina'], desc: '一気に踏み込んで爪で切り裂く' },
  { id: 'fire_edge', name: 'ほのおの爪', type: 'physical', elem: 'fire', power: 78, ct: 5, range: 'melee', reach: 3.8, arc: 120, learn: { ATK: 130 }, users: ['leo'], desc: '炎をまとった爪の一撃' },
  { id: 'fireball', name: 'ファイアボール', type: 'magic', elem: 'fire', power: 62, ct: 4, range: 'line', speed: 15, learn: { MAG: 40 }, users: ['leo'], desc: '火の玉を飛ばす' },
  { id: 'flame_pillar', name: '業火の柱', type: 'magic', elem: 'fire', power: 115, ct: 8, range: 'circle', at: 'target', r: 4.2, delay: 0.9, learn: { MAG: 260 }, users: ['leo'], desc: '相手の足もとに炎の柱を立てる' },
  { id: 'great_cleave', name: '大つめ割り', type: 'physical', elem: 'none', power: 125, ct: 8, range: 'melee', reach: 4.5, arc: 140, stun: 0.5, delay: 0.35, learn: { ATK: 330 }, users: ['leo', 'gantetsu'], desc: '大きく振りかぶる強烈な爪' },
  { id: 'power_up', name: '気合', type: 'support', elem: 'none', ct: 14, range: 'self', fx: 'atk', dur: 8, learn: { ATK: 100 }, users: ['leo', 'gantetsu', 'shizuku', 'ruina'], desc: '8秒間、与えるダメージ1.4倍' },
  { id: 'heal', name: 'ヒール', type: 'heal', elem: 'light', ct: 15, range: 'self', pct: 0.3, learn: { MAG: 110 }, users: ['leo', 'miruru', 'ruina'], desc: '最大HPの30%回復' },
  { id: 'barrier', name: 'バリア', type: 'support', elem: 'none', ct: 14, range: 'self', fx: 'def', dur: 5, learn: { RES: 90 }, users: ['leo', 'miruru', 'gantetsu', 'shizuku', 'ruina'], desc: '5秒間、受けるダメージ半減' },
  // 魔導
  { id: 'aqua_lance', shape: 'spear', name: 'アクアランス', type: 'magic', elem: 'water', power: 66, ct: 4, range: 'line', speed: 19, learn: { MAG: 30 }, users: ['miruru', 'ruina'], desc: '水の槍をまっすぐ飛ばす' },
  { id: 'frost_ring', vfx: 'spikes', name: '凍てつく波', type: 'magic', elem: 'water', power: 60, ct: 6, range: 'circle', r: 4.8, delay: 0.2, slow: 3, learn: { MAG: 140 }, users: ['miruru'], desc: '周囲を凍らせ動きを鈍らせる' },
  { id: 'thunder', shape: 'spear', name: 'サンダー', type: 'magic', elem: 'wind', power: 95, ct: 5, range: 'line', speed: 32, learn: { MAG: 200 }, users: ['miruru', 'shizuku'], desc: '目にも止まらぬ雷' },
  { id: 'teleport', name: 'テレポート', type: 'move', elem: 'none', power: 0, ct: 7, range: 'tele', learn: { MAG: 90 }, users: ['miruru', 'ruina'], desc: '相手の背後（反対側）へ瞬間移動' },
  { id: 'meteor', name: 'メテオ', type: 'magic', elem: 'fire', power: 155, ct: 12, range: 'circle', at: 'target', r: 4.6, delay: 1.1, learn: { MAG: 450 }, users: ['miruru'], desc: '空から巨大な火の玉を落とす' },
  // 重戦
  { id: 'quake', vfx: 'spikes', name: '地ならし', type: 'physical', elem: 'earth', power: 72, ct: 5, range: 'circle', r: 4, delay: 0.25, learn: { ATK: 40 }, users: ['gantetsu'], desc: '地面を叩いて衝撃波を出す' },
  { id: 'shield_bash', name: 'ロックタックル', type: 'move', elem: 'none', power: 62, ct: 4, range: 'dash', dist: 5, stun: 0.6, learn: { ATK: 50, DEF: 60 }, users: ['gantetsu'], desc: '体当たりで相手をひるませる' },
  { id: 'stone_shot', shape: 'spike', name: 'ストーンバレット', type: 'magic', elem: 'earth', power: 56, ct: 4, range: 'line', speed: 16, learn: { MAG: 50 }, users: ['gantetsu'], desc: '岩の弾を飛ばす' },
  { id: 'iron_wall', name: '鉄壁', type: 'support', elem: 'earth', ct: 16, range: 'self', fx: 'def', dur: 7, learn: { DEF: 200 }, users: ['gantetsu', 'leo'], desc: '7秒間、受けるダメージ半減' },
  { id: 'boulder', name: '大岩投げ', type: 'physical', elem: 'earth', power: 108, ct: 8, range: 'line', speed: 10, size: 1.3, learn: { ATK: 300 }, users: ['gantetsu'], desc: '大きな岩をゆっくり投げつける' },
  // 弓手
  { id: 'triple_shot', shape: 'feather', name: '羽根三連', type: 'physical', elem: 'wind', power: 28, ct: 4, range: 'line', speed: 28, n: 3, spread: 0.2, learn: { ATK: 40 }, users: ['shizuku'], desc: '扇状に羽根を3枚飛ばす' },
  { id: 'wind_blade', shape: 'crescent', name: '風刃', type: 'magic', elem: 'wind', power: 64, ct: 4, range: 'line', speed: 24, learn: { MAG: 50 }, users: ['shizuku', 'ruina'], desc: '風の刃を飛ばす' },
  { id: 'back_shot', name: 'バックフェザー', type: 'move', elem: 'wind', power: 48, ct: 5, range: 'dash', dir: 'back', dist: 5, then: 'shot', learn: { SPD: 80 }, users: ['shizuku'], desc: '後ろへ跳びながら羽根を飛ばす' },
  { id: 'tailwind', name: '追い風', type: 'support', elem: 'wind', ct: 14, range: 'self', fx: 'spd', dur: 8, learn: { SPD: 150 }, users: ['shizuku', 'leo'], desc: '8秒間、移動速度1.4倍' },
  { id: 'pierce_arrow', shape: 'spear', name: 'つらぬく羽根', type: 'physical', elem: 'wind', power: 112, ct: 7, range: 'line', speed: 36, pierce: true, learn: { ATK: 260 }, users: ['shizuku'], desc: '鋭い羽根で撃ち抜く' },
  // 双刃
  { id: 'light_ray', shape: 'spear', name: 'ライトレイ', type: 'magic', elem: 'light', power: 64, ct: 4, range: 'line', speed: 24, learn: { MAG: 40 }, users: ['ruina'], desc: '光の筋を放つ' },
  { id: 'dark_slash', name: 'やみの爪', type: 'physical', elem: 'dark', power: 64, ct: 4, range: 'melee', reach: 3.4, arc: 110, learn: { ATK: 45 }, users: ['ruina'], desc: '闇をまとった爪' },
  { id: 'shadow_step', name: '影渡り', type: 'move', elem: 'dark', power: 56, ct: 5, range: 'dash', dist: 7.5, learn: { ATK: 90 }, users: ['ruina'], desc: '影のように一瞬で駆け抜ける' },
  { id: 'holy_prayer', name: '聖なる祈り', type: 'heal', elem: 'light', ct: 15, range: 'self', pct: 0.35, learn: { RES: 140 }, users: ['ruina', 'miruru'], desc: '最大HPの35%回復' },
  { id: 'dual_burst', vfx: 'spears', name: '双極破', type: 'magic', elem: 'light', power: 138, ct: 9, range: 'circle', r: 4.6, delay: 0.3, learn: { MAG: 260, ATK: 200 }, users: ['ruina'], desc: '光と闇が弾ける大爆発' },
  // 必殺（ゲージ満タンで1回）
  { id: 'ult_leo', name: 'ドラゴンフレア', type: 'physical', elem: 'fire', power: 175, range: 'circle', r: 6, delay: 0.4, ult: true, users: ['leo'], desc: '【必殺】炎の息で周囲を焼き払う' },
  { id: 'ult_miruru', vfx: 'spears', name: '大海嘯', type: 'magic', elem: 'water', power: 185, range: 'circle', r: 8, delay: 0.5, slow: 3, ult: true, users: ['miruru'], desc: '【必殺】巨大な津波が押し寄せる' },
  { id: 'ult_gantetsu', vfx: 'spikes', name: '大地割り', type: 'physical', elem: 'earth', power: 200, range: 'circle', r: 6.5, delay: 0.5, stun: 0.8, ult: true, users: ['gantetsu'], desc: '【必殺】大地を砕く渾身の一撃' },
  { id: 'ult_shizuku', shape: 'feather', name: '疾風の羽根嵐', type: 'physical', elem: 'wind', power: 52, range: 'line', speed: 38, n: 5, spread: 0.1, pierce: true, ult: true, users: ['shizuku'], desc: '【必殺】貫通する羽根を5枚放つ' },
  { id: 'ult_ruina', vfx: 'spears', name: '終焉の光', type: 'magic', elem: 'light', power: 190, range: 'circle', r: 7, delay: 0.5, ult: true, users: ['ruina'], desc: '【必殺】世界を白く染める光' },
];
const SKILL_BY_ID = {};
SKILLS.forEach(s => { SKILL_BY_ID[s.id] = s; });

function learnText(sk) {
  const ks = Object.keys(sk.learn || {});
  return ks.length ? ks.map(k => STAT_NAME[k] + ' ' + sk.learn[k]).join(' & ') + ' で習得' : '';
}
function canLearn(sk, stats) {
  return !sk.ult && Object.keys(sk.learn).every(k => stats[k] >= sk.learn[k]);
}

// トレーニング
const TRAINING = {
  strength: { name: 'パワー特訓', icon: '💪', main: 'ATK', sub: 'HP', cost: 20 },
  shield:   { name: 'がまん特訓', icon: '🛡️', main: 'DEF', sub: 'HP', cost: 20 },
  meditate: { name: '瞑想', icon: '🧘', main: 'MAG', sub: 'RES', cost: 15 },
  run:      { name: '持久走', icon: '🏃', main: 'HP', sub: 'SPD', cost: 25 },
  pray:     { name: '祈り', icon: '🙏', main: 'RES', sub: 'MAG', cost: 15 },
  dash:     { name: 'ダッシュ', icon: '⚡', main: 'SPD', sub: 'ATK', cost: 20 },
};
const TRAIN_MAIN = 10, TRAIN_SUB = 4;
const MOODS = [
  { n: '不調', mul: 0.7, icon: '😵' },
  { n: 'やや不調', mul: 0.85, icon: '😟' },
  { n: 'ふつう', mul: 1, icon: '🙂' },
  { n: '好調', mul: 1.2, icon: '😄' },
  { n: '絶好調', mul: 1.4, icon: '🔥' },
];

// ショップ（req = 解放されているエリア数）
const ITEMS = [
  { id: 'dumbbell', name: '鉄アレイ', icon: '🏋️', kind: 'perm', train: { strength: 0.2 }, price: 150, req: 1, desc: 'パワー特訓の上昇量 +20%' },
  { id: 'shield_i', name: 'どっしり岩', icon: '🪨', kind: 'perm', train: { shield: 0.2 }, price: 150, req: 1, desc: 'がまん特訓の上昇量 +20%' },
  { id: 'grimoire', name: 'まほうの石板', icon: '📖', kind: 'perm', train: { meditate: 0.2 }, price: 150, req: 1, desc: '瞑想の上昇量 +20%' },
  { id: 'rosary', name: 'おまもり石', icon: '📿', kind: 'perm', train: { pray: 0.2 }, price: 150, req: 1, desc: '祈りの上昇量 +20%' },
  { id: 'shoes', name: 'ランニングシューズ', icon: '👟', kind: 'perm', train: { run: 0.15, dash: 0.15 }, price: 200, req: 1, desc: '持久走・ダッシュ +15%' },
  { id: 'protein', name: 'プロテイン', icon: '🥛', kind: 'cons', price: 80, req: 1, desc: '次のトレーニング1回の上昇量が2倍' },
  { id: 'drink', name: '元気ドリンク', icon: '🧃', kind: 'cons', price: 60, req: 1, desc: 'スタミナ +50' },
  { id: 'snack', name: 'ごきげんおやつ', icon: '🍰', kind: 'cons', price: 100, req: 1, desc: '調子が1段階アップ' },
  { id: 'machine', name: 'トレーニングマシン', icon: '🏗️', kind: 'facility', price: 2000, req: 2, desc: 'トレーニング回数が増える（1日 +1回。10日モードは +3回）' },
  { id: 'gold_dumbbell', name: '黄金のダンベル', icon: '🥇', kind: 'perm', train: { strength: 0.5 }, price: 1200, req: 3, desc: 'パワー特訓 +50%（鉄アレイと重ならない）' },
  { id: 'steel_shield', name: 'かたい大岩', icon: '🔰', kind: 'perm', train: { shield: 0.5 }, price: 1200, req: 3, desc: 'がまん特訓 +50%' },
  { id: 'ancient_tome', name: '古代の石板', icon: '📚', kind: 'perm', train: { meditate: 0.5 }, price: 1200, req: 3, desc: '瞑想 +50%' },
  { id: 'holy_rosary', name: '聖なるおまもり', icon: '✨', kind: 'perm', train: { pray: 0.5 }, price: 1200, req: 3, desc: '祈り +50%' },
  { id: 'wing_shoes', name: '翼のくつ', icon: '🪽', kind: 'perm', train: { run: 0.4, dash: 0.4 }, price: 1500, req: 4, desc: '持久走・ダッシュ +40%' },
  { id: 'scroll', name: '技の巻物', icon: '📜', kind: 'cons', price: 500, req: 3, desc: '条件に届いていない技を1つ習得' },
];

// エリアとトレーナー
const AREAS = [
  { name: 'はじまりの草原', theme: { bg: 0x9fd8ff, floor: 0x5c9a52, rim: 0x3d6e36 }, rank: 'G〜F' },
  { name: '炎の火山', theme: { bg: 0x4a1d18, floor: 0x5a3a32, rim: 0xff5a2a }, rank: 'E〜D' },
  { name: '水晶の湖', theme: { bg: 0x1d3a58, floor: 0x3d6f93, rim: 0x9fe7ff }, rank: 'D〜C' },
  { name: '嵐の峡谷', theme: { bg: 0x6b7f90, floor: 0x7d7468, rim: 0x5fe08a }, rank: 'C〜B' },
  { name: '星の神殿', theme: { bg: 0x1a1233, floor: 0x4b4470, rim: 0xffe27a }, rank: 'B〜A' },
  { name: 'チャンピオンの塔', theme: { bg: 0x0d0d14, floor: 0x2d2d3c, rim: 0xe05a5a }, rank: 'S' },
];
// ai: rush=攻め続ける / careful=距離を取る / counter=ガードが多い
const TRAINERS = [
  { id: 'tom', name: 'ヒノトカゲ', area: 0, type: 'sword', elem: 'fire', total: 300, ai: 'rush', tp: 60, line: 'ガウッ！ ガウッ！' },
  { id: 'rika', name: 'ハネピヨ', area: 0, type: 'archer', elem: 'wind', total: 330, ai: 'careful', tp: 70, line: 'ピヨヨッ！ とんでけー！' },
  { id: 'bob', name: 'ゴリポン', area: 0, type: 'fist', elem: 'none', total: 370, ai: 'rush', tp: 80, line: 'ウホッ！ ウホホッ！' },
  { id: 'marco', name: '草原のぬしイワゴロン', area: 0, type: 'heavy', elem: 'earth', total: 450, ai: 'counter', tp: 160, boss: true, line: 'ゴゴゴ……ここは とおさない。' },

  { id: 'gou', name: 'マグマゴーレム', area: 1, type: 'heavy', elem: 'fire', total: 800, ai: 'counter', tp: 130, line: 'ボォォ……あつい、あつい！' },
  { id: 'beni', name: 'ほのおリザード', area: 1, type: 'sword', elem: 'fire', total: 860, ai: 'rush', tp: 150, line: 'シャーッ！ やけどするぜ！' },
  { id: 'hino', name: 'ヒノクラゲ', area: 1, type: 'mage', elem: 'fire', total: 900, ai: 'careful', tp: 170, line: 'ぷかぷか……もえろー！' },
  { id: 'zagu', name: '溶岩王ラヴァゴーレム', area: 1, type: 'heavy', elem: 'fire', total: 1050, ai: 'rush', tp: 300, boss: true, line: 'グオオオ！ やまを くだく！' },

  { id: 'sera', name: 'ミズクラゲ', area: 2, type: 'mage', elem: 'water', total: 1300, ai: 'careful', tp: 220, line: 'ぷるん！ みずでっぽう！' },
  { id: 'mizuki', name: 'アクアペリカ', area: 2, type: 'archer', elem: 'water', total: 1370, ai: 'rush', tp: 240, line: 'ペリー！ みずを くらえー！' },
  { id: 'kouri', name: 'こおりギツネ', area: 2, type: 'dual', elem: 'water', total: 1450, ai: 'counter', tp: 270, line: 'コン……こおらせて あげる。' },
  { id: 'nereid', name: '湖のぬしネレイド', area: 2, type: 'mage', elem: 'water', total: 1700, ai: 'careful', tp: 420, boss: true, line: 'ぷかり……みずは ぜんぶ しっている。' },

  { id: 'hayate', name: 'カゼタカ', area: 3, type: 'archer', elem: 'wind', total: 1950, ai: 'rush', tp: 330, line: 'ピィーッ！ かぜより はやく！' },
  { id: 'shu', name: 'ツムジゴリラ', area: 3, type: 'fist', elem: 'wind', total: 2000, ai: 'rush', tp: 350, line: 'ウホォッ！ みえるかー！' },
  { id: 'garudo', name: 'ガレキリザード', area: 3, type: 'sword', elem: 'earth', total: 2100, ai: 'counter', tp: 380, line: 'グルル……あらしでも うごかん。' },
  { id: 'geil', name: '嵐の長ゲイル', area: 3, type: 'dual', elem: 'wind', total: 2400, ai: 'careful', tp: 560, boss: true, line: 'コォン！ かぜは とめられぬ！' },

  { id: 'aru', name: 'ヒカリギツネ アル', area: 4, type: 'dual', elem: 'light', total: 2500, ai: 'rush', tp: 430, line: 'コン！ エルと いっしょなら まけない！' },
  { id: 'eru', name: 'ヤミギツネ エル', area: 4, type: 'dual', elem: 'dark', total: 2550, ai: 'careful', tp: 440, line: 'コォン……アルと いっしょなら……。' },
  { id: 'yomi', name: 'やみクラゲ ヨミ', area: 4, type: 'mage', elem: 'dark', total: 2700, ai: 'careful', tp: 480, line: 'ふわり……ほしが きみを こばんでいる。' },
  { id: 'daishinkan', name: '星獣ステラ', area: 4, type: 'dual', elem: 'light', total: 3000, ai: 'counter', tp: 700, boss: true, line: 'ルルル……うんめいは きまっている。' },

  { id: 'regulus', name: '王者ドラゴン レグルス', area: 5, type: 'sword', elem: 'light', total: 3800, ai: 'counter', tp: 1000, boss: true, champion: true, line: 'グオォォォ！ ぜんりょくで こい！' },
];
const TRAINER_BY_ID = {};
TRAINERS.forEach(t => { TRAINER_BY_ID[t.id] = t; });

// タイプ別の能力配分（HP, ATK, DEF, MAG, RES, SPD）
const TYPE_PROFILE = {
  sword: [1.2, 1.6, 1.0, 0.4, 0.8, 1.0],
  fist: [1.1, 1.4, 0.8, 0.3, 0.7, 1.6],
  mage: [1.0, 0.3, 0.7, 1.8, 1.3, 0.9],
  archer: [0.8, 1.3, 0.7, 0.5, 0.8, 1.7],
  heavy: [1.5, 1.4, 1.7, 0.3, 0.9, 0.4],
  dual: [1.0, 1.2, 0.9, 1.2, 0.9, 1.0],
};
const TYPE_REP = { sword: 'leo', fist: 'leo', mage: 'miruru', archer: 'shizuku', heavy: 'gantetsu', dual: 'ruina' };

function statsFromTotal(type, total) {
  const w = TYPE_PROFILE[type], sum = w.reduce((a, b) => a + b, 0), o = {};
  STATS.forEach((k, i) => { o[k] = Math.max(5, Math.min(STAT_CAP, Math.round(total * w[i] / sum))); });
  return o;
}
function totalOf(stats) { return STATS.reduce((a, k) => a + stats[k], 0); }
function rankOf(total) {
  const t = [[400, 'G'], [700, 'F'], [1000, 'E'], [1400, 'D'], [1800, 'C'], [2300, 'B'], [2900, 'A']];
  for (const [lim, r] of t) if (total < lim) return r;
  return 'S';
}
// 敵が使う技: 習得条件を満たす攻撃技のうち威力が高い順に3つ
function trainerSkills(type, stats) {
  const rep = TYPE_REP[type];
  return SKILLS.filter(s => !s.ult && s.users.includes(rep) && (s.type === 'physical' || s.type === 'magic' || s.type === 'move') && s.power > 0 && canLearn(s, stats))
    .sort((a, b) => b.power - a.power).slice(0, 3).map(s => s.id);
}
