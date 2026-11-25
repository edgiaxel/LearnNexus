import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AcademicSpace,
  AppError,
  AsyncState,
} from '../../types/contracts';
import type { AcademicSpacesSelectorProps } from '../../types/components';

interface SpaceEnterError {
  spaceId: string;
  spaceCode: string;
  error: AppError;
}

export function AcademicSpacesSelector({
  profile,
  repository,
  onSelectSpace,
  onSwitchProfile,
}: AcademicSpacesSelectorProps) {
  const [spacesState, setSpacesState] = useState<AsyncState<AcademicSpace[]>>({
    status: 'loading',
    label: 'Loading assigned academic spaces...',
  });
  const [enteringSpaceId, setEnteringSpaceId] = useState<string | null>(null);
  const [enterError, setEnterError] = useState<SpaceEnterError | null>(null);

  const loadSeqRef = useRef(0);
  const enterSeqRef = useRef(0);

  const loadSpaces = useCallback(async () => {
    const requestId = ++loadSeqRef.current;
    // Cancel any pending studio-entry callback if spaces are reloaded.
    enterSeqRef.current += 1;
    setEnteringSpaceId(null);
    setEnterError(null);
    setSpacesState({
      status: 'loading',
      label: 'Loading assigned academic spaces...',
    });

    try {
      const result = await repository.getMyAcademicSpaces();
      if (requestId !== loadSeqRef.current) return;

      if (!result.ok) {
        setSpacesState({ status: 'error', error: result.error });
        return;
      }

      if (result.data.length === 0) {
        setSpacesState({
          status: 'empty',
          reason:
            'No academic spaces are assigned to this account yet. Contact your course supervisor or switch to a seeded demo team profile.',
        });
        return;
      }

      setSpacesState({ status: 'success', data: result.data });
    } catch (err) {
      if (requestId !== loadSeqRef.current) return;
      setSpacesState({
        status: 'error',
        error: {
          code: 'unknown',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to load assigned academic spaces.',
          retryable: true,
        },
      });
    }
  }, [repository]);

  useEffect(() => {
    void loadSpaces();
    return () => {
      loadSeqRef.current += 1;
      enterSeqRef.current += 1;
    };
  }, [loadSpaces, profile.id]);

  const handleEnterStudio = async (space: AcademicSpace) => {
    if (enteringSpaceId !== null) return;
    const enterRequestId = ++enterSeqRef.current;
    setEnteringSpaceId(space.id);
    setEnterError(null);

    try {
      const result = await repository.getTeamWorkspace(space.id);
      if (enterRequestId !== enterSeqRef.current) return;

      if (!result.ok) {
        setEnterError({
          spaceId: space.id,
          spaceCode: space.code,
          error: result.error,
        });
        setEnteringSpaceId(null);
        return;
      }

      setEnteringSpaceId(null);
      onSelectSpace(space, result.data);
    } catch (err) {
      if (enterRequestId !== enterSeqRef.current) return;
      setEnterError({
        spaceId: space.id,
        spaceCode: space.code,
        error: {
          code: 'unknown',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to open this team studio.',
          retryable: true,
        },
      });
      setEnteringSpaceId(null);
    }
  };

  const isEmptyState = spacesState.status === 'empty';

  return (
    <section
      data-testid="academic-spaces-directory"
      aria-label="Academic spaces directory"
      className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 py-2 sm:py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 text-[24px] font-semibold leading-[32px] text-[var(--color-text-charcoal)] sm:text-[28px] sm:leading-[36px]">
            Academic Spaces
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">
              {profile.displayName}
            </span>
            {profile.isDemo && (
              <span className="status-badge border border-[#D4C07C] bg-[var(--color-accent-yellow)] text-[var(--color-text-primary)]">
                Demo Mode
              </span>
            )}
          </div>
        </div>

        {!isEmptyState && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                spacesState.status === 'loading' || enteringSpaceId !== null
              }
              onClick={() => void loadSpaces()}
            >
              Refresh Spaces
            </button>
            <button
              type="button"
              className="btn-ghost"
              data-testid="switch-profile-btn"
              disabled={enteringSpaceId !== null}
              onClick={onSwitchProfile}
            >
              Switch Profile
            </button>
          </div>
        )}
      </div>

      {spacesState.status === 'loading' && (
        <div aria-busy="true" className="flex flex-col gap-4">
          <p
            role="status"
            className="m-0 text-[13px] font-medium text-[var(--color-text-secondary)]"
          >
            Loading assigned academic spaces...
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((placeholderKey) => (
              <div
                key={placeholderKey}
                aria-hidden="true"
                className="surface-card flex flex-col gap-4 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-6 w-20 rounded-full bg-[#EEF1E8]" />
                  <div className="h-4 w-28 rounded bg-[#EEF1E8]" />
                </div>
                <div className="h-6 w-3/4 rounded bg-[#EEF1E8]" />
                <div className="h-5 w-36 rounded-full bg-[#EEF1E8]" />
                <div className="h-11 w-32 rounded-[8px] bg-[#EEF1E8]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {spacesState.status === 'error' && (
        <div
          role="alert"
          data-testid="spaces-error-banner"
          className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-5 text-[var(--color-status-error-text)]"
        >
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-[16px] font-semibold leading-6">
              Unable to load academic spaces
            </h2>
            <p className="m-0 mt-1 break-words text-[13px] leading-5">
              {spacesState.error.message}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0"
            data-testid="spaces-retry-btn"
            onClick={() => void loadSpaces()}
          >
            Retry
          </button>
        </div>
      )}

      {spacesState.status === 'empty' && (
        <div
          data-testid="spaces-empty-state"
          className="surface-card mx-auto flex w-full max-w-[640px] flex-col gap-4 p-6 sm:p-7"
        >
          <div className="flex flex-col gap-2">
            <h2 className="m-0 text-[18px] font-semibold leading-6 text-[var(--color-text-charcoal)]">
              No assigned academic spaces
            </h2>
            <p className="m-0 text-[14px] leading-6 text-[var(--color-text-secondary)]">
              {spacesState.reason}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadSpaces()}
            >
              Refresh Spaces
            </button>
            <button
              type="button"
              className="btn-primary"
              data-testid="switch-profile-btn"
              onClick={onSwitchProfile}
            >
              Switch Profile
            </button>
          </div>
        </div>
      )}

      {spacesState.status === 'success' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {spacesState.data.map((space) => {
            const isEnteringThis = enteringSpaceId === space.id;
            const cardError =
              enterError?.spaceId === space.id ? enterError.error : null;

            return (
              <article
                key={space.id}
                data-testid={`space-card-${space.code}`}
                className="surface-card flex min-w-0 flex-col justify-between gap-4 p-5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="status-badge border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]">
                      {space.code}
                    </span>
                    <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                      {space.semester}
                    </span>
                  </div>

                  <h2 className="m-0 break-words text-[18px] font-semibold leading-6 text-[var(--color-text-charcoal)]">
                    {space.name}
                  </h2>

                  <span className="status-badge w-fit border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]">
                    {space.teamName}
                  </span>
                </div>

                {cardError && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-3 text-[var(--color-status-error-text)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 break-words text-[13px] font-semibold leading-5">
                        {cardError.message}
                      </p>
                      <p className="m-0 mt-0.5 text-[12px] leading-4">
                        Unable to enter this studio. Try again or refresh your
                        spaces.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary shrink-0"
                      disabled={enteringSpaceId !== null}
                      onClick={() => void handleEnterStudio(space)}
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    className="btn-primary w-full sm:w-auto"
                    data-testid="enter-studio-btn"
                    disabled={enteringSpaceId !== null}
                    onClick={() => void handleEnterStudio(space)}
                  >
                    {isEnteringThis ? 'Opening studio...' : 'Enter Studio'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
