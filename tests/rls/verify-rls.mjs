import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const DEMO_PASSWORD = 'DemoCampus2026!';

const IDS = {
  class1: '22222222-2222-4222-8222-222222222201',
  class2: '22222222-2222-4222-8222-222222222202',
  team1: '33333333-3333-4333-8333-333333333301',
  team2: '33333333-3333-4333-8333-333333333302',
  project1: '44444444-4444-4444-8444-444444444401',
  project2: '44444444-4444-4444-8444-444444444402',
  task1_3: '55555555-5555-4555-8555-555555555503',
  task2_3: '55555555-5555-4555-8555-555555555508',
};

const ALL_TABLES = [
  'profiles',
  'classes',
  'class_members',
  'teams',
  'team_members',
  'projects',
  'tasks',
  'resources',
  'workspace_layouts',
];

const NON_PROFILE_TABLES = [
  'classes',
  'class_members',
  'teams',
  'team_members',
  'projects',
  'tasks',
  'resources',
  'workspace_layouts',
];

function stripMatchingQuotes(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Missing .env file in current working directory. Copy .env.example to .env and configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const parsed = {};

  for (const line of raw.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed.startsWith('export ')) {
      trimmed = trimmed.slice(7).trim();
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const val = stripMatchingQuotes(trimmed.slice(separatorIndex + 1).trim());
    parsed[key] = val;
  }

  const supabaseUrl = (parsed.VITE_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = (parsed.VITE_SUPABASE_ANON_KEY ?? '').trim();

  if (
    supabaseUrl.length === 0 ||
    supabaseUrl.includes('your-project-ref')
  ) {
    throw new Error('VITE_SUPABASE_URL is missing or placeholder in .env.');
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    throw new Error('VITE_SUPABASE_URL in .env is not a valid HTTP/HTTPS URL.');
  }

  if (
    supabaseAnonKey.length === 0 ||
    supabaseAnonKey.includes('your-anon-or-publishable-key')
  ) {
    throw new Error('VITE_SUPABASE_ANON_KEY is missing or placeholder in .env.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

function createStatelessClient(supabaseUrl, supabaseAnonKey) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signInDemoActor(supabaseUrl, supabaseAnonKey, email) {
  const client = createStatelessClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });

  if (error || !data.session || !data.user) {
    const statusLabel = error && 'status' in error ? ` (status ${error.status})` : '';
    throw new Error(`Sign-in failed for ${email}${statusLabel}.`);
  }

  return client;
}

async function verifyAnonActor(supabaseUrl, supabaseAnonKey) {
  const anonClient = createStatelessClient(supabaseUrl, supabaseAnonKey);

  for (const table of ALL_TABLES) {
    const { data, error } = await anonClient.from(table).select('*');
    assert.equal(
      error?.code,
      '42501',
      `anon SELECT on ${table} must fail with Postgres code 42501`,
    );
    assert.equal(
      (data ?? []).length,
      0,
      `anon SELECT on ${table} must return 0 rows`,
    );
  }

  console.log('PASS [anon]: 9/9 tables blocked (42501, 0 rows)');
}

async function verifyNadiaActor(supabaseUrl, supabaseAnonKey) {
  const email = 'nadia.demo@learnnexus.edu';
  const client = await signInDemoActor(supabaseUrl, supabaseAnonKey, email);

  try {
    const { data: classes, error: classesErr } = await client
      .from('classes')
      .select('id, code');
    assert.equal(classesErr, null, 'nadia classes query must succeed');
    assert.equal((classes ?? []).length, 2, 'nadia must read 2 classes');
    assert.deepEqual(
      (classes ?? []).map((row) => row.code).sort(),
      ['IF-3210', 'IF-4031'],
      'nadia classes must match IF-3210 and IF-4031',
    );

    const { data: projects, error: projectsErr } = await client
      .from('projects')
      .select('id, team_id');
    assert.equal(projectsErr, null, 'nadia projects query must succeed');
    assert.equal((projects ?? []).length, 2, 'nadia must read 2 projects');

    const { data: p1Tasks, error: p1TasksErr } = await client
      .from('tasks')
      .select('id, project_id, status, updated_at')
      .eq('project_id', IDS.project1);
    assert.equal(p1TasksErr, null, 'nadia Project 1 tasks query must succeed');
    assert.equal((p1Tasks ?? []).length, 5, 'nadia must read 5 Project 1 tasks');

    const { data: p1Resources, error: p1ResErr } = await client
      .from('resources')
      .select('id, project_id')
      .eq('project_id', IDS.project1);
    assert.equal(p1ResErr, null, 'nadia Project 1 resources query must succeed');
    assert.equal(
      (p1Resources ?? []).length,
      4,
      'nadia must read 4 Project 1 resources',
    );

    const { data: p2Tasks, error: p2TasksErr } = await client
      .from('tasks')
      .select('id, project_id')
      .eq('project_id', IDS.project2);
    assert.equal(p2TasksErr, null, 'nadia Project 2 tasks query must succeed');
    assert.equal((p2Tasks ?? []).length, 3, 'nadia must read 3 Project 2 tasks');

    const { data: p2Resources, error: p2ResErr } = await client
      .from('resources')
      .select('id, project_id')
      .eq('project_id', IDS.project2);
    assert.equal(p2ResErr, null, 'nadia Project 2 resources query must succeed');
    assert.equal(
      (p2Resources ?? []).length,
      2,
      'nadia must read 2 Project 2 resources',
    );

    const { data: layouts, error: layoutsErr } = await client
      .from('workspace_layouts')
      .select('id, team_id');
    assert.equal(layoutsErr, null, 'nadia workspace_layouts query must succeed');
    assert.equal(
      (layouts ?? []).length,
      2,
      'nadia must read 2 workspace_layouts',
    );

    const { data: beforeTask, error: beforeErr } = await client
      .from('tasks')
      .select('id, status, updated_at')
      .eq('id', IDS.task1_3)
      .single();
    assert.equal(beforeErr, null, 'nadia initial task read must succeed');

    try {
      const { data: updatedTask, error: updateErr } = await client
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', IDS.task1_3)
        .select('id, status, updated_at')
        .single();
      assert.equal(updateErr, null, 'nadia task status update must succeed');
      assert.equal(
        updatedTask?.status,
        'in_progress',
        'nadia task status must update to in_progress',
      );
      assert.notEqual(
        updatedTask?.updated_at,
        beforeTask?.updated_at,
        'nadia task update must advance updated_at',
      );
    } finally {
      const { data: restoredTask, error: restoreErr } = await client
        .from('tasks')
        .update({ status: 'todo' })
        .eq('id', IDS.task1_3)
        .select('id, status')
        .single();
      assert.equal(restoreErr, null, 'nadia task status restore must succeed');
      assert.equal(
        restoredTask?.status,
        'todo',
        'nadia task status must restore to todo',
      );
    }

    const { error: titleUpdateErr } = await client
      .from('tasks')
      .update({ title: 'Unauthorized title change' })
      .eq('id', IDS.task1_3);
    assert.equal(
      titleUpdateErr?.code,
      '42501',
      'nadia updating non-status column title must fail with 42501',
    );

    const { error: insertErr } = await client.from('tasks').insert({
      project_id: IDS.project1,
      title: 'Unauthorized insert attempt',
    });
    assert.equal(
      insertErr?.code,
      '42501',
      'nadia inserting task must fail with 42501',
    );

    const { error: deleteErr } = await client
      .from('tasks')
      .delete()
      .eq('id', IDS.task1_3);
    assert.equal(
      deleteErr?.code,
      '42501',
      'nadia deleting task must fail with 42501',
    );

    console.log(
      'PASS [nadia.demo@learnnexus.edu]: 2 classes, 2 projects, 5+3 tasks, 4+2 resources, 2 layouts; status update/restore verified; title update, insert, delete blocked (42501)',
    );
  } finally {
    await client.auth.signOut();
  }
}

async function verifyBimaActor(supabaseUrl, supabaseAnonKey) {
  const email = 'bima.demo@learnnexus.edu';
  const client = await signInDemoActor(supabaseUrl, supabaseAnonKey, email);

  try {
    const { data: classes, error: classesErr } = await client
      .from('classes')
      .select('id, code');
    assert.equal(classesErr, null, 'bima classes query must succeed');
    assert.equal((classes ?? []).length, 1, 'bima must read only 1 class');
    assert.equal(classes?.[0]?.code, 'IF-4031', 'bima class must be IF-4031');

    const { data: class2Rows, error: class2Err } = await client
      .from('classes')
      .select('id')
      .eq('code', 'IF-3210');
    assert.equal(class2Err, null, 'bima IF-3210 filter query must succeed');
    assert.equal((class2Rows ?? []).length, 0, 'bima must read 0 rows for IF-3210');

    const { data: teams, error: teamsErr } = await client
      .from('teams')
      .select('id, name');
    assert.equal(teamsErr, null, 'bima teams query must succeed');
    assert.equal((teams ?? []).length, 1, 'bima must read only 1 team');
    assert.equal(teams?.[0]?.name, 'Team SibukTA', 'bima team must be Team SibukTA');

    const { data: team2Rows, error: team2Err } = await client
      .from('teams')
      .select('id')
      .eq('id', IDS.team2);
    assert.equal(team2Err, null, 'bima Team Studio B query must succeed');
    assert.equal(
      (team2Rows ?? []).length,
      0,
      'bima must read 0 rows for Team Studio B',
    );

    const { data: projects, error: projectsErr } = await client
      .from('projects')
      .select('id, team_id');
    assert.equal(projectsErr, null, 'bima projects query must succeed');
    assert.equal((projects ?? []).length, 1, 'bima must read only 1 project');
    assert.equal(
      projects?.[0]?.id,
      IDS.project1,
      'bima project must be Project 1',
    );

    const { data: p2Rows, error: p2Err } = await client
      .from('projects')
      .select('id')
      .eq('id', IDS.project2);
    assert.equal(p2Err, null, 'bima Project 2 filter query must succeed');
    assert.equal((p2Rows ?? []).length, 0, 'bima must read 0 rows for Project 2');

    const { data: tasks, error: tasksErr } = await client
      .from('tasks')
      .select('id, project_id');
    assert.equal(tasksErr, null, 'bima tasks query must succeed');
    assert.equal((tasks ?? []).length, 5, 'bima must read 5 Project 1 tasks');
    assert.ok(
      (tasks ?? []).every((row) => row.project_id === IDS.project1),
      'bima tasks must all belong to Project 1',
    );

    const { data: p2Tasks, error: p2TasksErr } = await client
      .from('tasks')
      .select('id')
      .eq('project_id', IDS.project2);
    assert.equal(p2TasksErr, null, 'bima Project 2 tasks query must succeed');
    assert.equal(
      (p2Tasks ?? []).length,
      0,
      'bima must read 0 tasks for Project 2',
    );

    const { data: resources, error: resErr } = await client
      .from('resources')
      .select('id, project_id');
    assert.equal(resErr, null, 'bima resources query must succeed');
    assert.equal(
      (resources ?? []).length,
      4,
      'bima must read 4 Project 1 resources',
    );
    assert.ok(
      (resources ?? []).every((row) => row.project_id === IDS.project1),
      'bima resources must all belong to Project 1',
    );

    const { data: p2Resources, error: p2ResErr } = await client
      .from('resources')
      .select('id')
      .eq('project_id', IDS.project2);
    assert.equal(p2ResErr, null, 'bima Project 2 resources query must succeed');
    assert.equal(
      (p2Resources ?? []).length,
      0,
      'bima must read 0 resources for Project 2',
    );

    const { data: layouts, error: layoutsErr } = await client
      .from('workspace_layouts')
      .select('id, team_id');
    assert.equal(layoutsErr, null, 'bima workspace_layouts query must succeed');
    assert.equal((layouts ?? []).length, 1, 'bima must read only 1 layout');
    assert.equal(
      layouts?.[0]?.team_id,
      IDS.team1,
      'bima layout must belong to Team SibukTA',
    );

    try {
      const { data: updatedTask, error: updateErr } = await client
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', IDS.task1_3)
        .select('id, status')
        .single();
      assert.equal(updateErr, null, 'bima Project 1 task status update must succeed');
      assert.equal(
        updatedTask?.status,
        'done',
        'bima task status must update to done',
      );
    } finally {
      const { data: restoredTask, error: restoreErr } = await client
        .from('tasks')
        .update({ status: 'todo' })
        .eq('id', IDS.task1_3)
        .select('id, status')
        .single();
      assert.equal(restoreErr, null, 'bima task status restore must succeed');
      assert.equal(
        restoredTask?.status,
        'todo',
        'bima task status must restore to todo',
      );
    }

    const { data: crossTeamRows, error: crossTeamErr } = await client
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', IDS.task2_3)
      .select('id');
    assert.equal(
      crossTeamErr,
      null,
      'bima cross-team update should complete cleanly with 0 affected rows',
    );
    assert.equal(
      (crossTeamRows ?? []).length,
      0,
      'bima updating Project 2 task must affect 0 rows',
    );

    const { error: blockedColumnErr } = await client
      .from('tasks')
      .update({ title: 'Blocked column' })
      .eq('id', IDS.task1_3);
    assert.equal(
      blockedColumnErr?.code,
      '42501',
      'bima updating non-status column title must fail with 42501',
    );

    console.log(
      'PASS [bima.demo@learnnexus.edu]: 1 class (IF-4031), 1 team (Team SibukTA), 1 project, 5 tasks, 4 resources, 1 layout; status update/restore verified; Project 2 update 0 rows; title column blocked (42501)',
    );
  } finally {
    await client.auth.signOut();
  }
}

async function verifyRaniActor(supabaseUrl, supabaseAnonKey) {
  const email = 'rani.demo@learnnexus.edu';
  const client = await signInDemoActor(supabaseUrl, supabaseAnonKey, email);

  try {
    for (const table of NON_PROFILE_TABLES) {
      const { data, error } = await client.from(table).select('*');
      assert.equal(error, null, `rani SELECT on ${table} must not error`);
      assert.equal(
        (data ?? []).length,
        0,
        `rani SELECT on ${table} must return 0 rows`,
      );
    }

    const { data: crossRows, error: crossErr } = await client
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', IDS.task1_3)
      .select('id');
    assert.equal(
      crossErr,
      null,
      'rani cross-team task update should complete cleanly with 0 affected rows',
    );
    assert.equal(
      (crossRows ?? []).length,
      0,
      'rani updating Team SibukTA task must affect 0 rows',
    );

    console.log(
      'PASS [rani.demo@learnnexus.edu]: 0 rows across 8 academic tables; cross-team status update 0 rows',
    );
  } finally {
    await client.auth.signOut();
  }
}

async function main() {
  const { supabaseUrl, supabaseAnonKey } = loadLocalEnv();
  await verifyAnonActor(supabaseUrl, supabaseAnonKey);
  await verifyNadiaActor(supabaseUrl, supabaseAnonKey);
  await verifyBimaActor(supabaseUrl, supabaseAnonKey);
  await verifyRaniActor(supabaseUrl, supabaseAnonKey);
  console.log('RLS verification passed for all 4 actors.');
}

main().catch((err) => {
  const message =
    err instanceof Error ? err.message : 'RLS verification failed.';
  console.error(`FAIL: ${message}`);
  process.exit(1);
});
