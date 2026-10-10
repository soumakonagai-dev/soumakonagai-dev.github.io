// カゲヌケ 描画・入力・画面遷移
(function () {
'use strict';
const K = window.KG, STAGES = window.KG_STAGES, A = window.Art;
const W = K.W, H = K.H, TAU = Math.PI * 2;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
const lctx = lc.getContext('2d');
const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
const tctx = tc.getContext('2d');

const FONT = '"Hiragino Maru Gothic ProN","Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",sans-serif';

// ---------- 状態 ----------
let screen = 'title';         // title | play | clear
let stageIdx = 0, world = null;
let cursor = 0, timer = 0, msg = '', msgT = 0, clock = 0, fade = 0;
let paused = false, pauseCur = 0;
const PAUSE_ITEMS = ['さいかい', 'やりなおし', 'ステージえらびへ'];
let cleared = {};
try { cleared = JSON.parse(localStorage.getItem('kagenuke.cleared2') || '{}'); } catch (e) {}
function saveCleared() { try { localStorage.setItem('kagenuke.cleared2', JSON.stringify(cleared)); } catch (e) {} }
let prevPressed = [];

// ---------- 入力 ----------
const down = new Set(), pressed = new Set();
let wheelZ = 0, dragging = false, dragDX = 0, dragDY = 0;
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
  if (!down.has(e.code)) pressed.add(e.code);
  down.add(e.code);
});
addEventListener('keyup', e => down.delete(e.code));
addEventListener('blur', () => { down.clear(); if (screen === 'play' && world && !world.won && !world.dead) { paused = true; pauseCur = 0; } });
const held = (...c) => c.some(k => down.has(k));
const hit = (...c) => c.some(k => pressed.has(k));

function toWorld(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
}
cv.addEventListener('pointerdown', e => {
  const [x, y] = toWorld(e);
  if (screen === 'title') {
    const i = stageAt(x, y);
    if (i >= 0) { cursor = i; startStage(i); }
  } else if (screen === 'play' && paused) {
    const i = pauseAt(x, y);
    if (i >= 0) { pauseCur = i; pauseDo(i); }
  } else if (screen === 'play' && world && world.control) {
    dragging = true; cv.setPointerCapture(e.pointerId);
  } else if (screen === 'clear') { if (timer > 0.6) nextStage(); }
});
cv.addEventListener('pointermove', e => {
  if (!dragging) return;
  const r = cv.getBoundingClientRect();
  dragDX += e.movementX * W / r.width; dragDY += e.movementY * H / r.height;
});
addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('wheel', e => { wheelZ += Math.sign(e.deltaY) * 30; e.preventDefault(); }, { passive: false });

// ---------- 画面遷移 ----------
function startStage(i) {
  stageIdx = i; world = K.createWorld(STAGES[i]);
  screen = 'play'; paused = false; timer = 0; msg = ''; fade = 1; dragDX = dragDY = wheelZ = 0;
  prevPressed = world.switches.map(() => false);
}
function nextStage() {
  if (stageIdx + 1 < STAGES.length) startStage(stageIdx + 1);
  else { screen = 'title'; cursor = 0; }
}
function say(t) { msg = t; msgT = 2.6; }

function pauseRect(i) { return { x: W / 2 - 220 + 120, y: 400 + i * 84, w: 440, h: 68 }; }
function pauseAt(x, y) {
  for (let i = 0; i < PAUSE_ITEMS.length; i++) { const r = pauseRect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i; }
  return -1;
}
function pauseDo(i) {
  if (i === 0) paused = false;
  else if (i === 1) startStage(stageIdx);
  else { paused = false; screen = 'title'; cursor = stageIdx; }
}

