import { supabase } from '../lib/supabase';
import type {
  AvatarChatBubblePayload,
  AvatarFacing,
  AvatarMovePacket,
  CharacterSpriteKey,
  RealtimeSyncScope,
  RemotePlayerPresence,
  RoomMessage,
  StudentRole,
} from '../types/contracts';
import type {
  StudioRealtimeConnectParams,
  StudioRealtimeConnection,
  StudioRealtimeRepository,
} from '../types/database';
import { getCharacterSpriteKey, truncateChatBubbleText } from './realtimeUtils';

export { getCharacterSpriteKey, truncateChatBubbleText };

const VALID_FACINGS: ReadonlySet<AvatarFacing> = new Set([
  'right',
  'up',
  'left',
  'down',
]);

const VALID_SPRITES: ReadonlySet<CharacterSpriteKey> = new Set([
  'adam',
  'alex',
  'amelia',
  'bob',
]);

const VALID_ROLES: ReadonlySet<StudentRole> = new Set([
  'student',
  'team_lead',
  'guest_demo',
]);

const VALID_SYNC_SCOPES: ReadonlySet<RealtimeSyncScope> = new Set([
  'project',
  'tasks',
  'resources',
  'whiteboard',
  'chat',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeFacing(value: unknown): AvatarFacing {
  return typeof value === 'string' && VALID_FACINGS.has(value as AvatarFacing)
    ? (value as AvatarFacing)
    : 'down';
}

function normalizeRole(value: unknown): StudentRole {
  return typeof value === 'string' && VALID_ROLES.has(value as StudentRole)
    ? (value as StudentRole)
    : 'student';
}

function normalizeSprite(
  value: unknown,
  userId: string,
  role: StudentRole,
): CharacterSpriteKey {
  if (typeof value === 'string' && VALID_SPRITES.has(value as CharacterSpriteKey)) {
    return value as CharacterSpriteKey;
  }
  return getCharacterSpriteKey(userId, role);
}

function parsePresenceEntry(
  raw: unknown,
  fallbackKey: string,
): RemotePlayerPresence | null {
  if (!isRecord(raw)) return null;

  const userId =
    typeof raw.userId === 'string' && raw.userId.trim().length > 0
      ? raw.userId.trim()
      : fallbackKey.trim();

  if (userId.length === 0) return null;

  const role = normalizeRole(raw.role);
  const displayName =
    typeof raw.displayName === 'string' && raw.displayName.trim().length > 0
      ? raw.displayName.trim()
      : 'Teammate';

  return {
    userId,
    displayName,
    role,
    spriteKey: normalizeSprite(raw.spriteKey, userId, role),
    x: typeof raw.x === 'number' && Number.isFinite(raw.x) ? raw.x : 56,
    y: typeof raw.y === 'number' && Number.isFinite(raw.y) ? raw.y : 189,
    facing: normalizeFacing(raw.facing),
    moving: Boolean(raw.moving),
    joinedAt:
      typeof raw.joinedAt === 'string' && raw.joinedAt.length > 0
        ? raw.joinedAt
        : '',
  };
}

function collectPresentUserIds(state: Record<string, unknown[]>): Set<string> {
  const userIds = new Set<string>();
  for (const [key, entries] of Object.entries(state)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const parsed = parsePresenceEntry(entry, key);
      if (parsed) {
        userIds.add(parsed.userId);
      }
    }
  }
  return userIds;
}

function parseMovePacket(raw: unknown): AvatarMovePacket | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.userId !== 'string' || raw.userId.trim().length === 0) {
    return null;
  }
  if (typeof raw.x !== 'number' || !Number.isFinite(raw.x)) return null;
  if (typeof raw.y !== 'number' || !Number.isFinite(raw.y)) return null;

  const userId = raw.userId.trim();
  const displayName =
    typeof raw.displayName === 'string' && raw.displayName.trim().length > 0
      ? raw.displayName.trim()
      : 'Teammate';

  return {
    userId,
    displayName,
    spriteKey: normalizeSprite(raw.spriteKey, userId, 'student'),
    x: raw.x,
    y: raw.y,
    facing: normalizeFacing(raw.facing),
    moving: Boolean(raw.moving),
  };
}

