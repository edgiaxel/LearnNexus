-- LearnNexus M2 Demonstration Seed Data (Idempotent ON CONFLICT upserts)
-- Deterministic UUIDs for repeatable verification and RLS isolation testing.

-- 1. Seed 3 demo users in auth.users (confirmed_at omitted because it is generated)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  email_change_confirm_status,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111101',
    'authenticated',
    'authenticated',
    'nadia.demo@learnnexus.edu',
    extensions.crypt('DemoCampus2026!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', 'Nadia Pratama (Demo)',
      'role', 'team_lead',
      'is_demo', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111102',
    'authenticated',
    'authenticated',
    'bima.demo@learnnexus.edu',
    extensions.crypt('DemoCampus2026!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', 'Bima Santoso (Demo)',
      'role', 'student',
      'is_demo', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111103',
    'authenticated',
    'authenticated',
    'rani.demo@learnnexus.edu',
    extensions.crypt('DemoCampus2026!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', 'Rani Kusuma (Demo)',
      'role', 'guest_demo',
      'is_demo', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    false,
    false
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now(),
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  email_change_token_current = excluded.email_change_token_current,
  email_change_confirm_status = excluded.email_change_confirm_status,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  reauthentication_token = excluded.reauthentication_token,
  is_sso_user = excluded.is_sso_user,
  is_anonymous = excluded.is_anonymous;

-- 2. Seed auth.identities for email login (email column omitted because it is generated)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111201',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    'email',
    jsonb_build_object(
      'sub', '11111111-1111-4111-8111-111111111101',
      'email', 'nadia.demo@learnnexus.edu',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111202',
    '11111111-1111-4111-8111-111111111102',
    '11111111-1111-4111-8111-111111111102',
    'email',
    jsonb_build_object(
      'sub', '11111111-1111-4111-8111-111111111102',
      'email', 'bima.demo@learnnexus.edu',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111203',
    '11111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111103',
    'email',
    jsonb_build_object(
      'sub', '11111111-1111-4111-8111-111111111103',
      'email', 'rani.demo@learnnexus.edu',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

-- 3. Upsert public.profiles
insert into public.profiles (id, display_name, role, is_demo)
values
  ('11111111-1111-4111-8111-111111111101', 'Nadia Pratama (Demo)', 'team_lead', true),
  ('11111111-1111-4111-8111-111111111102', 'Bima Santoso (Demo)', 'student', true),
  ('11111111-1111-4111-8111-111111111103', 'Rani Kusuma (Demo)', 'guest_demo', true)
on conflict (id) do update
set
  display_name = excluded.display_name,
  role = excluded.role,
  is_demo = excluded.is_demo;

-- 4. Seed academic classes
insert into public.classes (id, code, name, semester)
values
  ('22222222-2222-4222-8222-222222222201', 'IF-4031', 'Software Engineering Studio', '2026/2027 Odd'),
  ('22222222-2222-4222-8222-222222222202', 'IF-3210', 'Human-Computer Interaction', '2026/2027 Odd')
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name,
  semester = excluded.semester;

-- 5. Seed class enrollments (Rani intentionally has 0 class memberships)
insert into public.class_members (class_id, user_id, role)
values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 'student'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', 'student'),
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102', 'student')
on conflict (class_id, user_id) do update
set
  role = excluded.role;

-- 6. Seed teams and team memberships
insert into public.teams (id, class_id, name)
values
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'Team SibukTA'),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'Team Studio B')
on conflict (id) do update
set
  class_id = excluded.class_id,
  name = excluded.name;

insert into public.team_members (team_id, user_id, role)
values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111101', 'team_lead'),
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111102', 'member'),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111101', 'team_lead')
on conflict (team_id, user_id) do update
set
  role = excluded.role;

-- 7. Seed projects
insert into public.projects (id, team_id, title, description, objectives)
values
  (
    '44444444-4444-4444-8444-444444444401',
    '33333333-3333-4333-8333-333333333301',
    'LearnNexus Semifinal Demonstrator',
    'Build an asynchronous-first virtual campus studio connecting a 2D pixel-art room with durable team project panels backed by Supabase Postgres and RLS.',
    jsonb_build_array(
      'Ship authenticated entry with transparent labeled demo profiles backed by real Supabase Auth sessions',
      'Enforce class and team boundaries at the database boundary using Postgres Row Level Security',
      'Connect workstation interactions inside Phaser 3 to accessible React productivity drawers',
      'Persist sprint task status updates across browser reloads and leave-and-return flows'
    )
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '33333333-3333-4333-8333-333333333302',
    'Cozy Campus Usability and Accessibility Audit',
    'Evaluate keyboard focus management, WCAG AA contrast compliance, and screen-reader clarity across the LearnNexus studio workflow.',
    jsonb_build_array(
      'Audit keyboard navigation and Escape focus restoration between React drawers and the Phaser canvas',
      'Verify WCAG AA color contrast across all Cozy Digital Campus badges, inputs, and surface cards',
      'Validate empty, loading, and error recovery copy with clear next actions for students'
    )
  )
on conflict (id) do update
set
  team_id = excluded.team_id,
  title = excluded.title,
  description = excluded.description,
  objectives = excluded.objectives;

-- 8. Seed sprint tasks (8 tasks total; includes NULL assignee_name and NULL due_at for F-007 coverage)
insert into public.tasks (id, project_id, title, description, status, assignee_id, assignee_name, due_at, sort_order)
values
  (
    '55555555-5555-4555-8555-555555555501',
    '44444444-4444-4444-8444-444444444401',
    'Configure crisp pixel-art campus studio scene',
    'Lock integer camera zoom, NEAREST texture filtering, and workstation proximity collision zones.',
    'done',
    '11111111-1111-4111-8111-111111111101',
    'Nadia Pratama (Demo)',
    '2026-11-28T17:00:00Z',
    1
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '44444444-4444-4444-8444-444444444401',
    'Implement Postgres RLS policies for team boundaries',
    'Verify student isolation across classes, teams, projects, tasks, and shared resources.',
    'in_progress',
    '11111111-1111-4111-8111-111111111102',
    'Bima Santoso (Demo)',
    '2026-12-01T17:00:00Z',
    2
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '44444444-4444-4444-8444-444444444401',
    'Wire workstation drawer task status persistence',
    'Confirm task status changes survive full page reload and return-to-studio navigation.',
    'todo',
    '11111111-1111-4111-8111-111111111101',
    'Nadia Pratama (Demo)',
    null,
    3
  ),
  (
    '55555555-5555-4555-8555-555555555504',
    '44444444-4444-4444-8444-444444444401',
    'Review unassigned milestone backlog items',
    'Triage open team checklist items that do not have an owner assigned yet.',
    'todo',
    null,
    null,
    '2026-12-05T17:00:00Z',
    4
  ),
  (
    '55555555-5555-4555-8555-555555555505',
    '44444444-4444-4444-8444-444444444401',
    'Run end-to-end Playwright verification suite',
    null,
    'in_progress',
    '11111111-1111-4111-8111-111111111102',
    'Bima Santoso (Demo)',
    null,
    5
  ),
  (
    '55555555-5555-4555-8555-555555555506',
    '44444444-4444-4444-8444-444444444402',
    'Audit Cozy Digital Campus contrast tokens',
    'Verify all foreground/background pairings meet WCAG AA 4.5:1 text contrast.',
    'done',
    '11111111-1111-4111-8111-111111111101',
    'Nadia Pratama (Demo)',
    '2026-11-29T17:00:00Z',
    1
  ),
  (
    '55555555-5555-4555-8555-555555555507',
    '44444444-4444-4444-8444-444444444402',
    'Test keyboard focus trap in workstation drawers',
    'Confirm Tab cycles inside the drawer and Escape returns focus to the canvas.',
    'in_progress',
    '11111111-1111-4111-8111-111111111101',
    'Nadia Pratama (Demo)',
    '2026-12-03T17:00:00Z',
    2
  ),
  (
    '55555555-5555-4555-8555-555555555508',
    '44444444-4444-4444-8444-444444444402',
    'Document empty state usability findings',
    'Capture screenshots and recommendations for unassigned guest profile flows.',
    'todo',
    null,
    null,
    null,
    3
  )
on conflict (id) do update
set
  project_id = excluded.project_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  assignee_id = excluded.assignee_id,
  assignee_name = excluded.assignee_name,
  due_at = excluded.due_at,
  sort_order = excluded.sort_order;

-- 9. Seed resources (4 for Project 1 spanning docs/design/tools/general, 2 for Project 2)
insert into public.resources (id, project_id, title, description, url, resource_type)
values
  (
    '66666666-6666-4666-8666-666666666601',
    '44444444-4444-4444-8444-444444444401',
    'LearnNexus GitHub Repository (Demo Reference)',
    'Primary source repository, architecture decisions, and project documentation.',
    'https://github.com/edgiaxel/LearnNexus',
    'general'
  ),
  (
    '66666666-6666-4666-8666-666666666602',
    '44444444-4444-4444-8444-444444444401',
    'Supabase Row Level Security Guide (Demo Reference)',
    'Official Postgres RLS documentation used for class and team policy design.',
    'https://supabase.com/docs/guides/database/postgres/row-level-security',
    'docs'
  ),
  (
    '66666666-6666-4666-8666-666666666603',
    '44444444-4444-4444-8444-444444444401',
    'Phaser 3 Getting Started Guide (Demo Reference)',
    'Core Phaser 3 documentation for scene lifecycle, tilemaps, and input handling.',
    'https://docs.phaser.io/phaser/getting-started/what-is-phaser',
    'tools'
  ),
  (
    '66666666-6666-4666-8666-666666666604',
    '44444444-4444-4444-8444-444444444401',
    'WCAG 2.2 Quick Reference (Demo Reference)',
    'Accessibility checklist for keyboard navigation, focus states, and color contrast.',
    'https://www.w3.org/WAI/WCAG22/quickref/',
    'design'
  ),
  (
    '66666666-6666-4666-8666-666666666605',
    '44444444-4444-4444-8444-444444444402',
    'WCAG 2.2 Accessibility Quick Reference (Demo Reference)',
    'Baseline criteria for the HCI accessibility audit.',
    'https://www.w3.org/WAI/WCAG22/quickref/',
    'design'
  ),
  (
    '66666666-6666-4666-8666-666666666606',
    '44444444-4444-4444-8444-444444444402',
    'Supabase Postgres RLS Guide (Demo Reference)',
    'Reference notes on separating interface affordances from backend authorization.',
    'https://supabase.com/docs/guides/database/postgres/row-level-security',
    'docs'
  )
on conflict (id) do update
set
  project_id = excluded.project_id,
  title = excluded.title,
  description = excluded.description,
  url = excluded.url,
  resource_type = excluded.resource_type;

-- 10. Seed workspace layouts
insert into public.workspace_layouts (id, team_id, layout_key, config_json)
values
  (
    '77777777-7777-4777-8777-777777777701',
    '33333333-3333-4333-8333-333333333301',
    'campus_studio_v1',
    '{"tileSize": 16, "zoomDesktop": 3, "zoomMobile": 2}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777777702',
    '33333333-3333-4333-8333-333333333302',
    'campus_studio_v1',
    '{"tileSize": 16, "zoomDesktop": 3, "zoomMobile": 2}'::jsonb
  )
on conflict (id) do update
set
  team_id = excluded.team_id,
  layout_key = excluded.layout_key,
  config_json = excluded.config_json;

-- 11. Seed starter whiteboard notes (M9)
insert into public.whiteboard_notes (id, project_id, author_id, author_name, content, color)
values
  (
    '88888888-8888-4888-8888-888888888801',
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111101',
    'Nadia Pratama (Demo)',
    'Sprint Goal: verify live studio sync, task CRUD persistence, and whiteboard collaboration before the demo walkthrough.',
    'yellow'
  ),
  (
    '88888888-8888-4888-8888-888888888802',
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111102',
    'Bima Santoso (Demo)',
    'Reminder: check that cross-team writes remain blocked in Postgres RLS after updating task and resource forms.',
    'sage'
  )
on conflict (id) do update
set
  project_id = excluded.project_id,
  author_id = excluded.author_id,
  author_name = excluded.author_name,
  content = excluded.content,
  color = excluded.color;

-- 12. Seed starter room welcome message (M6)
insert into public.room_messages (id, team_id, user_id, display_name, body)
values
  (
    '99999999-9999-4999-8999-899999999901',
    '33333333-3333-4333-8333-333333333301',
    '11111111-1111-4111-8111-111111111101',
    'Nadia Pratama (Demo)',
    'Welcome to Team SibukTA Studio. Share updates here while working on sprint tasks and whiteboard notes.'
  )
on conflict (id) do update
set
  team_id = excluded.team_id,
  user_id = excluded.user_id,
  display_name = excluded.display_name,
  body = excluded.body;
