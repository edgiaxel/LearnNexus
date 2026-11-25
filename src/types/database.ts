/**
 * Canonical Postgres row contracts and repository interface.
 * Locked on main in M0. Zero-mock rule: every method targets real Postgres/RLS.
 */

import type {
  AcademicSpace,
  AppError,
  DemoProfileKey,
  ProjectOverview,
  ResourceCategory,
  ResourceItem,
  SprintTask,
  StudentProfile,
  StudentRole,
  TaskStatus,
  TeamWorkspace,
  WorkspaceLayoutConfig,
} from './contracts';

export interface ProfileRow {
  id: string;
  display_name: string;
  role: StudentRole;
  is_demo: boolean;
  created_at: string;
}

export interface ClassRow {
  id: string;
  code: string;
  name: string;
  semester: string;
  created_at: string;
}

export interface ClassMemberRow {
  class_id: string;
  user_id: string;
  role: 'student' | 'lecturer';
}

export interface TeamRow {
  id: string;
  class_id: string;
  name: string;
  created_at: string;
}

export interface TeamMemberRow {
  team_id: string;
  user_id: string;
  role: 'member' | 'team_lead';
}

export interface ProjectRow {
  id: string;
  team_id: string;
  title: string;
  description: string;
  objectives: string[];
  updated_at: string;
}

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  due_at: string | null;
  sort_order: number;
  updated_at: string;
}

export interface ResourceRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  url: string;
  resource_type: ResourceCategory;
  created_at: string;
}

export interface WorkspaceLayoutRow {
  id: string;
  team_id: string;
  layout_key: string;
  config_json: Record<string, unknown>;
}

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export interface AuthRepository {
  getCurrentProfile(): Promise<RepositoryResult<StudentProfile | null>>;
  signInWithPassword(
    email: string,
    password: string,
  ): Promise<RepositoryResult<StudentProfile>>;
  signInAsDemoProfile(
    demoKey: DemoProfileKey,
  ): Promise<RepositoryResult<StudentProfile>>;
  signOut(): Promise<RepositoryResult<void>>;
}

export interface AcademicRepository {
  getMyAcademicSpaces(): Promise<RepositoryResult<AcademicSpace[]>>;
  getTeamWorkspace(classId: string): Promise<RepositoryResult<TeamWorkspace>>;
  getProjectOverview(teamId: string): Promise<RepositoryResult<ProjectOverview>>;
  getProjectTasks(projectId: string): Promise<RepositoryResult<SprintTask[]>>;
  getProjectResources(projectId: string): Promise<RepositoryResult<ResourceItem[]>>;
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<RepositoryResult<SprintTask>>;
  getWorkspaceLayout(
    teamId: string,
  ): Promise<RepositoryResult<WorkspaceLayoutConfig | null>>;
}
