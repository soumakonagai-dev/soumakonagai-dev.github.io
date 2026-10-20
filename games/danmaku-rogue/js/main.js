'use strict';
// ===== シーン管理 / メインループ =====
let save = loadSave();
let scene = 'title', paused = false;
bindPointer(cv);

// ----- タイトル / メタ -----
function moveDiff(d) { ui.diff = clamp(ui.diff + d, 0, 4); ui.msg = ''; }
function startGame() {
  if (ui.diff >= save.diffUnlocked) { ui.msg = 'この難易度はまだ解放されていません'; return; }
  const S = STAGES[ui.stageSel];
  if (!stageOpen(S.id)) { ui.msg = '前のステージをクリアすると解放されます'; return; }
  newRun(ui.diff, Number(Q.get('seed')) || Math.floor(Math.random() * 1e6));
  startStage(S.id);
}

// ----- コース / 格納庫 / ガチャ -----
ui.stageSel = 0; ui.hi = 0; ui.gacha = { res: [], t: 0, msg: '', phase: 'idle', gp: [] };
function debugOn() { return !!Q.get('debug') || !!save.debug; }   // ?debug=1 か、タイトルで F9 を押すとデバッグメニューが使える
function stageOpen(id) { return id === 1 || !!save.stages[id - 1] || !!Q.get('unlock') || !!save.unlockAll; }
// ----- デバッグメニューの操作 -----
const DBG_ACTIONS = {
  gold1: () => { save.gold += 10000; return 'ゴールド +10,000'; },
  gold2: () => { save.gold += 100000; return 'ゴールド +100,000'; },
  core: () => { save.core += 1000; return 'コア +1,000'; },
  diffs: () => { save.diffUnlocked = 5; return '難易度をすべて解放'; },
  stages: () => { save.unlockAll = !save.unlockAll; return save.unlockAll ? 'ステージをすべて解放' : 'ステージ解放を元に戻した'; },
  cleared: () => { STAGES.forEach(s => { save.stages[s.id] = Math.max(save.stages[s.id] || 0, 5); }); return '全ステージをクリア済みにした'; },
  ships: () => { save.ships = SHIPS.map(s => s.id); return '機体をすべて入手'; },
  abil: () => { ABILITIES.forEach(a => { save.abilities[a.id] = 5; }); return '能力をすべてLv5に'; },
  abilReset: () => { save.abilities = {}; save.pity = 0; return '能力をリセット'; },
  weapons: () => { save.weapons = Object.keys(WEAPONS); return '武器をすべて解放'; },
  meta: () => { META.forEach(m => { save.meta[m.id] = m.max; }); return '永続強化をすべて最大に'; },
  pity: () => { save.pity = 49; return 'ガチャ: 次の1回がSSR確定'; },
  inv: () => { dbg.inv = !dbg.inv; return '無敵: ' + (dbg.inv ? 'ON' : 'OFF'); },
  everything: () => { ['gold2', 'core', 'diffs', 'stages', 'ships', 'abil', 'weapons', 'meta'].forEach(k => { if (k !== 'stages' || !save.unlockAll) DBG_ACTIONS[k](); }); return '全部入りにした'; },
  reset: () => {
    if (!ui.dbgConfirm) { ui.dbgConfirm = true; return 'もう一度押すとセーブを全削除します'; }
    ui.dbgConfirm = false; const dbgFlag = save.debug; save = defaultSave(); save.debug = dbgFlag; return 'セーブを初期化しました';
  },
};
function dbgDo(k) {
  if (k !== 'reset') ui.dbgConfirm = false;
  ui.msg = DBG_ACTIONS[k](); persist();
}

