// 舞台: 古い木造の廃墟。間取りは ruin.js が作る(2m四方のマス目)。load(plan) で廃墟を作り直せる
// 板張りの壁・床・天井、天井の梁、柱、ドア枠、窓枠、吊り電球、光の筋、床のもや、埃、ライトの影
//   壁・床・梁などは、材質ごとに1つの形にまとめて描く(広い廃墟でも軽くするため)
const World = (() => {
  const CELL = 2, H = 3.2, T = 0.25;
  let COLS = 0, ROWS = 0, X0 = 0, Z0 = 0;
  const bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, h: H };
  const spawn = { x: 0, z: 0, r: 2.4 };              // 帰還点(入口の間)
  const pool = { on: false, x: 0, z: 0, hw: 2.2, hd: 2.6 };
  const isMobile = matchMedia('(pointer:coarse)').matches;

  const colliders = [];   // 移動の当たり判定(箱)
  const meshes = [];      // 弾やスキャンを遮る物
  const rooms = [];
  const lamps = [], bulbs = [];
  let cellRoom = [], doorV = new Set(), doorH = new Set(), adjRooms = [], roomDepthTab = [];
  const fieldCache = new Map();
  let scene, cam, amb, spot, M = null, group = null, ruinN = -1;
  let dust = null, dustBase = null, mistTex = null, lampLights = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ccx = c => X0 + c * CELL + CELL / 2, ccz = r => Z0 + r * CELL + CELL / 2;
  const cellIdx = (c, r) => r * COLS + c;
  const roomOfCell = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? -1 : cellRoom[r][c]);

  // ---- 板の絵(テクスチャ) ----
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
  const plain = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.95 : r });

  // ---- 材質・光・埃を、最初に1度だけ用意する ----
  function init(sc, cm) {
    scene = sc; cam = cm; seed = 7;
    const mkFloor = (o, r) => { const t = planks(o, 4, 3); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.3, roughness: r }); };
    const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const cloud = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      for (let i = 0; i < 70; i++) { const x = rand() * 256, y = rand() * 256, r = 18 + rand() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    mistTex = cloud;
    const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.9)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
    const wallBase = planks({ rows: 12, base: [142, 110, 76], vary: 12, dirt: 0.3, skirt: true }, 1, 1);
    M = {
      glow, wallBase, wallMats: {},
      floor: {
        wood: mkFloor({ rows: 8, base: [118, 84, 52] }, 0.8),
        old: mkFloor({ rows: 10, base: [96, 80, 62], vary: 18, dirt: 0.4 }, 0.95),
        wet: mkFloor({ rows: 9, base: [64, 50, 38], vary: 10, dirt: 0.45 }, 0.4),          // 濡れた床はつやがある
      },
      ceil: new THREE.MeshStandardMaterial({ map: planks({ rows: 10, base: [70, 54, 38], vary: 10 }, 4, 3), roughness: 1 }),
      beam: plain(0x3a2a1a, 1), frame: plain(0x4a3522, 1), glass: new THREE.MeshBasicMaterial({ color: 0x3a5a88 }),
      mist: new THREE.MeshBasicMaterial({ map: cloud, color: 0x8896aa, transparent: true, opacity: 0.11, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
      shaft: new THREE.MeshBasicMaterial({ map: shaftTex, color: 0x6c8cc8, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
      stain: new THREE.MeshBasicMaterial({ color: 0x2a0606, transparent: true, opacity: 0.5, depthWrite: false }),
      wood: plain(0x4a3524), cloth: plain(0x5f5a50), metal: plain(0x2c3034, 0.6), pale: plain(0x6a6358),
      water: new THREE.MeshStandardMaterial({ color: 0x07131c, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.92 }),
    };
    // 光: 環境光 + 近い部屋の照明2つ(移動して使い回す) + カメラの光
    amb = new THREE.AmbientLight(0x3a3a44, 0.75); scene.add(amb);
    lampLights = [];
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffb870, 1.2, 16, 1.5); scene.add(l); lampLights.push(l); }
    spot = new THREE.SpotLight(0xdfe8ff, 1.6, 20, 0.55, 0.6, 1.4);
    cam.add(spot); cam.add(spot.target); spot.target.position.set(0, 0, -1);
    if (!isMobile) { spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 0.3; spot.shadow.camera.far = 20; spot.shadow.bias = -0.0006; spot.shadow.radius = 3; }
    // 空気中を漂う埃(光に当たって見える)
    const N = isMobile ? 160 : 360, dp = new Float32Array(N * 3); dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { dustBase[i * 3] = rand() * 24 - 12; dustBase[i * 3 + 1] = 0.2 + rand() * 2.8; dustBase[i * 3 + 2] = rand() * 24 - 12; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glow, color: 0xddd4c4, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.frustumCulled = false; scene.add(dust);
  }
  const wallMat = len => {
    const k = Math.max(1, Math.round(len / 2.5));
    if (!M.wallMats[k]) { const t = M.wallBase.clone(); t.needsUpdate = true; t.repeat.set(k, 1); M.wallMats[k] = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.18, roughness: 0.95 }); }
    return M.wallMats[k];
  };

  // ---- 形を材質ごとにまとめる ----
  const buckets = new Map();
  function addGeo(geo, mat, o) {
    o = o || {};
    const key = mat.uuid + (o.cast ? 'c' : '') + (o.occl === false ? 'n' : '') + (o.recv === false ? 'r' : '');
    let b = buckets.get(key);
    if (!b) { b = { mat, cast: !!o.cast, recv: o.recv !== false, occl: o.occl !== false, list: [] }; buckets.set(key, b); }
    b.list.push(geo);
  }
  function mergeGeos(list) {
    let nv = 0, ni = 0;
    list.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    list.forEach(g => {
      pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2);
      const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo;
      vo += g.attributes.position.count; io += ia.length;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
    return out;
  }
  function flush() {
    for (const b of buckets.values()) {
      const g = mergeGeos(b.list); b.list.forEach(x => x.dispose());
      const m = new THREE.Mesh(g, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.frustumCulled = false; group.add(m);
      if (b.occl) meshes.push(m);
    }
    buckets.clear();
  }
  function box(w, h, d, x, y, z, mat, collide) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
    addGeo(g, mat, { cast: !!collide });
    if (collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: y - h / 2, top: y + h / 2 });
  }
  const beamBox = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); addGeo(g, M.beam, { cast: false }); };

  // ---- 間取りから、部屋・ドア・壁の位置を割り出す ----
  function layout(plan) {
    COLS = plan.cols; ROWS = plan.rows; X0 = -COLS * CELL / 2; Z0 = -ROWS * CELL / 2;
    bounds.minX = X0; bounds.maxX = X0 + COLS * CELL; bounds.minZ = Z0; bounds.maxZ = Z0 + ROWS * CELL;
    cellRoom = plan.grid.map(r => r.slice());
    doorV = new Set(); doorH = new Set(); rooms.length = 0;
    const cellsOf = plan.rooms.map(() => []);
    cellRoom.forEach((row, r) => row.forEach((g, c) => { if (g >= 0) cellsOf[g].push([c, r]); }));
    plan.rooms.forEach((rm, idx) => {
      const cells = cellsOf[idx];
      const mx = cells.reduce((s, p) => s + ccx(p[0]), 0) / cells.length, mz = cells.reduce((s, p) => s + ccz(p[1]), 0) / cells.length;
      const mid = cells.reduce((b, p) => (Math.hypot(ccx(p[0]) - mx, ccz(p[1]) - mz) < Math.hypot(ccx(b[0]) - mx, ccz(b[1]) - mz) ? p : b), cells[0]);
      rooms.push({ idx, name: rm.name, floor: rm.floor, lamp: rm.lamp, corridor: !!rm.corridor, entrance: !!rm.entrance, cells, cx: ccx(mid[0]), cz: ccz(mid[1]) });
    });
    adjRooms = rooms.map(() => []);
    plan.doors.forEach(d => {
      const [c, r] = d.a;
      for (let i = 0; i < d.len; i++) {
        const c1 = d.dir === 'e' ? c : c + i, r1 = d.dir === 'e' ? r + i : r, c2 = d.dir === 'e' ? c + 1 : c + i, r2 = d.dir === 'e' ? r + i : r + 1;
        const a = roomOfCell(c1, r1), b = roomOfCell(c2, r2);
        if (a < 0 || b < 0 || a === b) continue;
        (d.dir === 'e' ? doorV : doorH).add(d.dir === 'e' ? `${c + 1}:${r + i}` : `${c + i}:${r + 1}`);
        if (!adjRooms[a].includes(b)) { adjRooms[a].push(b); adjRooms[b].push(a); }
      }
    });
    roomDepthTab = rooms.map((_, s) => {
      const dist = rooms.map(() => -1); dist[s] = 0; const q = [s];
      for (let qi = 0; qi < q.length; qi++) { const u = q[qi]; for (const v of adjRooms[u]) if (dist[v] < 0) { dist[v] = dist[u] + 1; q.push(v); } }
      return dist;
    });
    const ent = rooms[plan.entrance]; spawn.x = ent.cx; spawn.z = ent.cz;
    fieldCache.clear();
  }
  // 縦の境目(c の左右)・横の境目(r の上下)に壁があるか
  const wallV = (c, r) => roomOfCell(c - 1, r) !== roomOfCell(c, r) && !doorV.has(`${c}:${r}`);
  const wallH = (c, r) => roomOfCell(c, r - 1) !== roomOfCell(c, r) && !doorH.has(`${c}:${r}`);

  // ---- 経路探索: 目標のマスから各マスまでの歩数を、必要になったときに数えて覚えておく ----
  function passable(c1, r1, c2, r2) {
    const a = roomOfCell(c1, r1), b = roomOfCell(c2, r2);
    if (a < 0 || b < 0) return false;
    if (a === b) return true;
    if (r1 === r2) return doorV.has(`${Math.max(c1, c2)}:${r1}`);
    return doorH.has(`${c1}:${Math.max(r1, r2)}`);
  }
  function fieldAt(t) {
    let f = fieldCache.get(t); if (f) return f;
    const N = COLS * ROWS, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    f = new Int16Array(N).fill(-1); f[t] = 0; const q = [t];
    for (let qi = 0; qi < q.length; qi++) {
      const u = q[qi], uc = u % COLS, ur = (u / COLS) | 0;
      for (const [dc, dr] of dirs) {
        const nc = uc + dc, nr = ur + dr;
        if (!passable(uc, ur, nc, nr)) continue;
        const v = cellIdx(nc, nr);
        if (f[v] < 0) { f[v] = f[u] + 1; q.push(v); }
      }
    }
    fieldCache.set(t, f);
    if (fieldCache.size > 400) fieldCache.delete(fieldCache.keys().next().value);
    return f;
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
    if (lineClear(fx, fz, tx, tz)) return { x: tx, z: tz };
    const f = fieldAt(cellIdx(tc, tr));
    if (f[cellIdx(sc, sr)] < 0) return { x: tx, z: tz };
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

  // ---- 廃墟を作る ----
  function load(plan) {
    if (group) {                                                           // 前の廃墟を片づける
      scene.remove(group);
      group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.userData.ownMat && o.material) o.material.dispose(); });
    }
    group = new THREE.Group(); scene.add(group);
    colliders.length = 0; meshes.length = 0; lamps.length = 0; bulbs.length = 0; buckets.clear();
    seed = 7 + plan.n * 13;
    layout(plan);
    build(plan);
    ruinN = plan.n;
  }
  function build(plan) {
    // 床・天井・梁・もや: 部屋ごとに、同じ形のマスをできるだけ大きな四角にまとめる
    for (const rm of rooms) {
      const used = new Set(), inRoom = (c, r) => roomOfCell(c, r) === rm.idx && !used.has(cellIdx(c, r));
      for (const [c0, r0] of rm.cells) {
        if (used.has(cellIdx(c0, r0))) continue;
        let w = 1; while (inRoom(c0 + w, r0)) w++;
        let h = 1;
        outer: while (true) { for (let i = 0; i < w; i++) if (!inRoom(c0 + i, r0 + h)) break outer; h++; }
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used.add(cellIdx(c0 + i, r0 + j));
        const W = w * CELL, D = h * CELL, x = X0 + c0 * CELL + W / 2, z = Z0 + r0 * CELL + D / 2;
        const fl = new THREE.PlaneGeometry(W, D); fl.rotateX(-Math.PI / 2); fl.translate(x, 0, z); addGeo(fl, M.floor[rm.floor]);
        const ce = new THREE.PlaneGeometry(W, D); ce.rotateX(Math.PI / 2); ce.translate(x, H, z); addGeo(ce, M.ceil);
        const ms = new THREE.PlaneGeometry(W, D), uv = ms.attributes.uv;                // 床すれすれに漂う、ゆっくり流れるもや
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 7, uv.getY(i) * D / 7);
        ms.rotateX(-Math.PI / 2); ms.translate(x, 0.5, z); addGeo(ms, M.mist, { occl: false, recv: false });
        // 梁: 長い方向に棟木、短い方向に垂木
        const longX = W >= D, Lg = longX ? W : D, Sh = longX ? D : W;
        if (Lg >= 6) beamBox(longX ? Lg - 0.1 : 0.26, 0.28, longX ? 0.26 : Lg - 0.1, x, H - 0.14, z);
        const n = Math.max(1, Math.floor(Lg / 4));
        for (let i = 0; i < n; i++) { const o = -Lg / 2 + (i + 0.5) * Lg / n; beamBox(longX ? 0.22 : Sh - 0.1, 0.22, longX ? Sh - 0.1 : 0.22, longX ? x + o : x, H - 0.11, longX ? z : z + o); }
      }
      // 吊り電球と、光のにじみ
      lamps.push(new THREE.Vector3(rm.cx, 2.7, rm.cz));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: rm.lamp })); bulb.position.set(rm.cx, 2.68, rm.cz); bulb.userData.ownMat = true; group.add(bulb);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), plain(0x111111, 1)); cord.position.set(rm.cx, 2.95, rm.cz); cord.userData.ownMat = true; group.add(cord);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glow, color: rm.lamp, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.8 }));
      halo.scale.set(1.5, 1.5, 1); halo.position.copy(bulb.position); halo.userData.ownMat = true; group.add(halo);
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
    plan.doors.forEach(d => {
      const [c, r] = d.a, len = d.len * CELL, hh = H - 2.3, y = 2.3 + hh / 2;
      if (d.dir === 'e') box(0.32, hh, len + 0.2, X0 + (c + 1) * CELL, y, Z0 + r * CELL + len / 2, M.beam, true);
      else box(len + 0.2, hh, 0.32, X0 + c * CELL + len / 2, y, Z0 + (r + 1) * CELL, M.beam, true);
    });
    // 柱: 壁の端・角・交わる所に立てる(ドアの両側にも立つ)
    for (let c = 0; c <= COLS; c++) for (let r = 0; r <= ROWS; r++) {
      const up = r > 0 && wallV(c, r - 1), dn = r < ROWS && wallV(c, r), lf = c > 0 && wallH(c - 1, r), rt = c < COLS && wallH(c, r);
      const n = up + dn + lf + rt;
      if (!n || (n === 2 && ((up && dn) || (lf && rt)))) continue;
      box(0.4, H, 0.4, X0 + c * CELL, H / 2, Z0 + r * CELL, M.beam, true);
    }

    // 窓: 外に面した壁に、木の枠のある窓(青白い光が差す)
    const wins = [], edges = [];
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
    const mat4 = new THREE.Matrix4();
    edges.sort(() => rand() - 0.5).forEach(([x, z, rotY, nx, nz]) => {
      if (wins.some(w => Math.hypot(w[0] - x, w[1] - z) < 8)) return;
      wins.push([x, z]);
      const px = x + nx * 0.13, pz = z + nz * 0.13;
      mat4.makeRotationY(rotY); mat4.setPosition(px, 1.7, pz);
      const gl = new THREE.PlaneGeometry(1.3, 1.1); gl.applyMatrix4(mat4); addGeo(gl, M.glass, { occl: false, recv: false });
      [[1.5, 0.1, 0, 0.58], [1.5, 0.1, 0, -0.58], [0.1, 1.2, 0.7, 0], [0.1, 1.2, -0.7, 0], [0.06, 1.1, 0, 0], [1.3, 0.06, 0, 0]].forEach(([w, h, ox, oy]) => {
        const b = new THREE.BoxGeometry(w, h, 0.1); b.translate(ox, oy, 0.03); b.applyMatrix4(mat4); addGeo(b, M.frame, { occl: false, recv: false });
      });
      // 窓から差し込む、青白い光の筋
      const sx = -nz, sz = nx;
      const v = [px - sx * 0.62, 2.25, pz - sz * 0.62, px + sx * 0.62, 2.25, pz + sz * 0.62,
        px + nx * 3.6 + sx * 1.1, 0.02, pz + nz * 3.6 + sz * 1.1, px + nx * 3.6 - sx * 1.1, 0.02, pz + nz * 3.6 - sz * 1.1];
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      sg.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      sg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); sg.setIndex([0, 1, 2, 0, 2, 3]);
      addGeo(sg, M.shaft, { occl: false, recv: false });
    });

    // 家具: 部屋の隅のマスに置く(ドアの横や、通り道はふさがない)
    const PROPS = [
      { w: 1.0, h: 1.0, d: 1.0, m: M.wood }, { w: 0.8, h: 2.2, d: 0.8, m: M.metal }, { w: 1.6, h: 0.8, d: 1.0, m: M.wood },
      { w: 1.8, h: 0.5, d: 1.0, m: M.cloth }, { w: 0.6, h: 0.9, d: 0.6, m: M.metal }, { w: 0.5, h: 1.8, d: 1.6, m: M.wood },
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
      if (!rm.corridor && rm.open.length) {                                        // 床の血の染み
        const oc = rm.open[(rand() * rm.open.length) | 0], st = new THREE.CircleGeometry(0.7 + rand() * 0.7, 18);
        st.rotateX(-Math.PI / 2); st.translate(ccx(oc[0]) + (rand() - 0.5), 0.012, ccz(oc[1]) + (rand() - 0.5)); addGeo(st, M.stain, { occl: false, recv: false });
      }
      if (rm.cells.length >= 70 && rm.open.length) {                               // 大きな部屋には、長机
        const oc = rm.open[(rm.open.length / 2) | 0]; if (!nearBoxLoose(ccx(oc[0]), ccz(oc[1]))) box(3.0, 0.8, 1.2, ccx(oc[0]), 0.4, ccz(oc[1]), M.wood, true);
      }
    }
    flush();

    // 浴場の水たまり
    pool.on = !!plan.pool;
    if (plan.pool) {
      pool.x = plan.pool.x; pool.z = plan.pool.z; pool.hw = plan.pool.hw; pool.hd = plan.pool.hd;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(pool.hw * 2, pool.hd * 2), M.water);
      water.rotation.x = -Math.PI / 2; water.position.set(pool.x, 0.03, pool.z); group.add(water);
    }
    // 帰還点(入口の間): 床の輪と、立ち上る光の柱
    const ring = new THREE.Mesh(new THREE.TorusGeometry(spawn.r, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.85 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(spawn.x, 0.04, spawn.z); ring.userData.ownMat = true; group.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(spawn.r, spawn.r, 3, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    beam.position.set(spawn.x, 1.5, spawn.z); beam.userData.ownMat = true; group.add(beam);

    // 巡回の道すじ(各部屋の、隅でないマスから最大5つ)
    for (const rm of rooms) {
      const base = (rm.open.length ? rm.open : rm.cells);
      const pts = base.map(p => [ccx(p[0]), ccz(p[1])]).sort((a, b) => Math.atan2(a[1] - rm.cz, a[0] - rm.cx) - Math.atan2(b[1] - rm.cz, b[0] - rm.cx));
      const k = Math.min(5, pts.length);
      rm.patrol = k ? Array.from({ length: k }, (_, i) => pts[Math.floor(i * pts.length / k)]) : [[rm.cx, rm.cz]];
    }
  }
  const nearBoxLoose = (x, z) => colliders.some(c => c.bottom < 1.6 && x > c.minX - 1.4 && x < c.maxX + 1.4 && z > c.minZ - 1.4 && z < c.maxZ + 1.4);

  // ---- 部屋・経路 ----
  const roomAt = (x, z) => { const [c, r] = cellAt(x, z); return Math.max(0, roomOfCell(c, r)); };
  const roomDepth = (a, b) => roomDepthTab[a][b];
  const patrol = r => rooms[r].patrol;

  // ---- 当たり判定 ----
  // 円(半径r)を箱から押し出す。yLo〜yHi は体の高さの範囲
  function resolve(pos, r, yLo, yHi) {
    pos.x = clamp(pos.x, bounds.minX + r, bounds.maxX - r);
    pos.z = clamp(pos.z, bounds.minZ + r, bounds.maxZ - r);
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (pos.x < c.minX - r || pos.x > c.maxX + r || pos.z < c.minZ - r || pos.z > c.maxZ + r) continue;
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

  // ---- 毎フレーム: 近い部屋の照明を2つ使う / 電球・もや・埃 ----
  const _c = new THREE.Color(), _t = new THREE.Vector3();
  function update(t, camPos) {
    if (!rooms.length) return;
    mistTex.offset.x = t * 0.004; mistTex.offset.y = t * 0.0025;
    bulbs.forEach(b => { b.halo.material.opacity = 0.62 + Math.sin(t * 7 + b.ph) * 0.1 + (Math.sin(t * 31 + b.ph * 3) > 0.93 ? -0.35 : 0); });
    const a = dust.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      let dx = dustBase[i] + Math.sin(t * 0.25 + i) * 0.4 - camPos.x, dz = dustBase[i + 2] + Math.cos(t * 0.21 + i * 0.7) * 0.4 - camPos.z;
      dx -= 24 * Math.round(dx / 24); dz -= 24 * Math.round(dz / 24);
      a[i] = camPos.x + dx; a[i + 1] = dustBase[i + 1] + Math.sin(t * 0.3 + i) * 0.15; a[i + 2] = camPos.z + dz;
    }
    dust.geometry.attributes.position.needsUpdate = true;
    // 近い2部屋の照明(部屋ごとに照明を置くと重いので、2つを使い回す)
    let b0 = -1, b1 = -1, d0 = 1e9, d1 = 1e9;
    for (let i = 0; i < rooms.length; i++) {
      const d = Math.hypot(rooms[i].cx - camPos.x, rooms[i].cz - camPos.z);
      if (d < d0) { d1 = d0; b1 = b0; d0 = d; b0 = i; } else if (d < d1) { d1 = d; b1 = i; }
    }
    [b0, b1].forEach((i, k) => {
      if (i < 0) return;
      const l = lampLights[k];
      _t.copy(lamps[i]); l.position.lerp(_t, 0.06);
      l.color.lerp(_c.set(rooms[i].lamp), 0.1);
      const dip = Math.sin(t * 37 + i) * Math.sin(t * 23 + i * 2) > 0.82;
      l.intensity = (k === 0 ? 1.2 : 0.7) * (dip ? 0.15 : 1 + Math.sin(t * 9 + i) * 0.05);
    });
  }
  function setNight(on) {
    amb.color.set(on ? 0x3c5a48 : 0x3a3a44); amb.intensity = on ? 1.6 : 0.75;
    spot.intensity = on ? 2.4 : 1.6;
    scene.fog.density = on ? 0.035 : 0.055;
  }
  function setSpot(i) { spot.intensity = i; }

  return {
    init, load, update, resolve, blockDist, setNight, setSpot, roomAt, roomDepth, nextWaypoint, lineClear, lineOfSight: line1, patrol, freeSpot, nearBox,
    inSpawnZone: (x, z) => Math.hypot(x - spawn.x, z - spawn.z) < spawn.r,
    roomName: i => rooms[i].name,
    get ruinN() { return ruinN; },
    colliders, meshes, bounds, rooms, spawn, pool, CELL,
  };
})();
