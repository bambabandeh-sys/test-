// Die Bilderbuchseite (Welt 3200×1800, ganze Seite = CAM s 0.6):
// links Kuh + Kalb, Milchflasche, goldener Tropfen und Titel · Mitte Wiege, Ziege + Zicklein, großes Fragezeichen
// rechts Hütte, zwei Menschen mit Schalen, kleine Kuh + Ziege · ganz rechts das Haus am Morgen (Fenster = Erzähler)
// Himmel: weiße Wachswolken und „roroh.de“ in weißem Wachs – unsichtbar, bis die Wasserfarbe drüberstreicht.
import { line, fill, dab, ellipse, handCircle, smooth, text, sx, sy, CAM, W, H } from './crayon.js';
import { part, curve } from './rig.js';
import { PAL } from './pal.js';
import { hash, clamp, lerp, mulberry } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));
export const GROUND = 1490;
export const gy = x => GROUND + 10 * Math.sin(x * 0.013) + 6 * Math.sin(x * 0.041 + 1);

export const POS = {
  cow: [560, GROUND], calf: [700, GROUND], bottle: [1000, GROUND], drop: [1000, 1000], title: [870, 1045],
  cradle: [1330, GROUND], goat: [1600, GROUND], kid: [1820, GROUND],
  q: [1350, 820],
  hut: [1990, GROUND], goat2: [2010, GROUND + 6], A: [2200, GROUND], B: [2365, GROUND], cow2: [2530, GROUND],
  arc: [2250, GROUND + 10, 700],
  house: { x0: 2640, x1: 3040, top: 1130, apex: [2840, 890], win: [2680, 1170, 3000, 1440] },
  sunrise: [3070, 790], tree: [3150, GROUND],
  url: [1600, 390],
};

// ——— Boden ———
export function drawGround(F, L, p) {
  const bo = 0.6;
  const top = []; for (let x = -80; x <= 3560; x += 80) top.push([x, gy(x)]);
  fill(F, [...top, [3560, 1880], [-80, 1880]], { col: K.green, p: 0.72, gap: 12, w: 13, ang: 1.25, seed: 11, draw: p.gf, boil: 0, over: 10 });
  line(L, top, { w: 7, seed: 12, draw: p.gl, boil: bo, col: K.green, p: 0.95 });
  for (let i = 0; i < 30; i++) { const x = 40 + i * 118 + hash(i) * 60, y = 1560 + hash(i + 3) * 200; line(L, [[x - 10, y + 8], [x - 4, y - 14], [x + 2, y + 6], [x + 9, y - 12], [x + 14, y + 8]], { w: 4.5, seed: 20 + i, col: K.green, p: 0.9 * p.gf, boil: bo, draw: p.gf }); }
  if (p.gf > 0.6) [[180, 1600, K.pink], [880, 1640, K.yellow], [1480, 1600, K.pink], [2150, 1650, K.yellow], [2700, 1600, K.pink], [3050, 1660, K.yellow]].forEach(([x, y, c], i) => {
    line(L, [[x, y + 40], [x + 2, y + 8]], { w: 5, col: K.green, seed: 60 + i, boil: bo });
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; dab(F, x + Math.cos(a) * 11, y + Math.sin(a) * 11, 8, { col: c, p: 0.85, seed: 70 + i * 5 + k, boil: 0 }); }
    dab(F, x, y, 6, { col: K.orange, p: 0.9, seed: 99 + i, boil: 0 });
  });
}

// ——— Milchflasche (+ rotes Kreuz) ———
export function drawBottle(F, L, d, f, x1, x2) {
  if (d <= 0) return;
  const [x, y] = POS.bottle, bo = 0.8;
  const b = smooth([[x - 58, y - 4], [x - 62, y - 130], [x - 30, y - 168], [x - 26, y - 206], [x + 26, y - 206], [x + 30, y - 168], [x + 62, y - 130], [x + 58, y - 4]], 4, true);
  fill(F, [[x - 56, y - 8], [x - 58, y - 120], [x + 58, y - 120], [x + 56, y - 8]], { col: K.sky, p: 0.35, gap: 9, w: 11, seed: 300, draw: f, boil: 0 });
  line(L, b, { w: 7, seed: 301, draw: d, boil: bo });
  fill(F, [[x - 30, y - 206], [x + 30, y - 206], [x + 30, y - 236], [x - 30, y - 236]], { col: K.red, p: 0.9, gap: 6, w: 8, seed: 302, draw: f, boil: 0 });
  line(L, [[x - 30, y - 206], [x - 30, y - 236], [x + 30, y - 236], [x + 30, y - 206]], { w: 6, seed: 303, draw: d, boil: bo });
  line(L, [[x - 36, y - 60], [x - 6, y - 64]], { w: 5, col: K.white, p: 1, seed: 304, draw: f, boil: 0 });
  // durchgestrichen
  if (x1 > 0) line(L, [[x - 100, y - 250], [x + 96, y + 10]], { w: 16, col: K.red, p: 1, seed: 310, draw: x1, boil: 1, taper: 0.15 });
  if (x2 > 0) line(L, [[x + 100, y - 246], [x - 92, y + 8]], { w: 16, col: K.red, p: 1, seed: 311, draw: x2, boil: 1, taper: 0.15 });
}

