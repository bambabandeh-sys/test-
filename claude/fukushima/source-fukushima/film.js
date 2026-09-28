// Fukushima Daiichi, 11. März 2011 — die letzten Minuten vor der Katastrophe. Holzschnitt, 20 s.
// Sechs Platten (Einstellungen), harte Schnitte als neue Abzüge. Einzige Farbe: das Rot der Alarmlampen.
// Licht ist geschnitten: Beim Stromausfall werden die Schnitte wieder schwarz eingefärbt.
import * as WC from './engine/index.js';
import * as ST from './stage.js';
import { clamp, lerp, seg, ss, eo, ei, mulberry, hash } from '/core/lib.js';

const W = 1920, H = 1080, PW = ST.PW, PH = ST.PH, PI = Math.PI;
const { m, c } = ST;
export const DUR = 20;
export let EV = [];
const RED = '#C43A2A';

// —— Zeitplan ——
const T = {
  A: [0, 4.0], quake: 2.3, B: [4.0, 7.0], C: [7.0, 10.0], D: [10.0, 13.2], E: [13.2, 16.9], F1: [16.9, 18.5], F2: [18.5, 20.0],
  dark0: 14.0, dark1: 15.9, black: 16.3, click: 16.95,
};
export const SUBS = [
  { t0: 0.3, t1: 3.95, text: '11. März 2011 · 14:46 · Kernkraftwerk Fukushima Daiichi' },
  { t0: 4.05, t1: 6.95, text: 'Erdbeben, Stärke 9,0 – die Reaktoren schalten ab' },
  { t0: 7.05, t1: 9.95, text: 'Notstrom läuft. Die Kühlung hält.' },
  { t0: 10.05, t1: 13.15, text: '15:35 – der Tsunami, rund 14 Meter hoch' },
  { t0: 13.25, t1: 16.2, text: '15:37 – Stromausfall' },
  { t0: 17.1, t1: 20.0, text: 'Ohne Strom keine Kühlung.' },
];

// —— Kontrollraum-Geometrie (Plattenkoordinaten 1848×912) ——
const CAB = [0, 1, 2, 3, 4].map(i => ({ x0: 60 + i * 346, x1: 60 + (i + 1) * 346 }));
const LAMPS = [];            // Melde-Fenster: {x,y,w,h,cab,row,col,alarm}
CAB.forEach((cb, i) => { for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) LAMPS.push({ x: cb.x0 + 26 + k * 50, y: 104 + r * 34, w: 40, h: 24, cab: i, row: r, col: k, alarm: hash(i * 31 + r * 7 + k) < 0.55 }); });
const GAUGES = []; CAB.forEach((cb, i) => { if (i === 2) return; [0, 1].forEach(k => GAUGES.push({ x: cb.x0 + 96 + k * 156, y: 300, r: 48, cab: i, k })); });
const SW = []; CAB.forEach((cb, i) => { for (let k = 0; k < 7; k++) SW.push({ x: cb.x0 + 40 + k * 44, y: 470, r: 11, cab: i }); });
const CEIL = [[150, 450], [600, 900], [950, 1250], [1400, 1700]];

let R = null;    // gebaute Strichlisten (einmal beim Start)
const light = WC.light;
const KY = (x, y) => y / PH;

