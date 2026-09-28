// Figuren für „Kolostrum“: Kuh / Kalb / Ziege (ein Vierbeiner-Rig), Menschen, Baby in der Wiege,
// der goldene Tropfen, Kapseln, Sonne und Mond. Alles lokal gezeichnet (Ursprung = Füße auf dem Boden, +x = Blickrichtung).
// d = Zeichen-Fortschritt der Linien (0–1), f = Fortschritt des Ausmalens (0–1).
import { line, fill, dab, ellipse, handCircle, xf, smooth } from './crayon.js';
import { part, tube, curve } from './rig.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash } from '/core/lib.js';
const K = PAL.crayon;
const LW = 7;

const T0 = o => pts => xf(pts, { x: o.x || 0, y: o.y || 0, s: o.s || 1, r: o.r || 0, sx: o.flip ? -1 : 1 });
const lo = (sd, o, extra = {}) => ({ w: LW, seed: sd, draw: o.d ?? 1, ...extra });
const fo = (col, sd, o, extra = {}) => ({ col, p: 0.8, gap: 9, w: 11, ang: 0.6, seed: sd, draw: o.f ?? 1, ...extra });
const vis = o => (o.d ?? 1) > 0;

// Augen: Punkt mit weißem Wachs-Glanzlicht (oder geschlossen = kleiner Bogen)
function eye(C, P, x, y, r, sd, closed = false) {
  if (closed) { line(C.l, P([[x - r * 1.3, y], [x, y + r * 0.8], [x + r * 1.3, y]]), { w: 5, seed: sd }); return; }
  const c = P([[x, y]])[0];
  fill(C.f, P(ellipse(x, y, r, r * 1.1, 16)), { col: K.ink, p: 1, gap: 3, w: 5, over: 0.5, seed: sd });
  const h = P([[x - r * 0.35, y - r * 0.4]])[0];
  dab(C.f, h[0], h[1], Math.max(2, r * 0.32), { col: K.white, p: 1, seed: sd + 1, gap: 2, w: 3, over: 0 });
  return c;
}

