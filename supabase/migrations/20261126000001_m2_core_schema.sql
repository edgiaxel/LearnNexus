-- LearnNexus M2 Core Schema, Triggers, Helper Functions, and RLS Policies
-- Matches src/types/database.ts and UI_CONTRACT.md (ADR-013)

-- 1. Core tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'student' check (role in ('student', 'team_lead', 'guest_demo')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  semester text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'lecturer')),
  primary key (class_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'team_lead')),
  primary key (team_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  title text not null,
  description text not null,
  objectives jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assignee_id uuid references public.profiles(id) on delete set null,
  assignee_name text,
  due_at timestamptz,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  url text not null,
  resource_type text not null default 'general' check (resource_type in ('docs', 'design', 'tools', 'general')),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_layouts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  layout_key text not null,
  config_json jsonb not null default '{}'::jsonb
);

-- 2. Indexes for RLS and ordered lookups
create index if not exists idx_class_members_user_id on public.class_members (user_id);
create index if not exists idx_teams_class_id on public.teams (class_id);
create index if not exists idx_team_members_user_id on public.team_members (user_id);
create index if not exists idx_tasks_project_sort on public.tasks (project_id, sort_order asc, updated_at desc);
create index if not exists idx_resources_project_created on public.resources (project_id, created_at asc);

-- 3. Trigger functions and triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_raw_role text;
  v_role text;
  v_raw_is_demo text;
  v_is_demo boolean;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Student'
  );

  v_raw_role := new.raw_user_meta_data ->> 'role';
  v_role := case
    when v_raw_role in ('student', 'team_lead', 'guest_demo') then v_raw_role
    else 'student'
  end;

  v_raw_is_demo := lower(trim(coalesce(new.raw_user_meta_data ->> 'is_demo', '')));
  v_is_demo := v_raw_is_demo in ('true', 't', '1', 'yes');

  insert into public.profiles (id, display_name, role, is_demo)
  values (new.id, v_display_name, v_role, v_is_demo)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 4. Security-definer membership and access helpers
create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members cm
    where cm.class_id = p_class_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.team_members tm on tm.team_id = p.team_id
    where p.id = p_project_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.shares_team_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm_self
    join public.team_members tm_other on tm_other.team_id = tm_self.team_id
    where tm_self.user_id = auth.uid()
      and tm_other.user_id = p_profile_id
  );
$$;

revoke all on function public.set_updated_at() from public, anon;
grant execute on function public.set_updated_at() to authenticated, service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.is_class_member(uuid) from public, anon;
grant execute on function public.is_class_member(uuid) to authenticated;

revoke all on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

revoke all on function public.can_access_project(uuid) from public, anon;
grant execute on function public.can_access_project(uuid) to authenticated;

revoke all on function public.shares_team_with(uuid) from public, anon;
grant execute on function public.shares_team_with(uuid) to authenticated;

-- 5. Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.resources enable row level security;
alter table public.workspace_layouts enable row level security;

-- 6. Lock down table privileges and grant minimum required access
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to authenticated;
grant select on
  public.profiles,
  public.classes,
  public.class_members,
  public.teams,
  public.team_members,
  public.projects,
  public.tasks,
  public.resources,
  public.workspace_layouts
to authenticated;
grant update (status) on public.tasks to authenticated;

-- 7. RLS policies for authenticated users only (zero policies for anon)
drop policy if exists profiles_select_own_or_teammate on public.profiles;
create policy profiles_select_own_or_teammate
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.shares_team_with(id));

drop policy if exists classes_select_member on public.classes;
create policy classes_select_member
  on public.classes
  for select
  to authenticated
  using (public.is_class_member(id));

drop policy if exists class_members_select_own on public.class_members;
create policy class_members_select_own
  on public.class_members
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member
  on public.teams
  for select
  to authenticated
  using (public.is_team_member(id));

drop policy if exists team_members_select_teammate on public.team_members;
create policy team_members_select_teammate
  on public.team_members
  for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists projects_select_team_member on public.projects;
create policy projects_select_team_member
  on public.projects
  for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists tasks_select_project_member on public.tasks;
create policy tasks_select_project_member
  on public.tasks
  for select
  to authenticated
  using (public.can_access_project(project_id));

drop policy if exists tasks_update_status_project_member on public.tasks;
create policy tasks_update_status_project_member
  on public.tasks
  for update
  to authenticated
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists resources_select_project_member on public.resources;
create policy resources_select_project_member
  on public.resources
  for select
  to authenticated
  using (public.can_access_project(project_id));

drop policy if exists workspace_layouts_select_team_member on public.workspace_layouts;
create policy workspace_layouts_select_team_member
  on public.workspace_layouts
  for select
  to authenticated
  using (public.is_team_member(team_id));
