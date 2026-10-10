// ソダテバトル: 育成・ショップ・画面遷移
'use strict';

const SAVE_KEY = 'sodate-battle-save-v1';
const META_KEY = 'sodate-battle-meta-v1';
const DEBUG = /[?&]debug/.test(location.search);

let S = null;                       // セーブデータ
let meta = { cleared: false };      // 周回をまたぐ記録
let scr = 'title';
let toast = '';
let sel = null;                     // 対戦前に選んだ相手 { tr, nora }
let result = null;                  // バトル結果
let mapArea = 0;
let selChar = 'leo';
let selMode = 'normal';           // normal=100日 / short=10日（1日30回行動）

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- セーブ ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 無視 */ } }
function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function loadMeta() { try { const j = localStorage.getItem(META_KEY); if (j) meta = Object.assign(meta, JSON.parse(j)); } catch (e) { /* 無視 */ } }
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* 無視 */ } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 無視 */ } }

// ---------- 状態 ----------
function has(id) { return !!S.items[id]; }
function count(id) { return S.items[id] || 0; }
function maxActions() { return S.apd + (has('machine') ? (S.apd > 3 ? 3 : 1) : 0); }
const BATTLE_COST = 3;               // 10日モードでバトルに使う行動回数（100日モードは1日まるごと）
function costF() { return 3 / S.apd; }  // 10日モードは1回あたりのスタミナ消費・休憩回復を 1/10 にして、全体のバランスを同じにする
function trainCost(m) { return Math.max(1, Math.round(m.cost * costF())); }
function canAct() { return S.actions > 0 && (!forced() || S.apd > 3); }
function trainBonus(tid) {
  let b = 0;
  ITEMS.forEach(it => { if (it.kind === 'perm' && has(it.id) && it.train[tid]) b = Math.max(b, it.train[tid]); });
  return b;
}
function newGame(charId) {
  const c = CHARS[charId];
  S = {
    day: 1, tp: 0, charId, stats: Object.assign({}, c.start), stamina: 100, mood: 2,
    maxDay: selMode === 'short' ? 10 : MAX_DAY, apd: selMode === 'short' ? 30 : 3, actions: selMode === 'short' ? 30 : 3,
    learned: [], equipped: [null, null, null, null], items: {}, defeated: {}, areaUnlocked: 1, protein: false,
  };
  learnCheck(true);
  S.equipped = S.learned.slice(0, 4).concat([null, null, null, null]).slice(0, 4);
  toast = c.name + ' との' + S.maxDay + '日間がはじまった！\n' + S.maxDay + '日目にチャンピオン戦が待っている。' + (S.apd > 3 ? '\n（1日に30回、行動できる）' : '');
  save();
}
// 能力が条件に届いた技を覚える
function learnCheck(silent) {
  const got = [];
  SKILLS.forEach(s => {
    if (s.ult || !s.users.includes(S.charId) || S.learned.includes(s.id)) return;
    if (canLearn(s, S.stats)) { S.learned.push(s.id); got.push(s.name); }
  });
  if (!silent && got.length) {
    const free = S.equipped.indexOf(null);
    if (free >= 0) S.equipped[free] = S.learned[S.learned.length - got.length];
  }
  return got;
}
function nextDay() {
  S.day++;
  S.actions = maxActions();
  S.stamina = Math.min(100, S.stamina + 40);
  let m = S.mood + pick([-1, 0, 0, 0, 1]);
  if (m > 2 && Math.random() < 0.3) m--;
  S.mood = clamp(m, 0, 4);
  save();
}
function forced() { return S.day >= S.maxDay; }

