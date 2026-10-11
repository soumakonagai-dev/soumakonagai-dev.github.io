'use strict';
// ====== データ（材料・お店・お客さん・設備・従業員）======
// 新しい材料は addItem と SHOPS の stock に足すだけで増やせる

const TRAITS = ['nettori', 'danryoku', 'torotoro', 'fuwafuwa'];
const TRAIT_NAME = { nettori: 'のびのび', danryoku: 'ぷにぷに', torotoro: 'とろとろ', fuwafuwa: 'ふわふわ' };
const TRAIT_DESC = { nettori: 'ねっとりよく伸びる', danryoku: '弾力が強くて跳ね返る', torotoro: 'トロトロ流れる', fuwafuwa: '泡みたいに軽い' };
const QMULT = { C: 0.8, B: 1, A: 1.35, S: 1.8 };
const BASE_PRICE = 180;
const JAR_ML = 70;           // 1個のスライムに使う量

const PAINTS = {
  red: ['あか', '#e8383d'], blue: ['あお', '#2f6fe0'], yellow: ['きいろ', '#f5d327'],
  white: ['しろ', '#fbfbfb'], green: ['みどり', '#35b85a'], pink: ['ピンク', '#ff8fc0'], black: ['くろ', '#262626'],
};
const GLITTERS = {
  gold: ['ゴールド', '#ffd24a'], silver: ['シルバー', '#d8dde6'], pink: ['ピンク', '#ff6fb5'],
  blue: ['ブルー', '#58a8ff'], green: ['グリーン', '#5ee08a'], rainbow: ['レインボー', '#d58cff'],
};

