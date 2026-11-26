import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { StudioCollaborationBarProps } from '../../types/components';
import type {
  CharacterSpriteKey,
  RealtimeConnectionStatus,
} from '../../types/contracts';
import {
  formatDisplayDate,
  getTwoLetterInitials,
} from '../workstation/workstationUtils';

const MAX_CHAT_MESSAGE_LENGTH = 500;

const SPRITE_LABELS: Record<CharacterSpriteKey, string> = {
  adam: 'Adam',
  alex: 'Alex',
  amelia: 'Amelia',
  bob: 'Bob',
};

const CONNECTION_BADGE_META: Record<
  RealtimeConnectionStatus,
  { label: string; className: string }
> = {
  connected: {
    label: 'Live sync',
    className: 'status-badge status-badge--done',
  },
  connecting: {
    label: 'Connecting...',
    className: 'status-badge status-badge--todo',
  },
  disconnected: {
    label: 'Offline (async mode)',
    className:
      'status-badge border border-[var(--color-border-control)] bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)]',
  },
};

function getSpriteLabel(spriteKey: CharacterSpriteKey): string {
  return SPRITE_LABELS[spriteKey] ?? spriteKey;
}

interface RosterMemberRowProps {
  displayName: string;
  spriteKey: CharacterSpriteKey;
  isSelf?: boolean;
  isNearby?: boolean;
}

/**
 * Renders one studio participant row inside the online teammates popover card.
 */
function RosterMemberRow({
  displayName,
  spriteKey,
  isSelf = false,
  isNearby = false,
}: RosterMemberRowProps) {
  return (
    <li
      className={
        isSelf
          ? 'flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--color-accent-sage-soft)] bg-[var(--color-surface-secondary)] px-3 py-2'
          : 'flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] px-3 py-2'
      }
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={
            isSelf
              ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[12px] font-semibold text-[var(--color-text-primary)]'
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#A5C6D4] bg-[var(--color-accent-blue)] text-[12px] font-semibold text-[var(--color-text-primary)]'
          }
        >
          {getTwoLetterInitials(displayName)}
        </span>
        <span className="min-w-0 break-words text-[14px] font-medium text-[var(--color-text-primary)]">
          {displayName}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {isSelf && <span className="status-badge status-badge--done">You</span>}
        {!isSelf && isNearby && (
          <span className="status-badge border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]">
            Nearby
          </span>
        )}
        <span
          className={
            isSelf
              ? 'status-badge border border-[#C4BAD6] bg-[var(--color-accent-lavender)] text-[var(--color-text-primary)]'
              : 'status-badge border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
          }
        >
          Avatar: {getSpriteLabel(spriteKey)}
        </span>
      </div>
    </li>
  );
}

/**
 * Compact Cozy Digital Campus collaboration bar mounted inside <main>.
 * Displays live sync status, nearby peers, online studio roster, and
 * collapsible persisted team studio chat.
 */
