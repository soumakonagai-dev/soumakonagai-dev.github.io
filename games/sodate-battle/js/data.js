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
  { id: 'teleport', name: 'テレポート', type: 'move', elem: 'none', power: 0, ct: 7, range: 'tele', learn: { MAG: 90 }, users: ['leo', 'miruru', 'gantetsu', 'shizuku', 'ruina'], desc: '相手の背後（反対側）へ瞬間移動' },
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
  return ks.length ? ks.map(k => STAT_NAME[k] + ' ' + sk.learn[k]).join(sk.any ? ' または ' : ' & ') + ' で習得' : '';
}
function canLearn(sk, stats) {
  const ks = Object.keys(sk.learn);
  return !sk.ult && (sk.any ? ks.some(k => stats[k] >= sk.learn[k]) : ks.every(k => stats[k] >= sk.learn[k]));
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
const TRAIN_MAIN = 12, TRAIN_SUB = 5;
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
  return SKILLS.filter(s => !s.ult && !s.equipDep && s.users.includes(rep) && (s.type === 'physical' || s.type === 'magic' || s.type === 'move') && s.power > 0 && canLearn(s, stats))
    .sort((a, b) => b.power - a.power).slice(0, 3).map(s => s.id);
}

// ---------- 敵だけが使う技（プレイヤーは覚えられない）----------
// pat = 動きの種類（battle.js の runPattern）。elem:'self' は、使う敵自身の属性になる。
// rng = 敵がこの技を使う距離の範囲。big = 強い技（前ぶりあり）。
const ENEMY_SKILLS = [
  { id: 'e_claw_rush', name: '連続ひっかき', type: 'physical', elem: 'none', power: 26, ct: 5, pat: 'rush', n: 3, dist: 4.5, rng: [2.5, 10], users: ['sword', 'fist', 'dual', 'heavy'], minArea: 0 },
  { id: 'e_pounce', name: 'とびかかり', type: 'physical', elem: 'none', power: 62, ct: 6, pat: 'leap', r: 2.6, rng: [3, 12], users: ['sword', 'dual', 'fist', 'heavy'], minArea: 0 },
  { id: 'e_combo_bite', name: 'かみつき連打', type: 'physical', elem: 'none', power: 30, ct: 6, pat: 'combo', reach: 3.4, arc: 110, rng: [0, 3.6], users: ['sword', 'fist', 'dual', 'heavy'], minArea: 0 },
  { id: 'e_tail_whip', name: 'しっぽ薙ぎ', type: 'physical', elem: 'none', power: 48, ct: 6, range: 'circle', r: 3.8, delay: 0.25, rng: [0, 4.5], users: ['sword', 'dual'], minArea: 0 },
  { id: 'e_stomp', name: 'ふみつけ', type: 'physical', elem: 'earth', power: 50, ct: 6, range: 'circle', r: 3.4, delay: 0.3, users: ['heavy', 'fist'], minArea: 0 },
  { id: 'e_kamaitachi', name: 'かまいたち', type: 'physical', elem: 'wind', power: 54, ct: 6, range: 'line', speed: 24, size: 0.9, shape: 'crescent', users: ['archer', 'dual', 'sword'], minArea: 0 },
  { id: 'e_hidama', name: 'ひだま', type: 'magic', elem: 'self', power: 36, ct: 6, pat: 'homing', speed: 9, turn: 1.4, rng: [3, 16], users: ['mage'], minArea: 0 },
  { id: 'e_barrage', name: '連弾', type: 'magic', elem: 'self', power: 24, ct: 7, pat: 'barrage', n: 6, rng: [4, 16], users: ['mage', 'archer', 'dual'], minArea: 0 },
  { id: 'e_feather_rain', name: '羽根の雨', type: 'physical', elem: 'wind', power: 52, ct: 8, pat: 'scatter', n: 6, spread: 5, stagger: 0.25, delay: 0.7, r: 2.0, sky: true, rng: [0, 14], users: ['archer'], minArea: 0 },
  { id: 'e_wave', name: '衝撃波', type: 'physical', elem: 'earth', power: 66, ct: 7, pat: 'wave', speed: 9, size: 2.2, rng: [4, 14], users: ['heavy', 'fist', 'sword'], minArea: 1 },
  { id: 'e_homing', name: 'ホーミングボール', type: 'magic', elem: 'self', power: 52, ct: 8, pat: 'homing', speed: 8, turn: 2.2, rng: [3, 16], users: ['mage', 'dual', 'archer'], minArea: 1 },
  { id: 'e_fire_pillars', name: '連続柱', type: 'magic', elem: 'self', power: 52, ct: 9, pat: 'chain', n: 5, r: 2.1, rng: [3, 14], users: ['mage', 'sword', 'dual'], minArea: 1 },
  { id: 'e_poison_pool', name: 'どくの沼', type: 'magic', elem: 'dark', power: 14, ct: 12, pat: 'pool', r: 3.4, dur: 6, rng: [0, 12], users: ['mage', 'dual', 'archer', 'fist'], minArea: 1 },
  { id: 'e_drain', name: 'いのち吸い', type: 'magic', elem: 'dark', power: 58, ct: 9, pat: 'drain', reach: 3.4, arc: 120, rng: [0, 3.8], users: ['dual', 'fist', 'mage'], minArea: 1 },
  { id: 'e_bolts', name: '雷の連撃', type: 'magic', elem: 'wind', power: 50, ct: 10, pat: 'bolts', n: 5, r: 1.9, rng: [0, 14], users: ['mage', 'archer'], minArea: 1 },
  { id: 'e_mines', name: '地雷', type: 'physical', elem: 'earth', power: 58, ct: 11, pat: 'scatter', n: 4, spread: 4.5, stagger: 0.1, delay: 1.7, r: 2.4, rng: [0, 12], users: ['heavy', 'sword', 'fist'], minArea: 1 },
  { id: 'e_rage', name: '怒り', type: 'support', elem: 'none', power: 0, ct: 20, pat: 'enrage', rng: [0, 12], users: ['heavy', 'fist', 'sword'], minArea: 1 },
  { id: 'e_shell', name: '守りの殻', type: 'support', elem: 'earth', power: 0, ct: 18, pat: 'shield', rng: [0, 14], users: ['heavy', 'mage', 'archer'], minArea: 1 },
  { id: 'e_roar_blast', name: '咆哮衝撃', type: 'physical', elem: 'none', power: 55, ct: 9, range: 'circle', r: 6, delay: 0.35, kb: 4, rng: [0, 6], users: ['heavy', 'fist', 'sword', 'dual'], minArea: 1 },
  { id: 'e_tornado', name: '竜巻', type: 'magic', elem: 'wind', power: 16, ct: 12, pat: 'tornado', r: 2.2, dur: 4.5, rng: [3, 13], users: ['archer', 'mage', 'sword'], minArea: 2 },
  { id: 'e_spin', name: '大回転', type: 'physical', elem: 'none', power: 42, ct: 10, pat: 'spin', r: 3.4, dur: 1.5, rng: [0, 9], users: ['sword', 'heavy', 'fist'], minArea: 2 },
  { id: 'e_cross', name: '十字の波', type: 'physical', elem: 'self', power: 58, ct: 10, pat: 'cross', rng: [0, 12], users: ['heavy', 'fist', 'sword'], minArea: 2 },
  { id: 'e_curse', name: '呪いの弾', type: 'magic', elem: 'dark', power: 40, ct: 10, pat: 'curse', speed: 11, rng: [3, 15], users: ['mage', 'dual'], minArea: 2 },
  { id: 'e_dive', name: '急降下', type: 'physical', elem: 'self', power: 92, ct: 11, pat: 'leap', r: 3.6, rng: [3, 12], big: true, users: ['archer', 'sword', 'dual'], minArea: 2 },
  { id: 'e_rockfall', name: '落石', type: 'physical', elem: 'earth', power: 66, ct: 11, pat: 'scatter', n: 6, spread: 5.5, stagger: 0.22, delay: 0.9, r: 2.3, sky: true, rng: [0, 13], users: ['heavy', 'fist'], minArea: 2 },
  { id: 'e_frost_nova', name: '氷結の波', type: 'magic', elem: 'water', power: 62, ct: 10, range: 'circle', r: 6, delay: 0.4, slow: 3, rng: [0, 6], users: ['mage'], minArea: 2 },
  { id: 'e_gravity', name: '重力の渦', type: 'magic', elem: 'dark', power: 88, ct: 12, pat: 'pull', r: 3.6, dur: 1.2, rng: [2, 10], big: true, users: ['mage', 'heavy', 'dual'], minArea: 2 },
  { id: 'e_beam', name: 'ビーム', type: 'magic', elem: 'self', power: 22, ct: 13, pat: 'beam', dur: 1.6, len: 22, width: 1.5, turn: 0.9, rng: [3, 14], big: true, users: ['mage', 'dual'], minArea: 2 },
  { id: 'e_shadow_strike', name: '影の強襲', type: 'physical', elem: 'dark', power: 95, ct: 11, pat: 'tele_strike', dist: 6, reach: 3.6, arc: 150, rng: [3, 14], big: true, users: ['dual', 'sword', 'archer'], minArea: 3 },
  { id: 'e_meteor_shower', name: '流星群', type: 'magic', elem: 'fire', power: 70, ct: 14, pat: 'scatter', n: 8, spread: 6, stagger: 0.22, delay: 0.8, r: 2.6, sky: true, rng: [0, 14], big: true, users: ['mage'], minArea: 3 },
  { id: 'e_ice_bind', name: '氷の鎖', type: 'magic', elem: 'water', power: 36, ct: 11, pat: 'scatter', n: 1, spread: 0, stagger: 0, delay: 0.7, r: 2.4, stun: 0.9, rng: [0, 12], users: ['mage'], minArea: 3 },
  { id: 'e_decoy', name: '分身爆弾', type: 'physical', elem: 'self', power: 62, ct: 13, pat: 'decoy', n: 3, r: 2.4, rng: [1, 10], big: true, users: ['dual', 'sword'], minArea: 3 },
  { id: 'e_pillar_ring', name: '光柱の輪', type: 'magic', elem: 'light', power: 64, ct: 14, pat: 'scatter', ring: true, n: 8, spread: 5.5, stagger: 0.12, delay: 0.85, r: 2.2, sky: true, rng: [0, 14], big: true, users: ['dual', 'mage'], minArea: 4 },
  { id: 'e_flurry', name: '瞬影連斬', type: 'physical', elem: 'dark', power: 72, ct: 15, pat: 'flurry', n: 3, reach: 3.6, arc: 130, rng: [3, 14], big: true, users: ['dual', 'sword'], minArea: 4 },
];
ENEMY_SKILLS.forEach(s => { SKILL_BY_ID[s.id] = s; });

