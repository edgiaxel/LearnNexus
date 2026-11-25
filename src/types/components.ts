/**
 * Locked UI component prop contracts for parallel M2/M2.5 worktrees.
 * Orchestrator-only on main; feature worktrees import these interfaces as-is.
 */

import type {
  AcademicSpace,
  StudentProfile,
  TeamWorkspace,
  WorkstationId,
} from './contracts';
import type { AcademicRepository, AuthRepository } from './database';

export interface EntryGatewayProps {
  authRepository: AuthRepository;
  supabaseReady: boolean;
  supabaseError: string | null;
  onRetryHealth: () => void;
  onAuthenticated: (profile: StudentProfile) => void;
}

export interface AcademicSpacesSelectorProps {
  profile: StudentProfile;
  repository: AcademicRepository;
  onSelectSpace: (space: AcademicSpace, workspace: TeamWorkspace) => void;
  onSwitchProfile: () => void;
}

export interface WorkstationPanelProps {
  workstationId: WorkstationId;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
  onClose: () => void;
}

export interface ProjectOverviewPanelProps {
  teamId: string;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
}

export interface TasksSprintBoardPanelProps {
  projectId: string | null;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
}

export interface ResourceLibraryPanelProps {
  projectId: string | null;
  workspace: TeamWorkspace;
  repository: AcademicRepository;
}
