import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AcademicSpacesSelector } from '../components/campus/AcademicSpacesSelector';
import { EntryGateway } from '../components/entry/EntryGateway';
import { StudioCollaborationBar } from '../components/realtime/StudioCollaborationBar';
import { WorkstationPanel } from '../components/workstation/WorkstationPanel';
import type { LocalAvatarIdentity } from '../game/PhaserHost';

const LazyPhaserHost = lazy(() =>
  import('../game/PhaserHost').then((mod) => ({ default: mod.PhaserHost })),
);
import { eventBridge } from '../game/bridge/eventBridge';
import { checkSupabaseHealth } from '../lib/supabase';
import { academicService } from '../services/academicService';
import { authService } from '../services/authService';
import {
  getCharacterSpriteKey,
  realtimeService,
} from '../services/realtimeService';
import type {
  AcademicSpace,
  AppRoute,
  AsyncState,
  RealtimeConnectionStatus,
  RealtimeSyncScope,
  RemotePlayerPresence,
  RoomMessage,
  StudentProfile,
  TeamWorkspace,
  WorkspaceLayoutConfig,
  WorkstationId,
} from '../types/contracts';
import type { StudioRealtimeConnection } from '../types/database';
import { canTransitionRoute, WORKSTATION_META } from './routerContract';

const SESSION_EXPIRED_NOTICE =
  'Your session expired. Sign in again to continue. Unsaved edits were not stored.';

interface HealthSnapshot {
  latencyMs: number;
}

const SELECTED_CLASS_STORAGE_KEY = 'learnnexus:selectedClassId';

const WORKSTATION_LEGEND: ReadonlyArray<{ id: WorkstationId; hint: string }> = [
  { id: 'overview', hint: 'West study pod' },
  { id: 'tasks', hint: 'Center meeting table' },
  { id: 'resources', hint: 'North bookcase' },
  { id: 'whiteboard', hint: 'North chalkboard' },
];

const WORKSTATION_IDS: readonly WorkstationId[] = [
  'overview',
  'tasks',
  'resources',
  'whiteboard',
];

const INITIAL_SYNC_REVISIONS: Record<WorkstationId, number> = {
  overview: 0,
  tasks: 0,
  resources: 0,
  whiteboard: 0,
};