// 敵の技の組み合わせ：基本の攻撃技2つ ＋ 敵専用の技（エリアが進むほど増える）。同じ敵は、いつも同じ組み合わせ。
function enemySkillIds(e, stats) {
  const base = trainerSkills(e.type, stats).slice(0, 2);
  let h = 7; const key = e.id || String(Math.random());
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const pool = ENEMY_SKILLS.filter(s => s.users.includes(e.type) && s.minArea <= e.area);
  const want = Math.min(pool.length, 2 + e.area + (e.boss ? 2 : 0) + (e.champion ? 2 : 0));
  const picked = [];
  const bigs = pool.filter(s => s.big);
  if (bigs.length && e.area >= 2) picked.push(bigs[Math.floor(rnd() * bigs.length)]);
  const rest = pool.filter(s => !picked.includes(s));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  while (picked.length < want && rest.length) picked.push(rest.shift());
  return base.concat(picked.map(s => s.id));
}

// ---------- 装備（TPで買って、装備画面でつける）----------
const EQUIP_SLOTS = { weapon: '武器', armor: '防具', acc: 'アクセサリー' };
const PLAYER_POW = 1.3;     // こちらの技の威力の倍率
const PLAYER_NORM = 1.2;    // こちらの通常攻撃の倍率
const PLAYER_HP = 1.3;      // こちらの最大体力の倍率
const EQUIPS = [];
(() => {
  const add = (id, name, icon, slot, bonus, price, req, elem) => EQUIPS.push({ id, name, icon, kind: 'equip', slot, bonus, price, req, elem: elem || null });
  // 武器（属性つきは、通常攻撃と「属性の技」の属性が変わる）
  add('w_fang', '鋭い牙', '🦷', 'weapon', { ATK: 20 }, 120, 1);
  const el = [
    ['fire', '炎のきば', '🔥', { ATK: 28 }, 1], ['water', '水のきば', '💧', { MAG: 32 }, 1], ['earth', '岩のつの', '🪨', { ATK: 22, DEF: 14 }, 1],
    ['wind', '風の羽かざり', '🍃', { ATK: 20, SPD: 24 }, 1], ['light', '光のつの', '✨', { MAG: 28, RES: 16 }, 2], ['dark', '闇のきば', '🌑', { ATK: 24, MAG: 24 }, 2],
  ];
  el.forEach(([e, n, ic, b, req]) => add('w_' + e, n, ic, 'weapon', b, req > 1 ? 440 : 280, req, e));
  add('w_dragon', '竜のきば', '🐉', 'weapon', { ATK: 70 }, 1200, 3);
  add('w_staff', '賢者の杖', '🪄', 'weapon', { MAG: 80 }, 1200, 3);
  const el2 = [['fire', '業火のきば', { ATK: 62, MAG: 26 }], ['water', '大海のきば', { MAG: 72, RES: 26 }], ['earth', '大地のつの', { ATK: 50, DEF: 44 }],
    ['wind', '疾風の羽かざり', { ATK: 46, SPD: 56 }], ['light', '聖なるつの', { MAG: 64, RES: 44 }], ['dark', '深淵のきば', { ATK: 56, MAG: 56 }]];
  el2.forEach(([e, n, b]) => add('w2_' + e, n, '⭐', 'weapon', b, 1700, 4, e));
  // 防具
  add('a_hide', '皮のよろい', '🥋', 'armor', { DEF: 20 }, 120, 1);
  add('a_shell', 'かたいこうら', '🐢', 'armor', { DEF: 45, HP: 20 }, 420, 2);
  add('a_cloak', '魔法のマント', '🧥', 'armor', { RES: 45 }, 420, 2);
  add('a_scale', '竜のうろこ', '🐲', 'armor', { DEF: 80, RES: 30 }, 1400, 3);
  add('a_crystal', '水晶のよろい', '💎', 'armor', { DEF: 60, RES: 60, HP: 40 }, 2300, 4);
  // アクセサリー
  add('c_power', '力のお守り', '💪', 'acc', { ATK: 25 }, 150, 1);
  add('c_mind', '知恵のお守り', '🧠', 'acc', { MAG: 25 }, 150, 1);
  add('c_boots', '俊足のくつ', '👟', 'acc', { SPD: 30 }, 200, 1);
  add('c_heart', '命の指輪', '💍', 'acc', { HP: 60 }, 320, 2);
  add('c_guard', '守りのバッジ', '🔰', 'acc', { DEF: 25, RES: 25 }, 360, 2);
  add('c_orb', '星のオーブ', '🔮', 'acc', { HP: 20, ATK: 20, DEF: 20, MAG: 20, RES: 20, SPD: 20 }, 1900, 4);
  EQUIPS.forEach(it => { it.desc = equipDesc(it); });
})();
function equipDesc(it) {
  const b = Object.keys(it.bonus).map(k => STAT_NAME[k] + '+' + it.bonus[k]).join(' ');
  return b + (it.elem ? '　' + ELEM[it.elem].n + '属性' : '');
}
const EQUIP_BY_ID = {};
EQUIPS.forEach(it => { EQUIP_BY_ID[it.id] = it; });
ITEMS.push(...EQUIPS);
function equipBonus(S) {
  const b = {}; STATS.forEach(k => { b[k] = 0; });
  ['weapon', 'armor', 'acc'].forEach(sl => { const it = S.equip && S.equip[sl] && EQUIP_BY_ID[S.equip[sl]]; if (it) for (const k in it.bonus) b[k] += it.bonus[k]; });
  return b;
}
function weaponElem(S) { const it = S.equip && S.equip.weapon && EQUIP_BY_ID[S.equip.weapon]; return it && it.elem ? it.elem : null; }
function effStats(S) { const b = equipBonus(S), o = {}; STATS.forEach(k => { o[k] = S.stats[k] + b[k]; }); return o; }

