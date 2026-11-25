import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TasksSprintBoardPanelProps } from '../../types/components';
import type {
  AsyncState,
  SprintTask,
  TaskStatus,
} from '../../types/contracts';
import {
  FilterTabBar,
  PanelContextHeader,
  PanelEmptyCard,
  PanelErrorCard,
  PanelLoadingSkeleton,
} from './PanelStateCards';
import { formatDisplayDate } from './workstationUtils';

type TaskFilterKey = 'all' | TaskStatus;

const TASK_FILTER_TABS: ReadonlyArray<{ key: TaskFilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const TASK_SKELETON_BLOCKS = [
  'h-11 w-full rounded-[8px]',
  'h-28 w-full rounded-[10px]',
  'h-28 w-full rounded-[10px]',
] as const;

const STATUS_BADGE_META: Record<
  TaskStatus,
  { label: string; badgeClass: string }
> = {
  todo: {
    label: 'To Do',
    badgeClass: 'status-badge status-badge--todo',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'status-badge status-badge--in-progress',
  },
  done: {
    label: 'Done',
    badgeClass: 'status-badge status-badge--done',
  },
};

interface FailedTaskSave {
  attemptedStatus: TaskStatus;
  message: string;
}

export function TasksSprintBoardPanel({
  projectId,
  workspace,
  repository,
  isDemoSession,
  onSessionExpired,
}: TasksSprintBoardPanelProps) {
  const [state, setState] = useState<AsyncState<SprintTask[]>>(() =>
    projectId === null
      ? {
          status: 'empty',
          reason: 'No project is linked to this workspace yet.',
        }
      : {
          status: 'loading',
          label: 'Loading sprint tasks...',
        },
  );
  const [activeFilter, setActiveFilter] = useState<TaskFilterKey>('all');
  const [savingStatusByTaskId, setSavingStatusByTaskId] = useState<
    Record<string, TaskStatus>
  >({});
  const [failedSaveByTaskId, setFailedSaveByTaskId] = useState<
    Record<string, FailedTaskSave>
  >({});
  const [hasSavedOnce, setHasSavedOnce] = useState(false);

  const requestSeqRef = useRef(0);
  const tasksGenerationRef = useRef(0);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  const fetchTasks = useCallback(async () => {
    tasksGenerationRef.current += 1;
    setSavingStatusByTaskId({});
    setFailedSaveByTaskId({});

    if (projectId === null) {
      requestSeqRef.current += 1;
      setState({
        status: 'empty',
        reason: 'No project is linked to this workspace yet.',
      });
      return;
    }

    const seq = ++requestSeqRef.current;
    setState({
      status: 'loading',
      label: 'Loading sprint tasks...',
    });

    try {
      const result = await repository.getProjectTasks(projectId);
      if (seq !== requestSeqRef.current) return;

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
        }
        setState({
          status: 'error',
          error: result.error,
        });
        return;
      }

      if (result.data.length === 0) {
        setState({
          status: 'empty',
          reason: 'No tasks in this sprint yet.',
          actionLabel: 'Refresh tasks',
        });
        return;
      }

      setState({
        status: 'success',
        data: result.data,
      });
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setState({
        status: 'error',
        error: {
          code: 'unknown',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to load sprint tasks right now.',
          retryable: true,
        },
      });
    }
  }, [projectId, repository]);

  useEffect(() => {
    setActiveFilter('all');
    setHasSavedOnce(false);
    void fetchTasks();
    return () => {
      requestSeqRef.current += 1;
      tasksGenerationRef.current += 1;
    };
  }, [fetchTasks]);

  const handleStatusChange = useCallback(
    async (taskId: string, nextStatus: TaskStatus) => {
      const capturedProjectId = projectId;
      const capturedGeneration = tasksGenerationRef.current;

      setFailedSaveByTaskId((prev) => {
        if (!(taskId in prev)) return prev;
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setSavingStatusByTaskId((prev) => ({
        ...prev,
        [taskId]: nextStatus,
      }));

      try {
        const result = await repository.updateTaskStatus(taskId, nextStatus);
        if (
          activeProjectIdRef.current !== capturedProjectId ||
          tasksGenerationRef.current !== capturedGeneration
        ) {
          return;
        }

        setSavingStatusByTaskId((prev) => {
          if (!(taskId in prev)) return prev;
          const next = { ...prev };
          delete next[taskId];
          return next;
        });

        if (!result.ok) {
          if (result.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          setFailedSaveByTaskId((prev) => ({
            ...prev,
            [taskId]: {
              attemptedStatus: nextStatus,
              message: result.error.message,
            },
          }));
          return;
        }

        setFailedSaveByTaskId((prev) => {
          if (!(taskId in prev)) return prev;
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        setState((prev) => {
          if (prev.status !== 'success') return prev;
          return {
            status: 'success',
            data: prev.data.map((item) =>
              item.id === result.data.id ? result.data : item,
            ),
          };
        });
        setHasSavedOnce(true);
      } catch (err) {
        if (
          activeProjectIdRef.current !== capturedProjectId ||
          tasksGenerationRef.current !== capturedGeneration
        ) {
          return;
        }
        setSavingStatusByTaskId((prev) => {
          if (!(taskId in prev)) return prev;
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        setFailedSaveByTaskId((prev) => ({
          ...prev,
          [taskId]: {
            attemptedStatus: nextStatus,
            message:
              err instanceof Error
                ? err.message
                : 'Unable to save the task status update right now.',
          },
        }));
      }
    },
    [projectId, repository],
  );

  const handleRevertTask = useCallback((taskId: string) => {
    setFailedSaveByTaskId((prev) => {
      if (!(taskId in prev)) return prev;
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const isLoading = state.status === 'loading' || state.status === 'idle';
  const tasks = state.status === 'success' ? state.data : [];
  const hasInFlightSaves = Object.keys(savingStatusByTaskId).length > 0;
  const failCount = Object.keys(failedSaveByTaskId).length;

  const counts = useMemo(() => {
    const summary: Record<TaskFilterKey, number> = {
      all: tasks.length,
      todo: 0,
      in_progress: 0,
      done: 0,
    };
    for (const task of tasks) {
      summary[task.status] += 1;
    }
    return summary;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter((task) => task.status === activeFilter);
  }, [activeFilter, tasks]);

  return (
    <div data-testid="tasks-sprint-panel" className="flex flex-col gap-4">
      <PanelContextHeader
        classCode={workspace.classCode}
        teamName={workspace.teamName}
        variant="text"
        isDemoSession={isDemoSession}
        refreshDisabled={isLoading || hasInFlightSaves}
        onRefresh={() => void fetchTasks()}
      />

      {isLoading ? (
        <PanelLoadingSkeleton
          statusText="Loading sprint tasks..."
          blocks={TASK_SKELETON_BLOCKS}
        />
      ) : state.status === 'error' ? (
        <PanelErrorCard
          heading="Could not load sprint tasks"
          message={state.error.message}
          onRetry={() => void fetchTasks()}
        />
      ) : state.status === 'empty' ? (
        <PanelEmptyCard
          heading={projectId === null ? 'No linked project' : 'No sprint tasks'}
          message={state.reason}
          actionLabel={projectId !== null ? 'Refresh tasks' : undefined}
          onAction={projectId !== null ? () => void fetchTasks() : undefined}
        />
      ) : (
        <>
          <FilterTabBar
            ariaLabel="Filter tasks by status"
            tabs={TASK_FILTER_TABS}
            activeKey={activeFilter}
            counts={counts}
            testIdPrefix="task-filter"
            onSelect={setActiveFilter}
          />

          {failCount > 0 ? (
            <div
              data-testid="tasks-save-indicator"
              role="alert"
              className="rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--color-status-error-text)]"
            >
              Could not save {failCount} task status update(s). Use Retry save
              or Revert on the marked task below.
            </div>
          ) : hasInFlightSaves ? (
            <div
              data-testid="tasks-save-indicator"
              role="status"
              className="rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)]"
            >
              Saving change...
            </div>
          ) : hasSavedOnce ? (
            <div
              data-testid="tasks-save-indicator"
              role="status"
              className="rounded-[8px] border border-[var(--color-accent-sage)] bg-[var(--color-status-done-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-done-text)]"
            >
              All changes saved
            </div>
          ) : (
            <div
              data-testid="tasks-save-indicator"
              role="status"
              className="rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)]"
            >
              Changes save directly to Supabase Postgres.
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <div className="surface-card flex flex-col gap-3 bg-[var(--color-surface-secondary)] p-4">
              <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
                No tasks match the{' '}
                {TASK_FILTER_TABS.find((tab) => tab.key === activeFilter)
                  ?.label ?? activeFilter}{' '}
                filter.
              </p>
              <button
                type="button"
                className="btn-secondary w-fit"
                onClick={() => setActiveFilter('all')}
              >
                Show all tasks
              </button>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {filteredTasks.map((task) => {
                const badge = STATUS_BADGE_META[task.status];
                const dueDateLabel = task.dueAt
                  ? formatDisplayDate(task.dueAt, 'date')
                  : null;
                const savingStatus = savingStatusByTaskId[task.id];
                const failedSave = failedSaveByTaskId[task.id];
                const selectValue =
                  savingStatus ?? failedSave?.attemptedStatus ?? task.status;
                const isSavingThis = Boolean(savingStatus);

                return (
                  <li
                    key={task.id}
                    data-testid={`task-item-${task.id}`}
                    className="surface-card flex flex-col gap-3 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="m-0 min-w-0 flex-1 text-[15px] font-medium leading-5 text-[var(--color-text-charcoal)]">
                        {task.title}
                      </h3>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <span className={badge.badgeClass}>{badge.label}</span>
                        {failedSave && (
                          <span
                            data-testid={`task-unsaved-badge-${task.id}`}
                            className="status-badge status-badge--error"
                          >
                            Unsaved change
                          </span>
                        )}
                      </div>
                    </div>

                    {task.description && task.description.trim() !== '' && (
                      <p className="m-0 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--color-text-secondary)]">
                      <span>
                        Assignee:{' '}
                        <strong className="font-medium text-[var(--color-text-primary)]">
                          {task.assigneeName?.trim() || 'Unassigned'}
                        </strong>
                      </span>
                      <span>Due: {dueDateLabel ?? 'No due date'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <label
                        htmlFor={`task-status-${task.id}`}
                        className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                      >
                        Status
                      </label>
                      <select
                        id={`task-status-${task.id}`}
                        className="control-input"
                        data-testid={`task-status-select-${task.id}`}
                        value={selectValue}
                        disabled={isSavingThis}
                        onChange={(event) => {
                          const nextStatus = event.target.value as TaskStatus;
                          if (nextStatus === selectValue) return;
                          void handleStatusChange(task.id, nextStatus);
                        }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>

                    {failedSave && (
                      <div
                        role="alert"
                        className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-3"
                      >
                        <p className="m-0 break-words text-[12px] font-medium text-[var(--color-status-error-text)]">
                          Could not save: {failedSave.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-secondary"
                            data-testid={`task-retry-btn-${task.id}`}
                            disabled={isSavingThis}
                            onClick={() =>
                              void handleStatusChange(
                                task.id,
                                failedSave.attemptedStatus,
                              )
                            }
                          >
                            Retry save
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            data-testid={`task-revert-btn-${task.id}`}
                            disabled={isSavingThis}
                            onClick={() => handleRevertTask(task.id)}
                          >
                            Revert
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
