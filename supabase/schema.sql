-- Hunt.QR — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query) once,
-- on a fresh project. It creates the tables, security policies, the trigger
-- that gives every new auth user a profile row, and enables realtime on teams.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  event_name  text not null,
  event_date  date,
  status      text not null default 'active' check (status in ('active', 'archived')),
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id                 uuid primary key default gen_random_uuid(),
  team_name          text not null,
  join_code          text not null unique,
  current_clue_level integer not null default 1,
  event_id           uuid references public.events(id) on delete cascade,
  member_ids         text[] not null default '{}',
  member_names       text[] not null default '{}',
  collected_letters  text[] not null default '{}',
  completed          boolean not null default false,
  completed_at       timestamptz,
  last_solved_by     text,
  created_at         timestamptz not null default now()
);

create table if not exists public.clues (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  clue_number    integer not null,
  riddle_text    text not null,
  correct_answer text not null,
  reward_letter  text not null,
  hint           text,
  created_at     timestamptz not null default now()
);

-- Tracks how many guesses a team has made (and is allowed) on each clue.
-- Admins can raise attempts_allowed to grant a team extra tries on a clue.
create table if not exists public.clue_attempts (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references public.teams(id) on delete cascade,
  clue_id          uuid not null references public.clues(id) on delete cascade,
  attempts_used    integer not null default 0,
  attempts_allowed integer not null default 5,
  created_at       timestamptz not null default now(),
  unique (team_id, clue_id)
);

-- One row per solved clue, attributed to the member who answered it.
-- Powers the per-team leaderboard (riddles solved per member).
create table if not exists public.clue_solves (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  clue_id        uuid not null references public.clues(id) on delete cascade,
  solved_by_id   uuid,
  solved_by_name text,
  created_at     timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  screen_name text,
  role       text not null default 'player' check (role in ('player', 'admin')),
  team_id    uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_screen_name_unique
  on public.profiles (lower(screen_name))
  where screen_name is not null;

-- ---------------------------------------------------------------------------
-- New auth user -> profile row
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, screen_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'screen_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by admin-only policies. SECURITY DEFINER so it can read
-- profiles regardless of the caller's row-level permissions.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events        enable row level security;
alter table public.teams         enable row level security;
alter table public.clues         enable row level security;
alter table public.clue_attempts enable row level security;
alter table public.clue_solves   enable row level security;
alter table public.profiles      enable row level security;

-- profiles: a user sees and edits only their own row (admins can read all).
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- events: everyone signed in can read; only admins write.
create policy "events_select" on public.events
  for select to authenticated using (true);
create policy "events_write" on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- clues: everyone signed in can read; only admins write.
create policy "clues_select" on public.clues
  for select to authenticated using (true);
create policy "clues_write" on public.clues
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- teams: players read/create/update teams (join, leave, advance progress).
create policy "teams_select" on public.teams
  for select to authenticated using (true);
create policy "teams_insert" on public.teams
  for insert to authenticated with check (true);
create policy "teams_update" on public.teams
  for update to authenticated using (true) with check (true);
create policy "teams_delete" on public.teams
  for delete to authenticated using (public.is_admin());

-- clue_attempts: players read/create/update their attempt counters; admins too
-- (admins raise attempts_allowed to grant extra tries).
create policy "clue_attempts_select" on public.clue_attempts
  for select to authenticated using (true);
create policy "clue_attempts_insert" on public.clue_attempts
  for insert to authenticated with check (true);
create policy "clue_attempts_update" on public.clue_attempts
  for update to authenticated using (true) with check (true);

-- clue_solves: anyone signed in can read (leaderboard) and add their own solves.
create policy "clue_solves_select" on public.clue_solves
  for select to authenticated using (true);
create policy "clue_solves_insert" on public.clue_solves
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Realtime (powers the live "TEAMS (LIVE)" panel in the admin dashboard)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.teams;

-- ---------------------------------------------------------------------------
-- Make yourself an admin (run after you sign up):
--   update public.profiles set role = 'admin' where screen_name = 'your-screen-name';
-- ---------------------------------------------------------------------------
