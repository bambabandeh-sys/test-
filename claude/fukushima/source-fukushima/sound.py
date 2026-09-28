"""Ton für „Fukushima“: Musik (tiefe Streicher, Pauke, Gong) + synthetische Geräusche → mix.wav
Lauf: .venv/bin/python films/fukushima/sound.py"""
import sys, os, json, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, ROOT)
from core.audio import sampler as S
from core.audio.sfx import SR, add, bp, lp, hp, limit, brown
S.seed(3)
E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; N = int(DUR * SR)
ev = {}; [ev.setdefault(e['type'], []).append(e) for e in E['ev']]
rng = np.random.default_rng(5)
mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); tt = np.arange(N) / SR
def T(d): return np.arange(int(d * SR)) / SR
def env(d, pts): k = np.array(pts, float); return np.interp(T(d), k[:, 0] * d, k[:, 1])
def nz(d): return rng.standard_normal(int(d * SR))
def note(inst, p, t, d, v=.5, pan=0, g=1., **kw): add(mus, S.note(inst, p, d, v, **kw), t, g, pan)

# —— Musik: d-Moll-Bordun, Schnitte mit Pauke ——
note('contrabass', 'D1', 0.0, 9.3, .45, -.1, .9, attack=1.2, release=.6)
note('cellos', 'A2', 0.6, 8.7, .35, .15, .6, attack=1.5, release=.6)
for k, p in enumerate(['D3', 'F3', 'E3']): note('cellos_pizz', p, 0.4 + k * 0.6, 1.0, .5, -.2, .7)
q = ev['quake'][0]['t']
for k in range(28): note('timpani', 'D2', q + k * 0.075, .4, .25 + .5 * k / 28, 0, .8)
note('gran_cassa', 'C2', q, 2.0, .9, 0, 1.2)
note('cellos_spic', 'D3', q + 0.4, .3, .7, -.2, .7); note('cellos_spic', 'Eb3', q + 0.9, .3, .7, .2, .7); note('cellos_spic', 'D3', q + 1.4, .3, .7, -.2, .7)
note('violins_trem', 'Eb5', q + 0.2, 4.4, .35, .3, .45, attack=.5, release=.5)
for c in ev['cut']: note('timpani', 'D2', c['t'], .8, .6, 0, .9)
rel = [e for e in ev['cue'] if e['id'] == 'relief'][0]['t']
for p, pan in [('F2', -.2), ('C3', .1), ('A3', .25)]: note('cellos', p, rel, 1.9, .35, pan, .7, attack=.3, release=.5)
note('contrabass', 'F1', rel, 1.9, .35, 0, .7, attack=.3, release=.5)
w = ev['wave'][0]
note('contrabass', 'D1', w['t'], 3.4, .6, 0, 1.1, attack=1.4, release=.3)
note('trombone', 'D2', w['t'] + .6, 2.6, .55, -.1, .7, attack=1.6, release=.2)
note('tuba', 'D1', w['t'] + .8, 2.4, .6, .1, .8, attack=1.4, release=.2)
for k in range(20): note('timpani', 'A1', w['t'] + 1.0 + k * 0.05, .3, .2 + .6 * k / 20, 0, .8)
imp = ev['impact'][0]['t']
note('gran_cassa', 'C2', imp, 2.0, 1., 0, 1.4); note('crash', 'C4', imp, 2.5, .8, .2, .5); note('gong', 'C3', imp, 3.0, .6, 0, .6)
pd = ev['powerdown'][0]
for k, p in enumerate(['A3', 'G3', 'F3', 'E3', 'D3']): note('cellos', p, pd['t'] + k * .38, .5, .35, -.1, .6, attack=.05, release=.3)
note('contrabass', 'D1', pd['t'], 2.0, .4, 0, .8, attack=.3, release=.4)
clk = ev['click'][0]['t']
note('contrabass', 'D1', clk + .4, 2.6, .35, 0, .8, attack=.6, release=.5)
note('gong', 'C3', clk + .5, 2.5, .25, 0, .45)
note('violins', 'D6', ev['breath'][0]['t'], 1.5, .2, .2, .25, attack=.6, release=.3)

# —— Geräusche ——
def put(x, t, g=1., pan=0.): add(fx, x.astype(np.float64), t, g, pan)
def carve(d):   # Messer ins Holz: kurze Anrisse
    out = np.zeros(int(d * SR)); t = 0.
    while t < d - .1:
        L = .05 + .12 * rng.random(); x = bp(nz(L), 1800, 6000) * env(L, [(0, 0), (.1, 1), (1, 0)]) * .12
        i = int(t * SR); out[i:i + len(x)] += x[:len(out) - i]; t += L + .03 * rng.random()
    return out
