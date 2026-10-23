'use strict';
// ===== ガチャ・かけら・キャラのレベル（DOMなし：node からテストできる） =====
const GACHA_COST = 100, GACHA10_COST = 900, START_GEMS = 300;
const PIECES_UNLOCK = 10;          // かけら10個でキャラ解放（所持キャラを直引きしたときは10個ぶん）
const DIRECT_RATE = 0.004;         // キャラそのものを引く確率（0.4%）
const LV_COST = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18];   // Lv n → n+1 に必要なかけら（合計145）   // Lv n → n+1 に必要なかけら
const TIER_W = { C: 45, R: 30, E: 18, L: 7 };
const TIER_NAME = { C: 'コモン', R: 'レア', E: 'エピック', L: 'レジェンド' };
const PIECE_TABLE = [[1, 55], [2, 30], [3, 12], [5, 3]];   // [個数, 重み]   // [個数, 重み]

function tierOf(key) { const c = UNITS[key].cost; return c <= 70 ? 'C' : c <= 110 ? 'R' : c <= 140 ? 'E' : 'L'; }
function defaultSave() {
  return { stars: new Array(10).fill(0), form: ['sword', 'archer', 'mage', 'ice', 'siren'], endlessBest: 0, plays: 0, gems: START_GEMS, pieces: {}, owned: {}, lvl: {}, pulls: 0, diffClear: [] };
}
function normalizeSave(s) {
  s = s || {}; const d = defaultSave();
  for (const k in d) if (s[k] == null) s[k] = d[k];
  while (s.stars.length < 10) s.stars.push(0);
  if (!s.pieces || typeof s.pieces !== 'object') s.pieces = {}; if (!s.owned || typeof s.owned !== 'object') s.owned = {}; if (!s.lvl || typeof s.lvl !== 'object') s.lvl = {};
  return s;
}
// ステージクリア・最初から・ガチャのどれかで解放されているか
function isOwned(sv, key, all) {
  if (all || START_UNITS.includes(key) || sv.owned[key]) return true;
  for (let i = 0; i < STAGE_UNLOCK.length; i++) if (STAGE_UNLOCK[i].includes(key)) return sv.stars[i] > 0;
  return false;
}
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
function wpickR(items, rnd) { let sum = 0; for (const it of items) sum += it[1]; let r = rnd() * sum; for (const it of items) { r -= it[1]; if (r <= 0) return it[0]; } return items[items.length - 1][0]; }
// ガチャを1回引く。{key, kind: 'piece'|'new'|'dup', n, unlocked}
function rollOne(sv, rnd) {
  const tier = wpickR(Object.keys(TIER_W).map(k => [k, TIER_W[k]]), rnd);
  const keys = UNIT_LIST.filter(u => tierOf(u.key) === tier).map(u => u.key), key = keys[Math.floor(rnd() * keys.length)];
  sv.pulls = (sv.pulls || 0) + 1;
  if (rnd() < DIRECT_RATE) {
    if (isOwned(sv, key)) { sv.pieces[key] = piecesOf(sv, key) + PIECES_UNLOCK; return { key, kind: 'dup', n: PIECES_UNLOCK, tier }; }
    sv.owned[key] = true; return { key, kind: 'new', n: 0, tier };
  }
  const n = wpickR(PIECE_TABLE, rnd), r = addPieces(sv, key, n);
  return { key, kind: 'piece', n, unlocked: r.unlocked, tier };
}
function rollGacha(sv, count, rnd) {
  const cost = count === 10 ? GACHA10_COST : GACHA_COST * count;
  if (sv.gems < cost) return null;
  sv.gems -= cost; const out = []; for (let i = 0; i < count; i++) out.push(rollOne(sv, rnd || Math.random)); return out;
}
// 戦闘で手に入るジェム
function gemsForBattle(wave, win, stars, endless, diff) { return Math.round((Math.max(0, wave - 1) * (endless ? 8 : 6) + (win ? 200 + stars * 60 : 0)) * diffOf(diff).gem); }