function buildRoom() {
  const o = {};
  // Deckenleuchten: breite U-Schnitte
  o.ceil = CEIL.flatMap(([a, b], i) => [0, 1, 2].flatMap(k => WC.cutAlong([[a, 22 + k * 7], [b, 22 + k * 7]], { w: 7, kind: 'u', seg: [120, 300], gap: [0, 2], seed: 10 + i * 3 + k, reveal: { t0: 0.1, t1: 0.7, speed: 1800 } })));
  // Schrankfugen + Rahmen
  o.frame = [WC.cutAlong([[56, 76], [1792, 76], [1792, 546], [56, 546]], { closed: true, w: 3, kind: 'k', seed: 20, reveal: { t0: 0.15, t1: 0.9, speed: 3000 } }),
    ...CAB.slice(1).map((cb, i) => WC.cutAlong([[cb.x0, 80], [cb.x0, 542]], { w: 2.5, kind: 'k', seed: 21 + i, reveal: { t0: 0.3, t1: 1.0, speed: 2000 } }))].flat();
  // Rahmen der Meldefenster (immer da), Messuhren (Ring + Skala), Schalter
  o.lampFrames = LAMPS.flatMap((L, i) => WC.cutAlong(WC.rect(L.x, L.y, L.w, L.h), { closed: true, w: 1.8, kind: 'k', seg: [200, 300], gap: [0, 1], seed: 100 + i, reveal: { t0: 0.35 + L.cab * 0.12, t1: 1.3, speed: 2400 } }));
  o.gauges = GAUGES.flatMap((G, i) => {
    const ring = WC.cutAlong(WC.ellipse(G.x, G.y, G.r, G.r, 48), { closed: true, w: 3.5, kind: 'v', seg: [300, 400], gap: [0, 1], seed: 300 + i, reveal: { t0: 0.6 + G.cab * 0.1, t1: 1.5, speed: 1600 } });
    const ticks = []; for (let k = 0; k <= 10; k++) { const a = PI * (0.8 + 1.4 * k / 10); ticks.push(WC.mkStroke([[G.x + Math.cos(a) * G.r * 0.72, G.y + Math.sin(a) * G.r * 0.72], [G.x + Math.cos(a) * G.r * 0.88, G.y + Math.sin(a) * G.r * 0.88]], k % 5 ? 2 : 3.2, { kind: 'k', seed: 330 + i * 11 + k })); }
    ticks.forEach(s => { s.t0 = 0.9 + G.cab * 0.1; s.dur = 0.1; });
    return [...ring, ...ticks];
  });
  o.sw = SW.flatMap((s, i) => WC.cutAlong(WC.ellipse(s.x, s.y, s.r, s.r, 20), { closed: true, w: 2.2, kind: 'k', seg: [200, 300], gap: [0, 1], seed: 500 + i, reveal: { t0: 1.0 + s.cab * 0.08, t1: 1.6, speed: 2000 } }));
  // Mimik-Schema im Mittelschrank: Reaktordruckbehälter + Leitungen
  const cx = 925, cy = 330;
  const vessel = []; for (let k = 0; k <= 40; k++) { const a = PI * 2 * k / 40; vessel.push([cx + Math.cos(a) * 58, cy + Math.sin(a) * 118 * (Math.abs(Math.sin(a)) > 0.6 ? 1 : 0.94)]); }
  o.mimic = [...WC.cutAlong(vessel, { closed: true, w: 4, kind: 'v', seed: 600, reveal: { t0: 0.8, t1: 1.4, speed: 1400 } }),
    ...[[[cx - 58, cy - 60], [cx - 150, cy - 60], [cx - 150, cy + 160]], [[cx + 58, cy - 60], [cx + 150, cy - 60], [cx + 150, cy + 160]], [[cx - 150, cy + 160], [cx + 150, cy + 160]], [[cx, cy + 118], [cx, cy + 160]]]
      .flatMap((P, i) => WC.cutAlong(P, { w: 3, kind: 'k', seg: [100, 200], gap: [2, 5], seed: 610 + i, reveal: { t0: 1.0, t1: 1.6, speed: 1500 } }))];
  // Pult (Streiflicht von oben) + Boden
  const desk = [[90, 600], [1760, 600], [1800, 660], [50, 660]];
  o.desk = WC.shape([desk], { light: light(0, -.9, .45), sp: 9, halo: 0, dir: 0, lo: .25, hi: .9, seed: 700, reveal: { t0: 0.4, t1: 1.6, key: (x, y) => x / PW } });
  const floor = WC.Region ? new WC.Region([[[0, 760], [PW, 760], [PW, PH], [0, PH]]], { res: 2 }) : null;
  o.floor = WC.hatch(floor, { dir: () => 0.02, tone: (x, y) => 0.25 + 0.35 * (1 - Math.abs(x - PW / 2) / PW) * clamp((y - 760) / 150), sp: 11, kind: 'v', seed: 710, reveal: { t0: 0.5, t1: 1.8, key: (x, y) => y / PH } });
  // Wand unter dem Pult-Rand (zwischen Panel und Pult): wenige waagrechte Schnitte
  const wall = new WC.Region([[[0, 552], [PW, 552], [PW, 598], [0, 598]]], { res: 2 });
  o.wall = WC.hatch(wall, { dir: () => 0, tone: () => 0.35, sp: 12, kind: 'v', seed: 720, reveal: { t0: 0.5, t1: 1.2, key: (x) => x / PW } });
  // Bediener von hinten (sitzend) + ein stehender Schichtleiter im Profil
  o.ops = [[520, 540], [1120, 548]].map(([x, y], i) => {
    const P = [];
    for (let k = 0; k <= 30; k++) { const a = PI * 2 * k / 30; P.push([x + Math.cos(a) * 36, y + Math.sin(a) * 40]); }
    const body = [[x - 30, y + 30], [x + 30, y + 30], [x + 44, y + 48], [x + 96, y + 70], [x + 112, y + 230], [x - 112, y + 230], [x - 96, y + 70], [x - 44, y + 48]];
    return { head: WC.shape([P], { light: light(.2, -.8, .35), sp: 7, halo: 6, seed: 800 + i * 10, reveal: { t0: 1.2, t1: 2.0, key: KY } }),
      body: WC.shape([body], { light: light(.3, -.85, .3), sp: 8, halo: 7, seed: 805 + i * 10, reveal: { t0: 1.1, t1: 2.0, key: KY } }), x, y };
  });
  const sx = 1560, sy = 340;   // Schichtleiter: Kopf, Körper, Arm
  const sHead = WC.ellipse(sx, sy, 34, 40, 36);
  const sFace = [[sx - 30, sy - 18], [sx - 44, sy - 2], [sx - 38, sy + 8], [sx - 42, sy + 16], [sx - 30, sy + 28], [sx - 8, sy + 38], [sx + 6, sy + 12], [sx - 4, sy - 22]];
  const sBody = [[sx - 30, sy + 40], [sx + 40, sy + 42], [sx + 60, sy + 120], [sx + 56, sy + 300], [sx + 40, sy + 470], [sx - 10, sy + 470], [sx - 16, sy + 300], [sx - 44, sy + 120]];
  o.boss = { head: WC.shape([sHead], { light: light(-.6, -.6, .4), sp: 7, halo: 6, seed: 900, reveal: { t0: 1.3, t1: 2.1, key: KY } }),
    face: WC.shape([sFace], { white: true, light: light(-.8, -.3, .5), sp: 5, seed: 905, reveal: { t0: 1.5, t1: 2.1, key: KY } }),
    body: WC.shape([sBody], { light: light(-.7, -.5, .35), sp: 8, halo: 7, seed: 910, reveal: { t0: 1.2, t1: 2.1, key: KY } }), x: sx, y: sy };
  return o;
}

