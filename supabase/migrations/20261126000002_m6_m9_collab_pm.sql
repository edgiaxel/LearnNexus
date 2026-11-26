-- LearnNexus M6 + M9 Collaboration and Project Management Schema, Triggers, RLS, and Realtime
-- Extends M2 schema idempotently without altering 20261126000001_m2_core_schema.sql

-- 1. Expand team-member grants and RLS policies on M2 core tables

-- 1a. projects: allow team members to update overview brief fields only
grant update (title, description, objectives) on public.projects to authenticated;

drop policy if exists projects_update_team_member on public.projects;
create policy projects_update_team_member
  on public.projects
  for update
  to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

-- 1b. tasks: allow project members to insert, update (excluding project_id), and delete
grant insert (project_id, title, description, status, assignee_id, assignee_name, due_at, sort_order),
  update (title, description, status, assignee_id, assignee_name, due_at, sort_order),
  delete on public.tasks to authenticated;

drop policy if exists tasks_update_status_project_member on public.tasks;

drop policy if exists tasks_insert_project_member on public.tasks;
create policy tasks_insert_project_member
  on public.tasks
  for insert
  to authenticated
  with check (public.can_access_project(project_id));

drop policy if exists tasks_update_project_member on public.tasks;
create policy tasks_update_project_member
  on public.tasks
  for update
  to authenticated
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists tasks_delete_project_member on public.tasks;
create policy tasks_delete_project_member
  on public.tasks
  for delete
  to authenticated
  using (public.can_access_project(project_id));

-- 1c. resources: enforce safe HTTP(S) URLs and allow project members to insert, update, delete
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resources_url_http_check'
      and conrelid = 'public.resources'::regclass
  ) then
    alter table public.resources
      add constraint resources_url_http_check check (url ~* '^https?://');
  end if;
end $$;

grant insert (project_id, title, description, url, resource_type),
  update (title, description, url, resource_type),
  delete on public.resources to authenticated;

drop policy if exists resources_insert_project_member on public.resources;
create policy resources_insert_project_member
  on public.resources
  for insert
  to authenticated
  with check (public.can_access_project(project_id));

drop policy if exists resources_update_project_member on public.resources;
create policy resources_update_project_member
  on public.resources
  for update
  to authenticated
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists resources_delete_project_member on public.resources;
create policy resources_delete_project_member
  on public.resources
  for delete
  to authenticated
  using (public.can_access_project(project_id));

-- 2. New collaboration and project management tables

-- 2a. room_messages (persisted studio team chat)
create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_room_messages_team_created
  on public.room_messages (team_id, created_at desc);

alter table public.room_messages enable row level security;

revoke all on public.room_messages from public, anon, authenticated;
grant select, insert (team_id, user_id, display_name, body)
  on public.room_messages to authenticated;

drop policy if exists room_messages_select_team_member on public.room_messages;
create policy room_messages_select_team_member
  on public.room_messages
  for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists room_messages_insert_team_member on public.room_messages;
create policy room_messages_insert_team_member
  on public.room_messages
  for insert
  to authenticated
  with check (public.is_team_member(team_id) and user_id = auth.uid());

