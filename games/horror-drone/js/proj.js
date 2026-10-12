// 飛び道具: 吐き袋の酸。山なりに飛んで、床に酸だまりを残す(だまりの中にいると、足を焼かれる)
const Proj = (() => {
  let scene;
  const shots = [], pools = [];
  const geo = new THREE.SphereGeometry(0.17, 8, 6), mat = new THREE.MeshBasicMaterial({ color: 0xb4ff3a });
  const discGeo = new THREE.CircleGeometry(1, 18);
  const G = 14;

  function init(sc) { scene = sc; }
  // from: 口の位置 {x,y,z} / to: 狙う床の位置 {x,z}
  function fire(from, to, speed, dmg, owner) {
    const dx = to.x - from.x, dz = to.z - from.z, t = Math.max(0.35, Math.hypot(dx, dz) / speed);
    const m = new THREE.Mesh(geo, mat); m.position.set(from.x, from.y, from.z); scene.add(m);
    shots.push({ m, vx: dx / t, vz: dz / t, vy: (0.1 - from.y + 0.5 * G * t * t) / t, dmg, owner });
  }
  // T: 当たる相手 {x, y, z}。hit({kind:'direct'|'acid', dmg, owner}) で、当たったことを知らせる
  function update(dt, T, hit) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.vy -= G * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
      const p = s.m.position;
      if (Math.hypot(p.x - T.x, p.y - T.y, p.z - T.z) < 0.9) { hit({ kind: 'direct', dmg: s.dmg, owner: s.owner }); land(p.x, p.z); scene.remove(s.m); shots.splice(i, 1); continue; }
      if (p.y <= 0.1) { land(p.x, p.z); scene.remove(s.m); shots.splice(i, 1); }
    }
    for (let i = pools.length - 1; i >= 0; i--) {
      const q = pools[i];
      q.life -= dt;
      if (q.life <= 0) { scene.remove(q.m); pools.splice(i, 1); continue; }
      q.m.material.opacity = 0.55 * Math.min(1, q.life / 1.5);
      if (T.y < 1.5 && Math.hypot(q.x - T.x, q.z - T.z) < q.r) hit({ kind: 'acid', dmg: 6 * dt, owner: q.owner });
    }
  }
  function land(x, z) {
    const m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0x7aff2a, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    const r = 1.1 + Math.random() * 0.4;
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.scale.set(r, r, 1); scene.add(m);
    pools.push({ m, x, z, r: r * 0.9, life: 7, owner: null });
  }
  function clear() {
    shots.forEach(s => scene.remove(s.m)); shots.length = 0;
    pools.forEach(p => scene.remove(p.m)); pools.length = 0;
  }
  return { init, fire, update, clear };
})();
