-- Returns worksheets assigned to a person (by email) from non-future sessions.
-- Used by the public team portal page; security definer bypasses RLS.

create or replace function get_portal_worksheets(p_email text, p_team_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  -- Resolve the coach who owns this team (to scope sessions correctly)
  select created_by into v_coach_id
  from teams
  where id = p_team_id;

  if not found then
    return '[]'::json;
  end if;

  return (
    select coalesce(json_agg(row order by row.session_date desc nulls last, row.session_title), '[]'::json)
    from (
      select
        p.id                                                            as participant_id,
        p.worksheet_url_slug                                            as slug,
        s.title                                                         as session_title,
        s.date                                                          as session_date,
        (
          select count(*)::int
          from responses r
          where r.participant_id = p.id
        )                                                               as response_count,
        (
          select max(r.submitted_at)
          from responses r
          where r.participant_id = p.id
        )                                                               as submitted_at
      from participants p
      join sessions s on s.id = p.session_id
      where lower(p.email) = lower(p_email)
        and s.created_by = v_coach_id
        and (s.date is null or s.date <= current_date)
    ) row
  );
end;
$$;

grant execute on function get_portal_worksheets(text, uuid) to anon, authenticated;
