import type {
  CharacterSpriteKey,
  StudentRole,
  WhiteboardStrokePoint,
} from '../types/contracts';

const SPRITE_POOL: readonly CharacterSpriteKey[] = [
  'amelia',
  'alex',
  'bob',
  'adam',
];

const DEMO_SPRITE_OVERRIDES: Record<string, CharacterSpriteKey> = {
  '11111111-1111-4111-8111-111111111101': 'adam',
  '11111111-1111-4111-8111-111111111102': 'bob',
};

const WHITEBOARD_MAX_X = 480;
const WHITEBOARD_MAX_Y = 260;
const WHITEBOARD_MAX_POINTS = 500;

function roundToOneDecimal(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolves a deterministic pixel-art character sprite key for a student ID.
 */
export function getCharacterSpriteKey(
  userId: string,
  role?: StudentRole,
): CharacterSpriteKey {
  const normalizedId = userId.trim().toLowerCase();
  if (normalizedId in DEMO_SPRITE_OVERRIDES) {
    return DEMO_SPRITE_OVERRIDES[normalizedId];
  }

  if (normalizedId.length === 0) {
    if (role === 'team_lead') return 'adam';
    if (role === 'guest_demo') return 'amelia';
    return 'alex';
  }

  let hash = 2166136261;
  for (let i = 0; i < normalizedId.length; i += 1) {
    hash ^= normalizedId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return SPRITE_POOL[(hash >>> 0) % SPRITE_POOL.length];
}

/**
 * Formats chat text for compact over-head Phaser speech bubbles.
 */
export function truncateChatBubbleText(raw: string, maxLen = 56): string {
  const cleaned = raw
    .replace(/\u2014/g, '-')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();

  if (maxLen <= 0 || cleaned.length === 0) {
    return '';
  }

  if (cleaned.length <= maxLen) {
    return cleaned;
  }

  if (maxLen <= 3) {
    return cleaned.slice(0, maxLen);
  }

  const sliceLen = maxLen - 3;
  const trimmedHead = cleaned.slice(0, sliceLen).trimEnd();
  const safeHead =
    trimmedHead.length > 0 ? trimmedHead : cleaned.slice(0, sliceLen);

  return `${safeHead}...`;
}

/**
 * Clamps whiteboard stroke coordinates to the 480x260 canvas and caps length at 500 points.
 */
export function normalizeStrokePoints(
  points: readonly WhiteboardStrokePoint[],
): WhiteboardStrokePoint[] {
  const normalized: WhiteboardStrokePoint[] = [];

  for (const point of points) {
    if (normalized.length >= WHITEBOARD_MAX_POINTS) {
      break;
    }
    if (
      !point ||
      typeof point.x !== 'number' ||
      typeof point.y !== 'number' ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      continue;
    }

    normalized.push({
      x: roundToOneDecimal(clamp(point.x, 0, WHITEBOARD_MAX_X)),
      y: roundToOneDecimal(clamp(point.y, 0, WHITEBOARD_MAX_Y)),
    });
  }

  return normalized;
}
