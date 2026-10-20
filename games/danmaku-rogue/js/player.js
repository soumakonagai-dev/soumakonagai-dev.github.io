'use strict';
// ===== プレイヤー / 武器 / パッシブ / 経験値 / カード（設計書 §2 §3） =====
let P = null, run = null;
const st = {};
const PB = Array.from({ length: 600 }, () => ({ alive: false }));   // 自弾プール
const GEMS = Array.from({ length: 300 }, () => ({ alive: false })); // 経験値ジェム
const LASERS = [];                                                  // 自機レーザー
const STRIKES = [];                                                 // 落雷演出
const PT = [];                                                      // パーティクル
let shake = 0;
const dbg = { inv: false };

const needExp = L => 5 + 6 * (L - 1) + Math.floor(0.6 * (L - 1) * (L - 1));

const pl = id => ((run && run.passives && run.passives[id]) || 0) + ((run && run.pevo && run.pevo[id]) ? 3 : 0);   // 能力のLv（進化済みなら+3）
const ab = id => (save.abilities && save.abilities[id]) || 0;   // ガチャで得た能力のLv
function recalc() {
  const ps = run.passives, m = save.meta, old = run.maxhp || 0;
  const S = run.ship || SHIPS[0];
  st.atk = (1 + 0.12 * pl('atk')) * (1 + 0.05 * m.atk) * run.atkBonus * S.atk * (1 + 0.03 * ab('atk'));
  st.rate = (1 + 0.10 * pl('rate')) * (1 + 0.04 * ab('rate')) * (S.rate || 1);
  st.cnt = Math.floor(pl('count') / 2);
  st.rng = (1 + 0.12 * pl('range')) * (1 + 0.03 * ab('rng'));
  st.spd = (1 + 0.06 * pl('move')) * S.spd * (1 + 0.03 * ab('move'));
  st.pick = (1 + 0.25 * pl('pickup')) * (1 + 0.10 * m.pickup) * S.pick * (1 + 0.08 * ab('pick'));
  st.hit = Math.max(1.5, 3 * (1 - 0.08 * pl('hitbox')) * S.hit);
  st.graze = 18 * (1 + 0.15 * pl('graze')) * (1 + 0.06 * ab('graze'));
  st.luck = pl('luck') + S.luck + Math.floor(ab('luck') / 2);
  st.crit = 0.04 * ab('crit') + (S.crit || 0) + 0.05 * pl('crit');
  st.bossDmg = 1 + 0.1 * pl('bossdmg'); st.bslow = Math.max(0.5, 1 - 0.03 * pl('slow')); st.goldp = 1 + 0.1 * pl('goldp'); st.invp = 1 + 0.1 * pl('invp'); st.pierceB = Math.floor(pl('pierce') / 2); st.expg = 1 + 0.08 * pl('expg');
  st.grazeExp = 1 + 0.15 * ab('grazex'); st.bombDmg = 1 + 0.2 * ab('bombx');
  st.atk0 = st.atk; st.rate0 = st.rate;   // 背水の陣（HP1で強化）はこの基準値に毎フレームかける
  const mh = Math.max(1, D.hp + Math.ceil(pl('maxhp') / 2) + run.hpMod + Math.floor(ab('hp') / 2));
  if (old > 0 && mh > old) run.hp += mh - old;
  run.maxhp = mh; run.hp = Math.min(run.hp, mh);
  if (typeof refreshMul === 'function') refreshMul();
}

function newRun(diffIdx, seed) {
  D = DIFFICULTY[diffIdx];
  rng = mulberry32(seed);
  run = { seed, stage: 1, node: 'normal', nodeMul: 1, expNode: 1, t: 0, f: 0, state: 'road',
    hp: D.hp, maxhp: 0, bombs: 2 + save.meta.bomb, gold: 0, core: 0, level: 1, exp: 0, pending: 0,
    weapons: [{ id: 'shot', lv: 1, evo: false, t: 0, ang: 0 }], passives: {}, curse: 0, hpMod: 0, atkBonus: 1,
    rerolls: 1 + save.meta.reroll, skips: 2, kills: 0, graze: 0, hits: 0, banner: null, spawnQ: [], waveT: 60,
    midDone: false, guaranteeRare: false, expMul: 1, coreMul: 1, grazeB: 12, bombFx: 0, restricted: false };
  const ship = SHIPS.find(s => s.id === save.ship) || SHIPS[0];
  run.ship = ship; run.stage = 1; run.wave = 1; run.wavesDone = 0; run.bossKilled = false; run.goldEarned = 0; run.revived = false;
  run.weapons = [{ id: ship.weapon, lv: Math.min(5, 1 + Math.ceil(ab('start') / 2)), evo: false, t: 0, ang: 0 }];
  run.hpMod = ship.hp; run.bombs += ship.bombs + Math.ceil(ab('bomb') / 2);
  run.rerolls += Math.floor(ab('rer') / 2); run.shield = (ab('shield') >= 1 ? 1 : 0) + (ab('shield') >= 4 ? 1 : 0);
  run.passives = Object.assign({}, ship.startP || {}); run.pevo = {};
  P = { x: W / 2, y: H - 90, inv: 0, slow: false };
  recalc(); run.hp = run.maxhp;
}

