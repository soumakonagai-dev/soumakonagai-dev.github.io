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
// ---- 定期イベント（フォロワーが増えると参加できる）----
const EVENTS = [
  { id: 'matsuri', name: 'スライム夏祭り', icon: '🏮', period: 7, offset: 3, need: 60, desc: '屋台がならぶ、にぎやかなお祭り。材料やくじ引き、食べ物の屋台が出る。' },
  { id: 'market', name: 'ハンドメイドマルシェ', icon: '🧺', period: 10, offset: 5, need: 200, desc: '新しい用品（スポンサー商品）が屋台で買える。自分もお店を出せる。' },
  { id: 'night', name: 'ナイトフェス（花火）', icon: '🎆', period: 12, offset: 7, need: 1000, desc: '光るもの、ひんやりするものが人気。夜のお客さんがたくさん。' },
  { id: 'expo', name: 'スライム博覧会（コンテスト）', icon: '🏆', period: 14, offset: 9, need: 500, desc: '自慢のスライムで勝負！ 入賞すると賞金とフォロワー。' },
];
const FEST_MAT = {
  matsuri: [['glue_pro', 500, 380], ['borax', 300, 180], ['soap', 300, 150], ['paint_red', 10, 100], ['glitter_gold', 10, 100]],
  market: [['glue_silk', 500, 450], ['borax_mild', 300, 300], ['soap_cloud', 300, 260], ['glitter_holo', 10, 220], ['paint_neon', 10, 180]],
  night: [['glow_powder', 10, 140], ['snow_powder', 10, 100], ['extract_hikari', 3, 500], ['glitter_rainbow', 10, 140], ['paint_black', 10, 100]],
  expo: [['extract_normal', 3, 300], ['extract_puni', 3, 420], ['extract_nobi', 3, 420], ['extract_toro', 3, 420], ['extract_fuwa', 3, 420]],
};
const FEST_RARE = [['extract_fire', 1, 800], ['extract_ice', 1, 800], ['extract_thunder', 1, 800], ['extract_fizz', 1, 700], ['extract_mochi', 1, 700]];
const FEST_FOOD = [{ id: 'tako', name: 'たこやき', icon: '🐙', price: 500, mood: 8 }, { id: 'kaki', name: 'かき氷', icon: '🍧', price: 400, mood: 6 }, { id: 'potato', name: 'フライドポテト', icon: '🍟', price: 300, mood: 5 },
  { id: 'apple', name: 'りんご飴', icon: '🍎', price: 350, mood: 6 }, { id: 'yakisoba', name: 'やきそば', icon: '🍜', price: 500, mood: 8 }, { id: 'ramune', name: 'ラムネ', icon: '🥤', price: 200, mood: 3 },
  { id: 'wata', name: 'わたあめ', icon: '🍭', price: 300, mood: 5 }, { id: 'crepe', name: 'クレープ', icon: '🥞', price: 450, mood: 7 }];
