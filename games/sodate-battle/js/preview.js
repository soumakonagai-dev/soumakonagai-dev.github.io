// ソダテバトル: ホーム画面の3Dキャラ表示
'use strict';

const Preview = (() => {
  let renderer, scene, cam, canvas, model, parts, ring, glowFloor, key = '', running = false, cheer = 0, ec = 0xffffff;

  function init() {
    if (renderer) return;
    canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(0, 2.3, 8.2); cam.lookAt(0, 1.15, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5090, 1.0));
    const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(3, 6, 5); scene.add(d);
    parts = new FX.Particles(600); scene.add(parts.points);
    ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.9, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
    glowFloor = FX.glowSprite(0xffffff, 6, 0.5); glowFloor.position.y = 0.2; scene.add(glowFloor);
  }
  // host: 表示先のDOM、def: { type, elem, color }
  function mount(host, def) {
    init();
    host.appendChild(canvas);
    const w = host.clientWidth || 300, h = host.clientHeight || 260;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const k = def.type + def.elem + def.color;
    if (k !== key) {
      key = k; ec = ELEM[def.elem].c;
      if (model) { scene.remove(model.root); }
      model = FX.buildModel(def); model.root.scale.setScalar(1.05); scene.add(model.root);
      ring.material.color.setHex(ec); glowFloor.material.color.setHex(ec);
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  function pulse() {
    if (!model) return;
    cheer = 0.9;
    const cs = FX.ELEM_FX[Object.keys(ELEM).find(k => ELEM[k].c === ec) || 'none'];
    for (let i = 0; i < 50; i++) { const a = Math.random() * 6.28; parts.emit({ x: Math.cos(a) * 1.2, y: 0.1, z: Math.sin(a) * 1.2, vx: Math.cos(a) * 0.5, vy: 2 + Math.random() * 4, vz: Math.sin(a) * 0.5, color: cs[i % 3], life: 0.9, size: 0.4, drag: 0.8 }); }
  }
  function loop(now) {
    if (!canvas.isConnected) { running = false; return; }
    requestAnimationFrame(loop);
    const t = now / 1000, dt = 1 / 60;
    cheer = Math.max(0, cheer - dt);
    model.root.rotation.y = Math.sin(t * 0.7) * 0.5;
    FX.pose(model, { moving: false, atk: cheer > 0 ? cheer / 0.9 : 0, style: 'buff', flash: 0, buff: cheer > 0 }, t);
    if (cheer > 0) model.root.position.y += Math.abs(Math.sin((1 - cheer / 0.9) * Math.PI * 2)) * 0.35;
    ring.rotation.z = t * 0.3; ring.material.opacity = 0.5 + Math.sin(t * 2) * 0.2;
    if (Math.random() < 0.3) parts.emit({ x: (Math.random() - 0.5) * 3.4, y: 0.1, z: (Math.random() - 0.5) * 3.4, vy: 0.6 + Math.random(), color: ec, life: 2, size: 0.18, drag: 0.1 });
    parts.update(dt); parts.setScale(canvas.height, cam.fov);
    renderer.render(scene, cam);
  }
  return { mount, pulse };
})();