// ---------- トレーニング ----------
let batchN = 1;                      // まとめて鍛える回数（10日モードで使う）
// 1回ぶんのトレーニング。結果を返す（画面更新はしない）
function trainOnce(id) {
  const m = TRAINING[id], c = CHARS[S.charId], cost = trainCost(m);
  const tired = S.stamina < cost;
  let mul = (1 + trainBonus(id)) * MOODS[S.mood].mul;
  if (tired) mul *= 0.5;
  const great = !tired && Math.random() < 0.1;
  if (great) mul *= 2;
  let prot = false;
  if (S.protein) { mul *= 2; S.protein = false; prot = true; }
  const want = {};
  want[m.main] = Math.max(1, Math.round(TRAIN_MAIN * mul * c.apt[m.main]));
  want[m.sub] = Math.max(1, Math.round(TRAIN_SUB * mul * c.apt[m.sub]));
  const gain = {};
  for (const k in want) { const before = S.stats[k]; S.stats[k] = Math.min(STAT_CAP, S.stats[k] + want[k]); gain[k] = S.stats[k] - before; }
  S.stamina = Math.max(0, S.stamina - cost);
  S.actions--;
  return { gain, tired, great, prot, learned: learnCheck(false) };
}
function train(id, n) {
  n = Math.min(n || 1, S.actions);
  if (!canAct()) return;
  const m = TRAINING[id], tot = {}, learned = [];
  let done = 0, greats = 0, tireds = 0, prot = false;
  for (let i = 0; i < n && canAct(); i++) {
    const r = trainOnce(id); done++;
    for (const k in r.gain) tot[k] = (tot[k] || 0) + r.gain[k];
    if (r.great) greats++; if (r.tired) tireds++; if (r.prot) prot = true;
    learned.push(...r.learned);
  }
  const lines = Object.keys(tot).map(k => STAT_NAME[k] + ' +' + tot[k]);
  const notes = [];
  if (tireds) notes.push(done > 1 ? 'ばてばて… ' + tireds + '回は効果が半分' : 'ばてばて… 効果が半分になった');
  if (greats) notes.push(done > 1 ? '大成功 ' + greats + '回！' : '大成功！ 上昇量2倍！');
  if (prot) notes.push('プロテインの効果で2倍！');
  toast = m.icon + ' ' + m.name + (done > 1 ? ' ×' + done : '') + '！\n' + lines.join('　') + (notes.length ? '\n' + notes.join('\n') : '') + (learned.length ? '\n✨ 新しい技を覚えた：' + learned.join('、') : '');
  Sound.play(greats ? 'great' : 'train'); if (learned.length) setTimeout(() => Sound.play('learn'), 350);
  save(); render(); Preview.pulse(); gainPops(tot);
}
function gainPops(gain) {
  const ks = Object.keys(gain);
  ks.forEach((k, i) => setTimeout(() => {
    const el = document.createElement('div'); el.className = 'gainpop'; el.textContent = STAT_NAME[k] + ' +' + gain[k]; el.style.color = STAT_COLOR[k];
    el.style.left = (innerWidth / 2 - 60 + i * 30) + 'px'; el.style.top = (innerHeight * 0.35 + i * 34) + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 1100);
  }, i * 150));
}
function rest() {
  if (!canAct()) return;
  S.actions--;
  S.stamina = Math.min(100, S.stamina + Math.round(60 * costF()));
  let t = '😴 ゆっくり休んで、スタミナが回復した。';
  if (Math.random() < 0.4 * costF() && S.mood < 4) { S.mood++; t += '\n調子が上がった！'; }
  toast = t; save(); render();
}

// ---------- バトル ----------
function enemyFor(tr, nora) {
  if (nora) return { name: nora.name, type: nora.type, elem: nora.elem, total: nora.total, area: nora.area, ai: nora.ai };
  return tr;
}
function startBattle(e) {
  const c = CHARS[S.charId];
  const stats = statsFromTotal(e.type, e.total);
  const pdef = { name: c.name, type: c.type, elem: c.elem, color: c.color, stats: Object.assign({}, S.stats), skills: S.equipped.slice(), ult: 'ult_' + S.charId };
  const edef = { name: e.name, type: e.type, elem: e.elem, color: ELEM[e.elem].c, stats, skills: trainerSkills(e.type, stats), ai: e.ai, lvl: e.area / 5, line: e.line, boss: e.boss, rank: rankOf(e.total) };
  Battle.start({ player: pdef, enemy: edef, area: e.area, onEnd: r => battleEnd(r, sel) });
}
function battleEnd(r, s) {
  const tr = s.tr, nora = s.nora;
  Sound.bgm('home'); Sound.play(r.win ? 'win' : 'lose');
  const out = { win: r.win, r, tr, nora, tp: 0, lines: [], hint: '', learned: [], unlocked: '', champion: false };
  if (r.win) {
    let base, first = false;
    if (nora) base = nora.tp;
    else { first = !S.defeated[tr.id]; base = tr.tp * (first ? 1 : 0.3); }
    let bonus = 0;
    if (r.noDamage) { bonus += 0.5; out.lines.push('ノーダメージ勝利！ +50%'); }
    if (r.time <= TIME_HALF && !r.timeUp) { bonus += 0.2; out.lines.push('すばやく勝利！ +20%'); }
    out.tp = Math.round(base * (1 + bonus));
    S.tp += out.tp;
    if (tr) {
      S.defeated[tr.id] = true;
      if (tr.champion) out.champion = true;
      else if (tr.boss && first && S.areaUnlocked === tr.area + 1) {
        S.areaUnlocked = tr.area + 2;
        out.unlocked = AREAS[tr.area + 1].name + ' への道が開いた！';
      }
    }
  } else {
    STATS.forEach(k => { S.stats[k] = Math.min(STAT_CAP, S.stats[k] + 1); });
    out.lines.push('負けたが、経験として全能力 +1');
    const tt = r.takenType;
    const myAtk = CHARS[S.charId].type === 'mage' ? 'MAG' : 'ATK';
    if (r.dealt < 1) out.hint = '攻撃が当たらなかった。距離をよく見て、技を使ってみよう。';
    else if (tt.physical > tt.magic * 1.3) out.hint = '物理ダメージが多かった。「防御力」を鍛えてみよう。';
    else if (tt.magic > tt.physical * 1.3) out.hint = '魔法ダメージが多かった。「精神」を鍛えてみよう。';
    else out.hint = '「体力」を鍛えると粘れるようになる。ガードや回避も使ってみよう。';
    if (r.dealt < 1 || r.hpRate > 0.99) { /* ヒントはそのまま */ }
    if (!r.quit && r.dealt > 0) out.hint += '　もっと強くするなら「' + STAT_NAME[myAtk] + '」も。';
  }
  out.learned = learnCheck(false);
  save();
  result = out; scr = 'result'; render();
}
const TIME_HALF = 45;

