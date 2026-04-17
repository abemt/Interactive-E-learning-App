const { Op, Transaction } = require("sequelize");
const {
  sequelize,
  User,
  ContentItem,
  ContentModule,
  ScoreLog,
  XPTransaction,
  UserProgress,
  LevelDefinition
} = require("../models");

const DEFAULT_PASSING_SCORE = 70;
const DEFAULT_QUESTION_COUNT = 10;

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

const normalizeScorePercentage = (score, maxScore) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return null;
  }

  const numericMaxScore = Number(maxScore);
  if (Number.isFinite(numericMaxScore) && numericMaxScore > 0) {
    const percentage = (numericScore / numericMaxScore) * 100;
    return clamp(Number(percentage.toFixed(2)), 0, 100);
  }

  return clamp(Number(numericScore.toFixed(2)), 0, 100);
};

const resolveQuestionCount = (contentBody) => {
  const parsed = safeJsonParse(contentBody) || {};
  const fromQuestions = Array.isArray(parsed.questions) ? parsed.questions.length : 0;
  const fromTotalQuestions = Number(parsed.totalQuestions);

  if (fromQuestions > 0) {
    return fromQuestions;
  }

  if (Number.isFinite(fromTotalQuestions) && fromTotalQuestions > 0) {
    return Math.floor(fromTotalQuestions);
  }

  return DEFAULT_QUESTION_COUNT;
};

const buildXPBreakdown = ({ scorePercent, questionCount }) => {
  const safeQuestionCount = Math.max(1, Number(questionCount) || DEFAULT_QUESTION_COUNT);
  const safeScore = clamp(Number(scorePercent) || 0, 0, 100);

  const baseXP = Math.floor((safeQuestionCount * 10) * (safeScore / 100));
  const perfectScoreBonus = safeScore === 100 ? 50 : 0;
  const highScoreBonus = safeScore >= 90 && safeScore < 100 ? 25 : 0;

  const totalXP = Math.max(10, baseXP + perfectScoreBonus + highScoreBonus);

  return {
    totalXP,
    baseXP,
    perfectScoreBonus,
    highScoreBonus,
    questionCount: safeQuestionCount,
    scorePercent: safeScore
  };
};

const resolveLevelSnapshot = async ({ moduleId, currentXP, previousLevel, transaction }) => {
  let levelDefinitions = await LevelDefinition.findAll({
    where: { moduleId },
    attributes: ["level", "xpThreshold"],
    order: [["xpThreshold", "ASC"]],
    transaction
  });

  if (levelDefinitions.length === 0) {
    levelDefinitions = await LevelDefinition.findAll({
      where: { moduleId: null },
      attributes: ["level", "xpThreshold"],
      order: [["xpThreshold", "ASC"]],
      transaction
    });
  }

  if (levelDefinitions.length === 0) {
    let computedLevel = 1;
    let nextThreshold = 100;

    while (currentXP >= nextThreshold) {
      computedLevel += 1;
      nextThreshold = computedLevel * 100;
    }

    const finalLevel = Math.max(previousLevel || 1, computedLevel);

    return {
      currentLevel: finalLevel,
      nextLevelXP: nextThreshold,
      xpToNextLevel: Math.max(0, nextThreshold - currentXP),
      leveledUp: finalLevel > (previousLevel || 1)
    };
  }

  let resolvedLevel = 1;
  let nextLevelXP = levelDefinitions[levelDefinitions.length - 1].xpThreshold + 200;

  for (let index = 0; index < levelDefinitions.length; index += 1) {
    const row = levelDefinitions[index];

    if (currentXP >= row.xpThreshold) {
      resolvedLevel = Math.max(resolvedLevel, row.level);
      continue;
    }

    nextLevelXP = row.xpThreshold;
    break;
  }

  const finalLevel = Math.max(previousLevel || 1, resolvedLevel);

  return {
    currentLevel: finalLevel,
    nextLevelXP,
    xpToNextLevel: Math.max(0, nextLevelXP - currentXP),
    leveledUp: finalLevel > (previousLevel || 1)
  };
};

