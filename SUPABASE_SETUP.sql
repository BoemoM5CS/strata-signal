-- ============================================================
-- STRATA SIGNAL — Supabase Setup SQL
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  email text not null default '',
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. MESSAGES TABLE
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 3. INDEXES for fast message queries
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_receiver_idx on public.messages(receiver_id);
create index if not exists messages_created_idx on public.messages(created_at);

-- 4. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- Drop existing policies if any
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

-- Profiles: anyone logged in can read all profiles (so you can see other users)
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Profiles: users can only insert/update their own profile
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Messages: users can read messages they sent or received
create policy "messages_select" on public.messages
  for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

-- Messages: users can only send messages as themselves
create policy "messages_insert" on public.messages
  for insert with check (auth.uid() = sender_id);

-- 5. REALTIME — enable for messages table
alter publication supabase_realtime add table public.messages;

-- 6. AUTO-CREATE PROFILE on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Done! Your Strata Signal database is ready.
