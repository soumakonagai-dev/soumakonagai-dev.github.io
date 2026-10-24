"use strict";
// ============================================================
//  ミズツカイ  ― 水をあやつる謎解き2Dアクション
//  ステージデータは js/levels.js
// ============================================================
const W = 640, H = 352, CELL = 4, TILE = 16;
const GW = W / CELL, GH = H / CELL, TW = W / TILE, TH = H / TILE;
const EMPTY = 0, WATER = 1, MUD = 2, DIRT = 3, WALL = 4, GATE = 5, FIRE = 6, SEED = 7, DRAIN = 8, SPIKE = 9, LOCK = 10, CRYSTAL = 11, TOGGLE = 12, FROST = 13, ICE = 14, GRATE = 15, TERM = 16, CRACK = 17, POWER = 18, WIRE = 19;
const GRAB_R = 26;
// ---- むずかしさ調整（ここの数字をいじるとゲーム全体の手ごたえが変わる） ----
const DIFF = {
  holdScale: .75,        // 一度につかめる水の量（各ステージの maxHold にかける倍率）
  freezeRange: 24,       // 冷気ブロックから何マス(1/4タイル)先まで水が凍るか
  fireHP: 14,            // 火のかべ1マスを消すのに必要な水
  spirit: { hp: 8, speed: .9 },          // ひのこ
  crab: { hp: 14, speed: .7, drown: 150 },
  turtle: { speed: .45, drown: 260 },
  bat: { hp: 4, range: 220, speed: 3.4, rest: 55 },
  turret: { hp: 10, interval: 80, shot: 2.8 },
  jelly: { dry: 150 },   // 干からびるまでのフレーム数
  sponge: { full: 80 },  // 破裂するまでに吸う水
};
const FIRE_HP = DIFF.fireHP;
const maxHold = () => Math.round(L.maxHold * DIFF.holdScale);
const GATE_CH = { G: 0, A: 0, B: 1, C: 2 }, SENSOR_CH = { S: 0, '1': 0, '2': 1, '3': 2 }, PLATE_CH = { '4': 0, '5': 1, '6': 2 };
const GROUP_COL = ['#ffd860', '#ff8ad8', '#8affc0'];

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const fluidCv = document.createElement('canvas'); fluidCv.width = GW; fluidCv.height = GH;
const fctx = fluidCv.getContext('2d'), fimg = fctx.createImageData(GW, GH), fpx = new Uint32Array(fimg.data.buffer);
const RS = 2; // 描画の細かさ（ゲーム座標1ドットを何ピクセルで描くか）
cv.width = W * RS; cv.height = H * RS;
const wallCv = document.createElement('canvas'); wallCv.width = W * RS; wallCv.height = H * RS;

const grid = new Uint8Array(GW * GH), stamp = new Uint8Array(GW * GH), elec = new Uint8Array(GW * GH);
const bfsQ = new Int32Array(GW * GH);
let tick = 1, frame = 0, testMode = false;
let L, levelIndex = 0, state = 'title', stateTimer = 0;
let fireHP, seeds, seedAtTile, sensors, gates, gateOpen, sensorCount, sensorNeed, vines, oneway, enemies, shots, crates, exitDoor;
// ゼルダ風の仕掛け: カギ・カギ扉・床スイッチ・クリスタル・赤青ブロック・燭台
let keyItems, keys_ = 0, locks, plates, platePressed, crystals, crystalOn, crystalCd, toggles, braziers;
// 6章: 冷気ブロック・氷・鉄格子・電極
const cold = new Uint8Array(GW * GH);
let terminals = [], termPowered = false;
// 7章〜: 暗いステージ・回路・電球・バクダン
let wires, bulbs = [], powerSrc = [], poweredWet = [], fuses = [], bombs = [];
const lightCv = document.createElement('canvas'); lightCv.width = W * RS; lightCv.height = H * RS;
const lctx = lightCv.getContext('2d');
let held = [], free = [], fx = [], P, rainAcc = 0, mudStuck = 0, elecOn = false;

// ---------------- セーブ ----------------
const SAVE_KEY = 'mizutsukai-cleared';
let cleared = new Set();
// クリアしたステージは名前で保存する（ステージが増えて番号がずれても大丈夫なように）
// 古いセーブ（番号）は、ステージを足す前の並びで名前に直す
const OLD_LEVEL_ORDER_44 = ['はじめての水','重さのスイッチ','水でおよごう','うかぶ木箱','とどかない場所','すり抜ける足場','トゲの池','ふたつのスイッチ','ひのこ退治','ツタを育てよう','コウモリのどうくつ','ほのおのほうだい','かたいカメ','すいとりムシ','でんきクラゲ','てきだらけ','水をはこべ','水のたて','もれるスイッチ','コウモリと水はこび','おちながら','はしれ！スイッチ','クラゲの海をわたれ','いっしょに総仕上げ','さきに火を消せ','クラゲが先','どっちのたね？','ゲートが先','木箱が先','せきを開けると','じゅんばん総仕上げ','雨と泥','雨でうかべ','雨の前に橋を','カメと大雨','どろの海','泥水の池','こおりの足場','電気を切れ','ほのおだんを使え','てきに火をかりる','クラゲの電気','ぜんぶつなげろ','みずのはて'];
try {
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]');
  for (const v of raw) { const name = typeof v === 'number' ? OLD_LEVEL_ORDER_44[v] : v; const i = LEVELS.findIndex(l => l.name === name); if (i >= 0) cleared.add(i); }
} catch (e) { }
function saveProgress() { try { localStorage.setItem(SAVE_KEY, JSON.stringify([...cleared].map(i => LEVELS[i].name))); } catch (e) { } }

// ---------------- バッジ ----------------
const BADGES = [
  { id: 'first', name: 'はじめの一滴', desc: '1-1 をクリア' },
  { id: 'w1', name: '水のきほん修了', desc: 'W1 のステージを全部クリア' },
  { id: 'w2', name: 'てき退治の達人', desc: 'W2 のステージを全部クリア' },
  { id: 'w3', name: 'ながら名人', desc: 'W3 のステージを全部クリア' },
  { id: 'w4', name: '順番の哲学者', desc: 'W4 のステージを全部クリア' },
  { id: 'w5', name: '雨と泥の旅人', desc: 'W5 のステージを全部クリア' },
  { id: 'w6', name: 'ひらめきの王', desc: 'W6 のステージを全部クリア' },
  { id: 'nomiss', name: 'ノーミス', desc: 'W4 以降のステージを一度もやられずにクリア' },
  { id: 'speed', name: 'スピードスター', desc: '1-1 を20秒以内にクリア' },
  { id: 'carry', name: '水を持ち帰る', desc: '水を50以上持ったままゴール' },
  { id: 'peace', name: '平和主義', desc: '2-3 をひのこを1体もたおさずにクリア' },
  { id: 'die1', name: 'いたた…', desc: 'はじめてやられる' },
  { id: 'zap', name: 'しびれた', desc: '電気の流れた水にふれる' },
  { id: 'spike', name: 'トゲトゲ', desc: 'トゲにささる' },
  { id: 'burn', name: 'あちち', desc: '火やほのおだんでやられる' },
  { id: 'mud', name: 'どろんこ', desc: '泥に5秒ハマる' },
  { id: 'die10', name: '七転び八起き', desc: '合計10回やられる' },
  { id: 'shield', name: '鉄壁の水', desc: 'ほのおだんを水で合計30回ふせぐ' },
  { id: 'fireman', name: '消防士', desc: '火のかべを合計30マス消す' },
  { id: 'ice', name: '氷の職人', desc: '水を合計500マス凍らせる' },
  { id: 'vine', name: 'みどりの手', desc: 'ツタを合計5本育てる' },
  { id: 'hunter', name: 'ハンター', desc: 'てきを合計40体たおす' },
  { id: 'zukan', name: 'いきもの図鑑', desc: '7種類のてきを全部たおす' },
  { id: 'captain', name: '木箱の船長', desc: '木箱に乗ったまま200ドット進む' },
  { id: 'power', name: '電気工事士', desc: '電極を光らせる' },
  { id: 'crystal', name: 'てきの火も使いよう', desc: 'ほのおだんでクリスタルを切りかえる' },
  { id: 'w7', name: 'くらやみの電気屋', desc: 'W7 のステージを全部クリア' },
  { id: 'w8', name: '爆弾処理班', desc: 'W8 のステージを全部クリア' },
  { id: 'w9', name: '火の山の主', desc: 'W9 のステージを全部クリア' },
  { id: 'w10', name: 'さいごの水使い', desc: 'W10 のステージを全部クリア' },
  { id: 'boss', name: '大王をしずめた', desc: 'どろガメ大王をたおす' },
  { id: 'boss2', name: '大王ふたたび', desc: '10-5 まっくらボス をクリア' },
  { id: 'ghost', name: 'ゴーストバスター', desc: 'おばけを合計10体たおす' },
  { id: 'stone', name: '石の彫刻家', desc: 'ほのおトカゲを石にする' },
  { id: 'defuse', name: 'ムシ止め', desc: 'バクダンムシを水で止める' },
  { id: 'fuse', name: '導火線キャンセラー', desc: '導火線の火を合計5回消す' },
  { id: 'relight', name: 'もういちど点火', desc: '消えた導火線に火をつけなおす' },
  { id: 'boom', name: '発破職人', desc: 'ばくはつでひびのかべをこわす' },
  { id: 'bright', name: 'まぶしい！', desc: '電球を明るさ2にする' },
  { id: 'lightgate', name: '光の扉', desc: '光のゲートを開く' },
  { id: 'fboss', name: '炎を消しつくす者', desc: 'ほのお大魔王をたおす' },
  { id: 'faucet', name: '蛇口ひねり', desc: '空になった蛇口を自分でひねる' },
  { id: 'tutorial', name: 'はじめの一歩', desc: 'チュートリアルをさいごまでやる' },
];
const BADGE_KEY = 'mizutsukai-badges';
let badges = { got: [], stats: { deaths: 0, shield: 0, fires: 0, ice: 0, vines: 0, kills: 0, kinds: [] } };
try { const b = JSON.parse(localStorage.getItem(BADGE_KEY) || 'null'); if (b && b.got && b.stats) badges = b; } catch (e) { }
const badgeGot = new Set(badges.got);
let toasts = [];
function saveBadges() { badges.got = [...badgeGot]; try { localStorage.setItem(BADGE_KEY, JSON.stringify(badges)); } catch (e) { } }
function award(id) {
  if (badgeGot.has(id) || testMode) return;
  const b = BADGES.find(b => b.id === id); if (!b) return;
  badgeGot.add(id); saveBadges(); sfx('key');
  toasts.push({ text: '🏅 バッジ「' + b.name + '」', t: 200 });
  if (badgeGot.size === BADGES.length) toasts.push({ text: '✨ ぜんぶ集めた！ ステージえらびに何かが…', t: 320 });
}
function stat(name, n, limit, id) { // 合計の記録をふやし、limit に達したらバッジ
  if (testMode) return;
  badges.stats[name] = (badges.stats[name] || 0) + n;
  if (badges.stats[name] >= limit) award(id); else if (frame % 30 === 0) saveBadges();
}
const allBadges = () => badgeGot.size >= BADGES.length;
const isHiddenLevel = i => !!(WORLDS[LEVELS[i].world] || {}).hidden;
const isTutorialLevel = i => !!(WORLDS[LEVELS[i].world] || {}).tutorial;
const levelVisible = i => !isTutorialLevel(i) && (!isHiddenLevel(i) || allBadges() || cleared.has(i));
// 開発用: コンソールで unlockAllBadges() と打つと全部もらえる
window.unlockAllBadges = () => { BADGES.forEach(b => badgeGot.add(b.id)); saveBadges(); };
// 開発用: アドレスの最後に ?allbadges をつけて開くと、バッジが全部そろった状態になる
if (/[?&]allbadges/.test(location.search)) unlockAllBadges();
// いま遊んでいる1回分の記録（やられても続く。ステージえらび・つぎへで入りなおすとリセット）
let run = { deaths: 0, frames: 0, spiritKills: 0, ride: 0 };

// ---------------- 入力（キーボード・マウス・タッチ） ----------------
const keys = {}, pressed = {};
addEventListener('keydown', e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
const touch = { left: false, right: false, up: false, down: false, jump: false };
const mouse = { x: W / 2, y: H / 2, down: false, id: null, cx: 0, cy: 0 };
let touchMode = false;
function setTouchMode(on) {
  if (touchMode === on) return;
  touchMode = on; document.body.classList.toggle('touch', on); fit();
}
function toGame(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
}
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') setTouchMode(true);
  const [x, y] = toGame(e);
  if (mouse.id !== null && mouse.down) return;
  mouse.cx = x; mouse.cy = y; pressed.Click = true;
  // 指で水が隠れないよう、タッチのときは少し上を狙う
  const off = e.pointerType === 'touch' ? 22 : 0;
  mouse.x = x; mouse.y = y - off; mouse.off = off;
  mouse.down = true; mouse.id = e.pointerId;
  try { cv.setPointerCapture(e.pointerId); } catch (er) { }
  if (AC && AC.state === 'suspended') AC.resume();
});
cv.addEventListener('pointermove', e => {
  if (mouse.down && e.pointerId !== mouse.id) return;
  const [x, y] = toGame(e);
  mouse.x = x; mouse.y = y - (mouse.down ? mouse.off || 0 : 0);
});
const endPointer = e => { if (e.pointerId === mouse.id) { mouse.down = false; mouse.id = null; } };
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('contextmenu', e => e.preventDefault());

// 仮想パッド
const padEl = document.getElementById('pad'), knob = document.getElementById('knob');
let padId = null;
function padUpdate(e) {
  const r = padEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dx = e.clientX - cx, dy = e.clientY - cy, dead = r.width * .12, vert = r.width * .24;
  touch.left = dx < -dead; touch.right = dx > dead; touch.up = dy < -vert; touch.down = dy > vert;
  const d = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx);
  knob.style.transform = `translate(${Math.cos(a) * d * r.width * .3}px,${Math.sin(a) * d * r.width * .3}px)`;
  for (const [c, on] of [['u', touch.up], ['d', touch.down], ['l', touch.left], ['r', touch.right]])
    padEl.querySelector('.' + c).classList.toggle('on', on);
}
function padEnd(e) {
  if (e.pointerId !== padId) return;
  padId = null; touch.left = touch.right = touch.up = touch.down = false; knob.style.transform = '';
  padEl.querySelectorAll('span').forEach(s => s.classList.remove('on'));
}
padEl.addEventListener('pointerdown', e => {
  padId = e.pointerId; try { padEl.setPointerCapture(e.pointerId); } catch (er) { }
  padUpdate(e); e.preventDefault();
});
padEl.addEventListener('pointermove', e => { if (e.pointerId === padId) padUpdate(e); });
padEl.addEventListener('pointerup', padEnd); padEl.addEventListener('pointercancel', padEnd);
const jumpEl = document.getElementById('jump');
jumpEl.addEventListener('pointerdown', e => { touch.jump = true; pressed.Jump = true; jumpEl.classList.add('on'); e.preventDefault(); });
const jumpEnd = () => { touch.jump = false; jumpEl.classList.remove('on'); };
jumpEl.addEventListener('pointerup', jumpEnd); jumpEl.addEventListener('pointercancel', jumpEnd); jumpEl.addEventListener('pointerleave', jumpEnd);
document.getElementById('bretry').addEventListener('pointerdown', e => { pressed.KeyR = true; e.preventDefault(); });
document.getElementById('bmenu').addEventListener('pointerdown', e => { pressed.Escape = true; e.preventDefault(); });
addEventListener('touchstart', () => setTouchMode(true), { passive: true });
addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// ---------------- 効果音（WebAudio） ----------------
let AC = null; const lastSfx = {};
// ---------------- BGM（楽器の音源で鳴らす。読みこめないときは電子音） ----------------
let bgmOn = true; try { bgmOn = localStorage.getItem('mizutsukai-bgm') !== '0'; } catch (e) { }
const NOTE = n => { if (!n || n === '-') return null; const m = /^([A-G])(#?)(\d)$/.exec(n); return 440 * Math.pow(2, ({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12) / 12); };
const seq = str => str.trim().split(/\s+/).map(n => n === '-' ? null : { n, f: NOTE(n) });
const MUSIC = {
  calm: { bpm: 88, mw: 'triangle', bw: 'sine', drums: 'soft', mi: 'acoustic_grand_piano', bi: 'orchestral_harp', ml: 6, bl: 12, sv: 2,
    mel: seq('E5 - G5 - C6 - B5 - A5 - G5 - E5 - - - D5 - E5 - G5 - - - - - - - C5 - E5 - G5 - A5 - G5 - E5 - D5 - C5 - - - D5 - E5 - D5 - - - - - - -'),
    bass: seq('C3 - - - - - - - A2 - - - - - - - F2 - - - - - - - G2 - - - - - - -') },
  play: { bpm: 116, mw: 'square', bw: 'triangle', drums: 'beat', mi: 'xylophone', bi: 'pizzicato_strings', ml: 3, bl: 3,
    mel: seq('G5 - D5 G5 B5 - A5 G5 E5 - G5 - D5 - - - C5 - E5 G5 A5 - G5 E5 D5 - B4 - G4 - - - B4 - D5 - G5 - F#5 G5 A5 - B5 - A5 - - - G5 - E5 - C5 - E5 - D5 - - - - - - -'),
    bass: seq('G2 - G3 - D3 - G3 - C3 - C3 - D3 - D3 - E3 - E3 - B2 - B2 - C3 - D3 - G2 - - -') },
  play2: { bpm: 128, mw: 'square', bw: 'triangle', drums: 'beat', mi: 'flute', bi: 'pizzicato_strings', ml: 2.5, bl: 3,
    mel: seq('A4 - C5 E5 A5 - G5 E5 F5 - E5 - D5 - C5 - D5 - F5 A5 C6 - B5 A5 G#5 - E5 - - - - - A5 - G5 - F5 - E5 - D5 - E5 - F5 - G5 - E5 - C5 - D5 - E5 - - - A4 - - - - - - -'),
    bass: seq('A2 - A3 - A2 - A3 - F2 - F3 - F2 - F3 - D2 - D3 - D2 - D3 - E2 - E3 - E2 - E3 -') },
  dark: { bpm: 72, mw: 'sine', bw: 'triangle', drums: 'none', mi: 'celesta', bi: 'string_ensemble_1', ml: 6, bl: 15, sv: 2,
    mel: seq('A4 - - - C5 - - - E5 - - - D5 - - - C5 - - - B4 - - - G4 - - - - - - - A4 - - - E5 - - - G5 - - - F5 - - - E5 - - - D5 - - - B4 - - - - - - -'),
    bass: seq('A2 - - - - - - - - - - - - - - - F2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - -') },
  boss: { bpm: 156, mw: 'sawtooth', bw: 'square', drums: 'hard', mi: 'brass_section', bi: 'electric_bass_finger', xi: 'timpani', ml: 2, bl: 1.6,
    mel: seq('D5 - F5 - A5 - G5 F5 E5 - C5 - D5 - - - A5 - C6 - A5 G5 F5 - E5 F5 G5 - A5 - - - D6 - C6 - A5 - G5 - F5 - G5 - A5 - E5 - F5 - D5 - E5 - C5 - D5 - - - D5 D5 - -'),
    bass: seq('D2 D3 D2 D3 D2 D3 D2 D3 A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2 C2 C3 C2 C3 C2 C3 C2 C3 A1 A2 A1 A2 C#2 C#3 E2 E3') },
};
let bgmTrack = null, bgmStep = 0, bgmNext = 0, bgmGain = null, noiseBuf = null;
// 楽器の音源: FluidR3_GM（Frank Wen 作・CC BY 3.0）を midi-js-soundfonts（Benjamin Gleitzman）の形式で読みこむ
const SF_BASE = ['https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/', 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/'];
const sfInst = {}; // 楽器名 → { state, data: 音名→mp3(base64), buf: 音名→AudioBuffer }
const flatName = n => n.replace(/^([A-G])#/, (m, l) => ({ C: 'Db', D: 'Eb', F: 'Gb', G: 'Ab', A: 'Bb' })[l]); // 音源は♭の名前
async function sfLoad(name, notes) {
  let ins = sfInst[name];
  if (!ins) {
    ins = sfInst[name] = { state: 'loading', data: null, buf: {}, wait: null };
    ins.wait = (async () => {
      for (const base of SF_BASE) {
        try { const r = await fetch(base + name + '-mp3.js'); if (!r.ok) continue; const txt = await r.text(); const data = {}, re = /"([A-G]b?\d)":\s*"data:audio\/mp3;base64,([^"]+)"/g; let m; while ((m = re.exec(txt))) data[m[1]] = m[2]; ins.data = data; return; } catch (e) { }
      }
    })();
  }
  await ins.wait;
  if (!ins.data) { ins.state = 'fail'; return; }
  await Promise.all([...notes].filter(n => !ins.buf[n]).map(async n => {
    const b64 = ins.data[flatName(n)]; if (!b64) return;
    try { const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); ins.buf[n] = await AC.decodeAudioData(arr.buffer); } catch (e) { }
  }));
  ins.state = 'ready';
}
// 曲で使う音だけ読みこんでおく
function sfPrepare(tr) {
  const mel = new Set(tr.mel.filter(Boolean).map(x => x.n)), bass = new Set(tr.bass.filter(Boolean).map(x => x.n));
  if (tr.mi) sfLoad(tr.mi, mel); if (tr.bi) sfLoad(tr.bi, bass); if (tr.xi) sfLoad(tr.xi, bass);
}
function sfPlay(name, n, t, dur, vol) {
  const ins = name && sfInst[name], b = ins && ins.buf[n]; if (!b) return false;
  const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = b; src.connect(g); g.connect(bgmGain);
  g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(.001, t + dur + .3);
  src.start(t); src.stop(t + dur + .35); return true;
}
function bgmWant() {
  if (state === 'title' || state === 'select' || state === 'badges' || !L) return 'calm';
  if (enemies.some(e => e.alive && (e.type === 'boss' || e.type === 'fboss'))) return 'boss';
  if (L.dark) return 'dark';
  return L.world >= 6 ? 'play2' : 'play';
}
function tone(type, f, t, dur, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.connect(g); g.connect(bgmGain);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.start(t); o.stop(t + dur + .02);
}
function drum(kind, t) {
  if (kind === 'kick') {
    const o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(bgmGain);
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
    g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .15); o.start(t); o.stop(t + .16);
  } else {
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * .1, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const n = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain(); n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 6000;
    n.connect(hp); hp.connect(g); g.connect(bgmGain); g.gain.setValueAtTime(kind === 'hat' ? .06 : .12, t); g.gain.exponentialRampToValueAtTime(.001, t + (kind === 'hat' ? .04 : .09)); n.start(t); n.stop(t + .1);
  }
}
function bgmTick() {
  if (!AC || testMode) return;
  if (!bgmGain) { bgmGain = AC.createGain(); bgmGain.gain.value = 0; bgmGain.connect(AC.destination); }
  bgmGain.gain.setTargetAtTime(bgmOn && state !== 'pause' ? .5 : (bgmOn ? .18 : 0), AC.currentTime, .1);
  const want = bgmWant();
  if (want !== bgmTrack) { bgmTrack = want; bgmStep = 0; bgmNext = AC.currentTime + .08; sfPrepare(MUSIC[want]); }
  const tr = MUSIC[bgmTrack], dt = 60 / tr.bpm / 4;
  if (bgmNext < AC.currentTime - .5) bgmNext = AC.currentTime + .05;
  while (bgmNext < AC.currentTime + .2) {
    const t = bgmNext, i = bgmStep, m = tr.mel[i % tr.mel.length], b = tr.bass[i % tr.bass.length];
    // 楽器の音が用意できていればそれで、まだなら電子音で
    if (m && !sfPlay(tr.mi, m.n, t, dt * tr.ml, .42 * (tr.sv || 1))) tone(tr.mw, m.f, t, dt * (tr.mw === 'sine' ? 6 : 2.2), tr.mw === 'sawtooth' ? .035 : tr.mw === 'square' ? .04 : .07);
    if (b && !sfPlay(tr.bi, b.n, t, dt * tr.bl, (tr.drums === 'none' ? .32 : .45) * (tr.sv || 1))) tone(tr.bw, b.f, t, dt * (tr.drums === 'none' ? 14 : 1.8), tr.drums === 'none' ? .09 : .08);
    if (b && tr.xi && i % 8 === 0) sfPlay(tr.xi, b.n, t, dt * 4, .5); // ボス戦のティンパニ
    if (tr.drums === 'beat') { if (i % 8 === 0) drum('kick', t); if (i % 8 === 4) drum('snare', t); if (i % 2 === 0) drum('hat', t); }
    else if (tr.drums === 'hard') { if (i % 4 === 0) drum('kick', t); if (i % 8 === 4) drum('snare', t); drum('hat', t); }
    else if (tr.drums === 'soft' && i % 8 === 0) drum('hat', t);
    bgmStep++; bgmNext += dt;
  }
}
setInterval(bgmTick, 50);
function toggleBgm() { bgmOn = !bgmOn; try { localStorage.setItem('mizutsukai-bgm', bgmOn ? '1' : '0'); } catch (e) { } toasts.push({ text: bgmOn ? '♪ BGM オン' : '♪ BGM オフ', t: 90 }); }
// さいしょに画面にふれたら音をじゅんびする（ブラウザのきまり）
const wakeAudio = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } };
addEventListener('pointerdown', wakeAudio); addEventListener('keydown', wakeAudio);
function sfx(type) {
  if (testMode) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (lastSfx[type] && frame - lastSfx[type] < 4) return;
    lastSfx[type] = frame;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const S = {
      grab: ['sine', 500, 900, .05, .06], throw: ['triangle', 700, 250, .08, .15],
      jump: ['square', 300, 600, .04, .1], sizzle: ['sawtooth', 180, 60, .05, .18],
      die: ['square', 400, 80, .08, .5], gate: ['triangle', 200, 400, .1, .5],
      grow: ['sine', 300, 1200, .08, .6], key: ['triangle', 900, 1800, .08, .25], unlock: ['square', 300, 900, .06, .3], crystal: ['sine', 1500, 700, .08, .2], hit: ['square', 220, 120, .06, .08],
      clear: ['triangle', 520, 1040, .1, .7], shoot: ['sawtooth', 600, 200, .04, .2],
      pop: ['sine', 900, 200, .12, .3], zap: ['square', 1200, 900, .03, .08], select: ['sine', 700, 900, .05, .08],
    }[type];
    o.type = S[0]; o.frequency.setValueAtTime(S[1], t); o.frequency.exponentialRampToValueAtTime(S[2], t + S[4]);
    g.gain.setValueAtTime(S[3], t); g.gain.exponentialRampToValueAtTime(.001, t + S[4]);
    o.start(t); o.stop(t + S[4] + .02);
  } catch (e) { }
}

