# AgentWire — WebMCP Challenge submission kit

Live site: **https://agentwire.web.app** (Firebase Hosting; if the `agentwire` project ID is taken and you create e.g. `agentwire-2026`, the URL becomes `https://agentwire-2026.web.app` — replace it everywhere below)
Repo: **https://github.com/zaeem-rafiq/agentwire** (public, MIT)
Video: **<YouTube URL — you record and upload>**

Works in Google Chrome 149+ with WebMCP enabled (`chrome://flags/#enable-webmcp-testing`, or the origin-trial token) and in ChatGPT's browser (tools appear under *Site tools*).

---

## 1. Devpost text description (paste as-is, edit voice to taste)

### What it is

AgentWire watches the things production agents silently depend on — 48 MCP servers, the OpenAI, Anthropic and Gemini APIs, and the MCP spec, SDK and registry, 119 URLs in total — and diffs them every day: package manifests, tool lists in READMEs, JSON schemas, changelogs, deprecation pages. Each change is classified (version bump / schema / tools / changelog / content; info / notice / breaking) and stored with the line-level diff. Humans get a live change log and can subscribe their own dependency list. With WebMCP, the agent running in your browser gets the same thing, from the same page, without an API key, an MCP server, or scraping.

### Why this use case fits WebMCP

The people who need this data are already running agents, and the question they ask is naturally conversational and contextual: *"did anything I depend on change since Friday?"*, *"is the Neon MCP server safe to bump?"*, *"show me the diff, then subscribe me."* That is a tool-calling conversation, not a form-filling one. WebMCP lets the page itself be the tool surface: the four functions are registered on `document.modelContext` with JSON Schemas, they run the exact PostgREST queries the human UI runs, and the browser mediates the call. No separate MCP server to host, no credentials to hand out, no DOM scraping, and the page keeps working as a normal website for everyone without an agent.

The read/write split also maps cleanly onto WebMCP's annotations: three tools are `readOnlyHint: true` and can be called freely; `watch_dependencies` is a write, is annotated as such, and its description tells the agent to confirm the email and list with the person before calling it.

### How it improves the user experience

- **Fuzzy dependency lookup instead of scanning a table.** `check_dependency("claude-sonnet-4-5")` resolves to the Anthropic API source; `"github mcp"` resolves to the official GitHub MCP server. The agent gets the last 30 days of changes *and* whether the most recent daily run fetched that source's URLs successfully, so "no changes" is distinguishable from "we couldn't check".
- **Diff on demand.** `list_changes` returns summaries; `get_diff` returns the stored `-`/`+` lines only when the agent decides a change matters. The agent can read the diff and tell you whether it affects your code path.
- **Subscribe in one sentence.** "Watch these for me" becomes a `watch_dependencies` call with the deps the agent already knows you use.
- **The page reacts to the agent.** Every tool mirrors its work into the UI: the severity chip flips, the matched source lights up, the diff row expands and scrolls into view, the form fills in. A small "Agent tools" panel lists the registered tools and logs every call live — tool, arguments, result, latency — so the person always sees what the agent did.

### What humans and agents can do together that wasn't possible before

Before: a person opens the site, scans a table, copies package names into a form. Or an engineer builds a separate MCP server and API-key flow so an agent can query the data outside the browser, where the human can't see it.

Now: person and agent share one page and one state. The person asks their browser agent "what changed in the MCP servers we use this week, and is any of it breaking?"; the agent calls `list_changes(severity="breaking")` and `check_dependency` for each server in the project's config, reads the diffs with `get_diff`, and the person watches each call land in the panel while the change log filters itself. The person decides, the agent subscribes them with `watch_dependencies`, and the form on screen shows exactly what was saved. The panel's "▶ sample" buttons let a person run the same functions by hand, so both sides use one code path and one log.

### Implementation

- **Front end:** a single static `site/index.html` (no build step). Data comes from Supabase PostgREST with a read-only publishable key; the only write is one insert into `dependency_lists`, guarded by row-level security.
- **WebMCP:** on load the page feature-detects `document.modelContext` (with `navigator.modelContext` as a fallback for older previews) and registers four tools with `registerTool({ name, description, inputSchema, annotations, execute })`. Input schemas use JSON Schema with enums, ranges and `additionalProperties: false`; `execute` returns plain objects, which the browser serializes for the agent. Each tool's `execute` is wrapped so the call, arguments, result size and latency are appended to the on-page log, and so the tool can sync the UI (filter chips, highlighted source, expanded diff, pre-filled form).
- **Tools:** `list_changes({since_hours?, severity?, kind?})`, `check_dependency({name})` (bigram + token-weighted fuzzy match across source name, id, npm and PyPI package names and model aliases; returns confidence and alternatives), `get_diff({diff_id})`, `watch_dependencies({email, deps[], workflow?})`.
- **Backend (unchanged for this challenge):** a Deno edge function on Supabase fetches every watch URL daily via pg_cron, normalizes (npm/PyPI/registry JSON, HTML→text), hashes, multiset-line-diffs against the stored snapshot, classifies, and writes `diffs` rows.
- **Testing:** `scripts/webmcp-smoke.mjs` is a dependency-free script that launches Chrome with WebMCP enabled and has the *browser* invoke each tool through the DevTools `WebMCP.invokeTool` command — the same channel an agent uses — and prints each request/response. A recorded run is in `docs/webmcp-test-log.md`.

