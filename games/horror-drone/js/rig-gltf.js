// 見た目(リグ)その2: glTF / GLB の3Dモデルを使う。決まりは rig-procedural.js の冒頭を参照
//
// モデルの骨(ノード名)に、次の3つを割り当てる(monster-defs.js の model に書く):
//   ・首の傾き  nodes.head   ← 叫ぶ前の予兆。アニメの上から重ねて傾ける
//   ・口の開き  nodes.jaw    ← 叫んでいる間だけ開く(無ければ口の光だけで表現する)
//   ・当たり判定 hit.body / hit.head / hit.weak ← 球と円柱をモデルの骨の位置に追従させる
// アニメ(idle / walk / run / scream / death)はモデルに入っているものを名前で選ぶ。無ければ使わない。
const RigGLTF = (() => {
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const HIT_DEFAULT = {
    body: { r: 0.34, h: 2.0, y: 1.0 },
    head: { node: 'head', r: 0.3, y: 0.2 },
    weak: { node: 'head', r: 0.13, y: 0.07, z: 0.16 },
  };
  const FALLBACK = { run: ['run', 'walk', 'idle'], walk: ['walk', 'idle'], scream: ['scream', 'idle'], death: ['death', 'idle'], idle: ['idle'] };

  // URLから読み込む
  function load(def, wrapper, onOk, onFail) {
    if (!THREE.GLTFLoader) { onFail(new Error('GLTFLoader が読み込まれていない')); return; }
    new THREE.GLTFLoader().load(def.model.url,
      gltf => { try { onOk(build(gltf, def, wrapper)); } catch (e) { onFail(e); } },
      undefined,
      err => onFail(err instanceof Error ? err : new Error('モデルを読み込めない: ' + def.model.url)));
  }
  // ArrayBuffer から読み込む(テスト用)
  function parse(buffer, def, wrapper, onOk, onFail) {
    if (!THREE.GLTFLoader) { onFail(new Error('GLTFLoader が読み込まれていない')); return; }
    new THREE.GLTFLoader().parse(buffer, '',
      gltf => { try { onOk(build(gltf, def, wrapper)); } catch (e) { onFail(e); } }, onFail);
  }

  function build(gltf, def, wrapper) {
    const m = def.model;
    const holder = new THREE.Group(); holder.name = 'GLTFHolder';
    const model = gltf.scene; holder.add(model);

    // 大きさを揃え、足を地面に置く(横位置は作ったまま。center:true なら中心を原点に寄せる)
    model.updateMatrixWorld(true);
    const b0 = new THREE.Box3().setFromObject(model), size = b0.getSize(new THREE.Vector3());
    const s = m.height && size.y > 1e-6 ? m.height / size.y : (m.scale || 1);
    model.scale.multiplyScalar(s);
    model.updateMatrixWorld(true);
    const b1 = new THREE.Box3().setFromObject(model);
    model.position.y -= b1.min.y;
    if (m.center === true) { model.position.x -= (b1.min.x + b1.max.x) / 2; model.position.z -= (b1.min.z + b1.max.z) / 2; }
    holder.rotation.y = m.yaw || 0; // モデルが +Z 以外を向いているとき

    // 開発の助け: ノード名とアニメ名を出す(monster-defs.js に書く名前の確認用)
    const names = []; model.traverse(o => { if (o.name) names.push(o.name); });
    console.info('[モデル] ノード:', names.join(', '), '\n[モデル] アニメ:', gltf.animations.map(c => c.name).join(', ') || '(なし)');

    // 骨(ノード)を探す
    const nodes = {};
    for (const k of ['head', 'jaw']) {
      const n = m.nodes && m.nodes[k];
      if (!n) continue;
      nodes[k] = model.getObjectByName(n);
      if (!nodes[k]) console.warn(`[モデル] nodes.${k} の「${n}」が見つからない`);
    }

    // 材質は複製して、被弾の赤い光をこの怪物だけに掛ける
    const emis = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      const cl = arr.map(mt => { const c = mt.clone(); if (c.emissive) emis.push({ m: c, base: c.emissive.clone() }); return c; });
      o.material = Array.isArray(o.material) ? cl : cl[0];
    });

    // アニメ
    const actions = {};
    let mixer = null;
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      const want = Object.assign({ idle: 'idle', walk: 'walk', run: 'run', scream: 'scream', death: 'death' }, m.anims);
      for (const k in want) {
        const w = String(want[k]).toLowerCase();
        const clip = gltf.animations.find(c => c.name === want[k]) || gltf.animations.find(c => c.name.toLowerCase().includes(w));
        if (clip) actions[k] = mixer.clipAction(clip);
      }
    }
    let curAct = null, curKey = '';
    function pick(p) {
      let w = 'idle';
      if (p.state === 'dead') w = 'death';
      else if (p.state === 'lunge') w = 'run';
      else if (p.state === 'wander' || p.state === 'chase') w = 'walk';
      else if (p.state === 'scream') w = 'scream';
      const k = (FALLBACK[w] || ['idle']).find(x => actions[x]);
      if (!k || k === curKey) return;
      const next = actions[k];
      next.reset();
      if (k === 'death') { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
      next.play();
      if (curAct) curAct.crossFadeTo(next, 0.25, false);
      curAct = next; curKey = k;
    }

    // 当たり判定(見えない)。モデルの骨の位置に追従させる
    const hitRoot = new THREE.Group(); hitRoot.name = 'Hit';
    const hit = {}, spec = {};
    for (const k of ['body', 'head', 'weak']) {
      const sp = Object.assign({}, HIT_DEFAULT[k], m.hit && m.hit[k]);
      sp.target = sp.node ? (nodes[sp.node] || model.getObjectByName(sp.node)) : null;
      if (sp.node && !sp.target) console.warn(`[モデル] hit.${k} の骨「${sp.node}」が見つからない(原点に置く)`);
      const geo = k === 'body' ? new THREE.CylinderGeometry(sp.r, sp.r, sp.h, 8) : new THREE.SphereGeometry(sp.r, 8, 6);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
      mesh.name = 'Hit_' + k; hitRoot.add(mesh); hit[k] = mesh; spec[k] = sp;
    }
    // 弱点(口)の光: モデルに口の光る部分が無くても、観測済みの弱点が分かるようにする
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(spec.weak.r * 0.9, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.7, depthWrite: false }));
    glowMesh.visible = false; hit.weak.add(glowMesh);

    const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _wq = new THREE.Quaternion();
    function syncHit() {
      wrapper.updateMatrixWorld(true);
      for (const k in hit) {
        const sp = spec[k];
        if (sp.target) { sp.target.getWorldPosition(_v); wrapper.worldToLocal(_v); } else _v.set(0, 0, 0);
        hit[k].position.set(_v.x + (sp.x || 0), _v.y + (sp.y || 0), _v.z + (sp.z || 0));
      }
      wrapper.updateMatrixWorld(true);
    }

    // 首と口は、アニメの上から重ねる。前フレームの重ね分は先に元へ戻す(積み重なり防止)
    const pre = new Map();
    for (const k of ['head', 'jaw']) if (nodes[k]) pre.set(nodes[k], nodes[k].quaternion.clone());
    const cur = { p: null, glow: false, flash: 0 };
    function apply(p, glowOn, flash) { cur.p = p; cur.glow = glowOn; cur.flash = flash; }
    function update(dt) {
      const p = cur.p; if (!p) return;
      for (const [n, q] of pre) n.quaternion.copy(q);
      if (mixer) { pick(p); mixer.update(dt); }
      const over = (node, axis, ang) => {
        if (!node) return;
        pre.set(node, node.quaternion.clone());
        node.quaternion.multiply(_q.setFromAxisAngle(AX[axis] || AX.z, ang));
      };
      over(nodes.head, m.tiltAxis || 'z', (m.tiltSign || 1) * p.tilt * (m.tiltScale || 0.65));
      over(nodes.jaw, m.jawAxis || 'x', (m.jawSign || 1) * p.jaw * 0.95);
      for (const e of emis) { e.m.emissive.copy(e.base); if (cur.flash > 0) e.m.emissive.r += cur.flash * 0.6; }
      glowMesh.visible = !!cur.glow;
      if (cur.glow) glowMesh.material.opacity = 0.45 + 0.35 * Math.sin(performance.now() / 90);
      syncHit();
    }
    function weakForward(out) { wrapper.getWorldQuaternion(_wq); return out.set(0, 0, 1).applyQuaternion(_wq); }

    return { root: holder, hitRoot, hit, apply, update, syncHit, weakForward, kind: 'gltf', handlesDeath: !!actions.death };
  }

  return { load, parse };
})();
