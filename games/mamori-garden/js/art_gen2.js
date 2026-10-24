'use strict';
// ===== さらに30体のデザイン指定（art_gen.js のパーツの組み合わせ） =====
HEAD.flame = function (c, p, s) { for (let i = -2; i <= 2; i++) SB(c, [[i * 4.4 - 3, -41], [i * 4.4 - 1.6, -48 - (2 - Math.abs(i)) * 2.4 - S_(p + i * .12, 2) * 2], [i * 4.4, -53 - (2 - Math.abs(i)) * 3 - S_(p + i * .12, 2) * 2], [i * 4.4 + 3, -43]], i % 2 ? '#ffb040' : '#ff6a2a', { line: false }); };

Object.assign(SPEC, {
  firehound: { t: 'b', bc: '#e8603a', bc2: '#ffd0a0', ear: 'wolf', ec: '#ffd24a', ec2: '#a82a1a', tip: '#ffcf6a', scarf: '#ffb040', wp: 'claw', wc: '#ff8a3a', tc: '#e8603a' },
  embersage: { t: 'h', hc: '#ff9a3a', hs: 7, ec: '#ff5a1a', oc: '#a8321e', o2: '#ffd24a', ot: 0, hd: 'flame', bk: 'aura', bc: '#ff7a2a', wp: 'staff', wc: '#ff7a2a' },
  blazeknight: { t: 'h', hc: '#3a1a1a', hs: 5, ec: '#ff6a2a', oc: '#7a2a1a', o2: '#ffb040', ot: 1, hd: 'helm', hg: '#4a2a2a', bk: 'cape', bc: '#c8321e', wp: 'sword', wc: '#ffb070' },
  frostbreaker: { t: 'h', hc: '#bfeaff', hs: 5, ec: '#2a8aff', oc: '#4a8ac8', o2: '#e8faff', ot: 2, hd: 'band', hg: '#6ac8ff', bk: 'none', wp: 'hammer', wc: '#bfe8ff' },
  timesniper: { t: 'h', hc: '#c8c0ff', hs: 3, ec: '#6a6aff', oc: '#4a3a8a', o2: '#ffe27a', ot: 4, hd: 'hood', hg: '#2a2a5a', bk: 'aura', bc: '#9a8aff', wp: 'gun', wc: '#c9a54a' },
  venomhunter: { t: 'h', hc: '#6a8a2a', hs: 4, ec: '#aaff4a', oc: '#3a5a2a', o2: '#c8e870', ot: 2, hd: 'hood', hg: '#2a4a1a', bk: 'quiver', wp: 'bow', wc: '#6a8a2a' },
  plaguebomber: { t: 'h', hc: '#8a4aa8', hs: 6, ec: '#aaff6a', oc: '#4a2a5a', o2: '#9ae86a', ot: 3, hd: 'goggle', bk: 'pack', bc: '#5a3a6a', wp: 'flask', wc: '#9ae86a' },
  slowreaper: { t: 'h', hc: '#2a6a8a', hs: 1, ec: '#6ad0ff', oc: '#2a5a7a', o2: '#bff4ff', ot: 0, hd: 'hood', hg: '#1a3a5a', bk: 'cape', bc: '#1a3a5a', wp: 'trident', wc: '#8ae8ff' },
  markhunter: { t: 'h', hc: '#3a3a5a', hs: 0, ec: '#ff4aa8', oc: '#2a2a3a', o2: '#ff4aa8', ot: 4, hd: 'mask', hg: '#3a3a5a', bk: 'scarf', bc: '#ff4aa8', wp: 'bow', wc: '#7a3a8a' },
  shieldbreaker: { t: 'h', hc: '#a07a3a', hs: 5, ec: '#ffb040', oc: '#6a5a4a', o2: '#c8d0e0', ot: 1, hd: 'helm', hg: '#8a8a98', bk: 'none', wp: 'hammer', wc: '#c8d0e0' },
  skyhunter: { t: 'a', kind: 'hawk', bc: '#8ac8ff', wc: '#4a8ae0', belly: '#ffffff', ec: '#ffe27a', crest: 'tuft', cc: '#4a8ae0', beak: '#ffb81e' },
  bossbane: { t: 'h', hc: '#7a2a2a', hs: 2, ec: '#ffd24a', oc: '#5a3a2a', o2: '#ffb040', ot: 1, hd: 'horn', hg: '#e8e0c0', bk: 'cape', bc: '#3a2a2a', wp: 'spear', wc: '#c8d0e0' },
  opener: { t: 'h', hc: '#7aff9a', hs: 5, ec: '#2aaa5a', oc: '#3aaa6a', o2: '#ffffff', ot: 2, hd: 'band', hg: '#ffffff', bk: 'scarf', bc: '#7aff9a', wp: 'katana', wc: '#e8fff0' },
  finisher: { t: 'h', hc: '#4a1a2a', hs: 1, ec: '#ff2a4a', oc: '#2a1a2a', o2: '#c82a4a', ot: 4, hd: 'hood', hg: '#1a0a1a', bk: 'bat', bc: '#2a1a3a', wp: 'katana', wc: '#ff6a8a' },
  rampgunner: { t: 'h', hc: '#ff9a2a', hs: 6, ec: '#3aa8ff', oc: '#c86a1a', o2: '#ffd24a', ot: 2, hd: 'goggle', bk: 'pack', bc: '#6a4a2a', wp: 'gun', wc: '#8a8aa8' },
  killnurse: { t: 'h', hc: '#ffb8d0', hs: 2, ec: '#ff6a9a', oc: '#ffffff', o2: '#ff6a9a', ot: 3, hd: 'cap', hg: '#ffffff', bk: 'none', wp: 'wand', wc: '#ff6a9a' },
  blastchain: { t: 'h', hc: '#ffd24a', hs: 5, ec: '#ff5a1a', oc: '#c85a1a', o2: '#ffe27a', ot: 2, hd: 'goggle', bk: 'pack', bc: '#8a3a1a', wp: 'flask', wc: '#ff6a2a' },
  artillery: { t: 'h', hc: '#2a2a3a', hs: 3, ec: '#ff8a2a', oc: '#4a5a3a', o2: '#c8b080', ot: 4, hd: 'cap', hg: '#3a4a2a', bk: 'none', wp: 'cannon', wc: '#5a5a6a' },
  meteorwitch: { t: 'h', hc: '#ff7a4a', hs: 2, ec: '#ffd24a', oc: '#6a1a3a', o2: '#ff9a3a', ot: 0, hd: 'witch', hg: '#4a1a2a', bk: 'aura', bc: '#ff6a2a', wp: 'staff', wc: '#ffb040' },
  blizzardmage: { t: 'h', hc: '#e8f6ff', hs: 7, ec: '#4ab0ff', oc: '#5a9ad8', o2: '#ffffff', ot: 0, hd: 'crown', bk: 'wings', bc: '#e8f6ff', wp: 'staff', wc: '#bff4ff' },
  tsunami: { t: 's', sc: '#4ab0ff', ec: '#ffffff', feat: 'cloud', orbit: 3, oc: '#bff4ff' },
  quakegolem: { t: 'r', kind: 'golem', rc: '#8a6a4a', ec: '#ffcf4a' },
  stormtower: { t: 'r', kind: 'coil', rc: '#c8a0ff', ec: '#fff27a' },
  solarcannon: { t: 'r', kind: 'turret', rc: '#ffd24a', ec: '#ff8a2a' },
  poisonfog: { t: 's', sc: '#8a5ac8', ec: '#c8ff6a', feat: 'cloud', orbit: 3, oc: '#9ae86a' },
  lightningrod: { t: 'r', kind: 'coil', rc: '#4a5a7a', ec: '#bff0ff' },
  sunpriest: { t: 'h', hc: '#ffd24a', hs: 7, ec: '#ff8a2a', oc: '#fff6e0', o2: '#ff8a2a', ot: 5, hd: 'halo', bk: 'wings', bc: '#fff0b0', wp: 'fan', wc: '#ffb040' },
  moonoracle: { t: 'h', hc: '#c8b8ff', hs: 1, ec: '#8a6aff', oc: '#2a2a6a', o2: '#c8b8ff', ot: 5, hd: 'tiara', bk: 'aura', bc: '#9a8aff', wp: 'fan', wc: '#8a6aff' },
  windcaller: { t: 'h', hc: '#8affd8', hs: 2, ec: '#1aaa8a', oc: '#4ac8a8', o2: '#ffffff', ot: 3, hd: 'flower', hg: '#7aff9a', bk: 'scarf', bc: '#bfffe8', wp: 'fan', wc: '#7affd0' },
  gravitywell: { t: 's', sc: '#5a3a9a', ec: '#ff6ad0', feat: 'moon', orbit: 4, oc: '#c070ff' },
});
for (const key of ['firehound', 'embersage', 'blazeknight', 'frostbreaker', 'timesniper', 'venomhunter', 'plaguebomber', 'slowreaper', 'markhunter', 'shieldbreaker', 'skyhunter', 'bossbane', 'opener', 'finisher', 'rampgunner', 'killnurse', 'blastchain', 'artillery', 'meteorwitch', 'blizzardmage', 'tsunami', 'quakegolem', 'stormtower', 'solarcannon', 'poisonfog', 'lightningrod', 'sunpriest', 'moonoracle', 'windcaller', 'gravitywell']) {
  const s = SPEC[key];
  SPRITES[key] = s.t === 'h' ? mkHuman(s) : s.t === 'b' ? mkBeast(s) : s.t === 's' ? mkSpirit(s) : s.t === 'a' ? mkBird(s) : s.t === 'r' ? mkRobot(s) : s.t === 'p' ? mkPlant(s) : mkDragon(s);
}
