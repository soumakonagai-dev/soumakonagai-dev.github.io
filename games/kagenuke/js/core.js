// カゲヌケ コア（DOMに依存しない: 影の計算・当たり判定・物理・ステージ進行）
//  - 実体（body）: 現実の箱や床の上を歩く。自分の影を壁に落とす。
//  - 影（kage）  : 実体の影から分かれて、壁の「影」の中だけを歩く。光に照らされた所は壁になる。
(function (root) {
'use strict';

const W = 1600, H = 900;          // 壁（スクリーン）の大きさ
const PW = 14, PH = 28;           // キャラの大きさ
const SPEED = 230, JUMP = 620, GRAV = 1900, MAXFALL = 900;
const LSPEED = 260, ZSPEED = 240; // 光源を動かす速さ

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 幾何 ----------
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const p of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  const up = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  up.pop(); lo.pop();
  return lo.concat(up);
}

function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

// ---------- 光源と影 ----------
function lightPos(w, l) {
  let x = l.x, y = l.y, z = l.z;
  if (l.sway) {
    const s = Math.sin(w.t * 2 * Math.PI / l.sway.period + (l.sway.phase || 0));
    x += (l.sway.ax || 0) * s; y += (l.sway.ay || 0) * s; z += (l.sway.az || 0) * s;
  }
  return [x, y, z];
}

function lightOn(w, l) {
  if (!l.blink) return true;
  const c = l.blink.on + l.blink.off;
  return ((w.t + (l.blink.phase || 0)) % c) < l.blink.on;
}

// 直方体パーツ1つの影（光源L→壁z=0への投影の凸包）
function partPoly(L, o, p, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const lx = (p.ox || 0) + sx * p.w / 2, ly = (p.oy || 0) + sy * p.h / 2;
    const px = o.x + lx * ca - ly * sa, py = o.y + lx * sa + ly * ca;
    const pz = o.z + (p.oz || 0) + sz * p.d / 2;
    const den = L[2] - pz;
    if (den < 1) return null;
    const f = L[2] / den;
    pts.push([L[0] + (px - L[0]) * f, L[1] + (py - L[1]) * f]);
  }
  return hull(pts);
}

function objAngle(w, o) { return (o.spin ? o.spin * w.t : 0) + (o.angle || 0); }

function bodyObject(w) {
  const b = w.actors[0];
  return { x: b.x, y: b.y - PH / 2, z: w.def.bodyZ || 80, parts: [{ w: PW, h: PH, d: PW }] };
}

function makePoly(pts, own) {
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const v of pts) { minx = Math.min(minx, v[0]); maxx = Math.max(maxx, v[0]); miny = Math.min(miny, v[1]); maxy = Math.max(maxy, v[1]); }
  return { pts, minx, maxx, miny, maxy, own: !!own };
}

function refresh(w) {
  let front = (w.def.bodyZ || 80) + PW / 2;
  for (const o of w.objects) for (const p of o.parts) front = Math.max(front, o.z + (p.oz || 0) + p.d / 2);
  w.lpos = []; w.lon = []; w.shadows = [];
  const body = bodyObject(w);
  for (const l of w.lights) {
    const on = lightOn(w, l);
    w.lon.push(on);
    const q = lightPos(w, l);
    q[2] = Math.max(q[2], front + 30);
    w.lpos.push(q);
    if (!on) { w.shadows.push(null); continue; }
    const polys = [];
    for (const o of w.objects) {
      if (o.cast === false) continue;
      const ang = objAngle(w, o);
      for (const p of o.parts) {
        const pts = partPoly(q, o, p, ang);
        if (pts && pts.length >= 3) polys.push(makePoly(pts, false));
      }
    }
    const bp = partPoly(q, body, body.parts[0], 0);
    if (bp && bp.length >= 3) polys.push(makePoly(bp, true));
    w.shadows.push(polys);
  }
}

function inInk(w, x, y) {
  for (const r of w.ink) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  return false;
}

function inShadow(sh, x, y) {
  for (const p of sh) if (x >= p.minx && x <= p.maxx && y >= p.miny && y <= p.maxy && inPoly(p.pts, x, y)) return true;
  return false;
}

