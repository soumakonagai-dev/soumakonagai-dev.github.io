'use strict';
// ====== ゲーム本体（状態・時間・お客さん・従業員・画面）======
const SAVE_KEY = 'slime-shop-save-v1';
const NEW_WARN = '⚠ <b>セーブデータが消えます。</b><br>これまでのお金・スライム・従業員・レシピが、すべてなくなります。<br>本当に「はじめから」にしますか？';
let S = null;                 // ゲームの状態
let started = false, ending = false, hudT = 0;

// ブラウザの確認ダイアログは使えない場合があるので、ゲーム内の確認画面を使う
function askConfirm(msg, yesLabel, onYes, danger) {
  const o = document.createElement('div'); o.id = 'ask';
  o.innerHTML = '<div class="win"><p class="askmsg"></p><div class="row end"><button data-r="0">やめる</button><button data-r="1" class="' + (danger ? 'danger' : 'main') + '"></button></div></div>';
  o.querySelector('.askmsg').innerHTML = msg; o.querySelector('[data-r="1"]').textContent = yesLabel || 'OK';
  o.addEventListener('click', e => { const b = e.target.closest('button'); if (!b && e.target !== o) return; o.remove(); if (b && b.dataset.r === '1') onYes(); });
  document.body.appendChild(o);
}
const yen = n => '¥' + Math.round(n).toLocaleString();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const fmtTime = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

function newState() {
  return {
    v: 1, day: 1, min: 480, money: 3000, repPts: 0,
    stock: { glue_cheap: 500, borax: 150, soap: 100, paint_red: 10, paint_blue: 10, glitter_gold: 10 },
    bag: {}, slimes: [], shelf: Array.from({ length: SHELF_N[0].v }, () => ({ sid: null, price: 0 })),
    recipes: [], staff: [], up: { tool: 0, bowl: 0, shelf: 0, store: 0, bag: 0, sign: 0 },
    bowl: { amt: {}, stir: 0 }, autoBuy: {}, dex: { combos: {}, cust: {}, made: 0 },
    weather: 'sunny', trend: null, env: { b: 0, w: 0, s: 0 }, pf: {}, sale: null,
    today: { sold: 0, rev: 0, missed: 0, made: 0, failed: 0, empty: 0 }, debt: 0, nid: 1, mute: false, totalSold: 0,
    area: 'shop', pos: null,
  };
}

// ---------- 数値まわり ----------
const repLevel = () => { let l = 1; REP_STEPS.forEach((v, i) => { if (S.repPts >= v) l = i + 1; }); return l; };
const bagSpeed = () => BAG[S.up.bag].speed;
const bagCap = () => BAG[S.up.bag].v;
const storeCap = () => STORE_CAP[S.up.store].v;
const weightOf = d => Object.keys(d).reduce((a, id) => a + (ITEMS[id] ? ITEMS[id].w * d[id] : 0), 0);
const hasStaff = role => S.staff.filter(s => s.role === role);
const clerkBonus = () => { const c = hasStaff('clerk'); return c.length ? 0.95 + 0.2 * Math.max(...c.map(x => x.skill)) : 1.05; };

function priceOf(shopId, i) {
  const [item, pack, base] = SHOPS[shopId].stock[i];
  let f = S.pf[shopId] || 1;
  if (S.sale && S.sale.shop === shopId && S.sale.item === item) f *= 0.8;
  return Math.max(10, Math.round(base * f / 10) * 10);
}

function stowBag() {
  let moved = 0;
  for (const id of Object.keys(S.bag)) {
    const w = ITEMS[id].w, free = storeCap() - weightOf(S.stock);
    const q = Math.min(S.bag[id], Math.floor(free / w));
    if (q > 0) { S.stock[id] = (S.stock[id] || 0) + q; S.bag[id] -= q; moved += q; if (S.bag[id] <= 0) delete S.bag[id]; }
  }
  return moved;
}

// ---------- 日付・天気 ----------
function newDay() {
  S.today = { sold: 0, rev: 0, missed: 0, made: 0, failed: 0, empty: 0 };
  const r = Math.random();
  S.weather = r < 0.45 ? 'sunny' : r < 0.7 ? 'cloudy' : r < 0.9 ? 'rain' : 'dry';
  const W = WEATHERS[S.weather].env;
  S.env = { b: W.b + rnd(-1.2, 1.2), w: W.w + rnd(-2.5, 2.5), s: W.s + rnd(-0.8, 0.8) };
  for (const k in SHOPS) S.pf[k] = rnd(0.92, 1.1);
  const sk = pick(Object.keys(SHOPS)), st = pick(SHOPS[sk].stock);
  S.sale = Math.random() < 0.6 ? { shop: sk, item: st[0] } : null;
  S.trend = Math.random() < 0.5 ? pick(TRAITS) : null;
}
function envHints() {
  const e = S.env, h = [WEATHERS[S.weather].hint];
  if (e.b < -0.8) h.push('ホウ砂水が効きやすい日（少なめでも固まる）'); else if (e.b > 0.8) h.push('ホウ砂水が効きにくい日（少し多めに）');
  if (e.w < -2) h.push('水に弱い日（べたべたになりやすい）'); else if (e.w > 2) h.push('水に強い日');
  if (e.s < -0.6) h.push('泡に弱い日（溶けやすい）'); else if (e.s > 0.6) h.push('泡に強い日');
  return h;
}

// ---------- 時間 ----------
function tickMinute() {
  S.min++;
  const open = S.min >= 600 && S.min < 1140;
  if (open) {
    const rate = (2 + repLevel()) * SIGN[S.up.sign].v * WEATHERS[S.weather].cust;
    if (Math.random() < rate / 60) arrival();
  }
  if (S.min >= 540 && S.min < 1140) crafterTick();
  if (S.min >= 1440) endDay();
}

