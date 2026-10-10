// ゲームロジック。描画に依存しないので、tools/sim.js のシミュレーターからも呼べる。
(function () {
  const D = BB.data, C = D.config, N = C.size;

  const emptyBoard = () => Array.from({ length: N }, () => Array(N).fill(null));
  const randInt = (s, lo, hi) => lo + Math.floor(s.rng() * (hi - lo + 1));
  const shuffle = (s, a) => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(s.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const pieceW = p => Math.max(...p.cells.map(c => c[0])) + 1;
  const pieceH = p => Math.max(...p.cells.map(c => c[1])) + 1;

  function pickWeighted(s, list) {
    const total = list.reduce((a, p) => a + p.weight, 0);
    let r = s.rng() * total;
    for (const p of list) { r -= p.weight; if (r < 0) return p; }
    return list[list.length - 1];
  }

  function canPlace(board, piece, col, row) {
    for (const [x, y] of piece.cells) {
      const cx = col + x, cy = row + y;
      if (cx < 0 || cy < 0 || cx >= N || cy >= N || board[cy][cx]) return false;
    }
    return true;
  }
  function canPlaceAnywhere(board, piece) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (canPlace(board, piece, c, r)) return true;
    return false;
  }

  // 置いたと仮定したときに揃う行・列（プレビュー用）。盤面は変更しない。
  function previewLines(board, piece, col, row) {
    const occ = (x, y) => board[y][x] || piece.cells.some(([px, py]) => col + px === x && row + py === y);
    const idx = Array.from({ length: N }, (_, k) => k);
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      if (idx.every(k => occ(k, i))) rows.push(i);
      if (idx.every(k => occ(i, k))) cols.push(i);
    }
    return { rows, cols };
  }

  function drawHand(s) {
    const hand = [];
    for (let i = 0; i < C.handSize; i++) hand.push(pickWeighted(s, D.pieces));
    // 最低 1 つは今の盤面に置けるものを保証
    if (!hand.some(p => canPlaceAnywhere(s.board, p))) {
      const ok = D.pieces.filter(p => canPlaceAnywhere(s.board, p));
      if (ok.length) hand[Math.floor(s.rng() * hand.length)] = pickWeighted(s, ok);
    }
    s.hand = hand;
  }

  function startEnemy(s, index) {
    const def = s.enemies[index];
    s.enemyIndex = index;
    const cnt = def.count + s.mods.count;
    s.enemy = { def, hp: def.hp, maxHp: def.hp, shield: 0, countdown: cnt, maxCount: cnt, poison: null, step: 0, next: null };
    s.board = emptyBoard();
    s.combo = 0;
    s.seal = null;
    s.phase = 'battle';
    (s.buddies || []).forEach(b => { b.used = false; });
    pickIntent(s);
  }
  function pickIntent(s) {
    const e = s.enemy;
    e.next = e.def.actions[e.step % e.def.actions.length];
    e.step++;
  }

  const scaleEnemy = (def, level) => {
    if (!level) return def;
    const ci = challengeInfo(level);
    return Object.assign({}, def, { hp: Math.round(def.hp * ci.hp), atk: Math.round(def.atk * ci.atk), count: Math.max(2, def.count - ci.countMinus) });
  };
  const defaultMods = () => ({ mul: {}, combo: 0, comboCap: 0, line: 0, whole: 0, maxHp: 0, shield: 0, startShield: 0, gauge: 0, count: 0, reduce: 0, coin: 0, healBetween: 0 });

  // stageIndex: D.stages の番号 / mods: 装備の合計効果（BB.equip.computeMods）
  // チャレンジの難易度 level（1〜20）に応じた倍率
  function challengeInfo(level) {
    const Ch = D.challenge, n = Math.max(0, level - 1);
    const drop = Ch.countDrop.reduce((m, [lv, d]) => level >= lv ? Math.max(m, d) : m, 0);
    return { hp: 1 + Ch.hp * n, atk: 1 + Ch.atk * n, countMinus: drop, coin: Math.round((1 + Ch.coin * n) * 100) / 100 };
  }

  // opts.level を渡すとチャレンジ（その難易度の敵）
  function newGame(rng, stageIndex, mods, buddies, opts) {
    const m = Object.assign(defaultMods(), mods || {});
    const custom = stageIndex && typeof stageIndex === 'object';
    const stage = custom ? stageIndex : D.stages[stageIndex || 0];
    const maxHp = C.maxHp + m.maxHp;
    const s = {
      rng: rng || Math.random, uid: 0, placements: 0, totalDamage: 0, maxCombo: 0,
      mods: m, stage, stageIndex: custom ? -1 : (stageIndex || 0), level: (opts && opts.level) || 0,
      enemies: stage.enemies.map(k => scaleEnemy(D.enemies[k], opts && opts.level)),
      buddies: (buddies || []).slice(0, 2).map(b => ({ id: b.id, lv: b.lv || 1, used: false })),
      player: { hp: maxHp, maxHp, shield: Math.min(C.shieldCap + m.shield, m.startShield), gauge: Math.min(100, m.gauge) }
    };
    startEnemy(s, 0);
    drawHand(s);
    return s;
  }

  function nextEnemy(s) {
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + C.healBetween + s.mods.healBetween);
    startEnemy(s, s.enemyIndex + 1);
    if (!s.hand.some(Boolean)) drawHand(s);
  }

  // 敵の予告表示用
  function intentInfo(s) {
    const e = s.enemy, a = e.next;
    switch (a.type) {
      case 'attack': return { icon: '⚔', text: '攻撃', detail: e.def.atk + ' ダメージ', danger: false };
      case 'strong': return { icon: '💥', text: '強攻撃', detail: e.def.atk * C.strongMult + ' ダメージ', danger: true };
      case 'stone':  return { icon: '🪨', text: '石投げ', detail: '盤面に石を置く', danger: false };
      case 'freeze': return { icon: '❄', text: '凍結', detail: C.freezeCount + ' マス凍結', danger: false };
      case 'defend': return { icon: '🛡', text: '防御姿勢', detail: 'ガード +' + C.defendShield, danger: false };
      case 'seal':   return { icon: '🔇', text: '能力封じ', detail: D.abilities[a.ability].name + ' を ' + C.sealTurns + ' 手封印', danger: false };
    }
  }

  function hitPlayer(s, dmg, ev) {
    if (s.mods.reduce > 0) dmg = Math.max(1, Math.round(dmg * (1 - s.mods.reduce)));
    const p = s.player, absorbed = Math.min(p.shield, dmg);
    p.shield -= absorbed;
    p.hp = Math.max(0, p.hp - (dmg - absorbed));
    ev.push({ type: 'playerDmg', value: dmg - absorbed, absorbed });
  }
  function hitEnemy(s, dmg, pierce, ev, ability) {
    const e = s.enemy;
    let absorbed = 0;
    if (!pierce) { absorbed = Math.min(e.shield, dmg); e.shield -= absorbed; }
    const real = dmg - absorbed;
    e.hp = Math.max(0, e.hp - real);
    s.totalDamage += real;
    ev.push({ type: 'enemyDmg', ability: ability || 'attack', value: real, absorbed, pierce });
  }

  function checkEnemyDead(s, ev) {
    if (s.enemy.hp > 0) return false;
    s.phase = s.enemyIndex + 1 >= s.enemies.length ? 'clear' : 'next';
    ev.push({ type: 'enemyDown' });
    return true;
  }
  function checkPlayerDead(s) {
    if (s.player.hp > 0) return false;
    s.phase = 'lose';
    return true;
  }

  // 揃った行・列を消し、消えたマスと本数を返す
  function clearLines(s) {
    const b = s.board, rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      if (b[i].every(Boolean)) rows.push(i);
      if (b.every(r => r[i])) cols.push(i);
    }
    const seen = new Set(), cells = [];
    const take = (x, y) => {
      const k = y * N + x;
      if (seen.has(k)) return;           // 交差点は 1 回だけ
      seen.add(k);
      cells.push({ x, y, cell: b[y][x] });
    };
    rows.forEach(y => { for (let x = 0; x < N; x++) take(x, y); });
    cols.forEach(x => { for (let y = 0; y < N; y++) take(x, y); });
    cells.forEach(c => { b[c.y][c.x] = null; });
    return { cells, rows, cols, lines: rows.length + cols.length };
  }

  const comboMultiplier = s => 1 + (C.comboBonus + s.mods.combo) * Math.min(s.combo, C.comboCap + s.mods.comboCap);

  function resolveClear(s, cleared, ev) {
    const comboMult = comboMultiplier(s);
    const lineMult = 1 + (C.lineBonus + s.mods.line) * (cleared.lines - 1);
    // ピース丸ごと消し：同じ uid のマスが元のマス数ぶん同時に消えたか
    const perUid = {};
    cleared.cells.forEach(({ cell }) => { if (cell.uid) perUid[cell.uid] = (perUid[cell.uid] || 0) + 1; });
    const sums = {};
    cleared.cells.forEach(({ cell }) => {
      if (cell.obstacle || cell.ability === 'none') return;   // 石・凍結マスは能力なし
      const whole = perUid[cell.uid] === cell.size ? C.wholeBonus + s.mods.whole : 1;
      sums[cell.ability] = (sums[cell.ability] || 0) + cell.base * whole;
    });
    for (const ab of D.order) {
      if (sums[ab] === undefined) continue;
      const value = Math.floor(sums[ab] * lineMult * comboMult * (1 + (s.mods.mul[ab] || 0)));
      if (s.seal && s.seal.ability === ab) { ev.push({ type: 'sealed', ability: ab }); continue; }
      if (value <= 0) continue;
      const p = s.player, e = s.enemy;
      switch (ab) {
        case 'guard':  p.shield = Math.min(C.shieldCap + s.mods.shield, p.shield + value); ev.push({ type: 'guard', ability: ab, value }); break;
        case 'heal':   p.hp = Math.min(p.maxHp, p.hp + value); ev.push({ type: 'heal', ability: ab, value }); break;
        case 'stun':   e.countdown += value; ev.push({ type: 'stun', ability: ab, value }); break;
        case 'poison': e.poison = { amount: (e.poison ? e.poison.amount : 0) + value, turns: C.poisonTurns }; ev.push({ type: 'poison', ability: ab, value }); break;
        case 'magic':  hitEnemy(s, value, true, ev, ab); break;
        case 'attack': hitEnemy(s, value, false, ev, ab); break;
        case 'charge': p.gauge = Math.min(100, p.gauge + value); ev.push({ type: 'charge', ability: ab, value }); break;
      }
    }
    if (s.board.every(r => r.every(c => !c))) {
      s.player.gauge = Math.min(100, s.player.gauge + C.perfectGauge);
      ev.push({ type: 'perfect' });
    }
  }

  function enemyAct(s, ev) {
    const e = s.enemy, a = e.next;
    if (e.poison) {
      const d = e.poison.amount;
      e.hp = Math.max(0, e.hp - d);
      s.totalDamage += d;
      ev.push({ type: 'poisonTick', value: d });
      if (--e.poison.turns <= 0) e.poison = null;
      if (checkEnemyDead(s, ev)) return;
    }
    ev.push({ type: 'enemyAct', action: a.type });
    switch (a.type) {
      case 'attack': hitPlayer(s, e.def.atk, ev); break;
      case 'strong': hitPlayer(s, e.def.atk * C.strongMult, ev); break;
      case 'stone': {
        const empty = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!s.board[y][x]) empty.push([x, y]);
        shuffle(s, empty).slice(0, randInt(s, C.stoneCount[0], C.stoneCount[1])).forEach(([x, y]) => {
          s.board[y][x] = { ability: 'none', base: 0, uid: 0, size: 1, obstacle: 'stone' };
          ev.push({ type: 'placeObstacle', x, y });
        });
        break;
      }
      case 'freeze': {
        const targets = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = s.board[y][x];
          if (c && !c.obstacle && c.ability !== 'none') targets.push(c);
        }
        const picked = shuffle(s, targets).slice(0, C.freezeCount);
        picked.forEach(c => { c.obstacle = 'ice'; });
        const frozen = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (picked.includes(s.board[y][x])) frozen.push({ x, y });
        ev.push({ type: 'freeze', cells: frozen });
        break;
      }
      case 'defend': e.shield += C.defendShield; ev.push({ type: 'enemyShield', value: C.defendShield }); break;
      case 'seal': s.seal = { ability: a.ability, turns: C.sealTurns }; ev.push({ type: 'seal', ability: a.ability }); break;
    }
    s.player.shield = Math.floor(s.player.shield / 2);   // 敵の行動ごとにシールド半減
    e.countdown = e.maxCount;
    pickIntent(s);
    checkPlayerDead(s);
  }

  // 手札をどこにも置けないとき：最大 HP の割合ダメージを受け、盤面を半分クリア
  function boardCollapse(s, ev) {
    const dmg = Math.floor(s.player.maxHp * C.collapseRatio);
    s.player.hp = Math.max(0, s.player.hp - dmg);
    ev.push({ type: 'collapse', value: dmg });
    if (checkPlayerDead(s)) return;
    const counts = s.board.map((r, y) => ({ y, n: r.filter(Boolean).length })).sort((a, b) => b.n - a.n);
    counts.slice(0, Math.ceil(N / 2)).forEach(({ y }) => { s.board[y] = Array(N).fill(null); });
    if (!s.hand.some(p => p && canPlaceAnywhere(s.board, p))) s.board = emptyBoard();
  }

  // ハンドの index を (col, row) に置く。置けなければ null。戻り値は演出用イベント列。
  function placePiece(s, index, col, row) {
    if (s.phase !== 'battle') return null;
    const piece = s.hand[index];
    if (!piece || !canPlace(s.board, piece, col, row)) return null;
    const ev = [];
    s.placements++;
    const uid = ++s.uid;
    piece.cells.forEach(([x, y]) => {
      s.board[row + y][col + x] = { ability: piece.ability, base: piece.base, uid, size: piece.cells.length, obstacle: null };
    });
    s.hand[index] = null;
    ev.push({ type: 'placed', cells: piece.cells.map(([x, y]) => ({ x: col + x, y: row + y })), ability: piece.ability });

    const cleared = clearLines(s);
    if (cleared.lines > 0) {
      s.combo++;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      ev.push({ type: 'cleared', cells: cleared.cells.map(c => ({ x: c.x, y: c.y, ability: c.cell.ability, obstacle: c.cell.obstacle })), rows: cleared.rows, cols: cleared.cols, lines: cleared.lines });
      ev.push({ type: 'combo', value: s.combo });
      resolveClear(s, cleared, ev);
    } else {
      s.combo = 0;
    }
    if (s.seal && --s.seal.turns <= 0) s.seal = null;
    if (checkEnemyDead(s, ev)) return ev;

    if (--s.enemy.countdown <= 0) {
      enemyAct(s, ev);
      if (s.phase !== 'battle') return ev;
    }
    if (!s.hand.some(Boolean)) drawHand(s);
    if (!s.hand.some(p => p && canPlaceAnywhere(s.board, p))) boardCollapse(s, ev);
    return ev;
  }

  // 必殺技：盤面の全攻撃マスをその場で発動して消す
  function useSpecial(s) {
    if (s.phase !== 'battle' || s.player.gauge < 100) return null;
    const ev = [], gone = [];
    let sum = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = s.board[y][x];
      if (c && c.ability === 'attack') {
        if (!c.obstacle) sum += c.base;
        gone.push({ x, y, ability: c.ability, obstacle: c.obstacle });
        s.board[y][x] = null;
      }
    }
    s.player.gauge = 0;
    const value = Math.floor(sum * comboMultiplier(s) * (1 + (s.mods.mul.attack || 0)));
    ev.push({ type: 'special' }, { type: 'cleared', cells: gone, lines: 0 });
    if (value > 0) hitEnemy(s, value, false, ev, 'attack');
    checkEnemyDead(s, ev);
    return ev;
  }

  // ---------- バディ ----------
  // スキルの数値。Lv が上がると効果が +25% ずつ大きくなる
  function buddyInfo(id, lv) {
    const b = D.buddyMap[id], t = b.skill.type, v = b.skill.v, f = 1 + .25 * (lv - 1), p = { type: t };
    switch (t) {
      case 'strike': p.dmg = Math.round(v * f); break;
      case 'heal': p.healPct = Math.round(v * f); break;
      case 'shield': p.shield = Math.round(v * f); break;
      case 'stun': p.stun = v + (lv >= 3 ? 1 : 0); break;
      case 'poison': p.poison = Math.round(v * f); break;
      case 'charge': p.charge = Math.round(v * f); break;
      case 'recolor': case 'bomb': p.radius = lv >= 5 ? 2 : 1; break;
      case 'paintRow': case 'paintCol': p.rows = lv >= 4 ? 2 : 1; break;
      case 'laser': case 'laserV': p.cross = lv >= 4; break;
      case 'combo': p.combo = v + (lv >= 3 ? 1 : 0); break;
      case 'burst': p.per = Math.round(v * f); break;     // 攻撃マス 1 つあたりのダメージ
      case 'fortify': p.per = Math.round(v * f); break;   // ガードマス 1 つあたりのシールド
      case 'bloom': p.per = Math.round(v * f); break;     // 回復マス 1 つあたりの回復量
      case 'rebirth': p.healPct = Math.round(v * f); p.dmg = Math.round(50 * f); break;
    }
    p.need = { recolor: 'colorCell', paintRow: 'colorCell', paintCol: 'colorCell', bomb: 'cell', laser: 'cell', laserV: 'cell', recolorAll: 'color' }[t] || 'none';
    return p;
  }

  // スキルを使うのに色の指定・マスの指定がいるか
  const buddyNeeds = info => ({ color: info.need === 'color' || info.need === 'colorCell', cell: info.need === 'cell' || info.need === 'colorCell' });

  // (x, y) をタップしたときに効果が及ぶマス（盤面内）
  function buddyArea(s, slot, x, y) {
    const b = s.buddies[slot], info = buddyInfo(b.id, b.lv), out = [];
    const add = (cx, cy) => { if (cx >= 0 && cy >= 0 && cx < N && cy < N) out.push({ x: cx, y: cy }); };
    switch (info.type) {
      case 'recolor': case 'bomb':
        for (let dy = -info.radius; dy <= info.radius; dy++) for (let dx = -info.radius; dx <= info.radius; dx++) add(x + dx, y + dy);
        break;
      case 'paintRow': for (let r = 0; r < info.rows; r++) for (let cx = 0; cx < N; cx++) add(cx, y + r); break;
      case 'paintCol': for (let r = 0; r < info.rows; r++) for (let cy = 0; cy < N; cy++) add(x + r, cy); break;
      case 'laserV':
        for (let cy = 0; cy < N; cy++) add(x, cy);
        if (info.cross) for (let cx = 0; cx < N; cx++) if (cx !== x) add(cx, y);
        break;
      case 'laser':
        for (let cx = 0; cx < N; cx++) add(cx, y);
        if (info.cross) for (let cy = 0; cy < N; cy++) if (cy !== y) add(x, cy);
        break;
    }
    return out;
  }

  // バディを使う。target は { x, y, color }。使えなければ null（消費しない）
  function useBuddy(s, slot, target) {
    if (s.phase !== 'battle') return null;
    const bd = s.buddies[slot];
    if (!bd || bd.used) return null;
    const info = buddyInfo(bd.id, bd.lv), t = target || {}, ev = [], p = s.player, e = s.enemy;
    const nd = buddyNeeds(info);
    if (nd.color && !(t.color in D.buddyBase)) return null;
    let area = [];
    if (nd.cell) {
      if (!(t.x >= 0 && t.x < N && t.y >= 0 && t.y < N)) return null;
      area = buddyArea(s, slot, t.x, t.y).filter(c => s.board[c.y][c.x]);
    }
    const healBy = pct => { const v = Math.round(p.maxHp * pct / 100); p.hp = Math.min(p.maxHp, p.hp + v); ev.push({ type: 'heal', ability: 'heal', value: v }); };
    switch (info.type) {
      case 'recolor': case 'paintRow': case 'paintCol': case 'recolorAll': {
        let cells = area;
        if (info.type === 'recolorAll') { cells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (s.board[y][x]) cells.push({ x, y }); }
        cells = cells.filter(c => s.board[c.y][c.x].obstacle !== 'stone');
        if (!cells.length) return null;
        cells.forEach(c => { const cell = s.board[c.y][c.x]; cell.ability = t.color; cell.base = D.buddyBase[t.color]; });
        ev.push({ type: 'recolor', cells, color: t.color });
        break;
      }
      case 'bomb': case 'laser': case 'laserV': {
        if (!area.length) return null;
        const list = area.map(c => ({ x: c.x, y: c.y, cell: s.board[c.y][c.x] }));
        list.forEach(c => { s.board[c.y][c.x] = null; });
        ev.push({ type: 'cleared', cells: list.map(c => ({ x: c.x, y: c.y, ability: c.cell.ability, obstacle: c.cell.obstacle })), lines: 0 });
        resolveClear(s, { cells: list, lines: 1 }, ev);
        break;
      }
      case 'strike': hitEnemy(s, info.dmg, true, ev, 'magic'); break;
      case 'combo': {   // コンボを積む（次の消去から倍率が上がる）
        s.combo += info.combo; s.maxCombo = Math.max(s.maxCombo, s.combo);
        ev.push({ type: 'comboUp', value: info.combo });
        break;
      }
      case 'burst': case 'fortify': case 'bloom': {   // 盤面にある色のマスの数に応じて効果が決まる
        const want = info.type === 'burst' ? 'attack' : info.type === 'fortify' ? 'guard' : 'heal';
        let n = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = s.board[y][x]; if (c && c.ability === want && !c.obstacle) n++; }
        if (!n) return null;
        if (want === 'attack') hitEnemy(s, Math.min(150, info.per * n), false, ev, 'attack');
        else if (want === 'guard') { const v = info.per * n; p.shield = Math.min(C.shieldCap + s.mods.shield, p.shield + v); ev.push({ type: 'guard', ability: 'guard', value: v }); }
        else { const v = info.per * n; p.hp = Math.min(p.maxHp, p.hp + v); ev.push({ type: 'heal', ability: 'heal', value: v }); }
        break;
      }
      case 'heal': healBy(info.healPct); break;
      case 'rebirth': healBy(info.healPct); hitEnemy(s, info.dmg, true, ev, 'magic'); break;
      case 'shield': { const v = Math.min(C.shieldCap + s.mods.shield - p.shield, info.shield); p.shield += Math.max(0, v); ev.push({ type: 'guard', ability: 'guard', value: info.shield }); break; }
      case 'stun': e.countdown += info.stun; ev.push({ type: 'stun', ability: 'stun', value: info.stun }); break;
      case 'poison': e.poison = { amount: (e.poison ? e.poison.amount : 0) + info.poison, turns: C.poisonTurns }; ev.push({ type: 'poison', ability: 'poison', value: info.poison }); break;
      case 'charge': p.gauge = Math.min(100, p.gauge + info.charge); ev.push({ type: 'charge', ability: 'charge', value: info.charge }); break;
      case 'purify': {
        const cells = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = s.board[y][x];
          if (!c) continue;
          if (c.obstacle === 'stone') { s.board[y][x] = null; cells.push({ x, y }); }
          else if (c.obstacle === 'ice') { c.obstacle = null; cells.push({ x, y }); }
        }
        if (!cells.length && !s.seal) return null;
        s.seal = null;
        ev.push({ type: 'purify', cells });
        break;
      }
      case 'reroll': drawHand(s); ev.push({ type: 'reroll' }); break;
    }
    bd.used = true;
    ev.unshift({ type: 'buddy', slot, id: bd.id });
    checkEnemyDead(s, ev);
    return ev;
  }

  function stars(s) {
    const r = s.player.hp / s.player.maxHp;
    return r >= 0.7 ? 3 : r >= 0.35 ? 2 : 1;
  }

  BB.logic = { newGame, challengeInfo, defaultMods, buddyNeeds, buddyInfo, buddyArea, useBuddy, nextEnemy, placePiece, useSpecial, canPlace, canPlaceAnywhere, previewLines, intentInfo, stars, pieceW, pieceH };
})();
