import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

function YoungLearnerStandardQuizUI({
  question,
  questionNumber,
  totalQuestions,
  correctAnswersCount = 0,
  isSubmitting,
  onSelectAnswer,
  onAnswerAnimationComplete,
  timeLimitSeconds = 35
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

  const imageUrl = resolveMediaUrl(question?.imageUrl);
  const audioUrl = resolveMediaUrl(question?.audioUrl);

  const optionTileClass = [
    'border-rose-200 bg-rose-50',
    'border-sky-200 bg-sky-50',
    'border-emerald-200 bg-emerald-50',
    'border-amber-200 bg-amber-50'
  ];

  if (!question) return null;

  return (
    <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-xl">
      <div className="mb-5 rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full bg-sky-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
            Standard Practice
          </p>
          <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Question {questionNumber} of {totalQuestions}
          </p>
        </div>

        <div className="space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${quizProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Time Left</p>
            <p className="text-sm font-black text-slate-700">{timeLeft}s</p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                timeLeft <= 8 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-lime-500'
              }`}
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
        {question.questionText}
      </h2>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Pick the best answer. Keep an eye on the timer.
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

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const showCorrect = feedbackState === 'correct' && isSelected;
          const showWrong = feedbackState === 'wrong' && isSelected;
          const tileClass = showCorrect
            ? 'border-emerald-300 bg-emerald-100'
            : showWrong
            ? 'border-rose-300 bg-rose-100'
            : optionTileClass[index] || optionTileClass[0];

          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={isInteractionLocked}
              onClick={() => handleAnswerCommit(option, { selectedIndex: index })}
              className={`rounded-2xl border px-4 py-4 text-left text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-70 ${tileClass} ${
                isSelected ? 'ring-2 ring-slate-300' : ''
              }`}
            >
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-black text-slate-700 shadow-sm">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
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

export default YoungLearnerStandardQuizUI;
