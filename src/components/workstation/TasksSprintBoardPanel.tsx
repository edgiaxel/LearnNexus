import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { TasksSprintBoardPanelProps } from '../../types/components';
import type {
  AsyncState,
  SprintTask,
  TaskStatus,
  TeamMemberSummary,
} from '../../types/contracts';
import {
  FilterTabBar,
  PanelContextHeader,
  PanelEmptyCard,
  PanelErrorCard,
  PanelLoadingSkeleton,
} from './PanelStateCards';
import {
  dateInputToIso,
  formatDisplayDate,
  toDateInputValue,
} from './workstationUtils';

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

const LEGACY_ASSIGNEE_VALUE = '__legacy_assignee__';

interface FailedTaskSave {
  attemptedStatus: TaskStatus;
  message: string;
}

interface TaskEditDraft {
  title: string;
  description: string;
  assigneeValue: string;
  legacyAssigneeName: string | null;
  legacyAssigneeId: string | null;
  dueDate: string;
  status: TaskStatus;
}

function resolveAssigneePayload(
  selectedValue: string,
  teamMembers: readonly TeamMemberSummary[],
  legacy?: { id: string | null; name: string | null },
): { assigneeId: string | null; assigneeName: string | null } {
  if (!selectedValue) {
    return { assigneeId: null, assigneeName: null };
  }
  if (selectedValue === LEGACY_ASSIGNEE_VALUE && legacy) {
    return { assigneeId: legacy.id, assigneeName: legacy.name };
  }
  const member = teamMembers.find((item) => item.userId === selectedValue);
  if (!member) {
    return { assigneeId: null, assigneeName: null };
  }
  return { assigneeId: member.userId, assigneeName: member.displayName };
}

