# Submission checklist — The WebMCP Challenge

Generated 2026-09-03 ~19:50 PDT. Deadline on the Devpost page: **Sep 4 2026 @ 1:00 AM PDT**. Status: PASS / FAIL / NEEDS-HUMAN with the proof path.

## A. Disqualifiers

| Item | Status | Proof |
|---|---|---|
| Contest name, deadline, criteria, deliverables, eligibility recorded | PASS | `docs/CONTEST.md`, `evidence/devpost_home.txt`, `evidence/devpost_rules.txt` |
| WebMCP actually used: 4 tools registered on `document.modelContext`, invoked by Chrome | PASS | `evidence/clean_clone_run.txt` (local + production, exit 0), `site/index.html:352-367` |
| Work created inside the submission window (Aug 25 – deadline) | PASS | `evidence/git_history.txt` (first commit 2026-09-02 10:38 CDT); prior-work section in `README.md` and `SUBMISSION.md` |
| Backend start date confirmed ≥ Aug 25 (rule for pre-existing projects) | NEEDS-HUMAN | migration header says applied 2026-09-01; confirm nothing predates Aug 25 or add the date to the prior-work section |
| All work committed and pushed; default branch `main` is what judges see | PASS | `git status` clean after the final push; GitHub API `default_branch: main` |
| Repo public, MIT license detected by GitHub and visible at the top | PASS | GitHub API: `private: false`, `license.spdx_id: MIT`; `LICENSE` |
| No secrets in history; `.gitignore` covers `.env*`, `.firebase/`, `supabase/.temp/` | PASS | history grep for key patterns: 0 hits; env files ever committed: none. The `sb_publishable_…` key in `site/index.html` is the intended anon key, scoped by RLS (`supabase/migrations/0001_init.sql`) |
| `.env.example`, `LICENSE`, one-command install path | PASS | `.env.example`, `LICENSE`, `Makefile` (`make smoke`); no install step exists because there are no dependencies |
| Clean-clone proof | PASS | `evidence/clean_clone_run.txt`: fresh clone, `python3 -m http.server`, `node scripts/webmcp-smoke.mjs`, exit 0 on local and production |
| Live URL reachable and registers the tools in Chrome 149+ with WebMCP | PASS | HTTP 200 from https://agentwire.web.app; production smoke run in `evidence/clean_clone_run.txt` |
| Live URL works in ChatGPT's in-app browser | NEEDS-HUMAN | not verifiable from this machine; open the site there once and confirm *Site tools* lists 4 tools |
| Demo video < 3 min | PASS | YouTube `lengthSeconds: 91`; `demo/output/timeline-agent.json` total 90.989 s |
| Demo video has audio narration | NEEDS-HUMAN | `demo/verify.sh` checks mean volume at render time, but the MP4 is not in the repo; play the YouTube link once |
| Demo video publicly posted | NEEDS-HUMAN | YouTube metadata: `isUnlisted: true`. Rules say "publicly posted"; set to **Public** in YouTube Studio |
| Text description covers WebMCP fit, UX, human+agent collaboration, implementation | PASS | `SUBMISSION.md` §1 (now also Prior work and Limitations) |
| Devpost form submitted with current links | NEEDS-HUMAN | recorded as submitted on 2026-09-03; re-paste §1 so the form carries the two new sections, confirm video/live/repo links |
| Evidence pack with real data, summary table and chart | PASS | `evidence/SUMMARY.md`, `evidence/backend_*.json`, `evidence/changes_chart.png` |
| Open blockers that crash the demo path | PASS (none) | smoke runs exit 0; the one optional cleanup (test row `webmcp-test@example.com` in `dependency_lists`) does not affect the demo |

## B. Costs points

| Item | Status | Proof |
|---|---|---|
| README opens with one-liner, evidence table, chart, architecture diagram, quickstart, safety section, links | PASS | `README.md` top; Mermaid parsed with mermaid@11 (headless check) |
| Limitations stated plainly | PASS | `SUBMISSION.md` → Limitations |
| Demo script with shot list, timestamps, exact on-screen text, deterministic pre-stage | PASS | `docs/DEMO_SCRIPT.md`, `make demo`, `make demo-verify` |
| Paste-ready form fields | PASS | `docs/SUBMISSION.md` |
| Social copy | PASS (optional to post) | `docs/SOCIAL.md` |
| Origin-trial token so judges need no flag on Chrome 149+ | NEEDS-HUMAN (optional) | not registered; slot at top of `site/index.html`; requires a redeploy |

## C. Polish (not done, by choice)

| Item | Status | Note |
|---|---|---|
| Tighter video open (tool call inside the first 15 s) | open | `docs/DEMO_SCRIPT.md` → "If re-recording" |
| ChatGPT-browser screenshot in README | open | needs that browser |
| Delete `site/vercel.json` leftover | open | harmless; feature freeze |

## Judge simulation (criteria from `docs/CONTEST.md`; 1–5)

| Criterion | Before this pass | After | One line |
|---|---|---|---|
| WebMCP Leverage | 4 | 4 | Four schema'd tools with annotations, UI mirroring and a live call log; code untouched tonight. Missing: origin trial, ChatGPT-browser proof. |
| Execution | 4 | 4 | Live site, real daily data, browser-driven smoke test; alerts are stored, not yet sent (now stated in Limitations). |
| Potential Impact | 3 | 3 | Real problem for agent builders; evidence is 25 changes over 3 runs, no users yet. The evidence table makes the claim checkable but not larger. |
| Creativity & Ambition | 4 | 4 | "Agent and person on one page, one log" is the novel part; dependency diffing itself is not. |
| Can I run it / is it clear (fallback) | 3 | 5 | Was prose-first with no numbers or prior-work statement; now: evidence table, judge path, diagram, 3-command quickstart, checklist. |

Three cheapest point-gains applied: (1) README judge path + evidence table + diagram, (2) prior-work vs. window-work section (rule compliance), (3) Limitations section and `.env.example`/Makefile so the "can I run it" question is answered in one screen.
