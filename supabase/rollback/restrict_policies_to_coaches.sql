-- Puts the policies back exactly as they were before restrict_policies_to_coaches.sql.
begin;

drop policy if exists "coaches_select" on public.people;
drop policy if exists "coaches_insert" on public.people;
drop policy if exists "coaches_update" on public.people;
drop policy if exists "coaches_delete" on public.people;
create policy "coaches_select" on public.people for select to authenticated using (true);
create policy "coaches_insert" on public.people for insert to authenticated with check (true);
create policy "coaches_update" on public.people for update to authenticated using (true) with check (true);
create policy "coaches_delete" on public.people for delete to authenticated using (true);

drop policy if exists "coaches_all" on public.teams;
create policy "coaches_all" on public.teams for all to authenticated using (true) with check (true);

drop policy if exists "sessions_read_authenticated" on public.sessions;
drop policy if exists "coaches_all" on public.sessions;
create policy "coaches_all" on public.sessions for all to authenticated using (true) with check (true);

drop policy if exists "reports_read_authenticated" on public.reports;
drop policy if exists "reports_coach_write" on public.reports;
create policy "reports_open" on public.reports for all to authenticated using (true) with check (true);

drop policy if exists "coach write" on public.report_content;
create policy "auth write" on public.report_content for all to authenticated using (true) with check (true);

drop policy if exists "prompt_themes_read_authenticated" on public.prompt_themes;
drop policy if exists "prompt_themes_coach_write" on public.prompt_themes;
create policy "coaches_all_themes" on public.prompt_themes for all to public
  using (auth.role() = 'authenticated'::text) with check (auth.role() = 'authenticated'::text);

commit;
