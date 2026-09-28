-- Run this in the Supabase SQL Editor to create the team portal RPC.
-- Returns team info, members, and the coach's custom reports — no auth required.

create or replace function get_team_portal(p_team_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team      record;
  v_members   json;
  v_reports   json;
begin
  select id, name into v_team
  from teams
  where id = p_team_id;

  if not found then
    return json_build_object('error', 'not_found');
  end if;

  select json_agg(json_build_object('id', p.id, 'name', p.name, 'email', p.email, 'top5', p.top5) order by p.name)
  into v_members
  from people p
  where p.team_id = p_team_id;

  select json_agg(json_build_object('id', r.id, 'name', r.name) order by r.name)
  into v_reports
  from reports r
  where r.created_by = (select created_by from teams where id = p_team_id);

  return json_build_object(
    'team',    json_build_object('id', v_team.id, 'name', v_team.name),
    'members', coalesce(v_members, '[]'::json),
    'reports', coalesce(v_reports, '[]'::json)
  );
end;
$$;

grant execute on function get_team_portal(uuid) to anon, authenticated;