// ---------- お客さん ----------
function arrival() {
  const rl = repLevel(), rain = S.weather === 'rain', pool = [];
  for (const id in CUSTOMERS) { const c = CUSTOMERS[id]; if (c.needRep && rl < c.needRep) continue; const w = c.w(rl, rain); if (w > 0) pool.push([id, w]); }
  let t = Math.random() * pool.reduce((a, p) => a + p[1], 0), type = pool[0][0];
  for (const p of pool) { t -= p[1]; if (t <= 0) { type = p[0]; break; } }
  const inShop = World.area === 'shop', staffed = hasStaff('clerk').length > 0 || inShop;
  if (!staffed) { S.today.missed++; return; }
  const decide = () => customerBuy(type);
  if (inShop) World.spawnVisitor(type, decide); else decide();
}
function customerBuy(typeId) {
  const type = CUSTOMERS[typeId], bonus = clerkBonus();
  let best = null, bu = -1e9;
  S.shelf.forEach((sl, i) => {
    const st = sl.sid && S.slimes.find(x => x.id === sl.sid);
    if (!st || st.count <= 0) return;
    let like = type.like(st); if (S.trend && st.traits[S.trend] > 0) like *= 1.25;
    const willing = st.fair * like * rnd(0.9, 1.2) * bonus;
    if (sl.price <= willing && sl.price <= type.budget) { const u = willing - sl.price; if (u > bu) { bu = u; best = { i, st, like, price: sl.price }; } }
  });
  if (!best) {
    const any = S.shelf.some(sl => sl.sid && (S.slimes.find(x => x.id === sl.sid) || {}).count > 0);
    if (!any) S.today.empty++;
    S.repPts = Math.max(0, S.repPts - 0.3);
    return;
  }
  const qty = type.multi && best.st.count >= 2 && Math.random() < 0.5 ? 2 : 1;
  best.st.count -= qty; S.money += best.price * qty; S.today.sold += qty; S.today.rev += best.price * qty; S.totalSold += qty;
  const before = repLevel();
  S.repPts += 1 + (best.like > 1.4 ? 1 : 0) + ({ C: 0, B: 0, A: 1, S: 2 }[best.st.q]);
  const d = S.dex.cust[typeId] || (S.dex.cust[typeId] = { n: 0, loved: 0 });
  d.n += qty; if (best.like > 1.4) d.loved++;
  sfx('coin'); UI.toast(`${type.icon} ${type.name}が「${best.st.name}」を買った！ +${yen(best.price * qty)}`, 'good');
  if (repLevel() > before) { UI.toast(`★お店の評判が${'★'.repeat(repLevel())}になった！`, 'good'); }
  if (best.st.count <= 0) { /* 売り切れ */ }
  World.refreshShelf();
}

// ---------- 従業員 ----------
function crafterTick() {
  for (const sf of hasStaff('crafter')) {
    const r = sf.recipeId && S.recipes.find(x => x.id === sf.recipeId);
    if (!r) { sf.msg = 'レシピ未設定'; continue; }
    const tag = STAFF_TAGS.find(t => t.id === sf.tag) || STAFF_TAGS[1];
    sf.prog = (sf.prog || 0) + tag.spd;
    if (sf.prog < 190 - 110 * sf.skill) continue;
    if (!Object.keys(r.items).every(id => (S.stock[id] || 0) >= r.items[id])) { sf.msg = '材料不足'; continue; }
    sf.prog = 0; sf.msg = '';
    const amt = {};
    for (const id in r.items) {
      S.stock[id] -= r.items[id];
      const noise = 1 + (Math.random() * 2 - 1) * 0.05 * (1 - sf.skill * 0.8) / tag.acc;
      amt[id] = ITEMS[id].unit === '回' ? r.items[id] : r.items[id] * noise;
    }
    const res = judge(amt, 0.7 + 0.3 * sf.skill, S.env);
    if (res.ok && res.jars > 0) {
      addSlimeStack(res.slime, res.jars); r.made++; S.today.made += res.jars;
      sf.skill = Math.min(0.95, sf.skill + 0.006); World.refreshShelf();
      UI.toast(`${sf.name}が「${res.slime.name}」を${res.jars}個作った`);
    } else { S.today.failed++; UI.toast(`${sf.name}がスライム作りに失敗した…`, 'bad'); }
  }
}

function buyerRun() {
  const lines = []; let spent = 0;
  const bs = hasStaff('buyer'); if (!bs.length) return { lines, spent };
  const skill = Math.max(...bs.map(b => b.skill)), fee = 1.15 - 0.25 * skill;
  for (const id in S.autoBuy) {
    const target = S.autoBuy[id]; if (!(target > 0)) continue;
    let need = target - (S.stock[id] || 0); if (need <= 0) continue;
    let best = null;
    for (const sk in SHOPS) {
      if (SHOPS[sk].needRep && repLevel() < SHOPS[sk].needRep) continue;
      SHOPS[sk].stock.forEach((e, i) => { if (e[0] !== id) return; const up = priceOf(sk, i) / e[1]; if (!best || up < best.up) best = { sk, i, up, pack: e[1], price: priceOf(sk, i) }; });
    }
    if (!best) continue;
    let packs = 0;
    while (need > 0 && S.money >= best.price * fee && weightOf(S.stock) + ITEMS[id].w * best.pack <= storeCap()) {
      S.money -= best.price * fee; spent += best.price * fee; S.stock[id] = (S.stock[id] || 0) + best.pack; need -= best.pack; packs++;
    }
    if (packs) lines.push(`${ITEMS[id].name} ×${packs}パック`);
  }
  return { lines, spent };
}

