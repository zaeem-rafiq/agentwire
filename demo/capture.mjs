// Records the demo footage: real Chrome (WebMCP enabled) on the production site, the browser invoking each
// tool through the DevTools WebMCP domain, plus an on-page cursor for the human step. Writes screencast
// frames + hero screenshots to demo/captures and assembles demo/captures/live.mp4 with ffmpeg.
// Usage: node demo/capture.mjs [url]   (needs Google Chrome 149+, Node 22, ffmpeg)
import { launch } from "./cdp.mjs";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const URL_ = process.argv[2] || "https://agentwire.web.app/";
const demo = path.dirname(new URL(import.meta.url).pathname);
const cap = path.join(demo, "captures"), framesDir = path.join(cap, "frames");
await mkdir(framesDir, { recursive: true });
for (const f of await readdir(framesDir)) await unlink(path.join(framesDir, f));

const overlay = String.raw`(() => {
  const css = document.createElement("style");
  css.textContent = [
    "html{scroll-behavior:smooth}",
    "#demo-cursor{position:fixed;left:900px;top:120px;z-index:2147483647;width:22px;height:22px;border:3px solid #fff;border-radius:50%;background:#c2410c;box-shadow:0 2px 8px rgba(0,0,0,.45);pointer-events:none;transform:translate(-50%,-50%);transition:transform .1s;opacity:0}",
    "#demo-cursor.show{opacity:1}#demo-cursor.pressed{transform:translate(-50%,-50%) scale(.7);background:#fff;border-color:#c2410c}",
    "#demo-prompt{position:fixed;left:50%;top:14px;transform:translate(-50%,-140%);z-index:2147483646;max-width:760px;background:#1c1b19;color:#f4f0e8;border-left:6px solid #c2410c;border-radius:10px;padding:12px 18px;font:15px/1.4 -apple-system,BlinkMacSystemFont,Inter,Segoe UI,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.3);transition:transform .35s ease;pointer-events:none}",
    "#demo-prompt.show{transform:translate(-50%,0)}",
    "#demo-prompt small{display:block;font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#ff9a6b;margin-bottom:6px}",
  ].join("");
  const ready = () => {
    document.head.append(css);
    const cur = document.createElement("span"); cur.id = "demo-cursor";
    const pr = document.createElement("div"); pr.id = "demo-prompt"; pr.innerHTML = "<small></small><span></span>";
    document.body.append(cur, pr);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__demoPrompt = (label, text) => { pr.querySelector("small").textContent = label; pr.querySelector("span").textContent = text; pr.classList.toggle("show", !!text); };
    window.__demoMove = async (sel, dur = 650) => {
      const el = document.querySelector(sel); if (!el) throw new Error("no " + sel);
      const r = el.getBoundingClientRect(); const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const from = { x: parseFloat(cur.style.left) || 900, y: parseFloat(cur.style.top) || 120 };
      cur.classList.add("show"); const t0 = performance.now();
      await new Promise((res) => { const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); cur.style.left = from.x + (to.x - from.x) * e + "px"; cur.style.top = from.y + (to.y - from.y) * e + "px"; p < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
    };
    window.__demoClick = async (sel) => { await window.__demoMove(sel); cur.classList.add("pressed"); await wait(90); document.querySelector(sel).click(); await wait(120); cur.classList.remove("pressed"); };
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ready) : ready();
})();`;

const b = await launch({ port: 9340, profile: path.join(cap, "profile") });
await b.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await b.send("Page.addScriptToEvaluateOnNewDocument", { source: overlay });
const events = []; b.on((m) => { if (m.method.startsWith("WebMCP.")) events.push(m); });
await b.send("WebMCP.enable");
await b.goto(URL_);
for (let i = 0; i < 60 && !(await b.evaluate(`document.getElementById("agent-st-t")?.textContent.includes("registered")`)); i++) await new Promise((r) => setTimeout(r, 200));
const { frameTree } = await b.send("Page.getFrameTree"); const frameId = frameTree.frame.id;
const invoke = async (toolName, input) => {
  const { invocationId } = await b.send("WebMCP.invokeTool", { frameId, toolName, input });
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("tool timeout " + toolName)), 20000); b.on((m) => { if (m.method === "WebMCP.toolResponded" && m.params.invocationId === invocationId) { clearTimeout(t); res(m.params.output); } }); });
};
const shot = async (name) => { const s = await b.send("Page.captureScreenshot", { format: "png" }); await writeFile(path.join(cap, name), Buffer.from(s.data, "base64")); };

