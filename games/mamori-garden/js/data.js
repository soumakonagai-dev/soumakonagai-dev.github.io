'use strict';
// ====== まもりの庭 データ定義（数値調整はここ） ======
const STAR_ATK = [1, 2.5, 6.5, 17, 44, 115, 300];   // ★が上がるごとの攻撃力（インフレ版）
const MAX_STAR = 7;
const GOLD_MUL = 1.6;   // 敵が落とすゴールドの倍率
const START_GOLD = 240, START_LIFE = 20, MAX_WAVE = 30;
const UPG_COST = [100, 200, 400, 700, 1100, 1700, 2600, 4000];   // 戦闘中の強化 Lv1〜8
const UPG_BONUS = 0.35;   // 1レベルごとに攻撃+35%（Lv8で約3.8倍）
const SELL_RATE = 0.5;
const MAX_UNITS = 24;   // 場に置ける仲間の上限（合成しないと置けなくなる）
const RAND_BASE = 40, RAND_STEP = 5;
const HP_GROWTH = 1.125;   // ウェーブごとの敵HPの伸び（ボスは BOSS_GROWTH のままにして据え置き）
const BOSS_GROWTH = 1.105;
const STAGE_HP_MUL = [0.85, 1.15, 1.5, 2.0, 2.7];

const ELEM = {
  earth: { n: '土', c: '#d6a85c' }, fire: { n: '火', c: '#ff7a45' }, water: { n: '水', c: '#4fc3f7' },
  wind: { n: '風', c: '#7be0a8' }, light: { n: '光', c: '#ffe27a' }, dark: { n: '闇', c: '#b588ff' },
};

