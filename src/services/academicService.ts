import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  AcademicSpace,
  ActivityEntityType,
  ActivityLogItem,
  ProjectOverview,
  ProjectUpdateInput,
  ResourceCategory,
  ResourceCreateInput,
  ResourceItem,
  RoomMessage,
  SprintTask,
  TaskCreateInput,
  TaskStatus,
  TaskUpdateInput,
  TeamMemberSummary,
  TeamWorkspace,
  WhiteboardNote,
  WhiteboardNoteColor,
  WhiteboardNoteCreateInput,
  WhiteboardPenColor,
  WhiteboardStroke,
  WhiteboardStrokeCreateInput,
  WhiteboardStrokeWidth,
  WorkspaceLayoutConfig,
} from '../types/contracts';
import type {
  AcademicRepository,
  ActivityLogRow,
  ClassRow,
  ProjectRow,
  RepositoryResult,
  ResourceRow,
  RoomMessageRow,
  TaskRow,
  TeamMemberRow,
  TeamRow,
  WhiteboardNoteRow,
  WhiteboardStrokeRow,
  WorkspaceLayoutRow,
} from '../types/database';
import { createAppError, mapSupabaseError } from './errorMapper';
import { normalizeStrokePoints } from './realtimeUtils';

const TASK_SELECT_COLUMNS =
  'id, project_id, title, description, status, assignee_id, assignee_name, due_at, sort_order, updated_at';

const RESOURCE_SELECT_COLUMNS =
  'id, project_id, title, description, url, resource_type, created_at';

const WHITEBOARD_NOTE_SELECT_COLUMNS =
  'id, project_id, author_id, author_name, content, color, created_at, updated_at';

const WHITEBOARD_STROKE_SELECT_COLUMNS =
  'id, project_id, author_id, author_name, color, width, points, created_at';

const ROOM_MESSAGE_SELECT_COLUMNS =
  'id, team_id, user_id, display_name, body, created_at';

const ACTIVITY_LOG_SELECT_COLUMNS =
  'id, project_id, actor_id, actor_name, action, entity_type, summary, created_at';

const VALID_TASK_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'todo',
  'in_progress',
  'done',
]);

const VALID_RESOURCE_CATEGORIES: ReadonlySet<ResourceCategory> = new Set([
  'docs',
  'design',
  'tools',
  'general',
]);

const VALID_NOTE_COLORS: ReadonlySet<WhiteboardNoteColor> = new Set([
  'yellow',
  'sage',
  'lavender',
  'peach',
]);

const VALID_PEN_COLORS: ReadonlySet<WhiteboardPenColor> = new Set([
  '#30343B',
  '#4A6B46',
  '#7C4520',
  '#8E2F29',
]);

const VALID_ACTIVITY_ENTITY_TYPES: ReadonlySet<ActivityEntityType> = new Set([
  'project',
  'task',
  'resource',
  'whiteboard',
]);

const SESSION_EXPIRED_MESSAGE =
  'Your authentication session has expired. Please sign in again.';

type ClassSummaryRow = Pick<ClassRow, 'id' | 'code' | 'name' | 'semester'>;
type TeamSummaryRow = Pick<TeamRow, 'id' | 'class_id' | 'name'>;

interface ClassMembershipJoinedRow {
  class_id: string;
  role: 'student' | 'lecturer';
  classes: ClassSummaryRow | ClassSummaryRow[] | null;
}

interface TeamWithClassJoinedRow {
  id: string;
  name: string;
  class_id: string;
  classes:
    | Pick<ClassRow, 'code' | 'name'>
    | Array<Pick<ClassRow, 'code' | 'name'>>
    | null;
}

interface TeamMemberJoinedRow {
  user_id: string;
  role: TeamMemberRow['role'];
  profiles:
    | { id: string; display_name: string }
    | Array<{ id: string; display_name: string }>
    | null;
}

function requireSupabaseClient():
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: ReturnType<typeof createAppError> } {
  if (!supabase) {
    return {
      ok: false,
      error: createAppError(
        'network',
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect.',
        true,
      ),
    };
  }
  return { ok: true, client: supabase };
}

async function requireActiveSession(
  client: SupabaseClient,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: ReturnType<typeof createAppError> }
> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    return {
      ok: false,
      error: createAppError('auth', SESSION_EXPIRED_MESSAGE, false),
    };
  }
  return { ok: true, userId: sessionData.session.user.id };
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeWorkspaceConfigJson(
  value: unknown,
): Record<string, unknown> {
  if (isPlainRecord(value)) {
    return { ...value };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isPlainRecord(parsed)) {
          return { ...parsed };
        }
      } catch {
        return {};
      }
    }
  }

  return {};
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === 'string' && VALID_TASK_STATUSES.has(value as TaskStatus)
  );
}

function normalizeResourceCategory(value: unknown): ResourceCategory {
  if (
    typeof value === 'string' &&
    VALID_RESOURCE_CATEGORIES.has(value as ResourceCategory)
  ) {
    return value as ResourceCategory;
  }
  return 'general';
}

function isResourceCategory(value: unknown): value is ResourceCategory {
  return (
    typeof value === 'string' &&
    VALID_RESOURCE_CATEGORIES.has(value as ResourceCategory)
  );
}

function isWhiteboardNoteColor(value: unknown): value is WhiteboardNoteColor {
  return (
    typeof value === 'string' &&
    VALID_NOTE_COLORS.has(value as WhiteboardNoteColor)
  );
}

function normalizeNoteColor(value: unknown): WhiteboardNoteColor {
  return isWhiteboardNoteColor(value) ? value : 'yellow';
}

function isWhiteboardPenColor(value: unknown): value is WhiteboardPenColor {
  return (
    typeof value === 'string' &&
    VALID_PEN_COLORS.has(value as WhiteboardPenColor)
  );
}

function normalizePenColor(value: unknown): WhiteboardPenColor {
  return isWhiteboardPenColor(value) ? value : '#30343B';
}

function normalizeStrokeWidth(value: unknown): WhiteboardStrokeWidth {
  return value === 4 ? 4 : 2;
}

function normalizeActivityEntityType(value: unknown): ActivityEntityType {
  if (
    typeof value === 'string' &&
    VALID_ACTIVITY_ENTITY_TYPES.has(value as ActivityEntityType)
  ) {
    return value as ActivityEntityType;
  }
  return 'project';
}

function normalizeOptionalDueAt(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: ReturnType<typeof createAppError> } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }
  const parsedMs = Date.parse(trimmed);
  if (Number.isNaN(parsedMs)) {
    return {
      ok: false,
      error: createAppError(
        'validation',
        'Due date must be a valid calendar date.',
        false,
      ),
    };
  }
  return { ok: true, value: new Date(parsedMs).toISOString() };
}

function normalizeSafeHttpUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (!parsed.hostname) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function mapTaskRow(row: TaskRow): SprintTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? null,
    status: isTaskStatus(row.status) ? row.status : 'todo',
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_name ?? null,
    dueAt: row.due_at ?? null,
    updatedAt: row.updated_at,
  };
}

function mapResourceRow(row: ResourceRow): ResourceItem {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? null,
    url: row.url,
    category: normalizeResourceCategory(row.resource_type),
    createdAt: row.created_at,
  };
}

function mapRoomMessageRow(row: RoomMessageRow): RoomMessage {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    displayName: row.display_name,
    body: row.body.replace(/\u2014/g, '-'),
    createdAt: row.created_at,
  };
}

function mapWhiteboardNoteRow(row: WhiteboardNoteRow): WhiteboardNote {
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id ?? null,
    authorName: row.author_name,
    content: row.content,
    color: normalizeNoteColor(row.color),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWhiteboardStrokeRow(row: WhiteboardStrokeRow): WhiteboardStroke {
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id ?? null,
    authorName: row.author_name,
    color: normalizePenColor(row.color),
    width: normalizeStrokeWidth(row.width),
    points: Array.isArray(row.points) ? normalizeStrokePoints(row.points) : [],
    createdAt: row.created_at,
  };
}

function mapActivityLogRow(row: ActivityLogRow): ActivityLogItem {
  return {
    id: row.id,
    projectId: row.project_id,
    actorId: row.actor_id ?? null,
    actorName: row.actor_name,
    action: row.action,
    entityType: normalizeActivityEntityType(row.entity_type),
    summary: row.summary.replace(/\u2014/g, '-'),
    createdAt: row.created_at,
  };
}

function mapAndSortTeamMembers(
  rows: TeamMemberJoinedRow[] | null | undefined,
): TeamMemberSummary[] {
  const teamMembers: TeamMemberSummary[] = (rows ?? []).map((member) => {
    const profile = unwrapSingle(member.profiles);
    return {
      userId: member.user_id,
      displayName: profile?.display_name ?? 'Team member',
      role: member.role === 'team_lead' ? 'team_lead' : 'member',
    };
  });

  teamMembers.sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === 'team_lead' ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return teamMembers;
}

