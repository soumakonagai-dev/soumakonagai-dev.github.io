// サイトのBGM（WebAudioで作る、ゆったりしたドット風ループ）。ボタンで ON/OFF、設定はこの端末に覚えておく
(function () {
  var KEY = 'sgl-bgm-off', ac, master, timer, step = 0, nextT = 0, on = false, videoPlaying = false;
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'bgm-btn';
  if (!document.querySelector('.nav')) return;
  document.body.appendChild(btn);
  function pref() { try { return localStorage.getItem(KEY) !== '1'; } catch (e) { return true; } }
  function label() { btn.textContent = on ? '♪ BGM ON' : '♪ BGM OFF'; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.setAttribute('aria-label', 'BGM ' + (on ? 'を止める' : 'を流す')); }

  // Am - F - C - G の4小節ループ（1小節=8ステップ）
  var CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  var MEL = [76, 0, 72, 0, 74, 72, 0, 69, 77, 0, 76, 0, 72, 0, 69, 0, 76, 0, 79, 0, 76, 74, 0, 72, 74, 0, 71, 0, 67, 0, 0, 0];
  var BPM = 96, SP = 60 / BPM / 2;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tone(m, t, d, type, vol) {
    var o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function sched() {
    while (nextT < ac.currentTime + 0.4) {
      var s = step % 32, bar = Math.floor(s / 8) % 4, k = s % 8;
      if (k % 2 === 0) tone(CH[bar][(k / 2) % 3] - 12, nextT, SP * 1.8, 'triangle', 0.16); // アルペジオ
      if (k === 0) tone(CH[bar][0] - 24, nextT, SP * 7, 'triangle', 0.2);                   // 低音
      var m = MEL[s]; if (m) tone(m, nextT, SP * 1.9, 'square', 0.045);                      // メロディ
      nextT += SP; step++;
    }
  }
  function start() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) { btn.hidden = true; return; }
      ac = new C(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    if (timer) return; nextT = ac.currentTime + 0.1; timer = setInterval(sched, 120); sched();
  }
  function stop() { if (timer) { clearInterval(timer); timer = 0; } if (ac && ac.state === 'running') ac.suspend(); }
  function apply() { if (on && !videoPlaying) start(); else stop(); label(); }
  btn.addEventListener('click', function () { on = !on; try { localStorage.setItem(KEY, on ? '0' : '1'); } catch (e) {} apply(); });
  document.addEventListener('sgl-video', function (e) { videoPlaying = e.detail; apply(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else apply(); });

  // 自動再生はブラウザが禁止しているので、最初のタップ・キー操作（警告の「わかりました」など）で始める
  on = pref(); label();
  function first() { document.removeEventListener('pointerdown', first, true); document.removeEventListener('keydown', first, true); if (on) apply(); }
  document.addEventListener('pointerdown', first, true); document.addEventListener('keydown', first, true);
})();
