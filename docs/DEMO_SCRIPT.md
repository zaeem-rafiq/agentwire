# Demo video script — AgentWire on WebMCP

**Uploaded cut:** https://youtu.be/JBnvbj1fF-U — 1:31, real Gemini agent (gemini-3.8-flash) on screen, produced by `make demo` (`demo/capture-agent.mjs` → `demo/render-agent.sh` → `demo/verify.sh`). Rules cap is 3:00; the cut is well inside it. Timestamps below are from `demo/output/timeline-agent.json`; narration text is in `demo/narration/10-open.txt` … `16-close.txt`.

**Pre-stage (deterministic):**

```bash
export GEMINI_API_KEY=…            # only for the on-screen agent
make demo                          # records against https://agentwire.web.app/, renders demo/output/AgentWire-WebMCP-Demo-agent.mp4
make demo-verify                   # 60–179 s window, audio present, no black frames
```

The capture script types four fixed questions, so the tool calls and on-page reactions replay the same way each run; only the model's wording and the day's data change. Model wait time is cut from the timeline and nothing else is edited.

## Shot list

| Time | Shot | On screen (exact) | Narration (Host / Expert) |
|---|---|---|---|
| 0:00–0:15 | Cold-open card over the live page | Card: "Agent dependencies change silently." URL bar: `agentwire.web.app` | H: It's Friday and I'm about to bump the Neon MCP server. Did anything change, and does it break us? E: Ask the agent in your browser. This page registers four WebMCP tools, so it answers from the same data you see on screen. |
| 0:15–0:31 | Chat pane (left) + page (right). Question 1 typed. | Q: "Before I bump the Neon MCP server on Friday: did anything change in the last 30 days, and is any of it breaking?" → chip `check_dependency {"name":"Neon MCP"}` 413 ms → Agent tools panel logs the call → answer cites #11, #12 | H: I ask in plain English. E: The agent reads the tool schemas the page registered, picks check dependency, and Chrome routes the call through WebMCP. The call lands in the panel with its timing, and the answer cites the diff ids. |
| 0:31–0:42 | Question 2. Diff row #12 highlights and expands on the page. | Q: "Show me the changelog diff so I can see what was added." → `get_diff {"diff_id":12}` 411 ms | H: Show me the diff. E: Get diff returns the stored lines for that change, and the row opens on the page as the agent reads it. |
| 0:42–1:00 | Question 3. Severity chip flips to *breaking*, then *notice*. | Q: "Zoom out. What else changed this week across everything we watch, at notice or breaking severity?" → `list_changes {since_hours:168}` → `{severity:"breaking"}` → `{severity:"notice"}`; answer names the GitHub MCP breaking change | H: Now the wider picture. E: List changes across all forty-eight sources, filtered by severity; the page filters itself so the person can verify every claim. |
| 1:00–1:14 | Question 4. Form fills in and shows the saved confirmation. | Q: "Good. Watch the Neon MCP server and claude-sonnet-4-5 for me. Email demo@agentwire.dev." → `watch_dependencies` 449 ms → form: email + 2 deps + "Saved by your agent" | H: And subscribe me. E: The one write, annotated as such; the form fills in to confirm what was saved. |
| 1:14–1:22 | Cursor clicks **▶ sample** on `check_dependency`. | A HUMAN-tagged entry lands beside the AGENT entries in the call log | H: Can I do that myself? E: One click, same function, same log, tagged human beside agent. |
| 1:22–1:31 | Close card | "The agent is on the page." · `agentwire.web.app` · `github.com/zaeem-rafiq/agentwire` · MIT | E: AgentWire. Dependency watch for production agents, with the agent on the page. MIT on GitHub. |

## If re-recording (optional, only if time allows)

Strongest evidence should be in the first 20 seconds. The current cut spends 0:00–0:15 on the problem card. A tighter open: 0:00–0:06 card, then straight into question 1 with the `check_dependency` chip landing by 0:15. That is a narration edit in `demo/narration/10-open.txt` and a re-render; the capture does not need to change.
