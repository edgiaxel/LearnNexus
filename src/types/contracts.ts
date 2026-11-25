/**
 * Shared domain, UI state, and Phaser-React event bridge contracts.
 * Locked on main in M0. Feature worktrees must import without modifying.
 */

export type AppRoute = 'entry' | 'spaces' | 'workspace';

export type WorkstationId = 'overview' | 'tasks' | 'resources';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type ResourceCategory = 'docs' | 'design' | 'tools' | 'general';

export type StudentRole = 'student' | 'team_lead' | 'guest_demo';

export type DemoProfileKey = 'team_lead' | 'member' | 'guest_empty';

export interface DemoProfileDescriptor {
  key: DemoProfileKey;
  displayName: string;
  email: string;
  role: StudentRole;
  roleLabel: string;
  assignmentSummary: string;
}

export const DEMO_PROFILE_DESCRIPTORS: readonly DemoProfileDescriptor[] = [
  {
    key: 'team_lead',
    displayName: 'Nadia Pratama (Demo)',
    email: 'nadia.demo@learnnexus.edu',
    role: 'team_lead',
    roleLabel: 'Team Leader',
    assignmentSummary: 'Enrolled in IF-4031 and IF-3210 (Team SibukTA)',
  },
  {
    key: 'member',
    displayName: 'Bima Santoso (Demo)',
    email: 'bima.demo@learnnexus.edu',
    role: 'student',
    roleLabel: 'Team Member',
    assignmentSummary: 'Enrolled in IF-4031 (Team SibukTA)',
  },
  {
    key: 'guest_empty',
    displayName: 'Rani Kusuma (Demo)',
    email: 'rani.demo@learnnexus.edu',
    role: 'guest_demo',
    roleLabel: 'Guest (Unassigned)',
    assignmentSummary:
      'No enrolled classes (verifies empty state and RLS isolation)',
  },
];

export interface StudentProfile {
  id: string;
  displayName: string;
  email?: string;
  role: StudentRole;
  isDemo: boolean;
}

export interface TeamMemberSummary {
  userId: string;
  displayName: string;
  role: 'member' | 'team_lead';
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
  courseCode?: string;
  courseName?: string;
  teamName?: string;
  teamMembers?: TeamMemberSummary[];
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
  description?: string | null;
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