// ---------- 操作 ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  Sound.unlock(); if (!['train', 'fight', 'buy'].includes(b.dataset.a)) Sound.play('click');
  act(b.dataset.a, b.dataset.v);
});

function act(a, v) {
  switch (a) {
    case 'new': scr = 'select'; break;
    case 'cont': S = loadSave(); if (S) { S.maxDay = S.maxDay || 100; S.apd = S.apd || 3; batchN = 1; scr = 'home'; toast = ''; } break;
    case 'pickchar': selChar = v; break;
    case 'pickmode': selMode = v; break;
    case 'startgame': newGame(selChar); batchN = 1; scr = 'home'; break;
    case 'title': scr = 'title'; break;
    case 'home': scr = 'home'; toast = ''; break;
    case 'train': train(v, batchN); return;
    case 'batch': batchN = +v; break;
    case 'rest': rest(); return;
    case 'sleep': nextDay(); toast = '🌅 ' + S.day + '日目の朝。' + (forced() ? '\n今日は決戦の日だ！' : ''); break;
    case 'skills': scr = 'skills'; break;
    case 'equip': equip(v); break;
    case 'items': scr = 'items'; break;
    case 'use': useItem(v); break;
    case 'shop': scr = 'shop'; break;
    case 'buy': buy(v); break;
    case 'map': scr = 'map'; mapArea = Math.min(mapArea, S.areaUnlocked - 1); break;
    case 'area': mapArea = +v; break;
    case 'versus': {
      const tr = TRAINER_BY_ID[v];
      sel = { tr, nora: null }; scr = 'versus'; break;
    }
    case 'nora': {
      const pool = TRAINERS.filter(t => t.area < S.areaUnlocked && !t.champion);
      const t = pick(pool);
      const total = Math.round(t.total * 0.85);
      sel = { tr: null, nora: { name: '野良の' + ATK_TYPES[t.type].name.replace('型', ''), type: t.type, elem: pick(['none', 'fire', 'water', 'earth', 'wind']), total, area: t.area, ai: pick(['rush', 'careful', 'counter']), tp: Math.round(20 + total / 60) } };
      scr = 'versus'; break;
    }
    case 'fight': { const e = sel.tr || sel.nora; render(); startBattle(enemyFor(sel.tr, sel.nora)); return; }
    case 'after': afterResult(); return;
    case 'retry': { sel = { tr: result.tr, nora: result.nora }; startBattle(enemyFor(sel.tr, sel.nora)); return; }
    case 'giveup': ending(false); return;
    case 'endtitle': clearSave(); scr = 'title'; break;
    case 'dbg': debug(v); break;
  }
  toastMaybeClear(a);
  render();
}
function toastMaybeClear(a) { if (['skills', 'items', 'shop', 'map', 'title', 'new'].includes(a)) toast = ''; }

function afterResult() {
  if (result.win && result.champion) { ending(true); return; }
  if (!result.win && forced()) { scr = 'home'; render(); return; }
  if (S.apd > 3) {
    S.actions = Math.max(0, S.actions - BATTLE_COST);
    if (S.actions > 0) { toast = '⚔️ 戦いのあと、ひと息ついた。\n' + (result.win ? '勝利で ' + result.tp + ' TP を手に入れた！' : '鍛え直して、また挑もう。'); scr = 'home'; save(); render(); return; }
  }
  nextDay();
  toast = '⚔️ 戦いのあと、日が暮れた。\n' + (result.win ? '勝利で ' + result.tp + ' TP を手に入れた！' : '鍛え直して、また挑もう。') + '\n🌅 ' + S.day + '日目の朝。' + (forced() ? '\n今日は決戦の日だ！' : '');
  scr = 'home'; render();
}
function ending(win) {
  const total = totalOf(S.stats);
  S.end = { win, day: S.day, total, rank: rankOf(total), score: total + (win ? Math.round((S.maxDay - S.day) / S.maxDay * 3000) + 2000 : 0) };
  if (win) {
    meta.cleared = true; saveMeta();
  }
  scr = 'ending'; render();
}