function gainExp(v) {
  run.exp += v;
  let need = needExp(run.level);
  while (run.exp >= need) { run.exp -= need; run.level++; run.pending++; need = needExp(run.level); }
}

// ===== ジェム =====
function addGem(x, y, tier, v) {
  if (Math.random() < 0.05 * ab('fortune')) v *= 3;   // 黄金の流星
  for (const g of GEMS) if (!g.alive) { Object.assign(g, { alive: true, x, y, vy: -1.5, v, tier, mag: false }); return; }
  GEMS[rint(0, GEMS.length - 1)].v += v;   // 上限: 既存ジェムに合算（処理負荷対策）
}
function updateGems() {
  const autoAll = P.y < H / 4;
  const pr = 48 * st.pick;
  for (const g of GEMS) {
    if (!g.alive) continue;
    const dx = P.x - g.x, dy = P.y - g.y, d2 = dx * dx + dy * dy;
    if (autoAll || g.mag || d2 < pr * pr) {
      g.mag = true; const d = Math.sqrt(d2) || 1, s = 9;
      g.x += dx / d * s; g.y += dy / d * s;
      if (d < 12) { g.alive = false; gainExp(g.v); }
    } else {
      g.vy = Math.min(1.6, g.vy + 0.06); g.y += g.vy;
      if (g.y > H + 10) g.alive = false;
    }
  }
}

