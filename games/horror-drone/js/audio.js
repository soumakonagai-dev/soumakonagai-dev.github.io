// 音。外部ファイルは使わず Web Audio で合成する。電子音(ピッ・ピロン・ブザー)は使わず、
// 叫び声・うめき・息づかい・物音で作る。声は「のこぎり波 + 母音の帯域フィルター + 息(ノイズ)」で作り、荒れた声は歪ませる
const Sfx = (() => {
  let ctx = null, master, noiseBuf, staticGain, panner, breathGain, farBus, distCurve = null;
  let active = false, aud = true, nearD = 99, hostile = false, chaseOn = false, bgmGain = null, bgmNext = 0, bgmStep = 0;
  const _f = new THREE.Vector3(), _u = new THREE.Vector3();
  // 母音の声の色(口の形): [F1, F2, F3] Hz
  const VOW = { a: [800, 1150, 2900], o: [500, 900, 2800], e: [550, 1850, 2600], i: [300, 2300, 3000], u: [350, 800, 2600] };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;   // 重ねた叫びで割れないように
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    distCurve = k => { const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i * 2 / 255 - 1; c[i] = (3 + k) * x * 0.35 / (Math.PI + k * Math.abs(x)) * 3; } return c; };

    // カメラ映像のかすかなザラつき(映像の乱れに合わせて音量を変える)
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.6;
    staticGain = ctx.createGain(); staticGain.gain.value = 0;
    ns.connect(bp); bp.connect(staticGain); staticGain.connect(master); ns.start();

    // 廃墟の隙間風(ゆっくり強弱がつく)
    const wn = ctx.createBufferSource(); wn.buffer = noiseBuf; wn.loop = true;
    const wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 380;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(wl.frequency); lfo.start();
    const wg = ctx.createGain(); wg.gain.value = 0.11; wn.connect(wl); wl.connect(wg); wg.connect(master); wn.start();

    // 怪物のいる方向から聞こえる息づかい(近づくほど大きい)
    panner = ctx.createPanner(); panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
    panner.refDistance = 2; panner.rolloffFactor = 1.4; panner.connect(master);
    const bn = ctx.createBufferSource(); bn.buffer = noiseBuf; bn.loop = true;
    const bb = ctx.createBiquadFilter(); bb.type = 'bandpass'; bb.frequency.value = 520; bb.Q.value = 1.1;
    const am = ctx.createGain(); am.gain.value = 0.5;
    const al = ctx.createOscillator(); al.frequency.value = 0.38; const ag = ctx.createGain(); ag.gain.value = 0.5; al.connect(ag); ag.connect(am.gain); al.start();   // 吸って、吐いて
    breathGain = ctx.createGain(); breathGain.gain.value = 0;
    bn.connect(bb); bb.connect(am); am.connect(breathGain); breathGain.connect(panner); bn.start();

    // 遠くから聞こえる、うめき声の通り道
    farBus = ctx.createGain(); farBus.gain.value = 0.16;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 800; farBus.connect(fl); fl.connect(master);
    // 音楽(追われたときだけ)
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0;
    const bl = ctx.createBiquadFilter(); bl.type = 'lowpass'; bl.frequency.value = 3200; bgmGain.connect(bl); bl.connect(master);
    setInterval(bgmTick, 80);
    // 近くに怪物がいるときだけ、うめき声。いないときは、風の音やがたがたという物音を、たまに
    setInterval(() => {
      if (!active || ctx.state !== 'running' || hostile) return;
      if (nearD < 20) { if (Math.random() < 0.09) moan(); }
      else {
        const r = Math.random();
        if (r < 0.07) gust(); else if (r < 0.13) rattle();
      }
    }, 900);
  }

  // 風が吹き抜ける音
  function gust() {
    if (!ctx) return;
    const t = ctx.currentTime, dur = 2.5 + Math.random() * 2.5, f = 300 + Math.random() * 400;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(f, t); bp.frequency.linearRampToValueAtTime(f * 2.2, t + dur * 0.5); bp.frequency.linearRampToValueAtTime(f * 0.8, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  // 戸や家具が、がたがた鳴る音
  function rattle() {
    if (!ctx) return;
    const n = 3 + Math.floor(Math.random() * 6), base = 160 + Math.random() * 200;
    for (let i = 0; i < n; i++) setTimeout(() => { noiseBurst(0.07, 0.35, base * 4, base, null, 'bandpass'); noiseBurst(0.1, 0.25, base * 1.5, 60); }, i * (70 + Math.random() * 90));
  }
  // 床板のきしむ音(ミシッ)
  function creak() {
    if (!ctx) return;
    const t = ctx.currentTime, dur = 0.28 + Math.random() * 0.2, f = 110 + Math.random() * 70;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (1.6 + Math.random() * 0.8), t + dur * 0.6); o.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
    const am = ctx.createOscillator(); am.frequency.value = 38; const ag = ctx.createGain(); ag.gain.value = 0.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    am.connect(ag); ag.connect(g.gain);
    o.connect(bp); bp.connect(g); g.connect(master); o.start(t); am.start(t); o.stop(t + dur + 0.05); am.stop(t + dur + 0.05);
    noiseBurst(0.12, 0.18, 900, 200, null, 'bandpass');
  }

  // ---- 追われているときの音楽(自作。ピアノのような音の速い反復と、低い脈動) ----
  function piano(freq, t, vol, dur) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.5));
    [[1, 'triangle', 1], [2, 'sine', 0.35], [3.01, 'sine', 0.12]].forEach(([m, type, a]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * m;
      const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + (dur || 0.5) + 0.05);
    });
    g.connect(bgmGain);
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // 1小節(16拍)。不協和な音を混ぜた、せかされる反復
  const BGM_BASS = [33, 0, 33, 0, 33, 0, 34, 0, 33, 0, 33, 0, 31, 0, 32, 0];
  const BGM_ARP = [57, 64, 69, 64, 57, 64, 70, 64, 57, 64, 69, 64, 56, 63, 68, 63];
  const BGM_STAB = { 0: [81, 84, 87], 6: [82, 85, 88], 10: [81, 84, 87], 14: [80, 83, 86] };
  const BGM_MEL = [[0, 76], [3, 75], [6, 76], [8, 79], [11, 78], [12, 76], [14, 75]];
  function bgmTick() {
    if (!ctx || !bgmGain) return;
    const want = chaseOn && active ? 0.55 : 0, cur = bgmGain.gain.value;
    bgmGain.gain.value += (want - cur) * (want > cur ? 0.25 : 0.04);
    if (bgmGain.gain.value < 0.01 && !want) { bgmNext = 0; return; }
    const sp = 60 / 176 / 2;
    if (!bgmNext || bgmNext < ctx.currentTime - 0.3) { bgmNext = ctx.currentTime + 0.05; bgmStep = 0; }
    while (bgmNext < ctx.currentTime + 0.25) {
      const i = bgmStep % 16, bar = Math.floor(bgmStep / 16) % 4, t = bgmNext, sh = bar === 3 ? 1 : 0;
      if (BGM_BASS[i]) piano(hz(BGM_BASS[i] + sh), t, 0.5, 0.45);
      piano(hz(BGM_ARP[i] + sh), t, 0.17, 0.3);
      if (BGM_STAB[i] && bar % 2 === 1) BGM_STAB[i].forEach(n => piano(hz(n), t, 0.07, 0.5));
      BGM_MEL.forEach(([k, n]) => { if (k === i && bar >= 2) piano(hz(n), t, 0.2, 0.55); });
      if (i % 4 === 0) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(bgmGain); o.start(t); o.stop(t + 0.25); }
      bgmNext += sp; bgmStep++;
    }
  }

  function setListener(cam) {
    if (!ctx) return;
    const l = ctx.listener, p = cam.position;
    _f.set(0, 0, -1).applyQuaternion(cam.quaternion);
    _u.set(0, 1, 0).applyQuaternion(cam.quaternion);
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = _f.x; l.forwardY.value = _f.y; l.forwardZ.value = _f.z;
      l.upX.value = _u.x; l.upY.value = _u.y; l.upZ.value = _u.z;
    } else {
      l.setPosition(p.x, p.y, p.z); l.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z);
    }
  }
  function setPanner(x, y, z) { if (panner.positionX) { panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z; } else panner.setPosition(x, y, z); }
  function monsterAt(x, y, z, level) {
    if (!ctx) return;
    setPanner(x, y, z);
    breathGain.gain.value += (level * 2.2 - breathGain.gain.value) * 0.1;
  }
  function setStatic(v) { if (ctx) staticGain.gain.value += (v - staticGain.gain.value) * 0.2; }
  const setActive = on => { active = !!on; };

  // ---- 音の部品 ----
  const env = (g, t0, a, d, peak) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); };
  // 息・衝撃・擦れる音(ノイズ)。type: lowpass(ドスッ) / bandpass(ヒュッ)
  function noiseBurst(dur, peak, f0, f1, dest, type, atk) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; if (f.type === 'bandpass') f.Q.value = 0.9;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain(); env(g, t, atk || 0.005, dur, peak);
    s.connect(f); f.connect(g); g.connect(dest || master);
    s.start(t, Math.random()); s.stop(t + dur + (atk || 0.005) + 0.05);
  }
  // 低い鼓動(心臓の音。ここだけ純音)
  function thumpTone(freq, dur, peak) {
    const t = ctx.currentTime, o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.65, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, dur, peak); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  // 声: 高さの動き(f0 → f1 → f2)・母音(v1 → v2)・震え(vib)・荒れ(rough)・息(breath)で、叫び声を作る
  function voice(o) {
    if (!ctx) return;
    const t = ctx.currentTime, dur = o.dur || 1, dest = o.dest || master, peak = (o.peak || 0.4) * 3;
    const f0 = o.f0 || 300, f1 = o.f1 || f0, f2 = o.f2 || f0 * 0.85;
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(f0, t); src.frequency.linearRampToValueAtTime(f1, t + dur * 0.35); src.frequency.linearRampToValueAtTime(f2, t + dur);
    if (o.vib) {                                                    // 声の震え
      const l = ctx.createOscillator(); l.frequency.value = o.vibHz || 6.5; const lg = ctx.createGain(); lg.gain.value = o.vib;
      l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + 0.1);
    }
    const A = VOW[o.v1 || 'a'], B = VOW[o.v2 || o.v1 || 'a'];
    const mix = ctx.createGain();
    A.forEach((fa, i) => {                                           // 口の形で声の色が決まる
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = i === 0 ? 5 : 8;
      bp.frequency.setValueAtTime(fa, t); bp.frequency.linearRampToValueAtTime(B[i], t + dur * 0.7);
      const g = ctx.createGain(); g.gain.value = [1, 0.7, 0.35][i];
      src.connect(bp); bp.connect(g); g.connect(mix);
    });
    const out = ctx.createGain();
    if (o.rough) {                                                  // 荒れた声(喉が裂けるような)
      const sh = ctx.createWaveShaper(); sh.curve = distCurve(20 + o.rough * 60); sh.oversample = '2x';
      mix.connect(sh); sh.connect(out);
    } else mix.connect(out);
    if (o.breath) {                                                 // 息の成分
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = A[1]; bp.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = o.breath * 2.2; ns.connect(bp); bp.connect(g); g.connect(out); ns.start(t); ns.stop(t + dur + 0.1);
    }
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + (o.atk || 0.05));
    out.gain.setValueAtTime(peak, t + dur * 0.55);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(dest); src.start(t); src.stop(t + dur + 0.05);
  }
  // 遠くのうめき声
  function moan() {
    const f = 120 + Math.random() * 90;
    voice({ f0: f, f1: f * 1.25, f2: f * 0.8, dur: 2 + Math.random() * 1.5, peak: 0.5, v1: Math.random() < 0.5 ? 'o' : 'u', v2: 'a', vib: 7, vibHz: 5, breath: 0.5, rough: 0.3, atk: 0.4, dest: farBus });
  }
  // 怪物ごとの叫び声
  const SCREAMS = {
    roar:   p => { voice({ f0: 190 * p, f1: 340 * p, f2: 150 * p, dur: 1.6, peak: 0.5, v1: 'a', v2: 'o', vib: 12, vibHz: 9, rough: 1, breath: 0.3, dest: panner });
                   voice({ f0: 75 * p, f1: 95 * p, f2: 60 * p, dur: 1.6, peak: 0.45, v1: 'o', rough: 1, breath: 0.4, dest: panner }); },
    wail:   p => { voice({ f0: 650 * p, f1: 1350 * p, f2: 720 * p, dur: 1.7, peak: 0.45, v1: 'a', v2: 'i', vib: 35, vibHz: 6.5, rough: 0.35, breath: 0.3, dest: panner });
                   voice({ f0: 330 * p, f1: 640 * p, f2: 360 * p, dur: 1.7, peak: 0.25, v1: 'o', v2: 'a', vib: 18, vibHz: 6, breath: 0.4, dest: panner }); },
    shriek: p => { voice({ f0: 900 * p, f1: 1650 * p, f2: 1100 * p, dur: 1.1, peak: 0.45, v1: 'i', v2: 'e', vib: 40, vibHz: 11, rough: 0.8, breath: 0.2, dest: panner }); },
    gag:    p => { voice({ f0: 120 * p, f1: 210 * p, f2: 110 * p, dur: 1.4, peak: 0.5, v1: 'o', v2: 'u', vib: 45, vibHz: 13, rough: 1, breath: 0.9, dest: panner });
                   noiseBurst(0.5, 0.3, 900, 200, panner, 'bandpass'); },
  };
  const unitNoise = (n, peak, f0, f1, gap, type) => { for (let i = 0; i < n; i++) setTimeout(() => noiseBurst(0.06, peak, f0, f1, null, type || 'bandpass'), i * gap * 1000); };

  const api = {
    init, setListener, monsterAt, setStatic, setActive, creak,
    audible(v) { aud = v; },
    situation(d, h, chase) { nearD = d; hostile = h; chaseOn = chase; },
    step() { if (ctx) { noiseBurst(0.07, 0.16, 500, 120); if (Math.random() < 0.28) creak(); } },
    shot(kind) {
      if (!ctx) return;
      if (kind === 'shotgun') { noiseBurst(0.4, 0.9, 5000, 150); noiseBurst(0.25, 0.8, 600, 60); }
      else if (kind === 'flash') { noiseBurst(0.18, 0.18, 4000, 1500, null, 'bandpass'); }
      else if (kind === 'flame') { noiseBurst(0.28, 0.5, 2600, 500); noiseBurst(0.3, 0.25, 1800, 300, null, 'bandpass'); }
      else if (kind === 'zap') { unitNoise(5, 0.4, 6000, 2000, 0.03); noiseBurst(0.2, 0.3, 3000, 400); }
      else if (kind === 'salt') { noiseBurst(0.32, 0.35, 5000, 1800, null, 'bandpass'); }
      else if (kind === 'heavy') { noiseBurst(0.35, 0.95, 4500, 120); noiseBurst(0.3, 0.9, 500, 50); }
      else { noiseBurst(0.22, 0.75, 6000, 200); noiseBurst(0.12, 0.6, 700, 80); }
    },
    reload() { if (ctx) { noiseBurst(0.05, 0.22, 1800, 600); setTimeout(() => noiseBurst(0.07, 0.28, 1200, 300), 260); setTimeout(() => noiseBurst(0.05, 0.22, 2000, 700), 640); } },
    click() { if (ctx) noiseBurst(0.03, 0.12, 3000, 800); },
    beep() { if (ctx) noiseBurst(0.14, 0.22, 2400, 1500, null, 'bandpass'); },                  // はっ、と息をのむ
    done() { if (ctx) noiseBurst(0.4, 0.1, 1500, 900, null, 'bandpass', 0.12); },                // ふっ、と息をつく
    thump(v) {                                                                                    // 鼓動・ドスッという重い音
      if (!ctx) return;
      thumpTone(58, 0.16, 0.55 * (v || 1)); setTimeout(() => thumpTone(52, 0.18, 0.4 * (v || 1)), 170);
      noiseBurst(0.1, 0.12 * (v || 1), 300, 60);
    },
    hurt() { if (ctx) { voice({ f0: 850, f1: 1250, f2: 700, dur: 0.55, peak: 0.55, v1: 'a', v2: 'e', rough: 0.7, breath: 0.3 }); noiseBurst(0.2, 0.5, 800, 80); } },
    hit() { if (ctx) noiseBurst(0.09, 0.35, 1400, 200); },
    weak() { if (ctx) { noiseBurst(0.22, 0.55, 2600, 250); voice({ f0: 500, f1: 800, f2: 400, dur: 0.3, peak: 0.3, v1: 'a', v2: 'o', rough: 0.6 }); } },
    tilt() { if (ctx && aud) { voice({ f0: 85, f1: 100, f2: 65, dur: 1.0, peak: 0.28, v1: 'o', rough: 1, breath: 0.6 }); noiseBurst(0.6, 0.18, 1400, 3200, null, 'bandpass', 0.35); } },   // 唸って、息を吸う
    scream(x, y, z, pitch, kind) {
      if (!ctx || !aud) return;
      if (x !== undefined) setPanner(x, y, z);
      (SCREAMS[kind || 'roar'] || SCREAMS.roar)(pitch || 1);
    },
    jumpscare() {
      if (!ctx) return;
      voice({ f0: 220, f1: 420, f2: 180, dur: 1.5, peak: 0.75, v1: 'a', v2: 'o', vib: 14, vibHz: 10, rough: 1, breath: 0.4 });
      voice({ f0: 1100, f1: 1900, f2: 1250, dur: 1.4, peak: 0.55, v1: 'a', v2: 'i', vib: 50, vibHz: 12, rough: 0.8, breath: 0.3 });
      voice({ f0: 80, f1: 110, f2: 60, dur: 1.5, peak: 0.6, v1: 'o', rough: 1, breath: 0.5 });
      noiseBurst(1.2, 0.8, 9000, 600);
    },
    stun() { if (ctx && aud) voice({ f0: 700, f1: 480, f2: 300, dur: 0.4, peak: 0.5, v1: 'a', v2: 'o', rough: 0.6, breath: 0.2 }); },
    segbreak() { if (ctx && aud) { voice({ f0: 500, f1: 1100, f2: 700, dur: 0.55, peak: 0.55, v1: 'a', v2: 'e', rough: 1, breath: 0.2 }); noiseBurst(0.25, 0.6, 4000, 250); } },
    grab() { if (ctx && aud) { voice({ f0: 110, f1: 180, f2: 100, dur: 0.6, peak: 0.5, v1: 'o', rough: 1, breath: 0.9 }); noiseBurst(0.2, 0.5, 2000, 250); } },
    spit() { if (ctx && aud) { voice({ f0: 150, f1: 120, f2: 90, dur: 0.5, peak: 0.45, v1: 'e', rough: 1, breath: 1 }); noiseBurst(0.3, 0.4, 1800, 200); } },
    pickup() { if (ctx) { noiseBurst(0.06, 0.2, 3600, 2000, null, 'bandpass'); setTimeout(() => noiseBurst(0.07, 0.18, 3000, 1500, null, 'bandpass'), 70); } },
    craft() { if (ctx) { [0, 130, 280].forEach(d => setTimeout(() => noiseBurst(0.09, 0.5, 700, 150), d)); } },
    home() { if (ctx) { noiseBurst(0.9, 0.12, 1100, 600, null, 'bandpass', 0.2); voice({ f0: 230, f1: 210, f2: 170, dur: 1.0, peak: 0.12, v1: 'o', v2: 'a', breath: 0.8, atk: 0.2 }); } },
    win() { if (ctx) voice({ f0: 300, f1: 250, f2: 190, dur: 0.9, peak: 0.16, v1: 'a', v2: 'o', breath: 0.8, atk: 0.15 }); },
  };
  return api;
})();
