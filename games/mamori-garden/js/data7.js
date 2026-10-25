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
// 後半（16日〜月末）のイベント：べつのステージ・べつのボス・べつのクエスト・べつのポイントになる
const EVENT_DEFS2 = [
  [1, '新年の雪あかり', 'しんしんと、ひかる雪', 11, 'ev13', 'crystal', 200, 0.8, 1.4, [200, 220, 255], 'ev_kagami', 'かがみもち大王', 'guardian', '無敵になり、バリアを張る', '#fff2c0'],
  [2, '豆まきの鬼ヶ島', 'おには〜そと！', 13, 'ev14', 'volcano', 0, 1.1, 1.0, [255, 60, 40], 'ev_oni', '赤鬼', 'giant', '近くの味方の動きをにぶらせる', '#ff4a3a'],
  [3, '春一番の花畑', 'ふわっと、風にのって', 15, 'ev15', 'sky', 90, 1.0, 1.05, [255, 220, 240], 'ev_haru', '春風の王', 'raijuu', '雷でしびれさせる', '#ffd0f0'],
  [4, '新緑のたけのこ山', 'にょきにょき、竹の林', 17, 'ev16', 'worldtree', -20, 1.1, 0.95, [100, 255, 150], 'ev_take', '竹の大将', 'treant', '味方を眠らせる', '#7aff9a'],
  [5, '梅雨入りの池', 'ぽちゃん、と雨の音', 19, 'ev17', 'abyss', 120, 1.1, 1.2, [100, 255, 130], 'ev_kaeru', 'かえる大王', 'kraken', '味方をつかんで飛ばす', '#7aff6a'],
  [6, '七夕の天の川', 'ねがいごとを、星に', 21, 'ev18', 'moon', 220, 1.3, 1.1, [140, 150, 255], 'ev_tanabata', '織姫と彦星', 'queen', 'よみがえって立ちはだかる', '#aab4ff'],
  [7, '夏の夜の花火大会', 'どーん、と大輪', 23, 'ev19', 'clock', 280, 1.2, 0.9, [200, 60, 255], 'ev_hanabi2', '打ち上げ大王', 'demonking', 'よみがえる。眠らせる', '#ff9ae0'],
  [8, 'スイカ畑の夕焼け', 'あま〜い、赤い夕日', 25, 'ev20', 'desert', 330, 1.2, 1.0, [255, 100, 60], 'ev_suika', 'すいか大王', 'pharaoh', '砂嵐で味方をにぶらせる', '#ff5a6a'],
  [9, '稲穂の黄金郷', 'ゆれる、金色の海', 27, 'ev21', 'desert', 10, 1.0, 1.2, [255, 210, 80], 'ev_ine', 'お稲荷の大狐', 'kyuubi', '妖しい狐火で眠らせる', '#ffd24a'],
  [10, 'おばけ屋敷の夜', 'ひゅ〜どろどろ', 29, 'ev22', 'moon', 120, 1.1, 0.9, [100, 255, 150], 'ev_obake', 'おばけ大王', 'demonking', 'よみがえる。眠らせる', '#9aff9a'],
  [11, '錦秋の渓谷', '燃えるような、山の色', 31, 'ev23', 'storm', 20, 1.2, 1.0, [255, 150, 50], 'ev_tengu2', '烏天狗の長', 'tengu', '味方を飛ばす', '#ff8a2a'],
  [12, '年の瀬の大そうじ', 'ぴかぴかにして新年を', 33, 'ev24', 'clock', 30, 0.6, 1.2, [255, 230, 170], 'ev_oosouji', '大掃除ロボ', 'clockking', '時間を止めて動けなくする', '#c8d8ff'],
];
const EVENT_STAGE_BASE = STAGES.length;
for (let i = 0; i < 12; i++) {
  for (const half of [0, 1]) {
    const d = (half ? EVENT_DEFS2 : EVENT_DEFS)[i];
    const [m, name, sub, bs, th, base, hue, sat, lit, ov, bk, bn, bb, bsk, tint] = d, src = STAGES[bs];
    STAGE_HP_MUL.push(38);
    STAGE_EX.push({ theme: th, base, hue, sat, lit, ov, boss: bk, bossBase: bb, tint });
    STAGES.push({ name: m + '月' + (half ? '後半' : '前半') + '　' + name, sub, theme: th, boss: bk, event: m, half, path: src.path.map(p => p.slice()), zones: src.zones.slice() });
    BOSSES[bk] = { name: bn, skill: bsk }; BOSS_BASE[bk] = bb;
  }
}
// いま開いているイベント（?month=3&half=2 で指定してためせる）。1か月に2つ：前半(1〜15日)・後半(16日〜)
let EVENT_MONTH_DEBUG = 0, EVENT_HALF_DEBUG = 0;
function eventMonth() { return EVENT_MONTH_DEBUG || (new Date().getMonth() + 1); }
function eventHalf() { return EVENT_HALF_DEBUG ? EVENT_HALF_DEBUG - 1 : (new Date().getDate() <= 15 ? 0 : 1); }
function eventStageIdx(m, h) { return EVENT_STAGE_BASE + ((m || eventMonth()) - 1) * 2 + (h == null ? eventHalf() : h); }
function eventYM() { const d = new Date(); return d.getFullYear() + '-' + String(eventMonth()).padStart(2, '0') + (eventHalf() ? 'b' : 'a'); }
function eventDaysLeft() { const d = new Date(), end = eventHalf() ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : new Date(d.getFullYear(), d.getMonth(), 16); return Math.max(0, Math.ceil((end - d) / 86400000)); }
// 交換所：季節キャラ3体のかけら（ポイント、月ごとの回数制限）
const EVENT_SHOP = { E: { pts: 60, limit: 20 }, L: { pts: 250, limit: 10 }, U: { pts: 1500, limit: 3 } };
function seasonChars(season) { return UNIT_LIST.filter(u => u.seasonal === season); }
function eventPoints(sv) { return (sv.evp && sv.evp[eventYM()]) || 0; }
function eventBought(sv, key) { return ((sv.evb && sv.evb[eventYM()]) || {})[key] || 0; }
function eventBuy(sv, key) {
  const it = eventItem(key); if (!it) return false;
  if (!UNITS[key].seasonal && !eventAnyAvail(key)) return false;
  if (eventPoints(sv) < it.pts || eventBought(sv, key) >= it.limit) return false;
  const ym = eventYM(); sv.evp[ym] -= it.pts; sv.evb[ym] = sv.evb[ym] || {}; sv.evb[ym][key] = (sv.evb[ym][key] || 0) + 1; return addPieces(sv, key, 1);
}
// クリアで入るポイント：勝つと 60 + ★×20 + 難易度×10
// むずかしさが上がるほど、ポイントも増える
const EVENT_DIFF_MUL = [0.7, 1, 1.6, 2.4, 3.4, 5];
function eventPointsFor(stars, diff) { return Math.round((60 + stars * 20) * (EVENT_DIFF_MUL[diff == null ? 1 : diff] || 1)); }
// 季節キャラ以外の（ふつうの）エピック以上のキャラも、ポイントでかけらと交換できる（少し割高）
const EVENT_SHOP_ANY = { E: { pts: 120, limit: 10 }, L: { pts: 500, limit: 4 }, U: { pts: 3000, limit: 1 } };
function eventItem(key) { const t = tierOf(key); return UNITS[key] && UNITS[key].seasonal ? EVENT_SHOP[t] : EVENT_SHOP_ANY[t]; }

