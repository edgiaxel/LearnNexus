/**
 * Shared domain, UI state, and Phaser-React event bridge contracts.
 * Locked on main in M0. Feature worktrees must import without modifying.
 */

export type AppRoute = 'entry' | 'spaces' | 'workspace';

export type WorkstationId = 'overview' | 'tasks' | 'resources';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type ResourceCategory = 'docs' | 'design' | 'tools' | 'general';

export type StudentRole = 'student' | 'team_lead' | 'guest_demo';

export interface StudentProfile {
  id: string;
  displayName: string;
  role: StudentRole;
  isDemo: boolean;
}

export interface AcademicSpace {
  id: string;
  code: string;
  name: string;
  semester: string;
  teamId: string;
  teamName: string;
}

export interface TeamWorkspace {
  teamId: string;
  teamName: string;
  classId: string;
  classCode: string;
  className: string;
  projectId: string | null;
}

export interface ProjectOverview {
  id: string;
  teamId: string;
  title: string;
  description: string;
  objectives: string[];
  updatedAt: string;
}

export interface SprintTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeName: string | null;
  dueAt: string | null;
  updatedAt: string;
}

export interface ResourceItem {
  id: string;
  projectId: string;
  title: string;
  url: string;
  category: ResourceCategory;
  createdAt: string;
}

export interface WorkspaceLayoutConfig {
  id: string;
  teamId: string;
  layoutKey: string;
  configJson: Record<string, unknown>;
}

export type AppErrorCode =
  | 'auth'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'validation'
  | 'unknown';

export interface AppError {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading'; label?: string }
  | { status: 'success'; data: T }
  | { status: 'empty'; reason: string; actionLabel?: string }
  | { status: 'error'; error: AppError };

export interface WorkstationInteractPayload {
  workstationId: WorkstationId;
  label: string;
}

export interface BridgeEvents {
  'workstation:proximity': {
    workstationId: WorkstationId | null;
    label?: string;
  };
  'workstation:interact': WorkstationInteractPayload;
  'panel:closed': {
    workstationId: WorkstationId;
  };
}

export type BridgeEventName = keyof BridgeEvents;

export type BridgeHandler<K extends BridgeEventName> = (
  payload: BridgeEvents[K],
) => void;
