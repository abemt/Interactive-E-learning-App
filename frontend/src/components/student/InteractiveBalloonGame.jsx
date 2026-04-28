import { useEffect, useRef, useState } from 'react';

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

const balloonPalette = [
  'from-pink-400 to-rose-500',
  'from-sky-400 to-cyan-500',
  'from-emerald-400 to-green-500',
  'from-amber-400 to-orange-500'
];

const balloonPositions = [
  { left: '18%', top: '64%', scale: '1.02' },
  { left: '42%', top: '54%', scale: '1' },
  { left: '66%', top: '63%', scale: '1.04' },
  { left: '84%', top: '50%', scale: '0.98' }
];

function playToneSequence(type) {
  if (typeof window === 'undefined') return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const masterGain = context.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(context.destination);

  const scheduleTone = (frequency, startTime, duration, waveType, gainValue = 0.9) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  };

  const start = context.currentTime + 0.01;

  if (type === 'correct') {
    scheduleTone(523.25, start, 0.16, 'sine', 0.85);
    scheduleTone(659.25, start + 0.14, 0.2, 'sine', 0.9);
    scheduleTone(783.99, start + 0.28, 0.24, 'triangle', 0.75);
  } else {
    scheduleTone(160, start, 0.16, 'square', 0.7);
    scheduleTone(120, start + 0.1, 0.18, 'square', 0.65);
  }

  setTimeout(() => {
    context.close().catch(() => {});
  }, 900);
}