const ITEMS = {};
function addItem(id, o) { ITEMS[id] = o; }
// rate = 全開で注ぐときの速さ（ml/秒）。ノリはゆっくり、水はさっと
addItem('glue_cheap', { name: '洗濯ノリ（お徳用）', kind: 'glue', unit: 'ml', stab: 0.6, rate: 40, color: '#f3f1ea', icon: '🧴', w: 1, note: 'やすい。限界がぶれやすい' });
addItem('glue_pro', { name: '洗濯ノリ（ふんわり上質）', kind: 'glue', unit: 'ml', stab: 1.0, rate: 40, color: '#fffdf4', icon: '🧴', w: 1, note: '安定。ギリギリの帯が広い' });
addItem('borax', { name: 'ホウ砂水', kind: 'borax', unit: 'ml', rate: 24, color: '#cfe9ff', icon: '🧪', w: 1, note: '入れるとノリが固まる' });
addItem('water', { name: '水', kind: 'water', unit: 'ml', rate: 60, color: '#bfe3ff', icon: '💧', w: 1, free: true, note: '水道の水。いくらでも使える' });
addItem('soap', { name: 'ハンドソープ（泡）', kind: 'soap', unit: 'ml', rate: 36, color: '#ffffff', icon: '🫧', w: 1, note: '泡を入れる' });
for (const k in PAINTS) addItem('paint_' + k, { name: `絵具（${PAINTS[k][0]}）`, kind: 'paint', unit: '回', rate: 4, color: PAINTS[k][1], icon: '🎨', w: 5, note: '色をつける' });
addItem('snow_powder', { name: 'スノーパウダー', kind: 'snow', unit: '回', rate: 4, color: '#ffffff', icon: '❄️', w: 5, note: 'シャリシャリになる。入れすぎてもOKだけど、そのぶん高くなる' });
addItem('glow_powder', { name: '蓄光パウダー', kind: 'glow', unit: '回', rate: 4, color: '#c8ff8a', icon: '🌙', w: 5, note: '暗いところで光る。入れるほど強く光るけど、とても高くなる' });
// スライムエキス（冒険で魔物からとれる）。入れると価値が上がる
const EXTRACTS = {
  normal: ['スライムエキス', '#8fe8b8', '魔物からとれる。入れると少し価値が上がる', 0.10],
  puni: ['ぷにぷにエキス', '#ff8fc0', 'ぷにぷに好きに人気。入れると価値が上がる', 0.16],
  nobi: ['のびのびエキス', '#6fa8ff', 'のびのび好きに人気。入れると価値が上がる', 0.16],
  toro: ['とろとろエキス', '#7be0ff', 'ASMR配信者に人気。入れると価値が上がる', 0.16],
  fuwa: ['ふわふわエキス', '#ffffff', '学生とASMR配信者に人気。入れると価値が上がる', 0.16],
  hikari: ['ヒカリエキス', '#d8ff6a', '暗いところで光る！ 入れると少し光る', 0.12],
  fire: ['炎のエキス', '#ff8a4a', '入れると「ほかほか」あったかい感触になる', 0.35],
  ice: ['氷のエキス', '#aee8ff', '入れると「ひんやり」つめたい感触になる', 0.35],
  thunder: ['雷のエキス', '#ffee55', '入れると「ぴりぴり」しびれる感触になる', 0.35],
  fizz: ['しゅわしゅわエキス', '#7fffd4', '入れると「しゅわしゅわ」泡がはじける感触になる', 0.3],
  mochi: ['もちもちエキス', '#ffd6e8', '入れると「もちもち」のびてはずむ感触になる', 0.3],
  secret: ['秘伝のスライムエキス', '#ffd24a', 'VIPが大金を出す伝説のエキス。入れすぎはもったいない', 14],
};
for (const k in EXTRACTS) addItem('extract_' + k, { name: EXTRACTS[k][0], kind: 'extract', ex: k, unit: '回', rate: 4, color: EXTRACTS[k][1], icon: k === 'secret' ? '🏺' : '🧪', w: 5, note: EXTRACTS[k][2] });
// スポンサー商品（PRすると、メーカーが開発して、ホームセンターで買えるようになる）
addItem('glue_silk', { name: 'ふわり絹ノリ', kind: 'glue', unit: 'ml', stab: 1.15, rate: 40, color: '#fff5f8', icon: '🧴', w: 1, ft: { sarasara: 1 }, note: '「さらさら」の感触になる。限界が安定' });
addItem('glue_gel', { name: 'ぷるジェルノリ', kind: 'glue', unit: 'ml', stab: 1.3, rate: 40, color: '#e8fff6', icon: '🧴', w: 1, ft: { kunyu: 1 }, note: '「くにゅくにゅ」の感触になる。かなり安定' });
addItem('borax_mild', { name: 'やさしいホウ砂水', kind: 'borax', unit: 'ml', rate: 24, color: '#d9f0ff', icon: '🧪', w: 1, edge: 1.5, note: 'ギリギリの幅が1.5倍に広がる' });
addItem('borax_fine', { name: '精密ホウ砂水', kind: 'borax', unit: 'ml', rate: 24, color: '#c8e8ff', icon: '🧪', w: 1, edge: 2.1, note: 'ギリギリの幅が約2倍に広がる' });
addItem('soap_cloud', { name: 'クラウドソープ', kind: 'soap', unit: 'ml', rate: 36, color: '#f4fbff', icon: '🫧', w: 1, edge: 1.6, note: '泡のギリギリの幅が広がる' });
addItem('soap_pop', { name: 'はじけるソープ', kind: 'soap', unit: 'ml', rate: 36, color: '#fff0fb', icon: '🫧', w: 1, edge: 1.3, ft: { pachi: 1 }, note: '「ぱちぱち」の感触になる' });
addItem('glitter_holo', { name: 'ホログラムラメ', kind: 'glitter', unit: '回', rate: 4, color: '#d8f0ff', icon: '💎', w: 5, note: '色が七色にかわるラメ' });
addItem('paint_neon', { name: '蛍光ペイント', kind: 'paint', unit: '回', rate: 4, color: '#39ff88', icon: '🎨', w: 5, note: 'ネオンみたいな、あざやかな色' });
for (const k in GLITTERS) addItem('glitter_' + k, { name: `ラメ（${GLITTERS[k][0]}）`, kind: 'glitter', unit: '回', rate: 4, color: GLITTERS[k][1], icon: '✨', w: 5, note: 'キラキラ' });

