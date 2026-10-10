// セーブデータ（localStorage）。保存できない環境でもメモリ上では動く。
BB.save = (function () {
  const KEY = 'battle-blast-save-v1';
  // owned[id] = その装備の +値(0〜20) / spare[id] = 合体の素材にできるダブりの数
  const fresh = () => ({ ver: 2, coins: 0, owned: {}, spare: {}, buddies: {}, party: [], scout: null, challenge: {}, equipped: { weapon: null, armor: null, acc: null }, stages: {}, pulls: 0 });
  let data = fresh();

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw), f = fresh();
      data = Object.assign(f, d, { equipped: Object.assign(f.equipped, d.equipped || {}), spare: d.spare || {} });
      if (!d.ver || d.ver < 2) {              // 旧: owned[id] は Lv(1〜5) → +値(Lv-1)に変換
        Object.keys(data.owned).forEach(id => { data.owned[id] = Math.max(0, data.owned[id] - 1); });
        data.ver = 2;
      }
    }
  } catch (e) { /* 読めなければ新規データ */ }

  function commit() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 保存できなくても続行 */ }
  }

  return {
    get data() { return data; },
    commit,
    reset() { data = fresh(); commit(); }
  };
})();