export function TasksSprintBoardPanel({
  projectId,
  workspace,
  repository,
  syncRevision = 0,
  isDemoSession,
  onDataMutated,
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
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [activeFilter, setActiveFilter] = useState<TaskFilterKey>('all');
  const [savingStatusByTaskId, setSavingStatusByTaskId] = useState<
    Record<string, TaskStatus>
  >({});
  const [failedSaveByTaskId, setFailedSaveByTaskId] = useState<
    Record<string, FailedTaskSave>
  >({});
  const [hasSavedOnce, setHasSavedOnce] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskEditDraft | null>(null);
  const [savingEditTaskId, setSavingEditTaskId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(
    null,
  );
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{
    taskId: string;
    message: string;
  } | null>(null);

  const requestSeqRef = useRef(0);
  const tasksGenerationRef = useRef(0);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const lastSyncRevisionRef = useRef(syncRevision);

  const fetchTasks = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        tasksGenerationRef.current += 1;
        setSavingStatusByTaskId({});
        setFailedSaveByTaskId({});
        setEditingTaskId(null);
        setEditDraft(null);
        setEditError(null);
        setConfirmDeleteTaskId(null);
        setDeleteError(null);
      }

      if (projectId === null) {
        requestSeqRef.current += 1;
        setState({
          status: 'empty',
          reason: 'No project is linked to this workspace yet.',
        });
        return;
      }

      const seq = ++requestSeqRef.current;
      if (!silent) {
        setState({
          status: 'loading',
          label: 'Loading sprint tasks...',
        });
      }

      try {
        const [tasksResult, membersResult] = await Promise.all([
          repository.getProjectTasks(projectId),
          repository.getTeamMembers(workspace.teamId),
        ]);
        if (seq !== requestSeqRef.current) return;

        if (membersResult.ok) {
          setTeamMembers(membersResult.data);
        } else if (membersResult.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }

        if (!tasksResult.ok) {
          if (tasksResult.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          if (!silent) {
            setState({
              status: 'error',
              error: tasksResult.error,
            });
          }
          return;
        }

        if (tasksResult.data.length === 0) {
          setState({
            status: 'empty',
            reason: 'No tasks in this sprint yet.',
            actionLabel: 'Refresh tasks',
          });
          return;
        }

        setState({
          status: 'success',
          data: tasksResult.data,
        });
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        if (!silent) {
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
      }
    },
    [projectId, workspace.teamId, repository],
  );

  useEffect(() => {
    setActiveFilter('all');
    setHasSavedOnce(false);
    setCreateOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewAssigneeId('');
    setNewDueDate('');
    setNewStatus('todo');
    setCreateError(null);
    void fetchTasks({ silent: false });
    return () => {
      requestSeqRef.current += 1;
      tasksGenerationRef.current += 1;
    };
  }, [fetchTasks]);

  useEffect(() => {
    if (syncRevision > 0 && syncRevision !== lastSyncRevisionRef.current) {
      lastSyncRevisionRef.current = syncRevision;
      void fetchTasks({ silent: true });
    } else {
      lastSyncRevisionRef.current = syncRevision;
    }
  }, [syncRevision, fetchTasks]);

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
        onDataMutated?.('tasks');
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
    [projectId, repository, onDataMutated],
  );

  const handleRevertTask = useCallback((taskId: string) => {
    setFailedSaveByTaskId((prev) => {
      if (!(taskId in prev)) return prev;
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectId === null || creatingTask) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setCreateError('Task title is required.');
      return;
    }

    const capturedProjectId = projectId;
    const capturedGeneration = tasksGenerationRef.current;
    const assignee = resolveAssigneePayload(newAssigneeId, teamMembers);
    const trimmedDesc = newDescription.trim();

    setCreateError(null);
    setCreatingTask(true);

    try {
      const result = await repository.createTask({
        projectId,
        title: trimmedTitle,
        description: trimmedDesc ? trimmedDesc : null,
        status: newStatus,
        assigneeId: assignee.assigneeId,
        assigneeName: assignee.assigneeName,
        dueAt: dateInputToIso(newDueDate),
      });

      if (
        activeProjectIdRef.current !== capturedProjectId ||
        tasksGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setCreatingTask(false);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setCreateError(result.error.message);
        return;
      }

      setState((prev) => {
        if (prev.status !== 'success') {
          return {
            status: 'success',
            data: [result.data],
          };
        }
        return {
          status: 'success',
          data: [...prev.data, result.data],
        };
      });

      if (activeFilter !== 'all' && activeFilter !== result.data.status) {
        setActiveFilter('all');
      }

      setNewTitle('');
      setNewDescription('');
      setNewAssigneeId('');
      setNewDueDate('');
      setNewStatus('todo');
      setCreateOpen(false);
      setHasSavedOnce(true);
      onDataMutated?.('tasks');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        tasksGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setCreatingTask(false);
      setCreateError(
        err instanceof Error
          ? err.message
          : 'Unable to create the task right now.',
      );
    }
  };

  const startEditTask = (task: SprintTask) => {
    const matchedMember = teamMembers.find((member) =>
      task.assigneeId
        ? member.userId === task.assigneeId
        : task.assigneeName !== null && member.displayName === task.assigneeName,
    );

    const hasLegacyAssignee =
      !matchedMember && Boolean(task.assigneeName && task.assigneeName.trim());

    setConfirmDeleteTaskId(null);
    setDeleteError(null);
    setEditError(null);
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description ?? '',
      assigneeValue: matchedMember
        ? matchedMember.userId
        : hasLegacyAssignee
          ? LEGACY_ASSIGNEE_VALUE
          : '',
      legacyAssigneeName: hasLegacyAssignee ? task.assigneeName : null,
      legacyAssigneeId: hasLegacyAssignee ? (task.assigneeId ?? null) : null,
      dueDate: toDateInputValue(task.dueAt),
      status: task.status,
    });
  };

  const cancelEditTask = () => {
    if (savingEditTaskId) return;
    setEditingTaskId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const handleSaveEditTask = async (
    event: FormEvent<HTMLFormElement>,
    taskId: string,
  ) => {
    event.preventDefault();
    if (!editDraft || savingEditTaskId) return;

    const trimmedTitle = editDraft.title.trim();
    if (!trimmedTitle) {
      setEditError('Task title is required.');
      return;
    }

    const capturedProjectId = projectId;
    const capturedGeneration = tasksGenerationRef.current;
    const assignee = resolveAssigneePayload(
      editDraft.assigneeValue,
      teamMembers,
      {
        id: editDraft.legacyAssigneeId,
        name: editDraft.legacyAssigneeName,
      },
    );
    const trimmedDesc = editDraft.description.trim();

    setEditError(null);
    setSavingEditTaskId(taskId);

    try {
      const result = await repository.updateTask(taskId, {
        title: trimmedTitle,
        description: trimmedDesc ? trimmedDesc : null,
        status: editDraft.status,
        assigneeId: assignee.assigneeId,
        assigneeName: assignee.assigneeName,
        dueAt: dateInputToIso(editDraft.dueDate),
      });

      if (
        activeProjectIdRef.current !== capturedProjectId ||
        tasksGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setSavingEditTaskId(null);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setEditError(result.error.message);
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
      setEditingTaskId(null);
      setEditDraft(null);
      setHasSavedOnce(true);
      onDataMutated?.('tasks');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        tasksGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setSavingEditTaskId(null);
      setEditError(
        err instanceof Error
          ? err.message
          : 'Unable to save task edits right now.',
      );
    }
  };

  const handleConfirmDeleteTask = async (taskId: string) => {
    if (deletingTaskId) return;

    const capturedProjectId = projectId;
    const capturedGeneration = tasksGenerationRef.current;
    setDeleteError(null);
    setDeletingTaskId(taskId);

    try {
      const result = await repository.deleteTask(taskId);
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        tasksGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setDeletingTaskId(null);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setDeleteError({
          taskId,
          message: result.error.message,
        });
        return;
      }

      setConfirmDeleteTaskId(null);
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setEditDraft(null);
      }
      setFailedSaveByTaskId((prev) => {
        if (!(taskId in prev)) return prev;
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setState((prev) => {
        if (prev.status !== 'success') return prev;
        const remaining = prev.data.filter((item) => item.id !== taskId);
        if (remaining.length === 0) {
          return {
            status: 'empty',
            reason: 'No tasks in this sprint yet.',
            actionLabel: 'Refresh tasks',
          };
        }
        return {
          status: 'success',
          data: remaining,
        };
      });
      setHasSavedOnce(true);
      onDataMutated?.('tasks');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        tasksGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setDeletingTaskId(null);
      setDeleteError({
        taskId,
        message:
          err instanceof Error
            ? err.message
            : 'Unable to delete task right now.',
      });
    }
  };

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

  const progressPercent =
    counts.all > 0 ? Math.round((counts.done / counts.all) * 100) : 0;

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter((task) => task.status === activeFilter);
  }, [activeFilter, tasks]);

  const canCreate = projectId !== null && !isLoading && state.status !== 'error';

  return (
    <div data-testid="tasks-sprint-panel" className="flex flex-col gap-4">
      <PanelContextHeader
        classCode={workspace.classCode}
        teamName={workspace.teamName}
        variant="text"
        isDemoSession={isDemoSession}
        refreshDisabled={isLoading || hasInFlightSaves}
        onRefresh={() => void fetchTasks({ silent: false })}
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
          onRetry={() => void fetchTasks({ silent: false })}
        />
      ) : (
        <>
          {canCreate && (
            <>
              <div
                data-testid="sprint-progress-summary"
                className="surface-card flex flex-col gap-2 p-3.5"
              >
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="font-semibold text-[var(--color-text-charcoal)]">
                    {counts.done} of {counts.all} tasks done
                  </span>
                  <span className="font-medium text-[var(--color-text-secondary)]">
                    {progressPercent}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Sprint completion progress"
                  aria-valuenow={counts.done}
                  aria-valuemin={0}
                  aria-valuemax={counts.all}
                  className="h-2.5 w-full overflow-hidden rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--color-accent-sage-strong)] transition-[width] duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="task-new-toggle-btn"
                  aria-expanded={createOpen}
                  aria-controls="task-create-form"
                  className={createOpen ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => {
                    setCreateOpen((prev) => !prev);
                    setCreateError(null);
                  }}
                >
                  {createOpen ? 'Close New Task' : '+ New Task'}
                </button>
              </div>

              {createOpen && (
                <form
                  id="task-create-form"
                  data-testid="task-create-form"
                  onSubmit={(event) => void handleCreateTask(event)}
                  className="surface-card flex flex-col gap-3 p-4"
                >
                  <h3 className="m-0 text-[15px] font-semibold text-[var(--color-text-charcoal)]">
                    New Sprint Task
                  </h3>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="task-title-input"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Task title
                    </label>
                    <input
                      id="task-title-input"
                      data-testid="task-title-input"
                      type="text"
                      className="control-input"
                      placeholder="e.g. Review sprint acceptance criteria"
                      value={newTitle}
                      disabled={creatingTask}
                      onChange={(event) => {
                        setNewTitle(event.target.value);
                        if (createError) setCreateError(null);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="task-description-input"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Description (optional)
                    </label>
                    <textarea
                      id="task-description-input"
                      data-testid="task-description-input"
                      rows={2}
                      className="control-input"
                      placeholder="Add scope details or checklist notes..."
                      value={newDescription}
                      disabled={creatingTask}
                      onChange={(event) => setNewDescription(event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="task-assignee-select"
                        className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                      >
                        Assignee
                      </label>
                      <select
                        id="task-assignee-select"
                        data-testid="task-assignee-select"
                        className="control-input"
                        value={newAssigneeId}
                        disabled={creatingTask}
                        onChange={(event) =>
                          setNewAssigneeId(event.target.value)
                        }
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="task-due-input"
                        className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                      >
                        Due date
                      </label>
                      <input
                        id="task-due-input"
                        data-testid="task-due-input"
                        type="date"
                        className="control-input"
                        value={newDueDate}
                        disabled={creatingTask}
                        onChange={(event) => setNewDueDate(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="task-create-status-select"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Initial status
                    </label>
                    <select
                      id="task-create-status-select"
                      data-testid="task-create-status-select"
                      className="control-input"
                      value={newStatus}
                      disabled={creatingTask}
                      onChange={(event) =>
                        setNewStatus(event.target.value as TaskStatus)
                      }
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  {createError && (
                    <div
                      role="alert"
                      className="rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-error-text)]"
                    >
                      {createError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="submit"
                      data-testid="task-create-submit-btn"
                      className="btn-primary"
                      disabled={creatingTask}
                    >
                      {creatingTask ? 'Creating task...' : 'Create Task'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={creatingTask}
                      onClick={() => {
                        setCreateOpen(false);
                        setCreateError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {state.status === 'empty' ? (
            <PanelEmptyCard
              heading={projectId === null ? 'No linked project' : 'No sprint tasks'}
              message={state.reason}
              actionLabel={projectId !== null ? 'Refresh tasks' : undefined}
              onAction={
                projectId !== null
                  ? () => void fetchTasks({ silent: false })
                  : undefined
              }
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
                  Could not save {failCount} task status update(s). Use Retry
                  save or Revert on the marked task below.
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
                    const isEditingThis =
                      editingTaskId === task.id && editDraft !== null;
                    const isSavingEditThis = savingEditTaskId === task.id;
                    const isConfirmingDelete = confirmDeleteTaskId === task.id;
                    const isDeletingThis = deletingTaskId === task.id;
                    const thisDeleteError =
                      deleteError?.taskId === task.id
                        ? deleteError.message
                        : null;

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
                            <span className={badge.badgeClass}>
                              {badge.label}
                            </span>
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

                        {isEditingThis && editDraft ? (
                          <form
                            onSubmit={(event) =>
                              void handleSaveEditTask(event, task.id)
                            }
                            className="flex flex-col gap-2.5 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-3"
                          >
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`task-edit-title-${task.id}`}
                                className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                              >
                                Title
                              </label>
                              <input
                                id={`task-edit-title-${task.id}`}
                                data-testid={`task-edit-title-input-${task.id}`}
                                type="text"
                                className="control-input"
                                value={editDraft.title}
                                disabled={isSavingEditThis}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditDraft((prev) =>
                                    prev ? { ...prev, title: value } : prev,
                                  );
                                  if (editError) setEditError(null);
                                }}
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`task-edit-desc-${task.id}`}
                                className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                              >
                                Description
                              </label>
                              <textarea
                                id={`task-edit-desc-${task.id}`}
                                data-testid={`task-edit-description-input-${task.id}`}
                                rows={2}
                                className="control-input"
                                value={editDraft.description}
                                disabled={isSavingEditThis}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditDraft((prev) =>
                                    prev
                                      ? { ...prev, description: value }
                                      : prev,
                                  );
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor={`task-edit-assignee-${task.id}`}
                                  className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                                >
                                  Assignee
                                </label>
                                <select
                                  id={`task-edit-assignee-${task.id}`}
                                  data-testid={`task-edit-assignee-select-${task.id}`}
                                  className="control-input"
                                  value={editDraft.assigneeValue}
                                  disabled={isSavingEditThis}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setEditDraft((prev) =>
                                      prev
                                        ? { ...prev, assigneeValue: value }
                                        : prev,
                                    );
                                  }}
                                >
                                  <option value="">Unassigned</option>
                                  {editDraft.legacyAssigneeName && (
                                    <option value={LEGACY_ASSIGNEE_VALUE}>
                                      {editDraft.legacyAssigneeName}
                                    </option>
                                  )}
                                  {teamMembers.map((member) => (
                                    <option
                                      key={member.userId}
                                      value={member.userId}
                                    >
                                      {member.displayName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor={`task-edit-due-${task.id}`}
                                  className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                                >
                                  Due date
                                </label>
                                <input
                                  id={`task-edit-due-${task.id}`}
                                  data-testid={`task-edit-due-input-${task.id}`}
                                  type="date"
                                  className="control-input"
                                  value={editDraft.dueDate}
                                  disabled={isSavingEditThis}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setEditDraft((prev) =>
                                      prev ? { ...prev, dueDate: value } : prev,
                                    );
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor={`task-edit-status-${task.id}`}
                                className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                              >
                                Status
                              </label>
                              <select
                                id={`task-edit-status-${task.id}`}
                                data-testid={`task-edit-status-select-${task.id}`}
                                className="control-input"
                                value={editDraft.status}
                                disabled={isSavingEditThis}
                                onChange={(event) => {
                                  const value = event.target.value as TaskStatus;
                                  setEditDraft((prev) =>
                                    prev ? { ...prev, status: value } : prev,
                                  );
                                }}
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                            </div>

                            {editError && (
                              <div
                                role="alert"
                                className="rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-error-text)]"
                              >
                                {editError}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="submit"
                                data-testid={`task-edit-save-btn-${task.id}`}
                                className="btn-primary"
                                disabled={isSavingEditThis}
                              >
                                {isSavingEditThis ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                disabled={isSavingEditThis}
                                onClick={cancelEditTask}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {task.description &&
                              task.description.trim() !== '' && (
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
                                  const nextStatus =
                                    event.target.value as TaskStatus;
                                  if (nextStatus === selectValue) return;
                                  void handleStatusChange(task.id, nextStatus);
                                }}
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <button
                                type="button"
                                data-testid={`task-edit-btn-${task.id}`}
                                className="btn-secondary"
                                disabled={
                                  isSavingThis ||
                                  isDeletingThis ||
                                  savingEditTaskId !== null
                                }
                                onClick={() => startEditTask(task)}
                              >
                                Edit
                              </button>

                              {!isConfirmingDelete ? (
                                <button
                                  type="button"
                                  data-testid={`task-delete-btn-${task.id}`}
                                  className="btn-ghost text-[var(--color-status-error-text)]"
                                  disabled={isSavingThis || deletingTaskId !== null}
                                  onClick={() => {
                                    setDeleteError(null);
                                    setConfirmDeleteTaskId(task.id);
                                  }}
                                >
                                  Delete
                                </button>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[12px] font-medium text-[var(--color-status-error-text)]">
                                    Delete this task?
                                  </span>
                                  <button
                                    type="button"
                                    data-testid={`task-delete-confirm-btn-${task.id}`}
                                    disabled={isDeletingThis}
                                    onClick={() =>
                                      void handleConfirmDeleteTask(task.id)
                                    }
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[13px] font-medium text-[var(--color-status-error-text)] hover:bg-[#F5DFDD]"
                                  >
                                    {isDeletingThis
                                      ? 'Deleting...'
                                      : 'Confirm delete'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    disabled={isDeletingThis}
                                    onClick={() => setConfirmDeleteTaskId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>

                            {thisDeleteError && (
                              <div
                                role="alert"
                                className="rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-error-text)]"
                              >
                                {thisDeleteError}
                              </div>
                            )}
                          </>
                        )}

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
        </>
      )}
    </div>
  );
}
