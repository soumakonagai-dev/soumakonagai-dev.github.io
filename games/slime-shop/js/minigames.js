// お祭りの屋台あそび（金魚すくい／スーパーボール／ヨーヨー釣り／輪投げ／焼き・かき氷・わたあめ・ラムネ）
const Mini = (function () {
  const W = 480, H = 560, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let ov = null, raf = 0, cur = null;
  const snd = n => { try { sfx(n); } catch (e) { } };

  function run(title, game, onDone) {
    if (ov) close();
    ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(10,8,20,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;user-select:none';
    ov.innerHTML = `<div style="width:min(94vw,calc((100vh - 70px)*${W / H}),480px)"><div style="display:flex;justify-content:space-between;align-items:center;color:#fff;font-weight:bold;margin-bottom:6px;font-size:15px"><span>${title}</span><span id="miniInfo"></span><button id="miniEnd" style="padding:6px 12px;border-radius:10px;border:0;background:#ffd23f;font-weight:bold">おわり</button></div><canvas width="${W}" height="${H}" style="width:100%;border-radius:14px;background:#222;display:block"></canvas></div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('canvas'), cx = cv.getContext('2d'), info = ov.querySelector('#miniInfo');
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    let last = performance.now(), fin = false, wait = 0;
    const finish = () => { if (game.done) return; game.finish(); };
    cv.onpointerdown = e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } const p = pos(e); if (game.done) { if (wait <= 0) endNow(); return; } game.down(p[0], p[1]); };
    cv.onpointermove = e => { const p = pos(e); game.move(p[0], p[1]); };
    cv.onpointerup = e => { const p = pos(e); if (!game.done) game.up(p[0], p[1]); };
    ov.querySelector('#miniEnd').onclick = () => { if (game.done) endNow(); else finish(); };
    function endNow() { if (fin) return; fin = true; const r = game.result(); close(); onDone && onDone(r); }
    function loop(t) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t; if (game.done) wait -= dt;
      game.update(dt); game.draw(cx); info.textContent = game.info ? game.info() : '';
      if (game.done) { if (game.wasDone !== true) { game.wasDone = true; wait = 0.6; ov.querySelector('#miniEnd').textContent = 'けっかへ'; } cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(0, H / 2 - 70, W, 140); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = 'bold 30px sans-serif'; cx.fillText(game.endText || 'おわり！', W / 2, H / 2 - 12); cx.font = '18px sans-serif'; cx.fillText(game.endSub ? game.endSub() : '', W / 2, H / 2 + 22); cx.fillText('（タップでけっかへ）', W / 2, H / 2 + 52); }
      raf = requestAnimationFrame(loop);
    }
    cur = game; raf = requestAnimationFrame(loop);
  }
  function close() { cancelAnimationFrame(raf); if (ov) { ov.remove(); ov = null; } cur = null; }

  function base(g) { // 共通の土台
    g.done = false; g.finish = function () { g.done = true; }; g.down = g.down || (() => { }); g.up = g.up || (() => { }); g.move = g.move || (() => { }); return g;
  }
  const rr = (cx, x, y, w, h, r) => { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); };

  // ---------- すくい系（金魚・スーパーボール・ヨーヨー） ----------
  const SCOOP = {
    goldfish: { title: '🐟 金魚すくい', n: 16, R: 36, still: 0.1, mv: 0.00045, touch: 0.5, cap: 2.2, water: ['#6fc8ee', '#2f89c4'] },
    superball: { title: '🔮 スーパーボールすくい', n: 22, R: 32, still: 0.1, mv: 0.0004, touch: 0.25, cap: 3.2, water: ['#8fd6f5', '#4aa3d6'] },
    yoyo: { title: '🎈 ヨーヨー釣り', n: 12, R: 16, still: 0.02, mv: 0.0012, touch: 0, cap: 1.2, water: ['#9fe0f5', '#5ab6e0'] },
  };
  function scoop(kind) {
    const c = SCOOP[kind], g = base({}), PX = 36, PY = 90, PW = W - 72, PH = 360, items = [], bowl = [];
    const cols = ['#ff5a4a', '#ff5a4a', '#ff9a3c', '#ffffff', '#222'];
    const ballCols = ['#ff4a6a', '#4ab8ff', '#ffd23f', '#6ee07a', '#b28aff', '#ffffff'];
    for (let i = 0; i < c.n; i++) {
      const it = { x: PX + 30 + Math.random() * (PW - 60), y: PY + 30 + Math.random() * (PH - 60), a: Math.random() * 6.28, ph: Math.random() * 6 };
      if (kind === 'goldfish') { const gold = Math.random() < 0.1, big = Math.random() < 0.25; it.size = gold ? 15 : big ? 14 : 9 + Math.random() * 3; it.col = gold ? '#ffd23f' : cols[(Math.random() * 3) | 0]; it.pts = gold ? 5 : big ? 2 : 1; it.w = it.size / 8; it.sp = 30 + Math.random() * 30; if (Math.random() < 0.1) { it.col = '#222'; it.pts = 2; } }
      else if (kind === 'superball') { const ci = (Math.random() * 6) | 0; it.size = 9 + Math.random() * 3; it.col = ballCols[ci]; it.pts = ci === 5 ? 3 : 1; if (Math.random() < 0.06) { it.pts = 5; it.col = '#ffd23f'; it.glit = 1; } it.w = 1; it.sp = 6; }
      else { const ci = (Math.random() * 6) | 0; it.size = 20; it.col = ballCols[ci]; it.pts = 1 + (ci === 2 ? 1 : 0) + (Math.random() < 0.15 ? 2 : 0); it.w = 1; it.sp = 4; }
      items.push(it);
    }
    const poi = { x: W / 2, y: PY + PH / 2, tx: W / 2, ty: PY + PH / 2, down: false, hp: 1, spd: 0, hold: 0 };
    let score = 0, caught = 0, torn = false, time = 0;
    g.move = (x, y) => { poi.tx = clamp(x, PX, PX + PW); poi.ty = clamp(y, PY, PY + PH); };
    g.down = (x, y) => { g.move(x, y); poi.down = true; poi.hold = 0; snd('pop'); };
    g.up = () => {
      if (!poi.down) return; poi.down = false; let cap = c.cap, got = 0;
      const near = items.filter(it => Math.hypot(it.x - poi.x, it.y - poi.y) < c.R + (kind === 'yoyo' ? 4 : -it.size * 0.2)).sort((a, b) => Math.hypot(a.x - poi.x, a.y - poi.y) - Math.hypot(b.x - poi.x, b.y - poi.y));
      for (const it of near) { if (cap - it.w < 0 && got > 0) break; if (cap - it.w < -0.6) continue; cap -= it.w; got++; items.splice(items.indexOf(it), 1); bowl.push(it); score += it.pts; caught++; snd(it.pts >= 5 ? 'ok' : 'coin'); }
      if (!got && poi.hold > 0.2) snd('ng');
      if (!items.length) { g.endText = 'ぜんぶすくった！'; g.finish(); }
    };
    g.update = dt => {
      if (g.done) return; time += dt;
      const dx = poi.tx - poi.x, dy = poi.ty - poi.y; poi.x += dx * Math.min(1, dt * 14); poi.y += dy * Math.min(1, dt * 14); poi.spd = Math.hypot(dx, dy) * 14;
      for (const it of items) {
        it.ph += dt;
        if (kind === 'goldfish') {
          const d = Math.hypot(it.x - poi.x, it.y - poi.y);
          if (poi.down && d < 120) { const ta = Math.atan2(it.y - poi.y, it.x - poi.x); it.a += Math.atan2(Math.sin(ta - it.a), Math.cos(ta - it.a)) * dt * 3; it.sp2 = 70; } else { it.a += Math.sin(it.ph * 1.3 + it.x) * dt * 1.2; it.sp2 = 0; }
          const v = it.sp + (it.sp2 || 0); it.x += Math.cos(it.a) * v * dt; it.y += Math.sin(it.a) * v * dt;
          if (it.x < PX + 14 || it.x > PX + PW - 14) { it.a = Math.PI - it.a; it.x = clamp(it.x, PX + 14, PX + PW - 14); } if (it.y < PY + 14 || it.y > PY + PH - 14) { it.a = -it.a; it.y = clamp(it.y, PY + 14, PY + PH - 14); }
        } else { it.x += Math.cos(it.a) * it.sp * dt; it.y += Math.sin(it.a) * it.sp * dt + Math.sin(it.ph * 1.5) * 0.2; it.a += Math.sin(it.ph * 0.7) * dt * 0.8; if (it.x < PX + 20 || it.x > PX + PW - 20) { it.a = Math.PI - it.a; it.x = clamp(it.x, PX + 20, PX + PW - 20); } if (it.y < PY + 20 || it.y > PY + PH - 20) { it.a = -it.a; it.y = clamp(it.y, PY + 20, PY + PH - 20); } }
      }
      if (poi.down) {
        poi.hold += dt; let drain = c.still + poi.spd * c.mv;
        for (const it of items) if (Math.hypot(it.x - poi.x, it.y - poi.y) < c.R) drain += it.w * c.touch * 0.25;
        if (kind === 'yoyo') drain = c.still + Math.max(0, poi.spd - 20) * c.mv;
        poi.hp -= drain * dt * (kind === 'yoyo' ? 1 : 1.2);
        if (poi.hp <= 0) { torn = true; g.endText = kind === 'yoyo' ? 'こよりが切れた…' : 'ポイが破れた…'; g.finish(); snd('ng'); }
      }
    };
    g.draw = cx => {
      cx.fillStyle = '#7a4a2a'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#c99256'; rr(cx, 10, 70, W - 20, 400, 16); cx.fill();
      const gr = cx.createLinearGradient(0, PY, 0, PY + PH); gr.addColorStop(0, c.water[0]); gr.addColorStop(1, c.water[1]); cx.fillStyle = gr; rr(cx, PX, PY, PW, PH, 22); cx.fill();
      cx.save(); rr(cx, PX, PY, PW, PH, 22); cx.clip();
      cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = 2; for (let i = 0; i < 6; i++) { const t = (time * 0.3 + i / 6) % 1; cx.beginPath(); cx.arc(PX + PW * (0.2 + 0.12 * i), PY + PH * ((i * 0.37) % 1), 12 + t * 40, 0, 6.28); cx.globalAlpha = 1 - t; cx.stroke(); } cx.globalAlpha = 1;
      for (const it of items) {
        cx.save(); cx.translate(it.x, it.y);
        if (kind === 'goldfish') { cx.rotate(it.a); const s = it.size; cx.fillStyle = it.col; cx.beginPath(); cx.ellipse(0, 0, s * 1.5, s * 0.75, 0, 0, 6.28); cx.fill(); cx.beginPath(); cx.moveTo(-s * 1.3, 0); cx.lineTo(-s * 2.4, -s * 0.8 + Math.sin(it.ph * 8) * 3); cx.lineTo(-s * 2.4, s * 0.8 + Math.sin(it.ph * 8) * 3); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s * 0.8, -s * 0.25, s * 0.2, 0, 6.28); cx.fill(); cx.fillStyle = '#111'; cx.beginPath(); cx.arc(s * 0.85, -s * 0.25, s * 0.1, 0, 6.28); cx.fill(); }
        else if (kind === 'superball') { cx.fillStyle = it.col; cx.beginPath(); cx.arc(0, 0, it.size, 0, 6.28); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.7)'; cx.beginPath(); cx.arc(-it.size * 0.3, -it.size * 0.3, it.size * 0.3, 0, 6.28); cx.fill(); if (it.glit) { cx.fillStyle = '#fff'; for (let k = 0; k < 4; k++) cx.fillRect(Math.cos(k * 1.7 + it.ph * 3) * 5, Math.sin(k * 2.3 + it.ph * 3) * 5, 2, 2); } }
        else { cx.fillStyle = it.col; cx.beginPath(); cx.arc(0, 0, it.size, 0, 6.28); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.6)'; cx.beginPath(); cx.arc(-6, -6, 5, 0, 6.28); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.arc(0, -it.size - 4, 6, 0, 6.28); cx.stroke(); if (it.pts >= 3) { cx.fillStyle = '#fff'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center'; cx.fillText('★', 0, 4); } }
        cx.restore();
      }
      cx.restore();
      // ポイ／かぎ
      cx.save(); cx.translate(poi.x, poi.y);
      if (kind === 'yoyo') { cx.strokeStyle = '#b08a4a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(60, -240); cx.stroke(); cx.strokeStyle = `rgba(255,255,255,${poi.down ? 1 : 0.6})`; cx.lineWidth = 3; cx.beginPath(); cx.arc(0, 0, c.R * 0.7, 0.3, 5.5); cx.stroke(); cx.strokeStyle = `rgba(255,${(poi.hp * 255) | 0},${(poi.hp * 200) | 0},1)`; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, -40); cx.stroke(); }
      else { cx.strokeStyle = '#c0392b'; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(c.R * 0.7, c.R * 0.7); cx.lineTo(c.R * 2.6, c.R * 2.6); cx.stroke(); cx.strokeStyle = '#d54b3a'; cx.lineWidth = 4; cx.beginPath(); cx.arc(0, 0, c.R, 0, 6.28); cx.stroke(); cx.fillStyle = `rgba(255,248,230,${0.25 + 0.55 * Math.max(0, poi.hp)})`; cx.beginPath(); cx.arc(0, 0, c.R - 2, 0, 6.28); cx.fill(); if (poi.hp < 0.6) { cx.fillStyle = 'rgba(80,140,190,.9)'; for (let k = 0; k < Math.floor((0.6 - poi.hp) * 12); k++) { cx.beginPath(); cx.arc(Math.cos(k * 2.4) * c.R * 0.5, Math.sin(k * 3.1) * c.R * 0.5, 3 + k * 0.3, 0, 6.28); cx.fill(); } } }
      if (poi.down) { cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(0, 0, c.R + 6 + Math.sin(time * 12) * 2, 0, 6.28); cx.stroke(); }
      cx.restore();
      // お椀
      cx.fillStyle = '#eee'; rr(cx, 20, 480, W - 40, 66, 18); cx.fill(); cx.fillStyle = '#cfe9ff'; rr(cx, 28, 488, W - 56, 50, 14); cx.fill();
      bowl.forEach((it, i) => { cx.fillStyle = it.col; cx.beginPath(); cx.arc(48 + (i % 18) * 22, 512 + ((i / 18) | 0) * 14, kind === 'goldfish' ? 8 : 7, 0, 6.28); cx.fill(); });
      // 紙の強さ
      cx.fillStyle = '#000a'; rr(cx, 14, 44, 160, 18, 9); cx.fill(); cx.fillStyle = poi.hp > 0.4 ? '#8fe08a' : '#ff6a5a'; rr(cx, 16, 46, Math.max(0, 156 * poi.hp), 14, 7); cx.fill(); cx.fillStyle = '#fff'; cx.font = '12px sans-serif'; cx.textAlign = 'left'; cx.fillText(kind === 'yoyo' ? 'こより' : '紙', 22, 58);
      cx.fillStyle = '#fff'; cx.font = '14px sans-serif'; cx.textAlign = 'right'; cx.fillText(kind === 'yoyo' ? 'おして → 引く：はなすとつり上げ' : 'おしている間 水の中・はなすとすくう', W - 14, 58);
    };
    g.info = () => `${score}点 / ${caught}こ`; g.endSub = () => `${caught}こ・${score}点${torn ? '' : ''}`; g.result = () => ({ score, caught, torn });
    return g;
  }

  // ---------- 輪投げ ----------
  function ring() {
    const g = base({}), pegs = [], rings = []; let left = 6, score = 0, aim = { x: W / 2, y: 260 }, ema = 0, last = null, flying = null, msg = '', t = 0;
    [[100, 5, 3], [190, 4, 2], [290, 3, 1]].forEach(([y, n, p]) => { for (let i = 0; i < n; i++) pegs.push({ x: 60 + (W - 120) * (n === 1 ? 0.5 : i / (n - 1)), y, p, r: 12 - p }); });
    pegs.push({ x: W / 2, y: 40, p: 8, r: 8, gold: 1 });
    g.move = (x, y) => { if (last) ema = ema * 0.8 + Math.hypot(x - last[0], y - last[1]) * 0.2; last = [x, y]; aim.x = clamp(x, 20, W - 20); aim.y = clamp(y, 20, 470); };
    g.down = (x, y) => { g.move(x, y); if (flying || left <= 0) return; left--; const w = 5 + ema * 1.1 + (aim.y > 300 ? 2 : 0); flying = { t: 0, sx: W / 2, sy: 540, x: aim.x + rnd(-w, w), y: aim.y + rnd(-w, w) }; snd('swoosh'); };
    g.update = dt => {
      t += dt; ema *= 0.97; if (g.done) return;
      if (flying) { flying.t += dt / 0.55; if (flying.t >= 1) { const f = flying; flying = null; let hit = null; for (const p of pegs) if (Math.hypot(p.x - f.x, p.y - f.y) < p.r + 3) hit = p; rings.push({ x: f.x, y: f.y, hit: !!hit }); if (hit) { score += hit.p; msg = `+${hit.p}点！`; snd(hit.p >= 3 ? 'ok' : 'coin'); } else { msg = 'ざんねん…'; snd('ng'); } if (left <= 0) setTimeout(() => g.finish(), 700); } }
    };
    g.draw = cx => {
      cx.fillStyle = '#6a8f5a'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#b89a6a'; rr(cx, 20, 20, W - 40, 470, 20); cx.fill();
      for (const p of pegs) { cx.fillStyle = '#6b4a2a'; cx.beginPath(); cx.ellipse(p.x, p.y + 4, p.r + 4, p.r * 0.6 + 3, 0, 0, 6.28); cx.fill(); cx.fillStyle = p.gold ? '#ffd23f' : '#fff3d0'; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); cx.fillStyle = '#c0392b'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center'; cx.fillText(p.p, p.x, p.y + 4); }
      for (const r of rings) { cx.strokeStyle = r.hit ? '#ff6a8a' : '#d94a4a'; cx.lineWidth = 5; cx.beginPath(); cx.ellipse(r.x, r.y, 15, 10, 0, 0, 6.28); cx.stroke(); }
      if (flying) { const f = flying, k = f.t, x = f.sx + (f.x - f.sx) * k, y = f.sy + (f.y - f.sy) * k - Math.sin(k * Math.PI) * 140, s = 1.6 - k * 0.6; cx.strokeStyle = '#ff4a4a'; cx.lineWidth = 5; cx.beginPath(); cx.ellipse(x, y, 15 * s, 10 * s, 0, 0, 6.28); cx.stroke(); }
      if (!g.done) { const w = 5 + ema * 1.1; cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(aim.x, aim.y, w + 6, 0, 6.28); cx.stroke(); cx.beginPath(); cx.moveTo(aim.x - 10, aim.y); cx.lineTo(aim.x + 10, aim.y); cx.moveTo(aim.x, aim.y - 10); cx.lineTo(aim.x, aim.y + 10); cx.stroke(); }
      cx.fillStyle = '#fff'; cx.font = 'bold 16px sans-serif'; cx.textAlign = 'center'; cx.fillText(msg, W / 2, 515); cx.font = '13px sans-serif'; cx.fillText('ねらってタップ。マウスをうごかすほど ぶれる！ 奥ほど高得点', W / 2, 545);
      for (let i = 0; i < left; i++) { cx.strokeStyle = '#ff4a4a'; cx.lineWidth = 4; cx.beginPath(); cx.ellipse(40 + i * 28, 505, 11, 7, 0, 0, 6.28); cx.stroke(); }
    };
    g.info = () => `${score}点 のこり${left}`; g.endSub = () => `${score}点`; g.result = () => ({ score });
    return g;
  }

  // ---------- 焼き物（たこやき・やきそば・クレープ・ポテト・りんご飴） ----------
  function grill(th) {
    const g = base({}), cells = []; let time = 40, good = 0, burnt = 0, msg = '', fl = 0;
    for (let i = 0; i < 9; i++) cells.push({ x: 90 + (i % 3) * 150, y: 150 + ((i / 3) | 0) * 130, s: 0, t: 0 });
    const hit = (x, y) => cells.find(c => Math.hypot(c.x - x, c.y - y) < 58);
    g.down = (x, y) => {
      const c = hit(x, y); if (!c) return;
      if (c.s === 0) { c.s = 1; c.t = 0; snd('pop'); }
      else if (c.s === 1) { if (c.t < th.ready[0]) { msg = 'まだ生っぽい！'; snd('ng'); } else if (c.t <= th.ready[1]) { good++; c.s = 0; msg = c.t > (th.ready[0] + th.ready[1]) / 2 - 0.6 && c.t < (th.ready[0] + th.ready[1]) / 2 + 0.6 ? 'かんぺき！' : 'いい焼きかげん！'; snd('coin'); fl = 1; } else { burnt++; c.s = 0; msg = 'こげちゃった…'; snd('ng'); } }
    };
    g.update = dt => { if (g.done) return; time -= dt; fl = Math.max(0, fl - dt * 3); for (const c of cells) if (c.s === 1) { c.t += dt; if (c.t > th.ready[1] + 2.5) { burnt++; c.s = 0; msg = 'こげちゃった…'; snd('ng'); } } if (time <= 0) { g.endText = 'じかん！'; g.finish(); } };
    g.draw = cx => {
      cx.fillStyle = '#3a3a44'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#b8b8c4'; rr(cx, 30, 80, W - 60, 420, 18); cx.fill();
      for (const c of cells) {
        cx.fillStyle = '#555'; cx.beginPath(); cx.arc(c.x, c.y, 54, 0, 6.28); cx.fill(); cx.fillStyle = '#2a2a2a'; cx.beginPath(); cx.arc(c.x, c.y, 46, 0, 6.28); cx.fill();
        if (c.s === 1) {
          const p = c.t, col = p < th.ready[0] ? '#f3ead2' : p <= th.ready[1] ? '#e0a040' : '#2b1a10';
          const lerp = p < th.ready[0] ? '#f3ead2' : col; cx.fillStyle = lerp; cx.beginPath(); cx.arc(c.x, c.y, 36 + Math.min(6, p), 0, 6.28); cx.fill();
          cx.font = '30px sans-serif'; cx.textAlign = 'center'; cx.fillText(th.icon, c.x, c.y + 11);
          if (p >= th.ready[0] && p <= th.ready[1]) { cx.strokeStyle = '#ffee66'; cx.lineWidth = 4; cx.beginPath(); cx.arc(c.x, c.y, 50 + Math.sin(p * 10) * 2, 0, 6.28); cx.stroke(); }
          cx.strokeStyle = '#fff'; cx.lineWidth = 4; cx.beginPath(); cx.arc(c.x, c.y, 56, -1.57, -1.57 + 6.28 * Math.min(1, p / (th.ready[1] + 2.5))); cx.stroke();
          if (p > th.ready[1]) { cx.fillStyle = 'rgba(80,80,80,.6)'; for (let k = 0; k < 3; k++) { cx.beginPath(); cx.arc(c.x - 8 + k * 8, c.y - 40 - ((p * 20 + k * 9) % 24), 5, 0, 6.28); cx.fill(); } }
        } else { cx.fillStyle = '#777'; cx.font = '14px sans-serif'; cx.textAlign = 'center'; cx.fillText('タップで入れる', c.x, c.y + 5); }
      }
      cx.fillStyle = '#fff'; cx.font = 'bold 18px sans-serif'; cx.textAlign = 'center'; cx.fillText(msg, W / 2, 530); cx.font = '13px sans-serif'; cx.fillText(th.hint, W / 2, 62);
      cx.fillStyle = '#000a'; rr(cx, 14, 20, 140, 22, 11); cx.fill(); cx.fillStyle = '#ffd23f'; rr(cx, 16, 22, Math.max(0, 136 * time / 40), 18, 9); cx.fill();
    };
    g.info = () => `${th.name}${good}こ`; g.endSub = () => `${good}こ成功・こげ${burnt}こ`;
    g.result = () => ({ score: Math.max(0, good * 12 - burnt * 6), good, burnt });
    return g;
  }

  // ---------- ぐるぐる（わたあめ・かき氷） ----------
  function spin(th) {
    const g = base({}), cx0 = W / 2, cy0 = 290; let prog = 0, ang = null, spd = 0, down = false, time = 30, msg = '', spill = 0;
    g.down = (x, y) => { down = true; ang = Math.atan2(y - cy0, x - cx0); };
    g.up = () => { down = false; ang = null; };
    g.move = (x, y) => { if (!down || g.done) return; const a = Math.atan2(y - cy0, x - cx0); if (ang !== null) { let d = a - ang; d = Math.atan2(Math.sin(d), Math.cos(d)); spd = spd * 0.7 + Math.abs(d) * 60 * 0.3; if (Math.hypot(x - cx0, y - cy0) > 40) { if (spd > 3 && spd < 11) { prog += Math.abs(d) * th.k; } else if (spd >= 11) { prog = Math.max(0, prog - Math.abs(d) * th.k * 0.5); spill = 0.4; msg = 'まわしすぎ！'; } } } ang = a; };
    g.update = dt => { if (g.done) return; time -= dt; spd *= 0.96; spill = Math.max(0, spill - dt); if (prog >= 100) { prog = 100; g.endText = 'できあがり！'; g.finish(); snd('ok'); } if (time <= 0) { g.endText = 'じかん！'; g.finish(); } if (spd < 3 && down) msg = 'もっとはやく！'; else if (spd < 11 && down) msg = ''; };
    g.draw = cx => {
      cx.fillStyle = '#4a3a5a'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#d8d8e4'; cx.beginPath(); cx.arc(cx0, cy0, 170, 0, 6.28); cx.fill(); cx.fillStyle = '#9a9aa8'; cx.beginPath(); cx.arc(cx0, cy0, 150, 0, 6.28); cx.fill();
      const r = 20 + prog * 1.3; cx.fillStyle = th.col; for (let i = 0; i < 14; i++) { const a = i * 0.9 + (down ? Date.now() / 200 : 0) * 0.2; cx.beginPath(); cx.arc(cx0 + Math.cos(a) * r * 0.45, cy0 + Math.sin(a) * r * 0.45, r * 0.55, 0, 6.28); cx.fill(); }
      if (spill > 0) { cx.fillStyle = th.col; for (let i = 0; i < 8; i++) { cx.beginPath(); cx.arc(cx0 + Math.cos(i) * (190 + spill * 40), cy0 + Math.sin(i) * (190 + spill * 40), 5, 0, 6.28); cx.fill(); } }
      cx.font = '40px sans-serif'; cx.textAlign = 'center'; cx.fillText(th.icon, cx0, cy0 + 14);
      cx.fillStyle = '#000a'; rr(cx, 40, 490, W - 80, 22, 11); cx.fill(); cx.fillStyle = th.col; rr(cx, 42, 492, Math.max(0, (W - 84) * prog / 100), 18, 9); cx.fill();
      cx.fillStyle = '#fff'; cx.font = 'bold 18px sans-serif'; cx.fillText(msg, W / 2, 60); cx.font = '13px sans-serif'; cx.fillText(th.hint, W / 2, 535);
      cx.fillStyle = '#000a'; rr(cx, 14, 20, 140, 22, 11); cx.fill(); cx.fillStyle = '#ffd23f'; rr(cx, 16, 22, Math.max(0, 136 * time / 30), 18, 9); cx.fill();
      const ma = -2.4 + clamp(spd / 14, 0, 1) * 4.8; cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.arc(W - 60, 90, 36, -2.4 - 1.57, 2.4 - 1.57); cx.stroke(); cx.strokeStyle = '#8fe08a'; cx.lineWidth = 6; cx.beginPath(); cx.arc(W - 60, 90, 36, -2.4 + (3 / 14) * 4.8 - 1.57, -2.4 + (11 / 14) * 4.8 - 1.57); cx.stroke(); cx.strokeStyle = '#ff6a5a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(W - 60, 90); cx.lineTo(W - 60 + Math.cos(ma - 1.57) * 34, 90 + Math.sin(ma - 1.57) * 34); cx.stroke();
    };
    g.info = () => `${prog | 0}%`; g.endSub = () => `${prog | 0}%`; g.result = () => ({ score: Math.round(prog * 0.9), prog });
    return g;
  }

  // ---------- ラムネ（そそぐ） ----------
  function pour() {
    const g = base({}); let lv = 0, holding = false, n = 0, tot = 0, res = [], foam = 0, msg = '', target = 0.72, lock = 0;
    g.down = () => { if (lock > 0 || g.done) return; holding = true; lv = 0; foam = 0; snd('swoosh'); };
    g.up = () => { if (!holding) return; holding = false; const e = Math.abs(lv - target); const s = Math.max(0, Math.round(100 - e * 400)); res.push(s); tot += s; msg = e < 0.03 ? 'ぴったり！' : lv > target ? 'あふれた…' : 'たりない…'; snd(e < 0.06 ? 'ok' : 'ng'); lock = 1.2; n++; if (n >= 3) { g.endText = 'ぜんぶそそいだ！'; setTimeout(() => g.finish(), 900); } };
    g.update = dt => { if (g.done) return; if (holding) { lv += dt * 0.42; foam = Math.min(1, foam + dt); if (lv > 1) { lv = 1; g.up(); } } lock -= dt; if (lock <= 0 && !holding && n < 3 && lock > -dt) { lv = 0; target = 0.55 + Math.random() * 0.3; msg = ''; } };
    g.draw = cx => {
      cx.fillStyle = '#2a4a6a'; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#e8f6ff'; rr(cx, 150, 150, 180, 320, 24); cx.fill(); cx.fillStyle = '#a8dcff'; const h = 300 * lv; rr(cx, 158, 160 + (300 - h), 164, h, 14); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) { cx.beginPath(); cx.arc(170 + (i * 53) % 140, 170 + 300 - ((Date.now() / 6 + i * 70) % Math.max(10, h)), 3, 0, 6.28); if (holding) cx.fill(); }
      cx.strokeStyle = '#ff5a6a'; cx.lineWidth = 4; const ty = 160 + 300 - 300 * target; cx.beginPath(); cx.moveTo(130, ty); cx.lineTo(350, ty); cx.stroke(); cx.fillStyle = '#ff5a6a'; cx.font = 'bold 14px sans-serif'; cx.textAlign = 'left'; cx.fillText('ここ！', 356, ty + 5);
      if (holding) { cx.fillStyle = '#7ccaff'; cx.fillRect(W / 2 - 4, 60, 8, 160 + 300 - h - 60); }
      cx.font = '36px sans-serif'; cx.textAlign = 'center'; cx.fillText('🍼', W / 2 + 40, 70);
      cx.fillStyle = '#fff'; cx.font = 'bold 20px sans-serif'; cx.fillText(msg, W / 2, 130); cx.font = '14px sans-serif'; cx.fillText('おしている間そそぐ。線でちょうどはなす！', W / 2, 520); res.forEach((s, i) => cx.fillText(`${i + 1}ぱい目 ${s}点`, 60 + i * 120, 545));
    };
    g.info = () => `${n}/3`; g.endSub = () => `${Math.round(tot / 3)}点`; g.result = () => ({ score: Math.round(tot / 3) });
    return g;
  }

  const TH = {
    tako: { name: 'たこやき', icon: '🐙', ready: [3.5, 6.5], hint: 'きつね色になったら、ひっくり返してお皿へ！' },
    yakisoba: { name: 'やきそば', icon: '🍜', ready: [3, 5.5], hint: 'いい焼き色のときにタップ！' },
    crepe: { name: 'クレープ', icon: '🥞', ready: [2.5, 5], hint: 'ふちが色づいたらタップ！' },
    potato: { name: 'ポテト', icon: '🍟', ready: [3, 6], hint: 'きんいろに揚がったらタップ！' },
    apple: { name: 'りんご飴', icon: '🍎', ready: [3, 5.5], hint: 'あめがツヤツヤになったらタップ！' },
    wata: { name: 'わたあめ', icon: '🍭', col: '#ffc8e8', k: 6.5, hint: 'ちょうどいい速さでぐるぐる！' },
    kaki: { name: 'かき氷', icon: '🍧', col: '#e0f4ff', k: 6.5, hint: 'ハンドルをぐるぐる回して削る！' },
  };
  return {
    scoop: (kind, cb) => run(SCOOP[kind].title, scoop(kind), cb), ring: cb => run('🎯 輪投げ', ring(), cb),
    cook: (id, cb) => { const th = TH[id]; if (th.col) run(th.icon + ' ' + th.name, spin(th), cb); else run(th.icon + ' ' + th.name, grill(th), cb); },
    pour: cb => run('🥤 ラムネ', pour(), cb), close, hasCook: id => !!TH[id],
  };
})();
