import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canTransitionRoute } from '../../src/app/routerContract.ts';
import {
  formatDisplayDate,
  getTwoLetterInitials,
  parseSafeHttpUrl,
} from '../../src/components/workstation/workstationUtils.ts';
import {
  createAppError,
  mapSupabaseError,
} from '../../src/services/errorMapper.ts';

describe('mapSupabaseError', () => {
  it('maps Postgres 42501 RLS violations to non-retryable forbidden errors', () => {
    const mapped = mapSupabaseError({
      code: '42501',
      message: 'new row violates row-level security policy for table "tasks"',
    });

    assert.equal(mapped.code, 'forbidden');
    assert.equal(mapped.retryable, false);
    assert.equal(
      mapped.message,
      'You do not have permission to access or update this workspace record.',
    );
  });

  it('maps PGRST301 JWT expiry errors to auth errors', () => {
    const mapped = mapSupabaseError({
      code: 'PGRST301',
      message: 'JWT expired',
    });

    assert.equal(mapped.code, 'auth');
    assert.equal(mapped.retryable, false);
    assert.match(mapped.message, /session has expired/i);
  });

  it('maps PGRST116 missing single-row errors to not_found using sanitized fallback', () => {
    const mapped = mapSupabaseError(
      {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
      },
      'No project overview found',
    );

    assert.equal(mapped.code, 'not_found');
    assert.equal(mapped.retryable, false);
    assert.equal(mapped.message, 'No project overview found');
  });

  it('maps TypeError("Failed to fetch") to retryable network errors', () => {
    const mapped = mapSupabaseError(new TypeError('Failed to fetch'));

    assert.equal(mapped.code, 'network');
    assert.equal(mapped.retryable, true);
    assert.match(mapped.message, /network connection failed/i);
  });

  it('sanitizes em dashes out of mapped error messages and fallback messages', () => {
    const fromError = mapSupabaseError(
      new Error('Sync paused \u2014 try saving again'),
    );
    assert.equal(fromError.message.includes('\u2014'), false);
    assert.equal(fromError.message, 'Sync paused - try saving again');

    const fromFallback = mapSupabaseError(null, 'Workspace unavailable \u2014 retry');
    assert.equal(fromFallback.message.includes('\u2014'), false);
    assert.equal(fromFallback.message, 'Workspace unavailable - retry');

    const created = createAppError('validation', 'Invalid status \u2014 pick one');
    assert.equal(created.message.includes('\u2014'), false);
    assert.equal(created.message, 'Invalid status - pick one');
  });
});

describe('canTransitionRoute', () => {
  it('allows valid campus navigation transitions', () => {
    assert.equal(canTransitionRoute('entry', 'spaces'), true);
    assert.equal(canTransitionRoute('spaces', 'workspace'), true);
    assert.equal(canTransitionRoute('workspace', 'spaces'), true);
    assert.equal(canTransitionRoute('spaces', 'entry'), true);
    assert.equal(canTransitionRoute('workspace', 'entry'), true);
  });

  it('rejects skipping spaces from entry directly to workspace and self-transitions', () => {
    assert.equal(canTransitionRoute('entry', 'workspace'), false);
    assert.equal(canTransitionRoute('entry', 'entry'), false);
    assert.equal(canTransitionRoute('spaces', 'spaces'), false);
    assert.equal(canTransitionRoute('workspace', 'workspace'), false);
  });
});

describe('workstationUtils', () => {
  it('computes two-letter initials while ignoring parenthetical demo tags', () => {
    assert.equal(getTwoLetterInitials('Nadia Pratama (Demo)'), 'NP');
    assert.equal(getTwoLetterInitials('Bima Santoso (Demo)'), 'BS');
    assert.equal(getTwoLetterInitials('Nadia'), 'NA');
    assert.equal(getTwoLetterInitials('   '), '--');
  });

  it('formats valid ISO dates and handles missing or invalid date inputs cleanly', () => {
    assert.equal(formatDisplayDate(null), null);
    assert.equal(formatDisplayDate(undefined), null);
    assert.equal(formatDisplayDate(''), null);
    assert.equal(formatDisplayDate('not-a-valid-iso-date'), 'not-a-valid-iso-date');

    const isoSample = '2026-06-15T12:00:00Z';
    const expectedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(isoSample));
    assert.equal(formatDisplayDate(isoSample, 'date'), expectedDate);

    const expectedDatetime = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoSample));
    assert.equal(formatDisplayDate(isoSample, 'datetime'), expectedDatetime);
  });
});

describe('parseSafeHttpUrl', () => {
  it('accepts https and http URLs and extracts hostname labels', () => {
    const httpsResult = parseSafeHttpUrl('  https://github.com/edgiaxel/LearnNexus  ');
    assert.deepEqual(httpsResult, {
      safeHref: 'https://github.com/edgiaxel/LearnNexus',
      hostLabel: 'github.com',
    });

    const httpResult = parseSafeHttpUrl('http://localhost:5173/docs');
    assert.deepEqual(httpResult, {
      safeHref: 'http://localhost:5173/docs',
      hostLabel: 'localhost',
    });
  });

  it('rejects unsafe protocols, empty strings, and malformed URLs', () => {
    assert.equal(parseSafeHttpUrl('javascript:alert(1)'), null);
    assert.equal(parseSafeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.equal(parseSafeHttpUrl('ftp://files.example.edu/notes.pdf'), null);
    assert.equal(parseSafeHttpUrl('   '), null);
    assert.equal(parseSafeHttpUrl('not-a-valid-url'), null);
  });
});
