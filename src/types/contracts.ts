/**
 * Shared domain, UI state, realtime collaboration, and Phaser-React event bridge contracts.
 * Locked on main. Feature worktrees must import without modifying.
 */

export type AppRoute = 'entry' | 'spaces' | 'workspace';

export type WorkstationId = 'overview' | 'tasks' | 'resources' | 'whiteboard';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type ResourceCategory = 'docs' | 'design' | 'tools' | 'general';

export type StudentRole = 'student' | 'team_lead' | 'guest_demo';

export type DemoProfileKey = 'team_lead' | 'member' | 'guest_empty';

export type CharacterSpriteKey = 'adam' | 'alex' | 'amelia' | 'bob';

export type AvatarFacing = 'right' | 'up' | 'left' | 'down';

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected';

export type RealtimeSyncScope =
  | 'project'
  | 'tasks'
  | 'resources'
  | 'whiteboard'
  | 'chat';

export type WhiteboardNoteColor = 'yellow' | 'sage' | 'lavender' | 'peach';

export type WhiteboardPenColor = '#30343B' | '#4A6B46' | '#7C4520' | '#8E2F29';

export type WhiteboardStrokeWidth = 2 | 4;

export type ActivityEntityType = 'project' | 'task' | 'resource' | 'whiteboard';

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
  assigneeId?: string | null;
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

export interface RemotePlayerPresence {
  userId: string;
  displayName: string;
  role: StudentRole;
  spriteKey: CharacterSpriteKey;
  x: number;
  y: number;
  facing: AvatarFacing;
  moving: boolean;
  joinedAt: string;
}

export interface AvatarMovePacket {
  userId: string;
  displayName: string;
  spriteKey: CharacterSpriteKey;
  x: number;
  y: number;
  facing: AvatarFacing;
  moving: boolean;
}

export interface AvatarChatBubblePayload {
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export interface RoomMessage {
  id: string;
  teamId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
}

export interface WhiteboardNote {
  id: string;
  projectId: string;
  authorId: string | null;
  authorName: string;
  content: string;
  color: WhiteboardNoteColor;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardStrokePoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  projectId: string;
  authorId: string | null;
  authorName: string;
  color: WhiteboardPenColor;
  width: WhiteboardStrokeWidth;
  points: WhiteboardStrokePoint[];
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  projectId: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: ActivityEntityType;
  summary: string;
  createdAt: string;
}

export interface ProjectUpdateInput {
  title: string;
  description: string;
  objectives: string[];
}

export interface TaskCreateInput {
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueAt?: string | null;
}

export interface ResourceCreateInput {
  projectId: string;
  title: string;
  description: string | null;
  url: string;
  category: ResourceCategory;
}

export interface WhiteboardNoteCreateInput {
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  color: WhiteboardNoteColor;
}

export interface WhiteboardStrokeCreateInput {
  projectId: string;
  authorId: string;
  authorName: string;
  color: WhiteboardPenColor;
  width: WhiteboardStrokeWidth;
  points: WhiteboardStrokePoint[];
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
  'avatar:local-identity': {
    userId: string;
    displayName: string;
    spriteKey: CharacterSpriteKey;
  };
  'avatar:local-move': {
    x: number;
    y: number;
    facing: AvatarFacing;
    moving: boolean;
  };
  'avatar:remote-sync': {
    players: RemotePlayerPresence[];
  };
  'avatar:remote-move': AvatarMovePacket;
  'avatar:remote-leave': {
    userId: string;
  };
  'avatar:chat-bubble': AvatarChatBubblePayload;
  'avatar:proximity-peers': {
    peerIds: string[];
  };
  'ui:input-focus': {
    focused: boolean;
  };
}

export type BridgeEventName = keyof BridgeEvents;

export type BridgeHandler<K extends BridgeEventName> = (
  payload: BridgeEvents[K],
) => void;