// ———————— Vierbeiner: Kuh, Kalb, Ziege ————————
// o: x, y, s, flip, kind ('cow'|'goat'), body, spots, seed, d, f, hr (Kopfneigung), blink, mouth ('smile'|'o'|'moo')
export function quad(C, o) {
  if (!vis(o)) return;
  const P = T0(o), sd = o.seed || 100, goat = o.kind === 'goat';
  const bodyCol = o.body || (goat ? K.peach : K.ochre);
  const len = goat ? 0.82 : 1, ht = goat ? 0.86 : 1;
  const B = pts => pts.map(([x, y]) => [x * len, y * ht]);
  // Beine: hinten zuerst (weiter weg, etwas dunkler), dann Körper, dann die nahen Beine
  const leg = (x, sdk, far) => {
    const L = B([[x, -140], [x + 2, -60], [x, -4]]);
    part(C, P(tube(L, 34, 30)), fo(bodyCol, sdk, o, { p: far ? 0.9 : 0.75, ang: 1.4, gap: 8 }), lo(sdk + 1, o));
    part(C, P(B([[x - 18, -26], [x + 18, -26], [x + 19, 0], [x - 19, 0]])), fo(K.brown, sdk + 2, o, { p: 0.9, gap: 6, w: 8 }), lo(sdk + 3, o, { w: 5 }));
  };
  leg(-100, sd + 10, true); leg(128, sd + 14, true);
  const body = smooth(B([[-172, -252], [-60, -272], [80, -266], [152, -242], [168, -172], [150, -116], [40, -104], [-80, -108], [-166, -120], [-188, -182]]), 6);
  part(C, P(body), fo(bodyCol, sd + 20, o, { cross: !goat, crossP: 0.45, ang: 0.35 }), lo(sd + 21, o));
  if (!goat) [[-110, -200, 34], [10, -228, 28], [70, -160, 24], [-40, -140, 20]].forEach(([x, y, r], i) => {
    const pp = P(smooth([[x - r, y], [x - r * 0.3, y - r * 0.9], [x + r * 0.8, y - r * 0.6], [x + r, y + r * 0.2], [x + r * 0.2, y + r * 0.8], [x - r * 0.8, y + r * 0.6]], 5));
    fill(C.f, pp, fo(o.spots || K.brown, sd + 30 + i, o, { p: 0.85, gap: 6, w: 8, over: 2 }));
  });
  leg(-146, sd + 40, false); leg(86, sd + 44, false);
  if (!goat && o.udder !== false) {
    part(C, P(ellipse(-30, -104, 34, 20, 20)), fo(K.pink, sd + 50, o, { p: 0.85, gap: 6, w: 8 }), lo(sd + 51, o, { w: 5 }));
    [-46, -30, -14].forEach((x, i) => line(C.l, P([[x, -88], [x, -76]]), lo(sd + 52 + i, o, { w: 5, col: K.pink })));
  }
  // Schwanz
  const tail = goat ? B([[-178, -236], [-205, -270], [-212, -284]]) : B([[-182, -230], [-206, -190], [-208, -130]]);
  line(C.l, P(curve(tail)), lo(sd + 60, o, { w: 6 }));
  if (!goat) fill(C.f, P(ellipse(-208, -120, 12, 20, 12)), fo(K.brown, sd + 61, o, { p: 0.9, gap: 4, w: 6 }));
  // Kopf: dreht um den Hals
  const hr = o.hr || 0, nx = 150 * len, ny = -232 * ht;
  const H = pts => P(xf(pts, { x: nx, y: ny, r: hr }));
  const hs = goat ? 0.86 : 1;
  const Hs = pts => H(pts.map(([x, y]) => [x * hs, y * hs]));
  // Ohr hinter dem Kopf
  part(C, Hs(smooth([[18, -46], [-26, -66], [-44, -54], [-10, -34]], 5)), fo(bodyCol, sd + 70, o, { p: 0.9, gap: 6, w: 8 }), lo(sd + 71, o, { w: 6 }));
  // Hörner
  if (goat) {
    line(C.l, Hs(curve([[34, -56], [18, -100], [-18, -118], [-36, -104]])), lo(sd + 72, o, { w: 12, col: K.brown, p: 0.95 }));
    line(C.l, Hs(curve([[56, -58], [48, -104], [16, -126], [-2, -114]])), lo(sd + 73, o, { w: 12, col: K.brown, p: 0.95 }));
  } else if (o.horns !== false) {
    part(C, Hs([[36, -58], [24, -96], [44, -64]]), fo(K.yellow, sd + 72, o, { p: 0.9, gap: 5, w: 7 }), lo(sd + 73, o, { w: 5 }));
    part(C, Hs([[78, -64], [90, -100], [94, -62]]), fo(K.yellow, sd + 74, o, { p: 0.9, gap: 5, w: 7 }), lo(sd + 75, o, { w: 5 }));
  }
  const headP = smooth([[0, -40], [40, -66], [96, -60], [132, -30], [150, 8], [132, 40], [86, 44], [36, 30], [6, 4]], 6);
  part(C, Hs(headP), fo(bodyCol, sd + 76, o, { ang: 0.9 }), lo(sd + 77, o));
  // Schnauze
  part(C, Hs(ellipse(126, 14, 34, 30, 22)), fo(K.pink, sd + 78, o, { p: 0.85, gap: 6, w: 8 }), lo(sd + 79, o, { w: 6 }));
  if ((o.f ?? 1) > 0.5) {
    const n1 = Hs([[118, 4]])[0], n2 = Hs([[140, 8]])[0];
    dab(C.f, n1[0], n1[1], 3.5 * (o.s || 1), { col: K.brown, p: 0.8, seed: sd + 80 }); dab(C.f, n2[0], n2[1], 3.5 * (o.s || 1), { col: K.brown, p: 0.8, seed: sd + 81 });
  }
  if (goat) part(C, Hs([[96, 40], [126, 44], [108, 92]]), fo(K.brown, sd + 82, o, { p: 0.85, gap: 5, w: 7 }), lo(sd + 83, o, { w: 5 }));
  if ((o.d ?? 1) > 0.6) {
    eye(C, Hs, 58, -26, 11, sd + 84, o.blink);
    if (o.mouth === 'moo' || o.mouth === 'o') fill(C.f, Hs(ellipse(120, 32, 10, o.mouth === 'moo' ? 9 : 6, 12)), { col: K.ink, p: 1, gap: 3, w: 4, seed: sd + 86 });
    else line(C.l, Hs([[106, 32], [120, 38], [134, 32]]), { w: 4.5, seed: sd + 86 });
    const ck = Hs([[86, 10]])[0]; dab(C.f, ck[0], ck[1], 11 * (o.s || 1), { col: K.pink, p: 0.7, seed: sd + 87 });
  }
}

