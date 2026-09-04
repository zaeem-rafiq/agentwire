# Social copy (post after submitting; engagement is not a judging criterion, so this is optional)

Handles to verify before posting: @OpenAI, @devpost, @ChromiumDev (Chrome), @Cloudflare, @vercel, @render, @Netlify, @Shopify.

## LinkedIn

I entered the WebMCP Challenge (OpenAI × Devpost) with AgentWire.

The problem: the MCP servers, model APIs and SDKs an agent depends on change silently. A tool gets renamed, a schema gains a required field, a model is deprecated, and you find out when production breaks.

AgentWire diffs 119 URLs across 48 sources every day (manifests, tool lists, changelogs, deprecation pages), classifies each change, and stores the line diff. 25 changes since the Sept 1 baseline, 2 of them breaking.

The WebMCP part: the page registers four tools on document.modelContext. The agent in your browser can ask "did the Neon MCP server change this month, and is it breaking?", read the diff, and subscribe you, using the same page and the same data you see. Every call shows up in an on-page log, tagged agent or human. No API key, no separate MCP server, no scraping.

Live: https://agentwire.web.app
Demo (1:31, real Gemini agent on screen): https://youtu.be/JBnvbj1fF-U
Code (MIT): https://github.com/zaeem-rafiq/agentwire

Built with WebMCP in Chrome, Supabase, Firebase Hosting. Thanks to OpenAI, Devpost and the Chrome team for the challenge.

## X thread

1/ Shipped AgentWire for the #WebMCP Challenge by @OpenAI × @devpost. Dependency watch for production agents, with the agent on the page. Live: https://agentwire.web.app

2/ Why: MCP servers, model APIs and SDKs change under your agents. AgentWire diffs 119 URLs across 48 sources daily and classifies each change. Since the Sept 1 baseline: 25 changes, 2 breaking (a removed tool param in the GitHub MCP server, a Gemini deprecation-page update).

3/ The WebMCP bit: four tools on document.modelContext (list_changes, check_dependency, get_diff, watch_dependencies). The browser agent runs the same PostgREST queries the human UI runs, and the page reacts: chips flip, the diff row opens, the form fills in.

4/ Every call is logged on the page with args, result size and latency (93–195 ms in the recorded runs), tagged AGENT or HUMAN. Click ▶ sample to run the same function yourself. One code path, one log.

5/ Demo with a real Gemini agent on screen (1:31): https://youtu.be/JBnvbj1fF-U · MIT code, no build step, no deps: https://github.com/zaeem-rafiq/agentwire · Try it in Chrome 149+ (chrome://flags/#enable-webmcp-testing) or ChatGPT's browser. cc @ChromiumDev
