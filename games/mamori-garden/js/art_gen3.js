'use strict';
// ===== data5.js のキャラのデザイン（art_gen.js のパーツの組み合わせ） =====
Object.assign(SPEC, NEWART);
for (const key in NEWART) {
  const s = SPEC[key];
  SPRITES[key] = s.t === 'h' ? mkHuman(s) : s.t === 'b' ? mkBeast(s) : s.t === 's' ? mkSpirit(s) : s.t === 'a' ? mkBird(s) : s.t === 'r' ? mkRobot(s) : s.t === 'p' ? mkPlant(s) : mkDragon(s);
}
