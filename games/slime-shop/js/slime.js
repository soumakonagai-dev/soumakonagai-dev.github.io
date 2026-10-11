'use strict';
// ====== スライムの判定ロジック（画面に依存しない）======
// ノリ100mlあたりの割合で、固まり具合・水分・泡を判定する

const LIM = { bMin: 15, bEdgeLo: 3, bMax: 40, bEdgeHi: 4, wMax: 320, wEdge: 50, sMax: 20, sEdge: 3 };

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 材料ID→量 の辞書から、判定に必要な数字をまとめる
function mixFromAmt(amt) {
  const m = { glue: 0, borax: 0, water: 0, soap: 0, glitter: 0, paint: 0, snow: 0, glow: 0, ex: {}, fti: {}, stabSum: 0, edBs: 0, edSs: 0 };
  for (const id in amt) {
    const q = amt[id]; if (!(q > 0)) continue;
    const it = ITEMS[id]; if (!it) continue;
    if (it.ft) for (const k in it.ft) m.fti[k] = (m.fti[k] || 0) + q * it.ft[k];
    if (it.kind === 'borax') m.edBs += q * (it.edge || 1); else if (it.kind === 'soap') m.edSs += q * (it.edge || 1);
    if (it.kind === 'glue') { m.glue += q; m.stabSum += q * it.stab; }
    else if (it.kind === 'borax') m.borax += q;
    else if (it.kind === 'water') m.water += q;
    else if (it.kind === 'soap') m.soap += q;
    else if (it.kind === 'glitter') m.glitter += q;
    else if (it.kind === 'paint') m.paint += q;
    else if (it.kind === 'snow') m.snow += q;
    else if (it.kind === 'glow') m.glow += q;
    else if (it.kind === 'extract') { m.ex[it.ex] = (m.ex[it.ex] || 0) + q; if (it.ex === 'secret') m.glitter += q * 2; }   // 秘伝のエキスは金色にキラキラする
  }
  m.stab = m.glue > 0 ? m.stabSum / m.glue : 0.8;
  m.edB = m.borax > 0 ? m.edBs / m.borax : 1; m.edS = m.soap > 0 ? m.edSs / m.soap : 1;
  m.total = m.glue + m.borax + m.water + m.soap;
  return m;
}

// 今日の環境と材料の銘柄で、失敗ラインがずれる
function limits(stab, env, ed) {
  const e = env || { b: 0, w: 0, s: 0 };
  const wob = 1.5 - stab;                       // 安いノリほど環境でぶれやすい
  const band = 0.5 + 0.5 * stab, eb = (ed && ed.b) || 1, es = (ed && ed.s) || 1;                // 安いノリほど「ギリギリ帯」がせまい
  const sh = { b: e.b * wob, w: e.w * wob * 6, s: e.s * wob };   // 水は量が多いので、ぶれ幅も大きい
  return {
    bMin: LIM.bMin + sh.b, bMax: LIM.bMax + sh.b, bEdgeLo: LIM.bEdgeLo * band * eb, bEdgeHi: LIM.bEdgeHi * band * eb,
    wMax: LIM.wMax + sh.w, wEdge: LIM.wEdge * band, sMax: LIM.sMax + sh.s, sEdge: LIM.sEdge * band * es,
  };
}

// 現在の割合（ノリ100あたり）
function ratios(m) {
  if (m.glue <= 0) return { b: 0, w: 0, s: 0 };
  const w = m.water / m.glue * 100, s = m.soap / m.glue * 100;
  const soften = 1 + w / 100 * 0.04 + s / 100 * 0.15;      // 水と泡はホウ砂水の効きを少し弱める
  return { b: m.borax / m.glue * 100 / soften, w, s };
}

