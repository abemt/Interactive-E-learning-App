import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import './ImmersiveViewer.css';

const THEME_STYLES = {
  Space: {
    page: 'from-slate-950 via-indigo-950 to-blue-900 text-white',
    card: 'bg-white/10 border-indigo-300/50',
    accent: 'bg-cyan-400 text-slate-900',
    contentShell: 'immersive-content-shell immersive-content-shell-dark'
  },
  Nature: {
    page: 'from-emerald-900 via-green-800 to-teal-700 text-white',
    card: 'bg-white/15 border-emerald-200/50',
    accent: 'bg-lime-300 text-emerald-900',
    contentShell: 'immersive-content-shell immersive-content-shell-light'
  },
  Lab: {
    page: 'from-slate-800 via-slate-700 to-sky-700 text-white',
    card: 'bg-white/12 border-sky-200/50',
    accent: 'bg-sky-300 text-slate-900',
    contentShell: 'immersive-content-shell immersive-content-shell-light'
  }
};

function normalizeTheme(themeValue) {
  const normalized = String(themeValue || '').trim().toLowerCase();

  if (normalized === 'nature') return 'Nature';
  if (normalized === 'lab') return 'Lab';
  if (normalized === 'space') return 'Space';

  return 'Space';
}

const SPACE_STARFIELD = Array.from({ length: 56 }, (_, index) => {
  const size = 1 + ((index * 5) % 3);

  return {
    x: `${(index * 17) % 100}%`,
    y: `${(index * 31) % 100}%`,
    size: `${size}px`,
    opacity: `${0.3 + ((index * 11) % 45) / 100}`,
    twinkleDuration: `${4.5 + (index % 6) * 0.9}s`,
    delay: `${(index % 10) * -0.6}s`
  };
});

const NATURE_LEAF_FLOW = [
  { side: 'left', offset: '3%' },
  { side: 'left', offset: '9%' },
  { side: 'right', offset: '4%' },
  { side: 'right', offset: '10%' },
  { side: 'left', offset: '15%' },
  { side: 'right', offset: '16%' },
  { side: 'left', offset: '22%' },
  { side: 'right', offset: '23%' },
  { side: 'left', offset: '7%' },
  { side: 'right', offset: '8%' },
  { side: 'left', offset: '19%' },
  { side: 'right', offset: '20%' }
].map((leaf, index) => ({
  ...leaf,
  size: `${12 + (index % 4) * 2}px`,
  duration: `${14 + (index % 5) * 1.6}s`,
  delay: `${index * -1.15}s`,
  drift: `${leaf.side === 'left' ? 24 + (index % 4) * 11 : -(24 + (index % 4) * 11)}px`,
  startTop: `-${8 + (index % 3) * 5}vh`,
  scale: `${0.82 + (index % 3) * 0.1}`
}));

const LAB_BUBBLE_FLOW = Array.from({ length: 16 }, (_, index) => ({
  x: `${4 + ((index * 6) % 92)}%`,
  size: `${18 + (index % 5) * 8}px`,
  duration: `${16 + (index % 6) * 2.2}s`,
  delay: `${index * -1.4}s`,
  drift: `${index % 2 === 0 ? -(14 + (index % 4) * 6) : 14 + (index % 4) * 6}px`
}));

