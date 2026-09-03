# Demo video pipeline

Produces `output/AgentWire-WebMCP-Demo.mp4` (+ `.srt`) from the production site, with no manual screen recording.

1. `node demo/capture.mjs [url]` — launches Google Chrome 149+ with WebMCP enabled, opens the site at 1280×720, and records a
   DevTools screencast while the **browser** invokes each tool through the `WebMCP` DevTools domain (`WebMCP.invokeTool` →
   `WebMCP.toolResponded`). An injected overlay shows the person's prompt and a cursor for the human step. Writes
   `captures/live.mp4`, `captures/hero.png`, `captures/tools.png`, `captures/marks.json` (segment timestamps).
2. `GEMINI_API_KEY=… node demo/generate-narration.mjs [segment…]` — Gemini TTS (Host = Kore, Expert = Iapetus) for each
   `narration/*.txt`, written to `audio/*.m4a`.
3. `swift demo/render-cards.swift cards/<name>.svg assets/<name>.png` — title cards (already rendered in `assets/`).
4. `demo/render.sh` — ffmpeg assembly; segment lengths follow the narration; live segments freeze their last frame if the
   narration runs past the captured window; fails if the total reaches 179 s.
5. `demo/verify.sh output/AgentWire-WebMCP-Demo.mp4` — duration window and audio sanity checks.

Requires Node 22, ffmpeg/ffprobe, python3, Swift (macOS), and Google Chrome 149+.
