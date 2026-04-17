import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

function shufflePieces(items = []) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function PuzzleQuizUI({
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

  const puzzlePieces = useMemo(() => {
    const options = Array.isArray(question?.options) ? question.options : [];
    const pieces = options.map((option, index) => ({
      option,
      originalIndex: index,
      pieceLabel: String.fromCharCode(65 + index)
    }));

    return shufflePieces(pieces);
  }, [question]);

  const imageUrl = resolveMediaUrl(question?.imageUrl);
  const audioUrl = resolveMediaUrl(question?.audioUrl);

  if (!question) return null;

  return (
    <div className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 p-5 shadow-xl">
      <div className="mb-5 rounded-3xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full bg-violet-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
            Puzzle Challenge
          </p>
          <p className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
            Question {questionNumber} of {totalQuestions}
          </p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 transition-all duration-500"
            style={{ width: `${quizProgress}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Timer</span>
          <span>{timeLeft}s</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              timeLeft <= 8 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      <h2 className="text-3xl font-black leading-tight text-slate-900">{question.questionText}</h2>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Solve the board by choosing the puzzle piece with the correct answer.
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

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {puzzlePieces.map((piece) => {
          const isSelected = selectedIndex === piece.originalIndex;
          const tileClass =
            feedbackState === 'correct' && isSelected
              ? 'border-emerald-300 bg-emerald-100'
              : feedbackState === 'wrong' && isSelected
              ? 'border-rose-300 bg-rose-100'
              : 'border-violet-200 bg-white';

          return (
            <button
              key={`${piece.option}-${piece.originalIndex}`}
              type="button"
              disabled={isInteractionLocked}
              onClick={() => {
                void handleAnswerCommit(piece.option, { selectedIndex: piece.originalIndex });
              }}
              className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-70 ${tileClass}`}
              style={{
                clipPath: 'polygon(6% 0, 94% 0, 100% 18%, 100% 82%, 94% 100%, 6% 100%, 0 82%, 0 18%)'
              }}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                Piece {piece.pieceLabel}
              </p>
              <p className="mt-2 text-base font-bold text-slate-800">{piece.option}</p>
            </button>
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

export default PuzzleQuizUI;
