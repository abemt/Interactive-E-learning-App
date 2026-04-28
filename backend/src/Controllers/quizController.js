const {
  QuizQuestion,
  ContentItem,
  ContentModule,
  Class,
  ClassCourse,
  StudentAnswer,
  User,
  ScoreLog,
  XPTransaction,
  UserProgress,
  sequelize
} = require("../models");

const DIFFICULTY_MULTIPLIERS = {
  easy: 1,
  medium: 1.25,
  hard: 1.5
};

const IDEAL_TIME_SECONDS = {
  easy: 25,
  medium: 35,
  hard: 50
};

const QUIZ_RENDER_TYPES = {
  STANDARD: "standard_multiple_choice",
  BALLOON: "balloon_pop",
  DRAG_AND_DROP: "drag_and_drop",
  PUZZLE: "puzzle",
  KAHOOT: "kahoot_standard"
};

const QUIZ_TYPE_ALIASES = {
  standard: QUIZ_RENDER_TYPES.STANDARD,
  standard_multiple_choice: QUIZ_RENDER_TYPES.STANDARD,
  multiplechoice: QUIZ_RENDER_TYPES.STANDARD,
  multiple_choice: QUIZ_RENDER_TYPES.STANDARD,
  kahoot: QUIZ_RENDER_TYPES.KAHOOT,
  kahoot_standard: QUIZ_RENDER_TYPES.KAHOOT,
  balloon: QUIZ_RENDER_TYPES.BALLOON,
  balloon_pop: QUIZ_RENDER_TYPES.BALLOON,
  drag_and_drop: QUIZ_RENDER_TYPES.DRAG_AND_DROP,
  dragdrop: QUIZ_RENDER_TYPES.DRAG_AND_DROP,
  "drag-drop": QUIZ_RENDER_TYPES.DRAG_AND_DROP,
  puzzle: QUIZ_RENDER_TYPES.PUZZLE
};

const normalizeDifficulty = (difficulty) => {
  const normalized = String(difficulty || "medium").toLowerCase();
  return DIFFICULTY_MULTIPLIERS[normalized] ? normalized : "medium";
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const safeJsonParse = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const shuffleArray = (items = []) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const extractGradeNumber = (rawValue) => {
  if (rawValue === undefined || rawValue === null) return null;

  const fromNumber = Number(rawValue);
  if (Number.isInteger(fromNumber) && fromNumber >= 1 && fromNumber <= 8) {
    return fromNumber;
  }

  const match = String(rawValue).match(/(\d+)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }

  return parsed;
};

const normalizeQuizRenderType = (rawQuizType) => {
  if (rawQuizType === undefined || rawQuizType === null) {
    return null;
  }

  const normalizedInput = String(rawQuizType)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return QUIZ_TYPE_ALIASES[normalizedInput] || null;
};

const resolveRenderQuizType = ({ storedQuizType, targetGradeLevel }) => {
  const normalizedStoredType = normalizeQuizRenderType(storedQuizType);

  if (Number.isInteger(targetGradeLevel) && targetGradeLevel >= 5) {
    return QUIZ_RENDER_TYPES.KAHOOT;
  }

  if (Number.isInteger(targetGradeLevel) && targetGradeLevel <= 4) {
    if (normalizedStoredType && normalizedStoredType !== QUIZ_RENDER_TYPES.KAHOOT) {
      return normalizedStoredType;
    }

    return QUIZ_RENDER_TYPES.BALLOON;
  }

  return normalizedStoredType || QUIZ_RENDER_TYPES.KAHOOT;
};

const buildQuestionOptions = ({
  correctAnswer,
  distractor1,
  distractor2,
  distractor3,
  incorrectAnswers,
  choices
}) => {
  const choiceValues = Array.isArray(choices)
    ? choices.map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }

        return entry?.text || entry?.value || "";
      })
    : [];

  const options = [
    correctAnswer,
    distractor1,
    distractor2,
    distractor3,
    ...(Array.isArray(incorrectAnswers) ? incorrectAnswers : []),
    ...choiceValues
  ]
    .map((value) => (value === undefined || value === null ? "" : String(value).trim()))
    .filter(Boolean);

  const unique = [...new Set(options)];
  return shuffleArray(unique);
};

