// Fukushima Daiichi, 11. März 2011 — Art déco, stumm, ohne Untertitel. 20 s.
// Zeit erzählt die Wanduhr (14:46 Beben · 15:35 Welle · 15:37 Stromausfall). Licht = gezählte Glühbirnen:
// sie gehen nacheinander an, flackern rot beim Alarm und erlöschen beim Stromausfall wieder einzeln.
import * as D from './engine/deco.js';
import * as T from './engine/type.js';
import { drawFigure } from './chars.js';
const { C, lerp, seg, ss, eo, eio, clamp, hash } = D;
export const DUR = 20;
const RED = '#e0442f';
const OP = {   // Bedienpersonal: dunkelgrüne Arbeitsjacke, keine Mütze
  jacket: '#1d6b57', jacketL: '#48a488', jacketD: '#0a2f26', pants: '#1b1a22', pantsL: '#4a4652', pantsD: '#060508',
  skin: '#e2ae86', skinL: '#fbd6b2', skinD: '#9a5e42', hair: '#0d0908', hairL: '#3a2a20', glove: '#e2ae86', gloveD: '#9a5e42',
  shoe: '#0c0a08', trim: false, cap: false, strap: false, buttons: 'single', tails: 0, bow: false, mustache: false,
  sh: 13, waist: 6.4, thigh: 31, shin: 30, uarm: 25.5, farm: 23, neck: 6,
};
const TM = { quake: 2.6, B: [3.6, 7.0], C: [7.0, 10.0], D: [10.0, 13.4], E: [13.4, 17.0], dark0: 14.0, dark1: 16.2, F: [17.0, 20.0], doors: 18.9 };
const step12 = t => Math.floor(t * 12) / 12;
const shake = (t, a) => { const q = step12(t) * 12; return [a * (hash(q * 1.7) - .5) * 2, a * (hash(q * 3.1 + 5) - .5) * 2, a * .0009 * (hash(q * 2.3 + 9) - .5)]; };

// —— Glühbirnen-Panel (symmetrisch zur Mittelachse) ——
const BULBS = [];
for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) for (const sd of [-1, 1]) BULBS.push({ x: 960 + sd * (190 + k * 52), y: 300 + r * 58, k, r, sd, alarm: hash(k * 13 + r * 7 + sd) < .5 });
function bulbOn(B, t) {
  const on = 0.9 + (B.k / 9) * 1.0 + B.r * 0.08;                  // von der Mitte nach außen, gezählt
  if (t < on) return [0, 0];
  const flash = 1 + 0.6 * Math.exp(-(t - on) / 0.06);             // Zündüberschwinger
  if (t >= TM.dark0) {                                             // Stromausfall: von außen nach innen aus
    const off = TM.dark0 + ((8 - B.k) / 9) * (TM.dark1 - TM.dark0 - 0.4) + B.r * 0.05;
    if (t > off) return [0, 0];
    if (t > off - 0.3) return [hash(step12(t) * 31 + B.k) < .5 ? 0.3 : 1, 0];
  }
  if (t > TM.quake && t < TM.C[0] + 0.8 && B.alarm) return [hash(step12(t) * 7.3 + B.k * 3 + B.r * 11 + B.sd) < .6 ? 1.2 : 0.15, 1];
  if (t >= TM.C[0] + 0.8 && t < TM.dark0 && B.alarm && B.r === 0 && B.k < 2) return [1, 1];
  return [flash, 0];
}
function bulb(g, x, y, r, v, red) {
  D.gline(g, D.arcPts(x, y, r * 1.35, 0, D.TAU, 24), { w: 1.4, alpha: .8 });
  if (v <= 0) { g.fillStyle = '#17120b'; g.beginPath(); g.arc(x, y, r, 0, D.TAU); g.fill(); return; }
  const col = red ? RED : '#ffcf7a';
  D.glow(g, x, y, r * 4.5, col, .42 * Math.min(1, v));
  g.fillStyle = red ? D.mix('#ff9a7a', RED, .3) : C.bulb; g.beginPath(); g.arc(x, y, r, 0, D.TAU); g.fill();
  g.fillStyle = C.bulbCore; g.globalAlpha = Math.min(1, v) * .9; g.beginPath(); g.arc(x - r * .2, y - r * .25, r * .45, 0, D.TAU); g.fill(); g.globalAlpha = 1;
}
function clockHM(t) {   // Wanduhr
  if (t < TM.quake) return [2, 45 + seg(t, 0, TM.quake), 0];
  if (t < TM.D[0]) return [2, 46 + (t - TM.quake) * 0.4, 0];
  if (t < TM.E[0]) return [3, 35, 0];
  return [3, t < TM.dark1 ? 36 + seg(t, TM.E[0], TM.dark1) : 37, 0];
}

