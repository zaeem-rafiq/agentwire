# AgentWire finalist demo strategy

Status: approved by the user on 2026-09-04.

Target length: 2:50-2:55. The demo uses the available three-minute judging window while leaving a small encoding margin.

## Story

| Segment | Purpose |
| --- | --- |
| 10-open | Outcome first: audit a production agent stack; establish six tools and 48-source / 119-URL coverage. |
| 11-audit | Real Gemini reads page schemas and calls `check_dependencies` with a config; the visible log redacts the manifest and the UI switches to Mine. |
| 12-diff | `get_diff` opens the exact stored lines used by the agent. |
| 13-health | `check_dependency` distinguishes no change from a failed fetch. |
| 14-sources | `list_sources` makes the coverage boundary explicit. |
| 15-breaking | `list_changes` shows the broader feed and states that severity is heuristic. |
| 16-consent | Show `watch_dependencies` as the sole write and its confirmation boundary; do not submit another row. State that alert delivery is pilot-stage. |
| 17-human | Show human and agent calls sharing one implementation and visible log. |
| 18-proof | Production page, real Gemini, page schemas, Chrome WebMCP, and shared page state; no AgentWire API key, separate MCP server, or scraping. |
| 19-close | Live URL, GitHub repository, and MIT license. |

## Gates

- Preserve the existing public and local videos as fallbacks while building the candidate.
- Exercise all five read tools. Show, but do not invoke, the write tool.
- Verify duration, audio, video, captions, and the absence of black frames.
- Complete visual and full listening review of the exact candidate, then record its SHA-256 hash.
- Upload and replace the Devpost video only after the user approves that exact candidate.
