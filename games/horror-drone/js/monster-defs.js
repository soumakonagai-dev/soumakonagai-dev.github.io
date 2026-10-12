// 怪物の設定。1体ぶんが1つのかたまり。ここを足すと怪物が増える(見た目は rig に名前を書く)
//
//   rig         見た目の種類(rig-procedural / rig-creatures)。3Dモデルを使うときは model を書く(下の sample を見本に)
//   spawns      出現する場所 [{x, z}]
//   weakPart    弱点の部位: 'weak'(専用の弱点) か 'head'(頭)。weakAttr がその属性。weakFacing: 'normal'=弱点の向く側から狙う / 'any'
//   ai          行動の数値(下の AI_DEFAULT を参照)。exposeIn は弱点が出る時: 'act' 叫んでいる間 / 'recover' 攻撃後の隙 / 'always'
//   scare       やられたときのジャンプスケアで、顔にどこまで寄るか(m)
//   drops       倒したときの素材 [{item, n, p(確率)}]
//   dex         図鑑の文章。解析が進むと読める(body / head / weak / tell)
//
// 使い方: ?only=<id> をURLに付けると、その怪物だけを出して試せる。?hit で当たり判定の枠を表示
const AI_DEFAULT = {
  wander: 0.8, chase: 2.0, turn: 3, sense: 9, giveUp: 16,
  actEvery: [5, 8], actRange: 12, tell: 1.2, act: 1.5, recover: 1.2, actKind: null, actTilt: 0.45,
  lunge: null, melee: null, exposeIn: 'act', idleAct: false, special: null, anchored: false, hover: 0, ambushRange: 2.4,
};

