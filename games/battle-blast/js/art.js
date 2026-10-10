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

  // ---- ステージ 5・7 の新しい敵 ----
  ART.yeti = function (c, t, m) {
    const bob = Math.sin(t * 1.8) * 3, ang = m === 'angry', sway = Math.sin(t * 1.8) * 4;
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.28)'; ellipse(c, 0, 94, 72, 10); c.fill();
    const fur = grad(c, 0, -80, 0, 100, [[0, '#f4fbff'], [1, '#b8d4ea']]);
    // 腕
    [-1, 1].forEach(sd => {
      const lift = ang ? -22 : sway * sd;
      c.fillStyle = fur; ellipse(c, sd * 64, 28 + lift, 22, 44); c.fill();
      c.strokeStyle = 'rgba(120,160,200,.6)'; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = '#8fb4d6'; ellipse(c, sd * 66, 62 + lift, 17, 15); c.fill();
      c.fillStyle = '#e8f7ff'; [-6, 0, 6].forEach(o => { c.beginPath(); c.moveTo(sd * 66 + o - 3, 70 + lift); c.lineTo(sd * 66 + o, 82 + lift); c.lineTo(sd * 66 + o + 3, 70 + lift); c.closePath(); c.fill(); });
    });
    // 胴
    c.fillStyle = fur; ellipse(c, 0, 44, 62, 58); c.fill();
    c.strokeStyle = 'rgba(120,160,200,.55)'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(150,185,215,.7)'; c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = -34 + i * 17; c.beginPath(); c.moveTo(x, 30 + (i % 2) * 6); c.lineTo(x + 5, 46 + (i % 2) * 6); c.stroke(); }
    // 足
    [-1, 1].forEach(sd => { c.fillStyle = '#8fb4d6'; ellipse(c, sd * 30, 96, 24, 11); c.fill(); });
    // 頭
    c.fillStyle = fur; ellipse(c, 0, -34, 54, 48); c.fill();
    c.strokeStyle = 'rgba(120,160,200,.6)'; c.lineWidth = 3; c.stroke();
    for (let i = -2; i <= 2; i++) { c.fillStyle = fur; c.beginPath(); c.moveTo(i * 20 - 11, -76 + Math.abs(i) * 6); c.lineTo(i * 20, -94 + Math.abs(i) * 9); c.lineTo(i * 20 + 11, -76 + Math.abs(i) * 6); c.closePath(); c.fill(); }
    // 顔
    c.fillStyle = '#5b7da6'; ellipse(c, 0, -26, 36, 30); c.fill();
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fff'; ellipse(c, sd * 15, -34, 9, 8); c.fill();
      c.fillStyle = ang ? '#ff4040' : '#2a6fd6'; ellipse(c, sd * 15, -33, 4.5, 5); c.fill();
      c.strokeStyle = '#1b2a44'; c.lineWidth = 4.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sd * 27, -48); c.lineTo(sd * 6, -39 + (ang ? 3 : 0)); c.stroke();
    });
    c.fillStyle = '#2c3d5e'; ellipse(c, 0, -22, 6, 4.5); c.fill();
    c.fillStyle = '#1b2433'; A.rr(c, -19, -12, 38, 15, 7); c.fill();
    c.fillStyle = '#fff'; [-12, -4, 4, 12].forEach(x => { c.beginPath(); c.moveTo(x - 3.5, -12); c.lineTo(x, -3); c.lineTo(x + 3.5, -12); c.closePath(); c.fill(); });
    // つらら
    c.fillStyle = 'rgba(190,235,255,.85)';
    [[-56, -52], [58, -48]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x, y + 26); c.lineTo(x + 6, y); c.closePath(); c.fill(); });
    c.restore();
  };
  ART.wizard = function (c, t, m) {
    const fl = Math.sin(t * 2.2) * 7, ang = m === 'angry';
    c.save(); c.translate(0, fl);
    c.fillStyle = 'rgba(0,0,0,.2)'; ellipse(c, 0, 94 - fl, 42 - fl * .6, 7); c.fill();
    // 杖と宝珠
    c.save(); c.translate(-66, 10);
    c.strokeStyle = '#7a5a2a'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 82); c.lineTo(0, -52); c.stroke();
    const og = c.createRadialGradient(0, -64, 2, 0, -64, ang ? 30 : 22);
    og.addColorStop(0, '#fff'); og.addColorStop(.35, ang ? '#ff7ad9' : '#9be7ff'); og.addColorStop(1, 'rgba(120,200,255,0)');
    c.fillStyle = og; c.beginPath(); c.arc(0, -64, ang ? 30 : 22, 0, 7); c.fill();
    c.restore();
    // ローブ
    c.fillStyle = grad(c, 0, -20, 0, 100, [[0, '#5a3fb0'], [1, '#261a60']]);
    c.beginPath(); c.moveTo(-26, -14); c.quadraticCurveTo(-72, 56, -58, 96); c.lineTo(58, 96); c.quadraticCurveTo(72, 56, 26, -14); c.closePath(); c.fill();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-58, 90); c.lineTo(58, 90); c.stroke();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(0, 6); c.lineTo(7, 22); c.lineTo(0, 38); c.lineTo(-7, 22); c.closePath(); c.fill();
    // 腕
    [-1, 1].forEach(sd => { c.strokeStyle = '#4a3398'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 24, 4); c.quadraticCurveTo(sd * 54, 22, sd * (sd < 0 ? 66 : 58), 40 + (ang && sd > 0 ? -22 : 0)); c.stroke(); });
    c.fillStyle = '#f4d8b4'; ellipse(c, 58, 40 + (ang ? -22 : 0), 8, 8); c.fill();
    // 頭・ひげ・帽子
    c.fillStyle = '#f4d8b4'; ellipse(c, 0, -34, 30, 28); c.fill();
    c.fillStyle = '#f2f4fa'; c.beginPath(); c.moveTo(-26, -26); c.quadraticCurveTo(-30, 18, 0, 34); c.quadraticCurveTo(30, 18, 26, -26); c.quadraticCurveTo(0, -8, -26, -26); c.closePath(); c.fill();
    c.fillStyle = grad(c, 0, -110, 0, -50, [[0, '#6a4cd0'], [1, '#341f80']]);
    c.beginPath(); c.moveTo(-46, -50); c.quadraticCurveTo(-8, -72, 18, -118); c.quadraticCurveTo(28, -80, 46, -50); c.quadraticCurveTo(0, -42, -46, -50); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(18, -112, 7, 0, 7); c.fill();
    c.fillStyle = '#ffd24a'; c.fillRect(-46, -54, 92, 5);
    [-1, 1].forEach(sd => {
      c.fillStyle = '#12142a'; ellipse(c, sd * 11, -38, 8, 5.5); c.fill();
      c.fillStyle = ang ? '#ff5a5a' : '#9be7ff'; ellipse(c, sd * 11, -38, 3.5, 3.5); c.fill();
      c.strokeStyle = '#d8dcec'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 20, -50); c.lineTo(sd * 4, -44 + (ang ? 2 : 0)); c.stroke();
    });
    c.restore();
  };

  // ================= 専用デザインの敵（色違いではなく、一体ずつ描き分ける） =================
  const flameShape = (c, x, y, w, h, wob) => {   // ゆらめく炎 1 本（底の中心が x, y）
    c.beginPath();
    c.moveTo(x - w, y);
    c.bezierCurveTo(x - w * 1.1, y - h * .45, x - w * .2 + wob, y - h * .6, x + wob * 1.5, y - h);
    c.bezierCurveTo(x + w * .4 + wob, y - h * .55, x + w * 1.1, y - h * .4, x + w, y);
    c.closePath();
  };
  const flame = (c, x, y, w, h, t, ph) => {      // 外側オレンジ＋内側きいろ
    const wob = Math.sin(t * 9 + ph) * w * .3;
    c.fillStyle = '#ff7a1a'; flameShape(c, x, y, w, h, wob); c.fill();
    c.fillStyle = '#ffd24a'; flameShape(c, x, y, w * .55, h * .62, wob * .7); c.fill();
  };
  const star6 = (c, x, y, r, col, a) => {         // 雪の結晶
    c.save(); c.translate(x, y); c.strokeStyle = col; c.globalAlpha *= a; c.lineWidth = 2.2; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r); c.moveTo(0, -r * .55); c.lineTo(r * .22, -r * .8); c.moveTo(0, -r * .55); c.lineTo(-r * .22, -r * .8); c.stroke(); }
    c.restore();
  };

  // ちびスライム：まるくてキラキラ、頭に葉っぱ
  ART.chibi = function (c, t, m) {
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3.2));
    c.fillStyle = 'rgba(0,0,0,.22)'; ellipse(c, 0, 78, 54 - b * 8, 8); c.fill();
    c.save(); c.translate(0, 76 - b * 16); c.scale(1 + .07 * b, 1 - .07 * b); c.translate(0, -76);
    c.beginPath(); c.moveTo(-62, 70); c.bezierCurveTo(-68, 8, -44, -28, 0, -28); c.bezierCurveTo(44, -28, 68, 8, 62, 70); c.bezierCurveTo(30, 84, -30, 84, -62, 70); c.closePath();
    c.fillStyle = grad(c, 0, -28, 0, 84, [[0, '#e2ffa8'], [.5, '#92e870'], [1, '#4cbf5c']]); c.fill();
    c.strokeStyle = 'rgba(40,110,50,.55)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; ellipse(c, -30, -2, 14, 8); c.fill(); ellipse(c, -12, -16, 5, 3); c.fill();
    c.save(); c.translate(0, -26); c.rotate(Math.sin(t * 2.2) * .12);
    c.strokeStyle = '#3f9a3f'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(2, -14, 10, -22); c.stroke();
    c.fillStyle = '#58c850'; c.beginPath(); c.moveTo(10, -22); c.bezierCurveTo(14, -46, 42, -48, 46, -34); c.bezierCurveTo(42, -18, 22, -14, 10, -22); c.fill();
    c.strokeStyle = 'rgba(20,90,30,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(12, -23); c.lineTo(40, -35); c.stroke();
    c.restore();
    [-1, 1].forEach(sd => {
      const ex = sd * 23, ey = 28;
      c.fillStyle = '#1b2a3a'; ellipse(c, ex, ey, 14, 18); c.fill();
      c.fillStyle = '#fff'; ellipse(c, ex - 4, ey - 6, 5.2, 6); c.fill(); ellipse(c, ex + 4, ey + 7, 2.4, 2.4); c.fill();
      if (ang) { c.strokeStyle = '#1b2a3a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex + sd * 15, ey - 25); c.lineTo(ex - sd * 12, ey - 17); c.stroke(); }
    });
    c.fillStyle = 'rgba(255,120,150,.5)'; ellipse(c, -44, 44, 8, 5); c.fill(); ellipse(c, 44, 44, 8, 5); c.fill();
    c.strokeStyle = '#1b2a3a'; c.lineWidth = 3; c.lineCap = 'round';
    if (ang) { c.beginPath(); c.arc(0, 60, 9, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else { c.beginPath(); c.arc(-5, 50, 5, .1 * Math.PI, .9 * Math.PI); c.stroke(); c.beginPath(); c.arc(5, 50, 5, .1 * Math.PI, .9 * Math.PI); c.stroke(); }
    c.restore();
  };

  // こゴブリン：ぶかぶかのフードと、大きな耳の子ども
  ART.kogob = function (c, t, m) {
    const ang = m === 'angry', bob = Math.abs(Math.sin(t * 3)) * 5;
    c.fillStyle = 'rgba(0,0,0,.25)'; ellipse(c, 0, 90, 54, 8); c.fill();
    c.save(); c.translate(0, -bob);
    // しっぽのような腰ひも・足
    [-1, 1].forEach(sd => { c.fillStyle = '#7fae3f'; ellipse(c, sd * 20, 90, 17, 9); c.fill(); });
    // 体
    c.fillStyle = grad(c, 0, 30, 0, 90, [[0, '#b4e060'], [1, '#79ac3a']]); ellipse(c, 0, 62, 34, 32); c.fill();
    c.fillStyle = '#7a4a22'; A.rr(c, -34, 74, 68, 16, 7); c.fill();
    c.fillStyle = '#d8b24a'; c.fillRect(-7, 75, 14, 13);
    // 手と木のスプーン
    c.save(); c.translate(-52, 52); c.rotate(-.5 + (ang ? -.4 : Math.sin(t * 3) * .1));
    c.strokeStyle = '#9a6a36'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -26); c.stroke();
    c.fillStyle = '#b07c42'; ellipse(c, 0, -34, 13, 17); c.fill();
    c.restore();
    c.fillStyle = '#b4e060'; ellipse(c, -46, 60, 9, 9); c.fill(); ellipse(c, 44, 66, 9, 9); c.fill();
    // フード
    c.fillStyle = grad(c, 0, -80, 0, 30, [[0, '#a8703a'], [1, '#6a4020']]);
    c.beginPath(); c.moveTo(-60, 14); c.bezierCurveTo(-72, -50, -34, -84, 8, -86); c.bezierCurveTo(30, -112, 52, -96, 40, -76); c.bezierCurveTo(70, -56, 62, 0, 60, 14); c.bezierCurveTo(30, 36, -30, 36, -60, 14); c.closePath(); c.fill();
    c.strokeStyle = '#4a2a12'; c.lineWidth = 3; c.stroke();
    // 顔
    c.fillStyle = grad(c, 0, -50, 0, 30, [[0, '#c4ec74'], [1, '#86b93f']]); ellipse(c, 0, -8, 40, 36); c.fill();
    // 耳
    c.fillStyle = '#9ccb4c';
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 36, -16); c.lineTo(sd * 94, -34 + Math.sin(t * 4) * 2); c.lineTo(sd * 38, 8); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,170,170,.55)'; c.beginPath(); c.moveTo(sd * 42, -12); c.lineTo(sd * 78, -28); c.lineTo(sd * 42, 2); c.closePath(); c.fill(); c.fillStyle = '#9ccb4c'; });
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fff6b0'; ellipse(c, sd * 16, -14, 11, 12); c.fill();
      c.fillStyle = '#1b2a10'; ellipse(c, sd * 16 + 1, -13, 5, 9); c.fill();
      c.strokeStyle = '#3a4a14'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 28, -30); c.lineTo(sd * 6, -22 + (ang ? 3 : 0)); c.stroke();
    });
    c.fillStyle = '#6a9a30'; ellipse(c, 0, -2, 5, 6); c.fill();
    c.fillStyle = '#2a1410'; c.beginPath(); c.moveTo(-18, 10); c.quadraticCurveTo(0, 28, 18, 10); c.quadraticCurveTo(0, 14, -18, 10); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-6, 13); c.lineTo(-3, 20); c.lineTo(0, 14); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,120,120,.4)'; ellipse(c, -28, 2, 7, 4); c.fill(); ellipse(c, 28, 2, 7, 4); c.fill();
    c.restore();
  };

  // ビッグスライム：王冠をのせた大きなゼリー
  ART.bigslime = function (c, t, m) {
    const ang = m === 'angry', sq = 1 + .045 * Math.sin(t * 2.4), w = 92 / Math.sqrt(sq), h = 86 * sq;
    c.fillStyle = 'rgba(0,0,0,.28)'; ellipse(c, 0, 72, w * .9, 12); c.fill();
    c.beginPath(); c.moveTo(-w, 58); c.bezierCurveTo(-w, -h * .1, -w * .5, -h + 10, 0, -h + 10); c.bezierCurveTo(w * .5, -h + 10, w, -h * .1, w, 58); c.bezierCurveTo(w * .6, 76, -w * .6, 76, -w, 58); c.closePath();
    c.fillStyle = grad(c, 0, -h, 0, 76, [[0, '#b8fff0'], [.5, '#52d6b0'], [1, '#1f9e86']]); c.fill();
    c.strokeStyle = 'rgba(10,90,80,.55)'; c.lineWidth = 3.5; c.stroke();
    // 体の中のあわ
    for (let i = 0; i < 6; i++) {
      const px = -52 + i * 21 + Math.sin(i * 7) * 8, py = 50 - ((t * 14 + i * 23) % 90), r = 4 + (i % 3) * 2.5;
      c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.5)'; ellipse(c, -w * .45, -h * .38, 17, 10); c.fill(); ellipse(c, -w * .18, -h * .6, 7, 4); c.fill();
    // 王冠
    c.save(); c.translate(10, -h + 12); c.rotate(.16 + Math.sin(t * 2.4) * .03);
    c.fillStyle = grad(c, 0, -34, 0, 6, [[0, '#ffe680'], [1, '#e0a010']]);
    c.beginPath(); c.moveTo(-34, 4); c.lineTo(-38, -30); c.lineTo(-18, -12); c.lineTo(0, -38); c.lineTo(18, -12); c.lineTo(38, -30); c.lineTo(34, 4); c.closePath(); c.fill();
    c.strokeStyle = '#a06a00'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#e0245e'; c.beginPath(); c.arc(0, -10, 6, 0, 7); c.fill(); c.fillStyle = '#4aa3ff'; c.beginPath(); c.arc(-20, -4, 4, 0, 7); c.fill(); c.beginPath(); c.arc(20, -4, 4, 0, 7); c.fill();
    c.restore();
    // 顔
    [-1, 1].forEach(sd => {
      const ex = sd * 32, ey = 2;
      c.fillStyle = '#fff'; ellipse(c, ex, ey, 15, 18); c.fill();
      c.fillStyle = '#12302a'; ellipse(c, ex + Math.sin(t) * 2, ey + 2, 8, 12); c.fill();
      c.fillStyle = '#fff'; ellipse(c, ex - 2 + Math.sin(t) * 2, ey - 3, 3, 3.5); c.fill();
      c.fillStyle = A.shade('#52d6b0', -.1); c.beginPath(); c.moveTo(ex - 18, ey - 20); c.lineTo(ex + 18, ey - 20); c.lineTo(ex + 18, ey - (ang ? 6 : 12)); c.lineTo(ex - 18, ey - 12); c.closePath(); c.fill();   // まぶた
    });
    c.fillStyle = '#12302a'; c.beginPath(); c.moveTo(-22, 30); c.quadraticCurveTo(0, ang ? 28 : 56, 22, 30); c.quadraticCurveTo(0, 36, -22, 30); c.fill();
    c.fillStyle = '#ff7a9a'; ellipse(c, 0, 42, 10, 5); c.fill();
    c.fillStyle = 'rgba(255,120,150,.4)'; ellipse(c, -58, 30, 9, 5); c.fill(); ellipse(c, 58, 30, 9, 5); c.fill();
  };

  // フロストスライム：とうめいな氷の体に、結晶のとげ
  ART.frostslime = function (c, t, m) {
    const ang = m === 'angry', sq = 1 + .04 * Math.sin(t * 2.6), w = 80 / Math.sqrt(sq), h = 74 * sq;
    c.fillStyle = 'rgba(0,0,0,.2)'; ellipse(c, 0, 66, w * .85, 10); c.fill();
    // 冷気
    for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(220,245,255,' + (.16 + .05 * Math.sin(t * 2 + i)) + ')'; ellipse(c, -50 + i * 34, 66 + Math.sin(t * 1.5 + i) * 3, 26, 7); c.fill(); }
    // 結晶のとげ（体の後ろ）
    [[-52, -22, -78, -64], [-22, -48, -34, -98], [8, -56, 16, -108], [38, -42, 62, -92], [60, -10, 92, -46]].forEach(([x1, y1, x2, y2], i) => {
      c.fillStyle = grad(c, x1, y1, x2, y2, [[0, 'rgba(120,200,255,.95)'], [1, 'rgba(240,252,255,.95)']]);
      c.beginPath(); c.moveTo(x1 - 12, y1 + 14); c.lineTo(x2, y2); c.lineTo(x1 + 14, y1 + 10); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.stroke();
    });
    c.beginPath(); c.moveTo(-w, 52); c.bezierCurveTo(-w, -h * .2, -w * .55, -h + 8, 0, -h + 8); c.bezierCurveTo(w * .55, -h + 8, w, -h * .2, w, 52); c.bezierCurveTo(w * .6, 68, -w * .6, 68, -w, 52); c.closePath();
    c.fillStyle = grad(c, 0, -h, 0, 68, [[0, 'rgba(236,252,255,.96)'], [.5, 'rgba(140,214,255,.93)'], [1, 'rgba(70,150,230,.95)']]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.stroke();
    star6(c, 0, 34, 20, 'rgba(255,255,255,.55)', 1);
    c.fillStyle = 'rgba(255,255,255,.55)'; ellipse(c, -w * .4, -h * .45, 16, 8); c.fill();
    // 舞い散る雪
    for (let i = 0; i < 5; i++) { const sx = -70 + i * 35 + Math.sin(t + i * 2) * 8, sy = ((t * 24 + i * 40) % 160) - 90; c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(sx, sy, 2, 0, 7); c.fill(); }
    const look = Math.sin(t * .8) * .6;
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fff'; ellipse(c, sd * 26, -2, 13, 17); c.fill();
      c.fillStyle = '#16335c'; ellipse(c, sd * 26 + look * 4, 0, 7, 11); c.fill();
      c.fillStyle = '#9be7ff'; ellipse(c, sd * 26 + look * 4 - 2, -4, 2.6, 3); c.fill();
      if (ang) { c.strokeStyle = '#16335c'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 40, -24); c.lineTo(sd * 12, -16); c.stroke(); }
    });
    c.strokeStyle = '#16335c'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); if (ang) c.arc(0, 38, 12, Math.PI * 1.1, Math.PI * 1.9); else c.arc(0, 24, 12, .15 * Math.PI, .85 * Math.PI); c.stroke();
  };

  // マグマスライム：かたい岩のカラと、どろどろの溶岩
  ART.magmaslime = function (c, t, m) {
    const ang = m === 'angry', sq = 1 + .05 * Math.sin(t * 3.1), w = 82 / Math.sqrt(sq), h = 72 * sq, pulse = .7 + .3 * Math.sin(t * 4);
    c.fillStyle = 'rgba(0,0,0,.3)'; ellipse(c, 0, 68, w * .9, 10); c.fill();
    const gl = c.createRadialGradient(0, 20, 20, 0, 20, 130); gl.addColorStop(0, 'rgba(255,140,40,' + (.35 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = gl; c.fillRect(-120, -100, 240, 220);
    c.beginPath(); c.moveTo(-w, 54); c.bezierCurveTo(-w, -h * .2, -w * .55, -h + 8, 0, -h + 8); c.bezierCurveTo(w * .55, -h + 8, w, -h * .2, w, 54); c.bezierCurveTo(w * .6, 70, -w * .6, 70, -w, 54); c.closePath();
    c.fillStyle = grad(c, 0, -h, 0, 70, [[0, '#ffd45a'], [.4, '#ff7a1a'], [1, '#b02a0a']]); c.fill();
    c.strokeStyle = '#5a1604'; c.lineWidth = 3.5; c.stroke();
    // 岩のカラ
    c.fillStyle = '#2c2420';
    [[-44, -34, 24, 16, -.5], [4, -58, 30, 18, .1], [46, -28, 22, 15, .6], [-8, -18, 14, 9, -.2]].forEach(([x, y, rx, ry, rot]) => { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(-rx, ry * .6); c.lineTo(-rx * .5, -ry); c.lineTo(rx * .6, -ry * .8); c.lineTo(rx, ry * .5); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,170,60,' + (.5 * pulse) + ')'; c.lineWidth = 2; c.stroke(); c.restore(); });
    // 頭の炎
    flame(c, -8, -h + 18, 15, 38, t, 0); flame(c, 14, -h + 20, 11, 28, t, 2); flame(c, -26, -h + 24, 9, 22, t, 4);
    // とろけた溶岩
    c.fillStyle = '#ff9a2a';
    [[-w + 14, 52, 14 + Math.sin(t * 2) * 5], [-30, 62, 10 + Math.sin(t * 2.4 + 1) * 5], [34, 62, 12 + Math.sin(t * 2.2 + 2) * 5], [w - 12, 52, 15 + Math.sin(t * 1.8) * 5]].forEach(([x, y, l]) => { A.rr(c, x - 4, y, 8, l, 4); c.fill(); c.beginPath(); c.arc(x, y + l, 5, 0, 7); c.fill(); });
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fff6b0'; ellipse(c, sd * 26, 0, 13, 14); c.fill();
      c.fillStyle = '#1a0c06'; ellipse(c, sd * 26, 1, 4, 11); c.fill();
      c.strokeStyle = '#2a0c04'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 42, -20); c.lineTo(sd * 10, -10 + (ang ? 4 : 0)); c.stroke();
    });
    c.fillStyle = '#2a0c04'; c.beginPath(); c.moveTo(-24, 28); c.lineTo(-14, 24); c.lineTo(-8, 34); c.lineTo(0, 24); c.lineTo(8, 34); c.lineTo(14, 24); c.lineTo(24, 28); c.quadraticCurveTo(0, 54, -24, 28); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-14, 32); c.quadraticCurveTo(0, 44, 14, 32); c.quadraticCurveTo(0, 36, -14, 32); c.fill();
  };

  // ほのおインプ：炎のかみの毛と、真っ赤な小悪魔
  ART.flameimp = function (c, t, m) {
    const fl = Math.sin(t * 3.2) * 7, flap = Math.sin(t * 10) * .32, ang = m === 'angry';
    c.save(); c.translate(0, fl);
    c.fillStyle = 'rgba(0,0,0,.2)'; ellipse(c, 0, 92 - fl, 34, 6); c.fill();
    const gl = c.createRadialGradient(0, 0, 10, 0, 0, 120); gl.addColorStop(0, 'rgba(255,120,30,.28)'); gl.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = gl; c.fillRect(-130, -130, 260, 260);
    [-1, 1].forEach(sd => {   // 翼
      c.save(); c.scale(sd, 1); c.translate(28, -4); c.rotate(-.3 + flap);
      c.fillStyle = grad(c, 0, -70, 80, 20, [[0, '#ff9a3a'], [1, '#9a1808']]);
      c.beginPath(); c.moveTo(0, 6); c.lineTo(8, -74); c.lineTo(34, -38); c.lineTo(52, -66); c.lineTo(64, -16); c.lineTo(92, -22); c.lineTo(66, 26); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(60,8,0,.7)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 6); c.lineTo(34, -38); c.moveTo(0, 6); c.lineTo(64, -16); c.stroke();
      c.restore();
    });
    // 尻尾（先が炎）
    c.strokeStyle = '#b8200a'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(18, 56); c.bezierCurveTo(60, 82, 74, 44, 56, 26); c.stroke();
    flame(c, 56, 28, 10, 26, t, 1);
    // 体・足
    c.fillStyle = grad(c, 0, -10, 0, 84, [[0, '#ff7a4a'], [1, '#b0200a']]); ellipse(c, 0, 40, 34, 44); c.fill();
    c.fillStyle = 'rgba(255,230,160,.5)'; ellipse(c, 0, 48, 18, 28); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#8a1606'; ellipse(c, sd * 20, 82, 14, 9); c.fill(); });
    // 手の火の玉
    const fb = ang ? 1.5 : 1;
    c.fillStyle = '#c42a0a'; ellipse(c, -44, 42, 9, 9); c.fill();
    const fg = c.createRadialGradient(-50, 28, 2, -50, 28, 16 * fb); fg.addColorStop(0, '#fff6b0'); fg.addColorStop(.4, '#ffb02a'); fg.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = fg; c.beginPath(); c.arc(-50, 28, 16 * fb, 0, 7); c.fill();
    // 頭と炎のかみ
    flame(c, -22, -44, 12, 42, t, 0); flame(c, 0, -52, 15, 56, t, 1.5); flame(c, 22, -44, 12, 42, t, 3);
    c.fillStyle = grad(c, 0, -80, 0, 6, [[0, '#ff8a5a'], [1, '#c42a0a']]); ellipse(c, 0, -26, 42, 38); c.fill();
    c.fillStyle = '#3a0a04'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 24, -50); c.lineTo(sd * 36, -76); c.lineTo(sd * 12, -54); c.closePath(); c.fill(); });
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fffbe0'; ellipse(c, sd * 17, -28, 11, 11); c.fill();
      c.fillStyle = '#c40018'; ellipse(c, sd * 17, -27, 3.5, 8); c.fill();
      c.strokeStyle = '#3a0a04'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 30, -44); c.lineTo(sd * 8, -36 + (ang ? 4 : 0)); c.stroke();
    });
    c.fillStyle = '#3a0a04'; A.rr(c, -18, -8, 36, 13, 6.5); c.fill();
    c.fillStyle = '#fff'; [-10, -3, 3, 10].forEach(x => { c.beginPath(); c.moveTo(x - 3, -8); c.lineTo(x, 0); c.lineTo(x + 3, -8); c.closePath(); c.fill(); });
    c.restore();
  };

  // アイスドラゴン：氷の結晶のつばさと、こごえるブレス
  ART.icedragon = function (c, t, m) {
    const flap = Math.sin(t * 2) * .18, bob = Math.sin(t * 1.5) * 4, ang = m === 'angry';
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.25)'; ellipse(c, 0, 94, 68, 9); c.fill();
    [-1, 1].forEach(sd => {    // 氷のつばさ
      c.save(); c.scale(sd, 1); c.translate(42, 8); c.rotate(-.5 + flap);
      c.fillStyle = grad(c, 0, -90, 96, 20, [[0, 'rgba(210,244,255,.95)'], [1, 'rgba(90,170,235,.9)']]);
      c.beginPath(); c.moveTo(0, 10); c.lineTo(2, -96); c.lineTo(30, -58); c.lineTo(50, -92); c.lineTo(66, -40); c.lineTo(100, -52); c.lineTo(76, 22); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 10); c.lineTo(30, -58); c.moveTo(0, 10); c.lineTo(66, -40); c.stroke();
      c.restore();
    });
    c.strokeStyle = '#7ab8ee'; c.lineWidth = 15; c.lineCap = 'round'; c.beginPath(); c.moveTo(38, 70); c.bezierCurveTo(100, 82, 112, 34, 90, 10); c.stroke();   // しっぽ
    c.fillStyle = '#e8fbff'; c.beginPath(); c.moveTo(78, 2); c.lineTo(102, 6); c.lineTo(92, 30); c.lineTo(84, 18); c.closePath(); c.fill();
    c.fillStyle = grad(c, 0, -10, 0, 100, [[0, '#a8d8ff'], [1, '#4a86d0']]); ellipse(c, 0, 48, 64, 58); c.fill();
    c.fillStyle = grad(c, 0, 20, 0, 100, [[0, '#ffffff'], [1, '#bfe3ff']]); ellipse(c, 0, 62, 38, 42); c.fill();
    c.strokeStyle = 'rgba(80,140,200,.5)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-30, 40 + i * 12); c.quadraticCurveTo(0, 46 + i * 12, 30, 40 + i * 12); c.stroke(); }
    [-1, 1].forEach(sd => { c.fillStyle = '#3a76c0'; ellipse(c, sd * 34, 98, 20, 10); c.fill(); });
    // 背中のつらら
    c.fillStyle = 'rgba(230,250,255,.95)'; [[-24, -4], [-8, -14], [8, -14], [24, -4]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 7, y + 14); c.lineTo(x, y - 20); c.lineTo(x + 7, y + 14); c.closePath(); c.fill(); });
    c.fillStyle = grad(c, 0, -90, 0, 10, [[0, '#bfe6ff'], [1, '#5a9ae0']]); ellipse(c, 0, -36, 52, 44); c.fill();
    c.fillStyle = grad(c, 0, -30, 0, 10, [[0, '#f0fbff'], [1, '#a8d4f6']]); ellipse(c, 0, -16, 32, 22); c.fill();
    c.fillStyle = '#2a5a90'; ellipse(c, -11, -16, 4, 6); c.fill(); ellipse(c, 11, -16, 4, 6); c.fill();
    c.fillStyle = 'rgba(235,252,255,.97)';   // 氷のつの
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 26, -68); c.quadraticCurveTo(sd * 54, -92, sd * 58, -122); c.quadraticCurveTo(sd * 36, -94, sd * 12, -64); c.closePath(); c.fill(); c.strokeStyle = '#7ab8ee'; c.lineWidth = 2; c.stroke(); });
    c.beginPath(); c.moveTo(-8, -76); c.lineTo(0, -108); c.lineTo(8, -76); c.closePath(); c.fill();
    [-1, 1].forEach(sd => {
      c.fillStyle = '#e0faff'; ellipse(c, sd * 25, -48, 12, 9); c.fill();
      c.fillStyle = '#1a6ad8'; ellipse(c, sd * 25, -48, 4, 8); c.fill();
      c.strokeStyle = '#1a3a68'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 38, -62); c.lineTo(sd * 12, -53 + (ang ? 3 : 0)); c.stroke();
    });
    if (ang) {   // こごえる息
      for (let i = 0; i < 5; i++) { const u = ((t * 1.6 + i * .2) % 1); c.fillStyle = 'rgba(220,245,255,' + (.5 * (1 - u)) + ')'; c.beginPath(); c.arc(i % 2 ? 6 : -6, -4 + u * 56, 8 + u * 18, 0, 7); c.fill(); }
    }
    for (let i = 0; i < 6; i++) { const sx = -90 + i * 36 + Math.sin(t + i) * 8, sy = ((t * 20 + i * 30) % 220) - 110; c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(sx, sy, 1.8, 0, 7); c.fill(); }
    c.restore();
  };

  // ラヴァゴーレム：黒い岩に走る、光る溶岩のひび
  ART.lavagolem = function (c, t, m) {
    const bob = Math.sin(t * 1.4) * 2.5, ang = m === 'angry', pulse = .65 + .35 * Math.sin(t * 3.4);
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.35)'; ellipse(c, 0, 96, 80, 10); c.fill();
    const gl = c.createRadialGradient(0, 20, 20, 0, 20, 140); gl.addColorStop(0, 'rgba(255,110,20,' + (.3 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,110,20,0)'); c.fillStyle = gl; c.fillRect(-150, -130, 300, 280);
    const rock = (x0, x1) => grad(c, x0, 0, x1, 0, [[0, '#2a2430'], [.5, '#4a4250'], [1, '#1c1820']]);
    const crack = (pts, w) => { c.strokeStyle = 'rgba(255,' + Math.round(110 + 80 * pulse) + ',30,' + (.7 + .3 * pulse) + ')'; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = '#ff8a2a'; c.shadowBlur = 8 * pulse; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.shadowBlur = 0; };
    [-1, 1].forEach(sd => {   // 腕と溶岩のこぶし
      const lift = ang ? -16 : Math.sin(t * 1.4 + sd) * 4;
      c.fillStyle = rock(sd * 40, sd * 100); A.rr(c, sd > 0 ? 58 : -96, -18 + lift, 38, 64, 16); c.fill();
      crack([[sd * 77, -10 + lift], [sd * 70, 12 + lift], [sd * 80, 36 + lift]], 3);
      c.fillStyle = grad(c, 0, 40 + lift, 0, 82 + lift, [[0, '#ff9a2a'], [1, '#c8300a']]); A.rr(c, sd > 0 ? 50 : -104, 40 + lift, 54, 42, 18); c.fill();
      c.strokeStyle = '#2a1008'; c.lineWidth = 3; A.rr(c, sd > 0 ? 50 : -104, 40 + lift, 54, 42, 18); c.stroke();
      c.fillStyle = '#ffb04a'; c.beginPath(); c.arc(sd * 77, 86 + lift + Math.sin(t * 3 + sd) * 3, 4, 0, 7); c.fill();
    });
    c.fillStyle = rock(-60, 60); A.rr(c, -58, -22, 116, 110, 26); c.fill();
    c.strokeStyle = '#120e14'; c.lineWidth = 3; A.rr(c, -58, -22, 116, 110, 26); c.stroke();
    crack([[-34, -10], [-14, 12], [-30, 34], [-12, 60]], 3.5); crack([[30, 0], [12, 28], [34, 52], [18, 78]], 3.5); crack([[-8, 20], [8, 40]], 2.5);
    // 胸のコア
    const cg = c.createRadialGradient(0, 30, 2, 0, 30, 22); cg.addColorStop(0, '#fff6b0'); cg.addColorStop(.5, 'rgba(255,160,40,' + pulse + ')'); cg.addColorStop(1, 'rgba(255,100,20,0)'); c.fillStyle = cg; c.beginPath(); c.arc(0, 30, 22, 0, 7); c.fill();
    c.fillStyle = '#322c38'; A.rr(c, -50, 78, 38, 24, 8); c.fill(); A.rr(c, 12, 78, 38, 24, 8); c.fill();
    // 頭
    c.fillStyle = rock(-36, 36); A.rr(c, -36, -88, 72, 64, 18); c.fill();
    c.strokeStyle = '#120e14'; A.rr(c, -36, -88, 72, 64, 18); c.stroke();
    crack([[-6, -88], [-12, -74], [-4, -62]], 2.5);
    flame(c, -14, -86, 10, 30, t, 0); flame(c, 10, -88, 12, 40, t, 2); flame(c, 28, -84, 8, 24, t, 4);
    c.fillStyle = ang ? '#ff3a2a' : '#ffc23a'; c.shadowColor = c.fillStyle; c.shadowBlur = 14 * pulse;
    c.beginPath(); c.moveTo(-28, -64); c.lineTo(-8, -58); c.lineTo(-10, -48); c.lineTo(-28, -52); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(28, -64); c.lineTo(8, -58); c.lineTo(10, -48); c.lineTo(28, -52); c.closePath(); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(-18, -38); c.lineTo(-10, -34); c.lineTo(0, -40); c.lineTo(10, -34); c.lineTo(18, -38); c.lineTo(14, -30); c.lineTo(-14, -30); c.closePath(); c.fill();
    for (let i = 0; i < 4; i++) { const u = ((t * .5 + i * .25) % 1); c.fillStyle = 'rgba(70,60,70,' + (.4 * (1 - u)) + ')'; c.beginPath(); c.arc(-20 + i * 14, -100 - u * 24, 6 + u * 8, 0, 7); c.fill(); }
    c.restore();
  };

  // てんくうの騎士：金色の鎧、光の剣、頭上の輪
  ART.holyknight = function (c, t, m) {
    const bob = Math.sin(t * 2) * 3, ang = m === 'angry', pulse = .7 + .3 * Math.sin(t * 3);
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.28)'; ellipse(c, 0, 96, 60, 9); c.fill();
    const hg = c.createRadialGradient(0, -108, 4, 0, -108, 60); hg.addColorStop(0, 'rgba(255,240,170,' + (.5 * pulse) + ')'); hg.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = hg; c.fillRect(-80, -170, 160, 120);
    c.fillStyle = grad(c, 0, 0, 0, 100, [[0, '#3a6ad8'], [1, '#1a2c78']]);   // マント
    c.beginPath(); c.moveTo(-58, -10); c.quadraticCurveTo(-92, 60, -68, 100); c.lineTo(68, 100); c.quadraticCurveTo(92, 60, 58, -10); c.closePath(); c.fill();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-66, 98); c.lineTo(66, 98); c.stroke();
    // 光の剣
    c.save(); c.translate(-78, 24); c.rotate(-.22 + (ang ? -.35 : Math.sin(t * 2) * .03));
    const sg = c.createLinearGradient(-14, 0, 14, 0); sg.addColorStop(0, '#9be7ff'); sg.addColorStop(.5, '#ffffff'); sg.addColorStop(1, '#9be7ff');
    c.shadowColor = '#9be7ff'; c.shadowBlur = 16 * pulse; c.fillStyle = sg;
    c.beginPath(); c.moveTo(0, -112); c.lineTo(13, -84); c.lineTo(12, 34); c.lineTo(-12, 34); c.lineTo(-13, -84); c.closePath(); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#e0a010'; c.fillRect(-28, 34, 56, 9); c.fillRect(-5, 43, 10, 26);
    c.restore();
    const gold = grad(c, -50, 0, 50, 0, [[0, '#d8a020'], [.5, '#fff0b0'], [1, '#c88a10']]);
    c.fillStyle = gold; A.rr(c, -44, -6, 88, 76, 16); c.fill();
    c.strokeStyle = '#7a5008'; c.lineWidth = 3; A.rr(c, -44, -6, 88, 76, 16); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-4, 4, 8, 50); c.fillRect(-16, 18, 32, 8);   // 胸の十字
    A.rr(c, -38, 68, 32, 30, 8); c.fillStyle = gold; c.fill(); A.rr(c, 6, 68, 32, 30, 8); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = gold; ellipse(c, sd * 52, 0, 25, 21); c.fill(); c.strokeStyle = '#7a5008'; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(sd * 44, -14); c.lineTo(sd * 54, -34); c.lineTo(sd * 64, -12); c.closePath(); c.fill(); });
    // 盾
    c.fillStyle = grad(c, 0, 10, 0, 80, [[0, '#ffffff'], [1, '#b8d8ff']]); c.beginPath(); c.moveTo(40, 10); c.lineTo(78, 18); c.lineTo(78, 52); c.quadraticCurveTo(78, 74, 59, 84); c.quadraticCurveTo(40, 74, 40, 52); c.closePath(); c.fill();
    c.strokeStyle = '#d8a020'; c.lineWidth = 3.5; c.stroke(); c.fillStyle = '#3a6ad8'; ellipse(c, 59, 46, 9, 12); c.fill();
    // 兜と翼
    [-1, 1].forEach(sd => { c.fillStyle = 'rgba(255,255,255,.96)'; c.beginPath(); c.moveTo(sd * 30, -52); c.quadraticCurveTo(sd * 72, -66, sd * 84, -96); c.quadraticCurveTo(sd * 62, -76, sd * 44, -80); c.quadraticCurveTo(sd * 66, -84, sd * 76, -110); c.quadraticCurveTo(sd * 40, -92, sd * 26, -72); c.closePath(); c.fill(); c.strokeStyle = '#c8d8f0'; c.lineWidth = 1.5; c.stroke(); });
    c.fillStyle = gold; A.rr(c, -32, -80, 64, 76, 24); c.fill(); c.strokeStyle = '#7a5008'; c.lineWidth = 3; A.rr(c, -32, -80, 64, 76, 24); c.stroke();
    c.fillStyle = '#12203a'; A.rr(c, -22, -50, 44, 15, 6); c.fill();
    c.fillStyle = ang ? '#ffd0d0' : '#9be7ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 10; ellipse(c, -9, -43, 5, 3.5); c.fill(); ellipse(c, 9, -43, 5, 3.5); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,224,120,' + (.75 + .25 * pulse) + ')'; c.lineWidth = 6; c.shadowColor = '#ffe080'; c.shadowBlur = 12; c.beginPath(); c.ellipse(0, -104, 30, 9, 0, 0, 7); c.stroke(); c.shadowBlur = 0;   // 天使の輪
    c.restore();
  };

  // 大魔王：紫の炎をまとう、三つ目の王
  ART.overlord = function (c, t, m) {
    const bob = Math.sin(t * 1.2) * 4, flap = Math.sin(t * 1.7) * .1, ang = m === 'angry', pulse = .7 + .3 * Math.sin(t * 3.6);
    c.save(); c.translate(0, bob);
    c.fillStyle = 'rgba(0,0,0,.4)'; ellipse(c, 0, 98, 78, 11); c.fill();
    const ag = c.createRadialGradient(0, 0, 20, 0, 0, 150); ag.addColorStop(0, 'rgba(200,90,255,' + (.55 * pulse) + ')'); ag.addColorStop(1, 'rgba(190,60,255,0)'); c.fillStyle = ag; c.fillRect(-160, -160, 320, 320);
    for (let i = 0; i < 7; i++) {   // まわりの紫の炎
      const x = -88 + i * 29, ph = i * 1.3, h = 44 + Math.sin(t * 5 + ph) * 12;
      c.fillStyle = 'rgba(170,60,255,.55)'; flameShape(c, x, 70 - Math.abs(i - 3) * 8, 13, h, Math.sin(t * 7 + ph) * 4); c.fill();
      c.fillStyle = 'rgba(255,150,255,.5)'; flameShape(c, x, 70 - Math.abs(i - 3) * 8, 7, h * .6, Math.sin(t * 7 + ph) * 3); c.fill();
    }
    [-1, 1].forEach(sd => {   // 翼
      c.save(); c.scale(sd, 1); c.translate(36, -4); c.rotate(-.42 + flap);
      c.fillStyle = grad(c, 0, -110, 110, 30, [[0, '#3a1466'], [1, '#0e0620']]);
      c.beginPath(); c.moveTo(0, 14); c.lineTo(8, -106); c.lineTo(34, -64); c.lineTo(56, -100); c.lineTo(76, -42); c.lineTo(108, -56); c.lineTo(82, 28); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(230,100,255,.65)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 14); c.lineTo(34, -64); c.moveTo(0, 14); c.lineTo(76, -42); c.stroke();
      c.restore();
    });
    c.fillStyle = grad(c, 0, -10, 0, 100, [[0, '#3a1250'], [1, '#12061c']]);   // マント
    c.beginPath(); c.moveTo(-56, -8); c.quadraticCurveTo(-82, 56, -58, 100); for (let i = 0; i < 5; i++) c.lineTo(-58 + (i + .5) * 23, 100 - (i % 2 ? 0 : 12)); c.lineTo(58, 100); c.quadraticCurveTo(82, 56, 56, -8); c.closePath(); c.fill();
    c.fillStyle = grad(c, 0, 0, 0, 90, [[0, '#8a46b0'], [1, '#3a1a5c']]); A.rr(c, -40, -2, 80, 86, 22); c.fill();
    c.strokeStyle = '#c070ff'; c.lineWidth = 2.5; A.rr(c, -40, -2, 80, 86, 22); c.stroke();
    const gg = c.createRadialGradient(0, 28, 2, 0, 28, 20); gg.addColorStop(0, '#ffffff'); gg.addColorStop(.4, 'rgba(255,90,220,' + pulse + ')'); gg.addColorStop(1, 'rgba(255,90,220,0)'); c.fillStyle = gg; c.beginPath(); c.arc(0, 28, 20, 0, 7); c.fill();
    c.fillStyle = '#ff5ad8'; c.beginPath(); c.moveTo(0, 14); c.lineTo(9, 28); c.lineTo(0, 42); c.lineTo(-9, 28); c.closePath(); c.fill();
    [-1, 1].forEach(sd => {   // 腕と闇の玉
      c.strokeStyle = '#4a2068'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 40, 6); c.quadraticCurveTo(sd * 74, 26, sd * 70, 56 + (ang ? -20 : 0)); c.stroke();
      c.fillStyle = '#e8d8f8'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sd * 70 + i * 8 - 3, 58 + (ang ? -20 : 0)); c.lineTo(sd * 70 + i * 9, 76 + (ang ? -20 : 0)); c.lineTo(sd * 70 + i * 8 + 3, 58 + (ang ? -20 : 0)); c.closePath(); c.fill(); }
    });
    const og = c.createRadialGradient(-72, 38, 2, -72, 38, 24 * (ang ? 1.3 : 1)); og.addColorStop(0, '#ffffff'); og.addColorStop(.3, '#c070ff'); og.addColorStop(1, 'rgba(120,30,200,0)'); c.fillStyle = og; c.beginPath(); c.arc(-72, 38, 24 * (ang ? 1.3 : 1), 0, 7); c.fill();
    // 頭・つの・冠
    c.fillStyle = grad(c, 0, -96, 0, 6, [[0, '#a05ac0'], [1, '#52206e']]); ellipse(c, 0, -46, 46, 44); c.fill();
    c.fillStyle = '#ece0c8';
    [-1, 1].forEach(sd => {
      c.beginPath(); c.moveTo(sd * 24, -74); c.bezierCurveTo(sd * 52, -98, sd * 82, -86, sd * 74, -126); c.bezierCurveTo(sd * 60, -100, sd * 40, -92, sd * 14, -68); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(sd * 36, -56); c.bezierCurveTo(sd * 62, -64, sd * 92, -48, sd * 90, -76); c.bezierCurveTo(sd * 76, -58, sd * 54, -50, sd * 34, -46); c.closePath(); c.fill();
    });
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-24, -82); c.lineTo(-28, -104); c.lineTo(-12, -90); c.lineTo(0, -112); c.lineTo(12, -90); c.lineTo(28, -104); c.lineTo(24, -82); c.closePath(); c.fill();
    c.fillStyle = '#ff5ad8'; ellipse(c, 0, -92, 4.5, 4.5); c.fill();
    c.fillStyle = '#ff2a8a'; c.shadowColor = '#ff2a8a'; c.shadowBlur = 14 * pulse;   // 三つの目
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 8, -52); c.lineTo(sd * 32, -60 - (ang ? 0 : 3)); c.lineTo(sd * 28, -44); c.closePath(); c.fill(); });
    ellipse(c, 0, -68, 7, 9); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#1a0612'; ellipse(c, 0, -67, 2.5, 7); c.fill();
    c.fillStyle = '#12040e'; A.rr(c, -24, -32, 48, 17, 8); c.fill();
    c.fillStyle = '#fff'; [-16, -6, 6, 16].forEach(x => { c.beginPath(); c.moveTo(x - 4, -32); c.lineTo(x, -20); c.lineTo(x + 4, -32); c.closePath(); c.fill(); });
    c.restore();
  };

  // ================= ステージ 8〜12 の敵 =================
  const shadow = (c, y, rx) => { c.fillStyle = 'rgba(0,0,0,.26)'; ellipse(c, 0, y, rx, 9); c.fill(); };
  const brow = (c, x, y, sd, ang, col) => { c.strokeStyle = col || '#1b1426'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + sd * 14, y - 12); c.lineTo(x - sd * 11, y - 5 + (ang ? 4 : 0)); c.stroke(); };

  // ---- ステージ 8: きのこの森 ----
  ART.spore = function (c, t, m) {   // キノコ戦士
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3.2)) * 5;
    shadow(c, 94, 52);
    c.save(); c.translate(0, -b);
    [-1, 1].forEach(sd => { c.fillStyle = '#d8b878'; ellipse(c, sd * 20, 92, 15, 9); c.fill(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#ecd29a'; ellipse(c, sd * 46, 56 + Math.sin(t * 3 + sd) * 4, 11, 13); c.fill(); });
    c.fillStyle = grad(c, 0, 10, 0, 96, [[0, '#fff4d8'], [1, '#dcc080']]); ellipse(c, 0, 56, 38, 42); c.fill();
    c.strokeStyle = 'rgba(120,90,40,.5)'; c.lineWidth = 3; c.stroke();
    // かさ
    c.beginPath(); c.moveTo(-86, 14); c.bezierCurveTo(-92, -58, -40, -92, 0, -92); c.bezierCurveTo(40, -92, 92, -58, 86, 14); c.bezierCurveTo(50, 28, -50, 28, -86, 14); c.closePath();
    c.fillStyle = grad(c, 0, -92, 0, 28, [[0, '#ff8070'], [.6, '#d8403c'], [1, '#8a1e24']]); c.fill();
    c.strokeStyle = '#5a1018'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.92)';
    [[-40, -44, 15], [14, -66, 12], [52, -30, 14], [-8, -22, 10], [-64, -8, 8], [74, 0, 7]].forEach(([x, y, r]) => { ellipse(c, x, y, r, r * .8); c.fill(); });
    c.fillStyle = '#7a2a30'; c.beginPath(); c.moveTo(-60, 22); c.quadraticCurveTo(0, 38, 60, 22); c.quadraticCurveTo(0, 30, -60, 22); c.fill();
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fff'; ellipse(c, sd * 15, 46, 9, 11); c.fill();
      c.fillStyle = '#2a1810'; ellipse(c, sd * 15 + 1, 48, 4.5, 7); c.fill();
      brow(c, sd * 15, 46, sd, ang, '#4a2a10');
    });
    c.strokeStyle = '#4a2a10'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
    if (ang) c.arc(0, 72, 8, Math.PI * 1.1, Math.PI * 1.9); else c.arc(0, 62, 7, .15 * Math.PI, .85 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,130,130,.45)'; ellipse(c, -28, 62, 6, 4); c.fill(); ellipse(c, 28, 62, 6, 4); c.fill();
    for (let i = 0; i < 7; i++) { const u = ((t * .5 + i * .14) % 1); c.fillStyle = 'rgba(220,255,160,' + (.7 * (1 - u)) + ')'; c.beginPath(); c.arc(-60 + i * 20 + Math.sin(t * 2 + i) * 6, -80 - u * 40, 2.5 + u * 2, 0, 7); c.fill(); }
    c.restore();
  };
  ART.treant = function (c, t, m) {   // 歩く木
    const ang = m === 'angry', sway = Math.sin(t * 1.6) * 3;
    shadow(c, 96, 70);
    // 根の足
    c.strokeStyle = '#4a2c14'; c.lineWidth = 12; c.lineCap = 'round';
    [[-26, 70, -52, 98], [26, 70, 52, 98], [0, 76, 0, 100]].forEach(([x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, y2, x2, y2); c.stroke(); });
    // 枝の腕
    [-1, 1].forEach(sd => {
      const lift = ang ? -22 : sway * sd;
      c.strokeStyle = '#6a4220'; c.lineWidth = 15; c.beginPath(); c.moveTo(sd * 30, 10); c.quadraticCurveTo(sd * 70, 8 + lift, sd * 82, 38 + lift); c.stroke();
      c.lineWidth = 6; [[-8, -10], [8, -12], [14, 4]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(sd * 82, 38 + lift); c.lineTo(sd * 82 + dx * sd, 38 + lift + dy + 18); c.stroke(); });
      c.fillStyle = '#4fae48'; ellipse(c, sd * 70, 14 + lift, 12, 8); c.fill();
    });
    // 幹
    c.fillStyle = grad(c, -44, 0, 44, 0, [[0, '#4a2c14'], [.5, '#8a5a2c'], [1, '#42280f']]);
    c.beginPath(); c.moveTo(-44, 84); c.quadraticCurveTo(-52, 20, -36, -26); c.lineTo(36, -26); c.quadraticCurveTo(52, 20, 44, 84); c.quadraticCurveTo(0, 96, -44, 84); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,20,8,.6)'; c.lineWidth = 2.5; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-30 + i * 15, -16 + (i % 2) * 8); c.quadraticCurveTo(-34 + i * 15, 30, -28 + i * 15, 80); c.stroke(); }
    // 葉の冠
    [[-40, -44, 34], [0, -66, 40], [42, -44, 34], [-18, -34, 28], [22, -30, 28]].forEach(([x, y, r], i) => { c.fillStyle = i % 2 ? '#3f9a3c' : '#58bc4e'; ellipse(c, x, y, r, r * .8); c.fill(); });
    c.fillStyle = 'rgba(200,255,160,.5)'; ellipse(c, -14, -78, 14, 8); c.fill();
    // 顔
    [-1, 1].forEach(sd => { c.fillStyle = '#1a0e06'; ellipse(c, sd * 17, 4, 11, 13); c.fill(); c.fillStyle = ang ? '#ff8a3a' : '#ffd24a'; c.shadowColor = c.fillStyle; c.shadowBlur = 8; ellipse(c, sd * 17, 5, 5, 6); c.fill(); c.shadowBlur = 0; brow(c, sd * 17, 2, sd, ang, '#2a1608'); });
    c.fillStyle = '#1a0e06'; ellipse(c, 0, 36, 15, ang ? 10 : 7); c.fill();
    c.fillStyle = '#5aa84a'; c.beginPath(); c.moveTo(-34, 56); c.quadraticCurveTo(-10, 62, 6, 52); c.quadraticCurveTo(-10, 50, -34, 56); c.fill();
  };
  ART.mothertree = function (c, t, m) {   // マザーツリー（ボス）
    const ang = m === 'angry', pulse = .65 + .35 * Math.sin(t * 2.6);
    shadow(c, 98, 84);
    const gl = c.createRadialGradient(0, 20, 20, 0, 20, 150); gl.addColorStop(0, 'rgba(140,255,160,' + (.3 * pulse) + ')'); gl.addColorStop(1, 'rgba(140,255,160,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    // 根
    c.strokeStyle = '#3a2210'; c.lineCap = 'round';
    [[-40, 78, -92, 100, 14], [40, 78, 92, 100, 14], [-12, 84, -30, 104, 10], [14, 84, 34, 104, 10]].forEach(([x1, y1, x2, y2, w]) => { c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(x1 + (x2 - x1) * .3, y2 + 6, x2, y2); c.stroke(); });
    // つる
    c.strokeStyle = '#3e8a3a'; c.lineWidth = 4; for (let i = 0; i < 5; i++) { const x = -70 + i * 35, sw = Math.sin(t * 1.5 + i) * 5; c.beginPath(); c.moveTo(x, -52); c.quadraticCurveTo(x + sw, -10, x + sw * 1.5, 24 + (i % 2) * 14); c.stroke(); c.fillStyle = '#58c850'; ellipse(c, x + sw * 1.5, 26 + (i % 2) * 14, 6, 4); c.fill(); }
    // 幹
    c.fillStyle = grad(c, -56, 0, 56, 0, [[0, '#3a2210'], [.5, '#7a4e26'], [1, '#34200c']]);
    c.beginPath(); c.moveTo(-56, 90); c.quadraticCurveTo(-66, 20, -44, -30); c.lineTo(44, -30); c.quadraticCurveTo(66, 20, 56, 90); c.quadraticCurveTo(0, 104, -56, 90); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,14,4,.6)'; c.lineWidth = 3; c.stroke();
    // 天然のルーン
    c.strokeStyle = 'rgba(150,255,170,' + (.5 + .4 * pulse) + ')'; c.lineWidth = 2.5; c.shadowColor = '#8aff9a'; c.shadowBlur = 6;
    [[-40, 40, -30, 62], [40, 40, 30, 62], [-34, -4, -24, 12], [34, -4, 24, 12]].forEach(([x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.moveTo(x1 - 6, y1 + 8); c.lineTo(x1 + 6, y1 + 8); c.stroke(); }); c.shadowBlur = 0;
    // 樹冠
    [[-66, -62, 40], [-30, -88, 44], [14, -96, 46], [58, -76, 42], [76, -42, 34], [-80, -34, 32], [0, -58, 36]].forEach(([x, y, r], i) => { c.fillStyle = i % 3 === 0 ? '#2f8a3c' : i % 3 === 1 ? '#4fb250' : '#3a9c48'; ellipse(c, x, y, r, r * .78); c.fill(); });
    [[-50, -78], [10, -102], [60, -66], [-74, -44], [34, -84]].forEach(([x, y], i) => { c.fillStyle = '#ffb6d8'; for (let k = 0; k < 5; k++) { const a = k * 1.2566 + t * .3; ellipse(c, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 3); c.fill(); } c.fillStyle = '#ffe680'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); });
    // 顔
    [-1, 1].forEach(sd => { c.fillStyle = '#12080a'; c.beginPath(); c.moveTo(sd * 12, -8); c.lineTo(sd * 36, -2 - (ang ? 0 : 4)); c.lineTo(sd * 30, 18); c.lineTo(sd * 10, 12); c.closePath(); c.fill(); c.fillStyle = ang ? '#ff7a3a' : '#9bff9a'; c.shadowColor = c.fillStyle; c.shadowBlur = 12 * pulse; ellipse(c, sd * 22, 8, 6, 7); c.fill(); c.shadowBlur = 0; });
    c.fillStyle = '#12080a'; A.rr(c, -26, 36, 52, 24, 12); c.fill();
    c.fillStyle = '#d8c89a'; [-16, -6, 6, 16].forEach(x => { c.beginPath(); c.moveTo(x - 4, 36); c.lineTo(x, 46); c.lineTo(x + 4, 36); c.closePath(); c.fill(); });
    // 胸の光る核
    const hg = c.createRadialGradient(0, 70, 2, 0, 70, 18); hg.addColorStop(0, '#ffffff'); hg.addColorStop(.4, 'rgba(120,255,150,' + pulse + ')'); hg.addColorStop(1, 'rgba(120,255,150,0)'); c.fillStyle = hg; c.beginPath(); c.arc(0, 70, 18, 0, 7); c.fill();
    for (let i = 0; i < 6; i++) { const a = t * .8 + i * 1.05, r = 90 + Math.sin(t + i) * 10; c.fillStyle = 'rgba(255,255,160,.85)'; c.beginPath(); c.arc(Math.cos(a) * r, -10 + Math.sin(a * 1.3) * 60, 2.4, 0, 7); c.fill(); }
  };

  // ---- ステージ 9: 海底神殿 ----
  ART.jelly = function (c, t, m) {   // クラゲ
    const ang = m === 'angry', fl = Math.sin(t * 2) * 8, pulse = Math.sin(t * 3);
    c.save(); c.translate(0, fl);
    const gl = c.createRadialGradient(0, -20, 10, 0, -20, 110); gl.addColorStop(0, 'rgba(255,150,230,.35)'); gl.addColorStop(1, 'rgba(255,150,230,0)'); c.fillStyle = gl; c.fillRect(-130, -130, 260, 260);
    // 触手（後ろ）
    for (let i = 0; i < 7; i++) {
      const x = -54 + i * 18, ph = t * 3 + i * .9;
      c.strokeStyle = i % 2 ? 'rgba(255,160,230,.85)' : 'rgba(170,200,255,.85)'; c.lineWidth = i % 2 ? 6 : 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, 12); c.bezierCurveTo(x + Math.sin(ph) * 10, 40, x - Math.sin(ph) * 12, 66, x + Math.sin(ph + 1) * 10, 96 + (i % 3) * 6); c.stroke();
    }
    // かさ
    const w = 78 + pulse * 3, h = 70 - pulse * 3;
    c.beginPath(); c.moveTo(-w, 20); c.bezierCurveTo(-w, -h * .6, -w * .5, -h - 14, 0, -h - 14); c.bezierCurveTo(w * .5, -h - 14, w, -h * .6, w, 20);
    for (let i = 0; i < 6; i++) c.quadraticCurveTo(w - (i + .5) * w / 3, 34 - (i % 2) * 2, w - (i + 1) * w / 3, 20);
    c.closePath();
    c.fillStyle = grad(c, 0, -h, 0, 30, [[0, 'rgba(255,220,250,.96)'], [.5, 'rgba(220,170,255,.92)'], [1, 'rgba(150,180,255,.92)']]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; ellipse(c, -30, -48, 22, 10); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 24, -h - 8 + Math.abs(i) * 8); c.quadraticCurveTo(i * 30, -10, i * 26, 18); c.stroke(); }
    [[-34, -20], [40, -34], [10, -52]].forEach(([x, y]) => { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#2a1850'; ellipse(c, sd * 24, -6, 9, 12); c.fill(); c.fillStyle = '#fff'; ellipse(c, sd * 24 - 2, -10, 3, 3.5); c.fill(); if (ang) { c.strokeStyle = '#2a1850'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 36, -24); c.lineTo(sd * 12, -17); c.stroke(); } });
    c.strokeStyle = '#2a1850'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); if (ang) c.arc(0, 18, 8, Math.PI * 1.1, Math.PI * 1.9); else c.arc(0, 6, 8, .15 * Math.PI, .85 * Math.PI); c.stroke();
    c.restore();
  };
  ART.sahagin = function (c, t, m) {   // 魚人
    const ang = m === 'angry', bob = Math.sin(t * 2.4) * 3;
    c.save(); c.translate(0, bob);
    shadow(c, 96 - bob, 56);
    // 三叉の槍
    c.save(); c.translate(-74, 20); c.rotate(-.12 + (ang ? -.3 : 0));
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 74); c.lineTo(0, -64); c.stroke();
    c.fillStyle = '#d8e8f0'; c.beginPath(); c.moveTo(-14, -48); c.lineTo(-14, -78); c.lineTo(-6, -58); c.lineTo(0, -92); c.lineTo(6, -58); c.lineTo(14, -78); c.lineTo(14, -48); c.quadraticCurveTo(0, -42, -14, -48); c.fill(); c.strokeStyle = '#5a7a8a'; c.lineWidth = 2; c.stroke();
    c.restore();
    // しっぽ・足
    [-1, 1].forEach(sd => { c.fillStyle = '#3a8a9a'; ellipse(c, sd * 24, 92, 17, 8); c.fill(); });
    // 体
    c.fillStyle = grad(c, 0, 10, 0, 96, [[0, '#4ab0b8'], [1, '#2a6a88']]); ellipse(c, 0, 56, 38, 42); c.fill();
    c.fillStyle = 'rgba(230,255,230,.5)'; ellipse(c, 0, 64, 22, 30); c.fill();
    c.strokeStyle = 'rgba(20,70,90,.4)'; c.lineWidth = 2; for (let r = 0; r < 4; r++) for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(k * 14 + (r % 2) * 7, 36 + r * 14, 6, 0, Math.PI); c.stroke(); }
    // 腕・水かき
    [-1, 1].forEach(sd => { c.fillStyle = '#3a98a8'; ellipse(c, sd * 46, 56 + Math.sin(t * 2.4 + sd) * 3, 11, 20); c.fill(); c.fillStyle = '#e8d070'; c.beginPath(); c.moveTo(sd * 46, 70); c.lineTo(sd * 58, 86); c.lineTo(sd * 46, 82); c.lineTo(sd * 36, 86); c.closePath(); c.fill(); });
    // ひれの冠・頭
    c.fillStyle = '#e0584a'; c.beginPath(); c.moveTo(-22, -38); c.lineTo(-30, -78); c.lineTo(-10, -52); c.lineTo(0, -92); c.lineTo(10, -52); c.lineTo(30, -78); c.lineTo(22, -38); c.closePath(); c.fill();
    c.fillStyle = grad(c, 0, -60, 0, 10, [[0, '#5ac4c8'], [1, '#2c7c94']]); ellipse(c, 0, -22, 40, 36); c.fill();
    c.strokeStyle = 'rgba(20,70,90,.5)'; c.lineWidth = 3; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#e8d070'; ellipse(c, sd * 24, -28, 13, 13); c.fill(); c.fillStyle = '#1a2a10'; ellipse(c, sd * 24, -28, 6, 9); c.fill(); brow(c, sd * 24, -28, sd, ang, '#14404a'); });
    c.fillStyle = '#14404a'; A.rr(c, -22, -6, 44, 15, 7); c.fill();
    c.fillStyle = '#fff'; [-14, -6, 2, 10, 17].forEach(x => { c.beginPath(); c.moveTo(x - 3, -6); c.lineTo(x, 3); c.lineTo(x + 3, -6); c.closePath(); c.fill(); });
    c.strokeStyle = 'rgba(20,70,90,.6)'; c.lineWidth = 2.5; [[-38, -14], [38, -14]].forEach(([x, y]) => { for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x, y + i * 6); c.lineTo(x + Math.sign(x) * 8, y + i * 6 + 2); c.stroke(); } });
    c.restore();
  };
  ART.dagon = function (c, t, m) {   // ダゴン（海の主）
    const ang = m === 'angry', fl = Math.sin(t * 1.4) * 4, pulse = .65 + .35 * Math.sin(t * 3);
    c.save(); c.translate(0, fl);
    const aura = c.createRadialGradient(0, 0, 20, 0, 0, 150); aura.addColorStop(0, 'rgba(90,120,255,' + (.3 * pulse) + ')'); aura.addColorStop(1, 'rgba(90,120,255,0)'); c.fillStyle = aura; c.fillRect(-170, -150, 340, 320);
    // 触手
    for (let i = 0; i < 6; i++) {
      const sd = i < 3 ? -1 : 1, k = i % 3, ph = t * 2 + i, x0 = sd * (20 + k * 14), tipX = sd * (54 + k * 26) + Math.sin(ph) * 12, tipY = 78 + k * 8;
      c.strokeStyle = grad(c, 0, 20, 0, 100, [[0, '#7a4ac0'], [1, '#4a2a90']]); c.lineWidth = 16 - k * 2.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x0, 30); c.bezierCurveTo(sd * (70 + k * 16), 46 + Math.sin(ph) * 6, sd * (90 + k * 8), 70, tipX, tipY); c.stroke();
      c.fillStyle = '#ffb0e0'; for (let s = 0; s < 3; s++) { const u = .35 + s * .25; c.beginPath(); c.arc(x0 + (tipX - x0) * u, 36 + (tipY - 36) * u, 2.6, 0, 7); c.fill(); }
    }
    // 頭（外套膜）
    c.beginPath(); c.moveTo(-70, 30); c.bezierCurveTo(-84, -60, -44, -104, 0, -104); c.bezierCurveTo(44, -104, 84, -60, 70, 30); c.bezierCurveTo(40, 48, -40, 48, -70, 30); c.closePath();
    c.fillStyle = grad(c, 0, -104, 0, 48, [[0, '#a070e8'], [.6, '#6a40b8'], [1, '#3a2078']]); c.fill();
    c.strokeStyle = '#1e1048'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = 'rgba(255,170,230,.7)'; [[-40, -60, 9], [10, -84, 8], [46, -50, 10], [-14, -50, 6], [64, -14, 6], [-62, -20, 7]].forEach(([x, y, r]) => { ellipse(c, x, y, r, r * .8); c.fill(); });
    c.fillStyle = 'rgba(255,255,255,.35)'; ellipse(c, -30, -84, 18, 8); c.fill();
    // 王冠のようなとげ
    c.fillStyle = '#ffd24a'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 22 - 8, -92 + Math.abs(i) * 6); c.lineTo(i * 22, -116 + Math.abs(i) * 8); c.lineTo(i * 22 + 8, -92 + Math.abs(i) * 6); c.closePath(); c.fill(); }
    // 目・口
    [-1, 1].forEach(sd => { c.fillStyle = '#fff6b0'; ellipse(c, sd * 28, -14, 15, 15); c.fill(); c.fillStyle = ang ? '#e00030' : '#1a2a8a'; ellipse(c, sd * 28, -14, 7, 12); c.fill(); brow(c, sd * 28, -14, sd, ang, '#1a0a38'); });
    c.fillStyle = '#12082e'; A.rr(c, -22, 14, 44, 20, 10); c.fill();
    c.fillStyle = '#fff'; [-14, -5, 5, 14].forEach(x => { c.beginPath(); c.moveTo(x - 4, 14); c.lineTo(x, 26); c.lineTo(x + 4, 14); c.closePath(); c.fill(); });
    for (let i = 0; i < 5; i++) { const u = ((t * .35 + i * .2) % 1); c.fillStyle = 'rgba(200,230,255,' + (.6 * (1 - u)) + ')'; c.beginPath(); c.arc(-80 + i * 40 + Math.sin(t + i) * 8, 90 - u * 190, 3 + i % 2 * 2, 0, 7); c.fill(); }
    c.restore();
  };

  // ---- ステージ 10: 砂漠の遺跡 ----
  ART.scorpion = function (c, t, m) {
    const ang = m === 'angry', bob = Math.sin(t * 3) * 2, tail = Math.sin(t * 3) * 6;
    c.save(); c.translate(0, bob);
    shadow(c, 90 - bob, 80);
    const body = grad(c, 0, 20, 0, 96, [[0, '#f0c070'], [1, '#b87820']]);
    // 脚
    c.strokeStyle = '#8a5a14'; c.lineWidth = 6; c.lineCap = 'round';
    [-1, 1].forEach(sd => [0, 1, 2, 3].forEach(i => { c.beginPath(); c.moveTo(sd * 24, 52 + i * 8); c.quadraticCurveTo(sd * (56 + i * 6), 44 + i * 8 + Math.sin(t * 5 + i + sd) * 4, sd * (62 + i * 8), 84 + i * 3); c.stroke(); }));
    // しっぽ
    c.strokeStyle = '#c88a24'; c.lineWidth = 17; c.beginPath(); c.moveTo(30, 66); c.bezierCurveTo(88, 76, 96, 4, 52 + tail, -34); c.stroke();
    c.lineWidth = 11; c.strokeStyle = '#e0a444'; c.beginPath(); c.moveTo(30, 66); c.bezierCurveTo(88, 76, 96, 4, 52 + tail, -34); c.stroke();
    c.fillStyle = '#7a3a8a'; c.beginPath(); c.moveTo(40 + tail, -34); c.quadraticCurveTo(52 + tail, -52, 66 + tail, -62); c.quadraticCurveTo(64 + tail, -44, 62 + tail, -30); c.closePath(); c.fill();
    c.fillStyle = ang ? '#ff6ae0' : '#d8a0ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 8; c.beginPath(); c.arc(62 + tail, -58, 4, 0, 7); c.fill(); c.shadowBlur = 0;
    // はさみ
    [-1, 1].forEach(sd => {
      const open = ang ? 18 : 8 + Math.sin(t * 3 + sd) * 4;
      c.strokeStyle = '#c88a24'; c.lineWidth = 12; c.beginPath(); c.moveTo(sd * 30, 56); c.quadraticCurveTo(sd * 62, 52, sd * 70, 26); c.stroke();
      c.fillStyle = '#d89a34'; c.beginPath(); c.moveTo(sd * 70, 26); c.quadraticCurveTo(sd * 96, 6 - open * .3, sd * 78, -16 - open * .2); c.quadraticCurveTo(sd * 66, 6, sd * 70, 26); c.fill();
      c.beginPath(); c.moveTo(sd * 70, 26); c.quadraticCurveTo(sd * 100, 28 + open * .4, sd * 84, 48 + open * .4); c.quadraticCurveTo(sd * 66, 40, sd * 70, 26); c.fill();
      c.strokeStyle = '#7a4a10'; c.lineWidth = 2.5; c.stroke();
    });
    // 体
    c.fillStyle = body; ellipse(c, 0, 62, 36, 30); c.fill(); c.strokeStyle = '#7a4a10'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(120,70,10,.5)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 52 + i * 10, 30 - i * 3, 5, 0, 0, Math.PI); c.stroke(); }
    c.fillStyle = grad(c, 0, 14, 0, 60, [[0, '#f8d488'], [1, '#c88a24']]); ellipse(c, 0, 34, 30, 24); c.fill(); c.strokeStyle = '#7a4a10'; c.lineWidth = 3; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 13, 28, 8, 9); c.fill(); c.fillStyle = '#2a0c0c'; ellipse(c, sd * 13, 29, 3.5, 6); c.fill(); brow(c, sd * 13, 28, sd, ang, '#5a2a08'); });
    c.fillStyle = '#5a2a08'; A.rr(c, -10, 42, 20, 7, 3.5); c.fill();
    c.restore();
  };
  ART.mummy = function (c, t, m) {
    const ang = m === 'angry', bob = Math.sin(t * 2.2) * 2.5;
    c.save(); c.translate(0, bob);
    shadow(c, 96 - bob, 56);
    const wrap = grad(c, 0, -80, 0, 96, [[0, '#f4ecd2'], [1, '#c8b88a']]);
    const bands = (cx, cy, rx, ry, n, off) => { c.strokeStyle = 'rgba(110,90,50,.5)'; c.lineWidth = 2.2; for (let i = 0; i < n; i++) { const y = cy - ry + (i + .5) * 2 * ry / n; const w = rx * Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / ry, 2))); c.beginPath(); c.moveTo(cx - w, y + off); c.lineTo(cx + w, y - off); c.stroke(); } };
    // 腕（前へ）
    [-1, 1].forEach(sd => { const lift = ang ? -26 : Math.sin(t * 2.2 + sd) * 4; c.fillStyle = wrap; A.rr(c, sd > 0 ? 28 : -72, 8 + lift, 44, 20, 10); c.fill(); c.strokeStyle = '#8a7a4a'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = wrap; ellipse(c, sd * 70, 18 + lift, 11, 11); c.fill(); c.stroke(); bands(sd * 50, 18 + lift, 22, 10, 3, 2); });
    // 足
    [-1, 1].forEach(sd => { c.fillStyle = wrap; A.rr(c, sd * 20 - 14, 70, 28, 28, 9); c.fill(); c.strokeStyle = '#8a7a4a'; c.lineWidth = 2.5; c.stroke(); bands(sd * 20, 84, 14, 14, 3, 2); });
    // 胴
    c.fillStyle = wrap; ellipse(c, 0, 38, 40, 44); c.fill(); c.strokeStyle = '#8a7a4a'; c.lineWidth = 3; c.stroke(); bands(0, 38, 40, 44, 8, 4);
    // 頭
    c.fillStyle = wrap; ellipse(c, 0, -30, 40, 42); c.fill(); c.stroke(); bands(0, -30, 40, 42, 8, 5);
    c.fillStyle = '#1a1208'; A.rr(c, -26, -42, 52, 18, 8); c.fill();   // 包帯のすき間
    [-1, 1].forEach(sd => { c.fillStyle = ang ? '#ff4a3a' : '#9bf0ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 10; ellipse(c, sd * 13, -33, 6, 6); c.fill(); c.shadowBlur = 0; });
    // ほどけた包帯
    c.strokeStyle = '#e8dcb8'; c.lineWidth = 7; c.lineCap = 'round';
    [[-34, -50, -66, -28, -70], [30, 14, 62, 40, 58], [-18, 62, -46, 86, -52]].forEach(([x1, y1, x2, y2, x3], i) => { const sw = Math.sin(t * 3 + i * 2) * 8; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(x2 + sw, y2, x3 + sw * 1.5, y2 + 22); c.stroke(); });
    c.restore();
  };
  ART.pharaoh = function (c, t, m) {   // ファラオ（ボス）
    const ang = m === 'angry', bob = Math.sin(t * 1.4) * 3, pulse = .7 + .3 * Math.sin(t * 3);
    c.save(); c.translate(0, bob);
    shadow(c, 98 - bob, 66);
    const gl = c.createRadialGradient(0, -10, 20, 0, -10, 150); gl.addColorStop(0, 'rgba(255,210,90,' + (.28 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,210,90,0)'); c.fillStyle = gl; c.fillRect(-170, -160, 340, 320);
    // 体（衣）
    c.fillStyle = grad(c, 0, 0, 0, 100, [[0, '#2a2a6a'], [1, '#12123a']]);
    c.beginPath(); c.moveTo(-50, 0); c.quadraticCurveTo(-78, 60, -58, 100); c.lineTo(58, 100); c.quadraticCurveTo(78, 60, 50, 0); c.closePath(); c.fill();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, 96); c.lineTo(60, 96); c.stroke();
    // 錫と鞭
    c.strokeStyle = '#e0a010'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-72, 88); c.lineTo(-72, 0); c.quadraticCurveTo(-72, -22, -52, -20); c.stroke();
    c.beginPath(); c.moveTo(72, 88); c.lineTo(72, -4); c.stroke(); [-3, 0, 3].forEach(k => { c.strokeStyle = '#2a8ad8'; c.lineWidth = 4; c.beginPath(); c.moveTo(72, -4); c.lineTo(72 + k * 7, -30 + Math.abs(k) * 4); c.stroke(); });
    // 腕を組む
    c.fillStyle = '#c88a3a'; ellipse(c, -24, 30, 20, 11); c.fill(); ellipse(c, 24, 30, 20, 11); c.fill();
    c.strokeStyle = '#7a4a10'; c.lineWidth = 2.5; c.stroke();
    // 胸飾り
    c.fillStyle = grad(c, 0, -4, 0, 30, [[0, '#ffe680'], [1, '#d8900a']]); c.beginPath(); c.moveTo(-46, -2); c.quadraticCurveTo(0, 38, 46, -2); c.lineTo(34, -2); c.quadraticCurveTo(0, 24, -34, -2); c.closePath(); c.fill();
    ['#2a8ad8', '#e0245e', '#2a8ad8', '#2ab07a', '#2a8ad8'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(-30 + i * 15, 8 + Math.sin(i / 4 * Math.PI) * 6, 3.5, 0, 7); c.fill(); });
    // ネメスの頭巾
    c.fillStyle = '#2a8ad8'; c.beginPath(); c.moveTo(-50, -70); c.quadraticCurveTo(-70, -10, -52, 22); c.lineTo(-30, 14); c.lineTo(-34, -60); c.closePath(); c.fill(); c.beginPath(); c.moveTo(50, -70); c.quadraticCurveTo(70, -10, 52, 22); c.lineTo(30, 14); c.lineTo(34, -60); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a'; for (let i = 0; i < 5; i++) { c.fillRect(-62 + i * 1, -50 + i * 14, 18 - i, 4); c.fillRect(44 - i * 1 + i, -50 + i * 14, 18 - i, 4); }
    c.fillStyle = grad(c, 0, -90, 0, -20, [[0, '#2a8ad8'], [1, '#1a5aa8']]); c.beginPath(); c.moveTo(-52, -52); c.quadraticCurveTo(-52, -96, 0, -98); c.quadraticCurveTo(52, -96, 52, -52); c.lineTo(34, -48); c.lineTo(-34, -48); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a'; for (let i = 0; i < 4; i++) c.fillRect(-40, -88 + i * 11, 80, 3.5);
    // 金のマスク
    c.fillStyle = grad(c, 0, -60, 0, 14, [[0, '#fff0a0'], [.5, '#ffc83a'], [1, '#c88a10']]); ellipse(c, 0, -34, 32, 40); c.fill();
    c.strokeStyle = '#7a4a08'; c.lineWidth = 2.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#0e1a3a'; c.beginPath(); c.moveTo(sd * 6, -42); c.lineTo(sd * 28, -46); c.lineTo(sd * 24, -34); c.lineTo(sd * 6, -34); c.closePath(); c.fill(); c.fillStyle = ang ? '#ff3a3a' : '#7af0ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 8; ellipse(c, sd * 16, -39, 4.5, 3.5); c.fill(); c.shadowBlur = 0; });
    c.fillStyle = '#7a4a08'; c.beginPath(); c.moveTo(0, -36); c.lineTo(-5, -20); c.lineTo(5, -20); c.closePath(); c.fill();
    c.fillStyle = '#2a8ad8'; c.beginPath(); c.moveTo(-5, -4); c.lineTo(5, -4); c.lineTo(11, 30); c.lineTo(0, 22); c.lineTo(-11, 30); c.closePath(); c.fill();   // あごひげ
    // ウラエウス（コブラ）
    c.fillStyle = '#e0a010'; c.beginPath(); c.moveTo(-8, -96); c.quadraticCurveTo(-12, -116, 0, -122); c.quadraticCurveTo(12, -116, 8, -96); c.closePath(); c.fill(); c.fillStyle = '#e0245e'; c.beginPath(); c.arc(0, -108, 3.5, 0, 7); c.fill();
    c.restore();
  };

  // ---- ステージ 11: 機械工場 ----
  ART.drone = function (c, t, m) {
    const ang = m === 'angry', fl = Math.sin(t * 3) * 7, spin = t * 30;
    c.save(); c.translate(0, fl);
    c.fillStyle = 'rgba(0,0,0,.2)'; ellipse(c, 0, 96 - fl, 34, 6); c.fill();
    // ジェットの炎
    c.fillStyle = 'rgba(120,220,255,.75)'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 30 - 8, 66); c.lineTo(sd * 30, 90 + Math.sin(t * 20 + sd) * 6); c.lineTo(sd * 30 + 8, 66); c.closePath(); c.fill(); });
    // アーム
    [-1, 1].forEach(sd => { c.strokeStyle = '#5a6a8a'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 40, 20); c.quadraticCurveTo(sd * 78, 24, sd * 74, 52 + (ang ? -10 : 0)); c.stroke(); c.fillStyle = '#8a9ab8'; c.beginPath(); c.moveTo(sd * 74, 52); c.lineTo(sd * 62, 74); c.lineTo(sd * 74, 66); c.lineTo(sd * 86, 74); c.closePath(); c.fill(); });
    // プロペラ
    c.strokeStyle = 'rgba(200,220,255,.8)'; c.lineWidth = 5; c.lineCap = 'round';
    [-1, 1].forEach(sd => { const px = sd * 56, py = -50; c.strokeStyle = '#6a7a9a'; c.lineWidth = 6; c.beginPath(); c.moveTo(sd * 30, -14); c.lineTo(px, py + 10); c.stroke(); c.strokeStyle = 'rgba(200,225,255,.85)'; c.lineWidth = 5; c.beginPath(); c.moveTo(px - 28 * Math.cos(spin), py - 6 * Math.sin(spin)); c.lineTo(px + 28 * Math.cos(spin), py + 6 * Math.sin(spin)); c.stroke(); c.fillStyle = 'rgba(200,225,255,.18)'; ellipse(c, px, py, 30, 7); c.fill(); });
    // 本体
    c.fillStyle = grad(c, 0, -34, 0, 70, [[0, '#d0d8ec'], [1, '#6a7aa0']]); ellipse(c, 0, 18, 52, 46); c.fill();
    c.strokeStyle = '#2a3250'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#4a5a80'; A.rr(c, -52, 14, 104, 8, 4); c.fill();
    [[-34, 38], [34, 38], [-20, -6], [20, -6]].forEach(([x, y]) => { c.fillStyle = '#2a3250'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); });
    // 目（カメラ）
    c.fillStyle = '#12182a'; ellipse(c, 0, 14, 30, 24); c.fill();
    const eg = c.createRadialGradient(0, 14, 2, 0, 14, 20); eg.addColorStop(0, '#fff'); eg.addColorStop(.35, ang ? '#ff4a5a' : '#4ae8ff'); eg.addColorStop(1, ang ? '#7a0a1a' : '#0a5a88');
    c.fillStyle = eg; ellipse(c, Math.sin(t * 1.5) * 4, 14, 18, 18); c.fill();
    c.fillStyle = '#12182a'; ellipse(c, Math.sin(t * 1.5) * 4, 14, 6, 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; ellipse(c, Math.sin(t * 1.5) * 4 - 6, 8, 4, 3); c.fill();
    c.strokeStyle = '#2a3250'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -52); c.stroke(); c.fillStyle = ang ? '#ff4a5a' : '#ffd24a'; c.shadowColor = c.fillStyle; c.shadowBlur = 8 * (.5 + .5 * Math.sin(t * 6)); c.beginPath(); c.arc(0, -56, 5, 0, 7); c.fill(); c.shadowBlur = 0;
    c.restore();
  };
  ART.robo = function (c, t, m) {
    const ang = m === 'angry', bob = Math.abs(Math.sin(t * 2.6)) * 3;
    shadow(c, 96, 60);
    c.save(); c.translate(0, -bob);
    const steel = grad(c, -50, 0, 50, 0, [[0, '#5a6a8a'], [.5, '#b8c4dc'], [1, '#48587a']]);
    // 足（キャタピラ）
    [-1, 1].forEach(sd => { c.fillStyle = '#2a3250'; A.rr(c, sd * 32 - 24, 74, 48, 26, 12); c.fill(); c.fillStyle = '#6a7a9a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(sd * 32 - 15 + i * 10, 88, 4, 0, 7); c.fill(); } c.strokeStyle = '#8a9ab8'; c.lineWidth = 2; A.rr(c, sd * 32 - 24, 74, 48, 26, 12); c.stroke(); });
    // 腕（ロケットパンチ風）
    [-1, 1].forEach(sd => { const lift = ang ? -20 : Math.sin(t * 2.6 + sd) * 3; c.fillStyle = '#3a4668'; A.rr(c, sd > 0 ? 50 : -66, 6 + lift, 16, 44, 7); c.fill(); c.fillStyle = '#e0584a'; A.rr(c, sd > 0 ? 44 : -72, 44 + lift, 28, 26, 9); c.fill(); c.strokeStyle = '#7a2018'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#ffd24a'; c.fillRect(sd * 58 - 8, 54 + lift, 16, 5); });
    // 胴
    c.fillStyle = steel; A.rr(c, -46, -6, 92, 80, 16); c.fill(); c.strokeStyle = '#2a3250'; c.lineWidth = 3.5; A.rr(c, -46, -6, 92, 80, 16); c.stroke();
    c.fillStyle = '#2a3250'; A.rr(c, -26, 8, 52, 32, 8); c.fill();
    const cg = c.createRadialGradient(0, 24, 2, 0, 24, 14); cg.addColorStop(0, '#fff'); cg.addColorStop(.4, ang ? '#ff6a5a' : '#6af0a0'); cg.addColorStop(1, 'rgba(60,200,120,0)'); c.fillStyle = cg; c.beginPath(); c.arc(0, 24, 14, 0, 7); c.fill();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-40 + i * 6, 62); c.lineTo(-34 + i * 6, 70); c.stroke(); c.beginPath(); c.moveTo(14 + i * 6, 62); c.lineTo(20 + i * 6, 70); c.stroke(); }
    [[-38, 4], [38, 4], [-38, 66], [38, 66]].forEach(([x, y]) => { c.fillStyle = '#2a3250'; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); });
    // 肩の砲
    [-1, 1].forEach(sd => { c.fillStyle = '#48587a'; A.rr(c, sd * 40 - 12, -22, 24, 24, 8); c.fill(); c.strokeStyle = '#2a3250'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#12182a'; c.beginPath(); c.arc(sd * 40, -10, 6, 0, 7); c.fill(); });
    // 頭
    c.fillStyle = steel; A.rr(c, -34, -66, 68, 52, 14); c.fill(); c.strokeStyle = '#2a3250'; c.lineWidth = 3.5; A.rr(c, -34, -66, 68, 52, 14); c.stroke();
    c.fillStyle = '#12182a'; A.rr(c, -26, -52, 52, 20, 8); c.fill();
    c.fillStyle = ang ? '#ff4a5a' : '#4ae8ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 10; A.rr(c, -20 + (Math.sin(t * 2) + 1) * 6, -47, 18, 10, 4); c.fill(); A.rr(c, 4 + (Math.sin(t * 2) + 1) * 3, -47, 18, 10, 4); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#2a3250'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(20, -66); c.lineTo(26, -88); c.stroke(); c.fillStyle = '#e0584a'; c.beginPath(); c.arc(26, -90, 5, 0, 7); c.fill();
    for (let i = 0; i < 3; i++) { const u = ((t * .6 + i * .33) % 1); c.fillStyle = 'rgba(210,220,235,' + (.4 * (1 - u)) + ')'; c.beginPath(); c.arc(-40 + i * 6, -20 - u * 50, 5 + u * 7, 0, 7); c.fill(); }
    c.restore();
  };
  ART.deathmachine = function (c, t, m) {   // デスマシン（ボス）
    const ang = m === 'angry', bob = Math.sin(t * 1.5) * 2.5, pulse = .65 + .35 * Math.sin(t * 4);
    c.save(); c.translate(0, bob);
    shadow(c, 98 - bob, 82);
    const ag = c.createRadialGradient(0, 20, 20, 0, 20, 140); ag.addColorStop(0, 'rgba(255,60,60,' + (.28 * pulse) + ')'); ag.addColorStop(1, 'rgba(255,60,60,0)'); c.fillStyle = ag; c.fillRect(-160, -130, 320, 280);
    const steel = grad(c, -60, 0, 60, 0, [[0, '#2a3048'], [.5, '#6a7494'], [1, '#222840']]);
    // 脚
    [-1, 1].forEach(sd => { c.fillStyle = '#323a58'; A.rr(c, sd * 34 - 26, 62, 52, 40, 10); c.fill(); c.strokeStyle = '#12182a'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#4a5474'; A.rr(c, sd * 34 - 34, 92, 68, 12, 5); c.fill(); });
    // 腕＋大砲
    [-1, 1].forEach(sd => {
      const lift = ang ? -12 : Math.sin(t * 1.5 + sd) * 3;
      c.fillStyle = '#323a58'; A.rr(c, sd > 0 ? 60 : -90, -16 + lift, 30, 70, 10); c.fill(); c.strokeStyle = '#12182a'; c.lineWidth = 3; c.stroke();
      c.fillStyle = steel; A.rr(c, sd > 0 ? 52 : -98, 46 + lift, 46, 38, 8); c.fill(); c.stroke();
      c.fillStyle = '#0a0e1c'; c.beginPath(); c.arc(sd * 75, 84 + lift, 11, 0, 7); c.fill(); c.fillStyle = 'rgba(255,90,60,' + pulse + ')'; c.beginPath(); c.arc(sd * 75, 84 + lift, 6, 0, 7); c.fill();
      c.strokeStyle = '#8a94b4'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sd * 66, 6 + lift + i * 14); c.lineTo(sd * 84, 6 + lift + i * 14); c.stroke(); }
    });
    // 胴
    c.fillStyle = steel; A.rr(c, -58, -26, 116, 100, 18); c.fill(); c.strokeStyle = '#12182a'; c.lineWidth = 4; A.rr(c, -58, -26, 116, 100, 18); c.stroke();
    c.fillStyle = '#12182a'; A.rr(c, -34, 0, 68, 46, 10); c.fill();
    const cg = c.createRadialGradient(0, 22, 2, 0, 22, 26); cg.addColorStop(0, '#fff'); cg.addColorStop(.4, 'rgba(255,90,60,' + pulse + ')'); cg.addColorStop(1, 'rgba(255,60,60,0)'); c.fillStyle = cg; c.beginPath(); c.arc(0, 22, 26, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,200,120,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 22, 14 + pulse * 2, 0, 7); c.stroke();
    c.fillStyle = '#e0a010'; for (let i = 0; i < 5; i++) c.fillRect(-48 + i * 22, 56, 14, 6);
    [[-48, -16], [48, -16], [-48, 64], [48, 64]].forEach(([x, y]) => { c.fillStyle = '#12182a'; c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); });
    // 肩の煙突
    [-1, 1].forEach(sd => { c.fillStyle = '#323a58'; A.rr(c, sd * 42 - 10, -62, 20, 38, 5); c.fill(); c.strokeStyle = '#12182a'; c.lineWidth = 2.5; c.stroke(); for (let i = 0; i < 3; i++) { const u = ((t * .6 + i * .33 + sd * .1) % 1); c.fillStyle = 'rgba(70,74,90,' + (.55 * (1 - u)) + ')'; c.beginPath(); c.arc(sd * 42 + Math.sin(t + i) * 4, -66 - u * 40, 6 + u * 10, 0, 7); c.fill(); } });
    // 頭
    c.fillStyle = steel; c.beginPath(); c.moveTo(-34, -30); c.lineTo(-30, -70); c.lineTo(-14, -84); c.lineTo(14, -84); c.lineTo(30, -70); c.lineTo(34, -30); c.closePath(); c.fill(); c.strokeStyle = '#12182a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#c0242c'; c.beginPath(); c.moveTo(-8, -84); c.lineTo(0, -104); c.lineTo(8, -84); c.closePath(); c.fill();
    c.fillStyle = '#0a0e1c'; A.rr(c, -28, -62, 56, 22, 6); c.fill();
    c.fillStyle = '#ff2a3a'; c.shadowColor = '#ff2a3a'; c.shadowBlur = 14 * pulse; ellipse(c, 0, -51, 20 + (ang ? 4 : 0), 6); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#12182a'; for (let i = 0; i < 4; i++) c.fillRect(-18 + i * 10, -36, 5, 8);
    c.restore();
  };

  // ---- ステージ 12: 時空の狭間 ----
  ART.voideye = function (c, t, m) {   // 虚空の目
    const ang = m === 'angry', fl = Math.sin(t * 1.8) * 8, pulse = .6 + .4 * Math.sin(t * 3);
    c.save(); c.translate(0, fl);
    const aura = c.createRadialGradient(0, 0, 20, 0, 0, 130); aura.addColorStop(0, 'rgba(150,80,255,' + (.45 * pulse) + ')'); aura.addColorStop(1, 'rgba(150,80,255,0)'); c.fillStyle = aura; c.fillRect(-150, -150, 300, 300);
    // 触手の血管
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t * .15, x2 = Math.cos(a) * 92, y2 = Math.sin(a) * 82 + 6; c.strokeStyle = 'rgba(190,100,255,.85)'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); c.quadraticCurveTo(Math.cos(a + .5) * 70 + Math.sin(t * 2 + i) * 6, Math.sin(a + .5) * 66, x2, y2); c.stroke(); c.fillStyle = '#d8a0ff'; c.beginPath(); c.arc(x2, y2, 5, 0, 7); c.fill(); }
    // 白目
    c.fillStyle = grad(c, 0, -52, 0, 52, [[0, '#ffffff'], [1, '#c8c0e0']]); ellipse(c, 0, 0, 56, 52); c.fill();
    c.strokeStyle = '#4a2a8a'; c.lineWidth = 3.5; c.stroke();
    c.strokeStyle = 'rgba(220,60,90,.55)'; c.lineWidth = 1.8; [[-50, -10, -30, -6], [-48, 14, -28, 8], [50, -12, 30, -8], [46, 16, 28, 10], [-20, -48, -12, -32], [22, -46, 14, -30]].forEach(([x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 6, x2, y2); c.stroke(); });
    // 虹彩（宇宙のうず）
    const lx = Math.sin(t * .9) * 8, ly = Math.cos(t * .7) * 4;
    const ig = c.createRadialGradient(lx, ly, 4, lx, ly, 32); ig.addColorStop(0, '#12082e'); ig.addColorStop(.35, '#4a2aa8'); ig.addColorStop(.7, ang ? '#e0245e' : '#8a5ae0'); ig.addColorStop(1, '#2a1070');
    c.fillStyle = ig; c.beginPath(); c.arc(lx, ly, 32, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.6; for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 3 + t * 1.2 + k * 2.09, r = 4 + i / 24 * 26; const x = lx + Math.cos(a) * r, y = ly + Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.fillStyle = '#000'; ellipse(c, lx, ly, 9, 15 + (ang ? 3 : 0)); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; ellipse(c, lx - 10, ly - 12, 6, 4); c.fill();
    [[-70, -60, 0], [74, -52, 1.5], [0, 78, 3]].forEach(([x, y, p]) => { const o = Math.sin(t * 2 + p) * 6; c.fillStyle = '#fff'; ellipse(c, x, y + o, 9, 9); c.fill(); c.fillStyle = '#6a2ac8'; ellipse(c, x, y + o, 4, 5); c.fill(); });
    c.restore();
  };
  ART.shadow = function (c, t, m) {   // シャドウ
    const ang = m === 'angry', fl = Math.sin(t * 2.4) * 8;
    c.save(); c.translate(0, fl);
    const aura = c.createRadialGradient(0, 10, 10, 0, 10, 120); aura.addColorStop(0, 'rgba(120,60,200,.4)'); aura.addColorStop(1, 'rgba(120,60,200,0)'); c.fillStyle = aura; c.fillRect(-140, -120, 280, 260);
    // もやの尾
    c.fillStyle = grad(c, 0, 0, 0, 100, [[0, 'rgba(34,20,66,.96)'], [1, 'rgba(20,10,40,.3)']]);
    c.beginPath(); c.moveTo(-56, 6);
    c.bezierCurveTo(-72, 60, -64, 90, -40, 100); for (let i = 0; i < 5; i++) c.quadraticCurveTo(-40 + (i + .5) * 16 + Math.sin(t * 4 + i) * 4, 84 + (i % 2) * 22, -40 + (i + 1) * 16, 100);
    c.bezierCurveTo(64, 90, 72, 60, 56, 6); c.closePath(); c.fill();
    // 体
    c.fillStyle = grad(c, 0, -60, 0, 40, [[0, '#3a2870'], [1, '#1a1038']]);
    c.beginPath(); c.moveTo(-50, 30); c.bezierCurveTo(-64, -40, -34, -92, 0, -92); c.bezierCurveTo(34, -92, 64, -40, 50, 30); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(180,140,255,.55)'; c.lineWidth = 3; c.stroke();
    // フードの影
    c.fillStyle = '#05020c'; ellipse(c, 0, -34, 32, 36); c.fill();
    // 目と口
    [-1, 1].forEach(sd => { c.fillStyle = ang ? '#ff5a8a' : '#ffffff'; c.shadowColor = c.fillStyle; c.shadowBlur = 14; c.beginPath(); c.moveTo(sd * 8, -44); c.lineTo(sd * 26, -48 - (ang ? 0 : 3)); c.lineTo(sd * 22, -34); c.closePath(); c.fill(); c.shadowBlur = 0; });
    c.fillStyle = ang ? '#ff5a8a' : '#e8e0ff'; c.beginPath(); c.moveTo(-14, -14); c.quadraticCurveTo(0, ang ? -8 : 4, 14, -14); c.quadraticCurveTo(0, ang ? -16 : -8, -14, -14); c.fill();
    // かぎ爪の腕
    [-1, 1].forEach(sd => { const lift = ang ? -24 : Math.sin(t * 2.4 + sd) * 6; c.strokeStyle = '#2a1a58'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 46, -4); c.quadraticCurveTo(sd * 84, 6 + lift, sd * 82, 44 + lift); c.stroke(); c.strokeStyle = '#d8c8ff'; c.lineWidth = 4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sd * 82 + i * 6, 44 + lift); c.lineTo(sd * 82 + i * 10, 66 + lift); c.stroke(); } });
    for (let i = 0; i < 6; i++) { const u = ((t * .5 + i * .17) % 1); c.fillStyle = 'rgba(130,80,220,' + (.5 * (1 - u)) + ')'; c.beginPath(); c.arc(-50 + i * 20 + Math.sin(t * 2 + i) * 8, 20 - u * 100, 5 + u * 6, 0, 7); c.fill(); }
    c.restore();
  };
  ART.timelord = function (c, t, m) {   // タイムロード（ボス）
    const ang = m === 'angry', bob = Math.sin(t * 1.3) * 4, pulse = .65 + .35 * Math.sin(t * 2.8);
    c.save(); c.translate(0, bob);
    shadow(c, 100 - bob, 70);
    // 後ろの大きな時計
    c.save(); c.translate(0, -34);
    c.fillStyle = 'rgba(255,230,140,' + (.15 * pulse) + ')'; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,220,120,' + (.65 + .3 * pulse) + ')'; c.lineWidth = 5; c.shadowColor = '#ffd870'; c.shadowBlur = 14; c.beginPath(); c.arc(0, 0, 92, 0, 7); c.stroke(); c.shadowBlur = 0;
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,220,120,.7)';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(Math.cos(a) * (i % 3 ? 82 : 76), Math.sin(a) * (i % 3 ? 82 : 76)); c.lineTo(Math.cos(a) * 90, Math.sin(a) * 90); c.stroke(); }
    c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * 1.2) * 60, Math.sin(t * 1.2) * 60); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * .1) * 44, Math.sin(t * .1) * 44); c.stroke();
    c.restore();
    // 歯車
    [[-84, 30, 14, 1], [86, 10, 18, -1], [-70, -70, 11, -1]].forEach(([x, y, r, d]) => { c.save(); c.translate(x, y); c.rotate(t * .8 * d); c.fillStyle = '#d8a82a'; c.beginPath(); for (let i = 0; i < 16; i++) { const rr = i % 2 ? r : r + 5, a = i / 16 * Math.PI * 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.fillStyle = '#5a3a08'; c.beginPath(); c.arc(0, 0, r * .4, 0, 7); c.fill(); c.restore(); });
    // ローブ
    c.fillStyle = grad(c, 0, -10, 0, 100, [[0, '#2a1a70'], [1, '#0e0a30']]);
    c.beginPath(); c.moveTo(-34, -6); c.quadraticCurveTo(-76, 56, -56, 102); c.lineTo(56, 102); c.quadraticCurveTo(76, 56, 34, -6); c.closePath(); c.fill();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(255,255,255,' + (.35 + .5 * Math.abs(Math.sin(t * 2 + i))) + ')'; c.beginPath(); c.arc(-46 + (i * 37) % 92, 8 + (i * 29) % 84, 1.6, 0, 7); c.fill(); }
    // 砂時計の杖
    c.save(); c.translate(70, 24);
    c.strokeStyle = '#8a6a2a'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 74); c.lineTo(0, -34); c.stroke();
    c.fillStyle = 'rgba(200,230,255,.55)'; c.beginPath(); c.moveTo(-14, -66); c.lineTo(14, -66); c.lineTo(3, -50); c.lineTo(14, -34); c.lineTo(-14, -34); c.lineTo(-3, -50); c.closePath(); c.fill(); c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#ffe080'; c.beginPath(); c.moveTo(-9, -38); c.lineTo(9, -38); c.lineTo(0, -46); c.closePath(); c.fill(); c.fillRect(-1, -52, 2, 14 + Math.sin(t * 6) * 2);
    c.restore();
    // 手・頭・冠
    [-1, 1].forEach(sd => { c.fillStyle = '#e8d8c0'; ellipse(c, sd * 44, 40 + (sd > 0 ? (ang ? -18 : 0) : 0), 10, 10); c.fill(); });
    c.fillStyle = '#e8d8c0'; ellipse(c, 0, -30, 26, 30); c.fill(); c.strokeStyle = '#7a6a50'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#f0f0ff'; c.beginPath(); c.moveTo(-24, -20); c.quadraticCurveTo(-26, 26, 0, 40); c.quadraticCurveTo(26, 26, 24, -20); c.quadraticCurveTo(0, -4, -24, -20); c.closePath(); c.fill();
    c.fillStyle = '#2a1a70'; c.beginPath(); c.moveTo(-34, -42); c.quadraticCurveTo(0, -84, 34, -42); c.quadraticCurveTo(0, -56, -34, -42); c.fill();
    c.fillStyle = grad(c, 0, -80, 0, -48, [[0, '#ffe680'], [1, '#d8900a']]); c.beginPath(); c.moveTo(-30, -52); c.lineTo(-34, -78); c.lineTo(-16, -62); c.lineTo(0, -88); c.lineTo(16, -62); c.lineTo(34, -78); c.lineTo(30, -52); c.closePath(); c.fill();
    c.fillStyle = '#5ad8ff'; ellipse(c, 0, -66, 5, 6); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#12082e'; ellipse(c, sd * 11, -34, 8, 6); c.fill(); c.fillStyle = ang ? '#ff6a6a' : '#ffe680'; c.shadowColor = c.fillStyle; c.shadowBlur = 8; ellipse(c, sd * 11, -34, 3.5, 3.5); c.fill(); c.shadowBlur = 0; c.strokeStyle = '#5a4a38'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 20, -46); c.lineTo(sd * 4, -40 + (ang ? 3 : 0)); c.stroke(); });
    c.restore();
  };

  // ================= ステージ 13〜17 の敵 =================
  const glowEye = (c, x, y, rx, ry, col) => { c.save(); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10; ellipse(c, x, y, rx, ry); c.fill(); c.restore(); };
  const shard = (c, x, y, w, h, ang, c1, c2) => {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w * .3, -h * .8); c.lineTo(0, -h); c.lineTo(w * .3, -h * .8); c.lineTo(w / 2, 0); c.closePath();
    c.fillStyle = grad(c, -w / 2, 0, w / 2, -h, [[0, c1], [1, c2]]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.8; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h); c.stroke();
    c.restore();
  };
  const bolt = (c, x1, y1, x2, y2, col, w) => {
    c.save(); c.strokeStyle = col; c.lineWidth = w || 4; c.lineJoin = 'round'; c.shadowColor = col; c.shadowBlur = 10;
    const n = 5; c.beginPath(); c.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const u = i / n; c.lineTo(x1 + (x2 - x1) * u + (i % 2 ? 9 : -9), y1 + (y2 - y1) * u); }
    c.lineTo(x2, y2); c.stroke(); c.restore();
  };

  // ---- ステージ 13: 水晶の洞窟 ----
  ART.crybat = function (c, t, m) {   // クリスタルバット
    const ang = m === 'angry', fl = Math.sin(t * 6), hover = Math.sin(t * 2.4) * 6;
    shadow(c, 96, 40);
    c.save(); c.translate(0, hover - 6);
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .22);
      c.beginPath(); c.moveTo(18, -6); c.lineTo(60, -62); c.lineTo(94, -40); c.lineTo(84, -6); c.lineTo(98, 22); c.lineTo(64, 14); c.lineTo(44, 36); c.lineTo(22, 12); c.closePath();
      c.fillStyle = grad(c, 18, -60, 98, 30, [[0, '#d8a8ff'], [.5, '#8a5ae0'], [1, '#3a2090']]); c.fill();
      c.strokeStyle = '#2a1466'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.8;
      [[60, -62], [84, -6], [64, 14]].forEach(([x, y]) => { c.beginPath(); c.moveTo(20, 0); c.lineTo(x, y); c.stroke(); });
      c.restore();
    });
    [-1, 1].forEach(sd => { c.fillStyle = '#6a42c8'; c.beginPath(); c.moveTo(sd * 12, -40); c.lineTo(sd * 26, -78); c.lineTo(sd * 30, -34); c.closePath(); c.fill(); c.strokeStyle = '#2a1466'; c.lineWidth = 2.5; c.stroke(); });
    c.fillStyle = grad(c, 0, -46, 0, 52, [[0, '#c8e4ff'], [.5, '#7ab0f0'], [1, '#3a5ab8']]); ellipse(c, 0, 4, 32, 44); c.fill();
    c.strokeStyle = '#1e2c6a'; c.lineWidth = 3.5; c.stroke();
    shard(c, 0, 0, 22, 44, 0, 'rgba(255,255,255,.5)', 'rgba(255,255,255,.05)');
    [-1, 1].forEach(sd => { glowEye(c, sd * 13, -6, 7, ang ? 6 : 8, ang ? '#ff5a5a' : '#fff48a'); c.fillStyle = '#1a1030'; ellipse(c, sd * 13, -5, 2.5, 5); c.fill(); });
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-9, 18); c.lineTo(-5, 30); c.lineTo(-1, 18); c.moveTo(1, 18); c.lineTo(5, 30); c.lineTo(9, 18); c.fill();
    c.restore();
  };
  ART.crygolem = function (c, t, m) {   // クリスタルゴーレム
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 96, 70);
    [-1, 1].forEach(sd => { c.fillStyle = '#4a4660'; c.beginPath(); c.moveTo(sd * 12, 52); c.lineTo(sd * 44, 52); c.lineTo(sd * 50, 96); c.lineTo(sd * 10, 96); c.closePath(); c.fill(); c.strokeStyle = '#1e1a2c'; c.lineWidth = 3; c.stroke(); });
    [-1, 1].forEach(sd => {
      const lift = ang ? -18 : Math.sin(t * 2 + sd) * 3;
      c.fillStyle = '#5a5675'; ellipse(c, sd * 70, 28 + lift, 20, 36); c.fill(); c.strokeStyle = '#1e1a2c'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#4a4660'; ellipse(c, sd * 72, 62 + lift, 22, 18); c.fill(); c.stroke();
      shard(c, sd * 76, 52 + lift, 16, 30, sd * .5, '#9af0ff', '#3a90d8');
    });
    c.beginPath(); c.moveTo(-50, 56); c.lineTo(-58, -6); c.lineTo(-34, -36); c.lineTo(34, -36); c.lineTo(58, -6); c.lineTo(50, 56); c.closePath();
    c.fillStyle = grad(c, 0, -36, 0, 56, [[0, '#7a7698'], [1, '#3e3a56']]); c.fill(); c.strokeStyle = '#1e1a2c'; c.lineWidth = 3.5; c.stroke();
    c.save(); c.globalAlpha = .5 + .4 * pulse; shard(c, 0, 40, 30, 70, 0, '#d8fcff', '#38b0f0'); c.restore();
    shard(c, -42, -30, 24, 56, -.35, '#c0f4ff', '#3a8ae0'); shard(c, 42, -30, 24, 56, .35, '#c0f4ff', '#3a8ae0'); shard(c, 0, -34, 26, 66, 0, '#e0fcff', '#4aa0ff');
    c.fillStyle = '#5a5675'; ellipse(c, 0, -22, 26, 22); c.fill(); c.strokeStyle = '#1e1a2c'; c.lineWidth = 3; c.stroke();
    [-1, 1].forEach(sd => glowEye(c, sd * 10, -24, 6, ang ? 4 : 6, ang ? '#ff6a4a' : '#6af0ff'));
    c.strokeStyle = '#1e1a2c'; c.lineWidth = 3; c.beginPath(); c.moveTo(-9, -10); c.lineTo(9, -10); c.stroke();
  };
  ART.crydragon = function (c, t, m) {   // クリスタルドラゴン（ボス）
    const ang = m === 'angry', fl = Math.sin(t * 2.2), pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 98, 86);
    const gl = c.createRadialGradient(0, 10, 10, 0, 10, 150); gl.addColorStop(0, 'rgba(120,220,255,' + (.28 * pulse) + ')'); gl.addColorStop(1, 'rgba(120,220,255,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .08);
      [[40, -10, 100, -86, 80], [38, 0, 108, -50, 84], [36, 12, 104, -8, 76], [34, 24, 90, 30, 60]].forEach(([x, y, tx, ty, w], i) => {
        c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.lineTo(tx - 12, ty + w * .4); c.lineTo(x + 6, y + 18); c.closePath();
        c.fillStyle = grad(c, x, y, tx, ty, [[0, '#8ad8ff'], [1, i % 2 ? '#6a7af0' : '#b08aff']]); c.fill(); c.strokeStyle = '#1e2a7a'; c.lineWidth = 3; c.stroke();
      });
      c.restore();
    });
    c.fillStyle = grad(c, 0, -10, 0, 96, [[0, '#7aa8f0'], [1, '#3a4aa8']]);
    c.beginPath(); c.moveTo(-34, 90); c.quadraticCurveTo(-52, 30, -30, -6); c.lineTo(30, -6); c.quadraticCurveTo(52, 30, 34, 90); c.quadraticCurveTo(0, 100, -34, 90); c.fill();
    c.strokeStyle = '#1e2a7a'; c.lineWidth = 4; c.stroke();
    c.fillStyle = grad(c, 0, 20, 0, 90, [[0, '#d8f4ff'], [1, '#8ac4f0']]); ellipse(c, 0, 52, 20, 36); c.fill();
    c.strokeStyle = 'rgba(30,42,122,.5)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-18, 30 + i * 12); c.quadraticCurveTo(0, 36 + i * 12, 18, 30 + i * 12); c.stroke(); }
    [-1, 1].forEach(sd => shard(c, sd * 22, 4, 16, 44, sd * .3, '#e0fcff', '#40b0ff'));
    [-1, 1].forEach(sd => { shard(c, sd * 30, -60, 20, 60, sd * .45, '#ffe8ff', '#a070ff'); });
    shard(c, 0, -64, 22, 44, 0, '#e8fcff', '#58c0ff');
    c.fillStyle = grad(c, 0, -76, 0, -6, [[0, '#a8c8ff'], [1, '#5a72d0']]);
    c.beginPath(); c.moveTo(-34, -46); c.quadraticCurveTo(-30, -78, 0, -76); c.quadraticCurveTo(30, -78, 34, -46); c.quadraticCurveTo(28, -8, 0, -4); c.quadraticCurveTo(-28, -8, -34, -46); c.fill();
    c.strokeStyle = '#1e2a7a'; c.lineWidth = 4; c.stroke();
    [-1, 1].forEach(sd => { glowEye(c, sd * 14, -44, 8, ang ? 5 : 8, ang ? '#ff5050' : '#fff070'); c.fillStyle = '#1a1030'; ellipse(c, sd * 14, -44, 2.5, 6); c.fill(); brow(c, sd * 14, -44, sd, ang, '#1e2a7a'); });
    c.fillStyle = '#1a1038'; ellipse(c, 0, -20, 14, ang ? 9 : 6); c.fill();
    c.fillStyle = '#fff'; [-9, -3, 3, 9].forEach(x => { c.beginPath(); c.moveTo(x - 2, -25); c.lineTo(x, -17); c.lineTo(x + 2, -25); c.fill(); });
  };

  // ---- ステージ 14: 雷鳴の山 ----
  ART.thunderbird = function (c, t, m) {   // サンダーバード
    const ang = m === 'angry', fl = Math.sin(t * 5), hover = Math.sin(t * 2.4) * 6;
    shadow(c, 96, 44);
    c.save(); c.translate(0, hover - 6);
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .2 - .1);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? '#ffe45a' : '#fff2a0'; c.beginPath(); c.moveTo(20, -14 + i * 7); c.quadraticCurveTo(70 + i * 6, -78 + i * 18, 108 - i * 6, -42 + i * 22); c.quadraticCurveTo(80, -20 + i * 14, 24, 2 + i * 7); c.closePath(); c.fill();
        c.strokeStyle = '#a07a10'; c.lineWidth = 2; c.stroke();
      }
      c.restore();
    });
    c.fillStyle = grad(c, 0, -30, 0, 60, [[0, '#6ab0ff'], [1, '#2a50c8']]); ellipse(c, 0, 18, 30, 44); c.fill(); c.strokeStyle = '#142468'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#d8ecff'; ellipse(c, 0, 28, 18, 28); c.fill();
    c.fillStyle = '#ffe45a'; c.beginPath(); c.moveTo(-8, 58); c.lineTo(-12, 82); c.lineTo(0, 66); c.lineTo(10, 84); c.lineTo(8, 58); c.fill();
    c.fillStyle = grad(c, 0, -62, 0, -4, [[0, '#8ac4ff'], [1, '#3a66d8']]); ellipse(c, 0, -30, 26, 26); c.fill(); c.strokeStyle = '#142468'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#ffe45a'; c.beginPath(); c.moveTo(-14, -52); c.lineTo(-6, -90); c.lineTo(0, -58); c.lineTo(8, -96); c.lineTo(12, -56); c.lineTo(24, -80); c.lineTo(20, -48); c.closePath(); c.fill(); c.strokeStyle = '#a07a10'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#ffb02a'; c.beginPath(); c.moveTo(-8, -24); c.lineTo(0, -4); c.lineTo(8, -24); c.closePath(); c.fill(); c.strokeStyle = '#8a5010'; c.lineWidth = 2; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 11, -34, 6, 7); c.fill(); c.fillStyle = '#1a1030'; ellipse(c, sd * 11, -33, 3, 5); c.fill(); brow(c, sd * 11, -34, sd, ang, '#142468'); });
    if (ang || Math.sin(t * 9) > .3) bolt(c, 70, -50 + fl * 4, 96, 10, '#fff6a0', 4);
    c.restore();
  };
  ART.raijuu = function (c, t, m) {   // ライジュウ（雷獣）
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3.4)) * 5;
    shadow(c, 94, 66);
    c.save(); c.translate(0, -b);
    // しっぽ
    c.strokeStyle = '#8ac8ff'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(40, 56); c.quadraticCurveTo(100, 50, 88, -4 + Math.sin(t * 4) * 6); c.stroke();
    bolt(c, 88, -4, 98, -40, '#fff6a0', 4);
    [-1, 1].forEach(sd => { c.fillStyle = '#e8f4ff'; ellipse(c, sd * 24, 92, 14, 8); c.fill(); c.strokeStyle = '#4a6a9a'; c.lineWidth = 2.5; c.stroke(); });
    c.fillStyle = grad(c, 0, 0, 0, 94, [[0, '#f4faff'], [1, '#9ac4f0']]); ellipse(c, 0, 52, 46, 44); c.fill(); c.strokeStyle = '#4a6a9a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#ffe45a'; c.beginPath(); c.moveTo(-18, 36); c.lineTo(6, 44); c.lineTo(-4, 56); c.lineTo(18, 64); c.lineTo(-10, 80); c.lineTo(-4, 62); c.lineTo(-20, 54); c.closePath(); c.fill();
    // 頭
    [-1, 1].forEach(sd => { c.fillStyle = '#b8dcff'; c.beginPath(); c.moveTo(sd * 24, -26); c.lineTo(sd * 46, -76); c.lineTo(sd * 52, -20); c.closePath(); c.fill(); c.strokeStyle = '#4a6a9a'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#ffd0e0'; c.beginPath(); c.moveTo(sd * 30, -26); c.lineTo(sd * 44, -60); c.lineTo(sd * 46, -26); c.fill(); });
    c.fillStyle = grad(c, 0, -52, 0, 14, [[0, '#f4faff'], [1, '#b0d4f8']]); ellipse(c, 0, -14, 46, 38); c.fill(); c.strokeStyle = '#4a6a9a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#ffe45a'; c.beginPath(); c.moveTo(-8, -52); c.lineTo(4, -34); c.lineTo(-2, -34); c.lineTo(8, -16); c.lineTo(-2, -28); c.lineTo(2, -28); c.closePath(); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 20, -12, 9, 11); c.fill(); glowEye(c, sd * 20, -11, 5, 7, ang ? '#ff5a5a' : '#ffd84a'); c.fillStyle = '#1a1030'; ellipse(c, sd * 20, -11, 2, 5); c.fill(); brow(c, sd * 20, -12, sd, ang, '#4a6a9a'); });
    c.fillStyle = '#3a2a50'; ellipse(c, 0, 4, 6, 4); c.fill();
    c.strokeStyle = '#3a2a50'; c.lineWidth = 2.8; c.beginPath(); if (ang) { c.arc(0, 18, 9, Math.PI * 1.1, Math.PI * 1.9); } else { c.arc(0, 4, 8, .2 * Math.PI, .8 * Math.PI); } c.stroke();
    if (ang) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-7, 12); c.lineTo(-4, 20); c.lineTo(-1, 12); c.moveTo(1, 12); c.lineTo(4, 20); c.lineTo(7, 12); c.fill(); }
    if (Math.sin(t * 8) > .2) { bolt(c, -62, -30, -78, 20, '#fff6a0', 3); bolt(c, 60, 10, 80, 56, '#fff6a0', 3); }
    c.restore();
  };
  ART.raijin = function (c, t, m) {   // ライジン（ボス）
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 5);
    shadow(c, 98, 80);
    const gl = c.createRadialGradient(0, 0, 20, 0, 0, 150); gl.addColorStop(0, 'rgba(255,240,120,' + (.3 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,240,120,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    // 太鼓の輪
    c.save(); c.rotate(t * .5);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.save(); c.translate(Math.cos(a) * 92, Math.sin(a) * 74); c.fillStyle = '#e8d0a0'; ellipse(c, 0, 0, 17, 17); c.fill(); c.strokeStyle = '#7a3a1a'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#d83a2a'; ellipse(c, 0, 0, 8, 8); c.fill(); c.restore(); }
    c.restore();
    [-1, 1].forEach(sd => { c.fillStyle = '#3a8a4a'; ellipse(c, sd * 26, 88, 20, 10); c.fill(); });
    c.fillStyle = grad(c, 0, -10, 0, 96, [[0, '#6ac86a'], [1, '#2a7a3a']]); ellipse(c, 0, 52, 44, 46); c.fill(); c.strokeStyle = '#143a1c'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#ffe45a'; c.beginPath(); c.moveTo(-40, 60); c.lineTo(40, 60); c.lineTo(36, 74); c.lineTo(-36, 74); c.fill();
    [-1, 1].forEach(sd => {
      const lift = ang ? -26 : Math.sin(t * 8 + sd) * 8;
      c.strokeStyle = '#4aa85a'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 36, 26); c.quadraticCurveTo(sd * 70, 24 + lift, sd * 76, 2 + lift); c.stroke();
      c.strokeStyle = '#8a5a2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(sd * 76, 2 + lift); c.lineTo(sd * 94, -22 + lift); c.stroke();
      c.fillStyle = '#e8d0a0'; ellipse(c, sd * 98, -26 + lift, 8, 8); c.fill();
    });
    // 顔
    c.fillStyle = grad(c, 0, -80, 0, 0, [[0, '#7ad87a'], [1, '#3a9a4a']]); ellipse(c, 0, -34, 40, 38); c.fill(); c.strokeStyle = '#143a1c'; c.lineWidth = 4; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff4c8'; c.beginPath(); c.moveTo(sd * 18, -66); c.lineTo(sd * 30, -104); c.lineTo(sd * 36, -60); c.closePath(); c.fill(); c.strokeStyle = '#8a6a1a'; c.lineWidth = 3; c.stroke(); });
    c.fillStyle = '#ffe45a'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 16 - 8, -68); c.lineTo(i * 16, -94 + Math.abs(i) * 6); c.lineTo(i * 16 + 8, -68); c.fill(); }
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 16, -38, 10, 8); c.fill(); glowEye(c, sd * 16, -38, 5, 5, '#ff4030'); brow(c, sd * 16, -38, sd, true, '#143a1c'); });
    c.fillStyle = '#2a0a10'; ellipse(c, 0, -12, 18, ang ? 12 : 8); c.fill();
    c.fillStyle = '#fff'; [-12, 12].forEach(x => { c.beginPath(); c.moveTo(x - 4, -18); c.lineTo(x, -6); c.lineTo(x + 4, -18); c.fill(); });
    if (Math.sin(t * 7) > 0) { bolt(c, -108, -60, -86, 20, '#fff6a0', 5); bolt(c, 108, -50, 90, 30, '#fff6a0', 5); }
  };

  // ---- ステージ 15: おかしの国 ----
  ART.gummy = function (c, t, m) {   // グミン
    const ang = m === 'angry', sq = Math.sin(t * 3.4) * .06, b = Math.abs(Math.sin(t * 3.4)) * 6;
    shadow(c, 94, 52);
    c.save(); c.translate(0, 94 - b); c.scale(1 + sq, 1 - sq); c.translate(0, -94);
    [-1, 1].forEach(sd => {
      c.fillStyle = 'rgba(255,90,120,.88)'; ellipse(c, sd * 24, 86, 15, 11); c.fill(); c.strokeStyle = 'rgba(150,20,50,.6)'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(255,90,120,.88)'; ellipse(c, sd * 50, 50 + (ang ? -14 : 0), 12, 17); c.fill(); c.stroke();
    });
    c.fillStyle = grad(c, 0, -10, 0, 96, [[0, 'rgba(255,130,150,.95)'], [1, 'rgba(230,50,90,.95)']]); ellipse(c, 0, 52, 40, 44); c.fill(); c.strokeStyle = 'rgba(150,20,50,.6)'; c.lineWidth = 3.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = 'rgba(255,90,120,.95)'; ellipse(c, sd * 28, -34, 15, 15); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,190,200,.7)'; ellipse(c, sd * 28, -34, 8, 8); c.fill(); });
    c.fillStyle = grad(c, 0, -58, 0, 14, [[0, 'rgba(255,140,160,.95)'], [1, 'rgba(235,60,100,.95)']]); ellipse(c, 0, -20, 38, 36); c.fill(); c.strokeStyle = 'rgba(150,20,50,.6)'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = 'rgba(255,215,225,.8)'; ellipse(c, 0, -8, 18, 13); c.fill();
    c.fillStyle = '#3a1020'; ellipse(c, 0, -12, 6, 4); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 15, -30, 8, 9); c.fill(); c.fillStyle = '#2a0a14'; ellipse(c, sd * 15, -29, 4, 6); c.fill(); brow(c, sd * 15, -30, sd, ang, '#5a1428'); });
    c.strokeStyle = '#3a1020'; c.lineWidth = 2.8; c.beginPath(); if (ang) c.arc(0, 4, 8, Math.PI * 1.1, Math.PI * 1.9); else c.arc(0, -4, 8, .2 * Math.PI, .8 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; ellipse(c, -22, 36, 8, 18); c.fill(); ellipse(c, -16, -40, 9, 5); c.fill();
    c.restore();
  };
  ART.cookie = function (c, t, m) {   // クッキーへい
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3)) * 5;
    shadow(c, 94, 56);
    c.save(); c.translate(0, -b);
    [-1, 1].forEach(sd => { c.fillStyle = '#e8c890'; ellipse(c, sd * 22, 90, 15, 10); c.fill(); c.strokeStyle = '#6a3a14'; c.lineWidth = 3; c.stroke(); });
    [-1, 1].forEach(sd => {
      const lift = ang && sd > 0 ? -34 : Math.sin(t * 3 + sd) * 4;
      c.strokeStyle = '#e8c890'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 40, 30); c.lineTo(sd * 66, 48 + lift); c.stroke();
    });
    // スプーンの剣
    const lf = ang ? -34 : Math.sin(t * 3 + 1) * 4;
    c.save(); c.translate(66, 48 + lf); c.rotate(-.3); c.fillStyle = '#d8dce8'; c.fillRect(-3, -52, 6, 40); c.beginPath(); c.moveTo(-3, -52); c.lineTo(0, -74); c.lineTo(3, -52); c.fill(); c.fillStyle = '#d8a82a'; c.fillRect(-12, -12, 24, 6); c.restore();
    c.fillStyle = grad(c, 0, -20, 0, 90, [[0, '#f0cc90'], [1, '#c8904a']]); ellipse(c, 0, 36, 46, 52); c.fill(); c.strokeStyle = '#6a3a14'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = 'rgba(106,58,20,.35)'; c.lineWidth = 3; c.setLineDash([6, 7]); ellipse(c, 0, 36, 38, 44); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#4a2410'; [[-22, 50, 6], [20, 56, 7], [-6, 72, 5], [26, 28, 5], [-30, 26, 5]].forEach(([x, y, r]) => { ellipse(c, x, y, r, r * .8); c.fill(); });
    // かぶと
    c.fillStyle = grad(c, 0, -60, 0, -10, [[0, '#e8ecf4'], [1, '#8a94ac']]); c.beginPath(); c.moveTo(-34, -6); c.quadraticCurveTo(-38, -60, 0, -62); c.quadraticCurveTo(38, -60, 34, -6); c.closePath(); c.fill(); c.strokeStyle = '#3a4054'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#e83a4a'; c.beginPath(); c.moveTo(-6, -60); c.quadraticCurveTo(0, -96, 12, -70); c.quadraticCurveTo(4, -66, 6, -60); c.fill();
    c.fillStyle = '#f0cc90'; ellipse(c, 0, 0, 34, 30); c.fill(); c.strokeStyle = '#6a3a14'; c.lineWidth = 3.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 13, -2, 7, 8); c.fill(); c.fillStyle = '#2a1408'; ellipse(c, sd * 13, -1, 3.5, 5.5); c.fill(); brow(c, sd * 13, -2, sd, ang, '#4a2410'); });
    c.strokeStyle = '#4a2410'; c.lineWidth = 3; c.beginPath(); if (ang) c.arc(0, 20, 8, Math.PI * 1.1, Math.PI * 1.9); else c.arc(0, 10, 8, .2 * Math.PI, .8 * Math.PI); c.stroke();
    c.restore();
  };
  ART.cakequeen = function (c, t, m) {   // ケーキクイーン（ボス）
    const ang = m === 'angry', sway = Math.sin(t * 1.8) * 2, pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 98, 84);
    const gl = c.createRadialGradient(0, 10, 20, 0, 10, 150); gl.addColorStop(0, 'rgba(255,170,210,' + (.3 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,170,210,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    c.save(); c.translate(sway, 0);
    // 下段
    c.fillStyle = grad(c, 0, 40, 0, 96, [[0, '#ffe0ec'], [1, '#f0a0c0']]); c.beginPath(); c.moveTo(-82, 48); c.lineTo(82, 48); c.lineTo(86, 90); c.quadraticCurveTo(0, 104, -86, 90); c.closePath(); c.fill(); c.strokeStyle = '#8a3a5a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#fff'; for (let i = -4; i <= 4; i++) { ellipse(c, i * 19, 48, 11, 10 + (i % 2 ? 6 : 2)); c.fill(); }
    [-60, -20, 20, 60].forEach((x, i) => { c.fillStyle = i % 2 ? '#e83a6a' : '#ffd24a'; ellipse(c, x, 76, 6, 6); c.fill(); });
    // 中段
    c.fillStyle = grad(c, 0, -10, 0, 48, [[0, '#fff0d8'], [1, '#e8b078']]); c.beginPath(); c.moveTo(-60, -6); c.lineTo(60, -6); c.lineTo(64, 46); c.lineTo(-64, 46); c.closePath(); c.fill(); c.strokeStyle = '#8a3a5a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#ff9ac0'; for (let i = -3; i <= 3; i++) { ellipse(c, i * 17, -6, 10, 8 + (i % 2 ? 7 : 3)); c.fill(); }
    // 顔
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 20, 14, 10, 12); c.fill(); c.fillStyle = '#2a1030'; ellipse(c, sd * 20, 16, 5, 8); c.fill(); c.fillStyle = '#fff'; ellipse(c, sd * 20 + 2, 12, 2, 2); c.fill(); brow(c, sd * 20, 14, sd, ang, '#6a1a40'); });
    c.fillStyle = '#c8284a'; ellipse(c, 0, 34, 10, ang ? 7 : 5); c.fill();
    c.fillStyle = 'rgba(255,120,150,.5)'; ellipse(c, -38, 28, 8, 5); c.fill(); ellipse(c, 38, 28, 8, 5); c.fill();
    // 上段
    c.fillStyle = grad(c, 0, -52, 0, -6, [[0, '#ffe0f0'], [1, '#ff9ac0']]); c.beginPath(); c.moveTo(-36, -52); c.lineTo(36, -52); c.lineTo(40, -6); c.lineTo(-40, -6); c.closePath(); c.fill(); c.strokeStyle = '#8a3a5a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { ellipse(c, i * 16, -52, 9, 8 + (i % 2 ? 6 : 2)); c.fill(); }
    // いちご
    c.fillStyle = '#e8283a'; c.beginPath(); c.moveTo(-14, -66); c.quadraticCurveTo(0, -48, 14, -66); c.quadraticCurveTo(0, -88, -14, -66); c.fill(); c.strokeStyle = '#7a1018'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#4ac84a'; c.beginPath(); c.moveTo(-8, -82); c.lineTo(0, -92); c.lineTo(8, -82); c.fill();
    // 王冠
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-26, -90); c.lineTo(-22, -108); c.lineTo(-10, -96); c.lineTo(0, -114); c.lineTo(10, -96); c.lineTo(22, -108); c.lineTo(26, -90); c.closePath(); c.fill(); c.strokeStyle = '#8a6a10'; c.lineWidth = 3; c.stroke();
    [[-22, -108], [0, -114], [22, -108]].forEach(([x, y]) => { c.fillStyle = '#e83a6a'; ellipse(c, x, y, 3.5, 3.5); c.fill(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#ffd24a'; ellipse(c, sd * 18, -52, 4, 4); c.fill(); });
    c.restore();
  };

  // ---- ステージ 16: 星の海 ----
  ART.alien = function (c, t, m) {   // エイリアン
    const ang = m === 'angry', b = Math.sin(t * 2.6) * 5;
    shadow(c, 94, 44);
    c.save(); c.translate(0, -b);
    // 触角
    [-1, 1].forEach(sd => { const sw = Math.sin(t * 3 + sd) * 6; c.strokeStyle = '#4aa86a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 18, -64); c.quadraticCurveTo(sd * 40, -90, sd * (46 + sw), -100); c.stroke(); c.save(); c.fillStyle = '#ff6ad8'; c.shadowColor = '#ff6ad8'; c.shadowBlur = 10; ellipse(c, sd * (46 + sw), -102, 7, 7); c.fill(); c.restore(); });
    // からだ
    c.fillStyle = '#5a6ac8'; c.beginPath(); c.moveTo(-26, 30); c.lineTo(26, 30); c.lineTo(32, 88); c.lineTo(-32, 88); c.closePath(); c.fill(); c.strokeStyle = '#1e2468'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#8ad8ff'; ellipse(c, 0, 58, 10, 10); c.fill();
    [-1, 1].forEach(sd => { c.strokeStyle = '#6ac888'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 26, 40); c.quadraticCurveTo(sd * 54, 52, sd * (60 + (ang ? 6 : 0)), ang ? 18 : 62); c.stroke(); c.fillStyle = '#6ac888'; ellipse(c, sd * 62, ang ? 14 : 66, 7, 7); c.fill(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#6ac888'; ellipse(c, sd * 16, 92, 14, 7); c.fill(); });
    // 頭
    c.fillStyle = grad(c, 0, -76, 0, 34, [[0, '#9af0b0'], [1, '#4ab87a']]); c.beginPath(); c.moveTo(0, 36); c.quadraticCurveTo(-44, 20, -52, -22); c.quadraticCurveTo(-50, -80, 0, -80); c.quadraticCurveTo(50, -80, 52, -22); c.quadraticCurveTo(44, 20, 0, 36); c.fill(); c.strokeStyle = '#1e5a3a'; c.lineWidth = 4; c.stroke();
    [-1, 1].forEach(sd => { c.save(); c.translate(sd * 22, -22); c.rotate(sd * (ang ? .5 : .3)); c.fillStyle = '#10101e'; ellipse(c, 0, 0, 16, 24); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; ellipse(c, -4, -9, 4.5, 6); c.fill(); c.fillStyle = ang ? '#ff5a8a' : '#6af0ff'; ellipse(c, 3, 8, 3, 4); c.fill(); c.restore(); });
    c.fillStyle = '#1e5a3a'; ellipse(c, -4, 12, 1.8, 2.5); c.fill(); ellipse(c, 4, 12, 1.8, 2.5); c.fill();
    c.strokeStyle = '#1e5a3a'; c.lineWidth = 2.6; c.beginPath(); if (ang) c.arc(0, 28, 8, Math.PI * 1.15, Math.PI * 1.85); else c.arc(0, 16, 8, .2 * Math.PI, .8 * Math.PI); c.stroke();
    c.restore();
  };
  ART.ufo = function (c, t, m) {   // UFO
    const ang = m === 'angry', hover = Math.sin(t * 2.2) * 6, pulse = .6 + .4 * Math.sin(t * 4);
    c.fillStyle = 'rgba(0,0,0,.2)'; ellipse(c, 0, 96, 50 + hover, 8); c.fill();
    c.save(); c.translate(0, hover - 10);
    // ビーム
    const bm = c.createLinearGradient(0, 30, 0, 100); bm.addColorStop(0, 'rgba(160,255,200,' + (ang ? .6 : .38) * pulse + ')'); bm.addColorStop(1, 'rgba(160,255,200,0)');
    c.fillStyle = bm; c.beginPath(); c.moveTo(-30, 30); c.lineTo(30, 30); c.lineTo(ang ? 78 : 60, 108); c.lineTo(ang ? -78 : -60, 108); c.fill();
    // ドーム
    c.fillStyle = grad(c, 0, -62, 0, -4, [[0, 'rgba(190,240,255,.95)'], [1, 'rgba(100,170,230,.8)']]); c.beginPath(); c.moveTo(-40, -2); c.quadraticCurveTo(-40, -70, 0, -70); c.quadraticCurveTo(40, -70, 40, -2); c.closePath(); c.fill(); c.strokeStyle = '#2a4a8a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; ellipse(c, -16, -44, 8, 14); c.fill();
    // 中のこ
    c.fillStyle = '#6ac888'; ellipse(c, 0, -22, 15, 18); c.fill(); c.strokeStyle = '#1e5a3a'; c.lineWidth = 2.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#10101e'; ellipse(c, sd * 6, -24, 4.5, 7); c.fill(); });
    // 円盤
    c.fillStyle = grad(c, 0, -10, 0, 34, [[0, '#d8dcec'], [.5, '#8a92b0'], [1, '#4a5070']]); ellipse(c, 0, 12, 100, 28); c.fill(); c.strokeStyle = '#1e2444'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#5a6288'; ellipse(c, 0, 18, 70, 16); c.fill();
    for (let i = 0; i < 7; i++) { const x = -78 + i * 26, on = Math.floor(t * 4 + i) % 3 === 0; c.save(); c.fillStyle = on ? '#fff070' : '#ffb02a'; if (on) { c.shadowColor = '#ffe45a'; c.shadowBlur = 12; } ellipse(c, x, 14 + (1 - Math.pow((x / 80), 2)) * 6, 5.5, 5.5); c.fill(); c.restore(); }
    c.restore();
  };
  ART.blackhole = function (c, t, m) {   // ブラックホール（ボス）
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 100, 84);
    const gl = c.createRadialGradient(0, 0, 10, 0, 0, 150); gl.addColorStop(0, 'rgba(180,90,255,' + (.4 * pulse) + ')'); gl.addColorStop(1, 'rgba(180,90,255,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    c.save(); c.translate(0, -4);
    // 降着円盤
    for (let k = 0; k < 3; k++) {
      c.save(); c.rotate(-.22 + k * .02); c.scale(1, .3);
      const r = 104 - k * 10, g = c.createRadialGradient(0, 0, r * .5, 0, 0, r); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.7, ['rgba(255,160,60,.75)', 'rgba(255,90,200,.6)', 'rgba(150,100,255,.5)'][k]); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.restore();
    }
    // 渦
    c.save(); c.rotate(t * .8);
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.strokeStyle = 'rgba(190,130,255,' + (.55 - i * .04) + ')'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(34, 0); c.quadraticCurveTo(70, 18, 84, 62); c.stroke(); }
    c.restore();
    // 本体
    const body = c.createRadialGradient(-8, -10, 8, 0, 0, 62); body.addColorStop(0, '#2a1850'); body.addColorStop(.7, '#0a0618'); body.addColorStop(1, '#000');
    c.fillStyle = body; ellipse(c, 0, 0, 62, 62); c.fill(); c.strokeStyle = '#b070ff'; c.lineWidth = 4; c.save(); c.shadowColor = '#b070ff'; c.shadowBlur = 14; c.stroke(); c.restore();
    // 目
    c.save(); c.fillStyle = '#fff'; c.shadowColor = ang ? '#ff4060' : '#d8a0ff'; c.shadowBlur = 14;
    [-1, 1].forEach(sd => { c.save(); c.translate(sd * 22, -8); c.rotate(sd * (ang ? .5 : .25)); c.fillStyle = ang ? '#ff7a8a' : '#f0d8ff'; ellipse(c, 0, 0, 12, 17); c.fill(); c.restore(); });
    c.restore();
    [-1, 1].forEach(sd => { c.fillStyle = '#10061e'; ellipse(c, sd * 22, -6, 4, 9); c.fill(); });
    c.fillStyle = '#d8a0ff'; ellipse(c, 0, 26, 18, ang ? 11 : 7); c.fill(); c.fillStyle = '#10061e'; ellipse(c, 0, 26, 14, ang ? 8 : 4); c.fill();
    // 星のかけら
    for (let i = 0; i < 9; i++) { const a = t * .9 + i * .7, r = 70 + (i % 3) * 14; c.fillStyle = i % 2 ? '#fff6a0' : '#a0e8ff'; ellipse(c, Math.cos(a) * r, Math.sin(a) * r * .55, 2.6, 2.6); c.fill(); }
    c.restore();
  };

  // ---- ステージ 17: 竜王の城 ----
  ART.wyvern = function (c, t, m) {   // ワイバーン
    const ang = m === 'angry', fl = Math.sin(t * 5), hover = Math.sin(t * 2.4) * 5;
    shadow(c, 96, 46);
    c.save(); c.translate(0, hover - 4);
    // しっぽ
    c.strokeStyle = '#3a7a6a'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, 56); c.quadraticCurveTo(70, 90, 94, 54 + Math.sin(t * 3) * 6); c.stroke();
    c.fillStyle = '#d83a4a'; c.beginPath(); c.moveTo(94, 54 + Math.sin(t * 3) * 6); c.lineTo(108, 36); c.lineTo(112, 62); c.closePath(); c.fill();
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .2);
      c.beginPath(); c.moveTo(22, -12); c.lineTo(52, -68); c.lineTo(74, -34); c.lineTo(96, -52); c.lineTo(90, -8); c.lineTo(70, 12); c.lineTo(52, 2); c.lineTo(34, 24); c.closePath();
      c.fillStyle = grad(c, 20, -68, 96, 20, [[0, '#d85a5a'], [1, '#8a1e3a']]); c.fill(); c.strokeStyle = '#4a0e22'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = '#4a0e22'; c.lineWidth = 3; [[52, -68], [74, -34], [90, -8]].forEach(([x, y]) => { c.beginPath(); c.moveTo(24, -10); c.lineTo(x, y); c.stroke(); });
      c.restore();
    });
    [-1, 1].forEach(sd => { c.fillStyle = '#3a7a6a'; ellipse(c, sd * 18, 76, 11, 7); c.fill(); c.fillStyle = '#ffe0a0'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sd * 18 + i * 6 - 2, 80); c.lineTo(sd * 18 + i * 6, 90); c.lineTo(sd * 18 + i * 6 + 2, 80); c.fill(); } });
    c.fillStyle = grad(c, 0, -10, 0, 80, [[0, '#6ac8a8'], [1, '#2a6a58']]); ellipse(c, 0, 36, 32, 46); c.fill(); c.strokeStyle = '#123a30'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#f8e4b0'; ellipse(c, 0, 44, 18, 32); c.fill(); c.strokeStyle = 'rgba(138,90,30,.5)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-16, 26 + i * 12); c.quadraticCurveTo(0, 32 + i * 12, 16, 26 + i * 12); c.stroke(); }
    // 頭
    [-1, 1].forEach(sd => { c.fillStyle = '#ffe0a0'; c.beginPath(); c.moveTo(sd * 14, -46); c.quadraticCurveTo(sd * 36, -64, sd * 32, -92); c.lineTo(sd * 24, -46); c.fill(); c.strokeStyle = '#8a5a1e'; c.lineWidth = 2.5; c.stroke(); });
    c.fillStyle = grad(c, 0, -60, 0, -4, [[0, '#7ad8b8'], [1, '#3a8a70']]); c.beginPath(); c.moveTo(-30, -36); c.quadraticCurveTo(-30, -66, 0, -66); c.quadraticCurveTo(30, -66, 30, -36); c.quadraticCurveTo(26, -6, 0, -2); c.quadraticCurveTo(-26, -6, -30, -36); c.fill(); c.strokeStyle = '#123a30'; c.lineWidth = 3.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 13, -36, 8, 9); c.fill(); c.fillStyle = ang ? '#ff5050' : '#ffc02a'; ellipse(c, sd * 13, -35, 4.5, 6); c.fill(); c.fillStyle = '#1a1030'; ellipse(c, sd * 13, -35, 1.8, 5); c.fill(); brow(c, sd * 13, -36, sd, ang, '#123a30'); });
    c.fillStyle = '#123a30'; ellipse(c, -5, -18, 1.8, 2.5); c.fill(); ellipse(c, 5, -18, 1.8, 2.5); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-12, -10); c.lineTo(-9, -2); c.lineTo(-6, -10); c.moveTo(6, -10); c.lineTo(9, -2); c.lineTo(12, -10); c.fill();
    if (ang) { const fb = c.createRadialGradient(0, 14, 2, 0, 24, 30); fb.addColorStop(0, 'rgba(255,240,120,.95)'); fb.addColorStop(1, 'rgba(255,90,30,0)'); c.fillStyle = fb; ellipse(c, 0, 20, 22, 24); c.fill(); }
    c.restore();
  };
  ART.dragonknight = function (c, t, m) {   // ドラゴンナイト
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 2.8)) * 4;
    shadow(c, 94, 60);
    c.save(); c.translate(0, -b);
    // マント
    c.fillStyle = grad(c, 0, -10, 0, 96, [[0, '#a02a3a'], [1, '#5a1020']]); c.beginPath(); c.moveTo(-34, -6); c.lineTo(34, -6); c.lineTo(60, 92); c.quadraticCurveTo(0, 100, -60, 92); c.closePath(); c.fill(); c.strokeStyle = '#2a0610'; c.lineWidth = 3.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#5a6288'; ellipse(c, sd * 18, 90, 16, 9); c.fill(); c.strokeStyle = '#1e2444'; c.lineWidth = 3; c.stroke(); });
    // よろい
    c.fillStyle = grad(c, -36, 0, 36, 0, [[0, '#7a84a8'], [.5, '#c8d0e8'], [1, '#6a7498']]); c.beginPath(); c.moveTo(-36, -8); c.lineTo(36, -8); c.lineTo(30, 58); c.lineTo(-30, 58); c.closePath(); c.fill(); c.strokeStyle = '#1e2444'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#d8a82a'; c.beginPath(); c.moveTo(0, 6); c.lineTo(12, 20); c.lineTo(0, 44); c.lineTo(-12, 20); c.closePath(); c.fill(); c.strokeStyle = '#6a4a0a'; c.lineWidth = 2.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#8a94b8'; ellipse(c, sd * 42, -6, 17, 14); c.fill(); c.strokeStyle = '#1e2444'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#d8a82a'; c.beginPath(); c.moveTo(sd * 36, -16); c.lineTo(sd * 42, -32); c.lineTo(sd * 48, -16); c.fill(); });
    // 剣
    const lift = ang ? -22 : Math.sin(t * 3) * 3;
    c.strokeStyle = '#6a74a0'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(42, 4); c.lineTo(66, 34 + lift); c.stroke();
    c.save(); c.translate(68, 32 + lift); c.rotate(.15);
    c.fillStyle = grad(c, -5, -90, 5, 0, [[0, '#fff'], [1, '#9aa6c8']]); c.beginPath(); c.moveTo(-6, 0); c.lineTo(-6, -78); c.lineTo(0, -98); c.lineTo(6, -78); c.lineTo(6, 0); c.closePath(); c.fill(); c.strokeStyle = '#2a3258'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#d8a82a'; c.fillRect(-16, 0, 32, 7); c.fillRect(-4, 7, 8, 16); c.restore();
    c.strokeStyle = '#6a74a0'; c.lineWidth = 12; c.beginPath(); c.moveTo(-42, 4); c.lineTo(-58, 40); c.stroke();
    // かぶと（竜）
    c.fillStyle = grad(c, 0, -76, 0, -10, [[0, '#c8d0e8'], [1, '#6a7498']]); c.beginPath(); c.moveTo(-30, -14); c.quadraticCurveTo(-34, -64, 0, -66); c.quadraticCurveTo(34, -64, 30, -14); c.quadraticCurveTo(0, -4, -30, -14); c.fill(); c.strokeStyle = '#1e2444'; c.lineWidth = 3.5; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#e8d0a0'; c.beginPath(); c.moveTo(sd * 22, -50); c.quadraticCurveTo(sd * 52, -60, sd * 54, -92); c.quadraticCurveTo(sd * 40, -70, sd * 14, -62); c.fill(); c.strokeStyle = '#6a4a1e'; c.lineWidth = 2.5; c.stroke(); });
    c.fillStyle = '#d83a4a'; c.beginPath(); c.moveTo(-4, -64); c.quadraticCurveTo(0, -92, 8, -82); c.quadraticCurveTo(2, -74, 4, -64); c.fill();
    c.fillStyle = '#10101e'; c.beginPath(); c.moveTo(-22, -36); c.lineTo(22, -36); c.lineTo(18, -22); c.lineTo(-18, -22); c.closePath(); c.fill();
    [-1, 1].forEach(sd => glowEye(c, sd * 10, -29, 5, 3.5, ang ? '#ff4a4a' : '#ffd84a'));
    c.restore();
  };
  ART.ancientdragon = function (c, t, m) {   // エンシェントドラゴン（ボス）
    const ang = m === 'angry', fl = Math.sin(t * 1.8), pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 98, 88);
    const gl = c.createRadialGradient(0, 0, 20, 0, 0, 160); gl.addColorStop(0, 'rgba(255,90,40,' + (.3 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,90,40,0)'); c.fillStyle = gl; c.fillRect(-170, -150, 340, 320);
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .06);
      c.beginPath(); c.moveTo(34, 0); c.lineTo(66, -76); c.lineTo(84, -40); c.lineTo(104, -84); c.lineTo(108, -30); c.lineTo(100, 24); c.lineTo(80, 8); c.lineTo(66, 40); c.lineTo(48, 18); c.lineTo(36, 44); c.closePath();
      c.fillStyle = grad(c, 34, -84, 108, 40, [[0, '#a83a58'], [1, '#3a0e2a']]); c.fill(); c.strokeStyle = '#1a0614'; c.lineWidth = 3.5; c.stroke();
      c.strokeStyle = '#1a0614'; c.lineWidth = 3; [[66, -76], [104, -84], [100, 24], [66, 40]].forEach(([x, y]) => { c.beginPath(); c.moveTo(36, 4); c.lineTo(x, y); c.stroke(); });
      c.restore();
    });
    c.fillStyle = grad(c, 0, -10, 0, 96, [[0, '#8a2a48'], [1, '#3a0e2a']]); c.beginPath(); c.moveTo(-34, 92); c.quadraticCurveTo(-54, 30, -30, -8); c.lineTo(30, -8); c.quadraticCurveTo(54, 30, 34, 92); c.quadraticCurveTo(0, 102, -34, 92); c.fill(); c.strokeStyle = '#1a0614'; c.lineWidth = 4; c.stroke();
    c.fillStyle = grad(c, 0, 10, 0, 92, [[0, '#ffd890'], [1, '#d8884a']]); ellipse(c, 0, 52, 20, 38); c.fill(); c.strokeStyle = 'rgba(106,50,20,.5)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-18, 28 + i * 11); c.quadraticCurveTo(0, 34 + i * 11, 18, 28 + i * 11); c.stroke(); }
    // 角
    [-1, 1].forEach(sd => { c.fillStyle = grad(c, sd * 20, -50, sd * 60, -112, [[0, '#f0e4c8'], [1, '#a8884a']]); c.beginPath(); c.moveTo(sd * 18, -52); c.quadraticCurveTo(sd * 62, -58, sd * 66, -108); c.quadraticCurveTo(sd * 44, -78, sd * 8, -70); c.fill(); c.strokeStyle = '#4a3010'; c.lineWidth = 3; c.stroke(); });
    c.fillStyle = grad(c, 0, -80, 0, -6, [[0, '#b04868'], [1, '#5a1a3a']]); c.beginPath(); c.moveTo(-38, -46); c.quadraticCurveTo(-34, -82, 0, -80); c.quadraticCurveTo(34, -82, 38, -46); c.quadraticCurveTo(32, -6, 0, -2); c.quadraticCurveTo(-32, -6, -38, -46); c.fill(); c.strokeStyle = '#1a0614'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#f0e4c8'; [-1, 0, 1].forEach(i => { c.beginPath(); c.moveTo(i * 12 - 5, -76); c.lineTo(i * 12, -92); c.lineTo(i * 12 + 5, -76); c.fill(); });
    [-1, 1].forEach(sd => { glowEye(c, sd * 17, -46, 10, ang ? 6 : 9, ang ? '#ff3030' : '#ffc02a'); c.fillStyle = '#1a0614'; ellipse(c, sd * 17, -46, 2.5, 8); c.fill(); brow(c, sd * 17, -46, sd, true, '#1a0614'); });
    c.fillStyle = '#1a0614'; ellipse(c, -6, -26, 2.5, 3.5); c.fill(); ellipse(c, 6, -26, 2.5, 3.5); c.fill();
    c.fillStyle = '#2a0610'; ellipse(c, 0, -12, 20, ang ? 11 : 6); c.fill();
    c.fillStyle = '#fff'; [-14, -7, 7, 14].forEach(x => { c.beginPath(); c.moveTo(x - 2.5, -17); c.lineTo(x, -7); c.lineTo(x + 2.5, -17); c.fill(); });
    if (ang) { const fb = c.createRadialGradient(0, -6, 2, 0, 10, 46); fb.addColorStop(0, 'rgba(255,240,140,.95)'); fb.addColorStop(.5, 'rgba(255,120,30,.6)'); fb.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = fb; ellipse(c, 0, 8, 36, 40); c.fill(); }
  };
  // ================= ステージ 18〜22 の敵 =================
  const eyes2 = (c, y, sd0, rx, ry, iris, ang, brc) => {
    [-1, 1].forEach(sd => {
      c.fillStyle = '#fff'; ellipse(c, sd * sd0, y, rx, ry); c.fill();
      c.fillStyle = iris; ellipse(c, sd * sd0 + 1, y + 1, rx * .55, ry * .72); c.fill();
      c.fillStyle = '#1a1030'; ellipse(c, sd * sd0 + 1, y + 1, rx * .25, ry * .5); c.fill();
      if (brc) brow(c, sd * sd0, y, sd, ang, brc);
    });
  };

  // ---- ステージ 18: ふしぎな遊園地 ----
  ART.clown = function (c, t, m) {   // ピエロ
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3)) * 5;
    shadow(c, 94, 50);
    c.save(); c.translate(0, -b);
    // 大きな靴
    [-1, 1].forEach(sd => { c.fillStyle = '#e8403a'; ellipse(c, sd * 26, 90, 24, 10); c.fill(); c.strokeStyle = '#6a1410'; c.lineWidth = 3; c.stroke(); });
    // 服
    c.fillStyle = grad(c, -40, 0, 40, 0, [[0, '#ff5a8a'], [.5, '#ffd24a'], [1, '#4ac8ff']]);
    c.beginPath(); c.moveTo(-30, 14); c.lineTo(30, 14); c.lineTo(46, 88); c.lineTo(-46, 88); c.closePath(); c.fill(); c.strokeStyle = '#3a1a4a'; c.lineWidth = 3.5; c.stroke();
    [-14, 0, 14].forEach((x, i) => { c.fillStyle = ['#4ac8ff', '#ff5a8a', '#ffd24a'][i]; ellipse(c, x, 40 + i % 2 * 14, 7, 7); c.fill(); });
    // ひだえり
    c.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { ellipse(c, i * 10, 14, 8, 9); c.fill(); }
    // うで（ボール）
    [-1, 1].forEach(sd => {
      const lift = ang ? -20 : Math.sin(t * 3 + sd) * 4;
      c.strokeStyle = '#ffd24a'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 30, 28); c.lineTo(sd * 62, 40 + lift); c.stroke();
      c.fillStyle = '#fff'; ellipse(c, sd * 66, 42 + lift, 9, 9); c.fill();
    });
    const by = ang ? -52 : -46 + Math.sin(t * 4) * 6; c.fillStyle = grad(c, 0, by - 14, 0, by + 14, [[0, '#ff8a8a'], [1, '#d82a3a']]); ellipse(c, 70, by, 14, 14); c.fill(); c.strokeStyle = '#6a1018'; c.lineWidth = 2.5; c.stroke();
    // かお
    [-1, 1].forEach(sd => { c.fillStyle = '#ff5a8a'; ellipse(c, sd * 40, -22, 16, 16); c.fill(); });
    c.fillStyle = '#fff'; ellipse(c, 0, -22, 34, 34); c.fill(); c.strokeStyle = '#3a1a4a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#4ac8ff'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 14, -34); c.lineTo(sd * 26, -44); c.lineTo(sd * 24, -26); c.closePath(); c.fill(); });
    eyes2(c, -26, 12, 7, 8, '#3a7aff', ang, '#3a1a4a');
    c.fillStyle = '#ff3a4a'; ellipse(c, 0, -14, 9, 9); c.fill(); c.strokeStyle = '#6a1018'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#d82a3a'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); if (ang) { c.arc(0, 6, 14, Math.PI * 1.1, Math.PI * 1.9); } else { c.arc(0, -8, 16, .15 * Math.PI, .85 * Math.PI); } c.stroke();
    // ぼうし
    c.fillStyle = '#7a4ae8'; c.beginPath(); c.moveTo(-26, -48); c.lineTo(0, -102); c.lineTo(26, -48); c.quadraticCurveTo(0, -40, -26, -48); c.fill(); c.strokeStyle = '#2a1a5a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#ffd24a'; ellipse(c, 0, -104, 8, 8); c.fill();
    c.restore();
  };
  ART.doll = function (c, t, m) {   // にんぎょう
    const ang = m === 'angry', sw = Math.sin(t * 2.4) * 4;
    shadow(c, 94, 48);
    c.save(); c.translate(sw * .5, 0);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; [[-24, -100, -24, -48], [24, -100, 24, -48]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(x, y); c.stroke(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#e8d8c8'; ellipse(c, sd * 18, 90, 12, 8); c.fill(); c.strokeStyle = '#6a4a3a'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#7a1a2a'; c.fillRect(sd * 18 - 8, 62, 16, 26); });
    c.fillStyle = grad(c, 0, 20, 0, 82, [[0, '#d83a6a'], [1, '#7a1a3a']]); c.beginPath(); c.moveTo(-24, 20); c.lineTo(24, 20); c.lineTo(52, 74); c.quadraticCurveTo(0, 86, -52, 74); c.closePath(); c.fill(); c.strokeStyle = '#3a0a1a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { ellipse(c, i * 14, 76, 7, 5); c.fill(); }
    c.fillStyle = '#ffe4c8'; [-1, 1].forEach(sd => { const lf = ang ? -18 : Math.sin(t * 3 + sd) * 4; c.strokeStyle = '#ffe4c8'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 22, 28); c.lineTo(sd * 46, 46 + lf); c.stroke(); });
    // 頭
    [-1, 1].forEach(sd => { c.fillStyle = '#2a1410'; ellipse(c, sd * 34, -10, 14, 36); c.fill(); });
    c.fillStyle = '#2a1410'; ellipse(c, 0, -30, 40, 36); c.fill();
    c.fillStyle = grad(c, 0, -62, 0, 20, [[0, '#fff0e0'], [1, '#f0d4b8']]); ellipse(c, 0, -22, 32, 38); c.fill(); c.strokeStyle = '#6a4a3a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#2a1410'; c.beginPath(); c.moveTo(-32, -34); c.quadraticCurveTo(0, -78, 32, -34); c.quadraticCurveTo(0, -52, -32, -34); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 13, -22, 9, 11); c.fill(); c.fillStyle = ang ? '#e82a2a' : '#4a2a1a'; ellipse(c, sd * 13, -21, 6, 8); c.fill(); c.fillStyle = '#10080a'; ellipse(c, sd * 13, -21, 3, 5); c.fill(); c.fillStyle = '#fff'; ellipse(c, sd * 13 + 2, -24, 1.8, 1.8); c.fill(); brow(c, sd * 13, -26, sd, ang, '#2a1410'); });
    c.strokeStyle = '#8a8a8a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-12, 2); c.lineTo(-12, 12); c.moveTo(12, 2); c.lineTo(12, 12); c.stroke();
    c.fillStyle = '#c8284a'; ellipse(c, 0, -2, 7, ang ? 6 : 3.5); c.fill();
    c.fillStyle = 'rgba(255,120,150,.5)'; ellipse(c, -22, -8, 6, 4); c.fill(); ellipse(c, 22, -8, 6, 4); c.fill();
    c.restore();
  };
  ART.ringmaster = function (c, t, m) {   // カーニバルマスター（ボス）
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 98, 80);
    const gl = c.createRadialGradient(0, 0, 20, 0, 0, 150); gl.addColorStop(0, 'rgba(255,120,200,' + (.3 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,120,200,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    // 回るリング
    c.save(); c.translate(0, 10); c.rotate(t * .8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.fillStyle = i % 2 ? '#ffd24a' : '#ff5a8a'; ellipse(c, Math.cos(a) * 92, Math.sin(a) * 92 * .7, 8, 8); c.fill(); }
    c.restore();
    [-1, 1].forEach(sd => { c.fillStyle = '#1a1030'; ellipse(c, sd * 20, 92, 20, 9); c.fill(); });
    c.fillStyle = grad(c, 0, -10, 0, 96, [[0, '#d82a4a'], [1, '#7a1028']]); c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, 0); c.lineTo(56, 90); c.lineTo(-56, 90); c.closePath(); c.fill(); c.strokeStyle = '#2a0610'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-14, 2); c.lineTo(14, 2); c.lineTo(8, 54); c.lineTo(-8, 54); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a'; [16, 32, 48].forEach(y => { ellipse(c, 0, y, 4, 4); c.fill(); ellipse(c, -30, y + 10, 4, 4); c.fill(); ellipse(c, 30, y + 10, 4, 4); c.fill(); });
    c.fillStyle = '#ff3a6a'; c.beginPath(); c.moveTo(0, 4); c.lineTo(-14, -6); c.lineTo(-14, 14); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, 4); c.lineTo(14, -6); c.lineTo(14, 14); c.closePath(); c.fill();
    // うで＋ステッキ
    [-1, 1].forEach(sd => { const lf = ang ? -26 : Math.sin(t * 3 + sd) * 5; c.strokeStyle = '#d82a4a'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 38, 14); c.lineTo(sd * 72, 36 + lf); c.stroke(); c.fillStyle = '#fff'; ellipse(c, sd * 76, 38 + lf, 10, 10); c.fill(); });
    c.save(); c.translate(80, 34 + (ang ? -26 : Math.sin(t * 3 + 1) * 5)); c.rotate(.5); c.fillStyle = '#2a1a4a'; c.fillRect(-3, -66, 6, 70); c.fillStyle = '#ffd24a'; c.save(); c.shadowColor = '#ffd24a'; c.shadowBlur = 10; ellipse(c, 0, -72, 11, 11); c.fill(); c.restore(); c.restore();
    // かお
    c.fillStyle = grad(c, 0, -70, 0, 0, [[0, '#fff0e0'], [1, '#f0c8a0']]); ellipse(c, 0, -34, 30, 34); c.fill(); c.strokeStyle = '#4a2a1a'; c.lineWidth = 3.5; c.stroke();
    eyes2(c, -38, 12, 8, 8, '#d8282a', true, '#2a1410');
    c.strokeStyle = '#2a1410'; c.lineWidth = 4; c.lineCap = 'round'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 6, -18); c.quadraticCurveTo(sd * 24, -14, sd * 30, -24 - (ang ? 4 : 0)); c.stroke(); });
    c.fillStyle = '#6a1a2a'; ellipse(c, 0, -10, 12, ang ? 8 : 5); c.fill(); c.fillStyle = '#fff'; c.fillRect(-9, -15, 18, 3);
    // シルクハット
    c.fillStyle = '#1a1030'; c.beginPath(); c.moveTo(-42, -60); c.quadraticCurveTo(0, -50, 42, -60); c.lineTo(44, -66); c.quadraticCurveTo(0, -78, -44, -66); c.closePath(); c.fill(); c.fillRect(-26, -112, 52, 50); c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeRect(-26, -112, 52, 50);
    c.fillStyle = '#d82a4a'; c.fillRect(-26, -78, 52, 10); c.fillStyle = '#ffd24a'; ellipse(c, 0, -73, 6, 6); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(0, -112); c.lineTo(5, -122); c.lineTo(10, -112); c.lineTo(0, -108); c.fill();
  };

  // ---- ステージ 19: 嵐の海賊船 ----
  ART.pirate = function (c, t, m) {   // かいぞく
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 2.8)) * 4;
    shadow(c, 94, 56);
    c.save(); c.translate(0, -b);
    [-1, 1].forEach(sd => { c.fillStyle = '#4a2a14'; c.fillRect(sd * 22 - 12, 66, 24, 24); ellipse(c, sd * 22, 92, 16, 8); c.fill(); });
    c.fillStyle = grad(c, 0, 0, 0, 74, [[0, '#e8e0d0'], [1, '#b8a888']]); c.beginPath(); c.moveTo(-36, 6); c.lineTo(36, 6); c.lineTo(42, 70); c.lineTo(-42, 70); c.closePath(); c.fill(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#1a2a6a'; for (let i = 0; i < 4; i++) c.fillRect(-36 + i * 2, 18 + i * 12, 72 - i * 4, 6);
    c.fillStyle = '#8a2a1a'; c.fillRect(-42, 56, 84, 10); c.fillStyle = '#ffd24a'; c.fillRect(-8, 54, 16, 14);
    // うで・かぎ爪
    const lf = ang ? -26 : Math.sin(t * 3) * 4;
    c.strokeStyle = '#e8e0d0'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(-34, 16); c.lineTo(-58, 42); c.stroke();
    c.fillStyle = '#e8c8a0'; ellipse(c, -60, 46, 9, 9); c.fill();
    c.strokeStyle = '#e8e0d0'; c.beginPath(); c.moveTo(34, 16); c.lineTo(58, 36 + lf); c.stroke();
    c.strokeStyle = '#c8d0e0'; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 38 + lf); c.quadraticCurveTo(84, 30 + lf, 78, 8 + lf); c.quadraticCurveTo(72, 20 + lf, 62, 26 + lf); c.stroke();
    // かお
    c.fillStyle = '#e8b890'; ellipse(c, 0, -22, 30, 32); c.fill(); c.strokeStyle = '#4a2a1a'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#2a1a14'; c.beginPath(); c.moveTo(-28, -6); c.quadraticCurveTo(0, 30, 28, -6); c.quadraticCurveTo(0, 8, -28, -6); c.fill();
    c.fillStyle = '#fff'; ellipse(c, 13, -26, 7, 8); c.fill(); c.fillStyle = '#2a1408'; ellipse(c, 13, -25, 3.5, 5.5); c.fill(); brow(c, 13, -26, 1, ang, '#2a1a14');
    c.fillStyle = '#1a1018'; ellipse(c, -13, -26, 9, 9); c.fill(); c.strokeStyle = '#1a1018'; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, -44); c.lineTo(-4, -32); c.stroke(); brow(c, -13, -30, -1, ang, '#2a1a14');
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-3, 2); c.lineTo(0, -4); c.fill();
    // 海賊帽
    c.fillStyle = '#1a1424'; c.beginPath(); c.moveTo(-50, -44); c.quadraticCurveTo(0, -70, 50, -44); c.quadraticCurveTo(40, -88, 0, -94); c.quadraticCurveTo(-40, -88, -50, -44); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#fff'; ellipse(c, 0, -62, 8, 7); c.fill(); c.fillStyle = '#1a1424'; ellipse(c, -3, -63, 1.8, 2); c.fill(); ellipse(c, 3, -63, 1.8, 2); c.fill();
    c.restore();
  };
  ART.parrot = function (c, t, m) {   // パイレーツパロット
    const ang = m === 'angry', fl = Math.sin(t * 5), hover = Math.sin(t * 2.6) * 6;
    shadow(c, 96, 40);
    c.save(); c.translate(0, hover - 4);
    // 尾羽
    [['#e8283a', -14], ['#ffd24a', 0], ['#2a7aff', 14]].forEach(([col, dx]) => { c.fillStyle = col; c.beginPath(); c.moveTo(dx * .4, 40); c.quadraticCurveTo(dx * 3, 80, dx * 4, 100); c.quadraticCurveTo(dx * 1.4, 70, dx * .4 + 8, 40); c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.stroke(); });
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .22);
      c.beginPath(); c.moveTo(20, -8); c.quadraticCurveTo(70, -70, 100, -30); c.quadraticCurveTo(92, 0, 80, 16); c.quadraticCurveTo(60, 10, 42, 32); c.quadraticCurveTo(26, 20, 20, 20); c.closePath();
      c.fillStyle = grad(c, 20, -60, 100, 30, [[0, '#ff5a4a'], [.5, '#e8283a'], [1, '#2a7aff']]); c.fill(); c.strokeStyle = '#3a0a10'; c.lineWidth = 3; c.stroke();
      c.restore();
    });
    c.fillStyle = grad(c, 0, -20, 0, 60, [[0, '#ff6a5a'], [1, '#d8283a']]); ellipse(c, 0, 20, 28, 40); c.fill(); c.strokeStyle = '#3a0a10'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#ffe48a'; ellipse(c, 0, 30, 14, 24); c.fill();
    c.fillStyle = grad(c, 0, -62, 0, -6, [[0, '#ff6a5a'], [1, '#d8283a']]); ellipse(c, 0, -30, 26, 26); c.fill(); c.strokeStyle = '#3a0a10'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#fff'; ellipse(c, 0, -32, 21, 17); c.fill(); c.strokeStyle = '#3a0a10'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e8283a'; c.beginPath(); c.moveTo(-8, -54); c.quadraticCurveTo(0, -80, 14, -66); c.quadraticCurveTo(4, -64, 6, -54); c.fill();
    // くちばし
    c.fillStyle = '#2a2a3a'; c.beginPath(); c.moveTo(-10, -26); c.quadraticCurveTo(0, -42, 12, -26); c.quadraticCurveTo(14, -4, 0, 0); c.quadraticCurveTo(-14, -4, -10, -26); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-8, -22); c.quadraticCurveTo(0, -34, 10, -22); c.quadraticCurveTo(0, -18, -8, -22); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 14, -38, 6, 7); c.fill(); c.fillStyle = '#1a1030'; ellipse(c, sd * 14, -37, 3, 4.5); c.fill(); brow(c, sd * 14, -38, sd, true, '#3a0a10'); });
    // 眼帯
    c.fillStyle = '#1a1018'; ellipse(c, -14, -38, 8, 8); c.fill(); c.strokeStyle = '#1a1018'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-28, -50); c.lineTo(-2, -34); c.stroke();
    c.restore();
  };
  ART.kraken = function (c, t, m) {   // クラーケン（ボス）
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 100, 86);
    const gl = c.createRadialGradient(0, 0, 20, 0, 0, 150); gl.addColorStop(0, 'rgba(80,200,255,' + (.28 * pulse) + ')'); gl.addColorStop(1, 'rgba(80,200,255,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    // 触手
    for (let i = 0; i < 6; i++) {
      const sd = i < 3 ? -1 : 1, k = i % 3, bx = sd * (22 + k * 18), w = Math.sin(t * 2.4 + i) * 10, ex = sd * (60 + k * 16) + w;
      c.strokeStyle = '#4a3a9a'; c.lineWidth = 18 - k * 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, 30); c.quadraticCurveTo(sd * (80 + k * 10) + w, 50 + k * 8, ex, 86 - k * 12 + (ang ? -(10 + k * 8) : 0)); c.stroke();
      c.strokeStyle = '#ff9ac0'; c.lineWidth = 4; c.setLineDash([2, 9]); c.stroke(); c.setLineDash([]);
    }
    // 船のかけら
    c.save(); c.translate(-70, 20); c.rotate(-.5); c.fillStyle = '#6a4a2a'; c.fillRect(-26, -3, 52, 8); c.fillStyle = '#e8e0d0'; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -40); c.lineTo(22, -10); c.fill(); c.restore();
    // 頭
    c.fillStyle = grad(c, 0, -90, 0, 40, [[0, '#8a6ae8'], [1, '#3a2a8a']]); c.beginPath(); c.moveTo(-50, 24); c.quadraticCurveTo(-64, -70, 0, -96); c.quadraticCurveTo(64, -70, 50, 24); c.quadraticCurveTo(0, 44, -50, 24); c.fill(); c.strokeStyle = '#1a1050'; c.lineWidth = 4; c.stroke();
    c.fillStyle = 'rgba(255,154,192,.55)'; [[-26, -52, 7], [18, -66, 9], [30, -34, 6], [-10, -76, 5], [-38, -22, 5]].forEach(([x, y, r]) => { ellipse(c, x, y, r, r); c.fill(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#fff4a0'; ellipse(c, sd * 24, -10, 14, 16); c.fill(); c.save(); c.shadowColor = ang ? '#ff4040' : '#ffe45a'; c.shadowBlur = 12; c.fillStyle = ang ? '#ff5a4a' : '#ffd02a'; ellipse(c, sd * 24, -10, 8, 11); c.fill(); c.restore(); c.fillStyle = '#10062a'; c.fillRect(sd * 24 - 9, -12, 18, 4); brow(c, sd * 24, -14, sd, true, '#1a1050'); });
    c.fillStyle = '#10062a'; ellipse(c, 0, 20, 18, ang ? 11 : 7); c.fill();
    c.fillStyle = '#fff'; [-10, -4, 4, 10].forEach(x => { c.beginPath(); c.moveTo(x - 2.5, 14); c.lineTo(x, 22); c.lineTo(x + 2.5, 14); c.fill(); });
  };

  // ---- ステージ 20: 桜の国 ----
  ART.ninja = function (c, t, m) {   // にんじゃ
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3.4)) * 5;
    shadow(c, 94, 50);
    c.save(); c.translate(0, -b);
    // マフラー
    c.fillStyle = '#d82a3a'; c.beginPath(); c.moveTo(-6, 6); c.quadraticCurveTo(54, 6 + Math.sin(t * 4) * 6, 86, -12 + Math.sin(t * 4 + 1) * 8); c.lineTo(84, 6 + Math.sin(t * 4 + 1) * 8); c.quadraticCurveTo(50, 22, 6, 18); c.closePath(); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#1a2040'; ellipse(c, sd * 20, 90, 15, 8); c.fill(); });
    c.fillStyle = grad(c, 0, 10, 0, 84, [[0, '#2a3468'], [1, '#141a38']]); c.beginPath(); c.moveTo(-30, 10); c.lineTo(30, 10); c.lineTo(36, 84); c.lineTo(-36, 84); c.closePath(); c.fill(); c.strokeStyle = '#0a0c20'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#d82a3a'; c.fillRect(-34, 52, 68, 8);
    [-1, 1].forEach(sd => { const lf = ang && sd > 0 ? -30 : Math.sin(t * 3 + sd) * 4; c.strokeStyle = '#2a3468'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 28, 20); c.lineTo(sd * 56, 40 + lf); c.stroke(); c.fillStyle = '#e8c8a0'; ellipse(c, sd * 59, 43 + lf, 7, 7); c.fill(); });
    // 手裏剣
    c.save(); c.translate(62, 38 + (ang ? -30 : 0)); c.rotate(t * 8); c.fillStyle = '#c8d0e0'; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, -12); c.lineTo(0, -24); c.lineTo(5, -12); c.closePath(); c.fill(); } c.fillStyle = '#10142a'; ellipse(c, 0, 0, 4, 4); c.fill(); c.restore();
    // 頭
    c.fillStyle = '#2a3468'; ellipse(c, 0, -26, 34, 34); c.fill(); c.strokeStyle = '#0a0c20'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#e8c8a0'; c.beginPath(); c.moveTo(-26, -34); c.quadraticCurveTo(0, -44, 26, -34); c.lineTo(24, -16); c.quadraticCurveTo(0, -8, -24, -16); c.closePath(); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 11, -26, 7, 6); c.fill(); c.fillStyle = ang ? '#e82a2a' : '#1a1030'; ellipse(c, sd * 11, -26, 3.5, 5); c.fill(); brow(c, sd * 11, -30, sd, true, '#0a0c20'); });
    c.fillStyle = '#c8d0e0'; c.fillRect(-30, -42, 60, 8); c.fillStyle = '#6a7498'; c.fillRect(-8, -43, 16, 10);
    c.strokeStyle = '#2a3468'; c.lineWidth = 6; c.beginPath(); c.moveTo(-30, -38); c.quadraticCurveTo(-52, -34, -58, -14 + Math.sin(t * 4) * 5); c.stroke();
    c.restore();
  };
  ART.oni = function (c, t, m) {   // おに
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 2.6)) * 4;
    shadow(c, 96, 66);
    c.save(); c.translate(0, -b);
    [-1, 1].forEach(sd => { c.fillStyle = '#d83a3a'; ellipse(c, sd * 26, 92, 18, 9); c.fill(); });
    c.fillStyle = grad(c, 0, -10, 0, 90, [[0, '#ff6a5a'], [1, '#b82a2a']]); ellipse(c, 0, 48, 44, 46); c.fill(); c.strokeStyle = '#4a0a0a'; c.lineWidth = 4; c.stroke();
    // とらがら
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-42, 64); c.lineTo(42, 64); c.lineTo(36, 86); c.lineTo(-36, 86); c.closePath(); c.fill(); c.strokeStyle = '#1a1010'; c.lineWidth = 5; [-26, -8, 10, 28].forEach(x => { c.beginPath(); c.moveTo(x, 64); c.lineTo(x - 4, 86); c.stroke(); });
    // かなぼう
    const lf = ang ? -32 : Math.sin(t * 3) * 4;
    c.strokeStyle = '#e84a3a'; c.lineWidth = 15; c.lineCap = 'round'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 38, 22); c.lineTo(sd * 66, 44 + (sd > 0 ? lf : 0)); c.stroke(); });
    c.save(); c.translate(70, 40 + lf); c.rotate(.2); c.fillStyle = grad(c, -14, 0, 14, 0, [[0, '#4a4a58'], [.5, '#8a8a9a'], [1, '#3a3a48']]); c.beginPath(); c.moveTo(-6, 20); c.lineTo(-14, -70); c.lineTo(14, -70); c.lineTo(6, 20); c.closePath(); c.fill(); c.strokeStyle = '#1a1a24'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#c8c8d8'; [-56, -40, -24, -8].forEach((y, i) => { ellipse(c, (i % 2 ? 5 : -5), y, 3, 3); c.fill(); }); c.restore();
    // あたま
    c.fillStyle = grad(c, 0, -76, 0, 0, [[0, '#ff7a6a'], [1, '#d83a3a']]); ellipse(c, 0, -32, 40, 38); c.fill(); c.strokeStyle = '#4a0a0a'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#1a1010'; c.beginPath(); c.moveTo(-38, -44); c.quadraticCurveTo(0, -84, 38, -44); c.quadraticCurveTo(0, -62, -38, -44); c.fill();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff8e0'; c.beginPath(); c.moveTo(sd * 12, -62); c.lineTo(sd * 22, -92); c.lineTo(sd * 28, -58); c.closePath(); c.fill(); c.strokeStyle = '#6a4a1a'; c.lineWidth = 3; c.stroke(); });
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 16, -36, 10, 9); c.fill(); c.fillStyle = '#ffd02a'; ellipse(c, sd * 16, -36, 6, 7); c.fill(); c.fillStyle = '#1a1030'; ellipse(c, sd * 16, -36, 2, 6); c.fill(); brow(c, sd * 16, -36, sd, true, '#1a1010'); });
    c.fillStyle = '#2a0808'; ellipse(c, 0, -10, 20, ang ? 12 : 8); c.fill();
    c.fillStyle = '#fff'; [-14, 14].forEach(x => { c.beginPath(); c.moveTo(x - 4, -16); c.lineTo(x + (x < 0 ? -2 : 2), -2); c.lineTo(x + 4, -16); c.fill(); });
    c.restore();
  };
  ART.kyubi = function (c, t, m) {   // きゅうびのキツネ（ボス）
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 98, 84);
    const gl = c.createRadialGradient(0, 0, 20, 0, 0, 150); gl.addColorStop(0, 'rgba(255,170,60,' + (.34 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,170,60,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    // 9本のしっぽ
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * .96 + i * (Math.PI * .92 / 8), sw = Math.sin(t * 2 + i * .7) * 6, r = 104;
      const tx = Math.cos(a) * r + sw, ty = Math.sin(a) * r * .86 + 10;
      c.fillStyle = grad(c, 0, 20, tx, ty, [[0, '#ffb04a'], [.8, '#ff8a2a'], [1, '#fff4d8']]);
      c.beginPath(); c.moveTo(Math.cos(a) * 24, 36 + Math.sin(a) * 14 - 10); c.quadraticCurveTo(Math.cos(a - .26) * 76, Math.sin(a - .26) * 70 + 14, tx, ty); c.quadraticCurveTo(Math.cos(a + .26) * 76, Math.sin(a + .26) * 70 + 14, Math.cos(a) * 28, 40 + Math.sin(a) * 16 - 10); c.fill();
      c.strokeStyle = '#7a3a0a'; c.lineWidth = 2.5; c.stroke();
    }
    // からだ
    c.fillStyle = grad(c, 0, 0, 0, 94, [[0, '#fff0d8'], [1, '#ffc888']]); ellipse(c, 0, 58, 34, 38); c.fill(); c.strokeStyle = '#7a3a0a'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#d82a3a'; c.beginPath(); c.moveTo(-34, 44); c.lineTo(34, 44); c.lineTo(30, 56); c.lineTo(-30, 56); c.fill();
    // 顔
    [-1, 1].forEach(sd => { c.fillStyle = '#ffa84a'; c.beginPath(); c.moveTo(sd * 16, -34); c.lineTo(sd * 36, -88); c.lineTo(sd * 46, -28); c.closePath(); c.fill(); c.strokeStyle = '#7a3a0a'; c.lineWidth = 3.5; c.stroke(); c.fillStyle = '#2a1410'; c.beginPath(); c.moveTo(sd * 24, -40); c.lineTo(sd * 36, -74); c.lineTo(sd * 40, -38); c.fill(); });
    c.fillStyle = grad(c, 0, -62, 0, 8, [[0, '#fff4e0'], [1, '#ffb868']]); c.beginPath(); c.moveTo(-46, -26); c.quadraticCurveTo(-30, -62, 0, -60); c.quadraticCurveTo(30, -62, 46, -26); c.quadraticCurveTo(24, 4, 0, 14); c.quadraticCurveTo(-24, 4, -46, -26); c.fill(); c.strokeStyle = '#7a3a0a'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#d82a3a'; [-1, 1].forEach(sd => { c.save(); c.translate(sd * 22, -26); c.rotate(sd * (ang ? .5 : .35)); c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(0, -14, 14, -2); c.quadraticCurveTo(0, -4, -14, 6); c.fill(); c.restore(); });
    [-1, 1].forEach(sd => { c.save(); c.shadowColor = ang ? '#ff3030' : '#ffe45a'; c.shadowBlur = 10; c.fillStyle = ang ? '#ff4a3a' : '#ffd02a'; c.beginPath(); c.ellipse(sd * 20, -26, 9, 6, sd * (ang ? .5 : .3), 0, Math.PI * 2); c.fill(); c.restore(); c.fillStyle = '#10062a'; ellipse(c, sd * 20, -26, 1.8, 5); c.fill(); });
    c.fillStyle = '#2a1410'; ellipse(c, 0, -2, 5, 4); c.fill();
    c.strokeStyle = '#2a1410'; c.lineWidth = 2.8; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, 6); c.moveTo(-9, 8); c.quadraticCurveTo(0, ang ? 4 : 14, 9, 8); c.stroke();
    // ひたいの炎
    const fl2 = Math.sin(t * 8) * 3; c.save(); c.shadowColor = '#ff8a2a'; c.shadowBlur = 12; c.fillStyle = '#ff6a2a'; c.beginPath(); c.moveTo(-7, -56); c.quadraticCurveTo(-2, -72 + fl2, 0, -84 + fl2); c.quadraticCurveTo(3, -70, 7, -56); c.fill(); c.restore();
  };

  // ---- ステージ 21: 恐竜の谷 ----
  ART.raptor = function (c, t, m) {   // ラプトル
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 4)) * 5;
    shadow(c, 94, 60);
    c.save(); c.translate(0, -b);
    c.strokeStyle = '#4a9a3a'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(24, 52); c.quadraticCurveTo(76, 70, 98, 44 + Math.sin(t * 3) * 6); c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#3a7a2a'; ellipse(c, sd * 12, 78, 10, 18); c.fill(); c.strokeStyle = '#1a3a10'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#fff4c8'; [-6, 0, 6].forEach(x => { c.beginPath(); c.moveTo(sd * 12 + x - 2, 94); c.lineTo(sd * 12 + x, 102); c.lineTo(sd * 12 + x + 2, 94); c.fill(); }); });
    c.fillStyle = grad(c, 0, 0, 0, 90, [[0, '#6aca4a'], [1, '#3a8a2a']]); ellipse(c, 0, 48, 36, 40); c.fill(); c.strokeStyle = '#1a3a10'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#d8f0a0'; ellipse(c, 0, 58, 20, 28); c.fill();
    c.fillStyle = '#e8403a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8, 18 + i * 12); c.lineTo(0, 12 + i * 12); c.lineTo(8, 18 + i * 12); c.lineTo(0, 24 + i * 12); c.fill(); }
    [-1, 1].forEach(sd => { c.strokeStyle = '#4a9a3a'; c.lineWidth = 8; c.beginPath(); c.moveTo(sd * 30, 34); c.quadraticCurveTo(sd * 50, 46 + (ang ? -16 : 0), sd * 44, 58 + (ang ? -22 : 0)); c.stroke(); c.fillStyle = '#fff4c8'; [-4, 0, 4].forEach(x => { c.beginPath(); c.moveTo(sd * 44 + x - 2, 58 + (ang ? -22 : 0)); c.lineTo(sd * 44 + x + sd * 2, 68 + (ang ? -22 : 0)); c.lineTo(sd * 44 + x + 2, 58 + (ang ? -22 : 0)); c.fill(); }); });
    // 頭
    c.fillStyle = grad(c, 0, -60, 0, 20, [[0, '#7ada5a'], [1, '#3a8a2a']]); c.beginPath(); c.moveTo(-34, -26); c.quadraticCurveTo(-30, -62, 4, -62); c.quadraticCurveTo(44, -60, 56, -30); c.quadraticCurveTo(58, -4, 20, -2); c.quadraticCurveTo(-8, 8, -30, 0); c.quadraticCurveTo(-40, -8, -34, -26); c.fill(); c.strokeStyle = '#1a3a10'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#e8403a'; c.beginPath(); c.moveTo(-16, -60); c.lineTo(-8, -80); c.lineTo(0, -62); c.lineTo(10, -78); c.lineTo(14, -60); c.fill();
    c.fillStyle = '#2a0808'; c.beginPath(); c.moveTo(-10, -12); c.quadraticCurveTo(24, -4, 52, -16); c.quadraticCurveTo(24, 8, -10, -12); c.fill();
    c.fillStyle = '#fff'; [4, 14, 24, 34, 44].forEach(x => { c.beginPath(); c.moveTo(x - 2.5, -12); c.lineTo(x, -3); c.lineTo(x + 2.5, -12); c.fill(); });
    c.fillStyle = '#1a3a10'; ellipse(c, 44, -34, 2.5, 2); c.fill();
    c.fillStyle = '#fff'; ellipse(c, 8, -34, 10, 9); c.fill(); c.fillStyle = ang ? '#ff3a2a' : '#ffc02a'; ellipse(c, 10, -34, 6, 7); c.fill(); c.fillStyle = '#10062a'; ellipse(c, 10, -34, 2, 6); c.fill(); brow(c, 8, -34, 1, true, '#1a3a10');
    c.restore();
  };
  ART.tricera = function (c, t, m) {   // トリケラ
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 2.6)) * 3;
    shadow(c, 94, 76);
    c.save(); c.translate(0, -b);
    [-1, 1].forEach(sd => [-1, 1].forEach(sd2 => { c.fillStyle = '#5a7a8a'; ellipse(c, sd * 40 + sd2 * 8 - 10, 82, 12, 12); c.fill(); }));
    c.fillStyle = grad(c, 0, 0, 0, 90, [[0, '#7ab0c8'], [1, '#4a7a98']]); ellipse(c, 14, 50, 62, 42); c.fill(); c.strokeStyle = '#1a3a4a'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = 'rgba(26,58,74,.45)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-6 + i * 20, 14); c.quadraticCurveTo(-2 + i * 20, 50, -6 + i * 20, 84); c.stroke(); }
    c.strokeStyle = '#4a7a98'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(70, 54); c.quadraticCurveTo(96, 60, 100, 76); c.stroke();
    // フリル
    c.fillStyle = grad(c, 0, -80, 0, 0, [[0, '#ff9a5a'], [1, '#d8483a']]); c.beginPath(); c.moveTo(-60, -10); c.quadraticCurveTo(-70, -80, 0, -86); c.quadraticCurveTo(70, -80, 60, -10); c.quadraticCurveTo(0, 8, -60, -10); c.fill(); c.strokeStyle = '#4a1a10'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#ffe48a'; for (let i = 0; i < 7; i++) { const a = Math.PI * (1.08 + i * .14); ellipse(c, Math.cos(a) * 54, Math.sin(a) * 52 - 22, 7, 7); c.fill(); }
    // 顔
    c.fillStyle = grad(c, 0, -40, 0, 36, [[0, '#9ac8d8'], [1, '#5a8aa8']]); c.beginPath(); c.moveTo(-34, -20); c.quadraticCurveTo(-34, -50, 0, -50); c.quadraticCurveTo(34, -50, 34, -20); c.quadraticCurveTo(38, 20, 0, 32); c.quadraticCurveTo(-38, 20, -34, -20); c.fill(); c.strokeStyle = '#1a3a4a'; c.lineWidth = 4; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff8e0'; c.beginPath(); c.moveTo(sd * 20, -30); c.lineTo(sd * 42, -76); c.lineTo(sd * 32, -22); c.closePath(); c.fill(); c.strokeStyle = '#6a5a2a'; c.lineWidth = 3; c.stroke(); });
    c.fillStyle = '#fff8e0'; c.beginPath(); c.moveTo(-6, -14); c.lineTo(0, -48); c.lineTo(6, -14); c.closePath(); c.fill(); c.strokeStyle = '#6a5a2a'; c.lineWidth = 3; c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#fff'; ellipse(c, sd * 16, -22, 8, 8); c.fill(); c.fillStyle = ang ? '#ff3a2a' : '#2a1a10'; ellipse(c, sd * 16, -21, 4.5, 6); c.fill(); brow(c, sd * 16, -22, sd, ang, '#1a3a4a'); });
    c.fillStyle = '#1a3a4a'; ellipse(c, -6, 8, 2.5, 3); c.fill(); ellipse(c, 6, 8, 2.5, 3); c.fill();
    c.strokeStyle = '#1a3a4a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 20); c.quadraticCurveTo(0, ang ? 14 : 28, 14, 20); c.stroke();
    c.restore();
  };
  ART.trex = function (c, t, m) {   // ティラノ（ボス）
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 2.2)) * 3, pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 98, 84);
    const gl = c.createRadialGradient(0, 0, 20, 0, 0, 150); gl.addColorStop(0, 'rgba(255,150,60,' + (.28 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = gl; c.fillRect(-160, -140, 320, 300);
    c.save(); c.translate(0, -b);
    c.strokeStyle = '#7a4a2a'; c.lineWidth = 24; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 56); c.quadraticCurveTo(84, 72, 104, 44 + Math.sin(t * 2.4) * 6); c.stroke();
    [-1, 1].forEach(sd => { c.fillStyle = '#6a3a1a'; ellipse(c, sd * 24, 78, 18, 22); c.fill(); c.strokeStyle = '#2a1408'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#fff4c8'; [-8, 0, 8].forEach(x => { c.beginPath(); c.moveTo(sd * 24 + x - 3, 96); c.lineTo(sd * 24 + x, 104); c.lineTo(sd * 24 + x + 3, 96); c.fill(); }); });
    c.fillStyle = grad(c, 0, 0, 0, 92, [[0, '#a8683a'], [1, '#6a3a1a']]); ellipse(c, 0, 48, 48, 46); c.fill(); c.strokeStyle = '#2a1408'; c.lineWidth = 4.5; c.stroke();
    c.fillStyle = '#f0d8a0'; ellipse(c, 0, 58, 28, 32); c.fill();
    c.fillStyle = '#4a2410'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-24 + i * 12, 4); c.lineTo(-18 + i * 12, -8); c.lineTo(-12 + i * 12, 4); c.fill(); }
    [-1, 1].forEach(sd => { c.strokeStyle = '#8a4a2a'; c.lineWidth = 9; c.beginPath(); c.moveTo(sd * 40, 36); c.lineTo(sd * 54, 50 + (ang ? -16 : 0)); c.stroke(); c.fillStyle = '#fff4c8'; c.beginPath(); c.moveTo(sd * 54 - 3, 50 + (ang ? -16 : 0)); c.lineTo(sd * 58, 62 + (ang ? -16 : 0)); c.lineTo(sd * 54 + 3, 50 + (ang ? -16 : 0)); c.fill(); });
    // 頭
    c.fillStyle = grad(c, 0, -80, 0, 8, [[0, '#c8844a'], [1, '#7a4a2a']]); c.beginPath(); c.moveTo(-50, -30); c.quadraticCurveTo(-46, -78, 4, -78); c.quadraticCurveTo(60, -78, 66, -34); c.lineTo(66, -10); c.quadraticCurveTo(30, -4, -4, -4 + (ang ? 4 : 0)); c.quadraticCurveTo(-48, 6, -50, -30); c.fill(); c.strokeStyle = '#2a1408'; c.lineWidth = 4.5; c.stroke();
    c.fillStyle = '#e8403a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-34 + i * 16, -70); c.lineTo(-28 + i * 16, -90); c.lineTo(-20 + i * 16, -70); c.fill(); }
    c.fillStyle = '#1a0606'; c.beginPath(); c.moveTo(-6, -10); c.quadraticCurveTo(30, ang ? 20 : 6, 66, -14); c.quadraticCurveTo(30, 18, -6, -10); c.fill();
    c.fillStyle = '#fff'; [4, 16, 28, 40, 52].forEach(x => { c.beginPath(); c.moveTo(x - 3, -11); c.lineTo(x, 0 + (ang ? 4 : 0)); c.lineTo(x + 3, -11); c.fill(); });
    c.fillStyle = '#2a1408'; ellipse(c, 56, -46, 3, 2.5); c.fill();
    c.fillStyle = '#fff'; ellipse(c, 14, -46, 12, 11); c.fill(); c.save(); c.shadowColor = '#ff6a2a'; c.shadowBlur = 8; c.fillStyle = ang ? '#ff3a2a' : '#ffa02a'; ellipse(c, 16, -46, 7, 8); c.fill(); c.restore(); c.fillStyle = '#10062a'; ellipse(c, 16, -46, 2.2, 7); c.fill(); brow(c, 14, -46, 1, true, '#2a1408');
    c.restore();
  };

  // ---- ステージ 22: 終焉の世界 ----
  ART.fallenangel = function (c, t, m) {   // 堕天使
    const ang = m === 'angry', fl = Math.sin(t * 2.4), hover = Math.sin(t * 2.2) * 6;
    shadow(c, 96, 40);
    c.save(); c.translate(0, hover - 4);
    [-1, 1].forEach(sd => {
      c.save(); c.scale(sd, 1); c.rotate(-fl * .1);
      for (let i = 0; i < 5; i++) { c.fillStyle = grad(c, 20, -60 + i * 16, 100, -30 + i * 20, [[0, '#4a3a6a'], [1, '#1a1030']]); c.beginPath(); c.moveTo(20, -16 + i * 10); c.quadraticCurveTo(70, -90 + i * 22, 108 - i * 6, -50 + i * 26); c.quadraticCurveTo(70, -20 + i * 18, 24, 4 + i * 8); c.closePath(); c.fill(); c.strokeStyle = '#0a0618'; c.lineWidth = 2; c.stroke(); }
      c.restore();
    });
    // 輪
    c.save(); c.shadowColor = '#c070ff'; c.shadowBlur = 14; c.strokeStyle = '#d8a0ff'; c.lineWidth = 4; c.beginPath(); c.ellipse(0, -84, 22, 7, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    [-1, 1].forEach(sd => { c.fillStyle = '#2a2040'; ellipse(c, sd * 12, 76, 11, 8); c.fill(); });
    c.fillStyle = grad(c, 0, -10, 0, 80, [[0, '#4a3a7a'], [1, '#1e1438']]); c.beginPath(); c.moveTo(-26, -6); c.lineTo(26, -6); c.lineTo(34, 78); c.lineTo(-34, 78); c.closePath(); c.fill(); c.strokeStyle = '#0a0618'; c.lineWidth = 3.5; c.stroke();
    c.fillStyle = '#c070ff'; c.beginPath(); c.moveTo(0, 8); c.lineTo(8, 22); c.lineTo(0, 40); c.lineTo(-8, 22); c.closePath(); c.fill();
    [-1, 1].forEach(sd => { c.strokeStyle = '#d8c8f0'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 26, 4); c.lineTo(sd * 50, 30 + (ang ? -18 : Math.sin(t * 3 + sd) * 4)); c.stroke(); });
    // かお
    c.fillStyle = '#e8dcf0'; ellipse(c, 0, -42, 24, 28); c.fill(); c.strokeStyle = '#2a1a3a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#1a1030'; c.beginPath(); c.moveTo(-26, -42); c.quadraticCurveTo(-30, -78, 0, -76); c.quadraticCurveTo(30, -78, 26, -42); c.quadraticCurveTo(14, -62, 0, -58); c.quadraticCurveTo(-14, -62, -26, -42); c.fill();
    [-1, 1].forEach(sd => { c.save(); c.shadowColor = ang ? '#ff3a5a' : '#d070ff'; c.shadowBlur = 10; c.fillStyle = ang ? '#ff5a7a' : '#e8a0ff'; c.beginPath(); c.ellipse(sd * 10, -42, 7, 5, sd * .3, 0, Math.PI * 2); c.fill(); c.restore(); brow(c, sd * 10, -44, sd, true, '#1a1030'); });
    c.strokeStyle = '#2a1a3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-6, -26); c.lineTo(6, -26); c.stroke();
    c.restore();
  };
  ART.cerberus = function (c, t, m) {   // ケルベロス
    const ang = m === 'angry', b = Math.abs(Math.sin(t * 3)) * 3;
    shadow(c, 94, 76);
    c.save(); c.translate(0, -b);
    c.strokeStyle = '#3a1a2a'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(48, 54); c.quadraticCurveTo(100, 52, 96, 18 + Math.sin(t * 4) * 6); c.stroke();
    c.save(); c.shadowColor = '#ff6a2a'; c.shadowBlur = 12; c.fillStyle = '#ff8a2a'; ellipse(c, 96, 12 + Math.sin(t * 4) * 6, 8, 12); c.fill(); c.restore();
    [-1, 1].forEach(sd => { c.fillStyle = '#2a1420'; ellipse(c, sd * 38, 90, 18, 9); c.fill(); });
    c.fillStyle = grad(c, 0, 10, 0, 90, [[0, '#4a2a3a'], [1, '#1e0e18']]); ellipse(c, 0, 58, 62, 36); c.fill(); c.strokeStyle = '#0a0408'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#ff6a2a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-40 + i * 20, 32); c.lineTo(-34 + i * 20, 18 + Math.sin(t * 5 + i) * 3); c.lineTo(-28 + i * 20, 32); c.fill(); }
    // 3つの頭
    [[-52, -10, .8], [0, -24, 1], [52, -10, .8]].forEach(([x, y, k], idx) => {
      c.save(); c.translate(x, y); c.scale(k, k);
      [-1, 1].forEach(sd => { c.fillStyle = '#2a1420'; c.beginPath(); c.moveTo(sd * 14, -20); c.lineTo(sd * 30, -44); c.lineTo(sd * 30, -8); c.closePath(); c.fill(); c.strokeStyle = '#0a0408'; c.lineWidth = 3; c.stroke(); });
      c.fillStyle = grad(c, 0, -34, 0, 30, [[0, '#5a3248'], [1, '#2a1420']]); c.beginPath(); c.moveTo(-26, -8); c.quadraticCurveTo(-26, -38, 0, -38); c.quadraticCurveTo(26, -38, 26, -8); c.quadraticCurveTo(30, 28, 0, 32); c.quadraticCurveTo(-30, 28, -26, -8); c.fill(); c.strokeStyle = '#0a0408'; c.lineWidth = 3.5; c.stroke();
      c.fillStyle = '#d8b8a8'; ellipse(c, 0, 14, 14, 11); c.fill(); c.fillStyle = '#0a0408'; ellipse(c, 0, 8, 5, 3.5); c.fill();
      [-1, 1].forEach(sd => { c.save(); c.shadowColor = '#ff6a2a'; c.shadowBlur = 8; c.fillStyle = ang ? '#ff3a2a' : '#ffa02a'; c.beginPath(); c.ellipse(sd * 11, -10, 6, 5, sd * .4, 0, Math.PI * 2); c.fill(); c.restore(); brow(c, sd * 11, -12, sd, true, '#0a0408'); });
      if (ang || idx === 1) { c.fillStyle = '#fff'; [-8, 8].forEach(xx => { c.beginPath(); c.moveTo(xx - 3, 20); c.lineTo(xx, 29); c.lineTo(xx + 3, 20); c.fill(); }); }
      c.restore();
    });
    c.restore();
  };
  ART.chaosgod = function (c, t, m) {   // 混沌の神（ボス）
    const ang = m === 'angry', pulse = .6 + .4 * Math.sin(t * 3);
    shadow(c, 100, 86);
    const gl = c.createRadialGradient(0, 0, 10, 0, 0, 160); gl.addColorStop(0, 'rgba(255,80,160,' + (.38 * pulse) + ')'); gl.addColorStop(.6, 'rgba(120,60,255,' + (.2 * pulse) + ')'); gl.addColorStop(1, 'rgba(120,60,255,0)'); c.fillStyle = gl; c.fillRect(-170, -150, 340, 320);
    // 背後の輪
    c.save(); c.translate(0, -10); c.rotate(t * .5); c.strokeStyle = 'rgba(255,170,255,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 100, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillStyle = i % 2 ? '#ffd24a' : '#ff6ad8'; ellipse(c, Math.cos(a) * 100, Math.sin(a) * 100, 5, 5); c.fill(); } c.restore();
    c.save(); c.translate(0, -10); c.rotate(-t * .35); c.strokeStyle = 'rgba(120,200,255,.6)'; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, r = 80; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.stroke(); c.restore();
    // 翼
    [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? 'rgba(255,120,200,.8)' : 'rgba(150,100,255,.8)'; c.beginPath(); c.moveTo(sd * 24, -10 + i * 10); c.quadraticCurveTo(sd * (80 + i * 12), -80 + i * 24 + Math.sin(t * 2 + i) * 6, sd * (100 - i * 6), -20 + i * 36); c.quadraticCurveTo(sd * 60, 0 + i * 16, sd * 28, 14 + i * 10); c.fill(); c.strokeStyle = '#2a0a4a'; c.lineWidth = 2.5; c.stroke(); } });
    // からだ
    c.fillStyle = grad(c, 0, -20, 0, 96, [[0, '#2a1a5a'], [1, '#0a0620']]); c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.lineTo(52, 92); c.quadraticCurveTo(0, 104, -52, 92); c.closePath(); c.fill(); c.strokeStyle = '#d070ff'; c.lineWidth = 3.5; c.save(); c.shadowColor = '#d070ff'; c.shadowBlur = 10; c.stroke(); c.restore();
    c.save(); c.shadowColor = '#ffd24a'; c.shadowBlur = 12; c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(0, 16); c.lineTo(14, 44); c.lineTo(0, 72); c.lineTo(-14, 44); c.closePath(); c.fill(); c.restore();
    [-1, 1].forEach(sd => { const lf = ang ? -26 : Math.sin(t * 2.4 + sd) * 5; c.strokeStyle = '#3a2a7a'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(sd * 32, 10); c.lineTo(sd * 66, 34 + lf); c.stroke(); c.save(); c.shadowColor = '#ff6ad8'; c.shadowBlur = 14; c.fillStyle = '#ff9ae8'; ellipse(c, sd * 72, 38 + lf, 11, 11); c.fill(); c.restore(); });
    // 顔・冠
    c.fillStyle = grad(c, 0, -76, 0, 0, [[0, '#f8f0ff'], [1, '#c8b8e8']]); ellipse(c, 0, -34, 30, 36); c.fill(); c.strokeStyle = '#2a1a5a'; c.lineWidth = 3.5; c.stroke();
    [-1, 1].forEach(sd => { c.save(); c.shadowColor = ang ? '#ff3030' : '#ff6ad8'; c.shadowBlur = 12; c.fillStyle = ang ? '#ff4a4a' : '#ff6ad8'; c.beginPath(); c.ellipse(sd * 12, -38, 9, 6, sd * (ang ? .5 : .3), 0, Math.PI * 2); c.fill(); c.restore(); c.fillStyle = '#10062a'; ellipse(c, sd * 12, -38, 2, 5); c.fill(); });
    c.save(); c.shadowColor = '#ffd24a'; c.shadowBlur = 10; c.fillStyle = '#ffd24a'; ellipse(c, 0, -52, 5, 5); c.fill(); c.restore();
    c.fillStyle = '#2a1a5a'; ellipse(c, 0, -12, 8, ang ? 7 : 4); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-34, -60); c.lineTo(-34, -90); c.lineTo(-20, -74); c.lineTo(-8, -102); c.lineTo(0, -80); c.lineTo(8, -102); c.lineTo(20, -74); c.lineTo(34, -90); c.lineTo(34, -60); c.quadraticCurveTo(0, -52, -34, -60); c.fill(); c.strokeStyle = '#7a5a10'; c.lineWidth = 3; c.stroke();
    [[-8, -100], [8, -100], [-34, -88], [34, -88]].forEach(([x, y]) => { c.fillStyle = '#ff6ad8'; ellipse(c, x, y, 3.5, 3.5); c.fill(); });
  };
  // 敵カードに収めるための大きさ（1 = そのまま）
  A.fit = { slime: 1, goblin: 0.95, dragon: 0.78, skeleton: 0.88, ghost: 0.88, golem: 0.84, knight: 0.74, imp: 0.88, demon: 0.7, yeti: 0.78, wizard: 0.78,
    chibi: 1.05, kogob: 0.98, bigslime: 0.88, frostslime: 0.95, magmaslime: 0.95, flameimp: 0.88, icedragon: 0.76, lavagolem: 0.8, holyknight: 0.72, overlord: 0.8,
    spore: 0.95, treant: 0.8, mothertree: 0.74, jelly: 0.88, sahagin: 0.86, dagon: 0.74, scorpion: 0.92, mummy: 0.84, pharaoh: 0.72,
    drone: 0.9, robo: 0.84, deathmachine: 0.76, voideye: 0.9, shadow: 0.84, timelord: 0.72,
    crybat: 0.9, crygolem: 0.82, crydragon: 0.72, thunderbird: 0.86, raijuu: 0.84, raijin: 0.74,
    gummy: 0.9, cookie: 0.86, cakequeen: 0.72, alien: 0.88, ufo: 0.84, blackhole: 0.76,
    wyvern: 0.88, dragonknight: 0.84, ancientdragon: 0.72,
    clown: 0.86, doll: 0.9, ringmaster: 0.72, pirate: 0.86, parrot: 0.88, kraken: 0.74,
    ninja: 0.88, oni: 0.8, kyubi: 0.7, raptor: 0.86, tricera: 0.82, trex: 0.72,
    fallenangel: 0.84, cerberus: 0.8, chaosgod: 0.7 };
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
    demon:    { sky: ['#6a1030', '#1a0618'], glow: '#ff3a6a', ground: '#2a0c20' },
    ice:      { sky: ['#2f6a96', '#12264a'], glow: '#bff0ff', ground: '#244468' },
    volcano:  { sky: ['#8a2c12', '#2a0a10'], glow: '#ff8a3a', ground: '#3a1410' },
    sky:      { sky: ['#4a4a9a', '#14143c'], glow: '#ffe08a', ground: '#262660' },
    mush:     { sky: ['#3f7a40', '#122a1a'], glow: '#c8ff8a', ground: '#1e3a1e' },
    sea:      { sky: ['#1f5a9a', '#08183a'], glow: '#7ae0ff', ground: '#123a6a' },
    desert:   { sky: ['#c8903a', '#4a2a10'], glow: '#ffd870', ground: '#7a4a1a' },
    factory:  { sky: ['#56627e', '#161a2a'], glow: '#ff8a5a', ground: '#2a3048' },
    void:     { sky: ['#321e6a', '#08041a'], glow: '#c070ff', ground: '#1a1040' },
    crystal:  { sky: ['#2a4a8a', '#0a1236'], glow: '#8af0ff', ground: '#1a2a5a' },
    storm:    { sky: ['#3a4260', '#0e1224'], glow: '#fff070', ground: '#242a40' },
    candy:    { sky: ['#ff9ac8', '#a04a9a'], glow: '#fff0a0', ground: '#c8508a' },
    space:    { sky: ['#14103a', '#020210'], glow: '#6ad8ff', ground: '#10103a' },
    throne:   { sky: ['#5a1a2a', '#14060e'], glow: '#ffb050', ground: '#2a0e18' },
    carnival: { sky: ['#6a2a9a', '#1a0a3a'], glow: '#ff7ad8', ground: '#3a1a5a' },
    pirate:   { sky: ['#2a4a6a', '#08121e'], glow: '#ffe08a', ground: '#4a3220' },
    sakura:   { sky: ['#d878a8', '#5a2a5a'], glow: '#fff0f4', ground: '#7a3a5a' },
    jurassic: { sky: ['#6aa83a', '#1e3a14'], glow: '#ffd070', ground: '#4a3a1a' },
    chaos:    { sky: ['#6a1a7a', '#08020e'], glow: '#ff6ad8', ground: '#1a0828' }
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