// —— Gesichter (für Einstellung C und F2): Haut hell geschnitten, Züge schwarz ——
function buildFace(cx, cy, s, L, seed) {
  const head = WC.ellipse(cx, cy, 120 * s, 150 * s, 64);
  const hair = []; for (let k = 0; k <= 30; k++) { const a = PI + PI * k / 30; hair.push([cx + Math.cos(a) * 128 * s, cy - 30 * s + Math.sin(a) * 140 * s]); } hair.push([cx + 120 * s, cy - 10 * s], [cx + 90 * s, cy - 70 * s], [cx - 60 * s, cy - 84 * s], [cx - 120 * s, cy - 10 * s]);
  const neck = [[cx - 60 * s, cy + 120 * s], [cx + 60 * s, cy + 120 * s], [cx + 70 * s, cy + 200 * s], [cx - 70 * s, cy + 200 * s]];
  const body = [[cx - 70 * s, cy + 190 * s], [cx + 70 * s, cy + 190 * s], [cx + 250 * s, cy + 260 * s], [cx + 300 * s, cy + 420 * s], [cx - 300 * s, cy + 420 * s], [cx - 250 * s, cy + 260 * s]];
  return {
    body: WC.shape([body], { light: L, sp: 9, halo: 8, seed }),
    neck: WC.shape([neck], { white: true, light: L, sp: 6, seed: seed + 1 }),
    face: WC.shape([head], { white: true, light: L, sp: 6, R: 90, seed: seed + 2, halo: 6 }),
    hair: WC.shape([hair], { light: L, sp: 6, seed: seed + 3 }), cx, cy, s,
  };
}
// Gesichtszüge: schwarz auf der hellen Haut. look = [dx,dy], brow = Anspannung 0..1, mouth 0..1 offen
function features(g, F, o = {}) {
  const { cx, cy, s } = F, [lx, ly] = o.look || [0, 0], br = o.brow ?? 0, mo = o.mouth ?? 0;
  g.fillStyle = '#000';
  [-1, 1].forEach(k => {
    const ex = cx + k * 44 * s, ey = cy + 4 * s;
    g.beginPath(); g.ellipse(ex, ey, 22 * s, (o.wide ? 13 : 10) * s, 0, 0, PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + lx * 8 * s + 5 * s, ey + ly * 4 * s - 2 * s, 5 * s, 5 * s, 0, 0, PI * 2); g.fill(); g.fillStyle = '#000';
    // Brauen: innen hoch = Schreck/Sorge
    g.lineWidth = 9 * s; g.lineCap = 'round'; g.strokeStyle = '#000';
    g.beginPath(); g.moveTo(ex - k * 26 * s, ey - 32 * s - br * 22 * s); g.quadraticCurveTo(ex, ey - 42 * s - br * 12 * s, ex + k * 26 * s, ey - 30 * s - br * 2 * s); g.stroke();   // innen hoch = Schreck
  });
  g.lineWidth = 6 * s; g.beginPath(); g.moveTo(cx + 4 * s, cy + 10 * s); g.lineTo(cx + 14 * s, cy + 54 * s); g.lineTo(cx - 4 * s, cy + 60 * s); g.stroke();
  if (mo > 0.1) { g.beginPath(); g.ellipse(cx, cy + 92 * s, 22 * s, 8 * s + 18 * mo * s, 0, 0, PI * 2); g.fill(); }
  else { g.lineWidth = 7 * s; g.beginPath(); g.moveTo(cx - 26 * s, cy + 92 * s); g.quadraticCurveTo(cx, cy + 96 * s, cx + 26 * s, cy + 92 * s); g.stroke(); }
}

