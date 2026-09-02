# WebMCP tool calls — recorded test run

Recorded 2026-09-02T15:37Z with `scripts/webmcp-smoke.mjs` against `site/index.html` served on localhost, in **Google Chrome 152.0.7977.66** launched with `--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport` (the equivalent of `chrome://flags/#enable-webmcp-testing`).

The browser — not page JavaScript — invoked each tool through the DevTools `WebMCP.invokeTool` command and delivered the result via `WebMCP.toolResponded`, which is the same channel a browser agent uses. Responses are truncated at 1400 characters here.

```
browser: Chrome/152.0.7977.66 | page status: 4 tools registered
WebMCP.toolsAdded → browser sees tools: list_changes, check_dependency, get_diff, watch_dependencies

=== list_changes ===
→ request  WebMCP.invokeTool { frameId: "AEF5CB3286600B8332603DA0743D10EA", toolName: "list_changes", input: {"since_hours":168,"severity":"notice"} }
← response {"since":"2026-08-26T15:36:02.905Z","count":6,"changes":[{"diff_id":9,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"serena","source":"Serena (coding agent toolkit)","kind":"mcp_server","category":"changelog","severity":"notice","summary":"New changelog entry:   - Fix: Exceptions raised during `LanguageServerManager.start` did not stop the language server subprocess if it was","url":"https://raw.githubusercontent.com/oraios/serena/main/CHANGELOG.md","added_lines":2,"removed_lines":0},{"diff_id":10,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"desktop-commander","source":"Desktop Commander MCP","kind":"mcp_server","category":"content","severity":"notice","summary":"Manifest changed (+2/-3 lines)","url":"https://raw.githubusercontent.com/wonderwhy-er/DesktopCommanderMCP/main/package.json","added_lines":2,"removed_lines":3},{"diff_id":11,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"neon-mcp","source":"Neon MCP Server","kind":"mcp_server","category":"content","severity":"notice","summary":"Manifest changed (+2/-2 lines)","url":"https://raw.githubusercontent.com/neondatabase/mcp-server-neon/main/package.json","added_lines":2,"removed_lines":2},{"diff_id":12,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"neon-mcp","source":"Neon MCP Server","kind":"mcp_server","category":"changelog","severity":"notice","summary":"New chan

=== check_dependency ===
→ request  WebMCP.invokeTool { frameId: "AEF5CB3286600B8332603DA0743D10EA", toolName: "check_dependency", input: {"name":"neon"} }
← response {"query":"neon","match":{"id":"neon-mcp","name":"Neon MCP Server","kind":"mcp_server","npm_package":"@neondatabase/mcp-server-neon","pypi_package":null,"repo_url":null,"confidence":0.9},"alternatives":[{"id":"anthropic-api","name":"Anthropic Claude API","confidence":0.4}],"changes_30d":[{"diff_id":11,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"neon-mcp","source":"Neon MCP Server","kind":"mcp_server","category":"content","severity":"notice","summary":"Manifest changed (+2/-2 lines)","url":"https://raw.githubusercontent.com/neondatabase/mcp-server-neon/main/package.json","added_lines":2,"removed_lines":2},{"diff_id":12,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"neon-mcp","source":"Neon MCP Server","kind":"mcp_server","category":"changelog","severity":"notice","summary":"New changelog entry: List, register, and delete branch custom domains: `list_functions_custom_domains`, `register_functions_custom_domain`, `delete_functions_custom_domain` (`?category=functions`). Requires `@neon/tools` 1.2.0.","url":"https://raw.githubusercontent.com/neondatabase/mcp-server-neon/main/CHANGELOG.md","added_lines":2,"removed_lines":0}],"breaking_30d":0,"last_run":{"started_at":"2026-09-02T11:00:02.509+00:00","fetched_ok":119,"watches_total":119,"urls_watched_for_this_source":3,"errors_for_this_source":[],"healthy":true}}

=== check_dependency ===
→ request  WebMCP.invokeTool { frameId: "AEF5CB3286600B8332603DA0743D10EA", toolName: "check_dependency", input: {"name":"claude-sonnet-4-5"} }
← response {"query":"claude-sonnet-4-5","match":{"id":"anthropic-api","name":"Anthropic Claude API","kind":"model_api","npm_package":null,"pypi_package":null,"repo_url":null,"confidence":0.65},"alternatives":[],"changes_30d":[],"breaking_30d":0,"last_run":{"started_at":"2026-09-02T11:00:02.509+00:00","fetched_ok":119,"watches_total":119,"urls_watched_for_this_source":5,"errors_for_this_source":[],"healthy":true}}

=== get_diff ===
→ request  WebMCP.invokeTool { frameId: "AEF5CB3286600B8332603DA0743D10EA", toolName: "get_diff", input: {"diff_id":9} }
← response {"found":true,"diff_id":9,"detected_at":"2026-09-02T11:00:06.816939+00:00","source_id":"serena","source":"Serena (coding agent toolkit)","kind":"mcp_server","category":"changelog","severity":"notice","summary":"New changelog entry:   - Fix: Exceptions raised during `LanguageServerManager.start` did not stop the language server subprocess if it was","url":"https://raw.githubusercontent.com/oraios/serena/main/CHANGELOG.md","added_lines":2,"removed_lines":0,"unified_diff":"+   - Fix: Exceptions raised during `LanguageServerManager.start` did not stop the language server subprocess if it was\n+     already started (#1949)","truncated":false}

=== watch_dependencies ===
→ request  WebMCP.invokeTool { frameId: "AEF5CB3286600B8332603DA0743D10EA", toolName: "watch_dependencies", input: {"email":"webmcp-test@example.com","deps":["@neondatabase/mcp-server-neon","claude-sonnet-4-5"],"workflow":"re-run eval suite, pin if red"} }
← response {"ok":true,"email":"webmcp-test@example.com","deps":["@neondatabase/mcp-server-neon","claude-sonnet-4-5"],"watched_count":2,"message":"Saved. Alerts go to this email the morning one of these changes."}

CDP events seen: WebMCP.toolsAdded WebMCP.toolsAdded WebMCP.toolsAdded WebMCP.toolsAdded WebMCP.toolInvoked(list_changes) WebMCP.toolResponded WebMCP.toolInvoked(check_dependency) WebMCP.toolResponded WebMCP.toolInvoked(check_dependency) WebMCP.toolResponded WebMCP.toolInvoked(get_diff) WebMCP.toolResponded WebMCP.toolInvoked(watch_dependencies) WebMCP.toolResponded

panel log entries (page-side): watch_dependencies:agent:86ms | get_diff:agent:103ms | check_dependency:agent:88ms | check_dependency:agent:95ms | list_changes:agent:157ms
```
