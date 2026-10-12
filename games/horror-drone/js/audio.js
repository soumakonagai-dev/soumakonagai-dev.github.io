// 音。外部ファイルは使わず Web Audio API で合成する
const Sfx = (() => {
  let ctx = null, master, noiseBuf, staticGain, ambGain, growlGain, panner;
  const _f = new THREE.Vector3(), _u = new THREE.Vector3();

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // ザーッというノイズ(映像の乱れに合わせて音量を変える)
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.6;
    staticGain = ctx.createGain(); staticGain.gain.value = 0;
    ns.connect(bp); bp.connect(staticGain); staticGain.connect(master); ns.start();

    // 部屋の低い唸り
    ambGain = ctx.createGain(); ambGain.gain.value = 0.16;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    [48, 51.5].forEach(f => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start();
    });
    lp.connect(ambGain); ambGain.connect(master);

    // 怪物の位置から聞こえる息づかい
    panner = ctx.createPanner(); panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
    panner.refDistance = 2; panner.rolloffFactor = 1.4;
    panner.connect(master);
    growlGain = ctx.createGain(); growlGain.gain.value = 0;
    const go = ctx.createOscillator(); go.type = 'sawtooth'; go.frequency.value = 62;
    const glp = ctx.createBiquadFilter(); glp.type = 'lowpass'; glp.frequency.value = 260;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.35;
    const lfoG = ctx.createGain(); lfoG.gain.value = 8;
    lfo.connect(lfoG); lfoG.connect(go.frequency); lfo.start();
    go.connect(glp); glp.connect(growlGain); growlGain.connect(panner); go.start();
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
  function monsterAt(x, y, z, level) {
    if (!ctx) return;
    if (panner.positionX) { panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z; }
    else panner.setPosition(x, y, z);
    growlGain.gain.value += (level - growlGain.gain.value) * 0.1;
  }
  function setStatic(v) { if (ctx) staticGain.gain.value += (v - staticGain.gain.value) * 0.2; }

  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function noiseBurst(dur, peak, f0, f1, dest) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, dur, peak);
    s.connect(f); f.connect(g); g.connect(dest || master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(freq, dur, peak, type, slide) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, dur, peak);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  const api = {
    init, setListener, monsterAt, setStatic,
    shot(kind) {
      if (!ctx) return;
      if (kind === 'shotgun') { noiseBurst(0.45, 0.9, 5000, 120); tone(70, 0.3, 0.7, 'sine', 30); }
      else if (kind === 'flash') { tone(1800, 0.25, 0.25, 'square', 400); }
      else if (kind === 'flame') { noiseBurst(0.18, 0.55, 1800, 400); }
      else if (kind === 'zap') { tone(2400, 0.22, 0.3, 'sawtooth', 200); noiseBurst(0.12, 0.4, 7000, 1500); }
      else if (kind === 'salt') { noiseBurst(0.25, 0.4, 3000, 800); tone(500, 0.12, 0.15, 'sine', 300); }
      else if (kind === 'heavy') { noiseBurst(0.3, 0.9, 4000, 120); tone(80, 0.25, 0.8, 'sine', 30); }
      else { noiseBurst(0.22, 0.7, 6000, 200); tone(120, 0.15, 0.5, 'sine', 40); }
    },
    click() { if (ctx) tone(900, 0.04, 0.2, 'square'); },
    beep(f) { if (ctx) tone(f || 1200, 0.12, 0.25, 'sine'); },
    done() { if (ctx) { tone(880, 0.12, 0.25, 'sine'); setTimeout(() => tone(1320, 0.18, 0.25, 'sine'), 110); } },
    thump(v) {
      if (!ctx) return;
      tone(58, 0.16, 0.55 * (v || 1), 'sine', 38);
      setTimeout(() => tone(52, 0.18, 0.4 * (v || 1), 'sine', 34), 170);
    },
    hurt() { if (ctx) { noiseBurst(0.3, 0.7, 1400, 100); tone(90, 0.3, 0.6, 'sawtooth', 40); } },
    hit() { if (ctx) tone(260, 0.07, 0.3, 'triangle', 120); },
    weak() { if (ctx) { tone(520, 0.1, 0.4, 'square', 180); noiseBurst(0.2, 0.5, 3000, 300); } },
    tilt() { if (ctx) tone(200, 0.9, 0.18, 'sawtooth', 120); },
    // 叫び・泣き声。怪物のいる位置から聞こえる。pitch で声の高さを変える
    scream(x, y, z, pitch) {
      if (!ctx) return;
      if (x !== undefined) { if (panner.positionX) { panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z; } else panner.setPosition(x, y, z); }
      const pm = pitch || 1;
      const t = ctx.currentTime, dur = 1.6;
      const g = ctx.createGain(); env(g, t, 0.05, dur, 0.7);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(700, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.5); bp.frequency.linearRampToValueAtTime(600, t + dur);
      [1, 1.51].forEach((m, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(280 * m * pm, t);
        o.frequency.linearRampToValueAtTime(760 * m * pm, t + 0.5);
        o.frequency.linearRampToValueAtTime(330 * m * pm, t + dur);
        o.connect(bp); o.start(t); o.stop(t + dur + 0.1);
      });
      bp.connect(g); g.connect(panner);
      noiseBurst(dur, 0.35, 4000, 800, panner);
    },
    // ジャンプスケア: 耳をつんざく不協和音と砂嵐
    jumpscare() {
      if (!ctx) return;
      const t = ctx.currentTime, g = ctx.createGain(); env(g, t, 0.01, 1.3, 1.0); g.connect(master);
      [220, 233, 311, 466, 1180].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.3); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 1.3);
        o.connect(g); o.start(t); o.stop(t + 1.4);
      });
      noiseBurst(1.2, 0.9, 9000, 600);
    },
    spit() { if (ctx) { noiseBurst(0.3, 0.55, 1100, 180); tone(190, 0.25, 0.3, 'sawtooth', 80); } },
    grab() { if (ctx) { noiseBurst(0.18, 0.6, 2400, 300); tone(110, 0.4, 0.6, 'sawtooth', 50); } },
    pickup() { if (ctx) { tone(1100, 0.07, 0.22, 'sine'); setTimeout(() => tone(1650, 0.1, 0.22, 'sine'), 70); } },
    craft() { if (ctx) { tone(330, 0.15, 0.25, 'triangle'); setTimeout(() => tone(495, 0.15, 0.25, 'triangle'), 130); setTimeout(() => tone(660, 0.3, 0.25, 'triangle'), 260); } },
    home() { if (ctx) { tone(523, 0.3, 0.2, 'sine'); setTimeout(() => tone(659, 0.3, 0.2, 'sine'), 200); setTimeout(() => tone(784, 0.5, 0.2, 'sine'), 400); } },
    win() { if (ctx) { tone(330, 0.5, 0.25, 'sine'); setTimeout(() => tone(440, 0.6, 0.25, 'sine'), 250); } },
  };
  return api;
})();