// ---------------- グリッド ----------------
const get = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? WALL : grid[y * GW + x];
const isSolidForPlayer = t => t >= DIRT && t !== SEED && t !== WIRE; // 電線は人は通れるが水は通さない
const isSolidForWater = t => t >= DIRT;
function fillTile(tx, ty, t) {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) grid[(ty * 4 + y) * GW + tx * 4 + x] = t;
}
function inZone(px, py) {
  if (L.follow) return P && !P.dead && Math.hypot(px - (P.x + P.w / 2), py - (P.y + P.h / 2)) <= L.follow;
  if (!L.zones) return true;
  return L.zones.some(z => px >= z[0] * TILE && px < (z[0] + z[2]) * TILE && py >= z[1] * TILE && py < (z[1] + z[3]) * TILE);
}

const ENEMY = {
  g: (x, y) => ({ type: 'ghost', x: x + 2, y: y + 1, w: 12, h: 14, hp: 3, t: Math.random() * 6 }),
  l: (x, y) => ({ type: 'sala', x, y: y + 4, w: 16, h: 12, vx: .6, vy: 0, kx: 0, hp: 6, cd: 60 }),
  z: (x, y) => ({ type: 'bbug', x: x + 1, y: y + 6, w: 14, h: 10, vx: .5, vy: 0, kx: 0, hp: 1, fuse: 540, armed: true }),
  M: (x, y) => ({ type: 'fboss', x: x - 8, y, w: 32, h: 28, vx: .8, hp: 12, maxHp: 12, stun: 0, cd: 120, tired: 0, si: 0, burst: 0, t: 0, lit: false, spreadCd: 60, pat: 0, fires: 0 }),
  Q: (x, y) => ({ type: 'boss', x: x - 12, y: y - 12, w: 40, h: 28, vx: .4, vy: 0, kx: 0, hp: 3, drown: 0, stun: 0, cd: 120 }),
  f: (x, y) => ({ type: 'fire', x: x + 2, y: y + 2, w: 12, h: 12, vx: DIFF.spirit.speed, hp: DIFF.spirit.hp, baseY: y + 2, t: Math.random() * 6 }),
  c: (x, y) => ({ type: 'crab', x, y: y + 6, w: 16, h: 10, vx: .5, vy: 0, kx: 0, hp: DIFF.crab.hp, drown: 0 }),
  k: (x, y) => ({ type: 'turtle', x: x - 1, y: y + 4, w: 18, h: 12, vx: .35, vy: 0, kx: 0, hp: 1, drown: 0 }),
  b: (x, y) => ({ type: 'bat', x: x + 2, y: y + 4, w: 12, h: 8, hx: x + 2, hy: y + 4, hp: DIFF.bat.hp, mode: 0, t: Math.random() * 6, cd: 60, vx: 0, vy: 0, timer: 0 }),
  t: (x, y) => ({ type: 'turret', x: x + 1, y: y + 2, w: 14, h: 14, hp: DIFF.turret.hp, cd: 60 }),
  j: (x, y) => ({ type: 'jelly', x: x + 2, y: y + 2, w: 12, h: 12, vx: .3, vy: 0, hp: 1, dry: 0, t: Math.random() * 6 }),
  s: (x, y) => ({ type: 'sponge', x: x + 1, y: y + 4, w: 14, h: 12, vx: .3, vy: 0, kx: 0, hp: 1, eat: 0, full: DIFF.sponge.full }),
};

function loadLevel(i, fresh = true) {
  if (fresh || i !== levelIndex) run = { deaths: 0, frames: 0, spiritKills: 0, ride: 0 };
  levelIndex = i; L = LEVELS[i];
  grid.fill(0); stamp.fill(0); elec.fill(0); elecOn = false;
  fireHP = new Float32Array(TW * TH); seeds = []; seedAtTile = {}; sensors = []; gates = []; lightGates = []; lightGateOpen = false; geysers = []; orbs = []; bolts = []; strikes = []; skyFlash = 0; toasts = toasts.filter(t => !t.text.startsWith('⚡')); pipes = []; fans = []; const pipeIns = [], pipeOuts = []; faucets = []; groundFire = new Uint8Array(TW * TH); burnTiles = []; burnSet = new Set(); tutoStep = 0; tutoFaucet = false;
  gateOpen = [false, false, false]; sensorCount = [0, 0, 0]; sensorNeed = [0, 0, 0];
  vines = new Uint8Array(TW * TH); oneway = new Uint8Array(TW * TH);
  enemies = []; shots = []; crates = []; held = []; free = []; fx = []; rainAcc = 0; mudStuck = 0; exitDoor = null;
  keyItems = []; keys_ = 0; locks = []; plates = []; platePressed = [false, false, false]; crystals = []; crystalOn = false; crystalCd = 0; toggles = []; braziers = []; cold.fill(0); terminals = []; termPowered = false;
  wires = new Uint8Array(TW * TH); poweredTile = null; bulbs = []; powerSrc = []; poweredWet = []; fuses = []; bombs = []; const fuseTiles = new Uint8Array(TW * TH), fuseStarts = [];
  L.map.forEach((row, ty) => {
    for (let tx = 0; tx < TW; tx++) {
      const c = row[tx] || '#', px = tx * TILE, py = ty * TILE;
      if (c === '#') fillTile(tx, ty, WALL);
      else if (c === '~') fillTile(tx, ty, WATER);
      else if (c === 'm') fillTile(tx, ty, MUD);
      else if (c === 'd') fillTile(tx, ty, DIRT);
      else if (c === 'o') fillTile(tx, ty, DRAIN);
      else if (c === '^') { for (let y = 2; y < 4; y++) for (let x = 0; x < 4; x++) grid[(ty * 4 + y) * GW + tx * 4 + x] = SPIKE; }
      else if (c === '-') oneway[ty * TW + tx] = 1;
      else if (c === 'F') { fillTile(tx, ty, FIRE); fireHP[ty * TW + tx] = FIRE_HP; }
      else if (c === 'v') {
        seedAtTile[ty * TW + tx] = seeds.length;
        seeds.push({ tx, ty, water: 0, need: L.seedNeed || 40, grow: -1 });
        for (let x = 1; x < 3; x++) for (let y = 2; y < 4; y++) grid[(ty * 4 + y) * GW + tx * 4 + x] = SEED;
      }
      else if (c === 'x') crates.push({ x: px, y: py, w: 16, h: 16, vx: 0, vy: 0 });
      else if (c === '@') P = { x: px + 3, y: py + TILE - 18, w: 10, h: 18, vx: 0, vy: 0, face: 1, ground: false, climb: false, dead: false, drop: 0 };
      else if (c === 'E') exitDoor = { x: px, y: py - TILE, w: TILE, h: TILE * 2 };
      else if (ENEMY[c]) { const e = Object.assign(ENEMY[c](px, py), { alive: true, flash: 0 }); if (e.type === 'boss') { if (L.bossHp) e.hp = L.bossHp; e.maxHp = e.hp; e.pat = 0; e.mixCd = 300; } enemies.push(e); }
      else if (c in GATE_CH) { fillTile(tx, ty, GATE); gates.push([tx, ty, GATE_CH[c]]); }
      else if (c === 'H') { fillTile(tx, ty, GATE); lightGates.push([tx, ty]); }
      else if (c === 'K') keyItems.push({ x: px + 3, y: py + 3, w: 10, h: 12, taken: false });
      else if (c === 'L') { fillTile(tx, ty, LOCK); locks.push([tx, ty]); }
      else if (c in PLATE_CH) plates.push([tx, ty, PLATE_CH[c]]);
      else if (c === 'Y') { fillTile(tx, ty, CRYSTAL); crystals.push([tx, ty]); }
      else if (c === 'X' || c === 'O') { const solid = c === 'X'; if (solid) fillTile(tx, ty, TOGGLE); toggles.push({ tx, ty, solid, red: solid }); }
      else if (c === 'h') braziers.push({ tx, ty, x: px + 3, y: py + 2, w: 10, h: 14, lit: true, hp: 6 });
      else if (c === 'I') fillTile(tx, ty, FROST);
      else if (c === '=') fillTile(tx, ty, GRATE);
      else if (c === 'Z') { fillTile(tx, ty, TERM); terminals.push([tx, ty]); }
      else if (c === '%') { fillTile(tx, ty, POWER); powerSrc.push([tx, ty]); }
      else if (c === '(') pipeIns.push([tx, ty]);
      else if (c === ')') pipeOuts.push([tx, ty]);
      else if (c === '>' || c === '<') { fillTile(tx, ty, WALL); fans.push({ tx, ty, dir: c === '>' ? 1 : -1, len: 0 }); }
      else if (c === 'J') faucets.push({ tx, ty, stock: L.faucetStock || 160, cap: L.faucetStock || 160, cd: 0, turn: 0 });
      else if (c === '+') { wires[ty * TW + tx] = 1; fillTile(tx, ty, WIRE); }
      else if (c === 'U') { wires[ty * TW + tx] = 2; fillTile(tx, ty, WIRE); bulbs.push({ tx, ty, power: 0 }); }
      else if (c === 'W') fillTile(tx, ty, CRACK);
      else if (c === '*') bombs.push({ tx, ty, x: px, y: py, blown: false });
      else if (c === ':') fuseTiles[ty * TW + tx] = 1;
      else if (c === '!') { fuseTiles[ty * TW + tx] = 1; fuseStarts.push([tx, ty]); }
      else if (c === 'i') { fillTile(tx, ty, ICE); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) cold[(ty * 4 + y) * GW + tx * 4 + x] = 1; }
      else if (c in SENSOR_CH) sensors.push([tx, ty, SENSOR_CH[c]]);
    }
  });
  pipeIns.forEach((p, i) => { if (pipeOuts[i]) pipes.push({ i: p, o: pipeOuts[i], q: 0 }); });
  for (const [sx, sy] of fuseStarts) {
    const prev = new Map(), q = [[sx, sy]], key = (x, y) => y * TW + x; prev.set(key(sx, sy), null); let end = null;
    while (q.length && !end) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
        const b = bombs.find(b => b.tx === nx && b.ty === ny);
        if (b) { prev.set(k, key(x, y)); end = [nx, ny, b]; break; }
        if (fuseTiles[k]) { prev.set(k, key(x, y)); q.push([nx, ny]); }
      }
    }
    if (!end) continue;
    const path = []; let k = key(end[0], end[1]);
    while (k !== null) { path.unshift([k % TW, k / TW | 0]); k = prev.get(k); }
    fuses.push({ path, prog: 0, out: false, bomb: end[2] });
  }
  for (let g = 0; g < 3; g++) sensorNeed[g] = Math.floor(sensors.filter(s => s[2] === g).length * 16 * (L.need || .7));
  prerenderStatic();
  state = 'play'; stateTimer = 0;
}
function prerenderStatic() {
  const w = wallCv.getContext('2d'); w.setTransform(RS, 0, 0, RS, 0, 0); w.clearRect(0, 0, W, H);
  const rain = !!L.rain;
  const hash = (a, b) => { let h = a * 374761393 + b * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
  L.map.forEach((row, ty) => {
    for (let tx = 0; tx < TW; tx++) {
      const c = row[tx] || '#', x = tx * TILE, y = ty * TILE;
      if (c === '#') {
        const top = ty > 0 && L.map[ty - 1][tx] !== '#';
        const base = rain ? '#3b3a46' : '#2f3b58', brick = rain ? '#464454' : '#3b4a6e', hi = rain ? '#55536a' : '#4a5b86', dark = rain ? '#2c2b35' : '#242e47';
        w.fillStyle = base; w.fillRect(x, y, TILE, TILE);
        // れんが（2段、半分ずらし）
        for (let r = 0; r < 2; r++) {
          const off = (r + ty) % 2 ? 4 : 0;
          for (let c = -1; c < 2; c++) {
            const bx = x + c * 8 + off, by = y + r * 8;
            const lx = Math.max(bx, x), rx = Math.min(bx + 7.5, x + TILE);
            if (rx <= lx) continue;
            w.fillStyle = brick; w.fillRect(lx, by + .5, rx - lx, 7);
            w.fillStyle = hi; w.fillRect(lx, by + .5, rx - lx, .5);
            w.fillStyle = dark; w.fillRect(lx, by + 7, rx - lx, .5);
          }
        }
        // 小さなきず
        for (let i = 0; i < 3; i++) { const h1 = hash(tx * 7 + i, ty * 13 + i); w.fillStyle = h1 > .5 ? hi : dark; w.fillRect(x + Math.floor(hash(tx, ty + i * 9) * 30) / 2, y + Math.floor(hash(tx + i * 5, ty) * 30) / 2, .5, .5); }
        if (top) {
          w.fillStyle = rain ? '#5d7a46' : '#6c84c4'; w.fillRect(x, y, TILE, 2.5);
          w.fillStyle = rain ? '#7fa060' : '#9fb4ea'; w.fillRect(x, y, TILE, .5);
          for (let i = 0; i < 6; i++) { w.fillStyle = rain ? '#4a6838' : '#5470b0'; w.fillRect(x + hash(tx, i) * 15, y + 2.5, .5, .5 + hash(i, tx) * 1.5); }
        }
      } else if (c === 'o') {
        w.fillStyle = '#222833'; w.fillRect(x, y, TILE, TILE);
        w.fillStyle = '#5a6578'; for (let i = 0; i < 4; i++) w.fillRect(x + 1 + i * 4, y, 2, TILE);
      } else if (c === '^') {
        w.fillStyle = '#c8ccd8';
        for (let i = 0; i < 4; i++) { w.beginPath(); w.moveTo(x + i * 4, y + 16); w.lineTo(x + i * 4 + 2, y + 8); w.lineTo(x + i * 4 + 4, y + 16); w.fill(); }
      } else if (c === 'I') {
        w.fillStyle = '#9fd8f0'; w.fillRect(x, y, TILE, TILE); w.fillStyle = '#e6f8ff'; w.fillRect(x + 1, y + 1, TILE - 2, 3);
        w.strokeStyle = '#ffffff'; w.lineWidth = 1; w.beginPath();
        for (let a = 0; a < 3; a++) { const r = a * Math.PI / 3; w.moveTo(x + 8 - Math.cos(r) * 5, y + 9 - Math.sin(r) * 5); w.lineTo(x + 8 + Math.cos(r) * 5, y + 9 + Math.sin(r) * 5); }
        w.stroke();
      } else if (c === '=') {
        w.fillStyle = '#3a3f4f'; w.fillRect(x, y, TILE, 2); w.fillRect(x, y + 14, TILE, 2);
        w.fillStyle = '#8a90a8'; for (let i = 0; i < 4; i++) w.fillRect(x + 1 + i * 4, y, 2, TILE);
      } else if (c === '-') {
        w.fillStyle = '#a87a46'; w.fillRect(x, y, TILE, 4);
        w.fillStyle = '#6e4c28'; w.fillRect(x, y + 3, TILE, 1); w.fillRect(x + 7, y, 1, 4);
      }
    }
  });
}

// ---------------- 流体シミュレーション（落ちものセルオートマトン） ----------------
function move(k, nk) { const t = grid[nk]; grid[nk] = grid[k]; grid[k] = t; stamp[nk] = tick; stamp[k] = tick; }

function hitFire(cx, cy) {
  const tx = cx >> 2, ty = cy >> 2, ti = ty * TW + tx;
  if (fireHP[ti] <= 0) return;
  fireHP[ti] -= 1;
  puff(cx * CELL + 2, cy * CELL + 2, 2, '#dde');
  sfx('sizzle');
  if (fireHP[ti] <= 0) {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const k = (ty * 4 + y) * GW + tx * 4 + x; if (grid[k] === FIRE) grid[k] = EMPTY;
    }
    puff(tx * TILE + 8, ty * TILE + 8, 10, '#eef');
    stat('fires', 1, 30, 'fireman');
  }
}
function feedSeed(cx, cy) {
  const s = seeds[seedAtTile[(cy >> 2) * TW + (cx >> 2)]];
  if (!s || s.grow !== -1) return;
  s.water++; puff(cx * CELL + 2, cy * CELL, 1, '#8f8');
  if (s.water >= s.need) {
    stat('vines', 1, 5, 'vine');
    s.grow = s.ty; sfx('grow');
    for (let x = 1; x < 3; x++) for (let y = 2; y < 4; y++) grid[(s.ty * 4 + y) * GW + s.tx * 4 + x] = EMPTY;
  }
}
// 水が火・たね・排水口に触れたら消える
function touchSpecial(x, y) {
  for (let d = 0; d < 4; d++) {
    const nx = x + (d === 0) - (d === 1), ny = y + (d === 2) - (d === 3), t = get(nx, ny);
    if (t === FIRE) { hitFire(nx, ny); return true; }
    if (t === SEED) { feedSeed(nx, ny); return true; }
    if (t === DRAIN && Math.random() < (L.drainRate || .05)) return true;
  }
  return false;
}
function updWater(x, y, k) {
  // 冷気ブロック・氷にふれた水は凍る（冷気から遠いほど凍りにくい）
  let c = 0;
  for (let d = 0; d < 4; d++) {
    const nx = x + (d === 0) - (d === 1), ny = y + (d === 2) - (d === 3), t = get(nx, ny);
    if (t === FROST) c = Math.max(c, L.freezeRange || DIFF.freezeRange); else if (t === ICE) c = Math.max(c, cold[ny * GW + nx]);
  }
  if (c > 1 && Math.random() < .12) { grid[k] = ICE; cold[k] = c - 1; iceMade++; return; }
  if (touchSpecial(x, y)) { grid[k] = EMPTY; return; }
  if (L.soak && Math.random() < 0.03) { // 雨のステージ: 土が水を吸って泥になる
    const nx = x + (Math.random() < .5 ? -1 : 1), ny = y + (Math.random() < .5 ? 1 : 0);
    if (get(nx, ny) === DIRT && Math.random() < L.soak) { grid[ny * GW + nx] = MUD; grid[k] = EMPTY; return; }
  }
  if (get(x, y + 1) === EMPTY) return move(k, k + GW);
  const d = Math.random() < .5 ? 1 : -1;
  if (get(x + d, y + 1) === EMPTY) return move(k, k + GW + d);
  if (get(x - d, y + 1) === EMPTY) return move(k, k + GW - d);
  for (const s of [d, -d]) {
    if (get(x + s, y) === EMPTY) {
      const far = get(x + 2 * s, y) === EMPTY && get(x + s, y + 1) !== EMPTY;
      return move(k, k + (far ? 2 * s : s));
    }
  }
}
function updMud(x, y, k) {
  const b = get(x, y + 1);
  if (b === EMPTY) return move(k, k + GW);
  if (b === WATER && Math.random() < .25) return move(k, k + GW); // 泥は水より重い
  const d = Math.random() < .5 ? 1 : -1;
  if (Math.random() < .3) { const t = get(x + d, y + 1); if (t === EMPTY || (t === WATER && Math.random() < .3)) return move(k, k + GW + d); }
  if (Math.random() < .05 && get(x + d, y) === EMPTY && get(x + d, y + 1) !== EMPTY) return move(k, k + d);
}
function updDirt(x, y, k) {
  const b = get(x, y + 1);
  if (b === EMPTY) return move(k, k + GW);
  if ((b === WATER || b === MUD) && Math.random() < .4) return move(k, k + GW);
  const d = Math.random() < .5 ? 1 : -1;
  if (Math.random() < .5 && get(x + d, y + 1) === EMPTY && get(x + d, y) === EMPTY) return move(k, k + GW + d);
}
function simStep() {
  tick = tick % 255 + 1;
  for (let y = GH - 1; y >= 0; y--) {
    const ltr = ((y + tick) & 1) === 0;
    for (let i = 0; i < GW; i++) {
      const x = ltr ? i : GW - 1 - i, k = y * GW + x, t = grid[k];
      if (t === EMPTY || t >= WALL || stamp[k] === tick) continue;
      if (t === WATER) updWater(x, y, k); else if (t === MUD) updMud(x, y, k); else updDirt(x, y, k);
    }
  }
}
// でんきクラゲ: つながった水全体に電気が流れる
function updateElec() {
  elec.fill(0); elecOn = false;
  let n = 0;
  if (!poweredWet) poweredWet = [];
  for (const e of enemies) {
    if (!e.alive || e.type !== 'jelly') continue;
    for (let cy = Math.floor(e.y / CELL); cy <= Math.floor((e.y + e.h - 1) / CELL); cy++)
      for (let cx = Math.floor(e.x / CELL); cx <= Math.floor((e.x + e.w - 1) / CELL); cx++) {
        const k = cy * GW + cx; if (get(cx, cy) === WATER && !elec[k]) { elec[k] = 1; bfsQ[n++] = k; }
      }
  }
  for (const ti of poweredWet) { const tx = ti % TW, ty = ti / TW | 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const k = (ty * 4 + y) * GW + tx * 4 + x; if (grid[k] === WATER && !elec[k]) { elec[k] = 1; bfsQ[n++] = k; } } }
  for (let h = 0; h < n; h++) {
    const k = bfsQ[h], x = k % GW;
    for (const nk of [k - GW, k + GW, x > 0 ? k - 1 : -1, x < GW - 1 ? k + 1 : -1]) {
      if (nk >= 0 && nk < grid.length && grid[nk] === WATER && !elec[nk]) { elec[nk] = 1; bfsQ[n++] = nk; }
    }
  }
  elecOn = n > 0;
}

