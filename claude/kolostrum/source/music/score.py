"""Originalmusik „Kolostrum“: 3/4, 72 BPM, F-Dur, 39 s – Spieluhr, Spielzeugklavier, Flöte, Klarinette, Glockenspiel, Harfe.
Lauf: .venv/bin/python films/kolostrum/music/score.py → music/score.wav, music/stems/*.wav
"""
import sys, os, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, ROOT)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, bp, lp, hp
from scipy.signal import butter, sosfilt

S.seed(7)
DUR = 39.0
N = int(DUR * SR)
B = 60 / 72          # 1 拍
BAR = 3 * B          # 1 小节 = 2.5 s
rng = np.random.default_rng(11)
stems = {k: np.zeros((N, 2), np.float32) for k in ['musicbox', 'toypiano', 'flute', 'clarinet', 'glock', 'bass']}

def m(p): return S.midi(p)

# ---------- 乐器 ----------
def mbox(t, p, vel=.7, pan=.1, gain=1.0, st='musicbox', dur=None):
    x = P.pluck('music_box', m(p) if isinstance(p, str) else p, dur, vel)
    add(stems[st], x, t, gain, pan)

def toy(pitch, vel=.7, detune=None):
    """玩具钢琴：锤子敲金属棒。非谐分音 + 快衰减 + 小锤击噪声 + 木盒共鸣，略微走音"""
    f0 = 440 * 2 ** ((m(pitch) - 69) / 12) * 2 ** ((detune if detune is not None else rng.uniform(-9, 9)) / 1200)
    d = 1.6; t = np.arange(int(d * SR)) / SR; y = np.zeros_like(t)
    for r, a, t60 in [(1, 1.0, 1.1), (2.92, .42, .38), (5.84, .2, .18), (9.3, .1, .09), (1.004, .35, 1.0)]:
        if f0 * r > 18000: continue
        y += a * np.sin(2 * np.pi * f0 * r * t + rng.random() * 6) * np.exp(-6.9 * t / t60)
    L = int(.01 * SR); nz = rng.standard_normal(L) * np.exp(-np.arange(L) / (.0012 * SR))
    y[:L] += bp(nz, 1500, 6000) * .6 * vel
    thud = np.sin(2 * np.pi * 180 * t[:int(.05 * SR)]) * np.exp(-t[:int(.05 * SR)] / .012)
    y[:len(thud)] += thud * .25
    y = lp(y, 7000)
    y[:48] *= np.linspace(0, 1, 48); y[-480:] *= np.linspace(1, 0, 480)
    y *= .12 * (vel / .8) ** 1.3 / (np.sqrt(np.mean(y[:int(.1 * SR)] ** 2)) + 1e-9)
    return y.astype(np.float32)

def toyp(t, p, vel=.7, pan=-.15, gain=1.0):
    add(stems['toypiano'], toy(p, vel), t, gain, pan)

def samp(st, inst, t, p, dur, vel=.6, pan=0., gain=1.0, attack=0., release=None):
    x = S.note(inst, p, dur, vel, release=release, attack=attack)
    add(stems[st], x, t, gain, pan)

def bend(x, curve):
    """按半音曲线（与样本等长的数组）变速重采样 = 滑音"""
    rate = 2 ** (curve / 12)
    pos = np.cumsum(rate); pos = pos[pos < len(x) - 1]
    i = pos.astype(int); f = pos - i
    return (x[i] * (1 - f) + x[i + 1] * f).astype(np.float32)

def slide(st, inst, t, p, dur, semis, vel=.55, pan=0., gain=1., t0=.15):
    """先保持 t0 秒再滑落 semis 个半音（哈欠 / 哇–哇）"""
    x = S.note(inst, p, dur + .2, vel, release=.25)
    n = len(x); tt = np.arange(n) / SR
    c = np.where(tt < t0, 0, np.clip((tt - t0) / max(dur - t0, .05), 0, 1) ** 1.3 * semis)
    y = bend(x, c)
    add(stems[st], y, t, gain, pan)

