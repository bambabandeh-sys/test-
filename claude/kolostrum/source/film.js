// „Kolostrum“ – Zeitleiste, eine Kamerafahrt über eine Bilderbuchseite, Ereignisse für Geräusche/Musik, Untertitel.
// Ab 31 s zieht die Kamera auf: die Seite liegt als Buch auf dem Tisch, Umblättern → Schlussseite (end.js).
import { layer, clear, line, fill, dab, text, handCircle, ellipse, smooth, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup, part, curve } from './rig.js';
import { quad, person, cradle, drop, capsule, sun, crescent } from './figures.js';
import { drawGround, drawBottle, drawQ, drawHut, drawHouse, drawWax, drawWash, bandTime, bandFront, BANDS, POS, GROUND, pr } from './world.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, ss, eo, spring } from '/core/lib.js';
import { endFrame, END_T } from './end.js';
const K = PAL.crayon;
export const DUR = 39;
const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 3;

// —— Sprecher (t = Einsatz; d aus voices/dur.json) ——
export const LINES = [
  { id: 'n1', t: 1.0, d: 2.635, text: 'Das Erste, was jedes Säugetier im Leben bekommt,' },
  { id: 'n2', t: 4.1, d: 0.853, text: 'ist keine Milch.' },
  { id: 'n3', t: 6.1, d: 1.095, text: 'Es ist Kolostrum.' },
  { id: 'n4', t: 8.2, d: 1.666, text: 'Kälber, Babys, alle.' },
  { id: 'n5', t: 10.75, d: 0.984, text: 'Danach nie wieder.' },
  { id: 'n6', t: 12.9, d: 0.928, text: 'Warum eigentlich?' },
  { id: 'n7', t: 14.8, d: 1.878, text: 'Andere Kulturen haben es gegessen,' },
  { id: 'n8', t: 17.0, d: 1.816, text: 'solange es Kühe und Ziegen gibt.' },
  { id: 'n9', t: 20.0, d: 1.731, text: 'Ich nehm zwei Kapseln am Morgen,' },
  { id: 'n10', t: 22.4, d: 0.993, text: 'seit zwei Jahren.' },
  { id: 'n11', t: 24.9, d: 1.366, text: 'Wenn du’s testen willst:' },
  { id: 'n12', t: 27.2, d: 1.091, text: 'roroh.de' },
];
// Untertitel = die gedruckten Worte des Buchs; kurze Sätze zusammengefasst. ≥ 1,8 s und ≥ Sprechzeit + 0,6 s
const GROUPS = [['n1', 'n2'], ['n3'], ['n4'], ['n5'], ['n6'], ['n7', 'n8'], ['n9', 'n10'], ['n11', 'n12']];
const byId = Object.fromEntries(LINES.map(L => [L.id, L]));
export const SUBS = GROUPS.map((g, i) => {
  const a = byId[g[0]], b = byId[g[g.length - 1]];
  const t0 = a.t - 0.1; let t1 = Math.max(t0 + 1.8, b.t + b.d + 0.6);
  const nx = GROUPS[i + 1]; if (nx) t1 = Math.min(t1, byId[nx[0]].t - 0.25);
  return { t0, t1, text: g.map(id => byId[id].text).join(' ') };
});

// —— Kamera (Weltmitte x, y, Zoom) ——
const camT = track([
  [0, [1600, 900, 0.6]], [0.5, [1600, 900, 0.6]], [2.6, [800, 1180, 1.1]], [5.6, [800, 1180, 1.1]], [6.6, [830, 1130, 1.12]], [7.2, [830, 1130, 1.12]],
  [8.3, [1250, 1250, 0.95]], [10.6, [1260, 1240, 0.97]], [11.9, [1300, 1080, 0.86]], [13.2, [1420, 930, 0.72]], [14.1, [1440, 930, 0.72]],
  [15.3, [2380, 1170, 1.05]], [16.8, [2390, 1160, 1.07]], [17.6, [2400, 1090, 0.9]], [19.0, [2410, 1085, 0.9]],
  [19.9, [2830, 1130, 1.05]], [20.9, [2840, 1305, 1.75]], [22.3, [2842, 1300, 1.78]], [22.9, [2790, 1265, 1.95]], [23.4, [2790, 1265, 1.95]],
  [24.4, [1600, 900, 0.6]], [27.0, [1600, 900, 0.6]], [28.3, [1600, 470, 1.12]], [29.6, [1600, 465, 1.15]], [30.9, [1600, 900, 0.6]], [31.0, [1600, 900, 0.6]],
]);

