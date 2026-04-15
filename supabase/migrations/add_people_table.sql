-- Run this in the Supabase SQL Editor to add the people (address book) table.

create table if not exists people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  top5        text[] not null default '{}',
  created_by  uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (email, created_by)
);

alter table people enable row level security;

create policy "coaches_all_people" on people
  for all using (auth.uid() = created_by);
