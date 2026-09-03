#!/bin/sh
# Assemble the real-agent demo: cold-open card + one continuous take (agent pane + page) + close card.
# Segment lengths follow the narration; live segments freeze their last frame if narration runs past the window.
set -eu
demo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
A="$demo/audio"; C="$demo/captures"; S="$demo/assets"; O="$demo/output"; mkdir -p "$O"
for n in 10-open 11-q1 12-q2 13-q3 14-q4 15-human 16-close; do [ -f "$A/$n.m4a" ] || { echo "missing $A/$n.m4a" >&2; exit 1; }; done
for f in "$C/live-agent.mp4" "$C/hero-agent.png" "$C/marks-agent.json" "$S/intro.png" "$S/close.png"; do [ -f "$f" ] || { echo "missing $f" >&2; exit 1; }; done
dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$A/$1.m4a"; }
mark() { python3 -c "import json;print(json.load(open('$C/marks-agent.json'))['marks']['$1'])"; }
calc() { python3 -c "print(round($1, 3))"; }
A10=$(dur 10-open); A11=$(dur 11-q1); A12=$(dur 12-q2); A13=$(dur 13-q3); A14=$(dur 14-q4); A15=$(dur 15-human); A16=$(dur 16-close)
M1=$(mark q1); M2=$(mark q2); M3=$(mark q3); M4=$(mark q4); MH=$(mark human); ME=$(mark end)
OPEN=$(calc "$A10 + 0.8")
Q1=$(calc "max($A11 + 0.8, $M2 - $M1)"); Q2=$(calc "max($A12 + 0.8, $M3 - $M2)"); Q3=$(calc "max($A13 + 0.8, $M4 - $M3)")
Q4=$(calc "max($A14 + 0.8, $MH - $M4)"); HUMAN=$(calc "max($A15 + 0.8, $ME - $MH)"); CLOSE=$(calc "$A16 + 2.4")
TOTAL=$(calc "$OPEN + $Q1 + $Q2 + $Q3 + $Q4 + $HUMAN + $CLOSE")
echo "segments: open=$OPEN q1=$Q1 q2=$Q2 q3=$Q3 q4=$Q4 human=$HUMAN close=$CLOSE total=$TOTAL"
python3 -c "import sys; sys.exit(1 if $TOTAL >= 179.0 else 0)" || { echo "total $TOTAL exceeds the 179s judge window" >&2; exit 1; }
python3 - "$O/timeline-agent.json" "$OPEN" "$Q1" "$Q2" "$Q3" "$Q4" "$HUMAN" "$CLOSE" <<'PY'
import json, sys
out = sys.argv[1]; L = list(map(float, sys.argv[2:])); names = ["10-open","11-q1","12-q2","13-q3","14-q4","15-human","16-close"]
t = 0.0; segs = []
for n, l in zip(names, L): segs.append({"name": n, "start": round(t, 3), "length": l, "audio": n, "audio_delay": 0.6 if n == "16-close" else 0.0}); t += l
json.dump({"total": round(t, 3), "segments": segs}, open(out, "w"), indent=2)
PY
live() { printf '[live_%s]trim=start=%s:end=%s,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=%s,trim=duration=%s,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[%s_v];' "$1" "$2" "$3" "$(calc "$4 + 1.0")" "$4" "$1"; }
aud() { printf '[%s:a]atrim=duration=%s,asetpts=PTS-STARTPTS,aresample=48000,apad=whole_dur=%s,atrim=duration=%s[%s_a];' "$1" "$2" "$2" "$2" "$3"; }
ffmpeg -y -v error \
  -loop 1 -framerate 30 -i "$C/hero-agent.png" -loop 1 -framerate 30 -i "$S/intro.png" -i "$A/10-open.m4a" \
  -i "$C/live-agent.mp4" -i "$A/11-q1.m4a" -i "$A/12-q2.m4a" -i "$A/13-q3.m4a" -i "$A/14-q4.m4a" -i "$A/15-human.m4a" \
  -loop 1 -framerate 30 -i "$S/close.png" -i "$A/16-close.m4a" \
  -filter_complex "
    [3:v]split=5[live_q1][live_q2][live_q3][live_q4][live_human];
    [0:v]split=2[hero_open][hero_close];
    [hero_open]trim=duration=$OPEN,setpts=PTS-STARTPTS,scale=1280:720,setsar=1,format=rgba[open_bg];
    [1:v]trim=duration=$OPEN,setpts=PTS-STARTPTS,format=rgba,fade=t=out:st=$(calc "$OPEN - 1.2"):d=0.6:alpha=1[open_card];
    [open_bg][open_card]overlay=0:0:eof_action=pass,format=yuv420p[open_v];
    $(aud 2 "$OPEN" open)
    $(live q1 "$M1" "$M2" "$Q1") $(aud 4 "$Q1" q1)
    $(live q2 "$M2" "$M3" "$Q2") $(aud 5 "$Q2" q2)
    $(live q3 "$M3" "$M4" "$Q3") $(aud 6 "$Q3" q3)
    $(live q4 "$M4" "$MH" "$Q4") $(aud 7 "$Q4" q4)
    $(live human "$MH" "$ME" "$HUMAN") $(aud 8 "$HUMAN" human)
    [hero_close]trim=duration=$CLOSE,setpts=PTS-STARTPTS,fps=30,scale=1280:720,setsar=1,format=rgba[close_bg];
    [9:v]trim=duration=$CLOSE,setpts=PTS-STARTPTS,format=rgba,fade=t=in:st=0:d=0.4:alpha=1[close_card];
    [close_bg][close_card]overlay=0:0:eof_action=pass,format=yuv420p[close_v];
    [10:a]adelay=600:all=1,aresample=48000,apad=whole_dur=$CLOSE,atrim=duration=$CLOSE[close_a];
    [open_v][open_a][q1_v][q1_a][q2_v][q2_a][q3_v][q3_a][q4_v][q4_a][human_v][human_a][close_v][close_a]concat=n=7:v=1:a=1[v][a0];[a0]loudnorm=I=-16:TP=-1.5:LRA=11[a]
  " \
  -map "[v]" -map "[a]" -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 1 -movflags +faststart \
  "$O/AgentWire-WebMCP-Demo-agent.mp4"
python3 "$demo/make-srt.py" "$O/timeline-agent.json" "$O/AgentWire-WebMCP-Demo-agent.srt"
echo "rendered $O/AgentWire-WebMCP-Demo-agent.mp4"