const calculateXPBreakdown = ({ isCorrect, basePoints, difficulty, timeTakenSeconds }) => {
  const safeBasePoints = Math.max(1, Number(basePoints) || 10);
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[normalizedDifficulty];
  const idealTime = IDEAL_TIME_SECONDS[normalizedDifficulty];

  const numericTime = Number(timeTakenSeconds);
  const sanitizedTimeTakenSeconds = Number.isFinite(numericTime) && numericTime > 0
    ? numericTime
    : idealTime;

  const rawSpeed = idealTime / Math.max(5, sanitizedTimeTakenSeconds);
  const speedMultiplier = clamp(rawSpeed, 0.6, 1.4);
  const correctnessMultiplier = isCorrect ? 1 : 0;

  const xpAwarded = Math.round(
    safeBasePoints * correctnessMultiplier * speedMultiplier * difficultyMultiplier
  );

  return {
    xpAwarded,
    difficulty: normalizedDifficulty,
    multipliers: {
      correctness: correctnessMultiplier,
      speed: Number(speedMultiplier.toFixed(2)),
      difficulty: difficultyMultiplier
    },
    timeTakenSeconds: Number(sanitizedTimeTakenSeconds.toFixed(2)),
    basePoints: safeBasePoints
  };
};

const hasSuccessfulScoreLog = async ({ userId, contentItemId, transaction }) => {
  const successfulAttempt = await ScoreLog.findOne({
    where: {
      userId,
      contentItemId,
      score: {
        [Op.gte]: 70
      }
    },
    attributes: ["id"],
    transaction
  });

  return Boolean(successfulAttempt);
};

const hasCompletedQuestionBasedQuiz = async ({ userId, contentItemId, transaction }) => {
  const [totalQuestions, answeredRows] = await Promise.all([
    QuizQuestion.count({
      where: { contentItemId },
      transaction
    }),
    StudentAnswer.findAll({
      where: { userId },
      include: [
        {
          model: QuizQuestion,
          as: "question",
          attributes: ["id", "contentItemId"],
          where: { contentItemId },
          required: true
        }
      ],
      attributes: ["questionId"],
      transaction
    })
  ]);

  if (totalQuestions <= 0) {
    return false;
  }

  const distinctAnsweredQuestions = new Set(
    answeredRows
      .map((row) => Number(row.questionId))
      .filter((value) => Number.isInteger(value) && value > 0)
  ).size;

  return distinctAnsweredQuestions >= totalQuestions;
};

