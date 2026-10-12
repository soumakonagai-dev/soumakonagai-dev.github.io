// 怪物の設定。1体ぶんが1つのかたまり。ここを足すと怪物が増える(見た目は rig に名前を書く)
//
//   rig         見た目の種類(rig-procedural / rig-creatures)。3Dモデルを使うときは model を書く(下の sample を見本に)
//   spawns      出現する場所 [{x, z}](世界の座標。部屋の位置は world.js の間取りを参照)
//   weakPart    弱点の部位: 'weak'(専用の弱点) か 'head'(頭)。weakAttr がその属性。weakFacing: 'normal'=弱点の向く側から狙う / 'any'
//   ai          行動の数値(下の AI_DEFAULT を参照)
//   scare       やられたときのジャンプスケアで、顔にどこまで寄るか(m)
//   drops       倒したときの素材 [{item, n, p(確率)}]
//   onDeath     倒れたとき、別の怪物が飛び出す { def, n }
//   dex         図鑑の文章。解析が進むと読める(body / head / weak / tell)
//
// 攻撃(actKind)の種類:
//   scream 叫ぶ(その後 lunge で突進) / wail 泣き叫ぶ(声で傷つける) / slam 腕を叩きつける / swing 槌を振り下ろす
//   reach 口から腕を伸ばして、つかんで引きずる / spit 酸を吐く(床に酸だまりが残る) / lash 髪を何度も振り回す / birth 子を産む
// 予兆(tell)の間、怪物は大きく振りかぶる。tell の長さ・tellExt(腹がふくらむ・腕が出かかる程度)で調整する
//
// 使い方: ?only=<id> をURLに付けると、その怪物だけを出して試せる。?hit で当たり判定の枠を表示
const AI_DEFAULT = {
  wander: 0.8, chase: 2.0, turn: 3, sense: 9, giveUp: 16,
  actEvery: [5, 8], actRange: 12, tell: 1.2, act: 1.5, recover: 1.2, actKind: null, actTilt: 0.45, tellExt: 0, actExt: 1,
  lunge: null, melee: null, exposeIn: 'act', idleAct: false, special: null, anchored: false, hover: 0, ambushRange: 2.4, keep: null,
};

