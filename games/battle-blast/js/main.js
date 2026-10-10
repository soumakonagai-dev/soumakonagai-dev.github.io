// 描画・演出・入力。ゲームのルールは logic.js、素材は art.js、効果音は sfx.js。
(function () {
  const D = BB.data, C = D.config, L = BB.logic, A = BB.art, SFX = BB.sfx, MUSIC = BB.music, MENU = BB.menu, EQ = BB.equip, SCOUT = BB.scout, SV = BB.save, N = C.size;
  const W = 360, H = 640;
  const FONT = '"Yu Gothic UI","Hiragino Kaku Gothic ProN","Meiryo",sans-serif';

  // ---------- レイアウト ----------
  const EN = { x: 10, y: 10, w: 340, h: 166 };
  const PL = { x: 10, y: 182, w: 340, h: 58 };
  const BOARD = { x: 40, y: 280, cs: 40 };
  const SLOT = { y: 568, w: 104, h: 66, gap: 8, x0: 16 };
  const BUD = [{ x: 126, y: 246, w: 108, h: 28 }, { x: 240, y: 246, w: 108, h: 28 }];   // バディのボタン
  const PALETTE = ['attack', 'magic', 'heal', 'guard', 'poison', 'charge', 'stun'];
  const RARC = { N: '#9aa3b8', R: '#4aa3ff', SR: '#b36bff', SSR: '#ffc53d' };
  const SPECIAL = { x: 244, y: 211, w: 96, h: 26 };
  const ART_POS = { x: 180, y: 96, scale: 0.5 };
  const ART_SCALE = A.fit;   // 敵ごとの大きさ補正（カード内に収める）
  const MUTE = { x: 330, y: 24, r: 13 };
  const QUIT = { x: 298, y: 24, r: 13 };
  const LIFT = 64;                 // ドラッグ中、指で隠れないようピースを上にずらす量
  const OVERLAY_DELAY = 900;
  const POS = { enemy: [180, 96], player: [190, 199], shield: [292, 199], gauge: [130, 224], count: [306, 116] };
  const TARGET = { attack: 'enemy', magic: 'enemy', poison: 'enemy', stun: 'count', heal: 'player', guard: 'shield', charge: 'gauge' };
  const FLIGHT = 500;

  // 敵の行動演出の長さ(ms)と色
  const ACT = {
    attack: { dur: 1050, impact: 640, color: '#ff7a59', label: '攻撃' },
    strong: { dur: 1600, impact: 980, color: '#ff2d46', label: '強攻撃!' },
    stone:  { dur: 1300, impact: 620, color: '#d9a066', label: '石投げ' },
    freeze: { dur: 1400, impact: 700, color: '#6fd8ff', label: '凍結' },
    defend: { dur: 1000, impact: 520, color: '#5aa8ff', label: '防御姿勢' },
    seal:   { dur: 1200, impact: 600, color: '#b06bff', label: '能力封じ' }
  };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let scale = 1, S = 1;
  function resize() {
    scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    S = Math.min(window.devicePixelRatio || 1, 3) * scale;
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    canvas.width = Math.round(W * S);
    canvas.height = Math.round(H * S);
  }
  window.addEventListener('resize', resize);
  resize();

  // 敵スプライト用のオフスクリーン
  const spr = document.createElement('canvas');
  spr.width = spr.height = 440;   // ±122 単位ぶん（角や炎がはみ出す敵のため少し広め）
  const sctx = spr.getContext('2d');
  const spr2 = document.createElement('canvas');   // 輪郭線をつけた仕上がり用
  spr2.width = spr2.height = 440;
  const sctx2 = spr2.getContext('2d');

  // ---------- 状態 ----------
  let screen = 'title', game = null, drag = null;
  let stageIdx = 0, stageLevel = 0, resultInfo = null, quitAsk = false;
  let bt = null;   // バディのスキルを使っている途中 { slot, need, color, cell, drag }
  let now = performance.now();
  let phaseAt = 0, busyUntil = 0, resultSfx = false;
  let particles, floats, orbs, ghosts, beams, rings, slashes, banners, waves, vign, timers, cellFx;
  let shake = 0, flashFx = null, hold, snap, vis, ea, pa;
  const titleBlocks = Array.from({ length: 18 }, (_, i) => ({
    x: (i * 53) % 340 + 10, y: (i * 97) % 640, v: 14 + (i * 7) % 22, s: 20 + (i * 5) % 22,
    ab: ['attack', 'heal', 'guard', 'magic', 'poison', 'charge', 'stun'][i % 7], r: i * .7
  }));

  function resetFx() {
    particles = []; floats = []; orbs = []; ghosts = []; beams = []; rings = []; slashes = [];
    banners = []; waves = []; vign = []; timers = []; cellFx = {};
    shake = 0; flashFx = null; snap = null;
    hold = { player: 0, enemy: 0, intent: 0 };
    pa = { hitAt: -1e9, strong: false };
  }
  function resetEnemyVis() {
    const e = game.enemy, p = game.player;
    vis = { pHp: p.hp, pGhost: p.hp, pSh: p.shield, gauge: p.gauge, eHp: e.hp, eGhost: e.hp };
    ea = { kind: null, t0: 0, dur: 0, impact: 0, hitAt: -1e9, deadAt: null, introAt: now };
  }
  // i: ステージ番号。スカウト遠征のときは BB.scout.spec() のオブジェクト
  function startStage(i, level) {
    stageIdx = i; stageLevel = level || 0;
    game = L.newGame(null, i, EQ.computeMods(SV.data), SCOUT.partyList(SV.data), { level: stageLevel });
    screen = 'battle'; drag = null; phaseAt = 0; busyUntil = 0; resultSfx = false; resultInfo = null; quitAsk = false; bt = null;
    resetFx(); resetEnemyVis();
    MUSIC.play(game.enemy.def.boss ? 'boss' : 'battle');
    if (stageLevel) banner('CHALLENGE  Lv' + stageLevel, '#ff6b6b', 296, { small: true, sub: game.stage.name + '   コイン ×' + L.challengeInfo(stageLevel).coin.toFixed(2), dur: 1600 });
    else if (game.stage.scout) banner('スカウト遠征', '#7dffb0', 296, { sub: '2回勝つとスカウト場へ', dur: 1500 });
    else banner('STAGE ' + (game.stageIndex + 1), '#5aa8ff', 296, { sub: game.stage.name, dur: 1500 });
  }
  const startScout = () => startStage(SCOUT.spec(SV.data));
  const start = () => startStage(stageIdx, stageLevel);   // もう一度
  function go(name) {
    screen = name; drag = null; quitAsk = false; bt = null;
    MENU.enter(name);
    if (name !== 'battle') MUSIC.play('title');
  }
  resetFx();

  const after = (ms, fn) => timers.push({ at: now + ms, fn });
  const cellCenter = (x, y) => [BOARD.x + x * BOARD.cs + BOARD.cs / 2, BOARD.y + y * BOARD.cs + BOARD.cs / 2];
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- 演出の部品 ----------
  function burst(x, y, color, n, speed, size, g) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(.35, 1) * (speed || 120);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (speed || 120) * .25, g: g === undefined ? 260 : g, t0: now, life: rnd(420, 800), size: (size || 4) * rnd(.6, 1.3), color, star: Math.random() < .35 });
    }
  }
  function sparkleUp(x, y, color, n) {
    for (let i = 0; i < n; i++) particles.push({ x: x + rnd(-40, 40), y: y + rnd(-6, 10), vx: rnd(-10, 10), vy: rnd(-70, -30), g: -20, t0: now + i * 40, life: 900, size: rnd(3, 5), color, star: true });
  }
  function addFloat(text, x, y, color, size) { floats.push({ text, x, y, color, size: size || 22, t0: now }); }
  function ring(x, y, color, r0, r1, dur, w) { rings.push({ x, y, color, r0, r1, dur: dur || 450, w: w || 4, t0: now }); }
  function banner(text, color, y, o) { banners.push(Object.assign({ text, color, y, t0: now, dur: 1100 }, o || {})); }
  function flashScreen(color, a) { flashFx = { color, a, t0: now, dur: 320 }; }

  function clearFx(e) {
    e.cells.forEach(c => {
      const [cx, cy] = cellCenter(c.x, c.y);
      ghosts.push({ x: c.x, y: c.y, ability: c.ability, ice: c.obstacle === 'ice', stone: c.obstacle === 'stone', t0: now });
      burst(cx, cy, c.obstacle ? '#bfe3ff' : D.abilities[c.ability].color, 5, 150, 4);
    });
    (e.rows || []).forEach(r => beams.push({ row: r, t0: now }));
    (e.cols || []).forEach(c => beams.push({ col: c, t0: now }));
    if (e.lines > 0) { shake = Math.max(shake, 3 + e.lines * 2.5); SFX.play('clear', e.lines); }
  }

  function abilityFx(e, last, t) {
    const ab = e.ability, color = D.abilities[ab].color, tg = POS[TARGET[ab]];
    const cells = last ? last.cells.filter(c => c.ability === ab && !c.obstacle) : [];
    after(t, () => {
      const step = Math.min(24, 120 / Math.max(1, cells.length));
      cells.forEach((c, i) => {
        const [cx, cy] = cellCenter(c.x, c.y);
        orbs.push({ x0: cx, y0: cy, x1: tg[0], y1: tg[1], color, t0: now + i * step, dur: 380, lift: rnd(30, 70) * (cx < 180 ? 1 : -1) });
      });
    });
    after(t + FLIGHT, () => impactFx(e, color, tg));
  }

  function impactFx(e, color, tg) {
    switch (e.type) {
      case 'enemyDmg':
        ea.hitAt = now; shake = Math.max(shake, 5 + Math.min(8, e.value / 4));
        if (e.pierce) { ring(tg[0], tg[1], '#c58bff', 6, 60, 500, 5); burst(tg[0], tg[1], '#c58bff', 14, 180, 4); SFX.play('magic'); }
        else {
          slashes.push({ x: tg[0], y: tg[1], color: '#fff', t0: now, ang: -.6, len: 70 });
          slashes.push({ x: tg[0], y: tg[1], color: '#ffb0b0', t0: now + 90, ang: -.2, len: 60 });
          burst(tg[0], tg[1], '#ff8a8a', 12, 200, 4); SFX.play('hit');
        }
        if (e.value > 0) addFloat('-' + e.value, tg[0] + rnd(-12, 12), tg[1] - 20, e.pierce ? '#d8b0ff' : '#ff6b6b', 30);
        if (e.absorbed) addFloat('ガード -' + e.absorbed, tg[0], tg[1] + 14, '#7cc4ff', 16);
        break;
      case 'heal': addFloat('+' + e.value, tg[0], tg[1] - 6, '#4ade80', 28); sparkleUp(tg[0], tg[1] + 6, '#7dffb0', 10); ring(tg[0], tg[1], '#4ade80', 8, 50, 500); SFX.play('heal'); break;
      case 'guard': addFloat('ガード +' + e.value, tg[0], tg[1] - 4, '#7cc4ff', 18); ring(tg[0], tg[1], '#5ab4ff', 6, 40, 450); burst(tg[0], tg[1], '#9fd4ff', 8, 100, 3); SFX.play('guard'); break;
      case 'stun': addFloat('スタン +' + e.value, tg[0], tg[1] - 26, '#ff9a3c', 16); ring(tg[0], tg[1], '#ff9a3c', 8, 44, 450); SFX.play('stun'); break;
      case 'poison': addFloat('毒 +' + e.value, tg[0], tg[1] + 18, '#a3c93a', 20); burst(tg[0], tg[1] + 10, '#a3c93a', 12, 70, 5, -40); SFX.play('poison'); break;
      case 'charge': addFloat('必殺 +' + e.value + '%', tg[0], tg[1] - 16, '#ffd24a', 16); sparkleUp(tg[0], tg[1], '#ffd24a', 6); ring(tg[0], tg[1], '#ffd24a', 5, 36, 450); SFX.play('charge'); break;
    }
  }

  function playerHitFx(e, action) {
    const big = action === 'strong', px = POS.player[0], py = POS.player[1] + 6;
    if (e.value > 0) {
      pa.hitAt = now; pa.strong = big;
      shake = big ? 18 : 10; flashScreen('#ff2d46', big ? .55 : .35);
      [-.9, -.5, -.1].forEach((a, i) => slashes.push({ x: px - 30 + i * 30, y: py, color: '#ff4d5e', t0: now + i * 70, ang: a, len: big ? 90 : 70, w: big ? 7 : 5 }));
      burst(px, py, '#ff6b6b', big ? 26 : 14, 240, 5);
      ring(px, py, '#ff4d5e', 10, big ? 160 : 100, 520, 6);
      addFloat('-' + e.value, px, py - 8, '#ff5964', big ? 38 : 30);
      SFX.play(big ? 'bigHit' : 'enemyHit');
    } else { addFloat('ブロック!', px, py - 8, '#7cc4ff', 26); SFX.play('guard'); }
    if (e.absorbed) {
      const sx = POS.shield[0], sy = POS.shield[1];
      ring(sx, sy, '#7cc4ff', 8, 50, 500); burst(sx, sy, '#bfe3ff', 14, 160, 4);
      addFloat('ガード -' + e.absorbed, sx, sy - 18, '#7cc4ff', 16);
    }
  }

  function beginAct(action, t) {
    const a = ACT[action];
    hold.intent = Math.max(hold.intent, now + t + a.dur);
    after(t, () => {
      ea.kind = action; ea.t0 = now; ea.dur = a.dur; ea.impact = a.impact;
      banner(a.label, a.color, 296, { small: true, dur: Math.min(a.dur, 1200), sub: snap && snap.intent ? snap.intent.detail : '' });
      SFX.play(action === 'strong' ? 'windupBig' : 'windup');
      if (action === 'strong') vign.push({ color: '#ff2d46', t0: now, dur: a.impact + 300 });
      else if (action === 'attack') vign.push({ color: '#ff7a59', t0: now, dur: a.impact, soft: true });
    });
    return { t, impact: a.impact, dur: a.dur, action };
  }

  // ロジックが返したイベント列を、時間差のある演出として並べる。戻り値は演出全体の長さ(ms)
  function playEvents(ev) {
    let tp = 0, te = null, act = null, last = null, flightEnd = 0, stones = 0, freezeAt = 0, deathEnd = 0;
    const enemyStart = () => { if (te === null) te = Math.max(tp, flightEnd) + 150; };
    for (const e of ev) {
      switch (e.type) {
        case 'placed':
          SFX.play('place');
          e.cells.forEach(c => { cellFx[c.y * N + c.x] = { kind: 'pop', at: now }; });
          break;
        case 'special': {
          const t = tp;
          after(t, () => { banner('必殺技!', '#ffd24a', 330); SFX.play('special'); flashScreen('#ffffff', .5); });
          tp += 500; break;
        }
        case 'cleared': { const t = tp; last = e; after(t, () => clearFx(e)); tp += e.lines > 0 ? 260 : 120; break; }
        case 'combo': if (e.value >= 2) { const t = tp, v = e.value; after(t, () => { banner(v + ' COMBO!', '#ffb02e', 366, { dur: 900 }); SFX.play('combo', v); }); } break;
        case 'enemyDmg': case 'heal': case 'guard': case 'stun': case 'poison': case 'charge': {
          abilityFx(e, last, tp);
          flightEnd = Math.max(flightEnd, tp + FLIGHT);
          const holdAt = now + tp + FLIGHT + 80;
          if (e.type === 'heal' || e.type === 'guard' || e.type === 'charge') hold.player = Math.max(hold.player, holdAt);
          else hold.enemy = Math.max(hold.enemy, holdAt);
          tp += 170; break;
        }
        case 'sealed': { const t = tp, ab = e.ability; after(t, () => addFloat(D.abilities[ab].name + ' は封印中!', 180, 330, '#b8b8c8', 18)); break; }
        case 'perfect': { const t = tp; after(t, () => { banner('PERFECT!', '#7dffb0', 420, { dur: 1100 }); SFX.play('perfect'); }); tp += 450; break; }
        case 'poisonTick': {
          enemyStart(); const t = te, v = e.value;
          after(t, () => { const p = POS.enemy; burst(p[0], p[1], '#a3c93a', 16, 90, 5, -40); addFloat('毒 -' + v, p[0], p[1] - 10, '#b6d84a', 22); ea.hitAt = now; SFX.play('poison'); });
          hold.enemy = Math.max(hold.enemy, now + t + 80);
          te += 700; break;
        }
        case 'enemyAct': enemyStart(); act = beginAct(e.action, te); te += act.dur; break;
        case 'playerDmg': {
          const t = act ? act.t + act.impact : Math.max(tp, flightEnd), a = act && act.action;
          after(t, () => playerHitFx(e, a));
          hold.player = Math.max(hold.player, now + t + 40);
          break;
        }
        case 'placeObstacle': {
          const land = act.t + act.impact + stones++ * 120, key = e.y * N + e.x, x = e.x, y = e.y;
          cellFx[key] = { kind: 'stone', at: now + land };
          after(land, () => { const [cx, cy] = cellCenter(x, y); burst(cx, cy + 8, '#c9b08a', 10, 110, 4); ring(cx, cy + 10, '#c9b08a', 6, 36, 350, 3); shake = Math.max(shake, 7); SFX.play('stone'); });
          break;
        }
        case 'freeze': {
          const t = act.t + act.impact;
          after(t - 250, () => { waves.push({ t0: now, dur: 700, color: '#bff0ff' }); SFX.play('freeze'); });
          e.cells.forEach((c, i) => {
            const at = t + 350 + i * 160;
            cellFx[c.y * N + c.x] = { kind: 'ice', at: now + at };
            after(at, () => { const [cx, cy] = cellCenter(c.x, c.y); burst(cx, cy, '#d8f4ff', 12, 130, 3); ring(cx, cy, '#bff0ff', 6, 34, 380, 3); });
          });
          freezeAt = t + 350 + e.cells.length * 160;
          break;
        }
        case 'enemyShield': { const t = act.t + act.impact, v = e.value; after(t, () => { const p = POS.enemy; ring(p[0], p[1], '#5aa8ff', 10, 90, 600, 6); burst(p[0], p[1], '#9fd4ff', 14, 140, 4); addFloat('ガード +' + v, p[0], p[1] - 40, '#7cc4ff', 20); SFX.play('defend'); }); break; }
        case 'seal': {
          const t = act.t + act.impact, ab = e.ability;
          after(t, () => { ring(POS.player[0], POS.player[1], '#b06bff', 10, 120, 700, 5); burst(POS.player[0], POS.player[1], '#c58bff', 18, 130, 4); addFloat(D.abilities[ab].name + ' 封印!', 180, 214, '#c58bff', 22); SFX.play('seal'); });
          break;
        }
        case 'collapse': {
          const t = (te === null ? Math.max(tp, flightEnd) : te) + 100, v = e.value;
          after(t, () => { banner('盤面崩壊!', '#ff6b6b', 330, { sub: '-' + v + ' HP' }); shake = 16; flashScreen('#ff2d46', .4); SFX.play('collapse'); });
          hold.player = Math.max(hold.player, now + t);
          te = t + 600; break;
        }
        case 'buddy': {
          const d = D.buddyMap[e.id], t = tp;
          after(t, () => { banner(d.name, '#7dffb0', 296, { small: true, sub: SCOUT.skillName(e.id), dur: 1000 }); SFX.play('perfect'); });
          tp += 450; break;
        }
        case 'recolor': {
          const t = tp, col = D.abilities[e.color].color;
          after(t, () => e.cells.forEach(c => {
            cellFx[c.y * N + c.x] = { kind: 'pop', at: now };
            const [cx, cy] = cellCenter(c.x, c.y); burst(cx, cy, col, 8, 140, 4); ring(cx, cy, col, 6, 34, 380, 3);
            SFX.play('magic');
          }));
          tp += 350; break;
        }
        case 'purify': {
          const t = tp;
          after(t, () => { e.cells.forEach(c => { const [cx, cy] = cellCenter(c.x, c.y); burst(cx, cy, '#fff6b0', 10, 130, 4); ring(cx, cy, '#fff6b0', 6, 36, 400, 3); }); SFX.play('heal'); });
          tp += 350; break;
        }
        case 'reroll': { after(tp, () => SFX.play('pick')); tp += 200; break; }
        case 'comboUp': { const t = tp, v = e.value; after(t, () => { banner('COMBO +' + v, '#ffb02e', 366, { dur: 900 }); SFX.play('combo', Math.min(10, game.combo)); }); tp += 350; break; }
        case 'enemyDown': {
          const t = Math.max(tp, flightEnd, te || 0) + 120;
          after(t, () => {
            ea.deadAt = now; const p = POS.enemy;
            burst(p[0], p[1], '#ffffff', 30, 260, 5); burst(p[0], p[1], '#ffd24a', 24, 200, 5);
            ring(p[0], p[1], '#fff', 10, 150, 700, 7); shake = 14; flashScreen('#ffffff', .5);
            banner('撃破!', '#ffd24a', 330); SFX.play('down');
          });
          deathEnd = t + 800; break;
        }
      }
    }
    return Math.max(tp, flightEnd, te || 0, freezeAt, deathEnd);
  }

  function afterAction(ev, preSnap) {
    now = performance.now();
    if (!ev) return;
    snap = preSnap;
    const total = playEvents(ev);
    busyUntil = now + total + 80;
    if (game.phase !== 'battle') { phaseAt = now + total; resultSfx = false; }
  }

  // ---------- 描画ヘルパー ----------
  const rr = (x, y, w, h, r) => A.rr(ctx, x, y, w, h, r);
  function text(str, x, y, size, color, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    ctx.fillStyle = color || '#fff';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function textO(str, x, y, size, color, align, outline, ow) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = ow || size * .22;
    ctx.strokeStyle = outline || 'rgba(10,14,30,.9)'; ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function lin(x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  function card(x, y, w, h, top, bot, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = lin(0, y, 0, y + h, [[0, top], [1, bot]]);
    rr(x, y, w, h, r || 16); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = lin(0, y, 0, y + h, [[0, 'rgba(255,255,255,.35)'], [.4, 'rgba(255,255,255,.08)'], [1, 'rgba(255,255,255,.04)']]);
    ctx.lineWidth = 1.2; rr(x + .6, y + .6, w - 1.2, h - 1.2, r || 16); ctx.stroke();
  }
  function bar(x, y, w, h, val, ghost, max, c1, c2) {
    ctx.save();
    rr(x, y, w, h, h / 2); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, w, h);
    if (ghost > val) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x, y, w * Math.min(1, ghost / max), h); }
    if (val > 0) {
      const bw = Math.max(h, w * Math.min(1, val / max));
      ctx.fillStyle = lin(x, y, x, y + h, [[0, c1], [1, c2]]); ctx.fillRect(x, y, bw, h);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x, y, bw, h * .45);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; rr(x + .5, y + .5, w - 1, h - 1, h / 2); ctx.stroke();
  }
  function button(x, y, w, h, label, color, pulse, size) {
    const k = pulse ? .5 + .5 * Math.sin(now / 220) : 0;
    ctx.save();
    ctx.shadowColor = A.rgba(color, .55 + k * .35); ctx.shadowBlur = 10 + k * 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = lin(0, y, 0, y + h, [[0, A.shade(color, .35)], [.5, color], [1, A.shade(color, -.25)]]);
    rr(x, y, w, h, h * .38); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(x + 3, y + 2, w - 6, h * .42, h * .3); ctx.fill();
    textO(label, x + w / 2, y + h / 2 + 1, size || h * .45, '#fff', 'center', A.shade(color, -.55), 3);
  }
  function disabledButton(x, y, w, h, label, size) {
    ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(x, y, w, h, h * .38); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; rr(x + .5, y + .5, w - 1, h - 1, h * .38); ctx.stroke();
    text(label, x + w / 2, y + h / 2 + 1, size || h * .45, '#6b7391', 'center', true);
  }
  function speaker(cx, cy, mode) {
    const muted = mode === 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx, cy, MUTE.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 6, cy - 2.5); ctx.lineTo(cx - 3, cy - 2.5); ctx.lineTo(cx + 1, cy - 6); ctx.lineTo(cx + 1, cy + 6); ctx.lineTo(cx - 3, cy + 2.5); ctx.lineTo(cx - 6, cy + 2.5); ctx.closePath(); ctx.fill();
    if (muted) { ctx.beginPath(); ctx.moveTo(cx + 4, cy - 3.5); ctx.lineTo(cx + 9, cy + 3.5); ctx.moveTo(cx + 9, cy - 3.5); ctx.lineTo(cx + 4, cy + 3.5); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(cx + 1, cy, 5, -.8, .8); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 1, cy, 8, -.8, .8); ctx.stroke(); }
    if (mode === 1) {   // 効果音のみ: ♪ に斜線
      ctx.fillStyle = '#ff6b8b'; ctx.beginPath(); ctx.arc(cx + 9, cy + 9, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BGM', cx + 9, cy + 9.5);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + 5, cy + 13); ctx.lineTo(cx + 13, cy + 5); ctx.stroke();
    }
    ctx.restore();
  }
  function star4(x, y, r, color, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rad = i % 2 ? r * .3 : r; ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ---------- 背景 ----------
  function drawBackground() {
    ctx.fillStyle = lin(0, 0, 0, H, [[0, '#231a52'], [.5, '#141a3d'], [1, '#0a0f24']]);
    ctx.fillRect(0, 0, W, H);
    const t = now / 1000;
    [[.2, .3, '#7b4dff'], [.85, .55, '#2a8cff'], [.4, .9, '#ff4d8d']].forEach(([fx, fy, col], i) => {
      const x = W * fx + Math.sin(t * .3 + i * 2) * 30, y = H * fy + Math.cos(t * .25 + i) * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 190);
      g.addColorStop(0, A.rgba(col, .2)); g.addColorStop(1, A.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
  }

  // ---------- 敵 ----------
  function pose() {
    const p = { ox: 0, oy: 0, sc: 1, alpha: 1, flash: 0, aura: null, auraA: 0, mood: 'idle', front: false };
    const age = now - ea.t0;
    if (ea.kind && age >= 0 && age < ea.dur) {
      const k = ea.kind, imp = ea.impact;
      if (k === 'attack' || k === 'strong') {
        const big = k === 'strong', charge = imp - 240;
        p.mood = 'angry'; p.aura = big ? '#ff2d46' : '#ff8a5a';
        if (age < charge) { const u = age / charge; p.sc = 1 + u * (big ? .22 : .12); p.oy = -u * (big ? 12 : 6); p.ox = Math.sin(age / 25) * u * (big ? 4 : 1.5); p.auraA = u; }
        else if (age < imp) { const u = A.ease((age - charge) / (imp - charge)); p.sc = (big ? 1.22 : 1.12) + u * .32; p.oy = -(big ? 12 : 6) + u * (big ? 84 : 72); p.auraA = 1; p.front = true; }
        else { const u = A.easeInOut((age - imp) / (ea.dur - imp)); p.sc = (big ? 1.54 : 1.44) * (1 - u) + u; p.oy = (big ? 72 : 66) * (1 - u); p.auraA = 1 - u; p.front = u < .6; }
      } else {
        const u = Math.sin(Math.PI * A.clamp(age / ea.dur, 0, 1));
        p.mood = 'angry'; p.sc = 1 + u * .16; p.oy = -u * 8; p.aura = ACT[k].color; p.auraA = u;
      }
    }
    p.sc *= 1 + .012 * Math.sin(now / 400);
    const hu = now - ea.hitAt;
    if (hu >= 0 && hu < 260) { const k = 1 - hu / 260; p.flash = k; p.ox += (Math.random() - .5) * 12 * k; p.oy += (Math.random() - .5) * 6 * k; }
    const iu = (now - ea.introAt) / 550;
    if (iu < 1) { p.alpha *= A.clamp(iu * 1.6, 0, 1); p.sc *= .6 + .4 * A.ease(iu); p.oy -= (1 - A.ease(iu)) * 24; }
    if (ea.deadAt !== null) {
      const du = (now - ea.deadAt) / 750;
      p.alpha *= A.clamp(1 - du, 0, 1); p.sc *= 1 + du * .25; p.flash = Math.max(p.flash, A.clamp(1 - du * 1.5, 0, 1)); p.front = false;
    }
    return p;
  }

  // spr に描いた敵に、上から光・下に影の陰影と、濃い輪郭線をつけて spr2 に仕上げる（全員の見た目がそろう）
  function polishSprite() {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-atop';
    const g = sctx.createLinearGradient(0, 0, 0, 440);
    g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,6,40,.26)');
    sctx.fillStyle = g; sctx.fillRect(0, 0, 440, 440);
    const rim = sctx.createRadialGradient(140, 110, 10, 140, 110, 240);
    rim.addColorStop(0, 'rgba(255,255,255,.14)'); rim.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = rim; sctx.fillRect(0, 0, 440, 440);
    sctx.globalCompositeOperation = 'source-over';
    sctx2.setTransform(1, 0, 0, 1, 0, 0);
    sctx2.clearRect(0, 0, 440, 440);
    for (let i = 0; i < 12; i++) {                 // 1 周ぶん少しずらして重ねる → 輪郭のもと
      const a = i / 12 * Math.PI * 2;
      sctx2.drawImage(spr, Math.cos(a) * 3.4, Math.sin(a) * 3.4);
    }
    sctx2.globalCompositeOperation = 'source-in';
    sctx2.fillStyle = 'rgba(14,10,32,.92)'; sctx2.fillRect(0, 0, 440, 440);
    sctx2.globalCompositeOperation = 'source-over';
    sctx2.drawImage(spr, 0, 0);
  }

  function drawEnemyArt(p) {
    if (p.alpha <= .01) return;
    const def = game.enemy.def, base = ART_POS.scale * ART_SCALE[def.art] * (def.size || 1);
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, 440, 440);
    sctx.setTransform(1.8, 0, 0, 1.8, 220, 220);
    A.enemyArt(sctx, def.art, now / 1000, p.mood);
    polishSprite();
    if (p.flash > 0) {
      sctx2.globalCompositeOperation = 'source-atop';
      sctx2.fillStyle = 'rgba(255,255,255,' + p.flash * .9 + ')'; sctx2.fillRect(0, 0, 440, 440);
      sctx2.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.translate(ART_POS.x + p.ox, ART_POS.y + p.oy);
    if (p.aura && p.auraA > 0) {
      const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 100 * p.sc);
      g.addColorStop(0, A.rgba(p.aura, .55 * p.auraA)); g.addColorStop(1, A.rgba(p.aura, 0));
      ctx.fillStyle = g; ctx.fillRect(-150, -150, 300, 300);
    }
    if (game.enemy.shield > 0 && ea.deadAt === null) {      // ガード中は青いバリアをまとう
      const k = .5 + .5 * Math.sin(now / 300), r = 62 * p.sc * ART_SCALE[def.art];
      ctx.strokeStyle = 'rgba(120,190,255,' + (.5 + k * .3) + ')'; ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(120,190,255,.14)';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = p.alpha;
    ctx.scale(base * p.sc, base * p.sc);
    ctx.drawImage(spr2, -122, -122, 244, 244);
    ctx.restore();
  }

  function drawEnemyCard(p) {
    const s = game, e = s.enemy, def = e.def, th = A.theme(def.theme || def.art);
    card(EN.x, EN.y, EN.w, EN.h, th.sky[0], th.sky[1], 16);
    A.sceneBg(ctx, EN.x, EN.y, EN.w, EN.h, def.theme || def.art, now / 1000);
    if (!p.front) drawEnemyArt(p);

    // 名前・ステージ
    textO(def.name, 22, 24, 17, '#fff', 'left');
    if (def.boss) { ctx.fillStyle = '#ff4d6d'; rr(22 + ctx.measureText(def.name).width + 8, 15, 42, 16, 8); ctx.fill(); text('BOSS', 22 + ctx.measureText(def.name).width + 29, 23.5, 10, '#fff', 'center', true); }
    for (let i = 0; i < s.enemies.length; i++) {
      ctx.fillStyle = i < s.enemyIndex ? '#ffd24a' : i === s.enemyIndex ? '#fff' : 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(226 + i * 16, 24, 4.5, 0, 7); ctx.fill();
    }
    speaker(MUTE.x, MUTE.y, SFX.mode);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(QUIT.x, QUIT.y, QUIT.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(QUIT.x - 4, QUIT.y - 4); ctx.lineTo(QUIT.x + 4, QUIT.y + 4); ctx.moveTo(QUIT.x + 4, QUIT.y - 4); ctx.lineTo(QUIT.x - 4, QUIT.y + 4); ctx.stroke();
    // HP
    bar(20, 38, 320, 14, vis.eHp, vis.eGhost, e.maxHp, '#ff6a6a', '#d02a3a');
    textO('HP ' + Math.ceil(vis.eHp) + ' / ' + e.maxHp, 180, 45.5, 11, '#fff', 'center', 'rgba(60,0,10,.8)', 2.5);
    // 状態チップ
    let cx = 20;
    const chip = (label, color) => {
      ctx.font = 'bold 11px ' + FONT; const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(8,12,28,.7)'; rr(cx, 58, w, 17, 8.5); ctx.fill();
      ctx.strokeStyle = A.rgba(color, .8); ctx.lineWidth = 1; rr(cx + .5, 58.5, w - 1, 16, 8); ctx.stroke();
      text(label, cx + w / 2, 66.8, 11, color, 'center', true); cx += w + 6;
    };
    if (e.shield > 0) chip('🛡 ガード ' + e.shield, '#7cc4ff');
    if (e.poison) chip('☠ 毒 ' + e.poison.amount + '×' + e.poison.turns, '#b6d84a');
    if (game.seal) chip('🔇 ' + D.abilities[game.seal.ability].name + '封印 ' + game.seal.turns, '#c58bff');

    // 次の行動
    const holding = now < hold.intent && snap;
    const it = holding ? snap.intent : L.intentInfo(s);
    const cnt = holding ? 0 : Math.max(0, e.countdown);
    const danger = it.danger, py = 138;
    ctx.fillStyle = danger ? 'rgba(120,10,30,.8)' : 'rgba(8,12,28,.72)';
    rr(20, py, 236, 30, 15); ctx.fill();
    ctx.strokeStyle = danger ? 'rgba(255,80,100,' + (.6 + .4 * Math.sin(now / 150)) + ')' : 'rgba(255,255,255,.18)';
    ctx.lineWidth = danger ? 1.8 : 1; rr(20.5, py + .5, 235, 29, 15); ctx.stroke();
    text(it.icon, 38, py + 16, 17, '#fff', 'center');
    text(it.text, 54, py + 9.5, 12, danger ? '#ff9aa6' : '#e6ebff', 'left', true);
    text(it.detail, 54, py + 22, 10, '#9aa3c4', 'left');
    // カウント
    const [rx, ry] = POS.count, cmax = e.maxCount;
    ctx.fillStyle = 'rgba(8,12,28,.72)'; ctx.beginPath(); ctx.arc(rx, ry, 26, 0, 7); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(rx, ry, 22, 0, 7); ctx.stroke();
    const low = cnt <= 1;
    ctx.strokeStyle = low ? '#ff5964' : '#ffd24a'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(rx, ry, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, cnt / cmax)); ctx.stroke();
    const pulse = low && !holding ? 1 + .08 * Math.sin(now / 120) : 1;
    ctx.save(); ctx.translate(rx, ry); ctx.scale(pulse, pulse);
    textO(String(cnt), 0, 1, 24, low ? '#ff8a94' : '#fff', 'center', 'rgba(8,12,28,.9)', 3);
    ctx.restore();
    text('行動まで', rx, ry + 38, 9.5, '#cfd6ee', 'center', true);
    if (p.front) drawEnemyArt(p);
  }

  // ---------- プレイヤー ----------
  function drawPlayerCard() {
    const g = game, pl = g.player;
    ctx.save();
    const age = now - pa.hitAt;
    if (age >= 0 && age < 350) { const k = 1 - age / 350; ctx.translate((Math.random() - .5) * 10 * k, (Math.random() - .5) * 6 * k); }
    card(PL.x, PL.y, PL.w, PL.h, '#2a3466', '#171f45', 14);
    if (age >= 0 && age < 450) { ctx.fillStyle = 'rgba(255,45,70,' + (.35 * (1 - age / 450)) + ')'; rr(PL.x, PL.y, PL.w, PL.h, 14); ctx.fill(); }
    A.icon(ctx, 'heal', 27, 199, 8);
    bar(42, 191, 190, 16, vis.pHp, vis.pGhost, pl.maxHp, '#4ade80', '#1f9d57');
    textO(Math.ceil(vis.pHp) + ' / ' + pl.maxHp, 137, 199.5, 11, '#fff', 'center', 'rgba(0,40,20,.8)', 2.5);
    // シールド
    ctx.fillStyle = 'rgba(8,12,28,.6)'; rr(246, 190, 94, 18, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(124,196,255,.7)'; ctx.lineWidth = 1; rr(246.5, 190.5, 93, 17, 8.5); ctx.stroke();
    A.icon(ctx, 'guard', 262, 199, 6.5);
    textO(String(Math.round(vis.pSh)), 280, 199.5, 12, '#bfe3ff', 'left', 'rgba(8,12,28,.9)', 2.5);
    text('/ ' + C.shieldCap, 304, 199.5, 10, '#7f9bbf', 'left');
    // 必殺ゲージ
    A.icon(ctx, 'charge', 27, 224, 8);
    bar(42, 218, 190, 12, vis.gauge, 0, 100, '#ffd24a', '#e08a1e');
    textO(Math.floor(vis.gauge) + '%', 137, 224.5, 9.5, '#fff', 'center', 'rgba(60,30,0,.8)', 2.5);
    const ready = pl.gauge >= 100 && g.phase === 'battle';
    if (ready) button(SPECIAL.x, SPECIAL.y, SPECIAL.w, SPECIAL.h, '必殺技!', '#f0a020', true, 14);
    else disabledButton(SPECIAL.x, SPECIAL.y, SPECIAL.w, SPECIAL.h, '必殺技');
    ctx.restore();
    drawBuddyBar();
  }

  // ---------- 盤面 ----------
  function drawBoard(pv) {
    const { x: bx, y: by, cs } = BOARD, bw = cs * N;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    ctx.fillStyle = lin(0, by - 8, 0, by + bw + 8, [[0, '#2d3a78'], [1, '#18204a']]);
    rr(bx - 8, by - 8, bw + 16, bw + 16, 16); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; rr(bx - 7.5, by - 7.5, bw + 15, bw + 15, 15.5); ctx.stroke();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = (x + y) % 2 ? 'rgba(10,14,40,.62)' : 'rgba(10,14,40,.48)';
      rr(bx + x * cs + 1.5, by + y * cs + 1.5, cs - 3, cs - 3, 6); ctx.fill();
    }
    // 消えるライン予告
    if (pv && pv.valid) {
      const k = .5 + .5 * Math.sin(now / 130);
      ctx.fillStyle = 'rgba(255,225,110,' + (.16 + k * .12) + ')';
      pv.lines.rows.forEach(r => { rr(bx, by + r * cs, bw, cs, 8); ctx.fill(); });
      pv.lines.cols.forEach(c => { rr(bx + c * cs, by, cs, bw, 8); ctx.fill(); });
    }
    const falling = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = game.board[y][x];
      if (!c) continue;
      const fx = cellFx[y * N + x], px = bx + x * cs, py = by + y * cs;
      const o = { stone: c.obstacle === 'stone', ice: c.obstacle === 'ice' };
      if (fx) {
        if (fx.kind === 'stone') {
          const u = (now - (fx.at - 260)) / 260;
          if (u < 1) { if (u > 0) falling.push({ px, py, u, o }); continue; }
        } else if (fx.kind === 'ice') {
          if (now < fx.at) o.ice = false; else if (now - fx.at < 260) o.scale = 1 + .12 * (1 - (now - fx.at) / 260);
        } else if (fx.kind === 'pop') {
          const u = (now - fx.at) / 240;
          if (u < 1) o.scale = 1 + .22 * Math.sin(Math.PI * u) * (1 - u * .4);
        }
      }
      A.block(ctx, px, py, cs, c.ability, o);
    }
    // 落下中の石（予告の影つき）
    falling.forEach(f => {
      ctx.fillStyle = 'rgba(0,0,0,' + (.15 + .25 * f.u) + ')';
      ctx.beginPath(); ctx.ellipse(f.px + cs / 2, f.py + cs * .75, cs * (.15 + .3 * f.u), cs * .1, 0, 0, 7); ctx.fill();
      A.block(ctx, f.px, f.py - (1 - f.u * f.u) * 240, cs, 'none', f.o);
    });
    // 消去アニメ（残像）
    ghosts = ghosts.filter(g => now - g.t0 < 380);
    ghosts.forEach(g => {
      const u = (now - g.t0) / 380, px = bx + g.x * cs, py = by + g.y * cs;
      ctx.globalAlpha = 1 - u;
      A.block(ctx, px, py, cs, g.ability, { scale: 1 + .35 * u, ice: g.ice, stone: g.stone, rot: u * .35 * (g.x % 2 ? 1 : -1) });
      if (u < .4) { ctx.fillStyle = 'rgba(255,255,255,' + (.85 * (1 - u / .4)) + ')'; rr(px + 2, py + 2, cs - 4, cs - 4, 8); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    beams = beams.filter(b => now - b.t0 < 420);
    beams.forEach(b => {
      const u = (now - b.t0) / 420, a = (1 - u) * .85;
      if (b.row !== undefined) {
        const y = by + b.row * cs, g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        const hx = Math.min(1, u * 1.6);
        g.addColorStop(Math.max(0, hx - .3), 'rgba(255,255,255,0)'); g.addColorStop(hx, 'rgba(255,255,255,' + a + ')'); g.addColorStop(Math.min(1, hx + .001), 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(bx - 4, y + cs * .2, bw + 8, cs * .6);
      } else {
        const x = bx + b.col * cs, g = ctx.createLinearGradient(0, by, 0, by + bw);
        const hy = Math.min(1, u * 1.6);
        g.addColorStop(Math.max(0, hy - .3), 'rgba(255,255,255,0)'); g.addColorStop(hy, 'rgba(255,255,255,' + a + ')'); g.addColorStop(Math.min(1, hy + .001), 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x + cs * .2, by - 4, cs * .6, bw + 8);
      }
    });
    // 凍結の波
    waves = waves.filter(w => now - w.t0 < w.dur);
    waves.forEach(w => {
      const u = (now - w.t0) / w.dur, x = bx - 60 + (bw + 120) * u;
      const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
      g.addColorStop(0, 'rgba(160,230,255,0)'); g.addColorStop(.5, 'rgba(190,240,255,.55)'); g.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.save(); rr(bx - 4, by - 4, bw + 8, bw + 8, 12); ctx.clip();
      ctx.fillStyle = g; ctx.fillRect(x - 60, by - 4, 120, bw + 8); ctx.restore();
    });
    // 配置プレビュー
    if (pv) {
      pv.piece.cells.forEach(([x, y]) => {
        const gx = pv.col + x, gy = pv.row + y;
        if (gx < 0 || gy < 0 || gx >= N || gy >= N) return;
        if (pv.valid) A.block(ctx, bx + gx * cs, by + gy * cs, cs, pv.piece.ability, { alpha: .5 });
        else { ctx.fillStyle = 'rgba(255,70,90,.3)'; rr(bx + gx * cs + 2, by + gy * cs + 2, cs - 4, cs - 4, 7); ctx.fill(); }
      });
    }
    // バディのスキルの効果範囲
    if (bt && bt.cell) {
      const k = .5 + .5 * Math.sin(now / 110), col = bt.color ? D.abilities[bt.color].color : '#ff7a59';
      L.buddyArea(game, bt.slot, bt.cell.x, bt.cell.y).forEach(c => {
        ctx.fillStyle = A.rgba(col, .35 + k * .2); rr(bx + c.x * cs + 2, by + c.y * cs + 2, cs - 4, cs - 4, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; rr(bx + c.x * cs + 2.5, by + c.y * cs + 2.5, cs - 5, cs - 5, 7); ctx.stroke();
      });
    }
  }

  // ---------- バディ ----------
  function drawBuddyBar() {
    const g = game;
    if (bt) text(bt.need.color && !bt.color ? 'いろをえらぶ' : 'ばしょをなぞる', 16, 259, 12, '#ffe08a', 'left', true);
    else if (g.combo >= 2) {
      const k = 1 + .06 * Math.sin(now / 120);
      ctx.save(); ctx.translate(16, 259); ctx.scale(k, k);
      textO('COMBO ×' + g.combo, 0, 0, 14, '#ffd24a', 'left', 'rgba(60,30,0,.9)', 3); ctx.restore();
    } else if (g.level) text('CHALLENGE Lv' + g.level, 16, 259, 10.5, '#ff9a9a', 'left', true);
    for (let i = 0; i < 2; i++) {
      const R = BUD[i], b = g.buddies[i];
      if (!b) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; rr(R.x + .5, R.y + .5, R.w - 1, R.h - 1, 14); ctx.stroke(); ctx.setLineDash([]);
        text('バディなし', R.x + R.w / 2, R.y + 15, 10, '#5d668c', 'center', true);
        continue;
      }
      const d = D.buddyMap[b.id], col = RARC[d.rarity], ready = !b.used && g.phase === 'battle' && now >= busyUntil;
      const sel = bt && bt.slot === i, k = .5 + .5 * Math.sin(now / 160);
      ctx.save();
      if (ready) { ctx.shadowColor = col; ctx.shadowBlur = 6 + k * 6; }
      ctx.fillStyle = b.used ? 'rgba(8,12,28,.55)' : lin(0, R.y, 0, R.y + R.h, [[0, A.rgba(col, .55)], [1, A.rgba(col, .22)]]);
      rr(R.x, R.y, R.w, R.h, 14); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = sel ? 'rgba(255,255,255,' + (.6 + k * .4) + ')' : b.used ? 'rgba(255,255,255,.12)' : col; ctx.lineWidth = sel ? 2.5 : 1.3;
      rr(R.x + .6, R.y + .6, R.w - 1.2, R.h - 1.2, 14); ctx.stroke();
      ctx.globalAlpha = b.used ? .35 : 1;
      text(d.emoji, R.x + 16, R.y + 15, 17, '#fff', 'center');
      text(d.name, R.x + 32, R.y + 9.5, 10, '#fff', 'left', true);
      text(b.used ? 'つかった' : SCOUT.skillName(b.id), R.x + 32, R.y + 21, 9, b.used ? '#9aa3c4' : '#e6ebff', 'left');
      if (b.lv > 1) text('Lv' + b.lv, R.x + R.w - 8, R.y + 9.5, 8.5, '#ffe08a', 'right', true);
      ctx.globalAlpha = 1;
    }
  }

  // バディのスキルで色や場所を選ぶ間、手札のかわりに出るパネル
  function drawBuddyPanel() {
    const y = SLOT.y, h = SLOT.h;
    ctx.fillStyle = lin(0, y, 0, y + h, [[0, 'rgba(60,50,110,.85)'], [1, 'rgba(26,22,62,.9)']]);
    rr(12, y, 336, h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,138,.5)'; ctx.lineWidth = 1.2; rr(12.6, y + .6, 334.8, h - 1.2, 14); ctx.stroke();
    if (bt.need.color && !bt.color) {
      text(D.buddyMap[game.buddies[bt.slot].id].emoji + ' ' + SCOUT.skillName(game.buddies[bt.slot].id) + ' — どの色にする？', 22, y + 11, 11, '#ffe08a', 'left', true);
      PALETTE.forEach((a, i) => { A.block(ctx, 36 + i * 44 - 17, y + 22, 34, a, { scale: 1 + .05 * Math.sin(now / 200 + i) }); });
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(337, y + 39, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(332, y + 34); ctx.lineTo(342, y + 44); ctx.moveTo(342, y + 34); ctx.lineTo(332, y + 44); ctx.stroke();
    } else {
      if (bt.color) A.block(ctx, 24, y + 14, 38, bt.color);
      text('ばしょをタップ（なぞると範囲が見える）', bt.color ? 72 : 24, y + 26, 11, '#ffe08a', 'left', true);
      text('はなした場所で発動！', bt.color ? 72 : 24, y + 46, 10.5, '#cfd6ee', 'left');
      button(256, y + 14, 80, 38, 'やめる', '#c0485a', false, 13);
    }
  }

  function drawHand() {
    if (bt) { drawBuddyPanel(); return; }
    for (let i = 0; i < C.handSize; i++) {
      const x = SLOT.x0 + i * (SLOT.w + SLOT.gap), y = SLOT.y;
      ctx.fillStyle = lin(0, y, 0, y + SLOT.h, [[0, 'rgba(48,60,120,.75)'], [1, 'rgba(22,30,70,.85)']]);
      rr(x, y, SLOT.w, SLOT.h, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; rr(x + .5, y + .5, SLOT.w - 1, SLOT.h - 1, 14); ctx.stroke();
      const p = game.hand[i];
      if (!p || (drag && drag.index === i)) continue;
      const cs = Math.min(20, (SLOT.w - 14) / L.pieceW(p), (SLOT.h - 12) / L.pieceH(p));
      const ox = x + (SLOT.w - cs * L.pieceW(p)) / 2, oy = y + (SLOT.h - cs * L.pieceH(p)) / 2;
      const ok = L.canPlaceAnywhere(game.board, p);
      const bob = ok && !drag ? Math.sin(now / 500 + i) * 1.2 : 0;
      p.cells.forEach(([cx, cy]) => A.block(ctx, ox + cx * cs, oy + cy * cs + bob, cs, p.ability, { alpha: ok ? 1 : .35 }));
    }
  }

  function dragTarget() {
    const p = game.hand[drag.index], cs = BOARD.cs;
    const tlx = drag.x - L.pieceW(p) * cs / 2, tly = drag.y - LIFT - L.pieceH(p) * cs / 2;
    const col = Math.round((tlx - BOARD.x) / cs), row = Math.round((tly - BOARD.y) / cs);
    const valid = L.canPlace(game.board, p, col, row);
    return { piece: p, col, row, valid, lines: valid ? L.previewLines(game.board, p, col, row) : null, tlx, tly };
  }

  // ---------- エフェクト層 ----------
  function drawFx() {
    // 弾（セルから対象へ飛ぶ光球）
    orbs = orbs.filter(o => now - o.t0 < o.dur + 30);
    orbs.forEach(o => {
      const u = (now - o.t0) / o.dur;
      if (u < 0) return;
      const e = A.easeInOut(u);
      const x = o.x0 + (o.x1 - o.x0) * e, y = o.y0 + (o.y1 - o.y0) * e - Math.sin(Math.PI * e) * o.lift - Math.sin(Math.PI * e) * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, '#fff'); g.addColorStop(.35, A.rgba(o.color, .95)); g.addColorStop(1, A.rgba(o.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
      if (Math.random() < .8) particles.push({ x, y, vx: rnd(-14, 14), vy: rnd(-14, 14), g: 0, t0: now, life: 300, size: 3.2, color: o.color });
    });
    // 斬撃
    slashes = slashes.filter(s => now - s.t0 < 320);
    slashes.forEach(s => {
      const u = (now - s.t0) / 320;
      if (u < 0) return;
      const len = s.len * A.ease(u * 2.2);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang - 1.0);
      ctx.globalAlpha = 1 - u; ctx.strokeStyle = s.color; ctx.lineCap = 'round';
      ctx.shadowColor = s.color; ctx.shadowBlur = 10;
      ctx.lineWidth = (s.w || 5) * (1 - u * .6);
      ctx.beginPath(); ctx.moveTo(-len, -len * .12); ctx.lineTo(len, len * .12); ctx.stroke();
      ctx.restore();
    });
    rings = rings.filter(r => now - r.t0 < r.dur);
    rings.forEach(r => {
      const u = A.ease((now - r.t0) / r.dur);
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - u * .7);
      ctx.shadowColor = r.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * u, 0, 7); ctx.stroke(); ctx.restore();
    });
    particles = particles.filter(p => now - p.t0 < p.life);
    particles.forEach(p => {
      const age = (now - p.t0) / 1000;
      if (age < 0) return;
      const u = (now - p.t0) / p.life, x = p.x + p.vx * age, y = p.y + p.vy * age + .5 * p.g * age * age;
      ctx.globalAlpha = 1 - u;
      if (p.star) star4(x, y, p.size * 1.6 * (1 - u * .5), p.color, 1);
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, p.size * (1 - u * .5), 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    floats = floats.filter(f => now - f.t0 < 1100);
    floats.forEach(f => {
      const u = (now - f.t0) / 1100;
      if (u < 0) return;
      const pop = 1 + .5 * Math.max(0, 1 - u * 6), y = f.y - A.ease(u) * 46;
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (u - .6) / .4); ctx.translate(f.x, y); ctx.scale(pop, pop);
      textO(f.text, 0, 0, f.size, f.color, 'center'); ctx.restore();
    });
  }

  function drawBanners() {
    banners = banners.filter(b => now - b.t0 < b.dur);
    banners.forEach(b => {
      const age = now - b.t0, u = age / b.dur;
      const inU = A.ease(age / 200), out = u > .72 ? (u - .72) / .28 : 0, hh = b.small ? 40 : 64;
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate((1 - inU) * -W * .6 + out * W * .3, 0);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, A.rgba(b.color, 0)); g.addColorStop(.2, A.rgba(A.shade(b.color, -.55), .88)); g.addColorStop(.8, A.rgba(A.shade(b.color, -.55), .88)); g.addColorStop(1, A.rgba(b.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-20, b.y - hh / 2); ctx.lineTo(W + 20, b.y - hh / 2 - 6); ctx.lineTo(W + 20, b.y + hh / 2 - 6); ctx.lineTo(-20, b.y + hh / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = A.rgba(b.color, .9); ctx.fillRect(0, b.y - hh / 2 - 1, W, 2); ctx.fillRect(0, b.y + hh / 2 - 1, W, 2);
      const pop = 1 + .35 * Math.max(0, 1 - age / 260);
      ctx.translate(W / 2, b.y - (b.sub ? 5 : 0)); ctx.scale(pop, pop);
      textO(b.text, 0, 0, b.small ? 24 : 38, '#fff', 'center', A.shade(b.color, -.5), b.small ? 5 : 7);
      ctx.restore();
      if (b.sub) { ctx.save(); ctx.globalAlpha = 1 - out; text(b.sub, W / 2, b.y + (b.small ? 14 : 22), 12, '#fff', 'center', true); ctx.restore(); }
    });
    vign = vign.filter(v => now - v.t0 < v.dur);
    vign.forEach(v => {
      const u = (now - v.t0) / v.dur, a = (v.soft ? .25 : .45) * Math.sin(Math.PI * Math.min(1, u)) * (.7 + .3 * Math.sin(now / 70));
      const g = ctx.createRadialGradient(W / 2, H * .35, 120, W / 2, H * .35, 460);
      g.addColorStop(0, A.rgba(v.color, 0)); g.addColorStop(1, A.rgba(v.color, a));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    if (flashFx) {
      const u = (now - flashFx.t0) / flashFx.dur;
      if (u >= 1) flashFx = null;
      else { ctx.fillStyle = A.rgba(flashFx.color, flashFx.a * (1 - u)); ctx.fillRect(0, 0, W, H); }
    }
  }

  // ---------- オーバーレイ ----------
  // 結果画面が出た時点で 1 回だけコインを確定してセーブする
  function finalizeResult(quit) {
    if (resultInfo) return;
    const cleared = game.phase === 'clear', defeated = cleared ? game.enemies.length : game.enemyIndex;
    const stars = cleared ? L.stars(game) : 0;
    if (game.stage.scout) { resultInfo = SCOUT.finish(SV.data, game, cleared, defeated); return; }
    resultInfo = EQ.applyResult(SV.data, game.stageIndex, defeated, cleared, stars, game.mods, game.level);
  }
  function drawQuitAsk() {
    ctx.fillStyle = 'rgba(6,9,22,.8)'; ctx.fillRect(0, 0, W, H);
    card(40, 230, 280, 170, '#31407f', '#1a2250', 20);
    textO('ステージをやめますか?', 180, 270, 19, '#fff', 'center');
    text('倒した敵ぶんのコインはもらえます', 180, 304, 12, '#9aa3c4', 'center');
    button(56, 336, 110, 44, 'つづける', '#2fbf71', true, 15);
    button(194, 336, 110, 44, 'やめる', '#c0485a', false, 15);
  }
  function overlayReady() { return game.phase !== 'battle' && now - phaseAt > OVERLAY_DELAY; }
  function drawOverlay() {
    if (!overlayReady()) return;
    const ph = game.phase, age = now - phaseAt - OVERLAY_DELAY, k = A.ease(age / 350);
    if (!resultSfx) { resultSfx = true; const jn = ph === 'lose' ? 'lose' : 'win'; if (!MUSIC.jingle(jn)) SFX.play(jn); }
    ctx.fillStyle = 'rgba(6,9,22,' + .78 * k + ')'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 30);
    if (ph === 'next') {
      card(30, 190, 300, 270, '#31407f', '#1a2250', 22);
      textO('撃破!', 180, 245, 44, '#ffd24a', 'center');
      text(game.enemy.def.name + ' を倒した', 180, 295, 16, '#fff', 'center', true);
      text('HP が ' + (C.healBetween + game.mods.healBetween) + ' 回復して次の敵へ', 180, 325, 13, '#9aa3c4', 'center');
      text('次の相手：' + game.enemies[game.enemyIndex + 1].name, 180, 355, 13, '#cfd6ee', 'center', true);
      button(80, 390, 200, 50, '次の敵へ', '#2fbf71', true);
    } else {
      const win = ph === 'clear';
      card(24, 100, 312, 460, win ? '#3a4a8a' : '#4a2a4a', win ? '#1a2250' : '#201030', 22);
      const sc = game.stage.scout;
      textO(sc ? (win ? 'スカウト成功!' : 'スカウト失敗…') : game.level ? (win ? 'チャレンジ成功!' : 'チャレンジ失敗…') : (win ? 'ステージクリア!' : 'やられた…'), 180, 150, sc || game.level ? 32 : 36, win ? '#ffd24a' : '#ff7a8a', 'center');
      if (win && !sc) {
        const n = L.stars(game);
        for (let i = 0; i < 3; i++) {
          const u = A.ease((age - 300 - i * 220) / 300), on = i < n;
          if (u <= 0) continue;
          ctx.save(); ctx.translate(110 + i * 70, 215); ctx.scale(u * 1.0 + (1 - u) * 2, u + (1 - u) * 2); ctx.globalAlpha = u;
          star5(0, 0, 30, on ? '#ffd24a' : 'rgba(255,255,255,.15)'); ctx.restore();
        }
      }
      const rows = [['与えた総ダメージ', game.totalDamage], ['最大コンボ', game.maxCombo], ['残り HP', game.player.hp + ' / ' + game.player.maxHp], ['配置数', game.placements], ['到達', (game.enemyIndex + 1) + ' / ' + game.enemies.length + ' 体目']];
      rows.forEach(([kk, v], i) => {
        const y = 280 + i * 30;
        ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(50, y - 13, 260, 26, 8); ctx.fill();
        text(kk, 64, y, 14, '#aab3d4', 'left'); text(String(v), 296, y, 16, '#fff', 'right', true);
      });
      finalizeResult();
      const ri = resultInfo, cu = A.ease((age - 700) / 900);
      ctx.fillStyle = 'rgba(255,210,74,.12)'; rr(40, 432, 280, 56, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,74,.5)'; ctx.lineWidth = 1; rr(40.5, 432.5, 279, 55, 12); ctx.stroke();
      text('獲得コイン', 56, 452, 13, '#e6d9a8', 'left', true);
      textO('🪙 +' + Math.round(ri.total * cu), 304, 452, 22, '#ffe08a', 'right');
      const notes = [];
      if (ri.level) notes.push('難易度 Lv' + ri.level + ' ×' + ri.mult.toFixed(2));
      if (ri.first) notes.push('初クリアボーナス込み');
      if (ri.bonus) notes.push('装備ボーナス +' + ri.bonus);
      if (sc && win) notes.push('スカウト場にバディが現れた！');
      text(notes.join(' / ') || (win ? '' : '倒した敵ぶんのコイン'), 180, 476, 10.5, '#b9a96a', 'center');
      if (sc && win) button(80, 500, 200, 46, 'スカウト場へ', '#2fbf71', true, 16);
      else {
        button(36, 500, 138, 46, 'もう一度', '#2fbf71', false, 15);
        button(186, 500, 138, 46, sc ? 'スカウトへ' : game.level ? 'チャレンジへ' : 'ステージ選択', '#2f7bff', true, 15);
      }
    }
    ctx.restore();
  }
  function star5(x, y, r, color) {
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = color.startsWith('#') ? 14 : 0;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  }

  // ---------- タイトル ----------
  function drawTitle(dt) {
    drawBackground();
    titleBlocks.forEach(b => {
      b.y += b.v * dt; b.r += dt * .3; if (b.y > H + 40) b.y = -40;
      A.block(ctx, b.x, b.y, b.s, b.ab, { alpha: .35, rot: b.r });
    });
    const bob = Math.sin(now / 600) * 4;
    ctx.save(); ctx.translate(180, 130 + bob);
    ctx.shadowColor = 'rgba(160,110,255,.8)'; ctx.shadowBlur = 24;
    ctx.font = 'bold 50px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = '#2a1670'; ctx.strokeText('バトル', 0, -26); ctx.strokeText('ブラスト', 0, 28);
    ctx.shadowBlur = 0;
    ctx.fillStyle = lin(0, -60, 0, 60, [[0, '#fff6c0'], [.5, '#ffc93d'], [1, '#ff7a3d']]);
    ctx.fillText('バトル', 0, -26); ctx.fillText('ブラスト', 0, 28);
    ctx.restore();
    text('ブロックパズル × ターン制バトル', 180, 210, 13, '#b9c2f0', 'center', true);

    const items = ['attack', 'magic', 'heal', 'guard', 'poison', 'charge', 'stun'];
    card(24, 238, 312, 150, 'rgba(60,72,140,.95)', 'rgba(24,32,76,.95)', 16);
    items.forEach((k, i) => {
      const a = D.abilities[k], x = 40 + (i % 4) * 76, y = 262 + Math.floor(i / 4) * 40;
      A.block(ctx, x, y - 14, 28, k);
      text(a.name, x + 32, y, 11, '#fff', 'left', true);
    });
    text('消したマスの色の能力が発動して敵と戦う', 180, 338, 12, '#cfd6ee', 'center');
    text('ピースを丸ごと消す・同時消し・コンボで効果アップ', 180, 360, 12, '#cfd6ee', 'center');
    text('敵の予告を見て、攻めるか守るかを選ぼう', 180, 380, 12, '#9aa3c4', 'center');
    button(80, 440, 200, 56, 'スタート', '#2fbf71', true, 22);
    speaker(MUTE.x, 600, SFX.mode);
    text('ver. ' + ((document.querySelector('meta[name="game-version"]') || {}).content || 'dev'), 8, 630, 9, 'rgba(255,255,255,.35)', 'left');
    if (!MUSIC.ready) text(MUSIC.progress > 0 ? '♪ 音源を読み込み中… ' + Math.round(MUSIC.progress * 100) + '%' : '♪ タップで音が出ます', 180, 600, 11, '#8e98c8', 'center');
  }

  // ---------- 全体 ----------
  // 動作確認用: 全ての敵を一覧で描く（BB.debug.sheet = true）
  function drawSheet() {
    ctx.fillStyle = '#1a2040'; ctx.fillRect(0, 0, W, H);
    Object.keys(D.enemies).forEach((id, i) => {
      const def = D.enemies[id], x = (i % 4) * 90 + 45, y = Math.floor(i / 4) * 104 + 54;
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, 440, 440); sctx.setTransform(1.8, 0, 0, 1.8, 220, 220);
      A.enemyArt(sctx, def.art, now / 1000, sheetMood); polishSprite();
      ctx.save(); ctx.translate(x, y); ctx.scale(.44 * A.fit[def.art], .44 * A.fit[def.art]); ctx.drawImage(spr2, -122, -122, 244, 244); ctx.restore();
      text(def.name, x, y + 52, 9.5, '#fff', 'center', true);
    });
  }
  let sheetOn = false, sheetMood = 'idle';

  function draw(dt) {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    if (sheetOn) { drawSheet(); return; }
    if (screen === 'title') { drawTitle(dt); drawSoundLabel(); return; }
    if (screen !== 'battle') { MENU.draw(ui, screen, now); drawSoundLabel(); return; }
    drawBackground();
    ctx.save();
    if (shake > .3) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    const p = pose();
    drawEnemyCard(p);
    drawPlayerCard();
    const pv = drag ? dragTarget() : null;
    drawBoard(pv);
    drawHand();
    if (drag) {
      const q = pv.piece;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14;
      q.cells.forEach(([x, y]) => A.block(ctx, pv.tlx + x * BOARD.cs, pv.tly + y * BOARD.cs, BOARD.cs, q.ability, { alpha: .95, scale: 1.04 }));
      ctx.restore();
    }
    drawFx();
    ctx.restore();
    drawBanners();
    drawOverlay();
    if (quitAsk) drawQuitAsk();
    drawSoundLabel();
  }

  const approach = (v, t, dt, k) => { const d = t - v; return Math.abs(d) < .15 ? t : v + d * (1 - Math.exp(-k * dt)); };
  function update(dt) {
    const due = timers.filter(t => now >= t.at);
    if (due.length) { timers = timers.filter(t => now < t.at); due.forEach(t => t.fn()); }
    shake *= Math.pow(.0008, dt);
    if (screen !== 'battle') return;
    const pl = game.player, e = game.enemy;
    if (now >= hold.player) {
      vis.pHp = approach(vis.pHp, pl.hp, dt, 9); vis.pSh = approach(vis.pSh, pl.shield, dt, 9); vis.gauge = approach(vis.gauge, pl.gauge, dt, 8);
      if (now > hold.player + 350) vis.pGhost = Math.max(vis.pHp, vis.pGhost - pl.maxHp * .4 * dt);
      if (vis.pHp > vis.pGhost) vis.pGhost = vis.pHp;
    }
    if (now >= hold.enemy) {
      vis.eHp = approach(vis.eHp, e.hp, dt, 9);
      if (now > hold.enemy + 350) vis.eGhost = Math.max(vis.eHp, vis.eGhost - e.maxHp * .4 * dt);
      if (vis.eHp > vis.eGhost) vis.eGhost = vis.eHp;
    }
  }

  let last = performance.now();
  function loop(t) {
    now = t;
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    update(dt);
    draw(dt);
    requestAnimationFrame(loop);
  }

  // ---------- 入力 ----------
  const SOUND_LABEL = ['BGM・効果音 ON', '効果音のみ（BGM OFF）', '音ぜんぶ OFF'];
  let soundLabel = null;
  function toggleSound() { SFX.toggle(); soundLabel = { text: SOUND_LABEL[SFX.mode], t0: performance.now() }; }
  function drawSoundLabel() {
    if (!soundLabel) return;
    const u = (now - soundLabel.t0) / 1600;
    if (u >= 1) { soundLabel = null; return; }
    ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (u - .7) / .3);
    ctx.font = 'bold 13px ' + FONT; const w = ctx.measureText(soundLabel.text).width + 32;
    ctx.fillStyle = 'rgba(8,12,28,.92)'; rr(180 - w / 2, 56, w, 30, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; rr(180 - w / 2 + .5, 56.5, w - 1, 29, 14.5); ctx.stroke();
    text(soundLabel.text, 180, 71.5, 13, '#fff', 'center', true); ctx.restore();
  }
  const hit = (px, py, x, y, w, h) => px >= x && px <= x + w && py >= y && py <= y + h;
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  }
  function doPlace(idx, col, row) {
    now = performance.now();
    const pre = { intent: L.intentInfo(game) };
    afterAction(L.placePiece(game, idx, col, row), pre);
  }

  canvas.addEventListener('pointerdown', e => {
    now = performance.now();
    SFX.init(); MUSIC.init(SFX.ctx);
    const [x, y] = toLogical(e);
    if (screen === 'title') {
      if (Math.hypot(x - MUTE.x, y - 600) < 18) { toggleSound(); return; }
      if (hit(x, y, 80, 440, 200, 56)) { SFX.play('ui'); go('home'); }
      return;
    }
    if (screen !== 'battle') {
      if (screen === 'home' && Math.hypot(x - MUTE.x, y - MUTE.y) < 18) { toggleSound(); return; }
      MENU.down(x, y);
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (quitAsk) {
      if (hit(x, y, 56, 336, 110, 44)) { SFX.play('ui'); quitAsk = false; }
      else if (hit(x, y, 194, 336, 110, 44)) {
        SFX.play('ui'); resultInfo = null; if (game.phase === 'battle') game.phase = 'lose';
        finalizeResult(); go(game.stage.scout ? 'scout' : game.level ? 'challenge' : 'stages');
      }
      return;
    }
    if (Math.hypot(x - MUTE.x, y - MUTE.y) < 18) { toggleSound(); return; }
    if (game.phase === 'battle' && now >= busyUntil && Math.hypot(x - QUIT.x, y - QUIT.y) < 18) { SFX.play('ui'); quitAsk = true; return; }
    if (game.phase !== 'battle') {
      if (!overlayReady()) return;
      if (game.phase === 'next' && hit(x, y, 80, 390, 200, 50)) {
        SFX.play('ui'); L.nextEnemy(game); phaseAt = 0; busyUntil = 0;
        MUSIC.play(game.enemy.def.boss ? 'boss' : 'battle');
        floats = []; ghosts = []; orbs = []; resetEnemyVis(); hold = { player: 0, enemy: 0, intent: 0 }; cellFx = {};
      } else if (game.phase !== 'next') {
        const sc = game.stage.scout;
        if (sc && game.phase === 'clear') { if (hit(x, y, 80, 500, 200, 46)) { SFX.play('ui'); go('scout'); } }
        else if (hit(x, y, 36, 500, 138, 46)) { SFX.play('ui'); start(); }
        else if (hit(x, y, 186, 500, 138, 46)) { SFX.play('ui'); go(sc ? 'scout' : game.level ? 'challenge' : 'stages'); }
      }
      return;
    }
    if (now < busyUntil) return;
    if (bt) { buddyDown(e, x, y); return; }
    for (let i = 0; i < 2; i++) if (hit(x, y, BUD[i].x, BUD[i].y, BUD[i].w, BUD[i].h)) { tapBuddy(i); return; }
    if (game.player.gauge >= 100 && hit(x, y, SPECIAL.x, SPECIAL.y, SPECIAL.w, SPECIAL.h)) {
      afterAction(L.useSpecial(game), { intent: L.intentInfo(game) });
      return;
    }
    for (let i = 0; i < C.handSize; i++) {
      const sx = SLOT.x0 + i * (SLOT.w + SLOT.gap);
      if (game.hand[i] && hit(x, y, sx, SLOT.y - 6, SLOT.w, SLOT.h + 10)) {
        drag = { index: i, x, y };
        SFX.play('pick');
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  });
  // ---- バディの操作 ----
  const cellAt = (x, y) => {
    const c = Math.floor((x - BOARD.x) / BOARD.cs), r = Math.floor((y - BOARD.y) / BOARD.cs);
    return c >= 0 && c < N && r >= 0 && r < N ? { x: c, y: r } : null;
  };
  function doBuddy(slot, target) {
    now = performance.now();
    const pre = { intent: L.intentInfo(game) }, ev = L.useBuddy(game, slot, target);
    if (!ev) { addFloat('そこには使えない', 180, 300, '#ff9a9a', 16); SFX.play('pick'); return false; }
    bt = null;
    afterAction(ev, pre);
    return true;
  }
  function tapBuddy(slot) {
    const b = game.buddies[slot];
    if (!b || b.used) return;
    SFX.play('pick');
    const info = L.buddyInfo(b.id, b.lv);
    if (info.need === 'none') { doBuddy(slot, {}); return; }
    bt = { slot, need: L.buddyNeeds(info), color: null, cell: null, drag: false };
  }
  function buddyDown(e, x, y) {
    if (bt.need.color && !bt.color) {
      for (let i = 0; i < PALETTE.length; i++) {
        if (Math.hypot(x - (36 + i * 44), y - (SLOT.y + 39)) < 21) {
          bt.color = PALETTE[i]; SFX.play('pick');
          if (!bt.need.cell) doBuddy(bt.slot, { color: bt.color });
          return;
        }
      }
      if (Math.hypot(x - 337, y - (SLOT.y + 39)) < 18) { bt = null; SFX.play('pick'); return; }
    } else if (hit(x, y, 256, SLOT.y + 14, 80, 38)) { bt = null; SFX.play('pick'); return; }
    // ほかのバディをタップしたら切り替え（同じバディなら取り消し）
    for (let i = 0; i < 2; i++) if (hit(x, y, BUD[i].x, BUD[i].y, BUD[i].w, BUD[i].h)) { const same = bt.slot === i; bt = null; if (!same) tapBuddy(i); return; }
    if (bt.need.cell && (!bt.need.color || bt.color)) {
      const c = cellAt(x, y);
      if (c) { bt.cell = c; bt.drag = true; canvas.setPointerCapture(e.pointerId); }
    }
  }

  canvas.addEventListener('wheel', e => { if (screen !== 'battle' && screen !== 'title') { e.preventDefault(); MENU.wheel(screen, e.deltaY); } }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    if (screen !== 'battle' && screen !== 'title') { const [mx, my] = toLogical(e); MENU.move(screen, mx, my); return; }
    if (drag) [drag.x, drag.y] = toLogical(e);
    if (bt && bt.drag) { const [x, y] = toLogical(e); bt.cell = cellAt(x, y); }
  });
  function release(e, cancel) {
    if (screen !== 'battle') {
      if (screen !== 'title') { const [mx, my] = toLogical(e); if (cancel) MENU.cancel(); else MENU.up(ui, screen, mx, my); }
      return;
    }
    if (bt && bt.drag) {
      bt.drag = false;
      if (!cancel && bt.cell && !doBuddy(bt.slot, { x: bt.cell.x, y: bt.cell.y, color: bt.color }) && bt) bt.cell = null;
      return;
    }
    if (!drag) return;
    [drag.x, drag.y] = toLogical(e);
    const t = dragTarget(), idx = drag.index;
    drag = null;
    if (!cancel && t.valid) doPlace(idx, t.col, t.row);
  }
  canvas.addEventListener('pointerup', e => release(e, false));
  canvas.addEventListener('pointercancel', e => release(e, true));

  // メニュー画面（menu.js）が使う描画ヘルパー
  function drawArt(key, cx, cy, sc, mood, t, dim, tint) {
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, 440, 440);
    sctx.setTransform(1.8, 0, 0, 1.8, 220, 220);
    A.enemyArt(sctx, key, t || now / 1000, mood || 'idle');
    ctx.save(); ctx.translate(cx, cy); if (dim) ctx.globalAlpha = .35; ctx.scale(sc, sc);
    if (tint) ctx.filter = tint;
    ctx.drawImage(spr, -122, -122, 244, 244); ctx.restore();
  }
  const ui = { ctx, text, textO, lin, rr, card, button, disabledButton, speaker, SFX, A, drawArt, bg: drawBackground, go, startStage, startScout };

  // タブを閉じる・バックグラウンドに回る直前にもセーブしておく（普段は変更のたびに保存済み）
  window.addEventListener('pagehide', () => SV.commit());
  document.addEventListener('visibilitychange', () => { if (document.hidden) SV.commit(); });

  SFX.init(); MUSIC.init(SFX.ctx);   // 音源の読み込みはページを開いた時点で始める（再生はタップ後）
  MUSIC.play('title');
  requestAnimationFrame(loop);

  // 動作確認・デバッグ用
  BB.debug = { get level() { return stageLevel; }, sheet(on, mood) { sheetOn = on; sheetMood = mood || 'idle'; }, get game() { return game; }, get bt() { return bt; }, startScout, buddyDown, tapBuddy, doBuddy, get screen() { return screen; }, start, startStage, go, doPlace, get busyUntil() { return busyUntil; } };
})();