// ---- イベントクエスト（その月のあいだ、達成するとポイントがもらえる） ----
const EVENT_QUESTS = [
  { id: 'q1', name: 'イベントステージを1回クリア', stat: 'clear', need: 1, pts: 100 },
  { id: 'q2', name: 'イベントステージを3回クリア', stat: 'clear', need: 3, pts: 150 },
  { id: 'q3', name: 'イベントステージを10回クリア', stat: 'clear', need: 10, pts: 300 },
  { id: 'q4', name: '★3（ライフ15以上）でクリア', stat: 'clear3', need: 1, pts: 120 },
  { id: 'q5', name: '「むずかしい」以上でクリア', stat: 'hardclear', need: 1, pts: 200 },
  { id: 'q6', name: '季節限定キャラを入れてクリア', stat: 'seasonClear', need: 1, pts: 150 },
  { id: 'q7', name: 'ボスを5体たおす', stat: 'bossKills', need: 5, pts: 120 },
  { id: 'q8', name: '敵を500体たおす', stat: 'kills', need: 500, pts: 100 },
  { id: 'q9', name: '敵を5000体たおす', stat: 'kills', need: 5000, pts: 300 },
  { id: 'q10', name: '合成を100回する', stat: 'merges', need: 100, pts: 100 },
  { id: 'q11', name: '★7の仲間をつくる', stat: 'made7', need: 1, pts: 150 },
  { id: 'q12', name: 'ガチャを10回引く', stat: 'pulls', need: 10, pts: 100 },
];
function evqRec(sv) { const ym = eventYM(); sv.evq = sv.evq || {}; return sv.evq[ym] = sv.evq[ym] || { s: {}, c: {} }; }
function evqAdd(sv, stat, n) { const r = evqRec(sv); r.s[stat] = (r.s[stat] || 0) + (n == null ? 1 : n); }
function evqGet(sv, stat) { return evqRec(sv).s[stat] || 0; }
function evqDone(sv, q) { return evqGet(sv, q.stat) >= q.need; }
function evqClaimed(sv, q) { return !!evqRec(sv).c[q.id]; }
function evqClaim(sv, q) {
  if (!evqDone(sv, q) || evqClaimed(sv, q)) return false;
  evqRec(sv).c[q.id] = true; sv.evp[eventYM()] = (sv.evp[eventYM()] || 0) + q.pts; return true;
}

