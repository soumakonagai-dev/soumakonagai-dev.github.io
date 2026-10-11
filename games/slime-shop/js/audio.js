'use strict';
// ====== かんたんな効果音（WebAudio）======
let _ac = null;
function sfx(type) {
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    const t = _ac.currentTime;
    const note = (f, d, wave, vol, at, f2) => {
      const o = _ac.createOscillator(), g = _ac.createGain();
      o.type = wave || 'sine'; o.frequency.setValueAtTime(f, t + (at || 0));
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (at || 0) + d);
      g.gain.setValueAtTime(vol || 0.12, t + (at || 0)); g.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + d);
      o.connect(g); g.connect(_ac.destination); o.start(t + (at || 0)); o.stop(t + (at || 0) + d + 0.02);
    };
    if (S && S.mute) return;
    if (type === 'coin') { note(988, 0.1, 'square', 0.07); note(1319, 0.25, 'square', 0.07, 0.09); }
    else if (type === 'tick') note(520 + Math.random() * 80, 0.07, 'sine', 0.1, 0, 300);
    else if (type === 'pop') note(300, 0.12, 'sine', 0.14, 0, 700);
    else if (type === 'ok') { note(523, 0.12, 'triangle', 0.14); note(659, 0.12, 'triangle', 0.14, 0.1); note(784, 0.25, 'triangle', 0.14, 0.2); }
    else if (type === 'ng') { note(300, 0.25, 'sawtooth', 0.1, 0, 120); }
    else if (type === 'buy') { note(700, 0.08, 'square', 0.06); note(900, 0.1, 'square', 0.06, 0.07); }
  } catch (e) { /* 音が出なくても遊べる */ }
}

