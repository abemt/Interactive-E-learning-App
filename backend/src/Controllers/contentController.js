const { Op } = require("sequelize");
const {
  ContentModule,
  ContentItem,
  Class,
  User,
  TeacherClass,
  ClassCourse,
  QuizQuestion,
  XPTransaction,
  UserProgress,
  ScoreLog,
  sequelize
} = require("../models");
const gpeService = require("../Services/gpeService");

const LESSON_COMPLETION_XP = 15;

const canTeacherAccessClass = async (teacherId, classObj) => {
  if (!classObj) {
    return false;
  }

  if (Number(classObj.teacherId) === Number(teacherId)) {
    return true;
  }

  const assignment = await TeacherClass.findOne({
    where: {
      teacherId,
      classId: classObj.id
    }
  });

  return Boolean(assignment);
};

const canTeacherAccessModule = async (teacherId, moduleObj) => {
  if (!moduleObj?.id) {
    return false;
  }

  if (moduleObj.class && (await canTeacherAccessClass(teacherId, moduleObj.class))) {
    return true;
  }

  const classLinks = await ClassCourse.findAll({
    where: { moduleId: moduleObj.id },
    attributes: ["classId"]
  });

  const linkedClassIds = [...new Set(classLinks.map((row) => row.classId))];
  if (linkedClassIds.length === 0) {
    return false;
  }

  const directOwnerClass = await Class.count({
    where: {
      id: { [Op.in]: linkedClassIds },
      teacherId
    }
  });

  if (directOwnerClass > 0) {
    return true;
  }

  const assignedClass = await TeacherClass.findOne({
    where: {
      teacherId,
      classId: { [Op.in]: linkedClassIds }
    }
  });

  return Boolean(assignedClass);
};

const getTeacherAccessibleClassIds = async (teacherId) => {
  const [linkedAssignments, ownedClasses] = await Promise.all([
    TeacherClass.findAll({
      where: { teacherId },
      attributes: ["classId"]
    }),
    Class.findAll({
      where: { teacherId },
      attributes: ["id"]
    })
  ]);

  return [...new Set([
    ...linkedAssignments.map((row) => row.classId),
    ...ownedClasses.map((row) => row.id)
  ])];
};

const toPlainRow = (value) => (typeof value?.toJSON === "function" ? value.toJSON() : value);

const filterUnlockedModulesForStudents = (modules = []) => {
  return modules
    .map((module) => toPlainRow(module))
    .filter((module) => !module?.isLocked)
    .map((module) => ({
      ...module,
      items: (module?.items || []).filter((item) => !item?.isLocked)
    }));
};

const buildMediaUrlFromUploadedFile = (file) => {
  if (!file?.filename || !file?.mimetype) {
    return null;
  }

  if (file.mimetype.startsWith("image/")) {
    return `/uploads/images/${file.filename}`;
  }

  if (file.mimetype.startsWith("audio/")) {
    return `/uploads/audio/${file.filename}`;
  }

  return null;
};

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const resolveQuarterLabel = (item, indexInModule = 0) => {
  const payload = safeParseJson(item?.contentBody) || {};

  const explicitQuarter = Number(payload?.quarter || payload?.termQuarter || payload?.term);
  if (Number.isInteger(explicitQuarter) && explicitQuarter >= 1 && explicitQuarter <= 4) {
    return `Quarter ${explicitQuarter}`;
  }

  const sequence = Number(item?.sequenceOrder) || indexInModule + 1;
  const fallbackQuarter = Math.min(4, Math.max(1, Math.floor((sequence - 1) / 4) + 1));
  return `Quarter ${fallbackQuarter}`;
};

const getAssignedModulesForClass = async (classObj) => {
  let modules = classObj.assignedModules || [];

  if (modules.length === 0) {
    modules = await ContentModule.findAll({
      where: { classId: classObj.id },
      attributes: ["id", "title", "description", "classId", "createdAt", "isLocked"],
      include: [
        {
          model: ContentItem,
          as: "items",
          attributes: [
            "id",
            "title",
            "itemType",
            "sequenceOrder",
            "prerequisiteLessonId",
            "contentBody",
            "contentUrl",
            "isLocked"
          ]
        }
      ],
      order: [["createdAt", "ASC"]]
    });
  }

  return modules;
};

const studentHasAccessToModule = async (classId, moduleId, moduleClassId) => {
  const explicitAssignments = await ClassCourse.count({
    where: { classId }
  });

  if (explicitAssignments > 0) {
    const isAssigned = await ClassCourse.findOne({
      where: {
        classId,
        moduleId
      }
    });

    return Boolean(isAssigned);
  }

  return Number(moduleClassId) === Number(classId);
};

const normalizeQuizChoices = (payload) => {
  const labels = ["A", "B", "C", "D"];
  const normalizedChoices = {};

  if (payload?.choices) {
    let parsedChoices = payload.choices;

    if (typeof parsedChoices === "string") {
      try {
        parsedChoices = JSON.parse(parsedChoices);
      } catch (error) {
        throw new Error("choices must be valid JSON when provided as a string");
      }
    }

    if (Array.isArray(parsedChoices)) {
      if (parsedChoices.length !== 4) {
        throw new Error("Exactly 4 choices are required (A, B, C, D)");
      }

      parsedChoices.forEach((entry, index) => {
        if (typeof entry === "string") {
          normalizedChoices[labels[index]] = entry;
          return;
        }

        const resolvedLabel = String(entry?.label || labels[index]).trim().toUpperCase();
        const resolvedText = String(entry?.text || entry?.value || "");
        normalizedChoices[resolvedLabel] = resolvedText;
      });
    } else if (parsedChoices && typeof parsedChoices === "object") {
      labels.forEach((label) => {
        normalizedChoices[label] = parsedChoices[label] || parsedChoices[label.toLowerCase()] || "";
      });
    }
  }

  const hasExplicitChoiceFields =
    payload?.choiceA !== undefined ||
    payload?.choiceB !== undefined ||
    payload?.choiceC !== undefined ||
    payload?.choiceD !== undefined;

  if (hasExplicitChoiceFields) {
    normalizedChoices.A = payload.choiceA;
    normalizedChoices.B = payload.choiceB;
    normalizedChoices.C = payload.choiceC;
    normalizedChoices.D = payload.choiceD;
  }

  const hasLegacyChoiceFields =
    payload?.correctAnswer !== undefined ||
    payload?.incorrectAnswer1 !== undefined ||
    payload?.incorrectAnswer2 !== undefined ||
    payload?.incorrectAnswer3 !== undefined;

  if (!hasExplicitChoiceFields && hasLegacyChoiceFields) {
    normalizedChoices.A = payload.correctAnswer;
    normalizedChoices.B = payload.incorrectAnswer1;
    normalizedChoices.C = payload.incorrectAnswer2;
    normalizedChoices.D = payload.incorrectAnswer3;
  }

  labels.forEach((label) => {
    normalizedChoices[label] = String(normalizedChoices[label] || "").trim();
  });

  const providedChoiceCount = labels.filter((label) => normalizedChoices[label].length > 0).length;
  if (providedChoiceCount !== 4) {
    throw new Error("Exactly 4 non-empty choices are required (A, B, C, D)");
  }

  const normalizedChoiceValues = labels.map((label) => normalizedChoices[label].toLowerCase());
  const distinctChoiceCount = new Set(normalizedChoiceValues).size;
  if (distinctChoiceCount !== 4) {
    throw new Error("Choices A-D must be distinct values");
  }

  let correctOption = String(payload?.correctOption || "").trim().toUpperCase();

  if (!correctOption && payload?.correctAnswer) {
    const legacyCorrect = String(payload.correctAnswer).trim();
    correctOption = labels.find((label) => normalizedChoices[label] === legacyCorrect) || "";
  }

  if (!labels.includes(correctOption)) {
    throw new Error("correctOption must be one of: A, B, C, D");
  }

  return {
    labels,
    choiceMap: normalizedChoices,
    correctOption
  };
};