// —— Zeichen-Fahrplan: [Linien a, b] [Ausmalen a, b] ——
const S = {
  ground: [0.2, 1.2, 1.4, 2.6], cow: [0.4, 1.4, 1.6, 2.6], calf: [1.0, 1.8, 2.2, 3.0], bottle: [4.1, 4.5, 4.4, 4.8],
  cradle: [7.1, 7.6, 7.5, 8.0], goat: [7.4, 7.9, 7.8, 8.3], kid: [7.6, 8.1, 8.0, 8.4],
  hut: [14.0, 14.6, 14.5, 15.1], A: [14.6, 15.2, 15.0, 15.6], B: [15.0, 15.6, 15.4, 16.0],
  cow2: [17.45, 17.9, 17.8, 18.2], goat2: [17.95, 18.35, 18.25, 18.6],
  house: [18.9, 19.6, 19.4, 20.0], room: [19.8, 20.3, 20.1, 20.5],
};
const DL = (k, t) => pr(t, S[k][0], S[k][1]), FL = (k, t) => pr(t, S[k][2], S[k][3]);
const X1 = [5.0, 5.2], X2 = [5.25, 5.45];
const HERO = 5.7, TITLE = [6.5, 7.3];
const MINI = [{ t: 8.25, x: 600, y: 1270, r: 34, seed: 740 }, { t: 8.95, x: 1283, y: 1290, r: 34, seed: 760 }, { t: 9.45, x: 1850, y: 1300, r: 32, seed: 780 }];
const FLOAT = [10.9, 11.0, 11.1];
const Q = [12.95, 13.55], QDOT = 13.62;
const ARC = [17.0, 19.3];
const SUNRISE = [19.4, 20.2];
const CAPS = [20.6, 20.85];
const CAL = [22.4, 23.1];

