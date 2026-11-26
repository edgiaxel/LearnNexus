import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WORKSTATION_META } from '../../src/app/routerContract.ts';
import {
  dateInputToIso,
  toDateInputValue,
} from '../../src/components/workstation/workstationUtils.ts';
import {
  getCharacterSpriteKey,
  normalizeStrokePoints,
  truncateChatBubbleText,
} from '../../src/services/realtimeUtils.ts';

describe('getCharacterSpriteKey', () => {
  it('pins Nadia to adam and Bima to bob so existing sprite assertions stay stable', () => {
    assert.equal(
      getCharacterSpriteKey('11111111-1111-4111-8111-111111111101', 'team_lead'),
      'adam',
    );
    assert.equal(
      getCharacterSpriteKey('11111111-1111-4111-8111-111111111102', 'student'),
      'bob',
    );
  });

  it('resolves deterministic character sprite keys for arbitrary user IDs and empty IDs', () => {
    const allowed = new Set(['adam', 'alex', 'amelia', 'bob']);
    const first = getCharacterSpriteKey('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    const second = getCharacterSpriteKey('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    assert.equal(first, second);
    assert.equal(allowed.has(first), true);
    assert.equal(getCharacterSpriteKey('', 'team_lead'), 'adam');
    assert.equal(getCharacterSpriteKey('', 'guest_demo'), 'amelia');
    assert.equal(getCharacterSpriteKey('', 'student'), 'alex');
  });
});

describe('truncateChatBubbleText', () => {
  it('normalizes whitespace, strips em dashes, and caps length cleanly', () => {
    assert.equal(truncateChatBubbleText('  Hello   studio!  '), 'Hello   studio!');
    assert.equal(
      truncateChatBubbleText('Sprint review \u2014 ready now'),
      'Sprint review - ready now',
    );

    const longMessage =
      'Let us verify the sprint board tasks and whiteboard sticky notes together';
    const truncated = truncateChatBubbleText(longMessage, 32);
    assert.equal(truncated.length <= 32, true);
    assert.equal(truncated.endsWith('...'), true);
    assert.equal(truncateChatBubbleText('   '), '');
  });
});

describe('normalizeStrokePoints', () => {
  it('clamps coordinates to 480x260, rounds to 1 decimal, drops invalid points, and caps at 500', () => {
    const cleaned = normalizeStrokePoints([
      { x: -12.34, y: 12.349 },
      { x: 510, y: 299.9 },
      { x: Number.NaN, y: 40 },
    ]);

    assert.deepEqual(cleaned, [
      { x: 0, y: 12.3 },
      { x: 480, y: 260 },
    ]);

    const huge = Array.from({ length: 540 }, (_, i) => ({ x: i, y: 20 }));
    const capped = normalizeStrokePoints(huge);
    assert.equal(capped.length, 500);
  });
});

describe('WORKSTATION_META & date helpers', () => {
  it('registers the 4th whiteboard workstation contract', () => {
    assert.deepEqual(WORKSTATION_META.whiteboard, {
      id: 'whiteboard',
      screenId: 'UI-08b',
      title: 'Team Whiteboard',
      promptLabel: 'Open Team Whiteboard',
    });
  });

  it('converts ISO timestamps and YYYY-MM-DD date inputs consistently', () => {
    const sampleIso = '2026-12-01T17:00:00Z';
    const sampleDate = new Date(sampleIso);
    const expectedLocalDate = `${sampleDate.getFullYear()}-${String(sampleDate.getMonth() + 1).padStart(2, '0')}-${String(sampleDate.getDate()).padStart(2, '0')}`;

    assert.equal(toDateInputValue(sampleIso), expectedLocalDate);
    assert.equal(toDateInputValue('2026-12-01'), '2026-12-01');
    assert.equal(toDateInputValue(null), '');
    assert.equal(dateInputToIso('2026-12-05'), '2026-12-05T12:00:00.000Z');
    assert.equal(toDateInputValue(dateInputToIso('2026-12-05')), '2026-12-05');
    assert.equal(dateInputToIso('  '), null);
  });
});