function parseChatBubblePayload(raw: unknown): AvatarChatBubblePayload | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.userId !== 'string' || raw.userId.trim().length === 0) {
    return null;
  }
  if (typeof raw.text !== 'string') return null;

  const text = truncateChatBubbleText(raw.text);
  if (text.length === 0) return null;

  return {
    userId: raw.userId.trim(),
    displayName:
      typeof raw.displayName === 'string' && raw.displayName.trim().length > 0
        ? raw.displayName.trim()
        : 'Teammate',
    text,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt.length > 0
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

function parseSyncScope(raw: unknown): RealtimeSyncScope | null {
  if (!isRecord(raw)) return null;
  if (
    typeof raw.scope === 'string' &&
    VALID_SYNC_SCOPES.has(raw.scope as RealtimeSyncScope)
  ) {
    return raw.scope as RealtimeSyncScope;
  }
  return null;
}

function parseRoomMessageRecord(raw: unknown): RoomMessage | null {
  if (!isRecord(raw)) return null;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.team_id !== 'string' ||
    typeof raw.user_id !== 'string' ||
    typeof raw.display_name !== 'string' ||
    typeof raw.body !== 'string' ||
    typeof raw.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: raw.id,
    teamId: raw.team_id,
    userId: raw.user_id,
    displayName: raw.display_name,
    body: raw.body.replace(/\u2014/g, '-'),
    createdAt: raw.created_at,
  };
}

function createNoopConnection(): StudioRealtimeConnection {
  return {
    broadcastMove: () => {},
    broadcastChat: () => {},
    broadcastDataSync: () => {},
    disconnect: async () => {},
  };
}

