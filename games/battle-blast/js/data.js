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
    { id: 'L',    cells: [[0,0],[0,1],[0,2],[1,2]], ability: 'magic', base: 3, weight: 7 },
    { id: 'J',    cells: [[1,0],[1,1],[1,2],[0,2]], ability: 'magic', base: 3, weight: 7 },
    { id: 'S',    cells: [[1,0],[2,0],[0,1],[1,1]], ability: 'poison', base: 1, weight: 5 },
    { id: 'Z',    cells: [[0,0],[1,0],[1,1],[2,1]], ability: 'poison', base: 1, weight: 5 },
    { id: 'bigL', cells: [[0,0],[0,1],[0,2],[1,2],[2,2]], ability: 'charge', base: 4, weight: 5 },   // 5 マスで 20%
    { id: 'plus', cells: [[1,0],[0,1],[1,1],[2,1],[1,2]], ability: 'stun', base: 0.2, weight: 4 }    // 5 マスでカウント +1
  ],
  // 敵の行動: attack / strong / stone / freeze / defend / seal(ability)
  enemies: {
    chibi:    { name: 'ちびスライム', art: 'chibi', theme: 'slime', hp: 26, atk: 6,  count: 4,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'attack' }, { type: 'strong' }] },
    kogob:    { name: 'こゴブリン',   art: 'kogob', theme: 'goblin',  hp: 38, atk: 7,  count: 4,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }] },
    bigslime: { name: 'ビッグスライム', art: 'bigslime', theme: 'slime', hp: 64, atk: 9, count: 4, boss: true,
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
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }] },
    // ---- ステージ 5: こおりの洞窟 ----
    frostslime: { name: 'フロストスライム', art: 'frostslime', theme: 'ice', hp: 100, atk: 15, count: 3,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'attack' }, { type: 'strong' }] },
    yeti:       { name: 'イエティ', art: 'yeti', theme: 'ice', hp: 125, atk: 16, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'defend' }, { type: 'attack' }, { type: 'freeze' }] },
    icedragon:  { name: 'アイスドラゴン', art: 'icedragon', theme: 'ice', hp: 300, atk: 26, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }, { type: 'seal', ability: 'heal' }] },
    // ---- ステージ 6: 灼熱の火山 ----
    magmaslime: { name: 'マグマスライム', art: 'magmaslime', theme: 'volcano', hp: 115, atk: 17, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'attack' }] },
    flameimp:   { name: 'ほのおインプ', art: 'flameimp', theme: 'volcano', hp: 125, atk: 17, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'seal', ability: 'heal' }, { type: 'strong' }] },
    lavagolem:  { name: 'ラヴァゴーレム', art: 'lavagolem', theme: 'volcano', hp: 340, atk: 28, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'stone' }, { type: 'freeze' }, { type: 'strong' }] },
    // ---- ステージ 7: 天空の神殿 ----
    wizard:     { name: '魔導士', art: 'wizard', theme: 'sky', hp: 130, atk: 18, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'heal' }, { type: 'freeze' }, { type: 'strong' }, { type: 'stone' }] },
    holyknight: { name: 'てんくうの騎士', art: 'holyknight', theme: 'sky', hp: 140, atk: 19, count: 3,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }] },
    overlord:   { name: '大魔王', art: 'overlord', theme: 'sky', hp: 400, atk: 31, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }] },
    // ---- ステージ 8: きのこの森 ----
    spore:        { name: 'マッシュン', art: 'spore', theme: 'mush', hp: 135, atk: 18, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'heal' }] },
    treant:       { name: 'トレント', art: 'treant', theme: 'mush', hp: 148, atk: 19, count: 3,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'stone' }, { type: 'attack' }] },
    mothertree:   { name: 'マザーツリー', art: 'mothertree', theme: 'mush', hp: 400, atk: 29, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'seal', ability: 'heal' }, { type: 'stone' }, { type: 'freeze' }, { type: 'strong' }, { type: 'defend' }] },
    // ---- ステージ 9: 海底神殿 ----
    jelly:        { name: 'クラゲ', art: 'jelly', theme: 'sea', hp: 148, atk: 19, count: 3,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'seal', ability: 'guard' }, { type: 'strong' }] },
    sahagin:      { name: 'サハギン', art: 'sahagin', theme: 'sea', hp: 156, atk: 20, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }, { type: 'defend' }] },
    dagon:        { name: 'ダゴン', art: 'dagon', theme: 'sea', hp: 430, atk: 31, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'stone' }, { type: 'defend' }] },
    // ---- ステージ 10: 砂漠の遺跡 ----
    scorpion:     { name: 'サソリ', art: 'scorpion', theme: 'desert', hp: 158, atk: 20, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'stone' }, { type: 'attack' }, { type: 'strong' }] },
    mummy:        { name: 'ミイラ', art: 'mummy', theme: 'desert', hp: 166, atk: 21, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'heal' }, { type: 'stone' }, { type: 'strong' }, { type: 'defend' }] },
    pharaoh:      { name: 'ファラオ', art: 'pharaoh', theme: 'desert', hp: 460, atk: 32, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'freeze' }, { type: 'defend' }, { type: 'strong' }, { type: 'attack' }] },
    // ---- ステージ 11: 機械工場 ----
    drone:        { name: 'ドローン', art: 'drone', theme: 'factory', hp: 168, atk: 22, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'stone' }] },
    robo:         { name: 'ロボ兵', art: 'robo', theme: 'factory', hp: 176, atk: 23, count: 3,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }] },
    deathmachine: { name: 'デスマシン', art: 'deathmachine', theme: 'factory', hp: 490, atk: 34, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'defend' }, { type: 'freeze' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'strong' }] },
    // ---- ステージ 12: 時空の狭間 ----
    voideye:      { name: 'ヴォイドアイ', art: 'voideye', theme: 'void', hp: 178, atk: 23, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'heal' }, { type: 'freeze' }, { type: 'strong' }, { type: 'stone' }] },
    shadow:       { name: 'シャドウ', art: 'shadow', theme: 'void', hp: 186, atk: 24, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'freeze' }, { type: 'attack' }, { type: 'strong' }] },
    timelord:     { name: 'タイムロード', art: 'timelord', theme: 'void', hp: 540, atk: 37, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }, { type: 'strong' }] },
    // ---- ステージ 13: 水晶の洞窟 ----
    crybat:       { name: 'クリスタルバット', art: 'crybat', theme: 'crystal', hp: 195, atk: 25, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'stone' }] },
    crygolem:     { name: 'クリスタルゴーレム', art: 'crygolem', theme: 'crystal', hp: 210, atk: 26, count: 3,
      actions: [{ type: 'defend' }, { type: 'attack' }, { type: 'strong' }, { type: 'stone' }, { type: 'attack' }, { type: 'strong' }] },
    crydragon:    { name: 'クリスタルドラゴン', art: 'crydragon', theme: 'crystal', hp: 580, atk: 39, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'defend' }, { type: 'stone' }, { type: 'strong' }, { type: 'freeze' }] },
    // ---- ステージ 14: 雷鳴の山 ----
    thunderbird:  { name: 'サンダーバード', art: 'thunderbird', theme: 'storm', hp: 205, atk: 27, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }, { type: 'strong' }] },
    raijuu:       { name: 'ライジュウ', art: 'raijuu', theme: 'storm', hp: 218, atk: 28, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'freeze' }, { type: 'strong' }] },
    raijin:       { name: 'ライジン', art: 'raijin', theme: 'storm', hp: 600, atk: 40, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'heal' }, { type: 'stone' }, { type: 'strong' }, { type: 'defend' }] },
    // ---- ステージ 15: おかしの国 ----
    gummy:        { name: 'グミン', art: 'gummy', theme: 'candy', hp: 235, atk: 30, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'attack' }, { type: 'defend' }] },
    cookie:       { name: 'クッキーへい', art: 'cookie', theme: 'candy', hp: 245, atk: 31, count: 3,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }] },
    cakequeen:    { name: 'ケーキクイーン', art: 'cakequeen', theme: 'candy', hp: 700, atk: 44, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'heal' }, { type: 'defend' }, { type: 'freeze' }, { type: 'strong' }, { type: 'stone' }] },
    // ---- ステージ 16: 星の海 ----
    alien:        { name: 'エイリアン', art: 'alien', theme: 'space', hp: 245, atk: 31, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }] },
    ufo:          { name: 'UFO', art: 'ufo', theme: 'space', hp: 255, atk: 32, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'stone' }, { type: 'freeze' }, { type: 'strong' }, { type: 'defend' }] },
    blackhole:    { name: 'ブラックホール', art: 'blackhole', theme: 'space', hp: 720, atk: 44, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'strong' }, { type: 'defend' }] },
    // ---- ステージ 17: 竜王の城 ----
    wyvern:       { name: 'ワイバーン', art: 'wyvern', theme: 'throne', hp: 275, atk: 34, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }] },
    dragonknight: { name: 'ドラゴンナイト', art: 'dragonknight', theme: 'throne', hp: 290, atk: 35, count: 3,
      actions: [{ type: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'heal' }] },
    ancientdragon:{ name: 'エンシェントドラゴン', art: 'ancientdragon', theme: 'throne', hp: 860, atk: 49, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'seal', ability: 'attack' }, { type: 'strong' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }, { type: 'strong' }] },
    // ---- ステージ 18: ふしぎな遊園地 ----
    clown:        { name: 'ピエロ', art: 'clown', theme: 'carnival', hp: 285, atk: 35, count: 3,
      actions: [{ type: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }] },
    doll:         { name: 'にんぎょう', art: 'doll', theme: 'carnival', hp: 295, atk: 36, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'heal' }, { type: 'strong' }, { type: 'stone' }, { type: 'freeze' }, { type: 'strong' }] },
    ringmaster:   { name: 'カーニバルマスター', art: 'ringmaster', theme: 'carnival', hp: 900, atk: 50, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }] },
    // ---- ステージ 19: 嵐の海賊船 ----
    pirate:       { name: 'かいぞく', art: 'pirate', theme: 'pirate', hp: 305, atk: 37, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'attack' }, { type: 'stone' }, { type: 'strong' }] },
    parrot:       { name: 'パイレーツパロット', art: 'parrot', theme: 'pirate', hp: 315, atk: 38, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'strong' }] },
    kraken:       { name: 'クラーケン', art: 'kraken', theme: 'pirate', hp: 950, atk: 52, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'defend' }, { type: 'strong' }, { type: 'freeze' }, { type: 'strong' }] },
    // ---- ステージ 20: 桜の国 ----
    ninja:        { name: 'にんじゃ', art: 'ninja', theme: 'sakura', hp: 325, atk: 39, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'strong' }, { type: 'stone' }] },
    oni:          { name: 'おに', art: 'oni', theme: 'sakura', hp: 335, atk: 40, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'defend' }, { type: 'strong' }, { type: 'stone' }, { type: 'attack' }, { type: 'strong' }] },
    kyubi:        { name: 'きゅうびのキツネ', art: 'kyubi', theme: 'sakura', hp: 1000, atk: 54, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'freeze' }, { type: 'strong' }, { type: 'seal', ability: 'heal' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'strong' }, { type: 'defend' }, { type: 'freeze' }] },
    // ---- ステージ 21: 恐竜の谷 ----
    raptor:       { name: 'ラプトル', art: 'raptor', theme: 'jurassic', hp: 345, atk: 41, count: 3,
      actions: [{ type: 'attack' }, { type: 'attack' }, { type: 'strong' }, { type: 'attack' }, { type: 'freeze' }, { type: 'strong' }] },
    tricera:      { name: 'トリケラ', art: 'tricera', theme: 'jurassic', hp: 355, atk: 42, count: 3,
      actions: [{ type: 'defend' }, { type: 'attack' }, { type: 'strong' }, { type: 'stone' }, { type: 'strong' }, { type: 'attack' }, { type: 'strong' }] },
    trex:         { name: 'ティラノ', art: 'trex', theme: 'jurassic', hp: 1050, atk: 56, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'strong' }, { type: 'freeze' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'attack' }, { type: 'defend' }, { type: 'strong' }, { type: 'strong' }] },
    // ---- ステージ 22: 終焉の世界 ----
    fallenangel:  { name: '堕天使', art: 'fallenangel', theme: 'chaos', hp: 370, atk: 43, count: 3,
      actions: [{ type: 'attack' }, { type: 'seal', ability: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'stone' }, { type: 'strong' }, { type: 'attack' }] },
    cerberus:     { name: 'ケルベロス', art: 'cerberus', theme: 'chaos', hp: 385, atk: 44, count: 3,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'strong' }, { type: 'freeze' }, { type: 'attack' }, { type: 'strong' }, { type: 'stone' }] },
    chaosgod:     { name: '混沌の神', art: 'chaosgod', theme: 'chaos', hp: 1150, atk: 59, count: 4, boss: true,
      actions: [{ type: 'attack' }, { type: 'strong' }, { type: 'freeze' }, { type: 'seal', ability: 'attack' }, { type: 'stone' }, { type: 'strong' }, { type: 'seal', ability: 'guard' }, { type: 'strong' }, { type: 'defend' }, { type: 'freeze' }, { type: 'strong' }, { type: 'strong' }] }
  },
  // reward: 敵を倒すごとに enemy[i] コイン、クリアで clear、初クリアで first、星 1 つにつき star
  // fixed: true のステージは、クリア時にコインがちょうど clear 枚（装備ボーナスなし）
  // コインは以前の 4 倍
  stages: [
    { id: 0, name: 'ちいさな森', desc: 'はじめてでも安心のやさしい森', theme: 'forest',
      enemies: ['chibi', 'kogob', 'bigslime'], reward: { enemy: [0, 0, 0], clear: 200, first: 0, star: 0, fixed: true } },
    { id: 1, name: 'はじまりの草原', desc: 'スライムとゴブリンが待ち受ける', theme: 'meadow',
      enemies: ['slime', 'goblin', 'dragon'], reward: { enemy: [30, 40, 70], clear: 200, first: 160, star: 20 } },
    { id: 2, name: 'ほねの墓場', desc: '骨と霊がさまよう古い墓地', theme: 'grave',
      enemies: ['skeleton', 'ghost', 'golem'], reward: { enemy: [50, 60, 100], clear: 300, first: 240, star: 30 } },
    { id: 3, name: '魔王城', desc: '最奥で魔王が待つ', theme: 'castle',
      enemies: ['knight', 'imp', 'demon'], reward: { enemy: [80, 100, 160], clear: 440, first: 360, star: 40 } },
    { id: 4, name: 'こおりの洞窟', desc: '凍りついた魔物たちの巣', theme: 'ice',
      enemies: ['frostslime', 'yeti', 'icedragon'], reward: { enemy: [120, 150, 240], clear: 600, first: 500, star: 50 } },
    { id: 5, name: '灼熱の火山', desc: '燃えさかる溶岩のなかへ', theme: 'volcano',
      enemies: ['magmaslime', 'flameimp', 'lavagolem'], reward: { enemy: [160, 200, 320], clear: 800, first: 650, star: 65 } },
    { id: 6, name: '天空の神殿', desc: '雲の上で最後の戦いが待つ', theme: 'sky',
      enemies: ['wizard', 'holyknight', 'overlord'], reward: { enemy: [210, 260, 400], clear: 1000, first: 850, star: 80 } },
    { id: 7, name: 'きのこの森', desc: '胞子がただよう不思議な森', theme: 'mush',
      enemies: ['spore', 'treant', 'mothertree'], reward: { enemy: [250, 300, 480], clear: 1200, first: 1000, star: 95 } },
    { id: 8, name: '海底神殿', desc: '深い海の底に沈んだ古い神殿', theme: 'sea',
      enemies: ['jelly', 'sahagin', 'dagon'], reward: { enemy: [290, 350, 560], clear: 1400, first: 1150, star: 110 } },
    { id: 9, name: '砂漠の遺跡', desc: '砂に埋もれた王の墓', theme: 'desert',
      enemies: ['scorpion', 'mummy', 'pharaoh'], reward: { enemy: [330, 400, 640], clear: 1600, first: 1300, star: 125 } },
    { id: 10, name: '機械工場', desc: '止まらない機械たちの工場', theme: 'factory',
      enemies: ['drone', 'robo', 'deathmachine'], reward: { enemy: [370, 450, 720], clear: 1800, first: 1450, star: 140 } },
    { id: 11, name: '時空の狭間', desc: '時間がゆがむ、世界のはて', theme: 'void',
      enemies: ['voideye', 'shadow', 'timelord'], reward: { enemy: [420, 500, 800], clear: 2000, first: 1600, star: 160 } },
    { id: 12, name: '水晶の洞窟', desc: 'きらめく結晶が眠る地底の洞窟', theme: 'crystal',
      enemies: ['crybat', 'crygolem', 'crydragon'], reward: { enemy: [470, 560, 880], clear: 2200, first: 1750, star: 175 } },
    { id: 13, name: '雷鳴の山', desc: '稲妻が走る、嵐のいただき', theme: 'storm',
      enemies: ['thunderbird', 'raijuu', 'raijin'], reward: { enemy: [520, 620, 960], clear: 2400, first: 1900, star: 190 } },
    { id: 14, name: 'おかしの国', desc: 'あまくて あぶない お菓子の国', theme: 'candy',
      enemies: ['gummy', 'cookie', 'cakequeen'], reward: { enemy: [570, 680, 1040], clear: 2600, first: 2050, star: 205 } },
    { id: 15, name: '星の海', desc: '星々がうずまく、宇宙のはて', theme: 'space',
      enemies: ['alien', 'ufo', 'blackhole'], reward: { enemy: [620, 740, 1120], clear: 2800, first: 2200, star: 220 } },
    { id: 16, name: '竜王の城', desc: 'すべての竜をしたがえる王の城', theme: 'throne',
      enemies: ['wyvern', 'dragonknight', 'ancientdragon'], reward: { enemy: [680, 800, 1250], clear: 3200, first: 2600, star: 250 } },
    { id: 17, name: 'ふしぎな遊園地', desc: '夜だけひらく、あやしい遊園地', theme: 'carnival',
      enemies: ['clown', 'doll', 'ringmaster'], reward: { enemy: [730, 860, 1350], clear: 3400, first: 2750, star: 265 } },
    { id: 18, name: '嵐の海賊船', desc: 'あらしの海にうかぶ、ゆうれい船', theme: 'pirate',
      enemies: ['pirate', 'parrot', 'kraken'], reward: { enemy: [780, 920, 1450], clear: 3600, first: 2900, star: 280 } },
    { id: 19, name: '桜の国', desc: 'はなびらが舞う、ふしぎな和の国', theme: 'sakura',
      enemies: ['ninja', 'oni', 'kyubi'], reward: { enemy: [830, 980, 1550], clear: 3800, first: 3050, star: 295 } },
    { id: 20, name: '恐竜の谷', desc: '太古の生きものが暮らす谷', theme: 'jurassic',
      enemies: ['raptor', 'tricera', 'trex'], reward: { enemy: [880, 1040, 1650], clear: 4000, first: 3200, star: 310 } },
    { id: 21, name: '終焉の世界', desc: 'すべてが終わる場所に、神が待つ', theme: 'chaos',
      enemies: ['fallenangel', 'cerberus', 'chaosgod'], reward: { enemy: [940, 1100, 1800], clear: 4800, first: 3800, star: 350 } }
  ],
  // ガチャは 3 種類。どれも 1 回と 10 回が引ける。min10 は「10 回のうち最低 1 つはこのレア度以上」の保証。
  //   ノーマル: SSR・UR は出ない / レア: R 以上確定で SSR が出る / ウルトラ: SR 以上確定で最高レア UR が出る
  gacha: {
    kinds: {
      // SR は多め、SSR・UR は少なめ（SSR は特に低くしてある）
      normal: { name: 'ノーマル', cost: 100,  cost10: 900,  rates: { N: 58, R: 32, SR: 10 },           min10: 'R' },
      rare:   { name: 'レア',     cost: 500,  cost10: 4500, rates: { R: 71, SR: 26, SSR: 3 },          min10: null },
      ultra:  { name: 'ウルトラ', cost: 1000, cost10: 9000, rates: { SR: 95.8, SSR: 3.5, UR: 0.7 },    min10: null }
    },
    // ピックアップ: SR 以上のレア度ごとに 1 つの装備が、1 時間ごとに入れ替わる。
    // ピックアップ装備は、同じレア度のほかの装備より pickBoost 倍出やすい（レア度全体の確率は変わらない）
    pickBoost: 4,
    pickHours: 1,
    maxPlus: 20,                            // 合体で上げられる +値の上限
    plusBonus: 0.07                         // +1 ごとに装備の効果 +7%（+20 で 2.4 倍）
  },
  // チャレンジモード: 難易度 1〜20。上げるほど敵が強くなり、もらえるコインの倍率が上がる
  //   敵 HP ×(1 + hp×(Lv-1)) / 敵の攻撃力 ×(1 + atk×(Lv-1)) / コイン ×(1 + coin×(Lv-1))
  //   countDrop: [Lv, 減る手数]。敵が行動するまでの手数が減る（最低 2 手）
  challenge: { maxLevel: 20, hp: 0.12, atk: 0.08, coin: 0.26, countDrop: [[8, 1], [15, 2]] },
  // エンドレスモード: 全ステージの敵を弱い順に 1 体ずつ戦い、そのあとも敵が強くなり続ける
  //   最後の敵のあとは、1 ウェーブごとに HP ×overHp / 攻撃力 ×overAtk ずつ強くなり、countEvery ウェーブごとに手数が 1 減る
  //   coinRate: 倒した敵 1 体のコイン（その敵のステージの報酬 × coinRate）
  endless: { overHp: 0.08, overAtk: 0.05, countEvery: 10, coinRate: 0.6, rankSize: 10 },
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
    { id: 'c8', slot: 'acc',    rarity: 'SSR', name: '賢王の冠',       icon: '👑', effects: { combo: .12, comboCap: 6, whole: .30 } },
    // ---- 武器 ----
    { id: 'w7',  slot: 'weapon', rarity: 'N',   name: '狩人の弓',       icon: '🏹', effects: { mul: { attack: .18 } } },
    { id: 'w8',  slot: 'weapon', rarity: 'N',   name: '見習いの杖',     icon: '🔮', effects: { mul: { magic: .22 } } },
    { id: 'w9',  slot: 'weapon', rarity: 'R',   name: '戦斧',           icon: '🪓', effects: { mul: { attack: .38 }, line: .08 } },
    { id: 'w10', slot: 'weapon', rarity: 'R',   name: '毒の短剣',       icon: '🔪', effects: { mul: { poison: .50, attack: .15 } } },
    { id: 'w11', slot: 'weapon', rarity: 'R',   name: '雷の槍',         icon: '🔱', effects: { mul: { attack: .30, charge: .30 } } },
    { id: 'w12', slot: 'weapon', rarity: 'R',   name: '大槌',           icon: '🔨', effects: { mul: { attack: .35, stun: .30 } } },
    { id: 'w13', slot: 'weapon', rarity: 'SR',  name: '氷の剣',         icon: '🧊', effects: { mul: { attack: .40, stun: .40 } } },
    { id: 'w14', slot: 'weapon', rarity: 'SR',  name: '聖剣',           icon: '✨', effects: { mul: { attack: .50, heal: .30 } } },
    { id: 'w15', slot: 'weapon', rarity: 'SSR', name: '星屑の杖',       icon: '🌟', effects: { mul: { magic: 1.10, poison: .60 }, line: .10 } },
    { id: 'w16', slot: 'weapon', rarity: 'SSR', name: '勇者の聖剣',     icon: '⚜️', effects: { mul: { attack: 1.0 }, whole: .30 } },
    // ---- 防具 ----
    { id: 'a6',  slot: 'armor',  rarity: 'N',   name: '革の帽子',       icon: '🎩', effects: { maxHp: 14 } },
    { id: 'a7',  slot: 'armor',  rarity: 'N',   name: '木の盾',         icon: '🪵', effects: { mul: { guard: .30 } } },
    { id: 'a8',  slot: 'armor',  rarity: 'R',   name: '鎖かたびら',     icon: '⛓️', effects: { maxHp: 18, reduce: .06 } },
    { id: 'a9',  slot: 'armor',  rarity: 'R',   name: '癒しのローブ',   icon: '🧥', effects: { mul: { heal: .45 }, healBetween: 8 } },
    { id: 'a10', slot: 'armor',  rarity: 'R',   name: '騎士の兜',       icon: '⛑️', effects: { maxHp: 20, shield: 10 } },
    { id: 'a11', slot: 'armor',  rarity: 'SR',  name: '魔法の外套',     icon: '🌙', effects: { reduce: .12, mul: { magic: .30 } } },
    { id: 'a12', slot: 'armor',  rarity: 'SR',  name: '聖騎士の鎧',     icon: '🏰', effects: { mul: { guard: .70 }, startShield: 12 } },
    { id: 'a13', slot: 'armor',  rarity: 'SR',  name: '不死鳥の羽衣',   icon: '🪶', effects: { mul: { heal: .80 }, healBetween: 20, maxHp: 10 } },
    { id: 'a14', slot: 'armor',  rarity: 'SSR', name: '虹の鎧',         icon: '🌈', effects: { reduce: .25, maxHp: 30, mul: { guard: .60 }, startShield: 15 } },
    { id: 'a15', slot: 'armor',  rarity: 'SSR', name: '天使の祝福',     icon: '👼', effects: { mul: { heal: 1.0 }, healBetween: 30, reduce: .15, shield: 20 } },
    // ---- アクセサリ ----
    { id: 'c9',  slot: 'acc',    rarity: 'N',   name: '銀のブローチ',   icon: '📌', effects: { coin: .15, maxHp: 5 } },
    { id: 'c10', slot: 'acc',    rarity: 'N',   name: '幸運のコイン',   icon: '🍀', effects: { coin: .35 } },
    { id: 'c11', slot: 'acc',    rarity: 'R',   name: 'ルビーの指輪',   icon: '🔴', effects: { mul: { attack: .20 }, combo: .03 } },
    { id: 'c12', slot: 'acc',    rarity: 'R',   name: 'サファイアの指輪', icon: '🔵', effects: { mul: { guard: .30, heal: .20 } } },
    { id: 'c13', slot: 'acc',    rarity: 'R',   name: '巻き貝の笛',     icon: '🐚', effects: { gauge: 40, mul: { charge: .40 } } },
    { id: 'c14', slot: 'acc',    rarity: 'R',   name: '疾風のブーツ',   icon: '👢', effects: { combo: .06, comboCap: 1 } },
    { id: 'c15', slot: 'acc',    rarity: 'SR',  name: '連撃のグローブ', icon: '🥊', effects: { combo: .10, comboCap: 3, line: .10 } },
    { id: 'c16', slot: 'acc',    rarity: 'SR',  name: 'クロノスの懐中時計', icon: '⏱️', effects: { count: 1, combo: .05, comboCap: 2 } },
    { id: 'c17', slot: 'acc',    rarity: 'SR',  name: '黄金のお守り',   icon: '🧿', effects: { coin: .60, maxHp: 20, reduce: .05 } },
    { id: 'c18', slot: 'acc',    rarity: 'SSR', name: '覇者の首飾り',   icon: '💎', effects: { combo: .15, comboCap: 8, line: .20, whole: .20 } },
    { id: 'c19', slot: 'acc',    rarity: 'SSR', name: '時の女神の涙',   icon: '💧', effects: { count: 2, mul: { stun: 1.0 }, gauge: 50 } },
    // ---- UR（ウルトラガチャだけで出る最高レア） ----
    { id: 'w17', slot: 'weapon', rarity: 'UR',  name: '神剣エクスカリバー', icon: '🌠', effects: { mul: { attack: 1.4 }, line: .25, whole: .40 } },
    { id: 'w18', slot: 'weapon', rarity: 'UR',  name: '終焉の杖',       icon: '☄️', effects: { mul: { magic: 1.7, poison: 1.0, stun: .60 }, line: .20 } },
    { id: 'a16', slot: 'armor',  rarity: 'UR',  name: '絶対守護の鎧',   icon: '🔰', effects: { reduce: .30, maxHp: 50, mul: { guard: 1.0 }, startShield: 25, shield: 30 } },
    { id: 'a17', slot: 'armor',  rarity: 'UR',  name: '創世の法衣',     icon: '🪽', effects: { mul: { heal: 1.5 }, healBetween: 40, maxHp: 30, reduce: .15 } },
    { id: 'c20', slot: 'acc',    rarity: 'UR',  name: '王者の王冠',     icon: '🏵️', effects: { combo: .20, comboCap: 10, line: .30, whole: .40 } },
    { id: 'c21', slot: 'acc',    rarity: 'UR',  name: '運命の歯車',     icon: '⚙️', effects: { count: 2, combo: .10, mul: { stun: 1.2 }, gauge: 60, coin: 1.0 } },
    // ---- 追加の装備（魔法系を中心に） ----
    { id: 'w19', slot: 'weapon', rarity: 'N',   name: 'スライムの杖',   icon: '🟢', effects: { mul: { magic: .30 } } },
    { id: 'w20', slot: 'weapon', rarity: 'N',   name: '石の斧',         icon: '🪨', effects: { mul: { attack: .20 } } },
    { id: 'w21', slot: 'weapon', rarity: 'N',   name: '草刈りの鎌',     icon: '🌾', effects: { mul: { attack: .12, poison: .20 } } },
    { id: 'w22', slot: 'weapon', rarity: 'N',   name: '木のこん棒',     icon: '🏏', effects: { mul: { attack: .17, stun: .10 } } },
    { id: 'w23', slot: 'weapon', rarity: 'R',   name: '炎の魔導書',     icon: '📕', effects: { mul: { magic: .55, poison: .20 } } },
    { id: 'w24', slot: 'weapon', rarity: 'R',   name: '氷の魔導書',     icon: '📘', effects: { mul: { magic: .50, stun: .30 } } },
    { id: 'w25', slot: 'weapon', rarity: 'R',   name: '雷の魔導書',     icon: '📙', effects: { mul: { magic: .50, charge: .40 } } },
    { id: 'w26', slot: 'weapon', rarity: 'R',   name: '双剣',           icon: '🤺', effects: { mul: { attack: .32 }, combo: .03 } },
    { id: 'w27', slot: 'weapon', rarity: 'R',   name: '連弩',           icon: '🎯', effects: { mul: { attack: .30 }, line: .10 } },
    { id: 'w28', slot: 'weapon', rarity: 'SR',  name: '大魔導の杖',     icon: '🧙', effects: { mul: { magic: 1.0 }, line: .08 } },
    { id: 'w29', slot: 'weapon', rarity: 'SR',  name: '月光の杖',       icon: '🌛', effects: { mul: { magic: .90, heal: .35 } } },
    { id: 'w30', slot: 'weapon', rarity: 'SR',  name: '毒薬の杖',       icon: '🧪', effects: { mul: { magic: .80, poison: .80 } } },
    { id: 'w31', slot: 'weapon', rarity: 'SR',  name: '破邪の剣',       icon: '🔆', effects: { mul: { attack: .55 }, whole: .20 } },
    { id: 'w32', slot: 'weapon', rarity: 'SR',  name: '疾風の双剣',     icon: '💨', effects: { mul: { attack: .45 }, combo: .06, comboCap: 2 } },
    { id: 'w33', slot: 'weapon', rarity: 'SSR', name: '星詠みの杖',     icon: '🔭', effects: { mul: { magic: 1.5 }, line: .14 } },
    { id: 'w34', slot: 'weapon', rarity: 'SSR', name: '魔王の杖',       icon: '👿', effects: { mul: { magic: 1.7, poison: .50 }, whole: .20 } },
    { id: 'w35', slot: 'weapon', rarity: 'SSR', name: '賢者の書',       icon: '📜', effects: { mul: { magic: 1.4, stun: .50 }, gauge: 30 } },
    { id: 'w36', slot: 'weapon', rarity: 'SSR', name: '炎竜の大剣',     icon: '♨️', effects: { mul: { attack: 1.0 }, line: .15 } },
    { id: 'w37', slot: 'weapon', rarity: 'SSR', name: '雷神の槌',       icon: '🌩️', effects: { mul: { attack: .80, stun: .60, charge: .60 } } },
    { id: 'w38', slot: 'weapon', rarity: 'UR',  name: '天空の大杖',     icon: '🌌', effects: { mul: { magic: 2.3 }, line: .25, whole: .30 } },
    { id: 'w39', slot: 'weapon', rarity: 'UR',  name: '魔神の書',       icon: '📚', effects: { mul: { magic: 2.1, poison: 1.2, stun: .80 }, gauge: 40 } },
    { id: 'w40', slot: 'weapon', rarity: 'UR',  name: '破壊神の剣',     icon: '💥', effects: { mul: { attack: 1.6 }, line: .30, whole: .50 } },
    { id: 'a18', slot: 'armor',  rarity: 'N',   name: '旅人の服',       icon: '🧣', effects: { maxHp: 14 } },
    { id: 'a19', slot: 'armor',  rarity: 'N',   name: '見習いの帽子',   icon: '🎓', effects: { mul: { magic: .22 }, maxHp: 6 } },
    { id: 'a20', slot: 'armor',  rarity: 'N',   name: '小さな盾',       icon: '🥏', effects: { mul: { guard: .28 } } },
    { id: 'a21', slot: 'armor',  rarity: 'R',   name: '魔導士のローブ', icon: '🧙', effects: { mul: { magic: .45 }, maxHp: 12 } },
    { id: 'a22', slot: 'armor',  rarity: 'R',   name: '重騎士の鎧',     icon: '🦾', effects: { maxHp: 22, reduce: .08 } },
    { id: 'a23', slot: 'armor',  rarity: 'R',   name: '賢者の帽子',     icon: '👒', effects: { mul: { magic: .38, heal: .25 } } },
    { id: 'a24', slot: 'armor',  rarity: 'R',   name: '防壁の盾',       icon: '🧱', effects: { mul: { guard: .55 }, shield: 10 } },
    { id: 'a25', slot: 'armor',  rarity: 'SR',  name: '大魔導のマント', icon: '🦇', effects: { mul: { magic: .80 }, reduce: .08, startShield: 8 } },
    { id: 'a26', slot: 'armor',  rarity: 'SR',  name: '氷結の鎧',       icon: '❄️', effects: { mul: { guard: .60 }, reduce: .10 } },
    { id: 'a27', slot: 'armor',  rarity: 'SR',  name: '星のローブ',     icon: '💫', effects: { mul: { magic: .70, heal: .50 }, maxHp: 12 } },
    { id: 'a28', slot: 'armor',  rarity: 'SR',  name: '勇者の鎧',       icon: '🥇', effects: { maxHp: 28, reduce: .12, mul: { guard: .30 } } },
    { id: 'a29', slot: 'armor',  rarity: 'SSR', name: '魔王のマント',   icon: '🧛', effects: { mul: { magic: 1.3 }, reduce: .18, maxHp: 20 } },
    { id: 'a30', slot: 'armor',  rarity: 'SSR', name: '聖女のドレス',   icon: '👗', effects: { mul: { heal: .90, magic: .70 }, healBetween: 25, maxHp: 20 } },
    { id: 'a31', slot: 'armor',  rarity: 'SSR', name: '不滅の鎧',       icon: '⚓', effects: { reduce: .28, maxHp: 40, mul: { guard: .50 } } },
    { id: 'a32', slot: 'armor',  rarity: 'UR',  name: '星海のローブ',   icon: '🌃', effects: { mul: { magic: 2.0 }, reduce: .20, maxHp: 40, startShield: 20 } },
    { id: 'a33', slot: 'armor',  rarity: 'UR',  name: '神竜の鎧',       icon: '🏯', effects: { reduce: .35, maxHp: 60, mul: { guard: 1.2 }, shield: 35, startShield: 25 } },
    { id: 'a34', slot: 'armor',  rarity: 'UR',  name: '輪廻の衣',       icon: '♾️', effects: { mul: { heal: 1.6, magic: 1.0 }, healBetween: 45, maxHp: 40 } },
    { id: 'c22', slot: 'acc',    rarity: 'N',   name: '見習いの指輪',   icon: '🔹', effects: { mul: { magic: .22 } } },
    { id: 'c23', slot: 'acc',    rarity: 'N',   name: '赤いリボン',     icon: '🎀', effects: { mul: { attack: .12 }, coin: .10 } },
    { id: 'c24', slot: 'acc',    rarity: 'N',   name: '鉄の腕輪',       icon: '🔘', effects: { mul: { guard: .20 }, maxHp: 6 } },
    { id: 'c25', slot: 'acc',    rarity: 'N',   name: '勇気のバッジ',   icon: '🎗️', effects: { mul: { attack: .14 }, maxHp: 6 } },
    { id: 'c26', slot: 'acc',    rarity: 'R',   name: '魔力の指輪',     icon: '🟣', effects: { mul: { magic: .45 }, gauge: 15 } },
    { id: 'c27', slot: 'acc',    rarity: 'R',   name: '賢者のイヤリング', icon: '🔶', effects: { mul: { magic: .38, poison: .30 } } },
    { id: 'c28', slot: 'acc',    rarity: 'R',   name: '星のペンダント', icon: '⭐', effects: { mul: { magic: .40 }, combo: .04 } },
    { id: 'c29', slot: 'acc',    rarity: 'R',   name: '友情のブレスレット', icon: '🤝', effects: { combo: .06, comboCap: 1, maxHp: 8 } },
    { id: 'c30', slot: 'acc',    rarity: 'SR',  name: '魔導の首飾り',   icon: '🔷', effects: { mul: { magic: .85 }, line: .10 } },
    { id: 'c31', slot: 'acc',    rarity: 'SR',  name: '紫水晶のお守り', icon: '🟪', effects: { mul: { magic: .70, stun: .50 }, gauge: 20 } },
    { id: 'c32', slot: 'acc',    rarity: 'SR',  name: '充電池',         icon: '🔋', effects: { mul: { charge: .90, attack: .20 }, gauge: 40 } },
    { id: 'c33', slot: 'acc',    rarity: 'SR',  name: '騎士の紋章',     icon: '🎖️', effects: { mul: { attack: .35, guard: .35 }, maxHp: 10 } },
    { id: 'c34', slot: 'acc',    rarity: 'SSR', name: '魔女の水晶',     icon: '🥽', effects: { mul: { magic: 1.4, poison: .60 }, combo: .08, comboCap: 3 } },
    { id: 'c35', slot: 'acc',    rarity: 'SSR', name: '大賢者の指輪',   icon: '💠', effects: { mul: { magic: 1.3 }, line: .18, whole: .20, combo: .06 } },
    { id: 'c36', slot: 'acc',    rarity: 'SSR', name: '黄金の砂時計',   icon: '🕰️', effects: { count: 1, mul: { stun: .80 }, combo: .10, comboCap: 4, gauge: 30 } },
    { id: 'c37', slot: 'acc',    rarity: 'UR',  name: '魔導王の証',     icon: '🎇', effects: { mul: { magic: 2.2 }, combo: .18, comboCap: 10, line: .25, whole: .30 } },
    { id: 'c38', slot: 'acc',    rarity: 'UR',  name: '星々の加護',     icon: '🪐', effects: { mul: { magic: 1.2, attack: .80, heal: .60, guard: .60 }, count: 1 } },
    { id: 'c39', slot: 'acc',    rarity: 'UR',  name: '黄金の聖杯',     icon: '🏆', effects: { coin: 1.5, combo: .15, comboCap: 8, gauge: 70, count: 1 } }
  ],
  // いろがえしたマスの基礎値
  buddyBase: { attack: 3, magic: 3, heal: 3, guard: 3, poison: 1, charge: 4, stun: 0.2 },
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
    { id: 'rainbow', name: 'にじいろリュウ',   emoji: '🦕', rarity: 'UR',  skill: { type: 'recolorAll' } },
    // ---- N ----
    { id: 'penguin', name: 'ペンペン',         emoji: '🐧', rarity: 'N',   skill: { type: 'shield', v: 40 } },
    { id: 'hamster', name: 'ハムスター',       emoji: '🐹', rarity: 'N',   skill: { type: 'charge', v: 40 } },
    { id: 'frog',    name: 'どくガエル',       emoji: '🐸', rarity: 'N',   skill: { type: 'poison', v: 9 } },
    { id: 'chick',   name: 'ヒヨコ',           emoji: '🐥', rarity: 'N',   skill: { type: 'heal', v: 25 } },
    // ---- R ----
    { id: 'rabbit',  name: 'ウサギ',           emoji: '🐰', rarity: 'R',   skill: { type: 'combo', v: 3 } },
    { id: 'fox',     name: 'キツネ',           emoji: '🦊', rarity: 'R',   skill: { type: 'paintCol' } },
    { id: 'wolf',    name: 'オオカミ',         emoji: '🐺', rarity: 'R',   skill: { type: 'strike', v: 28 } },
    { id: 'bee',     name: 'ハチ',             emoji: '🐝', rarity: 'R',   skill: { type: 'burst', v: 4 } },
    { id: 'crab',    name: 'カニ',             emoji: '🦀', rarity: 'R',   skill: { type: 'fortify', v: 5 } },
    // ---- SR ----
    { id: 'tiger',   name: 'トラ',             emoji: '🐯', rarity: 'SR',  skill: { type: 'laserV' } },
    { id: 'panda',   name: 'パンダ',           emoji: '🐼', rarity: 'SR',  skill: { type: 'bloom', v: 6 } },
    { id: 'octopus', name: 'タコ',             emoji: '🐙', rarity: 'SR',  skill: { type: 'stun', v: 3 } },
    { id: 'whale',   name: 'クジラ',           emoji: '🐋', rarity: 'SR',  skill: { type: 'heal', v: 60 } },
    // ---- SSR ----
    { id: 'lion',    name: 'ライオン',         emoji: '🦁', rarity: 'SSR', skill: { type: 'combo', v: 6 } },
    { id: 'ryuou',   name: 'りゅうおう',       emoji: '🐉', rarity: 'SSR', skill: { type: 'strike', v: 90 } },
    { id: 'kraken',  name: 'クラーケン',       emoji: '🦑', rarity: 'SSR', skill: { type: 'burst', v: 8 } },
    // ---- 追加（N） ----
    { id: 'dog',     name: 'ポチ',             emoji: '🐶', rarity: 'N',   skill: { type: 'shield', v: 30 } },
    { id: 'pig',     name: 'ブタさん',         emoji: '🐷', rarity: 'N',   skill: { type: 'heal', v: 30 } },
    { id: 'cow',     name: 'ウシさん',         emoji: '🐄', rarity: 'N',   skill: { type: 'charge', v: 45 } },
    { id: 'worm',    name: 'ケムシ',           emoji: '🐛', rarity: 'N',   skill: { type: 'poison', v: 7 } },
    // ---- 追加（R） ----
    { id: 'hedgehog', name: 'ハリネズミ',      emoji: '🦔', rarity: 'R',   skill: { type: 'fortify', v: 6 } },
    { id: 'squirrel', name: 'リス',            emoji: '🐿️', rarity: 'R',   skill: { type: 'combo', v: 3 } },
    { id: 'duck',    name: 'アヒル',           emoji: '🦆', rarity: 'R',   skill: { type: 'stun', v: 2 } },
    { id: 'croc',    name: 'ワニ',             emoji: '🐊', rarity: 'R',   skill: { type: 'strike', v: 32 } },
    { id: 'bat',     name: 'コウモリ',         emoji: '🦇', rarity: 'R',   skill: { type: 'recolor' } },
    // ---- 追加（SR） ----
    { id: 'peacock', name: 'クジャク',         emoji: '🦚', rarity: 'SR',  skill: { type: 'bloom', v: 7 } },
    { id: 'elephant', name: 'ゾウ',            emoji: '🐘', rarity: 'SR',  skill: { type: 'strike', v: 55 } },
    { id: 'shark',   name: 'サメ',             emoji: '🦈', rarity: 'SR',  skill: { type: 'burst', v: 6 } },
    { id: 'deer',    name: 'シカ',             emoji: '🦌', rarity: 'SR',  skill: { type: 'fortify', v: 8 } },
    // ---- 追加（SSR） ----
    { id: 'trex',    name: 'ティラノ',         emoji: '🦖', rarity: 'SSR', skill: { type: 'strike', v: 100 } },
    { id: 'swan',    name: 'ハクチョウ',       emoji: '🦢', rarity: 'SSR', skill: { type: 'rebirth', v: 80 } },
    { id: 'bison',   name: 'バイソン',         emoji: '🦬', rarity: 'SSR', skill: { type: 'burst', v: 10 } },
    // ---- 追加（UR: にじいろリュウも UR） ----
    { id: 'galaxy',  name: 'ぎんがクジラ',     emoji: '🐳', rarity: 'UR',  skill: { type: 'overdrive', v: 2 } },   // このターンの攻撃・魔法が ×2（Lv で上がる）
    { id: 'genie',   name: 'ブロックのまじん', emoji: '🧞', rarity: 'UR',  skill: { type: 'summon' } },             // 好きな色の 3×3 ブロックをつくる
    { id: 'angel',   name: 'てんしさま',       emoji: '👼', rarity: 'UR',  skill: { type: 'blessing', v: 120 } }   // HP・シールド全回復 + 状態異常を消す + 足止め + ダメージ
  ],
  // スカウト場に並ぶバディのレア度。クリアしたステージ数（0〜11）が進むほど、いいバディが出やすくなる
  // minRarity: その進行度で、3 匹のうち少なくとも 1 匹はこのレア度以上にする
  scout: {
    maxLevel: 5, dupCoins: 75, candidates: 3,
    ratesByTier: [
      { N: 70, R: 26, SR: 4,  SSR: 0,  UR: 0 },    // 0: まだ 1 つもクリアしていない
      { N: 58, R: 31, SR: 10, SSR: 1,  UR: 0 },    // 1
      { N: 46, R: 35, SR: 16, SSR: 3,  UR: 0 },    // 2
      { N: 36, R: 37, SR: 22, SSR: 5,  UR: 0 },    // 3
      { N: 26, R: 38, SR: 28, SSR: 8,  UR: 0 },    // 4
      { N: 16, R: 38, SR: 34, SSR: 12, UR: 0 },    // 5
      { N: 10, R: 34, SR: 37, SSR: 18, UR: 1 },    // 6
      { N: 8,  R: 30, SR: 40, SSR: 20, UR: 2 },    // 7
      { N: 6,  R: 28, SR: 42, SSR: 21, UR: 3 },    // 8
      { N: 4,  R: 26, SR: 43, SSR: 23, UR: 4 },    // 9
      { N: 3,  R: 24, SR: 44, SSR: 24, UR: 5 },    // 10
      { N: 2,  R: 22, SR: 44, SSR: 26, UR: 6 }     // 11: 終盤
    ],
    minRarity: ['N', 'R', 'R', 'SR', 'SR', 'SR', 'SR', 'SR', 'SR', 'SR', 'SR', 'SR']
  }
};

