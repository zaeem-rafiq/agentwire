#!/bin/sh
# Build the finalist demo from isolated capture, narration, audio, and card assets.
# Each segment is rendered losslessly, stream-concatenated, then subtitled in the final encode.
set -eu

python3 -c 'import PIL' 2>/dev/null || {
  echo "missing Python Pillow, required to render finalist captions" >&2
  exit 1
}

demo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=${AGENTWIRE_DEMO_EDIT_DIR:-"$demo/edit/finalist"}
A="$ROOT/audio"
C="$ROOT/captures"
N="$ROOT/narration"
S="$ROOT/assets"
M="$ROOT/mezzanine"
O="$ROOT/output"
SUB="$ROOT/subtitles"
mkdir -p "$M" "$O" "$SUB"

segments="10-open 11-audit 12-diff 13-health 14-sources 15-breaking 16-consent 17-human 18-proof 19-close"
for n in $segments; do
  [ -f "$A/$n.m4a" ] || { echo "missing $A/$n.m4a" >&2; exit 1; }
  [ -f "$N/$n.txt" ] || { echo "missing $N/$n.txt" >&2; exit 1; }
done
for f in "$C/live-agent.mp4" "$C/hero-agent.png" "$C/marks-agent.json" "$S/intro.png" "$S/proof.png" "$S/close.png"; do
  [ -f "$f" ] || { echo "missing $f" >&2; exit 1; }
done

dur() {
  ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$A/$1.m4a"
}
mark() {
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["marks"][sys.argv[2]])' "$C/marks-agent.json" "$1"
}
calc() {
  python3 -c "print(round($1, 3))"
}

A10=$(dur 10-open); A11=$(dur 11-audit); A12=$(dur 12-diff); A13=$(dur 13-health); A14=$(dur 14-sources)
A15=$(dur 15-breaking); A16=$(dur 16-consent); A17=$(dur 17-human); A18=$(dur 18-proof); A19=$(dur 19-close)
M1=$(mark q1); M2=$(mark q2); M3=$(mark q3); M4=$(mark q4); M5=$(mark q5); MC=$(mark consent); MH=$(mark human); ME=$(mark end)
python3 -c 'import sys; marks=list(map(float,sys.argv[1:])); sys.exit(0 if all(a < b for a,b in zip(marks,marks[1:])) else 1)' \
  "$M1" "$M2" "$M3" "$M4" "$M5" "$MC" "$MH" "$ME" || {
  echo "capture marks must be strictly increasing from q1 through end" >&2
  exit 1
}

OPEN=$(calc "$A10 + 1.0")
Q1=$(calc "max($A11 + 0.1, $M2 - $M1)")
Q2=$(calc "max($A12 + 0.1, $M3 - $M2)")
Q3=$(calc "max($A13 + 0.1, $M4 - $M3)")
Q4=$(calc "max($A14 + 0.1, $M5 - $M4)")
Q5=$(calc "max($A15 + 0.1, $MC - $M5)")
CONSENT=$(calc "max($A16 + 0.1, $MH - $MC)")
HUMAN=$(calc "max($A17 + 0.1, $ME - $MH)")
PROOF=$(calc "$A18 + 1.0")
CLOSE=$(calc "$A19 + 1.7")
TOTAL=$(calc "$OPEN + $Q1 + $Q2 + $Q3 + $Q4 + $Q5 + $CONSENT + $HUMAN + $PROOF + $CLOSE")

echo "segments: open=$OPEN q1=$Q1 q2=$Q2 q3=$Q3 q4=$Q4 q5=$Q5 consent=$CONSENT human=$HUMAN proof=$PROOF close=$CLOSE total=$TOTAL"
python3 -c "import sys; sys.exit(0 if 170.0 <= $TOTAL < 176.0 else 1)" || {
  echo "total $TOTAL must stay inside the approved 170-176s finalist window" >&2
  exit 1
}

