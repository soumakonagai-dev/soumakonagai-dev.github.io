// ソダテバトル: 効果音とBGM（WebAudioで合成。音声ファイルなし）
'use strict';

const Sound = (() => {
  let ac = null, master = null, bgmGain = null, muted = false;
  try { muted = localStorage.getItem('sodate-battle-mute') === '1'; } catch (e) { /* 無視 */ }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      bgmGain = ac.createGain(); bgmGain.gain.value = 0.5; bgmGain.connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, dur, type, vol, slide, delay, dest) {
    const a = ctx(); if (!a) return;
    const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, vol, f0, f1, delay, type, dest) {
    const a = ctx(); if (!a) return;
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t0 = a.currentTime + (delay || 0), s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || master); s.start(t0); s.stop(t0 + dur + 0.05);
  }
  const SE = {
    click: () => tone(660, 0.07, 'triangle', 0.12, 990),
    ok: () => { tone(660, 0.08, 'square', 0.08); tone(990, 0.12, 'square', 0.08, null, 0.07); },
    buy: () => { tone(988, 0.08, 'square', 0.08); tone(1318, 0.18, 'square', 0.08, null, 0.08); },
    train: () => { tone(330, 0.1, 'square', 0.1); tone(440, 0.1, 'square', 0.1, null, 0.08); tone(660, 0.2, 'square', 0.1, null, 0.16); },
    great: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.09, null, i * 0.07)); },
    learn: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, null, i * 0.09)); },
    swing: () => noise(0.14, 0.18, 3000, 500, 0, 'bandpass'),
    hit: () => { noise(0.12, 0.35, 2500, 200, 0, 'lowpass'); tone(160, 0.12, 'sine', 0.3, 60); },
    crit: () => { noise(0.2, 0.4, 5000, 300, 0, 'lowpass'); tone(220, 0.2, 'sawtooth', 0.2, 60); tone(1400, 0.1, 'square', 0.1, 600); },
    guard: () => { tone(1200, 0.1, 'square', 0.12, 700); noise(0.06, 0.2, 6000, 2000, 0, 'highpass'); },
    break: () => { noise(0.4, 0.4, 4000, 150, 0, 'lowpass'); tone(300, 0.3, 'sawtooth', 0.2, 60); },
    shot: () => { tone(900, 0.15, 'triangle', 0.15, 300); },
    magic: () => { tone(500, 0.3, 'sine', 0.15, 1400); tone(750, 0.3, 'triangle', 0.08, 2100, 0.03); },
    fire: () => { noise(0.4, 0.3, 1800, 300, 0, 'lowpass'); tone(200, 0.3, 'sawtooth', 0.1, 90); },
    water: () => { tone(700, 0.25, 'sine', 0.15, 300); tone(1100, 0.2, 'sine', 0.08, 500, 0.05); },
    thunder: () => { noise(0.3, 0.5, 8000, 400, 0, 'highpass'); tone(90, 0.4, 'sawtooth', 0.2, 40); },
    quake: () => { tone(70, 0.5, 'sine', 0.5, 30); noise(0.5, 0.4, 600, 60, 0, 'lowpass'); },
    explode: () => { noise(0.6, 0.5, 2500, 80, 0, 'lowpass'); tone(110, 0.5, 'sine', 0.4, 35); },
    ult: () => { for (let i = 0; i < 8; i++) tone(220 * Math.pow(1.122, i * 2), 0.18, 'sawtooth', 0.09, null, i * 0.05); noise(0.8, 0.3, 300, 6000, 0, 'bandpass'); tone(80, 0.8, 'sine', 0.4, 40, 0.4); },
    heal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, null, i * 0.08)); },
    buff: () => { tone(440, 0.4, 'triangle', 0.12, 880); tone(660, 0.4, 'triangle', 0.1, 1320, 0.1); },
    step: () => noise(0.18, 0.18, 1800, 300, 0, 'bandpass'),
    dash: () => { noise(0.25, 0.25, 4000, 400, 0, 'bandpass'); tone(300, 0.2, 'sawtooth', 0.06, 900); },
    tele: () => { tone(1500, 0.25, 'sine', 0.12, 200); tone(300, 0.25, 'sine', 0.12, 1500, 0.1); },
    ko: () => { noise(0.8, 0.5, 3000, 60, 0, 'lowpass'); tone(200, 0.8, 'sawtooth', 0.25, 40); },
    win: () => { [523, 523, 523, 659, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.1, null, i * 0.14)); },
    lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, null, i * 0.22)); },
    fight: () => { tone(440, 0.1, 'square', 0.12); tone(880, 0.4, 'square', 0.14, null, 0.12); },
    ready: () => tone(330, 0.12, 'square', 0.1),
    warn: () => { tone(900, 0.12, 'square', 0.1); },
  };
  function play(name) { if (muted) return; try { if (SE[name]) SE[name](); } catch (e) { /* 無視 */ } }

  // ---------- BGM ----------
  const SCALE_MIN = [0, 2, 3, 5, 7, 8, 10];
  const BGMS = {
    home: { bpm: 84, root: 57, prog: [0, -4, -2, -5], drums: false, lead: 'bell' },
    battle0: { bpm: 140, root: 52, prog: [0, -4, 3, -2], drums: true, lead: 'saw' },
    battle1: { bpm: 150, root: 50, prog: [0, 1, -2, -4], drums: true, lead: 'saw' },
    battle2: { bpm: 138, root: 55, prog: [0, -4, -2, 3], drums: true, lead: 'tri' },
    battle3: { bpm: 152, root: 53, prog: [0, -2, -4, -5], drums: true, lead: 'saw' },
    battle4: { bpm: 144, root: 51, prog: [0, -4, -2, -1], drums: true, lead: 'tri' },
    battle5: { bpm: 160, root: 48, prog: [0, 1, 0, -2], drums: true, lead: 'saw' },
  };
  let cur = null, timer = 0, step = 0, nextT = 0, song = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function sched() {
    const a = ac; if (!a || !song) return;
    const sp = 60 / song.bpm / 4;
    while (nextT < a.currentTime + 0.3) {
      const s = step % 16, bar = Math.floor(step / 16) % 4, ch = song.prog[bar], t = nextT - a.currentTime;
      if (song.drums) {
        if (s % 4 === 0) { tone(120, 0.15, 'sine', 0.5, 40, t, bgmGain); }
        if (s % 8 === 4) noise(0.12, 0.25, 4000, 1500, t, 'bandpass', bgmGain);
        if (s % 2 === 1) noise(0.04, 0.08, 9000, 6000, t, 'highpass', bgmGain);
        if ([0, 3, 6, 8, 11, 14].includes(s)) tone(mtof(song.root - 12 + ch), sp * 2.2, 'sawtooth', 0.16, null, t, bgmGain);
        const deg = [0, 2, 4, 2, 5, 4, 2, 4][s % 8] + (bar % 2 ? 1 : 0);
        if (s % 2 === 0) tone(mtof(song.root + 12 + ch + SCALE_MIN[deg % 7] + (deg >= 7 ? 12 : 0)), sp * 1.8, song.lead === 'saw' ? 'sawtooth' : 'triangle', 0.07, null, t, bgmGain);
      } else {
        if (s === 0) [0, 3, 7].forEach(n => tone(mtof(song.root + ch + n), sp * 15, 'sine', 0.07, null, t, bgmGain));
        if (s % 4 === 0) tone(mtof(song.root - 12 + ch), sp * 4, 'triangle', 0.1, null, t, bgmGain);
        if (s % 2 === 0 && Math.random() < 0.55) tone(mtof(song.root + 24 + ch + SCALE_MIN[(Math.random() * 7) | 0]), sp * 3, 'sine', 0.05, null, t, bgmGain);
      }
      nextT += sp; step++;
    }
  }
  function bgm(name) {
    if (cur === name) return;
    cur = name;
    clearInterval(timer);
    if (!name || !BGMS[name]) { song = null; return; }
    const a = ctx(); if (!a) return;
    song = BGMS[name]; step = 0; nextT = a.currentTime + 0.1;
    timer = setInterval(sched, 80);
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('sodate-battle-mute', muted ? '1' : '0'); } catch (e) { /* 無視 */ }
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  return { play, bgm, toggleMute, isMuted: () => muted, unlock: ctx };
})();
