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
  function kindOf(m) { return m.hard > 0.5 ? 'hard' : m.bouncy > 0.55 && m.foam < 0.4 ? 'boing' : m.foam > 0.4 ? 'puff' : m.sticky > 0.45 ? 'gloop' : m.ooze > 0.4 ? 'stringy' : 'wet'; }
  function squish(m, depth) {
    const k = kindOf(m), d = Math.max(0.2, Math.min(1, depth || 0.6));
    if (k === 'hard') { tone({ f0: 900, f1: 500, dur: 0.04, vol: 0.1, type: 'triangle' }); burst({ type: 'bandpass', f0: 2500, f1: 800, q: 2, dur: 0.05, vol: 0.12 }); tone({ f0: 140, f1: 90, dur: 0.1, vol: 0.12 * d }); }
    else if (k === 'boing') { burst({ f0: 1400, f1: 300, dur: 0.12, vol: 0.12 * d }); tone({ f0: 150 + 80 * d, f1: 420, dur: 0.5, vol: 0.16, vib: 13, vibDepth: 0.22, at: 0.02 }); }
    else if (k === 'puff') { burst({ type: 'highpass', f0: 1800, f1: 700, dur: 0.22, vol: 0.1 * d }); for (let i = 0; i < 3; i++) tone({ f0: 1400 + Math.random() * 1500, f1: 700, dur: 0.03, vol: 0.05, at: 0.04 + i * 0.05 + Math.random() * 0.04 }); }
    else if (k === 'gloop') { burst({ f0: 800, f1: 160, dur: 0.3, vol: 0.14 * d }); tone({ f0: 260, f1: 90, dur: 0.22, vol: 0.14, vib: 22, vibDepth: 0.3 }); tone({ f0: 420, f1: 160, dur: 0.12, vol: 0.08, at: 0.1 }); }
    else if (k === 'stringy') { burst({ f0: 1000, f1: 260, dur: 0.22, vol: 0.13 * d }); tone({ f0: 300, f1: 140, dur: 0.18, vol: 0.1 }); }
    else { burst({ f0: 1200, f1: 280, dur: 0.18, vol: 0.14 * d }); tone({ f0: 210, f1: 100, dur: 0.14, vol: 0.12 * d }); }
    if ((m.crunch || 0) > 0.15) for (let i = 0; i < 4 + Math.round(8 * m.crunch); i++) burst({ type: 'bandpass', f0: 3000 + Math.random() * 3500, f1: 2000, q: 3, dur: 0.025, vol: 0.07 * m.crunch + 0.02, at: Math.random() * 0.2 });
  }
  function release(m) {   // はなしたとき
    const k = kindOf(m);
    if (k === 'boing') tone({ f0: 320, f1: 160, dur: 0.35, vol: 0.14, vib: 15, vibDepth: 0.25 });
    else if (k === 'hard') tone({ f0: 500, f1: 300, dur: 0.03, vol: 0.08, type: 'triangle' });
    else if (k === 'puff') burst({ type: 'highpass', f0: 1200, f1: 600, dur: 0.12, vol: 0.05 });
    else { burst({ f0: 900, f1: 200, dur: 0.14, vol: 0.09 }); tone({ f0: 240, f1: 110, dur: 0.1, vol: 0.08 }); }
  }
  function snap(m) {      // ちぎれた音
    const k = kindOf(m);
    if (k === 'hard') { burst({ type: 'highpass', f0: 3500, f1: 1500, dur: 0.07, vol: 0.2 }); tone({ f0: 1100, f1: 300, dur: 0.06, vol: 0.14, type: 'square' }); tone({ f0: 120, f1: 60, dur: 0.12, vol: 0.14, at: 0.01 }); }
    else if (k === 'boing') { tone({ f0: 900, f1: 220, dur: 0.12, vol: 0.14 }); burst({ f0: 2000, f1: 400, dur: 0.1, vol: 0.12 }); }
    else if (k === 'puff') { burst({ type: 'highpass', f0: 2500, f1: 900, dur: 0.12, vol: 0.1 }); }
    else { tone({ f0: 420, f1: 1100, dur: 0.06, vol: 0.12 }); burst({ f0: 1500, f1: 300, dur: 0.16, vol: 0.14, at: 0.02 }); tone({ f0: 300, f1: 120, dur: 0.14, vol: 0.1, at: 0.04, vib: 20, vibDepth: 0.2 }); }
  }
  // のばしている間ずっと鳴る音（のび具合で高さが変わる）
  function stretchStart(m) {
    const c = ctx(); if (!c || muted() || loop) return;
    const k = kindOf(m), src = c.createBufferSource(); src.buffer = nb(); src.loop = true;
    const f = c.createBiquadFilter(); f.type = k === 'puff' ? 'highpass' : 'bandpass'; f.Q.value = k === 'boing' ? 7 : k === 'hard' ? 9 : k === 'gloop' ? 3 : 5;
    const g = c.createGain(); g.gain.value = 0.0001; src.connect(f); f.connect(g); g.connect(c.destination); src.start(0, Math.random());
    let lfo = null;
    if (k === 'gloop' || k === 'stringy') { lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = k === 'gloop' ? 17 : 6; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
    loop = { src, f, g, k, lfo, ac: c };
  }
  function stretchUpdate(level, speed) {
    if (!loop) return; const { f, g, k, ac: c } = loop, t = c.currentTime;
    const base = { wet: 500, stringy: 420, gloop: 260, boing: 900, puff: 3000, hard: 600 }[k], span = { wet: 900, stringy: 1800, gloop: 600, boing: 1500, puff: 2500, hard: 1500 }[k];
    f.frequency.setTargetAtTime(base + span * Math.min(1, level / 2.5), t, 0.05);
    const vol = (k === 'hard' ? 0.12 : 0.1) * Math.min(1, speed * 0.8 + level * 0.25);
    g.gain.setTargetAtTime(Math.max(0.0001, vol), t, 0.04);
  }
  function stretchStop() {
    if (!loop) return; const { src, g, lfo, ac: c } = loop; g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
    setTimeout(() => { try { src.stop(); if (lfo) lfo.stop(); } catch (e) { } }, 160); loop = null;
  }
  return { squish, release, snap, stretchStart, stretchUpdate, stretchStop, kindOf };
})();
