'use strict';
// ====== ゲーム本体（状態・時間・お客さん・従業員・画面）======
const DEBUG = /[?&]debug(=|&|$)/.test(location.search);   // URLに ?debug を付けたときだけ、デバッグメニューが使える
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
const newSns = () => ({ followers: 8, posts: [], posted: { day: 0, n: 0 }, boost: { day: 0, segs: [] }, viralDay: 0, ugc: [], likesTotal: 0 });
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
    today: { sold: 0, rev: 0, missed: 0, made: 0, failed: 0, empty: 0, high: 0, taste: 0, budget: 0, likes: 0, fol: 0 }, debt: 0, nid: 1, mute: false, totalSold: 0,
    area: 'shop', pos: null,
    sns: { followers: 8, posts: [], posted: { day: 0, n: 0 }, boost: { day: 0, segs: [] }, viralDay: 0, ugc: [], likesTotal: 0 },
    weapon: 'broom', weapons: { broom: true }, labUnlocked: false, bossDay: 0, bossDays: {}, flags: {}, hp: 100, maxHp: 100,
  };
}

// ---------- 数値まわり ----------
const repLevel = () => { let l = 1; REP_STEPS.forEach((v, i) => { if (S.repPts >= v) l = i + 1; }); return l; };
const bagSpeed = () => BAG[S.up.bag].speed;
const bagCap = () => BAG[S.up.bag].v;
const storeCap = () => STORE_CAP[S.up.store].v;
const weightOf = d => Object.keys(d).reduce((a, id) => a + (ITEMS[id] ? ITEMS[id].w * d[id] : 0), 0);
// 冒険で手に入れたものをバッグに入れる
function giveItem(id, q) { const it = ITEMS[id]; if (weightOf(S.bag) + it.w * q > bagCap()) return false; S.bag[id] = (S.bag[id] || 0) + q; return true; }
const hasStaff = role => S.staff.filter(s => s.role === role && !Biz.off(s));
const clerkBonus = () => { const c = hasStaff('clerk'); return c.length ? 0.95 + 0.2 * Math.max(...c.map(x => x.skill * Biz.moodK(x))) : 1.05; };

function priceOf(shopId, i) {
  const [item, pack, base] = Biz.stock(shopId)[i];
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
  S.today = { sold: 0, rev: 0, missed: 0, made: 0, failed: 0, empty: 0, high: 0, taste: 0, budget: 0, likes: 0, fol: 0 };
  const r = Math.random();
  S.weather = r < 0.45 ? 'sunny' : r < 0.7 ? 'cloudy' : r < 0.9 ? 'rain' : 'dry';
  const W = WEATHERS[S.weather].env;
  S.env = { b: W.b + rnd(-1.2, 1.2), w: W.w + rnd(-2.5, 2.5), s: W.s + rnd(-0.8, 0.8) };
  for (const k in SHOPS) S.pf[k] = rnd(0.92, 1.1);
  const sk = pick(Object.keys(SHOPS)), st = pick(SHOPS[sk].stock);
  S.sale = Math.random() < 0.6 ? { shop: sk, item: st[0] } : null;
  S.trend = Math.random() < 0.5 ? pick(TRAITS) : null;
  Biz.morning();
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
    const rate = (2 + repLevel()) * 1.35 * SIGN[S.up.sign].v * WEATHERS[S.weather].cust * snsMul();
    if (Math.random() < rate / 60) arrival();
  }
  if (open && Math.random() < 1.2 / 60) vipVisit();
  snsTick(); Biz.festTick();
  if (S.min >= 540 && S.min < 1140) crafterTick();
  if (S.min >= 1440) endDay();
}

