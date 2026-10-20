'use strict';
// ===== 描画 / UI（絵そのものは art.js） =====
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const ui = { rects: [], cards: [], sel: 0, tick: 0, diff: 1, metaSel: 0, msg: '' };
const RAR_COL = ['#9ab', '#5cf', '#fc4'], RAR_NAME = ['', 'RARE', 'EPIC'];
const FONT = '"Yu Gothic","Meiryo",sans-serif';

function T(s, x, y, sz, col, al, wt) {
  ctx.font = `${wt || ''} ${sz || 16}px ${FONT}`; ctx.fillStyle = col || '#fff';
  ctx.textAlign = al || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
}
function TG(s, x, y, sz, col, glow, al) {   // 光る文字
  ctx.save(); ctx.shadowColor = glow || col; ctx.shadowBlur = 14; T(s, x, y, sz, col, al || 'center', 'bold'); ctx.restore();
}
function wrapJ(s, n) { const out = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out; }
function poly(x, y, r, n, rot) { ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + 6.283 * i / n; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
function button(x, y, w, h, label, fn, o) {
  o = o || {};
  const hov = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h && !o.dis;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.dis ? '#20222e' : hov ? '#34468a' : '#223066'); g.addColorStop(1, o.dis ? '#15161f' : hov ? '#1e2a5c' : '#121a3e');
  ctx.fillStyle = g; ctx.strokeStyle = o.col || (o.dis ? '#444' : '#6a8cff'); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill(); ctx.stroke();
  if (!o.dis) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w - 4, h / 2 - 2, 7); ctx.fill(); }
  T(label, x + w / 2, y + h / 2 + 5, o.size || 15, o.dis ? '#667' : '#fff', 'center');
  if (!o.dis) ui.rects.push({ x, y, w, h, fn });
}
function panel(x, y, w, h, col) {
  ctx.fillStyle = 'rgba(10,14,36,0.72)'; ctx.strokeStyle = col || 'rgba(120,150,255,0.45)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
}
const VIG = (() => {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const r = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,10,0.55)');
  g.fillStyle = r; g.fillRect(0, 0, W, H); return c;
})();

// ===== ゲーム画面 =====
function drawGem(g) {
  const tier = g.tier, r = tier === 'big' ? 7 : tier === 'mid' ? 5 : 3.6, col = tier === 'big' ? '#f66' : tier === 'mid' ? '#5f8' : '#5cf';
  const h = halo(col, 14); ctx.drawImage(h, g.x - 14, g.y - 14);
  const gr = ctx.createLinearGradient(g.x - r, g.y - r, g.x + r, g.y + r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, col); gr.addColorStop(1, darken(col, 0.4));
  ctx.fillStyle = gr; poly(g.x, g.y, r * 1.25, 4, Math.PI / 4); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.9; ctx.stroke();
}

