// 出撃(徒歩の探索): 一人称の主人公・武器・拾った戦利品。生きて帰還点に戻れば、戦利品を持ち帰れる
// 弾は無限。弾倉(ammo の数)を撃ち切ると、リロードして満タンに戻す(R キーでも、途中で装填できる)
const Hunt = (() => {
  const p = { x: 0, z: 0, yaw: -Math.PI / 2, pitch: 0, hp: 100, slow: 0, cur: 0, cd: 0, loadout: [], ammo: {}, bob: 0, kick: 0, carry: {}, kills: [], pull: null, reload: null, reloaded: false };
  const _dir = new THREE.Vector3(), _o = new THREE.Vector3(), _rc = new THREE.Raycaster();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SPEED = 4.2, SLOW = 2.0;      // 歩く速さ(m/秒)。叫び声を浴びると遅くなる
  const infinite = w => w.ammo >= 90; // ライトは弾切れしない

  function reset(loadout) {
    p.x = World.spawn.x; p.z = World.spawn.z; p.yaw = -Math.PI / 2; p.pitch = 0; p.hp = 100; p.slow = 0; p.cur = 0; p.cd = 0; p.kick = 0;
    p.loadout = loadout.slice(); p.ammo = {}; p.carry = {}; p.kills = []; p.pull = null; p.reload = null; p.reloaded = false;
    loadout.forEach(id => { p.ammo[id] = Weapons[id].ammo; });
  }
  const weapon = () => Weapons[p.loadout[p.cur]];

  // リロード開始(装填できないとき false)
  function startReload() {
    const w = weapon();
    if (!w || p.reload || infinite(w) || p.ammo[w.id] >= w.ammo) return false;
    p.reload = { id: w.id, t: w.reload || 1.5, dur: w.reload || 1.5 };
    return true;
  }

  function update(dt, In) {
    p.yaw -= In.lookX; p.pitch = clamp(p.pitch - In.lookY, -1.3, 1.3);
    p.cd -= dt; p.slow = Math.max(0, p.slow - dt); p.kick = Math.max(0, p.kick - dt * 6);
    p.reloaded = false;
    if (p.reload) { p.reload.t -= dt; if (p.reload.t <= 0) { p.ammo[p.reload.id] = Weapons[p.reload.id].ammo; p.reload = null; p.reloaded = true; } }
    if (p.pull) {                                                // つかまれて、怪物の方へ引きずられる
      p.pull.t -= dt;
      const dx = p.pull.x - p.x, dz = p.pull.z - p.z, d = Math.hypot(dx, dz);
      if (d > 1.3 && p.pull.t > 0) { const q = { x: p.x + dx / d * 9 * dt, y: 0, z: p.z + dz / d * 9 * dt }; World.resolve(q, 0.35, 0, 1.8); p.x = q.x; p.z = q.z; }
      else p.pull = null;
      return;
    }
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    const wx = -sy * In.my + cy * In.mx, wz = -cy * In.my - sy * In.mx;
    const l = Math.hypot(wx, wz), sp = (p.slow > 0 ? SLOW : SPEED) / Math.max(1, l);
    const pos = { x: p.x + wx * sp * dt, y: 0, z: p.z + wz * sp * dt };
    World.resolve(pos, 0.35, 0, 1.8);
    if (l > 0.05) p.bob += dt * 8;
    p.x = pos.x; p.z = pos.z;
  }

  function applyCam(cam) {
    cam.position.set(p.x, 1.6 + Math.sin(p.bob) * 0.025, p.z);
    cam.rotation.set(p.pitch + p.kick * 0.04, p.yaw, 0);
  }

  // 撃つ。結果: null(まだ撃てない) | { empty, reloading } | { fired, hits: [{ m, part, dmg }], weak, broke, total, autoReload }
  function fire(cam) {
    const w = weapon();
    if (p.cd > 0) return null;
    if (p.reload) return null;                                           // リロード中は撃てない
    if (!infinite(w) && p.ammo[w.id] <= 0) { p.cd = 0.3; return { empty: true, reloading: startReload() }; }
    if (!infinite(w)) p.ammo[w.id]--;
    p.cd = w.rate; p.kick = 1;
    cam.updateMatrixWorld(true);
    _o.copy(cam.position);
    const res = { fired: true, hits: [], weak: false, total: 0, autoReload: false };
    for (let i = 0; i < w.pellets; i++) {
      _dir.set((Math.random() - 0.5) * 2 * w.spread, (Math.random() - 0.5) * 2 * w.spread, -1).normalize().applyQuaternion(cam.quaternion);
      _rc.set(_o, _dir); _rc.far = 40;
      const h = Monsters.hitTest(_rc);
      if (!h) continue;
      if (h.dist > World.blockDist(_o, _dir, h.dist)) continue;   // 壁や家具に遮られた
      const dmg = h.m.hurt(h.part, w.attr, w.dmg), lh = h.m.lastHit;
      Gore.hit(h.m, _o, _dir, Math.max(dmg, lh.weak ? w.dmg * 1.5 : 2));   // 血しぶきと傷あと
      res.hits.push({ m: h.m, part: h.part, dmg }); res.total += dmg;
      if (lh.weak) res.weak = true;                                // 弱点に当たった
      if (lh.broke) res.broke = true;                              // 体力の区切りが壊れた
    }
    if (!infinite(w) && p.ammo[w.id] <= 0) res.autoReload = startReload();   // 撃ち切ったら、自動でリロード
    return res;
  }

  function swap(i) { if (i < p.loadout.length && i !== p.cur) { p.cur = i; p.reload = null; return true; } return false; }   // 武器を替えると、リロードは中断
  function pullTo(x, z) { p.pull = { x, z, t: 0.7 }; }
  function damage(n) { p.hp = Math.max(0, p.hp - n); }
  function kill() { p.hp = 0; }                                       // 敵に当たったら即死
  function addCarry(item, n) { p.carry[item] = (p.carry[item] || 0) + (n || 1); }
  function heal(n) { p.hp = Math.min(100, p.hp + n); }

  return { p, reset, update, applyCam, fire, swap, pullTo, damage, kill, weapon, addCarry, heal, startReload, infinite };
})();
