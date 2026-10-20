'use strict';
// ===== BGM =====
// audio/ の楽器サンプルを鳴らし、曲はここで打ち込んでいる（すべてオリジナル）。曲ごとにジャンルと拍子を変えてある。
//   menu    : ピアノとクラリネットの、静かなジャズ寄りバラード（拍子4/4・テンポ遅め）
//   field1  : ファンク・ロック（エレキベース、ギターのカッティング、サックス → トランペット）
//   field2  : 3拍子のワルツ（ピアノの「ブン・チャッ・チャッ」、バイオリン → トランペット、シロフォン）
//   field3  : スウィング・ジャズ（ウォーキングベース、トランペット → アルトサックス）
//   bossA   : メタル（ギターのギャロップ刻み、ダブルバス、バイオリンの速弾き、ホルン）
//   bossB   : 重厚なオーケストラ（ティンパニ、ハーフタイムのビート、バイオリンの付点リズム、ホルン）
// サンプルの出典とライセンスは audio/CREDITS.txt を参照。
const Music = (function () {
  const INST = {
    piano:   { dir: 'piano',           notes: 'C2 Fs2 A2 Ds3 A3 C4 Fs4 C5 Ds5 A5 C6', vol: 1 },
    organ:   { dir: 'organ',           notes: 'C2 C3 Fs3 C4 Fs4 C5',                  vol: .5,  sustain: true, attack: .05 },
    violin:  { dir: 'violin',          notes: 'G3 C4 E4 G4 C5 E5 G5 C6 E6',           vol: .95, sustain: true, attack: .06 },
    bass:    { dir: 'contrabass',      notes: 'G1 C2 Fs2 E3',                         vol: .95, sustain: true, attack: .02 },
    harp:    { dir: 'harp',            notes: 'C3 E3 G3 D4 A4 C5 E5 G5',              vol: .7 },
    guitar:  { dir: 'guitar-electric', notes: 'A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5',    vol: .9 },
    bassE:   { dir: 'bass-electric',   notes: 'E1 As1 E2 As2 E3',                     vol: 1 },
    sax:     { dir: 'saxophone',       notes: 'As3 D4 F4 A4 C5 E5 G5',                vol: .9,  sustain: true, attack: .03 },
    trumpet: { dir: 'trumpet',         notes: 'A3 C4 F4 G4 D5 F5 A5 C6',              vol: .85, sustain: true, attack: .03 },
    horn:    { dir: 'french-horn',     notes: 'C2 G2 D3 A3 C4 D5',                    vol: .9,  sustain: true, attack: .07 },
    clarinet:{ dir: 'clarinet',        notes: 'D3 As3 D4 F4 As4 D5',                  vol: .9,  sustain: true, attack: .04 },
    xylo:    { dir: 'xylophone',       notes: 'C5 C6 C7 G5 G6',                       vol: .6 },
  };
  const DRUMS = ['kick', 'snare', 'hat', 'ohat', 'crash', 'tom', 'timp'];
  const PC = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
  const midi = name => { const m = /^([A-G]s?)(-?\d)$/.exec(name); return PC[m[1]] + (+m[2] + 1) * 12; };
  const CH = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], '5': [0, 7, 12] };

  // ---------- 曲の打ち込み ----------
  // 'E5:1 A5:.5 r:.5' のように「音名:長さ(拍)」を並べる。r は休符。
  function seq(str, inst, start, vel) {
    let b = start; const out = [];
    str.trim().split(/\s+/).forEach(tok => {
      const [n, d] = tok.split(':'), dur = +d;
      if (n !== 'r') out.push({ beat: b, inst, midi: midi(n), dur, vel });
      b += dur;
    });
    return out;
  }
  // 小節ごとのコード(chords)に、伴奏のパート(parts)を当てはめ、旋律(mel)を重ねて1曲にする。
  //  parts の関数は c を受け取る:  c.put(楽器, 拍, 音高, 長さ, 強さ, 短く切る?)  c.chord(oct)  c.r(根音)  c.tones  c.bar  c.next(次のコード)
  function track(o) {
    const bpb = o.bpb || 4, ev = [];
    o.chords.forEach(([rn, q], bar) => {
      const b0 = bar * bpb, r = midi(rn), tones = CH[q];
      const c = {
        bar, r, tones, bpb, next: o.chords[(bar + 1) % o.chords.length],
        put: (inst, beat, m, dur, vel, cut) => ev.push({ beat: b0 + beat, inst, midi: m, dur, vel, cut: !!cut }),
        chord: oct => tones.map(t => r + t + oct),
      };
      o.parts.forEach(p => p(c));
    });
    o.mel.forEach(([inst, from, bars, vel]) => bars.forEach((s, i) => {
      const tot = s.trim().split(/s+/).reduce((a, t) => a + +t.split(':')[1], 0);   // 1小節ぶんの長さが拍子と合っているか確認
      if (Math.abs(tot - bpb) > .01) console.warn('BGM: 小節の長さが違います', inst, from + i + 1, s, tot);
      ev.push(...seq(s, inst, (from + i) * bpb, vel));
    }));
    ev.sort((a, b) => a.beat - b.beat);
    return { bpm: o.bpm, beats: o.chords.length * bpb, events: ev, once: !!o.once };
  }
  const fillToms = c => { if (c.bar % 4 === 3) [3, 3.25, 3.5, 3.75].forEach((b, i) => c.put('tom', b, 0, 0, .5 + .13 * i)); };

  const TRACKS = {
    // ───── メニュー：F の静かなバラード。拍の頭にコントラバス、ピアノは崩した分散和音
    menu: track({
      bpm: 76,
      chords: [['F2', 'M7'], ['E2', 'm7'], ['D2', 'm7'], ['C3', 'M7'], ['As2', 'M7'], ['A2', 'm7'], ['G2', 'm7'], ['C3', '7']],
      parts: [
        c => { c.put('bass', 0, c.r, 3.9, .8); c.put('bass', 2, c.r + 7, 1.9, .5); },
        c => { const t = c.chord(24); [0, 2, 1, 3, 2, 3, 1, 2].forEach((k, i) => c.put('piano', i * .5, t[k], 1.4, .42)); },
        c => c.chord(12).forEach(m => c.put('organ', 0, m, 4, .14)),
        c => c.put('harp', 0, c.chord(24)[3], 3.5, .3),
      ],
      mel: [['clarinet', 0, ['A4:1.5 C5:.5 E5:2', 'D5:1 B4:1 G4:2', 'F4:1.5 A4:.5 C5:2', 'B4:1 G4:1 E4:2', 'D5:1 F5:1 A4:2', 'E5:1.5 C5:.5 A4:2', 'G4:1 As4:1 D5:2', 'E5:1 As4:1 G4:2'], .85]],
    }),

    // ───── フィールド1：E ドリアンのファンク。ベースとギターのカッティングが主役
    field1: track({
      bpm: 126,
      chords: [['E2', 'm7'], ['E2', 'm7'], ['A2', '7'], ['A2', '7'], ['E2', 'm7'], ['E2', 'm7'], ['A2', '7'], ['B2', 'm7'],
               ['G2', 'M7'], ['A2', '7'], ['G2', 'M7'], ['A2', '7'], ['B2', 'm7'], ['A2', '7'], ['G2', 'M7'], ['B2', '7']],
      parts: [
        c => { const b = c.r - 12; [[0, 0, .4, 1], [.75, 0, .2, .6], [1.5, 12, .2, .7], [2, 0, .4, .9], [2.75, 7, .2, .6], [3.25, 10, .2, .6], [3.5, 0, .4, .8]].forEach(([t, i, d, v]) => c.put('bassE', t, b + i, d, v, true)); },
        c => { const t = c.tones.slice(1); [.5, 1.75, 2.5, 3.25].forEach((b, i) => t.forEach(x => c.put('guitar', b, c.r + 24 + x, .13, .3 + (i === 1 ? .1 : 0), true))); },
        c => { if (c.bar >= 8) c.chord(12).forEach(m => c.put('organ', 0, m, 4, .2)); },
        c => {
          [0, .75, 2, 2.5].forEach(b => c.put('kick', b, 0, 0, .95)); [1, 3].forEach(b => c.put('snare', b, 0, 0, .9));
          for (let i = 0; i < 16; i++) if (i !== 14) c.put('hat', i * .25, 0, 0, i % 4 === 0 ? .7 : i % 2 ? .28 : .45);
          c.put('ohat', 3.5, 0, 0, .6); if (c.bar % 8 === 0) c.put('crash', 0, 0, 0, 1); fillToms(c);
        },
      ],
      mel: [
        ['sax', 0, ['E5:.5 G5:.5 E5:.5 D5:1.5 r:1', 'B4:.5 D5:.5 E5:.5 G5:1 E5:1.5', 'A4:.5 Cs5:.5 E5:.5 G5:1.5 r:1', 'E5:.5 Cs5:.5 A4:1 r:2',
                     'E5:.5 G5:.5 E5:.5 D5:1.5 r:1', 'B4:.5 D5:.5 E5:2 r:1', 'A4:.5 Cs5:.5 E5:1 G5:1 E5:1', 'D5:1 Fs5:1 B4:2'], .95],
        ['trumpet', 8, ['B5:1 G5:.5 D5:.5 G5:2', 'A5:1 E5:.5 Cs5:.5 A4:2', 'B5:1 D6:1 B5:1 G5:1', 'Cs6:1 A5:1 G5:2',
                        'D6:1.5 B5:.5 Fs5:2', 'Cs6:1 E5:1 A5:2', 'D6:1 B5:1 G5:2', 'Fs5:1 A5:1 B5:2'], .85],
      ],
    }),

    // ───── フィールド2：D マイナーのワルツ（3拍子）。シロフォンが転がる
    field2: track({
      bpm: 150, bpb: 3,
      chords: [['D3', 'm'], ['A2', '7'], ['D3', 'm'], ['G2', 'm'], ['As2', 'M'], ['A2', '7'], ['D3', 'm'], ['D3', 'm'],
               ['F3', 'M'], ['C3', '7'], ['F3', 'M'], ['As2', 'M'], ['G2', 'm'], ['A2', '7'], ['D3', 'm'], ['A2', '7']],
      parts: [
        c => c.put('bass', 0, c.r, 2.8, .85),
        c => { const t = c.chord(12); [1, 2].forEach(b => t.forEach(m => c.put('piano', b, m, .55, .38, true))); },
        c => { c.put('kick', 0, 0, 0, .6); c.put('hat', 1, 0, 0, .4); c.put('hat', 2, 0, 0, .4); c.put('hat', 1.5, 0, 0, .2); c.put('hat', 2.5, 0, 0, .2); },
        c => c.chord(12).forEach(m => c.put('organ', 0, m, 3, .13)),
        c => { if (c.bar >= 8) { const t = c.chord(36); [0, 1, 2].forEach(i => c.put('xylo', i * .333, t[i % t.length], .4, .28, true)); } },
      ],
      mel: [
        ['violin', 0, ['D5:1 F5:1 A5:1', 'G5:1.5 E5:.5 Cs5:1', 'D5:1 F5:1 A5:1', 'As5:1.5 G5:.5 D5:1', 'D5:1 F5:1 As5:1', 'A5:1.5 G5:.5 E5:1', 'F5:1 A5:1 D6:1', 'D6:2 r:1'], 1],
        ['trumpet', 8, ['A5:1 C6:1 A5:1', 'G5:1.5 E5:.5 G5:1', 'A5:1 C6:1 A5:1', 'D6:1.5 C6:.5 As5:1', 'G5:1 As5:1 D6:1', 'Cs6:1.5 A5:.5 E5:1', 'F5:1 A5:1 D6:1', 'Cs6:2 E5:1'], .85],
      ],
    }),

    // ───── フィールド3：B♭ のスウィング・ジャズ。ウォーキングベースと三連のライド
    field3: track({
      bpm: 156,
      chords: [['As2', 'M7'], ['G2', 'm7'], ['C3', 'm7'], ['F2', '7'], ['As2', 'M7'], ['G2', '7'], ['C3', 'm7'], ['F2', '7'],
               ['Ds3', 'M7'], ['Gs2', '7'], ['As2', 'M7'], ['G2', '7'], ['C3', 'm7'], ['F2', '7'], ['As2', 'M7'], ['F2', '7']],
      parts: [
        c => {
          const base = c.r >= 47 ? c.r - 12 : c.r, nx = midi(c.next[0]), nb = nx >= 47 ? nx - 12 : nx, t = c.tones;
          [base, base + t[1], base + t[2], nb + (base < nb ? -1 : 1)].forEach((m, i) => c.put('bass', i, m, .92, .85));
        },
        c => { const v = [c.tones[1], c.tones[3] || c.tones[2], c.tones[2] + 12]; [0, 1.667, 3].forEach(b => v.forEach(x => c.put('piano', b, c.r + 12 + x, .45, .34, true))); },
        c => {
          [0, 1, 1.667, 2, 3, 3.667].forEach((b, i) => c.put('hat', b, 0, 0, i % 3 === 0 ? .6 : .4));
          [0, 2].forEach(b => c.put('kick', b, 0, 0, .4)); [1, 3].forEach(b => c.put('snare', b, 0, 0, .28));
          if (c.bar % 4 === 3) c.put('snare', 3.667, 0, 0, .6);
        },
      ],
      mel: [
        ['trumpet', 0, ['D5:.667 F5:.333 A5:1 F5:.667 D5:.333 As4:1', 'G4:.667 As4:.333 D5:1 G5:2', 'C5:.667 Ds5:.333 G5:1 As5:.667 G5:.333 Ds5:1', 'A5:1 F5:1 Ds5:1 C5:1',
                        'D5:.667 F5:.333 A5:1 D6:2', 'B5:1 G5:1 D5:1 F5:1', 'Ds5:.667 G5:.333 As5:1 G5:.667 Ds5:.333 C5:1', 'C5:1 A4:1 C5:2'], .85],
        ['sax', 8, ['G5:1 Ds5:.667 As4:.333 D5:2', 'Gs4:.667 C5:.333 Ds5:1 Fs5:2', 'As4:.667 D5:.333 F5:1 D5:2', 'B4:.667 D5:.333 F5:1 G5:2',
                    'C5:1 Ds5:1 G5:2', 'F5:.667 A4:.333 C5:1 Ds5:2', 'D5:1 F5:1 As4:2', 'C5:1 A4:1 F5:.667 Ds5:.333 C5:1'], .95],
      ],
    }),

    // ───── ボスA：F# フリジアンのメタル。ギターのギャロップ刻みとダブルバス、バイオリンの速弾き
    bossA: track({
      bpm: 184,
      chords: [['Fs2', '5'], ['Fs2', '5'], ['G2', '5'], ['Fs2', '5'], ['Fs2', '5'], ['D3', '5'], ['E3', '5'], ['Cs3', '5'],
               ['Fs2', '5'], ['G2', '5'], ['Fs2', '5'], ['E2', '5'], ['D3', '5'], ['E3', '5'], ['Fs2', '5'], ['Cs3', 'M']],
      parts: [
        c => { const r = c.r + 12; for (let b = 0; b < 4; b++) [0, .5, .75].forEach((o, i) => { c.put('guitar', b + o, r, .17, i === 0 ? .55 : .42, true); c.put('guitar', b + o, r + 7, .17, i === 0 ? .5 : .38, true); }); },
        c => { const r = c.r - 12; for (let i = 0; i < 8; i++) c.put('bassE', i * .5, r, .4, i % 2 ? .7 : .9, true); },
        c => { if (c.bar % 2 === 0) [0, 7, 12].forEach(x => c.put('horn', 0, c.r + 12 + x, 2, .55)); },
        c => {
          [0, .5, .75, 1.5, 2, 2.5, 2.75, 3.5].forEach(b => c.put('kick', b, 0, 0, b % 1 ? .7 : 1)); [1, 3].forEach(b => c.put('snare', b, 0, 0, 1));
          for (let i = 0; i < 8; i++) c.put('hat', i * .5, 0, 0, .55); if (c.bar % 4 === 0) c.put('crash', 0, 0, 0, 1); fillToms(c);
        },
      ],
      mel: [['violin', 0, [
        'Fs5:.5 A5:.5 Cs6:1 B5:.5 A5:.5 Fs5:1', 'Cs6:.5 E6:.5 Cs6:1 B5:1 A5:1', 'G5:.5 A5:.5 B5:1 D6:.5 B5:.5 G5:1', 'A5:1 Fs5:1 Cs6:2',
        'A5:.5 Cs6:.5 E6:1 Cs6:.5 B5:.5 A5:1', 'D6:1 A5:.5 Fs5:.5 A5:2', 'E6:1 B5:.5 Gs5:.5 B5:2', 'Cs6:1 Gs5:1 Cs6:2',
        'Fs5:.5 Fs5:.5 A5:1 Cs6:1 A5:1', 'G5:.5 G5:.5 B5:1 D6:1 B5:1', 'A5:.5 Cs6:.5 E6:1 Cs6:.5 A5:.5 Fs5:1', 'E6:1 Gs5:1 B5:2',
        'D6:.5 Fs5:.5 A5:1 D6:1 A5:1', 'E6:.5 Gs5:.5 B5:1 E6:1 B5:1', 'Cs6:.5 A5:.5 Fs5:.5 A5:.5 Cs6:2', 'Cs6:1 Gs5:1 Cs6:2'], 1]],
    }),

    // ───── ボスB：C マイナーの重厚なオーケストラ。ティンパニとハーフタイムの重いビート
    bossB: track({
      bpm: 138,
      chords: [['C3', 'm'], ['C3', 'm'], ['Gs2', 'M'], ['As2', 'M'], ['C3', 'm'], ['F3', 'm'], ['G2', 'M'], ['G2', 'M'],
               ['Gs2', 'M'], ['As2', 'M'], ['C3', 'm'], ['G2', 'M'], ['F3', 'm'], ['Ds3', 'M'], ['G2', 'M'], ['G2', 'M']],
      parts: [
        c => { c.put('timp', 0, 0, 0, 1); c.put('timp', 2.5, 0, 0, .8); if (c.bar % 4 === 3) for (let i = 0; i < 4; i++) c.put('timp', 3 + i * .25, 0, 0, .5 + .12 * i); },
        c => { c.put('kick', 0, 0, 0, 1); c.put('kick', 1.5, 0, 0, .7); c.put('snare', 2, 0, 0, 1); if (c.bar % 4 === 0) c.put('crash', 0, 0, 0, 1); for (let i = 0; i < 8; i++) c.put('hat', i * .5, 0, 0, .3); },
        c => { const t = c.chord(24); [0, .75, 1.5, 2.25, 3].forEach((b, i) => c.put('violin', b, t[i % t.length], .3, .42)); },
        c => c.put('bass', 0, c.r, 3.9, .9),
        c => c.chord(12).forEach(m => c.put('horn', 0, m, 3.9, .42)),
        c => c.chord(12).forEach(m => c.put('organ', 0, m, 4, .2)),
      ],
      mel: [
        ['violin', 0, ['G5:2 C6:1 Ds6:1', 'D6:1.5 C6:.5 G5:2', 'Ds6:1.5 C6:.5 Gs5:2', 'D6:1 As5:1 D6:2'], 1],
        ['trumpet', 4, ['C5:1 Ds5:1 G5:1 C6:1', 'F5:1 Gs5:1 C6:2', 'D5:1 G5:1 B5:2', 'B5:1 D6:1 B5:1 G5:1'], .9],
        ['violin', 8, ['C6:1.5 Ds6:.5 Gs5:2', 'D6:1.5 F6:.5 As5:2', 'G5:1 Ds6:1 C6:2', 'D6:1 B5:1 G5:2'], 1],
        ['trumpet', 12, ['C6:1 Gs5:1 F5:1 Gs5:1', 'G5:1 As5:1 Ds6:2', 'D5:1 G5:1 B5:1 D6:1', 'D6:2 B5:1 G5:1'], .9],
      ],
    }),

    // ───── クリア：トランペットとホルンのファンファーレ（1回だけ）
    clear: track({
      bpm: 132, once: true,
      chords: [['C3', 'M'], ['F3', 'M'], ['G2', '7'], ['C3', 'M']],
      parts: [
        c => c.chord(12).forEach(m => c.put('horn', 0, m, 3.8, .5)),
        c => { c.put('bass', 0, c.r, 3.9, .8); c.put('timp', 0, 0, 0, .9); },
        c => c.chord(24).forEach((m, i) => c.put('piano', i * .5, m, 1.5, .4)),
      ],
      mel: [['trumpet', 0, ['G5:.5 G5:.5 G5:.5 C6:1.5 r:1', 'A5:.5 A5:.5 A5:.5 C6:1.5 r:1', 'B5:.5 B5:.5 B5:.5 D6:1.5 r:1', 'C6:3 r:1'], .95]],
    }),
    // ───── ゲームオーバー：クラリネットのしずかな曲（1回だけ）
    over: track({
      bpm: 66, once: true,
      chords: [['F2', 'm'], ['Cs3', 'M'], ['C3', '7'], ['F2', 'm']],
      parts: [
        c => c.put('bass', 0, c.r, 3.9, .8),
        c => c.chord(24).forEach((m, i) => c.put('piano', i * 1.2, m, 1.4, .35)),
        c => c.chord(12).forEach(m => c.put('organ', 0, m, 4, .14)),
      ],
      mel: [['clarinet', 0, ['C5:2 Gs4:1 F4:1', 'Cs5:1.5 Gs4:.5 F4:2', 'E5:1 As4:1 G4:2', 'F4:4'], .9]],
    }),
  };

  // ---------- 再生エンジン ----------
  let ac = null, out = null, loading = false, progress = 0, muted = false, duck = 1, failed = false;
  const bank = {}, loaded = {};
  Object.keys(INST).forEach(k => bank[k] = []);
  let want = null, cur = null, noiseBuf = null;
  const level = () => (muted ? 0 : .34 * duck);

  // 曲ごとに使う楽器。その曲の楽器が読み込めた時点で、その曲を鳴らせる（全部の読み込みは待たない）
  Object.values(TRACKS).forEach(tr => { tr.needs = [...new Set(tr.events.map(e => e.inst).filter(i => INST[i]))]; });
  const trackReady = n => !!TRACKS[n] && TRACKS[n].needs.every(i => loaded[i]);
  // メニュー曲の楽器から先に読む。ファイルの取得はページを開いた時点で始め、最初の操作を待たない
  const order = TRACKS.menu.needs.concat(Object.keys(INST).filter(k => !TRACKS.menu.needs.includes(k)));
  const fetched = {};
  order.forEach(k => INST[k].notes.split(' ').forEach(n => {
    fetched[k + '/' + n] = fetch('audio/' + INST[k].dir + '/' + n + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).catch(() => null);
  }));

  function init(ctx) {
    if (!ctx || ac) return;
    ac = ctx;
    out = ac.createGain(); out.gain.value = level(); out.connect(ac.destination);
    const n = ac.sampleRate, nb = ac.createBuffer(1, n, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = nb; load();
  }
  function load() {
    if (loading) return; loading = true;
    let done = 0, total = 0; order.forEach(k => { total += INST[k].notes.split(' ').length; });
    (async () => {
      for (const k of order) {
        await Promise.all(INST[k].notes.split(' ').map(async n => {
          const b = await fetched[k + '/' + n];
          if (b) { try { bank[k].push({ midi: midi(n), buf: await ac.decodeAudioData(b) }); } catch (_) {} }
          progress = ++done / total;
        }));
        loaded[k] = bank[k].length > 0;
        if (want && (!cur || cur.name !== want) && trackReady(want)) startTrack(want);
      }
      if (!trackReady('menu')) failed = true;   // file:// で開いたときなど、音源を読めなかった
    })();
  }
  function sampler(inst, m, t, dur, vel, cut) {
    const list = bank[inst], I = INST[inst]; if (!list.length) return;
    let best = list[0]; for (const s of list) if (Math.abs(s.midi - m) < Math.abs(best.midi - m)) best = s;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = best.buf; src.playbackRate.value = Math.pow(2, (m - best.midi) / 12);
    const v = vel * I.vol;
    if (I.sustain) {   // 弓・息・オルガン: 立ち上がりをなだらかにし、音価の長さで止める
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (I.attack || .03));
      g.gain.setValueAtTime(v, t + Math.max(dur - .05, .06)); g.gain.linearRampToValueAtTime(0, t + dur + .14);
      src.start(t); src.stop(t + dur + .2);
    } else if (cut) { // ミュート・スタッカート: 短く切る
      g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .06);
      src.start(t); src.stop(t + dur + .1);
    } else {           // ピアノ・ハープ・シロフォン: 余韻を残す
      g.gain.setValueAtTime(v, t); const end = t + Math.max(dur, 1.2);
      g.gain.setValueAtTime(v, end - .9); g.gain.linearRampToValueAtTime(0, end + .6);
      src.start(t); src.stop(end + .7);
    }
    src.connect(g).connect(cur.gain);
  }
  function drum(kind, t, vel) {
    const dest = cur.gain;
    if (kind === 'kick' || kind === 'tom' || kind === 'timp') {
      const o = ac.createOscillator(), g = ac.createGain();
      const f0 = kind === 'kick' ? 130 : kind === 'tom' ? 170 : 110, f1 = kind === 'kick' ? 42 : kind === 'tom' ? 95 : 58, len = kind === 'timp' ? .5 : kind === 'tom' ? .22 : .18;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + (kind === 'timp' ? .35 : .12));
      g.gain.setValueAtTime((kind === 'timp' ? .75 : .55) * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + len);
      o.connect(g).connect(dest); o.start(t); o.stop(t + len + .02);
    } else {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf;
      if (kind === 'crash') { f.type = 'highpass'; f.frequency.value = 5200; g.gain.setValueAtTime(.2 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.1); }
      else if (kind === 'ohat') { f.type = 'highpass'; f.frequency.value = 6500; g.gain.setValueAtTime(.12 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .28); }
      else if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7500; g.gain.setValueAtTime(.09 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); }
      else { f.type = 'bandpass'; f.frequency.value = 1900; g.gain.setValueAtTime(.2 * vel, t); g.gain.exponentialRampToValueAtTime(.001, t + .14); }
      s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t + (kind === 'crash' ? 1.2 : kind === 'ohat' ? .35 : .2));
    }
  }
  function startTrack(name) {
    stopTrack(.25);
    const tr = TRACKS[name]; if (!tr || !trackReady(name)) return;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime); gain.gain.linearRampToValueAtTime(1, ac.currentTime + (tr.once ? .02 : .6)); gain.connect(out);
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
          if (DRUMS.includes(e.inst)) drum(e.inst, t, e.vel);
          else sampler(e.inst, e.midi, t, e.dur * spb, e.vel, e.cut);
        }
        if (++track.idx >= tr.events.length) { if (tr.once) { clearInterval(track.timer); return; } track.idx = 0; track.loop++; }
      }
    }, 40);
  }
  function stopTrack(fade) {
    if (!cur) return;
    const c = cur; cur = null; clearInterval(c.timer);
    const t = ac.currentTime; c.gain.gain.cancelScheduledValues(t); c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0, t + (fade || .3));
    setTimeout(() => c.gain.disconnect(), ((fade || .3) + 4) * 1000);
  }
  return {
    init,
    get ready() { return trackReady('menu'); }, get failed() { return failed; }, get loading() { return loading; }, get progress() { return progress; }, get started() { return !!ac; }, get muted() { return muted; },
    get now() { return want; },
    play(name) { want = name; if (cur && cur.name === name) return; if (trackReady(name)) startTrack(name); },
    stop() { want = null; if (ac) stopTrack(.4); },
    setMuted(m) { muted = m; if (out) out.gain.setTargetAtTime(level(), ac.currentTime, .05); },
    setDuck(d) { duck = d; if (out) out.gain.setTargetAtTime(level(), ac.currentTime, .12); },
  };
})();
