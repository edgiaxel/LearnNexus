/**
 * Locked UI component prop contracts for parallel worktrees.
 * Orchestrator-only on main; feature worktrees import these interfaces as-is.
 */

import type {
  AcademicSpace,
  CharacterSpriteKey,
  RealtimeConnectionStatus,
  RealtimeSyncScope,
  RemotePlayerPresence,
  RoomMessage,
  StudentProfile,
  TeamWorkspace,
  WorkstationId,
} from './contracts';
import type { AcademicRepository, AuthRepository } from './database';

export interface EntryGatewayProps {
  authRepository: AuthRepository;
  supabaseReady: boolean;
  supabaseError: string | null;
  sessionNotice?: string | null;
  onRetryHealth: () => void;
  onAuthenticated: (profile: StudentProfile) => void;
}

export interface AcademicSpacesSelectorProps {
  profile: StudentProfile;
  repository: AcademicRepository;
  onSelectSpace: (space: AcademicSpace, workspace: TeamWorkspace) => void;
  onSwitchProfile: () => void;
  onSessionExpired?: () => void;
}

export interface WorkstationPanelProps {
  workstationId: WorkstationId;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
  currentUser?: StudentProfile;
  onlineUserIds?: readonly string[];
  syncRevision?: number;
  isDemoSession?: boolean;
  onDataMutated?: (scope: RealtimeSyncScope) => void;
  onSessionExpired?: () => void;
  onClose: () => void;
}

export interface ProjectOverviewPanelProps {
  teamId: string;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
  onlineUserIds?: readonly string[];
  syncRevision?: number;
  isDemoSession?: boolean;
  onDataMutated?: (scope: RealtimeSyncScope) => void;
  onSessionExpired?: () => void;
}

export interface TasksSprintBoardPanelProps {
  projectId: string | null;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
  syncRevision?: number;
  isDemoSession?: boolean;
  onDataMutated?: (scope: RealtimeSyncScope) => void;
  onSessionExpired?: () => void;
}

export interface ResourceLibraryPanelProps {
  projectId: string | null;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
  syncRevision?: number;
  isDemoSession?: boolean;
  onDataMutated?: (scope: RealtimeSyncScope) => void;
  onSessionExpired?: () => void;
}

export interface WhiteboardPanelProps {
  projectId: string | null;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
  currentUser?: StudentProfile;
  syncRevision?: number;
  isDemoSession?: boolean;
  onDataMutated?: (scope: RealtimeSyncScope) => void;
  onSessionExpired?: () => void;
}

export interface StudioCollaborationBarProps {
  currentUser: StudentProfile;
  localSpriteKey: CharacterSpriteKey;
  connectionStatus: RealtimeConnectionStatus;
  remotePlayers: readonly RemotePlayerPresence[];
  nearbyPeerIds: readonly string[];
  messages: readonly RoomMessage[];
  chatOpen: boolean;
  unreadCount: number;
  chatLoading: boolean;
  chatError: string | null;
  sendingMessage: boolean;
  sendError: string | null;
  onToggleChat: () => void;
  onCloseChat: () => void;
  onSendMessage: (body: string) => Promise<boolean>;
  onRetryMessages: () => void;
  onInputFocusChange: (focused: boolean) => void;
}
