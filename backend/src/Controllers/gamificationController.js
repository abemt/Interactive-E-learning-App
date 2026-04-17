const gpeService = require("../Services/gpeService");
const { Op } = require("sequelize");

const DEFAULT_LEVEL_THRESHOLDS = [
  { level: 1, xpThreshold: 0 },
  { level: 2, xpThreshold: 100 },
  { level: 3, xpThreshold: 250 },
  { level: 4, xpThreshold: 500 },
  { level: 5, xpThreshold: 1000 },
  { level: 6, xpThreshold: 2000 }
];

const normalizeLevelThresholds = (rows = []) => {
  const normalized = rows
    .map((row) => ({
      level: Number(row.level),
      xpThreshold: Number(row.xpThreshold)
    }))
    .filter((row) => Number.isFinite(row.level) && Number.isFinite(row.xpThreshold))
    .sort((a, b) => a.xpThreshold - b.xpThreshold);

  return normalized.length > 0 ? normalized : DEFAULT_LEVEL_THRESHOLDS;
};

const computeLevelSnapshot = ({ totalXP, thresholds, minimumLevel = 1 }) => {
  const safeXP = Math.max(0, Number(totalXP) || 0);
  const sortedThresholds = normalizeLevelThresholds(thresholds);

  let currentLevel = 1;
  let previousLevelXP = 0;
  let nextLevelXP = sortedThresholds[sortedThresholds.length - 1].xpThreshold + 200;

  for (let index = 0; index < sortedThresholds.length; index += 1) {
    const threshold = sortedThresholds[index];

    if (safeXP >= threshold.xpThreshold) {
      currentLevel = Math.max(currentLevel, threshold.level);
      previousLevelXP = threshold.xpThreshold;
      continue;
    }

    nextLevelXP = threshold.xpThreshold;
    break;
  }

  const effectiveLevel = Math.max(Number(minimumLevel) || 1, currentLevel);
  const span = Math.max(1, nextLevelXP - previousLevelXP);
  const rawProgress = ((safeXP - previousLevelXP) / span) * 100;

  return {
    currentLevel: effectiveLevel,
    nextLevelXP,
    xpToNextLevel: Math.max(0, nextLevelXP - safeXP),
    levelProgressPercent: Math.max(0, Math.min(100, Number(rawProgress.toFixed(2))))
  };
};

/**
 * Gamification Controller
 * Handles API endpoints for the Gamification & Progress Engine
 */
