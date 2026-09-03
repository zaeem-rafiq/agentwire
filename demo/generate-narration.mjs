// Generate the AgentWire demo narration with Gemini TTS (same voices as the NWA demo):
// Host = Kore, Expert = Iapetus. Reads GEMINI_API_KEY from the environment and never prints it.
// Usage: GEMINI_API_KEY=... node demo/generate-narration.mjs [segment ...]
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const demo = path.dirname(new URL(import.meta.url).pathname);
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY is not set.");
const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const segments = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["01-problem", "02-tools", "03-list", "04-check", "05-diff", "06-watch", "07-human", "08-proof", "09-close"];

for (const segment of segments) {
  const script = (await readFile(path.join(demo, "narration", `${segment}.txt`), "utf8")).trim();
  const body = {
    contents: [{ parts: [{ text: `TTS the following conversation between Host and Expert. The Host is curious and brisk; the Expert is calm, precise, and unhurried. Keep the pace natural for a product demo.\n\n${script}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: "Host", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
            { speaker: "Expert", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Iapetus" } } },
          ],
        },
      },
    },
  };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${segment}: Gemini returned ${response.status} ${(await response.text()).slice(0, 1500)}`);
  const json = await response.json();
  const part = json.candidates?.[0]?.content?.parts?.find((candidate) => candidate.inlineData?.data);
  if (!part) throw new Error(`${segment}: no audio part in the response.`);
  const mime = part.inlineData.mimeType || "";
  const rate = Number((mime.match(/rate=(\d+)/) || [])[1] || 24000);
  const pcm = path.join(demo, "audio", `${segment}.pcm`);
  const m4a = path.join(demo, "audio", `${segment}.m4a`);
  await writeFile(pcm, Buffer.from(part.inlineData.data, "base64"));
  await run("ffmpeg", ["-y", "-v", "error", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", pcm, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", m4a]);
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", m4a]);
  console.log(`${segment}: ${mime} -> ${path.basename(m4a)} ${Number(stdout).toFixed(2)}s`);
}
