# AgentWire — WebMCP Challenge submission kit

Live site: **https://agentwire.web.app** (Firebase Hosting, Google Cloud project `agentwire-webmcp`, deployed 2026-09-02)
Repo: **https://github.com/zaeem-rafiq/agentwire** (public, MIT)
Video: **https://youtu.be/JBnvbj1fF-U** (unlisted; flip to Public in YouTube Studio if you prefer)

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

## 2. Demo video — what's in the cut (1:31, https://youtu.be/JBnvbj1fF-U)

Produced by `demo/capture-agent.mjs` + `demo/render-agent.sh` (see `demo/README.md`): one continuous take on the production site with a real agent on screen. Narration is Host/Expert (Chirp 3 HD Kore + Iapetus).

| Time | What's on screen | Narration (`demo/narration/*.txt`) |
|---|---|---|
| 0:00–0:15 | Cold-open card over the page: "Agent dependencies change silently." | Host: It's Friday and I'm about to bump the Neon MCP server. Did anything change, and does it break us? Expert: Ask the agent in your browser. This page registers four WebMCP tools, so it answers from the same data you see on screen. |
| 0:15–0:31 | Chat pane (left) types the question; Gemini 3.8 Flash picks `check_dependency`; the call chip shows args + ms; the Agent-tools panel logs it; the answer cites #11 and #12. | Host: I ask in plain English. Expert: The agent reads the tool schemas the page registered, picks check dependency, and Chrome routes the call through WebMCP… |
| 0:31–0:42 | "Show me the changelog diff." → `get_diff(12)`; the row highlights and opens on the page. | Host: Show me the diff. Expert: Get diff returns the stored lines for that change, and the row opens on the page as the agent reads it. |
| 0:42–1:00 | "Zoom out…" → `list_changes` at breaking + notice; answer names the GitHub MCP breaking change and the notices. | Host: Now the wider picture. Expert: List changes across all forty-eight sources… so the person can verify every claim. |
| 1:00–1:14 | "Watch Neon and claude-sonnet-4-5, email demo@…" → `watch_dependencies`; the form fills in and confirms. | Host: And subscribe me. Expert: The one write… the form fills in to confirm what was saved. |
| 1:14–1:22 | Cursor clicks ▶ sample on `check_dependency`; a HUMAN entry lands beside the AGENT ones. | Host: Can I do that myself? Expert: One click, same function, same log, tagged human beside agent. |
| 1:22–1:31 | Close card: "The agent is on the page." | Expert: AgentWire. Dependency watch for production agents, with the agent on the page. MIT on GitHub. |

How it's real: the chat pane is injected for the recording, but the agent is a live Gemini function-calling loop whose tool declarations come from the page's own `registerTool` schemas, and every call is invoked through Chrome's `WebMCP.invokeTool` DevTools command — the same channel a browser agent uses. Model wait time is cut from the timeline; nothing else is edited.

---

## 3. Only you can do these

1. **Deployed.** https://agentwire.web.app is live on Firebase Hosting. Redeploy after any site change with `firebase deploy --only hosting`.
2. **Origin trial token (optional but recommended).** Register the production origin at https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241 (WebMCP trial, Chrome 149+), paste the token into the `<meta http-equiv="origin-trial">` slot at the top of `site/index.html`, redeploy. Without it the page still works for judges who enable `chrome://flags/#enable-webmcp-testing` and in ChatGPT's browser.
3. **Record and upload the demo video** (< 3 min, audio narration above) to YouTube as public/unlisted-public.
4. **Devpost form** at https://webmcp.devpost.com: title, tagline, the description in §1, the live URL, repo URL, video URL, and screenshots (`docs/agent-panel.png`, `docs/agent-form.png`). Deadline **Sept 3 2026, 1:00 PM PDT**.
5. **GitHub "About" license badge.** GitHub detects `LICENSE` automatically; confirm "MIT license" shows in the repo sidebar (rules require it visible there).
6. **Optional:** delete the test subscription row (`webmcp-test@example.com`, source `webmcp`) from `dependency_lists` in Supabase — it was inserted by the recorded test run.