// —— Kontrollraum (Totale) ——
function room(g, t, o = {}) {
  const dim = o.dim ?? 1;                                          // Goldlinien verlieren beim Stromausfall ihr Licht
  D.ground(g);
  g.save(); g.globalAlpha = dim;
  D.sunburst(g, 960, 1080, { rays: 64, r0: 200, r1: 1500, mode: 'wedges', a0: Math.PI, a1: D.TAU, part: o.part ?? 1 });
  D.archFrame(g, 960, 1000, 1640, 900, { rings: 3, gap: 16, steps: 3, crown: 'step', part: o.part ?? 1, burst: false, sheen: .3 + .4 * seg(t, 0, 3) });
  // Paneel
  const P = [[140, 210], [1780, 210], [1780, 680], [140, 680]];
  D.airbrush(g, P, { base: '#15110c', dark: '#050403', light: '#2a2014', dir: -2.3 });
  D.gline(g, [...P, P[0]], { w: 2.4, part: o.part ?? 1, double: true });
  D.chevrons(g, 160, 1760, 230, { n: 28, h: 12, rows: 1, w: 1.2 });
  g.restore();
  BULBS.forEach(B => { const [v, red] = bulbOn(B, t); bulb(g, B.x, B.y, 13, v * (o.bulbK ?? 1), red); });
  g.save(); g.globalAlpha = dim;
  // Uhr in der Mitte, zwei Rundinstrumente
  const [h, m] = clockHM(t);
  T.clockFace(g, 960, 390, 118, { h, m, lit: t < TM.dark1 ? .6 * dim : 0 });
  const pw = t < TM.quake + .6 ? .8 : lerp(.8, .02, eo(seg(t, TM.quake + .6, TM.quake + 3)));
  const dz = t < TM.quake + 2 ? .1 : t < TM.dark0 + .6 ? lerp(.1, .7, eo(seg(t, TM.quake + 2, TM.quake + 4))) : lerp(.7, 0, eo(seg(t, TM.dark0 + .6, TM.dark1)));
  const wob = t > TM.quake && t < TM.C[0] ? .03 * Math.sin(step12(t) * 40) : 0;
  T.dial(g, 480, 600, 120, pw + wob, { labels: ['0', '', '', '', '', '', '100'], lit: t < TM.dark1 ? .5 : 0 });
  T.dial(g, 1440, 600, 120, dz + wob, { labels: ['0', '', '', '', '', '', '100'], lit: t < TM.dark1 ? .5 : 0, needleColor: '#48a488' });
  // Pult
  const desk = [[120, 820], [1800, 820], [1860, 900], [60, 900]];
  D.airbrush(g, desk, { base: '#1a140d', dark: '#070504', light: '#3a2c18', dir: -1.6 });
  D.gline(g, [[120, 820], [1800, 820]], { w: 3, part: o.part ?? 1 });
  D.fishScale(g, 60, 900, 1800, 180, 26, {});
  g.restore();
}