const processQuizSubmissionAtomic = async ({
  userId,
  questionId,
  answerText,
  difficulty,
  timeTakenSeconds,
  attemptTimestamp
}) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user) {
      const error = new Error("Student account not found");
      error.statusCode = 404;
      throw error;
    }

    const question = await QuizQuestion.findByPk(questionId, {
      include: [
        {
          model: ContentItem,
          as: "contentItem",
          include: [{ model: ContentModule, as: "module" }]
        }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!question || !question.contentItem || !question.contentItem.module) {
      const error = new Error("Question not found");
      error.statusCode = 404;
      throw error;
    }

    if (question.contentItem.isLocked || question.contentItem.module.isLocked) {
      const error = new Error("This quiz is currently locked by your teacher");
      error.statusCode = 403;
      throw error;
    }

    const normalizedStudentAnswer = String(answerText || "").trim();
    const normalizedCorrectAnswer = String(question.correctAnswer || "").trim();

    const isCorrect =
      normalizedStudentAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase();

    const [alreadyCorrectOnQuestion, alreadyCompletedQuiz] = await Promise.all([
      StudentAnswer.findOne({
        where: {
          userId,
          questionId: question.id,
          isCorrect: true
        },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE
      }),
      hasCompletedQuestionBasedQuiz({
        userId,
        contentItemId: question.contentItem.id,
        transaction
      })
    ]);

    const shouldBlockXp = Boolean(alreadyCorrectOnQuestion) || Boolean(alreadyCompletedQuiz);
    const xpBreakdown = calculateXPBreakdown({
      isCorrect: shouldBlockXp ? false : isCorrect,
      basePoints: question.points,
      difficulty,
      timeTakenSeconds
    });

    const recordedAttemptTime = attemptTimestamp ? new Date(attemptTimestamp) : new Date();

    const studentAnswer = await StudentAnswer.create(
      {
        userId,
        questionId,
        answerText: normalizedStudentAnswer,
        isCorrect,
        pointsAwarded: isCorrect ? question.points : 0,
        attemptTimestamp: recordedAttemptTime
      },
      { transaction }
    );

    const classId = user.classId || question.contentItem.module.classId;
    if (!classId) {
      const error = new Error("Student is not assigned to a class");
      error.statusCode = 400;
      throw error;
    }

    await ScoreLog.create(
      {
        userId,
        classId,
        contentItemId: question.contentItemId,
        score: isCorrect ? 100 : 0,
        attemptedAt: recordedAttemptTime
      },
      { transaction }
    );

    let totalXP = user.totalXP || 0;
    let moduleXP = null;
    if (xpBreakdown.xpAwarded > 0) {
      user.totalXP = totalXP + xpBreakdown.xpAwarded;
      await user.save({ transaction });
      totalXP = user.totalXP;

      const [progress] = await UserProgress.findOrCreate({
        where: {
          userId,
          moduleId: question.contentItem.moduleId
        },
        defaults: {
          userId,
          moduleId: question.contentItem.moduleId,
          currentXP: 0,
          currentLevel: 1,
          completionPercentage: 0,
          lastActivityAt: recordedAttemptTime
        },
        transaction
      });

      progress.currentXP += xpBreakdown.xpAwarded;
      progress.lastActivityAt = recordedAttemptTime;
      await progress.save({ transaction });
      moduleXP = progress.currentXP;

      await XPTransaction.create(
        {
          userId,
          moduleId: question.contentItem.moduleId,
          contentItemId: question.contentItem.id,
          xpAmount: xpBreakdown.xpAwarded,
          reason: "Quiz Submission",
          metadata: {
            questionId: question.id,
            isCorrect,
            basePoints: xpBreakdown.basePoints,
            difficulty: xpBreakdown.difficulty,
            multipliers: xpBreakdown.multipliers,
            timeTakenSeconds: xpBreakdown.timeTakenSeconds
          },
          earnedAt: recordedAttemptTime
        },
        { transaction }
      );
    }

    return {
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
      xpAwarded: xpBreakdown.xpAwarded,
      xpBreakdown,
      totalXP,
      moduleXP,
      answerId: studentAnswer.id,
      questionId: question.id,
      alreadyCompletedQuiz: shouldBlockXp,
      correctAnswer: isCorrect ? undefined : question.correctAnswer
    };
  });
};