// ---------- 更新 ----------
function tick(dt) {
  if (screen === 'title') {
    const ch = chapters(), cc = chapOf(cursor), ci = cursor - ch[cc].start;
    if (hit('ArrowRight', 'KeyD')) cursor = ch[cc].start + Math.min(ch[cc].count - 1, ci + 1);
    if (hit('ArrowLeft', 'KeyA')) cursor = ch[cc].start + Math.max(0, ci - 1);
    if (hit('ArrowDown', 'KeyS') && cc < ch.length - 1) cursor = ch[cc + 1].start + Math.min(ch[cc + 1].count - 1, ci);
    if (hit('ArrowUp', 'KeyW') && cc > 0) cursor = ch[cc - 1].start + Math.min(ch[cc - 1].count - 1, ci);
    if (hit('Enter', 'Space')) startStage(cursor);
    return;
  }
  if (screen === 'clear') {
    timer += dt;
    if (timer > 0.6 && hit('Enter', 'Space')) nextStage();
    if (hit('Escape')) screen = 'title';
    return;
  }
  // play
  msgT -= dt;
  const w = world;
  if (paused) {
    if (hit('ArrowDown', 'KeyS')) pauseCur = (pauseCur + 1) % PAUSE_ITEMS.length;
    if (hit('ArrowUp', 'KeyW')) pauseCur = (pauseCur + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
    if (hit('Escape', 'KeyP')) paused = false;
    else if (hit('Enter', 'Space')) pauseDo(pauseCur);
    return;
  }
  if (hit('KeyP') || (hit('Escape') && !w.control && !w.dead && !w.won)) { paused = true; pauseCur = 0; return; }
  if (hit('KeyR')) { startStage(stageIdx); return; }
  if (w.dead) {
    timer += dt;
    if (timer > 0.9) startStage(stageIdx);
    return;
  }
  if (w.won) {
    timer += dt;
    if (timer > 1.4) { cleared[STAGES[stageIdx].id] = true; saveCleared(); screen = 'clear'; timer = 0; confettiBurst(); }
    return;
  }
  const inp = {};
  if (w.control) {
    inp.dx = (held('ArrowRight', 'KeyD') ? 1 : 0) - (held('ArrowLeft', 'KeyA') ? 1 : 0);
    inp.dy = (held('ArrowDown', 'KeyS') ? 1 : 0) - (held('ArrowUp', 'KeyW') ? 1 : 0);
    inp.dz = (held('KeyE') ? 1 : 0) - (held('KeyQ') ? 1 : 0);
    inp.px = dragDX; inp.py = dragDY; inp.pz = wheelZ;
    dragDX = dragDY = wheelZ = 0;
    if (hit('Digit1', 'Digit2', 'Tab')) K.selectLight(w);
    if (hit('KeyL', 'KeyF', 'Enter', 'Space', 'Escape')) K.exitControl(w);
  } else {
    inp.left = held('ArrowLeft', 'KeyA'); inp.right = held('ArrowRight', 'KeyD');
    inp.jump = held('Space', 'ArrowUp', 'KeyW', 'KeyZ');
    inp.jumpPressed = hit('Space', 'ArrowUp', 'KeyW', 'KeyZ');
    if (hit('KeyL', 'KeyF', 'Enter')) K.enterControl(w);
    if (hit('KeyC')) {
      const r = K.spawnKage(w);
      if (r === 'ok') say('影をつくった！ Tab で影と実体を切りかえ');
      else if (r === 'max') say('もう影は出せない（影を選んで X で消せる）');
      else if (r === 'narrow') say('その場所の影はせますぎる。光をちかづけて影を大きく');
      else if (r === 'wait') say('地面に立っているときに押そう');
      else if (r === 'out') say('影が画面の外に落ちている。光を動かそう');
      else say('実体の影ができていない');
    }
    if (hit('KeyX')) K.dismissKage(w);
    if (hit('Tab')) K.selectNext(w);
  }
  K.update(w, dt, inp);
  for (const ev of w.events) {
    if (ev.t === 'kage') {
      A.burst(ev.x, ev.y - 14, 18, { speed: 110, g: -40, life: 0.9, size: 2.4, colors: ['#d8ceff', '#b9a6ff', '#fff'], type: 'wisp', drag: 1.5 });
      A.burst(ev.x, ev.y - 14, 6, { speed: 80, life: 0.7, size: 2, color: '#fff', type: 'spark' });
    } else if (ev.t === 'lost') {
      A.burst(ev.x, ev.y - 14, 20, { speed: 90, g: -20, life: 1, size: 2.4, colors: ['#b9a6ff', '#8f7ae8'], type: 'wisp', drag: 1.2 });
      say('影が光にのまれた…');
    } else if (ev.t === 'die') {
      A.burst(ev.x, ev.y - 14, 18, { speed: 130, g: 400, up: -120, life: 0.9, size: 2.4, colors: ['#ec7a4c', '#ffd65a'], type: 'dot' });
    }
  }
  w.events.length = 0;
}

function confettiBurst() {
  for (let i = 0; i < 4; i++) {
    A.burst(400 + i * 270, 760, 36, { speed: 560, up: -520, g: 700, life: 2.6, size: 4.5, colors: ['#ffd65a', '#ec7a4c', '#9d8cff', '#7be3a0', '#ff9ec4', '#7fd8ff'], type: 'confetti', drag: 0.6 });
  }
}

// ---------- 描画 ----------
const rgb = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
const rr = A.rr;

function polyPath(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

function drawWall(w, th) {
  const PAPER = th.paper, DEEP = th.deep;
  // 明るい壁紙色から出発して、あかりごとの影を「かけ算」で暗くする
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = rgb(PAPER, 1);
  lctx.fillRect(0, 0, W, H);
  const n = w.shadows.filter(s => s).length;
  if (n) {
    lctx.globalCompositeOperation = 'lighter';
    w.shadows.forEach((sh, li) => {
      if (!sh) return;
      const q = w.lpos[li];
      const gr = lctx.createRadialGradient(q[0], q[1], 10, q[0], q[1], 1100);
      gr.addColorStop(0, 'rgba(255,240,200,.22)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
      lctx.fillStyle = gr; lctx.fillRect(0, 0, W, H);
    });
    // 影1つぶんの暗さ（ぜんぶの影が重なると、ちょうど濃影の色になる）
    const pw = n === 1 ? 1 : 1.5 / n * 1.0;
    const m = [0, 1, 2].map(i => Math.pow(DEEP[i] / PAPER[i], pw) * 255);
    lctx.globalCompositeOperation = 'multiply';
    lctx.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`;
    for (const sh of w.shadows) { if (!sh) continue; for (const p of sh) { polyPath(lctx, p.pts); lctx.fill(); } }
  }
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = rgb(DEEP, 1);
  for (const r of w.ink) lctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.filter = 'blur(1.2px)';
  ctx.drawImage(lc, 0, 0);
  ctx.restore();
  // 壁紙（かけ算）
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(A.wallPattern(+String(w.def.id).split('-')[0], W, H), 0, 0);
  ctx.restore();
  // 影のふち
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(20,10,40,.28)'; ctx.lineJoin = 'round';
  for (const sh of w.shadows) { if (!sh) continue; for (const p of sh) { polyPath(ctx, p.pts); ctx.stroke(); } }
  for (const r of w.ink) A.drawInk(ctx, r, clock);
}

function drawVignette(th) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, th.vig);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function drawMini(w) {
  const px = W - 340, py = 16, pw = 324, ph = 190;
  const sx = (pw - 20) / W, base = py + ph - 24, sz = (ph - 50) / 900;
  ctx.save();
  ctx.fillStyle = 'rgba(24,14,48,.8)'; rr(ctx, px, py, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; rr(ctx, px + .75, py + .75, pw - 1.5, ph - 1.5, 12); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText('上から見た図', px + 12, py + 20);
  const X = x => px + 10 + x * sx, Z = z => base - z * sz;
  ctx.fillStyle = '#f5e6c4'; ctx.fillRect(px + 10, base, pw - 20, 6);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText('かべ', px + pw - 42, base + 18);
  w.shadows.forEach(sh => {
    if (!sh) return;
    ctx.strokeStyle = 'rgba(160,140,255,.9)'; ctx.lineWidth = 4;
    for (const p of sh) {
      const a = Math.max(0, p.minx), b = Math.min(W, p.maxx);
      if (b > a) { ctx.beginPath(); ctx.moveTo(X(a), base + 3); ctx.lineTo(X(b), base + 3); ctx.stroke(); }
    }
  });
  ctx.fillStyle = '#b79a6a';
  for (const o of w.objects) for (const p of o.parts) {
    if (o.cast === false) continue;
    const half = (o.spin ? Math.hypot(p.w, p.h) : p.w) / 2;
    ctx.fillRect(X(o.x + (p.ox || 0) - half), Z(o.z + (p.oz || 0) + p.d / 2), half * 2 * sx, Math.max(3, p.d * sz));
  }
  const b = w.actors[0], bz = w.def.bodyZ || 80;
  ctx.fillStyle = '#ec7a4c'; ctx.beginPath(); ctx.arc(X(b.x), Z(bz), 5, 0, TAU); ctx.fill();
  w.lights.forEach((l, i) => {
    const q = w.lpos[i];
    ctx.globalAlpha = w.lon[i] ? 1 : 0.35;
    ctx.fillStyle = (w.control && w.control.i === i) ? '#fff' : '#ffd65a';
    ctx.beginPath(); ctx.arc(X(q[0]), Z(q[2]), 6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(q[0]), Z(q[2])); ctx.lineTo(X(b.x), Z(bz)); ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function wrap(text, n) {
  const out = []; let line = '';
  for (const ch of text) { line += ch; if (line.length >= n || (ch === '。' && line.length > n * 0.6)) { out.push(line); line = ''; } }
  if (line) out.push(line);
  return out;
}

function drawHUD(w) {
  const def = w.def;
  ctx.save();
  // タイトルと吹き出し
  const lines = wrap(def.hint, 40);
  const ph = 86 + lines.length * 26;
  ctx.fillStyle = 'rgba(24,14,48,.78)'; rr(ctx, 16, 14, 860, ph, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; rr(ctx, 16.75, 14.75, 858.5, ph - 1.5, 16); ctx.stroke();
  A.drawFace(ctx, 'body', 66, 14 + ph / 2, 36, clock, 'happy');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd65a'; ctx.font = `bold 16px ${FONT}`; ctx.fillText(A.themeOf(def).name + '　' + def.id, 118, 44);
  ctx.fillStyle = '#fff'; ctx.font = `bold 30px ${FONT}`; ctx.fillText(def.name, 118, 78);
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `19px ${FONT}`;
  lines.forEach((l, i) => ctx.fillText(l, 118, 108 + i * 26));
  // 状態
  if (def.kages > 0) {
    const y = 14 + ph + 14;
    ctx.fillStyle = 'rgba(24,14,48,.78)'; rr(ctx, 16, y, 330, 44, 14); ctx.fill();
    for (let i = 0; i < def.kages; i++) {
      const on = i < w.actors.length - 1;
      ctx.globalAlpha = on ? 1 : 0.3;
      A.drawChar(ctx, 'kage', 48 + i * 34, y + 38, 1.2, { t: clock + i, face: 1 });
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d8ceff'; ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(`操作：${w.control ? 'ひかり' : ((w.actors[w.sel] || w.actors[0]).kind === 'body' ? '実体' : '影')}`, 48 + def.kages * 34 + 18, y + 28);
  }
  // 操作ヘルプ
  const help = w.control
    ? '↑↓←→ / ドラッグ：ひかりを動かす　　Q / E / ホイール：奥行き　　Tab：ひかりを選ぶ　　L / Space：やめる'
    : '←→：歩く　　Space：ジャンプ　　L：ひかりを動かす　　C：影をつくる　　Tab：実体↔影　　X：影を消す　　R：やりなおし　　Esc：ポーズ';
  ctx.font = `16px ${FONT}`;
  const hw = ctx.measureText(help).width + 40;
  ctx.fillStyle = 'rgba(24,14,48,.72)'; rr(ctx, W / 2 - hw / 2, H - 52, hw, 34, 17); ctx.fill();
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillText(help, W / 2, H - 29);
  if (msgT > 0 && msg) {
    ctx.globalAlpha = Math.min(1, msgT);
    ctx.font = `bold 24px ${FONT}`;
    const mw = ctx.measureText(msg).width + 56;
    ctx.fillStyle = 'rgba(24,14,48,.85)'; rr(ctx, W / 2 - mw / 2, H - 120, mw, 48, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 87);
  }
  ctx.restore();
}

function drawScene(w) {
  const th = A.themeOf(w.def);
  ctx.fillStyle = rgb(th.deep, 1); ctx.fillRect(0, 0, W, H);
  drawWall(w, th);
  A.drawObjects(ctx, w, th, clock);
  A.drawExit(ctx, w.def.exit, clock);
  for (const d of w.doors) A.drawDoor(ctx, d, th, clock);
  for (const s of w.switches) A.drawSwitch(ctx, s, clock);
  w.lights.forEach((l, i) => A.drawLamp(ctx, w.lpos[i], w.lon[i], w.control && w.control.i === i, l.blink ? { blink: l.blink, t: w.t } : null));
  w.actors.forEach((a, i) => { if (a.kind === 'body') A.drawActor(ctx, a, i === w.sel, clock, w.control); });
  w.actors.forEach((a, i) => { if (a.kind === 'kage') A.drawActor(ctx, a, i === w.sel, clock, w.control); });
  A.drawMotes(ctx, W, H, clock);
  A.drawParticles(ctx);
  drawVignette(th);
  // あかりのちらつき
  const fl = A.flicker(clock);
  if (fl < 0.98) { ctx.fillStyle = `rgba(0,0,0,${(1 - fl) * 0.55})`; ctx.fillRect(0, 0, W, H); }
  A.drawGrain(ctx, W, H);
}

function drawPlay() {
  const w = world;
  drawScene(w);
  drawMini(w);
  drawHUD(w);
  if (w.control) {
    ctx.fillStyle = 'rgba(255,214,90,.95)'; ctx.font = `bold 26px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('— ひかりを動かしている（時間はとまっている）—', W / 2, H - 140);
    ctx.strokeStyle = 'rgba(255,214,90,.45)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, W - 8, H - 8);
  }
  if (w.dead) {
    ctx.fillStyle = `rgba(20,10,40,${Math.min(0.85, timer * 1.4)})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = `bold 48px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('おちてしまった…', W / 2, H / 2);
  }
  if (w.won) {
    ctx.fillStyle = `rgba(255,248,210,${Math.min(1, timer / 1.3)})`; ctx.fillRect(0, 0, W, H);
  }
  if (fade > 0) { ctx.fillStyle = `rgba(12,6,28,${fade})`; ctx.fillRect(0, 0, W, H); }
  if (paused && screen === 'play') drawPause();
}

function drawPause() {
  ctx.fillStyle = 'rgba(12,6,28,.8)'; ctx.fillRect(0, 0, W, H);
  // 立ち絵（ひと休み）
  A.drawChar(ctx, 'body', 360, 780, 12, { face: 1, t: clock, move: 0, blink: Math.sin(clock * 1.7) > 0.96 ? 1 : 0, emote: 'happy' });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5e6c4'; ctx.font = `bold 78px ${FONT}`; ctx.fillText('ポーズ', W / 2 + 120, 300);
  ctx.font = `24px ${FONT}`; ctx.fillStyle = 'rgba(245,230,196,.7)';
  ctx.fillText(`${world.def.id}  ${world.def.name}`, W / 2 + 120, 352);
  PAUSE_ITEMS.forEach((t, i) => {
    const r = pauseRect(i), sel = i === pauseCur;
    ctx.fillStyle = sel ? 'rgba(245,230,196,.96)' : 'rgba(245,230,196,.14)';
    rr(ctx, r.x, r.y, r.w, r.h, 20); ctx.fill();
    ctx.fillStyle = sel ? '#2b2142' : '#f5e6c4'; ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(t, r.x + r.w / 2, r.y + 45);
  });
  ctx.fillStyle = 'rgba(245,230,196,.55)'; ctx.font = `18px ${FONT}`;
  ctx.fillText('↑↓で選んで Enter　　Esc / P：さいかい', W / 2 + 120, 700);
}

// ----- タイトル -----
// 章ごとにまとめる
function chapters() {
  const out = [];
  STAGES.forEach((s, i) => {
    const n = +String(s.id).split('-')[0];
    let c = out.find(o => o.n === n);
    if (!c) { c = { n, start: i, count: 0 }; out.push(c); }
    c.count++;
  });
  return out;
}
const chapOf = (i) => { const ch = chapters(); for (let c = 0; c < ch.length; c++) if (i >= ch[c].start && i < ch[c].start + ch[c].count) return c; return 0; };
function stageRect(i) {
  const ch = chapters()[chapOf(i)], k = i - ch.start;
  return { x: 240 + k * 280, y: 430, w: 250, h: 170 };
}
function tabRect(c) { return { x: 200 + c * 240, y: 340, w: 224, h: 58 }; }
function stageAt(x, y) {
  const ch = chapters(), cc = chapOf(cursor);
  for (let c = 0; c < ch.length; c++) {
    const r = tabRect(c);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { cursor = ch[c].start; return -1; }
  }
  for (let i = ch[cc].start; i < ch[cc].start + ch[cc].count; i++) {
    const r = stageRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function thumb(def, r) {
  const s = (r.w - 24) / W, ox = r.x + 12, oy = r.y + 10, th = A.themeOf(def);
  ctx.save();
  ctx.fillStyle = rgb(th.paper, 0.96); rr(ctx, ox, oy, W * s, 90, 8); ctx.fill();
  ctx.clip();
  for (const q of def.ink) { ctx.fillStyle = 'rgba(60,45,120,.85)'; ctx.fillRect(ox + q.x * s, oy + q.y * s * 0.9 - 6, q.w * s, q.h * s * 0.9); }
  for (const o of def.objects) for (const p of o.parts) {
    if (o.solid === false) { ctx.fillStyle = 'rgba(200,160,100,.9)'; ctx.fillRect(ox + (o.x - p.w / 2) * s, oy + (o.y - p.h / 2) * s * 0.9 - 6, p.w * s, Math.max(2, p.h * s)); }
    else { ctx.fillStyle = '#8d5a2b'; ctx.fillRect(ox + (o.x - p.w / 2) * s, oy + (o.y - p.h / 2) * s * 0.9 - 6, p.w * s, Math.max(2.5, p.h * s * 0.9)); }
  }
  for (const d of def.doors || []) { ctx.fillStyle = d.invert ? '#e6c07c' : '#5a3418'; ctx.fillRect(ox + d.x * s, oy + d.y * s * 0.9 - 6, Math.max(2, d.w * s), Math.max(2, d.h * s * 0.9)); }
  const e = def.exit; ctx.fillStyle = '#ffd65a'; ctx.fillRect(ox + e.x * s, oy + e.y * s * 0.9 - 6, e.w * s, e.h * s * 0.9);
  ctx.fillStyle = '#ec7a4c'; ctx.beginPath(); ctx.arc(ox + def.start[0] * s, oy + def.start[1] * s * 0.9 - 8, 3.2, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawTitle() {
  const t = clock, th = A.THEMES[1];
  ctx.fillStyle = rgb(th.deep, 1); ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, 140, 40, W / 2, 420, 1000);
  bg.addColorStop(0, rgb(th.paper, 0.95)); bg.addColorStop(0.5, 'rgb(96,80,72)'); bg.addColorStop(1, rgb(th.deep, 1));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(A.wallPattern(1, W, H), 0, 0); ctx.restore();
  // ゆれるランプ
  const lx = W / 2 + Math.sin(t * 0.8) * 170, ly = 150;
  A.drawLamp(ctx, [lx, ly, 300], true, false, null);
  // 床
  const fy = 820;
  A.woodGrain(ctx, 0, fy, W, 80, { wood: ['#5a3a1c', '#7a5230', '#3a2410'] }, 3);
  ctx.fillStyle = 'rgba(255,230,180,.25)'; ctx.fillRect(0, fy, W, 3);
  const body = { x: 150, s: 7.5 }, kage = { x: W - 150, s: 7.5 };
  // 実体のうしろで、かってに のびる大きな影
  ctx.save();
  const lean = 0.55 + Math.sin(t * 0.6) * 0.25, stretch = 1.5 + Math.sin(t * 0.9 + 1) * 0.2;
  ctx.translate(body.x + 40, fy); ctx.transform(1, 0, lean, stretch * 0.7, 0, 0); ctx.translate(-body.x - 40, -fy);
  ctx.filter = 'brightness(0) opacity(0.5) blur(5px)';
  A.drawChar(ctx, 'body', body.x + 40, fy, body.s * 1.25, { face: 1, t: t * 0.5, blink: 0 });
  ctx.restore();
  A.drawChar(ctx, 'body', body.x, fy, body.s, { face: 1, t, move: 0, blink: Math.sin(t * 1.4) > 0.965 ? 1 : 0, emote: 'happy', wave: Math.sin(t * 3) > 0 });
  // 影キャラ（にたり）
  ctx.save(); ctx.translate(0, Math.sin(t * 1.4) * 4);
  const g = ctx.createRadialGradient(kage.x, fy - 110, 10, kage.x, fy - 110, 240);
  g.addColorStop(0, 'rgba(150,130,240,.38)'); g.addColorStop(1, 'rgba(150,130,240,0)');
  ctx.fillStyle = g; ctx.fillRect(kage.x - 260, fy - 360, 520, 520);
  A.drawChar(ctx, 'kage', kage.x, fy, kage.s, { face: -1, t: t + 1, move: 0, blink: Math.sin(t * 1.1 + 2) > 0.965 ? 1 : 0 });
  ctx.restore();
  if (Math.random() < 0.25) A.emit({ x: kage.x + (Math.random() - 0.5) * 80, y: fy - 40 - Math.random() * 160, vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 30, life: 1.4, size: 2.6, color: '#b9a6ff', type: 'wisp' });
  // タイトル
  ctx.textAlign = 'center';
  const jit = Math.sin(t * 0.8) > 0.985 ? (Math.random() - 0.5) * 10 : 0;
  ctx.font = `bold 118px ${FONT}`; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(150,30,50,.55)'; ctx.fillText('カゲヌケ', W / 2 + 5 + jit, 223);
  ctx.save(); ctx.shadowColor = 'rgba(255,214,140,.5)'; ctx.shadowBlur = 36;
  ctx.lineWidth = 9; ctx.strokeStyle = '#0e0612'; ctx.strokeText('カゲヌケ', W / 2, 220);
  ctx.fillStyle = '#ecdfc4'; ctx.fillText('カゲヌケ', W / 2, 220);
  ctx.restore();
  ctx.fillStyle = 'rgba(236,223,196,.85)'; ctx.font = `24px ${FONT}`;
  ctx.fillText('あかりを うごかせば、影も うごく。……影が、ひとりでに うごきだす まえに。', W / 2, 282);
  // 章タブ
  const chs = chapters(), cur = chapOf(cursor);
  chs.forEach((c, k) => {
    const r = tabRect(k), sel = k === cur;
    ctx.fillStyle = sel ? 'rgba(232,216,186,.96)' : 'rgba(30,20,40,.78)'; rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = sel ? '#b8613f' : 'rgba(236,223,196,.2)'; ctx.lineWidth = sel ? 3 : 1.5; rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = sel ? '#2a1a38' : '#ecdfc4'; ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`第${c.n}章  ${(A.THEMES[c.n] || {}).name || ''}`, r.x + r.w / 2, r.y + 36);
  });
  // カード（いまの章）
  for (let i = chs[cur].start; i < chs[cur].start + chs[cur].count; i++) {
    const s = STAGES[i];
    const r = stageRect(i), sel = i === cursor, lift = sel ? -8 + Math.sin(t * 4) * 2 : 0;
    ctx.save(); ctx.translate(0, lift);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, r.x + 4, r.y + 8, r.w, r.h, 18); ctx.fill();
    ctx.fillStyle = sel ? 'rgba(232,216,186,.96)' : 'rgba(30,20,40,.82)'; rr(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
    ctx.strokeStyle = sel ? '#b8613f' : 'rgba(236,223,196,.18)'; ctx.lineWidth = sel ? 4 : 1.5; rr(ctx, r.x, r.y, r.w, r.h, 18); ctx.stroke();
    thumb(s, r);
    ctx.fillStyle = sel ? '#2a1a38' : '#ecdfc4'; ctx.font = `bold 22px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(s.id, r.x + 14, r.y + 128);
    ctx.font = `16px ${FONT}`; ctx.fillText(s.name, r.x + 14, r.y + 152);
    if (cleared[s.id]) { ctx.textAlign = 'right'; ctx.fillStyle = '#e0a020'; ctx.font = `bold 22px ${FONT}`; ctx.fillText('★', r.x + r.w - 14, r.y + 128); }
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,223,196,.7)'; ctx.font = `20px ${FONT}`;
  ctx.fillText('←→：ステージ　　↑↓：章　　Enter：はじめる　　またはクリック', W / 2, 700);
  A.drawParticles(ctx);
  A.drawMotes(ctx, W, H, t);
  drawVignette(th);
  const fl = A.flicker(t);
  if (fl < 0.98) { ctx.fillStyle = `rgba(0,0,0,${(1 - fl) * 0.55})`; ctx.fillRect(0, 0, W, H); }
  A.drawGrain(ctx, W, H);
}

// 草原（クリア画面の背景）
let meadow = null;
function meadowBg() {
  if (meadow) return meadow;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  let s = 11; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const sky = x.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#9fd2f2'); sky.addColorStop(1, '#fdf0cf');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  // 太陽
  const sun = x.createRadialGradient(1250, 190, 10, 1250, 190, 330);
  sun.addColorStop(0, 'rgba(255,248,210,1)'); sun.addColorStop(0.18, 'rgba(255,240,170,.85)'); sun.addColorStop(1, 'rgba(255,240,170,0)');
  x.fillStyle = sun; x.fillRect(0, 0, W, 640);
  // くも
  for (let i = 0; i < 6; i++) {
    const cx = 150 + i * 280 + r() * 100, cy = 100 + r() * 190;
    x.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx + k * 34 - 70, cy + Math.sin(k * 1.7) * 9, 46 - Math.abs(k - 2) * 7, 26, 0, 0, TAU); x.fill(); }
  }
  // とおくの丘
  const hill = (y0, amp, col, f) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 20) x.lineTo(px, y0 + Math.sin(px * f + y0) * amp + Math.sin(px * f * 2.3) * amp * 0.4); x.lineTo(W, H); x.closePath(); x.fill(); };
  hill(560, 38, '#a6d27c', 0.004);
  hill(620, 30, '#82c25c', 0.0055);
  // 手前の草原
  const gr = x.createLinearGradient(0, 680, 0, H);
  gr.addColorStop(0, '#6cb84a'); gr.addColorStop(1, '#3f8a34');
  x.fillStyle = gr; x.fillRect(0, 700, W, H - 700);
  // 草のはっぱ
  for (let i = 0; i < 900; i++) {
    const px = r() * W, py = 700 + r() * (H - 700), h = 10 + (py - 700) * 0.09 + r() * 10;
    x.strokeStyle = `hsl(${95 + r() * 30},${50 + r() * 20}%,${28 + r() * 22}%)`; x.lineWidth = 2 + r() * 1.5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (r() - 0.5) * 8, py - h * 0.6, px + (r() - 0.5) * 16, py - h); x.stroke();
  }
  // 花
  const cols = ['#ffffff', '#ffd65a', '#ff9ec4', '#c9a6ff'];
  for (let i = 0; i < 70; i++) {
    const px = r() * W, py = 720 + r() * (H - 740), sz = 3 + (py - 700) * 0.012;
    x.fillStyle = cols[(r() * cols.length) | 0];
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5; x.beginPath(); x.arc(px + Math.cos(a) * sz, py + Math.sin(a) * sz, sz * 0.8, 0, TAU); x.fill(); }
    x.fillStyle = '#f2b830'; x.beginPath(); x.arc(px, py, sz * 0.6, 0, TAU); x.fill();
  }
  meadow = c;
  return c;
}

function drawClear() {
  ctx.drawImage(meadowBg(), 0, 0);
  const fy = 800;
  // 二人でならんで立つ（そよ風でゆれる）
  ctx.fillStyle = 'rgba(20,70,20,.22)'; ctx.beginPath(); ctx.ellipse(560, fy + 4, 74, 11, 0, 0, TAU); ctx.ellipse(1040, fy + 4, 74, 11, 0, 0, TAU); ctx.fill();
  A.drawChar(ctx, 'body', 560, fy, 9, { face: 1, t: clock, move: 0, blink: Math.sin(clock * 1.5) > 0.96 ? 1 : 0, emote: 'happy', wave: Math.sin(clock * 3) > 0 });
  A.drawChar(ctx, 'kage', 1040, fy, 9, { face: -1, t: clock + 1, move: 0, blink: Math.sin(clock * 1.2 + 2) > 0.96 ? 1 : 0 });
  // 手前の草
  ctx.strokeStyle = '#3f8a34'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const px = (i * 97) % W, sw = Math.sin(clock * 1.6 + i) * 6;
    ctx.beginPath(); ctx.moveTo(px, H); ctx.quadraticCurveTo(px + sw * 0.5, H - 34, px + sw, H - 58 - (i % 5) * 6); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#2f4a2a'; ctx.font = `bold 92px ${FONT}`; ctx.fillText('かげから ぬけだした！', W / 2, 300 + Math.sin(clock * 2) * 5);
  ctx.restore();
  ctx.fillStyle = 'rgba(47,74,42,.85)'; ctx.font = `26px ${FONT}`;
  ctx.fillText(`${STAGES[stageIdx].id}  ${STAGES[stageIdx].name}`, W / 2, 360);
  if (timer > 0.6) {
    ctx.fillStyle = 'rgba(47,74,42,.95)'; ctx.font = `bold 28px ${FONT}`;
    ctx.fillText(stageIdx + 1 < STAGES.length ? 'Enter：つぎのステージ　　Esc：メニュー' : 'ぜんぶクリア！ Enter：メニューへ', W / 2, 450);
  }
  A.drawParticles(ctx);
}

// ---------- メインループ ----------
let last = performance.now(), acc = 0;
function frame(now) {
  const rdt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += rdt; clock += rdt;
  while (acc >= 1 / 60) { tick(1 / 60); pressed.clear(); acc -= 1 / 60; }
  if (fade > 0) fade = Math.max(0, fade - rdt * 2.2);
  if (screen === 'play' && world && !paused) {
    for (const a of world.actors) A.updateActor(a, rdt);
    world.switches.forEach((s, i) => {
      if (s.pressed && !prevPressed[i]) A.burst(s.x, s.y - 8, 14, { speed: 110, up: -60, g: 260, life: 0.7, size: 2.2, colors: ['#7be3a0', '#fff', '#b9ffd0'], type: 'spark' });
      prevPressed[i] = s.pressed;
    });
    if (world.won && Math.random() < 0.6) A.burst(world.def.exit.x + world.def.exit.w / 2, world.def.exit.y + 30, 2, { speed: 140, up: -60, g: 120, life: 1, size: 3, color: '#fff3b0', type: 'spark' });
  }
  A.updateParticles(rdt);
  ctx.clearRect(0, 0, W, H);
  if (screen === 'title') drawTitle();
  else if (screen === 'clear') drawClear();
  else drawPlay();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 検証用
window.__kg = { get world() { return world; }, get paused() { return paused; }, get screen() { return screen; }, startStage, K, STAGES };
})();