function drawGame() {
  drawBG(run ? run.stage - 1 : 0);
  ctx.save();
  if (shake > 0) ctx.translate(vrnd(-shake, shake) * 0.5, vrnd(-shake, shake) * 0.5);
  for (const g of GEMS) if (g.alive) drawGem(g);
  // 敵の予告レーザー
  for (const l of EL) {
    const x2 = l.x + Math.cos(l.a) * 1200, y2 = l.y + Math.sin(l.a) * 1200, on = l.t >= l.warn;
    if (!on) { ctx.strokeStyle = `rgba(255,90,90,${0.3 + 0.3 * Math.abs(Math.sin(l.t * 0.4))})`; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]); }
    else { ctx.strokeStyle = 'rgba(255,60,60,0.55)'; ctx.lineWidth = 20; }
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    if (on) { ctx.strokeStyle = '#ffd0d0'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); }
  }
  for (const e of EN) drawEnemy(e);
  // 自機レーザー / 落雷
  ctx.globalCompositeOperation = 'lighter';
  for (const l of LASERS) {
    const a = Math.min(1, (l.dur - l.t) / 8), x = P.x + l.off;
    const gr = ctx.createLinearGradient(x - l.w, 0, x + l.w, 0); gr.addColorStop(0, 'rgba(60,200,255,0)'); gr.addColorStop(0.5, `rgba(120,255,240,${0.55 * a})`); gr.addColorStop(1, 'rgba(60,200,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - l.w, 0, l.w * 2, P.y);
    ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`; ctx.fillRect(x - l.w / 4, 0, l.w / 2, P.y);
  }
  for (const s of STRIKES) {
    const k = s.t / 14, h = halo('#fe6', 64); ctx.globalAlpha = k; ctx.drawImage(h, s.x - s.r * 1.4, s.y - s.r * 1.4, s.r * 2.8, s.r * 2.8);
    ctx.globalAlpha = 1; ctx.fillStyle = `rgba(255,250,200,${k})`; ctx.fillRect(s.x - 3, 0, 6, s.y);
  }
  // 自弾
  for (const b of PB) {
    if (!b.alive) continue;
    const h = halo(b.col, 10); ctx.drawImage(h, b.x - 10, b.y - 10);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // オービット
  for (const w of run.weapons) if (w.id === 'orbit' && w.orbs) for (const o of w.orbs) {
    const h = halo(w.evo ? '#fc6' : '#6cf', 26); ctx.drawImage(h, o.x - 26, o.y - 26);
    const g = ctx.createRadialGradient(o.x - 3, o.y - 3, 1, o.x, o.y, o.r); g.addColorStop(0, '#fff'); g.addColorStop(1, w.evo ? '#fc6' : '#6cf');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  drawPlayer();
  // 敵弾（米粒型は進行方向へ回転）
  const base = ctx.getTransform();
  for (const b of EB) {
    if (!b.alive) continue;
    const s = b.sp;
    if (b.type === 'rice') { const c = Math.cos(b.a), sn = Math.sin(b.a); ctx.setTransform(c, sn, -sn, c, b.x + base.e, b.y + base.f); ctx.drawImage(s, -s.width / 2, -s.height / 2); }
    else { ctx.setTransform(1, 0, 0, 1, base.e, base.f); ctx.drawImage(s, b.x - s.width / 2, b.y - s.height / 2); }
  }
  ctx.setTransform(base);
  // パーティクル / 爆発
  ctx.globalCompositeOperation = 'lighter';
  for (const p of PT) { ctx.globalAlpha = p.l / p.ml; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawFX();
  // ボム演出
  if (run.bombFx > 0) {
    const k = 1 - run.bombFx / 40;
    ctx.strokeStyle = `rgba(160,220,255,${1 - k})`; ctx.lineWidth = 12 * (1 - k) + 2; ctx.beginPath(); ctx.arc(P.x, P.y, 20 + k * 270, 0, 7); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 10 + k * 230, 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(200,230,255,${0.28 * (1 - k)})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  ctx.drawImage(VIG, 0, 0);
  if (P.inv > 0 && run.hp > 0 && P.inv > D.iframes - 12) { ctx.fillStyle = `rgba(255,40,40,${(P.inv - (D.iframes - 12)) / 12 * 0.28})`; ctx.fillRect(0, 0, W, H); }
  drawHUD();
}

function miniIcon(id, x, y, rar, evo, lv) {
  ctx.save(); ctx.translate(x, y); ctx.scale(0.3, 0.3); drawIcon((PASSIVES[id] && PASSIVES[id].icon) || id, 0, 0, rar, evo); ctx.restore();
  T(String(lv), x + 15, y + 12, 11, '#fff', 'right', 'bold');
}
function drawHUD() {
  const need = needExp(run.level), th = BG_THEMES[run.stage - 1];
  const tg = ctx.createLinearGradient(0, 0, 0, 96); tg.addColorStop(0, 'rgba(2,4,16,0.75)'); tg.addColorStop(1, 'rgba(2,4,16,0)');
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 96);
  // EXP バー
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 10);
  const xg = ctx.createLinearGradient(0, 0, W, 0); xg.addColorStop(0, '#3cf'); xg.addColorStop(1, '#a6f');
  ctx.fillStyle = xg; ctx.fillRect(0, 0, W * Math.min(1, run.exp / need), 10);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, W * Math.min(1, run.exp / need), 4);
  // Lv バッジ
  ctx.fillStyle = '#16204e'; ctx.strokeStyle = '#8cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(24, 36, 16, 0, 7); ctx.fill(); ctx.stroke();
  T('Lv', 24, 31, 9, '#9cf', 'center'); T(String(run.level), 24, 45, 14, '#fff', 'center', 'bold');
  // HP / ボム
  for (let i = 0; i < run.maxhp; i++) { ctx.globalAlpha = i < run.hp ? 1 : 0.28; heart(56 + i * 19, 28, 7, i < run.hp ? '#f45' : '#667'); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < run.bombs; i++) { const bx = 52 + i * 15, by = 50; ctx.fillStyle = '#223'; ctx.strokeStyle = '#8df'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by, 5, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fd6'; ctx.fillRect(bx + 2, by - 9, 2, 4); }
  for (let i = 0; i < run.shield; i++) { const sx = 196 + i * 18; ctx.strokeStyle = '#8cf'; ctx.fillStyle = 'rgba(140,200,255,0.25)'; ctx.lineWidth = 1.6; ln([[sx, 41], [sx + 7, 44], [sx + 7, 52], [sx, 58], [sx - 7, 52], [sx - 7, 44]], true); ctx.fill(); ctx.stroke(); }
  // 右上
  const sec = Math.max(0, Math.round(STAGE_SEC / 4) - Math.floor(run.t / 60));
  T(`${th.name}`, W - 10, 26, 13, '#fff', 'right', 'bold');
  T(`STAGE ${run.stage}  WAVE ${run.wave}/5  ${D.name}`, W - 10, 44, 12, D.col, 'right', 'bold');
  const sTxt = run.state === 'road' ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : run.state === 'mid' ? '中ボス戦' : run.state === 'wavedone' ? 'CLEAR' : 'BOSS';
  T(sTxt, W - 10, 62, 14, '#cde', 'right', 'bold');
  T(`コイン ${run.gold}  CORE ${Math.floor(run.core)}${run.curse ? '  呪×' + run.curse : ''}`, W - 10, 80, 11.5, '#fd8', 'right');
  if (dbg.inv) T('DEBUG: 無敵', 10, 74, 11, '#f8f');
  // ボスHP
  const b = EN.find(e => e.boss);
  if (b) {
    const x = 50, w = W - 100, n = b.def.phases.length, y = 96;
    T(`${b.def.name}`, W / 2, y - 4, 14, '#fff', 'center', 'bold');
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(x, y, w, 11, 5); ctx.fill(); ctx.stroke();
    const bg = ctx.createLinearGradient(x, 0, x + w, 0); bg.addColorStop(0, lighten(b.col, 0.2)); bg.addColorStop(1, b.col);
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, 11, 5); ctx.clip(); ctx.fillStyle = bg; ctx.fillRect(x, y, w * Math.max(0, b.hp) / b.maxhp, 11); ctx.restore();
    ctx.fillStyle = '#fff'; for (let i = 1; i < n; i++) ctx.fillRect(x + w * i / n - 1, y - 2, 2, 15);
    T(`PHASE ${b.phase + 1}/${n}`, x + w, y + 25, 11, '#cde', 'right');
  }
  // 武器 / パッシブ（アイコン）
  panel(4, H - 46, W - 8, 42);
  run.weapons.forEach((w, i) => miniIcon(w.id, 28 + i * 40, H - 25, 0, w.evo, w.lv));
  Object.keys(run.passives).forEach((k, i) => miniIcon(k, W - 28 - i * 40, H - 25, 0, !!run.pevo[k], run.passives[k]));
  // バナー
  if (run.banner) {
    const bn = run.banner, a = Math.max(0, Math.min(1, bn.t / 20, (bn.max - bn.t) / 15 + 0.2));
    ctx.globalAlpha = a; const gh = ctx.createLinearGradient(0, 0, W, 0); gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(0.5, 'rgba(0,0,0,0.6)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gh; ctx.fillRect(0, 296, W, 56); TG(bn.text, W / 2, 335, 30, bn.col); ctx.globalAlpha = 1;
  }
  if (mouse.touch) button(W - 70, H - 126, 58, 58, 'ボム', useBomb, { size: 13 });
}

// ===== カード =====
function cardRect(i, n) { const w = 140, g = 12, x0 = (W - (n * w + (n - 1) * g)) / 2; return { x: x0 + i * (w + g), y: 140, w, h: 330 }; }
function cardBox(r, col, rar, hov) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, hov ? '#2a3870' : '#1a2248'); g.addColorStop(1, hov ? '#18204a' : '#0e1430');
  ctx.fillStyle = g; ctx.strokeStyle = col; ctx.lineWidth = rar ? 3 : 1.5;
  if (rar) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14; }
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.stroke();
  if (rar) ctx.restore();
}
function drawCard(c, r, idx, price) {
  const info = cardInfo(c), col = RAR_COL[c.rar || 0], cx = r.x + r.w / 2, isEvo = c.k === 'evo' || c.k === 'pevo';
  const hov = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
  cardBox(r, col, c.rar, hov);
  T(String(idx + 1), r.x + 10, r.y + 22, 14, '#889');
  if (RAR_NAME[c.rar]) T(RAR_NAME[c.rar], r.x + r.w - 10, r.y + 22, 12, col, 'right', 'bold');
  const isW = c.k === 'wnew' || c.k === 'wlv' || c.k === 'evo';
  T(isW ? '武器' : c.k === 'heal' ? '' : 'パッシブ', cx, r.y + 22, 11, isW ? '#9cf' : '#9d9', 'center');
  wrapJ(info.name, 8).forEach((s, i) => T(s, cx, r.y + 50 + i * 19, 16, '#fff', 'center', 'bold'));
  const iconId = (PASSIVES[c.id] && PASSIVES[c.id].icon) || c.id;
  drawIcon(c.k === 'heal' ? 'heal' : iconId, cx, r.y + 135, c.rar || 0, isEvo);
  T(info.sub, cx, r.y + 206, 15, isEvo ? '#fc4' : '#fd8', 'center', 'bold');
  wrapJ(info.desc, 10).slice(0, 2).forEach((s, i) => T(s, cx, r.y + 226 + i * 16, 12, '#bcd', 'center'));
  evoLines(c).forEach((l, i) => T(l.t, cx, r.y + 266 + i * 14, i === 0 ? 11.5 : 10.5, l.col, 'center', i === 0 ? 'bold' : ''));
  if (price !== undefined) T(price + ' コイン', cx, r.y + r.h - 8, 14, run.gold >= price ? '#fd8' : '#f77', 'center', 'bold');
  ui.rects.push({ x: r.x, y: r.y, w: r.w, h: r.h, fn: () => pickCard(idx) });
}
function dimScreen() { ctx.fillStyle = 'rgba(0,0,12,0.74)'; ctx.fillRect(0, 0, W, H); }

function drawCardScene(title, sub) {
  drawGame(); dimScreen();
  TG(title, W / 2, 84, 30, '#fd5');
  T(sub, W / 2, 114, 14, '#cde', 'center');
  ui.cards.forEach((c, i) => drawCard(c, cardRect(i, ui.cards.length), i));
  if (scene === 'levelup') {
    T(`R: リロール(残${run.rerolls})   S: スキップして小回復(残${run.skips})`, W / 2, 502, 13, '#cde', 'center');
    button(W / 2 - 150, 520, 140, 40, 'リロール [R]', doReroll, { dis: run.rerolls <= 0, size: 13 });
    button(W / 2 + 10, 520, 140, 40, 'スキップ [S]', doSkip, { dis: run.skips <= 0, size: 13 });
  } else {
    const taken = run.curseTaken;
    button(W / 2 - 190, 498, 380, 44, taken ? '呪いを受けた（報酬を2つ選べる）' : '[4] 呪いを受け入れて報酬を2つ選ぶ', acceptCurse, { dis: taken, col: '#c6f', size: 14 });
    T(`現在の呪い ${run.curse}（弾速+5% / 経験値+10% / コア+15% ずつ）`, W / 2, 566, 12, '#bbd', 'center');
    if (run.picks > 1) T('あと ' + run.picks + ' つ選べます', W / 2, 588, 14, '#fd5', 'center');
  }
}

// ===== ルート / ショップ / 休憩 / イベント =====
const NODE_INFO = {
  normal: { name: '通常ステージ', desc: '標準の敵ウェーブ', col: '#6cf' },
  elite:  { name: 'エリートステージ', desc: 'エリート多数・弾幕が濃い。経験値1.5倍＋レア強化確定', col: '#f6c' },
  shop:   { name: 'ショップ', desc: 'ゴールドで強化・回復を購入', col: '#fd5' },
  rest:   { name: '休憩', desc: 'HP回復 or 武器Lvアップ', col: '#6f8' },
  event:  { name: 'イベント', desc: 'ランダムな取引。得るものと失うものがある', col: '#c8f' },
};
function drawRoute() {
  drawGame(); dimScreen();
  TG(`WAVE ${run.wave} CLEAR`, W / 2, 84, 30, '#6f8');
  T('次に進むルートを選んでください', W / 2, 114, 14, '#cde', 'center');
  const n = ui.nodes.length;
  ui.nodes.forEach((k, i) => {
    const r = cardRect(i, n), info = NODE_INFO[k];
    const hov = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
    cardBox(r, info.col, 0, hov);
    T(String(i + 1), r.x + 10, r.y + 22, 14, '#889');
    wrapJ(info.name, 7).forEach((s, j) => T(s, r.x + r.w / 2, r.y + 52 + j * 22, 17, info.col, 'center', 'bold'));
    drawIcon('node_' + k, r.x + r.w / 2, r.y + 140, 0, false);
    wrapJ(info.desc, 9).slice(0, 4).forEach((s, j) => T(s, r.x + r.w / 2, r.y + 214 + j * 19, 13, '#bcd', 'center'));
    ui.rects.push({ x: r.x, y: r.y, w: r.w, h: r.h, fn: () => chooseNode(k) });
  });
}
function drawShop() {
  drawGame(); dimScreen();
  TG('ショップ', W / 2, 78, 30, '#fd5');
  T(`所持コイン ${run.gold}`, W / 2, 108, 16, '#fd8', 'center');
  ui.shop.cards.forEach((c, i) => { if (c.sold) return; drawCard(c, cardRect(i, 3), i, c.price); });
  button(W / 2 - 190, 486, 185, 40, `HP+1 回復 [4]  25コイン`, () => buyShop('heal'), { dis: run.gold < 25 || run.hp >= run.maxhp, size: 13 });
  button(W / 2 + 5, 486, 185, 40, `ボム+1 [5]  40コイン`, () => buyShop('bomb'), { dis: run.gold < 40 || run.bombs >= 8, size: 13 });
  button(W / 2 - 100, 544, 200, 44, '出発する [Enter]', leaveNode, { col: '#6f8' });
}
function drawRest() {
  drawGame(); dimScreen();
  TG('休憩', W / 2, 100, 30, '#6f8');
  T('焚き火のそばで一息つく。', W / 2, 135, 14, '#cde', 'center');
  drawIcon('node_rest', W / 2, 220, 0, false);
  button(W / 2 - 170, 290, 340, 60, '[1] HPを2回復', () => doRest(0), { size: 17 });
  button(W / 2 - 170, 370, 340, 60, '[2] 武器またはパッシブを1つLvアップ(ランダム)', () => doRest(1), { size: 14 });
}
function drawEvent() {
  drawGame(); dimScreen();
  const ev = ui.event;
  TG(ev.title, W / 2, 96, 30, '#c8f');
  drawIcon('node_event', W / 2, 170, 0, false);
  wrapJ(ev.text, 24).forEach((s, i) => T(s, W / 2, 245 + i * 22, 14, '#cde', 'center'));
  button(W / 2 - 190, 320, 380, 60, '[1] ' + ev.a.label, () => doEvent('a'), { size: 14 });
  button(W / 2 - 190, 400, 380, 60, '[2] ' + ev.b.label, () => doEvent('b'), { size: 14 });
}

// ===== タイトル / メタ / 結果 =====
function drawLogo(oy) {
  const t = ui.tick; ctx.save(); ctx.translate(0, oy || 0);
  // ロゴの背後に回る弾幕の輪
  for (let ring = 0; ring < 3; ring++) {
    const n = 28 + ring * 8, rad = 120 + ring * 44 + Math.sin(t * 0.02 + ring) * 6, col = ['#6cf', '#f7a', '#fd6'][ring], sp = sprite(ring === 1 ? 'orb' : 'rice', col);
    for (let i = 0; i < n; i++) {
      const a = t * 0.004 * (ring % 2 ? -1 : 1) + i * 6.283 / n, x = W / 2 + Math.cos(a) * rad * 1.15, y = 118 + Math.sin(a) * rad * 0.42;
      ctx.globalAlpha = 0.55; ctx.drawImage(sp, x - sp.width / 2, y - sp.height / 2); ctx.globalAlpha = 1;
    }
  }
  const lg = ctx.createLinearGradient(0, 90, 0, 150); lg.addColorStop(0, '#fff'); lg.addColorStop(1, '#8cf');
  ctx.save(); ctx.shadowColor = '#4af'; ctx.shadowBlur = 22; T('弾幕ローグ', W / 2, 132, 52, lg, 'center', 'bold'); ctx.restore();
  T('BULLET HELL ROGUELIKE  (試作版)', W / 2, 162, 13, '#8cf', 'center');
  ctx.restore();
}
// ===== タイトル（入口だけ。ここからは2つのメニューに分かれる）=====
function drawTitle() {
  drawBG(0); drawLogo(0);
  T(`ゴールド ${save.gold}`, W - 12, 24, 15, '#fd5', 'right', 'bold');
  T(`コア ${save.core}`, W - 12, 43, 13, '#fd8', 'right');
  const ship = SHIPS.find(s => s.id === save.ship) || SHIPS[0];
  drawShipAt(ship.id, W / 2, 566, 2.2, ui.tick);
  button(80, 300, 320, 76, 'ゲーム開始', () => { scene = 'play'; ui.msg = ''; }, { col: '#6f8', size: 26 });
  T('ステージと難易度を選んで出撃', W / 2, 398, 12, '#9ab', 'center');
  button(80, 420, 320, 56, '強化・ガチャ・機体', () => { scene = 'hub'; ui.msg = ''; }, { col: '#fd8', size: 19 });
  T('ゴールドとコアで、能力や機体を手に入れる', W / 2, 496, 12, '#9ab', 'center');
  button(10, 10, 100, 28, save.muted ? '♪ BGM OFF' : '♪ BGM ON', toggleMute, { size: 12, col: save.muted ? '#667' : '#8cf' });
  if (Music.failed) T('BGMを読み込めません（サーバー経由で開いてください）', W / 2, 622, 12, '#f88', 'center');
  else if (!Music.started) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(ui.tick * 0.08); T('♪ クリック・タップ・キーでBGMスタート', W / 2, 622, 13, '#fd8', 'center', 'bold'); ctx.globalAlpha = 1; }
  else if (!Music.ready) T(`BGM 読み込み中… ${Math.round(Music.progress * 100)}%`, W / 2, 622, 12, '#9ab', 'center');
  T('Enter: ゲーム開始   E: 強化メニュー   N: BGM切替', W / 2, 646, 12, '#789', 'center');
  if (debugOn()) { button(10, 44, 100, 26, 'DEBUG', () => { scene = 'debug'; ui.msg = ''; }, { size: 12, col: '#f8f' }); T('F1無敵 F2ボス戦 F3レベルUP（プレイ中）', W / 2, 668, 11, '#a6a', 'center'); }
  T('マウス移動/WASD:移動  Shift:低速  X・右クリック:ボム  P:一時停止', W / 2, 666, 11, '#678', 'center');
}

// ===== ゲーム開始メニュー（ステージ選択 + 難易度 + 機体）=====
function drawStageCard(S, i, x, y, w, h) {
  const th = BG_THEMES[S.id - 1], open = stageOpen(S.id), best = save.stages[S.id], sel = ui.stageSel === i;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  blob(x + w - 30, y + 20, 90, th.blobs[0], 0.45); blob(x + 40, y + h, 80, th.blobs[1], 0.35);
  ctx.fillStyle = 'rgba(0,0,10,0.35)'; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = sel ? '#fd5' : open ? 'rgba(150,180,255,0.5)' : '#334'; ctx.lineWidth = sel ? 3 : 1.2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.stroke();
  ctx.fillStyle = open ? 'rgba(10,16,48,0.9)' : '#1a1c28'; ctx.strokeStyle = open ? '#8cf' : '#445'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + 26, y + h / 2, 17, 0, 7); ctx.fill(); ctx.stroke();
  T(String(S.id), x + 26, y + h / 2 + 6, 17, open ? '#fff' : '#667', 'center', 'bold');
  T(S.name, x + 52, y + 28, 15, open ? '#fff' : '#778', 'left', 'bold');
  T('BOSS ' + BOSSES[S.id - 1].name, x + 52, y + 46, 11, open ? '#cde' : '#667');
  T('危険度', x + 52, y + 66, 10, open ? '#9ab' : '#556');
  for (let k = 0; k < 5; k++) { ctx.fillStyle = k < Math.ceil(S.id / 3) ? (open ? '#f86' : '#644') : 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 86 + k * 11, y + 58, 8, 8); }
  if (!open) T('🔒', x + w - 12, y + h - 10, 14, '#889', 'right');
  else if (best) T(`CLEAR ${DIFFICULTY[best - 1].name}`, x + w - 8, y + h - 10, 11, DIFFICULTY[best - 1].col, 'right', 'bold');
  ui.rects.push({ x, y, w, h, fn: () => { if (ui.stageSel === i) startGame(); else { ui.stageSel = i; ui.msg = ''; } } });
}
function drawPlay() {
  drawBG(ui.stageSel);
  TG('ステージ選択', W / 2, 44, 26, '#8cf');
  button(10, 12, 64, 30, '◀ 戻る', () => { scene = 'title'; }, { size: 12 });
  const d = DIFFICULTY[ui.diff], dl = ui.diff >= save.diffUnlocked;
  button(24, 56, 44, 40, '◀', () => moveDiff(-1), { size: 16 });
  button(W - 68, 56, 44, 40, '▶', () => moveDiff(1), { size: 16 });
  TG(`難易度  ${d.id} ${d.name}`, W / 2, 82, 20, dl ? '#667' : d.col);
  T(dl ? `🔒 ${DIFFICULTY[ui.diff - 1].name} をクリアで解放` : `${d.who} ・ 弾幕密度×${d.dens} 速度×${d.speed} 隙間${d.gap}px ・ 初期HP${d.hp}`, W / 2, 106, 11.5, '#cde', 'center');
  const pages = Math.ceil(STAGES.length / 10), page = Math.floor(ui.stageSel / 10);
  STAGES.forEach((S, i) => { if (Math.floor(i / 10) === page) drawStageCard(S, i, 18 + (i % 2) * 232, 118 + Math.floor((i % 10) / 2) * 92, 212, 84); });
  button(150, 584, 40, 26, '◀', () => { ui.stageSel = ((page + pages - 1) % pages) * 10; }, { size: 12 });
  button(290, 584, 40, 26, '▶', () => { ui.stageSel = ((page + 1) % pages) * 10; }, { size: 12 });
  T(`ページ ${page + 1}/${pages}`, W / 2, 602, 12, '#cde', 'center');
  const ship = SHIPS.find(s => s.id === save.ship) || SHIPS[0], S = STAGES[ui.stageSel], ok = !dl && stageOpen(S.id);
  const owned = SHIPS.filter(s => save.ships.includes(s.id));
  drawShipAt(ship.id, 78, 650, 1.5, ui.tick); T(ship.name, 78, 686, 11, '#cde', 'center');
  if (owned.length > 1) { button(14, 640, 26, 28, '◀', () => cycleShip(-1), { size: 11 }); button(116, 640, 26, 28, '▶', () => cycleShip(1), { size: 11 }); }
  button(150, 628, 316, 56, `「${S.name}」へ出撃`, startGame, { dis: !ok, col: '#6f8', size: 17 });
  T('5ウェーブ構成（3=中ボス / 5=ボス）', 308, 700, 11, '#9ab', 'center');
  if (ui.msg) T(ui.msg, W / 2, 618, 12.5, '#f88', 'center');
}

// ===== 強化メニュー =====
function drawHub() {
  drawBG(2);
  TG('強化・ガチャ・機体', W / 2, 54, 26, '#fd8');
  button(10, 12, 64, 30, '◀ 戻る', () => { scene = 'title'; }, { size: 12 });
  T(`ゴールド ${save.gold}`, W / 2 - 70, 92, 16, '#fd5', 'center', 'bold'); T(`コア ${save.core}`, W / 2 + 80, 92, 16, '#fd8', 'center', 'bold');
  const items = [
    { y: 124, name: '永続強化', sub: 'コアで 初期攻撃力・ボム・回収範囲・リロール回数、武器の解放', key: '1', col: '#fd8', fn: () => { scene = 'meta'; }, icon: 'atk' },
    { y: 262, name: 'ガチャ', sub: `ゴールドで能力を引く（所持 ${Object.keys(save.abilities).length}/${ABILITIES.length} 種）`, key: '2', col: '#fc4', fn: () => { scene = 'gacha'; ui.gacha = { res: [], t: 0, msg: '', phase: 'idle' }; }, icon: 'coin' },
    { y: 400, name: '機体格納庫', sub: `ゴールドで機体を購入・変更（所持 ${save.ships.length}/${SHIPS.length} 機）`, key: '3', col: '#8cf', fn: openHangar, ship: true },
  ];
  items.forEach(it => {
    const hov = mouse.x >= 40 && mouse.x <= W - 40 && mouse.y >= it.y && mouse.y <= it.y + 120;
    ctx.fillStyle = hov ? 'rgba(40,56,110,0.92)' : 'rgba(16,22,52,0.88)'; ctx.strokeStyle = it.col; ctx.lineWidth = hov ? 3 : 1.6;
    ctx.beginPath(); ctx.roundRect(40, it.y, W - 80, 120, 12); ctx.fill(); ctx.stroke();
    if (it.ship) drawShipAt(save.ship, 110, it.y + 62, 1.9, ui.tick);
    else { ctx.save(); ctx.translate(110, it.y + 60); ctx.scale(0.85, 0.85); drawIcon(it.icon, 0, 0, 0, false); ctx.restore(); }
    T(`[${it.key}] ${it.name}`, 190, it.y + 42, 20, it.col, 'left', 'bold');
    wrapJ(it.sub, 19).forEach((s, i) => T(s, 190, it.y + 68 + i * 18, 12, '#bcd'));
    ui.rects.push({ x: 40, y: it.y, w: W - 80, h: 120, fn: it.fn });
  });
  button(W / 2 - 90, 560, 180, 46, '戻る [Esc]', () => { scene = 'title'; }, { size: 15 });
}

// ===== ガチャ（演出つき）=====
const GCOL = ['#9cf', '#5cf', '#c8f', '#fc4'];
function drawGachaAnim(g) {
  const t = ui.tick, cx = W / 2, cy = 300;
  ctx.fillStyle = '#02020c'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (g.phase === 'charge') {
    const k = g.t / 120, col = g.t < 55 ? '#cfe' : GCOL[g.maxR];
    if (g.maxR >= 2 && g.t > 70) ctx.translate(vrnd(-3, 3), vrnd(-3, 3));
    // 収束する光の粒
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 30; i++) {
      const a = i * 0.209 + g.t * 0.015, ph = (g.t * 0.018 + i * 0.37) % 1, d = (1 - ph) * 280;
      const h = halo(col, 10); ctx.globalAlpha = ph; ctx.drawImage(h, cx + Math.cos(a) * d - 10, cy + Math.sin(a) * d - 10);
    }
    ctx.globalAlpha = 1;
    // 回る光条
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(g.t * 0.03); ctx.fillStyle = rgba(col, 0.08 + k * 0.14);
    for (let i = 0; i < 8; i++) { ctx.rotate(0.785); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, -14 - k * 20); ctx.lineTo(300, 14 + k * 20); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    const r = 16 + k * k * 64 + Math.sin(g.t * 0.5) * 3, hh = halo(col, 120); ctx.globalAlpha = 0.4 + k * 0.6; ctx.drawImage(hh, cx - 120 - k * 20, cy - 120 - k * 20, 240 + k * 40, 240 + k * 40); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const og = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); og.addColorStop(0, '#fff'); og.addColorStop(0.5, col); og.addColorStop(1, darken(col, 0.5));
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = rgba('#fff', 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 6 + Math.sin(g.t * 0.3) * 3, 0, 7); ctx.stroke();
    T('召喚中' + '.'.repeat(1 + Math.floor(g.t / 14) % 3), cx, 560, 18, '#cde', 'center');
  } else if (g.phase === 'burst') {
    const k = g.t / 28, col = GCOL[g.maxR];
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(col, 1 - k); ctx.lineWidth = 16 * (1 - k) + 2; ctx.beginPath(); ctx.arc(cx, cy, 30 + k * 360, 0, 7); ctx.stroke();
    ctx.strokeStyle = rgba('#fff', 1 - k); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 10 + k * 260, 0, 7); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - k * 1.2)})`; ctx.fillRect(0, 0, W, H);
  } else if (g.phase === 'reveal') {
    drawGachaReveal(g, t);
  }
  ctx.restore();
  ui.rects.push({ x: 0, y: 0, w: W, h: H, fn: gachaSkip });
  if (g.phase === 'reveal') { T(`${g.ci + 1} / ${g.res.length}`, W / 2, 640, 14, '#cde', 'center', 'bold'); T('クリック / Enter: 次へ    Esc: スキップ', W / 2, 664, 11.5, '#789', 'center'); }
  else T('クリックでスキップ', W / 2, 664, 11.5, '#789', 'center');
}
function drawGachaReveal(g, t) {
  const r = g.res[g.ci], rc = RARITY[r.r].col, k = Math.min(1, g.ct / 14), sc = 0.3 + 0.7 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * 3.14) * 0.07, cx = W / 2, cy = 320;
  ctx.globalCompositeOperation = 'lighter';
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.008 * (r.r + 1)); ctx.fillStyle = rgba(rc, 0.09 + 0.04 * r.r);
  const n = 10 + r.r * 4; for (let i = 0; i < n; i++) { ctx.rotate(6.283 / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(440, -16 - r.r * 6); ctx.lineTo(440, 16 + r.r * 6); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const hh = halo(rc, 160); ctx.globalAlpha = 0.6 * k; ctx.drawImage(hh, cx - 200, cy - 200, 400, 400); ctx.globalAlpha = 1;
  for (const p of g.gp) { ctx.globalAlpha = p.l / p.ml; ctx.fillStyle = rc; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  ctx.shadowColor = rc; ctx.shadowBlur = 24 + r.r * 8;
  const cg = ctx.createLinearGradient(0, -145, 0, 145); cg.addColorStop(0, '#1a2250'); cg.addColorStop(1, '#0a0e28');
  ctx.fillStyle = cg; ctx.strokeStyle = rc; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-112, -150, 224, 300, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.save(); ctx.shadowColor = rc; ctx.shadowBlur = 12; T(RARITY[r.r].n + (r.r === 3 ? ' ★★★' : r.r === 2 ? ' ★★' : r.r === 1 ? ' ★' : ''), 0, -118, 24, rc, 'center', 'bold'); ctx.restore();
  ctx.save(); ctx.translate(0, -50); ctx.scale(1.6, 1.6); drawIcon(r.a.icon, 0, 0, Math.min(2, r.r), !!r.a.evo); ctx.restore();
  T(r.a.name, 0, 50, 22, '#fff', 'center', 'bold');
  wrapJ(r.a.desc, 14).slice(0, 3).forEach((s, i) => T(s, 0, 80 + i * 18, 13, '#bcd', 'center'));
  T(r.dup ? `最大Lv  → ${r.refund}G に還元` : r.isNew ? 'NEW!' : `Lv ${r.lv - 1} → Lv ${r.lv}`, 0, 138, 16, r.isNew ? '#fd5' : r.dup ? '#9ab' : '#8f8', 'center', 'bold');
  ctx.restore();
}
function drawGacha() {
  const g = ui.gacha;
  if (g.phase === 'charge' || g.phase === 'burst' || g.phase === 'reveal') { drawGachaAnim(g); return; }
  drawBG(6);
  TG('ガチャ', W / 2, 56, 30, '#fc4');
  T(`ゴールド ${save.gold}`, W / 2, 84, 17, '#fd5', 'center', 'bold');
  T(`SSR確定まであと ${50 - save.pity} 回  ・  確率 N60% R28% SR10% SSR2%`, W / 2, 104, 11.5, '#cde', 'center');
  button(24, 116, 210, 44, '1回  100G  [1]', () => doGacha(1), { dis: save.gold < 100, col: '#fc4' });
  button(246, 116, 210, 44, '10連  900G  [2]', () => doGacha(10), { dis: save.gold < 900, col: '#fc4' });
  if (g.msg) T(g.msg, W / 2, 178, 13, '#f88', 'center');
  if (!g.res.length) T('ボタンを押すと召喚が始まります', W / 2, 300, 14, '#789', 'center');
  const x0 = (W - (5 * 88 + 4 * 4)) / 2;
  g.res.forEach((r, i) => {
    const k = Math.min(1, (g.t - i * 6) / 10); if (k <= 0) return;
    const cx = x0 + (i % 5) * 92 + 44, cy = 186 + Math.floor(i / 5) * 118 + 56, rc = RARITY[r.r].col, sc = 0.6 + 0.4 * k;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha = k;
    if (r.r >= 2) { ctx.shadowColor = rc; ctx.shadowBlur = 14; }
    ctx.fillStyle = 'rgba(14,20,50,0.92)'; ctx.strokeStyle = rc; ctx.lineWidth = r.r >= 2 ? 3 : 1.5; ctx.beginPath(); ctx.roundRect(-44, -56, 88, 112, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    T(RARITY[r.r].n, -38, -40, 12, rc, 'left', 'bold');
    ctx.save(); ctx.translate(0, -8); ctx.scale(0.66, 0.66); drawIcon(r.a.icon, 0, 0, Math.min(2, r.r), !!r.a.evo); ctx.restore();
    T(r.a.name.slice(0, 7), 0, 34, 12, '#fff', 'center', 'bold');
    T(r.dup ? `重複 +${r.refund}G` : r.isNew ? 'NEW!' : `Lv ${r.lv}`, 0, 50, 11, r.isNew ? '#fd5' : r.dup ? '#9ab' : '#8f8', 'center', 'bold');
    ctx.restore();
  });
  T(`所持している能力 ${Object.keys(save.abilities).length}/${ABILITIES.length}（重複でLvアップ・最大Lv5）`, W / 2, 436, 12, '#9ab', 'center');
  ABILITIES.forEach((a, i) => {
    const x = 24 + (i % 2) * 226, y = 454 + Math.floor(i / 2) * 17, lv = save.abilities[a.id] || 0;
    ctx.fillStyle = lv ? RARITY[a.rar].col : '#445'; ctx.beginPath(); ctx.arc(x + 4, y - 4, 3, 0, 7); ctx.fill();
    T(a.name, x + 14, y, 11, lv ? '#fff' : '#667');
    T(lv ? `Lv ${lv}` : '—', x + 206, y, 11, lv >= 5 ? '#fd5' : lv ? '#cde' : '#556', 'right', 'bold');
  });
  button(W / 2 - 80, 668, 160, 38, '戻る [Esc]', () => { scene = 'hub'; }, { size: 14 });
}

// ===== 機体格納庫 =====
function drawHangar() {
  drawBG(1);
  const S = SHIPS[ui.hi], owned = save.ships.includes(S.id), eq = save.ship === S.id;
  TG('機体格納庫', W / 2, 54, 28, '#8cf');
  T(`ゴールド ${save.gold}`, W / 2, 82, 16, '#fd5', 'center', 'bold');
  panel(40, 98, W - 80, 196, rgba(S.col, 0.6));
  drawShipAt(S.id, W / 2, 196, 3.4, ui.tick);
  button(50, 170, 46, 48, '◀', () => moveHangar(-1), { size: 20 });
  button(W - 96, 170, 46, 48, '▶', () => moveHangar(1), { size: 20 });
  T(`${ui.hi + 1} / ${SHIPS.length}`, W - 56, 118, 12, '#9ab', 'right');
  if (eq) T('装備中', 56, 118, 12, '#6f8', 'left', 'bold'); else if (owned) T('所持', 56, 118, 12, '#8cf', 'left', 'bold');
  TG(S.name, W / 2, 330, 26, S.col);
  wrapJ(S.perk, 24).forEach((s, i) => T(s, W / 2, 358 + i * 20, 13, '#cde', 'center'));
  const rows = [['初期武器', WEAPONS[S.weapon].name], ['移動速度', `×${S.spd}`], ['攻撃力', `×${S.atk}`], ['最大HP', `${S.hp >= 0 ? '+' : ''}${S.hp}`],
    ['初期ボム', `+${S.bombs}`], ['被弾判定', `×${S.hit}`], ['幸運', `+${S.luck}`], ['回収範囲', `×${S.pick}`]];
  panel(50, 404, W - 100, 116);
  rows.forEach((r, i) => { const x = i % 2 ? 260 : 70, y = 430 + Math.floor(i / 2) * 26; T(r[0], x, y, 13, '#9ab'); T(r[1], x + 150, y, 13, '#fff', 'right', 'bold'); });
  if (eq) button(W / 2 - 110, 536, 220, 46, '装備中', () => {}, { dis: true });
  else if (owned) button(W / 2 - 110, 536, 220, 46, '装備する [Enter]', hangarAct, { col: '#6f8' });
  else button(W / 2 - 110, 536, 220, 46, `購入 ${S.price}G [Enter]`, hangarAct, { dis: save.gold < S.price, col: '#fd5' });
  if (ui.msg) T(ui.msg, W / 2, 600, 13, '#f88', 'center');
  button(W / 2 - 80, 614, 160, 40, '戻る [Esc]', () => { scene = 'hub'; ui.msg = ''; }, { size: 14 });
}
function drawMeta() {
  drawBG(2);
  TG('永続強化', W / 2, 66, 30, '#fd5');
  T(`所持コア ${save.core}`, W / 2, 98, 16, '#fd8', 'center');
  const items = metaItems();
  items.forEach((it, i) => {
    const y = 124 + i * 62, sel = i === ui.metaSel;
    ctx.fillStyle = sel ? 'rgba(40,56,110,0.9)' : 'rgba(16,22,52,0.85)'; ctx.strokeStyle = sel ? '#fd5' : '#456'; ctx.lineWidth = sel ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(24, y, W - 48, 52, 8); ctx.fill(); ctx.stroke();
    T(it.name, 38, y + 22, 16, '#fff', 'left', 'bold');
    T(it.desc, 38, y + 42, 12, '#9ab');
    T(it.status, W - 150, y + 32, 14, it.maxed ? '#6f8' : '#cde', 'right');
    T(it.maxed ? '' : it.cost + ' コア', W - 38, y + 32, 14, save.core >= it.cost ? '#fd8' : '#f77', 'right', 'bold');
    ui.rects.push({ x: 24, y, w: W - 48, h: 52, fn: () => { ui.metaSel = i; buyMeta(); } });
  });
  T('↑↓:選択  Enter:購入  Esc:戻る', W / 2, 580, 13, '#789', 'center');
  button(W / 2 - 80, 600, 160, 44, '戻る [Esc]', () => { scene = 'hub'; });
}
function drawResult(win) {
  drawBG(win ? 2 : 4);
  TG(win ? 'GAME CLEAR!' : 'GAME OVER', W / 2, 150, 42, win ? '#6f8' : '#f66');
  T(`${D.name} ・ STAGE ${run.stage} ${STAGES[run.stage - 1].name} ・ WAVE ${run.wave}/5`, W / 2, 190, 15, D.col, 'center');
  panel(70, 214, W - 140, 250);
  const rows = [['機体', run.ship.name], ['到達レベル', run.level], ['撃破数', run.kills], ['グレイズ', run.graze], ['被弾回数', run.hits], ['呪い', run.curse], ['シード', run.seed], ['ステージ報酬', `+${run.goldEarned - (run.clearBonus || 0)}G`], ['クリアボーナス', `+${run.clearBonus || 0}G`]];
  rows.forEach((r, i) => { T(r[0], 100, 244 + i * 24, 15, '#9ab'); T(String(r[1]), 380, 244 + i * 24, 15, '#fff', 'right', 'bold'); });
  T(`獲得ゴールド  +${run.goldEarned}G`, W / 2, 498, 22, '#fd5', 'center', 'bold');
  T(`獲得コア  +${run.coreGain}`, W / 2, 526, 16, '#fd8', 'center', 'bold');
  T(`所持 ゴールド ${save.gold}  コア ${save.core}`, W / 2, 550, 13, '#cde', 'center');
  if (win && run.unlockedMsg) T(run.unlockedMsg, W / 2, 574, 14, '#6f8', 'center');
  button(W / 2 - 110, 590, 220, 50, 'タイトルへ [Enter]', toTitle, { size: 17 });
}

// ===== デバッグメニュー =====
function drawDebug() {
  drawBG(4);
  TG('デバッグメニュー', W / 2, 52, 26, '#f8f');
  T(`ゴールド ${save.gold}   コア ${save.core}   難易度 ${save.diffUnlocked}/5   ステージ ${save.unlockAll ? '全開放' : '通常'}   無敵 ${dbg.inv ? 'ON' : 'OFF'}`, W / 2, 80, 11.5, '#cde', 'center');
  T(`機体 ${save.ships.length}/${SHIPS.length}   能力 ${Object.keys(save.abilities).length}/${ABILITIES.length}   武器 ${save.weapons.length}/${Object.keys(WEAPONS).length}`, W / 2, 98, 11.5, '#cde', 'center');
  const items = [
    ['ゴールド +10,000', 'gold1', '#fd5'], ['ゴールド +100,000', 'gold2', '#fd5'],
    ['コア +1,000', 'core', '#fd8'], ['ガチャ 次回SSR確定', 'pity', '#fc4'],
    ['難易度 全開放', 'diffs', '#6cf'], [save.unlockAll ? 'ステージ全開放 解除' : 'ステージ 全開放', 'stages', '#6cf'],
    ['全ステージをクリア済みに', 'cleared', '#6cf'], ['機体 全入手', 'ships', '#8cf'],
    ['能力 全てLv5', 'abil', '#8f8'], ['能力 リセット', 'abilReset', '#8f8'],
    ['武器 全解放', 'weapons', '#9cf'], ['永続強化 全MAX', 'meta', '#fd8'],
    ['無敵 ' + (dbg.inv ? 'ON→OFF' : 'OFF→ON'), 'inv', '#f8f'], ['全部入りにする', 'everything', '#6f8'],
  ];
  items.forEach(([label, key, col], i) => button(18 + (i % 2) * 234, 116 + Math.floor(i / 2) * 52, 222, 44, label, () => dbgDo(key), { col, size: 13 }));
  button(W / 2 - 110, 116 + 7 * 52, 220, 44, ui.dbgConfirm ? '本当に削除する？' : 'セーブ初期化', () => dbgDo('reset'), { col: '#f55', size: 13 });
  if (ui.msg) T(ui.msg, W / 2, 566, 14, '#fd5', 'center', 'bold');
  button(W / 2 - 80, 600, 160, 44, '戻る [Esc]', () => { scene = 'title'; ui.msg = ''; ui.dbgConfirm = false; }, { size: 14 });
  T('F9（タイトル）でデバッグのON/OFF。URL に ?debug=1 でも使えます', W / 2, 672, 11, '#a6a', 'center');
}