// stock: [材料ID, 1パックの量, 値段]
const SHOPS = {
  hyakkin: {
    name: '100円ショップ「まるえん」', short: '100均', floor: 0xf1e3c4, wall: 0xffe08a,
    stock: [['glue_cheap', 500, 110], ['borax', 150, 130], ['soap', 250, 110],
      ['glitter_gold', 10, 110], ['glitter_silver', 10, 110], ['snow_powder', 10, 130], ['glow_powder', 10, 180],
      ['paint_red', 10, 110], ['paint_blue', 10, 110], ['paint_yellow', 10, 110], ['paint_white', 10, 110]],
  },
  home: {
    name: 'ホームセンター「ガッツ」', short: 'ホームセンター', floor: 0xcfd6dc, wall: 0xb9d3ee,
    stock: [['glue_cheap', 1000, 190], ['glue_pro', 1000, 450], ['borax', 500, 300], ['soap', 500, 200]],
  },
  art: {
    name: '画材屋「いろどり」', short: '画材屋', floor: 0xefe6f5, wall: 0xf3c6e6,
    stock: [...Object.keys(PAINTS).map(k => ['paint_' + k, 20, 160]), ...Object.keys(GLITTERS).map(k => ['glitter_' + k, 20, 150])],
  },
  wholesale: {
    name: '問屋「どんどん商会」', short: '問屋', floor: 0xd9d2c4, wall: 0xc9e6c0, needRep: 3,
    stock: [['glue_cheap', 5000, 850], ['glue_pro', 5000, 1800], ['borax', 2000, 900], ['soap', 2000, 700],
      ...['red', 'blue', 'yellow', 'white'].map(k => ['paint_' + k, 100, 650]),
      ...['gold', 'silver'].map(k => ['glitter_' + k, 100, 600]), ['snow_powder', 100, 1100], ['glow_powder', 100, 1600]],
  },
};