function equip(id) {
  const i = S.equipped.indexOf(id);
  if (i >= 0) S.equipped[i] = null;
  else {
    const free = S.equipped.indexOf(null);
    if (free < 0) { toast = '4つ装備している。どれかを外してからにしよう。'; return; }
    S.equipped[free] = id;
  }
  toast = ''; save();
}
function useItem(id) {
  if (count(id) <= 0) return;
  if (id === 'protein') { if (S.protein) { toast = 'もう効果が出ている。'; return; } S.protein = true; toast = '🥛 次のトレーニングの上昇量が2倍になる！'; }
  else if (id === 'drink') { S.stamina = Math.min(100, S.stamina + 50); toast = '🧃 スタミナが回復した！'; }
  else if (id === 'snack') { if (S.mood >= 4) { toast = '調子はもう絶好調だ。'; return; } S.mood++; toast = '🍰 調子が上がった！'; }
  else if (id === 'scroll') {
    const cand = SKILLS.filter(s => !s.ult && s.users.includes(S.charId) && !S.learned.includes(s.id))
      .sort((a, b) => Object.values(a.learn).reduce((x, y) => x + y, 0) - Object.values(b.learn).reduce((x, y) => x + y, 0));
    if (!cand.length) { toast = '覚えられる技はもうない。'; return; }
    S.learned.push(cand[0].id);
    const free = S.equipped.indexOf(null); if (free >= 0) S.equipped[free] = cand[0].id;
    toast = '📜 「' + cand[0].name + '」を習得した！';
  }
  S.items[id]--; save();
}
function buy(id) {
  const it = ITEMS.find(x => x.id === id);
  if (S.tp < it.price) { toast = 'TPが足りない。'; return; }
  if (it.kind !== 'cons' && has(id)) return;
  S.tp -= it.price;
  S.items[id] = it.kind === 'cons' ? count(id) + 1 : true;
  toast = it.icon + ' ' + it.name + ' を手に入れた！'; Sound.play('buy'); save();
}
function debug(v) {
  if (v === 'tp') S.tp += 1000;
  if (v === 'stat') STATS.forEach(k => { S.stats[k] = Math.min(STAT_CAP, S.stats[k] + 100); });
  if (v === 'area') S.areaUnlocked = 6;
  if (v === 'day') S.day = Math.min(S.maxDay, S.day + Math.max(1, Math.round(S.maxDay / 10)));
  if (v === 'stat2') STATS.forEach(k => { S.stats[k] = Math.min(STAT_CAP, S.stats[k] + 300); });
  learnCheck(false); save();
}

