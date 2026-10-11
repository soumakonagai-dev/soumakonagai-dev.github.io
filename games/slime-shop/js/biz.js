'use strict';
// ====== スポンサー・町のテレポート・飲み会・インテリア・支店・ASMR配信 ======
const SPONSORS = {
  norinori: { name: 'ノリノリ工業', icon: '🏭', need: 30, trait: 'nettori', want: 'のびのび系', desc: '洗濯ノリのメーカー', items: [{ item: 'glue_silk', at: 2, pack: 500, price: 520 }, { item: 'glue_gel', at: 5, pack: 500, price: 780 }] },
  hosan: { name: 'ホウサン堂', icon: '🧪', need: 80, trait: 'danryoku', want: 'ぷにぷに系', desc: 'ホウ砂水のメーカー', items: [{ item: 'borax_mild', at: 2, pack: 300, price: 420 }, { item: 'borax_fine', at: 5, pack: 300, price: 680 }] },
  fuwari: { name: 'ふわりソープ', icon: '🫧', need: 150, trait: 'fuwafuwa', want: 'ふわふわ系', desc: 'ハンドソープのメーカー', items: [{ item: 'soap_cloud', at: 2, pack: 300, price: 380 }, { item: 'soap_pop', at: 5, pack: 300, price: 520 }] },
  kirameki: { name: 'キラメキ商会', icon: '💎', need: 300, sparkle: true, want: 'ラメたっぷり系', desc: 'ラメと絵の具のメーカー', items: [{ item: 'glitter_holo', at: 2, pack: 10, price: 320 }, { item: 'paint_neon', at: 5, pack: 10, price: 260 }] },
};
const TOWNS = {
  neon: { name: 'ネオン街', icon: '🌃', cost: 12000, rep: 2, ox: 7000, what: '居酒屋で、社員と飲み会' },
  deco: { name: 'インテリア通り', icon: '🛋️', cost: 25000, rep: 3, ox: 8000, what: '家具屋で、お店の模様がえ' },
  biz: { name: 'ビジネス街', icon: '🏢', cost: 50000, rep: 4, ox: 9000, what: '不動産屋で、別の店舗を建てる' },
};
const PARTY = [
  { id: 'light', name: 'ちょい飲み', per: 800, mood: 25, min: 60, text: '軽く一杯。' },
  { id: 'full', name: 'しっかり宴会', per: 2000, mood: 50, min: 90, text: 'おいしいものをたっぷり。' },
  { id: 'grand', name: '豪華な大宴会', per: 4500, mood: 90, min: 120, skill: 0.03, text: '貸し切りで大さわぎ！ 腕前も上がる。' },
];
const DECO = {
  floor: [{ id: 'wood', name: 'ウッド', price: 0, c: 0xc79a62, type: 'wood' }, { id: 'tile', name: '白タイル', price: 3000, c: 0xe8e8ee, type: 'tile' }, { id: 'dark', name: '黒ウッド', price: 3500, c: 0x6a4a38, type: 'wood' }, { id: 'mintc', name: 'ミントのカーペット', price: 4000, c: 0x9fe0c8, type: 'tile' }],
  wall: [{ id: 'cream', name: 'クリーム', price: 0, c: 0xfde6cf }, { id: 'mint', name: 'ミント', price: 2000, c: 0xcdf0e0 }, { id: 'pink', name: 'ピンク', price: 2000, c: 0xffd6e2 }, { id: 'navy', name: 'ソーダブルー', price: 3000, c: 0xaab8e0 }],
  rug: [{ id: 'pink', name: 'ピンク', price: 0, c: 0xf0709a }, { id: 'blue', name: 'ブルー', price: 1500, c: 0x5aa8f0 }, { id: 'yellow', name: 'イエロー', price: 1500, c: 0xf0c84a }, { id: 'purple', name: 'パープル', price: 1500, c: 0xa07ae0 }],
  decor: [{ id: 'plant', name: '観葉植物', price: 2500, icon: '🪴' }, { id: 'poster', name: 'ポスター', price: 1800, icon: '🖼️' }, { id: 'neon', name: 'ネオンサイン', price: 6000, icon: '🪧' }, { id: 'sofa', name: 'ふわふわソファ', price: 5000, icon: '🛋️' }, { id: 'chandelier', name: 'シャンデリア', price: 8000, icon: '💡' }, { id: 'aquarium', name: '水槽', price: 12000, icon: '🐠' }],
};
const BRANCH_COST = [30000, 80000];