class ScoreLogController {
  /**
   * Record first successful quiz completion only.
   * POST /api/scorelogs
   */
  async createScoreLog(req, res) {
    const userId = req.user.id;
    const rawQuizId =
      req.body.quizId ??
      req.body.quiz_id ??
      req.body.contentItemId ??
      req.body.content_item_id;

    const quizId = Number(rawQuizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid quizId is required"
      });
    }

    const scorePercent = normalizeScorePercentage(
      req.body.score,
      req.body.maxScore ?? req.body.max_score
    );

    if (scorePercent === null) {
      return res.status(400).json({
        success: false,
        message: "Valid score is required"
      });
    }

    const passingScore = clamp(
      Number(req.body.passingScore ?? req.body.passing_score ?? DEFAULT_PASSING_SCORE) ||
        DEFAULT_PASSING_SCORE,
      0,
      100
    );

    const passed =
      typeof req.body.isSuccessful === "boolean"
        ? req.body.isSuccessful
        : scorePercent >= passingScore;

    if (!passed) {
      return res.status(200).json({
        success: true,
        completed: false,
        alreadyCompleted: false,
        xpAwarded: 0,
        score: scorePercent,
        passingScore,
        message: "Quiz not yet passed. No completion XP awarded."
      });
    }

    try {
      const priorCompletion = await ScoreLog.findOne({
        where: {
          userId,
          contentItemId: quizId,
          score: {
            [Op.gte]: passingScore
          }
        },
        attributes: ["id", "score", "attemptedAt"]
      });

      if (priorCompletion) {
        return res.status(200).json({
          success: true,
          completed: true,
          alreadyCompleted: true,
          xpAwarded: 0,
          score: Number(priorCompletion.score),
          attemptedAt: priorCompletion.attemptedAt,
          message: "Quiz already completed"
        });
      }

      const transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
      });

      try {
        const user = await User.findByPk(userId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!user) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }

        const quizItem = await ContentItem.findByPk(quizId, {
          include: [{ model: ContentModule, as: "module", attributes: ["id", "classId"] }],
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!quizItem || quizItem.itemType !== "Quiz") {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: "Quiz content item not found"
          });
        }

        const duplicateCompletion = await ScoreLog.findOne({
          where: {
            userId,
            contentItemId: quizId,
            score: {
              [Op.gte]: passingScore
            }
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (duplicateCompletion) {
          await transaction.rollback();
          return res.status(200).json({
            success: true,
            completed: true,
            alreadyCompleted: true,
            xpAwarded: 0,
            score: Number(duplicateCompletion.score),
            attemptedAt: duplicateCompletion.attemptedAt,
            message: "Quiz already completed"
          });
        }

        const classId = user.classId || quizItem.module?.classId;
        if (!classId) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Student is not assigned to a class"
          });
        }

        const recordedAt = new Date();
        const questionCount = resolveQuestionCount(quizItem.contentBody);
        const xpBreakdown = buildXPBreakdown({
          scorePercent,
          questionCount
        });

        await ScoreLog.create(
          {
            userId,
            classId,
            contentItemId: quizItem.id,
            score: scorePercent,
            attemptedAt: recordedAt
          },
          { transaction }
        );

        user.totalXP = (user.totalXP || 0) + xpBreakdown.totalXP;
        await user.save({ transaction });

        const [progress] = await UserProgress.findOrCreate({
          where: {
            userId,
            moduleId: quizItem.moduleId
          },
          defaults: {
            userId,
            moduleId: quizItem.moduleId,
            currentXP: 0,
            currentLevel: 1,
            completionPercentage: 0,
            lastActivityAt: recordedAt
          },
          transaction
        });

        const previousLevel = Number(progress.currentLevel) || 1;
        progress.currentXP = (progress.currentXP || 0) + xpBreakdown.totalXP;
        progress.lastActivityAt = recordedAt;

        const levelSnapshot = await resolveLevelSnapshot({
          moduleId: quizItem.moduleId,
          currentXP: progress.currentXP,
          previousLevel,
          transaction
        });

        progress.currentLevel = levelSnapshot.currentLevel;
        await progress.save({ transaction });

        await XPTransaction.create(
          {
            userId,
            moduleId: quizItem.moduleId,
            contentItemId: quizItem.id,
            xpAmount: xpBreakdown.totalXP,
            reason: "Quiz Completion",
            metadata: {
              quizId: quizItem.id,
              questionCount: xpBreakdown.questionCount,
              scorePercent: xpBreakdown.scorePercent,
              passingScore,
              baseXP: xpBreakdown.baseXP,
              perfectScoreBonus: xpBreakdown.perfectScoreBonus,
              highScoreBonus: xpBreakdown.highScoreBonus
            },
            earnedAt: recordedAt
          },
          { transaction }
        );

        await transaction.commit();

        return res.status(201).json({
          success: true,
          completed: true,
          alreadyCompleted: false,
          xpAwarded: xpBreakdown.totalXP,
          totalXP: user.totalXP,
          score: scorePercent,
          passingScore,
          level: {
            currentLevel: levelSnapshot.currentLevel,
            nextLevelXP: levelSnapshot.nextLevelXP,
            xpToNextLevel: levelSnapshot.xpToNextLevel,
            leveledUp: levelSnapshot.leveledUp
          },
          message: "Quiz completion recorded"
        });
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
    } catch (error) {
      console.error("Error creating score log:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating score log",
        error: error.message
      });
    }
  }
}

module.exports = new ScoreLogController();