// ab: [基本, ★3, ★5, ★7]
const UNIT_LIST = [
  { key: 'sword', name: '見習い剣士', elem: 'earth', cost: 30, atk: 12, aspd: 1.0, range: 1.5, dmg: 'phys', style: 'melee', role: '単体', unlock: 0,
    ab: ['安くて合成しやすい。近くの敵を斬る', '10%で2回攻撃', '2回攻撃が25%に', '斬撃が周囲の敵にも広がる'] },
  { key: 'archer', name: '森の弓使い', elem: 'wind', cost: 60, atk: 18, aspd: 1.2, range: 3.5, dmg: 'phys', style: 'bolt', role: '単体', unlock: 0,
    ab: ['会心率10%（2倍ダメージ）', '会心率20%', '会心の矢が貫通する', '3本の矢を同時に放つ'] },
  { key: 'mage', name: '炎の魔導士', elem: 'fire', cost: 100, atk: 25, aspd: 0.7, range: 2.5, dmg: 'magic', style: 'bolt', role: '範囲', unlock: 0,
    ab: ['着弾点で半径1マスの爆発', '地面が3秒燃える', '爆発範囲が1.5倍に', '5秒ごとに隕石を落とす'] },
  { key: 'ice', name: '氷の精', elem: 'water', cost: 80, atk: 8, aspd: 1.0, range: 2.5, dmg: 'magic', style: 'bolt', role: '足止め', unlock: 0,
    ab: ['当てた敵を25%鈍足（2秒）', '鈍足35%', '10%で1秒凍結', '範囲内の敵を常に鈍足にする'] },
  { key: 'thunder', name: '雷鳥', elem: 'wind', cost: 120, atk: 20, aspd: 0.8, range: 3.0, dmg: 'magic', style: 'zap', role: '連鎖', unlock: 2,
    ab: ['3体に連鎖（毎回-20%）', '連鎖が4体に', '連鎖した敵を0.3秒しびれさせる', '範囲内の敵すべてに連鎖'] },
  { key: 'poison', name: '毒キノコ', elem: 'earth', cost: 70, atk: 4, aspd: 1.0, range: 2.0, dmg: 'magic', style: 'bolt', role: '継続', unlock: 2,
    ab: ['毒を重ねる（最大5重）', '毒の敵は回復できない', '最大10重', '毒で倒れた敵から毒が広がる'] },
  { key: 'golem', name: '鎧砕きゴーレム', elem: 'earth', cost: 110, atk: 30, aspd: 0.5, range: 1.5, dmg: 'phys', style: 'melee', role: 'デバフ', unlock: 1,
    ab: ['当てた敵の防御を下げる（重なる）', '範囲攻撃になる', '魔法耐性も下げる', '防御を完全に砕く'] },
  { key: 'sniper', name: '星の狙撃手', elem: 'light', cost: 150, atk: 90, aspd: 0.25, range: 6.0, dmg: 'phys', style: 'bolt', role: '単体', unlock: 3,
    ab: ['HPが一番多い敵を狙う（光属性：透明な敵も見える）', '最大HPの2%を追加', '最大HPの4%を追加', '射程が画面全体に'] },
  { key: 'wind', name: '風の精', elem: 'wind', cost: 100, atk: 6, aspd: 0.5, range: 2.0, dmg: 'magic', style: 'bolt', role: '押し戻し', unlock: 3,
    ab: ['敵を0.5マス押し戻す（ボスには効かない）', '押し戻し1マス', 'ボスも少し押し戻せる', '竜巻で敵を大きく吹き飛ばす'] },
  { key: 'siren', name: '歌姫セイレーン', elem: 'water', cost: 90, atk: 0, aspd: 0, range: 1.5, dmg: 'none', style: 'none', role: '支援', unlock: 0,
    ab: ['範囲内の味方の攻撃速度+15%', '攻撃速度+25%', '攻撃力+15%も追加', '範囲がマップ全体に'] },
  { key: 'priest', name: '光の司祭', elem: 'light', cost: 130, atk: 0, aspd: 0, range: 1.5, dmg: 'none', style: 'none', role: '支援', unlock: 4,
    ab: ['範囲内の味方の攻撃力+20%', '範囲内の敵の魔法耐性-15', '攻撃力+35%', '味方の発動確率が2倍に'] },
  { key: 'mouse', name: '金ねずみ', elem: 'light', cost: 60, atk: 5, aspd: 1.0, range: 2.0, dmg: 'magic', style: 'bolt', role: '経済', unlock: 0,
    ab: ['範囲内で倒れた敵のゴールド+1', 'ウェーブ終了時+20ゴールド', 'ゴールド+2／終了時+60', '利子の上限が2倍に・終了時+150'] },
  { key: 'reaper', name: '死神', elem: 'dark', cost: 140, atk: 22, aspd: 0.8, range: 2.0, dmg: 'magic', style: 'bolt', role: '処刑', unlock: 4,
    ab: ['HP10%以下の敵を即死（ボス無効）', '即死ラインが15%に', '倒すと攻撃速度UP（重なる）', 'ボスもHP5%以下で即死'] },
  { key: 'mimic', name: 'ミミック', elem: 'dark', cost: 90, atk: 8, aspd: 0.9, range: 1.5, dmg: 'phys', style: 'melee', role: '万能', unlock: 1,
    ab: ['同じ★なら何とでも合成できる（★1〜★3どうしまで）', '―', '―', '―'] },
  { key: 'egg', name: '竜の卵', elem: 'fire', cost: 200, atk: 0, aspd: 0, range: 0, dmg: 'magic', style: 'bolt', role: '育成', unlock: 5,
    ab: ['攻撃しない。3ウェーブで孵化して幼竜に', '幼竜：火の玉（範囲）', '若竜（8ウェーブ後）：炎のブレスで貫通', '古竜（15ウェーブ後）：全体ブレス。合成不可'] },
  { key: 'ninja', name: '風まいの忍者', elem: 'dark', cost: 70, atk: 9, aspd: 2.0, range: 2.5, dmg: 'phys', style: 'bolt', role: '連撃', unlock: 1,
    ab: ['すばやい手裏剣。敵の防御を15%無視する', '防御を30%無視する', '15%で手裏剣を3連続で投げる', '分身が周りの敵にも手裏剣を投げる'] },
  { key: 'cat', name: 'ねむりねこ', elem: 'dark', cost: 90, atk: 6, aspd: 1.2, range: 2.5, dmg: 'magic', style: 'bolt', role: '眠り', unlock: 2,
    ab: ['20%で敵を1秒眠らせる', '30%で1.2秒眠らせる', '眠っている敵が受けるダメージ+25%', '眠りが近くの2体にも広がる'] },
  { key: 'dryad', name: '森のドライアド', elem: 'wind', cost: 100, atk: 12, aspd: 0.8, range: 3.0, dmg: 'magic', style: 'bolt', role: '足止め', unlock: 2,
    ab: ['4秒ごとに一番ゴールに近い敵を1.2秒つるで捕まえる', '2体を同時に捕まえる', '3体を捕まえ、追加ダメージも与える', '範囲内の敵すべてを捕まえる'] },
  { key: 'miko', name: 'きつねの巫女', elem: 'fire', cost: 120, atk: 14, aspd: 1.0, range: 3.0, dmg: 'magic', style: 'bolt', role: '燃焼', unlock: 3,
    ab: ['狐火を2つ放ち、当たった敵を燃やす', '燃えている敵が受けるダメージ+15%', '狐火が3つに・燃焼ダメージ1.6倍', '燃えた敵が倒れると狐火が爆発する'] },
  { key: 'cannon', name: '大砲ガール', elem: 'earth', cost: 140, atk: 60, aspd: 0.4, range: 4.5, dmg: 'phys', style: 'bolt', role: '範囲', unlock: 3,
    ab: ['爆発する砲弾（範囲1.2マス）', '爆発範囲が1.5マスに', '爆発に巻き込んだ敵を0.5秒気絶させる', '3発に1発は特大弾（3倍ダメージ・範囲2マス）'] },
  { key: 'chrono', name: '時の魔女', elem: 'light', cost: 110, atk: 0, aspd: 0, range: 2.2, dmg: 'none', style: 'none', role: '支援', unlock: 4,
    ab: ['範囲内の敵を20%鈍足にする', '鈍足30%', '範囲内の敵が受けるダメージ+10%', '10秒ごとに時間停止（範囲内の敵を1.2秒止める）'] },
  { key: 'ghost', name: 'ゆうれいランタン', elem: 'dark', cost: 100, atk: 14, aspd: 1.0, range: 2.5, dmg: 'true', style: 'bolt', role: '貫通', unlock: 4,
    ab: ['防御も魔法耐性も無視するダメージ', '壁抜け：近くの2体目にも当たる', '飛んでいる敵・透明な敵にも当たる', '5発ごとに敵の現在HPの20%を奪う'] },
  { key: 'paladin', name: '聖騎士', elem: 'light', cost: 160, atk: 40, aspd: 0.7, range: 1.5, dmg: 'phys', style: 'melee', role: '守護', unlock: 5,
    ab: ['重い一撃で敵を少し押し戻す（光属性：透明な敵も見える）', 'ウェーブ終了時にライフ+1', 'ライフ+2', 'ライフ+3・斬撃が周囲にも広がる'] },
  { key: 'alchemist', name: '錬金術師', elem: 'earth', cost: 130, atk: 20, aspd: 0.8, range: 2.5, dmg: 'phys', style: 'bolt', role: '経済', unlock: 5,
    ab: ['小さく爆発する薬ビン。倒した敵のゴールド+1', 'ゴールド+2', '爆発範囲が1.4倍・ゴールド+3', '倒すたびゴールド+5（ボスは+30）'] }
];
const UNITS = {}; UNIT_LIST.forEach((u, i) => { u.no = i + 1; UNITS[u.key] = u; });
// ---- キャラのレベル（最大20）：全員 攻撃力+3%/Lv。さらにキャラごとに「得意な伸び方」がある ----
const MAX_LV = 20;
const GROW = { sword: 'aspd', archer: 'range', mage: 'range', ice: 'ability', thunder: 'aspd', poison: 'ability', golem: 'atk', sniper: 'aspd', wind: 'ability', siren: 'ability', priest: 'ability', mouse: 'range', reaper: 'ability', mimic: 'aspd', egg: 'range', ninja: 'aspd', cat: 'ability', dryad: 'ability', miko: 'ability', cannon: 'range', chrono: 'ability', ghost: 'aspd', paladin: 'atk', alchemist: 'range' };
const GROW_LABEL = { atk: '攻撃力が伸びる', aspd: '速度が伸びる', range: '射程が伸びる', ability: '能力が強化' };
function levelBonus(key, lv) {
  const l = Math.max(0, (lv || 1) - 1), g = GROW[key] || 'atk', support = UNITS[key].style === 'none';
  const o = { atk: 1 + 0.03 * l, aspd: 1, range: 1, ab: 1 };
  if (g === 'atk') o.atk += 0.02 * l; else if (g === 'aspd') o.aspd = 1 + 0.016 * l; else if (g === 'range') o.range = 1 + 0.015 * l; else if (g === 'ability') o.ab = 1 + 0.025 * l;
  if (support) { o.ab = 1 + 0.03 * l; o.range = 1 + 0.01 * l; }
  return o;
}
const START_UNITS = ['sword', 'archer', 'mage', 'ice', 'siren', 'mouse'];
// ステージクリアで解放されるモンスター: unlock の値 = 「そのステージをクリア」
// 0 = 最初から / 1〜5 = ステージN クリアで解放
const DRAGON = [
  null,
  { name: '幼竜', atk: 40, aspd: 0.8, range: 3.0, splash: 1.0 },
  { name: '若竜', atk: 130, aspd: 0.9, range: 3.5, splash: 1.3 },
  { name: '古竜', atk: 420, aspd: 1.0, range: 4.5, splash: 1.6 },
];

