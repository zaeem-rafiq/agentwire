# AgentWire — dependency watch for production agents

Daily diffs of the MCP servers, model APIs and SDKs your agents depend on — schema, tool-list, version and deprecation changes — surfaced before they break you. Nothing is injected into your agent; you get the diff.

**WebMCP Challenge entry.** The page exposes the same data to browser agents through four [WebMCP](https://developer.chrome.com/docs/ai/webmcp) tools, and shows every agent call live in an "Agent tools" panel so a person and their agent work the same page together. Live at **https://agentwire.web.app**. See [SUBMISSION.md](SUBMISSION.md).

![Agent tools panel](docs/agent-panel.png)

## WebMCP tools

Registered on `document.modelContext` at load (feature-detected; `navigator.modelContext` is checked as a fallback for older previews). Each tool runs the same PostgREST queries as the human UI, then mirrors what it did back into the page — filter chips flip, the matched source is highlighted, the diff row expands, the form fills in.

| Tool | Input | Returns | Side effect |
|---|---|---|---|
| `list_changes` | `since_hours?` (1–720, default 168), `severity?` (breaking/notice/info), `kind?` (mcp_server/model_api/spec) | recent changes, newest first | read-only; sets the severity filter in the UI |
| `check_dependency` | `name` (fuzzy: package, server, model ID, API) | best match + confidence, alternatives, changes in the last 30 days, last-run health for that source's URLs | read-only; highlights the source |
| `get_diff` | `diff_id` | the stored `- `/`+ ` line diff for one change | read-only; expands that row |
| `watch_dependencies` | `email`, `deps[]` (1–100), `workflow?` | confirmation | inserts one `dependency_lists` row; fills the form |

Enable it:

- **Chrome 149+**: `chrome://flags/#enable-webmcp-testing` → Enabled → relaunch, or serve the page from an origin enrolled in the [WebMCP origin trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241) (token goes in the `<meta http-equiv="origin-trial">` slot at the top of `site/index.html`).
- **ChatGPT's browser**: nothing to flip — tools appear under *Site tools* in the address bar.
- To watch calls by hand, install [WebMCP – Model Context Tool Inspector](https://chromewebstore.google.com/detail/gbpdfapgefenggkahomfgkhfehlcenpd); the "▶ sample" buttons in the panel run the same functions without an agent.

Smoke test (no dependencies; drives real Chrome over the DevTools `WebMCP` domain, so the *browser* invokes the tools):

    python3 -m http.server 8787 -d site &
    node scripts/webmcp-smoke.mjs                       # read tools
    WEBMCP_TEST_EMAIL=you@example.com node scripts/webmcp-smoke.mjs   # + the write tool

A recorded run with every request/response is in [docs/webmcp-test-log.md](docs/webmcp-test-log.md).

## What's here

- `site/index.html` — the whole front end: plain HTML + fetch against Supabase PostgREST (no build step), the WebMCP tool registrations and the Agent tools panel. Deploy as a static site.
- `scripts/webmcp-smoke.mjs` — dependency-free WebMCP smoke test (see above).
- `supabase/functions/run/index.ts` — the diff engine (Deno edge function). Fetches every active watch URL, normalizes (npm/PyPI/registry JSON, HTML → text, markdown as-is), hashes, multiset-line-diffs against the stored snapshot, classifies (version_bump / changelog / schema / tools / content; info / notice / breaking) and writes `diffs` rows. Runs daily from pg_cron.
- `supabase/migrations/0001_init.sql` — schema + RLS + cron.
- `data/sources.json` — the 48 watched sources / 119 URLs and why each was chosen.

## Live backend

Supabase project `bhhexzbupdksufmbcuab` (us-east-1). Publishable key is in `site/index.html`; it can only read `sources`, `watches`, `diffs`, `runs`, `site_config` and insert into `dependency_lists`.

## Local dev

Serve `site/` with any static server. To trigger the engine manually:

    curl -X POST https://bhhexzbupdksufmbcuab.supabase.co/functions/v1/run -H "x-run-token: $AGENTWIRE_RUN_TOKEN"

Optional query params: `offset`, `limit` (batching).

## Deploy

Firebase Hosting (Google Cloud project `agentwire-webmcp`, site `agentwire`), static, no build. `firebase.json` serves `site/` with clean URLs.

    firebase deploy --only hosting        # → https://agentwire.web.app

## License

MIT