// ---------- もちものの属性で効果が変わる技 ----------
// 属性：火＝やけど／水＝鈍足／土＝ひるみ／風＝貫通／光＝吸収／闇＝呪い
SKILLS.push(
  { id: 'elem_shot', name: '属性ショット', type: 'magic', elem: 'weapon', power: 62, ct: 5, pat: 'elemshot', hybrid: true, equipDep: true, any: true, learn: { ATK: 70, MAG: 70 }, users: ['leo', 'miruru', 'gantetsu', 'shizuku', 'ruina'], desc: '武器の属性の弾を放つ。火:やけど／水:鈍足／土:ひるみ／風:貫通／光:吸収／闇:呪い' },
  { id: 'elem_burst', name: '属性バースト', type: 'magic', elem: 'weapon', power: 88, ct: 8, pat: 'elemburst', hybrid: true, equipDep: true, any: true, r: 4.4, learn: { ATK: 190, MAG: 190 }, users: ['leo', 'miruru', 'gantetsu', 'shizuku', 'ruina'], desc: '武器の属性で周囲を爆発させる。属性ごとに追加効果が変わる' },
  { id: 'elem_guard', name: '属性の守り', type: 'support', elem: 'weapon', power: 0, ct: 14, pat: 'elemguard', self: true, equipDep: true, any: true, learn: { DEF: 100, RES: 100 }, users: ['leo', 'miruru', 'gantetsu', 'shizuku', 'ruina'], desc: '武器の属性の力をまとう。火:攻撃UP／水:回復／土:殻／風:加速／光:回復＋殻／闇:吸血／無:防御UP' },
);
SKILLS.forEach(s => { SKILL_BY_ID[s.id] = s; });