---

## 2. Demo video — 2:45 shot list with narration

Record at 1920×1080 in Chrome with `chrome://flags/#enable-webmcp-testing` enabled and the *WebMCP – Model Context Tool Inspector* extension open in the side panel (Gemini mode), or in ChatGPT's browser. Keep the AgentWire "Agent tools" panel expanded bottom-right the whole time. No third-party logos on screen other than the page itself.

| Time | Shot | Narration (read this) |
|---|---|---|
| 0:00–0:15 | Full page, top. Cursor rests on the headline, then the four stat tiles. | "This is AgentWire. Every morning it diffs the manifests, tool lists, schemas and changelogs of forty-eight MCP servers, the OpenAI, Anthropic and Gemini APIs, and the MCP spec — a hundred and nineteen URLs — and tells you what changed before it breaks your agents." |
| 0:15–0:30 | Scroll to the live change log. Click **Notice**, click one row so the diff expands. | "Humans get a change log with the actual diff. But the people who need this are running agents — so the page is also a WebMCP tool surface." |
| 0:30–0:45 | Zoom on the **Agent tools · WebMCP** panel: green "4 tools registered", the four tools with READ/WRITE badges. | "On load, the page registers four tools on document.modelContext, with JSON schemas. Three are read-only. One writes. Any agent in this browser can call them — no API key, no separate MCP server, no scraping." |
| 0:45–1:10 | In the inspector/agent: type **"What changed in the last 7 days that's severity notice?"** Show the agent picking `list_changes`. Cut to the panel: the call appears with latency, and the **Notice** chip flips on in the change log. | "I ask my browser agent what changed this week. It calls list_changes — you can see the call land in the panel with its arguments and timing — and the page filters itself to match, so I see exactly what the agent saw." |
| 1:10–1:35 | Agent: **"Is the Neon MCP server safe to update? Anything breaking?"** Show `check_dependency({name:"neon"})`; the source chip highlights under *What we watch*; expand the log entry to show the JSON: match, confidence, changes_30d, last_run healthy. | "Now a fuzzy lookup: 'neon' resolves to the Neon MCP server. The agent gets its changes in the last thirty days, plus whether our last daily run actually fetched its URLs — so 'no changes' never means 'we couldn't check'." |
| 1:35–1:55 | Agent: **"Show me the diff for the changelog one."** `get_diff` fires; the row in the table highlights, scrolls into view and expands to the green `+` lines. | "It asks for the diff. The row opens on my screen at the same moment the agent reads it. Same data, same page, both of us." |
| 1:55–2:20 | Agent: **"Subscribe me — my email is …, watch the Neon server and claude-sonnet-4-5."** Show the agent confirming, then `watch_dependencies` (WRITE) in the log; the form on the left fills in and shows the green "Saved by your agent" message. | "Finally a write. The tool is annotated as not read-only and its description tells the agent to confirm with me first. When it calls watch_dependencies, the form fills in and confirms what was saved — the human always sees what the agent did." |
| 2:20–2:35 | Click **▶ sample** on `check_dependency` yourself; the log shows a HUMAN entry next to the AGENT entries. | "The same functions are one click away for a person, and both show up in one log. One code path, human and agent." |
| 2:35–2:45 | Back to the top of the page, then the repo README with the tool table. | "AgentWire: dependency watch for production agents, now with the agent on the page. Code is MIT on GitHub. Thanks." |

Fallback if the agent picks the wrong tool on camera: keep rolling, rephrase once, cut the retake. If no agent is available, the "▶ sample" buttons plus `node scripts/webmcp-smoke.mjs` on a terminal split-screen demonstrate real browser-mediated calls; say so in narration.

---

## 3. Only you can do these

1. **Re-authenticate zaeem@rafiq.money and deploy to Firebase Hosting.** Both the gcloud and Firebase CLI credentials for that account have expired and need a browser sign-in. From the repo root:
   ```
   gcloud auth login zaeem@rafiq.money
   firebase login --reauth
   gcloud projects create agentwire --name="AgentWire"
   firebase projects:addfirebase agentwire
   firebase deploy --only hosting
   ```
   No billing account is needed for Hosting's free tier. If `agentwire` is taken as a project ID, pick another (e.g. `agentwire-2026`) and update `.firebaserc`. Then put the printed Hosting URL into SUBMISSION.md and README.md (search for `agentwire.web.app`), commit and push.
2. **Origin trial token (optional but recommended).** Register the production origin at https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241 (WebMCP trial, Chrome 149+), paste the token into the `<meta http-equiv="origin-trial">` slot at the top of `site/index.html`, redeploy. Without it the page still works for judges who enable `chrome://flags/#enable-webmcp-testing` and in ChatGPT's browser.
3. **Record and upload the demo video** (< 3 min, audio narration above) to YouTube as public/unlisted-public.
4. **Devpost form** at https://webmcp.devpost.com: title, tagline, the description in §1, the live URL, repo URL, video URL, and screenshots (`docs/agent-panel.png`, `docs/agent-form.png`). Deadline **Sept 3 2026, 1:00 PM PDT**.
5. **GitHub "About" license badge.** GitHub detects `LICENSE` automatically; confirm "MIT license" shows in the repo sidebar (rules require it visible there).
6. **Optional:** delete the test subscription row (`webmcp-test@example.com`, source `webmcp`) from `dependency_lists` in Supabase — it was inserted by the recorded test run.
