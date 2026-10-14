// ドローン: 移動・バッテリー・耐久・録画(録画には、全部の怪物の姿勢を一緒に残す)
const Drone = (() => {
  const START = { x: -15, y: 1.4, z: 1 };       // 自宅の部屋(帰還点の上)から飛ばす
  const pos = new THREE.Vector3(World.spawn.x, START.y, World.spawn.z);
  const vel = new THREE.Vector3();
  const s = { yaw: -Math.PI / 2, pitch: 0, battery: 1, hp: 1, night: false, rec: false, frames: [], clip: null, acc: 0, bob: 0 };
  const MAX_FRAMES = 200; // 0.1秒ごと × 20秒
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function reset() {
    pos.set(World.spawn.x, START.y, World.spawn.z); vel.set(0, 0, 0);
    s.yaw = -Math.PI / 2; s.pitch = 0; s.battery = 1; s.hp = 1; s.night = false; s.rec = false; s.frames = []; s.acc = 0;
  }
  function forward(out) {
    const cp = Math.cos(s.pitch);
    return out.set(-Math.sin(s.yaw) * cp, Math.sin(s.pitch), -Math.cos(s.yaw) * cp);
  }

  function update(dt, In) {
    s.yaw -= In.lookX; s.pitch = clamp(s.pitch - In.lookY, -1.2, 1.2);
    const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
    const wx = -sy * In.my + cy * In.mx, wz = -cy * In.my - sy * In.mx;
    const wy = (In.up ? 1 : 0) - (In.down ? 1 : 0);
    const k = 1 - Math.exp(-5 * dt), sp = 3.6;
    vel.x += (wx * sp - vel.x) * k; vel.z += (wz * sp - vel.z) * k; vel.y += (wy * 2.2 - vel.y) * k;
    pos.addScaledVector(vel, dt);
    pos.y = clamp(pos.y, 0.25, 2.85);
    World.resolve(pos, 0.28, pos.y - 0.15, pos.y + 0.15);
    s.bob += dt;
    s.battery -= dt * (1 / 150 + (s.night ? 1 / 360 : 0) + (s.rec ? 1 / 500 : 0));
  }

  function applyCam(cam) {
    cam.position.set(pos.x, pos.y + Math.sin(s.bob * 2.1) * 0.012, pos.z);
    cam.rotation.set(s.pitch, s.yaw, Math.sin(s.bob * 1.3) * 0.006);
  }

  // 録画
  function toggleRec() {
    if (!s.rec) { s.rec = true; s.frames = []; s.acc = 0; return 'start'; }
    return stopRec();
  }
  function stopRec() {
    if (!s.rec) return null;
    s.rec = false;
    if (s.frames.length >= 10) { s.clip = s.frames.slice(); return 'saved'; }
    return 'short';
  }
  function recTick(dt) {
    if (!s.rec) return;
    s.acc += dt;
    while (s.acc >= 0.1) {
      s.acc -= 0.1;
      s.frames.push({ px: pos.x, py: pos.y, pz: pos.z, yaw: s.yaw, pitch: s.pitch, ms: Monsters.snapshots(), night: s.night });
      if (s.frames.length >= MAX_FRAMES) { stopRec(); return; }
    }
  }

  return { pos, s, reset, update, applyCam, forward, toggleRec, stopRec, recTick, MAX_FRAMES };
})();
