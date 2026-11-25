import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TasksSprintBoardPanelProps } from '../../types/components';
import type {
  AsyncState,
  SprintTask,
  TaskStatus,
} from '../../types/contracts';
import {
  FilterTabBar,
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

type SaveFeedbackState =
  | { kind: 'idle' }
  | { kind: 'saving'; taskId: string }
  | { kind: 'saved' }
  | {
      kind: 'error';
      taskId: string;
      attemptedStatus: TaskStatus;
      message: string;
    };

export function TasksSprintBoardPanel({
  projectId,
  workspace,
  repository,
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
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState>({
    kind: 'idle',
  });
  const requestSeqRef = useRef(0);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;

  const fetchTasks = useCallback(async () => {
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

    const result = await repository.getProjectTasks(projectId);
    if (seq !== requestSeqRef.current) return;

    if (!result.ok) {
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
  }, [projectId, repository]);

  useEffect(() => {
    setActiveFilter('all');
    setSaveFeedback({ kind: 'idle' });
    setSavingTaskId(null);
    void fetchTasks();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchTasks]);

  const handleStatusChange = useCallback(
    async (taskId: string, nextStatus: TaskStatus) => {
      const capturedProjectId = projectId;
      setSavingTaskId(taskId);
      setSaveFeedback({ kind: 'saving', taskId });

      const result = await repository.updateTaskStatus(taskId, nextStatus);
      if (activeProjectIdRef.current !== capturedProjectId) return;

      setSavingTaskId((current) => (current === taskId ? null : current));

      if (!result.ok) {
        setSaveFeedback({
          kind: 'error',
          taskId,
          attemptedStatus: nextStatus,
          message: result.error.message,
        });
        return;
      }

      setState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: prev.data.map((item) =>
            item.id === result.data.id ? result.data : item,
          ),
        };
      });
      setSaveFeedback({ kind: 'saved' });
    },
    [projectId, repository],
  );

  const tasks = state.status === 'success' ? state.data : [];

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

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <PanelLoadingSkeleton
        testId="tasks-sprint-panel"
        statusText="Loading sprint tasks..."
        blocks={TASK_SKELETON_BLOCKS}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <PanelErrorCard
        testId="tasks-sprint-panel"
        heading="Could not load sprint tasks"
        message={state.error.message}
        onRetry={() => void fetchTasks()}
      />
    );
  }

  if (state.status === 'empty') {
    return (
      <PanelEmptyCard
        testId="tasks-sprint-panel"
        heading={projectId === null ? 'No linked project' : 'No sprint tasks'}
        message={state.reason}
        actionLabel={projectId !== null ? 'Refresh tasks' : undefined}
        onAction={projectId !== null ? () => void fetchTasks() : undefined}
      />
    );
  }

  return (
    <div data-testid="tasks-sprint-panel" className="flex flex-col gap-4">
      <p className="m-0 text-[12px] font-medium text-[var(--color-text-secondary)]">
        {workspace.classCode} / {workspace.teamName}
      </p>

      <FilterTabBar
        ariaLabel="Filter tasks by status"
        tabs={TASK_FILTER_TABS}
        activeKey={activeFilter}
        counts={counts}
        testIdPrefix="task-filter"
        onSelect={setActiveFilter}
      />

      {saveFeedback.kind === 'error' ? (
        <div
          data-testid="tasks-save-indicator"
          role="alert"
          className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-3.5"
        >
          <p className="m-0 text-[13px] font-medium text-[var(--color-status-error-text)]">
            Could not update task status: {saveFeedback.message}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={savingTaskId === saveFeedback.taskId}
              onClick={() =>
                void handleStatusChange(
                  saveFeedback.taskId,
                  saveFeedback.attemptedStatus,
                )
              }
            >
              Retry
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSaveFeedback({ kind: 'idle' })}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div
          data-testid="tasks-save-indicator"
          role="status"
          className={
            saveFeedback.kind === 'saved'
              ? 'rounded-[8px] border border-[var(--color-accent-sage)] bg-[var(--color-status-done-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-done-text)]'
              : 'rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)]'
          }
        >
          {saveFeedback.kind === 'saving' && 'Saving change...'}
          {saveFeedback.kind === 'saved' && 'All changes saved'}
          {saveFeedback.kind === 'idle' &&
            'Changes save directly to Supabase Postgres.'}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="surface-card flex flex-col gap-3 bg-[var(--color-surface-secondary)] p-4">
          <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
            No tasks match the{' '}
            {TASK_FILTER_TABS.find((tab) => tab.key === activeFilter)?.label ??
              activeFilter}{' '}
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
            const isSavingThis = savingTaskId === task.id;

            return (
              <li
                key={task.id}
                data-testid={`task-item-${task.id}`}
                className="surface-card flex flex-col gap-3 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 text-[15px] font-medium leading-5 text-[var(--color-text-charcoal)]">
                    {task.title}
                  </h3>
                  <span className={`${badge.badgeClass} shrink-0`}>
                    {badge.label}
                  </span>
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
                    value={task.status}
                    disabled={isSavingThis}
                    onChange={(event) => {
                      const nextStatus = event.target.value as TaskStatus;
                      if (nextStatus === task.status) return;
                      void handleStatusChange(task.id, nextStatus);
                    }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
