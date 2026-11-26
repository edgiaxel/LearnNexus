import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { ResourceLibraryPanelProps } from '../../types/components';
import type {
  AsyncState,
  ResourceCategory,
  ResourceItem,
} from '../../types/contracts';
import {
  FilterTabBar,
  PanelContextHeader,
  PanelEmptyCard,
  PanelErrorCard,
  PanelLoadingSkeleton,
} from './PanelStateCards';
import { parseSafeHttpUrl, type ParsedSafeHttpUrl } from './workstationUtils';

export { parseSafeHttpUrl, type ParsedSafeHttpUrl };

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

export function ResourceLibraryPanel({
  projectId,
  workspace,
  repository,
  syncRevision = 0,
  isDemoSession,
  onDataMutated,
  onSessionExpired,
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

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<ResourceCategory>('docs');
  const [newDescription, setNewDescription] = useState('');
  const [creatingResource, setCreatingResource] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<{
    resourceId: string;
    message: string;
  } | null>(null);

  const requestSeqRef = useRef(0);
  const resourcesGenerationRef = useRef(0);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const lastSyncRevisionRef = useRef(syncRevision);

  const fetchResources = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        resourcesGenerationRef.current += 1;
        setConfirmDeleteId(null);
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
          label: 'Loading resource library...',
        });
      }

      try {
        const result = await repository.getProjectResources(projectId);
        if (seq !== requestSeqRef.current) return;

        if (!result.ok) {
          if (result.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          if (!silent) {
            setState({
              status: 'error',
              error: result.error,
            });
          }
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
                  : 'Unable to load project resources right now.',
              retryable: true,
            },
          });
        }
      }
    },
    [projectId, repository],
  );

  useEffect(() => {
    setActiveCategory('all');
    setCreateOpen(false);
    setNewTitle('');
    setNewUrl('');
    setNewCategory('docs');
    setNewDescription('');
    setCreateError(null);
    void fetchResources({ silent: false });
    return () => {
      requestSeqRef.current += 1;
      resourcesGenerationRef.current += 1;
    };
  }, [fetchResources]);

  useEffect(() => {
    if (syncRevision > 0 && syncRevision !== lastSyncRevisionRef.current) {
      lastSyncRevisionRef.current = syncRevision;
      void fetchResources({ silent: true });
    } else {
      lastSyncRevisionRef.current = syncRevision;
    }
  }, [syncRevision, fetchResources]);

  const handleCreateResource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectId === null || creatingResource) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setCreateError('Resource title is required.');
      return;
    }

    const parsedUrl = parseSafeHttpUrl(newUrl);
    if (!parsedUrl) {
      setCreateError(
        'Enter a valid http:// or https:// URL. Unsafe schemes such as javascript: or data: are blocked.',
      );
      return;
    }

    const capturedProjectId = projectId;
    const capturedGeneration = resourcesGenerationRef.current;
    const trimmedDesc = newDescription.trim();

    setCreateError(null);
    setCreatingResource(true);

    try {
      const result = await repository.createResource({
        projectId,
        title: trimmedTitle,
        description: trimmedDesc ? trimmedDesc : null,
        url: parsedUrl.safeHref,
        category: newCategory,
      });

      if (
        activeProjectIdRef.current !== capturedProjectId ||
        resourcesGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setCreatingResource(false);

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

      if (
        activeCategory !== 'all' &&
        activeCategory !== result.data.category
      ) {
        setActiveCategory('all');
      }

      setNewTitle('');
      setNewUrl('');
      setNewCategory('docs');
      setNewDescription('');
      setCreateOpen(false);
      onDataMutated?.('resources');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        resourcesGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setCreatingResource(false);
      setCreateError(
        err instanceof Error
          ? err.message
          : 'Unable to add the resource right now.',
      );
    }
  };

  const handleConfirmDeleteResource = async (resourceId: string) => {
    if (deletingResourceId) return;

    const capturedProjectId = projectId;
    const capturedGeneration = resourcesGenerationRef.current;
    setDeleteError(null);
    setDeletingResourceId(resourceId);

    try {
      const result = await repository.deleteResource(resourceId);
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        resourcesGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setDeletingResourceId(null);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setDeleteError({
          resourceId,
          message: result.error.message,
        });
        return;
      }

      setConfirmDeleteId(null);
      setState((prev) => {
        if (prev.status !== 'success') return prev;
        const remaining = prev.data.filter((item) => item.id !== resourceId);
        if (remaining.length === 0) {
          return {
            status: 'empty',
            reason: 'No resources attached to this workspace yet.',
            actionLabel: 'Refresh resources',
          };
        }
        return {
          status: 'success',
          data: remaining,
        };
      });
      onDataMutated?.('resources');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        resourcesGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setDeletingResourceId(null);
      setDeleteError({
        resourceId,
        message:
          err instanceof Error
            ? err.message
            : 'Unable to remove resource right now.',
      });
    }
  };

  const isLoading = state.status === 'loading' || state.status === 'idle';
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

  const canCreate = projectId !== null && !isLoading && state.status !== 'error';

  return (
    <div data-testid="resource-library-panel" className="flex flex-col gap-4">
      <PanelContextHeader
        classCode={workspace.classCode}
        teamName={workspace.teamName}
        variant="text"
        isDemoSession={isDemoSession}
        refreshDisabled={isLoading}
        onRefresh={() => void fetchResources({ silent: false })}
      />

      {isLoading ? (
        <PanelLoadingSkeleton
          statusText="Loading resource library..."
          blocks={RESOURCE_SKELETON_BLOCKS}
        />
      ) : state.status === 'error' ? (
        <PanelErrorCard
          heading="Could not load resources"
          message={state.error.message}
          onRetry={() => void fetchResources({ silent: false })}
        />
      ) : (
        <>
          {canCreate && (
            <>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="resource-new-toggle-btn"
                  aria-expanded={createOpen}
                  aria-controls="resource-create-form"
                  className={createOpen ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => {
                    setCreateOpen((prev) => !prev);
                    setCreateError(null);
                  }}
                >
                  {createOpen ? 'Close Add Resource' : '+ Add Resource'}
                </button>
              </div>

              {createOpen && (
                <form
                  id="resource-create-form"
                  data-testid="resource-create-form"
                  noValidate
                  onSubmit={(event) => void handleCreateResource(event)}
                  className="surface-card flex flex-col gap-3 p-4"
                >
                  <h3 className="m-0 text-[15px] font-semibold text-[var(--color-text-charcoal)]">
                    Add Shared Resource
                  </h3>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="resource-title-input"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Resource title
                    </label>
                    <input
                      id="resource-title-input"
                      data-testid="resource-title-input"
                      type="text"
                      className="control-input"
                      placeholder="e.g. Architecture Decision Log"
                      value={newTitle}
                      disabled={creatingResource}
                      onChange={(event) => {
                        setNewTitle(event.target.value);
                        if (createError) setCreateError(null);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="resource-url-input"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Resource URL (https:// or http://)
                    </label>
                    <input
                      id="resource-url-input"
                      data-testid="resource-url-input"
                      type="url"
                      inputMode="url"
                      className="control-input"
                      placeholder="https://example.edu/reference"
                      value={newUrl}
                      disabled={creatingResource}
                      onChange={(event) => {
                        setNewUrl(event.target.value);
                        if (createError) setCreateError(null);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="resource-category-select"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Category
                    </label>
                    <select
                      id="resource-category-select"
                      data-testid="resource-category-select"
                      className="control-input"
                      value={newCategory}
                      disabled={creatingResource}
                      onChange={(event) =>
                        setNewCategory(event.target.value as ResourceCategory)
                      }
                    >
                      <option value="docs">Docs</option>
                      <option value="design">Design</option>
                      <option value="tools">Tools</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="resource-description-input"
                      className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                    >
                      Notes (optional)
                    </label>
                    <textarea
                      id="resource-description-input"
                      data-testid="resource-description-input"
                      rows={2}
                      className="control-input"
                      placeholder="Briefly explain how the team uses this link..."
                      value={newDescription}
                      disabled={creatingResource}
                      onChange={(event) =>
                        setNewDescription(event.target.value)
                      }
                    />
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
                      data-testid="resource-create-submit-btn"
                      className="btn-primary"
                      disabled={creatingResource}
                    >
                      {creatingResource ? 'Adding resource...' : 'Add Resource'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={creatingResource}
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
              heading={
                projectId === null ? 'No linked project' : 'No resources yet'
              }
              message={state.reason}
              actionLabel={
                projectId !== null ? 'Refresh resources' : undefined
              }
              onAction={
                projectId !== null
                  ? () => void fetchResources({ silent: false })
                  : undefined
              }
            />
          ) : (
            <>
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
                    {RESOURCE_FILTER_TABS.find((c) => c.key === activeCategory)
                      ?.label ?? activeCategory}{' '}
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
                    const isConfirmingDelete = confirmDeleteId === item.id;
                    const isDeletingThis = deletingResourceId === item.id;
                    const thisDeleteError =
                      deleteError?.resourceId === item.id
                        ? deleteError.message
                        : null;

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

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-2">
                          {!isConfirmingDelete ? (
                            <button
                              type="button"
                              data-testid={`resource-delete-btn-${item.id}`}
                              disabled={deletingResourceId !== null}
                              onClick={() => {
                                setDeleteError(null);
                                setConfirmDeleteId(item.id);
                              }}
                              className="btn-ghost px-3 text-[13px] text-[var(--color-status-error-text)]"
                            >
                              Delete
                            </button>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[12px] font-medium text-[var(--color-status-error-text)]">
                                Remove this resource?
                              </span>
                              <button
                                type="button"
                                data-testid={`resource-delete-confirm-btn-${item.id}`}
                                disabled={isDeletingThis}
                                onClick={() =>
                                  void handleConfirmDeleteResource(item.id)
                                }
                                className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[13px] font-medium text-[var(--color-status-error-text)] hover:bg-[#F5DFDD]"
                              >
                                {isDeletingThis
                                  ? 'Removing...'
                                  : 'Confirm delete'}
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                disabled={isDeletingThis}
                                onClick={() => setConfirmDeleteId(null)}
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
