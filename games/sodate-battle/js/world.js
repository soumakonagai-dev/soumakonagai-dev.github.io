// ソダテバトル: 背景（戦闘ステージの作り込み＋育成画面の3D背景）
'use strict';

(() => {
  const rnd = FX.rnd, pick = FX.pick, rgb = FX.rgb;
  const TAU = Math.PI * 2;
  const texCache = {};
  const cTex = (name, w, h, draw, rep) => {
    if (texCache[name]) return texCache[name];
    const t = FX.canvasTex(w, h, draw);
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    texCache[name] = t; return t;
  };
  const hex = c => '#' + new THREE.Color(c).getHexString();
  const speckle = (g, w, base, n, spread, size) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, w, w);
    for (let i = 0; i < n; i++) { const c = new THREE.Color(base).multiplyScalar(rnd(1 - spread, 1 + spread)); g.fillStyle = hex(c); g.globalAlpha = rnd(0.3, 0.8); g.fillRect(rnd(0, w), rnd(0, w), rnd(1, size), rnd(1, size)); }
    g.globalAlpha = 1;
  };
  const T = {
    grass: () => cTex('grass', 512, 512, (g, w) => {
      speckle(g, w, 0x4a8a40, 1800, 0.35, 10);
      for (let i = 0; i < 2600; i++) { const x = rnd(0, w), y = rnd(0, w), c = new THREE.Color(0x4a8a40).multiplyScalar(rnd(0.7, 1.5)); g.strokeStyle = hex(c); g.lineWidth = 1.2; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-3, 3), y - rnd(4, 11)); g.stroke(); }
      g.globalAlpha = 1;
    }, 26),
    lava: () => cTex('lava', 512, 512, (g, w) => {
      g.fillStyle = '#2a0e08'; g.fillRect(0, 0, w, w);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = k % 3 ? '#ff6a1a' : '#ffd04a'; g.lineWidth = rnd(3, 14); g.globalAlpha = rnd(0.5, 0.95); g.shadowColor = '#ff5a10'; g.shadowBlur = 16; g.beginPath();
        let x = rnd(0, w), y = rnd(0, w); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += rnd(-90, 90); y += rnd(-90, 90); g.lineTo(x, y); } g.stroke();
      }
      g.shadowBlur = 0; g.globalAlpha = 0.5;
      for (let i = 0; i < 160; i++) { g.fillStyle = '#1a0805'; g.beginPath(); g.arc(rnd(0, w), rnd(0, w), rnd(4, 22), 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }, 4),
    cracks: () => cTex('cracks', 512, 512, (g, w) => {
      g.clearRect(0, 0, w, w); g.translate(w / 2, w / 2); g.lineCap = 'round';
      for (let k = 0; k < 46; k++) {
        const a = rnd(0, TAU); let x = Math.cos(a) * rnd(60, 200), y = Math.sin(a) * rnd(60, 200); g.strokeStyle = k % 4 ? '#ff6a1a' : '#ffd04a'; g.lineWidth = rnd(1.5, 4); g.shadowColor = '#ff5a10'; g.shadowBlur = 10; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(x, y);
        for (let i = 0; i < 6; i++) { x += Math.cos(a + rnd(-0.8, 0.8)) * rnd(14, 40); y += Math.sin(a + rnd(-0.8, 0.8)) * rnd(14, 40); g.lineTo(x, y); } g.stroke();
      }
    }),
    water: () => cTex('water', 512, 512, (g, w) => {
      g.fillStyle = '#2a86c8'; g.fillRect(0, 0, w, w); g.strokeStyle = '#bfeeff'; g.lineCap = 'round';
      for (let i = 0; i < 220; i++) { g.globalAlpha = rnd(0.1, 0.4); g.lineWidth = rnd(1, 3); const x = rnd(0, w), y = rnd(0, w), r = rnd(8, 40); g.beginPath(); g.arc(x, y, r, rnd(0, 6), rnd(0, 6) + 1.5); g.stroke(); }
      g.globalAlpha = 1;
    }, 10),
    falls: () => cTex('falls', 64, 256, (g, w, h) => {
      g.clearRect(0, 0, 64, 256);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + rnd(0.2, 0.9) + ')'; g.fillRect(rnd(0, 60), rnd(0, 256), rnd(1, 4), rnd(20, 80)); }
    }),
    sand: () => cTex('sand', 512, 512, (g, w) => {
      speckle(g, w, 0x8c7a62, 2400, 0.3, 6);
      for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(60,40,20,.15)'; g.lineWidth = rnd(1, 3); g.beginPath(); const y = rnd(0, w); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rnd(-14, 14), w * 0.6, y + rnd(-14, 14), w, y + rnd(-10, 10)); g.stroke(); }
    }, 16),
    marble: () => cTex('marble', 512, 512, (g, w) => {
      g.fillStyle = '#2a2650'; g.fillRect(0, 0, w, w);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const c = new THREE.Color(0x4b4470).multiplyScalar(rnd(0.85, 1.2)); g.fillStyle = hex(c); g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
      g.strokeStyle = 'rgba(255,230,140,.35)'; g.lineWidth = 1;
      for (let i = 0; i < 30; i++) { g.beginPath(); let x = rnd(0, w), y = rnd(0, w); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rnd(-40, 40); y += rnd(-40, 40); g.lineTo(x, y); } g.stroke(); }
    }, 14),
    dark: () => cTex('dark', 512, 512, (g, w) => {
      g.fillStyle = '#16161e'; g.fillRect(0, 0, w, w);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const c = new THREE.Color(0x2a2a38).multiplyScalar(rnd(0.7, 1.2)); g.fillStyle = hex(c); g.fillRect(x * 64 + 3, y * 64 + 3, 58, 58); }
      g.strokeStyle = 'rgba(255,60,60,.5)'; g.shadowColor = '#ff3030'; g.shadowBlur = 8; g.lineWidth = 2;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, w); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    }, 14),
    wall: () => cTex('wall', 1024, 256, (g, w, h) => {
      g.fillStyle = '#1c1820'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { g.fillStyle = 'rgba(' + (30 + rnd(0, 30) | 0) + ',20,30,.5)'; g.fillRect(rnd(0, w), rnd(0, h), rnd(6, 40), rnd(4, 18)); }
      for (let i = 0; i < 18; i++) { const x = i * 57 + 12; g.fillStyle = '#ff3a3a'; g.shadowColor = '#ff2020'; g.shadowBlur = 14; g.fillRect(x, 70, 14, 60); g.fillRect(x + 2, 62, 10, 8); g.shadowBlur = 0; g.fillStyle = 'rgba(255,60,60,.25)'; g.fillRect(x, 180, 14, 4); }
      g.strokeStyle = 'rgba(255,60,60,.5)'; g.lineWidth = 3; g.strokeRect(0, 20, w, h - 40);
    }),
    spiral: () => cTex('spiral', 512, 512, (g, w) => {
      g.clearRect(0, 0, w, w); g.translate(w / 2, w / 2);
      for (let arm = 0; arm < 4; arm++) { g.beginPath(); for (let i = 0; i < 160; i++) { const a = i / 160 * 9 + arm * Math.PI / 2, r = i / 160 * 250; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = 'rgba(255,70,70,.7)'; g.lineWidth = 8; g.shadowColor = '#ff2a2a'; g.shadowBlur = 20; g.stroke(); }
    }),
  };

  // ---------- 空（太陽・雲・星・オーロラ・渦）のシェーダ ----------
  function makeSky(p) {
    const u = {
      top: { value: rgb(p.top).clone() }, mid: { value: rgb(p.mid).clone() }, bot: { value: rgb(p.bot).clone() },
      sunCol: { value: rgb(p.sun).clone() }, sunDir: { value: new THREE.Vector3(...p.dir) }, sunSize: { value: p.size },
      cloudCol: { value: rgb(p.cc).clone() }, auroraCol: { value: rgb(p.ac || 0x6affc8).clone() },
      time: { value: 0 }, clouds: { value: p.clouds }, stars: { value: p.stars }, aurora: { value: p.aurora }, swirl: { value: p.swirl },
    };
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
      vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: [
        'uniform vec3 top;uniform vec3 mid;uniform vec3 bot;uniform vec3 sunCol;uniform vec3 sunDir;uniform float sunSize;uniform vec3 cloudCol;uniform vec3 auroraCol;',
        'uniform float time;uniform float clouds;uniform float stars;uniform float aurora;uniform float swirl;varying vec3 vP;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}',
        'float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}',
        'void main(){',
        ' vec3 d=normalize(vP);float h=d.y;',
        ' vec3 col=mix(bot,mid,smoothstep(-0.05,0.22,h));col=mix(col,top,smoothstep(0.18,0.85,h));',
        ' float sd=max(dot(d,normalize(sunDir)),0.0);',
        ' col+=sunCol*(pow(sd,900.0)*4.0*sunSize+pow(sd,60.0)*0.55+pow(sd,6.0)*0.18);',
        ' if(clouds>0.0){vec2 uv=d.xz/(h+0.28)*1.3+vec2(time*0.012,time*0.006);float f=fbm(uv+fbm(uv*0.7));float c=smoothstep(0.48,0.85,f)*clouds*smoothstep(0.0,0.14,h);vec3 cc=cloudCol*(0.72+0.28*smoothstep(0.4,0.9,f));col=mix(col,cc+sunCol*0.18*sd,c*0.85);}',
        ' if(swirl>0.0){float ang=atan(d.z,d.x);float r=length(d.xz)/(h+0.6);float s=sin(ang*3.0+r*6.0-time*0.5)*0.5+0.5;col=mix(col,auroraCol*0.8,s*swirl*smoothstep(0.1,0.6,h)*0.5);}',
        ' if(stars>0.0){vec2 sp=d.xz/(h+0.5)*60.0;float st=hash(floor(sp));float tw=0.6+0.4*sin(time*3.0+st*40.0);float s=step(0.985,st)*tw;col+=vec3(s)*stars*smoothstep(0.05,0.3,h);}',
        ' if(aurora>0.0){float w=sin(d.x*5.0+fbm(vec2(d.x*3.0,time*0.15))*4.0+time*0.2);float band=smoothstep(0.55,0.0,abs(h-0.38-w*0.12))*smoothstep(0.1,0.3,h);col+=auroraCol*band*aurora*(0.5+0.5*fbm(vec2(d.x*6.0+time*0.1,h*8.0)));}',
        ' gl_FragColor=vec4(col,1.0);',
        '}'].join('\n'),
    }));
    mesh.renderOrder = -10;
    return { mesh, u };
  }
  const SKY = [
    { top: 0x2f7fe8, mid: 0x8ec8ff, bot: 0xe6f4ff, sun: 0xfff0c0, dir: [0.35, 0.55, -0.75], size: 1, clouds: 0.9, stars: 0, aurora: 0, swirl: 0, cc: 0xffffff },
    { top: 0x1a0505, mid: 0x7a2410, bot: 0xff7a30, sun: 0xff8a50, dir: [-0.2, 0.12, -0.95], size: 1.4, clouds: 0.85, stars: 0, aurora: 0, swirl: 0, cc: 0x4a2a24 },
    { top: 0x061a3a, mid: 0x2a6aa0, bot: 0x9ae0f0, sun: 0xdff4ff, dir: [0.5, 0.45, -0.7], size: 0.7, clouds: 0.5, stars: 0.3, aurora: 0.9, swirl: 0, cc: 0xcfeaff, ac: 0x6affc8 },
    { top: 0x4a5a8a, mid: 0xf0a070, bot: 0xffe0a0, sun: 0xffd090, dir: [-0.45, 0.16, -0.85], size: 2, clouds: 0.7, stars: 0, aurora: 0, swirl: 0, cc: 0xffe8d0 },
    { top: 0x050416, mid: 0x20105a, bot: 0x4a2a8a, sun: 0xe8e0ff, dir: [-0.35, 0.6, -0.7], size: 3, clouds: 0.3, stars: 1, aurora: 0.85, swirl: 0, cc: 0x8a78d0, ac: 0xb08aff },
    { top: 0x030304, mid: 0x30080c, bot: 0x701820, sun: 0xff5050, dir: [0, 0.7, -0.5], size: 0.5, clouds: 0.9, stars: 0.6, aurora: 0, swirl: 1, cc: 0x501418, ac: 0xff3030 },
  ];

  const tm = (geo, color, o) => { const m = new THREE.Mesh(geo, FX.toon(color, o)); m.castShadow = true; return m; };
  const additive = (color, op, o) => new THREE.MeshBasicMaterial(Object.assign({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, o || {}));
  const inst = (geo, mat, n, fn) => {
    const m = new THREE.InstancedMesh(geo, mat, n), d = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
      const c = fn(i, d); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      if (c !== undefined) m.setColorAt(i, col.set(c));
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return m;
  };
  const ringPos = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.1, 0.1), r = rnd(r0, r1); fn(Math.cos(a) * r, Math.sin(a) * r, a, i); } };

  // ---------- 戦闘ステージ ----------
  const baseBuild = FX.buildScenery;
  FX.buildScenery = function (idx, R) {
    const s = baseBuild(idx, R), g = s.group, sc = s.sc, upd = [];
    // 古い空・星を外して、新しい空に差し替え
    g.children.slice().forEach(c => { if (c.isPoints || (c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius === 120)) g.remove(c); });
    const sky = makeSky(SKY[idx]); g.add(sky.mesh);
    upd.push((t) => { sky.u.time.value = t; });
    // 外側の地面にテクスチャ
    const gr = g.children.find(c => c.geometry && c.geometry.type === 'CircleGeometry' && c.geometry.parameters.radius === 90);
    const gt = [T.grass, T.lava, T.water, T.sand, T.marble, T.dark][idx]();
    if (gr) { gr.material = new THREE.MeshStandardMaterial({ map: gt, roughness: 1, metalness: 0, color: [0xffffff, 0x886655, 0x88aacc, 0xffffff, 0xbbaadd, 0x998899][idx] }); gr.receiveShadow = true; if (idx === 1) gr.material.emissive = new THREE.Color(0x1a0a05); }
    // 闘技場の上に、ゆっくり回る魔法陣の光
    const arenaRune = FX.runePlane(sc.runes, 0.22); arenaRune.rotation.x = -Math.PI / 2; arenaRune.position.y = 0.04; arenaRune.scale.setScalar(R * 0.98); g.add(arenaRune);
    upd.push((t) => { arenaRune.rotation.z = t * 0.08; arenaRune.material.opacity = 0.16 + Math.sin(t * 1.3) * 0.06; });
    const mk = (geo, color, o) => tm(geo, color, o);
    const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

    if (idx === 0) {            // はじまりの草原
      const wm = new THREE.Group(); wm.position.set(-38, 0, -52); g.add(wm);
      wm.add(at(mk(new THREE.CylinderGeometry(2.2, 3.2, 12, 10), 0xf0e4c8), 0, 6, 0));
      wm.add(at(mk(new THREE.ConeGeometry(3.1, 3.6, 10), 0xc8483a), 0, 13.6, 0));
      wm.add(at(mk(new THREE.BoxGeometry(1.2, 2.2, 0.4), 0x6a4a2a), 0, 1.1, 3.1));
      const blades = new THREE.Group(); blades.position.set(0, 10.5, 3.4); wm.add(blades);
      for (let i = 0; i < 4; i++) { const b = new THREE.Group(); b.rotation.z = i * Math.PI / 2; const arm = mk(new THREE.BoxGeometry(0.4, 9, 0.2), 0x6a4a2a); arm.position.y = 4.5; b.add(arm); const sail = mk(new THREE.BoxGeometry(1.6, 6.5, 0.1), 0xfff4e0); sail.position.set(0.9, 5.2, 0.05); b.add(sail); blades.add(b); }
      upd.push((t) => { blades.rotation.z = t * 0.6; });
      g.add(inst(new THREE.SphereGeometry(0.17, 6, 5), FX.toon(0xffffff), 520, (i, d) => { const a = rnd(0, TAU), r = rnd(R + 1, R + 24); d.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r); d.scale.setScalar(rnd(0.7, 1.5)); return pick([0xffe27a, 0xff8ab0, 0xffffff, 0xb08aff, 0xff9a5a]); }));
      g.add(inst(new THREE.ConeGeometry(0.12, 0.8, 4), FX.toon(0xffffff), 800, (i, d) => { const a = rnd(0, TAU), r = rnd(R - 0.3, R + 26); d.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r); d.scale.set(1, rnd(0.6, 1.5), 1); d.rotation.set(rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2)); return pick([0x3e9a48, 0x58b050, 0x2e8a3c, 0x7ac05a]); }));
      for (let i = 0; i < 7; i++) { const h = mk(new THREE.SphereGeometry(rnd(14, 26), 12, 8), pick([0x4a9a50, 0x5aaa58, 0x3e8a48]), { noOutline: true }); const a = i / 7 * TAU + 0.3; h.position.set(Math.cos(a) * rnd(58, 78), -4, Math.sin(a) * rnd(58, 78)); h.scale.y = 0.4; g.add(h); }
      const lake = new THREE.Mesh(new THREE.CircleGeometry(13, 28), new THREE.MeshStandardMaterial({ map: T.water(), color: 0x88ccff, roughness: 0.1, metalness: 0.3 })); lake.rotation.x = -Math.PI / 2; lake.position.set(32, 0.03, -30); g.add(lake);
      upd.push((t) => { T.water().offset.set(t * 0.01, t * 0.006); });
      const bf = []; for (let i = 0; i < 14; i++) { const b = new THREE.Group(); const c = pick([0xffe27a, 0xff8ab0, 0x9ad8ff, 0xffffff]); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.32), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); w.position.x = sd * 0.2; w.userData.sd = sd; b.add(w); } b.userData = { a: rnd(0, TAU), r: rnd(R - 1, R + 14), sp: rnd(0.1, 0.3), ph: rnd(0, 6) }; g.add(b); bf.push(b); }
      upd.push((t) => { bf.forEach(b => { const u = b.userData, a = u.a + t * u.sp; b.position.set(Math.cos(a) * u.r, 1.3 + Math.sin(t * 1.7 + u.ph) * 0.6, Math.sin(a) * u.r); b.rotation.y = -a; b.children.forEach(w => { w.rotation.y = w.userData.sd * Math.sin(t * 20 + u.ph) * 0.9; }); }); });
      const birds = []; for (let i = 0; i < 9; i++) { const b = new THREE.Group(); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x223344, side: THREE.DoubleSide })); w.position.x = sd * 0.6; w.userData.sd = sd; b.add(w); } b.userData = { ox: i * 3.5 - 16, oy: Math.abs(i - 4) * 1.5, sp: 3.2 }; b.position.set(0, 36, -70); g.add(b); birds.push(b); }
      upd.push((t) => { birds.forEach(b => { const u = b.userData; b.position.x = ((t * u.sp + 100 + u.ox) % 200) - 100; b.position.y = 34 + u.oy + Math.sin(t * 2) * 0.6; b.position.z = -75 - u.oy; b.children.forEach(w => { w.rotation.z = w.userData.sd * Math.sin(t * 8 + u.ox) * 0.5; }); }); });
    } else if (idx === 1) {     // 炎の火山
      const lava = g.children.find(c => c.geometry && c.geometry.type === 'RingGeometry');
      if (lava) { lava.material.map = T.lava(); lava.material.color.setHex(0xffffff); lava.material.needsUpdate = true; }
      upd.push((t) => { const m = T.lava(); m.offset.set(t * 0.04, t * 0.02); if (lava) lava.material.color.setScalar(0.85 + Math.sin(t * 3) * 0.15); });
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), additive(0xffffff, 0.6, { map: T.cracks() })); crack.rotation.x = -Math.PI / 2; crack.position.y = 0.05; crack.scale.setScalar(R * 1.02); g.add(crack);
      upd.push((t) => { crack.material.opacity = 0.45 + Math.sin(t * 2.1) * 0.2; });
      const bombs = []; let nextBomb = 1;
      upd.push((t, dt, P) => {
        nextBomb -= dt;
        if (nextBomb <= 0) {
          nextBomb = rnd(1.6, 3.4);
          const s0 = FX.glowSprite(0xff7a2a, 3, 1), a = rnd(0, TAU), r = rnd(R + 3, R + 30);
          bombs.push({ s: s0, t: 0, dur: rnd(2, 2.8), tx: Math.cos(a) * r, tz: Math.sin(a) * r }); g.add(s0);
          for (let i = 0; i < 30; i++) P.emit({ x: rnd(-4, 4), y: 33, z: -62 + rnd(-3, 3), vx: rnd(-6, 6), vy: rnd(10, 22), vz: rnd(-6, 6), color: pick([0xff4a1a, 0xff9a2a, 0xffe27a]), life: 1.2, size: 0.9, drag: 0.3, grav: -8 });
        }
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i]; b.t += dt; const k = b.t / b.dur;
          b.s.position.set(b.tx * k, 33 * (1 - k) + Math.sin(k * Math.PI) * 26, -62 + (b.tz + 62) * k);
          P.emit({ x: b.s.position.x, y: b.s.position.y, z: b.s.position.z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), color: 0xff7a2a, life: 0.5, size: 0.8 });
          if (k >= 1) { for (let j = 0; j < 36; j++) { const a = rnd(0, TAU), v = rnd(2, 9); P.emit({ x: b.tx, y: 0.3, z: b.tz, vx: Math.cos(a) * v, vy: rnd(3, 12), vz: Math.sin(a) * v, color: pick([0xff4a1a, 0xffa02a, 0xffe27a]), life: 1, size: 0.7, grav: -14 }); } g.remove(b.s); bombs.splice(i, 1); }
        }
        if (Math.random() < dt * 20) P.emit({ x: rnd(-40, 40), y: rnd(20, 30), z: rnd(-45, 20), vx: rnd(-0.5, 0.5), vy: rnd(-1.8, -0.8), vz: 0, color: 0x6a5a56, life: 4, size: 0.5, drag: 0 });
      });
    } else if (idx === 2) {     // 水晶の湖
      const wt = g.children.find(c => c.material && c.material.transparent && c.geometry && c.geometry.type === 'CircleGeometry' && c.geometry.parameters.radius === 85);
      if (wt) { wt.material.map = T.water(); wt.material.color.setHex(0xaaddff); wt.material.needsUpdate = true; }
      upd.push((t) => { T.water().offset.set(t * 0.018, t * 0.011); });
      const sun = FX.glowSprite(0xdff4ff, 26, 0.35); sun.position.set(30, 0.5, -70); g.add(sun);
      for (let i = 0; i < 5; i++) {
        const isl = new THREE.Group(), a = i / 5 * TAU + 0.4, r = rnd(40, 58); isl.position.set(Math.cos(a) * r, rnd(13, 24), Math.sin(a) * r); g.add(isl);
        const rock = mk(new THREE.ConeGeometry(4.2, 7, 7), 0x5a6a80); rock.rotation.x = Math.PI; rock.position.y = -3.5; isl.add(rock);
        isl.add(at(mk(new THREE.CylinderGeometry(4.4, 4.2, 0.7, 10), 0x58a860), 0, 0.1, 0));
        for (let k = 0; k < 3; k++) { const tr = mk(new THREE.ConeGeometry(0.9, 2.2, 6), 0x3e9a58); tr.position.set(rnd(-2.4, 2.4), 1.5, rnd(-2.4, 2.4)); isl.add(tr); }
        for (let k = 0; k < 3; k++) { const c = mk(new THREE.OctahedronGeometry(1, 0), 0x9ae8ff, { emissive: 0x2a9ad8, ei: 0.7, noOutline: true }); c.scale.set(0.5, rnd(1.2, 2.4), 0.5); c.position.set(rnd(-2.6, 2.6), 1.5, rnd(-2.6, 2.6)); isl.add(c); }
        const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 26), additive(0xffffff, 0.55, { map: T.falls() })); fall.position.set(3.4, -13, 0); fall.rotation.y = a; isl.add(fall);
        isl.userData = { y0: isl.position.y, ph: rnd(0, 6) };
        upd.push((t) => { isl.position.y = isl.userData.y0 + Math.sin(t * 0.6 + isl.userData.ph) * 0.8; isl.rotation.y = Math.sin(t * 0.2 + isl.userData.ph) * 0.1; });
      }
      upd.push((t) => { T.falls().offset.y = -t * 1.4; });
      g.add(inst(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 44, (i, d) => { const a = rnd(0, TAU), r = rnd(R + 2, R + 22); d.position.set(Math.cos(a) * r, -0.05, Math.sin(a) * r); d.scale.set(1, 0.5, 1); return pick([0xff9ad8, 0xffe0f8, 0xbfa0ff]); }));
      upd.push((t, dt, P) => { if (Math.random() < dt * 14) { const a = rnd(0, TAU), r = rnd(R - 4, R + 22); P.emit({ x: Math.cos(a) * r, y: rnd(0.5, 3), z: Math.sin(a) * r, vx: rnd(-0.4, 0.4), vy: rnd(-0.1, 0.4), vz: rnd(-0.4, 0.4), color: pick([0xfff6a0, 0x9affd8]), life: rnd(2.5, 4), size: 0.22, drag: 0.2 }); } });
    } else if (idx === 3) {     // 嵐の峡谷
      const arch = new THREE.Group(); arch.position.set(-34, 0, -62); g.add(arch);
      for (const sd of [-1, 1]) arch.add(at(mk(new THREE.BoxGeometry(5, 24, 5), 0xa07a52), sd * 10, 12, 0));
      const top = mk(new THREE.TorusGeometry(10, 2.6, 8, 20, Math.PI), 0xb0885a); top.position.y = 24; arch.add(top);
      const bridge = new THREE.Group(); g.add(bridge);
      const p0 = new THREE.Vector3(-54, 17, -40), p1 = new THREE.Vector3(-18, 17, -58);
      bridge.add(inst(new THREE.BoxGeometry(1.8, 0.16, 0.8), FX.toon(0x7a5a3a), 30, (i, d) => { const k = i / 29; d.position.set(p0.x + (p1.x - p0.x) * k, p0.y - Math.sin(k * Math.PI) * 2 + 0, p0.z + (p1.z - p0.z) * k); d.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z) + Math.PI / 2; }));
      const eg = []; for (let i = 0; i < 3; i++) { const e = new THREE.Group(); const bd = mk(new THREE.ConeGeometry(0.5, 2, 6), 0x4a3a2a); bd.rotation.x = Math.PI / 2; e.add(bd); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({ color: 0x3a2a1a, side: THREE.DoubleSide })); w.position.x = sd * 1.4; w.userData.sd = sd; e.add(w); } e.userData = { r: rnd(34, 52), h: rnd(20, 30), sp: rnd(0.12, 0.2), a0: rnd(0, TAU) }; g.add(e); eg.push(e); }
      upd.push((t) => { eg.forEach(e => { const u = e.userData, a = u.a0 + t * u.sp; e.position.set(Math.cos(a) * u.r, u.h + Math.sin(t) * 1.2, Math.sin(a) * u.r); e.rotation.y = -a + Math.PI; e.rotation.z = 0.25; e.children.forEach(w => { if (w.userData.sd) w.rotation.z = w.userData.sd * Math.sin(t * 3 + u.a0) * 0.35; }); }); });
      const devils = [[-22, 30], [26, -34]];
      upd.push((t, dt, P) => { devils.forEach(([x, z], k) => { for (let i = 0; i < 3; i++) { const h = rnd(0, 9), a = t * 4 + h * 0.8 + k, r = 0.8 + h * 0.3; P.emit({ x: x + Math.cos(a) * r, y: h, z: z + Math.sin(a) * r, vx: 0, vy: 1, vz: 0, color: 0xd8c0a0, life: 0.6, size: 0.7, grow: 1 }); } }); });
    } else if (idx === 4) {     // 星の神殿
      [[R + 2, 0.25, 0xcfc8e8], [R + 4.5, 0.55, 0xb8b0d8], [R + 7, 0.85, 0xa098c8]].forEach(([r, y, c], i) => { const st = mk(new THREE.CylinderGeometry(r, r + 0.3, 0.3 + i * 0.1, 56), c, { noOutline: true }); st.position.y = -y; st.receiveShadow = true; g.add(st); });
      ringPos(8, R + 6, R + 6.4, (x, z, a) => { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = -a + Math.PI / 2; s.add(at(mk(new THREE.BoxGeometry(1.4, 0.8, 1.4), 0xcfc8e8), 0, 0.4, 0)); s.add(at(mk(new THREE.BoxGeometry(0.9, 2.6, 0.7), 0xe0d8f4), 0, 2.1, 0)); s.add(at(mk(new THREE.SphereGeometry(0.42, 10, 8), 0xe8e0fa), 0, 3.8, 0)); const e = mk(new THREE.BoxGeometry(0.5, 0.1, 0.1), 0xffe27a, { emissive: 0xffe27a, ei: 1, noOutline: true }); e.position.set(0, 3.85, 0.38); s.add(e); g.add(s); });
      const ruins = new THREE.Group(); g.add(ruins);
      for (let i = 0; i < 8; i++) {
        const f = new THREE.Group(), a = i / 8 * TAU, r = rnd(26, 42); f.position.set(Math.cos(a) * r, rnd(8, 20), Math.sin(a) * r);
        f.add(mk(new THREE.CylinderGeometry(2.6, 2, 0.7, 7), 0xc8c0e0));
        const c1 = mk(new THREE.CylinderGeometry(0.5, 0.6, rnd(2, 5), 8), 0xe0d8f4); c1.position.set(rnd(-1, 1), 2, rnd(-1, 1)); f.add(c1);
        const gl = FX.glowSprite(0xb08aff, 5, 0.5); gl.position.y = -1.5; f.add(gl);
        f.userData = { y0: f.position.y, ph: rnd(0, 6) }; ruins.add(f);
        upd.push((t) => { f.position.y = f.userData.y0 + Math.sin(t * 0.7 + f.userData.ph) * 0.9; f.rotation.y = t * 0.1 + f.userData.ph; });
      }
      upd.push((t) => { ruins.rotation.y = t * 0.03; });
      const lines = new THREE.Group(); g.add(lines);
      for (let k = 0; k < 5; k++) {
        const base = rnd(0, TAU), el = rnd(0.35, 0.9), pts = [];
        for (let i = 0; i < 6; i++) { const a = base + i * 0.12 + rnd(-0.04, 0.04), e = el + rnd(-0.12, 0.12); pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(e) * 105, Math.sin(e) * 105, Math.sin(a) * Math.cos(e) * 105)); }
        const lg = new THREE.BufferGeometry().setFromPoints(pts);
        lines.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xcfc0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, fog: false })));
        pts.forEach(p => { const s = FX.glowSprite(0xffffff, 5, 0.9); s.position.copy(p); s.material.fog = false; lines.add(s); });
      }
      upd.push((t) => { lines.children.forEach((c, i) => { if (c.isLine) c.material.opacity = 0.35 + Math.sin(t * 1.5 + i) * 0.2; }); });
      for (let i = 0; i < 6; i++) { const a = rnd(0, TAU), r = rnd(30, 48); const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 70, 12, 1, true), additive(0xffe27a, 0.18)); pl.position.set(Math.cos(a) * r, 35, Math.sin(a) * r); pl.userData.ph = rnd(0, 6); g.add(pl); upd.push((t) => { pl.material.opacity = 0.12 + Math.sin(t * 1.2 + pl.userData.ph) * 0.07; }); }
      upd.push((t, dt, P) => { if (Math.random() < dt * 16) P.emit({ x: rnd(-30, 30), y: rnd(14, 24), z: rnd(-30, 30), vx: rnd(-0.6, 0.6), vy: rnd(-1.4, -0.6), vz: rnd(-0.6, 0.6), color: pick([0xffe27a, 0xd8a0ff, 0xffffff]), life: 5, size: 0.3, drag: 0 }); });
    } else {                    // チャンピオンの塔
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 24, R + 24, 22, 56, 1, true), new THREE.MeshStandardMaterial({ map: T.wall(), side: THREE.BackSide, roughness: 1, emissive: 0x220606, emissiveMap: T.wall(), emissiveIntensity: 0.9 })); wall.position.y = 11; g.add(wall);
      T.wall().wrapS = THREE.RepeatWrapping; T.wall().repeat.set(3, 1);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 24, 0.5, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff3a3a })); rim.rotation.x = Math.PI / 2; rim.position.y = 22; g.add(rim);
      ringPos(10, R + 23.3, R + 23.3, (x, z, a) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 11), new THREE.MeshToonMaterial({ color: 0x8a1420, side: THREE.DoubleSide })); b.position.set(x, 12, z); b.rotation.y = -a - Math.PI / 2; g.add(b); const em = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), additive(0xffcf4a, 0.9)); em.position.set(x * 0.985, 14, z * 0.985); em.rotation.y = -a - Math.PI / 2; g.add(em); });
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.8, r = FX.runePlane(0xff3030, 0.5); r.scale.setScalar(7); r.position.set(Math.cos(a) * (R + 23.5), 10, Math.sin(a) * (R + 23.5)); r.rotation.y = -a - Math.PI / 2; r.userData.ph = i; g.add(r); upd.push((t) => { r.rotation.z = t * 0.2; r.material.opacity = 0.35 + Math.sin(t * 2 + r.userData.ph) * 0.15; }); }
      const vortex = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), additive(0xff4040, 0.55, { map: T.spiral(), fog: false })); vortex.rotation.x = Math.PI / 2; vortex.position.y = 58; g.add(vortex);
      upd.push((t) => { vortex.rotation.z = t * 0.12; });
      const bolts = []; let nextBolt = 2;
      upd.push((t, dt) => {
        nextBolt -= dt;
        if (nextBolt <= 0 && !bolts.length) {
          nextBolt = rnd(2.5, 5); const a = rnd(0, TAU), r = rnd(R + 4, R + 18), pts = []; let x = Math.cos(a) * r, z = Math.sin(a) * r;
          for (let y = 58; y >= 0; y -= 4) { pts.push(new THREE.Vector3(x + rnd(-1.6, 1.6), y, z + rnd(-1.6, 1.6))); }
          const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd0d0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending })); g.add(ln); bolts.push({ ln, life: 0.35 });
        }
        for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.life -= dt; b.ln.material.opacity = Math.max(0, b.life / 0.35) * (Math.random() < 0.5 ? 1 : 0.4); if (b.life <= 0) { g.remove(b.ln); b.ln.geometry.dispose(); bolts.splice(i, 1); } }
      });
    }
    return { group: g, sc, floorTex: s.floorTex, update(t, dt, P) { upd.forEach(f => f(t, dt, P)); const o = s.update; o && o(t, dt, P); } };
  };
  FX.TEX = T; FX.makeSky = makeSky; FX.inst = inst; FX.SKYS = SKY;
})();