// —— Einstellungen ——
function camera(g, x, y, z, r = 0) { g.translate(960, 540); g.rotate(r); g.scale(z, z); g.translate(-x, -y); }
function opsBack(g, t, pose) {
  const panic = t > TM.quake + .2 && t < TM.C[0] || t > TM.dark0 + .8;
  [[700, 1, 3.3], [1220, -1, 3.3]].forEach(([x, d, s], i) => {
    const P = panic ? { armsOver: true, armN: [2.2 - .2 * i, 1.9], armF: [2.2, 1.9] } : { armN: [.3, .8], armF: [.3, .8] };
    drawFigure(g, { x, y: 870, s, view: 'back', dir: d, style: OP, ...P, headTilt: panic ? -.15 : 0 });
  });
}
function shotA(g, t) {   // Goldpunkt → Strahlen → Raum wird gezeichnet; Beben ab 2,6 s
  const part = Math.max(0.03, eo(seg(t, 0.1, 1.6)));   // gline mag keine leere Linie
  const q = t > TM.quake ? shake(t, 12) : [0, 0, 0];
  g.save(); camera(g, 960 + q[0], 540 + q[1], lerp(1.06, 1.0, seg(t, 0, 3.6)), q[2]);
  room(g, t, { part });
  if (t > 1.2) opsBack(g, t);
  g.restore();
  if (t < 0.9) { const u = seg(t, 0, .9); D.glow(g, 960, 540, 60 + 900 * eo(u), '#ffd98a', .7 * (1 - u)); D.sparkle(g, 960, 540, 40 + 120 * (1 - u), { alpha: 1 - u }); }
  D.vignette(g);
}
function shotB(g, t) {   // nah: rote Lampen, Leistungsanzeige fällt auf null
  const lt = t - TM.B[0], q = shake(t, 9 * (1 - seg(lt, 2.4, 3.4)));
  g.save(); camera(g, lerp(560, 520, seg(lt, 0, 3.4)) + q[0], 480 + q[1], lerp(2.1, 2.3, seg(lt, 0, 3.4)), q[2]);
  room(g, t);
  g.restore(); D.vignette(g, 1920, 1080, .7);
}
function shotC(g, t) {   // zwei Gesichter: Beben vorbei, Notstrom läuft — Erleichterung
  const lt = t - TM.C[0], rel = ss(seg(lt, .9, 1.9));
  D.ground(g, 1920, 1080, { top: '#0c1a16', bot: C.ink });
  D.sunburst(g, 960, 1300, { rays: 48, r0: 300, r1: 1700, mode: 'lines', a0: Math.PI, a1: D.TAU, alpha: .35 });
  T.dial(g, 960, 330, 150, lerp(.3, .7, eo(seg(lt, 0, 1.5))), { labels: ['0', '', '', '', '', '', '100'], lit: .8, needleColor: '#48a488' });
  const q = shake(t, 4 * (1 - seg(lt, 0, .7)));
  [[620, 1, 'worry'], [1300, -1, 'worry']].forEach(([x, d], i) => {
    const face = rel > .5 ? (i ? 'calm' : { open: .7, lid: .45, look: [0, -.2], brow: -.4, browAng: -.1, mouth: 'line' }) : 'worry';
    drawFigure(g, { x: x + q[0], y: 1330 + q[1], s: 13, view: 'q', dir: d, style: OP, face, headTilt: lerp(-.12, .04, rel), armN: [.1, .2], armF: [.1, .2] });
  });
  D.vignette(g, 1920, 1080, .6);
}
function shotD(g, t) {   // Cassandre-Plakat: die Welle
  const lt = t - TM.D[0];
  const sky = g.createLinearGradient(0, 0, 0, 560); sky.addColorStop(0, C.night); sky.addColorStop(1, '#10231f'); g.fillStyle = sky; g.fillRect(0, 0, 1920, 1080);
  D.sunburst(g, 1500, 560, { rays: 40, r0: 60, r1: 1400, mode: 'lines', a0: Math.PI, a1: D.TAU, alpha: .35 });
  // Meer in steiler Perspektive
  g.fillStyle = '#071512'; g.fillRect(0, 560, 1920, 520);
  for (let i = 0; i < 14; i++) { const y = 570 + Math.pow(i / 14, 1.8) * 500; D.gline(g, [[0, y], [1920, y]], { w: .8 + i * .12, alpha: .35 }); }
  // Kraftwerk: Stufenbauten (Zikkurat) + Kamin, rechts unten
  const bx = [1260, 1400, 1540, 1680];
  bx.forEach((x, i) => { const P = [[x, 700], [x + 110, 700], [x + 110, 610], [x + 90, 610], [x + 90, 585], [x + 20, 585], [x + 20, 610], [x, 610]]; D.airbrush(g, P, { base: '#2b2418', dark: '#0e0b07', light: '#6a5530', dir: -2.3 }); D.gline(g, [...P, P[0]], { w: 1.6 }); });
  const st = [[1200, 700], [1212, 400], [1224, 400], [1236, 700]]; D.airbrush(g, st, { base: '#2b2418', dark: '#0e0b07', light: '#6a5530' }); D.gline(g, [...st, st[0]], { w: 1.4 });
  D.gline(g, [[1150, 700], [1150, 660], [1190, 660]], { w: 2.4 });                    // Ufermauer
  g.fillStyle = '#0a0806'; g.fillRect(1150, 700, 770, 380);
  // die Welle: eine riesige grüne Brechung mit Goldkante, rollt von links heran
  const f = lerp(-500, 1180, eio(seg(lt, 0, 2.2))), Hh = lerp(180, 620, ss(seg(lt, 0, 2.2)));
  const crest = [], N = 40;
  for (let i = 0; i <= N; i++) { const u = i / N, x = f - 1400 + u * 1400, y = 700 - Hh * Math.pow(u, 1.6); crest.push([x, y]); }
  const tip = crest[N]; const curl = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 1.2; curl.push([tip[0] + 90 * (Hh / 620) * Math.cos(a) + 40, tip[1] + 90 * (Hh / 620) * (1 + Math.sin(a))]); }
  const body = [[f - 1500, 1080], ...crest, ...curl, [tip[0] + 60, 1080]];
  D.airbrush(g, body, { base: C.emerald, dark: C.emeraldD, light: C.emeraldL, dir: -2.0, rim: 1 });
  g.save(); g.clip(D.toPath(body, true)); D.fishScale(g, f - 1500, 400, 1600, 700, 30, { stroke: 'rgba(201,162,75,.45)', fillA: 'rgba(0,0,0,0)' }); g.restore();
  D.gline(g, [...crest, ...curl], { w: 3.4, glow: .6 });
  D.speedLines(g, f - 200, 700 - Hh * .6, 0, { n: 6, len: 520, spread: 160, w: 2.4 });
  // Aufprall: Goldgischt über der Mauer
  if (lt > 2.1) { const u = seg(lt, 2.1, 3.2); D.sunburst(g, 1160, 660, { rays: 30, r0: 20, r1: 80 + 520 * eo(u), a0: Math.PI * 1.05, a1: Math.PI * 1.95, mode: 'lines', w: 5, glow: 1 }); for (let k = 0; k < 10; k++) D.sparkle(g, 1160 + (hash(k) - .5) * 700 * u, 660 - hash(k + 9) * 500 * u, 14 * (1 - u) + 4, { alpha: 1 - u }); }
  // Uhr-Medaillon oben links: 15:35
  T.clockFace(g, 170, 170, 92, { h: 3, m: 35, lit: .5 });
  D.vignette(g);
}
function shotE(g, t) {   // zurück im Kontrollraum: die Lichter erlöschen einzeln
  const lt = t - TM.E[0], dim = lerp(1, .12, eo(seg(t, TM.dark0 + .2, TM.dark1 + .3)));
  const q = t > TM.dark0 - .2 && t < TM.dark0 + .3 ? shake(t, 6) : [0, 0, 0];
  g.save(); camera(g, 960 + q[0], 540 + q[1], lerp(1.0, 1.1, seg(lt, 0, 3.6)));
  room(g, t, { dim }); opsBack(g, t);
  g.restore();
  g.fillStyle = `rgba(0,0,0,${.75 * seg(t, TM.dark0 + .4, TM.dark1 + .6)})`; g.fillRect(0, 0, 1920, 1080);
  D.vignette(g, 1920, 1080, .8);
}
function shotF(g, t) {   // Dunkel. Ein Taschenlampenkegel tastet über die tote Uhr (15:37). Dann schließen sich die Türen.
  const lt = t - TM.F[0];
  g.save(); camera(g, 960, 470, 1.35);
  room(g, 20, { dim: .1, bulbK: 0 });
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0, 0, 1920, 1080);
  if (lt > .25) {
    const ang = lerp(-0.95, -1.35, ss(seg(lt, .25, 1.8)));
    const ox = 330, oy = 1120;
    g.save(); g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(ang - .16) * 2200, oy + Math.sin(ang - .16) * 2200); g.lineTo(ox + Math.cos(ang + .16) * 2200, oy + Math.sin(ang + .16) * 2200); g.closePath(); g.clip();
    g.save(); camera(g, 960, 470, 1.35); room(g, 20, { dim: .9, bulbK: 0 }); g.restore();
    g.restore();
    D.beam(g, ox, oy, ang, 2000, 560, .16);
  }
  // Aufzugtüren schließen über der Szene (symmetrisch zur Achse)
  const k = eio(seg(t, TM.doors, DUR - .15));
  if (k > 0) for (const sd of [-1, 1]) {
    const w = 960 * k, x0 = sd < 0 ? 0 : 1920 - w;
    const P = [[x0, 0], [x0 + w, 0], [x0 + w, 1080], [x0, 1080]];
    D.airbrush(g, P, { base: '#15110c', dark: '#050403', light: '#2a2014', dir: sd < 0 ? -2.6 : -.6 });
    const ex = sd < 0 ? x0 + w : x0;
    D.gline(g, [[ex, 0], [ex, 1080]], { w: 3 });
    D.chevrons(g, x0 + 30, x0 + w - 30, 540, { n: 6, h: 26, rows: 3, gap: 10, w: 1.6 });
    D.gline(g, D.rectPts(x0 + 40, 80, Math.max(0, w - 80), 920), { w: 1.2, alpha: .6 });
  }
  D.vignette(g);
}
const SHOTS = [[[0, TM.B[0]], shotA], [TM.B, shotB], [TM.C, shotC], [TM.D, shotD], [TM.E, shotE], [TM.F, shotF]];
export function render(g, t) {
  const s = SHOTS.find(([r]) => t >= r[0] && t < r[1]) || SHOTS[SHOTS.length - 1];
  g.fillStyle = C.ink; g.fillRect(0, 0, 1920, 1080);
  s[1](g, t);
}