// ---------- 描画 ----------
function render() {
  const ui = $('#ui');
  const f = { title: vTitle, select: vSelect, home: vHome, skills: vSkills, items: vItems, shop: vShop, map: vMap, versus: vVersus, result: vResult, ending: vEnding }[scr];
  ui.innerHTML = f();
  document.querySelectorAll('canvas.radar').forEach(drawRadar);
  Sound.bgm('home');
  const pv = document.getElementById('pv');
  if (pv) { const c = CHARS[S.charId]; Preview.mount(pv, { type: c.type, elem: c.elem, color: c.color }); }
  window.scrollTo(0, 0);
}
const pct = v => Math.min(100, Math.sqrt(v / STAT_CAP) * 100);
function statRows(stats) {
  return STATS.map(k => `<div class="statrow"><span style="color:${STAT_COLOR[k]}">${STAT_NAME[k]}</span><b>${stats[k]}</b><div class="bar"><i style="width:${pct(stats[k])}%;background:${STAT_COLOR[k]}"></i></div></div>`).join('');
}
function drawRadar(cv) {
  const stats = JSON.parse(cv.dataset.stats), dpr = 2, W = 300;
  cv.width = W * dpr; cv.height = W * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cx = W / 2, cy = W / 2, R = W / 2 - 38;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 6; return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r]; };
  g.strokeStyle = '#3b4478'; g.lineWidth = 1;
  for (let l = 1; l <= 4; l++) { g.beginPath(); for (let i = 0; i < 6; i++) { const [x, y] = pt(i, l / 4); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); }
  for (let i = 0; i < 6; i++) { const [x, y] = pt(i, 1); g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); }
  g.beginPath();
  STATS.forEach((k, i) => { const [x, y] = pt(i, pct(stats[k]) / 100); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.closePath(); g.fillStyle = 'rgba(255,207,74,.35)'; g.fill(); g.strokeStyle = '#ffcf4a'; g.lineWidth = 2; g.stroke();
  g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  STATS.forEach((k, i) => { const [x, y] = pt(i, 1.2); g.fillStyle = STAT_COLOR[k]; g.fillText(STAT_NAME[k], x, y); });
}
const toastHtml = () => toast ? `<div class="toast">${toast}</div>` : '';
const elemTag = e => `<span class="tag" style="color:${ELEM[e].css}">${ELEM[e].n}属性</span>`;

function vTitle() {
  const has = !!loadSave();
  return `<div class="title">
    <div class="big">⚔️🔮🛡️</div>
    <h1>ソダテバトル</h1>
    <p class="sub">モンスターを育てて、チャンピオンに挑め！（100日／10日の2モード）<br>鍛える → 戦う → TPで道具を買う → もっと鍛える</p>
    <button class="main" data-a="new">はじめから</button>
    <button data-a="cont" ${has ? '' : 'disabled'}>つづきから</button>
    <p class="sub">PC: 矢印キーで移動 / A 攻撃 / S D W E 技 / Space 回避 / Shift ガード / Q 必殺<br>スマホ: 画面のスティックとボタン</p>
  </div>`;
}
function vSelect() {
  const cards = Object.keys(CHARS).map(id => {
    const c = CHARS[id], t = ATK_TYPES[c.type], locked = !c.starter && !meta.cleared;
    return `<div class="card" style="${selChar === id ? 'border-color:var(--accent)' : ''};${locked ? 'opacity:.45' : ''}">
      <h3>${t.icon} ${c.name}</h3>
      <div style="margin:4px 0"><span class="tag">${t.name}</span>${elemTag(c.elem)}</div>
      <p class="sub">${c.desc}</p>
      <div class="sub">通常攻撃：${t.desc}</div>
      ${statRows(c.start)}
      <button class="${selChar === id ? 'main' : ''}" style="width:100%;margin-top:6px" data-a="pickchar" data-v="${id}" ${locked ? 'disabled' : ''}>${locked ? '🔒 クリアで解放' : selChar === id ? '✔ 選択中' : 'このこにする'}</button>
    </div>`;
  }).join('');
  const modes = [['normal', '🌱 じっくり 100日', '1日3回の行動。じっくり育てる標準モード。'], ['short', '⚡ さくっと 10日', '1日30回の行動。時間がない人向けの短いモード（中身は同じ強さ・同じ量の育成）。']]
    .map(([id, n, d]) => `<button class="card ${selMode === id ? '' : ''}" style="text-align:left;${selMode === id ? 'border-color:var(--accent);background:#2f3870' : ''}" data-a="pickmode" data-v="${id}"><b>${n}</b>${selMode === id ? ' ✔' : ''}<div class="sub">${d}</div></button>`).join('');
  return `<div class="top"><h2>モードとパートナーをえらぼう</h2><button data-a="title">もどる</button></div>
    <div class="grid g2" style="margin-bottom:12px">${modes}</div>
    <div class="grid g3">${cards}</div>
    <p class="center"><button class="main" style="font-size:20px;padding:14px 40px" data-a="startgame">${CHARS[selChar].name} と はじめる！</button></p>`;
}
function topBar() {
  const left = S.maxDay - S.day, total = totalOf(S.stats), warnAt = S.maxDay > 20 ? 10 : 2;
  return `<div class="top">
    <div class="day">${S.day}日目 <small>/ ${S.maxDay}日　</small><small class="${left <= warnAt ? 'warn' : ''}">のこり${left}日${left <= 0 ? '（決戦の日）' : ''}</small></div>
    <div><span class="tp">TP ${S.tp}</span>　<span class="tag">ランク ${rankOf(total)}</span><span class="tag">合計 ${total}</span></div>
  </div>`;
}
function vHome() {
  const c = CHARS[S.charId], t = ATK_TYPES[c.type], m = MOODS[S.mood];
  const fz = forced();
  const train = Object.keys(TRAINING).map(id => {
    const x = TRAINING[id], b = trainBonus(id);
    return `<button class="tbtn" data-a="train" data-v="${id}" ${!canAct() ? 'disabled' : ''}>
      <b>${x.icon} ${x.name}</b>
      <span style="color:${STAT_COLOR[x.main]}">${STAT_NAME[x.main]} +${Math.round(TRAIN_MAIN * (1 + b) * m.mul * c.apt[x.main])}</span>
      <span class="sub">${STAT_NAME[x.sub]} +${Math.round(TRAIN_SUB * (1 + b) * m.mul * c.apt[x.sub])}　スタミナ-${trainCost(x)}${b ? '　🔧+' + Math.round(b * 100) + '%' : ''}</span>
    </button>`;
  }).join('');
  const pips = S.apd > 3 ? `<b class="tp">のこり ${S.actions} / ${maxActions()} 回</b>` : Array.from({ length: maxActions() }, (_, i) => `<span class="${i < S.actions ? 'on' : ''}"></span>`).join('');
  const dbg = DEBUG ? `<div class="row" style="margin-top:10px"><button data-a="dbg" data-v="tp">+1000TP</button><button data-a="dbg" data-v="stat">全能力+100</button><button data-a="dbg" data-v="stat2">全能力+300</button><button data-a="dbg" data-v="area">全エリア解放</button><button data-a="dbg" data-v="day">+10日</button></div>` : '';
  return `${topBar()}${toastHtml()}
  <div class="grid g2">
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <h3>${t.icon} ${c.name}</h3><div><span class="tag">${t.name}</span>${elemTag(c.elem)}</div>
      </div>
      <div class="pv" id="pv"></div>
      <canvas class="radar" data-stats='${JSON.stringify(S.stats)}'></canvas>
      ${statRows(S.stats)}
      <div class="statrow"><span>スタミナ</span><b>${S.stamina}</b><div class="bar"><i style="width:${S.stamina}%;background:#ffa94d"></i></div></div>
      <div class="sub" style="margin-top:4px">調子：${m.icon} ${m.n}（上昇量 ×${m.mul}）${S.protein ? '　🥛プロテイン効果中' : ''}</div>
    </div>
    <div>
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>きょうの行動</b><span class="pips">${pips}</span>
        </div>
        ${fz ? `<p class="warn center" style="font-size:18px">🔥 ${S.maxDay}日目！ 決戦の日だ！${S.apd > 3 ? '<br><small>最後の日。行動が残っていれば、鍛えてから挑める。</small>' : ''}</p>
          <button class="main" style="width:100%;font-size:18px;margin-bottom:8px" data-a="versus" data-v="regulus">チャンピオンに挑む</button>` : ''}
        ${S.apd > 3 ? `<div class="row" style="margin-bottom:8px;align-items:center"><span class="sub">まとめて鍛える：</span>${[1, 5, 10].map(n => `<button class="${batchN === n ? 'main' : ''}" style="padding:4px 12px" data-a="batch" data-v="${n}">×${n}</button>`).join('')}</div>` : ''}
        ${canAct() || !fz ? `<div class="grid g3" style="grid-template-columns:repeat(2,1fr)">${train}
          <button class="tbtn" data-a="rest" ${!canAct() ? 'disabled' : ''}><b>😴 休む</b><span class="sub">スタミナ+${Math.round(60 * costF())}${S.apd > 3 ? '' : ' / 調子が上がることも'}</span></button>
          ${fz ? '' : `<button class="tbtn" data-a="sleep"><b>🌙 ${S.actions <= 0 ? '次の日へ' : '今日を終える'}</b><span class="sub">${S.apd > 3 ? '残りの行動を捨てて次の日へ（スタミナ+40）' : '残りの行動を捨てて次の日へ'}</span></button>`}
        </div>` : ''}
      </div>
      <div class="grid" style="grid-template-columns:repeat(2,1fr);margin-top:10px">
        <button data-a="map" ${fz || (S.apd > 3 && S.actions < 1) ? 'disabled' : ''}>⚔️ おでかけ（${S.apd > 3 ? '行動' + BATTLE_COST + '回ぶん' : '1日使う'}）</button>
        <button data-a="skills">📘 技セット</button>
        <button data-a="shop">🛒 ショップ</button>
        <button data-a="items">🎒 もちもの</button>
      </div>
      <p class="sub">おでかけ＝バトル。${S.apd > 3 ? '行動' + BATTLE_COST + '回ぶんを使う' : '1日を使う'}ので、期限（${S.maxDay}日）の中で「鍛える」と「戦う」を配分しよう。</p>
      ${dbg}
      <p><button class="danger" data-a="title" style="font-size:12px;padding:4px 10px">タイトルへ（自動セーブ済み）</button></p>
    </div>
  </div>`;
}
function vSkills() {
  const c = CHARS[S.charId];
  const slots = S.equipped.map((id, i) => {
    const s = id && SKILL_BY_ID[id];
    return `<div class="slot ${s ? 'on' : ''}"><div class="sub">技${i + 1}</div>${s ? `<b>${s.name}</b>` : '<span class="sub">（空き）</span>'}</div>`;
  }).join('');
  const ult = SKILL_BY_ID['ult_' + S.charId];
  const list = SKILLS.filter(s => !s.ult && s.users.includes(S.charId)).map(s => {
    const learned = S.learned.includes(s.id), eq = S.equipped.includes(s.id);
    const typeN = { physical: '物理', magic: '魔法', support: '補助', heal: '回復', move: '移動' }[s.type];
    return `<div class="card skill" style="${learned ? '' : 'opacity:.6'}">
      <div><b>${s.name}</b> <span class="tag">${typeN}</span>${s.elem !== 'none' ? elemTag(s.elem) : ''}<span class="tag">CT ${s.ct}秒</span>${s.power ? `<span class="tag">威力 ${s.power}</span>` : ''}
        <div class="sub">${s.desc}</div>
        <div class="sub">${learned ? '✔ 習得済み' : '🔒 ' + learnText(s)}</div></div>
      <button class="${eq ? 'danger' : 'main'}" data-a="equip" data-v="${s.id}" ${learned ? '' : 'disabled'}>${eq ? '外す' : '装備'}</button>
    </div>`;
  }).join('');
  return `<div class="top"><h2>📘 技セット（${c.name}）</h2><button data-a="home">もどる</button></div>${toastHtml()}
    <div class="slots">${slots}</div>
    <div class="card" style="margin-bottom:10px"><b>必殺：${ult.name}</b> <span class="tag">威力 ${ult.power}${ult.n ? '×' + ult.n : ''}</span><div class="sub">${ult.desc}（ゲージが満タンで使える）</div></div>
    <p class="sub">技は能力値が条件に届くと覚える。何を鍛えるかで覚える技が変わるよ。</p>
    <div class="grid g2">${list}</div>`;
}
function vItems() {
  const owned = ITEMS.filter(it => it.kind !== 'cons' && has(it.id));
  const cons = ITEMS.filter(it => it.kind === 'cons' && count(it.id) > 0);
  return `<div class="top"><h2>🎒 もちもの</h2><button data-a="home">もどる</button></div>${toastHtml()}
    <h3>使う道具</h3>
    <div class="grid g2" style="margin:8px 0 16px">${cons.length ? cons.map(it => `<div class="card skill"><div><b>${it.icon} ${it.name} ×${count(it.id)}</b><div class="sub">${it.desc}</div></div><button class="main" data-a="use" data-v="${it.id}">使う</button></div>`).join('') : '<p class="sub">なにも持っていない。ショップで買えるよ。</p>'}</div>
    <h3>そなえつけの道具（ずっと効果あり）</h3>
    <div class="grid g2" style="margin-top:8px">${owned.length ? owned.map(it => `<div class="card"><b>${it.icon} ${it.name}</b><div class="sub">${it.desc}</div></div>`).join('') : '<p class="sub">まだない。</p>'}</div>`;
}
function vShop() {
  const list = ITEMS.filter(it => it.req <= S.areaUnlocked).map(it => {
    const owned = it.kind !== 'cons' && has(it.id);
    return `<div class="card skill"><div><b>${it.icon} ${it.name}</b> <span class="tag">${{ perm: 'ずっと', cons: '消耗', facility: '施設' }[it.kind]}</span>
      <div class="sub">${it.desc}</div>${it.kind === 'cons' ? `<div class="sub">持っている数：${count(it.id)}</div>` : ''}</div>
      <button class="main" data-a="buy" data-v="${it.id}" ${owned || S.tp < it.price ? 'disabled' : ''}>${owned ? '購入済' : it.price + ' TP'}</button></div>`;
  }).join('');
  const lock = ITEMS.filter(it => it.req > S.areaUnlocked).length;
  return `<div class="top"><h2>🛒 ショップ</h2><div><span class="tp">TP ${S.tp}</span>　<button data-a="home">もどる</button></div></div>${toastHtml()}
    <p class="sub">モンスターに勝ってTPをためよう。道具は早く買うほど、期限までに多く鍛えられる。</p>
    <div class="grid g2">${list}</div>
    ${lock ? `<p class="sub">🔒 エリアを進めると、${lock}種類の道具が並ぶようになる。</p>` : ''}`;
}
function vMap() {
  const tabs = AREAS.map((a, i) => `<button class="${i === mapArea ? 'main' : ''}" data-a="area" data-v="${i}" ${i >= S.areaUnlocked ? 'disabled' : ''}>${i >= S.areaUnlocked ? '🔒' : ''}${a.name}</button>`).join('');
  const list = TRAINERS.filter(t => t.area === mapArea).map(t => {
    const done = !!S.defeated[t.id], ty = ATK_TYPES[t.type];
    const rk = rankOf(t.total);
    const locked = t.champion && false;
    return `<div class="card skill"><div><b>${ty.icon} ${t.name}</b> ${t.boss ? '<span class="tag" style="color:#ffd75e">ボス</span>' : ''}${done ? '<span class="tag" style="color:#7dff9a">勝利済</span>' : ''}
      <div class="sub">${ty.name} / ${ELEM[t.elem].n}属性 / 強さ ランク${rk}　TP ${done ? Math.round(t.tp * 0.3) + '（再戦）' : t.tp}</div></div>
      <button class="main" data-a="versus" data-v="${t.id}" ${locked ? 'disabled' : ''}>しょうぶ</button></div>`;
  }).join('');
  return `<div class="top"><h2>⚔️ おでかけ</h2><button data-a="home">もどる</button></div>
    <div class="row" style="margin-bottom:10px">${tabs}</div>
    <p class="sub">バトルに出かけると1日を使う。あなたのランク：${rankOf(totalOf(S.stats))}（目安：このエリア ${AREAS[mapArea].rank}）</p>
    <div class="grid g2">${list}</div>
    <p style="margin-top:12px"><button data-a="nora">🎲 野良バトル（ランダムな相手・TP少なめ）</button></p>`;
}
function vVersus() {
  const e = sel.tr || sel.nora, c = CHARS[S.charId];
  const es = statsFromTotal(e.type, e.total);
  const ty = ATK_TYPES[e.type], tp = sel.tr ? (S.defeated[sel.tr.id] ? Math.round(sel.tr.tp * 0.3) : sel.tr.tp) : sel.nora.tp;
  return `<div class="top"><h2>しょうぶ！</h2><button data-a="${forced() ? 'home' : 'map'}">もどる</button></div>
    <div class="grid g2">
      <div class="card"><h3>${ATK_TYPES[c.type].icon} ${c.name}（あなた）</h3><div class="sub">ランク ${rankOf(totalOf(S.stats))}</div>${statRows(S.stats)}</div>
      <div class="card"><h3>${ty.icon} ${e.name}</h3><div class="sub">${ty.name} / ${ELEM[e.elem].n}属性 / ランク ${rankOf(e.total)}</div>${statRows(es)}
        ${sel.tr ? `<p class="sub">「${sel.tr.line}」</p>` : ''}</div>
    </div>
    <p class="center sub">勝てば ${tp} TP${sel.tr && sel.tr.champion ? '（勝てば物語がクリアされる）' : ''}　／　${forced() ? '決戦' : S.apd > 3 ? 'バトルで行動' + BATTLE_COST + '回ぶんを使う' : 'バトルで1日を使う'}</p>
    <p class="center"><button class="main" style="font-size:22px;padding:14px 50px" data-a="fight">バトル開始！</button></p>`;
}
function vResult() {
  const r = result, e = r.tr || r.nora;
  const t = Math.round(r.r.time);
  const champLose = !r.win && forced();
  return `<div class="center" style="padding-top:20px">
    <div class="${r.win ? 'win' : 'lose'}">${r.win ? 'WIN!' : 'LOSE...'}</div>
    <p>vs ${e.name}　（${t}秒${r.r.timeUp ? '・時間切れ判定' : ''}）</p>
    ${r.win ? `<p class="tp" style="font-size:26px">+${r.tp} TP</p>` : ''}
    ${r.lines.map(l => `<p>${l}</p>`).join('')}
    ${r.unlocked ? `<p class="tp">🗺️ ${r.unlocked}</p>` : ''}
    ${r.learned.length ? `<p class="tp">✨ 新しい技を覚えた：${r.learned.join('、')}</p>` : ''}
    ${r.hint ? `<div class="card" style="max-width:560px;margin:10px auto">💡 ${r.hint}</div>` : ''}
    <div class="row" style="justify-content:center;margin-top:16px">
      ${champLose ? `<button class="main" data-a="retry">もう一度挑戦</button><button class="danger" data-a="giveup">ここで終わる</button><button data-a="home">ホームへ（鍛えられない）</button>` : `<button class="main" data-a="after">${r.win && r.champion ? 'エンディングへ' : 'つぎの日へ'}</button>`}
    </div></div>`;
}
function vEnding() {
  const e = S.end;
  return `<div class="title">
    <div class="big">${e.win ? '🏆' : '🌙'}</div>
    <h1>${e.win ? 'チャンピオンに勝利！' : '期限が、終わった…'}</h1>
    <p>${e.win ? `${e.day}日目に頂点へ。のこり ${S.maxDay - e.day} 日を残してのクリア！` : '今回はここまで。鍛え方を変えて、もう一度挑戦しよう。'}</p>
    <div class="card" style="min-width:260px"><div>ランク <b class="tp">${e.rank}</b>　合計 <b>${e.total}</b></div>
      <div>スコア <b class="tp" style="font-size:28px">${e.score}</b></div></div>
    ${e.win ? '<p class="tp">🔓 シズクとルイナが仲間に加わった！（次の育成から選べる）</p>' : ''}
    <button class="main" data-a="endtitle">タイトルへ</button>
  </div>`;
}

// ---------- 起動 ----------
loadMeta();
if (typeof THREE === 'undefined') {
  $('#ui').innerHTML = '<div class="title"><h2>3D部品（Three.js）を読み込めませんでした</h2><p class="sub">インターネットに接続して、ページを再読み込みしてね。</p></div>';
} else {
  render();
}

// 音のON/OFF
(() => {
  const b = document.getElementById('mute');
  const sync = () => { b.textContent = Sound.isMuted() ? '🔇' : '🔊'; };
  b.addEventListener('click', () => { Sound.unlock(); Sound.toggleMute(); sync(); if (!Sound.isMuted()) Sound.play('click'); });
  sync();
})();
