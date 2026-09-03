// Dependency-free CDP harness: launches real Chrome 152 with WebMCP enabled and talks DevTools protocol over Node's built-in WebSocket.
import { spawn } from "node:child_process";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export async function launch({ port = 9333, headless = true, profile }) {
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
