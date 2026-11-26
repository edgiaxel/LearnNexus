import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const DEMO_PASSWORD = 'DemoCampus2026!';

const IDS = {
  nadia: '11111111-1111-4111-8111-111111111101',
  bima: '11111111-1111-4111-8111-111111111102',
  rani: '11111111-1111-4111-8111-111111111103',
  class1: '22222222-2222-4222-8222-222222222201',
  class2: '22222222-2222-4222-8222-222222222202',
  team1: '33333333-3333-4333-8333-333333333301',
  team2: '33333333-3333-4333-8333-333333333302',
  project1: '44444444-4444-4444-8444-444444444401',
  project2: '44444444-4444-4444-8444-444444444402',
  task1_3: '55555555-5555-4555-8555-555555555503',
  task2_3: '55555555-5555-4555-8555-555555555508',
  resource1_1: '66666666-6666-4666-8666-666666666601',
  resource2_1: '66666666-6666-4666-8666-666666666605',
  note1_1: '88888888-8888-4888-8888-888888888801',
  note1_2: '88888888-8888-4888-8888-888888888802',
  roomMessage1: '99999999-9999-4999-8999-899999999901',
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
  'room_messages',
  'whiteboard_notes',
  'whiteboard_strokes',
  'activity_logs',
];

const NON_PROFILE_TABLES = ALL_TABLES.filter((table) => table !== 'profiles');

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
    const statusLabel =
      error && 'status' in error ? ` (status ${error.status})` : '';
    throw new Error(`Sign-in failed for ${email}${statusLabel}.`);
  }

  return client;
}

async function countProjectRows(client, table, projectId) {
  const { data, error } = await client
    .from(table)
    .select('id')
    .eq('project_id', projectId);
  assert.equal(error, null, `${table} count query must succeed`);
  return (data ?? []).length;
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

  const anonWriteChecks = [
    anonClient.from('tasks').insert({
      project_id: IDS.project1,
      title: 'Anon blocked task',
    }),
    anonClient.from('resources').insert({
      project_id: IDS.project1,
      title: 'Anon blocked resource',
      url: 'https://example.org',
      resource_type: 'general',
    }),
    anonClient.from('room_messages').insert({
      team_id: IDS.team1,
      user_id: IDS.nadia,
      display_name: 'Anon',
      body: 'Blocked',
    }),
    anonClient.from('whiteboard_notes').insert({
      project_id: IDS.project1,
      author_id: null,
      author_name: 'Anon',
      content: 'Blocked',
      color: 'yellow',
    }),
    anonClient.from('whiteboard_strokes').insert({
      project_id: IDS.project1,
      author_id: null,
      author_name: 'Anon',
      color: '#30343B',
      width: 2,
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    }),
    anonClient.from('activity_logs').insert({
      project_id: IDS.project1,
      actor_name: 'Anon',
      action: 'spoof',
      entity_type: 'project',
      summary: 'Blocked',
    }),
  ];

  const writeResults = await Promise.all(anonWriteChecks);
  for (const res of writeResults) {
    assert.equal(
      res.error?.code,
      '42501',
      'anon write attempts must fail with 42501',
    );
  }

  console.log(
    `PASS [anon]: ${ALL_TABLES.length}/${ALL_TABLES.length} tables blocked on SELECT and writes (42501, 0 rows)`,
  );
}