python3 - "$O/timeline-agent-finalist.json" "$OPEN" "$Q1" "$Q2" "$Q3" "$Q4" "$Q5" "$CONSENT" "$HUMAN" "$PROOF" "$CLOSE" <<'PY'
import json, sys

out = sys.argv[1]
lengths = list(map(float, sys.argv[2:]))
names = ["10-open", "11-audit", "12-diff", "13-health", "14-sources", "15-breaking", "16-consent", "17-human", "18-proof", "19-close"]
start = 0.0
segments = []
for name, length in zip(names, lengths):
    segments.append({"name": name, "start": round(start, 3), "length": length, "audio": name, "audio_delay": 0.0})
    start += length
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"total": round(start, 3), "segments": segments}, fh, indent=2)
PY

render_card() {
  name=$1
  card=$2
  length=$3
  audio_length=$4
  fade_out=$(calc "$audio_length - 0.03")
  ffmpeg -y -v error \
    -loop 1 -framerate 30 -i "$C/hero-agent.png" \
    -loop 1 -framerate 30 -i "$card" \
    -i "$A/$name.m4a" \
    -filter_complex "
      [0:v]scale=1280:720,trim=duration=$length,setpts=PTS-STARTPTS,setsar=1,format=rgba[bg];
      [1:v]scale=1280:720,trim=duration=$length,setpts=PTS-STARTPTS,setsar=1,format=rgba[card];
      [bg][card]overlay=0:0:eof_action=pass,trim=duration=$length,fps=30,setsar=1,format=yuv420p[v];
      [2:a]aresample=48000,afade=t=in:st=0:d=0.03,afade=t=out:st=$fade_out:d=0.03,apad=whole_dur=$length,atrim=duration=$length[a]
    " \
    -map "[v]" -map "[a]" -r 30 -c:v libx264 -preset ultrafast -qp 0 -pix_fmt yuv420p \
    -c:a pcm_s16le -ar 48000 -ac 1 "$M/$name.mkv"
}

render_live() {
  name=$1
  start=$2
  end=$3
  length=$4
  audio_length=$5
  fade_out=$(calc "$audio_length - 0.03")
  ffmpeg -y -v error \
    -i "$C/live-agent.mp4" -i "$A/$name.m4a" \
    -filter_complex "
      [0:v]trim=start=$start:end=$end,setpts=PTS-STARTPTS,scale=1280:720,fps=30,tpad=stop_mode=clone:stop_duration=$length,trim=duration=$length,setsar=1,format=yuv420p[v];
      [1:a]aresample=48000,afade=t=in:st=0:d=0.03,afade=t=out:st=$fade_out:d=0.03,apad=whole_dur=$length,atrim=duration=$length[a]
    " \
    -map "[v]" -map "[a]" -r 30 -c:v libx264 -preset ultrafast -qp 0 -pix_fmt yuv420p \
    -c:a pcm_s16le -ar 48000 -ac 1 "$M/$name.mkv"
}

render_card 10-open "$S/intro.png" "$OPEN" "$A10"
render_live 11-audit "$M1" "$M2" "$Q1" "$A11"
render_live 12-diff "$M2" "$M3" "$Q2" "$A12"
render_live 13-health "$M3" "$M4" "$Q3" "$A13"
render_live 14-sources "$M4" "$M5" "$Q4" "$A14"
render_live 15-breaking "$M5" "$MC" "$Q5" "$A15"
render_live 16-consent "$MC" "$MH" "$CONSENT" "$A16"
render_live 17-human "$MH" "$ME" "$HUMAN" "$A17"
render_card 18-proof "$S/proof.png" "$PROOF" "$A18"
render_card 19-close "$S/close.png" "$CLOSE" "$A19"

{
  echo "ffconcat version 1.0"
  for n in $segments; do echo "file '$n.mkv'"; done
} > "$M/segments.ffconcat"
ffmpeg -y -v error -f concat -safe 0 -i "$M/segments.ffconcat" -c copy "$O/AgentWire-WebMCP-Demo-finalist-mezzanine.mkv"