export function StudioCollaborationBar({
  currentUser,
  localSpriteKey,
  connectionStatus,
  remotePlayers,
  nearbyPeerIds,
  messages,
  chatOpen,
  unreadCount,
  chatLoading,
  chatError,
  sendingMessage,
  sendError,
  onToggleChat,
  onCloseChat,
  onSendMessage,
  onRetryMessages,
  onInputFocusChange,
}: StudioCollaborationBarProps) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const isMountedRef = useRef(true);
  const isInputFocusedRef = useRef(false);
  const lastOpenedRef = useRef<'roster' | 'chat' | null>(null);
  const prevChatOpenRef = useRef(chatOpen);

  const rosterButtonRef = useRef<HTMLButtonElement | null>(null);
  const rosterCardRef = useRef<HTMLDivElement | null>(null);
  const chatToggleRef = useRef<HTMLButtonElement | null>(null);
  const chatPanelRef = useRef<HTMLElement | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const onCloseChatRef = useRef(onCloseChat);
  onCloseChatRef.current = onCloseChat;
  const onInputFocusChangeRef = useRef(onInputFocusChange);
  onInputFocusChangeRef.current = onInputFocusChange;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (isInputFocusedRef.current) {
        isInputFocusedRef.current = false;
        onInputFocusChangeRef.current(false);
      }
    };
  }, []);

  const setInputFocused = useCallback((focused: boolean) => {
    isInputFocusedRef.current = focused;
    onInputFocusChangeRef.current(focused);
  }, []);

  useEffect(() => {
    const wasOpen = prevChatOpenRef.current;
    prevChatOpenRef.current = chatOpen;

    if (!wasOpen && chatOpen) {
      lastOpenedRef.current = 'chat';
    } else if (wasOpen && !chatOpen && isInputFocusedRef.current) {
      setInputFocused(false);
    }
  }, [chatOpen, setInputFocused]);

  useEffect(() => {
    if (!chatOpen || chatLoading || chatError) return;
    const listEl = chatListRef.current;
    if (!listEl) return;
    listEl.scrollTop = listEl.scrollHeight;
  }, [chatOpen, chatLoading, chatError, messages.length]);

  const closeChatPanel = useCallback(
    (restoreToggleFocus: boolean) => {
      setInputFocused(false);
      if (restoreToggleFocus) {
        chatToggleRef.current?.focus();
      }
      onCloseChatRef.current();
    },
    [setInputFocused],
  );

  const closeRosterCard = useCallback((restoreToggleFocus: boolean) => {
    if (restoreToggleFocus) {
      rosterButtonRef.current?.focus();
    }
    setRosterOpen(false);
  }, []);

  useEffect(() => {
    if (!rosterOpen && !chatOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      const activeEl = document.activeElement;
      const drawerEl = document.querySelector('[data-testid="workstation-drawer"]');
      if (drawerEl && activeEl && drawerEl.contains(activeEl)) {
        return;
      }

      const focusInChat = Boolean(
        chatOpen && activeEl && chatPanelRef.current?.contains(activeEl),
      );
      const focusInRoster = Boolean(
        rosterOpen && activeEl && rosterCardRef.current?.contains(activeEl),
      );

      if (focusInChat) {
        event.preventDefault();
        closeChatPanel(true);
        return;
      }

      if (focusInRoster) {
        event.preventDefault();
        closeRosterCard(true);
        return;
      }

      if (rosterOpen && chatOpen) {
        event.preventDefault();
        if (lastOpenedRef.current === 'roster') {
          closeRosterCard(false);
        } else {
          closeChatPanel(false);
        }
        return;
      }

      if (chatOpen) {
        event.preventDefault();
        closeChatPanel(false);
        return;
      }

      if (rosterOpen) {
        event.preventDefault();
        closeRosterCard(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rosterOpen, chatOpen, closeChatPanel, closeRosterCard]);

  const otherPlayers = useMemo(
    () => remotePlayers.filter((player) => player.userId !== currentUser.id),
    [remotePlayers, currentUser.id],
  );

  const nearbyPeerSet = useMemo(() => new Set(nearbyPeerIds), [nearbyPeerIds]);

  const nearbyDisplayNames = useMemo(() => {
    if (nearbyPeerSet.size === 0) return [];
    const byId = new Map(otherPlayers.map((p) => [p.userId, p.displayName]));
    const names: string[] = [];
    for (const peerId of nearbyPeerSet) {
      if (peerId === currentUser.id) continue;
      const matchedName = byId.get(peerId);
      if (matchedName) {
        names.push(matchedName);
      }
    }
    return names;
  }, [nearbyPeerSet, otherPlayers, currentUser.id]);

  const onlineTotal = 1 + otherPlayers.length;
  const connectionMeta = CONNECTION_BADGE_META[connectionStatus];

  const handleToggleRoster = () => {
    setRosterOpen((prev) => {
      const next = !prev;
      if (next) {
        lastOpenedRef.current = 'roster';
      }
      return next;
    });
  };

  const handleToggleChatClick = () => {
    if (chatOpen && isInputFocusedRef.current) {
      setInputFocused(false);
    }
    onToggleChat();
  };

  const handleSubmitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendingMessage) return;

    const trimmed = draft.trim();
    if (!trimmed) return;

    try {
      const sent = await onSendMessage(trimmed);
      if (!isMountedRef.current) return;
      if (sent) {
        setDraft('');
      }
    } catch {
      // Preserve draft when parent send handler rejects.
    }
  };

  return (
    <section
      aria-label="Studio collaboration"
      data-testid="studio-collaboration-bar"
      className="flex w-full flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-2.5 sm:px-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            data-testid="realtime-status-badge"
            role="status"
            className={connectionMeta.className}
          >
            {connectionMeta.label}
          </span>

          {nearbyPeerIds.length > 0 && (
            <span
              data-testid="nearby-teammates-badge"
              className="status-badge max-w-full break-words border border-[var(--color-accent-sage)] bg-[var(--color-accent-sage-soft)] text-[var(--color-text-primary)]"
            >
              {nearbyDisplayNames.length > 0
                ? `Nearby: ${nearbyDisplayNames.join(', ')}`
                : `Nearby: ${nearbyPeerIds.length} ${nearbyPeerIds.length === 1 ? 'teammate' : 'teammates'}`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            ref={rosterButtonRef}
            type="button"
            data-testid="online-teammates-btn"
            aria-expanded={rosterOpen}
            aria-controls={rosterOpen ? 'online-teammates-list' : undefined}
            onClick={handleToggleRoster}
            className={
              rosterOpen
                ? 'btn-secondary min-h-[44px] border-[var(--color-accent-sage-strong)] bg-[var(--color-surface-tertiary)]'
                : 'btn-secondary min-h-[44px]'
            }
          >
            Online ({onlineTotal})
          </button>

          <button
            ref={chatToggleRef}
            type="button"
            data-testid="studio-chat-toggle"
            aria-expanded={chatOpen}
            aria-controls={chatOpen ? 'studio-chat-panel' : undefined}
            onClick={handleToggleChatClick}
            className={
              chatOpen
                ? 'btn-secondary min-h-[44px] border-[var(--color-accent-sage-strong)] bg-[var(--color-surface-tertiary)]'
                : 'btn-secondary min-h-[44px]'
            }
          >
            <span>Studio Chat</span>
            {!chatOpen && unreadCount > 0 && (
              <>
                <span
                  data-testid="studio-chat-unread-badge"
                  className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-sage-strong)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--color-text-inverse)]"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
                <span className="sr-only">unread messages</span>
              </>
            )}
          </button>
        </div>
      </div>

      {rosterOpen && (
        <div
          ref={rosterCardRef}
          id="online-teammates-list"
          data-testid="online-teammates-list"
          role="region"
          aria-labelledby="online-teammates-heading"
          className="surface-card flex w-full flex-col gap-3 p-3.5 sm:p-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2.5">
            <h2
              id="online-teammates-heading"
              className="m-0 text-[15px] font-semibold leading-5 text-[var(--color-text-charcoal)]"
            >
              Online in Studio ({onlineTotal})
            </h2>
            <button
              type="button"
              className="btn-ghost min-h-[44px] shrink-0"
              aria-label="Close online teammates"
              onClick={() => closeRosterCard(true)}
            >
              Close
            </button>
          </div>

          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <RosterMemberRow
              displayName={currentUser.displayName}
              spriteKey={localSpriteKey}
              isSelf
            />

            {otherPlayers.map((player) => (
              <RosterMemberRow
                key={player.userId}
                displayName={player.displayName}
                spriteKey={player.spriteKey}
                isNearby={nearbyPeerSet.has(player.userId)}
              />
            ))}
          </ul>

          {otherPlayers.length === 0 && (
            <p className="m-0 text-[13px] leading-5 text-[var(--color-text-secondary)]">
              You are the only teammate in this studio right now. Your project
              updates and chat messages stay saved asynchronously.
            </p>
          )}
        </div>
      )}

      {chatOpen && (
        <section
          ref={chatPanelRef}
          id="studio-chat-panel"
          data-testid="studio-chat-panel"
          aria-labelledby="studio-chat-heading"
          className="surface-card flex w-full flex-col gap-3 p-3.5 sm:p-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2.5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <h2
                id="studio-chat-heading"
                className="m-0 text-[15px] font-semibold leading-5 text-[var(--color-text-charcoal)]"
              >
                Studio Chat
              </h2>
              {!chatLoading && !chatError && messages.length > 0 && (
                <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  {messages.length}{' '}
                  {messages.length === 1 ? 'message' : 'messages'}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn-ghost min-h-[44px] shrink-0"
              aria-label="Close studio chat"
              onClick={() => closeChatPanel(true)}
            >
              Close
            </button>
          </div>

          <div
            ref={chatListRef}
            data-testid="studio-chat-list"
            className="flex max-h-[260px] min-h-[120px] flex-col gap-2.5 overflow-y-auto pr-1"
          >
            {chatLoading ? (
              <div aria-busy="true" className="flex flex-col gap-3">
                <p
                  role="status"
                  className="m-0 text-[13px] font-medium text-[var(--color-text-secondary)]"
                >
                  Loading studio chat...
                </p>
                <div aria-hidden="true" className="flex flex-col gap-2.5">
                  <div className="h-12 w-4/5 rounded-[10px] bg-[#EEF1E8]" />
                  <div className="h-12 w-3/4 rounded-[10px] bg-[#EEF1E8]" />
                  <div className="h-12 w-5/6 rounded-[10px] bg-[#EEF1E8]" />
                </div>
              </div>
            ) : chatError ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-status-error-text)] bg-[#FAECEB] p-3.5 text-[var(--color-status-error-text)]"
              >
                <div className="flex flex-col gap-1">
                  <p className="m-0 text-[14px] font-semibold leading-5">
                    Could not load studio chat
                  </p>
                  <p className="m-0 break-words text-[13px] leading-5">
                    {chatError}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary w-fit"
                  onClick={onRetryMessages}
                >
                  Retry
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-4">
                <p className="m-0 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                  No studio messages yet. Say hello to start collaborating.
                </p>
              </div>
            ) : (
              <ul
                aria-label="Studio chat messages"
                aria-live="polite"
                className="m-0 flex list-none flex-col gap-2 p-0"
              >
                {messages.map((msg) => {
                  const isOwn = msg.userId === currentUser.id;
                  const formattedTime =
                    formatDisplayDate(msg.createdAt, 'datetime') ??
                    msg.createdAt;
                  return (
                    <li
                      key={msg.id}
                      className={
                        isOwn
                          ? 'rounded-[10px] border border-[var(--color-accent-sage-soft)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5'
                          : 'rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] px-3.5 py-2.5'
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="break-words text-[13px] font-semibold text-[var(--color-text-charcoal)]">
                            {msg.displayName}
                          </span>
                          {isOwn && (
                            <span className="status-badge status-badge--done">
                              You
                            </span>
                          )}
                        </div>
                        <time
                          dateTime={msg.createdAt}
                          className="shrink-0 text-[11px] font-medium text-[var(--color-text-secondary)]"
                        >
                          {formattedTime}
                        </time>
                      </div>
                      <p className="m-0 mt-1 whitespace-pre-wrap break-words text-[14px] leading-5 text-[var(--color-text-primary)]">
                        {msg.body}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {sendError && (
            <div
              role="alert"
              className="rounded-[10px] border border-[var(--color-status-error-text)] bg-[#FAECEB] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--color-status-error-text)]"
            >
              <p className="m-0 font-semibold">Message not sent</p>
              <p className="m-0 mt-0.5 break-words">{sendError}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmitMessage}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="studio-chat-input" className="sr-only">
                  Message team studio
                </label>
                <input
                  id="studio-chat-input"
                  data-testid="studio-chat-input"
                  type="text"
                  className="control-input"
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Message teammates in studio..."
                />
              </div>
              <button
                type="submit"
                data-testid="studio-chat-send-btn"
                className="btn-primary shrink-0"
                disabled={sendingMessage || !draft.trim()}
                aria-busy={sendingMessage || undefined}
              >
                Send
              </button>
            </div>
            {draft.length >= 400 && (
              <p className="m-0 text-right text-[11px] font-medium text-[var(--color-text-secondary)]">
                {draft.length}/{MAX_CHAT_MESSAGE_LENGTH}
              </p>
            )}
          </form>
        </section>
      )}
    </section>
  );
}
