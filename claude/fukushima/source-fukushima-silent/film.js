// Fukushima Daiichi, 11. März 2011 — als Stummfilm der 1920er, projiziert zwischen Samtvorhängen. 20 s.
// Pipeline wie im Stil-Demo: Tonmalerei (Grauwerte) → Redraw (Tusche, Lavur, Schraffur) → Iris → FilmPost (Silberkopie) → Kino.
// Einzige Farbe: das Rot der Alarmlampen (Farbmaske).
import { Redraw } from './engine/redraw.js';
import { FilmPost, damage } from './engine/film.js';
import { intertitle, iris, theatre } from './engine/cards.js';
import { setFrame, S as IS, form, stroke, grey, ellipsePts, rectPts, catmull } from './engine/ink.js';

export const DUR = 20;
const W = 1920, H = 1080, FW = 1440, FH = 1080, GATE = { x: 240, y: 0, w: FW, h: FH };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const RED = '#c8392b';

export const SEC = [
  { name: 'PRE', t0: 0, t1: 0.8, look: { str: .7, sepia: .12, fps: 16 } },
  { name: 'CARD1', t0: 0.8, t1: 3.3, look: { str: .55, sepia: .14, fps: 16 } },
  { name: 'ROOM', t0: 3.3, t1: 7.6, look: { str: .6, sepia: .12, fps: 16 } },
  { name: 'CARD2', t0: 7.6, t1: 10.0, look: { str: .55, sepia: .14, fps: 16 } },
  { name: 'WAVE', t0: 10.0, t1: 13.0, look: { str: .85, sepia: .08, fps: 18, crank: 1.35 } },
  { name: 'CARD3', t0: 13.0, t1: 15.3, look: { str: .85, sepia: .08, fps: 16, crank: 1.3 } },
  { name: 'DARK', t0: 15.3, t1: 18.7, look: { str: .5, sepia: .2, fps: 16 } },
  { name: 'END', t0: 18.7, t1: 20.01, look: { str: .45, sepia: .22, fps: 16 } },
];
export const HIT = { curtain: 0.05, quake: 4.4, relief: 6.8, wave: 10.0, impact: 11.9, click: 15.75, irisClose: 17.3, curtainOut: 18.95 };
const CARDS = {
  CARD1: { level: 1, lines: [{ text: 'Fukushima, Japan', font: 'Playfair Display SC', weight: 900, size: 96 }, { text: '11. März 2011 · 14:46 Uhr', italic: true, size: 54, spacing: 1 }], gap: 1.45 },
  CARD2: { level: 1, lines: [{ text: 'Die Reaktoren schalten ab.', italic: true, size: 70 }, { text: 'Der Notstrom läuft.', italic: true, size: 70 }], gap: 1.35 },
  CARD3: { level: 0, shake: .5, lines: [{ text: '15:37 —', font: 'Playfair Display SC', weight: 900, size: 104 }, { text: 'KEIN STROM!', font: 'Playfair Display SC', weight: 900, size: 150 }], gap: 1.12 },
  END: { level: 1, lines: [{ text: 'Ende', font: 'Playfair Display SC', weight: 900, size: 120 }], gap: 1.3 },
};
const secAt = t => SEC.find(s => t >= s.t0 && t < s.t1) || SEC[SEC.length - 1];

// ——————————————— Tonmalerei ———————————————
const fc = document.createElement('canvas'); fc.width = FW; fc.height = FH; const fg = fc.getContext('2d');
const mc = document.createElement('canvas'); mc.width = FW; mc.height = FH; const mg = mc.getContext('2d');
let RD = null, FP = null;