const parseTargetGradeLevel = (targetGradeLevel) => {
  const parsedGradeLevel = Number(targetGradeLevel);
  if (!Number.isInteger(parsedGradeLevel) || parsedGradeLevel < 1 || parsedGradeLevel > 8) {
    throw new Error("targetGradeLevel must be a whole number between 1 and 8");
  }

  return parsedGradeLevel;
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

const EARLY_GRADE_QUIZ_TYPES = new Set([
  QUIZ_RENDER_TYPES.STANDARD,
  QUIZ_RENDER_TYPES.BALLOON,
  QUIZ_RENDER_TYPES.DRAG_AND_DROP,
  QUIZ_RENDER_TYPES.PUZZLE
]);

const normalizeQuizType = (rawQuizType) => {
  if (rawQuizType === undefined || rawQuizType === null) {
    return null;
  }

  const normalizedInput = String(rawQuizType)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return QUIZ_TYPE_ALIASES[normalizedInput] || null;
};

const resolveAgeAdaptiveQuizType = ({ gradeLevel, requestedQuizType, existingQuizType }) => {
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 8) {
    throw new Error("targetGradeLevel must be a whole number between 1 and 8");
  }

  if (gradeLevel >= 5) {
    return QUIZ_RENDER_TYPES.KAHOOT;
  }

  const resolvedQuizType =
    normalizeQuizType(requestedQuizType) ||
    normalizeQuizType(existingQuizType) ||
    QUIZ_RENDER_TYPES.BALLOON;

  if (!EARLY_GRADE_QUIZ_TYPES.has(resolvedQuizType)) {
    throw new Error(
      "quizType must be one of: standard_multiple_choice, balloon_pop, drag_and_drop, puzzle"
    );
  }

  return resolvedQuizType;
};

const resolveQuizMediaMeta = (file) => {
  const mediaUrl = buildMediaUrlFromUploadedFile(file);
  if (!mediaUrl || !file?.mimetype) {
    return null;
  }

  if (file.mimetype.startsWith("image/")) {
    return {
      type: "image",
      url: mediaUrl
    };
  }

  if (file.mimetype.startsWith("audio/")) {
    return {
      type: "audio",
      url: mediaUrl
    };
  }

  return null;
};

const parseQuizQuestionsInput = (payload = {}) => {
  let parsedQuestions = payload?.questions;

  if (typeof parsedQuestions === "string") {
    try {
      parsedQuestions = JSON.parse(parsedQuestions);
    } catch {
      throw new Error("questions must be a valid JSON array");
    }
  }

  if ((parsedQuestions === undefined || parsedQuestions === null) && payload?.question !== undefined) {
    parsedQuestions = [
      {
        id: payload?.questionId,
        questionText: payload?.question,
        choiceA: payload?.choiceA,
        choiceB: payload?.choiceB,
        choiceC: payload?.choiceC,
        choiceD: payload?.choiceD,
        choices: payload?.choices,
        correctOption: payload?.correctOption,
        correctAnswer: payload?.correctAnswer,
        incorrectAnswer1: payload?.incorrectAnswer1,
        incorrectAnswer2: payload?.incorrectAnswer2,
        incorrectAnswer3: payload?.incorrectAnswer3,
        points: payload?.points
      }
    ];
  }

  if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
    throw new Error("At least one question is required");
  }

  return parsedQuestions.map((question, index) => {
    const questionText = String(question?.questionText || question?.question || "").trim();
    if (!questionText) {
      throw new Error(`Question ${index + 1} cannot be empty`);
    }

    const pointsValue = Number(question?.points);
    const points = Number.isInteger(pointsValue) && pointsValue > 0 ? pointsValue : 10;

    const normalizedChoices = normalizeQuizChoices({
      choiceA: question?.choiceA ?? question?.optionA ?? question?.options?.A ?? question?.options?.a,
      choiceB: question?.choiceB ?? question?.optionB ?? question?.options?.B ?? question?.options?.b,
      choiceC: question?.choiceC ?? question?.optionC ?? question?.options?.C ?? question?.options?.c,
      choiceD: question?.choiceD ?? question?.optionD ?? question?.options?.D ?? question?.options?.d,
      choices: question?.choices || question?.options,
      correctOption: question?.correctOption,
      correctAnswer: question?.correctAnswer,
      incorrectAnswer1: question?.incorrectAnswer1,
      incorrectAnswer2: question?.incorrectAnswer2,
      incorrectAnswer3: question?.incorrectAnswer3
    });

    const parsedQuestionId = Number(question?.id || question?.questionId);
    const questionId = Number.isInteger(parsedQuestionId) && parsedQuestionId > 0 ? parsedQuestionId : null;

    return {
      questionId,
      questionText,
      points,
      sequenceOrder: index + 1,
      labels: normalizedChoices.labels,
      choiceMap: normalizedChoices.choiceMap,
      correctOption: normalizedChoices.correctOption
    };
  });
};

const buildQuizQuestionRow = (normalizedQuestion, contentItemId, mediaMeta = null) => {
  const incorrectAnswerTexts = normalizedQuestion.labels
    .filter((label) => label !== normalizedQuestion.correctOption)
    .map((label) => normalizedQuestion.choiceMap[label]);

  return {
    contentItemId,
    questionText: normalizedQuestion.questionText,
    questionType: "MultipleChoice",
    imageUrl: mediaMeta?.type === "image" ? mediaMeta.url : null,
    audioUrl: mediaMeta?.type === "audio" ? mediaMeta.url : null,
    correctAnswer: normalizedQuestion.choiceMap[normalizedQuestion.correctOption],
    distractor1: incorrectAnswerTexts[0] || null,
    distractor2: incorrectAnswerTexts[1] || null,
    distractor3: incorrectAnswerTexts[2] || null,
    points: normalizedQuestion.points,
    sequenceOrder: normalizedQuestion.sequenceOrder
  };
};

const mapQuizQuestionsForContentBody = (quizQuestions = []) => {
  return quizQuestions.map((question) => ({
    questionId: question.id,
    questionText: question.questionText,
    points: question.points,
    sequenceOrder: question.sequenceOrder,
    options: {
      A: question.correctAnswer,
      B: question.distractor1 || "",
      C: question.distractor2 || "",
      D: question.distractor3 || ""
    },
    correctOption: "A",
    correctAnswer: question.correctAnswer
  }));
};

const buildQuizContentBody = ({
  quizType,
  targetGradeLevel,
  prerequisiteLessonId,
  quizQuestions,
  mediaMeta = null
}) => {
  return {
    quizType,
    targetGradeLevel,
    prerequisiteLessonId: prerequisiteLessonId || null,
    questionCount: quizQuestions.length,
    questions: mapQuizQuestionsForContentBody(quizQuestions),
    media: mediaMeta
      ? {
          type: mediaMeta.type,
          url: mediaMeta.url
        }
      : null
  };
};

const resolveQuizTitle = (rawTitle, normalizedQuestions = []) => {
  const explicitTitle = String(rawTitle || "").trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const fallbackQuestion = String(normalizedQuestions[0]?.questionText || "").trim();
  if (!fallbackQuestion) {
    return "Untitled Quiz";
  }

  const compactQuestion = fallbackQuestion.length > 80
    ? `${fallbackQuestion.slice(0, 77)}...`
    : fallbackQuestion;

  return `Quiz: ${compactQuestion}`;
};

const resolvePrerequisiteLessonId = async ({ prerequisiteLessonId, moduleId }) => {
  if (
    prerequisiteLessonId === undefined ||
    prerequisiteLessonId === null ||
    String(prerequisiteLessonId).trim() === ""
  ) {
    return null;
  }

  const resolvedPrerequisiteLessonId = Number(prerequisiteLessonId);
  if (!Number.isInteger(resolvedPrerequisiteLessonId) || resolvedPrerequisiteLessonId <= 0) {
    throw new Error("prerequisiteLessonId must be a valid lesson id");
  }

  const prerequisiteLesson = await ContentItem.findOne({
    where: {
      id: resolvedPrerequisiteLessonId,
      moduleId: Number(moduleId),
      itemType: "Lesson"
    }
  });

  if (!prerequisiteLesson) {
    throw new Error("Selected prerequisite lesson was not found in this module");
  }

  return resolvedPrerequisiteLessonId;
};

