// カゲヌケ BGM。audio/ の楽器サンプル（ピアノ・ハープ・フルート・コントラバス）を鳴らし、
// ゆっくりした「ちょっと不気味で、落ち着く」曲を、章ごとにその場で作って流す。
// サンプルの出典とライセンスは audio/LICENSE-tonejs-instruments.txt と audio/sample-source-info.txt を参照。
(function (root) {
'use strict';

const MANIFEST = {
  piano: 'C2 C3 Fs3 C4 Ds4 A4 C5',
  harp: 'C3 E3 A4 C5 E5 G5',
  flute: 'C4 C5 A5 E6',
  bass: 'G1 C2 Fs2 E3'
};
const DIR = { piano: 'piano', harp: 'harp', flute: 'flute', bass: 'contrabass' };
const VOLUME = { piano: 0.9, harp: 0.8, flute: 0.7, bass: 1.0 };
const PC = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
const midi = name => { const m = /^([A-G]s?)(-?\d)$/.exec(name); return PC[m[1]] + (+m[2] + 1) * 12; };

function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// ---------- 曲づくり ----------
// p: { root(基準音), scale(音階), prog(各小節の根音のずれ), rounds, harp, flute, bell, bpm, drone }
function compose(p, seed) {
  const rnd = rng(seed), ev = [];
  const bars = p.prog.length * p.rounds;
  const walk = []; for (let o = 0; o < 3; o++) for (const s of p.scale) walk.push(p.root + 12 + o * 12 + s);
  let wi = 5;
  for (let bar = 0; bar < bars; bar++) {
    const deg = p.prog[bar % p.prog.length], r = p.root + deg, b0 = bar * 4;
    const minor = p.scale.includes(3);
    const tri = [0, minor ? 3 : 4, 7];
    // ひくい持続音
    ev.push({ beat: b0, inst: 'bass', midi: r - 12, dur: 4, vel: 0.5 });
    if (bar % 2 === 0) ev.push({ beat: b0 + 0.02, inst: 'bass', midi: r - 5, dur: 4, vel: 0.22 });
    // ピアノのやわらかいコード（ときどき）
    if (rnd() < p.pad) tri.forEach((t, i) => ev.push({ beat: b0 + 0.05 * i, inst: 'piano', midi: r + t + (i ? 12 : 0), dur: 4, vel: 0.16 }));
    // ハープ: まばらなアルペジオ
    const tones = [0, tri[1], 7, 12, 12 + tri[1], 19, p.eerie ? 13 : 14];
    for (let i = 0; i < 8; i++) {
      if (rnd() < p.harp) {
        let m = r + tones[(rnd() * tones.length) | 0] + (r < 48 ? 12 : 0);
        if (p.eerie && rnd() < 0.12) m = r + 13;           // 半音上のぶつかり（ふあん）
        ev.push({ beat: b0 + i * 0.5, inst: 'harp', midi: m, dur: 1.2, vel: 0.2 + rnd() * 0.18 });
      }
    }
    // フルート: ゆっくりした旋律（息のような音）
    if (rnd() < p.flute) {
      const len = [2, 3, 4][(rnd() * 3) | 0], at = [0, 0, 1, 2][(rnd() * 4) | 0];
      wi = Math.max(2, Math.min(walk.length - 3, wi + [-2, -1, -1, 0, 1, 1, 2][(rnd() * 7) | 0]));
      ev.push({ beat: b0 + at, inst: 'flute', midi: walk[wi], dur: Math.min(len, 4 - at + 0.5), vel: 0.34 });
    }
    // 高い鐘のような音（ピアノ）
    if (rnd() < p.bell) ev.push({ beat: b0 + (rnd() < 0.5 ? 1 : 3) + 0.5, inst: 'piano', midi: walk[(rnd() * walk.length) | 0] + 12, dur: 2, vel: 0.2 });
  }
  ev.sort((a, b) => a.beat - b.beat);
  return { bpm: p.bpm, beats: bars * 4, events: ev, drone: p.drone, root: p.root, once: !!p.once };
}

const MINOR = [0, 2, 3, 5, 7, 8, 10], PHRYG = [0, 1, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10], LYDIAN = [0, 2, 4, 6, 7, 9, 11], WHOLE = [0, 2, 4, 6, 8, 10];
const MOODS = {
  title: { root: midi('D3'), scale: MINOR, prog: [0, 8, 3, 10], rounds: 4, harp: 0.5, flute: 0.65, bell: 0.35, pad: 0.7, bpm: 54, drone: 1, eerie: true },
  m1: { root: midi('D3'), scale: MINOR, prog: [0, 0, 8, 10, 0, 5, 8, 7], rounds: 2, harp: 0.42, flute: 0.5, bell: 0.4, pad: 0.6, bpm: 52, drone: 1, eerie: true },
  m2: { root: midi('B2'), scale: PHRYG, prog: [0, 1, 0, 8, 0, 3, 1, 0], rounds: 2, harp: 0.28, flute: 0.35, bell: 0.3, pad: 0.8, bpm: 46, drone: 1.3, eerie: true },
  m3: { root: midi('E3'), scale: DORIAN, prog: [0, 5, 3, 10, 0, 7, 5, 3], rounds: 2, harp: 0.45, flute: 0.55, bell: 0.45, pad: 0.55, bpm: 56, drone: 1, eerie: true },
  m4: { root: midi('G3'), scale: MINOR, prog: [0, 3, 8, 5, 0, 10, 8, 7], rounds: 2, harp: 0.5, flute: 0.6, bell: 0.35, pad: 0.5, bpm: 58, drone: 0.9, eerie: false },
  m5: { root: midi('A2'), scale: WHOLE, prog: [0, 2, 6, 4, 0, 8, 6, 2], rounds: 2, harp: 0.4, flute: 0.5, bell: 0.5, pad: 0.6, bpm: 50, drone: 1.2, eerie: true },
  clear: { root: midi('D3'), scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 7, 0], rounds: 1, harp: 0.8, flute: 0.8, bell: 0.7, pad: 0.8, bpm: 66, drone: 0.3, eerie: false, once: true }
};
const CHAPTER_MOOD = { 1: 'm1', 2: 'm1', 3: 'm2', 4: 'm2', 5: 'm3', 6: 'm3', 7: 'm4', 8: 'm4', 9: 'm5', 10: 'm5' };

const trackCache = {};
function getTrack(name) {
  if (trackCache[name]) return trackCache[name];
  let t = null;
  if (name === 'title' || name === 'clear') t = compose(MOODS[name], name === 'title' ? 11 : 77);
  else if (/^c\d+$/.test(name)) { const n = +name.slice(1); t = compose(MOODS[CHAPTER_MOOD[n] || 'm1'], 100 + n * 13); }
  return (trackCache[name] = t);
}

// ---------- 再生エンジン ----------
let ac = null, master = null, wet = null, ready = false, loading = false;
const bank = { piano: [], harp: [], flute: [], bass: [] };
let want = null, cur = null, muted = false, ducked = false;
try { muted = localStorage.getItem('kagenuke.mute') === '1'; } catch (e) {}

function volume() { return muted ? 0 : (ducked ? 0.16 : 0.5); }

function makeReverb() {
  const len = Math.floor(ac.sampleRate * 3.6), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
  const conv = ac.createConvolver(); conv.buffer = ir;
  const g = ac.createGain(); g.gain.value = 0.55;
  conv.connect(g).connect(master);
  return conv;
}

function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = volume(); master.connect(ac.destination);
    wet = makeReverb();
    load();
  }
  if (ac.state === 'suspended') ac.resume();
}