# ---------- 主旋律（全片统一）：4 小节，拍为单位 ----------
# 和声：F | Bb | C7 | F
THEME = [
    [('F4', 0, .5), ('A4', .5, .5), ('C5', 1, 1.5), ('A4', 2.5, .5)],          # 句一（F）
    [('D5', 0, 1), ('C5', 1, .5), ('Bb4', 1.5, .5), ('A4', 2, 1)],             # 句二（Bb）
    [('G4', 0, .5), ('Bb4', .5, .5), ('E5', 1, 1.5), ('D5', 2.5, .5)],         # 句三（C7）
    [('C5', 0, 3)],                                                            # 长音（F，开放地停在五度上）
]
def play_theme_bar(bar, t0, fn, beat=B, trans=0):
    for p, b, d in THEME[bar]:
        fn(t0 + b * beat, m(p) + trans, d * beat)


key = {}
ev = json.load(open(os.path.join(HERE, '..', 'events.json')))['ev']
T = lambda ty: [e for e in ev if e['type'] == ty]

# ===== A 0–7.5: Spieluhr-Motiv (erste Themenzeile), Tropfen = heller Glockenschlag =====
key['A'] = 0.0
play_theme_bar(0, 0.0, lambda t, p, d: mbox(t, p + 12, .6, .15))
play_theme_bar(1, 2.5, lambda t, p, d: mbox(t, p + 12, .56, .1))
samp('clarinet', 'clarinet', 2.5, 'F3', 2.4, .28, -.2, .5, attack=.5, release=.8)
samp('clarinet', 'clarinet', 5.0, 'E3', 1.1, .28, -.2, .45, attack=.3, release=.4)
for tt in (5.0, 5.25): toyp(tt, 'Eb4', .55, .2, .9)           # rotes Kreuz: zwei schiefe Töne
hero = T('pop')[0]['t']
for k, p in enumerate(['F5', 'A5', 'C6', 'F6']): mbox(hero + k * .05, p, .6, -.2 + k * .15, .8)
add(stems['glock'], S.note('glockenspiel', 'C7', 2.0, .55), hero, .9, .1)
samp('flute', 'flute', hero + .1, 'A5', 1.3, .4, .15, .7, attack=.08, release=.4)
for i, p in enumerate(['C5', 'D5', 'F5', 'A5', 'C6']): mbox(6.5 + i * .16, p, .35, .3, .5)   # Titel wird geschrieben

# ===== B 7.5–12.3: Spielzeugklavier-Walzer, Tropfen-Pops, „nie wieder“ =====
key['B'] = 7.5
chords = [('F3', ['A4', 'C5']), ('C3', ['G4', 'Bb4']), ('F3', ['A4', 'C5']), ('C3', ['G4', 'Bb4'])]
for bi in range(2):
    t0 = 7.5 + bi * BAR; root, ch = chords[bi]
    samp('clarinet', 'clarinet_stac', t0, m(root) + 12, .3, .5, -.25, .9)
    for k in (1, 2):
        for p in ch: toyp(t0 + k * B, p, .36, -.1, .8)
for (e, p) in zip(T('pop')[1:4], ['C5', 'E5', 'G5']):
    toyp(e['t'], p, .8, e.get('pan', 0), 1.1); mbox(e['t'], m(p) + 12, .4, e.get('pan', 0), .55)
samp('clarinet', 'clarinet_stac', 10.0, 'F3', .3, .45, -.25, .8)
for k in (1, 2): toyp(10.0 + k * B, 'A4', .3, -.1, .7)
for e, p in zip(T('puff'), ['A6', 'C7', 'F7']): add(stems['glock'], S.note('glockenspiel', p, 1.2, .35), e['t'], .6, e.get('pan', 0))
slide('clarinet', 'clarinet', 11.45, 'Bb3', .34, -1.0, .55, .1, 1.0, t0=.08)     # wa–waa
slide('clarinet', 'clarinet', 11.8, 'A3', .4, -2.4, .55, .1, 1.0, t0=.06)
key['silence'] = [12.3, 12.9]

