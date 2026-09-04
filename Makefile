# AgentWire — no build step, no dependencies. Targets wrap the commands in README.md.
PORT ?= 8787
LIVE ?= https://agentwire.web.app/

.PHONY: serve smoke smoke-live demo demo-verify evidence

serve:            ## serve site/ on http://127.0.0.1:$(PORT)/
	python3 -m http.server $(PORT) -d site

smoke:            ## Chrome invokes the 3 read tools over the DevTools WebMCP domain against a local server
	@python3 -m http.server $(PORT) -d site >/dev/null 2>&1 & pid=$$!; sleep 1; \
	node scripts/webmcp-smoke.mjs http://127.0.0.1:$(PORT)/; rc=$$?; kill $$pid; exit $$rc

smoke-live:       ## same smoke test against the production site
	node scripts/webmcp-smoke.mjs $(LIVE)

demo:             ## re-record the demo video with a real Gemini agent on screen (needs GEMINI_API_KEY, ffmpeg)
	GEMINI_MODEL=$${GEMINI_MODEL:-gemini-3.8-flash} node demo/capture-agent.mjs $(LIVE)
	sh demo/render-agent.sh

demo-verify:      ## duration / audio / black-frame checks on the rendered demo
	sh demo/verify.sh demo/output/AgentWire-WebMCP-Demo-agent.mp4

evidence:         ## re-export the read-only backend tables into evidence/ (publishable key, no writes)
	@KEY=$$(grep -oE "sb_publishable_[A-Za-z0-9_-]+" site/index.html | head -1); B=https://bhhexzbupdksufmbcuab.supabase.co/rest/v1; \
	curl -sS "$$B/sources?select=*&order=id" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_sources.json; \
	curl -sS "$$B/watches?select=*&order=id" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_watches.json; \
	curl -sS "$$B/runs?select=*&order=started_at.desc" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_runs.json; \
	curl -sS "$$B/diffs?select=id,detected_at,source_id,watch_id,url,category,severity,summary,added_lines,removed_lines&order=detected_at.desc" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_diffs.json; \
	date -u +%Y-%m-%dT%H:%MZ > evidence/backend_export_timestamp.txt; echo "exported to evidence/"
