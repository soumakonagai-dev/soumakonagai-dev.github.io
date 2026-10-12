// 怪物の行動と当たり判定。見た目は「リグ」(rig-*.js)に任せ、性格は monster-defs.js の数値で決まる
//
// 状態: idle(待ち伏せ) → wander(うろつく) → chase(追う) → tell(予兆: 大きく振りかぶる) → act(攻撃) / lunge(飛びかかる) → recover(隙)
//        frozen(影の子: 見られている間は固まる) / dead
// 攻撃(actKind): scream 叫ぶ / wail 泣き叫ぶ / slam 叩きつける / swing 振り下ろす / reach 口から腕を伸ばしてつかむ
//                spit 酸を吐く / lash 髪を振り回す / birth 子を産む
// 弱点は、exposeIn で決めた時にだけ開く(その間だけ狙える)
function createMonster(def, spawn, scene, idx) {
  const ai = Object.assign({}, AI_DEFAULT, def.ai);
  const wrapper = new THREE.Group(); scene.add(wrapper);   // 位置・向き・倒れる動きはここで掛ける(見た目に関係なく共通)
  let rig = null, revealGlow = false, showHit = false;
  const events = [], st = {};
  const _fwd = new THREE.Vector3();
  const rand = (a, b) => a + Math.random() * (b - a);
  const alwaysExposed = ai.exposeIn === 'always';

  function makeRig() {
    const k = def.rig;
    return RigCreatures[k] ? RigCreatures[k]() : RigProcedural.create();
  }
  function setRig(r) {
    if (rig) { wrapper.remove(rig.root); if (rig.hitRoot) wrapper.remove(rig.hitRoot); }
    rig = r;
    wrapper.add(r.root); if (r.hitRoot) wrapper.add(r.hitRoot);
    r.root.traverse(o => { if (o.isMesh && !(o.material && o.material.visible === false)) { o.castShadow = true; o.receiveShadow = true; } });
    setHitVisible(showHit);
    apply(snapshot(), false);
  }
  function setHitVisible(on) {
    showHit = on;
    if (!rig) return;
    for (const k in rig.hit) {
      const mt = rig.hit[k].material;
      mt.visible = on; mt.wireframe = true; mt.depthTest = false;
      mt.color.set(k === 'weak' ? 0xff3030 : k === 'head' ? 0xffe14a : 0x40ff80);
    }
  }

  function reset(mode) {
    Gore.clearWounds(st);   // 前の傷あとを消す
    Object.assign(st, {
      state: ai.special === 'ambush' ? 'idle' : 'wander', age: 0, x: spawn.x, z: spawn.z, yaw: rand(0, Math.PI * 2), hp: def.hp, wp: (Math.random() * 4) | 0,
      walk: 0, tilt: 0, jaw: alwaysExposed ? 1 : 0, ext: 0, y: ai.hover || 0, atkCd: 0, dead: false, flash: 0, lx: 0, lz: 0, fall: 0,
      actTimer: rand(ai.actEvery[0], ai.actEvery[1]) * (mode === 'hunt' ? 0.8 : 0.6), loseT: 0, swung: false, lunged: false, spits: 0, hits: 0,
    });
    events.length = 0;
    const p = { x: st.x, y: 0, z: st.z }; World.resolve(p, def.radius, 0, 2); st.x = p.x; st.z = p.z;
    apply(snapshot(), false);
  }

  const setState = s => { st.state = s; st.age = 0; };
  const snapshot = () => ({ x: st.x, z: st.z, yaw: st.yaw, tilt: st.tilt, jaw: st.jaw, ext: st.ext, walk: st.walk, state: st.state, fall: st.fall, y: st.y });

  function faceToward(tx, tz, dt, turn) {
    const want = Math.atan2(tx - st.x, tz - st.z);
    let diff = want - st.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const m = turn * dt;
    st.yaw += Math.max(-m, Math.min(m, diff));
  }
  function moveToward(tx, tz, speed, dt, turn) {
    const dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz);
    if (d < 1e-3) return d;
    faceToward(tx, tz, dt, turn || ai.turn);
    const step = Math.min(d, speed * dt);
    st.x += Math.sin(st.yaw) * step; st.z += Math.cos(st.yaw) * step;
    st.walk += speed * dt * 2.2;
    const p = { x: st.x, y: 0, z: st.z };
    World.resolve(p, def.radius, 0, 2.0); st.x = p.x; st.z = p.z;
    return d;
  }
  // 相手(プレイヤーやドローン)に見られているか(影の子が固まる条件)
  function looked(T, dist, depth) {
    if (dist > 24 || depth !== 0) return false;
    const dot = (T.fx * (st.x - T.x) + T.fz * (st.z - T.z)) / (dist || 1);
    return dot > 0.76;
  }
  function startTell() { setState('tell'); events.push({ type: 'tell' }); }
  function startLunge(dx, dz) {
    const l = Math.hypot(dx, dz) || 1; st.lx = dx / l; st.lz = dz / l; st.lunged = false; setState('lunge'); events.push({ type: 'lunge' });
  }

  // T: 追う相手 { x, z, fx, fz }(fx,fz は向いている方向)。mode: 'observe'(ドローン) | 'hunt'(徒歩)
  function update(dt, T, mode) {
    st.age += dt; st.atkCd -= dt; st.flash = Math.max(0, st.flash - dt * 3);
    if (st.dead) {
      st.fall = Math.min(1, st.fall + dt * 1.2);
      st.jaw += (1 - st.jaw) * Math.min(1, dt * 3);
      st.ext += (0 - st.ext) * Math.min(1, dt * 2);
      if (st.y > 0) st.y = Math.max(0, st.y - dt * 6);       // 天井にいた怪物は落ちてくる
      apply(snapshot(), false); return;
    }
    const hunt = mode === 'hunt';
    const dx = T.x - st.x, dz = T.z - st.z, dist = Math.hypot(dx, dz);
    const depth = World.roomDepth(World.roomAt(st.x, st.z), World.roomAt(T.x, T.z));
    const sense = hunt ? ai.sense : Math.min(ai.sense, 5);
    const facing = (Math.sin(st.yaw) * dx + Math.cos(st.yaw) * dz) / (dist || 1);
    let tiltT = 0;

    switch (st.state) {
      case 'idle': {                       // 待ち伏せ(ミミック)。近づかれるまで動かない
        if (dist < ai.ambushRange && depth === 0) startTell();
        break;
      }
      case 'wander': {
        if (!ai.anchored && ai.wander > 0) {
          const pts = World.patrol(World.roomAt(st.x, st.z)), w = pts[st.wp % pts.length];
          const wp = World.nextWaypoint(st.x, st.z, w[0], w[1]);
          moveToward(wp.x, wp.z, ai.wander, dt, 2);
          if (Math.hypot(w[0] - st.x, w[1] - st.z) < 0.9) st.wp = (st.wp + 1 + ((Math.random() * 3) | 0)) % pts.length;
        }
        if (dist < sense && depth <= (ai.anchored ? 0 : 1)) { setState('chase'); st.actTimer = Math.min(st.actTimer, 2.5); }
        else if (ai.idleAct) { st.actTimer -= dt; if (st.actTimer <= 0) startTell(); }
        break;
      }
      case 'chase': {
        if (ai.special === 'freeze' && looked(T, dist, depth)) { setState('frozen'); break; }
        if (ai.anchored) faceToward(T.x, T.z, dt, ai.turn);
        else if (ai.keep) {                                      // 距離を保って攻撃する怪物
          if (dist < ai.keep[0]) moveToward(st.x - dx / (dist || 1) * 3, st.z - dz / (dist || 1) * 3, ai.chase, dt, ai.turn);
          else if (dist > ai.keep[1]) { const wp = World.nextWaypoint(st.x, st.z, T.x, T.z); moveToward(wp.x, wp.z, ai.chase, dt, ai.turn); }
          else faceToward(T.x, T.z, dt, ai.turn);
        } else if (dist > 1.1) { const wp = World.nextWaypoint(st.x, st.z, T.x, T.z); moveToward(wp.x, wp.z, ai.chase, dt, ai.turn); }
        else faceToward(T.x, T.z, dt, ai.turn);
        if (ai.melee && dist < ai.melee.range && depth === 0 && st.atkCd <= 0) {
          st.atkCd = ai.melee.cd; events.push({ type: 'attack', dmg: ai.melee.dmg, range: ai.melee.range });
        }
        st.actTimer -= dt;
        const ranged = ai.actKind === 'spit' || ai.actKind === 'reach';
        if (st.actTimer <= 0 && dist < ai.actRange && depth === 0 && (ai.actKind || ai.lunge) && (!ranged || World.lineOfSight(st.x, st.z, T.x, T.z))) startTell();
        if (dist > ai.giveUp || depth > 1) { st.loseT += dt; if (st.loseT > 3) { st.loseT = 0; setState('wander'); } } else st.loseT = 0;
        if (!hunt && dist > 8) setState('wander');
        break;
      }
      case 'frozen': {
        tiltT = 1;
        if (!looked(T, dist, depth)) setState('chase');
        break;
      }
      case 'tell': {
        tiltT = 1;
        faceToward(T.x, T.z, dt, ai.turn * 0.7);
        if (st.age > ai.tell) {
          if (ai.actKind) {
            setState('act'); st.swung = false; st.spits = 0; st.hits = 0; events.push({ type: 'act', kind: ai.actKind });
            if (ai.actKind === 'slam' && dist < ai.slam.range) events.push({ type: 'attack', dmg: ai.slam.dmg, range: ai.slam.range });
          } else if (ai.lunge) startLunge(dx, dz);
          else setState('recover');
        }
        break;
      }
      case 'act': {
        tiltT = ai.actTilt;
        faceToward(T.x, T.z, dt, ai.turn * (ai.actKind === 'reach' ? 0.9 : 0.5));
        const k = ai.actKind;
        if (k === 'swing' && !st.swung && st.age > 0.15) {
          st.swung = true;
          if (dist < ai.swing.range && facing > 0) events.push({ type: 'attack', dmg: ai.swing.dmg, range: ai.swing.range });
        } else if (k === 'reach' && !st.swung && st.age > 0.3) {          // 口から伸びた腕が、つかんで引きずる
          st.swung = true;
          if (dist < ai.reach.range && facing > 0.8 && depth === 0 && World.lineOfSight(st.x, st.z, T.x, T.z))
            events.push({ type: 'grab', dmg: ai.reach.dmg, range: ai.reach.range });
        } else if (k === 'spit') {                                        // 酸を吐く(数発、少しずつずらして)
          while (st.spits < ai.spit.n && st.age > 0.15 + st.spits * 0.32) {
            const jit = st.spits > 0 ? 2.6 : 0.4; st.spits++;
            events.push({ type: 'spit', speed: ai.spit.speed, dmg: ai.spit.dmg,
              from: { x: st.x + Math.sin(st.yaw) * 0.5, y: 1.3, z: st.z + Math.cos(st.yaw) * 0.5 },
              to: { x: T.x + (Math.random() - 0.5) * jit, z: T.z + (Math.random() - 0.5) * jit } });
          }
        } else if (k === 'lash') {                                        // 髪を振り回す(何度か当たる)
          while (st.hits < ai.lash.times.length && st.age > ai.lash.times[st.hits]) {
            st.hits++;
            if (dist < ai.lash.range && depth === 0) events.push({ type: 'attack', dmg: ai.lash.dmg, range: ai.lash.range });
          }
        } else if (k === 'birth' && !st.swung && st.age > 0.5) {          // 腹が裂けて、子が生まれる
          st.swung = true; events.push({ type: 'summon', def: ai.birth.def, n: ai.birth.n, x: st.x, z: st.z });
        }
        if (st.age > ai.act) {
          if (ai.lunge && k === 'scream' && hunt && dist < 16) startLunge(dx, dz);
          else setState('recover');
        }
        break;
      }
      case 'lunge': {
        if (dist > 1.1) { st.x += st.lx * ai.lunge.speed * dt; st.z += st.lz * ai.lunge.speed * dt; }
        st.walk += dt * 14;
        st.yaw = Math.atan2(st.lx, st.lz);
        const p = { x: st.x, y: 0, z: st.z }; World.resolve(p, def.radius, 0, 2.0); st.x = p.x; st.z = p.z;
        const mel = ai.melee || { range: 1.5, dmg: 20, cd: 1.4 };
        if (dist < mel.range + 0.1 && !st.lunged && st.atkCd <= 0) { st.lunged = true; st.atkCd = mel.cd; events.push({ type: 'attack', dmg: mel.dmg, range: mel.range + 0.1 }); }
        if (st.age > ai.lunge.dur) setState('recover');
        break;
      }
      case 'recover': {
        if (st.age > ai.recover) {
          st.actTimer = rand(ai.actEvery[0], ai.actEvery[1]) * (hunt ? 1 : 1.3);
          setState(dist < (hunt ? ai.giveUp : 8) ? 'chase' : 'wander');
        }
        break;
      }
    }
    const exposed = alwaysExposed || (ai.exposeIn === 'act' && st.state === 'act') || (ai.exposeIn === 'recover' && st.state === 'recover');
    st.jaw += ((exposed ? 1 : 0) - st.jaw) * Math.min(1, dt * 9);
    st.tilt += (tiltT - st.tilt) * Math.min(1, dt * 5);
    // ext: 腕・髪が伸びる / 腹がふくらむ / 腹が開く(攻撃の前ぶれと攻撃中)
    const extT = st.state === 'tell' ? ai.tellExt * Math.min(1, st.age / ai.tell) : st.state === 'act' ? ai.actExt : 0;
    st.ext += (extT - st.ext) * Math.min(1, dt * (extT > st.ext ? 9 : 3));
    st.y = ai.hover ? ai.hover + Math.sin(performance.now() / 650 + idx) * 0.08 : 0;
    apply(snapshot(), false);
  }

  // 姿勢を見た目に反映する。録画の再生でも同じ関数で姿勢を再現する
  function apply(p, reveal) {
    wrapper.position.set(p.x, p.y || 0, p.z);
    wrapper.rotation.y = p.yaw;
    wrapper.rotation.x = rig && rig.handlesDeath ? 0 : -(p.fall || 0) * Math.PI / 2;
    if (rig) rig.apply(p, p.jaw > 0.15 && (reveal || revealGlow), st.flash);
  }
  // 毎フレーム呼ぶ。見た目のアニメ再生と当たり判定の追従(録画の再生中も呼ぶ)
  function animate(dt) { if (rig) rig.update(dt); }

  // レイが当たった部位 { part: 'body'|'head'|'weak', dist }(なければ null)。弱点は、開いている間に、狙える向きからだけ
  function hitTest(ray) {
    if (st.dead || !rig) return null;
    wrapper.updateMatrixWorld(true); rig.syncHit();
    const open = st.jaw > 0.55;
    const list = [rig.hit.body, rig.hit.head];
    if (def.weakPart === 'weak' && open) list.push(rig.hit.weak);
    const hits = ray.intersectObjects(list, false);
    if (!hits.length) return null;
    const w = hits.find(h => h.object === rig.hit.weak);
    if (w) {
      let ok = def.weakFacing === 'any';
      if (!ok) { rig.weakForward(_fwd); ok = ray.ray.direction.dot(_fwd) < -0.15; }
      if (ok) return { part: 'weak', dist: w.distance };
    }
    const h = hits.find(x => x.object === rig.hit.head);
    if (h) return { part: 'head', dist: h.distance };
    return { part: 'body', dist: hits[0].distance };
  }

  // ダメージ: 弱点 × 属性が合う ×3 / 弱点 ×1 / それ以外 属性が合う ×0.25 / それ以外 ×0.1
  function hurt(part, attr, base) {
    if (st.dead) return 0;
    const weakNow = part === 'weak' || (part === 'head' && def.weakPart === 'head' && st.jaw > 0.55);
    const match = attr === def.weakAttr;
    const dmg = base * (weakNow ? (match ? 3 : 1) : (match ? 0.25 : 0.1));
    st.hp -= dmg; st.flash = 1;
    if (st.hp <= 0) { st.hp = 0; st.dead = true; setState('dead'); events.push({ type: 'dead' }); }
    return dmg;
  }

  // 顔の位置(ジャンプスケアでカメラを寄せる先)
  function headPos(out) { wrapper.updateMatrixWorld(true); if (rig) { rig.syncHit(); wrapper.updateMatrixWorld(true); rig.hit.head.getWorldPosition(out); } return out; }
  // ジャンプスケア中の姿: 口を大きく開けて、こちらを向く
  function scarePose(dt, tx, tz) {
    st.yaw = Math.atan2(tx - st.x, tz - st.z); st.state = 'act'; st.tilt = 0.9; st.jaw = 1; st.ext = Math.max(st.ext, 0.8);
    apply(snapshot(), true); animate(dt);
  }
  function destroy() { Gore.clearWounds(st); scene.remove(wrapper); }

  idx = idx || 0;
  setRig(makeRig());
  if (def.model) {
    RigGLTF.load(def, wrapper,
      r => { setRig(r); console.info('[怪物]', def.id, 'モデルを読み込んだ:', def.model.url); },
      e => console.warn('[怪物]', def.id, 'モデルを使えないので図形のまま:', e && e.message ? e.message : e));
  }
  reset('observe');

  return {
    def, ai, st, wrapper, idx,
    reset, update, animate, apply, snapshot, hitTest, hurt, setHitVisible, headPos, scarePose, destroy,
    get rig() { return rig; },
    popEvents() { const e = events.slice(); events.length = 0; return e; },
    setReveal(v) { revealGlow = !!v; },
    pos() { return { x: st.x, z: st.z }; },
    isExposed() { return st.jaw > 0.55; },
  };
}

