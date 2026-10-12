// 舞台: 形のばらばらな部屋が並ぶ、古い木造の屋敷(44m × 32m)。左の「自宅の部屋」がスタートと帰還点
// 間取りは 2m四方のマス目で描く。L字・T字・細い廊下・凸凹の部屋ができ、壁・柱・床・梁・経路は自動で作られる
const World = (() => {
  const CELL = 2, COLS = 22, ROWS = 16, X0 = -22, Z0 = -16, H = 3.2, T = 0.25;
  const bounds = { minX: X0, maxX: X0 + COLS * CELL, minZ: Z0, maxZ: Z0 + ROWS * CELL, h: H };
  const spawn = { x: -15, z: 1, r: 2.4 };      // 帰還点
  const pool = { x: 17, z: 8, hw: 2.2, hd: 2.6 };

  // 部屋: rects = [[左の列, 上の行, 右の列, 下の行], …](両端を含む)。複数の四角でL字・T字になる
  //   c: 0123456789012345678901
  //  r1  EEEEEEEEEEEC FFFFFFFF L
  //  …(下の図は README にも載せた)
  const ROOMS = [
    { id: 'A', name: '自宅の部屋',   floor: 'wood', lamp: 0xffb870, rects: [[1, 6, 5, 10], [1, 11, 3, 13]] },          // L字
    { id: 'B', name: '玄関ホール',   floor: 'old',  lamp: 0xffc890, rects: [[6, 7, 8, 10]] },
    { id: 'C', name: '長い廊下',     floor: 'wet',  lamp: 0x98a8ff, rects: [[11, 1, 11, 7]] },                          // 細い廊下
    { id: 'D', name: '大広間',       floor: 'wood', lamp: 0xffa078, rects: [[9, 8, 17, 12]] },
    { id: 'E', name: '廃病院の病棟', floor: 'old',  lamp: 0xb4f0c4, rects: [[1, 1, 10, 3], [8, 4, 10, 5]] },           // 横長+張り出し
    { id: 'F', name: '書斎',         floor: 'wood', lamp: 0xffc890, rects: [[12, 1, 19, 4]] },
    { id: 'G', name: '台所',         floor: 'old',  lamp: 0xe0ffe0, rects: [[12, 5, 19, 7]] },
    { id: 'H', name: '浴場',         floor: 'wet',  lamp: 0x78b0ff, rects: [[18, 8, 20, 15]] },                         // 縦長
    { id: 'I', name: '子供部屋',     floor: 'wood', lamp: 0xffb0d0, rects: [[1, 14, 8, 15]] },
    { id: 'J', name: '倉庫',         floor: 'old',  lamp: 0xb8c0ff, rects: [[9, 13, 17, 14], [12, 15, 14, 15]] },      // T字
    { id: 'K', name: '地下への廊下', floor: 'old',  lamp: 0x98a8ff, rects: [[4, 11, 8, 13]] },
    { id: 'L', name: '祈りの間',     floor: 'wood', lamp: 0xe0c0ff, rects: [[20, 1, 21, 7]] },                          // 細長い
  ];
  // ドア: a のマスの 東('e')/南('s') の境目に、len マぶん(1マ=2m)開ける
  const DOORS = [
    { a: [5, 8], dir: 'e', len: 2 }, { a: [3, 12], dir: 'e', len: 2 }, { a: [1, 13], dir: 's', len: 2 },     // 自宅 → 玄関 / 地下廊下 / 子供部屋
    { a: [7, 10], dir: 's', len: 2 }, { a: [8, 9], dir: 'e', len: 2 }, { a: [5, 13], dir: 's', len: 2 },
    { a: [8, 11], dir: 'e', len: 2 }, { a: [8, 14], dir: 'e', len: 1 }, { a: [12, 12], dir: 's', len: 2 },
    { a: [16, 12], dir: 's', len: 2 }, { a: [17, 10], dir: 'e', len: 2 }, { a: [14, 7], dir: 's', len: 2 },
    { a: [11, 6], dir: 'e', len: 2 }, { a: [10, 2], dir: 'e', len: 2 }, { a: [10, 4], dir: 'e', len: 2 },
    { a: [11, 2], dir: 'e', len: 2 }, { a: [15, 4], dir: 's', len: 2 }, { a: [19, 2], dir: 'e', len: 2 },
    { a: [19, 5], dir: 'e', len: 2 }, { a: [18, 7], dir: 's', len: 2 }, { a: [17, 13], dir: 'e', len: 2 },
  ];

  const colliders = [];   // 移動の当たり判定(箱)
  const meshes = [];      // 弾やスキャンを遮る物
  const rooms = [];
  const cellRoom = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  const doorV = new Set(), doorH = new Set();          // ドアになっている境目
  const adjRooms = ROOMS.map(() => []);
  let scene, amb, spot;
  const lamps = [];
  const bulbs = [];
  let dust = null, dustBase = null, mistTex = null;
  let fields = [];       // 目標のマスごとの「そこまでの歩数」(経路探索用)
  let roomDepthTab = [];

  const isMobile = matchMedia('(pointer:coarse)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ccx = c => X0 + c * CELL + CELL / 2, ccz = r => Z0 + r * CELL + CELL / 2;
  const cellIdx = (c, r) => r * COLS + c;
  const roomOfCell = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? -1 : cellRoom[r][c]);

  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  }
  // 板張り: 一枚ごとに色が違い、木目・節・継ぎ目・汚れがある
  function planks(o, rx, ry) {
    o = Object.assign({ rows: 8, base: [104, 76, 48], vary: 14, grain: 0.14, dirt: 0.25, stain: 0.12 }, o);
    return canvasTex(512, 512, (g, w, h) => {
      const ph = h / o.rows;
      for (let r = 0; r < o.rows; r++) {
        const k = (rand() - 0.5) * o.vary * 2;
        g.fillStyle = `rgb(${o.base[0] + k},${o.base[1] + k * 0.8},${o.base[2] + k * 0.6})`; g.fillRect(0, r * ph, w, ph);
        for (let i = 0; i < 44; i++) {
          g.strokeStyle = `rgba(0,0,0,${o.grain * (0.4 + rand())})`; g.lineWidth = 0.7;
          const y = r * ph + rand() * ph, x = rand() * w; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 60, y + (rand() - 0.5) * 4, x + 140, y + (rand() - 0.5) * 4, x + 40 + rand() * 220, y + (rand() - 0.5) * 3); g.stroke();
        }
        if (rand() < 0.45) {
          const x = rand() * w, y = r * ph + ph * (0.3 + rand() * 0.4);
          for (let s = 3; s > 0; s--) { g.strokeStyle = `rgba(30,18,8,${0.25 + s * 0.1})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 4 + s * 4, 2 + s * 2, 0, 0, 7); g.stroke(); }
          g.fillStyle = 'rgba(25,14,6,.7)'; g.beginPath(); g.ellipse(x, y, 3, 1.6, 0, 0, 7); g.fill();
        }
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, r * ph, w, 2);
        g.fillStyle = 'rgba(255,230,190,.08)'; g.fillRect(0, r * ph + 2, w, 1);
        const ex = rand() * w; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(ex, r * ph, 2, ph);
        g.fillStyle = 'rgba(20,20,20,.6)'; g.fillRect(ex + 6, r * ph + ph / 2, 2, 2); g.fillRect(ex - 6, r * ph + ph / 2, 2, 2);
      }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,18,8,${o.dirt * (0.1 + rand() * 0.2)})`; g.beginPath(); g.arc(rand() * w, rand() * h, 8 + rand() * 46, 0, 7); g.fill(); }
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(70,8,8,${o.stain * (0.3 + rand() * 0.5)})`; g.beginPath(); g.ellipse(rand() * w, rand() * h, 6 + rand() * 24, 4 + rand() * 14, rand() * 3, 0, 7); g.fill(); }
      if (o.skirt) {                                                          // 巾木(足元の板)と回り縁(天井際)
        g.fillStyle = 'rgba(18,10,4,.6)'; g.fillRect(0, h * 0.93, w, h * 0.07); g.fillStyle = 'rgba(255,220,170,.18)'; g.fillRect(0, h * 0.93, w, 2);
        g.fillStyle = 'rgba(18,10,4,.55)'; g.fillRect(0, 0, w, h * 0.04); g.fillStyle = 'rgba(255,220,170,.12)'; g.fillRect(0, h * 0.04, w, 1.5);
      }
    }, rx, ry);
  }

  function box(w, h, d, x, y, z, mat, collide) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); scene.add(m); meshes.push(m);
    m.receiveShadow = true; m.castShadow = !!collide;
    if (collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: y - h / 2, top: y + h / 2 });
    return m;
  }
  const plain = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.95 : r });

  // ---- 間取りから、部屋・ドア・壁の位置を割り出す ----
  function layout() {
    ROOMS.forEach((rm, idx) => {
      const cells = [];
      rm.rects.forEach(([c1, r1, c2, r2]) => {
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
          if (cellRoom[r][c] >= 0) console.warn('[間取り] 部屋が重なっている', rm.id, c, r);
          cellRoom[r][c] = idx; cells.push([c, r]);
        }
      });
      const mx = cells.reduce((s, p) => s + ccx(p[0]), 0) / cells.length, mz = cells.reduce((s, p) => s + ccz(p[1]), 0) / cells.length;
      const mid = cells.reduce((b, p) => (Math.hypot(ccx(p[0]) - mx, ccz(p[1]) - mz) < Math.hypot(ccx(b[0]) - mx, ccz(b[1]) - mz) ? p : b), cells[0]);
      rooms.push({ idx, id: rm.id, name: rm.name, floor: rm.floor, lamp: rm.lamp, cells, cx: ccx(mid[0]), cz: ccz(mid[1]) });
    });
    DOORS.forEach(d => {
      const [c, r] = d.a;
      for (let i = 0; i < d.len; i++) {
        const c1 = d.dir === 'e' ? c : c + i, r1 = d.dir === 'e' ? r + i : r, c2 = d.dir === 'e' ? c + 1 : c + i, r2 = d.dir === 'e' ? r + i : r + 1;
        const a = roomOfCell(c1, r1), b = roomOfCell(c2, r2);
        if (a < 0 || b < 0 || a === b) { console.warn('[間取り] ドアの両側が別の部屋になっていない', d); continue; }
        (d.dir === 'e' ? doorV : doorH).add(d.dir === 'e' ? `${c + 1}:${r + i}` : `${c + i}:${r + 1}`);
        if (!adjRooms[a].includes(b)) { adjRooms[a].push(b); adjRooms[b].push(a); }
      }
    });
    // 部屋どうしの距離(いくつドアを越えるか)
    roomDepthTab = ROOMS.map((_, s) => {
      const dist = ROOMS.map(() => -1); dist[s] = 0; const q = [s];
      while (q.length) { const u = q.shift(); for (const v of adjRooms[u]) if (dist[v] < 0) { dist[v] = dist[u] + 1; q.push(v); } }
      return dist;
    });
  }
  // 縦の境目(c の左右)・横の境目(r の上下)に壁があるか
  const wallV = (c, r) => roomOfCell(c - 1, r) !== roomOfCell(c, r) && !doorV.has(`${c}:${r}`);
  const wallH = (c, r) => roomOfCell(c, r - 1) !== roomOfCell(c, r) && !doorH.has(`${c}:${r}`);

  // ---- 経路探索: 目標のマスから各マスまでの歩数を、全部あらかじめ数えておく ----
  function passable(c1, r1, c2, r2) {
    const a = roomOfCell(c1, r1), b = roomOfCell(c2, r2);
    if (a < 0 || b < 0) return false;
    if (a === b) return true;
    if (r1 === r2) return doorV.has(`${Math.max(c1, c2)}:${r1}`);
    return doorH.has(`${c1}:${Math.max(r1, r2)}`);
  }
  function buildFields() {
    const N = COLS * ROWS, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    fields = new Array(N).fill(null);
    for (let t = 0; t < N; t++) {
      const tc = t % COLS, tr = (t / COLS) | 0;
      if (roomOfCell(tc, tr) < 0) continue;
      const f = new Int16Array(N).fill(-1); f[t] = 0; const q = [t];
      for (let qi = 0; qi < q.length; qi++) {
        const u = q[qi], uc = u % COLS, ur = (u / COLS) | 0;
        for (const [dc, dr] of dirs) {
          const nc = uc + dc, nr = ur + dr;
          if (!passable(uc, ur, nc, nr)) continue;
          const v = cellIdx(nc, nr);
          if (f[v] < 0) { f[v] = f[u] + 1; q.push(v); }
        }
      }
      fields[t] = f;
    }
  }
  function cellAt(x, z) {
    const c = clamp(Math.floor((x - X0) / CELL), 0, COLS - 1), r = clamp(Math.floor((z - Z0) / CELL), 0, ROWS - 1);
    if (cellRoom[r][c] >= 0) return [c, r];
    for (let k = 1; k <= 3; k++) for (let dr = -k; dr <= k; dr++) for (let dc = -k; dc <= k; dc++) {
      if (roomOfCell(c + dc, r + dr) >= 0) return [c + dc, r + dr];
    }
    return [c, r];
  }
  // 2点の間に壁がなく、まっすぐ歩けるか(壁やドアの柱から 0.5m 離れて通れる線だけ「通れる」とする)
  function lineClear(x0, z0, x1, z1) {
    const L = Math.hypot(x1 - x0, z1 - z0);
    if (L < 1e-3) return true;
    const px = -(z1 - z0) / L * 0.5, pz = (x1 - x0) / L * 0.5;
    return line1(x0, z0, x1, z1) && line1(x0 + px, z0 + pz, x1 + px, z1 + pz) && line1(x0 - px, z0 - pz, x1 - px, z1 - pz);
  }
  function line1(x0, z0, x1, z1) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.45));
    let [pc, pr] = cellAt(x0, z0);
    for (let i = 1; i <= n; i++) {
      const [c, r] = cellAt(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n);
      if (c === pc && r === pr) continue;
      if (c !== pc && r !== pr) { if (!(passable(pc, pr, c, pr) && passable(c, pr, c, r)) || !(passable(pc, pr, pc, r) && passable(pc, r, c, r))) return false; }
      else if (!passable(pc, pr, c, r)) return false;
      pc = c; pr = r;
    }
    return true;
  }
  // いまの位置から目標へ向かうとき、次に向かう点(壁やL字の角を避けて、ドアを通る)
  function nextWaypoint(fx, fz, tx, tz) {
    const [sc, sr] = cellAt(fx, fz), [tc, tr] = cellAt(tx, tz);
    if (sc === tc && sr === tr) return { x: tx, z: tz };
    const f = fields[cellIdx(tc, tr)];
    if (!f || f[cellIdx(sc, sr)] < 0) return { x: tx, z: tz };
    if (lineClear(fx, fz, tx, tz)) return { x: tx, z: tz };
    let c = sc, r = sr, best = null;
    for (let step = 0; step < 6; step++) {
      let nb = null, nd = f[cellIdx(c, r)];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!passable(c, r, c + dc, r + dr)) continue;
        const d = f[cellIdx(c + dc, r + dr)];
        if (d >= 0 && d < nd) { nd = d; nb = [c + dc, r + dr]; }
      }
      if (!nb) break;
      c = nb[0]; r = nb[1];
      if (step === 0 || lineClear(fx, fz, ccx(c), ccz(r))) best = [c, r]; else break;
    }
    return best ? { x: ccx(best[0]), z: ccz(best[1]) } : { x: tx, z: tz };
  }

  function build(sc, cam) {
    scene = sc;
    layout();
    buildFields();

    const wallBase = planks({ rows: 12, base: [142, 110, 76], vary: 12, dirt: 0.3, skirt: true }, 1, 1);
    const wallMats = {};
    const wallMat = len => {
      const k = Math.max(1, Math.round(len / 2.5));
      if (!wallMats[k]) { const t = wallBase.clone(); t.needsUpdate = true; t.repeat.set(k, 1); wallMats[k] = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.18, roughness: 0.95 }); }
      return wallMats[k];
    };
    const mkFloor = (o, r) => { const t = planks(o, 4, 3); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.3, roughness: r }); };
    const floorMats = {
      wood: mkFloor({ rows: 8, base: [118, 84, 52] }, 0.8),
      old: mkFloor({ rows: 10, base: [96, 80, 62], vary: 18, dirt: 0.4 }, 0.95),
      wet: mkFloor({ rows: 9, base: [64, 50, 38], vary: 10, dirt: 0.45 }, 0.4),          // 濡れた床はつやがある
    };
    const ceilMat = new THREE.MeshStandardMaterial({ map: planks({ rows: 10, base: [70, 54, 38], vary: 10 }, 4, 3), roughness: 1 });
    const beamMat = plain(0x3a2a1a, 1);

    // 見た目の部品: 光のにじみ・もや・埃
    const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const cloud = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      for (let i = 0; i < 70; i++) { const x = rand() * 256, y = rand() * 256, r = 18 + rand() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    mistTex = cloud;
    const mistMat = new THREE.MeshBasicMaterial({ map: cloud, color: 0x8896aa, transparent: true, opacity: 0.11, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const addMist = (W, D, x, z) => {                                         // 床すれすれに漂う、ゆっくり流れるもや
      const g = new THREE.PlaneGeometry(W, D), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 7, uv.getY(i) * D / 7);
      const m = new THREE.Mesh(g, mistMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.5, z); scene.add(m);
    };
    const glowMat = c => new THREE.SpriteMaterial({ map: glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.8 });
    const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.9)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
    const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, color: 0x6c8cc8, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const addShaft = (x, z, nx, nz) => {                                       // 窓から差し込む、青白い光の筋
      const sx = -nz, sz = nx, v = [];
      const q = (px, py, pz) => v.push(px, py, pz);
      const a = [x - sx * 0.62, 2.25, z - sz * 0.62], b = [x + sx * 0.62, 2.25, z + sz * 0.62];
      const c = [x + nx * 3.6 + sx * 1.1, 0.02, z + nz * 3.6 + sz * 1.1], d = [x + nx * 3.6 - sx * 1.1, 0.02, z + nz * 3.6 - sz * 1.1];
      [a, b, c, a, c, d].forEach(p => q(p[0], p[1], p[2]));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], 2));
      scene.add(new THREE.Mesh(g, shaftMat));
    };

    // 床・天井・梁: 部屋ごとに、同じ形のマスをできるだけ大きな四角にまとめる
    for (const rm of rooms) {
      const used = new Set(), inRoom = (c, r) => roomOfCell(c, r) === rm.idx && !used.has(cellIdx(c, r));
      for (const [c0, r0] of rm.cells) {
        if (used.has(cellIdx(c0, r0))) continue;
        let w = 1; while (inRoom(c0 + w, r0)) w++;
        let h = 1;
        outer: while (true) { for (let i = 0; i < w; i++) if (!inRoom(c0 + i, r0 + h)) break outer; h++; }
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used.add(cellIdx(c0 + i, r0 + j));
        const W = w * CELL, D = h * CELL, x = X0 + c0 * CELL + W / 2, z = Z0 + r0 * CELL + D / 2;
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMats[rm.floor]);
        fl.rotation.x = -Math.PI / 2; fl.position.set(x, 0, z); scene.add(fl); meshes.push(fl);
        const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
        ce.rotation.x = Math.PI / 2; ce.position.set(x, H, z); scene.add(ce); meshes.push(ce);
        fl.receiveShadow = true; ce.receiveShadow = true; addMist(W, D, x, z);
        // 梁: 長い方向に棟木、短い方向に垂木
        const longX = W >= D, Lg = longX ? W : D, Sh = longX ? D : W;
        if (Lg >= 6) box(longX ? Lg - 0.1 : 0.26, 0.28, longX ? 0.26 : Lg - 0.1, x, H - 0.14, z, beamMat, false);
        const n = Math.max(1, Math.floor(Lg / 4));
        for (let i = 0; i < n; i++) {
          const o = -Lg / 2 + (i + 0.5) * Lg / n;
          box(longX ? 0.22 : Sh - 0.1, 0.22, longX ? Sh - 0.1 : 0.22, longX ? x + o : x, H - 0.11, longX ? z : z + o, beamMat, false);
        }
      }
      lamps.push(new THREE.Vector3(rm.cx, 2.7, rm.cz));
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), plain(0x111111, 1)); cord.position.set(rm.cx, 2.95, rm.cz); scene.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: rm.lamp })); bulb.position.set(rm.cx, 2.68, rm.cz); scene.add(bulb);
      const halo = new THREE.Sprite(glowMat(rm.lamp)); halo.scale.set(1.5, 1.5, 1); halo.position.copy(bulb.position); scene.add(halo);
      bulbs.push({ halo, ph: rand() * 6 });
    }

    // 壁: 部屋の境目と外周に、同じ向きにつながる所を1枚にまとめて作る
    for (let c = 0; c <= COLS; c++) for (let r = 0; r < ROWS; r++) {           // 縦の壁
      if (!wallV(c, r) || (r > 0 && wallV(c, r - 1))) continue;
      let r2 = r; while (r2 + 1 < ROWS && wallV(c, r2 + 1)) r2++;
      const len = (r2 - r + 1) * CELL;
      box(T, H, len, X0 + c * CELL, H / 2, Z0 + r * CELL + len / 2, wallMat(len), true);
    }
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) {           // 横の壁
      if (!wallH(c, r) || (c > 0 && wallH(c - 1, r))) continue;
      let c2 = c; while (c2 + 1 < COLS && wallH(c2 + 1, r)) c2++;
      const len = (c2 - c + 1) * CELL;
      box(len, H, T, X0 + c * CELL + len / 2, H / 2, Z0 + r * CELL, wallMat(len), true);
    }
    // ドアの上の横木
    DOORS.forEach(d => {
      const [c, r] = d.a, len = d.len * CELL, hh = H - 2.3, y = 2.3 + hh / 2;
      if (d.dir === 'e') box(0.32, hh, len + 0.2, X0 + (c + 1) * CELL, y, Z0 + r * CELL + len / 2, beamMat, true);
      else box(len + 0.2, hh, 0.32, X0 + c * CELL + len / 2, y, Z0 + (r + 1) * CELL, beamMat, true);
    });
    // 柱: 壁の端・角・交わる所に立てる(ドアの両側にも立つ)
    for (let c = 0; c <= COLS; c++) for (let r = 0; r <= ROWS; r++) {
      const up = r > 0 && wallV(c, r - 1), dn = r < ROWS && wallV(c, r), lf = c > 0 && wallH(c - 1, r), rt = c < COLS && wallH(c, r);
      const n = up + dn + lf + rt;
      if (!n || (n === 2 && ((up && dn) || (lf && rt)))) continue;
      box(0.4, H, 0.4, X0 + c * CELL, H / 2, Z0 + r * CELL, beamMat, true);
    }

    // 窓: 外に面した壁に、木の枠のある窓(青白い光が差す)
    const glass = new THREE.MeshBasicMaterial({ color: 0x3a5a88 }), frameMat = plain(0x4a3522, 1);
    const wins = [];
    const tryWindow = (x, z, rotY, nx, nz) => {
      if (wins.some(w => Math.hypot(w[0] - x, w[1] - z) < 7)) return;
      wins.push([x, z]);
      const g = new THREE.Group(); g.position.set(x + nx * 0.13, 1.7, z + nz * 0.13); g.rotation.y = rotY;
      g.add(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), glass));
      [[1.5, 0.1, 0, 0.58], [1.5, 0.1, 0, -0.58], [0.1, 1.2, 0.7, 0], [0.1, 1.2, -0.7, 0], [0.06, 1.1, 0, 0], [1.3, 0.06, 0, 0]].forEach(([w, h, ox, oy]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat); b.position.set(ox, oy, 0.03); g.add(b);
      });
      scene.add(g);
      addShaft(x + nx * 0.13, z + nz * 0.13, nx, nz);
    };
    const edges = [];
    for (let c = 0; c <= COLS; c++) for (let r = 0; r < ROWS; r++) {
      const a = roomOfCell(c - 1, r), b = roomOfCell(c, r);
      if (a < 0 && b >= 0) edges.push([X0 + c * CELL, Z0 + r * CELL + CELL / 2, Math.PI / 2, 1, 0]);
      else if (b < 0 && a >= 0) edges.push([X0 + c * CELL, Z0 + r * CELL + CELL / 2, -Math.PI / 2, -1, 0]);
    }
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) {
      const a = roomOfCell(c, r - 1), b = roomOfCell(c, r);
      if (a < 0 && b >= 0) edges.push([X0 + c * CELL + CELL / 2, Z0 + r * CELL, 0, 0, 1]);
      else if (b < 0 && a >= 0) edges.push([X0 + c * CELL + CELL / 2, Z0 + r * CELL, Math.PI, 0, -1]);
    }
    edges.sort(() => rand() - 0.5).forEach(e => tryWindow(...e));

    // 家具: 部屋の隅のマスに置く(ドアの横や、通り道はふさがない)
    const wood = plain(0x4a3524), cloth = plain(0x5f5a50), metal = plain(0x2c3034, 0.6), pale = plain(0x6a6358);
    const PROPS = [
      { w: 1.0, h: 1.0, d: 1.0, m: wood }, { w: 0.8, h: 2.2, d: 0.8, m: metal }, { w: 1.6, h: 0.8, d: 1.0, m: wood },
      { w: 1.8, h: 0.5, d: 1.0, m: cloth }, { w: 0.6, h: 0.9, d: 0.6, m: metal }, { w: 0.5, h: 1.8, d: 1.6, m: wood },
    ];
    const hasDoorAround = (c, r) => [[0, 0, 'v'], [1, 0, 'v'], [0, 0, 'h'], [0, 1, 'h']].some(([dc, dr, k]) => (k === 'v' ? doorV : doorH).has(`${c + dc}:${r + dr}`));
    for (const rm of rooms) {
      rm.corners = []; rm.open = [];
      for (const [c, r] of rm.cells) {
        const n = wallH(c, r), s = wallH(c, r + 1), w = wallV(c, r), e = wallV(c + 1, r);
        const corner = (n || s) && (w || e) && !hasDoorAround(c, r);
        (corner ? rm.corners : rm.open).push([c, r, e ? 1 : w ? -1 : 0, s ? 1 : n ? -1 : 0]);
      }
      for (const [c, r, sx, sz] of rm.corners) {
        const x = ccx(c), z = ccz(r);
        if (Math.hypot(x - spawn.x, z - spawn.z) < spawn.r + 2) continue;
        if (rand() < 0.3) continue;
        const p = PROPS[(rand() * PROPS.length) | 0], flip = rand() < 0.5, pw = flip ? p.d : p.w, pd = flip ? p.w : p.d;
        box(pw, p.h, pd, x + sx * (CELL / 2 - pw / 2 - 0.15), p.h / 2, z + sz * (CELL / 2 - pd / 2 - 0.15), p.m, true);
      }
      const st = new THREE.Mesh(new THREE.CircleGeometry(0.7 + rand() * 0.7, 18), new THREE.MeshBasicMaterial({ color: 0x2a0606, transparent: true, opacity: 0.5, depthWrite: false }));
      st.rotation.x = -Math.PI / 2; const oc = rm.open.length ? rm.open[(rand() * rm.open.length) | 0] : rm.cells[0];
      st.position.set(ccx(oc[0]) + (rand() - 0.5), 0.012, ccz(oc[1]) + (rand() - 0.5)); scene.add(st);
    }
    box(3.0, 0.8, 1.2, 7, 0.4, 5, wood, true);                          // 大広間の長机
    box(0.5, 0.3, 0.8, -20.4, 0.65, -2.8, pale, false);

    // 浴場の水たまり
    const water = new THREE.Mesh(new THREE.PlaneGeometry(pool.hw * 2, pool.hd * 2),
      new THREE.MeshStandardMaterial({ color: 0x07131c, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.position.set(pool.x, 0.03, pool.z); scene.add(water);

    // 帰還点(自宅の部屋): 床の輪と、立ち上る光の柱
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(spawn.r, 0.05, 6, 40), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(spawn.x, 0.04, spawn.z); scene.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(spawn.r, spawn.r, 3, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    beam.position.set(spawn.x, 1.5, spawn.z); scene.add(beam);

    // 光: 環境光 + 近い部屋の照明2つ(移動して使い回す) + カメラの光
    amb = new THREE.AmbientLight(0x3a3a44, 0.75); scene.add(amb);
    lamps.light = [];
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffb870, 1.2, 16, 1.5); scene.add(l); lamps.light.push(l); }
    spot = new THREE.SpotLight(0xdfe8ff, 1.6, 20, 0.55, 0.6, 1.4);
    cam.add(spot); cam.add(spot.target); spot.target.position.set(0, 0, -1);
    if (!isMobile) { spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 0.3; spot.shadow.camera.far = 20; spot.shadow.bias = -0.0006; spot.shadow.radius = 3; }
    // 空気中を漂う埃(光に当たって見える)
    const N = isMobile ? 160 : 360, dp = new Float32Array(N * 3); dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { dustBase[i * 3] = rand() * 24 - 12; dustBase[i * 3 + 1] = 0.2 + rand() * 2.8; dustBase[i * 3 + 2] = rand() * 24 - 12; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glow, color: 0xddd4c4, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.frustumCulled = false; scene.add(dust);

    // 巡回の道すじ(各部屋の、隅でないマスから最大5つ)
    for (const rm of rooms) {
      const base = (rm.open.length ? rm.open : rm.cells).filter(p => Math.hypot(ccx(p[0]) - spawn.x, ccz(p[1]) - spawn.z) > 0.1);
      const pts = base.map(p => [ccx(p[0]), ccz(p[1])]).sort((a, b) => Math.atan2(a[1] - rm.cz, a[0] - rm.cx) - Math.atan2(b[1] - rm.cz, b[0] - rm.cx));
      const k = Math.min(5, pts.length);
      rm.patrol = k ? Array.from({ length: k }, (_, i) => pts[Math.floor(i * pts.length / k)]) : [[rm.cx, rm.cz]];
    }
  }

  // ---- 部屋・経路 ----
  const roomAt = (x, z) => { const [c, r] = cellAt(x, z); return Math.max(0, roomOfCell(c, r)); };
  const roomDepth = (a, b) => roomDepthTab[a][b];
  const patrol = r => rooms[r].patrol;

  // ---- 当たり判定 ----
  // 円(半径r)を箱から押し出す。yLo〜yHi は体の高さの範囲
  function resolve(pos, r, yLo, yHi) {
    pos.x = clamp(pos.x, bounds.minX + r, bounds.maxX - r);
    pos.z = clamp(pos.z, bounds.minZ + r, bounds.maxZ - r);
    for (const c of colliders) {
      if (yLo > c.top || yHi < c.bottom) continue;
      const cx = clamp(pos.x, c.minX, c.maxX), cz = clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), k = (r - d) / d;
        pos.x += dx * k; pos.z += dz * k;
      } else {
        const l = pos.x - c.minX, rr = c.maxX - pos.x, t = pos.z - c.minZ, b = c.maxZ - pos.z, m = Math.min(l, rr, t, b);
        if (m === l) pos.x = c.minX - r; else if (m === rr) pos.x = c.maxX + r;
        else if (m === t) pos.z = c.minZ - r; else pos.z = c.maxZ + r;
      }
    }
  }
  function nearBox(x, z, pad) {
    return colliders.some(c => c.bottom < 1.6 && x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad);
  }
  // 部屋の中の、家具や壁から離れた場所(戦利品を置くのに使う)
  function freeSpot(r, pad) {
    const rm = rooms[r], pool0 = rm.open.length ? rm.open : rm.cells;
    for (let i = 0; i < 40; i++) {
      const p = pool0[(Math.random() * pool0.length) | 0], x = ccx(p[0]) + (Math.random() - 0.5) * 1.2, z = ccz(p[1]) + (Math.random() - 0.5) * 1.2;
      if (nearBox(x, z, pad || 1.0)) continue;
      if (Math.hypot(x - spawn.x, z - spawn.z) < spawn.r + 1) continue;
      return { x, z };
    }
    return null;
  }

  const _rc = new THREE.Raycaster();
  // レイが壁や家具に当たるまでの距離(遮られなければ Infinity)
  function blockDist(origin, dir, far) {
    _rc.set(origin, dir); _rc.far = far;
    const h = _rc.intersectObjects(meshes, false);
    return h.length ? h[0].distance : Infinity;
  }

  // ---- 毎フレーム: 近い部屋の照明を2つ使う ----
  const _c = new THREE.Color(), _t = new THREE.Vector3();
  function update(t, camPos) {
    if (mistTex) { mistTex.offset.x = t * 0.004; mistTex.offset.y = t * 0.0025; }
    bulbs.forEach(b => { b.halo.material.opacity = 0.62 + Math.sin(t * 7 + b.ph) * 0.1 + (Math.sin(t * 31 + b.ph * 3) > 0.93 ? -0.35 : 0); });
    if (dust) {
      const a = dust.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        let dx = dustBase[i] + Math.sin(t * 0.25 + i) * 0.4 - camPos.x, dz = dustBase[i + 2] + Math.cos(t * 0.21 + i * 0.7) * 0.4 - camPos.z;
        dx -= 24 * Math.round(dx / 24); dz -= 24 * Math.round(dz / 24);
        a[i] = camPos.x + dx; a[i + 1] = dustBase[i + 1] + Math.sin(t * 0.3 + i) * 0.15; a[i + 2] = camPos.z + dz;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    }
    const order = rooms.map((r, i) => [Math.hypot(r.cx - camPos.x, r.cz - camPos.z), i]).sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 2; k++) {
      const l = lamps.light[k], i = order[k][1];
      _t.copy(lamps[i]);
      l.position.lerp(_t, 0.06);
      l.color.lerp(_c.set(rooms[i].lamp), 0.1);
      const dip = Math.sin(t * 37 + i) * Math.sin(t * 23 + i * 2) > 0.82;
      l.intensity = (k === 0 ? 1.2 : 0.7) * (dip ? 0.15 : 1 + Math.sin(t * 9 + i) * 0.05);
    }
  }
  function setNight(on) {
    amb.color.set(on ? 0x3c5a48 : 0x3a3a44); amb.intensity = on ? 1.6 : 0.75;
    spot.intensity = on ? 2.4 : 1.6;
    scene.fog.density = on ? 0.035 : 0.055;
  }
  function setSpot(i) { spot.intensity = i; }

  return {
    build, update, resolve, blockDist, setNight, setSpot, roomAt, roomDepth, nextWaypoint, lineClear, lineOfSight: line1, patrol, freeSpot, nearBox,
    inSpawnZone: (x, z) => Math.hypot(x - spawn.x, z - spawn.z) < spawn.r,
    roomName: i => rooms[i].name,
    cellCenter: (c, r) => ({ x: ccx(c), z: ccz(r) }),
    colliders, meshes, bounds, rooms, spawn, pool, ROOMS, DOORS, CELL,
  };
})();
