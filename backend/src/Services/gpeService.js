const {
  UserProgress,
  XPTransaction,
  LevelDefinition,
  BadgeDefinition,
  Badge,
  ContentModule,
  ContentItem,
  User
} = require("../models");
const { Op } = require("sequelize");

/**
 * Gamification & Progress Engine (GPE) Service
 * Handles XP calculation, level progression, and automatic badge generation
 */
class GPE_Service {
  /**
   * Calculate and award XP to a user for completing a content item
   * @param {number} userId - The ID of the user
   * @param {number} moduleId - The ID of the content module
   * @param {number} contentItemId - The ID of the content item completed
   * @param {number} score - Score achieved (0-100)
   * @param {number} totalQuestions - Total questions in the quiz/assignment
   * @param {string} reason - Reason for XP award
   * @returns {Promise<Object>} Result containing XP awarded, level up info, and badges earned
   */
  async calculateXP(userId, moduleId, contentItemId, score, totalQuestions, reason = "Content Completion") {
    try {
      // Base XP calculation formula
      // Base: 10 XP per question * score percentage
      const baseXP = Math.floor((totalQuestions * 10) * (score / 100));
      
      // Bonus XP for perfect scores
      const perfectScoreBonus = score === 100 ? 50 : 0;
      
      // Bonus XP for high scores (>= 90%)
      const highScoreBonus = score >= 90 && score < 100 ? 25 : 0;
      
      const totalXP = baseXP + perfectScoreBonus + highScoreBonus;

      // Get or create user progress for this module
      let userProgress = await UserProgress.findOne({
        where: { userId, moduleId }
      });

      if (!userProgress) {
        userProgress = await UserProgress.create({
          userId,
          moduleId,
          currentXP: 0,
          currentLevel: 1,
          completionPercentage: 0,
          lastActivityAt: new Date()
        });
      }

      // Record XP transaction
      await XPTransaction.create({
        userId,
        moduleId,
        contentItemId,
        xpAmount: totalXP,
        reason,
        metadata: {
          score,
          totalQuestions,
          baseXP,
          bonuses: {
            perfectScore: perfectScoreBonus,
            highScore: highScoreBonus
          }
        },
        earnedAt: new Date()
      });

      // Update user progress
      const newXP = userProgress.currentXP + totalXP;
      userProgress.currentXP = newXP;
      userProgress.lastActivityAt = new Date();

      // Calculate completion percentage
      const completionPercentage = await this.calculateCompletionPercentage(userId, moduleId);
      userProgress.completionPercentage = completionPercentage;

      await userProgress.save();

      // Check for level up
      const levelUpResult = await this.checkLevelUp(userId, moduleId, newXP);

      // Check for badge awards
      const badgesEarned = await this.checkBadgeAwards(userId, moduleId, completionPercentage, score);

      return {
        success: true,
        xpAwarded: totalXP,
        totalXP: newXP,
        currentLevel: levelUpResult.currentLevel,
        leveledUp: levelUpResult.leveledUp,
        newLevel: levelUpResult.newLevel,
        nextLevelXP: levelUpResult.nextLevelXP,
        badgesEarned,
        completionPercentage
      };
    } catch (error) {
      console.error("Error calculating XP:", error);
      throw error;
    }
  }

  /**
   * Check if user should level up based on current XP
   * @param {number} userId - The ID of the user
   * @param {number} moduleId - The ID of the content module
   * @param {number} currentXP - Current XP amount
   * @returns {Promise<Object>} Level up information
   */
  async checkLevelUp(userId, moduleId, currentXP) {
    try {
      // Get user progress
      const userProgress = await UserProgress.findOne({
        where: { userId, moduleId }
      });

      if (!userProgress) {
        return {
          currentLevel: 1,
          leveledUp: false,
          nextLevelXP: 100
        };
      }

      // Get level definitions for this module (or global if module-specific doesn't exist)
      let levelDefinitions = await LevelDefinition.findAll({
        where: { moduleId },
        order: [["level", "ASC"]]
      });

      // If no module-specific levels, get global levels
      if (levelDefinitions.length === 0) {
        levelDefinitions = await LevelDefinition.findAll({
          where: { moduleId: null },
          order: [["level", "ASC"]]
        });
      }

      // If still no levels, use default progression
      if (levelDefinitions.length === 0) {
        return this.defaultLevelProgression(userProgress, currentXP);
      }

      // Find the highest level user qualifies for
      let newLevel = 1;
      let nextLevelXP = null;

      for (let i = 0; i < levelDefinitions.length; i++) {
        if (currentXP >= levelDefinitions[i].xpThreshold) {
          newLevel = levelDefinitions[i].level;
        } else {
          nextLevelXP = levelDefinitions[i].xpThreshold;
          break;
        }
      }

      const leveledUp = newLevel > userProgress.currentLevel;

      if (leveledUp) {
        userProgress.currentLevel = newLevel;
        await userProgress.save();
      }

      return {
        currentLevel: newLevel,
        leveledUp,
        newLevel: leveledUp ? newLevel : null,
        nextLevelXP,
        xpToNextLevel: nextLevelXP ? nextLevelXP - currentXP : null
      };
    } catch (error) {
      console.error("Error checking level up:", error);
      throw error;
    }
  }

