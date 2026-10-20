'use strict';
// ===== 敵・ボス・ウェーブ・ステージ進行（設計書 §4 §5） =====
const EN = [];

function banner(text, col, t) { run.banner = { text, col: col || '#fff', t: t || 120, max: t || 120 }; }

function spawnEnemy(kind, x, y, dir) {
  const def = ENEMIES[kind], hpMul = D.enemyHp * (1 + 0.15 * (run.stage - 1));
  const e = { kind, def, x, y, y0: y, r: def.r, col: def.col, hp: Math.max(1, Math.round(def.hp * hpMul)), t: 0, flash: 0,
    boss: false, enter: 0, dir: dir || 1, vx: 0, vy: 0, state: 0, hold: 0, ems: [], dead: false };
  e.maxhp = e.hp;
  const set = def.variants ? pick(def.variants) : def.pats;
  e.ems = set.concat(def.extra.slice(0, def.heavy ? D.layers : 0)).map(buildEmitter);
  if (kind === 'rusher') { const a = Math.atan2(P.y - y, P.x - x); e.vx = Math.cos(a) * 3.2; e.vy = Math.sin(a) * 3.2; }
  if (kind === 'turret') e.ty = rnd(80, 150);
  EN.push(e); return e;
}

function moveEnemy(e) {
  e.t++;
  switch (e.def.move) {
    case 'down': e.y += 1.6; e.x += Math.sin(e.t * 0.03 + e.x) * 0.3; break;
    case 'arc': e.x += e.dir * 2.0; e.y = e.y0 + e.t * 0.35 + Math.sin(e.t * 0.06) * 40; break;
    case 'dive': e.x += e.vx; e.y += e.vy; break;
    case 'hold': if (e.state === 0 && e.y < e.ty) e.y += 2; else { e.state = 1; if (++e.hold > 600) e.y -= 1.5; } break;
    case 'drift': if (e.state === 0 && e.y < 130) e.y += 1.5; else { e.state = 1; e.hold++; e.x += Math.sin(e.hold * 0.015) * 0.9; if (e.hold > 1100) e.y -= 1.2; } break;
  }
  if (e.y > H + 40 || e.x < -60 || e.x > W + 60 || (e.y < -60 && e.t > 30)) e.dead = true;
}

function spawnBoss(isMid) {
  const def = isMid ? MIDBOSSES[run.stage - 1] : BOSSES[run.stage - 1];
  const hp = Math.round(def.hp * D.enemyHp);
  const e = { kind: isMid ? 'mid' : 'boss', def, boss: true, x: W / 2, y: -60, r: isMid ? 22 : 30, col: def.col, hp, maxhp: hp,
    t: 0, flash: 0, enter: 90, phase: 0, phT: 0, tx: W / 2, ems: [], silent: true, dead: false };
  EN.push(e); phaseStart(e);
  return e;
}
function phaseStart(e) {
  const ph = e.def.phases[e.phase], layers = e.kind === 'boss' ? D.bossLayers : D.layers;
  e.ems = ph.pats.concat(ph.extra.slice(0, layers)).map(buildEmitter);
  for (const m of e.ems) m.t = -40;
  e.phT = 0;
}
function nextPhase(e, cleared) {
  clearEnemyBullets(cleared); EL.length = 0;   // 撃破で進行したときは敵弾を経験値ジェムに変換
  if (cleared) for (let i = 0; i < 3; i++) addGem(e.x + vrnd(-20, 20), e.y + vrnd(-10, 10), 'mid', 5 * run.expMul);
  e.phase++; P.inv = Math.max(P.inv, 60); shake = 8;
  spark(e.x, e.y, 30, e.col, 4, 30); boom(e.x, e.y, 120, e.col);
  banner(`PHASE ${e.phase + 1}`, e.col, 70);
  phaseStart(e);
}
function updateBoss(e) {
  e.t++;
  if (e.enter > 0) { e.enter--; e.y += (110 - e.y) * 0.06; if (e.enter === 0) e.silent = false; return; }
  e.phT++;
  if (e.t % 150 === 0) e.tx = rnd(120, W - 120);
  e.x += (e.tx - e.x) * 0.02; e.y = 110 + Math.sin(e.t * 0.02) * 12;
  const n = e.def.phases.length, lim = e.kind === 'boss' ? 2700 : 1800;
  if (e.phase < n - 1 && e.phT >= lim) { e.hp = Math.min(e.hp, e.maxhp * (1 - (e.phase + 1) / n)); nextPhase(e, false); }
}

