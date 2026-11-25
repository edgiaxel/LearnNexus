import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  AcademicSpace,
  ProjectOverview,
  ResourceCategory,
  ResourceItem,
  SprintTask,
  TaskStatus,
  TeamMemberSummary,
  TeamWorkspace,
  WorkspaceLayoutConfig,
} from '../types/contracts';
import type {
  AcademicRepository,
  ClassRow,
  ProjectRow,
  RepositoryResult,
  ResourceRow,
  TaskRow,
  TeamMemberRow,
  TeamRow,
  WorkspaceLayoutRow,
} from '../types/database';
import { createAppError, mapSupabaseError } from './errorMapper';

const TASK_SELECT_COLUMNS =
  'id, project_id, title, description, status, assignee_id, assignee_name, due_at, sort_order, updated_at';

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
  classes: Pick<ClassRow, 'code' | 'name'> | Array<Pick<ClassRow, 'code' | 'name'>> | null;
}

interface TeamMemberJoinedRow {
  user_id: string;
  role: TeamMemberRow['role'];
  profiles: { id: string; display_name: string } | Array<{ id: string; display_name: string }> | null;
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

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && VALID_TASK_STATUSES.has(value as TaskStatus);
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

function mapTaskRow(row: TaskRow): SprintTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? null,
    status: isTaskStatus(row.status) ? row.status : 'todo',
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
      const [projectResult, teamResult, membersResult] = await Promise.all([
        client
          .from('projects')
          .select('id, team_id, title, description, objectives, updated_at')
          .eq('team_id', normalizedTeamId)
          .maybeSingle()
          .overrideTypes<ProjectRow, { merge: false }>(),
        client
          .from('teams')
          .select('id, name, class_id, classes(code, name)')
          .eq('id', normalizedTeamId)
          .maybeSingle()
          .overrideTypes<TeamWithClassJoinedRow, { merge: false }>(),
        client
          .from('team_members')
          .select('user_id, role, profiles(id, display_name)')
          .eq('team_id', normalizedTeamId)
          .overrideTypes<TeamMemberJoinedRow[], { merge: false }>(),
      ]);

      if (projectResult.error) {
        return {
          ok: false,
          error: mapSupabaseError(
            projectResult.error,
            'Unable to load the project overview.',
          ),
        };
      }

      if (!projectResult.data) {
        return {
          ok: false,
          error: createAppError(
            'not_found',
            'No project overview was found for this team workspace.',
            false,
          ),
        };
      }

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

      const projectRow = projectResult.data;
      const teamRow = teamResult.data;
      const classRow = unwrapSingle(teamRow?.classes);

      const objectives = Array.isArray(projectRow.objectives)
        ? projectRow.objectives.filter(
            (item): item is string => typeof item === 'string',
          )
        : [];

      const teamMembers: TeamMemberSummary[] = (membersResult.data ?? []).map(
        (member) => {
          const profile = unwrapSingle(member.profiles);
          return {
            userId: member.user_id,
            displayName: profile?.display_name ?? 'Team member',
            role: member.role === 'team_lead' ? 'team_lead' : 'member',
          };
        },
      );

      teamMembers.sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === 'team_lead' ? -1 : 1;
        }
        return a.displayName.localeCompare(b.displayName);
      });

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
          teamMembers,
          updatedAt: projectRow.updated_at,
        },
      };
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
        .select('id, project_id, title, description, url, resource_type, created_at')
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

    try {
      const { data, error } = await clientCheck.client
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
          layoutKey: data.layout_key,
          configJson: isPlainRecord(data.config_json) ? data.config_json : {},
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
}

export const academicService: AcademicRepository =
  new SupabaseAcademicRepository();
