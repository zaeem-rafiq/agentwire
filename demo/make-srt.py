"""Build an SRT from the render timeline: one cue per narration line, split at the
silences between speaker turns (silencedetect), falling back to a character-weighted split."""
import json, re, subprocess, sys
from pathlib import Path

demo = Path(__file__).resolve().parent
import os
audio_dir = Path(os.environ.get("AGENTWIRE_AUDIO_DIR", demo / "audio"))
narration_dir = Path(os.environ.get("AGENTWIRE_NARRATION_DIR", demo / "narration"))
timeline_path, out_path = sys.argv[1], sys.argv[2]
timeline = json.load(open(timeline_path))
SCRIPTS = None

def duration(audio):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(audio_dir / f"{audio}.m4a")]))

def silences(audio, minimum=0.32):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(audio_dir / f"{audio}.m4a"), "-af", f"silencedetect=noise=-38dB:d={minimum}", "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(m.group(1)) for m in re.finditer(r"silence_start: ([\d.]+)", log)]
    ends = [float(m.group(1)) for m in re.finditer(r"silence_end: ([\d.]+)", log)]
    return [(s, e) for s, e in zip(starts, ends) if s > 0.3]

def fmt(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

cues = []
for seg in timeline["segments"]:
    if not seg["audio"]:
        continue
    lines = [l.strip() for l in open(narration_dir / f"{seg["audio"]}.txt", encoding="utf-8") if l.strip()]
    total = duration(seg["audio"]); base = seg["start"] + seg["audio_delay"]
    gaps = silences(seg["audio"])
    if len(gaps) >= len(lines) - 1:
        gaps = gaps[:len(lines) - 1]
        bounds = [0.0] + [(s + e) / 2 for s, e in gaps] + [total]
    else:
        weights = [len(l) for l in lines]; acc = 0.0; bounds = [0.0]
        for w in weights:
            acc += total * w / sum(weights); bounds.append(acc)
    for line, start, end in zip(lines, bounds, bounds[1:]):
        cues.append((base + start, base + end, line))

with open(out_path, "w", encoding="utf-8") as fh:
    for index, (start, end, text) in enumerate(cues, 1):
        fh.write(f"{index}\n{fmt(start)} --> {fmt(end)}\n{text}\n\n")
print(f"{len(cues)} cues -> {out_path}")