function readSelectedClassId(): string | null {
  try {
    return window.sessionStorage.getItem(SELECTED_CLASS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSelectedClassId(classId: string | null): void {
  try {
    if (classId) {
      window.sessionStorage.setItem(SELECTED_CLASS_STORAGE_KEY, classId);
    } else {
      window.sessionStorage.removeItem(SELECTED_CLASS_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function App() {
  const [sessionBootstrapping, setSessionBootstrapping] = useState(true);
  const [route, setRoute] = useState<AppRoute>('entry');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<TeamWorkspace | null>(
    null,
  );
  const [workspaceLayout, setWorkspaceLayout] =
    useState<WorkspaceLayoutConfig | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [nearbyWorkstation, setNearbyWorkstation] =
    useState<WorkstationId | null>(null);
  const [activeWorkstation, setActiveWorkstation] =
    useState<WorkstationId | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [supabaseState, setSupabaseState] = useState<
    AsyncState<HealthSnapshot>
  >({
    status: 'loading',
    label: 'Checking Supabase connection...',
  });

  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeConnectionStatus>('disconnected');
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerPresence[]>(
    [],
  );
  const [nearbyPeerIds, setNearbyPeerIds] = useState<string[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [syncRevisionByWorkstation, setSyncRevisionByWorkstation] = useState<
    Record<WorkstationId, number>
  >(INITIAL_SYNC_REVISIONS);

  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<StudentProfile | null>(null);
  profileRef.current = profile;
  const intentionalSignOutRef = useRef(false);
  const realtimeConnRef = useRef<StudioRealtimeConnection | null>(null);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const remotePlayersRef = useRef<RemotePlayerPresence[]>(remotePlayers);
  remotePlayersRef.current = remotePlayers;
  const recentBubbleAtRef = useRef<Map<string, number>>(new Map());
  const messagesSeqRef = useRef(0);

  const localSpriteKey = useMemo(
    () => (profile ? getCharacterSpriteKey(profile.id, profile.role) : 'adam'),
    [profile],
  );

  const localIdentity = useMemo<LocalAvatarIdentity | undefined>(() => {
    if (!profile) return undefined;
    return {
      userId: profile.id,
      displayName: profile.displayName,
      spriteKey: localSpriteKey,
    };
  }, [profile, localSpriteKey]);

  const onlineUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (profile?.id) {
      ids.add(profile.id);
    }
    for (const player of remotePlayers) {
      ids.add(player.userId);
    }
    return Array.from(ids);
  }, [profile?.id, remotePlayers]);

  const bumpSyncScope = useCallback((scope: RealtimeSyncScope) => {
    setSyncRevisionByWorkstation((prev) => {
      if (scope === 'project') {
        return { ...prev, overview: prev.overview + 1 };
      }
      if (scope === 'tasks') {
        return {
          ...prev,
          tasks: prev.tasks + 1,
          overview: prev.overview + 1,
        };
      }
      if (scope === 'resources') {
        return {
          ...prev,
          resources: prev.resources + 1,
          overview: prev.overview + 1,
        };
      }
      if (scope === 'whiteboard') {
        return {
          ...prev,
          whiteboard: prev.whiteboard + 1,
          overview: prev.overview + 1,
        };
      }
      return prev;
    });
  }, []);

  const appendRoomMessage = useCallback((incoming: RoomMessage) => {
    setRoomMessages((prev) => {
      if (prev.some((item) => item.id === incoming.id)) {
        return prev;
      }
      return [...prev, incoming];
    });
  }, []);

  const emitChatBubbleDeduped = useCallback(
    (payload: {
      userId: string;
      displayName: string;
      text: string;
      createdAt: string;
    }) => {
      const key = `${payload.userId}:${payload.text.trim()}`;
      const now = Date.now();
      const lastAt = recentBubbleAtRef.current.get(key) ?? 0;
      if (now - lastAt < 1500) {
        return;
      }
      recentBubbleAtRef.current.set(key, now);
      eventBridge.emit('avatar:chat-bubble', payload);
    },
    [],
  );

  const resetCollaborationState = useCallback(() => {
    setRealtimeStatus('disconnected');
    setRemotePlayers([]);
    setNearbyPeerIds([]);
    setRoomMessages([]);
    setChatLoading(false);
    setChatError(null);
    setChatOpen(false);
    setUnreadChatCount(0);
    setSendingMessage(false);
    setSendError(null);
    setSyncRevisionByWorkstation(INITIAL_SYNC_REVISIONS);
    recentBubbleAtRef.current.clear();
    eventBridge.emit('ui:input-focus', { focused: false });
  }, []);

  const runHealthCheck = useCallback(async () => {
    setSupabaseState({
      status: 'loading',
      label: 'Checking Supabase connection...',
    });
    const result = await checkSupabaseHealth();
    if (result.ok) {
      setSupabaseState({
        status: 'success',
        data: { latencyMs: result.latencyMs },
      });
    } else {
      setSupabaseState({
        status: 'error',
        error: {
          code: 'network',
          message: result.message,
          retryable: true,
        },
      });
    }
  }, []);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const profileResult = await authService.getCurrentProfile();
      if (cancelled) return;

      if (!profileResult.ok || !profileResult.data) {
        writeSelectedClassId(null);
        setProfile(null);
        setActiveWorkspace(null);
        setRoute('entry');
        setSessionBootstrapping(false);
        return;
      }

      setProfile(profileResult.data);

      const savedClassId = readSelectedClassId();
      if (savedClassId) {
        const workspaceResult =
          await academicService.getTeamWorkspace(savedClassId);
        if (cancelled) return;

        if (workspaceResult.ok) {
          setActiveWorkspace(workspaceResult.data);
          setRoute('workspace');
          setSessionBootstrapping(false);
          return;
        }
        writeSelectedClassId(null);
      }

      setActiveWorkspace(null);
      setRoute('spaces');
      setSessionBootstrapping(false);
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSessionExpired = useCallback(async () => {
    intentionalSignOutRef.current = true;
    try {
      await authService.signOut();
    } finally {
      writeSelectedClassId(null);
      setActiveWorkstation(null);
      setNearbyWorkstation(null);
      setActiveWorkspace(null);
      setWorkspaceLayout(null);
      resetCollaborationState();
      setProfile(null);
      setSessionNotice(SESSION_EXPIRED_NOTICE);
      setRoute('entry');
      intentionalSignOutRef.current = false;
    }
  }, [resetCollaborationState]);

  const handleSessionExpiredRef = useRef(handleSessionExpired);
  handleSessionExpiredRef.current = handleSessionExpired;

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((event, hasSession) => {
      if (
        event === 'SIGNED_OUT' &&
        !hasSession &&
        !intentionalSignOutRef.current &&
        profileRef.current !== null
      ) {
        writeSelectedClassId(null);
        setActiveWorkstation(null);
        setNearbyWorkstation(null);
        setActiveWorkspace(null);
        setWorkspaceLayout(null);
        resetCollaborationState();
        setProfile(null);
        setSessionNotice(SESSION_EXPIRED_NOTICE);
        setRoute('entry');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [resetCollaborationState]);

  useEffect(() => {
    const teamId = activeWorkspace?.teamId;
    if (!teamId) {
      setWorkspaceLayout(null);
      return;
    }

    let cancelled = false;
    const loadWorkspaceLayout = async () => {
      const result = await academicService.getWorkspaceLayout(teamId);
      if (cancelled) return;
      if (result.ok) {
        setWorkspaceLayout(result.data);
      } else {
        setWorkspaceLayout(null);
      }
    };

    void loadWorkspaceLayout();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.teamId]);

  const loadRoomMessages = useCallback(async (teamId: string) => {
    const seq = ++messagesSeqRef.current;
    setChatLoading(true);
    setChatError(null);

    try {
      const result = await academicService.getRoomMessages(teamId, 50);
      if (seq !== messagesSeqRef.current) return;

      if (!result.ok) {
        if (result.error.code === 'auth') {
          void handleSessionExpiredRef.current();
          return;
        }
        setChatError(result.error.message);
        setChatLoading(false);
        return;
      }

      setRoomMessages(result.data);
      setChatLoading(false);
    } catch (err) {
      if (seq !== messagesSeqRef.current) return;
      setChatError(
        err instanceof Error
          ? err.message
          : 'Unable to load studio chat right now.',
      );
      setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (route !== 'workspace' || !activeWorkspace || !profile) {
      return;
    }

    void loadRoomMessages(activeWorkspace.teamId);

    const conn = realtimeService.connectStudioRoom({
      teamId: activeWorkspace.teamId,
      projectId: activeWorkspace.projectId,
      profile,
      spriteKey: localSpriteKey,
      callbacks: {
        onConnectionStatusChange: (status) => {
          setRealtimeStatus(status);
        },
        onPresenceSync: (players) => {
          setRemotePlayers(players);
          eventBridge.emit('avatar:remote-sync', { players });
        },
        onRemoteMove: (packet) => {
          eventBridge.emit('avatar:remote-move', packet);
        },
        onRemoteLeave: (userId) => {
          setRemotePlayers((prev) =>
            prev.filter((item) => item.userId !== userId),
          );
          eventBridge.emit('avatar:remote-leave', { userId });
        },
        onChatMessage: (payload) => {
          emitChatBubbleDeduped(payload);
        },
        onRoomMessage: (message) => {
          appendRoomMessage(message);
          if (message.userId !== profile.id) {
            if (!chatOpenRef.current) {
              setUnreadChatCount((count) => count + 1);
            }
            emitChatBubbleDeduped({
              userId: message.userId,
              displayName: message.displayName,
              text: message.body,
              createdAt: message.createdAt,
            });
          }
        },
        onDataChanged: (scope) => {
          if (scope === 'chat') {
            void loadRoomMessages(activeWorkspace.teamId);
            return;
          }
          bumpSyncScope(scope);
        },
      },
    });

    realtimeConnRef.current = conn;

    const unsubLocalMove = eventBridge.on('avatar:local-move', (payload) => {
      conn.broadcastMove(payload);
    });
    const unsubProximityPeers = eventBridge.on(
      'avatar:proximity-peers',
      ({ peerIds }) => {
        setNearbyPeerIds(peerIds);
      },
    );

    return () => {
      messagesSeqRef.current += 1;
      unsubLocalMove();
      unsubProximityPeers();
      realtimeConnRef.current = null;
      void conn.disconnect();
      resetCollaborationState();
    };
  }, [
    route,
    activeWorkspace,
    profile,
    localSpriteKey,
    loadRoomMessages,
    appendRoomMessage,
    emitChatBubbleDeduped,
    bumpSyncScope,
    resetCollaborationState,
  ]);

  useEffect(() => {
    const unsubProximity = eventBridge.on('workstation:proximity', (payload) => {
      setNearbyWorkstation(payload.workstationId);
    });
    const unsubInteract = eventBridge.on('workstation:interact', (payload) => {
      setChatOpen(false);
      eventBridge.emit('ui:input-focus', { focused: false });
      setActiveWorkstation(payload.workstationId);
    });

    return () => {
      unsubProximity();
      unsubInteract();
    };
  }, []);

  const restoreCanvasFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      const container = canvasWrapperRef.current?.querySelector<HTMLElement>(
        '[data-testid="phaser-canvas-container"]',
      );
      container?.focus({ preventScroll: true });
    });
  }, []);

  const handlePhaserReady = useCallback(() => {
    if (localIdentity) {
      eventBridge.emit('avatar:local-identity', localIdentity);
    }
    if (remotePlayersRef.current.length > 0) {
      eventBridge.emit('avatar:remote-sync', {
        players: remotePlayersRef.current,
      });
    }
  }, [localIdentity]);

  const closeDrawer = useCallback(() => {
    setActiveWorkstation((current) => {
      if (!current) return null;
      eventBridge.emit('panel:closed', { workstationId: current });
      return null;
    });
    restoreCanvasFocus();
  }, [restoreCanvasFocus]);

  const handleAuthenticated = useCallback(
    (nextProfile: StudentProfile) => {
      writeSelectedClassId(null);
      setSessionNotice(null);
      setProfile(nextProfile);
      setActiveWorkspace(null);
      setWorkspaceLayout(null);
      setNearbyWorkstation(null);
      setActiveWorkstation(null);
      resetCollaborationState();
      if (canTransitionRoute(route, 'spaces')) {
        setRoute('spaces');
      } else {
        setRoute('spaces');
      }
    },
    [route, resetCollaborationState],
  );

  const handleSelectSpace = useCallback(
    (space: AcademicSpace, workspace: TeamWorkspace) => {
      writeSelectedClassId(space.id);
      setActiveWorkspace(workspace);
      setWorkspaceLayout(null);
      setNearbyWorkstation(null);
      setActiveWorkstation(null);
      resetCollaborationState();
      if (canTransitionRoute(route, 'workspace')) {
        setRoute('workspace');
      } else {
        setRoute('workspace');
      }
    },
    [route, resetCollaborationState],
  );

  const handleLeaveStudio = useCallback(() => {
    if (!canTransitionRoute(route, 'spaces')) return;
    writeSelectedClassId(null);
    setActiveWorkstation(null);
    setNearbyWorkstation(null);
    setActiveWorkspace(null);
    setWorkspaceLayout(null);
    resetCollaborationState();
    setRoute('spaces');
  }, [route, resetCollaborationState]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    intentionalSignOutRef.current = true;
    try {
      await authService.signOut();
      writeSelectedClassId(null);
      setActiveWorkstation(null);
      setNearbyWorkstation(null);
      setActiveWorkspace(null);
      setWorkspaceLayout(null);
      resetCollaborationState();
      setProfile(null);
      setSessionNotice(null);
      setRoute('entry');
    } finally {
      intentionalSignOutRef.current = false;
      setSigningOut(false);
    }
  }, [signingOut, resetCollaborationState]);

  const handleToggleChat = useCallback(() => {
    setChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
      } else {
        eventBridge.emit('ui:input-focus', { focused: false });
      }
      return next;
    });
  }, []);

  const handleCloseChat = useCallback(() => {
    setChatOpen(false);
    eventBridge.emit('ui:input-focus', { focused: false });
  }, []);

  const handleSendChatMessage = useCallback(
    async (body: string): Promise<boolean> => {
      if (!activeWorkspace || !profile || sendingMessage) {
        return false;
      }

      setSendingMessage(true);
      setSendError(null);

      try {
        const result = await academicService.sendRoomMessage(
          activeWorkspace.teamId,
          profile.displayName,
          body,
        );
        if (!result.ok) {
          if (result.error.code === 'auth') {
            void handleSessionExpiredRef.current();
            return false;
          }
          setSendError(result.error.message);
          return false;
        }

        appendRoomMessage(result.data);
        const bubblePayload = {
          userId: profile.id,
          displayName: profile.displayName,
          text: result.data.body,
          createdAt: result.data.createdAt,
        };
        emitChatBubbleDeduped(bubblePayload);
        realtimeConnRef.current?.broadcastChat(bubblePayload);
        return true;
      } catch (err) {
        setSendError(
          err instanceof Error
            ? err.message
            : 'Unable to send studio message right now.',
        );
        return false;
      } finally {
        setSendingMessage(false);
      }
    },
    [
      activeWorkspace,
      profile,
      sendingMessage,
      appendRoomMessage,
      emitChatBubbleDeduped,
    ],
  );

  const handleDataMutated = useCallback(
    (scope: RealtimeSyncScope) => {
      realtimeConnRef.current?.broadcastDataSync(scope);
      bumpSyncScope(scope);
    },
    [bumpSyncScope],
  );

  const openWorkstation = useCallback((workstationId: WorkstationId) => {
    eventBridge.emit('workstation:interact', {
      workstationId,
      label: WORKSTATION_META[workstationId].title,
    });
  }, []);

  const handlePromptClick = useCallback(() => {
    if (!nearbyWorkstation) return;
    openWorkstation(nearbyWorkstation);
  }, [nearbyWorkstation, openWorkstation]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-warm)] text-[var(--color-text-primary)]">
      <header className="w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <svg
                width="26"
                height="26"
                viewBox="0 0 26 26"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="24"
                  height="24"
                  rx="7"
                  fill="#EEF1E8"
                  stroke="#A4B99C"
                />
                <path
                  d="M6.5 11L13 7.5L19.5 11L13 14.5L6.5 11Z"
                  fill="#4A6B46"
                />
                <path
                  d="M9 12.7V16.2C9 17.3 10.8 18.2 13 18.2C15.2 18.2 17 17.3 17 16.2V12.7"
                  stroke="#3B5638"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[16px] font-semibold tracking-tight text-[var(--color-text-charcoal)]">
                LearnNexus
              </span>
            </div>

            <nav
              aria-label="Campus breadcrumb"
              data-testid="header-breadcrumbs"
              className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)]"
            >
              {route === 'entry' && (
                <span aria-current="page">Campus Entry</span>
              )}
              {route === 'spaces' && (
                <span aria-current="page">Academic Spaces</span>
              )}
              {route === 'workspace' && activeWorkspace && (
                <>
                  <button
                    type="button"
                    onClick={handleLeaveStudio}
                    className="btn-ghost min-h-[44px] px-2 py-1 text-[12px] font-medium"
                  >
                    Academic Spaces
                  </button>
                  <span aria-hidden="true">/</span>
                  <span>{activeWorkspace.classCode}</span>
                  <span aria-hidden="true">/</span>
                  <span
                    aria-current="page"
                    className="text-[var(--color-text-primary)]"
                  >
                    {activeWorkspace.teamName}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {supabaseState.status === 'loading' && (
              <span className="status-badge status-badge--todo" role="status">
                Checking Supabase...
              </span>
            )}
            {supabaseState.status === 'success' && (
              <span className="status-badge status-badge--done" role="status">
                Supabase connected
              </span>
            )}
            {supabaseState.status === 'error' && (
              <div className="flex items-center gap-2">
                <span className="status-badge status-badge--error" role="alert">
                  Supabase offline
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void runHealthCheck()}
                >
                  Retry
                </button>
              </div>
            )}

            {profile && (
              <span
                data-testid="header-user-badge"
                className="status-badge border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]"
              >
                {profile.displayName}
              </span>
            )}

            {route === 'workspace' && activeWorkspace && (
              <button
                type="button"
                className="btn-secondary"
                data-testid="leave-studio-btn"
                onClick={handleLeaveStudio}
              >
                Leave Studio
              </button>
            )}

            {profile && (
              <button
                type="button"
                className="btn-ghost"
                data-testid="sign-out-btn"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
              >
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        {sessionBootstrapping ? (
          <section
            aria-label="Restoring campus session"
            aria-busy="true"
            className="surface-card mx-auto my-auto flex w-full max-w-[540px] flex-col gap-4 p-6 sm:p-8"
          >
            <h1 className="m-0 text-[22px] font-semibold leading-7 text-[var(--color-text-charcoal)]">
              Loading Campus Session
            </h1>
            <p
              role="status"
              className="m-0 text-[14px] text-[var(--color-text-secondary)]"
            >
              Checking campus session...
            </p>
            <div className="flex flex-col gap-3" aria-hidden="true">
              <div className="h-5 w-2/3 rounded-[8px] bg-[var(--color-surface-secondary)]" />
              <div className="h-14 w-full rounded-[10px] bg-[var(--color-surface-secondary)]" />
            </div>
          </section>
        ) : route === 'entry' ? (
          <EntryGateway
            authRepository={authService}
            supabaseReady={supabaseState.status === 'success'}
            supabaseError={
              supabaseState.status === 'error'
                ? supabaseState.error.message
                : null
            }
            sessionNotice={sessionNotice}
            onRetryHealth={() => void runHealthCheck()}
            onAuthenticated={handleAuthenticated}
          />
        ) : route === 'spaces' && profile ? (
          <AcademicSpacesSelector
            profile={profile}
            repository={academicService}
            onSelectSpace={handleSelectSpace}
            onSwitchProfile={() => void handleSignOut()}
            onSessionExpired={() => void handleSessionExpired()}
          />
        ) : route === 'workspace' && activeWorkspace && profile ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h1 className="m-0 text-[22px] font-semibold leading-7 text-[var(--color-text-charcoal)]">
                  Team Workspace Studio
                </h1>
                <p className="m-0 text-[13px] font-medium text-[var(--color-text-secondary)]">
                  {activeWorkspace.classCode} {activeWorkspace.className} (
                  {activeWorkspace.teamName})
                </p>
              </div>
              <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
                Use WASD or Arrow keys to walk. Press E near a workstation.
              </p>
            </div>

            <StudioCollaborationBar
              currentUser={profile}
              localSpriteKey={localSpriteKey}
              connectionStatus={realtimeStatus}
              remotePlayers={remotePlayers}
              nearbyPeerIds={nearbyPeerIds}
              messages={roomMessages}
              chatOpen={chatOpen}
              unreadCount={unreadChatCount}
              chatLoading={chatLoading}
              chatError={chatError}
              sendingMessage={sendingMessage}
              sendError={sendError}
              onToggleChat={handleToggleChat}
              onCloseChat={handleCloseChat}
              onSendMessage={handleSendChatMessage}
              onRetryMessages={() => void loadRoomMessages(activeWorkspace.teamId)}
              onInputFocusChange={(focused) => {
                eventBridge.emit('ui:input-focus', { focused });
              }}
            />

            <section
              aria-label="Campus studio viewport"
              className="surface-card relative flex flex-col overflow-hidden p-2 sm:p-3"
            >
              <div
                ref={canvasWrapperRef}
                className="relative w-full overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-warm)]"
                style={{ height: 'min(68vh, 640px)', minHeight: '420px' }}
              >
                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-busy="true"
                      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#EEF1E8] p-6 text-center"
                    >
                      <div
                        aria-hidden="true"
                        className="h-24 w-40 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]"
                      />
                      <p className="m-0 text-[13px] font-medium text-[var(--color-text-secondary)]">
                        Loading 2D studio canvas...
                      </p>
                    </div>
                  }
                >
                  <LazyPhaserHost
                    className="h-full w-full"
                    activeWorkstation={activeWorkstation}
                    localIdentity={localIdentity}
                    onReady={handlePhaserReady}
                  />
                </Suspense>

                {nearbyWorkstation && !activeWorkstation && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
                    <button
                      type="button"
                      className="btn-primary pointer-events-auto shadow-md"
                      data-testid="workstation-prompt"
                      onClick={handlePromptClick}
                    >
                      [E] {WORKSTATION_META[nearbyWorkstation].promptLabel}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-3 md:hidden">
                <p className="m-0 text-[12px] text-[var(--color-text-secondary)]">
                  Compact viewport: open a workstation panel directly below, or
                  use a desktop browser for full keyboard walking.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {WORKSTATION_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="btn-secondary w-full"
                      data-testid={`mobile-workstation-btn-${id}`}
                      onClick={() => openWorkstation(id)}
                    >
                      {WORKSTATION_META[id].title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-[var(--color-text-secondary)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {WORKSTATION_LEGEND.map((station) => (
                    <span key={station.id}>
                      <strong className="font-medium text-[var(--color-text-primary)]">
                        {WORKSTATION_META[station.id].title}:
                      </strong>{' '}
                      {station.hint}
                    </span>
                  ))}
                </div>
                <span data-testid="workspace-layout-meta">
                  {workspaceLayout
                    ? `16px pixel grid (${workspaceLayout.layoutKey})`
                    : '16px pixel grid with integer zoom'}
                </span>
              </div>
            </section>
          </>
        ) : (
          <EntryGateway
            authRepository={authService}
            supabaseReady={supabaseState.status === 'success'}
            supabaseError={
              supabaseState.status === 'error'
                ? supabaseState.error.message
                : null
            }
            sessionNotice={sessionNotice}
            onRetryHealth={() => void runHealthCheck()}
            onAuthenticated={handleAuthenticated}
          />
        )}
      </main>

      {activeWorkstation && activeWorkspace && (
        <WorkstationPanel
          workstationId={activeWorkstation}
          workspace={activeWorkspace}
          repository={academicService}
          currentUser={profile ?? undefined}
          onlineUserIds={onlineUserIds}
          syncRevision={syncRevisionByWorkstation[activeWorkstation]}
          isDemoSession={profile?.isDemo ?? false}
          onDataMutated={handleDataMutated}
          onSessionExpired={() => void handleSessionExpired()}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}

export default App;
