'use strict';
// ====== 3Dの世界（町・お店・歩く・カメラ・お客さん）======
const World = (function () {
  const T = THREE;
  let renderer, scene, cam, sun, hemi, lamp, rain, rainOn = false;
  const areas = {};
  let area = 'town', busy = false, cur = null, tNow = 0;
  const P = { x: 0, z: 4, rot: Math.PI, walk: 0, mesh: null };
  const C = { yaw: 0, pitch: 0.55, dist: 9 };
  const keys = {};
  const joyV = { x: 0, z: 0 }; let runOn = false;
  const jarSparkles = [];
  let manualDark = 0, darkV = 0, dayK = 1; const lt = { sun: 1, hemi: 1, lamp: 0 }, glowMats = [];
  const mats = {};
  const GEO = { box: new T.BoxGeometry(1, 1, 1), cyl: new T.CylinderGeometry(1, 1, 1, 20), sph: new T.SphereGeometry(1, 20, 14) };
  const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}));
  const m = (c, o) => { const k = c + JSON.stringify(o || ''); return mats[k] || (mats[k] = mat(c, o)); };

  // 角を丸めた箱（単位サイズの形を作って、あとから scale で大きさを決める）
  const rbCache = {};
  function roundedGeo(w, h, d, r) {
    const key = [w, h, d, r].map(v => v.toFixed(3)).join('|');
    if (rbCache[key]) return rbCache[key];
    const seg = 6, g = new T.BoxGeometry(w, h, d, seg, seg, seg);
    const p = g.attributes.position, n = g.attributes.normal, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ix = clamp(x, -hx, hx), iy = clamp(y, -hy, hy), iz = clamp(z, -hz, hz);
      let dx = x - ix, dy = y - iy, dz = z - iz; const len = Math.hypot(dx, dy, dz);
      let nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
      if (len > 1e-6) { dx /= len; dy /= len; dz /= len; p.setXYZ(i, ix + dx * r, iy + dy * r, iz + dz * r); nx = dx; ny = dy; nz = dz; }
      p.setXYZ(i, p.getX(i) / w, p.getY(i) / h, p.getZ(i) / d);
      const ux = nx * w, uy = ny * h, uz = nz * d, ul = Math.hypot(ux, uy, uz) || 1;   // 拡大しても正しい向きになるように
      n.setXYZ(i, ux / ul, uy / ul, uz / ul);
    }
    return (rbCache[key] = g);
  }
  function rbox(w, h, d, r, c, x, y, z, parent, o) {
    const me = new T.Mesh(r < 0.02 ? GEO.box : roundedGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.001)), m(c, o)); me.scale.set(w, h, d); me.position.set(x, y, z);
    me.castShadow = me.receiveShadow = true; if (parent) parent.add(me); return me;
  }
  function box(w, h, d, c, x, y, z, parent, o) { return rbox(w, h, d, Math.min(0.2, Math.min(w, h, d) * 0.34), c, x, y, z, parent, o); }
  // カプセル（円柱の両はしが半球）
  const capCache = {};
  function capsuleGeo(r, len) {
    const key = r + '|' + len; if (capCache[key]) return capCache[key];
    const pts = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; pts.push(new T.Vector2(Math.max(r * Math.cos(a), 0.0001), -len / 2 + r * Math.sin(a))); }
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push(new T.Vector2(Math.max(r * Math.cos(a), 0.0001), len / 2 + r * Math.sin(a))); }
    return (capCache[key] = new T.LatheGeometry(pts, 16));
  }
  function capsule(r, len, c, x, y, z, parent, o) {
    const me = new T.Mesh(capsuleGeo(r, len), m(c, o)); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; if (parent) parent.add(me); return me;
  }
  function cyl(rt, h, c, x, y, z, parent, o) {
    const me = new T.Mesh(GEO.cyl, m(c, o)); me.scale.set(rt, h, rt); me.position.set(x, y, z);
    me.castShadow = me.receiveShadow = true; if (parent) parent.add(me); return me;
  }
  function sph(r, c, x, y, z, parent, o) {
    const me = new T.Mesh(GEO.sph, m(c, o)); me.scale.set(r, r, r); me.position.set(x, y, z);
    me.castShadow = me.receiveShadow = true; if (parent) parent.add(me); return me;
  }
  function labelTex(text, w, h, bg, fg, fs) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    const font = s => `bold ${s}px "Hiragino Maru Gothic ProN","Yu Gothic UI",Meiryo,sans-serif`;
    g.font = font(fs); while (g.measureText(text).width > w - 24 && fs > 12) { fs -= 2; g.font = font(fs); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function sign(text, w, h, bg, fg, parent, x, y, z, ry) {
    const me = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: labelTex(text, 512, Math.round(512 * h / w), bg, fg, 64), transparent: !bg }));
    me.position.set(x, y, z); me.rotation.y = ry || 0; parent.add(me); return me;
  }

  const FACE_DARK = 0x2a1a14;
  function makePerson(shirt, hair, hat) {
    const g = new T.Group(), skin = 0xffd9b8, pants = 0x3a4a7a;
    const torso = sph(1, shirt, 0, 0.98, 0, g); torso.scale.set(0.37, 0.47, 0.31);
    const hips = sph(1, pants, 0, 0.62, 0, g); hips.scale.set(0.33, 0.26, 0.28);
    const head = sph(0.34, skin, 0, 1.62, 0, g); head.scale.set(0.35, 0.33, 0.33);
    for (const s of [-1, 1]) {
      sph(0.05, FACE_DARK, s * 0.125, 1.65, 0.3, g).scale.set(0.045, 0.058, 0.03);
      sph(0.016, 0xffffff, s * 0.125 + 0.015, 1.675, 0.325, g);
      const ch = sph(1, 0xff9aa8, s * 0.21, 1.55, 0.25, g, { transparent: true, opacity: 0.7 }); ch.scale.set(0.065, 0.04, 0.02); ch.castShadow = false;
    }
    const mouth = new T.Mesh(new T.TorusGeometry(0.055, 0.011, 6, 12, Math.PI), m(0x7a3a30)); mouth.rotation.z = Math.PI; mouth.position.set(0, 1.545, 0.315); g.add(mouth);
    const cap = new T.Mesh(new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), m(hair)); cap.scale.set(0.375, 0.37, 0.37); cap.position.set(0, 1.63, -0.02); cap.rotation.x = -0.28; cap.castShadow = true; g.add(cap);
    sph(1, hair, 0, 1.6, -0.14, g).scale.set(0.34, 0.31, 0.25);
    if (hat) {
      const hc = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m(hat)); hc.scale.set(0.39, 0.3, 0.39); hc.position.set(0, 1.76, -0.01); hc.castShadow = true; g.add(hc);
      cyl(1, 0.03, hat, 0, 1.76, 0.3, g).scale.set(0.2, 0.03, 0.14);
    }
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const l = new T.Group(); l.position.set(0.14 * s, 0.56, 0); capsule(0.1, 0.22, pants, 0, -0.14, 0, l);
      const shoe = sph(1, 0xfafafa, 0, -0.43, 0.05, l); shoe.scale.set(0.125, 0.085, 0.19); g.add(l); legs.push(l);
      const ar = new T.Group(); ar.position.set(0.4 * s, 1.2, 0); capsule(0.075, 0.28, shirt, 0, -0.2, 0, ar); sph(0.085, skin, 0, -0.43, 0, ar); g.add(ar); arms.push(ar);
    }
    g.userData.legs = legs; g.userData.arms = arms;
    return g;
  }
  function animPerson(g, walking, dt, t) {
    const L = g.userData.legs, A = g.userData.arms;
    if (walking) {
      g.userData.ph = (g.userData.ph || 0) + dt * 9; const s = Math.sin(g.userData.ph);
      L[0].rotation.x = s * 0.7; L[1].rotation.x = -s * 0.7; A[0].rotation.x = -s * 0.6; A[1].rotation.x = s * 0.6;
      g.position.y = Math.abs(s) * 0.06;
    } else { L[0].rotation.x *= 0.8; L[1].rotation.x *= 0.8; A[0].rotation.x *= 0.85; A[1].rotation.x *= 0.85; g.position.y = 0; }
  }

  // ---------- テクスチャ（canvasで作る）----------
  const rr = (a, b) => a + Math.random() * (b - a);
  const css = c => '#' + c.toString(16).padStart(6, '0');
  const shade = (c, k) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = v => clamp(Math.round(v * (1 + k)), 0, 255); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };
  function canvasTex(size, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 8; return t;
  }
  const grassTex = () => canvasTex(256, (g, s) => { g.fillStyle = '#8fd18a'; g.fillRect(0, 0, s, s); for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(100,180,95,.5)' : 'rgba(180,235,150,.45)'; g.fillRect(rr(0, s), rr(0, s), rr(1, 3), rr(2, 7)); } }, 100, 100);
  const asphaltTex = () => canvasTex(128, (g, s) => { g.fillStyle = '#5b5f6b'; g.fillRect(0, 0, s, s); for (let i = 0; i < 700; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; g.fillRect(rr(0, s), rr(0, s), 2, 2); } }, 20, 2);
  const woodTex = base => canvasTex(256, (g, s) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = shade(base, rr(-0.07, 0.07)); g.fillRect(i * 32, 0, 32, s); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(i * 32, 0, 2, s); for (let k = 0; k < 8; k++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(i * 32 + rr(3, 28), rr(0, s), 1, rr(20, 90)); } }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(rr(0, 256), (i * 64 + rr(0, 60)) | 0, 32, 2); }
  }, 6, 4);
  const tileTex = base => canvasTex(128, (g, s) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = shade(base, (x + y) % 2 ? -0.05 : 0.04); g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2; g.strokeRect(0, 0, s, s); g.strokeRect(64, 64, 1, 1); }, 9, 6);
  const texMat = (tex, o) => new T.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.8 }, o || {}));

  let envTex = null, skyMat = null, skyDome = null, clouds = null, cloudMat = null;
  function makeEnv() {   // 空と窓あかりの絵を反射用の環境マップにする（つやのハイライトになる）
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#5f9cf5'); gr.addColorStop(0.42, '#eaf4ff'); gr.addColorStop(0.5, '#fff7ea'); gr.addColorStop(0.56, '#9a8a74'); gr.addColorStop(1, '#4a3d30');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) { g.fillRect(40 + i * 170, 120, 90, 70); }
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 60, 1024, 14);
    const tex = new T.CanvasTexture(c); tex.mapping = T.EquirectangularReflectionMapping;
    const pm = new T.PMREMGenerator(renderer); const env = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose(); return env;
  }
  function makeSky() {
    skyMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(0x5aa8ff) }, hor: { value: new T.Color(0x9fd8ff) } },
      vertexShader: 'varying vec3 p; void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 hor;varying vec3 p; void main(){float h=clamp(p.y,0.,1.);gl_FragColor=vec4(mix(hor,top,pow(h,.55)),1.);}' });
    skyDome = new T.Mesh(new T.SphereGeometry(300, 24, 14), skyMat); skyDome.renderOrder = -10; skyDome.frustumCulled = false; scene.add(skyDome);
    cloudMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
    clouds = new T.Group();
    for (let i = 0; i < 12; i++) {
      const c = new T.Group();
      for (let j = 0; j < 4; j++) { const s = new T.Mesh(GEO.sph, cloudMat); s.scale.set(rr(6, 10), rr(3, 4.5), rr(4, 6)); s.position.set(j * 6 - 9, rr(-1, 1.5), rr(-2, 2)); c.add(s); }
      c.position.set(rr(-170, 170), rr(48, 80), rr(-170, 40)); clouds.add(c);
    }
    scene.add(clouds);
  }

  function newArea(name, bounds, indoor) {
    const g = new T.Group(); scene.add(g);
    return (areas[name] = { name, bounds, obst: [], hot: [], group: g, indoor, spawn: { x: 0, z: 0, rot: 0 } });
  }
  const wallObst = (a, x0, x1, z0, z1) => a.obst.push({ x0, x1, z0, z1 });
  function addHot(a, x, z, r, label, act, markerY) {
    const h = { x, z, r, label, act };
    const mk = new T.Mesh(new T.ConeGeometry(0.25, 0.5, 4), new T.MeshBasicMaterial({ color: 0xffe14a }));
    mk.rotation.x = Math.PI; mk.position.set(x, markerY || 2.2, z); a.group.add(mk); h.marker = mk;
    a.hot.push(h); return h;
  }

  // ---------- 町 ----------
  function buildTown() {
    const a = newArea('town', [-72, 84, -44, 58], false);
    const g = a.group;
    const ground = new T.Mesh(new T.PlaneGeometry(500, 500), texMat(grassTex(), { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const asph = asphaltTex(); const road = (x, z, w, d) => { const r = new T.Mesh(new T.PlaneGeometry(w, d), texMat(asph, { roughness: 1 })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z); r.receiveShadow = true; g.add(r); };
    road(0, 0, 150, 8); road(-36, 4, 6, 50); road(38, 4, 6, 50); road(0, -4.5, 6, 6);
    for (let x = -70; x < 70; x += 6) box(2.6, 0.03, 0.25, 0xf3f0d0, x, 0.04, 0, g);
    // 歩道
    box(150, 0.06, 2, 0xcfcab8, 0, 0.03, -5.2, g); box(150, 0.06, 2, 0xcfcab8, 0, 0.03, 5.2, g);

    function building(id, x, z, w, d, h, color, roofC, face, text, enter, o) {
      o = o || {};
      const gb = new T.Group(); g.add(gb);
      rbox(w, h, d, 0.6, color, x, h / 2, z, gb);
      rbox(w + 0.8, 0.6, d + 0.8, 0.28, roofC, x, h + 0.25, z, gb);
      if (id !== 'shop') {
        const rg = new T.ConeGeometry(0.7071, 1, 4); rg.rotateY(Math.PI / 4);
        const roof = new T.Mesh(rg, m(roofC)); roof.scale.set(w + 1.4, 2.8, d + 1.4); roof.position.set(x, h + 0.5 + 1.4, z); roof.castShadow = roof.receiveShadow = true; gb.add(roof);
        rbox(1.1, 2.4, 1.1, 0.35, 0x9a7a60, x + w * 0.28, h + 2.4, z - d * 0.2, gb);
      }
      const s = face === 'S' ? 1 : -1, fz = z + s * d / 2;
      rbox(2.2, 3.2, 0.2, 0.09, 0x5a3a24, x, 1.6, fz + s * 0.05, gb); sph(0.09, 0xffd23f, x + 0.7, 1.5, fz + s * 0.2, gb);
      rbox(3.6, 0.4, 1.6, 0.18, roofC, x, 3.5, fz + s * 0.8, gb);
      sign(text, w * 0.8, 1.5, '#fff8e8', '#3b2a1c', gb, x, h - 0.95, fz + s * 0.06, face === 'S' ? 0 : Math.PI);
      for (const wx of [-1, 1]) for (const wy of [2.4, 4.4]) if (wy < h - 1) {
        const wxp = x + wx * w * 0.3;
        box(2.5, 1.9, 0.12, 0xffffff, wxp, wy, fz + s * 0.04, gb);
        box(2, 1.4, 0.1, 0xbfe6ff, wxp, wy, fz + s * 0.1, gb, { emissive: 0x335577, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.2 });
        box(0.1, 1.4, 0.12, 0xffffff, wxp, wy, fz + s * 0.12, gb); box(2, 0.1, 0.12, 0xffffff, wxp, wy, fz + s * 0.12, gb);
        if (wy < 3) { box(2.4, 0.4, 0.5, 0x8a5a3a, wxp, wy - 1.15, fz + s * 0.3, gb); for (let k = 0; k < 6; k++) sph(0.17, [0xff6b8a, 0xffd23f, 0xffffff][k % 3], wxp - 0.9 + k * 0.36, wy - 0.9, fz + s * 0.3, gb); }
      }
      box(2.8, 0.12, 0.12, 0xffffff, x, 3.25, fz + s * 0.1, gb);
      a.obst.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
      addHot(a, x, fz + s * 1.9, 2.3, enter.label, enter.act, 3.6);
      return gb;
    }
    // 自分のお店
    const my = building('shop', 0, -13, 16, 10, 6.5, 0x8ee6b8, 0x2fae7a, 'S', 'スライム商店', { label: () => '自分のお店に入る', act: () => go('shop') });
    const blob = sph(1.5, 0x6fe0a0, 0, 8.6, -13, my, { roughness: 0.25, transparent: true, opacity: 0.85 }); blob.scale.set(2.2, 1.5, 2.2);
    sph(0.22, 0x103020, -0.6, 8.9, -11.1, my); sph(0.22, 0x103020, 0.6, 8.9, -11.1, my);
    a.blob = blob;
    a.fixRoad = true;
    pad(a, -20, 10, () => 'テレポーター（ほかの町へ）', () => Biz.openTeleport());
    building('hyakkin', -36, -26, 12, 9, 5, 0xffe08a, 0xe8a02a, 'S', '100円ショップ まるえん', { label: () => '100円ショップに入る', act: () => go('hyakkin') });
    building('home', 38, -26, 16, 10, 6, 0xb9d3ee, 0x4a76b0, 'S', 'ホームセンター ガッツ', { label: () => 'ホームセンターに入る', act: () => go('home') });
    building('art', -36, 28, 12, 9, 5, 0xf3c6e6, 0xc84fa0, 'N', '画材屋 いろどり', { label: () => '画材屋に入る', act: () => go('art') });
    building('wholesale', 38, 28, 16, 10, 6, 0xc9e6c0, 0x4f8a45, 'N', '問屋 どんどん商会', {
      label: () => S && repLevel() >= SHOPS.wholesale.needRep ? '問屋に入る' : '準備中（評判★3で開店）',
      act: () => { if (repLevel() >= SHOPS.wholesale.needRep) go('wholesale'); else UI.toast('ここはまだ開いていない。お店の評判が★3になると仕入れさせてくれるらしい'); },
    });

    // 友達の家（科学オタク／エンジニア）
    building('lab', -62, -14, 11, 8, 5, 0xe6f2ff, 0x5a8fd0, 'S', '科学オタクの家', { label: () => '科学オタクの友達の家に入る', act: () => go('lab') });
    building('smith', 62, -14, 11, 8, 5, 0xffe2b0, 0xc9722a, 'S', 'エンジニアの工房', { label: () => 'エンジニアの友達の家に入る', act: () => go('smith') });
    // 冒険の山への入口：道のいちばん東のはし。光の柱・大きな看板・矢印で、ひと目でわかる
    const gx = 70;
    for (const sz of [-1, 1]) {
      rbox(1.8, 8, 1.8, 0.7, 0x8a8f96, gx, 4, sz * 4.6, g); a.obst.push({ x0: gx - 1, x1: gx + 1, z0: sz * 4.6 - 1, z1: sz * 4.6 + 1 });
      sph(0.55, 0xffa030, gx, 8.6, sz * 4.6, g, { emissive: 0xff8a20, emissiveIntensity: 1 }).castShadow = false;
    }
    rbox(1.8, 1.6, 11.6, 0.55, 0x9aa0a8, gx, 7.7, 0, g);
    sign('⚔ 冒険の山', 6.4, 1.4, '#3b2a1c', '#ffe27a', g, gx - 0.95, 7.7, 0, -Math.PI / 2);
    road(gx + 3.5, 0, 9, 8);
    const beam = new T.Mesh(new T.CylinderGeometry(0.9, 1.7, 70, 18, 1, true), new T.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.26, side: T.DoubleSide, depthWrite: false, fog: false }));
    beam.position.set(gx, 35, 0); g.add(beam); a.beacon = beam;
    const tag = new T.Sprite(new T.SpriteMaterial({ map: labelTex('⚔ 冒険はこっち！ →', 512, 128, '#3b2a1c', '#ffe27a', 62), depthTest: false })); tag.scale.set(8, 2, 1); tag.position.set(gx - 3, 11.5, 0); tag.renderOrder = 25; g.add(tag); a.tag = tag;
    const arr = new T.Shape(); arr.moveTo(0, 0.7); arr.lineTo(1.4, 0); arr.lineTo(0, -0.7); arr.lineTo(0.4, 0);
    for (let x = 14; x < 62; x += 7) { const am = new T.Mesh(new T.ShapeGeometry(arr), new T.MeshBasicMaterial({ color: 0xffd23f })); am.rotation.x = -Math.PI / 2; am.position.set(x, 0.05, -1.4); g.add(am); }
    for (const px of [12, 40]) { box(0.2, 2.4, 0.2, 0x7a5233, px, 1.2, -4.8, g); sign('⚔ 冒険の山 →（東）', 4.2, 1.0, '#3b2a1c', '#ffe27a', g, px, 2.5, -4.66, 0); }
    addHot(a, gx - 4.2, 0, 3.8, () => '山へ冒険に出る（魔物がいるよ！）', () => go('mountain'), 3.4);
    // 木・街灯
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const free = (x, z, r) => !a.obst.some(o => x > o.x0 - r - 2 && x < o.x1 + r + 2 && z > o.z0 - r - 2 && z < o.z1 + r + 2) && !(Math.abs(z) < 8) && !(Math.abs(x + 36) < 6 && z > -20 && z < 28) && !(Math.abs(x - 38) < 6 && z > -20 && z < 28) && !(Math.abs(x) < 5 && z > -9) && !(Math.abs(x) < 8 && z < -30) && !(Math.hypot(x + 20, z - 10) < 5);
    for (let i = 0, n = 0; n < 60 && i < 600; i++) {
      const x = (rnd() - 0.5) * 140, z = -42 + rnd() * 98;
      if (!free(x, z, 1.2)) continue; n++;
      const s = 0.8 + rnd() * 0.7;
      cyl(0.25 * s, 1.6 * s, 0x7a5233, x, 0.8 * s, z, g);
      const lv = rnd() < 0.2 ? 0xf5a3c0 : 0x3fae5a;
      sph(1.3 * s, lv, x, 2.4 * s, z, g); sph(0.95 * s, lv, x, 3.4 * s, z, g);
      a.obst.push({ c: true, x, z, r: 0.5 * s });
    }
    for (let x = -56; x <= 64; x += 16) {
      cyl(0.08, 3.6, 0x333a44, x, 1.8, -5.9, g); sph(0.25, 0xfff2b0, x, 3.7, -5.9, g, { emissive: 0xffe9a0, emissiveIntensity: 0.8 });
    }
    // かざり：しげみ・花・ベンチ・郵便ポスト
    const bushC = [0x3f9e55, 0x4bb064];
    for (const bx of [-6.5, 6.5, -11.5, 11.5, 3.6, -3.6]) { sph(0.9, bushC[0], bx, 0.7, -7.6, g).scale.set(0.9, 0.7, 0.8); sph(0.6, bushC[1], bx + 0.7, 0.5, -7.4, g); }
    for (const bench of [[-9, -4.6], [9.5, -4.6], [-30, -5.3]]) { box(2, 0.12, 0.7, 0x9a6a3a, bench[0], 0.55, bench[1], g); box(2, 0.6, 0.1, 0x9a6a3a, bench[0], 0.95, bench[1] - 0.3, g); box(0.1, 0.55, 0.6, 0x555555, bench[0] - 0.8, 0.28, bench[1], g); box(0.1, 0.55, 0.6, 0x555555, bench[0] + 0.8, 0.28, bench[1], g); }
    cyl(0.06, 1.2, 0x555555, 4.5, 0.6, -5.0, g); box(0.5, 0.5, 0.4, 0xe5525a, 4.5, 1.3, -5.0, g);
    const fl = new T.InstancedMesh(GEO.sph, new T.MeshStandardMaterial({ roughness: 0.6 }), 260), dm = new T.Object3D(), fc = [0xff6b8a, 0xffd23f, 0xffffff, 0xb28aff, 0xff9a4a];
    for (let i = 0, n = 0; n < 260 && i < 3000; i++) {
      const x = (rnd() - 0.5) * 140, z = -44 + rnd() * 100;
      if (!free(x, z, 0.4)) continue;
      dm.position.set(x, 0.12, z); dm.scale.setScalar(0.1 + rnd() * 0.06); dm.updateMatrix(); fl.setMatrixAt(n, dm.matrix); fl.setColorAt(n, new T.Color(fc[(rnd() * 5) | 0])); n++;
    }
    g.add(fl);
    // 遠くの丘
    for (let i = 0; i < 14; i++) {
      const hx = -120 + i * 20, hh = 8 + (i * 37 % 7) * 2;
      const hill = new T.Mesh(new T.ConeGeometry(14, hh, 6), m(0x6bbf7a)); hill.position.set(hx, hh / 2 - 0.5, -75 - (i % 3) * 6); g.add(hill);
    }
    a.spawn = { x: 0, z: -4.2, rot: 0 };
    a.fixSpawn = { x: 0, z: -4.4, rot: Math.PI };
    return a;
  }

  // ---------- 室内 ----------
  const GOODS = [0xff7a7a, 0x7ab8ff, 0xffd95e, 0x7ae0a0, 0xd89cff, 0xffffff];
  function buildRoom(name, ox, w, d, floorC, wallC) {
    const a = newArea(name, [ox - w / 2 + 0.6, ox + w / 2 - 0.6, -d / 2 + 0.6, d / 2 - 0.6], true);
    a.ox = ox; const g = a.group;
    const outside = new T.Mesh(new T.PlaneGeometry(90, 90), m(0x24352e)); outside.rotation.x = -Math.PI / 2; outside.position.set(ox, -0.03, 0); g.add(outside);
    const ftex = name === 'shop' ? woodTex(floorC) : tileTex(floorC); ftex.repeat.set(w / 4.5, d / 4.5);
    const fl = new T.Mesh(new T.PlaneGeometry(w, d), texMat(ftex, { roughness: name === 'shop' ? 0.55 : 0.4 })); fl.rotation.x = -Math.PI / 2; fl.position.set(ox, 0.01, 0); fl.receiveShadow = true; a.floorMesh = fl; a.floorSize = [w, d]; g.add(fl);
    const H = 5.5, wm = name === 'shop' ? new T.MeshStandardMaterial({ color: wallC, roughness: 0.85 }) : m(wallC, { side: T.FrontSide }); a.wallMat = wm;
    const wall = (pw, x, z, ry) => { const p = new T.Mesh(new T.PlaneGeometry(pw, H), wm); p.receiveShadow = true; p.position.set(x, H / 2, z); p.rotation.y = ry; g.add(p); };
    wall(w, ox, -d / 2, 0); wall(w, ox, d / 2, Math.PI); wall(d, ox - w / 2, 0, Math.PI / 2); wall(d, ox + w / 2, 0, -Math.PI / 2);
    box(w, 0.25, 0.1, 0xffffff, ox, 0.13, -d / 2 + 0.06, g);
    const wain = name === 'shop' ? 0x62d6a8 : new T.Color(wallC).multiplyScalar(0.75).getHex();
    box(w, 1.5, 0.14, wain, ox, 0.75, -d / 2 + 0.07, g); box(w, 0.1, 0.2, 0xffffff, ox, 1.5, -d / 2 + 0.1, g);
    box(0.14, 1.5, d, wain, ox - w / 2 + 0.07, 0.75, 0, g); box(0.14, 1.5, d, wain, ox + w / 2 - 0.07, 0.75, 0, g);
    for (const sx of [-1, 1]) for (const wz of [-d * 0.28, d * 0.12]) {
      const wxp = ox + sx * (w / 2 - 0.06);
      box(0.1, 2.3, 2.7, 0xffffff, wxp, 3.4, wz, g).castShadow = false;
      box(0.1, 1.9, 2.3, 0xcdeeff, wxp - sx * 0.04, 3.4, wz, g, { emissive: 0xaad4ff, emissiveIntensity: 0.55 }).castShadow = false;
    }
    for (const lx of [-w * 0.28, 0, w * 0.28]) {
      cyl(0.02, 1.2, 0x333333, ox + lx, 4.9, -1, g).castShadow = false;
      const lp = sph(0.26, 0xfff3c8, ox + lx, 4.4, -1, g, { emissive: 0xffe3a0, emissiveIntensity: 0.9 }); lp.scale.y = 0.75; lp.castShadow = false;
    }
    if (name === 'shop') { const r1 = cyl(3.6, 0.03, 0xf0709a, ox, 0.03, 0.5, g), r2 = cyl(2.8, 0.035, 0xffa8c4, ox, 0.035, 0.5, g); r1.castShadow = r2.castShadow = false; r1.material = new T.MeshStandardMaterial({ color: 0xf0709a }); r2.material = new T.MeshStandardMaterial({ color: 0xffa8c4 }); a.rugs = [r1, r2]; }
    // ドア（南壁）
    const door = new T.Mesh(new T.PlaneGeometry(2.4, 3.3), m(0x5a3a24, { side: T.FrontSide })); door.position.set(ox, 1.65, d / 2 - 0.03); door.rotation.y = Math.PI; g.add(door);
    addHot(a, ox, d / 2 - 1.5, 1.8, () => '外に出る', () => go('town'), 2.6);
    a.spawn = { x: ox, z: d / 2 - 3.8, rot: Math.PI };
    return a;
  }
  function stockShelf(a, x, z, len, tiers, goodsCols, face) {
    const g = a.group;
    for (let t = 0; t < tiers; t++) {
      box(len, 0.1, 0.8, 0xb98a5a, x, 0.5 + t * 0.95, z, g);
      for (let i = 0; i < Math.floor(len / 0.55); i++) {
        const c = goodsCols[(i + t * 2) % goodsCols.length];
        const it = box(0.34, 0.5, 0.3, c, x - len / 2 + 0.35 + i * 0.55, 0.8 + t * 0.95, z, g);
      }
    }
    box(0.12, tiers * 0.95 + 0.3, 0.8, 0x8a6238, x - len / 2, (tiers * 0.95 + 0.3) / 2, z, g); box(0.12, tiers * 0.95 + 0.3, 0.8, 0x8a6238, x + len / 2, (tiers * 0.95 + 0.3) / 2, z, g);
    wallObst(a, x - len / 2, x + len / 2, z - 0.45, z + 0.45);
  }
  function buildFriend(id, ox) {
    const lab = id === 'lab', a = buildRoom(id, ox, 18, 13, lab ? 0xdfe8f0 : 0x8a8f96, lab ? 0xe6f2ff : 0xffe2b0), g = a.group;
    sign(lab ? '科学研究所' : 'エンジニアの工房', 7, 1.2, '#fff8e8', '#3b2a1c', g, ox, 4.4, -6.15, 0);
    if (lab) {
      stockShelf(a, ox - 4, -5.6, 7, 3, [0xff7aa8, 0x7ae0a0, 0x7ab8ff, 0xffd95e, 0xd89cff]);
      rbox(5, 1, 1.6, 0.25, 0xf5f8ff, ox + 3, 0.5, -3, g); wallObst(a, ox + 0.5, ox + 5.5, -3.8, -2.2);
      [0xff6b8a, 0x62d6a8, 0x58a8ff, 0xffd23f].forEach((c, i) => { cyl(0.16, 0.38, c, ox + 1.4 + i * 0.9, 1.2, -3, g, { transparent: true, opacity: 0.8 }); sph(0.19, c, ox + 1.4 + i * 0.9, 1.45, -3, g, { transparent: true, opacity: 0.8 }); });
      cyl(0.45, 0.9, 0x9fe8ff, ox + 6.2, 1.2, 1, g, { transparent: true, opacity: 0.6 });
      const sc = makePerson(0xffffff, 0x222244, null); sc.position.set(ox + 3, 0, -1.6); g.add(sc);
      for (const s of [-1, 1]) { const gl = new T.Mesh(new T.TorusGeometry(0.1, 0.014, 6, 14), m(0x333333)); gl.position.set(s * 0.125, 1.65, 0.33); sc.add(gl); }
    } else {
      stockShelf(a, ox - 4, -5.6, 7, 2, [0xcfd6dc, 0x9aa0a8, 0xff9a4a]);
      WEAPONS.forEach((w, i) => { const x = ox + 1.5 + (i % 3) * 1.8, y = 2.2 + Math.floor(i / 3) * 1.4; rbox(0.14, 1.1, 0.06, 0.03, w.color, x, y, -6.3, g, { metalness: 0.4, roughness: 0.35 }); rbox(0.5, 0.1, 0.1, 0.04, 0x5a3a24, x, y - 0.4, -6.3, g); });
      rbox(1.6, 0.8, 1.0, 0.2, 0x3a3f48, ox + 4.2, 0.4, -2.6, g); rbox(1.0, 0.25, 0.7, 0.1, 0x4a5058, ox + 4.2, 0.9, -2.6, g); wallObst(a, ox + 3.2, ox + 5.2, -3.2, -2);
      cyl(0.5, 0.2, 0xb8c0c8, ox + 6.8, 0.2, 1.2, g); cyl(0.3, 0.3, 0xffd23f, ox + 6.8, 0.45, 1.2, g);
      const en = makePerson(0xff9a3a, 0x553322, 0xffd23f); en.position.set(ox + 3.4, 0, -1.4); g.add(en);
    }
    addHot(a, ox + 2, -0.2, 3.2, () => lab ? '科学オタクの友達と話す' : 'エンジニアの友達と話す', () => lab ? UI.openLab() : UI.openSmith(), 2.8);
    return a;
  }
  function buildSupplier(id, ox) {
    const sd = SHOPS[id];
    const a = buildRoom(id, ox, 18, 13, sd.floor, sd.wall), g = a.group;
    const cols = sd.stock.map(s => new T.Color(ITEMS[s[0]].color).getHex());
    stockShelf(a, ox, -5.6, 14, 3, cols); stockShelf(a, ox - 5, -1.2, 6, 2, cols); stockShelf(a, ox + 5, -1.2, 6, 2, cols);
    // レジ
    box(4, 1, 1.4, 0xf5ead8, ox + 5, 0.5, 3.2, g); box(0.7, 0.45, 0.5, 0x333844, ox + 5.8, 1.22, 3.2, g); wallObst(a, ox + 3, ox + 7, 2.5, 3.9);
    const kp = makePerson(0xffffff, 0x332211, 0xff6b6b); kp.position.set(ox + 5, 0, 4.2); kp.rotation.y = Math.PI; g.add(kp);
    sign(sd.name, 8, 1.3, '#fff8e8', '#3b2a1c', g, ox, 4.4, -6.15, 0);
    addHot(a, ox, -3.4, 2.4, () => `${sd.short}で仕入れる`, () => UI.openShop(id), 2.6);
    return a;
  }

  // ---------- 自分のお店 ----------
  const SLOT = i => ({ x: -9 + 2.4 * (i % 4), y: 0.55 + 0.95 * Math.floor(i / 4), z: -7.5 });
  let shelfG, staffG, visitG;
  function buildMyShop() {
    const ox = 1000, a = buildRoom('shop', ox, 26, 16, 0xc79a62, 0xfde6cf), g = a.group;
    a.slotBase = ox;
    // 陳列棚（奥の壁・左）
    for (let t = 0; t < 3; t++) box(10.6, 0.1, 0.9, 0xb98a5a, ox - 5.4, 0.5 + t * 0.95, -7.5, g);
    for (let c = 0; c < 6; c++) box(0.1, 3.0, 0.9, 0x8a6238, ox - 10.6 + c * 2.4, 1.5, -7.5, g);
    wallObst(a, ox - 10.8, ox + 0.6, -8, -6.9);
    sign('こだわりスライム', 6, 1, '#fff8e8', '#2a7a58', g, ox - 5.4, 4.3, -7.7, 0);
    shelfG = new T.Group(); g.add(shelfG); staffG = new T.Group(); g.add(staffG); visitG = new T.Group(); g.add(visitG);
    addHot(a, ox - 5.4, -5.5, 3.2, () => '棚の商品・ねだん', () => UI.openShelf(), 2.8);
    // カウンター
    rbox(6, 1.1, 1.4, 0.32, 0xf5ead8, ox - 3, 0.55, 2.6, g); box(0.8, 0.5, 0.6, 0x333844, ox - 1.6, 1.35, 2.6, g); wallObst(a, ox - 6, ox, 1.9, 3.3);
    // 工房テーブル（奥の壁・右）
    const wx = ox + 6.5, wz = -5.2;
    rbox(5.4, 0.22, 2.4, 0.1, 0xd9b88a, wx, 0.9, wz, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.2, 0.9, 0.2, 0x8a6238, wx + sx * 2.5, 0.45, wz + sz * 1.0, g);
    wallObst(a, wx - 2.7, wx + 2.7, wz - 1.2, wz + 1.2);
    sign('こうぼう', 3.4, 0.8, '#fff8e8', '#2a7a58', g, wx, 4.3, -7.7, 0);
    a.ws = { x: wx, z: wz };
    addHot(a, wx, wz + 2.4, 2.2, () => '工房（スライムを作る）', () => Workshop.enter(), 2.8);
    // 事務机
    box(3, 0.15, 1.5, 0xd9b88a, ox + 10, 0.9, 4.5, g); box(0.15, 0.9, 1.4, 0x8a6238, ox + 8.6, 0.45, 4.5, g); box(0.15, 0.9, 1.4, 0x8a6238, ox + 11.4, 0.45, 4.5, g);
    box(0.9, 0.6, 0.08, 0x333844, ox + 10, 1.5, 4.3, g, { emissive: 0x4488cc, emissiveIntensity: 0.6 });
    wallObst(a, ox + 8.4, ox + 11.6, 3.7, 5.3);
    addHot(a, ox + 8.2, 4.5, 2.2, () => '事務机（経営・在庫・レシピ）', () => UI.openOffice(), 2.8);
    // 在庫ラック
    for (let i = 0; i < 4; i++) box(1.6, 2.2, 0.8, 0x9aa7b4, ox + 12.4, 1.1, -1 + i * 1.8, g).scale.set(0.8, 2.2, 1.6);
    wallObst(a, ox + 11.8, ox + 13, -2, 6);
    // 観葉植物など
    cyl(0.4, 0.5, 0xc86a3a, ox + 11.5, 0.25, -7, g); sph(0.6, 0x3fae5a, ox + 11.5, 1.1, -7, g);
    // 家具屋で買えるかざり
    const dc = a.decor = {}, mk = (id, fn) => { const dg = new T.Group(); dg.visible = false; g.add(dg); fn(dg); dc[id] = dg; };
    mk('plant', dg => { cyl(0.45, 0.6, 0xe0a070, ox - 11.6, 0.3, 6.4, dg); sph(0.8, 0x3fae5a, ox - 11.6, 1.3, 6.4, dg); sph(0.55, 0x57c470, ox - 11.2, 1.9, 6.6, dg); });
    mk('poster', dg => { sign('SLIME!', 2.2, 3, '#ff9bb5', '#ffffff', dg, ox + 3.2, 3.2, -7.93, 0); sign('♡ぷにぷに♡', 2.2, 3, '#9ad0ff', '#ffffff', dg, ox + 12.9, 3.2, 1.5, -Math.PI / 2); });
    mk('neon', dg => { const nm = new T.Mesh(new T.PlaneGeometry(7, 1.6), new T.MeshBasicMaterial({ map: labelTex('SLIME SHOP', 512, 116, '#1a1030', '#ff6ad5', 70) })); nm.position.set(ox - 5.4, 4.8, -7.9); dg.add(nm); const pl = new T.PointLight(0xff6ad5, 0.8, 12); pl.position.set(ox - 5.4, 4.2, -6.5); dg.add(pl); });
    mk('sofa', dg => { rbox(3.4, 0.8, 1.3, 0.3, 0xff9bb5, ox - 8.4, 0.4, 5.6, dg); rbox(3.4, 0.9, 0.35, 0.15, 0xff8aa8, ox - 8.4, 1.0, 6.1, dg); rbox(0.35, 0.8, 1.3, 0.15, 0xff8aa8, ox - 10, 0.7, 5.6, dg); rbox(0.35, 0.8, 1.3, 0.15, 0xff8aa8, ox - 6.8, 0.7, 5.6, dg); });
    mk('chandelier', dg => { cyl(0.04, 1.2, 0x666666, ox, 5.0, 3.5, dg); for (let i = 0; i < 6; i++) { const q = i / 6 * 6.28; sph(0.2, 0xfff3c8, ox + Math.cos(q) * 0.9, 4.2, 3.5 + Math.sin(q) * 0.9, dg, { emissive: 0xffe3a0, emissiveIntensity: 1 }).castShadow = false; } sph(0.35, 0xffe9a8, ox, 4.5, 3.5, dg, { emissive: 0xffe3a0, emissiveIntensity: 1 }).castShadow = false; });
    mk('aquarium', dg => { rbox(2.8, 1.5, 1.1, 0.12, 0x6fc4ff, ox - 11.8, 0.9, -1.5, dg, { transparent: true, opacity: 0.5 }); rbox(3, 0.8, 1.3, 0.1, 0x7a5a3a, ox - 11.8, 0.4, -1.5, dg); [0xff9a4a, 0xffe36a, 0xff6a8a].forEach((c, i) => { const f = sph(0.14, c, ox - 12.6 + i * 0.9, 1.0 + (i % 2) * 0.3, -1.5, dg); f.scale.set(0.25, 0.14, 0.12); }); });
    return a;
  }

  function applyInterior(I) {
    const a = areas.shop; if (!a || !a.floorMesh) return;
    const fo = DECO.floor.find(o => o.id === I.floor) || DECO.floor[0], wa = DECO.wall.find(o => o.id === I.wall) || DECO.wall[0], ru = DECO.rug.find(o => o.id === I.rug) || DECO.rug[0];
    const tex = fo.type === 'tile' ? tileTex(fo.c) : woodTex(fo.c); tex.repeat.set(a.floorSize[0] / 4.5, a.floorSize[1] / 4.5);
    a.floorMesh.material = texMat(tex, { roughness: fo.type === 'tile' ? 0.4 : 0.55 }); a.wallMat.color.set(wa.c);
    a.rugs[0].material.color.set(ru.c); a.rugs[1].material.color.set(ru.c).lerp(new T.Color(0xffffff), 0.5);
    for (const id in a.decor) a.decor[id].visible = !!(I.decor && I.decor[id]);
  }
  function pad(a, x, z, label, act) {   // テレポーターの台
    const g = a.group; cyl(1.7, 0.2, 0x6fd8ff, x, 0.1, z, g, { emissive: 0x3aa8ff, emissiveIntensity: 0.9 }).castShadow = false;
    const ring = new T.Mesh(new T.TorusGeometry(1.5, 0.08, 8, 28), new T.MeshBasicMaterial({ color: 0xbff0ff })); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.3, z); g.add(ring);
    const beam = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 7, 20, 1, true), new T.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false, fog: false })); beam.position.set(x, 3.6, z); g.add(beam);
    const tag = new T.Sprite(new T.SpriteMaterial({ map: labelTex('🌀 テレポーター', 384, 96, '#16304a', '#bff0ff', 48), depthTest: false })); tag.scale.set(4, 1, 1); tag.position.set(x, 5.4, z); tag.renderOrder = 25; g.add(tag);
    a.obst.push({ c: true, x, z, r: 0.5 }); return addHot(a, x, z + 2.2, 2.8, label, act, 4.5);
  }
  function buildPlaza(name, ox, cfg) {
    const a = newArea(name, [ox - 44, ox + 44, -40, 40], false), g = a.group;
    const gr = new T.Mesh(new T.PlaneGeometry(300, 300), m(cfg.ground, { roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.set(ox, 0, 0); gr.receiveShadow = true; g.add(gr);
    const asph = asphaltTex(), road = (x, z, w, d) => { const r = new T.Mesh(new T.PlaneGeometry(w, d), texMat(asph, { roughness: 1 })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z); r.receiveShadow = true; g.add(r); };
    road(ox, 0, 90, 8); road(ox, 22, 6, 36);
    const bld = (b) => {
      const gb = new T.Group(); g.add(gb); const s = b.face === 'N' ? -1 : 1, fz = b.z + s * b.d / 2;
      rbox(b.w, b.h, b.d, 0.6, b.color, ox + b.x, b.h / 2, b.z, gb); rbox(b.w + 0.8, 0.6, b.d + 0.8, 0.28, b.roof, ox + b.x, b.h + 0.25, b.z, gb);
      const rg = new T.ConeGeometry(0.7071, 1, 4); rg.rotateY(Math.PI / 4); const rf = new T.Mesh(rg, m(b.roof)); rf.scale.set(b.w + 1.4, 2.6, b.d + 1.4); rf.position.set(ox + b.x, b.h + 0.5 + 1.3, b.z); rf.castShadow = true; gb.add(rf);
      rbox(2.2, 3.2, 0.2, 0.09, 0x5a3a24, ox + b.x, 1.6, fz + s * 0.05, gb);
      sign(b.label, b.w * 0.85, 1.4, b.neon ? '#1a1030' : '#fff8e8', b.neon ? '#ff6ad5' : '#3b2a1c', gb, ox + b.x, b.h - 0.95, fz + s * 0.06, s > 0 ? 0 : Math.PI);
      for (const wx of [-1, 1]) { box(2.2, 1.6, 0.12, 0xffffff, ox + b.x + wx * b.w * 0.3, 2.6, fz + s * 0.05, gb); box(1.8, 1.2, 0.1, b.neon ? 0xffd0f0 : 0xbfe6ff, ox + b.x + wx * b.w * 0.3, 2.6, fz + s * 0.1, gb, { emissive: b.neon ? 0xff6ad5 : 0x335577, emissiveIntensity: b.neon ? 0.7 : 0.35 }); }
      a.obst.push({ x0: ox + b.x - b.w / 2, x1: ox + b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 });
      if (b.act) addHot(a, ox + b.x, fz + s * 2.2, 2.6, () => b.hotLabel, b.act, 3.6);
      return gb;
    };
    cfg.buildings.forEach(bld);
    if (cfg.lots) a.lots = cfg.lots.map(l => { const gb = bld(Object.assign({ w: 10, d: 8, h: 5, color: 0xc9f0c0, roof: 0x4f8a45, face: 'S' }, l)); gb.visible = false; return gb; });
    for (let x = -40; x <= 40; x += 16) { cyl(0.08, 3.6, 0x333a44, ox + x, 1.8, 5.4, g); sph(0.25, cfg.neon ? 0xff6ad5 : 0xfff2b0, ox + x, 3.7, 5.4, g, { emissive: cfg.neon ? 0xff4ac0 : 0xffe9a0, emissiveIntensity: 0.9 }).castShadow = false; }
    let seed = 11; const rnd2 = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) { const x = ox + (rnd2() - 0.5) * 84, z = 8 + rnd2() * 30; if (Math.abs(x - ox) < 6 || a.obst.some(o => !o.c && x > o.x0 - 3 && x < o.x1 + 3 && z > o.z0 - 3 && z < o.z1 + 3)) continue; const s = 0.8 + rnd2() * 0.6; cyl(0.25 * s, 1.6 * s, 0x7a5233, x, 0.8 * s, z, g); sph(1.3 * s, cfg.tree, x, 2.4 * s, z, g); a.obst.push({ c: true, x, z, r: 0.5 * s }); }
    pad(a, ox, 14, () => 'テレポーター（ほかの町へ）', () => Biz.openTeleport());
    a.spawn = { x: ox, z: 10.5, rot: Math.PI }; return a;
  }
  function refreshBranches(n) { const a = areas.biz; if (a && a.lots) a.lots.forEach((l, i) => { l.visible = i < n; }); }
  const jarGeo = new T.CylinderGeometry(0.29, 0.29, 0.46, 20);
  function makeJar(color, sparkle, st) {
    const g = new T.Group(), tr = (st && st.traits) || {};
    const glass = new T.Mesh(jarGeo, new T.MeshPhysicalMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.14, roughness: 0.05, envMap: envTex, envMapIntensity: 0.35, depthWrite: false }));
    glass.position.y = 0.23; g.add(glass);
    const sm = new T.MeshPhysicalMaterial({ color, roughness: tr.fuwafuwa ? 0.65 : 0.12, clearcoat: tr.fuwafuwa ? 0 : 0.7, clearcoatRoughness: 0.12, envMap: envTex, envMapIntensity: 0.3, emissive: color, emissiveIntensity: 0.22 });
    if (st && (st.gl || 0) >= 0.3) { sm.emissive.set(0x9dff9a).lerp(new T.Color(color), 0.25); sm.emissiveIntensity = 0.05; glowMats.push({ mat: sm, lv: Math.min(1, st.gl / 1.2) }); }
    const sl = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, tr.torotoro ? 0.3 : 0.34, 20), sm); sl.position.y = 0.2; sl.castShadow = true; g.add(sl);
    const top = (sx, sy, sz, y, mat) => { const t = new T.Mesh(GEO.sph, mat || sm); t.scale.set(sx, sy, sz); t.position.y = y; t.castShadow = true; g.add(t); return t; };
    if (tr.fuwafuwa) { const wm = sm.clone(); wm.color = new T.Color(color).lerp(new T.Color(0xffffff), 0.45); top(0.27, 0.2, 0.27, 0.38, wm); for (let i = 0; i < 6; i++) top(0.05, 0.05, 0.05, 0.36, wm).position.set(Math.cos(i * 1.1) * 0.13, 0.37 + (i % 3) * 0.03, Math.sin(i * 1.1) * 0.13); }
    else if (tr.danryoku) top(0.26, 0.16, 0.26, 0.36);
    else if (tr.nettori) { const c = new T.Mesh(new T.ConeGeometry(0.13, 0.42, 12), sm); c.position.y = 0.56; c.castShadow = true; g.add(c); }
    else if (tr.torotoro) { top(0.2, 0.05, 0.2, 0.3); const d1 = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.22, 8), sm); d1.position.set(0.15, 0.22, 0.1); g.add(d1); top(0.045, 0.05, 0.045, 0.1).position.set(0.15, 0.1, 0.1); }
    else top(0.26, 0.08, 0.26, 0.36);
    for (let i = 0; i < Math.round(((st && st.crunch) || 0) * 12); i++) { const a = i * 2.1; sph(0.018, 0xffffff, Math.cos(a) * 0.2, 0.12 + (i % 5) * 0.06, Math.sin(a) * 0.2, g).castShadow = false; }
    if (!(tr.nettori || tr.fuwafuwa)) { const lid = box(0.52, 0.07, 0.52, 0xffffff, 0, 0.46, 0, g); lid.scale.set(0.56, 0.07, 0.56); lid.position.y = 0.5; }
    const gc = (st && st.gcols && st.gcols.length) ? st.gcols : (sparkle > 0 ? [{ c: '#fff2b0', w: 1 }] : []), gtot = gc.reduce((a, x) => a + x.w, 0) || 1;
    for (let i = 0; i < Math.min(16, Math.round(sparkle * 3)); i++) {
      let pk = ((i * 0.6180339 + 0.1) % 1) * gtot, col = gc[0].c;
      for (const x of gc) { pk -= x.w; if (pk <= 0) { col = x.c; break; } }
      if (col === 'rainbow') col = '#' + new T.Color().setHSL(Math.random(), 1, 0.65).getHexString();
      const a = i * 2.4, d = new T.Mesh(GEO.sph, new T.MeshBasicMaterial({ color: col }));
      d.position.set(Math.cos(a) * 0.19, 0.08 + (i % 6) * 0.05, Math.sin(a) * 0.19); d.scale.setScalar(0.03); g.add(d); jarSparkles.push({ m: d, ph: i * 1.7, s: 0.04 });
    }
    return g;
  }
  function priceTag(text) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: labelTex(text, 160, 64, '#fff8e8', '#c8402a', 40), depthTest: true }));
    s.scale.set(0.8, 0.32, 1); return s;
  }
  function refreshShelf() {
    if (!shelfG) return;
    glowMats.length = 0; jarSparkles.length = 0;
    while (shelfG.children.length) { const c = shelfG.children.pop(); c.traverse(o => { if (o.material && o.material.map) o.material.map.dispose(); }); }
    const ox = areas.shop.slotBase;
    S.shelf.forEach((sl, i) => {
      const p = SLOT(i), st = sl.sid && S.slimes.find(x => x.id === sl.sid);
      if (!st || st.count <= 0) return;
      const n = Math.min(3, st.count);
      for (let k = 0; k < n; k++) { const j = makeJar(st.color, st.sp, st); j.position.set(ox + p.x + (k - (n - 1) / 2) * 0.55, p.y + 0.05, p.z + 0.05 + (k % 2) * 0.1); shelfG.add(j); }
      const tg = priceTag('¥' + sl.price); tg.position.set(ox + p.x, p.y + 0.78, p.z + 0.3); shelfG.add(tg);
    });
  }
  let staffMeshes = [];
  function refreshStaff() {
    if (!staffG) return;
    while (staffG.children.length) staffG.remove(staffG.children[0]);
    staffMeshes = [];
    const ox = areas.shop.slotBase;
    const cols = { clerk: 0xff9bb5, crafter: 0xffd36a, buyer: 0x9ad0ff };
    let ci = 0;
    S.staff.forEach(sf => {
      if (sf.role === 'buyer') return;
      const p = makePerson(cols[sf.role], 0x442211, sf.role === 'crafter' ? 0xffffff : 0xff6b6b);
      if (sf.role === 'clerk') { p.position.set(ox - 3 + (ci++) * 1.4 - 1, 0, 1.4); p.rotation.y = 0; }
      else { p.position.set(areas.shop.ws.x - 1.6 + (ci++ % 3) * 1.3, 0, areas.shop.ws.z - 1.7); p.rotation.y = 0; }
      p.userData.t = Math.random() * 6; staffG.add(p); staffMeshes.push(p);
    });
  }

  // ---------- お客さん（お店の中を歩く）----------
  const visitors = [];
  const bubbles = [];
  function bubble(mesh, text, good) {   // お客さんの頭の上のふきだし
    const s = new T.Sprite(new T.SpriteMaterial({ map: labelTex(text, 384, 96, good ? '#fff6c8' : '#ffffff', good ? '#8a5a00' : '#3b2a1c', 44), transparent: true, depthTest: false }));
    s.scale.set(3.2, 0.8, 1); s.position.set(0, 2.9, 0); s.renderOrder = 30; mesh.add(s); bubbles.push({ s, mesh, life: 2.6 });
  }
  function spawnVisitor(type, decide) {
    const a = areas.shop, ox = a.slotBase;
    const cols = [0xff8a8a, 0x8ab8ff, 0xffd86a, 0xb18aff, 0x7ad9a0, 0xff9ad2];
    const mesh = makePerson(cols[(Math.random() * cols.length) | 0], [0x332211, 0x7a4a22, 0x111111][(Math.random() * 3) | 0]);
    mesh.position.set(ox + 3 + Math.random() * 1.2, 0, 6.4);
    if (type === 'kid') mesh.scale.setScalar(0.75);
    visitG.add(mesh);
    const idx = (typeof S !== 'undefined' && S) ? S.shelf.map((s, i) => (s.sid ? i : -1)).filter(i => i >= 0) : [0, 1, 2, 3, 4, 5, 6, 7];
    const si = idx.length ? idx[(Math.random() * idx.length) | 0] : 0, sp = SLOT(si);
    // 道すじ：レジ（カウンター）をよけて、棚→レジの前→出口
    const path = [{ x: ox + 1.8, z: 1.0 }, { x: ox + sp.x, z: -6.2, act: 'decide' }, { x: ox + 1.8, z: 1.0 }, { x: ox + 1.8, z: 4.4 }, { x: ox - 3 + (Math.random() - 0.5) * 1.5, z: 4.4, act: 'pay' }, { x: ox + 3, z: 6.8 }];
    visitors.push({ mesh, path, i: 0, decide, type, wait: 0, res: null });
  }
  function stepVisitors(dt) {
    for (let k = visitors.length - 1; k >= 0; k--) {
      const v = visitors[k], tg = v.path[v.i];
      const dx = tg.x - v.mesh.position.x, dz = tg.z - v.mesh.position.z, dd = Math.hypot(dx, dz);
      if (dd < 0.15) {
        if (tg.act === 'decide') { v.wait += dt; if (v.wait < 1.4) { animPerson(v.mesh, false, dt); continue; } v.wait = 0; v.res = v.decide(); if (v.res && v.res.msg) bubble(v.mesh, v.res.msg, v.res.sold); }
        if (tg.act === 'pay') { if (!v.res || !v.res.sold) { v.i++; continue; } v.wait += dt; if (v.wait < 0.7) { animPerson(v.mesh, false, dt); continue; } v.wait = 0; }
        v.i++;
        if (v.i >= v.path.length) { visitG.remove(v.mesh); visitors.splice(k, 1); }
        continue;
      }
      const sp = 2.6 * dt;
      v.mesh.position.x += dx / dd * Math.min(sp, dd); v.mesh.position.z += dz / dd * Math.min(sp, dd);
      v.mesh.rotation.y = Math.atan2(dx, dz); animPerson(v.mesh, true, dt);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.life -= dt; b.s.position.y = 2.9 + (2.6 - b.life) * 0.15; b.s.material.opacity = Math.min(1, b.life * 1.5); if (b.life <= 0) { b.mesh.remove(b.s); b.s.material.map.dispose(); bubbles.splice(i, 1); } }
  }
  function resolveVisitors() { // お店を出たとき、まだ決めていないお客さんの分をまとめて決める
    for (const v of visitors) { if (!v.res && v.i <= 1) { v.res = v.decide(); } visitG.remove(v.mesh); }
    visitors.length = 0;
  }

  // ---------- 切り替え・移動 ----------
  function go(name, spawn) {
    if (busy) return; busy = true;
    const f = document.getElementById('fade'); f.style.opacity = 1;
    setTimeout(() => {
      if (area === 'shop' && name !== 'shop') { resolveVisitors(); }
      if (Workshop.active) Workshop.exit(true);
      const prev = area; area = name;
      for (const k in areas) areas[k].group.visible = k === name || (name === 'town' && k === 'town');
      areas[name].group.visible = true;
      const sp = spawn || (name === 'town' ? townSpawnFor(prev) : areas[name].spawn);
      P.x = sp.x; P.z = sp.z; P.rot = sp.rot; C.yaw = name === 'town' ? (sp.rot === 0 ? 0 : Math.PI) : (sp.rot === Math.PI ? 0 : Math.PI); C.pitch = areas[name].indoor ? 0.9 : 0.36; C.dist = areas[name].indoor ? 10 : 15;
      if (sp.yaw !== undefined) C.yaw = sp.yaw;
      if (areas[name].cam) { C.pitch = areas[name].cam.pitch; C.dist = areas[name].cam.dist; }
      if (typeof onAreaChange === 'function') onAreaChange(name, prev);
      f.style.opacity = 0; setTimeout(() => { busy = false; }, 250);
    }, 260);
  }
  function townSpawnFor(prev) {
    if (Adventure.isAdv(prev)) return { x: 61, z: 0, rot: -Math.PI / 2, yaw: Math.PI / 2 };
    const t = { shop: [0, -3.6, 0], hyakkin: [-36, -16.6, 0], home: [38, -16.6, 0], art: [-36, 18.8, Math.PI], wholesale: [38, 18.6, Math.PI], lab: [-62, -5.4, 0], smith: [62, -5.4, 0], mountain: [0, -35, 0] }[prev] || [0, -3.6, 0];
    return { x: t[0], z: t[1], rot: t[2] };
  }

  function collide(a, x, z, r) {
    for (const o of a.obst) {
      if (o.c) { const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), rr = r + o.r; if (d < rr && d > 1e-6) { x = o.x + dx / d * rr; z = o.z + dz / d * rr; } continue; }
      const nx = clamp(x, o.x0, o.x1), nz = clamp(z, o.z0, o.z1), dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); x = nx + dx / d * r; z = nz + dz / d * r; }
        else { const l = x - o.x0, rt = o.x1 - x, tp = z - o.z0, bt = o.z1 - z, mn = Math.min(l, rt, tp, bt); if (mn === l) x = o.x0 - r; else if (mn === rt) x = o.x1 + r; else if (mn === tp) z = o.z0 - r; else z = o.z1 + r; }
      }
    }
    const b = a.bounds; return [clamp(x, b[0], b[1]), clamp(z, b[2], b[3])];
  }

  // ---------- 初期化・毎フレーム ----------
  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.NoToneMapping;
    scene = new T.Scene(); scene.background = new T.Color(0x9fd8ff); scene.fog = new T.Fog(0x9fd8ff, 70, 190);
    cam = new T.PerspectiveCamera(55, 1, 0.1, 400);
    makeSky(); envTex = makeEnv();
    hemi = new T.HemisphereLight(0xffffff, 0xd8c4a0, 0.6); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff4e0, 0.9); sun.position.set(30, 50, 20); scene.add(sun); scene.add(sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { near: 1, far: 220, left: -40, right: 40, top: 40, bottom: -40 });
    lamp = new T.PointLight(0xfff0d0, 0.0, 22); scene.add(lamp);
    buildTown(); buildMyShop();
    buildSupplier('hyakkin', 1100); buildSupplier('home', 1200); buildSupplier('art', 1300); buildSupplier('wholesale', 1400);
    buildFriend('lab', 1500); buildFriend('smith', 1600);
    buildPlaza('neon', 7000, { ground: 0x3a3f5e, tree: 0x6a5acd, neon: true, buildings: [
      { x: -8, z: -12, w: 11, d: 8, h: 6, color: 0xff7a9a, roof: 0x4a2a5a, label: 'のみ処 スラ吉', neon: true, act: () => Biz.openParty(), hotLabel: '居酒屋に入る（社員と飲み会）' },
      { x: 14, z: -12, w: 10, d: 8, h: 5, color: 0x6ad8ff, roof: 0x2a3a6a, label: 'ゲームセンター', neon: true }, { x: -26, z: -12, w: 9, d: 8, h: 5, color: 0xffd23f, roof: 0x6a4a2a, label: 'ラーメン ぷるぷる', neon: true }] });
    buildPlaza('deco', 8000, { ground: 0xd4ecc4, tree: 0xf5a3c0, buildings: [
      { x: -8, z: -12, w: 12, d: 8, h: 6, color: 0xffe3b0, roof: 0xc9722a, label: '家具屋 ホームデコ', act: () => Biz.openDeco(), hotLabel: '家具屋に入る（お店の模様がえ）' },
      { x: 14, z: -12, w: 10, d: 8, h: 5, color: 0xf3c6e6, roof: 0xc84fa0, label: 'ブティック' }, { x: -26, z: -12, w: 9, d: 8, h: 5, color: 0xcfe9ff, roof: 0x4a76b0, label: 'カフェ ふわふわ' }] });
    buildPlaza('biz', 9000, { ground: 0xbac6d2, tree: 0x4a9a6a, buildings: [
      { x: -8, z: -12, w: 12, d: 8, h: 8, color: 0xcfe3f5, roof: 0x4a6a8a, label: '不動産 ビルドホーム', act: () => Biz.openRealtor(), hotLabel: '不動産屋に入る（支店を建てる）' }],
      lots: [{ x: 14, z: -12, label: 'スライム商店 2号店' }, { x: 28, z: -12, label: 'スライム商店 3号店' }] });
    Adventure.build({ T, newArea, addHot, makePerson, animPerson, box, rbox, cyl, sph, capsule, m, labelTex, sign, collide, canvasTex, grassTex, rr, go, P, scene, get camera() { return cam; } });
    Workshop.build(scene, areas.shop, { mats: m, box, cyl, sph });
    P.mesh = makePerson(0x62d6a8, 0x553322, 0xffffff); scene.add(P.mesh);
    const ap = sph(1, 0xffffff, 0, 0.92, 0.2, P.mesh); ap.scale.set(0.28, 0.34, 0.14);
    // 雨
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 25; pos[i * 3 + 2] = (Math.random() - 0.5) * 50; }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(pos, 3));
    rain = new T.Points(rg, new T.PointsMaterial({ color: 0xbfd8ff, size: 0.12, transparent: true, opacity: 0.7 })); rain.visible = false; scene.add(rain);
    for (const k in areas) areas[k].group.visible = k === 'shop';
    area = 'shop'; demoScene(); setEnvironment(660, 'sunny');
    const rs = () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = cam.aspect < 0.8 ? 74 : cam.aspect < 1.2 ? 62 : 55; cam.updateProjectionMatrix(); };
    addEventListener('resize', rs); rs();

    addEventListener('keydown', e => { if (UI.isOpen() || e.target.tagName === 'INPUT') return; keys[e.code] = true; if (Adventure.isAdv(area) && (e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyJ')) { Adventure.attack(); e.preventDefault(); } else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { if (!Workshop.active) interact(); e.preventDefault(); } if (e.code === 'Escape' && Workshop.active) Workshop.exit(); if (e.code.startsWith('Arrow')) e.preventDefault(); });
    addEventListener('keyup', e => { keys[e.code] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    setupTouch();
    const ptrs = new Map(); let pinch0 = 0, zoom0 = 0;
    let drag = null;
    canvas.addEventListener('pointerdown', e => {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Workshop.touching) { Workshop.pointer(e, 'down'); return; }
      if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch0 = Math.hypot(p.x - q.x, p.y - q.y) || 1; zoom0 = C.dist; if (Workshop.active) Workshop.pointer(e, 'up'); drag = null; return; }
      if (ptrs.size > 2) return;
      drag = { x: e.clientX, y: e.clientY }; if (Workshop.active) Workshop.pointer(e, 'down');
    });
    canvas.addEventListener('pointermove', e => {
      const prev = ptrs.get(e.pointerId);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Workshop.touching) { Workshop.pointer(e, 'move', prev ? e.clientX - prev.x : 0, prev ? e.clientY - prev.y : 0); return; }
      if (ptrs.size >= 2) { const [p, q] = [...ptrs.values()]; C.dist = clamp(zoom0 * pinch0 / (Math.hypot(p.x - q.x, p.y - q.y) || 1), 4, 22); return; }
      if (!drag) { if (Workshop.active) Workshop.pointer(e, 'hover'); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
      if (Workshop.active) { Workshop.pointer(e, 'move', dx, dy); return; }
      C.yaw -= dx * 0.006; C.pitch = clamp(C.pitch + dy * 0.004, 0.12, 1.25);
    });
    const up = e => { if (Workshop.touching) { ptrs.delete(e.pointerId); Workshop.pointer(e, 'up'); return; } const was = ptrs.size; ptrs.delete(e.pointerId); if (was >= 2) { drag = null; return; } drag = null; if (Workshop.active) Workshop.pointer(e, 'up'); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { C.dist = clamp(C.dist + e.deltaY * 0.01, 4, 22); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  function setupTouch() {
    if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');
    addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });
    const joy = document.getElementById('joy'), knob = joy.firstElementChild; let id = null, cx = 0, cy = 0;
    const set = e => { const dx = e.clientX - cx, dy = e.clientY - cy, r = 46, l = Math.hypot(dx, dy), k = l > r ? r / l : 1; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; joyV.x = dx * k / r; joyV.z = dy * k / r; };
    const end = () => { id = null; joyV.x = joyV.z = 0; knob.style.transform = 'translate(0,0)'; };
    joy.addEventListener('pointerdown', e => { id = e.pointerId; try { joy.setPointerCapture(id); } catch (_) { } const b = joy.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2; set(e); e.preventDefault(); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end); joy.addEventListener('lostpointercapture', end);
    document.getElementById('btnAct').addEventListener('pointerdown', e => { interact(); e.preventDefault(); });
    const run = document.getElementById('btnRun'); run.addEventListener('pointerdown', e => { runOn = !runOn; run.classList.toggle('on', runOn); e.preventDefault(); });
  }
  function interact() { if (cur && !busy && !UI.isOpen()) { cur.act(); sfx('pop'); } }

  function setEnvironment(min, weather) {
    const h = min / 60, sm = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
    const d = sm(5.5, 8, h) * (1 - sm(17, 20, h)), dusk = sm(16.5, 18, h) * (1 - sm(18.5, 20.5, h));
    const col = new T.Color(0x0b1030).lerp(new T.Color(0x9fd8ff), d).lerp(new T.Color(0xff9a6a), dusk * 0.55);
    const wet = weather === 'rain' ? 1 : weather === 'cloudy' ? 0.5 : 0;
    col.lerp(new T.Color(0x8e9aa6), wet * 0.55 * d);
    const af = Adventure.fog(area); if (af) col.lerp(new T.Color(af.c), af.k);
    scene.fog.near = af ? af.near : 70; scene.fog.far = af ? af.far : 190;
    scene.background.copy(col); scene.fog.color.copy(col);
    sun.intensity = (0.1 + 0.7 * d) * (1 - wet * 0.4);
    sun.color.set(dusk > 0.1 ? 0xffc890 : 0xfff4e0);
    hemi.intensity = 0.36 + 0.36 * d;
    const ang = clamp((h - 6) / 13, 0, 1) * Math.PI;
    sunDir.set(-Math.cos(ang) * 0.9, Math.sin(ang) * 0.95 + 0.22, 0.45).normalize();
    const top = new T.Color(0x0a1030).lerp(new T.Color(0x3f93ee), d).lerp(new T.Color(0xff8a6a), dusk * 0.25).lerp(new T.Color(0x7d8794), wet * 0.6 * d);
    skyMat.uniforms.top.value.copy(top); skyMat.uniforms.hor.value.copy(col);
    cloudMat.color.set(0x2a2f48).lerp(new T.Color(0xffffff), d).lerp(new T.Color(0xb9c0c9), wet * 0.6 * d).lerp(new T.Color(0xffc9a8), dusk * 0.4);
    lamp.intensity = af ? af.lamp : areas[area] && areas[area].indoor ? 0.1 + 0.5 * (1 - d) : 0;
    rainOn = weather === 'rain'; dayK = d; lt.sun = sun.intensity; lt.hemi = hemi.intensity; lt.lamp = lamp.intensity;
  }

  // ---------- 影・空・タイトル ----------
  const sunDir = new T.Vector3(0.5, 0.8, 0.4);
  function followSun(x, z) {
    const r = areas[area] && areas[area].indoor ? 26 : 42, sc = sun.shadow.camera;
    const sx = Math.round(x), sz = Math.round(z);
    sun.target.position.set(sx, 0, sz); sun.position.set(sx + sunDir.x * 90, sunDir.y * 90, sz + sunDir.z * 90); sun.target.updateMatrixWorld();
    if (sc.right !== r) { sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix(); }
  }
  function driftClouds(dt) { clouds.children.forEach(c => { c.position.x += dt * 1.2; if (c.position.x > 190) c.position.x = -190; }); }
  let titleT = 0, nextSpawn = 0;
  function titleFrame(dt) {
    const a = areas.shop, ox = a.slotBase;
    titleT += dt;
    if (titleT > nextSpawn) { spawnVisitor('kid', () => { }); nextSpawn = titleT + 3.2; }
    stepVisitors(dt); twinkleJars();
    staffMeshes.forEach(s => { s.position.y = Math.abs(Math.sin(tNow * 2 + s.userData.t)) * 0.04; });
    a.hot.forEach(h => { h.marker.visible = false; });
    const ang = -0.5 + Math.sin(titleT * 0.12) * 0.3;
    cam.position.set(ox + 6.5 + 2 * Math.sin(ang * 2), 4.0, 8.6); cam.lookAt(ox - 4.5, 1.2, -3);
    followSun(ox, 0); skyDome.position.copy(cam.position);
    renderer.render(scene, cam);
  }
  function twinkleJars() { for (const j of jarSparkles) j.m.scale.setScalar(j.s * (0.3 + 1.3 * Math.pow(Math.max(0, Math.sin(tNow * 3.2 + j.ph)), 3))); }
  function demoScene() {
    const ox = areas.shop.slotBase;
    const demo = [['#ff8fc0', { fuwafuwa: 0.8 }, 3], ['#7be8b2', { danryoku: 0.6 }, 1], ['#8fd0ff', { torotoro: 0.7 }, 2], ['#ffd95e', { nettori: 0.5 }, 0],
      ['#d9a6ff', {}, 4], ['#ffffff', { fuwafuwa: 0.4 }, 0], ['#ff9a6a', {}, 2], ['#6fe0c8', { torotoro: 0.3 }, 3]];
    demo.forEach((d, i) => {
      const p = SLOT(i);
      for (let k = 0; k < 3; k++) { const j = makeJar(d[0], d[2], { traits: d[1], gcols: [{ c: ['#ffd24a', '#58a8ff', '#ff6fb5', '#5ee08a', 'rainbow', '#d8dde6'][i % 6], w: 1 }] }); j.position.set(ox + p.x + (k - 1) * 0.55, p.y + 0.05, p.z + 0.05 + (k % 2) * 0.1); shelfG.add(j); }
      const tg = priceTag('¥' + (180 + i * 60)); tg.position.set(ox + p.x, p.y + 0.78, p.z + 0.3); shelfG.add(tg);
    });
    const c = makePerson(0xff9bb5, 0x442211, 0xff6b6b); c.position.set(ox - 4, 0, 1.4); c.userData.t = 0; staffG.add(c); staffMeshes.push(c);
    const cr = makePerson(0xffd36a, 0x442211, 0xffffff); cr.position.set(ox + 4.8, 0, -3.4); cr.userData.t = 2; staffG.add(cr); staffMeshes.push(cr);
    for (let i = 0; i < 4; i++) { spawnVisitor(i % 2 ? 'kid' : 'student', () => { }); for (let k = 0; k < 18 + i * 14; k++) stepVisitors(0.1); }
  }

  function frame(dt) {
    tNow += dt;
    if (typeof S === 'undefined' || !S) { titleFrame(dt); return; }
    const a = areas[area];
    // 移動
    const inWs = Workshop.active;
    let mx = 0, mz = 0;
    if (!UI.isOpen() && !busy && !inWs) {
      if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
      if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
      if (Math.hypot(joyV.x, joyV.z) > 0.12) { mx += joyV.x; mz += joyV.z; }
    }
    const moving = mx || mz;
    let mag = 1;
    if (moving) {
      const l = Math.hypot(mx, mz); mag = Math.min(1, l); mx /= l; mz /= l;
      const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw);
      const wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy;   // カメラの向きに合わせる
      const sp = (a.indoor ? Math.min(bagSpeed(), 6.5) : Adventure.isAdv(area) ? Math.min(bagSpeed(), 7) : bagSpeed()) * (keys.ShiftLeft || keys.ShiftRight || runOn ? 1.5 : 1) * mag;
      const r = collide(a, P.x + wx * sp * dt, P.z + wz * sp * dt, 0.5);
      P.x = r[0]; P.z = r[1];
      let da = Math.atan2(wx, wz) - P.rot; da = Math.atan2(Math.sin(da), Math.cos(da)); P.rot += da * Math.min(1, dt * 14);
    }
    P.mesh.position.x = P.x; P.mesh.position.z = P.z; P.mesh.rotation.y = P.rot;
    const bob = P.mesh.position.y; animPerson(P.mesh, moving, dt); P.mesh.position.x = P.x; P.mesh.position.z = P.z;
    if (Adventure.isAdv(area)) { Adventure.poseArm(P.mesh); Adventure.update(dt, tNow); }
    if (a.beacon) { a.beacon.material.opacity = 0.22 + 0.08 * Math.sin(tNow * 2); a.tag.position.y = 11.5 + Math.sin(tNow * 2.2) * 0.35; }
    P.mesh.visible = !inWs;

    // 近くの調べられる場所
    cur = null; let best = 1e9;
    if (!inWs && !busy) for (const h of a.hot) { if (h.hide && h.hide()) continue; const d = Math.hypot(h.x - P.x, h.z - P.z); if (d < h.r && d < best) { best = d; cur = h; } }
    for (const h of a.hot) { h.marker.visible = !inWs && !(h.hide && h.hide()); h.marker.rotation.y += dt * 2; h.marker.scale.setScalar(h === cur ? 1.3 : 1); h.marker.position.y += Math.sin(tNow * 3 + h.x) * 0.002; }
    const pe = document.getElementById('prompt');
    if (cur && !UI.isOpen()) { pe.textContent = `[E] ${cur.label()}`; pe.style.display = 'block'; } else pe.style.display = 'none';
    const ba = document.getElementById('btnAct'); if (ba) { const on = !!cur && !UI.isOpen() && !inWs; ba.style.display = on ? 'block' : 'none'; if (on) ba.textContent = cur.label(); }

    // カメラ
    if (inWs) Workshop.camera(cam, dt);
    else {
      const tx = P.x, ty = 1.3, tz = P.z;
      let cx = tx + Math.sin(C.yaw) * Math.cos(C.pitch) * C.dist, cy = ty + Math.sin(C.pitch) * C.dist, cz = tz + Math.cos(C.yaw) * Math.cos(C.pitch) * C.dist;
      if (a.indoor) { cy = Math.min(cy, 7.5); }
      else cy = Math.max(cy, 0.8);
      cam.position.set(cx, cy, cz); cam.lookAt(tx, ty, tz);
      lamp.position.set(P.x, 4.4, P.z);
    }
    // 演出
    if (a.blob) { a.blob.scale.set(2.2 + Math.sin(tNow * 2) * 0.12, 1.5 - Math.sin(tNow * 2) * 0.1, 2.2 + Math.sin(tNow * 2) * 0.12); }
    staffMeshes.forEach(s => { s.position.y = Math.abs(Math.sin(tNow * 2 + s.userData.t)) * 0.04; });
    if (area === 'shop') stepVisitors(dt);
    rain.visible = rainOn && area === 'town';
    if (rain.visible) {
      const p = rain.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { let y = p.getY(i) - 28 * dt; if (y < 0) y += 25; p.setY(i, y); }
      p.needsUpdate = true; rain.position.set(cam.position.x, 0, cam.position.z);
    }
    Workshop.update(dt, tNow); twinkleJars();
    darkV += (manualDark - darkV) * Math.min(1, dt * 4);
    const afl = Adventure.fog(area), lm = afl ? afl.light : 1;
    sun.intensity = lt.sun * lm * (1 - 0.93 * darkV); hemi.intensity = lt.hemi * (afl && afl.lamp ? 0.5 : 1) * (1 - 0.9 * darkV); lamp.intensity = lt.lamp * (1 - 0.95 * darkV);
    const dk = Math.max(darkV, (1 - dayK) * 0.55); for (const g of glowMats) g.mat.emissiveIntensity = 0.05 + 1.1 * g.lv * dk;
    followSun(P.x, P.z); skyDome.position.copy(cam.position); driftClouds(dt);
    renderer.render(scene, cam);
  }

  return {
    init, frame, go, setEnvironment, refreshShelf, refreshStaff, spawnVisitor, resolveVisitors, interact,
    get area() { return area; }, get busy() { return busy; }, P, areas, SLOT, makeJar, labelTex,
    place(x, z, rot) { P.x = x; P.z = z; P.rot = rot; }, setArea(name) {
      area = name; for (const k in areas) areas[k].group.visible = k === name;
      const sp = areas[name].spawn; P.x = sp.x; P.z = sp.z; P.rot = sp.rot; C.yaw = 0; C.pitch = areas[name].indoor ? 0.9 : 0.36; C.dist = areas[name].indoor ? 10 : 15;
    },
    get camera() { return cam; }, get scene() { return scene; }, get env() { return envTex; }, applyInterior, refreshBranches, get tint() { return 0; }, get dark() { return Math.max(darkV, (1 - dayK) * 0.55); }, get darkOn() { return !!manualDark; }, setDark(on) { manualDark = on ? 1 : 0; },
  };
})();
