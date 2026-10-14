// 廃墟(ステージ): 番号 n から、間取り・怪物の名簿・怪物の置き場所をプログラムで作る(同じ n なら、いつも同じ間取り)
//   第1廃墟は 80m×56m。進むほど広く、怪物が増える。怪物どうしは、たっぷり離して置く
const Ruins = (() => {
  const CELL = 2;
  const SIZES = [[40, 28], [46, 32], [52, 36], [56, 40]];      // マス数(1マ=2m)。n が大きいほど広い(最大は4番目)
  // 名簿: 廃墟ごとに出る怪物(id, 数)。最後の廃墟以降は、全種類+おまけ
  const ROSTERS = [
    [['nosless', 1], ['weeper', 1], ['shadow', 1], ['mimic', 1], ['spider', 1]],
    [['nosless', 1], ['weeper', 1], ['shadow', 1], ['mimic', 1], ['spider', 1], ['tehaki', 1], ['hand', 1]],
    [['nosless', 1], ['weeper', 1], ['shadow', 1], ['mimic', 1], ['spider', 1], ['tehaki', 1], ['hand', 1], ['kamikui', 1], ['hakibukuro', 1]],
    [['nosless', 1], ['weeper', 1], ['shadow', 1], ['mimic', 1], ['spider', 1], ['tehaki', 1], ['hand', 1], ['kamikui', 1], ['hakibukuro', 1], ['harawari', 1], ['guard', 1]],
  ];
  const ALL = ['nosless', 'weeper', 'shadow', 'spider', 'mimic', 'tehaki', 'hand', 'kamikui', 'hakibukuro', 'harawari', 'guard'];
  const NAMES = ['古い屋敷', '朽ちた旅館', '見捨てられた病院', '廃れた学校', '沈んだ館', '焼け残った屋敷', '無人の療養所'];
  const BIG = ['大広間', '食堂', '倉庫', '広間', '作業場'];
  const MID = ['台所', '書斎', '寝室', '応接間', '礼拝堂', '病室', '機械室', '資料室'];
  const SMALL = ['納戸', '子供部屋', '洗面所', '物置', '控えの間'];
  const LAMPS = [0xffb870, 0xffc890, 0xffa078, 0xb4f0c4, 0xb8c0ff, 0xffb0d0, 0x98a8ff, 0xe0ffe0, 0xe0c0ff];

  function rngFrom(seed) { let s = Math.abs(seed | 0) % 2147483646 + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  const sizeOf = n => SIZES[Math.min(n, SIZES.length - 1)];
  function rosterOf(n) {
    if (n < ROSTERS.length) return ROSTERS[n];
    const extra = n - ROSTERS.length + 1;                          // 最後の廃墟より先は、全種類+おまけ
    return ALL.map((id, i) => [id, 1 + (i < extra ? 1 : 0)]);
  }
  function info(n) {
    const [cols, rows] = sizeOf(n), r = rosterOf(n);
    return { n, name: `第${n + 1}の廃墟: ${NAMES[n % NAMES.length]}`, cols, rows, widthM: cols * CELL, depthM: rows * CELL, total: r.reduce((s, e) => s + e[1], 0) };
  }

  // ---- 間取りを作る ----
  function generate(cols, rows, rng) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const rects = [];
    const MIN = 5, MAXW = 13, MAXH = 11;
    // 1) 大きな四角を縦横に割って、部屋にする。ときどき 1マ幅の廊下をはさむ
    (function split(x1, y1, x2, y2) {
      const w = x2 - x1 + 1, h = y2 - y1 + 1;
      const canV = w >= MIN * 2 + 1, canH = h >= MIN * 2 + 1, big = w > MAXW || h > MAXH;
      if ((!canV && !canH) || (!big && rng() < 0.3 + (w * h < 80 ? 0.4 : 0))) { rects.push({ x1, y1, x2, y2, corridor: false }); return; }
      const vertical = canV && (!canH || w / h > 1.15 || (w / h > 0.87 && rng() < 0.5));
      if (vertical) {
        if (rng() < 0.3) { const c = x1 + MIN + Math.floor(rng() * (w - 2 * MIN)); rects.push({ x1: c, y1, x2: c, y2, corridor: true }); split(x1, y1, c - 1, y2); split(c + 1, y1, x2, y2); }
        else { const cut = x1 + MIN + Math.floor(rng() * (w - 2 * MIN + 2)); split(x1, y1, cut - 1, y2); split(cut, y1, x2, y2); }
      } else {
        if (rng() < 0.3) { const c = y1 + MIN + Math.floor(rng() * (h - 2 * MIN)); rects.push({ x1, y1: c, x2, y2: c, corridor: true }); split(x1, y1, x2, c - 1); split(x1, c + 1, x2, y2); }
        else { const cut = y1 + MIN + Math.floor(rng() * (h - 2 * MIN + 2)); split(x1, y1, x2, cut - 1); split(x1, cut, x2, y2); }
      }
    })(0, 0, cols - 1, rows - 1);
    rects.forEach((r, i) => { r.id = i; for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) grid[y][x] = i; });

    // 2) 入口の部屋: 左下に近い、まともな大きさの部屋
    const area = r => (r.x2 - r.x1 + 1) * (r.y2 - r.y1 + 1);
    let entrance = null, bestD = 1e9;
    rects.forEach(r => { if (r.corridor || area(r) < 30) return; const d = Math.hypot((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2 - rows); if (d < bestD) { bestD = d; entrance = r; } });

    // 3) 建物の外周の部屋の角を欠いて、輪郭をでこぼこにする
    rects.forEach(r => {
      if (r === entrance || r.corridor || rng() > 0.5) return;
      const nw = 2 + Math.floor(rng() * 3), nh = 2 + Math.floor(rng() * 3);
      if (nw * nh > area(r) * 0.25) return;
      const left = r.x1 === 0, right = r.x2 === cols - 1, top = r.y1 === 0, bot = r.y2 === rows - 1;
      const opts = []; if ((left || right) && (top || bot)) opts.push([left ? r.x1 : r.x2 - nw + 1, top ? r.y1 : r.y2 - nh + 1]);
      else if (left || right) opts.push([left ? r.x1 : r.x2 - nw + 1, rng() < 0.5 ? r.y1 : r.y2 - nh + 1]);
      else if (top || bot) opts.push([rng() < 0.5 ? r.x1 : r.x2 - nw + 1, top ? r.y1 : r.y2 - nh + 1]);
      if (!opts.length) return;
      const [cx, cy] = opts[0];
      for (let y = cy; y < cy + nh; y++) for (let x = cx; x < cx + nw; x++) grid[y][x] = -1;
    });

    // 4) 隣り合う部屋を、ときどき1つにつなげて、L字・T字・コの字の部屋にする
    const label = rects.map((_, i) => i);
    const find = i => (label[i] === i ? i : (label[i] = find(label[i])));
    const cells = new Map(); rects.forEach(r => cells.set(r.id, area(r)));
    const pairs = new Map();
    const note = (a, b) => { if (a === b || a < 0 || b < 0) return; const k = a < b ? a + '-' + b : b + '-' + a; pairs.set(k, (pairs.get(k) || 0) + 1); };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { if (x + 1 < cols) note(grid[y][x], grid[y][x + 1]); if (y + 1 < rows) note(grid[y][x], grid[y + 1][x]); }
    [...pairs.entries()].sort(() => rng() - 0.5).forEach(([k, len]) => {
      const [a, b] = k.split('-').map(Number), ra = rects[a], rb = rects[b];
      if (ra.corridor || rb.corridor || ra === entrance || rb === entrance || len < 4 || rng() > 0.35) return;
      const fa = find(a), fb = find(b); if (fa === fb) return;
      if (cells.get(fa) + cells.get(fb) > 100) return;
      label[fb] = fa; cells.set(fa, cells.get(fa) + cells.get(fb));
    });
    // 部屋の番号をつけ直す
    const idOf = new Map(); let nroom = 0;
    const rooms = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const g = grid[y][x]; if (g < 0) continue;
      const f = find(g);
      if (!idOf.has(f)) { idOf.set(f, nroom++); rooms.push({ corridor: rects[f].corridor, entrance: rects[f] === entrance, n: 0 }); }
      grid[y][x] = idOf.get(f); rooms[grid[y][x]].n++;
    }
    // 5) 部屋の名前・床・明かり
    const used = {};
    const pick = (arr, big) => { const a = arr.filter(s => !used[s]); const s = (a.length ? a : arr)[Math.floor(rng() * (a.length ? a.length : arr.length))]; used[s] = true; return s; };
    rooms.forEach((rm, i) => {
      rm.floor = ['wood', 'wood', 'old', 'old', 'wet'][Math.floor(rng() * 5)]; rm.lamp = LAMPS[Math.floor(rng() * LAMPS.length)];
      rm.name = rm.entrance ? '入口の間' : rm.corridor ? ['長い廊下', '細い廊下', '渡り廊下'][Math.floor(rng() * 3)] : rm.n >= 70 ? pick(BIG) : rm.n >= 32 ? pick(MID) : pick(SMALL);
    });

    // 6) ドア: まず全部の部屋がつながるように、次にぐるっと回れるように、ときどき足す
    const edges = new Map();
    const addEdge = (a, b, e) => { if (a === b || a < 0 || b < 0) return; const k = a < b ? a + '-' + b : b + '-' + a; (edges.get(k) || edges.set(k, []).get(k)).push(e); };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (x + 1 < cols) addEdge(grid[y][x], grid[y][x + 1], { c: x, r: y, dir: 'e' });
      if (y + 1 < rows) addEdge(grid[y][x], grid[y + 1][x], { c: x, r: y, dir: 's' });
    }
    const par = rooms.map((_, i) => i), pf = i => (par[i] === i ? i : (par[i] = pf(par[i])));
    const doors = [];
    const makeDoor = list => {
      const ed = list.slice().sort((p, q) => p.dir === 'e' ? (p.c - q.c || p.r - q.r) : (p.r - q.r || p.c - q.c));
      const runs = []; let cur = [ed[0]];
      for (let i = 1; i < ed.length; i++) {
        const p = ed[i - 1], q = ed[i];
        const adj = p.dir === q.dir && (p.dir === 'e' ? q.c === p.c && q.r === p.r + 1 : q.r === p.r && q.c === p.c + 1);
        if (adj) cur.push(q); else { runs.push(cur); cur = [q]; }
      }
      runs.push(cur);
      const good = runs.filter(r => r.length >= 2), run = (good.length ? good : runs)[Math.floor(rng() * (good.length ? good.length : runs.length))];
      if (run.length >= 2) { const s = Math.floor(rng() * (run.length - 1)); doors.push({ a: [run[s].c, run[s].r], dir: run[s].dir, len: 2 }); }
      else doors.push({ a: [run[0].c, run[0].r], dir: run[0].dir, len: 1 });
    };
    const keys = [...edges.keys()].sort(() => rng() - 0.5);
    const extra = [];
    keys.forEach(k => { const [a, b] = k.split('-').map(Number); if (pf(a) !== pf(b)) { par[pf(a)] = pf(b); makeDoor(edges.get(k)); } else extra.push(k); });
    extra.forEach(k => { if (rng() < 0.3) makeDoor(edges.get(k)); });
    return { grid, rooms, doors, entrance: rooms.findIndex(r => r.entrance) };
  }

  // ---- 怪物の置き場所: 入口から遠く、おたがいに離す ----
  function place(layout, cols, rows, roster, rng, n) {
    const cells = layout.rooms.map(() => []);
    layout.grid.forEach((row, y) => row.forEach((g, x) => { if (g >= 0) cells[g].push([x, y]); }));
    const cen = i => { const c = cells[i], mx = c.reduce((s, p) => s + p[0], 0) / c.length, my = c.reduce((s, p) => s + p[1], 0) / c.length; return c.reduce((b, p) => (Math.hypot(p[0] - mx, p[1] - my) < Math.hypot(b[0] - mx, b[1] - my) ? p : b), c[0]); };
    const world = p => ({ x: (-cols * CELL / 2) + p[0] * CELL + CELL / 2, z: (-rows * CELL / 2) + p[1] * CELL + CELL / 2 });
    const ent = world(cen(layout.entrance));
    const out = [];
    const list = []; roster.forEach(([id, k]) => { for (let i = 0; i < k; i++) list.push(id); });
    // 水の怪物は、浴場(水たまり)に置く
    let pool = null;
    const roomOk = i => !layout.rooms[i].corridor && i !== layout.entrance;
    let sep = 28 + Math.min(n, 3) * 2, minEnt = 32;
    list.forEach((id, k) => {
      let cand = layout.rooms.map((_, i) => i).filter(roomOk).filter(i => cells[i].length >= 20);
      let chosen = -1;
      for (let attempt = 0; attempt < 10 && chosen < 0; attempt++) {
        const ok = cand.filter(i => { const p = world(cen(i)); return Math.hypot(p.x - ent.x, p.z - ent.z) >= minEnt * Math.pow(0.92, attempt) && out.every(o => Math.hypot(p.x - o.x, p.z - o.z) >= sep * Math.pow(0.92, attempt)); });
        if (ok.length) chosen = ok[Math.floor(rng() * ok.length)];
      }
      if (chosen < 0) chosen = cand[Math.floor(rng() * cand.length)];
      let p = world(cen(chosen));
      if (id === 'hand' && !pool) {                                         // 浴場に水たまりを作って、その中に置く
        const rm = layout.rooms[chosen]; rm.name = '浴場'; rm.floor = 'wet'; rm.lamp = 0x78b0ff;
        pool = { room: chosen, x: p.x, z: p.z, hw: 2.2, hd: 2.6 };
      } else if (id !== 'hand') {
        const c = cells[chosen][Math.floor(rng() * cells[chosen].length)]; const q = world(c);
        if (id !== 'kamikui' && Math.hypot(q.x - p.x, q.z - p.z) < 6) p = q;       // 部屋の真ん中から少しずらす
      }
      out.push({ uid: id + '#' + k, def: id, x: p.x, z: p.z, room: chosen });
    });
    return { monsters: out, pool };
  }

  const memo = {};
  function plan(n) {
    if (memo[n]) return memo[n];
    const [cols, rows] = sizeOf(n), rng = rngFrom(1000 + n * 7919);
    const layout = generate(cols, rows, rng);
    const roster = rosterOf(n), placed = place(layout, cols, rows, roster, rng, n);
    // 水の怪物の水たまりが、部屋に収まるか確かめる(収まらなければ、水たまりを小さくする)
    if (placed.pool) { const rm = layout.rooms[placed.pool.room]; if (rm.n < 36) { placed.pool.hw = 1.6; placed.pool.hd = 1.8; } }
    return (memo[n] = Object.assign({ n, cols, rows, name: info(n).name, roster }, layout, placed));
  }

  return { plan, info, CELL, ALL };
})();