  /**
   * Default level progression when no level definitions exist
   * Uses exponential growth: Level N requires (N * 100) XP
   */
  defaultLevelProgression(userProgress, currentXP) {
    let newLevel = 1;
    let xpRequired = 100;

    // Calculate level based on XP
    while (currentXP >= xpRequired) {
      newLevel++;
      xpRequired = newLevel * 100;
    }

    const leveledUp = newLevel > userProgress.currentLevel;

    if (leveledUp) {
      userProgress.currentLevel = newLevel;
      userProgress.save();
    }

    return {
      currentLevel: newLevel,
      leveledUp,
      newLevel: leveledUp ? newLevel : null,
      nextLevelXP: xpRequired,
      xpToNextLevel: xpRequired - currentXP
    };
  }

  /**
   * Calculate completion percentage for a user in a module
   */
  async calculateCompletionPercentage(userId, moduleId) {
    try {
      // Get all content items in the module
      const totalItems = await ContentItem.count({
        where: { moduleId }
      });

      if (totalItems === 0) return 0;

      // Get completed items (items with score logs)
      const completedItems = await ContentItem.count({
        include: [
          {
            model: require("../models").ScoreLog,
            as: "scoreLogs",
            where: { userId },
            required: true
          }
        ],
        where: { moduleId },
        distinct: true
      });

      return Math.round((completedItems / totalItems) * 100 * 100) / 100;
    } catch (error) {
      console.error("Error calculating completion percentage:", error);
      return 0;
    }
  }

  /**
   * Check and award badges based on user achievements
   */
  async checkBadgeAwards(userId, moduleId, completionPercentage, score) {
    try {
      const badgesEarned = [];

      // Get all active badge definitions for this module
      const badgeDefinitions = await BadgeDefinition.findAll({
        where: {
          moduleId,
          isActive: true
        }
      });

      for (const badgeDef of badgeDefinitions) {
        // Check if user already has this badge
        const existingBadge = await Badge.findOne({
          where: {
            userId,
            badgeDefinitionId: badgeDef.id
          }
        });

        if (existingBadge) continue;

        // Check if user meets criteria
        let meetsRequirements = false;

        if (badgeDef.badgeType === "Completion") {
          // Criteria: { minCompletion: 100 }
          const minCompletion = badgeDef.criteria?.minCompletion || 100;
          meetsRequirements = completionPercentage >= minCompletion;
        } else if (badgeDef.badgeType === "Mastery") {
          // Criteria: { minScore: 90, minCompletions: 5 }
          const minScore = badgeDef.criteria?.minScore || 90;
          meetsRequirements = score >= minScore;
        }

        if (meetsRequirements) {
          // Award the badge
          const badge = await Badge.create({
            userId,
            badgeDefinitionId: badgeDef.id,
            title: badgeDef.title,
            description: badgeDef.description,
            awardedAt: new Date()
          });

          // Award XP bonus for earning badge
          if (badgeDef.xpReward > 0) {
            await XPTransaction.create({
              userId,
              moduleId,
              contentItemId: null,
              xpAmount: badgeDef.xpReward,
              reason: `Badge Earned: ${badgeDef.title}`,
              metadata: { badgeId: badge.id },
              earnedAt: new Date()
            });

            // Update user progress XP
            const userProgress = await UserProgress.findOne({
              where: { userId, moduleId }
            });
            if (userProgress) {
              userProgress.currentXP += badgeDef.xpReward;
              await userProgress.save();
            }
          }

          badgesEarned.push({
            id: badge.id,
            title: badgeDef.title,
            description: badgeDef.description,
            xpReward: badgeDef.xpReward
          });
        }
      }

      return badgesEarned;
    } catch (error) {
      console.error("Error checking badge awards:", error);
      return [];
    }
  }