// 入れたラメの色（量に応じて）。レインボーは 'rainbow'（キラキラごとに色がちがう）
function glitterCols(amt) {
  const out = [];
  for (const id in amt) { const it = ITEMS[id]; if (it && it.kind === 'glitter' && amt[id] > 0) out.push({ c: id === 'glitter_rainbow' || id === 'glitter_holo' ? 'rainbow' : it.color, w: amt[id] }); if (id === 'extract_secret' && amt[id] > 0) out.push({ c: '#ffd24a', w: amt[id] * 3 }); }
  return out;
}

function mixColor(amt) {
  let r = 0, g = 0, b = 0, n = 0;
  for (const id in amt) {
    const it = ITEMS[id]; if (!it || it.kind !== 'paint' || !(amt[id] > 0)) continue;
    const c = hex2rgb(it.color); r += c[0] * amt[id]; g += c[1] * amt[id]; b += c[2] * amt[id]; n += amt[id];
  }
  const base = [238, 245, 250];
  if (n <= 0) return rgb2hex(base);
  const m = mixFromAmt(amt);
  const ps = n / Math.max(m.total, 1) * 100;
  const k = clamp(0.2 + ps / 2.2, 0, 1);
  const avg = [r / n, g / n, b / n];
  return rgb2hex(base.map((v, i) => v + (avg[i] - v) * k));
}

function hsl(hex) {
  const [r, g, b] = hex2rgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 0.0001) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}

function colorName(hex, hasPaint) {
  if (!hasPaint) return 'クリア';
  const { h, s, l } = hsl(hex);
  if (s < 0.14) return l > 0.9 ? 'ホワイト' : l < 0.3 ? 'ブラック' : 'グレー';
  let n = h < 15 || h >= 345 ? 'レッド' : h < 40 ? 'オレンジ' : h < 70 ? 'イエロー' : h < 160 ? 'グリーン' : h < 200 ? 'みずいろ' : h < 255 ? 'ブルー' : h < 290 ? 'パープル' : 'ピンク';
  if (l > 0.82 && n !== 'みずいろ') n = 'パステル' + n;
  return n;
}

function slimeName(traits, hex, hasPaint, sp, crunch, gl, sec, ft) {
  const ts = TRAITS.filter(t => traits[t] > 0).map(t => TRAIT_NAME[t]).join('');
  const pre = gl >= 1 ? 'ひかる' : crunch >= 0.15 ? 'シャリシャリ' : sp >= 2 ? 'キラキラ' : '';
  const fk = Object.keys(ft || {}).sort((a, b) => ft[b] - ft[a])[0], fp = fk ? FEEL2[fk].name : '';
  return (sec >= 0.2 ? '秘伝の' : '') + fp + pre + colorName(hex, hasPaint) + 'の' + (ts || 'ノーマル') + 'スライム';
}