// ---- お客さん ----
// like(スライム) = その人が「定価の何倍まで出すか」の目安
const glowLike = (sl, k) => (sl.gl || 0) >= 0.5 ? k * Math.min(1, (sl.gl || 0) / 3) + 0.3 : 0;   // 光るスライムが好きな人向け
// エキスで生まれる新しい感触（スライムの手ざわり・音・見た目が変わる）
const FEEL2 = {
  hokaho: { name: 'ほかほか', ex: 'fire', desc: 'あったかくて、やさしい' },
  hiyari: { name: 'ひんやり', ex: 'ice', desc: 'つめたくて、シャキッとしている' },
  piri: { name: 'ぴりぴり', ex: 'thunder', desc: 'ときどき しびれて ビリッとする' },
  shuwa: { name: 'しゅわしゅわ', ex: 'fizz', desc: '泡がしゅわしゅわはじける' },
  mochi: { name: 'もちもち', ex: 'mochi', desc: 'ものすごくのびて、はずむ' },
  sarasara: { name: 'さらさら', ex: null, desc: 'さらさらして気持ちいい' },
  kunyu: { name: 'くにゅくにゅ', ex: null, desc: 'くにゅっと曲がって、はずむ' },
  pachi: { name: 'ぱちぱち', ex: null, desc: 'ぱちぱち音がはじける' },
};
const ftv = (sl, k) => ((sl.ft || {})[k]) || 0;
const ftSum = (sl, ks) => ks.reduce((a, k) => a + ftv(sl, k), 0);
const hasTrait = (sl, t, min = 0.25) => (sl.traits[t] || 0) >= min;
const CUSTOMERS = {
  kid: {
    name: 'こども', icon: '🧒', budget: 260, w: (r, rain) => 5 * (rain ? 0.5 : 1),
    desc: 'ふつうのスライムとカラフルなラメ入り、暗いところで光るスライムが好き。お金は少なめ',
    like: sl => 1.1 + 0.4 * ftv(sl, 'shuwa') + 0.3 * ftv(sl, 'piri') + (sl.sp >= 2 ? 0.3 : 0) + (sl.sat > 0.55 ? 0.15 : 0) - (TRAITS.some(t => sl.traits[t] > 0) ? 0.1 : 0) + glowLike(sl, 0.55),
  },
  student: {
    name: '学生', icon: '👩‍🎓', budget: 450, w: () => 3,
    desc: 'ふわふわとパステルカラーが好き。流行に敏感',
    like: sl => 1.0 + (hasTrait(sl, 'fuwafuwa', 0.05) ? 0.9 : 0) + (sl.light > 0.75 ? 0.35 : 0),
  },
  nobi: {
    name: 'のびのび好き', icon: '🧑‍🎨', budget: 900, w: r => 1 + 0.5 * r,
    desc: 'よく伸びる「のびのび」が大好き。限界ギリギリほど高く買う',
    like: sl => hasTrait(sl, 'nettori', 0.05) ? 1.3 + 1.2 * sl.traits.nettori : 0.85,
  },
  puni: {
    name: 'ぷにぷに好き', icon: '🧑‍🔬', budget: 900, w: r => 1 + 0.5 * r,
    desc: '弾力のある「ぷにぷに」が大好き。限界ギリギリほど高く買う',
    like: sl => hasTrait(sl, 'danryoku', 0.05) ? 1.3 + 1.2 * sl.traits.danryoku : 0.85,
  },
  asmr: {
    name: 'ASMR配信者', icon: '🎙️', budget: 1600, needRep: 2, w: (r, rain) => 0.6 * r * (rain ? 2 : 1),
    desc: '音がいい「とろとろ」「ふわふわ」「シャリシャリ」を探している。高く買う',
    like: sl => 0.75 + (hasTrait(sl, 'torotoro', 0.05) ? 0.9 + sl.traits.torotoro : 0) + (hasTrait(sl, 'fuwafuwa', 0.05) ? 0.6 + sl.traits.fuwafuwa * 0.6 : 0) + 1.1 * (sl.crunch || 0) + 0.9 * ftSum(sl, ['shuwa', 'hiyari', 'piri', 'mochi']),
    multi: true,
  },
  family: {
    name: '子連れ', icon: '👨‍👧', budget: 1300, needRep: 2, w: (r, rain) => (0.7 + 0.35 * r) * (rain ? 0.6 : 1), multi: true,
    desc: 'お子さんが喜ぶ「暗いところで光る」スライムが大好き。ちょっと高くても買う',
    like: sl => 0.85 + 0.4 * ftSum(sl, ['hiyari', 'shuwa']) + glowLike(sl, 1.5) + (sl.sp >= 2 ? 0.2 : 0) + (sl.sat > 0.55 ? 0.1 : 0),
  },
  vip: {
    name: 'VIP', icon: '🎩', budget: 90000, special: true, w: () => 0,
    desc: '「秘伝のスライムエキス」入りを探している大金持ち。見つけると、なんと競りが始まる！',
    like: sl => (sl.sec || 0) > 0.2 ? 6 : 0.05,
  },
  collector: {
    name: 'コレクター', icon: '🧐', budget: 3500, needRep: 3, w: r => 0.45 * (r - 2),
    desc: '2つ以上の個性が混ざった珍しいスライムやSランクを集めている',
    like: sl => 0.6 + 0.55 * Object.keys(sl.ft || {}).length + (TRAITS.filter(t => sl.traits[t] > 0).length >= 2 ? 1.3 : 0) + (sl.q === 'S' ? 0.9 : sl.q === 'A' ? 0.3 : 0),
    multi: true,
  },
};
const REP_STEPS = [0, 40, 120, 300, 700];   // ★1〜★5になる評判ポイント

