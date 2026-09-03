#!/bin/sh
# Assemble the AgentWire demo: title cards + narration + the live WebMCP capture. Segment lengths follow the
# narration durations; live segments freeze their last frame if narration runs past the captured window.
# Usage: demo/render.sh   (needs ffmpeg, ffprobe, python3; run demo/generate-narration.mjs + demo/capture.mjs first)
set -eu
demo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
A="$demo/audio"; C="$demo/captures"; S="$demo/assets"; O="$demo/output"; mkdir -p "$O"
for n in 01-problem 02-tools 03-list 04-check 05-diff 06-watch 07-human 08-proof 09-close; do [ -f "$A/$n.m4a" ] || { echo "missing $A/$n.m4a" >&2; exit 1; }; done
for f in "$C/live.mp4" "$C/hero.png" "$C/tools.png" "$C/marks.json" "$S/intro.png" "$S/tools.png" "$S/proof.png" "$S/close.png"; do [ -f "$f" ] || { echo "missing $f" >&2; exit 1; }; done
dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$A/$1.m4a"; }
mark() { python3 -c "import json;print(json.load(open('$C/marks.json'))['marks']['$1'])"; }
calc() { python3 -c "print(round($1, 3))"; }
A01=$(dur 01-problem); A02=$(dur 02-tools); A03=$(dur 03-list); A04=$(dur 04-check); A05=$(dur 05-diff); A06=$(dur 06-watch); A07=$(dur 07-human); A08=$(dur 08-proof); A09=$(dur 09-close)
M_LIST=$(mark list); M_CHECK=$(mark check); M_DIFF=$(mark diff); M_WATCH=$(mark watch); M_HUMAN=$(mark human); M_END=$(mark end)
INTRO=$(calc "$A01 + 0.6"); TOOLS=$(calc "$A02 + 0.6")
LIST=$(calc "max($A03 + 0.6, $M_CHECK - $M_LIST)"); CHECK=$(calc "max($A04 + 0.6, $M_DIFF - $M_CHECK)")
DIFF=$(calc "max($A05 + 0.6, $M_WATCH - $M_DIFF)"); WATCH=$(calc "max($A06 + 0.6, $M_HUMAN - $M_WATCH)")
HUMAN=$(calc "max($A07 + 0.6, $M_END - $M_HUMAN)"); PROOF=$(calc "$A08 + 0.8"); CLOSE=$(calc "$A09 + 2.4")
TOOLS_SCREEN=$(calc "max($TOOLS - 9.0, 6.0)"); TOOLS_XFADE=$(calc "$TOOLS_SCREEN - 0.5")
TOTAL=$(calc "$INTRO + $TOOLS + $LIST + $CHECK + $DIFF + $WATCH + $HUMAN + $PROOF + $CLOSE")
echo "segments: intro=$INTRO tools=$TOOLS list=$LIST check=$CHECK diff=$DIFF watch=$WATCH human=$HUMAN proof=$PROOF close=$CLOSE total=$TOTAL"
python3 -c "import sys; sys.exit(1 if $TOTAL >= 179.0 else 0)" || { echo "total $TOTAL exceeds the 179s judge window; shorten narration" >&2; exit 1; }
python3 - "$O/timeline.json" "$INTRO" "$TOOLS" "$LIST" "$CHECK" "$DIFF" "$WATCH" "$HUMAN" "$PROOF" "$CLOSE" <<'PY'
import json, sys
out = sys.argv[1]; L = list(map(float, sys.argv[2:])); names = ["01-problem","02-tools","03-list","04-check","05-diff","06-watch","07-human","08-proof","09-close"]
t = 0.0; segs = []
for n, l in zip(names, L): segs.append({"name": n, "start": round(t, 3), "length": l, "audio": n, "audio_delay": 0.6 if n == "09-close" else 0.0}); t += l
json.dump({"total": round(t, 3), "segments": segs}, open(out, "w"), indent=2)
PY
live() { # $1 label, $2 start, $3 end, $4 seglen -> [label_v]
  printf '[live_%s]trim=start=%s:end=%s,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=%s,trim=duration=%s,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[%s_v];' "$1" "$2" "$3" "$(calc "$4 + 1.0")" "$4" "$1"
}
aud() { printf '[%s:a]atrim=duration=%s,asetpts=PTS-STARTPTS,aresample=48000,apad=whole_dur=%s,atrim=duration=%s[%s_a];' "$1" "$2" "$2" "$2" "$3"; }
ffmpeg -y -v error \
  -loop 1 -framerate 30 -i "$C/hero.png" -loop 1 -framerate 30 -i "$S/intro.png" -i "$A/01-problem.m4a" \
  -loop 1 -framerate 30 -i "$C/tools.png" -loop 1 -framerate 30 -i "$S/tools.png" -i "$A/02-tools.m4a" \
  -i "$C/live.mp4" -i "$A/03-list.m4a" -i "$A/04-check.m4a" -i "$A/05-diff.m4a" -i "$A/06-watch.m4a" -i "$A/07-human.m4a" \
  -loop 1 -framerate 30 -i "$S/proof.png" -i "$A/08-proof.m4a" \
  -loop 1 -framerate 30 -i "$S/close.png" -i "$A/09-close.m4a" \
  -filter_complex "
    [6:v]split=5[live_list][live_check][live_diff][live_watch][live_human];
    [0:v]split=2[hero_intro][hero_close];
    [3:v]split=3[shot_tools][shot_proof][shot_spare];[shot_spare]nullsink;
    [hero_intro]trim=duration=$INTRO,setpts=PTS-STARTPTS,scale=1280:720,setsar=1,format=rgba[intro_bg];
    [1:v]trim=duration=$(calc "$INTRO - 4.0"),setpts=PTS-STARTPTS,format=rgba,fade=t=out:st=$(calc "$INTRO - 4.5"):d=0.5:alpha=1[intro_card];
    [intro_bg][intro_card]overlay=0:0:eof_action=pass,format=yuv420p[intro_v];
    $(aud 2 "$INTRO" intro)
    [shot_tools]trim=duration=$TOOLS,setpts=PTS-STARTPTS,scale=1280:720,setsar=1,format=rgba[tools_screen];
    [4:v]trim=duration=$TOOLS,setpts=PTS-STARTPTS,format=rgba,fade=t=in:st=$TOOLS_XFADE:d=0.5:alpha=1[tools_card];
    [tools_screen][tools_card]overlay=0:0:eof_action=pass,format=yuv420p[tools_v];
    $(aud 5 "$TOOLS" tools)
    $(live list "$M_LIST" "$M_CHECK" "$LIST") $(aud 7 "$LIST" list)
    $(live check "$M_CHECK" "$M_DIFF" "$CHECK") $(aud 8 "$CHECK" check)
    $(live diff "$M_DIFF" "$M_WATCH" "$DIFF") $(aud 9 "$DIFF" diff)
    $(live watch "$M_WATCH" "$M_HUMAN" "$WATCH") $(aud 10 "$WATCH" watch)
    $(live human "$M_HUMAN" "$M_END" "$HUMAN") $(aud 11 "$HUMAN" human)
    [shot_proof]trim=duration=$PROOF,setpts=PTS-STARTPTS,fps=30,scale=1298:730,crop=1280:720:x='8+8*sin(n/180)':y='5+5*cos(n/220)',setsar=1,format=rgba[proof_bg];
    [12:v]trim=duration=$PROOF,setpts=PTS-STARTPTS,format=rgba,fade=t=in:st=0:d=0.4:alpha=1[proof_card];
    [proof_bg][proof_card]overlay=0:0:eof_action=pass,format=yuv420p[proof_v];
    $(aud 13 "$PROOF" proof)
    [hero_close]trim=duration=$CLOSE,setpts=PTS-STARTPTS,fps=30,scale=1280:720,setsar=1,format=rgba[close_bg];
    [14:v]trim=duration=$CLOSE,setpts=PTS-STARTPTS,format=rgba,fade=t=in:st=0:d=0.4:alpha=1[close_card];
    [close_bg][close_card]overlay=0:0:eof_action=pass,format=yuv420p[close_v];
    [15:a]adelay=600:all=1,aresample=48000,apad=whole_dur=$CLOSE,atrim=duration=$CLOSE[close_a];
    [intro_v][intro_a][tools_v][tools_a][list_v][list_a][check_v][check_a][diff_v][diff_a][watch_v][watch_a][human_v][human_a][proof_v][proof_a][close_v][close_a]concat=n=9:v=1:a=1[v][a]
  " \
  -map "[v]" -map "[a]" -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 1 -movflags +faststart \
  "$O/AgentWire-WebMCP-Demo.mp4"
python3 "$demo/make-srt.py" "$O/timeline.json" "$O/AgentWire-WebMCP-Demo.srt"
echo "rendered $O/AgentWire-WebMCP-Demo.mp4"
