'use strict';
// ===== ガチャ・かけら・キャラのレベル（DOMなし：node からテストできる） =====
const START_GEMS = 300;
// ガチャは3種類。ノーマル＝初心者向け（レジェンドは出ない）、レア＝レジェンドが出る、ウルトラ＝キャラそのものが必ず出る
const GACHAS = {
  normal: { name: 'ノーマルガチャ', cost: 100, cost10: 900, direct: 0.004, tier: { C: 1.6, R: 1.2, E: 0.5, L: 0, U: 0 }, pieces: [[1, 40], [2, 35], [3, 18], [5, 7]], ticket: true, desc: '初心者向け。レジェンドは出ません', col: '#7ad0ff' },
  rare: { name: 'レアガチャ', cost: 300, cost10: 2700, direct: 0.02, tier: { C: 0.6, R: 1, E: 1.4, L: 1.2, U: 0 }, pieces: [[1, 30], [2, 35], [3, 22], [5, 13]], ticket: true, desc: 'レジェンドが出る！かけらも多め', col: '#d08aff' },
  ultra: { name: 'ウルトラガチャ', cost: 10000, cost10: 90000, direct: 1, tier: { C: 0, R: 0.3, E: 1, L: 2.2, U: 2.2 }, pieces: [[1, 100]], ticket: false, desc: 'キャラそのものが必ず出る！ミシックはここだけ。チケットは出ません', col: '#ffd24a' },
};
const GACHA_TYPES = ['normal', 'rare', 'ultra'];
const GACHA_COST = GACHAS.normal.cost, GACHA10_COST = GACHAS.normal.cost10;
function gachaCost(type, n) { const g = GACHAS[type]; return n === 10 ? g.cost10 : g.cost * n; }
const PIECES_UNLOCK = 10;          // かけら10個でキャラ解放（所持キャラを直引きしたときは10個ぶん）
const DIRECT_RATE = 0.004;         // キャラそのものを引く確率（0.4%）
const LV_COST = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18];   // Lv n → n+1 に必要なかけら（合計145）   // Lv n → n+1 に必要なかけら
const TIER_W = { C: 45, R: 30, E: 18, L: 7 };
const TIER_NAME = { C: 'コモン', R: 'レア', E: 'エピック', L: 'レジェンド', U: 'ミシック' };
const PIECE_TABLE = [[1, 55], [2, 30], [3, 12], [5, 3]];   // [個数, 重み]   // [個数, 重み]

