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
