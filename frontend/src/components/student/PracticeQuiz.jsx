import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/apiClient';
import { savePracticeAttemptOffline } from '../../services/indexedDBService';
import { FIDEL_FAMILIES } from './fidelLibrary';
import { NUMERACY_PRACTICE_QUESTIONS } from './practiceQuizData';
import YoungLearnerStandardQuizUI from './YoungLearnerStandardQuizUI';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const parseContentBody = (contentBody) => {
  if (!contentBody) return null;
  if (typeof contentBody === 'object') return contentBody;

  try {
    return JSON.parse(contentBody);
  } catch {
    return null;
  }
};

const normalizeOptionValues = (rawOptions) => {
  if (!rawOptions) return [];

  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option) => String(option ?? '').trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return OPTION_LABELS.map((label) =>
    String(rawOptions[label] ?? rawOptions[label.toLowerCase()] ?? '').trim()
  ).filter(Boolean);
};

const normalizePracticeQuestions = (rawQuestions = []) =>
  rawQuestions
    .map((question, index) => {
      const questionText = String(question?.questionText || question?.question || '').trim();
      if (!questionText) {
        return null;
      }

      const rawOptions = question?.options || question?.choices;
      const options = normalizeOptionValues(rawOptions);
      if (options.length !== 4) {
        return null;
      }

      const optionMap = OPTION_LABELS.reduce((acc, label, optionIndex) => {
        acc[label] = options[optionIndex] || '';
        return acc;
      }, {});

      const normalizedCorrectOption = String(question?.correctOption || 'A').trim().toUpperCase();
      const correctAnswer = String(
        question?.correctAnswer || optionMap[normalizedCorrectOption] || options[0] || ''
      ).trim();

      return {
        id: question?.questionId || question?.id || `practice-${index + 1}`,
        questionId: question?.questionId || question?.id || null,
        questionText,
        options,
        correctOption: normalizedCorrectOption,
        correctAnswer,
        difficulty: question?.difficulty || 'medium',
        imageUrl: question?.imageUrl || null,
        audioUrl: question?.audioUrl || null
      };
    })
    .filter(Boolean);

