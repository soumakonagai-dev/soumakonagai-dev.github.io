// 全体の進行: タイトル → 自宅(図鑑・開発・出撃準備) → 観測(ドローン) / 出撃(徒歩) → 結果 → 自宅
(() => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.body.classList.add('is-touch');

  // ---------- 3D ----------
  const canvas = $('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = !isTouch;                       // 影はPCだけ(スマホは重いので省く)
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.fog = new THREE.FogExp2(0x040506, 0.055);
  const cam = new THREE.PerspectiveCamera(72, 1, 0.05, 70);
  cam.rotation.order = 'YXZ';
  scene.add(cam);
  // ?only=<id> でその怪物だけを出す。?hit で当たり判定の枠を表示
  const qs = new URLSearchParams(location.search), only = qs.get('only');
  World.init(scene, cam);
  Monsters.init(scene);
  { const plan = Ruins.plan(Know.s.ruin.n); World.load(plan); Monsters.populate(plan, only); }
  if (qs.has('hit')) Monsters.setHitVisible(true);
  Loot.init(scene);
  Gore.init(scene);
  Proj.init(scene);
  Filter.init(renderer);

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    Filter.resize(w, h);
  }
  addEventListener('resize', resize); resize();

  // ---------- 状態 ----------
  let phase = 'title';
  let glitchBoost = 0, shake = 0, heartT = 0, warnT = 0, msgTimer = 0, roomT = 0, seenT = 0, huntTime = 0, endLock = false;
  let pb = null;                 // 録画の再生状態
  let js = null;                 // ジャンプスケア { m, t }
  let curRoom = -1, lastAttacker = null, scanFocus = null;
  const _fw = new THREE.Vector3(), _rc = new THREE.Raycaster(), _hp = new THREE.Vector3();

  function setPhase(p) {
    phase = p;
    for (const c of [...document.body.classList]) if (c.startsWith('ph-')) document.body.classList.remove(c);
    document.body.classList.add('ph-' + p);
    Sfx.setActive(p === 'observe' || p === 'hunt' || p === 'playback');   // 遠くのうめき声は、廃墟の中だけ
  }

  // ---------- 入力 ----------
  // 前後の移動は W・S と上下キー。向きは A・D と左右キー(マウスでも可)。上下の向きはマウスか Q・E
  const In = { mx: 0, my: 0, lookX: 0, lookY: 0, up: false, down: false, scan: false, fire: false };
  const keys = {}, touch = { up: false, down: false, scan: false, fire: false };
  const stick = { x: 0, y: 0 };
  let mouseDown = false;
  const mouseN = { x: 0, y: 0 }, mouseS = { x: 0, y: 0 };   // マウスポインタの画面上の位置(-1〜1)と、なめらかにした値
  const locked = () => document.pointerLockElement === canvas;
  const playing = () => phase === 'observe' || phase === 'hunt' || phase === 'playback';

  addEventListener('keydown', e => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (!playing()) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Page')) e.preventDefault();
    switch (e.code) {
      case 'KeyR': if (phase === 'hunt') actReload(); else actRec(); break;
      case 'KeyP': actPlay(); break;
      case 'KeyN': actNight(); break;
      case 'KeyX': actBack(); break;
      case 'KeyH': Monsters.setHitVisible(!Monsters.hitVisible); break;
      case 'Digit1': actSwap(0); break;
      case 'Digit2': actSwap(1); break;
      case 'Escape': if (phase === 'playback') endPlayback(false); break;
    }
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });

  addEventListener('mousemove', e => {
    if (!isTouch) { mouseN.x = clamp(e.clientX / innerWidth * 2 - 1, -1, 1); mouseN.y = clamp(e.clientY / innerHeight * 2 - 1, -1, 1); }
  });
  canvas.addEventListener('mousedown', () => {
    if (isTouch || !playing()) return;
    mouseDown = true;
    if (phase === 'playback') endPlayback(false);
  });
  addEventListener('mouseup', () => { mouseDown = false; });
  document.addEventListener('pointerlockchange', () => { $('lockhint').style.display = (playing() && !isTouch && !locked() && phase !== 'playback') ? 'block' : 'none'; });

  // タッチ: 左スティック
  const stickEl = $('stick'), knob = stickEl.firstElementChild;
  let sid = null;
  function stickMove(e) {
    const r = stickEl.getBoundingClientRect(), m = r.width / 2;
    let dx = e.clientX - (r.left + m), dy = e.clientY - (r.top + m);
    const l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    stick.x = dx / m; stick.y = -dy / m;
  }
  stickEl.addEventListener('pointerdown', e => { sid = e.pointerId; stickEl.setPointerCapture(sid); stickMove(e); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === sid) stickMove(e); });
  const stickEnd = e => { if (e.pointerId === sid) { sid = null; stick.x = stick.y = 0; knob.style.transform = ''; } };
  stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
  // 右側スワイプで向き
  const lz = $('lookzone'); let lid = null, lx = 0, ly = 0;
  lz.addEventListener('pointerdown', e => { lid = e.pointerId; lz.setPointerCapture(lid); lx = e.clientX; ly = e.clientY; if (phase === 'playback') endPlayback(false); });
  lz.addEventListener('pointermove', e => {
    if (e.pointerId !== lid) return;
    In.lookX += (e.clientX - lx) * 0.0055; In.lookY += (e.clientY - ly) * 0.0055; lx = e.clientX; ly = e.clientY;
  });
  const lzEnd = e => { if (e.pointerId === lid) lid = null; };
  lz.addEventListener('pointerup', lzEnd); lz.addEventListener('pointercancel', lzEnd);
  // ボタン
  function hold(id, key) {
    const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); touch[key] = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => { touch[key] = false; }));
  }
  hold('tUp', 'up'); hold('tDown', 'down'); hold('tScan', 'scan'); hold('tFire', 'fire');
  const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  tap('tReload', () => actReload()); tap('tRec', actRec); tap('tPlay', actPlay); tap('tNight', actNight); tap('tBack', actBack); tap('tHome', actBack);
  tap('tSwap', () => actSwap((Hunt.p.cur + 1) % Math.max(1, Hunt.p.loadout.length)));

  function pollInput(dt) {
    const k = keys;
    let x = stick.x;                                             // 横移動はスマホのスティックだけ
    let y = ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0) + stick.y;
    In.lookX += (((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0)) * dt * 2.2;   // PageDown で右、PageUp で左
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    In.mx = x; In.my = y;
    In.up = !!k.Space || touch.up; In.down = !!k.ShiftLeft || !!k.ShiftRight || touch.down;
    const trig = mouseDown || !!k.KeyF;
    In.scan = trig || touch.scan; In.fire = trig || touch.fire;
  }

  // ---------- HUD ----------
  const el = {
    rec: $('rec'), recTxt: $('recTxt'), bat: $('batBar'), dur: $('durBar'), hp: $('hpBar'), mode: $('modeTxt'), dist: $('distTxt'),
    ret: $('reticle'), msg: $('msg'), weapon: $('weapon'), warn: $('warn'), hint: $('hint'), hitm: $('hitm'),
    hurt: $('hurt'), flash: $('flash'), room: $('room'), remain: $('remain'), target: $('target'), spName: $('spName'), carry: $('carry'),
    homeBox: $('homeBox'), homeArrow: $('homeArrow'), homeTxt: $('homeTxt'),
    sp: { body: $('sp-body'), head: $('sp-head'), weak: $('sp-weak') },
  };
  function toast(text, cls, ms) {
    el.msg.textContent = text; el.msg.className = 'on ' + (cls || '');
    clearTimeout(msgTimer); msgTimer = setTimeout(() => { el.msg.className = ''; }, ms || 2200);
  }
  function flashOn(node, ms) { node.classList.add('on'); setTimeout(() => node.classList.remove('on'), ms); }
  const hint = t => { el.hint.textContent = t; };
  const mmss = n => { const s = Math.floor(n); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const itemList = c => Object.keys(c).map(k => `${Items[k].name}×${c[k]}`).join('、') || 'なし';

  // 狙っている怪物の名前と、残りの体力の区切り(●)
  let targetT = 0;
  function showTarget(m) {
    if (!Know.ent(m.def.id).seen) return;
    el.target.innerHTML = `${m.def.name}  <b>${'●'.repeat(m.st.seg)}${'○'.repeat(m.segs - m.st.seg)}</b>`; el.target.classList.add('on'); targetT = 2;
  }
  function updateRoomName(x, z) {
    const r = World.roomAt(x, z);
    if (r !== curRoom) { curRoom = r; el.room.textContent = World.roomName(r); el.room.classList.add('on'); roomT = 2.6; }
  }

  function updateScanPanel(m) {
    const id = m && m.def.id, e = m && Know.ent(id);
    el.spName.textContent = m && e.seen ? m.def.name : '解析';
    for (const k of ['body', 'head', 'weak']) {
      const row = el.sp[k], v = e ? e.scan[k] : 0;
      row.querySelector('b').style.width = v * 100 + '%';
      row.classList.toggle('done', v >= 1);
      row.style.display = (k === 'head' && m && m.def.dex.head === '') ? 'none' : '';
    }
  }
  function markActive(part) { for (const k in el.sp) el.sp[k].classList.toggle('active', k === part && !el.sp[k].classList.contains('done')); }

  function updateHud() {
    const d = Drone.s;
    el.bat.style.width = clamp(d.battery, 0, 1) * 100 + '%'; el.bat.className = d.battery < 0.2 ? 'low' : '';
    el.dur.style.width = clamp(d.hp, 0, 1) * 100 + '%'; el.dur.className = d.hp < 0.4 ? 'low' : '';
    el.hp.style.width = clamp(Hunt.p.hp, 0, 100) + '%'; el.hp.className = Hunt.p.hp < 35 ? 'low' : '';
    if (phase === 'playback') {
      el.rec.className = 'play'; el.recTxt.textContent = '▶ 再生 ' + mmss(pb ? pb.t : 0) + ' / ' + mmss(d.clip.length / 10);
    } else if (d.rec) {
      el.rec.className = 'on'; el.recTxt.textContent = 'REC ' + mmss(d.frames.length / 10);
    } else {
      el.rec.className = ''; el.recTxt.textContent = d.clip ? 'REC 待機 (録画あり: P)' : 'REC 待機 (R)';
    }
    el.mode.textContent = d.night ? '暗視' : '通常';
    el.remain.textContent = `残り ${Monsters.remaining()} / ${Ruins.plan(Know.s.ruin.n).monsters.length}体`;
    if (targetT > 0 && (targetT -= 0.016) <= 0) el.target.classList.remove('on');
    if (el.room.classList.contains('on')) { roomT -= 0.016; if (roomT <= 0) el.room.classList.remove('on'); }
  }
  function updateWeaponHud() {
    const p = Hunt.p;
    el.weapon.innerHTML = p.loadout.map((id, i) => {
      const w = Weapons[id];
      const rl = p.reload && p.reload.id === id ? ` リロード中…` : '';
      return `<div class="${i === p.cur ? 'cur' : ''}">${i === p.cur ? '▶ ' : ''}${i + 1} ${w.name} ${Hunt.infinite(w) ? '∞' : p.ammo[id] + ' / ∞'}${rl}</div>`;
    }).join('');
    el.carry.innerHTML = '戦利品: ' + (Object.keys(p.carry).length ? Object.keys(p.carry).map(k => `${Items[k].name}<b>×${p.carry[k]}</b>`).join(' ') : 'なし');
  }
  function updateHome() {
    const p = Hunt.p, dx = World.spawn.x - p.x, dz = World.spawn.z - p.z, d = Math.hypot(dx, dz);
    const f = [-Math.sin(p.yaw), -Math.cos(p.yaw)], r = [Math.cos(p.yaw), -Math.sin(p.yaw)];
    const ang = Math.atan2(dx * r[0] + dz * r[1], dx * f[0] + dz * f[1]);
    el.homeArrow.style.transform = `rotate(${ang}rad)`;
    const inZone = World.inSpawnZone(p.x, p.z);
    el.homeBox.classList.toggle('in', inZone);
    el.homeTxt.textContent = inZone ? '帰還点: X キー / 帰還ボタンで帰る' : `帰還点まで ${Math.round(d)}m`;
  }

  // ---------- 画面の切り替え ----------
  const screens = { title: $('screen-title'), hub: $('screen-hub'), result: $('screen-result') };
  function showScreen(name) { for (const k in screens) screens[k].classList.toggle('hidden', k !== name); }
  function lockPointer() {}   // ポインタは固定しない(マウスの位置を見る)
  function mouseLook(dt) {
    if (isTouch) return;
    const a = 1 - Math.exp(-dt * 9);
    mouseS.x += (mouseN.x - mouseS.x) * a; mouseS.y += (mouseN.y - mouseS.y) * a;
    cam.rotation.y -= mouseS.x * 0.95; cam.rotation.x -= mouseS.y * 0.5;
  }
  function releaseLock() { try { document.exitPointerLock(); } catch (e) {} }

  // 廃墟を全部倒していたら、次の廃墟へ進む(世界は、出撃するときに作り直す)
  function toHub(note, tab) {
    if (Know.s.ruin.cleared) { Know.advanceRuin(); note = (note ? note + ' ' : '') + `廃墟を制圧した! 次は ${Ruins.info(Know.s.ruin.n).name}`; }
    setPhase('hub'); showScreen('hub'); Hub.show(note, tab);
  }
  // 廃墟(間取り・怪物)が、いまの進み具合と違えば、作り直してから始める
  function ensureRuin(cb) {
    const n = Know.s.ruin.n;
    if (World.ruinN === n) { cb(); return; }
    $('loading').classList.remove('hidden'); $('loadTxt').textContent = Ruins.info(n).name;
    setTimeout(() => {
      const plan = Ruins.plan(n);
      World.load(plan); Monsters.populate(plan, only); Loot.clear();
      if (qs.has('hit')) Monsters.setHitVisible(true);
      $('loading').classList.add('hidden'); cb();
    }, 60);
  }

  function startObserve() { ensureRuin(beginObserve); }
  function beginObserve() {
    Sfx.init();
    Drone.reset(); Monsters.reset('observe'); Monsters.list.forEach(m => m.setReveal(false)); World.setNight(false);
    Loot.scatter(); Gore.clear(); Proj.clear(); pb = null; curRoom = -1; scanFocus = null; endLock = false;
    setPhase('observe'); showScreen(null); updateScanPanel(null);
    hint(isTouch ? '' : 'W・S 移動 / A・D か ←→ 体の向き(視線はマウスの位置) / Space・Shift 上下 / F 解析(長押し) / R 録画 / P 再生 / N 暗視 / X 帰還');
    toast('ドローンを飛ばして、怪物を探そう。叫んだ瞬間が狙い目', '', 3400);
    if (!isTouch) lockPointer();
  }
  function endObserve(reason) {
    Drone.stopRec(); Know.save(); releaseLock();
    toHub(reason ? reason + '。観測した内容は図鑑に残っている。' : '', 'dex');
  }
  function startSortie(loadout) { ensureRuin(() => beginSortie(loadout)); }
  function beginSortie(loadout) {
    Sfx.init();
    Hunt.reset(loadout); Monsters.reset('hunt'); Monsters.refreshReveal(); World.setNight(false); World.setSpot(1.8);
    Loot.scatter(); Gore.clear(); Proj.clear(); huntTime = 0; endLock = false; curRoom = -1; lastAttacker = null; warnT = 0;
    setPhase('hunt'); showScreen(null); updateWeaponHud();
    hint(isTouch ? '' : 'W・S 移動 / A・D か ←→ 体の向き(視線はマウスの位置) / クリック・F 撃つ / R リロード / 1・2 武器 / 帰還点でX');
    toast('出撃。戦利品を拾って、生きて帰還点へ戻ろう', '', 3400);
    if (!isTouch) lockPointer();
  }
  function endExpedition(success) {
    if (endLock) return; endLock = true;
    releaseLock();
    const carried = { ...Hunt.p.carry }, kills = Hunt.p.kills.slice();
    if (success) { Know.bank(carried); Know.s.runs.ok++; Sfx.home(); } else Know.s.runs.died++;
    Know.save();
    setPhase('result'); showScreen('result');
    const killTxt = kills.length ? kills.map(id => MonsterDefs[id].name).join('、') : 'なし';
    const clr = Know.s.ruin.cleared ? '<p class="good">廃墟を制圧した! 次の廃墟へ進める。</p>' : '';
    $('resTitle').textContent = success ? '生還した' : 'やられた…';
    $('resText').innerHTML = success
      ? `<div class="reslist">戦利品ボックスに入れた: <b>${itemList(carried)}</b><br>倒した怪物: ${killTxt}</div>${clr}<p class="sub">素材で、新しい武器を開発できる。</p>`
      : `<div class="reslist">持っていた戦利品を失った: <b>${itemList(carried)}</b><br>倒した怪物: ${killTxt}(倒した怪物は復活しない)</div>${clr}<p class="sub">図鑑と開発済みの武器は残っている。弱点を調べ直そう。</p>`;
  }
  $('btnStart').onclick = () => { Sfx.init(); toHub('', 'dex'); };
  $('btnRes').onclick = () => toHub('', 'box');
  Hub.init({ onDrone: startObserve, onSortie: startSortie, onCraft: () => Sfx.craft() });

  // ---------- アクション ----------
  function actRec() {
    if (phase !== 'observe') return;
    const r = Drone.toggleRec();
    if (r === 'start') { toast('録画開始 (最大20秒。もう一度Rで停止)'); Sfx.beep(900); }
    else if (r === 'saved') { toast('録画を保存した。Pで再生', 'good'); Sfx.done(); }
    else if (r === 'short') toast('短すぎて保存されなかった', 'bad');
  }
  function actPlay() {
    if (phase === 'playback') { endPlayback(false); return; }
    if (phase !== 'observe') return;
    if (Drone.s.rec) actRec();
    if (!Drone.s.clip) { toast('再生できる録画がない。Rで録画しよう', 'bad'); return; }
    pb = { t: 0, tells: new Set(), shown: {} }; setPhase('playback'); Sfx.beep(600);
    toast('録画を再生中…(クリックで中断)');
  }
  function endPlayback(done) {
    if (phase !== 'playback') return;
    setPhase('observe');
    Monsters.restoreLive();
    if (done && pb) {
      let n = 0;
      pb.tells.forEach(id => { if (Know.learnTell(id)) { n++; toast(`発見: ${MonsterDefs[id].name}の予兆(図鑑に追加)`, 'good', 3600); Sfx.done(); } });
      if (!n) toast('再生終了');
    }
    pb = null;
  }
  function actNight() {
    if (phase !== 'observe') return;
    Drone.s.night = !Drone.s.night; World.setNight(Drone.s.night); Sfx.click();
  }
  function actBack() {
    if (phase === 'observe') endObserve('帰還した');
    else if (phase === 'playback') endPlayback(false);
    else if (phase === 'hunt') {
      if (World.inSpawnZone(Hunt.p.x, Hunt.p.z)) endExpedition(true);
      else toast('帰還点(緑の輪)まで戻ろう', 'bad', 1600);
    }
  }
  function actReload() { if (phase === 'hunt' && Hunt.startReload()) { Sfx.reload(); toast('リロード…', '', 900); updateWeaponHud(); } }
  function actSwap(i) { if (phase === 'hunt' && Hunt.swap(i)) { Sfx.click(); updateWeaponHud(); } }

  // ---------- 酸の命中 ----------
  // 徒歩ではHPが減り、ドローンでは機体の耐久が減る
  let acidFlash = 0;
  function onAcid(h) {
    if (h.kind === 'direct') { glitchBoost = 0.7; shake = 0.4; Sfx.hurt(); flashOn(el.hurt, 300); }
    else if ((acidFlash -= 0.016) <= 0) { acidFlash = 0.4; flashOn(el.hurt, 200); }
    if (phase === 'hunt') { if (h.kind === 'direct') Hunt.kill(); else Hunt.damage(h.dmg); if (h.owner) lastAttacker = h.owner; }   // 酸の直撃は即死。酸だまりは、じわじわ傷つく
    else if (phase === 'observe') { if (h.kind === 'direct') Drone.s.hp = 0; else Drone.s.hp -= h.dmg / 80; }
  }

  // ---------- 怪物のイベント ----------
  function onEvents(mode, T) {
    for (const ev of Monsters.popEvents()) {
      const m = ev.m, def = m.def, mp = m.pos(), dist = Math.hypot(mp.x - T.x, mp.z - T.z);
      Sfx.audible(dist < 24);
      const sameRoom = World.roomDepth(World.roomAt(mp.x, mp.z), World.roomAt(T.x, T.z)) === 0;
      if (ev.type === 'tell') {
        Sfx.tilt();
        if (mode === 'hunt' && Know.tellKnown(def.id) && dist < 18) { warnT = 1.2; Sfx.beep(1600); }
      } else if (ev.type === 'act') {
        if (ev.kind === 'scream' || ev.kind === 'wail') {
          Sfx.scream(mp.x, 1.6, mp.z, 1, ev.kind === 'wail' ? 'wail' : 'roar');
          glitchBoost = 0.9; shake = Math.max(shake, clamp(1 - dist / 12, 0.15, 1) * 0.6);
          if (ev.kind === 'scream' && mode === 'hunt' && dist < 12) Hunt.p.slow = 1.6;
          if (ev.kind === 'wail' && sameRoom && dist < 9) {
            if (mode === 'hunt') { Hunt.damage(Math.round(15 * MONSTER_EASE.dmg)); lastAttacker = m; Sfx.hurt(); flashOn(el.hurt, 350); }
            else { Drone.s.battery = Math.max(0, Drone.s.battery - 0.1); toast('泣き声で映像が乱れる。バッテリーが減った', 'bad'); }
          }
        } else if (ev.kind === 'reach') { Sfx.scream(mp.x, 1.8, mp.z, 1, 'gag'); shake = Math.max(shake, 0.3); }
        else if (ev.kind === 'spit') { Sfx.spit(); }
        else if (ev.kind === 'lash') { Sfx.thump(1.2); shake = Math.max(shake, 0.35); }
        else if (ev.kind === 'birth') { Sfx.scream(mp.x, 1.2, mp.z, 1, 'shriek'); shake = Math.max(shake, 0.3); }
        else { Sfx.thump(1.4); shake = Math.max(shake, 0.4); }
      } else if (ev.type === 'attack') {
        if (mode === 'observe') {
          if (dist < ev.range + 0.6 && Drone.pos.y < 2.8) { Drone.s.hp = 0; Sfx.hurt(); glitchBoost = 1; flashOn(el.hurt, 300); shake = 0.5; }   // 当たったら、ドローンは壊れる
        } else if (dist < ev.range + 0.5) {
          Hunt.kill(); lastAttacker = m; Sfx.hurt(); glitchBoost = 0.8; flashOn(el.hurt, 350); shake = 0.6;   // 敵に当たったら即死
        }
      } else if (ev.type === 'grab') {                      // 口から伸びた腕につかまれて、引きずられる
        Sfx.grab(); glitchBoost = 0.9; shake = 0.7;
        if (mode === 'hunt') { Hunt.kill(); lastAttacker = m; flashOn(el.hurt, 400); }
        else if (dist < ev.range + 0.6) { Drone.s.hp = 0; flashOn(el.hurt, 300); }
      } else if (ev.type === 'spit') {                       // 酸を吐く
        Proj.fire(ev.from, ev.to, ev.speed, ev.dmg, m); Sfx.spit();
      } else if (ev.type === 'summon') {                     // 腹が裂けて、子が生まれる
        for (let i = 0; i < ev.n; i++) Monsters.spawn(ev.def, ev.x + (Math.random() - 0.5) * 1.6, ev.z + (Math.random() - 0.5) * 1.6, mode);
        Sfx.thump(1.3); toast('子が産まれた!', 'bad', 1400);
      } else if (ev.type === 'stun') {
        Sfx.stun(); glitchBoost = 0.3; toast(`${def.name}がスタン! むき出しの弱点を撃て!`, 'good', 1800); showTarget(m);
      } else if (ev.type === 'segbreak') {
        Sfx.segbreak(); shake = Math.max(shake, 0.3); toast(`体力の区切りを壊した! (残り ${ev.seg})`, 'good', 1600); showTarget(m);
      } else if (ev.type === 'dead') onKill(m);
    }
  }
  function onKill(m) {
    const def = m.def, mp = m.pos();
    Know.addKill(def.id); Hunt.p.kills.push(def.id); Gore.pool(mp.x, mp.z);
    if (!m.dynamic) {
      Know.slay(m.uid);                                                       // この廃墟では、復活しない
      if (Monsters.remaining() === 0) { Know.s.ruin.cleared = true; Know.save(); toast('廃墟を制圧した! 帰還点へ戻ろう', 'good', 6000); }
    }
    if (def.onDeath) { for (let i = 0; i < def.onDeath.n; i++) Monsters.spawn(def.onDeath.def, mp.x + (Math.random() - 0.5) * 1.4, mp.z + (Math.random() - 0.5) * 1.4, 'hunt'); toast('腹から子が飛び出した!', 'bad', 1600); }
    def.drops.forEach(d => { if (Math.random() < d.p) for (let i = 0; i < d.n; i++) Loot.spawn(d.item, mp.x + (Math.random() - 0.5) * 1.2, mp.z + (Math.random() - 0.5) * 1.2); });
    toast(`${def.name}を倒した! 素材が落ちた`, 'good', 2800); Sfx.win();
  }

  // ---------- 観測 ----------
  // 図鑑の部位名: 頭が弱点の怪物は、頭の解析を弱点の解析として数える
  const dexPart = (m, part) => (part === 'head' && m.def.weakPart === 'head' ? 'weak' : part);
  const PART_JP = { body: '体', head: '頭', weak: '弱点' };

  function updateObserve(dt) {
    Drone.update(dt, In); Drone.applyCam(cam); mouseLook(dt);
    Drone.forward(_fw);
    const hl = Math.hypot(_fw.x, _fw.z) || 1;
    const T = { x: Drone.pos.x, z: Drone.pos.z, fx: _fw.x / hl, fz: _fw.z / hl };
    Monsters.update(dt, T, 'observe'); onEvents('observe', T);
    Proj.update(dt, { x: Drone.pos.x, y: Drone.pos.y, z: Drone.pos.z }, onAcid);
    Drone.recTick(dt);

    // 解析
    let focus = null, scanPart = null;
    _rc.set(cam.position, _fw); _rc.far = 10;
    const h = Monsters.hitTest(_rc);
    if (h && h.dist <= World.blockDist(cam.position, _fw, h.dist)) {
      focus = h.m;
      const id = h.m.def.id, part = dexPart(h.m, h.part);
      if (Know.markSeen(id)) { toast(`新しい怪物を発見: ${h.m.def.name}`, 'good', 2600); Sfx.done(); }
      el.dist.textContent = `DIST ${h.dist.toFixed(1)}m`;
      if (In.scan) {
        scanPart = part;
        if (Know.addScan(id, part, (part === 'weak' ? 0.6 : 0.5) * dt)) {
          Sfx.done(); toast(`解析完了: ${h.m.def.name}の${PART_JP[part]}`, 'good', 2600);
        }
      }
    } else el.dist.textContent = 'DIST --';
    if (focus) scanFocus = { m: focus, t: 1.5 }; else if (scanFocus && (scanFocus.t -= dt) <= 0) scanFocus = null;
    updateScanPanel(scanFocus && scanFocus.m); markActive(scanPart);
    el.ret.classList.toggle('lock', !!focus);
    updateRoomName(Drone.pos.x, Drone.pos.z);
    updateHud();
    if (In.scan && scanPart) Sfx.setStatic(0.08);

    if (Drone.s.battery <= 0) endObserve('バッテリー切れで強制帰還');
    else if (Drone.s.hp <= 0) endObserve('ドローンが壊された');
  }

  function updatePlayback(dt) {
    const clip = Drone.s.clip;
    pb.t += dt;
    const i = Math.floor(pb.t * 10);
    if (i >= clip.length) { endPlayback(true); return; }
    const f = clip[i];
    cam.position.set(f.px, f.py, f.pz); cam.rotation.set(f.pitch, f.yaw, 0);
    Monsters.applyFrame(f.ms, true);
    Monsters.list.forEach((m, j) => {
      const s = f.ms[j]; if (!s) return;
      if (Math.hypot(s.x - f.px, s.z - f.pz) > 16) return;
      const id = m.def.id;
      if (s.state === 'tell' || s.state === 'frozen') { pb.tells.add(id); toast(`…${m.def.name}の予兆`, '', 400); }
      else if (s.jaw > 0.55 && m.ai.exposeIn !== 'always') toast(`${m.def.name}の弱点が開いた`, 'bad', 400);
    });
    updateHud(); el.dist.textContent = 'DIST --';
  }

  // ---------- 出撃(徒歩) ----------
  // 敵に敵対されている(追われている・攻撃されようとしている)間は、自動で、その敵の頭のほうを向く。自分で向きを動かしている間は、自動では向かない
  let manualT = 0, stepN = 0;
  const HOSTILE = new Set(['chase', 'tell', 'act', 'lunge', 'recover', 'stunned']);
  function autoFace(dt) {
    if (Math.abs(In.lookX) > 0.0004 || Math.abs(In.lookY) > 0.0004) manualT = 0.7;
    if (manualT > 0) { manualT -= dt; return; }
    const p = Hunt.p; let best = null, bd = 16;
    for (const m of Monsters.list) {
      if (m.st.dead || !HOSTILE.has(m.st.state) || m.ai.special === 'freeze') continue;       // 影の子は、見ると固まるので対象外
      const d = Math.hypot(m.st.x - p.x, m.st.z - p.z);
      if (d < bd && World.lineOfSight(p.x, p.z, m.st.x, m.st.z)) { bd = d; best = m; }
    }
    if (!best) return;
    best.headPos(_hp);
    const dx = _hp.x - p.x, dz = _hp.z - p.z, flat = Math.hypot(dx, dz);
    let diff = Math.atan2(-dx, -dz) - p.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    p.yaw += clamp(diff * 5, -3.6, 3.6) * dt;
    p.pitch += clamp((clamp(Math.atan2(_hp.y - 1.6, flat), -0.6, 0.6) - p.pitch) * 4, -2.5, 2.5) * dt;
  }

  function updateHunt(dt) {
    huntTime += dt;
    autoFace(dt);
    Hunt.update(dt, In); Hunt.applyCam(cam); mouseLook(dt);
    if (Math.floor(Hunt.p.bob / Math.PI) !== stepN) { stepN = Math.floor(Hunt.p.bob / Math.PI); Sfx.step(); }   // 足音。たまに、床がミシッと鳴る
    if (Hunt.p.reloaded) { updateWeaponHud(); }
    const p = Hunt.p, T = { x: p.x, z: p.z, fx: -Math.sin(p.yaw), fz: -Math.cos(p.yaw) };
    Monsters.update(dt, T, 'hunt'); onEvents('hunt', T);
    Proj.update(dt, { x: p.x, y: 1.0, z: p.z }, onAcid);
    if (In.fire) tryFire();

    // 戦利品を拾う
    for (const item of Loot.collectNear(p.x, p.z, 1.25)) {
      const d = Items[item];
      if (d.kind === 'heal') { Hunt.heal(30); toast('包帯: HPが回復した', 'good', 1400); }
      
      else { Hunt.addCarry(item); toast(`${d.name} を拾った`, '', 1200); }
      Sfx.pickup(); updateWeaponHud();
    }
    // 見えた怪物を図鑑に載せる(正面の怪物)
    seenT -= dt;
    if (seenT <= 0) {
      seenT = 0.25;
      _fw.set(0, 0, -1).applyQuaternion(cam.quaternion); _rc.set(cam.position, _fw); _rc.far = 16;
      const h = Monsters.hitTest(_rc);
      if (h && h.dist <= World.blockDist(cam.position, _fw, h.dist)) { if (Know.markSeen(h.m.def.id)) toast(`新しい怪物を発見: ${h.m.def.name}`, 'good', 2600); showTarget(h.m); }
    }
    el.warn.classList.toggle('on', warnT > 0); warnT -= dt;
    updateRoomName(p.x, p.z); updateHome(); updateHud(); updateWeaponHud();
    if (p.hp <= 0 && !endLock) {
      const m = lastAttacker || Monsters.nearest(p.x, p.z).m;
      startJumpScare(m);
    }
  }
  function tryFire() {
    const w = Hunt.weapon(), r = Hunt.fire(cam);
    if (!r) return;
    if (r.empty) { if (r.reloading) { Sfx.reload(); toast('リロード…', '', 900); } else Sfx.click(); return; }
    Sfx.shot(w.snd); flashOn(el.flash, 55);
    if (r.autoReload) { setTimeout(() => Sfx.reload(), 220); toast('リロード…', '', 900); }
    if (r.hits.length) {
      el.hitm.className = 'on' + (r.weak ? ' weak' : ''); setTimeout(() => { el.hitm.className = ''; }, 90);
      r.hits.forEach(hh => Know.markSeen(hh.m.def.id)); showTarget(r.hits[0].m);
      if (r.weak) { Sfx.weak(); toast('弱点命中!', 'good', 700); } else Sfx.hit();
    }
  }

  // ---------- やられたとき: ジャンプスケア ----------
  function startJumpScare(m) {
    releaseLock(); endLock = true;
    setPhase('jumpscare'); js = { m, t: 0 };
    Sfx.jumpscare(); el.hurt.classList.add('on'); flashOn(el.flash, 120);
  }
  function updateJumpScare(dt) {
    js.t += dt;
    const m = js.m, p = Hunt.p;
    m.scarePose(dt, p.x, p.z);
    m.headPos(_hp);
    let dx = p.x - m.st.x, dz = p.z - m.st.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const k = Math.min(1, js.t / 0.18), ease = 1 - (1 - k) * (1 - k);
    const dist = 2.6 + (m.def.scare.dist - 2.6) * ease;                // 一気に顔の前へ
    cam.position.set(_hp.x + dx * dist, _hp.y + 0.02, _hp.z + dz * dist);
    cam.lookAt(_hp);
    cam.rotation.x += (Math.random() - 0.5) * 0.06; cam.rotation.y += (Math.random() - 0.5) * 0.06;
    if (js.t > 0.5 && js.t < 0.6 || js.t > 0.9 && js.t < 0.98) el.flash.classList.add('on'); else el.flash.classList.remove('on');
    if (js.t > 1.7) { el.flash.classList.remove('on'); el.hurt.classList.remove('on'); js = null; endLock = false; endExpedition(false); }
  }

  // ---------- 描画 ----------
  function render(dt) {
    const near = Monsters.nearest(cam.position.x, cam.position.z), dist = near.dist;
    const inGame = phase === 'observe' || phase === 'hunt';
    let g = inGame ? Math.pow(clamp((9 - dist) / 9, 0, 1), 2) * 0.8 : 0.05;
    g += glitchBoost; glitchBoost = Math.max(0, glitchBoost - dt * 1.4);
    shake = Math.max(0, shake - dt * 1.2);
    if (shake > 0.01) { cam.rotation.x += (Math.random() - 0.5) * shake * 0.05; cam.rotation.y += (Math.random() - 0.5) * shake * 0.05; }
    const scare = phase === 'jumpscare';
    const drone = phase !== 'hunt' && !scare;
    const bat = Drone.s.battery;
    const night = drone && ((phase === 'playback' && pb && Drone.s.clip[Math.min(Drone.s.clip.length - 1, Math.floor(pb.t * 10))].night) || (phase !== 'playback' && Drone.s.night));
    Filter.render(scene, cam, {
      glitch: scare ? 1 : clamp(g, 0, 1), noise: scare ? 0.3 : drone ? 0.10 : 0.05, scan: drone ? 0.7 : 0.15, vignette: drone ? 0.5 : 0.7,
      night: night ? 1 : 0, dark: phase === 'observe' && bat < 0.2 ? (0.2 - bat) * 5 : 0, droneMode: drone ? 1 : 0,
      chroma: scare ? 0.02 : shake * 0.01, bloom: scare ? 0.9 : 0.55, bright: scare ? 1.4 : phase === 'hunt' ? 1.3 : 1.12,
    });
    // 音
    Sfx.setListener(cam);
    { let h = false, c = false; if (inGame) for (const m of Monsters.list) { const s = m.st; if (s.dead || m.ai.special === 'freeze' || !HOSTILE.has(s.state)) continue; h = true; if (Math.hypot(s.x - cam.position.x, s.z - cam.position.z) < 26) c = true; } Sfx.situation(inGame ? dist : 99, h, c); }
    const mp = near.m ? near.m.pos() : { x: 0, z: 0 };
    Sfx.monsterAt(mp.x, 1.6, mp.z, inGame ? clamp(1 - dist / 14, 0, 1) * 0.3 : 0);
    Sfx.setStatic(clamp(g * 0.4, 0, 0.35) + 0.015);
    if (inGame && dist < 10) {
      heartT -= dt;
      if (heartT <= 0) { Sfx.thump(0.6 + (10 - dist) / 20); heartT = 1.25 - 0.8 * clamp((10 - dist) / 10, 0, 1); }
    }
  }

  function tick(dt, t) {
    pollInput(dt);
    World.update(t, cam.position);
    Loot.update(t); Gore.update(dt);
    if (phase === 'observe') updateObserve(dt);
    else if (phase === 'playback') updatePlayback(dt);
    else if (phase === 'hunt') updateHunt(dt);
    else if (phase === 'jumpscare') updateJumpScare(dt);
    else {
      // タイトル・自宅・結果: 怪物が部屋を歩く様子を背景に映す
      Monsters.update(dt, { x: -99, z: -99, fx: 1, fz: 0 }, 'observe'); Monsters.popEvents();
      Drone.reset(); Drone.applyCam(cam);
    }
    if (phase !== 'jumpscare') Monsters.animate(dt);
    In.lookX = 0; In.lookY = 0;
  }
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt, now / 1000);
    render(dt);
  }
  Know.load();
  requestAnimationFrame(loop);

  // デバッグ用(コンソールから触れる)
  window.HD = { Monsters, Drone, Hunt, Know, World, Loot, Ruins, cam, In, Hub,
    get phase() { return phase; }, startObserve, startSortie, endObserve, endExpedition, startJumpScare,
    render: () => render(0.016), tick: dt => tick(dt, performance.now() / 1000) };
})();