function cycleShip(d) {
  const own = SHIPS.filter(s => save.ships.includes(s.id)), i = own.findIndex(s => s.id === save.ship);
  save.ship = own[(i + d + own.length) % own.length].id; persist();
}
function openHangar() { ui.hi = Math.max(0, SHIPS.findIndex(s => s.id === save.ship)); ui.msg = ''; scene = 'hangar'; }
function moveHangar(d) { ui.hi = (ui.hi + d + SHIPS.length) % SHIPS.length; ui.msg = ''; }
function hangarAct() {
  const S = SHIPS[ui.hi];
  if (save.ships.includes(S.id)) save.ship = S.id;
  else if (save.gold >= S.price) { save.gold -= S.price; save.ships.push(S.id); save.ship = S.id; ui.msg = ''; }
  else { ui.msg = 'ゴールドが足りません'; return; }
  persist();
}
function pullOne(minR) {
  save.pity++;
  let r;
  if (save.pity >= 50) r = 3;   // 50回目はSSR確定
  else { const x = Math.random() * 100; r = x < 2 ? 3 : x < 12 ? 2 : x < 40 ? 1 : 0; }
  if (r < minR) r = minR;
  if (r === 3) save.pity = 0;
  const list = ABILITIES.filter(a => a.rar === r), a = list[Math.floor(Math.random() * list.length)], lv = save.abilities[a.id] || 0;
  if (lv >= 5) { save.gold += REFUND[r]; return { a, r, dup: true, refund: REFUND[r] }; }   // 最大Lvの重複はゴールドに還元
  save.abilities[a.id] = lv + 1;
  return { a, r, isNew: lv === 0, lv: lv + 1 };
}
function doGacha(n) {
  const cost = n === 10 ? 900 : 100, g = ui.gacha;
  if (g.phase === 'charge' || g.phase === 'burst' || g.phase === 'reveal') return;
  if (save.gold < cost) { g.msg = 'ゴールドが足りません'; return; }
  save.gold -= cost; g.msg = ''; g.res = [];
  for (let i = 0; i < n; i++) g.res.push(pullOne(n === 10 && i === 9 && !g.res.some(x => x.r >= 1) ? 1 : 0));   // 10連は1つ以上R以上
  persist();
  g.maxR = Math.max(...g.res.map(r => r.r)); g.phase = 'charge'; g.t = 0; g.ci = 0; g.ct = 0; g.gp = [];
  SFX.charge(g.maxR);
}
function gachaSkip() {   // 演出中のクリック: チャージは飛ばす / 演出カードは次へ
  const g = ui.gacha;
  if (g.phase === 'charge') g.t = Math.max(g.t, 120);
  else if (g.phase === 'reveal' && g.ct > 14) revealNext(g);
}
function revealNext(g) {
  g.ci++; g.ct = 0; g.gp = [];
  if (g.ci >= g.res.length) { g.phase = 'sum'; g.t = 0; } else SFX.chime(g.res[g.ci].r);
}
function updateGacha() {
  const g = ui.gacha; g.t++;
  if (g.phase === 'charge') { if (g.t >= 120) { g.phase = 'burst'; g.t = 0; SFX.burst(g.maxR); } }
  else if (g.phase === 'burst') { if (g.t >= 28) { g.phase = 'reveal'; g.t = 0; g.ci = 0; g.ct = 0; SFX.chime(g.res[0].r); } }
  else if (g.phase === 'reveal') {
    g.ct++;
    const r = g.res[g.ci];
    if (g.ct === 1) for (let i = 0; i < 24 + r.r * 22; i++) { const a = vrnd(0, 6.283), s = vrnd(2, 7 + r.r * 2); g.gp.push({ x: W / 2, y: 320, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 40, ml: 40, s: vrnd(2, 4) }); }
    for (const p of g.gp) { p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.l--; }
    g.gp = g.gp.filter(p => p.l > 0);
    if (g.ct >= [26, 38, 74, 104][r.r]) revealNext(g);
  }
}

function metaItems() {
  const out = META.map(m => { const lv = save.meta[m.id], maxed = lv >= m.max; return { kind: 'meta', id: m.id, name: m.name, desc: `${m.desc}（最大Lv${m.max}）`, status: `Lv ${lv}/${m.max}`, cost: m.cost(lv), maxed }; });
  for (const u of UNLOCKS) { const has = save.weapons.includes(u.id); out.push({ kind: 'unlock', id: u.id, name: WEAPONS[u.id].name + ' 解放', desc: WEAPONS[u.id].desc, status: has ? '解放済み' : '未解放', cost: u.cost, maxed: has }); }
  return out;
}
function buyMeta() {
  const it = metaItems()[ui.metaSel];
  if (!it || it.maxed || save.core < it.cost) return;
  save.core -= it.cost;
  if (it.kind === 'meta') save.meta[it.id]++; else save.weapons.push(it.id);
  persist();
}
function toTitle() { scene = 'title'; ui.msg = ''; }

