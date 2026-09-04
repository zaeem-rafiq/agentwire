# AgentWire — WebMCP Challenge submission kit

Live site: **https://agentwire.web.app** (Firebase Hosting, Google Cloud project `agentwire-webmcp`, deployed 2026-09-02)
Repo: **https://github.com/zaeem-rafiq/agentwire** (public, MIT)
Video: **https://youtu.be/z_lRFhLq9eQ** (2:50; public)

Works in stock Google Chrome 149+ (origin-trial token is deployed; no flag needed on this origin) and in ChatGPT's browser (tools appear under *Site tools*).

---

## 1. Devpost text description (paste as-is, edit voice to taste)

### What it is

AgentWire watches the things production agents silently depend on — 48 MCP servers, the OpenAI, Anthropic and Gemini APIs, and the MCP spec, SDK and registry, 119 URLs in total — and diffs them every day: package manifests, tool lists in READMEs, JSON schemas, changelogs, deprecation pages. Each change is classified (version bump / schema / tools / changelog / content; info / notice / breaking) and stored with the line-level diff. Humans get a live change log and can save their own dependency list; the page immediately filters to its matches. Alert delivery ships with the pilot. With WebMCP, the agent running in your browser gets the same thing, from the same page, without an API key, an MCP server, or scraping.

### Why this use case fits WebMCP

The people who need this data are already running agents, and the question they ask is naturally conversational and contextual: *"did anything I depend on change since Friday?"*, *"is the Neon MCP server safe to bump?"*, *"show me the diff, then save this list."* That is a tool-calling conversation, not a form-filling one. WebMCP lets the page itself be the tool surface: the six functions are registered on `document.modelContext` with JSON Schemas, use the same loaded data and PostgREST helper as the human UI, and the browser mediates the call. No separate MCP server to host, no credentials to hand out, no DOM scraping, and the page keeps working as a normal website for everyone without an agent.

The read/write split also maps cleanly onto WebMCP's annotations: five tools are `readOnlyHint: true` and can be called freely; `watch_dependencies` is a write, is annotated as such, and its description tells the agent to confirm the email and list with the person before calling it.

### How it improves the user experience

- **Audit your whole config in one call.** The agent pastes your `mcp.json` into `check_dependencies` and gets back, per server, whether it is watched, what changed this week, and how many changes are breaking. The page filters itself to your list at the same time, so the person sees exactly what the agent is reasoning about.
- **Fuzzy dependency lookup instead of scanning a table.** `check_dependency("claude-sonnet-4-5")` resolves to the Anthropic API source; `"github mcp"` resolves to the official GitHub MCP server. The agent gets the last 30 days of changes *and* whether the most recent daily run fetched that source's URLs successfully, so "no changes" is distinguishable from "we couldn't check".
- **Diff on demand.** `list_changes` returns summaries; `get_diff` returns the stored `-`/`+` lines only when the agent decides a change matters. The agent can read the diff and tell you whether it affects your code path.
- **Save and filter in one sentence.** "Save these for me" becomes a `watch_dependencies` call with the deps the agent already knows you use. The list is stored and the page immediately filters to matching sources; alert delivery is not live yet and ships with the pilot.
- **The page reacts to the agent.** Tool calls mirror the relevant work into the UI: the severity chip flips, the matched source lights up, the diff row expands and scrolls into view, and a saved list fills the form and filters the change log. A small "Agent tools" panel lists the registered tools and logs every call live — tool, arguments, result, latency — so the person always sees what the agent did.

### What humans and agents can do together that wasn't possible before

Before: a person opens the site, scans a table, copies package names into a form. Or an engineer builds a separate MCP server and API-key flow so an agent can query the data outside the browser, where the human can't see it.

Now: person and agent share one page and one state. The person asks their browser agent "what changed in the MCP servers we use this week, and is any of it breaking?"; the agent passes the project's config to `check_dependencies`, reads anything important with `get_diff`, and the person watches each call land in the panel while the Mine filter shows the same list. The person decides, the agent saves their list with `watch_dependencies`, and the form shows exactly what was stored while the change log stays narrowed to matching sources. The panel's "▶ sample" buttons let a person run the same functions by hand, so both sides use one code path and one log.

### Potential impact