// ——— Fragezeichen ———
export function drawQ(L, d, dot) {
  if (d <= 0) return;
  const [x, y] = POS.q;
  const hook = curve([[x - 130, y - 110], [x - 120, y - 210], [x, y - 240], [x + 125, y - 200], [x + 120, y - 90], [x + 10, y - 20], [x, y + 60], [x, y + 110]], 8);
  line(L, hook, { w: 30, seed: 330, draw: d, boil: 0.8, p: 1, taper: 0.12 });
  if (dot > 0) fill(L, handCircle(x + 2, y + 190, 30 * clamp(dot * 1.5), 331, 0, 20), { col: K.ink, p: 1, gap: 5, w: 8, seed: 332, over: 1, boil: 0.8 });
}

// ——— Hütte (Region 3) ———
export function drawHut(F, L, d, f) {
  if (d <= 0) return;
  const [x, y] = POS.hut, bo = 0.6;
  const wall = [[x - 110, y], [x - 110, y - 150], [x + 110, y - 150], [x + 110, y]];
  fill(F, wall, { col: K.ochre, p: 0.85, gap: 10, w: 12, ang: -0.5, seed: 340, draw: f, boil: 0, cross: true, crossP: 0.5 });
  const roof = [[x - 150, y - 140], [x, y - 300], [x + 150, y - 140]];
  fill(F, roof, { col: K.brown, p: 0.85, gap: 9, w: 11, ang: 1.1, seed: 341, draw: f, boil: 0, cross: true, crossP: 0.5 });
  fill(F, [[x - 34, y], [x - 34, y - 90], [x + 34, y - 90], [x + 34, y]], { col: K.ink, p: 0.7, gap: 7, w: 9, ang: 1.4, seed: 342, draw: f, boil: 0 });
  line(L, wall, { w: 8, seed: 343, draw: d, boil: bo });
  line(L, [...roof, roof[0]], { w: 8, seed: 344, draw: d, boil: bo });
  line(L, [[x - 34, y], [x - 34, y - 90], [x + 34, y - 90], [x + 34, y]], { w: 7, seed: 345, draw: d, boil: bo });
  if (f > 0.6) for (let i = 1; i <= 4; i++) { const u = i / 5, yy = lerp(y - 300, y - 140, u) + 6, hw = 150 * u - 16; line(L, [[x - hw, yy], [x, yy + 6], [x + hw, yy]], { w: 4, col: K.ochre, p: 0.75, seed: 350 + i, boil: bo }); }
}

