// 血と傷: 撃たれた怪物の体に傷あとが残り、血が飛び散って床に溜まる。倒すと血だまりが広がる
const Gore = (() => {
  let scene;
  const drops = [], splats = [], pools = [];
  const V = THREE.Vector3, Z = new V(0, 0, 1);
  const dropGeo = new THREE.SphereGeometry(0.022, 5, 4);
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x7a0a0a });
  const discGeo = new THREE.CircleGeometry(1, 12);
  const decalMat = new THREE.MeshBasicMaterial({ color: 0x520606, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x3f0505, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const _rc = new THREE.Raycaster();

  function init(sc) { scene = sc; }

  // 飛び散る血のしずく
  function spray(p, dir, n, power) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(dropGeo, dropMat); m.position.copy(p); scene.add(m);
      const v = new V((Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6).addScaledVector(dir, power * (0.4 + Math.random()));
      drops.push({ m, v });
    }
  }
  function splat(x, z, r) {
    const m = new THREE.Mesh(discGeo, floorMat);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * 6); m.position.set(x, 0.016, z); m.scale.set(r, r * (0.6 + Math.random() * 0.5), 1);
    scene.add(m); splats.push(m);
    if (splats.length > 160) scene.remove(splats.shift());
  }
  // 倒れた怪物の下に、血だまりが広がる
  function pool(x, z) {
    const m = new THREE.Mesh(discGeo, floorMat);
    m.rotation.set(-Math.PI / 2, 0, 0); m.position.set(x, 0.018, z); m.scale.set(0.1, 0.1, 1);
    scene.add(m); pools.push({ m, t: 0, r: 0.9 + Math.random() * 0.5 });
  }

  // 弾が当たった: 当たった実際の体の表面に傷あとをつけ、血を飛ばす
  function hit(m, origin, dir, dmg) {
    if (!m.rig) return;
    _rc.set(origin, dir); _rc.far = 40;
    const hs = _rc.intersectObject(m.rig.root, true).filter(h => h.object.isMesh && !h.object.userData.decal &&
      !(h.object.material && !Array.isArray(h.object.material) && h.object.material.visible === false));
    if (!hs.length) return;
    const h = hs[0];
    spray(h.point, dir, Math.min(10, 2 + Math.round(dmg / 4)), 2 + Math.min(3, dmg / 10));
    if (Math.random() < 0.75) addWound(m, h, dmg);
  }
  function addWound(m, h, dmg) {
    const obj = h.object, par = obj.parent;
    if (!par || !h.face) return;
    par.updateWorldMatrix(true, false);
    const local = par.worldToLocal(h.point.clone());
    const nW = h.face.normal.clone().transformDirection(obj.matrixWorld);
    const nLocal = par.worldToLocal(h.point.clone().addScaledVector(nW, 1)).sub(local).normalize();
    const d = new THREE.Mesh(discGeo, decalMat);
    const size = 0.03 + Math.min(0.06, dmg * 0.003) + Math.random() * 0.02;
    d.scale.set(size, size * (0.7 + Math.random() * 0.6), 1);
    d.userData.decal = true;
    d.position.copy(local).addScaledVector(nLocal, 0.004);
    d.quaternion.setFromUnitVectors(Z, nLocal);
    par.add(d);
    const list = m.st.wounds || (m.st.wounds = []);
    list.push(d);
    if (list.length > 14) { const o = list.shift(); if (o.parent) o.parent.remove(o); }
  }
  function clearWounds(m) {
    if (m.wounds) m.wounds.forEach(d => { if (d.parent) d.parent.remove(d); });
    m.wounds = [];
  }

  function update(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.v.y -= 9 * dt; d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < 0.02) { splat(d.m.position.x, d.m.position.z, 0.03 + Math.random() * 0.05); scene.remove(d.m); drops.splice(i, 1); }
    }
    for (const p of pools) { p.t = Math.min(1, p.t + dt / 2.2); const s = p.r * (1 - Math.pow(1 - p.t, 2)); p.m.scale.set(s, s * 0.85, 1); }
  }
  function clear() {
    drops.forEach(d => scene.remove(d.m)); drops.length = 0;
    splats.forEach(m => scene.remove(m)); splats.length = 0;
    pools.forEach(p => scene.remove(p.m)); pools.length = 0;
  }

  return { init, hit, pool, spray, update, clear, clearWounds };
})();