// —— Ereignisse (Geräusche, Musik-Cues) ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
LINES.forEach(L => ev(L.t, 'voice', { id: L.id }));
ev(0, 'paper');
const panOf = x => clamp((x - 1600) / 1600, -0.9, 0.9);
const drawEv = (k, x) => { ev(S[k][0], 'scratch', { dur: S[k][1] - S[k][0], pan: 0 }); ev(S[k][2], 'scribble', { dur: S[k][3] - S[k][2], pan: 0 }); };
['ground', 'cow', 'calf', 'bottle', 'cradle', 'goat', 'kid', 'hut', 'A', 'B', 'cow2', 'goat2', 'house', 'room'].forEach(k => drawEv(k));
ev(2.35, 'moo', { pan: -0.3 });
ev(X1[0], 'cross', { dur: 0.2, pan: 0.2 }); ev(X2[0], 'cross', { dur: 0.2, pan: 0.2 });
ev(HERO, 'pop', { big: true, pan: 0.1 }); ev(TITLE[0], 'write', { dur: TITLE[1] - TITLE[0], pan: 0.3 });
MINI.forEach((m, i) => ev(m.t, 'pop', { i, pan: [-0.4, 0, 0.4][i] }));
ev(8.95, 'coo', { pan: 0 }); ev(9.5, 'bleat', { pan: 0.4 });
FLOAT.forEach((t, i) => ev(t + 0.5, 'puff', { i, pan: [-0.4, 0, 0.4][i] }));
ev(12.3, 'silence', { dur: 0.6 });
ev(Q[0], 'scratch', { dur: Q[1] - Q[0], pan: 0, big: true }); ev(QDOT, 'dot', { pan: 0 });
[15.6, 16.2].forEach(t => ev(t, 'spoon', { pan: 0.3 }));
for (let c = 0; c < 4; c++) ev(ARC[0] + (ARC[1] - ARC[0]) * c / 4, c % 2 ? 'moonarc' : 'sunarc', { dur: (ARC[1] - ARC[0]) / 4 });
ev(SUNRISE[0], 'sunrise', { dur: SUNRISE[1] - SUNRISE[0] });
CAPS.forEach((t, i) => ev(t, 'cap', { i }));
ev(CAL[0], 'riffle', { dur: CAL[1] - CAL[0] }); ev(CAL[1], 'write', { dur: 0.4, pan: -0.3 });
ev(24.2, 'breath', { dur: 0.3 }); ev(24.4, 'dip');
BANDS.forEach(b => ev(b.t0, 'brush', { dur: b.t1 - b.t0, dir: b.dir }));
ev(bandTime(BANDS[0], POS.url[0] + 560), 'reveal');    // Pinselkante hat die ganze Adresse freigelegt
ev(END_T.room, 'room'); ev(END_T.turn[0], 'page', { dur: END_T.turn[1] - END_T.turn[0] });
[['A', 0], ['B', 7.5], ['C', 12.9], ['D', 19.4], ['E', 24.5], ['F', 34.5]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— Ebenen ——
const WAX = group(), BG = { f: layer(), l: layer() }, CH = group(), WASH = layer(), FX = layer(), SUBK = layer(), SUBT = layer();

export function frame(comp, t) {
  if (t >= END_T.start) return endFrame(comp, t, { drawPage, subTo });
  drawPage(comp, t, camT(t));
}

export function drawPage(comp, t, cam, { subs = true, vig = 0.3 } = {}) {
  [CAM.x, CAM.y, CAM.s] = cam;
  BOIL.amp = 1;
  clearGroup(WAX); clearGroup(CH); [BG.f, BG.l, WASH, FX, SUBK, SUBT].forEach(clear);
  drawWax(WAX); waxMask(WAX.f, t);
  // ——— Hintergrund (wird von der Wasserfarbe überstrichen) ———
  drawGround(BG.f, BG.l, { gl: DL('ground', t), gf: FL('ground', t) });
  drawBottle(BG.f, BG.l, DL('bottle', t), FL('bottle', t), pr(t, ...X1), pr(t, ...X2));
  drawQ(BG.l, pr(t, ...Q), pr(t, QDOT, QDOT + 0.12));
  drawHut(BG.f, BG.l, DL('hut', t), FL('hut', t));
  drawHouse(BG.f, BG.l, DL('house', t), FL('house', t));
  if (t > TITLE[0]) {
    const [tx, ty] = POS.title;
    text(BG.l, 'Kolostrum', sx(tx), sy(ty), { size: 118 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, ...TITLE), seed: 21, p: 0.95, stroke: 2.5 * CAM.s, align: 'right' });
    if (t > TITLE[1]) line(BG.l, [[tx - 500, ty + 26], [tx - 250, ty + 34], [tx, ty + 22]], { w: 9, col: K.orange, seed: 22, draw: pr(t, TITLE[1], TITLE[1] + 0.3), boil: 0.6 });
  }
  // ——— Figuren (nach der Wasserfarbe komponiert: bleiben lesbar) ———
  const blink = (ts) => ts.some(b => t > b && t < b + 0.14);
  // Kuh + Kalb (Kalb trinkt: Kopf nickt)
  const moo = t > 2.35 && t < 2.95;
  quad(CH, { x: POS.cow[0], y: POS.cow[1], s: 1, seed: 100, d: DL('cow', t), f: FL('cow', t), blink: blink([3.6, 9.9, 16.4]), mouth: moo ? 'moo' : 'smile', hr: moo ? -0.12 : 0.04 * Math.sin(t * 1.3) });
  const nurse = 0.05 * Math.sin(Math.floor(t * 12) / 12 * 5.5);
  quad(CH, { x: POS.calf[0], y: POS.calf[1], s: 0.55, flip: true, seed: 160, udder: false, d: DL('calf', t), f: FL('calf', t), hr: -0.32 + nurse, blink: blink([4.6, 12.2]), mouth: 'smile' });
  // Wiege, Ziege + Zicklein
  const rock = 0.045 * Math.sin(t * 2.4);
  cradle(CH, { x: POS.cradle[0], y: POS.cradle[1], s: 0.9, r: rock, seed: 600, d: DL('cradle', t), f: FL('cradle', t), mouth: t > 8.95 && t < 9.5 ? 'o' : 'smile' });
  const bleat = t > 9.5 && t < 10.0;
  quad(CH, { x: POS.goat[0], y: POS.goat[1], s: 0.75, kind: 'goat', seed: 200, d: DL('goat', t), f: FL('goat', t), mouth: bleat ? 'o' : 'smile', hr: bleat ? -0.2 : 0, blink: blink([11.4]) });
  quad(CH, { x: POS.kid[0], y: POS.kid[1], s: 0.45, kind: 'goat', flip: true, seed: 240, d: DL('kid', t), f: FL('kid', t), hr: 0.1 + 0.06 * Math.sin(Math.floor(t * 12) / 12 * 4), blink: blink([10.3]) });
  // Region 3: zwei Menschen mit Schalen, kleine Kuh + Ziege
  const steam = Math.floor(t * 12) / 12 * 3;
  quad(CH, { x: POS.goat2[0], y: POS.goat2[1], s: 0.42, kind: 'goat', seed: 270, d: DL('goat2', t), f: FL('goat2', t) });
  person(CH, { x: POS.A[0], y: POS.A[1], s: 0.95, hair: 'scarf', dress: K.violet, arms: 'bowl', seed: 400, d: DL('A', t), f: FL('A', t), steam, look: 0.6, closed: blink([16.9]) });
  const eat = t > 15.6 && t < 17.0 ? ss(Math.sin((t - 15.6) / 0.6 * Math.PI) * 0.5 + 0.5) : 0;
  person(CH, { x: POS.B[0], y: POS.B[1], s: 0.95, flip: true, hair: 'hat', dress: K.green, belt: K.red, arms: 'spoon', lift: eat, seed: 460, d: DL('B', t), f: FL('B', t), steam: steam + 1, mouth: eat > 0.6 ? 'o' : 'smile' });
  quad(CH, { x: POS.cow2[0], y: POS.cow2[1], s: 0.5, flip: true, seed: 300, body: K.brown, spots: K.ochre, d: DL('cow2', t), f: FL('cow2', t) });
  // Sonne und Mond jagen sich über den Himmel: „solange es Kühe und Ziegen gibt“
  if (t > ARC[0] && t < ARC[1]) {
    const u = Math.floor(pr(t, ...ARC) * 4 * 12 * 2.3) / (12 * 2.3);   // 12 fps gestuft
    const c = Math.floor(u), ph = u - c, th = Math.PI - ph * Math.PI;
    const [ax, ay, R] = POS.arc; const x = ax + Math.cos(th) * R, y = ay - Math.sin(th) * R * 0.85;
    if (c % 2 === 0) sun(CH, { x, y, r: 62, seed: 900, face: true, spin: ph }); else crescent(CH, { x, y, r: 56, seed: 950 });
  }
  // Region 4: Sonnenaufgang + Fenster (Erzähler am Morgen)
  if (t > SUNRISE[0]) { const u = eo(pr(t, ...SUNRISE)); sun(CH, { x: POS.sunrise[0], y: lerp(1000, POS.sunrise[1], u), r: 70, seed: 980, face: true, d: pr(t, SUNRISE[0], SUNRISE[0] + 0.5), f: pr(t, SUNRISE[0] + 0.2, SUNRISE[1]) }); }
  room(CH, t);
  // ——— goldene Tropfen ———
  if (t > HERO) {
    const k = spring(t - HERO, 9, 0.38), bob = 6 * Math.sin(t * 2.2);
    drop(CH, { x: POS.drop[0], y: POS.drop[1] + bob, r: 95 * clamp(k, 0, 1.3), seed: 700, d: pr(t, HERO, HERO + 0.25), f: pr(t, HERO + 0.1, HERO + 0.6), wink: t > 7.6 && t < 7.9, rot: 0.04 * Math.sin(t * 1.7) });
    if (t < HERO + 0.35) burst(FX, POS.drop[0], POS.drop[1] - 40, 150, pr(t, HERO, HERO + 0.35), 710);
  }
  MINI.forEach((m, i) => {
    if (t < m.t) return;
    const fl = pr(t, FLOAT[i], FLOAT[i] + 1.2);
    if (fl >= 1) return;
    const k = spring(t - m.t, 10, 0.4) * (1 - ss(fl));
    drop(CH, { x: m.x + 18 * Math.sin(fl * 9 + i), y: m.y - 300 * ss(fl) + 4 * Math.sin(t * 3 + i), r: m.r * clamp(k, 0, 1.3), seed: m.seed, d: pr(t, m.t, m.t + 0.2), f: pr(t, m.t + 0.05, m.t + 0.4) });
    if (t < m.t + 0.3) burst(FX, m.x, m.y - 10, 70, pr(t, m.t, m.t + 0.3), m.seed + 5);
  });
  // ——— Wasserfarbe ———
  if (t > BANDS[0].t0) drawWash(WASH, t);
  if (subs) subTo(SUBK, SUBT, t);
  // ——— Komposition (Papierkorn an der Seite verankert) ———
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.group(WAX, { dark: 0 });   // weißes Wachs: nicht abdunkeln, sonst sieht man die Schrift vor der Wasserfarbe
  comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  if (t > BANDS[0].t0) comp.wash(WASH.c, { color: PAL.wash });
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(CH, { goff: go });
  comp.crayon(FX.c, { goff: go });
  comp.knock(SUBK.c); comp.crayon(SUBT.c);
  comp.finish({ vig });
}