const MonsterDefs = {
  nosless: {
    id: 'nosless', name: '鼻なし', kana: 'はななし', hp: 100, radius: 0.4, rig: 'nosless',
    spawns: [{ x: 4, z: -2.5 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.8, chase: 2.1, sense: 9, actEvery: [4, 7], actRange: 14, tell: 1.3, act: 1.7, recover: 1.2, actKind: 'scream',
      lunge: { speed: 5.2, dur: 0.75 }, melee: { range: 1.6, dmg: 20, cd: 1.4 }, exposeIn: 'act', idleAct: true },
    scare: { dist: 0.55 },
    drops: [{ item: 'blood', n: 1, p: 1 }, { item: 'scrap', n: 1, p: 0.4 }],
    dex: {
      intro: '大広間をうろつく、背の高い影。',
      body: '長い腕と細い脚。弱点以外への物理攻撃は、ほとんど通らない。',
      head: '鼻がない。人を口で探している。口の中が本体のようだ。',
      weak: '弱点は口の中。叫んでいる間だけ開く。',
      tell: '叫ぶ直前に、首を大きく傾ける。傾いたら口が開く合図。叫んだ後は突進してくる。',
    },
  },

  weeper: {
    id: 'weeper', name: '泣き女', kana: 'なきおんな', hp: 70, radius: 0.35, rig: 'weeper',
    spawns: [{ x: -12, z: -9.5 }],
    weakPart: 'weak', weakAttr: 'holy', weakFacing: 'normal',
    ai: { wander: 0.7, chase: 1.1, turn: 1.6, sense: 11, giveUp: 18, actEvery: [4, 6], actRange: 10, tell: 1.2, act: 1.6, recover: 1.0,
      actKind: 'wail', melee: { range: 1.2, dmg: 12, cd: 1.5 }, exposeIn: 'act', idleAct: true, hover: 0.55, actTilt: 0.2 },
    scare: { dist: 0.5 },
    drops: [{ item: 'tear', n: 1, p: 1 }, { item: 'salt', n: 1, p: 0.6 }],
    dex: {
      intro: '病棟を漂う、髪で顔をおおった白い女。',
      body: '宙に浮いて、ゆっくり近づいてくる。体に触れる攻撃は、ほとんど通らない。',
      head: '長い髪の下に、涙の跡が残る顔がある。',
      weak: '弱点は口の中。泣き叫ぶとき、髪が上がって顔があらわれる。',
      tell: '泣き叫ぶ前に、首を傾けてすすり泣く。叫び声を浴びると傷つく。',
    },
  },

  shadow: {
    id: 'shadow', name: '影の子', kana: 'かげのこ', hp: 40, radius: 0.3, rig: 'shadow',
    spawns: [{ x: -2, z: -9 }, { x: 4, z: -11.5 }],
    weakPart: 'head', weakAttr: 'light', weakFacing: 'any',
    ai: { wander: 1.0, chase: 2.3, turn: 6, sense: 11, giveUp: 20, special: 'freeze', melee: { range: 1.2, dmg: 15, cd: 1.2 }, exposeIn: 'always' },
    scare: { dist: 0.4 },
    drops: [{ item: 'shard', n: 1, p: 0.8 }],
    dex: {
      intro: '書斎の暗がりに紛れる、子どものような影。白い眼だけが光る。',
      body: 'ほとんど見えない。暗視にすると輪郭が分かる。物理攻撃はほとんど通らない。',
      head: '',
      weak: '弱点は頭。強い光を当てると苦しむ。',
      tell: '見つめている間は、動けなくなる。目を離すと近づいてくる。',
    },
  },

  spider: {
    id: 'spider', name: '這い蜘蛛', kana: 'はいぐも', hp: 60, radius: 0.5, rig: 'spider',
    spawns: [{ x: 0, z: 10.5 }],
    weakPart: 'weak', weakAttr: 'fire', weakFacing: 'normal',
    ai: { wander: 1.2, chase: 3.4, turn: 5, sense: 9, giveUp: 14, actEvery: [2.5, 4], actRange: 9, tell: 0.7, recover: 1.7,
      lunge: { speed: 8, dur: 0.55 }, melee: { range: 1.5, dmg: 18, cd: 1.0 }, exposeIn: 'recover' },
    scare: { dist: 0.45 },
    drops: [{ item: 'thread', n: 1, p: 1 }, { item: 'powder', n: 1, p: 0.4 }],
    dex: {
      intro: '地下への廊下を這いまわる、人の顔をした蜘蛛。',
      body: '八本の脚で素早く這う。腹以外には、ほとんど通らない。',
      head: '人間のような顔。牙で噛みついてくる。',
      weak: '弱点は腹の赤い袋。飛びかかった後、ひっくり返っている間だけ見える。',
      tell: '飛びかかる前に、体を低く沈める。',
    },
  },

  mimic: {
    id: 'mimic', name: 'ミミック', kana: 'みみっく', hp: 80, radius: 0.45, rig: 'mimic',
    spawns: [{ x: -10.5, z: 12.5 }, { x: 17.5, z: 2.5 }],
    weakPart: 'weak', weakAttr: 'fire', weakFacing: 'any',
    ai: { wander: 0, chase: 2.4, turn: 5, sense: 8, giveUp: 14, special: 'ambush', ambushRange: 2.4, actEvery: [2, 3.5], actRange: 5,
      tell: 0.45, recover: 2.0, lunge: { speed: 6, dur: 0.45 }, melee: { range: 1.4, dmg: 25, cd: 1.2 }, exposeIn: 'recover' },
    scare: { dist: 0.6 },
    drops: [{ item: 'bandage', n: 1, p: 1 }, { item: 'ammo', n: 1, p: 1 }, { item: 'scrap', n: 2, p: 0.7 }],
    dex: {
      intro: '戦利品の箱に化けた怪物。近づくまで、ただの箱に見える。',
      body: '箱そのもの。木でできている。弱点以外はほとんど通らない。',
      head: '蓋の裏に、黄色い目と牙が並んでいる。',
      weak: '弱点は舌。飛びかかった後、蓋を開けて舌を出している間だけ狙える。',
      tell: '飛びかかる前に、蓋がカタカタと鳴る。',
    },
  },

  hand: {
    id: 'hand', name: '水底の手', kana: 'みなそこのて', hp: 90, radius: 0.5, rig: 'hand',
    spawns: [{ x: 14, z: 10 }],
    weakPart: 'weak', weakAttr: 'elec', weakFacing: 'normal',
    ai: { wander: 0, chase: 0, turn: 1.6, sense: 5.5, giveUp: 7, anchored: true, actEvery: [2, 3], actRange: 4.6, tell: 1.0, act: 0.5, recover: 2.2,
      actKind: 'slam', slam: { range: 3.4, dmg: 30 }, exposeIn: 'recover', idleAct: true },
    scare: { dist: 0.8 },
    drops: [{ item: 'claw', n: 1, p: 1 }, { item: 'battery', n: 1, p: 0.5 }],
    dex: {
      intro: '浴場の水たまりから伸びる、巨大な手。',
      body: '水から動けない。腕が届く範囲に入らなければ、襲われない。',
      head: '五本の長い指で、獲物を掴もうとする。',
      weak: '弱点は掌の目。叩きつけた後、掌を上に向けている間だけ見える。',
      tell: '叩きつける前に、腕を大きく後ろへ引く。',
    },
  },

  guard: {
    id: 'guard', name: '首なし番人', kana: 'くびなしのばんにん', hp: 160, radius: 0.55, rig: 'guard',
    spawns: [{ x: 14, z: -10 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.6, chase: 1.5, turn: 1.0, sense: 10, giveUp: 18, actEvery: [2, 3.5], actRange: 3.2, tell: 0.9, act: 0.45, recover: 1.5,
      actKind: 'swing', swing: { range: 2.8, dmg: 35 }, exposeIn: 'always' },
    scare: { dist: 0.8 },
    drops: [{ item: 'chain', n: 1, p: 1 }, { item: 'scrap', n: 2, p: 1 }, { item: 'powder', n: 1, p: 0.5 }],
    dex: {
      intro: '倉庫を巡回する、鎧を着た巨体。首がなく、錆びたバケツをかぶっている。',
      body: '動きは遅いが、大きな槌で叩き潰してくる。前から撃っても、ほとんど通らない。',
      head: '首の代わりに、錆びたバケツをかぶっている。ランタンの火で辺りを見ている。',
      weak: '弱点は背中の継ぎ目。淡く光っている。回り込んで撃つ。',
      tell: '槌を振り下ろす前に、大きく振りかぶる。',
    },
  },

  // 3Dモデル(glTF/GLB)の読み込み見本。?only=sample で出せる。使い方は README を参照
  sample: {
    id: 'sample', name: '(モデル読み込み見本)', dev: true, hp: 100, radius: 0.4, rig: 'nosless',
    spawns: [{ x: 4, z: -2.5 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.8, chase: 2.1, actEvery: [4, 7], actRange: 14, tell: 1.3, act: 1.7, recover: 1.2, actKind: 'scream',
      lunge: { speed: 5.2, dur: 0.75 }, melee: { range: 1.6, dmg: 20, cd: 1.4 }, exposeIn: 'act', idleAct: true },
    scare: { dist: 0.55 }, drops: [],
    dex: { intro: '', body: '', head: '', weak: '', tell: '' },
    //   url / height(この高さに合わせる) / yaw(向きのずれ) / nodes(首・顎の骨の名前) / anims(アニメ名) / hit(当たり判定) など
    model: {
      url: 'models/sample-monster.glb', height: 2.6,
      nodes: { head: 'Head', jaw: 'Jaw' }, anims: { idle: 'Idle', walk: 'Walk' },
      hit: { body: { r: 0.34, h: 2.0, y: 1.0 }, head: { node: 'head', r: 0.3, y: 0.2 }, weak: { node: 'head', r: 0.13, y: 0.07, z: 0.16 } },
    },
  },
};

// 図鑑に並べる順(あとの怪物ほど手強い)
const MONSTER_ORDER = ['nosless', 'weeper', 'shadow', 'spider', 'mimic', 'hand', 'guard'];
