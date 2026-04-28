import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { getAuthUser } from '../../services/authStorage';
import { submitQuizAnswer } from '../../services/quizService';
import InteractiveBalloonGame from './InteractiveBalloonGame';
import DragDropQuizUI from './DragDropQuizUI';
import PuzzleQuizUI from './PuzzleQuizUI';
import StandardQuizUI from './StandardQuizUI';
import YoungLearnerStandardQuizUI from './YoungLearnerStandardQuizUI';

const QUIZ_TYPE_VALUES = {
  STANDARD: 'standard_multiple_choice',
  BALLOON: 'balloon_pop',
  DRAG_AND_DROP: 'drag_and_drop',
  PUZZLE: 'puzzle',
  KAHOOT: 'kahoot_standard'
};

const QUIZ_TYPE_ALIASES = {
  standard: QUIZ_TYPE_VALUES.STANDARD,
  standard_multiple_choice: QUIZ_TYPE_VALUES.STANDARD,
  multiplechoice: QUIZ_TYPE_VALUES.STANDARD,
  multiple_choice: QUIZ_TYPE_VALUES.STANDARD,
  balloon: QUIZ_TYPE_VALUES.BALLOON,
  balloon_pop: QUIZ_TYPE_VALUES.BALLOON,
  drag_and_drop: QUIZ_TYPE_VALUES.DRAG_AND_DROP,
  dragdrop: QUIZ_TYPE_VALUES.DRAG_AND_DROP,
  'drag-drop': QUIZ_TYPE_VALUES.DRAG_AND_DROP,
  puzzle: QUIZ_TYPE_VALUES.PUZZLE,
  kahoot: QUIZ_TYPE_VALUES.KAHOOT,
  kahoot_standard: QUIZ_TYPE_VALUES.KAHOOT
};

const QUIZ_MODE_LABELS = {
  [QUIZ_TYPE_VALUES.STANDARD]: 'Standard Multiple Choice',
  [QUIZ_TYPE_VALUES.BALLOON]: 'Balloon Pop Mode',
  [QUIZ_TYPE_VALUES.DRAG_AND_DROP]: 'Drag-and-Drop Mode',
  [QUIZ_TYPE_VALUES.PUZZLE]: 'Puzzle Challenge Mode',
  [QUIZ_TYPE_VALUES.KAHOOT]: 'Kahoot-Style Challenge'
};

function extractGradeLevel(value) {
  if (value === undefined || value === null) return null;

  const directNumber = Number(value);
  if (Number.isInteger(directNumber) && directNumber >= 1 && directNumber <= 8) {
    return directNumber;
  }

  const match = String(value).match(/(\d+)/);
  if (!match) return null;

  const grade = Number(match[1]);
  if (!Number.isInteger(grade) || grade < 1 || grade > 8) {
    return null;
  }

  return grade;
}

function normalizeQuizType(value) {
  if (value === undefined || value === null) return null;

  const normalizedInput = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return QUIZ_TYPE_ALIASES[normalizedInput] || null;
}

function resolveQuizMode({ gradeLevel, quizType }) {
  if (Number.isInteger(gradeLevel) && gradeLevel >= 5) {
    return QUIZ_TYPE_VALUES.KAHOOT;
  }

  const normalizedQuizType = normalizeQuizType(quizType);
  if (normalizedQuizType === QUIZ_TYPE_VALUES.DRAG_AND_DROP) return QUIZ_TYPE_VALUES.DRAG_AND_DROP;
  if (normalizedQuizType === QUIZ_TYPE_VALUES.PUZZLE) return QUIZ_TYPE_VALUES.PUZZLE;
  if (normalizedQuizType === QUIZ_TYPE_VALUES.STANDARD) return QUIZ_TYPE_VALUES.STANDARD;
  if (normalizedQuizType === QUIZ_TYPE_VALUES.BALLOON) return QUIZ_TYPE_VALUES.BALLOON;

  return QUIZ_TYPE_VALUES.BALLOON;
}

function normalizeQuestions(rawQuestions = []) {
  return rawQuestions
    .map((question, index) => {
      const options = Array.isArray(question.options)
        ? question.options
            .map((option) => String(option).trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];

      if (!question.questionText || options.length !== 4) {
        return null;
      }

      return {
        id: question.id || `question-${index + 1}`,
        questionId: question.questionId || null,
        contentItemId: question.contentItemId || null,
        questionText: question.questionText,
        options,
        imageUrl: question.imageUrl || null,
        audioUrl: question.audioUrl || null,
        difficulty: question.difficulty || 'medium'
      };
    })
    .filter(Boolean);
}