// Wachs nur dort, wo der Pinsel schon war (sonst schimmert die Schrift vorher durchs Papier-Relief)
function waxMask(L, t) {
  const g = L.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < BANDS[0].t0) { g.clearRect(0, 0, W, H); g.restore(); return; }   // leerer Pfad würde nichts löschen
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.beginPath();
  for (const b of BANDS) {
    if (t < b.t0) continue;
    const f = bandFront(b, t) + b.dir * 90;
    const xa = b.dir > 0 ? -5000 : f, xb = b.dir > 0 ? f : 9000, ya = b.dir > 0 ? b.y0 - 300 : b.y0 - 40, yb = b.dir > 0 ? b.y1 + 40 : b.y1 + 300;
    g.rect(sx(xa), sy(ya), sx(xb) - sx(xa), sy(yb) - sy(ya));
  }
  g.fill(); g.restore();
}

// kleine Striche um etwas, das gerade erscheint
function burst(L, x, y, r, u, seed) {
  if (u <= 0 || u >= 1) return;
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + 0.3, r0 = r * (0.9 + 0.5 * u), r1 = r0 + r * 0.35 * (1 - u);
    line(L, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], { w: 5, col: K.orange, seed: seed + k, p: 1 - u });
  }
}

// ——— Fenster: Erzähler am Frühstückstisch, zwei Kapseln, Kalender ———
function room(C, t) {
  const d = DL('room', t), f = FL('room', t); if (d <= 0) return;
  const [wx0, wy0, wx1, wy1] = POS.house.win;
  // warmes Morgenlicht im Raum
  part(C, [[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1]], { col: K.yellow, p: 0.42, gap: 10, w: 12, ang: 0.4, seed: 1500, draw: f }, null);
  // Kalender an der Rückwand
  const cx = 2728, cy = 1222;
  part(C, [[cx - 34, cy - 40], [cx + 34, cy - 40], [cx + 34, cy + 44], [cx - 34, cy + 44]], { col: K.white, p: 0.9, gap: 5, w: 7, seed: 1510, draw: f }, { w: 5, seed: 1511, draw: d });
  part(C, [[cx - 34, cy - 40], [cx + 34, cy - 40], [cx + 34, cy - 20], [cx - 34, cy - 20]], { col: K.red, p: 0.95, gap: 4, w: 6, seed: 1512, draw: f }, { w: 4, seed: 1513, draw: d });
  if (f > 0.8) {
    let label = String(1 + Math.floor(hash(3) * 28)), sub = '';
    if (t > CAL[0] && t < CAL[1]) { const k = Math.floor((t - CAL[0]) * 12); label = String(1 + Math.floor(hash(k * 7.3) * 30)); line(C.l, [[cx + 34, cy - 18], [cx + 10 + 20 * hash(k), cy + 44]], { w: 4, seed: 1520 + k }); }
    if (t >= CAL[1]) { label = '2'; sub = 'Jahre'; }
    text(C.l, label, sx(cx), sy(cy + 22 - (sub ? 6 : 0)), { size: (sub ? 46 : 38) * CAM.s, font: 'Gaegu', weight: 700, col: K.ink, p: 1, seed: 1530 + (t > CAL[1] ? 1 : 0), reveal: t >= CAL[1] ? pr(t, CAL[1], CAL[1] + 0.2) : 1 });
    if (sub) text(C.l, sub, sx(cx), sy(cy + 40), { size: 20 * CAM.s, col: K.ink, p: 1, seed: 1535, reveal: pr(t, CAL[1] + 0.15, CAL[1] + 0.4) });
  }
  // Erzähler: Pullover, Kopf, Arm mit offener Hand
  const hx = 2810, hy = 1262;
  part(C, smooth([[hx - 76, wy1], [hx - 64, hy + 64], [hx - 20, hy + 50], [hx + 20, hy + 50], [hx + 64, hy + 64], [hx + 76, wy1]], 4, false), { col: K.sky, p: 0.8, gap: 8, w: 10, ang: 1.1, seed: 1540, draw: f }, { w: 6, seed: 1541, draw: d });
  part(C, smooth([[hx - 54, hy + 2], [hx - 50, hy - 40], [hx, hy - 60], [hx + 50, hy - 40], [hx + 54, hy + 2], [hx + 30, hy - 26], [hx, hy - 30], [hx - 30, hy - 26]], 5), { col: K.brown, p: 0.9, gap: 7, w: 9, ang: 1.2, seed: 1542, draw: f }, { w: 6, seed: 1543, draw: d });
  part(C, ellipse(hx, hy, 50, 48, 36), { col: K.peach, p: 0.55, gap: 9, w: 11, ang: 0.5, seed: 1544, draw: f, over: 3 }, { w: 6, seed: 1545, draw: d });
  part(C, smooth([[hx - 52, hy - 4], [hx - 46, hy - 42], [hx, hy - 58], [hx + 46, hy - 42], [hx + 52, hy - 4], [hx + 28, hy - 30], [hx - 10, hy - 34], [hx - 34, hy - 22]], 5), { col: K.brown, p: 0.9, gap: 7, w: 9, ang: 1.2, seed: 1546, draw: f }, { w: 6, seed: 1547, draw: d }, { occ: false });
  if (d > 0.7) {
    const bl = [21.7, 23.6].some(b => t > b && t < b + 0.14);
    const look = t > CAL[0] - 0.2 && t < CAL[1] + 0.8 ? -8 : 6;
    [[-17, 0], [17, 0]].forEach(([ex], i) => {
      if (bl) line(C.l, [[hx + ex - 7 + look, hy + 2], [hx + ex + look, hy + 6], [hx + ex + 7 + look, hy + 2]], { w: 4.5, seed: 1550 + i });
      else { fill(C.f, ellipse(hx + ex + look, hy + 2, 6.5, 7.5, 12), { col: K.ink, p: 1, gap: 2.5, w: 4, seed: 1550 + i }); dab(C.f, hx + ex + look - 2, hy - 1, 2.2, { col: K.white, p: 1, seed: 1552 + i, gap: 2, w: 3 }); }
    });
    const smile = t > 21.2 ? 1 : 0.4;
    line(C.l, [[hx - 13 + look, hy + 22], [hx + look, hy + 22 + 8 * smile], [hx + 13 + look, hy + 22]], { w: 4.5, seed: 1556 });
    dab(C.f, hx - 32, hy + 16, 9, { col: K.pink, p: 0.75, seed: 1557 }); dab(C.f, hx + 32, hy + 16, 9, { col: K.pink, p: 0.75, seed: 1558 });
  }
  // Tisch, Tasse
  part(C, [[wx0, wy1 - 30], [wx1, wy1 - 30], [wx1, wy1], [wx0, wy1]], { col: K.brown, p: 0.9, gap: 7, w: 9, ang: 0.1, seed: 1560, draw: f }, { w: 6, seed: 1561, draw: d });
  const mx = 2950, my = wy1 - 30;
  part(C, [[mx - 26, my], [mx - 30, my - 58], [mx + 30, my - 58], [mx + 26, my]], { col: K.red, p: 0.9, gap: 6, w: 8, ang: 1.3, seed: 1562, draw: f }, { w: 5, seed: 1563, draw: d });
  line(C.l, curve([[mx + 28, my - 48], [mx + 48, my - 40], [mx + 44, my - 18], [mx + 27, my - 14]]), { w: 5, seed: 1564, draw: d });
  if (f > 0.8) for (let k = 0; k < 2; k++) { const ph = Math.floor(t * 12) / 12 * 3 + k * 2; line(C.l, curve([[mx - 8 + k * 16, my - 66], [mx - 2 + k * 16 + 6 * Math.sin(ph), my - 86], [mx - 8 + k * 16, my - 106]]), { w: 4, col: K.orange, p: 0.6, seed: 1565 + k }); }
  // Arm hebt die offene Hand mit den Kapseln
  const lift = ss(pr(t, 20.3, 20.6));
  const sh = [hx + 52, hy + 70], hand = [lerp(hx + 90, hx + 120, lift), lerp(wy1 - 40, hy + 36, lift)];
  const mid = [(sh[0] + hand[0]) / 2 + 18, (sh[1] + hand[1]) / 2 + 20];
  part(C, tube(curve([sh, mid, hand]), 30, 26), { col: K.sky, p: 0.8, gap: 7, w: 9, ang: 1.4, seed: 1570, draw: f }, { w: 5, seed: 1571, draw: d });
  part(C, smooth([[hand[0] - 26, hand[1] - 4], [hand[0] - 10, hand[1] + 14], [hand[0] + 22, hand[1] + 12], [hand[0] + 34, hand[1] - 8], [hand[0] + 6, hand[1] - 2]], 4), { col: K.peach, p: 0.6, gap: 6, w: 8, seed: 1572, draw: f }, { w: 5, seed: 1573, draw: d });
  CAPS.forEach((tc, i) => {
    if (t < tc) return; const k = clamp(spring(t - tc, 11, 0.4), 0, 1.25);
    capsule(C, { x: hand[0] - 6 + i * 26, y: hand[1] - 14 - i * 4, s: 0.62 * k, r: -0.3 + i * 0.5, seed: 1580 + i * 10 });
    if (t < tc + 0.3) burst(FX, hand[0] + i * 26, hand[1] - 16, 34, pr(t, tc, tc + 0.3), 1590 + i * 9);
  });
}
function tube(pts, w0, w1) {   // wie rig.tube, lokal (vermeidet zweiten Import-Pfad)
  const n = pts.length, Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
    const w = (w0 + (w1 - w0) * i / (n - 1)) / 2; Lf.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rt.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return [...Lf, ...Rt.reverse()];
}

// ——— Untertitel: gedruckte Worte, ausgesparter Papierfleck ———
export function subTo(SUBK, SUBT, t) {
  const Sx = SUBS.find(s => t >= s.t0 && t < s.t1); if (!Sx) return;
  const rv = pr(t, Sx.t0, Sx.t0 + 0.35);
  const g = SUBK.g; g.save(); g.font = '400 54px "Patrick Hand"'; const tw = g.measureText(Sx.text).width; g.restore();
  const cx = 960, cy = 1002, hw = tw / 2 + 46, hh = 44;
  g.save(); g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fill(); g.restore();
  text(SUBT, Sx.text, cx, cy + 18, { size: 54, col: K.ink, reveal: rv, seed: 11 + Sx.t0 * 3, p: 1, stroke: 1.2 });
}