// ---- 設備 ----
const TOOL_LV = [
  { name: '目分量', cost: 0, desc: 'ボウルの中のおおよその量しか分からない' },
  { name: '計量カップ', cost: 1500, desc: '10ml刻みで量が分かる' },
  { name: 'デジタルスケール', cost: 8000, desc: '0.1ml単位で量と「ノリ100あたり」の割合が分かる' },
  { name: '「ギリギリ」センサー', cost: 40000, desc: '今日の失敗ラインと現在地がメーターで見える' },
];
const BOWL_CAP = [{ v: 500, cost: 0 }, { v: 1000, cost: 2500 }, { v: 2000, cost: 9000 }, { v: 4000, cost: 30000 }];
const SHELF_N = [{ v: 3, cost: 0 }, { v: 5, cost: 2000 }, { v: 8, cost: 7000 }, { v: 12, cost: 20000 }];
const STORE_CAP = [{ v: 4000, cost: 0 }, { v: 10000, cost: 1800 }, { v: 25000, cost: 8000 }, { v: 60000, cost: 22000 }];
const BAG = [
  { name: '手さげ', v: 1500, speed: 5, cost: 0 }, { name: 'リュック', v: 3500, speed: 5.5, cost: 1200 },
  { name: '自転車', v: 8000, speed: 8.5, cost: 6000 }, { name: '軽トラック', v: 20000, speed: 13, cost: 35000 },
];
const SIGN = [{ name: 'なし', v: 1, cost: 0 }, { name: '手書き看板', v: 1.25, cost: 3000 }, { name: 'ネオン看板', v: 1.55, cost: 12000 }, { name: '巨大スライム像', v: 2, cost: 50000 }];
const RENT = 500;

