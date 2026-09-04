# AgentWire — no build step, no dependencies. Targets wrap the commands in README.md.
PORT ?= 8787
LIVE ?= https://agentwire.web.app/

.PHONY: serve smoke smoke-live demo demo-verify evidence

serve:            ## serve site/ on http://127.0.0.1:$(PORT)/
	python3 -m http.server $(PORT) -d site

smoke:            ## Chrome invokes 5 read tools + one structured-error case over the DevTools WebMCP domain against a local server
	@python3 -m http.server $(PORT) -d site >/dev/null 2>&1 & pid=$$!; sleep 1; \
	node scripts/webmcp-smoke.mjs http://127.0.0.1:$(PORT)/; rc=$$?; kill $$pid; exit $$rc

smoke-live:       ## same smoke test against the production site
	node scripts/webmcp-smoke.mjs $(LIVE)

demo:             ## re-record the finalist demo (needs GEMINI_API_KEY, ffmpeg, Swift, Pillow)
	mkdir -p demo/edit/finalist/assets
	AGENTWIRE_DEMO_EDIT_DIR=$(CURDIR)/demo/edit/finalist GEMINI_MODEL=$${GEMINI_MODEL:-gemini-2.5-flash-lite} node demo/capture-agent.mjs $(LIVE)
	AGENTWIRE_NARRATION_DIR=$(CURDIR)/demo/edit/finalist/narration AGENTWIRE_AUDIO_DIR=$(CURDIR)/demo/edit/finalist/audio node demo/generate-narration.mjs 10-open 11-audit 12-diff 13-health 14-sources 15-breaking 16-consent 17-human 18-proof 19-close
	swift demo/render-cards.swift demo/edit/finalist/cards/intro.svg demo/edit/finalist/assets/intro.png
	swift demo/render-cards.swift demo/edit/finalist/cards/proof.svg demo/edit/finalist/assets/proof.png
	swift demo/render-cards.swift demo/edit/finalist/cards/close.svg demo/edit/finalist/assets/close.png
	sh demo/render-agent-finalist.sh

demo-verify:      ## duration / audio / black-frame checks on the rendered demo
	sh demo/verify.sh demo/edit/finalist/output/AgentWire-WebMCP-Demo-finalist.mp4

evidence:         ## re-export the read-only backend tables into evidence/ (publishable key, no writes)
	@KEY=$$(grep -oE "sb_publishable_[A-Za-z0-9_-]+" site/index.html | head -1); B=https://bhhexzbupdksufmbcuab.supabase.co/rest/v1; \
	curl -sS "$$B/sources?select=*&order=id" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_sources.json; \
	curl -sS "$$B/watches?select=*&order=id" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_watches.json; \
	curl -sS "$$B/runs?select=*&order=started_at.desc" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_runs.json; \
	curl -sS "$$B/diffs?select=id,detected_at,source_id,watch_id,url,category,severity,summary,added_lines,removed_lines&order=detected_at.desc" -H "apikey: $$KEY" -H "Authorization: Bearer $$KEY" -o evidence/backend_diffs.json; \
	date -u +%Y-%m-%dT%H:%MZ > evidence/backend_export_timestamp.txt; echo "exported to evidence/"