// eine einfache Figur (Tonwerte), Füße bei (x, y). o: s, lean, face ('profile'|'back'), arms, jacket, skin
function person(g, x, y, o = {}) {
  const s = o.s ?? 1, lean = o.lean ?? 0, sd = o.seed ?? 1, dir = o.dir ?? 1;
  g.save(); g.translate(x, y); g.rotate(lean); g.scale(s * dir, s);
  const J = o.jacket ?? .22, P = o.pants ?? .16, SK = o.skin ?? .82;
  // Beine
  form(g, [[-28, -190], [-4, -190], [-8, -8], [-30, -8]], { v: P, seed: sd, line: 2.4 });
  form(g, [[4, -190], [28, -190], [30, -8], [8, -8]], { v: P - .03, seed: sd + 1, line: 2.4 });
  form(g, ellipsePts(-18, -4, 20, 8), { v: .07, seed: sd + 2, line: 2 }); form(g, ellipsePts(22, -4, 20, 8), { v: .07, seed: sd + 3, line: 2 });
  // Jacke
  form(g, catmull([[-46, -330], [46, -330], [54, -250], [44, -176], [-44, -176], [-54, -250]], true, 4), { v: J, seed: sd + 4, cyl: 0, line: 2.8 });
  if (o.face !== 'back') form(g, [[-10, -330], [10, -330], [0, -300]], { v: .92, seed: sd + 5, line: 1.6 });   // Hemdkragen
  // Arme
  const arms = o.arms || [[-66, -210], [66, -210]];
  [[-42, -318], [42, -318]].forEach((sh, i) => {
    const h = arms[i], m = [(sh[0] + h[0]) / 2 + (i ? 14 : -14), (sh[1] + h[1]) / 2];
    stroke(g, catmull([sh, m, h], false, 6), 26, { seed: sd + 6 + i, color: grey(J) });
    form(g, ellipsePts(h[0], h[1], 11, 12), { v: SK, seed: sd + 8 + i, line: 1.8 });
  });
  // Kopf
  g.save(); g.translate(0, -372); g.rotate(o.headTilt ?? 0);
  if (o.face === 'back') { form(g, ellipsePts(0, 0, 34, 40), { v: .1, seed: sd + 10, line: 2.4 }); form(g, ellipsePts(-34, 2, 6, 10), { v: SK - .1, seed: sd + 11, line: 1.4 }); }
  else {
    form(g, catmull([[-30, -30], [4, -42], [30, -24], [40, 4], [34, 10], [36, 24], [22, 40], [-10, 42], [-32, 18]], true, 5), { v: SK, seed: sd + 12, line: 2.2 });
    form(g, catmull([[-36, 8], [-38, -22], [-16, -44], [14, -46], [30, -34], [8, -34], [-12, -26], [-24, 4]], true, 4), { v: .1, seed: sd + 13, line: 2 });
    // Stummfilm-Schminke: dunkle Lider, große Augen
    const wide = o.wide ? 1.5 : 1;
    form(g, ellipsePts(20, -2, 6, 4 * wide), { v: .08, seed: sd + 14, line: 1 });
    stroke(g, [[12, -14 - 4 * (o.brow ?? 0)], [28, -12 - 7 * (o.brow ?? 0)]], 3.2, { seed: sd + 15 });
    if (o.mouthO) form(g, ellipsePts(24, 26, 5, 7), { v: .1, seed: sd + 16, line: 1 }); else stroke(g, [[16, 26], [30, 25]], 2.4, { seed: sd + 16 });
  }
  g.restore();
  g.restore();
}

