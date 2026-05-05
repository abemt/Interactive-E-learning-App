import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useDashboardTheme } from '../../context/DashboardThemeContext';

function QuizResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizId } = useParams();
  const theme = useDashboardTheme();

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
      const targets = [
        document.body,
        document.documentElement,
        document.getElementById('root')
      ].filter(Boolean);

      const stripFromElement = (element) => {
        const classes = [...element.classList];
        classes.forEach((className) => {
          if (className.startsWith('immersive-')) {
            element.classList.remove(className);
          }
        });
      };

      targets.forEach(stripFromElement);
      document.querySelectorAll('[class*="immersive-"]').forEach(stripFromElement);
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
      <div className={theme.page}>
        <div className={theme.shell}>
          <div className={`${theme.panel} items-center text-center`}>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-300 border-t-transparent" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Loading Results
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-900">
              Calculating your feedback...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (error && !quizResults && !hasLocalStudentAnswers) {
    return (
      <div className={theme.page}>
        <div className={theme.shell}>
          <div className={theme.panel}>
            <h1 className="text-3xl font-black text-slate-900">Quiz Results Unavailable</h1>
            <p className="mt-3 text-sm text-slate-600">{error}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/student/dashboard')}
                className={theme.buttonOutline}
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
    <div className={theme.page}>
      <div className={theme.shell}>
        <div className={theme.panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className={theme.buttonOutline}
            >
              ← Back to Dashboard
            </button>

            <button
              type="button"
              onClick={handleReviewLesson}
              className={theme.buttonPrimary}
            >
              Review Lesson
            </button>
          </div>

          <div className={theme.card}>
            <div className="mb-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500">
                Post-Quiz Feedback
              </p>
              <h1 className="mt-3 text-4xl font-black text-slate-900 md:text-5xl">
                {quizTitle}
              </h1>
              <p className="mt-4 text-lg text-slate-700">
                You got <span className="font-black text-primary-700">{correctAnswers}</span> out of{' '}
                <span className="font-black text-primary-700">{totalQuestions}</span>!
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Final score: {percentage.toFixed(2)}%
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className={theme.statCard}>
                <p className={theme.statLabel}>Correct</p>
                <p className={theme.statValue}>{correctAnswers}</p>
              </div>
              <div className={theme.statCard}>
                <p className={theme.statLabel}>Answered</p>
                <p className={theme.statValue}>{answeredQuestions}</p>
              </div>
              <div className={theme.statCard}>
                <p className={theme.statLabel}>Points Earned</p>
                <p className={theme.statValue}>{earnedPoints}</p>
              </div>
            </div>

            {error && (
              <div className="mt-6">
                <div className={theme.alertError}>{error}</div>
              </div>
            )}

            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-slate-900">Review your mistakes</h2>
                <span className={theme.pill}>{wrongAnswers.length} to review</span>
              </div>

              {reviewLessonIds.length > 0 && (
                <div className={theme.softCard}>
                  <p className="text-sm font-semibold text-slate-700">
                    Recommended lessons to review
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reviewLessonIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleReviewLesson(id)}
                        className={theme.buttonSecondary}
                      >
                        Review Lesson {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wrongAnswers.length > 0 ? (
                wrongAnswers.map((question, index) => (
                  <div
                    key={question.questionId || `${index}-${question.questionText}`}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-soft"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Question {index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {question.questionText}
                    </h3>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
                        <p className="text-sm font-bold text-danger-700">Your answer</p>
                        <p className="mt-2 text-lg font-semibold text-danger-800">
                          {question.studentAnswer}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-success-200 bg-success-50 p-4">
                        <p className="text-sm font-bold text-success-700">Correct answer</p>
                        <p className="mt-2 text-lg font-semibold text-success-800">
                          {question.correctAnswer}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-slate-600">
                        Points awarded: {question.pointsAwarded}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleReviewLesson(question.lessonId || lessonId)}
                        className={theme.buttonPrimary}
                      >
                        Review Lesson
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-success-200 bg-success-50 p-8 text-center">
                  <p className="text-3xl font-black text-success-700">Perfect score</p>
                  <p className="mt-2 text-slate-700">
                    No mistakes to review. You can still revisit the lesson if you want another pass.
                  </p>
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