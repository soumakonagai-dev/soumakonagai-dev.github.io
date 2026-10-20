'use strict';
// ===== 敵弾プール・エミッタ・難易度スケーラ（設計書 §6 / §7） =====
const EB = Array.from({ length: 2000 }, () => ({ alive: false }));
let ebHint = 0;
const EL = [];          // 敵の予告レーザー
const spriteCache = {};
let D = DIFFICULTY[1];

function allocEB() {
  for (let n = 0; n < EB.length; n++) {
    const i = (ebHint + n) % EB.length;
    if (!EB[i].alive) { ebHint = i + 1; return EB[i]; }
  }
  return null; // 上限到達: 新しい発射を間引く
}
// 自機の半径60px以内には弾を出さない（スポーン事故の防止）
function spawnEB(x, y, ang, spd, o) {
  const dx = x - P.x, dy = y - P.y;
  if (dx * dx + dy * dy < 3600) return null;
  const b = allocEB(); if (!b) return null;
  b.alive = true; b.x = x; b.y = y; b.a = ang; b.s = spd * (st.bslow || 1);
  b.acc = o.acc || 0; b.max = o.max || 99; b.home = o.home || 0; b.split = o.split || null;
  b.type = o.type || 'rice'; b.sp = sprite(b.type, o.col || '#f8a'); b.r = BT[b.type].hr; b.graze = false;
  return b;
}
function ebCount() { let n = 0; for (const b of EB) if (b.alive) n++; return n; }

// ===== エミッタ生成：パターン基準値 × 難易度 × ステージ × 呪い、最後に安全ルール =====
// 弾幕の濃さ T = 難易度の dens × ステージ進行 × ノード。T 倍の弾を出すために、間隔を縮め、足りない分を本数で補う。
const MAX_RATE = 64;   // 1つの発射源が出せる弾の上限（発/秒）。これ以上は本数を減らして、弾の海になりすぎるのを防ぐ
function buildEmitter(id) {
  const b = PATTERNS[id];
  const T = D.dens * (1 + 0.045 * (run.stage - 1)) * run.nodeMul;
  const spdMul = D.speed * (1 + 0.05 * run.curse);                       // 速度倍率（呪い込み）
  const e = { id, type: b.type, bt: b.bt || 'rice', col: b.col, rot: rnd(0, 360), cnt: 0, t: 0, bl: 0, bw: 0,
    speed: (b.speed || 0) * spdMul, acc: (b.acc || 0) * spdMul, max: (b.max || 99) * spdMul,
    spread: b.spread || 0, rotate: b.rotate || 0, homeT: b.homeT || 0, splitT: b.splitT || 0, splitWays: b.splitWays || 0,
    warn: b.warn || 0, dur: b.dur || 0 };
  const rapid = b.interval <= 10;   // 高速連射の弾幕は、本数よりも間隔の短縮で濃くする
  const burstable = ['aim', 'ring', 'split', 'homing'].includes(b.type) && b.interval >= 40;
  const burst = burstable ? Math.max(1, 1 + D.burst) : 1;
  e.burst = burst;
  e.interval = Math.max(rapid ? 5 : 4, Math.round(b.interval * burst / Math.pow(T, rapid ? 0.65 : 0.4)));
  const rate = b.interval * burst / e.interval;                           // 実際の発射頻度の倍率（まとめ撃ち込み）
  let ways = Math.max(1, Math.round(b.ways * T / rate));                  // 残りの濃さは本数で補う
  if (b.type === 'ring' && b.ways >= 6) { ways = Math.max(6, ways); if (ways % 2) ways++; } // 全方位リングは偶数
  if (b.type === 'laser') ways = Math.min(ways, 3);
  else {
    const capK = D.id >= 4 ? 1.6 : 1;   // LUNATIC・ABYSS は上限をゆるめ、より濃い弾幕を許す
    ways = Math.min(ways, Math.max(b.ways, Math.floor(64 * capK / Math.max(e.speed, 0.5))));              // 速い弾ほど数を減らす
    ways = Math.min(ways, Math.max(b.ways, Math.floor(MAX_RATE * capK * e.interval / (60 * burst))));       // 発射源あたりの上限
  }
  e.ways = ways;
  e.gap = Math.max(30, D.gap);                                           // 壁の隙間は自機判定径×5=30px 以上を保証
  e.t = rint(0, Math.floor(e.interval * 0.6));
  return e;
}

function updateEmitters(en) {
  if (en.y < 8 || en.y > H - 40 || en.silent) return;
  for (const m of en.ems) {
    if (m.t < 0) { m.t++; continue; }
    if (++m.t >= m.interval) { m.t = 0; m.bl = m.burst; m.bw = 0; }
    if (m.bl > 0 && --m.bw <= 0) { fireEm(m, en.x, en.y); m.bl--; m.bw = 6; }
  }
}

