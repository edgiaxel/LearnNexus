import { useEffect, useRef } from 'react';
import { WORKSTATION_META } from '../../app/routerContract';
import type { WorkstationPanelProps } from '../../types/components';
import { ProjectOverviewPanel } from './ProjectOverviewPanel';
import { ResourceLibraryPanel } from './ResourceLibraryPanel';
import { TasksSprintBoardPanel } from './TasksSprintBoardPanel';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function WorkstationPanel({
  workstationId,
  workspace,
  repository,
  isDemoSession,
  onSessionExpired,
  onClose,
}: WorkstationPanelProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [workstationId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.closest('[aria-hidden="true"]') === null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !drawerRef.current.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close workstation drawer"
        onClick={onClose}
        className="fixed inset-0 z-40 border-0 p-0"
        style={{ backgroundColor: 'rgba(48, 52, 59, 0.15)' }}
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workstation-drawer-title"
        data-testid="workstation-drawer"
        data-workstation-id={workstationId}
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[440px] flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)]"
        style={{ boxShadow: 'var(--shadow-drawer)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-6 py-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="status-badge w-fit border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]">
                Workstation
              </span>
              <span className="status-badge w-fit border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]">
                {workspace.classCode} / {workspace.teamName}
              </span>
            </div>
            <h2
              id="workstation-drawer-title"
              className="m-0 text-[18px] font-semibold leading-6 text-[var(--color-text-charcoal)]"
            >
              {WORKSTATION_META[workstationId].title}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="btn-ghost shrink-0"
            aria-label="Close panel"
            data-testid="close-drawer-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {workstationId === 'overview' && (
            <ProjectOverviewPanel
              teamId={workspace.teamId}
              workspace={workspace}
              repository={repository}
              isDemoSession={isDemoSession}
              onSessionExpired={onSessionExpired}
            />
          )}
          {workstationId === 'tasks' && (
            <TasksSprintBoardPanel
              projectId={workspace.projectId}
              workspace={workspace}
              repository={repository}
              isDemoSession={isDemoSession}
              onSessionExpired={onSessionExpired}
            />
          )}
          {workstationId === 'resources' && (
            <ResourceLibraryPanel
              projectId={workspace.projectId}
              workspace={workspace}
              repository={repository}
              isDemoSession={isDemoSession}
              onSessionExpired={onSessionExpired}
            />
          )}
        </div>

        <div className="border-t border-[var(--color-border-subtle)] px-6 py-4">
          <button
            type="button"
            className="btn-secondary w-full"
            data-testid="return-to-studio-btn"
            onClick={onClose}
          >
            Return to Studio (Esc)
          </button>
        </div>
      </aside>
    </>
  );
}