// ----- ラン終了 -----
function endRun(won) {
  if (run.ended) return; run.ended = true; run.won = won;
  const gain = Math.floor(run.core + (won ? 50 * D.core : 0));
  run.coreGain = gain; save.core += gain;
  if (won) { const bonus = Math.round(150 * D.core * (1 + 0.06 * ab('gold'))); save.gold += bonus; run.goldEarned += bonus; run.clearBonus = bonus; save.stages[run.stage] = Math.max(save.stages[run.stage] || 0, D.id); }
  else if (!run.bossKilled) { const part = Math.round(stageGold() * 0.15 * run.wavesDone); save.gold += part; run.goldEarned += part; }   // 途中で倒れても、クリアしたウェーブ分は少し残る
  if (won) {
    const before = save.diffUnlocked; save.diffUnlocked = Math.max(save.diffUnlocked, Math.min(5, D.id + 1));
    if (save.diffUnlocked > before) run.unlockedMsg = `${DIFFICULTY[save.diffUnlocked - 1].name} が解放されました！`;
  }
  persist(); scene = won ? 'clear' : 'over';
}

// ----- カード系シーン -----
function openLevelUp() { scene = 'levelup'; ui.cards = genCards(3, false); }
function openChest() {
  scene = 'chest'; run.picks = 1; run.curseTaken = false; ui.cards = genCards(3, true);
  if (run.guaranteeRare) {
    run.guaranteeRare = false;
    const c = ui.cards.find(x => x.k !== 'evo' && x.k !== 'heal');
    if (c && c.rar < 1) { c.rar = 1; c.g = 2; }
  }
}
function acceptCurse() { if (run.curseTaken) return; run.curseTaken = true; run.curse++; run.picks++; refreshMul(); }
function pickCard(i) {
  if (scene === 'shop') return buyShop(i);
  const c = ui.cards[i]; if (!c) return;
  applyCard(c);
  if (scene === 'levelup') {
    run.pending--;
    if (run.pending > 0) ui.cards = genCards(3, false); else scene = 'run';
  } else if (scene === 'chest') {
    run.picks--;
    if (run.picks > 0) ui.cards = genCards(3, true); else if (run.wave >= 5) endRun(true); else openRoute();
  }
}
function doReroll() { if (run.rerolls > 0 && scene === 'levelup') { run.rerolls--; ui.cards = genCards(3, false); } }
function doSkip() {
  if (run.skips <= 0 || scene !== 'levelup') return;
  run.skips--; run.hp = Math.min(run.maxhp, run.hp + 1); run.pending--;
  if (run.pending > 0) ui.cards = genCards(3, false); else scene = 'run';
}

// ----- ルート / ショップ / 休憩 / イベント -----
function openRoute() {
  const others = ['elite', 'shop', 'rest', 'event'];
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  ui.nodes = run.restricted ? ['normal', 'elite'] : ['normal'].concat(others.slice(0, 2));
  scene = 'route';
}
function chooseNode(k) {
  if (k === 'normal' || k === 'elite') { run.restricted = false; startWave(run.wave + 1, k); return; }
  run.restricted = true;
  if (k === 'shop') { ui.shop = { cards: genCards(3, false).map(c => Object.assign(c, { price: 35 + 25 * c.rar, sold: false })) }; scene = 'shop'; }
  else if (k === 'rest') scene = 'rest';
  else { ui.event = pick(EVENTS); scene = 'event'; }
}
function buyShop(i) {
  if (i === 'heal') { if (run.gold >= 25 && run.hp < run.maxhp) { run.gold -= 25; run.hp++; } return; }
  if (i === 'bomb') { if (run.gold >= 40 && run.bombs < 8) { run.gold -= 40; run.bombs++; } return; }
  const c = ui.shop.cards[i]; if (!c || c.sold || run.gold < c.price) return;
  run.gold -= c.price; applyCard(c); c.sold = true;
}
function leaveNode() { openRoute(); }
function doRest(i) {
  if (i === 0) run.hp = Math.min(run.maxhp, run.hp + 2);
  else {
    const pool = [];
    for (const w of run.weapons) if (!w.evo && w.lv < 5) pool.push({ k: 'wlv', id: w.id, g: 1 });
    for (const id in run.passives) if (run.passives[id] < 5) pool.push({ k: 'plv', id, g: 1 });
    if (pool.length) applyCard(pick(pool)); else run.hp = Math.min(run.maxhp, run.hp + 2);
  }
  leaveNode();
}
function doEvent(which) { ui.event[which].fn(run); recalc(); refreshMul(); leaveNode(); }

