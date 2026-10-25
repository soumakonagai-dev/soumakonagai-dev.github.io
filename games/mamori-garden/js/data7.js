'use strict';
// ===== イベント（月がわり12か月）と、季節限定キャラ12体 =====
const NORMAL_STAGES = STAGES.length;   // ふつうのステージの数（これより後ろはイベントステージ）
const SEASON_OF = m => m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
const SEASON_NAME = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

// ---- 季節限定キャラ（イベントのポイントとだけ交換できる。ガチャには出ない） ----
function ns(season, key, name, elem, cost, atk, aspd, range, dmg, style, role, grow, fx, art, tier) { const d = nu(key, name, elem, cost, atk, aspd, range, dmg, style, role, grow, fx, art, tier); d.seasonal = season; return d; }
// 春
ns('spring', 'harunohime', '花見の桜姫', 'light', 130, 32, 0.9, 3.6, 'magic', 'bolt', '花吹雪', 'ability', { splash: [1.2, 1.4, 1.8, 2.4], slow: [0.2, 0.3, 0.4, 0.5], heal: [0, 0, 1, 1] }, H('#ffb0cc', 7, '#ff6a9a', '#ffe0ec', '#ff9ac0', 3, 'flower', '#ff9ac8', 'wings', '#ffd0e0', 'fan', '#ff9ac8'));
ns('spring', 'chouhime', '蝶の舞姫', 'wind', 180, 48, 1.0, 4.0, 'magic', 'bolt', '蝶の舞', 'atk', { multi: [1, 2, 3, 5], chain: [1, 2, 3, 5], crit: [0.1, 0.2, 0.3, 0.45] }, H('#c8a0ff', 6, '#7affd8', '#a070e8', '#ffe27a', 5, 'tiara', '#ffd0f0', 'wings', '#b890ff', 'fan', '#ffd0f0'));
ns('spring', 'sakuragami', '桜神コノハナ', 'light', 250, 105, 0.8, 4.4, 'magic', 'bolt', '千本桜', 'atk', { splash: [1.8, 2.2, 2.8, 3.6], stun: [0.1, 0.15, 0.2, 0.3], heal: [0, 1, 1, 2], vsBoss: [0.3, 0.5, 0.8, 1.4] }, H('#ff9ac0', 7, '#ffd24a', '#fff0f6', '#ff6a9a', 5, 'halo', '#ffd24a', 'aura', '#ffb0d0', 'staff', '#ff9ac8'), 'U');
// 夏
ns('summer', 'namikko', '波乗り少女', 'water', 130, 34, 1.1, 3.2, 'magic', 'bolt', '大波', 'aspd', { knock: [0.5, 0.8, 1.2, 1.8], slow: [0.2, 0.3, 0.4, 0.5], splash: [1, 1.2, 1.5, 2] }, H('#3ad0ff', 3, '#2a6aff', '#ff9a3a', '#ffffff', 2, 'band', '#ffe27a', 'none', '#fff', 'trident', '#7ad8ff'));
ns('summer', 'hanabimiko', '花火の巫女', 'fire', 180, 55, 0.8, 4.0, 'magic', 'bolt', '大輪', 'atk', { splash: [1.6, 1.9, 2.4, 3.2], burn: [0.8, 1.2, 1.8, 2.8], onKill: [0, 1, 1.6, 2.5] }, H('#2a2a6a', 2, '#ff6a8a', '#e8404a', '#ffd24a', 3, 'flower', '#ffd24a', 'pack', '#5a3a6a', 'fan', '#ff6a8a'));
ns('summer', 'taiyoumi', '太陽の姫神', 'light', 250, 100, 0.85, 4.5, 'magic', 'bolt', '灼熱の日輪', 'atk', { burn: [1.2, 1.8, 2.8, 4.5], pen: [0.2, 0.3, 0.4, 0.6], splash: [1.6, 2, 2.6, 3.4], vsBurn: [0.5, 0.8, 1.3, 2.2] }, H('#ffd24a', 7, '#ff6a2a', '#fff6c0', '#ff8a2a', 5, 'crown', '#ffb040', 'aura', '#ffe27a', 'orb', '#ffb040'), 'U');
// 秋
ns('autumn', 'tsukimiusagi', 'お月見うさぎ', 'light', 125, 0, 0, 4.5, 'none', 'none', '月見団子', 'ability', { aAspd: [0.15, 0.22, 0.3, 0.42], aAtk: [0.08, 0.12, 0.18, 0.26] }, BE('#fff6e8', 'rabbit', '#ff6a6a', 'none', '#ffe27a', '#ffd24a', { inner: '#ffb0c0', hd: 'band', hg: '#ffd24a' }));
ns('autumn', 'momijitengu', '紅葉の天狗', 'wind', 180, 62, 1.1, 2.4, 'phys', 'melee', '紅葉おろし', 'aspd', { pierce: [2, 3, 4, 6], crit: [0.15, 0.25, 0.35, 0.5], vsFly: [0.5, 0.8, 1.2, 2], echo: [0.1, 0.2, 0.3, 0.45] }, H('#c8321e', 4, '#ffd24a', '#8a3a1a', '#ff8a2a', 1, 'beak', '#c8321e', 'wings', '#a04a1a', 'fan', '#ff8a2a'));
ns('autumn', 'houjoukami', '豊穣の女神', 'earth', 250, 0, 0, 5.5, 'none', 'none', '実りの祝福', 'ability', { aAtk: [0.2, 0.3, 0.45, 0.7], aAspd: [0.1, 0.15, 0.22, 0.32], gA: [2, 3, 5, 8] }, H('#ffb040', 7, '#6a4a2a', '#fff0b0', '#c8803a', 5, 'flower', '#ff8a3a', 'aura', '#ffd070', 'harp', '#ffd24a'), 'U');
// 冬
ns('winter', 'yukihime', '雪の姫', 'water', 130, 30, 0.9, 3.8, 'magic', 'bolt', '氷の結晶', 'ability', { slow: [0.3, 0.4, 0.5, 0.6], stun: [0.1, 0.15, 0.2, 0.3], splash: [1, 1.2, 1.6, 2.2] }, H('#e8f6ff', 7, '#4ab0ff', '#ffffff', '#bff4ff', 3, 'tiara', '#bff4ff', 'wings', '#e8f6ff', 'wand', '#bff4ff'));
ns('winter', 'santa', '星降る夜のサンタ', 'light', 180, 45, 0.9, 4.2, 'magic', 'bolt', 'プレゼント', 'ability', { gold: [3, 5, 8, 14], heal: [0, 1, 1, 2], multi: [1, 1, 2, 3], splash: [0.8, 1, 1.4, 2] }, H('#ffffff', 4, '#2a6aff', '#e8404a', '#ffffff', 1, 'cap', '#e8404a', 'pack', '#c8321e', 'bell', '#ffd24a'));
ns('winter', 'ryuujin', '新春の龍神', 'fire', 250, 110, 0.7, 4.0, 'phys', 'bolt', '昇り龍', 'atk', { pierce: [3, 4, 6, 9], burn: [1, 1.5, 2.4, 4], vsBoss: [0.5, 0.8, 1.3, 2.2], splash: [1.2, 1.5, 2, 2.8] }, DR('#e8404a', '#ffd890', '#ffd24a', '#fff0b0', '#ffec6a'), 'U');