const processContentItemSubmissionAtomic = async ({
  userId,
  contentItemId,
  answerText,
  difficulty,
  timeTakenSeconds,
  attemptTimestamp
}) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user) {
      const error = new Error("Student account not found");
      error.statusCode = 404;
      throw error;
    }

    const contentItem = await ContentItem.findByPk(contentItemId, {
      include: [{ model: ContentModule, as: "module" }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!contentItem || contentItem.itemType !== "Quiz" || !contentItem.module) {
      const error = new Error("Quiz content item not found");
      error.statusCode = 404;
      throw error;
    }

    if (contentItem.isLocked || contentItem.module.isLocked) {
      const error = new Error("This quiz is currently locked by your teacher");
      error.statusCode = 403;
      throw error;
    }

    const quizPayload = safeJsonParse(contentItem.contentBody) || {};
    const normalizedCorrectAnswer = String(quizPayload.correctAnswer || "").trim();

    if (!normalizedCorrectAnswer) {
      const error = new Error("Quiz content is missing correctAnswer");
      error.statusCode = 400;
      throw error;
    }

    const normalizedStudentAnswer = String(answerText || "").trim();
    const isCorrect =
      normalizedStudentAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase();

    const alreadySuccessfulQuiz = await hasSuccessfulScoreLog({
      userId,
      contentItemId: contentItem.id,
      transaction
    });

    const payloadDifficulty = difficulty || quizPayload.difficulty || "medium";
    const payloadPoints = Number(quizPayload.points);

    const xpBreakdown = calculateXPBreakdown({
      isCorrect: alreadySuccessfulQuiz ? false : isCorrect,
      basePoints: Number.isFinite(payloadPoints) && payloadPoints > 0 ? payloadPoints : 10,
      difficulty: payloadDifficulty,
      timeTakenSeconds
    });

    const recordedAttemptTime = attemptTimestamp ? new Date(attemptTimestamp) : new Date();
    const classId = user.classId || contentItem.module.classId;

    if (!classId) {
      const error = new Error("Student is not assigned to a class");
      error.statusCode = 400;
      throw error;
    }

    await ScoreLog.create(
      {
        userId,
        classId,
        contentItemId: contentItem.id,
        score: isCorrect ? 100 : 0,
        attemptedAt: recordedAttemptTime
      },
      { transaction }
    );

    let totalXP = user.totalXP || 0;
    let moduleXP = null;
    if (xpBreakdown.xpAwarded > 0) {
      user.totalXP = totalXP + xpBreakdown.xpAwarded;
      await user.save({ transaction });
      totalXP = user.totalXP;

      const [progress] = await UserProgress.findOrCreate({
        where: {
          userId,
          moduleId: contentItem.moduleId
        },
        defaults: {
          userId,
          moduleId: contentItem.moduleId,
          currentXP: 0,
          currentLevel: 1,
          completionPercentage: 0,
          lastActivityAt: recordedAttemptTime
        },
        transaction
      });

      progress.currentXP += xpBreakdown.xpAwarded;
      progress.lastActivityAt = recordedAttemptTime;
      await progress.save({ transaction });
      moduleXP = progress.currentXP;

      await XPTransaction.create(
        {
          userId,
          moduleId: contentItem.moduleId,
          contentItemId: contentItem.id,
          xpAmount: xpBreakdown.xpAwarded,
          reason: "Quiz Submission",
          metadata: {
            questionId: null,
            source: "ContentItemQuiz",
            isCorrect,
            basePoints: xpBreakdown.basePoints,
            difficulty: xpBreakdown.difficulty,
            multipliers: xpBreakdown.multipliers,
            timeTakenSeconds: xpBreakdown.timeTakenSeconds
          },
          earnedAt: recordedAttemptTime
        },
        { transaction }
      );
    }

    return {
      isCorrect,
      pointsAwarded: isCorrect ? xpBreakdown.basePoints : 0,
      xpAwarded: xpBreakdown.xpAwarded,
      xpBreakdown,
      totalXP,
      moduleXP,
      answerId: null,
      questionId: null,
      contentItemId: contentItem.id,
      alreadyCompletedQuiz: Boolean(alreadySuccessfulQuiz),
      correctAnswer: isCorrect ? undefined : normalizedCorrectAnswer
    };
  });
};

/**
 * Quiz Controller
 * Handles quiz question management and student quiz submissions
 */