function tierOf(key) { if (UNITS[key].tier) return UNITS[key].tier; const c = UNITS[key].cost; return c <= 70 ? 'C' : c <= 110 ? 'R' : c <= 140 ? 'E' : 'L'; }
function defaultSave() {
  return { stars: new Array(STAGES.length).fill(0), form: ['sword', 'archer', 'mage', 'ice', 'siren'], endlessBest: 0, plays: 0, gems: START_GEMS, pieces: {}, owned: {}, lvl: {}, pulls: 0, diffClear: [], tickets: { normal: 0, rare: 0 }, ver: 2 };
}
function normalizeSave(s) {
  s = s || {}; const old = s.ver == null && Object.keys(s).length > 0, d = defaultSave();
  for (const k in d) if (s[k] == null) s[k] = d[k];
  while (s.stars.length < STAGES.length) s.stars.push(0);
  // 以前の版（ステージクリアで仲間が増えていた頃）のデータは、すでに解放済みだった仲間をそのまま持たせる
  if (old) { s.owned = s.owned || {}; for (let i = 0; i < STAGE_UNLOCK.length; i++) if (s.stars[i] > 0) for (const k of STAGE_UNLOCK[i]) s.owned[k] = true; }
  if (!s.tickets || typeof s.tickets !== 'object') s.tickets = { normal: 0, rare: 0 }; s.tickets.normal = s.tickets.normal || 0; s.tickets.rare = s.tickets.rare || 0;
  if (!s.pieces || typeof s.pieces !== 'object') s.pieces = {}; if (!s.owned || typeof s.owned !== 'object') s.owned = {}; if (!s.lvl || typeof s.lvl !== 'object') s.lvl = {};
  return s;
}
// 最初から持っている6体と、ガチャで手に入れた仲間
function isOwned(sv, key, all) { return !!(all || START_UNITS.includes(key) || sv.owned[key]); }
function lvOf(sv, key) { return Math.max(1, Math.min(MAX_LV, sv.lvl[key] || 1)); }
function piecesOf(sv, key) { return sv.pieces[key] || 0; }
function lvNeed(sv, key) { const l = lvOf(sv, key); return l >= MAX_LV ? null : LV_COST[l - 1]; }
// かけらを増やす。未解放で10個以上になったら自動で解放（10個を消費）
function addPieces(sv, key, n) {
  sv.pieces[key] = piecesOf(sv, key) + n; let unlocked = false;
  if (!isOwned(sv, key) && sv.pieces[key] >= PIECES_UNLOCK) { sv.pieces[key] -= PIECES_UNLOCK; sv.owned[key] = true; unlocked = true; }
  return { unlocked };
}
function levelUp(sv, key) {
  if (!isOwned(sv, key)) return false; const need = lvNeed(sv, key); if (need == null || piecesOf(sv, key) < need) return false;
  sv.pieces[key] -= need; sv.lvl[key] = lvOf(sv, key) + 1; return true;
}
// キャラごとの出やすさ：安い（弱めの）キャラほど、1体あたり少し出やすい（30Gで×1.5 → 200Gで×1.0 に近づく）
const _cw = {};
function charWeights(type) {
  type = type || 'normal'; if (_cw[type]) return _cw[type];
  const tm = GACHAS[type].tier;
  return _cw[type] = UNIT_LIST.map(u => [u.key, (1.5 - 0.5 * clamp((u.cost - 30) / 170, 0, 1)) * tm[tierOf(u.key)]]).filter(x => x[1] > 0);
}
function tierRates(type) { const r = { C: 0, R: 0, E: 0, L: 0, U: 0 }; let sum = 0; for (const [k, w] of charWeights(type)) { r[tierOf(k)] += w; sum += w; } for (const t in r) r[t] /= sum; return r; }
function charRate(key, type) { let sum = 0, mine = 0; for (const [k, w] of charWeights(type)) { sum += w; if (k === key) mine = w; } return mine / sum; }
function wpickR(items, rnd) { let sum = 0; for (const it of items) sum += it[1]; let r = rnd() * sum; for (const it of items) { r -= it[1]; if (r <= 0) return it[0]; } return items[items.length - 1][0]; }
// ガチャを1回引く。{key, kind: 'piece'|'new'|'dup', n, unlocked}
function rollOne(sv, rnd, type) {
  type = type || 'normal'; const g = GACHAS[type];
  const key = wpickR(charWeights(type), rnd), tier = tierOf(key);
  sv.pulls = (sv.pulls || 0) + 1;
  if (g.direct >= 1 || rnd() < g.direct) {
    if (isOwned(sv, key)) { sv.pieces[key] = piecesOf(sv, key) + PIECES_UNLOCK; return { key, kind: 'dup', n: PIECES_UNLOCK, tier }; }
    sv.owned[key] = true; return { key, kind: 'new', n: 0, tier };
  }
  const n = wpickR(g.pieces, rnd), r = addPieces(sv, key, n);
  return { key, kind: 'piece', n, unlocked: r.unlocked, tier };
}
// type: 'normal' | 'rare' | 'ultra'。useTicket=true ならチケット1枚で1回だけ無料（ウルトラは不可）
function rollGacha(sv, count, rnd, type, useTicket) {
  type = type || 'normal';
  if (useTicket) {
    if (!GACHAS[type].ticket || count !== 1 || (sv.tickets[type] || 0) < 1) return null;
    sv.tickets[type]--; return [rollOne(sv, rnd || Math.random, type)];
  }
  const cost = gachaCost(type, count);
  if (sv.gems < cost) return null;
  sv.gems -= cost; const out = []; for (let i = 0; i < count; i++) out.push(rollOne(sv, rnd || Math.random, type)); return out;
}
// ステージクリアなどで、たまにチケットが落ちる（ウルトラは出ない）。戻り値: 'normal' | 'rare' | null
function ticketDrop(sv, win, endless, diff, rnd) {
  rnd = rnd || Math.random; const dm = 1 + 0.15 * (diff || 0);
  let t = null;
  if (win && !endless) { if (rnd() < 0.10 * dm) t = 'rare'; else if (rnd() < 0.40) t = 'normal'; }
  else if (win) { if (rnd() < 0.25) t = 'normal'; }
  else if (rnd() < 0.08) t = 'normal';
  if (t) sv.tickets[t]++; return t;
}
// 戦闘で手に入るジェム
function gemsForBattle(wave, win, stars, endless, diff) { return Math.round((Math.max(0, wave - 1) * (endless ? 8 : 6) + (win ? 200 + stars * 60 : 0)) * diffOf(diff).gem); }
