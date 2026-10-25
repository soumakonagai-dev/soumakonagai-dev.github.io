'use strict';
// ===== ゲームロジック（DOMなし：tools/sim.js からも動く） =====
var G = null;
// 演出フック（art.js が上書きする）
const FX = { hitVfx() {}, num() {}, hit() {}, confetti() {}, rays() {}, kill() {}, num() {}, slash() {}, burst() {}, ring() {}, text() {}, coin() {}, bolt() {}, pillar() {}, beam() {}, meteor() {}, banner() {}, shake() {}, flash() {}, leak() {} };
const SFX = { play() {} };

// ---------- レイアウト ----------
function makeLayout(portrait) {
  if (!portrait) return { portrait: false, W: 960, H: 640, fx: 0, fy: 92, fw: 960, fh: 422, S: 34, panelY: 514 };
  return { portrait: true, W: 540, H: 960, fx: 0, fy: 118, fw: 540, fh: 586, S: 31, panelY: 704 };
}
function buildPath(st, L) {
  const pts = st.path.map(([u, v]) => L.portrait ? { x: L.fx + v * L.fw, y: L.fy + u * L.fh } : { x: L.fx + u * L.fw, y: L.fy + v * L.fh });
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1] };
}
function pathPos(P, d, out) {
  d = clamp(d, 0, P.len);
  let i = 1; while (i < P.cum.length - 1 && P.cum[i] < d) i++;
  const a = P.pts[i - 1], b = P.pts[i], t = (d - P.cum[i - 1]) / ((P.cum[i] - P.cum[i - 1]) || 1);
  out.x = a.x + (b.x - a.x) * t; out.y = a.y + (b.y - a.y) * t;
  out.dx = b.x - a.x; out.dy = b.y - a.y;
  return out;
}
function distToPath(P, x, y) {
  let best = 1e9;
  for (let i = 1; i < P.pts.length; i++) {
    const a = P.pts[i - 1], b = P.pts[i], vx = b.x - a.x, vy = b.y - a.y;
    const t = clamp(((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy), 0, 1);
    const d = Math.hypot(x - (a.x + vx * t), y - (a.y + vy * t));
    if (d < best) best = d;
  }
  return best;
}
function genZones(st, L, P, stIdx) {
  const r = mulberry32(stIdx * 7919 + (L.portrait ? 1 : 2)), S = L.S, zs = [];
  for (const type of st.zones) {
    for (let k = 0; k < 800; k++) {
      const x = L.fx + S * 2 + r() * (L.fw - S * 4), y = L.fy + S * 2 + r() * (L.fh - S * 4);
      if (distToPath(P, x, y) < 1.5 * S) continue;
      if (zs.some(z => Math.hypot(z.x - x, z.y - y) < 3.6 * S)) continue;
      zs.push({ type, x, y, r: 1.15 * S }); break;
    }
  }
  return zs;
}

// ---------- 開始 ----------
function newBattle(stageIdx, form, portrait, endless, mlv, diff) {
  const L = makeLayout(portrait), st = STAGES[stageIdx], P = buildPath(st, L);
  const samples = []; for (let d = 0; d < P.len; d += L.S * 0.6) { const o = {}; pathPos(P, d, o); samples.push(o); }
  G = {
    L, stage: stageIdx, st, endless: !!endless, form: form.slice(), path: P, samples, zones: genZones(st, L, P, stageIdx),
    units: [], enemies: [], projs: [], grounds: [], timers: [], auras: [],
    gold: Math.round(START_GOLD * (1 + 0.25 * Math.min(stageIdx, typeof NORMAL_STAGES !== 'undefined' && stageIdx >= NORMAL_STAGES ? 33 : 39))), life: START_LIFE, wave: 0, phase: 'prep', prepT: PREP_TIME, waveT: 0, spawnQ: [], spawnI: 0,
    diff: diff == null ? DEFAULT_DIFF : diff, lv: {}, mlv: mlv || {}, randCount: 0, t: 0, uid: 1, over: null, kills: 0, leaked: 0, deadLog: [], interestCap: 40, goldEarned: 0,
  };
  return G;
}

// ---------- 配置 ----------
function canPlace(x, y, ignore) {
  const L = G.L, S = L.S;
  if (x < L.fx + S * 0.6 || x > L.fx + L.fw - S * 0.6 || y < L.fy + S * 0.7 || y > L.fy + L.fh - S * 0.5) return false;
  if (distToPath(G.path, x, y) < 1.25 * S) return false;
  for (const u of G.units) if (u !== ignore && Math.hypot(u.x - x, u.y - y) < S * 0.95) return false;
  return true;
}
function findSpot(range, noise) {
  const L = G.L, S = L.S; let best = null, bs = -1;
  for (let i = 0; i < 140; i++) {
    const x = L.fx + S + rng() * (L.fw - S * 2), y = L.fy + S + rng() * (L.fh - S * 2);
    if (!canPlace(x, y)) continue;
    let sc = 0; for (const p of G.samples) if (Math.hypot(p.x - x, p.y - y) <= range * S) sc++;
    sc += rng() * noise;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  if (!best) for (let i = 0; i < 400 && !best; i++) {
    const x = L.fx + S + rng() * (L.fw - S * 2), y = L.fy + S + rng() * (L.fh - S * 2);
    if (canPlace(x, y)) best = { x, y };
  }
  return best;
}
function makeUnit(key, star, x, y, invest) {
  return { id: G.uid++, key, star, x, y, cd: 0.3, invest, sleep: 0, hatch: 0, phase: 0, meteorT: 5, reapStack: 0, reapT: 0, breathT: 0, anim: 0, face: 1, born: G.t, frost: 0 };
}
function unitCap() { return G.noCap ? 999 : MAX_UNITS; }
// ★2・★3をいきなり召喚できる。合成して作る（★2=2体分、★3=4体分）より約3割割高
const SUM_MUL = [1, 2.6, 5.2];
function summonCost(key, star) { const d = UNITS[key], s = key === 'egg' ? 1 : clamp(star || 1, 1, 3); return Math.round(d.cost * SUM_MUL[s - 1]); }
// 支援キャラ（攻撃しない応援役）は、同じキャラ2体まで・全部で4体まで
const SUPPORT_PER = 2, SUPPORT_TOTAL = 4;
function supportBlock(key) {
  const d = UNITS[key]; if (!d || d.style !== 'none') return null;
  let n = 0, all = 0; for (const u of G.units) { if (UNITS[u.key].style === 'none') { all++; if (u.key === key) n++; } }
  if (n >= SUPPORT_PER) return '支援キャラは、同じキャラ' + SUPPORT_PER + '体までです';
  if (all >= SUPPORT_TOTAL) return '支援キャラは、ぜんぶで' + SUPPORT_TOTAL + '体までです';
  return null;
}
function summonAt(key, x, y, star) {
  const d = UNITS[key]; if (!d || supportBlock(key)) return null; star = key === 'egg' ? 1 : clamp(star || 1, 1, 3); const cost = summonCost(key, star);
  if (G.gold < cost || G.units.length >= unitCap() || !canPlace(x, y)) return null;
  G.gold -= cost;
  const u = makeUnit(key, star, x, y, cost); G.units.push(u);
  FX.ring(x, y, G.L.S * 1.1, '#ffffff'); FX.burst(x, y, ELEM[d.elem].c, 14 + star * 4, 90); FX.pillar(x, y, ELEM[d.elem].c, 1 + star); FX.confetti(x, y - 8, 8 + star * 4); SFX.play('summon');
  if (star > 1) FX.text(x, y - 34, '★' + star + '召喚！', '#ffe27a', 16);
  return u;
}
function randCost() { return RAND_BASE + RAND_STEP * G.randCount; }
function randomSummon(pos) {
  const c = randCost(); if (G.gold < c || G.units.length >= unitCap()) return null;
  const okKeys = G.form.filter(k => !supportBlock(k)); if (!okKeys.length) return null;
  const key = okKeys[Math.floor(rng() * okKeys.length)], d = UNITS[key];
  const spot = pos && canPlace(pos.x, pos.y) ? pos : findSpot(d.range * 1.3 + 1, 6);
  if (!spot) return null;
  G.gold -= c; G.randCount++;
  const star = rng() < 0.1 ? 2 : 1;
  const u = makeUnit(key, star, spot.x, spot.y, c); G.units.push(u);
  FX.ring(spot.x, spot.y, G.L.S * 1.1, '#ffffff'); FX.burst(spot.x, spot.y, ELEM[d.elem].c, 14, 90); SFX.play('summon');
  if (star === 2) FX.text(spot.x, spot.y - 30, 'ラッキー★2!', '#ffe27a', 16);
  return u;
}
function moveUnit(u, x, y) { if (!canPlace(x, y, u)) return false; u.x = x; u.y = y; return true; }
function canMerge(a, b) {
  if (!a || !b || a === b || a.star !== b.star || a.star >= MAX_STAR) return false;
  if (a.key === 'egg' || b.key === 'egg') return false;
  if (a.key === b.key) return true;
  return (a.key === 'mimic' || b.key === 'mimic') && a.star <= MIMIC_MAX_STAR;   // ミミックのワイルドカード合成は★3どうしまで
}
function mergeUnits(a, b) {   // a を b に重ねる（結果は b の位置に残る）
  if (!canMerge(a, b)) return false;
  b.key = b.key === 'mimic' ? a.key : b.key;
  b.star++; b.invest += a.invest; b.cd = 0.2; b.reapStack = 0; b.sleep = 0; G.merges = (G.merges || 0) + 1; if (b.star >= 7) G.made7 = 1;
  G.units.splice(G.units.indexOf(a), 1);
  const c = ELEM[UNITS[b.key].elem].c;
  FX.pillar(b.x, b.y, c, b.star); FX.ring(b.x, b.y, G.L.S * (1.2 + b.star * 0.25), c); FX.burst(b.x, b.y, c, 10 + b.star * 5, 120 + b.star * 20);
  SFX.play(b.star >= 5 ? 'merge2' : 'merge');
  FX.confetti(b.x, b.y - 10, 10 + b.star * 6); if (b.star >= 3) { FX.rays(b.x, b.y - 10, c, b.star); FX.flash(0.1 + b.star * 0.03); }
  if (b.star >= 5) { FX.flash(0.25 + (b.star - 5) * 0.1); FX.shake(3 + b.star); }
  if (b.star === 3 || b.star === 5 || b.star === 7) FX.text(b.x, b.y - 36, b.star === 7 ? '覚醒！！' : '能力開花！', '#fff3a0', 18);
  return true;
}
function findMergePartner(u) {
  let best = null, bd = 1e9;
  for (const o of G.units) if (canMerge(u, o)) { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function sellValue(u) { return Math.floor(u.invest * SELL_RATE); }
function sellUnit(u) {
  const i = G.units.indexOf(u); if (i < 0) return;
  G.units.splice(i, 1); G.gold += sellValue(u); FX.burst(u.x, u.y, '#ffe066', 10, 70); SFX.play('sell');
}
function upgradeCost(key) { const l = G.lv[key] || 0; return l >= UPG_COST.length ? null : UPG_COST[l]; }
function upgrade(key) {
  const c = upgradeCost(key); if (c == null || G.gold < c) return false;
  G.gold -= c; G.lv[key] = (G.lv[key] || 0) + 1; SFX.play('upgrade');
  for (const u of G.units) if (u.key === key) { FX.ring(u.x, u.y, G.L.S * 1.3, '#ffe27a'); FX.burst(u.x, u.y, '#ffe27a', 8, 80); }
  return true;
}
function skipPrep() {
  if (G.phase !== 'prep' || G.over) return;
  G.gold += Math.floor(G.prepT) * 2; startWave();
}

// ---------- ステータス ----------
function eggPhase(u) { return u.hatch >= 15 ? 3 : u.hatch >= 8 ? 2 : u.hatch >= 3 ? 1 : 0; }
function zoneAt(x, y, type) { for (const z of G.zones) if (z.type === type && Math.hypot(z.x - x, z.y - y) <= z.r) return z; return null; }
function baseOf(u) {
  const d = UNITS[u.key];
  if (u.key === 'egg') { const p = DRAGON[eggPhase(u)]; return p ? { atk: p.atk, aspd: p.aspd, range: p.range } : { atk: 0, aspd: 0, range: 0 }; }
  return d;
}
function computeStats(u) {
  const S = G.L.S, d = UNITS[u.key], b = baseOf(u), sf = u.key === 'egg' ? 0 : u.star - 1;
  let atk = b.atk * STAR_ATK[u.key === 'egg' ? 0 : u.star - 1] * (1 + UPG_BONUS * (G.lv[u.key] || 0));
  let aspd = b.aspd * (1 + 0.05 * sf), range = b.range * S * (1 + 0.05 * sf), chance = 1;
  if (zoneAt(u.x, u.y, 'high')) range *= 1.25;
  if (zoneAt(u.x, u.y, 'spring') && d.dmg === 'magic') atk *= 1.2;
  if (zoneAt(u.x, u.y, 'flower')) aspd *= 1.12;
  let cnt = 0;
  for (const o of G.units) if (o !== u && UNITS[o.key].elem === d.elem && Math.hypot(o.x - u.x, o.y - u.y) <= 1.75 * S) cnt++;
  atk *= 1 + 0.1 * Math.min(cnt, 3);
  // 応援・支援の効果は「たし算」（何体いても、かけ算にはならない）
  let sAtk = 0, sAspd = 0, sRange = 0;
  for (const a of G.auras) {
    if (a.u === u || Math.hypot(a.x - u.x, a.y - u.y) > a.r) continue;
    sAspd += a.aspd; sAtk += a.atk; sRange += a.range || 0; if (a.chance > chance) chance = a.chance;
  }
  aspd *= 1 + sAspd; atk *= 1 + sAtk; range *= 1 + sRange;
  if (u.reapStack) aspd *= 1 + 0.05 * u.reapStack;
  if (u.rampN && d.fx && d.fx.ramp) aspd *= 1 + fxv(u, 'ramp') * u.rampN;
  if (u.frost > 0) aspd *= 0.7;
  const mb = levelBonus(u.key, G.mlv[u.key] || 1);
  atk *= mb.atk * ATK_MUL * DMG_SCALE * (TIER_ATK[tierOf(u.key)] || 1); aspd *= mb.aspd; range *= mb.range; chance *= mb.ab;
  if (u.key === 'sniper' && u.star >= 7) range = 3000;
  u.st = { atk, aspd, range, chance, res: cnt, ab: mb.ab };
  return u.st;
}
function buildAuras() {
  const S = G.L.S; G.auras.length = 0;
  for (const u of G.units) {
    if (u.sleep > 0) continue;
    if (u.key === 'siren' || u.key === 'priest') {
      const mb = levelBonus(u.key, G.mlv[u.key] || 1);
      let r = UNITS[u.key].range * S * (1 + 0.05 * (u.star - 1)) * (zoneAt(u.x, u.y, 'altar') ? 1.2 : 1) * mb.range;
      const a = { u, x: u.x, y: u.y, r, aspd: 0, atk: 0, chance: 1 };
      const lvm = (1 + UPG_BONUS * (G.lv[u.key] || 0) * 0.5) * mb.ab;
      if (u.key === 'siren') { a.aspd = (u.star >= 3 ? 0.25 : 0.15) * lvm; if (u.star >= 5) a.atk = 0.15 * lvm; if (u.star >= 7) a.r = 1e9; }
      else { a.atk = (u.star >= 5 ? 0.35 : 0.2) * lvm; if (u.star >= 7) a.chance = 2; }
      G.auras.push(a);
    } else if (UNITS[u.key].fx && UNITS[u.key].style === 'none') {
      const mb = levelBonus(u.key, G.mlv[u.key] || 1), lvm = (1 + UPG_BONUS * (G.lv[u.key] || 0) * 0.5) * mb.ab * (TIER_SUP[tierOf(u.key)] || 1);
      const r = UNITS[u.key].range * S * (1 + 0.05 * (u.star - 1)) * (zoneAt(u.x, u.y, 'altar') ? 1.2 : 1) * mb.range;
      G.auras.push({ u, x: u.x, y: u.y, r, aspd: fxv(u, 'aAspd') * lvm, atk: fxv(u, 'aAtk') * lvm, range: fxv(u, 'aRange') * lvm, chance: 1 + fxv(u, 'aChance') * lvm });
    }
  }
}

// ---------- 敵 ----------
function spawnEnemy(type, hpMul, opt) {
  const def = ENEMIES[type], S = G.L.S; opt = opt || {};
  const hp = opt.hp != null ? opt.hp : def.hp * hpMul * DMG_SCALE;
  const e = { id: G.uid++, type, def, hp, maxhp: hp, d: opt.d || 0, x: 0, y: 0, dx: 1, dy: 0, r: def.r * S, speed: def.spd * S * DIFFS[G.diff].spd,
    defv: def.def, mr: def.mr, shred: 0, mrShred: 0, mrD: 0, slowAmt: 0, slowT: 0, freeze: 0, stun: 0, pois: null, noHeal: 0, shield: 0,
    invis: !!def.invis, fly: !!def.fly, reveal: 0, hit: 0, dead: false, invuln: 0, boost: 0, t: 0, gold: opt.gold != null ? opt.gold : def.gold,
    leak: def.leak, mini: !!opt.mini, boss: opt.boss || null, skillT: 4, revived: false, phase: rnd(0, 6) };
  pathPos(G.path, e.d, e); e.x += 0; return (G.enemies.push(e), e);
}
function applySlow(e, amt, t) { if (e.def.key === 'boss') amt *= 0.6; if (amt >= e.slowAmt || e.slowT <= 0) { e.slowAmt = amt; } e.slowT = Math.max(e.slowT, t); }
function applyStun(e, t) { if (e.def.key === 'boss') t *= 0.35; e.stun = Math.max(e.stun, t); }
function dmg(e, raw, kind, src, opt) {
  if (e.dead || raw <= 0) return 0;
  if (e.invuln > 0) return 0;
  let a = raw;
  const pen = opt && opt.pen ? 1 - opt.pen : 1;
  if (kind === 'phys') a = raw * 100 / (100 + Math.max(0, e.defv - e.shred) * pen);
  else if (kind === 'magic') a = raw * 100 / (100 + Math.max(-50, e.mr - e.mrShred - e.mrD));
  const vul = (e.vulnA || 0) + (e.markT > 0 ? e.markV : 0) + (e.burn && e.burn.vul ? e.burn.vul : 0) + (e.sleepMark > 0 ? 0.25 : 0);
  if (vul) a *= 1 + vul;
  if (e.shield > 0) { const ab = Math.min(e.shield, a); e.shield -= ab; a -= ab; }
  e.hp -= a; e.hit = 0.1;
  if (!(opt && (opt.dot || opt.crit))) FX.num(e.x, e.y - e.r, a, false, e.maxhp);
  if (e.invis) e.reveal = 1.5;
  if (opt && opt.crit) FX.num(e.x, e.y - e.r - 6, a, true, e.maxhp);
  if (e.hp <= 0) killEnemy(e, src);
  return a;
}
function enemiesNear(x, y, r, pred) {
  const out = []; for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) <= r && (!pred || pred(e))) out.push(e); return out;
}
function killEnemy(e, src) {
  if (e.dead) return;
  if ((BOSS_BASE[e.boss] || e.boss) === 'demonking' && !e.revived) { e.revived = true; e.hp = e.maxhp * 0.5; e.shield = 0; e.pois = null; e.burn = null; FX.banner('魔王がよみがえった！'); FX.flash(0.5); FX.shake(8); return; }
  e.dead = true; G.kills++; if (e.boss) G.bossKills = (G.bossKills || 0) + 1;
  let g = Math.ceil(e.gold * GOLD_MUL * stageGold(G.stage)), S = G.L.S;
  for (const u of G.units) if (u.key === 'mouse' && u.sleep <= 0) {
    const st = u.st || computeStats(u);
    if (Math.hypot(u.x - e.x, u.y - e.y) <= st.range + e.r) g += u.star >= 5 ? 2 : 1;
  }
  if (src && src.key && UNITS[src.key] && UNITS[src.key].fx) {
    g += fxv(src, 'gold');
    const kh = fxv(src, 'killHeal'); if (kh) { src.kc = (src.kc || 0) + 1; if (src.kc >= kh) { src.kc = 0; if (G.life < START_LIFE) { G.life = Math.min(START_LIFE, Math.ceil(G.life) + 1); FX.text(src.x, src.y - 30, 'ライフ+1', '#ff9ac8', 14); } } }
    const ok = fxv(src, 'onKill'); if (ok && (G._ok || 0) < 3) { G._ok = (G._ok || 0) + 1; FX.ring(e.x, e.y, 1.5 * S, '#ff8a2a'); FX.burst(e.x, e.y, '#ffb36b', 10, 110); for (const o of enemiesNear(e.x, e.y, 1.5 * S, o => o !== e)) dmg(o, (src.st ? src.st.atk : 10) * ok, 'magic', src); G._ok--; }
  }
  for (const u of G.units) if (UNITS[u.key].fx && UNITS[u.key].fx.gA && u.st && Math.hypot(u.x - e.x, u.y - e.y) <= u.st.range + e.r) g += fxv(u, 'gA');
  if (src && src.key === 'alchemist') g += src.star >= 7 ? (e.def.key === 'boss' ? 30 : 5) : src.star >= 5 ? 3 : src.star >= 3 ? 2 : 1;
  if (src && src.id && zoneAt(src.x, src.y, 'stump')) g = Math.ceil(g * 1.3);
  G.gold += g; G.goldEarned += g; FX.coin(e.x, e.y, g);
  FX.kill(e);
  SFX.play(e.def.key === 'boss' ? 'boss_die' : 'die');
  if (e.def.key === 'jelly' && !e.mini) for (let i = 0; i < 3; i++) {
    const m = spawnEnemy('jelly', 1, { hp: e.maxhp * 0.28, d: Math.max(0, e.d - 4 + i * 6), mini: true, gold: 1 });
    m.r = e.r * 0.62; m.maxhp = m.hp; m.leak = 0.34; m.speed *= 1.1;
  } else if (!e.mini && e.def.key !== 'boss' && G.deadLog.length < 40) G.deadLog.push({ type: e.type, maxhp: e.maxhp, d: e.d });
  if (e.pois && e.pois.src && e.pois.src.star >= 7) {
    for (const o of enemiesNear(e.x, e.y, 1.6 * S)) if (o !== e) addPoison(o, e.pois.src, Math.ceil(e.pois.n / 2) + 1, e.pois.dps);
    FX.burst(e.x, e.y, '#9ae86a', 12, 80);
  }
  if (e.burn && e.burn.src && e.burn.src.star >= 7) {
    const bs = e.burn.src; e.burn = null; FX.ring(e.x, e.y, 1.5 * S, '#ff8a4a'); FX.burst(e.x, e.y, '#ffb36b', 14, 110);
    for (const o of enemiesNear(e.x, e.y, 1.5 * S)) if (o !== e) dmg(o, (bs.st ? bs.st.atk : 20) * 2, 'magic', bs);
  }
  if (e.boss === 'queen' && !e.revived) {
    e.revived = true;
    const list = G.deadLog.slice(-8);
    for (const r of list) spawnEnemy(r.type, 1, { hp: r.maxhp * 0.6, d: Math.max(0, e.d - rnd(0, 30)) });
    FX.banner('夜の女王の呪い…倒した敵がよみがえる！'); FX.flash(0.4);
  }
  if (e.def.key === 'boss') { FX.shake(10); FX.flash(0.5); }
}
function addPoison(e, src, n, dps) {
  const max = src.star >= 5 ? 10 : 5;
  if (!e.pois) e.pois = { n: 0, t: 4, dps, src };
  e.pois.n = Math.min(max, e.pois.n + n); e.pois.t = 4; e.pois.dps = Math.max(e.pois.dps, dps); e.pois.src = src;
  if (src.star >= 3) e.noHeal = 4;
}
function addBurn(e, src, dps, vul) { e.burn = { t: 3, dps, src, vul: vul || 0 }; }
function leakEnemy(e) {
  e.dead = true; if (!G.god) G.life -= e.leak; G.leaked += e.leak; FX.leak(e); SFX.play('leak'); FX.shake(5);
  if (G.life <= 0 && !G.god) { G.life = 0; G.over = 'lose'; }
}
function updateEnemies(dt) {
  const S = G.L.S;
  for (const e of G.enemies) { e.mrD = 0; e.vulnA = 0; }
  // 光の司祭 / 氷の精★7 / 氷の巨人
  for (const u of G.units) {
    if (u.sleep > 0) continue;
    if (u.key === 'priest' && u.star >= 3) { const r = UNITS.priest.range * S * (1 + 0.05 * (u.star - 1)); for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - u.x, e.y - u.y) <= r) e.mrD = 15; }
    if (u.key === 'chrono') {
      const mb = levelBonus('chrono', G.mlv.chrono || 1);
      const r = UNITS.chrono.range * S * (1 + 0.05 * (u.star - 1)) * (zoneAt(u.x, u.y, 'altar') ? 1.2 : 1) * mb.range;
      for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - u.x, e.y - u.y) <= r) { applySlow(e, Math.min(0.6, (u.star >= 3 ? 0.3 : 0.2) * mb.ab), 0.3); if (u.star >= 5) e.vulnA = Math.max(e.vulnA, 0.1 * mb.ab); }
      if (u.star >= 7) {
        u.breathT -= dt;
        if (u.breathT <= 0) {
          const hit = G.enemies.filter(e => !e.dead && Math.hypot(e.x - u.x, e.y - u.y) <= r);
          if (hit.length) { u.breathT = 10; for (const e of hit) e.freeze = Math.max(e.freeze, e.def.key === 'boss' ? 0.5 : 1.2); FX.ring(u.x, u.y, r, '#bfe6ff'); FX.flash(0.15); SFX.play('clear'); }
          else u.breathT = 0.5;
        }
      }
    }
    if (UNITS[u.key].fx && UNITS[u.key].style === 'none' && (UNITS[u.key].fx.eSlow || UNITS[u.key].fx.eVuln || UNITS[u.key].fx.eMr)) {
      const mb = levelBonus(u.key, G.mlv[u.key] || 1), r = UNITS[u.key].range * S * (1 + 0.05 * (u.star - 1)) * (zoneAt(u.x, u.y, 'altar') ? 1.2 : 1) * mb.range;
      const sl = Math.min(0.6, fxv(u, 'eSlow') * mb.ab), vu = fxv(u, 'eVuln') * mb.ab, mr = fxv(u, 'eMr');
      for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - u.x, e.y - u.y) <= r) { if (sl) applySlow(e, sl, 0.3); if (vu) e.vulnA = Math.max(e.vulnA, vu); if (mr) e.mrD = Math.max(e.mrD, mr); }
    }
    if (u.key === 'ice' && u.star >= 7) { const r = (u.st ? u.st.range : UNITS.ice.range * S); for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - u.x, e.y - u.y) <= r) applySlow(e, 0.35, 0.3); }
  }
  for (const u of G.units) if (u.frost > 0) u.frost -= dt;
  const list = G.enemies.slice();
  for (const e of list) {
    if (e.dead) continue;
    e.t += dt; if (e.hit > 0) e.hit -= dt; if (e.reveal > 0) e.reveal -= dt;
    if (e.noHeal > 0) e.noHeal -= dt;
    if (e.pois) { e.pois.t -= dt; dmg(e, e.pois.n * e.pois.dps * dt, 'magic', e.pois.src, { dot: true }); if (e.pois && e.pois.t <= 0) e.pois = null; if (e.dead) continue; }
    if (e.sleepMark > 0) e.sleepMark -= dt;
    if (e.markT > 0) e.markT -= dt;
    if (e.burn) { e.burn.t -= dt; dmg(e, e.burn.dps * dt, 'magic', e.burn.src, { dot: true }); if (e.burn && e.burn.t <= 0) e.burn = null; if (e.dead) continue; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
    if (e.freeze > 0) e.freeze -= dt; if (e.stun > 0) e.stun -= dt; if (e.invuln > 0) e.invuln -= dt; if (e.boost > 0) e.boost -= dt;
    // 特殊能力
    const k = e.def.key;
    if (k === 'fairy') { e.skillT -= dt; if (e.skillT <= 0) { e.skillT = 0.5; for (const o of enemiesNear(e.x, e.y, 2.2 * S)) if (o.noHeal <= 0 && o.hp < o.maxhp) o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.025 + 3); e.healFx = 0.3; } }
    if (k === 'knight') { e.skillT -= dt; if (e.skillT <= 0) { e.skillT = 5; for (const o of enemiesNear(e.x, e.y, 2.6 * S)) if (o.def.key !== 'knight' && o.def.key !== 'boss' && o.shield <= 0) o.shield = o.maxhp * 0.25; e.healFx = 0.4; } }
    if (e.boss) bossSkill(e, dt);
    if (e.healFx > 0) e.healFx -= dt;
    let sp = e.speed * (1 - e.slowAmt * (e.slowT > 0 ? 1 : 0)) * (e.boost > 0 ? 2 : 1);
    if (e.freeze > 0 || e.stun > 0) sp = 0;
    e.d += sp * dt;
    if (e.d >= G.path.len) { leakEnemy(e); continue; }
    pathPos(G.path, e.d, e);
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}
function bossSkill(e, dt) {
  const S = G.L.S, BK = BOSS_BASE[e.boss] || e.boss; e.skillT -= dt;
  if (BK === 'treant' && e.skillT <= 0) {
    e.skillT = 7; const near = G.units.filter(u => Math.hypot(u.x - e.x, u.y - e.y) <= 5 * S).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y));
    if (near.length) { near[0].sleep = 3; FX.burst(near[0].x, near[0].y, '#8be08b', 14, 60); FX.text(near[0].x, near[0].y - 30, 'zzz…', '#bff0bf', 16); }
  } else if (BK === 'serpent' && e.skillT <= 0) {
    e.skillT = 12; e.invuln = 3; e.boostLater = true;
  } else if (BK === 'tengu' && e.skillT <= 0) {
    e.skillT = 9; if (G.units.length) {
      const u = G.units[Math.floor(rng() * G.units.length)], sp = findSpot(2.5, 20);
      if (sp) { FX.burst(u.x, u.y, '#ffffff', 14, 100); u.x = sp.x; u.y = sp.y; FX.burst(u.x, u.y, '#ffffff', 14, 100); FX.text(u.x, u.y - 30, '飛ばされた!', '#ffd0d0', 14); }
    }
  } else if (BK === 'pharaoh' && e.skillT <= 0) {
    e.skillT = 9; FX.banner('砂嵐！'); FX.shake(5); for (const u of G.units) if (Math.hypot(u.x - e.x, u.y - e.y) <= 5.5 * S) { u.frost = 3; FX.burst(u.x, u.y, '#e8c070', 6, 60); }
  } else if (BK === 'magmadragon' && e.skillT <= 0) {
    e.skillT = 8; const pick = G.units.slice().sort(() => rng() - 0.5).slice(0, 2); for (const u of pick) { u.sleep = 1.8; FX.burst(u.x, u.y, '#ff7a2a', 14, 100); FX.text(u.x, u.y - 30, 'あちち!', '#ffb070', 14); }
  } else if (BK === 'guardian' && e.skillT <= 0) {
    e.skillT = 12; e.invuln = 2; for (const o of enemiesNear(e.x, e.y, 3.2 * S)) if (o.def.key !== 'boss' && o.shield <= 0) o.shield = o.maxhp * 0.25; FX.ring(e.x, e.y, 3.2 * S, '#ffe27a'); FX.flash(0.2);
  } else if (BK === 'kraken' && e.skillT <= 0) {
    e.skillT = 10; if (G.units.length) { const u = G.units[Math.floor(rng() * G.units.length)], sp = findSpot(2.5, 20); if (sp) { FX.burst(u.x, u.y, '#7affd8', 14, 100); u.x = sp.x; u.y = sp.y; u.sleep = 1; FX.burst(u.x, u.y, '#7affd8', 14, 100); FX.text(u.x, u.y - 30, 'つかまった!', '#bfffee', 14); } }
  } else if (BK === 'demonking' && e.skillT <= 0) {
    e.skillT = 8; const pick = G.units.slice().sort(() => rng() - 0.5).slice(0, 2); for (const u of pick) { u.sleep = 2; FX.burst(u.x, u.y, '#c070ff', 12, 80); FX.text(u.x, u.y - 30, 'zzz…', '#e0c0ff', 14); }
  } else if (BK === 'kyuubi' && e.skillT <= 0) {
    e.skillT = 8; const pick = G.units.slice().sort(() => rng() - 0.5).slice(0, 3); for (const u of pick) { u.sleep = 2; FX.burst(u.x, u.y, '#ff9ac8', 12, 80); FX.text(u.x, u.y - 30, 'うっとり…', '#ffd0e8', 14); }
  } else if (BK === 'raijuu' && e.skillT <= 0) {
    e.skillT = 8; e.boost = 2; const pick = G.units.slice().sort(() => rng() - 0.5).slice(0, 2); for (const u of pick) { u.sleep = 1.6; FX.burst(u.x, u.y, '#ffe27a', 14, 100); FX.text(u.x, u.y - 30, 'びりびり!', '#fff0a0', 14); }
  } else if (BK === 'crystalking' && e.skillT <= 0) {
    e.skillT = 11; e.invuln = 2; for (const o of enemiesNear(e.x, e.y, 3.5 * S)) if (o.def.key !== 'boss' && o.shield <= 0) o.shield = o.maxhp * 0.25; FX.ring(e.x, e.y, 3.5 * S, '#7affff'); FX.flash(0.2);
  } else if (BK === 'clockking' && e.skillT <= 0) {
    e.skillT = 9; FX.banner('時間よ、止まれ！'); const pick = G.units.slice().sort(() => rng() - 0.5).slice(0, 4); for (const u of pick) { u.sleep = 1.5; FX.burst(u.x, u.y, '#ffd070', 10, 80); }
  } else if (BK === 'treequeen' && e.skillT <= 0) {
    e.skillT = 8; const pick = G.units.slice().sort(() => rng() - 0.5).slice(0, 3); for (const u of pick) { u.sleep = 1.6; FX.burst(u.x, u.y, '#8be08b', 12, 70); FX.text(u.x, u.y - 30, 'からまった!', '#c8f8c0', 14); } for (const o of enemiesNear(e.x, e.y, 3 * S)) if (o.noHeal <= 0 && o.hp < o.maxhp) o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.04);
  } else if (BK === 'giant') {
    for (const u of G.units) if (Math.hypot(u.x - e.x, u.y - e.y) <= 4.5 * S) u.frost = 0.3;
  }
  if (e.boostLater && e.invuln <= 0 && BK === 'serpent') { e.boostLater = false; e.boost = 3; }
}