// ---- 冒険：武器（エンジニアの友達の家）----
const ELEMENTS = {
  fire: { name: '炎', icon: '🔥', color: 0xff6a2a, desc: 'やけどで、じわじわダメージ' },
  ice: { name: '氷', icon: '❄️', color: 0x8fe0ff, desc: '敵の動きがおそくなる' },
  thunder: { name: '雷', icon: '⚡', color: 0xffe83a, desc: 'まわりの敵にもビリビリ走る' },
  water: { name: '水', icon: '💧', color: 0x4aa0ff, desc: 'ふっとばす。ぬれた敵に雷が効く' },
  poison: { name: '毒', icon: '☠', color: 0xa84fd8, desc: 'どくで、じわじわダメージ' },
  light: { name: '光', icon: '✨', color: 0xfff2a0, desc: 'クリティカルが出やすい。かげに強い' },
};
// unlock: 解放の条件（S.flags）。king=ヌシ、ice/fire=洞窟のボス、secret=ひみつの洞窟、both=氷と火の洞窟
const WEAPONS = [
  { id: 'broom', name: 'ほうき', price: 0, atk: 4, reach: 2.0, arc: 110, cd: 0.45, color: 0xc8a070, desc: '最初からある。ちょっと頼りない' },
  { id: 'wood', name: '木の剣', price: 800, atk: 7, reach: 2.3, arc: 100, cd: 0.4, color: 0xd9a86a, desc: 'ふつうに使いやすい' },
  { id: 'iron', name: '鉄の剣', price: 2500, atk: 12, reach: 2.5, arc: 100, cd: 0.38, color: 0xcfd6dc, desc: 'しっかり斬れる' },
  { id: 'spear', name: 'スライムやり', price: 4000, atk: 11, reach: 3.8, arc: 40, cd: 0.5, color: 0x9ad0ff, desc: '長いけど、正面しか届かない' },
  { id: 'hammer', name: '大ハンマー', price: 6000, atk: 24, reach: 2.7, arc: 360, cd: 1.0, color: 0xff9a4a, desc: 'まわり全部を吹っ飛ばす。遅い' },
  { id: 'venom', name: 'ベノムダガー', price: 7500, atk: 17, reach: 2.1, arc: 90, cd: 0.22, el: 'poison', color: 0xc77aff, unlock: 'king', desc: '毒。とにかく速い', need: 'キングスライムを倒す' },
  { id: 'flame', name: 'フレイムブレード', price: 9000, atk: 30, reach: 2.7, arc: 110, cd: 0.38, el: 'fire', color: 0xff6a2a, unlock: 'fire', desc: '炎。やけどで燃やす', need: '火の洞窟のボスを倒す' },
  { id: 'frost', name: 'アイスランス', price: 9000, atk: 27, reach: 4.0, arc: 45, cd: 0.5, el: 'ice', color: 0x8fe0ff, unlock: 'ice', desc: '氷。長くて、敵をおそくする', need: '氷の洞窟のボスを倒す' },
  { id: 'tide', name: 'タイドロッド', price: 11000, atk: 32, reach: 3.0, arc: 120, cd: 0.4, el: 'water', color: 0x4aa0ff, unlock: 'ice', desc: '水。大きくふっとばす', need: '氷の洞窟のボスを倒す' },
  { id: 'sun', name: 'ソーラーブレード', price: 12000, atk: 36, reach: 2.9, arc: 130, cd: 0.34, el: 'light', color: 0xffe36a, unlock: 'king', desc: '光。クリティカルが出やすい', need: 'キングスライムを倒す' },
  { id: 'thunder', name: 'サンダーハンマー', price: 18000, atk: 52, reach: 3.0, arc: 360, cd: 0.9, el: 'thunder', color: 0xffee33, unlock: 'both', desc: '雷。まわり全部にビリビリ', need: '氷と火の洞窟のボスを倒す' },
  { id: 'legend', name: 'エクスカリスライム', price: 0, atk: 85, reach: 3.5, arc: 170, cd: 0.3, el: 'light', color: 0xfff7c0, unlock: 'chest', desc: '伝説の剣。ひみつの洞窟の宝箱にねむる', need: 'ひみつの洞窟の宝箱' },
];
const unlockOk = (w) => !w.unlock || w.unlock === 'chest' || (w.unlock === 'both' ? (S.flags.fire && S.flags.ice) : !!S.flags[w.unlock]);
// ---- 冒険：魔物 ----
const MONSTERS = {
  normal: { name: 'スライム', hp: 14, dmg: 5, spd: 1.9, color: '#7be8b2', size: 0.55, drop: [['extract_normal', 0.8]], feel: {} },
  puni: { name: 'ぷにぷにスライム', hp: 20, dmg: 6, spd: 2.4, color: '#ff8fc0', size: 0.6, el: 'water', weak: ['thunder'], drop: [['extract_normal', 0.5], ['extract_puni', 0.7]], feel: { bouncy: 1 } },
  nobi: { name: 'のびのびスライム', hp: 22, dmg: 6, spd: 1.7, color: '#6fa8ff', size: 0.6, el: 'poison', weak: ['fire'], drop: [['extract_normal', 0.5], ['extract_nobi', 0.7]], feel: { ooze: 1 } },
  toro: { name: 'とろとろスライム', hp: 18, dmg: 6, spd: 2.1, color: '#7be0ff', size: 0.6, el: 'water', weak: ['thunder'], drop: [['extract_normal', 0.5], ['extract_toro', 0.7]], feel: { sticky: 1 } },
  fuwa: { name: 'ふわふわスライム', hp: 16, dmg: 5, spd: 1.3, color: '#ffffff', size: 0.65, weak: ['fire'], drop: [['extract_normal', 0.5], ['extract_fuwa', 0.7]], feel: { foam: 1 } },
  hikari: { name: 'ヒカリスライム', hp: 32, dmg: 9, spd: 2.2, color: '#d8ff6a', size: 0.65, glow: true, el: 'light', weak: ['poison'], drop: [['extract_normal', 0.6], ['extract_hikari', 0.8]], feel: { bouncy: 0.6 } },
  fizz: { name: 'しゅわスライム', hp: 20, dmg: 6, spd: 2.2, color: '#7fffd4', size: 0.6, el: 'water', weak: ['thunder'], drop: [['extract_normal', 0.4], ['extract_fizz', 0.6]], feel: { foam: 0.7 }, fizz: true },
  mochi: { name: 'もちスライム', hp: 46, dmg: 8, spd: 1.3, color: '#ffe6f0', size: 0.8, weak: ['fire'], drop: [['extract_mochi', 0.9]], feel: { ooze: 1, sticky: 0.5 } },
  frost: { name: 'こおりスライム', hp: 28, dmg: 9, spd: 2.0, color: '#bfefff', size: 0.65, el: 'ice', weak: ['fire'], drop: [['extract_normal', 0.5], ['extract_ice', 0.6]], feel: { hard: 0.6 } },
  flame: { name: 'ほのおスライム', hp: 30, dmg: 10, spd: 2.2, color: '#ff8a4a', size: 0.65, glow: true, el: 'fire', weak: ['water', 'ice'], drop: [['extract_normal', 0.5], ['extract_fire', 0.6]], feel: { ooze: 0.4 } },
  volt: { name: 'かみなりスライム', hp: 26, dmg: 10, spd: 3.0, color: '#fff06a', size: 0.6, glow: true, el: 'thunder', weak: ['poison'], drop: [['extract_normal', 0.5], ['extract_thunder', 0.6]], feel: { bouncy: 0.8 } },
  shade: { name: 'かげスライム', hp: 34, dmg: 12, spd: 2.4, color: '#7a5ac8', size: 0.7, el: 'dark', weak: ['light'], drop: [['extract_normal', 0.5], ['extract_thunder', 0.3], ['extract_secret', 0.04]], feel: { ooze: 0.5 } },
  king: { name: 'キングスライム', hp: 360, dmg: 22, spd: 2.6, color: '#ffd24a', size: 2.3, boss: true, weak: ['thunder'], flag: 'king', drop: [['extract_secret', 1]], feel: { ooze: 0.6, bouncy: 0.4 } },
  crystal: { name: 'クリスタルスライム', hp: 620, dmg: 26, spd: 2.4, color: '#9fe8ff', size: 2.4, boss: true, el: 'ice', weak: ['fire'], flag: 'ice', drop: [['extract_ice', 1], ['extract_ice', 1]], feel: { hard: 0.7 } },
  magma: { name: 'マグマスライム', hp: 700, dmg: 30, spd: 2.6, color: '#ff7a3a', size: 2.4, boss: true, glow: true, el: 'fire', weak: ['water', 'ice'], flag: 'fire', drop: [['extract_fire', 1], ['extract_fire', 1]], feel: { ooze: 0.6 } },
  phantom: { name: 'ファントムスライム', hp: 1000, dmg: 34, spd: 3.0, color: '#b08cff', size: 2.6, boss: true, glow: true, el: 'dark', weak: ['light'], flag: 'secret', drop: [['extract_thunder', 1], ['extract_secret', 1]], feel: { ooze: 0.5, bouncy: 0.5 } },
};