// ---------------- 水の粒（つかんだ水・投げた水・雨） ----------------
function puff(x, y, n, col) {
  if (fx.length > 400) return;
  for (let i = 0; i < n; i++) fx.push({ x, y, vx: (Math.random() - .5) * 1.6, vy: -Math.random() * 1.5 - .3, life: 30 + Math.random() * 20, col });
}
function settle(p) {
  const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
  // まず近くでいちばん低い空きマスに置く（水面に山ができないように）
  if (get(cx, cy) === EMPTY) {
    let best = -1, by = -1;
    for (const dir of [1, -1]) for (let r = 0; r <= 8; r++) {
      const x = cx + dir * r;
      if (get(x, cy) !== EMPTY) break; // かべの向こうへは広がらない
      let y = cy; while (y - cy < 10 && get(x, y + 1) === EMPTY) y++;
      if (y > by) { by = y; best = x; }
    }
    if (best >= 0) { grid[by * GW + best] = WATER; return; }
  }
  // だめなら近くの空きマスを外側に向かって探す（水が消えないように）
  for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (get(cx + dx, cy + dy) === EMPTY) { grid[(cy + dy) * GW + cx + dx] = WATER; return; }
  }
}
// 粒を1ステップ動かす。false を返したら粒は消える
function stepParticle(p, isHeld) {
  for (const axis of ['x', 'y']) {
    const v = axis === 'x' ? p.vx : p.vy, steps = Math.ceil(Math.abs(v) / 3) || 1;
    for (let s = 0; s < steps; s++) {
      const nx = axis === 'x' ? p.x + v / steps : p.x, ny = axis === 'y' ? p.y + v / steps : p.y;
      const cx = Math.floor(nx / CELL), cy = Math.floor(ny / CELL), t = get(cx, cy);
      if (t === FIRE) { hitFire(cx, cy); return false; }
      if (t === SEED) { feedSeed(cx, cy); return false; }
      if (t === CRYSTAL && !p.rain && Math.hypot(p.vx, p.vy) > 2) hitCrystal();
      if (isHeld && t === WIRE) { p.x = nx; p.y = ny; continue; } // 持っている水は電線をすりぬける
      if (isSolidForWater(t) || (!isHeld && t !== EMPTY)) {
        if (isHeld) { if (axis === 'x') p.vx *= -.2; else p.vy *= -.2; break; }
        if (!p.rain && shockedBossHit(p)) return false; // 水面に落ちても、しびれた大王のすぐ近くなら当たり
        settle(p); return false;
      }
      p.x = nx; p.y = ny;
    }
  }
  return true;
}
function grabWater() {
  const max = maxHold();
  if (held.length >= max) return;
  const cx0 = Math.floor(mouse.x / CELL), cy0 = Math.floor(mouse.y / CELL), R = Math.ceil(GRAB_R / CELL), cand = [];
  for (let y = cy0 - R; y <= cy0 + R; y++) for (let x = cx0 - R; x <= cx0 + R; x++) {
    const t = get(x, y);
    if ((t === WATER || t === MUD) && (x - cx0) ** 2 + (y - cy0) ** 2 <= R * R && inZone(x * CELL + 2, y * CELL + 2)) cand.push(x, y);
  }
  for (let n = 0; n < 7 && cand.length && held.length < max; n++) {
    const i = (Math.random() * cand.length / 2 | 0) * 2, x = cand[i], y = cand[i + 1];
    cand.splice(i, 2);
    const k = y * GW + x;
    // 泥水からは水だけを抜き取る → 土が残る
    let sy = y;
    if (grid[k] === MUD) {
      grid[k] = DIRT; puff(x * CELL + 2, y * CELL + 2, 1, '#a87');
      // ぬいた水は土の中に閉じこめられないよう、上の空いている所から出す
      while (sy > 0 && get(x, sy) !== EMPTY && get(x, sy) <= DIRT) sy--;
    } else grid[k] = EMPTY;
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    held.push({ x: x * CELL + 2, y: sy * CELL + 2, vx: 0, vy: 0, u: Math.cos(a) * r, v: Math.sin(a) * r });
    sfx('grab');
  }
}
function releaseHeld() {
  if (held.length > 8) sfx('throw');
  for (const p of held) free.push(p);
  held = [];
}
function pushCrates(p, k) {
  for (const c of crates) if (p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
    c.vx = Math.max(-2.2, Math.min(2.2, c.vx + p.vx * k));
  }
}
function updateParticles() {
  const ok = mouse.down && state === 'play' && !P.dead && inZone(mouse.x, mouse.y);
  if (ok) grabWater(); else if (held.length) releaseHeld();
  const rad = 2 + Math.sqrt(held.length) * 1.7;
  held = held.filter(p => {
    const tx = mouse.x + p.u * rad, ty = mouse.y + p.v * rad;
    p.vx = (p.vx + (tx - p.x) * .09) * .82; p.vy = (p.vy + (ty - p.y) * .09) * .82;
    const sp = Math.hypot(p.vx, p.vy); if (sp > 9) { p.vx *= 9 / sp; p.vy *= 9 / sp; }
    pushCrates(p, .003);
    return stepParticle(p, true) && hitEnemies(p, true);
  });
  free = free.filter(p => {
    p.vy = Math.min(p.vy + .25, 7); p.vx *= .995;
    if (!p.rain) pushCrates(p, .03);
    return stepParticle(p, false) && (p.rain || hitEnemies(p, false)) && !(!p.rain && p.vy > 0 && shockedBossHit(p)) && p.y < H;
  });
  // 雨（降ったりやんだり）
  if (L.rain) {
    rainAcc += isRaining() ? L.rain : 0;
    while (rainAcc >= 1) {
      rainAcc--;
      const x = 4 + Math.random() * (W - 8);
      if (get(Math.floor(x / CELL), 0) === EMPTY) free.push({ x, y: 1, vx: -.4, vy: 5, rain: true });
    }
  }
}
const isRaining = () => L.rain && (L.rainAlways || (frame % 1500) < 1000);
function hitEnemies(p, isHeld) {
  for (const b of braziers) if (b.lit && p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { douse(b); return false; }
  for (const e of enemies) {
    if (!e.alive || p.x < e.x || p.x > e.x + e.w || p.y < e.y || p.y > e.y + e.h) continue;
    const t = e.type;
    if (t === 'bbug') { if (e.armed) { e.armed = false; award('defuse'); sfx('sizzle'); puff(e.x + 7, e.y, 6, '#ccc'); } return false; }
    if (t === 'boss') {
      if (e.shock > 0) { // しびれ中に、水を勢いよくぶつけるとダメージ
        if (Math.hypot(p.vx, p.vy) < 2) { puff(p.x, p.y, 1, '#bdf'); return false; }
        e.hitM = (e.hitM || 0) + 1; puff(p.x, p.y, 2, '#bdf'); if (frame % 3 === 0) sfx('hit');
        if (e.hitM >= BOSS_HITS) {
          e.hitM = 0; e.shock = 0; e.hp--; e.stun = 60; e.flash = 20; shake = 10; sfx('hit'); puff(e.x + 20, e.y, 20, '#9cf');
          if (e.hp <= 0) damage(e, 99);
        }
        return false;
      }
      if (!e.stun) e.kx += Math.sign(p.vx) * .05; continue;
    }
    if (t === 'fboss') { // 本体に水を当てるとダメージ
      puff(p.x, p.y, 1, '#eef');
      if (e.flash > 0) { if (frame % 6 === 0) sfx('sizzle'); return false; }
      if (e.tired > 0) { damage(e, 2); e.flash = 8; } else { damage(e, 1); e.flash = 30; } // つかれている時は大ダメージ
      sfx('hit'); puff(e.x + 16, e.y + 14, 6, '#ffd080'); return false;
    }
    if (t === 'ghost') { // おばけは体がすけている。勢いよくぶつけた水しか効かない
      if (e.flash > 0 || Math.hypot(p.vx, p.vy) < 2.5) continue;
      damage(e, 1); e.flash = 24; puff(p.x, p.y, 3, '#dde'); sfx('hit'); return false;
    }
    if (t === 'sala') { // ほのおトカゲはうろこがかたい。少しずつしか効かない
      if (e.flash > 0) continue;
      damage(e, 1); e.flash = 10; puff(p.x, p.y, 2, '#dde'); sfx('sizzle'); return false;
    }
    if (t === 'fire' || t === 'bat' || t === 'turret') { damage(e, 1); e.flash = 4; puff(p.x, p.y, 1, '#dde'); sfx(t === 'fire' ? 'sizzle' : 'hit'); return false; }
    if (t === 'sponge') { feedSponge(e); return false; }
    if (t === 'crab' || t === 'turtle') {
      if (Math.hypot(p.vx, p.vy) > 2.2) {
        if (t === 'crab') damage(e, 1);
        e.kx += Math.sign(p.vx) * (t === 'crab' ? .5 : .7); e.flash = 6; sfx('hit');
        p.vx *= -.3; p.vy = -1; if (isHeld) return false;
      }
    }
  }
  return true;
}
function damage(e, n) {
  e.hp -= n;
  if (e.hp <= 0 && e.alive) {
    if (e.type === 'sala') crates.push({ x: e.x, y: e.y - 4, w: 16, h: 16, vx: 0, vy: 0, stone: true }); // ひえて石になる
    if (e.type === 'ghost') stat('ghosts', 1, 10, 'ghost');
    if (e.type === 'sala') award('stone');
    if (e.type === 'boss') award('boss');
    if (e.type === 'fboss') { award('fboss'); putOutAllGround(); }
    e.alive = false; stat('kills', 1, 40, 'hunter'); if (e.type === 'fire') run.spiritKills++;
    if (!testMode && !badges.stats.kinds.includes(e.type)) { badges.stats.kinds.push(e.type); saveBadges(); if (badges.stats.kinds.length >= 7) award('zukan'); }
    puff(e.x + e.w / 2, e.y + e.h / 2, 14, e.type === 'fire' ? '#ffa' : '#f84'); }
}
function feedSponge(e) {
  e.eat++;
  if (e.eat >= e.full && e.alive) { // 満腹になると破裂して水をばらまく
    e.alive = false; sfx('pop');
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    for (let i = 0; i < e.eat; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; free.push({ x: cx, y: cy - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2 }); }
    puff(cx, cy, 16, '#ffe680');
  }
}

// ---------------- 物体の当たり判定 ----------------
function boxAny(x, y, w, h, test) {
  for (let cy = Math.floor(y / CELL); cy <= Math.floor((y + h - 1) / CELL); cy++)
    for (let cx = Math.floor(x / CELL); cx <= Math.floor((x + w - 1) / CELL); cx++) if (test(get(cx, cy))) return true;
  return false;
}
function boxFrac(x, y, w, h, type) {
  let n = 0, c = 0;
  for (let cy = Math.floor(y / CELL); cy <= Math.floor((y + h - 1) / CELL); cy++)
    for (let cx = Math.floor(x / CELL); cx <= Math.floor((x + w - 1) / CELL); cx++) { n++; if (get(cx, cy) === type) c++; }
  return c / n;
}
const solidBox = (x, y, w, h) => boxAny(x, y, w, h, isSolidForPlayer);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
// b を (x,y) に置けないなら true。oneWay=true なら下向き移動ですり抜け床に乗る
function blocked(b, x, y, oneWay) {
  if (solidBox(x, y, b.w, b.h)) return true;
  for (const c of crates) if (c !== b && x < c.x + c.w && x + b.w > c.x && y < c.y + c.h && y + b.h > c.y) return true;
  if (oneWay) {
    const oldB = b.y + b.h, newB = y + b.h, top = Math.floor((newB - .001) / TILE) * TILE;
    if (oldB <= top + .001 && newB > top) {
      const ty = top / TILE;
      for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + b.w - 1) / TILE); tx++) if (oneway[ty * TW + tx]) return true;
    }
  }
  return false;
}
function moveY(b, dy, oneWay) {
  let rem = dy;
  while (Math.abs(rem) > 1e-4) {
    const s = Math.abs(rem) > 1 ? Math.sign(rem) : rem;
    if (blocked(b, b.x, b.y + s, oneWay && s > 0)) return true;
    b.y += s; rem -= s;
  }
  return false;
}
function moveX(b, dx) {
  let rem = dx;
  while (Math.abs(rem) > 1e-4) {
    const s = Math.abs(rem) > 1 ? Math.sign(rem) : rem;
    if (blocked(b, b.x + s, b.y, false)) return true;
    b.x += s; rem -= s;
  }
  return false;
}
const crateAt = (x, y, w, h) => crates.find(c => x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y);

// ---------------- プレイヤー ----------------
function killPlayer(cause) {
  if (P.dead) return;
  run.deaths++; award('die1'); stat('deaths', 1, 10, 'die10');
  if (cause === 'zap') award('zap'); else if (cause === 'spike') award('spike'); else if (cause === 'fire') award('burn');
  P.dead = true; stateTimer = 0; sfx('die'); puff(P.x + 5, P.y + 9, 16, '#6cf');
}
function playerInput() {
  return {
    left: keys.ArrowLeft || keys.KeyA || touch.left, right: keys.ArrowRight || keys.KeyD || touch.right,
    up: keys.ArrowUp || keys.KeyW || touch.up, down: keys.ArrowDown || keys.KeyS || touch.down,
    jump: pressed.Space || pressed.ArrowUp || pressed.KeyW || pressed.Jump, jumpOnly: pressed.Space || pressed.Jump,
  };
}
function updatePlayer() {
  if (P.dead) { if (++stateTimer > 70) loadLevel(levelIndex, false); return; }
  // 土や木箱に埋まったら押し出す
  for (let i = 0; i < 24 && blocked(P, P.x, P.y, false); i++) P.y -= 1;

  const wf = boxFrac(P.x, P.y, P.w, P.h, WATER), mf = boxFrac(P.x, P.y, P.w, P.h, MUD);
  const inW = wf > .3, inM = mf > .2, I = playerInput();
  if (I.jumpOnly && faucets.length && useFaucet()) { I.jump = false; I.jumpOnly = false; }
  const onVine = vines[Math.floor((P.y + P.h / 2) / TILE) * TW + Math.floor((P.x + P.w / 2) / TILE)];

  const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
  if (dir) P.face = dir;
  const top = inM ? .45 : P.climb ? 1 : inW ? 1.3 : 1.9;
  P.vx += (dir * top - P.vx) * .3;

  if (I.down && P.ground && !onVine) P.drop = 14; // すり抜け床から降りる
  if (P.drop > 0) P.drop--;
  if (onVine && (I.up || I.down)) P.climb = true;
  if (!onVine) P.climb = false;
  if (P.climb) {
    P.vy = I.up ? -1.4 : I.down ? 1.4 : 0;
    if (I.jumpOnly) { P.climb = false; P.vy = -4.5; sfx('jump'); }
  } else {
    const g = inM ? .05 : inW ? .12 : .35, cap = inM ? .6 : inW ? 1.6 : 6;
    P.vy = Math.min(P.vy + g, cap);
    if (I.jump && inM && mf < .5 && P.ground) { P.vy = -4.2; sfx('jump'); } // 浅い泥なら、なんとかぬけ出せる
    if (I.jump && !inM) {
      if (P.ground) { P.vy = -5.6; sfx('jump'); }
      else if (inW) P.vy = wf < .7 ? -4.4 : -2.6; // 泳ぐ
    }
  }
  // 横移動（1マスの段差は自動で登る・木箱は押せる）
  let mx = P.vx;
  while (Math.abs(mx) > 1e-4) {
    const s = Math.abs(mx) > 1 ? Math.sign(mx) : mx; mx -= s;
    if (!blocked(P, P.x + s, P.y, false)) { P.x += s; continue; }
    if (P.ground && !blocked(P, P.x + s, P.y - CELL, false)) { P.x += s; P.y -= CELL; continue; }
    const c = crateAt(P.x + s, P.y, P.w, P.h);
    if (c && !blocked(c, c.x + s, c.y, false)) { c.x += s; P.x += s; P.vx *= .7; continue; }
    // 木箱も1マスの段差なら押し上げられる
    if (c && P.ground && !blocked(c, c.x + s, c.y - CELL, false)) { c.y -= CELL; c.x += s; P.x += s; P.vx *= .7; continue; }
    P.vx = 0; break;
  }
  P.ground = false;
  if (moveY(P, P.vy, P.drop <= 0 && !P.climb)) { if (P.vy > 0) P.ground = true; P.vy = 0; }
  if (!P.ground && P.vy >= 0 && blocked(P, P.x, P.y + 1, P.drop <= 0)) P.ground = true;

  mudStuck = inM ? mudStuck + 1 : 0;
  if (boxAny(P.x - 1, P.y - 1, P.w + 2, P.h + 2, t => t === FIRE)) killPlayer('fire');
  if (boxAny(P.x - 1, P.y - 1, P.w + 2, P.h + 2, t => t === SPIKE)) killPlayer('spike');
  if (mudStuck === 300) award('mud');
  if (elecOn) { // 電気の流れた水につかった（しぶき程度ならセーフ）
    let n = 0, e = 0;
    for (let cy = Math.floor(P.y / CELL); cy <= Math.floor((P.y + P.h - 1) / CELL); cy++)
      for (let cx = Math.floor(P.x / CELL); cx <= Math.floor((P.x + P.w - 1) / CELL); cx++) {
        n++; if (cx >= 0 && cy >= 0 && cx < GW && cy < GH && elec[cy * GW + cx]) e++;
      }
    if (e / n > .2) { sfx('zap'); killPlayer('zap'); }
  }
  for (const e of enemies) if (e.alive && e.type === 'bbug' && e.armed && overlap(P, e)) { e.alive = false; explode(e.x + 7, e.y + 5, 52); }
  for (const e of enemies) if (e.alive && overlap(P, e) && !(e.type === 'bbug' && !e.armed)) killPlayer(e.type === 'fire' ? 'fire' : 'enemy');
  if (P.y > H) killPlayer('fall');
  for (const k of keyItems) if (!k.taken && overlap(P, k)) { k.taken = true; keys_++; sfx('key'); puff(k.x + 5, k.y + 6, 10, '#ffe066'); }
  if (keys_ > 0 && boxAny(P.x - 2, P.y, P.w + 4, P.h, t => t === LOCK)) openLock();
  if (exitDoor && overlap(P, exitDoor) && !P.dead) {
    state = 'clear'; stateTimer = 0; clearChoice = 0; clearNav.l = clearNav.r = true; sfx('clear'); cleared.add(levelIndex); saveProgress();
    checkClearBadges();
  }
}

// ---------------- 木箱 ----------------
function updateCrates() {
  for (const c of crates) {
    // 木箱の下の水面（泥も含む）を探して、水面の少し上にうかせる
    let surf = 1e9;
    for (const sx of [c.x + 3, c.x + 8, c.x + 13]) {
      for (let y = c.y; y < c.y + c.h + 6; y += 2) {
        const t = get(Math.floor(sx / CELL), Math.floor(y / CELL));
        if (t === WATER || t === MUD) { surf = Math.min(surf, y); break; }
        if (isSolidForWater(t)) break;
      }
    }
    if (!c.stone && surf < c.y + c.h + 2) {
      c.vy = (c.vy + (surf - 12 - c.y) * .08) * .8; c.vx *= .95;
      c.vy = Math.max(-1.5, Math.min(1.5, c.vy));
    } else { c.vy = Math.min(c.vy + .3, 4); c.vx *= .75; }
    const rider = !P.dead && P.vy >= 0 && Math.abs(P.y + P.h - c.y) < 3 && P.x < c.x + c.w && P.x + P.w > c.x;
    const x0 = c.x, y0 = c.y;
    if (moveY(c, c.vy, true)) c.vy = 0;
    if (moveX(c, c.vx)) c.vx = 0;
    if (rider) { // 上に乗っているプレイヤーも一緒に動かす（木箱の上にぴったり乗せる）
      const nx = P.x + c.x - x0, ny = c.y - P.h;
      if (!solidBox(P.x, ny, P.w, P.h)) P.y = ny;
      if (!solidBox(nx, P.y, P.w, P.h)) { P.x = nx; run.ride += Math.abs(c.x - x0); if (run.ride >= 200) award('captain'); }
    }
    if (c.y > H) c.y = H + 100;
  }
}

