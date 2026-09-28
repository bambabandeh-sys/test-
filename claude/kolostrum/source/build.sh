#!/bin/sh
# Film komplett neu bauen: sh films/kolostrum/build.sh   (von überall aus)
set -e
cd "$(dirname "$0")/../.."
PY=.venv/bin/python; D=films/kolostrum
[ -f .lemo-env.sh ] && . ./.lemo-env.sh
$PY $D/tts/tts_de.py $D/lines.json $D/voices                  # 1. deutsche Stimme (Piper, Thorsten), Betonung per Phonem-Eingabe
node core/render/events.mjs $D                                 # 2. Zeitleiste → events.json (Stimme, Geräusche, Musik-Cues)
$PY $D/music/score.py                                          # 3. Originalmusik (Spieluhr, Spielzeugklavier, Flöte, Klarinette, Glockenspiel, Harfe)
$PY $D/mix.py                                                  # 4. Geräusche + Sprecher + Musik → mix.wav
node $D/subs.mjs && $PY core/render/srt.py $D/subs.json $D/kolostrum.srt      # 5. Untertitel
node core/render/video.mjs $D --fps 24 --workers 4 --out $D/out/video24.mp4    # 6. Bild für Bild rendern
CRF=24 sh $D/tools/mux.sh $D/out/video24.mp4 $D/mix.wav $D/kolostrum.mp4 24 0  # 7. Ton anlegen, −14 LUFS
node core/render/still.mjs $D 29.2 --out $D/out && cp $D/out/t_29.2.jpg $D/poster.jpg   # 8. Poster
