-- Run this in the Supabase SQL Editor

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  created_at timestamptz default now()
);

-- Folders: users can group projects into named folders
create table if not exists folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  -- type is now free text so users can type anything (e.g. "Marathon Training")
  type text not null,
  status text not null default 'active' check (status in ('active', 'stalled', 'upcoming', 'completed')),
  description text,
  keyword text,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now()
);

-- Links: arbitrary URLs attached to a project (Notion, Google Docs, etc.)
create table if not exists project_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  url text not null,
  label text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table folders enable row level security;
alter table projects enable row level security;
alter table notes enable row level security;
alter table project_links enable row level security;

create policy "Users can manage their own profile"
  on profiles for all using (auth.uid() = id);

create policy "Users can manage their own folders"
  on folders for all using (auth.uid() = user_id);

create policy "Users can manage their own projects"
  on projects for all using (auth.uid() = user_id);

create policy "Users can manage their own notes"
  on notes for all using (auth.uid() = user_id);

create policy "Users can manage their own links"
  on project_links for all using (auth.uid() = user_id);

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Migration: run these if upgrading an existing database ──────────────────

-- 1. Create folders table
-- (already defined above; skip if running fresh)

-- 2. Add folder_id to projects
alter table projects add column if not exists folder_id uuid references folders(id) on delete set null;

-- 3. Drop the old type check constraint so users can enter free text
alter table projects drop constraint if exists projects_type_check;

-- 4. Create project_links table
-- (already defined above; skip if running fresh)