The evidence pack records 25 changes across 13 sources since the Sept 1 baseline, including 2 classified breaking. One was change #19 for the official GitHub MCP Server, a tool-list change. The latest recorded daily run fetched all 119 watched URLs successfully with zero errors.

### Implementation

- **Front end:** a single static `site/index.html` (no build step). Data comes from Supabase PostgREST with a read-only publishable key; the only write is one insert into `dependency_lists`, guarded by row-level security.
- **WebMCP:** on load the page feature-detects `document.modelContext` (with `navigator.modelContext` as a fallback for older previews) and registers six tools with `registerTool({ name, description, inputSchema, annotations, execute })`. Input schemas use JSON Schema with enums, ranges and `additionalProperties: false`; `execute` returns plain objects, which the browser serializes for the agent. Each tool's `execute` is wrapped so the call, arguments (with pasted manifest bodies redacted), result size and latency are appended to the on-page log, and so the tool can sync the UI (filter chips, Mine list, highlighted source, expanded diff, pre-filled form).
- **Tools:** `list_changes({since_hours?, severity?, kind?})`, `check_dependency({name})` (bigram + token-weighted fuzzy match across source name, id, npm and PyPI package names and model aliases; returns confidence and alternatives), `list_sources({kind?})`, `check_dependencies({deps?, manifest?, since_hours?})`, `get_diff({diff_id})`, `watch_dependencies({email, deps[], workflow?})`.
- **Backend (unchanged for this challenge):** a Deno edge function on Supabase fetches every watch URL daily via pg_cron, normalizes (npm/PyPI/registry JSON, HTML→text), hashes, multiset-line-diffs against the stored snapshot, classifies, and writes `diffs` rows.
- **Testing:** `scripts/webmcp-smoke.mjs` is a dependency-free script that launches Chrome with WebMCP enabled, asserts all six names, and has the *browser* invoke the five read tools plus structured-error cases through the DevTools `WebMCP.invokeTool` command — the same channel an agent uses. `evidence/smoke_live_2026-09-03_final.txt` is the current production transcript; `docs/webmcp-test-log.md` is historical four-tool evidence.

## Challenges

The WebMCP docs disagreed on the namespace (`document.modelContext` vs older `navigator.modelContext`), so the page feature-detects both and was verified against Chrome 152 directly. Chrome's `execute` return value is JSON-serialized by the browser, which shaped the tools to return plain objects. Fuzzy matching model IDs like `claude-sonnet-4-5` to an API source needed alias tables plus length-weighted token scoring so short tokens like "pro" don't outrank "gemini". Chrome also does not enforce a tool's `inputSchema` at runtime, so every tool re-validates its own arguments before building a query rather than trusting the declared enums and ranges.

### Prior work vs. work in the submission window

The diff engine (`supabase/functions/run/index.ts`), schema (`supabase/migrations/0001_init.sql`, applied 2026-09-01 per its header comment; the Supabase project was created 2026-09-01 22:36 UTC and took its first snapshots at 22:53 UTC, after the Aug 25 window start), the 48-source list and the original human page were built first. The WebMCP work is everything that touches an agent: the six current tools registered on `document.modelContext`, the UI mirroring and Mine filter, the Agent tools panel with its call log, the `scripts/webmcp-smoke.mjs` proof that has Chrome itself invoke the tools, and the real-agent demo pipeline in `demo/`. The current demo records the six-tool version. All of it is in this repository's dated commit history, which starts 2026-09-02 10:38 CDT (`evidence/git_history.txt`).

### Limitations

