/**
 * Canonical Postgres row contracts and repository interfaces.
 * Locked on main. Zero-mock rule: every method targets real Postgres/RLS/Realtime.
 */

import type {
  AcademicSpace,
  ActivityEntityType,
  ActivityLogItem,
  AppError,
  AvatarChatBubblePayload,
  AvatarFacing,
  AvatarMovePacket,
  CharacterSpriteKey,
  DemoProfileKey,
  ProjectOverview,
  ProjectUpdateInput,
  RealtimeConnectionStatus,
  RealtimeSyncScope,
  RemotePlayerPresence,
  ResourceCategory,
  ResourceCreateInput,
  ResourceItem,
  RoomMessage,
  SprintTask,
  StudentProfile,
  StudentRole,
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
  WhiteboardStrokePoint,
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

export interface RoomMessageRow {
  id: string;
  team_id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
}

export interface WhiteboardNoteRow {
  id: string;
  project_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  color: WhiteboardNoteColor;
  created_at: string;
  updated_at: string;
}

export interface WhiteboardStrokeRow {
  id: string;
  project_id: string;
  author_id: string | null;
  author_name: string;
  color: WhiteboardPenColor;
  width: number;
  points: WhiteboardStrokePoint[];
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  project_id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: ActivityEntityType;
  summary: string;
  created_at: string;
}

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export type AuthStateChangeEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED';

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
  onAuthStateChange(
    handler: (event: AuthStateChangeEvent, hasSession: boolean) => void,
  ): () => void;
}

export interface AcademicRepository {
  getMyAcademicSpaces(): Promise<RepositoryResult<AcademicSpace[]>>;
  getTeamWorkspace(classId: string): Promise<RepositoryResult<TeamWorkspace>>;
  getTeamMembers(teamId: string): Promise<RepositoryResult<TeamMemberSummary[]>>;
  getProjectOverview(teamId: string): Promise<RepositoryResult<ProjectOverview>>;
  updateProjectOverview(
    projectId: string,
    input: ProjectUpdateInput,
  ): Promise<RepositoryResult<ProjectOverview>>;
  getProjectTasks(projectId: string): Promise<RepositoryResult<SprintTask[]>>;
  createTask(input: TaskCreateInput): Promise<RepositoryResult<SprintTask>>;
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<RepositoryResult<SprintTask>>;
  updateTask(
    taskId: string,
    input: TaskUpdateInput,
  ): Promise<RepositoryResult<SprintTask>>;
  deleteTask(taskId: string): Promise<RepositoryResult<void>>;
  getProjectResources(projectId: string): Promise<RepositoryResult<ResourceItem[]>>;
  createResource(
    input: ResourceCreateInput,
  ): Promise<RepositoryResult<ResourceItem>>;
  deleteResource(resourceId: string): Promise<RepositoryResult<void>>;
  getWorkspaceLayout(
    teamId: string,
  ): Promise<RepositoryResult<WorkspaceLayoutConfig | null>>;
  getProjectActivity(
    projectId: string,
    limit?: number,
  ): Promise<RepositoryResult<ActivityLogItem[]>>;
  getRoomMessages(
    teamId: string,
    limit?: number,
  ): Promise<RepositoryResult<RoomMessage[]>>;
  sendRoomMessage(
    teamId: string,
    displayName: string,
    body: string,
  ): Promise<RepositoryResult<RoomMessage>>;
  getWhiteboardNotes(
    projectId: string,
  ): Promise<RepositoryResult<WhiteboardNote[]>>;
  createWhiteboardNote(
    input: WhiteboardNoteCreateInput,
  ): Promise<RepositoryResult<WhiteboardNote>>;
  updateWhiteboardNote(
    noteId: string,
    content: string,
    color: WhiteboardNoteColor,
  ): Promise<RepositoryResult<WhiteboardNote>>;
  deleteWhiteboardNote(noteId: string): Promise<RepositoryResult<void>>;
  getWhiteboardStrokes(
    projectId: string,
  ): Promise<RepositoryResult<WhiteboardStroke[]>>;
  createWhiteboardStroke(
    input: WhiteboardStrokeCreateInput,
  ): Promise<RepositoryResult<WhiteboardStroke>>;
  deleteWhiteboardStroke(strokeId: string): Promise<RepositoryResult<void>>;
  clearWhiteboardStrokes(projectId: string): Promise<RepositoryResult<void>>;
}

export interface StudioRealtimeCallbacks {
  onConnectionStatusChange: (status: RealtimeConnectionStatus) => void;
  onPresenceSync: (players: RemotePlayerPresence[]) => void;
  onRemoteMove: (packet: AvatarMovePacket) => void;
  onRemoteLeave: (userId: string) => void;
  onChatMessage: (payload: AvatarChatBubblePayload) => void;
  onRoomMessage: (message: RoomMessage) => void;
  onDataChanged: (scope: RealtimeSyncScope) => void;
}

export interface StudioRealtimeConnectParams {
  teamId: string;
  projectId: string | null;
  profile: StudentProfile;
  spriteKey: CharacterSpriteKey;
  initialPosition?: {
    x: number;
    y: number;
    facing: AvatarFacing;
  };
  callbacks: StudioRealtimeCallbacks;
}

export interface StudioRealtimeConnection {
  broadcastMove: (payload: {
    x: number;
    y: number;
    facing: AvatarFacing;
    moving: boolean;
  }) => void;
  broadcastChat: (payload: AvatarChatBubblePayload) => void;
  broadcastDataSync: (scope: RealtimeSyncScope) => void;
  disconnect: () => Promise<void>;
}

export interface StudioRealtimeRepository {
  connectStudioRoom: (
    params: StudioRealtimeConnectParams,
  ) => StudioRealtimeConnection;
}
