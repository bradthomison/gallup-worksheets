-- Persistent cell storage for evergreen worksheets (Talent Map, Power of 2, Power of Me).
-- Keyed by email for now; migrating to user_id is a single column swap once participant
-- accounts exist. variant='' for worksheets that have no variants (Talent Map, Power of Me).

create table if not exists evergreen_responses (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null,
  worksheet_type text        not null,
  variant        text        not null default '',
  cells          jsonb       not null default '{}',
  updated_at     timestamptz not null default now()
);

create unique index if not exists evergreen_responses_unique
  on evergreen_responses (lower(email), worksheet_type, variant);

alter table evergreen_responses enable row level security;

-- Block all direct client access; only security-definer functions below may read/write.
create policy "no direct access" on evergreen_responses
  for all using (false);

-- ── Read ─────────────────────────────────────────────────────────────────────

create or replace function get_evergreen_responses(
  p_email          text,
  p_worksheet_type text,
  p_variant        text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cells jsonb;
begin
  select cells into v_cells
  from evergreen_responses
  where lower(email)    = lower(p_email)
    and worksheet_type  = p_worksheet_type
    and variant         = coalesce(p_variant, '');
  return coalesce(v_cells, '{}'::jsonb);
end;
$$;

-- ── Write ────────────────────────────────────────────────────────────────────

create or replace function save_evergreen_responses(
  p_email          text,
  p_worksheet_type text,
  p_variant        text,
  p_cells          jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into evergreen_responses (email, worksheet_type, variant, cells, updated_at)
  values (lower(p_email), p_worksheet_type, coalesce(p_variant, ''), p_cells, now())
  on conflict (lower(email), worksheet_type, variant)
  do update set cells = excluded.cells, updated_at = now();
end;
$$;

grant execute on function get_evergreen_responses(text, text, text) to anon, authenticated;
grant execute on function save_evergreen_responses(text, text, text, jsonb) to anon, authenticated;
