"""Deutsche Offline-Stimme (Piper, Thorsten-Voice u. a.): python tts/tts_de.py lines.json voices/
lines.json = [{"id", "text" (Untertitel), "say" (optional: Aussprache-Text), "voice", "len" (length_scale), "noise"}]
Schreibt voices/<id>.wav (22.05k→ Originalrate, Stille getrimmt) und voices/dur.json.
Fix: piper-tts zerlegt espeak-Phoneme in NFD (ç → c + ̧ ), die alten v0.0.2-Modelle kennen nur 'ç' → wieder NFC zusammensetzen."""
import sys, os, json, unicodedata, wave, io, numpy as np, soundfile as sf
from piper import PiperVoice
from piper.config import SynthesisConfig
HERE = os.path.dirname(os.path.abspath(__file__))
_orig = PiperVoice.phonemize
def _nfc(self, text):
    return [list(unicodedata.normalize('NFC', ''.join(s))) for s in _orig(self, text)]
PiperVoice.phonemize = _nfc
lines, out = json.load(open(sys.argv[1])), sys.argv[2]
os.makedirs(out, exist_ok=True); dur = {}; V = {}
for L in lines:
    v = L.get('voice', 'de-thorsten-low')
    if v not in V: V[v] = PiperVoice.load(os.path.join(HERE, v + '.onnx'))
    cfg = SynthesisConfig(length_scale=L.get('len', 1.0), noise_scale=L.get('noise', 0.6), noise_w_scale=L.get('noisew', 0.8))
    chunks = list(V[v].synthesize(L.get('say', L['text']), syn_config=cfg))
    sr = chunks[0].sample_rate
    gap = np.zeros(int(L.get('gap', 0.28) * sr), np.float32)
    parts = []
    for i, c in enumerate(chunks):
        if i: parts.append(gap)
        parts.append(c.audio_float_array.astype(np.float32))
    y = np.concatenate(parts)
    a = np.abs(y); th = a.max() * 0.02; idx = np.where(a > th)[0]
    y = y[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.06 * sr)]
    sf.write(os.path.join(out, L['id'] + '.wav'), y, sr); dur[L['id']] = round(len(y) / sr, 3)
    print(L['id'], dur[L['id']], L['text'])
json.dump(dur, open(os.path.join(out, 'dur.json'), 'w'), indent=1)