// すべての（点いている）光に照らされている = 光（影にとっては固い壁・床）
function litFull(w, x, y) {
  if (inInk(w, x, y)) return false;
  let n = 0;
  for (const sh of w.shadows) {
    if (!sh) continue;
    n++;
    if (inShadow(sh, x, y)) return false;
  }
  return n > 0;
}

// 0=濃影 … 1=光
function lightLevel(w, x, y) {
  if (inInk(w, x, y)) return 0;
  let n = 0, lit = 0;
  for (const sh of w.shadows) {
    if (!sh) continue;
    n++;
    if (!inShadow(sh, x, y)) lit++;
  }
  return n ? lit / n : 0;
}

// 影キャラにとっての壁
function shadowSolid(w, x, y) {
  if (x < 0 || x > W || y < 0) return true;
  if (y > H) return false;
  // 影のへやの床は、下に何があっても固い
  for (const r of w.ink) if (x >= r.x && x <= r.x + r.w && y > r.y + r.h && y <= r.y + r.h + 8) return true;
  return litFull(w, x, y);
}

// 実体にとっての壁（現実の箱・床・とびら）
function bodySolid(w, x, y, skip) {
  if (x < 0 || x > W || y < 0) return true;
  for (const d of w.doors) if ((d.invert ? d.open : !d.open) && x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return true;
  for (const o of w.objects) {
    if (o.solid === false || o === skip) continue;
    for (const p of o.parts) {
      const cx = o.x + (p.ox || 0), cy = o.y + (p.oy || 0);
      if (Math.abs(x - cx) <= p.w / 2 && Math.abs(y - cy) <= p.h / 2) return true;
    }
  }
  return false;
}

// ---------- 押せる箱 ----------
function crateFree(w, o, x, y) {
  const p = o.parts[0];
  if (x - p.w / 2 < 0 || x + p.w / 2 > W) return false;
  for (const px of [x - p.w / 2 + 1, x, x + p.w / 2 - 1])
    for (const py of [y - p.h / 2 + 1, y, y + p.h / 2 - 1])
      if (bodySolid(w, px, py, o)) return false;
  return true;
}

function pushCrates(w, a, nx, s) {
  const hw = PW / 2;
  let moved = false;
  for (const o of w.objects) {
    if (!o.push) continue;
    const p = o.parts[0];
    if (Math.abs(nx - o.x) < hw + p.w / 2 && a.y > o.y - p.h / 2 && a.y - PH < o.y + p.h / 2) {
      if (!crateFree(w, o, o.x + s, o.y)) return false;
      o.x += s; moved = true;
    }
  }
  return moved && !blocked(w, a, nx, a.y);
}

function crateFall(w, o, dt) {
  if (!crateFree(w, o, o.x, o.y + 1)) { o.vy = 0; return; }
  o.vy = Math.min((o.vy || 0) + 1800 * dt, 900);
  const n = Math.ceil(o.vy * dt);
  for (let i = 0; i < n; i++) { if (crateFree(w, o, o.x, o.y + 1)) o.y += 1; else { o.vy = 0; break; } }
}

// ---------- キャラ ----------
function newActor(x, y, kind) {
  return { x, y, vx: 0, vy: 0, ground: false, coyote: 0, buf: 0, face: 1, kind, dead: false };
}

function blocked(w, a, x, y) {
  const fn = a.kind === 'body' ? bodySolid : shadowSolid;
  const hw = PW / 2;
  for (const px of [x - hw + 0.5, x, x + hw - 0.5])
    for (const py of [y - PH + 0.5, y - PH * 0.75, y - PH * 0.5, y - PH * 0.25, y - 0.5])
      if (fn(w, px, py)) return true;
  return false;
}

function moveX(w, a, dx) {
  if (!dx) return;
  const n = Math.ceil(Math.abs(dx)), s = dx / n;
  for (let i = 0; i < n; i++) {
    const nx = a.x + s;
    if (!blocked(w, a, nx, a.y)) { a.x = nx; continue; }
    if (a.kind === 'body' && pushCrates(w, a, nx, s)) { a.x = nx; continue; }
    let ok = false;
    for (let k = 1; k <= 3; k++) if (!blocked(w, a, nx, a.y - k)) { a.x = nx; a.y -= k; ok = true; break; }
    if (!ok) { a.vx = 0; break; }
  }
  if (a.ground && a.vy >= 0 && a.kind === 'kage') {
    for (let k = 0; k < 4; k++) { if (!blocked(w, a, a.x, a.y + 1)) a.y += 1; else break; }
  }
}

function moveY(w, a, dy) {
  if (!dy) return;
  const n = Math.ceil(Math.abs(dy)), s = dy / n;
  for (let i = 0; i < n; i++) {
    const ny = a.y + s;
    if (blocked(w, a, a.x, ny)) { a.vy = 0; break; }
    a.y = ny;
  }
}

function stepActor(w, a, inp, dt) {
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const target = dir * SPEED, acc = (dir ? 2600 : 3400) * dt;
  a.vx = a.vx < target ? Math.min(target, a.vx + acc) : Math.max(target, a.vx - acc);
  if (dir) a.face = dir;
  a.coyote = a.ground ? 0.09 : a.coyote - dt;
  a.buf = inp.jumpPressed ? 0.1 : a.buf - dt;
  if (a.buf > 0 && a.coyote > 0) { a.vy = -JUMP; a.ground = false; a.coyote = 0; a.buf = 0; }
  if (!inp.jump && a.vy < -220) a.vy += GRAV * 1.3 * dt;
  a.vy = Math.min(a.vy + GRAV * dt, MAXFALL);
  moveX(w, a, a.vx * dt);
  moveY(w, a, a.vy * dt);
  a.ground = blocked(w, a, a.x, a.y + 1);
}

// 光や箱に埋まったら押し出す。逃げ場がなければ false
function resolve(w, a) {
  if (!blocked(w, a, a.x, a.y)) return true;
  for (let r = 1; r <= 40; r++) {
    if (!blocked(w, a, a.x, a.y - r)) { a.y -= r; if (a.vy > 0) a.vy = 0; return true; }
    if (r <= 24) {
      if (!blocked(w, a, a.x - r, a.y)) { a.x -= r; return true; }
      if (!blocked(w, a, a.x + r, a.y)) { a.x += r; return true; }
    }
  }
  return false;
}

// ---------- ワールド ----------
function createWorld(def) {
  const lim = (o) => ({ min: o.min || [o.x, o.y, o.z], max: o.max || [o.x, o.y, o.z] });
  const w = {
    def, t: 0,
    lights: def.lights.map(l => Object.assign({}, l, lim(l))),
    objects: def.objects.map(o => Object.assign({}, o, lim(o))),
    ink: def.ink || [],
    switches: (def.switches || []).map(s => Object.assign({ w: 50, by: 'kage' }, s, { pressed: false })),
    doors: (def.doors || []).map(d => Object.assign({}, d, { open: false })),
    actors: [newActor(def.start[0], def.start[1], 'body')],
    sel: 0, control: null, won: false, dead: false, events: [],
    shadows: [], lpos: [], lon: []
  };
  refresh(w);
  return w;
}

function controllable(w) {
  const out = [];
  w.lights.forEach((l, i) => { if (l.max.some((v, k) => v > l.min[k])) out.push(i); });
  return out;
}

function enterControl(w) {
  const c = controllable(w);
  if (!c.length) return false;
  const keep = w.control ? w.control.i : -1;
  w.control = { i: c.includes(keep) ? keep : c[0] };
  return true;
}
function exitControl(w) { w.control = null; }
function selectLight(w) {
  if (!w.control) return;
  const c = controllable(w);
  w.control.i = c[(c.indexOf(w.control.i) + 1) % c.length];
}

function controlStep(w, inp, dt) {
  const tg = w.lights[w.control.i];
  const mv = (k, i, d) => { if (d) tg[k] = clamp(tg[k] + d, tg.min[i], tg.max[i]); };
  mv('x', 0, (inp.dx || 0) * LSPEED * dt + (inp.px || 0));
  mv('y', 1, (inp.dy || 0) * LSPEED * dt + (inp.py || 0));
  mv('z', 2, (inp.dz || 0) * ZSPEED * dt + (inp.pz || 0));
}

// 実体の影から、影のキャラを切りはなす
function spawnKage(w) {
  const body = w.actors[0];
  if (w.control || !body.ground) return 'wait';
  if (w.actors.length - 1 >= (w.def.kages || 0)) return 'max';
  // 光ごとに自分の影がある。すでに影キャラがいる影は飛ばして、空いている光の影から出す
  let result = 'nolight';
  for (let i = 0; i < w.shadows.length; i++) {
    const sh = w.shadows[i];
    if (!sh || w.lights[i].noSpawn) continue;
    const own = sh.find(p => p.own);
    if (!own) continue;
    if (w.actors.some((k, j) => j > 0 && k.from === i)) continue;
    let cx = 0, cy = 0;
    for (const v of own.pts) { cx += v[0]; cy += v[1]; }
    cx /= own.pts.length; cy /= own.pts.length;
    if (cx < 10 || cx > W - 10 || cy < 0 || cy > H) { result = 'out'; continue; }
    // 影の底まで下げる
    let y = cy;
    while (y < H && (inShadow(sh, cx, y + 1) || inInk(w, cx, y + 1))) y++;
    const k = newActor(cx, y, 'kage');
    k.from = i;
    let placed = false;
    for (let up = 0; up <= 20; up += 2) {
      k.y = y - up;
      if (!blocked(w, k, k.x, k.y)) { placed = true; break; }
    }
    if (placed) { w.actors.push(k); w.events.push({ t: 'kage', x: k.x, y: k.y }); return 'ok'; }
    result = 'narrow';
  }
  return result;
}

function dismissKage(w) {
  const a = w.actors[w.sel];
  if (!a || a.kind !== 'kage' || w.control) return;
  w.actors.splice(w.sel, 1);
  w.sel = 0;
}

function selectNext(w) {
  if (w.control) return;
  w.sel = (w.sel + 1) % w.actors.length;
}

function updateSwitches(w) {
  for (const s of w.switches) {
    const byActor = s.by !== 'crate' && w.actors.some(a => (s.by === 'any' || (s.by === 'body') === (a.kind === 'body')) &&
      Math.abs(a.x - s.x) < s.w / 2 && a.y > s.y - 8 && a.y < s.y + 4);
    const byCrate = (s.by === 'crate' || s.by === 'any') && w.objects.some(o => o.push && Math.abs(o.x - s.x) < s.w / 2 && Math.abs(o.y + o.parts[0].h / 2 - s.y) < 6);
    const on = byActor || byCrate;
    if (on && s.latch) s.latched = true;
    s.pressed = on || !!s.latched;
  }
  for (const d of w.doors) d.open = d.needs.every(i => w.switches[i].pressed);
}

function update(w, dt, inp) {
  if (w.won || w.dead) return;
  if (w.control) controlStep(w, inp, dt); else w.t += dt;
  for (const o of w.objects) if (o.push) crateFall(w, o, dt);
  refresh(w);

  for (let i = 0; i < w.actors.length; i++) {
    const a = w.actors[i];
    const live = (i === w.sel && !w.control) ? inp : {};
    stepActor(w, a, live, dt);
    // 影は光に呑まれたら消える。実体は箱に挟まれたら消える
    if (!resolve(w, a) || a.y > H + 60) a.dead = true;
    // 影が壁の外にはみ出したら消える
    if (a.kind === 'kage' && (a.x < 0 || a.x > W)) a.dead = true;
  }
  for (let i = w.actors.length - 1; i >= 0; i--) {
    if (!w.actors[i].dead) continue;
    if (i === 0) { w.dead = true; w.events.push({ t: 'die', x: w.actors[0].x, y: w.actors[0].y }); return; }
    w.events.push({ t: 'lost', x: w.actors[i].x, y: w.actors[i].y });
    w.actors.splice(i, 1);
    if (w.sel >= i) w.sel = Math.max(0, w.sel - 1);
    if (w.sel >= w.actors.length) w.sel = 0;
  }
  updateSwitches(w);

  const m = w.actors[0], e = w.def.exit;
  if (m.x >= e.x && m.x <= e.x + e.w && m.y >= e.y && m.y <= e.y + e.h + 4) { w.won = true; w.events.push({ t: 'win', x: m.x, y: m.y }); }
}

const api = {
  W, H, PW, PH, hull, inPoly, createWorld, update, refresh, shadowSolid, bodySolid, blocked, lightLevel, litFull,
  stepActor, resolve, newActor, enterControl, exitControl, selectLight, controllable, spawnKage, dismissKage,
  selectNext, lightPos, objAngle, partPoly, clamp, inShadow, inInk
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.KG = api;
})(typeof window !== 'undefined' ? window : globalThis);