// ---------- 仲間モンスターを増やす ----------
// like = 技のならいかた（このモンスターと同じ技を覚えられる）。unlock = 解放のしかた（'any'＝どれかのリーグをクリア／リーグのid＝そのリーグをクリア）
Object.assign(CHARS, {
  gaou: {
    name: 'ガオウ', type: 'fist', elem: 'fire', color: 0xd0702a, starter: true, like: 'leo', ultName: 'ばくれつラッシュ',
    desc: '火をまとった大きな拳のゴリラ。攻撃とすばやさが伸びやすい、近距離の連打型。',
    start: { HP: 45, ATK: 56, DEF: 28, MAG: 8, RES: 18, SPD: 42 }, apt: { HP: 1.1, ATK: 1.35, DEF: 0.9, MAG: 0.55, RES: 0.8, SPD: 1.2 },
  },
  seiryu: {
    name: 'セイリュウ', type: 'sword', elem: 'water', color: 0x3a86e0, unlock: 'water', like: 'leo', ultName: '大瀑布',
    desc: '水をまとう青いドラゴン。攻撃も魔力もバランスよく伸びる。（みずリーグをクリアで解放）',
    start: { HP: 40, ATK: 48, DEF: 30, MAG: 30, RES: 30, SPD: 38 }, apt: { HP: 1.0, ATK: 1.2, DEF: 1.0, MAG: 1.1, RES: 1.1, SPD: 1.0 },
  },
  tsurara: {
    name: 'ツララ', type: 'archer', elem: 'water', color: 0x7fd0f0, unlock: 'water', like: 'shizuku', ultName: '氷雨の羽根',
    desc: '氷のつららをまとう小鳥。すばやさが高く、羽根の溜め撃ちが得意。（みずリーグをクリアで解放）',
    start: { HP: 28, ATK: 38, DEF: 20, MAG: 35, RES: 30, SPD: 52 }, apt: { HP: 0.85, ATK: 1.1, DEF: 0.8, MAG: 1.1, RES: 1.0, SPD: 1.4 },
  },
  raiu: {
    name: 'ライウ', type: 'mage', elem: 'wind', color: 0xe8d040, unlock: 'sky', like: 'miruru', ultName: '万雷',
    desc: 'かみなりを呼ぶ黄色いクラゲ。魔力とすばやさが高い。（そらリーグをクリアで解放）',
    start: { HP: 30, ATK: 14, DEF: 18, MAG: 58, RES: 36, SPD: 44 }, apt: { HP: 0.9, ATK: 0.6, DEF: 0.8, MAG: 1.4, RES: 1.1, SPD: 1.2 },
  },
  hoshimaru: {
    name: 'ホシマル', type: 'mage', elem: 'light', color: 0xf4e8a0, unlock: 'sky', like: 'miruru', ultName: 'スターダスト',
    desc: '星の光をあやつる白いクラゲ。魔力と精神が伸び、打たれ強い魔法型。（そらリーグをクリアで解放）',
    start: { HP: 34, ATK: 12, DEF: 24, MAG: 54, RES: 46, SPD: 30 }, apt: { HP: 1.0, ATK: 0.6, DEF: 0.9, MAG: 1.3, RES: 1.4, SPD: 0.9 },
  },
  ganmaru: {
    name: 'ガンマル', type: 'heavy', elem: 'fire', color: 0xb85a30, unlock: 'flame', like: 'gantetsu', ultName: '溶岩崩し',
    desc: '体に溶岩が流れるゴーレム。体力と攻撃が高い、力まかせの重戦型。（ほのおリーグをクリアで解放）',
    start: { HP: 58, ATK: 46, DEF: 46, MAG: 10, RES: 22, SPD: 18 }, apt: { HP: 1.3, ATK: 1.3, DEF: 1.2, MAG: 0.5, RES: 0.9, SPD: 0.7 },
  },
  kuroko: {
    name: 'クロコ', type: 'dual', elem: 'dark', color: 0x6a4a9a, unlock: 'night', like: 'ruina', ultName: '闇夜の終焉',
    desc: '闇に溶ける黒い子ギツネ。爪も魔法も使える上級者向け。（やみリーグをクリアで解放）',
    start: { HP: 34, ATK: 40, DEF: 20, MAG: 40, RES: 26, SPD: 40 }, apt: { HP: 0.95, ATK: 1.15, DEF: 0.8, MAG: 1.2, RES: 1.0, SPD: 1.1 },
  },
  kogane: {
    name: 'コガネ', type: 'heavy', elem: 'light', color: 0xe0c050, unlock: 'plain', like: 'gantetsu', ultName: '黄金の裁き',
    desc: '金色にかがやくゴーレム。防御と精神が高く、とても打たれ強い。（はじまりリーグをクリアで解放）',
    start: { HP: 52, ATK: 36, DEF: 52, MAG: 20, RES: 40, SPD: 22 }, apt: { HP: 1.2, ATK: 1.0, DEF: 1.4, MAG: 0.8, RES: 1.3, SPD: 0.75 },
  },
});
// 新しい仲間にも、同じ型の技と、その属性の必殺技をもたせる
Object.keys(CHARS).forEach(id => {
  const c = CHARS[id]; if (!c.like) return;
  SKILLS.forEach(s => { if (!s.ult && s.users.includes(c.like) && !s.users.includes(id)) s.users.push(id); });
  const base = SKILL_BY_ID['ult_' + c.like];
  const u = Object.assign({}, base, { id: 'ult_' + id, name: c.ultName || base.name, elem: c.elem, users: [id] });
  SKILLS.push(u); SKILL_BY_ID[u.id] = u;
});
function charUnlocked(id) {
  const c = CHARS[id]; if (c.starter) return true;
  const u = c.unlock || 'any';
  if (u === 'any') return !!meta.cleared;
  return !!(meta.leagues && meta.leagues[u]);
}