// 敵: hp=基本HP spd=マス/秒 pts=ウェーブ予算コスト leak=拠点ダメージ
const ENEMY_LIST = [
  { key: 'slime', name: 'スライム', hp: 38, spd: 1.5, def: 0, mr: 0, gold: 3, pts: 1, leak: 1, r: 0.5, min: 1, note: '基本の敵' },
  { key: 'rabbit', name: '走りウサギ', hp: 24, spd: 2.7, def: 0, mr: 0, gold: 3, pts: 0.8, leak: 1, r: 0.45, min: 2, note: '足が速い' },
  { key: 'frog', name: '鎧ガエル', hp: 95, spd: 1.1, def: 60, mr: 0, gold: 5, pts: 2, leak: 1, r: 0.55, min: 4, note: '物理に強い' },
  { key: 'mushroom', name: '魔法キノコ', hp: 95, spd: 1.5, def: 0, mr: 60, gold: 5, pts: 2, leak: 1, r: 0.5, min: 5, note: '魔法に強い' },
  { key: 'jelly', name: '分裂ゼリー', hp: 80, spd: 1.4, def: 10, mr: 10, gold: 2, pts: 2.2, leak: 1, r: 0.6, min: 7, note: '倒すと3体に分裂' },
  { key: 'bat', name: 'コウモリ', hp: 30, spd: 2.5, def: 0, mr: 20, gold: 4, pts: 1, leak: 1, r: 0.45, min: 8, fly: true, note: '飛行：射程2未満は届かない' },
  { key: 'fairy', name: '癒しの妖精', hp: 105, spd: 1.5, def: 0, mr: 30, gold: 6, pts: 2, leak: 1, r: 0.5, min: 11, note: '周囲の敵を回復する' },
  { key: 'thief', name: '影の盗賊', hp: 85, spd: 2.4, def: 20, mr: 20, gold: 8, pts: 1.8, leak: 1, r: 0.5, min: 13, invis: true, note: '透明：光属性か範囲攻撃で見える' },
  { key: 'knight', name: '盾の騎士', hp: 280, spd: 1.0, def: 40, mr: 40, gold: 15, pts: 4.5, leak: 3, r: 0.7, min: 16, note: '周囲の敵にバリアを張る' },
  { key: 'boss', name: 'ボス', hp: 1, spd: 0.8, def: 30, mr: 30, gold: 100, pts: 0, leak: 10, r: 1.0, min: 99, note: '' },
];
const ENEMIES = {}; ENEMY_LIST.forEach(e => ENEMIES[e.key] = e);