// ---- 季節限定キャラ（追加分：各季節 エピック1体・レジェンド1体） ----
ns('spring', 'hanamikozo', '花見だんごの子', 'earth', 120, 26, 1.0, 3.0, 'phys', 'bolt', 'だんご', 'ability', { gold: [2, 3, 5, 8], heal: [0, 0, 1, 1], splash: [0.8, 1, 1.3, 1.8] }, H('#c8e8a0', 4, '#6a9a3a', '#ffb0c8', '#ffffff', 2, 'straw', '#f0d890', 'pack', '#c8a060', 'flag', '#ffb0c8'));
ns('spring', 'uguisu', 'うぐいすの歌姫', 'wind', 170, 0, 0, 4.8, 'none', 'none', '春告げの歌', 'ability', { aAspd: [0.2, 0.3, 0.42, 0.6], aRange: [0.05, 0.1, 0.15, 0.22] }, BD('hawk', '#9ac84a', '#6a9a2a', '#f4ffd0', '#2a2a3a', { crest: 'tuft', cc: '#c8e87a', hd: 'flower', hg: '#ffb0c8', o2: '#ffffff' }));
ns('summer', 'suikawari', 'すいか割りの少年', 'earth', 125, 40, 0.9, 1.8, 'phys', 'melee', 'ぼうたたき', 'atk', { splash: [1, 1.2, 1.5, 2], stun: [0.1, 0.15, 0.2, 0.3] }, H('#3a2a1a', 0, '#2a2a2a', '#4ad07a', '#ffffff', 2, 'band', '#ffffff', 'none', '#fff', 'hammer', '#c8a060'));
ns('summer', 'kaigarahime', '貝殻の人魚姫', 'water', 175, 46, 1.0, 4.0, 'magic', 'bolt', '真珠の歌', 'ability', { chain: [2, 3, 5, 8], slow: [0.2, 0.3, 0.4, 0.5], mark: [0.08, 0.12, 0.18, 0.26] }, H('#ff9ac8', 7, '#2a8aff', '#ffe0ec', '#ffd0f0', 3, 'tiara', '#fff0d8', 'wings', '#ffd0f0', 'harp', '#ffe0ec'));
ns('autumn', 'kuririsu', '栗ひろいリス', 'earth', 120, 22, 1.5, 3.0, 'phys', 'bolt', 'どんぐり投げ', 'aspd', { gold: [2, 3, 5, 8], multi: [0, 1, 1, 2], knock: [0.2, 0.3, 0.4, 0.6] }, BE('#c8803a', 'bear', '#3a2a1a', 'none', '#8a5a2a', '#e8a04a', { tc: '#e8a04a', hd: 'cap', hg: '#c8402a' }));
ns('autumn', 'kitsunebi', '紅葉の狐火', 'fire', 175, 52, 0.9, 4.0, 'magic', 'bolt', '狐火の舞', 'atk', { burn: [0.8, 1.2, 1.8, 2.8], spreadBurn: [0, 1.5, 2, 3], multi: [0, 1, 2, 3] }, BE('#ff7a2a', 'fox', '#ffd24a', 'fan', '#ff4a1a', '#c8321e', { tc: '#ff9a3a', inner: '#fff0d8', hd: 'flower', hg: '#ff5a2a' }));
ns('winter', 'kamakura', 'かまくらの雪うさぎ', 'water', 125, 0, 0, 4.2, 'none', 'none', '雪の結界', 'ability', { eSlow: [0.15, 0.2, 0.28, 0.4], eVuln: [0.04, 0.06, 0.1, 0.15] }, BE('#f4faff', 'rabbit', '#4ab0ff', 'none', '#bff4ff', '#e8505a', { inner: '#ffc0d0', hd: 'cap', hg: '#e8f6ff' }));
ns('winter', 'mochitsuki', 'もちつきの兎', 'light', 175, 58, 0.8, 2.2, 'phys', 'melee', 'ぺったんこ', 'atk', { stun: [0.2, 0.3, 0.4, 0.55], knock: [0.4, 0.6, 0.9, 1.4], splash: [1, 1.2, 1.5, 2] }, BE('#fffbe8', 'rabbit', '#ff6a6a', 'hammer', '#c8a060', '#ffd24a', { inner: '#ffc0d0', hd: 'band', hg: '#e8404a' }));
// 季節（と前半・後半）ごとに、イベントで交換できる「ふつうのキャラ」が入れかわる（ランクごとに8つに分けて、1つずつ）
const SEASON_IDX = { spring: 0, summer: 1, autumn: 2, winter: 3 };
function eventAnyList(tier, season, half) { const slot = SEASON_IDX[season || SEASON_OF(eventMonth())] * 2 + (half == null ? eventHalf() : half); return UNIT_LIST.filter(u => !u.seasonal && tierOf(u.key) === tier).filter((u, i) => i % 8 === slot); }
function eventAnyAvail(key) { const u = UNITS[key]; return !!u && !u.seasonal && eventAnyList(tierOf(key)).some(x => x.key === key); }

