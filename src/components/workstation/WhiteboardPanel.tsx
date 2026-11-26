import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { WhiteboardPanelProps } from '../../types/components';
import type {
  AsyncState,
  WhiteboardNote,
  WhiteboardNoteColor,
  WhiteboardPenColor,
  WhiteboardStroke,
  WhiteboardStrokePoint,
  WhiteboardStrokeWidth,
} from '../../types/contracts';
import {
  PanelContextHeader,
  PanelEmptyCard,
  PanelErrorCard,
  PanelLoadingSkeleton,
} from './PanelStateCards';
import { formatDisplayDate } from './workstationUtils';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 260;

const WHITEBOARD_SKELETON_BLOCKS = [
  'h-11 w-full rounded-[8px]',
  'h-52 w-full rounded-[10px]',
  'h-28 w-full rounded-[10px]',
] as const;

const PEN_COLOR_OPTIONS: ReadonlyArray<{
  color: WhiteboardPenColor;
  testIdSuffix: string;
  label: string;
}> = [
  { color: '#30343B', testIdSuffix: '30343B', label: 'Charcoal' },
  { color: '#4A6B46', testIdSuffix: '4A6B46', label: 'Sage' },
  { color: '#7C4520', testIdSuffix: '7C4520', label: 'Umber' },
  { color: '#8E2F29', testIdSuffix: '8E2F29', label: 'Terracotta' },
];

const STROKE_WIDTH_OPTIONS: ReadonlyArray<{
  width: WhiteboardStrokeWidth;
  label: string;
}> = [
  { width: 2, label: 'Fine (2px)' },
  { width: 4, label: 'Bold (4px)' },
];

const NOTE_COLOR_OPTIONS: ReadonlyArray<{
  color: WhiteboardNoteColor;
  label: string;
  cardClass: string;
  chipClass: string;
}> = [
  {
    color: 'yellow',
    label: 'Yellow',
    cardClass: 'bg-[#FBF4DE] border-[#D4C07C]',
    chipClass: 'bg-[#F0DFA7] border-[#8C7327]',
  },
  {
    color: 'sage',
    label: 'Sage',
    cardClass: 'bg-[#EEF1E8] border-[#A4B99C]',
    chipClass: 'bg-[#C9D7BA] border-[#4A6B46]',
  },
  {
    color: 'lavender',
    label: 'Lavender',
    cardClass: 'bg-[#F2EEF9] border-[#C4BAD6]',
    chipClass: 'bg-[#DAD2E9] border-[#6A5C87]',
  },
  {
    color: 'peach',
    label: 'Peach',
    cardClass: 'bg-[#F7ECE4] border-[#DFAF8D]',
    chipClass: 'bg-[#F1D2BC] border-[#7C4520]',
  },
];

interface WhiteboardData {
  strokes: WhiteboardStroke[];
  notes: WhiteboardNote[];
}

interface PendingStroke {
  tempId: string;
  color: WhiteboardPenColor;
  width: WhiteboardStrokeWidth;
  points: WhiteboardStrokePoint[];
}

interface ActiveStrokeDraft {
  pointerId: number;
  color: WhiteboardPenColor;
  width: WhiteboardStrokeWidth;
  points: WhiteboardStrokePoint[];
}

function getNoteStyle(color: WhiteboardNoteColor) {
  return (
    NOTE_COLOR_OPTIONS.find((option) => option.color === color) ??
    NOTE_COLOR_OPTIONS[0]
  );
}

function mapPointerToCanvas(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): WhiteboardStrokePoint {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  const rawX = (event.clientX - rect.left) * scaleX;
  const rawY = (event.clientY - rect.top) * scaleY;
  const clampedX = Math.max(0, Math.min(canvas.width, rawX));
  const clampedY = Math.max(0, Math.min(canvas.height, rawY));
  return {
    x: Math.round(clampedX * 10) / 10,
    y: Math.round(clampedY * 10) / 10,
  };
}