async function hydrateProjectOverview(
  client: SupabaseClient,
  projectRow: ProjectRow,
): Promise<RepositoryResult<ProjectOverview>> {
  const [teamResult, membersResult] = await Promise.all([
    client
      .from('teams')
      .select('id, name, class_id, classes(code, name)')
      .eq('id', projectRow.team_id)
      .maybeSingle()
      .overrideTypes<TeamWithClassJoinedRow, { merge: false }>(),
    client
      .from('team_members')
      .select('user_id, role, profiles(id, display_name)')
      .eq('team_id', projectRow.team_id)
      .overrideTypes<TeamMemberJoinedRow[], { merge: false }>(),
  ]);

  if (teamResult.error) {
    return {
      ok: false,
      error: mapSupabaseError(
        teamResult.error,
        'Unable to load team metadata for this project.',
      ),
    };
  }

  if (membersResult.error) {
    return {
      ok: false,
      error: mapSupabaseError(
        membersResult.error,
        'Unable to load team members for this project.',
      ),
    };
  }

  const teamRow = teamResult.data;
  const classRow = unwrapSingle(teamRow?.classes);
  const objectives = Array.isArray(projectRow.objectives)
    ? projectRow.objectives.filter(
        (item): item is string => typeof item === 'string',
      )
    : [];

  return {
    ok: true,
    data: {
      id: projectRow.id,
      teamId: projectRow.team_id,
      title: projectRow.title,
      description: projectRow.description,
      objectives,
      courseCode: classRow?.code,
      courseName: classRow?.name,
      teamName: teamRow?.name,
      teamMembers: mapAndSortTeamMembers(membersResult.data),
      updatedAt: projectRow.updated_at,
    },
  };
}

export class SupabaseAcademicRepository implements AcademicRepository {
  async getMyAcademicSpaces(): Promise<RepositoryResult<AcademicSpace[]>> {
    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) {
        return {
          ok: false,
          error: mapSupabaseError(
            userError,
            'Your session could not be verified. Please sign in again.',
          ),
        };
      }

      if (!userData.user) {
        return {
          ok: false,
          error: createAppError(
            'auth',
            'Please sign in to view your assigned academic spaces.',
            false,
          ),
        };
      }

      const { data: membershipRows, error: membershipError } = await client
        .from('class_members')
        .select('class_id, role, classes(id, code, name, semester)')
        .eq('user_id', userData.user.id)
        .overrideTypes<ClassMembershipJoinedRow[], { merge: false }>();

      if (membershipError) {
        return {
          ok: false,
          error: mapSupabaseError(
            membershipError,
            'Unable to load your enrolled classes.',
          ),
        };
      }

      const enrolledClasses: ClassSummaryRow[] = [];
      for (const row of membershipRows ?? []) {
        const classInfo = unwrapSingle(row.classes);
        if (classInfo) {
          enrolledClasses.push(classInfo);
        }
      }

      if (enrolledClasses.length === 0) {
        return { ok: true, data: [] };
      }

      const classIds = enrolledClasses.map((item) => item.id);
      const { data: teamRows, error: teamError } = await client
        .from('teams')
        .select('id, class_id, name')
        .in('class_id', classIds)
        .order('created_at', { ascending: true })
        .overrideTypes<TeamSummaryRow[], { merge: false }>();

      if (teamError) {
        return {
          ok: false,
          error: mapSupabaseError(
            teamError,
            'Unable to load team assignments for your enrolled classes.',
          ),
        };
      }

      const teamByClassId = new Map<string, TeamSummaryRow>();
      for (const team of teamRows ?? []) {
        if (!teamByClassId.has(team.class_id)) {
          teamByClassId.set(team.class_id, team);
        }
      }

      const spaces: AcademicSpace[] = [];
      for (const course of enrolledClasses) {
        const assignedTeam = teamByClassId.get(course.id);
        if (!assignedTeam) continue;

        spaces.push({
          id: course.id,
          code: course.code,
          name: course.name,
          semester: course.semester,
          teamId: assignedTeam.id,
          teamName: assignedTeam.name,
        });
      }

