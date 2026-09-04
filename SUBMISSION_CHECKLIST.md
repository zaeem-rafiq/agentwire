# Submission checklist — The WebMCP Challenge

Updated 2026-09-04 ~00:21 PDT. Deadline on the Devpost page: **Sep 4 2026 @ 1:00 AM PDT**. Status: PASS / PARTIAL / FAIL / NEEDS-HUMAN with the proof path.

## A. Disqualifiers

| Item | Status | Proof |
|---|---|---|
| Contest name, deadline, criteria, deliverables, eligibility recorded | PASS | `docs/CONTEST.md`, `evidence/devpost_home.txt`, `evidence/devpost_rules.txt` |
| WebMCP actually used: 6 tools registered on `document.modelContext`, invoked by Chrome | PASS | `evidence/smoke_live_2026-09-03_final.txt`: 6/6 tools registered; all five read tools plus structured-error cases invoked through Chrome, exit 0. The write tool remained uninvoked. |
| Work created inside the submission window (Aug 25 – deadline) | PASS | `evidence/git_history.txt` (first commit 2026-09-02 10:38 CDT); prior-work section in `README.md` and `SUBMISSION.md` |
| Backend start date confirmed ≥ Aug 25 (rule for pre-existing projects) | PASS | Supabase project `created_at` 2026-09-01T22:36Z (management API); earliest snapshot 2026-09-01 22:53 UTC, earliest run 23:03 UTC (read-only SQL) |
| Public repository uses default branch `main`; all current local work committed and pushed | PARTIAL | GitHub API previously verified `default_branch: main`. The local checkout currently contains uncommitted finalist-video, documentation and site changes, so it is not clean and not every local change is on public `main`. |
| Repo public, MIT license detected by GitHub and visible at the top | PASS | GitHub API: `private: false`, `license.spdx_id: MIT`; `LICENSE` |
| No secrets in history; `.gitignore` covers `.env*`, `.firebase/`, `supabase/.temp/` | PASS | history grep for key patterns: 0 hits; env files ever committed: none. The `sb_publishable_…` key in `site/index.html` is the intended anon key, scoped by RLS (`supabase/migrations/0001_init.sql`) |
| `.env.example`, `LICENSE`, one-command install path | PASS | `.env.example`, `LICENSE`, `Makefile` (`make smoke`); no install step exists because there are no dependencies |
| Clean-clone proof | PASS | `evidence/clean_clone_run.txt`: historical four-tool fresh clone and production runs, `python3 -m http.server` plus `node scripts/webmcp-smoke.mjs`, exit 0. Current six-tool production proof is `evidence/smoke_live_2026-09-03_final.txt`. |
| Live URL reachable and registers the tools in Chrome 149+ with WebMCP | PASS | https://agentwire.web.app loaded successfully; the current production smoke in `evidence/smoke_live_2026-09-03_final.txt` registered 6/6 tools and exited 0. |
| Live URL works in ChatGPT's in-app browser | NEEDS-HUMAN | Not directly verified in ChatGPT's browser. Current production proof in Chrome registers six tools; open the live site in ChatGPT once and confirm *Site tools* lists all six. |
| Demo video < 3 min | PASS | Approved finalist MP4 duration is exactly 170.147 s by `ffprobe`; SHA-256 `3f942183eed221012ac781e369758754446c664d91009d5cc4dce101dec0e280`. |
| Demo video has audio narration | PASS | Technical QA passed for the exact finalist candidate, and the user explicitly approved that hash's visuals, story and audio. |
| Demo video publicly posted | PASS | Public finalist: https://youtu.be/z_lRFhLq9eQ. The public player was loaded and the Devpost public page embeds this video. |
| Text description covers WebMCP fit, UX, human+agent collaboration, implementation | PASS | `SUBMISSION.md` §1 (now also Prior work and Limitations) |
| Devpost form submitted with current links | PASS | The owner editor saved and reloaded with video https://youtu.be/z_lRFhLq9eQ; the public page https://devpost.com/software/agentwire embeds it. Owner state remains `SUBMITTED`, `5/5 steps`; the live site and repository links remain unchanged. |
| Evidence pack with real data, summary table and chart | PASS | `evidence/SUMMARY.md`, `evidence/backend_*.json`, `evidence/changes_chart.png` |
| Open blockers that crash the demo path | PASS (none) | smoke runs exit 0; the one optional cleanup (test row `webmcp-test@example.com` in `dependency_lists`) does not affect the demo |

## B. Costs points

| Item | Status | Proof |
|---|---|---|
| README opens with one-liner, evidence table, chart, architecture diagram, quickstart, safety section, links | PASS | `README.md` top; Mermaid parsed with mermaid@11 (headless check) |
| Limitations stated plainly | PASS | `SUBMISSION.md` → Limitations |
| Finalist demo strategy and timeline | PASS | `docs/DEMO_SCRIPT.md` records the public 2:50 cut and its ten-part timeline; the exact MP4 was verified by duration and SHA-256 above. |
| Paste-ready form fields | PASS | `docs/SUBMISSION.md` |
| Social copy | PASS (optional to post) | `docs/SOCIAL.md` |
| Origin-trial token so judges need no flag on Chrome 149+ | PASS | registered and deployed 2026-09-03 (commit `ba96f6d`); `<meta http-equiv="origin-trial">` present on https://agentwire.web.app |

## C. Polish status

| Item | Status | Note |
|---|---|---|
| Outcome-first video opening | PASS | The approved finalist establishes the six-tool surface and 48-source / 119-URL coverage in its first 19 seconds, then starts the live config audit. |
| ChatGPT-browser screenshot in README | open | needs that browser |
| Delete `site/vercel.json` leftover | open | harmless; feature freeze |

## Judge simulation (criteria from `docs/CONTEST.md`; 1–5)

| Criterion | Before this pass | After | One line |
|---|---|---|---|
| WebMCP Leverage | 4 | 4 | Six schema'd tools with annotations, UI mirroring and a live call log; all five reads are exercised in the finalist while the sole write remains consent-gated. Origin-trial proof is present; ChatGPT-browser proof remains open. |
| Execution | 4 | 4 | Live site, real daily data, browser-driven smoke test; alerts are stored, not yet sent (now stated in Limitations). |
| Potential Impact | 3 | 3 | Real problem for agent builders; evidence is 25 changes over 3 runs, no users yet. The evidence table makes the claim checkable but not larger. |
| Creativity & Ambition | 4 | 4 | "Agent and person on one page, one log" is the novel part; dependency diffing itself is not. |
| Can I run it / is it clear (fallback) | 3 | 5 | Was prose-first with no numbers or prior-work statement; now: evidence table, judge path, diagram, 3-command quickstart, checklist. |

Three cheapest point-gains applied: (1) README judge path + evidence table + diagram, (2) prior-work vs. window-work section (rule compliance), (3) Limitations section and `.env.example`/Makefile so the "can I run it" question is answered in one screen.