// ———————— Menschen ————————
// o: x, y, s, flip, dress, skin, hair ('scarf'|'hat'|'bun'), hairCol, arms: 'bowl'|'spoon'|'down', seed, d, f, look
export function person(C, o) {
  if (!vis(o)) return;
  const P = T0(o), sd = o.seed || 400;
  const skin = { col: K.peach, p: 0.55, gap: 9, w: 11, ang: 0.5, seed: sd + 1, draw: o.f ?? 1, over: 3 };
  // Beine + Schuhe
  [[-22, sd + 2], [22, sd + 4]].forEach(([x, s]) => {
    line(C.l, P([[x, -96], [x + 2, -14]]), lo(s, o, { w: 8 }));
    part(C, P(ellipse(x + 10, -10, 22, 12, 16)), fo(K.brown, s + 1, o, { p: 0.9, gap: 5, w: 7 }), lo(s + 1, o, { w: 5 }));
  });
  // Kleid / Kittel
  const dress = [[-70, -92], [70, -92], [36, -236], [-36, -236]];
  part(C, P(smooth(dress, 3)), fo(o.dress || K.violet, sd + 8, o, { ang: 1.1, cross: true, crossP: 0.4 }), lo(sd + 9, o));
  if (o.belt) line(C.l, P([[-50, -160], [50, -160]]), lo(sd + 10, o, { w: 8, col: o.belt }));
  // Arme
  const sh = [[-32, -222], [32, -222]];
  let hands;
  if (o.arms === 'bowl') hands = [[-30, -168], [34, -168]];
  else if (o.arms === 'spoon') hands = [[-50, -150], [40, -220 - 18 * (o.lift || 0)]];
  else if (o.arms === 'wave') hands = [[-60, -130], [66, -290 + 12 * Math.sin((o.wave || 0) * 9)]];
  else hands = [[-52, -128], [52, -128]];
  sh.forEach((s, i) => {
    const h = hands[i]; const m = [(s[0] + h[0]) / 2 + (i ? 16 : -16), (s[1] + h[1]) / 2 + 8];
    part(C, P(tube(curve([s, m, h]), 26, 22)), fo(o.dress || K.violet, sd + 12 + i, o, { ang: 1.4, gap: 7 }), lo(sd + 14 + i, o, { w: 6 }));
  });
  // Schale (vor dem Körper) mit Dampf
  if (o.arms === 'bowl' || o.arms === 'spoon') {
    const bx = o.arms === 'bowl' ? 2 : -20, by = o.arms === 'bowl' ? -176 : -158;
    const bowl = [[bx - 58, by - 6], [bx + 58, by - 6], [bx + 42, by + 30], [bx - 42, by + 30]];
    part(C, P(smooth(bowl, 4)), fo(K.brown, sd + 20, o, { p: 0.85, gap: 7, w: 9, ang: 0.2 }), lo(sd + 21, o, { w: 6 }));
    part(C, P(ellipse(bx, by - 6, 58, 12, 20)), fo(K.yellow, sd + 22, o, { p: 0.95, gap: 5, w: 7 }), lo(sd + 23, o, { w: 5 }), { occ: false });
    if ((o.f ?? 1) > 0.7) for (let k = 0; k < 3; k++) {
      const x0 = bx - 26 + k * 26, ph = (o.steam || 0) + k * 1.7;
      line(C.l, P(curve([[x0, by - 24], [x0 + 10 * Math.sin(ph), by - 52], [x0 - 8 * Math.sin(ph + 1), by - 84], [x0 + 6, by - 108]])), { w: 4.5, seed: sd + 24 + k, p: 0.6, col: K.orange });
    }
    if (o.arms === 'spoon') line(C.l, P([[hands[1][0] - 6, hands[1][1] + 6], [hands[1][0] - 30, hands[1][1] + 64]]), lo(sd + 28, o, { w: 6, col: K.brown }));
  }
  // Hände
  hands.forEach((h, i) => part(C, P(handCircle(h[0], h[1], 15, sd + 30 + i, 0, 18)), skin, lo(sd + 32 + i, o, { w: 5 })));
  // Kopf
  const hy = -290;
  if (o.hair === 'bun') part(C, P(handCircle(0, hy - 58, 26, sd + 39, 0, 20)), fo(o.hairCol || K.brown, sd + 39, o, { p: 0.9, gap: 6, w: 8 }), lo(sd + 39, o, { w: 6 }));
  if (o.hair === 'scarf') part(C, P(smooth([[-66, hy + 30], [-70, hy - 20], [-40, hy - 62], [0, hy - 72], [40, hy - 62], [70, hy - 20], [66, hy + 30], [80, hy + 64], [-80, hy + 64]], 6)), fo(o.hairCol || K.red, sd + 40, o, { ang: 1.0 }), lo(sd + 41, o));
  part(C, P(ellipse(0, hy, 50, 48, 36)), skin, lo(sd + 42, o));
  if (o.hair === 'hat') {
    part(C, P([[-40, hy - 30], [-30, hy - 84], [30, hy - 84], [40, hy - 30]]), fo(o.hairCol || K.ochre, sd + 44, o, { p: 0.85, ang: 1.3 }), lo(sd + 45, o));
    part(C, P(smooth([[-86, hy - 30], [0, hy - 44], [86, hy - 30], [0, hy - 18]], 6)), fo(o.hairCol || K.ochre, sd + 46, o, { p: 0.9, gap: 7 }), lo(sd + 47, o));
    line(C.l, P([[-34, hy - 46], [34, hy - 46]]), lo(sd + 48, o, { w: 7, col: K.red }));
  } else if (o.hair === 'bun' || o.hair === 'short') {
    part(C, P(smooth([[-52, hy - 4], [-46, hy - 40], [0, hy - 56], [46, hy - 40], [52, hy - 4], [30, hy - 26], [0, hy - 30], [-30, hy - 26]], 5)), fo(o.hairCol || K.brown, sd + 44, o, { p: 0.9, gap: 7, w: 9, ang: 1.2 }), lo(sd + 45, o, { w: 6 }));
  }
  if ((o.d ?? 1) > 0.6) {
    const lx = (o.look || 0) * 8;
    eye(C, P, -17 + lx, hy + 2, 6.5, sd + 50, o.closed); eye(C, P, 17 + lx, hy + 2, 6.5, sd + 52, o.closed);
    line(C.l, P(o.mouth === 'o' ? ellipse(lx, hy + 26, 8, 7, 12) : [[-12 + lx, hy + 22], [lx, hy + 29], [12 + lx, hy + 22]]), { w: 4.5, seed: sd + 54 });
    [[-32, hy + 16], [32, hy + 16]].forEach(([x, y], i) => { const c = P([[x, y]])[0]; dab(C.f, c[0], c[1], 9 * (o.s || 1), { col: K.pink, p: 0.75, seed: sd + 56 + i }); });
  }
}

