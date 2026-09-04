# Social copy (post after submitting; engagement is not a judging criterion, so this is optional)

Handles to verify before posting: @OpenAI, @devpost, @ChromiumDev (Chrome), @Cloudflare, @vercel, @render, @Netlify, @Shopify.

## LinkedIn

I entered the WebMCP Challenge (OpenAI × Devpost) with AgentWire.

The problem: the MCP servers, model APIs and SDKs an agent depends on change silently. A tool gets renamed, a schema gains a required field, a model is deprecated, and you find out when production breaks.

AgentWire diffs 119 URLs across 48 sources every day (manifests, tool lists, changelogs, deprecation pages), classifies each change, and stores the line diff. 25 changes since the Sept 1 baseline, 2 of them breaking.

The WebMCP part: the page registers six tools on document.modelContext. The agent in your browser can audit a whole config, check fetch health, inspect stored diffs, list coverage and, with confirmation, save a dependency list using the same page and data you see. Every call shows up in an on-page log, tagged agent or human. No API key, no separate MCP server, no scraping.

Live: https://agentwire.web.app
Demo (2:50, real Gemini agent, all five read tools; consent-gated write not invoked): https://youtu.be/z_lRFhLq9eQ
Code (MIT): https://github.com/zaeem-rafiq/agentwire

Built with WebMCP in Chrome, Supabase, Firebase Hosting. Thanks to OpenAI, Devpost and the Chrome team for the challenge.

## X thread

1/ Shipped AgentWire for the #WebMCP Challenge by @OpenAI × @devpost. Dependency watch for production agents, with the agent on the page. Live: https://agentwire.web.app

2/ Why: MCP servers, model APIs and SDKs change under your agents. AgentWire diffs 119 URLs across 48 sources daily and classifies each change. Since the Sept 1 baseline: 25 changes, 2 breaking (a removed tool param in the GitHub MCP server, a Gemini deprecation-page update).

3/ The WebMCP bit: six tools on document.modelContext. Five reads audit a config, check one dependency, list coverage and changes, and open stored diffs. The sixth saves a list only after confirmation. The page reacts to every call.

4/ Every call is logged on the page with args, result size and latency, tagged AGENT or HUMAN. Click ▶ sample to run the same function yourself. One code path, one log.

5/ Demo with a real Gemini agent (2:50): all five read tools, plus the consent-gated write boundary without invoking it. https://youtu.be/z_lRFhLq9eQ · MIT code, no build step, no deps: https://github.com/zaeem-rafiq/agentwire · Try it in Chrome 149+ or ChatGPT's browser. cc @ChromiumDev