// ---------- スライムの登録 ----------
function comboKey(traits) { return TRAITS.filter(t => traits[t] > 0).join('+') || 'normal'; }
function addSlimeStack(sl, count) {
  const sig = sl.name + sl.q + sl.color + TRAITS.map(t => Math.round((sl.traits[t] || 0) * 20)).join('');
  let st = S.slimes.find(x => x.sig === sig);
  if (st) st.count += count;
  else { st = { id: S.nid++, sig, name: sl.name, traits: sl.traits, color: sl.color, sp: sl.sp, sat: sl.sat, light: sl.light, q: sl.q, fair: sl.fair, count }; S.slimes.push(st); }
  S.dex.combos[comboKey(sl.traits)] = (S.dex.combos[comboKey(sl.traits)] || 0) + count;
  S.dex.made += count;
  return st;
}
function makeRecipe(sl, amt) {
  const m = mixFromAmt(amt), f = 300 / m.glue, items = {};
  for (const id in amt) { if (!(amt[id] > 0)) continue; items[id] = ITEMS[id].unit === '回' ? Math.max(1, Math.round(amt[id] * f)) : Math.round(amt[id] * f * 10) / 10; }
  return { id: S.nid++, name: sl.name, color: sl.color, traits: sl.traits, q: sl.q, fair: sl.fair, items, made: 0, key: comboKey(sl.traits) };
}

// ---------- 一日の終わり ----------
function endDay() {
  if (ending) return; ending = true;
  if (Workshop.active) Workshop.exit(true);
  const rows = [], t = S.today;
  const bu = buyerRun();
  let wages = 0;
  S.staff.forEach(sf => { wages += ROLES[sf.role].wage; });
  S.money -= RENT + wages;
  const before = S.money + RENT + wages + bu.spent;
  S.slimes = S.slimes.filter(x => x.count > 0 || S.shelf.some(s => s.sid === x.id));
  S.shelf.forEach(sl => { if (sl.sid && !S.slimes.find(x => x.id === sl.sid)) { sl.sid = null; sl.price = 0; } });
  if (S.money < 0) S.debt++; else S.debt = 0;
  const dayDone = S.day;
  newDay(); S.day++;
  const rl = repLevel();
  const over = S.debt >= 3;
  UI.open(() => `
    <h2>🌙 ${dayDone}日目の決算</h2>
    <div class="card"><table class="tbl">
      <tr><td>売れた数</td><td>${t.sold}個</td></tr><tr><td>売上</td><td class="g">+${yen(t.rev)}</td></tr>
      ${t.missed ? `<tr><td>店番がいなくて逃したお客さん</td><td class="r">${t.missed}人</td></tr>` : ''}
      ${t.empty ? `<tr><td>商品がなくて帰ったお客さん</td><td class="r">${t.empty}人</td></tr>` : ''}
      <tr><td>家賃</td><td class="r">-${yen(RENT)}</td></tr>
      ${wages ? `<tr><td>従業員の給料（${S.staff.length}人）</td><td class="r">-${yen(wages)}</td></tr>` : ''}
      ${bu.spent ? `<tr><td>仕入れ係の購入<br><small class="sub">${bu.lines.join('、')}</small></td><td class="r">-${yen(bu.spent)}</td></tr>` : ''}
      <tr class="tot"><td>所持金</td><td>${yen(S.money)}</td></tr>
    </table></div>
    ${S.money < 0 ? `<p class="warn">⚠ お金が足りない！ このまま${3 - S.debt}日続くと、お店をたたむことになる…</p>` : ''}
    <div class="card"><b>明日</b>：${WEATHERS[S.weather].icon} ${WEATHERS[S.weather].name}　評判 ${'★'.repeat(rl)}${'☆'.repeat(5 - rl)}
      ${S.trend ? `<br>📈 流行：<b>${TRAIT_NAME[S.trend]}</b>スライムが人気になりそう` : ''}
      ${S.sale ? `<br>🏷 セール：${SHOPS[S.sale.shop].short}の「${ITEMS[S.sale.item].name}」が2割引` : ''}
      <br><small class="sub">${envHints().join(' / ')}</small></div>
    <div class="row end"><button class="main" data-act="${over ? 'gameover' : 'nextday'}">${over ? '…' : '明日へ'}</button></div>`,
    { noClose: true });
  if (over) { UI.open(() => `<h2>😢 お店をたたむことになった</h2><p>お金が足りない日が続いて、お店を続けられなくなった。<br>${dayDone}日間、${S.totalSold}個のスライムを売った。</p><div class="row end"><button class="main" data-act="reset2">はじめから</button></div>`, { noClose: true }); }
}
function nextDay() {
  ending = false; S.min = 480; UI.close();
  World.go('shop'); setTimeout(() => { World.refreshShelf(); World.refreshStaff(); }, 300);
  saveGame(); UI.toast(`${S.day}日目のはじまり。${WEATHERS[S.weather].icon} ${WEATHERS[S.weather].name}`);
}

// ---------- セーブ ----------
function saveGame() {
  try {
    S.area = World.area === 'town' ? 'town' : 'shop'; S.pos = [World.P.x, World.P.z];
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) { /* ストレージが使えなくても続けられる */ }
}
function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function startGame(state) {
  S = state; started = true; ending = false;
  if (!state.today) S.today = { sold: 0, rev: 0, missed: 0, made: 0, failed: 0, empty: 0 };
  document.getElementById('title').style.display = 'none';
  World.setArea(S.area === 'town' ? 'town' : 'shop');
  if (S.area === 'town' && S.pos) World.place(S.pos[0], S.pos[1], 0);
  World.refreshShelf(); World.refreshStaff();
  World.setEnvironment(S.min, S.weather);
}
function onAreaChange(name, prev) {
  if (name === 'shop') {
    const moved = stowBag(); World.refreshShelf(); World.refreshStaff();
    if (moved > 0) UI.toast('持ち帰った材料を棚にしまった');
    if (Object.keys(S.bag).length) UI.toast('棚がいっぱいで入りきらなかった材料がある（棚を広げよう）', 'bad');
  }
  World.setEnvironment(S.min, S.weather);
}