function fireEm(m, ox, oy) {
  const o = { type: m.bt, col: m.col, acc: m.acc, max: m.max };
  const ta = Math.atan2(P.y - oy, P.x - ox);
  switch (m.type) {
    case 'aim': case 'split': case 'homing': {
      const a = ta + vrnd(-D.aimJitter, D.aimJitter) * RAD;
      const oo = m.type === 'homing' ? Object.assign({}, o, { home: m.homeT }) : o;
      for (let i = 0; i < m.ways; i++) {
        const ang = m.ways === 1 ? a : a + (-m.spread / 2 + m.spread * i / (m.ways - 1)) * RAD;
        const ob = m.type === 'split' ? Object.assign({}, o, { split: { t: m.splitT, ways: m.splitWays, speed: 1.6 * D.speed } }) : oo;
        spawnEB(ox, oy, ang, m.speed, ob);
      }
      break;
    }
    case 'ring': {
      for (let i = 0; i < m.ways; i++) spawnEB(ox, oy, (m.rot + 360 * i / m.ways) * RAD, m.speed, o);
      m.rot += m.rotate;
      break;
    }
    case 'spray': {
      for (let i = 0; i < m.ways; i++) spawnEB(ox, oy, (90 + rnd(-m.spread / 2, m.spread / 2)) * RAD, m.speed * rnd(0.6, 1.3), o);
      break;
    }
    case 'wall': {
      const gx = rnd(m.gap / 2 + 24, W - m.gap / 2 - 24);
      for (let x = 10; x < W; x += 20) { if (Math.abs(x - gx) < m.gap / 2) continue; spawnEB(x, -8, Math.PI / 2, m.speed, o); }
      break;
    }
    case 'cross': {
      for (let i = 0; i < m.ways; i++) {
        const side = (m.cnt++) % 2, ang = side ? 180 - rnd(15, 40) : rnd(15, 40);
        spawnEB(side ? W + 10 : -10, rnd(0, H * 0.4), ang * RAD, m.speed, o);
      }
      break;
    }
    case 'laser': {
      for (let i = 0; i < m.ways; i++) {
        const off = m.ways === 1 ? 0 : (-20 + 40 * i / (m.ways - 1)) * RAD;
        EL.push({ x: ox, y: oy, a: ta + off, t: 0, warn: m.warn, dur: m.dur });
      }
      break;
    }
  }
}

function fireRevenge(e) {
  const rv = REVENGE[D.revenge]; if (!rv) return;
  const a = Math.atan2(P.y - e.y, P.x - e.x), o = { type: 'orb', col: '#f66', acc: rv.acc || 0, max: rv.max || 99 };
  for (let i = 0; i < rv.ways; i++) {
    const ang = rv.ways === 1 ? a : a + (-rv.spread / 2 + rv.spread * i / (rv.ways - 1)) * RAD;
    spawnEB(e.x, e.y, ang, rv.acc ? 1.2 : 2.4, o);
  }
}

function updateEnemyBullets() {
  const pr = st.hit, gr = st.graze;
  for (const b of EB) {
    if (!b.alive) continue;
    if (b.acc) b.s = Math.min(b.max, b.s + b.acc);
    if (b.home > 0) {
      b.home--;
      let d = Math.atan2(P.y - b.y, P.x - b.x) - b.a;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      b.a += clamp(d, -0.045, 0.045);
    }
    b.x += Math.cos(b.a) * b.s; b.y += Math.sin(b.a) * b.s;
    if (b.split && --b.split.t <= 0) {
      const sp = b.split, o = { type: 'small', col: '#ffd070' };
      for (let i = 0; i < sp.ways; i++) spawnEB(b.x, b.y, (360 * i / sp.ways + vrnd(0, 20)) * RAD, sp.speed, o);
      b.alive = false; continue;
    }
    if (b.x < -24 || b.x > W + 24 || b.y < -24 || b.y > H + 24) { b.alive = false; continue; }
    const dx = b.x - P.x, dy = b.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 < (pr + b.r) * (pr + b.r)) { b.alive = false; hurtPlayer(); continue; }
    if (!b.graze && d2 < (gr + b.r) * (gr + b.r)) { b.graze = true; run.graze++; if (run.grazeB >= 1) { run.grazeB--; gainExp(run.expMul / 1.6 * st.grazeExp); } spark(b.x, b.y, 2, '#fff', 1.5, 12); }
  }
  // 予告レーザー
  for (let i = EL.length - 1; i >= 0; i--) {
    const l = EL[i]; l.t++;
    if (l.t >= l.warn && l.t < l.warn + l.dur) {
      const vx = Math.cos(l.a), vy = Math.sin(l.a), px = P.x - l.x, py = P.y - l.y;
      const along = px * vx + py * vy, perp = Math.abs(px * vy - py * vx);
      if (along > 0 && perp < 7 + pr) hurtPlayer();
    }
    if (l.t >= l.warn + l.dur) EL.splice(i, 1);
  }
}

function clearEnemyBullets(toGems, cx, cy, rad) {
  for (const b of EB) {
    if (!b.alive) continue;
    if (rad !== undefined) { const dx = b.x - cx, dy = b.y - cy; if (dx * dx + dy * dy > rad * rad) continue; }
    if (toGems) addGem(b.x, b.y, 'small', run.expMul);
    b.alive = false;
  }
}