// 判定。stir は混ぜ具合（0〜、1で十分）
function judge(amt, stir, env) {
  const m = mixFromAmt(amt);
  if (m.glue <= 0) return { ok: false, fail: 'noglue' };
  const L = limits(m.stab, env, { b: m.edB, s: m.edS }), R = ratios(m);
  const out = { m, L, R };
  if (R.s > L.sMax) return { ...out, ok: false, fail: 'melted' };
  if (R.w > L.wMax) return { ...out, ok: false, fail: 'sticky' };
  if (R.b > L.bMax) return { ...out, ok: false, fail: 'hard' };
  if (R.b < L.bMin) return { ...out, ok: false, fail: 'liquid' };

  const traits = {};
  if (R.b < L.bMin + L.bEdgeLo) traits.nettori = clamp((L.bMin + L.bEdgeLo - R.b) / L.bEdgeLo, 0.02, 1);
  if (R.b > L.bMax - L.bEdgeHi) traits.danryoku = clamp((R.b - (L.bMax - L.bEdgeHi)) / L.bEdgeHi, 0.02, 1);
  if (R.w > L.wMax - L.wEdge) traits.torotoro = clamp((R.w - (L.wMax - L.wEdge)) / L.wEdge, 0.02, 1);
  if (R.s > L.sMax - L.sEdge) traits.fuwafuwa = clamp((R.s - (L.sMax - L.sEdge)) / L.sEdge, 0.02, 1);

  const sp = m.glitter / m.total * 100, ps = m.paint / m.total * 100;
  let look = clamp(0.6 + 0.2 * Math.min(sp, 3) / 3 + 0.2 * Math.min(ps, 1.5) / 1.5, 0, 1);
  const rough = sp > 10, stained = ps > 9;
  if (rough) look *= 0.6;
  if (stained) look *= 0.6;
  // 本物のスライムと同じで、ノリより水が多めのほうがうまくいく（水がノリより少ないと、ごわごわして品質ダウン）
  const stirScore = clamp(stir, 0, 1), brand = 0.5 + 0.5 * m.stab, waterScore = R.w >= 100 ? 1 : 0.2 + 0.8 * Math.pow(R.w / 100, 2);
  const qs = 0.3 * stirScore + 0.25 * look + 0.2 * brand + 0.25 * waterScore;
  const q = qs >= 0.97 ? 'S' : qs >= 0.85 ? 'A' : qs >= 0.7 ? 'B' : 'C';

  const color = mixColor(amt), hs = hsl(color);
  const sn = m.snow / m.total * 100, gl = (m.glow + 0.8 * (m.ex.hikari || 0)) / m.total * 100;   // 100mlあたりの回数
  const exp = {}; for (const k in m.ex) exp[k] = m.ex[k] / m.total * 100;
  const sl = { traits, q, qs, color, sp, ps, sn, gl, crunch: clamp(sn / 5, 0, 1), sat: hs.s, light: hs.l, rough, stained, dry: R.w < 100, gcols: glitterCols(amt), ex: exp, sec: exp.secret || 0, ft: (() => { const o = {}; for (const k in FEEL2) { const e = exp[FEEL2[k].ex] || 0; if (e >= 0.15) o[k] = clamp(e / 1.0, 0.2, 1); } for (const k in m.fti) { const e = m.fti[k] / m.total * 100 / 20; if (e >= 0.15) o[k] = clamp(e, 0.2, 1); } return o; })() };
  sl.name = slimeName(traits, color, m.paint > 0, sp, sl.crunch, gl, sl.sec, sl.ft);
  sl.fair = fairPrice(sl);
  return { ...out, ok: true, slime: sl, jars: Math.floor(m.total / JAR_ML) };
}

function fairPrice(sl) {
  let mult = 1, n = 0;
  for (const t of TRAITS) { const s = sl.traits[t] || 0; if (s > 0) { mult *= 1 + 1.6 * s; n++; } }
  if (n >= 2) mult *= 1.25;
  mult *= 1 + 0.7 * (sl.crunch || 0);                            // スノーパウダー：入れるほど高くなる
  for (const k in (sl.ex || {})) mult *= 1 + (EXTRACTS[k] ? EXTRACTS[k][3] : 0) * Math.min(sl.ex[k], 8);   // スライムエキス：入れるほど価値アップ（秘伝は特大）
  const gl = sl.gl || 0; mult *= 1 + 0.15 * gl + 0.06 * gl * gl;  // 蓄光パウダー：入れすぎると、とんでもなく高くなる
  return Math.round(BASE_PRICE * mult * QMULT[sl.q] / 10) * 10;
}

const FAIL_TEXT = {
  noglue: ['ノリがない！', 'スライムの本体になる洗濯ノリが入っていません。'],
  liquid: ['固まらなかった…', 'ホウ砂水が足りない（ノリが多すぎる）ので、ずっと液体のままです。'],
  hard: ['がちがちになった…', 'ホウ砂水が多すぎて、ゴムの塊のように固まってしまいました。'],
  sticky: ['べたべたになった…', '水が多すぎて、手にまとわりつくベタベタになりました。'],
  melted: ['溶けてしまった…', '泡を入れすぎて、水と泡に分離して溶けてしまいました。'],
};

if (typeof module !== 'undefined') module.exports = { glitterCols, judge, limits, ratios, mixFromAmt, mixColor, fairPrice, slimeName, LIM };