function ThemeAnimationLayer({ theme }) {
  if (theme === 'Nature') {
    return (
      <div className="immersive-theme-layer immersive-layer-nature" aria-hidden="true">
        {NATURE_LEAF_FLOW.map((leaf, index) => (
          <span
            key={`leaf-${index}`}
            className={`immersive-leaf immersive-leaf-${leaf.side}`}
            style={{
              '--offset': leaf.offset,
              '--leaf-size': leaf.size,
              '--duration': leaf.duration,
              '--delay': leaf.delay,
              '--drift': leaf.drift,
              '--start-top': leaf.startTop,
              '--scale': leaf.scale
            }}
          />
        ))}
      </div>
    );
  }

  if (theme === 'Lab') {
    return (
      <div className="immersive-theme-layer immersive-layer-lab" aria-hidden="true">
        {LAB_BUBBLE_FLOW.map((bubble, index) => (
          <span
            key={`bubble-${index}`}
            className="immersive-bubble"
            style={{
              '--x': bubble.x,
              '--size': bubble.size,
              '--duration': bubble.duration,
              '--delay': bubble.delay,
              '--drift': bubble.drift
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="immersive-theme-layer immersive-layer-space" aria-hidden="true">
      <div className="immersive-space-drift">
        {SPACE_STARFIELD.map((star, index) => (
          <span
            key={`star-${index}`}
            className="immersive-star"
            style={{
              '--x': star.x,
              '--y': star.y,
              '--size': star.size,
              '--opacity': star.opacity,
              '--twinkle-duration': star.twinkleDuration,
              '--delay': star.delay
            }}
          />
        ))}
      </div>
    </div>
  );
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

function normalizeCards(cards = []) {
  return [...cards]
    .map((card, index) => ({
      order: Number(card?.order) || index + 1,
      textContent: String(card?.textContent || '').trim(),
      theme: normalizeTheme(card?.theme || card?.visualTheme),
      imageUrl: resolveMediaUrl(card?.imageUrl),
      audioUrl: resolveMediaUrl(card?.audioUrl)
    }))
    .sort((a, b) => a.order - b.order)
    .filter((card) => card.textContent);
}

function ImmersiveViewer() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const audioRef = useRef(null);

  const [lesson, setLesson] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPronouncing, setIsPronouncing] = useState(false);
  const [unlockedQuizzes, setUnlockedQuizzes] = useState([]);
  const [error, setError] = useState('');
  const [completionNotice, setCompletionNotice] = useState('');

  useEffect(() => {
    const loadLesson = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await apiClient.get(`/content/student/lessons/${lessonId}`);
        const payload = response.data?.data;
        const normalizedCards = normalizeCards(payload?.cards || []);

        if (!payload || normalizedCards.length === 0) {
          throw new Error('This lesson does not contain readable content cards.');
        }

        setLesson({
          ...payload,
          cards: normalizedCards
        });
        setCurrentIndex(0);
        setUnlockedQuizzes([]);
        setCompletionNotice(
          payload?.isCompleted
            ? `Lesson already completed. +${payload?.completionXP || 0} XP was awarded for this lesson.`
            : ''
        );
      } catch (loadError) {
        setError(loadError?.response?.data?.message || loadError.message || 'Failed to load lesson.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLesson();

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lessonId]);

  const cards = lesson?.cards || [];
  const currentCard = cards[currentIndex] || null;
  const isLastCard = cards.length > 0 && currentIndex === cards.length - 1;

  const activeThemeKey = useMemo(() => normalizeTheme(currentCard?.theme), [currentCard?.theme]);

  const activeTheme = useMemo(() => THEME_STYLES[activeThemeKey] || THEME_STYLES.Space, [activeThemeKey]);

  const handlePronounceCardText = () => {
    const text = String(currentCard?.textContent || '').trim();
    if (!text || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onstart = () => setIsPronouncing(true);
    utterance.onend = () => setIsPronouncing(false);
    utterance.onerror = () => setIsPronouncing(false);

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayCardAudio = async () => {
    if (!audioRef.current) {
      return;
    }

    try {
      await audioRef.current.play();
    } catch {
      setError('Unable to play audio automatically. Try using your browser audio controls.');
    }
  };

  const handleCompleteLesson = async () => {
    if (!lesson || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setError('');

    try {
      const response = await apiClient.post(`/content/student/lessons/${lesson.id}/complete`);
      const result = response.data?.data;
      const unlocked = Array.isArray(result?.unlockedQuizzes) ? result.unlockedQuizzes : [];
      const unlockedCount = unlocked.length;

      setLesson((prev) => ({
        ...prev,
        isCompleted: true
      }));
      setUnlockedQuizzes(unlocked);

      setCompletionNotice(
        result?.alreadyCompleted
          ? 'Lesson already completed. Your quiz path is unlocked.'
          : `Lesson completed! +${result?.xpAwarded || 0} XP earned. ${unlockedCount} quiz(es) unlocked.`
      );
    } catch (completeError) {
      setError(completeError?.response?.data?.message || 'Failed to complete lesson. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading immersive lesson...</p>
        </div>
      </div>
    );
  }

  if (error && !lesson) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">Lesson Unavailable</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              Back to Learning Path
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-br ${activeTheme.page}`}>
      <ThemeAnimationLayer theme={activeThemeKey} />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30"
          >
            ← Back to Learning Path
          </button>

          <div className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
            Card {currentIndex + 1} of {cards.length}
          </div>
        </div>

        <div className={`flex-1 rounded-3xl border p-6 shadow-2xl backdrop-blur ${activeTheme.card}`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="immersive-main-heading text-3xl font-black">{lesson?.title}</h1>
              <p className="mt-1 text-sm opacity-85">{lesson?.moduleTitle}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeTheme.accent}`}>
              {activeThemeKey} Theme
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-500/20 px-4 py-3 text-sm font-medium text-red-100">
              {error}
            </div>
          )}

          {completionNotice && (
            <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100">
              {completionNotice}

              {unlockedQuizzes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/student/quiz/${unlockedQuizzes[0].id}`)}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    Start Unlocked Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/student/dashboard')}
                    className="rounded-lg bg-emerald-900/40 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-900/60"
                  >
                    Back to Learning Path
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={activeTheme.contentShell}>
            <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="immersive-content-block p-5">
                <h2 className="immersive-section-heading mb-3 text-base font-bold uppercase tracking-wide">
                  Lesson Text
                </h2>
                <p className="whitespace-pre-wrap text-lg leading-relaxed">{currentCard?.textContent}</p>
              </div>

              <div className="space-y-4">
                <h2 className="immersive-section-heading text-base font-bold uppercase tracking-wide">
                  Media and Audio
                </h2>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handlePronounceCardText}
                    disabled={!currentCard?.textContent || isPronouncing}
                    className="immersive-control-button rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPronouncing ? 'Pronouncing...' : 'Pronounce Text'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayCardAudio}
                    disabled={!currentCard?.audioUrl}
                    className="immersive-control-button rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Play Card Audio
                  </button>
                </div>

                {currentCard?.imageUrl && (
                  <img
                    src={currentCard.imageUrl}
                    alt="Lesson visual"
                    className="max-h-72 w-full rounded-2xl border border-black/20 object-cover shadow-md"
                  />
                )}

                {currentCard?.audioUrl && (
                  <div className="immersive-content-block p-4">
                    <p className="mb-2 text-sm font-semibold">Audio Card</p>
                    <audio ref={audioRef} controls className="w-full" key={currentCard.audioUrl}>
                      <source src={currentCard.audioUrl} />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}

                {!currentCard?.imageUrl && !currentCard?.audioUrl && (
                  <div className="immersive-empty-media rounded-2xl p-6 text-center text-sm">
                    No media attached to this card.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="rounded-lg bg-white/20 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {!isLastCard && (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(cards.length - 1, prev + 1))}
              className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-cyan-200"
            >
              Next
            </button>
          )}

          {isLastCard && (
            <button
              type="button"
              onClick={handleCompleteLesson}
              disabled={isCompleting || lesson?.isCompleted}
              className="rounded-lg bg-emerald-300 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {lesson?.isCompleted
                ? 'Lesson Completed'
                : isCompleting
                ? 'Completing Lesson...'
                : 'Complete Lesson'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImmersiveViewer;
