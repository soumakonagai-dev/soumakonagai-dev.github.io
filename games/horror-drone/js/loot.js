// 戦利品: マップに落ちている光る物。徒歩で近づくと拾える(怪物を倒すと素材も落ちる)
const Loot = (() => {
  let scene, glowTex;
  const items = [];
  const boxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

  function init(sc) {
    scene = sc;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }
  function remove(it) {
    scene.remove(it.mesh); scene.remove(it.sprite);
    it.mesh.material.dispose(); it.sprite.material.dispose();
  }
  function clear() { items.forEach(remove); items.length = 0; }

  function spawn(item, x, z, y) {
    const d = Items[item]; if (!d) return;
    const mesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.8, roughness: 0.5 }));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: d.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sprite.scale.set(1.1, 1.1, 1);
    const y0 = y == null ? 0.45 : y;
    mesh.position.set(x, y0, z); sprite.position.copy(mesh.position);
    scene.add(mesh); scene.add(sprite);
    items.push({ item, mesh, sprite, x, z, y: y0, ph: Math.random() * 6 });
  }
  // 各部屋に戦利品を少しだけばらまく(全部で十数個)
  function scatter() {
    clear();
    for (let r = 0; r < World.rooms.length; r++) {
      const n = World.rooms[r].id === 'A' ? 1 : 1 + ((Math.random() * 2) | 0);    // 控えめに: 自宅は1つ、他は1〜2つ
      for (let i = 0; i < n; i++) { const s = World.freeSpot(r, 1.3); if (s) spawn(rollLoot(), s.x, s.z); }
    }
  }
  function update(t) {
    for (const it of items) {
      it.mesh.rotation.y = t * 1.5 + it.ph;
      it.mesh.position.y = it.y + Math.sin(t * 2 + it.ph) * 0.06;
      it.sprite.position.copy(it.mesh.position);
      it.sprite.material.opacity = 0.7 + Math.sin(t * 3 + it.ph) * 0.2;
    }
  }
  // 近くの戦利品を拾う。拾った物の種類の一覧を返す
  function collectNear(x, z, r) {
    const got = [];
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (Math.hypot(it.x - x, it.z - z) < r) { got.push(it.item); remove(it); items.splice(i, 1); }
    }
    return got;
  }
  return { init, clear, spawn, scatter, update, collectNear, items };
})();