// Kontrollraum: Wand, Paneel mit Lampen und Rundinstrumenten, Uhr, Pult, Hängelampe
const LAMPS = []; for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) LAMPS.push({ x: 220 + k * 72, y: 250 + r * 56, r, k, alarm: hash(k * 7 + r * 13) < .5 });
function room(g, m, t, o = {}) {
  const dark = o.dark ?? 0, lit = v => lerp(v, .07 + v * .08, dark);
  // Wand + Boden
  const gr = g.createLinearGradient(0, 0, 0, FH); gr.addColorStop(0, grey(lit(.62))); gr.addColorStop(.7, grey(lit(.5))); gr.addColorStop(1, grey(lit(.4)));
  g.fillStyle = gr; g.fillRect(-100, -100, FW + 200, FH + 200);
  form(g, [[-100, 780], [FW + 100, 780], [FW + 100, FH + 100], [-100, FH + 100]], { v: lit(.58), seed: 30, line: 2 });
  for (let i = 0; i < 9; i++) stroke(g, [[-100 + i * 200, 780], [-500 + i * 300, FH + 100]], 1.6, { seed: 31 + i, color: grey(lit(.4)) });
  // Paneel
  form(g, rectPts(150, 180, 1140, 470), { v: lit(.3), seed: 40, line: 3.2, shade: 10 });
  for (let i = 1; i < 4; i++) stroke(g, [[150 + i * 285, 184], [150 + i * 285, 646]], 2, { seed: 41 + i, color: grey(lit(.12)) });
  for (const L of LAMPS) {
    let v = .9 * (1 - dark), red = false;
    if (t > HIT.quake && t < HIT.relief) { const f = hash(Math.floor(t * 12) * 7.3 + L.k * 3 + L.r * 11); if (L.alarm) { red = f < .6; v = red ? .85 : .25; } }
    if (o.flash) v *= o.flash;
    form(g, ellipsePts(L.x, L.y, 17, 17), { v: Math.max(.14, lerp(.2, v, 1 - dark)), seed: 50 + L.k + L.r * 20, line: 2 });
    if (red && m) { m.fillStyle = RED; m.beginPath(); m.arc(L.x, L.y, 15, 0, 7); m.fill(); }
  }
  // Rundinstrumente (Leistung fällt nach dem Beben)
  const pw = t < HIT.quake + .5 ? .85 : lerp(.85, .05, ss(seg(t, HIT.quake + .5, HIT.quake + 2.2)));
  [[330, 520, pw], [1110, 520, t < HIT.relief ? .15 : .7]].forEach(([x, y, v], i) => {
    form(g, ellipsePts(x, y, 70, 70), { v: lit(.88), seed: 70 + i, line: 3 });
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (.8 + 1.4 * k / 8); stroke(g, [[x + Math.cos(a) * 52, y + Math.sin(a) * 52], [x + Math.cos(a) * 64, y + Math.sin(a) * 64]], 2, { seed: 72 + k }); }
    const a = Math.PI * (.8 + 1.4 * (dark ? 0 : v)); stroke(g, [[x, y], [x + Math.cos(a) * 56, y + Math.sin(a) * 56]], 4, { seed: 80 + i });
  });
  // Wanduhr über dem Paneel: 14:46 bzw. 15:37
  const [hh, mm] = o.clock || [2, 46];
  form(g, ellipsePts(720, 110, 58, 58), { v: lit(.9), seed: 90, line: 3.4 });
  const ah = (hh % 12 + mm / 60) / 12 * Math.PI * 2 - Math.PI / 2, am = mm / 60 * Math.PI * 2 - Math.PI / 2;
  stroke(g, [[720, 110], [720 + Math.cos(ah) * 30, 110 + Math.sin(ah) * 30]], 5, { seed: 91 }); stroke(g, [[720, 110], [720 + Math.cos(am) * 46, 110 + Math.sin(am) * 46]], 3.4, { seed: 92 });
  // Pult
  form(g, [[80, 700], [1360, 700], [1400, 790], [40, 790]], { v: lit(.45), seed: 95, line: 3, shade: 8 });
  form(g, [[40, 790], [1400, 790], [1400, 860], [40, 860]], { v: lit(.28), seed: 96, line: 3 });
}