// ——— Haus am Morgen (Region 4) ———
export function drawHouse(F, L, d, f) {
  if (d <= 0) return;
  const Hh = POS.house, bo = 0.6, [wx0, wy0, wx1, wy1] = Hh.win;
  const front = [[Hh.x0, GROUND], [Hh.x0, Hh.top], [Hh.x1, Hh.top], [Hh.x1, GROUND]];
  const roof = [[Hh.x0 - 50, Hh.top + 10], Hh.apex, [Hh.x1 + 50, Hh.top + 10]];
  const chim = [[2930, 950], [2990, 950], [2990, 1010], [2930, 1010]];
  fill(F, [[2930, 930], [2990, 930], [2990, 1000], [2930, 1000]], { col: K.brown, p: 0.85, gap: 8, w: 10, ang: 1.5, seed: 360, draw: f, boil: 0 });
  // Wand ohne das Fenster: vier Streifen, damit das Fenster frei bleibt
  [[[Hh.x0, Hh.top], [Hh.x1, Hh.top], [Hh.x1, wy0], [Hh.x0, wy0]], [[Hh.x0, wy1], [Hh.x1, wy1], [Hh.x1, GROUND], [Hh.x0, GROUND]],
   [[Hh.x0, wy0], [wx0, wy0], [wx0, wy1], [Hh.x0, wy1]], [[wx1, wy0], [Hh.x1, wy0], [Hh.x1, wy1], [wx1, wy1]]].forEach((q, i) =>
    fill(F, q, { col: K.pink, p: 0.85, gap: 10, w: 12, ang: -0.5, seed: 361 + i, draw: f, boil: 0, cross: true, crossP: 0.5, over: 3 }));
  fill(F, roof, { col: K.red, p: 0.85, gap: 11, w: 13, ang: 0.62, seed: 366, draw: f, boil: 0, cross: true, crossP: 0.45 });
  line(L, [...roof], { w: 8, seed: 367, draw: d, boil: bo });
  line(L, [[Hh.x0 - 50, Hh.top + 10], [Hh.x1 + 50, Hh.top + 10]], { w: 8, seed: 368, draw: pr(d, 0.1, 1), boil: bo });
  line(L, [front[0], front[1]], { w: 8, seed: 369, draw: pr(d, 0.2, 1), boil: bo });
  line(L, [front[2], front[3]], { w: 8, seed: 370, draw: pr(d, 0.25, 1), boil: bo });
  line(L, [[Hh.x0 - 20, GROUND], [Hh.x1 + 20, GROUND]], { w: 8, seed: 371, draw: pr(d, 0.3, 1), boil: bo });
  line(L, [[2930, 1004], [2930, 930], [2990, 930], [2990, 976]], { w: 7, seed: 372, draw: pr(d, 0.35, 1), boil: bo });
  line(L, [[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1], [wx0, wy0]], { w: 9, seed: 373, draw: pr(d, 0.4, 1), boil: bo, col: K.brown });
  line(L, [[wx0 - 14, wy1 + 6], [wx1 + 14, wy1 + 6]], { w: 11, seed: 374, draw: pr(d, 0.5, 1), boil: bo, col: K.brown });
  // Baum rechts vom Haus
  const [tx, ty] = POS.tree;
  fill(F, [[tx - 22, ty], [tx - 20, ty - 180], [tx + 22, ty - 180], [tx + 20, ty]], { col: K.brown, p: 0.85, gap: 9, w: 11, ang: 1.5, seed: 380, draw: f, boil: 0 });
  const crown = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283; const b = 1 + 0.09 * Math.abs(Math.sin(a * 4.5)); crown.push([tx + Math.cos(a) * 130 * b, ty - 290 + Math.sin(a) * 130 * b]); }
  fill(F, crown, { col: K.green, p: 0.78, gap: 12, w: 14, ang: 0.8, seed: 381, draw: f, boil: 0, cross: true, crossP: 0.45 });
  line(L, crown, { w: 7.5, seed: 382, draw: d, boil: bo });
  line(L, [[tx - 22, ty], [tx - 20, ty - 170]], { w: 7, seed: 383, draw: d, boil: bo }); line(L, [[tx + 22, ty], [tx + 20, ty - 170]], { w: 7, seed: 384, draw: d, boil: bo });
  if (f > 0.7) [[tx - 60, ty - 320], [tx + 50, ty - 260], [tx - 20, ty - 220], [tx + 70, ty - 350]].forEach(([x, y], i) => dab(F, x, y, 13, { col: K.red, p: 0.85, seed: 390 + i, boil: 0 }));
}

