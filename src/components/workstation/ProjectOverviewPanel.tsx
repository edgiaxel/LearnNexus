import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { ProjectOverviewPanelProps } from '../../types/components';
import type {
  ActivityEntityType,
  ActivityLogItem,
  AsyncState,
  ProjectOverview,
} from '../../types/contracts';
import {
  PanelContextHeader,
  PanelEmptyCard,
  PanelErrorCard,
  PanelLoadingSkeleton,
} from './PanelStateCards';
import { formatDisplayDate, getTwoLetterInitials } from './workstationUtils';

const OVERVIEW_SKELETON_BLOCKS = [
  'h-6 w-2/3 rounded-[8px]',
  'h-24 w-full rounded-[10px]',
  'h-28 w-full rounded-[10px]',
  'h-20 w-full rounded-[10px]',
] as const;

const ACTIVITY_BADGE_META: Record<
  ActivityEntityType,
  { label: string; badgeClass: string }
> = {
  project: {
    label: 'Brief',
    badgeClass:
      'status-badge border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]',
  },
  task: {
    label: 'Task',
    badgeClass:
      'status-badge border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]',
  },
  resource: {
    label: 'Resource',
    badgeClass:
      'status-badge border border-[#A5C6D4] bg-[var(--color-accent-blue)] text-[var(--color-text-primary)]',
  },
  whiteboard: {
    label: 'Whiteboard',
    badgeClass:
      'status-badge border border-[#DFAF8D] bg-[var(--color-accent-peach)] text-[var(--color-text-primary)]',
  },
};