const BOSSES = {
  treant: { name: '大樹の番人', skill: '一定時間ごとに近くのモンスターを3秒眠らせる' },
  serpent: { name: '湖の主ウミヘビ', skill: '潜って3秒無敵になり、浮上時に加速する' },
  tengu: { name: '天狗', skill: '風でモンスター1体を別の場所へ飛ばす' },
  giant: { name: '氷の巨人', skill: '近くのモンスターの攻撃速度を下げる' },
  queen: { name: '夜の女王', skill: '倒されると、倒された敵の一部を復活させる' },
};

// path: [u,v] 0〜1 の正規化座標（横画面は u→x, v→y ／ 縦画面は u→y, v→x）
const STAGES = [
  { name: '花の丘', sub: '春のやわらかい光', theme: 'meadow', boss: 'treant',
    path: [[-.06, .2], [.86, .2], [.86, .5], [.12, .5], [.12, .8], [1.06, .8]], zones: ['high', 'spring', 'stump', 'flower'] },
  { name: '月夜の湖', sub: '青と銀の静かな夜', theme: 'lake', boss: 'serpent',
    path: [[-.06, .78], [.3, .78], [.3, .24], [.7, .24], [.7, .78], [1.06, .78]], zones: ['spring', 'altar', 'stump', 'high'] },
  { name: '紅葉の渓谷', sub: '赤と金の夕暮れ', theme: 'autumn', boss: 'tengu',
    path: [[-.06, .2], [.25, .2], [.25, .8], [.5, .8], [.5, .2], [.75, .2], [.75, .8], [1.06, .8]], zones: ['high', 'flower', 'stump', 'altar'] },
  { name: '雪原のオーロラ', sub: '凍てつく空の光', theme: 'snow', boss: 'giant',
    path: [[-.06, .15], [.92, .15], [.92, .85], [.08, .85], [.08, .4], [.7, .4], [.7, .63]], zones: ['altar', 'high', 'spring', 'stump'] },
  { name: '星の神殿', sub: '宇宙に浮かぶ遺跡', theme: 'temple', boss: 'queen',
    path: [[-.06, .5], [.2, .5], [.2, .2], [.5, .2], [.5, .8], [.8, .8], [.8, .5], [1.06, .5]], zones: ['altar', 'spring', 'high', 'flower'] },
];
// ステージクリアで解放: stage index → unit keys
const STAGE_UNLOCK = [['golem', 'mimic', 'ninja'], ['poison', 'thunder', 'cat', 'dryad'], ['wind', 'sniper', 'miko', 'cannon'], ['priest', 'reaper', 'chrono', 'ghost'], ['egg', 'paladin', 'alchemist']];
const ZONE_INFO = {
  high: { n: '高台', d: '射程+25%', c: '#ffd36b' },
  spring: { n: '泉', d: '魔法攻撃+20%', c: '#6fd6ff' },
  altar: { n: '祭壇', d: '支援の範囲+20%', c: '#c79bff' },
  flower: { n: '花畑', d: '攻撃速度+12%', c: '#ff9ed2' },
  stump: { n: '金の切り株', d: '倒した敵のG +30%', c: '#ffe066' },
};

