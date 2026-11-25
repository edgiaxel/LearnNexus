import { useCallback, useEffect, useRef, useState } from 'react';
import { PhaserHost } from '../game/PhaserHost';
import { eventBridge } from '../game/bridge/eventBridge';
import { checkSupabaseHealth } from '../lib/supabase';
import type { AppRoute, AsyncState, WorkstationId } from '../types/contracts';
import { canTransitionRoute, WORKSTATION_META } from './routerContract';

interface HealthSnapshot {
  latencyMs: number;
}

const WORKSTATION_PURPOSE: Record<WorkstationId, string> = {
  overview:
    'Displays the team project brief, semester goals, and milestone scope for the active studio.',
  tasks:
    'Displays team sprint items across To Do, In Progress, and Done statuses with persisted updates.',
  resources:
    'Displays verified reference documents, design guides, and repository links for the team.',
};

const WORKSTATION_LEGEND: ReadonlyArray<{ id: WorkstationId; hint: string }> = [
  { id: 'overview', hint: 'West study pod' },
  { id: 'tasks', hint: 'Center meeting table' },
  { id: 'resources', hint: 'North bookcase' },
];

export function App() {
  const [route, setRoute] = useState<AppRoute>('workspace');
  const [nearbyWorkstation, setNearbyWorkstation] =
    useState<WorkstationId | null>(null);
  const [activeWorkstation, setActiveWorkstation] =
    useState<WorkstationId | null>(null);
  const [supabaseState, setSupabaseState] = useState<
    AsyncState<HealthSnapshot>
  >({
    status: 'loading',
    label: 'Checking Supabase connection...',
  });

  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

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
    const unsubProximity = eventBridge.on('workstation:proximity', (payload) => {
      setNearbyWorkstation(payload.workstationId);
    });
    const unsubInteract = eventBridge.on('workstation:interact', (payload) => {
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

  const closeDrawer = useCallback(() => {
    setActiveWorkstation((current) => {
      if (!current) return null;
      eventBridge.emit('panel:closed', { workstationId: current });
      return null;
    });
    restoreCanvasFocus();
  }, [restoreCanvasFocus]);

  useEffect(() => {
    if (!activeWorkstation) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWorkstation, closeDrawer]);

  const navigateTo = useCallback(
    (target: AppRoute) => {
      if (!canTransitionRoute(route, target)) return;
      setActiveWorkstation(null);
      setNearbyWorkstation(null);
      setRoute(target);
    },
    [route],
  );

  const handlePromptClick = useCallback(() => {
    if (!nearbyWorkstation) return;
    eventBridge.emit('workstation:interact', {
      workstationId: nearbyWorkstation,
      label: WORKSTATION_META[nearbyWorkstation].title,
    });
  }, [nearbyWorkstation]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-warm)] text-[var(--color-text-primary)]">
      <header className="w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
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

            <span
              className="text-[12px] font-medium text-[var(--color-text-secondary)]"
              aria-current="page"
            >
              {route === 'workspace'
                ? 'Academic Spaces / Team Workspace Studio'
                : 'Academic Spaces'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

            <span className="status-badge bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)] border border-[#C4BAD6]">
              M1 Studio Preview
            </span>

            {route === 'workspace' ? (
              <button
                type="button"
                className="btn-secondary"
                data-testid="leave-studio-btn"
                onClick={() => navigateTo('spaces')}
              >
                Leave Studio
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                data-testid="header-enter-studio-btn"
                onClick={() => navigateTo('workspace')}
              >
                Enter Studio
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        {route === 'workspace' ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="m-0 text-[22px] font-semibold leading-7 text-[var(--color-text-charcoal)]">
                Team Workspace Studio
              </h1>
              <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
                Use WASD or Arrow keys to walk. Press E near a workstation.
              </p>
            </div>

            <section
              aria-label="Campus studio viewport"
              className="surface-card relative flex flex-col overflow-hidden p-2 sm:p-3"
            >
              <div
                ref={canvasWrapperRef}
                className="relative w-full overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-warm)]"
                style={{ height: 'min(68vh, 640px)', minHeight: '420px' }}
              >
                <PhaserHost
                  className="h-full w-full"
                  activeWorkstation={activeWorkstation}
                />

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
                <span>16px pixel grid with integer zoom</span>
              </div>
            </section>
          </>
        ) : (
          <section
            aria-label="Academic spaces directory"
            className="surface-card mx-auto my-auto flex w-full max-w-[680px] flex-col gap-5 p-6 sm:p-8"
          >
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[22px] font-semibold leading-7 text-[var(--color-text-charcoal)]">
                Academic Spaces
              </h1>
              <p className="m-0 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                No enrolled courses are loaded in M1. Database tables, team
                assignments, and row-level policies connect here in M2.
              </p>
            </div>

            <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-4">
              <h2 className="m-0 mb-1.5 text-[15px] font-medium text-[var(--color-text-charcoal)]">
                Supabase Backend Status
              </h2>
              {supabaseState.status === 'loading' && (
                <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
                  Checking Supabase health endpoint...
                </p>
              )}
              {supabaseState.status === 'success' && (
                <p className="m-0 text-[13px] text-[var(--color-text-primary)]">
                  Connected to Supabase project ({supabaseState.data.latencyMs}
                  ms response). Clean database ready for M2 schema migrations.
                </p>
              )}
              {supabaseState.status === 'error' && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 text-[13px] text-[var(--color-status-error-text)]">
                    {supabaseState.error.message}
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void runHealthCheck()}
                  >
                    Retry check
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary"
                data-testid="enter-studio-btn"
                onClick={() => navigateTo('workspace')}
              >
                Enter Studio
              </button>
            </div>
          </section>
        )}
      </main>

      {activeWorkstation && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close workstation drawer"
            onClick={closeDrawer}
            className="fixed inset-0 z-40 border-0 p-0"
            style={{ backgroundColor: 'rgba(48, 52, 59, 0.15)' }}
          />

          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="workstation-drawer-title"
            data-testid="workstation-drawer"
            data-workstation-id={activeWorkstation}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[440px] flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]"
            style={{ boxShadow: 'var(--shadow-drawer)' }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <span className="status-badge w-fit bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)] border border-[var(--color-accent-sage)]">
                  Workstation
                </span>
                <h2
                  id="workstation-drawer-title"
                  className="m-0 text-[18px] font-semibold leading-6 text-[var(--color-text-charcoal)]"
                >
                  {WORKSTATION_META[activeWorkstation].title}
                </h2>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                className="btn-ghost"
                aria-label="Close panel"
                data-testid="close-drawer-btn"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              <p className="m-0 text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                {WORKSTATION_PURPOSE[activeWorkstation]}
              </p>

              <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-4">
                <h3 className="m-0 mb-1.5 text-[15px] font-medium text-[var(--color-text-charcoal)]">
                  No workspace records loaded yet
                </h3>
                <p className="m-0 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                  The database is clean-slated for M1. M2 adds Postgres tables,
                  seed data, and RLS queries for this workstation.
                </p>
              </div>

              <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4">
                <h3 className="m-0 mb-1.5 text-[15px] font-medium text-[var(--color-text-charcoal)]">
                  Database connection
                </h3>
                {supabaseState.status === 'loading' && (
                  <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
                    Checking live Supabase endpoint...
                  </p>
                )}
                {supabaseState.status === 'success' && (
                  <p className="m-0 text-[13px] text-[var(--color-status-done-text)]">
                    Supabase ready ({supabaseState.data.latencyMs}ms).
                  </p>
                )}
                {supabaseState.status === 'error' && (
                  <div className="flex flex-col gap-2">
                    <p className="m-0 text-[13px] text-[var(--color-status-error-text)]">
                      {supabaseState.error.message}
                    </p>
                    <button
                      type="button"
                      className="btn-secondary w-fit"
                      onClick={() => void runHealthCheck()}
                    >
                      Retry connection
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--color-border-subtle)] px-6 py-4">
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={closeDrawer}
              >
                Return to Studio (Esc)
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default App;
