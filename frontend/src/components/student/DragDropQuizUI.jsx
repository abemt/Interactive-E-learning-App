import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

function DragDropQuizUI({
  question,
  questionNumber,
  totalQuestions,
  correctAnswersCount = 0,
  isSubmitting,
  onSelectAnswer,
  onAnswerAnimationComplete,
  timeLimitSeconds = 40
}) {
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [feedbackState, setFeedbackState] = useState('idle');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);

  const timeoutSubmittedRef = useRef(false);
  const feedbackTimerRef = useRef(null);

  const isInteractionLocked = isSubmitting || feedbackState !== 'idle';

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
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

  const handleDrop = async () => {
    if (isInteractionLocked || draggedIndex === null || !question?.options?.[draggedIndex]) {
      return;
    }

    setIsDropTargetActive(false);
    const option = question.options[draggedIndex];
    await handleAnswerCommit(option, { selectedIndex: draggedIndex });
  };

  if (!question) return null;

  return (
    <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 p-5 shadow-xl">
      <div className="mb-5 rounded-3xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
            Drag-and-Drop Arena
          </p>
          <p className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
            Question {questionNumber} of {totalQuestions}
          </p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 transition-all duration-500"
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
              timeLeft <= 8 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-lime-500'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      <h2 className="text-3xl font-black leading-tight text-slate-900">{question.questionText}</h2>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Drag an option card into the drop zone, or tap Choose on mobile.
      </p>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Quiz media"
          className="mt-4 max-h-64 w-full rounded-2xl border border-white object-cover shadow"
        />
      )}

      {audioUrl && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-700">Audio prompt</p>
          <audio controls className="w-full" src={audioUrl} />
        </div>
      )}

      <div
        className={`mt-5 rounded-3xl border-2 border-dashed p-5 text-center transition ${
          feedbackState === 'correct'
            ? 'border-emerald-300 bg-emerald-100'
            : feedbackState === 'wrong'
            ? 'border-rose-300 bg-rose-100'
            : isDropTargetActive
            ? 'border-cyan-400 bg-cyan-100/80'
            : 'border-cyan-200 bg-white/80'
        }`}
        onDragOver={(event) => {
          if (isInteractionLocked) return;
          event.preventDefault();
          setIsDropTargetActive(true);
        }}
        onDragLeave={() => setIsDropTargetActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          void handleDrop();
        }}
      >
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Drop Zone</p>
        <p className="mt-2 text-lg font-bold text-slate-700">
          {feedbackState === 'correct'
            ? 'Correct answer submitted'
            : feedbackState === 'wrong'
            ? 'Answer submitted'
            : draggedIndex === null
            ? 'Drag a card here'
            : 'Release to submit'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const cardStateClass =
            feedbackState === 'correct' && isSelected
              ? 'border-emerald-300 bg-emerald-100'
              : feedbackState === 'wrong' && isSelected
              ? 'border-rose-300 bg-rose-100'
              : 'border-slate-200 bg-white';

          return (
            <div
              key={`${option}-${index}`}
              draggable={!isInteractionLocked}
              onDragStart={() => {
                if (isInteractionLocked) return;
                setDraggedIndex(index);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setIsDropTargetActive(false);
              }}
              className={`rounded-2xl border p-4 shadow-sm transition ${cardStateClass} ${
                isInteractionLocked ? 'opacity-75' : 'cursor-grab hover:-translate-y-0.5 hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-bold text-slate-800">
                  <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </p>
                <button
                  type="button"
                  disabled={isInteractionLocked}
                  onClick={() => {
                    void handleAnswerCommit(option, { selectedIndex: index });
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Choose
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isSubmitting && (
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">Submitting answer...</p>
      )}

      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Correct so far: {correctAnswersCount}
      </p>
    </div>
  );
}

export default DragDropQuizUI;