function shotRoom(g, m, t, lt) {
  const q = t > HIT.quake && t < HIT.relief ? 1 - .6 * seg(t, HIT.relief - .8, HIT.relief) : 0;
  const sx = q * 16 * (hash(Math.floor(t * 16) * 1.7) - .5) * 2, sy = q * 12 * (hash(Math.floor(t * 16) * 3.1) - .5) * 2;
  g.save(); g.translate(sx, sy); m.save(); m.translate(sx, sy);
  room(g, m, t);
  // Hängelampe pendelt
  const sw = q ? .35 * Math.sin((t - HIT.quake) * 7) : .02 * Math.sin(t * 2);
  g.save(); g.translate(260, -20); g.rotate(sw); stroke(g, [[0, 0], [0, 150]], 3, { seed: 100 }); form(g, [[-40, 150], [40, 150], [26, 124], [-26, 124]], { v: .85, seed: 101, line: 2.4 }); g.restore();
  // zwei Bediener: einer von hinten am Pult, einer im Profil rechts
  const lean1 = q ? .12 * Math.sin((t - HIT.quake) * 9) : 0, lean2 = q ? -.1 * Math.sin((t - HIT.quake) * 8 + 1) : 0;
  const hold = q ? [[-90, -350], [70, -190]] : [[-60, -210], [60, -210]];
  person(g, 500, 1060, { s: 1.5, face: 'back', lean: lean1, seed: 200, arms: q ? [[-120, -300], [110, -300]] : [[-70, -250], [70, -250]] });
  person(g, 1120, 1080, { s: 1.6, face: 'profile', dir: -1, lean: lean2, seed: 230, wide: q > 0, brow: q, mouthO: q > 0, arms: hold });
  g.restore(); m.restore();
}
function shotWave(g, m, t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, 520); gr.addColorStop(0, grey(.78)); gr.addColorStop(1, grey(.9)); g.fillStyle = gr; g.fillRect(0, 0, FW, 520);
  form(g, [[0, 500], [FW, 500], [FW, FH], [0, FH]], { v: .42, seed: 300, line: 2 });
  for (let i = 0; i < 10; i++) stroke(g, [[0, 520 + i * 26 + i * i * 3], [FW, 520 + i * 26 + i * i * 3]], 1.2, { seed: 301 + i, color: grey(.3) });
  // Kraftwerk rechts: Gebäude + Kamin + Ufermauer
  form(g, [[860, 640], [FW + 20, 640], [FW + 20, FH], [860, FH]], { v: .5, seed: 310, line: 2.4 });
  [0, 1, 2, 3].forEach(i => form(g, rectPts(930 + i * 125, 470, 100, 170), { v: .68, seed: 311 + i, line: 2.8, shade: 10 }));
  form(g, [[880, 640], [892, 300], [906, 300], [918, 640]], { v: .72, seed: 320, line: 2.4 });
  form(g, rectPts(846, 590, 22, 50), { v: .35, seed: 321, line: 2 });
  // die Welle: dunkle Wand mit weißer Gischtkante, von links
  const front = lerp(-200, 850, ss(seg(lt, 0, 1.9))), hmax = lerp(60, 330, ss(seg(lt, 0, 1.8)));
  const top = x => { const d = front - x; return 620 - hmax * (.7 + .3 * Math.exp(-d / 180)) * clamp(d / 50 + .3); };
  const P = [[-60, FH + 20]]; for (let x = -60; x <= front; x += 20) P.push([x, top(x)]);
  P.push([front + 40, top(front) + 30], [front + 20, 700], [front + 20, FH + 20]);
  form(g, P, { v: .14, seed: 330, line: 3.4, shade: 14 });
  for (let x = Math.max(-60, front - 700); x < front; x += 34) { const y = top(x); stroke(g, catmull([[x, y + 6], [x + 10, y + 30 + 20 * hash(x)], [x - 6, y + 60 + 40 * hash(x + 3)]], false, 4), 6, { seed: 340 + x, color: grey(.95) }); }
  // Aufprall an der Mauer: Gischtfontäne, Flut über das Gelände
  if (t > HIT.impact) {
    const u = seg(t, HIT.impact, HIT.impact + .9);
    const sp = []; for (let k = 0; k <= 16; k++) { const a = Math.PI * (1.08 + .84 * k / 16), r = (k % 2 ? .55 : 1) * (120 + 420 * ss(u)); sp.push([860 + Math.cos(a) * r, 620 + Math.sin(a) * r]); }
    form(g, sp, { v: .92, seed: 350, line: 2.4 });
    const fx = lerp(860, FW + 40, ss(seg(t, HIT.impact + .1, HIT.impact + 1.0)));
    form(g, [[860, 610], [fx, 606], [fx, FH], [860, FH]], { v: .16, seed: 351, line: 2.4 });
  }
}
function shotDark(g, m, t, lt) {
  room(g, null, t, { dark: 1, clock: [3, 37] });
  const on = t > HIT.click;
  // Bediener mit Taschenlampe links, Gesicht vom Streulicht erhellt
  person(g, 380, 1420, { s: 2.3, face: 'profile', dir: 1, seed: 400, wide: true, brow: 1, mouthO: true, skin: on ? .7 : .12, jacket: on ? .22 : .1, pants: .08, arms: [[-40, -230], [90, -300]] });
  if (on) {
    const ox = 380 + 90 * 2.3, oy = 1420 - 300 * 2.3;
    const a = lerp(-.28, -.12, ss(seg(t, HIT.click, HIT.click + 1.6)));
    g.save(); g.globalCompositeOperation = 'screen';
    const cone = [[ox, oy], [ox + Math.cos(a - .14) * 1400, oy + Math.sin(a - .14) * 1400], [ox + Math.cos(a + .14) * 1400, oy + Math.sin(a + .14) * 1400]];
    const gr = g.createRadialGradient(ox, oy, 10, ox, oy, 1300); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,.12)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(...cone[0]); g.lineTo(...cone[1]); g.lineTo(...cone[2]); g.closePath(); g.fill();
    g.restore();
    form(g, ellipsePts(ox, oy, 14, 10), { v: .95, seed: 410, line: 2 });
  }
}
const SHOT = { ROOM: shotRoom, WAVE: shotWave, DARK: shotDark };
function faceAt(t) { const s = 2.3; return [380 + 20 * s, 1420 - 372 * s]; }