// ---------- ユニットの攻撃 ----------
function canTarget(u, st, e) {
  if (e.dead) return false;
  const ghost5 = u.key === 'ghost' && u.star >= 5;
  if (e.fly && st.range < 2 * G.L.S && !ghost5) return false;
  if (e.invis && e.reveal <= 0 && UNITS[u.key].elem !== 'light' && !ghost5) return false;
  if (e.invuln > 0) return false;
  return true;
}
function pickTarget(u, st, mode, exclude) {
  let best = null, bv = -1;
  for (const e of G.enemies) {
    if (exclude && exclude.includes(e)) continue;
    if (Math.hypot(e.x - u.x, e.y - u.y) > st.range + e.r * 0.5 || !canTarget(u, st, e)) continue;
    if (e.d <= 2) continue;
    const v = mode === 'strong' ? e.hp : e.d;
    if (v > bv) { bv = v; best = e; }
  }
  return best;
}
function shoot(u, e, st, color, speed) {
  G.projs.push({ x: u.x, y: u.y - G.L.S * 0.5, tgt: e, tx: e.x, ty: e.y, sp: G.L.S * (speed || 11), u, st, color, key: u.key, life: 3, trail: [] });
}
// 攻撃がはやい・連撃のキャラは、数回うつごとに ちょっと ひと息つく（そのぶん合間をつめて、全体のダメージは同じ）
function nextCd(u, st) {
  const base = 1 / st.aspd, d = UNITS[u.key], fx = d.fx || {};
  if (!(st.aspd >= 1.4 || fx.echo || fx.multi)) return base;
  const burst = st.aspd >= 2.4 ? 5 : st.aspd >= 1.8 ? 4 : 3, rest = Math.min(0.45, 0.25 + 0.04 * burst), iw = (burst * base - rest) / burst;
  if (iw < 0.12) return base;
  u.bn = (u.bn || 0) + 1;
  if (u.bn >= burst) { u.bn = 0; u.restT = rest; return iw + rest; }
  return iw;
}
function updateUnits(dt) {
  const S = G.L.S;
  buildAuras();
  for (const u of G.units) {
    u.anim = Math.max(0, u.anim - dt * 3.6); if (u.restT > 0) u.restT -= dt;
    if (u.sleep > 0) { u.sleep -= dt; continue; }
    const st = computeStats(u), d = UNITS[u.key];
    if (u.reapT > 0) { u.reapT -= dt; if (u.reapT <= 0) u.reapStack = 0; }
    if (u.key === 'egg') {
      const ph = eggPhase(u);
      if (ph !== u.phase) { u.phase = ph; FX.pillar(u.x, u.y, '#ff9a5a', 6); FX.ring(u.x, u.y, S * 2, '#ffcf8a'); FX.text(u.x, u.y - 40, ph ? DRAGON[ph].name + 'に成長！' : '', '#ffd9a0', 16); SFX.play('merge2'); }
      if (ph === 3) { u.breathT -= dt; if (u.breathT <= 0) { u.breathT = 6; globalBreath(u, st); } }
      if (ph === 0) continue;
    }
    if (d.fx && d.fx.pulse && fxv(u, 'pulse') > 0) {
      u.pulseT = (u.pulseT == null ? 3 : u.pulseT) - dt;
      if (u.pulseT <= 0) {
        const hit = G.enemies.filter(e => !e.dead && e.d > 2 && Math.hypot(e.x - u.x, e.y - u.y) <= st.range + e.r * 0.5);
        if (hit.length) {
          u.pulseT = 6; FX.ring(u.x, u.y, st.range, ELEM[d.elem].c); FX.shake(2); SFX.play('boom');
          const ps = fxv(u, 'pulseStun');
          for (const e of hit) { e.reveal = Math.max(e.reveal, 1.5); dmg(e, st.atk * fxv(u, 'pulse'), d.dmg === 'phys' ? 'phys' : 'magic', u); if (ps && !e.dead) applyStun(e, ps * st.ab); }
        } else u.pulseT = 0.5;
      }
    }
    if (d.style === 'none') continue;
    if (u.key === 'dryad') {
      u.rootT = (u.rootT == null ? 2 : u.rootT) - dt;
      if (u.rootT <= 0) {
        const cand = G.enemies.filter(e => canTarget(u, st, e) && e.d > 2 && Math.hypot(e.x - u.x, e.y - u.y) <= st.range + e.r * 0.5).sort((a, b) => b.d - a.d);
        if (cand.length) {
          u.rootT = 4; const n = u.star >= 7 ? 99 : u.star >= 5 ? 3 : u.star >= 3 ? 2 : 1;
          for (const e of cand.slice(0, n)) { applyStun(e, 1.2 * st.ab); if (u.star >= 5) dmg(e, st.atk * 2, 'magic', u); FX.burst(e.x, e.y, '#7be08a', 10, 60); FX.ring(e.x, e.y, S * 0.7, '#7be08a'); }
          SFX.play('shot_wind');
        } else u.rootT = 0.4;
      }
    }
    if (u.key === 'mage' && u.star >= 7) {
      u.meteorT -= dt;
      if (u.meteorT <= 0) {
        const t = pickTarget(u, st, 'first');
        if (t) { u.meteorT = 5; const tx = t.x, ty = t.y; FX.meteor(tx, ty); G.timers.push({ t: 0.55, fn: () => meteorHit(u, st, tx, ty) }); }
        else u.meteorT = 0.5;
      }
    }
    u.cd -= dt; if (u.cd > 0) continue;
    const mode = u.key === 'sniper' ? 'strong' : 'first';
    const t = pickTarget(u, st, mode); if (!t) { u.cd = 0; continue; }
    u.cd += nextCd(u, st); if (u.cd < 0) u.cd = 0.05;
    u.anim = 1; u.face = t.x >= u.x ? 1 : -1;
    if (d.fx && d.fx.ramp) { if (u.rampTgt === t) u.rampN = Math.min(10, (u.rampN || 0) + 1); else { u.rampTgt = t; u.rampN = 0; } }
    fire(u, st, t);
  }
}
function fire(u, st, t) {
  const d = UNITS[u.key], col = ELEM[d.elem].c;
  SFX.play('shot_' + u.key);
  if (u.key === 'archer' && u.star >= 7) {
    const picks = [t]; for (let i = 0; i < 2; i++) { const o = pickTarget(u, st, 'first', picks); if (o) picks.push(o); }
    for (const e of picks) shoot(u, e, st, col, 14); return;
  }
  if (u.key === 'egg') {
    const ph = eggPhase(u);
    if (ph >= 2) { breathLine(u, st, t, ph); return; }
    shoot(u, t, st, '#ff8a4a', 9); return;
  }
  if (d.style === 'melee') { FX.slash(t.x, t.y, col, u); (hitFns[u.key] || hitFns.__tpl)(u, st, t); FX.hitVfx({ u, key: u.key, tx: t.x, ty: t.y }); return; }
  if (d.style === 'zap') { hitFns.thunder(u, st, t); return; }
  if (d.fx && fxv(u, 'multi') > 0) {
    const m = fxv(u, 'multi'), picks = [t];
    for (let i = 0; i < m; i++) { const o = pickTarget(u, st, 'first', picks); if (o) picks.push(o); }
    for (const o of picks) shoot(u, o, st, col, 12); return;
  }
  if (u.key === 'miko') {
    const n = u.star >= 5 ? 3 : 2, picks = [t];
    for (let i = 1; i < n; i++) { const o = pickTarget(u, st, 'first', picks); if (o) picks.push(o); }
    for (let i = 0; i < n; i++) shoot(u, picks[i % picks.length], st, '#ff9a5a', 10);
    return;
  }
  shoot(u, t, st, col, u.key === 'sniper' ? 24 : u.key === 'ninja' ? 17 : u.key === 'cannon' ? 8 : 11);
}
function updateProjs(dt) {
  for (const p of G.projs) {
    p.life -= dt;
    if (p.tgt && !p.tgt.dead) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, dd = Math.hypot(dx, dy), step = p.sp * dt;
    p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 6) p.trail.shift();
    if (dd <= step + 3) {
      p.x = p.tx; p.y = p.ty; p.done = true;
      const e = p.tgt;
      if (p.u.key === 'egg') dragonBall(p.u, p.st, e, p.tx, p.ty);
      else (hitFns[p.key] || hitFns.__tpl)(p.u, p.st, e && !e.dead ? e : { x: p.tx, y: p.ty, dead: true, r: 0 });
      FX.hit(p.tx, p.ty, p.color); FX.hitVfx(p);
    } else { p.x += dx / dd * step; p.y += dy / dd * step; }
    if (p.life <= 0) p.done = true;
  }
  G.projs = G.projs.filter(p => !p.done);
}
function updateGrounds(dt) {
  for (const g of G.grounds) {
    g.t -= dt; g.tick -= dt;
    if (g.tick <= 0) { g.tick = 0.5; for (const e of enemiesNear(g.x, g.y, g.r)) dmg(e, g.dps * 0.5, 'magic', g.src, { dot: true }); }
  }
  G.grounds = G.grounds.filter(g => g.t > 0);
  for (const t of G.timers) t.t -= dt;
  const due = G.timers.filter(t => t.t <= 0); G.timers = G.timers.filter(t => t.t > 0);
  for (const t of due) t.fn();
}