BB.data.buddyMap = {};
BB.data.buddies.forEach(b => { BB.data.buddyMap[b.id] = b; });

// 装備の全体強化: 効果の数値を一律に引き上げる（手数 count はそのまま）
(function buffEquipment() {
  const MAGIC_BUFF = 4.2;
  const up = (v, k) => Math.round(v * k * 100) / 100;
  BB.data.equipment.forEach(e => {
    const f = e.effects;
    Object.keys(f.mul || {}).forEach(a => { f.mul[a] = up(f.mul[a], 1.3); });
    ['combo', 'line', 'whole'].forEach(k => { if (f[k]) f[k] = up(f[k], 1.3); });
    if (f.reduce) f.reduce = up(f.reduce, 1.2);
    ['maxHp', 'shield', 'startShield', 'gauge', 'healBetween'].forEach(k => { if (f[k]) f[k] = Math.round(f[k] * 1.3); });
    if (f.comboCap) f.comboCap = Math.round(f.comboCap * 1.25);
    if (f.mul && f.mul.magic) f.mul.magic = up(f.mul.magic, MAGIC_BUFF);   // 魔法系は特にさらに強化
  });
})();

// 形の回転ぶんも手札に出るようにする。I 型は縦横が最初から別なので対象外。
// 同じ形の合計の出やすさは変えず、向きの数で割り振る。
(function addRotations() {
  const norm = cells => {
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  };
  const rot90 = cells => { const h = Math.max(...cells.map(c => c[1])); return cells.map(([x, y]) => [h - y, x]); };
  const key = cells => cells.map(c => c.join(',')).join(';');
  const out = [];
  BB.data.pieces.forEach(p => {
    if (/^I\d/.test(p.id) || p.id === 'dot') { out.push(p); return; }
    const seen = new Map();
    let cells = p.cells;
    for (let r = 0; r < 4; r++) {
      const n = norm(cells), k = key(n);
      if (!seen.has(k)) seen.set(k, n);
      cells = rot90(cells);
    }
    [...seen.values()].forEach((v, i, all) => out.push(Object.assign({}, p, { id: i ? p.id + '_r' + i : p.id, cells: i ? v : p.cells, weight: p.weight / all.length })));
  });
  BB.data.pieces = out;
})();