# ===== C 12.9–19.4: Frage (Klarinette) → Flötenphrase „andere Kulturen“, Sonne/Mond-Bögen =====
key['C'] = 12.9
for tt, p, d in [(12.9, 'C4', .35), (13.25, 'E4', .35), (13.6, 'Bb4', .9)]: samp('clarinet', 'clarinet', tt, p, d, .42, -.1, .8, attack=.03, release=.3)
toyp(13.62, 'C6', .6, 0, .9)
fl = [(14.8, 'C5', B), (14.8 + B, 'D5', .5 * B), (14.8 + 1.5 * B, 'F5', 2.2 * B), (17.3, 'E5', B), (17.3 + B, 'D5', .5 * B), (17.3 + 1.5 * B, 'C5', 1.8 * B)]
for tt, p, d in fl: samp('flute', 'flute', tt, p, d, .45, .15, .9, attack=.06, release=.35)
for t0, ch in [(14.8, ['D5', 'F5', 'A5']), (17.3, ['Bb4', 'D5', 'F5'])]:
    for k, p in enumerate(ch): mbox(t0 + k * B * .5, m(p) + 12 if k else m(p), .3, -.35, .55)
for t0, p in [(14.8, 'D2'), (17.3, 'Bb1')]:
    add(stems['bass'], S.note('harp', p, 2.4, .5), t0, .8, -.05); add(stems['bass'], S.note('harp', m(p) + 7, 1.5, .3), t0 + B, .55, .05)
for e in T('sunarc') + T('moonarc'):
    notes = ['F6', 'A6', 'C7', 'A6', 'F6'] if e['type'] == 'sunarc' else ['D6', 'F6', 'A6', 'F6', 'D6']
    for k, p in enumerate(notes): add(stems['glock'], S.note('glockenspiel', p, .8, .25), e['t'] + k * e['dur'] / 5, .5, -.6 + k * .3)
for tt in (15.6, 16.2): toyp(tt, 'G5', .35, .3, .6)                          # Löffel

# ===== D 19.4–24.2: Morgen – Spieluhr hell, Kapseln „eins, zwei“, Kalender =====
key['D'] = 19.4
for k, p in enumerate(['C5', 'F5', 'A5', 'C6', 'F6']): mbox(19.4 + k * .12, p, .45, .3, .7)   # Sonnenaufgang
walk = [(19.4, 'F3'), (19.4 + B, 'A3'), (19.4 + 2 * B, 'C4'), (21.9, 'Bb3'), (21.9 + B, 'D4'), (21.9 + 2 * B, 'C4')]
for tt, p in walk: samp('clarinet', 'clarinet_stac', tt, p, .4, .42, -.25, .85)
for e, p in zip(T('cap'), ['C5', 'E5']):
    toyp(e['t'], p, .85, .2, 1.1); add(stems['glock'], S.note('glockenspiel', m(p) + 24, 1.0, .4), e['t'], .7, .2)
samp('flute', 'flute', 21.2, 'A5', .9, .35, .15, .6, attack=.1, release=.4)
cal = T('riffle')[0]
for k in range(8): mbox(cal['t'] + k * cal['dur'] / 8, 96 - k * 2, .3, -.3, .4)
toyp(cal['t'] + cal['dur'], 'F5', .8, -.3, 1.0); toyp(cal['t'] + cal['dur'] + .12, 'C6', .7, -.3, .9)
samp('clarinet', 'clarinet', 23.3, 'C4', .8, .3, -.2, .6, attack=.1, release=.3)
key['breath'] = [24.2, 24.5]

# ===== E 24.5–34.5: das Thema ganz, einmal (Wasserfarbe, Adresse) =====
key['E'] = 24.5
E0 = 24.5
for bar in range(4):
    t0 = E0 + bar * BAR
    play_theme_bar(bar, t0, lambda t, p, d: samp('flute', 'flute', t, p, d + (.25 if bar < 3 else 0), .55, .12, 1.0, attack=.05, release=.4))
    play_theme_bar(bar, t0, lambda t, p, d: mbox(t, p + 12, .5, -.15, .55))
counter = [(E0, 'A3', 1.5 * B), (E0 + 1.5 * B, 'C4', 1.5 * B), (E0 + BAR, 'Bb3', 1.5 * B), (E0 + BAR + 1.5 * B, 'D4', 1.5 * B),
           (E0 + 2 * BAR, 'Bb3', 1.5 * B), (E0 + 2 * BAR + 1.5 * B, 'G3', 1.5 * B), (E0 + 3 * BAR, 'A3', 3 * B)]
