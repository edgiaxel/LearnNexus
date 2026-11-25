import {
  isAuthApiError,
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
} from '@supabase/supabase-js';
import type { AppError, AppErrorCode } from '../types/contracts';

interface PostgrestErrorShape {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
}

const VALID_ERROR_CODES: ReadonlySet<AppErrorCode> = new Set([
  'auth',
  'forbidden',
  'not_found',
  'network',
  'validation',
  'unknown',
]);

const DEFAULT_ERROR_MESSAGE =
  'An unexpected error occurred while connecting to LearnNexus. Please try again.';

function sanitizeMessage(raw: string | undefined | null, fallback: string): string {
  const normalized = (raw ?? '').replace(/\u2014/g, '-').trim();
  return normalized.length > 0 ? normalized : fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppError(error: unknown): error is AppError {
  if (!isPlainObject(error)) return false;
  return (
    typeof error.code === 'string' &&
    VALID_ERROR_CODES.has(error.code as AppErrorCode) &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0 &&
    typeof error.retryable === 'boolean'
  );
}

function isPostgrestErrorShape(error: unknown): error is PostgrestErrorShape {
  if (!isPlainObject(error)) return false;
  if (typeof error.message !== 'string') return false;
  return (
    typeof error.code === 'string' ||
    'details' in error ||
    'hint' in error
  );
}

function isNetworkMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('err_network')
  );
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  retryable = false,
): AppError {
  return {
    code,
    message: sanitizeMessage(message, DEFAULT_ERROR_MESSAGE),
    retryable,
  };
}

function mapAuthError(error: unknown, fallback: string): AppError | null {
  if (!isAuthError(error)) return null;

  if (isAuthRetryableFetchError(error)) {
    return createAppError(
      'network',
      'Unable to reach the authentication service. Check your connection and try again.',
      true,
    );
  }

  if (isAuthSessionMissingError(error)) {
    return createAppError(
      'auth',
      'Your session is missing or expired. Please sign in again.',
      false,
    );
  }

  const status = error.status;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = sanitizeMessage(error.message, fallback);

  if (status === 0 || (typeof status === 'number' && status >= 500)) {
    return createAppError(
      'network',
      'Authentication service is temporarily unavailable. Please try again.',
      true,
    );
  }

  if (status === 429 || code === 'over_request_rate_limit') {
    return createAppError(
      'network',
      'Too many sign-in attempts. Please wait a moment and try again.',
      true,
    );
  }

  if (status === 403) {
    return createAppError(
      'forbidden',
      'Your account does not have permission for this action.',
      false,
    );
  }

  if (
    code === 'invalid_credentials' ||
    message.toLowerCase().includes('invalid login credentials')
  ) {
    return createAppError(
      'auth',
      'Invalid email or password. Check your credentials and try again.',
      false,
    );
  }

  if (code === 'email_not_confirmed') {
    return createAppError(
      'auth',
      'Your email address has not been confirmed yet.',
      false,
    );
  }

  if (isAuthApiError(error) && isNetworkMessage(message)) {
    return createAppError('network', message, true);
  }

  return createAppError('auth', message, false);
}

function mapPostgrestError(error: unknown, fallback: string): AppError | null {
  if (!isPostgrestErrorShape(error)) return null;

  const code = error.code ?? '';
  const rawMessage = sanitizeMessage(error.message, fallback);
  const lower = rawMessage.toLowerCase();

  if (isNetworkMessage(rawMessage)) {
    return createAppError(
      'network',
      'Unable to reach the database server. Check your connection and try again.',
      true,
    );
  }

  if (code === 'PGRST116') {
    return createAppError('not_found', fallback, false);
  }

  if (
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt')
  ) {
    return createAppError(
      'auth',
      'Your authentication session has expired. Please sign in again.',
      false,
    );
  }

  if (
    code === '42501' ||
    error.status === 403 ||
    lower.includes('row-level security') ||
    lower.includes('permission denied')
  ) {
    return createAppError(
      'forbidden',
      'You do not have permission to access or update this workspace record.',
      false,
    );
  }

  if (
    code === '22P02' ||
    code === '23502' ||
    code === '23503' ||
    code === '23505' ||
    code === '23514' ||
    code === 'PGRST204'
  ) {
    return createAppError('validation', rawMessage, false);
  }

  if (
    code === '57014' ||
    code.startsWith('08') ||
    code.startsWith('53') ||
    code.startsWith('57') ||
    (typeof error.status === 'number' && error.status >= 500)
  ) {
    return createAppError(
      'network',
      'The database request could not complete right now. Please try again.',
      true,
    );
  }

  return createAppError('unknown', rawMessage, false);
}

export function mapSupabaseError(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
): AppError {
  const safeFallback = sanitizeMessage(fallbackMessage, DEFAULT_ERROR_MESSAGE);

  if (isAppError(error)) {
    return createAppError(error.code, error.message, error.retryable);
  }

  const authMapped = mapAuthError(error, safeFallback);
  if (authMapped) return authMapped;

  const postgrestMapped = mapPostgrestError(error, safeFallback);
  if (postgrestMapped) return postgrestMapped;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return createAppError(
      'network',
      'The request timed out. Please try again.',
      true,
    );
  }

  if (error instanceof Error) {
    const message = sanitizeMessage(error.message, safeFallback);
    if (isNetworkMessage(message)) {
      return createAppError(
        'network',
        'Network connection failed while reaching Supabase. Check your connection and try again.',
        true,
      );
    }
    return createAppError('unknown', message, false);
  }

  if (typeof error === 'string') {
    const message = sanitizeMessage(error, safeFallback);
    return createAppError(
      isNetworkMessage(message) ? 'network' : 'unknown',
      message,
      isNetworkMessage(message),
    );
  }

  if (isPlainObject(error) && typeof error.message === 'string') {
    const message = sanitizeMessage(error.message, safeFallback);
    return createAppError(
      isNetworkMessage(message) ? 'network' : 'unknown',
      message,
      isNetworkMessage(message),
    );
  }

  return createAppError('unknown', safeFallback, false);
}