// ---------- リーグ ----------
const AREAS_PLAIN = AREAS.map((a, i) => Object.assign({}, a, { scene: i }));
const TRAINERS_PLAIN = TRAINERS.slice();
const NAME_PRE = {
  fire: ['ヒノ', 'ホノオ', 'マグマ', 'カエン', 'ヒダマ', 'ゴウカ'], water: ['ミズ', 'アクア', 'シズク', 'ナミ', 'ツララ', 'スイ'],
  earth: ['イワ', 'ツチ', 'ガレキ', 'ダイチ', 'ドロ', 'ガン'], wind: ['カゼ', 'ハヤテ', 'ソラ', 'ツムジ', 'アラシ', 'フウ'],
  light: ['ヒカリ', 'ホシ', 'コガネ', 'ルミ', 'セイ', 'キラ'], dark: ['ヤミ', 'カゲ', 'クロ', 'ヨル', 'ノロイ', 'ムゲン'],
  none: ['ノラ', 'ドン', 'モリ', 'ゴロ', 'ポコ', 'タロ'],
};
const NAME_SUF = {
  sword: ['トカゲ', 'リザード', 'ドラコ', 'ワーム'], fist: ['ゴリラ', 'ゴリ', 'モンキー', 'ボクサー'], mage: ['クラゲ', 'ウィスプ', 'ピクシー', 'フラワー'],
  archer: ['ドリ', 'バード', 'タカ', 'ツバメ'], heavy: ['ゴーレム', 'ロック', 'ガメ', 'タイタン'], dual: ['ギツネ', 'キツネ', 'フォックス', 'ルナ'],
};
const CRIES = {
  sword: ['ガウッ！ ガウッ！', 'シャーッ！ かかってこい！', 'グルル……いくぞ！'], fist: ['ウホッ！ ウホホッ！', 'ウホォッ！ ぶんなぐる！', 'ドコドコ……やるか？'],
  mage: ['ぷるん！ くらえー！', 'ふわり……ここは とおさない。', 'ぷかぷか……えいっ！'], archer: ['ピィーッ！ ねらいうち！', 'ピヨヨッ！ とんでけー！', 'ケーン！ そらから くるぞ！'],
  heavy: ['ゴゴゴ……ここは とおさない。', 'グオオ！ おしつぶす！', 'ボォォ……かたいぞ。'], dual: ['コン！ いっしょに たたかおう！', 'コォン……ついてこられるかな？', 'コン！ ばけるのは とくいだよ！'],
};
function genLeague(d) {
  let h = 7; for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const BASE = [340, 860, 1400, 2000, 2600];
  const trainers = [], areas = [], used = new Set();
  const mkName = (type, elem) => { for (let i = 0; i < 20; i++) { const n = pick(NAME_PRE[elem] || NAME_PRE.none) + pick(NAME_SUF[type]); if (!used.has(n)) { used.add(n); return n; } } return pick(NAME_PRE.none) + pick(NAME_SUF[type]) + (used.size % 9 + 1); };
  d.areas.forEach((a, ai) => {
    const totals = [];
    if (ai < 5) {
      for (let k = 0; k < 4; k++) {
        const boss = k === 3, type = pick(d.types), elem = pick(d.elems), nm = mkName(type, elem);
        const total = Math.round(BASE[ai] * d.diff * (boss ? 1.18 : 1 + k * 0.05));
        totals.push(total);
        trainers.push({
          id: d.id + '_' + ai + '_' + k, name: boss ? a.name + 'のぬし ' + nm : nm, area: ai, type, elem, total,
          ai: boss ? 'counter' : pick(['rush', 'careful', 'counter', 'rush']), tp: Math.round(total * 0.17 * (boss ? 1.8 : 1)), boss: boss || undefined, line: pick(CRIES[type]),
        });
      }
    } else {
      const total = Math.round(3800 * d.diff * 1.05); totals.push(total);
      const nm = mkName(d.champ.type, d.champ.elem);
      trainers.push({ id: d.id + '_champ', name: d.champ.title + ' ' + nm, area: 5, type: d.champ.type, elem: d.champ.elem, total, ai: 'counter', tp: Math.round(1000 * d.diff), boss: true, champion: true, line: 'よく来たな。全力で、かかってこい！' });
    }
    areas.push({ name: a.name, scene: a.scene, theme: AREAS_PLAIN[a.scene].theme, rank: ai === 5 ? 'S' : rankOf(Math.min(...totals)) + '〜' + rankOf(Math.max(...totals)) });
  });
  return { areas, trainers, champion: d.id + '_champ' };
}
const LEAGUES = [
  { id: 'plain', name: 'はじまりリーグ', icon: '🌱', desc: '草原から塔へ。はじめてのリーグ。', diff: 1.0, skillPlus: 0, unlock: null, areas: AREAS_PLAIN, trainers: TRAINERS_PLAIN, champion: 'regulus' },
  Object.assign({ id: 'flame', name: 'ほのおリーグ', icon: '🔥', desc: '火山と砂漠をめぐる、炎の使い手たちのリーグ。重くて力強い敵が多い。', diff: 1.25, skillPlus: 1, unlock: null }, genLeague({
    id: 'flame', diff: 1.25, areas: [{ name: '火山のふもと', scene: 1 }, { name: '溶岩洞くつ', scene: 1 }, { name: '灼熱の砂漠', scene: 3 }, { name: '炎の峡谷', scene: 3 }, { name: '煉獄の神殿', scene: 4 }, { name: '炎帝の塔', scene: 5 }],
    elems: ['fire', 'fire', 'fire', 'earth', 'none'], types: ['heavy', 'sword', 'fist', 'mage', 'dual'], champ: { type: 'heavy', elem: 'fire', title: '炎帝' } })),
  Object.assign({ id: 'water', name: 'みずリーグ', icon: '🌊', desc: '森と湖と海をめぐる、水の使い手たちのリーグ。魔法や遠距離の敵が多い。', diff: 1.15, skillPlus: 1, unlock: null }, genLeague({
    id: 'water', diff: 1.15, areas: [{ name: '水辺の森', scene: 0 }, { name: '水晶の湖', scene: 2 }, { name: '氷の洞くつ', scene: 2 }, { name: '嵐の海岸', scene: 3 }, { name: '月影の神殿', scene: 4 }, { name: '深海の塔', scene: 5 }],
    elems: ['water', 'water', 'water', 'wind', 'none'], types: ['mage', 'archer', 'dual', 'heavy', 'sword'], champ: { type: 'mage', elem: 'water', title: '海王' } })),
  Object.assign({ id: 'sky', name: 'そらリーグ', icon: '🌤️', desc: '風と光の舞台をめぐる、空のリーグ。すばやい敵が多く、むずかしい。（どれかのリーグをクリアで解放）', diff: 1.45, skillPlus: 1, unlock: 'any' }, genLeague({
    id: 'sky', diff: 1.45, areas: [{ name: '風の草原', scene: 0 }, { name: '雲の峡谷', scene: 3 }, { name: '天空の島', scene: 2 }, { name: '雷鳴の峡谷', scene: 3 }, { name: '星の神殿', scene: 4 }, { name: '天空の塔', scene: 5 }],
    elems: ['wind', 'wind', 'wind', 'light', 'none'], types: ['archer', 'dual', 'mage', 'sword', 'fist'], champ: { type: 'archer', elem: 'wind', title: '天帝' } })),
  Object.assign({ id: 'night', name: 'やみリーグ', icon: '🌙', desc: '呪いと闇の世界をめぐる、いちばん難しいリーグ。（そらリーグをクリアで解放）', diff: 1.7, skillPlus: 2, unlock: 'sky' }, genLeague({
    id: 'night', diff: 1.7, areas: [{ name: '月夜の森', scene: 4 }, { name: '呪いの沼', scene: 2 }, { name: '荒れ地', scene: 1 }, { name: '黒い峡谷', scene: 3 }, { name: '闇の神殿', scene: 4 }, { name: '終焉の塔', scene: 5 }],
    elems: ['dark', 'dark', 'dark', 'dark', 'none'], types: ['dual', 'mage', 'fist', 'sword', 'heavy'], champ: { type: 'dual', elem: 'dark', title: '闇王' } })),
];
const LEAGUE_BY_ID = {};
LEAGUES.forEach(l => { LEAGUE_BY_ID[l.id] = l; });
let LEAGUE = LEAGUES[0];
// 選んだリーグの、エリア・敵の一覧に切りかえる（AREAS / TRAINERS はいまのリーグのもの）
function setLeague(id) {
  LEAGUE = LEAGUE_BY_ID[id] || LEAGUES[0];
  AREAS.length = 0; AREAS.push(...LEAGUE.areas);
  TRAINERS.length = 0; TRAINERS.push(...LEAGUE.trainers);
  for (const k in TRAINER_BY_ID) delete TRAINER_BY_ID[k];
  TRAINERS.forEach(t => { TRAINER_BY_ID[t.id] = t; });
}
function leagueUnlocked(l) {
  if (!l.unlock) return true;
  if (l.unlock === 'any') return !!meta.cleared;
  return !!(meta.leagues && meta.leagues[l.unlock]);
}
function leagueUnlockText(l) { return l.unlock === 'any' ? 'どれかのリーグをクリアで解放' : (LEAGUE_BY_ID[l.unlock].name + 'をクリアで解放'); }
