// 怪物の見た目(リグ)その3: 異形の怪物たち。rig-creatures.js の部品を使う
//   spider      這い蜘蛛    人の体を逆さに反らせ、人の腕を脚にして這う。あばらが開くと心臓がのぞく
//   tehaki      手吐き      口が裂けて、口の中から長い腕が伸びる
//   hakibukuro  吐き袋      腹が透けてふくれ、酸を吐く
//   kamikui     髪食い      天井に逆さにぶら下がり、髪を振り回す
//   harawari    腹割れ      腹が縦に裂けて、子を産む
//   larva       子          腹割れが産む、赤ん坊の顔の虫
// pose: state / walk / tilt(予兆 0〜1) / jaw(弱点の開き) / ext(腕・髪が伸びる、腹がふくらむ・開く 0〜1)
Object.assign(RigCreatures, (() => {
  const { named, add, ball, seg, segDown, cone, hitMesh, moving, fwdOf, wound, tooth } = RigCreatures.kit;
  const { hash, skullGeometry, skinMaterial } = RigProcedural.kit;
  const mat = (c, r, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r == null ? 0.6 : r }, extra));
  const BONE = mat(0xcfc8b6, 0.8), DARK = mat(0x050505, 1), BLOOD = mat(0x6a0a0a, 0.15), WET = mat(0x8c2a2a, 0.3);

  // 人の体(胴・脚・腕)を作る共通部品。o で太さや長さを変える
  function human(skin, o) {
    o = Object.assign({ torso: 1, torsoH: 1, arm: 1, armT: 1, leg: 1, legT: 1, shY: 1.88, hipY: 0.95 }, o);
    const body = named(new THREE.Group(), 'Body');
    const prof = [[0.001, 0], [0.16, 0.02], [0.15, 0.2], [0.12, 0.45], [0.14, 0.7], [0.2, 0.9], [0.19, 1.0], [0.1, 1.04], [0.001, 1.06]]
      .map(a => new THREE.Vector2(a[0] * o.torso, a[1] * o.torsoH));
    const torso = add(body, new THREE.Mesh(new THREE.LatheGeometry(prof, 14), skin), 0, o.hipY, 0); torso.scale.z = 0.75;
    const legs = [-1, 1].map(s => {
      const hip = named(new THREE.Group(), s < 0 ? 'LegL' : 'LegR'); hip.position.set(s * 0.11 * o.torso, o.hipY, 0);
      hip.add(segDown(o.hipY * 0.5, 0.06 * o.legT, 0.045 * o.legT, skin));
      const knee = new THREE.Group(); knee.position.y = -o.hipY * 0.5; hip.add(knee);
      knee.add(segDown(o.hipY * 0.5, 0.045 * o.legT, 0.03 * o.legT, skin));
      add(knee, ball(0.05 * o.legT, 1.2, 0.5, 2.2, skin), 0, -o.hipY * 0.5, 0.05);
      body.add(hip); return { hip, knee };
    });
    const arms = [-1, 1].map(s => {
      const sh = named(new THREE.Group(), s < 0 ? 'ArmL' : 'ArmR'); sh.position.set(s * 0.27 * o.torso, o.shY, 0);
      const L = 0.8 * o.arm; sh.add(segDown(L, 0.05 * o.armT, 0.035 * o.armT, skin));
      const el = new THREE.Group(); el.position.y = -L; el.rotation.x = -0.2; sh.add(el);
      add(el, ball(0.04 * o.armT, 1, 1, 1, skin)); el.add(segDown(L, 0.035 * o.armT, 0.025 * o.armT, skin));
      const hand = new THREE.Group(); hand.position.y = -L; el.add(hand); add(hand, ball(0.035 * o.armT, 1, 1.3, 0.6, skin));
      [-0.028, -0.009, 0.009, 0.028].forEach((x, i) => { const f = segDown(0.2, 0.008, 0.004, skin); f.position.set(x, -0.03, 0); f.rotation.x = 0.15 + i * 0.04; hand.add(f); });
      body.add(sh); return { sh, el };
    });
    return { body, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1] };
  }
  // 歩く動き(脚と腕の振り)
  function walkPose(h, p, amp) {
    const sw = Math.sin(p.walk), a = moving(p) ? amp : 0;
    h.legL.hip.rotation.x = sw * a; h.legR.hip.rotation.x = -sw * a;
    h.legL.knee.rotation.x = 0.12 + Math.max(0, -sw) * a * 0.9; h.legR.knee.rotation.x = 0.12 + Math.max(0, sw) * a * 0.9;
    h.armL.sh.rotation.x = -sw * a * 0.5 + 0.05; h.armR.sh.rotation.x = sw * a * 0.5 + 0.05;
    h.armL.sh.rotation.z = 0.07; h.armR.sh.rotation.z = -0.07;
    h.body.position.y = a ? Math.abs(sw) * 0.04 : 0;
  }
  // 人の頭(いびつな頭蓋骨・黒い眼窩・口)。jaw を回して口を開ける
  function head(skin, o) {
    o = Object.assign({ sx: 0.16, sy: 0.27, sz: 0.19, cy: 0.2, mouthY: 0.07, mouthW: 0.12, eyeY: 0.27 }, o);
    const g = named(new THREE.Group(), 'Head');
    add(g, new THREE.Mesh(skullGeometry(), skin), 0, o.cy, 0).scale.set(o.sx, o.sy, o.sz);
    [-0.065, 0.065].forEach(x => add(g, ball(0.045, 0.9, 1.25, 0.7, DARK), x * o.sx / 0.16, o.eyeY, o.sz * 0.72));
    const jaw = named(new THREE.Group(), 'Jaw'); jaw.position.set(0, o.mouthY + 0.01, o.sz * 0.2); g.add(jaw);
    add(jaw, ball(o.mouthW * 0.55, 1, 0.6, 1.5, skin), 0, -0.035, o.sz * 0.4);
    const cav = add(g, ball(o.mouthW * 0.6, 1.1, 1, 1, WET), 0, o.mouthY - 0.02, o.sz * 0.5); cav.visible = false;
    for (let i = -3; i <= 3; i++) {
      const t = cone(0.006, 0.03 + hash(i, 3, 4) * 0.02, tooth()); t.rotation.x = Math.PI; add(g, t, i * o.mouthW * 0.11, o.mouthY + 0.01, o.sz * 0.74 - i * i * 0.0004);
      add(jaw, cone(0.005, 0.03 + hash(i, 5, 6) * 0.015, tooth()), i * o.mouthW * 0.1, 0.002, o.sz * 0.62);
    }
    return { g, jaw, cav };
  }

  // ===================================================================== 這い蜘蛛(人を逆さに反らせた化け物)
  function spider() {
    const root = new THREE.Group(); root.name = 'Spider';
    const skin = skinMaterial({ base: [200, 188, 176], wounds: 6, blood: 0.5, bruise: 5, seed: 5 });
    const heartMat = mat(0x8a1020, 0.3, { emissive: 0x200000 });
    const body = named(new THREE.Group(), 'Body'); body.position.y = 0.85; root.add(body);
    add(body, ball(0.3, 1, 0.62, 1.3, skin));                                    // 腹を上にした胴
    wound(body, 0.28, 0.0, 0.0, 0.07, Math.PI / 2); wound(body, -0.28, 0.02, -0.15, 0.06, -Math.PI / 2); wound(body, 0.0, -0.1, -0.3, 0.06, Math.PI);
    add(body, ball(0.22, 1, 0.22, 1.0, mat(0x3a0a0a, 0.5)), 0, 0.14, 0);          // 胸の奥の暗がり
    const heart = add(body, ball(0.1, 1, 0.9, 1, heartMat), 0, 0.17, 0.02);       // 心臓(弱点)
    const ribs = [];                                                               // あばら: 左右に分かれて開く
    for (let i = 0; i < 5; i++) {
      const z = -0.3 + i * 0.15, rr = 0.27 - Math.abs(z) * 0.25;
      [-1, 1].forEach(side => {
        const g = new THREE.Group(); g.position.set(side * rr, 0.16, z); g.scale.x = side;
        const geo = new THREE.TorusGeometry(rr, 0.013, 5, 10, Math.PI / 2); geo.translate(-rr, 0, 0);
        g.add(new THREE.Mesh(geo, BONE)); body.add(g); ribs.push({ g, side });
      });
    }
    [[0.14, 0.16, 0.22], [-0.16, 0.14, -0.12], [0.1, 0.15, -0.25]].forEach(([x, y, z]) => {   // 胴にある目
      add(body, ball(0.04, 1, 1, 1, mat(0xe8e8e0, 0.3)), x, y, z); add(body, ball(0.018, 1, 1, 1, DARK), x * 1.02, y + 0.02, z + 0.03);
    });
    // 顔: 逆さについていて、口が耳まで裂けている
    const hd = head(skin, { sx: 0.13, sy: 0.17, sz: 0.14, cy: 0.12, mouthY: 0.04, mouthW: 0.2, eyeY: 0.16 });
    hd.g.position.set(0, -0.02, 0.62); hd.g.rotation.z = Math.PI; body.add(hd.g);
    for (let i = 0; i < 16; i++) {                                                  // 垂れる髪
      const L = 0.6 + hash(i, 2, 7) * 0.5, s = segDown(L, 0.01, 0.003, mat(0x0a0a0a, 1));
      s.position.set((i - 8) * 0.016, 0.3, -0.02); s.rotation.x = 3.1; hd.g.add(s);
    }
    // 人の腕6本が脚: 肩・肘・手首・長い指
    const limbs = [];
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const hip = new THREE.Group(); hip.position.set(side * 0.3, 0, 0.28 - i * 0.28); body.add(hip);
      const phi = (-0.6 + i * 0.55) * side; hip.rotation.y = phi;
      const up = new THREE.Group(); hip.add(up); const a0 = side > 0 ? 0.8 - Math.PI / 2 : Math.PI / 2 - 0.8; up.rotation.z = a0;
      up.add(seg(0.5, 0.05, 0.035, skin));
      const knee = new THREE.Group(); knee.position.y = 0.5; up.add(knee);
      const k0 = side > 0 ? -2.1 : 2.1; knee.rotation.z = k0;
      knee.add(seg(0.85, 0.035, 0.024, skin)); knee.add(ball(0.04, 1, 1, 1, skin));
      const hand = new THREE.Group(); hand.position.y = 0.85; knee.add(hand); add(hand, ball(0.04, 1, 1.3, 0.6, skin));
      for (let j = 0; j < 4; j++) { const f = seg(0.24, 0.012, 0.005, skin); f.position.set(0, 0.03, 0); f.rotation.z = (j - 1.5) * 0.4; f.rotation.x = 0.2; hand.add(f); }
      limbs.push({ hip, up, knee, side, i, phi, a0, k0 });
    }
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 8), body, 0, 0, 0),
      head: hitMesh(new THREE.SphereGeometry(0.22, 8, 6), hd.g, 0, 0.12, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.17, 8, 6), body, 0, 0.17, 0.02),
    };
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0, ext: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, mv = moving(p), crouch = p.tilt, open = p.jaw;
      body.position.y = 0.85 - crouch * 0.42 - (p.state === 'dead' ? 0.3 : 0) + (mv ? Math.abs(Math.sin(p.walk * 1.3)) * 0.05 : 0);
      body.position.x = Math.sin(t * 45) * 0.022 * crouch;                           // 振りかぶり: 地面に体を押しつけ、ぶるぶる震える
      body.rotation.x = p.state === 'lunge' ? -0.35 : crouch * 0.12;
      ribs.forEach(({ g, side }) => { g.rotation.z = (side > 0 ? -1 : 1) * open * 1.4; });
      hd.jaw.rotation.x = 0.1 + crouch * 0.9 + open * 0.5; hd.cav.visible = hd.jaw.rotation.x > 0.3;
      hd.g.rotation.x = crouch * 0.5;
      limbs.forEach(L => {
        const ph = p.walk * 1.3 + (L.i % 2 ? Math.PI : 0) + (L.side > 0 ? 0 : Math.PI * 0.5), sw = mv ? Math.sin(ph) : 0, lift = mv ? Math.max(0, Math.cos(ph)) : 0;
        L.hip.rotation.y = L.phi + sw * 0.32;
        L.knee.rotation.z = L.k0 - L.side * (lift * 0.45 + crouch * 0.7);
        L.up.rotation.z = L.a0 - L.side * crouch * 0.55;                                  // 腕を大きく外へ広げる
        if (open > 0.5) L.up.rotation.z = L.a0 + Math.sin(t * 8 + L.i * 1.3 + L.side) * 0.2 * (p.state === 'dead' ? 0.1 : 1);
      });
      const pulse = 0.5 + 0.5 * Math.sin(t * (open > 0.5 ? 9 : 5)); heart.scale.setScalar(1 + pulse * 0.12 * (0.4 + open));
      const g = G ? 0.5 + 0.4 * Math.sin(t * 11) : 0.1 + open * 0.3; heartMat.emissive.setRGB(g, g * 0.05, 0);
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'spider', handlesDeath: true, weakForward: out => fwdOf(body, 0, 1, 0, out) };
  }

  // ===================================================================== 手吐き(口から長い腕)
  function tehaki() {
    const root = new THREE.Group(); root.name = 'Tehaki';
    const skin = skinMaterial({ base: [196, 186, 170], wounds: 6, blood: 0.55, bruise: 4, seed: 13 });
    const h = human(skin, { torso: 0.8, arm: 1.15, leg: 1.05, shY: 1.95, hipY: 1.0 }); root.add(h.body);
    const hd = head(skin, { sx: 0.12, sy: 0.36, sz: 0.13, cy: 0.3, mouthY: 0.09, mouthW: 0.1, eyeY: 0.4 });
    hd.g.position.set(0, 2.2, 0.04); h.body.add(hd.g);
    add(h.body, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8), skin), 0, 2.08, 0);   // 長い首
    [-1, 1].forEach(s => add(hd.g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.01), BLOOD), s * 0.1, 0.09, 0.1).rotation.z = s * 0.3);   // 裂けた口の端
    // 口から出る腕: 長さ ext で伸びる。先には指の長い手
    const mArm = new THREE.Group(); mArm.position.set(0, 0.07, 0.1); hd.g.add(mArm);
    const tg = new THREE.CylinderGeometry(0.075, 0.09, 1, 8); tg.rotateX(Math.PI / 2); tg.translate(0, 0, 0.5);
    const tube = new THREE.Mesh(tg, mat(0xb09080, 0.35, { map: skin.map })); mArm.add(tube);
    const hand = new THREE.Group(); mArm.add(hand);
    add(hand, ball(0.15, 1, 0.45, 1, skin), 0, 0, 0.05);
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Group(); f.rotation.y = (i - 2) * 0.24; f.position.set((i - 2) * 0.075, 0, 0.08); hand.add(f);
      const up = new THREE.Group(); up.rotation.x = Math.PI / 2; f.add(up); up.add(seg(0.5, 0.032, 0.014, skin));
    }
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.3, 0.3, 2.0, 8), h.body, 0, 1.0, 0),
      head: hitMesh(new THREE.SphereGeometry(0.3, 8, 6), hd.g, 0, 0.3, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.1, 8, 6), hd.g, 0, 0.07, 0.07),
    };
    const MAXLEN = 6.4;
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0, ext: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, tl = p.tilt, ext = p.ext;
      walkPose(h, p, 0.4);
      h.body.rotation.x = -tl * 0.35 + (moving(p) ? 0.06 : 0);                               // のけぞる
      h.body.position.x = Math.sin(t * 40) * 0.012 * tl;
      h.armL.sh.rotation.z = 0.07 + tl * 0.7; h.armR.sh.rotation.z = -0.07 - tl * 0.7;       // 腕を広げる
      hd.g.rotation.x = -tl * 0.6;
      const open = Math.min(1.4, tl * 0.5 + ext * 0.95 + p.jaw * 0.2);
      hd.jaw.rotation.x = open; hd.cav.visible = open > 0.15; hd.cav.scale.set(1.2, 0.8 + open, 1.2);
      mArm.rotation.x = tl * 0.95 + 0.12; mArm.rotation.y = Math.sin(t * 3) * 0.06 * ext;
      const L = ext * MAXLEN; tube.scale.z = Math.max(0.001, L); hand.position.z = L;
      mArm.visible = ext > 0.02; hand.visible = ext > 0.1;
      const g = G ? 0.5 + 0.4 * Math.sin(t * 11) : 0; WET.emissive.setRGB(g, g * 0.1, 0);
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'tehaki', handlesDeath: false, weakForward: out => fwdOf(hd.g, 0, 0, 1, out) };
  }

  // ===================================================================== 吐き袋(酸を吐く)
  function hakibukuro() {
    const root = new THREE.Group(); root.name = 'Hakibukuro';
    const skin = skinMaterial({ base: [168, 190, 150], wounds: 4, blood: 0.3, bruise: 6, seed: 17 });
    const bellyMat = mat(0xa8c890, 0.3, { transparent: true, opacity: 0.82 });
    const sacMat = mat(0x66ff22, 0.3, { emissive: 0x1a5a08 });
    const h = human(skin, { torso: 0.65, arm: 0.95, armT: 0.8, leg: 1.0, legT: 0.85, shY: 1.8, hipY: 0.95 }); root.add(h.body);
    const hd = head(skin, { sx: 0.14, sy: 0.19, sz: 0.15, cy: 0.16, mouthY: 0.06, mouthW: 0.14, eyeY: 0.21 });
    hd.g.position.set(0, 1.95, 0.08); h.body.add(hd.g);
    const belly = new THREE.Group(); belly.position.set(0, 1.18, 0.2); h.body.add(belly);          // 透ける、大きな腹
    belly.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 11), bellyMat));
    const sac = add(belly, ball(0.28, 1, 1, 1, sacMat), 0, 0, 0.04);                                // 酸の袋(弱点)
    [[0.2, 0.2, 0.1], [-0.22, -0.1, 0.12], [0.1, -0.28, 0.2], [-0.12, 0.28, 0.2]].forEach(([x, y, z]) => add(belly, ball(0.1, 1, 0.8, 1, mat(0x7a3a3a, 0.4)), x, y, z));
    for (let i = 0; i < 6; i++) { const v = seg(0.5, 0.008, 0.004, mat(0x3a5a2a, 0.5)); v.position.set(0, -0.2, 0.45); v.rotation.set(0.2 + i * 0.2, 0, (i - 3) * 0.45); belly.add(v); }
    [-0.03, 0.01, 0.04].forEach((x, i) => { const L = 0.08 + i * 0.05, d = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, L, 5), mat(0x88ff30, 0.2, { emissive: 0x2a6010 })); d.position.set(x, -0.04 - L / 2, 0.1); hd.jaw.add(d); });
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.55, 0.55, 1.7, 8), h.body, 0, 1.0, 0.1),
      head: hitMesh(new THREE.SphereGeometry(0.24, 8, 6), hd.g, 0, 0.16, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.3, 8, 6), belly, 0, 0, 0.04),
    };
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0, ext: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, ext = p.ext, tl = p.tilt;
      walkPose(h, p, 0.3);
      belly.scale.setScalar(1 + ext * 0.75);                                                      // 吐く前に、腹が倍近くまでふくらむ
      belly.position.x = Math.sin(t * 50) * 0.02 * ext; belly.position.y = 1.18 + Math.sin(t * 43) * 0.012 * ext;
      h.body.rotation.x = -tl * 0.25;
      hd.g.rotation.x = -tl * 0.75;                                                               // のけぞって口を開ける
      const open = Math.min(1.2, tl * 0.6 + (p.state === 'act' ? 0.7 : 0));
      hd.jaw.rotation.x = open; hd.cav.visible = open > 0.15;
      bellyMat.opacity = 0.82 - p.jaw * 0.38;                                                     // 腹がしぼむと、袋が透けて見える
      const g = 0.25 + ext * 0.5 + (G ? 0.3 + 0.2 * Math.sin(t * 11) : 0); sacMat.emissive.setRGB(g * 0.35, g, g * 0.1);
      sac.scale.setScalar(1 + Math.sin(t * 6) * 0.05 * (0.5 + ext));
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'hakibukuro', handlesDeath: false, weakForward: out => fwdOf(h.body, 0, 0, 1, out) };
  }

  // ===================================================================== 髪食い(天井から髪を振り回す)
  function kamikui() {
    const root = new THREE.Group(); root.name = 'Kamikui'; root.scale.setScalar(0.8);
    const flip = new THREE.Group(); flip.rotation.x = Math.PI; root.add(flip);                      // 逆さ: 足が天井、頭が下
    const skin = skinMaterial({ base: [220, 214, 206], wounds: 3, blood: 0.4, bruise: 3, seed: 19 });
    const hairMat = mat(0x070707, 1, { side: THREE.DoubleSide });
    const h = human(skin, { torso: 0.75, arm: 1.2, armT: 0.8, leg: 1.1, legT: 0.8, shY: 1.8, hipY: 1.0 }); flip.add(h.body);
    const hd = head(skin, { sx: 0.13, sy: 0.2, sz: 0.14, cy: 0.18, mouthY: 0.07, mouthW: 0.13, eyeY: 0.24 });
    hd.g.position.set(0, 2.0, 0.06); h.body.add(hd.g);
    const strands = [];                                                                             // 床まで垂れる長い髪(頭から +y 方向)
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.cos(a) * 0.11, 2.0 + 0.3, Math.sin(a) * 0.1); h.body.add(g);
      const s = seg(1, 0.012, 0.004, hairMat); g.add(s); strands.push({ g, s, a, k: hash(i, 4, 2) });
    }
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.32, 0.32, 1.7, 8), h.body, 0, 1.0, 0),
      head: hitMesh(new THREE.SphereGeometry(0.24, 8, 6), hd.g, 0, 0.18, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.12, 8, 6), hd.g, 0, 0.07, 0.1),
    };
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0, ext: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, ext = p.ext, tl = p.tilt, dead = p.state === 'dead';
      walkPose(h, p, 0.25);
      h.armL.sh.rotation.z = 0.2 + tl * 0.9; h.armR.sh.rotation.z = -0.2 - tl * 0.9;
      hd.g.rotation.x = tl * 0.3; hd.jaw.rotation.x = p.jaw * 1.1; hd.cav.visible = p.jaw > 0.15;
      strands.forEach(({ g, s, a, k }) => {                                                         // 振りかぶり: 髪が逆立って広がる → 攻撃: 大きくなぎ払う
        const spread = 0.12 + ext * 0.85, sway = Math.sin(t * (4 + ext * 9) + k * 6.3) * (0.08 + ext * 0.5);
        g.rotation.z = -Math.cos(a) * spread + sway; g.rotation.x = Math.sin(a) * spread + Math.cos(t * 6 + k * 5) * ext * 0.35;
        s.scale.y = 1.5 + ext * 1.5 + k * 0.4;
      });
      flip.rotation.x += ((dead ? Math.PI * 0.55 : Math.PI) - flip.rotation.x) * 0.1; flip.position.y = dead ? 1.0 : 0;
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'kamikui', handlesDeath: true, weakForward: out => fwdOf(hd.g, 0, 0, 1, out) };
  }

  // ===================================================================== 腹割れ(腹が縦に裂けて、子を産む)
  function harawari() {
    const root = new THREE.Group(); root.name = 'Harawari';
    const skin = skinMaterial({ base: [198, 176, 164], wounds: 9, blood: 0.7, bruise: 6, seed: 23 });
    const heartMat = mat(0x9a1428, 0.25, { emissive: 0x300008 });
    const h = human(skin, { torso: 1.55, torsoH: 0.95, arm: 0.8, armT: 1.5, leg: 0.8, legT: 1.5, shY: 1.75, hipY: 0.8 }); root.add(h.body);
    const hd = head(skin, { sx: 0.17, sy: 0.22, sz: 0.18, cy: 0.18, mouthY: 0.05, mouthW: 0.13, eyeY: 0.2 });
    hd.g.position.set(0, 1.78, 0.1); h.body.add(hd.g);
    // 裂けた腹: 左右の肉の扉が開くと、中の赤い腔と心臓と、産まれる子の腕がのぞく
    const cav = add(h.body, ball(0.45, 0.9, 1.5, 0.7, mat(0x4a0808, 0.4)), 0, 1.15, 0.22);
    const heart = add(h.body, ball(0.14, 1, 1, 1, heartMat), 0, 1.22, 0.36);
    [[-0.2, 0.95, 0.34], [0.2, 0.9, 0.34], [0, 0.78, 0.38], [-0.12, 1.4, 0.34]].forEach(([x, y, z]) => add(h.body, ball(0.08, 1.3, 0.8, 1, WET), x, y, z));
    const baby = new THREE.Group(); baby.position.set(0.12, 1.0, 0.4); h.body.add(baby);
    baby.add(segDown(0.2, 0.03, 0.02, skin)); const bh = add(baby, ball(0.03, 1, 1.3, 0.6, skin), 0, -0.2, 0);
    const flaps = [-1, 1].map(s => {
      const g = new THREE.Group(); g.position.set(s * 0.5, 1.15, 0.3); h.body.add(g);
      add(g, ball(0.5, 0.55, 1.0, 0.5, skin), -s * 0.28, 0, 0.0);
      for (let i = 0; i < 7; i++) { const c = cone(0.012, 0.07, tooth()); c.rotation.z = -s * Math.PI / 2; add(g, c, -s * 0.55, -0.45 + i * 0.15, 0.06); }   // 裂け目のふちに並ぶ歯
      add(g, ball(0.06, 1, 1.4, 0.5, WET), -s * 0.52, 0, 0.1);
      return { g, s };
    });
    const hit = {
      body: hitMesh(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 8), h.body, 0, 1.0, 0),
      head: hitMesh(new THREE.SphereGeometry(0.26, 8, 6), hd.g, 0, 0.18, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.2, 8, 6), h.body, 0, 1.22, 0.36),
    };
    let P = { state: 'wander', walk: 0, tilt: 0, jaw: 0, ext: 0 }, G = false, F = 0;
    function apply(p, glowOn, flash) { P = p; G = glowOn; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, ext = p.ext, tl = p.tilt;
      walkPose(h, p, 0.3);
      h.body.rotation.x = tl * 0.45;                                                              // 体を折って、腹を突き出す
      h.body.position.x = Math.sin(t * 38) * 0.015 * tl;
      hd.g.rotation.x = 0.45 + tl * 0.4; hd.jaw.rotation.x = 0.1 + tl * 0.5; hd.cav.visible = hd.jaw.rotation.x > 0.3;
      flaps.forEach(({ g, s }) => { g.rotation.y = -s * ext * 1.25; });                           // 腹が大きく開く
      heart.scale.setScalar(1 + (0.5 + 0.5 * Math.sin(t * (ext > 0.5 ? 9 : 5))) * 0.15);
      baby.rotation.z = Math.sin(t * 7) * 0.4 * ext; baby.visible = ext > 0.3;
      const g = G ? 0.5 + 0.4 * Math.sin(t * 11) : 0.1 + ext * 0.3; heartMat.emissive.setRGB(g, g * 0.04, 0.02);
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'harawari', handlesDeath: false, weakForward: out => fwdOf(h.body, 0, 0, 1, out) };
  }

  // ===================================================================== 子(赤ん坊の顔をした虫)
  function larva() {
    const root = new THREE.Group(); root.name = 'Larva';
    const skin = skinMaterial({ base: [214, 190, 176], wounds: 2, blood: 0.5, bruise: 2, seed: 29 });
    const segs = [0.14, 0.13, 0.11, 0.09, 0.06].map((r, i) => add(root, ball(r, 1, 0.9, 1.1, skin), 0, 0.14, -0.1 - i * 0.14));
    const hd = head(skin, { sx: 0.1, sy: 0.12, sz: 0.1, cy: 0.1, mouthY: 0.03, mouthW: 0.1, eyeY: 0.14 });
    hd.g.position.set(0, 0.12, 0.1); root.add(hd.g);
    const arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.1, 0.16, 0.0); g.add(segDown(0.16, 0.015, 0.01, skin)); root.add(g); return g; });
    const hit = {
      body: hitMesh(new THREE.SphereGeometry(0.24, 6, 5), root, 0, 0.15, -0.2),
      head: hitMesh(new THREE.SphereGeometry(0.15, 6, 5), hd.g, 0, 0.1, 0),
      weak: hitMesh(new THREE.SphereGeometry(0.08, 6, 5), hd.g, 0, 0.1, 0.05),
    };
    let P = { state: 'chase', walk: 0, tilt: 0, jaw: 0 }, F = 0;
    function apply(p, glowOn, flash) { P = p; F = flash; }
    function update() {
      const t = performance.now() / 1000, p = P, mv = moving(p), sp = mv ? 1 : 0.2;
      segs.forEach((s, i) => { s.position.x = Math.sin(t * 12 * sp + i * 0.9) * 0.05 * sp; });
      hd.g.position.x = Math.sin(t * 12 * sp - 0.9) * 0.04 * sp;
      arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 14 * sp + i * 3) * 0.7 * sp; });
      hd.jaw.rotation.x = 0.3 + Math.abs(Math.sin(t * 9)) * 0.5 * sp; hd.cav.visible = true;
      skin.emissive.setRGB(F * 0.6, 0, 0);
    }
    return { root, hit, apply, update, syncHit() {}, kind: 'larva', handlesDeath: false, weakForward: out => fwdOf(hd.g, 0, 0, 1, out) };
  }

  return { spider, tehaki, hakibukuro, kamikui, harawari, larva };
})());
