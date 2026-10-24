'use strict';
// ===== キャラごとの攻撃エフェクト（弾の形・当たったときの演出・近接の斬撃・味方オーラ）。オンオフできる =====
const FXCFG = { on: true };
try { const sv = localStorage.getItem('mamori-fx'); FXCFG.on = sv == null ? !PERF.lite : sv !== '0'; } catch (e) { }
function fxSetOn(v) { FXCFG.on = v; try { localStorage.setItem('mamori-fx', v ? '1' : '0'); } catch (e) { } if (!v && typeof FXS !== 'undefined') { FXS.tornados.length = 0; FXS.waters.length = 0; FXS.goos.length = 0; FXS.misc.length = 0; } }
FXS.misc = [];
// ダメージ数字の表示（オンオフ）
FXCFG.num = true; try { FXCFG.num = localStorage.getItem('mamori-dn') !== '0'; } catch (e) { }
function dnSetOn(v) { FXCFG.num = v; try { localStorage.setItem('mamori-dn', v ? '1' : '0'); } catch (e) { } if (!v) FXS.dnums.length = 0; }
{ const baseNum = FX.num; FX.num = function () { if (FXCFG.num) baseNum.apply(FX, arguments); }; }

// 属性のほかに「雷」「氷」の味付けをするキャラ
const K_ELEC = new Set(['thunder', 'stormcaller', 'tesla', 'stormcloud', 'stormtower', 'lightningrod', 'thunderwolf', 'thunderbird', 'raijin', 'raijuu']);
const K_ICE = new Set(['ice', 'icelancer', 'frostbreaker', 'blizzardmage', 'frostqueen', 'penguin', 'glacier', 'slowreaper', 'bubblemage']);
function vfxClass(key) {
  if (K_ELEC.has(key)) return 'elec'; if (K_ICE.has(key)) return 'ice';
  const e = UNITS[key] && UNITS[key].elem; return e || 'light';
}
// 弾の形の指定（なければ属性ごとの標準）
const PSHAPE = {};
(function () {
  const set = (shape, keys) => keys.split(' ').forEach(k => PSHAPE[k] = shape);
  set('arrow', 'crossbow gale holyarcher venomhunter skyhunter timesniper markhunter kiteflyer sparrow cyclonebird');
  set('bullet', 'gunner pirate rampgunner robo turret');
  set('bomb', 'cannon artillery bombrabbit fireworks infernocannon catapult alchemist plaguebomber blastchain');
  set('shuriken', 'ninja shinobi darkcat finisher ghostcat shadowkid');
  set('note', 'mermaid whalesinger bard');
  set('heart', 'killnurse angelcadet');
  set('petal', 'dryad sunflower rosequeen thornpriest mochifox terrawitch sakura');
  set('skull', 'reaper necromancer soulcollector cursewitch');
  set('bat', 'batrider vampire');
  set('star', 'astrologer starchild crystalmage prism candle moonspirit voidwalker cosmos');
  set('coin', 'fisher farmer merchant luckycat');
  set('rock', 'pebble sandwitch sandsage');
  set('flask', 'plaguedoctor');
})();
const shapeOf = key => PSHAPE[key] || (K_ELEC.has(key) ? 'elec' : K_ICE.has(key) ? 'snow' : ({ fire: 'fire', water: 'water', wind: 'wind', earth: 'rock', light: 'light', dark: 'dark' })[UNITS[key] && UNITS[key].elem] || 'light');