for tt, p, d in counter: samp('clarinet', 'clarinet', tt, p, d, .36, -.3, .72, attack=.12, release=.4)
for bar, p in enumerate(['F2', 'Bb2', 'C3', 'F2']):
    t0 = E0 + bar * BAR
    add(stems['bass'], S.note('harp', p, 2.4, .55), t0, .9, -.05)
    add(stems['bass'], S.note('harp', m(p) + 7, 1.6, .35), t0 + B, .6, .05)
    add(stems['bass'], S.note('harp', m(p) + 12, 1.6, .3), t0 + 2 * B, .55, .1)
rv = T('reveal')[0]['t']
casc = ['C8', 'A7', 'F7', 'D7', 'C7', 'A6', 'G6', 'F6', 'D6', 'C6']
for k, p in enumerate(casc): add(stems['glock'], S.note('glockenspiel', p, 2.0, .42 - .015 * k), rv + k * .15, .8, .6 - k * .12)
url = 27.2                                                                         # „roroh.de“ gesprochen
for k, p in enumerate(['F5', 'A5', 'C6']): mbox(url + 1.2 + k * .08, p, .45, -.2 + k * .2, .6)
# 32.0–34.5: letzte Zeile länger, Schlussakkord landet beim Umblättern
for k, p in enumerate(['F4', 'A4', 'C5', 'F5']): mbox(34.2 + k * .09, p, .5, -.2 + k * .15, .8)
samp('clarinet', 'clarinet', 34.2, 'F3', 2.6, .3, -.2, .7, attack=.15, release=1.2)
add(stems['bass'], S.note('harp', 'F2', 3.2, .45), 34.2, .8, 0)
add(stems['glock'], S.note('glockenspiel', 'F6', 2.0, .4), 34.3, .7, .2)

# ===== F 35.0–39: Spieluhr läuft aus =====
key['F'] = 35.0
g = np.zeros((int(4.5 * SR), 2), np.float32)
for tt, p in zip([0.0, .55, 1.15, 2.05], ['F5', 'A5', 'C6', 'A5']): add(g, P.pluck('music_box', p, None, .5), tt, .9, .1)
add(g, P.pluck('music_box', 'F5', None, .55), 3.0, 1.0, .05); add(g, P.pluck('music_box', 'C5', None, .32), 3.0, .6, -.1)
n = len(g); tt = np.arange(n) / SR
rate = 1 - .07 * np.clip(tt / 3.2, 0, 1) ** 1.5
pos = np.cumsum(rate); pos = pos[pos < n - 1]; i = pos.astype(int); f = (pos - i)[:, None]
gg = g[i] * (1 - f) + g[i + 1] * f
s0 = int(35.0 * SR); stems['musicbox'][s0:s0 + len(gg)] += gg[:N - s0]

# ---------- Mischen ----------
gains = {'musicbox': 1.0, 'toypiano': .55, 'flute': .8, 'clarinet': .75, 'glock': .7, 'bass': .8}
mix = sum(stems[k] * gains[k] for k in stems)
mix = S.room(mix, size=.42, mix=.2, damp=.45)
tt = np.arange(N) / SR
def gate(a, b, fade=.02):
    env = np.ones(N, np.float32); ia, ib = int(a * SR), int(b * SR); k = int(fade * SR)
    env[ia - k:ia] = np.linspace(1, 0, k); env[ia:ib] = 0; env[ib:ib + k] = np.minimum(env[ib:ib + k], np.linspace(0, 1, k))
    return env
env = gate(12.3, 12.9, .04) * gate(24.2, 24.5, .05) * np.clip((38.9 - tt) / 1.2, 0, 1).astype(np.float32)
mix *= env[:, None]
for k in stems: stems[k] *= env[:, None]
pk = np.abs(mix).max()
if pk > .9: mix *= .9 / pk; print('scaled peak', pk)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR)
for k in stems: sf.write(os.path.join(HERE, 'stems', k + '.wav'), (stems[k] * gains[k]).astype(np.float32), SR)
json.dump(key, open(os.path.join(HERE, 'score.json'), 'w'), indent=1)
def rms(a, b): x = mix[int(a * SR):int(b * SR)]; return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print('dur', len(mix) / SR, 'peak', round(float(np.abs(mix).max()), 3))
for nm, a, b in [('A', 0, 7.5), ('B', 7.5, 12.3), ('C', 12.9, 19.4), ('D', 19.4, 24.2), ('E', 24.5, 34.5), ('F', 34.5, 39)]: print(f'{nm} {a:5.2f}-{b:5.2f} rms {rms(a, b):6.1f} dB')
