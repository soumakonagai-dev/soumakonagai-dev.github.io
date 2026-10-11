// ソダテバトル: 3Dバトル（Three.js）
'use strict';

const Battle = (() => {
  const R = 14;                       // アリーナの半径
  const TIME_LIMIT = 240;           // 敵の体力が多いので、制限時間も長くしてある
const ENEMY_HP_MUL = 5;           // 敵の体力の倍率
  const INTRO = 2.6;
  let renderer, scene, camera, root, canvas, hemi, sun, parts;
  let running = false, raf = 0, last = 0, inited = false;
  let P, E, projs, fxs, timers, clock, ctx, floorMesh, rimMesh, scenery;
  const keys = {}, edge = {}, stick = { x: 0, y: 0 };
  const KEYALIAS = { ShiftRight: 'ShiftLeft', KeyZ: 'ShiftLeft' };

  const rand = (a, b) => a + Math.random() * (b - a);
  const $ = id => document.getElementById(id);
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
  const ease = x => x * x * (3 - 2 * x);

  // ---------- 初期化 ----------
  function init() {
    if (inited) return;
    inited = true;
    root = $('battle'); canvas = $('bt-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const coarse = matchMedia('(pointer:coarse)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 300);
    hemi = new THREE.HemisphereLight(0xffffff, 0x556070, 0.9); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(10, 20, 8); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
    sun.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024); sun.shadow.bias = -0.0005;
    scene.add(sun);
    floorMesh = new THREE.Mesh(new THREE.CircleGeometry(R, 56), new THREE.MeshToonMaterial({ color: 0xcfcfcf }));
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);
    rimMesh = new THREE.Mesh(new THREE.TorusGeometry(R, 0.3, 8, 80), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    rimMesh.rotation.x = Math.PI / 2; scene.add(rimMesh);
    parts = new FX.Particles(3000); scene.add(parts.points);
    resize();
    addEventListener('resize', resize);
    addEventListener('keydown', e => {
      if (!running) return;
      const code = KEYALIAS[e.code] || e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!keys[code]) edge[code] = true;
      keys[code] = true;
    });
    addEventListener('keyup', e => { keys[KEYALIAS[e.code] || e.code] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    root.querySelectorAll('[data-k]').forEach(b => {
      const code = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); if (!keys[code]) edge[code] = true; keys[code] = true; b.classList.add('down'); });
      const up = () => { keys[code] = false; b.classList.remove('down'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    });
    const sz = $('bt-stick'), knob = $('bt-knob');
    let sid = null, cx = 0, cy = 0;
    const move = e => {
      let dx = e.clientX - cx, dy = e.clientY - cy; const m = 50, l = Math.hypot(dx, dy);
      if (l > m) { dx = dx / l * m; dy = dy / l * m; }
      stick.x = dx / m; stick.y = -dy / m;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    };
    sz.addEventListener('pointerdown', e => {
      e.preventDefault(); sid = e.pointerId; sz.setPointerCapture(sid);
      const r = sz.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e);
    });
    sz.addEventListener('pointermove', e => { if (e.pointerId === sid) move(e); });
    const end = e => { if (e.pointerId === sid) { sid = null; stick.x = stick.y = 0; knob.style.transform = ''; } };
    sz.addEventListener('pointerup', end); sz.addEventListener('pointercancel', end);
    $('bt-quit').addEventListener('click', () => { if (running && ctx && !ctx.over) { if (confirm('あきらめますか？（負けになります）')) finish(false, true); } });
  }
  function resize() {
    if (!renderer) return;
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    ctx && (ctx.baseFov = w / h < 1 ? 72 : 50);
    camera.fov = w / h < 1 ? 72 : 50;
    // 縦向きは、下の操作ボタンに隠れないよう、画面の上寄りに映す
    if (w / h < 1) camera.setViewOffset(w, h, 0, Math.round(h * 0.15), w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function disposeObj(o) {
    o.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material && !c.material.userData.keep) { (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose()); }
    });
  }

  // ---------- エフェクト部品 ----------
  function addFx(life, obj, fn) {
    if (obj) scene.add(obj);
    fxs.push({ life, max: life, obj, fn });
  }
  function glow(x, y, z, color, size, life) {
    const s = FX.glowSprite(color, size, 1); s.position.set(x, y, z);
    addFx(life, s, (k, o) => { o.material.opacity = k; o.scale.setScalar(size * (1.4 - k * 0.4)); });
  }
  // 地面のリング（拡大して消える）
  function shock(x, z, r, color, life, y) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y || 0.1, z);
    addFx(life, m, (k, o) => { const g = 1 - k; o.scale.setScalar(Math.max(0.1, r * (0.25 + g * 0.85))); o.material.opacity = k * 0.9; });
  }
  // 範囲攻撃の予告（中が満ちていく）
  function telegraph(x, z, r, color, life) {
    const g = new THREE.Group();
    const edge = new THREE.Mesh(new THREE.RingGeometry(r * 0.96, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    const base = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    const ra = FX.runePlane(color, 0.6), rb = FX.runePlane(color, 0.35);
    [edge, base, fill, ra, rb].forEach(m => { m.rotation.x = -Math.PI / 2; g.add(m); });
    base.position.y = 0.05; edge.position.y = 0.07; fill.position.y = 0.06; ra.position.y = 0.09; rb.position.y = 0.1;
    ra.scale.setScalar(r); rb.scale.setScalar(r * 0.72);
    g.position.set(x, 0, z);
    addFx(life, g, (k) => { fill.scale.setScalar(Math.max(0.01, 1 - k)); edge.material.opacity = 0.5 + Math.sin(clock * 30) * 0.35; ra.rotation.z = clock * 0.9; rb.rotation.z = -clock * 1.4; ra.material.opacity = 0.6 * Math.min(1, k * 3); });
  }
  function runeCircle(x, y, z, r, color, life, o) {
    o = o || {};
    const g = new THREE.Group(); g.position.set(x, y, z);
    if (o.yaw !== undefined) g.rotation.y = o.yaw;
    const a = FX.runePlane(color, 0.95), b = FX.runePlane(color, 0.5);
    if (!o.vertical) { a.rotation.x = -Math.PI / 2; b.rotation.x = -Math.PI / 2; }
    g.add(a); g.add(b);
    addFx(life, g, (k) => {
      const t = 1 - k, grow = Math.min(1, t / 0.22), sc = r * (0.2 + 0.8 * (1 - Math.pow(1 - grow, 3))) * (o.expand ? 1 + t * 0.25 : 1);
      a.scale.setScalar(sc); b.scale.setScalar(sc * 0.72);
      const spin = (o.spin || 1.5) * t * life * 2.2; a.rotation.z = spin; b.rotation.z = -spin * 1.4;
      const fade = k < 0.35 ? k / 0.35 : 1; a.material.opacity = 0.95 * fade; b.material.opacity = 0.5 * fade;
    });
  }
  // 詠唱：足もとと正面に魔法陣
  function castRune(f, color, big, vertical) {
    runeCircle(f.pos.x, 0.1, f.pos.z, big ? 4.2 : 1.9, color, big ? 1.0 : 0.6, { spin: 1.4 });
    if (vertical) runeCircle(f.pos.x + Math.sin(f.yaw) * 1.7, 1.45, f.pos.z + Math.cos(f.yaw) * 1.7, big ? 2.6 : 1.15, color, big ? 0.9 : 0.5, { vertical: true, yaw: f.yaw, spin: 2 });
  }
  function impactStar(p, color, size) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.starTex(), color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.material.rotation = Math.random() * 3; sp.position.set(p.x, 1.4, p.z);
    addFx(0.24, sp, (k, o) => { o.scale.setScalar(size * (1.6 - k * 0.9)); o.material.opacity = k; });
  }
  // 空から槍が降ってくる
  function rain(elem, x, z, r, delay, n) {
    const c = FX.ELEM_FX[elem];
    for (let i = 0; i < n; i++) {
      const land = delay * (0.25 + 0.75 * i / Math.max(1, n - 1)), fall = Math.min(0.35, delay * 0.6);
      const px = x + (Math.random() * 2 - 1) * r * 0.85, pz = z + (Math.random() * 2 - 1) * r * 0.85;
      later(Math.max(0, land - fall), () => {
        const m = FX.spearMesh(c[1], 3.4, 0.2); m.rotation.x = Math.PI / 2; m.position.set(px, 20, pz);
        addFx(fall + 0.2, m, (k, o) => {
          const t = (1 - k) * (fall + 0.2) / fall;
          if (t < 1) o.position.y = 20 * (1 - t) + 1.2;
          else { if (!o.userData.hit) { o.userData.hit = true; parts.burst(elem, px, 0.3, pz, 10, 4, 0.2); shock(px, pz, 1.8, c[1], 0.3); } o.position.y = 1.2; o.scale.setScalar(Math.max(0.01, 1 - (t - 1) * 5)); }
        });
      });
    }
  }
  // 地面から棘がつき出す
  function spikes(elem, x, z, r, n) {
    const c = FX.ELEM_FX[elem];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, h = 1.6 + Math.random() * 1.6;
      later(Math.random() * 0.25, () => {
        const g = new THREE.Group(), mat = elem === 'earth' ? FX.toon(0x8a6a3a) : new THREE.MeshBasicMaterial({ color: c[1], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
        const cn = new THREE.Mesh(new THREE.ConeGeometry(0.4 + Math.random() * 0.2, h, 6), mat); cn.position.y = h / 2; cn.castShadow = true; g.add(cn);
        g.position.set(px, 0, pz); g.rotation.z = (Math.random() - 0.5) * 0.35; g.scale.y = 0.01;
        parts.burst(elem, px, 0.2, pz, 6, 3, 0.2);
        addFx(0.7, g, (k, o) => { const t = 1 - k; o.scale.y = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0.01, (1 - t) / 0.3) : 1; });
      });
    }
  }
  function clawSlash(f, reach, arc, ec, n) {
    for (let i = 0; i < n; i++) later(i * 0.06, () => { if (!f.dead) slashArc(f, reach * (1 - i * 0.06), arc, ec[i % 3], true, (i - (n - 1) / 2) * 0.8); });
  }
  function slashArc(f, reach, arcDeg, color, big, tilt) {
    const arc = arcDeg * Math.PI / 180;
    const g = new THREE.Group(), h = new THREE.Group(); g.add(h); h.rotation.z = tilt || 0;
    const m = new THREE.Mesh(new THREE.RingGeometry(reach * 0.3, reach * 0.95, 28, 1, -Math.PI / 2 - arc / 2, arc), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    const m2 = new THREE.Mesh(new THREE.RingGeometry(reach * 0.78, reach * 0.97, 28, 1, -Math.PI / 2 - arc / 2, arc), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m2.rotation.x = -Math.PI / 2; h.add(m); h.add(m2);
    g.position.set(f.pos.x, big ? 1.0 : 1.2, f.pos.z); g.rotation.y = f.yaw;
    const start = -0.5 + (Math.random() - 0.5) * 0.3, dirS = (tilt || 0) < 0 ? -1 : 1;
    addFx(0.24, g, (k, o) => { const t = 1 - k; o.rotation.y = f.yaw + (start + t * 1.2) * 0.35 * dirS; o.scale.setScalar(0.85 + t * 0.35); m.material.opacity = k * 0.85; m2.material.opacity = k * 0.95; });
    for (let i = 0; i < 10; i++) {
      const a = f.yaw + (i / 9 - 0.5) * arc;
      parts.emit({ x: f.pos.x + Math.sin(a) * reach * 0.85, y: 1.1 + (tilt || 0) * (i / 9 - 0.5) * 2, z: f.pos.z + Math.cos(a) * reach * 0.85, vx: Math.sin(a) * 2.5, vy: rand(-0.5, 1.5), vz: Math.cos(a) * 2.5, color: FX.ELEM_FX[f.elem][(Math.random() * 3) | 0], life: 0.32, size: 0.32, drag: 3 });
    }
  }
  function hitFx(t, elem, d, crit, guarded, big) {
    const p = t.pos, n = guarded ? 8 : Math.min(48, 14 + Math.round(d / t.maxHp * 140));
    if (guarded) parts.burst('none', p.x, 1.3, p.z, n, 4, 0.2);
    else {
      parts.burst(elem, p.x, 1.2, p.z, n, 5 + (crit ? 4 : 0), 0.2); parts.burst('none', p.x, 1.2, p.z, 8, 4, 0);
      impactStar(p, FX.ELEM_FX[elem][1], crit ? 7 : big ? 5 : 3.6); impactStar(p, 0xffffff, crit ? 4 : 2.2);
      for (let i = 0; i < (crit ? 14 : 8); i++) { const a = Math.random() * 6.28; parts.emit({ x: p.x, y: 1.3, z: p.z, vx: Math.cos(a) * 12, vy: rand(-1, 4), vz: Math.sin(a) * 12, color: 0xffffff, life: 0.18, size: 0.22, drag: 5 }); }
    }
    glow(p.x, 1.3, p.z, guarded ? 0x9fe0ff : FX.ELEM_FX[elem][1], guarded ? 2 : (crit ? 6 : 3.4), 0.2);
    shock(p.x, p.z, guarded ? 1.5 : (crit ? 3.8 : 2.6), guarded ? 0x9fe0ff : FX.ELEM_FX[elem][1], 0.3, 0.2);
  }
  function blastFx(elem, x, z, r, ult, quiet) {
    const c = FX.ELEM_FX[elem][1];
    parts.ringBurst(elem, x, z, r, Math.round(26 + r * 5));
    parts.column(elem, x, z, r * 0.8, 40 + Math.round(r * 8), 6 + r);
    parts.burst(elem, x, 0.6, z, 30, 6 + r, r * 0.5);
    shock(x, z, r, c, 0.5); shock(x, z, r * 0.7, 0xffffff, 0.35);
    glow(x, 1.2, z, c, r * 2.2, 0.3);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.7, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(x, 7, z);
    addFx(0.4, beam, (k, o) => { o.material.opacity = k * 0.55; o.scale.set(0.4 + (1 - k) * 0.9, 1, 0.4 + (1 - k) * 0.9); });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    dome.position.set(x, 0, z);
    addFx(0.35, dome, (k, o) => { o.scale.setScalar(0.3 + (1 - k) * 0.8); o.material.opacity = k * 0.4; });
    if (quiet) { ctx.shake = Math.max(ctx.shake, 0.1); return; }
    ctx.shake = Math.max(ctx.shake, Math.min(0.9, 0.2 + r * 0.07 + (ult ? 0.3 : 0)));
    ctx.hitstop = Math.max(ctx.hitstop, ult ? 0.2 : 0.08);
    Sound.play(elem === 'earth' ? 'quake' : elem === 'wind' ? 'thunder' : elem === 'fire' ? 'fire' : elem === 'water' ? 'water' : 'explode');
  }
  function dust(f, n) {
    for (let i = 0; i < n; i++) parts.emit({ x: f.pos.x + rand(-0.4, 0.4), y: 0.15, z: f.pos.z + rand(-0.4, 0.4), vx: rand(-1.5, 1.5), vy: rand(0.3, 1.2), vz: rand(-1.5, 1.5), color: 0xb8b0a0, life: rand(0.3, 0.6), size: rand(0.4, 0.8), drag: 3, grow: 1.5 });
  }
  function floatText(t, text, color, cls) {
    const v = t.pos.clone(); v.y = 2.9; v.project(camera);
    const el = document.createElement('div');
    el.className = 'dmg ' + (cls || ''); el.textContent = text; el.style.color = color;
    el.style.left = ((v.x * 0.5 + 0.5) * innerWidth + rand(-24, 24)) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight + rand(-10, 10)) + 'px';
    $('bt-fx').appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
  function later(delay, fn) { timers.push({ t: clock + delay, fn }); }

  // ---------- ファイター ----------
  function makeFighter(side, def) {
    const st = def.stats;
    const f = {
      side, name: def.name, type: def.type, elem: def.elem, color: def.color, stats: st,
      atkT: ATK_TYPES[def.type],
      maxHp: (100 + st.HP * 2) * (side === 'e' ? ENEMY_HP_MUL : 1), hp: 0, gauge: 0,
      pos: new THREE.Vector3(side === 'p' ? -7 : 7, 0, 0), yaw: side === 'p' ? Math.PI / 2 : -Math.PI / 2,
      busy: 0, atkCd: 0, stun: 0, inv: 0, stepT: 0, stepCd: 0, stepV: null, dash: null, kb: new THREE.Vector3(),
      guard: false, wantGuard: false, guardHp: 0, guardBroke: 0,
      buffs: { atk: 0, def: 0, spd: 0, weak: 0, drain: 0 }, burnT: 0, burnAcc: 0, burnBy: null, burnPow: 0, shield: 0, shieldT: 0, gcd: 0, hop: 0, spin: null, leap: null, slow: 0, flash: 0, anim: null, combo: 0, comboT: 0, alt: false, charge: 0,
      in: { fwd: 0, right: 0 }, moving: false,
      skills: (def.skills || []).map(id => id ? { def: SKILL_BY_ID[id], cd: side === 'e' ? rand(1, 4) : 0 } : null),
      ult: def.ult ? SKILL_BY_ID[def.ult] : null,
      ai: def.ai, lvl: def.lvl || 0, aiT: rand(0.3, 0.8), strafe: Math.random() < 0.5 ? 1 : -1, aiAtk: false, aiGuardT: 0,
      dead: false,
    };
    f.maxHp = Math.round(f.maxHp * (def.hpMul || 1)); f.powMul = def.powMul || 1; f.normMul = def.normMul || 1; f.atkElem = def.atkElem || null;
    f.hp = f.maxHp; f.hpShown = f.hp;
    f.guardHp = 60 + st.DEF * 0.15;
    f.ranged = def.type === 'mage' || def.type === 'archer';
    f.model = FX.buildModel(def);
    f.model.root.scale.setScalar(side === 'e' && def.boss ? 1.15 : 1);
    scene.add(f.model.root);
    return f;
  }
  function speedOf(f) {
    let s = (4.2 + f.stats.SPD * 0.008) * f.atkT.speed;
    s = Math.min(s, 11);
    if (f.buffs.spd > 0) s *= 1.4;
    if (f.slow > 0) s *= 0.5;
    if (f.charge > 0) s *= 0.5;
    return s;
  }
  const opp = f => (f === P ? E : P);
  function setAnim(f, style, dur) { f.anim = { t: 0, dur, style }; }

  // ---------- ダメージ ----------
  function hurt(t, a, power, dmgType, elem, o = {}) {
    if (t.dead || ctx.over || t.inv > 0) return false;
    const atk = (dmgType === 'physical' ? a.stats.ATK : a.stats.MAG) * (a.buffs.atk > 0 ? 1.4 : 1);
    const def = dmgType === 'physical' ? t.stats.DEF : t.stats.RES;
    let d = power * atk / (def * 0.5 + 50) * 1.6 * rand(0.9, 1.1) * elemMult(elem, t.elem);
    const crit = Math.random() < 0.06;
    if (crit) d *= 1.5;
    if (t.buffs.def > 0) d *= 0.5;
    if (t.buffs.weak > 0) d *= 1.35;
    let guarded = false;
    if (t.guard && t.guardBroke <= 0 && t.stun <= 0) {
      guarded = true; d *= 0.3; t.guardHp -= d;
      if (t.guardHp <= 0) { t.guardBroke = 2.0; t.stun = 0.9; t.guardHp = 60 + t.stats.DEF * 0.15; floatText(t, 'ガード崩れ！', '#ffd75e', 'sm'); Sound.play('break'); parts.burst('none', t.pos.x, 1.4, t.pos.z, 30, 7, 0.3); }
    }
    if (t.shield > 0) {
      const ab = Math.min(t.shield, d); t.shield -= ab; d -= ab;
      if (d < 1) { floatText(t, 'ブロック', '#9fe7ff', 'sm'); t.flash = 0.08; Sound.play('guard'); parts.burst('water', t.pos.x, 1.4, t.pos.z, 10, 4, 0.3); return true; }
    }
    d = Math.max(1, Math.round(d));
    ctx.lastDmg = d;
    t.hp = Math.max(0, t.hp - d);
    t.flash = 0.14;
    const mult = elemMult(elem, t.elem), big = d >= t.maxHp * 0.1;
    floatText(t, (guarded ? '🛡' : '') + d + (mult > 1 ? '↑' : mult < 1 ? '↓' : ''), t.side === 'p' ? '#ff7b7b' : crit ? '#ffe27a' : '#ffffff', crit ? 'crit' : big ? 'big' : '');
    if (crit) floatText(t, 'CRITICAL!', '#ffe27a', 'sm');
    a.gauge = Math.min(100, a.gauge + d / t.maxHp * 150);
    t.gauge = Math.min(100, t.gauge + d / t.maxHp * 100);
    if (t.side === 'p') { ctx.taken += d; ctx.takenType[dmgType] += d; ctx.vig = 0.35; ctx.comboN = 0; }
    else { ctx.dealt += d; ctx.comboN++; ctx.comboT = 2.2; showCombo(); }
    hitFx(t, elem, d, crit, guarded, big);
    Sound.play(guarded ? 'guard' : crit ? 'crit' : 'hit');
    ctx.hitstop = Math.max(ctx.hitstop, guarded ? 0.06 : crit ? 0.2 : big ? 0.13 : 0.085); ctx.hitTarget = t;
    ctx.fovKick = Math.min(ctx.fovKick, guarded ? -1 : crit ? -7 : big ? -4.5 : -3);
    if (crit || big) { const fl = $('bt-flash'); fl.style.transition = 'none'; fl.style.opacity = crit ? 0.4 : 0.18; requestAnimationFrame(() => { fl.style.transition = 'opacity .3s'; fl.style.opacity = 0; }); }
    ctx.shake = Math.max(ctx.shake, guarded ? 0.05 : Math.min(0.6, 0.12 + d / t.maxHp * 2.5));
    if (!guarded) {
      const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z, l = Math.hypot(dx, dz) || 1, kbp = (o.kb || 1) * (big ? 6 : 3);
      if (!t.atkT.armor) t.kb.set(dx / l * kbp, 0, dz / l * kbp);
    }
    if (!guarded && !t.atkT.armor && (d >= t.maxHp * 0.12 || o.stun)) {
      t.stun = Math.max(t.stun, o.stun || 0.35); t.busy = 0; t.dash = null; t.charge = 0; t.anim = null;
    }
    if (o.burn) { t.burnT = 3.5; t.burnBy = a; t.burnPow = power * 0.22; t.burnAcc = 0; floatText(t, 'やけど', '#ff8a4a', 'sm'); }
    if (a.buffs.drain > 0 && a !== t) { const h = Math.round(d * 0.3); a.hp = Math.min(a.maxHp, a.hp + h); floatText(a, '+' + h, '#7dff9a', 'sm'); }
    if (o.weak) { t.buffs.weak = Math.max(t.buffs.weak, o.weak); floatText(t, '呪い', '#c08aff', 'sm'); }
    if (o.slow) { t.slow = o.slow; for (let i = 0; i < 10; i++) parts.emit({ x: t.pos.x + rand(-0.5, 0.5), y: rand(0.3, 1.6), z: t.pos.z + rand(-0.5, 0.5), vy: 1, color: 0x9fe7ff, life: 0.7, size: 0.4 }); }
    if (t.hp <= 0) knockOut(t, a, elem);
    return true;
  }
  function knockOut(t, a, elem) {
    t.dead = true; ctx.over = true; ctx.winner = a.side; ctx.overT = 2.4; ctx.koFx = 1;
    ctx.msg('K.O.!', 1); Sound.play('ko');
    parts.burst(elem, t.pos.x, 1.2, t.pos.z, 60, 11, 0.5); parts.burst('none', t.pos.x, 1.2, t.pos.z, 30, 8, 0.3);
    glow(t.pos.x, 1.3, t.pos.z, 0xffffff, 9, 0.5); shock(t.pos.x, t.pos.z, 7, 0xffffff, 0.7);
    $('bt-flash').style.transition = 'none'; $('bt-flash').style.opacity = 0.9;
    requestAnimationFrame(() => { $('bt-flash').style.transition = 'opacity .8s'; $('bt-flash').style.opacity = 0; });
    ctx.shake = 0.9; ctx.fovKick = -14;
  }
  function showCombo() {
    const el = $('bt-combo');
    if (ctx.comboN < 2) { el.style.opacity = 0; return; }
    el.textContent = ctx.comboN + ' HIT';
    el.style.opacity = 1; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  // ---------- 攻撃 ----------
  function face(f) { const o = opp(f); f.yaw = Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z); }
  function inCone(f, t, reach, arc) {
    const d = dist(f, t);
    if (d - 0.6 > reach) return false;
    if (d < 1.2) return true;
    const ang = Math.atan2(t.pos.x - f.pos.x, t.pos.z - f.pos.z);
    return Math.abs(angDiff(ang, f.yaw)) <= arc * Math.PI / 360;
  }
  function spawnProj(f, o) {
    const yaw = f.yaw + (o.ang || 0);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const size = o.size || 0.4, c = FX.ELEM_FX[o.elem], shape = o.shape || 'orb';
    const g = new THREE.Group();
    if (size > 1) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), FX.toon(0x8a7a62)); b.castShadow = true; g.add(b); }
    else if (shape === 'spear') { g.add(FX.spearMesh(c[1], 2.8 * Math.max(1, size / 0.45), 0.17 * Math.max(1, size / 0.45))); g.rotation.y = yaw; }
    else if (shape === 'feather') { g.add(FX.spearMesh(c[1], 1.6, 0.08 + size * 0.1)); g.rotation.y = yaw; }
    else if (shape === 'spike') { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.7, 6), FX.toon(0x9a8060)); cn.rotation.x = Math.PI / 2; g.add(cn); g.add(FX.glowSprite(c[1], 1.6, 0.6)); g.rotation.y = yaw; }
    else if (shape === 'crescent') { g.add(FX.crescentMesh(c[1], size * 3.4)); g.rotation.y = yaw; }
    else { g.add(FX.glowSprite(c[1], size * 4.2, 1)); g.add(FX.glowSprite(0xffffff, size * 2, 1)); }
    const p = f.pos.clone().addScaledVector(dir, 1.2); p.y = 1.3;
    g.position.copy(p); scene.add(g);
    projs.push({ mesh: g, pos: p, vel: dir.multiplyScalar(o.speed), owner: f, power: o.power, dmg: o.dmg, elem: o.elem, r: size + 0.15 + (shape === 'spear' ? 0.25 : 0), life: o.life || 1.7, pierce: o.pierce, hit: false, slow: o.slow, stun: o.stun, size, shape, homing: o.homing, weak: o.weak, speed: o.speed, burn: o.burn, drain: o.drain });
    glow(p.x, p.y, p.z, c[1], size * 5, 0.15);
    parts.burst(o.elem, p.x, p.y, p.z, 8, 3, 0.1);
  }
  function doNormal(f, charge) {
    if (f.dead || ctx.start > 0 || f.busy > 0 || f.stun > 0 || f.stepT > 0 || f.atkCd > 0 || f.dash) return false;
    const a = f.atkT, ne = f.atkElem || f.elem;
    face(f);
    let kind = a.kind, dmg = a.dmg, power = a.power * (f.normMul || 1);
    if (kind === 'dual') { f.alt = !f.alt; kind = f.alt ? 'melee' : 'proj'; dmg = f.alt ? 'physical' : 'magic'; }
    let cd = a.cd, big = false;
    if (a.combo) {
      f.combo = f.comboT > 0 ? (f.combo + 1) % 3 : 0; f.comboT = 0.9;
      if (f.combo === 2) { power *= 1.5; cd = 0.7; big = true; }
    }
    if (a.charge) power = a.power * (f.normMul || 1) * (1 + charge * 2.2);
    f.busy = a.wind + 0.12; f.atkCd = cd;
    const style = f.type === 'heavy' ? 'pound' : kind === 'proj' ? (f.type === 'archer' ? 'shoot' : 'cast') : 'slash';
    setAnim(f, style, Math.max(0.3, a.wind + 0.2));
    Sound.play(kind === 'melee' ? 'swing' : f.type === 'archer' ? 'shot' : 'magic');
    if (kind === 'melee') {
      later(a.wind, () => {
        if (f.dead || f.stun > 0) return;
        face(f);
        const ecs = FX.ELEM_FX[ne], rr = (a.range || 2.6) + 0.5;
        if (big) clawSlash(f, rr, a.arc || 110, ecs, 2);
        else slashArc(f, rr, a.arc || 110, ecs[1], f.type === 'heavy', (f.combo === 0 ? 0.55 : -0.55) * (Math.random() < 0.3 ? -1 : 1));
        if (f.type === 'heavy') { parts.ringBurst('earth', f.pos.x + Math.sin(f.yaw) * 2.2, f.pos.z + Math.cos(f.yaw) * 2.2, 2, 14); ctx.shake = Math.max(ctx.shake, 0.25); }
        if (inCone(f, opp(f), a.range || 2.6, a.arc || 110)) hurt(opp(f), f, power, dmg, ne, { kb: big ? 1.6 : 1 });
      });
    } else {
      later(a.wind, () => {
        if (f.dead || f.stun > 0) return;
        face(f);
        castRune(f, FX.ELEM_FX[ne][1], false, true);
        spawnProj(f, { power, dmg, elem: ne, speed: a.pspeed || 18, size: a.charge ? 0.22 + charge * 0.22 : 0.38, shape: a.shape });
      });
    }
    return true;
  }
  function useSkill(f, i, isUlt, o) {
    o = o || {};
    const s0 = isUlt ? f.ult : (f.skills[i] && f.skills[i].def);
    const s = s0 && (s0.elem === 'self' || s0.elem === 'weapon') ? Object.assign({}, s0, { elem: s0.elem === 'weapon' ? (f.atkElem || 'none') : f.elem }) : s0;
    if (!s || f.dead || ctx.start > 0 || (!o.force && f.busy > 0) || f.stun > 0 || f.stepT > 0 || f.dash) return false;
    if (isUlt) { if (f.gauge < 100) return false; }
    else if (f.skills[i].cd > 0) return false;
    const qk = o.quick ? 0.5 : 1, pw = s.power * (o.boost || 1) * (f.powMul || 1);
    if (!o.quick) face(f);
    const t = opp(f);
    if (isUlt) { f.gauge = 0; cutIn(f, s); } else f.skills[i].cd = s.ct * (f.side === 'e' ? 1.25 : 1);
    if (f.side === 'e') { f.gcd = 0.9 + Math.random() * 0.8; if (!o.quick && !o.force && !isUlt) floatText(f, s.name, '#ffd8b0', 'sm'); }
    if (s.pat) return runPattern(f, s, o);
    const dmg = s.type === 'magic' ? 'magic' : 'physical';
    const ec = FX.ELEM_FX[s.elem], isMagic = s.type === 'magic';
    const pre = isUlt ? 0.5 : 0;
    const warnColor = f.side === 'e' ? 0xff5a3a : ec[1];
    const aStyle = s.range === 'line' ? (f.type === 'archer' ? 'shoot' : 'cast') : s.range === 'circle' ? (isMagic ? 'cast' : 'pound') : s.range === 'dash' ? 'dash' : s.range === 'self' ? 'buff' : s.range === 'melee' ? 'slash' : 'cast';
    setAnim(f, aStyle, 0.5 + pre);
    if (!isUlt) Sound.play(isMagic ? (s.elem === 'fire' ? 'fire' : 'magic') : 'swing');
    if (isMagic || isUlt || s.range === 'self') castRune(f, ec[1], isUlt, s.range === 'line' || (s.range === 'circle' && s.at === 'target'));
    if (s.range === 'line') {
      f.busy = 0.3 + pre;
      parts.burst(s.elem, f.pos.x + Math.sin(f.yaw), 1.4, f.pos.z + Math.cos(f.yaw), 14, 3, 0.2);
      later(0.18 * qk + pre, () => {
        if (f.dead) return;
        if (!o.quick) face(f);
        const n = s.n || 1;
        Sound.play(s.elem === 'wind' && isMagic ? 'thunder' : f.type === 'archer' ? 'shot' : 'magic');
        for (let k = 0; k < n; k++) {
          const ang = n > 1 ? (k - (n - 1) / 2) * (s.spread || 0.2) : 0;
          spawnProj(f, { power: pw, dmg, elem: s.elem, speed: s.speed, size: s.size || 0.45, ang, pierce: s.pierce, slow: s.slow, stun: s.stun, shape: s.shape });
        }
      });
    } else if (s.range === 'melee') {
      f.busy = (s.delay || 0.2) * qk + 0.3 + pre;
      later((s.delay || 0.2) * qk + pre, () => {
        if (f.dead || f.stun > 0) return;
        if (!o.quick) face(f);
        clawSlash(f, s.reach + 0.6, s.arc, ec, 3);
        parts.burst(s.elem, f.pos.x + Math.sin(f.yaw) * 2, 1, f.pos.z + Math.cos(f.yaw) * 2, 24, 6, 0.4);
        ctx.shake = Math.max(ctx.shake, 0.3);
        if (inCone(f, t, s.reach, s.arc)) hurt(t, f, pw, dmg, s.elem, { stun: s.stun, kb: 1.8 });
      });
    } else if (s.range === 'circle') {
      const atTarget = s.at === 'target';
      const delay = Math.max(o.quick ? 0.35 : 0, (s.delay || 0.2) * (o.quick ? 0.6 : 1)) + pre;
      const cx = atTarget ? t.pos.x : f.pos.x, cz = atTarget ? t.pos.z : f.pos.z;
      f.busy = (atTarget ? 0.45 : delay + 0.3);
      telegraph(atTarget ? cx : f.pos.x, atTarget ? cz : f.pos.z, s.r, warnColor, delay);
      if (atTarget) {
        // 空から落ちてくる光
        const sp = FX.glowSprite(ec[1], 3, 1); sp.position.set(cx, 22, cz); scene.add(sp);
        addFx(delay, sp, (k, o) => { o.position.y = 1 + k * 21; o.scale.setScalar(2 + (1 - k) * 4); });
      } else {
        for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28; parts.emit({ x: f.pos.x + Math.cos(a) * s.r * 0.9, y: 0.3, z: f.pos.z + Math.sin(a) * s.r * 0.9, vx: -Math.cos(a) * s.r * 1.5, vy: 1.5, vz: -Math.sin(a) * s.r * 1.5, color: ec[1], life: delay, size: 0.35 }); }
      }
      if (s.vfx === 'spears') rain(s.elem, atTarget ? cx : f.pos.x, atTarget ? cz : f.pos.z, s.r, delay, isUlt ? 16 : 9);
      later(delay, () => {
        if (f.dead) return;
        const ox = atTarget ? cx : f.pos.x, oz = atTarget ? cz : f.pos.z;
        if (s.vfx === 'spikes') spikes(s.elem, ox, oz, s.r, isUlt ? 22 : 14);
        blastFx(s.elem, ox, oz, s.r, isUlt);
        runeCircle(ox, 0.12, oz, s.r * 1.15, ec[1], 0.8, { spin: 2, expand: true });
        for (let i = 0; i < 3; i++) later(i * 0.07, () => shock(ox, oz, s.r * (0.7 + i * 0.25), ec[1], 0.4, 0.2 + i * 1.1));
        const tt = opp(f);
        if (Math.hypot(tt.pos.x - ox, tt.pos.z - oz) <= s.r + 0.5) hurt(tt, f, pw, dmg, s.elem, { slow: s.slow, stun: s.stun, kb: s.kb || 2 });
      });
    } else if (s.range === 'dash') {
      const back = s.dir === 'back', dur = o.quick ? 0.14 : 0.22, dirv = back ? -1 : 1;
      f.dash = { vx: Math.sin(f.yaw) * s.dist / dur * dirv, vz: Math.cos(f.yaw) * s.dist / dur * dirv, t: dur, skill: s, hit: back, dmg, boost: (o.boost || 1) * (f.powMul || 1) };
      f.inv = Math.max(f.inv, dur + 0.05); f.busy = dur + 0.15;
      Sound.play('dash');
    } else if (s.range === 'tele') {
      parts.burst(f.elem, f.pos.x, 1.2, f.pos.z, 30, 6, 0.3); shock(f.pos.x, f.pos.z, 2.5, ec[1], 0.4);
      Sound.play('tele');
      const dx = t.pos.x - f.pos.x, dz = t.pos.z - f.pos.z, l = Math.hypot(dx, dz) || 1;
      f.pos.x = t.pos.x + dx / l * 2.8; f.pos.z = t.pos.z + dz / l * 2.8; clampArena(f);
      parts.burst(f.elem, f.pos.x, 1.2, f.pos.z, 30, 6, 0.3); shock(f.pos.x, f.pos.z, 2.5, ec[1], 0.4);
      face(f); f.busy = 0.15;
    } else if (s.range === 'self') {
      f.busy = 0.3;
      if (s.type === 'heal') {
        const h = Math.round(f.maxHp * s.pct); f.hp = Math.min(f.maxHp, f.hp + h);
        floatText(f, '+' + h, '#7dff9a', 'big'); Sound.play('heal');
        for (let k = 0; k < 40; k++) { const a = k / 40 * 18; parts.emit({ x: f.pos.x + Math.cos(a) * 1.1, y: 0.2 + k * 0.05, z: f.pos.z + Math.sin(a) * 1.1, vy: rand(1.5, 3), color: pick2([0x7dff9a, 0xdfffe8]), life: rand(0.8, 1.3), size: 0.4, drag: 0.5 }); }
        shock(f.pos.x, f.pos.z, 2.2, 0x7dff9a, 0.7);
      } else if (s.type === 'support') {
        f.buffs[s.fx] = s.dur; Sound.play('buff');
        floatText(f, { atk: '攻撃UP', def: '防御UP', spd: '加速' }[s.fx], '#9fe7ff', 'sm');
        shock(f.pos.x, f.pos.z, 2.6, ec[1], 0.6);
        for (let k = 0; k < 30; k++) { const a = Math.random() * 6.28; parts.emit({ x: f.pos.x + Math.cos(a) * 1.2, y: 0.1, z: f.pos.z + Math.sin(a) * 1.2, vy: rand(2, 5), color: ec[(Math.random() * 3) | 0], life: rand(0.5, 1), size: 0.4, drag: 0.5 }); }
      }
    }
    return true;
  }
  const pick2 = a => a[(Math.random() * a.length) | 0];
  let zones = [];
  const dotHurt = (t, a, power, dmgType, elem, o) => {
    const hs = ctx.hitstop, sh = ctx.shake, fk = ctx.fovKick;
    const r = hurt(t, a, power, dmgType, elem, Object.assign({ kb: 0.12 }, o || {}));
    ctx.hitstop = hs; ctx.shake = Math.max(sh, 0.08); ctx.fovKick = fk; return r;
  };
  // 円形の範囲攻撃（予告 → 着弾）
  function strike(f, x, z, r, delay, power, dmgType, elem, o) {
    o = o || {};
    const ec = FX.ELEM_FX[elem];
    const l = Math.hypot(x, z); if (l > R - 1) { x *= (R - 1) / l; z *= (R - 1) / l; }
    telegraph(x, z, r, f.side === 'e' ? 0xff5a3a : ec[1], delay);
    if (o.sky) { const sp = FX.glowSprite(ec[1], 3, 1); sp.position.set(x, 22, z); scene.add(sp); addFx(delay, sp, (k, ob) => { ob.position.y = 1 + k * 21; ob.scale.setScalar(2 + (1 - k) * 4); }); }
    later(delay, () => {
      if (f.dead) return;
      blastFx(elem, x, z, r, false, true);
      const t = opp(f);
      if (Math.hypot(t.pos.x - x, t.pos.z - z) <= r + 0.5) { ctx.lastDmg = 0; hurt(t, f, power, dmgType, elem, { stun: o.stun, slow: o.slow, kb: o.kb || 1.6, weak: o.weak, burn: o.burn }); if (o.drain && ctx.lastDmg) healF(f, ctx.lastDmg * o.drain); }
    });
  }
  function addZone(z) {
    z.t = 0; z.acc = 0;
    const g = new THREE.Group(), col = FX.ELEM_FX[z.elem][1]; z.g = g;
    if (z.kind === 'pool' || z.kind === 'pull') {
      const rp = FX.runePlane(col, 0.55); rp.rotation.x = -Math.PI / 2; rp.scale.setScalar(z.r); rp.position.y = 0.08; g.add(rp);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(z.r, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.06; g.add(disc); z.rp = rp;
    } else if (z.kind === 'tornado') {
      const cn = new THREE.Mesh(new THREE.CylinderGeometry(z.r * 0.95, z.r * 0.3, 6, 18, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); cn.position.y = 3; g.add(cn); z.cn = cn;
      const rp = FX.runePlane(col, 0.4); rp.rotation.x = -Math.PI / 2; rp.scale.setScalar(z.r); rp.position.y = 0.08; g.add(rp);
    } else if (z.kind === 'beam') {
      const mk = (rd, op, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rd, rd, z.len, 10, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.z = z.len / 2 + 1; return m; };
      z.o1 = mk(z.width * 0.6, 0.45, col); z.o2 = mk(z.width * 0.25, 0.95, 0xffffff); g.add(z.o1); g.add(z.o2); g.position.y = 1.3;
    }
    g.position.x = z.x; g.position.z = z.z; if (z.kind !== 'beam') g.position.y = 0;
    scene.add(g); zones.push(z);
  }
  function updateZones(dt) {
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i], f = z.owner, t = opp(f); z.t += dt; z.acc += dt;
      let end = z.t >= z.dur || f.dead || ctx.over;
      const ec = FX.ELEM_FX[z.elem];
      if (z.kind === 'beam') {
        if (f.stun > 0) end = true;
        if (!end) {
          const want = Math.atan2(t.pos.x - f.pos.x, t.pos.z - f.pos.z), mx = z.turn * dt;
          f.yaw += Math.max(-mx, Math.min(mx, angDiff(want, f.yaw))); f.yawLock = clock + 0.15; f.busy = 0.2;
          z.g.position.set(f.pos.x, 1.3, f.pos.z); z.g.rotation.y = f.yaw;
          const fl = 0.7 + Math.sin(clock * 50) * 0.3; z.o1.material.opacity = 0.45 * fl; z.o2.material.opacity = 0.95 * fl;
          const tx = f.pos.x + Math.sin(f.yaw) * 14, tz = f.pos.z + Math.cos(f.yaw) * 14;
          for (let k = 0; k < 3; k++) parts.emit({ x: f.pos.x + Math.sin(f.yaw) * rand(1, 18), y: 1.3 + rand(-0.4, 0.4), z: f.pos.z + Math.cos(f.yaw) * rand(1, 18), vx: rand(-1, 1), vy: rand(-0.5, 1), vz: rand(-1, 1), color: pick2(ec), life: 0.3, size: 0.4, drag: 2 });
          if (z.acc >= 0.25 && z.t > 0.12) {
            z.acc = 0;
            const px = t.pos.x - f.pos.x, pz = t.pos.z - f.pos.z, along = px * Math.sin(f.yaw) + pz * Math.cos(f.yaw), perp = Math.abs(px * Math.cos(f.yaw) - pz * Math.sin(f.yaw));
            if (along > 0 && along < z.len && perp < z.width / 2 + 0.7) dotHurt(t, f, z.power, z.dmg, z.elem, { kb: 0.2 });
          }
        }
      } else if (z.kind === 'pull') {
        const dx = z.x - t.pos.x, dz = z.z - t.pos.z, l = Math.hypot(dx, dz);
        if (l > 1.4 && !t.dead) { t.pos.x += dx / l * 5.5 * dt; t.pos.z += dz / l * 5.5 * dt; clampArena(t); }
        z.rp.rotation.z = -z.t * 4; z.rp.scale.setScalar(z.r * (1.25 - 0.45 * z.t / z.dur));
        const a = rand(0, 6.28), rr = z.r * 1.6; parts.emit({ x: z.x + Math.cos(a) * rr, y: rand(0.2, 2), z: z.z + Math.sin(a) * rr, vx: -Math.cos(a) * rr * 2, vy: 0, vz: -Math.sin(a) * rr * 2, color: pick2(ec), life: 0.5, size: 0.4 });
        if (end && !f.dead && !ctx.over) strike(f, z.x, z.z, z.r + 0.6, 0.18, z.power, z.dmg, z.elem, { kb: 3 });
      } else if (z.kind === 'tornado') {
        const dx = t.pos.x - z.x, dz = t.pos.z - z.z, l = Math.hypot(dx, dz) || 1;
        z.x += dx / l * 2.3 * dt; z.z += dz / l * 2.3 * dt; z.g.position.set(z.x, 0, z.z); z.cn.rotation.y = z.t * 9; z.cn.scale.set(1 + Math.sin(z.t * 5) * 0.08, 1, 1 + Math.sin(z.t * 5) * 0.08);
        const a = z.t * 12 + rand(0, 6.28), h = rand(0, 6); parts.emit({ x: z.x + Math.cos(a) * z.r * (0.3 + h * 0.12), y: h, z: z.z + Math.sin(a) * z.r * (0.3 + h * 0.12), vx: 0, vy: 1, vz: 0, color: pick2(ec), life: 0.5, size: 0.5, drag: 1 });
        if (z.acc >= z.tick) { z.acc = 0; if (Math.hypot(t.pos.x - z.x, t.pos.z - z.z) <= z.r + 0.6) dotHurt(t, f, z.power, z.dmg, z.elem, { kb: 0.6 }); }
      } else if (z.kind === 'pool') {
        z.rp.rotation.z = z.t * 0.6;
        if (Math.random() < dt * 14) parts.emit({ x: z.x + rand(-z.r, z.r) * 0.8, y: 0.2, z: z.z + rand(-z.r, z.r) * 0.8, vy: rand(0.8, 2), color: pick2(ec), life: 0.8, size: 0.4 });
        const inside = Math.hypot(t.pos.x - z.x, t.pos.z - z.z) <= z.r + 0.4;
        if (inside) t.slow = Math.max(t.slow, 0.3);
        if (z.acc >= 0.5) { z.acc = 0; if (inside) dotHurt(t, f, z.power, z.dmg, z.elem, { kb: 0.05 }); }
      }
      if (end) { scene.remove(z.g); disposeObj(z.g); zones.splice(i, 1); }
    }
  }
  // 敵だけが使う技の動き
  function runPattern(f, s, o) {
    const t = opp(f), q = o.quick ? 0.55 : 1, pw = s.power * (o.boost || 1) * (f.powMul || 1), dmg = s.hybrid ? (f.stats.ATK >= f.stats.MAG ? 'physical' : 'magic') : (s.type === 'magic' ? 'magic' : 'physical'), ec = FX.ELEM_FX[s.elem];
    const slashAt = (reach, arc, power, kb, stun) => {
      if (f.dead || f.stun > 0) return false;
      clawSlash(f, reach + 0.5, arc, ec, 2);
      if (inCone(f, opp(f), reach, arc)) return hurt(opp(f), f, power, dmg, s.elem, { kb: kb || 1.4, stun });
      return false;
    };
    switch (s.pat) {
      case 'rush': {
        const n = s.n || 3, gap = 0.5 * q; f.busy = n * gap + 0.25; setAnim(f, 'dash', n * gap + 0.2);
        for (let k = 0; k < n; k++) later(k * gap, () => {
          if (f.dead || f.stun > 0 || f.dash) return;
          face(f); const dur = 0.17, dd = Math.min(s.dist || 4.5, dist(f, opp(f)) + 0.8);
          f.dash = { vx: Math.sin(f.yaw) * dd / dur, vz: Math.cos(f.yaw) * dd / dur, t: dur, skill: { power: s.power, elem: s.elem, stun: 0 }, hit: false, dmg, boost: o.boost || 1 };
          f.inv = Math.max(f.inv, dur + 0.03); Sound.play('dash');
        });
        break;
      }
      case 'leap': {
        const dur = 0.75 * q + 0.2; f.busy = dur + 0.5; setAnim(f, 'dash', dur); Sound.play('dash');
        telegraph(t.pos.x, t.pos.z, s.r, 0xff5a3a, dur);
        f.leap = { t: 0, dur, sx: f.pos.x, sz: f.pos.z, tx: t.pos.x, tz: t.pos.z, r: s.r, power: pw, dmg, elem: s.elem };
        break;
      }
      case 'combo': {
        f.busy = 0.12 + 3 * 0.28 + 0.2; setAnim(f, 'slash', 0.9);
        for (let k = 0; k < 3; k++) later(0.12 + k * 0.28 * q, () => { if (f.dead || f.stun > 0) return; face(f); Sound.play('swing'); slashAt(s.reach, s.arc, pw * (k === 2 ? 1.5 : 1), k === 2 ? 2 : 0.8, 0); });
        break;
      }
      case 'drain': {
        f.busy = 0.5; setAnim(f, 'slash', 0.5); Sound.play('swing');
        later(0.2 * q, () => {
          if (f.dead || f.stun > 0) return; ctx.lastDmg = 0;
          if (slashAt(s.reach, s.arc, pw, 1.2, 0) && ctx.lastDmg) { const h = Math.round(ctx.lastDmg * 0.6); f.hp = Math.min(f.maxHp, f.hp + h); floatText(f, '+' + h, '#7dff9a', 'sm'); for (let k = 0; k < 14; k++) parts.emit({ x: opp(f).pos.x, y: 1.4, z: opp(f).pos.z, vx: (f.pos.x - opp(f).pos.x) * 1.5, vy: rand(0, 2), vz: (f.pos.z - opp(f).pos.z) * 1.5, color: 0x7dff9a, life: 0.6, size: 0.35 }); }
        });
        break;
      }
      case 'wave': {
        f.busy = 0.5; setAnim(f, 'pound', 0.5); Sound.play('quake'); parts.ringBurst('earth', f.pos.x, f.pos.z, 2, 14);
        later(0.15 * q, () => { if (f.dead) return; spawnProj(f, { power: pw, dmg, elem: s.elem, speed: s.speed || 9, size: s.size || 2.2, pierce: true, shape: 'crescent' }); });
        break;
      }
      case 'cross': {
        f.busy = 0.6; setAnim(f, 'pound', 0.6); Sound.play('quake'); ctx.shake = Math.max(ctx.shake, 0.25);
        later(0.2 * q, () => { if (f.dead) return; for (let k = 0; k < 4; k++) spawnProj(f, { power: pw, dmg, elem: s.elem, speed: 15, size: 1.2, pierce: true, shape: 'crescent', ang: k * Math.PI / 2 }); });
        break;
      }
      case 'barrage': {
        const n = s.n || 6; f.busy = 0.15 + n * 0.14 + 0.2; setAnim(f, f.type === 'archer' ? 'shoot' : 'cast', f.busy);
        for (let k = 0; k < n; k++) later(0.15 + k * 0.14 * q, () => { if (f.dead || f.stun > 0) return; face(f); Sound.play('shot'); spawnProj(f, { power: pw, dmg, elem: s.elem, speed: 18, size: 0.34, ang: rand(-0.09, 0.09) }); });
        break;
      }
      case 'homing': case 'curse': {
        f.busy = 0.5; setAnim(f, 'cast', 0.5); Sound.play('magic');
        later(0.2 * q, () => { if (f.dead) return; face(f); spawnProj(f, { power: pw, dmg, elem: s.elem, speed: s.speed || 8, size: 0.55, homing: s.turn || (s.pat === 'curse' ? 1.3 : 2), life: 4.2, weak: s.pat === 'curse' ? 7 : 0, slow: s.pat === 'curse' ? 2 : 0 }); });
        break;
      }
      case 'chain': {
        const n = s.n || 5; f.busy = 0.6; setAnim(f, 'cast', 0.6); Sound.play('fire');
        for (let k = 0; k < n; k++) strike(f, f.pos.x + Math.sin(f.yaw) * (2.8 + k * 2.8), f.pos.z + Math.cos(f.yaw) * (2.8 + k * 2.8), s.r || 2.1, Math.max(0.3, 0.5 * q) + k * 0.16, pw, dmg, s.elem, {});
        break;
      }
      case 'scatter': {
        const n = s.n || 5, spread = s.spread || 5, stag = s.stagger || 0.2, dl = Math.max(0.35, (s.delay || 0.8) * (o.quick ? 0.8 : 1)), cx = t.pos.x, cz = t.pos.z;
        f.busy = 0.6; setAnim(f, 'cast', 0.6); Sound.play('magic');
        for (let k = 0; k < n; k++) {
          let x, z;
          if (s.ring) { const a = k / n * 6.283; x = cx + Math.cos(a) * spread; z = cz + Math.sin(a) * spread; }
          else if (k === 0) { x = cx; z = cz; }
          else { const a = rand(0, 6.283), rr = Math.sqrt(Math.random()) * spread; x = cx + Math.cos(a) * rr; z = cz + Math.sin(a) * rr; }
          later(k * stag, () => { if (!f.dead) strike(f, x, z, s.r || 2.4, dl, pw, dmg, s.elem, { sky: s.sky, stun: s.stun, kb: 1.6 }); });
        }
        if (s.ring) later(n * stag + 0.15, () => { if (!f.dead) strike(f, opp(f).pos.x, opp(f).pos.z, (s.r || 2.4) + 0.5, dl, pw, dmg, s.elem, { sky: true, kb: 2 }); });
        break;
      }
      case 'bolts': {
        const n = s.n || 5; f.busy = 0.6; setAnim(f, 'cast', 0.6); Sound.play('thunder');
        for (let k = 0; k < n; k++) later(k * 0.5 * q, () => { if (!f.dead) strike(f, opp(f).pos.x, opp(f).pos.z, s.r || 1.9, 0.55, pw, dmg, s.elem, { sky: true }); });
        break;
      }
      case 'pool': {
        f.busy = 0.5; setAnim(f, 'cast', 0.5); Sound.play('magic');
        const x = t.pos.x, z = t.pos.z; telegraph(x, z, s.r, 0xb06aff, 0.8);
        later(0.8 * q, () => { if (!f.dead) addZone({ kind: 'pool', owner: f, x, z, r: s.r, dur: s.dur || 6, power: pw, dmg, elem: s.elem }); });
        break;
      }
      case 'pull': {
        f.busy = (s.dur || 1.2) + 0.5; setAnim(f, 'cast', s.dur || 1.2); Sound.play('tele');
        addZone({ kind: 'pull', owner: f, x: f.pos.x, z: f.pos.z, r: s.r, dur: s.dur || 1.2, power: pw, dmg, elem: s.elem });
        break;
      }
      case 'beam': {
        const dur = s.dur || 1.6; f.busy = dur + 0.2; setAnim(f, 'cast', dur); Sound.play('thunder');
        addZone({ kind: 'beam', owner: f, x: f.pos.x, z: f.pos.z, dur, len: s.len || 22, width: s.width || 1.5, turn: s.turn || 0.9, power: pw, dmg, elem: s.elem });
        break;
      }
      case 'tornado': {
        f.busy = 0.5; setAnim(f, 'cast', 0.5); Sound.play('thunder');
        addZone({ kind: 'tornado', owner: f, x: f.pos.x + Math.sin(f.yaw) * 2.5, z: f.pos.z + Math.cos(f.yaw) * 2.5, r: s.r || 2.2, dur: s.dur || 4.5, tick: 0.4, power: pw, dmg, elem: s.elem });
        break;
      }
      case 'spin': {
        const dur = (s.dur || 1.5); f.busy = dur + 0.35; setAnim(f, 'spin', dur); Sound.play('swing');
        f.spin = { t: 0, acc: 0.2, dur, r: s.r || 3.4, power: pw, dmg };
        break;
      }
      case 'enrage': {
        f.busy = 0.6; setAnim(f, 'buff', 0.6); f.buffs.atk = 9; f.buffs.spd = 9; f.buffs.ultAura = 1.2;
        floatText(f, '怒り！', '#ff6a4a', 'big'); shock(f.pos.x, f.pos.z, 4, 0xff5a3a, 0.6); ctx.shake = Math.max(ctx.shake, 0.2); Sound.play('quake');
        break;
      }
      case 'shield': {
        f.busy = 0.5; setAnim(f, 'buff', 0.5); f.shield = f.maxHp * 0.07; f.shieldT = 9; floatText(f, '殻をまとった', '#9fe7ff', 'sm'); shock(f.pos.x, f.pos.z, 3, 0x9fe7ff, 0.6); Sound.play('buff');
        break;
      }
      case 'tele_strike': {
        f.busy = 0.3 * q + 0.6; setAnim(f, 'slash', 0.3 * q + 0.5); Sound.play('tele');
        parts.burst(f.elem, f.pos.x, 1.2, f.pos.z, 24, 6, 0.3);
        const dx = t.pos.x - f.pos.x, dz = t.pos.z - f.pos.z, l = Math.hypot(dx, dz) || 1;
        f.pos.x = t.pos.x + dx / l * 2.4; f.pos.z = t.pos.z + dz / l * 2.4; clampArena(f); face(f);
        parts.burst(f.elem, f.pos.x, 1.2, f.pos.z, 24, 6, 0.3); shock(f.pos.x, f.pos.z, 2.2, ec[1], 0.4);
        later(0.3 * q, () => { Sound.play('crit'); slashAt(s.reach, s.arc, pw, 2.2, 0.4); });
        break;
      }
      case 'flurry': {
        const n = s.n || 3; f.busy = n * 0.5 + 0.2; setAnim(f, 'slash', n * 0.5);
        for (let k = 0; k < n; k++) later(k * 0.5 * q, () => {
          if (f.dead || f.stun > 0) return; const tt = opp(f), a = rand(0, 6.283);
          parts.burst(f.elem, f.pos.x, 1.2, f.pos.z, 16, 5, 0.3);
          f.pos.x = tt.pos.x + Math.cos(a) * 2.6; f.pos.z = tt.pos.z + Math.sin(a) * 2.6; clampArena(f); face(f); Sound.play('tele'); shock(f.pos.x, f.pos.z, 2, ec[1], 0.3);
          later(0.16 * q, () => { Sound.play('swing'); slashAt(s.reach, s.arc, pw, 1.6, 0.25); });
        });
        break;
      }
      case 'decoy': {
        const n = s.n || 3; f.busy = 0.6; setAnim(f, 'cast', 0.6); Sound.play('magic');
        for (let k = 0; k < n; k++) {
          const a = k / n * 6.283 + rand(0, 1), gx = f.pos.x + Math.cos(a) * 3.2, gz = f.pos.z + Math.sin(a) * 3.2;
          const gh = new THREE.Group(); const sp = FX.glowSprite(ec[1], 3.6, 0.8); sp.position.y = 1.3; gh.add(sp);
          const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: ec[1], transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); cl.position.y = 1.1; gh.add(cl);
          gh.position.set(gx, 0, gz); addFx(1.3 * q + 0.1, gh, (kk, ob) => { ob.rotation.y += 0.2; cl.material.opacity = 0.3 + Math.sin(clock * 30) * 0.2; });
          strike(f, gx, gz, s.r || 2.4, 1.2 * q + 0.1, pw, dmg, s.elem, { kb: 1.8 });
        }
        break;
      }
      case 'elemshot': {
        const fx = elemEffects(s.elem); castRune(f, ec[1], false, true); f.busy = 0.45; setAnim(f, 'cast', 0.45); Sound.play('magic');
        later(0.18 * q, () => { if (f.dead) return; face(f); spawnProj(f, { power: pw * (s.elem === 'none' ? 1.12 : 1), dmg, elem: s.elem, speed: 21, size: 0.5, shape: 'spear', pierce: fx.pierce, slow: fx.slow, stun: fx.stun, weak: fx.weak, burn: fx.burn, drain: fx.drain }); });
        break;
      }
      case 'elemburst': {
        const fx = elemEffects(s.elem); castRune(f, ec[1], false, false); f.busy = 0.6; setAnim(f, 'pound', 0.6);
        strike(f, f.pos.x, f.pos.z, s.r || 4.4, 0.3, pw * (s.elem === 'none' ? 1.12 : 1), dmg, s.elem, { slow: fx.slow, stun: fx.stun, weak: fx.weak, burn: fx.burn, drain: fx.drain, kb: 2.2 });
        break;
      }
      case 'elemguard': {
        castRune(f, ec[1], false, false); f.busy = 0.4; setAnim(f, 'buff', 0.4); shock(f.pos.x, f.pos.z, 3, ec[1], 0.6); Sound.play('buff');
        const say = (txt) => floatText(f, txt, '#' + new THREE.Color(ec[1]).getHexString(), 'sm');
        if (s.elem === 'fire') { f.buffs.atk = 8; say('攻撃UP'); }
        else if (s.elem === 'water') { healF(f, f.maxHp * 0.25); }
        else if (s.elem === 'earth') { f.shield = f.maxHp * 0.1; f.shieldT = 8; say('岩の殻'); }
        else if (s.elem === 'wind') { f.buffs.spd = 8; f.inv = Math.max(f.inv, 0.5); say('加速'); }
        else if (s.elem === 'light') { healF(f, f.maxHp * 0.15); f.shield = f.maxHp * 0.05; f.shieldT = 8; }
        else if (s.elem === 'dark') { f.buffs.drain = 8; say('吸血'); }
        else { f.buffs.def = 6; say('防御UP'); }
        break;
      }
      default: break;
    }
    return true;
  }
  function elemEffects(elem) { return ({ fire: { burn: true }, water: { slow: 2.5 }, earth: { stun: 0.45 }, wind: { pierce: true }, light: { drain: 0.35 }, dark: { weak: 6 } })[elem] || {}; }
  function healF(f, amount) {
    const h = Math.round(amount); if (h <= 0 || f.dead) return;
    f.hp = Math.min(f.maxHp, f.hp + h); floatText(f, '+' + h, '#7dff9a', 'big'); Sound.play('heal');
    for (let k = 0; k < 24; k++) { const a = k / 24 * 12; parts.emit({ x: f.pos.x + Math.cos(a) * 1.0, y: 0.2 + k * 0.07, z: f.pos.z + Math.sin(a) * 1.0, vy: rand(1.5, 3), color: pick2([0x7dff9a, 0xdfffe8]), life: rand(0.7, 1.1), size: 0.4, drag: 0.5 }); }
  }
  // 強い技は、前ぶり（後ずさり・しっぽを上げる・吠える）のあとに、すばやく放つ
  const STRONG_POWER = 85;
  const isStrong = s => s && !s.self && (s.big || ((s.type === 'physical' || s.type === 'magic' || s.type === 'move') && s.power >= STRONG_POWER));
  function aiPatOk(f, s, d) {
    if (s.pat === 'enrage') return !(f.buffs.atk > 0) && d < 12;
    if (s.pat === 'shield') return !(f.shield > 0) && f.hp < f.maxHp * 0.92;
    const r = s.rng || [0, 14];
    return d >= r[0] && d <= r[1];
  }
  const PAT_LANE = { beam: 'line', wave: 'line', barrage: 'line', homing: 'line', curse: 'line', rush: 'dash', tele_strike: 'dash', flurry: 'dash', leap: 'dash', spin: 'circle', drain: 'melee', combo: 'melee' };
  function laneWarn(f, s0, dur) {
    const col = 0xff4a3a;
    const rg = s0.pat ? PAT_LANE[s0.pat] : s0.range;
    const s = Object.assign({}, s0, { range: rg, dist: s0.dist || 6, size: s0.pat === 'wave' ? 2.2 : s0.size });
    const mkFlat = (geo, ox, oz) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; return m; };
    const g = new THREE.Group(); g.position.set(f.pos.x, 0.09, f.pos.z); g.rotation.y = f.yaw;
    if (s.range === 'line' || s.range === 'dash') {
      const len = s.range === 'dash' ? s.dist + 2 : 18, wid = s.range === 'dash' ? 2.2 : (s.size && s.size > 1 ? 2.6 : 1.6);
      const m = mkFlat(new THREE.PlaneGeometry(wid, len)); m.position.z = len / 2 + 0.8; g.add(m);
      const fill = mkFlat(new THREE.PlaneGeometry(wid, len)); fill.position.z = len / 2 + 0.8; fill.material.opacity = 0.35; g.add(fill);
      addFx(dur + 0.1, g, (k) => {
        g.position.set(f.pos.x, 0.09, f.pos.z); g.rotation.y = f.yaw;
        const t = Math.min(1, 1 - k), lk = f.windup && f.windup.locked; fill.scale.set(1, Math.max(0.01, t), 1); fill.position.z = 0.8 + len * t / 2;
        m.material.opacity = lk ? 0.5 : 0.18 + Math.sin(clock * 28) * 0.08; fill.material.opacity = lk ? 0.75 : 0.35;
      });
    } else if (s.range === 'melee') {
      const arc = s.arc * Math.PI / 180, m = new THREE.Mesh(new THREE.CircleGeometry(s.reach + 0.6, 28, -Math.PI / 2 - arc / 2, arc), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; g.add(m);
      addFx(dur + 0.1, g, () => { g.position.set(f.pos.x, 0.09, f.pos.z); g.rotation.y = f.yaw; m.material.opacity = f.windup && f.windup.locked ? 0.55 : 0.2 + Math.sin(clock * 28) * 0.1; });
    } else if (s.range === 'circle' && s.at !== 'target') {
      telegraph(f.pos.x, f.pos.z, s.r, col, dur + 0.3);
    }
  }
  function startWindup(f, i) {
    if (f.windup || f.busy > 0 || f.stun > 0 || f.dash || ctx.start > 0 || f.dead) return false;
    const s = f.skills[i].def;
    const kind = pick2(['retreat', 'roar', 'tail']);
    const dur = Math.max(0.7, 1.2 - 0.45 * f.lvl);
    f.windup = { i, kind, t: 0, dur, roared: false };
    f.busy = dur + 0.15; f.aiAtk = false;
    setAnim(f, kind === 'retreat' ? 'retreat' : 'threat', dur);
    floatText(f, s.name + '！', '#ff5a4a', 'big'); Sound.play('warn');
    laneWarn(f, s, dur);
    return true;
  }
  function updateWindup(f, dt) {
    const w = f.windup, o = opp(f), ec = FX.ELEM_FX[f.elem];
    w.t += dt;
    if (f.stun > 0 || f.dead) {
      if (!f.dead) { f.skills[w.i].cd = 2.5; floatText(f, '中断！', '#ffe27a', 'sm'); }
      f.windup = null; f.yawLock = 0; return;
    }
    const k = Math.min(1, w.t / w.dur);
    if (!(f.yawLock > clock)) face(f);
    if (!w.locked && w.t >= w.dur - 0.2) { w.locked = true; f.yawLock = clock + 0.55; Sound.play('ready'); }
    f.buffs.ultAura = 0.25;
    if (w.kind === 'retreat') {          // ゆっくり後ろへ下がる
      const dx = f.pos.x - o.pos.x, dz = f.pos.z - o.pos.z, l = Math.hypot(dx, dz) || 1;
      f.pos.x += dx / l * 2.2 * dt; f.pos.z += dz / l * 2.2 * dt; f.moving = true;
    }
    // 力をためる粒
    if (Math.random() < dt * (30 + 90 * k)) {
      const a = Math.random() * 6.28, r = 2.6 - 1.4 * k;
      parts.emit({ x: f.pos.x + Math.cos(a) * r, y: rand(0.3, 2.2), z: f.pos.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vy: rand(0, 1.5), vz: -Math.sin(a) * r * 3, color: Math.random() < 0.4 ? 0xff5a3a : ec[1], life: 0.45, size: 0.35, drag: 1 });
    }
    if (w.kind === 'roar' && !w.roared && k > 0.5) {   // 吠える（衝撃波と画面の揺れ）
      w.roared = true; shock(f.pos.x, f.pos.z, 4.5, 0xff7a5a, 0.6); ctx.shake = Math.max(ctx.shake, 0.22); Sound.play('quake');
      for (let n = 0; n < 24; n++) { const a = n / 24 * 6.28; parts.emit({ x: f.pos.x, y: 1.4, z: f.pos.z, vx: Math.cos(a) * 7, vy: rand(0, 1), vz: Math.sin(a) * 7, color: 0xffd0b0, life: 0.4, size: 0.4, drag: 2 }); }
    }
    if (w.kind === 'tail' && !w.glowed && k > 0.35) { w.glowed = true; glow(f.pos.x, 1.4, f.pos.z, ec[1], 5, 0.5); Sound.play('buff'); }
    if (w.t >= w.dur) {                  // ここから、すばやく強い一撃
      const i = w.i; f.windup = null; f.busy = 0; f.stun = 0; f.skills[i].cd = 0;
      useSkill(f, i, false, { quick: true, boost: 1.3, force: true });
    }
  }
  function cutIn(f, s) {
    Sound.play('ult');
    const el = $('bt-cut');
    $('bt-cut-n').textContent = f.name;
    $('bt-cut-s').textContent = s.name;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    ctx.slow = 0.12; ctx.slowT = 0.75; ctx.fovKick = -10;
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28; parts.emit({ x: f.pos.x + Math.cos(a) * 2, y: rand(0, 2.5), z: f.pos.z + Math.sin(a) * 2, vx: -Math.cos(a) * 3, vy: rand(1, 3), vz: -Math.sin(a) * 3, color: FX.ELEM_FX[s.elem][(Math.random() * 3) | 0], life: 0.7, size: 0.5, drag: 1 }); }
    f.buffs.ultAura = 1.5;
    runeCircle(f.pos.x, 0.12, f.pos.z, 6, FX.ELEM_FX[s.elem][1], 1.1, { spin: 1 });
    runeCircle(f.pos.x - Math.sin(f.yaw) * 2.2, 2.2, f.pos.z - Math.cos(f.yaw) * 2.2, 3.4, FX.ELEM_FX[s.elem][2], 1.0, { vertical: true, yaw: f.yaw, spin: 1.5 });
  }
  function tryStep(f, dirIn) {
    if (f.dead || ctx.start > 0 || f.stepCd > 0 || f.stun > 0 || f.dash || f.busy > 0.2) return false;
    const o = opp(f);
    const fx = Math.sin(f.yaw), fz = Math.cos(f.yaw), rx = -fz, rz = fx;
    const a = dirIn || f.in;
    let x = fx * a.fwd + rx * a.right, z = fz * a.fwd + rz * a.right;
    let l = Math.hypot(x, z);
    if (l < 0.1) { x = -fx; z = -fz; l = 1; }
    const D = 4 + f.stats.SPD * 0.004;
    f.stepV = { x: x / l * D / 0.18, z: z / l * D / 0.18 };
    f.stepT = 0.18; f.inv = Math.max(f.inv, 0.28); f.stepCd = 0.7; f.busy = 0; f.charge = 0;
    dust(f, 10); shock(f.pos.x, f.pos.z, 1.6, 0xffffff, 0.3);
    Sound.play('step');
    if (o.busy > 0 && dist(f, o) < 5 && f.side === 'p') { ctx.slow = 0.45; ctx.slowT = 0.5; floatText(f, 'JUST!', '#ffe27a', 'big'); Sound.play('great'); f.gauge = Math.min(100, f.gauge + 12); }
    return true;
  }
  function clampArena(f) {
    const l = Math.hypot(f.pos.x, f.pos.z);
    if (l > R - 0.7) { f.pos.x *= (R - 0.7) / l; f.pos.z *= (R - 0.7) / l; }
  }

  // ---------- AI ----------
  function aiThink(f) {
    const o = opp(f), d = dist(f, o), lvl = f.lvl, style = f.ai;
    f.aiT = 0.5 - 0.3 * lvl + rand(0, 0.15);
    if (f.windup) { f.in = { fwd: 0, right: 0 }; f.aiT = 0.2; return; }
    const melee = !f.ranged;
    let pref = melee ? 2.1 : 8.5;
    if (style === 'careful' && melee) pref = 3.4;
    let fwd = 0, right = 0;
    if (Math.random() < 0.25) f.strafe *= -1;
    if (style === 'rush') { fwd = d > pref ? 1 : d < pref - 1 ? -0.4 : 0; right = f.strafe * 0.35; }
    else if (style === 'careful') { fwd = d < pref - 1.5 ? -1 : d > pref + 1.5 ? 0.7 : 0; right = f.strafe * 0.7; }
    else { fwd = d > pref + 1 ? 0.5 : 0; right = f.strafe * 0.3; }
    f.in = { fwd, right };
    const threat = (o.busy > 0 && d < (o.atkT.kind === 'melee' ? 4.5 : 14)) || projs.some(p => p.owner === o && Math.hypot(p.pos.x - f.pos.x, p.pos.z - f.pos.z) < 5);
    if (threat) {
      const guardP = style === 'counter' ? 0.65 : 0.25;
      if (Math.random() < guardP * (0.5 + lvl)) f.aiGuardT = 0.7;
      else if (Math.random() < 0.1 + 0.4 * lvl) tryStep(f, { fwd: 0, right: f.strafe });
    }
    if (f.aiGuardT <= 0 && style === 'counter' && Math.random() < 0.12) f.aiGuardT = 0.5;
    const reach = melee ? (f.atkT.range || 2.6) + 0.4 : 15;
    if (d < reach && Math.random() < 0.3 + 0.3 * lvl) f.aiAtk = true;
    f.skills.forEach((sk, i) => {
      if (!sk || sk.cd > 0 || f.windup || f.busy > 0 || f.gcd > 0) return;
      const s = sk.def, strong = isStrong(s);
      if (Math.random() > (strong ? 0.42 + 0.3 * lvl : 0.15 + 0.2 * lvl)) return;
      let ok = false;
      if (s.pat) ok = aiPatOk(f, s, d);
      else if (s.range === 'line') ok = d > 2.5 && d < 14;
      else if (s.range === 'circle') ok = s.at === 'target' ? d < 12 : d < s.r + 1;
      else if (s.range === 'melee') ok = d < s.reach + 0.3;
      else if (s.range === 'dash') ok = d > 2.5 && d < s.dist + 1;
      if (ok) { if (strong) startWindup(f, i); else useSkill(f, i); }
    });
  }

  // ---------- 更新 ----------
  function updateFighter(f, dt) {
    const o = opp(f);
    for (const k of ['atk', 'def', 'spd', 'ultAura', 'weak', 'drain']) if (f.buffs[k] > 0) f.buffs[k] -= dt;
    if (f.burnT > 0 && !f.dead) {
      f.burnT -= dt; f.burnAcc += dt;
      if (Math.random() < dt * 14) parts.emit({ x: f.pos.x + rand(-0.4, 0.4), y: rand(0.4, 2), z: f.pos.z + rand(-0.4, 0.4), vy: rand(1, 2.5), color: pick2([0xff4a1a, 0xff9a2a]), life: 0.5, size: 0.4, drag: 1 });
      if (f.burnAcc >= 0.5) { f.burnAcc -= 0.5; if (f.burnBy) dotHurt(f, f.burnBy, f.burnPow, 'magic', 'fire', { kb: 0 }); }
    }
    if (f.shieldT > 0) { f.shieldT -= dt; if (f.shieldT <= 0) f.shield = 0; }
    f.gcd = Math.max(0, f.gcd - dt);
    f.busy = Math.max(0, f.busy - dt); f.atkCd = Math.max(0, f.atkCd - dt); f.stun = Math.max(0, f.stun - dt);
    f.inv = Math.max(0, f.inv - dt); f.stepCd = Math.max(0, f.stepCd - dt); f.slow = Math.max(0, f.slow - dt);
    f.flash = Math.max(0, f.flash - dt); f.comboT = Math.max(0, f.comboT - dt);
    f.guardBroke = Math.max(0, f.guardBroke - dt);
    if (f.anim) { f.anim.t += dt; if (f.anim.t >= f.anim.dur) f.anim = null; }
    f.skills.forEach(s => { if (s && s.cd > 0) s.cd -= dt; });
    f.pos.x += f.kb.x * dt; f.pos.z += f.kb.z * dt; f.kb.multiplyScalar(Math.pow(0.002, dt));
    if (f.windup) updateWindup(f, dt);
    if (f.dead) return;
    f.guard = f.wantGuard && f.stun <= 0 && f.busy <= 0 && f.stepT <= 0 && f.guardBroke <= 0;
    if (!f.guard && f.guardBroke <= 0) f.guardHp = Math.min(60 + f.stats.DEF * 0.15, f.guardHp + dt * 8);
    f.moving = !!(f.windup && f.windup.kind === 'retreat');
    if (f.stepT > 0) {
      f.stepT -= dt; f.pos.x += f.stepV.x * dt; f.pos.z += f.stepV.z * dt; f.moving = true;
      if (Math.random() < 0.8) parts.emit({ x: f.pos.x, y: 0.2, z: f.pos.z, vx: rand(-0.5, 0.5), vy: 0.3, vz: rand(-0.5, 0.5), color: 0xcfd6e8, life: 0.3, size: 0.6, drag: 2 });
    } else if (f.leap) {
      const L = f.leap; L.t += dt; const k = Math.min(1, L.t / L.dur);
      f.pos.x = L.sx + (L.tx - L.sx) * k; f.pos.z = L.sz + (L.tz - L.sz) * k; f.hop = Math.sin(k * Math.PI) * 3.4; f.inv = Math.max(f.inv, 0.05); f.moving = true;
      if (k >= 1) {
        f.hop = 0; f.leap = null; blastFx(L.elem, L.tx, L.tz, L.r, false);
        runeCircle(L.tx, 0.12, L.tz, L.r * 1.1, FX.ELEM_FX[L.elem][1], 0.6, { spin: 2, expand: true });
        const t2 = opp(f); if (Math.hypot(t2.pos.x - L.tx, t2.pos.z - L.tz) <= L.r + 0.5) hurt(t2, f, L.power, L.dmg, L.elem, { kb: 2.4 });
      }
    } else if (f.spin) {
      const S2 = f.spin; S2.t += dt; S2.acc += dt; f.yawLock = clock + 0.2; f.yaw += dt * 15; f.moving = true;
      const dx = o.pos.x - f.pos.x, dz = o.pos.z - f.pos.z, l = Math.hypot(dx, dz) || 1;
      if (l > 1.6) { f.pos.x += dx / l * 4.2 * dt; f.pos.z += dz / l * 4.2 * dt; }
      if (S2.acc >= 0.32) { S2.acc = 0; slashArc(f, S2.r + 0.3, 340, FX.ELEM_FX[f.elem][1], true, 0); if (Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) <= S2.r + 0.6) hurt(o, f, S2.power, S2.dmg, f.elem, { kb: 1.4 }); }
      if (S2.t >= S2.dur) { f.spin = null; f.yawLock = 0; f.busy = 0.35; }
    } else if (f.dash) {
      const d = f.dash; d.t -= dt;
      f.pos.x += d.vx * dt; f.pos.z += d.vz * dt; f.moving = true;
      const c = FX.ELEM_FX[d.skill.elem];
      for (let i = 0; i < 3; i++) parts.emit({ x: f.pos.x + rand(-0.3, 0.3), y: rand(0.3, 1.8), z: f.pos.z + rand(-0.3, 0.3), vx: -d.vx * 0.05, vz: -d.vz * 0.05, color: c[(Math.random() * 3) | 0], life: 0.35, size: 0.6, drag: 3 });
      if (!d.hit && dist(f, o) < 1.7) {
        d.hit = true; slashArc(f, 3, 120, c[1], true);
        hurt(o, f, d.skill.power * (d.boost || 1), d.dmg, d.skill.elem, { stun: d.skill.stun, kb: 1.5 });
      }
      if (d.t <= 0) {
        if (d.skill.then === 'shot') { face(f); spawnProj(f, { power: d.skill.power, dmg: d.dmg, elem: d.skill.elem, speed: 28, size: 0.35, shape: 'feather' }); Sound.play('shot'); }
        f.dash = null;
      }
    } else if (f.stun <= 0 && ctx.start <= 0) {
      if (f.busy <= 0) {
        const fx = Math.sin(f.yaw), fz = Math.cos(f.yaw), rx = -fz, rz = fx;
        let mx = fx * f.in.fwd + rx * f.in.right, mz = fz * f.in.fwd + rz * f.in.right;
        const l = Math.hypot(mx, mz);
        if (l > 0.05) {
          if (l > 1) { mx /= l; mz /= l; }
          const sp = speedOf(f) * (f.guard ? 0.5 : 1);
          f.pos.x += mx * sp * dt; f.pos.z += mz * sp * dt; f.moving = true;
          if (Math.random() < dt * 8) dust(f, 1);
        }
      }
    }
    const dd = dist(f, o);
    if (dd < 1.3 && !f.dash && !f.leap && dd > 0.001) {
      const push = (1.3 - dd) * 0.5;
      f.pos.x += (f.pos.x - o.pos.x) / dd * push; f.pos.z += (f.pos.z - o.pos.z) / dd * push;
    }
    clampArena(f);
    if (!f.dash && f.stepT <= 0 && !(f.yawLock > clock)) face(f);
    // バフのオーラ粒
    if ((f.buffs.atk > 0 || f.buffs.spd > 0 || f.buffs.ultAura > 0) && Math.random() < dt * 30) {
      const c = f.buffs.atk > 0 ? 0xff7a4a : f.buffs.spd > 0 ? 0x8affb0 : FX.ELEM_FX[f.elem][1];
      parts.emit({ x: f.pos.x + rand(-0.6, 0.6), y: 0.1, z: f.pos.z + rand(-0.6, 0.6), vy: rand(1.5, 3.5), color: c, life: 0.7, size: 0.35, drag: 0.5 });
    }
    // 溜め中の粒
    if (f.charge > 0.05 && Math.random() < dt * 40 * f.charge) {
      const a = Math.random() * 6.28;
      parts.emit({ x: f.pos.x + Math.cos(a) * 1.5, y: rand(0.5, 1.8), z: f.pos.z + Math.sin(a) * 1.5, vx: -Math.cos(a) * 3, vz: -Math.sin(a) * 3, color: FX.ELEM_FX[f.elem][1], life: 0.5, size: 0.3 });
    }
  }
  function playerInput(f, dt) {
    let vx = 0, vy = 0;
    if (keys.ArrowUp) vy += 1;
    if (keys.ArrowDown) vy -= 1;
    if (keys.ArrowRight) vx += 1;
    if (keys.ArrowLeft) vx -= 1;
    vx += stick.x; vy += stick.y;
    const l = Math.hypot(vx, vy);
    if (l > 1) { vx /= l; vy /= l; }
    f.in = { fwd: vy, right: vx };
    f.wantGuard = !!keys.ShiftLeft;
    if (edge.Space) tryStep(f);
    ['KeyS', 'KeyD', 'KeyW', 'KeyE'].forEach((c, i) => { if (edge[c]) useSkill(f, i, false); });
    if (edge.KeyQ) useSkill(f, 0, true);
    const held = !!keys.KeyA;
    if (f.atkT.charge) {
      if (held && f.busy <= 0 && f.stun <= 0 && !f.dash) f.charge = Math.min(1, f.charge + dt / 0.8);
      else if (!held && f.charge > 0) { doNormal(f, f.charge); f.charge = 0; }
      else if (!held) f.charge = 0;
      if (held && f.charge === 0) f.charge = 0.001;
    } else if (held) doNormal(f, 0);
  }
  function aiUpdate(f, dt) {
    f.aiT -= dt; f.aiGuardT = Math.max(0, f.aiGuardT - dt);
    if (f.aiT <= 0 && ctx.start <= 0) aiThink(f);
    f.wantGuard = f.aiGuardT > 0;
    if (f.aiAtk) { if (doNormal(f, f.atkT.charge ? rand(0.3, 1) : 0)) f.aiAtk = false; else if (f.stun > 0) f.aiAtk = false; }
  }
  function updateProjs(dt) {
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      if (p.homing && !opp(p.owner).dead) {
        const tt = opp(p.owner), want = Math.atan2(tt.pos.x - p.pos.x, tt.pos.z - p.pos.z), cur = Math.atan2(p.vel.x, p.vel.z), df = angDiff(want, cur), mx = p.homing * dt, na = cur + Math.max(-mx, Math.min(mx, df));
        p.vel.set(Math.sin(na) * p.speed, 0, Math.cos(na) * p.speed);
      }
      p.pos.addScaledVector(p.vel, dt); p.mesh.position.copy(p.pos); p.life -= dt;
      const c = FX.ELEM_FX[p.elem];
      for (let k = 0; k < 2; k++) parts.emit({ x: p.pos.x + rand(-0.15, 0.15), y: p.pos.y + rand(-0.15, 0.15), z: p.pos.z + rand(-0.15, 0.15), vx: -p.vel.x * 0.04 + rand(-0.5, 0.5), vy: rand(-0.3, 0.8), vz: -p.vel.z * 0.04 + rand(-0.5, 0.5), color: c[(Math.random() * 3) | 0], life: rand(0.25, 0.45), size: p.size * rand(0.7, 1.3), drag: 2, grow: -0.5 });
      if (p.size > 1) p.mesh.rotation.x += dt * 6;
      const t = opp(p.owner);
      let remove = p.life <= 0 || Math.hypot(p.pos.x, p.pos.z) > R + 1;
      if (!remove && !t.dead && !(p.hit && p.pierce) && Math.hypot(p.pos.x - t.pos.x, p.pos.z - t.pos.z) < p.r + 0.7) {
        if (t.inv <= 0) { ctx.lastDmg = 0; hurt(t, p.owner, p.power, p.dmg, p.elem, { slow: p.slow, stun: p.stun, weak: p.weak, burn: p.burn }); p.hit = true;
          if (p.drain && ctx.lastDmg) healF(p.owner, ctx.lastDmg * p.drain); if (!p.pierce) remove = true; }
      }
      if (remove) { parts.burst(p.elem, p.pos.x, p.pos.y, p.pos.z, p.hit ? 4 : 10, 3, 0.1); scene.remove(p.mesh); disposeObj(p.mesh); projs.splice(i, 1); }
    }
  }
  function updateFx(dt) {
    for (let i = fxs.length - 1; i >= 0; i--) {
      const x = fxs[i]; x.life -= dt;
      const k = Math.max(0, x.life / x.max);
      if (x.fn) x.fn(k, x.obj);
      if (x.life <= 0) { if (x.obj) { scene.remove(x.obj); disposeObj(x.obj); } fxs.splice(i, 1); }
    }
  }
  function animate(f, t) {
    const m = f.model;
    m.root.position.x = f.pos.x; m.root.position.z = f.pos.z;
    if (ctx.hitstop > 0 && ctx.hitTarget === f) { m.root.position.x += rand(-0.1, 0.1); m.root.position.z += rand(-0.1, 0.1); }
    m.root.rotation.y = f.yaw;
    FX.pose(m, {
      moving: f.moving, atk: f.anim ? 1 - f.anim.t / f.anim.dur : 0, style: f.anim && f.anim.style, kind: f.windup ? f.windup.kind : null, slowWalk: !!(f.windup && f.windup.kind === 'retreat'), stun: f.stun > 0, guard: f.guard, dead: f.dead,
      charge: f.charge, buff: f.buffs.atk > 0 || f.buffs.spd > 0 || f.buffs.ultAura > 0, barrier: f.buffs.def > 0 || f.shield > 0, flash: f.flash,
    }, t);
    if (f.hop) { m.root.position.y += f.hop; m.shadow.position.y = 0.03 - m.root.position.y; m.shadow.scale.setScalar(Math.max(0.4, 1 - f.hop * 0.2)); }
    if (f.dead) m.root.position.y = 0.45;
    m.root.visible = !(f.inv > 0 && f.stepT > 0 && Math.floor(t * 30) % 2 === 0);
  }

  // ---------- HUD ----------
  function hud(dt) {
    P.hpShown = P.hp; E.hpShown = E.hp;
    $('bt-php').style.width = (P.hp / P.maxHp * 100) + '%';
    $('bt-pghost').style.width = (P.hp / P.maxHp * 100) + '%';
    $('bt-ehp').style.width = (E.hp / E.maxHp * 100) + '%';
    $('bt-eghost').style.width = (E.hp / E.maxHp * 100) + '%';
    $('bt-pnum').textContent = Math.ceil(P.hp) + ' / ' + P.maxHp;
    $('bt-enum').textContent = Math.ceil(E.hp) + ' / ' + E.maxHp;
    const tl = Math.max(0, Math.ceil(ctx.timeLeft)); const te = $('bt-time');
    if (te.textContent !== String(tl)) { te.textContent = tl; if (tl <= 10) { te.classList.add('low'); if (ctx.start <= 0 && !ctx.over) Sound.play('warn'); } }
    $('bt-gauge').style.width = P.gauge + '%';
    $('bt-gauge').parentElement.classList.toggle('full', P.gauge >= 100);
    const ub = $('bt-ult'); ub.classList.toggle('ready', P.gauge >= 100);
    ub.style.visibility = P.ult ? '' : 'hidden';
    P.skills.forEach((s, i) => {
      const b = $('bt-s' + i);
      if (!s) { b.style.visibility = 'hidden'; return; }
      b.style.visibility = '';
      b.querySelector('.cd').style.height = (s.cd > 0 ? Math.min(100, s.cd / s.def.ct * 100) : 0) + '%';
      b.classList.toggle('rdy', s.cd <= 0);
    });
    ctx.vig = Math.max(0, ctx.vig - dt);
    const low = P.hp / P.maxHp < 0.3 && !P.dead;
    $('bt-vig').style.opacity = Math.max(low ? 0.5 + Math.sin(clock * 6) * 0.2 : 0, ctx.vig);
    if (ctx.comboT > 0) { ctx.comboT -= dt; if (ctx.comboT <= 0) { ctx.comboN = 0; $('bt-combo').style.opacity = 0; } }
  }
  function camUpdate(dt, snap) {
    const p = P.pos, e = E.pos;
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
    const nx = dx / d, nz = dz / d;
    const back = 8.5 + d * 0.25, up = 4.6 + d * 0.22;
    const norm = new THREE.Vector3(p.x - nx * back, up, p.z - nz * back);
    const lookN = new THREE.Vector3((p.x + e.x) / 2, 0.8, (p.z + e.z) / 2);
    let pos = norm, look = lookN;
    if (ctx.start > 0 && !snap) {
      // 登場演出: 敵を正面からなめて、定位置へ引く
      const q = ease(Math.min(1, Math.max(0, 1 - ctx.start / INTRO)));
      const ep = new THREE.Vector3(e.x + (-nx) * 5.5 + (-nz) * 2 * (1 - q), 1.6 + 1.5 * q, e.z + (-nz) * 5.5 + nx * 2 * (1 - q));
      pos = ep.clone().lerp(norm, q);
      look = new THREE.Vector3(e.x, 1.4, e.z).lerp(lookN, q);
      camera.position.copy(pos);
    } else if (ctx.over && ctx.koFx) {
      const loser = P.dead ? P : E;
      const a = clock * 0.5 + 1;
      pos = new THREE.Vector3(loser.pos.x + Math.cos(a) * 8, 4, loser.pos.z + Math.sin(a) * 8);
      look = new THREE.Vector3(loser.pos.x, 1, loser.pos.z);
      camera.position.lerp(pos, 1 - Math.pow(0.02, dt));
    } else {
      if (snap) camera.position.copy(pos); else camera.position.lerp(pos, 1 - Math.pow(0.001, dt));
    }
    if (ctx.shake > 0) { camera.position.x += rand(-1, 1) * ctx.shake * 0.5; camera.position.y += rand(-1, 1) * ctx.shake * 0.5; camera.position.z += rand(-1, 1) * ctx.shake * 0.5; ctx.shake = Math.max(0, ctx.shake - dt * 2.2); }
    camera.lookAt(look);
    ctx.fovKick *= Math.pow(0.02, dt);
    const fov = (ctx.baseFov || 50) + ctx.fovKick;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  // ---------- ループ ----------
  // 1フレームの途中でエラーが出ても、画面が止まらないようにする
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    try { step(now); } catch (e) { console.error(e); }
    try { renderer.render(scene, camera); } catch (e) { console.error(e); }
  }
  function step(now) {
    const rawDt = Math.min(0.05, (now - last) / 1000); last = now;
    let dt = rawDt;
    if (ctx.slowT > 0) { ctx.slowT -= rawDt; dt *= ctx.slow; }
    if (ctx.over && ctx.koFx) dt *= 0.4;
    if (ctx.hitstop > 0) { ctx.hitstop -= rawDt; dt *= 0.012; }
    clock += dt;
    if (ctx.start > 0) {
      const before = ctx.start;
      ctx.start -= dt;
      if (ctx.start > 1.0) { $('bt-intro').style.opacity = 1; }
      else {
        $('bt-intro').style.opacity = 0;
        ctx.msg(ctx.start > 0.35 ? 'READY...' : 'FIGHT!', 1);
        if (before > 1.0 && ctx.start <= 1.0) Sound.play('ready');
        if (before > 0.35 && ctx.start <= 0.35) Sound.play('fight');
      }
      if (ctx.start <= 0) ctx.msg('', 0);
    } else if (!ctx.over) {
      ctx.timeLeft -= dt;
      if (ctx.timeLeft <= 0) {
        ctx.over = true; ctx.overT = 1.4; ctx.timeUp = true;
        ctx.winner = P.hp / P.maxHp >= E.hp / E.maxHp ? 'p' : 'e';
        ctx.msg('TIME UP', 1);
      }
    }
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= clock) { const fn = timers[i].fn; timers.splice(i, 1); fn(); }
    if (!ctx.over && ctx.start <= 0) { playerInput(P, dt); aiUpdate(E, dt); }
    else { P.in = { fwd: 0, right: 0 }; E.in = { fwd: 0, right: 0 }; P.wantGuard = E.wantGuard = false; }
    for (const k in edge) edge[k] = false;
    updateFighter(P, dt); updateFighter(E, dt);
    updateProjs(dt); updateZones(dt); updateFx(dt);
    scenery.update(clock, dt, parts);
    parts.update(dt);
    parts.setScale(renderer.domElement.height, camera.fov);
    animate(P, clock); animate(E, clock);
    camUpdate(rawDt, false);
    hud(rawDt);
    if (ctx.over) {
      if (!ctx.timeUp) { /* K.O. 表示済み */ }
      else if (ctx.winner === 'p') ctx.msg('TIME UP  勝ち！', 1); else ctx.msg('TIME UP  負け…', 1);
      ctx.overT -= rawDt;
      if (ctx.overT <= 0) finish(ctx.winner === 'p', false);
    }
  }

  function clearScene() {
    [P, E].forEach(f => { if (f && f.model) { scene.remove(f.model.root); disposeObj(f.model.root); } });
    (projs || []).forEach(p => { scene.remove(p.mesh); disposeObj(p.mesh); });
    (fxs || []).forEach(x => { if (x.obj) { scene.remove(x.obj); disposeObj(x.obj); } });
    zones.forEach(z => { scene.remove(z.g); disposeObj(z.g); }); zones = [];
    if (scenery) { scene.remove(scenery.group); disposeObj(scenery.group); scenery = null; }
    if (parts) parts.clear();
    document.getElementById('bt-fx').innerHTML = '';
  }
  function finish(win, quit) {
    if (!running) return;
    running = false; cancelAnimationFrame(raf);
    const res = {
      win, quit: !!quit, time: Math.max(0, TIME_LIMIT - Math.max(0, ctx.timeLeft)), noDamage: ctx.taken === 0, taken: ctx.taken, dealt: ctx.dealt,
      takenType: ctx.takenType, timeUp: !!ctx.timeUp, hpRate: P.hp / P.maxHp,
    };
    clearScene();
    root.classList.add('hidden'); document.body.classList.remove('in-battle');
    for (const k in keys) keys[k] = false;
    const cb = ctx.onEnd; ctx = null;
    cb(res);
  }

  // ---------- 開始 ----------
  function start(opts) {
    // opts: { player, enemy, area, onEnd }
    init();
    clearScene();
    projs = []; fxs = []; timers = []; clock = 0;
    ctx = {
      start: INTRO, over: false, winner: null, overT: 0, timeLeft: TIME_LIMIT, taken: 0, dealt: 0, takenType: { physical: 0, magic: 0 },
      slow: 1, slowT: 0, shake: 0, timeUp: false, onEnd: opts.onEnd, hitstop: 0, hitTarget: null, vig: 0, comboN: 0, comboT: 0, fovKick: 0, koFx: 0,
      baseFov: innerWidth / innerHeight < 1 ? 72 : 50,
      msg: (t, o) => { const m = $('bt-msg'); if (m.textContent !== t) { m.textContent = t; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); } m.style.opacity = o; },
    };
    ctx.msg('', 0); const idx = opts.area;
    scenery = FX.buildScenery(idx, R); scene.add(scenery.group);
    const sc = scenery.sc;
    scene.background = FX.rgb(sc.fog);
    scene.fog = new THREE.Fog(sc.fog, 34, 95);
    hemi.color.setHex(sc.hemi[0]); hemi.groundColor.setHex(sc.hemi[1]);
    sun.color.setHex(sc.sun); sun.intensity = sc.sunI;
    floorMesh.material.map = scenery.floorTex; floorMesh.material.needsUpdate = true;
    rimMesh.material.color.setHex(sc.rim);
    P = makeFighter('p', opts.player);
    E = makeFighter('e', opts.enemy);
    $('bt-pn').textContent = P.name; $('bt-en').textContent = E.name;
    $('bt-pe').textContent = ELEM[P.elem].n; $('bt-ee').textContent = ELEM[E.elem].n;
    $('bt-pe').style.color = ELEM[P.elem].css; $('bt-ee').style.color = ELEM[E.elem].css;
    P.skills.forEach((s, i) => { $('bt-s' + i).querySelector('.nm').textContent = s ? s.def.name : ''; });
    $('bt-ult').querySelector('.nm').textContent = P.ult ? P.ult.name : '';
    $('bt-intro-n').textContent = E.name;
    $('bt-intro-s').textContent = (opts.enemy.line ? '「' + opts.enemy.line + '」' : '') ;
    $('bt-intro-r').textContent = 'ランク ' + (opts.enemy.rank || '') + (opts.enemy.boss ? '　BOSS' : '');
    $('bt-time').classList.remove('low'); $('bt-time').textContent = TIME_LIMIT; $('bt-combo').style.opacity = 0; $('bt-flash').style.opacity = 0;
    root.classList.remove('hidden'); document.body.classList.add('in-battle');
    for (const k in keys) keys[k] = false;
    for (const k in edge) edge[k] = false;
    resize();
    camUpdate(0, true);
    Sound.unlock(); Sound.bgm('battle' + idx);
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  return { start, _dbg: () => ({ P, E, ctx, useSkill, startWindup }) };
})();