// ——— Weißes Wachs im Himmel: „roroh.de“, Wolken, kleine Tropfen ———
export const CLOUDS = [[300, 250, 170, 70], [600, 640, 130, 52], [2680, 230, 190, 76], [2980, 560, 140, 56], [2260, 610, 120, 48], [150, 820, 110, 44]];
// Wachs in Papierfarbe: vor der Wasserfarbe praktisch unsichtbar, danach papierweiß im Blau
const WAXC = '#f4efe3';
export function drawWax(G) {
  const [ux, uy] = POS.url;
  text(G.f, 'roroh.de', sx(ux), sy(uy), { size: 300 * CAM.s, font: 'Gaegu', weight: 700, col: WAXC, p: 1, stroke: 14 * CAM.s, seed: 501, boil: 0.3 });
  CLOUDS.forEach(([x, y, rx, ry], i) => {
    const pts = []; for (let k = 0; k <= 60; k++) { const a = k / 60 * 6.283; const b = 1 + 0.18 * Math.abs(Math.sin(a * 3 + i)); pts.push([x + Math.cos(a) * rx * b, y + Math.sin(a) * ry * b * (Math.sin(a) > 0 ? 0.7 : 1)]); }
    fill(G.f, pts, { col: WAXC, p: 1.1, gap: 6, w: 10, ang: 0.3, seed: 520 + i, boil: 0.2, cross: true, crossP: 1 });
  });
  // kleine weiße Tropfen/Funken um die Adresse
  [[880, 300], [2330, 290], [1000, 520], [2200, 520], [760, 450], [2440, 440]].forEach(([x, y], i) => {
    const r = 18 + 6 * hash(i); const pts = [];
    for (let k = 0; k <= 30; k++) { const a = k / 30 * Math.PI * 2; const px = Math.sin(a), py = Math.cos(a); const kk = py < 0 ? -py : 0; pts.push([x + px * r * (1 - 0.8 * kk), y + py * r * (py < 0 ? 1.5 : 1)]); }
    fill(G.f, pts, { col: WAXC, p: 1.1, gap: 3.5, w: 6, seed: 540 + i, boil: 0.2, over: 0.5 });
  });
}

// ——— Wasserfarbe: zwei Pinselbahnen über den Himmel ———
export const BANDS = [
  { y0: -140, y1: 660, t0: 24.5, t1: 26.5, dir: 1, seed: 1 },
  { y0: 560, y1: 1500, t0: 26.6, t1: 28.7, dir: -1, seed: 2 },
];
const X0 = -300, X1 = 3600;
export function bandFront(b, t) { const u = clamp((t - b.t0) / (b.t1 - b.t0)); const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; const v = 0.15 * u + 0.85 * e; return b.dir > 0 ? lerp(X0, X1, v) : lerp(X1, X0, v); }
export function bandTime(b, x) {   // wann die Pinselkante bei x vorbeikommt
  for (let k = 0; k <= 400; k++) { const t = b.t0 + (b.t1 - b.t0) * k / 400; const f = bandFront(b, t); if (b.dir > 0 ? f >= x : f <= x) return t; } return b.t1;
}
export function drawWash(LW, t) {
  const g = LW.g; g.save();
  g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s);
  for (const b of BANDS) {
    if (t < b.t0) continue;
    const f = bandFront(b, t), moving = t < b.t1;
    const top = [], bot = [];
    for (let x = X0; x <= X1; x += 40) {
      top.push([x, b.y0 + 8 * Math.sin(x * 0.021 + b.seed) + 10 * hash(x * 0.37 + b.seed)]);
      bot.push([x, b.y1 + 8 * Math.sin(x * 0.019 + b.seed * 2) + 10 * hash(x * 0.71 + b.seed)]);
    }
    const frontX = y => f + b.dir * 70 * Math.sin(clamp((y - b.y0) / (b.y1 - b.y0)) * Math.PI) + 12 * Math.sin(y * 0.05);
    g.save(); g.beginPath();
    if (b.dir > 0) { g.moveTo(X0 - 50, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(X0 - 50, b.y1 + 200); }
    else { g.moveTo(X1 + 50, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(X1 + 50, b.y1 + 200); }
    g.closePath(); g.clip();
    const shape = new Path2D(); top.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) shape.lineTo(bot[i][0], bot[i][1]); shape.closePath();
    g.fillStyle = '#000'; g.globalAlpha = 0.62; g.fill(shape);
    g.save(); g.clip(shape);
    const R = mulberry(b.seed * 97);
    for (let i = 0; i < 26; i++) {
      const yy = lerp(b.y0, b.y1, R()), wdt = 6 + R() * 26, dark = R() < 0.55;
      g.beginPath(); for (let x = X0; x <= X1; x += 60) { const y = yy + 14 * Math.sin(x * 0.002 + i) + 6 * Math.sin(x * 0.01 + i * 2); x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineWidth = dark ? wdt : wdt * 0.4; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.12 + R() * 0.1 : 0.04 + R() * 0.06; g.strokeStyle = '#000'; g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); for (let y = b.y0 - 80; y <= b.y1 + 80; y += 16) { const x = frontX(y) - b.dir * 14; y === b.y0 - 80 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.lineWidth = moving ? 34 : 22; g.globalAlpha = moving ? 0.28 : 0.12; g.stroke();
    g.restore(); g.restore();
  }
  g.restore();
}