export function ProjectOverviewPanel({
  teamId,
  workspace,
  repository,
  onlineUserIds,
  syncRevision = 0,
  isDemoSession,
  onDataMutated,
  onSessionExpired,
}: ProjectOverviewPanelProps) {
  const [state, setState] = useState<AsyncState<ProjectOverview>>({
    status: 'loading',
    label: 'Loading project overview...',
  });
  const [activityState, setActivityState] = useState<
    AsyncState<ActivityLogItem[]>
  >({
    status: 'idle',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftObjectives, setDraftObjectives] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const activitySeqRef = useRef(0);
  const overviewGenerationRef = useRef(0);
  const activeTeamIdRef = useRef(teamId);
  activeTeamIdRef.current = teamId;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const lastSyncRevisionRef = useRef(syncRevision);

  const fetchActivity = useCallback(
    async (projectId: string, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const seq = ++activitySeqRef.current;

      if (!silent) {
        setActivityState({
          status: 'loading',
          label: 'Loading recent activity...',
        });
      }

      try {
        const result = await repository.getProjectActivity(projectId, 8);
        if (seq !== activitySeqRef.current) return;

        if (!result.ok) {
          if (result.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          if (!silent) {
            setActivityState({
              status: 'error',
              error: result.error,
            });
          }
          return;
        }

        if (result.data.length === 0) {
          setActivityState({
            status: 'empty',
            reason: 'No team activity recorded yet.',
          });
          return;
        }

        setActivityState({
          status: 'success',
          data: result.data,
        });
      } catch (err) {
        if (seq !== activitySeqRef.current) return;
        if (!silent) {
          setActivityState({
            status: 'error',
            error: {
              code: 'unknown',
              message:
                err instanceof Error
                  ? err.message
                  : 'Unable to load recent project activity right now.',
              retryable: true,
            },
          });
        }
      }
    },
    [repository],
  );

  const fetchOverview = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const seq = ++requestSeqRef.current;

      if (!silent) {
        overviewGenerationRef.current += 1;
        setState({
          status: 'loading',
          label: 'Loading project overview...',
        });
        setActivityState({ status: 'idle' });
      }

      try {
        const result = await repository.getProjectOverview(teamId);
        if (seq !== requestSeqRef.current) return;

        if (!result.ok) {
          if (result.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          if (!silent) {
            if (result.error.code === 'not_found') {
              setState({
                status: 'empty',
                reason: 'No project brief is linked to this team studio yet.',
                actionLabel: 'Refresh overview',
              });
              return;
            }

            setState({
              status: 'error',
              error: result.error,
            });
          }
          return;
        }

        const overview = result.data;
        if (
          !overview ||
          (!overview.title.trim() &&
            !overview.description.trim() &&
            overview.objectives.length === 0)
        ) {
          setState({
            status: 'empty',
            reason: 'No project brief is linked to this team studio yet.',
            actionLabel: 'Refresh overview',
          });
          return;
        }

        setState({
          status: 'success',
          data: overview,
        });
        void fetchActivity(overview.id, { silent });
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
                  : 'Unable to load the project overview right now.',
              retryable: true,
            },
          });
        }
      }
    },
    [repository, teamId, fetchActivity],
  );

  useEffect(() => {
    setIsEditing(false);
    setEditError(null);
    setSavingEdit(false);
    void fetchOverview({ silent: false });
    return () => {
      requestSeqRef.current += 1;
      activitySeqRef.current += 1;
      overviewGenerationRef.current += 1;
    };
  }, [fetchOverview]);

  useEffect(() => {
    if (syncRevision > 0 && syncRevision !== lastSyncRevisionRef.current) {
      lastSyncRevisionRef.current = syncRevision;
      void fetchOverview({ silent: true });
    } else {
      lastSyncRevisionRef.current = syncRevision;
    }
  }, [syncRevision, fetchOverview]);

  const onlineUserSet = useMemo(
    () => new Set(onlineUserIds ?? []),
    [onlineUserIds],
  );

  const isLoading = state.status === 'loading' || state.status === 'idle';
  const overview = state.status === 'success' ? state.data : null;
  const teamMembers = overview?.teamMembers ?? [];
  const lastUpdatedText = overview
    ? formatDisplayDate(overview.updatedAt, 'datetime')
    : null;

  const startEditing = () => {
    if (!overview) return;
    setDraftTitle(overview.title);
    setDraftDescription(overview.description);
    setDraftObjectives(
      overview.objectives.length > 0 ? [...overview.objectives] : [],
    );
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (savingEdit) return;
    setIsEditing(false);
    setEditError(null);
  };

  const handleObjectiveChange = (index: number, value: string) => {
    setDraftObjectives((prev) =>
      prev.map((item, i) => (i === index ? value : item)),
    );
  };

  const handleRemoveObjective = (index: number) => {
    setDraftObjectives((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddObjective = () => {
    setDraftObjectives((prev) => [...prev, '']);
  };

  const handleSaveBrief = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!overview || savingEdit) return;

    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setEditError('Project title is required.');
      return;
    }

    const cleanedObjectives = draftObjectives
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const capturedTeamId = teamId;
    const capturedGeneration = overviewGenerationRef.current;
    setEditError(null);
    setSavingEdit(true);

    try {
      const result = await repository.updateProjectOverview(overview.id, {
        title: trimmedTitle,
        description: draftDescription.trim(),
        objectives: cleanedObjectives,
      });

      if (
        activeTeamIdRef.current !== capturedTeamId ||
        overviewGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setSavingEdit(false);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setEditError(result.error.message);
        return;
      }

      setState({
        status: 'success',
        data: result.data,
      });
      setIsEditing(false);
      onDataMutated?.('project');
      void fetchActivity(result.data.id, { silent: true });
    } catch (err) {
      if (
        activeTeamIdRef.current !== capturedTeamId ||
        overviewGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setSavingEdit(false);
      setEditError(
        err instanceof Error
          ? err.message
          : 'Could not save the project brief right now.',
      );
    }
  };

  return (
    <div data-testid="project-overview-panel" className="flex flex-col gap-4">
      <PanelContextHeader
        classCode={workspace.classCode}
        teamName={workspace.teamName}
        variant="badges"
        isDemoSession={isDemoSession}
        refreshDisabled={isLoading}
        onRefresh={() => void fetchOverview({ silent: false })}
      />

      {isLoading ? (
        <PanelLoadingSkeleton
          statusText="Loading project overview..."
          blocks={OVERVIEW_SKELETON_BLOCKS}
        />
      ) : state.status === 'error' ? (
        <PanelErrorCard
          heading="Could not load project overview"
          message={state.error.message}
          onRetry={() => void fetchOverview({ silent: false })}
        />
      ) : state.status === 'empty' ? (
        <PanelEmptyCard
          heading="No project brief available"
          message={state.reason}
          actionLabel="Refresh overview"
          onAction={() => void fetchOverview({ silent: false })}
        />
      ) : overview ? (
        <>
          {isEditing ? (
            <form
              onSubmit={(event) => void handleSaveBrief(event)}
              className="surface-card flex flex-col gap-3 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-[15px] font-semibold text-[var(--color-text-charcoal)]">
                  Edit Project Brief
                </h3>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="overview-title-input"
                  className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                >
                  Project title
                </label>
                <input
                  id="overview-title-input"
                  data-testid="overview-title-input"
                  type="text"
                  className="control-input"
                  value={draftTitle}
                  disabled={savingEdit}
                  onChange={(event) => {
                    setDraftTitle(event.target.value);
                    if (editError) setEditError(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="overview-description-input"
                  className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                >
                  Project brief
                </label>
                <textarea
                  id="overview-description-input"
                  data-testid="overview-description-input"
                  rows={4}
                  className="control-input"
                  value={draftDescription}
                  disabled={savingEdit}
                  onChange={(event) => setDraftDescription(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Objectives
                </span>
                {draftObjectives.length === 0 ? (
                  <p className="m-0 text-[12px] text-[var(--color-text-secondary)]">
                    No objectives added yet. Use Add Objective below.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {draftObjectives.map((objective, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <label
                          htmlFor={`overview-objective-input-${index}`}
                          className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                        >
                          Objective {index + 1}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`overview-objective-input-${index}`}
                            data-testid={`overview-objective-input-${index}`}
                            type="text"
                            className="control-input flex-1"
                            value={objective}
                            disabled={savingEdit}
                            onChange={(event) =>
                              handleObjectiveChange(index, event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="btn-ghost shrink-0 px-2.5 text-[12px] text-[var(--color-status-error-text)]"
                            aria-label={`Remove objective ${index + 1}`}
                            disabled={savingEdit}
                            onClick={() => handleRemoveObjective(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  data-testid="overview-add-objective-btn"
                  className="btn-secondary w-fit"
                  disabled={savingEdit}
                  onClick={handleAddObjective}
                >
                  + Add Objective
                </button>
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
                  data-testid="overview-save-btn"
                  className="btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving brief...' : 'Save Brief'}
                </button>
                <button
                  type="button"
                  data-testid="overview-cancel-btn"
                  className="btn-ghost"
                  disabled={savingEdit}
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3
                    data-testid="project-title"
                    className="m-0 text-[16px] font-semibold leading-6 text-[var(--color-text-charcoal)]"
                  >
                    {overview.title}
                  </h3>
                  {workspace.className && (
                    <p className="m-0 text-[12px] font-medium text-[var(--color-text-secondary)]">
                      {workspace.className}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="overview-edit-btn"
                  className="btn-secondary shrink-0"
                  onClick={startEditing}
                >
                  Edit Brief
                </button>
              </div>

              <section
                aria-labelledby="project-brief-heading"
                className="surface-card flex flex-col gap-2 p-4"
              >
                <h4
                  id="project-brief-heading"
                  className="m-0 text-[14px] font-semibold text-[var(--color-text-charcoal)]"
                >
                  Project Brief
                </h4>
                <p className="m-0 whitespace-pre-line text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                  {overview.description.trim()
                    ? overview.description
                    : 'No project description provided yet.'}
                </p>
              </section>

              <section
                aria-labelledby="project-objectives-heading"
                className="surface-card flex flex-col gap-2.5 p-4"
              >
                <h4
                  id="project-objectives-heading"
                  className="m-0 text-[14px] font-semibold text-[var(--color-text-charcoal)]"
                >
                  Objectives
                </h4>
                <ul
                  data-testid="project-objectives-list"
                  className="m-0 flex list-none flex-col gap-2 p-0"
                >
                  {overview.objectives.length > 0 ? (
                    overview.objectives.map((objective, index) => (
                      <li
                        key={`${index}-${objective}`}
                        className="flex items-start gap-2.5 text-[14px] leading-5 text-[var(--color-text-primary)]"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-1 text-[11px] font-semibold text-[var(--color-text-secondary)]"
                        >
                          {index + 1}
                        </span>
                        <span>{objective}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[13px] text-[var(--color-text-secondary)]">
                      No objectives listed for this project yet.
                    </li>
                  )}
                </ul>
              </section>
            </>
          )}

          <section
            aria-labelledby="team-roster-heading"
            className="surface-card flex flex-col gap-2.5 p-4"
          >
            <h4
              id="team-roster-heading"
              className="m-0 text-[14px] font-semibold text-[var(--color-text-charcoal)]"
            >
              Team Roster
            </h4>
            <ul
              data-testid="team-roster-list"
              className="m-0 flex list-none flex-col gap-2 p-0"
            >
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => {
                  const isInStudio = onlineUserSet.has(member.userId);
                  return (
                    <li
                      key={member.userId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[12px] font-semibold text-[var(--color-text-primary)]"
                        >
                          {getTwoLetterInitials(member.displayName)}
                        </span>
                        <span className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                          {member.displayName}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {isInStudio && (
                          <span className="status-badge shrink-0 border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]">
                            In studio
                          </span>
                        )}
                        <span
                          className={
                            member.role === 'team_lead'
                              ? 'status-badge shrink-0 border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]'
                              : 'status-badge shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)]'
                          }
                        >
                          {member.role === 'team_lead' ? 'Team Leader' : 'Member'}
                        </span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-[13px] text-[var(--color-text-secondary)]">
                  No team members listed for this studio yet.
                </li>
              )}
            </ul>
          </section>

          <section
            aria-labelledby="project-activity-heading"
            className="surface-card flex flex-col gap-2.5 p-4"
          >
            <h4
              id="project-activity-heading"
              className="m-0 text-[14px] font-semibold text-[var(--color-text-charcoal)]"
            >
              Recent Activity
            </h4>
            <div data-testid="project-activity-list">
              {activityState.status === 'loading' ||
              activityState.status === 'idle' ? (
                <div aria-busy="true" className="flex flex-col gap-2">
                  <p
                    role="status"
                    className="m-0 text-[12px] font-medium text-[var(--color-text-secondary)]"
                  >
                    Loading recent activity...
                  </p>
                  <div className="h-12 w-full rounded-[8px] bg-[#EEF1E8]" />
                  <div className="h-12 w-full rounded-[8px] bg-[#EEF1E8]" />
                </div>
              ) : activityState.status === 'error' ? (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-3"
                >
                  <p className="m-0 text-[12px] font-medium text-[var(--color-status-error-text)]">
                    Could not load recent activity: {activityState.error.message}
                  </p>
                  <button
                    type="button"
                    className="btn-secondary w-fit"
                    onClick={() =>
                      void fetchActivity(overview.id, { silent: false })
                    }
                  >
                    Retry activity
                  </button>
                </div>
              ) : activityState.status === 'empty' ? (
                <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
                  No team activity recorded yet.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {activityState.data.map((item) => {
                    const meta =
                      ACTIVITY_BADGE_META[item.entityType] ??
                      ACTIVITY_BADGE_META.project;
                    const whenText = formatDisplayDate(
                      item.createdAt,
                      'datetime',
                    );
                    return (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[12px] font-medium text-[var(--color-text-charcoal)]">
                            {item.actorName}
                          </span>
                          <span className={meta.badgeClass}>{meta.label}</span>
                        </div>
                        <p className="m-0 text-[13px] text-[var(--color-text-primary)]">
                          {item.summary}
                        </p>
                        {whenText && (
                          <span className="text-[11px] text-[var(--color-text-secondary)]">
                            {whenText}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {lastUpdatedText && (
            <p className="m-0 text-[12px] text-[var(--color-text-secondary)]">
              Last updated: {lastUpdatedText}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