// ---- 季節限定キャラ（さらに追加：各季節 エピック1体・レジェンド1体 → 各季節7体） ----
ns('spring', 'ichigohime', 'いちご摘みの娘', 'earth', 125, 30, 1.0, 3.2, 'phys', 'bolt', '甘い実り', 'ability', { gold: [2, 4, 6, 10], slow: [0.15, 0.2, 0.28, 0.4], heal: [0, 0, 1, 1] }, H('#ff6a8a', 5, '#c8203a', '#ffb0c8', '#ffffff', 2, 'cap', '#ffffff', 'pack', '#ff6a8a', 'bell', '#ff6a8a'));
ns('spring', 'yozakura', '夜桜の剣舞', 'dark', 180, 58, 1.2, 2.2, 'phys', 'melee', '花ふぶき斬り', 'aspd', { crit: [0.15, 0.25, 0.35, 0.5], echo: [0.15, 0.25, 0.35, 0.5], splash: [0.8, 1, 1.4, 2] }, H('#2a1a3a', 3, '#ff6a9a', '#5a2a6a', '#ffb0d0', 4, 'ninja', '#3a1a4a', 'cape', '#ff9ac0', 'katana', '#ffd0e8'));
ns('summer', 'fuurin', '風鈴の少女', 'wind', 125, 0, 0, 4.6, 'none', 'none', 'ちりん', 'ability', { aRange: [0.1, 0.15, 0.22, 0.32], aAspd: [0.1, 0.15, 0.22, 0.32] }, H('#bff4ff', 2, '#2a8aff', '#ffffff', '#6ad0ff', 3, 'band', '#6ad0ff', 'none', '#fff', 'bell', '#bff4ff'));
ns('summer', 'kakigori', 'かき氷の雪女', 'water', 175, 50, 0.9, 3.8, 'magic', 'bolt', '氷のシロップ', 'ability', { slow: [0.3, 0.4, 0.5, 0.6], stun: [0.1, 0.15, 0.2, 0.3], splash: [1.2, 1.5, 1.9, 2.5], vsSlow: [0.3, 0.5, 0.8, 1.2] }, H('#e8faff', 7, '#4ab0ff', '#ff9ac8', '#ffffff', 3, 'tiara', '#bff4ff', 'scarf', '#ff9ac8', 'wand', '#ff9ac8'));
ns('autumn', 'kinokokari', 'きのこ狩りの子', 'dark', 120, 20, 1.2, 3.2, 'phys', 'bolt', '毒きのこ', 'ability', { poison: [0.6, 0.9, 1.3, 2], detPoison: [0, 1, 1.6, 2.4] }, H('#c8803a', 0, '#6a3a1a', '#a0522a', '#ffe0a0', 2, 'straw', '#e8d49a', 'pack', '#8a5a2a', 'flask', '#c070ff'));
ns('autumn', 'ichoumusha', '銀杏の武者', 'earth', 180, 64, 0.8, 2.2, 'phys', 'melee', '黄金の葉吹雪', 'atk', { splash: [1.2, 1.5, 2, 2.8], pierce: [1, 2, 3, 4], vsFull: [0.3, 0.5, 0.8, 1.3] }, H('#ffd24a', 5, '#8a5a1a', '#c8a030', '#fff0b0', 1, 'helm', '#e8b830', 'cape', '#ffc840', 'spear', '#fff0b0'));
ns('winter', 'tonakai', 'トナカイの少年', 'wind', 125, 28, 1.2, 3.4, 'phys', 'bolt', 'そりすべり', 'aspd', { multi: [0, 1, 1, 2], knock: [0.3, 0.5, 0.7, 1.1], gold: [1, 2, 3, 5] }, H('#a07a4a', 4, '#3a2a1a', '#c8402a', '#ffffff', 2, 'horn', '#a07a4a', 'scarf', '#e8404a', 'bell', '#ffd24a'));
ns('winter', 'osechi', 'おせちの福神', 'light', 175, 0, 0, 5.0, 'none', 'none', '福をよぶ', 'ability', { aAtk: [0.12, 0.18, 0.26, 0.4], aChance: [0.1, 0.15, 0.22, 0.32], gA: [2, 3, 5, 8] }, H('#fff0b0', 6, '#c8402a', '#e8404a', '#ffd24a', 5, 'top', '#e8404a', 'pack', '#ffd24a', 'fan', '#ffd24a'));