export class SupabaseStudioRealtimeRepository
  implements StudioRealtimeRepository
{
  connectStudioRoom(
    params: StudioRealtimeConnectParams,
  ): StudioRealtimeConnection {
    const normalizedTeamId = params.teamId.trim();
    const normalizedProjectId = params.projectId?.trim() || null;
    const { profile, spriteKey, callbacks } = params;

    if (!supabase || normalizedTeamId.length === 0 || !profile.id) {
      callbacks.onConnectionStatusChange('disconnected');
      return createNoopConnection();
    }

    const client = supabase;
    let disconnected = false;
    let isSubscribed = false;
    let latestPosition = {
      x: params.initialPosition?.x ?? 56,
      y: params.initialPosition?.y ?? 189,
      facing: params.initialPosition?.facing ?? ('down' as AvatarFacing),
      moving: false,
    };

    callbacks.onConnectionStatusChange('connecting');

    const channel = client.channel(`studio:${normalizedTeamId}`, {
      config: {
        presence: { key: profile.id },
        broadcast: { self: false },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      if (disconnected) return;

      const state = channel.presenceState<Record<string, unknown>>();
      const deduped = new Map<string, RemotePlayerPresence>();

      for (const [presenceKey, entries] of Object.entries(state)) {
        if (!Array.isArray(entries)) continue;
        for (const rawEntry of entries) {
          const parsed = parsePresenceEntry(rawEntry, presenceKey);
          if (!parsed || parsed.userId === profile.id) continue;

          const existing = deduped.get(parsed.userId);
          if (!existing || parsed.joinedAt >= existing.joinedAt) {
            deduped.set(parsed.userId, parsed);
          }
        }
      }

      callbacks.onPresenceSync(Array.from(deduped.values()));
    });

    channel.on('presence', { event: 'leave' }, (leavePayload) => {
      if (disconnected) return;

      const state = channel.presenceState<Record<string, unknown>>();
      const stillPresentIds = collectPresentUserIds(state);
      const leftIds = new Set<string>();

      if (
        typeof leavePayload.key === 'string' &&
        leavePayload.key.trim().length > 0
      ) {
        leftIds.add(leavePayload.key.trim());
      }

      if (Array.isArray(leavePayload.leftPresences)) {
        for (const entry of leavePayload.leftPresences) {
          if (
            isRecord(entry) &&
            typeof entry.userId === 'string' &&
            entry.userId.trim().length > 0
          ) {
            leftIds.add(entry.userId.trim());
          }
        }
      }

      for (const leftId of leftIds) {
        if (leftId !== profile.id && !stillPresentIds.has(leftId)) {
          callbacks.onRemoteLeave(leftId);
        }
      }
    });

    channel.on('broadcast', { event: 'avatar:move' }, (message) => {
      if (disconnected) return;
      const packet = parseMovePacket(message.payload);
      if (packet && packet.userId !== profile.id) {
        callbacks.onRemoteMove(packet);
      }
    });

    channel.on('broadcast', { event: 'avatar:chat' }, (message) => {
      if (disconnected) return;
      const payload = parseChatBubblePayload(message.payload);
      if (payload && payload.userId !== profile.id) {
        callbacks.onChatMessage(payload);
      }
    });

    channel.on('broadcast', { event: 'workspace:sync' }, (message) => {
      if (disconnected) return;
      if (
        isRecord(message.payload) &&
        message.payload.userId === profile.id
      ) {
        return;
      }
      const scope = parseSyncScope(message.payload);
      if (scope) {
        callbacks.onDataChanged(scope);
      }
    });

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `team_id=eq.${normalizedTeamId}`,
      },
      () => {
        if (!disconnected) {
          callbacks.onDataChanged('project');
        }
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `team_id=eq.${normalizedTeamId}`,
      },
      (payload) => {
        if (disconnected) return;
        const message = parseRoomMessageRecord(payload.new);
        if (message) {
          callbacks.onRoomMessage(message);
        }
      },
    );

    const projectFilter = normalizedProjectId
      ? `project_id=eq.${normalizedProjectId}`
      : undefined;

    const projectSubscriptions: ReadonlyArray<{
      table: string;
      event: '*' | 'INSERT';
      scope: RealtimeSyncScope;
    }> = [
      { table: 'tasks', event: '*', scope: 'tasks' },
      { table: 'resources', event: '*', scope: 'resources' },
      { table: 'whiteboard_notes', event: '*', scope: 'whiteboard' },
      { table: 'whiteboard_strokes', event: '*', scope: 'whiteboard' },
      { table: 'activity_logs', event: 'INSERT', scope: 'project' },
    ];

    for (const sub of projectSubscriptions) {
      channel.on(
        'postgres_changes',
        projectFilter
          ? {
              event: sub.event,
              schema: 'public',
              table: sub.table,
              filter: projectFilter,
            }
          : {
              event: sub.event,
              schema: 'public',
              table: sub.table,
            },
        () => {
          if (!disconnected) {
            callbacks.onDataChanged(sub.scope);
          }
        },
      );
    }

    channel.subscribe(async (status) => {
      if (disconnected) return;

      if (status === 'SUBSCRIBED') {
        isSubscribed = true;
        callbacks.onConnectionStatusChange('connected');
        const trackPayload: RemotePlayerPresence = {
          userId: profile.id,
          displayName: profile.displayName,
          role: profile.role,
          spriteKey,
          x: latestPosition.x,
          y: latestPosition.y,
          facing: latestPosition.facing,
          moving: latestPosition.moving,
          joinedAt: new Date().toISOString(),
        };
        try {
          await channel.track(trackPayload);
        } catch {
          // Presence track may fail transiently if teardown starts mid-handshake.
        }
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        isSubscribed = false;
        callbacks.onConnectionStatusChange('disconnected');
      }
    });

    return {
      broadcastMove: (payload) => {
        latestPosition = {
          x: payload.x,
          y: payload.y,
          facing: payload.facing,
          moving: payload.moving,
        };
        if (disconnected || !isSubscribed) return;

        const packet: AvatarMovePacket = {
          userId: profile.id,
          displayName: profile.displayName,
          spriteKey,
          x: payload.x,
          y: payload.y,
          facing: payload.facing,
          moving: payload.moving,
        };

        void channel.send({
          type: 'broadcast',
          event: 'avatar:move',
          payload: packet,
        });
      },

      broadcastChat: (payload) => {
        if (disconnected || !isSubscribed) return;

        const cleanText = truncateChatBubbleText(payload.text);
        if (cleanText.length === 0) return;

        const safePayload: AvatarChatBubblePayload = {
          userId: profile.id,
          displayName: profile.displayName,
          text: cleanText,
          createdAt: payload.createdAt || new Date().toISOString(),
        };

        void channel.send({
          type: 'broadcast',
          event: 'avatar:chat',
          payload: safePayload,
        });
      },

      broadcastDataSync: (scope) => {
        if (disconnected || !isSubscribed) return;

        void channel.send({
          type: 'broadcast',
          event: 'workspace:sync',
          payload: { scope, userId: profile.id },
        });
      },

      disconnect: async () => {
        if (disconnected) return;
        disconnected = true;
        isSubscribed = false;
        callbacks.onConnectionStatusChange('disconnected');

        try {
          await channel.untrack();
        } catch {
          // Ignore untrack failures during channel cleanup.
        }

        try {
          await client.removeChannel(channel);
        } catch {
          // Ignore removeChannel failures during teardown.
        }
      },
    };
  }
}

export const realtimeService: StudioRealtimeRepository =
  new SupabaseStudioRealtimeRepository();