// ---------- お客さん ----------
function arrival() {
  const rl = repLevel(), rain = S.weather === 'rain', pool = [];
  for (const id in CUSTOMERS) { const c = CUSTOMERS[id]; if (c.needRep && rl < c.needRep) continue; let w = c.w(rl, rain); if (w > 0 && S.sns.boost && S.sns.boost.day === S.day && S.sns.boost.segs.includes(id)) w *= 2.6; if (w > 0) pool.push([id, w]); }
  let t = Math.random() * pool.reduce((a, p) => a + p[1], 0), type = pool[0][0];
  for (const p of pool) { t -= p[1]; if (t <= 0) { type = p[0]; break; } }
  const inShop = World.area === 'shop', staffed = hasStaff('clerk').length > 0 || inShop;
  if (!staffed) { S.today.missed++; return; }
  const decide = () => customerBuy(type);
  if (inShop) World.spawnVisitor(type, decide); else decide();
}
// ---- VIPと競り ----
function vipVisit() {
  const cand = S.shelf.map(sl => { const st = sl.sid && S.slimes.find(x => x.id === sl.sid); return st && st.count > 0 && (st.sec || 0) >= 0.2 ? { sl, st } : null; }).filter(Boolean);
  if (!cand.length) return;
  if (!(hasStaff('clerk').length > 0 || World.area === 'shop')) { S.today.missed++; return; }
  cand.sort((a, b) => b.st.fair - a.st.fair); const o = cand[0], fair = o.st.fair, n = 2 + ((Math.random() * 3) | 0);
  const bids = Array.from({ length: n }, () => Math.min(CUSTOMERS.vip.budget, Math.round(fair * rnd(1.3, 3.6) / 100) * 100)).sort((a, b) => b - a);
  if (bids[0] < o.sl.price) { UI.toast('🎩 VIPが秘伝のスライムを見に来たけど、値段が高すぎて帰った…', 'bad'); return; }
  const final = Math.min(bids[0], Math.max(o.sl.price, Math.round(bids[1] * 1.05 / 100) * 100));
  o.st.count--; S.money += final; S.today.sold++; S.today.rev += final; S.totalSold++; S.repPts += 12;
  const d = S.dex.cust.vip || (S.dex.cust.vip = { n: 0, loved: 0 }); d.n++; d.loved++;
  sfx('coin'); World.refreshShelf();
  if (UI.isOpen()) UI.toast(`🎩 VIPが「${o.st.name}」を競り落とした！ +${yen(final)}`, 'good'); else UI.auction(o.st.name, o.sl.price, final, n);
}
function customerBuy(typeId) {
  const type = CUSTOMERS[typeId], bonus = clerkBonus(), fans = (1 + Math.min(0.25, S.sns.followers / 800)) * Biz.interiorBonus();   // フォロワーが多いと「人気のお店」でちょっと買いやすい
  let best = null, bu = -1e9, seen = 0; const why = {};
  S.shelf.forEach((sl, i) => {
    const st = sl.sid && S.slimes.find(x => x.id === sl.sid);
    if (!st || st.count <= 0) return; seen++;
    let like = type.like(st); if (S.trend && st.traits[S.trend] > 0) like *= 1.25;
    if (typeId !== 'asmr') like *= 1 - 0.4 * (st.crunch || 0);
    { const ex = st.ex || {}, want = { nobi: ['nobi'], puni: ['puni'], asmr: ['toro', 'fuwa'], student: ['fuwa'] }[typeId] || []; for (const k of want) like *= 1 + 0.4 * Math.min(1, ex[k] || 0); }
    const willing = st.fair * like * rnd(0.95, 1.4) * bonus * fans;
    if (sl.price > type.budget) { why.budget = 1; return; }
    if (sl.price > willing) { why[like < 0.95 ? 'taste' : 'high'] = 1; return; }
    const u = willing - sl.price; if (u > bu) { bu = u; best = { i, st, like, price: sl.price }; }
  });
  if (!best) {
    const reason = seen === 0 ? 'empty' : why.high ? 'high' : why.taste ? 'taste' : 'budget';
    S.today[reason] = (S.today[reason] || 0) + 1; S.repPts = Math.max(0, S.repPts - 0.15);
    snsUgc(typeId, false, null, reason);
    return { sold: false, reason, msg: { high: '💭ちょっと高いなぁ…', taste: '💭好みのがないかも…', budget: '💭お金が足りない…', empty: '💭売り切れかぁ…' }[reason] };
  }
  const qty = type.multi && best.st.count >= 2 && Math.random() < 0.5 ? 2 : 1;
  best.st.count -= qty; S.money += best.price * qty; S.today.sold += qty; S.today.rev += best.price * qty; S.totalSold += qty;
  const before = repLevel();
  S.repPts += 1 + (best.like > 1.4 ? 1 : 0) + ({ C: 0, B: 0, A: 1, S: 2 }[best.st.q]);
  const d = S.dex.cust[typeId] || (S.dex.cust[typeId] = { n: 0, loved: 0 });
  d.n += qty; if (best.like > 1.4) d.loved++;
  sfx('coin'); UI.toast(`${type.icon} ${type.name}が「${best.st.name}」を買った！ +${yen(best.price * qty)}`, 'good');
  if (repLevel() > before) { UI.toast(`★お店の評判が${'★'.repeat(repLevel())}になった！`, 'good'); }
  snsUgc(typeId, true, best.st, null);
  if (typeId === 'asmr' && Math.random() < 0.45) Biz.stream(best.st);
  World.refreshShelf();
  return { sold: true, msg: ['😊 これください！', '✨ これがいい！', '💖 買います！'][(Math.random() * 3) | 0] };
}

