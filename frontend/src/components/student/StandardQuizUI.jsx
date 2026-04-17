import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

function StandardQuizUI({
  question,
  questionNumber,
  totalQuestions,
  correctAnswersCount = 0,
  isSubmitting,
  onSelectAnswer,
  onAnswerAnimationComplete,
  timeLimitSeconds = 30
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

  const imageUrl = resolveMediaUrl(question?.imageUrl);
  const audioUrl = resolveMediaUrl(question?.audioUrl);

  const timerProgress = useMemo(() => {
    if (!timeLimitSeconds) return 0;
    return Math.max(0, Math.min(100, (timeLeft / timeLimitSeconds) * 100));
  }, [timeLeft, timeLimitSeconds]);

  const quizProgress = useMemo(() => {
    if (!totalQuestions) return 0;
    return Math.max(0, Math.min(100, ((questionNumber - 1) / totalQuestions) * 100));
  }, [questionNumber, totalQuestions]);

  const answerTileClass = [
    'from-fuchsia-500 to-pink-600 border-fuchsia-300/70',
    'from-cyan-500 to-sky-600 border-cyan-300/70',
    'from-emerald-500 to-teal-600 border-emerald-300/70',
    'from-amber-400 to-orange-500 border-amber-200/80'
  ];

  const accuracy = useMemo(() => {
    if (!questionNumber || questionNumber <= 1) return 100;
    return Math.max(0, Math.min(100, Math.round((correctAnswersCount / (questionNumber - 1)) * 100)));
  }, [correctAnswersCount, questionNumber]);

  const projectedRank = useMemo(() => {
    if (accuracy >= 90) return '#1';
    if (accuracy >= 75) return '#2';
    if (accuracy >= 60) return '#3';
    return '#4+';
  }, [accuracy]);

  if (!question) return null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.55)]">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 top-16 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative mb-6 rounded-3xl border border-white/15 bg-slate-900/65 p-4 text-white backdrop-blur-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200/85">Quiz Progress</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-700/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${quizProgress}%` }}
              />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              Question {questionNumber} / {totalQuestions}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200/85">Kahoot Timer</p>
              <p className="text-sm font-black text-white">{timeLeft}s</p>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-700/80">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  timeLeft <= 7
                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-lime-500'
                }`}
                style={{ width: `${timerProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-300">Answer quickly to secure higher rank.</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200/85">Leaderboard Indicator</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="text-2xl font-black text-white">{projectedRank}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-300">Accuracy: {accuracy}% • Correct: {correctAnswersCount}</p>
          </div>
        </div>
      </div>

      <h2 className="relative mb-4 text-3xl font-black leading-tight text-white">{question.questionText}</h2>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Quiz media"
          className="mb-4 max-h-72 w-full rounded-2xl border border-white/20 object-cover shadow-[0_16px_36px_rgba(8,145,178,0.25)]"
        />
      )}

      {audioUrl && (
        <div className="mb-5 rounded-2xl border border-white/20 bg-slate-900/50 p-3">
          <p className="mb-2 text-sm font-semibold text-cyan-100">Audio prompt</p>
          <audio controls className="w-full" src={audioUrl} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const showCorrect = feedbackState === 'correct' && isSelected;
          const showWrong = feedbackState === 'wrong' && isSelected;
          const colorClass = showCorrect
            ? 'from-emerald-500 to-lime-500 border-emerald-200/80'
            : showWrong
            ? 'from-rose-500 to-red-600 border-rose-200/80'
            : answerTileClass[index] || answerTileClass[0];

          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={isInteractionLocked}
              onClick={() => handleAnswerCommit(option, { selectedIndex: index })}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-4 text-left text-base font-bold text-white shadow-[0_12px_24px_rgba(2,6,23,0.35)] transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 ${
                colorClass
              } ${isSelected ? 'ring-2 ring-white/80' : ''}`}
            >
              <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/25 blur-lg transition-opacity duration-300 group-hover:opacity-90" />
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-sm font-black ring-2 ring-white/20">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {isSubmitting && (
        <p className="mt-4 text-center text-sm font-semibold text-cyan-100">Submitting answer...</p>
      )}

      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(125,211,252,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
    </div>
  );
}

export default StandardQuizUI;