let FC = null, FF = null;
export async function init() {
  R = buildRoom();
  FC = [buildFace(640, 400, 1.05, light(.45, -.7, .5), 1000), buildFace(1230, 450, 0.95, light(-.35, -.75, .5), 1100)];
  FF = buildFace(760, 420, 1.2, light(.1, .9, .45), 1200);          // von unten angeleuchtet (Taschenlampe)
  buildEvents();
}

// —— Hilfen ——
const step12 = t => Math.floor(t * 12) / 12;
const jolt = lt => lt < 1 / 24 ? [5, -3] : lt < 2 / 24 ? [-2, 1] : [0, 0];
const shake = (t, amp) => { const q = step12(t) * 12; return [amp * (hash(q * 1.7) - .5) * 2, amp * (hash(q * 3.1 + 5) - .5) * 2, amp * 0.0012 * (hash(q * 2.3 + 9) - .5)]; };
function captionAt(t) { for (const s of SUBS) if (t >= s.t0 && t < s.t1) return { text: s.text, a: Math.min(seg(t, s.t0, s.t0 + .1), 1 - seg(t, s.t1 - .15, s.t1)) }; return null; }
function printFrame(g, t, cam, draw, o = {}) {
  ST.begin(cam); draw(m, c); ST.end();
  const cp = captionAt(t); if (cp) ST.caption(cp.text, cp.a);
  const out = ST.printer().render(ST.M, ST.C, { seed: o.seed ?? 3, inkSeed: o.inkSeed ?? 3, reg: o.reg || [3, 2], plate: RED });
  const j = o.jolt || [0, 0];
  g.fillStyle = '#EFE8D8'; g.fillRect(0, 0, W, H); g.drawImage(out, j[0], j[1]);
}

// Lampenzustand: 0 aus, 1 weiß, 2 rot (Alarm, blinkt)
function lampState(L, t) {
  if (t < 0.4 + L.cab * 0.12 + 0.6) return 0;
  const q = step12(t);
  if (t >= T.dark0) { const off = T.dark0 + (L.cab / 5) * (T.dark1 - T.dark0 - 0.5) + hash(L.row * 5 + L.col) * 0.4; if (t > off) return 0; if (t > off - 0.25) return hash(q * 13 + L.col) < .5 ? 0 : 1; }
  if (t > T.quake && t < T.C[0] + 1.2) { if (L.alarm) return hash(q * 7.7 + L.cab * 3 + L.row * 11 + L.col) < 0.62 ? 2 : 0; return 1; }
  if (t >= T.C[0] + 1.2 && L.alarm && L.row === 0 && L.col < 2) return 2;      // ein paar Meldungen bleiben stehen
  return (L.row + L.col + L.cab) % 3 === 0 ? 1 : 0;
}
function drawLamps(g, cc, t) {
  for (const L of LAMPS) {
    const s = lampState(L, t); if (!s) continue;
    g.fillStyle = '#fff'; g.fillRect(L.x + 3, L.y + 3, L.w - 6, L.h - 6);
    if (s === 2) { cc.fillStyle = '#000'; cc.fillRect(L.x + 1, L.y + 1, L.w - 2, L.h - 2); }
  }
}
// Zeiger: Reaktorleistung fällt nach dem Beben (Messuhren links = Leistung, rechts = Diesel)
function drawNeedles(g, t, dead = false) {
  for (const G of GAUGES) {
    let v = G.k === 0 ? 0.78 : 0.2;
    if (G.k === 0 && t > T.quake + 0.6) v = lerp(0.78, 0.04, eo(seg(t, T.quake + 0.6, T.quake + 3.2)));
    if (G.k === 1 && t > T.quake + 2.2) v = lerp(0.2, 0.66, eo(seg(t, T.quake + 2.2, T.quake + 4.2)));
    if (t > T.quake && t < T.C[0]) v += 0.03 * Math.sin(step12(t) * 40 + G.x);
    if (t >= T.dark0 + 0.8) v = lerp(v, 0.0, eo(seg(t, T.dark0 + 0.8, T.dark1)));
    if (dead) v = 0;
    const a = PI * (0.8 + 1.4 * v);
    const s = WC.mkStroke([[G.x, G.y], [G.x + Math.cos(a) * G.r * 0.8, G.y + Math.sin(a) * G.r * 0.8]], [4.5, 1.5], { kind: 'k', seed: G.x });
    WC.drawStrokes(g, [s], { t: 1e9 });
  }
}

