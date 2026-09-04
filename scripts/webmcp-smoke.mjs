// Dependency-free WebMCP smoke test. Launches Chrome 149+ with WebMCP enabled, lets the BROWSER invoke each registered tool over the
// DevTools "WebMCP" domain (the same channel a browser agent uses), and prints every request/response.
// Usage: node scripts/webmcp-smoke.mjs [url]   (default http://127.0.0.1:8787/ — serve site/ first, e.g. `python3 -m http.server 8787 -d site`)
//        WEBMCP_TEST_EMAIL=you@example.com  → also exercises watch_dependencies (writes one dependency_lists row)
//        CHROME=/path/to/chrome              → override the Chrome binary
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
async function launch({ port = 9333, headless = true, profile }) {
  const args = [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport", "--enable-blink-features=WebMCP",
    ...(headless ? ["--headless=new"] : []), "about:blank",
  ];
  const proc = spawn(CHROME, args, { stdio: "ignore" });
  let ver;
  for (let i = 0; i < 50; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
  if (!ver) throw new Error("chrome did not start");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } else if (m.method) listeners.forEach(l => l(m)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const goto = async (url) => { await send("Page.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true }); const p = new Promise(r => { const l = m => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); }); await send("Page.navigate", { url }); await p; };
  const on = (fn) => listeners.push(fn);
  const close = () => { ws.close(); proc.kill(); };
  return { version: ver.Browser, send, evaluate, goto, on, close };
}

const url = process.argv[2] || "http://127.0.0.1:8787/";
const b = await launch({ port: 9333, profile: mkdtempSync(join(tmpdir(), "agentwire-webmcp-")) });
const events = []; b.on(m => { if (m.method.startsWith("WebMCP.")) events.push(m); });
await b.send("WebMCP.enable");
await b.goto(url);
for (let i = 0; i < 50 && !(await b.evaluate(`document.getElementById("agent-st-t").textContent.includes("registered")`)); i++) await new Promise(r => setTimeout(r, 200));
console.log("browser:", b.version, "| page:", url, "| panel status:", await b.evaluate(`document.getElementById("agent-st-t").textContent`));
const { frameTree } = await b.send("Page.getFrameTree"); const frameId = frameTree.frame.id;
const toolsAdded = [...new Set(events.filter(e => e.method === "WebMCP.toolsAdded").flatMap(e => e.params.tools.map(t => t.name)))];
console.log("WebMCP.toolsAdded →", toolsAdded.join(", "));
const expectedTools = ["list_changes", "check_dependency", "list_sources", "check_dependencies", "get_diff", "watch_dependencies"];
const missingTools = expectedTools.filter(name => !toolsAdded.includes(name));
if (missingTools.length) { console.error("missing WebMCP tools:", missingTools.join(", ")); b.close(); process.exit(1); }
async function invoke(toolName, input) {
  const { invocationId } = await b.send("WebMCP.invokeTool", { frameId, toolName, input });
  const ev = await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error("timeout")), 20000); b.on(m => { if (m.method === "WebMCP.toolResponded" && m.params.invocationId === invocationId) { clearTimeout(t); resolve(m.params); } }); });
  const out = JSON.stringify(ev.output);
  console.log(`\n=== ${toolName} ===\n→ WebMCP.invokeTool { frameId, toolName: "${toolName}", input: ${JSON.stringify(input)} }\n← ${ev.status}: ${out.slice(0, 1400)}${out.length > 1400 ? ` …[${out.length} chars]` : ""}`);
  return ev.output;
}
const list = await invoke("list_changes", { since_hours: 168 });
await invoke("check_dependency", { name: "neon" });
await invoke("check_dependency", { name: "claude-sonnet-4-5" });
await invoke("get_diff", { diff_id: list.changes?.[0]?.diff_id ?? 1 });
await invoke("list_sources", { kind: "mcp_server" });
await invoke("check_dependencies", { deps: ["@neondatabase/mcp-server-neon", "claude-sonnet-4-5", "not-a-real-package-xyz"] });
await invoke("check_dependencies", { manifest: '{"mcpServers":{"neon":{"command":"npx","args":["-y","@neondatabase/mcp-server-neon"]}},"dependencies":{"@anthropic-ai/sdk":"^0.60.0"}}' });
const invalidWatch = await invoke("watch_dependencies", { email: "not-an-email", deps: ["x"] });
if (invalidWatch?.ok !== false) { console.error("watch_dependencies invalid-email case did not return ok:false"); b.close(); process.exit(1); }
if (process.env.WEBMCP_TEST_EMAIL) await invoke("watch_dependencies", { email: process.env.WEBMCP_TEST_EMAIL, deps: ["@neondatabase/mcp-server-neon", "claude-sonnet-4-5"], workflow: "smoke test" });
else console.log("\n(skipping watch_dependencies — set WEBMCP_TEST_EMAIL to exercise the write tool)");
console.log("\npanel call log:", await b.evaluate(`AgentWire.log.map(e => e.name + ":" + e.who + ":" + (e.error ? "ERR " + e.error : e.ms + "ms")).join(" | ")`));
b.close();