for e in ev.get('carve', []): put(carve(e['dur']), e['t'], .7, -.2)
qd = ev['quake'][0]
x = lp(brown(qd['dur']), 120) * env(qd['dur'], [(0, 0), (.05, 1), (.7, .8), (1, 0)]) * .5
rat = np.zeros(len(x));
for k in range(160): i = int(rng.random() * (len(x) - 2000)); rat[i:i + 800] += bp(nz(800 / SR), 2500, 7000) * np.exp(-np.arange(800) / 150) * .15 * (1 - i / len(x))
put(x + rat, qd['t'], 1., 0)
a = ev['alarm'][0]; d = a['dur']; t_ = T(d)
f = np.where((t_ * 2.2) % 1 < .5, 660, 523)
buzz = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .05
buzz = lp(buzz, 3000) * env(d, [(0, 0), (.02, 1), (.85, 1), (1, 0)])
put(buzz, a['t'], .8, .35)
dz = ev['diesel'][0]; d = dz['dur']; t_ = T(d)
hum = (np.sin(2 * np.pi * 50 * t_) + .4 * np.sin(2 * np.pi * 100 * t_) + .15 * np.sin(2 * np.pi * 150 * t_)) * .03 * env(d, [(0, 0), (.05, 1), (1, 1)])
put(hum, dz['t'], 1., -.3)
s = ev['sigh'][0]; put(lp(bp(nz(.9), 300, 2500), 1800) * env(.9, [(0, 0), (.3, 1), (1, 0)]) * .06, s['t'], 1., .1)
wv = ev['wave'][0]; d = wv['dur'] + .6
roar = (lp(brown(d), 400) * 1.2 + bp(nz(d), 400, 3000) * .25) * env(d, [(0, 0), (.6, .6), (.68, 1), (.8, .7), (1, 0)]) * .5
put(roar, wv['t'], 1., -.2)
put((bp(nz(1.4), 200, 6000) * np.exp(-T(1.4) / .35)) * .5, imp, 1., .2)
p = ev['powerdown'][0]; d = p['dur']
t_ = T(d); fr = 50 * np.exp(-t_ / (d * .6)) + 8
hum2 = np.sin(2 * np.pi * np.cumsum(fr) / SR) * .06 * env(d, [(0, 1), (.8, .4), (1, 0)])
put(hum2, p['t'], 1., 0)
for k in range(6):   # Relais fallen ab
    tk = p['t'] + k * d / 6 + .1 * rng.random(); L = .06; c_ = (bp(nz(L), 900, 5000) * np.exp(-T(L) / .01) + np.sin(2 * np.pi * 120 * T(L)) * np.exp(-T(L) / .02) * .5) * .5
    put(c_, tk, 1., -.6 + k * .24)
c = ev['click'][0]; L = .05; put((bp(nz(L), 2000, 8000) * np.exp(-T(L) / .004)) * .8, c['t'], 1., -.3)
b = ev['breath'][0]; put(lp(bp(nz(1.2), 250, 2200), 1500) * env(1.2, [(0, 0), (.4, 1), (1, 0)]) * .05, b['t'] + .2, 1., 0)
# leiser Raum-/Windgrund
air = lp(brown(DUR), 300) * .006
fx[:, 0] += air; fx[:, 1] += np.roll(air, 3000)

mix = mus * .9 + fx
# zwei Stillen: vor der Welle fast still, nach dem Stromausfall digital still bis zum Klick
for e in ev['silence']:
    lvl = 0.0 if e['t'] > 15 else 0.06                      # nach dem Stromausfall: digitale Stille
    g = np.interp(tt, [e['t'] - .04, e['t'], e['t'] + e['dur'], e['t'] + e['dur'] + .03], [1, lvl, lvl, 1])
    mix *= g[:, None]
mix *= np.clip((DUR - tt) / 1.0, 0, 1)[:, None]
for ch in range(2): mix[:, ch] = limit(mix[:, ch], .95)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
for a0, a1 in [(0, 2.3), (2.3, 7), (7, 9.4), (9.4, 10), (10, 13.2), (13.2, 16.3), (16.3, 16.95), (16.95, 20)]: print(f'{a0:5.2f}-{a1:5.2f}  {db(mix[int(a0*SR):int(a1*SR)]):6.1f} dB')