// —— Einstellungen ——
function roomPlate(g, cc, t, { dark = null } = {}) {
  WC.drawStrokes(g, R.ceil, { t }); WC.drawStrokes(g, R.frame, { t }); WC.drawStrokes(g, R.lampFrames, { t });
  WC.drawStrokes(g, R.gauges, { t }); WC.drawStrokes(g, R.sw, { t }); WC.drawStrokes(g, R.mimic, { t });
  if (t > 1.2) drawNeedles(g, t);
  drawLamps(g, cc, t);
  WC.drawStrokes(g, R.wall, { t }); WC.drawStrokes(g, R.floor, { t });
  R.desk.draw(g, t);
  R.ops.forEach(o => { o.body.draw(g, t); o.head.draw(g, t); });
  R.boss.body.draw(g, t); R.boss.head.draw(g, t); R.boss.face.draw(g, t);
  // Schichtleiter: Arm zeigt aufs Panel (beim Beben hoch)
  if (t < 1.9) return dark ? null : undefined;   // Arm erst, wenn der Schichtleiter geschnitten ist
  const up = ss(seg(t, T.quake + 0.3, T.quake + 0.9));
  const bx = R.boss.x, by = R.boss.y;
  const hand = [lerp(bx - 60, bx - 170, up), lerp(by + 250, by + 60, up)];
  g.fillStyle = '#000'; g.lineCap = 'round'; g.strokeStyle = '#000'; g.lineWidth = 34;
  g.beginPath(); g.moveTo(bx - 10, by + 70); g.quadraticCurveTo(lerp(bx - 50, bx - 90, up), lerp(by + 170, by + 80, up), hand[0], hand[1]); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx - 4, by + 80); g.quadraticCurveTo(lerp(bx - 40, bx - 84, up), lerp(by + 170, by + 70, up), hand[0] + 6, hand[1] - 16); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(hand[0], hand[1], 14, 11, -0.6, 0, PI * 2); g.fill();
  // Profil-Auge des Schichtleiters (aufgerissen während Beben/Stromausfall)
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(bx - 24, by - 4, 5, t > T.quake && t < 9 || t > T.dark0 ? 6 : 3.5, 0, 0, PI * 2); g.fill();
  if (dark) {   // Stromausfall: Schnitte werden wieder schwarz eingefärbt (von links nach rechts), bis alles Holz ist
    const k = seg(t, T.dark0, T.dark1);
    const x = lerp(-200, PW + 200, eo(k));
    g.save(); g.fillStyle = '#000'; g.beginPath();
    // ausgefranste Einfärbekante (Walze)
    g.moveTo(-10, -10); for (let y = -10; y <= PH + 10; y += 24) g.lineTo(x + 40 * Math.sin(y * 0.05) + 30 * (hash(y) - .5), y); g.lineTo(-10, PH + 10); g.closePath(); g.fill(); g.restore();
    cc.clearRect(-10, -10, x + 60, PH + 20);
  }
}