const shuffleArray = (items = []) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildFidelPracticeQuestions = () => {
  const familyMap = new Map(FIDEL_FAMILIES.map((family) => [family.id, family]));

  const getLetterGlyph = (familyId, orderIndex) =>
    familyMap.get(familyId)?.letters?.[orderIndex]?.glyph || '';

  const getLetterPronunciation = (familyId, orderIndex) =>
    familyMap.get(familyId)?.letters?.[orderIndex]?.pronunciation || '';

  const buildWordFromParts = (parts = []) =>
    parts.map((part) => getLetterGlyph(part.familyId, part.orderIndex)).join('');

  const wordCombos = [
    {
      parts: [
        { familyId: 'b', orderIndex: 4 },
        { familyId: 't', orderIndex: 5 }
      ]
    },
    {
      parts: [
        { familyId: 'b', orderIndex: 1 },
        { familyId: 'n', orderIndex: 3 }
      ]
    },
    {
      parts: [
        { familyId: 'l', orderIndex: 5 },
        { familyId: 'j', orderIndex: 5 }
      ]
    },
    {
      parts: [
        { familyId: 'glottal', orderIndex: 5 },
        { familyId: 'h', orderIndex: 5 },
        { familyId: 't', orderIndex: 5 }
      ]
    },
    {
      parts: [
        { familyId: 'w', orderIndex: 5 },
        { familyId: 'h', orderIndex: 3 }
      ]
    },
    {
      parts: [
        { familyId: 'glottal', orderIndex: 0 },
        { familyId: 'b', orderIndex: 3 },
        { familyId: 't', orderIndex: 5 }
      ]
    },
    {
      parts: [
        { familyId: 'glottal', orderIndex: 5 },
        { familyId: 'n', orderIndex: 3 },
        { familyId: 't', orderIndex: 5 }
      ]
    },
    {
      parts: [
        { familyId: 'h', orderIndex: 0 },
        { familyId: 'g', orderIndex: 0 },
        { familyId: 'r', orderIndex: 5 }
      ]
    }
  ];

  const wordQuestions = wordCombos
    .map((combo, index) => {
      const correctWord = buildWordFromParts(combo.parts);
      if (!correctWord) {
        return null;
      }

      const distractors = wordCombos
        .filter((_, comboIndex) => comboIndex !== index)
        .map((entry) => buildWordFromParts(entry.parts))
        .filter(Boolean)
        .slice(0, 3);

      const options = shuffleArray([correctWord, ...distractors]).slice(0, 4);

      return {
        questionText: `Build the word: ${combo.parts.map((part) => getLetterGlyph(part.familyId, part.orderIndex)).join(' + ')}`,
        options,
        correctAnswer: correctWord,
        difficulty: 'easy'
      };
    })
    .filter(Boolean);

  const letterPrompts = [
    { familyId: 'h', orderIndex: 0 },
    { familyId: 'm', orderIndex: 0 },
    { familyId: 's', orderIndex: 0 },
    { familyId: 'b', orderIndex: 0 },
    { familyId: 'k', orderIndex: 0 },
    { familyId: 'r', orderIndex: 0 },
    { familyId: 't', orderIndex: 0 },
    { familyId: 'n', orderIndex: 0 },
    { familyId: 'g', orderIndex: 0 },
    { familyId: 'w', orderIndex: 0 }
  ];

  const letterQuestions = letterPrompts
    .map((prompt, index) => {
      const correctGlyph = getLetterGlyph(prompt.familyId, prompt.orderIndex);
      const correctPronunciation = getLetterPronunciation(prompt.familyId, prompt.orderIndex);
      if (!correctGlyph || !correctPronunciation) {
        return null;
      }

      const distractors = letterPrompts
        .filter((_, promptIndex) => promptIndex !== index)
        .map((entry) => getLetterGlyph(entry.familyId, entry.orderIndex))
        .filter(Boolean)
        .slice(0, 3);

      const options = shuffleArray([correctGlyph, ...distractors]).slice(0, 4);

      return {
        questionText: `Which glyph matches the sound "${correctPronunciation}"?`,
        options,
        correctAnswer: correctGlyph,
        difficulty: 'easy'
      };
    })
    .filter(Boolean);

  return [...wordQuestions, ...letterQuestions].slice(0, 16);
};