// ———————— Baby in der Wiege ————————
export function cradle(C, o) {
  if (!vis(o)) return;
  const P = T0(o), sd = o.seed || 600;
  // Kufen
  line(C.l, P(curve([[-150, -30], [-90, 0], [0, 6], [90, 0], [150, -30]])), lo(sd, o, { w: 9, col: K.brown, p: 0.95 }));
  // Baby-Kopf (hinter der Decke)
  const hx = -52, hy = -128;
  part(C, P(ellipse(hx, hy, 44, 40, 30)), { col: K.peach, p: 0.55, gap: 9, w: 11, seed: sd + 1, draw: o.f ?? 1 }, lo(sd + 2, o));
  line(C.l, P(curve([[hx - 6, hy - 40], [hx + 2, hy - 58], [hx + 14, hy - 50], [hx + 6, hy - 42]])), lo(sd + 3, o, { w: 5 }));   // Löckchen
  if ((o.d ?? 1) > 0.6) {
    eye(C, P, hx - 14, hy - 2, 5, sd + 4, o.closed !== false); eye(C, P, hx + 16, hy - 2, 5, sd + 6, o.closed !== false);
    line(C.l, P(o.mouth === 'o' ? ellipse(hx + 2, hy + 18, 6, 6, 10) : [[hx - 6, hy + 16], [hx + 2, hy + 21], [hx + 10, hy + 16]]), { w: 4.5, seed: sd + 8 });
    const c = P([[hx - 28, hy + 12]])[0]; dab(C.f, c[0], c[1], 9 * (o.s || 1), { col: K.pink, p: 0.8, seed: sd + 9 });
  }
  // Decke (rosa Patchwork) + Wiegenkorb
  const quilt = smooth([[-100, -108], [-20, -118], [70, -112], [118, -96], [120, -60], [-104, -60]], 5);
  part(C, P(quilt), fo(K.pink, sd + 10, o, { p: 0.85, ang: 0.3, gap: 8 }), lo(sd + 11, o));
  if ((o.f ?? 1) > 0.8) [[-40, -110, -40, -64], [30, -115, 30, -64]].forEach(([a, b, c, d], i) => line(C.l, P([[a, b], [c, d]]), { w: 3.5, seed: sd + 12 + i, col: K.white, p: 0.9 }));
  const basket = [[-140, -70], [140, -70], [120, -18], [-120, -18]];
  part(C, P(basket), fo(K.brown, sd + 14, o, { p: 0.85, ang: 1.45, gap: 8, cross: true, crossP: 0.4 }), lo(sd + 15, o));
  line(C.l, P([[-128, -44], [128, -44]]), lo(sd + 16, o, { w: 4, col: K.ochre, p: 0.9 }));
}