// ====== スライムをさわる音（質感で変わる）======
const Snd = (function () {
  let ac = null, nbuf = null, loop = null;
  const ctx = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } };
  const muted = () => typeof S !== 'undefined' && S && S.mute;
  function nb() {
    const c = ctx(); if (!c) return null;
    if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return nbuf;
  }
  // ノイズを、周波数が変わるフィルターに通す（水っぽい音・空気の音・ジャリっという音）
  function burst(o) {
    const c = ctx(); if (!c || muted()) return; const t = c.currentTime + (o.at || 0), dur = o.dur || 0.15;
    const src = c.createBufferSource(); src.buffer = nb(); src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f0 || 1000, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1 || o.f0 || 400), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t + Math.min(0.012, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone(o) {
    const c = ctx(); if (!c || muted()) return; const t = c.currentTime + (o.at || 0), dur = o.dur || 0.15;
    const os = c.createOscillator(), g = c.createGain(); os.type = o.type || 'sine';
    os.frequency.setValueAtTime(o.f0, t); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.f0 * (o.vibDepth || 0.12); l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(c.destination); os.start(t); os.stop(t + dur + 0.05);
  }
  // m: 質感 { hard, bouncy, foam, ooze, sticky, crunch }  depth: 0〜1（押した強さ）
  function kindOf(m) { if ((m.piri || 0) > 0.45) return 'zap'; if ((m.hiyari || 0) > 0.45) return 'ice'; if ((m.shuwa || 0) > 0.45) return 'fizz'; if ((m.mochi || 0) > 0.45) return 'mochi'; if ((m.hokaho || 0) > 0.45) return 'warm'; return kindBase(m); }
  function kindBase(m) { return m.hard > 0.5 ? 'hard' : m.bouncy > 0.55 && m.foam < 0.4 ? 'boing' : m.foam > 0.4 ? 'puff' : m.sticky > 0.45 ? 'gloop' : m.ooze > 0.4 ? 'stringy' : 'wet'; }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function squishFt(k, d) {   // エキスで生まれた新しい感触の音
    if (k === 'ice') { tone({ f0: 2400, f1: 1500, dur: 0.06, vol: 0.1, type: 'triangle' }); burst({ type: 'bandpass', f0: 5200, f1: 2600, q: 4, dur: 0.09, vol: 0.1 }); tone({ f0: 3300, f1: 3100, dur: 0.2, vol: 0.045, at: 0.03 }); return true; }
    if (k === 'warm') { burst({ f0: 700, f1: 170, dur: 0.32, vol: 0.1 * d }); tone({ f0: 140, f1: 80, dur: 0.26, vol: 0.1 }); return true; }
    if (k === 'zap') { burst({ type: 'highpass', f0: 4000, f1: 7500, dur: 0.07, vol: 0.14 }); tone({ f0: 200, f1: 1900, dur: 0.11, vol: 0.08, type: 'sawtooth' }); for (let i = 0; i < 4; i++) burst({ type: 'bandpass', f0: rnd(3000, 8000), f1: 3000, q: 5, dur: 0.02, vol: 0.09, at: 0.05 + i * 0.03 + Math.random() * 0.03 }); return true; }
    if (k === 'fizz') { burst({ type: 'highpass', f0: 3500, f1: 2000, dur: 0.35, vol: 0.05 }); for (let i = 0; i < 9; i++) burst({ type: 'highpass', f0: rnd(4000, 7000), f1: 3000, dur: 0.03, vol: 0.06, at: i * 0.03 + Math.random() * 0.04 }); return true; }
    if (k === 'mochi') { tone({ f0: 230, f1: 130, dur: 0.38, vol: 0.14, vib: 7, vibDepth: 0.15 }); burst({ f0: 500, f1: 150, dur: 0.26, vol: 0.08 }); return true; }
    return false;
  }
  function squish(m, depth) {
    const k = kindOf(m), d = Math.max(0.2, Math.min(1, depth || 0.6));
    if (squishFt(k, d)) { /* 新しい感触 */ } else if (k === 'hard') { tone({ f0: 900, f1: 500, dur: 0.04, vol: 0.1, type: 'triangle' }); burst({ type: 'bandpass', f0: 2500, f1: 800, q: 2, dur: 0.05, vol: 0.12 }); tone({ f0: 140, f1: 90, dur: 0.1, vol: 0.12 * d }); }
    else if (k === 'boing') { burst({ f0: 1400, f1: 300, dur: 0.12, vol: 0.12 * d }); tone({ f0: 150 + 80 * d, f1: 420, dur: 0.5, vol: 0.16, vib: 13, vibDepth: 0.22, at: 0.02 }); }
    else if (k === 'puff') { burst({ type: 'highpass', f0: 1800, f1: 700, dur: 0.22, vol: 0.1 * d }); for (let i = 0; i < 3; i++) tone({ f0: 1400 + Math.random() * 1500, f1: 700, dur: 0.03, vol: 0.05, at: 0.04 + i * 0.05 + Math.random() * 0.04 }); }
    else if (k === 'gloop') { burst({ f0: 800, f1: 160, dur: 0.3, vol: 0.14 * d }); tone({ f0: 260, f1: 90, dur: 0.22, vol: 0.14, vib: 22, vibDepth: 0.3 }); tone({ f0: 420, f1: 160, dur: 0.12, vol: 0.08, at: 0.1 }); }
    else if (k === 'stringy') { burst({ f0: 1000, f1: 260, dur: 0.22, vol: 0.13 * d }); tone({ f0: 300, f1: 140, dur: 0.18, vol: 0.1 }); }
    else { burst({ f0: 1200, f1: 280, dur: 0.18, vol: 0.14 * d }); tone({ f0: 210, f1: 100, dur: 0.14, vol: 0.12 * d }); }
    if ((m.crunch || 0) > 0.15) for (let i = 0; i < 4 + Math.round(8 * m.crunch); i++) burst({ type: 'bandpass', f0: 3000 + Math.random() * 3500, f1: 2000, q: 3, dur: 0.025, vol: 0.07 * m.crunch + 0.02, at: Math.random() * 0.2 });
  }
  function release(m) {   // はなしたとき
    const k = kindOf(m);
    if (k === 'ice') tone({ f0: 2000, f1: 1200, dur: 0.1, vol: 0.08, type: 'triangle' });
    else if (k === 'zap') burst({ type: 'highpass', f0: 5000, f1: 8000, dur: 0.05, vol: 0.1 });
    else if (k === 'fizz') for (let i = 0; i < 5; i++) burst({ type: 'highpass', f0: rnd(4000, 7000), f1: 3000, dur: 0.03, vol: 0.05, at: i * 0.04 });
    else if (k === 'mochi') tone({ f0: 260, f1: 150, dur: 0.4, vol: 0.13, vib: 9, vibDepth: 0.2 });
    else if (k === 'warm') burst({ f0: 600, f1: 200, dur: 0.18, vol: 0.07 });
    else if (k === 'boing') tone({ f0: 320, f1: 160, dur: 0.35, vol: 0.14, vib: 15, vibDepth: 0.25 });
    else if (k === 'hard') tone({ f0: 500, f1: 300, dur: 0.03, vol: 0.08, type: 'triangle' });
    else if (k === 'puff') burst({ type: 'highpass', f0: 1200, f1: 600, dur: 0.12, vol: 0.05 });
    else { burst({ f0: 900, f1: 200, dur: 0.14, vol: 0.09 }); tone({ f0: 240, f1: 110, dur: 0.1, vol: 0.08 }); }
  }
  function snap(m) {      // ちぎれた音
    const k = kindOf(m);
    if (k === 'ice') { for (let i = 0; i < 6; i++) tone({ f0: rnd(1800, 4200), f1: rnd(900, 2000), dur: 0.08, vol: 0.08, type: 'triangle', at: i * 0.025 }); burst({ type: 'highpass', f0: 4000, f1: 1500, dur: 0.14, vol: 0.14 }); }
    else if (k === 'zap') { burst({ type: 'highpass', f0: 3000, f1: 9000, dur: 0.1, vol: 0.2 }); tone({ f0: 900, f1: 60, dur: 0.18, vol: 0.14, type: 'sawtooth' }); }
    else if (k === 'fizz') { tone({ f0: 700, f1: 200, dur: 0.08, vol: 0.14 }); burst({ type: 'highpass', f0: 3000, f1: 1500, dur: 0.12, vol: 0.1 }); }
    else if (k === 'mochi') { tone({ f0: 300, f1: 760, dur: 0.11, vol: 0.13, vib: 10, vibDepth: 0.2 }); tone({ f0: 760, f1: 300, dur: 0.15, vol: 0.1, at: 0.1 }); }
    else if (k === 'warm') { burst({ f0: 900, f1: 200, dur: 0.18, vol: 0.12 }); tone({ f0: 180, f1: 90, dur: 0.16, vol: 0.1 }); }
    else if (k === 'hard') { burst({ type: 'highpass', f0: 3500, f1: 1500, dur: 0.07, vol: 0.2 }); tone({ f0: 1100, f1: 300, dur: 0.06, vol: 0.14, type: 'square' }); tone({ f0: 120, f1: 60, dur: 0.12, vol: 0.14, at: 0.01 }); }
    else if (k === 'boing') { tone({ f0: 900, f1: 220, dur: 0.12, vol: 0.14 }); burst({ f0: 2000, f1: 400, dur: 0.1, vol: 0.12 }); }
    else if (k === 'puff') { burst({ type: 'highpass', f0: 2500, f1: 900, dur: 0.12, vol: 0.1 }); }
    else { tone({ f0: 420, f1: 1100, dur: 0.06, vol: 0.12 }); burst({ f0: 1500, f1: 300, dur: 0.16, vol: 0.14, at: 0.02 }); tone({ f0: 300, f1: 120, dur: 0.14, vol: 0.1, at: 0.04, vib: 20, vibDepth: 0.2 }); }
  }
  // のばしている間ずっと鳴る音（のび具合で高さが変わる）
  function stretchStart(m) {
    const c = ctx(); if (!c || muted() || loop) return;
    const k = kindOf(m), src = c.createBufferSource(); src.buffer = nb(); src.loop = true;
    const f = c.createBiquadFilter(); f.type = k === 'puff' || k === 'fizz' ? 'highpass' : 'bandpass'; f.Q.value = k === 'boing' ? 7 : k === 'hard' || k === 'ice' ? 9 : k === 'gloop' || k === 'mochi' || k === 'warm' ? 3 : 5;
    const g = c.createGain(); g.gain.value = 0.0001; src.connect(f); f.connect(g); g.connect(c.destination); src.start(0, Math.random());
    let lfo = null;
    if (k === 'gloop' || k === 'stringy' || k === 'mochi' || k === 'zap') { lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = k === 'gloop' ? 17 : k === 'zap' ? 38 : k === 'mochi' ? 5 : 6; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
    loop = { src, f, g, k, lfo, ac: c };
  }
  function stretchUpdate(level, speed) {
    if (!loop) return; const { f, g, k, ac: c } = loop, t = c.currentTime;
    const base = { wet: 500, stringy: 420, gloop: 260, boing: 900, puff: 3000, hard: 600, ice: 1400, zap: 2500, fizz: 3500, mochi: 250, warm: 300 }[k], span = { wet: 900, stringy: 1800, gloop: 600, boing: 1500, puff: 2500, hard: 1500, ice: 2400, zap: 3000, fizz: 2500, mochi: 500, warm: 400 }[k];
    f.frequency.setTargetAtTime(base + span * Math.min(1, level / 2.5), t, 0.05);
    const vol = (k === 'hard' ? 0.12 : 0.1) * Math.min(1, speed * 0.8 + level * 0.25);
    g.gain.setTargetAtTime(Math.max(0.0001, vol), t, 0.04);
  }
  function stretchStop() {
    if (!loop) return; const { src, g, lfo, ac: c } = loop; g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
    setTimeout(() => { try { src.stop(); if (lfo) lfo.stop(); } catch (e) { } }, 160); loop = null;
  }
  // めずらしい音（ときどき鳴る）。名前を返す
  function rare() {
    const list = [
      ['ちりーん', () => [880, 1175, 1568, 2093].forEach((f, i) => tone({ f0: f, f1: f, dur: 0.5, vol: 0.09, at: i * 0.09 }))],
      ['ぽこん', () => tone({ f0: 500, f1: 1100, dur: 0.12, vol: 0.18 })],
      ['ぷぎゅっ', () => { tone({ f0: 500, f1: 1200, dur: 0.09, vol: 0.14, type: 'square' }); tone({ f0: 1000, f1: 450, dur: 0.1, vol: 0.12, type: 'square', at: 0.09 }); }],
      ['ぽこぽこ', () => [0, 1, 2, 3, 4].forEach(i => tone({ f0: 400 + i * 90, f1: 900 + i * 90, dur: 0.07, vol: 0.12, at: i * 0.08 }))],
      ['ぴよっ', () => { tone({ f0: 1300, f1: 1900, dur: 0.08, vol: 0.12 }); tone({ f0: 1500, f1: 2100, dur: 0.08, vol: 0.1, at: 0.1 }); }],
      ['ぽわーん', () => tone({ f0: 330, f1: 660, dur: 0.6, vol: 0.14, vib: 6, vibDepth: 0.1 })],
    ];
    const r = list[(Math.random() * list.length) | 0]; r[1](); return r[0];
  }
  function chime() { [660, 880, 1320].forEach((f, i) => tone({ f0: f, f1: f, dur: 0.4, vol: 0.1, at: i * 0.1 })); }
  function boom() { tone({ f0: 110, f1: 38, dur: 0.5, vol: 0.2 }); burst({ f0: 900, f1: 90, dur: 0.45, vol: 0.18 }); for (let i = 0; i < 7; i++) burst({ type: 'highpass', f0: rnd(3000, 8000), f1: 2500, dur: 0.05, vol: 0.06, at: 0.12 + i * 0.05 + Math.random() * 0.05 }); }
  function swoosh(v) { burst({ type: 'bandpass', f0: 500, f1: 2600, q: 1.2, dur: 0.14, vol: 0.1 * (v || 1) }); }
  return { squish, release, snap, rare, chime, boom, swoosh, stretchStart, stretchUpdate, stretchStop, kindOf };
})();
