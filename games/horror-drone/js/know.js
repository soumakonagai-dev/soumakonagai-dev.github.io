// 記録: 図鑑(怪物ごとの解析・発見・討伐数) / 戦利品ボックス / 開発済みの武器。localStorage に保存する
const Know = (() => {
  const KEY = 'horrorDrone.v2';
  const s = { dex: {}, box: {}, weapons: [], runs: { ok: 0, died: 0 } };
  const startWeapons = () => Object.values(Weapons).filter(w => w.start).map(w => w.id);

  function load() {
    s.weapons = startWeapons();
    try {
      const j = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (j) {
        Object.assign(s.dex, j.dex || {}); Object.assign(s.box, j.box || {});
        (j.weapons || []).forEach(w => { if (Weapons[w] && !s.weapons.includes(w)) s.weapons.push(w); });
        Object.assign(s.runs, j.runs || {});
      }
    } catch (e) { /* 保存できない環境では毎回リセットされるだけ */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function reset() { s.dex = {}; s.box = {}; s.weapons = startWeapons(); s.runs = { ok: 0, died: 0 }; save(); }

  // 図鑑
  const ent = id => s.dex[id] || (s.dex[id] = { scan: { body: 0, head: 0, weak: 0 }, tell: false, seen: false, kills: 0 });
  function markSeen(id) { const e = ent(id); if (e.seen) return false; e.seen = true; save(); return true; }
  // 解析を進める。100%に達した瞬間だけ true を返す
  function addScan(id, part, v) {
    const e = ent(id), before = e.scan[part];
    if (before >= 1) return false;
    e.scan[part] = Math.min(1, before + v);
    if (e.scan[part] >= 1) { save(); return true; }
    return false;
  }
  function learnTell(id) { const e = ent(id); if (e.tell) return false; e.tell = true; save(); return true; }
  function addKill(id) { ent(id).kills++; save(); }
  const weakKnown = id => ent(id).scan.weak >= 1;
  const tellKnown = id => ent(id).tell;

  // 戦利品ボックス
  function bank(carry) { for (const k in carry) s.box[k] = (s.box[k] || 0) + carry[k]; save(); }
  const count = item => s.box[item] || 0;
  const hasWeapon = id => s.weapons.includes(id);
  function canCraft(wid) {
    const w = Weapons[wid];
    return !!(w && w.recipe && !hasWeapon(wid) && Object.keys(w.recipe).every(k => count(k) >= w.recipe[k]));
  }
  function craft(wid) {
    if (!canCraft(wid)) return false;
    const w = Weapons[wid];
    for (const k in w.recipe) s.box[k] -= w.recipe[k];
    s.weapons.push(wid); save(); return true;
  }

  load();
  return { s, load, save, reset, ent, markSeen, addScan, learnTell, addKill, weakKnown, tellKnown, bank, count, hasWeapon, canCraft, craft };
})();