// ———————— Der goldene Tropfen (Kolostrum) ————————
// Spitze oben; Gesicht; Wachs-Glanzlicht. o: x, y (Mitte des Bauchs), r, seed, d, f, face (true/false), wink
export function drop(C, o) {
  if (!vis(o) || (o.r || 0) <= 1) return;
  const r = o.r, x = o.x, y = o.y, sd = o.seed || 700;
  const pts = []; const n = 44;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;                      // 0 = unten
    const px = Math.sin(a), py = Math.cos(a);
    const k = py < 0 ? Math.pow(-py, 1.0) : 0;          // oben spitz zulaufen
    pts.push([x + px * r * (1 - 0.82 * k), y + py * r * (py < 0 ? 1.55 : 1)]);
  }
  const rot = o.rot || 0; const P = q => xf(q, { r: rot, ox: x, oy: y });
  part(C, P(pts), { col: K.yellow, p: 0.95, gap: 7, w: 9, ang: 0.5, seed: sd, draw: o.f ?? 1, over: 3 }, { w: Math.max(5, r * 0.07), seed: sd + 1, col: K.orange, draw: o.d ?? 1 });
  if ((o.f ?? 1) > 0.3) fill(C.f, P(ellipse(x + r * 0.15, y + r * 0.45, r * 0.62, r * 0.4, 20)), { col: K.orange, p: 0.6, gap: 7, w: 8, ang: -0.4, seed: sd + 2, draw: o.f ?? 1 });
  if ((o.f ?? 1) > 0.6) line(C.l, P(curve([[x - r * 0.55, y + r * 0.1], [x - r * 0.6, y - r * 0.35], [x - r * 0.3, y - r * 0.85]])), { w: Math.max(5, r * 0.1), col: K.white, p: 1, seed: sd + 3 });
  if (o.face !== false && (o.d ?? 1) > 0.7) {
    const er = Math.max(3, r * 0.09);
    const E = (ex, ey) => { const c = P([[ex, ey]])[0]; fill(C.f, ellipse(c[0], c[1], er, er * 1.15, 12), { col: K.ink, p: 1, gap: 2.5, w: 4, over: 0.3, seed: sd + 5 + ex }); };
    if (o.wink) line(C.l, P([[x - r * 0.38, y + r * 0.05], [x - r * 0.24, y], [x - r * 0.1, y + r * 0.05]]), { w: 4.5, seed: sd + 9 }); else E(x - r * 0.24, y);
    E(x + r * 0.24, y);
    line(C.l, P([[x - r * 0.2, y + r * 0.3], [x, y + r * 0.42], [x + r * 0.2, y + r * 0.3]]), { w: Math.max(4, r * 0.06), seed: sd + 10 });
    [[-0.5, 0.25], [0.5, 0.25]].forEach(([a, b], i) => { const c = P([[x + a * r, y + b * r]])[0]; dab(C.f, c[0], c[1], r * 0.12, { col: K.pink, p: 0.75, seed: sd + 11 + i }); });
  }
}

