'use strict';
// ====== 工房（注ぐ・こねる・見た目の変化）======
const Workshop = (function () {
  const T = THREE;
  let ws = null, grp, bowlBottom = 1.0, mixColorHex = '#eef5fa';
  let bowlM, liquid, blob, blobBase, bubbles = [], bottle, bottleBody, stream, spoon, parts = [];
  let H = null;            // 画面(HTML)の要素
  let hudT = 0, pourTilt = 0, lastLook = new T.Vector3(), camInit = false;
  const st = { active: false, hold: null, holdT: 0, shotT: 0, stirring: false, spoonA: 0,
    solid: 0, hard: 0, sticky: 0, foam: 0, ooze: 0, bouncy: 0, melt: 0, sq: 0, sqv: 0, flow: 0 };
  const hexC = h => new T.Color(h);
  const GEO_CYL = () => new T.CylinderGeometry(1, 1, 1, 10);
  const bowlCap = () => BOWL_CAP[S.up.bowl].v;

  function noiseTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const v = 90 + Math.random() * 90 | 0; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 5, 0, 6.3); g.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 2); return t;
  }
  const link = (mesh, A, B, r) => {   // 2点をむすぶ棒
    const d = new T.Vector3().subVectors(B, A), len = d.length();
    mesh.position.copy(A).addScaledVector(d, 0.5); mesh.scale.set(r, Math.max(len, 0.001), r);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  };
  let strand, drips = [], bounceT = 0, rimM = null;
  // さわる（やわらかい体のシミュレーション）：頂点ごとのずれ disp とそのはやさ vel
  let disp = null, vel = null, grab = null, touchExit = null, tapInfo = null;
  const raycaster = new T.Raycaster(), tmpV = new T.Vector3();
  function rayFrom(e) {
    const r = e.target.getBoundingClientRect();
    raycaster.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), World.camera);
    return raycaster;
  }
  function hitBlob(e) {
    if (!blob.visible) return null;
    blob.updateMatrixWorld(); blob.geometry.computeBoundingSphere();
    const h = rayFrom(e).intersectObject(blob)[0];
    return h ? { world: h.point.clone(), local: blob.worldToLocal(h.point.clone()) } : null;
  }
  const softK = () => clamp(35 + 100 * st.bouncy - 28 * st.ooze - 24 * st.sticky + 200 * st.hard, 6, 400);
  const softC = () => clamp(5 - 2.6 * st.bouncy + 0.5 * st.ooze + 2 * st.sticky + 20 * st.hard, 1.1, 40);
  const maxStretch = () => clamp(0.55 + 2.6 * st.ooze + 0.6 * st.sticky - 0.2 * st.bouncy - 0.3 * st.foam - 2 * st.hard, 0.05, 3.2);
  function poke(h) {   // つつく：へこんで、もどる
    if (!disp) return;
    const R = 0.55, str = 7 * (1 - 0.9 * st.hard);
    for (let i = 0; i < disp.length / 3; i++) {
      const bx = blobBase[i * 3], by = blobBase[i * 3 + 1], bz = blobBase[i * 3 + 2];
      const d = Math.hypot(bx - h.local.x, by - h.local.y, bz - h.local.z), wgt = Math.exp(-(d * d) / (R * R * 0.5));
      if (wgt < 0.02) continue;
      vel[i * 3] -= bx * wgt * str; vel[i * 3 + 1] -= by * wgt * str; vel[i * 3 + 2] -= bz * wgt * str;
    }
    sfx(st.hard > 0.5 ? 'tick' : 'pop');
  }
  function stepSoft(dt) {   // ばね：ひっぱっている間は手に近づき、はなすと元にもどる
    const n = disp.length / 3, kk = softK(), cc = softC();
    let D = null, Hl = null, Rl = 0.7;
    if (grab) {
      D = grab.D; Hl = grab.local;
      const len = D.length(), lim = maxStretch(); if (len > lim) D = D.clone().multiplyScalar(lim / len);
      Rl = (0.62 - 0.1 * st.bouncy) / (1 + 0.9 * Math.min(len, lim) * (0.4 + st.ooze * 2));
      grab.shown = D;
    }
    const sub = Math.max(1, Math.ceil(dt / 0.008)), h = dt / sub;
    for (let s = 0; s < sub; s++) for (let i = 0; i < n; i++) {
      let tx = 0, ty = 0, tz = 0, k2 = kk, c2 = cc;
      if (grab) {
        const bx = blobBase[i * 3], by = blobBase[i * 3 + 1], bz = blobBase[i * 3 + 2];
        const d = Math.hypot(bx - Hl.x, by - Hl.y, bz - Hl.z), wgt = Math.exp(-(d * d) / (Rl * Rl));
        if (wgt > 0.01) { tx = D.x * wgt; ty = D.y * wgt; tz = D.z * wgt; k2 = Math.max(kk, 70 * wgt); c2 = Math.max(cc, 8 * wgt); }
      }
      for (let a = 0; a < 3; a++) {
        const j = i * 3 + a, tg = a === 0 ? tx : a === 1 ? ty : tz;
        vel[j] += (-k2 * (disp[j] - tg) - c2 * vel[j]) * h; disp[j] += vel[j] * h;
      }
    }
  }

  function build(scene, shopArea, h) {
    ws = shopArea.ws; grp = new T.Group(); shopArea.group.add(grp);
    const cx = ws.x, cz = ws.z + 0.1, top = 1.0;
    bowlBottom = top + 0.04;
    // ボウル
    bowlM = new T.Mesh(new T.CylinderGeometry(0.78, 0.6, 0.6, 36, 1, true), new T.MeshPhysicalMaterial({ color: 0xe9f6ff, transparent: true, opacity: 0.3, side: T.DoubleSide, roughness: 0.05, depthWrite: false, envMap: World.env, envMapIntensity: 0.9 }));
    bowlM.position.set(cx, top + 0.3, cz); grp.add(bowlM);
    const bb = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 0.04, 36), new T.MeshStandardMaterial({ color: 0xd8ecf8, transparent: true, opacity: 0.6 })); bb.position.set(cx, top + 0.02, cz); grp.add(bb);
    const rim = rimM = new T.Mesh(new T.TorusGeometry(0.78, 0.025, 8, 40), new T.MeshStandardMaterial({ color: 0xffffff })); rim.rotation.x = Math.PI / 2; rim.position.set(cx, top + 0.6, cz); grp.add(rim);
    // 液体
    liquid = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 36), new T.MeshPhysicalMaterial({ color: 0xeef5fa, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92, envMap: World.env, envMapIntensity: 0.6 }));
    liquid.castShadow = true;
    liquid.position.set(cx, bowlBottom, cz); grp.add(liquid);
    // スライム（球をゆらす）
    const bg = new T.SphereGeometry(1, 40, 28);
    blobBase = Float32Array.from(bg.attributes.position.array);
    blob = new T.Mesh(bg, new T.MeshPhysicalMaterial({ color: 0xeef5fa, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1, envMap: World.env, envMapIntensity: 0.7, bumpMap: noiseTex(), bumpScale: 0, transparent: true }));
    blob.castShadow = true;
    blob.position.set(cx, bowlBottom + 0.2, cz); blob.visible = false; grp.add(blob);
    // あわ
    for (let i = 0; i < 36; i++) {
      const b = new T.Mesh(new T.SphereGeometry(1, 12, 10), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, roughness: 0.05, clearcoat: 1, envMap: World.env, envMapIntensity: 1.6 }));
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.9 + 0.05);
      b.userData = { th, ph, s: 0.09 + Math.random() * 0.09, k: i / 36 }; b.visible = false; grp.add(b); bubbles.push(b);
    }
    // 注ぐボトル
    bottle = new T.Group(); bottle.visible = false; grp.add(bottle);
    bottleBody = new T.Group(); bottle.add(bottleBody);
    stream = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 10), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.9 }));
    stream.visible = false; grp.add(stream);
    // ヘラ
    spoon = new T.Group(); h.box(0.06, 1.1, 0.06, 0xc79a5c, 0, 0.55, 0, spoon); const hd = h.sph(0.16, 0xc79a5c, 0, 0.0, 0, spoon); hd.scale.set(0.16, 0.05, 0.1);
    spoon.visible = false; grp.add(spoon);
    disp = new Float32Array(bg.attributes.position.count * 3); vel = new Float32Array(disp.length);
    strand = new T.Mesh(GEO_CYL(), blob.material); strand.visible = false; grp.add(strand);
    for (let i = 0; i < 5; i++) { const d = new T.Group(), c = new T.Mesh(GEO_CYL(), blob.material), s = new T.Mesh(new T.SphereGeometry(1, 10, 8), blob.material); d.add(c, s); d.userData = { c, s, a: i * 1.26 + 0.3 }; d.visible = false; grp.add(d); drips.push(d); }
    grp.traverse(o => { if (o.isMesh && o !== bowlM) o.castShadow = o.castShadow || false; });
    // 粒（ラメ・絵具）
    for (let i = 0; i < 40; i++) {
      const p = new T.Mesh(new T.SphereGeometry(0.035, 6, 5), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000 })); p.visible = false; p.userData = { v: 0 }; grp.add(p); parts.push(p);
    }
    // 飾り（机の上）
    const cols = [0xff9bb5, 0x9ad0ff, 0xffe27a, 0xa6e8b5];
    cols.forEach((c, i) => { const bt = h.cyl(0.14, 0.4, c, cx - 2.1 + i * 0.5, top + 0.25, cz - 0.8, grp); h.cyl(0.06, 0.12, 0xffffff, cx - 2.1 + i * 0.5, top + 0.5, cz - 0.8, grp); });
    h.cyl(0.3, 0.55, 0xbfe3ff, cx + 2.0, top + 0.3, cz - 0.4, grp, { transparent: true, opacity: 0.7 });
    h.box(0.5, 0.04, 0.4, 0xffffff, cx + 1.9, top + 0.02, cz + 0.6, grp);
  }

  function makeBottle(id) {
    while (bottleBody.children.length) bottleBody.remove(bottleBody.children[0]);
    const lathe = (pts) => new T.LatheGeometry(pts.map(p => new T.Vector2(Math.max(p[0], 0.0005), p[1])), 20);
    const bottleGeo = (R, Hh, rn, hn) => lathe([[0, 0], [R * 0.75, 0.005], [R * 0.96, 0.045], [R, 0.11], [R, Hh * 0.62], [R * 0.93, Hh * 0.8], [rn * 1.5, Hh * 0.93], [rn, Hh], [rn, Hh + hn], [rn * 0.5, Hh + hn + 0.005], [0, Hh + hn + 0.005]]);
    const it = ITEMS[id], c = hexC(it.color), M = (col, o) => new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.4 }, o || {}));
    const add = (geo, mat, x, y, z) => { const me = new T.Mesh(geo, mat); me.position.set(x, y, z); bottleBody.add(me); return me; };
    if (it.kind === 'paint') { add(new T.CylinderGeometry(0.1, 0.1, 0.55, 12), M(c), 0, -0.3, 0); add(new T.CylinderGeometry(0.1, 0.04, 0.1, 12), M(0xdddddd), 0, -0.02, 0); add(new T.BoxGeometry(0.24, 0.1, 0.03), M(0xffffff), 0, -0.52, 0); }
    else if (it.kind === 'glitter') { add(new T.CylinderGeometry(0.17, 0.17, 0.45, 14), M(0xffffff, { transparent: true, opacity: 0.5 }), 0, -0.25, 0); add(new T.CylinderGeometry(0.15, 0.15, 0.3, 14), M(c, { emissive: c, emissiveIntensity: 0.4 }), 0, -0.3, 0); add(new T.CylinderGeometry(0.1, 0.17, 0.1, 14), M(0xcccccc), 0, 0.0, 0); }
    else if (it.kind === 'water') { add(bottleGeo(0.25, 0.5, 0.13, 0.12), M(c, { transparent: true, opacity: 0.6, roughness: 0.1 }), 0, -0.62, 0); }
    else { add(bottleGeo(0.21, 0.55, 0.075, 0.12), M(c, { roughness: 0.25 }), 0, -0.67, 0); add(new T.CylinderGeometry(0.09, 0.09, 0.07, 14), M(0xffffff), 0, 0.03, 0); const lb = add(new T.CylinderGeometry(0.212, 0.212, 0.26, 20, 1, true, -0.9, 1.8), M(it.kind === 'borax' ? 0x4aa0e0 : it.kind === 'soap' ? 0xff9bb5 : 0x62d6a8, { side: T.DoubleSide }), 0, -0.4, 0); }
  }

  // ---------- 入退場 ----------
  function enter() {
    st.active = true; camInit = false; st.hold = null;
    document.getElementById('ws').style.display = 'flex';
    buildHUD(); spoon.visible = true; refreshHUD();
    const rd = document.getElementById('wsRead'); rd.classList.toggle('mini', matchMedia('(max-width: 820px)').matches);
    if (!rd._tog) { rd._tog = true; rd.addEventListener('click', () => { if (matchMedia('(max-width: 820px)').matches) rd.classList.toggle('mini'); }); }
  }
  function touch(sl, onExit) {      // できあがったスライムをさわる
    st.touch = sl; touchExit = onExit || null; st.active = true; camInit = false; st.hold = null; st.stirring = false; grab = null;
    disp.fill(0); vel.fill(0); st.solid = 0; st.sq = st.sqv = 0;
    document.getElementById('ws').style.display = 'none';
    const tr = sl.traits || {}, lines = [];
    if (tr.nettori) lines.push('🧶 よくのびる！ つかんで ひっぱってみよう');
    if (tr.danryoku) lines.push('🟢 つつくとぷるぷる、ぼよんと跳ね返る');
    if (tr.torotoro) lines.push('💦 とろとろ流れる。ひっぱるとゆっくりもどる');
    if (tr.fuwafuwa) lines.push('☁️ ふわふわ。ぎゅっと押すと、やわらかく沈む');
    if (!lines.length) lines.push('🙂 ふつうのやわらかさ。つついたり、ひっぱったり');
    const box = document.getElementById('wsTouch');
    box.querySelector('.tn').textContent = sl.name || 'スライム';
    box.querySelector('.tl').innerHTML = lines.join('<br>') + '<br><small>つつく・つまんでのばす・ふりまわす</small>';
    box.style.display = 'flex';
  }
  function exitTouch(silent) {
    st.touch = null; st.active = false; grab = null; disp.fill(0); vel.fill(0);
    document.getElementById('wsTouch').style.display = 'none';
    World.place(World.areas.shop.ws.x, World.areas.shop.ws.z + 2.6, Math.PI);
    const cb = touchExit; touchExit = null; if (cb && !silent) cb();
  }
  function exit(force) {
    if (st.touch) { exitTouch(force); return; }
    if (!st.active) return;
    st.active = false; stopPour(); st.stirring = false;
    document.getElementById('ws').style.display = 'none'; bottle.visible = false; stream.visible = false; spoon.visible = false;
    World.place(World.areas.shop.ws.x, World.areas.shop.ws.z + 2.6, Math.PI);
  }

  // ---------- 注ぐ ----------
  function startPour(id) {
    if (!st.active) return;
    const it = ITEMS[id]; if (!it.free && (S.stock[id] || 0) <= 0.0001) { UI.toast(`${it.name}がない。仕入れに行こう`); return; }
    st.hold = id; st.holdT = 0; st.shotT = 0; makeBottle(id); bottle.visible = true;
  }
  function stopPour() { st.hold = null; st.flow = 0; stream.visible = false; }
  function total() { return mixFromAmt(S.bowl.amt).total; }
  function add(id, a) {
    const m0 = total();
    S.bowl.amt[id] = (S.bowl.amt[id] || 0) + a;
    if (!ITEMS[id].free) { S.stock[id] -= a; if (S.stock[id] < 1e-6) S.stock[id] = 0; }
    const mt = total(); if (mt > 0) S.bowl.stir *= (m0 + 30) / (mt + 30);   // 追加すると混ざり具合が薄まる
    st.sqv += 0.4 + a * 0.01;
  }
  function pourStep(dt) {
    const id = st.hold; if (!id) return;
    const it = ITEMS[id]; st.holdT += dt;
    const room = bowlCap() - total(), have = it.free ? 1e9 : (S.stock[id] || 0);
    if (it.unit === 'ml') {
      const f = 0.05 + 0.95 * Math.pow(Math.min(1, st.holdT / 1.5), 2), rate = it.rate * f;
      let a = Math.min(rate * dt, have, room);
      if (a <= 0) { if (have <= 0.0001) UI.toast(`${it.name}がなくなった`); else UI.toast('ボウルがいっぱい！'); stopPour(); return; }
      add(id, a); st.flow = f; stream.visible = true;
      const c = hexC(it.color); stream.material.color.copy(c); stream.material.opacity = it.kind === 'water' ? 0.6 : 0.95;
    } else {
      st.shotT -= dt;
      if (st.shotT <= 0) {
        if (have < 1) { UI.toast(`${it.name}がなくなった`); stopPour(); return; }
        if (room < 1) { UI.toast('ボウルがいっぱい！'); stopPour(); return; }
        add(id, 1); sfx('tick'); spawnParticle(it);
        st.shotT = st.holdT < 0.5 ? 0.45 : st.holdT < 1.5 ? 0.22 : 0.1;
      }
      stream.visible = false;
    }
  }
  function spawnParticle(it) {
    const p = parts.find(q => !q.visible); if (!p) return;
    p.visible = true; p.userData.v = 0; p.position.set(ws.x + (Math.random() - 0.5) * 0.3 + 0.05, 1.95, ws.z + 0.1 + (Math.random() - 0.5) * 0.3);
    p.material.color.set(it.color); p.material.emissive.set(it.kind === 'glitter' ? it.color : 0x000000); p.scale.setScalar(it.kind === 'paint' ? 2.4 : 1);
  }

  // ---------- マウス ----------
  function pointer(e, type, dx, dy) {
    if (st.touch) {                       // さわるモード：つかんで、のばす・つつく
      if (type === 'down') {
        const h = hitBlob(e);
        if (h) { grab = { local: h.local, world: h.world, D: new T.Vector3(), moved: 0, x: e.clientX, y: e.clientY }; sfx('tick'); }
      } else if (type === 'move' && grab) {
        const rc = rayFrom(e), pl = new T.Plane().setFromNormalAndCoplanarPoint(World.camera.getWorldDirection(tmpV).clone(), grab.world);
        const P = new T.Vector3(); if (rc.ray.intersectPlane(pl, P)) {
          const dw = P.sub(grab.world); blob.updateMatrixWorld();
          grab.D.set(dw.x / blob.scale.x, dw.y / blob.scale.y, dw.z / blob.scale.z);
        }
        grab.moved += Math.hypot(dx || 0, dy || 0);
      } else if (type === 'up' && grab) {
        if (grab.moved < 8) { poke({ local: grab.local }); }
        else if (grab.D.length() > 0.6) sfx('pop');
        grab = null;
      }
      return;
    }
    if (type === 'down') { st.stirring = true; tapInfo = { hit: hitBlob(e), moved: 0 }; }
    else if (type === 'up') { st.stirring = false; if (tapInfo && tapInfo.hit && tapInfo.moved < 8) poke(tapInfo.hit); tapInfo = null; }
    else if (type === 'move' && st.stirring) {
      const d = Math.hypot(dx, dy); st.spoonA += d * 0.015; if (tapInfo) tapInfo.moved += d;
      if (total() > 0) { S.bowl.stir = Math.min(1.6, S.bowl.stir + d / 2600); st.sqv += d * 0.03; }
    }
  }

  // ---------- 毎フレーム ----------
  function update(dt, t) {
    if (!ws || typeof S === 'undefined' || !S) return;
    // 目に見える変化（ボウルの中の状態をなめらかに追いかける）
    const amt = S.bowl.amt, m = mixFromAmt(amt), R = ratios(m), L = limits(m.stab, S.env), stir = S.bowl.stir;
    const tgt = { solid: 0, hard: 0, sticky: 0, foam: 0, ooze: 0, bouncy: 0, melt: 0 };
    if (m.glue > 0) {
      tgt.solid = clamp((R.b - (L.bMin - 1.5)) / 2.5, 0, 1) * clamp(stir / 0.5, 0, 1);
      tgt.hard = clamp((R.b - (L.bMax - 1.2)) / 1.2, 0, 1);
      tgt.sticky = clamp((R.w - 38) / (L.wMax - 38), 0, 1);
      tgt.foam = clamp((R.s - 6) / (L.sMax - 6), 0, 1);
      tgt.ooze = clamp(1 - (R.b - L.bMin) / (L.bEdgeLo * 2.2), 0, 1) * (R.b >= L.bMin - 1 ? 1 : 0.5);
      tgt.bouncy = clamp((R.b - 25) / 11, 0, 1);
      if (R.s > L.sMax) { tgt.melt = 1; tgt.solid = 0; }
      if (R.b < L.bMin - 1) { tgt.ooze = 0; }
    }
    if (st.touch) {   // できあがったスライムの手ざわり
      const tr = st.touch.traits || {}; tgt.solid = 1;
      tgt.ooze = tr.nettori ? 0.45 + 0.55 * tr.nettori : 0; tgt.bouncy = tr.danryoku ? 0.55 + 0.45 * tr.danryoku : 0.15;
      tgt.sticky = tr.torotoro ? 0.45 + 0.5 * tr.torotoro : 0; tgt.foam = tr.fuwafuwa ? 0.4 + 0.55 * tr.fuwafuwa : 0;
    }
    const k = 1 - Math.exp(-4 * dt);
    for (const key in tgt) st[key] += (tgt[key] - st[key]) * k;

    const mtot = st.touch ? 1 : m.total;
    const frac = st.touch ? 0.62 : clamp(m.total / bowlCap(), 0, 1), cx = ws.x, cz = ws.z + 0.1;
    const colHex = st.touch ? st.touch.color : mixColor(amt); mixColorHex = colHex;
    const col = hexC(colHex);
    // 液体
    const lv = (1 - st.solid) * frac;
    liquid.visible = !st.touch && lv > 0.02 && m.total > 0;
    if (liquid.visible) {
      const h = 0.06 + 0.4 * frac;
      liquid.scale.set(0.6 + 0.1 * frac, h, 0.6 + 0.1 * frac); liquid.position.y = bowlBottom + h / 2;
      liquid.material.color.copy(col); liquid.material.opacity = 0.35 + 0.6 * st.solid * 0 + 0.55 * Math.min(1, lv * 3);
    }
    // スライム
    blob.visible = st.solid > 0.04 && mtot > 0;
    if (blob.visible) {
      const k2 = 45 + 150 * st.bouncy, c2 = 7 - 4.2 * st.bouncy + 7 * st.sticky + 6 * st.ooze;
      const hardK = 1 + 2.5 * st.hard, hardC = 1 + 3 * st.hard;
      st.sqv += (-k2 * hardK * st.sq - c2 * hardC * st.sqv) * dt; st.sq += st.sqv * dt; st.sq = clamp(st.sq, -0.5, 0.5);
      const r = (0.22 + 0.42 * Math.sqrt(frac)) * (0.75 + 0.25 * st.solid) * (1 + 0.15 * st.foam);
      const ky = (0.62 - 0.22 * st.sticky - 0.12 * st.ooze + 0.2 * st.foam) * (1 - st.sq * 0.7);
      blob.scale.set(r * (1 + st.sq * 0.4), r * ky, r * (1 + st.sq * 0.4));
      blob.position.set(cx, bowlBottom + r * ky * 0.85, cz);
      const gc = col.clone().lerp(new T.Color(0x8a8f93), st.hard * 0.45).lerp(new T.Color(0xffffff), st.foam * 0.35);
      const M = blob.material;
      M.color.copy(gc).multiplyScalar(0.72); M.emissive.copy(gc).multiplyScalar(0.03);
      M.roughness = clamp(0.1 + 0.6 * st.hard + 0.45 * st.foam - 0.04 * st.sticky, 0.04, 1);
      M.clearcoat = clamp(1 - 0.85 * st.hard - 0.75 * st.foam, 0, 1);
      M.envMapIntensity = 0.5 - 0.35 * st.hard - 0.25 * st.foam;
      M.bumpScale = 0.02 * st.foam + 0.8 * st.hard;
      M.opacity = 1 - 0.22 * st.sticky - 0.08 * st.ooze;
      // ぷにぷに：ときどき自分でぽよんと弾む
      bounceT -= dt; if (st.bouncy > 0.5 && st.hard < 0.5 && st.solid > 0.6 && bounceT <= 0) { st.sqv += 2.2; bounceT = 1.3; }
      stepSoft(dt);
      const pos = blob.geometry.attributes.position, wob = (1 - st.hard) * 0.018, oo = st.ooze * 0.05;
      for (let i = 0; i < pos.count; i++) {
        const bx = blobBase[i * 3], by = blobBase[i * 3 + 1], bz = blobBase[i * 3 + 2];
        let d = Math.sin(t * (3 + 5 * st.bouncy) + by * 4 + bx * 3) * wob + Math.sin(t * 1.3 + bx * 2 + bz) * oo;
        d += st.hard * (Math.sin(bx * 11) * Math.sin(by * 9) * Math.sin(bz * 10)) * 0.06;
        d += st.stirring ? Math.sin(t * 14 + bx * 5 + st.spoonA * 3) * 0.01 : 0;
        pos.setXYZ(i, bx * (1 + d) + disp[i * 3], by * (1 + d) + disp[i * 3 + 1], bz * (1 + d) + disp[i * 3 + 2]);
      }
      pos.needsUpdate = true; blob.geometry.computeVertexNormals(); blob.geometry.computeBoundingSphere();
    } else { st.sq *= 0.9; st.sqv *= 0.9; }
    // あわ
    const nb = Math.round(st.foam * bubbles.length * (st.melt > 0.5 ? 1 : 0.85));
    bubbles.forEach((b, i) => {
      const show = i < nb && mtot > 0; b.visible = show; if (!show) return;
      const u = b.userData;
      if (blob.visible) {
        const sx = blob.scale.x, sy = blob.scale.y, sn = Math.sin(u.ph), x = sn * Math.cos(u.th), y = Math.cos(u.ph), z = sn * Math.sin(u.th);
        b.position.set(cx + x * sx * 1.02, blob.position.y + y * sy * 1.02, cz + z * sx * 1.02);
      } else {
        const h = 0.06 + 0.4 * frac, rr = Math.sqrt(u.k) * 0.55;
        b.position.set(cx + Math.cos(u.th * 3) * rr, bowlBottom + h + 0.02, cz + Math.sin(u.th * 3) * rr);
      }
      b.scale.setScalar(u.s * (1 + 0.1 * Math.sin(t * 3 + i)));
    });
    // ボトル・流れ
    pourStep(dt);
    bowlM.visible = !st.touch; if (rimM) rimM.visible = !st.touch;
    const want = st.hold ? 1 : 0; pourTilt += (want - pourTilt) * (1 - Math.exp(-12 * dt));
    if (!st.hold && pourTilt < 0.02) bottle.visible = false;
    bottle.position.set(cx - 0.05, 2.0, cz); bottle.rotation.z = 2.0 * pourTilt;
    if (st.hold && ITEMS[st.hold].unit === 'ml') {
      const surf = bowlBottom + (blob.visible ? blob.scale.y * 1.6 : 0.06 + 0.4 * frac), len = Math.max(0.05, 2.0 - surf), w = 0.014 + 0.05 * st.flow;
      stream.scale.set(w, len, w); stream.position.set(cx - 0.05 - 0.02, surf + len / 2, cz);
    } else stream.visible = false;
    // 粒
    for (const p of parts) if (p.visible) {
      p.userData.v += 6 * dt; p.position.y -= p.userData.v * dt;
      if (p.position.y < bowlBottom + 0.15 + 0.4 * frac) { p.visible = false; st.sqv += 0.5; }
    }
    // ヘラ
    spoon.visible = st.active && !st.touch;
    if (st.active && !st.touch) {
      const a = st.spoonA, rr = st.stirring ? 0.32 : 0.55;
      spoon.position.set(cx + Math.cos(a) * rr + (st.stirring ? 0 : 0.2), bowlBottom + 0.5 + (st.stirring ? 0.0 : 0.25), cz + Math.sin(a) * rr);
      spoon.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3 - (st.stirring ? 0 : 0.5));
    }
    // のびのび：ヘラとスライムのあいだに糸を引く／とろとろ：ボウルのふちからたれる
    const strandOn = blob.visible && st.ooze > 0.3 && st.solid > 0.5 && st.active && !st.touch;
    strand.visible = strandOn;
    if (strandOn) {
      const top = new T.Vector3(cx, blob.position.y + blob.scale.y * 0.9, cz);
      const A = top, B = spoon.position.clone(); B.y += 0.05;
      if (B.distanceTo(A) > 0.12) link(strand, A, B, 0.035 * (1.1 - 0.4 * Math.min(1, B.distanceTo(A) / 1.2)) * st.ooze);
      else strand.visible = false;
    }
    const dripOn = st.sticky > 0.3 && blob.visible && st.active && !st.touch;
    drips.forEach((d, i) => {
      d.visible = dripOn && i < 3; if (!d.visible) return;
      const u = d.userData, ph = (t * 0.8 + i / 3) % 1, fall = ph * 0.55;
      const top = spoon.position;
      u.c.scale.set(0.025, 0.1 + 0.15 * (1 - ph), 0.025); u.c.position.set(top.x, top.y - 0.06 - fall, top.z);
      u.s.scale.set(0.05, 0.065, 0.05); u.s.position.set(top.x, top.y - 0.16 - fall - 0.1 * (1 - ph), top.z);
    });
    if (st.active) { hudT -= dt; if (hudT <= 0) { hudT = 0.1; refreshHUD(); } }
  }

  function camera(cam, dt) {
    const port = cam.aspect < 0.9, tp = new T.Vector3(ws.x, port ? 3.5 : 3.2, ws.z + (port ? 4.6 : 4.1)), lk = new T.Vector3(ws.x, port ? 1.05 : 1.2, ws.z - 0.1);
    if (!camInit) { camInit = true; lastLook.copy(lk).setY(1.3); }
    const k = 1 - Math.exp(-5 * dt);
    cam.position.lerp(tp, k); lastLook.lerp(lk, k); cam.lookAt(lastLook);
  }

  // ---------- 画面（HTML）----------
  const KIND_ORDER = ['glue', 'borax', 'water', 'soap', 'paint', 'glitter'];
  function buildHUD() {
    const ids = Object.keys(ITEMS).filter(id => ITEMS[id].free || (S.stock[id] || 0) > 0.0001 || (S.bowl.amt[id] || 0) > 0).sort((a, b) => KIND_ORDER.indexOf(ITEMS[a].kind) - KIND_ORDER.indexOf(ITEMS[b].kind));
    const box = document.getElementById('wsItems');
    box.innerHTML = ids.length > 1 ? ids.map(id => {
      const it = ITEMS[id];
      return `<button class="ing" data-id="${id}"><span class="ic" style="background:${it.color}">${it.icon}</span><span class="nm">${it.name}</span><small id="st_${id}"></small></button>`;
    }).join('') : '<p class="sub">材料がない！ 町へ仕入れに行こう。</p>' + ids.map(id => `<button class="ing" data-id="${id}"><span class="ic" style="background:${ITEMS[id].color}">${ITEMS[id].icon}</span><span class="nm">${ITEMS[id].name}</span><small id="st_${id}"></small></button>`).join('');
    box.querySelectorAll('.ing').forEach(b => {
      const id = b.dataset.id;
      b.addEventListener('pointerdown', e => { try { b.setPointerCapture(e.pointerId); } catch (_) { } startPour(id); b.classList.add('on'); });
      const end = () => { stopPour(); b.classList.remove('on'); };
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
    });
  }
  const fmtMl = (id, v) => {
    const lv = S.up.tool, it = ITEMS[id];
    if (it.unit === '回') return `${Math.round(v)}回`;
    if (lv <= 0) return '';
    if (lv === 1) return `${Math.floor(v / 10) * 10}ml`;
    return `${v.toFixed(1)}ml`;
  };
  function gauge(val, max, zones) {
    // zones: [[from,to,color]]
    const stops = zones.map(z => `${z[2]} ${(z[0] / max * 100).toFixed(1)}% ${(Math.min(z[1], max) / max * 100).toFixed(1)}%`).join(',');
    return `<div class="gauge" style="background:linear-gradient(90deg,${stops})"><i style="left:${clamp(val / max * 100, 0, 100)}%"></i></div>`;
  }
  function refreshHUD() {
    if (!H) H = { read: document.getElementById('wsRead'), stir: document.getElementById('wsStir') };
    document.querySelectorAll('#wsItems .ing').forEach(b => {
      const id = b.dataset.id, it = ITEMS[id], el = document.getElementById('st_' + id);
      if (el) el.textContent = it.free ? '∞' : `在庫 ${it.unit === 'ml' ? Math.floor(S.stock[id] || 0) : Math.floor(S.stock[id] || 0)}${it.unit}`;
    });
    const amt = S.bowl.amt, m = mixFromAmt(amt), cap = bowlCap(), lv = S.up.tool;
    const feel = [];
    if (m.glue > 0) {
      if (st.melt > 0.5) feel.push('🫧 泡だらけで溶けそう…');
      else if (st.solid < 0.3) feel.push('💧 まだ液体（さらさら）。こねるか、ホウ砂水が足りない？');
      else {
        if (st.hard > 0.6) feel.push('🪨 カチカチで、ゴムの塊みたい…'); else if (st.bouncy > 0.5) feel.push('🟢 ぷるぷる弾む！');
        if (st.ooze > 0.35) feel.push('🧶 ねっとり、糸を引く！');
        if (st.sticky > 0.45) feel.push('💦 トロトロ・ベタベタ流れる');
        if (st.foam > 0.35 && st.melt <= 0.5) feel.push('☁️ ふわふわ泡っぽい');
        if (!feel.length) feel.push('🙂 ふつうのやわらかさ');
      }
    }
    let h = (feel.length ? `<div class="feel"><b>いまの手ざわり</b><br>${feel.join('<br>')}</div>` : '') + `<div class="rd-h"><b>ボウル</b><span>${Math.round(m.total / cap * 100)}%（${lv >= 1 ? Math.floor(m.total) + 'ml / ' : ''}最大${cap}ml）</span></div><div class="bar"><i style="width:${m.total / cap * 100}%"></i></div>`;
    const ids = Object.keys(amt).filter(id => amt[id] > 0.0001);
    if (!ids.length) h += '<p class="sub">材料を選んで、長押しで注ごう。ボタンを押し続けるほど勢いが増す（少しだけ入れたいときはチョンと短く）</p>';
    ids.sort((a, b) => KIND_ORDER.indexOf(ITEMS[a].kind) - KIND_ORDER.indexOf(ITEMS[b].kind));
    for (const id of ids) {
      const it = ITEMS[id], v = amt[id];
      const txt = fmtMl(id, v);
      h += `<div class="rd"><span>${it.icon} ${it.name}</span><b>${txt}</b>${lv === 0 && it.unit === 'ml' ? `<div class="bar sm"><i style="width:${v / cap * 100}%;background:${it.color}"></i></div>` : ''}</div>`;
    }
    if (lv >= 2 && m.glue > 0) {
      const R = ratios(m);
      h += `<div class="rd-h"><b>ノリ100mlあたり</b></div><div class="rd"><span>ホウ砂水（水・泡で補正）</span><b>${R.b.toFixed(1)}</b></div><div class="rd"><span>水</span><b>${R.w.toFixed(1)}</b></div><div class="rd"><span>泡</span><b>${R.s.toFixed(1)}</b></div>`;
      if (lv >= 3) {
        const L = limits(m.stab, S.env), RED = '#ff7b7b', YEL = '#ffd95e', GRN = '#8be0a0';
        h += `<div class="rd-h"><b>ギリギリセンサー</b><span class="sub">赤=失敗 黄=個性が出る</span></div>`;
        h += `<div class="sub">固まり具合</div>` + gauge(R.b, 50, [[0, L.bMin, RED], [L.bMin, L.bMin + L.bEdgeLo, YEL], [L.bMin + L.bEdgeLo, L.bMax - L.bEdgeHi, GRN], [L.bMax - L.bEdgeHi, L.bMax, YEL], [L.bMax, 50, RED]]);
        h += `<div class="sub">水分</div>` + gauge(R.w, 75, [[0, L.wMax - L.wEdge, GRN], [L.wMax - L.wEdge, L.wMax, YEL], [L.wMax, 75, RED]]);
        h += `<div class="sub">泡</div>` + gauge(R.s, 28, [[0, L.sMax - L.sEdge, GRN], [L.sMax - L.sEdge, L.sMax, YEL], [L.sMax, 28, RED]]);
      }
    }
    if (m.glue > 0 && lv < 2) h += `<p class="sub">ノリ以外の量は、ノリの量との割合で決まる。たくさん作るほど細かい調整がしやすい。</p>`;
    H.read.innerHTML = h;
    const sv = S.bowl.stir;
    H.stir.innerHTML = `<span>こねぐあい</span><div class="bar"><i style="width:${clamp(sv, 0, 1) * 100}%;background:${sv >= 0.85 ? '#5fd16b' : '#ffcf4a'}"></i></div><small>${sv >= 0.85 ? 'ばっちり' : sv >= 0.4 ? 'もう少し' : '画面をドラッグしてこねよう'}</small>`;
  }

  // ---------- 完成・捨てる ----------
  function finish() {
    const m = mixFromAmt(S.bowl.amt);
    if (m.total < JAR_ML) { UI.toast(`量が少なすぎる（最低${JAR_ML}ml）`); return; }
    if (S.bowl.stir < 0.4) { UI.toast('もっとこねよう！ 画面をドラッグするとこねられる'); return; }
    const res = judge(S.bowl.amt, S.bowl.stir, S.env);
    stopPour(); UI.openResult(res, { ...S.bowl.amt }, S.bowl.stir);
  }
  function clearBowl() { S.bowl = { amt: {}, stir: 0 }; st.sq = st.sqv = 0; st.solid = st.hard = st.sticky = st.foam = st.ooze = st.melt = 0; refreshHUD(); buildHUD(); }
  function dump() { if (total() <= 0) return; askConfirm('ボウルの中身を全部すてますか？<br>（材料はもどりません）', 'すてる', () => { clearBowl(); sfx('pop'); }, true); }

  return { build, enter, exit, touch, update, camera, pointer, finish, dump, clearBowl, refreshHUD, buildHUD, get active() { return st.active; }, get touching() { return !!st.touch; } };
})();
