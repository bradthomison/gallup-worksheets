-- Acorn (LMS) worksheets for people who are not signed in.
-- The worksheet page used to read the people / prompt_themes tables directly, which only works for a
-- signed-in coach. These functions work from the worksheet's private link (slug) and return only what
-- the page needs, so signed-out trainees can open, save and submit their worksheet.

create or replace function public.get_lms_worksheet(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v json;
begin
  select json_build_object(
    'worksheet_id', w.id,
    'participant',  json_build_object('name', p.name, 'top5', p.top5),
    'theme',        json_build_object('name', t.name, 'prompts', t.prompts),
    'responses',    coalesce((
      select json_agg(json_build_object(
        'prompt_index', r.prompt_index,
        'strength_index', r.strength_index,
        'response_text', r.response_text,
        'submitted_at', r.submitted_at))
      from lms_responses r where r.lms_worksheet_id = w.id), '[]'::json)
  )
  into v
  from lms_worksheets w
  join people p on p.id = w.people_id
  join prompt_themes t on t.id = w.theme_id
  where w.worksheet_url_slug = p_slug;

  if v is null then return json_build_object('error', 'not_found'); end if;
  return v;
end;
$$;

create or replace function public.save_lms_responses(p_slug text, p_rows jsonb, p_submit boolean default false)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_submitted timestamptz := case when p_submit then now() else null end;
begin
  select id into v_id from lms_worksheets where worksheet_url_slug = p_slug;
  if v_id is null then return json_build_object('error', 'not_found'); end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 100 then
    return json_build_object('error', 'invalid');
  end if;

  insert into lms_responses (lms_worksheet_id, prompt_index, strength_index, response_text, submitted_at)
  select v_id,
         (x->>'prompt_index')::int,
         (x->>'strength_index')::int,
         left(coalesce(x->>'response_text', ''), 5000),
         v_submitted
  from jsonb_array_elements(p_rows) x
  on conflict (lms_worksheet_id, prompt_index, strength_index)
  do update set response_text = excluded.response_text, submitted_at = excluded.submitted_at;

  return json_build_object('ok', true);
end;
$$;

create or replace function public.reopen_lms_worksheet(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update lms_responses
     set submitted_at = null
   where lms_worksheet_id = (select id from lms_worksheets where worksheet_url_slug = p_slug);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.get_lms_worksheet(text) from public;
revoke all on function public.save_lms_responses(text, jsonb, boolean) from public;
revoke all on function public.reopen_lms_worksheet(text) from public;
grant execute on function public.get_lms_worksheet(text) to anon, authenticated;
grant execute on function public.save_lms_responses(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.reopen_lms_worksheet(text) to anon, authenticated;
