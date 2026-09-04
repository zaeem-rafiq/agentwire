# Evidence summary

All numbers below come from files in this directory. Backend tables were read with the site's publishable key (read-only) at exported 2026-09-04T02:38Z; the smoke-test transcripts are in `clean_clone_run.txt`.

## What the backend holds (`backend_*.json`)

| Metric | Value | Source file |
|---|---|---|
| Sources watched | 48 (42 MCP servers, 3 model APIs, 3 spec/SDK/registry) | `backend_sources.json` |
| URLs diffed daily | 119 | `backend_watches.json` |
| Daily runs recorded | 3 (latest 2026-09-03T11:00Z, 119/119 fetched OK, 18 changed, errors: 0) | `backend_runs.json` |
| Changes detected (all time, baseline Sept 1) | 25 across 13 sources | `backend_diffs.json` |
| By severity | breaking 2 · notice 17 · info 6 | `backend_diffs.json` |
| By category | changelog 12 · content 10 · version_bump 2 · tools 1 | `backend_diffs.json` |
| By day | 2026-09-02 7 · 2026-09-03 18 | `backend_diffs.json` |

Breaking changes on record: #19 GitHub MCP Server (official) — Tool list changed: +0/-2 (e.g. - per_page: Results per page for pagination (default: 30, m; #30 Google Gemini API — Deprecations page updated: Gemini 3.8 Flash is now available. Try it out..

## WebMCP tools, invoked by Chrome over the DevTools `WebMCP` domain (`clean_clone_run.txt`)

Fresh clone of `main`, no install step, Chrome 152.0.7977.77, Node 22.22.3. All four tools registered on both origins; the three read tools were invoked (the write tool was skipped so nothing was inserted).

| Tool | Local (`127.0.0.1:8787`) | Production (`agentwire.web.app`) |
|---|---|---|
| `list_changes` | 195 ms | 97 ms |
| `check_dependency` | 93 ms / 98 ms | 98 ms / 100 ms |
| `get_diff` | 166 ms | 185 ms |

Latency is the page-side time from `execute()` entry to return (PostgREST round trip included), as logged in the Agent tools panel. Both runs exited 0.

## Demo video (`../demo/output/timeline-agent.json`, YouTube page metadata)

| Item | Value |
|---|---|
| Rendered length | 91.0 s |
| YouTube `lengthSeconds` | 91 (checked 2026-09-03 19:45 PDT) |
| Visibility | unlisted, not private (`isUnlisted: true`, `isPrivate: false`) |
| Agent model in the recording | gemini-3.8-flash (`../demo/captures/marks-agent.json`) |
| Tool calls in the recording | 6 across 4 questions |

![Changes by day and severity](changes_chart.png)