function load() {
  if (loading) return;
  loading = true;
  const jobs = [];
  for (const inst of Object.keys(MANIFEST)) for (const n of MANIFEST[inst].split(' ')) {
    jobs.push(fetch('audio/' + DIR[inst] + '/' + n + '.mp3')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
      .then(buf => { bank[inst].push({ midi: midi(n), buf }); })
      .catch(() => {}));
  }
  Promise.all(jobs).then(() => {
    ready = Object.keys(bank).every(k => bank[k].length > 0);
    if (ready && want) startTrack(want);
  });
}

function sampler(inst, m, t, dur, vel) {
  const list = bank[inst];
  if (!list.length) return;
  let best = list[0];
  for (const s of list) if (Math.abs(s.midi - m) < Math.abs(best.midi - m)) best = s;
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = best.buf; src.playbackRate.value = Math.pow(2, (m - best.midi) / 12);
  const v = vel * VOLUME[inst], sustain = inst === 'flute' || inst === 'bass';
  const end = t + dur;
  if (sustain) {
    const att = inst === 'flute' ? 0.35 : 0.9;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att);
    g.gain.setValueAtTime(v, Math.max(t + att, end - 0.6)); g.gain.linearRampToValueAtTime(0, end + 0.9);
  } else {
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, end - 0.2); g.gain.linearRampToValueAtTime(0, end + 1.6);
  }
  src.connect(g); g.connect(cur.gain);
  src.start(t); src.stop(end + 2);
}