async function verifyNadiaActor(supabaseUrl, supabaseAnonKey) {
  const email = 'nadia.demo@learnnexus.edu';
  const client = await signInDemoActor(supabaseUrl, supabaseAnonKey, email);

  try {
    const { data: profiles, error: profilesErr } = await client
      .from('profiles')
      .select('id, display_name');
    assert.equal(profilesErr, null, 'nadia profiles query must succeed');
    assert.ok(
      (profiles ?? []).some((row) => row.id === IDS.nadia),
      'nadia must read own profile',
    );
    assert.ok(
      (profiles ?? []).some((row) => row.id === IDS.bima),
      'nadia must read teammate Bima profile',
    );
    assert.ok(
      (profiles ?? []).every((row) => row.id !== IDS.rani),
      'nadia must not read unassigned Rani profile',
    );

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

    const { data: classMembers, error: cmErr } = await client
      .from('class_members')
      .select('class_id, user_id');
    assert.equal(cmErr, null, 'nadia class_members query must succeed');
    assert.equal(
      (classMembers ?? []).length,
      2,
      'nadia must read own 2 class memberships',
    );

    const { data: teams, error: teamsErr } = await client
      .from('teams')
      .select('id, name');
    assert.equal(teamsErr, null, 'nadia teams query must succeed');
    assert.equal((teams ?? []).length, 2, 'nadia must read 2 teams');

    const { data: teamMembers, error: tmErr } = await client
      .from('team_members')
      .select('team_id, user_id');
    assert.equal(tmErr, null, 'nadia team_members query must succeed');
    assert.equal(
      (teamMembers ?? []).length,
      3,
      'nadia must read 3 team_members rows across her 2 teams',
    );

    const { data: projects, error: projectsErr } = await client
      .from('projects')
      .select('id, team_id, title, description, objectives, updated_at');
    assert.equal(projectsErr, null, 'nadia projects query must succeed');
    assert.equal((projects ?? []).length, 2, 'nadia must read 2 projects');

    assert.equal(
      await countProjectRows(client, 'tasks', IDS.project1),
      5,
      'nadia must read 5 Project 1 tasks',
    );
    assert.equal(
      await countProjectRows(client, 'tasks', IDS.project2),
      3,
      'nadia must read 3 Project 2 tasks',
    );
    assert.equal(
      await countProjectRows(client, 'resources', IDS.project1),
      4,
      'nadia must read 4 Project 1 resources',
    );
    assert.equal(
      await countProjectRows(client, 'resources', IDS.project2),
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

    const { data: team1Messages, error: msgErr } = await client
      .from('room_messages')
      .select('id, team_id, user_id, body')
      .eq('team_id', IDS.team1);
    assert.equal(msgErr, null, 'nadia room_messages query must succeed');
    assert.ok(
      (team1Messages ?? []).some((row) => row.id === IDS.roomMessage1),
      'nadia must read seeded Team 1 welcome message',
    );

    assert.equal(
      await countProjectRows(client, 'whiteboard_notes', IDS.project1),
      2,
      'nadia must read 2 seeded Project 1 whiteboard notes',
    );
    assert.equal(
      await countProjectRows(client, 'whiteboard_notes', IDS.project2),
      0,
      'nadia must read 0 Project 2 whiteboard notes',
    );
    assert.equal(
      await countProjectRows(client, 'whiteboard_strokes', IDS.project1),
      0,
      'nadia must read 0 Project 1 whiteboard strokes',
    );

    const { error: initialActivityErr } = await client
      .from('activity_logs')
      .select('id, project_id, action')
      .eq('project_id', IDS.project1);
    assert.equal(
      initialActivityErr,
      null,
      'nadia activity_logs query must succeed',
    );

    // 1. Authorized project brief update + restore
    const originalProject1 = (projects ?? []).find(
      (row) => row.id === IDS.project1,
    );
    assert.ok(originalProject1, 'Project 1 row must exist');
    try {
      const { data: updatedProject, error: projUpdateErr } = await client
        .from('projects')
        .update({
          title: 'LearnNexus Semifinal Demonstrator (Verify)',
          description: originalProject1.description,
          objectives: [
            ...(Array.isArray(originalProject1.objectives)
              ? originalProject1.objectives
              : []),
            'Verify persisted project brief update',
          ],
        })
        .eq('id', IDS.project1)
        .select('id, title, updated_at')
        .single();
      assert.equal(projUpdateErr, null, 'nadia project update must succeed');
      assert.equal(
        updatedProject?.title,
        'LearnNexus Semifinal Demonstrator (Verify)',
      );
      assert.notEqual(
        updatedProject?.updated_at,
        originalProject1.updated_at,
        'nadia project update must advance updated_at',
      );
    } finally {
      const { error: projRestoreErr } = await client
        .from('projects')
        .update({
          title: originalProject1.title,
          description: originalProject1.description,
          objectives: originalProject1.objectives,
        })
        .eq('id', IDS.project1);
      assert.equal(projRestoreErr, null, 'nadia project restore must succeed');
    }

    const { error: teamIdUpdateErr } = await client
      .from('projects')
      .update({ team_id: IDS.team2 })
      .eq('id', IDS.project1);
    assert.equal(
      teamIdUpdateErr?.code,
      '42501',
      'nadia updating projects.team_id must fail with 42501',
    );

    // 2. Authorized tasks CRUD + status update/restore + column exclusion
    try {
      const { data: updatedTask, error: updateErr } = await client
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', IDS.task1_3)
        .select('id, status')
        .single();
      assert.equal(updateErr, null, 'nadia task status update must succeed');
      assert.equal(updatedTask?.status, 'in_progress');
    } finally {
      const { error: restoreErr } = await client
        .from('tasks')
        .update({ status: 'todo' })
        .eq('id', IDS.task1_3);
      assert.equal(restoreErr, null, 'nadia task status restore must succeed');
    }

    let createdTaskId = null;
    try {
      const { data: createdTask, error: createTaskErr } = await client
        .from('tasks')
        .insert({
          project_id: IDS.project1,
          title: 'Temp RLS task item',
          description: 'Created during RLS verification',
          status: 'todo',
          assignee_id: IDS.nadia,
          assignee_name: 'Nadia Pratama (Demo)',
          sort_order: 99,
        })
        .select('id, title, assignee_id')
        .single();
      assert.equal(createTaskErr, null, 'nadia task insert must succeed');
      createdTaskId = createdTask?.id ?? null;
      assert.ok(createdTaskId, 'created task must have an id');
      assert.equal(createdTask?.assignee_id, IDS.nadia);

      const { data: editedTask, error: editTaskErr } = await client
        .from('tasks')
        .update({
          title: 'Temp RLS task edited',
          status: 'in_progress',
        })
        .eq('id', createdTaskId)
        .select('id, title, status')
        .single();
      assert.equal(editTaskErr, null, 'nadia full task update must succeed');
      assert.equal(editedTask?.title, 'Temp RLS task edited');
      assert.equal(editedTask?.status, 'in_progress');

      const { error: moveProjectErr } = await client
        .from('tasks')
        .update({ project_id: IDS.project2 })
        .eq('id', createdTaskId);
      assert.equal(
        moveProjectErr?.code,
        '42501',
        'nadia updating tasks.project_id must fail with 42501',
      );
    } finally {
      if (createdTaskId) {
        const { error: delTaskErr } = await client
          .from('tasks')
          .delete()
          .eq('id', createdTaskId);
        assert.equal(delTaskErr, null, 'nadia task delete cleanup must succeed');
      }
    }
    assert.equal(
      await countProjectRows(client, 'tasks', IDS.project1),
      5,
      'Project 1 tasks count must be restored to 5',
    );

    // 3. Authorized resources CRUD + javascript: URL rejection
    const { error: unsafeUrlErr } = await client.from('resources').insert({
      project_id: IDS.project1,
      title: 'Blocked XSS URL',
      url: 'javascript:alert(1)',
      resource_type: 'general',
    });
    assert.equal(
      unsafeUrlErr?.code,
      '23514',
      'javascript: URL in resources must fail check constraint with 23514',
    );

    let createdResourceId = null;
    try {
      const { data: createdRes, error: createResErr } = await client
        .from('resources')
        .insert({
          project_id: IDS.project1,
          title: 'Temp RLS resource link',
          description: 'Safe verification link',
          url: 'https://example.org/learnnexus-rls',
          resource_type: 'docs',
        })
        .select('id, title, url')
        .single();
      assert.equal(createResErr, null, 'nadia resource insert must succeed');
      createdResourceId = createdRes?.id ?? null;
      assert.ok(createdResourceId, 'created resource must have an id');

      const { data: updatedRes, error: updResErr } = await client
        .from('resources')
        .update({ title: 'Temp RLS resource updated' })
        .eq('id', createdResourceId)
        .select('id, title')
        .single();
      assert.equal(updResErr, null, 'nadia resource update must succeed');
      assert.equal(updatedRes?.title, 'Temp RLS resource updated');
    } finally {
      if (createdResourceId) {
        const { error: delResErr } = await client
          .from('resources')
          .delete()
          .eq('id', createdResourceId);
        assert.equal(
          delResErr,
          null,
          'nadia resource delete cleanup must succeed',
        );
      }
    }
    assert.equal(
      await countProjectRows(client, 'resources', IDS.project1),
      4,
      'Project 1 resources count must be restored to 4',
    );

    // 4. Authorized whiteboard_notes CRUD + cleanup
    let createdNoteId = null;
    try {
      const { data: createdNote, error: createNoteErr } = await client
        .from('whiteboard_notes')
        .insert({
          project_id: IDS.project1,
          author_id: IDS.nadia,
          author_name: 'Nadia Pratama (Demo)',
          content: 'Temp sticky note from RLS check',
          color: 'lavender',
        })
        .select('id, content, color, updated_at')
        .single();
      assert.equal(
        createNoteErr,
        null,
        'nadia whiteboard_notes insert must succeed',
      );
      createdNoteId = createdNote?.id ?? null;
      assert.ok(createdNoteId, 'created note must have an id');

      const { data: updatedNote, error: updNoteErr } = await client
        .from('whiteboard_notes')
        .update({ content: 'Updated sticky note', color: 'peach' })
        .eq('id', createdNoteId)
        .select('id, content, color, updated_at')
        .single();
      assert.equal(
        updNoteErr,
        null,
        'nadia whiteboard_notes update must succeed',
      );
      assert.equal(updatedNote?.color, 'peach');
      assert.notEqual(
        updatedNote?.updated_at,
        createdNote?.updated_at,
        'whiteboard_notes update must advance updated_at',
      );
    } finally {
      if (createdNoteId) {
        const { error: delNoteErr } = await client
          .from('whiteboard_notes')
          .delete()
          .eq('id', createdNoteId);
        assert.equal(
          delNoteErr,
          null,
          'nadia whiteboard_notes delete cleanup must succeed',
        );
      }
    }
    assert.equal(
      await countProjectRows(client, 'whiteboard_notes', IDS.project1),
      2,
      'Project 1 whiteboard_notes count must be restored to 2',
    );

    // 5. Authorized whiteboard_strokes CRUD + cleanup
    let createdStrokeId = null;
    try {
      const { data: createdStroke, error: createStrokeErr } = await client
        .from('whiteboard_strokes')
        .insert({
          project_id: IDS.project1,
          author_id: IDS.nadia,
          author_name: 'Nadia Pratama (Demo)',
          color: '#4A6B46',
          width: 2,
          points: [
            { x: 10, y: 12 },
            { x: 45, y: 60 },
          ],
        })
        .select('id, color, width')
        .single();
      assert.equal(
        createStrokeErr,
        null,
        'nadia whiteboard_strokes insert must succeed',
      );
      createdStrokeId = createdStroke?.id ?? null;
      assert.ok(createdStrokeId, 'created stroke must have an id');
    } finally {
      if (createdStrokeId) {
        const { error: delStrokeErr } = await client
          .from('whiteboard_strokes')
          .delete()
          .eq('id', createdStrokeId);
        assert.equal(
          delStrokeErr,
          null,
          'nadia whiteboard_strokes delete cleanup must succeed',
        );
      }
    }
    assert.equal(
      await countProjectRows(client, 'whiteboard_strokes', IDS.project1),
      0,
      'Project 1 whiteboard_strokes count must be restored to 0',
    );

    // 6. room_messages authorized insert, spoofed user_id, delete, and empty body rejection
    const beforeMsgCount = (team1Messages ?? []).length;
    const { data: insertedMsg, error: insertMsgErr } = await client
      .from('room_messages')
      .insert({
        team_id: IDS.team1,
        user_id: IDS.nadia,
        display_name: 'Nadia Pratama (Demo)',
        body: 'Studio workspace sync check completed.',
      })
      .select('id, team_id, user_id, body')
      .single();
    assert.equal(insertMsgErr, null, 'nadia authorized room_messages insert must succeed');
    assert.ok(insertedMsg?.id, 'inserted room message must have an id');

    const { data: afterMessages, error: afterMsgErr } = await client
      .from('room_messages')
      .select('id')
      .eq('team_id', IDS.team1);
    assert.equal(afterMsgErr, null, 'nadia post-insert room_messages query must succeed');
    assert.equal(
      (afterMessages ?? []).length,
      beforeMsgCount + 1,
      'Team 1 room_messages count must increment by 1',
    );

    const { error: spoofMsgErr } = await client.from('room_messages').insert({
      team_id: IDS.team1,
      user_id: IDS.bima,
      display_name: 'Spoofed',
      body: 'Should be blocked',
    });
    assert.equal(
      spoofMsgErr?.code,
      '42501',
      'room_messages insert with spoofed user_id must fail with 42501',
    );

    const { error: delMsgErr } = await client
      .from('room_messages')
      .delete()
      .eq('id', IDS.roomMessage1);
    assert.equal(
      delMsgErr?.code,
      '42501',
      'room_messages delete must fail with 42501',
    );

    const { error: emptyMsgErr } = await client.from('room_messages').insert({
      team_id: IDS.team1,
      user_id: IDS.nadia,
      display_name: 'Nadia Pratama (Demo)',
      body: '   ',
    });
    assert.equal(
      emptyMsgErr?.code,
      '23514',
      'room_messages whitespace-only body must fail check constraint 23514',
    );

    // 7. activity_logs trigger output & client-write block (42501)
    const { data: activityRows, error: activityQueryErr } = await client
      .from('activity_logs')
      .select('id, action, entity_type, summary')
      .eq('project_id', IDS.project1);
    assert.equal(activityQueryErr, null, 'nadia activity_logs read must succeed');
    assert.ok(
      (activityRows ?? []).length >= 1,
      'trigger must record activity_logs entries on authenticated writes',
    );
    assert.ok(
      (activityRows ?? []).every((row) => !row.summary.includes('\u2014')),
      'activity_logs summaries must not contain em dashes',
    );

    const { error: activityInsertErr } = await client
      .from('activity_logs')
      .insert({
        project_id: IDS.project1,
        actor_id: IDS.nadia,
        actor_name: 'Nadia Pratama (Demo)',
        action: 'client_spoof',
        entity_type: 'project',
        summary: 'Client insert must be blocked',
      });
    assert.equal(
      activityInsertErr?.code,
      '42501',
      'activity_logs client insert must fail with 42501',
    );

    console.log(
      'PASS [nadia.demo@learnnexus.edu]: 13/13 tables verified; CRUD + cleanup restored exact seeded counts (5+3 tasks, 4+2 resources, 2 notes, 0 strokes); javascript: rejected (23514); activity_logs client insert blocked (42501)',
    );
    return insertedMsg.id;
  } finally {
    await client.auth.signOut();
  }
}

async function verifyBimaActor(supabaseUrl, supabaseAnonKey, nadiaMessageId) {
  const email = 'bima.demo@learnnexus.edu';
  const client = await signInDemoActor(supabaseUrl, supabaseAnonKey, email);

  try {
    const { data: profiles, error: profilesErr } = await client
      .from('profiles')
      .select('id');
    assert.equal(profilesErr, null, 'bima profiles query must succeed');
    assert.equal((profiles ?? []).length, 2, 'bima must read 2 team profiles');
    assert.ok(
      (profiles ?? []).every((row) => row.id !== IDS.rani),
      'bima must not read Rani profile',
    );

    const { data: classes, error: classesErr } = await client
      .from('classes')
      .select('id, code');
    assert.equal(classesErr, null, 'bima classes query must succeed');
    assert.equal((classes ?? []).length, 1, 'bima must read only 1 class');
    assert.equal(classes?.[0]?.code, 'IF-4031', 'bima class must be IF-4031');

    const { data: classMembers, error: cmErr } = await client
      .from('class_members')
      .select('class_id');
    assert.equal(cmErr, null, 'bima class_members query must succeed');
    assert.equal((classMembers ?? []).length, 1, 'bima has 1 class_member row');

    const { data: teams, error: teamsErr } = await client
      .from('teams')
      .select('id, name');
    assert.equal(teamsErr, null, 'bima teams query must succeed');
    assert.equal((teams ?? []).length, 1, 'bima must read only 1 team');
    assert.equal(teams?.[0]?.name, 'Team SibukTA');

    const { data: teamMembers, error: tmErr } = await client
      .from('team_members')
      .select('team_id, user_id');
    assert.equal(tmErr, null, 'bima team_members query must succeed');
    assert.equal((teamMembers ?? []).length, 2, 'bima reads 2 Team 1 members');

    const { data: projects, error: projectsErr } = await client
      .from('projects')
      .select('id, team_id, title');
    assert.equal(projectsErr, null, 'bima projects query must succeed');
    assert.equal((projects ?? []).length, 1, 'bima must read only 1 project');
    assert.equal(projects?.[0]?.id, IDS.project1);

    assert.equal(
      await countProjectRows(client, 'tasks', IDS.project1),
      5,
      'bima must read 5 Project 1 tasks',
    );
    assert.equal(
      await countProjectRows(client, 'tasks', IDS.project2),
      0,
      'bima must read 0 Project 2 tasks',
    );
    assert.equal(
      await countProjectRows(client, 'resources', IDS.project1),
      4,
      'bima must read 4 Project 1 resources',
    );
    assert.equal(
      await countProjectRows(client, 'resources', IDS.project2),
      0,
      'bima must read 0 Project 2 resources',
    );

    const { data: layouts, error: layoutsErr } = await client
      .from('workspace_layouts')
      .select('id, team_id');
    assert.equal(layoutsErr, null, 'bima workspace_layouts query must succeed');
    assert.equal((layouts ?? []).length, 1, 'bima must read only 1 layout');
    assert.equal(layouts?.[0]?.team_id, IDS.team1);

    const { data: team1Messages, error: msg1Err } = await client
      .from('room_messages')
      .select('id, team_id')
      .eq('team_id', IDS.team1);
    assert.equal(msg1Err, null, 'bima Team 1 room_messages must succeed');
    assert.ok(
      (team1Messages ?? []).some((row) => row.id === IDS.roomMessage1),
      'bima must read Team 1 welcome message',
    );
    if (nadiaMessageId) {
      assert.ok(
        (team1Messages ?? []).some((row) => row.id === nadiaMessageId),
        'bima must read teammate Nadia room message',
      );
    }

    const { data: team2Messages, error: msg2Err } = await client
      .from('room_messages')
      .select('id')
      .eq('team_id', IDS.team2);
    assert.equal(msg2Err, null, 'bima Team 2 room_messages filter must succeed');
    assert.equal(
      (team2Messages ?? []).length,
      0,
      'bima must read 0 Team 2 room_messages',
    );

    assert.equal(
      await countProjectRows(client, 'whiteboard_notes', IDS.project1),
      2,
      'bima must read 2 Project 1 whiteboard notes',
    );
    assert.equal(
      await countProjectRows(client, 'whiteboard_notes', IDS.project2),
      0,
      'bima must read 0 Project 2 whiteboard notes',
    );
    assert.equal(
      await countProjectRows(client, 'whiteboard_strokes', IDS.project1),
      0,
      'bima must read 0 Project 1 whiteboard strokes',
    );
    assert.equal(
      await countProjectRows(client, 'whiteboard_strokes', IDS.project2),
      0,
      'bima must read 0 Project 2 whiteboard strokes',
    );

    const { data: p2Logs, error: p2LogsErr } = await client
      .from('activity_logs')
      .select('id')
      .eq('project_id', IDS.project2);
    assert.equal(p2LogsErr, null, 'bima Project 2 activity_logs query must succeed');
    assert.equal((p2Logs ?? []).length, 0, 'bima reads 0 Project 2 activity logs');

    // Authorized team member CRUD on Team 1 / Project 1 + cleanup
    const originalTitle = projects?.[0]?.title;
    try {
      const { data: updProj, error: updProjErr } = await client
        .from('projects')
        .update({ title: 'Bima member edit check' })
        .eq('id', IDS.project1)
        .select('id, title')
        .single();
      assert.equal(updProjErr, null, 'bima project update must succeed');
      assert.equal(updProj?.title, 'Bima member edit check');
    } finally {
      const { error: restProjErr } = await client
        .from('projects')
        .update({ title: originalTitle })
        .eq('id', IDS.project1);
      assert.equal(restProjErr, null, 'bima project title restore must succeed');
    }

    try {
      const { data: updatedTask, error: updateErr } = await client
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', IDS.task1_3)
        .select('id, status')
        .single();
      assert.equal(updateErr, null, 'bima task status update must succeed');
      assert.equal(updatedTask?.status, 'done');
    } finally {
      const { error: restoreErr } = await client
        .from('tasks')
        .update({ status: 'todo' })
        .eq('id', IDS.task1_3);
      assert.equal(restoreErr, null, 'bima task status restore must succeed');
    }

    let bimaTaskId = null;
    try {
      const { data: createdTask, error: createErr } = await client
        .from('tasks')
        .insert({
          project_id: IDS.project1,
          title: 'Bima temp task',
          status: 'todo',
          assignee_id: IDS.bima,
          assignee_name: 'Bima Santoso (Demo)',
        })
        .select('id')
        .single();
      assert.equal(createErr, null, 'bima task insert must succeed');
      bimaTaskId = createdTask?.id ?? null;
      assert.ok(bimaTaskId);
    } finally {
      if (bimaTaskId) {
        const { error: delErr } = await client
          .from('tasks')
          .delete()
          .eq('id', bimaTaskId);
        assert.equal(delErr, null, 'bima task delete cleanup must succeed');
      }
    }
    assert.equal(await countProjectRows(client, 'tasks', IDS.project1), 5);

    let bimaResId = null;
    try {
      const { data: createdRes, error: createResErr } = await client
        .from('resources')
        .insert({
          project_id: IDS.project1,
          title: 'Bima temp resource',
          url: 'https://example.org/bima-check',
          resource_type: 'tools',
        })
        .select('id')
        .single();
      assert.equal(createResErr, null, 'bima resource insert must succeed');
      bimaResId = createdRes?.id ?? null;
      assert.ok(bimaResId);
    } finally {
      if (bimaResId) {
        const { error: delResErr } = await client
          .from('resources')
          .delete()
          .eq('id', bimaResId);
        assert.equal(delResErr, null, 'bima resource delete cleanup must succeed');
      }
    }
    assert.equal(await countProjectRows(client, 'resources', IDS.project1), 4);

    let bimaNoteId = null;
    try {
      const { data: createdNote, error: createNoteErr } = await client
        .from('whiteboard_notes')
        .insert({
          project_id: IDS.project1,
          author_id: IDS.bima,
          author_name: 'Bima Santoso (Demo)',
          content: 'Bima temp note',
          color: 'yellow',
        })
        .select('id')
        .single();
      assert.equal(createNoteErr, null, 'bima note insert must succeed');
      bimaNoteId = createdNote?.id ?? null;
      assert.ok(bimaNoteId);
    } finally {
      if (bimaNoteId) {
        const { error: delNoteErr } = await client
          .from('whiteboard_notes')
          .delete()
          .eq('id', bimaNoteId);
        assert.equal(delNoteErr, null, 'bima note delete cleanup must succeed');
      }
    }
    assert.equal(
      await countProjectRows(client, 'whiteboard_notes', IDS.project1),
      2,
    );

    let bimaStrokeId = null;
    try {
      const { data: createdStroke, error: createStrokeErr } = await client
        .from('whiteboard_strokes')
        .insert({
          project_id: IDS.project1,
          author_id: IDS.bima,
          author_name: 'Bima Santoso (Demo)',
          color: '#30343B',
          width: 4,
          points: [
            { x: 5, y: 5 },
            { x: 20, y: 20 },
          ],
        })
        .select('id')
        .single();
      assert.equal(createStrokeErr, null, 'bima stroke insert must succeed');
      bimaStrokeId = createdStroke?.id ?? null;
      assert.ok(bimaStrokeId);
    } finally {
      if (bimaStrokeId) {
        const { error: delStrokeErr } = await client
          .from('whiteboard_strokes')
          .delete()
          .eq('id', bimaStrokeId);
        assert.equal(
          delStrokeErr,
          null,
          'bima stroke delete cleanup must succeed',
        );
      }
    }
    assert.equal(
      await countProjectRows(client, 'whiteboard_strokes', IDS.project1),
      0,
    );

    // Cross-team write isolation against Team 2 / Project 2
    const { data: p2UpdateRows, error: p2UpdateErr } = await client
      .from('projects')
      .update({ title: 'Cross-team tamper' })
      .eq('id', IDS.project2)
      .select('id');
    assert.equal(p2UpdateErr, null);
    assert.equal((p2UpdateRows ?? []).length, 0, 'bima cannot update Project 2');

    const { error: p2TaskInsertErr } = await client.from('tasks').insert({
      project_id: IDS.project2,
      title: 'Cross-team task insert',
    });
    assert.equal(
      p2TaskInsertErr?.code,
      '42501',
      'bima cannot insert task into Project 2',
    );

    const { data: p2TaskUpdateRows, error: p2TaskUpdateErr } = await client
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', IDS.task2_3)
      .select('id');
    assert.equal(p2TaskUpdateErr, null);
    assert.equal(
      (p2TaskUpdateRows ?? []).length,
      0,
      'bima cannot update Project 2 task',
    );

    const { data: p2TaskDeleteRows, error: p2TaskDeleteErr } = await client
      .from('tasks')
      .delete()
      .eq('id', IDS.task2_3)
      .select('id');
    assert.equal(p2TaskDeleteErr, null);
    assert.equal(
      (p2TaskDeleteRows ?? []).length,
      0,
      'bima cannot delete Project 2 task',
    );

    const { error: moveTaskProjectErr } = await client
      .from('tasks')
      .update({ project_id: IDS.project2 })
      .eq('id', IDS.task1_3);
    assert.equal(
      moveTaskProjectErr?.code,
      '42501',
      'bima updating tasks.project_id must fail with 42501',
    );

    const { error: moveResProjectErr } = await client
      .from('resources')
      .update({ project_id: IDS.project2 })
      .eq('id', IDS.resource1_1);
    assert.equal(
      moveResProjectErr?.code,
      '42501',
      'bima updating resources.project_id must fail with 42501',
    );

    const { error: p2ResourceInsertErr } = await client.from('resources').insert({
      project_id: IDS.project2,
      title: 'Cross-team resource',
      url: 'https://example.org',
      resource_type: 'general',
    });
    assert.equal(
      p2ResourceInsertErr?.code,
      '42501',
      'bima cannot insert resource into Project 2',
    );

    const { data: p2ResourceDeleteRows, error: p2ResourceDeleteErr } =
      await client
        .from('resources')
        .delete()
        .eq('id', IDS.resource2_1)
        .select('id');
    assert.equal(p2ResourceDeleteErr, null);
    assert.equal(
      (p2ResourceDeleteRows ?? []).length,
      0,
      'bima cannot delete Project 2 resource',
    );

    const { error: team2MsgInsertErr } = await client
      .from('room_messages')
      .insert({
        team_id: IDS.team2,
        user_id: IDS.bima,
        display_name: 'Bima Santoso (Demo)',
        body: 'Cross-team chat attempt',
      });
    assert.equal(
      team2MsgInsertErr?.code,
      '42501',
      'bima cannot insert room_messages into Team 2',
    );

    const { error: p2NoteInsertErr } = await client
      .from('whiteboard_notes')
      .insert({
        project_id: IDS.project2,
        author_id: IDS.bima,
        author_name: 'Bima Santoso (Demo)',
        content: 'Cross-team note',
        color: 'yellow',
      });
    assert.equal(
      p2NoteInsertErr?.code,
      '42501',
      'bima cannot insert whiteboard_notes into Project 2',
    );

    const { error: p2StrokeInsertErr } = await client
      .from('whiteboard_strokes')
      .insert({
        project_id: IDS.project2,
        author_id: IDS.bima,
        author_name: 'Bima Santoso (Demo)',
        color: '#30343B',
        width: 2,
        points: [
          { x: 1, y: 1 },
          { x: 10, y: 10 },
        ],
      });
    assert.equal(
      p2StrokeInsertErr?.code,
      '42501',
      'bima cannot insert whiteboard_strokes into Project 2',
    );

    const { error: bimaActivityInsertErr } = await client
      .from('activity_logs')
      .insert({
        project_id: IDS.project1,
        actor_id: IDS.bima,
        actor_name: 'Bima Santoso (Demo)',
        action: 'spoof',
        entity_type: 'task',
        summary: 'Blocked',
      });
    assert.equal(
      bimaActivityInsertErr?.code,
      '42501',
      'bima activity_logs client insert must fail with 42501',
    );

    console.log(
      'PASS [bima.demo@learnnexus.edu]: 13/13 tables verified; Team 1 CRUD + cleanup restored exact seeded counts; Team 2/Project 2 reads & writes strictly isolated',
    );
  } finally {
    await client.auth.signOut();
  }
}

async function verifyRaniActor(supabaseUrl, supabaseAnonKey) {
  const email = 'rani.demo@learnnexus.edu';
  const client = await signInDemoActor(supabaseUrl, supabaseAnonKey, email);

  try {
    const { data: profiles, error: profilesErr } = await client
      .from('profiles')
      .select('id');
    assert.equal(profilesErr, null, 'rani profiles query must not error');
    assert.equal((profiles ?? []).length, 1, 'rani reads only own profile');
    assert.equal(profiles?.[0]?.id, IDS.rani);

    for (const table of NON_PROFILE_TABLES) {
      const { data, error } = await client.from(table).select('*');
      assert.equal(error, null, `rani SELECT on ${table} must not error`);
      assert.equal(
        (data ?? []).length,
        0,
        `rani SELECT on ${table} must return 0 rows`,
      );
    }

    const { data: p1UpdateRows, error: p1UpdateErr } = await client
      .from('projects')
      .update({ title: 'Rani unauthorized edit' })
      .eq('id', IDS.project1)
      .select('id');
    assert.equal(p1UpdateErr, null);
    assert.equal((p1UpdateRows ?? []).length, 0);

    const { error: taskInsertErr } = await client.from('tasks').insert({
      project_id: IDS.project1,
      title: 'Rani blocked task',
    });
    assert.equal(taskInsertErr?.code, '42501');

    const { data: crossTaskRows, error: crossTaskErr } = await client
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', IDS.task1_3)
      .select('id');
    assert.equal(crossTaskErr, null);
    assert.equal((crossTaskRows ?? []).length, 0);

    const { data: delTaskRows, error: delTaskErr } = await client
      .from('tasks')
      .delete()
      .eq('id', IDS.task1_3)
      .select('id');
    assert.equal(delTaskErr, null);
    assert.equal((delTaskRows ?? []).length, 0);

    const { error: resInsertErr } = await client.from('resources').insert({
      project_id: IDS.project1,
      title: 'Rani blocked resource',
      url: 'https://example.org',
      resource_type: 'general',
    });
    assert.equal(resInsertErr?.code, '42501');

    const { data: delResRows, error: delResErr } = await client
      .from('resources')
      .delete()
      .eq('id', IDS.resource1_1)
      .select('id');
    assert.equal(delResErr, null);
    assert.equal((delResRows ?? []).length, 0);

    const { error: msgInsertErr } = await client.from('room_messages').insert({
      team_id: IDS.team1,
      user_id: IDS.rani,
      display_name: 'Rani Kusuma (Demo)',
      body: 'Unauthorized chat',
    });
    assert.equal(msgInsertErr?.code, '42501');

    const { error: noteInsertErr } = await client
      .from('whiteboard_notes')
      .insert({
        project_id: IDS.project1,
        author_id: IDS.rani,
        author_name: 'Rani Kusuma (Demo)',
        content: 'Unauthorized note',
        color: 'yellow',
      });
    assert.equal(noteInsertErr?.code, '42501');

    const { data: delNoteRows, error: delNoteErr } = await client
      .from('whiteboard_notes')
      .delete()
      .eq('id', IDS.note1_1)
      .select('id');
    assert.equal(delNoteErr, null);
    assert.equal((delNoteRows ?? []).length, 0);

    const { error: strokeInsertErr } = await client
      .from('whiteboard_strokes')
      .insert({
        project_id: IDS.project1,
        author_id: IDS.rani,
        author_name: 'Rani Kusuma (Demo)',
        color: '#30343B',
        width: 2,
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      });
    assert.equal(strokeInsertErr?.code, '42501');

    const { error: actInsertErr } = await client.from('activity_logs').insert({
      project_id: IDS.project1,
      actor_id: IDS.rani,
      actor_name: 'Rani Kusuma (Demo)',
      action: 'spoof',
      entity_type: 'project',
      summary: 'Blocked',
    });
    assert.equal(actInsertErr?.code, '42501');

    console.log(
      `PASS [rani.demo@learnnexus.edu]: 0 rows across ${NON_PROFILE_TABLES.length} non-profile tables; only own profile readable; all cross-team writes blocked`,
    );
  } finally {
    await client.auth.signOut();
  }
}

async function main() {
  const { supabaseUrl, supabaseAnonKey } = loadLocalEnv();
  await verifyAnonActor(supabaseUrl, supabaseAnonKey);
  const nadiaMessageId = await verifyNadiaActor(supabaseUrl, supabaseAnonKey);
  await verifyBimaActor(supabaseUrl, supabaseAnonKey, nadiaMessageId);
  await verifyRaniActor(supabaseUrl, supabaseAnonKey);
  console.log('RLS verification passed for all 4 actors across 13 tables.');
}

main().catch((err) => {
  const message =
    err instanceof Error ? err.message : 'RLS verification failed.';
  console.error(`FAIL: ${message}`);
  process.exit(1);
});