class GamificationController {
  /**
   * Award XP to a user for completing content
   * POST /api/gamification/award-xp
   */
  async awardXP(req, res) {
    try {
      const { moduleId, contentItemId, score, totalQuestions, reason } = req.body;
      const userId = req.user.id; // From auth middleware

      // Validation
      if (!moduleId || !contentItemId || score === undefined || !totalQuestions) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: moduleId, contentItemId, score, totalQuestions"
        });
      }

      if (score < 0 || score > 100) {
        return res.status(400).json({
          success: false,
          message: "Score must be between 0 and 100"
        });
      }

      const result = await gpeService.calculateXP(
        userId,
        moduleId,
        contentItemId,
        score,
        totalQuestions,
        reason
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error awarding XP:", error);
      return res.status(500).json({
        success: false,
        message: "Error awarding XP",
        error: error.message
      });
    }
  }

  /**
   * Generate gamification elements for a new course/module
   * POST /api/gamification/generate-course
   */
  async generateCourseGamification(req, res) {
    try {
      const { moduleId, totalQuestions } = req.body;

      // Validation
      if (!moduleId) {
        return res.status(400).json({
          success: false,
          message: "Missing required field: moduleId"
        });
      }

      const result = await gpeService.generateCourseGamification(
        moduleId,
        totalQuestions || 10
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error("Error generating course gamification:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating course gamification",
        error: error.message
      });
    }
  }

  /**
   * Get user progress summary for a module
   * GET /api/gamification/progress/:moduleId
   */
  async getUserProgress(req, res) {
    try {
      const { moduleId } = req.params;
      const userId = req.user.id; // From auth middleware

      if (!moduleId) {
        return res.status(400).json({
          success: false,
          message: "Missing moduleId parameter"
        });
      }

      const progress = await gpeService.getUserProgressSummary(
        userId,
        parseInt(moduleId)
      );

      return res.status(200).json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error("Error getting user progress:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting user progress",
        error: error.message
      });
    }
  }

  /**
   * Get leaderboard for a module
   * GET /api/gamification/leaderboard/:moduleId
   */
  async getLeaderboard(req, res) {
    try {
      const { moduleId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      if (!moduleId) {
        return res.status(400).json({
          success: false,
          message: "Missing moduleId parameter"
        });
      }

      const leaderboard = await gpeService.getModuleLeaderboard(
        parseInt(moduleId),
        limit
      );

      return res.status(200).json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting leaderboard",
        error: error.message
      });
    }
  }

  /**
   * Get all badges earned by current user
   * GET /api/gamification/my-badges
   */
  async getMyBadges(req, res) {
    try {
      const userId = req.user.id;
      const { Badge, BadgeDefinition } = require("../models");

      const badges = await Badge.findAll({
        where: { userId },
        include: [
          {
            model: BadgeDefinition,
            as: "definition",
            attributes: ["title", "description", "badgeType", "xpReward", "iconUrl"]
          }
        ],
        order: [["awardedAt", "DESC"]]
      });

      return res.status(200).json({
        success: true,
        count: badges.length,
        data: badges
      });
    } catch (error) {
      console.error("Error getting badges:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting badges",
        error: error.message
      });
    }
  }

  /**
   * Get all available badge definitions for a module
   * GET /api/gamification/badges/:moduleId
   */
  async getModuleBadges(req, res) {
    try {
      const { moduleId } = req.params;
      const { BadgeDefinition } = require("../models");

      const badges = await BadgeDefinition.findAll({
        where: {
          moduleId: parseInt(moduleId),
          isActive: true
        }
      });

      return res.status(200).json({
        success: true,
        count: badges.length,
        data: badges
      });
    } catch (error) {
      console.error("Error getting module badges:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting module badges",
        error: error.message
      });
    }
  }

  /**
   * Get student dashboard overview data for personalized UI rendering.
   * GET /api/gamification/student-overview
   */
  async getStudentOverview(req, res) {
    try {
      const userId = req.user.id;
      const {
        User,
        Class,
        UserProgress,
        LevelDefinition,
        ScoreLog,
        ContentItem,
        Badge,
        BadgeDefinition
      } = require("../models");

      const user = await User.findByPk(userId, {
        attributes: ["id", "fullName", "role", "classId", "totalXP"]
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
          message: "Only students can access this endpoint"
        });
      }

      const classObj = user.classId
        ? await Class.findByPk(user.classId, {
            attributes: ["id", "name", "gradeLevel"]
          })
        : null;

      const progressRows = await UserProgress.findAll({
        where: { userId },
        attributes: ["moduleId", "currentXP", "currentLevel", "lastActivityAt"],
        order: [["lastActivityAt", "DESC"]]
      });

      const maxProgressLevel = progressRows.reduce((maxLevel, row) => {
        const level = Number(row.currentLevel) || 1;
        return Math.max(maxLevel, level);
      }, 1);

      let levelThresholds = await LevelDefinition.findAll({
        where: { moduleId: null },
        attributes: ["level", "xpThreshold"],
        order: [["xpThreshold", "ASC"]]
      });

      if (levelThresholds.length === 0 && progressRows.length > 0) {
        const moduleIds = [...new Set(progressRows.map((row) => row.moduleId).filter(Boolean))];

        if (moduleIds.length > 0) {
          levelThresholds = await LevelDefinition.findAll({
            where: {
              moduleId: { [Op.in]: moduleIds }
            },
            attributes: ["level", "xpThreshold"],
            order: [["xpThreshold", "ASC"]]
          });
        }
      }

      const levelSnapshot = computeLevelSnapshot({
        totalXP: user.totalXP || 0,
        thresholds: levelThresholds,
        minimumLevel: maxProgressLevel
      });

      const quizCompletionRows = await ScoreLog.findAll({
        where: {
          userId,
          score: { [Op.gte]: 70 }
        },
        attributes: ["contentItemId"],
        include: [
          {
            model: ContentItem,
            as: "contentItem",
            attributes: ["id", "itemType"],
            where: { itemType: "Quiz" },
            required: true
          }
        ],
        group: ["contentItemId", "contentItem.id"]
      });

      const completedQuizIds = quizCompletionRows.map((row) => row.contentItemId);

      const earnedBadges = await Badge.findAll({
        where: { userId },
        include: [
          {
            model: BadgeDefinition,
            as: "definition",
            attributes: ["title", "description", "badgeType", "xpReward", "iconUrl"]
          }
        ],
        order: [["awardedAt", "DESC"]],
        limit: 8
      });

      let topStudents = [];
      let userRank = null;

      if (user.classId) {
        topStudents = await User.findAll({
          where: {
            classId: user.classId,
            role: "Student"
          },
          attributes: ["id", "fullName", "totalXP"],
          order: [["totalXP", "DESC"], ["fullName", "ASC"]],
          limit: 3
        });

        const higherXPStudents = await User.count({
          where: {
            classId: user.classId,
            role: "Student",
            totalXP: {
              [Op.gt]: user.totalXP || 0
            }
          }
        });

        userRank = higherXPStudents + 1;
      }

      return res.status(200).json({
        success: true,
        data: {
          profile: {
            id: user.id,
            fullName: user.fullName,
            totalXP: user.totalXP || 0,
            currentLevel: levelSnapshot.currentLevel,
            nextLevelXP: levelSnapshot.nextLevelXP,
            xpToNextLevel: levelSnapshot.xpToNextLevel,
            levelProgressPercent: levelSnapshot.levelProgressPercent,
            class: classObj
              ? {
                  id: classObj.id,
                  name: classObj.name,
                  gradeLevel: classObj.gradeLevel
                }
              : null
          },
          progressByModule: progressRows.map((row) => ({
            moduleId: row.moduleId,
            currentXP: row.currentXP,
            currentLevel: row.currentLevel,
            lastActivityAt: row.lastActivityAt
          })),
          completedQuizIds,
          badges: earnedBadges.map((badge) => ({
            id: badge.id,
            title: badge.definition?.title || badge.title,
            description: badge.definition?.description || badge.description,
            badgeType: badge.definition?.badgeType || "Special",
            iconUrl: badge.definition?.iconUrl || null,
            xpReward: badge.definition?.xpReward || 0,
            awardedAt: badge.awardedAt
          })),
          leaderboard: {
            top3: topStudents.map((student, index) => ({
              rank: index + 1,
              id: student.id,
              fullName: student.fullName,
              totalXP: student.totalXP || 0,
              isCurrentUser: student.id === user.id
            })),
            userRank,
            monthlyReward:
              "Top 3 learners each month earn recognition certificates and bonus classroom rewards."
          }
        }
      });
    } catch (error) {
      console.error("Error getting student overview:", error);
      return res.status(500).json({
        success: false,
        message: "Error getting student overview",
        error: error.message
      });
    }
  }

  /**
   * Manual level check (optional - useful for testing)
   * POST /api/gamification/check-level/:moduleId
   */
  async checkLevelUp(req, res) {
    try {
      const { moduleId } = req.params;
      const userId = req.user.id;
      const { UserProgress } = require("../models");

      const userProgress = await UserProgress.findOne({
        where: { userId, moduleId: parseInt(moduleId) }
      });

      if (!userProgress) {
        return res.status(404).json({
          success: false,
          message: "User progress not found for this module"
        });
      }

      const result = await gpeService.checkLevelUp(
        userId,
        parseInt(moduleId),
        userProgress.currentXP
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error checking level:", error);
      return res.status(500).json({
        success: false,
        message: "Error checking level",
        error: error.message
      });
    }
  }
}

module.exports = new GamificationController();