AGENTWIRE_AUDIO_DIR="$A" AGENTWIRE_NARRATION_DIR="$N" \
  python3 "$demo/make-srt.py" "$O/timeline-agent-finalist.json" "$O/AgentWire-WebMCP-Demo-finalist.srt"

python3 - "$O/AgentWire-WebMCP-Demo-finalist.srt" "$O/timeline-agent-finalist.json" "$SUB" <<'PY'
import json, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

srt_path, timeline_path, out_dir = map(Path, sys.argv[1:])
out_dir.mkdir(parents=True, exist_ok=True)
for old in out_dir.glob("*.png"):
    old.unlink()

def seconds(value):
    hours, minutes, rest = value.replace(",", ".").split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(rest)

def wrap(draw, text, font, width):
    lines = []
    for source in text.splitlines():
        current = ""
        for word in source.split():
            candidate = f"{current} {word}".strip()
            if current and draw.textlength(candidate, font=font) > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
    return lines

font_path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
font = ImageFont.truetype(str(font_path), 30) if font_path.exists() else ImageFont.load_default()
total = float(json.loads(timeline_path.read_text())["total"])
cues = []
for block in re.split(r"\n\s*\n", srt_path.read_text().strip()):
    lines = block.splitlines()
    if len(lines) < 3:
        continue
    start, end = [seconds(value.strip()) for value in lines[1].split("-->")]
    cues.append((start, end, "\n".join(lines[2:])))

events = []
cursor = 0.0
for start, end, text in cues:
    if start > cursor:
        events.append((start - cursor, ""))
    events.append((max(0.001, end - start), text))
    cursor = max(cursor, end)
if cursor < total:
    events.append((total - cursor, ""))

manifest = ["ffconcat version 1.0"]
last_name = None
for index, (duration, text) in enumerate(events):
    image = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if text:
        lines = wrap(draw, text, font, 1080)
        rendered = "\n".join(lines)
        box = draw.multiline_textbbox((0, 0), rendered, font=font, spacing=7, stroke_width=2, align="center")
        width, height = box[2] - box[0], box[3] - box[1]
        x = (1280 - width) / 2
        y = 720 - height - 34
        draw.rounded_rectangle((x - 18, y - 12, x + width + 18, y + height + 12), radius=10, fill=(0, 0, 0, 178))
        draw.multiline_text((x, y), rendered, font=font, fill="white", spacing=7, align="center", stroke_width=2, stroke_fill=(15, 15, 15, 255))
    name = f"{index:03}.png"
    image.save(out_dir / name)
    manifest.extend((f"file '{name}'", f"duration {duration:.3f}"))
    last_name = name
if last_name is None:
    raise SystemExit("no subtitle timeline events")
manifest.append(f"file '{last_name}'")
(out_dir / "segments.ffconcat").write_text("\n".join(manifest) + "\n")
PY

ffmpeg -y -v error -f concat -safe 0 -i "$SUB/segments.ffconcat" \
  -vf "fps=30,format=argb" -c:v qtrle "$O/AgentWire-WebMCP-Demo-finalist-subtitles.mov"

ffmpeg -y -v error \
  -i "$O/AgentWire-WebMCP-Demo-finalist-mezzanine.mkv" \
  -i "$O/AgentWire-WebMCP-Demo-finalist-subtitles.mov" \
  -filter_complex "[0:v]scale=1280:720,fps=30,format=yuv420p[base];[base][1:v]overlay=0:0:eof_action=pass[v]" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -map "[v]" -map 0:a:0 \
  -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 1 -movflags +faststart \
  "$O/AgentWire-WebMCP-Demo-finalist.mp4"

echo "rendered $O/AgentWire-WebMCP-Demo-finalist.mp4"
