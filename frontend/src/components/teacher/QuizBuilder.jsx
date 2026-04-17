import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient';

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

const QUIZ_TYPE_VALUES = {
  STANDARD: 'standard_multiple_choice',
  BALLOON: 'balloon_pop',
  DRAG_AND_DROP: 'drag_and_drop',
  PUZZLE: 'puzzle',
  KAHOOT: 'kahoot_standard'
};

const YOUNG_GRADE_QUIZ_TYPE_OPTIONS = [
  { value: QUIZ_TYPE_VALUES.STANDARD, label: 'Standard Multiple Choice' },
  { value: QUIZ_TYPE_VALUES.BALLOON, label: 'Balloon Pop' },
  { value: QUIZ_TYPE_VALUES.DRAG_AND_DROP, label: 'Drag-and-Drop' },
  { value: QUIZ_TYPE_VALUES.PUZZLE, label: 'Puzzle Challenge' }
];

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

const normalizeQuizTypeSelection = (quizType) => {
  if (quizType === undefined || quizType === null) return null;

  const normalizedInput = String(quizType)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return QUIZ_TYPE_ALIASES[normalizedInput] || null;
};

const resolveDefaultQuizTypeForGrade = (gradeLevel) => {
  const gradeNumber = Number(gradeLevel);
  if (Number.isInteger(gradeNumber) && gradeNumber >= 5) {
    return QUIZ_TYPE_VALUES.KAHOOT;
  }

  return QUIZ_TYPE_VALUES.BALLOON;
};

const resolveQuizTypeForGrade = (gradeLevel, quizType) => {
  const gradeNumber = Number(gradeLevel);
  if (Number.isInteger(gradeNumber) && gradeNumber >= 5) {
    return QUIZ_TYPE_VALUES.KAHOOT;
  }

  const normalizedType = normalizeQuizTypeSelection(quizType);
  if (!normalizedType || normalizedType === QUIZ_TYPE_VALUES.KAHOOT) {
    return QUIZ_TYPE_VALUES.BALLOON;
  }

  return normalizedType;
};

const createQuestionLocalId = (seed = 0) => `${Date.now()}-${Math.random()}-${seed}`;

const createEmptyQuestion = (seed = 1) => ({
  localId: createQuestionLocalId(seed),
  questionId: null,
  questionText: '',
  correctOption: 'A',
  options: {
    A: '',
    B: '',
    C: '',
    D: ''
  }
});

const parseGradeLevel = (gradeLevelValue) => {
  if (!gradeLevelValue) return null;

  const numericMatch = String(gradeLevelValue).match(/\d+/);
  if (!numericMatch) return null;

  const parsed = Number(numericMatch[0]);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) return null;

  return String(parsed);
};

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const resolveCorrectOptionFromChoices = (choiceMap, correctAnswer, fallback = 'A') => {
  const normalizedCorrectAnswer = String(correctAnswer || '').trim().toLowerCase();
  if (!normalizedCorrectAnswer) {
    return fallback;
  }

  const matched = CHOICE_LABELS.find(
    (label) => String(choiceMap[label] || '').trim().toLowerCase() === normalizedCorrectAnswer
  );

  return matched || fallback;
};

const mapContentPayloadQuestions = (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return [];
  }

  return questions.map((question, index) => {
    const options = { A: '', B: '', C: '', D: '' };

    if (Array.isArray(question?.options)) {
      CHOICE_LABELS.forEach((label, optionIndex) => {
        options[label] = String(question.options[optionIndex] || '').trim();
      });
    } else if (question?.options && typeof question.options === 'object') {
      CHOICE_LABELS.forEach((label) => {
        options[label] = String(question.options[label] || question.options[label.toLowerCase()] || '').trim();
      });
    } else if (Array.isArray(question?.choices)) {
      question.choices.forEach((entry, choiceIndex) => {
        if (typeof entry === 'string') {
          const label = CHOICE_LABELS[choiceIndex];
          if (label) options[label] = String(entry).trim();
          return;
        }

        const label = String(entry?.label || '').trim().toUpperCase();
        if (!CHOICE_LABELS.includes(label)) return;

        options[label] = String(entry?.text || entry?.value || '').trim();
      });
    }

    const correctOption = CHOICE_LABELS.includes(String(question?.correctOption || '').toUpperCase())
      ? String(question.correctOption).toUpperCase()
      : resolveCorrectOptionFromChoices(options, question?.correctAnswer, 'A');

    return {
      localId: createQuestionLocalId(index + 1),
      questionId: Number(question?.questionId || question?.id) || null,
      questionText: String(question?.questionText || question?.question || '').trim(),
      correctOption,
      options
    };
  });
};

