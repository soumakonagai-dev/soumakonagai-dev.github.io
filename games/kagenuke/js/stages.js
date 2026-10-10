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
// ---- 部品 ----
const ledgeW = () => box(1300, 540, 60, 600, 160, 40);                  // 高台（x 1000〜1600、上面 y=460）
const ledgeN = () => box(1450, 540, 60, 300, 160, 40);                  // せまい高台（x 1300〜1600）
const crate = (x) => box(x, 560, 60, 80, 80, 50, { push: true });       // 押せる箱
const stopper = (x) => box(x, 560, 60, 40, 80, 40);                     // 箱のストッパー
const board = () => box(600, 470, 120, 300, 36, 30, { solid: false });  // つるされた板
const BLINK = (on, off) => ({ x: 830, y: 410, z: 260, blink: { on, off }, noSpawn: true });
const SWAY = (ay, period) => ({ x: 830, y: 410, z: 260, sway: { ay, period }, noSpawn: true });
const lamp = (x, y, z, minx, maxx, miny, maxy, minz, maxz) => ({ x, y, z, min: [minx, miny == null ? 100 : miny, minz == null ? 190 : minz], max: [maxx, maxy == null ? 800 : maxy, maxz == null ? 700 : maxz] });
const EXIT_F = { x: 1490, y: 500, w: 60, h: 100 };
const EXIT_L = { x: 1500, y: 360, w: 60, h: 100 };


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
  },

  // ================= 第6章 温室（三つの影） =================
  {
    id: '6-1', name: 'みっつの かげ',
    hint: 'あかりが三つ。左・まん中・右のあかりから、それぞれ影を出して、三つのスイッチを同時に押そう。',
    bodyZ: 150, kages: 3,
    start: [800, 600], exit: EXIT_F,
    ink: [{ x: 150, y: 700, w: 230, h: 110 }, { x: 690, y: 700, w: 230, h: 110 }, { x: 1100, y: 700, w: 230, h: 110 }],
    switches: [{ x: 265, y: 810, by: 'kage' }, { x: 805, y: 810, by: 'kage' }, { x: 1215, y: 810, by: 'kage' }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0, 1, 2] }],
    lights: [lamp(300, 500, 400, 0, 533), lamp(800, 500, 400, 533, 1067), lamp(1300, 500, 400, 1067, 1600)],
    objects: [floor(0, 1600)]
  },
  {
    id: '6-2', name: 'みっつの はし',
    hint: '二つの橋と、とびら。三つの影が、それぞれスイッチを押しつづけるあいだに、実体がわたる。',
    bodyZ: 150, kages: 3,
    start: [400, 600], exit: EXIT_F,
    ink: [{ x: 340, y: 700, w: 220, h: 110 }, { x: 590, y: 700, w: 220, h: 110 }, { x: 840, y: 700, w: 220, h: 110 }],
    switches: [{ x: 450, y: 810, by: 'kage' }, { x: 700, y: 810, by: 'kage' }, { x: 950, y: 810, by: 'kage' }],
    doors: [
      { x: 600, y: 600, w: 120, h: 14, needs: [0], invert: true },
      { x: 1000, y: 600, w: 120, h: 14, needs: [1], invert: true },
      { x: 1400, y: 420, w: 16, h: 180, needs: [2] }
    ],
    lights: [lamp(100, 500, 300, 0, 400), lamp(150, 500, 300, 0, 400), lamp(200, 500, 300, 0, 400)],
    objects: [floor(0, 600), floor(720, 1000), floor(1120, 1600)]
  },
  {
    id: '6-3', name: 'しろい はな',
    hint: '橋をかける影、まばたきの板をわたる影、そして左下のへやの影。三人ぶんの影を、うまくつかおう。',
    bodyZ: 150, kages: 3,
    start: [500, 600], exit: EXIT_F,
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }, { x: 120, y: 690, w: 220, h: 120 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 250, y: 572, by: 'kage', latch: true }, { x: 230, y: 810, by: 'kage' }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1440, y: 420, w: 16, h: 180, needs: [1, 2] }
    ],
    lights: [lamp(300, 500, 400, 0, 800, 100, 800, 190, 600), BLINK(3.5, 2.5), lamp(1100, 500, 400, 800, 1600, 100, 800, 190, 600), lamp(1300, 500, 400, 800, 1600, 100, 800, 190, 600)],
    objects: [floor(0, 700), floor(900, 1600), board()]
  },

  // ================= 第7章 図書館（はこと高さ） =================
  {
    id: '7-1', name: 'ふたつの たかさ',
    hint: '低いへやと、高いへや。はこで高台にのぼる前と あとで、影を一人ずつ出して、とびらを開けつづけよう。',
    bodyZ: 150, kages: 2,
    start: [400, 600], exit: EXIT_L,
    ink: [{ x: 700, y: 700, w: 240, h: 110 }, { x: 1100, y: 230, w: 240, h: 110 }],
    switches: [{ x: 820, y: 810, by: 'kage' }, { x: 1220, y: 340, by: 'kage' }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0, 1] }],
    lights: [lamp(1000, 500, 400, 0, 1600), lamp(1000, 600, 400, 600, 1600, 450, 800, 190, 600)],
    objects: [floor(0, 1600), ledgeW(), crate(600)]
  },
  {
    id: '7-2', name: 'おもしと のぼり',
    hint: 'はこは二つ。ひとつは床のスイッチの おもしに、もうひとつは 高台への足場に。そして影を高いへやへ。',
    bodyZ: 150, kages: 1,
    start: [250, 600], exit: EXIT_L,
    ink: [{ x: 1100, y: 230, w: 240, h: 110 }],
    switches: [{ x: 640, y: 600, by: 'crate', w: 70 }, { x: 1220, y: 340, by: 'kage' }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0, 1] }],
    lights: [lamp(1000, 600, 400, 600, 1600, 450, 800, 190, 600)],
    objects: [floor(0, 1600), ledgeW(), crate(420), stopper(700), crate(900)]
  },
  {
    id: '7-3', name: 'ゆれる ほんだな',
    hint: '右のあかりは ゆれる。板の影のエレベーターで、影を高いへやへ。はこは、床のスイッチのおもしに。',
    bodyZ: 150, kages: 1,
    start: [450, 600], exit: EXIT_F,
    ink: [{ x: 40, y: 290, w: 220, h: 111 }],
    switches: [{ x: 960, y: 600, by: 'crate', w: 70 }, { x: 150, y: 401, by: 'kage' }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0, 1] }],
    lights: [lamp(1100, 500, 400, 500, 1600, 100, 800, 190, 500), SWAY(200, 6)],
    objects: [floor(0, 1600), crate(650), stopper(1020), board()]
  },

  // ================= 第8章 劇場（はやい まばたき） =================
  {
    id: '8-1', name: 'はやい まばたき',
    hint: 'あかりの まばたきが、前よりずっと はやい。つくと同時に影を出して、いっきに スイッチまで。',
    bodyZ: 150, kages: 1,
    start: [1000, 600], exit: { x: 1480, y: 500, w: 60, h: 100 },
    ink: [],
    switches: [{ x: 250, y: 572, by: 'kage', latch: true }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [lamp(1100, 500, 400, 500, 1600, 100, 800, 190, 500), BLINK(2.4, 2.0)],
    objects: [floor(0, 1600), board()]
  },
  {
    id: '8-2', name: 'ぶたいそで',
    hint: '橋の影を右下に残したまま、もう一人の影で、はやい まばたきの板をわたろう。',
    bodyZ: 150, kages: 2,
    start: [500, 600], exit: EXIT_F,
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 250, y: 572, by: 'kage', latch: true }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1440, y: 420, w: 16, h: 180, needs: [1] }
    ],
    lights: [lamp(300, 500, 400, 0, 800, 100, 800, 190, 600), BLINK(2.4, 2.0), lamp(1100, 500, 400, 800, 1600, 100, 800, 190, 600)],
    objects: [floor(0, 700), floor(900, 1600), board()]
  },
  {
    id: '8-3', name: 'カーテンコール',
    hint: 'はやい まばたきの板、床のおもし、そして高台。ぜんぶ ととのえて、幕をあけよう。',
    bodyZ: 150, kages: 1,
    start: [250, 600], exit: EXIT_L,
    ink: [],
    switches: [{ x: 640, y: 600, by: 'crate', w: 70 }, { x: 250, y: 572, by: 'kage', latch: true }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0, 1] }],
    lights: [lamp(1100, 500, 400, 500, 1600, 100, 800, 190, 500), BLINK(2.4, 2.0)],
    objects: [floor(0, 1600), ledgeW(), crate(420), stopper(700), crate(900), board()]
  },

  // ================= 第9章 水族館（はげしい ゆれ） =================
  {
    id: '9-1', name: 'ゆれる すいそう',
    hint: 'あかりの ゆれが、大きく はやくなった。板の影が いちばん上に来る しゅんかんまで、影を はこばせよう。',
    bodyZ: 150, kages: 1,
    start: [1000, 600], exit: { x: 1480, y: 500, w: 60, h: 100 },
    ink: [{ x: 40, y: 256, w: 220, h: 111 }],
    switches: [{ x: 150, y: 367, by: 'kage' }],
    doors: [{ x: 1380, y: 420, w: 16, h: 180, needs: [0] }],
    lights: [lamp(1100, 500, 400, 500, 1600, 100, 800, 190, 500), SWAY(240, 4)],
    objects: [floor(0, 1600), board()]
  },
  {
    id: '9-2', name: 'なみの はし',
    hint: '橋の影を右下に残して、もう一人の影は ゆれる板のエレベーターで 高いへやへ。',
    bodyZ: 150, kages: 2,
    start: [550, 600], exit: EXIT_F,
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }, { x: 40, y: 256, w: 220, h: 111 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 150, y: 367, by: 'kage', latch: true }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1440, y: 420, w: 16, h: 180, needs: [1] }
    ],
    lights: [lamp(300, 500, 400, 0, 800, 100, 800, 190, 600), SWAY(240, 4), lamp(1100, 500, 400, 800, 1600, 100, 800, 190, 600)],
    objects: [floor(0, 700), floor(900, 1600), board()]
  },
  {
    id: '9-3', name: 'おおきな さかな',
    hint: 'ゆれる板のエレベーターと、はこのおもし、そして高台。順番をまちがえないように。',
    bodyZ: 150, kages: 1,
    start: [250, 600], exit: EXIT_L,
    ink: [{ x: 40, y: 256, w: 220, h: 111 }],
    switches: [{ x: 640, y: 600, by: 'crate', w: 70 }, { x: 150, y: 367, by: 'kage' }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0, 1] }],
    lights: [lamp(1100, 500, 400, 500, 1600, 100, 800, 190, 500), SWAY(240, 4)],
    objects: [floor(0, 1600), ledgeW(), crate(420), stopper(700), crate(900), board()]
  },

  // ================= 第10章 月の屋上（さいごの夜） =================
  {
    id: '10-1', name: 'つきあかり',
    hint: 'ゆれる月あかり。はこで高台へのぼり、影が高いへやに かさなる しゅんかんを ねらおう。',
    bodyZ: 150, kages: 1,
    start: [250, 600], exit: EXIT_L,
    ink: [{ x: 1100, y: 230, w: 240, h: 110 }],
    switches: [{ x: 640, y: 600, by: 'crate', w: 70 }, { x: 1220, y: 340, by: 'kage' }],
    doors: [{ x: 1420, y: 280, w: 16, h: 180, needs: [0, 1] }],
    lights: [Object.assign(lamp(1000, 600, 400, 600, 1600, 450, 800, 190, 600), { sway: { ax: 250, period: 5 } })],
    objects: [floor(0, 1600), ledgeW(), crate(420), stopper(700), crate(900)]
  },
  {
    id: '10-2', name: 'ほしの はし',
    hint: '橋の影、まばたきの板の影、左下のへやの影。そして はこで高台へ。三つの影を ぬけだそう。',
    bodyZ: 150, kages: 3,
    start: [500, 600], exit: EXIT_L,
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }, { x: 120, y: 690, w: 220, h: 120 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 250, y: 572, by: 'kage', latch: true }, { x: 230, y: 810, by: 'kage' }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1400, y: 360, w: 16, h: 100, needs: [1, 2] }
    ],
    lights: [lamp(300, 500, 400, 0, 800, 100, 800, 190, 600), BLINK(2.4, 2.0), lamp(1100, 500, 400, 800, 1600, 100, 800, 190, 600), lamp(1300, 500, 400, 800, 1600, 100, 800, 190, 600)],
    objects: [floor(0, 700), floor(900, 1600), ledgeN(), crate(1100), board()]
  },
  {
    id: '10-3', name: 'さいごの よる',
    hint: 'これが さいごの夜。橋、まばたき、はこ、高台、そして高いへや。すべての影を つかって、ぬけだそう。',
    bodyZ: 150, kages: 3,
    start: [500, 600], exit: { x: 1540, y: 360, w: 50, h: 100 },
    ink: [{ x: 1050, y: 690, w: 220, h: 120 }, { x: 1360, y: 230, w: 220, h: 110 }],
    switches: [{ x: 1160, y: 810, by: 'kage' }, { x: 250, y: 572, by: 'kage', latch: true }, { x: 1470, y: 340, by: 'kage' }],
    doors: [
      { x: 700, y: 600, w: 200, h: 14, needs: [0], invert: true },
      { x: 1500, y: 360, w: 16, h: 100, needs: [1, 2] }
    ],
    lights: [lamp(300, 500, 400, 0, 800, 100, 800, 190, 600), BLINK(2.4, 2.0), lamp(1100, 500, 400, 800, 1600, 100, 800, 190, 600), lamp(1400, 600, 400, 1000, 1600, 450, 800, 190, 600)],
    objects: [floor(0, 700), floor(900, 1600), ledgeN(), crate(1100), board()]
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = STAGES;
else root.KG_STAGES = STAGES;
})(typeof window !== 'undefined' ? window : globalThis);
