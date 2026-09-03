// Records the demo with a REAL agent on screen: Gemini (function calling) reads the tool schemas the page
// registered on document.modelContext, decides which tool to call, and each call is routed through Chrome's
// WebMCP DevTools channel (the path a browser agent uses). A chat pane injected on the left shows the
// conversation; the page and its Agent-tools panel react as they would for any agent.
// Usage: GEMINI_API_KEY=... node demo/capture-agent.mjs [url]   (Google Chrome 149+, Node 22, ffmpeg)
import { launch } from "./cdp.mjs";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const URL_ = process.argv[2] || "https://agentwire.web.app/";
const KEY = process.env.GEMINI_API_KEY; if (!KEY) throw new Error("GEMINI_API_KEY is not set.");
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const demo = path.dirname(new URL(import.meta.url).pathname);
const cap = path.join(demo, "captures"), framesDir = path.join(cap, "frames");
await mkdir(framesDir, { recursive: true });
for (const f of await readdir(framesDir)) await unlink(path.join(framesDir, f));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const overlay = String.raw`(() => {
  const css = document.createElement("style");
  css.textContent = [
    "html{scroll-behavior:smooth}",
    "body{padding-left:440px}",
    ".wrap{max-width:960px;margin:0 0 0 40px}",
    "header{padding-top:36px}",
    ".agent{width:340px;right:12px;bottom:12px}",
    ".agent .agent-note{display:none}",".agent .agent-b{max-height:min(70vh,640px)}",
    "#chat{position:fixed;left:0;top:0;bottom:0;width:440px;z-index:2147483645;background:#161514;color:#f1eee4;font:14px/1.45 -apple-system,BlinkMacSystemFont,Inter,'Segoe UI',sans-serif;display:flex;flex-direction:column;border-right:1px solid #2a2826;box-shadow:12px 0 40px rgba(0,0,0,.25)}",
    "#chat .h{padding:16px 20px 12px;border-bottom:1px solid #2a2826;font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:.12em;color:#a9ada7;text-transform:uppercase}",
    "#chat .h b{display:block;color:#f1eee4;font-size:15px;letter-spacing:.06em;margin-bottom:4px}#chat .h b i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:8px;box-shadow:0 0 0 3px rgba(22,163,74,.25)}",
    "#chat .m{flex:1;overflow:hidden;padding:16px 20px;display:flex;flex-direction:column;gap:12px;justify-content:flex-end}",
    "#chat .u{align-self:flex-end;max-width:94%;background:#c2410c;color:#fff;border-radius:14px 14px 4px 14px;padding:11px 15px;font-size:16.5px;line-height:1.4}",
    "#chat .a{align-self:flex-start;max-width:97%;background:#232120;border-radius:14px 14px 14px 4px;padding:11px 15px;font-size:16.5px;line-height:1.42;white-space:pre-wrap}",
    "#chat .t{align-self:flex-start;font-family:ui-monospace,Menlo,monospace;font-size:13.5px;color:#ff9a6b;background:#1f1d1c;border:1px solid #3a2a22;border-radius:8px;padding:7px 10px;max-width:96%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#chat .t.done{color:#86efac;border-color:#1f3b2a}#chat .t small{color:#a9ada7;margin-left:8px}",
    "#chat .think{align-self:flex-start;color:#a9ada7;font-size:15px}#chat .think:after{content:'';animation:dots 1.2s steps(4,end) infinite}",
    "@keyframes dots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}",
    "#chat .f{padding:12px 20px 16px;border-top:1px solid #2a2826}#chat .f div{background:#232120;border:1px solid #3a3735;border-radius:10px;padding:10px 14px;min-height:44px;color:#f1eee4;font-size:16px}#chat .f div:empty:before{content:'Ask about your dependencies…';color:#6b6864}",
    "#chat .f div.on{border-color:#c2410c}#chat .f div.on:after{content:'▍';color:#c2410c;animation:blink 1s steps(2) infinite}@keyframes blink{50%{opacity:0}}",
    "#demo-cursor{position:fixed;left:900px;top:120px;z-index:2147483647;width:22px;height:22px;border:3px solid #fff;border-radius:50%;background:#c2410c;box-shadow:0 2px 8px rgba(0,0,0,.45);pointer-events:none;transform:translate(-50%,-50%);transition:transform .1s;opacity:0}",
    "#demo-cursor.show{opacity:1}#demo-cursor.pressed{transform:translate(-50%,-50%) scale(.7);background:#fff;border-color:#c2410c}",
    "tr.row.hl td{box-shadow:inset 4px 0 0 #c2410c}",
  ].join("");
  const ready = () => {
    document.head.append(css);
    const chat = document.createElement("aside"); chat.id = "chat";
    chat.innerHTML = '<div class="h"><b><i></i>Browser agent · __MODEL__</b>tools: this page, via Chrome WebMCP</div><div class="m" id="chat-m"></div><div class="f"><div id="chat-in"></div></div>';
    const cur = document.createElement("span"); cur.id = "demo-cursor";
    document.body.append(chat, cur);
    const m = chat.querySelector("#chat-m"), inp = chat.querySelector("#chat-in");
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const add = (cls, text) => { const d = document.createElement("div"); d.className = cls; d.textContent = text || ""; m.append(d); while (m.scrollHeight > m.clientHeight && m.children.length > 1) m.firstElementChild.remove(); return d; };
    window.__chatUser = async (text) => { inp.classList.add("on"); for (const ch of text) { inp.textContent += ch; await wait(ch === " " ? 22 : 34); } await wait(500); inp.textContent = ""; inp.classList.remove("on"); add("u", text); };
    let think = null;
    window.__chatThink = (on) => { if (on && !think) think = add("think", "thinking"); if (!on && think) { think.remove(); think = null; } };
    window.__chatTool = (name, args) => { window.__chatThink(false); const d = add("t", ""); d.innerHTML = "→ " + name + "(" + JSON.stringify(args) + ")"; return m.children.length - 1; };
    window.__chatToolDone = (idx, ms, summary) => { const d = m.children[idx]; if (!d) return; d.classList.add("done"); d.innerHTML = "✓ " + d.innerHTML.slice(2) + "<small>" + ms + " ms" + (summary ? " · " + summary : "") + "</small>"; };
    window.__chatAgent = async (text) => { window.__chatThink(false); const d = add("a", ""); const words = text.split(/(\s+)/); for (const w of words) { d.textContent += w; if (w.trim()) await wait(38); } };
    window.__demoMove = async (sel, dur = 700) => {
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

const b = await launch({ port: 9341, profile: path.join(cap, "profile-agent") });
await b.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await b.send("Page.addScriptToEvaluateOnNewDocument", { source: overlay.replace("__MODEL__", MODEL.replace(/^gemini-/, "Gemini ").replace(/-flash/, " Flash").replace(/-lite/, " Lite")) });
const events = []; b.on((m) => { if (m.method.startsWith("WebMCP.")) events.push(m); });
await b.send("WebMCP.enable");
await b.goto(URL_);
for (let i = 0; i < 60 && !(await b.evaluate(`document.getElementById("agent-st-t")?.textContent.includes("registered")`)); i++) await wait(200);
const { frameTree } = await b.send("Page.getFrameTree"); const frameId = frameTree.frame.id;
const invoke = async (toolName, input) => {
  const { invocationId } = await b.send("WebMCP.invokeTool", { frameId, toolName, input });
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("tool timeout " + toolName)), 20000); b.on((m) => { if (m.method === "WebMCP.toolResponded" && m.params.invocationId === invocationId) { clearTimeout(t); res(m.params.output); } }); });
};
const shot = async (name) => { const s = await b.send("Page.captureScreenshot", { format: "png" }); await writeFile(path.join(cap, name), Buffer.from(s.data, "base64")); };

// Tool declarations come from the page's own registrations (same objects it handed to registerTool)
const clean = (s, inProps = false) => { if (Array.isArray(s)) return s.map((x) => clean(x)); if (s && typeof s === "object") { const o = {}; for (const [k, v] of Object.entries(s)) { if (inProps) o[k] = clean(v); else if (k === "properties") o[k] = clean(v, true); else if (["type", "required", "description", "enum", "items"].includes(k)) o[k] = clean(v); } return o; } return s; };
const pageTools = JSON.parse(await b.evaluate(`JSON.stringify(AgentWire.tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })))`));
const functionDeclarations = pageTools.map((t) => ({ name: t.name, description: t.description, parameters: clean(t.inputSchema) }));
const summarize = (name, out) => name === "list_changes" ? `${out.count} changes` : name === "check_dependency" ? (out.match ? `${out.match.name} · ${out.changes_30d?.length ?? 0} in 30d · ${out.last_run?.healthy ? "healthy" : "check run"}` : "no match") : name === "get_diff" ? (out.found ? `${out.added_lines}+ / ${out.removed_lines}−` : "not found") : out.ok ? `saved ${out.watched_count}` : "error";
const system = `You are a browser agent working inside the AgentWire web page, which exposes tools through WebMCP. Answer the person's question by calling the page's tools; never guess data. Then reply in plain prose (no markdown, no bullet symbols), at most 45 words, specific: name the source, counts, severities, and cite diff ids as "#12". If a change is not breaking, say so plainly. When asked to subscribe and the person has given the email and the list, call watch_dependencies right away and confirm what was saved.`;
const history = [];
const FALLBACK = process.env.GEMINI_FALLBACK || "gemini-2.0-flash";
async function gemini() {
  let r, model = MODEL;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt >= 3) model = FALLBACK;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": KEY, "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: history, tools: [{ functionDeclarations }], toolConfig: { functionCallingConfig: { mode: "AUTO" } } }), signal: AbortSignal.timeout(35000) });
    } catch (e) { console.error(`Gemini network error on ${model}: ${e.message}; retrying`); r = { ok: false, status: 503, text: async () => String(e.message) }; }
    if (r.ok) break;
    if (![429, 500, 503].includes(r.status)) throw new Error(`Gemini ${r.status} ${(await r.text()).slice(0, 300)}`);
    console.error(`Gemini ${r.status} on ${model}; retrying`); await wait(1500 * (attempt + 1));
  }
  if (!r.ok) throw new Error(`Gemini ${r.status} ${(await r.text()).slice(0, 300)}`);
  const j = await r.json(); const content = j.candidates?.[0]?.content; if (!content) throw new Error("Gemini: no content " + JSON.stringify(j).slice(0, 300));
  return content;
}
const transcript = []; const idle = []; let tRec = null; const IDLE_KEEP = 2.2;
async function turn(question) {
  await b.evaluate(`__chatUser(${JSON.stringify(question)})`, true);
  history.push({ role: "user", parts: [{ text: question + "\n(Reply in at most 40 words of plain prose. No lists.)" }] });
  await b.evaluate(`__chatThink(true)`);
  for (let hop = 0; hop < 4; hop++) {
    const g0 = performance.now(); const content = await gemini(); history.push(content);
    if (tRec != null && (performance.now() - g0) / 1000 > IDLE_KEEP) idle.push({ from: (g0 - tRec) / 1000 + IDLE_KEEP, to: (performance.now() - tRec) / 1000 });
    const calls = content.parts.filter((p) => p.functionCall);
    if (!calls.length) { const text = content.parts.map((p) => p.text || "").join("").trim(); transcript.push({ question, answer: text }); await b.evaluate(`__chatAgent(${JSON.stringify(text)})`, true); return text; }
    const responses = [];
    for (const { functionCall: fc } of calls) {
      const idx = await b.evaluate(`__chatTool(${JSON.stringify(fc.name)}, ${JSON.stringify(fc.args || {})})`);
      const t0 = performance.now(); const out = await invoke(fc.name, fc.args || {}); const ms = Math.round(performance.now() - t0);
      transcript.push({ question, tool: fc.name, args: fc.args, ms, summary: summarize(fc.name, out) });
      await b.evaluate(`__chatToolDone(${idx}, ${ms}, ${JSON.stringify(summarize(fc.name, out))})`);
      const slim = fc.name === "get_diff" ? { ...out, unified_diff: (out.unified_diff || "").slice(0, 1500) } : fc.name === "list_changes" ? { ...out, changes: (out.changes || []).slice(0, 12) } : out;
      responses.push({ functionResponse: { name: fc.name, response: { result: slim } } });
      await wait(700);
    }
    await b.evaluate(`__chatThink(true)`);
    history.push({ role: "user", parts: responses });
  }
  throw new Error("agent did not answer");
}

// Stills
await b.evaluate(`window.scrollTo(0,0)`); await wait(600); await shot("hero-agent.png");

// Screencast
const frames = []; let writes = Promise.resolve();
b.on((m) => { if (m.method === "Page.screencastFrame") { const i = frames.length + 1, file = `f-${String(i).padStart(5, "0")}.jpg`; frames.push({ file, ts: m.params.metadata.timestamp }); writes = writes.then(() => writeFile(path.join(framesDir, file), Buffer.from(m.params.data, "base64"))); b.send("Page.screencastFrameAck", { sessionId: m.params.sessionId }).catch(() => {}); } });
const t0 = performance.now(); tRec = t0; const removedBefore = (t) => idle.reduce((a, w) => a + Math.max(0, Math.min(t, w.to) - w.from), 0); const now = () => +(((performance.now() - t0) / 1000) - removedBefore((performance.now() - t0) / 1000)).toFixed(2);
await b.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
const marks = {};
const seg = (name) => { marks[name] = now(); };

await wait(1500); await b.evaluate(`document.getElementById("agent").classList.remove("min"); document.getElementById("agent-tg").textContent = "hide"`);
await wait(1200);
seg("q1"); await turn("Before I bump the Neon MCP server on Friday: did anything change in the last 30 days, and is any of it breaking?");
await wait(1200);
seg("q2"); await turn("Show me the changelog diff so I can see what was added.");
await wait(1800);
seg("q3"); await turn("Zoom out. What else changed this week across everything we watch, at notice or breaking severity?");
await wait(1200);
seg("q4"); await turn("Good. Watch the Neon MCP server and claude-sonnet-4-5 for me. Email demo@agentwire.dev.");
await wait(1500);
seg("human"); await b.evaluate(`window.scrollTo({top: 0, behavior: "smooth"})`); await wait(900);
await b.evaluate(`__demoClick('.tool .run[data-t="check_dependency"]')`);
await wait(4000);
seg("end");
await b.send("Page.stopScreencast"); await writes;
await writeFile(path.join(cap, "marks-agent.json"), JSON.stringify({ marks, idle, url: URL_, browser: b.version, model: MODEL, frames: frames.length, transcript }, null, 2));

const base = frames[0].ts; const inIdle = (t) => idle.some((w) => t >= w.from && t < w.to);
const kept = frames.filter((f) => !inIdle(f.ts - base));
const lines = ["ffconcat version 1.0"];
kept.forEach((f, i) => { const t = f.ts - base, tc = t - removedBefore(t); const next = kept[i + 1]; const d = next ? ((next.ts - base) - removedBefore(next.ts - base)) - tc : Math.max(0.1, marks.end - tc); lines.push(`file 'frames/${f.file}'`, `duration ${Math.max(0.01, d).toFixed(4)}`); });
lines.push(`file 'frames/${kept.at(-1).file}'`);
console.log(`idle removed: ${idle.reduce((a, w) => a + (w.to - w.from), 0).toFixed(1)}s across ${idle.length} waits; kept ${kept.length}/${frames.length} frames`);
await writeFile(path.join(cap, "frames-agent.ffconcat"), lines.join("\n") + "\n");
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(cap, "frames-agent.ffconcat"), "-vf", "scale=1280:720,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", path.join(cap, "live-agent.mp4")]);
console.log("captured", frames.length, "frames; marks", JSON.stringify(marks));
for (const t of transcript) console.log(t.tool ? `  [tool] ${t.tool}(${JSON.stringify(t.args)}) ${t.ms} ms · ${t.summary}` : `  Q: ${t.question}\n  A: ${t.answer}`);
console.log("tools invoked via WebMCP:", events.filter((e) => e.method === "WebMCP.toolInvoked").map((e) => e.params.toolName).join(","));
b.close();