// ---------------- 爆発 ----------------
function explode(x, y, r) {
  sfx('die'); for (let i = 0; i < 40; i++) fx.push({ x, y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: 30 + Math.random() * 30, col: i % 2 ? '#ffb030' : '#ff5020' });
  shake = 18;
  const r2 = r / CELL;
  for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++)
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      const t = get(cx, cy), d = Math.hypot(cx - x / CELL, cy - y / CELL);
      if (d > r2) continue;
      if (t === CRACK) award('boom');
      if (t === CRACK || t === WATER || t === MUD || t === DIRT || t === ICE) grid[cy * GW + cx] = EMPTY;
    }
  for (const e of enemies) if (e.alive && e.type !== 'boss' && Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < r) damage(e, 99);
  if (!P.dead && Math.hypot(P.x + 5 - x, P.y + 9 - y) < r) killPlayer('bomb');
}
let shake = 0;
// ---------------- てき ----------------
function walker(e, speed, drownLimit) {
  e.flash = Math.max(0, e.flash - 1);
  e.kx *= .9;
  const wf = boxFrac(e.x, e.y, e.w, e.h, WATER) + boxFrac(e.x, e.y, e.w, e.h, MUD);
  e.vy = Math.min(e.vy + (wf > .3 ? .08 : .3), wf > .3 ? 1 : 5);
  if (drownLimit) { // おぼれる
    if (wf > .6) { e.drown++; if (e.drown % 20 === 0) puff(e.x + e.w / 2, e.y, 1, '#bdf'); if (e.drown > drownLimit) damage(e, 99); }
    else e.drown = Math.max(0, e.drown - 1);
  }
  if (moveY(e, e.vy, true)) e.vy = 0;
  const step = Math.sign(e.vx) * speed + e.kx;
  const front = e.vx > 0 ? e.x + e.w + 1 : e.x - 1, fy = e.y + e.h + 2;
  const ledge = !isSolidForPlayer(get(Math.floor(front / CELL), Math.floor(fy / CELL))) && !oneway[Math.floor(fy / TILE) * TW + Math.floor(front / TILE)];
  if (blocked(e, e.x + step, e.y, false)) { e.vx *= -1; e.kx = 0; }
  else if (ledge && e.vy === 0 && Math.abs(e.kx) < .2) e.vx *= -1;
  else e.x += step;
  if (e.y > H) e.alive = false;
}
function eatCell(e, pad, onEat) { // 体のまわりの水を1マス消す
  for (let cy = Math.floor((e.y - pad) / CELL); cy <= Math.floor((e.y + e.h + pad - 1) / CELL); cy++)
    for (let cx = Math.floor((e.x - pad) / CELL); cx <= Math.floor((e.x + e.w + pad - 1) / CELL); cx++)
      if (get(cx, cy) === WATER) { grid[cy * GW + cx] = EMPTY; onEat(cx, cy); return true; }
  return false;
}
function updateEnemies() {
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  for (const e of enemies) {
    if (!e.alive) continue;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = px - ex, dy = py - ey, d = Math.hypot(dx, dy) || 1;
    e.flash = Math.max(0, (e.flash || 0) - 1);
    switch (e.type) {
      case 'fire': {
        e.t += .05;
        const nx = e.x + e.vx;
        if (boxAny(nx, e.y, e.w, e.h, t => t >= DIRT)) e.vx *= -1; else e.x = nx;
        e.y = e.baseY + Math.sin(e.t) * 4;
        while (e.alive && eatCell(e, 0, (x, y) => { puff(x * CELL, y * CELL, 1, '#dde'); sfx('sizzle'); })) damage(e, 1);
        break;
      }
      case 'crab': walker(e, DIFF.crab.speed, DIFF.crab.drown); break;
      case 'turtle': walker(e, DIFF.turtle.speed, DIFF.turtle.drown); break;
      case 'sponge':
        walker(e, .3, 0);
        if (frame % 2 === 0) eatCell(e, 2, () => feedSponge(e));
        break;
      case 'bat': {
        e.t += .06; e.cd = Math.max(0, e.cd - 1);
        if (e.mode === 0) {
          e.x += (e.hx - e.x) * .05; e.y += (e.hy + Math.sin(e.t) * 4 - e.y) * .1;
          if (d < DIFF.bat.range && e.cd === 0 && !P.dead) { e.mode = 1; e.timer = 100; e.vx = dx / d * 2.8; e.vy = dy / d * 2.8; }
        } else if (e.mode === 1) {
          // 少しだけプレイヤーを追いかける
          e.vx += (dx / d * DIFF.bat.speed - e.vx) * .06; e.vy += (dy / d * DIFF.bat.speed - e.vy) * .06;
          const nx = e.x + e.vx, ny = e.y + e.vy;
          if (boxAny(nx, ny, e.w, e.h, t => t >= DIRT) || --e.timer <= 0) e.mode = 2; else { e.x = nx; e.y = ny; }
        } else {
          const hx = e.hx - e.x, hy = e.hy - e.y, hd = Math.hypot(hx, hy);
          if (hd < 2) { e.mode = 0; e.cd = DIFF.bat.rest; } else { e.x += hx / hd * 1.2; e.y += hy / hd * 1.2; }
        }
        if (frame % 4 === 0 && eatCell(e, 0, (x, y) => puff(x * CELL, y * CELL, 1, '#bdf'))) damage(e, 1);
        break;
      }
      case 'turret':
        if (--e.cd <= 0 && d < (L.turretRange || 330) && !P.dead) {
          e.cd = L.turretCd || DIFF.turret.interval; sfx('shoot');
          shots.push({ x: ex, y: ey - 2, vx: dx / d * DIFF.turret.shot, vy: dy / d * DIFF.turret.shot });
        }
        if (frame % 3 === 0 && eatCell(e, 2, (x, y) => puff(x * CELL, y * CELL, 1, '#dde'))) { damage(e, 1); e.flash = 4; }
        break;
      case 'ghost': { // かべをすりぬけて近づく。明るい電球はにがて
        e.t += .05;
        let mx = dx / d * .45, my = dy / d * .45;
        for (const b of bulbs) if (b.power > 0) {
          const bx = b.tx * TILE + 8 - ex, by = b.ty * TILE + 8 - ey, bd = Math.hypot(bx, by) || 1, r = bulbRadius(b);
          if (bd < r * .8) { mx = -bx / bd * .9; my = -by / bd * .9; }
        }
        e.x += mx; e.y += my + Math.sin(e.t) * .2;
        break;
      }
      case 'sala': { // ほのおトカゲ: 近づくと火をはく
        walker(e, .6, 0);
        if (--e.cd <= 0 && Math.abs(dx) < 120 && Math.abs(dy) < 24 && Math.sign(dx) === Math.sign(e.vx) && !P.dead) {
          e.cd = 110; sfx('shoot');
          shots.push({ x: ex + Math.sign(e.vx) * 8, y: ey - 1, vx: Math.sign(e.vx) * 2.4, vy: 0, life: 38, breath: true });
        }
        if (frame % 4 === 0 && !e.flash && eatCell(e, 1, (x, y) => puff(x * CELL, y * CELL, 1, '#dde'))) { damage(e, 1); e.flash = 10; }
        break;
      }
      case 'bbug': { // バクダンムシ: 近づいてきて、導火線がもえつきると爆発
        if (!e.armed) { e.vy = Math.min(e.vy + .3, 5); if (moveY(e, e.vy, true)) e.vy = 0; break; }
        e.vx = Math.sign(dx || 1) * .55;
        walker(e, .55, 0);
        if (frame % 3 === 0 && eatCell(e, 1, () => { })) { e.armed = false; award('defuse'); sfx('sizzle'); puff(ex, e.y, 6, '#ccc'); }
        if (e.armed && --e.fuse <= 0) { e.alive = false; explode(ex, ey, 52); }
        break;
      }
      case 'boss': { // どろガメ大王: ときどき雷雨。雷に打たれてしびれている間だけ、水を勢いよくぶつけるとダメージ
        e.vy = Math.min(e.vy + .3, 4);
        if (moveY(e, e.vy, true)) e.vy = 0;
        e.kx *= .9;
        const lost = Math.floor((e.maxHp - e.hp) * 3 / e.maxHp); // 弱るほどおこって強くなる（0〜2段階）
        // 雷雨: ときどき空があれて、大王に雷が落ちる
        if (e.stormT === undefined) e.stormT = 420;
        if (e.storm > 0) {
          e.storm--;
          if (e.storm === 300 || (e.storm === 150 && !(e.shock > 0))) bolts.push({ x: ex, t: 60 }); // 大王のいる所に雷の予告
        } else if (--e.stormT <= 0) { e.storm = 360; e.stormT = 720; sfx('zap'); }
        if (e.shock > 0) { // しびれ中: 動けない
          if (--e.shock === 0) { e.hitM = 0; e.vx = Math.sign(dx || 1) * .4; }
          if (frame % 6 === 0) puff(ex + (Math.random() - .5) * 30, e.y + Math.random() * e.h, 1, '#fff6a0');
          break;
        }
        if (e.stun > 0) { if (--e.stun === 0) e.vx = Math.sign(dx || 1) * .4; break; } // ダメージのあとのひるみ
        // 水をのむ: まわりにたまった水をごくごく飲んで、うまらないようにする
        if (e.gulp > 0) e.gulp--;
        if (frame % 2 === 0) {
          let drank = 0;
          for (let cy = Math.floor((e.y - 24) / CELL); cy <= Math.floor((e.y + e.h + 4) / CELL) && drank < 10; cy++)
            for (let cx = Math.floor((e.x - 24) / CELL); cx <= Math.floor((e.x + e.w + 24) / CELL) && drank < 10; cx++)
              if (get(cx, cy) === WATER) { grid[cy * GW + cx] = EMPTY; drank++; }
          if (drank) { e.gulp = 20; if (frame % 12 === 0) { sfx('pop'); puff(ex + Math.sign(e.vx) * 18, e.y + 6, 2, '#9cf'); } }
        }
        const step = Math.sign(e.vx) * (.45 + lost * .2) + e.kx;
        if (blocked(e, e.x + step, e.y, false)) e.vx *= -1; else e.x += step;
        if (--e.cd <= 0 && !P.dead) {
          const pats = ['aim', 'spread', 'aim']; if (lost >= 1) pats.push('rain', 'geyser'); if (lost >= 2) pats.push('spread', 'rain');
          const pat = pats[e.pat++ % pats.length], sp = 2.6 + lost * .25;
          e.cd = Math.max(80, 150 - lost * 20); sfx('shoot');
          const mud = (ang, v) => shots.push({ x: ex, y: e.y + 4, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 1.1, g: .05, mud: true });
          const a0 = Math.atan2(dy, dx);
          if (pat === 'aim') mud(a0, sp);
          else if (pat === 'spread') for (const k of [-.32, 0, .32]) mud(a0 + k, sp * .9);
          else if (pat === 'rain') { // どろの雨: 自分の上から泥がふってくる
            for (let i = 0; i < 3 + lost; i++) shots.push({ x: Math.max(8, Math.min(W - 8, px + (i - (2 + lost) / 2) * 36 + (Math.random() - .5) * 12)), y: 6, vx: 0, vy: .6, g: .04, mud: true, rain: true });
          } else { // どろの柱: 足もとから泥がふき出す（予告あり）
            let gy = Math.floor((P.y + P.h) / CELL); while (gy < GH && get(Math.floor(px / CELL), gy) === EMPTY) gy++;
            geysers.push({ x: px, gy, t: 70 });
          }
        }
        break;
      }
      case 'fboss': { // ほのお大魔王
        // こうげきの順番: 火の玉3連発 → ブレス(レーザー) → つかれる → 火の雨 → ブレス → つかれる …
        // つかれている間は低いところに降りてきて、水が大きく効く。ダメージは自分で水を当てたときだけ
        if (!burnTiles.length) setupBurnTiles();
        e.t += .03; if (e.baseY === undefined) e.baseY = e.y;
        const lost = Math.floor((e.maxHp - e.hp) * 3 / e.maxHp); // 0〜2段階で強くなる
        // 熱波: ときどき画面じゅうが熱くなる。水を持っていないとやられる。持っている水は半分になる
        if (e.heatT === undefined) e.heatT = 1200;
        if (--e.heatT === 120) { e.heatWarn = 120; sfx('zap'); }
        if (e.heatWarn > 0 && --e.heatWarn === 0) {
          e.heatT = 1080 - lost * 120; e.heatFlash = 30; shake = 14; sfx('die');
          const safe = held.length >= maxHold() * .15; // 水を持っていれば身を守れる
          if (!P.dead) { if (safe) { held.splice(0, Math.ceil(held.length / 2)); puff(P.x + 5, P.y + 4, 12, '#dde'); } else { toasts.push({ text: '🔥 熱波！ 水を持っていないと身を守れない', t: 150 }); killPlayer('fire'); } }
          for (let i = 0; i < grid.length; i++) if (grid[i] === WATER && Math.random() < .3) grid[i] = EMPTY; // 水たまりも少しかわく
        }
        if (e.heatFlash > 0) e.heatFlash--;
        if (e.tired > 0) { // つかれた
          e.tired--; e.y += (e.baseY + 70 - e.y) * .06; e.x += e.vx * .15;
          if (e.x < 40 || e.x + e.w > W - 40) e.vx *= -1;
          if (e.tired === 0) e.cd = 40;
          break;
        }
        e.x += e.vx * (1 + lost * .3); if (e.x < 40 || e.x + e.w > W - 40) e.vx *= -1;
        e.y += (e.baseY + Math.sin(e.t * 2) * 12 - e.y) * .08;
        if (e.burst > 0 && --e.burstCd <= 0) { // 火の玉の連発
          e.burst--; e.burstCd = 14; sfx('shoot');
          shots.push({ x: ex, y: ey + 8, vx: dx / d * (2.6 + lost * .3), vy: dy / d * (2.6 + lost * .3), ignite: true });
        }
        if (e.orbWait > 0 && --e.orbWait === 0) { e.tired = 150 - lost * 20; sfx('pop'); } // レーザーを撃ちおわると、つかれる
        if (!e.burst && !e.orbWait && --e.cd <= 0 && !P.dead) {
          const seq = ['volley', 'orb', 'rain', 'orb'], act = seq[e.si++ % seq.length];
          e.cd = 70 - lost * 12;
          if (act === 'volley') { e.burst = 3 + (lost >= 2 ? 1 : 0); e.burstCd = 0; }
          else if (act === 'orb') { // ブレス: 地面の近くで止まって、4方向にレーザー
            sfx('shoot');
            for (let k = 0; k < (lost >= 2 ? 2 : 1); k++) {
              // 自分と同じ高さの地面の、少し横に落とす（そこから横のレーザーでねらう）
              const groundAt = gx => { let cy = Math.floor((ey + 10) / CELL); while (cy < GH && get(Math.floor(gx / CELL), cy) < DIRT) cy++; return cy; };
              const myG = Math.floor((P.y + P.h + 2) / CELL), first = Math.random() < .5 ? -1 : 1;
              let gx = Math.max(24, Math.min(W - 24, px + first * 40)), cy = groundAt(gx);
              search: for (const dist of k ? [120, 90, 60] : [50, 36, 64, 24]) for (const side of [first, -first]) {
                const x2 = Math.max(24, Math.min(W - 24, px + side * dist)), g2 = groundAt(x2);
                let clear = Math.abs(g2 - myG) <= 1; // 同じ高さで、自分までのあいだにかべがない所
                for (let xx = Math.min(x2, px); clear && xx < Math.max(x2, px); xx += 4) if (get(Math.floor(xx / CELL), g2 - 3) >= DIRT && get(Math.floor(xx / CELL), g2 - 3) !== WIRE) clear = false;
                if (clear) { gx = x2; cy = g2; break search; }
              }
              orbs.push({ x: ex, y: ey + 10, tx: gx, stopY: cy * CELL - 9, st: 'fall', t: 0 });
            }
            e.orbWait = 90 + ORB_CHARGE + ORB_FIRE;
          } else { // 火の雨: 地面をもやす
            sfx('shoot');
            const dry = burnTiles.filter(([tx, ty]) => fireHP[ty * TW + tx] <= 0);
            for (let i = 0; i < 3 && dry.length; i++) {
              const [tx, ty] = dry[Math.random() * dry.length | 0], tgx = tx * TILE + 8, dy2 = ty * TILE + 12 - (ey + 8);
              const tl = (1.5 + Math.sqrt(2.25 + 2 * .07 * Math.max(0, dy2))) / .07;
              shots.push({ x: ex, y: ey + 8, vx: (tgx - ex) / tl, vy: -1.5, g: .07, ignite: true, big: true });
            }
          }
        }
        if (burningCount() > 0 && --e.spreadCd <= 0) { e.spreadCd = 90 - lost * 15; spreadGroundFire(); }
        if (frame % 3 === 0) evaporateNearFire();
        if (!isRaining() && frame % 3 === 0) for (let k = 0; k < 60; k++) { const i = Math.random() * GW * GH | 0; if (grid[i] === WATER) { grid[i] = EMPTY; break; } } // 雨がやむと、熱で水たまりがかわいていく
        break;
      }
      case 'jelly': {
        const wf = boxFrac(e.x, e.y, e.w, e.h, WATER);
        e.t += .04;
        if (wf > .35) {
          e.dry = 0; e.vy = 0;
          const nx = e.x + e.vx, ahead = get(Math.floor((e.vx > 0 ? nx + e.w : nx) / CELL), Math.floor(ey / CELL));
          if (ahead === WATER) e.x = nx; else e.vx *= -1;
          const ny = e.y + Math.sin(e.t) * .3;
          if (boxFrac(e.x, ny, e.w, e.h, WATER) > .35) e.y = ny;
        } else { // 水がないと干からびる
          e.vy = Math.min(e.vy + .2, 3);
          if (moveY(e, e.vy, true)) e.vy = 0;
          if (++e.dry % 15 === 0) puff(ex, e.y, 2, '#ccc');
          if (e.dry > DIFF.jelly.dry) damage(e, 99);
        }
        break;
      }
    }
  }
  // ほのおだん
  shots = shots.filter(s => {
    if (s.g) s.vy += s.g;
    if (s.life !== undefined && --s.life <= 0) return false;
    s.x += s.vx; s.y += s.vy;
    if (s.mud) { const t0 = get(Math.floor(s.x / CELL), Math.floor(s.y / CELL)); if (t0 !== EMPTY) { if (t0 === WATER || t0 === MUD) puff(s.x, s.y, 4, '#a87'); else mudBlob(s.x - s.vx, s.y - s.vy); return false; } }
    for (const f of fuses) if (f.out && !f.done) { const fp = fusePoint(f); if (Math.abs(fp[0] - s.x) < 7 && Math.abs(fp[1] - s.y) < 7) { f.out = false; award('relight'); puff(s.x, s.y, 6, '#fa4'); return false; } }
    const cx = Math.floor(s.x / CELL), cy = Math.floor(s.y / CELL), t = get(cx, cy);
    if (t === WATER || t === MUD) { if (t === WATER) grid[cy * GW + cx] = EMPTY; puff(s.x, s.y, 4, '#dde'); sfx('sizzle'); return false; }
    if (t === CRYSTAL) { if (crystalCd <= 0) award('crystal'); hitCrystal(); puff(s.x, s.y, 4, '#f84'); return false; }
    if (t === ICE) { meltAround(cx, cy, 3); puff(s.x, s.y, 6, '#dff'); sfx('sizzle'); return false; }
    if (t >= DIRT && t !== GRATE) { if (s.ignite) for (let k = 0; k < 3; k++) { const tx = Math.floor(s.x / TILE), ty = Math.floor((s.y - 3) / TILE) - k; if (burnSet.has(ty * TW + tx)) { igniteGround(tx, ty); break; } } puff(s.x, s.y, 4, '#f84'); return false; }
    if (L.relight) for (const b of braziers) if (!b.lit && s.x > b.x && s.x < b.x + b.w && s.y > b.y - 4 && s.y < b.y + b.h) { b.lit = true; b.hp = 6; puff(s.x, s.y, 6, '#fa4'); return false; }
    for (const arr of [held, free]) for (const p of arr) {
      if (!p.dead && !p.rain && Math.abs(p.x - s.x) < 5 && Math.abs(p.y - s.y) < 5) { stat('shield', 1, 30, 'shield'); p.dead = true; puff(s.x, s.y, 4, '#dde'); sfx('sizzle'); return false; }
    }
    if (!P.dead && s.x > P.x - 2 && s.x < P.x + P.w + 2 && s.y > P.y - 2 && s.y < P.y + P.h + 2) killPlayer('fire');
    return s.x > 0 && s.x < W && s.y > 0 && s.y < H;
  });
  if (held.some(p => p.dead)) held = held.filter(p => !p.dead);
  if (free.some(p => p.dead)) free = free.filter(p => !p.dead);
}

