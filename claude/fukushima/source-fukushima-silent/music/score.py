"""Klavierbegleitung wie im Kino der 1920er (Upright, VSCO 2 CE) + Projektor → ../mix.wav
Das Klavier macht die Geräusche: Cluster fürs Beben, Glissando für die Welle, Krachakkord beim Aufprall.
Lauf: .venv/bin/python films/fukushima-silent/music/score.py"""
import sys, os, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, ROOT)
from core.audio import sampler as S
from core.audio.sfx import SR, add, bp, lp, hp, limit, compress
S.seed(1926)
DUR = 20.0; N = int(DUR * SR)
HIT = dict(quake=4.4, relief=6.8, wave=10.0, impact=11.9, click=15.75, iris=17.3, out=18.95)
EV = []
def n(t, p, d, v=.6, pan=0.): EV.append((t, 'upright', p, d, v, pan))
def chord(t, ps, d, v=.6, roll=0.): [n(t + i * roll, p, d, v * (1 - .04 * i), (i - len(ps) / 2) * .08) for i, p in enumerate(ps)]
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
m2n = lambda m: NAMES[m % 12] + str(m // 12 - 1)
mi = lambda p: int(round(S.midi(p)))
def gliss(t, p0, p1, d, v0=.5, v1=.75):
    a, b = mi(p0), mi(p1); st = 1 if b > a else -1; ns = [m for m in range(a, b + st, st) if m % 12 in (0, 2, 4, 5, 7, 9, 11)]
    for i, m in enumerate(ns): u = i / max(1, len(ns) - 1); n(t + u * d, m2n(m), .25, v0 + (v1 - v0) * u)
def trem(t, lo, hi, d, rate=14, v=.5, cres=0.):
    k = 0
    while k / rate < d: n(t + k / rate, lo if k % 2 == 0 else hi, .12, v + cres * k / (rate * d)); k += 1

# Titelkarte: Maestoso, d-Moll
chord(0.85, ['D2', 'A2', 'D3', 'F3', 'A3'], 2.2, .6, .03); chord(2.05, ['A1', 'E3', 'G3', 'C#4'], 1.2, .5, .03)
# Kontrollraum ruhig: Andante, einfache Melodie über Walzerbass
B = .55
for i, (bass, mel) in enumerate([('D2', 'F4'), ('A1', 'E4')]):
    t0 = 3.3 + i * 3 * B
    n(t0, bass, .5, .45); chord(t0 + B, ['F3', 'A3'], .3, .3); chord(t0 + 2 * B, ['F3', 'A3'], .3, .3)
    n(t0, mel, B * 1.8, .45)
# Beben: Unterarm-Cluster, tiefes Tremolo, fallendes Glissando
chord(HIT['quake'], ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1'], 1.2, .9)
trem(HIT['quake'] + .2, 'D1', 'A1', 2.2, 16, .45, .3)
for k in range(6): chord(HIT['quake'] + .3 + k * .36, ['G#4', 'D5'] if k % 2 else ['A4', 'D#5'], .15, .55)
gliss(HIT['quake'] + 1.6, 'C7', 'C4', .7, .6, .4)
# Erleichterung: Dur-Akkord, dann ruhige Karte
chord(HIT['relief'], ['F2', 'C3', 'F3', 'A3', 'C4'], 1.6, .45, .05)
for k, p in enumerate(['A4', 'G4', 'F4', 'E4', 'F4']): n(7.7 + k * .45, p, .5, .4)
chord(7.7, ['F2', 'C3'], 1.8, .35); chord(8.6, ['B1', 'F3', 'D3'], 1.4, .35); chord(9.45, ['C2', 'E3', 'Bb3'], .6, .4)   # Vorhalt
# Welle: Agitato, schneller, Glissando hoch, Krachakkord
trem(HIT['wave'], 'D1', 'D2', 1.8, 18, .4, .45)
for k in range(8): n(HIT['wave'] + .2 + k * .2, m2n(mi('D3') + k), .15, .5 + .04 * k)
gliss(HIT['impact'] - .5, 'C4', 'C7', .45, .5, .8)
chord(HIT['impact'], ['D1', 'A1', 'D2', 'F2', 'G#2', 'D3', 'F3', 'G#3', 'D4'], 1.2, 1.0)
trem(HIT['impact'] + .3, 'A1', 'D#2', .7, 16, .45)
# Karte KEIN STROM!: verminderte Sforzandi, dann fallend
for k in range(4): chord(13.05 + k * .45, ['B2', 'D3', 'F3', 'G#3'], .3, .85)
gliss(14.9, 'C6', 'C2', .4, .5, .3)
# Dunkel: Stille, Klick, Misterioso
n(HIT['click'], 'E7', .6, .35)
for k, p in enumerate(['D2', 'F2', 'E2', 'D2']): n(16.1 + k * .6, p, .8, .4)
chord(HIT['iris'], ['D3', 'F3', 'Ab3'], 1.2, .3, .08)
# Ende: tiefer Schlussakkord, ritardando
chord(18.7, ['D1', 'D2', 'A2', 'D3', 'F3'], 1.3, .55, .06); n(19.3, 'D4', .6, .3)

mus = S.render(EV, DUR, master=False)
if mus.ndim == 1: mus = np.stack([mus, mus], 1)
mus = mus[:N]
for c in range(2): mus[:, c] = compress(mus[:, c] / (np.abs(mus).max() + 1e-9) * .8, thr=.3, ratio=2.5)
mus = S.room(mus, size=.35, mix=.18)
# Stille im Dunkeln bis zum Klick (nur der Projektor)
tt = np.arange(N) / SR
mus *= np.interp(tt, [15.25, 15.3, HIT['click'] - .01, HIT['click']], [1, 0, 0, 1])[:, None]
# Projektor: Motor-Schnurren (Greifer 24 Hz) + Lampenklick + Anlaufen + Filmende flattert
rng = np.random.default_rng(3)
clk = np.zeros(N); step = SR // 24
for i in range(int(.4 * SR), N, step): clk[i:i + 60] += rng.standard_normal(60) * np.exp(-np.arange(60) / 12)
proj = bp(clk, 800, 4000) * .05 + lp(rng.standard_normal(N), 180) * .015
proj *= np.interp(tt, [0, .35, .9, 18.8, 19.6], [0, .2, 1, 1, .7])
lamp = np.zeros(N); lamp[int(.05 * SR):int(.05 * SR) + 300] = rng.standard_normal(300) * np.exp(-np.arange(300) / 40) * .4
flap = np.zeros(N)
for k in range(10): i = int((19.2 + k * .07) * SR); flap[i:i + 400] += bp(rng.standard_normal(400), 300, 3000) * np.exp(-np.arange(400) / 80) * .25
amb = proj + lamp + flap
amb *= np.interp(tt, [15.3, 15.5, 15.7, 15.8], [1, 1.8, 1.8, 1])        # in der Stille hört man nur den Projektor
mix = mus * .9 + np.stack([amb, np.roll(amb, 400)], 1)
mix *= np.clip((DUR - tt) / .4, 0, 1)[:, None]
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
sf.write(os.path.join(HERE, '..', 'mix.wav'), mix.astype(np.float32), SR)
print('ok', mix.shape, float(np.abs(mix).max()))
