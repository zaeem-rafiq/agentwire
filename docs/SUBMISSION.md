# Devpost form — paste-ready fields

Form: https://webmcp.devpost.com → "Manage submission". Deadline shown on the page: **Sep 4 2026 @ 1:00 AM PDT**. Every figure below traces to `evidence/SUMMARY.md`.

| Field | Paste |
|---|---|
| **Project name** | AgentWire |
| **Tagline** (≤ 60 chars) | Dependency watch for AI agents, with the agent on the page |
| **Short description** | AgentWire diffs 119 URLs across 48 MCP servers, model APIs and SDKs every day. Four WebMCP tools let the agent in your browser ask "did anything I depend on change, and is it breaking?", read the diff, and subscribe you, on the same page you see, with every call logged live. |
| **Long description / About the project** | Paste `SUBMISSION.md` §1 (sections *What it is* through *Limitations*). It already covers the four required topics: WebMCP fit, UX improvement, human+agent collaboration, implementation. |
| **Built with** (tags) | webmcp, javascript, html, supabase, postgresql, postgrest, deno, firebase-hosting, gemini, chrome-devtools-protocol, pg_cron |
| **Live URL** | https://agentwire.web.app |
| **Repository** | https://github.com/zaeem-rafiq/agentwire (public, MIT, license detected by GitHub) |
| **Video** | https://youtu.be/JBnvbj1fF-U (1:31; set to **Public** before submitting; rules say "publicly posted") |
| **Try it out links** | https://agentwire.web.app · https://github.com/zaeem-rafiq/agentwire |
| **Team** | Zaeem Khan (solo) |
| **Cover image** | `docs/agent-panel.png` (page + Agent tools panel with a logged call). Alternates: `docs/agent-form.png` (form filled by the agent), `demo/captures/hero-agent.png` (chat pane + page), `evidence/changes_chart.png`. |
| **Image gallery order** | agent-panel.png → hero-agent.png → agent-form.png → changes_chart.png |

## How judges try it (put this in the description if there is room)

1. Open https://agentwire.web.app in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled (relaunch), or in ChatGPT's browser (tools appear under *Site tools*).
2. The "Agent tools · WebMCP" panel bottom-right shows "4 tools registered". Ask the browser agent: *"Did the Neon MCP server change in the last 30 days, and is any of it breaking?"*
3. Watch the call land in the panel; click **▶ sample** next to any tool to run the same function by hand.
4. No agent handy: `git clone … && python3 -m http.server 8787 -d site & node scripts/webmcp-smoke.mjs` has Chrome invoke the tools itself (transcript in `evidence/clean_clone_run.txt`).

## Facts to keep consistent across the form

- 48 sources, 119 URLs, daily run at 11:00 UTC, 25 changes since the Sept 1 baseline (2 breaking).
- Four tools: `list_changes`, `check_dependency`, `get_diff` (read-only) and `watch_dependencies` (write, annotated).
- Chrome 152.0.7977.77 and Node 22.22.3 were used for the recorded proofs.
- The agent in the video is gemini-3.8-flash doing function calling over the page's own `registerTool` schemas, invoked through Chrome's `WebMCP.invokeTool` DevTools command.