function shotA(g, t, lt) {   // Kontrollraum total, wird geschnitten; Beben ab 2,3 s
  const q = t > T.quake ? shake(t, 14 * (1 - 0.3 * seg(t, 3.5, 4))) : [0, 0, 0];
  const z = lerp(1.35, 1.0, eo(seg(t, 0, 2.2)));
  printFrame(g, t, { x: PW / 2 + q[0], y: PH / 2 + 30 * (1 - seg(t, 0, 2.2)) + q[1], z, r: q[2] }, (g, cc) => roomPlate(g, cc, t), { inkSeed: 3 + Math.floor(t * 12) % 2 });
}
function shotB(g, t, lt) {   // Nah: Meldefenster blinken rot, Zeiger fällt
  const q = shake(t, 10 * (1 - seg(lt, 2.2, 3.0)));
  printFrame(g, t, { x: 580 + q[0] + lt * 12, y: 250 + q[1], z: 2.5 + lt * 0.05, r: q[2] }, (g, cc) => roomPlate(g, cc, t), { jolt: jolt(lt), inkSeed: 5 });
}
function shotC(g, t, lt) {   // Zwei Gesichter: das Beben endet, Erleichterung
  const q = shake(t, 4 * (1 - seg(lt, 0, 0.8)));
  printFrame(g, t, { x: PW / 2 + q[0], y: PH / 2 + 20 - lt * 6, z: 1.0 + lt * 0.02 }, (g, cc) => {
    // Hintergrund: unscharfes Panel = ein paar geschnittene Fenster
    for (let i = 0; i < 26; i++) { const x = 60 + hash(i) * 1720, y = 60 + hash(i + 40) * 300; g.fillStyle = '#fff'; g.fillRect(x, y, 30, 18); if (i % 7 === 0) { cc.fillStyle = '#000'; cc.fillRect(x, y, 30, 18); } }
    const relief = ss(seg(lt, 1.2, 2.2));
    FC.forEach((F, i) => {
      F.body.draw(g); F.neck.draw(g); F.face.draw(g); F.hair.draw(g);
      features(g, F, { look: i === 0 ? [lerp(.6, .2, relief), lerp(-1, -.3, relief)] : [lerp(-.6, -.2, relief), lerp(-1, 0, relief)], brow: lerp(1, 0.2, relief), mouth: i === 1 ? 0.5 * (1 - relief) + (lt > 1.4 && lt < 2.2 ? 0.35 : 0) : 0, wide: relief < .5 });
    });
  }, { jolt: jolt(lt), inkSeed: 7 });
}
// Welle: Meer links, Kraftwerk rechts; die Wand rollt von links heran und überspült die Ufermauer
const SEA = 600;
function waveTop(x, front, hmax) { if (x > front) return SEA; const d = front - x; return SEA - hmax * (0.5 + 0.5 * Math.exp(-d / 260)) * clamp(d / 60 + 0.25, 0, 1); }
function shotD(g, t, lt) {
  const push = lerp(1.0, 1.12, ss(seg(lt, 0, 3.2)));
  const qd = t > T.D[0] + 2.0 && t < T.D[0] + 2.6 ? shake(t, 8) : [0, 0, 0];
  printFrame(g, t, { x: PW / 2 + 60 * seg(lt, 0, 3.2) + qd[0], y: PH / 2 + qd[1], z: push, r: 0 }, (g, cc) => {
    // Himmel: waagrechte Schnitte, zum Horizont heller
    const sky = new WC.Region([[[0, 0], [PW, 0], [PW, 420], [0, 420]]], { res: 3 });
    if (!R.sky) R.sky = WC.hatch(sky, { dir: () => 0.03, tone: (x, y) => 0.15 + 0.55 * (y / 420), sp: 12, kind: 'v', seed: 1300, seg: [120, 320], gap: [2, 6] });
    WC.drawStrokes(g, R.sky, {});
    // Horizont + Meer
    if (!R.sea) { const seaR = new WC.Region([[[0, 420], [PW, 420], [PW, SEA + 4], [0, SEA + 4]]], { res: 3 }); R.sea = WC.hatch(seaR, { dir: () => 0, tone: (x, y) => 0.35 - 0.2 * ((y - 420) / 180), sp: 10, kind: 'v', seed: 1310, seg: [20, 70], gap: [10, 40] }); }
    WC.drawStrokes(g, R.sea, {});
    // Kraftwerk: Reaktorgebäude + Abluftkamin + Ufermauer
    if (!R.plant) {
      const L = light(-.6, -.7, .35); const b = [];
      [0, 1, 2, 3].forEach(i => b.push(WC.shape([WC.rect(1150 + i * 150, 470, 120, 150)], { light: L, sp: 8, halo: 5, seed: 1320 + i })));
      b.push(WC.shape([[[1080, 620], [1092, 300], [1108, 300], [1120, 620]]], { light: L, sp: 5, halo: 4, seed: 1330 }));
      b.push(WC.shape([WC.rect(1030, 560, 26, 60)], { light: L, sp: 5, halo: 4, seed: 1331 }));
      const ground = new WC.Region([[[1030, 620], [PW, 620], [PW, PH], [1030, PH]]], { res: 3 });
      R.ground = WC.hatch(ground, { dir: () => 0.05, tone: (x, y) => 0.3, sp: 12, kind: 'v', seed: 1340 });
      const seaLow = new WC.Region([[[0, SEA], [1030, SEA], [1030, PH], [0, PH]]], { res: 3 });
      R.seaLow = WC.hatch(seaLow, { dir: () => 0, tone: () => 0.25, sp: 11, kind: 'v', seed: 1350, seg: [20, 60], gap: [15, 40] });
      R.plant = b;
    }
    WC.drawStrokes(g, R.ground, {}); WC.drawStrokes(g, R.seaLow, {});
    R.plant.forEach(s => s.draw(g));
    // die Welle: eine Wand rollt von links bis zur Ufermauer (x 1030), bricht dort hoch und flutet das Gelände
    const WALL = 1030, hit = T.D[0] + 2.0;
    const front = Math.min(WALL, lerp(-150, WALL, ss(seg(lt, 0.1, 2.0))));
    const hmax = lerp(70, 300, ss(seg(lt, 0, 1.9)));   // niedrige Kamera: die Wand ragt über den Horizont
    const top = x => { if (x > front) return SEA; const d = front - x; return SEA - hmax * (0.7 + 0.3 * Math.exp(-d / 220)) * clamp(d / 50 + 0.3, 0, 1); };
    const P = []; for (let x = -60; x <= front; x += 10) P.push([x, top(x)]);
    const rnd = mulberry(1400 + Math.floor(t * 12));
    const strokes = [];
    if (P.length > 2) {
      g.fillStyle = '#000'; g.beginPath(); g.moveTo(-60, PH + 10); P.forEach(p => g.lineTo(p[0], p[1]));
      const L = P[P.length - 1]; g.bezierCurveTo(L[0] + 40, L[1] - 10, L[0] + 60, L[1] + 40, L[0] + 30, SEA + 30); g.lineTo(L[0] + 30, PH + 10); g.closePath(); g.fill();
      // Kamm: überschlagende Lippe als breite U-Schnitte, Gischt fällt nach vorn
      strokes.push(...WC.cutAlong(P.slice(-90), { w: 12, kind: 'u', seg: [40, 120], gap: [3, 10], seed: 1500 + Math.floor(t * 12) }));
      for (let x = Math.max(-60, front - 900); x < front; x += 13) {
        const y = top(x), near = clamp(1 - (front - x) / 900);
        const len = 30 + 110 * near * rnd(), w = 4 + 10 * near;
        strokes.push(WC.mkStroke([[x, y + 6], [x + 14 * rnd(), y + len * 0.5], [x + 26 * rnd() - 6, y + len]], [w, w * 0.25], { kind: 'u', seed: rnd() * 1000 }));
      }
      for (let k = 0; k < 60; k++) { const x = front - rnd() * Math.min(1000, front + 60), y0 = top(x); const y = y0 + 30 + rnd() * (PH - y0); strokes.push(WC.mkStroke([[x, y], [x + 30 + 70 * rnd(), y - 4 - 8 * rnd()]], 2 + 4 * rnd(), { kind: 'v', seed: rnd() * 1000 })); }
    }
    // Aufprall an der Mauer: Gischtfontäne (geschnittenes Licht) + Flut über das Gelände
    if (t > hit) {
      const u = seg(t, hit, hit + 1.0);
      strokes.push(...WC.rays(WALL, SEA, { n: 46, r0: 20, r1: [120 + 380 * eo(u), 200 + 520 * eo(u)], w: 12, a0: -PI * 0.95, a1: -PI * 0.2, seed: 1600 + Math.floor(t * 12), bend: 0.25, jit: 1 }));
      const fx = lerp(WALL, PW + 60, eo(seg(t, hit + 0.1, hit + 1.1))), lvl = lerp(620, 585, eo(seg(t, hit + 0.2, hit + 1.2)));
      g.fillStyle = '#000'; g.beginPath(); g.moveTo(WALL - 10, lvl + 8); for (let x = WALL; x <= fx; x += 12) g.lineTo(x, lvl + 6 * Math.sin(x * 0.05 + t * 9)); g.lineTo(fx + 20, PH); g.lineTo(WALL - 10, PH); g.closePath(); g.fill();
      for (let x = WALL; x < fx; x += 22) strokes.push(WC.mkStroke([[x, lvl + 4 + 20 * rnd()], [x + 40 + 50 * rnd(), lvl + 2 + 26 * rnd()]], 3 + 4 * rnd(), { kind: 'v', seed: rnd() * 1000 }));
      strokes.push(...WC.cutAlong([[WALL, lvl], [fx, lvl]], { w: 5, kind: 'v', seg: [40, 120], gap: [6, 20], seed: 1650 + Math.floor(t * 12) }));
    }
    WC.drawStrokes(g, strokes, {});
  }, { jolt: jolt(lt), inkSeed: 9 });
}
function shotE(g, t, lt) {   // zurück im Kontrollraum: alles erlischt
  const z = lerp(1.0, 1.08, seg(lt, 0, 3.7));
  const lateShake = t > T.dark0 - 0.3 && t < T.dark0 + 0.2 ? shake(t, 5) : [0, 0, 0];
  printFrame(g, t, { x: PW / 2 + lateShake[0], y: PH / 2 + lateShake[1], z }, (g, cc) => {
    roomPlate(g, cc, t, { dark: true });
    if (t > T.black) { g.fillStyle = '#000'; g.fillRect(-4000, -4000, 12000, 12000); cc.clearRect(-4000, -4000, 12000, 12000); }
  }, { jolt: jolt(lt), inkSeed: 11 });
}
function shotF1(g, t, lt) {   // Klick: Taschenlampe, der Lichtkegel auf toten Anzeigen
  const on = t > T.click;
  const ox = 360, oy = 760, a0 = -0.62, a1 = -0.22;
  printFrame(g, t, { x: 700, y: 360, z: 1.7 }, (g, cc) => {
    if (!on) return;
    // alles, was im Kegel liegt, wird geschnitten (Panel ohne Lampen, Zeiger auf null)
    const flick = 0.96 + 0.04 * hash(Math.floor(t * 12));
    g.save(); g.beginPath(); g.moveTo(ox, oy); for (let k = 0; k <= 20; k++) { const a = lerp(a0, a1, k / 20); g.lineTo(ox + Math.cos(a) * 1400, oy + Math.sin(a) * 1400); } g.closePath(); g.clip();
    WC.drawStrokes(g, R.frame, {}); WC.drawStrokes(g, R.lampFrames, {}); WC.drawStrokes(g, R.gauges, {}); WC.drawStrokes(g, R.sw, {}); WC.drawStrokes(g, R.mimic, {});
    drawNeedles(g, t, true);
    WC.drawStrokes(g, WC.rays(ox, oy, { n: 34, r0: 60, r1: [700 * flick, 1200 * flick], w: 7, a0, a1, seed: 1600, bend: 0.02 }), {});
    g.restore();
    // Taschenlampe: kleiner heller Kopf
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ox, oy, 26, 18, a0 * 0.5, 0, PI * 2); g.fill();
  }, { inkSeed: 13 });
}
function shotF2(g, t, lt) {   // Gesicht von unten angeleuchtet, starrt auf das tote Panel
  const z = lerp(1.0, 1.1, seg(lt, 0, 1.5));
  printFrame(g, t, { x: 760, y: 470, z }, (g, cc) => {
    FF.body.draw(g); FF.neck.draw(g); FF.face.draw(g); FF.hair.draw(g);
    features(g, FF, { look: [0.7, -0.3], brow: 1, mouth: 0.15, wide: true });
    // Lichtkante der Taschenlampe unten im Bild
    WC.drawStrokes(g, WC.rays(760, 1250, { n: 22, r0: 300, r1: [380, 460], w: 8, a0: -PI * 0.8, a1: -PI * 0.2, seed: 1700 }), {});
  }, { jolt: jolt(lt), inkSeed: 15 });
}
const SHOTS = [[T.A, shotA], [T.B, shotB], [T.C, shotC], [T.D, shotD], [T.E, shotE], [T.F1, shotF1], [T.F2, shotF2]];
export function render(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const s = SHOTS.find(([r]) => t >= r[0] && t < r[1]) || SHOTS[SHOTS.length - 1];
  s[1](g, t, t - s[0][0]);
}

