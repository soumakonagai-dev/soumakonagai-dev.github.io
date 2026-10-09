// 数値・ピース・敵の定義。バランス調整はこのファイルだけで行う。
globalThis.BB = globalThis.BB || {};
BB.data = {
  config: {
    size: 7,
    handSize: 3,
    maxHp: 100,
    shieldCap: 50,
    wholeBonus: 1.5,      // ピース丸ごと消し
    lineBonus: 1.2,       // 同時消しライン数 1 本ごと
    comboBonus: 0.1,      // コンボ 1 ごと
    comboCap: 10,
    collapseRatio: 0.2,   // 手詰まり時に受ける最大 HP 割合
    perfectGauge: 50,     // パーフェクトクリアの必殺ゲージ
    poisonTurns: 3,
    sealTurns: 3,
    healBetween: 25,      // 敵撃破ごとの HP 回復
    stoneCount: [2, 3],
    freezeCount: 2,
    defendShield: 15,
    strongMult: 2
  },
  // 効果の解決順（守りを先に確定し、攻撃で締める）
  order: ['guard', 'heal', 'stun', 'poison', 'magic', 'attack', 'charge'],
  abilities: {
    attack: { name: '攻撃',     color: '#e5484d', icon: '攻' },
    magic:  { name: '魔法攻撃', color: '#8e4ec6', icon: '魔' },
    heal:   { name: '回復',     color: '#30a46c', icon: '回' },
    guard:  { name: 'ガード',   color: '#0090ff', icon: '守' },
    poison: { name: '毒',       color: '#a3c93a', icon: '毒' },
    charge: { name: 'チャージ', color: '#e0b020', icon: '溜' },
    stun:   { name: 'スタン',   color: '#f08c2a', icon: '眩' },
    none:   { name: 'なし',     color: '#a9b4d6', icon: '' }
  },
  // cells は [x, y]。回転なし。weight は配給の重み。
  pieces: [
    { id: 'dot',  cells: [[0,0]], ability: 'none', base: 0, weight: 6 },
    { id: 'I2h',  cells: [[0,0],[1,0]], ability: 'attack', base: 3, weight: 4 },
    { id: 'I2v',  cells: [[0,0],[0,1]], ability: 'attack', base: 3, weight: 4 },
    { id: 'I3h',  cells: [[0,0],[1,0],[2,0]], ability: 'attack', base: 3, weight: 5 },
    { id: 'I3v',  cells: [[0,0],[0,1],[0,2]], ability: 'attack', base: 3, weight: 5 },
    { id: 'I4h',  cells: [[0,0],[1,0],[2,0],[3,0]], ability: 'attack', base: 3, weight: 5 },
    { id: 'I4v',  cells: [[0,0],[0,1],[0,2],[0,3]], ability: 'attack', base: 3, weight: 5 },
    { id: 'I5h',  cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], ability: 'attack', base: 3, weight: 4 },
    { id: 'I5v',  cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], ability: 'attack', base: 3, weight: 3 },
    { id: 'T',    cells: [[0,0],[1,0],[2,0],[1,1]], ability: 'heal', base: 3, weight: 15 },
    { id: 'O',    cells: [[0,0],[1,0],[0,1],[1,1]], ability: 'guard', base: 3, weight: 12 },
    { id: 'B3',   cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], ability: 'guard', base: 4, weight: 3 },
    { id: 'L',    cells: [[0,0],[0,1],[0,2],[1,2]], ability: 'magic', base: 2, weight: 5 },
    { id: 'J',    cells: [[1,0],[1,1],[1,2],[0,2]], ability: 'magic', base: 2, weight: 5 },
    { id: 'S',    cells: [[1,0],[2,0],[0,1],[1,1]], ability: 'poison', base: 1, weight: 5 },
    { id: 'Z',    cells: [[0,0],[1,0],[1,1],[2,1]], ability: 'poison', base: 1, weight: 5 },
    { id: 'bigL', cells: [[0,0],[0,1],[0,2],[1,2],[2,2]], ability: 'charge', base: 4, weight: 5 },   // 5 マスで 20%
    { id: 'plus', cells: [[1,0],[0,1],[1,1],[2,1],[1,2]], ability: 'stun', base: 0.2, weight: 4 }    // 5 マスでカウント +1
  ],
  // 敵の行動: attack / strong / stone / freeze / defend / seal(ability)
  enemies: {
    chibi:    { name: 'ちびスライム', art: 'slime',  size: .78, hp: 26, atk: 6,  count: 4,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'attack' }, { type: 'strong' }] },
    kogob:    { name: 'こゴブリン',   art: 'goblin', size: .8,  hp: 38, atk: 7,  count: 4,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }] },
    bigslime: { name: 'ビッグスライム', art: 'slime', size: 1.05, hp: 64, atk: 9, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }, { type: 'attack' }] },
    slime:    { name: 'スライム',   art: 'slime',    hp: 44,  atk: 10, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }] },
    goblin:   { name: 'ゴブリン',   art: 'goblin',   hp: 68,  atk: 12, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'attack' }, { type: 'seal', ability: 'heal' }, { type: 'strong' }] },
    dragon:   { name: 'ドラゴン',   art: 'dragon',   hp: 144, atk: 19, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'defend' }, { type: 'strong' }, { type: 'stone' }, { type: 'attack' }] },
    skeleton: { name: 'スケルトン', art: 'skeleton', hp: 64,  atk: 13, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'stone' }, { type: 'strong' }] },
    ghost:    { name: 'ゴースト',   art: 'ghost',    hp: 80, atk: 12, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'guard' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }] },
    golem:    { name: 'ゴーレム',   art: 'golem',    hp: 176, atk: 20, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'stone' }, { type: 'freeze' }, { type: 'attack' }] },
    knight:   { name: '暗黒騎士',   art: 'knight',   hp: 92, atk: 14, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'defend' }, { type: 'attack' }, { type: 'freeze' }] },
    imp:      { name: 'インプ',     art: 'imp',      hp: 84, atk: 13, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'seal', ability: 'heal' }, { type: 'attack' }, { type: 'strong' }] },
    demon:    { name: '魔王',       art: 'demon',    hp: 256, atk: 23, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }] }
  },
  // reward: 敵を倒すごとに enemy[i] コイン、クリアで clear、初クリアで first、星 1 つにつき star
  // fixed: true のステージは、クリア時にコインがちょうど clear 枚（装備ボーナスなし）
  // コインは以前の 4 倍
  stages: [
    { id: 0, name: 'ちいさな森', desc: 'はじめてでも安心のやさしい森', theme: 'forest',
      enemies: ['chibi', 'kogob', 'bigslime'], reward: { enemy: [0, 0, 0], clear: 400, first: 0, star: 0, fixed: true } },
    { id: 1, name: 'はじまりの草原', desc: 'スライムとゴブリンが待ち受ける', theme: 'meadow',
      enemies: ['slime', 'goblin', 'dragon'], reward: { enemy: [60, 80, 140], clear: 400, first: 320, star: 40 } },
    { id: 2, name: 'ほねの墓場', desc: '骨と霊がさまよう古い墓地', theme: 'grave',
      enemies: ['skeleton', 'ghost', 'golem'], reward: { enemy: [100, 120, 200], clear: 600, first: 480, star: 60 } },
    { id: 3, name: '魔王城', desc: '最奥で魔王が待つ', theme: 'castle',
      enemies: ['knight', 'imp', 'demon'], reward: { enemy: [160, 200, 320], clear: 880, first: 720, star: 80 } }
  ],
  gacha: {
    cost: 100, cost10: 900,
    rates: { N: 55, R: 30, SR: 12, SSR: 3 },
    rare: { cost: 500, rates: { N: 0, R: 70, SR: 25, SSR: 5 } },   // レアガチャ: R 以上確定
    maxPlus: 20,                            // 合体で上げられる +値の上限
    plusBonus: 0.07                         // +1 ごとに装備の効果 +7%（+20 で 2.4 倍）
  },
  slots: { weapon: '武器', armor: '防具', acc: 'アクセ' },
  // effects: mul.<能力> 能力の効果量 / combo コンボ倍率 / comboCap コンボ上限 / line 同時消し倍率 / whole 丸ごと消し倍率
  //          maxHp / shield 盾の上限 / startShield 開始シールド / gauge 開始必殺ゲージ / count 敵の行動までの手数
  //          reduce 被ダメージ軽減 / coin 獲得コイン / healBetween 戦闘後の回復
  equipment: [
    { id: 'w1', slot: 'weapon', rarity: 'N',   name: '木の剣',         icon: '🗡️', effects: { mul: { attack: .15 } } },
    { id: 'w2', slot: 'weapon', rarity: 'R',   name: '鋼の剣',         icon: '⚔️', effects: { mul: { attack: .30 } } },
    { id: 'w3', slot: 'weapon', rarity: 'R',   name: '魔導書',         icon: '📖', effects: { mul: { magic: .40 } } },
    { id: 'w4', slot: 'weapon', rarity: 'SR',  name: '炎の剣',         icon: '🔥', effects: { mul: { attack: .45 }, whole: .25 } },
    { id: 'w5', slot: 'weapon', rarity: 'SR',  name: '賢者の杖',       icon: '🪄', effects: { mul: { magic: .70, poison: .40 } } },
    { id: 'w6', slot: 'weapon', rarity: 'SSR', name: '竜殺しの大剣',   icon: '🐉', effects: { mul: { attack: .90 }, line: .12 } },
    { id: 'a1', slot: 'armor',  rarity: 'N',   name: '布の服',         icon: '👕', effects: { maxHp: 12 } },
    { id: 'a2', slot: 'armor',  rarity: 'R',   name: '革の鎧',         icon: '🥋', effects: { maxHp: 15, mul: { guard: .20 } } },
    { id: 'a3', slot: 'armor',  rarity: 'R',   name: '鋼の盾',         icon: '🛡️', effects: { mul: { guard: .50 } } },
    { id: 'a4', slot: 'armor',  rarity: 'SR',  name: '聖なる法衣',     icon: '👘', effects: { mul: { heal: .60 }, maxHp: 15, healBetween: 10 } },
    { id: 'a5', slot: 'armor',  rarity: 'SSR', name: '竜鱗の鎧',       icon: '🐲', effects: { reduce: .20, mul: { guard: .50 }, startShield: 12, shield: 20 } },
    { id: 'c1', slot: 'acc',    rarity: 'N',   name: '銅の指輪',       icon: '💍', effects: { combo: .03 } },
    { id: 'c2', slot: 'acc',    rarity: 'N',   name: 'コイン袋',       icon: '👛', effects: { coin: .25 } },
    { id: 'c3', slot: 'acc',    rarity: 'R',   name: 'コンボリング',   icon: '📿', effects: { combo: .05, comboCap: 2 } },
    { id: 'c4', slot: 'acc',    rarity: 'R',   name: '雷の腕輪',       icon: '⚡', effects: { mul: { charge: .60 }, gauge: 25 } },
    { id: 'c5', slot: 'acc',    rarity: 'R',   name: '毒蛇の指輪',     icon: '🐍', effects: { mul: { poison: .70 } } },
    { id: 'c6', slot: 'acc',    rarity: 'SR',  name: '連鎖のペンダント', icon: '🔗', effects: { combo: .08, comboCap: 4 } },
    { id: 'c7', slot: 'acc',    rarity: 'SR',  name: '時の砂時計',     icon: '⏳', effects: { count: 1, mul: { stun: .60 } } },
    { id: 'c8', slot: 'acc',    rarity: 'SSR', name: '賢王の冠',       icon: '👑', effects: { combo: .12, comboCap: 6, whole: .30 } }
  ],
  // いろがえしたマスの基礎値
  buddyBase: { attack: 3, magic: 2, heal: 3, guard: 3, poison: 1, charge: 4, stun: 0.2 },
  // バディ: 戦闘ごとに 1 回だけ使えるスキル持ちの仲間。skill.v は Lv1 のときの数値
  buddies: [
    { id: 'cat',     name: 'ぬりネコ',         emoji: '🐱', rarity: 'N',   skill: { type: 'paintRow' } },
    { id: 'turtle',  name: 'カメさん',         emoji: '🐢', rarity: 'N',   skill: { type: 'shield', v: 25 } },
    { id: 'snake',   name: 'どくヘビ',         emoji: '🐍', rarity: 'N',   skill: { type: 'poison', v: 6 } },
    { id: 'owl',     name: 'フクロウ',         emoji: '🦉', rarity: 'N',   skill: { type: 'reroll' } },
    { id: 'cham',    name: 'カメレオン',       emoji: '🦎', rarity: 'R',   skill: { type: 'recolor' } },
    { id: 'bear',    name: 'ばくだんクマ',     emoji: '🐻', rarity: 'R',   skill: { type: 'bomb' } },
    { id: 'sloth',   name: 'ナマケモノ',       emoji: '🦥', rarity: 'R',   skill: { type: 'stun', v: 2 } },
    { id: 'mouse',   name: 'でんきネズミ',     emoji: '🐭', rarity: 'R',   skill: { type: 'charge', v: 70 } },
    { id: 'dragon',  name: 'ちびドラゴン',     emoji: '🐲', rarity: 'SR',  skill: { type: 'strike', v: 40 } },
    { id: 'unicorn', name: 'ユニコーン',       emoji: '🦄', rarity: 'SR',  skill: { type: 'heal', v: 40 } },
    { id: 'fairy',   name: 'ようせい',         emoji: '🧚', rarity: 'SR',  skill: { type: 'purify' } },
    { id: 'monkey',  name: 'サムライザル',     emoji: '🐒', rarity: 'SR',  skill: { type: 'laser' } },
    { id: 'phoenix', name: 'フェニックス',     emoji: '🦅', rarity: 'SSR', skill: { type: 'rebirth', v: 60 } },
    { id: 'rainbow', name: 'にじいろリュウ',   emoji: '🦕', rarity: 'SSR', skill: { type: 'recolorAll' } }
  ],
  scout: { maxLevel: 5, dupCoins: 150, candidates: 3, rates: { N: 50, R: 32, SR: 14, SSR: 4 } }
};

BB.data.buddyMap = {};
BB.data.buddies.forEach(b => { BB.data.buddyMap[b.id] = b; });
