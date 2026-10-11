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
for (const k in GLITTERS) addItem('glitter_' + k, { name: `ラメ（${GLITTERS[k][0]}）`, kind: 'glitter', unit: '回', rate: 4, color: GLITTERS[k][1], icon: '✨', w: 5, note: 'キラキラ' });

// stock: [材料ID, 1パックの量, 値段]
const SHOPS = {
  hyakkin: {
    name: '100円ショップ「まるえん」', short: '100均', floor: 0xf1e3c4, wall: 0xffe08a,
    stock: [['glue_cheap', 500, 110], ['borax', 150, 130], ['soap', 250, 110],
      ['glitter_gold', 10, 110], ['glitter_silver', 10, 110],
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
      ...['gold', 'silver'].map(k => ['glitter_' + k, 100, 600])],
  },
};

// ---- お客さん ----
// like(スライム) = その人が「定価の何倍まで出すか」の目安
const hasTrait = (sl, t, min = 0.25) => (sl.traits[t] || 0) >= min;
const CUSTOMERS = {
  kid: {
    name: 'こども', icon: '🧒', budget: 260, w: (r, rain) => 5 * (rain ? 0.5 : 1),
    desc: 'ふつうのスライムとカラフルなラメ入りが好き。お金は少なめ',
    like: sl => 0.95 + (sl.sp >= 2 ? 0.3 : 0) + (sl.sat > 0.55 ? 0.15 : 0) - (TRAITS.some(t => sl.traits[t] > 0) ? 0.1 : 0),
  },
  student: {
    name: '学生', icon: '👩‍🎓', budget: 450, w: () => 3,
    desc: 'ふわふわとパステルカラーが好き。流行に敏感',
    like: sl => 0.8 + (hasTrait(sl, 'fuwafuwa', 0.05) ? 0.9 : 0) + (sl.light > 0.75 ? 0.35 : 0),
  },
  nobi: {
    name: 'のびのび好き', icon: '🧑‍🎨', budget: 900, w: r => 1 + 0.5 * r,
    desc: 'よく伸びる「のびのび」が大好き。限界ギリギリほど高く買う',
    like: sl => hasTrait(sl, 'nettori', 0.05) ? 1.3 + 1.2 * sl.traits.nettori : 0.5,
  },
  puni: {
    name: 'ぷにぷに好き', icon: '🧑‍🔬', budget: 900, w: r => 1 + 0.5 * r,
    desc: '弾力のある「ぷにぷに」が大好き。限界ギリギリほど高く買う',
    like: sl => hasTrait(sl, 'danryoku', 0.05) ? 1.3 + 1.2 * sl.traits.danryoku : 0.5,
  },
  asmr: {
    name: 'ASMR配信者', icon: '🎙️', budget: 1600, needRep: 2, w: (r, rain) => 0.6 * r * (rain ? 2 : 1),
    desc: '音がいい「とろとろ」「ふわふわ」を探している。高く買う',
    like: sl => 0.45 + (hasTrait(sl, 'torotoro', 0.05) ? 0.9 + sl.traits.torotoro : 0) + (hasTrait(sl, 'fuwafuwa', 0.05) ? 0.6 + sl.traits.fuwafuwa * 0.6 : 0),
    multi: true,
  },
  collector: {
    name: 'コレクター', icon: '🧐', budget: 3500, needRep: 3, w: r => 0.45 * (r - 2),
    desc: '2つ以上の個性が混ざった珍しいスライムやSランクを集めている',
    like: sl => 0.35 + (TRAITS.filter(t => sl.traits[t] > 0).length >= 2 ? 1.3 : 0) + (sl.q === 'S' ? 0.9 : sl.q === 'A' ? 0.3 : 0),
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