      spaces.sort((a, b) => a.code.localeCompare(b.code));
      return { ok: true, data: spaces };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load your academic spaces right now.',
        ),
      };
    }
  }

  async getTeamWorkspace(
    classId: string,
  ): Promise<RepositoryResult<TeamWorkspace>> {
    const normalizedClassId = classId.trim();
    if (normalizedClassId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid academic class identifier is required.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const { data: classRow, error: classError } = await client
        .from('classes')
        .select('id, code, name')
        .eq('id', normalizedClassId)
        .maybeSingle()
        .overrideTypes<Pick<ClassRow, 'id' | 'code' | 'name'>, { merge: false }>();

      if (classError) {
        return {
          ok: false,
          error: mapSupabaseError(
            classError,
            'Unable to load the selected academic space.',
          ),
        };
      }

      if (!classRow) {
        return {
          ok: false,
          error: createAppError(
            'not_found',
            'This academic space was not found or you are not enrolled in it.',
            false,
          ),
        };
      }

      const { data: teamRow, error: teamError } = await client
        .from('teams')
        .select('id, class_id, name')
        .eq('class_id', classRow.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
        .overrideTypes<TeamSummaryRow, { merge: false }>();

      if (teamError) {
        return {
          ok: false,
          error: mapSupabaseError(
            teamError,
            'Unable to load your team assignment for this academic space.',
          ),
        };
      }

      if (!teamRow) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'You do not have an assigned team workspace in this academic space.',
            false,
          ),
        };
      }

      const { data: projectRow, error: projectError } = await client
        .from('projects')
        .select('id')
        .eq('team_id', teamRow.id)
        .maybeSingle()
        .overrideTypes<Pick<ProjectRow, 'id'>, { merge: false }>();

      if (projectError) {
        return {
          ok: false,
          error: mapSupabaseError(
            projectError,
            'Unable to resolve the team project for this workspace.',
          ),
        };
      }

      return {
        ok: true,
        data: {
          teamId: teamRow.id,
          teamName: teamRow.name,
          classId: classRow.id,
          classCode: classRow.code,
          className: classRow.name,
          projectId: projectRow?.id ?? null,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load the team workspace right now.',
        ),
      };
    }
  }

  async getTeamMembers(
    teamId: string,
  ): Promise<RepositoryResult<TeamMemberSummary[]>> {
    const normalizedTeamId = teamId.trim();
    if (normalizedTeamId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid team identifier is required to load team members.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('team_members')
        .select('user_id, role, profiles(id, display_name)')
        .eq('team_id', normalizedTeamId)
        .overrideTypes<TeamMemberJoinedRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load team members for this workspace.',
          ),
        };
      }

      return {
        ok: true,
        data: mapAndSortTeamMembers(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load team members right now.',
        ),
      };
    }
  }

  async getProjectOverview(
    teamId: string,
  ): Promise<RepositoryResult<ProjectOverview>> {
    const normalizedTeamId = teamId.trim();
    if (normalizedTeamId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid team identifier is required.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const { data: projectRow, error: projectError } = await client
        .from('projects')
        .select('id, team_id, title, description, objectives, updated_at')
        .eq('team_id', normalizedTeamId)
        .maybeSingle()
        .overrideTypes<ProjectRow, { merge: false }>();

      if (projectError) {
        return {
          ok: false,
          error: mapSupabaseError(
            projectError,
            'Unable to load the project overview.',
          ),
        };
      }

      if (!projectRow) {
        return {
          ok: false,
          error: createAppError(
            'not_found',
            'No project overview was found for this team workspace.',
            false,
          ),
        };
      }

      return await hydrateProjectOverview(client, projectRow);
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load the project overview right now.',
        ),
      };
    }
  }

  async updateProjectOverview(
    projectId: string,
    input: ProjectUpdateInput,
  ): Promise<RepositoryResult<ProjectOverview>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to update the overview.',
          false,
        ),
      };
    }

    const title = input.title.trim();
    if (title.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Project title is required.',
          false,
        ),
      };
    }

    const description = input.description.trim();
    const objectives = Array.isArray(input.objectives)
      ? input.objectives
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data: projectRow, error } = await client
        .from('projects')
        .update({ title, description, objectives })
        .eq('id', normalizedProjectId)
        .select('id, team_id, title, description, objectives, updated_at')
        .maybeSingle()
        .overrideTypes<ProjectRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to save project overview changes.',
          ),
        };
      }

      if (!projectRow) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Project update was not applied. The project was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return await hydrateProjectOverview(client, projectRow);
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to save project overview changes right now.',
        ),
      };
    }
  }

  async getProjectTasks(
    projectId: string,
  ): Promise<RepositoryResult<SprintTask[]>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to load sprint tasks.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('tasks')
        .select(TASK_SELECT_COLUMNS)
        .eq('project_id', normalizedProjectId)
        .order('sort_order', { ascending: true })
        .order('updated_at', { ascending: false })
        .overrideTypes<TaskRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load sprint tasks for this project.',
          ),
        };
      }

      return {
        ok: true,
        data: (data ?? []).map(mapTaskRow),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load sprint tasks right now.',
        ),
      };
    }
  }

  async createTask(
    input: TaskCreateInput,
  ): Promise<RepositoryResult<SprintTask>> {
    const projectId = input.projectId.trim();
    if (projectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to create a task.',
          false,
        ),
      };
    }

    const title = input.title.trim();
    if (title.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Task title is required.',
          false,
        ),
      };
    }

    if (!isTaskStatus(input.status)) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Task status must be To Do, In Progress, or Done.',
          false,
        ),
      };
    }

    const dueCheck = normalizeOptionalDueAt(input.dueAt);
    if (!dueCheck.ok) {
      return { ok: false, error: dueCheck.error };
    }

    const description = input.description
      ? input.description.trim() || null
      : null;
    const assigneeId = input.assigneeId
      ? input.assigneeId.trim() || null
      : null;
    const assigneeName = input.assigneeName
      ? input.assigneeName.trim() || null
      : null;

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('tasks')
        .insert({
          project_id: projectId,
          title,
          description,
          status: input.status,
          assignee_id: assigneeId,
          assignee_name: assigneeName,
          due_at: dueCheck.value,
          sort_order: 0,
        })
        .select(TASK_SELECT_COLUMNS)
        .single()
        .overrideTypes<TaskRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to create this sprint task.'),
        };
      }

      return {
        ok: true,
        data: mapTaskRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to create this sprint task right now.',
        ),
      };
    }
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<RepositoryResult<SprintTask>> {
    const normalizedTaskId = taskId.trim();
    if (normalizedTaskId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid task identifier is required to update status.',
          false,
        ),
      };
    }

    if (!isTaskStatus(status)) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Task status must be To Do, In Progress, or Done.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('tasks')
        .update({ status })
        .eq('id', normalizedTaskId)
        .select(TASK_SELECT_COLUMNS)
        .maybeSingle()
        .overrideTypes<TaskRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to save the updated task status.',
          ),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Task status update was not applied. The task was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return {
        ok: true,
        data: mapTaskRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to save the task status update right now.',
        ),
      };
    }
  }

  async updateTask(
    taskId: string,
    input: TaskUpdateInput,
  ): Promise<RepositoryResult<SprintTask>> {
    const normalizedTaskId = taskId.trim();
    if (normalizedTaskId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid task identifier is required to update the task.',
          false,
        ),
      };
    }

    const patch: Record<string, unknown> = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length === 0) {
        return {
          ok: false,
          error: createAppError(
            'validation',
            'Task title cannot be empty.',
            false,
          ),
        };
      }
      patch.title = title;
    }

    if (input.description !== undefined) {
      patch.description = input.description
        ? input.description.trim() || null
        : null;
    }

    if (input.status !== undefined) {
      if (!isTaskStatus(input.status)) {
        return {
          ok: false,
          error: createAppError(
            'validation',
            'Task status must be To Do, In Progress, or Done.',
            false,
          ),
        };
      }
      patch.status = input.status;
    }

    if (input.assigneeId !== undefined) {
      patch.assignee_id = input.assigneeId
        ? input.assigneeId.trim() || null
        : null;
    }

    if (input.assigneeName !== undefined) {
      patch.assignee_name = input.assigneeName
        ? input.assigneeName.trim() || null
        : null;
    }

    if (input.dueAt !== undefined) {
      const dueCheck = normalizeOptionalDueAt(input.dueAt);
      if (!dueCheck.ok) {
        return { ok: false, error: dueCheck.error };
      }
      patch.due_at = dueCheck.value;
    }

    if (Object.keys(patch).length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'No task updates were provided.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('tasks')
        .update(patch)
        .eq('id', normalizedTaskId)
        .select(TASK_SELECT_COLUMNS)
        .maybeSingle()
        .overrideTypes<TaskRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to save task updates.'),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Task update was not applied. The task was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return {
        ok: true,
        data: mapTaskRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to save task updates right now.',
        ),
      };
    }
  }

  async deleteTask(taskId: string): Promise<RepositoryResult<void>> {
    const normalizedTaskId = taskId.trim();
    if (normalizedTaskId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid task identifier is required to delete a task.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('tasks')
        .delete()
        .eq('id', normalizedTaskId)
        .select('id')
        .maybeSingle()
        .overrideTypes<Pick<TaskRow, 'id'>, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to delete this task.'),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Task could not be deleted. It was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(err, 'Unable to delete this task right now.'),
      };
    }
  }

  async getProjectResources(
    projectId: string,
  ): Promise<RepositoryResult<ResourceItem[]>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to load resources.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('resources')
        .select(RESOURCE_SELECT_COLUMNS)
        .eq('project_id', normalizedProjectId)
        .order('created_at', { ascending: true })
        .overrideTypes<ResourceRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load resources for this project.',
          ),
        };
      }

      return {
        ok: true,
        data: (data ?? []).map(mapResourceRow),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load project resources right now.',
        ),
      };
    }
  }

  async createResource(
    input: ResourceCreateInput,
  ): Promise<RepositoryResult<ResourceItem>> {
    const projectId = input.projectId.trim();
    if (projectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to add a resource.',
          false,
        ),
      };
    }

    const title = input.title.trim();
    if (title.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Resource title is required.',
          false,
        ),
      };
    }

    const safeUrl = normalizeSafeHttpUrl(input.url);
    if (!safeUrl) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Resource URL must be a valid http:// or https:// web address.',
          false,
        ),
      };
    }

    if (!isResourceCategory(input.category)) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Resource category must be Docs, Design, Tools, or General.',
          false,
        ),
      };
    }

    const description = input.description
      ? input.description.trim() || null
      : null;

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('resources')
        .insert({
          project_id: projectId,
          title,
          description,
          url: safeUrl,
          resource_type: input.category,
        })
        .select(RESOURCE_SELECT_COLUMNS)
        .single()
        .overrideTypes<ResourceRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to save this resource link.'),
        };
      }

      return {
        ok: true,
        data: mapResourceRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to save this resource link right now.',
        ),
      };
    }
  }

  async deleteResource(resourceId: string): Promise<RepositoryResult<void>> {
    const normalizedResourceId = resourceId.trim();
    if (normalizedResourceId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid resource identifier is required to delete a resource.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('resources')
        .delete()
        .eq('id', normalizedResourceId)
        .select('id')
        .maybeSingle()
        .overrideTypes<Pick<ResourceRow, 'id'>, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to remove this resource.'),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Resource could not be removed. It was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to remove this resource right now.',
        ),
      };
    }
  }

  async getWorkspaceLayout(
    teamId: string,
  ): Promise<RepositoryResult<WorkspaceLayoutConfig | null>> {
    const normalizedTeamId = teamId.trim();
    if (normalizedTeamId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid team identifier is required to load workspace layout.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('workspace_layouts')
        .select('id, team_id, layout_key, config_json')
        .eq('team_id', normalizedTeamId)
        .maybeSingle()
        .overrideTypes<WorkspaceLayoutRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load workspace layout configuration.',
          ),
        };
      }

      if (!data) {
        return { ok: true, data: null };
      }

      return {
        ok: true,
        data: {
          id: data.id,
          teamId: data.team_id,
          layoutKey: typeof data.layout_key === 'string' ? data.layout_key : '',
          configJson: normalizeWorkspaceConfigJson(data.config_json),
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load workspace layout configuration right now.',
        ),
      };
    }
  }

  async getProjectActivity(
    projectId: string,
    limit = 20,
  ): Promise<RepositoryResult<ActivityLogItem[]>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to load project activity.',
          false,
        ),
      };
    }

    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.trunc(limit), 1), 100)
      : 20;

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('activity_logs')
        .select(ACTIVITY_LOG_SELECT_COLUMNS)
        .eq('project_id', normalizedProjectId)
        .order('created_at', { ascending: false })
        .limit(safeLimit)
        .overrideTypes<ActivityLogRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load recent project activity.',
          ),
        };
      }

      return {
        ok: true,
        data: (data ?? []).map(mapActivityLogRow),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load recent project activity right now.',
        ),
      };
    }
  }

  async getRoomMessages(
    teamId: string,
    limit = 50,
  ): Promise<RepositoryResult<RoomMessage[]>> {
    const normalizedTeamId = teamId.trim();
    if (normalizedTeamId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid team identifier is required to load studio chat messages.',
          false,
        ),
      };
    }

    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.trunc(limit), 1), 200)
      : 50;

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('room_messages')
        .select(ROOM_MESSAGE_SELECT_COLUMNS)
        .eq('team_id', normalizedTeamId)
        .order('created_at', { ascending: false })
        .limit(safeLimit)
        .overrideTypes<RoomMessageRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load studio chat messages.',
          ),
        };
      }

      return {
        ok: true,
        data: (data ?? []).map(mapRoomMessageRow).reverse(),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load studio chat messages right now.',
        ),
      };
    }
  }

  async sendRoomMessage(
    teamId: string,
    displayName: string,
    body: string,
  ): Promise<RepositoryResult<RoomMessage>> {
    const normalizedTeamId = teamId.trim();
    if (normalizedTeamId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid team identifier is required to send a chat message.',
          false,
        ),
      };
    }

    const normalizedBody = body.replace(/\u2014/g, '-').trim();
    if (normalizedBody.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Chat message cannot be empty.',
          false,
        ),
      };
    }

    if (normalizedBody.length > 500) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Chat message must be 500 characters or fewer.',
          false,
        ),
      };
    }

    const normalizedDisplayName = displayName.trim() || 'Team member';

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('room_messages')
        .insert({
          team_id: normalizedTeamId,
          user_id: sessionCheck.userId,
          display_name: normalizedDisplayName,
          body: normalizedBody,
        })
        .select(ROOM_MESSAGE_SELECT_COLUMNS)
        .single()
        .overrideTypes<RoomMessageRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to send studio chat message.'),
        };
      }

      return {
        ok: true,
        data: mapRoomMessageRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to send studio chat message right now.',
        ),
      };
    }
  }

  async getWhiteboardNotes(
    projectId: string,
  ): Promise<RepositoryResult<WhiteboardNote[]>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to load whiteboard notes.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('whiteboard_notes')
        .select(WHITEBOARD_NOTE_SELECT_COLUMNS)
        .eq('project_id', normalizedProjectId)
        .order('created_at', { ascending: false })
        .overrideTypes<WhiteboardNoteRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load whiteboard sticky notes.',
          ),
        };
      }

      return {
        ok: true,
        data: (data ?? []).map(mapWhiteboardNoteRow),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load whiteboard sticky notes right now.',
        ),
      };
    }
  }

  async createWhiteboardNote(
    input: WhiteboardNoteCreateInput,
  ): Promise<RepositoryResult<WhiteboardNote>> {
    const projectId = input.projectId.trim();
    if (projectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to post a whiteboard note.',
          false,
        ),
      };
    }

    const content = input.content.trim();
    if (content.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Sticky note text cannot be empty.',
          false,
        ),
      };
    }

    if (content.length > 400) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Sticky note text must be 400 characters or fewer.',
          false,
        ),
      };
    }

    if (!isWhiteboardNoteColor(input.color)) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Sticky note color must be yellow, sage, lavender, or peach.',
          false,
        ),
      };
    }

    const authorName = input.authorName.trim() || 'Team member';

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('whiteboard_notes')
        .insert({
          project_id: projectId,
          author_id: sessionCheck.userId,
          author_name: authorName,
          content,
          color: input.color,
        })
        .select(WHITEBOARD_NOTE_SELECT_COLUMNS)
        .single()
        .overrideTypes<WhiteboardNoteRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to post this sticky note.',
          ),
        };
      }

      return {
        ok: true,
        data: mapWhiteboardNoteRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to post this sticky note right now.',
        ),
      };
    }
  }

  async updateWhiteboardNote(
    noteId: string,
    content: string,
    color: WhiteboardNoteColor,
  ): Promise<RepositoryResult<WhiteboardNote>> {
    const normalizedNoteId = noteId.trim();
    if (normalizedNoteId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid sticky note identifier is required to update a note.',
          false,
        ),
      };
    }

    const normalizedContent = content.trim();
    if (normalizedContent.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Sticky note text cannot be empty.',
          false,
        ),
      };
    }

    if (normalizedContent.length > 400) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Sticky note text must be 400 characters or fewer.',
          false,
        ),
      };
    }

    if (!isWhiteboardNoteColor(color)) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Sticky note color must be yellow, sage, lavender, or peach.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('whiteboard_notes')
        .update({ content: normalizedContent, color })
        .eq('id', normalizedNoteId)
        .select(WHITEBOARD_NOTE_SELECT_COLUMNS)
        .maybeSingle()
        .overrideTypes<WhiteboardNoteRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to update this sticky note.'),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Sticky note update was not applied. It was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return {
        ok: true,
        data: mapWhiteboardNoteRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to update this sticky note right now.',
        ),
      };
    }
  }

  async deleteWhiteboardNote(noteId: string): Promise<RepositoryResult<void>> {
    const normalizedNoteId = noteId.trim();
    if (normalizedNoteId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid sticky note identifier is required to delete a note.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('whiteboard_notes')
        .delete()
        .eq('id', normalizedNoteId)
        .select('id')
        .maybeSingle()
        .overrideTypes<Pick<WhiteboardNoteRow, 'id'>, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(error, 'Unable to remove this sticky note.'),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Sticky note could not be removed. It was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to remove this sticky note right now.',
        ),
      };
    }
  }

  async getWhiteboardStrokes(
    projectId: string,
  ): Promise<RepositoryResult<WhiteboardStroke[]>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to load whiteboard strokes.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client
        .from('whiteboard_strokes')
        .select(WHITEBOARD_STROKE_SELECT_COLUMNS)
        .eq('project_id', normalizedProjectId)
        .order('created_at', { ascending: true })
        .overrideTypes<WhiteboardStrokeRow[], { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to load whiteboard sketches.',
          ),
        };
      }

      return {
        ok: true,
        data: (data ?? []).map(mapWhiteboardStrokeRow),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to load whiteboard sketches right now.',
        ),
      };
    }
  }

  async createWhiteboardStroke(
    input: WhiteboardStrokeCreateInput,
  ): Promise<RepositoryResult<WhiteboardStroke>> {
    const projectId = input.projectId.trim();
    if (projectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to save a whiteboard stroke.',
          false,
        ),
      };
    }

    if (!isWhiteboardPenColor(input.color)) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Selected pen color is not supported on the whiteboard.',
          false,
        ),
      };
    }

    if (input.width !== 2 && input.width !== 4) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Pen stroke width must be 2 or 4 pixels.',
          false,
        ),
      };
    }

    const normalizedPoints = normalizeStrokePoints(input.points);
    if (normalizedPoints.length < 2) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Whiteboard strokes must contain at least 2 points.',
          false,
        ),
      };
    }

    const authorName = input.authorName.trim() || 'Team member';

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('whiteboard_strokes')
        .insert({
          project_id: projectId,
          author_id: sessionCheck.userId,
          author_name: authorName,
          color: input.color,
          width: input.width,
          points: normalizedPoints,
        })
        .select(WHITEBOARD_STROKE_SELECT_COLUMNS)
        .single()
        .overrideTypes<WhiteboardStrokeRow, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to save this whiteboard stroke.',
          ),
        };
      }

      return {
        ok: true,
        data: mapWhiteboardStrokeRow(data),
      };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to save this whiteboard stroke right now.',
        ),
      };
    }
  }

  async deleteWhiteboardStroke(
    strokeId: string,
  ): Promise<RepositoryResult<void>> {
    const normalizedStrokeId = strokeId.trim();
    if (normalizedStrokeId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid stroke identifier is required to undo a stroke.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { data, error } = await client
        .from('whiteboard_strokes')
        .delete()
        .eq('id', normalizedStrokeId)
        .select('id')
        .maybeSingle()
        .overrideTypes<Pick<WhiteboardStrokeRow, 'id'>, { merge: false }>();

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to remove this whiteboard stroke.',
          ),
        };
      }

      if (!data) {
        return {
          ok: false,
          error: createAppError(
            'forbidden',
            'Whiteboard stroke could not be removed. It was not found or your account lacks permission.',
            false,
          ),
        };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to remove this whiteboard stroke right now.',
        ),
      };
    }
  }

  async clearWhiteboardStrokes(
    projectId: string,
  ): Promise<RepositoryResult<void>> {
    const normalizedProjectId = projectId.trim();
    if (normalizedProjectId.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'A valid project identifier is required to clear the whiteboard.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    const client = clientCheck.client;

    try {
      const sessionCheck = await requireActiveSession(client);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.error };
      }

      const { error } = await client
        .from('whiteboard_strokes')
        .delete()
        .eq('project_id', normalizedProjectId);

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to clear whiteboard strokes.',
          ),
        };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to clear whiteboard strokes right now.',
        ),
      };
    }
  }
}

export const academicService: AcademicRepository =
  new SupabaseAcademicRepository();