export function renderFilm(g, t) {
  RD = RD || new Redraw(FW, FH); FP = FP || new FilmPost(FW, FH);
  const sec = secAt(t), look = sec.look, frame = Math.floor(t * 24 + 1e-6);
  const ta = Math.floor(t * look.fps + 1e-6) / look.fps, lt = Math.max(0, ta - sec.t0);
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over';
  mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, FW, FH);
  let src = fc, exposure = 1, useMask = false;
  const card = CARDS[sec.name];
  if (sec.name === 'PRE') { fg.fillStyle = '#0e0d0b'; fg.fillRect(0, 0, FW, FH); exposure = .25 + .6 * ss((t - HIT.curtain) / .6); }
  else if (card) intertitle(fg, FW, FH, card, t - sec.t0);
  else {
    setFrame(ta, { boil: 1 }); IS.sepLine = .5;
    fg.fillStyle = '#fff'; fg.fillRect(0, 0, FW, FH);
    fg.save(); SHOT[sec.name](fg, mg, ta, lt); fg.restore();
    src = RD.render(fc, { frame }); useMask = sec.name === 'ROOM';
  }
  // Iris schließt sich auf dem Gesicht im Dunkeln
  if (sec.name === 'DARK' && t > HIT.irisClose) {
    if (src !== fc) { fg.setTransform(1, 0, 0, 1, 0, 0); fg.drawImage(src, 0, 0); src = fc; }
    const k = ss(seg(t, HIT.irisClose, sec.t1 - .1)), [cx, cy] = faceAt(t);
    iris(fg, FW, FH, cx, cy, Math.max(.5, 1900 - (1900 - 0) * k), 4);
  }
  const dev = FP.render(src, { frame, strength: look.str, sepia: look.sepia, crank: look.crank ?? 1, exposure, halation: card ? 1.4 : undefined }, useMask ? mc : null);
  const curtain = t < 1.2 ? ss((t - HIT.curtain) / 1.1) : 1 - ss((t - HIT.curtainOut) / 1.0);
  theatre(g, W, H, GATE, Math.max(.3, FP.mean * (sec.name === 'PRE' ? exposure : 1)), curtain);
  g.save(); g.beginPath(); g.roundRect(GATE.x, GATE.y, GATE.w, GATE.h, 22); g.clip();
  g.drawImage(dev, GATE.x, GATE.y); damage(g, GATE.x, GATE.y, FW, FH, frame, look.str);
  g.restore();
  if (curtain < 1) curtainsOver(g, curtain, Math.max(.55, FP.mean));
}
function curtainsOver(g, open, spill) {
  const cover = (1 - open) * (W / 2 + 10); if (cover < 1) return;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  theatre(x, W, H, { x: W / 2, y: 0, w: 0, h: H }, spill, 1);
  g.save();
  g.drawImage(c, 0, 0, W / 2, H, cover - W / 2, 0, W / 2, H);
  g.drawImage(c, W / 2, 0, W / 2, H, W - cover, 0, W / 2, H);
  g.save(); g.beginPath(); g.rect(0, 0, cover, H); g.rect(W - cover, 0, cover, H); g.clip(); g.globalCompositeOperation = 'screen';
  const fl = g.createRadialGradient(W / 2, H + 120, 60, W / 2, H + 120, 1250); fl.addColorStop(0, 'rgba(255,170,110,.42)'); fl.addColorStop(.55, 'rgba(170,70,50,.16)'); fl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fl; g.fillRect(0, 0, W, H); g.restore();
  g.restore();
}
export function events() {
  const ev = [];
  for (const s of SEC) ev.push({ t: s.t0, type: 'section', name: s.name, t1: s.t1 });
  for (const k in HIT) ev.push({ t: HIT[k], type: 'hit', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