// ---------------- ステージの仕掛け ----------------
function gateBlockedByBody(g) {
  return gates.some(([tx, ty, gg]) => {
    if (gg !== g) return false;
    const r = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
    return (!P.dead && overlap(P, r)) || crates.some(c => overlap(c, r)) || enemies.some(e => e.alive && overlap(e, r));
  });
}
function setGate(g, open) {
  gateOpen[g] = open; sfx('gate');
  for (const [tx, ty, gg] of gates) if (gg === g) {
    if (open) { fillTile(tx, ty, EMPTY); puff(tx * TILE + 8, ty * TILE + 8, 6, '#9cf'); }
    else for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) grid[(ty * 4 + y) * GW + tx * 4 + x] = GATE;
  }
}
// カギで扉をあける（つながっている扉はまとめて開く）
function openLock() {
  const near = locks.find(([tx, ty]) => get(tx * 4, ty * 4) === LOCK && overlap({ x: P.x - 2, y: P.y, w: P.w + 4, h: P.h }, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE }));
  if (!near) return;
  const stack = [near], seen = new Set();
  while (stack.length) {
    const [tx, ty] = stack.pop(), id = tx + ',' + ty;
    if (seen.has(id)) continue; seen.add(id);
    fillTile(tx, ty, EMPTY); puff(tx * TILE + 8, ty * TILE + 8, 6, '#ffe066');
    for (const l of locks) if (Math.abs(l[0] - tx) + Math.abs(l[1] - ty) === 1 && get(l[0] * 4, l[1] * 4) === LOCK) stack.push(l);
  }
  keys_--; sfx('unlock');
}
// クリスタルに水をぶつけると、赤と青のブロックが入れかわる
function hitCrystal() {
  if (crystalCd > 0) return;
  crystalCd = 30; crystalOn = !crystalOn; sfx('crystal');
  for (const b of toggles) {
    const want = b.red ? !crystalOn : crystalOn, r = { x: b.tx * TILE, y: b.ty * TILE, w: TILE, h: TILE };
    if (want && ((!P.dead && overlap(P, r)) || crates.some(c => overlap(c, r)))) continue; // 上に人や木箱がいたら出てこない
    b.solid = want;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const k = (b.ty * 4 + y) * GW + b.tx * 4 + x;
      grid[k] = want ? TOGGLE : EMPTY;
    }
  }
  for (const [tx, ty] of crystals) puff(tx * TILE + 8, ty * TILE + 8, 6, crystalOn ? '#7cf' : '#f77');
}
function douse(b) {
  b.hp--; puff(b.x + 5, b.y, 2, '#dde'); sfx('sizzle');
  if (b.hp <= 0) { b.lit = false; puff(b.x + 5, b.y, 10, '#ccd'); }
}
function mudBlob(x, y) {
  const cx0 = Math.floor(x / CELL), cy0 = Math.floor(y / CELL);
  for (let cy = cy0 - 1; cy <= cy0; cy++) for (let cx = cx0 - 1; cx <= cx0 + 1; cx++) if (get(cx, cy) === EMPTY) grid[cy * GW + cx] = MUD;
  puff(x, y, 6, '#a87');
}
function meltAround(cx, cy, r) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
    if (get(x, y) === ICE) { grid[y * GW + x] = WATER; cold[y * GW + x] = 0; }
}
const bulbRadius = b => b.power > 0 ? 34 + 34 * b.power : 0;
function isWetTile(tx, ty) { let n = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (grid[(ty * 4 + y) * GW + tx * 4 + x] === WATER) n++; return n >= 4; }
let lightGates = [], lightGateOpen = false, geysers = [];
// ---------------- 水道管（入口に入った水が、出口から出てくる） ----------------
let pipes = [];
function updatePipes() {
  for (const p of pipes) {
    const [ix, iy] = p.i, [ox, oy] = p.o;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { // 入口の水をすいこむ
      const k = (iy * 4 + y) * GW + ix * 4 + x;
      if (grid[k] === WATER && p.q < 400 && Math.random() < .5) { grid[k] = EMPTY; p.q++; }
    }
    for (let n = 0; n < 4 && p.q > 0; n++) { // 出口から出す（出口が水につかっていたら、水面の上に出る＝水圧で押し上げる）
      const cx = ox * 4 + (Math.random() * 4 | 0); let cy = oy * 4 + 3;
      while (cy > 0 && get(cx, cy) === WATER) cy--;
      if (get(cx, cy) === EMPTY) { grid[cy * GW + cx] = WATER; p.q--; }
    }
  }
}
function drawPipes() {
  for (const p of pipes) {
    const [ix, iy] = p.i, [ox, oy] = p.o;
    ctx.strokeStyle = 'rgba(120,170,220,.25)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(ix * TILE + 8, iy * TILE + 8); ctx.lineTo(ox * TILE + 8, oy * TILE + 8); ctx.stroke(); ctx.setLineDash([]);
    // 入口（じょうご）
    let x = ix * TILE, y = iy * TILE;
    ctx.fillStyle = '#5a6a7a'; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + 16, y + 6); ctx.lineTo(x + 11, y + 16); ctx.lineTo(x + 5, y + 16); ctx.fill();
    ctx.fillStyle = '#2a3442'; ctx.fillRect(x + 6, y + 10, 4, 6);
    ctx.fillStyle = '#9cf'; ctx.fillRect(x + 7, y + 1 + (frame >> 3) % 4, 2, 3);
    // 出口
    x = ox * TILE; y = oy * TILE;
    ctx.fillStyle = '#5a6a7a'; ctx.fillRect(x + 3, y, 10, 7); ctx.fillRect(x + 5, y + 7, 6, 4);
    ctx.fillStyle = '#9aaaba'; ctx.fillRect(x + 3, y, 10, 1);
    if (p.q > 0) { ctx.fillStyle = 'rgba(120,200,255,.85)'; ctx.fillRect(x + 6, y + 11, 4, 5); }
  }
}
// ---------------- 送風機（風の通り道の水・人・木箱を押す） ----------------
let fans = [];
function fanBand(f) { // 風がとどく長さ（かべで止まる）
  let n = 0;
  for (let k = 1; k <= 12; k++) {
    const tx = f.tx + f.dir * k; if (tx < 0 || tx >= TW) break;
    let solid = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const t = get(tx * 4 + x, f.ty * 4 + y); if (t >= DIRT && t !== GRATE && t !== WIRE) solid++; }
    if (solid >= 4) break; // かべ・氷などで風はせき止められる
    n = k;
  }
  return n;
}
function inWind(f, x, y) { const x0 = f.dir > 0 ? (f.tx + 1) * TILE : (f.tx - f.len) * TILE, x1 = f.dir > 0 ? (f.tx + 1 + f.len) * TILE : f.tx * TILE; return x >= x0 && x < x1 && y >= (f.ty - 2) * TILE - 2 && y < (f.ty + 1) * TILE + 2; } // 風の帯は3マスの高さ
function updateFans() {
  for (const f of fans) {
    if (frame % 10 === 0) f.len = fanBand(f);
    for (const p of free) if (!p.rain && inWind(f, p.x, p.y)) { const fast = Math.abs(p.vx) > 2.5; p.vx = Math.max(-5, Math.min(5, p.vx + .35 * f.dir)); if (fast) p.vy = p.vy * .8 - .22; } // 勢いのある水は風にのってふわっと飛ぶ（そっと置いた水はそのまま落ちる）
    for (const p of held) if (inWind(f, p.x, p.y)) p.vx += .3 * f.dir;
    if (!P.dead && (inWind(f, P.x + P.w / 2, P.y + P.h / 2) || inWind(f, P.x + P.w / 2, P.y + P.h - 1) || inWind(f, P.x + P.w / 2, P.y + 4))) { const push = 1.4 * f.dir; if (!blocked(P, P.x + push, P.y, false)) P.x += push; }
    for (const c of crates) if (inWind(f, c.x + c.w / 2, c.y + c.h / 2)) c.vx = Math.max(-2, Math.min(2, c.vx + .06 * f.dir));
    for (const sh of shots) if (inWind(f, sh.x, sh.y)) sh.vx = Math.max(-4, Math.min(4, sh.vx + .12 * f.dir)); // 火の玉も風で曲がる
    if (frame % 3 === 0 && f.len) { const k = 1 + Math.random() * f.len; fx.push({ x: (f.tx + .5 + f.dir * k) * TILE, y: (f.ty - 2) * TILE + 3 + Math.random() * 42, vx: f.dir * 2.5, vy: 0, life: 10, col: 'rgba(220,240,255,.5)' }); }
  }
}
function drawFans() {
  for (const f of fans) {
    const x = f.tx * TILE, y = f.ty * TILE;
    ctx.fillStyle = '#3a4656'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#5a6a7e'; ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(frame * .4 * f.dir);
    ctx.fillStyle = '#c8d8ea'; for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillRect(-1, -6, 2.5, 6); }
    ctx.restore(); ctx.fillStyle = '#e8f0f8'; ctx.fillRect(x + 7, y + 7, 2, 2);
    text(f.dir > 0 ? '▶' : '◀', x + 8 + f.dir * 9, y + 11, 7, '#bfe0ff', 'center');
  }
}
// ---------------- 雷（どろガメ大王の雷雨） ----------------
let bolts = [], strikes = [], skyFlash = 0;
const BOSS_HITS = 15; // しびれ中に、これだけ水を当てると1ダメージ
function shockedBossHit(p) {
  const e = enemies.find(e => e.alive && e.type === 'boss' && e.shock > 0);
  if (!e || Math.hypot(p.vx, p.vy) < 2 || p.x < e.x - 14 || p.x > e.x + e.w + 14 || p.y < e.y - 26 || p.y > e.y + e.h) return false;
  e.hitM = (e.hitM || 0) + 1; puff(p.x, p.y, 2, '#bdf'); if (frame % 3 === 0) sfx('hit');
  if (e.hitM >= BOSS_HITS) { e.hitM = 0; e.shock = 0; e.hp--; e.stun = 60; e.flash = 20; shake = 10; sfx('hit'); puff(e.x + 20, e.y, 20, '#9cf'); if (e.hp <= 0) damage(e, 99); }
  return true;
}
function updateBolts() {
  if (skyFlash > 0) skyFlash--;
  const B = enemies.find(e => e.alive && e.type === 'boss');
  if (B && B.storm > 0) for (let i = 0; i < 2; i++) { const x = 4 + Math.random() * (W - 8); if (get(Math.floor(x / CELL), 1) === EMPTY) free.push({ x, y: 6, vx: -.8, vy: 7, rain: true }); } // 強い雨
  bolts = bolts.filter(bo => {
    if (B && bo.t > 15) bo.x += (B.x + B.w / 2 - bo.x) * .2; // 落ちる直前までは大王を追いかける
    if (--bo.t > 0) return true;
    // ドーン！
    skyFlash = 14; shake = 14; sfx('die'); sfx('zap');
    let gy = 4; while (gy < GH && get(Math.floor(bo.x / CELL), gy) === EMPTY) gy++;
    bo.y2 = gy * CELL; bo.show = 10; strikes.push(bo);
    if (B && Math.abs(B.x + B.w / 2 - bo.x) < 28) { B.shock = 300; B.hitM = 0; B.stun = 0; puff(B.x + 20, B.y, 24, '#fff6a0'); toasts.push({ text: '⚡ 雷が大王に落ちた！ しびれている間に水をぶつけろ！', t: 150 }); }
    if (!P.dead && Math.abs(P.x + P.w / 2 - bo.x) < 9) killPlayer('zap');
    return false;
  });
  strikes = strikes.filter(st => --st.show > 0);
}
function drawBolts() {
  const B = enemies.find(e => e.alive && e.type === 'boss');
  if (B && B.storm > 0) { ctx.fillStyle = 'rgba(10,10,30,.25)'; ctx.fillRect(0, 0, W, H); }
  for (const bo of bolts) { // 予告
    if ((bo.t >> 2) & 1) { ctx.strokeStyle = 'rgba(255,250,170,.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bo.x, 0); ctx.lineTo(bo.x, H); ctx.stroke(); ctx.setLineDash([]); }
    text('⚡', bo.x, 22, 14, '#fff6a0', 'center');
  }
  for (const st of strikes) { // いなずま
    ctx.strokeStyle = 'rgba(160,200,255,.6)'; ctx.lineWidth = 7; ctx.beginPath(); let x = st.x, y = 0; ctx.moveTo(x, y);
    const pts = []; while (y < st.y2) { y += 14; x = st.x + (Math.random() - .5) * 14; pts.push([x, Math.min(y, st.y2)]); ctx.lineTo(x, Math.min(y, st.y2)); }
    ctx.stroke(); ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(st.x, 0); for (const [px2, py2] of pts) ctx.lineTo(px2, py2); ctx.stroke(); ctx.lineWidth = 1;
  }
  if (skyFlash > 0) { ctx.fillStyle = 'rgba(255,255,240,' + (skyFlash / 20) + ')'; ctx.fillRect(0, 0, W, H); }
}
// ---------------- ブレス（4方向レーザー） ----------------
let orbs = [];
const ORB_CHARGE = 60, ORB_FIRE = 26;
// (x,y) から (dx,dy) の向きに、かべ・水・持っている水に当たるまでのびる
function beamEnd(o, dx, dy) {
  let x = o.x, y = o.y;
  for (let i = 0; i < 75; i++) { // レーザーの長さは150ドットまで
    x += dx * 2; y += dy * 2;
    if (x < 0 || y < 0 || x >= W || y >= H) return [x, y, null];
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), t = get(cx, cy);
    if (t === WATER) return [x, y, ['cell', cy * GW + cx]];
    if (t >= DIRT && t !== GRATE && t !== WIRE && t !== FIRE) return [x, y, null];
    for (const arr of [held, free]) for (const p of arr) if (!p.dead && !p.rain && Math.abs(p.x - x) < 4 && Math.abs(p.y - y) < 4) return [x, y, ['p', p]];
    if (!P.dead && x > P.x - 1 && x < P.x + P.w + 1 && y > P.y - 1 && y < P.y + P.h + 1) return [x, y, ['player']];
  }
  return [x, y, null];
}
function updateOrbs() {
  orbs = orbs.filter(o => {
    o.t++;
    if (o.st === 'fall') {
      o.x += (o.tx - o.x) * .08; o.y = Math.min(o.stopY, o.y + 2.2);
      if (get(Math.floor(o.x / CELL), Math.floor((o.y + 9) / CELL)) >= DIRT) o.stopY = o.y; // 屋根に当たったらそこで止まる
      if (o.y >= o.stopY) { o.x = o.tx; o.st = 'charge'; o.t = 0; return true; } // 地面の近くで止まる（止まったブレスにはふれても大丈夫）
      const t = get(Math.floor(o.x / CELL), Math.floor(o.y / CELL));
      if (t === WATER) { puff(o.x, o.y, 8, '#dde'); sfx('sizzle'); return false; } // 水に当たると消える
      for (const arr of [held, free]) for (const p of arr) if (!p.dead && !p.rain && Math.hypot(p.x - o.x, p.y - o.y) < 7) { p.dead = true; puff(o.x, o.y, 8, '#dde'); sfx('sizzle'); stat('shield', 1, 30, 'shield'); return false; }
      if (!P.dead && Math.hypot(P.x + 5 - o.x, P.y + 9 - o.y) < 9) killPlayer('fire');
      return true;
    }
    if (o.st === 'charge') { if (o.t >= ORB_CHARGE) { o.st = 'fire'; o.t = 0; sfx('zap'); shake = Math.max(shake, 4); } return true; }
    // レーザー
    o.beams = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => {
      const [bx, by, hit] = beamEnd(o, dx, dy);
      if (hit) {
        if (hit[0] === 'player') killPlayer('fire');
        else if (hit[0] === 'cell' && o.t % 3 === 0) grid[hit[1]] = EMPTY;      // 水たまりはじわじわ蒸発
        else if (hit[0] === 'p' && o.t % 4 === 0) { hit[1].dead = true; stat('shield', 1, 30, 'shield'); } // たての水も少しずつへる
        if (hit[0] !== 'player' && o.t % 5 === 0) puff(bx, by, 1, '#dde');
      }
      if (dy > 0 && o.t === 1) { const tx = Math.floor(o.x / TILE), ty = Math.floor((by - 3) / TILE); if (burnSet.has(ty * TW + tx)) igniteGround(tx, ty); }
      return [bx, by];
    });
    return o.t < ORB_FIRE;
  });
  if (held.some(p => p.dead)) held = held.filter(p => !p.dead);
  if (free.some(p => p.dead)) free = free.filter(p => !p.dead);
}
function drawOrbs() {
  for (const o of orbs) {
    if (o.st === 'charge' && (o.t >> 2) & 1) { // 予告線
      ctx.strokeStyle = 'rgba(255,120,60,.35)'; ctx.setLineDash([3, 3]); ctx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const [bx, by] = beamEnd(o, dx, dy); ctx.moveTo(o.x, o.y); ctx.lineTo(bx, by); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (o.st === 'fire' && o.beams) for (const [bx, by] of o.beams) {
      const w = 3 + Math.sin(frame * .8) * 1;
      ctx.strokeStyle = 'rgba(255,90,30,.75)'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#ffe080'; ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, 7); ctx.fill();
    }
    ctx.lineWidth = 1;
    const r = o.st === 'charge' ? 5 + o.t / ORB_CHARGE * 3 : 5;
    ctx.fillStyle = '#ff5a1a'; ctx.beginPath(); ctx.arc(o.x, o.y, r + 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(o.x, o.y, r * .45, 0, 7); ctx.fill();
  }
}
// ---------------- 蛇口 ----------------
let faucets = [];
const FAUCET_WAIT = 20 * 60; // 空になってから、また出るまで
const FAUCET_HAND_WAIT = 12 * 60; // 手でひねったあと、またひねれるまで
function nearFaucet() { return faucets.find(f => Math.abs(P.x + 5 - (f.tx * TILE + 8)) < 24 && Math.abs(P.y + 9 - (f.ty * TILE + 8)) < 64); }
function useFaucet() { // 近くで Space：空の蛇口をひねるとすぐ水が出る
  const f = nearFaucet(); if (!f || f.cd <= 0 || f.hcd > 0) return false;
  f.cd = 0; f.stock = f.cap; f.turn = 30; f.hcd = FAUCET_HAND_WAIT; sfx('unlock'); award('faucet'); tutoFaucet = true;
  puff(f.tx * TILE + 8, f.ty * TILE + 4, 8, '#9cf'); return true;
}
function updateFaucets() {
  for (const f of faucets) {
    if (f.turn > 0) f.turn--;
    if (f.hcd > 0) f.hcd--;
    if (f.cd > 0) { if (--f.cd === 0) f.stock = f.cap; continue; }
    if (f.stock <= 0) continue;
    const cy = f.ty * 4 + 4;
    for (const cx of [f.tx * 4 + 1, f.tx * 4 + 2]) if (f.stock > 0 && get(cx, cy) === EMPTY) { grid[cy * GW + cx] = WATER; f.stock--; }
    if (f.stock <= 0) f.cd = FAUCET_WAIT;
  }
}
// ---------------- もえる地面（ほのお大魔王） ----------------
let groundFire = new Uint8Array(TW * TH), burnTiles = [], burnSet = new Set();
const GROUND_FIRE_HP = 4;
function setupBurnTiles() {
  burnTiles = []; burnSet = new Set();
  for (let ty = 1; ty < TH - 1; ty++) for (let tx = 1; tx < TW - 1; tx++) {
    const c = L.map[ty][tx], below = L.map[ty + 1][tx];
    if ((c === '.' || c === '@') && below === '#') { burnTiles.push([tx, ty]); burnSet.add(ty * TW + tx); }
  }
}
function igniteGround(tx, ty) {
  const ti = ty * TW + tx; if (fireHP[ti] > 0 || !burnSet.has(ti)) return false;
  let wet = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (grid[(ty * 4 + y) * GW + tx * 4 + x] === WATER) wet++;
  if (wet >= 3) return false; // ぬれた地面はもえない
  for (let y = 2; y < 4; y++) for (let x = 0; x < 4; x++) { const k = (ty * 4 + y) * GW + tx * 4 + x; if (grid[k] === EMPTY) grid[k] = FIRE; }
  fireHP[ti] = GROUND_FIRE_HP; groundFire[ti] = 1; puff(tx * TILE + 8, ty * TILE + 12, 4, '#ffb040'); return true;
}
const burningCount = () => { let n = 0; for (const [tx, ty] of burnTiles) if (fireHP[ty * TW + tx] > 0) n++; return n; };
function spreadGroundFire() { // もえている所のとなりから、1マスずつ広がる
  const front = burnTiles.filter(([tx, ty]) => fireHP[ty * TW + tx] <= 0 && burnTiles.some(([bx, by]) => fireHP[by * TW + bx] > 0 && ((ty === by && Math.abs(tx - bx) <= 3) || (Math.abs(tx - bx) <= 1 && Math.abs(ty - by) <= 2))));
  for (let k = 0; k < 4 && front.length; k++) {
    const i = Math.random() * front.length | 0, [tx, ty] = front[i];
    const onMe = !P.dead && overlap(P, { x: tx * TILE - 2, y: ty * TILE, w: TILE + 4, h: TILE }); // 立っている所には、広がってこない
    if (!onMe && igniteGround(tx, ty)) return; front.splice(i, 1);
  }
}
// もえている地面のとなりの水は、熱でじわじわ蒸発する
function evaporateNearFire() {
  for (const [tx, ty] of burnTiles) {
    if (fireHP[ty * TW + tx] <= 0) continue;
    for (let k = 0; k < 4; k++) {
      const cx = tx * 4 - 4 + (Math.random() * 12 | 0), cy = ty * 4 - 2 + (Math.random() * 8 | 0);
      if (get(cx, cy) === WATER) { grid[cy * GW + cx] = EMPTY; if (Math.random() < .3) puff(cx * CELL + 2, cy * CELL, 1, '#dde'); }
    }
  }
}
function putOutAllGround() {
  for (const [tx, ty] of burnTiles) { const ti = ty * TW + tx; if (fireHP[ti] > 0) { fireHP[ti] = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const k = (ty * 4 + y) * GW + tx * 4 + x; if (grid[k] === FIRE) grid[k] = EMPTY; } puff(tx * TILE + 8, ty * TILE + 12, 4, '#ccd'); } }
}
// ---------------- チュートリアル ----------------
let tutoStep = 0, tutoFaucet = false;
const TUTO = [
  { t: () => touchMode ? '左のパッドで、右へ歩こう' : '←→（A・D）キーで、右へ歩こう', done: () => P.x > 90 },
  { t: () => touchMode ? 'ジャンプボタンで、ブロックをとびこえよう' : 'Space（↑）でジャンプ！ ブロックをとびこえよう', done: () => P.x > 150 },
  { t: () => touchMode ? 'プールの水を、指でなぞってつかもう' : 'プールの水の上で、マウスを長押し！ 水をつかもう', done: () => held.length >= 20 },
  { t: () => '水をつかんだまま動かして、火のかべにぶつけて消そう', done: () => !fireHP.some(h => h > 0) },
  { t: () => touchMode ? '蛇口の水がなくなったら、近くでジャンプボタン！ また水が出るよ' : '蛇口の水がなくなったら、近くで Space！ また水が出るよ（ほうっておくと20秒）', done: () => tutoFaucet },
  { t: () => '黄色いスイッチのくぼみに水をためると、ゲートが開くよ', done: () => gateOpen[0] },
  { t: () => 'さいごに、ゴールのドアへ！', done: () => false },
];
function updateTutorial() { while (tutoStep < TUTO.length - 1 && TUTO[tutoStep].done()) { tutoStep++; sfx('key'); } }
function drawTutorial() {
  const msg = TUTO[tutoStep].t(), pulse = .7 + .3 * Math.sin(frame * .15);
  ctx.fillStyle = 'rgba(10,30,40,.85)'; ctx.fillRect(W / 2 - 230, 24, 460, 30);
  ctx.strokeStyle = `rgba(127,232,192,${pulse})`; ctx.lineWidth = 1.5; ctx.strokeRect(W / 2 - 230 + .5, 24.5, 459, 29); ctx.lineWidth = 1;
  text(`📘 ${tutoStep + 1} / ${TUTO.length}`, W / 2 - 222, 43, 10, '#7fe8c0');
  text(msg, W / 2 + 24, 44, 12, '#ffffff', 'center');
}
function updateGeysers() {
  geysers = geysers.filter(g => {
    if (--g.t > 0) { if (g.t % 12 === 0) puff(g.x, g.gy * CELL, 2, '#a87'); return true; }
    shake = 8; sfx('pop');
    // 泥の柱がふき上がる（あたるとやられる）
    if (!P.dead && Math.abs(P.x + P.w / 2 - g.x) < 11 && P.y + P.h > g.gy * CELL - 56) killPlayer('mud');
    for (let i = 0; i < 26; i++) fx.push({ x: g.x + (Math.random() - .5) * 10, y: g.gy * CELL - 2, vx: (Math.random() - .5) * 1.5, vy: -2 - Math.random() * 4, life: 30 + Math.random() * 20, col: i % 2 ? '#8c6642' : '#6b4a2e' });
    return false;
  });
}
// 光のゲートのマスに、電球の光がとどいているか（明るさ1で半径61、明るさ2で半径92くらい）
const litByBulb = (tx, ty) => bulbs.some(b => b.power > 0 && Math.hypot(b.tx * TILE + 8 - (tx * TILE + 8), b.ty * TILE + 7 - (ty * TILE + 8)) < bulbRadius(b) * .9);
function updateLightGates() {
  if (!lightGates.length) return;
  const lit = lightGates.every(([tx, ty]) => litByBulb(tx, ty));
  if (lit && !lightGateOpen) {
    lightGateOpen = true; award('lightgate'); sfx('gate');
    for (const [tx, ty] of lightGates) { fillTile(tx, ty, EMPTY); puff(tx * TILE + 8, ty * TILE + 8, 8, '#ffe98a'); }
  } else if (!lit && lightGateOpen) {
    const blocked = lightGates.some(([tx, ty]) => { const r = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE }; return (!P.dead && overlap(P, r)) || crates.some(c => overlap(c, r)); });
    if (!blocked) { lightGateOpen = false; sfx('gate'); for (const [tx, ty] of lightGates) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) grid[(ty * 4 + y) * GW + tx * 4 + x] = GATE; }
  }
}
function updateCircuit() {
  for (const b of bulbs) b.power = 0;
  poweredTile = new Uint8Array(TW * TH);
  poweredWet = [];
  const srcs = [...powerSrc, ...(termPowered ? terminals : [])];
  if (!srcs.length) return;
  const wetMark = new Uint8Array(TW * TH);
  for (const [sx, sy] of srcs) {
    const seen = new Uint8Array(TW * TH), q = [sy * TW + sx]; seen[q[0]] = 1;
    while (q.length) {
      const k = q.pop(), x = k % TW, y = k / TW | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = ny * TW + nx;
        if (nx < 0 || ny < 0 || nx >= TW || ny >= TH || seen[nk]) continue;
        const t = get(nx * 4 + 1, ny * 4 + 1);
        const wet = isWetTile(nx, ny);
        if (wires[nk] || t === POWER || (t === TERM && termPowered) || wet) { seen[nk] = 1; q.push(nk); if (wet && !wetMark[nk]) { wetMark[nk] = 1; poweredWet.push(nk); } }
      }
    }
    for (const b of bulbs) if (seen[b.ty * TW + b.tx]) { b.power++; if (b.power >= 2) award('bright'); }
    for (let i = 0; i < seen.length; i++) if (seen[i]) poweredTile[i] = 1;
  }
}
function updateIceAndPower() {
  // 火のかべのそばの氷はとける
  for (let ti = 0; ti < TW * TH; ti++) {
    if (fireHP[ti] <= 0) continue;
    const tx = ti % TW, ty = ti / TW | 0;
    for (let y = ty * 4 - 1; y <= ty * 4 + 4; y++) for (let x = tx * 4 - 1; x <= tx * 4 + 4; x++)
      if (get(x, y) === ICE && Math.random() < .3) { grid[y * GW + x] = WATER; cold[y * GW + x] = 0; }
  }
  // 電極: 電気の流れた水がふれると、ピンクのゲートが開く（一度つけば開いたまま）
  if (!termPowered && elecOn) for (const [tx, ty] of terminals) {
    for (let y = ty * 4 - 1; y <= ty * 4 + 4; y++) for (let x = tx * 4 - 1; x <= tx * 4 + 4; x++)
      if (x >= 0 && y >= 0 && x < GW && y < GH && elec[y * GW + x]) { termPowered = true; award('power'); sfx('zap'); puff(tx * TILE + 8, ty * TILE + 8, 12, '#ff6'); }
  }
}
let iceMade = 0;
function fusePoint(f) {
  const i = Math.min(f.path.length - 1, Math.floor(f.prog)), j = Math.min(f.path.length - 1, i + 1), t = f.prog - i;
  const [ax, ay] = f.path[i], [bx, by] = f.path[j];
  return [(ax + (bx - ax) * t) * TILE + 8, (ay + (by - ay) * t) * TILE + 8];
}
function updateFuses() {
  for (const f of fuses) {
    if (f.done || f.out || P.dead) continue;
    f.prog += 1 / (L.fuseSpeed || 45);
    const [x, y] = fusePoint(f);
    if (frame % 3 === 0) fx.push({ x, y, vx: (Math.random() - .5), vy: -Math.random() * 1.2, life: 12, col: Math.random() < .5 ? '#ffe14a' : '#ff7a1a' });
    // 水がかかると火が消える
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let wet = false;
    for (let yy = cy - 2; yy <= cy + 2 && !wet; yy++) for (let xx = cx - 2; xx <= cx + 2; xx++) if (get(xx, yy) === WATER) { wet = true; break; }
    if (!wet) for (const arr of [held, free]) for (const p of arr) if (Math.abs(p.x - x) < 7 && Math.abs(p.y - y) < 7) { wet = true; break; }
    if (wet) { f.out = true; stat('fuses', 1, 5, 'fuse'); sfx('sizzle'); puff(x, y, 8, '#ccd'); continue; }
    if (f.prog >= f.path.length - 1) { f.done = true; f.bomb.blown = true; explode(f.bomb.x + 8, f.bomb.y + 8, 72); if (L.bombLose !== false) killPlayer('bomb'); }
  }
}
function updateGimmicks() {
  if (crystalCd > 0) crystalCd--;
  if (iceMade && frame % 20 === 0) { stat('ice', iceMade, 500, 'ice'); iceMade = 0; }
  // てきを全部たおすとカギが出る
  if (L.keyOnClear && !keyItems.length && enemies.length && enemies.every(e => !e.alive)) {
    const [tx, ty] = L.keyOnClear;
    keyItems.push({ x: tx * TILE + 3, y: ty * TILE + 3, w: 10, h: 12, taken: false });
    sfx('key'); puff(tx * TILE + 8, ty * TILE + 8, 16, '#ffe066');
  }
  // 燭台: 水にふれると消える
  for (const b of braziers) if (b.lit && frame % 3 === 0) eatCell(b, 0, () => douse(b));
  // 床スイッチ: 人・木箱・歩くてきが乗っているあいだ押される
  const weights = [P.dead ? null : P, ...crates, ...enemies.filter(e => e.alive && ['crab', 'turtle', 'sponge', 'sala', 'bbug', 'boss'].includes(e.type))].filter(Boolean);
  for (let g = 0; g < 3; g++) {
    const ps = plates.filter(p => p[2] === g);
    platePressed[g] = ps.length > 0 && ps.every(([tx, ty]) => weights.some(w => overlap(w, { x: tx * TILE + 1, y: ty * TILE + 4, w: TILE - 2, h: 13 })));
  }
  if (sensors.length && frame % 6 === 0) {
    for (let g = 0; g < 3; g++) {
      if (!sensorNeed[g]) continue;
      let c = 0;
      for (const [tx, ty, gg] of sensors) if (gg === g)
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (grid[(ty * 4 + y) * GW + tx * 4 + x] === WATER) c++;
      sensorCount[g] = c;
    }
  }
  // ゲートの条件: そのグループの「水スイッチ」「床スイッチ」「燭台(緑だけ)」が全部そろうと開く
  for (let g = 0; g < 3; g++) {
    const hasS = sensorNeed[g] > 0, hasP = plates.some(p => p[2] === g), hasB = g === 2 && braziers.length > 0, hasT = g === 1 && terminals.length > 0, hasU = g === 1 && L.bulbGate && bulbs.length > 0, hasF = g === 0 && L.fuseGate && fuses.length > 0;
    if (!hasS && !hasP && !hasB && !hasT && !hasU && !hasF) continue;
    const ok = (!hasS || sensorCount[g] >= sensorNeed[g]) && (!hasP || platePressed[g]) && (!hasB || braziers.every(b => !b.lit)) && (!hasT || termPowered) && (!hasU || bulbs.every(b => b.power >= (L.bulbNeed || 1))) && (!hasF || fuses.every(f => f.out));
    const dynamic = hasP || (hasS && L.hold) || (hasB && L.relight) || hasU || hasF; // 6章: 燭台にまた火がつくと閉まる // 床スイッチ・もれるスイッチは、条件が外れると閉まる
    if (!gateOpen[g] && ok) setGate(g, true);
    else if (gateOpen[g] && !ok && dynamic && !gateBlockedByBody(g)) setGate(g, false);
  }
  for (const s of seeds) {
    if (s.grow < 0 || frame % 5) continue;
    const ty = s.grow;
    if (isSolidForPlayer(get(s.tx * 4 + 2, ty * 4 + 2))) { s.grow = -2; continue; } // かべ・火にぶつかったら止まる
    vines[ty * TW + s.tx] = 1;
    if (--s.grow < 0) s.grow = -2;
  }
  if (frame % 4 === 0) { if (powerSrc.length || bulbs.length) updateCircuit(); updateLightGates(); updateElec(); updateIceAndPower(); }
  updateFuses();
  updateGeysers();
  if (pipes.length) updatePipes();
  if (fans.length) updateFans();
  updateBolts();
  if (orbs.length) updateOrbs();
  updateFaucets();
  if (L.tutorial) updateTutorial();
}

