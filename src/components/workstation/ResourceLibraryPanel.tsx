import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResourceLibraryPanelProps } from '../../types/components';
import type {
  AsyncState,
  ResourceCategory,
  ResourceItem,
} from '../../types/contracts';
import {
  FilterTabBar,
  PanelEmptyCard,
  PanelErrorCard,
  PanelLoadingSkeleton,
} from './PanelStateCards';

type ResourceFilterKey = 'all' | ResourceCategory;

const RESOURCE_FILTER_TABS: ReadonlyArray<{
  key: ResourceFilterKey;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'docs', label: 'Docs' },
  { key: 'design', label: 'Design' },
  { key: 'tools', label: 'Tools' },
  { key: 'general', label: 'General' },
];

const RESOURCE_SKELETON_BLOCKS = [
  'h-11 w-full rounded-[8px]',
  'h-24 w-full rounded-[10px]',
  'h-24 w-full rounded-[10px]',
] as const;

const CATEGORY_BADGE_META: Record<
  ResourceCategory,
  { label: string; badgeClass: string }
> = {
  docs: {
    label: 'Docs',
    badgeClass:
      'status-badge border border-[#A5C6D4] bg-[var(--color-accent-blue)] text-[var(--color-text-primary)]',
  },
  design: {
    label: 'Design',
    badgeClass:
      'status-badge border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]',
  },
  tools: {
    label: 'Tools',
    badgeClass:
      'status-badge border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]',
  },
  general: {
    label: 'General',
    badgeClass:
      'status-badge border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
  },
};

export interface ParsedSafeHttpUrl {
  safeHref: string;
  hostLabel: string;
}

export function parseSafeHttpUrl(rawUrl: string): ParsedSafeHttpUrl | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (!parsed.hostname) {
      return null;
    }
    return {
      safeHref: parsed.toString(),
      hostLabel: parsed.hostname,
    };
  } catch {
    return null;
  }
}

export function ResourceLibraryPanel({
  projectId,
  workspace,
  repository,
}: ResourceLibraryPanelProps) {
  const [state, setState] = useState<AsyncState<ResourceItem[]>>(() =>
    projectId === null
      ? {
          status: 'empty',
          reason: 'No project is linked to this workspace yet.',
        }
      : {
          status: 'loading',
          label: 'Loading resource library...',
        },
  );
  const [activeCategory, setActiveCategory] =
    useState<ResourceFilterKey>('all');
  const requestSeqRef = useRef(0);

  const fetchResources = useCallback(async () => {
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
      label: 'Loading resource library...',
    });

    const result = await repository.getProjectResources(projectId);
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
        reason: 'No resources attached to this workspace yet.',
        actionLabel: 'Refresh resources',
      });
      return;
    }

    setState({
      status: 'success',
      data: result.data,
    });
  }, [projectId, repository]);

  useEffect(() => {
    setActiveCategory('all');
    void fetchResources();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchResources]);

  const resources = state.status === 'success' ? state.data : [];

  const counts = useMemo(() => {
    const summary: Record<ResourceFilterKey, number> = {
      all: resources.length,
      docs: 0,
      design: 0,
      tools: 0,
      general: 0,
    };
    for (const item of resources) {
      summary[item.category] += 1;
    }
    return summary;
  }, [resources]);

  const filteredResources = useMemo(() => {
    if (activeCategory === 'all') return resources;
    return resources.filter((item) => item.category === activeCategory);
  }, [activeCategory, resources]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <PanelLoadingSkeleton
        testId="resource-library-panel"
        statusText="Loading resource library..."
        blocks={RESOURCE_SKELETON_BLOCKS}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <PanelErrorCard
        testId="resource-library-panel"
        heading="Could not load resources"
        message={state.error.message}
        onRetry={() => void fetchResources()}
      />
    );
  }

  if (state.status === 'empty') {
    return (
      <PanelEmptyCard
        testId="resource-library-panel"
        heading={projectId === null ? 'No linked project' : 'No resources yet'}
        message={state.reason}
        actionLabel={projectId !== null ? 'Refresh resources' : undefined}
        onAction={projectId !== null ? () => void fetchResources() : undefined}
      />
    );
  }

  return (
    <div data-testid="resource-library-panel" className="flex flex-col gap-4">
      <p className="m-0 text-[12px] font-medium text-[var(--color-text-secondary)]">
        {workspace.classCode} / {workspace.teamName}
      </p>

      <FilterTabBar
        ariaLabel="Filter resources by category"
        tabs={RESOURCE_FILTER_TABS}
        activeKey={activeCategory}
        counts={counts}
        testIdPrefix="resource-filter"
        onSelect={setActiveCategory}
      />

      {filteredResources.length === 0 ? (
        <div className="surface-card flex flex-col gap-3 bg-[var(--color-surface-secondary)] p-4">
          <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
            No resources in the{' '}
            {RESOURCE_FILTER_TABS.find((c) => c.key === activeCategory)?.label ??
              activeCategory}{' '}
            category.
          </p>
          <button
            type="button"
            className="btn-secondary w-fit"
            onClick={() => setActiveCategory('all')}
          >
            Show all resources
          </button>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {filteredResources.map((item) => {
            const categoryMeta = CATEGORY_BADGE_META[item.category];
            const parsedUrl = parseSafeHttpUrl(item.url);

            return (
              <li
                key={item.id}
                data-testid={`resource-item-${item.id}`}
                className="surface-card flex flex-col gap-2.5 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 text-[15px] font-medium leading-5 text-[var(--color-text-charcoal)]">
                    {item.title}
                  </h3>
                  <span className={`${categoryMeta.badgeClass} shrink-0`}>
                    {categoryMeta.label}
                  </span>
                </div>

                {item.description && item.description.trim() !== '' && (
                  <p className="m-0 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
                    {item.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {parsedUrl ? (
                    <>
                      <span className="status-badge border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                        {parsedUrl.hostLabel}
                      </span>
                      <a
                        href={parsedUrl.safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        data-testid={`resource-open-link-${item.id}`}
                      >
                        Open Link
                      </a>
                    </>
                  ) : (
                    <span className="status-badge status-badge--error">
                      Invalid or unsupported URL
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