function hurtEnemy(e, d) {
  if (e.dead || (e.boss && e.enter > 0)) return;
  if (e.boss) d *= st.bossDmg;   // ボス特攻
  if (st.crit && Math.random() < st.crit) d *= 2;   // 会心
  e.hp -= d; e.flash = 3;
  if (e.boss) {
    const n = e.def.phases.length, thr = e.maxhp * (1 - (e.phase + 1) / n);
    if (e.hp <= thr) { if (e.phase < n - 1) nextPhase(e, true); else killEnemy(e); }
  } else if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return; e.dead = true; run.kills++;
  const cm = run.coreMul, em = run.expMul;
  if (e.boss) {
    clearEnemyBullets(true); EL.length = 0;
    const mid = e.kind === 'mid';
    for (let i = 0; i < (mid ? 3 : 6); i++) addGem(e.x + vrnd(-30, 30), e.y + vrnd(-20, 20), 'big', 25 * em);
    if (mid) for (let i = 0; i < 4; i++) addGem(e.x + vrnd(-30, 30), e.y + vrnd(-20, 20), 'mid', 5 * em);
    run.core += (mid ? 15 : 40 + 10 * run.stage) * cm; run.gold += Math.round((mid ? 30 : 60) * (1 + 0.08 * ab('coin')) * st.goldp);
    spark(e.x, e.y, 80, e.col, 6, 50); shake = 18; boom(e.x, e.y, 220, e.col); boom(e.x + 30, e.y - 20, 150, '#fff');
    if (mid) waveEnd();
    else {
      run.state = 'bossdead'; run.endT = 120; run.bossKilled = true;
      const g = stageGold(); save.gold += g; run.goldEarned += g; persist();   // ステージクリアでゴールド獲得（すぐ保存）
      banner(`STAGE CLEAR  +${g}G`, '#6f8', 170);
    }
    return;
  }
  for (const g of e.def.gem) addGem(e.x + vrnd(-8, 8), e.y + vrnd(-8, 8), g[0], g[1] * em);
  run.core += e.def.core * cm; run.gold += Math.round(e.def.gold * (1 + 0.08 * ab('coin')) * st.goldp);
  if (e.def.revenge) fireRevenge(e);
  spark(e.x, e.y, 14, e.col, 3, 24); boom(e.x, e.y, e.r * 3, e.col);
}

function updateEnemies() {
  for (const e of EN) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash--;
    if (e.boss) updateBoss(e); else moveEnemy(e);
    if (e.dead) continue;
    updateEmitters(e);
    const dx = e.x - P.x, dy = e.y - P.y, rr = e.r * 0.7 + st.hit;
    if (!(e.boss && e.enter > 0) && dx * dx + dy * dy < rr * rr) hurtPlayer();
  }
  for (let i = EN.length - 1; i >= 0; i--) if (EN[i].dead) EN.splice(i, 1);
}

// ===== ウェーブ =====
function makeWave() {
  const s = run.stage, el = run.node === 'elite', cm = D.enemyCount;
  const kind = wpick([['line', 3], ['vee', 2], ['stream', 2.5], ['turrets', 1.2], ['rush', s >= 2 ? 2 : 0], ['elite', el ? 2.2 : (s >= 6 ? 1.3 : s >= 3 ? 0.6 : 0)]]);
  const q = (d, k, x, y, dir) => run.spawnQ.push({ d, kind: k, x, y, dir });
  switch (kind) {
    case 'line': { const n = Math.max(2, Math.round(5 * cm)); for (let i = 0; i < n; i++) q(i * 8, 'grunt', 60 + i * (360 / (n - 1)), -20); break; }
    case 'vee': { const n = Math.max(3, Math.round(7 * cm)), cx = rnd(120, W - 120); for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; q(0, 'grunt', cx + k * 34, -20 - Math.abs(k) * 24); } break; }
    case 'stream': { const side = rng() < 0.5 ? 1 : -1, n = Math.max(3, Math.round(6 * cm)), y = rnd(40, 160); for (let i = 0; i < n; i++) q(i * 14, 'swirl', side > 0 ? -20 : W + 20, y, side); break; }
    case 'turrets': { q(0, 'turret', 110, -30); q(30, 'turret', W - 110, -30); if (cm >= 1.4) q(60, 'turret', W / 2, -30); break; }
    case 'rush': { const n = Math.max(2, Math.round(4 * cm)); for (let i = 0; i < n; i++) q(i * 20, 'rusher', rnd(40, W - 40), -20); break; }
    case 'elite': q(0, 'elite', W / 2, -40); break;
  }
}

