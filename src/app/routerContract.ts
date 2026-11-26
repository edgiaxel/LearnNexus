/**
 * Central application route, shell header, and workstation metadata contracts.
 * src/app/App.tsx owns the single top bar and right drawer host; child screens
 * must never render duplicate navbars or global layout wrappers.
 */

import type {
  AppRoute,
  StudentProfile,
  WorkstationId,
} from '../types/contracts';

export interface RouteDefinition {
  id: AppRoute;
  screenId: 'UI-01' | 'UI-02' | 'UI-03/04';
  title: string;
  requiresProfile: boolean;
  requiresSpace: boolean;
}

export const APP_ROUTES: Record<AppRoute, RouteDefinition> = {
  entry: {
    id: 'entry',
    screenId: 'UI-01',
    title: 'LearnNexus Entry',
    requiresProfile: false,
    requiresSpace: false,
  },
  spaces: {
    id: 'spaces',
    screenId: 'UI-02',
    title: 'Academic Spaces',
    requiresProfile: true,
    requiresSpace: false,
  },
  workspace: {
    id: 'workspace',
    screenId: 'UI-03/04',
    title: 'Team Workspace Studio',
    requiresProfile: true,
    requiresSpace: true,
  },
};

export const ALLOWED_ROUTE_TRANSITIONS: Record<AppRoute, readonly AppRoute[]> = {
  entry: ['spaces'],
  spaces: ['workspace', 'entry'],
  workspace: ['spaces', 'entry'],
};

export function canTransitionRoute(from: AppRoute, to: AppRoute): boolean {
  return ALLOWED_ROUTE_TRANSITIONS[from].includes(to);
}

export interface ShellBreadcrumb {
  label: string;
  route?: AppRoute;
}

export interface ShellHeaderState {
  activeRoute: AppRoute;
  profile: StudentProfile | null;
  breadcrumbs: ShellBreadcrumb[];
  canLeaveSpace: boolean;
}

export interface WorkspaceDrawerState {
  activeWorkstation: WorkstationId | null;
  isOpen: boolean;
}

export interface WorkstationMeta {
  id: WorkstationId;
  screenId: 'UI-05' | 'UI-06' | 'UI-07' | 'UI-08b';
  title: string;
  promptLabel: string;
}

export const WORKSTATION_META: Record<WorkstationId, WorkstationMeta> = {
  overview: {
    id: 'overview',
    screenId: 'UI-05',
    title: 'Project Overview',
    promptLabel: 'Open Project Overview',
  },
  tasks: {
    id: 'tasks',
    screenId: 'UI-06',
    title: 'Sprint Tasks',
    promptLabel: 'Open Sprint Tasks',
  },
  resources: {
    id: 'resources',
    screenId: 'UI-07',
    title: 'Resource Library',
    promptLabel: 'Open Resource Library',
  },
  whiteboard: {
    id: 'whiteboard',
    screenId: 'UI-08b',
    title: 'Team Whiteboard',
    promptLabel: 'Open Team Whiteboard',
  },
};
