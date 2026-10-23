'use strict';
// ===== 効果音 & BGM（WebAudio合成。音源ファイルなし） =====
const AUD = { ctx: null, master: null, sfx: null, bgm: null, muted: false, last: {}, theme: null, intensity: 0, step: 0, next: 0, timer: null };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function audioInit() {
  if (AUD.ctx) { if (AUD.ctx.state === 'suspended') AUD.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = AUD.ctx = new AC();
    AUD.master = c.createGain(); AUD.master.gain.value = AUD.muted ? 0 : 0.7; AUD.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.connect(AUD.master);
    AUD.sfx = c.createGain(); AUD.sfx.gain.value = 0.55; AUD.sfx.connect(comp);
    AUD.bgm = c.createGain(); AUD.bgm.gain.value = 0.32; AUD.bgm.connect(comp);
    // 簡易リバーブ（ノイズIR）
    const len = c.sampleRate * 1.6, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    AUD.verb = c.createConvolver(); AUD.verb.buffer = buf; const vg = c.createGain(); vg.gain.value = 0.35; AUD.verb.connect(vg); vg.connect(comp);
  } catch (e) { AUD.ctx = null; }
}
function audioMute(m) { AUD.muted = m; if (AUD.master) AUD.master.gain.value = m ? 0 : 0.7; try { localStorage.setItem('mamori-mute', m ? '1' : '0'); } catch (e) { } }
try { AUD.muted = localStorage.getItem('mamori-mute') === '1'; } catch (e) { }

function tone(freq, dur, type, vol, opt) {
  const c = AUD.ctx; if (!c || AUD.muted) return; opt = opt || {};
  const t0 = c.currentTime + (opt.delay || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opt.slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (opt.atk || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(opt.dest || AUD.sfx); if (opt.verb && AUD.verb) g.connect(AUD.verb);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur, vol, hp, opt) {
  const c = AUD.ctx; if (!c || AUD.muted) return; opt = opt || {};
  const t0 = c.currentTime + (opt.delay || 0), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = opt.type || 'highpass'; f.frequency.value = hp || 2000;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(opt.dest || AUD.sfx); s.start(t0);
}
const SFXDEF = {
  summon() { tone(520, .18, 'sine', .25, { slide: 2, verb: 1 }); tone(780, .22, 'triangle', .15, { delay: .06, slide: 1.5 }); noise(.08, .08, 5000); },
  merge() { [523, 659, 784].forEach((f, i) => tone(f, .3, 'triangle', .22, { delay: i * .07, verb: 1 })); },
  merge2() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .55, 'triangle', .22, { delay: i * .07, verb: 1 })); tone(130, .8, 'sine', .3, { slide: .6 }); noise(.5, .1, 3000); },
  sell() { tone(900, .08, 'square', .1); tone(1200, .12, 'square', .1, { delay: .06 }); },
  upgrade() { [440, 554, 659, 880].forEach((f, i) => tone(f, .22, 'sine', .22, { delay: i * .05, verb: 1 })); },
  die() { tone(380, .12, 'sine', .1, { slide: .5 }); },
  boss_die() { tone(90, 1.2, 'sawtooth', .3, { slide: .3 }); noise(1, .25, 400, { type: 'lowpass' }); [523, 659, 784, 1047].forEach((f, i) => tone(f, .5, 'triangle', .2, { delay: .3 + i * .1, verb: 1 })); },
  leak() { tone(160, .35, 'sawtooth', .3, { slide: .5 }); tone(120, .4, 'square', .15, { delay: .08 }); },
  wave() { tone(392, .25, 'triangle', .2, { verb: 1 }); tone(523, .35, 'triangle', .2, { delay: .12, verb: 1 }); },
  boss() { tone(110, .9, 'sawtooth', .3, { slide: .8 }); tone(82, 1.2, 'square', .15, { delay: .2 }); noise(.6, .12, 300, { type: 'lowpass' }); },
  clear() { [523, 659, 784].forEach((f, i) => tone(f, .35, 'sine', .2, { delay: i * .09, verb: 1 })); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .5, 'triangle', .22, { delay: i * .13, verb: 1 })); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .6, 'sine', .25, { delay: i * .22, verb: 1 })); },
  zap() { tone(1400, .12, 'sawtooth', .12, { slide: .3 }); noise(.1, .1, 4000); },
  boom() { tone(120, .3, 'sine', .3, { slide: .4 }); noise(.25, .14, 600, { type: 'lowpass' }); },
  click() { tone(700, .05, 'square', .06); },
  shot_sword() { noise(.07, .07, 3500); tone(900, .06, 'triangle', .06, { slide: .6 }); },
  shot_archer() { tone(600, .08, 'triangle', .07, { slide: .5 }); },
  shot_mage() { tone(300, .15, 'sine', .1, { slide: 2 }); },
  shot_ice() { tone(1400, .1, 'sine', .07, { slide: .7 }); },
  shot_poison() { tone(260, .12, 'sine', .08, { slide: 1.6 }); },
  shot_golem() { tone(90, .2, 'sine', .22, { slide: .5 }); noise(.1, .12, 500, { type: 'lowpass' }); },
  shot_sniper() { tone(200, .3, 'sawtooth', .13, { slide: .3 }); noise(.15, .1, 2000); },
  shot_wind() { noise(.15, .06, 1500, { type: 'bandpass' }); },
  shot_mouse() { tone(1500, .06, 'triangle', .05); },
  shot_reaper() { tone(220, .2, 'sine', .1, { slide: .6 }); },
  shot_mimic() { noise(.07, .07, 2500); },
  shot_egg() { tone(180, .25, 'sawtooth', .12, { slide: .5 }); noise(.2, .1, 800, { type: 'lowpass' }); },
  shot_thunder() { },
};
Object.assign(SFX, {
  play(name) {
    if (!AUD.ctx || AUD.muted) return;
    const now = performance.now(), gap = name.startsWith('shot_') ? 70 : name === 'die' ? 50 : 20;
    if (AUD.last[name] && now - AUD.last[name] < gap) return; AUD.last[name] = now;
    const f = SFXDEF[name]; if (f) try { f(); } catch (e) { }
  }
});