// ===== パーティクル =====
function spark(x, y, n, col, spd, life) {
  for (let i = 0; i < n && PT.length < 400; i++) {
    const a = vrnd(0, 6.283), s = vrnd(0.3, 1) * spd;
    PT.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: life, ml: life, c: col, s: vrnd(1.5, 3) });
  }
}
function updateParticles() {
  for (let i = PT.length - 1; i >= 0; i--) { const p = PT[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; if (--p.l <= 0) PT.splice(i, 1); }
  if (shake > 0) shake -= 0.8;
  updateFX();
}

// ===== 自機 =====
function updatePlayer() {
  const od = run.hp <= 1 ? ab('od') : 0; st.atk = st.atk0 * (1 + 0.12 * od); st.rate = st.rate0 * (1 + 0.06 * od);
  const k = keys;
  let dx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
  let dy = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
  P.slow = !!(k.ShiftLeft || k.ShiftRight);
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  const sp = (P.slow ? 1.8 : 4.5) * st.spd;
  if (dx || dy) { mouse.follow = false; P.x += dx * sp; P.y += dy * sp; }   // キー操作が優先、マウスを動かすと追従に戻る
  else if (mouse.follow) {
    const mx = mouse.x - P.x, my = mouse.y - P.y, d = Math.hypot(mx, my), ms = (P.slow ? 2.2 : 9) * st.spd;
    if (d > ms) { P.x += mx / d * ms; P.y += my / d * ms; } else { P.x = mouse.x; P.y = mouse.y; }
  }
  if (mouse.down && mouse.touch) { P.x += mouse.dx; P.y += mouse.dy; }
  mouse.dx = mouse.dy = 0;
  P.x = clamp(P.x, 10, W - 10); P.y = clamp(P.y, 20, H - 20);
  if (P.inv > 0) P.inv--;
  if (run.bombFx > 0) run.bombFx--;
  if (pressed.KeyX || pressed.KeyB) useBomb();
}
function useBomb() {
  if (run.bombs <= 0 || run.bombFx > 20) return;
  const BR = 260 * (1 + 0.1 * ab('bombx'));
  run.bombs--; P.inv = Math.max(P.inv, 90); run.bombFx = 40; shake = 10;
  clearEnemyBullets(false); EL.length = 0;
  for (const e of EN.slice()) {
    const dx = e.x - P.x, dy = e.y - P.y;
    if (dx * dx + dy * dy < BR * BR) hurtEnemy(e, (e.boss ? 30 : 60) * st.bombDmg);
  }
}
function hurtPlayer() {
  if (P.inv > 0 || dbg.inv) return;
  if (run.shield > 0) { run.shield--; P.inv = 70; boom(P.x, P.y, 100, '#8cf'); clearEnemyBullets(false, P.x, P.y, 140); banner('バリアで防いだ！', '#8cf', 70); return; }   // 守護の盾
  run.hp--; run.hits++; P.inv = Math.round(D.iframes * (1 + 0.08 * ab('inv')) * (run.ship.inv || 1) * (st.invp || 1)); shake = 14;
  spark(P.x, P.y, 24, '#f66', 4, 30); boom(P.x, P.y, 70, '#f66');
  clearEnemyBullets(false, P.x, P.y, 170);   // 被弾後は周囲の弾を自動で消す（ボム半分）
  if (run.hp <= 0) {
    if (ab('revive') > 0 && !run.revived) {   // 不死鳥の羽: 1ランに1度だけ復活
      run.revived = true; run.hp = Math.min(run.maxhp, 1 + Math.floor(ab('revive') / 2)); P.inv = 180;
      clearEnemyBullets(false); EL.length = 0; boom(P.x, P.y, 160, '#fc4'); banner('不死鳥の羽で復活！', '#fc4', 120);
    } else endRun(false);
  }
}

// ===== 自弾 =====
function fireP(x, y, vx, vy, dmg, o) {
  for (const b of PB) if (!b.alive) {
    Object.assign(b, { alive: true, x, y, vx, vy, dmg, r: o.r || 4, life: o.life || 90, pierce: (o.pierce || 0) + (st.pierceB || 0), home: o.home || 0, col: o.col || '#8ff', last: [], len: o.len || 10 });
    return;
  }
}
function nearestEnemy(x, y) {
  let best = null, bd = 1e9;
  for (const e of EN) { if (e.dead || e.y < 0 || e.enter > 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function updatePlayerBullets() {
  for (const b of PB) {
    if (!b.alive) continue;
    if (b.home) {
      const t = nearestEnemy(b.x, b.y);
      if (t) {
        const sp = Math.hypot(b.vx, b.vy); let a = Math.atan2(b.vy, b.vx), d = Math.atan2(t.y - b.y, t.x - b.x) - a;
        while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        a += clamp(d, -0.14, 0.14); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      }
    }
    b.x += b.vx; b.y += b.vy;
    if (--b.life <= 0 || b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20) { b.alive = false; continue; }
    for (const e of EN) {
      if (e.dead || (e.enter > 0 && e.boss)) continue;
      const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
      if (dx * dx + dy * dy > rr * rr || b.last.includes(e)) continue;
      hurtEnemy(e, b.dmg);
      if (b.pierce > 0) { b.pierce--; b.last.push(e); } else { b.alive = false; break; }
    }
  }
}

// ===== 武器 =====
function updateWeapons() {
  for (const w of run.weapons) {
    w.t++;
    const lv = w.lv, evo = w.evo, atk = st.atk;
    switch (w.id) {
      case 'shot': {
        if (w.t < Math.max(3, Math.round(9 / st.rate))) break; w.t = 0;
        const n = (evo ? 3 : 1) + lv + st.cnt;
        for (let i = 0; i < n; i++) fireP(P.x + (i - (n - 1) / 2) * 8, P.y - 14, 0, -12, (evo ? 7 : 3) * atk, evo ? { r: 5, pierce: 3, col: '#8ff' } : { r: 3.5, col: '#cff' });
        break;
      }
      case 'homing': {
        if (w.t < Math.round(42 / st.rate)) break; w.t = 0;
        const n = (evo ? lv * 2 : lv) + st.cnt;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (n === 1 ? 0 : (-0.7 + 1.4 * i / (n - 1)));
          fireP(P.x, P.y - 10, Math.cos(a) * 6, Math.sin(a) * 6, (evo ? 6 : 4) * atk, { r: 4, life: 150, home: 1, col: '#9f8' });
        }
        break;
      }
      case 'laser': {
        if (w.t < Math.round(110 / st.rate)) break; w.t = 0;
        const offs = evo ? [-42, 0, 42] : [0];
        for (const o of offs) LASERS.push({ off: o, t: 0, dur: evo ? 45 : 28, w: (8 + 2 * lv) * st.rng, dmg: (2 + lv * 0.6) * atk * (evo ? 1.8 : 1) });
        break;
      }
      case 'orbit': {
        w.ang += 0.055;
        const n = Math.min(8, lv + 1 + st.cnt), rad = (52 + lv * 3) * st.rng * (evo ? 1.3 : 1), or = evo ? 16 : 11;
        w.orbs = [];
        for (let i = 0; i < n; i++) w.orbs.push({ x: P.x + Math.cos(w.ang + 6.283 * i / n) * rad, y: P.y + Math.sin(w.ang + 6.283 * i / n) * rad, r: or });
        for (const b of EB) {
          if (!b.alive) continue;
          for (const o of w.orbs) { const dx = b.x - o.x, dy = b.y - o.y, rr = o.r + b.r; if (dx * dx + dy * dy < rr * rr) { b.alive = false; break; } }
        }
        if (w.t >= 8) {
          w.t = 0;
          for (const e of EN) {
            if (e.enter > 0 && e.boss) continue;
            for (const o of w.orbs) { const dx = e.x - o.x, dy = e.y - o.y, rr = e.r + o.r; if (dx * dx + dy * dy < rr * rr) { hurtEnemy(e, (2.2 + 0.2 * lv) * atk * (evo ? 2 : 1)); break; } }
          }
        }
        break;
      }
      case 'spread': {
        if (w.t < Math.round(30 / st.rate)) break; w.t = 0;
        const n = (evo ? 2 : 1) * (3 + lv) + st.cnt, half = (evo ? 55 : 38) * RAD;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 - half + 2 * half * i / (n - 1);
          fireP(P.x, P.y - 10, Math.cos(a) * 9, Math.sin(a) * 9, (evo ? 5 : 3) * atk, { r: 4.5, life: Math.round(22 * st.rng), pierce: evo ? 2 : 0, col: '#fc8' });
        }
        break;
      }
      case 'thunder': {
        if (w.t < Math.round(75 / st.rate)) break; w.t = 0;
        const n = lv + (evo ? 2 : 0) + Math.floor(st.cnt / 2), targets = EN.filter(e => !e.dead && e.y > 0 && !(e.boss && e.enter > 0));
        for (let i = 0; i < n && targets.length; i++) {
          const e = targets.splice(rint(0, targets.length - 1), 1)[0], rad = (36 + 4 * lv) * st.rng * (evo ? 1.7 : 1);
          STRIKES.push({ x: e.x, y: e.y, r: rad, t: 14 });
          for (const o of EN.slice()) { const dx = o.x - e.x, dy = o.y - e.y; if (dx * dx + dy * dy < (rad + o.r) ** 2) hurtEnemy(o, (evo ? 26 : 12) * atk); }
        }
        break;
      }
    }
  }
  // レーザー本体
  for (let i = LASERS.length - 1; i >= 0; i--) {
    const l = LASERS[i]; l.t++;
    if (l.t % 5 === 0) {
      const lx = P.x + l.off;
      for (const e of EN.slice()) { if (e.y > P.y || (e.boss && e.enter > 0)) continue; if (Math.abs(e.x - lx) < l.w / 2 + e.r) hurtEnemy(e, l.dmg); }
    }
    if (l.t >= l.dur) LASERS.splice(i, 1);
  }
  for (let i = STRIKES.length - 1; i >= 0; i--) if (--STRIKES[i].t <= 0) STRIKES.splice(i, 1);
}

// ===== 強化カード（レベルアップ / 宝箱 / ショップ共通） =====
function randomPassive() {
  const pl = Object.keys(run.passives), c = [];
  for (const id in PASSIVES) if (run.passives[id] ? run.passives[id] < 5 : pl.length < 4) c.push({ k: run.passives[id] ? 'plv' : 'pnew', id, rar: 0, g: 1 });
  return c.length ? pick(c) : null;
}
function owned(id) { return run.weapons.find(w => w.id === id); }
function genCards(n, allowEvo) {
  const cands = [], forced = [];
  for (const w of run.weapons) {
    if (!w.evo && w.lv < 5) cands.push({ k: 'wlv', id: w.id, w: 3 });
    if (!w.evo && w.lv >= 5 && (run.passives[WEAPONS[w.id].need] || 0) >= 1 && allowEvo) forced.push({ k: 'evo', id: w.id, rar: 2, g: 0 });
  }
  if (allowEvo) for (const id of Object.keys(run.passives)) {   // 能力の進化: Lv5 + 必要な武器をLv3以上
    const w = owned(PEVO[id].need);
    if (run.passives[id] >= 5 && !run.pevo[id] && w && w.lv >= 3) forced.push({ k: 'pevo', id, rar: 2, g: 0 });
  }
  if (run.weapons.length < 4) for (const id of save.weapons) if (!owned(id)) cands.push({ k: 'wnew', id, w: 2 });
  const pl = Object.keys(run.passives);
  for (const id of pl) if (run.passives[id] < 5) cands.push({ k: 'plv', id, w: 3 });
  if (pl.length < 4) for (const id in PASSIVES) if (!run.passives[id]) cands.push({ k: 'pnew', id, w: 2 });
  const out = forced.slice(0, n);
  while (out.length < n && cands.length) {
    const c = wpick(cands.map(x => [x, x.w])); cands.splice(cands.indexOf(c), 1);
    const r = rng(), ep = 0.04 + 0.02 * st.luck, rp = 0.22 + 0.04 * st.luck;
    out.push({ k: c.k, id: c.id, rar: r < ep ? 2 : r < ep + rp ? 1 : 0 });
  }
  for (const c of out) if (c.k !== 'evo' && c.k !== 'pevo') c.g = 1 + c.rar;
  if (!out.length) out.push({ k: 'heal', rar: 0, g: 1 });
  return out;
}
function cardInfo(c) {
  const wd = WEAPONS[c.id], pd = PASSIVES[c.id];
  switch (c.k) {
    case 'evo': return { name: wd.evo, sub: '進化！', desc: wd.name + 'が進化する' };
    case 'pevo': return { name: PEVO[c.id].name, sub: '進化！', desc: PEVO[c.id].desc };
    case 'wnew': return { name: wd.name, sub: 'NEW', desc: wd.desc };
    case 'wlv': { const w = owned(c.id); return { name: wd.name, sub: `Lv${w.lv} → Lv${Math.min(5, w.lv + c.g)}`, desc: wd.desc }; }
    case 'pnew': return { name: pd.name, sub: 'NEW', desc: pd.desc };
    case 'plv': return { name: pd.name, sub: `Lv${run.passives[c.id]} → Lv${Math.min(5, run.passives[c.id] + c.g)}`, desc: pd.desc };
    case 'heal': return { name: 'HP回復', sub: '', desc: 'HPを1回復する' };
  }
}
function applyCard(c) {
  switch (c.k) {
    case 'evo': owned(c.id).evo = true; break;
    case 'pevo': run.pevo[c.id] = true; if (c.id === 'bomb') run.bombs = Math.min(8, run.bombs + 3); break;
    case 'wnew': run.weapons.push({ id: c.id, lv: Math.min(5, c.g), evo: false, t: 0, ang: 0 }); break;
    case 'wlv': { const w = owned(c.id); w.lv = Math.min(5, w.lv + c.g); break; }
    case 'pnew': case 'plv': {
      const before = run.passives[c.id] || 0, after = Math.min(5, before + c.g);
      run.passives[c.id] = after;
      if (c.id === 'bomb') run.bombs = Math.min(8, run.bombs + (after - before));
      break;
    }
    case 'heal': run.hp = Math.min(run.maxhp, run.hp + 1); break;
  }
  recalc();
}

// カードに出す「進化先」と「進化に必要なスキル」
function evoLines(c) {
  const G = '#8f8', R = '#f88', H = '#9ab', GOLD = '#fc4';
  if (c.k === 'wnew' || c.k === 'wlv') {
    const wd = WEAPONS[c.id], w = owned(c.id), ok = (run.passives[wd.need] || 0) >= 1;
    if (w && w.evo) return [{ t: '進化済み', col: GOLD }];
    return [{ t: '進化→' + wd.evo, col: GOLD }, { t: '必要な能力', col: H }, { t: PASSIVES[wd.need].name + (ok ? ' ✓' : ' ✗'), col: ok ? G : R }, { t: 'Lv5+宝箱で進化', col: H }];
  }
  if (c.k === 'pnew' || c.k === 'plv') {
    const pe = PEVO[c.id];
    if (run.pevo[c.id]) return [{ t: '進化済み', col: GOLD }];
    const w = owned(pe.need), ok = !!w && w.lv >= 3;
    return [{ t: '進化→' + pe.name, col: GOLD }, { t: '必要な武器', col: H }, { t: WEAPONS[pe.need].short + 'Lv3~' + (ok ? ' ✓' : ' ✗'), col: ok ? G : R }, { t: 'Lv5+宝箱で進化', col: H }];
  }
  if (c.k === 'evo') return [{ t: '武器が進化！', col: GOLD }, { t: '性能が大幅に強化', col: H }];
  if (c.k === 'pevo') return [{ t: '能力が進化！', col: GOLD }, { t: 'Lv+3 相当に強化', col: H }];
  return [];
}
