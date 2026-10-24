'use strict';
// ===== デバッグ機能：URLに ?debug=1 を付けると使える =====
// 画面の左上あたりの「DBG」ボタンでパネルを開閉。ふだんは何も表示されない。
const DEBUG = { on: /[?&]debug=1/.test(location.search), open: false, fps: true, ema: 16, frames: 0 };

function dbgSave() { saveSave(); }
function dbgItems() {
  const sv = APP.save, B = APP.b, inBattle = APP.screen === 'battle' && G && !G.over, items = [];
  const add = (label, fn, style) => items.push({ label, fn, style });
  add('ジェム +1000', () => { sv.gems += 1000; dbgSave(); toast('ジェム +1000'); });
  add('全キャラ解放 + かけら+30', () => { for (const u of UNIT_LIST) { sv.owned[u.key] = true; sv.pieces[u.key] = (sv.pieces[u.key] || 0) + 30; } dbgSave(); toast('全キャラ解放'); });
  add('全キャラ Lv20', () => { for (const u of UNIT_LIST) { sv.owned[u.key] = true; sv.lvl[u.key] = MAX_LV; } dbgSave(); toast('全キャラ Lv20'); });
  add('全キャラ Lv1に戻す', () => { sv.lvl = {}; dbgSave(); toast('Lv1に戻した'); });
  add('全ステージ解放（★3）', () => { sv.stars = STAGES.map(() => 3); dbgSave(); toast('全ステージ★3'); });
  add('全難易度を解放', () => { sv.diffClear = STAGES.map(() => DIFFS.length - 1); dbgSave(); toast('全難易度を解放'); });
  const fc = GACHA_FORCE ? (GACHA_FORCE.tier ? TIER_NAME[GACHA_FORCE.tier] : '') + (GACHA_FORCE.direct ? 'キャラ' : '') : 'なし';
  add('次のガチャ：エピック確定', () => { GACHA_FORCE = { tier: 'E', direct: false }; toast('次の1回は エピック'); });
  add('次のガチャ：レジェンド確定', () => { GACHA_FORCE = { tier: 'L', direct: false }; toast('次の1回は レジェンド'); });
  add('次のガチャ：ミシック確定', () => { GACHA_FORCE = { tier: 'U', direct: false }; toast('次の1回は ミシック'); });
  add('次のガチャ：キャラそのもの確定', () => { GACHA_FORCE = { tier: null, direct: true }; toast('次の1回は キャラそのもの'); });
  add('次のガチャ確定を解除（いま：' + fc + '）', () => { GACHA_FORCE = null; toast('確定を解除'); });
  add('直近のエラーを見る', () => { let s = ERRS.last; try { s = s || localStorage.getItem('mamori-lasterr'); } catch (e) { } const d = document.getElementById('err'); d.style.display = 'block'; d.textContent = s || '（エラーなし）'; });
  add('セーブを初期化', () => { APP.save = normalizeSave({}); saveSave(); toast('セーブを初期化した'); }, 'danger');
  add('FPS表示：' + (DEBUG.fps ? 'ON' : 'OFF'), () => { DEBUG.fps = !DEBUG.fps; });
  if (inBattle) {
    add('ゴールド +1000', () => { G.gold += 1000; });
    add('ライフ全回復', () => { G.life = START_LIFE; });
    add('無敵：' + (G.god ? 'ON' : 'OFF'), () => { G.god = !G.god; });
    add('次のウェーブを今すぐ', () => { if (G.phase === 'prep') skipPrep(); else toast('戦闘中です'); });
    add('敵を全滅させる', () => { for (const e of G.enemies.slice()) killEnemy(e, null); G.enemies = G.enemies.filter(e => !e.dead); });
    add('ウェーブ +5 へ飛ぶ', () => { G.enemies.length = 0; G.spawnQ = []; G.spawnI = 0; G.wave = Math.min(G.endless ? 999 : MAX_WAVE - 1, G.wave + 5); G.phase = 'prep'; G.prepT = 1; });
    add('速度 ×6：' + (B.speed === 6 ? 'ON' : 'OFF'), () => { B.speed = B.speed === 6 ? 1 : 6; });
    add('全キャラを★7で配置', () => { for (const u of UNIT_LIST) { const sp = findSpot(3, 40); if (!sp || G.units.length >= MAX_UNITS + 40) continue; const g = makeUnit(u.key, 7, sp.x, sp.y, u.cost); G.units.push(g); } });
    add('選択中を ★+1', () => { const u = B.sel; if (u && G.units.includes(u) && u.star < MAX_STAR && u.key !== 'egg') { u.star++; FX.pillar(u.x, u.y, '#ffe27a', u.star); } else toast('合成できるキャラを選んでね'); });
    add('上限を無視して置ける：' + (G.noCap ? 'ON' : 'OFF'), () => { G.noCap = !G.noCap; });
    add('ステージクリアにする', () => { G.wave = G.endless ? G.wave : MAX_WAVE; G.over = 'win'; }, 'good');
    add('ゲームオーバーにする', () => { G.life = 0; G.over = 'lose'; }, 'danger');
  }
  return items;
}
function drawDebug(c, dt) {
  if (!DEBUG.on) return;
  const L = APP.L; DEBUG.frames++; DEBUG.ema = DEBUG.ema * .95 + dt * 1000 * .05;
  button('dbg_toggle', 4, 58, 46, 22, DEBUG.open ? '閉じる' : 'DBG', { style: DEBUG.open ? 'danger' : 'good', size: 11, r: 6 }, () => { DEBUG.open = !DEBUG.open; });
  if (DEBUG.fps) {
    const g = typeof G !== 'undefined' && G && APP.screen === 'battle' ? ` U${G.units.length} E${G.enemies.length} W${G.wave}` : '';
    txt(c, `${Math.round(1000 / DEBUG.ema)}fps${g}`, 54, 74, 12, '#9affc0', 'left', { lw: 3 });
  }
  if (!DEBUG.open) return;
  const items = dbgItems(), cols = 2, bw = L.portrait ? 236 : 200, bh = 34, gap = 6, rows = Math.ceil(items.length / cols);
  const pw = cols * bw + (cols + 1) * gap, ph = rows * (bh + gap) + gap + 30, px = (L.W - pw) / 2, py = Math.max(86, (L.H - ph) / 2);
  panelBox(c, px, py, pw, ph, { r: 12, fill: 'rgba(10,8,30,.92)', stroke: '#6affc0' });
  button('dbg_block', px, py, pw, ph, '', { style: 'ghost', transparent: true }, null);
  txt(c, 'デバッグ (?debug=1)', px + 12, py + 21, 14, '#9affc0', 'left');
  items.forEach((it, i) => button('dbg_' + i, px + gap + (i % cols) * (bw + gap), py + 30 + gap + Math.floor(i / cols) * (bh + gap), bw, bh, it.label, { style: it.style || 'ghost', size: 12 }, () => { try { it.fn(); } catch (e) { toast('エラー：' + e.message); console.error(e); } }));
}
