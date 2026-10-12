// 舞台: 3×3 の部屋が並ぶ、古い木造の屋敷(42m × 30m)。左中央が自宅の部屋(スタートと帰還点)
//   0 病棟 | 1 書斎   | 2 倉庫
//   3 自宅 | 4 大広間 | 5 台所
//   6 子供部屋 | 7 地下への廊下 | 8 浴場(水が溜まっている)
// 板張りの壁・床・天井、天井の梁、柱、ドア枠、窓枠でできている
const World = (() => {
  const colliders = [];   // 移動の当たり判定(箱)
  const meshes = [];      // 弾やスキャンを遮る物
  const bounds = { minX: -21, maxX: 21, minZ: -15, maxZ: 15, h: 3.2 };
  const RW = 14, RH = 10, T = 0.25;
  const rooms = [], doors = [];
  const spawn = { x: -17.5, z: 0, r: 2.4 };   // 帰還点
  const pool = { x: 14, z: 10, hw: 3.2, hd: 2.2 };
  let scene, amb, spot;
  const lamps = [];

  const ROOM_INFO = [
    { name: '廃病院の病棟', floor: 'old',  lamp: 0xb4f0c4 },
    { name: '書斎',         floor: 'wood', lamp: 0xffc890 },
    { name: '倉庫',         floor: 'old',  lamp: 0xb8c0ff },
    { name: '自宅の部屋',   floor: 'wood', lamp: 0xffb870 },
    { name: '大広間',       floor: 'wood', lamp: 0xffa078 },
    { name: '台所',         floor: 'old',  lamp: 0xe0ffe0 },
    { name: '子供部屋',     floor: 'wood', lamp: 0xffb0d0 },
    { name: '地下への廊下', floor: 'old',  lamp: 0x98a8ff },
    { name: '浴場',         floor: 'wet',  lamp: 0x78b0ff },
  ];
  // ドアの位置のずれ(中心から)。[壁の列][行 or 列]
  const V_OFF = [[1.5, 0, -1.5], [-1.5, 0, 1.5]];
  const H_OFF = [[0, 1.5, -1.5], [1.5, -1.5, 0]];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

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
        for (let i = 0; i < 44; i++) {                                       // 木目
          g.strokeStyle = `rgba(0,0,0,${o.grain * (0.4 + rand())})`; g.lineWidth = 0.7;
          const y = r * ph + rand() * ph, x = rand() * w; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 60, y + (rand() - 0.5) * 4, x + 140, y + (rand() - 0.5) * 4, x + 40 + rand() * 220, y + (rand() - 0.5) * 3); g.stroke();
        }
        if (rand() < 0.45) {                                                  // 節
          const x = rand() * w, y = r * ph + ph * (0.3 + rand() * 0.4);
          for (let s = 3; s > 0; s--) { g.strokeStyle = `rgba(30,18,8,${0.25 + s * 0.1})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 4 + s * 4, 2 + s * 2, 0, 0, 7); g.stroke(); }
          g.fillStyle = 'rgba(25,14,6,.7)'; g.beginPath(); g.ellipse(x, y, 3, 1.6, 0, 0, 7); g.fill();
        }
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, r * ph, w, 2);          // 板の継ぎ目
        g.fillStyle = 'rgba(255,230,190,.08)'; g.fillRect(0, r * ph + 2, w, 1);
        const ex = rand() * w; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(ex, r * ph, 2, ph);   // 板の端(ずらして継ぐ)
        g.fillStyle = 'rgba(20,20,20,.6)'; g.fillRect(ex + 6, r * ph + ph / 2, 2, 2); g.fillRect(ex - 6, r * ph + ph / 2, 2, 2);   // 釘
      }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,18,8,${o.dirt * (0.1 + rand() * 0.2)})`; g.beginPath(); g.arc(rand() * w, rand() * h, 8 + rand() * 46, 0, 7); g.fill(); }   // 汚れ
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(70,8,8,${o.stain * (0.3 + rand() * 0.5)})`; g.beginPath(); g.ellipse(rand() * w, rand() * h, 6 + rand() * 24, 4 + rand() * 14, rand() * 3, 0, 7); g.fill(); }  // 古い血の染み
    }, rx, ry);
  }

  function box(w, h, d, x, y, z, mat, collide) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); scene.add(m); meshes.push(m);
    if (collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: y - h / 2, top: y + h / 2 });
    return m;
  }
  const plain = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.95 : r });

  function build(sc, cam) {
    scene = sc;
    const H = bounds.h;
    // 壁: 板張り。壁の長さに合わせて板の繰り返しを変える(材質は長さごとに使い回す)
    const wallBase = planks({ rows: 12, base: [142, 110, 76], vary: 12, dirt: 0.3 }, 1, 1);
    const wallMats = {};
    const wallMat = len => {
      const k = Math.max(1, Math.round(len / 2.5));
      if (!wallMats[k]) { const t = wallBase.clone(); t.needsUpdate = true; t.repeat.set(k, 1); wallMats[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }
      return wallMats[k];
    };
    const floorMats = {
      wood: new THREE.MeshStandardMaterial({ map: planks({ rows: 8, base: [118, 84, 52] }, 4, 3), roughness: 0.85 }),
      old: new THREE.MeshStandardMaterial({ map: planks({ rows: 10, base: [96, 80, 62], vary: 18, dirt: 0.4 }, 4, 3), roughness: 0.95 }),
      wet: new THREE.MeshStandardMaterial({ map: planks({ rows: 9, base: [64, 50, 38], vary: 10, dirt: 0.45 }, 4, 3), roughness: 0.55 }),
    };
    const ceilMat = new THREE.MeshStandardMaterial({ map: planks({ rows: 10, base: [70, 54, 38], vary: 10 }, 4, 3), roughness: 1 });
    const beamMat = plain(0x3a2a1a, 1);

    // 部屋: 床・天井・天井の梁
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c, info = ROOM_INFO[idx];
      const x1 = -21 + c * RW, z1 = -15 + r * RH;
      const rm = { idx, x1, x2: x1 + RW, z1, z2: z1 + RH, cx: x1 + RW / 2, cz: z1 + RH / 2, name: info.name, lamp: info.lamp };
      rooms.push(rm);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), floorMats[info.floor]);
      fl.rotation.x = -Math.PI / 2; fl.position.set(rm.cx, 0, rm.cz); scene.add(fl); meshes.push(fl);
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), ceilMat);
      ce.rotation.x = Math.PI / 2; ce.position.set(rm.cx, H, rm.cz); scene.add(ce); meshes.push(ce);
      lamps.push(new THREE.Vector3(rm.cx, 2.7, rm.cz));
      [-4.6, 0, 4.6].forEach(dx => box(0.26, 0.28, RH - 0.1, rm.cx + dx, H - 0.14, rm.cz, beamMat, false));   // 梁
      box(RW - 0.1, 0.22, 0.22, rm.cx, H - 0.11, rm.cz, beamMat, false);
    }

    // 外壁(移動は bounds で止めるので当たり判定なし)
    box(42 + 2 * T, H, T, 0, H / 2, -15 - T / 2, wallMat(42), false);
    box(42 + 2 * T, H, T, 0, H / 2, 15 + T / 2, wallMat(42), false);
    box(T, H, 30, -21 - T / 2, H / 2, 0, wallMat(30), false);
    box(T, H, 30, 21 + T / 2, H / 2, 0, wallMat(30), false);

    // 仕切りの壁。ドアは幅3m。ドアの上に横木、両側に柱
    const lintel = (w, d, x, z) => box(w, H - 2.3, d, x, 2.3 + (H - 2.3) / 2, z, beamMat, true);
    for (let w = 0; w < 2; w++) for (let r = 0; r < 3; r++) {          // 縦の壁(左右の部屋の間)
      const x = -7 + 14 * w, z1 = -15 + r * RH, z2 = z1 + RH, dz = z1 + RH / 2 + V_OFF[w][r];
      box(T, H, dz - 1.5 - z1, x, H / 2, (z1 + dz - 1.5) / 2, wallMat(dz - 1.5 - z1), true);
      box(T, H, z2 - dz - 1.5, x, H / 2, (dz + 1.5 + z2) / 2, wallMat(z2 - dz - 1.5), true);
      lintel(0.32, 3.3, x, dz);
      box(0.4, H, 0.3, x, H / 2, dz - 1.5, beamMat, true); box(0.4, H, 0.3, x, H / 2, dz + 1.5, beamMat, true);
      doors.push({ a: r * 3 + w, b: r * 3 + w + 1, x, z: dz, nx: 1, nz: 0 });
    }
    for (let w = 0; w < 2; w++) for (let c = 0; c < 3; c++) {          // 横の壁(上下の部屋の間)
      const z = -5 + 10 * w, x1 = -21 + c * RW, x2 = x1 + RW, dx = x1 + RW / 2 + H_OFF[w][c];
      box(dx - 1.5 - x1, H, T, (x1 + dx - 1.5) / 2, H / 2, z, wallMat(dx - 1.5 - x1), true);
      box(x2 - dx - 1.5, H, T, (dx + 1.5 + x2) / 2, H / 2, z, wallMat(x2 - dx - 1.5), true);
      lintel(3.3, 0.32, dx, z);
      box(0.3, H, 0.4, dx - 1.5, H / 2, z, beamMat, true); box(0.3, H, 0.4, dx + 1.5, H / 2, z, beamMat, true);
      doors.push({ a: w * 3 + c, b: (w + 1) * 3 + c, x: dx, z, nx: 0, nz: 1 });
    }
    // 柱: 壁の交わる所と、隅に立つ太い柱
    for (const px of [-21, -7, 7, 21]) for (const pz of [-15, -5, 5, 15]) box(0.4, H, 0.4, px, H / 2, pz, beamMat, false);

    // 窓: 外壁に、木の枠のある窓(青白い光が差す)
    const glass = new THREE.MeshBasicMaterial({ color: 0x3a5a88 });
    const frameMat = plain(0x4a3522, 1);
    const windowAt = (x, z, rotY) => {
      const g = new THREE.Group(); g.position.set(x, 1.7, z); g.rotation.y = rotY;
      g.add(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), glass));
      [[1.5, 0.1, 0, 0.58], [1.5, 0.1, 0, -0.58], [0.1, 1.2, 0.7, 0], [0.1, 1.2, -0.7, 0], [0.06, 1.1, 0, 0], [1.3, 0.06, 0, 0]].forEach(([w, h, ox, oy]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat); b.position.set(ox, oy, 0.03); g.add(b);
      });
      scene.add(g);
    };
    [-14, -2, 12].forEach(x => windowAt(x, -14.88, 0));
    [-12, 3, 14].forEach(x => windowAt(x, 14.88, Math.PI));
    [-10, 4, 10].forEach(z => windowAt(-20.88, z, Math.PI / 2));
    [-8, 7].forEach(z => windowAt(20.88, z, -Math.PI / 2));

    // 家具: 部屋の四隅に置く(ドアや通り道をふさがない)
    const wood = plain(0x4a3524), cloth = plain(0x5f5a50), metal = plain(0x2c3034, 0.6), pale = plain(0x6a6358);
    const PROPS = [
      { w: 1.0, h: 1.0, d: 1.0, m: wood }, { w: 0.8, h: 2.2, d: 0.8, m: metal }, { w: 1.8, h: 0.8, d: 1.0, m: wood },
      { w: 2.0, h: 0.5, d: 1.0, m: cloth }, { w: 0.6, h: 0.9, d: 0.6, m: metal }, { w: 0.5, h: 1.8, d: 2.0, m: wood },
    ];
    rooms.forEach(rm => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        if (rand() < 0.2) return;
        const p = PROPS[(rand() * PROPS.length) | 0], flip = rand() < 0.5;
        const w = flip ? p.d : p.w, d = flip ? p.w : p.d;
        box(w, p.h, d, rm.cx + sx * 5.6, p.h / 2, rm.cz + sz * 4.0, p.m, true);
      });
      // 床の血の染み
      const st = new THREE.Mesh(new THREE.CircleGeometry(0.7 + rand() * 0.7, 18),
        new THREE.MeshBasicMaterial({ color: 0x2a0606, transparent: true, opacity: 0.5, depthWrite: false }));
      st.rotation.x = -Math.PI / 2; st.position.set(rm.cx + (rand() - 0.5) * 6, 0.012, rm.cz + (rand() - 0.5) * 4); scene.add(st);
    });
    box(3.0, 0.8, 1.2, 0, 0.4, 0, wood, true);                          // 大広間の長机
    box(0.5, 0.3, 0.8, -20.4, 0.65, -4.2, pale, false);

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
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffb870, 1.2, 16, 1.5); scene.add(l); lamps.light = (lamps.light || []).concat(l); }
    spot = new THREE.SpotLight(0xdfe8ff, 1.6, 20, 0.55, 0.6, 1.4);
    cam.add(spot); cam.add(spot.target); spot.target.position.set(0, 0, -1);

    // 移動経路: 部屋のつながりと、部屋どうしの最短のドア
    const adj = rooms.map(() => []);
    doors.forEach((d, i) => { adj[d.a].push({ to: d.b, door: i }); adj[d.b].push({ to: d.a, door: i }); });
    nav = rooms.map(() => []); depth = rooms.map(() => []);
    for (let s = 0; s < rooms.length; s++) {
      const dist = rooms.map(() => -1), first = rooms.map(() => -1);
      dist[s] = 0; const q = [s];
      while (q.length) {
        const u = q.shift();
        for (const e of adj[u]) if (dist[e.to] < 0) { dist[e.to] = dist[u] + 1; first[e.to] = u === s ? e.door : first[u]; q.push(e.to); }
      }
      for (let t = 0; t < rooms.length; t++) { nav[s][t] = first[t]; depth[s][t] = dist[t]; }
    }
  }
  let nav = [], depth = [];

  // ---- 部屋・経路 ----
  const roomAt = (x, z) => clamp(Math.floor((z + 15) / RH), 0, 2) * 3 + clamp(Math.floor((x + 21) / RW), 0, 2);
  const roomDepth = (a, b) => depth[a][b];
  // いまの位置から目標へ向かうとき、次に向かう点(部屋をまたぐなら、ドアを通る)
  function nextWaypoint(fx, fz, tx, tz) {
    const a = roomAt(fx, fz), b = roomAt(tx, tz);
    if (a === b) return { x: tx, z: tz };
    const d = doors[nav[a][b]], sgn = d.a === a ? 1 : -1;
    if (Math.hypot(fx - d.x, fz - d.z) < 1.7) return { x: d.x + d.nx * sgn * 2.4, z: d.z + d.nz * sgn * 2.4 };
    return { x: d.x, z: d.z };
  }
  const patrol = r => { const m = rooms[r]; return [[m.cx - 3.2, m.cz - 2.2], [m.cx + 3.2, m.cz - 2.2], [m.cx + 3.2, m.cz + 2.2], [m.cx - 3.2, m.cz + 2.2]]; };

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
    const m = rooms[r];
    for (let i = 0; i < 40; i++) {
      const x = m.x1 + 2 + Math.random() * (RW - 4), z = m.z1 + 2 + Math.random() * (RH - 4);
      if (nearBox(x, z, pad || 1.2)) continue;
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
    build, update, resolve, blockDist, setNight, setSpot, roomAt, roomDepth, nextWaypoint, patrol, freeSpot, nearBox,
    inSpawnZone: (x, z) => Math.hypot(x - spawn.x, z - spawn.z) < spawn.r,
    roomName: i => rooms[i].name,
    colliders, meshes, bounds, rooms, doors, spawn, pool,
  };
})();