// —— Ereignisse für Geräusche und Musik ——
function buildEvents() {
  EV = [];
  const e = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
  e(0.1, 'carve', { dur: 1.9 });
  e(T.quake, 'quake', { dur: T.C[0] + 0.6 - T.quake });
  e(T.quake + 0.15, 'alarm', { dur: T.C[0] + 1.0 - T.quake - 0.15 });
  [T.B[0], T.C[0], T.D[0], T.E[0], T.F2[0]].forEach(t => e(t, 'cut'));
  e(T.quake + 2.2, 'diesel', { dur: T.dark0 + 0.6 - T.quake - 2.2 });
  e(T.C[0] + 1.3, 'sigh');
  e(9.4, 'silence', { dur: 0.6 });
  e(T.D[0], 'wave', { dur: 3.2 });
  e(T.D[0] + 2.2, 'impact');
  e(T.dark0, 'powerdown', { dur: T.dark1 - T.dark0 });
  e(T.black, 'silence', { dur: T.click - T.black });
  e(T.click, 'click');
  e(T.F2[0], 'breath');
  [['A', 0], ['quake', T.quake], ['relief', T.C[0] + 1.2], ['wave', T.D[0]], ['dark', T.dark0], ['end', T.click]].forEach(([id, t]) => e(t, 'cue', { id }));
}