const OWN_PROJ = new Set(['archer', 'sniper', 'ice', 'poison', 'reaper', 'mouse']);   // 前から専用の絵があるキャラ
function drawProjFx(c, p, S, t, ang) {
  if (OWN_PROJ.has(p.key)) return false;
  const sh = shapeOf(p.key), col = p.color || '#ffffff', lt2 = '#fff';
  const spin = t * 14;
  switch (sh) {
    case 'fire': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 22, '#ff7a2a', .8); c.rotate(ang); for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(255,${150 + i * 25},${40 + i * 25},${.7 - i * .12})`; c.beginPath(); c.ellipse(-4 - i * 5, Math.sin(t * 30 + i) * 1.4, 7 - i * 1.4, 4.6 - i * .8, 0, 0, TAU); c.fill(); } E(c, 2, 0, 4.4, 3.8, '#fff3b0', false); return true; }
    case 'water': { const w = 1 + .14 * Math.sin(t * 22); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 16, '#5ab8ff', .7); c.globalCompositeOperation = 'source-over'; c.scale(w, 2 - w); const g = c.createRadialGradient(-1.5, -1.5, .5, 0, 0, 6); g.addColorStop(0, '#f0fcff'); g.addColorStop(.5, '#6ac8ff'); g.addColorStop(1, '#2a7ae0'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 5.6, 0, TAU); c.fill(); c.strokeStyle = 'rgba(20,60,140,.7)'; c.lineWidth = 1; c.stroke(); return true; }
    case 'wind': drawMiniTornado(c, t, S); return true;
    case 'rock': { c.rotate(spin * .5); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-4, 2, 9, 3); PL(c, [[-5, -2], [-2, -6], [4, -4], [6, 1], [2, 5], [-4, 4]], '#b88a4a', true); PL(c, [[-2, -5], [3, -3], [0, 0]], '#e8c888', false); return true; }
    case 'light': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 24, '#ffe27a', .9); c.rotate(t * 6); c.fillStyle = 'rgba(255,250,200,.9)'; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -1.6); c.lineTo(11, 0); c.lineTo(0, 1.6); c.fill(); } E(c, 0, 0, 3.4, 3.4, '#ffffff', false); return true; }
    case 'dark': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 22, '#9a50ff', .8); c.globalCompositeOperation = 'source-over'; for (let i = 0; i < 3; i++) { const a = spin * .4 + i * 2.1; E(c, Math.cos(a) * 6, Math.sin(a) * 6, 2.2, 2.2, 'rgba(190,120,255,.9)', false); } E(c, 0, 0, 4.4, 4.4, '#2a1048', true); E(c, -1, -1, 1.2, 1.2, '#e8c0ff', false); return true; }
    case 'elec': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 20, '#ffe27a', .8); c.strokeStyle = '#fff6a0'; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = t * 20 + i * 2.1; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); c.lineTo(Math.cos(a + .7) * 9, Math.sin(a + .7) * 9); c.stroke(); } E(c, 0, 0, 3, 3, '#ffffff', false); return true; }
    case 'snow': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 16, '#9ae8ff', .6); c.globalCompositeOperation = 'source-over'; c.rotate(spin * .3); c.strokeStyle = '#e8fbff'; c.lineWidth = 1.8; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke(); } return true; }
    case 'arrow': { c.rotate(ang); c.strokeStyle = '#fff'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-10, 0); c.lineTo(5, 0); c.stroke(); PL(c, [[6, 0], [1, -2.8], [1, 2.8]], col, false); c.strokeStyle = rgba(col.length === 7 ? col : '#ffffff', .8); c.beginPath(); c.moveTo(-10, 0); c.lineTo(-13, -3); c.moveTo(-10, 0); c.lineTo(-13, 3); c.stroke(); return true; }
    case 'bullet': { c.rotate(ang); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,230,140,.8)'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-14, 0); c.lineTo(3, 0); c.stroke(); glowDot(c, 3, 0, 10, '#ffd24a', .9); E(c, 3, 0, 2.2, 2.2, '#fff', false); return true; }
    case 'bomb': { c.rotate(spin * .3); E(c, 0, 0, 5.6, 5.6, '#3a3a4a', true); hl(c, -2, -2, 1.8, 1.2, 0, .6); c.strokeStyle = '#a07a3a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -5.4); c.quadraticCurveTo(3, -9, 6, -8); c.stroke(); c.globalCompositeOperation = 'lighter'; glowDot(c, 6, -8, 8, '#ffb040', .9 * (.6 + .4 * Math.sin(t * 40))); return true; }
    case 'shuriken': { c.rotate(spin * 1.4); c.fillStyle = '#d8dcea'; c.strokeStyle = OUT; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(3, -2); c.lineTo(8, 0); c.lineTo(3, 1.6); c.closePath(); c.fill(); c.stroke(); } E(c, 0, 0, 1.4, 1.4, '#3a3a4a', false); return true; }
    case 'note': { c.rotate(Math.sin(t * 8) * .3); c.fillStyle = col; E(c, 0, 3, 3.4, 2.6, col, true); c.strokeStyle = OUT; c.lineWidth = 2.6; c.beginPath(); c.moveTo(3, 3); c.lineTo(3, -8); c.lineTo(8, -6); c.stroke(); c.strokeStyle = col; c.lineWidth = 1.4; c.stroke(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 14, col, .5); return true; }
    case 'heart': { const s = 1 + .12 * Math.sin(t * 16); c.scale(s, s); c.fillStyle = '#ff6a9a'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-8, -2, -4, -8, 0, -3); c.bezierCurveTo(4, -8, 8, -2, 0, 4); c.fill(); c.stroke(); hl(c, -2.4, -3, 1.4, 1, 0, .8); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 14, '#ff9ac8', .5); return true; }
    case 'petal': { c.rotate(spin * .35); for (let i = 0; i < 5; i++) { c.rotate(TAU / 5); c.fillStyle = i % 2 ? '#ffb0d0' : '#ff8ab8'; c.beginPath(); c.ellipse(4, 0, 4, 2.2, 0, 0, TAU); c.fill(); } E(c, 0, 0, 1.6, 1.6, '#ffe27a', false); return true; }
    case 'skull': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 18, '#8aff9a', .5); c.globalCompositeOperation = 'source-over'; E(c, 0, -1, 5, 4.6, '#e8f0e0', true); c.fillStyle = '#e8f0e0'; c.fillRect(-2.6, 2, 5.2, 3); c.fillStyle = '#2a2a3a'; c.beginPath(); c.arc(-2, -1.4, 1.3, 0, TAU); c.arc(2, -1.4, 1.3, 0, TAU); c.fill(); return true; }
    case 'bat': { const f = Math.sin(t * 30) * .6; c.fillStyle = '#3a2a4a'; c.strokeStyle = OUT; c.lineWidth = 1; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sg * 6, -7 + f * 4, sg * 11, -1 + f * 3); c.quadraticCurveTo(sg * 8, 1, sg * 6, 3); c.quadraticCurveTo(sg * 3, 1, 0, 3); c.fill(); c.stroke(); } E(c, 0, 0, 2.4, 3, '#4a3a5a', true); c.fillStyle = '#ff4a6a'; c.fillRect(-1.6, -1, 1, 1); c.fillRect(.6, -1, 1, 1); return true; }
    case 'star': { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 20, col, .7); c.globalCompositeOperation = 'source-over'; c.rotate(spin * .5); star5(c, 0, 0, 6, '#fff6a0'); return true; }
    case 'coin': { const w = Math.abs(Math.cos(t * 16)) * 5 + 1; E(c, 0, 0, w, 5, '#ffd24a', true); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-w * .4, -3, w * .3, 5); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 14, '#ffe27a', .5); return true; }
    case 'flask': { c.rotate(spin * .3); E(c, 0, 1, 4, 4.4, 'rgba(160,255,190,.9)', true); c.fillStyle = '#c8d0e0'; c.fillRect(-1.2, -6, 2.4, 4); return true; }
  }
  return false;
}

// ---- 当たったときの演出（種類いろいろ） ----
function mfx(k, x, y, R, col, max) { if (FXS.misc.length < 70) FXS.misc.push({ k, x, y, R: R || 30, col, t: 0, max: max || .7, s: Math.random() * 6 }); }
Object.assign(FX, {
  hitVfx(p) {
    if (!FXCFG.on) return; const d = UNITS[p.u && p.u.key]; if (!d || !G) return; const S = G.L.S, fx = d.fx || {}, x = p.tx, y = p.ty, cls = vfxClass(p.u.key);
    const sp = fx.splash ? fxv(p.u, 'splash') * S : 0, R = Math.max(sp, S * .85);
    switch (cls) {
      case 'wind': FX.tornado(x, y, R); break;
      case 'water': FX.splash(x, y, R); break;
      case 'ice': mfx('snow', x, y, R, '#bff2ff', .7); break;
      case 'fire': mfx('boom', x, y, R, '#ff8a3a', .5); break;
      case 'elec': mfx('spark', x, y, R, '#fff27a', .35); break;
      case 'earth': mfx('crack', x, y, R, '#8a6a3a', .7); break;
      case 'light': mfx('cross', x, y, R, '#fff2a0', .5); break;
      case 'dark': mfx('vortex', x, y, R, '#a050ff', .65); break;
    }
    if (fx.burn) mfx('flame', x, y, R * .8, '#ff8a2a', 1.1);
    if (fx.poison || p.key === 'poison') FX.goo(x, y, R, '#8ae85a');
    else if (fx.slow) FX.goo(x, y, R, cls === 'ice' ? '#7ad8ff' : '#9a8aff');
    if (fx.mark) mfx('mark', x, y, S * .7, '#ff5a8a', .9);
    if (fx.stun || fx.pulseStun) mfx('stars', x, y - 6, S * .6, '#ffe27a', .9);
    if (fx.knock) mfx('gust', x, y, S * .9, '#e8fff0', .45);
    if (fx.exec) mfx('skull', x, y - 10, S * .6, '#e0c8ff', .8);
    if (fx.heal || fx.killHeal) mfx('heart', x, y - 8, S * .6, '#ff8ab8', .9);
    if (fx.gold || fx.gA) mfx('coin', x, y - 8, S * .5, '#ffd24a', .8);
    if (shapeOf(p.u.key) === 'note') mfx('note', x, y - 8, S * .6, '#bff4ff', .9);
    if (fx.crit && Math.random() < .3) mfx('cross', x, y, S * .8, '#ffffff', .35);
  },
  slash(x, y, col, u) {
    if (!FXCFG.on || !u || !UNITS[u.key]) { FXS.slashes.push({ x, y, col, t: 0, max: 0.25, a: Math.random() * TAU }); return; }
    const cls = vfxClass(u.key); mfx('sl_' + cls, x, y, G ? G.L.S : 34, col, .32);
  },
});

const TAU2 = Math.PI * 2;
function drawMisc(c, S, t) {
  for (const m of FXS.misc) {
    const k = m.t / m.max, a = 1 - k, x = m.x, y = m.y, R = m.R; c.save();
    switch (m.k) {
      case 'boom': { c.globalCompositeOperation = 'lighter'; const r = R * (.3 + easeOut(k) * .8); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,240,170,${a})`); g.addColorStop(.5, `rgba(255,140,50,${a * .7})`); g.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * .8, 0, 0, TAU); c.fill(); break; }
      case 'flame': { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const ph = t * 6 + i * 1.7 + m.s, fx0 = x + Math.cos(i * 1.3 + m.s) * R * .5, fy0 = y + Math.sin(i * 2.1) * R * .25 - k * 8; c.fillStyle = `rgba(255,${130 + i * 20},50,${.7 * a})`; c.beginPath(); c.ellipse(fx0, fy0 - Math.abs(Math.sin(ph)) * 5, 2.6, 5.5 + Math.sin(ph) * 2, 0, 0, TAU); c.fill(); } break; }
      case 'spark': { c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU + m.s, r1 = R * (.2 + k * .6); c.strokeStyle = `rgba(255,250,170,${a})`; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(aa + .25) * r1 * .5, y + Math.sin(aa + .25) * r1 * .5); c.lineTo(x + Math.cos(aa) * r1, y + Math.sin(aa) * r1); c.stroke(); } glowDot(c, x, y, R, '#fff27a', a * .6); break; }
      case 'crack': { c.strokeStyle = `rgba(70,45,20,${a * .9})`; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 7; i++) { const aa = i / 7 * TAU + m.s, r1 = R * (.3 + easeOut(Math.min(1, k * 2)) * .7); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(aa + .2) * r1 * .55, y + Math.sin(aa + .2) * r1 * .4); c.lineTo(x + Math.cos(aa) * r1, y + Math.sin(aa) * r1 * .6); c.stroke(); } c.strokeStyle = `rgba(255,230,170,${a * .6})`; c.beginPath(); c.ellipse(x, y, R * (.2 + k * .8), R * (.2 + k * .8) * .5, 0, 0, TAU); c.stroke(); for (let i = 0; i < 5; i++) { const aa = i * 1.3 + m.s, hh = Math.sin(Math.min(1, k * 1.6) * Math.PI) * R * .6; E(c, x + Math.cos(aa) * R * k * .8, y + Math.sin(aa) * R * k * .3 - hh, 2.4, 2, `rgba(150,110,60,${a})`, false); } break; }
      case 'cross': { c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, R * (.6 + k * .5), '#fff2a0', a * .9); const L = R * (.5 + easeOut(k) * 1.1); c.fillStyle = `rgba(255,252,210,${a})`; c.beginPath(); c.moveTo(x - L, y); c.lineTo(x, y - 2.4 * a); c.lineTo(x + L, y); c.lineTo(x, y + 2.4 * a); c.fill(); c.beginPath(); c.moveTo(x, y - L); c.lineTo(x + 2.4 * a, y); c.lineTo(x, y + L); c.lineTo(x - 2.4 * a, y); c.fill(); break; }
      case 'vortex': { c.lineCap = 'round'; for (let j = 0; j < 3; j++) { c.strokeStyle = `rgba(${150 + j * 30},80,255,${a * (.8 - j * .2)})`; c.lineWidth = 2.2; c.beginPath(); for (let i = 0; i <= 18; i++) { const f = i / 18, r1 = R * (1 - f) * (1 - k * .4) * .9, aa = f * 7 + t * 8 + j * 2.1; const px = x + Math.cos(aa) * r1, py = y + Math.sin(aa) * r1 * .55; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); } c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, R * .7, '#7a2aff', a * .6); break; }
      case 'snow': { c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, R, '#bff2ff', a * .5); c.globalCompositeOperation = 'source-over'; c.translate(x, y); c.rotate(k * 1.6); c.strokeStyle = `rgba(232,251,255,${a})`; c.lineWidth = 2; c.lineCap = 'round'; const L = R * (.3 + easeOut(k) * .7); for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(L, 0); c.moveTo(L * .6, 0); c.lineTo(L * .75, -L * .15); c.moveTo(L * .6, 0); c.lineTo(L * .75, L * .15); c.stroke(); } break; }
      case 'stars': { for (let i = 0; i < 3; i++) { const aa = t * 6 + i * 2.1; star5(c, x + Math.cos(aa) * R * .5, y - 8 + Math.sin(aa) * R * .2, 3.4, `rgba(255,236,120,${a})`); } break; }
      case 'mark': { c.strokeStyle = `rgba(255,90,140,${a})`; c.lineWidth = 2; const r = R * (1.4 - Math.min(1, k * 3) * .5); c.beginPath(); c.arc(x, y - 4, r, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(x - r * 1.3, y - 4); c.lineTo(x - r * .6, y - 4); c.moveTo(x + r * .6, y - 4); c.lineTo(x + r * 1.3, y - 4); c.moveTo(x, y - 4 - r * 1.3); c.lineTo(x, y - 4 - r * .6); c.moveTo(x, y - 4 + r * .6); c.lineTo(x, y - 4 + r * 1.3); c.stroke(); break; }
      case 'gust': { c.strokeStyle = `rgba(235,255,245,${a})`; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { const aa = i / 4 * TAU + m.s, r0 = R * (.2 + k * .3), r1 = R * (.5 + k * .8); c.beginPath(); c.arc(x, y, r1, aa, aa + .6); c.stroke(); } break; }
      case 'skull': { const yy = y - k * 24; c.globalAlpha = a; E(c, x, yy, 6, 5.6, '#efe8ff', true); c.fillStyle = '#efe8ff'; c.fillRect(x - 3, yy + 3, 6, 4); c.fillStyle = '#3a1a5a'; c.beginPath(); c.arc(x - 2.4, yy - .6, 1.6, 0, TAU); c.arc(x + 2.4, yy - .6, 1.6, 0, TAU); c.fill(); break; }
      case 'heart': { for (let i = 0; i < 3; i++) { const q = clamp(k * 1.2 - i * .12, 0, 1), hx = x + (i - 1) * 10 + Math.sin(q * 6 + i) * 3, hy = y - q * 28; c.globalAlpha = (1 - q) * .95; c.fillStyle = '#ff7aa8'; c.beginPath(); c.moveTo(hx, hy + 3); c.bezierCurveTo(hx - 6, hy - 2, hx - 3, hy - 6, hx, hy - 2); c.bezierCurveTo(hx + 3, hy - 6, hx + 6, hy - 2, hx, hy + 3); c.fill(); } break; }
      case 'coin': { for (let i = 0; i < 3; i++) { const q = clamp(k * 1.2 - i * .1, 0, 1), cx2 = x + (i - 1) * 9, cy2 = y - Math.sin(q * Math.PI) * 22; c.globalAlpha = 1 - q * .6; E(c, cx2, cy2, Math.abs(Math.cos(q * 12)) * 3.4 + .8, 3.4, '#ffd24a', true); } break; }
      case 'note': { for (let i = 0; i < 2; i++) { const q = clamp(k * 1.2 - i * .15, 0, 1), nx = x + (i ? 8 : -8) + Math.sin(q * 7) * 4, ny = y - q * 26; c.globalAlpha = 1 - q; c.fillStyle = '#bff4ff'; c.beginPath(); c.ellipse(nx, ny, 2.8, 2.2, 0, 0, TAU); c.fill(); c.strokeStyle = '#bff4ff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(nx + 2.6, ny); c.lineTo(nx + 2.6, ny - 9); c.lineTo(nx + 6, ny - 7); c.stroke(); } break; }
      // 近接の斬撃（属性ごとに形がちがう）
      case 'sl_fire': { c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; for (const [w, col] of [[8, `rgba(255,120,40,${a * .6})`], [3, `rgba(255,240,180,${a})`]]) { c.strokeStyle = col; c.lineWidth = w * (1 - k * .5); c.beginPath(); c.arc(x, y, 14, -2.2 + m.s * .1, -2.2 + m.s * .1 + 2.4 * easeOut(k)); c.stroke(); } for (let i = 0; i < 3; i++) glowDot(c, x + Math.cos(-1 + i) * 14, y + Math.sin(-1 + i) * 14 - k * 8, 8, '#ff8a2a', a * .7); break; }
      case 'sl_water': { c.lineCap = 'round'; c.strokeStyle = `rgba(120,200,255,${a})`; c.lineWidth = 5 * (1 - k * .5); c.beginPath(); for (let i = 0; i <= 12; i++) { const f = i / 12, px = x - 16 + f * 32 * easeOut(Math.min(1, k * 1.4)), py = y + Math.sin(f * 9 + t * 20) * 3 - 4; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.strokeStyle = `rgba(240,252,255,${a})`; c.lineWidth = 1.6; c.stroke(); break; }
      case 'sl_ice': { c.lineCap = 'round'; c.strokeStyle = `rgba(190,240,255,${a})`; c.lineWidth = 4 * (1 - k * .5); c.beginPath(); c.arc(x, y, 14, m.s, m.s + 2 * easeOut(k)); c.stroke(); for (let i = 0; i < 4; i++) { const aa = m.s + i * .6; star5(c, x + Math.cos(aa) * 14, y + Math.sin(aa) * 14, 2.4 * a, `rgba(232,251,255,${a})`); } break; }
      case 'sl_wind': { c.lineCap = 'round'; for (let j = 0; j < 2; j++) { c.strokeStyle = `rgba(220,255,235,${a * (1 - j * .35)})`; c.lineWidth = 3 - j; c.beginPath(); c.ellipse(x, y, 16 - j * 4, 7 - j * 2, m.s, -.4 + k, 2.4 * easeOut(k) + (j ? .5 : 0)); c.stroke(); } break; }
      case 'sl_elec': { c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = `rgba(255,250,170,${a})`; c.lineWidth = 2.4; c.beginPath(); let px = x - 14, py = y - 10; c.moveTo(px, py); for (let i = 0; i < 5; i++) { px += 6 + (Math.sin(m.s + i * 5) * 2); py += 4 + Math.cos(m.s + i * 3) * 4; c.lineTo(px, py); } c.stroke(); glowDot(c, x, y, 18, '#ffe27a', a * .6); break; }
      case 'sl_earth': { c.strokeStyle = `rgba(110,80,40,${a})`; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 5; i++) { const aa = i / 5 * TAU + m.s, r1 = 8 + easeOut(k) * 12; c.beginPath(); c.moveTo(x + Math.cos(aa) * 4, y + Math.sin(aa) * 3); c.lineTo(x + Math.cos(aa) * r1, y + Math.sin(aa) * r1 * .7); c.stroke(); } c.strokeStyle = `rgba(255,240,200,${a * .8})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 6 + easeOut(k) * 16, (6 + easeOut(k) * 16) * .5, 0, 0, TAU); c.stroke(); break; }
      case 'sl_light': { c.globalCompositeOperation = 'lighter'; const L = 22 * easeOut(Math.min(1, k * 1.5)); c.strokeStyle = `rgba(255,248,200,${a})`; c.lineWidth = 3.2 * (1 - k * .5); c.lineCap = 'round'; c.beginPath(); c.moveTo(x - L, y + L * .7); c.lineTo(x + L, y - L * .7); c.stroke(); c.beginPath(); c.moveTo(x - L * .7, y - L * .7); c.lineTo(x + L * .7, y + L * .7); c.stroke(); glowDot(c, x, y, 16, '#fff2a0', a * .8); break; }
      case 'sl_dark': { c.lineCap = 'round'; for (let j = -1; j <= 1; j++) { c.strokeStyle = j ? `rgba(170,100,255,${a})` : `rgba(240,220,255,${a})`; c.lineWidth = j ? 3 : 2; const o = j * 6, L = 18 * easeOut(Math.min(1, k * 1.6)); c.beginPath(); c.moveTo(x - L + o, y - L); c.quadraticCurveTo(x + o + 4, y, x + L + o, y + L); c.stroke(); } break; }
    }
    c.restore();
  }
}

// ---- 味方の足もと：弱体のぐにょぐにょに加えて、強化オーラ（上向きの光） ----
function drawBuffAura(c, S, t) {
  const BC = { aAtk: '#ff9a5a', aAspd: '#6ad8ff', aRange: '#8aff9a', aChance: '#ffe27a' };
  for (const u of G.units) {
    const d = UNITS[u.key], fx = d.fx || {}; let key = null;
    if (u.key === 'siren') key = 'aAspd'; else if (u.key === 'priest') key = 'aAtk';
    else if (d.style === 'none') key = fx.aAspd ? 'aAspd' : fx.aAtk ? 'aAtk' : fx.aRange ? 'aRange' : fx.aChance ? 'aChance' : null;
    if (!key) continue;
    const R = (u.st ? u.st.range : d.range * S), col = BC[key]; if (R > S * 20) continue;
    c.save(); c.strokeStyle = rgba(col, .5); c.lineWidth = 1.6; c.setLineDash([6, 7]); c.lineDashOffset = -t * 14; c.beginPath(); c.ellipse(u.x, u.y, R, R * .78, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = rgba(col, .07); c.fill();
    for (let i = 0; i < 7; i++) { const q = (t * .35 + i * .143) % 1, aa = i * 2.4 + u.id, rr = R * .8 * Math.sqrt(((i * 37) % 7 + 1) / 8), px = u.x + Math.cos(aa) * rr, py = u.y + Math.sin(aa) * rr * .78 - q * 14; c.globalAlpha = (1 - q) * .9; c.fillStyle = col; c.beginPath(); c.moveTo(px, py - 4); c.lineTo(px + 2.6, py); c.lineTo(px - 2.6, py); c.fill(); }
    c.restore();
  }
}
