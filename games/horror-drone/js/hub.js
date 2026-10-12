// 自宅の画面: 図鑑 / 戦利品ボックスと武器開発 / 出撃準備
const Hub = (() => {
  const $ = id => document.getElementById(id);
  let tab = 'dex', sel = ['handgun', 'shotgun'], cb = {};
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const itemName = k => (Items[k] ? Items[k].name : k);

  // ---- 図鑑 ----
  function dexCard(id) {
    const def = MonsterDefs[id], e = Know.ent(id), d = def.dex;
    const seen = e.seen || e.kills > 0 || e.scan.body > 0 || e.scan.head > 0 || e.scan.weak > 0;
    if (!seen) return '<div class="mcard unseen"><h3>？？？ <small>未発見</small></h3><div class="intro">まだ姿を見ていない。ドローンで探そう。</div></div>';
    const showHead = d.head !== '';
    const bar = (label, v) => `<div>${label} ${Math.round(v * 100)}%<i class="${v >= 1 ? 'done' : ''}"><b style="width:${v * 100}%"></b></i></div>`;
    const fact = (label, known, text, hint) => known
      ? `<div class="fact"><b>${label}</b>${esc(text)}</div>`
      : `<div class="fact lock"><b>${label}</b>？？？(${hint})</div>`;
    let h = `<div class="mcard"><h3><span>${esc(def.name)} <small>${esc(def.kana)}</small></span><small>討伐 ${e.kills}</small></h3>`;
    h += `<div class="intro">${esc(d.intro)}</div>`;
    h += `<div class="bars">${bar('体', e.scan.body)}${showHead ? bar('頭', e.scan.head) : ''}${bar('弱点', e.scan.weak)}</div>`;
    h += fact('体', e.scan.body >= 1, d.body, 'ドローンで解析');
    if (showHead) h += fact('頭', e.scan.head >= 1, d.head, 'ドローンで解析');
    h += fact('弱点', e.scan.weak >= 1, d.weak, '弱点が開く瞬間に解析');
    if (e.scan.weak >= 1) {
      const ws = weaponsForAttr(def.weakAttr).map(n => {
        const w = Object.values(Weapons).find(x => x.name === n);
        return Know.hasWeapon(w.id) ? n : n + '(未開発)';
      });
      h += `<div class="weapons">弱点の属性: ${ATTR_NAME[def.weakAttr]} → ${esc(ws.join(' / '))}</div>`;
    }
    h += fact('予兆', e.tell, d.tell, '録画を再生して確認');
    const drops = def.drops.map(x => itemName(x.item)).join('、');
    h += `<div class="fact ${e.kills > 0 ? '' : 'lock'}"><b>素材</b>${e.kills > 0 ? esc(drops) : '？？？(倒すと判明)'}</div>`;
    return h + '</div>';
  }
  function renderDex() {
    const seenN = MONSTER_ORDER.filter(id => { const e = Know.ent(id); return e.seen || e.kills > 0 || e.scan.body > 0 || e.scan.weak > 0; }).length;
    $('panelDex').innerHTML = `<div class="hint2">発見 ${seenN} / ${MONSTER_ORDER.length}。ドローンで姿を見つけ、解析して、録画を見返すと分かることが増える。</div>` + MONSTER_ORDER.map(dexCard).join('');
  }

  // ---- 戦利品ボックスと武器開発 ----
  function renderBox() {
    const mats = Object.keys(Items).filter(k => Items[k].kind === 'mat');
    let h = '<h3 class="sec">戦利品ボックス</h3><div class="lootgrid">' +
      mats.map(k => `<div class="lootitem ${Know.count(k) ? '' : 'zero'}"><span>${esc(itemName(k))}</span><b>×${Know.count(k)}</b></div>`).join('') + '</div>';
    h += '<div class="hint2">帰還点まで生きて戻ると、持っていた戦利品がここに入る。やられると、持っていた分は失う。</div>';
    h += '<h3 class="sec">武器開発</h3>';
    for (const id in Weapons) {
      const w = Weapons[id]; if (!w.recipe) continue;
      const have = Know.hasWeapon(id);
      const need = Object.keys(w.recipe).map(k => {
        const ok = Know.count(k) >= w.recipe[k];
        return `<span class="${ok ? 'ok' : 'no'}">${esc(itemName(k))} ${Know.count(k)}/${w.recipe[k]}</span>`;
      }).join('');
      h += `<div class="recipe ${have ? 'have' : ''}"><div class="rh"><b>${esc(w.name)} <small class="sub">属性: ${ATTR_NAME[w.attr]}</small></b>` +
        (have ? '<span class="sub">開発済み</span>' : `<button data-craft="${id}" ${Know.canCraft(id) ? '' : 'disabled'}>開発する</button>`) +
        `</div><div class="rd">${esc(w.desc)} 弾 ${w.ammo > 90 ? '∞' : w.ammo}</div>${have ? '' : `<div class="need">${need}</div>`}</div>`;
    }
    $('panelBox').innerHTML = h;
    $('panelBox').querySelectorAll('[data-craft]').forEach(b => {
      b.onclick = () => { if (Know.craft(b.dataset.craft)) { if (cb.onCraft) cb.onCraft(b.dataset.craft); render(); } };
    });
  }

  // ---- 出撃準備 ----
  function renderSortie() {
    sel = sel.filter(id => Know.hasWeapon(id));
    let h = '<div class="hint2">持っていく武器を2つ選ぶ。怪物ごとに弱点の属性が違う。図鑑で調べた弱点に合う武器を持っていこう。帰還点は自宅の部屋の緑の輪。</div>';
    const weakAttrs = {};
    MONSTER_ORDER.forEach(id => { if (Know.weakKnown(id)) (weakAttrs[MonsterDefs[id].weakAttr] = weakAttrs[MonsterDefs[id].weakAttr] || []).push(MonsterDefs[id].name); });
    for (const w of Object.values(Weapons)) {
      if (!Know.hasWeapon(w.id)) continue;
      const tag = weakAttrs[w.attr] ? `<span class="tag">★ ${esc(weakAttrs[w.attr].join('・'))}に効く</span>` : '';
      h += `<button class="wbtn ${sel.includes(w.id) ? 'sel' : ''}" data-w="${w.id}">${tag}<b>${esc(w.name)}</b> <small>属性: ${ATTR_NAME[w.attr]} / 弾 ${w.ammo > 90 ? '∞' : w.ammo}</small><small>${esc(w.desc)}</small></button>`;
    }
    h += `<div class="runs">生還 ${Know.s.runs.ok} 回 / やられた ${Know.s.runs.died} 回</div>`;
    $('panelSortie').innerHTML = h;
    $('panelSortie').querySelectorAll('[data-w]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.w;
        if (sel.includes(id)) sel = sel.filter(x => x !== id); else { sel.push(id); if (sel.length > 2) sel.shift(); }
        renderSortie(); updateButtons();
      };
    });
  }
  function updateButtons() {
    const ok = sel.length === 2;
    $('btnSortie').disabled = !ok;
    $('btnSortie').textContent = ok ? '出撃する' : '武器を2つ選んで出撃';
  }

  function render() {
    renderDex(); renderBox(); renderSortie(); updateButtons();
    for (const t of ['dex', 'box', 'sortie']) {
      $('tab' + t[0].toUpperCase() + t.slice(1)).classList.toggle('sel', tab === t);
      $('panel' + t[0].toUpperCase() + t.slice(1)).classList.toggle('hidden', tab !== t);
    }
  }
  function setTab(t) { tab = t; render(); }

  function init(callbacks) {
    cb = callbacks;
    $('tabDex').onclick = () => setTab('dex');
    $('tabBox').onclick = () => setTab('box');
    $('tabSortie').onclick = () => setTab('sortie');
    $('btnDrone').onclick = () => cb.onDrone();
    $('btnSortie').onclick = () => { if (sel.length === 2) cb.onSortie(sel.slice()); };
    $('btnReset').onclick = () => { if (confirm('図鑑・戦利品・開発した武器を全部消しますか?')) { Know.reset(); sel = ['handgun', 'shotgun']; render(); } };
  }
  function show(note, goTab) { $('hubNote').textContent = note || ''; if (goTab) tab = goTab; render(); }

  return { init, show, setTab, selected: () => sel.slice() };
})();
