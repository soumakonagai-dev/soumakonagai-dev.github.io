// ソダテバトル: 育成画面などの3D背景（修行場）
// 時間帯（朝→昼→夕→夜）が行動の残りで変わり、買った道具が修行場に並ぶ。
'use strict';

const HomeBG = (() => {
  const rnd = FX.rnd, pick = FX.pick, TAU = Math.PI * 2;
  const KEYS = [
    { t: 0.0, top: 0x3a4a9a, mid: 0xf0a0a0, bot: 0xffd2a0, sun: 0xffb070, fog: 0xf0c0a8, h1: 0xffd8c0, h2: 0x405030, si: 0.8, el: 0.1, stars: 0.1, cl: 0.7 },
    { t: 0.33, top: 0x2a78e0, mid: 0x7ec0ff, bot: 0xd8f0ff, sun: 0xfff4d0, fog: 0xcfe8ff, h1: 0xffffff, h2: 0x6a8a5a, si: 1.15, el: 0.7, stars: 0, cl: 0.85 },
    { t: 0.66, top: 0x2a2a70, mid: 0xe0704a, bot: 0xffb060, sun: 0xff9040, fog: 0xd88a60, h1: 0xffc890, h2: 0x403040, si: 0.85, el: 0.14, stars: 0.25, cl: 0.8 },
    { t: 0.92, top: 0x03041a, mid: 0x141a48, bot: 0x2a2a60, sun: 0xc8d0ff, fog: 0x141838, h1: 0x8890d0, h2: 0x101428, si: 0.6, el: 0.55, stars: 1, cl: 0.3 },
  ];
  const COLS = ['top', 'mid', 'bot', 'sun', 'fog', 'h1', 'h2'], NUMS = ['si', 'el', 'stars', 'cl'];
  const sample = tod => {
    let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) if (tod >= KEYS[i].t && tod <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
    if (tod < KEYS[0].t) b = a; if (tod > KEYS[KEYS.length - 1].t) a = b;
    const k = a === b ? 0 : (tod - a.t) / (b.t - a.t), o = {};
    COLS.forEach(c => { o[c] = new THREE.Color(a[c]).lerp(new THREE.Color(b[c]), k); });
    NUMS.forEach(n => { o[n] = a[n] + (b[n] - a[n]) * k; });
    return o;
  };
  // 地形の高さ（修行場のまわりはたいらで、遠くは丘）
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hAt = (x, z) => { const d = Math.hypot(x - 2, z); return sm(16, 70, d) * (7 + 4 * Math.sin(x * 0.08) * Math.cos(z * 0.07)) + 1.1 * Math.sin(x * 0.21) * Math.sin(z * 0.17) * sm(12, 34, d); };

  let renderer, scene, cam, canvas, shade, sky, hemi, sunL, parts, nightLight, sunSprite;
  let running = false, inited = false, itemsGroup, dummy, clouds = [], birds = [], windows = [], smoke = [], flags = [];
  let cur = null, tod = 0.3, todTarget = 0.3, mx = 0, my = 0, view = 'home', ov = null, lastKey = '', t0 = 0, last = 0, camMode = 'home', win = false;
  const coarse = matchMedia('(pointer:coarse)').matches;
  const cc = { cam: new THREE.Vector3(0, 3.4, 13.5), look: new THREE.Vector3(1.2, 2.0, 0) };

  function init() {
    if (inited) return; inited = true;
    canvas = document.createElement('canvas'); canvas.id = 'bgcanvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-2;display:block';
    shade = document.createElement('div'); shade.id = 'bgshade';
    shade.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(8,10,28,.28),rgba(8,10,28,.05) 35%,rgba(8,10,28,.45))';
    document.body.prepend(shade); document.body.prepend(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.6));
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 400);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 0.9); scene.add(hemi);
    sunL = new THREE.DirectionalLight(0xffffff, 1.0); sunL.position.set(20, 30, 10); scene.add(sunL);
    nightLight = new THREE.PointLight(0xffb060, 0, 26); nightLight.position.set(-8.5, 3, -3); scene.add(nightLight);
    const sk = FX.makeSky({ top: 0x2a78e0, mid: 0x7ec0ff, bot: 0xd8f0ff, sun: 0xfff4d0, dir: [0.3, 0.6, -0.7], size: 1, clouds: 0.85, stars: 0, aurora: 0, swirl: 0, cc: 0xffffff });
    sky = sk; scene.add(sky.mesh);
    sunSprite = FX.glowSprite(0xfff4d0, 30, 0.5); sunSprite.material.fog = false; scene.add(sunSprite);
    parts = new FX.Particles(coarse ? 300 : 700); scene.add(parts.points);
    scene.fog = new THREE.Fog(0xcfe8ff, 40, 150);
    buildWorld();
    itemsGroup = new THREE.Group(); scene.add(itemsGroup);
    resize(); addEventListener('resize', resize);
    addEventListener('pointermove', e => { mx = (e.clientX / innerWidth - 0.5) * 2; my = (e.clientY / innerHeight - 0.5) * 2; });
    cur = sample(tod);
    last = performance.now(); t0 = last;
    running = true; requestAnimationFrame(loop);
  }
  function resize() {
    if (!renderer) return;
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.fov = w / h < 0.9 ? 62 : 48; cam.updateProjectionMatrix();
  }

  function buildWorld() {
    const T = FX.TEX;
    // 地面（丘つき）
    const geo = new THREE.PlaneGeometry(260, 260, 90, 90); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colr = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = hAt(x, z); pos.setY(i, h);
      const d = Math.hypot(x - 2, z), k = sm(0, 60, d);
      c.setRGB(0.55 + 0.1 * Math.sin(x * 0.3) , 0.8 - 0.2 * k, 0.5 - 0.05 * k).multiplyScalar(0.8 + h * 0.03 + 0.1 * Math.sin(x * 0.5 + z * 0.4));
      colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: T.grass(), vertexColors: true, roughness: 1 })); scene.add(ground);
    const tm = (g, col, o) => { const m = new THREE.Mesh(g, FX.toon(col, o)); m.castShadow = false; return m; };
    const put = (m, x, z, y) => { m.position.set(x, (y || 0) + (y === undefined ? hAt(x, z) : 0), z); scene.add(m); return m; };
    // 修行場（砂の円）と柵
    const yard = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), new THREE.MeshStandardMaterial({ map: T.sand(), color: 0xd8c8a8, roughness: 1 })); yard.rotation.x = -Math.PI / 2; yard.position.set(2.5, 0.03, 0); scene.add(yard);
    const yr = FX.runePlane(0xffe27a, 0.22); yr.rotation.x = -Math.PI / 2; yr.position.set(2.5, 0.06, 0); yr.scale.setScalar(7.2); scene.add(yr); yr.userData.spin = true; flags.push(yr);
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; if (a > 0.6 && a < 2.55) continue; const x = 2.5 + Math.cos(a) * 9, z = Math.sin(a) * 9; const p = tm(new THREE.CylinderGeometry(0.12, 0.14, 1.3, 6), 0x7a5a3a); put(p, x, z, 0.65); }
    for (let i = 0; i < 25; i++) { const a0 = i / 26 * TAU, a1 = (i + 1) / 26 * TAU; if (a0 > 0.55 && a1 < 2.6) continue; const x = 2.5 + (Math.cos(a0) + Math.cos(a1)) * 4.5, z = (Math.sin(a0) + Math.sin(a1)) * 4.5; const r = tm(new THREE.BoxGeometry(2.4, 0.1, 0.1), 0x8a6a46); r.position.set(x, 0.95, z); r.rotation.y = -(a0 + a1) / 2 - Math.PI / 2; scene.add(r); }
    // 木
    for (let i = 0; i < 44; i++) {
      const a = rnd(0, TAU), r = rnd(16, 90), x = 2 + Math.cos(a) * r, z = Math.sin(a) * r - 6;
      if (Math.abs(x - 2) < 12 && z > -4) continue;
      const g = new THREE.Group(), h = rnd(2, 3.6), tr = tm(new THREE.CylinderGeometry(0.25, 0.35, h, 7), 0x6a4a2a); tr.position.y = h / 2; g.add(tr);
      const col = pick([0x3e9a48, 0x2e8a3c, 0x4aaa52, 0x2a7a40]);
      for (let k = 0; k < 3; k++) { const cn = tm(new THREE.ConeGeometry(1.7 - k * 0.35, 2, 8), col); cn.position.y = h + k * 0.95; g.add(cn); }
      g.position.set(x, hAt(x, z), z); g.scale.setScalar(rnd(1, 2)); scene.add(g);
    }
    // 花と草
    scene.add(FX.inst(new THREE.SphereGeometry(0.14, 6, 5), FX.toon(0xffffff), 320, (i, d) => { const a = rnd(0, TAU), r = rnd(9, 26), x = 2.5 + Math.cos(a) * r, z = Math.sin(a) * r; d.position.set(x, hAt(x, z) + 0.2, z); d.scale.setScalar(rnd(0.7, 1.4)); return pick([0xffe27a, 0xff8ab0, 0xffffff, 0xb08aff, 0xff9a5a]); }));
    scene.add(FX.inst(new THREE.ConeGeometry(0.1, 0.7, 4), FX.toon(0xffffff), 700, (i, d) => { const a = rnd(0, TAU), r = rnd(8, 40), x = 2.5 + Math.cos(a) * r, z = Math.sin(a) * r; d.position.set(x, hAt(x, z) + 0.3, z); d.scale.set(1, rnd(0.6, 1.5), 1); d.rotation.set(rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2)); return pick([0x3e9a48, 0x58b050, 0x2e8a3c, 0x7ac05a]); }));
    // 小屋
    const cab = new THREE.Group(); cab.position.set(-11, hAt(-11, -7), -7); cab.rotation.y = 0.5; scene.add(cab);
    cab.add(Object.assign(tm(new THREE.BoxGeometry(5.5, 3, 4.2), 0xe2cfa6), { }));
    cab.children[0].position.y = 1.5;
    const roof = tm(new THREE.ConeGeometry(4.6, 2.4, 4), 0xb8483a); roof.rotation.y = Math.PI / 4; roof.scale.set(1.08, 1, 0.82); roof.position.y = 4.1; cab.add(roof);
    const door = tm(new THREE.BoxGeometry(0.9, 1.8, 0.12), 0x6a4a2a); door.position.set(0, 0.9, 2.15); cab.add(door);
    for (const sx of [-1.8, 1.8]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x405070 })); w.position.set(sx, 1.7, 2.12); cab.add(w); windows.push(w); }
    const chim = tm(new THREE.BoxGeometry(0.7, 2, 0.7), 0x8a7a6a); chim.position.set(1.6, 4.4, -0.8); cab.add(chim); smoke.push({ x: -11 + Math.cos(0.5) * 1.6, z: -7 - Math.sin(0.5) * 1.6, y: hAt(-11, -7) + 5.6 });
    // 的（かかし）
    dummy = new THREE.Group(); dummy.position.set(4.6, 0, -2.2); scene.add(dummy);
    const post = tm(new THREE.CylinderGeometry(0.14, 0.18, 2.6, 7), 0x6a4a2a); post.position.y = 1.3; dummy.add(post);
    const bar = tm(new THREE.BoxGeometry(1.6, 0.16, 0.16), 0x6a4a2a); bar.position.y = 1.9; dummy.add(bar);
    const body = tm(new THREE.CylinderGeometry(0.5, 0.6, 1.1, 10), 0xd8b870); body.position.y = 1.5; dummy.add(body);
    const head = tm(new THREE.SphereGeometry(0.4, 10, 8), 0xe8d090); head.position.y = 2.4; dummy.add(head);
    for (let i = 0; i < 3; i++) { const rg = new THREE.Mesh(new THREE.RingGeometry(0.1 + i * 0.12, 0.2 + i * 0.12, 18), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xe03a3a, side: THREE.DoubleSide })); rg.position.set(0, 1.5, 0.62); dummy.add(rg); }
    // 雲
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group(); for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(3, 5.5), 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false })); s.position.set(k * 4 - 8, rnd(-0.8, 0.8), rnd(-1.5, 1.5)); s.scale.y = 0.5; g.add(s); }
      g.position.set(rnd(-120, 120), rnd(32, 55), rnd(-120, -40)); g.userData.sp = rnd(0.5, 1.4); scene.add(g); clouds.push(g);
    }
    // 鳥
    for (let i = 0; i < 6; i++) { const b = new THREE.Group(); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.26), new THREE.MeshBasicMaterial({ color: 0x223344, side: THREE.DoubleSide, fog: false })); w.position.x = sd * 0.5; w.userData.sd = sd; b.add(w); } b.userData = { ox: i * 3.6, oy: Math.abs(i - 3) * 1.3 }; scene.add(b); birds.push(b); }
  }

  // 買った道具を修行場に並べる
  function setItems(items) {
    if (!inited) return;
    const key = Object.keys(items).filter(k => items[k]).sort().join(',');
    if (key === lastKey) return; lastKey = key;
    while (itemsGroup.children.length) { const c = itemsGroup.children[0]; itemsGroup.remove(c); }
    const has = id => !!items[id];
    const tm = (g, col, o) => new THREE.Mesh(g, FX.toon(col, o));
    const add = (m, x, y, z) => { m.position.set(x, y, z); itemsGroup.add(m); return m; };
    if (has('dumbbell') || has('gold_dumbbell')) {
      const gold = has('gold_dumbbell'), col = gold ? 0xffd04a : 0x555a66, g = new THREE.Group(); g.position.set(0.2, 0.45, 3.2);
      const bar = tm(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), 0xb8bcc8); bar.rotation.z = Math.PI / 2; g.add(bar);
      for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const pl = tm(new THREE.CylinderGeometry(0.45 - k * 0.1, 0.45 - k * 0.1, 0.16, 14), col, gold ? { emissive: 0xaa7a10, ei: 0.4 } : {}); pl.rotation.z = Math.PI / 2; pl.position.x = sx * (1.0 + k * 0.2); g.add(pl); }
      g.rotation.y = 0.3; itemsGroup.add(g);
    }
    if (has('shield_i') || has('steel_shield')) {
      const big = has('steel_shield'); const rock = tm(new THREE.DodecahedronGeometry(big ? 1.1 : 0.8, 0), big ? 0x6a7080 : 0x8a7a68); add(rock, 6.6, big ? 0.8 : 0.6, 2.6);
      const sd = tm(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 14), big ? 0xb8c0d0 : 0x8a5a3a); sd.rotation.x = Math.PI / 2 - 0.3; add(sd, 5.4, 0.7, 3.2);
    }
    if (has('grimoire') || has('ancient_tome')) {
      const big = has('ancient_tome'), g = new THREE.Group(); g.position.set(-2.4, 1.4, 4.4);
      const tb = tm(new THREE.BoxGeometry(1.1, 1.7, 0.22), 0x7a7a90); g.add(tb);
      const rn = FX.runePlane(big ? 0xffe27a : 0xb08aff, 0.9); rn.scale.setScalar(0.45); rn.position.z = 0.13; g.add(rn);
      const gl = FX.glowSprite(big ? 0xffe27a : 0xb08aff, 3.2, 0.5); gl.position.z = 0.2; g.add(gl); g.userData.bob = true; itemsGroup.add(g);
    }
    if (has('rosary') || has('holy_rosary')) {
      const big = has('holy_rosary'), g = new THREE.Group(); g.position.set(8.4, 0, -0.5);
      for (const sx of [-1, 1]) { const p = tm(new THREE.BoxGeometry(0.5, 3, 0.5), 0xcfc8e8); p.position.set(sx * 1.4, 1.5, 0); g.add(p); }
      const arc = tm(new THREE.TorusGeometry(1.4, 0.25, 8, 16, Math.PI), 0xe0d8f4); arc.position.y = 3; g.add(arc);
      for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI, b = tm(new THREE.SphereGeometry(0.12, 8, 6), big ? 0xffe27a : 0xffffff, { emissive: big ? 0xffe27a : 0xffffff, ei: 0.9 }); b.position.set(Math.cos(a) * 1.1, 3 + Math.sin(a) * 1.1 - 0.4, 0.05); g.add(b); }
      g.rotation.y = -0.5; itemsGroup.add(g);
    }
    if (has('shoes') || has('wing_shoes')) {
      const big = has('wing_shoes'), g = new THREE.Group(); g.position.set(-5.4, 0.05, 3);
      const lane = tm(new THREE.BoxGeometry(1.6, 0.06, 10), 0xc86a4a); g.add(lane);
      for (let i = 0; i < 5; i++) { const ln = tm(new THREE.BoxGeometry(1.6, 0.07, 0.08), 0xffffff); ln.position.z = -4 + i * 2; g.add(ln); }
      for (const z of [-4.6, 4.6]) { const pole = tm(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), 0xeeeeee); pole.position.set(0.9, 1, z); g.add(pole); const fl = tm(new THREE.PlaneGeometry(0.9, 0.5), big ? 0xffe27a : 0xe03a3a, { side: THREE.DoubleSide }); fl.position.set(1.4, 1.75, z); g.add(fl); flags.push(fl); }
      g.rotation.y = 0.15; itemsGroup.add(g);
    }
    if (has('machine')) {
      const g = new THREE.Group(); g.position.set(-8, 0, 3.8); g.rotation.y = 0.5;
      const b = tm(new THREE.BoxGeometry(4, 2.6, 3), 0x9aa0b0); b.position.y = 1.3; g.add(b);
      const r = tm(new THREE.BoxGeometry(4.4, 0.3, 3.4), 0x5a6070); r.position.y = 2.75; g.add(r);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ color: 0xffcf4a })); sg.position.set(0, 2.2, 1.52); g.add(sg);
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x405070 })); w.position.set(sx * 1.2, 1.0, 1.52); g.add(w); windows.push(w); }
      itemsGroup.add(g);
    }
  }

  // 画面ごとの雰囲気を決める。S は育成データ（なければ null）
  function set(screen, S, extra) {
    init();
    view = screen; ov = null; camMode = 'home';
    if (S) setItems(S.items || {});
    const maxA = S ? S.apd + 3 : 3;
    if (screen === 'title') { todTarget = 0.62; camMode = 'title'; }
    else if (screen === 'select' || screen === 'league') { todTarget = 0.04; camMode = 'select'; }
    else if (screen === 'shop') { todTarget = 0.34; camMode = 'shop'; }
    else if (screen === 'skills' || screen === 'items' || screen === 'equip') { todTarget = 0.95; camMode = 'skills'; }
    else if (screen === 'result') { todTarget = extra && extra.win ? 0.34 : 0.66; win = !!(extra && extra.win); }
    else if (screen === 'ending') { todTarget = extra && extra.win ? 0.03 : 0.95; camMode = 'title'; }
    else if (screen === 'map' || screen === 'versus') {
      const idx = extra && extra.area !== undefined ? extra.area : 0, sk = FX.SKYS[idx], sc = FX.SCENES[idx];
      ov = { top: new THREE.Color(sk.top), mid: new THREE.Color(sk.mid), bot: new THREE.Color(sk.bot), sun: new THREE.Color(sk.sun), fog: new THREE.Color(sc.fog), h1: new THREE.Color(sc.hemi[0]), h2: new THREE.Color(sc.hemi[1]), si: sc.sunI, el: Math.max(0.1, sk.dir[1]), stars: sk.stars, cl: sk.clouds };
      todTarget = 0.4; camMode = 'map';
    } else if (S) {
      const ratio = Math.max(0, Math.min(1, S.actions / Math.max(1, S.apd + (S.items && S.items.machine ? (S.apd > 3 ? 3 : 1) : 0))));
      todTarget = S.day >= S.maxDay ? 0.93 : 0.03 + 0.62 * (1 - ratio);
    }
  }
  const lerpC = (a, b, k) => a.lerp(b, k);

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.body.classList.contains('in-battle') || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
    tod += (todTarget - tod) * (1 - Math.exp(-dt * 1.6));
    const tgt = ov || sample(tod), k = 1 - Math.exp(-dt * 2.5);
    COLS.forEach(c => lerpC(cur[c], tgt[c], k)); NUMS.forEach(n => { cur[n] += (tgt[n] - cur[n]) * k; });
    const u = sky.u;
    u.top.value.copy(cur.top); u.mid.value.copy(cur.mid); u.bot.value.copy(cur.bot); u.sunCol.value.copy(cur.sun);
    u.stars.value = cur.stars; u.clouds.value = cur.cl; u.time.value = t; u.sunSize.value = 1.5; u.cloudCol.value.copy(cur.bot).lerp(new THREE.Color(0xffffff), 0.6);
    const night = Math.max(0, Math.min(1, (tod - 0.7) / 0.2)), az = tod < 0.75 ? -0.8 + tod * 2.3 : 0.4;
    const sd = new THREE.Vector3(az, cur.el, -0.8).normalize(); u.sunDir.value.copy(sd);
    sunSprite.position.copy(sd).multiplyScalar(110); sunSprite.material.color.copy(cur.sun); sunSprite.material.opacity = 0.35;
    hemi.color.copy(cur.h1); hemi.groundColor.copy(cur.h2); hemi.intensity = 0.55 + 0.45 * (1 - night);
    sunL.color.copy(cur.sun); sunL.intensity = cur.si * (1 - night * 0.6); sunL.position.copy(sd).multiplyScalar(60);
    scene.fog.color.copy(cur.fog); scene.background = cur.fog;
    nightLight.intensity = night * 1.6 + (ov ? 0 : 0);
    windows.forEach(w => w.material.color.setHex(0x405070).lerp(new THREE.Color(0xffd070), night));
    // 動き
    clouds.forEach(c => { c.position.x += c.userData.sp * dt; if (c.position.x > 140) c.position.x = -140; c.children.forEach(s => s.material.color.copy(u.cloudCol.value)); c.visible = night < 0.8; });
    birds.forEach(b => { b.position.set(((t * 3 + 100 + b.userData.ox) % 200) - 100, 30 + b.userData.oy, -70 - b.userData.oy); b.children.forEach(w => { w.rotation.z = w.userData.sd * Math.sin(t * 8 + b.userData.ox) * 0.5; }); b.visible = night < 0.5; });
    dummy.rotation.z = Math.sin(t * 1.5) * 0.03; dummy.rotation.y = Math.sin(t * 0.4) * 0.1;
    flags.forEach(f => { if (f.userData.spin) f.rotation.z = t * 0.1; else f.rotation.y = Math.sin(t * 3) * 0.3; });
    itemsGroup.children.forEach(g => { if (g.userData.bob) g.position.y = 1.4 + Math.sin(t * 1.4) * 0.15; });
    smoke.forEach(s => { if (Math.random() < dt * 5) parts.emit({ x: s.x, y: s.y, z: s.z, vx: rnd(0.2, 0.7), vy: rnd(0.8, 1.4), vz: 0, color: 0xcccccc, life: 3.2, size: 0.9, grow: 3, drag: 0.1 }); });
    if (!coarse && night > 0.2 && Math.random() < dt * 20 * night) parts.emit({ x: 2 + rnd(-14, 14), y: rnd(0.4, 3.4), z: rnd(-10, 12), vx: rnd(-0.3, 0.3), vy: rnd(-0.1, 0.3), vz: rnd(-0.3, 0.3), color: 0xfff6a0, life: rnd(2, 4), size: 0.22, drag: 0.1 });
    if (win && view === 'result' && Math.random() < dt * 30) parts.emit({ x: 2 + rnd(-8, 8), y: rnd(8, 12), z: rnd(-4, 6), vx: rnd(-1, 1), vy: rnd(-4, -2), vz: 0, color: pick([0xffe27a, 0xff9ab0, 0x9ad8ff, 0x9affc0]), life: 3, size: 0.35, drag: 0 });
    if (Math.random() < dt * 8) parts.emit({ x: 2 + rnd(-16, 16), y: rnd(2, 8), z: rnd(-12, 10), vx: rnd(0.5, 1.2), vy: rnd(-0.3, 0.2), vz: rnd(-0.3, 0.3), color: night > 0.5 ? 0xb8c0ff : 0xfff2a0, life: 4, size: 0.18, drag: 0 });
    parts.update(dt); parts.setScale(renderer.domElement.height, cam.fov);
    // カメラ
    const por = innerWidth / innerHeight < 0.9;
    const tgtPos = new THREE.Vector3(), tgtLook = new THREE.Vector3();
    if (camMode === 'title') { tgtPos.set(-3 + Math.sin(t * 0.15) * 2, 2.4, por ? 19 : 15); tgtLook.set(0, 5.2, 0); }
    else if (camMode === 'select') { tgtPos.set(3 + Math.sin(t * 0.2) * 2, 2.6, por ? 17 : 13); tgtLook.set(2, 2.6, 0); }
    else if (camMode === 'shop') { tgtPos.set(-1, 3.2, por ? 16.5 : 13); tgtLook.set(-2, 2.2, 2); }
    else if (camMode === 'skills') { tgtPos.set(-1, 2.8, por ? 15 : 11.5); tgtLook.set(-2.2, 2.0, 4); }
    else if (camMode === 'map') { tgtPos.set(0, 5.5, por ? 22 : 18); tgtLook.set(0, 6, 0); }
    else { tgtPos.set(0, por ? 4.2 : 3.4, por ? 17 : 13.5); tgtLook.set(1.2, 2.0, 0); }
    tgtPos.x += mx * 1.1; tgtPos.y += -my * 0.35 + Math.sin(t * 0.5) * 0.08;
    const ck = 1 - Math.exp(-dt * 2.2);
    cc.cam.lerp(tgtPos, ck); cc.look.lerp(tgtLook, ck);
    cam.position.copy(cc.cam); cam.lookAt(cc.look);
    renderer.render(scene, cam);
  }
  return { set };
})();