function QuizBuilder() {
  const location = useLocation();

  const [assignedClasses, setAssignedClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [classId, setClassId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [targetGradeLevel, setTargetGradeLevel] = useState('1');
  const [quizType, setQuizType] = useState(QUIZ_TYPE_VALUES.BALLOON);
  const [sequenceOrder, setSequenceOrder] = useState('1');
  const [prerequisiteLessonId, setPrerequisiteLessonId] = useState('');
  const [questions, setQuestions] = useState([createEmptyQuestion(1)]);

  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryClassId = queryParams.get('classId');
  const queryModuleId = queryParams.get('moduleId');
  const queryQuizId = queryParams.get('quizId');
  const mode = String(queryParams.get('mode') || '').toLowerCase();
  const isEditMode = mode === 'edit' && Boolean(queryQuizId);

  const selectedClass = useMemo(
    () => assignedClasses.find((classItem) => String(classItem.id) === String(classId)) || null,
    [assignedClasses, classId]
  );

  const targetGradeNumber = Number(targetGradeLevel);
  const isUpperGradeQuiz = Number.isInteger(targetGradeNumber) && targetGradeNumber >= 5;

  const updateQuestion = (localId, fieldName, value) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.localId === localId ? { ...question, [fieldName]: value } : question
      )
    );
  };

  const updateQuestionOption = (localId, label, value) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.localId === localId
          ? {
              ...question,
              options: {
                ...question.options,
                [label]: value
              }
            }
          : question
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1)]);
  };

  const removeQuestion = (localId) => {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((question) => question.localId !== localId);
    });
  };

  const resetQuestions = () => {
    setQuestions([createEmptyQuestion(1)]);
  };

  useEffect(() => {
    const loadAssignedClasses = async () => {
      setIsLoadingClasses(true);
      setError('');

      try {
        const { data } = await apiClient.get('/content/teacher/classes');
        const classList = data?.data || [];
        setAssignedClasses(classList);

        if (classList.length === 0) {
          setClassId('');
          return;
        }

        const hasQueryClass = classList.some((classItem) => String(classItem.id) === String(queryClassId));
        const resolvedClassId = hasQueryClass ? String(queryClassId) : String(classList[0].id);
        setClassId(resolvedClassId);

        if (!isEditMode) {
          const resolvedClass = classList.find((classItem) => String(classItem.id) === resolvedClassId) || null;
          const parsedGrade = parseGradeLevel(resolvedClass?.gradeLevel);
          if (parsedGrade) setTargetGradeLevel(parsedGrade);
        }
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load assigned classes.');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadAssignedClasses();
  }, [isEditMode, queryClassId]);

  useEffect(() => {
    if (!classId) {
      setModules([]);
      setModuleId('');
      setLessons([]);
      return;
    }

    const loadModules = async () => {
      setIsLoadingModules(true);
      setError('');

      try {
        const { data } = await apiClient.get(`/content/modules/class/${classId}`);
        const moduleList = data?.data || [];
        setModules(moduleList);

        if (moduleList.length === 0) {
          setModuleId('');
          setLessons([]);
          return;
        }

        setModuleId((currentModuleId) => {
          if (currentModuleId && moduleList.some((module) => String(module.id) === String(currentModuleId))) {
            return String(currentModuleId);
          }

          const hasQueryModule = moduleList.some((module) => String(module.id) === String(queryModuleId));
          if (hasQueryModule) {
            return String(queryModuleId);
          }

          return String(moduleList[0].id);
        });
      } catch (moduleError) {
        setError(moduleError?.response?.data?.message || 'Failed to load modules for the selected class.');
      } finally {
        setIsLoadingModules(false);
      }
    };

    loadModules();
  }, [classId, queryModuleId]);

  useEffect(() => {
    if (!moduleId) {
      setLessons([]);
      setPrerequisiteLessonId('');
      return;
    }

    const loadLessons = async () => {
      setIsLoadingLessons(true);

      try {
        const { data } = await apiClient.get(`/content/modules/${moduleId}/lessons`);
        const lessonItems = data?.data || [];
        setLessons(lessonItems);

        setPrerequisiteLessonId((currentLessonId) => {
          const stillValid = lessonItems.some((lesson) => String(lesson.id) === String(currentLessonId));
          return stillValid ? currentLessonId : '';
        });
      } catch (lessonError) {
        setLessons([]);
        setError(lessonError?.response?.data?.message || 'Failed to load lessons for prerequisite linking.');
      } finally {
        setIsLoadingLessons(false);
      }
    };

    loadLessons();
  }, [moduleId]);

  useEffect(() => {
    if (!isEditMode || !queryQuizId || hasLoadedEditData) {
      return;
    }

    let isMounted = true;

    const loadQuizForEdit = async () => {
      setIsLoadingQuiz(true);
      setError('');

      try {
        const { data: renderResponse } = await apiClient.get(`/quiz/render/${queryQuizId}`);
        const renderData = renderResponse?.data || {};
        const resolvedModuleId = String(renderData?.moduleId || queryModuleId || '');

        if (resolvedModuleId) {
          setModuleId(resolvedModuleId);
        }

        const [itemsResponse, questionDetails] = await Promise.all([
          resolvedModuleId
            ? apiClient.get(`/content/items/module/${resolvedModuleId}`)
            : Promise.resolve({ data: { data: [] } }),
          Promise.all(
            (renderData?.questions || []).map(async (question) => {
              if (!question?.questionId) {
                return null;
              }

              try {
                const detailResponse = await apiClient.get(`/quiz/questions/${question.questionId}`);
                return detailResponse.data?.data || null;
              } catch {
                return null;
              }
            })
          )
        ]);

        if (!isMounted) {
          return;
        }

        const moduleItems = itemsResponse?.data?.data || [];
        const quizItem = moduleItems.find((item) => String(item.id) === String(queryQuizId)) || null;
        const quizPayload = safeParseJson(quizItem?.contentBody) || {};
        const resolvedQuizType = normalizeQuizTypeSelection(
          quizPayload?.quizType || quizItem?.quizType || renderData?.quizType
        );

        const payloadQuestions = mapContentPayloadQuestions(quizPayload?.questions);
        let preparedQuestions = payloadQuestions;

        if (preparedQuestions.length === 0) {
          preparedQuestions = (renderData?.questions || []).map((renderQuestion, index) => {
            const detail = questionDetails[index];

            if (detail) {
              return {
                localId: createQuestionLocalId(index + 1),
                questionId: detail.id,
                questionText: String(detail.questionText || '').trim(),
                correctOption: 'A',
                options: {
                  A: String(detail.correctAnswer || '').trim(),
                  B: String(detail.distractor1 || '').trim(),
                  C: String(detail.distractor2 || '').trim(),
                  D: String(detail.distractor3 || '').trim()
                }
              };
            }

            const fallbackOptions = {
              A: String(renderQuestion?.options?.[0] || '').trim(),
              B: String(renderQuestion?.options?.[1] || '').trim(),
              C: String(renderQuestion?.options?.[2] || '').trim(),
              D: String(renderQuestion?.options?.[3] || '').trim()
            };

            return {
              localId: createQuestionLocalId(index + 1),
              questionId: Number(renderQuestion?.questionId) || null,
              questionText: String(renderQuestion?.questionText || '').trim(),
              correctOption: resolveCorrectOptionFromChoices(
                fallbackOptions,
                quizPayload?.correctAnswer,
                'A'
              ),
              options: fallbackOptions
            };
          });
        }

        const resolvedGradeLevel =
          parseGradeLevel(quizPayload?.targetGradeLevel) ||
          parseGradeLevel(renderData?.targetGradeLevel) ||
          parseGradeLevel(renderData?.studentGradeLevel);

        const gradeForQuizType = resolvedGradeLevel || '1';

        setQuizTitle(String(quizItem?.title || renderData?.title || '').trim());
        setSequenceOrder(String(quizItem?.sequenceOrder || 1));
        setPrerequisiteLessonId(String(quizPayload?.prerequisiteLessonId || quizItem?.prerequisiteLessonId || ''));
        if (resolvedGradeLevel) {
          setTargetGradeLevel(resolvedGradeLevel);
        }
        setQuizType(resolveQuizTypeForGrade(gradeForQuizType, resolvedQuizType));
        setQuestions(preparedQuestions.length > 0 ? preparedQuestions : [createEmptyQuestion(1)]);
        setHasLoadedEditData(true);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError?.response?.data?.message || 'Failed to load quiz for editing.');
      } finally {
        if (isMounted) {
          setIsLoadingQuiz(false);
        }
      }
    };

    loadQuizForEdit();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedEditData, isEditMode, queryModuleId, queryQuizId]);

  useEffect(() => {
    setQuizType((currentType) => resolveQuizTypeForGrade(targetGradeLevel, currentType));
  }, [targetGradeLevel]);

  const resetBuilder = () => {
    setQuizTitle('');
    setSequenceOrder('1');
    setQuizType(resolveDefaultQuizTypeForGrade(targetGradeLevel));
    if (!isEditMode) {
      setPrerequisiteLessonId('');
    }
    resetQuestions();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!classId) {
      setError('Select a class section before saving this quiz.');
      return;
    }

    if (!moduleId) {
      setError('Select a module before saving this quiz.');
      return;
    }

    if (!quizTitle.trim()) {
      setError('Quiz title is required.');
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      setError('At least one question is required.');
      return;
    }

    const normalizedQuestions = [];

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const questionText = String(question?.questionText || '').trim();

      if (!questionText) {
        setError(`Question ${index + 1} is missing text content.`);
        return;
      }

      const choiceMap = CHOICE_LABELS.reduce((acc, label) => {
        acc[label] = String(question?.options?.[label] || '').trim();
        return acc;
      }, {});

      const hasAllChoices = CHOICE_LABELS.every((label) => choiceMap[label].length > 0);
      if (!hasAllChoices) {
        setError(`Question ${index + 1} must include all 4 options.`);
        return;
      }

      const hasDistinctChoices =
        new Set(CHOICE_LABELS.map((label) => choiceMap[label].toLowerCase())).size === 4;

      if (!hasDistinctChoices) {
        setError(`Question ${index + 1} options must be distinct values.`);
        return;
      }

      const correctOption = String(question?.correctOption || '').toUpperCase();
      if (!CHOICE_LABELS.includes(correctOption)) {
        setError(`Question ${index + 1} must have one correct answer selected.`);
        return;
      }

      normalizedQuestions.push({
        ...(question?.questionId ? { id: Number(question.questionId) } : {}),
        sequenceOrder: index + 1,
        questionText,
        options: choiceMap,
        correctOption
      });
    }

    const payload = {
      moduleId: Number(moduleId),
      title: quizTitle.trim(),
      targetGradeLevel: Number(targetGradeLevel),
      quizType: resolveQuizTypeForGrade(targetGradeLevel, quizType),
      sequenceOrder: Number(sequenceOrder) || 1,
      questions: normalizedQuestions,
      prerequisiteLessonId: prerequisiteLessonId ? Number(prerequisiteLessonId) : null
    };

    setIsSubmitting(true);

    try {
      const response = isEditMode
        ? await apiClient.put(`/content/quiz/${queryQuizId}`, payload)
        : await apiClient.post('/content/quiz', payload);

      const savedQuizId = response?.data?.quizId || response?.data?.data?.id || queryQuizId;
      setNotice(
        isEditMode
          ? `Quiz updated successfully. Quiz ID: ${savedQuizId}`
          : `Quiz created successfully. Quiz ID: ${savedQuizId}`
      );

      if (!isEditMode) {
        resetBuilder();
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Failed to save quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            {isEditMode ? 'Edit Quiz' : 'Quiz Builder'}
          </h1>
          <p className="mt-2 text-gray-600">
            Build multi-question quizzes with a smooth, card-based flow similar to the Lesson Builder.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-md">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="classId" className="mb-2 block text-sm font-semibold text-gray-700">
              Class Section
            </label>
            <select
              id="classId"
              value={classId}
              onChange={(event) => {
                const nextClassId = event.target.value;
                setClassId(nextClassId);

                if (!isEditMode) {
                  const nextClass = assignedClasses.find(
                    (classItem) => String(classItem.id) === String(nextClassId)
                  );
                  const parsedGrade = parseGradeLevel(nextClass?.gradeLevel);
                  if (parsedGrade) {
                    setTargetGradeLevel(parsedGrade);
                  }
                }
              }}
              disabled={isLoadingClasses || assignedClasses.length === 0 || isLoadingQuiz}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              {assignedClasses.length === 0 ? (
                <option value="">No assigned class sections</option>
              ) : (
                assignedClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} {classItem.gradeLevel ? `(${classItem.gradeLevel})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="moduleId" className="mb-2 block text-sm font-semibold text-gray-700">
              Module
            </label>
            <select
              id="moduleId"
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
              disabled={isLoadingModules || modules.length === 0 || isLoadingQuiz}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              {modules.length === 0 ? (
                <option value="">No modules in this class</option>
              ) : (
                modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="targetGradeLevel" className="mb-2 block text-sm font-semibold text-gray-700">
              Target Grade Level
            </label>
            <select
              id="targetGradeLevel"
              value={targetGradeLevel}
              onChange={(event) => setTargetGradeLevel(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              disabled={isLoadingQuiz}
            >
              {Array.from({ length: 8 }).map((_, index) => {
                const gradeValue = String(index + 1);
                return (
                  <option key={gradeValue} value={gradeValue}>
                    Grade {gradeValue}
                  </option>
                );
              })}
            </select>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="quizTitle" className="mb-2 block text-sm font-semibold text-gray-700">
              Quiz Title
            </label>
            <input
              id="quizTitle"
              type="text"
              value={quizTitle}
              onChange={(event) => setQuizTitle(event.target.value)}
              placeholder="Example: Fractions Mastery Check"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              required
              disabled={isLoadingQuiz}
            />
          </div>

          <div>
            <label htmlFor="sequenceOrder" className="mb-2 block text-sm font-semibold text-gray-700">
              Sequence Order
            </label>
            <input
              id="sequenceOrder"
              type="number"
              min="1"
              value={sequenceOrder}
              onChange={(event) => setSequenceOrder(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              disabled={isLoadingQuiz}
            />
          </div>

          <div>
            <label htmlFor="quizType" className="mb-2 block text-sm font-semibold text-gray-700">
              Age-Adaptive Quiz Type
            </label>
            <select
              id="quizType"
              value={quizType}
              onChange={(event) => setQuizType(resolveQuizTypeForGrade(targetGradeLevel, event.target.value))}
              disabled={isLoadingQuiz || isUpperGradeQuiz}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              {isUpperGradeQuiz ? (
                <option value={QUIZ_TYPE_VALUES.KAHOOT}>Kahoot-Style Standard Multiple Choice</option>
              ) : (
                YOUNG_GRADE_QUIZ_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {isUpperGradeQuiz
                ? 'Grades 5-8 are automatically rendered in a standardized Kahoot-style interface.'
                : 'Grades 1-4 can use playful formats: Standard, Balloon Pop, Drag-and-Drop, or Puzzle.'}
            </p>
          </div>
        </section>

        <section>
          <label htmlFor="prerequisiteLessonId" className="mb-2 block text-sm font-semibold text-gray-700">
            Prerequisite Lesson
          </label>
          <select
            id="prerequisiteLessonId"
            value={prerequisiteLessonId}
            onChange={(event) => setPrerequisiteLessonId(event.target.value)}
            disabled={isLoadingLessons || !moduleId || isLoadingQuiz}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          >
            <option value="">No prerequisite lesson</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Students can be sent back to this lesson from post-quiz feedback when they need to review.
          </p>
        </section>

        <section className="mt-6 border-t border-gray-200 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Quiz Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-indigo-700"
              disabled={isLoadingQuiz}
            >
              Add Another Question
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <article key={question.localId} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Question {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.localId)}
                    disabled={questions.length <= 1 || isLoadingQuiz}
                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Question Text</label>
                    <textarea
                      rows={3}
                      value={question.questionText}
                      onChange={(event) => updateQuestion(question.localId, 'questionText', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3"
                      placeholder="Write the question prompt here"
                      disabled={isLoadingQuiz}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    {CHOICE_LABELS.map((label) => (
                      <div
                        key={`${question.localId}-${label}`}
                        className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-[auto_1fr] md:items-center"
                      >
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                          <input
                            type="radio"
                            name={`correct-${question.localId}`}
                            value={label}
                            checked={question.correctOption === label}
                            onChange={(event) => updateQuestion(question.localId, 'correctOption', event.target.value)}
                            disabled={isLoadingQuiz}
                          />
                          Correct ({label})
                        </label>
                        <input
                          type="text"
                          value={question.options[label]}
                          onChange={(event) => updateQuestionOption(question.localId, label, event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2"
                          placeholder={`Option ${label}`}
                          disabled={isLoadingQuiz}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-500">
            Active class: <span className="font-semibold text-gray-700">{selectedClass?.name || 'No class selected'}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isEditMode && (
              <button
                type="button"
                className="btn-secondary"
                onClick={resetBuilder}
                disabled={isSubmitting || isLoadingQuiz}
              >
                Reset Form
              </button>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={
                isSubmitting ||
                isLoadingClasses ||
                isLoadingModules ||
                isLoadingQuiz ||
                !classId ||
                !moduleId ||
                assignedClasses.length === 0
              }
            >
              {isSubmitting
                ? isEditMode
                  ? 'Updating Quiz...'
                  : 'Creating Quiz...'
                : isEditMode
                ? 'Update Quiz'
                : 'Create Quiz'}
            </button>
          </div>
        </section>
      </form>
    </section>
  );
}

export default QuizBuilder;
