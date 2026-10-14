-- Participant access control:
--   • approved column on people (false = pending coach approval)
--   • request_access()     — creates a pending people record for new users
--   • update_my_top5()     — lets participants self-correct their strengths
--   • get_my_reports()     — returns custom reports for the participant's team
--   • approve_participant() — coach approves a pending request

-- ── approved column ────────────────────────────────────────────────────────────
alter table people add column if not exists approved boolean not null default true;

-- ── Refresh get_my_participant_profile to include approved ─────────────────────
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

  select json_build_object(
    'name',             p.name,
    'email',            lower(p.email),
    'top5',             p.top5,
    'team_id',          p.team_id,
    'approved',         p.approved,
    'id',               p.id,
    'is_team_manager',  exists(select 1 from teams t where t.manager_id = p.id and t.id = p.team_id)
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

-- ── request_access ─────────────────────────────────────────────────────────────
-- Called from /me when profile is not_found after sign-in.
-- Creates a pending people record (approved = false) for coach review.
create or replace function request_access(p_name text, p_top5 text[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_id      uuid;
begin
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return json_build_object('error', 'not_authenticated');
  end if;

  -- Idempotent: return existing record if already requested
  select id into v_id from people where lower(email) = lower(v_email) limit 1;
  if v_id is not null then
    return json_build_object('status', 'exists', 'id', v_id);
  end if;

  insert into people (name, email, top5, approved)
  values (p_name, lower(v_email), p_top5, false)
  returning id into v_id;

  return json_build_object('status', 'pending', 'id', v_id);
end;
$$;

grant execute on function request_access(text, text[]) to authenticated;

-- ── update_my_top5 ─────────────────────────────────────────────────────────────
create or replace function update_my_top5(p_top5 text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
begin
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then return; end if;

  update people
     set top5 = p_top5
   where lower(email) = lower(v_email);
end;
$$;

grant execute on function update_my_top5(text[]) to authenticated;

-- ── get_my_reports ─────────────────────────────────────────────────────────────
-- Returns custom reports created by the coach of the participant's team.
create or replace function get_my_reports()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_team_id uuid;
  v_result  json;
begin
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then return '[]'::json; end if;

  select team_id into v_team_id
  from people
  where lower(email) = lower(v_email)
  limit 1;

  if v_team_id is null then return '[]'::json; end if;

  select coalesce(
    json_agg(json_build_object('id', r.id, 'name', r.name) order by r.name),
    '[]'::json
  )
  into v_result
  from reports r
  where r.created_by = (select created_by from teams where id = v_team_id);

  return v_result;
end;
$$;

grant execute on function get_my_reports() to authenticated;

-- ── approve_participant ────────────────────────────────────────────────────────
-- Coaches call this to approve a pending participant.
-- Only succeeds if the caller created a team the person belongs to,
-- or the person has no team yet (they just requested access).
create or replace function approve_participant(p_people_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid := auth.uid();
begin
  update people
     set approved = true
   where id = p_people_id
     and (
       team_id in (select id from teams where created_by = v_coach_id)
       or team_id is null
     );
end;
$$;

grant execute on function approve_participant(uuid) to authenticated;

-- ── get_pending_requests ───────────────────────────────────────────────────────
-- Returns pending (unapproved) people records visible to the calling coach.
-- Returns all unapproved people with no team (anyone can approve them) plus
-- unapproved people on teams the coach owns.
create or replace function get_pending_requests()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid := auth.uid();
  v_result   json;
begin
  select coalesce(
    json_agg(json_build_object(
      'id',    p.id,
      'name',  p.name,
      'email', p.email,
      'top5',  p.top5,
      'created_at', p.created_at
    ) order by p.created_at desc),
    '[]'::json
  )
  into v_result
  from people p
  where p.approved = false
    and (
      p.team_id is null
      or p.team_id in (select id from teams where created_by = v_coach_id)
    );

  return v_result;
end;
$$;

grant execute on function get_pending_requests() to authenticated;
