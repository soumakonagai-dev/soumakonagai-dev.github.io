'use strict';
// ====== 冒険：山・分かれ道・洞窟・ひみつの儀式・魔物（スライム）・属性の戦い ======
const Adventure = (function () {
  const OX = 3000, ZEND = -198;
  const NAMES = ['mountain', 'cave_ice', 'cave_fire', 'cave_secret'];
  const CAVES = {
    cave_ice: { ox: 4000, theme: 'ice', label: '氷の洞窟', boss: 'crystal', fogc: 0x16324a, mouth: [OX - 34, -98], mobs: [['frost', 10], ['hikari', 3], ['fizz', 3]] },
    cave_fire: { ox: 5000, theme: 'fire', label: '火の洞窟', boss: 'magma', fogc: 0x3a1408, mouth: [OX + 34, -98], mobs: [['flame', 10], ['puni', 3], ['fizz', 3]] },
    cave_secret: { ox: 6000, theme: 'secret', label: 'ひみつの洞窟', boss: 'phantom', fogc: 0x1c0f33, mouth: [OX - 20, -206], mobs: [['shade', 10], ['volt', 6]] },
  };
  const RITUAL = ['thunder', 'water', 'fire'];   // 三つの石柱をたたく順番（石板に書いてある）
  const PILLAR_COL = { fire: 0xff4a3a, water: 0x3a8aff, thunder: 0xffe03a };
  let T, A, cur = null, area = null, group = null, weaponGrp = null, weaponId = null, slash = null, spring = null, motes = [];
  const R = {};                       // 場所ごと { area, group, ... }
  let monsters = [], orbs = [], pops = [], rings = [], boss = null, paths = [];
  let pillars = [], pillarProg = 0, secretWall = null;
  const st = { active: false, atkT: 0, atkDur: 0.3, cd: 0, hitDone: true, inv: 0, trip: {}, regen: 0, tint: 0, kills: 0 };
  const isAdv = n => NAMES.includes(n);
  const pathX = z => OX + 9 * Math.sin(z * 0.045);
  const rr = (a, b) => a + Math.random() * (b - a);
  const hexC = h => new T.Color(h);
  const weapon = () => WEAPONS.find(w => w.id === (S && S.weapon)) || WEAPONS[0];
  const segDist = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; let t = l2 ? ((px - a[0]) * dx + (pz - a[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz)); };
  const nearPath = (x, z, w) => paths.some(p => { for (let i = 0; i < p.length - 1; i++) if (segDist(x, z, p[i], p[i + 1]) < w) return true; return false; });

  function fog(name) {
    if (name === 'mountain') return { c: 0x2c5a3c, k: 0.3 + st.tint * 0.4, near: 22, far: 100 - st.tint * 30, light: 1, lamp: 0 };
    const c = CAVES[name]; return c ? { c: c.fogc, k: 0.82, near: 6, far: 46, light: 0.14, lamp: 1.25 } : null;
  }

  // =============== 山をつくる ===============
  function drawPath(pts, width) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), pg = new T.Group();
      pg.position.set((a[0] + b[0]) / 2, 0.04, (a[1] + b[1]) / 2); pg.rotation.y = Math.atan2(dx, dz);
      const p = new T.Mesh(new T.PlaneGeometry(width, len + 2.2), A.m(0xb99b6c, { roughness: 1 })); p.rotation.x = -Math.PI / 2; p.receiveShadow = true; pg.add(p); group.add(pg);
    }
  }
  function mouth(x, z, label, target, spawn, hide) {   // ほらあなの入口
    for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI, s = rr(1.6, 2.4), r = new T.Mesh(new T.DodecahedronGeometry(1, 0), A.m(i % 2 ? 0x6e7680 : 0x8d949b)); r.scale.set(s, s * rr(1.0, 1.5), s); r.position.set(x + Math.cos(a) * 3.4, s * 0.8, z - 0.6 + Math.sin(a) * 2.4); r.castShadow = r.receiveShadow = true; group.add(r); }
    const dark = new T.Mesh(new T.PlaneGeometry(5, 4.2), new T.MeshBasicMaterial({ color: 0x05050a })); dark.position.set(x, 2.1, z - 0.2); group.add(dark);
    A.sign(label, 4.4, 0.9, '#fff8e8', '#3b2a1c', group, x, 5.0, z + 0.9, 0);
    area.obst.push({ x0: x - 5.4, x1: x - 2.6, z0: z - 3, z1: z + 0.2 }, { x0: x + 2.6, x1: x + 5.4, z0: z - 3, z1: z + 0.2 }, { x0: x - 2.6, x1: x + 2.6, z0: z - 3, z1: z - 1 });
    const h = A.addHot(area, x, z + 3.4, 3.2, () => `${label}に入る`, () => A.go(target, spawn), 3); if (hide) h.hide = hide; return h;
  }

  function buildMountain() {
    area = A.newArea('mountain', [OX - 46, OX + 46, -226, 14], false); group = area.group; R.mountain = { area, group };
    area.cam = { pitch: 0.5, dist: 13 }; area.spawn = { x: OX, z: -4, rot: Math.PI };
    const main = []; for (let z = 14; z >= -200; z -= 8) main.push([pathX(z), z]);
    paths = [main,
      [[pathX(-62), -62], [OX - 12, -70], [OX - 22, -84], [OX - 31, -94]],      // 左：氷の洞窟
      [[pathX(-62), -62], [OX + 12, -70], [OX + 22, -84], [OX + 31, -94]],      // 右：火の洞窟
      [[pathX(-130), -130], [OX - 14, -136], [OX - 25, -142]],                  // 左：古い石柱
      [[pathX(-130), -130], [OX + 14, -146], [OX + 25, -150]],                  // 右：祭壇
      [[OX - 6, -198], [OX - 14, -203], [OX - 18, -206]]];                      // ひみつの入口へ
    const gt = A.canvasTex(256, (g, s) => { g.fillStyle = '#4f9a58'; g.fillRect(0, 0, s, s); for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(40,110,60,.55)' : 'rgba(130,200,110,.35)'; g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 2 + Math.random() * 6); } }, 70, 120);
    const ground = new T.Mesh(new T.PlaneGeometry(150, 270), new T.MeshStandardMaterial({ map: gt, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(OX, 0, -105); ground.receiveShadow = true; group.add(ground);
    paths.forEach((p, i) => drawPath(p, i === 0 ? 6.4 : 4.4));
    const N = 320, trunk = new T.InstancedMesh(new T.CylinderGeometry(0.22, 0.32, 1.8, 7), A.m(0x7a5233), N), f1 = new T.InstancedMesh(new T.ConeGeometry(1.6, 3.4, 8), new T.MeshStandardMaterial({ roughness: 0.9 }), N), f2 = new T.InstancedMesh(new T.ConeGeometry(1.15, 2.6, 8), new T.MeshStandardMaterial({ roughness: 0.9 }), N);
    const dm = new T.Object3D(); let n = 0;
    const clear = (x, z, r) => [[OX - 30, -142], [OX + 30, -150], [OX - 34, -98], [OX + 34, -98], [OX - 20, -206], [OX, ZEND], [OX, -62]].some(c => Math.hypot(x - c[0], z - c[1]) < r);
    for (let i = 0; i < 3000 && n < N; i++) {
      const z = rr(-220, 10), x = OX + rr(-45, 45);
      if (nearPath(x, z, 4.6) || (z > -9 && Math.abs(x - OX) < 9) || clear(x, z, 11) || (z < -184 && z > -214 && Math.abs(x - OX) < 15)) continue;
      const s = rr(0.8, 1.6), depth = clamp(-z / 200, 0, 1), col = new T.Color().setHSL(0.36 - 0.06 * depth, 0.55, 0.3 - 0.1 * depth + rr(-0.03, 0.03));
      dm.rotation.set(0, rr(0, 6), 0); dm.scale.set(s, s, s);
      dm.position.set(x, 0.9 * s, z); dm.updateMatrix(); trunk.setMatrixAt(n, dm.matrix);
      dm.position.set(x, 3.1 * s, z); dm.updateMatrix(); f1.setMatrixAt(n, dm.matrix); f1.setColorAt(n, col);
      dm.position.set(x, 5.0 * s, z); dm.updateMatrix(); f2.setMatrixAt(n, dm.matrix); f2.setColorAt(n, col.clone().offsetHSL(0, 0, 0.04));
      area.obst.push({ c: true, x, z, r: 0.55 * s }); n++;
    }
    trunk.count = f1.count = f2.count = n; for (const o of [trunk, f1, f2]) { o.castShadow = true; o.receiveShadow = true; group.add(o); }
    for (let i = 0, k = 0; i < 600 && k < 46; i++) {
      const z = rr(-210, 8), x = OX + rr(-44, 44); if (nearPath(x, z, 3.6) || clear(x, z, 9) || (z > -9 && Math.abs(x - OX) < 9)) continue;
      const s = rr(0.6, 1.8), r = new T.Mesh(new T.DodecahedronGeometry(1, 0), A.m(0x8d949b)); r.scale.set(s, s * 0.7, s); r.position.set(x, 0.4 * s, z); r.rotation.y = rr(0, 6); r.castShadow = r.receiveShadow = true; group.add(r); area.obst.push({ c: true, x, z, r: 0.9 * s }); k++;
    }
    const mush = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff }), 70); let mk = 0;
    for (let i = 0; i < 600 && mk < 70; i++) { const z = rr(-200, -100), x = OX + rr(-44, 44); if (nearPath(x, z, 3)) continue; dm.position.set(x, 0.2, z); dm.scale.set(0.28, 0.2, 0.28); dm.rotation.set(0, 0, 0); dm.updateMatrix(); mush.setMatrixAt(mk, dm.matrix); mush.setColorAt(mk, new T.Color().setHSL(rr(0.5, 0.85), 1, 0.65)); mk++; }
    mush.count = mk; group.add(mush);
    const fl = new T.InstancedMesh(new T.SphereGeometry(1, 6, 5), new T.MeshStandardMaterial({ roughness: 0.6 }), 200); let fk = 0;
    for (let i = 0; i < 1500 && fk < 200; i++) { const z = rr(-120, 8), x = OX + rr(-44, 44); if (nearPath(x, z, 2.6)) continue; dm.position.set(x, 0.12, z); dm.scale.setScalar(rr(0.1, 0.16)); dm.updateMatrix(); fl.setMatrixAt(fk, dm.matrix); fl.setColorAt(fk, new T.Color([0xff6b8a, 0xffd23f, 0xffffff, 0xb28aff][fk % 4])); fk++; }
    fl.count = fk; group.add(fl);
    for (const [px, pz, pr] of [[-26, -40, 6], [30, -95, 6], [-30, -165, 6]]) { const p = new T.Mesh(new T.CircleGeometry(pr, 24), new T.MeshStandardMaterial({ color: 0x6fc4ff, roughness: 0.1, metalness: 0.2 })); p.rotation.x = -Math.PI / 2; p.position.set(OX + px, 0.06, pz); group.add(p); }
    for (let i = 0; i < 26; i++) { const sx = i < 13 ? -1 : 1, hh = 22 + (i * 31 % 9) * 4, h = new T.Mesh(new T.ConeGeometry(16, hh, 6), A.m(i % 3 ? 0x5a8f66 : 0x7e8a96)); h.position.set(OX + sx * (62 + (i % 4) * 5), hh / 2 - 1, -(i % 13) * 19 + 6); group.add(h); }
    for (let i = 0; i < 6; i++) { const h = new T.Mesh(new T.ConeGeometry(26, 55 + i * 4, 6), A.m(0x7e8a96)); h.position.set(OX - 60 + i * 24, 26, -246); group.add(h); }
    for (const sx of [-1, 1]) A.rbox(1.2, 5, 1.2, 0.45, 0x8a8f96, OX + sx * 4, 2.5, 8.5, group);
    A.rbox(9.2, 1, 1.4, 0.4, 0x9aa0a8, OX, 5.2, 8.5, group);
    A.sign('やまの いりぐち', 5, 0.9, '#fff8e8', '#3b2a1c', group, OX, 5.2, 7.75, 0);
    area.obst.push({ x0: OX - 4.7, x1: OX - 3.3, z0: 7.8, z1: 9.2 }, { x0: OX + 3.3, x1: OX + 4.7, z0: 7.8, z1: 9.2 });
    A.addHot(area, OX, 3.6, 3, () => 'ふもとの町にもどる', () => A.go('town'), 3);
    const sign = (x, z, text) => { A.box(0.2, 2, 0.2, 0x7a5233, x, 1, z, group); A.sign(text, 3.8, 1.1, '#fff8e8', '#3b2a1c', group, x, 2.2, z + 0.12, 0); };
    sign(pathX(-6) + 4.2, -6, 'やまの なか ←スライムが でるよ'); sign(pathX(-68) + 4.2, -68, 'ここから つよい スライム');
    sign(pathX(-52) - 4.5, -52, '←氷の洞窟　　火の洞窟→'); sign(pathX(-124) + 4.2, -124, '←古い石柱　　祭壇→');
    sign(pathX(-136) + 4.2, -136, 'おくは ヌシの なわばり'); sign(pathX(-186) + 4.2, -186, 'ひでんの いずみ →');
    mouth(OX - 34, -98, '氷の洞窟', 'cave_ice', { x: OX - 34, z: -89, rot: 0 });
    mouth(OX + 34, -98, '火の洞窟', 'cave_fire', { x: OX + 34, z: -89, rot: 0 });
    secretWall = A.rbox(7, 6.5, 2.2, 0.8, 0x7d848c, OX - 20, 3.2, -206, group);
    mouth(OX - 20, -208, 'ひみつの洞窟', 'cave_secret', { x: OX - 20, z: -199, rot: 0 }, () => !S.flags.secretOpen);
    // 古い石柱（三つの色）
    const pc = [OX - 30, -142];
    A.rbox(7, 0.3, 7, 0.1, 0x9aa0a8, pc[0], 0.12, pc[1], group);
    ['fire', 'water', 'thunder'].forEach((el, i) => {
      const a = -0.9 + i * 0.9, x = pc[0] + Math.sin(a) * 3.4, z = pc[1] + 1.6 - Math.cos(a) * 3.0;
      const body = new T.Mesh(new T.CylinderGeometry(0.55, 0.65, 3.2, 10), A.m(0x8f969e)); body.position.set(x, 1.7, z); body.castShadow = true; group.add(body);
      const rune = new T.Mesh(new T.CylinderGeometry(0.58, 0.58, 0.5, 10), new T.MeshStandardMaterial({ color: PILLAR_COL[el], emissive: PILLAR_COL[el], emissiveIntensity: 0.15 })); rune.position.set(x, 2.3, z); group.add(rune);
      area.obst.push({ c: true, x, z, r: 0.8 }); pillars.push({ el, x, z, rune, lit: false });
    });
    A.addHot(area, pc[0], pc[1] + 2, 3.5, () => '古い石柱（色のついた石を武器でたたこう）', () => UI.toast('三つの石柱がある。色のついた石を、武器でたたけそうだ。順番がだいじらしい…（祭壇の石板を読もう）'), 3);
    const ac = [OX + 30, -150];
    A.rbox(7, 0.3, 7, 0.1, 0x9aa0a8, ac[0], 0.12, ac[1], group); A.rbox(3, 1.1, 1.6, 0.3, 0x8f969e, ac[0], 0.7, ac[1], group); area.obst.push({ x0: ac[0] - 1.6, x1: ac[0] + 1.6, z0: ac[1] - 1, z1: ac[1] + 1 });
    [0xff6a2a, 0x8fe0ff, 0xffee55].forEach((c, i) => { const o = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 })); o.position.set(ac[0] - 0.9 + i * 0.9, 1.5, ac[1]); group.add(o); });
    A.rbox(2.4, 3, 0.5, 0.2, 0x7d848c, ac[0] + 4, 1.5, ac[1] - 1, group); A.sign('石板', 1.6, 0.6, '#d8d4c8', '#3b2a1c', group, ac[0] + 4, 2.7, ac[1] - 0.72, 0);
    area.obst.push({ x0: ac[0] + 2.8, x1: ac[0] + 5.2, z0: ac[1] - 1.4, z1: ac[1] - 0.4 });
    A.addHot(area, ac[0] + 4, ac[1] + 1, 3, () => '古い石板を読む', () => UI.toast('石板：「いなずまは水をよび、水はほのおをしずめる」　⚡→💧→🔥　（石柱を、この順にたたけ）'), 3);
    A.addHot(area, ac[0], ac[1] + 2.4, 3, () => 'ささげものをする（炎・氷・雷のエキス）', () => altar(), 3);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; A.rbox(1.4, 1.6 + (i % 3) * 0.5, 1.2, 0.35, 0x9aa0a8, OX + Math.cos(a) * 7, 0.9, ZEND + Math.sin(a) * 7, group); }
    spring = new T.Mesh(new T.CylinderGeometry(5, 5, 0.12, 32), new T.MeshStandardMaterial({ color: 0x7fffe8, emissive: 0x33ddbb, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, roughness: 0.1 })); spring.position.set(OX, 0.08, ZEND); group.add(spring);
    const sl = new T.PointLight(0x7fffe0, 1.6, 26); sl.position.set(OX, 2.5, ZEND); group.add(sl);
    for (let i = 0; i < 10; i++) { const mt = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshBasicMaterial({ color: i % 2 ? 0xffe27a : 0x9ffff0 })); mt.userData = { a: i * 0.63, r: 1.5 + (i % 4) * 0.9, y: 1 + (i % 3) * 0.7 }; group.add(mt); motes.push(mt); }
    slash = new T.Mesh(new T.RingGeometry(1, 2, 24, 1, 0, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false })); slash.rotation.x = -Math.PI / 2; slash.position.y = 0.9; slash.visible = false; group.add(slash);
  }

  // =============== 洞窟をつくる ===============
  function buildCave(name) {
    const c = CAVES[name], ox = c.ox, th = c.theme;
    const a = A.newArea(name, [ox - 24, ox + 24, -88, 10], false); const g = a.group; R[name] = { area: a, group: g, chest: null };
    a.cam = { pitch: 0.55, dist: 11 }; a.spawn = { x: ox, z: 3, rot: Math.PI };
    const base = { ice: ['#aac8e0', 'rgba(255,255,255,.35)', 'rgba(90,150,200,.3)'], fire: ['#3a2a28', 'rgba(255,110,40,.25)', 'rgba(0,0,0,.4)'], secret: ['#2c2440', 'rgba(170,120,255,.25)', 'rgba(0,0,0,.4)'] }[th];
    const gt = A.canvasTex(256, (cx, s) => { cx.fillStyle = base[0]; cx.fillRect(0, 0, s, s); for (let i = 0; i < 1800; i++) { cx.fillStyle = Math.random() < 0.5 ? base[1] : base[2]; cx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, 2 + Math.random() * 5); } }, 18, 30);
    const fl = new T.Mesh(new T.PlaneGeometry(54, 104), new T.MeshStandardMaterial({ map: gt, roughness: th === 'ice' ? 0.25 : 0.9 })); fl.rotation.x = -Math.PI / 2; fl.position.set(ox, 0, -39); fl.receiveShadow = true; g.add(fl);
    const wallM = A.m(th === 'ice' ? 0x4d6e8a : th === 'fire' ? 0x2a1a16 : 0x241c38, { roughness: 1 });
    for (let i = 0; i < 60; i++) { const side = i % 2 ? 1 : -1, z = 10 - (i >> 1) * 3.3, s = rr(2.4, 4.2), r = new T.Mesh(new T.DodecahedronGeometry(1, 0), wallM); r.scale.set(s, rr(3, 6), s); r.position.set(ox + side * (24.5 + rr(0, 1.5)), 2, z); r.rotation.y = rr(0, 6); g.add(r); }
    for (let i = 0; i < 9; i++) { const r = new T.Mesh(new T.DodecahedronGeometry(1, 0), wallM); r.scale.set(rr(3, 5), rr(4, 7), rr(3, 4)); r.position.set(ox + (i - 4) * 5.4, 2, -89.5); const r2 = r.clone(); r2.position.set(ox + (i - 4) * 5.4, 2, -89.5); g.add(r); }
    const colr = { ice: 0x9fe8ff, fire: 0xff6a2a, secret: 0xb08cff }[th];
    for (let i = 0, k = 0; i < 400 && k < 34; i++) {
      const x = ox + rr(-21, 21), z = rr(-82, 2); if (Math.abs(x - ox) < 3 && z > -8) continue; if (z < -66 && Math.abs(x - ox) < 12) continue;
      const s = rr(0.8, 1.7), cone = new T.Mesh(new T.ConeGeometry(0.8 * s, 3.2 * s, 7), A.m(th === 'ice' ? 0xcfeaff : th === 'fire' ? 0x4a3a34 : 0x3a3058, { roughness: 0.8 })); cone.position.set(x, 1.6 * s, z); cone.castShadow = true; g.add(cone); a.obst.push({ c: true, x, z, r: 0.7 * s }); k++;
    }
    for (let i = 0; i < 16; i++) { const x = ox + rr(-22, 22), z = rr(-84, 4), s = rr(0.6, 1.4), cr = new T.Mesh(new T.OctahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: colr, emissive: colr, emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.9 })); cr.scale.set(0.5 * s, 1.4 * s, 0.5 * s); cr.position.set(x, 1.2 * s, z); cr.rotation.y = rr(0, 3); g.add(cr); }
    for (const z of [-6, -38, -70]) { const l = new T.PointLight(colr, 1.4, 24); l.position.set(ox + (z === -38 ? 6 : -6), 3.5, z); g.add(l); }
    if (th === 'fire') { a.lava = []; for (const [lx, lz, lr] of [[-12, -22, 4.5], [10, -34, 5], [-8, -52, 4], [12, -60, 4.5]]) { const lv = new T.Mesh(new T.CircleGeometry(lr, 24), new T.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff4a10, emissiveIntensity: 1.2 })); lv.rotation.x = -Math.PI / 2; lv.position.set(ox + lx, 0.07, lz); g.add(lv); a.lava.push({ x: ox + lx, z: lz, r: lr - 0.3 }); } }
    if (th === 'secret') for (let i = 0; i < 6; i++) { const rn = new T.Mesh(new T.RingGeometry(1.4, 1.8, 24), new T.MeshBasicMaterial({ color: 0xc8a0ff, side: T.DoubleSide })); rn.rotation.x = -Math.PI / 2; rn.position.set(ox + rr(-14, 14), 0.06, -14 - i * 11); g.add(rn); }
    A.sign(c.label, 5, 0.9, '#fff8e8', '#3b2a1c', g, ox, 4.2, 9.4, Math.PI);
    A.addHot(a, ox, 6, 3, () => '洞窟の外に出る', () => A.go('mountain', { x: c.mouth[0], z: c.mouth[1] + 8.5, rot: 0 }), 3);
    const chest = new T.Group(); chest.position.set(ox, 0, -80); chest.visible = false; g.add(chest);
    A.rbox(2, 1.1, 1.3, 0.2, 0x8a5a2a, 0, 0.55, 0, chest); A.rbox(2.1, 0.6, 1.4, 0.25, 0xffd23f, 0, 1.3, 0, chest, { metalness: 0.5 }); const gl = new T.PointLight(0xffe27a, 1.5, 12); gl.position.y = 2; chest.add(gl);
    R[name].chest = chest; R[name].chestOpen = false;
    const h = A.addHot(a, ox, -77.6, 3, () => 'たからばこを開ける', () => openChest(name), 3); h.hide = () => !chest.visible || R[name].chestOpen;
  }

  function openChest(name) {
    const r = R[name]; if (r.chestOpen) return; r.chestOpen = true; sfx('ok');
    const th = CAVES[name].theme, lines = [], add = (id, q) => { if (giveItem(id, q)) { lines.push(`${ITEMS[id].name}×${q}`); st.trip[id] = (st.trip[id] || 0) + q; } };
    if (th === 'ice') { add('extract_ice', 3 + ((Math.random() * 3) | 0)); add('extract_normal', 4); add('extract_fizz', 2); S.money += 1500; lines.push('¥1,500'); }
    else if (th === 'fire') { add('extract_fire', 3 + ((Math.random() * 3) | 0)); add('extract_normal', 4); add('extract_puni', 2); S.money += 1500; lines.push('¥1,500'); }
    else { add('extract_thunder', 4); add('extract_secret', 1); add('extract_mochi', 2); S.money += 4000; lines.push('¥4,000'); if (!S.weapons.legend) { S.weapons.legend = true; S.weapon = 'legend'; refreshWeapon(); lines.push('⚔ 伝説の剣「エクスカリスライム」'); UI.toast('✨ 伝説の剣 エクスカリスライム を手に入れた！ そうびした！', 'good'); } }
    UI.toast('🎁 宝箱：' + lines.join('、'), 'good'); r.chest.children.forEach(o => { if (o.isPointLight) o.intensity = 0.2; });
  }
  function altar() {
    const need = ['extract_fire', 'extract_ice', 'extract_thunder'];
    if (S.flags.altar) return UI.toast('祭壇は、しずかに光っている。もう力はもらった。');
    if (!need.every(id => (S.bag[id] || 0) >= 1)) return UI.toast('祭壇に三つのくぼみがある。「炎・氷・雷」のエキスをささげられそうだ…', 'bad');
    need.forEach(id => { S.bag[id] -= 1; if (S.bag[id] <= 0) delete S.bag[id]; });
    S.flags.altar = true; S.maxHp += 50; S.hp = S.maxHp; giveItem('extract_secret', 1); giveItem('extract_mochi', 2); sfx('ok');
    UI.toast('🌟 祭壇が光りかがやいた！ 最大HP+50、「秘伝のスライムエキス」と「もちもちエキス」を授かった！', 'good');
  }
  function pillarHit(p) {
    if (S.flags.secretOpen) return;
    if (p.el === RITUAL[pillarProg]) {
      pillarProg++; p.lit = true; p.rune.material.emissiveIntensity = 1.6; sfx('ok');
      if (pillarProg >= RITUAL.length) { S.flags.secretOpen = true; UI.toast('🗿 ごごごご…！ 遠くで大きな岩が動く音がした！（秘伝の泉の近く）', 'good'); sfx('coin'); } else UI.toast('石柱が光った！', 'good');
    } else { pillarProg = 0; pillars.forEach(q => { q.lit = false; q.rune.material.emissiveIntensity = 0.15; }); sfx('ng'); UI.toast('石柱の光が消えた…（順番がちがうみたい）', 'bad'); }
  }

  // =============== 武器 ===============
  function weaponModel(id) {
    const g = new T.Group(), w = WEAPONS.find(x => x.id === id) || WEAPONS[0], add = (geo, c, x, y, z, o) => { const me = new T.Mesh(geo, new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5 }, o || {}))); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    const el = w.el ? ELEMENTS[w.el].color : 0, glow = w.el ? { emissive: el, emissiveIntensity: 0.9 } : { metalness: 0.7, roughness: 0.25 };
    if (id === 'broom') { add(new T.CylinderGeometry(0.03, 0.03, 1.0, 8), 0x8a6238, 0, -0.45, 0); add(new T.ConeGeometry(0.17, 0.4, 10), 0xe5c070, 0, -1.1, 0).rotation.x = Math.PI; }
    else if (id === 'spear' || id === 'frost') { add(new T.CylinderGeometry(0.03, 0.03, 1.8, 8), 0x8a6238, 0, -0.8, 0); add(new T.ConeGeometry(0.1, 0.45, 8), w.color, 0, -1.85, 0, glow).rotation.x = Math.PI; }
    else if (id === 'hammer' || id === 'thunder') { add(new T.CylinderGeometry(0.04, 0.04, 1.1, 8), 0x8a6238, 0, -0.5, 0); add(new T.BoxGeometry(0.55, 0.4, 0.4), w.color, 0, -1.15, 0, id === 'thunder' ? glow : { metalness: 0.3 }); }
    else if (id === 'tide') { add(new T.CylinderGeometry(0.035, 0.035, 1.5, 8), 0x3a6a9a, 0, -0.65, 0); add(new T.SphereGeometry(0.2, 12, 10), w.color, 0, -1.5, 0, glow); }
    else if (id === 'venom') { add(new T.CylinderGeometry(0.04, 0.04, 0.2, 8), 0x3a2a4a, 0, -0.1, 0); add(new T.BoxGeometry(0.07, 0.55, 0.03), w.color, 0, -0.45, 0, glow); add(new T.ConeGeometry(0.04, 0.14, 4), w.color, 0, -0.78, 0, glow).rotation.x = Math.PI; }
    else { const L = id === 'legend' ? 1.15 : 0.85; add(new T.CylinderGeometry(0.04, 0.04, 0.26, 8), 0x5a3a24, 0, -0.12, 0); add(new T.BoxGeometry(0.34, 0.06, 0.1), id === 'legend' ? 0xffd23f : 0x8a8f96, 0, -0.27, 0, { metalness: 0.6 }); add(new T.BoxGeometry(id === 'legend' ? 0.14 : 0.1, L, 0.035), w.color, 0, -0.3 - L / 2, 0, id === 'sun' || id === 'legend' || w.el ? { emissive: w.el ? el : 0xffc83a, emissiveIntensity: 0.9 } : { metalness: 0.7, roughness: 0.25 }); add(new T.ConeGeometry(0.06, 0.2, 4), w.color, 0, -0.3 - L - 0.08, 0, w.el ? glow : { metalness: 0.7 }).rotation.x = Math.PI; }
    return g;
  }
  function refreshWeapon() {
    const pm = A.P.mesh; if (!pm || !pm.userData.arms) return;
    const id = S.weapon || 'broom'; if (weaponId === id && weaponGrp) return;
    if (weaponGrp && weaponGrp.parent) weaponGrp.parent.remove(weaponGrp);
    weaponGrp = weaponModel(id); weaponGrp.position.set(0, -0.43, 0.04); pm.userData.arms[1].add(weaponGrp); weaponId = id;
  }
  function poseArm(pm) {
    if (!pm.userData.arms) return; refreshWeapon(); weaponGrp.visible = true;
    const arm = pm.userData.arms[1];
    if (st.atkT > 0) { const p = 1 - st.atkT / st.atkDur; arm.rotation.x = -2.8 + 2.7 * Math.pow(p, 0.55); arm.rotation.z = -0.25; } else { arm.rotation.x = -0.9; arm.rotation.z = 0; }
  }

  // =============== 魔物 ===============
  function makeMonster(type, x, z, zone, hpMul) {
    const def = MONSTERS[type], g = new T.Group(), r = def.size, glow = !!def.glow, boss = !!def.boss;
    const mat = new T.MeshPhysicalMaterial({ color: def.color, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, envMap: World.env, envMapIntensity: 0.5, emissive: glow ? def.color : 0x000000, emissiveIntensity: glow ? 0.5 : 0, transparent: true, opacity: 0.95 });
    const body = new T.Mesh(new T.SphereGeometry(1, 28, 20), mat); body.castShadow = true; g.add(body);
    const dark = A.m(0x1b1a22, { roughness: 0.4 });
    for (const s of [-1, 1]) {
      const e = new T.Mesh(new T.SphereGeometry(1, 10, 8), dark); e.scale.set(0.11, boss ? 0.18 : 0.15, 0.08); e.position.set(s * 0.3, 0.12, 0.88); body.add(e);
      const h = new T.Mesh(new T.SphereGeometry(1, 6, 5), A.m(0xffffff)); h.scale.setScalar(0.035); h.position.set(s * 0.3 + 0.03, 0.18, 0.95); body.add(h);
      if (boss) { const b = new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.06), dark); b.position.set(s * 0.3, 0.38, 0.9); b.rotation.z = -s * 0.45; body.add(b); }
    }
    const mo = new T.Mesh(new T.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), A.m(0x7a3a30)); mo.rotation.z = Math.PI; mo.position.set(0, -0.12, 0.9); body.add(mo);
    if (boss) { const cm = A.m(def.el === 'ice' ? 0xcfeaff : def.el === 'fire' ? 0xff9a3a : 0xffe36a, { metalness: 0.6, roughness: 0.3 }); const c = new T.Mesh(new T.ConeGeometry(0.5, 0.6, 6), cm); c.position.set(0, 1.1, 0); body.add(c); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28, t = new T.Mesh(new T.ConeGeometry(0.1, 0.3, 5), cm); t.position.set(Math.cos(a) * 0.45, 0.95, Math.sin(a) * 0.45); body.add(t); } }
    if (def.feel && def.feel.foam) for (let i = 0; i < 6; i++) { const b = new T.Mesh(new T.SphereGeometry(1, 8, 6), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); b.scale.setScalar(0.18); const a = i * 1.05; b.position.set(Math.cos(a) * 0.7, 0.55 + (i % 3) * 0.15, Math.sin(a) * 0.7); body.add(b); }
    body.scale.set(r, r * 0.8, r);
    const bc = document.createElement('canvas'); bc.width = 128; bc.height = 16; const btex = new T.CanvasTexture(bc), bar = new T.Sprite(new T.SpriteMaterial({ map: btex, depthTest: false }));
    const bw = boss ? 2.6 : 1.1; bar.scale.set(bw, bw / 8, 1); bar.renderOrder = 30; bar.position.set(0, r * 1.6 + 0.3, 0); bar.visible = false; g.add(bar);
    g.position.set(x, 0, z); group.add(g);
    const hpm = hpMul || (1 + zone * 0.45), hp = def.hp * (boss ? 1 : hpm);
    return { g, body, mat, def, type, x, z, vx: 0, vz: 0, home: { x, z }, hp, max: hp, dmg: def.dmg * (boss ? 1 : 1 + zone * 0.3), r: r * 0.85, ph: Math.random() * 6, cd: rr(0.5, 1.5), tele: 0, flash: 0, dead: 0, wt: 0, tgt: null, kb: { x: 0, z: 0 }, bar, bc, btex, boss, zone, spec: 0, charge: 0, summoned: false, burn: 0, poison: 0, slow: 0, wet: 0, dot: 0, dotDmg: 0 };
  }
  function drawBar(m) {   // 枠・背景・緑を1枚の絵に描く
    const g = m.bc.getContext('2d'), p = Math.max(0, m.hp) / m.max;
    g.clearRect(0, 0, 128, 16); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 16); g.fillStyle = '#2a2a2a'; g.fillRect(2, 2, 124, 12);
    g.fillStyle = p > 0.5 ? '#5fd16b' : p > 0.25 ? '#ffd23f' : '#ff6b6b'; g.fillRect(2, 2, Math.round(124 * p), 12);
    m.btex.needsUpdate = true; m.bar.visible = true;
  }
  function spawnAll(name) {
    for (const m of monsters) if (m.g.parent) m.g.parent.remove(m.g); monsters = []; boss = null;
    const place = (type, x, z, zone, hpMul) => { const c = A.collide(area, x, z, 0.8); const m = makeMonster(type, c[0], c[1], zone, hpMul); monsters.push(m); return m; };
    if (name === 'mountain') {
      [[10, 0], [14, 1], [14, 2]].forEach(([cnt, zone]) => {
        const z0 = [-12, -70, -140][zone], z1 = [-70, -140, -184][zone], types = [['normal', 'normal', 'puni'], ['normal', 'puni', 'nobi', 'toro', 'fuwa', 'fizz'], ['puni', 'nobi', 'toro', 'fuwa', 'hikari', 'hikari', 'fizz']][zone];
        for (let i = 0; i < cnt; i++) { const z = rr(z0, z1); place(types[(Math.random() * types.length) | 0], clamp(pathX(z) + rr(-17, 17), OX - 42, OX + 42), z, zone); }
      });
      for (let i = 0; i < 3; i++) if (Math.random() < 0.7) { const z = rr(-60, -170); place('mochi', clamp(pathX(z) + rr(-16, 16), OX - 42, OX + 42), z, 1); }   // もちスライム（レア）
      for (let i = 0; i < 4; i++) { place('frost', OX - rr(14, 32), -rr(66, 92), 1); place('flame', OX + rr(14, 32), -rr(66, 92), 1); }
      if (!(S && S.bossDay === S.day)) boss = place('king', OX, ZEND + 3, 2, 1);
    } else {
      const c = CAVES[name], zone = 3;
      c.mobs.forEach(([type, cnt]) => { for (let i = 0; i < cnt; i++) place(type, c.ox + rr(-19, 19), rr(-60, -6), zone); });
      if (!(S.bossDays && S.bossDays[c.theme] === S.day)) boss = place(c.boss, c.ox, -70, 0, 1);
    }
  }

  // =============== 入る・出る ===============
  function enter(name, prev) {
    const wasAdv = !!prev && isAdv(prev);
    cur = name; area = R[name].area; group = R[name].group;
    for (const o of orbs) if (o.mesh.parent) o.mesh.parent.remove(o.mesh); orbs = []; for (const r of rings) if (r.mesh && r.mesh.parent) r.mesh.parent.remove(r.mesh); rings = [];
    if (!wasAdv) { st.trip = {}; st.kills = 0; S.maxHp = S.maxHp || 100; S.hp = S.maxHp; document.getElementById('advHUD').style.display = 'block'; pillarProg = 0; pillars.forEach(q => { q.lit = false; q.rune.material.emissiveIntensity = 0.15; }); }
    st.active = true; st.inv = 0; st.atkT = 0; st.cd = 0;
    spawnAll(name); refreshWeapon();
    if (secretWall) secretWall.visible = !S.flags.secretOpen;
    if (name !== 'mountain') { const r = R[name]; r.chestOpen = false; r.chest.visible = false; if (!boss) UI.toast(`${CAVES[name].label}のボスは、今日はもう倒した`); else UI.toast(`🕳 ${CAVES[name].label}…ボスが奥で待っている！`); }
    else if (!wasAdv) UI.toast(`⚔ ${weapon().name}を持って出発！（Space/ボタンで攻撃）${boss ? '' : '　ヌシは今日はもう倒した'}`);
  }
  function end() {
    st.active = false; if (weaponGrp) weaponGrp.visible = false; document.getElementById('advHUD').style.display = 'none'; document.getElementById('advBoss').style.display = 'none';
    for (const m of monsters) if (m.g.parent) m.g.parent.remove(m.g); monsters = []; for (const o of orbs) if (o.mesh.parent) o.mesh.parent.remove(o.mesh); orbs = [];
    const lines = Object.keys(st.trip).map(id => `${ITEMS[id].name}×${st.trip[id]}`);
    if (lines.length) UI.toast('🧪 持ち帰ったもの：' + lines.join('、'), 'good');
  }
  function faint() {
    st.active = false; sfx('ng'); const lost = [];
    for (const id in st.trip) { const n = Math.floor(st.trip[id] / 2); if (n > 0 && S.bag[id]) { S.bag[id] = Math.max(0, S.bag[id] - n); lost.push(`${ITEMS[id].name}×${n}`); if (S.bag[id] <= 0) delete S.bag[id]; } }
    UI.toast('😵 気絶して、町に運ばれた…' + (lost.length ? `（エキスの半分を落とした：${lost.join('、')}）` : ''), 'bad');
    A.go('town');
  }

  // =============== 戦い ===============
  const facing = () => ({ x: Math.sin(A.P.rot), z: Math.cos(A.P.rot) });
  const feelOf = d => Object.assign({ hard: 0, bouncy: 0, foam: 0, ooze: 0, sticky: 0, crunch: 0 }, d.feel || {});
  function attack() {
    if (!st.active || st.cd > 0) return; const w = weapon();
    st.cd = w.cd; st.atkDur = Math.min(0.34, w.cd * 0.85); st.atkT = st.atkDur; st.hitDone = false;
    let best = null, bd = w.reach + 2.2;
    for (const m of monsters) { if (m.dead) continue; const d = Math.hypot(m.x - A.P.x, m.z - A.P.z) - m.r; if (d < bd) { bd = d; best = m; } }
    if (best && w.arc < 360) A.P.rot = Math.atan2(best.x - A.P.x, best.z - A.P.z);
    Snd.swoosh(w.atk > 15 ? 1 : 0.7);
    const f = Math.atan2(-Math.cos(A.P.rot), Math.sin(A.P.rot)), len = Math.min(w.arc, 359) * Math.PI / 180;
    slash.geometry.dispose(); slash.geometry = new T.RingGeometry(w.reach * 0.4, w.reach, 28, 1, f - len / 2, len);
    slash.position.set(A.P.x, 0.9, A.P.z); slash.material.color.set(w.el ? ELEMENTS[w.el].color : 0xffffff); slash.material.opacity = 0.6; slash.visible = true;
    if (slash.parent !== group) group.add(slash);
  }
  function popText(text, x, y, z, color, big) {
    const c = document.createElement('canvas'); c.width = 160; c.height = 64; const g = c.getContext('2d');
    g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeText(text, 80, 46); g.fillStyle = color || '#fff'; g.fillText(text, 80, 46);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.set(big ? 2.1 : 1.6, big ? 0.84 : 0.64, 1); s.position.set(x, y, z); s.renderOrder = 40; group.add(s); pops.push({ s, life: 0.9 });
  }
  function damageMonster(m, dmg, color) {   // やけど・どくのじわじわダメージ
    m.hp -= dmg; m.flash = 0.5; popText(String(Math.max(1, Math.round(dmg))), m.x + rr(-0.3, 0.3), m.r * 1.8 + 0.5, m.z, color); drawBar(m); if (m.hp <= 0) killMonster(m);
  }
  function hitMonster(m, dmg, push, crit, el, noChain) {
    if (m.dead) return;
    let mult = 1, tag = '';
    if (el && m.def.weak && m.def.weak.includes(el)) { mult = 1.7; tag = '弱点！'; }
    else if (el && m.def.el === el) { mult = 0.5; tag = 'いまひとつ'; }
    if (el === 'thunder' && m.wet > 0) { mult *= 1.5; if (!tag) tag = 'ぬれて効く！'; }
    dmg *= mult; m.hp -= dmg; m.flash = 1;
    const dx = m.x - A.P.x, dz = m.z - A.P.z, d = Math.hypot(dx, dz) || 1, k = push * (m.boss ? 0.25 : 1) * (el === 'water' ? 1.8 : 1);
    m.kb.x += dx / d * k; m.kb.z += dz / d * k;
    popText(String(Math.round(dmg)), m.x, m.r * 1.8 + 0.6, m.z, el ? '#' + ELEMENTS[el].color.toString(16).padStart(6, '0') : crit ? '#ffd23f' : '#ffffff');
    if (tag) popText(tag, m.x, m.r * 1.8 + 1.3, m.z, mult > 1 ? '#ffd23f' : '#aaaaaa', true);
    drawBar(m);
    if (el === 'fire') { m.burn = 3; m.dotDmg = Math.max(1, dmg * 0.18); }
    else if (el === 'poison') { m.poison = 5; m.dotDmg = Math.max(1, dmg * 0.14); }
    else if (el === 'ice') m.slow = 2.5;
    else if (el === 'water') m.wet = 4;
    else if (el === 'thunder' && !noChain) { let n = 0; for (const o of monsters) { if (o === m || o.dead || n >= 2) continue; if (Math.hypot(o.x - m.x, o.z - m.z) < 5) { hitMonster(o, dmg * 0.5, 2, false, 'thunder', true); n++; } } }
    Snd.squish(feelOf(m.def), clamp(dmg / 20 + 0.3, 0.3, 1));
    if (m.hp <= 0) killMonster(m);
  }
  function applyHits(w) {
    const f = facing(), cosA = Math.cos(w.arc / 2 * Math.PI / 180);
    for (const m of monsters) {
      if (m.dead) continue; const dx = m.x - A.P.x, dz = m.z - A.P.z, d = Math.hypot(dx, dz); if (d > w.reach + m.r) continue;
      if (w.arc < 360 && (dx * f.x + dz * f.z) / (d || 1) < cosA) continue;
      const crit = Math.random() < (w.el === 'light' ? 0.35 : 0.1); hitMonster(m, w.atk * rr(0.85, 1.15) * (crit ? 1.8 : 1), w.id === 'hammer' || w.id === 'thunder' ? 10 : 5, crit, w.el);
    }
    if (cur === 'mountain') {   // 石柱は、いちばん近い1本だけに当たる（まとめて当てて順番がくずれないように）
      let np = null, nd = 1e9; for (const p of pillars) { const dx = p.x - A.P.x, dz = p.z - A.P.z, d = Math.hypot(dx, dz); if (d < w.reach + 0.9 && d < nd && (w.arc >= 360 || (dx * f.x + dz * f.z) / (d || 1) > cosA)) { nd = d; np = p; } }
      if (np) pillarHit(np);
    }
  }
  function killMonster(m) {
    m.dead = 0.0001; st.kills++; Snd.snap(feelOf(m.def)); m.bar.visible = false;
    const drops = m.def.drop.slice(), flag = m.def.flag;
    if (m.boss) {
      for (let i = 0; i < 4; i++) drops.push(['extract_normal', 1]);
      if (flag === 'king') { drops.push(['extract_puni', 1], ['extract_nobi', 1], ['extract_toro', 1], ['extract_fuwa', 1]); S.bossDay = S.day; UI.toast('👑 キングスライムを倒した！ 「秘伝のスライムエキス」を手に入れよう！', 'good'); }
      else { S.bossDays = S.bossDays || {}; S.bossDays[flag] = S.day; const r = R[cur]; r.chest.visible = true; r.chestOpen = false; r.chest.position.set(CAVES[cur].ox, 0, -80); UI.toast(`👑 ${m.def.name}を倒した！ 奥に宝箱が現れた！`, 'good'); }
      if (!S.flags[flag]) { S.flags[flag] = true; const nw = WEAPONS.filter(w => w.unlock && w.unlock !== 'chest' && !S.weapons[w.id] && unlockOk(w) && (w.unlock === flag || (w.unlock === 'both' && (flag === 'ice' || flag === 'fire')))).map(w => w.name); if (nw.length) UI.toast('🔧 エンジニアの店に新しい武器が入荷した：' + nw.join('、'), 'good'); }
      document.getElementById('advBoss').style.display = 'none';
    }
    for (const [id, p] of drops) if (Math.random() < p) spawnOrb(id, m.x, m.z);
  }
  function spawnOrb(id, x, z) {
    const it = ITEMS[id], g = new T.Group(), col = hexC(it.color);
    g.add(new T.Mesh(new T.SphereGeometry(0.2, 12, 10), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.2 })));
    const cap = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.12, 8), A.m(0xffffff)); cap.position.y = 0.24; g.add(cap);
    g.position.set(x + rr(-0.4, 0.4), 0.5, z + rr(-0.4, 0.4)); group.add(g);
    orbs.push({ mesh: g, id, vy: 4 + Math.random() * 2, t: 0, secret: id === 'extract_secret' });
  }
  function hurtPlayer(dmg, fromX, fromZ) {
    if (st.inv > 0 || !st.active) return; S.hp -= dmg; st.inv = 0.8;
    const dx = A.P.x - fromX, dz = A.P.z - fromZ, d = Math.hypot(dx, dz) || 1, c = A.collide(area, A.P.x + dx / d * 1.1, A.P.z + dz / d * 1.1, 0.5); A.P.x = c[0]; A.P.z = c[1];
    popText('-' + Math.round(dmg), A.P.x, 2.4, A.P.z, '#ff6b6b'); sfx('ng'); document.body.classList.add('hurt'); setTimeout(() => document.body.classList.remove('hurt'), 160);
    if (S.hp <= 0) { S.hp = 0; setTimeout(faint, 250); st.active = false; }
  }

  // =============== 毎フレーム ===============
  function update(dt, t) {
    if (!cur || (!st.active && !monsters.length)) return;
    const P = A.P, w = weapon();
    st.tint += (clamp((8 - P.z) / 206, 0, 1) - st.tint) * Math.min(1, dt);
    st.cd = Math.max(0, st.cd - dt); st.inv = Math.max(0, st.inv - dt);
    if (st.atkT > 0) { st.atkT -= dt; const p = 1 - st.atkT / st.atkDur; if (!st.hitDone && p >= 0.4) { st.hitDone = true; applyHits(w); } slash.material.opacity = Math.max(0, 0.6 * st.atkT / st.atkDur); if (st.atkT <= 0) slash.visible = false; }
    if (area.lava && st.active) for (const lv of area.lava) if (Math.hypot(P.x - lv.x, P.z - lv.z) < lv.r) hurtPlayer(7, lv.x, lv.z);
    for (let i = monsters.length - 1; i >= 0; i--) {
      const m = monsters[i];
      if (m.dead) { m.dead += dt; const s = Math.max(0, 1 - m.dead / 0.35); m.body.scale.set(m.r / 0.85 * (1 + (1 - s) * 0.4), m.r / 0.85 * 0.8 * s, m.r / 0.85 * (1 + (1 - s) * 0.4)); if (m.dead > 0.4) { if (m.g.parent) m.g.parent.remove(m.g); monsters.splice(i, 1); } continue; }
      if (m.burn > 0 || m.poison > 0) { m.burn -= dt; m.poison -= dt; m.dot += dt; if (m.dot >= 0.5) { m.dot = 0; damageMonster(m, m.dotDmg, m.burn > 0 ? '#ff9a4a' : '#c77aff'); if (m.dead) continue; } }
      m.slow = Math.max(0, m.slow - dt); m.wet = Math.max(0, m.wet - dt);
      const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz), aggro = m.boss ? 40 : 10, sp = m.def.spd * (m.zone ? 1 + Math.min(m.zone, 2) * 0.12 : 1) * (m.slow > 0 ? 0.45 : 1);
      let mx = 0, mz = 0;
      m.cd -= dt; m.flash = Math.max(0, m.flash - dt * 4); m.wt -= dt;
      if (m.tele > 0) {
        m.tele -= dt;
        if (m.tele <= 0) {
          if (m.boss && m.spec === 1) { rings.push({ x: m.x, z: m.z, life: 0.25, r: 4.6, hit: true }); if (Math.hypot(P.x - m.x, P.z - m.z) < 4.6) hurtPlayer(m.dmg, m.x, m.z); Snd.snap({ hard: 1 }); m.spec = 0; m.cd = 2.2; }
          else if (Math.hypot(P.x - m.x, P.z - m.z) < m.r + 1.6) { hurtPlayer(m.dmg, m.x, m.z); m.cd = 1.3; } else m.cd = 0.6;
        }
      } else if (d < aggro && st.active) {
        mx = dx / d; mz = dz / d;
        if (m.boss) {
          if (m.charge > 0) { m.charge -= dt; mx *= 3; mz *= 3; if (d < m.r + 1.2 && m.cd <= 0) { hurtPlayer(m.dmg * 0.8, m.x, m.z); m.cd = 1.5; m.charge = 0; } }
          else if (m.cd <= 0 && d < 12) { if (Math.random() < 0.55) { m.spec = 1; m.tele = 0.9; rings.push({ x: m.x, z: m.z, life: 0.9, r: 4.6, tele: true }); } else { m.charge = 0.9; m.cd = 4; } }
          if (!m.summoned && m.hp < m.max * 0.5) { m.summoned = true; const sub = m.def.el === 'ice' ? 'frost' : m.def.el === 'fire' ? 'flame' : m.def.el === 'dark' ? 'shade' : 'puni'; for (let k = 0; k < 3; k++) { const c = A.collide(area, m.x + rr(-5, 5), m.z + rr(-5, 5), 0.8); monsters.push(makeMonster(k % 2 ? sub : 'normal', c[0], c[1], 2)); } UI.toast(`👑 ${m.def.name}が仲間を呼んだ！`); }
        } else if (d < m.r + 0.95 && m.cd <= 0) { m.tele = 0.38; }
      } else if (m.wt <= 0) { m.tgt = { x: m.home.x + rr(-5, 5), z: m.home.z + rr(-5, 5) }; m.wt = rr(2, 5); }
      if (!mx && !mz && m.tgt) { const tx = m.tgt.x - m.x, tz = m.tgt.z - m.z, td = Math.hypot(tx, tz); if (td > 0.5) { mx = tx / td * 0.4; mz = tz / td * 0.4; } }
      if (m.tele > 0) { mx = mz = 0; }
      m.vx += (mx * sp - m.vx) * Math.min(1, dt * 6); m.vz += (mz * sp - m.vz) * Math.min(1, dt * 6);
      m.kb.x *= Math.pow(0.02, dt); m.kb.z *= Math.pow(0.02, dt);
      const c = A.collide(area, m.x + (m.vx + m.kb.x) * dt, m.z + (m.vz + m.kb.z) * dt, m.r); m.x = c[0]; m.z = c[1];
      if (d < m.r + 0.55) { const k = (m.r + 0.55 - d); m.x -= dx / (d || 1) * k * 0.5; m.z -= dz / (d || 1) * k * 0.5; }
      const moving = Math.hypot(m.vx, m.vz) > 0.3, hop = moving ? Math.abs(Math.sin(t * 6 + m.ph)) : 0, sq = m.tele > 0 ? 0.55 + 0.45 * (m.tele / (m.spec === 1 ? 0.9 : 0.38)) : 1 + 0.07 * Math.sin(t * 2 + m.ph), Rr = m.r / 0.85;
      m.body.scale.set(Rr * (1 + (1 - sq) * 0.6), Rr * 0.8 * sq * (1 + hop * 0.18), Rr * (1 + (1 - sq) * 0.6));
      m.g.position.set(m.x, hop * 0.35 * (m.boss ? 1.5 : 1) + (m.def.feel && m.def.feel.foam ? 0.35 + 0.1 * Math.sin(t * 2 + m.ph) : 0), m.z); m.g.rotation.y = Math.atan2(dx, dz);
      const hot = m.burn > 0 ? 0xff7a2a : m.slow > 0 ? 0x6fd0ff : 0;
      m.mat.emissive.set(m.flash > 0 ? 0xffffff : hot || (m.def.glow ? m.def.color : 0x000000)); m.mat.emissiveIntensity = m.flash > 0 ? m.flash * 0.9 : hot ? 0.6 : m.def.glow ? 0.5 + 0.25 * Math.sin(t * 3) : 0;
      if (m.boss && d < 45) { const b = document.getElementById('advBoss'); b.style.display = 'block'; b.querySelector('b').textContent = '👑 ' + m.def.name; b.querySelector('i').style.width = Math.max(0, m.hp / m.max * 100) + '%'; }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.life -= dt;
      if (!r.mesh) { r.mesh = new T.Mesh(new T.CircleGeometry(r.r, 32), new T.MeshBasicMaterial({ color: r.tele ? 0xff4040 : 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); r.mesh.rotation.x = -Math.PI / 2; r.mesh.position.set(r.x, 0.1, r.z); group.add(r.mesh); }
      r.mesh.material.opacity = r.tele ? 0.25 + 0.2 * Math.sin(t * 20) : Math.max(0, r.life * 3); if (r.life <= 0) { if (r.mesh.parent) r.mesh.parent.remove(r.mesh); rings.splice(i, 1); }
    }
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]; o.t += dt; const p = o.mesh.position;
      if (o.t < 0.6) { o.vy -= 14 * dt; p.y = Math.max(0.5, p.y + o.vy * dt); }
      else { const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz); p.y = 0.6 + 0.12 * Math.sin(t * 4 + i);
        if (d < 5 || o.secret) { const k = Math.min(1, dt * (d < 5 ? 7 : 2.5)); p.x += dx * k; p.z += dz * k; p.y += (1.0 - p.y) * k; }
        if (d < 1.1) { if (giveItem(o.id, 1)) { st.trip[o.id] = (st.trip[o.id] || 0) + 1; sfx('coin'); UI.toast(`🧪 ${ITEMS[o.id].name}を手に入れた！`, 'good'); } else UI.toast('バッグがいっぱいで持てない！', 'bad'); if (o.mesh.parent) o.mesh.parent.remove(o.mesh); orbs.splice(i, 1); continue; } }
      o.mesh.rotation.y += dt * 3;
    }
    for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.life -= dt; q.s.position.y += dt * 1.6; q.s.material.opacity = Math.min(1, q.life * 2); if (q.life <= 0) { if (q.s.parent) q.s.parent.remove(q.s); q.s.material.map.dispose(); pops.splice(i, 1); } }
    motes.forEach((m2, i) => { const u = m2.userData; m2.position.set(OX + Math.cos(t * 0.6 + u.a) * u.r, u.y + Math.sin(t * 2 + i) * 0.3, ZEND + Math.sin(t * 0.6 + u.a) * u.r); });
    if (secretWall && S.flags.secretOpen && secretWall.visible) secretWall.position.y -= dt * 2.5, secretWall.position.y < -4 && (secretWall.visible = false);
    if (st.active) { st.regen += dt; if (st.regen > 4 && S.hp < S.maxHp) S.hp = Math.min(S.maxHp, S.hp + dt * 2.5); if (st.inv > 0.7) st.regen = 0; }
    const hp = document.getElementById('advHP'); if (hp) { hp.querySelector('i').style.width = Math.max(0, S.hp / S.maxHp * 100) + '%'; hp.querySelector('span').textContent = `HP ${Math.ceil(S.hp)} / ${S.maxHp}`; document.getElementById('advInfo').textContent = `⚔ ${w.name}${w.el ? ELEMENTS[w.el].icon : ''}（こうげき ${w.atk}）　🧪 ${Object.values(st.trip).reduce((a, b) => a + b, 0)}`; }
  }

  function build(api) {
    A = api; T = api.T;
    buildMountain();
    for (const n of Object.keys(CAVES)) buildCave(n);
    group = R.mountain.group; area = R.mountain.area;
  }
  return { build, enter, end, update, attack, poseArm, refreshWeapon, isAdv, fog, get tint() { return st.tint; }, get active() { return st.active; }, get _m() { return monsters; }, get _orbs() { return orbs; }, get _st() { return st; } };
})();