// ===== ウェーブ生成（決定的） =====
// 高い難易度は、序盤は「ふつう」と同じで、ウェーブが進むほど本来の強さに近づく（WAVE19で全開）
function diffRamp(n) { return Math.min(1, (n - 1) / 18); }
function diffHp(n, d) { const h = diffOf(d).hp, base = DIFFS[DEFAULT_DIFF].hp; return h > base ? base + (h - base) * diffRamp(n) : h; }
function diffCnt(n, d) { const k = diffOf(d).cnt; return k > 1 ? 1 + (k - 1) * diffRamp(n) : k; }
function diffOf(d) { return DIFFS[d == null ? DEFAULT_DIFF : d]; }
function hpMulOf(n, stIdx, diff) { return Math.pow(HP_GROWTH, n - 1) * STAGE_HP_MUL[Math.min(stIdx, STAGE_HP_MUL.length - 1)] * diffHp(n, diff); }
function waveBudget(n, stIdx, diff) { return (7 + n * 1.3) * (1 + 0.04 * Math.min(stIdx, 29)) * diffCnt(n, diff); }
function makeWave(n, stIdx, diff) {
  const r = mulberry32(n * 977 + stIdx * 131 + 5);
  const avail = ENEMY_LIST.filter(e => e.key !== 'boss' && n >= e.min).map(e => e.key);
  const has = k => avail.includes(k);
  const pickOf = (arr, fb) => { const a = arr.filter(has); return a.length ? a[Math.floor(r() * a.length)] : fb; };
  const B = waveBudget(n, stIdx, diff);
  const out = [];
  const add = (type, budget, gap, t0) => {
    const c = Math.max(1, Math.round(budget / ENEMIES[type].pts));
    for (let i = 0; i < c; i++) out.push({ t: t0 + i * gap * (0.85 + r() * 0.3), type });
  };
  const arche = n % 5;
  let T = 0;
  if (n % 10 === 0) {
    add(pickOf(['slime', 'frog', 'mushroom', 'knight'], 'slime'), B * 0.5, 0.8, 2);
    out.push({ t: 1.5, type: 'boss' });
  } else if (arche === 1) {
    add(pickOf(['slime', 'rabbit'], 'slime'), B * 1.0, 0.45, 0.5);
    if (n > 5) add(pickOf(['rabbit', 'bat'], 'slime'), B * 0.3, 0.6, 8);
  } else if (arche === 2) {
    add(pickOf(['frog', 'knight', 'slime'], 'slime'), B * 0.7, 1.2, 0.5);
    add('slime', B * 0.3, 0.7, 6);
  } else if (arche === 3) {
    add(pickOf(['mushroom', 'slime'], 'slime'), B * 0.65, 1.0, 0.5);
    add(pickOf(['frog', 'rabbit'], 'slime'), B * 0.35, 0.9, 7);
  } else if (arche === 4) {
    add(pickOf(['jelly', 'bat', 'fairy', 'thief'], 'rabbit'), B * 0.7, 0.9, 0.5);
    add(pickOf(['slime', 'frog', 'mushroom'], 'slime'), B * 0.3, 0.8, 6);
  } else {
    const a = pickOf(['fairy', 'thief', 'knight', 'jelly'], 'frog');
    add(a, B * 0.4, 1.1, 0.5);
    add(pickOf(['frog', 'mushroom', 'bat'], 'slime'), B * 0.35, 0.8, 5);
    add(pickOf(['rabbit', 'slime'], 'slime'), B * 0.25, 0.5, 9);
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
function bossHp(n, stIdx, diff) { return 105 * waveBudget(n, stIdx, diff) * hpMulOf(n, stIdx, diff) * Math.pow(BOSS_GROWTH / HP_GROWTH, n - 1) * 0.3; }