// =====================================================
//  スラグラム（お店のSNS：オフライン。自分の投稿・お客さんの反応・フォロワー）
// =====================================================
const SNS_USERS = ['ぷにちゃん', 'nobi_nobi', 'スラ子', 'mochi_77', 'asmr_hunter', 'キラキラ★', 'ぷるぷる大好き', 'ふわ太', 'ひんやり部', 'slime.kids', 'おさんぽママ', 'まるまる🎩', 'かりん', 'そうた@学生', 'ゆう'];
const snsUser = () => SNS_USERS[(Math.random() * SNS_USERS.length) | 0];
const SEGS = { kid: 'こども', student: 'がくせい', nobi: 'のびのび好き', puni: 'ぷにぷに好き', asmr: 'ASMR', family: '子連れ', collector: 'コレクター' };
const snsMul = () => (1 + Math.min(2, S.sns.followers / 120)) * (S.sns.viralDay === S.day ? 1.8 : 1) * Biz.surgeMul();
function snsAppeal(sl) {
  let a = 1; for (const t of TRAITS) a += 0.9 * ((sl.traits || {})[t] || 0);
  a += 0.5 * Math.min(1, (sl.sp || 0) / 3) + 0.7 * Object.keys(sl.ft || {}).length + Math.min(1, (sl.gl || 0) / 1.2) + 0.5 * (sl.crunch || 0) + ({ C: 0, B: 0.2, A: 0.7, S: 1.3 }[sl.q] || 0) + 3 * Math.min(1, (sl.sec || 0) / 0.5);
  return a;
}
function snsPredict(sl, photo3d, tags) {
  let a = snsAppeal(sl) * (photo3d ? 1.25 : 1) * (1 + 0.12 * tags.length);
  for (const g of tags) { const l = CUSTOMERS[g].like(sl); a *= l > 1.2 ? 1.25 : l < 0.8 ? 0.85 : 1; }
  return { a, likes: Math.round((4 + S.sns.followers * 0.12) * a) };
}
function commentsFor(sl, n) {
  const pool = ['かわいい！', 'ほしい…！', 'これ気になる〜', '写真きれい📷', 'お店に行きたい！'];
  const tr = sl.traits || {}, ft = sl.ft || {};
  if (tr.fuwafuwa) pool.push('ふわふわで気持ちよさそう☁️', 'ふわふわ好き！');
  if (tr.danryoku) pool.push('ぷにぷに触りたい！', '弾力すごそう');
  if (tr.nettori) pool.push('のびのび！ すごく伸びそう', 'ねっとり系だ！');
  if (tr.torotoro) pool.push('とろとろ…最高', 'とろとろ動画も見たい');
  if (ft.hiyari) pool.push('ひんやり？ 夏にいいね🧊');
  if (ft.piri) pool.push('ぴりぴり！？ どんな感触なの⚡');
  if (ft.shuwa) pool.push('しゅわしゅわ音が聞きたい🥤');
  if (ft.mochi) pool.push('もちもち大好き🍡');
  if (ft.hokaho) pool.push('ほかほかで癒やされそう♨️');
  if ((sl.sp || 0) >= 2) pool.push('ラメきれい✨');
  if ((sl.gl || 0) >= 0.5) pool.push('暗いところで光るの！？🌙', '子供が喜びそう！');
  if ((sl.crunch || 0) > 0.1) pool.push('シャリシャリ！ ASMRにいいかも🎙️');
  if ((sl.sec || 0) >= 0.2) pool.push('これって秘伝のエキス入り…？ すごい！', 'VIPが欲しがるやつだ🎩');
  if (sl.q === 'S') pool.push('Sランク…さすがです');
  const out = []; for (let i = 0; i < n; i++) out.push({ user: snsUser(), text: pool[(Math.random() * pool.length) | 0] }); return out;
}
function snsTile(sl, size) {   // 投稿の写真（自動で、かわいく加工）
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), s = size;
  const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#fff6fb'); gr.addColorStop(1, '#d9f3e8'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.fillStyle = '#f2dcbc'; g.fillRect(0, s * 0.72, s, s * 0.28);
  if ((sl.gl || 0) >= 0.4) { const h = g.createRadialGradient(s / 2, s * 0.6, s * 0.05, s / 2, s * 0.6, s * 0.5); h.addColorStop(0, 'rgba(150,255,170,.7)'); h.addColorStop(1, 'rgba(150,255,170,0)'); g.fillStyle = h; g.fillRect(0, 0, s, s); }
  const tr = sl.traits || {}, w = s * (tr.torotoro ? 0.62 : tr.fuwafuwa ? 0.55 : 0.5), hgt = s * (tr.torotoro ? 0.2 : tr.danryoku ? 0.38 : 0.3), cx = s / 2, cy = s * 0.7;
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(cx, cy + 4, w * 0.5, hgt * 0.14, 0, 0, 7); g.fill();
  const bg = g.createRadialGradient(cx - w * 0.2, cy - hgt * 0.8, 2, cx, cy - hgt * 0.4, w * 0.6); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.25, sl.color || '#bfe8d0'); bg.addColorStop(1, sl.color || '#bfe8d0');
  g.fillStyle = bg; g.beginPath(); g.ellipse(cx, cy - hgt * 0.4, w * 0.5, hgt * 0.6, 0, 0, 7); g.fill();
  if (tr.nettori) { g.beginPath(); g.moveTo(cx - 8, cy - hgt); g.quadraticCurveTo(cx, cy - hgt * 1.9, cx + 22, cy - hgt * 2.2); g.lineTo(cx + 10, cy - hgt); g.fill(); }
  if (tr.fuwafuwa) { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(cx + Math.cos(i * 1.3) * w * 0.3, cy - hgt * 0.9 + Math.sin(i * 2.1) * hgt * 0.15, s * 0.03 + (i % 3) * 3, 0, 7); g.fill(); } }
  const gc = (sl.gcols && sl.gcols.length ? sl.gcols : []);
  for (let i = 0; i < Math.min(14, Math.round((sl.sp || 0) * 4)); i++) { const col = gc.length ? gc[i % gc.length].c : '#fff2b0'; g.fillStyle = col === 'rainbow' ? 'hsl(' + (i * 47) % 360 + ',100%,70%)' : col; const x = cx + (Math.random() - 0.5) * w * 0.8, y = cy - hgt * (0.2 + Math.random() * 0.7); g.beginPath(); g.arc(x, y, 2 + Math.random() * 2.5, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(60,40,30,.75)'; g.font = 'bold ' + Math.round(s * 0.06) + 'px sans-serif'; g.textAlign = 'center'; g.fillText(String(sl.name).slice(0, 14), cx, s * 0.93);
  return c.toDataURL('image/jpeg', 0.8);
}
function snsPost(st, img, caption, tags) {
  const sns = S.sns, pr = snsPredict(st, !!img, tags); let likes = Math.max(1, Math.round(pr.likes * rnd(0.7, 1.4)));
  const viral = Math.random() < Math.min(0.3, 0.015 * pr.a + (st.q === 'S' ? 0.05 : 0) + ((st.sec || 0) >= 0.2 ? 0.1 : 0)); if (viral) likes *= Math.round(rnd(6, 14));
  const fGain = Math.round(likes * (viral ? 0.24 : 0.1)), nC = clamp(Math.round(likes / 6), 1, 12), cms = commentsFor(st, nC);
  cms.forEach((c, i) => { c.at = (i + 1) / (nC + 1); });
  const p = { id: S.nid++, day: S.day, min: S.min, t0: S.day * 1440 + S.min, name: st.name, snap: { name: st.name, color: st.color, traits: st.traits, ft: st.ft, sp: st.sp, gl: st.gl, crunch: st.crunch, sec: st.sec, q: st.q, gcols: st.gcols }, img: img || snsTile(st, 220), real: !!img, caption, tags, likes: 0, likesTarget: likes, fGain, viral, comments: [], cmtPlan: cms, done: false };
  sns.posts.unshift(p); if (sns.posts.length > 24) sns.posts.length = 24;
  if (sns.posted.day !== S.day) sns.posted = { day: S.day, n: 0 }; sns.posted.n++;
  if (tags.length) sns.boost = { day: S.day, segs: tags.slice() };
  return p;
}
function snsTick() {
  const sns = S.sns, now = S.day * 1440 + S.min; Biz.sponsorCheck();
  for (const p of sns.posts) {
    if (p.done) continue; const pr = clamp((now - p.t0) / 300, 0, 1), ease = 1 - Math.pow(1 - pr, 2), want = Math.round(p.likesTarget * ease);
    if (want > p.likes) { const d = want - p.likes; p.likes = want; sns.likesTotal += d; S.today.likes += d; }
    while (p.cmtPlan.length && p.cmtPlan[0].at <= pr) p.comments.push(p.cmtPlan.shift());
    if (pr >= 1) { p.done = true; sns.followers += p.fGain; S.today.fol += p.fGain; if (p.viral) { sns.viralDay = S.day; UI.toast(`🔥 バズった！！ 「${p.name}」に❤${p.likes}、フォロワー+${p.fGain}！ 今日はお客さんが大行列！`, 'good'); sfx('ok'); } else UI.toast(`📱 「${p.name}」の投稿に❤${p.likes}、フォロワー+${p.fGain}（今は ${sns.followers}人）`, 'good'); }
  }
}
function snsUgc(typeId, sold, st, reason) {   // お客さんが自分で投稿・感想（反応を見る）
  const sns = S.sns; if (Math.random() > (sold ? 0.12 : 0.07)) return;
  const type = CUSTOMERS[typeId], ok = { kid: 'おうちで遊ぶ！', student: 'めっちゃかわいい✨', nobi: 'のびが最高！', puni: 'ぷにぷに最高', asmr: '音がいい…最高', collector: 'コレクションに追加！', family: '子供が大喜びでした！', vip: 'さすがの品質' }[typeId] || 'いい買い物！';
  const neg = { high: 'ちょっと高かった💦', taste: '好みのスライムがなかった…', budget: '欲しかったけどお金が足りなかった', empty: '売り切れで買えなかった…' }[reason];
  sns.ugc.unshift({ day: S.day, user: snsUser(), icon: type.icon, text: sold ? `スライム商店で「${st.name}」をGET！${ok}` : `スライム商店に行ってみた。${neg}`, likes: Math.round(sold ? rnd(3, 25) : rnd(0, 6)), good: !!sold }); sns.ugc.length = Math.min(sns.ugc.length, 30);
  if (sold) { const g = Math.round(rnd(1, 3)); sns.followers += g; S.today.fol += g; UI.toast(`📱 ${type.icon}がお店のことを投稿！ フォロワー+${g}`); }
}

// ---------- 従業員 ----------
function crafterTick() {
  for (const sf of hasStaff('crafter')) {
    const r = sf.recipeId && S.recipes.find(x => x.id === sf.recipeId);
    if (!r) { sf.msg = 'レシピ未設定'; continue; }
    const tag = STAFF_TAGS.find(t => t.id === sf.tag) || STAFF_TAGS[1];
    sf.prog = (sf.prog || 0) + tag.spd * Biz.moodK(sf);
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
      Biz.stock(sk).forEach((e, i) => { if (e[0] !== id) return; const up = priceOf(sk, i) / e[1]; if (!best || up < best.up) best = { sk, i, up, pack: e[1], price: priceOf(sk, i) }; });
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
  const sig = sl.name + sl.q + sl.color + TRAITS.map(t => Math.round((sl.traits[t] || 0) * 20)).join('') + Math.round((sl.crunch || 0) * 10) + '|' + Math.round((sl.gl || 0) * 2) + '|' + (sl.gcols || []).map(g => g.c + Math.round(g.w)).join(',') + '|' + Object.keys(sl.ex || {}).map(k => k + Math.round(sl.ex[k] * 4)).join(',') + '|' + Object.keys(sl.ft || {}).join(',');
  let st = S.slimes.find(x => x.sig === sig);
  if (st) st.count += count;
  else { st = { id: S.nid++, sig, name: sl.name, traits: sl.traits, color: sl.color, sp: sl.sp, ft: sl.ft || {}, ex: sl.ex || {}, sec: sl.sec || 0, gcols: sl.gcols || [], sn: sl.sn || 0, gl: sl.gl || 0, crunch: sl.crunch || 0, sat: sl.sat, light: sl.light, q: sl.q, fair: sl.fair, count }; S.slimes.push(st); }
  S.dex.combos[comboKey(sl.traits)] = (S.dex.combos[comboKey(sl.traits)] || 0) + count;
  S.dex.made += count; S.dex.feels = S.dex.feels || {}; for (const k in (sl.ft || {})) S.dex.feels[k] = (S.dex.feels[k] || 0) + count;
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
  const bu = buyerRun(), bz = Biz.night();
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
      ${t.high ? `<tr><td>値段が高くて帰ったお客さん</td><td class="r">${t.high}人</td></tr>` : ''}${t.taste ? `<tr><td>好みに合わず帰ったお客さん</td><td class="r">${t.taste}人</td></tr>` : ''}${t.budget ? `<tr><td>お金が足りなかったお客さん</td><td class="r">${t.budget}人</td></tr>` : ''}
      ${(t.likes || t.fol) ? `<tr><td>📱 スラグラム ❤${t.likes || 0} / フォロワー+${t.fol || 0}</td><td>${S.sns.followers}人</td></tr>` : ''}
      <tr><td>家賃</td><td class="r">-${yen(RENT)}</td></tr>
      ${wages ? `<tr><td>従業員の給料（${S.staff.length}人）</td><td class="r">-${yen(wages)}</td></tr>` : ''}
      ${bu.spent ? `<tr><td>仕入れ係の購入<br><small class="sub">${bu.lines.join('、')}</small></td><td class="r">-${yen(bu.spent)}</td></tr>` : ''}
      ${bz.html}
      <tr class="tot"><td>所持金</td><td>${yen(S.money)}</td></tr>
    </table></div>
    ${t.high > 2 ? '<p class="sub">💡 値段が高くて帰った人が多い。棚の値段を下げるか、個性（ギリギリ・エキス）を強めてみよう。スラグラムに投稿すると、お客さんも増える！</p>' : ''}
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
  if (!state.today) S.today = { sold: 0, rev: 0, missed: 0, made: 0, failed: 0, empty: 0, high: 0, taste: 0, budget: 0, likes: 0, fol: 0 };
  if (!S.sns) S.sns = newSns();
  document.getElementById('title').style.display = 'none';
  World.setArea(S.area === 'town' ? 'town' : 'shop');
  if (S.area === 'town' && S.pos) World.place(S.pos[0], S.pos[1], 0);
  World.refreshShelf(); World.refreshStaff();
  Biz.ensure(); World.applyInterior(S.interior); World.refreshBranches(S.branches.length);
  World.setEnvironment(S.min, S.weather);
}
function onAreaChange(name, prev) {
  if (Adventure.isAdv(prev) && !Adventure.isAdv(name)) Adventure.end();
  if (Adventure.isAdv(name)) Adventure.enter(name, prev);
  if (name === 'fest') Biz.enterFest();
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
  const tags = st => (TRAITS.filter(t => st.traits[t] > 0).map(t => `<span class="tag t-${t}">${TRAIT_NAME[t]} ${Math.round(st.traits[t] * 100)}%</span>`).join('') + Object.keys(st.ft || {}).map(k => `<span class="tag t-ft">${FEEL2[k].name} ${Math.round(st.ft[k] * 100)}%</span>`).join('')) || '<span class="tag">ノーマル</span>';
  const swatch = (c, sp) => `<span class="sw" style="background:radial-gradient(circle at 30% 30%,#fff9 0,${c} 55%,${c}cc 100%)">${sp >= 2 ? '✨' : ''}</span>`;
  const rankTag = q => `<span class="rank r${q}">${q}</span>`;

  // ----- 仕入れ -----
  function openShop(id) {
    const sd = SHOPS[id];
    openUI(() => {
      const rows = Biz.stock(id).map(([item, pack, base], i) => {
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
    const [item, pack] = Biz.stock(shop)[i], p = priceOf(shop, i) * n, it = ITEMS[item];
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
        <div class="grow"><input id="slName" value="${esc(sl.name)}" maxlength="30"><br>${rankTag(sl.q)} ${tags(sl)}<br>
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

  // ----- スラグラム -----
  let snsTab = 'feed', composer = null;
  const SNS_CAPS = ['今日の自信作✨', '新作できました！', 'ふわふわ！さわってみて☁️', '触り心地にこだわりました', '暗いところで光ります🌙', '秘伝のエキス入り🏺', 'ぎりぎりを攻めました！'];
  function openSocial(tab) {
    if (tab) snsTab = tab;
    openUI(() => {
      const sn = S.sns, left = 3 - (sn.posted.day === S.day ? sn.posted.n : 0), boost = sn.boost.day === S.day && sn.boost.segs.length ? sn.boost.segs.map(g => '#' + SEGS[g]).join(' ') : null;
      const head = `<div class="hd"><h2>📱 スラグラム</h2><button data-act="close">× とじる</button></div>
        <div class="prof"><div class="avatar">🧴</div><div class="pstats"><div><b>${sn.posts.length}</b><small>投稿</small></div><div><b>${sn.followers}</b><small>フォロワー</small></div><div><b>${sn.likesTotal}</b><small>いいね</small></div></div></div>
        <div class="sub">スライム商店　＠slime_shoten　${boost ? `｜ 🎯 今日の注目：${boost}（お客さん増）` : ''}${sn.viralDay === S.day ? '｜ 🔥バズり中！' : ''}</div>
        <div class="tabs"><button class="${snsTab === 'feed' ? 'on' : ''}" data-act="stab" data-t="feed">投稿</button><button class="${snsTab === 'new' ? 'on' : ''}" data-act="stab" data-t="new">＋ 新しい投稿（あと${left}回）</button><button class="${snsTab === 'ugc' ? 'on' : ''}" data-act="stab" data-t="ugc">お客さんの反応</button><button class="${snsTab === 'sp' ? 'on' : ''}" data-act="stab" data-t="sp">スポンサー</button><button class="${snsTab === 'nt' ? 'on' : ''}" data-act="stab" data-t="nt">通知${sn.unread ? '(' + sn.unread + ')' : ''}</button><button class="${snsTab === 'ev' ? 'on' : ''}" data-act="stab" data-t="ev">🎪イベント</button></div>`;
      let body = '';
      if (snsTab === 'feed') {
        body = sn.posts.length ? `<div class="sgrid">${sn.posts.map(p => `<div class="stile" data-act="postopen" data-id="${p.id}"><img src="${p.img}" alt=""><span class="lk">❤ ${p.likes}</span>${p.viral ? '<span class="vr">🔥</span>' : ''}${p.done ? '' : '<span class="pg">…</span>'}</div>`).join('')}</div>` : '<p class="sub">まだ投稿がありません。「＋ 新しい投稿」からスライムを紹介しよう！ いいねがつくと、フォロワーが増えて、お客さんも増えるよ。</p>';
      } else if (snsTab === 'new') body = composerHTML(left);
      else if (snsTab === 'sp') body = Biz.sponsorHTML(); else if (snsTab === 'nt') body = Biz.notifHTML(); else if (snsTab === 'ev') body = Biz.eventsHTML();
      else body = (sn.ugc.length ? sn.ugc.map(u => `<div class="ug ${u.good ? 'g' : ''}"><span class="ic2">${u.icon}</span><div class="grow"><b>${esc(u.user)}</b>${u.good ? '' : ' <span class="tag">ひとこと</span>'}<br>${esc(u.text)}<br><small class="sub">❤ ${u.likes}・${u.day}日目</small></div></div>`).join('') : '<p class="sub">お客さんの投稿はまだありません。お店で買い物をしてくれた人や、買わずに帰った人が、感想を書き込むことがあります。ここで反応を見て、値段や商品を考えよう。</p>');
      return head + `<div class="scroll">${body}</div>`;
    }, { cls: 'wide' });
  }
  function composerHTML(left) {
    const stacks = S.slimes.filter(x => x.count > 0);
    if (!stacks.length) return '<p class="sub">投稿できるスライムがありません。工房で作ろう！</p>';
    if (!composer || !stacks.find(x => x.id === composer.sid)) composer = { sid: stacks[0].id, photo: null, caption: SNS_CAPS[0], tags: [] };
    const st = stacks.find(x => x.id === composer.sid), tile = composer.photo || snsTile(st, 220), pr = snsPredict(st, !!composer.photo, composer.tags), stars = Math.min(5, Math.max(1, Math.round(pr.a * 1.1)));
    return `<div class="comp"><img class="cimg" src="${tile}" alt="">
      <div class="grow"><label class="sub">投稿するスライム</label><br><select data-act="cpick">${stacks.map(x => `<option value="${x.id}" ${x.id === composer.sid ? 'selected' : ''}>${esc(x.name)}（残${x.count}）</option>`).join('')}</select>
      <p class="sub">${composer.photo ? '📸 3Dで撮った写真を使います（人気アップ！）' : '写真は自動できれいに加工されます。「さわる」画面で📸を押すと、3Dで撮った写真で投稿できる（人気アップ）'}</p></div></div>
      <label class="sub">ひとこと</label><div class="chips">${SNS_CAPS.map(c => `<button class="mini ${composer.caption === c ? 'on' : ''}" data-act="ccap" data-c="${esc(c)}">${c}</button>`).join('')}</div>
      <input id="cpCap" value="${esc(composer.caption)}" maxlength="40" style="width:100%;margin:6px 0">
      <label class="sub">ハッシュタグ（2つまで。選んだお客さんが、今日たくさん来る！）</label><div class="chips">${Object.keys(SEGS).map(g => `<button class="mini ${composer.tags.includes(g) ? 'on' : ''}" data-act="ctag" data-g="${g}">#${SEGS[g]}</button>`).join('')}</div>
      <div class="card">予想の反応：<b>${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</b>　<small class="sub">（フォロワー${S.sns.followers}人・個性が強い／ラメ／光る／3D写真／好みの合うタグで上がる。ときどき「バズる」！）</small></div>
      <div class="row end"><button class="main" data-act="cpost" ${left <= 0 ? 'disabled' : ''}>📤 投稿する（今日あと${left}回）</button></div>`;
  }
  function openPostDetail(id) {
    const p = S.sns.posts.find(x => x.id === +id); if (!p) return;
    openUI(() => `<div class="hd"><h2>📱 投稿</h2><button data-act="snsback">← もどる</button></div><img class="bigimg" src="${p.img}" alt="">
      <div class="row between"><b>❤ ${p.likes}${p.viral ? ' 🔥バズり！' : ''}</b><span class="sub">${p.day}日目 ${fmtTime(p.min)}　${p.done ? '反応が出そろった' : '反応を待っています…'}</span></div>
      <div class="bar"><i style="width:${Math.min(100, p.likes / Math.max(1, p.likesTarget) * 100)}%"></i></div>
      <p><b>slime_shoten</b>　${esc(p.caption)}<br>${p.tags.map(g => '<span class="tag">#' + SEGS[g] + '</span>').join('')}</p>
      <div class="scroll">${p.comments.length ? p.comments.map(c => `<div class="ug"><div class="grow"><b>${esc(c.user)}</b>　${esc(c.text)}</div></div>`).join('') : '<p class="sub">コメントはまだありません。</p>'}</div>`, { cls: 'wide' });
  }
  function openPost(sid, photo) {   // 3Dで撮った写真つきで、投稿画面を開く
    snsTab = 'new'; composer = { sid: +sid, photo: photo || null, caption: SNS_CAPS[0], tags: [] }; openSocial('new');
  }

  // ----- 友達の家 -----
  function openLab() {
    openUI(() => {
      const have = (S.bag.extract_secret || 0) + (S.stock.extract_secret || 0);
      let body;
      if (!S.labUnlocked) {
        body = `<p>🧑‍🔬「やあ！ スライムの研究をしてるんだ。山の奥の泉に、<b>秘伝のスライムエキス</b>があるって噂を知ってる？ ヌシの<b>キングスライム</b>が守ってるらしいよ。持ってきてくれたら、成分を調べて<b>同じものを作ってあげる</b>！」</p>
        ${have > 0 ? '<div class="row end"><button class="main" data-act="labshow">🏺 秘伝のエキスを見せる（1つ渡す）</button></div>' : '<p class="sub">（秘伝のスライムエキスを持っていない。山の奥へ冒険に出よう！）</p>'}`;
      } else {
        const it = ITEMS.extract_secret, can = S.money >= 5000 && weightOf(S.bag) + it.w * 3 <= bagCap();
        body = `<p>🧑‍🔬「成分は完全に解析したよ！ <b>5000円で3回分</b>、作ってあげる。これを入れたスライムは、VIPが競り合うほど人気になるはずさ！」</p>
        <div class="item"><span class="ic" style="background:${it.color}">${it.icon}</span><div class="grow"><b>${it.name}（3回分）</b><br><small class="sub">${it.note}　（持ち物 ${Math.floor(have)}回）</small></div><b class="price">${yen(5000)}</b><button data-act="labbuy" ${can ? '' : 'disabled'}>買う</button></div>`;
      }
      return `<div class="hd"><h2>🔬 科学オタクの友達の家</h2><button data-act="close">× とじる</button></div><div class="row between"><span>所持金 <b>${yen(S.money)}</b></span><span>🎒 ${Math.round(weightOf(S.bag))} / ${bagCap()}</span></div>${body}
        <details><summary class="sub">スライムエキスのこと</summary><p class="sub">山の魔物を倒すと、スライムエキスを落とすよ。種類によって、とれるエキスがちがう。スライムに入れると、入れた分だけ価値が上がる（秘伝はケタちがい）。</p></details>`;
    }, { cls: 'wide' });
  }
  function openSmith() {
    openUI(() => {
      const rows = WEAPONS.filter(w => w.unlock !== 'chest' || S.weapons[w.id]).map(w => {
        const own = !!S.weapons[w.id], eq = S.weapon === w.id, open = unlockOk(w);
        if (!own && !open) return `<div class="item" style="opacity:.6"><div class="grow"><b>？？？（${esc(w.name.replace(/./g, '？').slice(0, 5))}）</b><br><small class="sub">解放の条件：${w.need}</small></div><b class="price">🔒</b></div>`;
        return `<div class="item"><div class="grow"><b>${w.name}</b> ${eq ? '<span class="tag sale">そうび中</span>' : ''}<br><small class="sub">${w.el ? ELEMENTS[w.el].icon + ELEMENTS[w.el].name + '属性・' : ''}こうげき ${w.atk}・とどく ${w.reach}・${w.arc >= 360 ? 'ぐるっと全方向' : '前方'}・${w.desc}</small></div>
          ${own ? `<button data-act="smithequip" data-id="${w.id}" ${eq ? 'disabled' : ''}>そうびする</button>` : `<b class="price">${yen(w.price)}</b><button data-act="smithbuy" data-id="${w.id}" ${S.money < w.price ? 'disabled' : ''}>買う</button>`}</div>`;
      }).join('');
      return `<div class="hd"><h2>🔧 エンジニアの友達の家</h2><button data-act="close">× とじる</button></div><p>🧑‍🏭「冒険に行くのか？ 武器ならいろいろあるぜ。値段はそれなりだけどな！」</p><div class="row between"><span>所持金 <b>${yen(S.money)}</b></span></div><div class="scroll">${rows}</div>`;
    }, { cls: 'wide' });
  }
  let auc = null;
  function openAuction(name, start, final, n) {
    const steps = []; let p = start; const k = 7 + ((Math.random() * 4) | 0);
    for (let i = 1; i <= k; i++) steps.push(Math.round((start + (final - start) * Math.pow(i / k, 1.6)) / 100) * 100);
    steps[steps.length - 1] = final; auc = { name, steps, i: -1, final, n, done: false };
    openUI(() => {
      const a = auc, cur = a.i >= 0 ? a.steps[a.i] : start;
      return `<h2>🔨 競りが始まった！</h2><p>🎩 VIPが <b>${a.n}人</b>、「<b>${esc(a.name)}</b>」をめぐって競り合っている…！</p>
        <div class="card center" style="text-align:center"><div style="font-size:42px;font-weight:bold;color:#b87800">${yen(cur)}</div><div class="sub">${a.done ? '' : a.i < 0 ? 'スタート！' : ['VIPがつり上げた！', 'まだ上がる！', 'すごい競り合い！'][a.i % 3]}</div></div>
        ${a.done ? `<p><b>🎉 落札！ ${yen(a.final)}</b></p><div class="row end"><button class="main" data-act="close">やったー！</button></div>` : ''}`;
    }, { noClose: true });
    const iv = setInterval(() => { if (!open || !auc || auc.done) { clearInterval(iv); return; } auc.i++; if (auc.i >= auc.steps.length - 1) { auc.done = true; sfx('ok'); clearInterval(iv); } else sfx('tick'); paint(); }, 650);
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
    tab = t || 'today';
    openUI(() => {
      const head = `<div class="hd"><h2>🖥️ 事務机</h2><button data-act="close">× とじる</button></div><div class="tabs">${TABS.map(x => `<button class="${tab === x[0] ? 'on' : ''}" data-act="tab" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>`;
      let body; try { body = officeBody(); } catch (e) { console.error(e); body = '<p class="warn">このタブを表示できませんでした（' + esc(String(e.message)) + '）。ほかのタブを選んでね。</p>'; }
      return head + `<div class="scroll">${body}</div>`;
    }, { cls: 'wide' });
  }
  function officeBody() {
    const rl = repLevel();
    if (tab === 'today') {
      const nx = REP_STEPS[rl] ? `（次の★まで あと${Math.ceil(REP_STEPS[rl] - S.repPts)}）` : '（最高！）';
      return `<div class="card"><b>${S.day}日目 ${fmtTime(S.min)}</b>　${WEATHERS[S.weather].icon} ${WEATHERS[S.weather].name}<br>
        <small class="sub">${envHints().join(' / ')}</small><br>${S.trend ? `📈 流行：<b>${TRAIT_NAME[S.trend]}</b><br>` : ''}
        評判 ${'★'.repeat(rl)}${'☆'.repeat(5 - rl)} ${nx}<br>営業時間 10:00〜19:00　家賃 ${yen(RENT)}/日　給料 ${yen(S.staff.reduce((a, s) => a + (ROLES[s.role] ? ROLES[s.role].wage : 0), 0))}/日</div>
        <div class="card"><b>今日のここまで</b><br>売れた ${S.today.sold}個 / 売上 ${yen(S.today.rev)} / 作った ${S.today.made}個
        ${S.today.missed ? ` / 逃したお客さん ${S.today.missed}人（店番を雇おう）` : ''}</div>
        <div class="row"><button class="main" data-act="endday">今日を終える（決算へ）</button><button data-act="save">セーブ</button>
        ${DEBUG ? '<button data-act="debug">🛠 デバッグ</button>' : ''}<button data-act="mute">効果音：${S.mute ? 'OFF' : 'ON'}</button><button class="danger" data-act="reset">はじめから</button></div>
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
        h += `<div class="card"><div class="row between"><b>${(ROLES[sf.role] || ROLES.clerk).icon} ${sf.name}（${(ROLES[sf.role] || ROLES.clerk).name}）</b><span>${Biz.face(sf.mood == null ? 70 : sf.mood)} 機嫌${Math.round(sf.mood == null ? 70 : sf.mood)} <span class="tag">${tag ? tag.name : ''}</span>${S.absent && S.absent[sf.id] ? ' <span class="tag sale">欠席中</span>' : ''}${sf.branch ? ' <span class="tag">支店の店長</span>' : ''} 腕前 ${Math.round(sf.skill * 100)}</span></div>`;
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
      const fk = Object.keys(FEEL2); h += '<h3>エキスの感触（作ると記録される）</h3><div class="combos">' + fk.map(k => { const n = (S.dex.feels || {})[k]; return `<div class="cb ${n ? 'got' : ''}">${n ? FEEL2[k].name : '？？？'}<small>${n ? FEEL2[k].desc : ''}</small></div>`; }).join('') + '</div>' + ((S.dex.rare || 0) ? `<p class="sub">✨ めずらしい音を ${S.dex.rare}回 聞いた</p>` : '');
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
      S.staff.push({ id: S.nid++, role: d.r, name: nm, mood: 80, skill: rnd(0.25, 0.6), tag: pick(STAFF_TAGS).id, recipeId: null, prog: 0 });
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
    labshow: () => { const from = S.bag.extract_secret > 0 ? S.bag : S.stock; from.extract_secret -= 1; if (from.extract_secret <= 0) delete from.extract_secret; S.labUnlocked = true; sfx('ok'); toast('🔬 成分を解析できた！ これからは5000円で3回分、買えるようになった！', 'good'); paint(); },
    labbuy: () => { if (S.money < 5000 || !giveItem('extract_secret', 3)) return toast('お金かバッグの空きが足りない', 'bad'); S.money -= 5000; sfx('buy'); toast('🏺 秘伝のスライムエキス（3回分）を買った！', 'good'); paint(); },
    smithbuy: d => { const w = WEAPONS.find(x => x.id === d.id); if (!w || S.money < w.price) return; S.money -= w.price; S.weapons[w.id] = true; S.weapon = w.id; Adventure.refreshWeapon(); sfx('ok'); toast(`${w.name}を手に入れて、そうびした！`, 'good'); paint(); },
    smithequip: d => { if (S.weapons[d.id]) { S.weapon = d.id; Adventure.refreshWeapon(); sfx('pop'); paint(); } },
    stab: d => { snsTab = d.t; paint(); },
    cpick: (d, e) => { composer.sid = +e.value; composer.photo = null; paint(); },
    ccap: d => { composer.caption = d.c; paint(); },
    ctag: d => { const t = composer.tags, i = t.indexOf(d.g); if (i >= 0) t.splice(i, 1); else if (t.length < 2) t.push(d.g); paint(); },
    postopen: d => openPostDetail(d.id),
    snsback: () => openSocial('feed'),
    cpost: () => {
      const st = S.slimes.find(x => x.id === composer.sid), left = 3 - (S.sns.posted.day === S.day ? S.sns.posted.n : 0);
      if (!st || left <= 0) return; const cap = (document.getElementById('cpCap') || {}).value || composer.caption;
      const p = snsPost(st, composer.photo, cap, composer.tags.slice()); composer = null; sfx('ok');
      toast(`📤 投稿した！ いいねを待とう…（フォロワー ${S.sns.followers}人）${p.tags.length ? ' 今日は選んだお客さんが増えるよ' : ''}`, 'good'); openSocial('feed');
    },
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
    m.addEventListener('input', e => { if (e.target.id === 'cpCap' && composer) composer.caption = e.target.value; });
    m.addEventListener('change', e => { const b = e.target.closest('select[data-act]'); if (b) ACT[b.dataset.act](b.dataset, b); });
    addEventListener('keydown', e => { if (e.code === 'Escape' && open && !opts.noClose) close(); });
  }
  function howto() {
    openUI(() => `<h2>⚔🧴 スラバト商店へようこそ！</h2>
      <div class="card"><b>あそびかた</b><ol>
      ${document.body.classList.contains('touch') ? '<li>左下の<b>スティック</b>で歩く、画面を<b>ドラッグ</b>で視点、<b>2本指</b>でズーム。光る▼の近くで、右下の<b>黄色いボタン</b>。山では<b>⚔ボタン</b>で攻撃。</li>' : '<li><b>WASD</b>で歩く、<b>ドラッグ</b>で視点、<b>ホイール</b>でズーム、<b>Shift</b>でダッシュ。光る▼の近くで<b>Eキー</b>。</li>'}
      <li>お店の奥の<b>工房</b>でスライムを作る。材料のボタンを<b>長押し</b>で注ぎ、画面を<b>ドラッグ</b>してこねて、<b>完成</b>！</li>
      <li>洗濯ノリを基準に、ホウ砂水・水・泡の<b>割合</b>が大事。本物と同じで、<b>水はノリより多め</b>（ノリ1：水2くらい）がうまくいく。入れすぎると失敗、ギリギリを攻めると個性派スライムになって高く売れる。</li>
      <li>左のかべの<b>棚</b>に並べて値段をつける。お客さんは好みと値段で買っていく。</li>
      <li>材料がなくなったら、町の<b>お店</b>へ仕入れに行こう。</li>
      <li>お金がたまったら<b>事務机</b>で設備を強化したり、従業員を雇おう。</li>
      <li><b>冒険</b>：町の<b>いちばん東のはしの門</b>から山へ。魔物を倒して<b>スライムエキス</b>を集めよう（Space/⚔で攻撃）。分かれ道・洞窟・隠し儀式もある。エンジニアの家で<b>属性つきの武器</b>が買える（ボスを倒すと新しい武器が解放）。</li>
      <li>100円ショップの<b>スノーパウダー</b>（シャリシャリ）と<b>蓄光パウダー</b>（暗いところで光る。子供・子連れに人気）は、入れすぎても失敗しないけど、そのぶん値段が高くなる。</li></ol>
      <small class="sub">営業時間は10:00〜19:00。お店にいないとき、店番がいないとお客さんは帰ってしまう。</small></div>
      <div class="row end"><button class="main" data-act="close">はじめる</button></div>`, {});
  }
  return { reg: m => Object.assign(ACT, m), open: openUI, close, paint, toast, openSocial, openPost, openLab, openSmith, auction: openAuction, openShop, openShelf, openOffice, openResult, bind, howto, isOpen: () => open };
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
     <span class="chip">🎒${bagW}/${bagCap()}</span>${S.trend ? `<span class="chip">📈${TRAIT_NAME[S.trend]}</span>` : ''}${Biz.surgeOn() ? `<span class="chip surge">📣 配信効果！お客さん殺到中</span>` : ''}${Biz.eventToday() ? `<span class="chip surge">🎪 ${Biz.eventToday().name}開催中！${Biz.fireworksOn() ? ' 🎆' : ''}</span>` : ''}${Biz.boothStatus()}${warn}`;
  document.getElementById('btnSns').dataset.n = S.sns.unread || 0;
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
  document.getElementById('btnAtk').addEventListener('pointerdown', e => { Adventure.attack(); e.preventDefault(); });
  document.getElementById('wsTouchExit').onclick = () => Workshop.exit();
  for (const id of ['wsDark', 'wsDark2']) document.getElementById(id).onclick = () => Workshop.toggleDark();
  document.getElementById('wsTwo').onclick = () => Workshop.toggleTwo();
  document.getElementById('btnSns').onclick = () => { if (started && !UI.isOpen() && !ending) UI.openSocial(); };
  document.getElementById('wsPhoto').onclick = () => Workshop.photo();
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
      document.body.classList.toggle('in-ws', Workshop.active); document.body.classList.toggle('in-ui', UI.isOpen()); document.body.classList.toggle('in-adv', Adventure.isAdv(World.area));
    }
    World.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
window.addEventListener('DOMContentLoaded', boot);
