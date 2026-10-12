// 怪物の見た目(リグ)いろいろ。rig-procedural.js(鼻なし)と同じ決まりで作ってある:
//   root / hit { body, head, weak } / apply(pose, glowOn, flash) / update(dt) / syncHit() / weakForward(out)
// pose: state(wander chase tell act lunge recover frozen dead …) / walk(歩きの位相) / tilt(予兆 0〜1) / jaw(弱点の開き 0〜1) / y(浮く高さ)
const RigCreatures = (() => {
  const { hash, skullGeometry, skinMaterial, clothTexture, metalTexture, bloodMarks, mkRnd } = RigProcedural.kit;
  // 皮がめくれて肉がのぞく傷(法線は +z。th で向きを回す)
  const FLESH = new THREE.MeshStandardMaterial({ color: 0x8c2a2a, roughness: 0.3 });
  const RIM = new THREE.MeshStandardMaterial({ color: 0x4e1a14, roughness: 0.6 });
  const BONE = new THREE.MeshStandardMaterial({ color: 0xcfc8b6, roughness: 0.8 });
  const wound = (parent, x, y, z, r, th) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = th;
    const rim = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), RIM); rim.scale.set(1.1, 1, 0.22);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), FLESH); fl.scale.set(1, 0.9, 0.3); fl.position.z = 0.012;
    g.add(rim); g.add(fl);
    for (let i = -1; i <= 1; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, r * 1.5, 4), BONE); t.position.set(i * r * 0.3, 0, 0.04); t.rotation.z = i * 0.2; g.add(t); }
    parent.add(g); return g;
  };
  const named = (o, n) => { o.name = n; return o; };
  const add = (parent, mesh, x, y, z) => { mesh.position.set(x || 0, y || 0, z || 0); parent.add(mesh); return mesh; };
  const ball = (r, sx, sy, sz, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat); m.scale.set(sx, sy, sz); return m; };
  // 根元から +y 方向へ伸びる円柱 / -y 方向へ垂れる円柱(r0: 根元の半径, r1: 先の半径)
  const seg = (len, r0, r1, mat) => { const g = new THREE.CylinderGeometry(r1, r0, len, 7); g.translate(0, len / 2, 0); return new THREE.Mesh(g, mat); };
  const segDown = (len, r0, r1, mat) => { const g = new THREE.CylinderGeometry(r0, r1, len, 7); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, mat); };
  const cone = (r, h, mat) => new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mat);
  const hitMesh = (geo, parent, x, y, z) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); parent.add(m); return m;
  };
  const moving = p => p.state === 'wander' || p.state === 'chase' || p.state === 'lunge';
  const _q = new THREE.Quaternion();
  const fwdOf = (obj, x, y, z, out) => { obj.getWorldQuaternion(_q); return out.set(x, y, z).applyQuaternion(_q); };
  const flashAll = (mats, f) => mats.forEach(m => m.emissive && m.emissive.setRGB(f * 0.6, 0, 0));
  const tooth = () => new THREE.MeshStandardMaterial({ color: 0xd9d2bd, roughness: 0.6 });

  // ===================================================================== 水底の手
  function hand() {
    const root = new THREE.Group(); root.name = 'Hand'; root.scale.setScalar(1.25);
    const skin = skinMaterial({ base: [160, 182, 190], wounds: 5, blood: 0.4, bruise: 6, seed: 7 }); skin.roughness = 0.45;
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.3 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0xaa1818, emissive: 0x100000, roughness: 0.4 });
    const arm = named(new THREE.Group(), 'Arm'); arm.position.y = -0.25; root.add(arm);
    arm.add(seg(1.7, 0.17, 0.1, skin));
    wound(arm, 0.15, 0.6, 0, 0.07, Math.PI / 2); wound(arm, -0.13, 1.1, 0.02, 0.06, -Math.PI / 2); wound(arm, 0.1, 1.35, 0.05, 0.05, 1.2);
    const wrist = new THREE.Group(); wrist.position.y = 1.7; arm.add(wrist);
    const palmG = named(new THREE.Group(), 'Palm'); wrist.add(palmG);
    add(palmG, ball(0.24, 1, 0.95, 0.34, skin), 0, 0.2, 0);
    const eye = new THREE.Group(); eye.position.set(0, 0.2, 0.12); palmG.add(eye);       // 掌の目
    eye.add(ball(0.13, 1, 1, 0.6, white)); add(eye, ball(0.065, 1, 1, 0.5, irisMat), 0, 0, 0.06); add(eye, ball(0.03, 1, 1, 0.5, new THREE.MeshBasicMaterial({ color: 0x000000 })), 0, 0, 0.09);
    const fingers = [];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Group(); f.position.set((i - 2) * 0.1, i === 0 || i === 4 ? 0.33 : 0.4, 0); f.rotation.z = -(i - 2) * 0.2; palmG.add(f);
      f.add(seg(0.28, 0.04, 0.03, skin));
      const f2 = new THREE.Group(); f2.position.y = 0.28; f.add(f2); f2.add(seg(0.26, 0.03, 0.014, skin));
      fingers.push({ f, f2, i });
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.62, 28), new THREE.MeshBasicMaterial({ color: 0x8fb8c8, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; root.add(ring);
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.2, 0.2, 1.7, 8), arm, 0, 0.85, 0),
      head: hitMesh(new THREE.SphereGeometry(0.42, 8, 6), palmG, 0, 0.5, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.2, 8, 6), palmG, 0, 0.2, 0.12),
    };
    let P = { state: 'idle', walk: 0, tilt: 0, jaw: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update(dt) {
      const t = performance.now() / 1000, p = P;
      let armT = 0.3 + Math.sin(t * 0.8) * 0.05, palmT = 0, curl = 0.4;
      if (p.state === 'chase') { armT = 0.12 + Math.sin(t * 2) * 0.06; curl = 0.3 + Math.sin(t * 6) * 0.15; }
      else if (p.state === 'tell') { armT = 0.3 - 1.9 * p.tilt; curl = -0.25; }
      else if (p.state === 'act') armT = 1.45;
      else if (p.state === 'recover') { armT = 1.32; palmT = Math.PI; curl = 0.05; }
      else if (p.state === 'dead') { armT = 1.5; palmT = Math.PI; curl = 0.7; }
      arm.rotation.x += (armT - arm.rotation.x) * Math.min(1, dt * (p.state === 'act' ? 20 : 5));
      palmG.rotation.y += (palmT - palmG.rotation.y) * Math.min(1, dt * 6);
      fingers.forEach(({ f, f2, i }) => { f.rotation.x = curl + Math.sin(t * 3 + i) * 0.06; f2.rotation.x = curl * 1.3; });
      ring.scale.setScalar(1 + Math.sin(t * 1.5) * 0.08);
      const g = G ? 0.6 + 0.4 * Math.sin(t * 11) : 0; irisMat.emissive.setRGB(0.1 + g, 0, 0);
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'hand', handlesDeath: true, weakForward: out => fwdOf(palmG, 0, 0, 1, out) };
  }

  // ===================================================================== 影の子
  function shadow() {
    const root = new THREE.Group(); root.name = 'Shadow'; root.scale.setScalar(0.95);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 1, emissive: 0, transparent: true, opacity: 0.94 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff });
    const body = named(new THREE.Group(), 'Body'); root.add(body);
    const prof = [[0.001, 0], [0.11, 0.02], [0.09, 0.3], [0.1, 0.5], [0.13, 0.62], [0.001, 0.66]].map(a => new THREE.Vector2(a[0], a[1]));
    add(body, new THREE.Mesh(new THREE.LatheGeometry(prof, 10), mat), 0, 0.55, 0);
    const legsG = [-0.06, 0.06].map(x => { const g = new THREE.Group(); g.position.set(x, 0.58, 0); g.add(segDown(0.58, 0.04, 0.025, mat)); add(g, ball(0.03, 1.2, 0.5, 2.2, mat), 0, -0.58, 0.04); body.add(g); return g; });
    const arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.14, 1.15, 0); g.add(segDown(1.0, 0.03, 0.018, mat));
      for (let k = -1; k <= 1; k++) { const c = cone(0.008, 0.1, mat); c.rotation.x = Math.PI; add(g, c, k * 0.014, -1.05, 0); }
      body.add(g); return g; });
    const head = named(new THREE.Group(), 'Head'); head.position.set(0, 1.4, 0.02); body.add(head);
    add(head, ball(0.22, 0.95, 1.1, 0.95, mat), 0, 0.02, 0);                  // 大きな頭
    [-0.075, 0.075].forEach(x => add(head, ball(0.04, 1, 1.4, 0.6, eyeMat), x, 0.04, 0.19));  // 白く光る眼
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 8), body, 0, 0.6, 0),
      head: hitMesh(new THREE.SphereGeometry(0.27, 8, 6), head, 0, 0.02, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.1, 6, 5), head, 0, 0.02, 0.1),
    };
    let P = { state: 'wander', walk: 0, tilt: 0 }, F = 0;
    function apply(p, glowOn, flash) { P = p; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, mv = moving(p), sw = Math.sin(p.walk * 1.6);
      legsG[0].rotation.x = mv ? sw * 0.7 : 0; legsG[1].rotation.x = mv ? -sw * 0.7 : 0;
      arms[0].rotation.x = mv ? -sw * 0.5 : 0.05; arms[1].rotation.x = mv ? sw * 0.5 : 0.05;
      arms[0].rotation.z = 0.08; arms[1].rotation.z = -0.08;
      body.position.y = mv ? Math.abs(sw) * 0.05 : 0;
      head.rotation.z = p.state === 'frozen' ? 0.45 + Math.sin(t * 9) * 0.03 : Math.sin(t * 1.3) * 0.05;   // 見られている間は、首を傾けて固まる
      mat.emissive.setRGB(F * 0.6, F * 0.6, F * 0.8);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'shadow', handlesDeath: false, weakForward: out => fwdOf(head, 0, 0, 1, out) };
  }

  // ===================================================================== 首なし番人
  function guard() {
    const root = new THREE.Group(); root.name = 'Guard';
    const metal = new THREE.MeshStandardMaterial({ map: metalTexture({ rust: 0.8, blood: 0.5 }), roughness: 0.75, metalness: 0.3, emissive: 0, side: THREE.DoubleSide });
    const cloth = new THREE.MeshStandardMaterial({ map: clothTexture({ base: [48, 43, 38], blood: 0.55, dirt: 0.7, seed: 41 }), roughness: 1, emissive: 0 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x8a3c1c });
    const body = named(new THREE.Group(), 'Body'); root.add(body);
    const mkLeg = (x, n) => { const g = named(new THREE.Group(), n); g.position.set(x, 1.0, 0); g.add(segDown(1.0, 0.14, 0.1, cloth));
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.5), metal), 0, -0.95, 0.1); body.add(g); return g; };
    const legL = mkLeg(-0.2, 'LegL'), legR = mkLeg(0.2, 'LegR');
    const prof = [[0.001, 0], [0.34, 0.04], [0.3, 0.25], [0.36, 0.6], [0.42, 0.85], [0.34, 1.0], [0.001, 1.04]].map(a => new THREE.Vector2(a[0], a[1]));
    const torso = add(body, new THREE.Mesh(new THREE.LatheGeometry(prof, 14), cloth), 0, 1.0, 0); torso.scale.z = 0.75;
    const plate = add(body, new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.6, 12, 1, true, -Math.PI / 2, Math.PI), metal), 0, 1.65, 0); plate.scale.z = 0.75;
    [-0.45, 0.45].forEach(x => add(body, ball(0.2, 1, 0.7, 1, metal), x, 1.98, 0));
    const helmet = named(new THREE.Group(), 'Head'); helmet.position.set(0, 2.2, 0); body.add(helmet);   // 首がなく、錆びたバケツをかぶっている
    helmet.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 10), metal));
    add(helmet, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.02), dark), 0, 0.03, 0.225);
    add(helmet, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), dark), 0, -0.03, 0.225);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(helmet, ball(0.018, 1, 1, 1, metal), Math.sin(a) * 0.215, 0.17, Math.cos(a) * 0.215); }
    const seam = add(body, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.7, 0.02), seamMat), 0, 1.55, -0.31);   // 背中の継ぎ目(弱点)
    const armL = named(new THREE.Group(), 'ArmL'); armL.position.set(-0.5, 1.95, 0); armL.add(segDown(1.0, 0.11, 0.08, cloth)); body.add(armL);
    const lantern = new THREE.Group(); lantern.position.y = -1.15; armL.add(lantern);
    lantern.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.2), metal));
    add(lantern, ball(0.075, 1, 1.2, 1, new THREE.MeshBasicMaterial({ color: 0xffb050 })), 0, 0, 0);
    const armR = named(new THREE.Group(), 'ArmR'); armR.position.set(0.5, 1.95, 0); armR.add(segDown(1.0, 0.11, 0.08, cloth)); body.add(armR);
    const hammer = new THREE.Group(); hammer.position.y = -1.0; armR.add(hammer);
    hammer.add(segDown(1.3, 0.04, 0.04, metal)); add(hammer, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), metal), 0, -1.3, 0);
    for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 8), metal); l.rotation.y = (i % 2) * Math.PI / 2; add(body, l, 0.25, 1.0 - i * 0.09, 0.2); }
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.46, 0.46, 2.2, 8), body, 0, 1.1, 0),
      head: hitMesh(new THREE.SphereGeometry(0.28, 8, 6), helmet, 0, 0, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.22, 8, 6), body, 0, 1.55, -0.32),
    };
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update(dt) {
      const t = performance.now() / 1000, p = P, mv = moving(p), sw = Math.sin(p.walk * 0.9);
      legL.rotation.x = mv ? sw * 0.45 : 0; legR.rotation.x = mv ? -sw * 0.45 : 0;
      body.position.y = mv ? Math.abs(sw) * 0.05 : 0;
      body.rotation.x = p.state === 'act' ? 0.35 : 0.05 - p.tilt * 0.4; body.rotation.z = mv ? sw * 0.04 : 0;
      armL.rotation.x = mv ? -sw * 0.25 : 0.05;
      const target = p.state === 'tell' ? -p.tilt * 3.3 : p.state === 'act' ? 0.7 : p.state === 'recover' ? 0.3 : (mv ? sw * 0.2 : 0.1);
      armR.rotation.x += (target - armR.rotation.x) * Math.min(1, dt * (p.state === 'act' ? 22 : 7));
      lantern.rotation.z = Math.sin(t * 2) * 0.1;
      const g = G ? 0.6 + 0.4 * Math.sin(t * 11) : 0; seamMat.color.setRGB(0.55 + g * 0.45, 0.24 + g * 0.3, 0.12 + g * 0.1);
      metal.emissive.setRGB(F * 0.6, 0, 0); cloth.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'guard', handlesDeath: false, weakForward: out => fwdOf(body, 0, 0, -1, out) };
  }

  // ===================================================================== 泣き女
  function weeper() {
    const root = new THREE.Group(); root.name = 'Weeper';
    const dressMat = new THREE.MeshStandardMaterial({ map: clothTexture({ base: [220, 216, 206], blood: 0.7, dirt: 0.6, seed: 23 }), roughness: 1, side: THREE.DoubleSide, emissive: 0 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 1, side: THREE.DoubleSide });
    const skin = skinMaterial({ base: [226, 222, 216], wounds: 3, blood: 0.3, bruise: 3, seed: 9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    const cavMat = new THREE.MeshStandardMaterial({ color: 0x3a0505, emissive: 0, roughness: 0.6 });
    const prof = [[0.5, 0], [0.48, 0.15], [0.36, 0.5], [0.2, 0.85], [0.12, 1.1], [0.15, 1.3], [0.19, 1.5], [0.1, 1.62], [0.001, 1.66]].map(a => new THREE.Vector2(a[0], a[1]));
    add(root, new THREE.Mesh(new THREE.LatheGeometry(prof, 18), dressMat), 0, 0, 0);
    const rags = [];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, h = 0.3 + hash(i, 2, 3) * 0.3;
      const g = new THREE.PlaneGeometry(0.15, h); g.translate(0, -h / 2, 0);
      const r = new THREE.Mesh(g, dressMat); r.position.set(Math.sin(a) * 0.47, 0.06, Math.cos(a) * 0.47); r.rotation.y = a; root.add(r); rags.push(r);
    }
    const arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.2, 1.5, 0); g.add(segDown(1.2, 0.04, 0.025, skin));
      for (let k = -1; k <= 2; k++) { const f = segDown(0.16, 0.01, 0.006, skin); f.position.set(k * 0.015 - 0.008, -1.2, 0); f.rotation.z = (k - 0.5) * 0.12; g.add(f); }
      root.add(g); return g; });
    const head = named(new THREE.Group(), 'Head'); head.position.set(0, 1.78, 0.05); root.add(head);
    const skull = add(head, new THREE.Mesh(skullGeometry(), skin), 0, 0.17, 0); skull.scale.set(0.12, 0.19, 0.13);
    [-0.045, 0.045].forEach(x => { add(head, ball(0.03, 1, 1.3, 0.6, dark), x, 0.22, 0.1); add(head, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: 0x7a0c0c, roughness: 0.2 })), x, 0.08, 0.115); });
    const cavity = add(head, ball(0.07, 1, 1.3, 1, cavMat), 0, 0.07, 0.08);
    const jaw = named(new THREE.Group(), 'Jaw'); jaw.position.set(0, 0.1, 0.03); head.add(jaw);
    add(jaw, ball(0.05, 1, 0.55, 1.3, skin), 0, -0.04, 0.06);
    const hairBack = add(head, new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 12, 1, true), hairMat), 0, -0.55, -0.1); hairBack.scale.z = 0.6;
    const hairFront = new THREE.Group(); hairFront.position.set(0, 0.36, 0.1); head.add(hairFront);   // 顔をおおう前髪(叫ぶと上がる)
    for (let i = 0; i < 7; i++) {
      const h = 0.55 + hash(i, 5, 6) * 0.25, g = new THREE.PlaneGeometry(0.05, h); g.translate(0, -h / 2, 0);
      const m = new THREE.Mesh(g, hairMat); m.position.set((i - 3) * 0.034, 0, 0.02 + Math.abs(i - 3) * -0.004); hairFront.add(m);
    }
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.38, 0.38, 1.8, 8), root, 0, 0.9, 0),
      head: hitMesh(new THREE.SphereGeometry(0.22, 8, 6), head, 0, 0.17, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.12, 8, 6), head, 0, 0.07, 0.1),
    };
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P;
      const reach = p.state === 'chase' ? 0.9 : p.state === 'tell' ? 1.3 + p.tilt * 0.8 : p.state === 'act' ? 1.4 : 0.15;
      arms[0].rotation.x = -reach + Math.sin(t * 1.7) * 0.06; arms[1].rotation.x = -reach + Math.sin(t * 1.7 + 1) * 0.06;
      arms[0].rotation.z = 0.1; arms[1].rotation.z = -0.1;
      head.rotation.z = p.tilt * 0.35 + Math.sin(t * 1.1) * 0.04; head.rotation.x = p.jaw * -0.35 - p.tilt * 0.55; root.rotation.x = -p.tilt * 0.3;
      jaw.rotation.x = p.jaw * 1.0;
      hairFront.scale.y = 1 - p.jaw * 0.85; hairFront.rotation.x = -p.jaw * 0.5;     // 髪が上がって、顔と口があらわれる
      rags.forEach((r, i) => { r.rotation.x = Math.sin(t * 2 + i) * 0.12; });
      const g = G ? 0.5 + 0.4 * Math.sin(t * 11) : 0; cavMat.emissive.setRGB(g, g * 0.1, 0);
      dressMat.emissive.setRGB(F * 0.6, 0, 0); skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'weeper', handlesDeath: false, weakForward: out => fwdOf(head, 0, 0, 1, out) };
  }

  // ===================================================================== ミミック(宝箱に化けた怪物)
  function mimic() {
    const root = new THREE.Group(); root.name = 'Mimic';
    const woodTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#5a3a1e'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#4a2e16' : '#684422'; g.fillRect(0, i * 21, 128, 19); }
      for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 6); }
      bloodMarks(g, 7, 128, mkRnd(5), 1.0);
      return new THREE.CanvasTexture(c);
    })();
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9, emissive: 0 });
    const gold = new THREE.MeshStandardMaterial({ color: 0x9a8030, roughness: 0.4, metalness: 0.6, emissive: 0 });
    const inner = new THREE.MeshStandardMaterial({ color: 0x2a0505, roughness: 0.8 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xd04a68, roughness: 0.4, emissive: 0 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe040 });
    const T = tooth();
    const body = named(new THREE.Group(), 'Body'); root.add(body);
    add(body, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.38, 0.6), wood), 0, 0.19, 0);
    [-0.3, 0.3].forEach(x => add(body, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.62), gold), x, 0.19, 0));
    add(body, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.01, 0.5), inner), 0, 0.375, 0);
    const lid = named(new THREE.Group(), 'Lid'); lid.position.set(0, 0.38, -0.3); body.add(lid);
    add(lid, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.6), wood), 0, 0.08, 0.3);
    [-0.3, 0.3].forEach(x => add(lid, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.62), gold), x, 0.08, 0.3));
    add(lid, ball(0.05, 1, 1.2, 0.6, gold), 0, 0.02, 0.61);    // 鍵穴の飾り(戦利品の箱に見せる)
    const teeth = [];
    for (let i = -3; i <= 3; i++) {
      const u = cone(0.025, 0.1, T); u.rotation.x = Math.PI; add(lid, u, i * 0.11, -0.04, 0.56);
      const l = cone(0.025, 0.09, T); add(body, l, i * 0.11, 0.43, 0.27); teeth.push(u, l);
    }
    [-0.17, 0.17].forEach(x => teeth.push(add(lid, ball(0.045, 1, 1, 0.7, eyeMat), x, -0.02, 0.32)));
    const tongueG = new THREE.Group(); tongueG.position.set(0, 0.38, 0.05); body.add(tongueG);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.05, 0.25), new THREE.Vector3(0, -0.02, 0.5)]), 8, 0.07, 8), tongueMat);
    tongueG.add(tube); add(tongueG, ball(0.085, 1, 0.7, 1.2, tongueMat), 0, -0.02, 0.5);
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8), body, 0, 0.25, 0),
      head: hitMesh(new THREE.SphereGeometry(0.3, 8, 6), body, 0, 0.5, 0.1),
      weak: hitMesh(new THREE.SphereGeometry(0.17, 8, 6), body, 0, 0.36, 0.42),
    };
    let P = { state: 'idle', walk: 0, tilt: 0, jaw: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update(dt) {
      const t = performance.now() / 1000, p = P;
      let open = p.jaw;                                                  // 弱点(舌)が出るのは、飛びかかったあとの隙
      if (p.state === 'lunge') open = 0.7;
      else if (p.state === 'tell') open = 0.3 + Math.sin(t * 26) * 0.28;  // 蓋が大きくカタカタ開閉する
      lid.rotation.x = -open * 1.15;
      tongueG.scale.z = 0.05 + Math.max(0, p.jaw) * 0.95;
      const vis = open > 0.08; teeth.forEach(m => { m.visible = vis; }); tongueG.visible = p.jaw > 0.05;
      const mv = moving(p);
      body.position.y = mv ? Math.abs(Math.sin(p.walk * 1.4)) * 0.16 : 0;
      body.rotation.x = p.state === 'lunge' ? -0.3 : p.state === 'tell' ? -0.5 * p.tilt + Math.sin(t * 30) * 0.05 : (mv ? Math.sin(p.walk * 1.4) * 0.12 : 0);
      body.position.x = p.state === 'tell' ? Math.sin(t * 34) * 0.03 : 0;
      body.scale.y = p.state === 'tell' ? 0.78 : 1;
      const g = G ? 0.5 + 0.4 * Math.sin(t * 11) : 0; tongueMat.emissive.setRGB(g, g * 0.1, 0);
      wood.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'mimic', handlesDeath: false, weakForward: out => out.set(0, 0, 1) };
  }

  return { hand, shadow, guard, weeper, mimic, kit: { named, add, ball, seg, segDown, cone, hitMesh, moving, fwdOf, wound, tooth } };
})();