// 全部の怪物をまとめて動かす
const Monsters = (() => {
  const list = [];
  let hitVisible = false, sceneRef = null;
  function build(scene, only) {
    sceneRef = scene;
    const ids = MONSTER_ORDER.concat(Object.keys(MonsterDefs).filter(k => !MONSTER_ORDER.includes(k)));
    for (const id of ids) {
      const def = MonsterDefs[id];
      if (!def || (only ? id !== only : def.dev)) continue;
      for (const sp of def.spawns) list.push(createMonster(def, sp, scene, list.length));
    }
  }
  // 戦いの途中で、新しい怪物を出す(子を産む・倒れると子が飛び出す)
  function spawn(defId, x, z, mode) {
    const def = MonsterDefs[defId]; if (!def) return null;
    const m = createMonster(def, { x, z }, sceneRef, list.length + 100);
    m.dynamic = true; m.reset(mode); m.st.state = 'chase'; m.st.age = 0;
    list.push(m); return m;
  }
  function hitTest(ray) {          // 一番近くに当たった怪物と部位
    let best = null;
    for (const m of list) {
      const h = m.hitTest(ray);
      if (h && (!best || h.dist < best.dist)) best = { m, part: h.part, dist: h.dist };
    }
    return best;
  }
  function nearest(x, z) {
    let best = null, bd = 1e9;
    for (const m of list) { if (m.st.dead) continue; const d = Math.hypot(m.st.x - x, m.st.z - z); if (d < bd) { bd = d; best = m; } }
    return { m: best, dist: bd };
  }
  function reset(mode) {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].dynamic) { list[i].destroy(); list.splice(i, 1); }   // 途中で出た怪物は消す
    list.forEach(m => m.reset(mode));
  }
  return {
    list, build, spawn, hitTest, nearest, reset,
    update: (dt, T, mode) => list.slice().forEach(m => m.update(dt, T, mode)),
    animate: dt => list.forEach(m => m.animate(dt)),
    snapshots: () => list.map(m => m.snapshot()),
    applyFrame: (snaps, reveal) => list.forEach((m, i) => { if (snaps[i]) m.apply(snaps[i], reveal); }),
    restoreLive: () => list.forEach(m => m.apply(m.snapshot(), false)),
    popEvents() { const out = []; list.slice().forEach(m => m.popEvents().forEach(e => { e.m = m; out.push(e); })); return out; },
    setHitVisible(on) { hitVisible = on; list.forEach(m => m.setHitVisible(on)); },
    get hitVisible() { return hitVisible; },
    refreshReveal() { list.forEach(m => m.setReveal(Know.weakKnown(m.def.id))); },
    byId: id => list.filter(m => m.def.id === id),
  };
})();
