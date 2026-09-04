# Devpost form — paste-ready fields

Form: https://webmcp.devpost.com → "Manage submission". Deadline shown on the page: **Sep 4 2026 @ 1:00 AM PDT**. Every figure below traces to `evidence/SUMMARY.md`.

| Field | Paste |
|---|---|
| **Project name** | AgentWire |
| **Tagline** (≤ 60 chars) | Dependency watch for AI agents, with the agent on the page |
| **Short description** | AgentWire diffs 119 URLs across 48 MCP servers, model APIs and SDKs every day. Six WebMCP tools let the agent in your browser audit a pasted config, read the important diffs, and save a dependency list that immediately filters the page, with every call logged live. Alert delivery ships with the pilot. |
| **Long description / About the project** | Paste `SUBMISSION.md` §1 (sections *What it is* through *See a real agent drive it*). It already covers the four required topics: WebMCP fit, UX improvement, human+agent collaboration, implementation. |
| **Built with** (tags) | webmcp, javascript, html, supabase, postgresql, postgrest, deno, firebase-hosting, gemini, chrome-devtools-protocol, pg_cron |
| **Live URL** | https://agentwire.web.app |
| **Repository** | https://github.com/zaeem-rafiq/agentwire (public, MIT, license detected by GitHub) |
| **Video** | https://youtu.be/z_lRFhLq9eQ (2:50; **Public**) |
| **Try it out links** | https://agentwire.web.app · https://github.com/zaeem-rafiq/agentwire |
| **Team** | Zaeem Khan (solo) |
| **Cover image** | `docs/mine-filter.png` (current six-tool panel + Mine filter). Alternates: `demo/captures/hero-agent.png` (historical frozen four-tool demo), `docs/agent-panel.png` (historical four-tool panel), `evidence/changes_chart.png`. |
| **Image gallery order** | mine-filter.png → hero-agent.png → agent-panel.png → changes_chart.png |

## How judges try it (put this in the description if there is room)

1. Open https://agentwire.web.app in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled (relaunch), or in ChatGPT's browser (tools appear under *Site tools*).
2. The "Agent tools · WebMCP" panel bottom-right shows "6 tools registered". Ask the browser agent: *"Did the Neon MCP server change in the last 30 days, and is any of it breaking?"*
3. Watch the call land in the panel; click **▶ sample** next to any tool to run the same function by hand.
4. No agent handy: `git clone … && python3 -m http.server 8787 -d site & node scripts/webmcp-smoke.mjs` has Chrome invoke the tools itself. `evidence/smoke_live_2026-09-03_final.txt` is the current six-tool production transcript; `evidence/clean_clone_run.txt` is historical four-tool proof.

## Facts to keep consistent across the form

- 48 sources, 119 URLs, daily run at 11:00 UTC, 25 changes since the Sept 1 baseline (2 breaking).
- Six tools: `list_changes`, `check_dependency`, `list_sources`, `check_dependencies`, `get_diff` (five read-only tools) and `watch_dependencies` (write, annotated).
- Chrome 152.0.7977.77 and Node 22.22.3 were used for the current six-tool production proof in `evidence/smoke_live_2026-09-03_final.txt`.
- The video uses a real Gemini agent over the page's own `registerTool` schemas, invoked through Chrome's `WebMCP.invokeTool` DevTools command. It exercises all five read tools; consent-gated `watch_dependencies` is explained but not invoked.
