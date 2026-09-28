// Figurenblatt: ?test=model
import { layer, clear, text, CAM } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { quad, person, cradle, drop, capsule, sun, crescent } from './figures.js';
import { PAL } from './pal.js';
const K = PAL.crayon;
const G = group(), T = layer();
export function test(comp, t, Q) {
  CAM.x = 960; CAM.y = 540; CAM.s = 1; clearGroup(G); clear(T);
  quad(G, { x: 330, y: 470, s: 0.9, seed: 100 });
  quad(G, { x: 700, y: 470, s: 0.5, flip: true, hr: -0.35, seed: 160, mouth: 'o' });
  quad(G, { x: 1020, y: 470, s: 0.75, kind: 'goat', seed: 200 });
  quad(G, { x: 1230, y: 470, s: 0.45, kind: 'goat', flip: true, seed: 240, hr: 0.2 });
  cradle(G, { x: 1560, y: 470, s: 1, seed: 600 });
  person(G, { x: 200, y: 1020, s: 1, hair: 'scarf', dress: K.violet, arms: 'bowl', seed: 400 });
  person(G, { x: 440, y: 1020, s: 1, hair: 'hat', dress: K.green, arms: 'spoon', seed: 460, belt: K.red });
  person(G, { x: 680, y: 1020, s: 1, hair: 'bun', dress: K.sky, arms: 'wave', seed: 520, hairCol: K.brown });
  drop(G, { x: 980, y: 820, r: 110, seed: 700 });
  drop(G, { x: 1170, y: 880, r: 50, seed: 720, wink: true });
  capsule(G, { x: 1300, y: 900, s: 1.6, r: -0.4, seed: 800 });
  capsule(G, { x: 1300, y: 980, s: 1.6, r: 0.3, seed: 820 });
  sun(G, { x: 1560, y: 830, r: 90, face: true, seed: 900 });
  crescent(G, { x: 1780, y: 830, r: 70, seed: 950 });
  text(T, 'Kolostrum', 1560, 1030, { size: 90, font: 'Gaegu', weight: 700, col: K.ink, p: 0.95, stroke: 2 });
  comp.paperCam(960, 540, 1); comp.begin(); comp.group(G); comp.crayon(T.c); comp.finish({ vig: 0.2 });
}