class QuizController {
  /**
   * Create a new quiz question with optional image and audio files
   * POST /api/quiz/questions
   * Accepts multipart/form-data with:
   *  - image: file (optional)
   *  - audio: file (optional)
   *  - questionText, contentItemId, correctAnswer, etc: JSON fields
   */
  async createQuestion(req, res) {
    try {
      const {
        contentItemId,
        questionText,
        questionType,
        correctAnswer,
        distractor1,
        distractor2,
        distractor3,
        points,
        sequenceOrder
      } = req.body;
      
      const userId = req.user.id;
      const userRole = req.user.role;

      // Validation
      if (!contentItemId || !questionText || !correctAnswer) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: contentItemId, questionText, correctAnswer"
        });
      }

      // Verify content item exists and is a Quiz type
      const contentItem = await ContentItem.findByPk(contentItemId, {
        include: [
          {
            model: ContentModule,
            as: "module",
            include: [{ model: Class, as: "class" }]
          }
        ]
      });

      if (!contentItem) {
        return res.status(404).json({
          success: false,
          message: "Content item not found"
        });
      }

      if (contentItem.itemType !== "Quiz") {
        return res.status(400).json({
          success: false,
          message: "Content item must be of type 'Quiz'"
        });
      }

      // Check permissions
      if (userRole === "Teacher" && contentItem.module.class.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only add questions to your own quizzes"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      // Get file paths from uploaded files
      let imageUrl = null;
      let audioUrl = null;

      if (req.files) {
        if (req.files.image && req.files.image[0]) {
          // Store relative path from uploads directory
          imageUrl = `/uploads/images/${req.files.image[0].filename}`;
        }
        if (req.files.audio && req.files.audio[0]) {
          audioUrl = `/uploads/audio/${req.files.audio[0].filename}`;
        }
      } else if (req.file) {
        // Single file upload (backward compatibility)
        const filePath = req.file.path;
        if (req.file.mimetype.startsWith("image/")) {
          imageUrl = `/uploads/images/${req.file.filename}`;
        } else if (req.file.mimetype.startsWith("audio/")) {
          audioUrl = `/uploads/audio/${req.file.filename}`;
        }
      }

      // Create quiz question
      const question = await QuizQuestion.create({
        contentItemId,
        questionText,
        questionType: questionType || "MultipleChoice",
        imageUrl,
        audioUrl,
        correctAnswer,
        distractor1: distractor1 || null,
        distractor2: distractor2 || null,
        distractor3: distractor3 || null,
        points: points || 10,
        sequenceOrder: sequenceOrder || 1
      });

      return res.status(201).json({
        success: true,
        message: "Quiz question created successfully",
        data: question
      });
    } catch (error) {
      console.error("Error creating quiz question:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating quiz question",
        error: error.message
      });
    }
  }

  /**
   * Get a render-ready quiz payload by quiz/content item id.
   * Supports both QuizQuestion-backed quizzes and ContentItem JSON-backed quizzes.
   * GET /api/quiz/render/:quizId
   */
  async getQuizForRender(req, res) {
    try {
      const { quizId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const contentItem = await ContentItem.findByPk(quizId, {
        include: [{ model: ContentModule, as: "module", include: [{ model: Class, as: "class" }] }]
      });

      if (!contentItem) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }

      if (contentItem.itemType !== "Quiz") {
        return res.status(400).json({
          success: false,
          message: "Requested content item is not a quiz"
        });
      }

      const student = await User.findByPk(userId, {
        attributes: ["id", "role", "classId"]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      let studentGradeLevel = null;

      if (userRole === "Student") {
        if (!student.classId) {
          return res.status(403).json({
            success: false,
            message: "Student is not assigned to a class"
          });
        }

        const classInfo = await Class.findByPk(student.classId, {
          attributes: ["id", "name", "gradeLevel"]
        });

        if (!classInfo) {
          return res.status(404).json({
            success: false,
            message: "Student class not found"
          });
        }

        studentGradeLevel =
          extractGradeNumber(classInfo.gradeLevel) || extractGradeNumber(classInfo.name);

        const explicitAssignmentCount = await ClassCourse.count({
          where: { classId: classInfo.id }
        });

        if (explicitAssignmentCount > 0) {
          const isExplicitlyAssigned = await ClassCourse.findOne({
            where: {
              classId: classInfo.id,
              moduleId: contentItem.moduleId
            }
          });

          if (!isExplicitlyAssigned) {
            return res.status(403).json({
              success: false,
              message: "This quiz is not assigned to your class"
            });
          }
        } else if (Number(contentItem.module?.classId) !== Number(classInfo.id)) {
          return res.status(403).json({
            success: false,
            message: "You do not have access to this quiz"
          });
        }

        if (contentItem.prerequisiteLessonId) {
          const completionRecord = await XPTransaction.findOne({
            where: {
              userId,
              contentItemId: contentItem.prerequisiteLessonId,
              reason: "Lesson Completion"
            },
            attributes: ["id", "earnedAt"]
          });

          if (!completionRecord) {
            return res.status(403).json({
              success: false,
              message: "Complete the prerequisite lesson before taking this quiz.",
              data: {
                prerequisiteLessonId: contentItem.prerequisiteLessonId
              }
            });
          }
        }

        if (contentItem.isLocked || contentItem.module?.isLocked) {
          return res.status(403).json({
            success: false,
            message: "This quiz is currently locked by your teacher"
          });
        }
      }

      const questionRows = await QuizQuestion.findAll({
        where: { contentItemId: contentItem.id },
        order: [["sequenceOrder", "ASC"], ["createdAt", "ASC"]]
      });

      let questions = [];
      const contentBody = safeJsonParse(contentItem.contentBody) || {};
      const targetGradeLevel =
        extractGradeNumber(contentBody.targetGradeLevel) ||
        extractGradeNumber(contentItem.module?.class?.gradeLevel) ||
        null;
      const quizType = resolveRenderQuizType({
        storedQuizType: contentItem.quizType || contentBody.quizType,
        targetGradeLevel
      });

      if (questionRows.length > 0) {
        questions = questionRows.map((question) => ({
          id: question.id,
          questionId: question.id,
          contentItemId: contentItem.id,
          questionText: question.questionText,
          imageUrl: question.imageUrl || null,
          audioUrl: question.audioUrl || null,
          options: buildQuestionOptions({
            correctAnswer: question.correctAnswer,
            distractor1: question.distractor1,
            distractor2: question.distractor2,
            distractor3: question.distractor3
          }),
          difficulty: normalizeDifficulty(contentBody.difficulty || "medium"),
          points: question.points || 10
        }));
      } else {
        const incorrectAnswers = Array.isArray(contentBody.incorrectAnswers)
          ? contentBody.incorrectAnswers
          : [];

        const questionText = String(contentBody.question || contentItem.title || "").trim();
        const options = buildQuestionOptions({
          correctAnswer: contentBody.correctAnswer,
          incorrectAnswers,
          choices: contentBody.choices
        });

        if (!questionText || options.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Quiz content is incomplete"
          });
        }

        const media = contentBody.media || null;

        questions = [
          {
            id: `content-${contentItem.id}-1`,
            questionId: null,
            contentItemId: contentItem.id,
            questionText,
            imageUrl:
              media?.type === "image"
                ? media.url
                : contentItem.contentUrl && /\.(png|jpe?g|gif|webp|svg)$/i.test(contentItem.contentUrl)
                ? contentItem.contentUrl
                : null,
            audioUrl:
              media?.type === "audio"
                ? media.url
                : contentItem.contentUrl && /\.(mp3|wav|ogg|m4a)$/i.test(contentItem.contentUrl)
                ? contentItem.contentUrl
                : null,
            options,
            difficulty: normalizeDifficulty(contentBody.difficulty || "medium"),
            points: Number(contentBody.points) > 0 ? Number(contentBody.points) : 10
          }
        ];
      }

      return res.status(200).json({
        success: true,
        data: {
          quizId: contentItem.id,
          moduleId: contentItem.moduleId,
          title: contentItem.title,
          prerequisiteLessonId: contentItem.prerequisiteLessonId || null,
          targetGradeLevel,
          studentGradeLevel,
          quizType,
          questions,
          questionCount: questions.length
        }
      });
    } catch (error) {
      console.error("Error getting render-ready quiz:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting render-ready quiz",
        error: error.message
      });
    }
  }

  /**
   * Get all questions for a quiz (ContentItem)
   * GET /api/quiz/questions/content/:contentItemId
   */
  async getQuestionsByContentItem(req, res) {
    try {
      const { contentItemId } = req.params;

      const questions = await QuizQuestion.findAll({
        where: { contentItemId },
        order: [["sequenceOrder", "ASC"], ["createdAt", "ASC"]],
        attributes: { exclude: ["correctAnswer"] } // Don't expose correct answer to students initially
      });

      return res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
      });
    } catch (error) {
      console.error("Error getting quiz questions:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting quiz questions",
        error: error.message
      });
    }
  }

  /**
   * Get a single question by ID (for teachers - includes correct answer)
   * GET /api/quiz/questions/:id
   */
  async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.user.role;

      const attributes = userRole === "Teacher" || userRole === "Admin"
        ? undefined // Include all fields including correctAnswer
        : { exclude: ["correctAnswer"] }; // Exclude correctAnswer for students

      const question = await QuizQuestion.findByPk(id, { attributes });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      return res.status(200).json({
        success: true,
        data: question
      });
    } catch (error) {
      console.error("Error getting question:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting question",
        error: error.message
      });
    }
  }

  /**
   * Update a quiz question
   * PUT /api/quiz/questions/:id
   */
  async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const {
        questionText,
        questionType,
        correctAnswer,
        distractor1,
        distractor2,
        distractor3,
        points,
        sequenceOrder
      } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const question = await QuizQuestion.findByPk(id, {
        include: [
          {
            model: ContentItem,
            as: "contentItem",
            include: [
              {
                model: ContentModule,
                as: "module",
                include: [{ model: Class, as: "class" }]
              }
            ]
          }
        ]
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      // Check permissions
      if (userRole === "Teacher" && question.contentItem.module.class.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own questions"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      // Update fields
      if (questionText) question.questionText = questionText;
      if (questionType) question.questionType = questionType;
      if (correctAnswer) question.correctAnswer = correctAnswer;
      if (distractor1 !== undefined) question.distractor1 = distractor1;
      if (distractor2 !== undefined) question.distractor2 = distractor2;
      if (distractor3 !== undefined) question.distractor3 = distractor3;
      if (points !== undefined) question.points = points;
      if (sequenceOrder !== undefined) question.sequenceOrder = sequenceOrder;

      // Handle file updates
      if (req.files) {
        if (req.files.image && req.files.image[0]) {
          question.imageUrl = `/uploads/images/${req.files.image[0].filename}`;
        }
        if (req.files.audio && req.files.audio[0]) {
          question.audioUrl = `/uploads/audio/${req.files.audio[0].filename}`;
        }
      }

      await question.save();

      return res.status(200).json({
        success: true,
        message: "Question updated successfully",
        data: question
      });
    } catch (error) {
      console.error("Error updating question:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating question",
        error: error.message
      });
    }
  }

  /**
   * Delete a quiz question
   * DELETE /api/quiz/questions/:id
   */
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const question = await QuizQuestion.findByPk(id, {
        include: [
          {
            model: ContentItem,
            as: "contentItem",
            include: [
              {
                model: ContentModule,
                as: "module",
                include: [{ model: Class, as: "class" }]
              }
            ]
          }
        ]
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found"
        });
      }

      // Check permissions
      if (userRole === "Teacher" && question.contentItem.module.class.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own questions"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      await question.destroy();

      return res.status(200).json({
        success: true,
        message: "Question deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting question",
        error: error.message
      });
    }
  }

  /**
   * Submit student answer to a quiz question
   * POST /api/quiz/submit-answer
   */
  async submitAnswer(req, res) {
    try {
      const {
        questionId,
        contentItemId,
        answerText,
        timeTakenSeconds,
        timeTakenMs,
        difficulty,
        attemptTimestamp
      } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Only students can submit answers
      if (userRole !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Only students can submit quiz answers"
        });
      }

      // Validation
      if ((!questionId && !contentItemId) || !answerText) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: answerText and either questionId or contentItemId"
        });
      }

      const normalizedTimeTakenSeconds =
        Number.isFinite(Number(timeTakenSeconds)) && Number(timeTakenSeconds) > 0
          ? Number(timeTakenSeconds)
          : Number.isFinite(Number(timeTakenMs)) && Number(timeTakenMs) > 0
          ? Number(timeTakenMs) / 1000
          : undefined;

      const result = questionId
        ? await processQuizSubmissionAtomic({
            userId,
            questionId,
            answerText,
            difficulty,
            timeTakenSeconds: normalizedTimeTakenSeconds,
            attemptTimestamp
          })
        : await processContentItemSubmissionAtomic({
            userId,
            contentItemId,
            answerText,
            difficulty,
            timeTakenSeconds: normalizedTimeTakenSeconds,
            attemptTimestamp
          });

      const isRetakeNoXp = Boolean(result.alreadyCompletedQuiz) && Number(result.xpAwarded) === 0;

      return res.status(201).json({
        success: true,
        message: isRetakeNoXp
          ? "Retake: No XP awarded"
          : result.isCorrect
          ? "Correct answer!"
          : "Incorrect answer",
        data: {
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
          xpAwarded: result.xpAwarded,
          message: isRetakeNoXp ? "Retake: No XP awarded" : undefined,
          totalXP: result.totalXP,
          moduleXP: result.moduleXP,
          alreadyCompletedQuiz: Boolean(result.alreadyCompletedQuiz),
          xpBreakdown: result.xpBreakdown,
          contentItemId: result.contentItemId,
          correctAnswer: result.correctAnswer
        }
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: "Error submitting answer",
        error: error.message
      });
    }
  }

  /**
   * Sync queued offline quiz submissions
   * POST /api/sync
   */
  async syncPendingSubmissions(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      if (userRole !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Only students can sync offline quiz submissions"
        });
      }

      const submissions = Array.isArray(req.body?.quizSubmissions)
        ? req.body.quizSubmissions
        : [];

      if (submissions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "quizSubmissions array is required"
        });
      }

      const results = [];

      for (const submission of submissions) {
        const clientSyncId = submission?.clientSyncId;

        if ((!submission?.questionId && !submission?.contentItemId) || !submission?.answerText) {
          results.push({
            clientSyncId,
            status: "failed",
            message: "Missing required fields: answerText and either questionId or contentItemId"
          });
          continue;
        }

        try {
          const normalizedTimeTakenSeconds =
            Number.isFinite(Number(submission?.timeTakenSeconds)) && Number(submission?.timeTakenSeconds) > 0
              ? Number(submission.timeTakenSeconds)
              : Number.isFinite(Number(submission?.timeTakenMs)) && Number(submission?.timeTakenMs) > 0
              ? Number(submission.timeTakenMs) / 1000
              : undefined;

          const processed = submission.questionId
            ? await processQuizSubmissionAtomic({
                userId,
                questionId: submission.questionId,
                answerText: submission.answerText,
                difficulty: submission.difficulty,
                timeTakenSeconds: normalizedTimeTakenSeconds,
                attemptTimestamp: submission.attemptTimestamp
              })
            : await processContentItemSubmissionAtomic({
                userId,
                contentItemId: submission.contentItemId,
                answerText: submission.answerText,
                difficulty: submission.difficulty,
                timeTakenSeconds: normalizedTimeTakenSeconds,
                attemptTimestamp: submission.attemptTimestamp
              });

          results.push({
            clientSyncId,
            status: "synced",
            questionId: processed.questionId,
            contentItemId: processed.contentItemId,
            xpAwarded: processed.xpAwarded,
            totalXP: processed.totalXP
          });
        } catch (submissionError) {
          results.push({
            clientSyncId,
            status: "failed",
            message: submissionError.message
          });
        }
      }

      const syncedCount = results.filter((entry) => entry.status === "synced").length;

      return res.status(200).json({
        success: true,
        data: {
          received: submissions.length,
          syncedCount,
          failedCount: submissions.length - syncedCount,
          results
        }
      });
    } catch (error) {
      console.error("Error syncing offline submissions:", error);
      return res.status(500).json({
        success: false,
        message: "Error syncing offline submissions",
        error: error.message
      });
    }
  }

  /**
   * Get student's quiz results
   * GET /api/quiz/results/:contentItemId
   */
  async getQuizResults(req, res) {
    try {
      const { contentItemId } = req.params;
      const userId = req.user.id;

      // Get all questions for this quiz
      const questions = await QuizQuestion.findAll({
        where: { contentItemId },
        order: [["sequenceOrder", "ASC"]]
      });

      // Get student's answers
      const questionIds = questions.map(q => q.id);
      const answers = await StudentAnswer.findAll({
        where: {
          userId,
          questionId: questionIds
        },
        include: [{ model: QuizQuestion, as: "question" }]
      });

      // Calculate score
      const totalQuestions = questions.length;
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = answers.reduce((sum, a) => sum + a.pointsAwarded, 0);
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          totalQuestions,
          answeredQuestions: answers.length,
          correctAnswers,
          totalPoints,
          earnedPoints,
          percentage: percentage.toFixed(2),
          answers: answers.map(a => ({
            questionId: a.questionId,
            questionText: a.question.questionText,
            studentAnswer: a.answerText,
            correctAnswer: a.question.correctAnswer,
            isCorrect: a.isCorrect,
            pointsAwarded: a.pointsAwarded
          }))
        }
      });
    } catch (error) {
      console.error("Error getting quiz results:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting quiz results",
        error: error.message
      });
    }
  }
}

module.exports = new QuizController();
