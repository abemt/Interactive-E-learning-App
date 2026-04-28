const { Op } = require("sequelize");
const {
  User,
  UserProgress,
  ParentStudentMapping,
  LoginLog,
  ScoreLog,
  Badge,
  BadgeDefinition,
  ContentItem,
  ContentModule,
  sequelize
} = require("../models");
const { normalizeFamilyLinkCode } = require("../Services/familyLinkCodeService");

const getChildren = async (req, res) => {
  try {
    const parentId = Number(req.user?.id);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      return res.status(401).json({ message: "Unauthorized parent session." });
    }

    const parentStudentRows = await ParentStudentMapping.findAll({
      where: { parentId },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["id", "fullName", "username", "email", "role", "classId", "totalXP"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const students = parentStudentRows
      .map((row) => row.student)
      .filter((student) => student && student.role === "Student");

    if (students.length === 0) {
      return res.status(200).json({
        count: 0,
        data: []
      });
    }

    const studentIds = [...new Set(students.map((student) => Number(student.id)))];

    const [progressRows, loginRows, scoreRows, badgeRows] = await Promise.all([
      UserProgress.findAll({
        where: {
          userId: {
            [Op.in]: studentIds
          }
        },
        attributes: [
          "userId",
          "moduleId",
          "currentXP",
          "currentLevel",
          "completionPercentage",
          "lastActivityAt"
        ],
        order: [["userId", "ASC"], ["currentLevel", "DESC"], ["moduleId", "ASC"]],
        raw: true
      }),
      LoginLog.findAll({
        where: {
          userId: {
            [Op.in]: studentIds
          }
        },
        attributes: ["id", "userId", "loginAt"],
        order: [["userId", "ASC"], ["loginAt", "DESC"]],
        raw: true
      }),
      ScoreLog.findAll({
        where: {
          userId: {
            [Op.in]: studentIds
          }
        },
        attributes: ["id", "userId", "contentItemId", "score", "attemptedAt"],
        include: [
          {
            model: ContentItem,
            as: "contentItem",
            attributes: ["id", "title", "moduleId"],
            include: [
              {
                model: ContentModule,
                as: "module",
                attributes: ["id", "title"]
              }
            ]
          }
        ],
        order: [["userId", "ASC"], ["attemptedAt", "DESC"]]
      }),
      Badge.findAll({
        where: {
          userId: {
            [Op.in]: studentIds
          }
        },
        include: [
          {
            model: BadgeDefinition,
            as: "definition",
            attributes: ["title", "description", "badgeType", "xpReward", "iconUrl"]
          }
        ],
        order: [["userId", "ASC"], ["awardedAt", "DESC"]]
      })
    ]);

    const levelsByUserId = progressRows.reduce((acc, row) => {
      const userId = Number(row.userId);
      const existing = acc.get(userId) || {
        highestLevel: 1,
        moduleLevels: []
      };

      const currentLevel = Number(row.currentLevel) || 1;
      existing.highestLevel = Math.max(existing.highestLevel, currentLevel);
      existing.moduleLevels.push({
        moduleId: row.moduleId,
        currentLevel,
        currentXP: Number(row.currentXP) || 0,
        completionPercentage: Number(row.completionPercentage) || 0,
        lastActivityAt: row.lastActivityAt
      });

      acc.set(userId, existing);
      return acc;
    }, new Map());

    const loginLogsByUserId = loginRows.reduce((acc, row) => {
      const userId = Number(row.userId);
      const existing = acc.get(userId) || [];

      if (existing.length < 5) {
        existing.push({
          id: row.id,
          loginAt: row.loginAt
        });
      }

      acc.set(userId, existing);
      return acc;
    }, new Map());

    const quizScoresByUserId = scoreRows.reduce((acc, row) => {
      const userId = Number(row.userId);
      const existing = acc.get(userId) || [];

      if (existing.length < 24) {
        const moduleTitle = row.contentItem?.module?.title || null;
        const contentItemTitle = row.contentItem?.title || null;

        existing.push({
          id: row.id,
          contentItemId: row.contentItemId,
          moduleId: row.contentItem?.module?.id || row.contentItem?.moduleId || null,
          moduleTitle: moduleTitle || contentItemTitle || "General",
          subject: moduleTitle || contentItemTitle || "General",
          contentItemTitle,
          score: Number(row.score) || 0,
          attemptedAt: row.attemptedAt
        });
      }

      acc.set(userId, existing);
      return acc;
    }, new Map());

    const badgesByUserId = badgeRows.reduce((acc, row) => {
      const userId = Number(row.userId);
      const existing = acc.get(userId) || [];

      if (existing.length < 12) {
        existing.push({
          id: row.id,
          title: row.definition?.title || row.title,
          description: row.definition?.description || row.description || null,
          badgeType: row.definition?.badgeType || "Special",
          iconUrl: row.definition?.iconUrl || null,
          xpReward: row.definition?.xpReward || 0,
          awardedAt: row.awardedAt
        });
      }

      acc.set(userId, existing);
      return acc;
    }, new Map());

    const data = students.map((student) => {
      const levelBundle = levelsByUserId.get(Number(student.id)) || {
        highestLevel: 1,
        moduleLevels: []
      };

      return {
        studentId: student.id,
        profile: {
          id: student.id,
          fullName: student.fullName,
          username: student.username,
          email: student.email,
          role: student.role,
          classId: student.classId
        },
        currentXP: Number(student.totalXP) || 0,
        levels: {
          highestLevel: levelBundle.highestLevel,
          moduleLevels: levelBundle.moduleLevels
        },
        recentLoginLogs: loginLogsByUserId.get(Number(student.id)) || [],
        recentQuizScores: quizScoresByUserId.get(Number(student.id)) || [],
        badges: badgesByUserId.get(Number(student.id)) || []
      };
    });

    return res.status(200).json({
      count: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch linked children." });
  }
};

const linkChildByCode = async (req, res) => {
  try {
    const parentId = Number(req.user?.id);
    const familyLinkCode = normalizeFamilyLinkCode(req.body?.code || req.body?.familyLinkCode || req.body?.family_link_code);

    if (!Number.isInteger(parentId) || parentId <= 0) {
      return res.status(401).json({ message: "Unauthorized parent session." });
    }

    if (!familyLinkCode || familyLinkCode.length !== 6) {
      return res.status(400).json({ message: "A valid 6-character family link code is required." });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const student = await User.findOne({
        where: {
          role: "Student",
          familyLinkCode
        },
        attributes: ["id", "fullName", "username", "email", "role", "classId", "totalXP", "familyLinkCode"],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!student) {
        const error = new Error("No student was found for that family link code.");
        error.statusCode = 404;
        throw error;
      }

      const [mapping, created] = await ParentStudentMapping.findOrCreate({
        where: {
          parentId,
          studentId: student.id
        },
        defaults: {
          parentId,
          studentId: student.id
        },
        transaction
      });

      return {
        created,
        mappingId: mapping.id,
        student: {
          id: student.id,
          fullName: student.fullName,
          username: student.username,
          email: student.email,
          role: student.role,
          classId: student.classId,
          totalXP: student.totalXP || 0,
          familyLinkCode: student.familyLinkCode
        }
      };
    });

    return res.status(result.created ? 201 : 200).json({
      message: result.created
        ? "Parent linked to student successfully via family link code."
        : "This parent is already linked to the student for that family link code.",
      data: result
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to link parent using family link code."
    });
  }
};

module.exports = {
  getChildren,
  linkChildByCode
};