function beginBoss() {
  run.state = 'warn'; run.warnT = 150; run.spawnQ.length = 0;
  banner('WARNING', '#f55', 150);
  for (const e of EN) if (!e.boss) { addGem(e.x, e.y, 'small', run.expMul); e.dead = true; }
}

const waveFrames = () => Math.round(STAGE_SEC / 4 * 60);   // 通常ウェーブ1つの長さ（既定60秒）
function waveEnd() {   // 時間切れ(1,2,4)か中ボス撃破(3)でウェーブクリア
  if (run.hp < run.maxhp && Math.random() < 0.2 * ab('regen')) { run.hp++; spark(P.x, P.y, 14, '#6f8', 3, 24); }   // 応急手当
  run.wavesDone = run.wave; run.spawnQ.length = 0;
  for (const e of EN) if (!e.boss) { addGem(e.x, e.y, 'small', run.expMul); e.dead = true; }
  clearEnemyBullets(true); EL.length = 0;
  run.state = 'wavedone'; run.endT = 110;
  banner(`WAVE ${run.wave} CLEAR`, '#6f8', 110);
}

function updateStageFlow() {
  for (let i = run.spawnQ.length - 1; i >= 0; i--) { const q = run.spawnQ[i]; if (--q.d <= 0) { spawnEnemy(q.kind, q.x, q.y, q.dir); run.spawnQ.splice(i, 1); } }
  switch (run.state) {
    case 'road':
      run.t++;
      if (--run.waveT <= 0) { makeWave(); run.waveT = Math.floor(rnd(150, 230) / D.enemyCount / (1 + 0.04 * (run.stage - 1))); }
      if (run.t >= waveFrames()) waveEnd();
      break;
    case 'wavedone':   // ウェーブ1のあとはルート選択、3のあとは宝箱→ルート選択。2と4のあとはそのまま次へ
      if (--run.endT <= 0) { run.state = 'x'; const w = run.wave; if (w === 1) openRoute(); else if (w === 3) openChest(); else startWave(w + 1, 'normal'); }
      break;
    case 'warn':
      if (--run.warnT <= 0) { const b = spawnBoss(false); run.state = 'boss'; banner(b.def.name, b.col, 120); }
      break;
    case 'bossdead':
      if (--run.endT <= 0) { run.state = 'x'; openChest(); }
      break;
  }
  if (run.banner && --run.banner.t <= 0) run.banner = null;
}

function startStage(n) {   // ステージ n をウェーブ1から始める
  run.stage = n; run.wavesDone = 0; run.restricted = false; run.bossKilled = false;
  startWave(1, 'normal');
}
function startWave(w, node) {
  run.wave = w; run.node = node; run.nodeMul = node === 'elite' ? 1.15 : 1; run.expNode = node === 'elite' ? 1.5 : 1;
  if (node === 'elite') run.guaranteeRare = true;
  run.t = 0; run.state = 'road'; run.waveT = 90; run.spawnQ = [];
  EN.length = 0; EL.length = 0; for (const b of EB) b.alive = false; for (const b of PB) b.alive = false; LASERS.length = 0;
  if (w === 3 || w === 5) run.bombs = Math.min(5, run.bombs + 1);
  if (pl('barrier')) run.shield = Math.max(run.shield, Math.floor((pl('barrier') + 1) / 2));   // 守りの結界
  if (Math.random() < 0.2 * pl('supply')) run.bombs = Math.min(8, run.bombs + 1);              // ボム補給
  refreshMul(); scene = 'run';
  if (w === 3) { run.state = 'mid'; const b = spawnBoss(true); banner(`WAVE 3/5  中ボス：${b.def.name}`, b.col, 140); }
  else if (w === 5) beginBoss();
  else banner(w === 1 ? `${STAGES[run.stage - 1].name}  WAVE 1/5` : `WAVE ${w}/5${node === 'elite' ? '  ELITE' : ''}`, '#8cf', 130);
}
function stageGold() { return Math.round((60 + 25 * run.stage) * D.core * (1 + 0.15 * run.curse) * (1 + 0.06 * ab('gold')) * (run.ship.goldMul || 1)); }
function refreshMul() {
  run.expMul = D.exp * (1 + 0.1 * run.curse) * run.expNode * 1.6 * (1 + 0.03 * ab('exp')) * (run.ship.expMul || 1) * (st.expg || 1);
  run.coreMul = D.core * (1 + 0.15 * run.curse);
}