-- 2b. whiteboard_notes (pastel sticky notes)
create table if not exists public.whiteboard_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  content text not null check (char_length(trim(content)) between 1 and 400),
  color text not null default 'yellow' check (color in ('yellow', 'sage', 'lavender', 'peach')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whiteboard_notes_project_created
  on public.whiteboard_notes (project_id, created_at desc);

drop trigger if exists trg_whiteboard_notes_updated_at on public.whiteboard_notes;
create trigger trg_whiteboard_notes_updated_at
  before update on public.whiteboard_notes
  for each row
  execute function public.set_updated_at();

alter table public.whiteboard_notes enable row level security;

revoke all on public.whiteboard_notes from public, anon, authenticated;
grant select,
  insert (project_id, author_id, author_name, content, color),
  update (content, color),
  delete on public.whiteboard_notes to authenticated;

drop policy if exists whiteboard_notes_select_project_member on public.whiteboard_notes;
create policy whiteboard_notes_select_project_member
  on public.whiteboard_notes
  for select
  to authenticated
  using (public.can_access_project(project_id));

drop policy if exists whiteboard_notes_insert_project_member on public.whiteboard_notes;
create policy whiteboard_notes_insert_project_member
  on public.whiteboard_notes
  for insert
  to authenticated
  with check (
    public.can_access_project(project_id)
    and (author_id is null or author_id = auth.uid())
  );

drop policy if exists whiteboard_notes_update_project_member on public.whiteboard_notes;
create policy whiteboard_notes_update_project_member
  on public.whiteboard_notes
  for update
  to authenticated
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists whiteboard_notes_delete_project_member on public.whiteboard_notes;
create policy whiteboard_notes_delete_project_member
  on public.whiteboard_notes
  for delete
  to authenticated
  using (public.can_access_project(project_id));

-- 2c. whiteboard_strokes (shared freehand sketch strokes)
create table if not exists public.whiteboard_strokes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  color text not null check (color in ('#30343B', '#4A6B46', '#7C4520', '#8E2F29')),
  width integer not null default 2 check (width in (2, 4)),
  points jsonb not null check (
    jsonb_typeof(points) = 'array'
    and jsonb_array_length(points) between 2 and 500
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_whiteboard_strokes_project_created
  on public.whiteboard_strokes (project_id, created_at asc);

alter table public.whiteboard_strokes enable row level security;

revoke all on public.whiteboard_strokes from public, anon, authenticated;
grant select,
  insert (project_id, author_id, author_name, color, width, points),
  delete on public.whiteboard_strokes to authenticated;

drop policy if exists whiteboard_strokes_select_project_member on public.whiteboard_strokes;
create policy whiteboard_strokes_select_project_member
  on public.whiteboard_strokes
  for select
  to authenticated
  using (public.can_access_project(project_id));

drop policy if exists whiteboard_strokes_insert_project_member on public.whiteboard_strokes;
create policy whiteboard_strokes_insert_project_member
  on public.whiteboard_strokes
  for insert
  to authenticated
  with check (
    public.can_access_project(project_id)
    and (author_id is null or author_id = auth.uid())
  );

drop policy if exists whiteboard_strokes_delete_project_member on public.whiteboard_strokes;
create policy whiteboard_strokes_delete_project_member
  on public.whiteboard_strokes
  for delete
  to authenticated
  using (public.can_access_project(project_id));

-- 2d. activity_logs (read-only audit log written solely by database triggers)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  action text not null,
  entity_type text not null check (entity_type in ('project', 'task', 'resource', 'whiteboard')),
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_project_created
  on public.activity_logs (project_id, created_at desc);

alter table public.activity_logs enable row level security;

revoke all on public.activity_logs from public, anon, authenticated;
grant select on public.activity_logs to authenticated;

drop policy if exists activity_logs_select_project_member on public.activity_logs;
create policy activity_logs_select_project_member
  on public.activity_logs
  for select
  to authenticated
  using (public.can_access_project(project_id));

-- 3. Automatic project activity logging trigger function

create or replace function public.log_project_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid;
  v_actor_id uuid;
  v_actor_name text;
  v_project_id uuid;
  v_action text;
  v_entity_type text;
  v_summary text;
  v_status_label text;
begin
  v_auth_uid := auth.uid();
  if v_auth_uid is null then
    return coalesce(new, old);
  end if;

  select p.id, p.display_name
  into v_actor_id, v_actor_name
  from public.profiles p
  where p.id = v_auth_uid;

  v_actor_name := coalesce(nullif(trim(v_actor_name), ''), 'Team member');

  if tg_table_name = 'projects' and tg_op = 'UPDATE' then
    v_project_id := new.id;
    v_entity_type := 'project';
    v_action := 'project_updated';
    v_summary := v_actor_name || ' updated project overview "' || left(trim(new.title), 80) || '".';
  elsif tg_table_name = 'tasks' then
    v_entity_type := 'task';
    if tg_op = 'INSERT' then
      v_project_id := new.project_id;
      v_action := 'task_created';
      v_summary := v_actor_name || ' created task "' || left(trim(new.title), 80) || '".';
    elsif tg_op = 'UPDATE' then
      v_project_id := new.project_id;
      if new.status is distinct from old.status
        and new.title is not distinct from old.title
        and new.description is not distinct from old.description
        and new.assignee_id is not distinct from old.assignee_id
        and new.assignee_name is not distinct from old.assignee_name
        and new.due_at is not distinct from old.due_at
      then
        v_status_label := case new.status
          when 'todo' then 'To Do'
          when 'in_progress' then 'In Progress'
          when 'done' then 'Done'
          else new.status
        end;
        v_action := 'task_status_updated';
        v_summary := v_actor_name || ' moved task "' || left(trim(new.title), 80) || '" to ' || v_status_label || '.';
      else
        v_action := 'task_updated';
        v_summary := v_actor_name || ' updated task "' || left(trim(new.title), 80) || '".';
      end if;
    elsif tg_op = 'DELETE' then
      v_project_id := old.project_id;
      v_action := 'task_deleted';
      v_summary := v_actor_name || ' deleted task "' || left(trim(old.title), 80) || '".';
    end if;
  elsif tg_table_name = 'resources' then
    v_entity_type := 'resource';
    if tg_op = 'INSERT' then
      v_project_id := new.project_id;
      v_action := 'resource_added';
      v_summary := v_actor_name || ' added resource "' || left(trim(new.title), 80) || '".';
    elsif tg_op = 'DELETE' then
      v_project_id := old.project_id;
      v_action := 'resource_removed';
      v_summary := v_actor_name || ' removed resource "' || left(trim(old.title), 80) || '".';
    end if;
  elsif tg_table_name = 'whiteboard_notes' then
    v_entity_type := 'whiteboard';
    if tg_op = 'INSERT' then
      v_project_id := new.project_id;
      v_action := 'whiteboard_note_added';
      v_summary := v_actor_name || ' posted a sticky note on the whiteboard.';
    elsif tg_op = 'DELETE' then
      v_project_id := old.project_id;
      v_action := 'whiteboard_note_removed';
      v_summary := v_actor_name || ' removed a whiteboard sticky note.';
    end if;
  end if;

  if v_project_id is not null
    and v_entity_type is not null
    and v_action is not null
    and v_summary is not null
    and exists (select 1 from public.projects p where p.id = v_project_id)
  then
    insert into public.activity_logs (
      project_id,
      actor_id,
      actor_name,
      action,
      entity_type,
      summary
    )
    values (
      v_project_id,
      v_actor_id,
      v_actor_name,
      v_action,
      v_entity_type,
      v_summary
    );
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.log_project_activity() from public, anon, authenticated;

drop trigger if exists trg_projects_activity_log on public.projects;
create trigger trg_projects_activity_log
  after update on public.projects
  for each row
  execute function public.log_project_activity();

drop trigger if exists trg_tasks_activity_log on public.tasks;
create trigger trg_tasks_activity_log
  after insert or update or delete on public.tasks
  for each row
  execute function public.log_project_activity();

drop trigger if exists trg_resources_activity_log on public.resources;
create trigger trg_resources_activity_log
  after insert or delete on public.resources
  for each row
  execute function public.log_project_activity();

drop trigger if exists trg_whiteboard_notes_activity_log on public.whiteboard_notes;
create trigger trg_whiteboard_notes_activity_log
  after insert or delete on public.whiteboard_notes
  for each row
  execute function public.log_project_activity();

-- 4. Configure Realtime replication identity and publication

alter table public.projects replica identity full;
alter table public.tasks replica identity full;
alter table public.resources replica identity full;
alter table public.room_messages replica identity full;
alter table public.whiteboard_notes replica identity full;
alter table public.whiteboard_strokes replica identity full;
alter table public.activity_logs replica identity full;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'projects',
    'tasks',
    'resources',
    'room_messages',
    'whiteboard_notes',
    'whiteboard_strokes',
    'activity_logs'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array v_tables loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end $$;

-- 5. Idempotent starter rows when Project 1 is already seeded

do $$
begin
  if exists (
    select 1
    from public.projects
    where id = '44444444-4444-4444-8444-444444444401'
  ) then
    insert into public.whiteboard_notes (id, project_id, author_id, author_name, content, color)
    select
      '88888888-8888-4888-8888-888888888801'::uuid,
      '44444444-4444-4444-8444-444444444401'::uuid,
      (select id from public.profiles where id = '11111111-1111-4111-8111-111111111101'::uuid),
      'Nadia Pratama (Demo)',
      'Sprint Goal: verify live studio sync, task CRUD persistence, and whiteboard collaboration before the demo walkthrough.',
      'yellow'
    on conflict (id) do nothing;

    insert into public.whiteboard_notes (id, project_id, author_id, author_name, content, color)
    select
      '88888888-8888-4888-8888-888888888802'::uuid,
      '44444444-4444-4444-8444-444444444401'::uuid,
      (select id from public.profiles where id = '11111111-1111-4111-8111-111111111102'::uuid),
      'Bima Santoso (Demo)',
      'Reminder: check that cross-team writes remain blocked in Postgres RLS after updating task and resource forms.',
      'sage'
    on conflict (id) do nothing;
  end if;

  if exists (
    select 1
    from public.projects
    where id = '44444444-4444-4444-8444-444444444401'
  )
  and exists (
    select 1
    from public.teams
    where id = '33333333-3333-4333-8333-333333333301'
  )
  and exists (
    select 1
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111101'
  ) then
    insert into public.room_messages (id, team_id, user_id, display_name, body)
    values (
      '99999999-9999-4999-8999-899999999901',
      '33333333-3333-4333-8333-333333333301',
      '11111111-1111-4111-8111-111111111101',
      'Nadia Pratama (Demo)',
      'Welcome to Team SibukTA Studio. Share updates here while working on sprint tasks and whiteboard notes.'
    )
    on conflict (id) do nothing;
  end if;
end $$;