// ----- BGM -----
let curMusic = null, lastDuck = 1;
function musicFor() {
  switch (scene) {
    case 'levelup': return null;   // 戦闘中のレベルアップは曲を止めずに続ける
    case 'run':
      if (run.state === 'boss' || run.state === 'warn' || run.state === 'bossdead') return run.stage % 2 ? 'bossA' : 'bossB';
      if (run.state === 'mid') return run.stage % 2 ? 'bossB' : 'bossA';
      return 'field' + (1 + (run.stage - 1) % 3);
    case 'clear': return 'clear';
    case 'over': return 'over';
    default: return 'menu';   // タイトル・各メニュー・ウェーブの合間
  }
}
function updateMusic() {
  if (!Music.started) return;
  const w = musicFor();
  if (w && w !== curMusic) { curMusic = w; Music.play(w); }
  const duck = scene === 'gacha' && ['charge', 'burst', 'reveal'].includes(ui.gacha.phase) ? 0.25 : 1;   // ガチャ演出中はBGMを小さく
  if (duck !== lastDuck) { lastDuck = duck; Music.setDuck(duck); }
}
function toggleMute() { save.muted = !save.muted; persist(); Music.setMuted(save.muted); }
['pointerdown', 'click', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, () => {   // ブラウザの決まりで、最初の操作のあとに音が出せる
  if (!Music.started) { Music.init(ac()); Music.setMuted(!!save.muted); }
}));

