// 効果音（WebAudio で合成。音声ファイルは使わない）
BB.sfx = (function () {
  let ac = null, muted = false;
  try { muted = localStorage.getItem('bb-muted') === '1'; } catch (e) { /* 保存できなくても動く */ }

  function init() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function tone(freq, dur, o) {
    if (!ac || muted) return;
    o = o || {};
    const t0 = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + o.slide), t0 + dur);
    const v = o.vol === undefined ? .14 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(.015, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0); osc.stop(t0 + dur + .02);
  }
  function noise(dur, o) {
    if (!ac || muted) return;
    o = o || {};
    const t0 = ac.currentTime + (o.delay || 0), n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = o.type || 'lowpass'; f.frequency.value = o.freq || 900;
    g.gain.value = o.vol === undefined ? .25 : o.vol;
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t0);
  }
  const arp = (notes, step, o) => notes.forEach((f, i) => tone(f, .18, Object.assign({ delay: i * step }, o)));

  const SOUNDS = {
    ui:      () => tone(660, .08, { type: 'triangle' }),
    pick:    () => tone(520, .06, { type: 'triangle', vol: .08 }),
    place:   () => { tone(180, .09, { type: 'square', vol: .08, slide: -80 }); noise(.05, { freq: 1500, vol: .08 }); },
    clear:   n => arp([523, 659, 784, 1047, 1319].slice(0, Math.min(5, 2 + (n || 1))), .05, { type: 'triangle', vol: .12 }),
    combo:   n => tone(440 + Math.min(n, 10) * 60, .2, { type: 'square', vol: .07, slide: 200 }),
    hit:     () => { tone(220, .12, { type: 'sawtooth', vol: .12, slide: -140 }); noise(.1, { freq: 2500, vol: .18 }); },
    magic:   () => { tone(880, .25, { type: 'sine', vol: .1, slide: 600 }); tone(1320, .25, { delay: .05, vol: .06, slide: 400 }); },
    heal:    () => arp([523, 659, 784], .07, { type: 'sine', vol: .12 }),
    guard:   () => { tone(330, .18, { type: 'triangle', vol: .13, slide: 120 }); tone(660, .18, { delay: .05, type: 'triangle', vol: .08 }); },
    poison:  () => tone(180, .3, { type: 'sawtooth', vol: .08, slide: 120 }),
    charge:  () => tone(400, .3, { type: 'square', vol: .07, slide: 800 }),
    stun:    () => arp([700, 520, 700, 520], .06, { type: 'square', vol: .06 }),
    windup:  () => tone(120, .5, { type: 'sawtooth', vol: .09, slide: 120 }),
    windupBig: () => { tone(90, .7, { type: 'sawtooth', vol: .12, slide: 160 }); tone(180, .7, { type: 'sawtooth', vol: .06, slide: 300 }); },
    enemyHit: () => { tone(130, .25, { type: 'sawtooth', vol: .2, slide: -90 }); noise(.22, { freq: 1800, vol: .3 }); },
    bigHit:  () => { tone(80, .5, { type: 'sawtooth', vol: .26, slide: -50 }); noise(.45, { freq: 1200, vol: .45 }); },
    stone:   () => { tone(100, .2, { type: 'square', vol: .14, slide: -60 }); noise(.18, { freq: 700, vol: .35 }); },
    freeze:  () => { arp([1568, 1319, 1175, 1568, 2093], .05, { type: 'sine', vol: .08 }); noise(.3, { type: 'highpass', freq: 5000, vol: .12 }); },
    defend:  () => { tone(260, .3, { type: 'triangle', vol: .13, slide: 200 }); },
    seal:    () => { tone(300, .5, { type: 'sawtooth', vol: .07, slide: -200 }); tone(450, .5, { type: 'sine', vol: .08, slide: -300 }); },
    special: () => { arp([392, 523, 659, 784, 1047], .06, { type: 'sawtooth', vol: .1 }); noise(.4, { delay: .3, freq: 3000, vol: .3 }); },
    perfect: () => arp([523, 659, 784, 1047, 1319, 1568], .07, { type: 'triangle', vol: .12 }),
    down:    () => { tone(300, .6, { type: 'sawtooth', vol: .15, slide: -250 }); noise(.5, { freq: 1500, vol: .3 }); },
    collapse: () => { tone(70, .6, { type: 'square', vol: .2, slide: -30 }); noise(.5, { freq: 600, vol: .4 }); },
    win:     () => arp([523, 659, 784, 1047, 784, 1047, 1319], .12, { type: 'triangle', vol: .13 }),
    lose:    () => arp([392, 349, 311, 262], .22, { type: 'sawtooth', vol: .1 })
  };

  return {
    init,
    play(name, arg) { if (SOUNDS[name]) SOUNDS[name](arg); },
    get muted() { return muted; },
    get ctx() { return ac; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('bb-muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      init(); if (BB.music) BB.music.setMuted(muted);
      if (!muted) SOUNDS.ui();
    }
  };
})();
