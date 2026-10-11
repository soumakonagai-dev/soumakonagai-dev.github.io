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

  // ---------- モンスターモデル（関節つき）----------
  // def: { type, elem, color }  type: sword=ドラゴン / fist=ゴリラ / mage=クラゲ / archer=小鳥 / heavy=ゴーレム / dual=キツネ
  // 関節: 肩・肘・手首（指）、股・膝・足首、首、あご、しっぽや触手のつなぎ目、まぶた。
  function buildModel(def) {
    const ec = ELEM[def.elem].c;
    const main = new THREE.Color(def.color), dark = main.clone().multiplyScalar(0.55), light = main.clone().lerp(new THREE.Color(0xffffff), 0.55);
    const mats = [], sway = [], eyeList = [], fingerList = [], tails = [];
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
    const glowTip = (parent, color, size, x, y, z) => { const g = glowSprite(color, size, 0.9); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; };
    const eyes = (head, y, z, sx, r, col) => {
      for (const s of [-1, 1]) {
        const e = ball(r, col || 0x1a1a2a, { noOutline: true }); e.scale.set(0.9, 1.25, 0.5); head.add(at(e, s * sx, y, z));
        eyeList.push({ mesh: e, sy: 1.25 });
        const h = ball(r * 0.35, 0xffffff, { noOutline: true, emissive: 0xffffff }); head.add(at(h, s * sx + r * 0.3, y + r * 0.45, z + r * 0.4));
      }
    };
    // 関節つきの手足。上の骨 → 関節の玉 → 下の骨 → 手首/足首。lower が膝・肘で曲がる
    const limb = (parent, x, y, z, upLen, loLen, thick, upCol, loCol, o = {}) => {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      const blocky = o.blocky;
      const up = blocky ? box(thick * 2, upLen, thick * 2, upCol, { ol: 1.06 }) : cyl(thick, thick * 0.82, upLen, upCol, { seg: 8 });
      up.position.y = -upLen / 2; g.add(up);
      const jt = blocky ? part(new THREE.DodecahedronGeometry(thick * 1.25, 0), o.jointCol || dark) : ball(thick * 1.08, o.jointCol || upCol); jt.position.y = -upLen; g.add(jt);
      const lower = new THREE.Group(); lower.position.y = -upLen; g.add(lower);
      const lo = blocky ? box(thick * 1.8, loLen, thick * 1.8, loCol, { ol: 1.06 }) : cyl(thick * 0.8, thick * 0.6, loLen, loCol, { seg: 8 });
      lo.position.y = -loLen / 2; lower.add(lo);
      const hand = new THREE.Group(); hand.position.y = -loLen; lower.add(hand);   // 手首・足首
      return { arm: g, lower, hand };
    };
    // 指・つめ（曲がる）
    const fingers = (hand, n, len, r, color, spread, y, z, claw) => {
      for (let i = 0; i < n; i++) {
        const fg = new THREE.Group(); fg.position.set((i - (n - 1) / 2) * spread, y, z); hand.add(fg);
        const a = cyl(r, r * 0.8, len, color, { seg: 6, noOutline: r < 0.04 }); a.position.y = -len / 2; fg.add(a);
        const jt = ball(r * 0.95, color, { noOutline: true }); jt.position.y = -len; fg.add(jt);
        const tip = new THREE.Group(); tip.position.y = -len; fg.add(tip);
        const b = claw ? cone(r * 0.9, len * 1.1, 0xf2e6c8, { seg: 5, noOutline: true }) : cyl(r * 0.8, r * 0.55, len * 0.8, color, { seg: 6, noOutline: r < 0.04 });
        b.position.y = claw ? -len * 0.5 : -len * 0.4; if (claw) b.rotation.x = Math.PI; tip.add(b);
        fingerList.push({ g: fg, tip });
      }
    };
    const root = new THREE.Group(), upper = new THREE.Group(); upper.position.y = 0.8; root.add(upper);
    const head = new THREE.Group(); upper.add(head);
    const t = def.type;
    let armL, armR, legL, legR, cape = null, float = 0, quad = false, jaw = null, pulse = null;
    const limbs = {};
    const orbs = [];
    const tailChain = (parent, x, y, z, sizes, col1, col2, tipCol, amp, sp, ph) => {
      let par = parent;
      sizes.forEach((r, i) => {
        const g = new THREE.Group(); g.position.set(i ? 0 : x, i ? 0.02 : y, i ? -sizes[i - 1] * 1.7 : z); par.add(g);
        const b = ball(r, i % 2 ? col1 : col2); b.position.z = -r * 0.5; g.add(b);
        if (i) { const jt = ball(r * 0.6, col2, { noOutline: true }); jt.position.z = r * 0.3; g.add(jt); }
        swayOf(g, 'y', amp, sp, (ph || 0) + i * 0.6); if (!i) tails.push(g); par = g;
        if (i === sizes.length - 1 && tipCol) { const tp = ball(r * 0.9, tipCol, { emissive: tipCol, ei: 0.9, noOutline: true }); g.add(at(tp, 0, 0, -r * 1.6)); glowTip(g, tipCol, 1.2, 0, 0, -r * 1.6); }
      });
    };

    if (t === 'sword') {            // ほのおのドラゴン（四足歩行）
      quad = true; upper.position.y = 0.74;
      const chest = ball(0.46, main, { scale: [0.9, 0.86, 1.05] }); upper.add(at(chest, 0, 0, 0.38));
      const hip = ball(0.44, main, { scale: [0.88, 0.84, 1.0] }); upper.add(at(hip, 0, -0.01, -0.4));
      const waist = ball(0.3, dark, { scale: [1, 0.9, 1.2] }); upper.add(at(waist, 0, -0.04, 0));
      const belly = ball(0.4, light, { noOutline: true, scale: [0.72, 0.5, 1.3] }); upper.add(at(belly, 0, -0.2, 0.0));
      for (let i = 0; i < 7; i++) { const sp = cone(0.09 - i * 0.006, 0.28 - i * 0.02, ec, { emissive: ec, ei: 0.35 }); sp.rotation.x = -0.5; upper.add(at(sp, 0, 0.4 - Math.abs(i - 3) * 0.02, 0.74 - i * 0.22)); }
      // 首（2つの骨と関節）
      const n1 = cyl(0.22, 0.2, 0.34, main); n1.rotation.x = 0.55; upper.add(at(n1, 0, 0.32, 0.78));
      upper.add(at(ball(0.2, dark, { noOutline: true }), 0, 0.46, 0.93));
      const n2 = cyl(0.19, 0.17, 0.3, main); n2.rotation.x = 0.95; upper.add(at(n2, 0, 0.58, 1.04));
      head.position.set(0, 0.68, 1.14);
      head.add(ball(0.33, main, { scale: [1.0, 0.88, 1.1] }));
      head.add(at(box(0.26, 0.1, 0.34, main.clone().lerp(new THREE.Color(0xffe0b0), 0.35), { ol: 1.1 }), 0, -0.02, 0.34));
      jaw = new THREE.Group(); jaw.position.set(0, -0.1, 0.08); head.add(jaw);
      jaw.add(at(box(0.22, 0.07, 0.3, dark, { ol: 1.1 }), 0, -0.03, 0.22));
      for (const sd of [-1, 1]) {
        jaw.add(at(cone(0.02, 0.07, 0xf8f0e0, { noOutline: true, seg: 4 }), sd * 0.08, 0.02, 0.34));
        head.add(at(cone(0.02, 0.07, 0xf8f0e0, { noOutline: true, seg: 4 }), sd * 0.09, -0.1, 0.45));
        head.add(at(ball(0.026, 0x222222, { noOutline: true }), sd * 0.06, 0.02, 0.52));
        const horn = cone(0.06, 0.38, 0xf2e6c8, { seg: 6 }); horn.rotation.x = -0.9; horn.rotation.z = -sd * 0.25; head.add(at(horn, sd * 0.17, 0.3, -0.14));
        const ey = ball(0.075, 0xffe040, { emissive: 0xffe040, ei: 0.5, noOutline: true }); ey.scale.set(1, 1, 0.8); head.add(at(ey, sd * 0.17, 0.08, 0.2)); eyeList.push({ mesh: ey, sy: 1 });
        head.add(at(box(0.025, 0.1, 0.02, 0x222222, { noOutline: true }), sd * 0.17, 0.08, 0.27));
        const ear = cone(0.05, 0.2, ec, { emissive: ec, ei: 0.4, seg: 4 }); ear.rotation.z = -sd * 1.2; head.add(at(ear, sd * 0.3, 0.08, -0.02)); swayOf(ear, 'y', 0.25, 3, sd);
      }
      const hl = cone(0.06, 0.2, ec, { emissive: ec, ei: 0.6 }); hl.rotation.x = -0.5; head.add(at(hl, 0, 0.34, 0));
      // 翼（肩 → ひじ → 先）
      for (const sd of [-1, 1]) {
        const wg = new THREE.Group(); wg.position.set(sd * 0.3, 0.38, 0.2); upper.add(wg);
        const bone1 = cyl(0.04, 0.035, 0.5, dark, { seg: 5 }); bone1.rotation.z = Math.PI / 2; wg.add(at(bone1, sd * 0.25, 0.1, 0));
        const m1 = cone(0.28, 0.7, dark, { seg: 3, ol: 1.05 }); m1.scale.z = 0.16; m1.rotation.z = -sd * 1.05; wg.add(at(m1, sd * 0.3, 0.3, 0));
        const el = new THREE.Group(); el.position.set(sd * 0.5, 0.1, 0); wg.add(el); wg.add(at(ball(0.06, dark, { noOutline: true }), sd * 0.5, 0.1, 0));
        const bone2 = cyl(0.03, 0.025, 0.5, dark, { seg: 5 }); bone2.rotation.z = Math.PI / 2 - sd * 0.5; el.add(at(bone2, sd * 0.22, 0.12, 0));
        const m2 = cone(0.2, 0.62, ec, { seg: 3, emissive: ec, ei: 0.3, noOutline: true }); m2.scale.z = 0.12; m2.rotation.z = -sd * 1.05; el.add(at(m2, sd * 0.22, 0.28, 0.02));
        swayOf(wg, 'z', 0.2, 4, sd); swayOf(el, 'z', 0.3 * sd, 4, sd + 1.2);
      }
      tailChain(upper, 0, -0.02, -0.84, [0.3, 0.26, 0.22, 0.18, 0.14, 0.1], main, dark, 0xff9a2a, 0.3, 3, 0);
      // 前脚（肩 → ひじ → 手首 → 指とつめ）、後脚（もも → ひざ → 足首 → つま先）
      const fl = (s) => {
        const L = limb(upper, s * 0.34, -0.12, 0.55, 0.3, 0.3, 0.13, main, main, { jointCol: dark });
        L.hand.add(at(box(0.24, 0.1, 0.26, dark), 0, -0.02, 0.06)); fingers(L.hand, 3, 0.1, 0.035, dark, 0.08, -0.04, 0.2, true); return L;
      };
      const hl2 = (s) => {
        const L = limb(root, s * 0.34, 0.66, -0.5, 0.3, 0.3, 0.16, main, main, { jointCol: dark });
        const foot = new THREE.Group(); L.hand.add(foot); L.foot = foot;
        foot.add(at(box(0.26, 0.1, 0.3, dark), 0, -0.02, 0.1)); fingers(foot, 3, 0.1, 0.035, dark, 0.08, -0.04, 0.24, true); return L;
      };
      const fL = fl(-1), fR = fl(1), hL = hl2(-1), hR = hl2(1);
      armL = fL.arm; armR = fR.arm; legL = hL.arm; legR = hR.arm;
      limbs.armL = fL; limbs.armR = fR; limbs.legL = hL; limbs.legR = hR;
    } else if (t === 'dual') {      // ふたつ尾のキツネ（四足歩行）
      quad = true; upper.position.y = 0.7;
      const chest = ball(0.4, main, { scale: [0.82, 0.8, 1.05] }); upper.add(at(chest, 0, 0, 0.38));
      const hip = ball(0.38, main, { scale: [0.8, 0.78, 1.0] }); upper.add(at(hip, 0, -0.01, -0.4));
      upper.add(at(ball(0.26, dark, { scale: [1, 0.9, 1.2] }), 0, -0.03, 0));
      upper.add(at(ball(0.34, light, { noOutline: true, scale: [0.7, 0.5, 1.3] }), 0, -0.16, 0));
      const ruff = cone(0.3, 0.45, light, { seg: 8 }); ruff.rotation.x = Math.PI / 2 + 0.2; upper.add(at(ruff, 0, 0.0, 0.72));
      const gem = ball(0.07, ec, { emissive: ec, ei: 1, noOutline: true }); upper.add(at(gem, 0, 0.12, 0.98)); glowTip(upper, ec, 0.8, 0, 0.12, 1.0);
      const n1 = cyl(0.19, 0.17, 0.3, main); n1.rotation.x = 0.6; upper.add(at(n1, 0, 0.3, 0.8));
      upper.add(at(ball(0.17, dark, { noOutline: true }), 0, 0.42, 0.93));
      const n2 = cyl(0.16, 0.15, 0.26, main); n2.rotation.x = 0.9; upper.add(at(n2, 0, 0.52, 1.04));
      head.position.set(0, 0.62, 1.12);
      head.add(ball(0.3, main, { scale: [1.1, 0.92, 1] }));
      const snout = cone(0.12, 0.34, light, { seg: 8 }); snout.rotation.x = Math.PI / 2; head.add(at(snout, 0, -0.04, 0.36));
      jaw = new THREE.Group(); jaw.position.set(0, -0.1, 0.1); head.add(jaw);
      const jw = cone(0.09, 0.28, light, { seg: 6, noOutline: true }); jw.rotation.x = Math.PI / 2; jaw.add(at(jw, 0, -0.01, 0.2));
      head.add(at(ball(0.04, 0x222222, { noOutline: true }), 0, -0.02, 0.54));
      eyes(head, 0.06, 0.25, 0.15, 0.075);
      for (const sd of [-1, 1]) {
        const ear = new THREE.Group(); ear.position.set(sd * 0.2, 0.3, -0.04); head.add(ear);
        const e1 = cone(0.12, 0.46, main, { seg: 4 }); e1.rotation.z = -sd * 0.25; ear.add(at(e1, 0, 0.1, 0));
        const e2 = cone(0.07, 0.3, sd > 0 ? 0xf0e6ff : 0x3a2a5a, { noOutline: true, seg: 4 }); e2.rotation.z = -sd * 0.25; ear.add(at(e2, 0, 0.09, 0.03));
        swayOf(ear, 'x', 0.18, 2.4, sd);
        const ck = cone(0.08, 0.18, light, { noOutline: true, seg: 4 }); ck.rotation.z = sd * 1.4; head.add(at(ck, sd * 0.32, -0.07, 0.08));
        head.add(at(ball(0.05, ec, { emissive: ec, ei: 0.6, noOutline: true }), sd * 0.13, 0.24, 0.24));
      }
      tailChain(upper, -0.14, 0.12, -0.7, [0.24, 0.22, 0.2, 0.17, 0.14, 0.1], 0xf4f0ff, 0xdcd4f0, 0xffe27a, 0.4, 2.5, 0);
      tailChain(upper, 0.14, 0.12, -0.7, [0.24, 0.22, 0.2, 0.17, 0.14, 0.1], 0x3a2a5a, 0x2a1e44, 0x8a5ad6, -0.4, 2.5, 1.5);
      const sock = 0x2a2238;
      const fl = (s) => {
        const L = limb(upper, s * 0.27, -0.12, 0.55, 0.26, 0.28, 0.1, main, sock, { jointCol: main });
        L.hand.add(at(box(0.18, 0.1, 0.24, sock), 0, -0.02, 0.05)); fingers(L.hand, 3, 0.07, 0.025, sock, 0.06, -0.04, 0.16, false); return L;
      };
      const hl2 = (s) => {
        const L = limb(root, s * 0.27, 0.62, -0.5, 0.28, 0.28, 0.12, main, sock, { jointCol: main });
        const foot = new THREE.Group(); L.hand.add(foot); L.foot = foot;
        foot.add(at(box(0.2, 0.1, 0.26, sock), 0, -0.02, 0.07)); fingers(foot, 3, 0.07, 0.025, sock, 0.06, -0.04, 0.18, false); return L;
      };
      const fL = fl(-1), fR = fl(1), hL = hl2(-1), hR = hl2(1);
      armL = fL.arm; armR = fR.arm; legL = hL.arm; legR = hR.arm;
      limbs.armL = fL; limbs.armR = fR; limbs.legL = hL; limbs.legR = hR;
      for (let i = 0; i < 3; i++) { const o = glowSprite(i % 2 ? 0x8a5ad6 : 0xffe27a, 0.7, 0.9); o.userData.ph = i * 2.1; root.add(o); orbs.push(o); }
    } else if (t === 'mage') {      // ふわふわクラゲ
      float = 0.4;
      head.position.set(0, 0.95, 0);
      pulse = new THREE.Group(); head.add(pulse);
      pulse.add(at(part(new THREE.SphereGeometry(0.7, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), main, { transparent: true, opacity: 0.88 }), 0, -0.1, 0));
      pulse.add(at(ball(0.4, light, { noOutline: true, transparent: true, opacity: 0.7 }), 0, 0.1, 0));
      const core = ball(0.16, ec, { emissive: ec, ei: 1, noOutline: true }); pulse.add(at(core, 0, 0.35, -0.1)); glowTip(pulse, ec, 1.6, 0, 0.35, -0.1);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; pulse.add(at(ball(0.07, ec, { emissive: ec, ei: 0.7, noOutline: true }), Math.cos(a) * 0.5, 0.18 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.5)); }
      eyes(pulse, 0.0, 0.58, 0.2, 0.09);
      for (const s of [-1, 1]) pulse.add(at(ball(0.07, 0xff9ab8, { noOutline: true, scale: [1.3, 0.6, 0.3] }), s * 0.34, -0.1, 0.55));
      const star = cone(0.12, 0.3, 0xffe27a, { emissive: 0xffe27a, ei: 0.7, noOutline: true, seg: 5 }); head.add(at(star, 0, 0.7, 0)); swayOf(star, 'z', 0.15, 2, 0);
      for (let i = 0; i < 8; i++) {   // 触手：3つに分かれて、関節ごとに揺れる
        const a = i / 8 * Math.PI * 2; let par = upper; const base = new THREE.Group(); base.position.set(Math.cos(a) * 0.42, 0.55, Math.sin(a) * 0.42); upper.add(base); par = base;
        const lens = [0.34 + (i % 3) * 0.08, 0.3, 0.26];
        lens.forEach((len, k) => {
          const g = new THREE.Group(); g.position.y = k ? -lens[k - 1] : 0; par.add(g);
          const tn = cyl(0.07 - k * 0.018, 0.05 - k * 0.015, len, i % 2 ? light : main, { seg: 6, transparent: true, opacity: 0.85 }); tn.position.y = -len / 2; g.add(tn);
          g.add(at(ball(0.06 - k * 0.015, ec, { emissive: ec, ei: 0.5, noOutline: true }), 0, -len, 0));
          swayOf(g, i % 2 ? 'x' : 'z', 0.28, 2.2, i + k * 0.8); par = g;
        });
      }
      const mk = s => {
        const L = limb(upper, s * 0.55, 0.55, 0, 0.3, 0.28, 0.07, light, light, { jointCol: ec });
        L.hand.add(ball(0.12, ec, { emissive: ec, ei: 0.8, noOutline: true })); glowTip(L.hand, ec, 0.9);
        fingers(L.hand, 3, 0.07, 0.022, ec, 0.06, -0.06, 0.04, false); return L;
      };
      const aL = mk(-1), aR = mk(1);
      armL = aL.arm; armR = aR.arm; limbs.armL = aL; limbs.armR = aR;
      const ln = new THREE.Group(); legL = ln; legR = new THREE.Group(); legL.visible = legR.visible = false; root.add(legL); root.add(legR);
    } else if (t === 'heavy') {     // いわのゴーレム
      const rock = new THREE.Color(0x8a7f78).lerp(main, 0.45).multiplyScalar(0.62);
      upper.scale.setScalar(1.08);
      upper.add(at(box(0.7, 0.4, 0.62, dark, { ol: 1.05 }), 0, 0.06, 0));           // 腰
      upper.add(at(part(new THREE.DodecahedronGeometry(0.2, 0), rock), 0, 0.3, 0));  // 腰の関節
      const chestB = box(1.0, 0.7, 0.8, rock, { ol: 1.05 }); upper.add(at(chestB, 0, 0.7, 0));
      const chest = box(0.55, 0.42, 0.2, ec, { emissive: ec, ei: 0.7, noOutline: true }); upper.add(at(chest, 0, 0.74, 0.4)); glowTip(upper, ec, 0.9, 0, 0.74, 0.5);
      for (let i = 0; i < 3; i++) { const cr = box(0.05, 0.5, 0.05, ec, { emissive: ec, ei: 0.9, noOutline: true }); cr.rotation.z = (i - 1) * 0.5; upper.add(at(cr, (i - 1) * 0.3, 0.5, 0.41)); }
      for (let i = 0; i < 5; i++) { const cs = cone(0.1, 0.4 + (i % 2) * 0.2, ec, { emissive: ec, ei: 0.5, seg: 5 }); cs.rotation.x = -2.3; upper.add(at(cs, (i - 2) * 0.2, 1.1, -0.42)); }
      for (let i = 0; i < 4; i++) upper.add(at(ball(0.15, 0x4a8a3a, { noOutline: true, scale: [1.2, 0.5, 1] }), (Math.random() - 0.5) * 0.7, 1.07, (Math.random() - 0.5) * 0.6));
      upper.add(at(box(0.26, 0.16, 0.26, dark), 0, 1.1, 0));                          // 首
      head.position.set(0, 1.4, 0.1);
      head.add(box(0.62, 0.5, 0.55, rock, { ol: 1.07 }));
      for (const s of [-1, 1]) { const ey = box(0.14, 0.08, 0.05, ec, { emissive: ec, ei: 1, noOutline: true }); head.add(at(ey, s * 0.14, 0.04, 0.29)); eyeList.push({ mesh: ey, sy: 1 }); }
      head.add(at(box(0.5, 0.07, 0.1, dark, { noOutline: true }), 0, 0.14, 0.28));
      jaw = new THREE.Group(); jaw.position.set(0, -0.2, 0.12); head.add(jaw); jaw.add(at(box(0.4, 0.1, 0.3, dark), 0, -0.04, 0.12));
      const mk = s => {
        upper.add(at(part(new THREE.DodecahedronGeometry(0.34, 0), rock), s * 0.68, 1.05, 0));
        const L = limb(upper, s * 0.72, 0.98, 0, 0.36, 0.34, 0.15, rock, rock, { blocky: true, jointCol: dark });
        L.hand.add(at(box(0.48, 0.28, 0.42, rock, { ol: 1.07 }), 0, -0.1, 0));
        L.hand.add(at(box(0.5, 0.05, 0.44, ec, { emissive: ec, ei: 0.5, noOutline: true }), 0, 0.04, 0));
        fingers(L.hand, 3, 0.14, 0.07, dark, 0.15, -0.26, 0.12, false); return L;
      };
      const aL = mk(-1), aR = mk(1); armL = aL.arm; armR = aR.arm; limbs.armL = aL; limbs.armR = aR;
      const ml = s => {
        const L = limb(root, s * 0.28, 0.8, 0, 0.34, 0.34, 0.16, rock, rock, { blocky: true, jointCol: dark });
        const foot = new THREE.Group(); L.hand.add(foot); L.foot = foot;
        foot.add(at(box(0.45, 0.2, 0.56, dark), 0, -0.04, 0.06)); return L;
      };
      const lL = ml(-1), lR = ml(1); legL = lL.arm; legR = lR.arm; limbs.legL = lL; limbs.legR = lR;
    } else if (t === 'archer') {    // かぜの小鳥
      upper.add(at(ball(0.34, dark, { noOutline: false, scale: [0.9, 0.9, 0.9] }), 0, 0.12, 0));   // 腰
      upper.add(at(ball(0.5, main, { scale: [0.95, 1.05, 0.95] }), 0, 0.55, 0));
      upper.add(at(ball(0.4, light, { noOutline: true, scale: [0.85, 1, 0.55] }), 0, 0.46, 0.28));
      upper.add(at(cyl(0.14, 0.17, 0.24, main), 0, 1.0, 0.04));                      // 首
      head.position.set(0, 1.28, 0.1);
      head.add(ball(0.36, main));
      head.add(at(cone(0.12, 0.28, 0xffb030, { seg: 5 }), 0, 0.02, 0.4)); head.children[1].rotation.x = Math.PI / 2;
      jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.2); head.add(jaw);
      const lb = cone(0.09, 0.2, 0xe89a20, { seg: 5, noOutline: true }); lb.rotation.x = Math.PI / 2; jaw.add(at(lb, 0, -0.02, 0.14));
      eyes(head, 0.1, 0.3, 0.16, 0.09);
      for (const s of [-1, 1]) head.add(at(ball(0.06, 0xff9a9a, { noOutline: true, scale: [1.3, 0.6, 0.3] }), s * 0.26, -0.05, 0.26));
      for (let i = 0; i < 3; i++) { const f = cone(0.07, 0.4 - i * 0.04, ec, { emissive: ec, ei: 0.4, seg: 4 }); f.rotation.z = (i - 1) * 0.45; f.rotation.x = -0.3; head.add(at(f, (i - 1) * 0.1, 0.42, -0.05)); swayOf(f, 'x', 0.15, 3, i); }
      for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.set((i - 1) * 0.18, 0.3, -0.5); upper.add(g); const f = cone(0.1, 0.8, i === 1 ? ec : dark, { emissive: i === 1 ? ec : 0, ei: 0.3, seg: 4 }); f.rotation.x = -2.0; f.rotation.z = (i - 1) * 0.4; g.add(at(f, 0, 0, -0.1)); swayOf(g, 'x', 0.12, 3, i); }
      const mkWing = s => {   // 肩 → ひじ → 手首（羽根）
        const a = new THREE.Group(); a.position.set(s * 0.46, 0.85, 0); upper.add(a);
        a.add(at(cyl(0.07, 0.06, 0.3, main, { seg: 6 }), s * 0.1, -0.05, 0)).rotation.z = 0;
        a.children[0].rotation.z = s * Math.PI / 2 * 0.8;
        const lower = new THREE.Group(); lower.position.set(s * 0.26, -0.05, 0); a.add(lower); lower.add(at(ball(0.08, dark, { noOutline: true }), 0, 0, 0));
        for (let i = 0; i < 4; i++) { const f = box(0.14, 0.58 - i * 0.04, 0.04, i % 2 ? ec : main, { emissive: i % 2 ? ec : 0, ei: 0.25, ol: 1.1 }); f.position.set(s * (0.06 + i * 0.1), -0.3 - i * 0.02, 0); f.rotation.z = s * (0.1 + i * 0.12); lower.add(f); }
        const hand = new THREE.Group(); hand.position.y = -0.6; lower.add(hand);
        return { arm: a, lower, hand, wing: true, s };
      };
      const wL = mkWing(-1), wR = mkWing(1); armL = wL.arm; armR = wR.arm; limbs.armL = wL; limbs.armR = wR;
      const bl = s => {   // もも（羽毛の中）→ すね（ひざ）→ 足首 → 3本のつま先
        const L = limb(root, s * 0.18, 0.8, 0, 0.26, 0.5, 0.05, main, 0xffb030, { jointCol: 0xffb030 });
        const foot = new THREE.Group(); L.hand.add(foot); L.foot = foot;
        fingers(foot, 3, 0.1, 0.025, 0xffb030, 0.07, -0.02, 0.1, true); return L;
      };
      const lL = bl(-1), lR = bl(1); legL = lL.arm; legR = lR.arm; limbs.legL = lL; limbs.legR = lR;
    } else {                         // fist: ゴリラ
      const fur = main;
      upper.add(at(ball(0.34, dark, { scale: [1.1, 0.9, 0.95] }), 0, 0.1, 0));                       // 腰
      upper.add(at(ball(0.58, fur, { scale: [1.1, 1, 0.95] }), 0, 0.58, 0));                          // 胸
      upper.add(at(ball(0.4, light, { noOutline: true, scale: [1, 0.9, 0.5] }), 0, 0.6, 0.34));
      upper.add(at(cyl(0.2, 0.24, 0.2, dark), 0, 1.06, 0.04));                                      // 首
      head.position.set(0, 1.3, 0.15);
      head.add(ball(0.3, dark));
      head.add(at(ball(0.22, light, { scale: [1.1, 0.85, 0.8] }), 0, -0.07, 0.2));
      head.add(at(box(0.5, 0.1, 0.18, dark, { noOutline: true }), 0, 0.1, 0.22));
      jaw = new THREE.Group(); jaw.position.set(0, -0.14, 0.12); head.add(jaw); jaw.add(at(box(0.26, 0.07, 0.22, dark, { noOutline: true }), 0, -0.02, 0.14));
      eyes(head, 0.04, 0.27, 0.12, 0.06);
      for (const s of [-1, 1]) head.add(at(ball(0.09, light, { noOutline: true }), s * 0.3, 0.02, 0));
      head.add(at(cyl(0.31, 0.31, 0.07, ec, { emissive: ec, ei: 0.5, noOutline: true, seg: 14 }), 0, 0.2, 0));
      const mk = s => {
        upper.add(at(ball(0.2, fur, { noOutline: true }), s * 0.66, 0.98, 0));
        const L = limb(upper, s * 0.72, 0.98, 0, 0.42, 0.4, 0.14, fur, fur, { jointCol: dark });
        L.hand.add(at(ball(0.28, dark, { scale: [1, 0.9, 1] }), 0, -0.12, 0)); L.hand.add(at(ball(0.17, ec, { emissive: ec, ei: 0.45, noOutline: true }), 0, -0.12, 0.14)); glowTip(L.hand, ec, 0.9, 0, -0.12, 0.12);
        fingers(L.hand, 4, 0.1, 0.05, dark, 0.1, -0.32, 0.12, false); return L;
      };
      const aL = mk(-1), aR = mk(1); armL = aL.arm; armR = aR.arm; limbs.armL = aL; limbs.armR = aR;
      const ml = s => {
        const L = limb(root, s * 0.28, 0.8, 0, 0.34, 0.32, 0.16, dark, fur, { jointCol: dark });
        const foot = new THREE.Group(); L.hand.add(foot); L.foot = foot; foot.add(at(box(0.36, 0.18, 0.46, fur), 0, -0.03, 0.06)); fingers(foot, 3, 0.08, 0.05, dark, 0.12, -0.05, 0.28, false); return L;
      };
      const lL = ml(-1), lR = ml(1); legL = lL.arm; legR = lR.arm; limbs.legL = lL; limbs.legR = lR;
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

    return { root, upper, head, armL, armR, handL: limbs.armL.hand, handR: limbs.armR.hand, legL, legR, limbs, jaw, pulse, tails, eyeList, fingerList, seed: Math.random() * 10, cape, orbs, sway, float, quad, baseY: upper.position.y, mats, shadow, aura, guardMesh, barrier, chargeRing, type: t, ec };
  }

  // s: { moving, atk(0〜1の進行), style, stun, guard, dead, charge, buff, idleOnly }
  function pose(p, s, t) {
    const u = p.upper, wide = p.type === 'heavy';
    const GS = s.slowWalk ? 5 : 13, sw = s.moving ? Math.sin(t * GS) : 0;
    const ramp = s.atk > 0 ? Math.min(1, (1 - s.atk) * 4) : 0;
    p.raiseTail = 0;
    p.legL.rotation.x = sw * 0.8; p.legR.rotation.x = -sw * 0.8;
    u.position.y = (p.baseY || 0.8) + (s.moving ? Math.abs(Math.sin(t * GS)) * 0.07 : Math.sin(t * 2.4) * 0.02);
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
      else if (s.style === 'spin') { aR = aL = -1.5; lean = 0.15; }
      else if (s.style === 'threat') { aR = -2.3 * ramp; aL = -2.3 * ramp; lean = -0.28 * ramp; headX = -0.4 * ramp; twist = Math.sin(t * 38) * 0.04 * ramp; }
      else if (s.style === 'retreat') { aR = aL = -0.5 * ramp; lean = -0.18 * ramp; headX = 0.2 * ramp; }
      else if (s.style === 'buff') { const k = Math.sin(q * Math.PI); aR = -2.6 * k; aL = -2.6 * k; lean = -0.15 * k; }
    }
    if (s.guard) { aL = -1.3; aR = -1.3; aRz = -0.5; aLz = 0.5; lean = 0.1; }
    if (s.stun) { lean = -0.45; headX = 0.3; aR = 0.8; aL = 0.8; }
    if (p.quad) {
      const w = s.moving ? Math.sin(t * (s.slowWalk ? 4.5 : 12)) : 0;
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
        } else if (s.style === 'spin') { lean = 0.1; aR = aL = -0.8; headX = 0.1;
        } else if (s.style === 'threat') {
          if (s.kind === 'tail') { lean = -0.12 * ramp; headX = -0.25 * ramp; aR = aL = -0.2 * ramp; p.raiseTail = 1.35 * ramp; }
          else { lean = -0.6 * ramp; headX = -0.5 * ramp; aR = aL = -1.25 * ramp; p.raiseTail = 0.6 * ramp; }
          lean += Math.sin(t * 38) * 0.012 * ramp;
        } else if (s.style === 'retreat') { lean = 0.16 * ramp; headX = 0.25 * ramp; u.position.y = p.baseY - 0.09 * ramp; p.raiseTail = 0.5 * ramp; aR = aL = 0.15; }
        else if (s.style === 'buff') { const k = Math.sin(q * Math.PI); lean = -0.55 * k; aR = aL = -1.3 * k; headX = -0.3 * k; }
      }
      if (s.guard) { aL = aR = -0.5; lean = 0.12; u.position.y = p.baseY - 0.14; headX = 0.2; }
      if (s.stun) { lean = -0.3; headX = 0.4; aR = aL = 0.5; }
      p.legR.rotation.x = hR; p.legL.rotation.x = hL; aRz = 0; aLz = 0;
    }
    if (p.type === 'archer') { const fl = s.moving ? Math.sin(t * 22) * 0.7 : Math.sin(t * 3) * 0.12; const spr = s.atk > 0 ? (s.style === 'threat' ? 0.95 * ramp : 0.5) : 0; aRz = 0.35 + fl + spr; aLz = -(0.35 + fl + spr); if (!s.atk) { aR = 0; aL = 0; } }
    p.armR.rotation.set(aR, 0, aRz); p.armL.rotation.set(aL, 0, aLz);
    if (p.sway) p.sway.forEach(w => { w.o.rotation[w.axis] = Math.sin(t * w.sp * (s.moving ? 1.6 : 1) + w.ph) * w.amp; });
    // ---- 関節：肘・膝・足首・指・あご・まばたき ----
    {
      const J = p.limbs, qa = s.atk > 0 ? 1 - s.atk : 0, swing = s.atk > 0 ? Math.sin(qa * Math.PI) : 0;
      const armBend = (L, g, sd) => {
        if (!L) return;
        if (L.wing) { const fl = s.moving ? Math.sin(t * 22) : Math.sin(t * 3) * 0.12; L.lower.rotation.z = -sd * (0.25 + (s.atk > 0 ? 0.6 * swing : 0.5 * Math.abs(fl)) + (s.stun ? 0.5 : 0)); return; }
        const a = g.rotation.x;
        let b = p.quad ? 0.18 + Math.max(0, a) * 0.5 : 0.22 + (a > 0 ? a * 0.55 : -a * 0.18);
        if (s.guard) b += 0.7; if (s.stun) b += 0.3;
        L.lower.rotation.x = p.quad ? b : -b;
      };
      const legBend = (L, g) => {
        if (!L) return;
        const a = g.rotation.x, rest = p.quad ? 0.55 : p.type === 'archer' ? 0.08 : 0.12;
        let b = rest + (s.moving ? Math.max(0, a + 0.15) * 0.9 : 0);
        if (s.guard) b += 0.25;
        L.lower.rotation.x = b; if (L.foot) L.foot.rotation.x = -b * (p.quad ? 0.9 : 0.55);
      };
      if (p.tails) p.tails.forEach(g => { g.rotation.x = p.raiseTail; });
      armBend(J.armL, p.armL, -1); armBend(J.armR, p.armR, 1); legBend(J.legL, p.legL); legBend(J.legR, p.legR);
      const curl = 0.3 + 0.9 * swing + (s.guard ? 0.6 : 0) + (s.stun ? 0.4 : 0);
      p.fingerList.forEach(f => { f.g.rotation.x = -curl; f.tip.rotation.x = -curl * 0.8; });
      if (p.jaw) p.jaw.rotation.x = s.style === 'threat' && s.atk > 0 ? 0.6 * ramp * (0.8 + 0.2 * Math.sin(t * 30)) : s.atk > 0 ? swing * 0.7 : (s.stun ? 0.5 : 0.03 + 0.03 * Math.sin(t * 2 + p.seed));
      const blink = ((t * 0.8 + p.seed) % 3.6) < 0.12;
      p.eyeList.forEach(e => { e.mesh.scale.y = e.sy * (blink ? 0.1 : 1); });
      p.head.rotation.y = (!s.atk && !s.moving && !s.dead && !s.guard) ? Math.sin(t * 0.7 + p.seed) * 0.2 : 0;
      if (p.pulse) { const k = Math.sin(t * 3); const gz = 1 + (s.style === 'threat' ? 0.3 * ramp : 0); p.pulse.scale.set((1 + k * 0.04) * gz, (1 - k * 0.05) * gz, (1 + k * 0.04) * gz); }
    }
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
