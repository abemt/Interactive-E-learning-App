import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

const DROP_ZONE_ID = 'puzzle-drop-zone';

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

function PuzzlePiece({
  id,
  label,
  index,
  disabled,
  isRejected,
  stateClass,
  onChoose
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { index },
    disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${stateClass} ${
        disabled ? 'opacity-75' : 'cursor-grab hover:-translate-y-0.5 hover:shadow'
      } ${isDragging ? 'opacity-60' : ''} ${isRejected ? 'animate-bounce' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">🧩</span>
        <p className="text-sm font-bold text-slate-800">
          <span className="mr-2 text-xs font-black text-slate-500">{index + 1}</span>
          {label}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onChoose(index)}
        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Place
      </button>
    </div>
  );
}

function PuzzleQuizUI({
  question,
  questionNumber,
  totalQuestions,
  correctAnswersCount = 0,
  isSubmitting,
  onSelectAnswer,
  onAnswerAnimationComplete,
  timeLimitSeconds = 45
}) {
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [feedbackState, setFeedbackState] = useState('idle');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [rejectedId, setRejectedId] = useState(null);

  const timeoutSubmittedRef = useRef(false);
  const feedbackTimerRef = useRef(null);
  const rejectionTimerRef = useRef(null);

  const isInteractionLocked = isSubmitting || feedbackState !== 'idle';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({ id: DROP_ZONE_ID });
  const isDropTargetActive = Boolean(isOver) && !isInteractionLocked;

  const activeIndex = useMemo(() => {
    if (!activeId) return null;
    const index = Number(String(activeId).replace('piece-', ''));
    return Number.isInteger(index) ? index : null;
  }, [activeId]);

  const activeOption =
    Number.isInteger(activeIndex) && Array.isArray(question?.options)
      ? question.options[activeIndex]
      : null;

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }

      if (rejectionTimerRef.current) {
        window.clearTimeout(rejectionTimerRef.current);
        rejectionTimerRef.current = null;
      }
    };
  }, []);

  const handleAnswerCommit = useCallback(
    async (selectedAnswer, meta = {}) => {
      if (!question || isInteractionLocked) {
        return { ok: false };
      }

      if (Number.isInteger(meta.selectedIndex)) {
        setSelectedIndex(meta.selectedIndex);
      }

      setFeedbackState('checking');
      const result = await onSelectAnswer(selectedAnswer, meta);

      if (!result?.ok) {
        setFeedbackState('idle');
        setSelectedIndex(null);
        return result;
      }

      const isCorrect = result.isCorrect === true;
      setFeedbackState(isCorrect ? 'correct' : 'wrong');

      feedbackTimerRef.current = window.setTimeout(() => {
        feedbackTimerRef.current = null;
        onAnswerAnimationComplete?.();
      }, 1000);

      return result;
    },
    [isInteractionLocked, onAnswerAnimationComplete, onSelectAnswer, question]
  );

  useEffect(() => {
    if (!question || isInteractionLocked || timeoutSubmittedRef.current) {
      return undefined;
    }

    if (timeLeft <= 0) {
      timeoutSubmittedRef.current = true;
      const timeoutCommit = window.setTimeout(() => {
        void handleAnswerCommit('No Answer', {
          timedOut: true,
          timeTakenSeconds: timeLimitSeconds
        });
      }, 0);

      return () => window.clearTimeout(timeoutCommit);
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [handleAnswerCommit, isInteractionLocked, question, timeLeft, timeLimitSeconds]);

  const timerProgress = useMemo(() => {
    if (!timeLimitSeconds) return 0;
    return Math.max(0, Math.min(100, (timeLeft / timeLimitSeconds) * 100));
  }, [timeLeft, timeLimitSeconds]);

  const quizProgress = useMemo(() => {
    if (!totalQuestions) return 0;
    return Math.max(0, Math.min(100, ((questionNumber - 1) / totalQuestions) * 100));
  }, [questionNumber, totalQuestions]);

  const imageUrl = resolveMediaUrl(question?.imageUrl);
  const audioUrl = resolveMediaUrl(question?.audioUrl);

  const handleDragStart = (event) => {
    if (isInteractionLocked) return;
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event) => {
    if (isInteractionLocked) {
      setActiveId(null);
      return;
    }

    const { active, over } = event;
    setActiveId(null);

    if (!over || over.id !== DROP_ZONE_ID) {
      return;
    }

    const draggedIndex = active?.data?.current?.index;
    if (!Number.isInteger(draggedIndex) || !question?.options?.[draggedIndex]) {
      return;
    }

    const option = question.options[draggedIndex];
    const result = await handleAnswerCommit(option, {
      selectedIndex: draggedIndex,
      interaction: 'drag'
    });

    if (result?.ok && result.isCorrect === false) {
      setRejectedId(active.id);
      if (rejectionTimerRef.current) {
        window.clearTimeout(rejectionTimerRef.current);
      }
      rejectionTimerRef.current = window.setTimeout(() => {
        rejectionTimerRef.current = null;
        setRejectedId(null);
      }, 500);
    }
  };

  if (!question) return null;

  return (
    <div className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-sky-50 to-teal-50 p-5 shadow-xl">
      <div className="mb-5 rounded-3xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
            Puzzle Builder
          </p>
          <p className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
            Question {questionNumber} of {totalQuestions}
          </p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-500 transition-all duration-500"
            style={{ width: `${quizProgress}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Time</span>
          <span>{timeLeft}s</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              timeLeft <= 8
                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      <h2 className="text-3xl font-black leading-tight text-slate-900">{question.questionText}</h2>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Drag the matching piece into the puzzle board.
      </p>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Puzzle media"
          className="mt-4 max-h-64 w-full rounded-2xl border border-white object-cover shadow"
        />
      )}

      {audioUrl && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-700">Audio prompt</p>
          <audio controls className="w-full" src={audioUrl} />
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}
      >
        <div
          ref={setDropZoneRef}
          className={`mt-6 rounded-[2rem] border-2 border-dashed px-6 py-10 text-center transition ${
            feedbackState === 'correct'
              ? 'border-emerald-300 bg-emerald-100'
              : feedbackState === 'wrong'
              ? 'border-rose-300 bg-rose-100'
              : isDropTargetActive
              ? 'border-indigo-400 bg-indigo-100/80'
              : 'border-indigo-200 bg-white/80'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Puzzle Board</p>
          <p className="mt-3 text-lg font-bold text-slate-700">
            {feedbackState === 'correct'
              ? 'Perfect fit!'
              : feedbackState === 'wrong'
              ? 'Not quite. Try the next one.'
              : activeOption
              ? 'Release to lock the piece'
              : 'Drop the best piece here'}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {question.options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const pieceStateClass =
              feedbackState === 'correct' && isSelected
                ? 'border-emerald-300 bg-emerald-100'
                : feedbackState === 'wrong' && isSelected
                ? 'border-rose-300 bg-rose-100'
                : 'border-slate-200 bg-white';

            return (
              <PuzzlePiece
                key={`piece-${index}`}
                id={`piece-${index}`}
                label={option}
                index={index}
                disabled={isInteractionLocked}
                isRejected={rejectedId === `piece-${index}`}
                stateClass={pieceStateClass}
                onChoose={(choiceIndex) => {
                  void handleAnswerCommit(question.options[choiceIndex], {
                    selectedIndex: choiceIndex,
                    interaction: 'tap'
                  });
                }}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeOption ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-lg">
              {activeOption}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isSubmitting && (
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">Submitting answer...</p>
      )}

      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Correct so far: {correctAnswersCount}
      </p>
    </div>
  );
}

export default PuzzleQuizUI;