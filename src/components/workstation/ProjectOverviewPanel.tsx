import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectOverviewPanelProps } from '../../types/components';
import type { AsyncState, ProjectOverview } from '../../types/contracts';
import {
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

export function ProjectOverviewPanel({
  teamId,
  workspace,
  repository,
}: ProjectOverviewPanelProps) {
  const [state, setState] = useState<AsyncState<ProjectOverview>>({
    status: 'loading',
    label: 'Loading project overview...',
  });
  const requestSeqRef = useRef(0);

  const fetchOverview = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setState({
      status: 'loading',
      label: 'Loading project overview...',
    });

    const result = await repository.getProjectOverview(teamId);
    if (seq !== requestSeqRef.current) return;

    if (!result.ok) {
      if (result.error.code === 'not_found') {
        setState({
          status: 'empty',
          reason: 'No project brief is linked to this team studio yet.',
          actionLabel: 'Refresh',
        });
        return;
      }

      setState({
        status: 'error',
        error: result.error,
      });
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
        actionLabel: 'Refresh',
      });
      return;
    }

    setState({
      status: 'success',
      data: overview,
    });
  }, [repository, teamId]);

  useEffect(() => {
    void fetchOverview();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchOverview]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <PanelLoadingSkeleton
        testId="project-overview-panel"
        statusText="Loading project overview..."
        blocks={OVERVIEW_SKELETON_BLOCKS}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <PanelErrorCard
        testId="project-overview-panel"
        heading="Could not load project overview"
        message={state.error.message}
        onRetry={() => void fetchOverview()}
      />
    );
  }

  if (state.status === 'empty') {
    return (
      <PanelEmptyCard
        testId="project-overview-panel"
        heading="No project brief available"
        message={state.reason}
        actionLabel="Refresh"
        onAction={() => void fetchOverview()}
      />
    );
  }

  const overview = state.data;
  const teamMembers = overview.teamMembers ?? [];
  const lastUpdatedText = formatDisplayDate(overview.updatedAt, 'datetime');

  return (
    <div data-testid="project-overview-panel" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-badge border border-[#A5C6D4] bg-[var(--color-accent-blue)] text-[var(--color-text-primary)]">
          {workspace.classCode}
        </span>
        <span className="status-badge border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]">
          {workspace.teamName}
        </span>
      </div>

      <div className="flex flex-col gap-1">
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
            teamMembers.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
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
                <span
                  className={
                    member.role === 'team_lead'
                      ? 'status-badge shrink-0 border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]'
                      : 'status-badge shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)]'
                  }
                >
                  {member.role === 'team_lead' ? 'Team Leader' : 'Member'}
                </span>
              </li>
            ))
          ) : (
            <li className="text-[13px] text-[var(--color-text-secondary)]">
              No team members listed for this studio yet.
            </li>
          )}
        </ul>
      </section>

      {lastUpdatedText && (
        <p className="m-0 text-[12px] text-[var(--color-text-secondary)]">
          Last updated: {lastUpdatedText}
        </p>
      )}
    </div>
  );
}
