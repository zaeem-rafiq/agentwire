# Demo video script — AgentWire on WebMCP

**Uploaded cut:** https://youtu.be/z_lRFhLq9eQ — 2:50, real Gemini agent on screen. Rules cap is 3:00. Exact uploaded MP4 SHA-256: `3f942183eed221012ac781e369758754446c664d91009d5cc4dce101dec0e280`.

In the finalist capture, Gemini answers five fixed read questions and one save request. It invokes `check_dependencies`, `get_diff`, `check_dependency`, `list_sources` and `list_changes`; when the save request omits an email, Gemini asks for confirmation instead of invoking consent-gated `watch_dependencies`. Model wait time is cut from the timeline; title/proof cards and captions make the evidence legible.

## Shot list

| Time | Shot | On screen | Proof point |
|---|---|---|---|
| 0:00–0:19 | Opening card over the production page | 119 URLs, 48 sources, six WebMCP tools | Five tools are read-only; one write is consent-gated. |
| 0:19–0:43 | Whole-config audit | `check_dependencies` audits GitHub MCP, Neon and Anthropic; the page switches to Mine | Three dependencies matched, with recent changes and breaking counts. |
| 0:43–0:59 | Stored diff | `get_diff(19)` opens the GitHub MCP diff | The stored lines show `per_page` → `perPage`. |
| 0:59–1:14 | Direct health check | `check_dependency` checks GitHub MCP | The result includes recent changes and last-fetch health. |
| 1:14–1:31 | Coverage boundary | `list_sources` shows 42 MCP servers | Coverage is explicit rather than implied. |
| 1:31–1:53 | Breaking changes | `list_changes` filters the last 168 hours to breaking | Both results remain linked to their sources for human judgment. |
| 1:53–2:10 | Consent boundary | The person asks Gemini to save the list without an email | Gemini asks for the email and confirmation; `watch_dependencies` is not invoked. |
| 2:10–2:21 | Shared human path | A person runs the same implementation from the panel | HUMAN and AGENT calls share one visible log. |
| 2:21–2:42 | Proof card | Production site, six page-registered schemas, Chrome WebMCP invocation | No AgentWire API key, separate MCP server or scraping. |
| 2:42–2:50 | Close card | `agentwire.web.app` | The agent, evidence and person share one page. |