// =====================================================
//  画面（UI）
// =====================================================
const UI = (function () {
  let render = null, opts = {}, open = false;
  const el = () => document.getElementById('modal');
  function paint() {
    const e = el(), sc = e.querySelector('.scroll'), top = sc ? sc.scrollTop : 0;
    e.innerHTML = `<div class="win ${opts.cls || ''}">${render()}</div>`;
    const s2 = e.querySelector('.scroll'); if (s2) s2.scrollTop = top;
  }
  function openUI(fn, o) { render = fn; opts = o || {}; open = true; el().style.display = 'flex'; paint(); }
  function close() { open = false; el().style.display = 'none'; el().innerHTML = ''; render = null; if (opts.onClose) opts.onClose(); }
  function toast(t, cls) {
    const c = document.getElementById('toasts'), d = document.createElement('div');
    d.className = 'toast ' + (cls || ''); d.textContent = t; c.appendChild(d);
    while (c.children.length > 5) c.removeChild(c.firstChild);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 400); }, 3800);
  }
  const tags = st => TRAITS.filter(t => st.traits[t] > 0).map(t => `<span class="tag t-${t}">${TRAIT_NAME[t]} ${Math.round(st.traits[t] * 100)}%</span>`).join('') || '<span class="tag">ノーマル</span>';
  const swatch = (c, sp) => `<span class="sw" style="background:radial-gradient(circle at 30% 30%,#fff9 0,${c} 55%,${c}cc 100%)">${sp >= 2 ? '✨' : ''}</span>`;
  const rankTag = q => `<span class="rank r${q}">${q}</span>`;

  // ----- 仕入れ -----
  function openShop(id) {
    const sd = SHOPS[id];
    openUI(() => {
      const rows = sd.stock.map(([item, pack, base], i) => {
        const it = ITEMS[item], p = priceOf(id, i), sale = S.sale && S.sale.shop === id && S.sale.item === item;
        const unit = (p / pack).toFixed(p / pack < 1 ? 2 : 1), bagFull = weightOf(S.bag) + it.w * pack > bagCap();
        return `<div class="item"><span class="ic" style="background:${it.color}">${it.icon}</span>
          <div class="grow"><b>${it.name}</b> ${sale ? '<span class="tag sale">2割引</span>' : ''}<br><small class="sub">${pack}${it.unit}入り・1${it.unit}あたり${unit}円　${it.note || ''}　（持ち物 ${Math.floor((S.bag[item] || 0) + (S.stock[item] || 0))}${it.unit}）</small></div>
          <b class="price">${yen(p)}</b>
          <button data-act="buy" data-s="${id}" data-i="${i}" data-n="1" ${S.money < p || bagFull ? 'disabled' : ''}>買う</button>
          <button data-act="buy" data-s="${id}" data-i="${i}" data-n="5" ${S.money < p * 5 || weightOf(S.bag) + it.w * pack * 5 > bagCap() ? 'disabled' : ''}>×5</button></div>`;
      }).join('');
      return `<div class="hd"><h2>${sd.name}</h2><button data-act="close">× とじる</button></div>
        <div class="row between"><span>所持金 <b>${yen(S.money)}</b></span><span>🎒 ${Math.round(weightOf(S.bag))} / ${bagCap()}（${BAG[S.up.bag].name}）</span></div>
        <p class="sub">買ったものはバッグに入る。お店に帰ると、材料棚にしまわれる。持てる量に注意！</p>
        <div class="scroll">${rows}</div>`;
    }, { cls: 'wide' });
  }
  function buy(shop, i, n) {
    const [item, pack] = SHOPS[shop].stock[i], p = priceOf(shop, i) * n, it = ITEMS[item];
    if (S.money < p) return toast('お金が足りない', 'bad');
    if (weightOf(S.bag) + it.w * pack * n > bagCap()) return toast('バッグに入りきらない！', 'bad');
    S.money -= p; S.bag[item] = (S.bag[item] || 0) + pack * n; sfx('buy'); paint();
  }

  // ----- 棚 -----
  function openShelf() {
    openUI(() => {
      const stacks = S.slimes.filter(x => x.count > 0);
      const rows = S.shelf.map((sl, i) => {
        const st = sl.sid && S.slimes.find(x => x.id === sl.sid);
        const opt = `<option value="">（なし）</option>` + stacks.map(x => `<option value="${x.id}" ${x.id === sl.sid ? 'selected' : ''}>${esc(x.name)}（残${x.count}）</option>`).join('');
        const used = id => S.shelf.some((s, j) => j !== i && s.sid === id);
        return `<div class="slot"><b class="no">${i + 1}</b><select data-act="slotsel" data-i="${i}">${opt}</select>
          ${st ? `<div class="grow">${swatch(st.color, st.sp)} ${rankTag(st.q)} ${tags(st)}<br><small class="sub">目安 ${yen(st.fair)}　残り${st.count}個</small> <button class="mini" data-act="touchsh" data-id="${st.id}">👆さわる</button></div>
          <div class="pc"><button data-act="price" data-i="${i}" data-d="-50">-50</button><button data-act="price" data-i="${i}" data-d="-10">-10</button><b class="pv">${yen(sl.price)}</b><button data-act="price" data-i="${i}" data-d="10">+10</button><button data-act="price" data-i="${i}" data-d="50">+50</button></div>` : '<div class="grow sub">棚があいている</div>'}</div>`;
      }).join('');
      const hint = S.trend ? `<p>📈 いま流行：<b>${TRAIT_NAME[S.trend]}</b></p>` : '';
      return `<div class="hd"><h2>🧁 棚と値段</h2><button data-act="close">× とじる</button></div>
        <p class="sub">お客さんは棚の中から、好みと値段で選んで買う。高すぎると見るだけで帰り、安すぎると利益が出ない。「目安」は普通のお客さんが納得する値段。好みがぴったりの人は、目安よりずっと高くても買う。</p>${hint}
        <div class="scroll">${rows}</div><p class="sub">${stacks.length ? '' : 'スライムがまだない。工房で作ろう！'}</p>`;
    }, { cls: 'wide' });
  }

  // ----- 完成 -----
  let pending = null;
  function openResult(res, amt, stir) {
    pending = { res, amt, stir };
    if (!res.ok) {
      sfx('ng'); S.today.failed++;
      const f = FAIL_TEXT[res.fail];
      openUI(() => `<h2>😖 ${f[0]}</h2><p>${f[1]}</p><p class="sub">失敗した材料はもどらない。スライムの限界ラインは、材料の銘柄や天気で少しずれる。</p>
        <div class="row end"><button class="main" data-act="discard">ボウルを空にする</button></div>`, { noClose: true });
      return;
    }
    sfx('ok'); const sl = res.slime;
    openUI(() => `<h2>🎉 スライムが完成！</h2>
      <div class="rescard">${swatch(sl.color, sl.sp).replace('class="sw"', 'class="sw big"')}
        <div class="grow"><input id="slName" value="${esc(sl.name)}" maxlength="20"><br>${rankTag(sl.q)} ${tags(sl)}<br>
        <small class="sub">${sl.dry ? '水がノリより少なくて、ごわごわ…（水はノリより多めがうまくいく）　' : ''}${sl.rough ? 'ラメが多すぎてザラザラ…　' : ''}${sl.stained ? '絵具が多くて手に色がつきそう…　' : ''}</small></div></div>
      <div class="card"><div class="row between"><span>できた数</span><b>${res.jars}個（${JAR_ML}mlずつ）</b></div>
      <div class="row between"><span>目安の値段</span><b>${yen(sl.fair)}</b></div>
      <div class="row between"><span>こね具合</span><b>${Math.round(Math.min(1, pending.stir) * 100)}%</b></div></div>
      ${Object.keys(sl.traits).length ? '<p class="sub">限界ギリギリを攻めた分だけ個性が強く出ています（高く売れる）。</p>' : '<p class="sub">個性なしのノーマルスライム。安定して売れる。</p>'}
      <div class="row end"><button data-act="touchres">👆 さわってみる</button><button data-act="resume">もう少し調整する</button><button class="main" data-act="accept">商品にする</button></div>`, { noClose: true });
  }
  function accept() {
    const { res, amt } = pending, sl = res.slime;
    const nm = (document.getElementById('slName').value || sl.name).trim() || sl.name;
    sl.name = nm;
    const rc = makeRecipe(sl, amt), ex = S.recipes.find(r => r.name === nm && r.key === rc.key);
    if (ex) { if (rc.fair >= ex.fair) { rc.made = ex.made; rc.id = ex.id; S.recipes[S.recipes.indexOf(ex)] = rc; } }
    else S.recipes.push(rc);
    addSlimeStack(sl, res.jars); S.today.made += res.jars;
    const first = S.dex.made === res.jars;
    Workshop.clearBowl(); close(); pending = null; World.refreshShelf();
    toast(`「${nm}」を${res.jars}個、在庫に入れた。棚に並べよう！`, 'good');
    if (first) toast('棚（左のかべ）で値段をつけて並べると、お客さんが買ってくれる', 'good');
  }

  // ----- 事務机 -----
  let tab = 'today';
  const TABS = [['today', '今日'], ['equip', '設備'], ['staff', '従業員'], ['recipe', 'レシピ'], ['stock', '在庫'], ['dex', '図鑑']];
  function upgradeDefs() {
    return [
      ['tool', '計量道具', TOOL_LV.map(t => ({ name: t.name, cost: t.cost, desc: t.desc }))],
      ['bowl', 'ボウル', BOWL_CAP.map(b => ({ name: b.v + 'ml', cost: b.cost, desc: '一度にたくさん作れる' }))],
      ['shelf', '陳列棚', SHELF_N.map(b => ({ name: b.v + '枠', cost: b.cost, desc: '同時に並べられる種類が増える' }))],
      ['store', '材料棚', STORE_CAP.map(b => ({ name: '容量' + b.v, cost: b.cost, desc: '材料をたくさん保管できる' }))],
      ['bag', '運び方', BAG.map(b => ({ name: b.name, cost: b.cost, desc: `持てる量 ${b.v}・歩く速さ ${b.speed}` }))],
      ['sign', '看板', SIGN.map(b => ({ name: b.name, cost: b.cost, desc: `来店数 ×${b.v}` }))],
    ];
  }
  function openOffice(t) {
    if (t) tab = t;
    openUI(() => {
      const head = `<div class="hd"><h2>🖥️ 事務机</h2><button data-act="close">× とじる</button></div><div class="tabs">${TABS.map(x => `<button class="${tab === x[0] ? 'on' : ''}" data-act="tab" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>`;
      return head + `<div class="scroll">${officeBody()}</div>`;
    }, { cls: 'wide' });
  }
  function officeBody() {
    const rl = repLevel();
    if (tab === 'today') {
      const nx = REP_STEPS[rl] ? `（次の★まで あと${Math.ceil(REP_STEPS[rl] - S.repPts)}）` : '（最高！）';
      return `<div class="card"><b>${S.day}日目 ${fmtTime(S.min)}</b>　${WEATHERS[S.weather].icon} ${WEATHERS[S.weather].name}<br>
        <small class="sub">${envHints().join(' / ')}</small><br>${S.trend ? `📈 流行：<b>${TRAIT_NAME[S.trend]}</b><br>` : ''}
        評判 ${'★'.repeat(rl)}${'☆'.repeat(5 - rl)} ${nx}<br>営業時間 10:00〜19:00　家賃 ${yen(RENT)}/日　給料 ${yen(S.staff.reduce((a, s) => a + ROLES[s.role].wage, 0))}/日</div>
        <div class="card"><b>今日のここまで</b><br>売れた ${S.today.sold}個 / 売上 ${yen(S.today.rev)} / 作った ${S.today.made}個
        ${S.today.missed ? ` / 逃したお客さん ${S.today.missed}人（店番を雇おう）` : ''}</div>
        <div class="row"><button class="main" data-act="endday">今日を終える（決算へ）</button><button data-act="save">セーブ</button>
        <button data-act="mute">効果音：${S.mute ? 'OFF' : 'ON'}</button><button class="danger" data-act="reset">はじめから</button></div>
        <p class="sub">0:00になると自動で今日が終わります。お店にいないとき、店番がいないとお客さんは帰ってしまいます。</p>`;
    }
    if (tab === 'equip') {
      return upgradeDefs().map(([k, label, lv]) => {
        const cur = S.up[k], nx = lv[cur + 1];
        return `<div class="item"><div class="grow"><b>${label}</b>：${lv[cur].name}<br><small class="sub">${lv[cur].desc}</small>
          ${nx ? `<br><small>→ 次：<b>${nx.name}</b>　${nx.desc}</small>` : '<br><small class="sub">最高レベル</small>'}</div>
          ${nx ? `<button data-act="upgrade" data-k="${k}" ${S.money < nx.cost ? 'disabled' : ''}>${yen(nx.cost)}で強化</button>` : ''}</div>`;
      }).join('');
    }
    if (tab === 'staff') {
      let h = `<p class="sub">従業員には毎日、給料がかかります。</p><div class="row">` + Object.keys(ROLES).map(r => `<button data-act="hire" data-r="${r}" ${S.money < ROLES[r].hire || hasStaff(r).length >= 3 ? 'disabled' : ''}>${ROLES[r].icon} ${ROLES[r].name}を雇う（${yen(ROLES[r].hire)}）</button>`).join('') + `</div>`;
      h += Object.keys(ROLES).map(r => `<p class="sub">${ROLES[r].icon} <b>${ROLES[r].name}</b>：${ROLES[r].desc}（給料 ${yen(ROLES[r].wage)}/日）</p>`).join('');
      S.staff.forEach(sf => {
        const tag = STAFF_TAGS.find(t => t.id === sf.tag);
        h += `<div class="card"><div class="row between"><b>${ROLES[sf.role].icon} ${sf.name}（${ROLES[sf.role].name}）</b><span><span class="tag">${tag.name}</span> 腕前 ${Math.round(sf.skill * 100)}</span></div>`;
        if (sf.role === 'crafter') {
          h += `<div class="row"><select data-act="setrecipe" data-id="${sf.id}"><option value="">作るレシピを選ぶ…</option>${S.recipes.map(r => `<option value="${r.id}" ${sf.recipeId === r.id ? 'selected' : ''}>${esc(r.name)}（${r.q}）</option>`).join('')}</select> <small class="sub">${sf.msg || ''}</small></div>
            <small class="sub">レシピをそのまま再現します（ノリ300ml分）。腕前が低いと分量がぶれて、ギリギリのレシピは失敗しやすい。</small>`;
        }
        h += `<div class="row end"><button class="danger" data-act="fire" data-id="${sf.id}">やめてもらう</button></div></div>`;
      });
      if (hasStaff('buyer').length) {
        h += `<div class="card"><b>🧑‍🌾 仕入れ係の買い足し（毎晩、この量になるまで買う）</b><div class="ab">` + Object.keys(ITEMS).filter(id => !ITEMS[id].free).map(id => {
          const it = ITEMS[id], step = it.unit === 'ml' ? 500 : 10, v = S.autoBuy[id] || 0;
          return `<div class="abrow"><span>${it.icon} ${it.name}</span><button data-act="ab" data-id="${id}" data-d="${-step}">−</button><b>${v}${it.unit}</b><button data-act="ab" data-id="${id}" data-d="${step}">＋</button></div>`;
        }).join('') + `</div></div>`;
      }
      return h;
    }
    if (tab === 'recipe') {
      if (!S.recipes.length) return '<p class="sub">まだレシピがありません。スライムを完成させると自動で記録されます。</p>';
      return S.recipes.map(r => {
        const g = r.items.glue_cheap || 0, gl = Object.keys(r.items).filter(id => ITEMS[id].kind === 'glue').reduce((a, id) => a + r.items[id], 0);
        const lines = Object.keys(r.items).map(id => `${ITEMS[id].icon}${ITEMS[id].name.replace(/（.*）/, '')} ${ITEMS[id].unit === 'ml' ? r.items[id] + 'ml' : r.items[id] + '回'}`).join(' / ');
        return `<div class="card"><div class="row between"><span>${swatch(r.color, 0)} <b>${esc(r.name)}</b> ${rankTag(r.q)}</span><button class="danger" data-act="delrecipe" data-id="${r.id}">消す</button></div>
          <div>${TRAITS.filter(t => r.traits[t] > 0).map(t => `<span class="tag t-${t}">${TRAIT_NAME[t]} ${Math.round(r.traits[t] * 100)}%</span>`).join('') || '<span class="tag">ノーマル</span>'}　目安 ${yen(r.fair)}</div>
          <small class="sub">ノリ300mlあたり：${lines}</small></div>`;
      }).join('');
    }
    if (tab === 'stock') {
      const row = (d, cap) => Object.keys(d).filter(id => d[id] > 0.0001).map(id => `<div class="rd"><span>${ITEMS[id].icon} ${ITEMS[id].name}</span><b>${Math.floor(d[id])}${ITEMS[id].unit}</b></div>`).join('') || '<p class="sub">なし</p>';
      return `<div class="card"><b>材料棚</b> ${Math.round(weightOf(S.stock))} / ${storeCap()}${row(S.stock)}</div>
        <div class="card"><b>バッグ</b> ${Math.round(weightOf(S.bag))} / ${bagCap()}${row(S.bag)}</div>
        <div class="card"><b>スライムの在庫</b>${S.slimes.filter(x => x.count > 0).map(x => `<div class="rd"><span>${swatch(x.color, x.sp)} ${esc(x.name)} ${rankTag(x.q)}</span><b>${x.count}個 <button class="mini" data-act="touchst" data-id="${x.id}">👆さわる</button></b></div>`).join('') || '<p class="sub">なし</p>'}</div>`;
    }
    if (tab === 'dex') {
      let h = '<h3>お客さん</h3>';
      for (const id in CUSTOMERS) {
        const c = CUSTOMERS[id], d = S.dex.cust[id], locked = c.needRep && rl < c.needRep;
        h += `<div class="item"><span class="ic">${locked ? '❓' : c.icon}</span><div class="grow"><b>${locked ? '？？？' : c.name}</b>${d ? ` <small class="sub">（${d.n}回 買ってくれた）</small>` : ''}<br><small class="sub">${locked ? `評判★${c.needRep}で来店するかも` : d ? c.desc : 'まだ買ってくれていない。好みは不明'}</small></div></div>`;
      }
      const combos = [];
      for (const m of ['', 'nettori', 'danryoku']) for (const a of [0, 1]) for (const b of [0, 1]) combos.push([m, a ? 'torotoro' : '', b ? 'fuwafuwa' : ''].filter(Boolean));
      h += '<h3>作ったスライムの種類</h3><div class="combos">' + combos.map(cb => {
        const key = cb.join('+') || 'normal', n = S.dex.combos[key];
        return `<div class="cb ${n ? 'got' : ''}">${n ? (cb.map(t => TRAIT_NAME[t]).join('+') || 'ノーマル') : '？？？'}<small>${n ? n + '個' : ''}</small></div>`;
      }).join('') + '</div>';
      return h;
    }
    return '';
  }

  // ----- 操作 -----
  const ACT = {
    close: () => close(),
    buy: d => buy(d.s, +d.i, +d.n),
    slotsel: (d, e) => {
      const sl = S.shelf[+d.i], id = +e.value || null; sl.sid = id;
      const st = id && S.slimes.find(x => x.id === id); sl.price = st ? st.fair : 0;
      S.shelf.forEach((o, j) => { if (j !== +d.i && o.sid === id && id) { o.sid = null; o.price = 0; } });
      World.refreshShelf(); paint();
    },
    price: d => { const sl = S.shelf[+d.i]; sl.price = Math.max(10, sl.price + +d.d); World.refreshShelf(); paint(); },
    tab: d => { tab = d.t; paint(); },
    upgrade: d => {
      const def = upgradeDefs().find(x => x[0] === d.k), cur = S.up[d.k], nx = def[2][cur + 1];
      if (!nx || S.money < nx.cost) return;
      S.money -= nx.cost; S.up[d.k]++; sfx('ok');
      if (d.k === 'shelf') while (S.shelf.length < SHELF_N[S.up.shelf].v) S.shelf.push({ sid: null, price: 0 });
      toast(`${def[1]}を「${nx.name}」にした！`, 'good'); World.refreshShelf(); paint();
    },
    hire: d => {
      const r = ROLES[d.r]; if (S.money < r.hire) return;
      S.money -= r.hire;
      const used = S.staff.map(s => s.name), nm = pick(STAFF_NAMES.filter(n => !used.includes(n)).concat(['ハナ']));
      S.staff.push({ id: S.nid++, role: d.r, name: nm, skill: rnd(0.25, 0.6), tag: pick(STAFF_TAGS).id, recipeId: null, prog: 0 });
      sfx('ok'); toast(`${nm}が${r.name}として働いてくれることになった！`, 'good'); World.refreshStaff(); paint();
    },
    fire: d => askConfirm('本当にやめてもらいますか？', 'やめてもらう', () => { S.staff = S.staff.filter(s => s.id !== +d.id); World.refreshStaff(); paint(); }, true),
    setrecipe: (d, e) => { const sf = S.staff.find(s => s.id === +d.id); sf.recipeId = +e.value || null; sf.prog = 0; paint(); },
    ab: d => { S.autoBuy[d.id] = Math.max(0, (S.autoBuy[d.id] || 0) + +d.d); paint(); },
    delrecipe: d => askConfirm('このレシピを消しますか？', '消す', () => { S.recipes = S.recipes.filter(r => r.id !== +d.id); S.staff.forEach(s => { if (s.recipeId === +d.id) s.recipeId = null; }); paint(); }, true),
    endday: () => askConfirm('今日を終えて決算に進みますか？', '決算へ', () => { close(); endDay(); }),
    save: () => { saveGame(); toast('セーブした'); },
    mute: () => { S.mute = !S.mute; paint(); },
    reset: () => askConfirm(NEW_WARN, 'はじめから', () => resetGame(), true),
    reset2: () => resetGame(),
    nextday: () => nextDay(),
    gameover: () => { },
    touchres: () => { const p = pending; close(); Workshop.touch(p.res.slime, () => openResult(p.res, p.amt, p.stir)); },
    touchst: d => { const st = S.slimes.find(x => x.id === +d.id); if (!st) return; close(); Workshop.touch(st, () => openOffice('stock')); },
    touchsh: d => { const st = S.slimes.find(x => x.id === +d.id); if (!st) return; close(); Workshop.touch(st, () => openShelf()); },
    discard: () => { Workshop.clearBowl(); close(); pending = null; },
    resume: () => { close(); pending = null; },
    accept: () => accept(),
  };
  function resetGame() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    close(); S = newState(); newDay(); S.day = 1; startGame(S); howto();
  }
  function bind() {
    const m = el();
    m.addEventListener('click', e => {
      if (e.target === m && !opts.noClose) return close();
      const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'OPTION') return;
      if (b.disabled) return;
      const f = ACT[b.dataset.act]; if (f) { f(b.dataset, b); sfx('pop'); }
    });
    m.addEventListener('change', e => { const b = e.target.closest('select[data-act]'); if (b) ACT[b.dataset.act](b.dataset, b); });
    addEventListener('keydown', e => { if (e.code === 'Escape' && open && !opts.noClose) close(); });
  }
  function howto() {
    openUI(() => `<h2>🧴 スライムショップへようこそ！</h2>
      <div class="card"><b>あそびかた</b><ol>
      <li><b>WASD</b>で歩く、<b>ドラッグ</b>で視点、<b>ホイール</b>でズーム、<b>Shift</b>でダッシュ。光る▼の近くで<b>Eキー</b>。</li>
      <li>お店の奥の<b>工房</b>でスライムを作る。材料のボタンを<b>長押し</b>で注ぎ、画面を<b>ドラッグ</b>してこねて、<b>完成</b>！</li>
      <li>洗濯ノリを基準に、ホウ砂水・水・泡の<b>割合</b>が大事。本物と同じで、<b>水はノリより多め</b>（ノリ1：水2くらい）がうまくいく。入れすぎると失敗、ギリギリを攻めると個性派スライムになって高く売れる。</li>
      <li>左のかべの<b>棚</b>に並べて値段をつける。お客さんは好みと値段で買っていく。</li>
      <li>材料がなくなったら、町の<b>お店</b>へ仕入れに行こう。</li>
      <li>お金がたまったら<b>事務机</b>で設備を強化したり、従業員を雇おう。</li></ol>
      <small class="sub">営業時間は10:00〜19:00。お店にいないとき、店番がいないとお客さんは帰ってしまう。</small></div>
      <div class="row end"><button class="main" data-act="close">はじめる</button></div>`, {});
  }
  return { open: openUI, close, paint, toast, openShop, openShelf, openOffice, openResult, bind, howto, isOpen: () => open };
})();

// =====================================================
//  起動・メインループ
// =====================================================
function updateHUD() {
  const rl = repLevel(), open = S.min >= 600 && S.min < 1140;
  const bagW = Math.round(weightOf(S.bag));
  const warn = open && !hasStaff('clerk').length && World.area !== 'shop' ? '<span class="warn">⚠ お店にだれもいない！</span>' : '';
  document.getElementById('hud').innerHTML =
    `<span class="chip money">${yen(S.money)}</span><span class="chip">${S.day}日目 <b>${fmtTime(S.min)}</b> ${open ? '<em class="open">営業中</em>' : '<em>準備中</em>'}</span>
     <span class="chip">${WEATHERS[S.weather].icon}${WEATHERS[S.weather].name}</span><span class="chip">${'★'.repeat(rl)}${'☆'.repeat(5 - rl)}</span>
     <span class="chip">🎒${bagW}/${bagCap()}</span>${S.trend ? `<span class="chip">📈${TRAIT_NAME[S.trend]}</span>` : ''}${warn}`;
}
function boot() {
  UI.bind();
  if (/[?&]thumb/.test(location.search)) document.body.classList.add('thumb');
  World.init(document.getElementById('c'));
  const saved = loadSave();
  const t = document.getElementById('title');
  document.getElementById('btnContinue').style.display = saved ? '' : 'none';
  const begin = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    const st = newState(); S = st; newDay(); S.day = 1; startGame(S); UI.howto();
  };
  document.getElementById('btnNew').onclick = () => {
    if (loadSave()) askConfirm(NEW_WARN, 'はじめから', begin, true); else begin();
  };
  document.getElementById('btnContinue').onclick = () => { startGame(Object.assign(newState(), saved)); };
  document.getElementById('wsFinish').onclick = () => Workshop.finish();
  document.getElementById('wsDump').onclick = () => Workshop.dump();
  document.getElementById('wsExit').onclick = () => Workshop.exit();
  document.getElementById('wsTouchExit').onclick = () => Workshop.exit();
  document.getElementById('btnHelp').onclick = () => { if (started && !UI.isOpen()) UI.howto(); };
  let last = performance.now(), acc = 0, sec = 0, saveT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (started) {
      if (!UI.isOpen() && !ending) {
        acc += dt * 2;                           // 実時間0.5秒 = ゲーム内1分
        while (acc >= 1 && !ending) { acc -= 1; tickMinute(); }
        sec += dt; saveT += dt;
        if (sec > 1) { sec = 0; World.setEnvironment(S.min, S.weather); }
        if (saveT > 60) { saveT = 0; saveGame(); }
      }
      hudT -= dt; if (hudT <= 0) { hudT = 0.2; updateHUD(); }
      document.body.classList.toggle('in-ws', Workshop.active); document.body.classList.toggle('in-ui', UI.isOpen());
    }
    World.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
window.addEventListener('DOMContentLoaded', boot);