const Biz = (function () {
  const nowT = () => S.day * 1440 + S.min;
  const moodK = sf => 0.6 + 0.4 * ((sf.mood == null ? 70 : sf.mood) / 100);
  const off = sf => !!((S.absent || {})[sf.id]) || !!sf.branch;
  const face = m => m >= 75 ? '😄' : m >= 50 ? '🙂' : m >= 35 ? '😐' : '😞';
  const decorCount = () => Object.keys(S.interior.decor || {}).filter(k => S.interior.decor[k]).length;
  const interiorBonus = () => 1 + Math.min(0.18, 0.03 * decorCount());

  function ensure() {
    S.sponsors = S.sponsors || {}; S.towns = S.towns || {}; S.branches = S.branches || []; S.absent = S.absent || {};
    S.interior = S.interior || { floor: 'wood', wall: 'cream', rug: 'pink', decor: {}, owned: { wood: 1, cream: 1, pink: 1 } };
    S.interior.owned = S.interior.owned || {}; S.interior.decor = S.interior.decor || {};
    S.sns.notifs = S.sns.notifs || []; S.sns.unread = S.sns.unread || 0;
    S.staff.forEach(s => { if (s.mood == null) s.mood = 70; });
  }
  function notif(icon, text, toast) {
    S.sns.notifs.unshift({ day: S.day, min: S.min, icon, text }); S.sns.notifs.length = Math.min(S.sns.notifs.length, 30); S.sns.unread++;
    if (toast) UI.toast(icon + ' ' + text, toast === 'bad' ? 'bad' : 'good');
  }
  const surgeOn = () => !!(S.sns.surge && S.sns.surge.until > nowT());
  const surgeMul = () => surgeOn() ? S.sns.surge.mult : 1;

  // ---------- スポンサー ----------
  function sponsorCheck() {   // フォロワーが増えたら、スポンサーからPR依頼が来る
    for (const k in SPONSORS) if (!S.sponsors[k] && S.sns.followers >= SPONSORS[k].need) { S.sponsors[k] = { pr: 0, day: 0 }; notif(SPONSORS[k].icon, `${SPONSORS[k].name}から、PRのお願いが届いた！（スラグラム→スポンサー）`, true); }
  }
  const match = (sp, st) => sp.sparkle ? (st.sp || 0) >= 2 : (st.traits[sp.trait] || 0) > 0;
  const reward = (sp, k, st) => Math.round((2500 + 700 * (S.sponsors[k].pr)) * clamp(snsAppeal(st) / 2, 0.8, 2.6) / 100) * 100;
  function sponsorHTML() {
    return Object.keys(SPONSORS).map(k => {
      const sp = SPONSORS[k], so = S.sponsors[k];
      if (!so) return `<div class="card" style="opacity:.65">${sp.icon} <b>？？？</b><br><small class="sub">フォロワーが${sp.need}人になると、スポンサー候補から連絡が来る（いま ${S.sns.followers}人）</small></div>`;
      const next = sp.items.find(i => so.pr < i.at), done = so.day === S.day;
      return `<div class="card"><div class="row between"><b>${sp.icon} ${sp.name}</b><span class="tag">PR ${so.pr}回</span></div>
        <small class="sub">${sp.desc}。「<b>${sp.want}</b>のスライム」を紹介する動画をお願いされている。報酬は、スライムの人気しだい（¥2,500〜）。</small><br>
        <small>${next ? `🆕 あと${next.at - so.pr}回のPRで、新商品「${ITEMS[next.item].name}」を開発！` : '✅ 新商品は、すべて開発ずみ（ホームセンターで買える）'}</small>
        <div class="row end"><button class="main" data-act="prpick" data-s="${k}" ${done ? 'disabled' : ''}>${done ? '今日は撮影ずみ' : '🎬 PR動画を撮る'}</button></div></div>`;
    }).join('') + '<p class="sub">PR動画は、スラグラムにも「PR」として投稿されて、いいねやフォロワーが増えやすい。新しい用品を使うと、新しい感触のスライムが作れるよ。</p>';
  }
  function openPRPick(k) {
    const sp = SPONSORS[k], list = S.slimes.filter(x => x.count > 0 && match(sp, x));
    UI.open(() => `<div class="hd"><h2>${sp.icon} ${sp.name}のPR</h2><button data-act="close">× とじる</button></div><p>「<b>${sp.want}</b>」のスライムを選んでね。</p><div class="scroll">${list.length ? list.map(x => `<div class="item"><div class="grow"><b>${esc(x.name)}</b>（残${x.count}）<br><small class="sub">予想の報酬 ¥${reward(sp, k, x).toLocaleString()}</small></div><button class="main" data-act="prgo" data-s="${k}" data-id="${x.id}">この子でPR！</button></div>`).join('') : '<p class="sub">条件に合うスライムが、在庫にない。工房で作ろう！</p>'}</div>`, { cls: 'wide' });
  }
  function shoot(k, id) {
    const sp = SPONSORS[k], st = S.slimes.find(x => x.id === +id); if (!st || st.count <= 0) return;
    const msgs = ['📹 撮影中…', '💡 ライティング調整…', '🎬 編集中…', '📤 スポンサーに納品！']; let i = 0;
    UI.open(() => `<h2>${sp.icon} PR動画の撮影</h2><div class="card center" style="text-align:center;font-size:20px">${msgs[Math.min(i, 3)]}</div><div class="bar"><i style="width:${(i + 1) * 25}%"></i></div>`, { noClose: true });
    const iv = setInterval(() => {
      i++; if (i < 4) { sfx('tick'); UI.paint(); return; } clearInterval(iv);
      const so = S.sponsors[k], rw = reward(sp, k, st); S.money += rw; so.pr++; so.day = S.day; S.today.rev += 0;
      const p = snsPost(st, null, `【PR】${sp.name}さんの商品でつくりました！`, []); p.pr = k; p.likesTarget = Math.round(p.likesTarget * 1.5); p.fGain = Math.round(p.fGain * 1.3);
      if (S.sns.posted.day === S.day) S.sns.posted.n = Math.max(0, S.sns.posted.n - 1);
      const newItems = sp.items.filter(it => it.at === so.pr).map(it => ITEMS[it.item].name);
      sfx('ok'); UI.open(() => `<h2>🎉 PR完了！</h2><div class="card"><div class="row between"><span>報酬</span><b>+¥${rw.toLocaleString()}</b></div><div class="row between"><span>${sp.name}のPR</span><b>${so.pr}回</b></div></div>${newItems.length ? `<p>🆕 <b>${sp.name}が新商品を開発しました！</b><br>「${newItems.join('」「')}」が、ホームセンターで買えるようになった！</p>` : ''}<div class="row end"><button class="main" data-act="close">やったー！</button></div>`, {});
      if (newItems.length) notif(sp.icon, `${sp.name}が新商品を開発：${newItems.join('、')}（ホームセンターで発売）`);
    }, 800);
  }
  function stock(id) {   // お店の品ぞろえ（スポンサー商品を含む）
    const base = SHOPS[id].stock; if (id !== 'home') return base;
    const extra = []; for (const k in SPONSORS) { const so = S.sponsors[k]; if (so) for (const it of SPONSORS[k].items) if (so.pr >= it.at) extra.push([it.item, it.pack, it.price]); }
    return base.concat(extra);
  }

  // ---------- 通知・ASMR配信 ----------
  function notifHTML() {
    S.sns.unread = 0;
    return S.sns.notifs.length ? S.sns.notifs.map(n => `<div class="ug"><span class="ic2">${n.icon}</span><div class="grow">${esc(n.text)}<br><small class="sub">${n.day}日目 ${fmtTime(n.min)}</small></div></div>`).join('') : '<p class="sub">通知はまだありません。ASMR配信者が配信してくれたり、スポンサーから連絡が来ると、ここに届きます。</p>';
  }
  function stream(st) {   // ASMR配信者が、買ったスライムで配信してくれた！
    // フォロワーの増え方は一定：いまのフォロワーの桁（100人台なら100人、1000人台なら1000人…）が目安。1万人以上は、その桁の1〜1.5倍
    const viral = Math.random() < 0.15, f = Math.max(0, S.sns.followers);
    let gain; if (f < 100) gain = Math.max(20, Math.round(f * rnd(0.8, 1.2))); else { const tier = Math.pow(10, Math.floor(Math.log10(f))); gain = f < 10000 ? tier : Math.round(tier * rnd(1, 1.5)); }
    const viewers = Math.round(gain * 2.5); S.sns.followers += gain; S.today.fol += gain;
    S.sns.surge = { until: nowT() + (viral ? 300 : 180), mult: viral ? 4 : 2.8 };
    notif('🎙️', `ASMR配信者が「${st.name}」で配信中！ 同時視聴${viewers}人、フォロワー+${gain}！ お客さんが殺到するよ。スライムを準備して！`, true); sfx('ok');
    S.sns.ugc.unshift({ day: S.day, user: 'asmr_hunter', icon: '🎙️', text: `「${st.name}」でASMR配信やってます！ 音がすごい…視聴${viewers}人`, likes: Math.round(viewers / 3), good: true });
  }

  // ---------- 社員：機嫌・欠席・飲み会 ----------
  function morning() {
    ensure(); S.absent = {}; const names = [];
    if (S.day >= 15) for (const sf of S.staff) {
      if (sf.branch) continue; const mood = sf.mood == null ? 70 : sf.mood, p = mood < 40 ? 0.25 + (40 - mood) / 100 : 0.04;
      if (Math.random() < p) { S.absent[sf.id] = true; names.push(sf.name); }
    }
    if (names.length) { S.staff.forEach(sf => { if (!off(sf)) sf.mood = Math.max(0, sf.mood - 3 * names.length); }); notif('😷', `${names.join('、')}が今日は欠席… 仕事が増えて、忙しくなる！`, 'bad'); }
  }
  function night() {
    ensure(); let income = 0, html = '';
    const absentN = Object.keys(S.absent).length;
    for (const sf of S.staff) { sf.mood = clamp((sf.mood == null ? 70 : sf.mood) - 6 - (S.money < 0 ? 6 : 0) - (sf.branch ? 2 : 0) - (absentN && !S.absent[sf.id] ? 2 : 0) + Math.min(4, decorCount()), 0, 100); }
    for (const b of S.branches) {   // 支店の売上（自動）
      const mgr = S.staff.find(s => s.id === b.mgr), cust = Math.round((6 + repLevel() * 3 + S.sns.followers / 50) * (mgr ? 0.6 + 0.8 * moodK(mgr) : 0.4) * rnd(0.8, 1.2));
      let rev = 0, sold = 0;
      for (let i = 0; i < cust; i++) {
        const cands = S.slimes.filter(x => (b.stock[x.id] || 0) > 0).sort((a, c) => c.fair - a.fair); if (!cands.length) break;
        if (Math.random() < 0.75) { const x = cands[0]; b.stock[x.id]--; rev += Math.round(x.fair * 0.95 / 10) * 10; sold++; }
      }
      income += rev; html += `<tr><td>🏬 ${b.name}（${sold}個）</td><td class="g">+${yen(rev)}</td></tr>`;
    }
    if (income) S.money += income;
    return { income, html };
  }
  function partyHTML() {
    const n = S.staff.length;
    return `<div class="hd"><h2>🍻 居酒屋「のみ処 スラ吉」</h2><button data-act="close">× とじる</button></div>
      <p class="sub">社員とお酒を飲むと、機嫌がなおる。機嫌が悪いと、仕事がおそくなって、後半は欠席する人も出てくる。</p>
      <div class="card">${n ? S.staff.map(s => `${face(s.mood)} <b>${esc(s.name)}</b>（${ROLES[s.role].name}）<div class="bar sm"><i style="width:${s.mood}%;background:${s.mood < 35 ? '#ff6b6b' : s.mood < 60 ? '#ffd23f' : '#5fd16b'}"></i></div>`).join('') : '<span class="sub">従業員がいない。事務机で雇おう。</span>'}</div>
      ${PARTY.map(p => `<div class="item"><div class="grow"><b>${p.name}</b>　<small class="sub">1人 ${yen(p.per)}・機嫌+${p.mood}・${p.min}分${p.skill ? '・腕前アップ' : ''}<br>${p.text}</small></div><button data-act="party" data-id="${p.id}" ${!n || S.money < p.per * n ? 'disabled' : ''}>${yen(p.per * n)}</button></div>`).join('')}
      <div class="item"><div class="grow"><b>💰 ボーナスを渡す</b><br><small class="sub">1人 ¥3,000・機嫌+30・腕前が少し上がる</small></div><button data-act="bonus" ${!n || S.money < 3000 * n ? 'disabled' : ''}>${yen(3000 * n)}</button></div>`;
  }
  function doParty(id) {
    const c = PARTY.find(x => x.id === id), att = S.staff.filter(() => Math.random() > 0.08), absn = S.staff.length - att.length, cost = c.per * att.length;
    if (!att.length || S.money < cost) return;
    S.money -= cost; att.forEach(s => { s.mood = Math.min(100, (s.mood || 70) + c.mood); if (c.skill) s.skill = Math.min(0.95, s.skill + c.skill); });
    for (let i = 0; i < c.min && !ending; i++) tickMinute();
    const lines = att.map(s => `${esc(s.name)}「${['社長、ごちそうさまです！', 'スライムづくり、もっとがんばります！', 'こういう時間、いいですね〜', 'ほんと、この店で働けてよかったです', 'おかわり！'][(Math.random() * 5) | 0]}」`);
    sfx('ok'); UI.open(() => `<h2>🍻 ${c.name}</h2><div class="card">${lines.join('<br>')}</div>${absn ? `<p class="sub">（${absn}人は、欠席だった…）</p>` : ''}<p>機嫌が上がった！（−${yen(cost)}）</p><div class="row end"><button class="main" data-act="partyback">もどる</button></div>`, {});
  }
  function doBonus() {
    const n = S.staff.length, cost = 3000 * n; if (!n || S.money < cost) return;
    S.money -= cost; S.staff.forEach(s => { s.mood = Math.min(100, (s.mood || 70) + 30); s.skill = Math.min(0.95, s.skill + 0.01); }); sfx('coin'); UI.toast(`💰 ボーナスを渡した！ みんなの機嫌がよくなった（−${yen(cost)}）`, 'good'); UI.paint();
  }

  // ---------- テレポート ----------
  function goTown(name) { if (name === 'town') World.go('town', { x: -20, z: 5, rot: 0 }); else if (name === 'shop') World.go('shop'); else World.go(name, { x: TOWNS[name].ox, z: 11, rot: Math.PI }); }
  function teleportHTML() {
    return `<div class="hd"><h2>🌀 テレポーター</h2><button data-act="close">× とじる</button></div><p class="sub">行きたい町を選ぶ。一度ワープ登録すると、いつでも行ける。</p>
      <div class="item"><span class="ic">🏪</span><div class="grow"><b>自分のお店</b></div><button data-act="warp" data-t="shop">ワープ</button></div>
      <div class="item"><span class="ic">🏘️</span><div class="grow"><b>スライムの町</b></div><button data-act="warp" data-t="town">ワープ</button></div>
      ${Object.keys(TOWNS).map(k => { const t = TOWNS[k], have = S.towns[k], ok = repLevel() >= t.rep; return `<div class="item"><span class="ic">${t.icon}</span><div class="grow"><b>${t.name}</b><br><small class="sub">${t.what}${have ? '' : `（評判★${t.rep}・${yen(t.cost)}で登録）`}</small></div>${have ? `<button class="main" data-act="warp" data-t="${k}">ワープ</button>` : `<button data-act="warpbuy" data-t="${k}" ${ok && S.money >= t.cost ? '' : 'disabled'}>${ok ? yen(t.cost) : '★' + t.rep + 'で開放'}</button>`}</div>`; }).join('')}`;
  }

  // ---------- インテリア ----------
  function decoHTML() {
    const I = S.interior, row = (cat, label) => `<h3>${label}</h3><div class="chips">${DECO[cat].map(o => `<button class="mini ${I[cat] === o.id ? 'on' : ''}" data-act="decopick" data-c="${cat}" data-id="${o.id}">${o.name}${I.owned[o.id] ? '' : '（' + yen(o.price) + '）'}</button>`).join('')}</div>`;
    return `<div class="hd"><h2>🛋️ 家具屋「ホームデコ」</h2><button data-act="close">× とじる</button></div><p class="sub">お店の模様がえ。かわいくすると、お客さんが少し買いやすくなって、社員の機嫌も毎日ちょっと上がる。</p>
      ${row('floor', '床')}${row('wall', 'かべ')}${row('rug', 'ラグ')}
      <h3>かざり（${decorCount()}個）</h3><div class="chips">${DECO.decor.map(o => `<button class="mini ${I.decor[o.id] ? 'on' : ''}" data-act="decoitem" data-id="${o.id}">${o.icon}${o.name}${I.owned[o.id] ? '' : '（' + yen(o.price) + '）'}</button>`).join('')}</div>
      <p class="sub">所持金 ${yen(S.money)}　お客さんの買いやすさ ×${interiorBonus().toFixed(2)}</p>`;
  }
  function decoPick(cat, id) {
    const o = DECO[cat].find(x => x.id === id), I = S.interior; if (!I.owned[id]) { if (S.money < o.price) return UI.toast('お金が足りない', 'bad'); S.money -= o.price; I.owned[id] = 1; sfx('buy'); }
    I[cat] = id; World.applyInterior(I); UI.paint();
  }
  function decoItem(id) {
    const o = DECO.decor.find(x => x.id === id), I = S.interior; if (!I.owned[id]) { if (S.money < o.price) return UI.toast('お金が足りない', 'bad'); S.money -= o.price; I.owned[id] = 1; I.decor[id] = true; sfx('buy'); }
    else I.decor[id] = !I.decor[id];
    World.applyInterior(I); UI.paint();
  }

  // ---------- 支店 ----------
  function realtorHTML() {
    const bs = S.branches, next = BRANCH_COST[bs.length];
    const rows = bs.map((b, i) => {
      const staff = S.staff.filter(s => !s.branch || s.id === b.mgr);
      return `<div class="card"><b>🏬 ${b.name}</b><br><small class="sub">店長を決めて、スライムを送ると、毎晩、自動で売れる。</small>
        <div class="row"><span class="sub">店長：</span><select data-act="brmgr" data-b="${b.id}"><option value="">（なし）</option>${S.staff.map(s => `<option value="${s.id}" ${b.mgr === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        ${S.slimes.filter(x => x.count > 0 || (b.stock[x.id] || 0) > 0).map(x => `<div class="rd"><span>${esc(x.name)}　本店${x.count}・支店${b.stock[x.id] || 0}</span><span><button class="mini" data-act="brmove" data-b="${b.id}" data-id="${x.id}" data-d="-5">−5</button><button class="mini" data-act="brmove" data-b="${b.id}" data-id="${x.id}" data-d="5">＋5</button></span></div>`).join('') || '<p class="sub">送れるスライムがない</p>'}</div>`;
    }).join('');
    return `<div class="hd"><h2>🏢 不動産「ビルドホーム」</h2><button data-act="close">× とじる</button></div><p class="sub">別の店舗を建てて、売り場を増やそう。</p>
      <div class="scroll">${rows}${next ? `<div class="item"><div class="grow"><b>新しい支店を建てる</b><br><small class="sub">${bs.length + 2}号店</small></div><button class="main" data-act="brbuild" ${S.money < next ? 'disabled' : ''}>${yen(next)}</button></div>` : '<p class="sub">これ以上は建てられない</p>'}</div>`;
  }

  // ---------- デバッグ（テスト用：お金・素材・解放） ----------
  let dbSel = 'glue_pro', dbSl = 0, dbQ = 'S';
  // デバッグ用：すべてのスライム（個性・感触・特別）のリスト
  const dbList = [];
  (function () {
    const mk = (label, spec) => dbList.push({ label, spec });
    for (const n of [null, 'nettori', 'danryoku']) for (const t of [0, 1]) for (const f of [0, 1]) {
      const tr = {}; if (n) tr[n] = 0.85; if (t) tr.torotoro = 0.85; if (f) tr.fuwafuwa = 0.85;
      mk('個性：' + (Object.keys(tr).map(k => TRAIT_NAME[k]).join('＋') || 'ノーマル'), { traits: tr });
    }
    for (const k in FEEL2) mk('感触：' + FEEL2[k].name, { traits: {}, ft: { [k]: 0.9 } });
    mk('特別：ひかる（蓄光）', { traits: {}, gl: 2.5 }); mk('特別：シャリシャリ', { traits: {}, crunch: 0.8, sn: 4 }); mk('特別：ラメたっぷり', { traits: {}, sp: 4, rainbow: true });
    mk('特別：秘伝のスライム', { traits: { fuwafuwa: 0.6 }, sec: 0.7, sp: 3, gold: true }); mk('特別：全部盛り', { traits: { nettori: 0.9, torotoro: 0.9, fuwafuwa: 0.9 }, ft: { hiyari: 0.9, hokaho: 0.9, piri: 0.9, shuwa: 0.9, mochi: 0.9 }, gl: 2.5, crunch: 0.7, sn: 3.5, sp: 4, sec: 0.7, rainbow: true });
  })();
  function dbSlime(i, q) {
    const s = dbList[i].spec, hue = (i * 37) % 360, color = '#' + new THREE.Color().setHSL(hue / 360, 0.7, 0.72).getHexString();
    const sl = { traits: s.traits, ft: s.ft || {}, q, qs: 1, color, sp: s.sp || 0, ps: 1, sn: s.sn || 0, gl: s.gl || 0, crunch: s.crunch || 0, sec: s.sec || 0, ex: {}, sat: 0.7, light: 0.72, gcols: s.rainbow ? [{ c: 'rainbow', w: 1 }] : s.gold ? [{ c: '#ffd24a', w: 1 }] : [{ c: '#fff2b0', w: 1 }] };
    sl.name = slimeName(sl.traits, color, true, sl.sp, sl.crunch, sl.gl, sl.sec, sl.ft); sl.fair = fairPrice(sl); return sl;
  }
  function debugHTML() {
    const groups = {}; for (const id in ITEMS) (groups[ITEMS[id].kind] = groups[ITEMS[id].kind] || []).push(id);
    const kn = { glue: 'ノリ', borax: 'ホウ砂水', water: '水', soap: 'ソープ', paint: '絵具', glitter: 'ラメ', snow: 'スノー', glow: '蓄光', extract: 'エキス' };
    return `<div class="hd"><h2>🛠 デバッグ（テスト用）</h2><button data-act="close">× とじる</button></div><p class="sub">所持金 <b>${yen(S.money)}</b>　フォロワー ${S.sns.followers}人</p>
      <h3>お金</h3><div class="chips">${[10000, 100000, 1000000, 10000000].map(v => `<button class="mini" data-act="dbmoney" data-v="${v}">+${yen(v)}</button>`).join('')}</div>
      <h3>好きな素材をもらう（材料棚へ）</h3>
      <div class="row"><select data-act="dbsel">${Object.keys(groups).map(k => `<optgroup label="${kn[k] || k}">${groups[k].map(id => `<option value="${id}" ${id === dbSel ? 'selected' : ''}>${ITEMS[id].icon} ${ITEMS[id].name}</option>`).join('')}</optgroup>`).join('')}</select>
      ${[10, 100, 1000].map(q => `<button class="mini" data-act="dbadd" data-q="${q}">+${q}${ITEMS[dbSel].unit}</button>`).join('')}</div>
      <div class="chips"><button class="mini" data-act="dball" data-q="100">全素材 +100ずつ</button><button class="mini" data-act="dball" data-q="1000">全素材 +1000ずつ</button></div>
      <h3>スライムをもらう（できあがりのスライム）</h3>
      <div class="row"><select data-act="dbslsel">${dbList.map((x, i) => `<option value="${i}" ${i === dbSl ? 'selected' : ''}>${x.label}</option>`).join('')}</select>
      <select data-act="dbqsel">${['C', 'B', 'A', 'S'].map(q => `<option ${q === dbQ ? 'selected' : ''}>${q}</option>`).join('')}</select>
      ${[1, 10, 50].map(q => `<button class="mini" data-act="dbslime" data-q="${q}">+${q}個</button>`).join('')}</div>
      <div class="chips"><button class="mini" data-act="dbslall" data-q="10">全種類 各+10個</button><button class="mini" data-act="dbslall" data-q="50">全種類 各+50個</button></div>
      <h3>いろいろ</h3><div class="chips">
        <button class="mini" data-act="dbweapons">全武器をゲット</button><button class="mini" data-act="dbunlock">洞窟・ひみつ・町・スポンサーをぜんぶ解放</button>
        <button class="mini" data-act="dbfollow">フォロワー+1000・評判★5</button><button class="mini" data-act="dbmood">社員の機嫌を全回復</button><button class="mini" data-act="dbhp">最大HP+200</button></div>
      <h3>お客さんを呼ぶ</h3><p class="sub">お店の中にいると、実際に歩いて来る。棚にスライムを並べておこう（VIPは秘伝入りが棚にあるとき）。</p><div class="chips">${Object.keys(CUSTOMERS).map(k => `<button class="mini" data-act="dbcust" data-k="${k}">${CUSTOMERS[k].icon}${CUSTOMERS[k].name}</button>`).join('')}<button class="mini" data-act="dbcust" data-k="all">全員1人ずつ</button><button class="mini" data-act="dbcust" data-k="rush">ランダム10人</button></div>
      <h3>スポンサー</h3><div class="chips">${Object.keys(SPONSORS).map(k => { const so = S.sponsors[k]; return `<button class="mini" data-act="dbsp" data-k="${k}">${SPONSORS[k].icon}${SPONSORS[k].name}${so ? '（PR' + so.pr + '回）＋1回PR' : 'をスポンサーにする'}</button>`; }).join('')}<button class="mini" data-act="dbspall">全社・新商品をぜんぶ解放</button><button class="mini" data-act="dbstream">ASMR配信イベントを起こす</button></div>`;
  }
  const dbToast = t => { UI.toast('🛠 ' + t, 'good'); UI.paint(); };
  UI.reg({
    debug: () => { if (DEBUG) UI.open(debugHTML, { cls: 'wide' }); },
    dbmoney: d => { S.money += +d.v; sfx('coin'); dbToast('お金 +' + yen(+d.v)); },
    dbsel: (d, e) => { dbSel = e.value; UI.paint(); },
    dbadd: d => { S.stock[dbSel] = (S.stock[dbSel] || 0) + +d.q; dbToast(`${ITEMS[dbSel].name} +${d.q}`); },
    dbslsel: (d, e) => { dbSl = +e.value; UI.paint(); }, dbqsel: (d, e) => { dbQ = e.value; UI.paint(); },
    dbslime: d => { const st = addSlimeStack(dbSlime(dbSl, dbQ), +d.q); World.refreshShelf(); dbToast(`${st.name} +${d.q}個`); },
    dbslall: d => { dbList.forEach((x, i) => addSlimeStack(dbSlime(i, dbQ), +d.q)); World.refreshShelf(); dbToast(`全${dbList.length}種類を各+${d.q}個`); },
    dball: d => { for (const id in ITEMS) if (!ITEMS[id].free) S.stock[id] = (S.stock[id] || 0) + +d.q; dbToast('全素材 +' + d.q + 'ずつ'); },
    dbweapons: () => { WEAPONS.forEach(w => { S.weapons[w.id] = true; }); Adventure.refreshWeapon(); dbToast('全武器をゲット'); },
    dbunlock: () => { S.flags = Object.assign(S.flags || {}, { king: true, ice: true, fire: true, secret: true, secretOpen: true, altar: true }); S.labUnlocked = true; Object.keys(TOWNS).forEach(k => { S.towns[k] = true; }); S.sns.followers = Math.max(S.sns.followers, 400); Biz.sponsorCheck(); dbToast('ぜんぶ解放した'); },
    dbfollow: () => { S.sns.followers += 1000; S.repPts = Math.max(S.repPts, REP_STEPS[4] + 1); Biz.sponsorCheck(); dbToast('フォロワー+1000・評判★5'); },
    dbmood: () => { S.staff.forEach(s => { s.mood = 100; }); dbToast('社員の機嫌を全回復'); },
    dbcust: d => {
      const call = k => { if (k === 'vip') vipVisit(); else { const decide = () => customerBuy(k); if (World.area === 'shop') World.spawnVisitor(k, decide); else decide(); } };
      if (d.k === 'all') Object.keys(CUSTOMERS).forEach(call); else if (d.k === 'rush') for (let i = 0; i < 10; i++) call(Object.keys(CUSTOMERS).filter(k => k !== 'vip')[(Math.random() * 6) | 0]); else call(d.k);
      UI.toast('🛠 お客さんを呼んだ！（お店の中なら、歩いてくる）', 'good');
    },
    dbsp: d => { const so = S.sponsors[d.k] || (S.sponsors[d.k] = { pr: 0, day: 0 }); so.pr++; const n = SPONSORS[d.k].items.filter(it => it.at === so.pr).map(it => ITEMS[it.item].name); dbToast(SPONSORS[d.k].name + (n.length ? '：新商品「' + n.join('」「') + '」を開発！' : ' PR+1')); },
    dbspall: () => { for (const k in SPONSORS) S.sponsors[k] = { pr: 9, day: 0 }; dbToast('全スポンサーの新商品を解放（ホームセンターで買える）'); },
    dbstream: () => { const st = S.slimes.find(x => x.count > 0) || { name: 'テストスライム', traits: {}, q: 'B' }; Biz.stream(st); UI.paint(); },
    dbhp: () => { S.maxHp = (S.maxHp || 100) + 200; S.hp = S.maxHp; dbToast('最大HP+200'); },
  });
  UI.reg({
    prpick: d => openPRPick(d.s), prgo: d => shoot(d.s, d.id),
    party: d => doParty(d.id), bonus: () => doBonus(), partyback: () => openParty(),
    warp: d => { UI.close(); goTown(d.t); },
    warpbuy: d => { const t = TOWNS[d.t]; if (S.money < t.cost || repLevel() < t.rep) return; S.money -= t.cost; S.towns[d.t] = true; sfx('ok'); UI.toast(`${t.icon} ${t.name}にワープできるようになった！`, 'good'); UI.paint(); },
    decopick: d => decoPick(d.c, d.id), decoitem: d => decoItem(d.id),
    brbuild: () => { const c = BRANCH_COST[S.branches.length]; if (!c || S.money < c) return; S.money -= c; S.branches.push({ id: S.nid++, name: `スライム商店 ${S.branches.length + 2}号店`, stock: {}, mgr: null }); World.refreshBranches(S.branches.length); sfx('ok'); UI.paint(); },
    brmove: d => { const b = S.branches.find(x => x.id === +d.b), st = S.slimes.find(x => x.id === +d.id), q = +d.d; if (!b || !st) return; if (q > 0) { const n = Math.min(q, st.count); st.count -= n; b.stock[st.id] = (b.stock[st.id] || 0) + n; } else { const n = Math.min(-q, b.stock[st.id] || 0); st.count += n; b.stock[st.id] -= n; } World.refreshShelf(); UI.paint(); },
    brmgr: (d, e) => { const b = S.branches.find(x => x.id === +d.b); S.staff.forEach(s => { if (s.branch === b.id) s.branch = null; }); b.mgr = +e.value || null; const s = S.staff.find(x => x.id === b.mgr); if (s) s.branch = b.id; UI.paint(); },
  });
  const openTeleport = () => UI.open(teleportHTML, { cls: 'wide' }), openParty = () => UI.open(partyHTML, { cls: 'wide' }), openDeco = () => UI.open(decoHTML, { cls: 'wide' }), openRealtor = () => UI.open(realtorHTML, { cls: 'wide' });
  return { ensure, notif, surgeOn, surgeMul, sponsorCheck, sponsorHTML, notifHTML, stock, stream, morning, night, moodK, off, face, interiorBonus, decorCount, openTeleport, openParty, openDeco, openRealtor };
})();