- **Severity is heuristic.** "Breaking" is inferred from major version bumps, removed tools or schema fields, and changelog wording; it can over- or under-call. Every change links to the source line so a person can check.
- **Fuzzy matching returns a confidence, not a guarantee.** `check_dependency` picks the best of 48 sources and lists alternatives; a name that matches nothing returns the watched list instead of a guess.
- **Alert delivery is not live yet.** `watch_dependencies` stores the list (row-level security allows only that insert) and filters the page to matching sources. Email and Slack delivery ship with the pilot.
- **Coverage is the 48 sources / 119 URLs in `data/sources.json`.** Private or unpublished dependencies are not watched.
- **WebMCP is pre-release.** The tools register in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` (the production origin also carries a WebMCP origin-trial token, so no flag is needed there) and in ChatGPT's browser; other browsers see the page with the panel explaining what an agent would get.
- **Three daily runs exist so far** (Sept 1 baseline, Sept 2, Sept 3), so the history judges can query is days, not months.

## See a real agent drive it

The demo video shows the production site with a real Gemini agent on screen. Gemini reads the six tool schemas the page registered on `document.modelContext` and exercises all five read tools through Chrome's WebMCP DevTools channel while the page reacts. When asked to save the audited list without an email, it does not invoke consent-gated `watch_dependencies`; it asks for the missing confirmation instead. The Agent tools panel on the live site logs any agent's calls the same way, so a judge in ChatGPT's browser — or in Chrome 149+, which needs no flag on this origin because it carries a WebMCP origin-trial token — sees the same log.

---

## 2. Demo video — what's in the cut (2:50, https://youtu.be/z_lRFhLq9eQ)

The finalist cut uses one production capture with model waits removed, plus title/proof cards, Host/Expert narration and captions.

| Time | What's on screen | Proof point |
|---|---|---|
| 0:00–0:19 | Opening card over the production page. | 119 URLs, 48 sources, six WebMCP tools: five read and one write. |
| 0:19–0:43 | Gemini audits a pasted config with `check_dependencies`; the page switches to Mine. | Three dependencies matched; recent changes and breaking counts share the page with the agent. |
| 0:43–0:59 | `get_diff(19)` opens the stored GitHub MCP diff. | The evidence shows the `per_page` → `perPage` parameter change. |
| 0:59–1:14 | `check_dependency` checks GitHub MCP directly. | The result includes recent changes and last-fetch health. |
| 1:14–1:31 | `list_sources` shows the MCP server catalog. | Coverage is explicit: 42 MCP servers, not private dependencies. |
| 1:31–1:53 | `list_changes` filters to breaking changes from the last 168 hours. | The agent surfaces both breaking results and keeps their sources visible. |
| 1:53–2:10 | The person asks Gemini to save the audited list without providing an email. | Gemini does not invoke `watch_dependencies`; it asks for the missing email and confirmation. |
| 2:10–2:21 | A person runs the same tool implementation from the panel. | HUMAN and AGENT calls appear together in the visible log. |
| 2:21–2:42 | Proof card over the production capture. | Six page-registered schemas, Chrome WebMCP invocation, shared page state; no AgentWire API key, separate MCP server or scraping. |
| 2:42–2:50 | Close card. | AgentWire puts the agent on the same page as the evidence and the person deciding. |

How it's real: the chat pane is injected for the recording, but the agent is a live Gemini function-calling loop whose tool declarations come from the page's own `registerTool` schemas, and every call is invoked through Chrome's `WebMCP.invokeTool` DevTools command — the same channel a browser agent uses. Model wait time is cut from the timeline; title/proof cards and captions make the evidence legible.

---

## 3. Only you can do these

1. **Deployed.** https://agentwire.web.app is live on Firebase Hosting. Redeploy after any site change with `firebase deploy --only hosting`.
2. **Origin trial token: done.** Registered for https://agentwire.web.app (expires 2026-11-16) and deployed; the earlier stock-Chrome check verified that `document.modelContext` was present without flags. The final production smoke verified all six tools in Chrome 152 with WebMCP enabled (`evidence/smoke_live_2026-09-03_final.txt`).
3. **Demo uploaded.** https://youtu.be/z_lRFhLq9eQ is public and runs 2:50.
4. **Devpost form** at https://webmcp.devpost.com: title, tagline, the description in §1, the live URL, repo URL, video URL, and screenshots (`docs/agent-panel.png`, `docs/agent-form.png`). Devpost's page shows **Deadline: Sep 4 2026 @ 1:00 AM PDT** (the Official Rules text still says Sep 3 1:00 PM PT); the entry is submitted and stays editable until then.
5. **GitHub "About" license badge.** GitHub detects `LICENSE` automatically; confirm "MIT license" shows in the repo sidebar (rules require it visible there).
6. **Optional:** delete the test subscription row (`webmcp-test@example.com`, source `webmcp`) from `dependency_lists` in Supabase — it was inserted by the recorded test run.
