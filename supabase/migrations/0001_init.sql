-- AgentWire schema (applied to Supabase project bhhexzbupdksufmbcuab on 2026-09-01)
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table sources (id text primary key, name text not null, kind text not null check (kind in ('mcp_server','model_api','spec')), repo_url text, meta jsonb default '{}'::jsonb, active boolean default true);
create table watches (id serial primary key, source_id text references sources(id) on delete cascade, url text unique not null, format text not null, note text, active boolean default true);
create table snapshots (watch_id int primary key references watches(id) on delete cascade, fetched_at timestamptz not null default now(), http_status int, sha256 text, content text, normalized text);
create table diffs (id bigserial primary key, detected_at timestamptz not null default now(), source_id text references sources(id) on delete cascade, watch_id int references watches(id) on delete cascade, url text not null, category text not null, severity text not null default 'info', summary text not null, unified_diff text, added_lines int default 0, removed_lines int default 0);
create index diffs_detected_idx on diffs (detected_at desc);
create index diffs_source_idx on diffs (source_id, detected_at desc);
create table runs (id bigserial primary key, started_at timestamptz default now(), finished_at timestamptz, watches_total int, fetched_ok int, changed int, errors jsonb default '[]'::jsonb);
create table dependency_lists (id bigserial primary key, created_at timestamptz default now(), email text not null, deps text[] not null, workflow text, notes text, source text default 'site', user_agent text);
create table app_secrets (key text primary key, value text not null);
create table site_config (key text primary key, value text not null);

alter table sources enable row level security; alter table watches enable row level security; alter table snapshots enable row level security;
alter table diffs enable row level security; alter table runs enable row level security; alter table dependency_lists enable row level security;
alter table app_secrets enable row level security; alter table site_config enable row level security;

create policy "public read sources" on sources for select to anon, authenticated using (true);
create policy "public read watches" on watches for select to anon, authenticated using (true);
create policy "public read diffs" on diffs for select to anon, authenticated using (true);
create policy "public read runs" on runs for select to anon, authenticated using (true);
create policy "public read site_config" on site_config for select to anon, authenticated using (true);
create policy "public insert dependency lists" on dependency_lists for insert to anon, authenticated
  with check (char_length(email) between 5 and 200 and array_length(deps,1) between 1 and 100);
-- snapshots + app_secrets: service role only.

-- daily engine run (token lives in app_secrets.run_token)
select cron.schedule('agentwire-daily', '0 11 * * *', $$
  select net.http_get(url := 'https://bhhexzbupdksufmbcuab.supabase.co/functions/v1/run',
    headers := jsonb_build_object('x-run-token', (select value from app_secrets where key='run_token')),
    timeout_milliseconds := 300000);
$$);
