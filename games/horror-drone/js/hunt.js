// 出撃(徒歩の探索): 一人称の主人公・武器・拾った戦利品。生きて帰還点に戻れば、戦利品を持ち帰れる
const Hunt = (() => {
  const p = { x: 0, z: 0, yaw: -Math.PI / 2, pitch: 0, hp: 100, slow: 0, cur: 0, cd: 0, loadout: [], ammo: {}, bob: 0, kick: 0, carry: {}, kills: [] };
  const _dir = new THREE.Vector3(), _o = new THREE.Vector3(), _rc = new THREE.Raycaster();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function reset(loadout) {
    p.x = World.spawn.x; p.z = World.spawn.z; p.yaw = -Math.PI / 2; p.pitch = 0; p.hp = 100; p.slow = 0; p.cur = 0; p.cd = 0; p.kick = 0;
    p.loadout = loadout.slice(); p.ammo = {}; p.carry = {}; p.kills = [];
    loadout.forEach(id => { p.ammo[id] = Weapons[id].ammo; });
  }
  const weapon = () => Weapons[p.loadout[p.cur]];

  function update(dt, In) {
    p.yaw -= In.lookX; p.pitch = clamp(p.pitch - In.lookY, -1.3, 1.3);
    p.cd -= dt; p.slow = Math.max(0, p.slow - dt); p.kick = Math.max(0, p.kick - dt * 6);
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    const wx = -sy * In.my + cy * In.mx, wz = -cy * In.my - sy * In.mx;
    const l = Math.hypot(wx, wz), sp = (p.slow > 0 ? 1.7 : 3.6) / Math.max(1, l);
    const pos = { x: p.x + wx * sp * dt, y: 0, z: p.z + wz * sp * dt };
    World.resolve(pos, 0.35, 0, 1.8);
    if (l > 0.05) p.bob += dt * 8;
    p.x = pos.x; p.z = pos.z;
  }

  function applyCam(cam) {
    cam.position.set(p.x, 1.6 + Math.sin(p.bob) * 0.025, p.z);
    cam.rotation.set(p.pitch + p.kick * 0.04, p.yaw, 0);
  }

  // 撃つ。結果: { empty } | { fired, hits: [{ m, part, dmg }], weak, total }
  function fire(cam) {
    const w = weapon();
    if (p.cd > 0) return null;
    if (p.ammo[w.id] <= 0) { p.cd = 0.3; return { empty: true }; }
    p.ammo[w.id]--; p.cd = w.rate; p.kick = 1;
    cam.updateMatrixWorld(true);
    _o.copy(cam.position);
    const res = { fired: true, hits: [], weak: false, total: 0 };
    for (let i = 0; i < w.pellets; i++) {
      _dir.set((Math.random() - 0.5) * 2 * w.spread, (Math.random() - 0.5) * 2 * w.spread, -1).normalize().applyQuaternion(cam.quaternion);
      _rc.set(_o, _dir); _rc.far = 40;
      const h = Monsters.hitTest(_rc);
      if (!h) continue;
      if (h.dist > World.blockDist(_o, _dir, h.dist)) continue;   // 壁や家具に遮られた
      const dmg = h.m.hurt(h.part, w.attr, w.dmg);
      Gore.hit(h.m, _o, _dir, dmg);                               // 血しぶきと傷あと
      res.hits.push({ m: h.m, part: h.part, dmg }); res.total += dmg;
      if (dmg >= w.dmg * 2.9) res.weak = true;                    // 弱点 × 属性が合った一撃
    }
    return res;
  }

  function swap(i) { if (i < p.loadout.length && i !== p.cur) { p.cur = i; return true; } return false; }
  function damage(n) { p.hp = Math.max(0, p.hp - n); }
  function addCarry(item, n) { p.carry[item] = (p.carry[item] || 0) + (n || 1); }
  function heal(n) { p.hp = Math.min(100, p.hp + n); }
  function addAmmo() { p.loadout.forEach(id => { const w = Weapons[id]; if (w.ammo < 90) p.ammo[id] += Math.max(2, Math.ceil(w.ammo * 0.35)); }); }

  return { p, reset, update, applyCam, fire, swap, damage, weapon, addCarry, heal, addAmmo };
})();