// ---------------- 描画 ----------------
function rgba(r, g, b, a) { return (a << 24) | (b << 16) | (g << 8) | r; }
const ICE_C = rgba(196, 236, 255, 245), ICE_TOP = rgba(240, 252, 255, 255);
const WATER_C = rgba(58, 140, 232, 205), WATER_TOP = rgba(140, 205, 255, 230), ELEC_C = rgba(230, 230, 120, 230),
  MUD_C = rgba(107, 74, 46, 245), MUD_TOP = rgba(140, 102, 66, 250), DIRT_C = rgba(154, 116, 72, 255), DIRT_TOP = rgba(186, 148, 98, 255);
function drawFluids() {
  const zap = (frame >> 2) & 1;
  for (let k = 0; k < grid.length; k++) {
    const t = grid[k], top = (k >= GW ? grid[k - GW] : WALL) === EMPTY;
    if (t === WATER) fpx[k] = elec[k] && (zap ^ (k & 1)) && ((k * 7 + frame) % 11 < 3) ? ELEC_C : top ? WATER_TOP : WATER_C;
    else if (t === ICE) fpx[k] = top ? ICE_TOP : ICE_C;
    else fpx[k] = t === MUD ? (top ? MUD_TOP : MUD_C) : t === DIRT ? (top ? DIRT_TOP : DIRT_C) : 0;
  }
  fctx.putImageData(fimg, 0, 0);
  ctx.drawImage(fluidCv, 0, 0, W, H);
}
function drawPlayer() {
  if (P.dead) return;
  const x = Math.round(P.x * 2) / 2, y = Math.round(P.y * 2) / 2, hold = held.length > 0, f = hold ? (mouse.x >= P.x + 5 ? 1 : -1) : P.face;
  const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? x + dx : x + P.w - dx - w, y + dy, w, h); };
  const walk = P.ground && Math.abs(P.vx) > .3 ? Math.sin(frame * .35) : 0;
  // 水のスカーフ（うしろになびく）
  for (let i = 0; i < 4; i++) { const wv = Math.sin(frame * .2 + i) * 1; R(-1.5 - i * 1.5, 8.5 + wv * .5 + i * .3, 1.5, 1.5, i % 2 ? '#7fd4ff' : '#4ab0ff'); }
  // あし・くつ
  R(2, 14.5 + Math.max(0, walk) * 1, 2.5, 3.5 - Math.max(0, walk), '#2a3f7a'); R(6, 14.5 + Math.max(0, -walk) * 1, 2.5, 3.5 - Math.max(0, -walk), '#2a3f7a');
  R(1.5, 17, 3, 1, '#1a2448'); R(5.5, 17, 3, 1, '#1a2448');
  // ふく
  R(1, 8, 8.5, 6.5, '#e8f4ff'); R(1, 8, 8.5, .5, '#ffffff'); R(1, 13.5, 8.5, 1, '#c8dcf0');
  R(1, 11.5, 8.5, 1.5, '#4ab0ff'); R(4.5, 11.5, 1.5, 1.5, '#ffd860');
  if (!hold) R(8.5 + walk * .5, 9, 1.5, 3.5, '#ffd9b8'); // うで
  // かお
  R(2, 2.5, 7, 6, '#ffd9b8'); R(2, 7.5, 7, .5, '#e8b896');
  R(6, 4.5, 1.5, 2, '#123'); R(6.5, 4.5, .5, .5, '#fff'); // め
  R(3, 4.5, 1, 2, '#123'); R(3, 4.5, .5, .5, '#fff');
  R(7.5, 6.5, 1, .5, '#ff9a9a'); R(5, 7, 1.5, .5, '#b86a5a'); // ほお・くち
  // かみ
  R(1, 0, 8.5, 3, '#2b8fe8'); R(1.5, -.5, 6, 1, '#2b8fe8'); R(2, 0, 3, .5, '#7fd4ff');
  R(0, 1, 2, 6, '#2b8fe8'); R(0, 6.5, 1.5, 1.5, '#1f6fc0'); R(8, 2.5, 1.5, 1.5, '#2b8fe8');
  R(-1, 3, 1.5, 3, '#7fd4ff'); // しずくのかみかざり
  if (hold) { // 両手を水のほうへのばして、あやつるポーズ
    const sx = x + 5, sy = y + 9.5, a = Math.atan2(mouse.y - sy, mouse.x - sx), pulse = Math.sin(frame * .25);
    ctx.lineCap = 'round';
    for (const [off, len] of [[-.35, 8], [.35, 7.5]]) {
      const hx = sx + Math.cos(a + off * .4) * len, hy = sy + Math.sin(a + off * .4) * len + off * 2;
      ctx.strokeStyle = "#e8f4ff"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx + off * 2, sy + off * 1.5); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(hx, hy, 1.1, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(140,230,255,${.45 + pulse * .2})`; ctx.beginPath(); ctx.arc(hx, hy, 2.6 + pulse * .6, 0, 7); ctx.fill();
    }
    ctx.lineCap = 'butt'; ctx.lineWidth = 1;
    // 手から水へ流れる光のつぶ
    let cx = 0, cy = 0; for (const p of held) { cx += p.x; cy += p.y; } cx /= held.length; cy /= held.length;
    for (let i = 0; i < 5; i++) {
      const t = ((frame * .03) + i / 5) % 1, hx = sx + Math.cos(a) * 6;
      const px = hx + (cx - hx) * t + Math.sin(t * 9 + i) * 2, py = sy + Math.sin(a) * 6 + (cy - sy - Math.sin(a) * 6) * t + Math.cos(t * 9 + i) * 2;
      ctx.fillStyle = `rgba(190,245,255,${.8 * (1 - t)})`; ctx.fillRect(px - .5, py - .5, 1.2, 1.2);
    }
    // 足もとの魔法の輪
    ctx.strokeStyle = `rgba(127,232,255,${.35 + pulse * .15})`; ctx.beginPath(); ctx.ellipse(x + 5, y + 18, 8 + pulse, 2, 0, 0, 7); ctx.stroke();
  }
}
function drawEnemy(e) {
  const x = Math.round(e.x), y = Math.round(e.y), fl = (frame >> 2) & 1, white = e.flash > 0;
  switch (e.type) {
    case 'fire':
      ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(x + 6, y + 7, 6, 0, 7); ctx.fill();
      ctx.fillRect(x + 2, y - 2 + fl, 3, 5); ctx.fillRect(x + 7, y - 4 - fl, 3, 6);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x + 6, y + 8, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#300'; ctx.fillRect(x + 3, y + 6, 2, 2); ctx.fillRect(x + 8, y + 6, 2, 2);
      ctx.fillStyle = '#fff6'; ctx.fillRect(x + 3, y + 6, .5, .5); ctx.fillRect(x + 8, y + 6, .5, .5); ctx.fillRect(x + 4, y + 3, 1, .5);
      break;
    case 'crab': {
      ctx.fillStyle = white ? '#fff' : '#e8452c'; ctx.fillRect(x + 2, y + 2, 12, 7);
      ctx.fillRect(x, y, 3, 3); ctx.fillRect(x + 13, y, 3, 3);
      ctx.fillStyle = '#a32'; const l = (frame >> 3) & 1;
      ctx.fillRect(x + 2, y + 9 - l, 2, 1 + l); ctx.fillRect(x + 6, y + 8 + l, 2, 2 - l); ctx.fillRect(x + 11, y + 9 - l, 2, 1 + l);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y, 2, 3); ctx.fillRect(x + 10, y, 2, 3);
      ctx.fillStyle = '#000'; ctx.fillRect(x + 4, y, 1, 1); ctx.fillRect(x + 10, y, 1, 1);
      ctx.fillStyle = '#ff9a8a'; ctx.fillRect(x + 3, y + 2.5, 10, .5); ctx.fillStyle = '#a32'; ctx.fillRect(x + 7, y + 6, 2, .5);
      break;
    }
    case 'turtle': {
      const l = (frame >> 3) & 1, fx2 = e.vx > 0 ? x + 15 : x - 1;
      ctx.fillStyle = '#7bb04a'; ctx.fillRect(fx2, y + 4, 4, 4); ctx.fillRect(x + 2, y + 9 + l, 3, 3 - l); ctx.fillRect(x + 13, y + 10 - l, 3, 2 + l);
      ctx.fillStyle = white ? '#fff' : '#6b6f7a'; ctx.fillRect(x + 1, y + 2, 16, 8); ctx.fillRect(x + 4, y, 10, 2);
      ctx.fillStyle = '#8e93a0'; ctx.fillRect(x + 4, y + 3, 4, 3); ctx.fillRect(x + 10, y + 3, 4, 3);
      ctx.fillStyle = '#000'; ctx.fillRect(e.vx > 0 ? fx2 + 2 : fx2 + 1, y + 5, 1, 1);
      break;
    }
    case 'bat': {
      const wing = Math.sin(frame * .4) * 3;
      ctx.fillStyle = white ? '#fff' : '#6a4fa8';
      ctx.fillRect(x + 4, y + 1, 5, 6);
      ctx.beginPath(); ctx.moveTo(x + 4, y + 2); ctx.lineTo(x - 2, y + 1 + wing); ctx.lineTo(x + 4, y + 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 15, y + 1 + wing); ctx.lineTo(x + 9, y + 6); ctx.fill();
      ctx.fillStyle = '#ff5'; ctx.fillRect(x + 5, y + 3, 1, 1); ctx.fillRect(x + 7, y + 3, 1, 1);
      break;
    }
    case 'turret':
      ctx.fillStyle = white ? '#fff' : '#5a3a30'; ctx.fillRect(x, y + 4, 14, 10);
      ctx.fillStyle = '#3a2620'; ctx.fillRect(x + 2, y + 12, 10, 2);
      ctx.fillStyle = fl ? '#ff7a1a' : '#ffbe2e'; ctx.beginPath(); ctx.arc(x + 7, y + 6, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#300'; ctx.fillRect(x + 4, y + 8, 2, 2); ctx.fillRect(x + 8, y + 8, 2, 2);
      break;
    case 'ghost': {
      const a = L.dark ? Math.min(.9, Math.max(.06, lightAt(e.x + 6, e.y + 7) * 1.8)) : .75;
      ctx.globalAlpha = a; const wv = Math.sin(e.t * 2) * 1;
      ctx.fillStyle = white ? '#fff' : '#d8e4ff'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 6, Math.PI, 0); ctx.fill();
      ctx.fillRect(x, y + 6, 12, 5);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 2 + i * 4, y + 11 + (i % 2 ? wv : -wv), 2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#223'; ctx.fillRect(x + 3, y + 4, 2, 3); ctx.fillRect(x + 7, y + 4, 2, 3); ctx.fillRect(x + 5, y + 8, 2, 1.5);
      ctx.globalAlpha = 1; break;
    }
    case 'sala': {
      const f = e.vx > 0 ? 1 : -1, l = (frame >> 3) & 1, X = (dx, w) => f > 0 ? x + dx : x + 16 - dx - w;
      ctx.fillStyle = white ? '#fff' : '#e8602c'; ctx.fillRect(X(2, 11), y + 3, 11, 6); ctx.fillRect(X(11, 5), y + 1, 5, 5);
      ctx.fillStyle = '#ffb030'; for (let i = 0; i < 4; i++) ctx.fillRect(X(3 + i * 2.5, 1.5), y + 2 + (i % 2), 1.5, 1.5);
      ctx.fillStyle = '#c03818'; ctx.fillRect(X(0, 3), y + 5, 3, 2); ctx.fillRect(X(3, 2), y + 9 + l, 2, 2 - l); ctx.fillRect(X(10, 2), y + 9 + (1 - l), 2, 1 + l);
      ctx.fillStyle = '#ffe14a'; ctx.fillRect(X(14, 1.5), y + 2, 1.5, 1.5); ctx.fillStyle = '#000'; ctx.fillRect(X(14.5, .7), y + 2.4, .7, .7);
      break;
    }
    case 'bbug': {
      const l = (frame >> 2) & 1;
      ctx.fillStyle = e.armed ? (white ? '#fff' : '#3a3f4a') : '#777'; ctx.beginPath(); ctx.arc(x + 7, y + 5, 6, Math.PI, 0); ctx.fill(); ctx.fillRect(x + 1, y + 5, 12, 3);
      ctx.fillStyle = '#222'; ctx.fillRect(x + 2, y + 8, 2, 2 - l); ctx.fillRect(x + 6, y + 8, 2, 1 + l); ctx.fillRect(x + 10, y + 8, 2, 2 - l);
      ctx.fillStyle = '#ff5050'; ctx.fillRect(x + 4, y + 2, 1.5, 1.5); ctx.fillRect(x + 8.5, y + 2, 1.5, 1.5);
      ctx.strokeStyle = '#8a7050'; ctx.beginPath(); ctx.moveTo(x + 7, y - 1); ctx.lineTo(x + 9, y - 5); ctx.stroke();
      if (e.armed) { ctx.fillStyle = (frame >> 1) & 1 ? '#ffe14a' : '#ff7a1a'; ctx.beginPath(); ctx.arc(x + 9, y - 6, 1.8, 0, 7); ctx.fill(); text(Math.ceil(e.fuse / 60) + '', x + 7, y - 9, 8, '#ff8', 'center'); }
      break;
    }
    case 'boss': {
      const up = e.stun > 0 || e.shock > 0, f = e.vx > 0 ? 1 : -1, l = (frame >> 3) & 1, sh = e.shock > 0 ? (Math.random() - .5) * 2 : 0;
      ctx.save(); ctx.translate(x + 20 + sh, y + 14); if (up) ctx.scale(1, -1); if (f < 0) ctx.scale(-1, 1);
      ctx.fillStyle = '#5a7a3a'; ctx.fillRect(16, -4, 8, 8); ctx.fillStyle = '#ffe14a'; ctx.fillRect(20, -2, 2, 2); ctx.fillStyle = '#000'; ctx.fillRect(21, -1.5, 1, 1);
      ctx.fillStyle = '#4a6a2a'; ctx.fillRect(-16, 8, 7, 5 - l); ctx.fillRect(9, 8, 7, 4 + l);
      ctx.fillStyle = white ? '#fff' : '#6a5038'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-20, 0, 40, 8);
      ctx.fillStyle = '#8a6a48'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 9, -6); ctx.lineTo(-11 + i * 9, -15); ctx.lineTo(-8 + i * 9, -6); ctx.fill(); }
      ctx.fillStyle = '#4a3828'; ctx.fillRect(-18, 2, 36, 1); ctx.fillRect(-10, -8, 1, 10); ctx.fillRect(4, -8, 1, 10);
      ctx.restore();
      if (up) for (let i = 0; i < 3; i++) text('★', x + 8 + i * 12 + Math.sin(frame * .2 + i) * 3, y - 4, 8, '#ffe14a');
      const mh = e.maxHp || 3; for (let i = 0; i < mh; i++) { ctx.fillStyle = i < e.hp ? '#ff6060' : '#433'; ctx.fillRect(x + 20 - mh * 4.5 + i * 9, y - 14, 7, 3); }
      if (e.shock > 0) { text('⚡ しびれた！ 水をぶつけろ！', x + 20, y - 22, 10, (frame >> 3) & 1 ? '#fff6a0' : '#9cf', 'center'); ctx.fillStyle = '#433'; ctx.fillRect(x, y - 9, 40, 2); ctx.fillStyle = '#9cf'; ctx.fillRect(x, y - 9, 40 * (e.hitM || 0) / BOSS_HITS, 2); ctx.fillStyle = '#fff6a0'; ctx.fillRect(x, y - 6, 40 * e.shock / 300, 1); }
      else if (e.roar > 0) text('どろまぜ！', x + 20, y - 20, 9, '#e8b070', 'center');
      else if (e.gulp > 0) text('ごくごく…', x + 20, y - 20, 9, '#9cf', 'center');
      if (!up && e.maxHp - e.hp >= 1 && (frame >> 3) & 1) { ctx.fillStyle = '#ff5040'; ctx.fillRect(x + 34, y - 4, 2, 1); ctx.fillRect(x + 35, y - 5, 1, 3); }
      break;
    }
    case 'fboss': {
      const st = e.stun > 0 || e.tired > 0, cx = x + 16, cy = y + 16, fl2 = frame * .3;
      // 体のまわりの炎
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + fl2 * .2, rr = 15 + Math.sin(fl2 + i * 2) * 3;
        ctx.fillStyle = st ? '#6a5a5a' : (i % 2 ? '#ff7a1a' : '#ffc23a');
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr * .8, cy + Math.sin(a) * rr * .7 - 3, 5 + Math.sin(fl2 * 1.3 + i) * 1.5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = white ? '#fff' : st ? '#4a3a3a' : '#c8301a'; ctx.beginPath(); ctx.ellipse(cx, cy, 12, 13, 0, 0, 7); ctx.fill();
      ctx.fillStyle = st ? '#5a4a4a' : '#ff9a3a'; ctx.beginPath(); ctx.ellipse(cx, cy + 3, 8, 7, 0, 0, 7); ctx.fill();
      // つの
      ctx.fillStyle = st ? '#555' : '#ffe14a'; ctx.beginPath(); ctx.moveTo(cx - 9, cy - 8); ctx.lineTo(cx - 13, cy - 19); ctx.lineTo(cx - 5, cy - 11); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 9, cy - 8); ctx.lineTo(cx + 13, cy - 19); ctx.lineTo(cx + 5, cy - 11); ctx.fill();
      // め・くち
      if (st) { text('×', cx - 4, cy - 1, 7, '#ccc', 'center'); text('×', cx + 4, cy - 1, 7, '#ccc', 'center'); }
      else { ctx.fillStyle = '#fff6a0'; ctx.fillRect(cx - 6, cy - 4, 4, 3); ctx.fillRect(cx + 2, cy - 4, 4, 3); ctx.fillStyle = '#300'; ctx.fillRect(cx - 4, cy - 3, 1.5, 2); ctx.fillRect(cx + 3, cy - 3, 1.5, 2); }
      ctx.fillStyle = '#300'; ctx.fillRect(cx - 4, cy + 4, 8, 2); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 3, cy + 4, 1, 1); ctx.fillRect(cx + 2, cy + 4, 1, 1);
      if (e.tired > 0) { text('ハァ…ハァ…', cx, y - 18, 9, '#ffd0a0', 'center'); if ((frame >> 3) & 1) text('チャンス！', cx, y + 40, 9, '#9cf', 'center'); }
      if (st) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(200,200,210,.5)'; ctx.beginPath(); ctx.arc(cx - 8 + i * 8, y - 4 - ((frame + i * 10) % 30) * .5, 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#433'; ctx.fillRect(cx - 20, y - 12, 40, 4); ctx.fillStyle = '#ff6060'; ctx.fillRect(cx - 20, y - 12, 40 * Math.max(0, e.hp) / e.maxHp, 4);
      break;
    }
    case 'jelly': {
      const dryk = Math.min(1, e.dry / DIFF.jelly.dry);
      ctx.fillStyle = `rgba(${200 - dryk * 60},${150 - dryk * 50},255,${.85 - dryk * .3})`;
      ctx.beginPath(); ctx.arc(x + 6, y + 5, 6, Math.PI, 0); ctx.fill(); ctx.fillRect(x, y + 5, 12, 2);
      ctx.fillStyle = '#ffe94a'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 1 + i * 3, y + 7, 1, 4 + ((frame >> 3) + i) % 2);
      if (!e.dry && fl) { ctx.fillStyle = '#fff6a0'; ctx.fillRect(x - 2, y + 2, 1, 3); ctx.fillRect(x + 13, y + 3, 1, 3); }
      ctx.fillStyle = '#226'; ctx.fillRect(x + 3, y + 3, 2, 2); ctx.fillRect(x + 7, y + 3, 2, 2);
      break;
    }
    case 'sponge': {
      const s = 1 + e.eat / e.full * .7, cw = 14 * s, ch = 12 * s, cx = x + 7 - cw / 2, cy = y + 12 - ch;
      ctx.fillStyle = '#e8c94a'; ctx.fillRect(cx, cy, cw, ch);
      ctx.fillStyle = '#c9a52e'; for (let i = 0; i < 5; i++) ctx.fillRect(cx + (i * 5 % cw), cy + (i * 7 % ch), 2, 2);
      ctx.fillStyle = '#4ab0ff'; ctx.fillRect(cx, cy + ch * (1 - e.eat / e.full), 2, ch * e.eat / e.full);
      ctx.fillStyle = '#000'; ctx.fillRect(cx + cw * .3, cy + ch * .35, 2, 2); ctx.fillRect(cx + cw * .65, cy + ch * .35, 2, 2);
      break;
    }
  }
}
function drawCircuit() {
  const cond = (tx, ty) => tx >= 0 && ty >= 0 && tx < TW && ty < TH && (wires[ty * TW + tx] || [POWER, TERM].includes(get(tx * 4 + 1, ty * 4 + 1)));
  // 電線
  for (let ti = 0; ti < TW * TH; ti++) {
    if (!wires[ti]) continue;
    const tx = ti % TW, ty = ti / TW | 0, cx = tx * TILE + 8, cy = ty * TILE + 8;
    const on = poweredTile && poweredTile[ti];
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (cond(tx + dx, ty + dy) || isWetTile(tx + dx, ty + dy)) { ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * 8, cy + dy * 8); }
    ctx.stroke();
    ctx.strokeStyle = on ? ((frame >> 2) & 1 ? '#ffe680' : '#ffcc40') : '#c98a3a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#c98a3a'; ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
  ctx.lineWidth = 1;
  // 電気ブロック
  for (const [tx, ty] of powerSrc) {
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = '#2a2f3f'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#4a5068'; ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = (frame >> 3) & 1 ? '#ffe14a' : '#fff6a0';
    ctx.beginPath(); ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x + 6, y + 14); ctx.lineTo(x + 12, y + 6); ctx.lineTo(x + 8, y + 6); ctx.fill();
    ctx.fillStyle = '#9aa0b8'; ctx.fillRect(x + 1, y + 1, TILE - 2, .5);
  }
  // 電球
  for (const b of bulbs) {
    const x = b.tx * TILE + 8, y = b.ty * TILE + 7, on = b.power > 0;
    ctx.fillStyle = '#6b6f7a'; ctx.fillRect(x - 3, y + 4, 6, 4); ctx.fillStyle = '#9aa0b0'; ctx.fillRect(x - 3, y + 5, 6, .5); ctx.fillRect(x - 3, y + 6.5, 6, .5);
    ctx.fillStyle = on ? '#fff6c0' : '#55607a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,240,150,.35)'; ctx.beginPath(); ctx.arc(x, y, 7 + b.power * 2, 0, 7); ctx.fill(); }
    ctx.fillStyle = on ? '#ffffff' : '#8890a8'; ctx.fillRect(x - 2, y - 3, 1, 2);
    if (on) for (let i = 0; i < b.power; i++) text('+', x - 6 + i * 5, y - 8, 7, '#ffe14a');
  }
  // ひびわれたかべ
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    let n = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (grid[(ty * 4 + y) * GW + tx * 4 + x] === CRACK) n++;
    if (!n) continue;
    const x = tx * TILE, y = ty * TILE;
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) if (grid[(ty * 4 + yy) * GW + tx * 4 + xx] === CRACK) { ctx.fillStyle = (xx + yy) % 2 ? '#5a5048' : '#4a4038'; ctx.fillRect(x + xx * 4, y + yy * 4, 4, 4); }
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 7, y + 6); ctx.lineTo(x + 5, y + 10); ctx.lineTo(x + 9, y + 15); ctx.moveTo(x + 7, y + 6); ctx.lineTo(x + 13, y + 4); ctx.stroke(); ctx.lineWidth = 1;
  }
  // 導火線とバクダン
  for (const f of fuses) {
    const pts = f.path.map(([tx, ty]) => [tx * TILE + 8, ty * TILE + 8]);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const burnt = i + 1 <= f.prog;
      ctx.strokeStyle = burnt ? '#555' : '#c8a060'; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
    ctx.lineWidth = 1;
    if (!f.done) {
      const [x, y] = fusePoint(f);
      if (!f.out) { ctx.fillStyle = (frame >> 1) & 1 ? '#ffe14a' : '#ff7a1a'; ctx.beginPath(); ctx.arc(x, y, 2.5 + Math.random(), 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#888'; ctx.fillRect(x - 1, y - 1, 2, 2); }
    }
  }
  for (const b of bombs) {
    if (b.blown) continue;
    const x = b.x + 8, y = b.y + 9;
    ctx.fillStyle = '#20222a'; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a4f60'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a7050'; ctx.fillRect(x - 1, y - 9, 2, 3);
  }
}
let poweredTile = null;
function drawPuzzle() {
  drawCircuit();
  for (const [tx, ty] of terminals) { // 電極
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = '#7a4a1e'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#c98a3a'; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = termPowered ? ((frame >> 2) & 1 ? '#fff6a0' : '#ffe14a') : '#4a2a10';
    ctx.beginPath(); ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x + 6, y + 14); ctx.lineTo(x + 12, y + 6); ctx.lineTo(x + 8, y + 6); ctx.fill();
  }
  for (const [tx, ty, g] of plates) { // 床スイッチ
    const x = tx * TILE, y = ty * TILE, on = platePressed[g];
    ctx.fillStyle = '#2a2f40'; ctx.fillRect(x, y + 13, TILE, 3);
    ctx.fillStyle = on ? '#7f7' : GROUP_COL[g]; ctx.fillRect(x + 2, y + (on ? 14 : 11), TILE - 4, on ? 2 : 3);
  }
  for (const b of toggles) { // 赤・青ブロック
    const x = b.tx * TILE, y = b.ty * TILE, col = b.red ? '#e5484d' : '#3e8cf0';
    if (b.solid) { ctx.fillStyle = col; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 2, y + 2, TILE - 4, 3); ctx.strokeStyle = '#0006'; ctx.strokeRect(x + .5, y + .5, TILE - 1, TILE - 1); }
    else { ctx.strokeStyle = col; ctx.setLineDash([2, 3]); ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3); ctx.setLineDash([]); }
  }
  for (const [tx, ty] of crystals) { // クリスタル
    const x = tx * TILE + 8, y = ty * TILE + 8, c = crystalOn ? '#59b7ff' : '#ff6a6a';
    ctx.fillStyle = '#3a3f55'; ctx.fillRect(x - 8, y + 4, 16, 4);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 2, y - 4, 2, 4);
  }
  for (const [tx, ty] of locks) { // カギ扉
    if (get(tx * 4, ty * 4) !== LOCK) continue;
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = '#5a4012'; ctx.fillRect(x + 6, y + 4, 4, 4); ctx.fillRect(x + 7, y + 8, 2, 5);
  }
  for (const b of braziers) { // 燭台
    ctx.fillStyle = '#6b6f7a'; ctx.fillRect(b.x + 2, b.y + 8, 6, 6); ctx.fillRect(b.x, b.y + 6, 10, 3);
    if (b.lit) {
      const f = Math.sin(frame * .4 + b.tx) * 1.5;
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(b.x + 1, b.y + 6); ctx.lineTo(b.x + 5, b.y - 6 + f); ctx.lineTo(b.x + 9, b.y + 6); ctx.fill();
      ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(b.x + 3, b.y + 6); ctx.lineTo(b.x + 5, b.y - 1 + f); ctx.lineTo(b.x + 7, b.y + 6); ctx.fill();
    } else if ((frame >> 4) % 3 === 0) { ctx.fillStyle = '#99a'; ctx.fillRect(b.x + 4, b.y - 2 - (frame >> 2) % 6, 2, 2); }
  }
  for (const k of keyItems) if (!k.taken) { // カギ
    const x = k.x, y = k.y + Math.sin(frame * .1) * 2;
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(x + 5, y + 3, 3.5, 0, 7); ctx.fill();
    ctx.fillRect(x + 4, y + 5, 2, 7); ctx.fillRect(x + 6, y + 9, 3, 2); ctx.fillRect(x + 6, y + 6, 2, 2);
    ctx.fillStyle = '#7a5a10'; ctx.fillRect(x + 4, y + 2, 2, 2);
  }
}
function drawTiles() {
  for (let ti = 0; ti < TW * TH; ti++) {
    if (fireHP[ti] <= 0) continue;
    const tx = ti % TW, ty = ti / TW | 0, x = tx * TILE, y = ty * TILE, r = fireHP[ti] / FIRE_HP;
    if (groundFire[ti]) {
      const rr = fireHP[ti] / GROUND_FIRE_HP;
      ctx.fillStyle = '#5a1408'; ctx.fillRect(x, y + 14, TILE, 2);
      for (let i = 0; i < 5; i++) {
        const h = (4 + 6 * rr) * (0.6 + 0.4 * Math.sin(frame * .35 + i * 1.7 + tx * 3));
        ctx.fillStyle = i % 2 ? '#ff6a1a' : '#ffc23a'; ctx.fillRect(x + i * 3.2, y + TILE - h, 3.2, h);
        ctx.fillStyle = '#fff2a0'; ctx.fillRect(x + i * 3.2 + 1, y + TILE - h * .4, 1.2, h * .4);
      }
      continue;
    }
    ctx.fillStyle = '#7a1c0c'; ctx.fillRect(x, y, TILE, TILE);
    for (let i = 0; i < 4; i++) {
      const h = (6 + 8 * r) * (0.7 + 0.3 * Math.sin(frame * .3 + i * 2 + tx));
      ctx.fillStyle = i % 2 ? '#ff7a1a' : '#ffbe2e'; ctx.fillRect(x + i * 4, y + TILE - h, 4, h);
    }
  }
  for (const f of faucets) {
    const x = f.tx * TILE, y = f.ty * TILE;
    let top = f.ty; while (top > 0 && get(f.tx * 4 + 1, (top - 1) * 4 + 1) === EMPTY) top--; // 天井までパイプ
    ctx.fillStyle = '#6a7a8a'; ctx.fillRect(x + 6, top * TILE, 4, y - top * TILE + 6);
    ctx.fillStyle = '#9aaaba'; ctx.fillRect(x + 6, top * TILE, 1, y - top * TILE + 6);
    ctx.fillStyle = '#8a9aaa'; ctx.fillRect(x + 3, y + 5, 10, 5); ctx.fillRect(x + 5, y + 10, 6, 4);
    ctx.fillStyle = '#c8d4e0'; ctx.fillRect(x + 3, y + 5, 10, 1);
    if (f.hcd > 0) { ctx.strokeStyle = 'rgba(255,140,120,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 8, y + 2, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f.hcd / FAUCET_HAND_WAIT)); ctx.stroke(); ctx.lineWidth = 1; }
    const a = f.turn * .3; ctx.save(); ctx.translate(x + 8, y + 2); ctx.rotate(a); // ハンドル
    ctx.fillStyle = '#d83a3a'; ctx.fillRect(-5, -1, 10, 2); ctx.fillRect(-1, -5, 2, 10); ctx.fillStyle = '#ff8080'; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    if (f.cd > 0) {
      text(String(Math.ceil(f.cd / 60)), x + 8, y - 8, 10, '#9cf', 'center');
      if (!P.dead && nearFaucet() === f) {
        if (f.hcd > 0) text(`ハンドルがかたい… ${Math.ceil(f.hcd / 60)}`, x + 8, y - 20, 9, '#ff9a8a', 'center');
        else if ((frame >> 4) & 1) text(touchMode ? 'ジャンプでひねる' : 'Space でひねる', x + 8, y - 20, 10, '#ffe98a', 'center');
      }
    } else if (f.stock > 0) { ctx.fillStyle = 'rgba(120,200,255,.8)'; ctx.fillRect(x + 6.5, y + 14, 3, 2); }
  }
  for (const [tx, ty] of lightGates) {
    const x = tx * TILE, y = ty * TILE;
    if (lightGateOpen) { ctx.strokeStyle = '#ffe98a55'; ctx.setLineDash([2, 2]); ctx.strokeRect(x + 1.5, y + .5, 13, 15); ctx.setLineDash([]); continue; }
    const tw = .6 + Math.sin(frame * .08 + ty) * .15;
    ctx.fillStyle = '#3a3420'; ctx.fillRect(x + 1, y, 14, TILE);
    ctx.fillStyle = `rgba(255,226,120,${tw})`; ctx.fillRect(x + 3, y, 2, TILE); ctx.fillRect(x + 7, y, 2, TILE); ctx.fillRect(x + 11, y, 2, TILE);
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(x + 7, y + 7, 2, 2); ctx.fillRect(x + 6, y + 4, .5, 1.5); ctx.fillRect(x + 9.5, y + 4, .5, 1.5); ctx.fillRect(x + 6, y + 10.5, .5, 1.5); ctx.fillRect(x + 9.5, y + 10.5, .5, 1.5);
  }
  for (const [tx, ty, g] of gates) {
    if (gateOpen[g]) continue;
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = '#556'; ctx.fillRect(x + 2, y, 12, TILE);
    ctx.fillStyle = GROUP_COL[g]; ctx.fillRect(x + 4, y, 2, TILE); ctx.fillRect(x + 10, y, 2, TILE);
  }
  for (let g = 0; g < 3; g++) {
    const ss = sensors.filter(s => s[2] === g);
    if (!ss.length) continue;
    let minx = 1e9, maxx = 0, ty0 = 0;
    for (const [tx, ty] of ss) { minx = Math.min(minx, tx); maxx = Math.max(maxx, tx); ty0 = Math.max(ty0, ty); }
    const x = minx * TILE, w = (maxx - minx + 1) * TILE, y = ty0 * TILE;
    ctx.strokeStyle = gateOpen[g] ? '#7f7' : GROUP_COL[g]; ctx.setLineDash([3, 3]);
    for (const [tx, ty] of ss) ctx.strokeRect(tx * TILE + .5, ty * TILE + .5, TILE - 1, TILE - 1);
    ctx.setLineDash([]);
    ctx.fillStyle = '#000a'; ctx.fillRect(x, y + TILE + 2, w, 5);
    ctx.fillStyle = gateOpen[g] ? '#7f7' : GROUP_COL[g];
    ctx.fillRect(x + 1, y + TILE + 3, (w - 2) * Math.min(1, sensorCount[g] / sensorNeed[g]), 3);
  }
  for (const s of seeds) if (s.grow === -1) {
    const x = s.tx * TILE, y = s.ty * TILE;
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 4, y + 11, 8, 5);
    ctx.fillStyle = '#6c4'; ctx.fillRect(x + 7, y + 5, 2, 6); ctx.fillRect(x + 4, y + 5, 3, 2); ctx.fillRect(x + 9, y + 3, 3, 2);
    ctx.fillStyle = '#000a'; ctx.fillRect(x - 2, y - 4, 20, 3);
    ctx.fillStyle = '#6f6'; ctx.fillRect(x - 2, y - 4, 20 * s.water / s.need, 3);
  }
  for (let ti = 0; ti < TW * TH; ti++) if (vines[ti]) {
    const x = (ti % TW) * TILE, y = (ti / TW | 0) * TILE;
    ctx.fillStyle = '#3d8a2e'; ctx.fillRect(x + 6, y, 4, TILE);
    ctx.fillStyle = '#6c4'; ctx.fillRect(x + 2, y + 3, 4, 3); ctx.fillRect(x + 10, y + 10, 4, 3);
  }
  if (exitDoor) {
    const { x, y } = exitDoor;
    ctx.fillStyle = '#2b1d0e'; ctx.fillRect(x, y, TILE, TILE * 2);
    ctx.fillStyle = '#ffd860'; ctx.fillRect(x + 2, y + 2, 12, 28);
    ctx.fillStyle = `rgba(255,255,255,${.3 + .2 * Math.sin(frame * .1)})`; ctx.fillRect(x + 4, y + 4, 8, 24);
    ctx.fillStyle = '#c80'; ctx.fillRect(x + 10, y + 16, 2, 2);
  }
}
function drawCrates() {
  for (const c of crates) {
    const x = Math.round(c.x), y = Math.round(c.y);
    if (c.stone) { ctx.fillStyle = '#6a6f78'; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = '#8a909a'; ctx.fillRect(x + 1, y + 1, 14, 3); ctx.fillStyle = '#4a4f58'; ctx.fillRect(x + 3, y + 7, 4, 2); ctx.fillRect(x + 9, y + 10, 4, 2); continue; }
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#b07a3e'; ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.strokeStyle = '#6a421c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y + 2); ctx.lineTo(x + 2, y + 14); ctx.stroke();
    ctx.lineWidth = 1;
  }
}
function drawZones() {
  ctx.setLineDash([6, 4]); ctx.lineDashOffset = -frame * .3;
  const hz = held.length > 0;
  ctx.strokeStyle = hz ? 'rgba(170,150,255,.7)' : 'rgba(110,210,255,.45)'; ctx.fillStyle = hz ? 'rgba(140,120,255,.10)' : 'rgba(80,190,255,.06)';
  if (L.follow) {
    if (!P.dead) { ctx.beginPath(); ctx.arc(P.x + P.w / 2, P.y + P.h / 2, L.follow, 0, 7); ctx.fill(); ctx.stroke(); }
  } else if (L.zones) for (const z of L.zones) {
    const x = z[0] * TILE, y = z[1] * TILE, w = z[2] * TILE, h = z[3] * TILE;
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  }
  ctx.setLineDash([]);
}
function text(s, x, y, size, col, align = 'left') {
  ctx.font = `bold ${size}px "Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",sans-serif`;
  ctx.textAlign = align; ctx.lineWidth = 3; ctx.strokeStyle = '#000c'; ctx.strokeText(s, x, y);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function lightSources() {
  const out = [];
  if (!P.dead) out.push([P.x + 5, P.y + 9, 76, .95]);
  for (let ti = 0; ti < TW * TH; ti++) if (wires[ti] === 1 && poweredTile && poweredTile[ti]) out.push([(ti % TW) * TILE + 8, (ti / TW | 0) * TILE + 8, 14, .45]); // 電気の流れている電線はうっすら光る
  for (const b of bulbs) if (b.power > 0) out.push([b.tx * TILE + 8, b.ty * TILE + 7, bulbRadius(b), 1]);
  for (const b of braziers) if (b.lit) out.push([b.x + 5, b.y, 48, 1]);
  for (let ti = 0; ti < TW * TH; ti++) if (fireHP[ti] > 0) out.push([(ti % TW) * TILE + 8, (ti / TW | 0) * TILE + 8, 30, .8]);
  for (const s of shots) if (!s.mud) out.push([s.x, s.y, 22, .9]);
  for (const o of orbs) out.push([o.x, o.y, 30, .9]);
  for (const st of strikes) out.push([st.x, st.y2 / 2, 400, 1]);
  for (const f of fuses) if (!f.out && !f.done) { const p = fusePoint(f); out.push([p[0], p[1], 26, .9]); }
  if (termPowered) for (const [tx, ty] of terminals) out.push([tx * TILE + 8, ty * TILE + 8, 26, .8]);
  for (const [tx, ty] of powerSrc) out.push([tx * TILE + 8, ty * TILE + 8, 18, .6]);
  if (!lightGateOpen) for (const [tx, ty] of lightGates) out.push([tx * TILE + 8, ty * TILE + 8, 13, .45]);
  for (const [tx, ty] of crystals) out.push([tx * TILE + 8, ty * TILE + 8, 16, .5]);
  for (const e of enemies) if (e.alive && (e.type === 'fire' || e.type === 'sala' || e.type === 'turret')) out.push([e.x + e.w / 2, e.y + e.h / 2, 30, .8]);
  if (exitDoor) out.push([exitDoor.x + 8, exitDoor.y + 16, 22, .6]);
  return out;
}
function lightAt(x, y) { let m = 0; for (const [lx, ly, r, a] of lightSources()) m = Math.max(m, (1 - Math.hypot(lx - x, ly - y) / r) * a); return m; }
function drawDarkness() {
  lctx.setTransform(RS, 0, 0, RS, 0, 0);
  lctx.globalCompositeOperation = 'source-over'; lctx.fillStyle = 'rgba(2,3,12,.93)'; lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, a] of lightSources()) {
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.6, `rgba(0,0,0,${a * .7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 7); lctx.fill();
  }
  lctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCv, 0, 0, W, H);
}
function draw() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.imageSmoothingEnabled = false;
  if (shake > 0 && state === 'play') { shake--; ctx.translate((Math.random() - .5) * shake * .4, (Math.random() - .5) * shake * .4); }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (L && L.rain && state !== 'title' && state !== 'select' && state !== 'badges') { g.addColorStop(0, '#2a2f3d'); g.addColorStop(1, '#151820'); }
  else { g.addColorStop(0, '#16224a'); g.addColorStop(1, '#0a0f22'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (state === 'title') { drawTitle(); drawBlob(); return drawToasts(); }
  if (state === 'select') { drawSelect(); drawBlob(); return drawToasts(); }
  if (state === 'badges') { drawBadges(); drawBlob(); return drawToasts(); }

  drawZones();
  drawTiles();
  drawFluids();
  ctx.drawImage(wallCv, 0, 0, W, H);
  drawPuzzle();
  drawCrates();
  for (const e of enemies) if (e.alive) drawEnemy(e);
  drawPlayer();
  if (held.length) {
    let cx = 0, cy = 0; for (const p of held) { cx += p.x; cy += p.y; } cx /= held.length; cy /= held.length;
    const r = 10 + Math.sqrt(held.length) * 2.4, pulse = Math.sin(frame * .2);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 8);
    g.addColorStop(0, 'rgba(150,250,255,.35)'); g.addColorStop(.6, 'rgba(110,170,255,.18)'); g.addColorStop(1, 'rgba(160,110,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(200,250,255,${.45 + pulse * .2})`; ctx.setLineDash([3, 4]); ctx.lineDashOffset = frame * .6;
    ctx.beginPath(); ctx.arc(cx, cy, r + 2 + pulse, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  for (const p of held) { ctx.fillStyle = 'rgba(150,235,255,.95)'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(p.x - 1, p.y - 1.5, 1.5, 1); }
  for (const p of free) {
    if (p.rain) { ctx.fillStyle = 'rgba(170,200,255,.55)'; ctx.fillRect(p.x, p.y - 6, 1, 7); }
    else { ctx.fillStyle = 'rgba(90,170,245,.9)'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  }
  for (const s of shots) {
    if (s.mud && s.rain) { let gy = Math.floor(s.y / CELL); while (gy < GH && get(Math.floor(s.x / CELL), gy) === EMPTY) gy++; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(s.x, gy * CELL, 5, 1.5, 0, 0, 7); ctx.fill(); }
    if (s.mud) { ctx.fillStyle = '#6b4a2e'; ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#8c6642'; ctx.beginPath(); ctx.arc(s.x - 1, s.y - 1, 1.8, 0, 7); ctx.fill(); continue; }
    const r = s.breath ? 3 : s.big ? 5 : 4;
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(s.x, s.y, r / 2, 0, 7); ctx.fill();
  }
  drawOrbs();
  drawPipes();
  drawFans();
  drawBolts();
  for (const g of geysers) { // どろの柱の予告
    const a = .35 + .35 * Math.sin(frame * .5), gy = g.gy * CELL;
    ctx.fillStyle = `rgba(160,110,60,${a})`; ctx.beginPath(); ctx.ellipse(g.x, gy - 1, 10, 3, 0, 0, 7); ctx.fill();
    text('!', g.x, gy - 8, 10, '#ffb060', 'center');
  }
  for (const f of fx) { ctx.globalAlpha = Math.min(1, f.life / 30); ctx.fillStyle = f.col; ctx.fillRect(f.x, f.y, 2, 2); }
  ctx.globalAlpha = 1;
  if (L.dark) drawDarkness();
  for (const f of fuses) if (!f.done && !f.out) { const left = (f.path.length - 1 - f.prog) * (L.fuseSpeed || 45) / 60, b = f.bomb; text('💣 ' + left.toFixed(1), b.x + 8, b.y - 4, 10, left < 3 ? '#ff6060' : '#ffd860', 'center'); }

  // カーソル（タッチで指を離しているときは出さない）
  if ((!touchMode || mouse.down) && state === 'play') {
    const okZ = inZone(mouse.x, mouse.y);
    ctx.strokeStyle = okZ ? (mouse.down ? '#bff' : 'rgba(150,230,255,.8)') : 'rgba(255,110,110,.8)';
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, GRAB_R, 0, 7); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(mouse.x - 1, mouse.y - 1, 2, 2);
  }

  const w = LEVELS[levelIndex].world;
  text(WORLDS[w].tutorial ? `📘 ${L.name}` : `${WORLDS[w].hidden ? '?' : w + 1}-${levelIndex - WORLDS[w].start + 1}  ${L.name}`, 8, 16, 12, '#fff');
  if (keyItems.length || L.keyOnClear) text(`🔑×${keys_}`, 8, 32, 12, '#ffd84a');
  ctx.fillStyle = '#000a'; ctx.fillRect(W - 128, 6, 120, 12);
  ctx.fillStyle = '#4af'; ctx.fillRect(W - 126, 8, 116 * held.length / maxHold(), 8);
  text(`水 ${held.length}/${maxHold()}`, W - 132, 16, 11, '#cef', 'right');
  if (isRaining()) text('☂ 雨', W - 8, 32, 11, '#aac', 'right');
  for (const e of enemies) if (e.alive && e.type === 'fboss') {
    if (e.heatWarn > 0) {
      const a = .08 + .12 * (1 - e.heatWarn / 120) + .05 * Math.sin(frame * .5);
      ctx.fillStyle = `rgba(255,90,20,${a})`; ctx.fillRect(0, 0, W, H);
      text(`🔥 熱波がくる！ 水を ${Math.round(maxHold() * .15)} 以上持って身を守れ！  ${Math.ceil(e.heatWarn / 60)}`, W / 2, 60, 14, '#ffe0a0', 'center');
    }
    if (e.heatFlash > 0) { ctx.fillStyle = `rgba(255,160,60,${e.heatFlash / 40})`; ctx.fillRect(0, 0, W, H); }
  }
  if (L.tutorial) drawTutorial();
  let hint = L.tutorial ? '' : L.hint;
  if (mudStuck > 120) hint = '泥にハマった！ 足もとの泥から水を抜くと土の足場になる（R:やりなおし）';
  text(hint, W / 2, H - 6, 11, '#ffe9a8', 'center');

  if (state === 'clear') {
    ctx.fillStyle = '#000a'; ctx.fillRect(0, 112, W, 124);
    const last = !(levelIndex + 1 < LEVELS.length && levelVisible(levelIndex + 1));
    text(last ? 'ALL CLEAR!  あそんでくれてありがとう！' : 'STAGE CLEAR!', W / 2, 150, 22, '#ffd860', 'center');
    clearButtons().forEach((b, i) => {
      const on = i === clearChoice;
      ctx.fillStyle = on ? '#3a6ad0' : '#1c2748'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = on ? '#bfe0ff' : '#45507a'; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); ctx.lineWidth = 1;
      text(b.label, b.x + b.w / 2, b.y + 22, 13, '#fff', 'center');
    });
    text(touchMode ? 'ボタンをタップ' : '◀ ▶ キーでえらんで Enter（マウスでもOK）', W / 2, 226, 10, '#9ab', 'center');
  }
  if (P.dead) text('やられた…', W / 2, 170, 20, '#f88', 'center');
  if (state === 'pause') drawPause();
  if (state !== 'play') drawBlob();
  drawToasts();
}
function checkClearBadges() {
  const w = L.world;
  if (levelIndex === 0) { award('first'); if (run.frames <= 20 * 60) award('speed'); }
  const ws = WORLDS[w];
  if (ws && !ws.hidden) { let all = true; for (let i = 0; i < ws.count; i++) if (!cleared.has(ws.start + i)) all = false; if (all) award('w' + (w + 1)); }
  if (w >= 3 && run.deaths === 0) award('nomiss');
  if (held.length >= 50) award('carry');
  if (L.name === 'まっくらボス') award('boss2');
  if (L.tutorial) award('tutorial');
  if (L.name === 'ほのおのほうだい' && run.spiritKills === 0) award('peace');
}
// クリアしたあとのボタン（つぎへ / ステージえらびへ）
// ---------------- ポーズメニュー ----------------
let pauseChoice = 0;
const pauseNav = { u: true, d: true };
function pauseButtons() {
  const list = [
    { label: '▶ つづける', act: () => { state = 'play'; } },
    { label: '↺ やりなおす', act: () => { loadLevel(levelIndex, false); } },
    { label: '≡ ステージえらびへ', act: () => { state = 'select'; held = []; } },
    { label: bgmOn ? '♪ BGM：オン' : '♪ BGM：オフ', act: () => { toggleBgm(); state = 'pause'; } },
  ];
  const bw = 200, bh = 30, gap = 10, y0 = 132;
  return list.map((b, i) => Object.assign(b, { x: W / 2 - bw / 2, y: y0 + i * (bh + gap), w: bw, h: bh }));
}
function openPause() {
  state = 'pause'; pauseChoice = 0; pauseNav.u = pauseNav.d = true; sfx('select');
  mouse.down = false; if (held.length) releaseHeld();
}
function updatePause() {
  const btns = pauseButtons();
  if (pressed.Escape || pressed.KeyP) { state = 'play'; sfx('select'); return; }
  const u = keys.ArrowUp || keys.KeyW || touch.up, d = keys.ArrowDown || keys.KeyS || touch.down;
  if (u && !pauseNav.u) pauseChoice = (pauseChoice + btns.length - 1) % btns.length;
  if (d && !pauseNav.d) pauseChoice = (pauseChoice + 1) % btns.length;
  pauseNav.u = u; pauseNav.d = d;
  if (!touchMode) btns.forEach((b, i) => { if (mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h) pauseChoice = i; });
  let pick = -1;
  if (pressed.Click) pick = btns.findIndex(b => mouse.cx > b.x && mouse.cx < b.x + b.w && mouse.cy > b.y && mouse.cy < b.y + b.h);
  if (pressed.Enter || pressed.Space || pressed.Jump) pick = pauseChoice;
  if (pick >= 0) { sfx('select'); btns[pick].act(); }
}
function drawPause() {
  ctx.fillStyle = '#000b'; ctx.fillRect(0, 0, W, H);
  text('ポーズ', W / 2, 110, 22, '#7fd4ff', 'center');
  pauseButtons().forEach((b, i) => {
    const on = i === pauseChoice;
    ctx.fillStyle = on ? '#3a6ad0' : '#1c2748'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = on ? '#bfe0ff' : '#45507a'; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); ctx.lineWidth = 1;
    text(b.label, W / 2, b.y + 20, 13, '#fff', 'center');
  });
  text(touchMode ? 'ボタンをタップ' : '▲ ▼ でえらんで Enter    Esc / P：つづける    M：BGM', W / 2, 300, 10, '#9ab', 'center');
}
let clearChoice = 0;
const clearNav = { l: false, r: false };
function clearButtons() {
  const toSelect = { label: 'ステージえらびへ', act: () => { state = 'select'; sfx('select'); } };
  const list = levelIndex + 1 < LEVELS.length && levelVisible(levelIndex + 1)
    ? [{ label: 'つぎのステージへ ▶', act: () => { sfx('select'); loadLevel(levelIndex + 1); } }, toSelect]
    : [toSelect];
  const bw = 180, bh = 34, gap = 24, total = list.length * bw + (list.length - 1) * gap;
  return list.map((b, i) => Object.assign(b, { x: W / 2 - total / 2 + i * (bw + gap), y: 168, w: bw, h: bh }));
}
function drawTitle() {
  for (let i = 0; i < 60; i++) {
    const x = (i * 97 + frame * (1 + i % 3)) % W, y = (i * 53 + frame * 3) % H;
    ctx.fillStyle = 'rgba(120,180,255,.3)'; ctx.fillRect(x, y, 1, 6);
  }
  text('ミズツカイ', W / 2, 110, 44, '#7fd4ff', 'center');
  text('〜 水をあやつる謎解きアクション 〜', W / 2, 140, 14, '#cfe8ff', 'center');
  const lines = touchMode
    ? ['左のパッド：いどう・ツタをのぼる・すり抜け床をおりる', '右のボタン：ジャンプ・およぐ', '画面をなぞる：水をつかんで動かす（点線の中だけ）  指をはなす：投げる']
    : ['←→ / AD：いどう    ↑ / W / Space：ジャンプ・およぐ・ツタをのぼる    ↓：すり抜け床をおりる',
      'マウス長押し：水をつかむ（点線の範囲の中だけ）   はなす：水を投げる',
      'R：やりなおし    Esc / P：ポーズ（中断）'];
  lines.forEach((l, i) => text(l, W / 2, 190 + i * 20, 11, '#fff', 'center'));
  text(`クリア ${clearedVisible()} / ${visibleCount()}    🏅 バッジ ${badgeGot.size} / ${BADGES.length}`, W / 2, 268, 12, '#9cf', 'center');
  text('はじめての人は、ステージえらびの「📘 チュートリアル」から！', W / 2, 286, 11, '#bfffe8', 'center');
  if ((frame >> 5) & 1) text(touchMode ? 'タップでスタート' : 'クリックでスタート', W / 2, 312, 16, '#ffd860', 'center');
  text('BGM音源: FluidR3_GM (Frank Wen, CC BY 3.0) / midi-js-soundfonts (Benjamin Gleitzman)', W / 2, H - 6, 8, '#6a7a9a', 'center');
}
// ステージえらび
const SEL = { x0: 128, y0: 42, bw: 54, bh: 32, gap: 8, rowH: 41 };
const visibleCount = () => LEVELS.filter((_, i) => levelVisible(i)).length;
const clearedVisible = () => [...cleared].filter(i => i < LEVELS.length && levelVisible(i)).length;
const BADGE_BTN = { x: 8, y: 8, w: 118, h: 24 };
const ROWS_PER_PAGE = 6; let selectPage = 0;
const pageCount = () => Math.ceil(WORLDS.filter(w => !w.tutorial).length / ROWS_PER_PAGE);
const TUTO_BTN = { x: 132, y: 8, w: 118, h: 24 };
const tutorialIndex = () => LEVELS.findIndex(l => (WORLDS[l.world] || {}).tutorial);
const PAGE_BTNS = () => [{ x: 8, y: H - 26, w: 70, h: 20, d: -1, label: '◀ まえ' }, { x: W - 78, y: H - 26, w: 70, h: 20, d: 1, label: 'つぎ ▶' }];
function selectButtons() {
  const out = [];
  WORLDS.forEach((w, wi) => {
    if (w.tutorial) return;
    if (w.hidden && !allBadges()) return;
    if (Math.floor(wi / ROWS_PER_PAGE) !== selectPage) return;
    const row = wi % ROWS_PER_PAGE;
    for (let i = 0; i < w.count; i++) out.push({ i: w.start + i, x: SEL.x0 + i * (SEL.bw + SEL.gap), y: SEL.y0 + row * SEL.rowH, w: SEL.bw, h: SEL.bh, label: `${wi + 1}-${i + 1}` });
  });
  return out;
}
function drawSelect() {
  text('ステージえらび', W / 2, 30, 18, '#7fd4ff', 'center');
  text(`クリア ${clearedVisible()}/${visibleCount()}`, W - 12, 30, 11, '#9cf', 'right');
  const bb = BADGE_BTN, bhov = !touchMode && mouse.x > bb.x && mouse.x < bb.x + bb.w && mouse.y > bb.y && mouse.y < bb.y + bb.h;
  ctx.fillStyle = bhov ? '#5a4a10' : '#3a3010'; ctx.fillRect(bb.x, bb.y, bb.w, bb.h); ctx.strokeStyle = '#ffd860'; ctx.strokeRect(bb.x + .5, bb.y + .5, bb.w - 1, bb.h - 1);
  text(`🏅 バッジ ${badgeGot.size}/${BADGES.length}`, bb.x + bb.w / 2, bb.y + 17, 12, '#ffd860', 'center');
  const tb = TUTO_BTN, thov = !touchMode && mouse.x > tb.x && mouse.x < tb.x + tb.w && mouse.y > tb.y && mouse.y < tb.y + tb.h;
  ctx.fillStyle = thov ? '#1f5a4a' : '#143a30'; ctx.fillRect(tb.x, tb.y, tb.w, tb.h); ctx.strokeStyle = '#7fe8c0'; ctx.strokeRect(tb.x + .5, tb.y + .5, tb.w - 1, tb.h - 1);
  text('📘 チュートリアル', tb.x + tb.w / 2, tb.y + 17, 12, '#bfffe8', 'center');
  WORLDS.forEach((w, wi) => {
    if (w.tutorial) return;
    if (Math.floor(wi / ROWS_PER_PAGE) !== selectPage) return;
    const y = SEL.y0 + (wi % ROWS_PER_PAGE) * SEL.rowH;
    if (w.hidden && !allBadges()) {
      text('W?', 12, y + 17, 13, '#776');
      text('？？？', 12, y + 30, 10, '#776');
      ctx.strokeStyle = '#3a3a4a'; ctx.setLineDash([3, 3]); ctx.strokeRect(SEL.x0 + .5, y + .5, SEL.bw - 1, SEL.bh - 1); ctx.setLineDash([]);
      text('🔒', SEL.x0 + SEL.bw / 2, y + 21, 12, '#776', 'center');
      text('バッジをぜんぶ集めると…', SEL.x0 + SEL.bw + 12, y + 21, 10, '#776');
      return;
    }
    text(w.hidden ? 'W?' : `W${wi + 1}`, 12, y + 17, 13, w.hidden ? '#ff8ad8' : '#ffd860');
    text(w.name, 12, y + 30, 10, '#cfe8ff');
  });
  for (const b of selectButtons()) {
    const done = cleared.has(b.i), hover = !touchMode && mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h;
    ctx.fillStyle = hover ? '#3a5aa8' : done ? '#24406e' : '#1c2748'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = done ? '#7fd4ff' : '#45507a'; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    text(isHiddenLevel(b.i) ? '？' : b.label, b.x + b.w / 2, b.y + 15, 12, '#fff', 'center');
    if (done) text('★', b.x + b.w / 2, b.y + 28, 11, '#ffd860', 'center');
  }
  text(`${selectPage + 1} / ${pageCount()}`, W / 2, H - 22, 11, '#9cf', 'center');
  for (const b of PAGE_BTNS()) { const can = selectPage + b.d >= 0 && selectPage + b.d < pageCount(); ctx.fillStyle = can ? '#24406e' : '#151a2a'; ctx.fillRect(b.x, b.y, b.w, b.h); text(b.label, b.x + b.w / 2, b.y + 14, 11, can ? '#fff' : '#556', 'center'); }
  text('Esc / ≡ でタイトルへ    B：バッジ    T：チュートリアル    ←→：ページ', W / 2, H - 6, 10, '#8aa', 'center');
}
// バッジいちらん
let badgePage = 0;
const BADGES_PER_PAGE = 27, badgePages = () => Math.ceil(BADGES.length / BADGES_PER_PAGE);
function drawBadges() {
  text('🏅 バッジ', W / 2, 26, 18, '#ffd860', 'center');
  text(`${badgeGot.size} / ${BADGES.length}`, W - 12, 26, 11, '#9cf', 'right');
  text(`${badgePage + 1} / ${badgePages()}`, 12, 26, 11, '#9cf');
  const cols = 3, cw = 206, ch = 28, x0 = 10, y0 = 38;
  BADGES.slice(badgePage * BADGES_PER_PAGE, (badgePage + 1) * BADGES_PER_PAGE).forEach((b, i) => {
    const x = x0 + (i % cols) * (cw + 2), y = y0 + Math.floor(i / cols) * (ch + 2), got = badgeGot.has(b.id);
    ctx.fillStyle = got ? '#2a3a62' : '#161c30'; ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = got ? '#ffd860' : '#2e3550'; ctx.strokeRect(x + .5, y + .5, cw - 1, ch - 1);
    ctx.fillStyle = got ? '#ffd860' : '#3a4060'; ctx.beginPath(); ctx.arc(x + 15, y + 14, 8, 0, 7); ctx.fill();
    if (got) { ctx.fillStyle = '#c98a10'; ctx.beginPath(); ctx.arc(x + 15, y + 14, 4, 0, 7); ctx.fill(); }
    text(got ? b.name : '？？？', x + 30, y + 12, 11, got ? '#fff' : '#889');
    text(b.desc, x + 30, y + 24, 9, got ? '#cfe8ff' : '#778');
  });
  text(allBadges() ? '✨ ぜんぶ集めた！ ステージえらびに「？」が出ているはず' : 'ぜんぶ集めると…？', W / 2, H - 22, 11, allBadges() ? '#ff8ad8' : '#99a', 'center');
  text('Esc でもどる   ←→ : ページ', W / 2, H - 6, 10, '#8aa', 'center');
  for (const b of PAGE_BTNS()) { const can = badgePage + b.d >= 0 && badgePage + b.d < badgePages(); ctx.fillStyle = can ? '#24406e' : '#151a2a'; ctx.fillRect(b.x, b.y, b.w, b.h); text(b.label, b.x + b.w / 2, b.y + 14, 11, can ? '#fff' : '#556', 'center'); }
}
// バッジをもらったときのお知らせ
// ---------------- メニューのカーソル（マウスを追いかける水のかたまり） ----------------
const blob = { drops: [], bits: [], down: false, px: W / 2, py: H / 2 };
for (let i = 0; i < 14; i++) blob.drops.push({ x: W / 2, y: H / 2, vx: 0, vy: 0, k: .2 - i * .011, r: 7 - i * .33, a: i * 2.1 });
function drawBlob() {
  if (touchMode && !mouse.down) return;
  const mx = mouse.x, my = mouse.y, sp = Math.hypot(mx - blob.px, my - blob.py); blob.px = mx; blob.py = my;
  // しずくは、先頭ほど速くマウスへ。うしろのしずくは前のしずくを追う → 動くと水のしっぽがのびる
  blob.drops.forEach((d, i) => {
    const lead = i === 0 ? { x: mx, y: my } : blob.drops[i - 1];
    const wob = i === 0 ? 0 : 3.4, t = frame * .06 + d.a;
    const tx = (i === 0 ? mx : lead.x * .55 + mx * .45) + Math.cos(t) * wob, ty = (i === 0 ? my : lead.y * .55 + my * .45) + Math.sin(t * 1.3) * wob;
    d.vx = (d.vx + (tx - d.x) * d.k) * .72; d.vy = (d.vy + (ty - d.y) * d.k) * .72;
    d.x += d.vx; d.y += d.vy;
  });
  // 速く動かすと、しずくが飛び散る
  if (sp > 6 && Math.random() < Math.min(.8, sp / 30)) { const d = blob.drops[blob.drops.length - 1 - (Math.random() * 4 | 0)]; blob.bits.push({ x: d.x, y: d.y, vx: d.vx * .4 + (Math.random() - .5), vy: d.vy * .4 - Math.random(), r: 1 + Math.random() * 1.4, t: 30 }); }
  // クリックすると、ぱしゃっとはねる
  if (mouse.down && !blob.down) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; blob.bits.push({ x: mx, y: my, vx: Math.cos(a) * (1.4 + Math.random()), vy: Math.sin(a) * (1.4 + Math.random()) - 1, r: 1.2 + Math.random() * 1.3, t: 34 }); }
  blob.down = mouse.down;
  blob.bits = blob.bits.filter(b => { b.vy += .12; b.x += b.vx; b.y += b.vy; return --b.t > 0 && b.y < H + 4; });
  const press = mouse.down ? .8 : 1; // おしている間は、ぎゅっと小さく
  ctx.save();
  // ふち（こい青）→ 中身（明るい青）の順にかさねると、まるがくっついて1つのかたまりに見える
  for (const [grow, col] of [[1.6, 'rgba(20,70,150,.9)'], [0, 'rgba(80,175,255,.95)']]) {
    ctx.fillStyle = col; ctx.beginPath();
    for (const d of blob.drops) { const r = d.r * press + grow; ctx.moveTo(d.x + r, d.y); ctx.arc(d.x, d.y, r, 0, 7); }
    for (const b of blob.bits) { const r = b.r * Math.min(1, b.t / 12) + grow * .6; ctx.moveTo(b.x + r, b.y); ctx.arc(b.x, b.y, r, 0, 7); }
    ctx.fill();
  }
  // 光のつや
  const h = blob.drops[0];
  ctx.fillStyle = 'rgba(210,240,255,.9)'; ctx.beginPath(); ctx.arc(h.x - 2.4, h.y - 2.6, 2.2 * press, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(Math.round(h.x - 3.4), Math.round(h.y - 3.8), 1.5, 1.5);
  ctx.restore();
}
function drawToasts() {
  toasts = toasts.filter(t => --t.t > 0);
  toasts.slice(0, 3).forEach((t, i) => {
    const a = Math.min(1, t.t / 30), y = 44 + i * 26;
    ctx.globalAlpha = a; ctx.fillStyle = '#000c'; ctx.fillRect(W / 2 - 170, y - 16, 340, 22);
    ctx.strokeStyle = '#ffd860'; ctx.strokeRect(W / 2 - 170 + .5, y - 16 + .5, 339, 21);
    text(t.text, W / 2, y, 12, '#ffd860', 'center'); ctx.globalAlpha = 1;
  });
}

// ---------------- メインループ ----------------
function update() {
  frame++;
  if (state === 'title') {
    if (pressed.Click || pressed.Enter || pressed.Space || pressed.Jump) {
      state = 'select'; sfx('select');
      if (touchMode) try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { }
    }
    return;
  }
  if (pressed.KeyM) toggleBgm();
  if (state === 'badges') {
    if (pressed.ArrowLeft || pressed.KeyA) badgePage = Math.max(0, badgePage - 1);
    if (pressed.ArrowRight || pressed.KeyD) badgePage = Math.min(badgePages() - 1, badgePage + 1);
    let onBtn = false;
    if (pressed.Click) for (const b of PAGE_BTNS()) if (mouse.cx > b.x && mouse.cx < b.x + b.w && mouse.cy > b.y && mouse.cy < b.y + b.h) { onBtn = true; badgePage = Math.max(0, Math.min(badgePages() - 1, badgePage + b.d)); sfx('select'); }
    if (pressed.Escape || (pressed.Click && !onBtn) || pressed.Enter || pressed.KeyB || pressed.Jump) { state = 'select'; sfx('select'); }
    return;
  }
  if (state === 'select') {
    if (pressed.Escape) { state = 'title'; return; }
    const bb = BADGE_BTN;
    if (pressed.ArrowLeft || pressed.KeyA) selectPage = Math.max(0, selectPage - 1);
    if (pressed.ArrowRight || pressed.KeyD) selectPage = Math.min(pageCount() - 1, selectPage + 1);
    if (pressed.Click) for (const b of PAGE_BTNS()) if (mouse.cx > b.x && mouse.cx < b.x + b.w && mouse.cy > b.y && mouse.cy < b.y + b.h) { selectPage = Math.max(0, Math.min(pageCount() - 1, selectPage + b.d)); sfx('select'); }
    if (pressed.KeyB || (pressed.Click && mouse.cx > bb.x && mouse.cx < bb.x + bb.w && mouse.cy > bb.y && mouse.cy < bb.y + bb.h)) { state = 'badges'; sfx('select'); return; }
    const tb = TUTO_BTN;
    if (pressed.KeyT || (pressed.Click && mouse.cx > tb.x && mouse.cx < tb.x + tb.w && mouse.cy > tb.y && mouse.cy < tb.y + tb.h)) { sfx('select'); loadLevel(tutorialIndex()); return; }
    if (pressed.Click) {
      const b = selectButtons().find(b => mouse.cx > b.x && mouse.cx < b.x + b.w && mouse.cy > b.y && mouse.cy < b.y + b.h);
      if (b) { sfx('select'); loadLevel(b.i); }
    }
    return;
  }
  if (state === 'pause') { updatePause(); return; }
  if (state === 'play' && (pressed.Escape || pressed.KeyP)) { openPause(); return; }
  if (pressed.Escape) { state = 'select'; held = []; return; }
  if (pressed.KeyR) loadLevel(levelIndex, false);
  if (state === 'clear') {
    simStep();
    const btns = clearButtons();
    if (clearChoice >= btns.length) clearChoice = 0;
    if (++stateTimer > 20) {
      // キー・パッドでえらぶ
      const l = keys.ArrowLeft || keys.KeyA || touch.left, r = keys.ArrowRight || keys.KeyD || touch.right;
      if (l && !clearNav.l) clearChoice = (clearChoice + btns.length - 1) % btns.length;
      if (r && !clearNav.r) clearChoice = (clearChoice + 1) % btns.length;
      clearNav.l = l; clearNav.r = r;
      // マウスをのせたボタンをえらぶ
      if (!touchMode) btns.forEach((b, i) => { if (mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h) clearChoice = i; });
      let pick = -1;
      if (pressed.Click) pick = btns.findIndex(b => mouse.cx > b.x && mouse.cx < b.x + b.w && mouse.cy > b.y && mouse.cy < b.y + b.h);
      if (pressed.Enter || pressed.Space || pressed.Jump) pick = clearChoice;
      if (pick >= 0) btns[pick].act();
    }
    return;
  }
  run.frames++;
  updatePlayer();
  updateParticles();
  simStep();
  updateCrates();
  updateEnemies();
  updateGimmicks();
  fx = fx.filter(f => { f.x += f.vx; f.y += f.vy; f.vy += .03; return --f.life > 0; });
}
function fit() {
  const portrait = innerHeight > innerWidth;
  document.body.classList.toggle('portrait', portrait);
  // タッチ操作のときは左右にボタン用の余白を空ける
  const side = touchMode ? Math.min(150, innerWidth * .17) : 0;
  const s = Math.min((innerWidth - side * 2) / W, innerHeight / H);
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  document.body.style.setProperty('--pad', Math.max(96, Math.min(150, side * .95, innerHeight * .42)) + 'px');
}
addEventListener('resize', fit);
if (matchMedia && matchMedia('(pointer: coarse)').matches) setTouchMode(true);
fit();
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { if (!testMode) { update(); for (const k in pressed) delete pressed[k]; } acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
