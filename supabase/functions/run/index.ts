// AgentWire diff engine — Supabase Edge Function
// Fetches every active watch URL, normalizes it, compares to the stored snapshot,
// and writes structured diff rows. Auth: x-run-token header must match app_secrets.run_token.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const UA = "AgentWire/0.1 (+https://agentwire.dev; change monitor for agent dependencies)";
const MAX_BYTES = 4_000_000;
const MAX_STORE = 250_000;
const MAX_DIFF_LINES = 200;

type Watch = { id: number; source_id: string; url: string; format: string; note: string | null };
type Snap = { watch_id: number; sha256: string | null; normalized: string | null };

function sortedJson(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val).sort().reduce((o: Record<string, unknown>, k) => { o[k] = val[k]; return o; }, {});
    }
    return val;
  }, 1);
}

function stripHtml(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/(p|h[1-6]|li|tr|div|section|article|pre|code|td|th)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

function normalize(w: Watch, body: string): string {
  const u = w.url;
  try {
    if (u.startsWith("https://registry.npmjs.org/")) {
      const j = JSON.parse(body);
      const latest = j["dist-tags"]?.latest;
      const lv = j.versions?.[latest] ?? {};
      return sortedJson({
        name: j.name,
        dist_tags: j["dist-tags"],
        latest_version: latest,
        latest_deprecated: lv.deprecated ?? null,
        latest_dependencies: lv.dependencies ?? {},
        latest_peer: lv.peerDependencies ?? {},
        latest_engines: lv.engines ?? {},
        versions: Object.keys(j.versions ?? {}).sort(),
        modified: j.modified ?? j.time?.modified,
      });
    }
    if (u.startsWith("https://pypi.org/pypi/")) {
      const j = JSON.parse(body);
      return sortedJson({
        name: j.info?.name,
        version: j.info?.version,
        requires_python: j.info?.requires_python,
        requires_dist: j.info?.requires_dist ?? [],
        yanked: j.info?.yanked ?? false,
        releases: Object.keys(j.releases ?? {}).sort(),
      });
    }
    if (u.startsWith("https://registry.modelcontextprotocol.io/v0/servers")) {
      const j = JSON.parse(body);
      const list = (j.servers ?? j.data ?? []).map((s: any) => {
        const srv = s.server ?? s;
        return `${srv.name} @ ${srv.version ?? "?"}`;
      }).sort();
      return list.join("\n");
    }
    if (w.format === "json") return sortedJson(JSON.parse(body));
    if (w.format === "html") return stripHtml(body);
  } catch (_e) {
    // fall through to raw
  }
  return body.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").slice(0, MAX_STORE);
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Multiset line diff: cheap and good enough for change summaries.
function lineDiff(oldS: string, newS: string) {
  const count = (arr: string[]) => { const m = new Map<string, number>(); for (const l of arr) m.set(l, (m.get(l) ?? 0) + 1); return m; };
  const o = count(oldS.split("\n")), n = count(newS.split("\n"));
  const added: string[] = [], removed: string[] = [];
  for (const [l, c] of n) { const d = c - (o.get(l) ?? 0); for (let i = 0; i < d; i++) added.push(l); }
  for (const [l, c] of o) { const d = c - (n.get(l) ?? 0); for (let i = 0; i < d; i++) removed.push(l); }
  return { added: added.filter((l) => l.trim()), removed: removed.filter((l) => l.trim()) };
}

function semverParts(v: string) { const m = v.match(/(\d+)\.(\d+)\.(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; }
function bumpKind(a: string, b: string) {
  const x = semverParts(a), y = semverParts(b); if (!x || !y) return "unknown";
  if (x[0] !== y[0]) return "major"; if (x[1] !== y[1]) return "minor"; return "patch";
}

const BREAKING_RE = /breaking|deprecat|removed|remove |renamed|rename |migrat|no longer|dropped|sunset|shut ?down|end of life|incompatible/i;
const TOOL_LINE_RE = /^\s*(?:[-*]\s*`[a-z][a-z0-9_.-]{2,}`|\|\s*`?[a-z][a-z0-9_]{2,}`?\s*\|)/;

function classify(w: Watch, oldN: string, newN: string, added: string[], removed: string[]) {
  const u = w.url.toLowerCase();
  const addedText = added.join("\n");
  const grab = (re: RegExp, s: string) => (s.match(re) ?? [])[1];

  // version bumps from package manifests / registries
  if (u.includes("registry.npmjs.org") || u.endsWith("package.json") || u.includes("pypi.org") || u.endsWith("pyproject.toml")) {
    const re = u.includes("npmjs") ? /"latest_version":\s*"([^"]+)"/ : u.includes("pypi") ? /"version":\s*"([^"]+)"/ : u.endsWith(".toml") ? /^version\s*=\s*"([^"]+)"/m : /"version":\s*"([^"]+)"/;
    const ov = grab(re, oldN), nv = grab(re, newN);
    if (ov && nv && ov !== nv) {
      const kind = bumpKind(ov, nv);
      const sev = kind === "major" ? "breaking" : kind === "minor" ? "notice" : "info";
      const depNote = /"latest_deprecated":\s*"[^"]/.test(newN) && !/"latest_deprecated":\s*"[^"]/.test(oldN) ? " — package marked DEPRECATED" : "";
      return { category: "version_bump", severity: depNote ? "breaking" : sev, summary: `${ov} → ${nv} (${kind})${depNote}` };
    }
    if (/"latest_deprecated":\s*"[^"]/.test(newN) && !/"latest_deprecated":\s*"[^"]/.test(oldN)) {
      return { category: "version_bump", severity: "breaking", summary: "Package marked deprecated on the registry" };
    }
    if (u.includes("npmjs") || u.includes("pypi")) {
      return { category: "version_bump", severity: "info", summary: `Registry metadata changed (+${added.length}/-${removed.length} lines)` };
    }
    return { category: "content", severity: removed.length ? "notice" : "info", summary: `Manifest changed (+${added.length}/-${removed.length} lines)` };
  }

  if (u.includes("deprecat")) {
    return { category: "changelog", severity: added.length ? "breaking" : "info", summary: added.length ? `Deprecations page updated: ${added.find((l) => l.trim().length > 12) ?? added[0]}`.slice(0, 240) : "Deprecations page edited" };
  }

  if (u.includes("changelog") || u.includes("release-notes") || u.includes("releases")) {
    const isHead = (l: string) => /^#{1,4}\s/.test(l) || /^\d{4}-\d{2}-\d{2}/.test(l) || /^v?\d+\.\d+/.test(l.trim());
    const pool = added.length ? added : removed;
    const first = pool.find(isHead) ?? pool.find((l) => l.trim().length > 8) ?? "entries edited";
    const label = added.length ? "New changelog entry" : "Changelog entries removed";
    return { category: "changelog", severity: BREAKING_RE.test(addedText) ? "breaking" : "notice", summary: `${label}: ${first.replace(/^#+\s*/, "")}`.slice(0, 240) };
  }

  if (u.includes("schema") || u.endsWith("openapi.yaml") || u.endsWith(".yaml")) {
    return { category: "schema", severity: removed.length ? "breaking" : "notice", summary: `Schema changed (+${added.length}/-${removed.length} lines)` };
  }

  if (u.includes("readme") || u.includes("tools-and-prompts") || u.includes("docs")) {
    const toolsAdded = added.filter((l) => TOOL_LINE_RE.test(l)), toolsRemoved = removed.filter((l) => TOOL_LINE_RE.test(l));
    if (toolsAdded.length || toolsRemoved.length) {
      const sample = (toolsRemoved[0] ?? toolsAdded[0]).replace(/[`*|]/g, "").trim().slice(0, 80);
      return { category: "tools", severity: toolsRemoved.length ? "breaking" : "notice", summary: `Tool list changed: +${toolsAdded.length}/-${toolsRemoved.length} (e.g. ${sample})` };
    }
    return { category: "content", severity: BREAKING_RE.test(addedText) ? "notice" : "info", summary: `Docs changed (+${added.length}/-${removed.length} lines)` };
  }

  return { category: "content", severity: "info", summary: `Content changed (+${added.length}/-${removed.length} lines)` };
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const u = url.includes("ai.google.dev") ? url + (url.includes("?") ? "&" : "?") + "hl=en" : url;
    const accept = url.startsWith("https://registry.npmjs.org/") ? "application/vnd.npm.install-v1+json" : "*/*";
    const r = await fetch(u, { headers: { "user-agent": UA, "accept": accept, "accept-language": "en-US,en;q=0.9" }, signal: ctrl.signal, redirect: "follow" });
    const body = (await r.text()).slice(0, MAX_BYTES);
    return { status: r.status, body };
  } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  const { data: tok } = await supabase.from("app_secrets").select("value").eq("key", "run_token").single();
  const given = req.headers.get("x-run-token") ?? new URL(req.url).searchParams.get("token");
  if (!tok || given !== tok.value) return new Response("unauthorized", { status: 401 });

  const params = new URL(req.url).searchParams;
  const offset = +(params.get("offset") ?? 0), limit = +(params.get("limit") ?? 500);

  const started = new Date().toISOString();
  const { data: watches, error } = await supabase.from("watches").select("id,source_id,url,format,note").eq("active", true).order("id").range(offset, offset + limit - 1);
  if (error) return new Response(error.message, { status: 500 });
  const ids = (watches as Watch[]).map((w) => w.id);
  const { data: snaps } = await supabase.from("snapshots").select("watch_id,sha256,normalized").in("watch_id", ids);
  const snapMap = new Map<number, Snap>((snaps ?? []).map((s: Snap) => [s.watch_id, s]));

  let ok = 0, changed = 0; const errors: unknown[] = []; const diffRows: unknown[] = []; const snapRows: unknown[] = [];

  const CONC = 8;
  for (let i = 0; i < watches.length; i += CONC) {
    await Promise.all((watches as Watch[]).slice(i, i + CONC).map(async (w) => {
      try {
        const { status, body } = await fetchText(w.url);
        if (status !== 200 || body.length < 20) { errors.push({ url: w.url, status }); return; }
        ok++;
        const norm = normalize(w, body);
        const hash = await sha256(norm);
        const prev = snapMap.get(w.id);
        if (prev?.sha256 && prev.sha256 !== hash && prev.normalized != null) {
          const { added, removed } = lineDiff(prev.normalized, norm);
          if (added.length || removed.length) {
            changed++;
            const c = classify(w, prev.normalized, norm, added, removed);
            const ud = [...removed.slice(0, MAX_DIFF_LINES / 2).map((l) => "- " + l), ...added.slice(0, MAX_DIFF_LINES / 2).map((l) => "+ " + l)].join("\n");
            diffRows.push({ source_id: w.source_id, watch_id: w.id, url: w.url, ...c, unified_diff: ud.slice(0, 20_000), added_lines: added.length, removed_lines: removed.length });
          }
        }
        if (!prev || prev.sha256 !== hash) snapRows.push({ watch_id: w.id, fetched_at: new Date().toISOString(), http_status: status, sha256: hash, content: null, normalized: norm });
      } catch (e) { errors.push({ url: w.url, error: String(e).slice(0, 200) }); }
    }));
  }

  if (snapRows.length) { const { error: e1 } = await supabase.from("snapshots").upsert(snapRows, { onConflict: "watch_id" }); if (e1) errors.push({ upsert: e1.message }); }
  if (diffRows.length) { const { error: e2 } = await supabase.from("diffs").insert(diffRows); if (e2) errors.push({ insert: e2.message }); }
  await supabase.from("runs").insert({ started_at: started, finished_at: new Date().toISOString(), watches_total: watches.length, fetched_ok: ok, changed, errors });

  return new Response(JSON.stringify({ watches: watches.length, fetched_ok: ok, changed, baseline_new: snapRows.length - changed, errors }), { headers: { "content-type": "application/json" } });
});