  /**
   * Automatically generate gamification elements when a new course/module is created
   * @param {number} moduleId - The ID of the newly created module
   * @param {number} totalQuestions - Estimated total questions/activities in the module
   * @returns {Promise<Object>} Generated gamification elements
   */
  async generateCourseGamification(moduleId, totalQuestions = 10) {
    try {
      // Validate module exists
      const module = await ContentModule.findByPk(moduleId);
      if (!module) {
        throw new Error("Module not found");
      }

      // 1. Generate Level Definitions for this module
      const levelDefinitions = [];
      const levels = [
        { level: 1, xpThreshold: 0, title: "Novice" },
        { level: 2, xpThreshold: 100, title: "Learner" },
        { level: 3, xpThreshold: 250, title: "Apprentice" },
        { level: 4, xpThreshold: 500, title: "Practitioner" },
        { level: 5, xpThreshold: 1000, title: "Expert" },
        { level: 6, xpThreshold: 2000, title: "Master" }
      ];

      for (const levelData of levels) {
        const levelDef = await LevelDefinition.create({
          moduleId,
          level: levelData.level,
          xpThreshold: levelData.xpThreshold,
          title: levelData.title
        });
        levelDefinitions.push(levelDef);
      }

      // 2. Generate Badge Definitions
      const badgeDefinitions = [];

      // Completion Badge
      const completionBadge = await BadgeDefinition.create({
        moduleId,
        badgeType: "Completion",
        title: `${module.title} - Course Completion`,
        description: `Awarded for completing all content in ${module.title}`,
        iconUrl: null,
        criteria: { minCompletion: 100 },
        xpReward: 200,
        isActive: true
      });
      badgeDefinitions.push(completionBadge);

      // Mastery Badge
      const masteryBadge = await BadgeDefinition.create({
        moduleId,
        badgeType: "Mastery",
        title: `${module.title} - Master`,
        description: `Awarded for achieving excellence in ${module.title}`,
        iconUrl: null,
        criteria: { minScore: 95, minCompletions: 3 },
        xpReward: 300,
        isActive: true
      });
      badgeDefinitions.push(masteryBadge);

      // Perfect Score Badge
      const perfectBadge = await BadgeDefinition.create({
        moduleId,
        badgeType: "Special",
        title: `${module.title} - Perfectionist`,
        description: `Awarded for achieving a perfect score`,
        iconUrl: null,
        criteria: { minScore: 100 },
        xpReward: 150,
        isActive: true
      });
      badgeDefinitions.push(perfectBadge);

      return {
        success: true,
        moduleId,
        moduleName: module.title,
        generated: {
          levelDefinitions: levelDefinitions.length,
          badgeDefinitions: badgeDefinitions.length,
          totalXPRange: `0 - ${levels[levels.length - 1].xpThreshold}+`
        },
        details: {
          levels: levelDefinitions.map(l => ({
            level: l.level,
            title: l.title,
            xpThreshold: l.xpThreshold
          })),
          badges: badgeDefinitions.map(b => ({
            title: b.title,
            type: b.badgeType,
            xpReward: b.xpReward
          }))
        }
      };
    } catch (error) {
      console.error("Error generating course gamification:", error);
      throw error;
    }
  }

  /**
   * Get user's progress summary for a module
   */
  async getUserProgressSummary(userId, moduleId) {
    try {
      const userProgress = await UserProgress.findOne({
        where: { userId, moduleId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "fullName", "email"]
          },
          {
            model: ContentModule,
            as: "module",
            attributes: ["id", "title", "description"]
          }
        ]
      });

      if (!userProgress) {
        return {
          userId,
          moduleId,
          currentXP: 0,
          currentLevel: 1,
          completionPercentage: 0,
          badges: [],
          recentXP: []
        };
      }

      // Get badges earned for this module
      const badges = await Badge.findAll({
        where: { userId },
        include: [
          {
            model: BadgeDefinition,
            as: "definition",
            where: { moduleId },
            required: true
          }
        ]
      });

      // Get recent XP transactions
      const recentXP = await XPTransaction.findAll({
        where: { userId, moduleId },
        order: [["earnedAt", "DESC"]],
        limit: 10
      });

      // Get next level info
      const nextLevelInfo = await this.checkLevelUp(userId, moduleId, userProgress.currentXP);

      return {
        userId,
        moduleId,
        user: userProgress.user,
        module: userProgress.module,
        currentXP: userProgress.currentXP,
        currentLevel: userProgress.currentLevel,
        completionPercentage: userProgress.completionPercentage,
        nextLevelXP: nextLevelInfo.nextLevelXP,
        xpToNextLevel: nextLevelInfo.xpToNextLevel,
        lastActivityAt: userProgress.lastActivityAt,
        badges: badges.map(b => ({
          id: b.id,
          title: b.title,
          description: b.description,
          awardedAt: b.awardedAt,
          xpReward: b.definition?.xpReward
        })),
        recentXP: recentXP.map(xp => ({
          amount: xp.xpAmount,
          reason: xp.reason,
          earnedAt: xp.earnedAt,
          metadata: xp.metadata
        }))
      };
    } catch (error) {
      console.error("Error getting user progress summary:", error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a module
   */
  async getModuleLeaderboard(moduleId, limit = 10) {
    try {
      const leaderboard = await UserProgress.findAll({
        where: { moduleId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "fullName", "email"]
          }
        ],
        order: [
          ["currentXP", "DESC"],
          ["currentLevel", "DESC"],
          ["completionPercentage", "DESC"]
        ],
        limit
      });

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        userName: entry.user.fullName,
        currentXP: entry.currentXP,
        currentLevel: entry.currentLevel,
        completionPercentage: entry.completionPercentage
      }));
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      throw error;
    }
  }
}

module.exports = new GPE_Service();