// イベントごとの屋台の顔ぶれ（11こ）。夏祭り・ナイトフェスは、スライムの用品は売らない
const FEST_ROSTER = {
  matsuri: ['food:tako', 'food:kaki', 'food:apple', 'food:yakisoba', 'lottery', 'shoot', 'deco:金魚すくい', 'food:ramune', 'food:wata', 'deco:お面', 'deco:ヨーヨー釣り'],
  market: ['mat', 'rare', 'food:crepe', 'food:ramune', 'lottery', 'deco:ハンドメイド雑貨', 'deco:アクセサリー', 'food:potato', 'deco:木工小物', 'shoot', 'deco:布小物'],
  night: ['food:tako', 'food:kaki', 'lottery', 'shoot', 'food:yakisoba', 'food:crepe', 'deco:ネオン雑貨', 'food:wata', 'food:ramune', 'deco:光るおもちゃ', 'food:potato'],
  expo: ['mat', 'rare', 'food:potato', 'food:ramune', 'lottery', 'shoot', 'deco:スライム研究所', 'deco:フォトスポット', 'food:crepe', 'food:apple', 'deco:ステッカー'],
};
const stallLabel = k => k === 'mat' ? '材料の屋台' : k === 'rare' ? 'レアエキス' : k === 'lottery' ? 'くじ引き' : k === 'shoot' ? '射的' : k.startsWith('food:') ? FEST_FOOD.find(f => f.id === k.slice(5)).name : k.slice(5);
const stallHot = k => k === 'mat' ? '材料の屋台で買い物（お祭り価格）' : k === 'rare' ? 'レアエキスの屋台（限定）' : k === 'lottery' ? 'くじ引きを引く' : k === 'shoot' ? '射的をやる' : k.startsWith('food:') ? FEST_FOOD.find(f => f.id === k.slice(5)).name + 'を買う（社員におみやげ）' : '「' + k.slice(5) + '」の屋台をのぞく';
const HOSTS = [
  { id: 'sale', name: 'スライム即売会', icon: '🛍️', cost: 10000, need: 150, desc: '在庫のスライムを、たくさんのお客さんに売る。' },
  { id: 'work', name: 'ワークショップ大会', icon: '🧪', cost: 20000, need: 400, desc: 'みんなでスライム作り。参加費が入って、フォロワーが増える。' },
  { id: 'fan', name: 'ファンミーティング', icon: '🎤', cost: 50000, need: 1500, desc: 'スポンサーも来てくれて、ASMR配信者が配信してくれる！' },
];

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
    { const ev = eventToday(); if (ev) notif(ev.icon, `今日は【${ev.name}】開催！ テレポーターで会場へ行こう（スラグラム→イベント）`, true); }
    if (names.length) { S.staff.forEach(sf => { if (!off(sf)) sf.mood = Math.max(0, sf.mood - 3 * names.length); }); notif('😷', `${names.join('、')}が今日は欠席… 仕事が増えて、忙しくなる！`, 'bad'); }
  }
  function night() {
    ensure(); let income = 0, html = ''; boothFinish('日がおわった');
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
      ${(() => { const ev = eventToday(); return ev ? `<div class="item"><span class="ic">${ev.icon}</span><div class="grow"><b>${ev.name}（開催中）</b><br><small class="sub">今日だけの会場！</small></div><button class="main" data-act="festgo">ワープ</button></div>` : ''; })()}
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
      <h3>スポンサー</h3><div class="chips">${Object.keys(SPONSORS).map(k => { const so = S.sponsors[k]; return `<button class="mini" data-act="dbsp" data-k="${k}">${SPONSORS[k].icon}${SPONSORS[k].name}${so ? '（PR' + so.pr + '回）＋1回PR' : 'をスポンサーにする'}</button>`; }).join('')}<button class="mini" data-act="dbspall">全社・新商品をぜんぶ解放</button><button class="mini" data-act="dbstream">ASMR配信イベントを起こす</button></div>
      <h3>日づけ・時刻（${S.day}日目 ${String(S.min / 60 | 0).padStart(2, '0')}:${String(S.min % 60).padStart(2, '0')}）</h3><div class="chips">${[1, 3, 7, 30].map(n => `<button class="mini" data-act="dbday" data-n="${n}">+${n}日</button>`).join('')}${[[540, '朝9時'], [720, '昼12時'], [1080, '夕方18時'], [1150, '19時10分(花火)'], [1300, '夜21時40分']].map(t => `<button class="mini" data-act="dbtime" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
      <h3>お祭り</h3><div class="chips">${EVENTS.map(ev => `<button class="mini" data-act="dbevent" data-id="${ev.id}">${ev.icon}${ev.name}を今日にする</button>`).join('')}<button class="mini" data-act="festgo">会場へワープ</button><button class="mini" data-act="dbhostreset">主催のクールダウン解除</button></div>`;
  }
  const dbToast = t => { UI.toast('🛠 ' + t, 'good'); UI.paint(); };
  UI.reg({
    debug: () => { if (DEBUG) UI.open(debugHTML, { cls: 'wide' }); },
    dbday: d => { S.day += +d.n; S.min = 540; Biz.sponsorCheck(); dbToast(`${S.day}日目の朝にした`); },
    dbtime: d => { S.min = +d.t; dbToast('時刻を変えた'); },
    dbevent: d => { const ev = EVENTS.find(e => e.id === d.id); S.sns.followers = Math.max(S.sns.followers, ev.need); S.day = nextDay(ev); S.min = 600; dbToast(`${S.day}日目（${ev.name}）の10時にした`); },
    dbhostreset: () => { ensureFest().host = -99; dbToast('主催できる'); },
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
  // ---------- イベント ----------
  const passTime = n => { for (let i = 0; i < n && !ending; i++) tickMinute(); };
  function eventOn(ev, d) { return d >= ev.offset && (d - ev.offset) % ev.period === 0; }
  function eventToday() { return EVENTS.find(ev => eventOn(ev, S.day) && S.sns.followers >= ev.need) || null; }
  function nextDay(ev) { let d = Math.max(S.day, ev.offset); while (!eventOn(ev, d)) d++; return d; }
  function ensureFest() { S.fest = S.fest || { host: 0, bought: {}, contest: 0, booth: 0, workshop: 0 }; return S.fest; }
  function eventsHTML() {
    const f = ensureFest(), today = eventToday();
    const rows = EVENTS.map(ev => {
      const nd = nextDay(ev), locked = S.sns.followers < ev.need, now = nd === S.day;
      return `<div class="card" style="${locked ? 'opacity:.6' : ''}"><div class="row between"><b>${ev.icon} ${ev.name}</b><span class="tag">${ev.period}日ごと</span></div><small class="sub">${ev.desc}</small><br>
        ${locked ? `<small>🔒 フォロワー${ev.need}人で参加できる（いま ${S.sns.followers}人）</small>` : now ? '<b style="color:#e5525a">🎪 今日、開催中！</b>' : `<small>次は <b>${nd}日目</b>（あと${nd - S.day}日）</small>`}</div>`;
    }).join('');
    const can = S.day - f.host >= 5;
    return `${today ? `<div class="card"><b>🎪 今日は【${today.name}】開催中！</b><div class="row end"><button class="main" data-act="festgo">会場へワープ</button></div></div>` : ''}${rows}
      <h3>🎤 自分でイベントを主催する</h3><p class="sub">フォロワーが増えると、自分でもイベントを開ける。（5日に1回）${can ? '' : ' いまは準備中…あと' + (5 - (S.day - f.host)) + '日'}</p>
      ${HOSTS.map(h => `<div class="item"><span class="ic">${h.icon}</span><div class="grow"><b>${h.name}</b>　<small class="sub">費用 ${yen(h.cost)}・フォロワー${h.need}人〜<br>${h.desc}</small></div><button class="main" data-act="hostgo" data-id="${h.id}" ${can && S.sns.followers >= h.need && S.money >= h.cost ? '' : 'disabled'}>主催</button></div>`).join('')}`;
  }
  function resultModal(title, lines, extra) {
    sfx('ok'); UI.open(() => `<h2>${title}</h2><div class="card">${lines.join('<br>')}</div>${extra || ''}<div class="row end"><button class="main" data-act="close">おつかれさま！</button></div>`, {});
  }
  function hostEvent(id) {
    const f = ensureFest(), h = HOSTS.find(x => x.id === id); if (!h || S.money < h.cost || S.sns.followers < h.need || S.day - f.host < 5) return;
    S.money -= h.cost; f.host = S.day; const lines = [], sn = S.sns, att = Math.round(sn.followers * rnd(0.12, 0.2));
    if (id === 'sale') {
      const list = S.slimes.filter(x => x.count > 0).sort((a, b) => b.fair - a.fair); let sold = 0, rev = 0, cap = Math.min(60, Math.round(att * 0.6));
      for (const x of list) while (x.count > 0 && sold < cap) { x.count--; sold++; rev += x.fair; }
      S.money += rev; S.today.sold += sold; S.today.rev += rev; lines.push(`来場者 ${att}人`, `スライムが ${sold}個 売れた！ +${yen(rev)}`);
      const g = Math.round(sold * 0.4 + att * 0.1); sn.followers += g; S.today.fol += g; lines.push(`フォロワー +${g}`);
    } else if (id === 'work') {
      const n = clamp(Math.round(sn.followers * 0.08), 10, 300), rev = n * 600, g = Math.round(n * 0.25); S.money += rev; sn.followers += g; S.today.fol += g; S.repPts += n * 0.1;
      lines.push(`参加者 ${n}人`, `参加費 +${yen(rev)}`, `フォロワー +${g}`);
    } else {
      let sp = 0; for (const k in SPONSORS) if (S.sponsors[k]) sp += 5000; S.money += sp; const g = Math.round(sn.followers * 0.12) + 50; sn.followers += g; S.today.fol += g;
      lines.push(`来場者 ${att}人`, sp ? `スポンサーの協賛金 +${yen(sp)}` : 'スポンサーはまだいない…', `フォロワー +${g}`, '🎙️ ASMR配信者が来て、配信してくれる！');
    }
    passTime(180); if (id === 'fan') stream(S.slimes.find(x => x.count > 0) || { name: 'スライム', traits: {}, q: 'B' }); notif('🎤', `${h.name}を主催した！`); resultModal(`${h.icon} ${h.name}、大成功！`, lines);
  }

  // 会場の屋台
  function stallRows(list, key) {
    const f = ensureFest();
    return list.map(([id, pack, price], i) => { const it = ITEMS[id], lim = key === 'rare' ? 3 - (f.bought[S.day + id] || 0) : 99; return `<div class="item"><span class="ic" style="background:${it.color}">${it.icon}</span><div class="grow"><b>${it.name}</b>${key === 'rare' ? ' <span class="tag sale">限定</span>' : ''}<br><small class="sub">${pack}${it.unit}入り・${it.note || ''}${key === 'rare' ? '（あと' + lim + '個）' : ''}</small></div><b class="price">${yen(price)}</b><button data-act="stallbuy" data-k="${key}" data-i="${i}" ${S.money < price || lim <= 0 ? 'disabled' : ''}>買う</button></div>`; }).join('');
  }
  function stallList(key) { const ev = eventToday(); return key === 'rare' ? FEST_RARE : (FEST_MAT[ev && FEST_MAT[ev.id] ? ev.id : 'market']); }
  const DECO_CHAT = ['「いらっしゃい！ ゆっくり見ていってね」', '「今日は、いい天気でよかったよ」', '「スライム商店さん、人気だね！」', '「おまけしとくよ〜」', '「あっちの射的、おもしろいよ」'];
  const MASKS = [{ id: 'fox', n: 'きつね', i: '🦊' }, { id: 'neko', n: 'ねこ', i: '🐱' }, { id: 'oni', n: 'おに', i: '👹' }, { id: 'usagi', n: 'うさぎ', i: '🐰' }, { id: 'hero', n: 'ヒーロー', i: '🦸' }, { id: 'hyot', n: 'ひょっとこ', i: '🤡' }];
  const GAMES = { '金魚すくい': { g: 'goldfish', price: 300, icon: '🐟', desc: 'ポイを水に入れて、金魚を すくい上げよう。紙が破れたら おしまい。赤・金・黒の金魚は高得点！' }, 'スーパーボール': { g: 'superball', price: 300, icon: '🔮', desc: 'スーパーボールをすくおう。キラキラの金色は高得点！' }, 'ヨーヨー釣り': { g: 'yoyo', price: 300, icon: '🎈', desc: 'こよりのフックでヨーヨーを釣る。ゆっくり動かさないと、こよりが切れちゃう。★つきは高得点。' }, '輪投げ': { g: 'ring', price: 400, icon: '⭕', desc: '6こ投げて、棒に入れよう。奥ほど高得点。マウスを動かすほどブレる！' } };
  const SOUV = { 'ハンドメイド雑貨': '🧶', 'アクセサリー': '💍', '木工小物': '🪵', '布小物': '🧵', 'ネオン雑貨': '🌈', '光るおもちゃ': '💡', 'スライム研究所': '🔬', 'ステッカー': '🏷️' };
  const award = (id, q) => { if (!giveItem(id, q)) S.stock[id] = (S.stock[id] || 0) + q; return ITEMS[id].name + ' ×' + q; };
  const COMMON = ['extract_puni', 'extract_nobi', 'extract_toro', 'extract_fuwa'], ELEM = ['extract_fire', 'extract_ice', 'extract_thunder', 'extract_fizz', 'extract_mochi'];
  function gameReward(p) {
    const l = [];
    if (p <= 0) l.push(award('extract_normal', 1) + '（参加賞）'); else if (p < 3) l.push(award('extract_normal', 2)); else if (p < 6) l.push(award(pick(COMMON), 2)); else if (p < 10) l.push(award(pick(ELEM), 2)); else { l.push(award(pick(ELEM), 3)); S.money += 3000; l.push('¥3,000'); if (p >= 16 && Math.random() < 0.5) l.push(award('extract_secret', 1)); }
    return l;
  }
  function playGame(name) {
    const gm = GAMES[name]; if (!gm || S.money < gm.price) return; S.money -= gm.price; UI.close();
    const done = r => { const sc = r.score, l = gameReward(sc); sfx('ok'); resultModal(gm.icon + ' ' + name + '（' + sc + '点）', l.map(x => '🎁 ' + x), '<div class="row end"><button data-act="minigo" data-n="' + name + '" ' + (S.money < gm.price ? 'disabled' : '') + '>もう一回（' + yen(gm.price) + '）</button></div>'); };
    if (gm.g === 'ring') Mini.ring(done); else Mini.scoop(gm.g, done);
  }
  function cookFood(id) {
    const x = FEST_FOOD.find(f => f.id === id); if (!x || S.money < x.price) return; S.money -= x.price; UI.close();
    const done = r => { const q = clamp(id === 'ramune' ? r.score / 100 : id === 'wata' || id === 'kaki' ? r.score / 85 : r.score / 70, 0, 1.2), mood = Math.max(1, Math.round(x.mood * (0.4 + 0.9 * q))), fol = q >= 1 ? 3 : 0;
      S.staff.forEach(st => { st.mood = Math.min(100, (st.mood || 70) + mood); }); if (fol) { S.sns.followers += fol; S.today.fol += fol; } sfx('ok');
      resultModal(x.icon + ' ' + x.name + 'が できた！', ['出来ばえ ' + Math.round(q * 100) + '点', '社員みんなの機嫌 +' + mood, fol ? 'おいしそう！と話題に… フォロワー +' + fol : ''].filter(Boolean), ''); };
    if (id === 'ramune') Mini.pour(done); else Mini.cook(id, done);
  }
  function openStall(key) {
    if (key === 'mat' || key === 'rare') UI.open(() => `<div class="hd"><h2>${key === 'rare' ? '🧪 レアエキス屋台' : '🏮 材料の屋台'}</h2><button data-act="close">× とじる</button></div><div class="row between"><span>所持金 <b>${yen(S.money)}</b></span><span>🎒 ${Math.round(weightOf(S.bag))} / ${bagCap()}</span></div><p class="sub">お祭り価格！ 買ったものは、バッグに入る。</p><div class="scroll">${stallRows(stallList(key), key === 'mat' ? 'material' : 'rare')}</div>`, { cls: 'wide' });
    else if (key.startsWith('food:')) { const x = FEST_FOOD.find(f => f.id === key.slice(5)); UI.open(() => `<div class="hd"><h2>${x.icon} ${x.name}の屋台</h2><button data-act="close">× とじる</button></div><p class="sub">社員へのおみやげにできる。自分でつくると、うまくいくほど みんなが喜ぶ！（いま${S.staff.length}人）</p>
      <div class="item"><span class="ic">${x.icon}</span><div class="grow"><b>買って あげる</b><br><small class="sub">社員みんなの機嫌 +${x.mood}</small></div><button data-act="foodbuy" data-id="${x.id}" ${S.money < x.price || !S.staff.length ? 'disabled' : ''}>${yen(x.price)}</button></div>
      <div class="item"><span class="ic">🍳</span><div class="grow"><b>じぶんで つくる</b><br><small class="sub">ミニゲーム。出来ばえで 機嫌が +${Math.round(x.mood * 0.4)}〜${Math.round(x.mood * 1.3)}。上手だとフォロワーも</small></div><button class="main" data-act="foodcook" data-id="${x.id}" ${S.money < x.price || !S.staff.length ? 'disabled' : ''}>${yen(x.price)}</button></div>`, {}); }
    else if (key === 'lottery') UI.open(() => `<div class="hd"><h2>🎟️ くじ引き</h2><button data-act="close">× とじる</button></div><p class="sub">1回 ¥1,000。箱の中から、好きなくじを1まい引く！ 当たりはいろいろ…秘伝のエキスも出るかも！</p><div class="row" style="flex-wrap:wrap;gap:10px;justify-content:center;margin:12px 0">${[0, 1, 2, 3, 4, 5].map(i => '<button class="main" style="font-size:30px;padding:10px 14px;transform:rotate(' + (i * 7 - 18) + 'deg)" data-act="lottery" ' + (S.money < 1000 ? 'disabled' : '') + '>🎟️</button>').join('')}</div>`, {});
    else if (key === 'shoot') UI.open(() => `<div class="hd"><h2>🔫 射的</h2><button data-act="close">× とじる</button></div><p class="sub">コルク銃で、景品を撃ち落とそう！（5発 ¥500）<br>・景品の上のほうを撃つと倒れやすい<br>・軽いものは、まっすぐ押されて棚から落ちる<br>・重くて大きいものは、何発も当てないと動かない<br>・棚の奥に落ちたらゲット！</p><div class="row end"><button class="main" data-act="shootgo" ${S.money < 500 ? 'disabled' : ''}>🔫 はじめる（¥500）</button></div>`, {});
    else if (key.startsWith('deco:')) {
      const nm = key.slice(5);
      if (GAMES[nm]) { const gm = GAMES[nm]; UI.open(() => `<div class="hd"><h2>${gm.icon} ${nm}</h2><button data-act="close">× とじる</button></div><p class="sub">${gm.desc}<br>点数で 景品（エキス）が変わる！</p><div class="row end"><button class="main" data-act="minigo" data-n="${nm}" ${S.money < gm.price ? 'disabled' : ''}>${gm.icon} あそぶ（${yen(gm.price)}）</button></div>`, {}); }
      else if (nm === 'お面') UI.open(() => `<div class="hd"><h2>🎭 お面屋</h2><button data-act="close">× とじる</button></div><p class="sub">好きなお面を買って、かぶれる。（1こ ¥300・${ensureFest().mask ? 'いま：' + (MASKS.find(x => x.id === ensureFest().mask) || {}).n : 'いまはなし'}）</p><div class="chips">${MASKS.map(x => '<button class="mini ' + (ensureFest().mask === x.id ? 'on' : '') + '" data-act="maskbuy" data-id="' + x.id + '">' + x.i + x.n + '</button>').join('')}</div><div class="row end"><button data-act="maskoff">お面をはずす</button></div>`, {});
      else if (nm === 'フォトスポット') UI.open(() => `<div class="hd"><h2>📸 フォトスポット</h2><button data-act="close">× とじる</button></div><p class="sub">お祭りの写真を撮って、スラグラムに投稿！（1日1回・フォロワーが増える）</p><div class="row end"><button class="main" data-act="photospot" ${ensureFest().photo === S.day ? 'disabled' : ''}>📸 撮影する</button></div>`, {});
      else { const ic = SOUV[nm] || '🎁'; UI.open(() => `<div class="hd"><h2>${ic} ${nm}</h2><button data-act="close">× とじる</button></div><p class="sub">社員へのおみやげに。（いま${S.staff.length}人）</p>${[['ちいさいもの', 300, 3, 0], ['ふつうのもの', 800, 8, 3], ['とっておき', 2000, 15, 10]].map((g, i) => '<div class="item"><span class="ic">' + ic + '</span><div class="grow"><b>' + g[0] + '</b><br><small class="sub">社員みんなの機嫌 +' + g[2] + (g[3] ? '・フォロワー +' + g[3] : '') + '</small></div><button data-act="souv" data-i="' + i + '" data-nm="' + nm + '" ' + (S.money < g[1] || !S.staff.length ? 'disabled' : '') + '>' + yen(g[1]) + '</button></div>').join('')}`, {}); }
    } else UI.toast('🏮 ' + DECO_CHAT[(Math.random() * DECO_CHAT.length) | 0]);
  }
  function lottery() {
    if (S.money < 1000) return; S.money -= 1000; const r = Math.random(); let t = '';
    const give = (id, q) => { if (!giveItem(id, q)) { S.stock[id] = (S.stock[id] || 0) + q; } t = `${ITEMS[id].name} ×${q}`; };
    if (r < 0.4) give('extract_normal', 3); else if (r < 0.65) give(pick(['extract_puni', 'extract_nobi', 'extract_toro', 'extract_fuwa']), 2);
    else if (r < 0.8) give(pick(['extract_fire', 'extract_ice', 'extract_thunder', 'extract_fizz', 'extract_mochi']), 2);
    else if (r < 0.9) { const g = Math.round(rnd(30, 80)); S.sns.followers += g; t = `フォロワー +${g}`; } else if (r < 0.98) { S.money += 3000; t = '¥3,000'; } else give('extract_secret', 1);
    sfx(r > 0.9 ? 'ok' : 'coin'); UI.open(() => `<h2>🎟️ くじ引き</h2><div class="card center" style="text-align:center;font-size:20px">${r > 0.9 ? '🎉 大当たり！ ' : ''}${t}</div><div class="row end"><button data-act="close">とじる</button><button class="main" data-act="lottery" ${S.money < 1000 ? 'disabled' : ''}>もう1回（¥1,000）</button></div>`, {});
  }
  // 射的：3Dの射的場で、コルク銃をうつ（World.shootStart）
  function shootGo() {
    if (S.money < 500) return; S.money -= 500; UI.close();
    World.shootStart(won => {
      const lines = [], cnt = {}; won.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
      const N = { caramel: 'キャラメル', box: 'おかしの箱', big: '大きな箱', jar: 'スライムびん', plush: 'ぬいぐるみ', card: '金のカード' };
      for (const t in cnt) {
        const q = cnt[t];
        if (t === 'caramel') lines.push(N[t] + '→ ' + award('extract_normal', 2 * q)); else if (t === 'box') lines.push(N[t] + '→ ' + award(pick(COMMON), 2 * q)); else if (t === 'jar') lines.push(N[t] + '→ ' + award(pick(['extract_fizz', 'extract_mochi']), 2 * q));
        else if (t === 'plush') { S.money += 1500 * q; S.sns.followers += 10 * q; S.today.fol += 10 * q; lines.push(N[t] + '→ ' + yen(1500 * q) + '・フォロワー +' + 10 * q); }
        else if (t === 'big') { lines.push(N[t] + '→ ' + award(pick(ELEM), 3 * q)); S.money += 3000 * q; lines.push('　おまけ ' + yen(3000 * q)); } else lines.push(N[t] + '→ ' + award('extract_secret', q));
      }
      if (!lines.length) lines.push('ざんねん…景品はとれなかった');
      sfx('ok'); resultModal('🔫 射的、おわり！（' + won.length + 'こゲット）', lines.map(x => '🎁 ' + x), '<div class="row end"><button data-act="shootgo" ' + (S.money < 500 ? 'disabled' : '') + '>もう一回（¥500）</button></div>');
    });
  }

  // 出店（自分の屋台）：お客さんが来るのを待って、少しずつ売れる。お祭り中は、ふだんより高く売れる
  let booth = { sid: null, qty: 10, mul: 1.3 };
  function boothSess() { const f = ensureFest(), s = f.sess; return s && nowT() < s.until ? s : null; }
  function openBooth() {
    const s = boothSess(), f = ensureFest();
    if (s) { const st = S.slimes.find(x => x.id === s.sid) || { name: '？', count: 0 }; return UI.open(() => `<div class="hd"><h2>🛍️ 出店中！</h2><button data-act="close">× とじる</button></div><div class="card"><b>${esc(st.name)}</b>　${yen(s.price)}<br>売れた ${s.sold}個（売上 ${yen(s.rev)}）・残り ${st.count}個<br>終了まで あと ${Math.max(0, s.until - nowT())}分</div><p class="sub">お客さんが来たら、少しずつ売れる。会場を歩いていてもOK。花火の時間は、お客さんが増える！</p><div class="row end"><button class="danger" data-act="bstop">かたづける</button></div>`, {}); }
    const stacks = S.slimes.filter(x => x.count > 0); if (!stacks.length) return UI.toast('売るスライムがない！ 工房で作ろう', 'bad');
    if (!stacks.find(x => x.id === booth.sid)) booth.sid = stacks[0].id;
    UI.open(() => { const st = stacks.find(x => x.id === booth.sid) || stacks[0];
      return `<div class="hd"><h2>🛍️ じぶんの屋台（出店）</h2><button data-act="close">× とじる</button></div><p class="sub">お祭りは、ふだんより高く売れる！ でも高すぎると、お客さんは買わない。出店すると、お客さんが来るたびに、少しずつ売れる（4時間）。</p>
      <select data-act="bpick">${stacks.map(x => `<option value="${x.id}" ${x.id === st.id ? 'selected' : ''}>${esc(x.name)}（残${x.count}・目安${yen(x.fair)}）</option>`).join('')}</select>
      <h3>数</h3><div class="chips">${[5, 10, 20, 50].map(n => `<button class="mini ${booth.qty === n ? 'on' : ''}" data-act="bqty" data-n="${n}">${n}個</button>`).join('')}<button class="mini ${booth.qty === 999 ? 'on' : ''}" data-act="bqty" data-n="999">ぜんぶ</button></div>
      <h3>値段（目安の何倍？）</h3><div class="chips">${[1, 1.3, 1.6, 2].map(m => `<button class="mini ${booth.mul === m ? 'on' : ''}" data-act="bmul" data-m="${m}">×${m}　${yen(Math.round(st.fair * m / 10) * 10)}</button>`).join('')}</div>
      <div class="row end"><button class="main" data-act="bgo">🛍️ 出店をはじめる</button></div>`; }, { cls: 'wide' });
  }
  function boothStart() {
    const st = S.slimes.find(x => x.id === booth.sid); if (!st || st.count <= 0 || boothSess()) return;
    const n = Math.min(booth.qty, st.count), price = Math.round(st.fair * booth.mul / 10) * 10;
    ensureFest().sess = { sid: st.id, price, mul: booth.mul, qty: n, start: nowT(), until: nowT() + 240, sold: 0, rev: 0, day: S.day };
    sfx('ok'); UI.close(); UI.toast('🛍️ 出店スタート！ お客さんが来るのを待とう（会場を歩いていてもOK）', 'good'); World.refreshBooth(st);
  }
  const fireworksOn = () => { const ev = eventToday(); return !!ev && (ev.id === 'matsuri' || ev.id === 'night') && S.min >= (ev.id === 'night' ? 1080 : 1140) && S.min < 1320; };
  function boothFinish(why) {
    const f = ensureFest(), s = f.sess; if (!s) return; f.sess = null; World.refreshBooth(null);
    const msg = `出店おわり：${s.sold}個 売れて ${yen(s.rev)}！${why ? '（' + why + '）' : ''}`; notif('🛍️', msg, 'good');
    if (!UI.isOpen() && !ending) resultModal('🛍️ 出店、おつかれさま！', [`${s.sold}個 売れた（${s.qty}個中）`, `売上 ${yen(s.rev)}`], s.sold >= s.qty ? '<p>🎉 完売！</p>' : '');
  }
  function festTick() {
    const f = S.fest, s = f && f.sess; if (!s) return;
    const st = S.slimes.find(x => x.id === s.sid), ev = eventToday();
    if (!st || st.count <= 0 || s.sold >= s.qty) return boothFinish(st && st.count > 0 ? '' : '売り切れ');
    if (nowT() >= s.until) return boothFinish('時間');
    if (!ev || s.day !== S.day) return boothFinish('お祭りが終わった');
    const rate = (14 + S.sns.followers * 0.04) * (ev.id === 'market' ? 1.4 : 1.1) * (fireworksOn() ? 1.5 : 1) * Math.min(1.5, surgeMul()) / 240;
    if (Math.random() < rate) {
      const p = clamp(0.8 + 0.1 * (snsAppeal(st) - 1) - (s.mul - 1.3) * 0.7, 0.05, 0.95) * 0.5;
      if (Math.random() < p) { st.count--; s.sold++; s.rev += s.price; S.money += s.price; S.today.sold++; S.today.rev += s.price; if (Math.random() < 0.25) { S.sns.followers++; S.today.fol++; } sfx('coin'); if (World.area === 'fest') World.festBoothVisit(true); if (s.sold % 5 === 0) UI.toast(`🛍️ 出店：${s.sold}個 売れた！（+${yen(s.rev)}）`, 'good'); }
      else if (World.area === 'fest') World.festBoothVisit(false);
    }
  }
  const boothStatus = () => { const s = boothSess(); return s ? `<span class="chip surge">🛍️ 出店中 ${s.sold}個・${yen(s.rev)}</span>` : ''; };
  function enterFest() {
    const ev = eventToday(), ros = FEST_ROSTER[ev ? ev.id : 'matsuri']; World.setFestStalls(ros.map(k => ({ key: k, label: stallLabel(k), hot: stallHot(k) }))); const s = boothSess(); World.refreshBooth(s ? S.slimes.find(x => x.id === s.sid) : null); World.setMask(ensureFest().mask || null);
  }

  // ワークショップ（スライム作り体験）
  function openWorkshop() {
    const kit = { glue: Object.keys(S.stock).find(id => ITEMS[id] && ITEMS[id].kind === 'glue' && S.stock[id] >= 300), borax: S.stock.borax >= 100 ? 'borax' : Object.keys(S.stock).find(id => ITEMS[id] && ITEMS[id].kind === 'borax' && S.stock[id] >= 100), paint: Object.keys(S.stock).find(id => ITEMS[id] && ITEMS[id].kind === 'paint' && S.stock[id] >= 4) };
    const ok = kit.glue && kit.borax && kit.paint;
    UI.open(() => `<div class="hd"><h2>🧪 ワークショップ</h2><button data-act="close">× とじる</button></div><p class="sub">ステージで、スライム作りの体験教室を開く。2時間。参加費がもらえて、フォロワーも増える。</p>
      <div class="card"><b>必要な材料（材料棚から使う）</b><br>${kit.glue ? '✅' : '❌'} ノリ 300ml　${kit.borax ? '✅' : '❌'} ホウ砂水 100ml　${kit.paint ? '✅' : '❌'} 絵具 4回（水は水道）</div>
      <div class="row end"><button class="main" data-act="wsgo" ${ok ? '' : 'disabled'}>🧪 開催する</button></div>`, { cls: 'wide' });
    return kit;
  }
  function workshopGo() {
    const g = Object.keys(S.stock).find(id => ITEMS[id] && ITEMS[id].kind === 'glue' && S.stock[id] >= 300), b = S.stock.borax >= 100 ? 'borax' : Object.keys(S.stock).find(id => ITEMS[id] && ITEMS[id].kind === 'borax' && S.stock[id] >= 100), p = Object.keys(S.stock).find(id => ITEMS[id] && ITEMS[id].kind === 'paint' && S.stock[id] >= 4);
    if (!g || !b || !p) return; S.stock[g] -= 300; S.stock[b] -= 100; S.stock[p] -= 4;
    const n = clamp(Math.round(8 + S.sns.followers * 0.05), 8, 80), rev = n * 400, gf = Math.round(n * 0.15 + 2); S.money += rev; S.sns.followers += gf; S.today.fol += gf; S.repPts += n * 0.3; ensureFest().workshop = S.day; passTime(120);
    resultModal('🧪 ワークショップ、大成功！', [`参加者 ${n}人`, `参加費 +${yen(rev)}`, `フォロワー +${gf}`, '「楽しかった！ また来たい！」の声がいっぱい']);
  }

  // コンテスト（博覧会）
  let cont = { sid: null };
  function openContest() {
    const f = ensureFest(), stacks = S.slimes.filter(x => x.count > 0);
    UI.open(() => `<div class="hd"><h2>🏆 スライム博覧会</h2><button data-act="close">× とじる</button></div><p class="sub">自慢のスライムを1つ選んで出品する。個性・ラメ・光る・感触・ランクが高いほど有利。1日1回。</p>${f.contest === S.day ? '<p class="warn">今日はもう出品した。</p>' : ''}
      <div class="scroll">${stacks.map(x => `<div class="item"><div class="grow"><b>${esc(x.name)}</b>（残${x.count}）<br><small class="sub">注目度 ${snsAppeal(x).toFixed(1)}・ランク ${x.q}</small></div><button class="main" data-act="entry" data-id="${x.id}" ${f.contest === S.day ? 'disabled' : ''}>出品</button></div>`).join('') || '<p class="sub">スライムがない</p>'}</div>`, { cls: 'wide' });
  }
  function entry(id) {
    const f = ensureFest(), st = S.slimes.find(x => x.id === +id); if (!st || f.contest === S.day) return; f.contest = S.day;
    const sc = snsAppeal(st) * 22 + ({ C: 0, B: 4, A: 12, S: 22 }[st.q] || 0) + rnd(0, 28), ops = Array.from({ length: 6 }, (_, i) => ({ n: ['ぷにまる', 'ふわりん', 'のびすけ', 'キラリ', 'とろ子', 'ASMRまん'][i], s: rnd(35, 95) }));
    const rank = 1 + ops.filter(o => o.s > sc).length, prize = [0, 30000, 15000, 8000][rank] || 1000, gf = [0, 300, 150, 80][rank] || 20;
    S.money += prize; S.sns.followers += gf; S.today.fol += gf; S.repPts += rank <= 3 ? 8 : 1; const lines = [{ n: 'あなた', s: sc, me: 1 }, ...ops].sort((a, b) => b.s - a.s).map((x, i) => `${i + 1}位 ${x.me ? '<b>' : ''}${x.n}${x.me ? '</b>' : ''}　${Math.round(x.s)}点`);
    let extra = ''; if (rank === 1) { if (giveItem('extract_secret', 1)) extra = '<p>🏺 優勝賞品：秘伝のスライムエキス！</p>'; }
    passTime(90); resultModal(`🏆 結果発表！ ${rank}位`, lines.concat([`賞金 +${yen(prize)}`, `フォロワー +${gf}`]), extra);
  }

  UI.reg({
    festgo: () => { UI.close(); World.go('fest', { x: 10000, z: 11, rot: Math.PI }); }, hostgo: d => hostEvent(d.id),
    stallbuy: d => { const list = stallList(d.k), [id, pack, price] = list[+d.i], f = ensureFest(); if (S.money < price) return; if (d.k === 'rare') { const key = S.day + id; if ((f.bought[key] || 0) >= 3) return; } if (!giveItem(id, pack)) return UI.toast('バッグがいっぱい！', 'bad'); S.money -= price; if (d.k === 'rare') f.bought[S.day + id] = (f.bought[S.day + id] || 0) + 1; sfx('buy'); UI.paint(); },
    foodbuy: d => { const x = FEST_FOOD.find(f => f.id === d.id); if (S.money < x.price) return; S.money -= x.price; S.staff.forEach(s => { s.mood = Math.min(100, (s.mood || 70) + x.mood); }); sfx('coin'); UI.toast(`${x.icon} ${x.name}を社員にプレゼント！ みんなの機嫌+${x.mood}`, 'good'); UI.paint(); },
    shootgo: () => shootGo(), minigo: d => playGame(d.n), foodcook: d => cookFood(d.id),
    maskbuy: d => { if (S.money < 300) return UI.toast('お金が足りない', 'bad'); S.money -= 300; ensureFest().mask = d.id; World.setMask(d.id); sfx('buy'); UI.toast('🎭 お面をかぶった！', 'good'); UI.paint(); },
    maskoff: () => { ensureFest().mask = null; World.setMask(null); UI.paint(); },
    photospot: () => { const f = ensureFest(); if (f.photo === S.day) return; f.photo = S.day; const g = Math.round(rnd(10, 30) + S.sns.followers * 0.01); S.sns.followers += g; S.today.fol += g; sfx('ok'); UI.toast('📸 いい写真！ フォロワー +' + g, 'good'); UI.paint(); },
    souv: d => { const g = [[300, 3, 0], [800, 8, 3], [2000, 15, 10]][+d.i]; if (S.money < g[0]) return; S.money -= g[0]; S.staff.forEach(st => { st.mood = Math.min(100, (st.mood || 70) + g[1]); }); if (g[2]) { S.sns.followers += g[2]; S.today.fol += g[2]; } sfx('coin'); UI.toast('🎁 社員みんなの機嫌 +' + g[1], 'good'); UI.paint(); }, bstop: () => { boothFinish('かたづけた'); UI.close(); },
    lottery: () => lottery(), bpick: (d, e) => { booth.sid = +e.value; UI.paint(); }, bqty: d => { booth.qty = +d.n; UI.paint(); }, bmul: d => { booth.mul = +d.m; UI.paint(); }, bgo: () => boothStart(),
    wsgo: () => workshopGo(), entry: d => entry(d.id),
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
  return { fireworksOn, enterFest, festTick, boothStatus, eventToday, eventsHTML, openStall, openBooth, openWorkshop, openContest, ensure, notif, surgeOn, surgeMul, sponsorCheck, sponsorHTML, notifHTML, stock, stream, morning, night, moodK, off, face, interiorBonus, decorCount, openTeleport, openParty, openDeco, openRealtor };
})();