// ---------- ヒット処理 ----------
function meteorHit(u, st, x, y) {
  const S = G.L.S; FX.ring(x, y, S * 1.9, '#ff8a4a'); FX.burst(x, y, '#ffb36b', 30, 180); FX.shake(4); SFX.play('boom');
  for (const e of enemiesNear(x, y, S * 1.9)) { e.reveal = Math.max(e.reveal, 1.5); dmg(e, st.atk * 3, 'magic', u); }
}
function globalBreath(u, st) {
  FX.flash(0.3); FX.shake(8); SFX.play('boom');
  FX.beam(u.x, u.y, u.x, u.y, '#ff7a3a', 0, true);
  for (const e of G.enemies.slice()) { if (e.dead) continue; e.reveal = Math.max(e.reveal, 1.5); dmg(e, st.atk * 1.6, 'magic', u); FX.burst(e.x, e.y, '#ff9a5a', 5, 80); }
}
function breathLine(u, st, t, ph) {
  const S = G.L.S, dx = t.x - u.x, dy = t.y - u.y, L = Math.hypot(dx, dy) || 1, nx = dx / L, ny = dy / L;
  const len = st.range + S; FX.beam(u.x, u.y - S * 0.3, u.x + nx * len, u.y + ny * len, '#ff8a3a', S * 0.9);
  for (const e of G.enemies.slice()) {
    if (e.dead || e.fly && false) continue;
    const px = e.x - u.x, py = e.y - u.y, along = px * nx + py * ny, side = Math.abs(px * ny - py * nx);
    if (along > 0 && along <= len && side <= S * 0.7 + e.r * 0.5) { e.reveal = Math.max(e.reveal, 1.5); dmg(e, st.atk, 'magic', u); }
  }
}
function dragonBall(u, st, e, x, y) {
  const S = G.L.S, ph = eggPhase(u), R = (DRAGON[ph] ? DRAGON[ph].splash : 1) * S;
  FX.ring(x, y, R, '#ff8a4a'); FX.burst(x, y, '#ffb36b', 14, 110); SFX.play('boom');
  for (const o of enemiesNear(x, y, R)) { o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk, 'magic', u); }
}
function fxTier(u) { return u.star >= 7 ? 3 : u.star >= 5 ? 2 : u.star >= 3 ? 1 : 0; }
function fxv(u, k) { const f = UNITS[u.key].fx; if (!f || f[k] == null) return 0; const a = f[k]; return Array.isArray(a) ? a[fxTier(u)] : a; }
const hitFns = {
  __tpl(u, st, e) {   // 新キャラ共通：data2.js の fx を読んで効果を出す
    const d = UNITS[u.key], S = G.L.S, F = k => fxv(u, k), kind = d.dmg, ab = st.ab;
    if (e.dead && !(e.x !== undefined && e.r === 0)) return;
    const pen = F('pen'), stopped = o => o.stun > 0 || o.freeze > 0;
    const status = o => {
      if (o.dead) return;
      if (F('slow')) applySlow(o, Math.min(0.6, F('slow') * ab), 2);
      if (F('stun') && rng() < F('stun') * st.chance) applyStun(o, 0.8 * ab);
      if (F('burn')) addBurn(o, u, st.atk * F('burn') * ab, 0);
      if (F('poison')) addPoison(o, u, 1, st.atk * F('poison') * ab);
      if (F('mark')) { o.markT = 3; o.markV = F('mark') * ab; }
      if (F('shred')) o.shred = Math.min(60, o.shred + F('shred'));
      if (F('knock') && o.def.key !== 'boss') o.d = Math.max(0, o.d - F('knock') * S * ab);
    };
    const hit = (o, m, isMain) => {
      o.reveal = Math.max(o.reveal, 1.2);
      const slowed = o.slowT > 0 && o.slowAmt > 0;
      let cc = F('crit'); if (stopped(o)) cc += F('critVsStun'); if (o.burn) cc += F('critVsBurn'); if (slowed) cc += F('critVsSlow'); if (o.pois) cc += F('critVsPoison');
      const crit = rng() < cc * st.chance;
      let vm = 1;   // 「〜の敵に強い」系の上乗せ
      if (o.burn) vm += F('vsBurn'); if (o.pois) vm += F('vsPoison'); if (slowed) vm += F('vsSlow'); if (stopped(o)) vm += F('vsStun'); if (o.markT > 0) vm += F('vsMark');
      if (o.shield > 0) vm += F('vsShield'); if (o.fly) vm += F('vsFly'); if (o.def.key === 'boss') vm += F('vsBoss'); if (o.hp >= o.maxhp * 0.9) vm += F('vsFull'); if (o.hp <= o.maxhp * 0.3) vm += F('vsLow');
      if (F('detBurn') && o.burn) { const bd = o.burn.dps * 3 * F('detBurn'); o.burn = null; FX.burst(o.x, o.y, '#ff9a3a', 10, 100); FX.ring(o.x, o.y, S * 0.9, '#ff8a2a'); dmg(o, bd, 'magic', u); }
      if (F('detPoison') && o.pois && o.pois.n >= 3 && !o.dead) { const bd = o.pois.n * o.pois.dps * 3 * F('detPoison'); o.pois = null; FX.burst(o.x, o.y, '#9ae86a', 12, 100); FX.text(o.x, o.y - o.r - 8, '毒爆発', '#c8ff9a', 14); dmg(o, bd, 'magic', u); }
      if (F('breakShield') && o.shield > 0) { o.shield = 0; FX.text(o.x, o.y - o.r - 8, 'バリア破壊', '#bfe8ff', 13); }
      if (o.dead) return;
      dmg(o, st.atk * (crit ? 2 : 1) * vm * m, kind, u, { pen, crit: crit && isMain });
      status(o);
      const sb = F('spreadBurn'); if (sb && o.burn && !o.dead) for (const q of enemiesNear(o.x, o.y, sb * S, q => q !== o && !q.burn)) addBurn(q, u, o.burn.dps * 0.7, 0);
    };
    const thr = F('exec');
    if (thr && !e.dead && e.def && e.def.key !== 'boss' && e.hp / e.maxhp <= thr * ab) { FX.burst(e.x, e.y, '#c9a0ff', 12, 90); FX.text(e.x, e.y - 24, '処刑', '#e0c8ff', 15); e.hp = 0; killEnemy(e, u); return; }
    const R = F('splash') * S;
    if (R > 0) { FX.ring(e.x, e.y, R, ELEM[d.elem].c); FX.burst(e.x, e.y, ELEM[d.elem].c, 8, 90); for (const o of enemiesNear(e.x, e.y, R)) hit(o, o === e ? 1 : 0.8, o === e); }
    else if (!e.dead) hit(e, 1, true);
    const pn = F('pierce'); if (pn > 0) { let n = 0; for (const o of enemiesNear(e.x, e.y, 1.7 * S, o => o !== e)) { if (n++ >= pn) break; FX.beam(e.x, e.y, o.x, o.y, ELEM[d.elem].c, 2); hit(o, 0.6, false); } }
    const cn = F('chain'); if (cn > 0) {
      const seen = [e]; let last = e;
      for (let i = 0; i < cn; i++) { let best = null, bd = 1e9; for (const o of G.enemies) { if (o.dead || seen.includes(o)) continue; const dd = Math.hypot(o.x - last.x, o.y - last.y); if (dd <= 2.5 * S && dd < bd) { bd = dd; best = o; } } if (!best) break; FX.bolt([{ x: last.x, y: last.y - 4 }, { x: best.x, y: best.y - 4 }], '#fff7a0'); hit(best, Math.max(0.35, Math.pow(0.75, i + 1)), false); seen.push(best); last = best; }
    }
    if (rng() < F('echo') * st.chance && !e.dead) { FX.slash(e.x + 4, e.y - 4, '#ffffff', u); hit(e, 1, false); }
  },
  sword(u, st, e) {
    const S = G.L.S; dmg(e, st.atk, 'phys', u);
    const p = (u.star >= 5 ? 0.25 : u.star >= 3 ? 0.1 : 0) * st.chance;
    if (p && rng() < p) { dmg(e, st.atk, 'phys', u); FX.slash(e.x + 4, e.y - 4, '#ffffff', u); }
    if (u.star >= 7) for (const o of enemiesNear(e.x, e.y, 1.3 * S, o => o !== e)) { o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk * 0.5, 'phys', u); }
  },
  archer(u, st, e) {
    const S = G.L.S, c = (u.star >= 3 ? 0.2 : 0.1) * st.chance, crit = rng() < c, a = st.atk * (crit ? 2 : 1);
    dmg(e, a, 'phys', u, { crit });
    if (crit && u.star >= 5) { let n = 0; for (const o of enemiesNear(e.x, e.y, 1.5 * S, o => o !== e && !o.invis)) { if (n++ >= 2) break; dmg(o, a * 0.6, 'phys', u); FX.beam(e.x, e.y, o.x, o.y, '#d8ffc0', 3); } }
  },
  mage(u, st, e) {
    const S = G.L.S, R = (u.star >= 5 ? 1.5 : 1) * S;
    FX.ring(e.x, e.y, R, '#ff8a4a'); FX.burst(e.x, e.y, '#ffb36b', 12, 100); SFX.play('boom');
    for (const o of enemiesNear(e.x, e.y, R)) { o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk, 'magic', u); }
    if (u.star >= 3) G.grounds.push({ x: e.x, y: e.y, r: R * 0.9, t: 3, tick: 0.2, dps: st.atk * 0.3, src: u });
  },
  ice(u, st, e) {
    if (e.dead) return; dmg(e, st.atk, 'magic', u); if (e.dead) return;
    applySlow(e, Math.min(0.6, (u.star >= 3 ? 0.35 : 0.25) * st.ab), 2);
    if (u.star >= 5 && rng() < 0.1 * st.chance) { e.freeze = e.def.key === 'boss' ? 0.4 : 1; FX.burst(e.x, e.y, '#bff2ff', 10, 70); }
    FX.burst(e.x, e.y, '#bff2ff', 4, 50);
  },
  thunder(u, st, e) {
    const S = G.L.S, n = u.star >= 7 ? 12 : u.star >= 3 ? 4 : 3, chain = [e];
    while (chain.length < n) {
      const last = chain[chain.length - 1]; let best = null, bd = 1e9;
      const reach = u.star >= 7 ? st.range : 2.6 * S;
      for (const o of G.enemies) {
        if (o.dead || chain.includes(o) || o.fly && false) continue;
        const dd = u.star >= 7 ? Math.hypot(o.x - u.x, o.y - u.y) : Math.hypot(o.x - last.x, o.y - last.y);
        if (dd <= reach && dd < bd) { bd = dd; best = o; }
      }
      if (!best) break; chain.push(best);
    }
    let m = 1, px = u.x, py = u.y - S * 0.5; const pts = [{ x: px, y: py }];
    for (const o of chain) {
      pts.push({ x: o.x, y: o.y - 4 }); o.reveal = Math.max(o.reveal, 1.5);
      dmg(o, st.atk * m, 'magic', u); if (u.star >= 5) applyStun(o, 0.3);
      m = Math.max(0.35, m * 0.8);
    }
    FX.bolt(pts, '#fff7a0'); SFX.play('zap');
  },
  poison(u, st, e) {
    if (e.dead) return; dmg(e, st.atk, 'magic', u); if (e.dead) return;
    addPoison(e, u, 1, st.atk * 1.5 * st.ab); FX.burst(e.x, e.y, '#9ae86a', 3, 40);
  },
  golem(u, st, e) {
    const S = G.L.S, cap = u.star >= 7 ? 999 : 50;
    const hit = o => { dmg(o, st.atk, 'phys', u); if (o.dead) return; o.shred = Math.min(cap, o.shred + 10); if (u.star >= 5) o.mrShred = Math.min(cap, o.mrShred + 10); if (u.star >= 7) o.shred = 999; };
    hit(e);
    if (u.star >= 3) { FX.ring(e.x, e.y, S, '#d6a85c'); for (const o of enemiesNear(e.x, e.y, S, o => o !== e)) { o.reveal = Math.max(o.reveal, 1.5); hit(o); } }
    FX.shake(1.5);
  },
  sniper(u, st, e) {
    if (e.dead) return;
    const pct = u.star >= 5 ? 0.04 : u.star >= 3 ? 0.02 : 0;
    dmg(e, st.atk, 'phys', u); if (e.dead) return;
    if (pct) dmg(e, Math.min(e.maxhp * pct, st.atk * 20), 'true', u);
    FX.ring(e.x, e.y, G.L.S * 0.8, '#fff2a0');
  },
  wind(u, st, e) {
    const S = G.L.S, R = 0.9 * S, push = (u.star >= 7 ? 2.5 : u.star >= 3 ? 1 : 0.5) * S * st.ab;
    FX.ring(e.x, e.y, R, '#aef5d0'); FX.burst(e.x, e.y, '#d9ffe9', 8, 70);
    for (const o of enemiesNear(e.x, e.y, R)) {
      o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk, 'magic', u); if (o.dead) continue;
      const isBoss = o.def.key === 'boss', f = isBoss ? (u.star >= 7 ? 0.4 : u.star >= 5 ? 0.3 : 0) : 1;
      o.d = Math.max(0, o.d - push * f);
    }
  },
  mouse(u, st, e) { if (!e.dead) dmg(e, st.atk, 'magic', u); },
  reaper(u, st, e) {
    if (e.dead) return;
    const isBoss = e.def.key === 'boss', thr = (isBoss ? (u.star >= 7 ? 0.05 : 0) : (u.star >= 3 ? 0.15 : 0.1)) * st.ab;
    if (e.hp / e.maxhp <= thr && thr > 0) {
      FX.burst(e.x, e.y, '#c9a0ff', 14, 90); FX.text(e.x, e.y - 24, '処刑', '#e0c8ff', 15);
      e.invuln = 0; e.shield = 0; e.hp = 0; killEnemy(e, u);
      if (u.star >= 5) { u.reapStack = Math.min(10, u.reapStack + 1); u.reapT = 5; }
      return;
    }
    dmg(e, st.atk, 'magic', u);
  },
  mimic(u, st, e) { dmg(e, st.atk, 'phys', u); },
  ninja(u, st, e) {
    if (e.dead) return; const S = G.L.S, pen = u.star >= 3 ? 0.3 : 0.15;
    dmg(e, st.atk, 'phys', u, { pen });
    if (u.star >= 5 && rng() < 0.15 * st.chance) { for (let i = 0; i < 2; i++) dmg(e, st.atk, 'phys', u, { pen }); FX.slash(e.x, e.y, '#ffffff', u); }
    if (u.star >= 7) { let n = 0; for (const o of enemiesNear(e.x, e.y, 1.7 * S, o => o !== e)) { if (n++ >= 2) break; o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk * 0.6, 'phys', u, { pen }); FX.beam(e.x, e.y, o.x, o.y, '#b588ff', 2); } }
  },
  cat(u, st, e) {
    if (e.dead) return; dmg(e, st.atk, 'magic', u); if (e.dead) return;
    const S = G.L.S, p = (u.star >= 3 ? 0.3 : 0.2) * st.chance;
    if (rng() < p) {
      const t = (u.star >= 3 ? 1.2 : 1) * st.ab;
      const sleep = o => { applyStun(o, t); if (u.star >= 5) o.sleepMark = Math.max(o.sleepMark || 0, t + 0.3); FX.text(o.x, o.y - o.r - 8, 'Zzz', '#d8c8ff', 13); };
      sleep(e);
      if (u.star >= 7) { let n = 0; for (const o of enemiesNear(e.x, e.y, 2 * S, o => o !== e)) { if (n++ >= 2) break; sleep(o); } }
    }
  },
  miko(u, st, e) {
    if (e.dead) return; dmg(e, st.atk, 'magic', u); if (e.dead) return;
    addBurn(e, u, st.atk * (u.star >= 5 ? 1.6 : 0.8) * st.ab, u.star >= 3 ? 0.15 : 0); FX.burst(e.x, e.y, '#ff9a5a', 5, 60);
  },
  cannon(u, st, e) {
    const S = G.L.S; u.shotN = (u.shotN || 0) + 1; const big = u.star >= 7 && u.shotN % 3 === 0;
    const R = (big ? 2 : u.star >= 3 ? 1.5 : 1.2) * S;
    FX.ring(e.x, e.y, R, big ? '#ffd24a' : '#ffb36b'); FX.burst(e.x, e.y, '#ffb36b', big ? 26 : 12, big ? 160 : 100); SFX.play('boom'); if (big) FX.shake(4);
    for (const o of enemiesNear(e.x, e.y, R)) { o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk * (big ? 3 : 1), 'phys', u); if (u.star >= 5 && !o.dead) applyStun(o, 0.5); }
  },
  ghost(u, st, e) {
    if (e.dead) return; const S = G.L.S; u.hitN = (u.hitN || 0) + 1;
    dmg(e, st.atk, 'true', u); if (e.dead) return;
    if (u.star >= 3) { const o = enemiesNear(e.x, e.y, 2.2 * S, o => o !== e && !o.dead)[0]; if (o) { dmg(o, st.atk, 'true', u); FX.beam(e.x, e.y, o.x, o.y, '#9ad8ff', 3); } }
    if (u.star >= 7 && u.hitN % 5 === 0) { dmg(e, Math.min(e.hp * 0.2, st.atk * 30), 'true', u); FX.burst(e.x, e.y, '#bfe8ff', 10, 80); FX.text(e.x, e.y - e.r - 6, '魂吸収', '#bfe8ff', 13); }
  },
  alchemist(u, st, e) {
    const S = G.L.S, R = (u.star >= 5 ? 1.26 : 0.9) * S;
    FX.ring(e.x, e.y, R, '#9ae86a'); FX.burst(e.x, e.y, '#b8f07a', 8, 80); SFX.play('boom');
    for (const o of enemiesNear(e.x, e.y, R)) { o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk, 'phys', u); }
  },
  paladin(u, st, e) {
    const S = G.L.S; if (e.dead) return; dmg(e, st.atk, 'phys', u); if (e.dead) return;
    if (e.def.key !== 'boss') e.d = Math.max(0, e.d - 0.3 * S);
    if (u.star >= 7) for (const o of enemiesNear(e.x, e.y, S, o => o !== e)) { o.reveal = Math.max(o.reveal, 1.5); dmg(o, st.atk * 0.6, 'phys', u); }
  },
  dryad(u, st, e) { if (!e.dead) dmg(e, st.atk, 'magic', u); },
};