function QuizEngine() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const user = getAuthUser();

  const [quiz, setQuiz] = useState(null);
  const [gradeLevel, setGradeLevel] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [lastSubmissionMessage, setLastSubmissionMessage] = useState('');
  const [isResolvingResults, setIsResolvingResults] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const resultsNavigationRef = useRef(false);

  const loadQuiz = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get(`/quiz/render/${quizId}`);
      const payload = response.data?.data;

      const questions = normalizeQuestions(payload?.questions || []);
      if (!payload || questions.length === 0) {
        throw new Error('This quiz does not have renderable questions yet.');
      }

      const detectedGrade =
        extractGradeLevel(payload.studentGradeLevel) ||
        extractGradeLevel(payload.targetGradeLevel) ||
        extractGradeLevel(user?.gradeLevel) ||
        5;

      setQuiz({
        id: payload.quizId,
        title: payload.title,
        moduleId: payload.moduleId,
        prerequisiteLessonId: payload.prerequisiteLessonId || null,
        quizType: normalizeQuizType(payload.quizType),
        questions
      });
      setGradeLevel(detectedGrade);
      setCurrentQuestionIndex(0);
      setQuestionStartedAt(Date.now());
      setStudentAnswers([]);
      setLastSubmissionMessage('');
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load quiz.');
    } finally {
      setIsLoading(false);
    }
  }, [quizId, user?.gradeLevel]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const currentQuestion = quiz?.questions?.[currentQuestionIndex] || null;
  const totalQuestions = quiz?.questions?.length || 0;
  const isComplete = totalQuestions > 0 && currentQuestionIndex >= totalQuestions;

  const handleAnswerSelection = useCallback(
    async (selectedAnswer, meta = {}) => {
      if (!currentQuestion || isSubmitting || isComplete) {
        return { ok: false };
      }

      setIsSubmitting(true);
      setError('');

      const elapsedSeconds =
        Number.isFinite(meta.timeTakenSeconds) && meta.timeTakenSeconds > 0
          ? meta.timeTakenSeconds
          : Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));

      const normalizedAnswer = String(selectedAnswer || '').trim() || 'No Answer';
      const attemptKey = `${currentQuestion.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const provisionalRecord = {
        attemptKey,
        questionKey: currentQuestion.id,
        questionId: currentQuestion.questionId || currentQuestion.id,
        lessonId: quiz?.prerequisiteLessonId || null,
        questionText: currentQuestion.questionText,
        selectedAnswer: normalizedAnswer,
        studentAnswer: normalizedAnswer,
        isCorrect: null,
        correctAnswer: null,
        pointsAwarded: 0,
        xpAwarded: 0,
        pendingSync: false,
        timedOut: Boolean(meta?.timedOut),
        answerStatus: 'Submitting'
      };

      setStudentAnswers((prev) => [...prev, provisionalRecord]);

      const payload = {
        answerText: normalizedAnswer,
        difficulty: currentQuestion.difficulty,
        timeTakenSeconds: elapsedSeconds,
        attemptTimestamp: new Date().toISOString()
      };

      if (currentQuestion.questionId) {
        payload.questionId = currentQuestion.questionId;
      } else {
        payload.contentItemId = currentQuestion.contentItemId || Number(quizId);
      }

      try {
        const submission = await submitQuizAnswer(payload);

        const resultData = submission?.data || {};
        const awardedXp = Math.max(0, Number(resultData.xpAwarded) || 0);
        const submissionMessage = String(resultData.message || submission?.message || '').trim();

        setStudentAnswers((prev) =>
          prev.map((entry) => {
            if (entry.attemptKey !== attemptKey) {
              return entry;
            }

            return {
              ...entry,
              isCorrect:
                typeof resultData.isCorrect === 'boolean' ? resultData.isCorrect : null,
              correctAnswer: resultData.correctAnswer || null,
              pointsAwarded: Number(resultData.pointsAwarded) || 0,
              xpAwarded: awardedXp,
              pendingSync: Boolean(submission?.pendingSync),
              answerStatus: submission?.pendingSync ? 'Pending Sync' : 'Submitted'
            };
          })
        );

        if (submission?.pendingSync) {
          setLastSubmissionMessage('Saved offline as Pending Sync. It will sync when network returns.');
        } else {
          setLastSubmissionMessage(
            submissionMessage ||
              (resultData.isCorrect ? 'Correct answer. Great work!' : 'Submitted. Keep going!')
          );
        }

        return {
          ok: true,
          isCorrect: resultData.isCorrect === true,
          xpAwarded: awardedXp,
          shouldAnimateXp: awardedXp > 0,
          message: submissionMessage,
          pendingSync: Boolean(submission?.pendingSync)
        };
      } catch (submitError) {
        setStudentAnswers((prev) => prev.filter((entry) => entry.attemptKey !== attemptKey));
        setError(submitError?.response?.data?.message || 'Failed to submit answer. Please retry.');
        return {
          ok: false,
          errorMessage: submitError?.response?.data?.message || 'Failed to submit answer. Please retry.'
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentQuestion, isComplete, isSubmitting, questionStartedAt, quiz?.prerequisiteLessonId, quizId]
  );

  const handleAnswerAnimationComplete = useCallback(() => {
    setCurrentQuestionIndex((index) => Math.min(index + 1, totalQuestions));
    setQuestionStartedAt(Date.now());
  }, [totalQuestions]);

  useEffect(() => {
    if (!isComplete || !quiz || resultsNavigationRef.current) {
      return;
    }

    let isMounted = true;

    const resolveResults = async () => {
      setIsResolvingResults(true);
      setError('');

      try {
        const response = await apiClient.get(`/quiz/results/${quiz.id}`);
        const quizResults = response.data?.data || null;

        if (!isMounted) {
          return;
        }

        resultsNavigationRef.current = true;
        navigate(`/student/quiz/${quiz.id}/results`, {
          replace: true,
          state: {
            quizTitle: quiz.title,
            lessonId: quiz.prerequisiteLessonId || null,
            quizResults,
            studentAnswers,
            totalQuestions
          }
        });
      } catch (resolveError) {
        if (!isMounted) {
          return;
        }

        resultsNavigationRef.current = true;
        navigate(`/student/quiz/${quiz.id}/results`, {
          replace: true,
          state: {
            quizTitle: quiz.title,
            lessonId: quiz.prerequisiteLessonId || null,
            quizResults: null,
            studentAnswers,
            totalQuestions,
            resultsLoadError:
              resolveError?.response?.data?.message || 'Unable to load server-aggregated quiz results.'
          }
        });
      }
    };

    resolveResults();

    return () => {
      isMounted = false;
    };
  }, [isComplete, navigate, quiz, studentAnswers, totalQuestions]);

  const summary = useMemo(() => {
    const correct = studentAnswers.filter((entry) => entry.isCorrect === true).length;
    const pending = studentAnswers.filter((entry) => entry.pendingSync).length;
    const xpEarned = studentAnswers.reduce((sum, entry) => sum + (entry.xpAwarded || 0), 0);

    return {
      attempted: studentAnswers.length,
      correct,
      pending,
      xpEarned
    };
  }, [studentAnswers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">Quiz Unavailable</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={loadQuiz}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <h1 className="mt-6 text-3xl font-extrabold text-slate-900">Quiz Complete</h1>
            <p className="mt-2 text-slate-600">Calculating your final score and preparing the review screen...</p>
            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
          </div>

          {!isResolvingResults && error && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={loadQuiz}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Retake Quiz
              </button>
              <button
                type="button"
                onClick={() => navigate('/student/dashboard')}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const quizMode = resolveQuizMode({ gradeLevel, quizType: quiz?.quizType });
  const quizModeLabel = QUIZ_MODE_LABELS[quizMode] || 'Adaptive Quiz Mode';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/student/dashboard')}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-100"
        >
          ← Back to Dashboard
        </button>
        <div className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 shadow">
          Grade {gradeLevel} • {quizModeLabel}
        </div>
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-4 rounded-2xl bg-white p-5 shadow">
          <h1 className="text-2xl font-extrabold text-slate-900">{quiz?.title}</h1>
          {lastSubmissionMessage && (
            <p className="mt-2 text-sm font-medium text-slate-600">{lastSubmissionMessage}</p>
          )}
          {error && (
            <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
          )}
        </div>

        {quizMode === QUIZ_TYPE_VALUES.BALLOON ? (
          <InteractiveBalloonGame
            key={currentQuestion?.id || `q-${currentQuestionIndex}`}
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            correctAnswersCount={summary.correct}
            isSubmitting={isSubmitting}
            onSelectAnswer={handleAnswerSelection}
            onAnswerAnimationComplete={handleAnswerAnimationComplete}
          />
        ) : quizMode === QUIZ_TYPE_VALUES.DRAG_AND_DROP ? (
          <DragDropQuizUI
            key={currentQuestion?.id || `q-${currentQuestionIndex}`}
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            correctAnswersCount={summary.correct}
            isSubmitting={isSubmitting}
            onSelectAnswer={handleAnswerSelection}
            onAnswerAnimationComplete={handleAnswerAnimationComplete}
            timeLimitSeconds={40}
          />
        ) : quizMode === QUIZ_TYPE_VALUES.PUZZLE ? (
          <PuzzleQuizUI
            key={currentQuestion?.id || `q-${currentQuestionIndex}`}
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            correctAnswersCount={summary.correct}
            isSubmitting={isSubmitting}
            onSelectAnswer={handleAnswerSelection}
            onAnswerAnimationComplete={handleAnswerAnimationComplete}
            timeLimitSeconds={40}
          />
        ) : quizMode === QUIZ_TYPE_VALUES.STANDARD ? (
          <YoungLearnerStandardQuizUI
            key={currentQuestion?.id || `q-${currentQuestionIndex}`}
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            correctAnswersCount={summary.correct}
            isSubmitting={isSubmitting}
            onSelectAnswer={handleAnswerSelection}
            onAnswerAnimationComplete={handleAnswerAnimationComplete}
            timeLimitSeconds={35}
          />
        ) : (
          <StandardQuizUI
            key={currentQuestion?.id || `q-${currentQuestionIndex}`}
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            correctAnswersCount={summary.correct}
            isSubmitting={isSubmitting}
            onSelectAnswer={handleAnswerSelection}
            onAnswerAnimationComplete={handleAnswerAnimationComplete}
            timeLimitSeconds={30}
          />
        )}
      </div>
    </div>
  );
}

export default QuizEngine;
