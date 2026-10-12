// 見た目(リグ)その1: コードで作る怪物「鼻なし」。外部モデルが無くても、図形の寄せ集めではなく
// 曲面・変形・肌のテクスチャで作った姿を出す。モデルが読み込めないときの代わりにもなる
//
// リグが持つ決まり(rig-gltf.js も同じ形):
//   root          見た目の本体(Object3D)
//   hitRoot       当たり判定の置き場(あれば。ワールド側に付ける)
//   hit           当たり判定の箱 { body, head, weak }(見えないMesh。レイが当たる対象)
//   apply(pose, glowOn, flash)  姿勢を受け取る(pose: state, walk, tilt, jaw …)
//   update(dt)    毎フレーム。アニメーションの再生と当たり判定の追従
//   syncHit()     当たり判定の位置を最新にする(撃つ直前に呼ぶ)
//   weakForward(out)  弱点が向いている方向(正面から狙われたかの判定に使う)
//
// 体の高さは約2.6m。頭の付け根(Head)が高さ2.14m、顎(Jaw)はその少し前。骨の名前は
// Body / LegL / LegR / ArmL / ArmR / Head / Jaw(書き出してモデルにするときもこの名前になる)
const RigProcedural = (() => {
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };

  // ---- 質感の部品: 肌・布・金属・木。傷や血の量を変えられる ----
  const mkRnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const canvas = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const toTex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  // 血の飛び散りと、したたり
  function bloodMarks(g, n, W, rnd, alpha) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * W, r = 6 + rnd() * 26;
      g.fillStyle = `rgba(${90 + rnd() * 40},${8 + rnd() * 10},${8 + rnd() * 10},${Math.min(1, (0.3 + rnd() * 0.35) * alpha)})`;
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.6), rnd() * 3, 0, 7); g.fill();
      for (let k = 0; k < 3; k++) {
        g.fillStyle = `rgba(100,10,10,${Math.min(1, 0.35 * alpha)})`;
        g.beginPath(); g.ellipse(x + (rnd() - 0.5) * r * 2, y + r * 0.5, 1 + rnd() * 3, 6 + rnd() * 30, 0, 0, 7); g.fill();
      }
    }
  }
  // 裂けた傷: 腫れた縁・暗い奥・縫い目・血のしたたり
  function gash(g, x, y, len, ang, rnd) {
    g.lineCap = 'round';
    const dx = Math.cos(ang), dy = Math.sin(ang), pts = [];
    for (let t = 0; t <= 1.001; t += 0.1) pts.push([x + dx * len * t + (rnd() - 0.5) * 5, y + dy * len * t + (rnd() - 0.5) * 5]);
    const path = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
    g.strokeStyle = 'rgba(150,70,70,.55)'; g.lineWidth = 11; path(); g.stroke();
    g.strokeStyle = 'rgba(110,25,25,.9)'; g.lineWidth = 6; path(); g.stroke();
    g.strokeStyle = '#2a0505'; g.lineWidth = 3; path(); g.stroke();
    if (rnd() < 0.6) {
      g.strokeStyle = '#15110f'; g.lineWidth = 1.6;
      for (let t = 0.1; t < 0.95; t += 0.11) { const px = x + dx * len * t, py = y + dy * len * t; g.beginPath(); g.moveTo(px - dy * 8, py + dx * 8); g.lineTo(px + dy * 8, py - dx * 8); g.stroke(); }
    }
    const e = pts[pts.length - 1]; g.fillStyle = 'rgba(100,10,10,.45)'; g.fillRect(e[0] - 2, e[1], 4, 40 + rnd() * 100);
  }
  // 肌: 青白い地に、まだら・毛穴・血管・あざ・傷・血
  function skinTexture(o) {
    o = Object.assign({ base: [181, 175, 162], wounds: 6, blood: 0.5, bruise: 3, veins: 26, seed: 11 }, o);
    const W = 512, c = canvas(W), g = c.getContext('2d'), rnd = mkRnd(o.seed);
    g.fillStyle = `rgb(${o.base})`; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 140; i++) {
      const dk = rnd() < 0.5;
      g.fillStyle = dk ? `rgba(${60 + rnd() * 30},${45 + rnd() * 30},${35 + rnd() * 20},${0.03 + rnd() * 0.08})` : `rgba(235,215,200,${0.03 + rnd() * 0.07})`;
      g.beginPath(); g.arc(rnd() * W, rnd() * W, 8 + rnd() * 50, 0, 7); g.fill();
    }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(40,30,25,${0.04 + rnd() * 0.07})`; g.fillRect(rnd() * W, rnd() * W, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
    g.lineWidth = 1.6;
    for (let i = 0; i < o.veins; i++) {
      g.strokeStyle = `rgba(${90 + rnd() * 40},${40 + rnd() * 20},${60},${0.18 + rnd() * 0.22})`;
      g.beginPath(); let x = rnd() * W, y = rnd() * W; g.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += (rnd() - 0.5) * 80; y += (rnd() - 0.2) * 68; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < o.bruise; i++) {
      const x = rnd() * W, y = rnd() * W, r = 20 + rnd() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(90,50,110,.35)'); gr.addColorStop(1, 'rgba(90,50,110,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < o.wounds; i++) gash(g, rnd() * W, rnd() * W, 50 + rnd() * 90, rnd() * Math.PI, rnd);
    bloodMarks(g, Math.round(o.blood * 14), W, rnd, o.blood + 0.4);
    return toTex(c);
  }
  function bumpTexture(seed) {
    const W = 256, c = canvas(W), g = c.getContext('2d'), rnd = mkRnd(seed || 3);
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 2500; i++) { const v = 90 + rnd() * 80; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(rnd() * W, rnd() * W, 1 + rnd() * 2, 1 + rnd() * 2); }
    g.strokeStyle = 'rgba(60,60,60,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 60; i++) { g.beginPath(); let x = rnd() * W, y = rnd() * W; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
    return toTex(c);
  }
  function skinMaterial(o) {
    return new THREE.MeshStandardMaterial({ map: skinTexture(o), bumpMap: bumpTexture((o && o.seed) || 3), bumpScale: 0.8, roughness: 0.78, emissive: 0 });
  }
  // 布: 織り目・汚れ(裾ほど濃い)・血
  function clothTexture(o) {
    o = Object.assign({ base: [214, 210, 200], blood: 0.5, dirt: 0.5, seed: 21 }, o);
    const W = 512, c = canvas(W), g = c.getContext('2d'), rnd = mkRnd(o.seed);
    g.fillStyle = `rgb(${o.base})`; g.fillRect(0, 0, W, W);
    for (let i = 0; i < W; i += 3) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(i, 0, 1, W); g.fillRect(0, i, W, 1); }
    const gr = g.createLinearGradient(0, 0, 0, W); gr.addColorStop(0, 'rgba(60,40,25,0)'); gr.addColorStop(1, `rgba(60,40,25,${o.dirt * 0.6})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(50,35,20,${0.05 + rnd() * 0.1})`; g.beginPath(); g.arc(rnd() * W, rnd() * W, 6 + rnd() * 40, 0, 7); g.fill(); }
    bloodMarks(g, Math.round(o.blood * 16), W, rnd, o.blood + 0.4);
    return toTex(c);
  }
  // 錆びた金属: 錆・傷・汚れ・血
  function metalTexture(o) {
    o = Object.assign({ base: [90, 76, 62], rust: 0.7, blood: 0.4, seed: 31 }, o);
    const W = 512, c = canvas(W), g = c.getContext('2d'), rnd = mkRnd(o.seed);
    g.fillStyle = `rgb(${o.base})`; g.fillRect(0, 0, W, W);
    for (let i = 0; i < o.rust * 90; i++) { g.fillStyle = `rgba(${140 + rnd() * 30},${60 + rnd() * 25},${20 + rnd() * 10},${0.12 + rnd() * 0.3})`; g.beginPath(); g.ellipse(rnd() * W, rnd() * W, 5 + rnd() * 40, 4 + rnd() * 26, rnd() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 80; i++) { g.strokeStyle = `rgba(200,190,170,${0.05 + rnd() * 0.12})`; g.lineWidth = 1; g.beginPath(); const x = rnd() * W, y = rnd() * W; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 20); g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(15,10,8,${0.08 + rnd() * 0.15})`; g.beginPath(); g.arc(rnd() * W, rnd() * W, 6 + rnd() * 30, 0, 7); g.fill(); }
    bloodMarks(g, Math.round(o.blood * 14), W, rnd, o.blood + 0.4);
    return toTex(c);
  }

  // 球をゆがめて、いびつな頭蓋骨にする(あごに向かって細く、ところどころ凹凸)
  function skullGeometry() {
    const g = new THREE.SphereGeometry(1, 26, 20), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const lower = v.y < 0 ? 1 + v.y * 0.28 : 1;               // あごは細く
      const cheek = (v.y < 0.1 && v.y > -0.55) ? 1 - 0.1 * Math.abs(v.x) : 1; // 頬はこける
      const n = 1 + (hash(v.x, v.y, v.z) - 0.5) * 0.07;
      v.x *= lower * cheek * n; v.z *= lower * n; v.y *= 1 + (hash(v.z, v.x, v.y) - 0.5) * 0.04;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  }

  function create() {
    const root = new THREE.Group(); root.name = 'ProceduralMonster';
    const skinMat = skinMaterial({ wounds: 8, blood: 0.6, bruise: 4, seed: 3 });   // 傷だらけで、血がこびりついた肌
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xcfc8b6, roughness: 0.8, emissive: 0x000000 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xcbbd9f, roughness: 0.55 });   // 黄ばんだ歯
    const dark = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    const ragMat = new THREE.MeshStandardMaterial({ color: 0x2b2924, roughness: 1, side: THREE.DoubleSide });
    const cavMat = new THREE.MeshStandardMaterial({ color: 0x4a0606, emissive: 0x000000, roughness: 0.6 });
    const flesh = [skinMat, boneMat];   // 被弾で赤くなる材質
    const named = (o, n) => { o.name = n; return o; };
    const add = (parent, mesh, x, y, z) => { mesh.position.set(x, y || 0, z || 0); parent.add(mesh); return mesh; };
    const limb = (rt, rb, len, mat) => { const g = new THREE.CylinderGeometry(rt, rb, len, 8); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, mat || skinMat); };
    const ball = (r, sx, sy, sz, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat || skinMat); m.scale.set(sx, sy, sz); return m; };

    const body = named(new THREE.Group(), 'Body'); root.add(body);

    // ---- 胴: 細くくびれた回転体。前後は平たく。肋骨と背骨が浮く ----
    const prof = [[0.001, 0], [0.16, 0.02], [0.15, 0.2], [0.12, 0.45], [0.14, 0.7], [0.2, 0.9], [0.19, 1.0], [0.1, 1.04], [0.001, 1.06]]
      .map(a => new THREE.Vector2(a[0], a[1]));
    const torso = add(body, new THREE.Mesh(new THREE.LatheGeometry(prof, 14), skinMat), 0, 0.95, 0);
    torso.scale.z = 0.7;
    [[1.5, 0.14], [1.58, 0.15], [1.66, 0.16], [1.74, 0.185], [1.82, 0.205]].forEach(([y, r]) => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 5, 18, Math.PI), boneMat);
      rib.rotation.x = Math.PI / 2; rib.scale.set(1, 0.7, 1); rib.position.y = y; body.add(rib);
    });
    for (let i = 0; i < 8; i++) add(body, ball(0.018, 1, 1, 1, boneMat), 0, 1.0 + i * 0.12, -0.085 - Math.min(i, 5) * 0.004);
    // 肩: 盛り上がらせて、猫背に見せる
    add(body, ball(0.06, 1, 0.8, 1), -0.25, 1.9, -0.01); add(body, ball(0.06, 1, 0.8, 1), 0.25, 1.9, -0.01);

    // ---- 首: 前に伸びる曲がった管 ----
    const neck = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.95, -0.01), new THREE.Vector3(0, 2.05, 0.025), new THREE.Vector3(0, 2.14, 0.05)]), 8, 0.045, 8), skinMat);
    body.add(neck);

    // ---- 頭: いびつな頭蓋。鼻はなく、黒い眼窩。口に歯 ----
    const head = named(new THREE.Group(), 'Head'); head.position.set(0, 2.14, 0.04); body.add(head);
    const skull = add(head, new THREE.Mesh(skullGeometry(), skinMat), 0, 0.2, 0.0);
    skull.scale.set(0.16, 0.27, 0.19);
    [-0.062, 0.062].forEach(x => {
      add(head, ball(0.05, 0.9, 1.25, 0.7, dark), x, 0.28, 0.135);
      add(head, ball(0.007, 1, 1, 1, new THREE.MeshBasicMaterial({ color: 0x9aa39a })), x * 1.02, 0.275, 0.178); // 眼窩の奥の小さな光
    });
    // 鼻の位置は、わずかな窪みだけ(鼻はない)
    add(head, ball(0.02, 1, 1.4, 0.4, dark), 0, 0.17, 0.176).material = new THREE.MeshStandardMaterial({ color: 0x6f695d, roughness: 1 });
    const slit = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.02), dark), 0, 0.088, 0.152);
    const cavity = add(head, ball(0.075, 1.1, 1, 1, cavMat), 0, 0.05, 0.1);
    cavity.visible = false;
    // 上の歯
    for (let i = -4; i <= 4; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.035 + (hash(i, 1, 2) * 0.015), 4), toothMat);
      t.rotation.x = Math.PI; add(head, t, i * 0.014, 0.075, 0.148 - i * i * 0.0004);
    }
    // 下あご(開くとき、ここが回る)
    const jaw = named(new THREE.Group(), 'Jaw'); jaw.position.set(0, 0.08, 0.04); head.add(jaw);
    add(jaw, ball(0.065, 1, 0.6, 1.5, skinMat), 0, -0.035, 0.08);
    for (let i = -3; i <= 3; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03 + (hash(i, 3, 4) * 0.015), 4), toothMat);
      add(jaw, t, i * 0.014, 0.002, 0.125 - i * i * 0.0005);
    }

    // ---- 腕: 肩・肘・手首。地面近くまで届く長さ。指は長く細い ----
    const arms = {};
    const mkArm = (sx, n) => {
      const sh = named(new THREE.Group(), n); sh.position.set(sx, 1.88, 0); body.add(sh);
      sh.add(limb(0.05, 0.036, 0.8));
      const el = new THREE.Group(); el.position.y = -0.8; el.rotation.x = -0.2; sh.add(el);
      add(el, ball(0.04, 1, 1, 1));
      el.add(limb(0.034, 0.024, 0.8));
      const hand = new THREE.Group(); hand.position.y = -0.8; el.add(hand);
      add(hand, ball(0.035, 1, 1.3, 0.6));
      [-0.028, -0.009, 0.009, 0.028].forEach((x, i) => {
        const f = limb(0.008, 0.004, 0.2 - (i === 0 || i === 3 ? 0.03 : 0), skinMat);
        f.position.set(x, -0.03, 0); f.rotation.x = 0.12 + hash(i, sx, 5) * 0.2; f.rotation.z = (i - 1.5) * 0.05; hand.add(f);
      });
      const th = limb(0.009, 0.004, 0.11, skinMat); th.position.set(sx < 0 ? 0.04 : -0.04, -0.02, 0.01); th.rotation.z = sx < 0 ? -0.6 : 0.6; hand.add(th);
      arms[n] = { sh, el }; return sh;
    };
    const armL = mkArm(-0.27, 'ArmL'), armR = mkArm(0.27, 'ArmR');

    // ---- 脚: 腿・膝・すね・つま先。膝は鳥のように後ろへ曲がる ----
    const legs = {};
    const mkLeg = (x, n) => {
      const hip = named(new THREE.Group(), n); hip.position.set(x, 0.95, 0); body.add(hip);
      hip.add(limb(0.06, 0.044, 0.5));
      const knee = new THREE.Group(); knee.position.y = -0.5; hip.add(knee);
      add(knee, ball(0.045, 1, 1, 1));
      knee.add(limb(0.04, 0.026, 0.5));
      const foot = add(knee, ball(0.04, 0.8, 0.4, 2.2), 0, -0.5, 0.05);
      legs[n] = { hip, knee, foot }; return hip;
    };
    const legL = mkLeg(-0.11, 'LegL'), legR = mkLeg(0.11, 'LegR');

    // ---- ボロ布: 腰から垂れて、歩くと揺れる ----
    const rags = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const g = new THREE.PlaneGeometry(0.1, 0.4 + hash(i, 7, 8) * 0.25); g.translate(0, -g.parameters.height / 2, 0);
      const r = new THREE.Mesh(g, ragMat);
      r.position.set(Math.sin(a) * 0.15, 1.0, Math.cos(a) * 0.1); r.rotation.y = a; body.add(r); rags.push(r);
    }

    // ---- 傷と血: 皮がめくれて肉がのぞく。口から血がしたたる ----
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x6a0a0a, roughness: 0.15, emissive: 0 });
    const fleshMat = new THREE.MeshStandardMaterial({ color: 0x8c2a2a, roughness: 0.3, emissive: 0 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x4e1a14, roughness: 0.6, emissive: 0 });
    flesh.push(bloodMat, fleshMat, rimMat);
    const patch = (parent, x, y, z, r, th) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = th;
      g.add(ball(r * 1.25, 1.1, 1, 0.22, rimMat)); const fl = ball(r, 1, 0.9, 0.3, fleshMat); fl.position.z = 0.012; g.add(fl);
      for (let i = -1; i <= 1; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, r * 1.5, 4), boneMat); t.position.set(i * r * 0.3, 0, 0.04); t.rotation.z = i * 0.2; g.add(t); }
      parent.add(g); return g;
    };
    patch(body, 0.1, 1.62, 0.1, 0.06, 0.55); patch(body, -0.08, 1.28, 0.095, 0.05, -0.6);
    patch(body, 0.0, 1.45, -0.1, 0.055, Math.PI); patch(body, -0.26, 1.88, 0.03, 0.045, -1.4);
    patch(legR, 0.02, -0.25, 0.05, 0.04, 0);
    [-0.04, -0.015, 0.02, 0.045].forEach((x, i) => {
      const L = 0.05 + hash(i, 9, 9) * 0.1, d = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, L, 5), bloodMat);
      d.position.set(x, -0.02 - L / 2, 0.12); jaw.add(d);
      const b = ball(0.009, 1, 1.3, 1, bloodMat); b.position.set(x, -0.02 - L, 0.12); jaw.add(b);
    });
    add(jaw, ball(0.05, 1, 0.4, 1.2, bloodMat), 0, -0.055, 0.1);

    // ---- 当たり判定(見えない) ----
    const mk = (g, parent, x, y, z) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set(x, y, z); parent.add(m); return m; };
    const hit = {
      body: mk(new THREE.CylinderGeometry(0.34, 0.34, 2.0, 8), body, 0, 1.0, 0),
      head: mk(new THREE.SphereGeometry(0.3, 8, 6), head, 0, 0.2, 0),
      weak: mk(new THREE.SphereGeometry(0.13, 8, 6), head, 0, 0.07, 0.16),
    };

    const _q = new THREE.Quaternion();
    function apply(p, glowOn, flash) {
      const sw = Math.sin(p.walk), t = performance.now() / 1000;
      const moving = p.state === 'wander' || p.state === 'chase' || p.state === 'lunge';
      const amp = moving ? (p.state === 'lunge' ? 0.9 : 0.5) : 0;
      // 脚: 腿を振り、膝を後ろへ曲げる
      legL.rotation.x = sw * amp; legR.rotation.x = -sw * amp;
      legs.LegL.knee.rotation.x = 0.18 + Math.max(0, -sw) * amp * 0.9;
      legs.LegR.knee.rotation.x = 0.18 + Math.max(0, sw) * amp * 0.9;
      legs.LegL.foot.rotation.x = -legs.LegL.knee.rotation.x * 0.6; legs.LegR.foot.rotation.x = -legs.LegR.knee.rotation.x * 0.6;
      // 腕: だらりと下げて、歩きに合わせて遅れて揺れる。止まっていても、わずかに揺れる
      const idle = moving ? 0 : Math.sin(t * 1.3) * 0.03;
      armL.rotation.x = -sw * amp * 0.5 + 0.05 + idle; armR.rotation.x = sw * amp * 0.5 + 0.05 - idle;
      armL.rotation.z = 0.07; armR.rotation.z = -0.07;
      arms.ArmL.el.rotation.x = -0.2 - Math.abs(sw) * amp * 0.35 + idle; arms.ArmR.el.rotation.x = -0.2 - Math.abs(sw) * amp * 0.35 - idle;
      body.position.y = moving ? Math.abs(sw) * 0.04 : 0;
      body.rotation.x = p.state === 'lunge' ? 0.5 : (moving ? 0.16 : 0.1); // 猫背
      rags.forEach((r, i) => { r.rotation.x = Math.sin(t * 2 + i * 1.7) * 0.08 + (moving ? 0.18 + Math.abs(sw) * 0.2 : 0.03); });
      head.rotation.z = p.tilt * 0.65; head.rotation.x = -p.tilt * 0.16; // tilt は 0〜1(予兆の強さ)
      jaw.rotation.x = p.jaw * 0.95;
      const open = p.jaw > 0.15;
      cavity.visible = open; slit.visible = !open;
      cavity.scale.set(1.1, 0.6 + p.jaw * 0.9, 1);
      // 口の中は、観測済み(または録画の再生)のときだけ赤く光る
      const glow = glowOn ? 0.6 + 0.4 * Math.sin(performance.now() / 90) : 0;
      cavMat.emissive.setRGB(glow, glow * 0.05, 0);
      flesh.forEach(m => m.emissive.setRGB(flash * 0.6, 0, 0));
    }
    function weakForward(out) { head.getWorldQuaternion(_q); return out.set(0, 0, 1).applyQuaternion(_q); }

    return { root, hit, apply, update() {}, syncHit() {}, weakForward, kind: 'procedural' };
  }
  // 他の怪物の見た目(rig-creatures.js)でも使う部品
  return { create, kit: { hash, skinTexture, skullGeometry, bumpTexture, skinMaterial, clothTexture, metalTexture, bloodMarks, mkRnd, canvas, toTex } };
})();