const MonsterDefs = {
  nosless: {
    id: 'nosless', name: '鼻なし', kana: 'はななし', hp: 100, radius: 0.4, rig: 'nosless',
    spawns: [{ x: 3, z: 2.5 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.8, chase: 2.1, sense: 9, actEvery: [4, 7], actRange: 14, tell: 1.6, act: 1.7, recover: 1.2, actKind: 'scream',
      lunge: { speed: 5.2, dur: 0.75 }, melee: { range: 1.6, dmg: 20, cd: 1.4 }, exposeIn: 'act', idleAct: true },
    scare: { dist: 0.55 },
    drops: [{ item: 'blood', n: 1, p: 1 }, { item: 'scrap', n: 1, p: 0.4 }],
    dex: {
      intro: '大広間をうろつく、背の高い影。',
      body: '長い腕と細い脚。弱点以外への物理攻撃は、ほとんど通らない。',
      head: '鼻がない。人を口で探している。口の中が本体のようだ。',
      weak: '弱点は口の中。叫んでいる間だけ開く。',
      tell: '叫ぶ直前に、のけぞって首を大きく傾け、両腕を広げる。叫んだ後は突進してくる。',
    },
  },

  weeper: {
    id: 'weeper', name: '泣き女', kana: 'なきおんな', hp: 70, radius: 0.35, rig: 'weeper',
    spawns: [{ x: -11, z: -11 }],
    weakPart: 'weak', weakAttr: 'holy', weakFacing: 'normal',
    ai: { wander: 0.7, chase: 1.1, turn: 1.6, sense: 11, giveUp: 18, actEvery: [4, 6], actRange: 10, tell: 1.5, act: 1.6, recover: 1.0,
      actKind: 'wail', melee: { range: 1.2, dmg: 12, cd: 1.5 }, exposeIn: 'act', idleAct: true, hover: 0.55, actTilt: 0.2 },
    scare: { dist: 0.5 },
    drops: [{ item: 'tear', n: 1, p: 1 }, { item: 'salt', n: 1, p: 0.6 }],
    dex: {
      intro: '病棟を漂う、髪で顔をおおった白い女。',
      body: '宙に浮いて、ゆっくり近づいてくる。体に触れる攻撃は、ほとんど通らない。',
      head: '長い髪の下に、涙の跡が残る顔がある。',
      weak: '弱点は口の中。泣き叫ぶとき、髪が上がって顔があらわれる。',
      tell: '泣き叫ぶ前に、両腕を高く上げてのけぞり、すすり泣く。叫び声を浴びると傷つく。',
    },
  },

  shadow: {
    id: 'shadow', name: '影の子', kana: 'かげのこ', hp: 40, radius: 0.3, rig: 'shadow',
    spawns: [{ x: 7, z: -11 }, { x: 13, z: -9 }],
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

  // 人の体を逆さに反らせ、人の腕を脚にして這う。腹が開くと、心臓がのぞく
  spider: {
    id: 'spider', name: '這い蜘蛛', kana: 'はいぐも', hp: 60, radius: 0.5, rig: 'spider',
    spawns: [{ x: -9, z: 10 }],
    weakPart: 'weak', weakAttr: 'elec', weakFacing: 'any',
    ai: { wander: 1.2, chase: 3.4, turn: 5, sense: 9, giveUp: 14, actEvery: [2.5, 4], actRange: 9, tell: 0.95, recover: 1.8,
      lunge: { speed: 8, dur: 0.55 }, melee: { range: 1.5, dmg: 18, cd: 1.0 }, exposeIn: 'recover' },
    scare: { dist: 0.5 },
    drops: [{ item: 'thread', n: 1, p: 1 }, { item: 'powder', n: 1, p: 0.4 }, { item: 'finger', n: 1, p: 0.35 }],
    dex: {
      intro: '地下への廊下を這いまわる、人の体を逆さに反らせた化け物。腕が脚になっている。',
      body: '何本もの人の腕で素早く這う。体は硬く、弱点以外はほとんど通らない。',
      head: '背中の側に、逆さにぶら下がった顔がある。口が耳まで裂けている。',
      weak: '弱点は胸の奥の心臓。飛びかかった後、あばらが開いている間だけ見える。',
      tell: '飛びかかる前に、体を地面に押しつけて、腕を大きく広げる。',
    },
  },

  mimic: {
    id: 'mimic', name: 'ミミック', kana: 'みみっく', hp: 80, radius: 0.45, rig: 'mimic',
    spawns: [{ x: -19, z: 14.2 }, { x: -6, z: 4.5 }],
    weakPart: 'weak', weakAttr: 'fire', weakFacing: 'any',
    ai: { wander: 0, chase: 2.4, turn: 5, sense: 8, giveUp: 14, special: 'ambush', ambushRange: 2.6, actEvery: [2, 3.5], actRange: 5,
      tell: 0.8, recover: 2.0, lunge: { speed: 6, dur: 0.45 }, melee: { range: 1.4, dmg: 25, cd: 1.2 }, exposeIn: 'recover' },
    scare: { dist: 0.6 },
    drops: [{ item: 'bandage', n: 1, p: 1 }, { item: 'ammo', n: 1, p: 1 }, { item: 'scrap', n: 2, p: 0.7 }],
    dex: {
      intro: '戦利品の箱に化けた怪物。近づくまで、ただの箱に見える。',
      body: '箱そのもの。木でできている。弱点以外はほとんど通らない。',
      head: '蓋の裏に、黄色い目と牙が並んでいる。',
      weak: '弱点は舌。飛びかかった後、蓋を開けて舌を出している間だけ狙える。',
      tell: '飛びかかる前に、蓋が激しくカタカタと開閉して、箱がのけぞる。',
    },
  },

  hand: {
    id: 'hand', name: '水底の手', kana: 'みなそこのて', hp: 90, radius: 0.5, rig: 'hand',
    spawns: [{ x: 17, z: 8 }],
    weakPart: 'weak', weakAttr: 'elec', weakFacing: 'normal',
    ai: { wander: 0, chase: 0, turn: 1.6, sense: 5.5, giveUp: 7, anchored: true, actEvery: [2, 3], actRange: 4.6, tell: 1.3, act: 0.5, recover: 2.2,
      actKind: 'slam', slam: { range: 3.4, dmg: 30 }, exposeIn: 'recover', idleAct: true },
    scare: { dist: 0.8 },
    drops: [{ item: 'claw', n: 1, p: 1 }, { item: 'battery', n: 1, p: 0.5 }],
    dex: {
      intro: '浴場の水たまりから伸びる、巨大な手。',
      body: '水から動けない。腕が届く範囲に入らなければ、襲われない。',
      head: '五本の長い指で、獲物を掴もうとする。',
      weak: '弱点は掌の目。叩きつけた後、掌を上に向けている間だけ見える。',
      tell: '叩きつける前に、腕を天井近くまで大きくのけぞらせ、指を広げる。',
    },
  },

  guard: {
    id: 'guard', name: '首なし番人', kana: 'くびなしのばんにん', hp: 160, radius: 0.55, rig: 'guard',
    spawns: [{ x: 4, z: 12 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.6, chase: 1.5, turn: 1.0, sense: 10, giveUp: 18, actEvery: [2, 3.5], actRange: 3.2, tell: 1.2, act: 0.45, recover: 1.5,
      actKind: 'swing', swing: { range: 2.8, dmg: 35 }, exposeIn: 'always' },
    scare: { dist: 0.8 },
    drops: [{ item: 'chain', n: 1, p: 1 }, { item: 'scrap', n: 2, p: 1 }, { item: 'powder', n: 1, p: 0.5 }],
    dex: {
      intro: '倉庫を巡回する、鎧を着た巨体。首がなく、錆びたバケツをかぶっている。',
      body: '動きは遅いが、大きな槌で叩き潰してくる。前から撃っても、ほとんど通らない。',
      head: '首の代わりに、錆びたバケツをかぶっている。ランタンの火で辺りを見ている。',
      weak: '弱点は背中の継ぎ目。淡く光っている。回り込んで撃つ。',
      tell: '槌を振り下ろす前に、体ごとのけぞって、槌を頭の上まで振りかぶる。',
    },
  },

  // 口が裂けて、口の中から長い腕が伸びる。つかまれると、口の前まで引きずられる
  tehaki: {
    id: 'tehaki', name: '手吐き', kana: 'てはき', hp: 90, radius: 0.4, rig: 'tehaki',
    spawns: [{ x: 9, z: -3 }],
    weakPart: 'weak', weakAttr: 'fire', weakFacing: 'normal',
    ai: { wander: 0.7, chase: 1.6, turn: 2.5, sense: 12, giveUp: 18, keep: [3.5, 7], actEvery: [3, 5], actRange: 8, tell: 1.4, act: 1.6, recover: 1.5,
      actKind: 'reach', reach: { range: 6.2, dmg: 22 }, exposeIn: 'act', tellExt: 0.12, actExt: 1, actTilt: 0.7, idleAct: true },
    scare: { dist: 0.55 },
    drops: [{ item: 'finger', n: 1, p: 1 }, { item: 'battery', n: 1, p: 0.4 }],
    dex: {
      intro: '台所に立つ、顔の細長い男。口が不自然に大きい。',
      body: '遠くから、離れた位置を保ってくる。近づくと下がる。',
      head: '顎が外れるほど口が開く。喉の奥に、何かが蠢いている。',
      weak: '弱点は喉の奥。腕を出している間だけ、口が開いて見える。',
      tell: '腕を出す前に、頭を後ろへ大きくのけぞらせ、口を裂けるほど開く。',
    },
  },

  // 腹がふくれて、酸を吐く。吐いた所に、酸だまりが残る
  hakibukuro: {
    id: 'hakibukuro', name: '吐き袋', kana: 'はきぶくろ', hp: 80, radius: 0.5, rig: 'hakibukuro',
    spawns: [{ x: 20, z: -9 }],
    weakPart: 'weak', weakAttr: 'elec', weakFacing: 'normal',
    ai: { wander: 0.6, chase: 1.4, turn: 2, sense: 12, giveUp: 18, keep: [6, 11], actEvery: [3, 5], actRange: 12, tell: 1.5, act: 1.2, recover: 1.7,
      actKind: 'spit', spit: { n: 3, speed: 9, dmg: 10 }, melee: { range: 1.4, dmg: 14, cd: 1.5 }, exposeIn: 'recover', tellExt: 1, actExt: 0.25, idleAct: true },
    scare: { dist: 0.6 },
    drops: [{ item: 'acid', n: 1, p: 1 }, { item: 'oil', n: 1, p: 0.5 }],
    dex: {
      intro: '祈りの間に居座る、腹が異様にふくれた男。皮膚が透けて、緑の液体が見える。',
      body: '遠くから酸を吐きかけてくる。近づくと逃げる。酸は床に残って、足を焼く。',
      head: '小さな頭が、ふくれた腹の上にちょこんと乗っている。',
      weak: '弱点は腹の奥の袋。酸を吐き終わって、腹がしぼんだ間だけ見える。',
      tell: '吐く前に、腹が倍近くまでふくらんで、ぶるぶると震える。',
    },
  },

  // 天井に逆さにぶら下がり、髪を振り回す
  kamikui: {
    id: 'kamikui', name: '髪食い', kana: 'かみくい', hp: 70, radius: 0.35, rig: 'kamikui',
    spawns: [{ x: 10, z: 7 }],
    weakPart: 'weak', weakAttr: 'holy', weakFacing: 'normal',
    ai: { wander: 0.5, chase: 1.3, turn: 2, sense: 11, giveUp: 18, hover: 3.0, actEvery: [3, 5], actRange: 4.5, tell: 1.4, act: 1.6, recover: 1.8,
      actKind: 'lash', lash: { range: 3.8, dmg: 12, times: [0.3, 0.65, 1.0, 1.35] }, exposeIn: 'recover', tellExt: 0.45, actExt: 1, idleAct: true },
    scare: { dist: 0.5 },
    drops: [{ item: 'hair', n: 1, p: 1 }, { item: 'salt', n: 1, p: 0.5 }],
    dex: {
      intro: '大広間の天井に、逆さにぶら下がっている女。髪が床まで垂れている。',
      body: '天井を這って、真上から近づいてくる。髪は意志を持つように動く。',
      head: '逆さの顔は、髪の束の奥に隠れている。',
      weak: '弱点は口の中。髪を振り回した後、髪が下がって顔があらわれる。',
      tell: '髪を振り回す前に、髪が逆立って、ざわざわと広がる。',
    },
  },

  // 腹が縦に裂けていて、中から子が生まれる。倒すと、腹から子が飛び出す
  harawari: {
    id: 'harawari', name: '腹割れ', kana: 'はらわれ', hp: 130, radius: 0.55, rig: 'harawari',
    spawns: [{ x: -3, z: -6 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.7, chase: 1.2, turn: 2, sense: 10, giveUp: 18, actEvery: [6, 9], actRange: 9, tell: 1.3, act: 1.7, recover: 1.4,
      actKind: 'birth', birth: { def: 'larva', n: 2 }, melee: { range: 1.5, dmg: 22, cd: 1.8 }, exposeIn: 'act', tellExt: 0.6, actExt: 1 },
    onDeath: { def: 'larva', n: 3 },
    scare: { dist: 0.7 },
    drops: [{ item: 'heart', n: 1, p: 1 }, { item: 'scrap', n: 1, p: 1 }],
    dex: {
      intro: '病棟の奥にいる、膨れた腹を縦に割った化け物。裂け目から、何かが覗く。',
      body: '遅いが頑丈。時間が経つと、腹の裂け目から子を産み落とす。',
      head: '顔は、自分の腹の裂け目を見下ろしている。',
      weak: '弱点は裂けた腹の奥の心臓。子を産み落とす間、裂け目が大きく開く。',
      tell: '子を産む前に、体を折って腹の裂け目を大きく開く。',
    },
  },

  // 腹割れが産む子。どこにも出現しない(産まれたときだけ出る)
  larva: {
    id: 'larva', name: '子', kana: 'こ', hp: 14, radius: 0.22, rig: 'larva', dev: true,
    spawns: [],
    weakPart: 'head', weakAttr: 'phys', weakFacing: 'any',
    ai: { wander: 1.4, chase: 3.4, turn: 7, sense: 14, giveUp: 24, melee: { range: 1.0, dmg: 7, cd: 0.9 }, exposeIn: 'always' },
    scare: { dist: 0.35 },
    drops: [{ item: 'bandage', n: 1, p: 0.15 }],
    dex: { intro: '', body: '', head: '', weak: '', tell: '' },
  },

  // 3Dモデル(glTF/GLB)の読み込み見本。?only=sample で出せる。使い方は README を参照
  sample: {
    id: 'sample', name: '(モデル読み込み見本)', dev: true, hp: 100, radius: 0.4, rig: 'nosless',
    spawns: [{ x: 3, z: 2.5 }],
    weakPart: 'weak', weakAttr: 'phys', weakFacing: 'normal',
    ai: { wander: 0.8, chase: 2.1, actEvery: [4, 7], actRange: 14, tell: 1.6, act: 1.7, recover: 1.2, actKind: 'scream',
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
const MONSTER_ORDER = ['nosless', 'weeper', 'shadow', 'spider', 'mimic', 'tehaki', 'hand', 'kamikui', 'hakibukuro', 'harawari', 'guard'];
