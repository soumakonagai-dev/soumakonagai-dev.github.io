// BGM。audio/ の楽器サンプル（ピアノ・ハープ・フルート・シロフォン）を鳴らして、曲はここで打ち込んでいる。
// サンプルの出典とライセンスは audio/LICENSE-tonejs-instruments.txt と audio/sample-source-info.txt を参照。
BB.music = (function () {
  const MANIFEST = {
    piano: 'C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6',
    harp: 'A2 C3 E3 G3 B3 D4 F4 A4 C5 E5 G5',
    flute: 'A4 A5 A6 C4 C5 C6 C7 E4 E5 E6',
    xylo: 'C5 C6 C7 C8 G4 G5 G6 G7'
  };
  const DIR = { piano: 'piano', harp: 'harp', flute: 'flute', xylo: 'xylophone' };
  const VOLUME = { piano: 1, harp: .8, flute: .85, xylo: .7 };

  const PC = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
  const midi = name => { const m = /^([A-G]s?)(-?\d)$/.exec(name); return PC[m[1]] + (+m[2] + 1) * 12; };

  // ---------- 曲の打ち込み ----------
  // 'E5:1 A5:.5 r:.5' のように「音名:長さ(拍)」を並べる。r は休符。
  function seq(str, inst, start, vel) {
    let b = start;
    const out = [];
    str.trim().split(/\s+/).forEach(tok => {
      const [n, d] = tok.split(':'), dur = +d;
      if (n !== 'r') out.push({ beat: b, inst, midi: midi(n), dur, vel });
      b += dur;
    });
    return out;
  }
  const triad = (root, q) => [0, q === 'm' ? 3 : 4, 7].map(i => root + i);

  // コード進行(1 小節 4 拍)と旋律から、伴奏つきの曲を組み立てる
  function build(o) {
    const ev = [];
    o.chords.forEach(([rootName, q], bar) => {
      const b0 = bar * 4, r = midi(rootName), tri = triad(r, q);
      if (o.bass === 'drive') {            // 8 分で刻むベース
        [0, 0, 12, 0, 0, 12, 0, 12].forEach((off, i) => ev.push({ beat: b0 + i * .5, inst: 'piano', midi: r + off, dur: .45, vel: i % 2 ? .38 : .62 }));
      } else if (o.bass === 'pulse') {     // 4 分のベース＋裏拍のコード
        [[0, r, .9], [1, r + 7, .5], [2, r, .8], [3, r + 7, .5]].forEach(([b, m, v]) => ev.push({ beat: b0 + b, inst: 'piano', midi: m, dur: .9, vel: v }));
        [1.5, 3.5].forEach(b => tri.forEach(m => ev.push({ beat: b0 + b, inst: 'piano', midi: m + 12, dur: .35, vel: .28 })));
      } else if (o.bass === 'pad') {       // 全音符のコード
        tri.forEach((m, i) => ev.push({ beat: b0, inst: 'piano', midi: m + (i ? 12 : 0), dur: 4, vel: .5 }));
      }
      // ハープのアルペジオ（8 分音符）
      const h = r < 48 ? r + 12 : r, t3 = tri[1] - r + h;
      const arp = o.arp === 'slow'
        ? [h, h + 7, h + 12, t3 + 12, h + 12, h + 7, t3, h + 7]
        : [h, h + 7, h + 12, t3 + 12, h + 19, t3 + 12, h + 12, h + 7];
      if (o.arp === 'fast') {              // 16 分で駆け上がる
        const up = [h, t3, h + 7, h + 12, t3 + 12, h + 19, t3 + 12, h + 12];
        for (let i = 0; i < 16; i++) ev.push({ beat: b0 + i * .25, inst: 'harp', midi: up[i % 8], dur: .5, vel: (o.arpVel || .5) * (i % 4 === 0 ? 1.15 : .8) });
      } else arp.forEach((m, i) => ev.push({ beat: b0 + i * .5, inst: 'harp', midi: m, dur: 1, vel: o.arpVel || .55 }));
      // ピアノのコードスタブ（シンコペーション）
      if (o.stabs) [0, 1.5, 3].forEach(b => tri.forEach(m => ev.push({ beat: b0 + b, inst: 'piano', midi: m + 12, dur: .35, vel: .4 })));
      // ドラム
      if (o.drums) {
        const boss = o.drums === 'boss', fill = bar % 4 === 3;
        (boss ? [0, .5, 1.5, 2, 2.5, 3.5] : [0, 1.5, 2, 3.5]).forEach(b => ev.push({ beat: b0 + b, inst: 'kick', vel: b % 1 ? .75 : 1 }));
        [1, 3].forEach(b => { if (!(fill && b === 3)) ev.push({ beat: b0 + b, inst: 'snare', vel: .95 }); });
        for (let i = 0; i < 16; i++) ev.push({ beat: b0 + i * .25, inst: 'hat', vel: i % 4 === 2 ? .8 : i % 2 ? .3 : .5 });
        if (fill) for (let i = 0; i < 4; i++) ev.push({ beat: b0 + 3 + i * .25, inst: 'snare', vel: .6 + i * .15 });   // 4 小節ごとのフィル
        if (bar % 8 === 0) ev.push({ beat: b0, inst: 'crash', vel: 1 });
      }
    });
    o.melody.forEach((bar, i) => {
      ev.push(...seq(bar, o.lead || 'flute', i * 4, o.leadVel || .85));
      if (o.double && i >= o.double.from) ev.push(...seq(bar, 'xylo', i * 4, o.double.vel).map(e => (e.midi += 12, e)));
    });
    (o.extra || []).forEach(e => ev.push(...e));
    ev.sort((a, b) => a.beat - b.beat);
    return { bpm: o.bpm, beats: o.chords.length * 4, events: ev };
  }

  const TRACKS = {
    // タイトル：ゆったりした A マイナー
    title: build({
      bpm: 84, bass: 'pad', arp: 'slow', arpVel: .5,
      chords: [['A2', 'm'], ['F2', 'M'], ['C3', 'M'], ['G2', 'M'], ['A2', 'm'], ['F2', 'M'], ['E2', 'M'], ['A2', 'm']],
      melody: [
        'E5:2 A5:2', 'C6:2 A5:1 F5:1', 'G5:2 E5:2', 'D5:3 B4:1',
        'E5:2 A5:1 C6:1', 'D6:2 C6:1 A5:1', 'B5:2 Gs5:2', 'A5:4'
      ]
    }),
    // 通常バトル：勢いのある A マイナー（A→B の 16 小節）
    battle: build({
      bpm: 164, bass: 'drive', drums: true, arp: 'fast', arpVel: .45, stabs: true, double: { from: 8, vel: .42 },
      chords: [
        ['A2', 'm'], ['F2', 'M'], ['C3', 'M'], ['G2', 'M'], ['A2', 'm'], ['F2', 'M'], ['G2', 'M'], ['E2', 'M'],
        ['D3', 'm'], ['A2', 'm'], ['F2', 'M'], ['C3', 'M'], ['D3', 'm'], ['G2', 'M'], ['A2', 'm'], ['E2', 'M']
      ],
      melody: [
        'E5:1 A5:1 G5:.5 E5:.5 C5:1', 'D5:1 F5:1 E5:.5 D5:.5 C5:1', 'E5:1 G5:1 C6:1.5 B5:.5', 'A5:1 G5:1 D5:2',
        'E5:1 A5:1 B5:.5 C6:.5 B5:1', 'A5:1 C6:1 A5:.5 G5:.5 F5:1', 'G5:1 B5:1 D6:1 B5:1', 'E5:2 Gs5:1 B5:1',
        'D5:.5 F5:.5 A5:1 G5:.5 F5:.5 E5:1', 'C5:.5 E5:.5 A5:1 E5:1 C5:1', 'A5:1 C6:1 A5:1 F5:1', 'G5:.5 E5:.5 G5:1 C6:2',
        'D6:1 C6:.5 A5:.5 F5:1 A5:1', 'G5:.5 B5:.5 D6:1 G6:2', 'E6:1 D6:.5 C6:.5 B5:1 A5:1', 'B5:1 Gs5:1 E5:2'
      ],
      extra: [
        seq('r:3 E6:.25 G6:.25 A6:.25 C7:.25', 'xylo', 12, .55),
        seq('r:3 Gs6:.25 B6:.25 E7:.25 Gs7:.25', 'xylo', 28, .55),
        seq('r:3 E6:.25 G6:.25 A6:.25 C7:.25', 'xylo', 44, .55),
        seq('r:3 Gs6:.25 B6:.25 E7:.25 Gs7:.25', 'xylo', 60, .55)
      ]
    }),
    // ボス：D マイナーで速く重く
    boss: build({
      bpm: 176, bass: 'drive', drums: 'boss', arp: 'fast', arpVel: .5, stabs: true, double: { from: 8, vel: .45 },
      chords: [
        ['D3', 'm'], ['As2', 'M'], ['F3', 'M'], ['C3', 'M'], ['D3', 'm'], ['As2', 'M'], ['A2', 'M'], ['A2', 'M'],
        ['D3', 'm'], ['G2', 'm'], ['As2', 'M'], ['F3', 'M'], ['D3', 'm'], ['G2', 'm'], ['A2', 'M'], ['A2', 'M']
      ],
      melody: [
        'A5:.5 A5:.5 D6:1 C6:.5 A5:.5 F5:1', 'As5:1 A5:.5 G5:.5 F5:1 D5:1', 'C6:.5 C6:.5 F6:1 E6:.5 C6:.5 A5:1', 'G5:1 E5:1 G5:1 C6:1',
        'D6:.5 D6:.5 F6:1 E6:.5 D6:.5 A5:1', 'D6:1 C6:.5 As5:.5 A5:1 F5:1', 'Cs6:.5 E6:.5 A6:1 G6:.5 E6:.5 Cs6:1', 'E6:2 Cs6:1 A5:1',
        'F5:.5 A5:.5 D6:.5 F6:.5 E6:1 D6:1', 'G5:.5 As5:.5 D6:.5 G6:.5 F6:1 D6:1', 'As5:.5 D6:.5 F6:.5 As6:.5 A6:1 F6:1', 'A5:.5 C6:.5 F6:.5 A6:.5 G6:1 E6:1',
        'D6:.5 F6:.5 A6:.5 D7:.5 C7:1 A6:1', 'D6:.5 G6:.5 As6:.5 D7:.5 C7:.5 As6:.5 A6:1', 'Cs6:.5 E6:.5 A6:.5 Cs7:.5 B6:1 A6:1', 'E6:1 Cs6:1 A5:2'
      ],
      extra: [
        seq('r:3 D6:.25 F6:.25 A6:.25 D7:.25', 'xylo', 12, .6),
        seq('r:3 Cs6:.25 E6:.25 A6:.25 Cs7:.25', 'xylo', 28, .6),
        seq('r:3 D6:.25 F6:.25 A6:.25 D7:.25', 'xylo', 44, .6),
        seq('r:3 Cs6:.25 E6:.25 A6:.25 Cs7:.25', 'xylo', 60, .6)
      ]
    }),
    // ジングル
    win: build({
      bpm: 140, bass: 'none', arp: 'slow',
      chords: [['C3', 'M'], ['C3', 'M']],
      melody: ['r:1.5 E5:.5 G5:.5 C6:.5 E6:1', 'G6:4'],
      extra: [[{ beat: 0, inst: 'piano', midi: 48, dur: 3, vel: .8 }, { beat: 0, inst: 'piano', midi: 55, dur: 3, vel: .6 }, { beat: 0, inst: 'piano', midi: 64, dur: 3, vel: .5 },
        { beat: 4, inst: 'piano', midi: 48, dur: 4, vel: .8 }, { beat: 4, inst: 'piano', midi: 64, dur: 4, vel: .6 }, { beat: 4, inst: 'piano', midi: 67, dur: 4, vel: .6 }]]
    }),
    lose: build({
      bpm: 70, bass: 'pad', arp: 'slow', arpVel: .35,
      chords: [['A2', 'm'], ['F2', 'M'], ['E2', 'M'], ['A2', 'm']],
      melody: ['E5:1.5 D5:.5 C5:1 B4:1', 'C5:1.5 A4:.5 A4:2', 'B4:2 Gs4:2', 'A4:4']
    })
  };
  // 勝利・敗北は 1 回だけ鳴らす。win は短く(2 小節)、lose は 4 小節。
  TRACKS.win.once = true; TRACKS.lose.once = true;

  // ---------- 再生エンジン ----------
  let ac = null, out = null, ready = false, loading = false, progress = 0;
  const bank = { piano: [], harp: [], flute: [], xylo: [] };
  let want = null, cur = null;         // 流したい曲 / 今鳴っている曲 {name, gain, timer, ...}
  let noiseBuf = null;

  function init(ctx) {
    if (!ctx || ac) return;
    ac = ctx;
    out = ac.createGain(); out.gain.value = BB.sfx.bgmMuted ? 0 : .34; out.connect(ac.destination);
    const n = ac.sampleRate, nb = ac.createBuffer(1, n, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = nb;
    load();
  }

  function load() {
    if (loading) return;
    loading = true;
    const jobs = [];
    let done = 0, total = 0;
    Object.keys(MANIFEST).forEach(inst => MANIFEST[inst].split(' ').forEach(n => {
      total++;
      jobs.push(fetch('audio/' + DIR[inst] + '/' + n + '.mp3')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => ac.decodeAudioData(b))
        .then(buf => { bank[inst].push({ midi: midi(n), buf }); })
        .catch(() => { /* 読めない音は飛ばす（file:// で開いた場合など） */ })
        .finally(() => { progress = ++done / total; }));
    }));
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
    const v = vel * VOLUME[inst];
    g.gain.setValueAtTime(v, t);
    const sustain = inst === 'flute';
    const end = t + (sustain ? dur : Math.max(dur, 1.2));
    g.gain.setValueAtTime(v, end - (sustain ? 0 : .9));
    g.gain.linearRampToValueAtTime(0, end + (sustain ? .12 : .6));
    src.connect(g).connect(cur.gain);
    src.start(t); src.stop(end + .7);
  }

  function drum(kind, t, vel) {
    const dest = cur.gain;
    if (kind === 'kick') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
      g.gain.setValueAtTime(.55 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g).connect(dest); o.start(t); o.stop(t + .2);
    } else {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf;
      if (kind === 'crash') { f.type = 'highpass'; f.frequency.value = 5200; g.gain.setValueAtTime(.2 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.1); }
      else if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7500; g.gain.setValueAtTime(.09 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); }
      else { f.type = 'bandpass'; f.frequency.value = 1900; g.gain.setValueAtTime(.2 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .14); }
      s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t + (kind === 'crash' ? 1.2 : .2));
    }
  }

  function startTrack(name) {
    stopTrack(.25);
    const tr = TRACKS[name];
    if (!tr || !ready) return;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(1, ac.currentTime + (tr.once ? .02 : .6));
    gain.connect(out);
    const spb = 60 / tr.bpm;
    cur = { name, gain, idx: 0, loop: 0, t0: ac.currentTime + .12, spb, tr, timer: null };
    const track = cur;
    track.timer = setInterval(() => {
      if (cur !== track) { clearInterval(track.timer); return; }
      const horizon = ac.currentTime + .35;
      for (;;) {
        const e = tr.events[track.idx], t = track.t0 + (track.loop * tr.beats + e.beat) * spb;
        if (t > horizon) break;
        if (t >= ac.currentTime - .05) {
          if (e.inst === 'kick' || e.inst === 'snare' || e.inst === 'hat' || e.inst === 'crash') drum(e.inst, t, e.vel);
          else sampler(e.inst, e.midi, t, e.dur * spb, e.vel);
        }
        if (++track.idx >= tr.events.length) {
          if (tr.once) { clearInterval(track.timer); return; }
          track.idx = 0; track.loop++;
        }
      }
    }, 40);
  }

  function stopTrack(fade) {
    if (!cur) return;
    const c = cur; cur = null;
    clearInterval(c.timer);
    const t = ac.currentTime;
    c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setValueAtTime(c.gain.gain.value, t);
    c.gain.gain.linearRampToValueAtTime(0, t + (fade || .3));
    setTimeout(() => c.gain.disconnect(), ((fade || .3) + 4) * 1000);
  }

  return {
    init,
    get ready() { return ready; },
    get node() { return out; },
    get progress() { return progress; },
    // 流したい曲を指定（読み込み前でも OK。同じ曲が鳴っている間は何もしない）
    play(name) {
      if (cur && cur.name === name) { want = name; return; }
      want = name;
      if (ready) startTrack(name);
    },
    stop() { want = null; if (ac) stopTrack(.4); },
    // ジングル（勝利・敗北）。音源が使えないときは false を返す
    jingle(name) { if (!ready) return false; want = null; startTrack(name); return true; },
    setMuted(m) { if (out) out.gain.setTargetAtTime(m ? 0 : .34, ac.currentTime, .05); }
  };
})();
