import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  DEMO_PROFILE_DESCRIPTORS,
  type AppError,
  type DemoProfileKey,
} from '../../types/contracts';
import type { EntryGatewayProps } from '../../types/components';

type SubmissionSource = 'demo' | 'credentials';

interface EntryErrorState {
  source: SubmissionSource;
  error: AppError;
}

function getErrorGuidance(error: AppError): string {
  switch (error.code) {
    case 'validation':
      return 'Check the email and password fields and try again.';
    case 'auth':
      return 'Verify your email and password, or choose one of the seeded demo profiles.';
    case 'forbidden':
      return 'This account does not have permission to enter this space.';
    case 'network':
      return 'Check your internet connection and retry in a moment.';
    default:
      return 'Try signing in again, or select a seeded demo profile to continue.';
  }
}

export function EntryGateway({
  authRepository,
  supabaseReady,
  supabaseError,
  sessionNotice,
  onRetryHealth,
  onAuthenticated,
}: EntryGatewayProps) {
  const [selectedDemoKey, setSelectedDemoKey] =
    useState<DemoProfileKey>('team_lead');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingSource, setSubmittingSource] =
    useState<SubmissionSource | null>(null);
  const [entryError, setEntryError] = useState<EntryErrorState | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isSubmitting = submittingSource !== null;
  const emailHasValidationError =
    entryError?.source === 'credentials' &&
    entryError.error.code === 'validation' &&
    (!email.trim() || !email.trim().includes('@'));
  const passwordHasValidationError =
    entryError?.source === 'credentials' &&
    entryError.error.code === 'validation' &&
    password.length === 0;

  const handleDemoSelect = (key: DemoProfileKey) => {
    setSelectedDemoKey(key);
    if (entryError?.source === 'demo') {
      setEntryError(null);
    }
  };

  const handleDemoSignIn = async () => {
    if (isSubmitting) return;
    setSubmittingSource('demo');
    setEntryError(null);

    try {
      const result = await authRepository.signInAsDemoProfile(selectedDemoKey);
      if (!isMountedRef.current) return;

      if (!result.ok) {
        setEntryError({ source: 'demo', error: result.error });
        setSubmittingSource(null);
        return;
      }

      setSubmittingSource(null);
      onAuthenticated(result.data);
    } catch (err) {
      if (!isMountedRef.current) return;
      setEntryError({
        source: 'demo',
        error: {
          code: 'unknown',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to sign in with the selected demo profile.',
          retryable: true,
        },
      });
      setSubmittingSource(null);
    }
  };

  const handleCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEntryError({
        source: 'credentials',
        error: {
          code: 'validation',
          message: 'Student email is required.',
          retryable: true,
        },
      });
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setEntryError({
        source: 'credentials',
        error: {
          code: 'validation',
          message: 'Enter a valid student email address.',
          retryable: true,
        },
      });
      return;
    }

    if (password.length === 0) {
      setEntryError({
        source: 'credentials',
        error: {
          code: 'validation',
          message: 'Password is required.',
          retryable: true,
        },
      });
      return;
    }

    setSubmittingSource('credentials');
    setEntryError(null);

    try {
      const result = await authRepository.signInWithPassword(
        trimmedEmail,
        password,
      );
      if (!isMountedRef.current) return;

      if (!result.ok) {
        setEntryError({ source: 'credentials', error: result.error });
        setSubmittingSource(null);
        return;
      }

      setSubmittingSource(null);
      onAuthenticated(result.data);
    } catch (err) {
      if (!isMountedRef.current) return;
      setEntryError({
        source: 'credentials',
        error: {
          code: 'unknown',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to sign in with the provided credentials.',
          retryable: true,
        },
      });
      setSubmittingSource(null);
    }
  };

  const renderErrorBanner = (source: SubmissionSource) => {
    if (!entryError || entryError.source !== source) return null;

    return (
      <div
        role="alert"
        data-testid="entry-error-banner"
        className="rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-3.5 text-[var(--color-status-error-text)]"
      >
        <p className="m-0 text-[13px] font-semibold leading-5">
          {entryError.error.message}
        </p>
        <p className="m-0 mt-1 text-[12px] leading-4">
          {getErrorGuidance(entryError.error)}
        </p>
      </div>
    );
  };

  return (
    <section
      data-testid="entry-gateway"
      aria-label="LearnNexus Campus Entry"
      className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 py-2 sm:py-4"
    >
      {!supabaseReady && supabaseError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-4 text-[var(--color-status-error-text)]"
        >
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-semibold leading-5">
              Database connection unavailable
            </p>
            <p className="m-0 mt-1 break-words text-[13px] leading-5">
              {supabaseError}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={onRetryHealth}
          >
            Retry connection
          </button>
        </div>
      )}

      {sessionNotice && sessionNotice.trim() !== '' && (
        <div
          role="status"
          data-testid="entry-session-notice"
          className="rounded-[10px] border border-[#D4C07C] bg-[var(--color-status-todo-bg)] p-4 text-[13px] font-medium leading-5 text-[var(--color-status-todo-text)]"
        >
          {sessionNotice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
        <div className="flex min-w-0 flex-col gap-5 md:col-span-7">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[24px] font-semibold leading-[32px] text-[var(--color-text-charcoal)] sm:text-[28px] sm:leading-[36px]">
              Welcome to LearnNexus
            </h1>
            <p className="m-0 max-w-[60ch] text-[14px] leading-6 text-[var(--color-text-secondary)]">
              Connect your enrolled academic courses to persistent 2D team
              studios where project notes, sprint tasks, and shared resources
              stay saved between sessions.
            </p>
          </div>

          <div className="surface-card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 text-[18px] font-semibold leading-6 text-[var(--color-text-charcoal)]">
                Demo Mode (Live Supabase Postgres)
              </h2>
              <p className="m-0 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                These seeded fictional student profiles sign into real Supabase
                Auth accounts and read or update live Postgres rows under
                row-level security.
              </p>
            </div>

            <div
              role="group"
              aria-label="Seeded student demo profiles"
              className="flex flex-col gap-2.5"
            >
              {DEMO_PROFILE_DESCRIPTORS.map((profile) => {
                const isSelected = selectedDemoKey === profile.key;
                return (
                  <button
                    key={profile.key}
                    type="button"
                    data-testid={`demo-profile-${profile.key}`}
                    aria-pressed={isSelected}
                    disabled={isSubmitting}
                    onClick={() => handleDemoSelect(profile.key)}
                    className={`flex min-h-[44px] w-full flex-col gap-1.5 rounded-[10px] border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[var(--color-border-focus)] bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border-focus)]'
                        : 'border-[var(--color-border-control)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)]'
                    } disabled:opacity-60`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold text-[var(--color-text-charcoal)]">
                        {profile.displayName}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-badge border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]">
                          {profile.roleLabel}
                        </span>
                        {isSelected && (
                          <span className="status-badge status-badge--done">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
                      {profile.assignmentSummary}
                    </span>
                  </button>
                );
              })}
            </div>

            {renderErrorBanner('demo')}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                data-testid="demo-enter-btn"
                disabled={isSubmitting}
                onClick={() => void handleDemoSignIn()}
              >
                {submittingSource === 'demo'
                  ? 'Signing in...'
                  : 'Enter Campus as Demo'}
              </button>
              <span className="text-[12px] leading-4 text-[var(--color-text-secondary)]">
                Each demo profile isolates course visibility by RLS.
              </span>
            </div>
          </div>
        </div>

        <div className="surface-card flex min-w-0 flex-col gap-4 p-5 sm:p-6 md:col-span-5">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[18px] font-semibold leading-6 text-[var(--color-text-charcoal)]">
              Student Sign In
            </h2>
            <p className="m-0 text-[13px] leading-5 text-[var(--color-text-secondary)]">
              Sign in with your Supabase student credentials, or choose a demo
              profile on the campus panel.
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleCredentialsSubmit(event)}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="entry-email"
                className="text-[13px] font-medium text-[var(--color-text-primary)]"
              >
                Student email
              </label>
              <input
                id="entry-email"
                name="email"
                type="email"
                autoComplete="email"
                className="control-input"
                data-testid="email-input"
                placeholder="student@learnnexus.edu"
                value={email}
                aria-invalid={emailHasValidationError}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (entryError?.source === 'credentials') {
                    setEntryError(null);
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="entry-password"
                className="text-[13px] font-medium text-[var(--color-text-primary)]"
              >
                Password
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="entry-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="control-input min-w-0 flex-1"
                  data-testid="password-input"
                  placeholder="Enter your password"
                  value={password}
                  aria-invalid={passwordHasValidationError}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (entryError?.source === 'credentials') {
                      setEntryError(null);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost min-w-[68px] shrink-0"
                  data-testid="toggle-password-btn"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {renderErrorBanner('credentials')}

            <button
              type="submit"
              className="btn-secondary w-full"
              data-testid="credentials-submit-btn"
              disabled={isSubmitting}
            >
              {submittingSource === 'credentials'
                ? 'Signing in...'
                : 'Sign In with Credentials'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
