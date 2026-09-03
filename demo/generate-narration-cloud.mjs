// Fallback narration via Google Cloud Text-to-Speech (Chirp 3 HD Kore = Host, Iapetus = Expert; the same voices as
// the Gemini TTS path). Each "Host:"/"Expert:" line is synthesized separately and joined with a short pause.
// Usage: GCP_PROJECT=... node demo/generate-narration-cloud.mjs [segment ...]   (uses `gcloud auth print-access-token`)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
const run = promisify(execFile);
const demo = path.dirname(new URL(import.meta.url).pathname);
const project = process.env.GCP_PROJECT; if (!project) throw new Error("GCP_PROJECT is not set.");
const token = process.env.GCP_TOKEN || (await run("gcloud", ["auth", "print-access-token"])).stdout.trim();
const VOICES = { Host: "en-US-Chirp3-HD-Kore", Expert: "en-US-Chirp3-HD-Iapetus" };
const RATE = 24000, GAP = 0.28;
const tmp = path.join(demo, "audio", "tmp"); await mkdir(tmp, { recursive: true });
for (const segment of process.argv.slice(2)) {
  const lines = (await readFile(path.join(demo, "narration", `${segment}.txt`), "utf8")).split("\n").map((l) => l.trim()).filter(Boolean);
  const parts = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^(Host|Expert):\s*(.+)$/); if (!m) throw new Error(`${segment}: bad line: ${line}`);
    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", { method: "POST", headers: { authorization: `Bearer ${token}`, "x-goog-user-project": project, "content-type": "application/json" },
      body: JSON.stringify({ input: { text: m[2] }, voice: { languageCode: "en-US", name: VOICES[m[1]] }, audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: RATE, speakingRate: 1.1 } }) });
    if (!r.ok) throw new Error(`${segment}: Cloud TTS ${r.status} ${(await r.text()).slice(0, 400)}`);
    const wav = path.join(tmp, `${segment}-${i}.wav`); await writeFile(wav, Buffer.from((await r.json()).audioContent, "base64")); parts.push(wav);
  }
  const list = path.join(tmp, `${segment}.txt`);
  await writeFile(list, parts.map((p) => `file '${p}'`).join(`\nfile '${path.join(tmp, "gap.wav")}'\n`) + "\n");
  await run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `anullsrc=r=${RATE}:cl=mono`, "-t", String(GAP), path.join(tmp, "gap.wav")]);
  const m4a = path.join(demo, "audio", `${segment}.m4a`);
  await run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", m4a]);
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", m4a]);
  console.log(`${segment}: cloud-tts (${lines.length} lines) -> ${path.basename(m4a)} ${Number(stdout).toFixed(2)}s`);
}
