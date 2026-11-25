/**
 * Shared formatting and safe-presentation helpers for workstation panels.
 */

export function formatDisplayDate(
  isoValue: string | null | undefined,
  mode: 'date' | 'datetime' = 'datetime',
): string | null {
  if (!isoValue) return null;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return isoValue;
  }

  if (mode === 'date') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function getTwoLetterInitials(displayName: string): string {
  const withoutParens = displayName.replace(/\([^)]*\)/g, ' ').trim();
  const source = withoutParens || displayName.trim();
  const tokens = source
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter((part) => part.length > 0);

  if (tokens.length === 0) return '--';
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
}