// ---------- ウェーブ ----------
function startWave() {
  G.wave++; G.phase = 'run'; G.waveT = 0; G.spawnI = 0;
  G.spawnQ = makeWave(G.wave, G.stage, G.diff);
  G.hpMul = hpMulOf(G.wave, G.stage, G.diff);
  const boss = G.wave % 10 === 0;
  FX.banner(boss ? 'WAVE ' + G.wave + '  ボス出現！' : 'WAVE ' + G.wave); SFX.play(boss ? 'boss' : 'wave');
}
function waveBonus() {
  let b = Math.round((30 + 3 * G.wave) * stageGold(G.stage)), ec = 0;
  for (const u of G.units) if (u.key === 'mouse') ec += u.star >= 7 ? 150 : u.star >= 5 ? 60 : u.star >= 3 ? 20 : 0;
  G.interestCap = G.units.some(u => u.key === 'mouse' && u.star >= 7) ? 80 : 40;
  const interest = Math.min(G.interestCap, Math.floor(G.gold / 50) * 6);
  return { base: b, eco: ec, interest, total: b + ec + interest };
}
function endWave() {
  const b = waveBonus(); G.gold += b.total; G.goldEarned += b.total; G.lastBonus = b;
  for (const u of G.units) if (u.key === 'egg') u.hatch++;
  let heal = 0; for (const u of G.units) if (UNITS[u.key].fx) heal += fxv(u, 'heal');
  for (const u of G.units) if (u.key === 'paladin') heal += u.star >= 7 ? 3 : u.star >= 5 ? 2 : u.star >= 3 ? 1 : 0;
  if (heal && G.life < START_LIFE) {
    const before = G.life; G.life = Math.min(START_LIFE, Math.ceil(G.life) + heal);
    if (G.life > before) { FX.text(60, G.L.fy + 30, 'ライフ回復 +' + Math.round(G.life - before), '#ff9ac8', 18); SFX.play('upgrade'); }
  }
  FX.confetti(G.L.W / 2, G.L.fy + G.L.fh * 0.3, 40);
  if (G.wave >= MAX_WAVE && !G.endless) { G.over = 'win'; SFX.play('win'); FX.confetti(G.L.W * 0.25, G.L.fy + G.L.fh * 0.5, 50); FX.confetti(G.L.W * 0.75, G.L.fy + G.L.fh * 0.5, 50); FX.rays(G.L.W / 2, G.L.fy + G.L.fh * 0.4, '#ffe27a', 7); FX.flash(0.6); return; }
  G.phase = 'prep'; G.prepT = PREP_TIME; FX.banner('WAVE ' + G.wave + ' クリア！  +' + b.total + 'G' + (b.interest ? '（利子+' + b.interest + '）' : '')); SFX.play('clear');
}
function runWave(dt) {
  G.waveT += dt;
  while (G.spawnI < G.spawnQ.length && G.spawnQ[G.spawnI].t <= G.waveT) {
    const q = G.spawnQ[G.spawnI++];
    if (q.type === 'boss') {
      const tier = Math.max(1, Math.round(G.wave / 10));
      const e = spawnEnemy('boss', 1, { hp: bossHp(G.wave, G.stage, G.diff) * DMG_SCALE, boss: G.st.boss });
      e.defv = 30 + tier * 10; e.mr = 30 + tier * 10; e.skillT = 5; e.r = G.L.S * 1.0; e.speed = G.L.S * 0.8 * DIFFS[G.diff].spd;
      e.leak = 10; FX.shake(6);
    } else spawnEnemy(q.type, G.hpMul);
  }
  if (G.spawnI >= G.spawnQ.length && G.enemies.length === 0) endWave();
}
function step(dt) {
  if (!G || G.over) return;
  G.t += dt;
  if (G.phase === 'prep') { if (!G.holdPrep) G.prepT -= dt; if (G.prepT <= 0) startWave(); }   // 置いている最中（ドラッグ中）は時間が減らない
  else runWave(dt);
  updateEnemies(dt); updateUnits(dt); updateProjs(dt); updateGrounds(dt);
}
function previewWave(n) {
  const q = makeWave(n, G.stage, G.diff), c = {};
  for (const s of q) c[s.type] = (c[s.type] || 0) + 1;
  return c;
}
