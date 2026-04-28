import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';

const QUIZ_RESULTS_PAGE_CLASS = 'fixed inset-0 z-40 overflow-y-auto bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8';
const QUIZ_RESULTS_PANEL_CLASS =
  'relative z-50 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-black/50';
const IMMERSIVE_THEME_CLASSES = [
  'immersive-theme-layer',
  'immersive-layer-space',
  'immersive-layer-nature',
  'immersive-layer-lab',
  'immersive-content-shell',
  'immersive-content-shell-light',
  'immersive-content-shell-dark'
];

function QuizResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizId } = useParams();

  const localStudentAnswers = useMemo(
    () => (Array.isArray(location.state?.studentAnswers) ? location.state.studentAnswers : []),
    [location.state?.studentAnswers]
  );
  const hasLocalStudentAnswers = localStudentAnswers.length > 0;

  const [quizResults, setQuizResults] = useState(location.state?.quizResults || null);
  const [quizTitle, setQuizTitle] = useState(location.state?.quizTitle || 'Quiz Results');
  const [lessonId, setLessonId] = useState(location.state?.lessonId || null);
  const [isLoading, setIsLoading] = useState(!location.state?.quizResults && !hasLocalStudentAnswers);
  const [error, setError] = useState('');

  useEffect(() => {
    const stripImmersiveThemeClasses = () => {
      const targets = [document.body, document.documentElement, document.getElementById('root')].filter(Boolean);

      targets.forEach((target) => {
        IMMERSIVE_THEME_CLASSES.forEach((className) => target.classList.remove(className));
      });

      document.querySelectorAll('.immersive-theme-layer, .immersive-layer-space, .immersive-layer-nature, .immersive-layer-lab').forEach((element) => {
        IMMERSIVE_THEME_CLASSES.forEach((className) => element.classList.remove(className));
      });
    };

    stripImmersiveThemeClasses();

    return () => {
      stripImmersiveThemeClasses();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [resultsResponse, renderResponse] = await Promise.all([
          apiClient.get(`/quiz/results/${quizId}`),
          apiClient.get(`/quiz/render/${quizId}`)
        ]);

        if (!isMounted) {
          return;
        }

        setQuizResults(resultsResponse.data?.data || null);
        setQuizTitle(renderResponse.data?.data?.title || location.state?.quizTitle || 'Quiz Results');
        setLessonId(renderResponse.data?.data?.prerequisiteLessonId || location.state?.lessonId || null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError?.response?.data?.message || 'Failed to load quiz results.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!quizResults && !hasLocalStudentAnswers) {
      loadResults();
    } else {
      setIsLoading(false);
      if (location.state?.resultsLoadError) {
        setError(location.state.resultsLoadError);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [hasLocalStudentAnswers, location.state?.lessonId, location.state?.quizTitle, location.state?.quizResults, location.state?.resultsLoadError, quizId, quizResults]);

  const localSummary = useMemo(() => {
    if (!hasLocalStudentAnswers) {
      return {
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        earnedPoints: 0,
        percentage: 0
      };
    }

    const configuredTotal = Number(location.state?.totalQuestions) || 0;
    const answeredQuestions = localStudentAnswers.length;
    const totalQuestions = configuredTotal > 0 ? configuredTotal : answeredQuestions;
    const correctAnswers = localStudentAnswers.filter((answer) => answer.isCorrect === true).length;
    const earnedPoints = localStudentAnswers.reduce(
      (sum, answer) => sum + (Number(answer.pointsAwarded) || 0),
      0
    );
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    return {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      earnedPoints,
      percentage
    };
  }, [hasLocalStudentAnswers, localStudentAnswers, location.state?.totalQuestions]);

  const wrongAnswers = useMemo(() => {
    if (hasLocalStudentAnswers) {
      return localStudentAnswers
        .filter((answer) => answer.isCorrect === false)
        .map((answer, index) => ({
          questionId: answer.questionId || answer.questionKey || `local-${index + 1}`,
          questionText: answer.questionText || `Question ${index + 1}`,
          studentAnswer: answer.studentAnswer || answer.selectedAnswer || 'No Answer',
          correctAnswer: answer.correctAnswer || 'Correct answer unavailable',
          isCorrect: false,
          pointsAwarded: Number(answer.pointsAwarded) || 0,
          lessonId: answer.lessonId || lessonId || null
        }));
    }

    return Array.isArray(quizResults?.answers)
      ? quizResults.answers.filter((answer) => !answer.isCorrect)
      : [];
  }, [hasLocalStudentAnswers, lessonId, localStudentAnswers, quizResults]);

  const reviewLessonIds = useMemo(() => {
    const ids = wrongAnswers
      .map((answer) => Number(answer.lessonId || lessonId))
      .filter((id) => Number.isInteger(id) && id > 0);

    return [...new Set(ids)];
  }, [lessonId, wrongAnswers]);

  const totalQuestions = hasLocalStudentAnswers
    ? Number(localSummary.totalQuestions) || 0
    : Number(quizResults?.totalQuestions) || 0;
  const correctAnswers = hasLocalStudentAnswers
    ? Number(localSummary.correctAnswers) || 0
    : Number(quizResults?.correctAnswers) || 0;
  const answeredQuestions = hasLocalStudentAnswers
    ? Number(localSummary.answeredQuestions) || 0
    : Number(quizResults?.answeredQuestions) || 0;
  const earnedPoints = hasLocalStudentAnswers
    ? Number(localSummary.earnedPoints) || 0
    : Number(quizResults?.earnedPoints) || 0;
  const percentage = hasLocalStudentAnswers
    ? Number(localSummary.percentage) || 0
    : Number(quizResults?.percentage) || 0;

  const handleReviewLesson = (targetLessonId = lessonId) => {
    if (!targetLessonId) {
      navigate('/student/dashboard');
      return;
    }

    navigate(`/student/lesson/${targetLessonId}`);
  };

  if (isLoading) {
    return (
      <div className={QUIZ_RESULTS_PAGE_CLASS}>
        <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
          <div className={QUIZ_RESULTS_PANEL_CLASS + ' flex flex-col items-center text-center'}>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Loading Results</p>
          <h1 className="mt-3 text-3xl font-black">Calculating your feedback...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error && !quizResults && !hasLocalStudentAnswers) {
    return (
      <div className={QUIZ_RESULTS_PAGE_CLASS}>
        <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
          <div className={QUIZ_RESULTS_PANEL_CLASS}>
          <h1 className="text-3xl font-black">Quiz Results Unavailable</h1>
          <p className="mt-3 text-sm text-red-100">{error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Back to Dashboard
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={QUIZ_RESULTS_PAGE_CLASS}>
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-start justify-center">
        <div className={QUIZ_RESULTS_PANEL_CLASS}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            ← Back to Dashboard
          </button>

          <button
            type="button"
            onClick={handleReviewLesson}
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200"
          >
            Review Lesson
          </button>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-inner shadow-black/40">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-100/70">Post-Quiz Feedback</p>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">{quizTitle}</h1>
            <p className="mt-4 text-lg text-white/80">
              You got <span className="font-black text-cyan-200">{correctAnswers}</span> out of <span className="font-black text-cyan-200">{totalQuestions}</span>!
            </p>
            <p className="mt-2 text-sm text-white/65">Final score: {percentage.toFixed(2)}%</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-950 p-5 text-center">
              <p className="text-sm font-semibold text-emerald-100/80">Correct</p>
              <p className="mt-2 text-3xl font-black text-emerald-200">{correctAnswers}</p>
            </div>
            <div className="rounded-2xl border border-sky-300/25 bg-sky-950 p-5 text-center">
              <p className="text-sm font-semibold text-sky-100/80">Answered</p>
              <p className="mt-2 text-3xl font-black text-sky-200">{answeredQuestions}</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-950 p-5 text-center">
              <p className="text-sm font-semibold text-cyan-100/80">Points Earned</p>
              <p className="mt-2 text-3xl font-black text-cyan-200">{earnedPoints}</p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-950 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Review your mistakes</h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-100">
                {wrongAnswers.length} to review
              </span>
            </div>

            {reviewLessonIds.length > 0 && (
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-950 p-4">
                <p className="text-sm font-semibold text-cyan-100/90">Recommended lessons to review</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reviewLessonIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleReviewLesson(id)}
                      className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-200"
                    >
                      Review Lesson {id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wrongAnswers.length > 0 ? (
              wrongAnswers.map((question, index) => (
                <div key={question.questionId || `${index}-${question.questionText}`} className="rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-lg">
                  <p className="text-sm font-semibold uppercase tracking-widest text-cyan-200/70">Question {index + 1}</p>
                  <h3 className="mt-2 text-xl font-bold text-white">{question.questionText}</h3>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-red-300/30 bg-red-950 p-4">
                      <p className="text-sm font-bold text-red-200">Your answer</p>
                      <p className="mt-2 text-lg font-semibold text-red-100">{question.studentAnswer}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-300/30 bg-emerald-950 p-4">
                      <p className="text-sm font-bold text-emerald-200">Correct answer</p>
                      <p className="mt-2 text-lg font-semibold text-emerald-50">{question.correctAnswer}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-300">Points awarded: {question.pointsAwarded}</p>
                    <button
                      type="button"
                      onClick={() => handleReviewLesson(question.lessonId || lessonId)}
                      className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200"
                    >
                      Review Lesson
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-950 p-8 text-center">
                <p className="text-3xl font-black text-emerald-100">Perfect score</p>
                <p className="mt-2 text-white/75">No mistakes to review. You can still revisit the lesson if you want another pass.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default QuizResults;