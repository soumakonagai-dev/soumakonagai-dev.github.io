// 描画素材：ブロック・アイコン・敵キャラ・背景。すべてコードで描くので画像ファイルは不要。
(function () {
  const A = BB.art = {};
  const D = BB.data;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  A.clamp = clamp;
  A.ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  A.easeInOut = t => { t = clamp(t, 0, 1); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  // #rrggbb を白(+)か黒(-)へ寄せる
  A.shade = function (hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, k = Math.abs(amt);
    r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k); b = Math.round(b + (t - b) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };
  A.rgba = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  A.rr = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  // ---------- アイコン（白抜き） ----------
  A.icon = function (c, kind, cx, cy, r) {
    c.save();
    c.translate(cx, cy);
    c.fillStyle = 'rgba(255,255,255,.96)';
    c.strokeStyle = 'rgba(255,255,255,.96)';
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = r * .25; c.shadowOffsetY = r * .08;
    c.lineJoin = 'round'; c.lineCap = 'round';
    switch (kind) {
      case 'attack': {   // 剣
        c.rotate(-Math.PI / 4);
        c.beginPath();
        c.moveTo(0, -r * 1.05); c.lineTo(r * .2, -r * .8); c.lineTo(r * .2, r * .3); c.lineTo(-r * .2, r * .3); c.lineTo(-r * .2, -r * .8);
        c.closePath(); c.fill();
        c.lineWidth = r * .2; c.beginPath(); c.moveTo(-r * .55, r * .35); c.lineTo(r * .55, r * .35); c.stroke();
        c.lineWidth = r * .24; c.beginPath(); c.moveTo(0, r * .45); c.lineTo(0, r * .9); c.stroke();
        break;
      }
      case 'magic': {    // 星
        const star = (R, rr, rot) => {
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = rot + i * Math.PI / 4, rad = i % 2 ? rr : R;
            c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          }
          c.closePath(); c.fill();
        };
        star(r * 1.0, r * .3, -Math.PI / 2);
        c.translate(r * .72, -r * .72); star(r * .32, r * .12, -Math.PI / 2);
        break;
      }
      case 'heal': {     // ハート
        c.beginPath();
        c.moveTo(0, r * .9);
        c.bezierCurveTo(-r * 1.35, r * .05, -r * .75, -r * .95, 0, -r * .35);
        c.bezierCurveTo(r * .75, -r * .95, r * 1.35, r * .05, 0, r * .9);
        c.fill();
        break;
      }
      case 'guard': {    // 盾
        c.beginPath();
        c.moveTo(0, -r); c.lineTo(r * .85, -r * .6); c.lineTo(r * .85, r * .1);
        c.bezierCurveTo(r * .85, r * .6, r * .35, r * .85, 0, r);
        c.bezierCurveTo(-r * .35, r * .85, -r * .85, r * .6, -r * .85, r * .1);
        c.lineTo(-r * .85, -r * .6); c.closePath(); c.fill();
        c.shadowColor = 'transparent';
        c.globalCompositeOperation = 'destination-out';
        c.globalAlpha = .45;
        c.beginPath(); c.moveTo(0, -r * .62); c.lineTo(r * .5, -r * .38); c.lineTo(r * .5, r * .1); c.bezierCurveTo(r * .5, r * .4, r * .2, r * .55, 0, r * .66); c.closePath(); c.fill();
        break;
      }
      case 'poison': {   // しずく
        c.beginPath();
        c.moveTo(0, -r);
        c.bezierCurveTo(r * .95, r * .1, r * .8, r * .95, 0, r * .95);
        c.bezierCurveTo(-r * .8, r * .95, -r * .95, r * .1, 0, -r);
        c.fill();
        break;
      }
      case 'charge': {   // 稲妻
        c.beginPath();
        c.moveTo(r * .3, -r); c.lineTo(-r * .6, r * .15); c.lineTo(-r * .08, r * .15);
        c.lineTo(-r * .3, r); c.lineTo(r * .65, -r * .22); c.lineTo(r * .1, -r * .22);
        c.closePath(); c.fill();
        break;
      }
      case 'stun': {     // うずまき
        c.lineWidth = r * .28;
        c.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = i / 40 * Math.PI * 4, rad = r * (.12 + i / 40 * .85);
          const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.stroke();
        break;
      }
    }
    c.restore();
  };

  // ---------- ブロック ----------
  A.block = function (c, x, y, s, ability, o) {
    o = o || {};
    const col = o.stone ? '#6f7790' : D.abilities[ability].color;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    const sc = o.scale || 1;
    if (sc !== 1 || o.rot) {
      c.translate(x + s / 2, y + s / 2);
      if (o.rot) c.rotate(o.rot);
      c.scale(sc, sc);
      c.translate(-(x + s / 2), -(y + s / 2));
    }
    const p = s * .05, w = s - p * 2, r = s * .2;
    c.fillStyle = 'rgba(0,0,0,.32)';
    A.rr(c, x + p, y + p + s * .07, w, w, r); c.fill();
    let g = c.createLinearGradient(0, y + p, 0, y + p + w);
    g.addColorStop(0, A.shade(col, .3)); g.addColorStop(.5, col); g.addColorStop(1, A.shade(col, -.34));
    c.fillStyle = g; A.rr(c, x + p, y + p, w, w, r); c.fill();
    g = c.createLinearGradient(0, y + p, 0, y + p + w);
    g.addColorStop(0, 'rgba(255,255,255,.65)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    c.strokeStyle = g; c.lineWidth = Math.max(1, s * .05);
    A.rr(c, x + p + 1, y + p + 1, w - 2, w - 2, r - 1); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.2)';
    A.rr(c, x + p + w * .12, y + p + w * .08, w * .76, w * .3, r * .7); c.fill();
    if (o.stone) {
      c.fillStyle = 'rgba(0,0,0,.22)';
      c.beginPath(); c.moveTo(x + s * .15, y + s * .85); c.lineTo(x + s * .5, y + s * .45); c.lineTo(x + s * .85, y + s * .85); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)';
      c.beginPath(); c.moveTo(x + s * .2, y + s * .35); c.lineTo(x + s * .45, y + s * .2); c.lineTo(x + s * .6, y + s * .4); c.lineTo(x + s * .3, y + s * .5); c.closePath(); c.fill();
    } else if (ability !== 'none' && s >= 16) {
      A.icon(c, ability, x + s / 2, y + s / 2 + s * .01, s * .27);
    }
    if (o.ice) {
      g = c.createLinearGradient(0, y, 0, y + s);
      g.addColorStop(0, 'rgba(215,245,255,.82)'); g.addColorStop(1, 'rgba(120,190,235,.6)');
      c.fillStyle = g; A.rr(c, x + p, y + p, w, w, r); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, s * .03);
      c.beginPath();
      c.moveTo(x + s * .25, y + s * .2); c.lineTo(x + s * .45, y + s * .5); c.lineTo(x + s * .35, y + s * .8);
      c.moveTo(x + s * .45, y + s * .5); c.lineTo(x + s * .78, y + s * .6);
      c.moveTo(x + s * .7, y + s * .2); c.lineTo(x + s * .55, y + s * .38);
      c.stroke();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(x + s * .75, y + s * .28, s * .05, 0, 7); c.fill();
    }
    c.restore();
  };

  // ---------- 敵キャラ（-100..100 の座標で描く） ----------
  function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  function grad(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  function eye(c, x, y, rx, ry, look, angry, side) {
    c.fillStyle = '#fff'; ellipse(c, x, y, rx, ry); c.fill();
    c.fillStyle = '#1b1f33'; ellipse(c, x + look * rx * .3, y + ry * .1, rx * .5, ry * .62); c.fill();
    c.fillStyle = '#fff'; ellipse(c, x + look * rx * .3 - rx * .15, y - ry * .2, rx * .17, ry * .17); c.fill();
    if (angry) {
      c.strokeStyle = '#1b1f33'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + rx * 1.1 * side, y - ry * 1.5); c.lineTo(x - rx * 1.1 * side, y - ry * .8); c.stroke();
    }
  }

  const ART = {
    slime(c, t, m) {
      const sq = 1 + .05 * Math.sin(t * 3), h = 78 * sq, w = 84 / Math.sqrt(sq);
      c.fillStyle = 'rgba(0,0,0,.25)'; ellipse(c, 0, 66, w * .85, 12); c.fill();
      c.beginPath();
      c.moveTo(-w, 52);
      c.bezierCurveTo(-w, -h * .2, -w * .55, -h + 8, 0, -h + 8);
      c.bezierCurveTo(w * .55, -h + 8, w, -h * .2, w, 52);
      c.bezierCurveTo(w * .6, 68, -w * .6, 68, -w, 52);
      c.closePath();
      c.fillStyle = grad(c, 0, -h, 0, 68, [[0, '#a6f0a0'], [.55, '#4fc766'], [1, '#26914a']]); c.fill();
      c.strokeStyle = 'rgba(20,90,40,.55)'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.42)'; ellipse(c, -w * .42, -h * .45, 16, 9); c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)'; ellipse(c, -w * .1, -h * .62, 7, 4); c.fill();
      const look = Math.sin(t * .8) * .6, ang = m === 'angry';
      eye(c, -26, -4, 14, 18, look, ang, -1); eye(c, 26, -4, 14, 18, look, ang, 1);
      c.strokeStyle = '#1b1f33'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath();
      if (ang) c.arc(0, 38, 14, Math.PI * 1.1, Math.PI * 1.9); else c.arc(0, 22, 14, .15 * Math.PI, .85 * Math.PI);
      c.stroke();
      c.fillStyle = 'rgba(255,120,140,.45)'; ellipse(c, -50, 20, 9, 5); c.fill(); ellipse(c, 50, 20, 9, 5); c.fill();
    },
    goblin(c, t, m) {
      const bob = Math.sin(t * 2.4) * 3, ang = m === 'angry';
      c.save(); c.translate(0, bob);
      c.fillStyle = 'rgba(0,0,0,.25)'; ellipse(c, 0, 84, 62, 10); c.fill();
      // こん棒
      c.save(); c.translate(74, 30); c.rotate(.5 + Math.sin(t * 2.4) * .06 - (ang ? .5 : 0));
      c.fillStyle = grad(c, -10, 0, 10, 0, [[0, '#a56a35'], [1, '#6b3f1c']]);
      c.beginPath(); c.moveTo(-6, 40); c.lineTo(6, 40); c.lineTo(15, -48); c.lineTo(-15, -48); c.closePath(); c.fill();
      c.fillStyle = '#d8d3c4';
      [[-14, -34], [15, -30], [-13, -12], [14, -8]].forEach(([sx, sy]) => { c.beginPath(); c.moveTo(sx, sy - 6); c.lineTo(sx + Math.sign(sx) * 11, sy); c.lineTo(sx, sy + 6); c.closePath(); c.fill(); });
      c.restore();
      // 体
      c.fillStyle = grad(c, 0, 20, 0, 90, [[0, '#9a5f32'], [1, '#6a3c1d']]);
      A.rr(c, -44, 24, 88, 62, 24); c.fill();
      c.fillStyle = '#4a2a14'; c.fillRect(-44, 60, 88, 7);
      c.fillStyle = '#e8c35a'; c.fillRect(-9, 58, 18, 11);
      // 耳
      c.fillStyle = grad(c, -100, 0, -40, 0, [[0, '#6aa032'], [1, '#8fc04a']]);
      c.beginPath(); c.moveTo(-46, -22); c.lineTo(-104, -50); c.lineTo(-46, 12); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(46, -22); c.lineTo(104, -50); c.lineTo(46, 12); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,150,150,.5)';
      c.beginPath(); c.moveTo(-52, -18); c.lineTo(-88, -38); c.lineTo(-52, 2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(52, -18); c.lineTo(88, -38); c.lineTo(52, 2); c.closePath(); c.fill();
      // 頭
      c.fillStyle = grad(c, 0, -70, 0, 40, [[0, '#b6e060'], [1, '#76a838']]);
      ellipse(c, 0, -14, 56, 52); c.fill();
      c.strokeStyle = 'rgba(40,80,10,.5)'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.25)'; ellipse(c, -20, -50, 20, 8); c.fill();
      // 目
      [-1, 1].forEach(sd => {
        const ex = sd * 23, ey = -20;
        c.fillStyle = '#ffe14d'; ellipse(c, ex, ey, 13, 11); c.fill();
        c.fillStyle = '#1b1f33'; ellipse(c, ex, ey + 1, 3.5, 9); c.fill();
        c.strokeStyle = '#2b3a10'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ex + sd * 17, ey - 22); c.lineTo(ex - sd * 14, ey - 8 + (ang ? 2 : 0)); c.stroke();
      });
      // 鼻・口
      c.fillStyle = '#5f8a2a'; ellipse(c, 0, 0, 7, 9); c.fill();
      c.fillStyle = '#2a1410'; A.rr(c, -26, 16, 52, 17, 8); c.fill();
      c.fillStyle = '#f4f0e2';
      for (let i = 0; i < 5; i++) { const tx = -22 + i * 11; c.beginPath(); c.moveTo(tx, 16); c.lineTo(tx + 5, 25); c.lineTo(tx + 10, 16); c.closePath(); c.fill(); }
      c.restore();
    },
    dragon(c, t, m) {
      const flap = Math.sin(t * 2.2) * .2, bob = Math.sin(t * 1.6) * 4, ang = m === 'angry';
      c.save(); c.translate(0, bob);
      c.fillStyle = 'rgba(0,0,0,.28)'; ellipse(c, 0, 92, 70, 10); c.fill();
      // 翼
      [-1, 1].forEach(sd => {
        c.save(); c.scale(sd, 1); c.translate(46, 10); c.rotate(-.5 + flap);
        c.fillStyle = grad(c, 0, -90, 90, 20, [[0, '#7a3fb8'], [1, '#3e1d6e']]);
        c.beginPath(); c.moveTo(0, 10); c.lineTo(6, -88); c.lineTo(36, -50); c.lineTo(52, -78); c.lineTo(70, -30); c.lineTo(100, -40); c.lineTo(78, 20); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(0, 10); c.lineTo(36, -50); c.moveTo(0, 10); c.lineTo(70, -30); c.stroke();
        c.restore();
      });
      // しっぽ
      c.strokeStyle = '#a82c2c'; c.lineWidth = 16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(40, 70); c.bezierCurveTo(100, 80, 110, 30, 88, 10); c.stroke();
      c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(80, 0); c.lineTo(100, 4); c.lineTo(90, 24); c.closePath(); c.fill();
      // 体
      c.fillStyle = grad(c, 0, -10, 0, 100, [[0, '#e0483f'], [1, '#8f1e24']]);
      ellipse(c, 0, 48, 64, 58); c.fill();
      c.fillStyle = grad(c, 0, 20, 0, 100, [[0, '#ffe4a0'], [1, '#e9b45a']]);
      ellipse(c, 0, 62, 38, 42); c.fill();
      c.strokeStyle = 'rgba(160,100,30,.5)'; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-30, 40 + i * 12); c.quadraticCurveTo(0, 46 + i * 12, 30, 40 + i * 12); c.stroke(); }
      // 足
      c.fillStyle = '#b32d2f'; ellipse(c, -34, 98, 20, 10); c.fill(); ellipse(c, 34, 98, 20, 10); c.fill();
      // 頭
      c.fillStyle = grad(c, 0, -90, 0, 10, [[0, '#f05a4a'], [1, '#b32d2f']]);
      ellipse(c, 0, -34, 52, 44); c.fill();
      c.fillStyle = grad(c, 0, -30, 0, 10, [[0, '#ff8f78'], [1, '#e0584a']]);
      ellipse(c, 0, -14, 32, 22); c.fill();
      c.fillStyle = '#5c1015'; ellipse(c, -11, -14, 4, 6); c.fill(); ellipse(c, 11, -14, 4, 6); c.fill();
      // つの・とげ
      c.fillStyle = '#f2e4c0';
      [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 26, -66); c.quadraticCurveTo(sd * 52, -88, sd * 60, -112); c.quadraticCurveTo(sd * 36, -90, sd * 12, -64); c.closePath(); c.fill(); });
      c.fillStyle = '#ffd36b';
      [-14, 0, 14].forEach(x => { c.beginPath(); c.moveTo(x - 6, -76); c.lineTo(x, -92 + Math.abs(x) * .5); c.lineTo(x + 6, -76); c.closePath(); c.fill(); });
      // 目
      [-1, 1].forEach(sd => {
        const ex = sd * 25, ey = -46;
        c.fillStyle = '#fff2a0'; ellipse(c, ex, ey, 12, 9); c.fill();
        c.fillStyle = '#c4001a'; ellipse(c, ex, ey, 4, 8); c.fill();
        c.strokeStyle = '#3a0a10'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ex + sd * 15, ey - 17); c.lineTo(ex - sd * 12, ey - 6 + (ang ? 2 : 0)); c.stroke();
      });
      if (ang) {
        c.fillStyle = '#fff'; [-16, -6, 6, 16].forEach(x => { c.beginPath(); c.moveTo(x - 3, -3); c.lineTo(x, 6); c.lineTo(x + 3, -3); c.closePath(); c.fill(); });
      }
      c.restore();
    }
  };
  // ---- ステージ 2・3 の敵 ----
  ART.skeleton = function (c, t, m) {
    const bob = Math.sin(t * 2.6) * 3, ang = m === 'angry';
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.25)'; ellipse(c, 0, 92, 56, 9); c.fill();
    const bone = grad(c, 0, -80, 0, 90, [[0, '#fbf6e6'], [1, '#c9bf9e']]);
    // 剣
    c.save(); c.translate(70, 20); c.rotate(.35 - (ang ? .6 : 0));
    c.fillStyle = grad(c, -8, 0, 8, 0, [[0, '#e8eef7'], [1, '#8fa0b8']]);
    c.beginPath(); c.moveTo(0, -70); c.lineTo(9, -50); c.lineTo(8, 30); c.lineTo(-8, 30); c.lineTo(-9, -50); c.closePath(); c.fill();
    c.fillStyle = '#7a5a2a'; c.fillRect(-18, 30, 36, 7); c.fillRect(-4, 37, 8, 22);
    c.restore();
    // 背骨・肋骨・骨盤
    c.strokeStyle = '#d8cfae'; c.lineCap = 'round';
    c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 62); c.stroke();
    c.lineWidth = 7;
    for (let i = 0; i < 4; i++) { const y = 8 + i * 13, w = 38 - i * 5; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(-w, y - 6, -w + 6, y + 10); c.moveTo(0, y); c.quadraticCurveTo(w, y - 6, w - 6, y + 10); c.stroke(); }
    c.fillStyle = bone; A.rr(c, -26, 62, 52, 20, 10); c.fill();
    [-1, 1].forEach(sd => { c.strokeStyle = '#d8cfae'; c.lineWidth = 8; c.beginPath(); c.moveTo(sd * 36, 12); c.quadraticCurveTo(sd * 62, 30, sd * 60 + (sd > 0 ? 6 : 0), 54); c.stroke(); c.beginPath(); c.moveTo(sd * 14, 80); c.lineTo(sd * 20, 96); c.stroke(); });
    // 頭蓋骨
    c.fillStyle = bone; ellipse(c, 0, -34, 44, 40); c.fill();
    c.strokeStyle = 'rgba(120,100,60,.5)'; c.lineWidth = 3; c.stroke();
    A.rr(c, -26, -6, 52, 20, 8); c.fillStyle = bone; c.fill();
    c.fillStyle = '#1b1426';
    [-1, 1].forEach(sd => { ellipse(c, sd * 18, -36, 13, 15); c.fill(); });
    c.fillStyle = ang ? '#ff4d4d' : '#6df0ff';
    [-1, 1].forEach(sd => { ellipse(c, sd * 18 + Math.sin(t) * 2, -34, 4.5, 5.5); c.fill(); });
    c.fillStyle = '#1b1426'; c.beginPath(); c.moveTo(0, -22); c.lineTo(-6, -10); c.lineTo(6, -10); c.closePath(); c.fill();
    c.strokeStyle = '#6a5a3a'; c.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 7, -2); c.lineTo(i * 7, 10); c.stroke(); }
    c.restore();
  };
  ART.ghost = function (c, t, m) {
    const fl = Math.sin(t * 2) * 8, ang = m === 'angry';
    c.save(); c.translate(0, fl);
    c.fillStyle = 'rgba(0,0,0,.18)'; ellipse(c, 0, 92 - fl, 44 - fl * .8, 7); c.fill();
    const g = grad(c, 0, -80, 0, 80, [[0, 'rgba(235,245,255,.96)'], [1, 'rgba(150,185,235,.78)']]);
    c.beginPath(); c.moveTo(-62, 70);
    c.bezierCurveTo(-72, -20, -52, -86, 0, -86); c.bezierCurveTo(52, -86, 72, -20, 62, 70);
    for (let i = 0; i < 4; i++) { const x1 = 62 - i * 31, x2 = x1 - 15.5, x3 = x1 - 31; c.quadraticCurveTo(x2 + Math.sin(t * 4 + i) * 3, 92 + (i % 2 ? -6 : 6), x3, 70); }
    c.closePath(); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(120,150,210,.6)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; ellipse(c, -26, -52, 12, 20); c.fill();
    // 腕
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 58, 0); c.quadraticCurveTo(sd * 92, 6 + Math.sin(t * 3 + sd) * 8, sd * 84, 36); c.quadraticCurveTo(sd * 70, 24, sd * 56, 24); c.fillStyle = 'rgba(200,222,250,.9)'; c.fill(); });
    // 顔
    c.fillStyle = '#26304f';
    [-1, 1].forEach(sd => { ellipse(c, sd * 24, -28, 10, ang ? 11 : 15); c.fill(); });
    if (ang) { c.strokeStyle = '#26304f'; c.lineWidth = 5; c.lineCap = 'round'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 38, -50); c.lineTo(sd * 10, -42); c.stroke(); }); }
    c.fillStyle = '#26304f'; ellipse(c, 0, 8, ang ? 18 : 12, ang ? 12 : 16); c.fill();
    c.fillStyle = '#9ad0ff'; [-1, 1].forEach(sd => { ellipse(c, sd * 24 - 2, -32, 3, 3); c.fill(); });
    // 人魂
    [[-84, -50, 0], [86, -64, 1.6]].forEach(([x, y, p]) => {
      const yy = y + Math.sin(t * 3 + p) * 6;
      const wg = c.createRadialGradient(x, yy, 1, x, yy, 16); wg.addColorStop(0, '#fff'); wg.addColorStop(.4, 'rgba(120,220,255,.9)'); wg.addColorStop(1, 'rgba(120,220,255,0)');
      c.fillStyle = wg; c.beginPath(); c.arc(x, yy, 16, 0, 7); c.fill();
    });
    c.restore();
  };
  ART.golem = function (c, t, m) {
    const bob = Math.sin(t * 1.4) * 2.5, ang = m === 'angry';
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.3)'; ellipse(c, 0, 96, 78, 10); c.fill();
    const stone = (x0, x1) => grad(c, x0, 0, x1, 0, [[0, '#9a8f84'], [.5, '#c4baa8'], [1, '#7c7268']]);
    // 腕
    [-1, 1].forEach(sd => {
      const lift = ang ? -14 : Math.sin(t * 1.4 + sd) * 4;
      c.fillStyle = stone(sd * 40, sd * 96); A.rr(c, sd > 0 ? 58 : -96, -20 + lift, 38, 66, 16); c.fill();
      c.fillStyle = '#8d8276'; A.rr(c, sd > 0 ? 52 : -102, 36 + lift, 50, 42, 18); c.fill();
      c.strokeStyle = 'rgba(40,30,20,.4)'; c.lineWidth = 3; A.rr(c, sd > 0 ? 52 : -102, 36 + lift, 50, 42, 18); c.stroke();
    });
    // 胴
    c.fillStyle = stone(-60, 60); A.rr(c, -58, -22, 116, 108, 26); c.fill();
    c.strokeStyle = 'rgba(40,30,20,.45)'; c.lineWidth = 3; A.rr(c, -58, -22, 116, 108, 26); c.stroke();
    c.beginPath(); c.moveTo(-20, -4); c.lineTo(-6, 22); c.lineTo(-24, 44); c.moveTo(24, 30); c.lineTo(10, 54); c.lineTo(28, 78); c.stroke();
    c.fillStyle = 'rgba(90,150,70,.55)'; ellipse(c, -38, -16, 20, 7); c.fill(); ellipse(c, 44, 70, 14, 6); c.fill();
    // 足
    c.fillStyle = '#8d8276'; A.rr(c, -50, 76, 40, 24, 8); c.fill(); A.rr(c, 10, 76, 40, 24, 8); c.fill();
    // 頭
    c.fillStyle = stone(-36, 36); A.rr(c, -36, -86, 72, 62, 18); c.fill();
    c.strokeStyle = 'rgba(40,30,20,.45)'; c.stroke();
    const glow = .6 + .4 * Math.sin(t * 3);
    c.fillStyle = ang ? '#ff5a3a' : '#ffd24a'; c.shadowColor = c.fillStyle; c.shadowBlur = 14 * glow;
    A.rr(c, -26, -62, 18, 12, 4); c.fill(); A.rr(c, 8, -62, 18, 12, 4); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#4a4036'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-18, -38); c.lineTo(18, -38); c.stroke();
    c.restore();
  };
  ART.knight = function (c, t, m) {
    const bob = Math.sin(t * 2) * 2.5, ang = m === 'angry';
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.3)'; ellipse(c, 0, 94, 60, 9); c.fill();
    const steel = grad(c, -50, 0, 50, 0, [[0, '#3b3f5c'], [.5, '#6a7092'], [1, '#2c3048']]);
    // マント
    c.fillStyle = grad(c, 0, 0, 0, 100, [[0, '#8a1230'], [1, '#470a1c']]);
    c.beginPath(); c.moveTo(-60, -10); c.quadraticCurveTo(-90, 60, -66, 98); c.lineTo(66, 98); c.quadraticCurveTo(90, 60, 60, -10); c.closePath(); c.fill();
    // 大剣
    c.save(); c.translate(-76, 30); c.rotate(-.25 + (ang ? -.4 : 0));
    c.fillStyle = grad(c, -12, 0, 12, 0, [[0, '#d9dff0'], [1, '#6d7690']]);
    c.beginPath(); c.moveTo(0, -96); c.lineTo(13, -70); c.lineTo(12, 36); c.lineTo(-12, 36); c.lineTo(-13, -70); c.closePath(); c.fill();
    c.fillStyle = '#2a2d44'; c.fillRect(-26, 36, 52, 9); c.fillRect(-5, 45, 10, 26);
    c.restore();
    // 胴・脚
    c.fillStyle = steel; A.rr(c, -44, -6, 88, 76, 16); c.fill();
    c.strokeStyle = '#1d2036'; c.lineWidth = 3; A.rr(c, -44, -6, 88, 76, 16); c.stroke();
    c.fillStyle = '#c0272f'; c.fillRect(-4, -4, 8, 72);
    A.rr(c, -38, 68, 32, 30, 8); c.fillStyle = steel; c.fill(); A.rr(c, 6, 68, 32, 30, 8); c.fill();
    // 肩
    [-1, 1].forEach(sd => { c.fillStyle = steel; ellipse(c, sd * 50, 0, 24, 20); c.fill(); c.stroke(); c.fillStyle = '#c0272f'; c.beginPath(); c.moveTo(sd * 44, -16); c.lineTo(sd * 52, -34); c.lineTo(sd * 60, -14); c.closePath(); c.fill(); });
    // 兜
    c.fillStyle = steel; A.rr(c, -32, -78, 64, 76, 24); c.fill(); c.stroke();
    c.fillStyle = '#c0272f'; c.beginPath(); c.moveTo(-26, -80); c.lineTo(-44, -118); c.lineTo(-12, -84); c.closePath(); c.fill(); c.beginPath(); c.moveTo(26, -80); c.lineTo(44, -118); c.lineTo(12, -84); c.closePath(); c.fill();
    c.fillStyle = '#12142a'; A.rr(c, -22, -48, 44, 16, 6); c.fill();
    c.fillStyle = ang ? '#ff3b3b' : '#ff8a3a'; c.shadowColor = c.fillStyle; c.shadowBlur = 10;
    ellipse(c, -9, -40, 5, 3.5); c.fill(); ellipse(c, 9, -40, 5, 3.5); c.fill(); c.shadowBlur = 0;
    c.restore();
  };
  ART.imp = function (c, t, m) {
    const fl = Math.sin(t * 3) * 7, flap = Math.sin(t * 9) * .3, ang = m === 'angry';
    c.save(); c.translate(0, fl);
    c.fillStyle = 'rgba(0,0,0,.2)'; ellipse(c, 0, 92 - fl, 38, 7); c.fill();
    // 翼
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.translate(30, -6); c.rotate(-.3 + flap);
      c.fillStyle = grad(c, 0, -70, 80, 20, [[0, '#8a3fd6'], [1, '#4a1a82']]);
      c.beginPath(); c.moveTo(0, 6); c.lineTo(8, -70); c.lineTo(34, -36); c.lineTo(52, -62); c.lineTo(64, -16); c.lineTo(92, -22); c.lineTo(66, 26); c.closePath(); c.fill();
      c.restore();
    });
    // 尻尾
    c.strokeStyle = '#6a2ab0'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(18, 56); c.bezierCurveTo(60, 80, 70, 44, 52, 30 + Math.sin(t * 4) * 4); c.stroke();
    c.fillStyle = '#6a2ab0'; c.beginPath(); c.moveTo(52, 14); c.lineTo(64, 36); c.lineTo(40, 34); c.closePath(); c.fill();
    // 体
    c.fillStyle = grad(c, 0, -10, 0, 80, [[0, '#a560ee'], [1, '#5c2aa0']]); ellipse(c, 0, 38, 36, 44); c.fill();
    c.fillStyle = 'rgba(255,220,255,.25)'; ellipse(c, 0, 46, 20, 28); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#5c2aa0'; ellipse(c, sd * 20, 80, 14, 9); c.fill(); });
    // 頭
    c.fillStyle = grad(c, 0, -80, 0, 10, [[0, '#b878ff'], [1, '#7a3ac8']]); ellipse(c, 0, -30, 46, 40); c.fill();
    c.fillStyle = '#f6e8c8'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 22, -58); c.quadraticCurveTo(sd * 40, -84, sd * 52, -92); c.quadraticCurveTo(sd * 46, -66, sd * 36, -48); c.closePath(); c.fill(); });
    c.fillStyle = '#6a2ab0'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 40, -40); c.lineTo(sd * 76, -52); c.lineTo(sd * 42, -20); c.closePath(); c.fill(); });
    c.fillStyle = '#fff2a0'; [-1, 1].forEach(sd => { ellipse(c, sd * 19, -32, 12, 11); c.fill(); });
    c.fillStyle = '#c4001a'; [-1, 1].forEach(sd => { ellipse(c, sd * 19, -31, 3.5, 8); c.fill(); });
    c.strokeStyle = '#2a0c48'; c.lineWidth = 5; c.lineCap = 'round';
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 36, -50); c.lineTo(sd * 8, -42 + (ang ? 4 : 0)); c.stroke(); });
    c.fillStyle = '#2a0c48'; A.rr(c, -20, -8, 40, 14, 7); c.fill();
    c.fillStyle = '#fff'; [-12, -4, 4, 12].forEach(x => { c.beginPath(); c.moveTo(x - 3, -8); c.lineTo(x, 0); c.lineTo(x + 3, -8); c.closePath(); c.fill(); });
    c.restore();
  };
  ART.demon = function (c, t, m) {
    const bob = Math.sin(t * 1.3) * 4, flap = Math.sin(t * 1.8) * .12, ang = m === 'angry';
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.35)'; ellipse(c, 0, 96, 74, 10); c.fill();
    // 翼
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.translate(34, 0); c.rotate(-.4 + flap);
      c.fillStyle = grad(c, 0, -100, 100, 30, [[0, '#2a1442'], [1, '#12081f']]);
      c.beginPath(); c.moveTo(0, 14); c.lineTo(10, -96); c.lineTo(34, -60); c.lineTo(54, -90); c.lineTo(72, -40); c.lineTo(100, -50); c.lineTo(80, 24); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,60,120,.5)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 14); c.lineTo(34, -60); c.moveTo(0, 14); c.lineTo(72, -40); c.stroke();
      c.restore();
    });
    // マント・体
    c.fillStyle = grad(c, 0, -10, 0, 100, [[0, '#4a1230'], [1, '#1c0818']]);
    c.beginPath(); c.moveTo(-52, -6); c.quadraticCurveTo(-76, 60, -56, 98); c.lineTo(56, 98); c.quadraticCurveTo(76, 60, 52, -6); c.closePath(); c.fill();
    c.fillStyle = grad(c, 0, 0, 0, 90, [[0, '#7a2a52'], [1, '#34102a']]); A.rr(c, -38, -2, 76, 84, 22); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(0, 12); c.lineTo(10, 28); c.lineTo(0, 44); c.lineTo(-10, 28); c.closePath(); c.fill();
    // 腕と爪
    [-1, 1].forEach(sd => {
      c.strokeStyle = '#5c1c40'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 38, 6); c.quadraticCurveTo(sd * 70, 26, sd * 66, 58 + (ang ? -16 : 0)); c.stroke();
      c.fillStyle = '#f6e8c8';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sd * 66 + i * 7 - 3, 58); c.lineTo(sd * 66 + i * 8, 74); c.lineTo(sd * 66 + i * 7 + 3, 58); c.closePath(); c.fill(); }
    });
    // 頭
    c.fillStyle = grad(c, 0, -90, 0, 6, [[0, '#8e3a6a'], [1, '#5a1c44']]); ellipse(c, 0, -44, 44, 42); c.fill();
    c.fillStyle = '#e8d8b8';
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 22, -72); c.bezierCurveTo(sd * 44, -92, sd * 70, -84, sd * 62, -118); c.bezierCurveTo(sd * 52, -96, sd * 36, -90, sd * 14, -66); c.closePath(); c.fill(); });
    // 王冠
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-22, -80); c.lineTo(-24, -98); c.lineTo(-10, -86); c.lineTo(0, -104); c.lineTo(10, -86); c.lineTo(24, -98); c.lineTo(22, -80); c.closePath(); c.fill();
    c.fillStyle = '#e0245e'; ellipse(c, 0, -86, 4, 4); c.fill();
    // 目と口
    const eg = .7 + .3 * Math.sin(t * 4);
    c.fillStyle = '#ff2a4a'; c.shadowColor = '#ff2a4a'; c.shadowBlur = 14 * eg;
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 8, -52); c.lineTo(sd * 30, -58 - (ang ? 0 : 3)); c.lineTo(sd * 26, -44); c.closePath(); c.fill(); });
    c.shadowBlur = 0;
    c.fillStyle = '#1a0612'; A.rr(c, -22, -30, 44, 16, 8); c.fill();
    c.fillStyle = '#fff'; [-14, -5, 5, 14].forEach(x => { c.beginPath(); c.moveTo(x - 4, -30); c.lineTo(x, -20); c.lineTo(x + 4, -30); c.closePath(); c.fill(); });
    c.restore();
  };

  A.enemyArt = (c, key, t, mood) => ART[key](c, t, mood);

  // ---------- 敵カードの背景 ----------
  const THEMES = {
    slime:  { sky: ['#2a6f6a', '#16385a'], glow: '#7dffb0', ground: '#1d5a3f' },
    goblin: { sky: ['#4a3b6e', '#22183f'], glow: '#c9ff7a', ground: '#2e2a40' },
    dragon: { sky: ['#7a2438', '#2a0f2e'], glow: '#ff8a4a', ground: '#3a1626' },
    skeleton: { sky: ['#3d4a6e', '#1a1f3a'], glow: '#9fd4ff', ground: '#24283f' },
    ghost:    { sky: ['#2c3f7a', '#141a40'], glow: '#9ad0ff', ground: '#1e2650' },
    golem:    { sky: ['#6a5a4a', '#2a2030'], glow: '#ffd24a', ground: '#3a2e2a' },
    knight:   { sky: ['#4a2a5a', '#1c1030'], glow: '#ff6a8a', ground: '#261a3a' },
    imp:      { sky: ['#5a2a6a', '#220f36'], glow: '#d08aff', ground: '#2c1840' },
    demon:    { sky: ['#6a1030', '#1a0618'], glow: '#ff3a6a', ground: '#2a0c20' }
  };
  A.theme = key => THEMES[key];
  A.sceneBg = function (c, x, y, w, h, key, t) {
    const th = THEMES[key];
    c.save();
    A.rr(c, x, y, w, h, 16); c.clip();
    c.fillStyle = grad(c, 0, y, 0, y + h, [[0, th.sky[0]], [1, th.sky[1]]]);
    c.fillRect(x, y, w, h);
    const g = c.createRadialGradient(x + w / 2, y + h * .55, 10, x + w / 2, y + h * .55, w * .55);
    g.addColorStop(0, A.rgba(th.glow, .28)); g.addColorStop(1, A.rgba(th.glow, 0));
    c.fillStyle = g; c.fillRect(x, y, w, h);
    // 星・火の粉
    for (let i = 0; i < 16; i++) {
      const px = x + ((i * 97 + 31) % w), py = y + ((i * 53 + 17) % (h * .8));
      const tw = .5 + .5 * Math.sin(t * 1.5 + i * 1.7);
      c.fillStyle = 'rgba(255,255,255,' + (.15 + tw * .35) + ')';
      c.fillRect(px, py, 2, 2);
    }
    // 地面
    c.fillStyle = A.rgba(th.ground, .85);
    c.beginPath(); c.moveTo(x, y + h * .78);
    c.quadraticCurveTo(x + w * .3, y + h * .7, x + w * .55, y + h * .76);
    c.quadraticCurveTo(x + w * .8, y + h * .82, x + w, y + h * .72);
    c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
    c.restore();
  };
})();