// ひくい うなり（ドローン）と、風のような音
function ambience(track, gainNode) {
  const nodes = [];
  const root = 440 * Math.pow(2, (track.root - 24 - 69) / 12);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 0.7;
  const dg = ac.createGain(); dg.gain.value = 0.05 * (track.drone || 1);
  lp.connect(dg).connect(gainNode);
  for (const [type, f, det] of [['sine', root, 0], ['triangle', root * 1.5, 4], ['sine', root * 2.003, -3]]) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(); nodes.push(o);
  }
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 90;
  lfo.connect(lg).connect(lp.frequency); lfo.start(); nodes.push(lfo);
  // 風
  const len = ac.sampleRate * 3, nb = ac.createBuffer(1, len, ac.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.8;
  const wg = ac.createGain(); wg.gain.value = 0.012;
  const l2 = ac.createOscillator(), l2g = ac.createGain(); l2.frequency.value = 0.045; l2g.gain.value = 0.01; l2.connect(l2g).connect(wg.gain); l2.start();
  const l3 = ac.createOscillator(), l3g = ac.createGain(); l3.frequency.value = 0.05; l3g.gain.value = 260; l3.connect(l3g).connect(bp.frequency); l3.start();
  ns.connect(bp).connect(wg).connect(gainNode); ns.start();
  nodes.push(ns, l2, l3);
  return nodes;
}

function startTrack(name) {
  stopTrack(0.6);
  const tr = getTrack(name);
  if (!tr || !ready || !ac) return;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(1, ac.currentTime + (tr.once ? 0.05 : 2.5));
  gain.connect(master); gain.connect(wet);
  const spb = 60 / tr.bpm;
  const nodes = tr.drone ? ambience(tr, gain) : [];
  cur = { name, gain, idx: 0, loop: 0, t0: ac.currentTime + 0.3, spb, tr, timer: null, nodes };
  const track = cur;
  track.timer = setInterval(() => {
    if (cur !== track) { clearInterval(track.timer); return; }
    const horizon = ac.currentTime + 0.5;
    for (;;) {
      const e = tr.events[track.idx], t = track.t0 + (track.loop * tr.beats + e.beat) * spb;
      if (t > horizon) break;
      if (t >= ac.currentTime - 0.05) sampler(e.inst, e.midi, t, e.dur * spb, e.vel);
      if (++track.idx >= tr.events.length) {
        if (tr.once) { clearInterval(track.timer); return; }
        track.idx = 0; track.loop++;
      }
    }
  }, 50);
}

function stopTrack(fade) {
  if (!cur) return;
  const c = cur; cur = null;
  clearInterval(c.timer);
  const t = ac.currentTime, f = fade || 0.6;
  c.gain.gain.cancelScheduledValues(t);
  c.gain.gain.setValueAtTime(c.gain.gain.value, t);
  c.gain.gain.linearRampToValueAtTime(0, t + f);
  setTimeout(() => { c.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { c.gain.disconnect(); } catch (e) {} }, (f + 3) * 1000);
}

function applyVolume() { if (master) master.gain.setTargetAtTime(volume(), ac.currentTime, 0.15); }

root.Music = {
  unlock,
  play(name) {
    want = name;
    if (cur && cur.name === name) return;
    if (ready && ac) startTrack(name);
  },
  stop() { want = null; stopTrack(0.6); },
  duck(on) { ducked = !!on; applyVolume(); },
  toggleMute() { muted = !muted; try { localStorage.setItem('kagenuke.mute', muted ? '1' : '0'); } catch (e) {} applyVolume(); return muted; },
  get muted() { return muted; },
  get _ctx() { return ac; }, get _master() { return master; }, get _cur() { return cur; },
  get ready() { return ready; },
  chapterTrack(id) { return 'c' + String(id).split('-')[0]; }
};
})(window);