// ----- 入力処理 -----
const numKey = p => { for (let i = 1; i <= 5; i++) if (p['Digit' + i] || p['Numpad' + i]) return i - 1; return -1; };
function updateRun() {
  run.f++; run.grazeB = Math.min(12, run.grazeB + 8 / 60);   // グレイズ経験値は毎秒8まで（弾の海に居座る稼ぎ防止）
  updatePlayer(); updateWeapons(); updatePlayerBullets(); updateStageFlow(); updateEnemies(); updateEnemyBullets(); updateGems(); updateParticles();
  if (scene === 'run' && run.pending > 0) openLevelUp();
}
function updateScene() {
  const p = pressed, n = numKey(p);
  switch (scene) {
    case 'title':
      if (p.Enter || p.Space || p.KeyZ) { scene = 'play'; ui.msg = ''; }
      if (p.KeyE) scene = 'hub';
      if (p.F9) { save.debug = !save.debug; persist(); ui.msg = save.debug ? 'デバッグ ON' : 'デバッグ OFF'; }
      break;
    case 'debug':
      if (p.Escape) { scene = 'title'; ui.msg = ''; ui.dbgConfirm = false; }
      break;
    case 'play': {
      const n = STAGES.length;
      if (p.ArrowLeft) ui.stageSel = (ui.stageSel + n - 1) % n;
      if (p.ArrowRight) ui.stageSel = (ui.stageSel + 1) % n;
      if (p.ArrowUp) ui.stageSel = (ui.stageSel + n - 2) % n;
      if (p.ArrowDown) ui.stageSel = (ui.stageSel + 2) % n;
      if (p.KeyA) moveDiff(-1);
      if (p.KeyD) moveDiff(1);
      if (p.Enter || p.Space || p.KeyZ) startGame();
      if (p.Escape) scene = 'title';
      break;
    }
    case 'hub':
      if (p.Digit1 || p.KeyM) scene = 'meta';
      if (p.Digit2 || p.KeyG) { scene = 'gacha'; ui.gacha = { res: [], t: 0, msg: '', phase: 'idle', gp: [] }; }
      if (p.Digit3 || p.KeyH) openHangar();
      if (p.Escape) scene = 'title';
      break;
    case 'gacha': {
      updateGacha();
      const g = ui.gacha, busy = g.phase === 'charge' || g.phase === 'burst' || g.phase === 'reveal';
      if (p.Digit1 || p.Numpad1) doGacha(1);
      if (p.Digit2 || p.Numpad2) doGacha(10);
      if (busy && (p.Enter || p.Space)) gachaSkip();
      if (p.Escape) { if (busy) { g.phase = 'sum'; g.t = 0; } else scene = 'hub'; }
      break;
    }
    case 'hangar':
      if (p.ArrowLeft || p.KeyA) moveHangar(-1);
      if (p.ArrowRight || p.KeyD) moveHangar(1);
      if (p.Enter || p.Space || p.KeyZ) hangarAct();
      if (p.Escape) { scene = 'hub'; ui.msg = ''; }
      break;
    case 'meta': {
      const len = metaItems().length;
      if (p.ArrowUp || p.KeyW) ui.metaSel = (ui.metaSel + len - 1) % len;
      if (p.ArrowDown || p.KeyS) ui.metaSel = (ui.metaSel + 1) % len;
      if (p.Enter || p.Space || p.KeyZ) buyMeta();
      if (p.Escape || p.Backspace) scene = 'hub';
      break;
    }
    case 'run':
      if (p.Escape || p.KeyP) paused = !paused;
      if (debugOn()) {   // デバッグ用キー: F1 無敵 / F2 ボス戦へ / F3 レベルアップ
        if (p.F1) dbg.inv = !dbg.inv;
        if (p.F2 && (run.state === 'road' || run.state === 'mid')) startWave(5, 'normal');
        if (p.F3) gainExp(needExp(run.level));
      }
      if (!paused) updateRun();
      break;
    case 'levelup': if (n >= 0 && n < 3) pickCard(n); if (p.KeyR) doReroll(); if (p.KeyS) doSkip(); break;
    case 'chest': if (n >= 0 && n < 3) pickCard(n); if (n === 3) acceptCurse(); break;
    case 'route': if (n >= 0 && n < ui.nodes.length) chooseNode(ui.nodes[n]); break;
    case 'shop': if (n >= 0 && n < 3) buyShop(n); if (n === 3) buyShop('heal'); if (n === 4) buyShop('bomb'); if (p.Enter || p.Escape) leaveNode(); break;
    case 'rest': if (n === 0) doRest(0); if (n === 1) doRest(1); break;
    case 'event': if (n === 0) doEvent('a'); if (n === 1) doEvent('b'); break;
    case 'over': case 'clear': if (p.Enter || p.Space || p.Escape) toTitle(); break;
  }
}
function step() {
  if (mouse.click) {
    for (let i = ui.rects.length - 1; i >= 0; i--) {
      const r = ui.rects[i];
      if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) { r.fn(); break; }
    }
  }
  if (pressed.KeyN) toggleMute();
  updateMusic();
  updateScene();
  for (const k in pressed) delete pressed[k];
  mouse.click = false;
}

// ----- 描画 -----
function render() {
  ui.tick++; ui.rects.length = 0;
  cv.style.cursor = scene === 'run' && !paused && mouse.follow ? 'none' : 'default';
  switch (scene) {
    case 'title': drawTitle(); break;
    case 'play': drawPlay(); break;
    case 'debug': drawDebug(); break;
    case 'hub': drawHub(); break;
    case 'meta': drawMeta(); break;
    case 'gacha': drawGacha(); break;
    case 'hangar': drawHangar(); break;
    case 'run':
      drawGame();
      if (paused) { dimScreen(); T('PAUSE', W / 2, 340, 36, '#fff', 'center', 'bold'); T('P / Esc で再開   N: BGM ' + (save.muted ? 'オン' : 'オフ'), W / 2, 372, 14, '#cde', 'center'); }
      break;
    case 'levelup': drawCardScene('LEVEL UP!', `Lv ${run.level} に到達。強化を1つ選ぶ`); break;
    case 'chest': drawCardScene('宝箱', run.wave >= 5 ? 'ボス撃破の報酬。1つ選ぶ' : '中ボス撃破の報酬。1つ選ぶ'); break;
    case 'route': drawRoute(); break;
    case 'shop': drawShop(); break;
    case 'rest': drawRest(); break;
    case 'event': drawEvent(); break;
    case 'over': drawResult(false); break;
    case 'clear': drawResult(true); break;
  }
}

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
