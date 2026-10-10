// カゲヌケ ステージデータ
// 座標は壁（1600x900）基準。z は壁からの距離（光源は物体より手前=大きいz）
//  objects … 現実の箱や床。実体はその上を歩き、壁に影を落とす（cast:false で影なし）
//  ink     … 壁にしみついた「影のへや」。影のキャラだけが入れる
//  switches… by:'kage'（影が押す）/'body'（実体が押す）, latch:true で押しっぱなし不要
//  doors   … 実体の通せんぼ。invert:true は「開くと橋になる」
(function (root) {
'use strict';

const box = (x, y, z, w, h, d, extra) =>
  Object.assign({ x, y, z, parts: [{ w, h, d }] }, extra || {});
const floor = (x0, x1) => box((x0 + x1) / 2, 620, 60, x1 - x0, 40, 40, { cast: false });

const LIGHT = { min: [0, 100, 190], max: [1600, 800, 700] };

const STAGES = [
  {
    id: '1-1', name: 'かげを とばす',
    hint: '自分の影は、光を動かすとどこへでも動く。影を右下のへやに落として C で切りはなし、スイッチを押そう。',
    bodyZ: 150, kages: 1,
    start: [800, 600], exit: { x: 1440, y: 500, w: 60, h: 100 },
    ink: [{ x: 1050, y: 700, w: 240, h: 110 }],
    switches: [{ x: 1170, y: 810, by: 'kage' }],
    doors: [{ x: 1320, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [Object.assign({ x: 800, y: 500, z: 500 }, LIGHT)],
    objects: [floor(0, 1600)]
  },
  {
    id: '1-2', name: 'かげの橋',
    hint: '床がとぎれている。左下のへやのスイッチを影に押させると、橋がかかる。押している間だけ！',
    bodyZ: 150, kages: 1,
    start: [550, 600], exit: { x: 1440, y: 500, w: 60, h: 100 },
    ink: [{ x: 300, y: 700, w: 240, h: 110 }],
    switches: [{ x: 420, y: 810, by: 'kage' }],
    doors: [{ x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true }],
    lights: [Object.assign({ x: 550, y: 500, z: 500 }, LIGHT)],
    objects: [floor(0, 700), floor(900, 1600)]
  },
  {
    id: '1-3', name: 'ふたつのスイッチ',
    hint: '二つのスイッチは、一度押せば入ったまま。影を二回つくろう。X で影を消せる。',
    bodyZ: 150, kages: 1,
    start: [700, 600], exit: { x: 1440, y: 500, w: 60, h: 100 },
    ink: [{ x: 250, y: 680, w: 240, h: 110 }, { x: 1000, y: 720, w: 240, h: 110 }],
    switches: [
      { x: 370, y: 790, by: 'kage', latch: true },
      { x: 1120, y: 830, by: 'kage', latch: true }
    ],
    doors: [{ x: 1300, y: 420, w: 16, h: 180, needs: [0, 1] }],
    lights: [Object.assign({ x: 700, y: 500, z: 500 }, LIGHT)],
    objects: [floor(0, 1600)]
  },
  {
    id: '1-4', name: 'かげの みち',
    hint: '左のへやは遠すぎて、影をとばしても届かない。つるされた板の影を「みち」にして、影を歩かせよう。',
    bodyZ: 150, kages: 1,
    start: [850, 600], exit: { x: 1440, y: 500, w: 60, h: 100 },
    ink: [{ x: 60, y: 450, w: 220, h: 130 }],
    switches: [{ x: 170, y: 580, by: 'kage' }],
    doors: [{ x: 1320, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [{ x: 900, y: 450, z: 400, min: [500, 100, 190], max: [1500, 800, 600] }],
    objects: [floor(0, 1600), box(560, 460, 60, 520, 36, 30, { solid: false })]
  },

  // ================= 第2章 屋根裏 =================
  {
    id: '2-1', name: 'ふたつのあかり',
    hint: 'あかりが二つ。Tab で、動かすあかりを選ぶ。左のあかりは左半分、右のあかりは右半分しか動かせない。影を二つ出して、両方のスイッチを同時に押そう。',
    bodyZ: 150, kages: 2,
    start: [800, 600], exit: { x: 1490, y: 500, w: 60, h: 100 },
    ink: [{ x: 200, y: 690, w: 220, h: 120 }, { x: 1180, y: 690, w: 220, h: 120 }],
    switches: [{ x: 310, y: 810, by: 'kage' }, { x: 1290, y: 810, by: 'kage' }],
    doors: [{ x: 1440, y: 420, w: 16, h: 180, needs: [0, 1] }],
    lights: [
      { x: 400, y: 500, z: 400, min: [0, 100, 190], max: [800, 800, 600] },
      { x: 1200, y: 500, z: 400, min: [800, 100, 190], max: [1600, 800, 600] }
    ],
    objects: [floor(0, 1600)]
  },
  {
    id: '2-2', name: 'まばたきの ひかり',
    hint: '右の光は、ついたり消えたりする。ついている間だけ、板の影ができる。いそいで影を歩かせて、スイッチを押そう（押せばそのまま）。',
    bodyZ: 150, kages: 1,
    start: [1000, 600], exit: { x: 1490, y: 500, w: 60, h: 100 },
    ink: [],
    switches: [{ x: 250, y: 572, by: 'kage', latch: true }],
    doors: [{ x: 1440, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [
      { x: 1100, y: 500, z: 400, min: [500, 100, 190], max: [1600, 800, 500] },
      { x: 830, y: 410, z: 260, blink: { on: 3.5, off: 2.5 }, noSpawn: true }
    ],
    objects: [floor(0, 1600), box(600, 470, 120, 300, 36, 30, { solid: false })]
  },
  {
    id: '2-3', name: 'ふたりで わたる',
    hint: '橋をかけ続ける影と、とびらを開け続ける影。ひとつのあかりからは、影は一人だけ。左右のあかりを使い分けよう。',
    bodyZ: 150, kages: 2,
    start: [550, 600], exit: { x: 1490, y: 500, w: 60, h: 100 },
    ink: [{ x: 120, y: 690, w: 220, h: 120 }, { x: 1100, y: 690, w: 220, h: 120 }],
    switches: [{ x: 1210, y: 810, by: 'kage' }, { x: 230, y: 810, by: 'kage' }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1440, y: 420, w: 16, h: 180, needs: [1] }
    ],
    lights: [
      { x: 300, y: 500, z: 400, min: [0, 100, 190], max: [800, 800, 600] },
      { x: 1200, y: 500, z: 400, min: [800, 100, 190], max: [1600, 800, 600] }
    ],
    objects: [floor(0, 700), floor(900, 1600)]
  },
  {
    id: '2-4', name: 'やねうらの であい',
    hint: '右の光で橋の影をつくり、そのまま。左の光で、まばたきの板の影にスイッチを押しに行かせよう。実体は、橋をわたる。',
    bodyZ: 150, kages: 2,
    start: [500, 600], exit: { x: 1490, y: 500, w: 60, h: 100 },
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 250, y: 572, by: 'kage', latch: true }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1440, y: 420, w: 16, h: 180, needs: [1] }
    ],
    lights: [
      { x: 300, y: 500, z: 400, min: [0, 100, 190], max: [800, 800, 600] },
      { x: 1100, y: 500, z: 400, min: [800, 100, 190], max: [1600, 800, 600] },
      { x: 830, y: 410, z: 260, blink: { on: 3.5, off: 2.5 }, noSpawn: true }
    ],
    objects: [floor(0, 700), floor(900, 1600), box(600, 470, 120, 300, 36, 30, { solid: false })]
  },

  // ================= 第3章 地下室（ゆれる光） =================
  {
    id: '3-1', name: 'ゆれる あかり',
    hint: 'あかりが ゆれている。影が右下のへやに かさなる しゅんかんに C を おそう。光を止めている間は、ゆれも止まる。',
    bodyZ: 150, kages: 1,
    start: [800, 600], exit: { x: 1440, y: 500, w: 60, h: 100 },
    ink: [{ x: 1050, y: 700, w: 240, h: 110 }],
    switches: [{ x: 1170, y: 810, by: 'kage' }],
    doors: [{ x: 1320, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [{ x: 800, y: 500, z: 400, min: [0, 100, 190], max: [1600, 800, 700], sway: { ax: 300, period: 5 } }],
    objects: [floor(0, 1600)]
  },
  {
    id: '3-2', name: 'ゆれる エレベーター',
    hint: '右のあかりは ゆれる。板の影が上下に動くので、影を のせて、高いへやまで はこんでもらおう。',
    bodyZ: 150, kages: 1,
    start: [1000, 600], exit: { x: 1480, y: 500, w: 60, h: 100 },
    ink: [{ x: 40, y: 290, w: 220, h: 111 }],
    switches: [{ x: 150, y: 401, by: 'kage' }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [
      { x: 1100, y: 500, z: 400, min: [500, 100, 190], max: [1600, 800, 500] },
      { x: 830, y: 410, z: 260, sway: { ay: 200, period: 6 }, noSpawn: true }
    ],
    objects: [floor(0, 1600), box(600, 470, 120, 300, 36, 30, { solid: false })]
  },
  {
    id: '3-3', name: 'ふたつの ゆれ',
    hint: '橋の影を右下のへやに残し、もう一人の影はエレベーターで高いへやへ。とびらは、高いへやのスイッチで開く。',
    bodyZ: 150, kages: 2,
    start: [550, 600], exit: { x: 1490, y: 500, w: 60, h: 100 },
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }, { x: 40, y: 290, w: 220, h: 111 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 150, y: 401, by: 'kage', latch: true }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1440, y: 420, w: 16, h: 180, needs: [1] }
    ],
    lights: [
      { x: 300, y: 500, z: 400, min: [0, 100, 190], max: [800, 800, 600] },
      { x: 830, y: 410, z: 260, sway: { ay: 200, period: 6 }, noSpawn: true },
      { x: 1100, y: 500, z: 400, min: [800, 100, 190], max: [1600, 800, 600] }
    ],
    objects: [floor(0, 700), floor(900, 1600), box(600, 470, 120, 300, 36, 30, { solid: false })]
  },

  // ================= 第4章 倉庫（押せる箱） =================
  {
    id: '4-1', name: 'はこを おす',
    hint: '←→で はこを おせる。はこを足場にして、高いところの出口へ。（引くことはできない）',
    bodyZ: 150, kages: 0,
    start: [150, 600], exit: { x: 1480, y: 360, w: 60, h: 100 },
    ink: [],
    lights: [{ x: 800, y: 250, z: 300, noSpawn: true }],
    objects: [floor(0, 1600), box(1300, 540, 60, 600, 160, 40), box(500, 560, 60, 80, 80, 50, { push: true })]
  },
  {
    id: '4-2', name: 'たかい ところの かげ',
    hint: '高い所に立つと、影も高い所に落ちる。はこで高台にのぼってから、光を動かして 高いへやに影をとばそう。',
    bodyZ: 150, kages: 1,
    start: [150, 600], exit: { x: 1500, y: 360, w: 60, h: 100 },
    ink: [{ x: 1100, y: 230, w: 240, h: 110 }],
    switches: [{ x: 1220, y: 340, by: 'kage' }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0] }],
    lights: [{ x: 1000, y: 600, z: 400, min: [600, 450, 190], max: [1600, 800, 600] }],
    objects: [floor(0, 1600), box(1300, 540, 60, 600, 160, 40), box(500, 560, 60, 80, 80, 50, { push: true })]
  },
  {
    id: '4-3', name: 'はこの おもし',
    hint: '床のスイッチに はこを のせて、おもしにする。もうひとつは 影にまかせて、とびらを開けよう。',
    bodyZ: 150, kages: 1,
    start: [400, 600], exit: { x: 1480, y: 500, w: 60, h: 100 },
    ink: [{ x: 700, y: 700, w: 240, h: 110 }],
    switches: [{ x: 960, y: 600, by: 'crate', w: 70 }, { x: 820, y: 810, by: 'kage' }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0, 1] }],
    lights: [{ x: 700, y: 500, z: 400, min: [0, 100, 190], max: [1600, 800, 700] }],
    objects: [floor(0, 1600), box(600, 560, 60, 80, 80, 50, { push: true }), box(1020, 560, 60, 40, 80, 40)]
  },

  // ================= 第5章 時計塔（まわる板・ぜんぶ） =================
  {
    id: '5-1', name: 'てっぺんの ゆれ',
    hint: 'はこで高台にのぼり、ゆれるあかりで 高いへやに影をとばそう。ゆれの しゅんかんを ねらって C。',
    bodyZ: 150, kages: 1,
    start: [150, 600], exit: { x: 1500, y: 360, w: 60, h: 100 },
    ink: [{ x: 1100, y: 230, w: 240, h: 110 }],
    switches: [{ x: 1220, y: 340, by: 'kage' }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0] }],
    lights: [{ x: 1000, y: 600, z: 400, min: [600, 450, 190], max: [1600, 800, 600], sway: { ax: 250, period: 5 } }],
    objects: [floor(0, 1600), box(1300, 540, 60, 600, 160, 40), box(500, 560, 60, 80, 80, 50, { push: true })]
  },
  {
    id: '5-2', name: 'まばたきと おもし',
    hint: '床のスイッチには はこを のせる。もうひとつは、まばたきの板に影を歩かせて 押そう（押せば そのまま）。',
    bodyZ: 150, kages: 1,
    start: [450, 600], exit: { x: 1480, y: 500, w: 60, h: 100 },
    ink: [],
    switches: [{ x: 960, y: 600, by: 'crate', w: 70 }, { x: 250, y: 572, by: 'kage', latch: true }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0, 1] }],
    lights: [
      { x: 1100, y: 500, z: 400, min: [500, 100, 190], max: [1600, 800, 500] },
      { x: 830, y: 410, z: 260, blink: { on: 3.5, off: 2.5 }, noSpawn: true }
    ],
    objects: [floor(0, 1600), box(650, 560, 60, 80, 80, 50, { push: true }), box(1020, 560, 60, 40, 80, 40), box(600, 470, 120, 300, 36, 30, { solid: false })]
  },
  {
    id: '5-3', name: 'かげぬけ',
    hint: 'すべてを つかおう。橋の影と、まばたきの板の影。そして はこで 高台へ。この塔から、ぬけだそう。',
    bodyZ: 150, kages: 2,
    start: [500, 600], exit: { x: 1500, y: 360, w: 60, h: 100 },
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 250, y: 572, by: 'kage', latch: true }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1400, y: 360, w: 16, h: 100, needs: [1] }
    ],
    lights: [
      { x: 300, y: 500, z: 400, min: [0, 100, 190], max: [800, 800, 600] },
      { x: 830, y: 410, z: 260, blink: { on: 3.5, off: 2.5 }, noSpawn: true },
      { x: 1100, y: 500, z: 400, min: [800, 100, 190], max: [1600, 800, 600] }
    ],
    objects: [floor(0, 700), floor(900, 1600), box(1450, 540, 60, 300, 160, 40), box(1100, 560, 60, 80, 80, 50, { push: true }), box(600, 470, 120, 300, 36, 30, { solid: false })]
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = STAGES;
else root.KG_STAGES = STAGES;
})(typeof window !== 'undefined' ? window : globalThis);