// Hero stills for the card segments
await b.evaluate(`window.scrollTo(0,0)`); await new Promise((r) => setTimeout(r, 600)); await shot("hero.png");
await b.evaluate(`document.getElementById("agent").classList.remove("min"); document.getElementById("agent-tg").textContent = "hide"`); await new Promise((r) => setTimeout(r, 400)); await shot("tools.png");

// Screencast
const frames = []; let writes = Promise.resolve();
b.on((m) => { if (m.method === "Page.screencastFrame") { const i = frames.length + 1, file = `f-${String(i).padStart(5, "0")}.jpg`; frames.push({ file, ts: m.params.metadata.timestamp }); writes = writes.then(() => writeFile(path.join(framesDir, file), Buffer.from(m.params.data, "base64"))); b.send("Page.screencastFrameAck", { sessionId: m.params.sessionId }).catch(() => {}); } });
const t0 = performance.now(); const at = async (s) => { const rem = t0 + s * 1000 - performance.now(); if (rem > 0) await new Promise((r) => setTimeout(r, rem)); };
await b.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
const marks = {};
const seg = (name) => { marks[name] = +((performance.now() - t0) / 1000).toFixed(2); };

// 03 list_changes
await at(0.8); seg("list"); await b.evaluate(`__demoPrompt("YOU → BROWSER AGENT", "What changed this week at severity notice?")`);
await at(2.6); const list = await invoke("list_changes", { since_hours: 168, severity: "notice" });
await at(4.0); await b.evaluate(`document.querySelector("section h2").scrollIntoView({behavior:"smooth", block:"start"})`);
// 04 check_dependency
await at(18.0); seg("check"); await b.evaluate(`__demoPrompt("YOU → BROWSER AGENT", "Is the Neon MCP server safe to update?")`);
await at(19.8); const check = await invoke("check_dependency", { name: "neon" });
const neonChangelog = (check.changes_30d || []).find((c) => c.category === "changelog") || (check.changes_30d || [])[0] || (list.changes || [])[0];
await at(26.0); await b.evaluate(`document.getElementById("agent").scrollIntoView; document.querySelector("#log .e")?.click()`); // expand latest log entry
// 05 get_diff
await at(40.0); seg("diff"); await b.evaluate(`document.querySelector("#log .e div[hidden]") || document.querySelector("#log .e")?.click(); __demoPrompt("YOU → BROWSER AGENT", "Show me the diff for the Neon changelog change.")`);
await at(41.8); await invoke("get_diff", { diff_id: neonChangelog.diff_id });
// 06 watch_dependencies
await at(60.0); seg("watch"); await b.evaluate(`__demoPrompt("YOU → BROWSER AGENT", "Subscribe demo@agentwire.dev to the Neon MCP server and claude-sonnet-4-5.")`);
await at(62.0); await invoke("watch_dependencies", { email: "demo@agentwire.dev", deps: ["@neondatabase/mcp-server-neon", "claude-sonnet-4-5"], workflow: "re-run eval suite; pin if red" });
// 07 human sample click
await at(78.0); seg("human"); await b.evaluate(`__demoPrompt("", ""); window.scrollTo({top: 0, behavior: "smooth"})`);
await at(80.0); await b.evaluate(`__demoClick('.tool .run[data-t="check_dependency"]')`);
await at(95.0); seg("end");
await b.send("Page.stopScreencast"); await writes;
await writeFile(path.join(cap, "marks.json"), JSON.stringify({ marks, url: URL_, browser: b.version, frames: frames.length }, null, 2));

// Assemble VFR mp4 from frame timestamps
const base = frames[0].ts; const lines = ["ffconcat version 1.0"];
frames.forEach((f, i) => { const d = i + 1 < frames.length ? frames[i + 1].ts - f.ts : Math.max(0.1, marks.end - (f.ts - base)); lines.push(`file 'frames/${f.file}'`, `duration ${Math.max(0.01, d).toFixed(4)}`); });
lines.push(`file 'frames/${frames.at(-1).file}'`);
await writeFile(path.join(cap, "frames.ffconcat"), lines.join("\n") + "\n");
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(cap, "frames.ffconcat"), "-vf", "scale=1280:720,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", path.join(cap, "live.mp4")]);
console.log("captured", frames.length, "frames; marks", JSON.stringify(marks), "; tools invoked:", events.filter((e) => e.method === "WebMCP.toolInvoked").map((e) => e.params.toolName).join(","));
b.close();
