-- Participant account support.
-- Adds user_id to participants for future auth-keyed queries (nullable; back-filled on first sign-in).
-- Two security-definer functions let authenticated participant sessions read their own data
-- without touching the coach-side RLS policies.

alter table participants add column if not exists user_id uuid references auth.users(id);
create index if not exists participants_user_id_idx on participants(user_id);

-- ── Link existing participant rows to a new auth user ─────────────────────────
-- Called once from the /me page on first sign-in.  Matches by email, skips rows
-- already linked.  Returns the number of rows updated.

create or replace function link_participant_account()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_count   int;
begin
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then return 0; end if;

  update participants
     set user_id = v_user_id
   where lower(email) = lower(v_email)
     and user_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function link_participant_account() to authenticated;

-- ── Return the participant's own profile ──────────────────────────────────────
-- Uses the most-recently-created participant row for name/top5 (a person may
-- appear in several sessions; their strengths are consistent across rows).
-- Also returns team_id so the dashboard can load assigned session worksheets.

create or replace function get_my_participant_profile()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_result  json;
begin
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return json_build_object('error', 'not_authenticated');
  end if;

  -- Profile data lives in the people table (name, top5, team_id)
  select json_build_object(
    'name',    p.name,
    'email',   lower(p.email),
    'top5',    p.top5,
    'team_id', p.team_id
  )
  into v_result
  from people p
  where lower(p.email) = lower(v_email)
  limit 1;

  if not found then
    return json_build_object('error', 'not_found');
  end if;

  return v_result;
end;
$$;

grant execute on function get_my_participant_profile() to authenticated;
