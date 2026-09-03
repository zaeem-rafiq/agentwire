#!/bin/sh
# Sanity checks on the rendered demo: judge window, audio present, clean tail, no black frames at card starts.
set -eu
video=${1:?usage: demo/verify.sh VIDEO}
failed=0
duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$video")
if awk -v d="$duration" 'BEGIN { exit !(d >= 120 && d < 179) }'; then printf 'PASS: duration %.1fs inside the 120-179s judge window\n' "$duration"; else printf 'FAIL: duration %.1fs outside 120-179s\n' "$duration"; failed=1; fi
streams=$(ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$video" | sort | tr '\n' ' ')
case "$streams" in *audio*video*) echo "PASS: audio + video streams present";; *) echo "FAIL: streams: $streams"; failed=1;; esac
mean=$(ffmpeg -hide_banner -nostats -i "$video" -vn -af volumedetect -f null - 2>&1 | awk -F': ' '/mean_volume/ {print $2}' | tr -d ' dB')
if awk -v m="$mean" 'BEGIN { exit !(m > -40) }'; then echo "PASS: mean volume $mean dB (narration audible)"; else echo "FAIL: mean volume $mean dB"; failed=1; fi
tail_start=$(awk -v d="$duration" 'BEGIN { printf "%.3f", d - 1.2 }')
if ffmpeg -hide_banner -nostats -ss "$tail_start" -i "$video" -vn -af "silencedetect=noise=-45dB:d=0.8" -f null - 2>&1 | grep -q silence_start; then echo "PASS: final post-roll is silent"; else echo "FAIL: audio runs into the last frame"; failed=1; fi
if ffmpeg -hide_banner -nostats -i "$video" -an -vf "blackdetect=d=0.5:pix_th=0.05" -f null - 2>&1 | grep -q black_start; then echo "FAIL: black segment >= 0.5s detected"; failed=1; else echo "PASS: no black segments"; fi
exit "$failed"
