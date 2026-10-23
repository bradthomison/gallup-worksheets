-- Marks which signed-in accounts are coaches.
-- Participants sign in by emailed link and also get an auth account, so being signed in
-- is not enough to prove someone is a coach. The coach pages check is_coach() instead.
-- (No policies on the table: it is only read through the security-definer function below.)

create table if not exists public.coaches (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.coaches enable row level security;

-- Current coaches. (brad.thomison@gmail.com is deliberately not a coach: it is the test participant account.)
insert into public.coaches (user_id)
select id from auth.users
where lower(email) in ('bthomison@kumc.edu', 'tmorrow@kumc.edu', 'jgrayson@kumc.edu')
on conflict do nothing;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.coaches where user_id = auth.uid())
$$;

revoke all on function public.is_coach() from public, anon;
grant execute on function public.is_coach() to authenticated;