// ---- 従業員 ----
const ROLES = {
  clerk: { name: '店番', icon: '🧑‍💼', hire: 1500, wage: 500, desc: '自分がお店にいなくても、お客さんの相手をしてくれる' },
  crafter: { name: '職人', icon: '🧑‍🍳', hire: 3000, wage: 700, desc: '自分で成功させたレシピのスライムを作ってくれる（材料は在庫から）' },
  buyer: { name: '仕入れ係', icon: '🧑‍🌾', hire: 2500, wage: 600, desc: '毎晩、指定した量になるまで材料を買い足してくれる' },
};
const STAFF_NAMES = ['ミナ', 'ソウタ', 'ハル', 'リク', 'ユイ', 'ナナ', 'カイ', 'モモ', 'レン', 'アオイ', 'ツムギ', 'ココア'];
const STAFF_TAGS = [
  { id: 'careful', name: '几帳面', acc: 1.3, spd: 0.8 }, { id: 'normal', name: 'ふつう', acc: 1, spd: 1 },
  { id: 'sloppy', name: '大ざっぱ', acc: 0.7, spd: 1.25 },
];

const WEATHERS = {
  sunny: { name: '晴れ', icon: '☀️', env: { b: 0, w: 0, s: 0 }, cust: 1, hint: 'ふつうの日' },
  cloudy: { name: 'くもり', icon: '☁️', env: { b: 0, w: -1, s: 0 }, cust: 0.95, hint: '少し湿っぽい' },
  rain: { name: '雨', icon: '🌧️', env: { b: 0, w: -4, s: -1 }, cust: 0.7, hint: '湿度が高く、水や泡のぶん「べたべた」「溶ける」になりやすい' },
  dry: { name: 'かんそう', icon: '🌬️', env: { b: -1.5, w: 2, s: 1 }, cust: 1, hint: '乾燥していて、ホウ砂水の限界が少し下がる' },
};