function InteractiveBalloonGame({
  question,
  questionNumber,
  totalQuestions,
  correctAnswersCount = 0,
  isSubmitting,
  onSelectAnswer,
  onAnswerAnimationComplete
}) {
  const [feedbackState, setFeedbackState] = useState('idle');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const feedbackTimerRef = useRef(null);

  const imageUrl = resolveMediaUrl(question?.imageUrl);
  const audioUrl = resolveMediaUrl(question?.audioUrl);
  const progressPercent = totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;
  const rocketLeft = Math.min(92, 8 + progressPercent * 0.84);

  useEffect(() => {
    setFeedbackState('idle');
    setSelectedIndex(null);

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [question?.id]);

  if (!question) return null;

  const handleBalloonClick = async (option, index) => {
    if (isSubmitting || feedbackState !== 'idle') return;

    setSelectedIndex(index);
    setFeedbackState('checking');

    const result = await onSelectAnswer(option, { selectedIndex: index });

    if (!result?.ok) {
      setFeedbackState('idle');
      setSelectedIndex(null);
      return;
    }

    const isCorrect = result.isCorrect === true;
    const shouldAnimateXp = result?.shouldAnimateXp !== false;
    setFeedbackState(isCorrect && shouldAnimateXp ? 'correct' : isCorrect ? 'correctNoXp' : 'wrong');

    if (!isCorrect || shouldAnimateXp) {
      playToneSequence(isCorrect ? 'correct' : 'wrong');
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;

      onAnswerAnimationComplete?.();
    }, 1000);
  };

  const isLocked = isSubmitting || feedbackState !== 'idle';

  return (
    <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50 p-5 shadow-2xl">
      <div className="mb-5 rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm">
            Balloon Quest
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            Grade 1-4 Mini-Game
          </div>
        </div>

        <div className="relative h-20 overflow-hidden rounded-full border border-sky-100 bg-gradient-to-r from-sky-100 via-cyan-50 to-emerald-100 px-4 py-3 shadow-inner">
          <div className="absolute inset-x-4 top-1/2 h-5 -translate-y-1/2 rounded-full bg-white/70 shadow-inner" />
          <div
            className="absolute left-4 top-1/2 h-5 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-[68%] text-3xl drop-shadow-md transition-[left] duration-700 ease-out"
            style={{ left: `calc(${rocketLeft}% )` }}
            aria-hidden="true"
          >
            🚀
          </div>
          <div
            className="absolute right-4 top-1/2 -translate-y-[64%] text-3xl drop-shadow-md"
            aria-hidden="true"
          >
            🏁
          </div>
          <div className="absolute inset-x-4 top-2 flex justify-between text-[10px] font-black uppercase tracking-[0.3em] text-sky-700/60">
            <span>Start</span>
            <span>Finish</span>
          </div>
          <div className="absolute bottom-2 left-4 text-xs font-bold text-slate-600">
            {correctAnswersCount} treasure stars collected
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-3xl font-black leading-tight text-slate-900">{question.questionText}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Tap the balloon with the right answer to send the rocket closer to the flag.
        </p>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Quiz media"
          className="mb-4 max-h-64 w-full rounded-[1.5rem] object-cover shadow-lg"
        />
      )}

      {audioUrl && (
        <div className="mb-4 rounded-[1.5rem] border border-white/80 bg-white/80 p-3 shadow-md">
          <p className="mb-2 text-sm font-bold text-slate-600">Listen carefully:</p>
          <audio controls className="w-full" src={audioUrl} />
        </div>
      )}

      <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(255,255,255,0.65)_45%,_rgba(186,230,253,0.28)_100%)] p-4 shadow-inner">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(125,211,252,0.18)_100%)]" />
        <div className="pointer-events-none absolute left-10 top-8 h-10 w-24 rounded-full bg-white/60 blur-lg" />
        <div className="pointer-events-none absolute right-10 top-16 h-8 w-20 rounded-full bg-white/50 blur-lg" />

        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const position = balloonPositions[index % balloonPositions.length];
          const floatDuration = 5.4 + index * 0.4;
          const floatDelay = index * 0.35;
          const stateClass =
            feedbackState === 'correct' && isSelected
              ? 'balloon-pop'
              : feedbackState === 'wrong' && isSelected
              ? 'balloon-shake'
              : '';

          return (
            <div
              key={`${option}-${index}`}
              className="absolute"
              style={{
                left: position.left,
                top: position.top,
                transform: `translate(-50%, -50%) scale(${position.scale})`,
                animation: `balloonRise ${floatDuration}s ease-in-out ${floatDelay}s infinite alternate`
              }}
            >
              <button
                type="button"
                disabled={isLocked}
                onClick={() => handleBalloonClick(option, index)}
                aria-label={`Answer option ${String.fromCharCode(65 + index)}: ${option}`}
                className={`balloon-button relative flex min-h-28 min-w-28 max-w-[9rem] flex-col items-center justify-center rounded-full bg-gradient-to-br ${balloonPalette[index % balloonPalette.length]} px-5 py-5 text-center text-white shadow-[0_18px_30px_rgba(15,23,42,0.15)] transition duration-300 hover:scale-105 hover:shadow-[0_24px_40px_rgba(15,23,42,0.22)] focus:outline-none focus:ring-4 focus:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70 ${stateClass}`}
                style={{
                  animationDelay: `${floatDelay}s`
                }}
              >
                <span className="mb-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.25em]">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-[1.05rem] font-extrabold leading-tight drop-shadow-sm">
                  {option}
                </span>
              </button>
            </div>
          );
        })}

        <style>
          {`@keyframes balloonRise {
            0% { transform: translate(-50%, -50%) translateY(0px) rotate(-1deg); }
            50% { transform: translate(-50%, -50%) translateY(-18px) rotate(1deg); }
            100% { transform: translate(-50%, -50%) translateY(-34px) rotate(-0.5deg); }
          }

          @keyframes balloonPop {
            0% { transform: scale(1); opacity: 1; }
            55% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1.45); opacity: 0; }
          }

          @keyframes balloonShake {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            20% { transform: translateX(-7px) rotate(-2deg); }
            40% { transform: translateX(7px) rotate(2deg); }
            60% { transform: translateX(-5px) rotate(-1deg); }
            80% { transform: translateX(5px) rotate(1deg); }
          }

          .balloon-button.balloon-pop {
            animation: balloonPop 0.72s ease-out forwards;
          }

          .balloon-button.balloon-shake {
            animation: balloonShake 0.52s ease-in-out 2;
          }
        `}
        </style>
      </div>

      {isSubmitting && (
        <p className="mt-4 text-center text-sm font-semibold text-sky-700">Checking your answer...</p>
      )}
    </div>
  );
}

export default InteractiveBalloonGame;