// ---------- BGM ----------
// 各テーマ：root(MIDI), 進行（半音オフセットとコード種別）, BPM
const BGMS = {
  meadow: { bpm: 100, root: 60, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], scale: [0, 2, 4, 7, 9], lead: 'triangle' },
  lake: { bpm: 78, root: 57, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], scale: [0, 3, 5, 7, 10], lead: 'sine' },
  autumn: { bpm: 92, root: 62, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], scale: [0, 3, 5, 7, 10], lead: 'triangle' },
  snow: { bpm: 84, root: 64, prog: [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 'M']], scale: [0, 2, 4, 7, 11], lead: 'sine' },
  temple: { bpm: 88, root: 65, prog: [[0, 'm'], [5, 'm'], [8, 'M'], [7, 'M']], scale: [0, 3, 5, 7, 8], lead: 'triangle' },
};
const CHORDS = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
function bgmStart(theme) {
  if (!AUD.ctx) return; if (AUD.theme === theme && AUD.timer) return;
  bgmStop(); AUD.theme = theme; AUD.step = 0; AUD.next = AUD.ctx.currentTime + 0.1; AUD.lastLead = 0;
  AUD.timer = setInterval(bgmTick, 80);
}
function bgmStop() { if (AUD.timer) clearInterval(AUD.timer); AUD.timer = null; AUD.theme = null; }
function bgmIntensity(v) { AUD.intensity = v; }
function bgmTick() {
  const c = AUD.ctx; if (!c || !AUD.theme) return;
  const T = BGMS[AUD.theme], sp = 60 / T.bpm / 2;   // 8分音符
  while (AUD.next < c.currentTime + 0.25) {
    const s = AUD.step, bar = Math.floor(s / 8) % 4, beat = s % 8, [off, q] = T.prog[bar], ch = CHORDS[q], t = AUD.next - c.currentTime;
    if (!AUD.muted) {
      // パッド（小節頭）
      if (beat === 0) ch.forEach((n, i) => tone(mtof(T.root + off + n), sp * 8.2, 'sine', 0.07, { delay: Math.max(0, t), atk: .35, dest: AUD.bgm, verb: 1 }));
      // ベース
      if (beat % 4 === 0) tone(mtof(T.root + off - 24), sp * 3.6, 'sine', 0.16, { delay: Math.max(0, t), dest: AUD.bgm });
      // アルペジオ（戦闘中は常時、準備中は控えめ）
      const arp = AUD.intensity > 0 ? true : beat % 2 === 0;
      if (arp) { const n = ch[(beat >> (AUD.intensity ? 0 : 1)) % ch.length] + (beat % 4 >= 2 ? 12 : 0); tone(mtof(T.root + off + n + 12), sp * 1.6, 'triangle', 0.05 + AUD.intensity * 0.015, { delay: Math.max(0, t), dest: AUD.bgm, verb: 1 }); }
      // メロディ（ペンタトニックのランダムウォーク）
      if (beat % 2 === 0 && Math.random() < (AUD.intensity ? 0.7 : 0.45)) {
        AUD.lastLead = clamp(AUD.lastLead + Math.floor(Math.random() * 5) - 2, -2, 7);
        const idx = ((AUD.lastLead % 5) + 5) % 5, oct = Math.floor(AUD.lastLead / 5);
        tone(mtof(T.root + off * 0 + T.scale[idx] + 24 + oct * 12), sp * 2.2, T.lead, 0.07, { delay: Math.max(0, t), dest: AUD.bgm, verb: 1, atk: .02 });
      }
      // ハイハット風
      if (AUD.intensity > 0 && beat % 2 === 1) noise(.04, .035, 7000, { delay: Math.max(0, t), dest: AUD.bgm });
      if (AUD.intensity > 0 && beat % 4 === 0) { tone(110, .12, 'sine', .12, { delay: Math.max(0, t), slide: .4, dest: AUD.bgm }); }
    }
    AUD.next += sp; AUD.step++;
  }
}
