// ソダテバトル: 見た目まわり（パーティクル・モデル・背景・ポーズ）
'use strict';

const FX = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const colCache = {};
  const rgb = hex => colCache[hex] || (colCache[hex] = new THREE.Color(hex));

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = canvasTex(64, 64, g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  const gradTex = (() => {
    const t = new THREE.DataTexture(Uint8Array.from([90, 170, 255]), 3, 1, THREE.LuminanceFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
  })();
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14, side: THREE.BackSide });

  // 属性ごとのエフェクト色
  const ELEM_FX = {
    none: [0xffffff, 0xdddde8, 0xaab0c8], fire: [0xff4a1a, 0xff9a2a, 0xffe27a], water: [0x2a8cff, 0x6ac8ff, 0xcff4ff],
    earth: [0x8a6a3a, 0xb08a4a, 0xd6c08a], wind: [0x3ad06a, 0x8affb0, 0xe0ffe8], light: [0xffe27a, 0xfff6c0, 0xffffff], dark: [0x6a3ad6, 0x9a6ae6, 0xd0a8ff],
  };

  // ---------- パーティクル ----------
  class Particles {
    constructor(max) {
      this.max = max; this.i = 0;
      const M = max;
      this.pos = new Float32Array(M * 3); this.col = new Float32Array(M * 3); this.size = new Float32Array(M); this.alpha = new Float32Array(M);
      this.vel = new Float32Array(M * 3); this.life = new Float32Array(M); this.maxLife = new Float32Array(M);
      this.grav = new Float32Array(M); this.drag = new Float32Array(M); this.grow = new Float32Array(M); this.size0 = new Float32Array(M);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      g.setAttribute('pcol', new THREE.BufferAttribute(this.col, 3));
      g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1));
      g.setAttribute('palpha', new THREE.BufferAttribute(this.alpha, 1));
      this.geo = g;
      this.mat = new THREE.ShaderMaterial({
        uniforms: { tex: { value: glowTex }, scale: { value: 600 } },
        vertexShader: 'attribute vec3 pcol;attribute float psize;attribute float palpha;varying vec3 vC;varying float vA;uniform float scale;' +
          'void main(){vC=pcol;vA=palpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=psize*scale/max(0.1,-mv.z);gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'uniform sampler2D tex;varying vec3 vC;varying float vA;void main(){vec4 t=texture2D(tex,gl_PointCoord);gl_FragColor=vec4(vC*1.4,t.a*vA);}',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      this.points = new THREE.Points(g, this.mat);
      this.points.frustumCulled = false;
    }
    // o: x,y,z, vx,vy,vz, life, size, color, grav, drag, grow
    emit(o) {
      const k = this.i; this.i = (this.i + 1) % this.max;
      const c = rgb(o.color === undefined ? 0xffffff : o.color), k3 = k * 3;
      this.pos[k3] = o.x; this.pos[k3 + 1] = o.y; this.pos[k3 + 2] = o.z;
      this.vel[k3] = o.vx || 0; this.vel[k3 + 1] = o.vy || 0; this.vel[k3 + 2] = o.vz || 0;
      this.col[k3] = c.r; this.col[k3 + 1] = c.g; this.col[k3 + 2] = c.b;
      this.life[k] = this.maxLife[k] = o.life || 0.5;
      this.size0[k] = this.size[k] = o.size || 0.3; this.grav[k] = o.grav || 0; this.drag[k] = o.drag || 0; this.grow[k] = o.grow || 0;
      this.alpha[k] = 1;
    }
    update(dt) {
      for (let k = 0; k < this.max; k++) {
        if (this.life[k] <= 0) { if (this.alpha[k] !== 0) { this.alpha[k] = 0; this.size[k] = 0; } continue; }
        this.life[k] -= dt;
        const k3 = k * 3, d = Math.max(0, 1 - this.drag[k] * dt);
        this.vel[k3] *= d; this.vel[k3 + 1] = this.vel[k3 + 1] * d + this.grav[k] * dt; this.vel[k3 + 2] *= d;
        this.pos[k3] += this.vel[k3] * dt; this.pos[k3 + 1] += this.vel[k3 + 1] * dt; this.pos[k3 + 2] += this.vel[k3 + 2] * dt;
        if (this.pos[k3 + 1] < 0.05 && this.grav[k] < 0) { this.pos[k3 + 1] = 0.05; this.vel[k3 + 1] *= -0.3; }
        const l = Math.max(0, this.life[k] / this.maxLife[k]);
        this.alpha[k] = Math.min(1, l * 2.2);
        this.size[k] = this.size0[k] * (1 + this.grow[k] * (1 - l));
      }
      this.geo.attributes.position.needsUpdate = true; this.geo.attributes.pcol.needsUpdate = true;
      this.geo.attributes.psize.needsUpdate = true; this.geo.attributes.palpha.needsUpdate = true;
    }
    setScale(h, fov) { this.mat.uniforms.scale.value = h / (2 * Math.tan(fov * Math.PI / 360)); }
    clear() { this.life.fill(0); this.alpha.fill(0); this.size.fill(0); }
    // 属性別のはじけ方
    burst(elem, x, y, z, n, power, spread) {
      const cs = ELEM_FX[elem] || ELEM_FX.none;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(0.3, 1) * power, up = rnd(-0.2, 1);
        const o = { x: x + rnd(-1, 1) * (spread || 0), y: y, z: z + rnd(-1, 1) * (spread || 0), vx: Math.cos(a) * s, vy: up * s * 0.8, vz: Math.sin(a) * s, color: cs[(Math.random() * 3) | 0], life: rnd(0.3, 0.7), size: rnd(0.2, 0.5), drag: 2 };
        if (elem === 'fire') { o.vy = rnd(1, 1 + power * 0.6); o.grav = 3; o.grow = -0.6; o.life = rnd(0.4, 0.9); }
        else if (elem === 'water') { o.grav = -14; o.size *= 0.7; o.life = rnd(0.5, 0.9); o.drag = 0.5; }
        else if (elem === 'earth') { o.grav = -18; o.size = rnd(0.2, 0.45); o.life = rnd(0.5, 1); o.drag = 0.3; }
        else if (elem === 'wind') { o.vy *= 0.3; o.size *= 0.8; o.grow = 1; }
        else if (elem === 'dark') { o.grow = 1.5; o.size *= 1.3; o.drag = 3; o.vy = rnd(0.5, 2); }
        else if (elem === 'light') { o.size *= 0.7; o.vy = rnd(0.5, 2) * power * 0.4; o.drag = 1.5; }
        this.emit(o);
      }
    }
    // 柱状に立ちのぼる
    column(elem, x, z, r, n, h) {
      const cs = ELEM_FX[elem] || ELEM_FX.none;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
        this.emit({ x: x + Math.cos(a) * rr, y: 0.1, z: z + Math.sin(a) * rr, vx: 0, vy: rnd(4, 4 + h), vz: 0, color: cs[(Math.random() * 3) | 0], life: rnd(0.4, 0.9), size: rnd(0.3, 0.7), drag: 1, grow: -0.4 });
      }
    }
    // 円周に沿って広がる
    ringBurst(elem, x, z, r, n) {
      const cs = ELEM_FX[elem] || ELEM_FX.none;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        this.emit({ x: x + Math.cos(a) * 0.5, y: 0.2, z: z + Math.sin(a) * 0.5, vx: Math.cos(a) * r * 2.6, vy: rnd(0.2, 1.2), vz: Math.sin(a) * r * 2.6, color: cs[(Math.random() * 3) | 0], life: rnd(0.3, 0.5), size: rnd(0.35, 0.6), drag: 3, grow: 0.5 });
      }
    }
  }

  // ---------- マテリアル ----------
  function toon(color, o = {}) {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: gradTex, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei === undefined ? 1 : o.ei });
    if (o.transparent) { m.transparent = true; m.opacity = o.opacity; }
    if (o.side) m.side = o.side;
    m.userData.glow = !!o.emissive;
    return m;
  }
  function glowSprite(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: opacity === undefined ? 0.9 : opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1); return s;
  }

  // ---------- モンスターモデル ----------
  // def: { type, elem, color }  type: sword=ドラゴン / fist=ゴリラ / mage=クラゲ / archer=小鳥 / heavy=ゴーレム / dual=キツネ
  function buildModel(def) {
    const ec = ELEM[def.elem].c;
    const main = new THREE.Color(def.color), dark = main.clone().multiplyScalar(0.55), light = main.clone().lerp(new THREE.Color(0xffffff), 0.55);
    const mats = [], sway = [];
    const part = (geo, color, o = {}) => {
      const m = toon(color, o); mats.push(m);
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true;
      if (!o.noOutline && !o.transparent) { const ol = new THREE.Mesh(geo, outlineMat); ol.scale.setScalar(o.ol || 1.07); mesh.add(ol); }
      if (o.scale) mesh.scale.set(o.scale[0], o.scale[1], o.scale[2]);
      return mesh;
    };
    const ball = (r, color, o = {}) => part(new THREE.SphereGeometry(r, 16, 12), color, o);
    const cone = (r, h, color, o = {}) => part(new THREE.ConeGeometry(r, h, o.seg || 6), color, o);
    const cyl = (r1, r2, h, color, o = {}) => part(new THREE.CylinderGeometry(r1, r2, h, o.seg || 10), color, o);
    const box = (w, h, d, color, o = {}) => part(new THREE.BoxGeometry(w, h, d), color, o);
    const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
    const swayOf = (o, axis, amp, sp, ph) => sway.push({ o, axis, amp, sp, ph: ph || 0 });
    const eyes = (head, y, z, sx, r, col) => {
      for (const s of [-1, 1]) {
        const e = ball(r, col || 0x1a1a2a, { noOutline: true }); e.scale.set(0.9, 1.25, 0.5); head.add(at(e, s * sx, y, z));
        const h = ball(r * 0.35, 0xffffff, { noOutline: true, emissive: 0xffffff }); head.add(at(h, s * sx + r * 0.3, y + r * 0.45, z + r * 0.4));
      }
    };
    const root = new THREE.Group(), upper = new THREE.Group(); upper.position.y = 0.8; root.add(upper);
    const head = new THREE.Group(); upper.add(head);
    const mkArm = (s, x, len, color) => {
      const a = new THREE.Group(); a.position.set(s * x, 0.82, 0); upper.add(a);
      const up = cyl(0.1, 0.085, len, color || main, { seg: 8 }); up.position.y = -len / 2; a.add(up);
      const hand = new THREE.Group(); hand.position.y = -len - 0.02; a.add(hand);
      return { arm: a, hand };
    };
    const mkLeg = (s, x, len, color) => {
      const l = new THREE.Group(); l.position.set(s * x, 0.8, 0); root.add(l);
      const th = cyl(0.13, 0.11, len, color || dark, { seg: 8 }); th.position.y = -len / 2; l.add(th);
      return l;
    };
    const t = def.type;
    let L, Rr, legL, legR, cape = null, float = 0, quad = false;
    const orbs = [];
    const glowTip = (parent, color, size, x, y, z) => { const g = glowSprite(color, size, 0.9); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; };

    if (t === 'sword') {            // ほのおのドラゴン（四足歩行）
      quad = true; upper.position.y = 0.74;
      const body = ball(0.5, main, { scale: [0.88, 0.82, 1.5] }); upper.add(body);
      const belly = ball(0.4, light, { noOutline: true, scale: [0.72, 0.5, 1.25] }); upper.add(at(belly, 0, -0.2, 0.05));
      for (let i = 0; i < 6; i++) { const sp = cone(0.1 - i * 0.008, 0.3 - i * 0.025, ec, { emissive: ec, ei: 0.35 }); sp.rotation.x = -0.5; upper.add(at(sp, 0, 0.42 - Math.abs(i - 2) * 0.025, 0.65 - i * 0.24)); }
      const neck = cyl(0.2, 0.26, 0.55, main, { seg: 10 }); neck.rotation.x = 0.85; upper.add(at(neck, 0, 0.3, 0.78));
      head.position.set(0, 0.68, 1.12); upper.add(head);
      const skull = ball(0.33, main, { scale: [1.0, 0.88, 1.1] }); head.add(skull);
      const snout = box(0.26, 0.16, 0.34, main.clone().lerp(new THREE.Color(0xffe0b0), 0.35), { ol: 1.1 }); head.add(at(snout, 0, -0.07, 0.34));
      for (const sd of [-1, 1]) {
        head.add(at(ball(0.026, 0x222222, { noOutline: true }), sd * 0.06, -0.02, 0.52));
        const horn = cone(0.06, 0.38, 0xf2e6c8, { seg: 6 }); horn.rotation.x = -0.9; horn.rotation.z = -sd * 0.25; head.add(at(horn, sd * 0.17, 0.3, -0.14));
        head.add(at(ball(0.075, 0xffe040, { emissive: 0xffe040, ei: 0.5, noOutline: true }), sd * 0.17, 0.08, 0.2));
        head.add(at(box(0.025, 0.1, 0.02, 0x222222, { noOutline: true }), sd * 0.17, 0.08, 0.27));
      }
      const hl = cone(0.06, 0.2, ec, { emissive: ec, ei: 0.6 }); hl.rotation.x = -0.5; head.add(at(hl, 0, 0.34, 0));
      for (const sd of [-1, 1]) {
        const wg = new THREE.Group(); wg.position.set(sd * 0.3, 0.38, 0.2); upper.add(wg);
        const w1 = cone(0.3, 0.95, dark, { seg: 3, ol: 1.05 }); w1.scale.z = 0.18; w1.rotation.z = -sd * 1.05; wg.add(at(w1, sd * 0.38, 0.4, 0));
        const w2 = cone(0.2, 0.68, ec, { seg: 3, emissive: ec, ei: 0.3, noOutline: true }); w2.scale.z = 0.12; w2.rotation.z = -sd * 1.05; wg.add(at(w2, sd * 0.38, 0.4, 0.02));
        swayOf(wg, 'z', 0.2, 4, sd);
      }
      let par = upper; const sizes = [0.3, 0.26, 0.21, 0.16, 0.12];
      sizes.forEach((r, i) => {
        const g = new THREE.Group(); g.position.set(0, i ? 0 : 0.0, i ? -r * 1.9 : -0.78); par.add(g);
        const b = ball(r, i % 2 ? main : dark); b.position.z = -r * 0.9; g.add(b);
        swayOf(g, 'y', 0.35, 3, i * 0.7); par = g;
        if (i === sizes.length - 1) { const f = cone(0.14, 0.4, 0xffb02a, { emissive: ec, ei: 0.9, noOutline: true }); f.rotation.x = -Math.PI / 2; g.add(at(f, 0, 0, -r * 2.3)); glowTip(g, 0xff7a2a, 1.3, 0, 0, -r * 2.3); }
      });
      const legQ = (parentG, x, y, z, len, thick) => {
        const g = new THREE.Group(); g.position.set(x, y, z); parentG.add(g);
        const th = cyl(thick, thick * 0.78, len, main, { seg: 8 }); th.position.y = -len / 2; g.add(th);
        const hand = new THREE.Group(); hand.position.y = -len; g.add(hand);
        hand.add(at(box(0.26, 0.14, 0.38, dark), 0, -0.04, 0.08));
        for (let i = -1; i <= 1; i++) hand.add(at(cone(0.03, 0.15, 0xf2e6c8, { noOutline: true, seg: 4 }), i * 0.08, -0.05, 0.3));
        return { arm: g, hand };
      };
      L = legQ(upper, -0.34, -0.14, 0.55, 0.5, 0.16); Rr = legQ(upper, 0.34, -0.14, 0.55, 0.5, 0.16);
      const hl2 = legQ(root, -0.34, 0.64, -0.5, 0.52, 0.18), hr2 = legQ(root, 0.34, 0.64, -0.5, 0.52, 0.18);
      legL = hl2.arm; legR = hr2.arm;
    } else if (t === 'mage') {      // ふわふわクラゲ
      float = 0.4;
      head.position.set(0, 0.95, 0);
      const dome = part(new THREE.SphereGeometry(0.7, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), main, { transparent: true, opacity: 0.88, ol: 1.04 }); head.add(at(dome, 0, -0.1, 0));
      const inner = ball(0.4, light, { noOutline: true, transparent: true, opacity: 0.7 }); head.add(at(inner, 0, 0.1, 0));
      const core = ball(0.16, ec, { emissive: ec, ei: 1, noOutline: true }); head.add(at(core, 0, 0.35, -0.1)); glowTip(head, ec, 1.6, 0, 0.35, -0.1);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, b = ball(0.07, ec, { emissive: ec, ei: 0.7, noOutline: true }); head.add(at(b, Math.cos(a) * 0.5, 0.18 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.5)); }
      eyes(head, 0.0, 0.58, 0.2, 0.09);
      for (const s of [-1, 1]) { const ch = ball(0.07, 0xff9ab8, { noOutline: true, scale: [1.3, 0.6, 0.3] }); head.add(at(ch, s * 0.34, -0.1, 0.55)); }
      const star = cone(0.12, 0.3, 0xffe27a, { emissive: 0xffe27a, ei: 0.7, noOutline: true, seg: 5 }); head.add(at(star, 0, 0.7, 0));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.cos(a) * 0.42, 0.55, Math.sin(a) * 0.42); upper.add(g);
        const len = 0.9 + (i % 3) * 0.25, tn = cyl(0.07, 0.025, len, i % 2 ? light : main, { seg: 6, transparent: true, opacity: 0.85, ol: 1.05 }); tn.position.y = -len / 2; g.add(tn);
        swayOf(g, i % 2 ? 'x' : 'z', 0.3, 2.2, i);
      }
      L = mkArm(-1, 0.55, 0.55, light); Rr = mkArm(1, 0.55, 0.55, light);
      L.arm.position.y = 0.55; Rr.arm.position.y = 0.55;
      for (const h of [L.hand, Rr.hand]) { h.add(ball(0.12, ec, { emissive: ec, ei: 0.8, noOutline: true })); glowTip(h, ec, 0.9); }
      legL = mkLeg(-1, 0.2, 0.3); legR = mkLeg(1, 0.2, 0.3); legL.visible = legR.visible = false;
      orbs.push(glowTip(upper, ec, 0.01, 0, 0, 0));
    } else if (t === 'heavy') {     // いわのゴーレム
      const rock = new THREE.Color(0x8a7f78).lerp(main, 0.45).multiplyScalar(0.62);
      const body = box(1.0, 0.95, 0.8, rock, { ol: 1.05 }); upper.add(at(body, 0, 0.42, 0));
      const chest = box(0.55, 0.45, 0.2, ec, { emissive: ec, ei: 0.7, noOutline: true }); upper.add(at(chest, 0, 0.5, 0.4)); glowTip(upper, ec, 0.9, 0, 0.5, 0.5);
      for (let i = 0; i < 3; i++) { const cr = box(0.05, 0.5, 0.05, ec, { emissive: ec, ei: 0.9, noOutline: true }); cr.rotation.z = (i - 1) * 0.5; upper.add(at(cr, (i - 1) * 0.3, 0.2, 0.41)); }
      for (let i = 0; i < 5; i++) { const cs = cone(0.1, 0.4 + (i % 2) * 0.2, ec, { emissive: ec, ei: 0.5, seg: 5 }); cs.rotation.x = -2.3; upper.add(at(cs, (i - 2) * 0.2, 0.85, -0.42)); }
      for (let i = 0; i < 4; i++) { const mo = ball(0.15, 0x4a8a3a, { noOutline: true, scale: [1.2, 0.5, 1] }); upper.add(at(mo, rnd(-0.35, 0.35), 0.92, rnd(-0.3, 0.3))); }
      head.position.set(0, 1.2, 0.1);
      const sk = box(0.62, 0.5, 0.55, rock, { ol: 1.07 }); head.add(sk);
      for (const s of [-1, 1]) { const ey = box(0.14, 0.08, 0.05, ec, { emissive: ec, ei: 1, noOutline: true }); head.add(at(ey, s * 0.14, 0.04, 0.29)); }
      const br = box(0.5, 0.07, 0.1, dark, { noOutline: true }); head.add(at(br, 0, 0.14, 0.28));
      for (const s of [-1, 1]) { const sh = part(new THREE.DodecahedronGeometry(0.34, 0), rock); upper.add(at(sh, s * 0.68, 0.95, 0)); }
      L = mkArm(-1, 0.72, 0.5, rock); Rr = mkArm(1, 0.72, 0.5, rock);
      for (const h of [L.hand, Rr.hand]) { h.add(at(box(0.5, 0.45, 0.5, rock, { ol: 1.07 }), 0, -0.15, 0)); h.add(at(box(0.52, 0.06, 0.52, ec, { emissive: ec, ei: 0.5, noOutline: true }), 0, 0.02, 0)); }
      legL = mkLeg(-1, 0.28, 0.5, rock); legR = mkLeg(1, 0.28, 0.5, rock);
      for (const l of [legL, legR]) l.add(at(box(0.45, 0.28, 0.55, dark), 0, -0.62, 0.05));
      upper.scale.setScalar(1.08);
    } else if (t === 'archer') {    // かぜの小鳥
      const body = ball(0.52, main, { scale: [0.95, 1.1, 0.95] }); upper.add(at(body, 0, 0.5, 0));
      const belly = ball(0.4, light, { noOutline: true, scale: [0.85, 1, 0.55] }); upper.add(at(belly, 0, 0.42, 0.28));
      head.position.set(0, 1.25, 0.1);
      const sk = ball(0.36, main); head.add(sk);
      const beak = cone(0.12, 0.3, 0xffb030, { seg: 5 }); beak.rotation.x = Math.PI / 2; head.add(at(beak, 0, -0.04, 0.4));
      eyes(head, 0.08, 0.3, 0.16, 0.09);
      for (const s of [-1, 1]) { const ch = ball(0.06, 0xff9a9a, { noOutline: true, scale: [1.3, 0.6, 0.3] }); head.add(at(ch, s * 0.26, -0.07, 0.26)); }
      for (let i = 0; i < 3; i++) { const f = cone(0.07, 0.4 - i * 0.04, ec, { emissive: ec, ei: 0.4, seg: 4 }); f.rotation.z = (i - 1) * 0.45; f.rotation.x = -0.3; head.add(at(f, (i - 1) * 0.1, 0.42, -0.05)); }
      for (let i = 0; i < 3; i++) { const f = cone(0.1, 0.8, i === 1 ? ec : dark, { emissive: i === 1 ? ec : 0, ei: 0.3, seg: 4 }); f.rotation.x = -2.0; f.rotation.z = (i - 1) * 0.4; upper.add(at(f, (i - 1) * 0.18, 0.3, -0.62)); }
      const mkWing = s => {
        const a = new THREE.Group(); a.position.set(s * 0.48, 0.82, 0); upper.add(a);
        for (let i = 0; i < 4; i++) { const f = box(0.14, 0.62 - i * 0.04, 0.04, i % 2 ? ec : main, { emissive: i % 2 ? ec : 0, ei: 0.25, ol: 1.1 }); f.position.set(s * (0.1 + i * 0.12), -0.3 - i * 0.02, 0); f.rotation.z = s * (0.1 + i * 0.12); a.add(f); }
        const hand = new THREE.Group(); hand.position.y = -0.7; a.add(hand);
        return { arm: a, hand };
      };
      L = mkWing(-1); Rr = mkWing(1);
      legL = mkLeg(-1, 0.18, 0.5, 0xffb030); legR = mkLeg(1, 0.18, 0.5, 0xffb030);
      for (const l of [legL, legR]) for (let i = -1; i <= 1; i++) { const c = cone(0.03, 0.22, 0xffb030, { noOutline: true, seg: 4 }); c.rotation.x = Math.PI / 2; l.add(at(c, i * 0.07, -0.55, 0.14)); }
    } else if (t === 'dual') {      // ふたつ尾のキツネ（四足歩行）
      quad = true; upper.position.y = 0.7;
      const body = ball(0.42, main, { scale: [0.82, 0.78, 1.55] }); upper.add(body);
      const belly = ball(0.34, light, { noOutline: true, scale: [0.7, 0.5, 1.25] }); upper.add(at(belly, 0, -0.16, 0.06));
      const ruff = cone(0.3, 0.45, light, { seg: 8 }); ruff.rotation.x = Math.PI / 2 + 0.2; upper.add(at(ruff, 0, 0.0, 0.72));
      const gem = ball(0.07, ec, { emissive: ec, ei: 1, noOutline: true }); upper.add(at(gem, 0, 0.12, 0.98)); glowTip(upper, ec, 0.8, 0, 0.12, 1.0);
      const neck = cyl(0.17, 0.22, 0.5, main, { seg: 10 }); neck.rotation.x = 0.7; upper.add(at(neck, 0, 0.26, 0.78));
      head.position.set(0, 0.62, 1.1); upper.add(head);
      const sk = ball(0.3, main, { scale: [1.1, 0.92, 1] }); head.add(sk);
      const snout = cone(0.13, 0.36, light, { seg: 8 }); snout.rotation.x = Math.PI / 2; head.add(at(snout, 0, -0.06, 0.36));
      head.add(at(ball(0.04, 0x222222, { noOutline: true }), 0, -0.04, 0.54));
      eyes(head, 0.06, 0.25, 0.15, 0.075);
      for (const sd of [-1, 1]) {
        const ear = cone(0.12, 0.46, main, { seg: 4 }); ear.rotation.z = -sd * 0.25; head.add(at(ear, sd * 0.2, 0.4, -0.04));
        const ei = cone(0.07, 0.3, sd > 0 ? 0xf0e6ff : 0x3a2a5a, { noOutline: true, seg: 4 }); ei.rotation.z = -sd * 0.25; head.add(at(ei, sd * 0.2, 0.39, 0.0));
        const ck = cone(0.08, 0.18, light, { noOutline: true, seg: 4 }); ck.rotation.z = sd * 1.4; head.add(at(ck, sd * 0.32, -0.07, 0.08));
        head.add(at(ball(0.05, ec, { emissive: ec, ei: 0.6, noOutline: true }), sd * 0.13, 0.24, 0.24));
      }
      [[-1, 0xf4f0ff, 0xffe27a], [1, 0x3a2a5a, 0x8a5ad6]].forEach(([sd, col, tip]) => {
        let par = upper; const sizes = [0.24, 0.23, 0.2, 0.15];
        sizes.forEach((r, i) => {
          const g = new THREE.Group(); g.position.set(i ? 0 : sd * 0.14, i ? 0.05 : 0.12, i ? -r * 1.9 : -0.68); par.add(g);
          g.rotation.x = i ? 0 : 0.5;
          const b = ball(r, col); b.position.z = -r * 0.9; g.add(b);
          swayOf(g, 'y', 0.4 * sd, 2.5, i * 0.6 + sd); par = g;
          if (i === sizes.length - 1) { const tp = ball(0.13, tip, { emissive: tip, ei: 0.9, noOutline: true }); g.add(at(tp, 0, 0, -r * 2.1)); glowTip(g, tip, 1.2, 0, 0, -r * 2.1); }
        });
      });
      const legQ = (parentG, x, y, z, len, thick) => {
        const g = new THREE.Group(); g.position.set(x, y, z); parentG.add(g);
        const th = cyl(thick, thick * 0.7, len, main, { seg: 8 }); th.position.y = -len / 2; g.add(th);
        const hand = new THREE.Group(); hand.position.y = -len; g.add(hand);
        hand.add(at(cyl(thick * 0.8, thick * 0.8, 0.2, 0x2a2238, { seg: 8 }), 0, 0.1, 0));
        hand.add(at(box(0.2, 0.12, 0.3, 0x2a2238), 0, -0.04, 0.06));
        return { arm: g, hand };
      };
      L = legQ(upper, -0.27, -0.12, 0.55, 0.5, 0.12); Rr = legQ(upper, 0.27, -0.12, 0.55, 0.5, 0.12);
      const hl2 = legQ(root, -0.27, 0.6, -0.5, 0.52, 0.14), hr2 = legQ(root, 0.27, 0.6, -0.5, 0.52, 0.14);
      legL = hl2.arm; legR = hr2.arm;
      for (let i = 0; i < 3; i++) { const o = glowSprite(i % 2 ? 0x8a5ad6 : 0xffe27a, 0.7, 0.9); o.userData.ph = i * 2.1; root.add(o); orbs.push(o); }
    } else {                         // fist: ゴリラ
      const fur = main;
      const body = ball(0.6, fur, { scale: [1.1, 1, 0.95] }); upper.add(at(body, 0, 0.45, 0));
      const chest = ball(0.4, light, { noOutline: true, scale: [1, 0.9, 0.5] }); upper.add(at(chest, 0, 0.5, 0.35));
      head.position.set(0, 1.18, 0.15);
      const sk = ball(0.3, dark); head.add(sk);
      const mz = ball(0.22, light, { scale: [1.1, 0.85, 0.8] }); head.add(at(mz, 0, -0.07, 0.2));
      const br = box(0.5, 0.1, 0.18, dark, { noOutline: true }); head.add(at(br, 0, 0.1, 0.22));
      eyes(head, 0.04, 0.27, 0.12, 0.06);
      head.add(at(box(0.16, 0.025, 0.02, 0x222222, { noOutline: true }), 0, -0.12, 0.4));
      for (const s of [-1, 1]) head.add(at(ball(0.09, light, { noOutline: true }), s * 0.3, 0.02, 0));
      const band = cyl(0.31, 0.31, 0.07, ec, { emissive: ec, ei: 0.5, noOutline: true, seg: 14 }); head.add(at(band, 0, 0.2, 0));
      L = mkArm(-1, 0.72, 0.6, fur); Rr = mkArm(1, 0.72, 0.6, fur);
      L.arm.scale.y = Rr.arm.scale.y = 1.25;
      for (const h of [L.hand, Rr.hand]) { h.add(at(ball(0.3, dark, { scale: [1, 0.95, 1] }), 0, -0.1, 0)); h.add(at(ball(0.2, ec, { emissive: ec, ei: 0.45, noOutline: true }), 0, -0.1, 0.12)); glowTip(h, ec, 0.9, 0, -0.1, 0.1); }
      legL = mkLeg(-1, 0.28, 0.5, dark); legR = mkLeg(1, 0.28, 0.5, dark);
      for (const l of [legL, legR]) l.add(at(box(0.36, 0.2, 0.46, fur), 0, -0.6, 0.06));
    }

    // 影・オーラ・防御/ガード表示
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; root.add(shadow);
    const aura = glowSprite(ec, 3.2, 0.0); aura.position.y = 1.1; root.add(aura);
    const guardMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14, -Math.PI / 2.2, Math.PI / 1.1, 0.2, Math.PI * 0.7), new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    guardMesh.position.set(0, 1.1, 0.2); root.add(guardMesh);
    const barrier = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 14), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    barrier.position.y = 1.1; root.add(barrier);
    const chargeRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.08, 28), new THREE.MeshBasicMaterial({ color: ec, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    chargeRing.rotation.x = -Math.PI / 2; chargeRing.position.y = 0.06; root.add(chargeRing);

    return { root, upper, head, armL: L.arm, armR: Rr.arm, handL: L.hand, handR: Rr.hand, legL, legR, cape, orbs, sway, float, quad, baseY: upper.position.y, mats, shadow, aura, guardMesh, barrier, chargeRing, type: t, ec };
  }

  // s: { moving, atk(0〜1の進行), style, stun, guard, dead, charge, buff, idleOnly }
  function pose(p, s, t) {
    const u = p.upper, wide = p.type === 'heavy';
    const sw = s.moving ? Math.sin(t * 13) : 0;
    p.legL.rotation.x = sw * 0.8; p.legR.rotation.x = -sw * 0.8;
    u.position.y = (p.baseY || 0.8) + (s.moving ? Math.abs(Math.sin(t * 13)) * 0.07 : Math.sin(t * 2.4) * 0.02);
    let aR = s.moving ? sw * 0.6 : Math.sin(t * 2.4) * 0.05 - 0.15, aL = s.moving ? -sw * 0.6 : -Math.sin(t * 2.4) * 0.05 - 0.15;
    let lean = s.moving ? 0.14 : 0, twist = 0, headX = 0, aRz = 0.05, aLz = -0.05;
    if (p.type === 'mage') { aR = -0.35 + Math.sin(t * 2) * 0.15; aL = -0.35 - Math.sin(t * 2) * 0.15; }
    if (p.type === 'fist') { aR -= 0.25; aL -= 0.25; }
    if (s.charge > 0) { aL = -1.5; aR = 1.0 + s.charge * 0.8; lean = 0.1; }
    if (s.atk > 0) {
      const q = 1 - s.atk, e = x => x * x * (3 - 2 * x);
      if (s.style === 'slash') {
        if (q < 0.3) { const k = e(q / 0.3); aR = -0.15 + k * 2.0; twist = k * 0.6; lean = -0.1 * k; }
        else if (q < 0.55) { const k = e((q - 0.3) / 0.25); aR = 1.85 - k * 4.1; twist = 0.6 - k * 1.3; lean = 0.45 * k; }
        else { const k = e((q - 0.55) / 0.45); aR = -2.25 + k * 2.1; twist = -0.7 + k * 0.7; lean = 0.45 * (1 - k); }
      } else if (s.style === 'pound') {
        if (q < 0.5) { const k = e(q / 0.5); aR = -0.15 - k * 2.6; aL = -0.15 - k * 2.4; lean = -0.35 * k; }
        else if (q < 0.65) { const k = e((q - 0.5) / 0.15); aR = -2.75 + k * 3.6; aL = -2.55 + k * 3.4; lean = -0.35 + k * 1.0; }
        else { const k = e((q - 0.65) / 0.35); aR = 0.85 - k * 1.0; aL = 0.85 - k * 1.0; lean = 0.65 * (1 - k); }
      } else if (s.style === 'cast') {
        const k = Math.sin(Math.min(1, q * 1.4) * Math.PI);
        aR = -1.5 * k - 0.2; aL = -1.5 * k - 0.2; lean = 0.12 * k; headX = -0.2 * k;
      } else if (s.style === 'shoot') {
        const k = Math.sin(Math.min(1, q * 1.3) * Math.PI);
        aL = -1.55; aR = -1.4 + k * 2.2; lean = 0.08;
      } else if (s.style === 'dash') { aR = -1.6; aL = 1.2; lean = 0.55; }
      else if (s.style === 'buff') { const k = Math.sin(q * Math.PI); aR = -2.6 * k; aL = -2.6 * k; lean = -0.15 * k; }
    }
    if (s.guard) { aL = -1.3; aR = -1.3; aRz = -0.5; aLz = 0.5; lean = 0.1; }
    if (s.stun) { lean = -0.45; headX = 0.3; aR = 0.8; aL = 0.8; }
    if (p.quad) {
      const w = s.moving ? Math.sin(t * 12) : 0;
      aR = -w * 0.75; aL = w * 0.75; let hR = w * 0.75, hL = -w * 0.75;
      if (!s.moving) { aR = aL = Math.sin(t * 2.4) * 0.03; hR = hL = 0; }
      lean = s.moving ? 0.04 : 0; twist = 0; headX = s.moving ? 0.1 : Math.sin(t * 2) * 0.05;
      u.position.y = p.baseY + (s.moving ? Math.abs(Math.sin(t * 12)) * 0.06 : Math.sin(t * 2.4) * 0.015);
      if (s.charge > 0) { lean = -0.3; aL = aR = -0.9; }
      if (s.atk > 0) {
        const q = 1 - s.atk, e = x => x * x * (3 - 2 * x);
        if (s.style === 'slash' || s.style === 'dash') {
          if (q < 0.3) { const k = e(q / 0.3); aR = 0.2 + k * 0.9; lean = -0.35 * k; headX = -0.2 * k; }
          else if (q < 0.55) { const k = e((q - 0.3) / 0.25); aR = 1.1 - k * 2.9; lean = -0.35 + k * 0.75; headX = 0.3 * k; aL = -0.3 * k; }
          else { const k = e((q - 0.55) / 0.45); aR = -1.8 + k * 1.8; lean = 0.4 * (1 - k); }
          if (s.style === 'dash') { aR = aL = -1.2; hR = hL = 1.0; lean = 0.2; }
        } else if (s.style === 'pound') {
          if (q < 0.5) { const k = e(q / 0.5); aR = aL = -0.6 - k * 0.8; lean = -0.55 * k; headX = -0.3 * k; }
          else if (q < 0.65) { const k = e((q - 0.5) / 0.15); aR = aL = -1.4 + k * 1.9; lean = -0.55 + k * 0.95; headX = 0.4 * k; }
          else { const k = e((q - 0.65) / 0.35); aR = aL = 0.5 - k * 0.5; lean = 0.4 * (1 - k); }
        } else if (s.style === 'cast') {
          const k = Math.sin(Math.min(1, q * 1.4) * Math.PI);
          lean = -0.28 * k; headX = -0.45 * k; aR = aL = -0.5 * k;
        } else if (s.style === 'buff') { const k = Math.sin(q * Math.PI); lean = -0.55 * k; aR = aL = -1.3 * k; headX = -0.3 * k; }
      }
      if (s.guard) { aL = aR = -0.5; lean = 0.12; u.position.y = p.baseY - 0.14; headX = 0.2; }
      if (s.stun) { lean = -0.3; headX = 0.4; aR = aL = 0.5; }
      p.legR.rotation.x = hR; p.legL.rotation.x = hL; aRz = 0; aLz = 0;
    }
    if (p.type === 'archer') { const fl = s.moving ? Math.sin(t * 22) * 0.7 : Math.sin(t * 3) * 0.12; aRz = 0.35 + fl + (s.atk > 0 ? 0.5 : 0); aLz = -(0.35 + fl + (s.atk > 0 ? 0.5 : 0)); if (!s.atk) { aR = 0; aL = 0; } }
    p.armR.rotation.set(aR, 0, aRz); p.armL.rotation.set(aL, 0, aLz);
    if (p.sway) p.sway.forEach(w => { w.o.rotation[w.axis] = Math.sin(t * w.sp * (s.moving ? 1.6 : 1) + w.ph) * w.amp; });
    u.rotation.set(lean, twist, 0); p.head.rotation.x = headX;
    if (p.cape) p.cape.rotation.x = 0.12 + (s.moving ? 0.45 : Math.sin(t * 3) * 0.06);
    p.orbs.forEach((o, i) => { if (o.userData.ph !== undefined) { const a = t * 1.8 + o.userData.ph; o.position.set(Math.cos(a) * 1.1, 1.2 + Math.sin(a * 1.3) * 0.25, Math.sin(a) * 1.1); } });
    if (s.dead) { p.root.rotation.x = -1.45; p.root.position.y = 0.5; } else { p.root.rotation.x = 0; p.root.position.y = p.float ? p.float + Math.sin(t * 2.2) * 0.12 : 0; }
    p.shadow.position.y = 0.03 - p.root.position.y; p.shadow.scale.setScalar(Math.max(0.5, 1 - p.root.position.y * 0.25));
    p.guardMesh.material.opacity = s.guard ? 0.28 + Math.sin(t * 20) * 0.05 : 0;
    p.barrier.material.opacity = s.barrier ? 0.25 : 0; if (s.barrier) p.barrier.rotation.y = t * 0.8;
    p.aura.material.opacity = s.buff ? 0.4 + Math.sin(t * 8) * 0.12 : 0;
    p.chargeRing.material.opacity = s.charge > 0.01 ? 0.3 + s.charge * 0.6 : 0; p.chargeRing.scale.setScalar(1 + s.charge * 0.9);
    // 被弾フラッシュ
    const fl = s.flash > 0 ? (s.flash > 0.06 ? 0xffffff : 0xff3030) : 0x000000;
    p.mats.forEach(m => { if (!m.userData.glow) m.emissive.setHex(fl); });
  }

  // ---------- 背景 ----------
  const SCENES = [
    { sky: [0x4aa0ff, 0xcdeeff], ground: 0x3f7a3a, floor: 0x5e9c52, rim: 0x2f5e2a, runes: 0xcff5a8, fog: 0xbfe6ff, sun: 0xfff2d0, sunI: 1.0, hemi: [0xffffff, 0x6a8a5a], stars: 0 },
    { sky: [0x1a0606, 0x7a2210], ground: 0x1c1210, floor: 0x4a3028, rim: 0xff5a1a, runes: 0xff7a2a, fog: 0x3a120a, sun: 0xff9a60, sunI: 0.7, hemi: [0xff9a70, 0x3a1810], stars: 0 },
    { sky: [0x0a2850, 0x5ab4d8], ground: 0x16405e, floor: 0x3a6a8c, rim: 0x9fe7ff, runes: 0xbff4ff, fog: 0x2a6088, sun: 0xdff4ff, sunI: 0.9, hemi: [0xbfe8ff, 0x1a3a5a], stars: 0 },
    { sky: [0x4a6a8a, 0xe8d8b8], ground: 0x6a5a48, floor: 0x8a7a68, rim: 0x5fe08a, runes: 0xaaf0c0, fog: 0xc8c0b0, sun: 0xfff0d0, sunI: 1.05, hemi: [0xe8f0ff, 0x6a5a40], stars: 0 },
    { sky: [0x080618, 0x2a1858], ground: 0x1c1838, floor: 0x4b4470, rim: 0xffe27a, runes: 0xffe27a, fog: 0x1a1238, sun: 0xb8a8ff, sunI: 0.75, hemi: [0xa8a0ff, 0x1a1030], stars: 1 },
    { sky: [0x050508, 0x40101a], ground: 0x101018, floor: 0x2d2d3c, rim: 0xe05a5a, runes: 0xff5a5a, fog: 0x180810, sun: 0xff8a8a, sunI: 0.7, hemi: [0xff9090, 0x14080c], stars: 1 },
  ];

  function floorTexture(sc) {
    return canvasTex(512, 512, (g, w) => {
      const base = new THREE.Color(sc.floor);
      g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, w, w);
      for (let i = 0; i < 700; i++) {
        const c = base.clone().multiplyScalar(rnd(0.8, 1.2)); g.fillStyle = '#' + c.getHexString(); g.globalAlpha = 0.5;
        g.fillRect(rnd(0, w), rnd(0, w), rnd(4, 26), rnd(4, 26));
      }
      g.globalAlpha = 1;
      const rc = '#' + new THREE.Color(sc.runes).getHexString();
      g.strokeStyle = rc; g.shadowColor = rc; g.shadowBlur = 8;
      const cx = w / 2;
      [[0.46, 3], [0.38, 1.5], [0.2, 2]].forEach(([r, lw]) => { g.lineWidth = lw; g.globalAlpha = 0.65; g.beginPath(); g.arc(cx, cx, r * w, 0, Math.PI * 2); g.stroke(); });
      g.globalAlpha = 0.55; g.lineWidth = 2;
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 0.38 * w, cx + Math.sin(a) * 0.38 * w); g.lineTo(cx + Math.cos(a) * 0.46 * w, cx + Math.sin(a) * 0.46 * w); g.stroke(); }
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 5 * Math.PI * 2 * 2 / 2 * (i % 2 ? 1 : 1); const r = 0.2 * w; const k = i * 2 % 10; const aa = -Math.PI / 2 + k / 10 * Math.PI * 2; const x = cx + Math.cos(aa) * r, y = cx + Math.sin(aa) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
    });
  }

  // 背景を作る。返り値: { group, update(t, dt, particles, camera), floorTex }
  function buildScenery(idx, R) {
    const sc = SCENES[idx], group = new THREE.Group(), upd = [];
    // 空
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: rgb(sc.sky[0]) }, bot: { value: rgb(sc.sky[1]) } },
      vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 bot;varying float h;void main(){gl_FragColor=vec4(mix(bot,top,smoothstep(-0.05,0.75,h)),1.0);}',
    }));
    group.add(sky);
    if (sc.stars) {
      const n = 500, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, y = rnd(0.05, 1), r = Math.sqrt(1 - y * y) * 110; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y * 110; pos[i * 3 + 2] = Math.sin(a) * r; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
      group.add(st); upd.push((t) => { st.rotation.y = t * 0.01; });
    }
    // 地面（アリーナの外側）
    const gr = new THREE.Mesh(new THREE.CircleGeometry(90, 40), new THREE.MeshToonMaterial({ color: sc.ground, gradientMap: gradTex }));
    gr.rotation.x = -Math.PI / 2; gr.position.y = -0.06; gr.receiveShadow = true; group.add(gr);
    const mk = (geo, color, o = {}) => { const m = new THREE.Mesh(geo, toon(color, o)); m.castShadow = true; return m; };
    const ringPos = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(-0.1, 0.1), r = rnd(r0, r1); fn(Math.cos(a) * r, Math.sin(a) * r, a, i); } };
    const lights = [];

    if (idx === 0) {
      ringPos(26, R + 5, R + 30, (x, z) => {
        const g = new THREE.Group(), h = rnd(1.6, 3);
        const tr = mk(new THREE.CylinderGeometry(0.25, 0.35, h, 7), 0x6a4a2a); tr.position.y = h / 2; g.add(tr);
        for (let k = 0; k < 3; k++) { const c = mk(new THREE.ConeGeometry(1.5 - k * 0.3, 1.8, 8), k % 2 ? 0x3e9a48 : 0x2e8a3c); c.position.y = h + k * 0.9; g.add(c); }
        g.position.set(x, 0, z); g.scale.setScalar(rnd(0.9, 1.5)); group.add(g);
      });
      ringPos(60, R + 0.5, R + 4, (x, z) => { const f = mk(new THREE.ConeGeometry(0.08, rnd(0.4, 0.8), 4), 0x4aaa4a, { noOutline: true }); f.position.set(x, 0.3, z); group.add(f); });
      ringPos(30, R + 1, R + 8, (x, z) => { const f = mk(new THREE.SphereGeometry(0.14, 6, 5), pick([0xffe27a, 0xff9ab0, 0xffffff]), { noOutline: true }); f.position.set(x, 0.2, z); group.add(f); });
      for (let i = 0; i < 7; i++) { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(3, 5), 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false })); s.position.set(k * 4 - 6, rnd(-0.6, 0.6), rnd(-1, 1)); s.scale.y = 0.55; g.add(s); } g.position.set(rnd(-90, 90), rnd(26, 40), rnd(-90, 20) - 30); g.userData.sp = rnd(0.4, 1); group.add(g); upd.push((t, dt) => { g.position.x += g.userData.sp * dt; if (g.position.x > 100) g.position.x = -100; }); }
      upd.push((t, dt, P) => { if (Math.random() < dt * 14) { const a = rnd(0, 6.28), r = rnd(0, R + 10); P.emit({ x: Math.cos(a) * r, y: rnd(0.3, 4), z: Math.sin(a) * r, vx: rnd(0.5, 1.5), vy: rnd(0.1, 0.5), vz: rnd(-0.4, 0.4), color: pick([0xfff2a0, 0xc8ff9a]), life: rnd(2, 4), size: rnd(0.15, 0.3), drag: 0 }); } });
    } else if (idx === 1) {
      const lava = new THREE.Mesh(new THREE.RingGeometry(R + 0.8, R + 7, 48), new THREE.MeshBasicMaterial({ color: 0xff5a1a })); lava.rotation.x = -Math.PI / 2; lava.position.y = 0.0; group.add(lava);
      upd.push((t) => { lava.material.color.setHex(Math.sin(t * 2) > 0 ? 0xff5a1a : 0xff7a2a); lava.material.color.multiplyScalar(0.85 + Math.sin(t * 3) * 0.15); });
      ringPos(24, R + 8, R + 34, (x, z) => { const h = rnd(3, 11), c = mk(new THREE.ConeGeometry(rnd(1.5, 3), h, 5), 0x2a2220); c.position.set(x, h / 2, z); c.rotation.y = rnd(0, 6); group.add(c); });
      const vol = mk(new THREE.ConeGeometry(26, 34, 14), 0x241a18); vol.position.set(0, 14, -62); group.add(vol);
      const cr = new THREE.Mesh(new THREE.CircleGeometry(6, 14), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); cr.rotation.x = -Math.PI / 2; cr.position.set(0, 31.2, -62); group.add(cr);
      const gl = glowSprite(0xff6a1a, 40, 0.8); gl.position.set(0, 32, -62); group.add(gl);
      const pl = new THREE.PointLight(0xff6a2a, 1.2, 40); pl.position.set(0, 3, 0); group.add(pl); lights.push(pl);
      upd.push((t, dt, P) => {
        pl.intensity = 1 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23) * 0.1;
        if (Math.random() < dt * 40) { const a = rnd(0, 6.28), r = rnd(R - 2, R + 8); P.emit({ x: Math.cos(a) * r, y: 0.2, z: Math.sin(a) * r, vx: rnd(-0.5, 0.5), vy: rnd(1.5, 4), vz: rnd(-0.5, 0.5), color: pick([0xff4a1a, 0xff9a2a]), life: rnd(1.5, 3), size: rnd(0.15, 0.35), drag: 0.2 }); }
        if (Math.random() < dt * 6) P.emit({ x: rnd(-6, 6), y: 33, z: -62 + rnd(-4, 4), vx: rnd(-1, 1), vy: rnd(4, 7), vz: rnd(-1, 1), color: 0x5a3a30, life: 3, size: 8, grow: 1, drag: 0.1 });
      });
    } else if (idx === 2) {
      const wt = new THREE.Mesh(new THREE.CircleGeometry(85, 40), new THREE.MeshStandardMaterial({ color: 0x2a86c8, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.88 })); wt.rotation.x = -Math.PI / 2; wt.position.y = -0.25; group.add(wt);
      ringPos(36, R + 3, R + 28, (x, z) => { const h = rnd(2, 8), c = mk(new THREE.OctahedronGeometry(1, 0), 0x7ad8ff, { emissive: 0x2a9ad8, ei: 0.6 }); c.scale.set(rnd(0.6, 1.2), h / 2, rnd(0.6, 1.2)); c.position.set(x, h / 2 - 0.3, z); c.rotation.y = rnd(0, 6); c.userData.ph = rnd(0, 6); group.add(c); upd.push((t) => { c.material.emissiveIntensity = 0.5 + Math.sin(t * 2 + c.userData.ph) * 0.25; }); });
      ringPos(10, R + 1, R + 3, (x, z) => { const c = mk(new THREE.OctahedronGeometry(1, 0), 0xbff4ff, { emissive: 0x6ad0ff, ei: 0.7 }); c.scale.set(0.4, 1, 0.4); c.position.set(x, 0.6, z); group.add(c); });
      upd.push((t, dt, P) => { if (Math.random() < dt * 25) { const a = rnd(0, 6.28), r = rnd(2, R + 10); P.emit({ x: Math.cos(a) * r, y: rnd(0.2, 1), z: Math.sin(a) * r, vx: rnd(-0.2, 0.2), vy: rnd(0.8, 2), vz: rnd(-0.2, 0.2), color: pick([0xbff4ff, 0x7ad8ff, 0xffffff]), life: rnd(2, 4), size: rnd(0.15, 0.35), drag: 0.1 }); } });
    } else if (idx === 3) {
      ringPos(22, R + 8, R + 40, (x, z) => {
        const g = new THREE.Group(), h = rnd(8, 24), w = rnd(3, 6);
        const cols = [0xa88860, 0x946a48, 0xb89a70, 0x7a5a3a]; let y = 0;
        for (let k = 0; y < h; k++) { const sh = rnd(2, 4), b = mk(new THREE.BoxGeometry(w - k * 0.1, sh, w * rnd(0.8, 1.1)), cols[k % 4]); b.position.y = y + sh / 2; g.add(b); y += sh; }
        g.position.set(x, 0, z); g.rotation.y = rnd(0, 3); group.add(g);
      });
      for (let i = 0; i < 10; i++) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(3, 5), 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, fog: false })); s.position.set(k * 4, 0, rnd(-1, 1)); s.scale.y = 0.4; g.add(s); } g.position.set(rnd(-90, 90), rnd(6, 20), rnd(-70, 30)); g.userData.sp = rnd(2, 4); group.add(g); upd.push((t, dt) => { g.position.x += g.userData.sp * dt; if (g.position.x > 100) g.position.x = -100; }); }
      upd.push((t, dt, P) => { if (Math.random() < dt * 40) { P.emit({ x: -R - 6, y: rnd(0.3, 6), z: rnd(-R, R), vx: rnd(14, 22), vy: rnd(-0.3, 0.3), vz: rnd(-1, 1), color: pick([0xffffff, 0xcff5d8]), life: rnd(1.2, 1.8), size: rnd(0.2, 0.45), drag: 0, grow: 1.5 }); } });
    } else if (idx === 4) {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false })); moon.position.set(-30, 48, -90); group.add(moon);
      const mg = glowSprite(0xffe9a8, 50, 0.5); mg.position.copy(moon.position); group.add(mg);
      ringPos(14, R + 4, R + 16, (x, z, a, i) => {
        const g = new THREE.Group(), h = rnd(5, 11);
        const c = mk(new THREE.CylinderGeometry(0.8, 0.95, h, 10), 0xcfc8e8); c.position.y = h / 2; g.add(c);
        const cap = mk(new THREE.BoxGeometry(2.2, 0.5, 2.2), 0xe8e0ff); cap.position.y = h + 0.25; g.add(cap);
        const bd = mk(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 10), 0xffe27a, { emissive: 0xffe27a, ei: 0.8, noOutline: true }); bd.position.y = h * 0.6; g.add(bd);
        g.position.set(x, 0, z); if (i % 4 === 3) { g.rotation.z = 0.25; } group.add(g);
      });
      ringPos(12, R + 2, R + 22, (x, z) => { const c = mk(new THREE.OctahedronGeometry(1, 0), pick([0xffe27a, 0xb08aff]), { emissive: 0xffe27a, ei: 0.5, noOutline: true }); c.position.set(x, rnd(4, 14), z); c.userData.ph = rnd(0, 6); group.add(c); upd.push((t) => { c.rotation.y = t + c.userData.ph; c.position.y += Math.sin(t * 1.5 + c.userData.ph) * 0.004; }); });
      upd.push((t, dt, P) => { if (Math.random() < dt * 25) { const a = rnd(0, 6.28), r = rnd(0, R + 12); P.emit({ x: Math.cos(a) * r, y: rnd(0.2, 3), z: Math.sin(a) * r, vx: 0, vy: rnd(0.5, 1.8), vz: 0, color: pick([0xffe27a, 0xb08aff, 0xffffff]), life: rnd(2, 4), size: rnd(0.15, 0.35), drag: 0 }); } });
    } else {
      ringPos(10, R + 5, R + 20, (x, z) => {
        const h = rnd(18, 34), p = mk(new THREE.BoxGeometry(3.2, h, 3.2), 0x1c1c28); p.position.set(x, h / 2, z); group.add(p);
        for (let k = 0; k < 4; k++) { const b = mk(new THREE.BoxGeometry(3.3, 0.25, 3.3), 0xff3a3a, { emissive: 0xff3a3a, ei: 0.9, noOutline: true }); b.position.set(x, 3 + k * 6, z); group.add(b); }
      });
      const rings = [];
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(14 + i * 5, 0.18, 6, 60), new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.6, fog: false })); r.position.y = 24 + i * 5; r.rotation.x = Math.PI / 2 + i * 0.12; group.add(r); rings.push(r); }
      const fl = new THREE.PointLight(0xff4a4a, 0.0, 80); fl.position.set(0, 20, 0); group.add(fl);
      let flash = 0;
      upd.push((t, dt, P) => {
        rings.forEach((r, i) => { r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });
        if (Math.random() < dt * 0.5) flash = 0.25; flash = Math.max(0, flash - dt); fl.intensity = flash * 12;
        if (Math.random() < dt * 30) { const a = rnd(0, 6.28), r = rnd(0, R + 8); P.emit({ x: Math.cos(a) * r, y: 0.2, z: Math.sin(a) * r, vx: 0, vy: rnd(1, 3), vz: 0, color: pick([0xff3a3a, 0xff8a5a, 0x8a1a2a]), life: rnd(1.5, 3), size: rnd(0.15, 0.35), drag: 0 }); }
      });
    }
    // 周囲の山のシルエット
    if (idx !== 1 && idx !== 5) ringPos(14, 55, 75, (x, z) => { const h = rnd(10, 26), m = mk(new THREE.ConeGeometry(rnd(10, 18), h, 6), idx === 4 ? 0x2a2050 : idx === 2 ? 0x2a5a82 : 0x6a8a7a, { noOutline: true }); m.position.set(x, h / 2 - 1, z); group.add(m); });

    return { group, sc, update(t, dt, P) { upd.forEach(f => f(t, dt, P)); }, floorTex: floorTexture(sc) };
  }

  // ---------- 魔法陣・槍・衝撃の星 ----------
  let runeTexCache = null;
  function runeTex() {
    if (runeTexCache) return runeTexCache;
    runeTexCache = canvasTex(512, 512, (g) => {
      g.translate(256, 256); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.lineCap = 'round';
      const ring = (r, lw, a) => { g.globalAlpha = a; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
      ring(246, 6, 1); ring(228, 2, 0.8); ring(176, 4, 1); ring(150, 2, 0.7); ring(96, 3, 0.9);
      g.lineWidth = 2; g.globalAlpha = 0.9;
      for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 228, Math.sin(a) * 228); g.lineTo(Math.cos(a) * (i % 4 ? 238 : 246), Math.sin(a) * (i % 4 ? 238 : 246)); g.stroke(); }
      // 文字のような印
      for (let i = 0; i < 16; i++) {
        g.save(); g.rotate(i / 16 * Math.PI * 2); g.translate(202, 0); g.lineWidth = 3; g.globalAlpha = 0.95; g.beginPath();
        const k = i % 4;
        if (k === 0) { g.moveTo(-10, -12); g.lineTo(10, 0); g.lineTo(-10, 12); g.moveTo(-10, 0); g.lineTo(10, 0); }
        else if (k === 1) { g.moveTo(0, -13); g.lineTo(0, 13); g.moveTo(-9, -4); g.lineTo(9, -4); g.moveTo(-9, 6); g.lineTo(9, 6); }
        else if (k === 2) { g.arc(0, 0, 9, 0, Math.PI * 2); g.moveTo(0, -13); g.lineTo(0, 13); }
        else { g.moveTo(-10, 10); g.lineTo(0, -12); g.lineTo(10, 10); g.closePath(); }
        g.stroke(); g.restore();
      }
      // 六芒星と五芒星
      g.globalAlpha = 0.95; g.lineWidth = 4;
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + k * Math.PI / 3 * 3 + i * Math.PI * 2 / 3; const x = Math.cos(a) * 170, y = Math.sin(a) * 170; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); }
      g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i * 2 % 5) * Math.PI * 2 / 5; const x = Math.cos(a) * 92, y = Math.sin(a) * 92; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.globalAlpha = 0.8; g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
    });
    return runeTexCache;
  }
  let starTexCache = null;
  function starTex() {
    if (starTexCache) return starTexCache;
    starTexCache = canvasTex(128, 128, (g) => {
      g.translate(64, 64); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8;
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 9 : (i % 4 === 0 ? 62 : 36); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); g.fill();
    });
    return starTexCache;
  }
  // 魔法陣の板（地面用はあとで寝かせる）
  function runePlane(color, opacity) {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: runeTex(), color, transparent: true, opacity: opacity === undefined ? 0.9 : opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  // 槍：+z 向き。len=全長
  function spearMesh(color, len, rad) {
    const g = new THREE.Group();
    const add = (geo, col, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(m); return m; };
    const shaft = add(new THREE.CylinderGeometry(rad * 0.45, rad * 0.45, len * 0.62, 8), color, 0.85); shaft.rotation.x = Math.PI / 2; shaft.position.z = -len * 0.12;
    const tip = add(new THREE.ConeGeometry(rad * 1.5, len * 0.42, 8), color, 0.95); tip.rotation.x = Math.PI / 2; tip.position.z = len * 0.4;
    const core = add(new THREE.ConeGeometry(rad * 0.7, len * 0.4, 6), 0xffffff, 1); core.rotation.x = Math.PI / 2; core.position.z = len * 0.42;
    const cs = add(new THREE.CylinderGeometry(rad * 0.18, rad * 0.18, len * 0.9, 6), 0xffffff, 0.9); cs.rotation.x = Math.PI / 2; cs.position.z = -len * 0.05;
    for (let i = 0; i < 3; i++) { const f = add(new THREE.BoxGeometry(rad * 0.15, rad * 2.2, len * 0.2), color, 0.7); f.position.z = -len * 0.42; f.rotation.z = i * Math.PI / 3; }
    const gl = glowSprite(color, len * 1.2, 0.85); gl.position.z = len * 0.3; g.add(gl);
    return g;
  }
  // 三日月の刃：+z 向きに進む
  function crescentMesh(color, size) {
    const g = new THREE.Group();
    const mk = (r0, r1, col, op) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 20, 1, -Math.PI * 0.42, Math.PI * 0.84), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.PI / 2; g.add(m); return m; };
    mk(size * 0.55, size, color, 0.9); mk(size * 0.82, size * 0.97, 0xffffff, 1);
    g.rotation.z = 0; g.userData.crescent = true;
    return g;
  }

  const pick = a => a[(Math.random() * a.length) | 0];

  return { runeTex, starTex, runePlane, spearMesh, crescentMesh, Particles, buildModel, pose, buildScenery, SCENES, ELEM_FX, glowTex, glowSprite, toon, rgb, canvasTex, rnd, pick };
})();
