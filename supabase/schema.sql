-- Run this in the Supabase SQL Editor to create all tables and policies.

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ─── Tables ────────────────────────────────────────────────────────────────

create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  date         date,
  prompts      text[] not null default '{}',
  created_by   uuid references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists participants (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid references sessions(id) on delete cascade,
  name                text not null,
  email               text not null,
  top5                text[] not null default '{}',
  worksheet_url_slug  text not null unique,
  created_at          timestamptz not null default now()
);

create table if not exists responses (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid references participants(id) on delete cascade,
  prompt_index    int not null,
  strength_index  int not null,
  response_text   text not null default '',
  submitted_at    timestamptz,
  unique (participant_id, prompt_index, strength_index)
);

-- ─── Row Level Security ────────────────────────────────────────────────────

alter table sessions     enable row level security;
alter table participants enable row level security;
alter table responses    enable row level security;

-- Coaches can do everything on sessions they created
create policy "coaches_all_sessions" on sessions
  for all using (auth.uid() = created_by);

-- Coaches can read/write participants in their sessions
create policy "coaches_all_participants" on participants
  for all using (
    exists (
      select 1 from sessions s
      where s.id = participants.session_id
        and s.created_by = auth.uid()
    )
  );

-- Coaches can read responses for their sessions
create policy "coaches_read_responses" on responses
  for select using (
    exists (
      select 1 from participants p
      join sessions s on s.id = p.session_id
      where p.id = responses.participant_id
        and s.created_by = auth.uid()
    )
  );

-- Public: anyone with the slug can read participant + session info (no auth needed)
create policy "public_read_participant_by_slug" on participants
  for select using (true);

-- Public: anyone can upsert responses (they need the participant_id which comes from the slug)
create policy "public_upsert_responses" on responses
  for all using (true)
  with check (true);

-- Public: read sessions (needed for worksheet page to show prompts)
create policy "public_read_sessions" on sessions
  for select using (true);