// ———————— Kapsel ————————
export function capsule(C, o) {
  if (!vis(o)) return;
  const P = T0(o), sd = o.seed || 800;
  const L = 70, R = 16;
  // eine Hälfte: gerade Kante bei x = 0, runde Kappe außen (b = −1 links, +1 rechts)
  const half = b => { const c = b * (L / 2 - R), out = [[0, -R]]; for (let i = 0; i <= 12; i++) { const t = -Math.PI / 2 + Math.PI * i / 12; out.push([c + b * Math.cos(t) * R, Math.sin(t) * R]); } out.push([0, R]); return out; };
  part(C, P(half(-1)), { col: K.yellow, p: 0.95, gap: 4, w: 6, seed: sd, over: 1, draw: o.f ?? 1 }, lo(sd + 1, o, { w: 5 }));
  part(C, P(half(1)), { col: K.orange, p: 0.95, gap: 4, w: 6, seed: sd + 2, over: 1, draw: o.f ?? 1 }, lo(sd + 3, o, { w: 5 }));
  line(C.l, P([[-L / 2 + 6, -R * 0.45], [-4, -R * 0.55]]), { w: 3.5, col: K.white, p: 1, seed: sd + 4 });
}

// ———————— Sonne (mit Gesicht) und Mondsichel ————————
export function sun(C, o) {
  if (!vis(o)) return;
  const { x, y, r } = o, sd = o.seed || 900;
  const d = o.d ?? 1;
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + (o.spin || 0); line(C.l, [[x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25], [x + Math.cos(a) * r * 1.62, y + Math.sin(a) * r * 1.62]], { w: 7, col: K.orange, seed: sd + k, draw: clamp(d * 1.4 - k / 24) }); }
  part(C, handCircle(x, y, r, sd + 20), { col: K.yellow, p: 0.95, gap: 8, w: 10, seed: sd + 21, draw: o.f ?? 1 }, { w: 7, col: K.orange, seed: sd + 22, draw: d });
  if (o.face && d > 0.7) {
    const E = ex => fill(C.f, ellipse(x + ex, y - r * 0.12, r * 0.07, r * 0.09, 12), { col: K.ink, p: 1, gap: 2.5, w: 4, seed: sd + 30 + ex });
    E(-r * 0.3); E(r * 0.3);
    line(C.l, [[x - r * 0.3, y + r * 0.25], [x, y + r * 0.42], [x + r * 0.3, y + r * 0.25]], { w: 5, seed: sd + 33 });
    dab(C.f, x - r * 0.55, y + r * 0.2, r * 0.13, { col: K.orange, p: 0.7, seed: sd + 34 }); dab(C.f, x + r * 0.55, y + r * 0.2, r * 0.13, { col: K.orange, p: 0.7, seed: sd + 35 });
  }
}
export function crescent(C, o) {
  if (!vis(o)) return;
  const { x, y, r } = o, sd = o.seed || 950; const cr = [];
  for (let i = 0; i <= 24; i++) { const a = -2.2 + 4.4 * i / 24; cr.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  for (let i = 0; i <= 24; i++) { const a = 1.95 - 3.9 * i / 24; cr.push([x - r * 0.52 + Math.cos(a) * r * 0.9, y - r * 0.12 + Math.sin(a) * r * 0.9]); }
  part(C, cr, { col: K.yellow, p: 0.9, gap: 6, w: 8, seed: sd, over: 2, draw: o.f ?? 1 }, { w: 6, seed: sd + 1, draw: o.d ?? 1 }, { occ: false });
}
