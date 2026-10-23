-- Participants now sign in, so "any signed-in user" no longer means "a coach".
-- These tables used to allow every authenticated account to read/change everything.
-- Writes (and, for people/teams, reads) now require is_coach(). Reads that participant screens
-- still rely on stay open to signed-in users, matching what signed-out visitors can already read.
--
-- Not changed here (separate pass): the older signed-out access to participants, responses,
-- lms_worksheets and lms_responses.
--
-- Rollback: supabase/rollback/restrict_policies_to_coaches.sql

begin;

-- people: coaches only (participants use the secure functions for their own record)
drop policy if exists "coaches_select" on public.people;
drop policy if exists "coaches_insert" on public.people;
drop policy if exists "coaches_update" on public.people;
drop policy if exists "coaches_delete" on public.people;
create policy "coaches_select" on public.people for select to authenticated using ((select public.is_coach()));
create policy "coaches_insert" on public.people for insert to authenticated with check ((select public.is_coach()));
create policy "coaches_update" on public.people for update to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));
create policy "coaches_delete" on public.people for delete to authenticated using ((select public.is_coach()));

-- teams: coaches only
drop policy if exists "coaches_all" on public.teams;
create policy "coaches_all" on public.teams for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

-- sessions: anyone signed in can read (signed-out visitors already can); only coaches change
drop policy if exists "coaches_all" on public.sessions;
create policy "sessions_read_authenticated" on public.sessions for select to authenticated using (true);
create policy "coaches_all" on public.sessions for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

-- reports (custom report definitions): readable when signed in (the report page needs it); only coaches change
drop policy if exists "reports_open" on public.reports;
create policy "reports_read_authenticated" on public.reports for select to authenticated using (true);
create policy "reports_coach_write" on public.reports for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

-- report_content: reads stay open ("auth read", "public read"); only coaches write
drop policy if exists "auth write" on public.report_content;
create policy "coach write" on public.report_content for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

-- prompt_themes (session topics): readable when signed in; only coaches change
drop policy if exists "coaches_all_themes" on public.prompt_themes;
create policy "prompt_themes_read_authenticated" on public.prompt_themes for select to authenticated using (true);
create policy "prompt_themes_coach_write" on public.prompt_themes for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

commit;
