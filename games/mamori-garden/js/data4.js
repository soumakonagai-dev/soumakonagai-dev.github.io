'use strict';
// ===== 新ステージ 11〜15（夜桜の都・雷鳴の高原・水晶の洞窟・歯車の街・世界樹の頂） =====
STAGE_HP_MUL.push(11.5, 13, 14.5, 16, 17.5);
STAGES.push(
  { name: '夜桜の都', sub: 'ちょうちんと舞い散る花びら', theme: 'sakura', boss: 'kyuubi',
    path: [[-.06, .3], [.3, .3], [.3, .75], [.6, .75], [.6, .25], [.85, .25], [.85, .6], [1.06, .6]], zones: ['flower', 'altar', 'high', 'stump'] },
  { name: '雷鳴の高原', sub: 'ごろごろ鳴る黒い空', theme: 'storm', boss: 'raijuu',
    path: [[-.06, .8], [.2, .8], [.2, .2], [.45, .2], [.45, .8], [.7, .8], [.7, .2], [.92, .2], [.92, .55], [1.06, .55]], zones: ['high', 'spring', 'stump', 'altar'] },
  { name: '水晶の洞窟', sub: 'きらめく地下の宝石', theme: 'crystal', boss: 'crystalking',
    path: [[-.06, .2], [.7, .2], [.7, .5], [.3, .5], [.3, .8], [.95, .8], [1.06, .8]], zones: ['spring', 'altar', 'flower', 'high'] },
  { name: '歯車の街', sub: '蒸気とぜんまいの王国', theme: 'clock', boss: 'clockking',
    path: [[-.06, .5], [.1, .5], [.1, .15], [.3, .15], [.3, .85], [.5, .85], [.5, .15], [.7, .15], [.7, .85], [.9, .85], [.9, .5], [1.06, .5]], zones: ['high', 'stump', 'altar', 'spring'] },
  { name: '世界樹の頂', sub: 'いちばん高い、光の庭', theme: 'worldtree', boss: 'treequeen',
    path: [[-.06, .5], [.15, .5], [.15, .15], [.85, .15], [.85, .5], [.5, .5], [.5, .85], [.12, .85]], zones: ['altar', 'flower', 'spring', 'high'] },
);
Object.assign(BOSSES, {
  kyuubi: { name: '九尾の妖狐', skill: '妖しい狐火で、モンスター3体をうっとり眠らせる' },
  raijuu: { name: '雷獣', skill: '雷でモンスター2体をしびれさせ、自分は速く走る' },
  crystalking: { name: '水晶の巨像', skill: '少しのあいだ無敵になり、周りの敵にバリアを張る' },
  clockking: { name: '歯車の大王', skill: '時間を止めて、モンスターを何体か動けなくする' },
  treequeen: { name: '世界樹の女王', skill: '木の根でモンスター3体を縛り、周りの敵を回復する' },
});