function drawStrokePath(
  ctx: CanvasRenderingContext2D,
  color: WhiteboardPenColor,
  width: number,
  points: readonly WhiteboardStrokePoint[],
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function WhiteboardPanel({
  projectId,
  workspace,
  repository,
  currentUser,
  syncRevision = 0,
  isDemoSession,
  onDataMutated,
  onSessionExpired,
}: WhiteboardPanelProps) {
  const [state, setState] = useState<AsyncState<WhiteboardData>>(() =>
    projectId === null
      ? {
          status: 'empty',
          reason: 'No project is linked to this workspace yet.',
        }
      : {
          status: 'loading',
          label: 'Loading team whiteboard...',
        },
  );

  const [penColor, setPenColor] = useState<WhiteboardPenColor>('#30343B');
  const [strokeWidth, setStrokeWidth] = useState<WhiteboardStrokeWidth>(2);
  const [pendingStrokes, setPendingStrokes] = useState<PendingStroke[]>([]);
  const [boardActionBusy, setBoardActionBusy] = useState<
    'undo' | 'clear' | null
  >(null);
  const [confirmClearBoard, setConfirmClearBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState<WhiteboardNoteColor>('yellow');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteFormError, setNoteFormError] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(
    null,
  );
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteActionError, setNoteActionError] = useState<{
    noteId: string;
    message: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<ActiveStrokeDraft | null>(null);
  const pendingSilentRefreshRef = useRef(false);
  const requestSeqRef = useRef(0);
  const boardGenerationRef = useRef(0);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const lastSyncRevisionRef = useRef(syncRevision);

  const fetchWhiteboard = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        boardGenerationRef.current += 1;
        setPendingStrokes([]);
        setBoardActionBusy(null);
        setConfirmClearBoard(false);
        setBoardError(null);
        setConfirmDeleteNoteId(null);
        setDeletingNoteId(null);
        setNoteActionError(null);
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
          label: 'Loading team whiteboard...',
        });
      }

      try {
        const [strokesResult, notesResult] = await Promise.all([
          repository.getWhiteboardStrokes(projectId),
          repository.getWhiteboardNotes(projectId),
        ]);

        if (seq !== requestSeqRef.current) return;

        if (!strokesResult.ok) {
          if (strokesResult.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          if (!silent) {
            setState({
              status: 'error',
              error: strokesResult.error,
            });
          }
          return;
        }

        if (!notesResult.ok) {
          if (notesResult.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          if (!silent) {
            setState({
              status: 'error',
              error: notesResult.error,
            });
          }
          return;
        }

        setState({
          status: 'success',
          data: {
            strokes: strokesResult.data,
            notes: notesResult.data,
          },
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
                  : 'Unable to load the team whiteboard right now.',
              retryable: true,
            },
          });
        }
      }
    },
    [projectId, repository],
  );

  useEffect(() => {
    setNoteContent('');
    setNoteColor('yellow');
    setNoteFormError(null);
    activeStrokeRef.current = null;
    pendingSilentRefreshRef.current = false;
    void fetchWhiteboard({ silent: false });
    return () => {
      requestSeqRef.current += 1;
      boardGenerationRef.current += 1;
    };
  }, [fetchWhiteboard]);

  useEffect(() => {
    if (syncRevision > 0 && syncRevision !== lastSyncRevisionRef.current) {
      lastSyncRevisionRef.current = syncRevision;
      if (activeStrokeRef.current) {
        pendingSilentRefreshRef.current = true;
      } else {
        void fetchWhiteboard({ silent: true });
      }
    } else {
      lastSyncRevisionRef.current = syncRevision;
    }
  }, [syncRevision, fetchWhiteboard]);

  const strokes = state.status === 'success' ? state.data.strokes : [];
  const notes = state.status === 'success' ? state.data.notes : [];
  const isLoading = state.status === 'loading' || state.status === 'idle';

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      drawStrokePath(ctx, stroke.color, stroke.width, stroke.points);
    }

    for (const pending of pendingStrokes) {
      drawStrokePath(ctx, pending.color, pending.width, pending.points);
    }

    if (activeStrokeRef.current) {
      drawStrokePath(
        ctx,
        activeStrokeRef.current.color,
        activeStrokeRef.current.width,
        activeStrokeRef.current.points,
      );
    }
  }, [strokes, pendingStrokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const persistStroke = useCallback(
    async (
      color: WhiteboardPenColor,
      width: WhiteboardStrokeWidth,
      points: WhiteboardStrokePoint[],
    ) => {
      if (projectId === null || points.length < 2) return;

      const capturedProjectId = projectId;
      const capturedGeneration = boardGenerationRef.current;
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setBoardError(null);
      setPendingStrokes((prev) => [
        ...prev,
        { tempId, color, width, points },
      ]);

      try {
        const result = await repository.createWhiteboardStroke({
          projectId,
          authorId: currentUser?.id ?? '',
          authorName: currentUser?.displayName ?? 'Studio Member',
          color,
          width,
          points,
        });

        if (
          activeProjectIdRef.current !== capturedProjectId ||
          boardGenerationRef.current !== capturedGeneration
        ) {
          return;
        }

        setPendingStrokes((prev) => prev.filter((item) => item.tempId !== tempId));

        if (!result.ok) {
          if (result.error.code === 'auth') {
            onSessionExpiredRef.current?.();
            return;
          }
          setBoardError(result.error.message);
          return;
        }

        setState((prev) => {
          if (prev.status !== 'success') return prev;
          return {
            status: 'success',
            data: {
              ...prev.data,
              strokes: [...prev.data.strokes, result.data],
            },
          };
        });
        onDataMutated?.('whiteboard');
      } catch (err) {
        if (
          activeProjectIdRef.current !== capturedProjectId ||
          boardGenerationRef.current !== capturedGeneration
        ) {
          return;
        }
        setPendingStrokes((prev) => prev.filter((item) => item.tempId !== tempId));
        setBoardError(
          err instanceof Error
            ? err.message
            : 'Could not save sketch stroke right now.',
        );
      }
    },
    [
      projectId,
      repository,
      currentUser?.id,
      currentUser?.displayName,
      onDataMutated,
    ],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (projectId === null || boardActionBusy === 'clear') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const startPoint = mapPointerToCanvas(event, canvas);
    activeStrokeRef.current = {
      pointerId: event.pointerId,
      color: penColor,
      width: strokeWidth,
      points: [startPoint],
    };

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture errors in synthetic test environments.
    }

    redrawCanvas();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const nextPoint = mapPointerToCanvas(event, canvas);
    const lastPoint = active.points[active.points.length - 1];
    const dist = lastPoint
      ? Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y)
      : 999;

    if (active.points.length === 1 && dist >= 0.2) {
      active.points.push(nextPoint);
      redrawCanvas();
    } else if (dist >= 1.5) {
      active.points.push(nextPoint);
      redrawCanvas();
    }
  };

  const finishActiveStroke = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    cancelled: boolean,
  ) => {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;

    const canvas = canvasRef.current;
    if (canvas && !cancelled) {
      const endPoint = mapPointerToCanvas(event, canvas);
      const lastPoint = active.points[active.points.length - 1];
      if (
        lastPoint &&
        Math.hypot(endPoint.x - lastPoint.x, endPoint.y - lastPoint.y) >= 0.5
      ) {
        active.points.push(endPoint);
      }
    }

    if (canvas) {
      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore release errors when pointer capture was not active.
      }
    }

    const completed = activeStrokeRef.current;
    activeStrokeRef.current = null;
    redrawCanvas();

    if (!cancelled && completed && completed.points.length >= 2) {
      void persistStroke(completed.color, completed.width, completed.points);
    }

    if (pendingSilentRefreshRef.current) {
      pendingSilentRefreshRef.current = false;
      void fetchWhiteboard({ silent: true });
    }
  };

  const handleUndoStroke = async () => {
    if (boardActionBusy || strokes.length === 0) return;

    const targetStroke =
      [...strokes]
        .reverse()
        .find((stroke) => currentUser?.id && stroke.authorId === currentUser.id) ??
      strokes[strokes.length - 1];

    if (!targetStroke) return;

    const capturedProjectId = projectId;
    const capturedGeneration = boardGenerationRef.current;
    setBoardError(null);
    setBoardActionBusy('undo');

    try {
      const result = await repository.deleteWhiteboardStroke(targetStroke.id);
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setBoardActionBusy(null);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setBoardError(result.error.message);
        return;
      }

      setState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: {
            ...prev.data,
            strokes: prev.data.strokes.filter(
              (item) => item.id !== targetStroke.id,
            ),
          },
        };
      });
      onDataMutated?.('whiteboard');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setBoardActionBusy(null);
      setBoardError(
        err instanceof Error
          ? err.message
          : 'Could not undo the last stroke right now.',
      );
    }
  };

  const handleConfirmClearBoard = async () => {
    if (projectId === null || boardActionBusy) return;

    const capturedProjectId = projectId;
    const capturedGeneration = boardGenerationRef.current;
    setBoardError(null);
    setBoardActionBusy('clear');

    try {
      const result = await repository.clearWhiteboardStrokes(projectId);
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setBoardActionBusy(null);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setBoardError(result.error.message);
        return;
      }

      setConfirmClearBoard(false);
      setState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: {
            ...prev.data,
            strokes: [],
          },
        };
      });
      onDataMutated?.('whiteboard');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setBoardActionBusy(null);
      setBoardError(
        err instanceof Error
          ? err.message
          : 'Could not clear whiteboard strokes right now.',
      );
    }
  };

  const handleNoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectId === null || noteSubmitting) return;

    const trimmed = noteContent.trim();
    if (!trimmed) {
      setNoteFormError('Write a sticky note message before posting.');
      return;
    }

    const capturedProjectId = projectId;
    const capturedGeneration = boardGenerationRef.current;
    setNoteFormError(null);
    setNoteSubmitting(true);

    try {
      const result = await repository.createWhiteboardNote({
        projectId,
        authorId: currentUser?.id ?? '',
        authorName: currentUser?.displayName ?? 'Studio Member',
        content: trimmed,
        color: noteColor,
      });

      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setNoteSubmitting(false);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setNoteFormError(result.error.message);
        return;
      }

      setNoteContent('');
      setState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: {
            ...prev.data,
            notes: [...prev.data.notes, result.data],
          },
        };
      });
      onDataMutated?.('whiteboard');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setNoteSubmitting(false);
      setNoteFormError(
        err instanceof Error
          ? err.message
          : 'Could not post sticky note right now.',
      );
    }
  };

  const handleConfirmDeleteNote = async (noteId: string) => {
    if (deletingNoteId) return;

    const capturedProjectId = projectId;
    const capturedGeneration = boardGenerationRef.current;
    setNoteActionError(null);
    setDeletingNoteId(noteId);

    try {
      const result = await repository.deleteWhiteboardNote(noteId);
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }

      setDeletingNoteId(null);

      if (!result.ok) {
        if (result.error.code === 'auth') {
          onSessionExpiredRef.current?.();
          return;
        }
        setNoteActionError({
          noteId,
          message: result.error.message,
        });
        return;
      }

      setConfirmDeleteNoteId(null);
      setState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: {
            ...prev.data,
            notes: prev.data.notes.filter((note) => note.id !== noteId),
          },
        };
      });
      onDataMutated?.('whiteboard');
    } catch (err) {
      if (
        activeProjectIdRef.current !== capturedProjectId ||
        boardGenerationRef.current !== capturedGeneration
      ) {
        return;
      }
      setDeletingNoteId(null);
      setNoteActionError({
        noteId,
        message:
          err instanceof Error
            ? err.message
            : 'Could not delete sticky note right now.',
      });
    }
  };

  return (
    <div data-testid="whiteboard-panel" className="flex flex-col gap-5">
      <PanelContextHeader
        classCode={workspace.classCode}
        teamName={workspace.teamName}
        variant="text"
        isDemoSession={isDemoSession}
        refreshDisabled={isLoading}
        onRefresh={() => void fetchWhiteboard({ silent: false })}
      />

      {isLoading ? (
        <PanelLoadingSkeleton
          statusText="Loading team whiteboard..."
          blocks={WHITEBOARD_SKELETON_BLOCKS}
        />
      ) : state.status === 'error' ? (
        <PanelErrorCard
          heading="Could not load team whiteboard"
          message={state.error.message}
          onRetry={() => void fetchWhiteboard({ silent: false })}
        />
      ) : state.status === 'empty' ? (
        <PanelEmptyCard
          heading="No linked project"
          message={state.reason}
        />
      ) : (
        <>
          <section
            aria-labelledby="whiteboard-sketch-heading"
            className="surface-card flex flex-col gap-3 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                id="whiteboard-sketch-heading"
                className="m-0 text-[15px] font-semibold text-[var(--color-text-charcoal)]"
              >
                Shared Sketch Pad
              </h3>
              <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                {strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Pen color"
                className="flex flex-wrap items-center gap-1.5"
              >
                {PEN_COLOR_OPTIONS.map((option) => {
                  const isSelected = penColor === option.color;
                  return (
                    <button
                      key={option.color}
                      type="button"
                      aria-label={`Pen color: ${option.label}`}
                      aria-pressed={isSelected}
                      data-testid={`whiteboard-color-${option.testIdSuffix}`}
                      onClick={() => setPenColor(option.color)}
                      className={
                        isSelected
                          ? 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] border-2 border-[var(--color-text-charcoal)] bg-[var(--color-surface-secondary)] p-2'
                          : 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] border border-[var(--color-border-control)] bg-[var(--color-surface-primary)] p-2 hover:bg-[var(--color-surface-secondary)]'
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 rounded-full border border-[var(--color-border-subtle)]"
                        style={{ backgroundColor: option.color }}
                      />
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Stroke width"
                className="flex flex-wrap items-center gap-1.5"
              >
                {STROKE_WIDTH_OPTIONS.map((option) => {
                  const isSelected = strokeWidth === option.width;
                  return (
                    <button
                      key={option.width}
                      type="button"
                      aria-pressed={isSelected}
                      data-testid={`whiteboard-width-${option.width}`}
                      onClick={() => setStrokeWidth(option.width)}
                      className={
                        isSelected
                          ? 'inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] border border-[var(--color-accent-sage-strong)] bg-[var(--color-accent-sage-strong)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-inverse)]'
                          : 'inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] border border-[var(--color-border-control)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)]'
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              data-testid="whiteboard-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              aria-label="Team whiteboard sketch canvas"
              className="w-full aspect-[480/260] cursor-crosshair touch-none rounded-[10px] border border-[var(--color-border-control)] bg-[#FFFFFF]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => finishActiveStroke(event, false)}
              onPointerCancel={(event) => finishActiveStroke(event, true)}
            />

            <p className="m-0 text-[12px] text-[var(--color-text-secondary)]">
              {strokes.length === 0
                ? 'No strokes drawn yet. Drag across the pad above to sketch with your team.'
                : 'Drag across the pad above to add a stroke. Strokes save automatically on release.'}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                data-testid="whiteboard-undo-btn"
                className="btn-secondary"
                disabled={strokes.length === 0 || boardActionBusy !== null}
                onClick={() => void handleUndoStroke()}
              >
                {boardActionBusy === 'undo' ? 'Undoing...' : 'Undo last'}
              </button>

              {!confirmClearBoard ? (
                <button
                  type="button"
                  data-testid="whiteboard-clear-btn"
                  className="btn-ghost text-[var(--color-status-error-text)]"
                  disabled={strokes.length === 0 || boardActionBusy !== null}
                  onClick={() => {
                    setBoardError(null);
                    setConfirmClearBoard(true);
                  }}
                >
                  Clear board
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium text-[var(--color-status-error-text)]">
                    Clear all strokes?
                  </span>
                  <button
                    type="button"
                    data-testid="whiteboard-clear-confirm-btn"
                    disabled={boardActionBusy !== null}
                    onClick={() => void handleConfirmClearBoard()}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[13px] font-medium text-[var(--color-status-error-text)] hover:bg-[#F5DFDD]"
                  >
                    {boardActionBusy === 'clear'
                      ? 'Clearing...'
                      : 'Confirm clear'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={boardActionBusy !== null}
                    onClick={() => setConfirmClearBoard(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {boardError && (
              <div
                role="alert"
                className="rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-error-text)]"
              >
                {boardError}
              </div>
            )}
          </section>

          <section
            aria-labelledby="whiteboard-notes-heading"
            className="flex flex-col gap-3"
          >
            <h3
              id="whiteboard-notes-heading"
              className="m-0 text-[15px] font-semibold text-[var(--color-text-charcoal)]"
            >
              Team Sticky Notes
            </h3>

            <form
              onSubmit={(event) => void handleNoteSubmit(event)}
              className="surface-card flex flex-col gap-3 p-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="whiteboard-note-input"
                  className="text-[12px] font-medium text-[var(--color-text-secondary)]"
                >
                  Sticky note message
                </label>
                <textarea
                  id="whiteboard-note-input"
                  data-testid="whiteboard-note-input"
                  rows={2}
                  className="control-input"
                  placeholder="Share a quick idea, reminder, or sketch note..."
                  value={noteContent}
                  disabled={noteSubmitting}
                  onChange={(event) => {
                    setNoteContent(event.target.value);
                    if (noteFormError) setNoteFormError(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Note tint
                </span>
                <div
                  role="group"
                  aria-label="Sticky note color"
                  className="flex flex-wrap gap-2"
                >
                  {NOTE_COLOR_OPTIONS.map((option) => {
                    const isSelected = noteColor === option.color;
                    return (
                      <button
                        key={option.color}
                        type="button"
                        aria-pressed={isSelected}
                        data-testid={`whiteboard-note-color-${option.color}`}
                        onClick={() => setNoteColor(option.color)}
                        className={
                          isSelected
                            ? 'inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border-2 border-[var(--color-text-charcoal)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-primary)]'
                            : 'inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border border-[var(--color-border-control)] bg-[var(--color-surface-primary)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
                        }
                      >
                        <span
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 rounded-full border ${option.chipClass}`}
                        />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {noteFormError && (
                <div
                  role="alert"
                  className="rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-3 py-2 text-[12px] font-medium text-[var(--color-status-error-text)]"
                >
                  {noteFormError}
                </div>
              )}

              <button
                type="submit"
                data-testid="whiteboard-note-submit-btn"
                className="btn-primary w-fit"
                disabled={noteSubmitting}
              >
                {noteSubmitting ? 'Posting note...' : 'Post Note'}
              </button>
            </form>

            {notes.length === 0 ? (
              <PanelEmptyCard
                heading="No sticky notes yet"
                message="No sticky notes are pinned to this board yet. Write a note above to share ideas with your team."
              />
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                {notes.map((note) => {
                  const noteStyle = getNoteStyle(note.color);
                  const createdLabel = formatDisplayDate(
                    note.createdAt,
                    'datetime',
                  );
                  const isConfirming = confirmDeleteNoteId === note.id;
                  const isDeletingThis = deletingNoteId === note.id;
                  const thisError =
                    noteActionError?.noteId === note.id
                      ? noteActionError.message
                      : null;

                  return (
                    <li
                      key={note.id}
                      data-testid={`whiteboard-note-item-${note.id}`}
                      className={`flex flex-col justify-between gap-3 rounded-[10px] border p-3.5 shadow-[var(--shadow-subtle)] ${noteStyle.cardClass}`}
                    >
                      <p className="m-0 whitespace-pre-line break-words text-[13px] leading-relaxed text-[var(--color-text-primary)]">
                        {note.content}
                      </p>

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[var(--color-text-secondary)]">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {note.authorName}
                          </span>
                          {createdLabel && <span>{createdLabel}</span>}
                        </div>

                        {!isConfirming ? (
                          <button
                            type="button"
                            data-testid={`whiteboard-note-delete-btn-${note.id}`}
                            disabled={deletingNoteId !== null}
                            onClick={() => {
                              setNoteActionError(null);
                              setConfirmDeleteNoteId(note.id);
                            }}
                            className="btn-ghost w-fit px-2 text-[12px] text-[var(--color-status-error-text)] hover:bg-[#FFFFFF]/60"
                          >
                            Delete
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              data-testid={`whiteboard-note-delete-confirm-btn-${note.id}`}
                              disabled={isDeletingThis}
                              onClick={() => void handleConfirmDeleteNote(note.id)}
                              className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-status-error-text)] hover:bg-[#F5DFDD]"
                            >
                              {isDeletingThis ? 'Deleting...' : 'Confirm delete'}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-2 text-[12px]"
                              disabled={isDeletingThis}
                              onClick={() => setConfirmDeleteNoteId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {thisError && (
                          <div
                            role="alert"
                            className="rounded-[8px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-status-error-text)]"
                          >
                            {thisError}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
