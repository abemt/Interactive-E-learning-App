import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { clearAuthSession, getAuthUser } from '../../services/authStorage';
import FidelChart from './FidelChart';
import NumeracyGrid from './NumeracyGrid';
import PracticeQuiz from './PracticeQuiz';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const ITEM_THEME = {
  Lesson: {
    icon: 'LS',
    cardClass: 'from-cyan-100 to-sky-200 border-cyan-500',
    actionText: 'Open Lesson'
  },
  Quiz: {
    icon: 'QZ',
    cardClass: 'from-amber-100 to-orange-200 border-amber-500',
    actionText: 'Start Quiz'
  }
};

const BADGE_TYPE_MONOGRAM = {
  Completion: 'CP',
  Mastery: 'MS',
  Streak: 'SK',
  Special: 'SP'
};

const RANK_ACCENT = {
  1: 'bg-amber-100 text-amber-800 border-amber-300',
  2: 'bg-slate-100 text-slate-800 border-slate-300',
  3: 'bg-orange-100 text-orange-800 border-orange-300'
};

const LEVEL_RING_RADIUS = 58;
const LEVEL_RING_CIRCUMFERENCE = 2 * Math.PI * LEVEL_RING_RADIUS;

const LevelProgressCard = memo(function LevelProgressCard({
  currentLevel,
  levelRingOffset,
  levelProgressPercent,
  xpToNextLevel,
  nextLevelXP
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Current Level</p>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
          Level {currentLevel}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={LEVEL_RING_RADIUS}
              stroke="#e2e8f0"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r={LEVEL_RING_RADIUS}
              stroke="#0f766e"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={LEVEL_RING_CIRCUMFERENCE}
              strokeDashoffset={levelRingOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-black text-slate-900">{Math.round(levelProgressPercent)}%</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">to next level</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-600">XP to next level</p>
          <p className="text-2xl font-black text-slate-900">{xpToNextLevel}</p>
          <p className="mt-1 text-xs text-slate-500">Target XP: {nextLevelXP}</p>
        </div>
      </div>
    </article>
  );
});

const BadgesPanel = memo(function BadgesPanel({ badges }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-800">Earned Badges</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {badges.length}
        </span>
      </div>

      {badges.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No badges yet. Keep completing lessons and quizzes to unlock achievements.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {badges.map((badge) => (
            <div key={badge.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                {BADGE_TYPE_MONOGRAM[badge.badgeType] || 'BD'}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{badge.title}</p>
                <p className="text-xs text-slate-600">{badge.description || 'Achievement unlocked'}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {badge.badgeType} - +{badge.xpReward || 0} XP
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

const LeaderboardPanel = memo(function LeaderboardPanel({ leaderboardTop3, monthlyReward }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
      <h3 className="text-lg font-black text-slate-800">Class Leaderboard</h3>

      {leaderboardTop3.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Leaderboard data will appear once classmates start completing activities.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {leaderboardTop3.map((entry) => (
            <div
              key={`rank-${entry.rank}-${entry.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
                    RANK_ACCENT[entry.rank] || 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  #{entry.rank}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{entry.fullName}</p>
                  {entry.isCurrentUser && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">You</p>
                  )}
                </div>
              </div>
              <p className="text-sm font-black text-slate-800">{entry.totalXP} XP</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
        {monthlyReward}
      </div>
    </section>
  );
});

const flattenTrackableNodes = (terms = []) =>
  terms.flatMap((term) =>
    (term.items || [])
      .filter((node) => node.itemType === 'Lesson' || node.itemType === 'Quiz')
      .map((node) => ({ ...node, term: term.term }))
  );

const QUICK_PRACTICE_MODES = {
  FIDEL: 'fidel',
  NUMERACY: 'numeracy'
};

const QUICK_PRACTICE_CARDS = [
  {
    id: QUICK_PRACTICE_MODES.FIDEL,
    title: 'Practice Fidel',
    icon: '🔤',
    description: 'Open the Amharic letter grid.',
    cardClass: 'border-cyan-200 bg-cyan-50/70',
    badgeClass: 'bg-white text-cyan-700 border-cyan-100'
  },
  {
    id: QUICK_PRACTICE_MODES.NUMERACY,
    title: 'Practice Numbers',
    icon: '🔢',
    description: 'Open the numbers 1-20 grid.',
    cardClass: 'border-amber-200 bg-amber-50/70',
    badgeClass: 'bg-white text-amber-700 border-amber-100'
  }
];

const PRACTICE_MODULE_KEYWORDS = {
  FIDEL: ['fidel', 'amharic'],
  NUMERACY: ['numeracy', 'number', 'math']
};

const normalizeModuleTitle = (moduleTitle) => String(moduleTitle || '').toLowerCase();

const collectModuleSummaries = (terms = []) => {
  const moduleMap = new Map();

  terms.forEach((term) => {
    (term.items || []).forEach((node) => {
      if (!node?.moduleId || moduleMap.has(node.moduleId)) {
        return;
      }

      moduleMap.set(node.moduleId, {
        id: node.moduleId,
        title: node.moduleTitle || ''
      });
    });
  });

  return [...moduleMap.values()];
};

const findPracticeModuleByKeyword = (modules, keywords = []) =>
  modules.find((module) =>
    keywords.some((keyword) => normalizeModuleTitle(module.title).includes(keyword))
  ) || null;

function resolveStudentClassName(user, classInfo) {
  const candidates = [
    user?.className,
    user?.class?.name,
    user?.assignedClassName,
    classInfo?.name,
    classInfo?.className,
    classInfo?.gradeName,
    classInfo?.title
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim()) || '';
}

function hasQuickPracticeAccess(className) {
  const normalizedClassName = String(className || '').toLowerCase();
  return normalizedClassName.includes('grade 1') || normalizedClassName.includes('grade 2');
}

function StudentDashboardNew() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const isOnline = useOnlineStatus();

  const [terms, setTerms] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [totalXP, setTotalXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [nextLevelXP, setNextLevelXP] = useState(100);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [levelProgressPercent, setLevelProgressPercent] = useState(0);
  const [badges, setBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ top3: [], userRank: null, monthlyReward: '' });
  const [nextCheckpoint, setNextCheckpoint] = useState(null);
  const [completedTrackableItems, setCompletedTrackableItems] = useState(0);
  const [totalTrackableItems, setTotalTrackableItems] = useState(0);
  const [activeQuickPractice, setActiveQuickPractice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [pathResponse, overviewResponse] = await Promise.all([
          apiClient.get('/content/student/learning-path'),
          apiClient.get('/gamification/student-overview')
        ]);

        const pathTerms = pathResponse.data?.terms || [];
        const pathClassInfo = pathResponse.data?.class || null;
        const overview = overviewResponse.data?.data || {};
        const profile = overview.profile || {};
        const completedQuizIds = new Set(Array.isArray(overview.completedQuizIds) ? overview.completedQuizIds : []);

        const hydratedTerms = pathTerms.map((term) => ({
          ...term,
          items: (term.items || []).map((node) => {
            const quizCompleted = node.itemType === 'Quiz' ? completedQuizIds.has(node.id) : false;
            return {
              ...node,
              isCompleted: Boolean(node.isCompleted || quizCompleted)
            };
          })
        }));

        const trackableNodes = flattenTrackableNodes(hydratedTerms);
        const completedCount = trackableNodes.filter((node) => node.isCompleted).length;
        const nextNode =
          trackableNodes.find((node) => !node.isLocked && !node.isCompleted) ||
          trackableNodes.find((node) => !node.isCompleted) ||
          null;

        setTerms(hydratedTerms);
        setClassInfo(profile.class || pathClassInfo || null);
        setTotalXP(Number(profile.totalXP ?? pathResponse.data?.totalXP) || 0);
        setCurrentLevel(Number(profile.currentLevel) || 1);
        setNextLevelXP(Number(profile.nextLevelXP) || 100);
        setXpToNextLevel(Number(profile.xpToNextLevel) || 0);
        setLevelProgressPercent(Number(profile.levelProgressPercent) || 0);
        setBadges(Array.isArray(overview.badges) ? overview.badges : []);
        setLeaderboard(overview.leaderboard || { top3: [], userRank: null, monthlyReward: '' });
        setNextCheckpoint(nextNode);
        setCompletedTrackableItems(completedCount);
        setTotalTrackableItems(trackableNodes.length);
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load your student dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    if (!activeQuickPractice) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveQuickPractice(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeQuickPractice]);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    navigate('/login');
  }, [navigate]);

  const openPathNode = useCallback((node) => {
    if (!node || node.isLocked) {
      return;
    }

    if (node.itemType === 'Lesson') {
      navigate(`/student/lesson/${node.id}`);
      return;
    }

    if (node.itemType === 'Quiz') {
      navigate(`/student/quiz/${node.id}`);
    }
  }, [navigate]);

  const levelRingOffset = useMemo(() => {
    const boundedProgress = Math.max(0, Math.min(100, Number(levelProgressPercent) || 0));
    return LEVEL_RING_CIRCUMFERENCE - (boundedProgress / 100) * LEVEL_RING_CIRCUMFERENCE;
  }, [levelProgressPercent]);

  const studentClassName = resolveStudentClassName(user, classInfo);
  const hasQuickPractice = hasQuickPracticeAccess(studentClassName);
  const activeQuickPracticeLabel = useMemo(
    () =>
      activeQuickPractice === QUICK_PRACTICE_MODES.FIDEL
        ? 'Practice Fidel'
        : 'Practice Numbers',
    [activeQuickPractice]
  );

  const completionPercent = useMemo(() => {
    if (totalTrackableItems <= 0) {
      return 0;
    }

    return Math.round((completedTrackableItems / totalTrackableItems) * 100);
  }, [completedTrackableItems, totalTrackableItems]);

  const leaderboardTop3 = useMemo(
    () => (Array.isArray(leaderboard?.top3) ? leaderboard.top3 : []),
    [leaderboard]
  );
  const badgeList = useMemo(
    () => (Array.isArray(badges) ? badges : []),
    [badges]
  );
  const monthlyReward =
    leaderboard?.monthlyReward ||
    'Top 3 learners each month earn recognition certificates and bonus classroom rewards.';

  const practiceModules = useMemo(() => {
    const modules = collectModuleSummaries(terms);
    return {
      fidel: findPracticeModuleByKeyword(modules, PRACTICE_MODULE_KEYWORDS.FIDEL),
      numeracy: findPracticeModuleByKeyword(modules, PRACTICE_MODULE_KEYWORDS.NUMERACY)
    };
  }, [terms]);

  const activePracticeModule =
    activeQuickPractice === QUICK_PRACTICE_MODES.FIDEL
      ? practiceModules.fidel
      : activeQuickPractice === QUICK_PRACTICE_MODES.NUMERACY
      ? practiceModules.numeracy
      : null;

  const activePracticeFallbackTitle =
    activeQuickPractice === QUICK_PRACTICE_MODES.FIDEL
      ? 'Fidel'
      : activeQuickPractice === QUICK_PRACTICE_MODES.NUMERACY
      ? 'Numeracy'
      : 'Practice';

  const termSections = useMemo(
    () =>
      terms.map((term) => (
        <article key={term.term} className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800">{term.term}</h2>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {term.items.length} checkpoints
            </span>
          </div>

          <div className="relative space-y-3 pl-8">
            <div className="pointer-events-none absolute left-[12px] top-3 h-[calc(100%-24px)] w-[2px] bg-gradient-to-b from-cyan-300 via-sky-400 to-emerald-400" />

            {term.items.map((node) => {
              const theme = ITEM_THEME[node.itemType] || ITEM_THEME.Lesson;
              const statusClass = node.isCompleted
                ? 'bg-emerald-500'
                : node.isLocked
                  ? 'bg-rose-400'
                  : 'bg-cyan-500';

              return (
                <button
                  key={`${term.term}-${node.id}`}
                  type="button"
                  onClick={() => openPathNode(node)}
                  disabled={Boolean(node.isLocked)}
                  className={`relative w-full rounded-2xl border-2 bg-gradient-to-br p-4 text-left transition-all duration-200 ${theme.cardClass} ${
                    node.isLocked
                      ? 'cursor-not-allowed opacity-70'
                      : 'hover:-translate-y-[2px] hover:shadow-lg'
                  }`}
                >
                  <span className={`absolute -left-[24px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white ${statusClass} shadow`} />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[11px] font-black text-slate-700">
                        {theme.icon}
                      </span>
                      <p className="mt-2 text-base font-black text-slate-900">{node.title}</p>
                      <p className="text-xs font-medium text-slate-700">{node.moduleTitle}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {node.itemType}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {node.isCompleted && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Completed</span>
                    )}
                    {node.isLocked && (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Locked</span>
                    )}
                    {!node.isLocked && !node.isCompleted && (
                      <span className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-700">Ready</span>
                    )}
                    {node.itemType === 'Quiz' && node.isLocked && (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-600">
                        Complete prerequisite lesson first
                      </span>
                    )}
                    {!node.isLocked && (
                      <span className="rounded-full bg-white/90 px-2 py-1 text-slate-700">{theme.actionText}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      )),
    [openPathNode, terms]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff4ff_0%,#e8f8ff_28%,#f7ffec_58%,#fff9f0_100%)]">
      <div className="border-b-2 border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="container-fluid flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-bold text-white">
              {(user?.fullName || 'Student').charAt(0)}
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{user?.fullName || 'Student'}</div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="rounded-lg bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">Student</span>
                <span>{studentClassName || 'Class Not Assigned'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total XP</div>
              <div className="text-2xl font-extrabold text-emerald-900">{totalXP}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="container-fluid py-6 sm:py-8">
        <div className="mb-7">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl">Mission Control</h1>
          <p className="mt-2 text-slate-600">
            This dashboard updates from your live class progress, badge unlocks, and leaderboard rank.
          </p>
        </div>

        {!isOnline && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            You are offline. Progress will sync automatically when the connection returns.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {hasQuickPractice && !isLoading && (
          <section className="mb-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/95 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Quick Practice</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                  Foundational literacy and numeracy
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Students in Grades 1 and 2 can jump straight into Fidel and number practice from the dashboard,
                  without following the normal lessons path.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Available for {studentClassName || 'Grade 1-2 learners'}
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2">
              {QUICK_PRACTICE_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveQuickPractice(card.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.cardClass}`}
                >
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border text-2xl shadow-sm ${card.badgeClass}`}>
                        {card.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-slate-900 sm:text-2xl">{card.title}</h3>
                        <p className="mt-1 max-w-md text-sm text-slate-600">{card.description}</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                      Open
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {isLoading && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-md">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-600">Loading your mission data...</p>
          </div>
        )}

        {!isLoading && terms.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-md">
            <p className="text-lg font-semibold text-slate-700">No lessons or quizzes assigned yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Your teacher or school admin needs to assign learning modules to your class.
            </p>
          </div>
        )}

        {!isLoading && terms.length > 0 && (
          <div className="space-y-7">
            <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <LevelProgressCard
                currentLevel={currentLevel}
                levelRingOffset={levelRingOffset}
                levelProgressPercent={levelProgressPercent}
                xpToNextLevel={xpToNextLevel}
                nextLevelXP={nextLevelXP}
              />

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Next Checkpoint</p>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {nextCheckpoint ? nextCheckpoint.itemType : 'Complete'}
                  </span>
                </div>

                {nextCheckpoint ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xl font-extrabold text-slate-900">{nextCheckpoint.title}</p>
                    <p className="text-sm text-slate-600">{nextCheckpoint.moduleTitle}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{nextCheckpoint.term}</p>
                    <button
                      type="button"
                      onClick={() => openPathNode(nextCheckpoint)}
                      disabled={Boolean(nextCheckpoint.isLocked)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                        nextCheckpoint.isLocked
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      {nextCheckpoint.isLocked ? 'Locked for now' : 'Continue Learning'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">All assigned checkpoints are complete.</p>
                  </div>
                )}
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Learning Path Progress</p>
                <p className="mt-3 text-3xl font-black text-slate-900">{completedTrackableItems}/{totalTrackableItems}</p>
                <p className="text-sm text-slate-600">checkpoints completed</p>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-emerald-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Overall completion</span>
                  <span>{completionPercent}%</span>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  Class Rank: {leaderboard?.userRank || '-'}
                </div>
              </article>
            </section>

            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <section className="space-y-5">{termSections}</section>

              <aside className="space-y-5">
                <BadgesPanel badges={badgeList} />
                <LeaderboardPanel leaderboardTop3={leaderboardTop3} monthlyReward={monthlyReward} />
              </aside>
            </div>
          </div>
        )}
      </div>

      {activeQuickPractice && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/92 backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Quick Practice</p>
              <h2 className="text-xl font-black sm:text-2xl">{activeQuickPracticeLabel}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isOnline && (
                <span className="rounded-full border border-amber-200/60 bg-amber-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
                  Offline
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveQuickPractice(null)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            <div className="space-y-8 pb-10">
              {activeQuickPractice === QUICK_PRACTICE_MODES.FIDEL ? (
                <FidelChart onBack={() => setActiveQuickPractice(null)} />
              ) : (
                <NumeracyGrid onBack={() => setActiveQuickPractice(null)} />
              )}

              <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Practice Quiz</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      {activePracticeFallbackTitle} quiz
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    No XP
                  </span>
                </div>

                <PracticeQuiz
                  moduleId={activePracticeModule?.id}
                  moduleTitle={activePracticeModule?.title || activePracticeFallbackTitle}
                  variant={activeQuickPractice}
                />
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboardNew;