/**
 * Content Controller
 * Handles content module and item management
 */
class ContentController {
  /**
   * Create a new content module (course)
   * POST /api/content/modules
   */
  async createModule(req, res) {
    try {
      const { classId, title, description, totalQuestions } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Validation
      if (!classId || !title) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: classId, title"
        });
      }

      // Verify user is teacher or admin
      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Only teachers and admins can create modules"
        });
      }

      // Verify class exists and user has permission
      const classObj = await Class.findByPk(classId);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessClass(userId, classObj))) {
        return res.status(403).json({
          success: false,
          message: "You can only create modules for your own classes"
        });
      }

      // Create the module
      const module = await ContentModule.create({
        classId,
        title,
        description: description || null
      });

      await ClassCourse.findOrCreate({
        where: {
          classId: Number(classId),
          moduleId: module.id
        },
        defaults: {
          classId: Number(classId),
          moduleId: module.id
        }
      });

      // Automatically generate gamification elements for every new module.
      let gamificationResult = null;
      let gamificationWarning = null;
      try {
        gamificationResult = await gpeService.generateCourseGamification(
          module.id,
          totalQuestions || 10
        );
      } catch (gamificationError) {
        console.error("Error auto-generating gamification:", gamificationError);
        // Do not block module creation if gamification generation fails.
        gamificationWarning = "Module created, but automatic gamification setup failed.";
      }

      return res.status(201).json({
        success: true,
        message: "Module created successfully",
        data: {
          module: {
            id: module.id,
            classId: module.classId,
            title: module.title,
            description: module.description,
            createdAt: module.createdAt
          },
          gamification: gamificationResult,
          gamificationWarning
        }
      });
    } catch (error) {
      console.error("Error creating module:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating module",
        error: error.message
      });
    }
  }

  /**
   * Get all modules for a class
   * GET /api/content/modules/class/:classId
   */
  async getModulesByClass(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const classObj = await Class.findByPk(classId);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessClass(userId, classObj))) {
        return res.status(403).json({
          success: false,
          message: "You can only access modules for your assigned classes"
        });
      }

      const explicitAssignments = await ClassCourse.findAll({
        where: { classId: classObj.id },
        attributes: ["moduleId"]
      });

      const assignedModuleIds = explicitAssignments.map((row) => row.moduleId);

      const modules = await ContentModule.findAll({
        where: assignedModuleIds.length > 0
          ? { id: { [Op.in]: assignedModuleIds } }
          : { classId: classObj.id },
        include: [
          {
            model: ContentItem,
            as: "items",
            attributes: ["id", "title", "itemType", "sequenceOrder", "isLocked"]
          }
        ],
        order: [["createdAt", "ASC"]]
      });

      return res.status(200).json({
        success: true,
        count: modules.length,
        data: modules
      });
    } catch (error) {
      console.error("Error getting modules:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting modules",
        error: error.message
      });
    }
  }

  /**
   * Get lesson content items for a module
   * GET /api/content/modules/:moduleId/lessons
   */
  async getLessonsByModule(req, res) {
    try {
      const { moduleId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const module = await ContentModule.findByPk(moduleId, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only access lessons for your own modules"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      const lessons = await ContentItem.findAll({
        where: {
          moduleId: Number(moduleId),
          itemType: "Lesson"
        },
        attributes: ["id", "title", "sequenceOrder", "createdAt"],
        order: [["sequenceOrder", "ASC"], ["createdAt", "ASC"]]
      });

      return res.status(200).json({
        success: true,
        count: lessons.length,
        data: lessons
      });
    } catch (error) {
      console.error("Error getting lessons for module:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting lessons for module",
        error: error.message
      });
    }
  }

  /**
   * Get a single module by ID
   * GET /api/content/modules/:id
   */
  async getModuleById(req, res) {
    try {
      const { id } = req.params;

      const module = await ContentModule.findByPk(id, {
        include: [
          {
            model: ContentItem,
            as: "items",
            order: [["sequenceOrder", "ASC"]]
          },
          {
            model: Class,
            as: "class",
            attributes: ["id", "name", "gradeLevel"]
          }
        ]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      return res.status(200).json({
        success: true,
        data: module
      });
    } catch (error) {
      console.error("Error getting module:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting module",
        error: error.message
      });
    }
  }

  /**
   * Update a module
   * PUT /api/content/modules/:id
   */
  async updateModule(req, res) {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const module = await ContentModule.findByPk(id, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      // Check permissions
      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own modules"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      // Update module
      if (title) module.title = title;
      if (description !== undefined) module.description = description;
      await module.save();

      return res.status(200).json({
        success: true,
        message: "Module updated successfully",
        data: module
      });
    } catch (error) {
      console.error("Error updating module:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating module",
        error: error.message
      });
    }
  }

  /**
   * Delete a module
   * DELETE /api/content/modules/:id
   */
  async deleteModule(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const module = await ContentModule.findByPk(id, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      // Check permissions
      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own modules"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      await module.destroy();

      return res.status(200).json({
        success: true,
        message: "Module deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting module:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting module",
        error: error.message
      });
    }
  }

  /**
   * Create a quiz content item with structured question data
   * POST /api/content/quiz
   */
  async createQuizContentItem(req, res) {
    try {
      const {
        moduleId,
        title,
        targetGradeLevel,
        sequenceOrder,
        prerequisiteLessonId,
        quizType
      } = req.body;

      const userId = req.user.id;
      const userRole = req.user.role;

      if (!moduleId || targetGradeLevel === undefined || targetGradeLevel === null) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: moduleId, targetGradeLevel, questions"
        });
      }

      let parsedGradeLevel;
      let normalizedQuestions;
      let resolvedQuizType;
      try {
        parsedGradeLevel = parseTargetGradeLevel(targetGradeLevel);
        normalizedQuestions = parseQuizQuestionsInput(req.body);
        resolvedQuizType = resolveAgeAdaptiveQuizType({
          gradeLevel: parsedGradeLevel,
          requestedQuizType: quizType || req.body.quiz_type
        });
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }

      const module = await ContentModule.findByPk(moduleId, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only add quizzes to your own modules"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      let resolvedPrerequisiteLessonId;
      try {
        resolvedPrerequisiteLessonId = await resolvePrerequisiteLessonId({
          prerequisiteLessonId,
          moduleId: Number(moduleId)
        });
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }

      const mediaMeta = resolveQuizMediaMeta(req.file);
      const resolvedTitle = resolveQuizTitle(title || req.body.quizTitle, normalizedQuestions);

      const rawSequenceOrder = Number(sequenceOrder);
      const resolvedSequenceOrder = Number.isInteger(rawSequenceOrder) && rawSequenceOrder > 0
        ? rawSequenceOrder
        : 1;

      const { createdQuiz, createdQuestions } = await sequelize.transaction(async (transaction) => {
        const newQuiz = await ContentItem.create(
          {
            moduleId: Number(moduleId),
            title: resolvedTitle,
            itemType: "Quiz",
            prerequisiteLessonId: resolvedPrerequisiteLessonId,
            quizType: resolvedQuizType,
            contentBody: JSON.stringify({}),
            contentUrl: mediaMeta?.url || null,
            sequenceOrder: resolvedSequenceOrder
          },
          { transaction }
        );

        const questionRows = normalizedQuestions.map((normalizedQuestion, index) =>
          buildQuizQuestionRow(
            normalizedQuestion,
            newQuiz.id,
            index === 0 ? mediaMeta : null
          )
        );

        const newQuestions = await QuizQuestion.bulkCreate(questionRows, { transaction });

        newQuiz.contentBody = JSON.stringify(
          buildQuizContentBody({
            quizType: resolvedQuizType,
            targetGradeLevel: parsedGradeLevel,
            prerequisiteLessonId: resolvedPrerequisiteLessonId,
            quizQuestions: newQuestions,
            mediaMeta
          })
        );

        await newQuiz.save({ transaction });

        return {
          createdQuiz: newQuiz,
          createdQuestions: newQuestions
        };
      });

      return res.status(201).json({
        success: true,
        message: "Quiz created successfully",
        quizId: createdQuiz.id,
        questionIds: createdQuestions.map((question) => question.id),
        prerequisiteLessonId: resolvedPrerequisiteLessonId,
        data: createdQuiz
      });
    } catch (error) {
      console.error("Error creating quiz content item:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating quiz content item",
        error: error.message
      });
    }
  }

  /**
   * Update a quiz content item and all nested questions in one transaction.
   * PUT /api/content/quiz/:quizId
   */
  async updateQuizContentItem(req, res) {
    try {
      const routeQuizId = req.params.quizId;
      const quizId = routeQuizId || req.body.quizId;
      const {
        moduleId,
        title,
        targetGradeLevel,
        sequenceOrder,
        prerequisiteLessonId,
        quizType
      } = req.body;

      const userId = req.user.id;
      const userRole = req.user.role;

      if (!quizId) {
        return res.status(400).json({
          success: false,
          message: "quizId is required"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      const quizItem = await ContentItem.findOne({
        where: {
          id: Number(quizId),
          itemType: "Quiz"
        },
        include: [
          {
            model: ContentModule,
            as: "module",
            include: [{ model: Class, as: "class" }]
          }
        ]
      });

      if (!quizItem) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, quizItem.module))) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own quizzes"
        });
      }

      const existingPayload = safeParseJson(quizItem.contentBody) || {};

      let resolvedModule = quizItem.module;
      if (moduleId !== undefined && moduleId !== null && String(moduleId).trim() !== "") {
        const requestedModuleId = Number(moduleId);
        if (!Number.isInteger(requestedModuleId) || requestedModuleId <= 0) {
          return res.status(400).json({
            success: false,
            message: "moduleId must be a valid module id"
          });
        }

        resolvedModule = await ContentModule.findByPk(requestedModuleId, {
          include: [{ model: Class, as: "class" }]
        });

        if (!resolvedModule) {
          return res.status(404).json({
            success: false,
            message: "Module not found"
          });
        }

        if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, resolvedModule))) {
          return res.status(403).json({
            success: false,
            message: "You can only move quizzes to modules you can access"
          });
        }
      }

      const effectiveTargetGradeLevel =
        targetGradeLevel !== undefined && targetGradeLevel !== null
          ? targetGradeLevel
          : existingPayload.targetGradeLevel;

      if (effectiveTargetGradeLevel === undefined || effectiveTargetGradeLevel === null) {
        return res.status(400).json({
          success: false,
          message: "targetGradeLevel is required"
        });
      }

      let parsedGradeLevel;
      let normalizedQuestions;
      let resolvedQuizType;
      try {
        parsedGradeLevel = parseTargetGradeLevel(effectiveTargetGradeLevel);
        normalizedQuestions = parseQuizQuestionsInput(req.body);
        resolvedQuizType = resolveAgeAdaptiveQuizType({
          gradeLevel: parsedGradeLevel,
          requestedQuizType: quizType || req.body.quiz_type,
          existingQuizType: quizItem.quizType || existingPayload.quizType
        });
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }

      const effectivePrerequisiteLessonId =
        prerequisiteLessonId !== undefined
          ? prerequisiteLessonId
          : existingPayload.prerequisiteLessonId;

      let resolvedPrerequisiteLessonId;
      try {
        resolvedPrerequisiteLessonId = await resolvePrerequisiteLessonId({
          prerequisiteLessonId: effectivePrerequisiteLessonId,
          moduleId: resolvedModule.id
        });
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }

      const uploadedMediaMeta = resolveQuizMediaMeta(req.file);
      const existingMediaMeta = existingPayload?.media?.url
        ? {
            type: existingPayload.media.type,
            url: existingPayload.media.url
          }
        : null;

      const resolvedMediaMeta = uploadedMediaMeta || existingMediaMeta;

      const rawSequenceOrder =
        sequenceOrder !== undefined && sequenceOrder !== null ? Number(sequenceOrder) : Number(quizItem.sequenceOrder);
      const resolvedSequenceOrder = Number.isInteger(rawSequenceOrder) && rawSequenceOrder > 0
        ? rawSequenceOrder
        : 1;

      const resolvedTitle = resolveQuizTitle(title || quizItem.title, normalizedQuestions);

      const updatedQuiz = await sequelize.transaction(async (transaction) => {
        const existingQuestions = await QuizQuestion.findAll({
          where: {
            contentItemId: quizItem.id
          },
          transaction
        });

        const existingQuestionMap = new Map(existingQuestions.map((question) => [question.id, question]));
        const retainedQuestionIds = [];

        for (let index = 0; index < normalizedQuestions.length; index += 1) {
          const normalizedQuestion = {
            ...normalizedQuestions[index],
            sequenceOrder: index + 1
          };

          const questionRowPayload = buildQuizQuestionRow(
            normalizedQuestion,
            quizItem.id,
            index === 0 ? resolvedMediaMeta : null
          );

          if (
            normalizedQuestion.questionId &&
            existingQuestionMap.has(normalizedQuestion.questionId)
          ) {
            const existingQuestion = existingQuestionMap.get(normalizedQuestion.questionId);
            Object.assign(existingQuestion, questionRowPayload);
            await existingQuestion.save({ transaction });
            retainedQuestionIds.push(existingQuestion.id);
          } else {
            const createdQuestion = await QuizQuestion.create(questionRowPayload, { transaction });
            retainedQuestionIds.push(createdQuestion.id);
          }
        }

        if (retainedQuestionIds.length > 0) {
          await QuizQuestion.destroy({
            where: {
              contentItemId: quizItem.id,
              id: {
                [Op.notIn]: retainedQuestionIds
              }
            },
            transaction
          });
        }

        const finalQuestions = await QuizQuestion.findAll({
          where: {
            contentItemId: quizItem.id
          },
          order: [["sequenceOrder", "ASC"], ["id", "ASC"]],
          transaction
        });

        quizItem.moduleId = resolvedModule.id;
        quizItem.title = resolvedTitle;
        quizItem.prerequisiteLessonId = resolvedPrerequisiteLessonId;
        quizItem.quizType = resolvedQuizType;
        quizItem.contentUrl = resolvedMediaMeta?.url || null;
        quizItem.sequenceOrder = resolvedSequenceOrder;
        quizItem.contentBody = JSON.stringify(
          buildQuizContentBody({
            quizType: resolvedQuizType,
            targetGradeLevel: parsedGradeLevel,
            prerequisiteLessonId: resolvedPrerequisiteLessonId,
            quizQuestions: finalQuestions,
            mediaMeta: resolvedMediaMeta
          })
        );

        await quizItem.save({ transaction });
        return quizItem;
      });

      return res.status(200).json({
        success: true,
        message: "Quiz updated successfully",
        quizId: updatedQuiz.id,
        data: updatedQuiz
      });
    } catch (error) {
      console.error("Error updating quiz content item:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating quiz content item",
        error: error.message
      });
    }
  }

  /**
   * Create an immersive lesson content item with dynamic content cards.
   * POST /api/content/lesson
   */
  async createLessonContentItem(req, res) {
    try {
      const { moduleId, title, cards, sequenceOrder } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!moduleId || !title || !cards) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: moduleId, title, cards"
        });
      }

      let parsedCards;
      try {
        parsedCards = Array.isArray(cards) ? cards : JSON.parse(cards);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "cards must be a valid JSON array"
        });
      }

      if (!Array.isArray(parsedCards) || parsedCards.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one content card is required"
        });
      }

      const module = await ContentModule.findByPk(moduleId, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only add lessons to your own modules"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      const uploadedFiles = Array.isArray(req.files) ? req.files : [];
      const fileByField = uploadedFiles.reduce((acc, file) => {
        if (file?.fieldname) {
          acc[file.fieldname] = file;
        }
        return acc;
      }, {});

      const allowedThemes = new Set(["Space", "Nature", "Lab"]);

      const lessonCards = parsedCards.map((card, index) => {
        const textContent = String(card?.textContent || "").trim();
        if (!textContent) {
          throw new Error(`Card ${index + 1} is missing text content`);
        }

        const requestedTheme = String(card?.visualTheme || "Space").trim();
        const visualTheme = allowedThemes.has(requestedTheme) ? requestedTheme : "Space";

        const imageField = card?.imageField || `image_${index}`;
        const audioField = card?.audioField || `audio_${index}`;

        const imageFile = fileByField[imageField];
        const audioFile = fileByField[audioField];

        if (imageFile && !imageFile.mimetype.startsWith("image/")) {
          throw new Error(`Card ${index + 1} image file must be an image format`);
        }

        if (audioFile && !audioFile.mimetype.startsWith("audio/")) {
          throw new Error(`Card ${index + 1} audio file must be an audio format`);
        }

        return {
          order: index + 1,
          textContent,
          visualTheme,
          imageUrl: buildMediaUrlFromUploadedFile(imageFile),
          audioUrl: buildMediaUrlFromUploadedFile(audioFile)
        };
      });

      const lessonPayload = {
        title: String(title).trim(),
        lessonType: "ImmersiveLesson",
        cardCount: lessonCards.length,
        cards: lessonCards
      };

      const firstCardWithMedia = lessonCards.find((card) => card.imageUrl || card.audioUrl) || null;
      const lessonItem = await ContentItem.create({
        moduleId: Number(moduleId),
        title: String(title).trim(),
        itemType: "Lesson",
        contentBody: JSON.stringify(lessonPayload),
        contentUrl: firstCardWithMedia?.imageUrl || firstCardWithMedia?.audioUrl || null,
        sequenceOrder: Number(sequenceOrder) || 1
      });

      return res.status(201).json({
        success: true,
        message: "Lesson created successfully",
        lessonId: lessonItem.id,
        data: lessonItem
      });
    } catch (error) {
      if (
        error?.message?.includes("Card") ||
        error?.message?.includes("text content") ||
        error?.message?.includes("image file") ||
        error?.message?.includes("audio file")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      console.error("Error creating lesson content item:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating lesson content item",
        error: error.message
      });
    }
  }

  /**
   * Create a content item within a module
   * POST /api/content/items
   */
  async createContentItem(req, res) {
    try {
      const { moduleId, title, itemType, contentBody, contentUrl, sequenceOrder } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Validation
      if (!moduleId || !title || !itemType) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: moduleId, title, itemType"
        });
      }

      // Verify module exists and user has permission
      const module = await ContentModule.findByPk(moduleId, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only add content to your own modules"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      // Create content item
      const contentItem = await ContentItem.create({
        moduleId,
        title,
        itemType,
        contentBody: contentBody || null,
        contentUrl: contentUrl || null,
        sequenceOrder: sequenceOrder || 1
      });

      return res.status(201).json({
        success: true,
        message: "Content item created successfully",
        data: contentItem
      });
    } catch (error) {
      console.error("Error creating content item:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating content item",
        error: error.message
      });
    }
  }

  /**
   * Get all content items for a module
   * GET /api/content/items/module/:moduleId
   */
  async getContentItemsByModule(req, res) {
    try {
      const { moduleId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const module = await ContentModule.findByPk(moduleId, {
        include: [{ model: Class, as: "class" }]
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
        return res.status(403).json({
          success: false,
          message: "You can only access content for your own classes"
        });
      }

      let whereClause = { moduleId };

      if (userRole === "Student") {
        const student = await User.findByPk(userId, {
          attributes: ["id", "classId", "role"]
        });

        if (!student || student.role !== "Student") {
          return res.status(403).json({
            success: false,
            message: "Only students can use student content access"
          });
        }

        if (!student.classId) {
          return res.status(403).json({
            success: false,
            message: "Student is not assigned to a class"
          });
        }

        const hasModuleAccess = await studentHasAccessToModule(
          student.classId,
          module.id,
          module.classId
        );

        if (!hasModuleAccess) {
          return res.status(403).json({
            success: false,
            message: "This module is not assigned to your class"
          });
        }

        if (module.isLocked) {
          return res.status(200).json({
            success: true,
            count: 0,
            data: []
          });
        }

        whereClause = { moduleId, isLocked: false };
      }

      const items = await ContentItem.findAll({
        where: whereClause,
        order: [["sequenceOrder", "ASC"], ["createdAt", "ASC"]]
      });

      return res.status(200).json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      console.error("Error getting content items:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting content items",
        error: error.message
      });
    }
  }

  /**
   * Update a content item
   * PUT /api/content/items/:id
   */
  async updateContentItem(req, res) {
    try {
      const { id } = req.params;
      const { title, itemType, contentBody, contentUrl, sequenceOrder, isLocked } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const contentItem = await ContentItem.findByPk(id, {
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

      // Check permissions
      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, contentItem.module))) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own content"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      // Update fields
      if (title) contentItem.title = title;
      if (itemType) contentItem.itemType = itemType;
      if (contentBody !== undefined) contentItem.contentBody = contentBody;
      if (contentUrl !== undefined) contentItem.contentUrl = contentUrl;
      if (sequenceOrder !== undefined) contentItem.sequenceOrder = sequenceOrder;
      if (isLocked !== undefined) contentItem.isLocked = Boolean(isLocked);

      await contentItem.save();

      return res.status(200).json({
        success: true,
        message: "Content item updated successfully",
        data: contentItem
      });
    } catch (error) {
      console.error("Error updating content item:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating content item",
        error: error.message
      });
    }
  }

  /**
   * Delete a content item
   * DELETE /api/content/items/:id
   */
  async deleteContentItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const contentItem = await ContentItem.findByPk(id, {
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

      // Check permissions
      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, contentItem.module))) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own content"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions"
        });
      }

      await contentItem.destroy();

      return res.status(200).json({
        success: true,
        message: "Content item deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting content item:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting content item",
        error: error.message
      });
    }
  }

  /**
   * Get modules assigned to the authenticated student's class.
   * GET /api/content/student/modules
   */
  async getStudentAssignedModules(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: ["id", "role", "classId", "fullName", "email"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.role !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Only students can access student module assignments"
        });
      }

      if (!user.classId) {
        return res.status(200).json({
          success: true,
          class: null,
          count: 0,
          data: []
        });
      }

      const classObj = await Class.findByPk(user.classId, {
        attributes: ["id", "name", "gradeLevel"],
        include: [
          {
            model: ContentModule,
            as: "assignedModules",
            attributes: ["id", "title", "description", "classId", "createdAt", "isLocked"],
            through: { attributes: [] },
            include: [
              {
                model: ContentItem,
                as: "items",
                attributes: [
                  "id",
                  "title",
                  "itemType",
                  "sequenceOrder",
                  "prerequisiteLessonId",
                  "contentBody",
                  "contentUrl",
                  "isLocked"
                ]
              }
            ]
          }
        ]
      });

      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Student class not found"
        });
      }

      const modules = await getAssignedModulesForClass(classObj);
      const visibleModules = filterUnlockedModulesForStudents(modules);

      return res.status(200).json({
        success: true,
        class: {
          id: classObj.id,
          name: classObj.name,
          gradeLevel: classObj.gradeLevel
        },
        count: visibleModules.length,
        data: visibleModules
      });
    } catch (error) {
      console.error("Error getting student assigned modules:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting student assigned modules",
        error: error.message
      });
    }
  }

  /**
   * Get the learning path for the authenticated student grouped by quarter.
   * GET /api/content/student/learning-path
   */
  async getStudentLearningPath(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: ["id", "role", "classId", "fullName", "email", "totalXP"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.role !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Only students can access learning path"
        });
      }

      if (!user.classId) {
        return res.status(200).json({
          success: true,
          class: null,
          totalXP: user.totalXP || 0,
          terms: [],
          data: []
        });
      }

      const classObj = await Class.findByPk(user.classId, {
        attributes: ["id", "name", "gradeLevel"],
        include: [
          {
            model: ContentModule,
            as: "assignedModules",
            attributes: ["id", "title", "description", "classId", "createdAt", "isLocked"],
            through: { attributes: [] },
            include: [
              {
                model: ContentItem,
                as: "items",
                attributes: [
                  "id",
                  "title",
                  "itemType",
                  "sequenceOrder",
                  "prerequisiteLessonId",
                  "contentBody",
                  "contentUrl",
                  "isLocked"
                ]
              }
            ]
          }
        ]
      });

      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Student class not found"
        });
      }

      const modules = filterUnlockedModulesForStudents(await getAssignedModulesForClass(classObj));

      const allItems = modules
        .flatMap((module) => (Array.isArray(module.items) ? module.items : []))
        .filter((item) => item.itemType === "Lesson" || item.itemType === "Quiz");

      const lessonIds = allItems
        .filter((item) => item.itemType === "Lesson")
        .map((item) => item.id);

      const completions = lessonIds.length > 0
        ? await XPTransaction.findAll({
            where: {
              userId,
              reason: "Lesson Completion",
              contentItemId: { [Op.in]: lessonIds }
            },
            attributes: ["contentItemId", "earnedAt"],
            order: [["earnedAt", "DESC"]]
          })
        : [];

      const completedLessonIds = new Set(completions.map((row) => row.contentItemId));
      const completedAtByLessonId = completions.reduce((acc, row) => {
        if (!acc[row.contentItemId]) {
          acc[row.contentItemId] = row.earnedAt;
        }
        return acc;
      }, {});

      const pathNodes = modules.flatMap((module) => {
        const moduleItems = [...(module.items || [])]
          .filter((item) => item.itemType === "Lesson" || item.itemType === "Quiz")
          .sort((a, b) => {
            const orderDiff = (a.sequenceOrder || 0) - (b.sequenceOrder || 0);
            if (orderDiff !== 0) return orderDiff;
            return (a.id || 0) - (b.id || 0);
          });

        return moduleItems.map((item, index) => {
          const quarterLabel = resolveQuarterLabel(item, index);
          const isLesson = item.itemType === "Lesson";
          const prerequisiteLessonId = item.prerequisiteLessonId || null;
          const lessonCompleted = isLesson ? completedLessonIds.has(item.id) : false;
          const quizLocked =
            !isLesson &&
            prerequisiteLessonId &&
            !completedLessonIds.has(prerequisiteLessonId);

          return {
            id: item.id,
            moduleId: module.id,
            moduleTitle: module.title,
            title: item.title,
            itemType: item.itemType,
            sequenceOrder: item.sequenceOrder,
            quarterLabel,
            prerequisiteLessonId,
            isCompleted: lessonCompleted,
            completedAt: lessonCompleted ? completedAtByLessonId[item.id] || null : null,
            isLocked: Boolean(quizLocked)
          };
        });
      });

      const groupedByTerm = pathNodes.reduce((acc, node) => {
        if (!acc[node.quarterLabel]) {
          acc[node.quarterLabel] = [];
        }

        acc[node.quarterLabel].push(node);
        return acc;
      }, {});

      const terms = Object.entries(groupedByTerm)
        .map(([term, items]) => ({
          term,
          items: items.sort((a, b) => {
            const moduleDiff = String(a.moduleTitle).localeCompare(String(b.moduleTitle));
            if (moduleDiff !== 0) return moduleDiff;
            const sequenceDiff = (a.sequenceOrder || 0) - (b.sequenceOrder || 0);
            if (sequenceDiff !== 0) return sequenceDiff;
            return (a.id || 0) - (b.id || 0);
          })
        }))
        .sort((a, b) => {
          const aMatch = String(a.term).match(/(\d+)/);
          const bMatch = String(b.term).match(/(\d+)/);

          if (aMatch && bMatch) {
            return Number(aMatch[1]) - Number(bMatch[1]);
          }

          return String(a.term).localeCompare(String(b.term));
        });

      return res.status(200).json({
        success: true,
        class: {
          id: classObj.id,
          name: classObj.name,
          gradeLevel: classObj.gradeLevel
        },
        totalXP: user.totalXP || 0,
        completedLessons: [...completedLessonIds],
        terms,
        data: pathNodes
      });
    } catch (error) {
      console.error("Error getting student learning path:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting student learning path",
        error: error.message
      });
    }
  }

  /**
   * Get a lesson payload for immersive student viewer.
   * GET /api/content/student/lessons/:lessonId
   */
  async getStudentLessonById(req, res) {
    try {
      const userId = req.user.id;
      const { lessonId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: ["id", "role", "classId", "totalXP"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.role !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Only students can open immersive lessons"
        });
      }

      if (!user.classId) {
        return res.status(403).json({
          success: false,
          message: "Student is not assigned to a class"
        });
      }

      const lesson = await ContentItem.findByPk(lessonId, {
        include: [{ model: ContentModule, as: "module", include: [{ model: Class, as: "class" }] }]
      });

      if (!lesson || lesson.itemType !== "Lesson") {
        return res.status(404).json({
          success: false,
          message: "Lesson not found"
        });
      }

      const hasModuleAccess = await studentHasAccessToModule(
        user.classId,
        lesson.moduleId,
        lesson.module?.classId
      );

      if (!hasModuleAccess) {
        return res.status(403).json({
          success: false,
          message: "This lesson is not assigned to your class"
        });
      }

      if (lesson.isLocked || lesson.module?.isLocked) {
        return res.status(403).json({
          success: false,
          message: "This lesson is currently locked by your teacher"
        });
      }

      const payload = safeParseJson(lesson.contentBody) || {};
      const cards = Array.isArray(payload.cards) ? payload.cards : [];

      if (cards.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Lesson content cards are missing"
        });
      }

      const completion = await XPTransaction.findOne({
        where: {
          userId,
          contentItemId: lesson.id,
          reason: "Lesson Completion"
        },
        attributes: ["id", "earnedAt", "xpAmount"]
      });

      return res.status(200).json({
        success: true,
        data: {
          id: lesson.id,
          moduleId: lesson.moduleId,
          moduleTitle: lesson.module?.title,
          title: lesson.title,
          cardCount: cards.length,
          cards,
          isCompleted: Boolean(completion),
          completedAt: completion?.earnedAt || null,
          completionXP: completion?.xpAmount || 0
        }
      });
    } catch (error) {
      console.error("Error getting student lesson:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting student lesson",
        error: error.message
      });
    }
  }

  /**
   * Mark lesson as completed, award XP, and unlock dependent quizzes.
   * POST /api/content/student/lessons/:lessonId/complete
   */
  async completeStudentLesson(req, res) {
    try {
      const userId = req.user.id;
      const { lessonId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: ["id", "role", "classId", "totalXP"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.role !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Only students can complete lessons"
        });
      }

      if (!user.classId) {
        return res.status(403).json({
          success: false,
          message: "Student is not assigned to a class"
        });
      }

      const lesson = await ContentItem.findByPk(lessonId, {
        include: [{ model: ContentModule, as: "module", include: [{ model: Class, as: "class" }] }]
      });

      if (!lesson || lesson.itemType !== "Lesson") {
        return res.status(404).json({
          success: false,
          message: "Lesson not found"
        });
      }

      const hasModuleAccess = await studentHasAccessToModule(
        user.classId,
        lesson.moduleId,
        lesson.module?.classId
      );

      if (!hasModuleAccess) {
        return res.status(403).json({
          success: false,
          message: "This lesson is not assigned to your class"
        });
      }

      if (lesson.isLocked || lesson.module?.isLocked) {
        return res.status(403).json({
          success: false,
          message: "This lesson is currently locked by your teacher"
        });
      }

      const lessonPayload = safeParseJson(lesson.contentBody) || {};
      const lessonCardCount = Array.isArray(lessonPayload.cards)
        ? lessonPayload.cards.length
        : null;
      const completionTime = new Date();

      const completionResult = await sequelize.transaction(async (transaction) => {
        const lockedUser = await User.findByPk(userId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!lockedUser) {
          const txError = new Error("Student account not found");
          txError.statusCode = 404;
          throw txError;
        }

        const existingCompletion = await XPTransaction.findOne({
          where: {
            userId,
            contentItemId: lesson.id,
            reason: "Lesson Completion"
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const existingScoreLog = await ScoreLog.findOne({
          where: {
            userId,
            contentItemId: lesson.id
          },
          attributes: ["id", "attemptedAt"],
          transaction,
          lock: transaction.LOCK.UPDATE,
          order: [["attemptedAt", "DESC"], ["id", "DESC"]]
        });

        const existingProgress = await UserProgress.findOne({
          where: {
            userId,
            moduleId: lesson.moduleId
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        // Idempotency guard: never award XP or insert duplicate logs for a completed lesson.
        if (existingCompletion || existingScoreLog) {
          return {
            alreadyCompleted: true,
            xpAwarded: 0,
            totalXP: lockedUser.totalXP || 0,
            moduleXP: existingProgress?.currentXP || 0,
            completionPercentage: Number(existingProgress?.completionPercentage) || 0,
            earnedAt: existingCompletion?.earnedAt || existingScoreLog?.attemptedAt || null
          };
        }

        lockedUser.totalXP = (lockedUser.totalXP || 0) + LESSON_COMPLETION_XP;
        await lockedUser.save({ transaction });

        const progress = existingProgress || (await UserProgress.create(
          {
            userId,
            moduleId: lesson.moduleId,
            currentXP: 0,
            currentLevel: 1,
            completionPercentage: 0,
            lastActivityAt: completionTime
          },
          { transaction }
        ));

        progress.currentXP += LESSON_COMPLETION_XP;
        progress.lastActivityAt = completionTime;

        const [totalLessons, completedLessons] = await Promise.all([
          ContentItem.count({
            where: {
              moduleId: lesson.moduleId,
              itemType: "Lesson"
            },
            transaction
          }),
          XPTransaction.count({
            where: {
              userId,
              moduleId: lesson.moduleId,
              reason: "Lesson Completion"
            },
            transaction
          })
        ]);

        const completedAfterThisAction = completedLessons + 1;
        if (totalLessons > 0) {
          progress.completionPercentage = Number(
            Math.min(100, (completedAfterThisAction / totalLessons) * 100).toFixed(2)
          );
        }

        await progress.save({ transaction });

        await ScoreLog.create(
          {
            userId,
            classId: lockedUser.classId || user.classId,
            contentItemId: lesson.id,
            score: 100,
            attemptedAt: completionTime
          },
          { transaction }
        );

        await XPTransaction.create(
          {
            userId,
            moduleId: lesson.moduleId,
            contentItemId: lesson.id,
            xpAmount: LESSON_COMPLETION_XP,
            reason: "Lesson Completion",
            metadata: {
              source: "ImmersiveViewer",
              lessonId: lesson.id,
              cardCount: lessonCardCount
            },
            earnedAt: completionTime
          },
          { transaction }
        );

        return {
          alreadyCompleted: false,
          xpAwarded: LESSON_COMPLETION_XP,
          totalXP: lockedUser.totalXP,
          moduleXP: progress.currentXP,
          completionPercentage: Number(progress.completionPercentage) || 0,
          earnedAt: completionTime
        };
      });

      const unlockedQuizzes = await ContentItem.findAll({
        where: {
          moduleId: lesson.moduleId,
          itemType: "Quiz",
          prerequisiteLessonId: lesson.id,
          isLocked: false
        },
        attributes: ["id", "title", "sequenceOrder"],
        order: [["sequenceOrder", "ASC"], ["id", "ASC"]]
      });

      return res.status(200).json({
        success: true,
        message: completionResult.alreadyCompleted
          ? "Lesson already completed"
          : "Lesson completed successfully",
        data: {
          lessonId: lesson.id,
          moduleId: lesson.moduleId,
          alreadyCompleted: completionResult.alreadyCompleted,
          xpAwarded: completionResult.xpAwarded,
          totalXP: completionResult.totalXP,
          moduleXP: completionResult.moduleXP,
          completionPercentage: completionResult.completionPercentage,
          completedAt: completionResult.earnedAt,
          unlockedQuizzes
        }
      });
    } catch (error) {
      console.error("Error completing lesson:", error);
      return res.status(500).json({
        success: false,
        message: "Error completing lesson",
        error: error.message
      });
    }
  }

  /**
   * Get teacher analytics for a selected class and assigned classes summary.
   * GET /api/content/teacher/analytics?classId=1
   */
  async getTeacherClassAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const requestedClassId = req.query?.classId ? Number(req.query.classId) : null;

      const user = await User.findByPk(userId, {
        attributes: ["id", "role", "fullName", "email"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.role !== "Teacher") {
        return res.status(403).json({
          success: false,
          message: "Only teachers can access class analytics"
        });
      }

      if (req.query?.classId && (!Number.isInteger(requestedClassId) || requestedClassId <= 0)) {
        return res.status(400).json({
          success: false,
          message: "classId must be a valid positive integer"
        });
      }

      const classIds = await getTeacherAccessibleClassIds(userId);

      if (classIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            summary: {
              totalStudentsInAssignedClasses: 0,
              averageClassXP: 0
            },
            selectedClassId: null,
            classes: [],
            roster: []
          }
        });
      }

      const selectedClassId = requestedClassId || classIds[0];

      if (!classIds.includes(selectedClassId)) {
        return res.status(403).json({
          success: false,
          message: "You can only view analytics for classes assigned to you"
        });
      }

      const [classRows, allAssignedStudents, selectedClassStudents] = await Promise.all([
        Class.findAll({
          where: { id: { [Op.in]: classIds } },
          attributes: ["id", "name", "gradeLevel"],
          order: [["name", "ASC"]]
        }),
        User.findAll({
          where: {
            role: "Student",
            classId: { [Op.in]: classIds }
          },
          attributes: ["id", "classId", "totalXP"],
          raw: true
        }),
        User.findAll({
          where: {
            role: "Student",
            classId: selectedClassId
          },
          attributes: ["id", "fullName", "email", "totalXP"],
          order: [["fullName", "ASC"]]
        })
      ]);

      const selectedStudentIds = selectedClassStudents.map((row) => row.id);

      const [progressRows, latestQuizLogs] = selectedStudentIds.length === 0
        ? [[], []]
        : await Promise.all([
            UserProgress.findAll({
              where: {
                userId: { [Op.in]: selectedStudentIds }
              },
              attributes: [
                "userId",
                [sequelize.fn("MAX", sequelize.col("currentLevel")), "level"]
              ],
              group: ["userId"],
              raw: true
            }),
            ScoreLog.findAll({
              where: {
                userId: { [Op.in]: selectedStudentIds }
              },
              include: [
                {
                  model: ContentItem,
                  as: "contentItem",
                  required: true,
                  attributes: ["id", "title", "itemType"],
                  where: {
                    itemType: "Quiz"
                  }
                }
              ],
              order: [["userId", "ASC"], ["attemptedAt", "DESC"]]
            })
          ]);

      const levelByUserId = progressRows.reduce((acc, row) => {
        acc.set(Number(row.userId), Number(row.level) || 1);
        return acc;
      }, new Map());

      const latestQuizByUserId = latestQuizLogs.reduce((acc, row) => {
        if (!acc.has(Number(row.userId))) {
          acc.set(Number(row.userId), {
            latestQuizScore: Number(row.score),
            latestQuizAt: row.attemptedAt,
            latestQuizTitle: row.contentItem?.title || null
          });
        }
        return acc;
      }, new Map());

      const roster = selectedClassStudents.map((student) => {
        const latestQuiz = latestQuizByUserId.get(Number(student.id)) || null;

        return {
          studentId: student.id,
          fullName: student.fullName,
          email: student.email,
          level: levelByUserId.get(Number(student.id)) || 1,
          totalXP: Number(student.totalXP) || 0,
          latestQuizScore: latestQuiz ? latestQuiz.latestQuizScore : null,
          latestQuizAt: latestQuiz ? latestQuiz.latestQuizAt : null,
          latestQuizTitle: latestQuiz ? latestQuiz.latestQuizTitle : null
        };
      });

      const assignedClassStats = allAssignedStudents.reduce((acc, student) => {
        const classId = Number(student.classId);
        if (!acc[classId]) {
          acc[classId] = {
            studentCount: 0,
            totalXP: 0
          };
        }

        acc[classId].studentCount += 1;
        acc[classId].totalXP += Number(student.totalXP) || 0;
        return acc;
      }, {});

      const selectedClassStats = assignedClassStats[selectedClassId] || {
        studentCount: 0,
        totalXP: 0
      };

      const averageClassXP = selectedClassStats.studentCount > 0
        ? Number((selectedClassStats.totalXP / selectedClassStats.studentCount).toFixed(2))
        : 0;

      const classes = classRows.map((classRow) => {
        const classId = Number(classRow.id);
        const stats = assignedClassStats[classId] || { studentCount: 0, totalXP: 0 };
        const classAverageXP = stats.studentCount > 0
          ? Number((stats.totalXP / stats.studentCount).toFixed(2))
          : 0;

        return {
          id: classRow.id,
          name: classRow.name,
          gradeLevel: classRow.gradeLevel,
          studentCount: stats.studentCount,
          averageXP: classAverageXP,
          isSelected: Number(classRow.id) === Number(selectedClassId)
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalStudentsInAssignedClasses: allAssignedStudents.length,
            averageClassXP
          },
          selectedClassId,
          classes,
          roster
        }
      });
    } catch (error) {
      console.error("Error getting teacher analytics:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting teacher analytics",
        error: error.message
      });
    }
  }

  /**
   * Update lock state for a module or content item.
   * PUT /api/content/lock/:id
   */
  async updateContentLockState(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const entityId = Number(req.params.id);
      const normalizedEntityType = String(req.body?.entityType || "").trim().toLowerCase();
      const rawIsLocked = req.body?.isLocked;

      if (rawIsLocked === undefined || rawIsLocked === null) {
        return res.status(400).json({
          success: false,
          message: "isLocked is required"
        });
      }

      const normalizedLockValue = String(rawIsLocked).trim().toLowerCase();
      if (!["true", "false", "1", "0"].includes(normalizedLockValue)) {
        return res.status(400).json({
          success: false,
          message: "isLocked must be a boolean value"
        });
      }

      const isLocked = normalizedLockValue === "true" || normalizedLockValue === "1";

      if (!Number.isInteger(entityId) || entityId <= 0) {
        return res.status(400).json({
          success: false,
          message: "id must be a valid positive integer"
        });
      }

      if (userRole !== "Teacher" && userRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Only teachers and admins can update lock states"
        });
      }

      if (normalizedEntityType === "module") {
        const module = await ContentModule.findByPk(entityId, {
          include: [{ model: Class, as: "class" }]
        });

        if (!module) {
          return res.status(404).json({
            success: false,
            message: "Module not found"
          });
        }

        if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, module))) {
          return res.status(403).json({
            success: false,
            message: "You can only lock content for your own classes"
          });
        }

        module.isLocked = isLocked;
        await module.save();

        return res.status(200).json({
          success: true,
          message: `Module ${isLocked ? "locked" : "unlocked"} successfully`,
          data: {
            id: module.id,
            entityType: "module",
            isLocked: module.isLocked
          }
        });
      }

      const allowedItemEntityTypes = new Set([
        "item",
        "contentitem",
        "content_item",
        "quiz",
        "lesson"
      ]);

      if (!allowedItemEntityTypes.has(normalizedEntityType)) {
        return res.status(400).json({
          success: false,
          message: "entityType must be one of: module, item, contentItem, quiz, lesson"
        });
      }

      const contentItem = await ContentItem.findByPk(entityId, {
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

      if (normalizedEntityType === "quiz" && contentItem.itemType !== "Quiz") {
        return res.status(400).json({
          success: false,
          message: "entityType=quiz requires a Quiz content item"
        });
      }

      if (normalizedEntityType === "lesson" && contentItem.itemType !== "Lesson") {
        return res.status(400).json({
          success: false,
          message: "entityType=lesson requires a Lesson content item"
        });
      }

      if (userRole === "Teacher" && !(await canTeacherAccessModule(userId, contentItem.module))) {
        return res.status(403).json({
          success: false,
          message: "You can only lock content for your own classes"
        });
      }

      contentItem.isLocked = isLocked;
      await contentItem.save();

      return res.status(200).json({
        success: true,
        message: `Content item ${isLocked ? "locked" : "unlocked"} successfully`,
        data: {
          id: contentItem.id,
          moduleId: contentItem.moduleId,
          title: contentItem.title,
          itemType: contentItem.itemType,
          entityType: "item",
          isLocked: contentItem.isLocked
        }
      });
    } catch (error) {
      console.error("Error updating content lock state:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating content lock state",
        error: error.message
      });
    }
  }

  /**
   * Get classes assigned to the authenticated teacher.
   * GET /api/content/teacher/classes
   */
  async getTeacherAssignedClasses(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: ["id", "role", "fullName", "email"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.role !== "Teacher") {
        return res.status(403).json({
          success: false,
          message: "Only teachers can access teacher class assignments"
        });
      }

      const classIds = await getTeacherAccessibleClassIds(userId);

      if (classIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }

      const classes = await Class.findAll({
        where: { id: { [Op.in]: classIds } },
        attributes: ["id", "name", "gradeLevel", "teacherId", "createdAt"],
        include: [
          {
            model: ContentModule,
            as: "assignedModules",
            attributes: ["id", "title", "description", "classId", "createdAt", "isLocked"],
            through: { attributes: [] }
          },
          {
            model: ContentModule,
            as: "modules",
            attributes: ["id", "title", "description", "classId", "createdAt", "isLocked"]
          },
          {
            model: User,
            as: "assignedTeachers",
            attributes: ["id", "fullName", "email"],
            through: { attributes: [] }
          }
        ],
        order: [["name", "ASC"]]
      });

      const normalizedData = classes.map((classRecord) => {
        const plainClass = classRecord.toJSON();
        const dedupeById = (rows = []) => {
          const seen = new Set();
          return rows.filter((row) => {
            if (!row?.id || seen.has(row.id)) {
              return false;
            }
            seen.add(row.id);
            return true;
          });
        };

        const explicitModules = dedupeById(plainClass.assignedModules || []);
        const fallbackModules = dedupeById(plainClass.modules || []);
        const assignedTeachers = dedupeById(plainClass.assignedTeachers || []);

        return {
          ...plainClass,
          assignedModules: explicitModules,
          assignedTeachers,
          modules: explicitModules.length > 0 ? explicitModules : fallbackModules
        };
      });

      return res.status(200).json({
        success: true,
        count: normalizedData.length,
        data: normalizedData
      });
    } catch (error) {
      console.error("Error getting teacher assigned classes:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting teacher assigned classes",
        error: error.message
      });
    }
  }
}

module.exports = new ContentController();