function PracticeQuiz({ moduleId, moduleTitle, variant }) {
  const [quizMeta, setQuizMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [answers, setAnswers] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex] || null;
  const isComplete = totalQuestions > 0 && currentQuestionIndex >= totalQuestions;

  const questionBank = useMemo(() => {
    if (variant === 'numeracy') {
      return NUMERACY_PRACTICE_QUESTIONS;
    }

    if (variant === 'fidel') {
      return buildFidelPracticeQuestions();
    }

    return null;
  }, [variant]);

  const loadPracticeQuiz = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setStatusMessage('');

    if (questionBank) {
      const normalizedQuestions = normalizePracticeQuestions(questionBank);
      setQuizMeta({
        id: moduleId || variant || 'practice',
        title: moduleTitle || 'Practice Quiz'
      });
      setQuestions(normalizedQuestions);
      setCurrentQuestionIndex(0);
      setQuestionStartedAt(Date.now());
      setAnswers([]);
      setCorrectCount(0);
      setIsLoading(false);
      return;
    }

    if (!moduleId) {
      setQuestions([]);
      setQuizMeta(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get(`/content/items/module/${moduleId}`);
      const items = Array.isArray(response?.data?.data) ? response.data.data : [];
      const quizItems = items.filter((item) => item?.itemType === 'Quiz');

      const quizCandidate = quizItems.find((item) => {
        const parsedBody = parseContentBody(item?.contentBody);
        return Array.isArray(parsedBody?.questions) && parsedBody.questions.length > 0;
      });

      if (!quizCandidate) {
        setQuizMeta(null);
        setQuestions([]);
        return;
      }

      const parsedBody = parseContentBody(quizCandidate.contentBody);
      const normalizedQuestions = normalizePracticeQuestions(parsedBody?.questions || []);

      if (normalizedQuestions.length === 0) {
        setQuizMeta(null);
        setQuestions([]);
        return;
      }

      setQuizMeta({
        id: quizCandidate.id,
        title: quizCandidate.title || `${moduleTitle || 'Practice'} Quiz`
      });
      setQuestions(normalizedQuestions);
      setCurrentQuestionIndex(0);
      setQuestionStartedAt(Date.now());
      setAnswers([]);
      setCorrectCount(0);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Unable to load practice quiz right now.');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, moduleTitle, questionBank, variant]);

  useEffect(() => {
    loadPracticeQuiz();
  }, [loadPracticeQuiz]);

  const accuracyPercent = useMemo(() => {
    if (answers.length === 0) return 0;
    return Math.round((correctCount / answers.length) * 100);
  }, [answers.length, correctCount]);

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setQuestionStartedAt(Date.now());
    setAnswers([]);
    setCorrectCount(0);
    setStatusMessage('');
  };

  const handleAnswer = useCallback(
    async (selectedAnswer, meta = {}) => {
      if (!currentQuestion || !quizMeta || isSubmitting) {
        return { ok: false };
      }

      setIsSubmitting(true);

      const timeTakenSeconds =
        Number.isFinite(Number(meta?.timeTakenSeconds)) && Number(meta?.timeTakenSeconds) > 0
          ? Number(meta.timeTakenSeconds)
          : Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));

      const normalizedSelected = String(selectedAnswer || '').trim().toLowerCase();
      const normalizedCorrect = String(currentQuestion.correctAnswer || '').trim().toLowerCase();
      const isCorrect = normalizedCorrect.length > 0 && normalizedSelected === normalizedCorrect;

      const answerPayload = {
        questionId: currentQuestion.questionId,
        contentItemId: quizMeta.id,
        answerText: selectedAnswer,
        timeTakenSeconds,
        difficulty: currentQuestion.difficulty || 'medium',
        attemptTimestamp: new Date().toISOString()
      };

      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.questionId,
          answerText: selectedAnswer,
          isCorrect,
          timeTakenSeconds
        }
      ]);

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }

      try {
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

        if (isOffline) {
          await savePracticeAttemptOffline({
            ...answerPayload,
            quizId: quizMeta.id,
            moduleId,
            isCorrect
          });
          setStatusMessage('Saved offline on this device.');
        }
      } catch (submitError) {
        setStatusMessage('Unable to save this answer right now.');
      } finally {
        setIsSubmitting(false);
      }

      return { ok: true, isCorrect };
    },
    [currentQuestion, isSubmitting, moduleId, questionStartedAt, quizMeta]
  );

  const handleAnswerAnimationComplete = useCallback(() => {
    setStatusMessage('');
    setCurrentQuestionIndex((prev) => prev + 1);
    setQuestionStartedAt(Date.now());
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
        Loading practice quiz...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!quizMeta || questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Practice quiz content will appear here once it is available.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Practice Quiz</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">{quizMeta.title}</h3>
          {moduleTitle && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cyan-600">
              {moduleTitle}
            </p>
          )}
        </div>
        <div className="rounded-full bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700">
          {isComplete ? 'Complete' : `Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
        </div>
      </div>

      {isComplete ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-lg font-black text-emerald-800">Practice complete!</p>
          <p className="mt-2 text-sm text-emerald-700">
            You answered {correctCount} out of {totalQuestions} correctly ({accuracyPercent}%).
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Practice again
          </button>
        </div>
      ) : (
        <YoungLearnerStandardQuizUI
          key={currentQuestion?.id || `practice-${currentQuestionIndex}`}
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          correctAnswersCount={correctCount}
          isSubmitting={isSubmitting}
          onSelectAnswer={handleAnswer}
          onAnswerAnimationComplete={handleAnswerAnimationComplete}
        />
      )}

      {statusMessage && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          {statusMessage}
        </div>
      )}
    </section>
  );
}

export default PracticeQuiz;