// ---- 月がわりのイベントステージ（インデックスは NORMAL_STAGES 以降） ----
// 月, 名前, 説明, 道を借りるステージ, テーマ名, 元テーマ, 色相, 彩度, 明るさ, 全体の色, ボスkey, ボス名, ボスの元, 技の説明, ボスの色
const EVENT_DEFS = [
  [1, '初詣の神社', 'あけまして、おめでとう！', 2, 'ev01', 'sakura', 330, 1.1, 1.0, [255, 60, 40], 'ev_ryujin', '春を呼ぶ龍', 'magmadragon', '炎で味方を眠らせる', '#ffd24a'],
  [2, '雪まつりの広場', 'まっしろな雪と、ぬくもり', 4, 'ev02', 'crystal', -20, 0.5, 1.5, [200, 230, 255], 'ev_yukigiant', '雪だるま大王', 'giant', '近くの味方の動きをにぶらせる', '#e8f6ff'],
  [3, 'ひなまつりの庭', 'ももの花と、おだいりさま', 6, 'ev03', 'sakura', 10, 1.0, 1.15, [255, 170, 200], 'ev_hina', 'ひなの女王', 'queen', 'よみがえって立ちはだかる', '#ff9ac8'],
  [4, 'お花見の丘', '満開の桜の下で', 8, 'ev04', 'sakura', 20, 1.0, 1.1, [255, 200, 220], 'ev_hanami', '花見の妖狐', 'kyuubi', '妖しい狐火で眠らせる', '#ffd0e8'],
  [5, 'こいのぼりの空', 'さわやかな風とともに', 10, 'ev05', 'sky', 0, 1.0, 1.0, [80, 160, 255], 'ev_koi', '空の大こい', 'serpent', '無敵になって速く走る', '#4ab0ff'],
  [6, 'あじさいの雨', 'しっとり、青むらさき', 12, 'ev06', 'storm', 160, 1.0, 1.0, [150, 90, 220], 'ev_ajisai', 'あじさいの精', 'treant', '味方を眠らせる', '#a070ff'],
  [7, '夏まつり', 'よるの花火と屋台', 14, 'ev07', 'clock', 0, 1.4, 0.85, [255, 140, 60], 'ev_hanabi', '花火大王', 'demonking', 'よみがえる。眠らせる', '#ff6a8a'],
  [8, 'まぶしい海', 'きらめく波とヤシの木', 1, 'ev08', 'abyss', -30, 1.2, 1.6, [60, 210, 255], 'ev_umi', '海の大王', 'kraken', '味方をつかんで飛ばす', '#ffd24a'],
  [9, 'お月見の丘', 'すすきとお団子', 3, 'ev09', 'moon', 40, 0.8, 1.25, [255, 230, 140], 'ev_usagi', '月のうさぎ王', 'guardian', '無敵になり、バリアを張る', '#fff2a0'],
  [10, 'ハロウィンの城', 'お菓子をくれなきゃ…', 5, 'ev10', 'moon', 250, 1.2, 0.95, [255, 120, 20], 'ev_jack', 'かぼちゃ大王', 'pharaoh', '砂嵐で味方をにぶらせる', '#ff8a2a'],
  [11, '紅葉の山', '赤と金色の、秋の道', 7, 'ev11', 'desert', -15, 1.1, 0.95, [255, 110, 30], 'ev_momiji', '紅葉の天狗王', 'tengu', '味方を飛ばす', '#ff5a2a'],
  [12, 'クリスマスの雪原', 'きらきらの夜に', 9, 'ev12', 'crystal', 120, 1.1, 1.1, [255, 60, 70], 'ev_xmas', '聖夜の巨人', 'giant', '近くの味方をにぶらせる', '#ff4a4a'],
];
const EVENT_STAGE_BASE = STAGES.length;
for (const d of EVENT_DEFS) {
  const [m, name, sub, bs, th, base, hue, sat, lit, ov, bk, bn, bb, bsk, tint] = d, src = STAGES[bs];
  STAGE_HP_MUL.push(38);
  STAGE_EX.push({ theme: th, base, hue, sat, lit, ov, boss: bk, bossBase: bb, tint });
  STAGES.push({ name: m + '月  ' + name, sub, theme: th, boss: bk, event: m, path: src.path.map(p => p.slice()), zones: src.zones.slice() });
  BOSSES[bk] = { name: bn, skill: bsk }; BOSS_BASE[bk] = bb;
}
// いま開いているイベント（?month=3 で月を指定してためせる）
let EVENT_MONTH_DEBUG = 0;
function eventMonth() { return EVENT_MONTH_DEBUG || (new Date().getMonth() + 1); }
function eventStageIdx(m) { return EVENT_STAGE_BASE + ((m || eventMonth()) - 1); }
function eventYM() { const d = new Date(); return (EVENT_MONTH_DEBUG ? d.getFullYear() + '-' + String(EVENT_MONTH_DEBUG).padStart(2, '0') : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
function eventDaysLeft() { const d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.max(0, Math.ceil((end - d) / 86400000)); }
// 交換所：季節キャラ3体のかけら（ポイント、月ごとの回数制限）
const EVENT_SHOP = { E: { pts: 60, limit: 20 }, L: { pts: 250, limit: 10 }, U: { pts: 1500, limit: 3 } };
function seasonChars(season) { return UNIT_LIST.filter(u => u.seasonal === season); }
function eventPoints(sv) { return (sv.evp && sv.evp[eventYM()]) || 0; }
function eventBought(sv, key) { return ((sv.evb && sv.evb[eventYM()]) || {})[key] || 0; }
function eventBuy(sv, key) {
  const t = tierOf(key), it = EVENT_SHOP[t]; if (!it) return false;
  if (eventPoints(sv) < it.pts || eventBought(sv, key) >= it.limit) return false;
  const ym = eventYM(); sv.evp[ym] -= it.pts; sv.evb[ym] = sv.evb[ym] || {}; sv.evb[ym][key] = (sv.evb[ym][key] || 0) + 1; return addPieces(sv, key, 1);
}
// クリアで入るポイント：勝つと 60 + ★×20 + 難易度×10
function eventPointsFor(stars, diff) { return 60 + stars * 20 + (diff || 0) * 10; }
