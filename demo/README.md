# Demo video pipeline

`make demo` produces `edit/finalist/output/AgentWire-WebMCP-Demo-finalist.mp4` (+ `.srt`) from the production site, with no manual screen recording.

1. `demo/capture-agent.mjs` launches Chrome with WebMCP enabled and records a DevTools screencast while a real Gemini agent
   invokes all five read tools through `WebMCP.invokeTool` → `WebMCP.toolResponded`. It refuses the write tool and asserts the
   exact call sequence. `AGENTWIRE_DEMO_EDIT_DIR` isolates the capture under `edit/finalist/`.
2. `demo/generate-narration.mjs` renders the checked-in finalist narration with Gemini TTS (Host = Kore, Expert = Iapetus).
   `AGENTWIRE_NARRATION_DIR` and `AGENTWIRE_AUDIO_DIR` keep its inputs and generated audio isolated.
3. `swift demo/render-cards.swift cards/<name>.svg assets/<name>.png` — title cards (already rendered in `assets/`).
4. `demo/render-agent-finalist.sh` assembles the ten-part cut, burns captions, and fails outside its 170–176 second window.
5. `make demo-verify` checks duration, audio, video, silent post-roll, and black frames.

Requires Node 22, ffmpeg/ffprobe, Python 3 with Pillow, Swift (macOS), and Google Chrome 149+.

Generated capture, browser-profile, audio, raster, mezzanine, and video files are ignored. Git retains the SVG cards, narration,
capture marks, timeline, and SRT as compact provenance; reproducing the exact uploaded bytes still requires the approved binary inputs.
